import test from 'node:test';
import assert from 'node:assert/strict';
import * as r from '../nivel-1-operador/js/dominioOperador.js';
import {servicoOperador} from '../nivel-1-operador/js/servicoOperador.js';
import {criarDadosDemo} from '../dev/operador/dadosDemo.js';
import {repositorioDemo,CHAVE_DEMO} from '../dev/operador/repositorioDemo.js';
const agora=new Date('2026-10-19T08:00:00-03:00');
const identidade=(unidade='Itaparica',permissoes=['consultar','cadastrar','verificar','anotar','transferir','agendar'])=>({id:'op-'+unidade,unidade,permissoes});
function fixture(){
 const e=criarDadosDemo(),a={...e.alunos[0],id:'s1',nome:'Cadastro de Teste',cpf:'52998224725',tipoCambio:'manual',categoria:'AB',unidade:'Itaparica',unidadePrincipal:'Itaparica',unidadeCarro:'Itaparica',creditos:{A:{contratadas:8,disponiveis:7},B:{contratadas:9,disponiveis:6}},financeiro:'Regular',etapas:Object.fromEntries(Object.keys(r.ETAPAS).map(t=>[t,{status:'Aprovado'}]))};
 const recursos=['Itaparica','Santa Rita','Centro'].flatMap(u=>[{id:'i-'+u,nome:'Instrutor teste',tipo:'Instrutores',horarioAlmoco:'11-12',categorias:['A','B'],veiculoIds:['m-'+u,'v-'+u],unidade:u,ativo:true,operacoesCarro:u==='Santa Rita'?[{origem:'Santa Rita',destino:'Itaparica',dia:1}]:[]},{id:'v-'+u,nome:'Carro teste',tipo:'Veículos',tipoCambio:'manual',categoria:'B',unidade:u,ativo:true,operacoesCarro:u==='Santa Rita'?[{origem:'Santa Rita',destino:'Itaparica',dia:1}]:[]},{id:'m-'+u,nome:'Moto teste',tipo:'Veículos',categoria:'A',unidade:u,ativo:true,operacoesCarro:u==='Santa Rita'?[{origem:'Santa Rita',destino:'Itaparica',dia:1}]:[]}]);
 return {...e,alunos:[a,{...a,id:'s2',cpf:'11144477735',tipoCambio:'manual',categoria:'B',unidade:'Santa Rita',unidadePrincipal:'Santa Rita',unidadeCarro:'Santa Rita'}],recursos,aulas:[]};
}
const aula=(id,data,inicio='09:00')=>({id,data,inicio,fim:inicio.slice(0,2)+':50',alunoId:'s1',tipoCambio:'manual',categoria:'B',unidade:'Itaparica',instrutorId:'i-Itaparica',veiculoId:'v-Itaparica',status:1});
test('consulta segregada: principal, carro e projeção mínima da pista são distintos',async()=>{
 const e=fixture();e.alunos[0].unidadeCarro='Cobilândia';
 assert.equal(r.consultarAlunos(e,identidade()).length,1);assert.equal(r.consultarAlunos(e,identidade('Cobilândia')).length,1);
 assert.equal(r.consultarAlunos(e,identidade('Centro')).length,0);assert.throws(()=>r.alunoAutorizado(e,identidade('Centro'),'s1'),/vínculo/);
 assert.ok(r.consultarRecursos(e,identidade()).every(x=>x.unidade==='Itaparica'||r.recursoMotoCentral(x)));
 const s=servicoOperador({ler:async()=>e},identidade('Centro')),d=await s.consultar();assert.deepEqual(Object.keys(d.pista[0]).sort(),['categoria','id','nome']);await assert.rejects(s.ficha('s1'),/vínculo/);
});
test('CPF, cadastro, unidade principal, UUID independente, duplicidade e creditos automaticos',()=>{
 const e=fixture(),d={nome:'Aluno de Teste',cpf:'935.411.347-80',nascimento:'2000-01-01',telefone:'27999998888',email:'aluno@example.invalid',tipoCambio:'manual',categoria:'AB',unidade:'Santa Rita',unidadeCarro:'Cobilândia',quantidadeCarro:'20',quantidadeMoto:'15',observacoes:'Cadastro solicitado no atendimento local.'};
 assert.equal(r.cpfValido(d.cpf),true);assert.equal(r.cpfValido('00000000000'),false);assert.equal(r.cpfValido('52998224724'),false);
 const resultado=r.cadastrarAluno(e,identidade(),d,'novo-uuid',agora),a=resultado.alunos.at(-1);
 assert.equal(a.unidadePrincipal,'Itaparica');assert.equal(a.unidadeCarro,'Cobilândia');assert.equal(a.aulas,0);assert.deepEqual(Object.fromEntries(Object.entries(a.creditos).map(([k,v])=>[k,v.disponiveis])),a.aulasAdquiridas);assert.notEqual(a.id,a.cpf);assert.equal(e.alunos.length,2);
 assert.deepEqual(a.aulasAdquiridas,{B:20,A:15});assert.deepEqual(e,fixture());
 for(const alteracao of [{cpf:'00000000000'},{email:'errado'},{telefone:'123'},{nascimento:'2030-01-01'},{tipoCambio:'manual',categoria:'B',unidadeCarro:''},{nome:'Um'}])assert.throws(()=>r.cadastrarAluno(e,identidade(),{...d,...alteracao},'novo',agora));
 assert.throws(()=>r.cadastrarAluno(resultado,identidade(),d,'novo-2',agora),/já cadastrado/);
 assert.throws(()=>r.cadastrarAluno(e,identidade('Itaparica',['consultar']),d,'novo',agora),/Permissão/);
 assert.equal(r.formatarCpf('52998224725'),'529.982.247-25');
});
test('quantidades contratadas independentes: A, B e AB; obrigatoriedade e categorias não escolhidas',()=>{
 const e=fixture(),base={nome:'Aluno de Teste',cpf:'93541134780',nascimento:'2000-01-01',telefone:'27999998888',email:'aluno@example.invalid',tipoCambio:'manual',categoria:'AB',unidadeCarro:'Santa Rita',quantidadeCarro:'20',quantidadeMoto:'15',observacoes:'Informação obrigatória.'};
 for(const [categoria,esperado] of [['A',{A:15}],['B',{B:20}],['AB',{B:20,A:15}]]){
  const novo=r.cadastrarAluno(e,identidade(),{...base,categoria},'uuid-'+categoria,agora),a=novo.alunos.at(-1);
  assert.deepEqual(a.aulasAdquiridas,esperado);assert.deepEqual(Object.fromEntries(Object.entries(a.creditos).map(([k,v])=>[k,v.disponiveis])),a.aulasAdquiridas);assert.equal(a.aulas,0);assert.deepEqual(novo.alunos.slice(0,-1),e.alunos);
  if(categoria==='A')assert.equal(a.unidadeCarro,'');
  for(const c of Object.keys(esperado))assert.equal(r.resumoCreditos(novo,a,c).contratadas,esperado[c]);
 }
 for(const chave of ['quantidadeCarro','quantidadeMoto'])for(const valor of ['',0,-1,1.5,'texto','1e2','Infinity','9007199254740992']){
  assert.throws(()=>r.cadastrarAluno(e,identidade(),{...base,[chave]:valor},'invalido',agora),/quantidade/);
 }
 for(const chave of ['nome','cpf','nascimento','telefone','email','categoria','unidadeCarro','observacoes']){
  const erros=r.validarCadastroAluno({...base,[chave]:''},identidade(),e.alunos,agora);assert.ok(erros[chave],chave);
 }
 assert.ok(r.validarCadastroAluno({...base,observacoes:'   '},identidade(),[],agora).observacoes);
 assert.ok(r.validarCadastroAluno(base,identidade('Unidade inexistente'),[],agora).unidade);
 assert.deepEqual(e,fixture());
});
test('moto sempre Centro; carro usa vínculo separado; recursos fora da unidade nunca são oferecidos',()=>{
 const e=fixture();assert.equal(r.destinoNovasAulas(e.alunos[0],'A'),'Vila Velha');assert.equal(r.destinoNovasAulas(e.alunos[0],'B'),'Itaparica');
 assert.equal(r.paresNaUnidade(e,identidade(),'2026-10-23','09:00',{categoria:'A'},agora).length,1);
 assert.equal(r.paresNaUnidade(e,identidade('Centro'),'2026-10-23','09:00',{categoria:'A'},agora).length,1);
 assert.ok(r.paresNaUnidade(e,identidade(),'2026-10-23','09:00',{},agora).every(p=>p.categoria==='A'?p.instrutorId==='i-Centro'&&p.veiculoId==='m-Centro':p.instrutorId==='i-Itaparica'&&p.veiculoId==='v-Itaparica'));
});
test('transferência com três aulas amanhã fora do prazo preserva exatamente as reservas e saldos',()=>{
 const e=fixture();e.aulas=['09:00','10:00','13:00'].map((h,i)=>aula('amanha-'+i,'2026-10-20',h));const antes=structuredClone(e);
 const p=r.preverTransferencia(e,identidade(),'s1','Santa Rita',agora);assert.equal(p.aulas.length,3);assert.ok(p.aulas.every(x=>!x.cancelavel));
 assert.throws(()=>r.transferirAluno(e,identidade(),'s1','Santa Rita','Solicitado pelo aluno',['amanha-0'],agora),/48 horas/);
 const novo=r.transferirAluno(e,identidade(),'s1','Santa Rita','Solicitado pelo aluno',[],agora);
 assert.deepEqual(novo.aulas,antes.aulas);assert.deepEqual(novo.alunos[0].creditos,antes.alunos[0].creditos);assert.equal(novo.alunos[0].unidadePrincipal,'Itaparica');assert.equal(r.destinoNovasAulas(novo.alunos[0],'B'),'Santa Rita');assert.deepEqual(novo.alunos[0].historico.at(-1).mantidas,e.aulas.map(a=>a.id));assert.deepEqual(e,antes);
});
test('cancelamento elegível exige seleção explícita; histórico registra mantidas, canceladas e operador',()=>{
 const e=fixture();e.aulas=[aula('elegivel','2026-10-23'),aula('mantida','2026-10-23','10:00')];
 assert.ok(r.preverTransferencia(e,identidade(),'s1','Santa Rita',agora).aulas.every(x=>x.cancelavel));
 const semCancelamento=r.transferirAluno(e,identidade(),'s1','Santa Rita','Solicitação do aluno',[],agora);assert.deepEqual(semCancelamento.aulas,e.aulas);
 const n=r.transferirAluno(e,identidade(),'s1','Santa Rita','Solicitação do aluno',['elegivel'],agora);assert.equal(n.aulas[0].status,2);assert.equal(n.aulas[0].unidade,'Itaparica');assert.equal(n.aulas[0].cancelamento.credito,'devolvido');assert.deepEqual(n.aulas[1],e.aulas[1]);assert.equal(n.alunos[0].historico.at(-1).responsavel,'op-Itaparica');assert.equal(n.alunos[0].creditos.B.disponiveis,e.alunos[0].creditos.B.disponiveis+1);assert.equal(n.alunos[0].creditos.A.disponiveis,e.alunos[0].creditos.A.disponiveis);
 assert.throws(()=>r.transferirAluno(e,identidade(),'s1','Santa Rita','Solicitação',['inexistente'],agora),/Cancelamento impedido/);
});
test('nova reserva após transferência usa apenas recursos novos, dura 50 minutos e mantém aulas antigas',()=>{
 const e=fixture();e.aulas=[aula('antiga','2026-10-20')];const t=r.transferirAluno(e,identidade(),'s1','Santa Rita','Pedido do aluno',[],agora),dados={alunoId:'s1',tipoCambio:'manual',categoria:'B',data:'2026-10-23',inicio:'18:00',instrutorId:'i-Santa Rita',veiculoId:'v-Santa Rita'};
 assert.throws(()=>r.agendarAula(t,identidade(),{...dados,instrutorId:'i-Itaparica',veiculoId:'v-Itaparica'},'negada',agora),/unidade autorizada/);
 const n=r.agendarAula(t,identidade('Santa Rita'),dados,'reserva-nova',agora);assert.equal(n.aulas.at(-1).fim,'18:50');assert.equal(n.aulas.at(-1).unidade,'Santa Rita');assert.deepEqual(n.aulas[0],e.aulas[0]);assert.equal(n.alunos[0].creditos.B.disponiveis,5);assert.equal(n.alunos[0].creditos.A.disponiveis,7);
 assert.throws(()=>r.agendarAula(n,identidade('Santa Rita'),dados,'conflito',agora),/conflito/);
 for(const inicio of ['11:00','12:00','18:30','19:00'])assert.throws(()=>r.agendarAula(t,identidade('Santa Rita'),{...dados,inicio},inicio,agora));
 assert.throws(()=>r.agendarAula(t,identidade('Santa Rita'),{...dados,data:'2026-10-25'},'domingo',agora));
 assert.throws(()=>r.agendarAula(t,identidade('Santa Rita'),{...dados,data:'2026-11-02'},'feriado',agora));
});
test('disponibilidade respeita bloqueios, expediente individual, recursos ativos e conflitos entre unidades',()=>{
 const e=fixture(),i=e.recursos.find(x=>x.id==='i-Itaparica');i.disponibilidade={5:[{inicio:'08:00',fim:'10:00'}]};
 assert.equal(r.paresNaUnidade(e,identidade(),'2026-10-23','09:00',{categoria:'B'},agora).length,1);assert.equal(r.paresNaUnidade(e,identidade(),'2026-10-23','10:00',{categoria:'B'},agora).length,0);
 i.bloqueios=[{data:'2026-10-23',inicio:'09:00',fim:'10:00'}];assert.equal(r.paresNaUnidade(e,identidade(),'2026-10-23','09:00',{categoria:'B'},agora).length,0);delete i.bloqueios;
 i.ativo=false;assert.equal(r.paresNaUnidade(e,identidade(),'2026-10-23','09:00',{categoria:'B'},agora).length,0);i.ativo=true;
 e.aulas=[{...aula('ocupada','2026-10-23'),unidade:'Santa Rita'}];assert.equal(r.paresNaUnidade(e,identidade(),'2026-10-23','09:00',{categoria:'B'},agora).length,0);
});
test('etapas não presumem aprovação, fonte e responsável obrigatórios; resultado oficial protegido',()=>{
 let e=fixture();e.alunos[0].etapas={};const d={alunoId:'s1',tipoCambio:'manual',categoria:'B',data:'2026-10-23',inicio:'09:00',instrutorId:'i-Itaparica',veiculoId:'v-Itaparica'};
 assert.equal(r.agendarAula(e,identidade(),d,'nova',agora).aulas.at(-1).id,'nova');
 assert.throws(()=>r.registrarEtapa(e,identidade(),'s1','medico',{status:'Aprovado',data:'2026-10-19',fonte:''},agora),/fonte/);
 for(const t of Object.keys(r.ETAPAS))e=r.registrarEtapa(e,identidade(),'s1',t,{status:'Aprovado',data:'2026-10-19',fonte:'Documento fictício conferido'},agora);
 assert.equal(e.alunos[0].etapas.medico.responsavel,'op-Itaparica');assert.equal(e.alunos[0].situacao,'Verificado');
 e.alunos[0].etapas.medico.validade='2026-10-22';assert.equal(r.agendarAula(e,identidade(),d,'expirada',agora).aulas.at(-1).id,'expirada');
 e.alunos[0].etapas.medico.origem='oficial';assert.throws(()=>r.registrarEtapa(e,identidade(),'s1','medico',{status:'Reprovado',data:'2026-10-19',fonte:'Teste'},agora),/oficiais/);
});
test('saldos AB ambíguos não são divididos, saldo ambiguo nao e criado, nenhuma credencial',()=>{
 const e=fixture(),a=e.alunos[0];delete a.creditos;assert.equal(r.saldoCategoria(a,'A'),null);assert.equal(r.saldoCategoria(a,'B'),null);
 const s=JSON.stringify(r.transferirAluno(e,identidade(),'s1','Santa Rita','Pedido do aluno',[],agora));assert.doesNotMatch(s,/senha|password|token|convite/);
});
test('repositório evolui a chave v2 sem migrar, apagar ou sobrescrever chaves de outros perfis',()=>{
 const e=fixture(),map=new Map([['sipa.aluno','preservado'],[CHAVE_DEMO,JSON.stringify(e)]]),storage={getItem:k=>map.get(k)||null,setItem:(k,v)=>map.set(k,v),removeItem:()=>assert.fail('Não apagar')};
 const repo=repositorioDemo('http://localhost/nivel-1-operador/html/operador-cfc.html?demo=1',storage);assert.deepEqual(repo.carregar(),e);assert.equal(repo.salvar(e),true);assert.equal(map.get('sipa.aluno'),'preservado');assert.equal(map.size,2);
});
