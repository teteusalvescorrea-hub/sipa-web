import test from 'node:test';
import assert from 'node:assert/strict';
import {dataHoraAcesso,apresentarHistoricoAcessos} from '../shared/js/historicoAcessos.js';
import {repositorioDemo} from '../dev/operador/repositorioDemo.js';
import {criarAluno} from '../dev/operador/dadosDemo.js';
test('snapshot arquivado sem segredo é válido; conta ativa sem segredo permanece inválida',()=>{
 const a=criarAluno({nome:'Aluno preservado',cpf:'11111111111',categoria:'B'},'a');a.contaId='c';const e={versao:2,alunos:[a],aulas:[],recursos:[],contasAlunos:[{id:'c',alunoId:'a',perfil:'ALUNO',login:a.cpf,ativa:false,excluidoEm:'2026-10-29T13:20:14.965Z',excluidoPor:'master'}]},antes=JSON.stringify(e);
 const validar=()=>{const r=repositorioDemo('http://127.0.0.1:5500/operador-cfc.html?demo=1',{getItem:()=>JSON.stringify(e)}),dados=r.carregar();return {aviso:r.aviso,dados};};assert.equal(validar().aviso,'');assert.equal(JSON.stringify(e),antes);e.contasAlunos[0].ativa=true;assert.ok(validar().aviso);e.contasAlunos[0].ativa=false;delete e.contasAlunos[0].excluidoPor;assert.ok(validar().aviso);
});
test('histórico preserva originais, resolve nomes exatos, datas Brasília e informações ausentes',()=>{
 assert.equal(dataHoraAcesso('2026-10-29T13:20:14.965Z'),'29/10/2026 às 10:20:14');assert.equal(dataHoraAcesso('inválida'),'Não informado');
 const eventos=[{em:'inválida',responsavel:'desconhecido',acao:'codigo-antigo',contaId:'sem-registro'},{em:'2026-10-29T13:20:14.965Z',responsavel:'m',acao:'exclusao-conta',contaId:'apagada',antes:{nome:'Nome preservado',perfil:'operador',hash:'NUNCA EXIBIR'},modalidade:'logica'},{em:'2026-10-29T14:20:14Z',responsavel:'autor-excluido',responsavelNome:'Autor preservado',acao:'redefinir',contaId:'a'}],antes=structuredClone(eventos),r=apresentarHistoricoAcessos(eventos,[{id:'m',nome:'Master Teste',perfil:'master'},{id:'a',nome:'Aluno correto',perfil:'ALUNO'}]);
 assert.equal(r[0].responsavel,'Autor preservado');assert.equal(r[0].conta,'Aluno correto');assert.equal(r[1].operacao,'Perfil excluído');assert.equal(r[1].responsavel,'Master Teste');assert.equal(r[1].conta,'Nome preservado');assert.equal(r[1].perfilConta,'Recepção');assert.equal(r[2].conta,'Usuário não identificado');assert.equal(r[2].responsavel,'Usuário não identificado');assert.deepEqual(eventos,antes);
});
