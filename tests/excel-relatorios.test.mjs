import test from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import {criarExcelRelatorio,dataExcel,letraColuna,crc32,ESTILO} from '../shared/js/excelRelatorios.js';
import {paginaRelatorio} from '../shared/js/paginacaoRelatorio.js';
import {acoesDoAtestado} from '../shared/js/acoesAtestado.js';
import {gerarRelatorio} from '../shared/js/relatoriosAdministrativos.js';
import {permissoesDoPerfil} from '../shared/js/permissoesAdministrativas.js';
// Abre o ZIP pelo diretório central, confere CRC e tamanhos e devolve os arquivos como texto.
function abrirZip(bytes){
 const b=Buffer.from(bytes),fim=b.lastIndexOf(Buffer.from([0x50,0x4b,0x05,0x06]));assert.ok(fim>0,'fim do diretório central');
 const total=b.readUInt16LE(fim+10),arquivos={};let p=b.readUInt32LE(fim+16);
 for(let i=0;i<total;i++){
  assert.equal(b.readUInt32LE(p),0x02014b50);const metodo=b.readUInt16LE(p+10),crc=b.readUInt32LE(p+16),tamanho=b.readUInt32LE(p+20),nomeLen=b.readUInt16LE(p+28),local=b.readUInt32LE(p+42),nome=b.toString('utf8',p+46,p+46+nomeLen);
  assert.equal(metodo,0);assert.equal(b.readUInt32LE(local),0x04034b50);const dados=b.subarray(local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28),local+30+b.readUInt16LE(local+26)+b.readUInt16LE(local+28)+tamanho);
  assert.equal(zlib.crc32(dados),crc,'CRC de '+nome);arquivos[nome]=dados.toString('utf8');p+=46+nomeLen+b.readUInt16LE(p+30)+b.readUInt16LE(p+32);
 }
 return arquivos;
}
const op={id:'g',nome:'Gerente',perfil:'gerencia',nivel:2,unidade:'Vila Velha',permissoes:permissoesDoPerfil('gerencia')};
const aula=(i,status=1)=>({id:'a'+String(i).padStart(3,'0'),data:'2026-10-'+String(19+i%5).padStart(2,'0'),inicio:'08:00',fim:'08:50',status,unidade:'Vila Velha',alunoId:'s',instrutorId:'i',veiculoId:'v',categoria:'B',cancelamento:status===2?{em:'2026-10-20T01:30:00Z',motivo:'Chuva & frio <forte>',responsavel:'g',credito:'devolvido'}:undefined});
const celulas=(xml,linha)=>[...(xml.match(new RegExp('<row r="'+linha+'">(.*?)</row>'))?.[1]||'').matchAll(/<c r="([A-Z]+\d+)"(?: s="(\d+)")?(?: t="inlineStr")?>(?:<v>([^<]*)<\/v>|<is><t xml:space="preserve">([^<]*)<\/t><\/is>)<\/c>/g)].map(m=>({ref:m[1],s:Number(m[2]||0),v:m[3],t:m[4]}));
test('CRC-32, letras de coluna e datas no sistema do Excel (Brasília para data e hora)',()=>{
 assert.equal(crc32(new TextEncoder().encode('123456789')),0xcbf43926);assert.equal(crc32(new Uint8Array()),0);
 assert.deepEqual([0,25,26,51,701,702].map(letraColuna),['A','Z','AA','AZ','ZZ','AAA']);
 assert.deepEqual(dataExcel('2026-10-19'),{n:46314,estilo:ESTILO.data});assert.deepEqual(dataExcel('19/10/2026'),{n:46314,estilo:ESTILO.data});
 const h=dataExcel('2026-10-20T01:30:00Z');assert.equal(h.estilo,ESTILO.dataHora);assert.equal(Math.round(h.n*1440),46314*1440+22*60+30);assert.equal(dataExcel('sem data'),null);
});
test('xlsx do relatório de cancelamentos: pacote completo, cabeçalho, todas as linhas, datas e números',()=>{
 const e={alunos:[{id:'s',nome:'Aluno Teste'}],recursos:[{id:'i',nome:'Instrutor'},{id:'v',nome:'Veículo'}],responsaveis:[{id:'g',nome:'Gerente'}],aulas:Array.from({length:60},(_,i)=>aula(i,2))};
 const r=gerarRelatorio(e,op,{tipo:'cancelamentos',inicio:'2026-10-19',fim:'2026-10-28'});assert.equal(r.linhas.length,60);
 const {bytes,nome,tipo}=criarExcelRelatorio(r,{titulo:'Cancelamentos',unidade:'Centro de Vila Velha',filtros:[['Categoria','Carro']]},new Date('2026-11-04T15:00:00Z'));
 assert.equal(nome,'SIPA_Relatorio_Cancelamentos_19-10-2026_a_28-10-2026.xlsx');assert.equal(tipo,'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
 const z=abrirZip(bytes);
 assert.deepEqual(Object.keys(z).sort(),['[Content_Types].xml','_rels/.rels','docProps/core.xml','xl/_rels/workbook.xml.rels','xl/styles.xml','xl/workbook.xml','xl/worksheets/sheet1.xml']);
 assert.match(z['[Content_Types].xml'],/PartName="\/xl\/worksheets\/sheet1.xml" ContentType="application\/vnd.openxmlformats-officedocument.spreadsheetml.worksheet\+xml"/);
 assert.match(z['_rels/.rels'],/Target="xl\/workbook.xml"/);assert.match(z['xl/_rels/workbook.xml.rels'],/Target="worksheets\/sheet1.xml"/);assert.match(z['xl/_rels/workbook.xml.rels'],/Target="styles.xml"/);
 assert.match(z['xl/workbook.xml'],/<sheet name="Relatório" sheetId="1" r:id="rId1"\/>/);
 assert.match(z['xl/styles.xml'],/formatCode="dd\/mm\/yyyy"/);assert.match(z['xl/styles.xml'],/formatCode="dd\/mm\/yyyy hh:mm"/);assert.match(z['xl/styles.xml'],/<cellXfs count="9">/);
 const s=z['xl/worksheets/sheet1.xml'];
 for(const t of ['SIPA - Sistema Inteligente Para Agendamentos','Relatório de Cancelamentos','Unidade: Centro de Vila Velha','Período: 19/10/2026 a 28/10/2026','Filtros da consulta','Resumo do período','Chuva &amp; frio &lt;forte&gt;'])assert.ok(s.includes(t),t);
 assert.ok(!s.includes('<forte>'));
 const cab=celulas(s,10);assert.deepEqual(cab.map(c=>c.t),r.colunas);assert.ok(cab.every(c=>c.s===ESTILO.cabecalho));
 const linhas=s.match(/<row /g).length,primeira=celulas(s,11);
 assert.ok(linhas>=11+60);assert.equal(celulas(s,70).length,r.colunas.length);assert.ok(!celulas(s,71).length);
 assert.deepEqual([primeira[0].v,primeira[0].s],[String(46314),ESTILO.data]);
 const cancelada=primeira[r.colunas.indexOf('Cancelada em')];assert.equal(cancelada.s,ESTILO.dataHora);assert.equal(Math.round(Number(cancelada.v)*1440),46314*1440+22*60+30);
 assert.equal(primeira[r.colunas.indexOf('Responsável')].t,'Gerente');assert.equal(primeira[r.colunas.indexOf('Situação')].t,'Cancelada');
 const resumo=s.match(/<c r="B\d+" s="7"><v>60<\/v><\/c>/);assert.ok(resumo,'total de canceladas como número');
});
test('xlsx de agrupamentos grava quantidades como número; relatório vazio mantém o aviso',()=>{
 const e={alunos:[],recursos:[],aulas:[aula(0,5),aula(1,6),aula(5,5)]},r=gerarRelatorio(e,op,{tipo:'dias',inicio:'2026-10-19',fim:'2026-10-28'}),s=abrirZip(criarExcelRelatorio(r,{titulo:'Distribuição por dia'}).bytes)['xl/worksheets/sheet1.xml'];
 const l=celulas(s,8);assert.equal(l[0].s,ESTILO.data);assert.equal(l[0].v,'46314');assert.deepEqual(l.slice(1).map(c=>[c.s,c.v]),[[7,'2'],[7,'0'],[7,'2'],[7,'2'],[7,'0'],[7,'0']]);
 const vazio=abrirZip(criarExcelRelatorio({...r,linhas:[]},{}).bytes)['xl/worksheets/sheet1.xml'];assert.ok(vazio.includes('Nenhum registro encontrado para os filtros selecionados.'));
});
test('paginação do relatório: 25 por página, faixa exibida e limites',()=>{
 const linhas=Array.from({length:60},(_,i)=>[i]);
 assert.deepEqual((({pagina,paginas,inicio,fim,total,resumo})=>({pagina,paginas,inicio,fim,total,resumo}))(paginaRelatorio(linhas,1)),{pagina:1,paginas:3,inicio:1,fim:25,total:60,resumo:'Exibindo 1–25 de 60'});
 assert.equal(paginaRelatorio(linhas,3).resumo,'Exibindo 51–60 de 60');assert.equal(paginaRelatorio(linhas,3).linhas.length,10);assert.deepEqual(paginaRelatorio(linhas,2).linhas[0],[25]);
 assert.equal(paginaRelatorio(linhas,9).pagina,3);assert.equal(paginaRelatorio(linhas,0).pagina,1);
 assert.deepEqual((({paginas,total,resumo,linhas})=>({paginas,total,resumo,linhas}))(paginaRelatorio([],1)),{paginas:1,total:0,resumo:'',linhas:[]});
});
test('verificação médica: Gerência aguarda a Recepção e só decide depois do encaminhamento; Master mantém tudo',()=>{
 const g=st=>acoesDoAtestado({status:st}),m=st=>acoesDoAtestado({status:st},{master:true});
 assert.deepEqual(g('recepcao'),{encaminhar:false,aguardandoRecepcao:true,decidir:false});
 assert.deepEqual(g('gerencia'),{encaminhar:false,aguardandoRecepcao:false,decidir:true});
 for(const st of ['aprovado','rejeitado'])assert.deepEqual(g(st),{encaminhar:false,aguardandoRecepcao:false,decidir:false});
 assert.deepEqual(m('recepcao'),{encaminhar:true,aguardandoRecepcao:false,decidir:false});
 for(const st of ['gerencia','aprovado','rejeitado'])assert.equal(m(st).decidir,true);
 assert.deepEqual(acoesDoAtestado({status:'gerencia'},{inconsistente:true}),{encaminhar:false,aguardandoRecepcao:false,decidir:false});
 assert.equal(acoesDoAtestado({status:'recepcao'},{master:true,inconsistente:true}).encaminhar,false);
});
