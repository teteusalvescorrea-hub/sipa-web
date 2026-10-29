import test from 'node:test';
import assert from 'node:assert/strict';
import {agendaDeHoje,projetarFaixasJornada} from '../instrutor/js/agenda.js';
const aula=(id,inicio,fim)=>({id,instrutorId:'i',inicio,fim,status:1});
test('expediente semanal, duas linhas bloqueadas e faixas de sábado/fechamento',()=>{
 const consultar=data=>agendaDeHoje({instrutor:{id:'i',horarioAlmoco:'11-12'},aulas:[]},'i',new Date(data+'T10:00:00-03:00'));
 const semana=consultar('2026-10-20');assert.equal(semana.faixas.length,12);assert.deepEqual(semana.faixas.filter(f=>f.bloqueado).map(f=>f.inicio),['11:00','12:00']);assert.equal(semana.faixas.at(-1).inicio,'18:00');
 assert.equal(consultar('2026-10-24').faixas.length,5);assert.equal(consultar('2026-10-24').faixas.at(-1).fim,'12:00');
 assert.equal(consultar('2026-10-25').faixas.length,0);assert.equal(consultar('2026-11-02').fechamento,'Finados');
});
test('inconsistências são separadas sem apagar horários, categorias ou registros',()=>{
 const estado={aulas:[aula('valida','2026-10-20T07:00:00-03:00','2026-10-20T07:50:00-03:00'),aula('almoco','2026-10-20T11:00:00-03:00','2026-10-20T12:00:00-03:00'),aula('sobrepoe','2026-10-20T10:30:00-03:00','2026-10-20T11:30:00-03:00'),aula('noite','2026-10-20T19:00:00-03:00','2026-10-20T20:00:00-03:00'),aula('outra-data','2026-10-21T08:00:00-03:00','2026-10-21T09:00:00-03:00')]};
 const antes=JSON.stringify(estado),agenda=agendaDeHoje(estado,'i',new Date('2026-10-20T17:00:00-03:00'));
 assert.deepEqual(agenda.aulas.map(a=>a.id),['valida']);assert.deepEqual(agenda.inconsistencias.map(a=>a.id),['sobrepoe','almoco','noite']);assert.equal(JSON.stringify(estado),antes);
});
test('dia vem de Brasília, inclusive com timestamps UTC e na virada',()=>{
 const estado={aulas:[aula('hoje','2026-10-20T10:00:00Z','2026-10-20T10:50:00Z'),{...aula('outro','2026-10-20T10:00:00Z','2026-10-20T10:50:00Z'),instrutorId:'outro'}]};
 assert.equal(agendaDeHoje(estado,'i',new Date('2026-10-20T02:59:59Z')).dia,'2026-10-19');
 const nova=agendaDeHoje(estado,'i',new Date('2026-10-20T03:00:00Z'));assert.equal(nova.dia,'2026-10-20');assert.deepEqual(nova.aulas.map(a=>a.id),['hoje']);
});
test('duração anterior de 60 minutos não retira 09h e 14h do expediente',()=>{
 const estado={aulas:[aula('antiga09','2026-10-20T09:00:00-03:00','2026-10-20T10:00:00-03:00'),aula('antiga14','2026-10-20T14:00:00-03:00','2026-10-20T15:00:00-03:00'),aula('nova18','2026-10-20T18:00:00-03:00','2026-10-20T18:50:00-03:00')]};
 const antes=JSON.stringify(estado),agenda=agendaDeHoje(estado,'i',new Date('2026-10-20T17:00:00-03:00'));
 assert.equal(agenda.inconsistencias.length,0);assert.equal(agenda.aulas.length,3);assert.equal(agenda.aulas[0].duracaoAnterior,true);assert.equal(agenda.aulas[1].duracaoAnterior,true);assert.equal(agenda.aulas[2].duracaoAnterior,undefined);assert.equal(JSON.stringify(estado),antes);
});
test('projeção visual recebe jornada resolvida sem assumir início, fim ou intervalo',()=>{
 const horarios=[8,9,10,11,14,15,16],antes=JSON.stringify(horarios),p=projetarFaixasJornada(horarios);
 assert.equal(p.periodoExibicao,'08:00 — 16:50');assert.equal(p.faixas.length,9);
 assert.deepEqual(p.faixas.filter(f=>f.bloqueado).map(f=>f.inicio),['12:00','13:00']);
 assert.equal(JSON.stringify(horarios),antes);assert.deepEqual(projetarFaixasJornada([]),{faixas:[],periodoExibicao:''});
 assert.throws(()=>projetarFaixasJornada([7,25]));
 // Projetar outra jornada não muda as validações centrais atuais.
 const atual=agendaDeHoje({instrutor:{id:'i',horarioAlmoco:'11-12'},aulas:[]},'i',new Date('2026-10-20T10:00:00-03:00'));
 assert.equal(atual.periodoExibicao,'07:00 — 18:50');
 assert.deepEqual(atual.faixas.filter(f=>f.bloqueado).map(f=>f.inicio),['11:00','12:00']);
});
