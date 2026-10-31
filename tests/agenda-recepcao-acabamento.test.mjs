import test from 'node:test';
import assert from 'node:assert/strict';
import {editarVeiculo,paresNaUnidade,motivoRecursoIndisponivel,agendarAula} from '../nivel-1-operador/js/dominioOperador.js';
const agora=new Date('2026-10-19T06:00:00-03:00'),op={id:'recepcao',perfil:'operador',nivel:1,unidade:'Itaparica',permissoes:['consultar','editar-veiculo','agendar']};
const base=()=>({alunos:[{id:'s',nome:'Aluno Teste',cpf:'52998224725',categoria:'B',tipoCambio:'manual',unidade:'Itaparica',unidadePrincipal:'Itaparica',unidadeCarro:'Itaparica',aulasAdquiridas:{B:10},creditos:{B:{contratadas:10,disponiveis:9}},historico:[]}],recursos:[{id:'v',tipo:'Veículos',nome:'Carro fictício 1',placa:'DEMO-B1',categoria:'B',unidade:'Itaparica',ativo:true},{id:'i',tipo:'Instrutores',nome:'Instrutor existente',categorias:['B'],veiculoIds:['v'],unidade:'Itaparica',ativo:true,horarioAlmoco:'12:00/14:00'}],aulas:[{id:'historica',alunoId:'s',categoria:'B',veiculoId:'v',instrutorId:'i',data:'2026-10-16',inicio:'09:00',fim:'09:50',unidade:'Itaparica',status:5,historico:[{acao:'realizada'}]}]});
test('carro legado exige regularizacao explicita, depois permite reservar de verdade preservando o historico',()=>{
 const e=base(),antes=structuredClone(e),f={categoria:'B',veiculoId:'v'};
 assert.deepEqual(paresNaUnidade(e,op,'2026-10-23','09:00',f,agora),[]);
 assert.match(motivoRecursoIndisponivel(e,op,'2026-10-23','09:00',f,agora),/câmbio/);
 const n=editarVeiculo(e,op,'v',{nome:'Carro fictício 1',identificacao:'DEMO-B1',tipoCambio:'manual'},agora);
 assert.equal(n.recursos.length,e.recursos.length);assert.equal(n.recursos[0].id,'v');assert.equal(n.recursos[0].tipoCambio,'manual');assert.deepEqual(n.aulas,e.aulas);assert.deepEqual(e,antes);
 assert.equal(paresNaUnidade(n,op,'2026-10-23','09:00',f,agora).length,1);
 const r=agendarAula(n,op,{...f,alunoId:'s',data:'2026-10-23',inicio:'09:00',instrutorId:'i'},'reserva-nova',agora);
 assert.equal(r.aulas.at(-1).fim,'09:50');assert.equal(r.alunos[0].creditos.B.disponiveis,8);assert.deepEqual(r.aulas[0],e.aulas[0]);
 assert.throws(()=>agendarAula(r,op,{...f,alunoId:'s',data:'2026-10-23',inicio:'09:00',instrutorId:'i'},'duplicada',agora),/conflito|indispon/);
});
test('regularizacao nao troca cambio configurado nem ignora unidade, permissao ou reservas futuras',()=>{
 const e=base(),d={nome:'Carro teste',identificacao:'DEMO-B1',tipoCambio:'manual'};
 assert.throws(()=>editarVeiculo(e,{...op,unidade:'Santa Rita'},'v',d,agora),/escopo/);
 assert.throws(()=>editarVeiculo(e,{...op,permissoes:['consultar']},'v',d,agora),/Permiss/);
 e.recursos[0].tipoCambio='automatico';assert.throws(()=>editarVeiculo(e,op,'v',d,agora),/protegido/);
 delete e.recursos[0].tipoCambio;e.aulas.push({...e.aulas[0],id:'futura',data:'2026-10-23',status:1,tipoCambio:'automatico'});
 assert.throws(()=>editarVeiculo(e,op,'v',d,agora),/reservas futuras/);assert.equal(e.recursos[0].tipoCambio,undefined);
});
test('grade mantem almoco, sabado reduzido, passado, vinculo e bloqueios reais',()=>{
 let e=editarVeiculo(base(),op,'v',{nome:'Carro teste',identificacao:'DEMO-B1',tipoCambio:'manual'},agora);const f={categoria:'B',veiculoId:'v'};
 for(const [d,h] of [['2026-10-23','12:00'],['2026-10-23','13:00'],['2026-10-24','14:00'],['2026-10-18','09:00']])assert.equal(paresNaUnidade(e,op,d,h,f,agora).length,0);
 assert.ok(paresNaUnidade(e,op,'2026-10-23','14:00',f,agora).length);
 e.recursos[1].veiculoIds=[];assert.equal(paresNaUnidade(e,op,'2026-10-23','14:00',f,agora).length,0);
 e.recursos[1].veiculoIds=['v'];e.recursos[0].datasBloqueadas=['2026-10-23'];assert.equal(paresNaUnidade(e,op,'2026-10-23','14:00',f,agora).length,0);
});
