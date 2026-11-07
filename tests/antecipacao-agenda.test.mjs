// Antecipação de ponta a ponta no front (C1–C7): grade do aluno (ocupado × indisponível × sua aula), interesse com a
// unidade da grade, textos da aba Interesses, dia lotado, contagem única do aviso e da agenda, selo da célula e a
// edição do instrutor sem apagar almoço e jornada. fetch simulado: nada sai da máquina.
import test from 'node:test';
import assert from 'node:assert/strict';

globalThis.window={location:{hostname:'localhost',href:'http://localhost/aluno/html/agendamento.html'}};
const guardado=new Map();
globalThis.sessionStorage={getItem:k=>guardado.get(k)??null,setItem:(k,v)=>guardado.set(k,String(v)),removeItem:k=>guardado.delete(k)};
const chamadas=[];let respostas=[];
globalThis.fetch=async(url,init={})=>{
 chamadas.push({url:decodeURIComponent(String(url)),metodo:init.method,corpo:init.body});
 const r=respostas.find(x=>x.quando(decodeURIComponent(String(url)),init.method));
 if(!r)return new Response('',{status:404});
 return new Response(r.corpo===undefined?null:JSON.stringify(r.corpo),{status:r.status??200});
};
const rota=(metodo,trecho,corpo,status)=>({quando:(u,m)=>m===metodo&&u.includes(trecho),corpo,status});
const {criarServicoAluno,adaptarInteresse}=await import('../aluno/js/services/alunoIntegrado.js');
const {criarServicoAdministrativoIntegrado,mapaUnidades,adaptarRecursos,corpoOperacaoInstrutor}=await import('../shared/js/services/administracaoIntegrada.js');
const {permissoesDoPerfil}=await import('../shared/js/permissoesAdministrativas.js');
const {contarAguardandoContato,interessadosAptos,liberadoDaCelula,textoHorariosLiberados}=await import('../shared/js/regrasAntecipacao.js');
const {motivoAlmoco,almocoConfigurado}=await import('../shared/js/categorias.js');
const {hojeBrasil,somarDias}=await import('../shared/js/calendario.js');

const U1='33333333-3333-4333-8333-333333333333';
const slot=(hora,extra)=>({horario:hora,dataHoraInicio:'2026-11-10T'+hora+':00',dataHoraFim:'2026-11-10T'+hora.slice(0,2)+':50:00',...extra});

test('aluno (C1): só "ocupado" vira interesse; "indisponivel" e passado saem; a aula dele vira "Sua aula"; a contagem ignora as duas',async()=>{
 respostas=[rota('GET','horarios-disponiveis',{data:'2026-11-10',fechado:false,unidadeId:U1,horarios:[
  slot('08:00',{disponivel:false,motivo:'passado',motoristas:[]}),
  slot('09:00',{disponivel:true,motoristas:[{motoristaId:'m1',nome:'Patrícia',veiculos:[{veiculoId:'v1',modelo:'Onix',placa:'ABC1D23'}]}]}),
  slot('12:00',{disponivel:false,motivo:'indisponivel',motoristas:[]}),
  slot('15:00',{disponivel:false,motivo:'alunoOcupado',motoristas:[]}),
  slot('17:00',{disponivel:false,motivo:'ocupado',motoristas:[]})]}),
  rota('GET','alunos/me/interesses-antecipacao',[]),
  rota('POST','alunos/me/interesses-antecipacao',{id:'i9',categoria:{valor:2},dataHoraInicio:'2026-11-10T17:00:00',situacao:{valor:1},unidade:'Cobilândia',podeSerAtendido:true},201)];
 const s=criarServicoAluno(),c=await s.consultarRecursosLocal({categoria:'B',data:'2026-11-10'});
 assert.deepEqual(c.horarios.map(h=>[h.hora,h.ocupado?'ocupado':h.propria?'sua aula':'livre']),[['09:00','livre'],['15:00','sua aula'],['17:00','ocupado']]);
 const livres=c.horarios.filter(h=>!h.ocupado&&!h.propria),ocupados=c.horarios.filter(h=>h.ocupado);
 assert.deepEqual([livres.length,ocupados.length],[1,1]);assert.equal(c.mensagem,'');assert.equal(c.unidadeId,U1);
 // C2: a unidade em que a grade foi montada vai no POST.
 chamadas.length=0;const ocupado=c.horarios.find(h=>h.ocupado);
 const novo=await s.marcarInteresse({categoria:'B',data:'2026-11-10',hora:ocupado.hora,unidadeId:ocupado.unidadeId});
 assert.deepEqual(JSON.parse(chamadas.find(x=>x.metodo==='POST').corpo),{categoria:2,dataHoraInicio:'2026-11-10T17:00:00',unidadeId:U1});
 assert.deepEqual([novo.situacao,novo.aberto,novo.unidade],['Aguardando',true,'Cobilândia']);
 // Sem unidade conhecida (ou id que não é Guid), o campo fica fora do corpo.
 chamadas.length=0;await s.marcarInteresse({categoria:'B',data:'2026-11-10',hora:'17:00',unidadeId:'Cobilândia'});
 assert.deepEqual(Object.keys(JSON.parse(chamadas.find(x=>x.metodo==='POST').corpo)),['categoria','dataHoraInicio']);
 // A recusa do servidor (horário que não é "ocupado") chega com a mensagem dele.
 respostas=[rota('POST','alunos/me/interesses-antecipacao',{title:'Erro',listErrors:[{mensagem:'Esse horário não está aberto para antecipação.'}]},400)];
 await assert.rejects(s.marcarInteresse({categoria:'B',data:'2026-11-10',hora:'12:00'}),/não está aberto para antecipação/);
});

test('aluno: horário com interesse descartado pela Recepção não oferece "Tenho interesse" de novo',async()=>{
 respostas=[rota('GET','horarios-disponiveis',{data:'2026-11-10',fechado:false,horarios:[slot('10:00',{disponivel:false,motivo:'ocupado',motoristas:[]}),slot('11:00',{disponivel:false,motivo:'ocupado',motoristas:[]})]}),
  rota('GET','alunos/me/interesses-antecipacao',[{id:'d1',categoria:{valor:2},dataHoraInicio:'2026-11-10T10:00:00',situacao:{valor:4,descricao:'Descartado'}},{id:'d2',categoria:{valor:1},dataHoraInicio:'2026-11-10T11:00:00',situacao:{valor:4}}])];
 const c=await criarServicoAluno().consultarRecursosLocal({categoria:'B',data:'2026-11-10'});
 assert.deepEqual(c.horarios.map(h=>[h.hora,!!h.descartado]),[['10:00',true],['11:00',false]]);
 // Falha ao ler os interesses não esconde nada.
 respostas=[respostas[0]];
 const sem=await criarServicoAluno().consultarRecursosLocal({categoria:'B',data:'2026-11-10'});
 assert.deepEqual(sem.horarios.map(h=>!!h.descartado),[false,false]);
});

test('aluno (C3/C4): textos da aba Interesses e unidade "Qualquer unidade"',()=>{
 const base={id:'i1',categoria:{valor:2},dataHoraInicio:'2026-11-10T17:00:00',unidade:null};
 const ler=extra=>{const i=adaptarInteresse({...base,...extra});return [i.situacao,i.aberto,i.podeSerAtendido];};
 assert.deepEqual(ler({situacao:{valor:1}}),['Aguardando',true,true]);
 assert.deepEqual(ler({situacao:{valor:2,descricao:'Contatado'}}),['Recepção entrou em contato',true,true]);
 assert.deepEqual(ler({situacao:{valor:3,descricao:'Remarcado'}}),['Atendido',false,false]);
 assert.deepEqual(ler({situacao:{valor:1,descricao:'Atendido'}}),['Atendido',false,false]);
 assert.deepEqual(ler({situacao:{valor:4,descricao:'Descartado'}}),['Não atendido',false,false]);
 assert.deepEqual(ler({situacao:{valor:1},podeSerAtendido:false}),['Sem aula para antecipar · desmarque',true,false]);
 assert.equal(adaptarInteresse({...base,situacao:{valor:1}}).unidade,'Qualquer unidade');
 assert.equal(adaptarInteresse({...base,situacao:{valor:1},unidade:'Cobilândia'}).unidade,'Cobilândia');
});

test('aluno (C5): dia sem horário livre mas com temLotado volta marcado como lotado; fechado não',async()=>{
 respostas=[rota('GET','dias-disponiveis',{dias:[{data:'2026-11-10',fechado:false,temHorario:false,temLotado:true},{data:'2026-11-11',fechado:false,temHorario:false,temLotado:false},{data:'2026-11-12',fechado:false,temHorario:true,temLotado:true},{data:'2026-11-15',fechado:true,temHorario:false,temLotado:true}]})];
 const s=criarServicoAluno(),ler=async data=>{const r=await s.disponibilidadeLocal({categoria:'B',data});return [r.length,!!r.lotado];};
 assert.deepEqual(await ler('2026-11-10'),[0,true]);assert.deepEqual(await ler('2026-11-11'),[0,false]);
 assert.deepEqual(await ler('2026-11-12'),[1,false]);assert.deepEqual(await ler('2026-11-15'),[0,false]);
});

// ---------------------------------------------------------------- Recepção
const UNIDADES=[{id:'g-cobi',nome:'Cobilândia'},{id:'g-centro',nome:'Centro de Vila Velha'}];
const recepcao={id:'eq1',nome:'Recepção',perfil:'operador',nivel:1,unidade:'Cobilândia',unidades:['Cobilândia'],permissoes:permissoesDoPerfil('operador')};
const aula=(id,dentroPrazo)=>({id,dataHoraInicio:'2026-11-20T10:00:00',dataHoraFim:'2026-11-20T10:50:00',horasUteis:dentroPrazo?96:20,dentroPrazo});
const interessado=(id,situacao,extra={})=>({interesseId:id,alunoId:'al-'+id,nome:'Aluno '+id,telefone:'27999990000',situacao:{valor:situacao},marcadoEm:'2026-11-04T12:00:00Z',aulas:[aula('a-'+id,true)],...extra});
const liberado=(hora,interessados,pares=[{motoristaId:'m1',instrutor:'Patrícia',veiculoId:'v1',modelo:'Onix',placa:'ABC1D23'}])=>({unidadeId:'g-cobi',unidade:'Cobilândia',categoria:{valor:2,descricao:'B'},dataHoraInicio:'2026-11-10T'+hora+':00',dataHoraFim:'2026-11-10T'+hora.slice(0,2)+':50:00',prazoHorasUteis:48,pares,interessados});

test('Recepção (C4/C7): podeSerAtendido vem da API (ou da conta pelas aulas) e a contagem do aviso é a mesma da agenda',async()=>{
 respostas=[rota('GET','antecipacoes/horarios-liberados?',[
  liberado('09:00',[interessado('1',1)]),
  liberado('10:00',[interessado('2',2)]),
  liberado('11:00',[interessado('3',1,{podeSerAtendido:false})]),
  liberado('13:00',[interessado('4',1,{aulas:[aula('x',false)]})]),
  liberado('14:00',[interessado('5',1,{podeSerAtendido:true}),interessado('6',2)])])];
 const s=criarServicoAdministrativoIntegrado(recepcao,mapaUnidades(UNIDADES)),lista=await s.consultarLiberados({de:'2026-11-10',ate:'2026-11-20'});
 assert.deepEqual(lista.map(h=>h.interessados.map(i=>i.podeSerAtendido)),[[true],[true],[false],[false],[true,true]]);
 // Só 09:00 e 14:00 têm interessado Aguardando que pode ser atendido (10:00 só tem Contatado).
 assert.equal(contarAguardandoContato(lista),2);assert.equal(textoHorariosLiberados(2),'2 horários liberados com aluno interessado');assert.equal(textoHorariosLiberados(1),'1 horário liberado com aluno interessado');
 // Selo da célula: interessados em aberto que podem ser atendidos, no instrutor da agenda.
 assert.deepEqual(lista.map(h=>interessadosAptos(h).length),[1,1,0,0,2]);
 const celula=extra=>liberadoDaCelula(lista,{data:'2026-11-10',hora:'14:00',categorias:['B'],instrutorId:'m1',...extra});
 assert.equal(celula().inicio,'14:00');assert.equal(celula({instrutorId:'outro'}),null);assert.equal(celula({categorias:['A']}),null);assert.equal(celula({hora:'11:00'}),null);
 assert.equal(celula({hora:'10:00'}).interessados[0].situacao,'Contatado');
});

test('Recepção (C6): GET vinculos com almoço e jornada; editar só o nome não chama o PUT de operação e nunca manda null',()=>{
 const u=mapaUnidades(UNIDADES);
 const [r]=adaptarRecursos([{id:'vin1',motoristaId:'m1',motoristaNome:'Patrícia',motoristaCategorias:[{valor:2}],unidades:[{id:'g-cobi'}],horarioAlmoco:'12:00:00/13:00:00',jornada:{inicio:'07:00:00',fim:'19:00:00'},disponivel:false,observacoes:'Só manhã'}],u);
 assert.deepEqual([r.horarioAlmoco,r.jornada,r.disponivel,r.observacoes,r.disponibilidade[1][0]],['12:00/13:00',{inicio:'07:00',fim:'19:00'},false,'Só manhã',{inicio:'07:00',fim:'19:00'}]);
 assert.equal(almocoConfigurado(r),true);assert.equal(motivoAlmoco(r,'11:00'),'');assert.equal(motivoAlmoco(r,'12:00'),'Intervalo de almoço do instrutor');assert.equal(motivoAlmoco(r,'13:00'),'');
 // O formulário manda o almoço atual, sem pedir troca, e as observações iguais: nada de operação mudou.
 assert.equal(corpoOperacaoInstrutor(r,{nome:'Patrícia S.',horarioAlmoco:r.horarioAlmoco,observacoes:'Só manhã',alterarAlmoco:false}),null);
 // Só as observações mudaram: o PUT sai com os valores atuais de almoço, jornada e disponível.
 assert.deepEqual(corpoOperacaoInstrutor(r,{observacoes:' Tarde também ',alterarAlmoco:false}),{horarioAlmoco:'12:00/13:00',jornadaInicio:'07:00',jornadaFim:'19:00',disponivel:false,observacoes:'Tarde também'});
 assert.deepEqual(corpoOperacaoInstrutor(r,{horarioAlmoco:'11:00/12:00',alterarAlmoco:true,observacoes:'Só manhã'}).horarioAlmoco,'11:00/12:00');
 // GET antigo (sem os campos): o que não foi lido fica fora do corpo, nunca null.
 const [antigo]=adaptarRecursos([{id:'vin2',motoristaId:'m2',motoristaNome:'Anderson',motoristaCategorias:[{valor:2}],unidades:[]}],u);
 const corpo=corpoOperacaoInstrutor(antigo,{observacoes:'Nova',alterarAlmoco:false});
 assert.deepEqual(corpo,{observacoes:'Nova'});assert.ok(!Object.values(corpo).includes(null));
});

test('Recepção (C6): editarInstrutor com só o nome alterado faz o PUT do motorista e não o de operação',async()=>{
 const amanha=somarDias(hojeBrasil(),2);
 const vinculo={id:'vin1',motoristaId:'m1',motoristaNome:'Patrícia',motoristaCpf:'11144477735',motoristaCategorias:[{valor:2}],cnhVencida:false,credenciamentoVencido:false,unidades:[{id:'g-cobi',nome:'Cobilândia'}],
  horarioAlmoco:'12:00/13:00',jornada:{inicio:'07:00',fim:'19:00'},disponivel:true,observacoes:'',veiculos:[{id:'v1',modelo:'Onix',placa:'ABC1D23',categoria:{valor:2},tipoCambio:{valor:1}}]};
 respostas=[rota('PUT','motoristas/m1/pela-autoescola',undefined,204),rota('PUT','vinculos/vin1/operacao',undefined,204),rota('GET','/api/alunos',[]),rota('GET','/api/vinculos',[vinculo]),
  rota('GET','/api/agendamentos?',[{id:'a1',alunoId:'al1',motoristaId:'m1',veiculoId:'v1',categoria:{valor:2},status:{valor:1},dataHoraInicio:amanha+'T09:00:00',dataHoraFim:amanha+'T09:50:00',unidadeId:'g-cobi'}])];
 const s=criarServicoAdministrativoIntegrado(recepcao,mapaUnidades(UNIDADES));chamadas.length=0;
 await s.editarInstrutor('m1',{nome:'Patrícia Souza',categoria:'B',horarioAlmoco:'12:00/13:00',observacoes:'',alterarAlmoco:false});
 assert.ok(chamadas.some(c=>c.metodo==='PUT'&&c.url.includes('motoristas/m1/pela-autoescola')));
 assert.ok(!chamadas.some(c=>c.url.includes('/operacao')));
 chamadas.length=0;
 await s.editarInstrutor('m1',{nome:'Patrícia Souza',categoria:'B',horarioAlmoco:'12:00/13:00',observacoes:'Prefere manhã',alterarAlmoco:false});
 const put=chamadas.find(c=>c.url.includes('vinculos/vin1/operacao'));
 assert.deepEqual(JSON.parse(put.corpo),{horarioAlmoco:'12:00/13:00',jornadaInicio:'07:00',jornadaFim:'19:00',disponivel:true,observacoes:'Prefere manhã'});
});

test('agenda: almoço sem cadastro aparece como "Almoço não configurado", não como "Intervalo"',async()=>{
 const {textoCurtoBloqueio}=await import('../shared/js/categorias.js');
 assert.equal(textoCurtoBloqueio('Horário de almoço não configurado para este instrutor.'),'Almoço não configurado');
 assert.equal(textoCurtoBloqueio('Intervalo de almoço do instrutor'),'Intervalo');
 assert.equal(textoCurtoBloqueio('Horário passado'),'Passado');
 assert.equal(textoCurtoBloqueio('Sem veículo livre'),'Sem veículo livre');
});
