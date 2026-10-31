import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {prepararIntegrado} from '../dev/preparar-integrado.mjs';
test('API sem URL configurada falha antes de enviar uma requisicao relativa',()=>{
 const saida=execFileSync(process.execPath,['--input-type=module','-e',`
  globalThis.window={location:{hostname:'sipa.example'}};
  globalThis.sessionStorage={getItem:()=>null};
  let requisicoes=0;globalThis.fetch=async()=>{requisicoes++;return new Response('{}');};
  const {Get}=await import('./shared/js/api.js');
  let status=null;try{await Get('alunos/me');}catch(erro){status=erro.status;}
  console.log(JSON.stringify({status,requisicoes}));
 `],{encoding:'utf8',cwd:new URL('../',import.meta.url)});
 assert.deepEqual(JSON.parse(saida),{status:0,requisicoes:0});
});
test('API configurada mantem o destino e o processamento da resposta',()=>{
 const saida=execFileSync(process.execPath,['--input-type=module','-e',`
  globalThis.window={location:{hostname:'127.0.0.1'}};
  globalThis.localStorage={getItem:()=> 'https://api.example.test/api'};
  globalThis.sessionStorage={getItem:()=>null};
  let destino;globalThis.fetch=async url=>{destino=url;return new Response('{"ok":true}',{status:200});};
  const {Get}=await import('./shared/js/api.js');
  const resposta=await Get('alunos/me');console.log(JSON.stringify({destino,resposta}));
 `],{encoding:'utf8',cwd:new URL('../',import.meta.url)});
 assert.deepEqual(JSON.parse(saida),{destino:'https://api.example.test/api/alunos/me',resposta:{ok:true}});
});
test('aplicação normal não aceita laboratório, URL ou preferência persistente',()=>{
 const saida=execFileSync(process.execPath,['--input-type=module','-e',`globalThis.sessionStorage={getItem:()=>null,setItem(){},removeItem(){}};const {desenvolvimentoAtivo}=await import('./shared/js/ambiente.js');console.log(JSON.stringify(['http://127.0.0.1:5500/login.html?demo=1&ambiente=local','https://sipa.example/?demo=1'].map(desenvolvimentoAtivo)));`],{encoding:'utf8'});assert.deepEqual(JSON.parse(saida),[false,false]);
});
test('pacote não entrega laboratório, credenciais nominais ou imports de dev; JS mantém sintaxe',async()=>{
 const destino=await prepararIntegrado(path.join(await fs.mkdtemp(path.join(os.tmpdir(),'sipa-entrega-teste-')),'app'));
 for(const n of ['dev','tests','.entrega-aluno','.instrutor-local','.git'])await assert.rejects(fs.access(path.join(destino,n)));
 const arquivos=[];async function listar(dir){for(const d of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,d.name);if(d.isDirectory())await listar(p);else arquivos.push(p);}}await listar(destino);
 for(const p of arquivos.filter(p=>p.endsWith('.js'))){const s=await fs.readFile(p,'utf8');assert.doesNotMatch(s,/(?:from\s*|import\s*\()\s*['"][^'"]*\/dev\//,p);if(!p.includes(path.sep+'vendor'+path.sep)){assert.doesNotMatch(s,/12312312311|93541134780|be22a71033e87d33c9203aed92419b90300f29be0c9d9382/,p);execFileSync(process.execPath,['--check',p],{stdio:'pipe'});}}
 assert.ok(arquivos.some(p=>p.endsWith('MANIFESTO-ENTREGA.json')));
});
