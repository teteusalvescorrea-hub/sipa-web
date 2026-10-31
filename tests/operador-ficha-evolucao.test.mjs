import test from 'node:test';
import assert from 'node:assert/strict';
import {editarCadastro,salvarExamesFicha,movimentarProva,provasDoAluno,linhaTempoAluno,EXAMES_FICHA,SITUACOES_PROVA} from '../nivel-1-operador/js/fichaOperador.js';
import {transferirAluno} from '../nivel-1-operador/js/dominioOperador.js';
const op={nivel:2,id:'op',unidade:'Itaparica',permissoes:['consultar','verificar','editar-cadastro','editar-categoria','editar-prova','excluir-prova','cancelar-prova']},agora=new Date('2026-10-21T17:35:00Z');
function fixture(){return {alunos:[{id:'a',nome:'Aluno Original',cpf:'52998224725',nascimento:'2000-01-01',telefone:'27999999999',email:'teste@example.invalid',tipoCambio:'manual',categoria:'AB',unidade:'Itaparica',unidadePrincipal:'Itaparica',unidadeCarro:'Cobilândia',aulasAdquiridas:{A:5,B:10},creditos:{A:{disponiveis:2}},historico:[],etapas:{medico:{status:'Aprovado'}},exames:{teorica:{status:'Pendente'}},contaId:'conta'},{id:'outro',cpf:'11144477735',unidade:'Santa Rita',tipoCambio:'manual',categoria:'B'}],contasAlunos:[{id:'conta',alunoId:'a',login:'52998224725',hash:'preservado'}],aulas:[],recursos:[]};}
let seq=0;const mover=(e,d,chave='e-'+(++seq))=>movimentarProva(e,op,'a',d,chave,agora);
test('somente seis situações; Adiada rejeitada para novos registros sem apagar legado',()=>{
 assert.deepEqual(SITUACOES_PROVA,['Não solicitado','Solicitado','Agendado','Aprovado','Reprovado','Cancelado']);
 let e=mover(fixture(),{tipo:'teorica',status:'Agendado',data:'2026-11-10'},'ativa');const antes=structuredClone(e);
 assert.throws(()=>mover(e,{tipo:'teorica',tentativaId:'ativa',status:'Adiada',confirmado:true}),/situação válida/);assert.deepEqual(e,antes);
 e.alunos[0].tentativasProvas.push({id:'legado-adiada',tipo:'praticaMoto',ordem:1,data:'2026-10-01',status:'Adiada',historico:[]});const legado=structuredClone(e.alunos[0].tentativasProvas[1]);
 const novo=salvarExamesFicha(e,op,'a',{toxicologico:'Pendente'},'ex',agora);assert.deepEqual(novo.alunos[0].tentativasProvas[1],legado);assert.deepEqual(provasDoAluno(novo.alunos[0]).find(p=>p.id===legado.id),legado);
});
test('N1 não edita cadastro, data confirmada ou exclui tentativas, mesmo com capacidades residuais',()=>{
 const n1={...op,nivel:1},e=mover(fixture(),{tipo:'teorica',status:'Agendado',data:'2026-11-10'},'t'),antes=structuredClone(e);
 assert.throws(()=>editarCadastro(e,n1,'a',{nome:'Outro Nome'},'e',agora),/Nível 2/);
 assert.throws(()=>movimentarProva(e,n1,'a',{tipo:'teorica',tentativaId:'t',status:'Agendado',data:'2026-11-12'},'e',agora),/Nível 2/);
 assert.throws(()=>movimentarProva(e,n1,'a',{tipo:'teorica',tentativaId:'t',acao:'arquivar',motivo:'Duplicidade'},'e',agora),/Nível 2/);
 assert.deepEqual(e,antes);
 const realizado=movimentarProva(e,n1,'a',{tipo:'teorica',tentativaId:'t',status:'Reprovado',confirmado:true},'r',agora),nova=movimentarProva(realizado,n1,'a',{tipo:'teorica',status:'Agendado',data:'2026-11-20'},'t2',agora);
 assert.equal(nova.alunos[0].tentativasProvas.length,2);assert.equal(nova.alunos[0].tentativasProvas[0].resultado,'Reprovado');
 assert.throws(()=>movimentarProva(e,{...n1,permissoes:['consultar','verificar']},'a',{tipo:'teorica',tentativaId:'t',status:'Cancelado',confirmado:true},'c',agora),/Permissão/);
});
test('edição validada, CPF duplicado/protegidos, conta por ID, no-op e auditoria sem segredos',()=>{
 const e=fixture();assert.equal(editarCadastro(e,op,'a',{},'noop',agora),e);
 for(const d of [{cpf:'123'},{cpf:'11144477735'},{unidade:'Centro'},{nome:'Um'},{telefone:'1'},{email:'erro'},{nascimento:'2030-01-01'}])assert.throws(()=>editarCadastro(e,op,'a',d,'err',agora));
 const n=editarCadastro(e,op,'a',{nome:'Aluno Atualizado',cpf:'93541134780',telefone:'27988888888'},'edit',agora);
 assert.equal(n.alunos[0].id,'a');assert.equal(n.contasAlunos[0].login,'93541134780');assert.equal(n.contasAlunos[0].hash,'preservado');assert.deepEqual(n.alunos[0].creditos,e.alunos[0].creditos);assert.deepEqual(n.alunos[1],e.alunos[1]);assert.equal(n.alunos[0].historico.length,1);assert.equal(n.alunos[0].historico[0].responsavel,'op');assert.ok(!JSON.stringify(n.alunos[0].historico).includes('93541134780'));assert.deepEqual(e,fixture());
});
test('categoria protegida, histórico mantido e bloqueio quando existem compromissos ativos',()=>{
 const e=fixture();assert.throws(()=>editarCadastro(e,{...op,permissoes:['consultar','editar-cadastro']},'a',{categoria:'A'},'ed',agora),/autorizada/);
 assert.throws(()=>editarCadastro(e,{...op,unidade:'Cobilândia'},'a',{categoria:'A'},'ed',agora),/vínculo/);
 e.aulas=[{alunoId:'a',tipoCambio:'manual',categoria:'B',status:1}];assert.throws(()=>editarCadastro(e,op,'a',{categoria:'A'},'ed',agora),/ativas/);
 e.aulas[0].status=5;const n=editarCadastro(e,op,'a',{categoria:'A'},'ed',agora);assert.deepEqual(n.aulas,e.aulas);assert.equal(n.alunos[0].unidadeCarro,'Cobilândia');assert.deepEqual(n.alunos[0].aulasAdquiridas,e.alunos[0].aulasAdquiridas);
});
test('quatro exames independentes, aprovação não presumida, dados anteriores intactos',()=>{
 const e=fixture(),d=Object.fromEntries(Object.keys(EXAMES_FICHA).map(k=>[k,'Reprovado'])),n=salvarExamesFicha(e,op,'a',d,'ex',agora);
 for(const k of Object.keys(d))assert.equal(n.alunos[0].examesAdministrativos[k].status,'Reprovado');
 assert.deepEqual(n.alunos[0].exames,e.alunos[0].exames);assert.deepEqual(n.alunos[0].etapas,e.alunos[0].etapas);assert.equal(salvarExamesFicha(n,op,'a',d,'noop',agora),n);
 assert.throws(()=>salvarExamesFicha(n,op,'a',{medico:'Inventado'},'e',agora));
});
test('solicitação, datas obrigatórias, remarcação conserva ID, confirmação explícita e múltiplas tentativas',()=>{
 let e=mover(fixture(),{tipo:'teorica',status:'Solicitado'},'t1');const t=e.alunos[0].tentativasProvas[0];assert.equal(t.data,'');assert.equal(t.ordem,1);
 assert.throws(()=>mover(e,{tipo:'teorica',status:'Agendado',data:'2026-02-30',tentativaId:t.id}),/data/);
 assert.throws(()=>mover(e,{tipo:'teorica',status:'Solicitado'}),/ativa/);
 e=mover(e,{tipo:'teorica',status:'Agendado',data:'2026-11-10',tentativaId:t.id});e=mover(e,{tipo:'teorica',status:'Agendado',data:'2026-11-12',tentativaId:t.id});assert.equal(e.alunos[0].tentativasProvas.length,1);assert.equal(e.alunos[0].tentativasProvas[0].id,'t1');
 assert.throws(()=>mover(e,{tipo:'teorica',status:'Reprovado',tentativaId:t.id}),/Confirme/);
 e=mover(e,{tipo:'teorica',status:'Reprovado',confirmado:true,tentativaId:t.id},'resultado');assert.equal(mover(e,{tipo:'teorica',status:'Reprovado',confirmado:true,tentativaId:t.id},'resultado'),e);
 e=mover(e,{tipo:'teorica',status:'Agendado',data:'2026-11-25'},'t2');e=mover(e,{tipo:'teorica',status:'Aprovado',confirmado:true,tentativaId:'t2'});
 assert.deepEqual(e.alunos[0].tentativasProvas.map(t=>t.resultado),['Reprovado','Aprovado']);assert.equal(e.alunos[0].tentativasProvas[1].ordem,2);assert.ok(e.alunos[0].tentativasProvas.every(p=>p.historico.length&&p.resultadoEm));
});
test('provas carro/moto independentes, cancelamento, exclusão lógica motivada, novas tentativas',()=>{
 let e=mover(fixture(),{tipo:'praticaCarro',status:'Agendado',data:'2026-11-12'},'carro');e=mover(e,{tipo:'praticaMoto',status:'Agendado',data:'2026-11-15'},'moto');
 assert.throws(()=>mover(e,{tipo:'praticaCarro',tentativaId:'carro',acao:'arquivar',motivo:''}),/motivo/);
 e=mover(e,{tipo:'praticaCarro',tentativaId:'carro',acao:'arquivar',motivo:'Registro incorreto'});
 assert.equal(e.alunos[0].tentativasProvas.find(p=>p.id==='carro').data,'2026-11-12');assert.equal(e.alunos[0].tentativasProvas.find(p=>p.id==='carro').arquivada,true);
 e=mover(e,{tipo:'praticaCarro',status:'Solicitado'},'carro2');e=mover(e,{tipo:'praticaMoto',tentativaId:'moto',status:'Cancelado',confirmado:true});assert.equal(e.alunos[0].tentativasProvas.length,3);assert.equal(e.alunos[0].tentativasProvas.find(p=>p.id==='moto').resultado,'Cancelado');
});
test('legados projetados sem migração silenciosa; fontes oficiais e vínculo protegidos',()=>{
 const e=fixture();e.alunos[0].acompanhamentoExames={praticaCarro:{status:'Agendado',data:'2026-11-10'}};const antes=structuredClone(e),provas=provasDoAluno(e.alunos[0]);assert.deepEqual(e,antes);assert.equal(provas[0].id,'legado-praticaCarro');
 const n=mover(e,{tipo:'praticaCarro',tentativaId:provas[0].id,status:'Agendado',data:'2026-11-12'});assert.equal(n.alunos[0].tentativasProvas[0].id,provas[0].id);assert.deepEqual(n.alunos[0].acompanhamentoExames,e.alunos[0].acompanhamentoExames);
 assert.throws(()=>movimentarProva(e,{...op,unidade:'Santa Rita'},'a',{tipo:'teorica',status:'Solicitado'},'e'),/vínculo/);
 assert.throws(()=>movimentarProva(e,{...op,permissoes:['consultar']},'a',{tipo:'teorica',status:'Solicitado'},'e'),/Permissão/);
 e.alunos[0].acompanhamentoExames.praticaCarro.origem='oficial';assert.throws(()=>mover(e,{tipo:'praticaCarro',tentativaId:provas[0].id,status:'Agendado',data:'2026-11-12'}),/oficial/);
});
test('linha do tempo permanente por projeção, presença/falta reais, datas desconhecidas e ordem',()=>{
 let e=mover(fixture(),{tipo:'teorica',status:'Solicitado'},'t');e=editarCadastro(e,op,'a',{telefone:'27988888888'},'edit',new Date('2026-10-22T00:30:00Z'));
 const aulas=[{id:'aula1',alunoId:'a',tipoCambio:'manual',categoria:'B',unidade:'Cobilândia',data:'2026-10-21',inicio:'07:00',fim:'07:50',status:5,validadaEm:'2026-10-21T12:00:00Z',historico:[{status:5,em:'2026-10-21T12:00:00Z',autor:'instrutor-1'}]},{id:'aula2',categoria:'A',unidade:'Centro',data:'2026-10-21',inicio:'08:00',fim:'08:50',status:6}];
 const antes=structuredClone(e),linha=linhaTempoAluno(e.alunos[0],aulas);assert.equal(linha[0].id,'edit');assert.equal(linha.filter(h=>h.titulo==='Aula realizada').length,1);assert.equal(linha.filter(h=>h.titulo.includes('Falta')).length,1);assert.equal(linha.find(h=>h.referencia==='aula2').em,undefined);assert.equal(new Set(linha.map(h=>h.id)).size,linha.length);assert.deepEqual(linhaTempoAluno(e.alunos[0],aulas),linha);assert.deepEqual(e,antes);
 assert.ok(linha.some(h=>h.descricao?.includes('Cobilândia')));assert.ok(linha.some(h=>h.responsavel==='instrutor-1'));
});
test('transferência efetiva aparece na linha do tempo com origem, destino e responsável',()=>{
 const e=fixture(),n=transferirAluno(e,{...op,permissoes:[...op.permissoes,'transferir']},'a','Santa Rita','Solicitação do aluno',[],agora),h=linhaTempoAluno(n.alunos[0],n.aulas).find(h=>h.grupo==='unidades');
 assert.equal(h.responsavel,'op');assert.equal(h.em,agora.toISOString());assert.equal(h.descricao,'Cobilândia → Santa Rita');assert.deepEqual(n.alunos[0].creditos,e.alunos[0].creditos);
});
