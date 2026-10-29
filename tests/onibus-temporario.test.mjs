import test from 'node:test';
import assert from 'node:assert/strict';
import {prepararOnibusTemporario,IDS_ONIBUS_TEMPORARIO} from '../dev/operador/onibusTemporario.js';
import {recursosOperacionaisD,motivoCatalogoOnibus,motivoAlmoco,onibusTemporario} from '../shared/js/categorias.js';
import {projetarContaRecepcao} from '../dev/aluno/servicoRecepcao.js';
import {consultarRecursosLocais} from '../dev/aluno/authLocal.js';
import {cadastrarRecurso,paresNaUnidade,consultarRecursos} from '../nivel-1-operador/js/dominioOperador.js';
const estado=()=>({alunos:[{id:'aluno',categoria:'D',unidade:'Itaparica',cpf:'11111111111',aulasAdquiridas:{D:10},etapas:{},historico:[]}],aulas:[],recursos:[]});
const local=()=>{globalThis.location={href:'http://localhost/aluno/html/agendamento.html?ambiente=local'};};
test.after(()=>{delete globalThis.location;});
const reais=()=>[{id:'real-i',tipo:'Instrutores',nome:'Instrutor cadastrado',unidade:'Santa Rita',ativo:true,categorias:['D'],horarioAlmoco:'12-13'},{id:'real-v',tipo:'Veículos',nome:'Ônibus cadastrado',unidade:'Itaparica',ativo:true,categoria:'D'}];

test('fora do desenvolvimento explícito não cria nem utiliza recursos temporários',()=>{
 local();const seeded=prepararOnibusTemporario(estado());
 for(const href of ['https://sipa.example/?ambiente=local&demo=1','http://localhost/?ambiente=integrado','http://192.168.0.1/?ambiente=local']){globalThis.location={href};const e=estado();assert.equal(prepararOnibusTemporario(e),e);assert.deepEqual(recursosOperacionaisD(seeded.recursos),[]);assert.deepEqual(consultarRecursos(seeded,{id:'op',unidade:'Cobilândia',permissoes:['consultar']}),[]);}
});
test('sem aluno D não grava recursos; par único é idempotente e não altera alunos ou créditos',()=>{
 local();const vazio={alunos:[],recursos:[],aulas:[]};assert.equal(prepararOnibusTemporario(vazio),vazio);
 const e=estado(),antes=structuredClone(e),n=prepararOnibusTemporario(e);assert.deepEqual(e,antes);assert.deepEqual(n.alunos,e.alunos);assert.deepEqual(n.recursos.map(r=>r.id),Object.values(IDS_ONIBUS_TEMPORARIO));assert.equal(prepararOnibusTemporario(n),n);assert.equal(motivoCatalogoOnibus(n.recursos),'');assert.equal(n.recursos[0].veiculoIds[0],n.recursos[1].id);
});
test('par real completo prevalece, parcial não se mistura com temporários e duplicados não são ocultados',()=>{
 local();const e=estado();e.recursos=reais();assert.equal(prepararOnibusTemporario(e),e);assert.deepEqual(recursosOperacionaisD(e.recursos),e.recursos);
 const seeded=prepararOnibusTemporario(estado()),parcial={...seeded,recursos:[...seeded.recursos,reais()[0]]};assert.ok(recursosOperacionaisD(parcial.recursos).every(onibusTemporario));
 const completo={...seeded,recursos:[...seeded.recursos,...reais()]};assert.deepEqual(recursosOperacionaisD(completo.recursos).map(r=>r.id),['real-i','real-v']);assert.equal(prepararOnibusTemporario(completo),completo);
 const duplicado={...completo,recursos:[...completo.recursos,{...reais()[0],id:'duplicado'}]};assert.match(motivoCatalogoOnibus(duplicado.recursos),/único/);
});
test('colisões e desativações existentes não são sobrescritas ou reativadas',()=>{
 local();const e=estado();e.recursos=[{id:IDS_ONIBUS_TEMPORARIO.instrutor,nome:'Não temporário'}];assert.throws(()=>prepararOnibusTemporario(e),/Identificador/);
 const n=prepararOnibusTemporario(estado());n.recursos[0].ativo=false;assert.equal(prepararOnibusTemporario(n),n);assert.ok(motivoCatalogoOnibus(n.recursos));
});
test('instrutor temporário: 12h bloqueado, 13h permitido; almoço legado permanece intacto',async()=>{
 local();const e=prepararOnibusTemporario(estado()),i=e.recursos[0];assert.ok(motivoAlmoco(i,'12:00'));assert.equal(motivoAlmoco(i,'13:00'),'');assert.ok(motivoAlmoco({horarioAlmoco:'12-13'},'13:00'));
 const d=projetarContaRecepcao({aluno:e.alunos[0],recursos:e.recursos,aulas:[],ocupacoes:[]});
 for(const data of ['2026-12-16','2026-12-19']){const r=await consultarRecursosLocais(d,{categoria:'D',unidade:'Itaparica',data},'2026-10-19T08:00:00');assert.equal(r.horarios.length,11);assert.ok(!r.horarios.some(h=>h.hora==='12:00'));assert.ok(r.horarios.some(h=>h.hora==='13:00'));assert.ok(r.horarios.some(h=>h.hora==='18:00'&&h.fim==='18:50'));}
 assert.equal((await consultarRecursosLocais(d,{categoria:'D',unidade:'Itaparica',data:'2026-12-20'},'2026-10-19T08:00:00')).horarios.length,0);
});
test('cadastro real substitui seleção temporária sem apagar histórico nem liberar reservas antigas',async()=>{
 local();let e=prepararOnibusTemporario(estado());const op={id:'op',unidade:'Cobilândia',permissoes:['consultar','cadastrar-recurso']},base={nome:'Cadastro de teste real',categoria:'D',inicio:'07:00',fim:'19:00',horarioAlmoco:'11-12'};
 e=cadastrarRecurso(e,op,{...base,tipo:'Instrutores',identificacao:'i-real'},'real-i');e=cadastrarRecurso(e,op,{...base,tipo:'Veículos',identificacao:'v-real'},'real-v');
 assert.equal(e.recursos.filter(onibusTemporario).length,2);assert.deepEqual(recursosOperacionaisD(e.recursos).map(r=>r.id),['real-i','real-v']);
 const d=projetarContaRecepcao({aluno:e.alunos[0],recursos:e.recursos,aulas:[],ocupacoes:[{id:'reserva-antiga',categoria:'D',data:'2026-12-19',inicio:'14:00',fim:'14:50',status:1,instrutorId:IDS_ONIBUS_TEMPORARIO.instrutor,veiculoId:IDS_ONIBUS_TEMPORARIO.veiculo}]});
 const r=await consultarRecursosLocais(d,{categoria:'D',unidade:'Itaparica',data:'2026-12-19'},'2026-10-19T08:00:00');assert.ok(!r.horarios.some(h=>h.hora==='14:00'));assert.ok(r.horarios.some(h=>h.hora==='15:00'));
});

test('qualificação D não bloqueia aulas B nem permite instrutor de outra unidade no carro',()=>{
 local();const e=prepararOnibusTemporario(estado());
 e.recursos.push({id:'multi-local',veiculoIds:['carro-local'],tipo:'Instrutores',nome:'Instrutor local',unidade:'Itaparica',categorias:['B','D'],ativo:true,horarioAlmoco:'11-12'},{id:'carro-local',tipo:'Veículos',nome:'Carro local',unidade:'Itaparica',tipoCambio:'manual',categoria:'B',ativo:true});
 const op={id:'op',unidade:'Itaparica',permissoes:['consultar']},consulta=()=>paresNaUnidade(e,op,'2026-12-16','14:00',{tipoCambio:'manual',categoria:'B'},new Date('2026-10-19T08:00:00-03:00'));
 assert.deepEqual(consulta().map(p=>p.instrutorId),['multi-local']);
 e.recursos.push({...e.recursos.find(r=>r.id==='multi-local'),id:'multi-externo',unidade:'Santa Rita'});
 assert.deepEqual(consulta().map(p=>p.instrutorId),['multi-local']);
});
