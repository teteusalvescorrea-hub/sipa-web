import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {prepararIntegrado} from '../dev/preparar-integrado.mjs';
const root=fileURLToPath(new URL('../',import.meta.url));
test('escala global atende todos os perfis sem ampliar artificialmente o documento',async()=>{
 const alvo=path.join(root,'shared/css/escala.css');
 async function dependencias(f,vistos=new Set()){
  if(vistos.has(f))return vistos;vistos.add(f);const s=await fs.readFile(f,'utf8');
  const refs=f.endsWith('.html')?[...s.matchAll(/href="([^"?#]+\.css)"/g)].map(m=>m[1]):[...s.matchAll(/@import\s+url\(['"]?([^'")]+)['"]?\)/g)].map(m=>m[1]);
  for(const ref of refs.filter(r=>!/^https?:/.test(r)))await dependencias(path.resolve(path.dirname(f),ref),vistos);
  return vistos;
 }
 for(const pagina of ['login.html','aluno/html/dashboard.html','aluno/html/agendamento.html','aluno/html/minhas-aulas.html','aluno/html/meu-progresso.html','aluno/html/meu-perfil.html','aluno/html/pacotes.html','instrutor/html/instrutor.html','nivel-1-operador/html/operador-cfc.html','nivel-3-master/html/master.html','nivel-2-gerencia/html/gerencia.html','aluno/html/mensagens.html','index.html','cadastro.html','autoescola.html']){
  assert.equal((await dependencias(path.join(root,pagina))).has(alvo),true,pagina);
 }
 const global=await fs.readFile(alvo,'utf8');assert.doesNotMatch(global,/\bzoom\s*:|\bscale\s*\(/i);
 const css=await fs.readFile(path.join(root,'shared/css/escala-administrativa.css'),'utf8');assert.doesNotMatch(css,/\bzoom\s*:|\bscale\s*\(/i);
 const semComentarios=css.replace(/\/\*[\s\S]*?\*\//g,'');
 for(const regra of semComentarios.matchAll(/([^{}]+)\{([^{}]*)\}/g))if(!regra[1].trim().startsWith('@'))assert.ok(regra[1].trim().startsWith('body.operador-page'),regra[1]);
});
async function arquivos(dir){const result=[];for(const e of await fs.readdir(dir,{withFileTypes:true})){if(e.name.startsWith('.')||['tests','node_modules'].includes(e.name))continue;const f=path.join(dir,e.name);result.push(...(e.isDirectory()?await arquivos(f):[f]));}return result;}
test('seis HTMLs do Aluno existem somente no diretorio do perfil',async()=>{
 for(const page of ['dashboard','agendamento','minhas-aulas','meu-progresso','pacotes','meu-perfil']){
  await assert.rejects(fs.access(path.join(root,page+'.html')));
  const s=await fs.readFile(path.join(root,'aluno/html',page+'.html'),'utf8');
  assert.match(s,/src="\.\.\/js\/entrada\.js"/);
  await fs.access(path.join(root,'aluno/css',page+'.css'));
 }
});
test('imports, referencias HTML e navegacao nao dependem dos worktrees',async()=>{
 for(const f of (await arquivos(root)).filter(f=>/\.(js|html)$/.test(f))){
  const s=await fs.readFile(f,'utf8');
  assert.doesNotMatch(s,/\.entrega-aluno|\.instrutor-local/,f);
  const refs=[...s.matchAll(/\b(?:from\s*|import\s*\(\s*)['"](\.[^'"]+\.js)['"]/g)].map(m=>m[1]);
  if(f.endsWith('.html'))refs.push(...[...s.matchAll(/(?:src|href)\s*=\s*['"]([^'"?#]+)['"]/g)].map(m=>m[1]).filter(r=>!/^([a-z]+:|\/|#)/i.test(r)));
  for(const ref of refs)await fs.access(path.resolve(path.dirname(f),ref));
 }
});
test('adaptador integrado preserva zero oficial e nao concede 20 creditos',async()=>{
 globalThis.window={location:{hostname:'localhost'}};let adaptarDadosAluno;try{({adaptarDadosAluno}=await import('../aluno/js/services/alunoIntegrado.js'));}finally{delete globalThis.window;}
 const aluno={id:'id-autorizado-pela-api',nome:'Cadastro autorizado',cpf:'documento-do-servico',aulasContratadas:0,aulasRealizadas:0};
 const dados=adaptarDadosAluno(aluno,[],[]);
 assert.equal(dados.aluno.id,aluno.id);assert.equal(dados.aluno.documento,aluno.cpf);
 assert.equal(dados.resumo.categorias.A.disponiveis,0);assert.equal(dados.resumo.categorias.B.disponiveis,0);
 assert.equal(dados.credito,null);
});
test('preparacao integrada exclui dev, historicos e testes e desliga configuracao',async()=>{
 const base=await fs.mkdtemp(path.join(os.tmpdir(),'sipa-estrutura-integrada-'));
 const destino=path.join(base,'integrado');
 await prepararIntegrado(destino);
 for(const folder of ['dev','tests','.entrega-aluno','.instrutor-local','.git'])await assert.rejects(fs.access(path.join(destino,folder)));
 const config=await fs.readFile(path.join(destino,'shared/js/configuracao.js'),'utf8');
 assert.match(config,/DESENVOLVIMENTO_LOCAL_HABILITADO = false/);
 const {desenvolvimentoAtivo}=await import(pathToFileURL(path.join(destino,'shared/js/ambiente.js')).href);
 for(const url of ['http://localhost/login.html?ambiente=local','http://127.0.0.1/login.html?dev=true','https://sipa.example/login.html?ambiente=local'])assert.equal(desenvolvimentoAtivo(url),false);
 await assert.rejects(prepararIntegrado(destino),/existe/);
 await assert.rejects(prepararIntegrado(root),/fora/);
 // Não altera a configuração ou os dados da cópia em desenvolvimento.
 assert.match(await fs.readFile(path.join(root,'shared/js/configuracao.js'),'utf8'),/DESENVOLVIMENTO_LOCAL_HABILITADO = false/);
});
