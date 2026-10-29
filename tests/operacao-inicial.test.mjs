import test from 'node:test';import assert from 'node:assert/strict';
import {prepararOperacaoInicial} from '../dev/operador/operacaoInicial.js';
import {validarHorario} from '../shared/js/disponibilidade.js';
import {recursoCarroCompativel,operacaoCarro} from '../shared/js/operacaoCarro.js';
const agora=new Date('2026-10-19T08:00:00-03:00');
test('preparacao idempotente respeita frotas, nao cria contas e preserva registros manuais',()=>{
 const inicial={versao:2,alunos:[],aulas:[],recursos:[]},e=prepararOperacaoInicial(inicial,agora);
 for(const [u,n] of [['Terra Vermelha',3],['Vila Velha',4],['Cobilândia',2],['Itaparica',2],['Santa Rita',1],['Novo Milênio',0]])assert.equal(e.recursos.filter(r=>r.tipo==='Veículos'&&r.categoria==='B'&&r.unidade===u).length,n);
 assert.equal(e.recursos.filter(r=>r.tipo==='Veículos'&&r.categoria==='A').length,6);assert.equal(e.recursos.filter(r=>r.tipo==='Instrutores'&&r.categorias.includes('A')).length,3);
 assert.ok(e.aulas.length>0);assert.equal(e.contasAlunos,undefined);assert.deepEqual(prepararOperacaoInicial(e,agora),e);assert.equal(inicial.recursos.length,0);
 const manual={id:'manual',nome:'Manual',tipo:'Outros',unidade:'Itaparica'};const n=prepararOperacaoInicial({...inicial,recursos:[manual]},agora);assert.deepEqual(n.recursos.find(r=>r.id==='manual'),manual);
});
test('sabado tem ultima aula as 11h para A/B e onibus integral, preservando almoco',()=>{
 for(const c of ['A','B']){assert.equal(validarHorario('2026-10-24','11:00',undefined,{horarioAlmoco:'12:00/14:00'},c),'');assert.ok(validarHorario('2026-10-24','12:00',undefined,undefined,c));}
 assert.equal(validarHorario('2026-10-24','18:00',undefined,{horarioAlmoco:'12:00/14:00'},'D'),'');assert.ok(validarHorario('2026-10-24','12:00',undefined,{horarioAlmoco:'12:00/14:00'},'D'));
});
test('Novo Milenio compartilha Centro sem abrir dados administrativos nem criar frota',()=>{
 const a={unidadeCarro:'Novo Milênio',tipoCambio:'manual'},r={tipo:'Veículos',categoria:'B',tipoCambio:'manual',unidade:'Vila Velha'};assert.equal(operacaoCarro(a,'2026-10-23').destino,'Vila Velha');assert.ok(recursoCarroCompativel(r,a,'2026-10-23'));assert.ok(!recursoCarroCompativel({...r,unidade:'Itaparica'},a,'2026-10-23'));
});
