import test from 'node:test';
import assert from 'node:assert/strict';
import {localCategoriaD,localDaReservaCategoriaD,LOCAIS_ONIBUS,motivoAlmoco,MATRICULAS} from '../shared/js/categorias.js';
import {validarHorario,GRADE_CENTRO,fimDaAula} from '../shared/js/disponibilidade.js';
import {calcularHorariosLocais} from '../dev/aluno/authLocal.js';
import {cadastrarAluno,cadastrarRecurso,paresNaUnidade,agendarAula,resumoAulasAluno,ETAPAS,consultarAgenda,consultarRecursos} from '../nivel-1-operador/js/dominioOperador.js';
import {movimentarProva,linhaTempoAluno} from '../nivel-1-operador/js/fichaOperador.js';
import {agendaDeHoje} from '../instrutor/js/agenda.js';
import {registrarSituacao} from '../instrutor/js/dominio.js';
import {resumirCreditos} from '../aluno/js/domain/dominioAluno.js';
import {calcularPrazoCancelamento,horariosAntecipacao,normalizarDisponibilidadeAntecipacao,parAutomaticoCategoriaD} from '../aluno/js/domain/agendamentoAluno.js';
import {criarDadosDemo} from '../dev/operador/dadosDemo.js';
import {repositorioDemo} from '../dev/operador/repositorioDemo.js';
const op={id:'op',nivel:1,unidade:'Cobilândia',permissoes:['consultar','cadastrar','anotar','verificar','cadastrar-recurso','agendar','cancelar-prova']},agora=new Date('2026-10-19T06:00:00-03:00');
test('atribuição automática usa somente o par único consultado para D, sem alterar A/B nem recursos',()=>{
 const p={instrutorId:'instrutor-existente',veiculoId:'onibus-existente'},outro={instrutorId:'outro-instrutor',veiculoId:'outro-onibus'},pares=[p],antes=structuredClone(pares);
 assert.deepEqual(parAutomaticoCategoriaD('D',pares),p);assert.notEqual(parAutomaticoCategoriaD('D',pares),p);assert.deepEqual(pares,antes);
 assert.deepEqual(parAutomaticoCategoriaD('D',[p,p]),p);
 for(const valores of [[],null,[null,{}],[p,outro],[p,{...p,veiculoId:'segundo-onibus'}]])assert.equal(parAutomaticoCategoriaD('D',valores),null);
 for(const categoria of ['A','B','AB'])assert.equal(parAutomaticoCategoriaD(categoria,[p]),null);
});
function fixture(){const e=criarDadosDemo();e.alunos=[{...e.alunos[0],id:'s',categoria:'D',unidade:'Cobilândia',unidadePrincipal:'Cobilândia',aulasAdquiridas:{D:8},creditos:{D:{disponiveis:6}},financeiro:'Regular',etapas:Object.fromEntries(Object.keys(ETAPAS).map(k=>[k,{status:'Aprovado'}]))}];e.aulas=[];e.recursos=[{id:'i',tipo:'Instrutores',nome:'Instrutor de teste',unidade:'Cobilândia',categorias:['D'],ativo:true,horarioAlmoco:'12-13'},{id:'v',tipo:'Veículos',nome:'Ônibus de teste',placa:'TST0D01',unidade:'Cobilândia',categoria:'D',ativo:true}];return e;}
test('locais oficiais nos seis dias, domingo fechado, Tartarugão não é unidade',()=>{
 assert.deepEqual(MATRICULAS,['A','B','D','AB']);for(const d of ['19','20','21','22','23'])assert.equal(localCategoriaD('2026-10-'+d).nome,'KM Cobilândia');
 const sabado=localCategoriaD('2026-10-24');assert.equal(sabado.nome,LOCAIS_ONIBUS.sabado.nome);assert.equal(sabado.unidadeAdministrativa,'Cobilândia');assert.equal(sabado.latitude,-20.3621362);assert.equal(sabado.longitude,-40.3048018);assert.match(sabado.mapsUrl,/!3d-20\.3621362!4d-40\.3048018/);assert.doesNotMatch(sabado.mapsUrl,/search|Itaperuna/);assert.match(localCategoriaD('2026-10-19').endereco,/Jacinto Admiral, 125/);assert.equal(localCategoriaD('2026-10-25'),null);
});
test('cadastro D separado com creditos imediatos, combos não autorizados rejeitados, dados preservados',()=>{
 const e=fixture(),dados={nome:'Aluno Ônibus Teste',cpf:'93541134780',nascimento:'2000-01-01',telefone:'27999999999',email:'d@example.invalid',categoria:'D',quantidadeOnibus:'8',observacoes:'Cadastro de teste'};
 const n=cadastrarAluno(e,op,dados,'novo',agora);assert.deepEqual(n.alunos.at(-1).aulasAdquiridas,{D:8});assert.deepEqual(Object.fromEntries(Object.entries(n.alunos.at(-1).creditos).map(([k,v])=>[k,v.disponiveis])),n.alunos.at(-1).aulasAdquiridas);assert.deepEqual(n.alunos[0],e.alunos[0]);assert.throws(()=>cadastrarAluno(e,op,{...dados,categoria:'BD'},'err',agora));
});
test('cadastro obrigatório de almoço e recursos D por ação explícita, sem edição de existentes',()=>{
 const e={...fixture(),recursos:[]},d={tipo:'Instrutores',nome:'Instrutor Novo',identificacao:'teste-instrutor',categoria:'D',inicio:'07:00',fim:'19:00'};
 assert.throws(()=>cadastrarRecurso(e,op,d,'i2'),/almoço/);const n=cadastrarRecurso(e,op,{...d,horarioAlmoco:'11-12'},'i2');assert.equal(n.recursos.at(-1).horarioAlmoco,'11-12');assert.deepEqual(e,{...fixture(),recursos:[]});assert.throws(()=>cadastrarRecurso(n,op,{...d,horarioAlmoco:'12-13'},'i2'),/cadastrada|agenda/);
});
test('almoço individual em A/B/D, nenhuma opção implícita para legado',()=>{
 for(const categoria of ['A','B','D'])for(const opcao of ['11-12','12-13']){const i={categorias:[categoria],horarioAlmoco:opcao};assert.equal(!!motivoAlmoco(i,'11:00'),opcao==='11-12');assert.ok(motivoAlmoco(i,'12:00'));assert.equal(!!motivoAlmoco(i,'13:00'),opcao==='12-13');assert.equal(motivoAlmoco(i,'14:00'),'');}
 assert.match(motivoAlmoco({},'13:00'),/não configurado/);assert.equal(motivoAlmoco({},'09:00'),'');
});
test('pares: libera 11 para segundo almoço, 13 para primeiro, sem bloquear unidade inteira',()=>{
 const e=fixture();e.recursos[0].categorias=['B'];e.recursos[1].categoria='B';e.recursos[1].tipoCambio='manual';e.recursos[0].veiculoIds=['v'];e.recursos.push({...e.recursos[0],id:'i2',veiculoIds:['v2'],horarioAlmoco:'11-12'},{...e.recursos[1],id:'v2'});
 assert.deepEqual(paresNaUnidade(e,op,'2026-10-19','11:00',{},agora).map(p=>p.instrutorId),['i']);assert.deepEqual(paresNaUnidade(e,op,'2026-10-19','13:00',{},agora).map(p=>p.instrutorId),['i2']);assert.equal(paresNaUnidade(e,op,'2026-10-19','12:00',{},agora).length,0);
});
test('reservas D: 50 minutos, local sábado, conflitos, veículos incompatíveis, almoço, saldo separado',()=>{
 const e=fixture();assert.equal(validarHorario('2026-10-24','11:00'), '');assert.equal(fimDaAula('18:00'),'18:50');
 const d={alunoId:'s',categoria:'D',data:'2026-10-24',inicio:'09:00',instrutorId:'i',veiculoId:'v'},n=agendarAula(e,op,d,'r',agora);assert.equal(n.aulas[0].localReal.nome,LOCAIS_ONIBUS.sabado.nome);assert.equal(n.aulas[0].unidade,'Cobilândia');assert.equal(n.alunos[0].creditos.D.disponiveis,5);assert.deepEqual(e,fixture());
 assert.throws(()=>agendarAula(n,op,d,'r2',agora),/indisponíveis|conflito/);assert.throws(()=>agendarAula(e,op,{...d,data:'2026-10-19',inicio:'13:00'},'r3',agora),/indisponíveis/);
 e.recursos[1].categoria='B';assert.equal(paresNaUnidade(e,op,d.data,d.inicio,{categoria:'D'},agora).length,0);
});
test('sábado D integral: reservas 14 a 18, almoço, agenda única e A/B somente de manhã',async()=>{
 const data='2026-10-24';
 const recurso={tipo:'Instrutores',nome:'Instrutor Teste',identificacao:'manual',categoria:'D',horarioAlmoco:'11-12',inicio:'07:00',fim:'19:00'};
 assert.equal(cadastrarRecurso({...fixture(),recursos:[]},op,recurso,'novo').recursos.at(-1).disponibilidade[6][0].fim,'19:00');
 assert.equal(cadastrarRecurso(fixture(),op,{...recurso,tipoCambio:'manual',categoria:'B'},'novo').recursos.at(-1).disponibilidade[6][0].fim,'12:00');
 assert.ok(horariosAntecipacao(6,'D').includes('18:00'));assert.ok(!horariosAntecipacao(6,'B').includes('18:00'));
 assert.deepEqual(normalizarDisponibilidadeAntecipacao({6:['18:00']},true,'D')[6],['18:00']);assert.throws(()=>normalizarDisponibilidadeAntecipacao({6:['18:00']},true,'B'));
 for(const horarioAlmoco of ['11-12','12-13']){
  let e=fixture();e.recursos[0].horarioAlmoco=horarioAlmoco;
  for(const hora of ['14:00','15:00','16:00','17:00','18:00']){
   for(const categoria of ['A','B'])assert.equal(validarHorario(data,hora,undefined,undefined,categoria),'Fora do expediente');
   assert.equal(validarHorario(data,hora,undefined,e.recursos[0],'D'),'');
   e=agendarAula(e,op,{alunoId:'s',categoria:'D',data,inicio:hora,instrutorId:'i',veiculoId:'v'},hora,agora);
   assert.equal(e.aulas.at(-1).fim,hora.slice(0,2)+':50');assert.equal(e.aulas.at(-1).localReal.nome,LOCAIS_ONIBUS.sabado.nome);
  }
  for(const hora of horarioAlmoco==='11-12'?['11:00','12:00']:['12:00','13:00'])assert.equal(paresNaUnidade(e,op,data,hora,{categoria:'D'},agora).length,0);
  const grade=agendaDeHoje({instrutor:{id:'i',categorias:['D'],horarioAlmoco},aulas:[]},'i',new Date(data+'T06:00:00-03:00'));assert.equal(grade.faixas.length,12);assert.equal(grade.periodoExibicao,'07:00 — 18:50');
  for(const categoria of ['A','B'])assert.equal(agendaDeHoje({instrutor:{id:'i',categorias:[categoria],horarioAlmoco},aulas:[]},'i',new Date(data+'T06:00:00-03:00')).faixas.length,5);
  const dados={aluno:{id:'outro',categoria:'D',unidade:'Santa Rita'},aulas:[],registros:[{id:'i',tipo:'instrutor',unidade:'Cobilândia',categorias:['D'],ativo:true,horarioAlmoco},{id:'v',tipo:'veiculo',unidade:'Cobilândia',categoria:'D',ativo:true}]};
  const q={categoria:'D',data,unidade:'Santa Rita'},h=await calcularHorariosLocais(dados,q,'2026-10-19T06:00:00');
  for(const hora of ['14:00','15:00','16:00','17:00','18:00'])assert.ok(h.some(x=>x.hora===hora));
  dados.registros.push({id:'reserva-outra-unidade',tipo:'aula',unidade:'Itaparica',aluno:'terceiro',instrutor:'i',veiculo:'v',inicio:data+'T14:00:00-03:00',fim:data+'T14:50:00-03:00',status:1});
  assert.ok(!(await calcularHorariosLocais(dados,q,'2026-10-19T06:00:00')).some(x=>x.hora==='14:00'));
  for(const categoria of ['A','B']){dados.aluno.categoria=categoria;dados.aluno.tipoCambio='manual';dados.aluno.unidade=categoria==='A'?'Vila Velha':'Cobilândia';for(const r of dados.registros.slice(0,2)){r.unidade=dados.aluno.unidade;if(r.tipo==='instrutor')r.categorias=[categoria];else {r.categoria=categoria;r.tipoCambio='manual';}}const hs=await calcularHorariosLocais(dados,{categoria,data,unidade:dados.aluno.unidade},'2026-10-19T06:00:00');assert.equal(hs.length,horarioAlmoco==='11-12'?4:5);assert.ok(hs.every(x=>x.hora<'12:00'));}
 }
});
test('mesmo cálculo no aluno: ônibus, conflitos, bloqueios, feriado e vínculo de categoria',async()=>{
 const dados={aluno:{id:'s',categoria:'D',unidade:'Itaparica'},aulas:[],registros:[{id:'i',tipo:'instrutor',categorias:['D'],ativo:true,unidade:'Cobilândia',horarioAlmoco:'12-13'},{id:'v',tipo:'veiculo',categoria:'D',ativo:true,unidade:'Cobilândia'}]},q={categoria:'D',data:'2026-10-19',unidade:'Itaparica'};
 const h=await calcularHorariosLocais(dados,q,'2026-10-19T06:00:00');assert.ok(h.some(h=>h.hora==='11:00'));assert.ok(!h.some(h=>['12:00','13:00'].includes(h.hora)));assert.equal(h.at(-1).fim,'18:50');
 assert.equal((await calcularHorariosLocais(dados,{...q,data:'2026-11-02'},'2026-10-19T06:00:00')).length,0);assert.equal((await calcularHorariosLocais(dados,{...q,data:'2026-10-25'},'2026-10-19T06:00:00')).length,0);
 const ocupado={...dados,registros:[...dados.registros,{id:'outro',tipo:'aula',instrutor:'i',veiculo:'v',status:1,inicio:'2026-10-19T11:00:00-03:00',fim:'2026-10-19T11:50:00-03:00'}]};assert.ok(!(await calcularHorariosLocais(ocupado,q,'2026-10-19T06:00:00')).some(h=>h.hora==='11:00'));
});
test('agenda individual e legado inconsistente não são apagados',()=>{
 for(const horarioAlmoco of ['11-12','12-13']){const s={instrutor:{id:'i',horarioAlmoco},aulas:[]},r=agendaDeHoje(s,'i',agora);assert.equal(r.faixas.length,12);assert.deepEqual(r.faixas.filter(h=>h.bloqueado).map(h=>h.inicio),horarioAlmoco==='11-12'?['11:00','12:00']:['12:00','13:00']);}
 const s={instrutor:{id:'i',horarioAlmoco:'12-13'},aulas:[{id:'antiga',categoria:'D',instrutorId:'i',inicio:'2026-10-19T13:00:00-03:00',fim:'2026-10-19T13:50:00-03:00'}]},antes=structuredClone(s);assert.equal(agendaDeHoje(s,'i',agora).inconsistencias.length,1);assert.deepEqual(s,antes);
});
test('realizadas e faltas D não se misturam com créditos A/B nem duplicam totais',()=>{
 const e=fixture();e.aulas=[{id:'a',alunoId:'s',categoria:'D',status:5},{id:'b',alunoId:'s',categoria:'D',status:6},{id:'a',alunoId:'s',categoria:'D',status:5},{id:'c',alunoId:'s',categoria:'A',status:5}];assert.deepEqual(resumoAulasAluno(e,e.alunos[0]),{D:{adquiridas:8,realizadas:1,faltas:1}});
 const r=resumirCreditos({categorias:{A:20,B:20,D:8}},[{id:'d',categoria:'D',status:5,inicio:'2026-10-19T09:00:00-03:00'}]);assert.equal(r.categorias.D.disponiveis,7);assert.equal(r.categorias.A.disponiveis,20);assert.equal(r.categorias.B.disponiveis,20);
});
test('prova ônibus: reprovação, nova tentativa, aprovação e cancelamento preservam todos os registros',()=>{
 let e=fixture();for(const [n,resultado] of [[1,'Reprovado'],[2,'Aprovado'],[3,'Cancelado']]){e=movimentarProva(e,op,'s',{tipo:'praticaOnibus',status:'Agendado',data:'2026-11-10'},'p'+n,agora);e=movimentarProva(e,op,'s',{tipo:'praticaOnibus',tentativaId:'p'+n,status:resultado,confirmado:true},'res'+n,agora);}assert.equal(e.alunos[0].tentativasProvas.length,3);assert.deepEqual(e.alunos[0].tentativasProvas.map(p=>p.resultado),['Reprovado','Aprovado','Cancelado']);assert.equal(linhaTempoAluno(e.alunos[0],[]).filter(h=>h.grupo==='provas').length,6);
});
test('persistência D compatível e prazo de 48 horas úteis segue a mesma política',()=>{
 const e=fixture(),storage={valor:'',getItem(){return this.valor;},setItem(k,v){this.valor=v;}},r=repositorioDemo('http://localhost/operador-cfc.html?demo=1',storage);assert.ok(r.salvar(e));assert.deepEqual(r.carregar(),e);
 const a={inicio:'2026-10-24T09:00:00-03:00',categoria:'D',unidade:'Cobilândia',status:1};assert.deepEqual(calcularPrazoCancelamento(a,[],agora),calcularPrazoCancelamento({...a,tipoCambio:'manual',categoria:'B'},[],agora));
});

test('recepção agenda operação D de qualquer unidade autorizada sem expor alunos externos',()=>{
 let e=fixture();e.alunos[0].unidade=e.alunos[0].unidadePrincipal='Itaparica';e.alunos[0].etapas={};
 e.recursos[0].unidade='Santa Rita';e.recursos[1].unidade='Terra Vermelha';
 const operador={...op,unidade:'Itaparica'},pedido={alunoId:'s',categoria:'D',data:'2026-12-19',inicio:'14:00',instrutorId:'i',veiculoId:'v'};
 assert.equal(consultarRecursos(e,operador).length,2);assert.equal(paresNaUnidade(e,operador,pedido.data,pedido.inicio,{categoria:'D'},agora).length,1);
 const antes=structuredClone(e);e=agendarAula(e,operador,pedido,'global',agora);assert.equal(e.aulas[0].unidade,'Cobilândia');assert.equal(e.aulas[0].localReal.nome,LOCAIS_ONIBUS.sabado.nome);assert.deepEqual(e.alunos[0].etapas,{});assert.deepEqual(antes.aulas,[]);
 assert.equal(consultarAgenda(e,operador).length,1);assert.equal(consultarAgenda(e,{...op,unidade:'Santa Rita'}).length,0);
 assert.equal(paresNaUnidade(e,{...op,unidade:'Santa Rita'},pedido.data,pedido.inicio,{categoria:'D'},agora).length,0);
 assert.throws(()=>cadastrarRecurso(e,operador,{tipo:'Instrutores',nome:'Outro Instrutor',identificacao:'outro',categoria:'D',horarioAlmoco:'11-12',inicio:'07:00',fim:'19:00'},'outro'),/agenda única|escopo/);
});

test('local atual de sabado substitui apenas a apresentacao do snapshot antigo',()=>{
 const aula={categoria:'D',inicio:'2026-10-24T14:00:00-03:00',localReal:{id:'tartarugao',nome:'Local antigo',endereco:'Rua Itaperuna, 150'}};
 const antes=structuredClone(aula);assert.deepEqual(localDaReservaCategoriaD(aula),LOCAIS_ONIBUS.sabado);assert.deepEqual(aula,antes);
 for(const dia of ['2026-10-19','2026-10-23'])assert.deepEqual(localDaReservaCategoriaD({categoria:'D',data:dia}),LOCAIS_ONIBUS.semana);
 for(const categoria of ['A','B'])assert.equal(localDaReservaCategoriaD({categoria,data:'2026-10-24'}),null);
 const outro={tipoCambio:'manual',categoria:'B',localReal:{nome:'Unidade original',endereco:'Original'}};assert.equal(localDaReservaCategoriaD(outro),outro.localReal);
});

test('local fisico por data independe do vinculo e do snapshot sem expor coordenadas como endereco',()=>{
 const reserva={categoria:'D',unidade:'Itaparica',data:'2026-10-23',localReal:LOCAIS_ONIBUS.sabado};
 const antes=structuredClone(reserva);
 assert.equal(localDaReservaCategoriaD(reserva).nome,'KM Cobilândia');
 assert.equal(localDaReservaCategoriaD({...reserva,data:'2026-10-24',localReal:LOCAIS_ONIBUS.semana}).nome,'Arena Tartarugão');
 assert.match(LOCAIS_ONIBUS.sabado.endereco,/Ginásio Poliesportivo Presidente João Goulart/);
 assert.doesNotMatch(LOCAIS_ONIBUS.sabado.endereco,/-20\.3621362|-40\.3048018|Itaperuna/);
 assert.deepEqual(reserva,antes);
});
