import test from 'node:test';
import assert from 'node:assert/strict';
import {resumirCreditosRecepcao} from '../aluno/js/domain/creditosRecepcao.js';
import {cadastrarAluno,agendarAula,ETAPAS} from '../nivel-1-operador/js/dominioOperador.js';
const aula=(id,status=1)=>({id,categoria:'D',status,inicio:'2027-01-20T10:00:00-03:00'});
const aluno=()=>({id:'d',categoria:'D',financeiro:'Pendente',aulasAdquiridas:{D:10}});
for(const categoria of ['A','B','AB','D'])for(const quantidade of [1,10,20])test('cadastro '+categoria+' com '+quantidade+' creditos imediatos, reserva e persistencia',()=>{
 const unidade=categoria.includes('A')?'Vila Velha':'Cobil\u00e2ndia';
 const op={id:'op',unidade,permissoes:['cadastrar','anotar','agendar','consultar']};
 let e=cadastrarAluno({alunos:[],aulas:[],recursos:[]},op,{nome:'Aluno Teste',cpf:'52998224725',nascimento:'2000-01-01',telefone:'27999999999',email:'teste@example.invalid',categoria,tipoCambio:'manual',unidadeCarro:unidade,quantidadeCarro:String(quantidade),quantidadeMoto:String(quantidade),quantidadeOnibus:String(quantidade),observacoes:'Teste explicito'},'d',new Date('2026-10-19T08:00:00-03:00'));
 let a=e.alunos[0];const antes=structuredClone(e);
 for(const c of ['A','B','D'].filter(c=>categoria.includes(c))){assert.equal(a.creditos[c].disponiveis,quantidade);assert.equal(resumirCreditosRecepcao(a,[]).categorias[c].disponiveis,quantidade);}
 assert.deepEqual(e,antes);assert.equal(a.financeiro,'Pendente');assert.equal(a.liberacaoAgendaTeste,undefined);
 // Exames e recursos sao pre-requisitos existentes, nunca aprovados pelo cadastro.
 a.etapas=Object.fromEntries(Object.keys(ETAPAS).map(k=>[k,{status:'Aprovado'}]));
 const cat=categoria==='AB'?'B':categoria;
 e.recursos=[{id:'i',tipo:'Instrutores',nome:'Instrutor',categorias:[cat],veiculoIds:['v'],unidade,ativo:true,horarioAlmoco:'11-12'},{id:'v',tipo:'Ve\u00edculos',nome:'Veiculo',categoria:cat,tipoCambio:'manual',unidade,ativo:true}];
 const pedido={alunoId:'d',categoria:cat,data:'2027-01-20',inicio:'10:00',instrutorId:'i',veiculoId:'v'};
 // Simula cadastro legado sem ledger, preservando a quantidade adquirida.
 if(quantidade===10)delete e.alunos[0].creditos;
 e=agendarAula(e,op,pedido,'r',new Date('2026-10-19T08:00:00-03:00'));
 e=JSON.parse(JSON.stringify(e));a=e.alunos[0];
 let r=resumirCreditosRecepcao(a,e.aulas.map(x=>({...x,inicio:x.data+'T'+x.inicio+':00-03:00'}))).categorias[cat];
 assert.equal(r.disponiveis,quantidade-1);assert.equal(r.reservadas,1);assert.equal(r.realizadas,0);assert.equal(r.adquiridas,quantidade);
 e.aulas[0].status=5; // Projecao do mesmo evento de presenca, sem uma segunda compra/debito.
 r=resumirCreditosRecepcao(a,e.aulas.map(x=>({...x,inicio:x.data+'T'+x.inicio+':00-03:00'}))).categorias[cat];
 assert.equal(r.disponiveis,quantidade-1);assert.equal(r.reservadas,0);assert.equal(r.realizadas,1);
 if(quantidade===1)assert.throws(()=>agendarAula(e,op,{...pedido,inicio:'09:00'},'outra',new Date('2026-10-19T08:00:00-03:00')),/Cr/);
 if(categoria==='AB')assert.equal(resumirCreditosRecepcao(a,[]).categorias.A.disponiveis,quantidade);
});
test('legado adquirido sem segunda liberacao; saldo liquido, retencao, falta e zero explicito preservados',()=>{
 const a=aluno();assert.equal(resumirCreditosRecepcao(a,[]).categorias.D.disponiveis,10);
 const aulas=[aula('r'),aula('presenca',5),aula('falta',6),{...aula('retida',2),cancelamento:{credito:'retido'}},{...aula('devolvida',2),cancelamento:{credito:'devolvido'}}];
 a.creditos={D:{contratadas:10,disponiveis:6,liberadas:0}};const antes=structuredClone(a);
 const r=resumirCreditosRecepcao(a,[...aulas,aula('presenca',5)]).categorias.D;
 assert.equal(r.consumidas,4);assert.equal(r.disponiveis,6);assert.equal(r.liberadas,10);assert.deepEqual(a,antes);
 a.creditos.D.disponiveis=999;assert.equal(resumirCreditosRecepcao(a,aulas).categorias.D.disponiveis,6);
 a.creditos.D.disponiveis=0;assert.equal(resumirCreditosRecepcao(a,[]).categorias.D.disponiveis,0);
});
test('bloqueios administrativos e financeiros explicitos preservam saldo armazenado',()=>{
 for(const alteracao of [{financeiro:'Em atraso'},{financeiro:'Pendente',verificacaoFinanceira:{origem:'manual-local'}},{bloqueioAdministrativo:{ativo:true}},{bloqueioAgendamento:{ativo:true}}]){
  const a={...aluno(),...alteracao},antes=structuredClone(a);assert.equal(resumirCreditosRecepcao(a,[]).categorias.D.disponiveis,0);assert.ok(resumirCreditosRecepcao(a,[]).motivoBloqueio);assert.deepEqual(a,antes);
 }
});
