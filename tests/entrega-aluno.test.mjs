import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile,access} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const raiz=new URL('../',import.meta.url);
let adaptar;
test('adaptador respeita zero, saldo oficial, contrato compartilhado e pendente',async()=>{
 globalThis.window={location:{hostname:'localhost'}};
 try{({adaptarDadosAluno:adaptar}=await import('../js/modules/essencial/service/alunoIntegrado.js'));}finally{delete globalThis.window;}
 const aluno={id:'teste-isolado',aulasContratadas:13,aulasRealizadas:0,aulasAgendadas:1,aulasRestantes:12,percentualProgresso:0};
 const contrato={status:{valor:2},categorias:[{valor:2}],quantidadeAulas:13,aulasRealizadas:0,aulasAgendadas:1,aulasRestantes:12};
 let dados=adaptar(aluno,[contrato],[]);assert.equal(dados.resumo.categorias.A.disponiveis,0);assert.equal(dados.resumo.categorias.B.disponiveis,12);
 dados=adaptar(aluno,[{...contrato,categorias:[{valor:1},{valor:2}]}],[]);assert.equal(dados.resumo.categorias.A.disponiveis,null);assert.equal(dados.resumo.categorias.B.disponiveis,null);assert.equal(dados.resumo.total,13);
 dados=adaptar(aluno,[{...contrato,status:{valor:1}}],[]);assert.equal(dados.resumo.categorias.B.total,0);
});
test('grafo integrado tem imports válidos e nenhum serviço de laboratório',async()=>{
 const visitados=new Set();
 async function visitar(url){if(visitados.has(url.href))return;visitados.add(url.href);const fonte=await readFile(url,'utf8');assert.ok(!/authLocal\.js|painelLocal\.js|17825035798|654321|criarRecursosFicticios/.test(fonte),url.href);for(const m of fonte.matchAll(/(?:from\s*|import\s*\(\s*)["'](\.[^"']+)["']/g)){const filho=new URL(m[1],url);await access(filho);await visitar(filho);}}
 await visitar(new URL('js/aluno.js',raiz));await visitar(new URL('js/login.js',raiz));assert.ok(visitados.size>15);
});
test('seis páginas usam entrada integrada e não importam laboratório',async()=>{
 for(const p of ['dashboard','agendamento','minhas-aulas','meu-progresso','pacotes','meu-perfil']){const s=await readFile(new URL(p+'.html',raiz),'utf8');assert.ok(s.includes('src="js/aluno.js"'));assert.ok(!/prepararPaginaLocal|authLocal|painelLocal/.test(s));}
});
