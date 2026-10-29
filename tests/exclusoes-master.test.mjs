import test from 'node:test';
import assert from 'node:assert/strict';
import {excluirCadastro} from '../dev/exclusoes.js';
import {autenticar,CHAVE_AUTH,CHAVE_MIGRACAO} from '../dev/autenticacao.js';
import {segredo} from '../dev/aluno/authLocal.js';
const OP='sipa.operador.demo.v2';
test('exclusões exigem Master autenticado; preservam dependências, revogam acessos e auditam',async()=>{
 const anterior={location:globalThis.location,localStorage:globalThis.localStorage,sessionStorage:globalThis.sessionStorage,navigator:Object.getOwnPropertyDescriptor(globalThis,'navigator')},m=new Map(),s=new Map(),filas=new Map();
 const storage=m=>({getItem:k=>m.get(k)||null,setItem:(k,v)=>m.set(k,String(v)),removeItem:k=>m.delete(k)});globalThis.location=new URL('http://127.0.0.1:5500/login.html');globalThis.localStorage=storage(m);globalThis.sessionStorage=storage(s);Object.defineProperty(globalThis,'navigator',{configurable:true,value:{locks:{request:(k,f)=>{const p=(filas.get(k)||Promise.resolve()).catch(()=>{}).then(f);filas.set(k,p);return p;}}}});
 try{
 const seg=await segredo('TesteLocal8'),contas=['master','gerencia','operador'].map((perfil,i)=>({...seg,id:perfil,perfil,login:String(i+2).repeat(11),nome:perfil,unidade:'Vila Velha',ativa:true,trocaObrigatoria:false,versaoSenha:1}));
 localStorage.setItem(CHAVE_AUTH,JSON.stringify({versao:2,contas,sessoes:[]}));localStorage.setItem(CHAVE_MIGRACAO,'concluida');
 const aluno={id:'a',nome:'Aluno histórico',cpf:'11111111111',categoria:'D',unidade:'Cobilândia',historico:[{id:'original'}],creditos:{D:{contratadas:10,disponiveis:9}},contaId:'ca'};
 const aula={id:'h',alunoId:'a',instrutorId:'i',veiculoId:'v',status:5,data:'2026-10-20',historico:[{status:5}]};
 localStorage.setItem(OP,JSON.stringify({versao:2,alunos:[aluno,{id:'livre',nome:'Sem dependências'}],recursos:[{id:'i',tipo:'Instrutores',ativo:true},{id:'v',tipo:'Veículos',ativo:true}],aulas:[aula],contasAlunos:[{...seg,id:'ca',alunoId:'a',login:aluno.cpf,perfil:'ALUNO',ativa:true}],sessoesAlunos:[{contaId:'ca',id:'revogar'}]}));
 const apagar=(tipo,id,confirmado=true)=>excluirCadastro({tipo,id,confirmado,justificativa:'Exclusão solicitada no teste'});
 for(const perfil of ['operador','gerencia']){await autenticar(contas.find(c=>c.perfil===perfil).login,'TesteLocal8',perfil);const antes=[localStorage.getItem(OP),localStorage.getItem(CHAVE_AUTH)];await assert.rejects(apagar('aluno','a'),/insuficiente|autorizada/i);assert.deepEqual([localStorage.getItem(OP),localStorage.getItem(CHAVE_AUTH)],antes);}
 await autenticar(contas[0].login,'TesteLocal8','master');await assert.rejects(apagar('conta','master'),/própria/);await assert.rejects(apagar('aluno','a',false),/Confirme/);
 await apagar('aluno','a');let e=JSON.parse(localStorage.getItem(OP));assert.ok(e.alunos.find(a=>a.id==='a').excluidoEm);assert.deepEqual(e.aulas,[aula]);assert.deepEqual(e.alunos[0].creditos,aluno.creditos);assert.deepEqual(e.alunos[0].historico,aluno.historico);assert.equal(e.contasAlunos[0].ativa,false);assert.equal(e.contasAlunos[0].hash,undefined);assert.equal(e.sessoesAlunos.length,0);assert.equal(e.auditoria.at(-1).usuario,'master');assert.equal(e.auditoria.at(-1).referencia,'a');assert.equal(e.auditoria.at(-1).depois.modalidade,'logica');
 await assert.rejects(apagar('aluno','a'),/já excluído/);
 await apagar('instrutor','i');await apagar('veiculo','v');e=JSON.parse(localStorage.getItem(OP));assert.ok(e.recursos.every(r=>r.excluidoEm&&r.ativo===false));assert.deepEqual(e.aulas,[aula]);
 await apagar('aluno','livre');assert.ok(!JSON.parse(localStorage.getItem(OP)).alunos.some(a=>a.id==='livre'));
 for(const perfil of ['operador','gerencia','instrutor','master','aluno']){const id='conta-livre-'+perfil;const a=JSON.parse(localStorage.getItem(CHAVE_AUTH));a.contas.push({...seg,id,nome:id,login:'99999999999',perfil,ativa:true});localStorage.setItem(CHAVE_AUTH,JSON.stringify(a));await apagar('conta',id);assert.ok(!JSON.parse(localStorage.getItem(CHAVE_AUTH)).contas.some(c=>c.id===id));}
 await assert.rejects(apagar('conta','ca'),/já excluído/);e=JSON.parse(localStorage.getItem(OP));assert.ok(e.contasAlunos[0].excluidoEm);assert.equal(e.contasAlunos[0].ativa,false);
 globalThis.location=new URL('https://sipa.example/login.html?demo=1');await assert.rejects(apagar('conta','operador'),/insuficiente|indisponível/);
 }finally{for(const k of ['location','localStorage','sessionStorage']){if(anterior[k]===undefined)delete globalThis[k];else globalThis[k]=anterior[k];}Object.defineProperty(globalThis,'navigator',anterior.navigator);}
});
