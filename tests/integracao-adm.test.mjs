// Painéis da equipe (ADM 1, 2 e 3) com a API (contrato 3.3 a 3.5 do plano).
// fetch simulado: nada sai da máquina.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window={location:{hostname:'localhost',href:'http://localhost/nivel-3-master/html/master.html'}};
const guardado=new Map();
globalThis.sessionStorage={getItem:k=>guardado.get(k)??null,setItem:(k,v)=>guardado.set(k,String(v)),removeItem:k=>guardado.delete(k)};
const chamadas=[];let respostas=[];
globalThis.fetch=async(url,init={})=>{
 chamadas.push({url:decodeURIComponent(String(url)),metodo:init.method,cabecalhos:init.headers||{},corpo:init.body});
 const r=respostas.find(x=>x.quando(decodeURIComponent(String(url)),init.method));
 if(!r)return new Response('',{status:404});
 return new Response(r.corpo===undefined?null:JSON.stringify(r.corpo),{status:r.status??200});
};
const rota=(metodo,trecho,corpo,status)=>({quando:(u,m)=>m===metodo&&u.includes(trecho),corpo,status});
const corpoDe=trecho=>JSON.parse(chamadas.find(c=>c.url.includes(trecho)&&c.metodo!=='GET').corpo);
const {carregarIdentidadeEquipe,criarServicoAdministrativoIntegrado,capacidadesDoMembro,mapaUnidades}=await import('../shared/js/services/administracaoIntegrada.js');
const {permissoesDoPerfil}=await import('../shared/js/permissoesAdministrativas.js');
const {hojeBrasil,somarDias}=await import('../shared/js/calendario.js');

const UNIDADES=[{id:'g-cobi',nome:'Cobilândia'},{id:'g-centro',nome:'Centro de Vila Velha'},{id:'g-sr',nome:'Unidade Santa Rita'}];
const amanha=somarDias(hojeBrasil(),2),ontem=somarDias(hojeBrasil(),-1);
const alunoApi={id:'al1',nome:'Ana Souza',cpf:'52998224725',email:'ana@x.com',telefone:'27999990000',dataNascimento:'2000-01-01',categoriasPretendidas:[{valor:1,descricao:'A'},{valor:2,descricao:'B'}],
 matricula:{unidadeBase:{id:'g-cobi',nome:'Cobilândia'},unidadeCarro:{id:'g-cobi',nome:'Cobilândia'},tipoCambio:{valor:1,descricao:'Manual'}},situacaoCadastral:'Pendente',acesso:{possuiConta:true,deveTrocarSenha:true}};
const vinculoApi={id:'vin1',motoristaId:'m1',motoristaNome:'Instrutor Um',motoristaCpf:'11144477735',motoristaCategorias:[{valor:2}],cnhVencida:false,credenciamentoVencido:false,
 unidades:[{id:'g-cobi',nome:'Cobilândia'}],horarioAlmoco:'12:00/13:00',jornada:{inicio:'07:00',fim:'18:00'},veiculos:[{id:'v1',modelo:'Onix',placa:'ABC1D23',categoria:{valor:2},tipoCambio:{valor:1}}]};
const aulaApi=(extra={})=>({id:'a1',alunoId:'al1',alunoNome:'Ana Souza',motoristaId:'m1',motoristaNome:'Instrutor Um',veiculoId:'v1',veiculoModelo:'Onix',categoria:{valor:2,descricao:'B'},status:{valor:1},dataHoraInicio:amanha+'T09:00:00',dataHoraFim:amanha+'T09:50:00',unidadeId:'g-cobi',unidade:'Cobilândia',...extra});
const leituras=()=>[rota('GET','/api/alunos?',[alunoApi]),rota('GET','/api/alunos',[alunoApi]),rota('GET','/api/vinculos',[vinculoApi]),rota('GET','/api/agendamentos?',[aulaApi(),aulaApi({id:'a2',status:{valor:7},dataHoraInicio:ontem+'T10:00:00',dataHoraFim:ontem+'T10:50:00'})])];
const telasGerencia=['alunos','agenda','motoristas','atestados','acompanhamento','antecipacoes','relatorios','decisao-atestados','correcoes'].map(alias=>({alias,le:true,cria:true,atualiza:true,remove:true}));

test('identidade: painel do papel, unidade por Guid e capacidades pelas telas (sem tela de N5 não vira Master)',async()=>{
 respostas=[rota('GET','equipe/me',{membroId:'eq1',nome:'Gerente',painel:{valor:2},unidades:[{id:'g-cobi',nome:'Cobilândia'}],telas:telasGerencia}),rota('GET','/api/unidades',UNIDADES)];
 const {identidade,unidades}=await carregarIdentidadeEquipe('gerencia');
 assert.equal(identidade.nivel,2);assert.equal(identidade.unidade,'Cobilândia');assert.deepEqual(identidade.unidades,['Cobilândia']);
 assert.equal(unidades.guid('Vila Velha'),'g-centro');assert.equal(unidades.chave('g-sr'),'Santa Rita');
 assert.ok(identidade.permissoes.includes('decidir-atestado'));assert.ok(!identidade.permissoes.includes('excluir-cadastro'));assert.ok(!identidade.permissoes.includes('gestao-acessos'));
 await assert.rejects(carregarIdentidadeEquipe('master'),/não possui acesso a este painel/);
 assert.deepEqual(capacidadesDoMembro({capacidades:['consultar','excluir-cadastro']},'operador'),['consultar']);
});

test('leitura: aluno AB com unidade da API, instrutor e veículo do vínculo, status 7 como cancelada com crédito retido',async()=>{
 const op={id:'eq1',nome:'Recepção',perfil:'operador',nivel:1,unidade:'Cobilândia',unidades:['Cobilândia'],permissoes:permissoesDoPerfil('operador')};
 respostas=leituras();chamadas.length=0;
 const s=criarServicoAdministrativoIntegrado(op,mapaUnidades(UNIDADES)),d=await s.consultar();
 const a=d.alunos[0];assert.equal(a.categoria,'AB');assert.equal(a.unidadePrincipal,'Cobilândia');assert.equal(a.tipoCambio,'manual');
 assert.deepEqual(d.recursos.map(r=>[r.id,r.tipo,r.unidade]),[['m1','Instrutores','Cobilândia'],['v1','Veículos','Cobilândia']]);
 assert.equal(d.recursos[0].horarioAlmoco,'12:00/13:00');assert.equal(d.recursos[0].ativo,true);
 const cancelada=d.aulas.find(x=>x.id==='a2');assert.equal(cancelada.status,2);assert.equal(cancelada.statusApi,7);assert.equal(cancelada.cancelamento.credito,'retido');
 assert.equal(d.aulas.find(x=>x.id==='a1').inicio,'09:00');
 assert.ok(chamadas.some(c=>c.url.includes('/api/agendamentos?')&&c.url.includes('status=7')));
 respostas=[rota('GET','/api/alunos/al1/provas',[{tipo:{valor:1},tentativas:[{id:'t1',ordem:1,status:{valor:2},data:amanha}]}]),rota('GET','/api/alunos/al1',{...alunoApi,saldos:[{categoria:{valor:2},contratadas:10,disponiveis:8}]}),...leituras()];
 const f=await s.ficha('al1');assert.equal(f.aluno.creditos.B.disponiveis,8);assert.equal(f.tentativas[0].status,'Agendado');assert.equal(f.aulas.length,2);
});

test('comandos da Recepção: agenda, cancela e marca falta pela API; cadastro e redefinição devolvem a senha do servidor',async()=>{
 const op={id:'eq1',nome:'Recepção',perfil:'operador',nivel:1,unidade:'Cobilândia',unidades:['Cobilândia'],permissoes:permissoesDoPerfil('operador')};
 respostas=[rota('POST','agendamentos/pela-equipe',{ids:['n1']},201),rota('POST','/cancelar',{},200),rota('POST','marcar-falta',undefined,204),
  rota('POST','alunos/pela-autoescola',{id:'al2',senhaProvisoria:'Xy7-provisoria'},201),rota('POST','redefinir-acesso',{senhaProvisoria:'Nova-9876'}),...leituras()];
 const s=criarServicoAdministrativoIntegrado(op,mapaUnidades(UNIDADES));chamadas.length=0;
 await s.agendar({alunoId:'al1',categoria:'B',data:amanha,inicio:'10:00',instrutorId:'m1',veiculoId:'v1'});
 const post=chamadas.find(c=>c.url.includes('pela-equipe'));assert.ok(post.cabecalhos['Idempotency-Key']);
 assert.deepEqual(JSON.parse(post.corpo),{alunoId:'al1',categoria:2,aulas:[{dataHoraInicio:amanha+'T10:00:00',motoristaId:'m1',veiculoId:'v1'}]});
 await s.cancelarAula('a1',{motivo:'Motivos de saúde',observacoes:'Aluno ligou',aceitarConsequencias:true});
 assert.deepEqual(corpoDe('/agendamentos/a1/cancelar'),{motivoCancelamentoId:5,observacoes:'Aluno ligou',aceitarConsequencias:true});
 await s.registrarFrequencia('a2',6,'Aluno não compareceu');assert.deepEqual(corpoDe('a2/marcar-falta'),{motivo:'Aluno não compareceu'});
 await assert.rejects(s.registrarFrequencia('a2',6,'x'),/motivo/);
 const criado=await s.cadastrar({nome:'Bruno Lima',cpf:'111.444.777-35',nascimento:'1999-05-05',telefone:'27988887777',email:'b@x.com',categoria:'B',tipoCambio:'manual',unidadeCarro:'Cobilândia',quantidadeCarro:'10',observacoes:'Pacote de balcão'},'chave-1');
 assert.equal(criado.senhaProvisoria,'Xy7-provisoria');
 const cad=chamadas.find(c=>c.url.includes('pela-autoescola'));assert.equal(cad.cabecalhos['Idempotency-Key'],'chave-1');
 assert.deepEqual(JSON.parse(cad.corpo),{nome:'Bruno Lima',cpf:'11144477735',dataNascimento:'1999-05-05',email:'b@x.com',telefone:'27988887777',categorias:[2],unidadeId:'g-cobi',unidadeCarroId:'g-cobi',tipoCambioId:1,observacoes:'Pacote de balcão',aulas:[{categoria:2,quantidade:10}]});
 const r=await s.redefinirSenhaAluno('al1',{justificativa:'Aluno esqueceu a senha'});assert.equal(r.senhaProvisoria,'Nova-9876');
 assert.deepEqual(corpoDe('alunos/al1/redefinir-acesso'),{justificativa:'Aluno esqueceu a senha'});
});

test('Gerência e Master: correção de atestado final, cancelamento excepcional, exclusão e acesso com senha gerada no servidor',async()=>{
 const op={id:'eq9',nome:'Master',perfil:'master',nivel:3,unidade:'Cobilândia',unidadeConsulta:null,unidades:['Cobilândia','Vila Velha','Santa Rita'],permissoes:permissoesDoPerfil('master')};
 respostas=[rota('GET','solicitacoes-medicas?',[{id:'s1',aulaIds:['a2'],status:{valor:3},categoria:{valor:2}}]),rota('POST','solicitacoes-medicas/s1/correcao',{}),rota('POST','cancelar-excepcional',{}),
  rota('DELETE','alunos/al1/cadastro',{modalidade:'logica'}),rota('GET','/api/equipe?',[{id:'eq2',nome:'Recepcionista',email:'r@x.com',painel:{valor:1},papel:{id:'p1'},unidades:[{id:'g-cobi'}],ativo:true}]),
  rota('GET','/api/equipe',[{id:'eq2',nome:'Recepcionista',email:'r@x.com',painel:{valor:1},papel:{id:'p1'},unidades:[{id:'g-cobi'}],ativo:true}]),rota('GET','/api/motoristas',[]),
  rota('POST','equipe/eq2/redefinir-acesso',{senhaProvisoria:'Servidor-123'}),...leituras()];
 const s=criarServicoAdministrativoIntegrado(op,mapaUnidades(UNIDADES));chamadas.length=0;
 await s.decidirAtestado('s1',{resultado:'rejeitado',justificativa:'Documento ilegível',confirmado:true,operacaoId:'op-12345678'});
 const correcao=chamadas.find(c=>c.url.includes('/correcao'));assert.equal(correcao.cabecalhos['Idempotency-Key'],'op-12345678');
 await s.cancelarExcepcional('a1',{motivo:'Ausência do instrutor',credito:'devolvido',justificativa:'Instrutor doente',confirmado:true});
 assert.deepEqual(corpoDe('cancelar-excepcional'),{motivoCancelamentoId:11,credito:'devolvido',justificativa:'Instrutor doente'});
 await s.excluirCadastro({tipo:'aluno',id:'al1',confirmado:true,justificativa:'Cadastro duplicado'});assert.deepEqual(corpoDe('alunos/al1/cadastro'),{justificativa:'Cadastro duplicado'});
 const contas=await s.consultarAcessos();assert.deepEqual(contas.map(c=>[c.id,c.perfil]),[['eq2','operador'],['al1','aluno']]);
 const r=await s.gerirAcesso({id:'eq2',acao:'redefinir',confirmado:true,justificativa:'Esqueceu a senha'});assert.equal(r.senhaProvisoria,'Servidor-123');
 assert.deepEqual(corpoDe('equipe/eq2/redefinir-acesso'),{justificativa:'Esqueceu a senha'});
 assert.equal(s.senhaPeloServidor,true);
 const est=await s.estado();assert.deepEqual(est.alunos.map(a=>a.id),['al1']);assert.equal(est.aulas.find(a=>a.id==='a2').solicitacaoMedica.status,'aprovado');
});
