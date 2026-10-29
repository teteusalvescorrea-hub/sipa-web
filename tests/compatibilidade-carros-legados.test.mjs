import test from 'node:test';import assert from 'node:assert/strict';
import {regularizarCarrosDeTeste} from '../dev/operador/compatibilidadeCarro.js';
import {paresNaUnidade,agendarAula} from '../nivel-1-operador/js/dominioOperador.js';
const agora=new Date('2026-10-19T06:00:00-03:00'),op={id:'op',nivel:1,unidade:'Vila Velha',permissoes:['consultar','editar-veiculo','agendar']};
function fixture(){return {alunos:[{id:'s',nome:'Aluno B',categoria:'B',unidade:'Vila Velha',unidadePrincipal:'Vila Velha',unidadeCarro:'Vila Velha',tipoCambio:'manual',aulasAdquiridas:{B:10},creditos:{B:{contratadas:10,disponiveis:10}},historico:[]}],aulas:[],recursos:[1,2].flatMap(n=>[{id:'agenda-lab-Vila Velha-v'+n,placa:'DEMO-B'+n,nome:'Carro fictício '+n,categoria:'B',tipo:'Veículos',unidade:'Vila Velha',ativo:true,origem:'cenario-agenda-local'},{id:'i'+n,nome:'Instrutor '+n,tipo:'Instrutores',categorias:['B'],veiculoIds:['agenda-lab-Vila Velha-v'+n],unidade:'Vila Velha',ativo:true,horarioAlmoco:'12:00/14:00'}])};}
test('B1/B2 com origem comprovada sao regularizados uma vez, sem recriar registros ou alterar saldo',()=>{
 const e=fixture(),antes=structuredClone(e),n=regularizarCarrosDeTeste(e,op,agora);assert.deepEqual(e,antes);assert.equal(n.recursos.length,e.recursos.length);assert.deepEqual(n.aulas,e.aulas);assert.deepEqual(n.alunos,e.alunos);
 for(const placa of ['DEMO-B1','DEMO-B2']){const v=n.recursos.find(v=>v.placa===placa);assert.equal(v.tipoCambio,'manual');assert.equal(paresNaUnidade(n,op,'2026-10-23','09:00',{veiculoId:v.id,categoria:'B'},agora).length,1);}
 assert.equal(regularizarCarrosDeTeste(n,op,agora),n);
});
test('placa/nome sem origem confiavel, veiculo real, valor informado e reserva conflitante nao sofrem inferencia',()=>{
 for(const alterar of [e=>delete e.recursos[0].origem,e=>e.recursos[0].id='carro-real',e=>e.recursos[0].tipoCambio='automatico',e=>e.aulas.push({id:'antiga',veiculoId:e.recursos[0].id,alunoId:'s',tipoCambio:'automatico',status:5})]){const e=fixture();alterar(e);const original=structuredClone(e.recursos[0]),n=regularizarCarrosDeTeste(e,op,agora);assert.deepEqual(n.recursos[0],original);}
 const e=fixture();assert.equal(regularizarCarrosDeTeste(e,{...op,unidade:'Itaparica'},agora),e);assert.equal(regularizarCarrosDeTeste(e,{...op,permissoes:['consultar']},agora),e);
});
test('consulta fisica de carro desconhecido nao autoriza reserva sem cambio nem ignora conflitos',()=>{
 const e=fixture();e.recursos[0].id='real';e.recursos[1].veiculoIds=['real'];delete e.recursos[0].origem;const f={categoria:'B',veiculoId:'real'};
 assert.equal(paresNaUnidade(e,op,'2026-10-23','09:00',f,agora).length,0);assert.equal(paresNaUnidade(e,op,'2026-10-23','09:00',{...f,consultaOperacional:true},agora).length,1);
 assert.throws(()=>agendarAula(e,op,{...f,consultaOperacional:true,alunoId:'s',data:'2026-10-23',inicio:'09:00',instrutorId:'i1'},'indevida',agora),/indispon/);
 e.aulas.push({id:'ocupada',alunoId:'outro',veiculoId:'real',instrutorId:'i1',categoria:'B',data:'2026-10-23',inicio:'09:00',fim:'09:50',status:1});assert.equal(paresNaUnidade(e,op,'2026-10-23','09:00',{...f,consultaOperacional:true},agora).length,0);
 assert.equal(paresNaUnidade(e,op,'2026-10-23','12:00',{...f,consultaOperacional:true},agora).length,0);
});
