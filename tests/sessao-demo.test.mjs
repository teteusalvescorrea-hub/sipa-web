import test from 'node:test';import assert from 'node:assert/strict';
import {entrarDemo,sessaoDemo} from '../dev/sessao.js';
test('login livre foi desativado; parametros e sessao antiga nao concedem perfil',()=>{
 const dados=new Map([['sipa.dev.navegacao.v1',JSON.stringify({origem:'demonstracao-local',perfil:'operador',unidade:'Itaparica',expira:Date.now()+100000})]]);
 globalThis.location=new URL('http://127.0.0.1:5500/login.html?demo=1');globalThis.sessionStorage=globalThis.localStorage={getItem:k=>dados.get(k)||null,setItem:(k,v)=>dados.set(k,v),removeItem:k=>dados.delete(k)};
 try{for(const p of ['aluno','instrutor','operador','gerencia','master'])assert.throws(()=>entrarDemo('93541134780','123456',p,'Itaparica'));assert.equal(sessaoDemo(),null);globalThis.location=new URL('https://sipa.example/login.html?demo=1&ambiente=local');assert.equal(sessaoDemo(),null);}finally{delete globalThis.location;delete globalThis.sessionStorage;delete globalThis.localStorage;}
});
