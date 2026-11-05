// Adaptadores do Aluno e do Instrutor com a API (contrato 3.1 e 3.2 do plano).
// fetch simulado: nada sai da máquina.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window={location:{hostname:'localhost',href:'http://localhost/aluno/html/agendamento.html'}};
const guardado=new Map();
globalThis.sessionStorage={getItem:k=>guardado.get(k)??null,setItem:(k,v)=>guardado.set(k,String(v)),removeItem:k=>guardado.delete(k)};
const chamadas=[];let respostas=[];
globalThis.fetch=async(url,init={})=>{
 chamadas.push({url:String(url),metodo:init.method,cabecalhos:init.headers||{},corpo:init.body});
 const r=respostas.find(x=>x.quando(String(url),init.method));
 if(!r)return new Response('',{status:404});
 return new Response(r.corpo===undefined?null:JSON.stringify(r.corpo),{status:r.status??200});
};
const rota=(metodo,trecho,corpo,status)=>({quando:(u,m)=>m===metodo&&u.includes(trecho),corpo,status});
const {adaptarDadosAluno,adaptarAcompanhamento,textoSituacao,criarServicoAluno,adaptarPropostaAutomatica,adaptarPreferenciasAutomaticas,corpoPreferenciasAutomaticas}=await import('../aluno/js/services/alunoIntegrado.js');
const {adaptarAulaInstrutor,criarServicoInstrutor}=await import('../instrutor/js/services/instrutorIntegrado.js');
const {urlLogin}=await import('../shared/js/sessao.js');

const aulaApi=(extra={})=>({id:'a1',alunoId:'al1',alunoNome:'Ana',motoristaId:'m1',motoristaNome:'Instrutor Um',veiculoId:'v1',veiculoModelo:'Onix',veiculoPlaca:'ABC1D23',categoria:{valor:2,descricao:'B'},status:{valor:1,descricao:'Confirmada'},dataHoraInicio:'2026-11-03T09:00:00',dataHoraFim:'2026-11-03T09:50:00',unidade:'Cobilândia',...extra});
const alunoApi={id:'al1',nome:'Ana',cpf:'52998224725',aulasContratadas:12,aulasRealizadas:2,percentualProgresso:16,
 matriculas:[{unidadeBase:{id:'u1',nome:'Cobilândia'},unidadeCarro:null,tipoCambio:{valor:1,descricao:'Manual'}}],
 saldos:[{categoria:{valor:2,descricao:'B'},contratadas:10,disponiveis:7,agendadas:1,realizadas:2,faltas:0,retidas:0},{categoria:{valor:3,descricao:'D'},contratadas:2,disponiveis:2,agendadas:0,realizadas:0}]};

test('aluno: saldo por categoria (D = 3), hora de Brasília e status 7 como cancelada com crédito retido',()=>{
 const d=adaptarDadosAluno(alunoApi,[],[aulaApi(),aulaApi({id:'a2',status:{valor:7}})]);
 assert.deepEqual(d.categorias,['B','D']);
 assert.equal(d.resumo.categorias.B.disponiveis,7);assert.equal(d.resumo.categorias.D.total,2);assert.equal(d.resumo.categorias.A.total,0);
 assert.equal(d.aluno.tipoCambio,'manual');assert.equal(d.aluno.unidade,'Cobilândia');
 const [a1,a2]=d.aulas;
 assert.equal(a1.inicio,'2026-11-03T09:00:00-03:00');assert.equal(a1.fim,'2026-11-03T09:50:00-03:00');assert.equal(a1.categoria,'B');
 assert.equal(a2.status,2);assert.equal(a2.statusApi,7);assert.equal(a2.cancelamento.credito,'retido');
 assert.equal(d.registros.find(r=>r.id==='v1').documento,'ABC1D23');
});

test('aluno: acompanhamento mostra o texto da situação e lista as provas das categorias, mesmo sem tentativa',()=>{
 assert.equal(textoSituacao({descricao:'Aprovado',valor:2}),'Aprovado');assert.equal(textoSituacao(null),'Não informado');assert.equal(textoSituacao('Vencido'),'Vencido');
 const api={exames:[{tipo:'toxicologico',nome:'Toxicológico',situacao:{descricao:'Aprovado',valor:2},data:'2026-10-01',validade:'2027-10-01'},{tipo:'medico',nome:'Exame médico',situacao:null,data:null,validade:null}],
  provas:[{tipo:'teorica',nome:'Prova teórica',tentativas:[{id:'t1',ordem:1,data:'2026-11-10',situacao:{descricao:'Agendado',valor:2},resultado:null}]}],processo:[]};
 const a=adaptarAcompanhamento(api,['B']);
 assert.deepEqual(a.exames.map(e=>e.situacao),['Aprovado','Não informado']);assert.equal(a.exames[1].validade,'');
 assert.deepEqual(a.provas.map(p=>p.tipo),['teorica','praticaCarro']);
 assert.equal(a.provas[0].tentativas[0].situacao,'Agendado');assert.equal(a.provas[0].tentativas[0].resultado,null);assert.deepEqual(a.provas[1].tentativas,[]);
 assert.equal(adaptarAcompanhamento(null),null);
 assert.equal(adaptarDadosAluno(alunoApi,[],[],{acompanhamento:api}).acompanhamento.provas.length,3,'B e D: teórica e as duas práticas');
});

test('aluno: horários viram pares instrutor × veículo; reserva manda Idempotency-Key; cancelamento manda o motivo 1-7',async()=>{
 respostas=[
  rota('GET','horarios-disponiveis',{data:'2026-11-03',fechado:false,horarios:[{horario:'09:00',dataHoraInicio:'2026-11-03T09:00:00',dataHoraFim:'2026-11-03T09:50:00',disponivel:true,motoristas:[{motoristaId:'m1',nome:'Instrutor Um',veiculos:[{veiculoId:'v1',modelo:'Onix',placa:'ABC1D23'}]}]},{horario:'10:00',dataHoraInicio:'2026-11-03T10:00:00',dataHoraFim:'2026-11-03T10:50:00',disponivel:false,motoristas:[]}]}),
  rota('POST','/agendamentos/a1/cancelar',{},200),
  rota('POST','/api/agendamentos',{ids:['a1']},201),
  rota('GET','alunos/me/mensagens',[]),rota('GET','alunos/me/acompanhamento',null),
  rota('GET','alunos/me',alunoApi),rota('GET','contratacoes',[]),rota('GET','/api/agendamentos?',[aulaApi()])];
 const s=criarServicoAluno();
 const c=await s.consultarRecursosLocal({categoria:'B',data:'2026-11-03'});
 assert.deepEqual(c.horarios.map(h=>[h.hora,h.fim,h.pares]),[['09:00','09:50',[{instrutorId:'m1',veiculoId:'v1'}]]]);
 assert.match(chamadas.at(-1).url,/categoria=2&data=2026-11-03&incluirMotoristas=true/);
 chamadas.length=0;
 const salvas=await s.reservarAulasLocais({categoria:'B',operacaoId:'op-1',aulas:[{data:'2026-11-03',hora:'09:00',instrutorId:'m1',veiculoId:'v1'}]});
 const post=chamadas.find(x=>x.metodo==='POST');
 assert.equal(post.cabecalhos['Idempotency-Key'],'op-1');
 assert.deepEqual(JSON.parse(post.corpo),{categoria:2,aulas:[{dataHoraInicio:'2026-11-03T09:00:00',categoria:2,motoristaId:'m1',veiculoId:'v1'}]});
 assert.equal(salvas[0].id,'a1');
 chamadas.length=0;
 await s.cancelarReservaLocal('a1','Motivos de saúde',{aceitarConsequencias:true});
 const cancelar=chamadas.find(x=>x.url.includes('/cancelar'));
 assert.deepEqual(JSON.parse(cancelar.corpo),{motivoCancelamentoId:5,motivo:'Motivos de saúde',aceitarConsequencias:true});
 assert.ok(cancelar.cabecalhos['Idempotency-Key']);
});

test('aluno: horário ocupado vira slot com interesse; passado e aula própria saem; marcar e desmarcar usam as rotas novas',async()=>{
 respostas=[
  rota('GET','horarios-disponiveis',{data:'2026-11-03',fechado:false,horarios:[
   {horario:'08:00',dataHoraInicio:'2026-11-03T08:00:00',dataHoraFim:'2026-11-03T08:50:00',disponivel:false,motivo:'passado',motoristas:[]},
   {horario:'09:00',dataHoraInicio:'2026-11-03T09:00:00',dataHoraFim:'2026-11-03T09:50:00',disponivel:false,motivo:'ocupado',interesseId:'i1',motoristas:[]},
   {horario:'10:00',dataHoraInicio:'2026-11-03T10:00:00',dataHoraFim:'2026-11-03T10:50:00',disponivel:false,motivo:'alunoOcupado',motoristas:[]},
   {horario:'11:00',dataHoraInicio:'2026-11-03T11:00:00',dataHoraFim:'2026-11-03T11:50:00',disponivel:false,motivo:'ocupado',motoristas:[]}]}),
  rota('POST','alunos/me/interesses-antecipacao',{id:'i2',categoria:{valor:2,descricao:'B'},dataHoraInicio:'2026-11-03T11:00:00',situacao:{valor:1,descricao:'Aguardando'}},201),
  rota('DELETE','alunos/me/interesses-antecipacao/i1',undefined,204),
  rota('GET','alunos/me/interesses-antecipacao',[{id:'i1',categoria:{valor:2},dataHoraInicio:'2026-11-03T09:00:00',situacao:{valor:2,descricao:'Contatado'},unidade:{id:'u1',nome:'Cobilândia'}}])];
 const s=criarServicoAluno();assert.equal(s.capacidades.interesse,true);assert.equal(s.capacidades.antecipacao,undefined);
 const c=await s.consultarRecursosLocal({categoria:'B',data:'2026-11-03'});
 assert.deepEqual(c.horarios.map(h=>[h.hora,h.ocupado,h.interesseId,h.pares.length]),[['09:00',true,'i1',0],['11:00',true,null,0]]);
 assert.equal(c.mensagem,'Nenhum horário com instrutor e veículo livres nesta data.');
 chamadas.length=0;
 const novo=await s.marcarInteresse({categoria:'B',data:'2026-11-03',hora:'11:00'});
 const post=chamadas.find(x=>x.metodo==='POST');assert.deepEqual(JSON.parse(post.corpo),{categoria:2,dataHoraInicio:'2026-11-03T11:00:00'});assert.ok(post.cabecalhos['Idempotency-Key']);
 assert.deepEqual([novo.id,novo.hora,novo.situacao,novo.aberto],['i2','11:00','Aguardando',true]);
 await s.desmarcarInteresse('i1');assert.equal(chamadas.at(-1).metodo,'DELETE');assert.match(chamadas.at(-1).url,/alunos\/me\/interesses-antecipacao\/i1$/);
 const [i]=await s.listarInteresses();assert.deepEqual([i.id,i.data,i.hora,i.categoria,i.unidade,i.situacao,i.aberto],['i1','2026-11-03','09:00','B','Cobilândia','Em contato',true]);
 respostas=[rota('POST','alunos/me/interesses-antecipacao',{title:'Conflito',listErrors:[{mensagem:'Esse horário está livre: reserve direto.'}]},409)];
 await assert.rejects(s.marcarInteresse({categoria:'B',data:'2026-11-03',hora:'12:00'}),/reserve direto/);
});

test('aluno: agendamento automático (F13) com preferências salvas, proposta sem reserva e confirmação pelo POST agendamentos',async()=>{
 const m1='11111111-1111-4111-8111-111111111111',v1='22222222-2222-4222-8222-222222222222',u1='33333333-3333-4333-8333-333333333333';
 const salvas={categoria:{valor:2,descricao:'B'},unidades:[u1],dias:[1,3],horarios:['09:00'],instrutores:[m1],veiculos:[],quantidade:2,atualizadoEm:'2026-11-01T12:00:00Z'};
 assert.deepEqual(adaptarPreferenciasAutomaticas(salvas),{categoria:'B',unidades:[u1],dias:[1,3],horarios:['09:00'],instrutores:[m1],veiculos:[],quantidade:2,atualizadoEm:'2026-11-01T12:00:00Z'});
 assert.equal(adaptarPreferenciasAutomaticas(null),null);
 assert.equal(adaptarDadosAluno({...alunoApi,preferenciasAutomaticas:salvas},[],[]).aluno.preferenciasAutomaticas.categoria,'B');
 assert.deepEqual(corpoPreferenciasAutomaticas({categoria:'B',unidades:['Cobilândia'],dias:[1,'3',3],horarios:['09:00','10:00'],instrutores:[m1,'instrutor-local'],veiculos:[],quantidade:'2'}),
  {categoria:2,unidades:[],dias:[1,3],horarios:['09:00','10:00'],instrutores:[m1],veiculos:[],quantidade:2},'unidade por nome vira vazia (a da categoria) e id local sai');
 const propostaApi={categoria:{valor:2,descricao:'B'},solicitadas:2,horizonteDias:90,aulas:[{data:'2026-11-09',hora:'09:00',dataHoraInicio:'2026-11-09T09:00:00',dataHoraFim:'2026-11-09T09:50:00',unidadeId:null,motoristaId:m1,motorista:'Instrutor Um',veiculoId:v1,veiculo:'Onix',placa:'ABC1D23'}]};
 const p=adaptarPropostaAutomatica(propostaApi,{unidade:'Cobilândia',unidadeCarro:null});
 assert.deepEqual([p.categoria,p.solicitadas,p.horizonteDias,p.aulas.length],['B',2,90,1]);
 assert.deepEqual(p.aulas[0],{data:'2026-11-09',hora:'09:00',inicio:'2026-11-09T09:00:00-03:00',fim:'2026-11-09T09:50:00-03:00',unidadeId:null,unidade:'Cobilândia',instrutorId:m1,veiculoId:v1,instrutor:'Instrutor Um',veiculo:'Onix · ABC1D23',placa:'ABC1D23'});
 assert.equal(adaptarPropostaAutomatica({categoria:{valor:3},aulas:[]},{}).categoria,'D');
 respostas=[rota('PUT','alunos/me/preferencias-automaticas',undefined,204),rota('POST','agendamentos/automatico',propostaApi),
  rota('GET','alunos/me/mensagens',[]),rota('GET','alunos/me/acompanhamento',null),
  rota('GET','alunos/me',{...alunoApi,preferenciasAutomaticas:salvas}),rota('GET','contratacoes',[]),rota('GET','/api/agendamentos?',[aulaApi({motoristaId:m1,veiculoId:v1})])];
 const s=criarServicoAluno();assert.equal(s.capacidades.automatico,true);
 chamadas.length=0;
 await s.salvarPreferenciasAutomaticas({categoria:'B',unidades:['Cobilândia'],dias:[1],horarios:['09:00'],instrutores:[m1],veiculos:[],quantidade:2});
 const put=chamadas.find(x=>x.metodo==='PUT');assert.ok(put.url.endsWith('/alunos/me/preferencias-automaticas'));
 assert.deepEqual(JSON.parse(put.corpo),{categoria:2,unidades:[],dias:[1],horarios:['09:00'],instrutores:[m1],veiculos:[],quantidade:2});
 chamadas.length=0;
 const proposta=await s.buscarAgendamentoAutomatico({categoria:'B',unidades:[],dias:[1],horarios:['09:00'],instrutores:[],veiculos:[],quantidade:2});
 assert.ok(chamadas.some(x=>x.metodo==='POST'&&x.url.endsWith('/agendamentos/automatico')));
 assert.ok(!chamadas.some(x=>x.metodo==='POST'&&x.url.endsWith('/api/agendamentos')),'proposta não reserva');
 assert.equal(proposta.aulas[0].instrutorId,m1);
 assert.deepEqual(s.recursosAutomaticos('B').map(r=>r.tipo+':'+r.id).sort(),['instrutor:'+m1,'veiculo:'+v1]);
 assert.deepEqual(s.recursosAutomaticos('A'),[]);
});

test('aluno: 400 na consulta de horários vira motivo de elegibilidade, sem quebrar a tela',async()=>{
 respostas=[rota('GET','horarios-disponiveis',{title:'Erro de validação.',listErrors:[{campo:'categoria',mensagem:'Sem saldo nesta categoria.'}]},400)];
 const c=await criarServicoAluno().consultarRecursosLocal({categoria:'A',data:'2026-11-03'});
 assert.equal(c.permiteAgendar,false);assert.equal(c.motivoElegibilidade,'Sem saldo nesta categoria.');
});

test('instrutor: aula e histórico da API; sem a rota nova usa a lista geral; presença vai para marcar-realizada',async()=>{
 const a=adaptarAulaInstrutor(aulaApi({status:{valor:7},historico:[{quando:'2026-11-01T12:00:00Z',tipo:{valor:1,descricao:'Solicitado'}},{quando:'2026-11-02T12:00:00Z',tipo:{valor:5,descricao:'Cancelado'}}]}));
 assert.equal(a.status,2);assert.equal(a.aluno.nome,'Ana');assert.equal(a.instrutorId,'m1');
 assert.deepEqual(a.historico.map(e=>[e.status,e.descricao]),[[undefined,'Solicitado'],[2,'Cancelado']]);
 respostas=[rota('POST','marcar-realizada',undefined,204),rota('GET','motoristas/me/aulas',undefined,404),rota('GET','motoristas/me/agenda',undefined,404),
  rota('GET','motoristas/me',{id:'m1',nome:'Instrutor Um',categorias:[{valor:2}],cnhVencida:false,credenciamentoVencido:false}),rota('GET','veiculos',[{id:'v1',modelo:'Onix',placa:'ABC1D23',categoria:{valor:2}}]),rota('GET','/api/agendamentos?',[aulaApi()])];
 chamadas.length=0;
 const s=criarServicoInstrutor(),d=await s.dados();
 assert.equal(d.instrutor.ativo,true);assert.deepEqual(d.instrutor.categorias,['B']);assert.equal(d.veiculo.placa,'ABC1D23');assert.equal(d.aulas.length,1);
 assert.ok(chamadas.some(x=>x.url.includes('/api/agendamentos?')));
 const agenda=await s.agendaHoje();assert.ok(Array.isArray(agenda.faixas));
 await s.registrar('a1',5);assert.ok(chamadas.some(x=>x.metodo==='POST'&&x.url.endsWith('/agendamentos/a1/marcar-realizada')));
 await assert.rejects(s.registrar('a1',2),/não permitida/);
});

test('M1: login relativo ao app, não à raiz do domínio',()=>{
 assert.match(urlLogin(),/\/login\.html$/);assert.doesNotMatch(urlLogin(),/^\/login/);
 assert.match(urlLogin('sessao=expirada'),/login\.html\?sessao=expirada$/);
});
