// Antecipação por interesse na Recepção: adaptador com a API (horários liberados, total e ações).
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
 return new Response(r.corpo===undefined?null:JSON.stringify(r.corpo),{status:r.status??200});
};
const rota=(metodo,trecho,corpo,status)=>({quando:(u,m)=>m===metodo&&u.includes(trecho),corpo,status});
const {criarServicoAdministrativoIntegrado,mapaUnidades}=await import('../shared/js/services/administracaoIntegrada.js');
const {permissoesDoPerfil}=await import('../shared/js/permissoesAdministrativas.js');
const {antecipacaoLocal}=await import('../dev/operador/antecipacaoLocal.js');

const UNIDADES=[{id:'g-cobi',nome:'Cobilândia'},{id:'g-centro',nome:'Centro de Vila Velha'}];
const recepcao=(extra={})=>({id:'eq1',nome:'Recepção',perfil:'operador',nivel:1,unidade:'Cobilândia',unidades:['Cobilândia'],permissoes:permissoesDoPerfil('operador'),...extra});
// Formato do HorarioLiberadoReadDto da API (InteressesAntecipacaoDtos.cs).
const liberado={unidadeId:'g-cobi',unidade:'Cobilândia',categoria:{valor:2,descricao:'B'},dataHoraInicio:'2026-11-10T09:00:00',dataHoraFim:'2026-11-10T09:50:00',prazoHorasUteis:48,
 pares:[{motoristaId:'m1',instrutor:'Instrutor Um',veiculoId:'v1',modelo:'Onix',placa:'ABC1D23'}],
 interessados:[
  {interesseId:'i1',alunoId:'al1',nome:'Ana Souza',telefone:'27999990000',situacao:{valor:1,descricao:'Aguardando'},marcadoEm:'2026-11-04T12:00:00Z',contatadoEm:null,observacao:null,
   aulas:[{id:'a1',dataHoraInicio:'2026-11-20T10:00:00',dataHoraFim:'2026-11-20T10:50:00',horasUteis:96,dentroPrazo:true},{id:'a0',dataHoraInicio:'2026-11-11T08:00:00',dataHoraFim:'2026-11-11T08:50:00',horasUteis:20,dentroPrazo:false}]},
  {interesseId:'i2',alunoId:'al2',nome:'Bruno Lima',telefone:'27988880000',situacao:{valor:2,descricao:'Contatado'},marcadoEm:'2026-11-04T12:30:00Z',contatadoEm:'2026-11-04T13:00:00Z',observacao:'Ligar à tarde',aulas:[]}]};

test('Recepção: horários liberados vêm agrupados, com pares, interessados na ordem e aulas com prazo',async()=>{
 respostas=[rota('GET','antecipacoes/horarios-liberados?',[liberado])];chamadas.length=0;
 const s=criarServicoAdministrativoIntegrado(recepcao(),mapaUnidades(UNIDADES));
 const [h]=await s.consultarLiberados({unidade:'Cobilândia',categoria:'B',de:'2026-11-04',ate:'2026-11-18'});
 assert.match(chamadas.at(-1).url,/horarios-liberados\?unidadeId=g-cobi&categoria=2&de=2026-11-04&ate=2026-11-18$/);
 assert.deepEqual([h.unidade,h.unidadeNome,h.categoria,h.data,h.inicio,h.fim,h.prazo],['Cobilândia','Cobilândia','B','2026-11-10','09:00','09:50',48]);
 assert.deepEqual(h.pares,[{instrutorId:'m1',veiculoId:'v1',instrutor:'Instrutor Um',veiculo:'Onix · ABC1D23'}]);
 assert.deepEqual(h.interessados.map(i=>[i.id,i.alunoId,i.aluno,i.situacao]),[['i1','al1','Ana Souza','Aguardando'],['i2','al2','Bruno Lima','Contatado']]);
 assert.deepEqual(h.interessados[0].aulas.map(a=>[a.id,a.data,a.inicio,a.horasUteis,a.dentroPrazo]),[['a1','2026-11-20','10:00',96,true],['a0','2026-11-11','08:00',20,false]]);
 assert.equal(h.interessados[1].observacao,'Ligar à tarde');
 await assert.rejects(s.consultarLiberados({unidade:'Vila Velha'}),/Unidade não autorizada/);
});

test('Recepção: total do aviso aceita número ou objeto; sem a rota no servidor fica zero',async()=>{
 const s=criarServicoAdministrativoIntegrado(recepcao(),mapaUnidades(UNIDADES));
 respostas=[rota('GET','horarios-liberados/total',3)];assert.equal(await s.totalLiberados(),3);
 respostas=[rota('GET','horarios-liberados/total',{total:2})];assert.equal(await s.totalLiberados(),2);
 respostas=[];assert.equal(await s.totalLiberados(),0);
});

test('Recepção: contato, remarcação com chave e descarte vão para as rotas do interesse',async()=>{
 respostas=[rota('POST','/contato',undefined,204),rota('POST','/remarcacao',{id:'n1'},201),rota('POST','/descarte',undefined,204)];chamadas.length=0;
 const s=criarServicoAdministrativoIntegrado(recepcao(),mapaUnidades(UNIDADES));
 await s.marcarContatado('i1','  Ligar à tarde ');
 await s.remarcarInteresse('i1',{aulaId:'a1',instrutorId:'m1',veiculoId:'v1'},'chave-1');
 await s.descartarInteresse('i2','');
 const [contato,remarcacao,descarte]=chamadas;
 assert.match(contato.url,/antecipacoes\/interesses\/i1\/contato$/);assert.deepEqual(JSON.parse(contato.corpo),{observacao:'Ligar à tarde'});
 assert.match(remarcacao.url,/antecipacoes\/interesses\/i1\/remarcacao$/);assert.deepEqual(JSON.parse(remarcacao.corpo),{agendamentoAnteriorId:'a1',motoristaId:'m1',veiculoId:'v1'});assert.equal(remarcacao.cabecalhos['Idempotency-Key'],'chave-1');
 assert.match(descarte.url,/antecipacoes\/interesses\/i2\/descarte$/);assert.deepEqual(JSON.parse(descarte.corpo),{observacao:null});
 await assert.rejects(s.remarcarInteresse('i1',{aulaId:'a1'},'chave-2'),/Escolha a aula/);
 await assert.rejects(s.marcarContatado('i1','x'.repeat(501)),/500 caracteres/);
 respostas=[rota('POST','/remarcacao',{title:'Conflito',listErrors:[{mensagem:'Esse horário não está mais livre.'}]},409)];
 await assert.rejects(s.remarcarInteresse('i1',{aulaId:'a1',instrutorId:'m1',veiculoId:'v1'},'chave-3'),/não está mais livre/);
});

test('antecipação exige a capacidade antecipar; a demonstração abre com a lista vazia',async()=>{
 const sem=criarServicoAdministrativoIntegrado(recepcao({permissoes:permissoesDoPerfil('operador').filter(p=>p!=='antecipar')}),mapaUnidades(UNIDADES));
 chamadas.length=0;
 for(const p of [sem.consultarLiberados({}),sem.totalLiberados(),sem.marcarContatado('i1',''),sem.remarcarInteresse('i1',{aulaId:'a',instrutorId:'m',veiculoId:'v'},'k'),sem.descartarInteresse('i1','')])await assert.rejects(p,/Permissão insuficiente/);
 assert.equal(chamadas.length,0);
 const local=antecipacaoLocal(recepcao());assert.deepEqual(await local.consultarLiberados({}),[]);assert.equal(await local.totalLiberados(),0);
 await assert.rejects(local.remarcarInteresse('i1',{},'k'),/ambiente integrado/);
});
