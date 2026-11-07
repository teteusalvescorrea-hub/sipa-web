import test from 'node:test';
import assert from 'node:assert/strict';
import {selecionarPaginaAulas} from '../aluno/js/components/filtrosAulas.js';
const aulas=Array.from({length:12},(_,i)=>({id:String(i),categoria:i%2?'A':'B',unidade:'Centro',inicio:`2026-11-${String(i+1).padStart(2,'0')}T10:00:00-03:00`}));
test('minhas aulas filtra categoria e datas inclusivas antes de paginar',()=>{
 const r=selecionarPaginaAulas(aulas,{categoria:'A',de:'2026-11-02',ate:'2026-11-10'},1,3);
 assert.equal(r.total,5);assert.equal(r.paginas,2);assert.deepEqual(r.itens.map(a=>a.id),['1','3','5']);
 assert.deepEqual(selecionarPaginaAulas(aulas,{categoria:'A',de:'2026-11-02',ate:'2026-11-10'},2,3).itens.map(a=>a.id),['7','9']);
});
test('minhas aulas limita a página após filtrar e trata nenhum resultado',()=>{
 assert.equal(selecionarPaginaAulas(aulas,{},99).pagina,3);
 const vazio=selecionarPaginaAulas(aulas,{categoria:'D'},8);assert.equal(vazio.total,0);assert.equal(vazio.pagina,1);assert.deepEqual(vazio.itens,[]);
});
