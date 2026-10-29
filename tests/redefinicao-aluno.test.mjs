import test from 'node:test';
import assert from 'node:assert/strict';
import {servicoOperador} from '../nivel-1-operador/js/servicoOperador.js';
import {permissoesDoPerfil} from '../shared/js/permissoesAdministrativas.js';
import {criarAluno} from '../dev/operador/dadosDemo.js';
import {segredo} from '../dev/aluno/authLocal.js';
import {CHAVE_DEMO} from '../dev/operador/repositorioDemo.js';
import * as contas from '../dev/aluno/contaRecepcao.js';

test('redefinição por unidade-base, validação, auditoria, preservação e troca obrigatória',async()=>{
 const descriptor=Object.getOwnPropertyDescriptor(globalThis,'navigator'),map=new Map(),ses=new Map();
 const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
 globalThis.location=new URL('http://localhost/login.html');globalThis.localStorage=storage(map);globalThis.sessionStorage=storage(ses);Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:async(k,fn)=>fn()}}});
 try{
  const cred=await segredo('AntigaTeste8'),aluno={...criarAluno({nome:'Aluno de teste',cpf:'52998224725',categoria:'B'},'a1'),unidade:'Vila Velha',unidadePrincipal:'Vila Velha',unidadeCarro:'Terra Vermelha',contaId:'c1',creditos:{B:{contratadas:10,disponiveis:9}},observacoes:'Preservar'};
  const original={versao:2,alunos:[aluno],recursos:[],aulas:[{id:'aula1',alunoId:'a1',categoria:'B',unidade:'Terra Vermelha',data:'2026-11-20',inicio:'14:00',fim:'14:50',status:1}],contasAlunos:[{...cred,id:'c1',alunoId:'a1',perfil:'ALUNO',login:aluno.cpf,ativa:true,trocaObrigatoria:false,ativadaEm:new Date().toISOString(),versaoSenha:1}],sessoesAlunos:[]};
  localStorage.setItem(CHAVE_DEMO,JSON.stringify(original));
  const adaptador={ler:async()=>JSON.parse(localStorage.getItem(CHAVE_DEMO)),alterar:async fn=>{const e=await fn(JSON.parse(localStorage.getItem(CHAVE_DEMO)));localStorage.setItem(CHAVE_DEMO,JSON.stringify(e));}};
  const servico=(perfil,u='Vila Velha',extra={})=>servicoOperador(adaptador,{id:'conta-'+perfil,nome:'Responsável',perfil,nivel:{operador:1,gerencia:2,master:3}[perfil],unidade:u,permissoes:permissoesDoPerfil(perfil),...extra},{prepararRedefinicao:contas.prepararRedefinicaoAlunoLocal,prepararAcesso:contas.prepararAcessoAluno});
  const pedido={justificativa:'Solicitação presencial do aluno.'};
  for(const perfil of ['operador','gerencia']){
   const antes=localStorage.getItem(CHAVE_DEMO);
   await assert.rejects(servico(perfil,'Terra Vermelha').acessoAluno('a1'),/unidade-base/);
   await assert.rejects(servico(perfil,'Terra Vermelha').redefinirSenhaAluno('a1',pedido),/unidade-base/);
   assert.equal(localStorage.getItem(CHAVE_DEMO),antes);
  }
  const op=servico('operador');
  for(const patch of [{justificativa:''},{justificativa:' '.repeat(5)},{justificativa:'x'.repeat(1001)},{justificativa:'Senha 529982 aqui'}])await assert.rejects(op.redefinirSenhaAluno('a1',{...pedido,...patch}));
  await assert.rejects(op.redefinirSenhaAluno('inexistente',pedido));
  await assert.rejects(servico('operador','Vila Velha',{permissoes:['consultar']}).redefinirSenhaAluno('a1',pedido),/Permissão/);
  await assert.rejects(servico('operador','Vila Velha',{nivel:0}).redefinirSenhaAluno('a1',pedido),/Permissão/);
  await contas.autenticarContaRecepcao(aluno.cpf,'AntigaTeste8');const token=sessionStorage.getItem(contas.CHAVE_CONTA_RECEPCAO);
  for(const [i,perfil]of ['operador','gerencia','master'].entries()){
   const nova='529982';
   await servico(perfil,perfil==='master'?'Terra Vermelha':'Vila Velha').redefinirSenhaAluno('a1',{...pedido,nova,confirmacao:nova});
   const e=await adaptador.ler();assert.equal(e.contasAlunos[0].trocaObrigatoria,true);assert.equal(e.contasAlunos[0].versaoSenha,2+i);assert.equal(e.sessoesAlunos.length,0);
   assert.deepEqual(e.aulas,original.aulas);assert.deepEqual({...e.alunos[0],historico:[]},{...aluno,historico:[]});
   assert.equal(e.auditoria.at(-1).tipo,'redefinicao-senha-aluno');assert.equal(e.auditoria.at(-1).usuario,'conta-'+perfil);assert.equal(e.auditoria.at(-1).justificativa,pedido.justificativa);
   const texto=JSON.stringify(e);assert(!JSON.stringify(e.auditoria).includes(nova));assert(!texto.includes('AntigaTeste8'));assert.equal(e.alunos[0].historico.at(-1).tipo,'acessos');
  }
  sessionStorage.setItem(contas.CHAVE_CONTA_RECEPCAO,token);await assert.rejects(contas.consultarMinhaContaRecepcao(),/inválida/);
  await assert.rejects(contas.autenticarContaRecepcao(aluno.cpf,'AntigaTeste8'),/inválidas/);
  assert.equal((await contas.autenticarContaRecepcao(aluno.cpf,'529982')).trocaObrigatoria,true);
  await assert.rejects(contas.consultarMinhaContaRecepcao(),/nova senha/);
  await contas.definirSenhaRecepcao('PessoalTeste9','PessoalTeste9');assert.equal((await contas.estadoAcessoRecepcao()).trocaObrigatoria,false);
  await contas.sairContaRecepcao();await assert.rejects(contas.autenticarContaRecepcao(aluno.cpf,'529982'),/inválidas/);await contas.autenticarContaRecepcao(aluno.cpf,'PessoalTeste9');assert.equal((await contas.consultarMinhaContaRecepcao()).aluno.id,aluno.id);
  const antesIntegrado=localStorage.getItem(CHAVE_DEMO);
  for(const url of ['https://sipa.example/login.html?demo=1','http://localhost/login.html?ambiente=integrado']){
   globalThis.location=new URL(url);await assert.rejects(op.redefinirSenhaAluno('a1',pedido),/indispon/);assert.equal(localStorage.getItem(CHAVE_DEMO),antesIntegrado);
  }
  globalThis.location=new URL('http://localhost/login.html?ambiente=local');
  let e=await adaptador.ler();e.contasAlunos[0].ativa=false;localStorage.setItem(CHAVE_DEMO,JSON.stringify(e));await assert.rejects(op.redefinirSenhaAluno('a1',pedido),/desativada/);
  e.contasAlunos=[];delete e.alunos[0].contaId;localStorage.setItem(CHAVE_DEMO,JSON.stringify(e));assert.equal((await op.acessoAluno('a1')).possuiConta,false);const semConta=localStorage.getItem(CHAVE_DEMO);
  for(const perfil of ['operador','gerencia','master']){
   localStorage.setItem(CHAVE_DEMO,semConta);const resultado=await servico(perfil).redefinirSenhaAluno('a1',pedido),novo=await adaptador.ler();
   assert.equal(resultado.acessoCriado,true);assert.equal(novo.alunos.length,e.alunos.length);assert.equal(novo.contasAlunos.length,1);assert.equal(novo.alunos[0].contaId,novo.contasAlunos[0].id);assert.equal(novo.contasAlunos[0].versaoSenha,1);assert.equal(novo.contasAlunos[0].trocaObrigatoria,true);assert.deepEqual(novo.aulas,e.aulas);assert.equal(novo.auditoria.at(-1).tipo,'acesso-aluno-criado');assert.equal(novo.auditoria.at(-1).depois.responsavelNome,'Respons'+String.fromCharCode(225)+'vel');
   assert.equal((await contas.autenticarContaRecepcao(aluno.cpf,'529982')).trocaObrigatoria,true);await assert.rejects(contas.consultarMinhaContaRecepcao());await contas.definirSenhaRecepcao('PessoalCriada9','PessoalCriada9');await contas.sairContaRecepcao();await assert.rejects(contas.autenticarContaRecepcao(aluno.cpf,'529982'),/inválidas/);await contas.autenticarContaRecepcao(aluno.cpf,'PessoalCriada9');
  }
  const valido=await adaptador.ler(),inconsistente=structuredClone(valido);inconsistente.contasAlunos[0].login='11111111111';localStorage.setItem(CHAVE_DEMO,JSON.stringify(inconsistente));await assert.rejects(op.redefinirSenhaAluno('a1',pedido),/inconsistente/);assert.equal(localStorage.getItem(CHAVE_DEMO),JSON.stringify(inconsistente));
 }finally{for(const k of ['location','localStorage','sessionStorage'])delete globalThis[k];if(descriptor)Object.defineProperty(globalThis,'navigator',descriptor);else delete globalThis.navigator;}
});
