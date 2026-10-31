import test from 'node:test';
import assert from 'node:assert/strict';
import {resumoInstrutor,registrarSituacao,ORIGEM} from '../instrutor/js/dominio.js';
const aula=(id,inicio,status=1,instrutorId='i')=>({id,inicio,status,instrutorId,origem:ORIGEM});
test('realizadas do mês respeitam Brasília, limites e instrutor sem contar outros status',()=>{
 const estado={aulas:[aula('setembro','2026-10-01T02:59:59Z',5),aula('outubro','2026-10-01T03:00:00Z',5),aula('ultima','2026-11-01T02:59:59Z',5),aula('novembro','2026-11-01T03:00:00Z',5),aula('outro','2026-10-20T09:00:00-03:00',5,'j'),...[1,2,3,4,6].map(s=>aula('status'+s,'2026-10-20T09:00:00-03:00',s))]};
 const antes=JSON.stringify(estado),r=resumoInstrutor(estado,'i',Date.parse('2026-10-31T23:59:59-03:00'));
 assert.equal(r.realizadasMes,2);assert.equal(r.realizadas,1);assert.equal(JSON.stringify(estado),antes);
 for(const [ano,dia] of [['2024','29'],['2025','28']])assert.equal(resumoInstrutor({aulas:[aula('fevereiro',ano+'-02-'+dia+'T18:00:00-03:00',5),aula('marco',ano+'-03-01T07:00:00-03:00',5)]},'i',Date.parse(ano+'-02-'+dia+'T23:00:00-03:00')).realizadasMes,1);
});
test('registro de realização atualiza hoje e mês; próxima aula é futura e confirmada',()=>{
 const agora=Date.parse('2026-10-20T10:00:00-03:00'),estado={origem:ORIGEM,aulas:[aula('presenca','2026-10-20T09:00:00-03:00'),aula('concluida','2026-10-20T11:00:00-03:00',5),aula('cancelada','2026-10-20T12:00:00-03:00',2),aula('falta','2026-10-20T13:00:00-03:00',6),{...aula('proxima','2026-10-20T14:00:00-03:00'),fim:'2026-10-20T14:50:00-03:00'},aula('outra','2026-10-20T10:30:00-03:00',1,'j')]};
 const antes=resumoInstrutor(estado,'i',agora),novo=registrarSituacao(estado,'presenca','i',5,agora),depois=resumoInstrutor(novo,'i',agora);
 assert.equal(depois.realizadas,antes.realizadas+1);assert.equal(depois.realizadasMes,antes.realizadasMes+1);assert.equal(depois.proxima.id,'proxima');assert.equal(depois.proxima.fim,'2026-10-20T14:50:00-03:00');assert.equal(estado.aulas[0].status,1);
 assert.equal(resumoInstrutor({aulas:novo.aulas.filter(a=>a.id!=='proxima')},'i',agora).proxima,null);
});
