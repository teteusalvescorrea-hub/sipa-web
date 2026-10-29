import test from 'node:test';
import assert from 'node:assert/strict';
import {periodoDesempenho,desempenhoInstrutor} from '../shared/js/desempenhoInstrutor.js';
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
test('painel proprio atualiza semana e mes sem incluir falta em presencas',()=>{
 const aulas=[aula('p','2026-10-19'),aula('f','2026-10-18',6)].map(a=>({...a,inicio:a.data+'T07:00:00-03:00'}));const r=resumoInstrutor({aulas},'i',agora.getTime());assert.equal(r.realizadasSemana,1);assert.equal(r.presencasMes,1);assert.equal(r.faltasMes,1);
});
