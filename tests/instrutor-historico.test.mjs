import test from 'node:test';
import assert from 'node:assert/strict';
import {periodoMensal,moverMes,validarPeriodo,consultarHistorico,consultarAbaHistorico,paginarHistorico,numerosPaginas} from '../instrutor/js/historico.js';
test('mês calcula 28,29,30,31 dias e navega entre anos',()=>{
 for(const [mes,fim] of [['2025-02','28'],['2024-02','29'],['2026-04','30'],['2026-10','31']])assert.deepEqual(periodoMensal(mes),{inicio:mes+'-01',fim:mes+'-'+fim});
 assert.equal(moverMes('2026-01',-1),'2025-12');assert.equal(moverMes('2026-12',1),'2027-01');assert.throws(()=>periodoMensal('2026-13'));
});
test('períodos inválidos são recusados e podem atravessar anos',()=>{
 for(const p of [['',''],['2026-02-30','2026-03-01'],['2026-10-20','2026-10-19']])assert.throws(()=>validarPeriodo(...p));
 assert.deepEqual(validarPeriodo('2025-12-20','2026-01-15'),{inicio:'2025-12-20',fim:'2026-01-15'});
});
test('limites inclusivos em Brasília, status, instrutor e horários originais preservados',()=>{
 const aula=(id,inicio,status=1,instrutorId='i')=>({id,inicio,status,instrutorId,fim:'registro-original'});
 const aulas=[aula('antes','2026-10-01T02:59:59Z'),aula('primeira','2026-10-01T03:00:00Z',5),aula('falta','2026-10-15T14:00:00-03:00',6),aula('cancelada','2026-10-15T09:00:00-03:00',2),aula('ultima','2026-11-01T02:59:59Z'),aula('depois','2026-11-01T03:00:00Z'),aula('outro','2026-10-15T12:00:00-03:00',5,'j')];
 const antes=JSON.stringify(aulas),q={...periodoMensal('2026-10'),status:'todas'},r=consultarHistorico(aulas,'i',q);
 assert.equal(r.total,4);assert.deepEqual(r.grupos.map(g=>g.dia),['2026-10-31','2026-10-15','2026-10-01']);
 assert.deepEqual(r.grupos[1].aulas.map(a=>a.id),['falta','cancelada']);assert.equal(r.grupos[0].aulas[0].status,1);
 for(const status of ['5','6','2'])assert.equal(consultarHistorico(aulas,'i',{...q,status}).total,1);
 assert.equal(consultarHistorico(aulas,'j',q).total,1);assert.equal(consultarHistorico(aulas,'i',periodoMensal('2027-01')).total,0);assert.equal(JSON.stringify(aulas),antes);
});
test('quatro abas: dia crescente, resultados globais e canceladas apenas no completo',()=>{
 const aula=(id,inicio,status,instrutorId='i')=>({id,inicio,status,instrutorId});
 const aulas=[aula('realizada-antiga','2025-01-02T09:00:00-03:00',5),aula('falta-antiga','2025-03-04T10:00:00-03:00',6),aula('confirmada','2026-10-20T18:00:00-03:00',1),aula('realizada','2026-10-20T09:00:00-03:00',5),aula('falta','2026-10-20T14:00:00-03:00',6),aula('cancelada','2026-10-20T08:00:00-03:00',2),aula('outro','2026-10-20T09:00:00-03:00',5,'j')];
 const opts={instante:new Date('2026-10-20T13:00:00Z')},antes=JSON.stringify(aulas);
 assert.deepEqual(consultarAbaHistorico(aulas,'i','dia',opts).grupos[0].aulas.map(a=>a.id),['realizada','falta','confirmada']);
 for(const [aba,ids] of [['5',['realizada','realizada-antiga']],['6',['falta','falta-antiga']]])assert.deepEqual(consultarAbaHistorico(aulas,'i',aba,opts).grupos.flatMap(g=>g.aulas.map(a=>a.id)),ids);
 assert.equal(consultarAbaHistorico(aulas,'i','completo',opts).total,4);
 assert.equal(consultarAbaHistorico(aulas,'i','completo',{...opts,periodo:periodoMensal('2025-01')}).total,1);assert.equal(JSON.stringify(aulas),antes);
 assert.throws(()=>consultarAbaHistorico(aulas,'i','2',opts));
});
test('paginação conta aulas, não dias, sem perdas, duplicações ou gravação',()=>{
 for(const [total,paginas] of [[0,0],[8,1],[25,3],[48,5],[100,10],[250,25]]){
  const resultado={grupos:[{dia:'2026-10-20',aulas:Array.from({length:total},(_,i)=>({id:'aula-'+i}))}]},antes=JSON.stringify(resultado),ids=[];
  assert.equal(paginarHistorico(resultado).totalPaginas,paginas);
  for(let pagina=1;pagina<=paginas;pagina++){const p=paginarHistorico(resultado,pagina),registros=p.grupos.flatMap(g=>g.aulas);assert.ok(registros.length<=10);assert.equal(p.inicioRegistro,(pagina-1)*10+1);assert.equal(p.fimRegistro,Math.min(pagina*10,total));ids.push(...registros.map(r=>r.id));if(total>10)assert.equal(p.grupos[0].dia,'2026-10-20');}
  assert.equal(ids.length,total);assert.equal(new Set(ids).size,total);assert.equal(JSON.stringify(resultado),antes);
  assert.equal(paginarHistorico(resultado,999).pagina,Math.max(1,paginas));assert.equal(paginarHistorico(resultado,-3).pagina,1);
 }
 const dividido={grupos:[{dia:'2026-10-20',aulas:Array.from({length:15},(_,i)=>({id:i}))},{dia:'2026-10-19',aulas:[{id:15}]}]};
 assert.deepEqual(paginarHistorico(dividido,2).grupos.map(g=>[g.dia,g.aulas.length]),[['2026-10-20',5],['2026-10-19',1]]);
});
test('números inteligentes mostram início, vizinhança, final e reticências',()=>{
 assert.deepEqual(numerosPaginas(1,20),[1,2,3,4,5,'…',20]);
 assert.deepEqual(numerosPaginas(10,20),[1,'…',8,9,10,11,12,'…',20]);
 assert.deepEqual(numerosPaginas(20,20),[1,'…',16,17,18,19,20]);
 assert.deepEqual(numerosPaginas(10,20,true),[1,'…',9,10,11,'…',20]);
 assert.deepEqual(numerosPaginas(1,0),[]);assert.deepEqual(numerosPaginas(1,1),[1]);
 for(let pagina=1;pagina<=25;pagina++)for(const compacta of [false,true]){const n=numerosPaginas(pagina,25,compacta);assert.ok(n.includes(1)&&n.includes(25)&&n.includes(pagina));assert.ok(n.every(v=>v==='…'||v>=1&&v<=25));assert.ok(n.length<=9);}
});
test('situações do completo usam status reais, contagens do período e paginação filtrada',()=>{
 const aulas=Array.from({length:80},(_,i)=>({id:'a'+i,instrutorId:'i',inicio:'2026-10-20T09:00:00-03:00',status:i<45?5:i<50?6:i<60?2:1}));
 aulas.push({id:'outro',instrutorId:'j',inicio:'2026-10-20T09:00:00-03:00',status:5},{id:'setembro',instrutorId:'i',inicio:'2026-09-20T09:00:00-03:00',status:6});
 const antes=JSON.stringify(aulas),periodo=periodoMensal('2026-10');
 for(const [status,total,paginas] of [['todas',80,8],['5',45,5],['6',5,1],['2',10,1]]){
  const r=consultarAbaHistorico(aulas,'i','completo',{periodo,status});assert.equal(r.total,total);assert.deepEqual(r.contagens,{todas:80,5:45,6:5,2:10});assert.equal(paginarHistorico(r).totalPaginas,paginas);
  if(status!=='todas')assert.ok(r.grupos.every(g=>g.aulas.every(a=>String(a.status)===status)));
 }
 const vazio=consultarAbaHistorico(aulas,'i','completo',{periodo:periodoMensal('2026-09'),status:'5'});assert.equal(vazio.total,0);assert.deepEqual(vazio.contagens,{todas:1,5:0,6:1,2:0});assert.equal(paginarHistorico(vazio).totalPaginas,0);
 assert.equal(JSON.stringify(aulas),antes);assert.throws(()=>consultarAbaHistorico(aulas,'i','completo',{periodo,status:'1'}));
});
