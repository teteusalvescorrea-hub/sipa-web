// Conversa com o aluno na Recepção e na Gerência: adaptador com a API (caixa, conversa, leitura, envio e iniciar pela ficha).
// fetch simulado: nada sai da máquina.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window={location:{hostname:'localhost',href:'http://localhost/nivel-1-operador/html/operador-cfc.html'}};
const guardado=new Map();
globalThis.sessionStorage={getItem:k=>guardado.get(k)??null,setItem:(k,v)=>guardado.set(k,String(v)),removeItem:k=>guardado.delete(k)};
const chamadas=[];let respostas=[];
globalThis.fetch=async(url,init={})=>{
 chamadas.push({url:decodeURIComponent(String(url)),metodo:init.method,cabecalhos:init.headers||{},corpo:init.body});
 const r=respostas.find(x=>x.quando(decodeURIComponent(String(url)),init.method));
 if(!r)return new Response('',{status:404});
 return new Response(r.corpo===undefined?null:JSON.stringify(r.corpo),{status:r.status??200,headers:r.total===undefined?{}:{'X-Total-Count':String(r.total)}});
};
const rota=(metodo,trecho,corpo,status,total)=>({quando:(u,m)=>m===metodo&&u.includes(trecho),corpo,status,total});
const {criarServicoAdministrativoIntegrado,mapaUnidades,capacidadesDoMembro}=await import('../shared/js/services/administracaoIntegrada.js');
const {permissoesDoPerfil}=await import('../shared/js/permissoesAdministrativas.js');
const {mensagensLocal}=await import('../dev/operador/mensagensLocal.js');

const UNIDADES=[{id:'g-cobi',nome:'Cobilândia'},{id:'g-centro',nome:'Centro de Vila Velha'}];
const recepcao=(extra={})=>({id:'eq1',nome:'Recepção',perfil:'operador',nivel:1,unidade:'Cobilândia',unidades:['Cobilândia'],permissoes:permissoesDoPerfil('operador'),...extra});
// Formato do ConversaEquipeReadDto e do MensagemConversaReadDto da API (ConversasDtos.cs).
const item={id:'c1',alunoId:'al1',aluno:'Ana Souza',unidadeId:'g-cobi',unidade:'Cobilândia',ultimaMensagemEm:'2026-11-04T10:15:00',ultimaMensagem:'Posso trocar o horário?',ultimaDoAluno:true,naoLida:true,podeResponder:true};
const mensagem={id:'m1',texto:'Posso trocar o horário?',em:'2026-11-04T10:15:00',daEquipe:false,remetente:'Ana Souza',autor:null};
const resposta={id:'m2',texto:'Pode sim.',em:'2026-11-04T10:20:00',daEquipe:true,remetente:'Recepção',autor:'Carla'};

test('Recepção e Gerência têm as capacidades da conversa; sem equipe/me.capacidades vêm da tela Alunos',()=>{
 for(const p of ['operador','gerencia','master'])for(const c of ['mensagens','responder-mensagem'])assert.ok(permissoesDoPerfil(p).includes(c),p+' '+c);
 const so=le=>({telas:[{alias:'alunos',le,atualiza:false}]});
 assert.deepEqual(capacidadesDoMembro(so(true),'operador').filter(c=>c.includes('mensage')),['mensagens']);
 assert.deepEqual(capacidadesDoMembro({telas:[{alias:'alunos',le:true,atualiza:true}]},'operador').filter(c=>c.includes('mensage')),['mensagens','responder-mensagem']);
});

test('caixa: filtros na query, total do X-Total-Count e item no formato da tela',async()=>{
 respostas=[rota('GET','/conversas?',[item],200,7)];chamadas.length=0;
 const s=criarServicoAdministrativoIntegrado(recepcao(),mapaUnidades(UNIDADES));
 const r=await s.conversas({unidade:'Cobilândia',busca:'  ana ',somenteNaoLidas:true,pagina:2,tamanho:20});
 assert.match(chamadas.at(-1).url,/\/conversas\?unidadeId=g-cobi&busca=ana&somenteNaoLidas=true&pagina=2&tamanho=20$/);
 assert.equal(r.total,7);
 assert.deepEqual(r.itens[0],{id:'c1',alunoId:'al1',aluno:'Ana Souza',unidadeId:'g-cobi',unidade:'Cobilândia',unidadeNome:'Cobilândia',ultimaMensagemEm:'2026-11-04T10:15:00-03:00',ultimaMensagem:'Posso trocar o horário?',ultimaDoAluno:true,naoLida:true,podeResponder:true});
 await s.conversas({});assert.match(chamadas.at(-1).url,/\/conversas\?pagina=1&tamanho=20$/);
 await assert.rejects(s.conversas({unidade:'Vila Velha'}),/Unidade não autorizada/);
 respostas=[rota('GET','/conversas?',[item,item])];assert.equal((await s.conversas({})).total,2);
});

test('conversa aberta, leitura, total e resposta com Idempotency-Key',async()=>{
 respostas=[rota('GET','/conversas/c1?',{conversa:item,mensagens:[mensagem,resposta]}),rota('POST','/conversas/c1/leitura',undefined,204),rota('GET','conversas/nao-lidas',{total:3}),rota('POST','/conversas/c1/mensagens',resposta,201)];chamadas.length=0;
 const s=criarServicoAdministrativoIntegrado(recepcao(),mapaUnidades(UNIDADES));
 const c=await s.conversa('c1');
 assert.match(chamadas.at(-1).url,/\/conversas\/c1\?tamanho=100$/);
 assert.equal(c.conversa.aluno,'Ana Souza');
 assert.deepEqual(c.mensagens.map(m=>[m.id,m.daEquipe,m.remetente,m.autor,m.em]),[['m1',false,'Ana Souza',null,'2026-11-04T10:15:00-03:00'],['m2',true,'Recepção','Carla','2026-11-04T10:20:00-03:00']]);
 await s.marcarConversaLida('c1');assert.equal(chamadas.at(-1).metodo,'POST');assert.match(chamadas.at(-1).url,/\/conversas\/c1\/leitura$/);
 assert.equal(await s.totalMensagensNaoLidas(),3);
 const m=await s.enviarMensagemConversa('c1','  Pode sim. ','chave-1');
 const envio=chamadas.at(-1);assert.match(envio.url,/\/conversas\/c1\/mensagens$/);assert.deepEqual(JSON.parse(envio.corpo),{texto:'Pode sim.'});assert.equal(envio.cabecalhos['Idempotency-Key'],'chave-1');assert.equal(m.id,'m2');
 const antes=chamadas.length;
 await assert.rejects(s.enviarMensagemConversa('c1','   ','k'),/entre 1 e 2000/);
 await assert.rejects(s.enviarMensagemConversa('c1','x'.repeat(2001),'k'),/entre 1 e 2000/);
 assert.equal(chamadas.length,antes);
 respostas=[rota('POST','/conversas/c1/mensagens',{title:'Conflito',listErrors:[{mensagem:'Muitas mensagens seguidas. Aguarde um minuto.'}]},409)];
 await assert.rejects(s.enviarMensagemConversa('c1','Oi','k2'),/Aguarde um minuto/);
 respostas=[];assert.equal(await s.totalMensagensNaoLidas(),0);
});

test('iniciar pela ficha: rota do aluno, chave e conversa devolvida',async()=>{
 respostas=[rota('POST','alunos/al1/conversa/mensagens',{conversaId:'c9',mensagem:resposta},201)];chamadas.length=0;
 const s=criarServicoAdministrativoIntegrado(recepcao(),mapaUnidades(UNIDADES));
 const r=await s.enviarMensagemAluno('al1','Olá, Ana.','chave-ficha');
 assert.match(chamadas[0].url,/\/alunos\/al1\/conversa\/mensagens$/);assert.deepEqual(JSON.parse(chamadas[0].corpo),{texto:'Olá, Ana.'});assert.equal(chamadas[0].cabecalhos['Idempotency-Key'],'chave-ficha');
 assert.equal(r.conversaId,'c9');assert.equal(r.mensagem.autor,'Carla');
});

test('sem as capacidades nada sai; a demonstração abre com a lista vazia',async()=>{
 const sem=criarServicoAdministrativoIntegrado(recepcao({permissoes:permissoesDoPerfil('operador').filter(p=>!['mensagens','responder-mensagem'].includes(p))}),mapaUnidades(UNIDADES));
 chamadas.length=0;
 for(const p of [sem.conversas({}),sem.conversa('c1'),sem.totalMensagensNaoLidas(),sem.marcarConversaLida('c1'),sem.enviarMensagemConversa('c1','Oi','k'),sem.enviarMensagemAluno('al1','Oi','k')])await assert.rejects(p,/Permissão insuficiente/);
 const soLeitura=criarServicoAdministrativoIntegrado(recepcao({permissoes:permissoesDoPerfil('operador').filter(p=>p!=='responder-mensagem')}),mapaUnidades(UNIDADES));
 await assert.rejects(soLeitura.enviarMensagemConversa('c1','Oi','k'),/Permissão insuficiente/);
 await assert.rejects(soLeitura.enviarMensagemAluno('al1','Oi','k'),/Permissão insuficiente/);
 assert.equal(chamadas.length,0);
 const local=mensagensLocal(recepcao());assert.deepEqual(await local.conversas({}),{itens:[],total:0});assert.equal(await local.totalMensagensNaoLidas(),0);
 await assert.rejects(local.enviarMensagemAluno('al1','Oi','k'),/ambiente integrado/);
 await assert.rejects(mensagensLocal(recepcao({permissoes:[]})).conversas({}),/Permissão insuficiente/);
});
