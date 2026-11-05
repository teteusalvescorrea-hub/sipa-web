// Exportação do relatório em .xlsx gerado no próprio navegador, sem biblioteca: uma planilha (SpreadsheetML)
// dentro de um ZIP sem compressão. Mesmas colunas e linhas do PDF; datas como data e quantidades como número.
import {apresentarRelatorio,dataRelatorio,ROTULOS_RESUMO} from './apresentacaoRelatorios.js';
export const TIPO_XLSX='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
const COLUNAS_DATA=['Data','Cancelada em','Solicitação'],COLUNAS_NUMERO=['Aulas','Agendadas','Realizadas','Presenças','Faltas','Canceladas','Elegíveis','Ocupados','Disponíveis','Ocupação %'];
const OBSERVACAO='Observação: Ocupação calculada pela configuração atual de jornada e calendário. O filtro de situação afeta os horários ocupados. Configurações históricas não são reconstruídas.';
// Índices de cellXfs em styles.xml.
export const ESTILO={titulo:1,negrito:2,cabecalho:3,texto:4,data:5,dataHora:6,numero:7,percentual:8};
const xml=v=>String(v??'').replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f￾￿]/g,'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
export function letraColuna(i){let s='';for(let n=i+1;n>0;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
const BASE_EXCEL=Date.UTC(1899,11,30),brasilia=new Intl.DateTimeFormat('en-CA',{timeZone:'America/Sao_Paulo',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'});
const serial=(a,m,d,h=0,mi=0)=>(Date.UTC(a,m-1,d,h,mi)-BASE_EXCEL)/86400000;
// Data civil (aaaa-mm-dd ou dd/mm/aaaa) vira o dia; data e hora ISO vira o horário de Brasília, como no PDF.
export function dataExcel(valor){
 const s=String(valor??'').trim();let p;
 if((p=s.match(/^(\d{4})-(\d{2})-(\d{2})$/)))return {n:serial(+p[1],+p[2],+p[3]),estilo:ESTILO.data};
 if((p=s.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\s+(\d{2}):(\d{2}))?$/)))return {n:serial(+p[3],+p[2],+p[1],+(p[4]||0),+(p[5]||0)),estilo:p[4]?ESTILO.dataHora:ESTILO.data};
 if(/^\d{4}-\d{2}-\d{2}T/.test(s)&&!Number.isNaN(Date.parse(s))){const x=Object.fromEntries(brasilia.formatToParts(new Date(s)).map(t=>[t.type,+t.value]));return {n:serial(x.year,x.month,x.day,x.hour,x.minute),estilo:ESTILO.dataHora};}
 return null;
}
const numero=v=>typeof v==='number'?(Number.isFinite(v)?v:null):/^-?\d+([.,]\d+)?$/.test(String(v??'').trim())?Number(String(v).trim().replace(',','.')):null;
const texto=(v,estilo=0)=>({t:String(v??''),estilo});
function celula(coluna,bruto,apresentado,tipo){
 if(COLUNAS_DATA.includes(coluna)||coluna==='Agrupamento'&&tipo==='dias'){const d=dataExcel(bruto);if(d)return d;}
 if(COLUNAS_NUMERO.includes(coluna)){const n=numero(bruto);if(n!=null)return {n,estilo:coluna==='Ocupação %'?ESTILO.percentual:ESTILO.numero};}
 return texto(apresentado,ESTILO.texto);
}
// Cabeçalho como o do PDF, filtros, tabela com TODAS as linhas, resumo do período e observação.
export function linhasPlanilha(relatorio,meta={},agora=new Date()){
 const r=apresentarRelatorio(relatorio),tipo=relatorio.filtros?.tipo,linhas=[];
 linhas.push([texto('SIPA - Sistema Inteligente Para Agendamentos',ESTILO.titulo)],[texto('Relatório de '+(meta.titulo||'Aulas'),ESTILO.negrito)],[texto('Unidade: '+(meta.unidade||r.filtros.unidade||'Todas as unidades autorizadas'))],[texto('Período: '+dataRelatorio(r.filtros.inicio)+' a '+dataRelatorio(r.filtros.fim))],[texto('Emitido em: '+dataRelatorio(agora.toISOString()))],[]);
 if(meta.filtros?.length)linhas.push([texto('Filtros da consulta',ESTILO.cabecalho),texto('Seleção',ESTILO.cabecalho)],...meta.filtros.map(([a,b])=>[texto(a,ESTILO.texto),texto(b,ESTILO.texto)]),[]);
 const inicioTabela=linhas.length;
 linhas.push(r.colunas.map(c=>texto(c,ESTILO.cabecalho)));
 if(!relatorio.linhas.length)linhas.push([texto('Nenhum registro encontrado para os filtros selecionados.',ESTILO.texto)]);
 relatorio.linhas.forEach((l,i)=>linhas.push(r.colunas.map((c,j)=>celula(c,l[j],r.linhas[i][j],tipo))));
 linhas.push([],[texto('Resumo do período',ESTILO.negrito)]);
 for(const [k,v] of Object.entries(r.totais||{}))linhas.push([texto(ROTULOS_RESUMO[k]||k,ESTILO.texto),v==null?texto('Sem base elegível',ESTILO.texto):typeof v==='number'?{n:v,estilo:k==='ocupacao'?ESTILO.percentual:ESTILO.numero}:texto(v,ESTILO.texto)]);
 linhas.push([],[texto(OBSERVACAO)]);
 return {linhas,inicioTabela,colunas:r.colunas};
}
function larguraCelula(c){if(!c)return 0;if(c.n!=null)return c.estilo===ESTILO.dataHora?17:c.estilo===ESTILO.data?12:8;return c.t.length+2;}
export function planilhaXml({linhas,inicioTabela,colunas}){
 const tabela=linhas.slice(inicioTabela),larguras=colunas.map((c,j)=>Math.min(60,Math.max(10,...tabela.map(l=>larguraCelula(l[j])))));
 const cols=larguras.length?'<cols>'+larguras.map((w,i)=>'<col min="'+(i+1)+'" max="'+(i+1)+'" width="'+w+'" customWidth="1"/>').join('')+'</cols>':'';
 const corpo=linhas.map((l,i)=>'<row r="'+(i+1)+'">'+l.map((c,j)=>{const ref=letraColuna(j)+(i+1),s=c.estilo?' s="'+c.estilo+'"':'';return c.n!=null?'<c r="'+ref+'"'+s+'><v>'+c.n+'</v></c>':'<c r="'+ref+'"'+s+' t="inlineStr"><is><t xml:space="preserve">'+xml(c.t)+'</t></is></c>';}).join('')+'</row>').join('');
 const ultima=letraColuna(Math.max(1,...linhas.map(l=>l.length))-1)+linhas.length;
 return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><dimension ref="A1:'+ultima+'"/>'+cols+'<sheetData>'+corpo+'</sheetData><pageMargins left="0.5" right="0.5" top="0.6" bottom="0.6" header="0.3" footer="0.3"/><pageSetup paperSize="9" orientation="landscape"/></worksheet>';
}
const ESTILOS='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
 +'<numFmts count="3"><numFmt numFmtId="164" formatCode="dd/mm/yyyy"/><numFmt numFmtId="165" formatCode="dd/mm/yyyy hh:mm"/><numFmt numFmtId="166" formatCode="0.0&quot;%&quot;"/></numFmts>'
 +'<fonts count="3"><font><sz val="10"/><name val="Arial"/></font><font><b/><sz val="13"/><name val="Arial"/></font><font><b/><sz val="10"/><name val="Arial"/></font></fonts>'
 +'<fills count="3"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill><fill><patternFill patternType="solid"><fgColor rgb="FFE7EFF9"/><bgColor indexed="64"/></patternFill></fill></fills>'
 +'<borders count="2"><border><left/><right/><top/><bottom/><diagonal/></border><border><left style="thin"><color rgb="FFC7CFD8"/></left><right style="thin"><color rgb="FFC7CFD8"/></right><top style="thin"><color rgb="FFC7CFD8"/></top><bottom style="thin"><color rgb="FFC7CFD8"/></bottom><diagonal/></border></borders>'
 +'<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
 +'<cellXfs count="9"><xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/><xf numFmtId="0" fontId="1" fillId="0" borderId="0" xfId="0" applyFont="1"/><xf numFmtId="0" fontId="2" fillId="0" borderId="0" xfId="0" applyFont="1"/>'
 +'<xf numFmtId="0" fontId="2" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1"/><xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/>'
 +'<xf numFmtId="164" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/><xf numFmtId="165" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/>'
 +'<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1"/><xf numFmtId="166" fontId="0" fillId="0" borderId="1" xfId="0" applyNumberFormat="1" applyBorder="1"/></cellXfs>'
 +'<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>';
// ---- ZIP sem compressão (método 0), com CRC-32 e nomes em UTF-8.
const TABELA_CRC=(()=>{const t=new Uint32Array(256);for(let n=0;n<256;n++){let c=n;for(let k=0;k<8;k++)c=c&1?0xedb88320^(c>>>1):c>>>1;t[n]=c>>>0;}return t;})();
export function crc32(bytes){let c=0xffffffff;for(const b of bytes)c=TABELA_CRC[(c^b)&255]^(c>>>8);return (c^0xffffffff)>>>0;}
function gravar(campos){const v=new DataView(new ArrayBuffer(campos.reduce((n,[,t])=>n+t,0)));let p=0;for(const [valor,t] of campos){if(t===4)v.setUint32(p,valor>>>0,true);else v.setUint16(p,valor,true);p+=t;}return new Uint8Array(v.buffer);}
export function criarZip(arquivos,agora=new Date()){
 const cod=new TextEncoder(),hora=(agora.getHours()<<11)|(agora.getMinutes()<<5)|(agora.getSeconds()>>1),dia=((Math.max(1980,agora.getFullYear())-1980)<<9)|((agora.getMonth()+1)<<5)|agora.getDate();
 const partes=[],central=[];let deslocamento=0;
 for(const [caminho,conteudo] of arquivos){
  const nome=cod.encode(caminho),dados=typeof conteudo==='string'?cod.encode(conteudo):conteudo,crc=crc32(dados);
  partes.push(gravar([[0x04034b50,4],[20,2],[0x0800,2],[0,2],[hora,2],[dia,2],[crc,4],[dados.length,4],[dados.length,4],[nome.length,2],[0,2]]),nome,dados);
  central.push(gravar([[0x02014b50,4],[20,2],[20,2],[0x0800,2],[0,2],[hora,2],[dia,2],[crc,4],[dados.length,4],[dados.length,4],[nome.length,2],[0,2],[0,2],[0,2],[0,2],[0,4],[deslocamento,4]]),nome);
  deslocamento+=30+nome.length+dados.length;
 }
 const tamanhoCentral=central.reduce((n,p)=>n+p.length,0);
 const todas=[...partes,...central,gravar([[0x06054b50,4],[0,2],[0,2],[arquivos.length,2],[arquivos.length,2],[tamanhoCentral,4],[deslocamento,4],[0,2]])];
 const saida=new Uint8Array(todas.reduce((n,p)=>n+p.length,0));let i=0;for(const p of todas){saida.set(p,i);i+=p.length;}
 return saida;
}
export function nomeArquivoRelatorio(r,meta={},extensao='xlsx'){return 'SIPA_Relatorio_'+(meta.titulo||'Aulas').normalize('NFD').replace(/[̀-ͯ]/g,'').replace(/[^a-zA-Z0-9]+/g,'_')+'_'+dataRelatorio(r.filtros.inicio).replaceAll('/','-')+'_a_'+dataRelatorio(r.filtros.fim).replaceAll('/','-')+'.'+extensao;}
const XML='<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
export function criarExcelRelatorio(relatorio,meta={},agora=new Date()){
 const titulo=xml('SIPA - Relatório de '+(meta.titulo||'Aulas'));
 const arquivos=[
  ['[Content_Types].xml',XML+'<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/></Types>'],
  ['_rels/.rels',XML+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/></Relationships>'],
  ['docProps/core.xml',XML+'<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><dc:title>'+titulo+'</dc:title><dc:creator>SIPA</dc:creator><dcterms:created xsi:type="dcterms:W3CDTF">'+agora.toISOString().slice(0,19)+'Z</dcterms:created></cp:coreProperties>'],
  ['xl/workbook.xml',XML+'<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="Relatório" sheetId="1" r:id="rId1"/></sheets></workbook>'],
  ['xl/_rels/workbook.xml.rels',XML+'<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>'],
  ['xl/worksheets/sheet1.xml',planilhaXml(linhasPlanilha(relatorio,meta,agora))],
  ['xl/styles.xml',ESTILOS]
 ];
 return {bytes:criarZip(arquivos,agora),nome:nomeArquivoRelatorio(relatorio,meta),tipo:TIPO_XLSX};
}
export async function exportarExcelRelatorio(r,meta){
 const {bytes,nome,tipo}=criarExcelRelatorio(r,typeof meta==='string'?{titulo:meta}:meta||{}),url=URL.createObjectURL(new Blob([bytes],{type:tipo})),a=document.createElement('a');
 a.href=url;a.download=nome;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 return {nome,bytes:bytes.length};
}
