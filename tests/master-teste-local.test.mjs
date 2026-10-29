import test from 'node:test';
import assert from 'node:assert/strict';
import {prepararMasterTeste,BACKUP_MASTER_TESTE} from './fixtures/masterTeste.js';
import {segredo} from '../dev/aluno/authLocal.js';
import {CHAVE_AUTH,CHAVE_TOKEN,CHAVE_MIGRACAO,autenticar,exigirPerfil,sair} from '../dev/autenticacao.js';
import {permissoesDoPerfil} from '../shared/js/permissoesAdministrativas.js';

test('Master nominal: origem exata, hash, idempotência, preservação e autenticação real',async()=>{
 const nav=Object.getOwnPropertyDescriptor(globalThis,'navigator'),map=new Map(),ses=new Map(),fila=new Map();
 const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,v),removeItem:k=>m.delete(k)});
 globalThis.location=new URL('http://127.0.0.1:5500/login.html');globalThis.localStorage=storage(map);globalThis.sessionStorage=storage(ses);Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:(k,fn)=>{const p=(fila.get(k)||Promise.resolve()).catch(()=>{}).then(fn);fila.set(k,p);return p;}}}});
 try{
  const seg=await segredo('AnteriorTeste8'),anteriores=['operador','gerencia'].map((perfil,i)=>({...seg,id:perfil,perfil,login:i?'66666666666':'55555555555',nome:'Conta anterior',unidade:'Vila Velha',ativa:true,trocaObrigatoria:false,versaoSenha:1}));
  const inicial={versao:2,contas:anteriores,sessoes:[{id:'sessao-preservada',contaId:'gerencia',expira:Date.now()+3600000}],historicoAcessos:[{id:'evento-anterior'}]};localStorage.setItem(CHAVE_AUTH,JSON.stringify(inicial));localStorage.setItem(CHAVE_MIGRACAO,'concluida');localStorage.setItem('sipa.operador.demo.v2','{"versao":2,"alunos":[{"id":"preservar","cpf":"11111111111"}],"aulas":[],"recursos":[]}');
  const operacao=localStorage.getItem('sipa.operador.demo.v2');
  const resultados=await Promise.all([prepararMasterTeste(),prepararMasterTeste()]);assert.equal(resultados.filter(Boolean).length,1);
  let e=JSON.parse(localStorage.getItem(CHAVE_AUTH)),conta=e.contas.find(c=>c.login==='12312312311');assert.equal(e.contas.length,3);assert.equal(conta.nome,'Master Teste');assert.equal(conta.perfil,'master');assert.equal(conta.unidade,'Vila Velha');assert.equal(conta.unidades.length,6);assert.equal(conta.ativa,true);assert.equal(conta.trocaObrigatoria,false);assert.equal(conta.hash.length,64);assert.deepEqual(e.contas.slice(0,2),anteriores);assert.deepEqual(e.sessoes,inicial.sessoes);assert.deepEqual(e.historicoAcessos[0],inicial.historicoAcessos[0]);assert.equal(JSON.parse(localStorage.getItem(BACKUP_MASTER_TESTE)).authAntes,JSON.stringify(inicial));assert.equal(localStorage.getItem('sipa.operador.demo.v2'),operacao);
  const antes=localStorage.getItem(CHAVE_AUTH);assert.equal(await prepararMasterTeste(),false);assert.equal(localStorage.getItem(CHAVE_AUTH),antes);
  await assert.rejects(autenticar('12312312311','incorreta','master'),/inválidos/);
  await autenticar('123.123.123-11','123456','master');const op=await exigirPerfil('master');assert.equal(op.nivel,3);assert.equal(op.unidades.length,6);assert.deepEqual(op.permissoes,permissoesDoPerfil('master'));await sair();assert.equal(sessionStorage.getItem(CHAVE_TOKEN),null);
  await autenticar('55555555555','AnteriorTeste8','operador');assert.equal((await exigirPerfil('operador')).id,'operador');await assert.rejects(exigirPerfil('master'));await sair();await autenticar('66666666666','AnteriorTeste8','gerencia');assert.equal((await exigirPerfil('gerencia')).id,'gerencia');await assert.rejects(exigirPerfil('master'));await sair();
  e=JSON.parse(localStorage.getItem(CHAVE_AUTH));assert.deepEqual(e.contas.filter(c=>c.login!=='12312312311'),anteriores);assert.equal(localStorage.getItem('sipa.operador.demo.v2'),operacao);
  for(const endereco of ['https://sipa.example/login.html?ambiente=local','http://localhost:5500/login.html','http://127.0.0.1:5500/login.html?ambiente=integrado','http://127.0.0.1:5500/index.html']){globalThis.location=new URL(endereco);assert.equal(await prepararMasterTeste(),false);}
  globalThis.location=new URL('http://127.0.0.1:5500/login.html?ambiente=local');const conflito={...inicial,contas:[]};localStorage.setItem(CHAVE_AUTH,JSON.stringify(conflito));localStorage.setItem('sipa.operador.demo.v2','{"alunos":[{"id":"aluno","cpf":"12312312311"}]}');await assert.rejects(prepararMasterTeste(),/conflitantes/);assert.equal(localStorage.getItem(CHAVE_AUTH),JSON.stringify(conflito));
 }finally{for(const k of ['location','localStorage','sessionStorage'])delete globalThis[k];if(nav)Object.defineProperty(globalThis,'navigator',nav);else delete globalThis.navigator;}
});
