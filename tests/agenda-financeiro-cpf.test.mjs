import test from 'node:test';
import assert from 'node:assert/strict';
import {criarLiberacaoAgendaTeste} from '../dev/operador/liberacaoAgendaTeste.js';
import {projetarContaRecepcao,elegibilidadeContaRecepcao} from '../dev/aluno/servicoRecepcao.js';
import {ETAPAS} from '../nivel-1-operador/js/dominioOperador.js';
import {formatarCpfEntrada,normalizarCpfEntrada} from '../shared/js/formatacao.js';
import {motivoCatalogoOnibus} from '../shared/js/categorias.js';
const url='http://localhost/nivel-1-operador/html/operador-cfc.html?demo=1',op={id:'operador',nivel:1,unidade:'Cobilândia',permissoes:['consultar','verificar']};
test('cadastro adquirido habilita saldo sem pagamento; atalho anterior desativado',()=>{
 const a={id:'d',categoria:'D',financeiro:'Pendente',aulasAdquiridas:{D:10},etapas:Object.fromEntries(Object.keys(ETAPAS).map(k=>[k,{status:'Aprovado'}]))};
 const contexto={aluno:a,aulas:[],recursos:[],ocupacoes:[]},antes=structuredClone(contexto),d=projetarContaRecepcao(contexto);
 assert.equal(d.resumo.categorias.D.disponiveis,10);assert.equal(elegibilidadeContaRecepcao(d),'');assert.deepEqual(contexto,antes);
 assert.throws(()=>criarLiberacaoAgendaTeste(url,()=>url)(contexto,op,'d'),/desativada/);
 a.verificacaoFinanceira={origem:'manual-local'};assert.match(elegibilidadeContaRecepcao(projetarContaRecepcao(contexto)),/bloqueio/);
});

test('máscara progressiva limita a 11 números sem validar matematicamente CPF fictício',()=>{
 for(const [entrada,saida] of [['1','1'],['1234','123.4'],['123456','123.456'],['123456789','123.456.789'],['12345678909','123.456.789-09'],['1234567890912345','123.456.789-09'],['abc123.456.789-09!?','123.456.789-09'],['11111111111','111.111.111-11']])assert.equal(formatarCpfEntrada(entrada),saida);
 assert.equal(normalizarCpfEntrada('111.111.111-11'),'11111111111');
});
test('catálogo de ônibus não escolhe silenciosamente outra agenda quando há duplicidade',()=>{
 const r=[{id:'i',tipo:'instrutor',unidade:'Cobilândia',categorias:['D'],ativo:true},{id:'v',tipo:'veiculo',unidade:'Cobilândia',categoria:'D',ativo:true}];assert.equal(motivoCatalogoOnibus(r),'');assert.match(motivoCatalogoOnibus([...r,{...r[0],id:'i2'}]),/único/);assert.match(motivoCatalogoOnibus([]),/instrutor/);
});
