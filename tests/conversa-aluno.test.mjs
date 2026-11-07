// Conversa do aluno com a Recepção: adaptador com a API (lista, mensagens, envio com chave, leitura e o total do sino).
// fetch simulado: nada sai da máquina.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window={location:{hostname:'localhost',href:'http://localhost/aluno/html/mensagens.html'}};
const guardado=new Map();
globalThis.sessionStorage={getItem:k=>guardado.get(k)??null,setItem:(k,v)=>guardado.set(k,String(v)),removeItem:k=>guardado.delete(k)};
const chamadas=[];let respostas=[];
globalThis.fetch=async(url,init={})=>{
 chamadas.push({url:decodeURIComponent(String(url)),metodo:init.method,cabecalhos:init.headers||{},corpo:init.body});
 const r=respostas.find(x=>x.quando(decodeURIComponent(String(url)),init.method));
 if(!r)return new Response('',{status:404});
 return new Response(r.corpo===undefined?null:JSON.stringify(r.corpo),{status:r.status??200});
};
const rota=(metodo,trecho,corpo,status)=>({quando:(u,m)=>m===metodo&&u.includes(trecho),corpo,status});
const {criarServicoAluno,adaptarConversaAluno}=await import('../aluno/js/services/alunoIntegrado.js');

test('conversas do aluno: uma linha por autoescola, com não lidas e se pode enviar',async()=>{
 respostas=[rota('GET','alunos/me/conversas',[{autoescolaId:'ae1',autoescola:'Autoescola Centro',conversaId:'c1',ultimaMensagemEm:'2026-11-04T10:20:00',naoLidas:2,podeEnviar:true},{autoescolaId:'ae2',autoescola:'Antiga',conversaId:null,ultimaMensagemEm:null,naoLidas:0,podeEnviar:false}])];chamadas.length=0;
 const s=criarServicoAluno();assert.equal(s.capacidades.conversa,true);
 const lista=await s.conversas();
 assert.match(chamadas.at(-1).url,/\/alunos\/me\/conversas$/);
 assert.deepEqual(lista,[{autoescolaId:'ae1',autoescola:'Autoescola Centro',conversaId:'c1',ultimaMensagemEm:'2026-11-04T10:20:00-03:00',naoLidas:2,podeEnviar:true},{autoescolaId:'ae2',autoescola:'Antiga',conversaId:null,ultimaMensagemEm:null,naoLidas:0,podeEnviar:false}]);
 assert.equal(adaptarConversaAluno({autoescolaId:'x'}).podeEnviar,false);
});

test('mensagens em ordem, envio com Idempotency-Key e leitura nas rotas da autoescola',async()=>{
 respostas=[rota('GET','/mensagens?',[{id:'m1',texto:'Oi',em:'2026-11-04T10:15:00',daEquipe:false,remetente:'Ana Souza',autor:null},{id:'m2',texto:'Olá!',em:'2026-11-04T10:20:00',daEquipe:true,remetente:'Recepção',autor:null}]),
  rota('POST','/conversas/ae1/mensagens',{id:'m3',texto:'Obrigada',em:'2026-11-04T10:21:00',daEquipe:false,remetente:'Ana Souza',autor:null},201),rota('POST','/conversas/ae1/leitura',undefined,204)];chamadas.length=0;
 const s=criarServicoAluno();
 const ms=await s.mensagensConversa('ae1');
 assert.match(chamadas.at(-1).url,/\/alunos\/me\/conversas\/ae1\/mensagens\?tamanho=100$/);
 assert.deepEqual(ms.map(m=>[m.id,m.daEquipe,m.remetente,m.em]),[['m1',false,'Ana Souza','2026-11-04T10:15:00-03:00'],['m2',true,'Recepção','2026-11-04T10:20:00-03:00']]);
 const m=await s.enviarMensagemRecepcao('ae1','  Obrigada  ','chave-1');
 const envio=chamadas.at(-1);assert.equal(envio.metodo,'POST');assert.deepEqual(JSON.parse(envio.corpo),{texto:'Obrigada'});assert.equal(envio.cabecalhos['Idempotency-Key'],'chave-1');assert.equal(m.id,'m3');
 await s.enviarMensagemRecepcao('ae1','De novo');assert.ok(chamadas.at(-1).cabecalhos['Idempotency-Key']);
 await s.marcarConversaLida('ae1');assert.match(chamadas.at(-1).url,/\/alunos\/me\/conversas\/ae1\/leitura$/);
 const antes=chamadas.length;
 await assert.rejects(s.enviarMensagemRecepcao('ae1',' ','k'),/entre 1 e 2000/);
 await assert.rejects(s.enviarMensagemRecepcao('ae1','x'.repeat(2001),'k'),/entre 1 e 2000/);
 assert.equal(chamadas.length,antes);
 respostas=[rota('POST','/conversas/ae1/mensagens',{title:'Conflito',listErrors:[{mensagem:'Você não está matriculado nesta autoescola.'}]},409)];
 await assert.rejects(s.enviarMensagemRecepcao('ae1','Oi','k2'),/não está matriculado/);
});

test('sino conta somente avisos e não consulta conversas removidas da tela',async()=>{
 const s=criarServicoAluno();
 respostas=[rota('GET','alunos/me/mensagens/nao-lidas',{total:2}),rota('GET','alunos/me/conversas/nao-lidas',{total:3})];chamadas.length=0;
 assert.equal(await s.totalNaoLidas(),2);
 assert.deepEqual(chamadas.map(c=>c.url.replace(/^.*\/api\//,'')).sort(),['alunos/me/mensagens/nao-lidas']);
 respostas=[rota('GET','alunos/me/mensagens/nao-lidas',{total:1})];assert.equal(await s.totalNaoLidas(),1);
 respostas=[];assert.equal(await s.totalNaoLidas(),0);
});
