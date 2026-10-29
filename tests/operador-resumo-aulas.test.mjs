import test from 'node:test';
import assert from 'node:assert/strict';
import {resumoAulasAluno} from '../nivel-1-operador/js/dominioOperador.js';
import {servicoOperador} from '../nivel-1-operador/js/servicoOperador.js';
const aluno={id:'interno',categoria:'AB',nome:'Nome repetido',cpf:'52998224725',unidade:'Itaparica',unidadePrincipal:'Itaparica',aulasAdquiridas:{A:5,B:10},creditos:{A:{disponiveis:2},B:{disponiveis:3}},historico:[{tipo:'cadastro'}]};
const aulas=[['a', 'A',5],['b','B',5],['c','A',6],['d','B',6],['e','B',1],['f','A',2]].map(([id,categoria,status])=>({id,alunoId:aluno.id,categoria,status,unidade:'Cobilândia'}));
test('A, B e AB: adquiridas vêm do cadastro, resultados reais independentes de unidade',()=>{
 for(const categoria of ['A','B','AB']){
  const a={...aluno,categoria},e={aulas},antes=structuredClone({a,e}),r=resumoAulasAluno(e,a);
  assert.deepEqual(Object.keys(r),categoria==='AB'?['A','B']:[categoria]);
  for(const c of Object.keys(r))assert.deepEqual(r[c],{adquiridas:c==='A'?5:10,realizadas:1,faltas:1});
  assert.deepEqual({a,e},antes);
 }
});
test('ID interno distingue alunos; ID da aula evita duplicações e aceita correção atual',()=>{
 const e={aulas:[...aulas,{...aulas[0]}, {...aulas[1],status:6,validadaEm:'2026-10-21T12:00:00Z'}, {...aulas[1],status:5,validadaEm:'2026-10-20T12:00:00Z'},{...aulas[0],id:'outro',alunoId:'outro-aluno'}]};
 assert.deepEqual(resumoAulasAluno(e,aluno),{A:{adquiridas:5,realizadas:1,faltas:1},B:{adquiridas:10,realizadas:0,faltas:2}});
});
test('quantidade ausente não usa saldo ou contratadas como substituto; zero é válido',()=>{
 assert.equal(resumoAulasAluno({aulas:[]},{...aluno,aulasAdquiridas:undefined,creditos:{A:{contratadas:20}}}).A.adquiridas,null);
 assert.equal(resumoAulasAluno({aulas:[]},{...aluno,aulasAdquiridas:{A:0}}).A.adquiridas,0);
});
test('serviço relê fonte em cada consulta sem escrever saldos ou históricos',async()=>{
 let estado={alunos:[structuredClone(aluno)],aulas:structuredClone(aulas),recursos:[]};
 const s=servicoOperador({ler:async()=>structuredClone(estado),alterar:()=>{throw Error('Escrita indevida');}},{id:'op',unidade:'Itaparica',permissoes:['consultar']});
 const antes=structuredClone(estado);assert.equal((await s.ficha(aluno.id)).resumoAulas.B.realizadas,1);
 estado.aulas.find(a=>a.id==='e').status=5;assert.equal((await s.ficha(aluno.id)).resumoAulas.B.realizadas,2);
 estado.aulas.find(a=>a.id==='e').status=6;assert.equal((await s.ficha(aluno.id)).resumoAulas.B.realizadas,1);assert.equal((await s.ficha(aluno.id)).resumoAulas.B.faltas,2);
 assert.deepEqual(estado.alunos,antes.alunos);assert.deepEqual((await s.ficha(aluno.id)).aluno.historico,aluno.historico);
});
