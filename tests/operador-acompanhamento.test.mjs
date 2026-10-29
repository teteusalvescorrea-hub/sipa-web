import test from 'node:test';
import assert from 'node:assert/strict';
import {lerAcompanhamento,validarAcompanhamento,salvarAcompanhamento} from '../nivel-1-operador/js/dominioOperador.js';
const op={id:'op-teste',unidade:'Itaparica',permissoes:['consultar','verificar']};
const fixture=()=>({alunos:[{id:'a',categoria:'AB',unidade:'Itaparica',unidadePrincipal:'Itaparica',unidadeCarro:'Itaparica',historico:[],etapas:{medico:{status:'Aprovado'}},exames:{teorica:{status:'Pendente'}},financeiro:'Regular',creditos:{A:7,B:6}},{id:'outro'}],aulas:[]});
const salvar=(e,d)=>salvarAcompanhamento(e,op,'a',d,new Date('2026-10-21T12:00:00Z'));
test('defaults desconhecidos e aproveitamento de exames legados conhecidos',()=>{
 const a=fixture().alunos[0];assert.equal(lerAcompanhamento(a,'teorica').status,'Pendente');assert.equal(lerAcompanhamento(a,'oftalmologico').status,'Não informado');assert.equal(lerAcompanhamento(a,'praticaMoto').status,'Não solicitado');
});
test('exames independentes, preservação integral de legados, créditos e outros alunos',()=>{
 const e=fixture(),novo=salvar(e,{teorica:{status:'Aprovado'},toxicologico:{status:'Não se aplica'},oftalmologico:{status:'Reprovado'}}),a=novo.alunos[0];
 for(const k of ['etapas','exames','financeiro','creditos'])assert.deepEqual(a[k],e.alunos[0][k]);assert.deepEqual(novo.alunos[1],e.alunos[1]);assert.deepEqual(e,fixture());
 assert.equal(a.acompanhamentoExames.teorica.status,'Aprovado');assert.equal(a.acompanhamentoExames.oftalmologico.status,'Reprovado');assert.equal(a.historico[0].responsavel,op.id);assert.equal(a.historico[0].em,'2026-10-21T12:00:00.000Z');
 assert.equal(salvar(novo,{teorica:{status:'Aprovado'}}),novo);
});
test('solicitação sem data; agendamento exige data válida e independente por categoria',()=>{
 let e=salvar(fixture(),{praticaCarro:{status:'Solicitado'}});assert.equal(e.alunos[0].acompanhamentoExames.praticaCarro.data,'');
 for(const data of ['', '2026-02-30'])assert.throws(()=>salvar(e,{praticaCarro:{status:'Agendado',data}}),/válida/);
 e=salvar(e,{praticaCarro:{status:'Agendado',data:'2026-11-12'},praticaMoto:{status:'Agendado',data:'2026-11-15'}});
 const antes=e;e=salvar(e,{praticaCarro:{status:'Agendado',data:'2026-11-20'}});assert.deepEqual(e.alunos[0].acompanhamentoExames.praticaMoto,antes.alunos[0].acompanhamentoExames.praticaMoto);
 assert.equal(e.alunos[0].historico.at(-1).alteracoes[0].antes.data,'2026-11-12');
 for(const status of ['Aprovado','Reprovado','Cancelado'])e=salvar(e,{praticaCarro:{status}});
 assert.equal(e.alunos[0].acompanhamentoExames.praticaCarro.data,'2026-11-20');assert.equal(e.alunos[0].historico.at(-1).alteracoes[0].antes.status,'Reprovado');
 assert.deepEqual(JSON.parse(JSON.stringify(e)).alunos[0].acompanhamentoExames,e.alunos[0].acompanhamentoExames);
});
test('categoria, permissões, vínculo e informação oficial continuam protegidos',()=>{
 for(const [categoria,tipo] of [['A','praticaCarro'],['B','praticaMoto']]){const e=fixture();e.alunos[0].categoria=categoria;assert.ok(validarAcompanhamento(e.alunos[0],{[tipo]:{status:'Solicitado'}})[tipo]);}
 assert.throws(()=>salvarAcompanhamento(fixture(),{...op,permissoes:['consultar']},'a',{teorica:{status:'Aprovado'}}),/Permissão/);
 assert.throws(()=>salvarAcompanhamento(fixture(),{...op,unidade:'Santa Rita'},'a',{teorica:{status:'Aprovado'}}),/vínculo/);
 const e=fixture();e.alunos[0].acompanhamentoExames={teorica:{origem:'oficial',status:'Aprovado'}};assert.throws(()=>salvar(e,{teorica:{status:'Reprovado'}}),/oficial/);
});
