import test from 'node:test';
import assert from 'node:assert/strict';
import {prepararCenarioAgenda} from '../dev/operador/cenarioAgenda.js';
import {servicoOperador} from '../nivel-1-operador/js/servicoOperador.js';
import {paresNaUnidade,formatarCpf} from '../nivel-1-operador/js/dominioOperador.js';
const identidade={id:'teste',nivel:1,unidade:'Itaparica',permissoes:['consultar','cadastrar','cadastrar-recurso','agendar']};
test('cenário explícito idempotente, preserva registros e confirma reserva sem duplicar ou consultar outra unidade',async()=>{
 const antigo={versao:2,alunos:[],recursos:[{id:'externo',tipo:'Veículos',nome:'Externo',unidade:'Santa Rita',tipoCambio:'manual',categoria:'B',ativo:true}],aulas:[]},copia=structuredClone(antigo);
 let estado=prepararCenarioAgenda(antigo,identidade);assert.deepEqual(antigo,copia);assert.equal(estado.alunos.length,20);assert.equal(estado.aulas.length,4);assert.deepEqual(estado.recursos[0],antigo.recursos[0]);assert.deepEqual(prepararCenarioAgenda(estado,identidade),estado);
 const adaptador={ler:async()=>structuredClone(estado),alterar:async f=>{estado=f(structuredClone(estado));}},s=servicoOperador(adaptador,identidade),data=estado.aulas[0].data,hora='10:00',pares=await s.pares(data,hora,{categoria:'B'});assert.ok(pares.length);assert.equal((await s.pares(data,hora,{veiculoId:'externo'})).length,0);
 const antes=structuredClone(estado),alunos=await s.alunosAgendaveis(data,hora,pares[0]);assert.equal(alunos.length,20);assert.deepEqual(estado,antes);assert.match(formatarCpf(alunos[0].cpf),/^\d{3}\.\d{3}\.\d{3}-\d{2}$/);
 await s.agendar({...pares[0],alunoId:alunos[0].id,data,inicio:hora});assert.equal(estado.aulas.at(-1).fim,'10:50');assert.equal(estado.alunos.find(a=>a.id===alunos[0].id).creditos.B.disponiveis,alunos[0].saldo-1);
 await assert.rejects(s.agendar({...pares[0],alunoId:alunos[0].id,data,inicio:hora}),/indisponíveis|conflito/);assert.equal(estado.aulas.length,5);
 estado.alunos[1].unidade=estado.alunos[1].unidadePrincipal=estado.alunos[1].unidadeCarro='Santa Rita';assert.ok(!(await s.alunosAgendaveis(data,'11:00',pares[0])).some(a=>a.id===estado.alunos[1].id));
 assert.deepEqual(paresNaUnidade(estado,identidade,data,hora,{veiculoId:'externo'}),[]);
});

test('consulta global de onibus preserva cadastro restrito e nao concede escrita',async()=>{
 const e={alunos:[{id:'fora',nome:'Aluno externo',cpf:'12345678909',categoria:'D',unidade:'Santa Rita',unidadePrincipal:'Santa Rita',unidadeCarro:'Santa Rita'}],recursos:[],aulas:[{id:'d',alunoId:'fora',categoria:'D',data:'2026-10-24',inicio:'14:00',fim:'14:50',status:1,instrutorId:'i',veiculoId:'v',unidade:'Cobilandia',historico:['privado']},{id:'b',alunoId:'fora',categoria:'B',data:'2026-10-24',inicio:'15:00',fim:'15:50',unidade:'Santa Rita'}]};
 const antes=structuredClone(e);
 for(const unidade of ['Itaparica','Centro','Cobilandia','Santa Rita']){
  const s=servicoOperador({ler:async()=>e,alterar:async()=>{throw new Error('nao deve escrever');}},{...identidade,unidade});
  const d=await s.consultar();assert.equal(d.agendaOnibus.length,1);assert.equal(d.agendaOnibus[0].alunoNome,'Aluno externo');assert.equal(d.agendaOnibus[0].id,'d');
  assert.equal('cpf' in d.agendaOnibus[0],false);assert.equal('alunoId' in d.agendaOnibus[0],false);assert.equal('historico' in d.agendaOnibus[0],false);
  if(unidade!=='Santa Rita')await assert.rejects(s.ficha('fora'),/autorizado/);
 }
 assert.deepEqual(e,antes);
});

test('seis motos, tres instrutores e reservas centralizadas respeitam vinculos, saldo e conflitos nas seis unidades',async()=>{
 const r=await import('../nivel-1-operador/js/dominioOperador.js'),agora=new Date('2026-10-19T08:00:00-03:00'),data='2027-01-20';
 const unidades=['Cobilândia','Vila Velha','Itaparica','Santa Rita','Terra Vermelha','Novo Milênio'];
 const recursos=Array.from({length:3},(_,n)=>[{id:'i'+n,tipo:'Instrutores',nome:'Instrutor teste '+n,categorias:['A'],unidade:'Centro',ativo:true,horarioAlmoco:'11-12',veiculoIds:['m'+(n*2),'m'+(n*2+1)]},...[0,1].map(j=>({id:'m'+(n*2+j),tipo:'Veículos',nome:'Moto teste '+(n*2+j),categoria:'A',unidade:'Centro',ativo:true}))]).flat();
 const base={alunos:unidades.map((u,n)=>({id:'s'+n,nome:'Aluno teste '+n,categoria:'A',unidade:u,unidadePrincipal:u,aulasAdquiridas:{A:2},creditos:{A:{contratadas:2,disponiveis:2}},historico:[]})),aulas:[],recursos};
 const antes=structuredClone(base);
 for(const [n,u] of unidades.entries()){
  const op={...identidade,unidade:u};assert.equal(r.consultarRecursos(base,op).filter(x=>x.categoria==='A').length,6);
  assert.equal(r.paresNaUnidade(base,op,data,'09:00',{categoria:'A'},agora).length,6);
  const e=r.agendarAula(base,op,{alunoId:'s'+n,categoria:'A',data,inicio:'09:00',instrutorId:'i0',veiculoId:'m0'},'reserva',agora);
  assert.equal(e.aulas[0].unidade,'Vila Velha');assert.equal(e.alunos[n].creditos.A.disponiveis,1);
  assert.equal(r.paresNaUnidade(e,op,data,'09:00',{categoria:'A',veiculoId:'m1'},agora).length,0);
  assert.match(r.motivoRecursoIndisponivel(e,op,data,'09:00',{categoria:'A',veiculoId:'m1'},agora),/Instrutor ocupado/);
  assert.throws(()=>r.agendarAula(e,op,{alunoId:'s'+n,categoria:'A',data,inicio:'09:00',instrutorId:'i1',veiculoId:'m2'},'mesmo-aluno',agora),/aluno já possui/);
  const externo={...op,unidade:unidades[(n+1)%6]};assert.equal(r.consultarAgendaMotos(e,externo).length,1);assert.throws(()=>r.alunoAutorizado(e,externo,'s'+n),/autorizado/);
  e.alunos[n].aulasAdquiridas={A:1};e.alunos[n].creditos.A={contratadas:1,disponiveis:0};
  assert.throws(()=>r.agendarAula(e,op,{alunoId:'s'+n,categoria:'A',data,inicio:'10:00',instrutorId:'i0',veiculoId:'m0'},'sem-saldo',agora),/Crédito/);
 }
 assert.deepEqual(base,antes);
 const semVinculo=structuredClone(base);delete semVinculo.recursos[0].veiculoIds;
 assert.equal(r.paresNaUnidade(semVinculo,identidade,data,'09:00',{categoria:'A',veiculoId:'m0'},agora).length,0);
 assert.match(r.motivoRecursoIndisponivel(semVinculo,identidade,data,'09:00',{categoria:'A',veiculoId:'m0'},agora),/Sem instrutor/);
 assert.match(r.motivoRecursoIndisponivel(base,identidade,data,'11:00',{categoria:'A',veiculoId:'m0'},agora),/Intervalo/);
 assert.match(r.motivoRecursoIndisponivel(base,identidade,data,'12:00',{categoria:'A',veiculoId:'m0'},agora),/almoço|Intervalo/);
});

test('motos ficticias globais sao idempotentes, reutilizam equivalentes e podem ser desativadas sem perder reservas',async()=>{
 const {prepararMotosLocais,desativarMotosLocais}=await import('../dev/operador/cenarioAgenda.js');
 const base={alunos:[],aulas:[{id:'historico',veiculoId:'real'}],recursos:[{id:'real',nome:'Moto real',tipo:'Veículos',categoria:'A',unidade:'Centro',ativo:true}]},antes=structuredClone(base);
 let e=prepararMotosLocais(base,identidade);assert.equal(e.recursos.length,10);assert.deepEqual(base,antes);
 for(const unidade of ['Cobilândia','Centro','Itaparica','Santa Rita','Terra Vermelha','Novo Milênio'])assert.deepEqual(prepararMotosLocais(e,{...identidade,unidade}),e);
 const ficticios=e.recursos.filter(r=>r.origem==='cenario-motos-local');assert.equal(ficticios.filter(r=>r.tipo==='Veículos').length,6);assert.equal(ficticios.filter(r=>r.tipo==='Instrutores').length,3);
 assert.ok(ficticios.filter(r=>r.tipo==='Instrutores').every(r=>r.veiculoIds.length===2));assert.ok(ficticios.every(r=>!r.placa));
 const reutilizar=structuredClone(e);const moto=reutilizar.recursos.find(r=>r.id==='agenda-moto-local-v1');moto.id='moto-equivalente';reutilizar.recursos.find(r=>r.id==='agenda-moto-local-i1').veiculoIds[0]=moto.id;
 assert.deepEqual(prepararMotosLocais(reutilizar,identidade),reutilizar);
 const desativado=desativarMotosLocais(e,identidade);assert.deepEqual(desativado.aulas,e.aulas);assert.deepEqual(desativado.recursos[0],base.recursos[0]);assert.ok(desativado.recursos.filter(r=>r.origem==='cenario-motos-local').every(r=>!r.ativo));
 assert.throws(()=>prepararMotosLocais(base,{...identidade,permissoes:['consultar']}),/Permiss/);
});

test('edicao de instrutor valida escopo, cinco intervalos continuos e preserva legados, vinculos e reservas',async()=>{
 const r=await import('../nivel-1-operador/js/dominioOperador.js'),{INTERVALOS_ALMOCO,motivoAlmoco}=await import('../shared/js/categorias.js'),{validarHorario}=await import('../shared/js/disponibilidade.js');
 const op={...identidade,permissoes:[...identidade.permissoes,'editar-instrutor']},agora=new Date('2026-10-19T08:00:00-03:00');
 const dados={nome:'Instrutor Original',identificacao:'TESTE-I',categoria:'B',tipo:'Instrutores',inicio:'07:00',fim:'19:00',horarioAlmoco:'11-12'},base=r.cadastrarRecurso({alunos:[],aulas:[],recursos:[]},op,dados,'i');
 base.recursos[0].veiculoIds=['v'];base.recursos[0].bloqueios=[{data:'2027-01-25'}];const antes=structuredClone(base);
 const editar={...dados,nome:'Instrutor Atualizado',unidade:op.unidade,ativo:true,disponivel:true,observacoes:'Observacao',alterarAlmoco:false};delete editar.tipo;
 for(const [n,[id]] of INTERVALOS_ALMOCO.entries()){
  const e=r.editarInstrutor(base,op,'i',{...editar,horarioAlmoco:id,alterarAlmoco:true},agora),i=e.recursos[0],esperados=[[11],[12],[13],[11,12],[12,13]][n];
  assert.equal(e.recursos.length,1);assert.deepEqual(i.veiculoIds,['v']);assert.deepEqual(i.bloqueios,base.recursos[0].bloqueios);
  for(const h of [10,11,12,13,14]){const hora=String(h).padStart(2,'0')+':00';assert.equal(!!motivoAlmoco(i,hora),esperados.includes(h));assert.equal(!!validarHorario('2027-01-20',hora,undefined,i,'B'),esperados.includes(h));}
 }
 const e=r.editarInstrutor(base,op,'i',editar,agora);assert.equal(e.recursos[0].horarioAlmoco,'11-12');assert.ok(motivoAlmoco(e.recursos[0],'12:00'));assert.deepEqual(base,antes);
 const reserva={id:'a',categoria:'B',data:'2027-01-20',inicio:'14:00',fim:'14:50',status:1,instrutorId:'i',veiculoId:'v'};base.aulas=[reserva];
 for(const alteracao of [{fim:'14:00'},{inicio:'15:00'},{ativo:false},{disponivel:false},{categoria:'A'}])assert.throws(()=>r.editarInstrutor(base,op,'i',{...editar,...alteracao},agora),/aula futura|escopo/);
 base.aulas=[{...reserva,inicio:'13:00',fim:'13:50'}];assert.throws(()=>r.editarInstrutor(base,op,'i',{...editar,horarioAlmoco:'12:00/14:00',alterarAlmoco:true},agora),/aula futura/);
 base.aulas[0].status=5;assert.equal(r.editarInstrutor(base,op,'i',{...editar,horarioAlmoco:'12:00/14:00',alterarAlmoco:true},agora).aulas[0].status,5);
 assert.throws(()=>r.editarInstrutor(base,identidade,'i',editar,agora),/Permiss/);
 assert.throws(()=>r.editarInstrutor(base,{...op,unidade:'Santa Rita'},'i',editar,agora),/escopo/);
 assert.throws(()=>r.editarInstrutor(base,op,'i',{...editar,unidade:'Santa Rita'},agora),/escopo/);
 assert.throws(()=>r.editarInstrutor(base,op,'i',{...editar,veiculoIds:['outro']},agora),/protegido/);
 assert.throws(()=>r.editarInstrutor(base,op,'i',{...editar,horarioAlmoco:'qualquer',alterarAlmoco:true},agora),/almo/);
});

test('cadastros administrativos segregados de agenda, formularios sem jornada preservam dados e veiculo tem edicao limitada',async()=>{
 const r=await import('../nivel-1-operador/js/dominioOperador.js');const op={...identidade,permissoes:[...identidade.permissoes,'editar-instrutor','editar-veiculo']};
 const base={alunos:[],aulas:[],recursos:[{id:'externo',tipo:'Instrutores',categorias:['A'],nome:'Instrutor externo',unidade:'Centro',identificacao:'PRIVADO',observacoes:'privado',ativo:true,horarioAlmoco:'11-12',veiculoIds:['m']},{id:'m',tipo:'Veículos',categoria:'A',nome:'Moto',unidade:'Centro',ativo:true}]};
 assert.equal(r.consultarCadastrosRecursos(base,op).length,0);assert.throws(()=>r.recursoAdministrativo(base,op,'externo'),/escopo/);
 const s=servicoOperador({ler:async()=>base,alterar:async f=>f(base)},op),consulta=await s.consultar();assert.equal(consulta.recursos.length,2);assert.equal(consulta.cadastrosRecursos.length,0);assert.equal('observacoes' in consulta.recursos[0],false);assert.equal('identificacao' in consulta.recursos[0],false);await assert.rejects(s.recursoAdministrativo('externo'),/escopo/);
 for(const categoria of ['A','D'])assert.throws(()=>r.cadastrarRecurso(base,op,{tipo:'Instrutores',nome:'Teste',identificacao:'x',categoria,horarioAlmoco:'11:00/12:00'},'novo'),/escopo/);
 for(const [categoria,unidade] of [['A','Centro'],['D','Cobilândia'],['B','Itaparica']]){const e=r.cadastrarRecurso({alunos:[],aulas:[],recursos:[]},{...op,unidade},{tipo:'Instrutores',nome:'Instrutor Novo',identificacao:'novo',categoria,horarioAlmoco:'11:00/12:00'},'i');assert.equal(e.recursos[0].disponibilidade[1][0].inicio,'07:00');assert.equal(e.recursos[0].disponibilidade[1][0].fim,'19:00');assert.equal(e.recursos[0].unidade,r.unidade(unidade));}
 let e=r.cadastrarRecurso(base,op,{tipo:'Instrutores',nome:'Instrutor Proprio',identificacao:'IP',categoria:'B',horarioAlmoco:'11:00/12:00'},'i');
 const i=e.recursos.find(r=>r.id==='i');i.disponibilidade={1:[{inicio:'08:00',fim:'17:00'}],3:[{inicio:'09:00',fim:'16:00'}]};i.ativo=false;i.disponivel=false;i.bloqueios=[{data:'2027-01-20'}];i.veiculoIds=['v'];const antes=structuredClone(e);
 e=r.editarInstrutor(e,op,'i',{nome:'Nome Editado',identificacao:'IP',categoria:'B',unidade:'Itaparica',horarioAlmoco:'12:00/14:00',alterarAlmoco:true,observacoes:'ok'});const depois=e.recursos.find(r=>r.id==='i');for(const k of ['disponibilidade','ativo','disponivel','bloqueios','veiculoIds','unidade'])assert.deepEqual(depois[k],i[k]);assert.deepEqual(antes.recursos.find(r=>r.id==='i'),i);
 e.recursos.find(r=>r.id==='i').ativo=true;e.recursos.find(r=>r.id==='i').disponivel=true;e=r.cadastrarRecurso(e,op,{instrutorId:'i',tipo:'Veículos',nome:'Carro',identificacao:'PLACA',categoria:'B',tipoCambio:'manual'},'v');const veiculo=structuredClone(e.recursos.find(r=>r.id==='v'));e=r.editarVeiculo(e,op,'v',{nome:'Carro Editado',identificacao:'PLACA2'});const v=e.recursos.find(r=>r.id==='v');for(const k of ['categoria','tipoCambio','unidade','disponibilidade','operacoesCarro'])assert.deepEqual(v[k],veiculo[k]);assert.equal(v.placa,'PLACA2');
 assert.throws(()=>r.editarVeiculo(e,{...op,unidade:'Santa Rita'},'v',{nome:'Outro',identificacao:'NOVA'}),/escopo/);assert.throws(()=>r.editarVeiculo(e,op,'v',{nome:'Outro',identificacao:'NOVA',categoria:'D'}),/protegido/);
});
