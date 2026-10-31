import test from 'node:test';
import assert from 'node:assert/strict';
import {projetarContaRecepcao,elegibilidadeContaRecepcao,acompanhamentoDaConta} from '../dev/aluno/servicoRecepcao.js';
import {pendenciasAgendamento,ETAPAS} from '../shared/js/elegibilidadeAluno.js';
import {consultarRecursosLocais} from '../dev/aluno/authLocal.js';
const contexto=categoria=>({aluno:{id:'original',nome:'Aluno Recepcao',cpf:'11111111111',categoria,unidade:'Itaparica',unidadeCarro:'Santa Rita',aulasAdquiridas:{A:3,B:4,D:6}},recursos:[{id:'i',tipo:'Instrutores',nome:'Instrutor',unidade:'Cobilândia',categorias:['D'],ativo:true,horarioAlmoco:'12-13',disponibilidade:{6:[{inicio:'07:00',fim:'19:00'}]}},{id:'v',tipo:'Veículos',nome:'Onibus',categoria:'D',unidade:'Cobilândia',ativo:true}],aulas:[],ocupacoes:[]});
test('mesmo ID, categorias autorizadas e créditos adquiridos separados, sem defaults ou mutação',()=>{
 for(const categoria of ['A','B','AB','D']){const c=contexto(categoria),antes=structuredClone(c),d=projetarContaRecepcao(c);assert.equal(d.aluno.id,'original');assert.equal(d.aluno.documento,c.aluno.cpf);assert.deepEqual(d.categorias,categoria==='AB'?['A','B']:[categoria]);assert.equal(d.podeConfigurar,false);for(const k of ['A','B','D'])assert.equal(d.resumo.categorias[k].total,categoria.includes(k)?c.aluno.aulasAdquiridas[k]:0);assert.deepEqual(c,antes);}
});
test('saldo explícito zero preservado e presença, falta, reserva e cancelamento não duplicam consumo',()=>{
 const c=contexto('D');c.aulas=[1,5,6,2].map((status,i)=>({id:String(i),alunoId:'original',categoria:'D',unidade:'Cobilândia',data:'2026-10-24',inicio:'14:00',fim:'14:50',instrutorId:'i',veiculoId:'v',status}));c.aulas.push({...c.aulas[1]});let d=projetarContaRecepcao(c);assert.equal(d.resumo.categorias.D.realizadas,1);assert.equal(d.resumo.categorias.D.disponiveis,3);assert.equal(d.resumo.categorias.D.consumidas,3);c.aluno.creditos={D:{contratadas:6,disponiveis:0}};d=projetarContaRecepcao(c);assert.equal(d.resumo.categorias.D.disponiveis,0);assert.equal(d.resumo.categorias.A.total,0);
});
test('catálogo do aluno limita unidade/categoria e não expõe identificação pessoal de instrutores',()=>{
 const c=contexto('D');c.recursos[0].identificacao='documento-restrito';c.recursos.push({id:'fora',tipo:'Veículos',nome:'Carro externo',categoria:'B',unidade:'Santa Rita',ativo:true});const d=projetarContaRecepcao(c);
 assert.ok(!d.registros.some(r=>r.id==='fora'));assert.equal(d.registros.find(r=>r.id==='i').identificacao,undefined);assert.equal(d.registros.find(r=>r.id==='i').horarioAlmoco,'12-13');
});

test('etapas ausentes são identificadas individualmente e não aprovadas na consulta',()=>{
 const c=contexto('D'),antes=structuredClone(c),d=projetarContaRecepcao(c);
 assert.deepEqual(pendenciasAgendamento(d.aluno,'2026-12-16').map(p=>p.tipo),Object.keys(ETAPAS));
 assert.equal(elegibilidadeContaRecepcao(d,'2026-12-16'),'');
 assert.equal(d.resumo.categorias.D.disponiveis,6);assert.deepEqual(c,antes);
});

test('ficha atual e tentativas são reconhecidas pelo mesmo requisito de A, B, AB e D',()=>{
 for(const categoria of ['A','B','AB','D']){
  const a=contexto(categoria).aluno;
  a.etapas=Object.fromEntries(Object.keys(ETAPAS).map(k=>[k,{status:'Aprovado'}]));
  a.etapas.medico.status='Pendente';a.etapas.psicologico.status='Reprovado';a.etapas.teorica.status='Pendente';
  a.examesAdministrativos={medico:{status:'Aprovado'},psicologico:{status:'Aprovado'},oftalmologico:{status:'Não se aplica'},toxicologico:{status:'Aprovado'}};
  a.tentativasProvas=[{tipo:'teorica',status:'Reprovado',ordem:1},{tipo:'teorica',status:'Aprovado',ordem:2},{tipo:'praticaCarro',status:'Agendado'}];
  assert.deepEqual(pendenciasAgendamento(a,'2026-12-16'),[]);
  const antes=structuredClone(a);elegibilidadeContaRecepcao({aluno:a},'2026-12-16');assert.deepEqual(a,antes);
  a.examesAdministrativos.medico.status='Reprovado';assert.deepEqual(pendenciasAgendamento(a,'2026-12-16').map(p=>p.tipo),['medico']);
 }
});

test('validade, resultado pendente e nova tentativa não reutilizam aprovação antiga',()=>{
 const a=contexto('D').aluno;a.etapas=Object.fromEntries(Object.keys(ETAPAS).map(k=>[k,{status:'Aprovado'}]));
 a.etapas.ladv.validade='2026-12-15';assert.equal(pendenciasAgendamento(a,'2026-12-16').find(p=>p.tipo==='ladv').situacao,'Vencido');assert.equal(elegibilidadeContaRecepcao({aluno:a},'2026-12-16'),'');
 a.etapas.ladv.validade='2026-12-16';assert.equal(elegibilidadeContaRecepcao({aluno:a},'2026-12-16'),'');
 a.tentativasProvas=[{tipo:'teorica',status:'Aprovado'},{tipo:'teorica',status:'Agendado'}];assert.equal(pendenciasAgendamento(a,'2026-12-16').find(p=>p.tipo==='teorica').situacao,'Agendado');assert.equal(elegibilidadeContaRecepcao({aluno:a},'2026-12-16'),'');
});

test('16/12: disponibilidade física independe das pendências, jornada e ocupação têm diagnósticos distintos',async()=>{
 const c=contexto('D');c.recursos[0].disponibilidade={3:[{inicio:'07:00',fim:'19:00'}]};
 const q={categoria:'D',data:'2026-12-16',unidade:'Itaparica'},agora='2026-10-19T08:00:00';
 let d=projetarContaRecepcao(c),r=await consultarRecursosLocais(d,q,agora);
 assert.equal(elegibilidadeContaRecepcao(d,q.data),'');assert.equal(r.horarios.length,10);assert.ok(r.horarios.some(h=>h.hora==='18:00'&&h.fim==='18:50'));assert.ok(!r.horarios.some(h=>['12:00','13:00'].includes(h.hora)));
 c.ocupacoes=r.horarios.map((h,i)=>({id:'ocupacao-'+i,instrutorId:'i',veiculoId:'v',data:q.data,inicio:h.hora,fim:h.fim,status:1}));
 r=await consultarRecursosLocais(projetarContaRecepcao(c),q,agora);assert.equal(r.horarios.length,0);assert.match(r.mensagem,/ocupados/);
 c.ocupacoes=[];c.recursos[0].disponibilidade={};r=await consultarRecursosLocais(projetarContaRecepcao(c),q,agora);assert.equal(r.horarios.length,0);assert.match(r.mensagem,/expediente configurado/);
 c.recursos=[];r=await consultarRecursosLocais(projetarContaRecepcao(c),q,agora);assert.equal(r.horarios.length,0);assert.match(r.mensagem,/instrutor|ônibus/i);
});

test('operação D encontra recursos de outras unidades e recusa duplicidade global',async()=>{
 const c=contexto('D');c.recursos[0].unidade='Santa Rita';c.recursos[1].unidade='Itaparica';
 const q={categoria:'D',data:'2026-12-19',unidade:'Cobilândia'},agora='2026-10-19T08:00:00';
 const antes=structuredClone(c);let d=projetarContaRecepcao(c),r=await consultarRecursosLocais(d,q,agora);
 assert.ok(r.horarios.some(h=>h.hora==='18:00'));assert.equal(elegibilidadeContaRecepcao(d,q.data),'');assert.deepEqual(c,antes);
 c.recursos.push({...c.recursos[0],id:'segundo',unidade:'Terra Vermelha'});r=await consultarRecursosLocais(projetarContaRecepcao(c),q,agora);assert.equal(r.horarios.length,0);assert.match(r.mensagem,/único/);
});

test('acompanhamento usa o cadastro próprio, preserva tentativas e omite campos administrativos internos',()=>{
 const a=contexto('D').aluno;
 a.examesAdministrativos={medico:{status:'Aprovado',fonte:'Interna',responsavel:'operador'},psicologico:{status:'Reprovado'}};
 a.etapas={ladv:{status:'Pendente'},pratica:{status:'Não informado'}};
 a.tentativasProvas=[{id:'p1',tipo:'praticaOnibus',ordem:1,status:'Reprovado',resultado:'Reprovado',data:'2026-12-15',historico:[{autor:'interno'}]},{id:'p2',tipo:'praticaOnibus',ordem:2,status:'Agendado',data:'2027-01-10'},{id:'outra-modalidade',tipo:'praticaCarro',status:'Agendado'}];
 const antes=structuredClone(a),r=acompanhamentoDaConta(a);assert.deepEqual(a,antes);
 assert.equal(r.exames.find(e=>e.tipo==='medico').situacao,'Aprovado');assert.equal(r.provas.find(p=>p.tipo==='praticaOnibus').tentativas.length,2);assert.ok(!r.provas.some(p=>p.tipo==='praticaCarro'));assert.equal(r.processo.find(p=>p.tipo==='ladv').situacao,'Pendente');
 assert.ok(!JSON.stringify(r).includes('fonte'));assert.ok(!JSON.stringify(r).includes('responsavel'));assert.ok(!JSON.stringify(r).includes('interno'));
 assert.equal(elegibilidadeContaRecepcao({aluno:a},'2026-12-16'),'');
});
