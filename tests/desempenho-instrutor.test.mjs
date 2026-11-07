import test from 'node:test';
import assert from 'node:assert/strict';
import {periodoDesempenho,desempenhoInstrutor,painelDesempenho,aulasDaSemana,escalaEixo} from '../shared/js/desempenhoInstrutor.js';
import {agruparFaixas,resumoDoDia,proximaDoDia} from '../instrutor/js/agenda.js';
import {servicoOperador} from '../nivel-1-operador/js/servicoOperador.js';
import {resumoInstrutor} from '../instrutor/js/dominio.js';
import {trocarInstrutorVeiculo,instrutoresParaVeiculo} from '../nivel-1-operador/js/dominioOperador.js';
const agora=new Date('2026-10-19T10:00:00-03:00');
const aula=(id,data,status=5,instrutorId='i')=>({id,data,inicio:'07:00',fim:'07:50',status,instrutorId,veiculoId:'v',alunoId:'s',categoria:'B',unidade:'Itaparica'});
for(const [categoria,unidade] of [['A','Vila Velha'],['D','Cobilândia']])test('troca '+categoria+' move apenas futuras e preserva autoria historica',()=>{
 const op={id:'op',nivel:1,unidade,permissoes:['consultar','editar-veiculo']},e={alunos:[],recursos:[{id:'i',nome:'Anterior',tipo:'Instrutores',categorias:[categoria],unidade,ativo:true,veiculoIds:['v']},{id:'j',nome:'Novo',cpf:'11111111111',tipo:'Instrutores',categorias:[categoria],unidade,ativo:true,veiculoIds:[]},{id:'v',tipo:'Veículos',categoria,unidade,ativo:true,instrutorId:'i'}],aulas:[{...aula('futura','2026-10-23',1),categoria,unidade},{...aula('passada','2026-10-18'),categoria,unidade}]};
 const n=trocarInstrutorVeiculo(e,op,'v','j',agora);assert.equal(n.aulas[0].instrutorId,'j');assert.deepEqual(n.aulas[1],e.aulas[1]);assert.equal(e.recursos[2].instrutorId,'i');assert.equal(instrutoresParaVeiculo(e,op,categoria).find(i=>i.id==='j').cpf,'11111111111');
 const conflito=structuredClone(e);conflito.aulas.push({...e.aulas[0],id:'conflito',veiculoId:'outro',instrutorId:'j'});assert.throws(()=>trocarInstrutorVeiculo(conflito,op,'v','j',agora),/Conflitos/);
 if(categoria==='A'){e.recursos.push({id:'m1',tipo:'Veículos',categoria:'A',instrutorId:'j'},{id:'m2',tipo:'Veículos',categoria:'A',instrutorId:'j'});assert.throws(()=>trocarInstrutorVeiculo(e,op,'v','j',agora),/duas motos/);}
});
test('periodos usam Brasilia e semana de segunda a domingo; intervalo invalido falha',()=>{
 assert.deepEqual(periodoDesempenho('hoje',{},new Date('2026-10-20T02:00:00Z')),{inicio:'2026-10-19',fim:'2026-10-19'});
 assert.deepEqual(periodoDesempenho('semana',{},agora),{inicio:'2026-10-19',fim:'2026-10-25'});
 assert.deepEqual(periodoDesempenho('mes',{},agora),{inicio:'2026-10-01',fim:'2026-10-31'});
 assert.throws(()=>periodoDesempenho('periodo',{inicio:'2026-10-20',fim:'2026-10-19'},agora));
});
test('desempenho separa presenca e falta, deduplica e exclui futuros, cancelados e outros instrutores',()=>{
 const aulas=[aula('p','2026-10-19'),aula('f','2026-10-18',6),aula('p','2026-10-19'),aula('cancelada','2026-10-18',2),aula('confirmada','2026-10-18',1),aula('futura','2026-10-20'),aula('outro','2026-10-19',5,'j')],antes=JSON.stringify(aulas);
 const r=desempenhoInstrutor(aulas,'i',periodoDesempenho('mes',{},agora),agora);
 assert.deepEqual([r.concluidas,r.presencas,r.faltas],[2,1,1]);assert.deepEqual(r.historico.map(a=>a.id),['p','f']);assert.equal(JSON.stringify(aulas),antes);
 assert.equal(desempenhoInstrutor(aulas,'i',{inicio:'2026-10-18',fim:'2026-10-18'},agora).faltas,1);
});
test('servico respeita escopo e projeta historico sem documentos privados ou herdar aulas pelo veiculo',async()=>{
 const e={alunos:[{id:'s',nome:'Aluno'}],recursos:[{id:'i',tipo:'Instrutores',nome:'Anterior',unidade:'Itaparica'},{id:'j',tipo:'Instrutores',nome:'Atual',unidade:'Itaparica'},{id:'externo',tipo:'Instrutores',unidade:'Santa Rita'},{id:'v',tipo:'Veículos',nome:'Carro',instrutorId:'j',unidade:'Itaparica'}],aulas:[{...aula('p','2026-10-01'),solicitacaoMedica:{documento:'privado'},historico:[{status:5,autor:'recepcao'}]}]};
 const s=servicoOperador({ler:async()=>e},{id:'op',nivel:1,unidade:'Itaparica',permissoes:['consultar']});
 const anterior=await s.detalhesInstrutor('i',{modo:'periodo',inicio:'2026-10-01',fim:'2026-10-02'}),atual=await s.detalhesInstrutor('j',{modo:'periodo',inicio:'2026-10-01',fim:'2026-10-02'});
 assert.equal(anterior.concluidas,1);assert.equal(atual.concluidas,0);assert.equal(anterior.historico[0].registradoPor,'recepcao');assert.ok(!JSON.stringify(anterior).includes('privado'));assert.equal(anterior.veiculos.length,0);assert.equal(atual.veiculos[0].id,'v');await assert.rejects(()=>s.detalhesInstrutor('externo'));
});
test('painel proprio resume hoje e realizadas no mes sem incluir faltas nas presencas',()=>{
 const aulas=[aula('p','2026-10-19'),aula('f','2026-10-18',6)].map(a=>({...a,inicio:a.data+'T07:00:00-03:00'}));const r=resumoInstrutor({aulas},'i',agora.getTime());assert.deepEqual([r.agendadas,r.realizadas,r.faltas,r.realizadasMes],[0,1,0,1]);
});
const iso=(id,quando,status,extra={})=>({id,inicio:quando+':00-03:00',fim:quando.slice(0,14)+'50:00-03:00',status,instrutorId:'i',categoria:'B',...extra});
const carteira=[iso('r1','2026-10-13T08:00',5),iso('r2','2026-10-14T08:00',5,{categoria:'D'}),iso('r3','2026-10-14T09:00',5),iso('r4','2026-10-12T22:00',5),iso('f1','2026-10-16T14:00',6),iso('antiga','2026-09-01T08:00',5),
 iso('pendente','2026-10-17T10:00',1),iso('andamento','2026-10-19T10:00',1),iso('fut1','2026-10-20T08:00',1),iso('fut2','2026-10-20T09:00',3),iso('domingo','2026-10-25T08:00',1),iso('cancelada','2026-10-15T08:00',2),iso('outro','2026-10-15T08:00',5,{instrutorId:'j'})];
test('meu desempenho: presenca, media, pendentes, semanas e categorias no dia de Brasilia',()=>{
 const antes=JSON.stringify(carteira),p=painelDesempenho(carteira,'i',30,agora);
 assert.deepEqual(p.periodo,{inicio:'2026-09-20',fim:'2026-10-19'});
 assert.deepEqual([p.realizadas,p.faltas,p.presenca,p.mediaSemana,p.aguardandoRegistro],[4,1,80,0.9,1]);
 assert.deepEqual(p.semanas.map(s=>[s.rotulo,s.realizadas,s.faltas]),[['14/09',0,0],['21/09',0,0],['28/09',0,0],['05/10',0,0],['12/10',4,1],['19/10',0,0]]);assert.deepEqual(p.semanas.map(s=>s.desde),['20/09',null,null,null,null,null]);
 assert.deepEqual(p.categorias,[{categoria:'B',total:3},{categoria:'D',total:1}]);
 const noventa=painelDesempenho(carteira,'i',90,agora);assert.equal(noventa.realizadas,5);assert.equal(noventa.semanas.length,14);assert.equal(JSON.stringify(carteira),antes);
 const vazio=painelDesempenho([],'i',30,agora);assert.deepEqual([vazio.presenca,vazio.realizadas],[null,0]);
});
test('esta semana conta aulas ativas so ate hoje; escala do grafico',()=>{
 assert.deepEqual(aulasDaSemana(carteira,'i',agora).map(d=>[d.rotulo,d.dia,d.total]),[['Seg','2026-10-19',1]]);
 assert.deepEqual([escalaEixo(0),escalaEixo(7),escalaEixo(18)],[[0,1,2,3],[0,3,6,9],[0,6,12,18]]);
});
test('agenda mostra todos os horarios, um por linha, e resume o dia',()=>{
 const faixas=['07','08','09','10','11','12','13','14'].map(h=>({inicio:h+':00',fim:String(+h+1).padStart(2,'0')+':00',bloqueado:['12','13'].includes(h),motivo:h==='12'?'Almoço':h==='13'?'Folga':''}));
 const aulas=[iso('a','2026-10-19T10:00',1),iso('b','2026-10-19T14:00',5)];
 assert.deepEqual(agruparFaixas(faixas,aulas).map(i=>[i.tipo,i.inicio,i.ate,i.faixas.length,i.aulas.length]),[['livre','07:00','07:50',1,0],['livre','08:00','08:50',1,0],['livre','09:00','09:50',1,0],['aula','10:00','10:50',1,1],['livre','11:00','11:50',1,0],['pausa','12:00','12:50',1,0],['pausa','13:00','13:50',1,0],['aula','14:00','14:50',1,1]]);
 assert.deepEqual(agruparFaixas(faixas.map(f=>({...f,motivo:f.bloqueado?'Almoço':''})),[]).filter(i=>i.tipo==='pausa').map(i=>[i.inicio,i.ate]),[['12:00','12:50'],['13:00','13:50']]);
 assert.deepEqual(resumoDoDia({faixas,aulas}),{aulas:2,realizadas:1,horasLivres:4});assert.deepEqual(resumoDoDia({faixas,aulas:[...aulas,iso('c','2026-10-19T11:00',2),iso('r','2026-10-19T08:00',4)]}),{aulas:2,realizadas:1,horasLivres:4});
 assert.equal(proximaDoDia([iso('x','2026-10-19T11:00',1),iso('y','2026-10-19T09:00',1),iso('z','2026-10-19T08:00',5)]).id,'y');assert.equal(proximaDoDia([]),null);
});
