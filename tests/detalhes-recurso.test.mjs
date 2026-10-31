import test from 'node:test';import assert from 'node:assert/strict';
import {apresentarRecurso} from '../nivel-1-operador/js/components/detalhesRecurso.js';
const jornada={1:[{inicio:'07:00',fim:'19:00'}],2:[{inicio:'07:00',fim:'19:00'}],3:[{inicio:'07:00',fim:'19:00'}],4:[{inicio:'07:00',fim:'19:00'}],5:[{inicio:'07:00',fim:'19:00'}],6:[{inicio:'07:00',fim:'12:00'}]};
const v=(categoria)=>({id:'v',nome:'Veículo teste',tipo:'Veículos',identificacao:'TESTE-01',categoria,unidade:'Vila Velha',ativo:true,disponibilidade:jornada});
test('motos não apresentam câmbio nem operações de carros; mostram pista e dados existentes sem gravação',()=>{
 const r={...v('A'),tipoCambio:'manual',operacoesCarro:[{origem:'Santa Rita',destino:'Itaparica',dia:1}]},antes=structuredClone(r),m=apresentarRecurso(r);
 assert.equal(m.titulo,'Detalhes do veículo');assert.ok(!m.camposIdentificacao.some(([k])=>/câmbio/i.test(k)));assert.ok(!m.adicionais.some(([k])=>/carro/i.test(k)));
 assert.ok(m.vinculo.some(([k,x])=>k==='Local de realização das aulas'&&x.includes('1335')));assert.deepEqual(r,antes);assert.equal(m.intervalos[0].valor,null);
});
test('carros manuais e automáticos usam o cadastro e o intervalo real do instrutor vinculado',()=>{
 for(const [tipoCambio,nome]of [['manual','Manual'],['automatico','Automático']]){
  const r={...v('B'),tipoCambio,instrutorId:'i',operacoesCarro:[{origem:'Santa Rita',destino:'Itaparica',dia:1}]},i={id:'i',tipo:'Instrutores',nome:'Instrutor cadastrado',horarioAlmoco:'12:00/14:00',disponibilidade:jornada};
  const m=apresentarRecurso(r,[i]);assert.equal(m.camposIdentificacao.find(([k])=>k==='Câmbio')[1],nome);assert.equal(m.intervalos[0].valor,'12:00 às 14:00');assert.ok(m.vinculo.some(([,x])=>x==='Instrutor cadastrado'));assert.ok(m.adicionais.some(([,x])=>x.includes('Segunda-feira')));
 }
});
test('ônibus separa unidade administrativa e locais físicos e preserva sábado integral e vínculo reverso explícito',()=>{
 const r={...v('D'),unidade:'Cobilândia',disponibilidade:{...jornada,6:[{inicio:'07:00',fim:'19:00'}]}},i={id:'i',tipo:'Instrutores',nome:'Instrutor D',veiculoIds:['v'],horarioAlmoco:'12-13',intervaloAlmoco:{inicio:'12:00',fim:'13:00'}};
 const m=apresentarRecurso(r,[i]);assert.ok(m.vinculo.some(([,x])=>x.includes('KM Cobilândia')&&x.includes('Arena Tartarugão')));assert.ok(m.jornada.some(([d,x])=>d.includes('Sábado')&&x==='07:00 às 19:00'));assert.equal(m.intervalos[0].valor,'12:00 às 13:00');assert.ok(!m.camposIdentificacao.some(([k])=>k==='Câmbio'));
});
test('equipamento, pendências e bloqueios não ganham vínculos, horários ou dados fictícios',()=>{
 const r={id:'equip',nome:'Simulador',tipo:'Equipamentos',unidade:'Vila Velha',ativo:false,observacoes:'Requer inspeção',datasBloqueadas:['2026-10-30']},m=apresentarRecurso(r,[{id:'i',tipo:'Instrutores',nome:'Sem vínculo',horarioAlmoco:'11:00/13:00'}]);
 assert.equal(m.titulo,'Detalhes do recurso');assert.equal(m.jornada[0][1],'Não informado');assert.equal(m.intervalos.length,0);assert.equal(m.situacao,'Inativo');assert.equal(m.adicionais.length,1);assert.ok(m.bloqueios[0].includes('30/10/2026'));
 const moto=apresentarRecurso(v('A'),[{id:'i',tipo:'Instrutores',nome:'Sem vínculo',categorias:['A']}]);assert.ok(moto.vinculo.some(([k,x])=>k==='Instrutor responsável'&&x==='Não informado'));
 const inativo=apresentarRecurso({...v('A'),instrutorId:'i'},[{id:'i',tipo:'Instrutores',nome:'Instrutor existente',ativo:false}]);
 assert.ok(inativo.vinculo.some(([k,x])=>k==='Situação do vínculo'&&x.includes('instrutor inativo')));
 const placa=apresentarRecurso({...v('B'),identificacao:'',placa:'TESTE-PLACA'});
 assert.equal(placa.identificacao,'TESTE-PLACA');assert.ok(!placa.camposIdentificacao.some(([k])=>k==='Placa'));
});
