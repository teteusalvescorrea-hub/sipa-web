import test from 'node:test';
import assert from 'node:assert/strict';
import {DESLOCAMENTOS_CARRO,operacaoCarro,localCarro,recursoCarroCompativel,unidadeCarroPermitida} from '../shared/js/operacaoCarro.js';
import {cadastrarAluno,cadastrarRecurso,agendarAula,paresNaUnidade,transferirAluno,consultarRecursos} from '../nivel-1-operador/js/dominioOperador.js';
import {editarCadastro} from '../nivel-1-operador/js/fichaOperador.js';
import {projetarContaRecepcao} from '../dev/aluno/servicoRecepcao.js';
import {calcularHorariosLocais,consultarRecursosLocais} from '../dev/aluno/authLocal.js';
const agora=new Date('2026-10-18T06:00:00-03:00');
const op=unidade=>({id:'recepcao',nivel:1,unidade,permissoes:['consultar','cadastrar','cadastrar-recurso','anotar','agendar','transferir']});
function fixture(origem='Cobilândia',tipoCambio='manual'){
 const aluno={id:'s',nome:'Aluno de Teste',cpf:'52998224725',categoria:'B',unidade:origem,unidadePrincipal:origem,unidadeCarro:origem,tipoCambio,aulasAdquiridas:{B:10},creditos:{B:{contratadas:10,disponiveis:10}},historico:[]};
 const operacoesCarro=DESLOCAMENTOS_CARRO.filter(x=>x.origem===origem);
 const recursos=[{id:'i',tipo:'Instrutores',nome:'Instrutor teste',categorias:['B'],veiculoIds:['v'],unidade:origem,ativo:true,horarioAlmoco:'11-12',operacoesCarro},{id:'v',tipo:'Veículos',nome:'Veículo teste',categoria:'B',tipoCambio,unidade:origem,ativo:true,operacoesCarro}];
 return {alunos:[aluno],recursos,aulas:[],ocupacoes:[]};
}
const dados=()=>({nome:'Aluno de Teste',cpf:'52998224725',nascimento:'2000-01-01',telefone:'27999999999',email:'teste@example.invalid',categoria:'B',tipoCambio:'manual',unidadeCarro:'Cobilândia',quantidadeCarro:'10',quantidadeMoto:'5',observacoes:'Cadastro explícito para teste.'});
for(const categoria of ['B','AB'])for(const tipoCambio of ['manual','automatico'])test(`cadastro ${categoria} ${tipoCambio} persistido, histórico e créditos imediatos`,()=>{
 const e={alunos:[],aulas:[],recursos:[]},n=cadastrarAluno(e,op('Cobilândia'),{...dados(),categoria,tipoCambio},'s',agora),a=n.alunos[0];
 assert.equal(a.tipoCambio,tipoCambio);assert.equal(a.unidadeCarro,'Cobilândia');assert.equal(a.creditos.B.disponiveis,10);assert.equal(JSON.parse(JSON.stringify(n)).alunos[0].tipoCambio,tipoCambio);
 assert.equal(a.historico.length,1);assert.ok(a.historico[0].dados.some(x=>x.campo==='Tipo de carro inicial'&&x.depois===tipoCambio));assert.deepEqual(e.alunos,[]);
 assert.throws(()=>editarCadastro(n,op('Cobilândia'),'s',{tipoCambio:'automatico'},'ev',agora),/Nível 2|Nível|autoriz|permiss|Permiss/);
});
test('cadastro obrigatório, automático limitado, A/D não recebem campo e legado é preservado',async()=>{
 const e={alunos:[],aulas:[],recursos:[]};assert.throws(()=>cadastrarAluno(e,op('Cobilândia'),{...dados(),tipoCambio:undefined},'s',agora));
 for(const u of ['Santa Rita','Itaparica','Terra Vermelha','Novo Milênio'])assert.throws(()=>cadastrarAluno(e,op(u),{...dados(),tipoCambio:'automatico',unidadeCarro:u},'s',agora));
 for(const categoria of ['A','D']){const n=cadastrarAluno(e,op('Cobilândia'),{...dados(),categoria,quantidadeOnibus:'10',tipoCambio:undefined},'s',agora);assert.equal(n.alunos[0].tipoCambio,undefined);}
 const legado=fixture();delete legado.alunos[0].tipoCambio;const antes=structuredClone(legado),p=projetarContaRecepcao({aluno:legado.alunos[0],...legado});
 assert.deepEqual(await calcularHorariosLocais(p,{categoria:'B',unidade:'Cobilândia',data:'2026-10-20'},'2026-10-18T06:00:00'),[]);
 assert.match((await consultarRecursosLocais(p,{categoria:'B',unidade:'Cobilândia',data:'2026-10-20'})).mensagem,/ADM 2/);assert.deepEqual(legado,antes);
});
for(const [origem,data,destino] of [['Santa Rita','2026-10-19','Itaparica'],['Santa Rita','2026-10-20','Santa Rita'],['Terra Vermelha','2026-10-20','Vila Velha'],['Terra Vermelha','2026-10-21','Terra Vermelha'],['Cobilândia','2026-10-22','Vila Velha'],['Cobilândia','2026-10-23','Cobilândia']])test(`${origem} em ${data}: aluno e recepção usam operação ${destino}`,async()=>{
 const e=fixture(origem),a=e.alunos[0],antes=structuredClone(e);assert.equal(operacaoCarro(a,data).destino,destino);
 const p=projetarContaRecepcao({aluno:a,...e}),horarios=await calcularHorariosLocais(p,{categoria:'B',unidade:origem,data},'2026-10-18T06:00:00');assert.ok(horarios.some(h=>h.hora==='09:00'));
 const pares=paresNaUnidade(e,op(origem),data,'09:00',{categoria:'B',alunoId:'s'},agora);assert.equal(pares.length,1);
 const n=agendarAula(e,op(origem),{alunoId:'s',categoria:'B',data,inicio:'09:00',instrutorId:'i',veiculoId:'v'},'reserva',agora);
 assert.equal(n.aulas.length,1);assert.equal(n.aulas[0].localReal.id,destino);assert.equal(n.aulas[0].unidadeCarro,origem);assert.equal(n.alunos[0].unidadeCarro,origem);assert.equal(n.alunos[0].unidadePrincipal,origem);assert.equal(n.alunos[0].creditos.B.disponiveis,9);assert.deepEqual(e,antes);
});
test('câmbio, operação explícita, vínculos, jornada, almoço, bloqueios e conflitos não são ignorados',async()=>{
 for(const tipoCambio of ['manual','automatico']){
  const e=fixture('Cobilândia',tipoCambio),a=e.alunos[0],data='2026-10-22',q={categoria:'B',data,unidade:'Cobilândia'},calc=()=>calcularHorariosLocais(projetarContaRecepcao({aluno:a,...e}),q,'2026-10-18T06:00:00');
  assert.ok((await calc()).length);e.recursos[1].tipoCambio=tipoCambio==='manual'?'automatico':'manual';assert.equal((await calc()).length,0);e.recursos[1].tipoCambio=tipoCambio;
  e.recursos[1].operacoesCarro=[];assert.ok((await calc()).length);e.recursos[1].operacoesCarro=DESLOCAMENTOS_CARRO.filter(x=>x.origem==='Cobilândia');
  e.recursos[0].veiculoIds=['outro'];assert.equal((await calc()).length,0);e.recursos[0].veiculoIds=['v'];
  assert.ok(!(await calc()).some(h=>['11:00','12:00'].includes(h.hora)));
  e.recursos[0].bloqueios=[{data,inicio:'09:00',fim:'10:00'}];assert.ok(!(await calc()).some(h=>h.hora==='09:00'));delete e.recursos[0].bloqueios;
  e.recursos[0].bloqueios=[{data}];assert.equal(paresNaUnidade(e,op('Cobilândia'),data,'09:00',{categoria:'B',alunoId:'s'},agora).length,0);delete e.recursos[0].bloqueios;
  e.recursos[0].disponibilidadeSemanal=[{dia:4,inicio:'14:00',fim:'16:00'}];assert.equal(paresNaUnidade(e,op('Cobilândia'),data,'09:00',{categoria:'B',alunoId:'s'},agora).length,0);delete e.recursos[0].disponibilidadeSemanal;
  e.recursos[0].disponibilidade={4:[{inicio:'14:00',fim:'16:00'}]};const p=projetarContaRecepcao({aluno:a,...e});assert.ok((await calcularHorariosLocais(p,q,'2026-10-18T06:00:00')).every(h=>h.hora>='14:00'&&h.fim<='16:00'));delete e.recursos[0].disponibilidade;
  e.aulas.push({id:'ocupada',alunoId:'outro',categoria:'B',unidade:'Vila Velha',data,inicio:'09:00',fim:'09:50',status:1,instrutorId:'i',veiculoId:'v'});assert.equal(paresNaUnidade(e,op('Cobilândia'),data,'09:00',{categoria:'B',alunoId:'s'},agora).length,0);
 }
});
test('recursos de destino não são liberados sem vínculo; transferência preserva câmbio e histórico',()=>{
 const e=fixture(),a=e.alunos[0],r={...e.recursos[1],id:'externo',unidade:'Vila Velha',operacoesCarro:[]};e.recursos.push(r);
 assert.ok(!consultarRecursos(e,op('Cobilândia')).some(x=>x.id==='externo'));assert.equal(recursoCarroCompativel(r,a,'2026-10-22'),false);
 a.tipoCambio='automatico';assert.throws(()=>transferirAluno(e,op('Cobilândia'),'s','Itaparica','Solicitação de teste',[],agora));
 const n=transferirAluno(e,op('Cobilândia'),'s','Vila Velha','Solicitação de teste',[],agora);assert.equal(n.alunos[0].tipoCambio,'automatico');assert.equal(n.alunos[0].historico.length,1);assert.equal(a.unidadeCarro,'Cobilândia');
 assert.equal(unidadeCarroPermitida('automatico','Cobilândia'),true);assert.equal(unidadeCarroPermitida('automatico','Vila Velha'),true);assert.equal(unidadeCarroPermitida('manual','Novo Milênio'),true);
 assert.equal(localCarro(a,'2026-10-25'),null);
});
test('cadastro de veículos exige câmbio real e operação autorizada pela própria unidade',()=>{
 const d={tipo:'Veículos',nome:'Veículo teste',identificacao:'TST0B01',categoria:'B',inicio:'07:00',fim:'19:00',instrutorId:'i'},e={alunos:[],aulas:[],recursos:fixture().recursos.filter(r=>r.tipo==='Instrutores')};
 assert.throws(()=>cadastrarRecurso(e,op('Cobilândia'),d,'v'));
 assert.throws(()=>cadastrarRecurso(e,op('Itaparica'),{...d,tipoCambio:'automatico'},'v'));
 const n=cadastrarRecurso(e,op('Cobilândia'),{...d,tipoCambio:'automatico',operacoesCarro:[DESLOCAMENTOS_CARRO[2]]},'v');assert.equal(n.recursos.find(r=>r.id==='v').tipoCambio,'automatico');
 assert.throws(()=>cadastrarRecurso(e,op('Novo Milênio'),{...d,tipoCambio:'manual',operacoesCarro:[DESLOCAMENTOS_CARRO[2]]},'v'));
});
