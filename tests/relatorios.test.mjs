import test from 'node:test';
import assert from 'node:assert/strict';
import {dataRelatorio,apresentarRelatorio,valorIndicador} from '../shared/js/apresentacaoRelatorios.js';
import {gerarRelatorio} from '../shared/js/relatoriosAdministrativos.js';
import {permissoesDoPerfil} from '../shared/js/permissoesAdministrativas.js';
const op=p=>({id:'g',nome:'Gerente',perfil:p,nivel:p==='master'?3:2,unidade:'Vila Velha',permissoes:permissoesDoPerfil(p)});
const f={tipo:'aulas',inicio:'2026-10-19',fim:'2026-10-28'};
const aula=(id,data,inicio,status=1,unidade='Vila Velha')=>({id,data,inicio,fim:inicio.slice(0,2)+':50',status,unidade,alunoId:'s',instrutorId:'i',veiculoId:'v',categoria:'B'});
test('datas civis não mudam de dia; timestamps usam Brasília e percentuais usam vírgula',()=>{assert.equal(dataRelatorio('2026-10-28'),'28/10/2026');assert.equal(dataRelatorio('2026-10-28T01:30:00Z'),'27/10/2026 22:30');assert.equal(valorIndicador('ocupacao',.2),'0,2%');assert.equal(valorIndicador('ocupacao',null),'Sem base elegível');});
test('ordenação crescente e desempate por ID preservam aulas distintas, totais e dados',()=>{
 const e={alunos:[],recursos:[],aulas:[aula('z','2026-10-20','09:00',5),aula('b','2026-10-19','07:00',6),aula('a','2026-10-19','07:00',2),aula('c','2026-10-19','08:00')]},antes=structuredClone(e),r=gerarRelatorio(e,op('gerencia'),f),v=apresentarRelatorio(r);
 assert.deepEqual(r.linhas.map(l=>l[7]),['Cancelada','Falta','Confirmada','Realizada']);assert.equal(v.linhas[0][0],'19/10/2026');assert.equal(r.linhas[0][0],'2026-10-19');assert.deepEqual(v.totais,r.totais);assert.deepEqual([r.totais.agendadas,r.totais.realizadas,r.totais.faltas,r.totais.canceladas],[1,1,1,1]);assert.deepEqual(e,antes);
});
test('todos os filtros de aulas e escopo permanecem ativos',()=>{const e={alunos:[],recursos:[],aulas:[aula('a','2026-10-19','08:00'),aula('b','2026-10-20','09:00',5),aula('c','2026-10-20','09:00',1,'Itaparica')]};for(const extra of [{categoria:'A'},{alunoId:'outro'},{instrutorId:'outro'},{veiculoId:'outro'},{status:2},{horaInicio:'10:00'},{horaFim:'07:00'},{inicio:'2026-10-21'}])assert.equal(gerarRelatorio(e,op('gerencia'),{...f,...extra}).linhas.length,0);assert.equal(gerarRelatorio(e,op('gerencia'),f).linhas.length,2);assert.equal(gerarRelatorio(e,op('master'),f).linhas.length,3);assert.throws(()=>gerarRelatorio(e,op('gerencia'),{...f,unidade:'Itaparica'}));});
