import test from 'node:test';
import assert from 'node:assert/strict';
import * as r from '../nivel-1-operador/js/dominioOperador.js';
import {resumirCreditosRecepcao} from '../aluno/js/domain/creditosRecepcao.js';
import {solicitarMedico} from '../shared/js/solicitacoesMedicas.js';
import {operacaoCarro} from '../shared/js/operacaoCarro.js';
const agora=new Date('2026-10-19T08:00:00-03:00');
const op=(unidade='Itaparica')=>({id:'recepcao-teste',nivel:1,unidade,permissoes:['consultar','agendar','cadastrar-recurso','editar-veiculo','cancelar-aula','registrar-frequencia','verificar']});
const fixture=(unidade='Itaparica')=>({alunos:[{id:'s',nome:'Aluno de teste',categoria:'B',tipoCambio:'manual',unidade,unidadePrincipal:unidade,unidadeCarro:unidade,aulasAdquiridas:{B:10},creditos:{B:{contratadas:10,disponiveis:10}},historico:[]}],aulas:[],recursos:[{id:'i',nome:'Instrutor anterior',tipo:'Instrutores',categorias:['B'],unidade,ativo:true,disponivel:true,horarioAlmoco:'11-12',veiculoIds:['v']},{id:'j',nome:'Instrutor novo',tipo:'Instrutores',categorias:['B'],unidade,ativo:true,disponivel:true,horarioAlmoco:'11-12',veiculoIds:['w']},{id:'v',tipo:'Veículos',nome:'Carro de teste',identificacao:'CARROTESTE',categoria:'B',tipoCambio:'manual',unidade,ativo:true,instrutorId:'i'},{id:'w',tipo:'Veículos',nome:'Outro carro',categoria:'B',tipoCambio:'manual',unidade,ativo:true,instrutorId:'j'}],contasAlunos:[{id:'conta-preservada'}]});
const reservar=(e,data='2026-10-23',inicio='09:00',id='a')=>r.agendarAula(e,op(e.alunos[0].unidade),{alunoId:'s',categoria:'B',data,inicio,instrutorId:'i',veiculoId:'v'},id,agora);
const saldo=e=>resumirCreditosRecepcao(e.alunos[0],e.aulas.map(a=>({...a,inicio:a.data+'T'+a.inicio+':00-03:00'}))).categorias.B;
test('carro novo exige instrutor autorizado e respeita o par vinculado sem alterar cambio',()=>{
 const e=fixture(),dados={tipo:'Veículos',nome:'Carro Novo',identificacao:'NOVA',categoria:'B',tipoCambio:'manual'};
 assert.throws(()=>r.cadastrarRecurso(e,op(),dados,'novo'),/instrutor/);
 const n=r.cadastrarRecurso(e,op(),{...dados,instrutorId:'j'},'novo');assert.equal(n.recursos.at(-1).instrutorId,'j');assert.ok(n.recursos.find(i=>i.id==='j').veiculoIds.includes('novo'));
 const pares=r.paresNaUnidade(n,op(),'2026-10-23','09:00',{categoria:'B',veiculoId:'novo'},agora);assert.deepEqual(pares.map(p=>p.instrutorId),['j']);
 const invalido=structuredClone(e);invalido.recursos[1].ativo=false;assert.throws(()=>r.cadastrarRecurso(invalido,op(),{...dados,instrutorId:'j'},'novo'),/instrutor/);
});
test('cancelamento com prazo devolve uma vez, libera recurso e preserva conta e historico',()=>{
 const e=reservar(fixture()),antes=structuredClone(e),n=r.cancelarAulaRecepcao(e,op(),'a',{motivo:'outro',observacoes:'Aluno solicitou',aceitarConsequencias:false},agora);
 assert.equal(n.aulas[0].status,2);assert.equal(n.aulas[0].cancelamento.credito,'devolvido');assert.equal(saldo(n).disponiveis,10);assert.equal(n.alunos[0].creditos.B.disponiveis,10);assert.equal(n.aulas[0].historico.at(-1).autor,op().id);assert.equal(r.paresNaUnidade(n,op(),'2026-10-23','09:00',{veiculoId:'v',categoria:'B'},agora).length,1);
 assert.throws(()=>r.cancelarAulaRecepcao(n,op(),'a',{motivo:'outro',observacoes:'Repetido',aceitarConsequencias:true},agora),/encerrados|ativas/);assert.deepEqual(e,antes);assert.deepEqual(n.contasAlunos,e.contasAlunos);
});
test('cancelamento dentro de 48 horas uteis exige aceite e mantem consumo sem conceder devolucao medica',()=>{
 const e=reservar(fixture(),'2026-10-20');assert.throws(()=>r.cancelarAulaRecepcao(e,op(),'a',{motivo:'saude',observacoes:'Teste',aceitarConsequencias:false},agora),/reten/);
 const n=r.cancelarAulaRecepcao(e,op(),'a',{motivo:'saude',observacoes:'Teste',aceitarConsequencias:true},agora);assert.equal(n.aulas[0].cancelamento.credito,'retido');assert.equal(n.alunos[0].creditos.B.disponiveis,9);assert.equal(saldo(n).disponiveis,9);assert.equal(saldo(n).consumidas,1);assert.equal(n.aulas[0].solicitacaoMedica,undefined);
});
for(const status of [5,6])test('registro administrativo '+status+' requer motivo, nao permite futuro nem substituir resultado e nao debita de novo',()=>{
 const e=reservar(fixture()),antes=structuredClone(e);assert.throws(()=>r.registrarFrequenciaRecepcao(e,op(),'a',status,'Instrutor indisponivel',agora),/futura/);e.aulas[0].data='2026-10-19';e.aulas[0].inicio='07:00';e.aulas[0].fim='07:50';assert.throws(()=>r.registrarFrequenciaRecepcao(e,op(),'a',status,'',agora),/motivo/);
 const n=r.registrarFrequenciaRecepcao(e,op(),'a',status,'Instrutor sem acesso ao sistema',agora);assert.equal(n.aulas[0].status,status);assert.deepEqual(n.alunos,e.alunos);assert.equal(n.aulas[0].historico.at(-1).origem,'recepcao');assert.equal(n.aulas[0].historico.at(-1).autor,op().id);assert.equal(saldo(n).disponiveis,9);assert.throws(()=>r.registrarFrequenciaRecepcao(n,op(),'a',status===5?6:5,'Correcao indevida',agora),/gerência/);assert.equal(antes.aulas[0].status,1);
});
test('troca atualiza todas as futuras ativas e vinculos em conjunto, preservando historico final e creditos',()=>{
 let e=reservar(fixture());e=reservar(e,'2026-10-23','10:00','b');e.aulas[1].status=3;e.aulas.push({...e.aulas[0],id:'passada',data:'2026-10-18'},{...e.aulas[0],id:'realizada',data:'2026-10-18',status:5},{...e.aulas[0],id:'falta',data:'2026-10-18',status:6},{...e.aulas[0],id:'cancelada',status:2});const antes=structuredClone(e);
 const n=r.editarVeiculo(e,op(),'v',{nome:e.recursos[2].nome,identificacao:'CARROTESTE',instrutorId:'j'},agora);assert.ok(n.aulas.slice(0,2).every(a=>a.instrutorId==='j'));assert.deepEqual(n.aulas.slice(2),e.aulas.slice(2));assert.deepEqual(n.alunos,e.alunos);assert.ok(!n.recursos[0].veiculoIds.includes('v'));assert.ok(n.recursos[1].veiculoIds.includes('v'));assert.equal(n.recursos[2].instrutorId,'j');assert.deepEqual(n.aulas[0].historico.at(-1).agendamentosAfetados,['a','b']);assert.deepEqual(e,antes);
});
test('troca com conflito horario, almoco, habilitacao ou unidade falha integralmente',()=>{
 for(const tipo of ['conflito','almoco','categoria','unidade','inativo']){const e=reservar(fixture()),j=e.recursos[1];if(tipo==='conflito')e.aulas.push({...e.aulas[0],id:'outra',alunoId:'outro',instrutorId:'j',veiculoId:'w'});if(tipo==='almoco')j.horarioAlmoco='09:00/10:00',j.intervaloAlmoco={inicio:'09:00',fim:'10:00'};if(tipo==='categoria')j.categorias=['A'];if(tipo==='unidade')j.unidade='Santa Rita';if(tipo==='inativo')j.ativo=false;const antes=structuredClone(e);assert.throws(()=>r.editarVeiculo(e,op(),'v',{nome:'Nome nao deve salvar',identificacao:'NOVA',instrutorId:'j'},agora),/Troca bloqueada|instrutor/);assert.deepEqual(e,antes);}
});
test('tres deslocamentos usam recursos da origem automaticamente, sem liberar catalogo do destino',()=>{
 for(const [origem,data,destino] of [['Santa Rita','2026-10-26','Itaparica'],['Terra Vermelha','2026-10-27','Vila Velha'],['Cobilândia','2026-10-29','Vila Velha']]){const e=fixture(origem);e.recursos.push({...e.recursos[2],id:'externo',unidade:destino,operacoesCarro:[]});assert.equal(operacaoCarro(e.alunos[0],data).destino,destino);assert.ok(!r.consultarRecursos(e,op(origem)).some(v=>v.id==='externo'));const n=reservar(e,data);assert.equal(n.aulas[0].localReal.id,destino==='Vila Velha'?'Vila Velha':destino);assert.equal(n.aulas[0].unidade,origem);}
});
test('consulta compartilhada nao concede cancelamento ou frequencia de aluno alheio',()=>{
 const e=reservar(fixture());e.aulas[0].categoria='A';assert.equal(r.detalhesAgendamento(e,op('Santa Rita'),'a',agora).podeCancelar,false);assert.throws(()=>r.cancelarAulaRecepcao(e,op('Santa Rita'),'a',{motivo:'outro',observacoes:'Teste',aceitarConsequencias:true},agora),/escopo/);assert.throws(()=>r.registrarFrequenciaRecepcao(e,{...op(),permissoes:['consultar']},'a',5,'Sem permissao',agora),/Permiss/);
});
test('atestado apos cancelamento administrativo retido segue analise sem devolver credito ou apagar o cancelamento',()=>{
 const e=r.cancelarAulaRecepcao(reservar(fixture(),'2026-10-20'),op(),'a',{motivo:'saude',observacoes:'Teste',aceitarConsequencias:true},agora),a=e.aulas[0];const meta={id:'documento-teste-01',tipo:'application/pdf',hash:'a'.repeat(64),tamanho:100};const n=solicitarMedico(e.alunos[0],a,[],{id:meta.id,documento:meta},agora);assert.equal(n.solicitacaoMedica.status,'recepcao');assert.equal(n.cancelamento.credito,'retido');assert.equal(n.cancelamento.em,a.cancelamento.em);assert.equal(n.status,2);assert.equal(n.solicitacaoMedica.devolucao.estado,'pendente_decisao');assert.throws(()=>solicitarMedico(e.alunos[0],a,[],{id:meta.id,documento:meta},new Date(agora.getTime()+73*3600000)),/prazo|Somente/);
});
test('cancelamento nao inventa saldo desconhecido e preserva saldo liquido legado',()=>{
 const e=reservar(fixture());delete e.alunos[0].creditos;delete e.alunos[0].aulasAdquiridas;
 const dados={motivo:'outro',observacoes:'Teste de legado',aceitarConsequencias:false},antes=structuredClone(e);
 assert.throws(()=>r.cancelarAulaRecepcao(e,op(),'a',dados,agora),/não documentado/);assert.deepEqual(e,antes);
 e.alunos[0].aulas=5;const n=r.cancelarAulaRecepcao(e,op(),'a',dados,agora);assert.equal(n.alunos[0].aulas,6);assert.equal(n.alunos[0].creditos,undefined);
});
