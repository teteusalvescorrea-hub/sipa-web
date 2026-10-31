import test from 'node:test';
import assert from 'node:assert/strict';
import {servicoOperador} from '../nivel-1-operador/js/servicoOperador.js';
import {criarDadosDemo} from '../dev/operador/dadosDemo.js';
import {repositorioDemo,CHAVE_DEMO} from '../dev/operador/repositorioDemo.js';
import * as contas from '../dev/aluno/contaRecepcao.js';
const dados={nome:'Cadastro Local de Teste',cpf:'93541134780',nascimento:'2000-01-01',telefone:'27999998888',email:'teste@example.invalid',tipoCambio:'manual',categoria:'AB',unidadeCarro:'Santa Rita',quantidadeCarro:'20',quantidadeMoto:'15',observacoes:'Teste fictício de ativação.'};
test('conta fictícia atômica, idempotente, com hash, troca obrigatória, isolamento e bloqueio de tentativas',async()=>{
 const navegador=Object.getOwnPropertyDescriptor(globalThis,'navigator'),map=new Map(),sessao=new Map([['sipa.token','preservado']]);
 const storage=map=>({getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});
 globalThis.location=new URL('http://localhost/login.html');globalThis.localStorage=storage(map);globalThis.sessionStorage=storage(sessao);Object.defineProperty(globalThis,'navigator',{value:{locks:{request:async(k,f)=>f()}},configurable:true});
 try{
  const inicial=criarDadosDemo();map.set(CHAVE_DEMO,JSON.stringify(inicial));
  const repo=repositorioDemo('http://localhost/operador-cfc.html?demo=1',localStorage),identidade={id:'op-local',unidade:'Centro',permissoes:['consultar','cadastrar','anotar']};
  const adaptador={ler:async()=>repo.carregar(),alterar:async fn=>{const n=await fn(repo.carregar());if(!repo.salvar(n))throw Error('Falha de armazenamento');}};
  const servico=servicoOperador(adaptador,identidade,{prepararAcesso:contas.prepararAcessoAluno,hashPedido:contas.resumirSegredo});
  const antes=localStorage.getItem(CHAVE_DEMO),falha=servicoOperador(adaptador,identidade,{prepararAcesso:async()=>{throw Error('Falha de criação');},hashPedido:contas.resumirSegredo});
  await assert.rejects(falha.cadastrar(dados,'falha'),/criação/);assert.equal(localStorage.getItem(CHAVE_DEMO),antes);
  const salvar=localStorage.setItem;localStorage.setItem=()=>{throw Error('Quota indisponível');};await assert.rejects(servico.cadastrar(dados,'requisicao-unica'),/armazenamento/);assert.equal(localStorage.getItem(CHAVE_DEMO),antes);localStorage.setItem=salvar;
  await servico.cadastrar(dados,'requisicao-unica');let e=repo.carregar(),aluno=e.alunos.at(-1),conta=e.contasAlunos[0];
  assert.equal(conta.alunoId,aluno.id);assert.equal(aluno.contaId,conta.id);assert.equal(conta.perfil,'ALUNO');assert.notEqual(aluno.id,aluno.cpf);assert.equal(conta.login,dados.cpf);assert.equal(conta.hash.length,64);assert.equal(conta.sal.length,48);assert.notEqual(conta.hash,dados.cpf.slice(0,6));assert.equal(conta.iteracoes,600000);assert.deepEqual(e.alunos.slice(0,-1),inicial.alunos);assert.deepEqual(Object.fromEntries(Object.entries(aluno.creditos).map(([k,v])=>[k,v.disponiveis])),aluno.aulasAdquiridas);
  const id=conta.id,hash=conta.hash;await servico.cadastrar(dados,'requisicao-unica');e=repo.carregar();assert.equal(e.contasAlunos.length,1);assert.equal(e.alunos.length,inicial.alunos.length+1);assert.equal(e.contasAlunos[0].id,id);assert.equal(e.contasAlunos[0].hash,hash);
  await assert.rejects(servico.cadastrar(dados,'outra-requisicao'),/já cadastrado/);
  assert.equal((await contas.autenticarContaRecepcao('935.411.347-80','935411')).trocaObrigatoria,true);await assert.rejects(contas.consultarMinhaContaRecepcao(),/nova senha/);
  for(const senha of ['','123','a'.repeat(129)])await assert.rejects(contas.definirSenhaRecepcao(senha,senha),/4.*128/);
  await assert.rejects(contas.definirSenhaRecepcao('1234','abcd'),/confirmação/);
  for(const senha of ['1234','abcd','abc123','a!2?','a'.repeat(128)]){await contas.definirSenhaRecepcao(senha,senha);assert.equal((await contas.estadoAcessoRecepcao()).trocaObrigatoria,false);}
  await contas.definirSenhaRecepcao('senha-segura-local-123','senha-segura-local-123');const self=await contas.consultarMinhaContaRecepcao('demo-1');assert.equal(self.aluno.id,aluno.id);assert.ok(!JSON.stringify(self).includes(inicial.alunos[0].nome));
  const tokenAntigo=sessionStorage.getItem(contas.CHAVE_CONTA_RECEPCAO);await contas.sairContaRecepcao();sessionStorage.setItem(contas.CHAVE_CONTA_RECEPCAO,tokenAntigo);await assert.rejects(contas.consultarMinhaContaRecepcao(),/inválida/);sessionStorage.removeItem(contas.CHAVE_CONTA_RECEPCAO);
  await assert.rejects(contas.autenticarContaRecepcao(dados.cpf,'935411'),/inválidas/);assert.equal((await contas.autenticarContaRecepcao(dados.cpf,'senha-segura-local-123')).trocaObrigatoria,false);
  e=repo.carregar();e.contasAlunos[0].trocaObrigatoria=undefined;e.contasAlunos[0].ativadaEm=undefined;repo.salvar(e);assert.equal((await contas.estadoAcessoRecepcao()).trocaObrigatoria,true);await assert.rejects(contas.consultarMinhaContaRecepcao(),/nova senha/);
  for(let i=0;i<5;i++)await assert.rejects(contas.autenticarContaRecepcao(dados.cpf,'incorreta'),/inválidas/);await assert.rejects(contas.autenticarContaRecepcao(dados.cpf,'senha-segura-local-123'),/tentativas/);
  assert.equal(sessionStorage.getItem('sipa.token'),'preservado');assert.ok(!localStorage.getItem(CHAVE_DEMO).includes('senha-segura-local-123'));
  globalThis.location=new URL('https://sipa.example/login.html');await assert.rejects(contas.autenticarContaRecepcao(dados.cpf,'935411'),/indispon|desenvolvimento/);
 }finally{for(const k of ['location','localStorage','sessionStorage'])delete globalThis[k];if(navegador)Object.defineProperty(globalThis,'navigator',navegador);else delete globalThis.navigator;}
});
