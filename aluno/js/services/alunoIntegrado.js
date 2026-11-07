// Adaptador do Aluno com a API (contrato 3.1 do plano). Mantém a interface que as
// telas já usam (a mesma do serviço local da recepção): dadosAlunoLocal,
// consultarRecursosLocal, disponibilidadeLocal, reservarAulasLocais,
// cancelarReservaLocal, solicitarCancelamentoMedico, documentoMedico etc.
// O servidor é a autoridade: aqui só se converte o formato.
import * as api from '../../../shared/js/api.js';
import {textoErro} from '../../../shared/js/apiErro.js';
import {sair} from '../../../shared/js/services/authService.js';
import {hojeBrasil,somarDias,comFusoBrasil} from '../../../shared/js/calendario.js';
import {MOTIVOS_CANCELAMENTO,identificarMotivo} from '../domain/agendamentoAluno.js';

const numero=v=>v?.valor??v;
const LETRA=Object.freeze({1:'A',2:'B',3:'D'}),NUMERO=Object.freeze({A:1,B:2,D:3});
const CAMBIO=Object.freeze({1:'manual',2:'automatico'});
const STATUS_MEDICO_API=Object.freeze({1:'recepcao',2:'gerencia',3:'aprovado',4:'rejeitado'});
const categoria=c=>typeof c==='string'?c:/^[ABD]$/.test(c?.descricao)?c.descricao:LETRA[numero(c)];
const nomeDe=v=>v?.nome??v??'';
const statusMedico=v=>STATUS_MEDICO_API[numero(v)]??v;
const comoErro=e=>{const n=new Error(textoErro(e));n.status=e?.status;return n;};
const chaveOperacao=()=>crypto.randomUUID();

// Motivo do horário indisponível (null, "ocupado", "indisponivel", "passado" ou "alunoOcupado"); a API antiga não manda.
// "ocupado" = existe instrutor e veículo aptos, mas todos com aula de outro aluno (só esse aceita interesse).
// "indisponivel" = nenhum par apto (almoço, jornada, bloqueio, validade, sem recurso): não vira interesse.
const motivoIndisponivel=h=>String(h.motivo?.descricao??h.motivo??'').toLowerCase();
// Textos do aluno para a situação do interesse (a Recepção usa Contatado/Remarcado/Descartado).
export const SITUACAO_INTERESSE_ALUNO=Object.freeze({1:'Aguardando',2:'Recepção entrou em contato',3:'Atendido',4:'Não atendido'});
export const SEM_AULA_PARA_ANTECIPAR='Sem aula para antecipar · desmarque';
// Interesse em antecipar (aluno): horário ocupado em que ele quer aula. O interesse aberto num horário em que ele já tem
// aula volta da API como atendido (situação lida, C3). O que não pode ser atendido (podeSerAtendido false, C4) continua
// aberto, mas pede para desmarcar.
export function adaptarInteresse(i){
 const inicio=comFusoBrasil(i?.dataHoraInicio),s=numero(i?.situacao),texto=String(i?.situacao?.descricao??(typeof s==='string'?s:'')).trim();
 const atendido=i?.atendido===true||s===3||/^(atendido|remarcado)$/i.test(texto),naoAtendido=!atendido&&(s===4||/^(descartado|n[aã]o atendido)$/i.test(texto));
 const aberto=!atendido&&!naoAtendido,podeSerAtendido=aberto&&i?.podeSerAtendido!==false;
 const situacao=atendido?SITUACAO_INTERESSE_ALUNO[3]:naoAtendido?SITUACAO_INTERESSE_ALUNO[4]:!podeSerAtendido?SEM_AULA_PARA_ANTECIPAR:SITUACAO_INTERESSE_ALUNO[s]??SITUACAO_INTERESSE_ALUNO[1];
 return {id:i?.id??i?.interesseId,categoria:categoria(i?.categoria),inicio,data:inicio?.slice(0,10),hora:inicio?.slice(11,16),unidade:nomeDe(i?.unidade)||'Qualquer unidade',
  situacao,aberto,podeSerAtendido,marcadoEm:i?.marcadoEm??i?.criadoEm??null};
}

// Agendamento automático (F13Dtos.cs). Ida: categoria 1/2/3 e só ids da API (as unidades da tela são nomes do
// catálogo; vazias = a unidade da categoria). Volta: a proposta no formato de gerarPropostaAutomatica (sem reserva).
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const idsApi=l=>[...new Set((l||[]).map(String).filter(x=>GUID.test(x)))];
export const unidadeDaCategoria=(cat,aluno)=>cat==='D'?'Cobilândia':cat==='A'?'Vila Velha':aluno?.unidadeCarro||aluno?.unidade||'';
export const corpoPreferenciasAutomaticas=p=>({categoria:NUMERO[p?.categoria]??null,unidades:idsApi(p?.unidades),dias:[...new Set((p?.dias||[]).map(Number))],
 horarios:[...new Set((p?.horarios||[]).map(h=>String(h).slice(0,5)))],instrutores:idsApi(p?.instrutores),veiculos:idsApi(p?.veiculos),quantidade:Number(p?.quantidade)||null});
export function adaptarPreferenciasAutomaticas(p){
 if(!p)return null;
 return {categoria:categoria(p.categoria),unidades:p.unidades||[],dias:(p.dias||[]).map(Number),horarios:(p.horarios||[]).map(h=>String(h).slice(0,5)),
  instrutores:p.instrutores||[],veiculos:p.veiculos||[],quantidade:p.quantidade||1,atualizadoEm:p.atualizadoEm??null};
}
export function adaptarPropostaAutomatica(p,aluno){
 const cat=categoria(p?.categoria);
 return {categoria:cat,solicitadas:p?.solicitadas??0,horizonteDias:p?.horizonteDias??90,aulas:(p?.aulas||[]).map(a=>({
  data:String(a.data).slice(0,10),hora:String(a.hora).slice(0,5),inicio:comFusoBrasil(a.dataHoraInicio),fim:a.dataHoraFim?comFusoBrasil(a.dataHoraFim):null,
  unidadeId:a.unidadeId??null,unidade:unidadeDaCategoria(cat,aluno),instrutorId:a.motoristaId,veiculoId:a.veiculoId,
  instrutor:a.motorista||'Instrutor',veiculo:[a.veiculo,a.placa].filter(Boolean).join(' · ')||'Veículo',placa:a.placa||''}))};
}

// Conversa com a Recepção (ConversasDtos.cs): datas em Brasília sem fuso. O aluno vê o painel de quem escreveu
// ("Recepção", "Gerência"), não o nome do membro.
export const adaptarConversaAluno=c=>({autoescolaId:c?.autoescolaId,autoescola:c?.autoescola||'Autoescola',conversaId:c?.conversaId??null,ultimaMensagemEm:comFusoBrasil(c?.ultimaMensagemEm)??null,naoLidas:Number(c?.naoLidas)||0,podeEnviar:c?.podeEnviar===true});
export const adaptarMensagemConversa=m=>({id:m?.id,texto:m?.texto??'',em:comFusoBrasil(m?.em)??null,daEquipe:m?.daEquipe===true,remetente:m?.remetente||(m?.daEquipe?'Recepção':'Você')});

// Solicitação médica (SolicitacaoMedicaReadDto) no formato de solicitacoesMedicas.js.
export function adaptarSolicitacao(s,alunoId){
 if(!s)return null;
 return {...s,alunoId:s.alunoId??alunoId,status:statusMedico(s.status),categoria:categoria(s.categoria),
  eventos:(s.eventos||[]).map(e=>({...e,anterior:statusMedico(e.anterior),novo:statusMedico(e.novo)})),
  devolucao:s.devolucao?{...s.devolucao,aulas:(s.devolucao.aulas||[]).map(a=>({...a,categoria:categoria(a.categoria)}))}:s.devolucao};
}

// Acompanhamento (MeuAcompanhamentoReadDto): situação vem como {descricao,valor} ou nula. A API só manda as provas
// com tentativa; a lista fica completa (teórica + prática de cada categoria do aluno), como no modo local.
const PROVAS_ALUNO=Object.freeze({teorica:{nome:'Prova teórica'},praticaCarro:{nome:'Prova prática de carro — Categoria B',categoria:'B'},praticaMoto:{nome:'Prova prática de moto — Categoria A',categoria:'A'},praticaOnibus:{nome:'Prova prática de ônibus — Categoria D',categoria:'D'}});
export const textoSituacao=s=>String((typeof s==='object'&&s!==null?s.descricao:s)??'').trim()||'Não informado';
export function adaptarAcompanhamento(a,categorias=[]){
 if(!a)return null;
 const item=i=>({tipo:i.tipo,nome:i.nome||i.tipo,situacao:textoSituacao(i.situacao),data:i.data||'',validade:i.validade||''});
 const vindas=new Map((a.provas||[]).map(p=>[p.tipo,p]));
 const tipos=Object.entries(PROVAS_ALUNO).filter(([t,p])=>!p.categoria||categorias.includes(p.categoria)||vindas.has(t)).map(([t])=>t);
 for(const t of vindas.keys())if(!tipos.includes(t))tipos.push(t);
 const provas=tipos.map(tipo=>{const p=vindas.get(tipo);return {tipo,nome:PROVAS_ALUNO[tipo]?.nome||p?.nome||'Prova',
  tentativas:(p?.tentativas||[]).map(t=>({id:t.id,ordem:t.ordem||1,data:t.data||'',situacao:textoSituacao(t.situacao),resultado:t.resultado?textoSituacao(t.resultado):null}))};});
 return {exames:(a.exames||[]).map(item),provas,processo:(a.processo||[]).map(item)};
}

// Cancelamento (CancelamentoReadDto). Status 7 sem o objeto: crédito retido.
function adaptarCancelamento(a,status,solicitacao){
 const c=a.cancelamento;
 if(!c)return status===7?{credito:'retido',frequencia:'falta',dentroPrazo:false}:null;
 const pendente=c.frequencia==='justificativa_pendente'&&!solicitacao;
 return {...c,motivo:c.motivo?.descricao??c.motivo,justificativa:pendente&&c.prazoAtestadoEm?{estado:'aguardando_apresentacao',prazoApresentacao:c.prazoAtestadoEm,resultado:null}:null};
}

// AgendamentoReadDto → aula do painel. O status 7 (cancelada com ônus) aparece
// como Cancelada (2), com o crédito retido no cancelamento.
export function adaptarAula(a,alunoId,solicitacoes={}){
 const status=numero(a.status),cat=categoria(a.categoria),inicio=comFusoBrasil(a.dataHoraInicio);
 const solicitacao=a.solicitacaoMedica?(solicitacoes[a.solicitacaoMedica.id]||adaptarSolicitacao({...a.solicitacaoMedica,aulaIds:[a.id],categoria:a.categoria},alunoId)):null;
 const cancelamento=adaptarCancelamento(a,status,solicitacao);
 return {id:a.id,tipo:'aula',nome:'Aula prática',aluno:a.alunoId??alunoId,alunoId:a.alunoId??alunoId,categoria:cat,
  unidade:a.unidade||'',unidadeId:a.unidadeId,enderecoReserva:a.local?.endereco||a.localAula||'',localAula:a.localAula||'',localAulaId:a.localAulaId,
  ...(a.local&&cat==='B'?{localReal:{nome:a.local.nome,endereco:a.local.endereco,mapsUrl:a.local.mapsUrl}}:{}),
  instrutor:a.motoristaId,instrutorId:a.motoristaId,veiculo:a.veiculoId,veiculoId:a.veiculoId,tipoCambio:CAMBIO[numero(a.veiculoTipoCambio)]??null,
  inicio,fim:a.dataHoraFim?comFusoBrasil(a.dataHoraFim):null,data:inicio?.slice(0,10),status:status===7?2:status,statusApi:status,
  cancelamento,...(cancelamento?.motivo?{motivoCancelamento:cancelamento.motivo}:{}),solicitacaoMedica:solicitacao,
  podeCancelar:a.podeCancelar,horasUteisAteAula:a.horasUteisAteAula,historico:[],api:a};
}

function registrosDasAulas(aulas){
 const registros=[];
 for(const a of aulas){
  if(a.motoristaId&&!registros.some(r=>r.id===a.motoristaId))registros.push({id:a.motoristaId,tipo:'instrutor',nome:a.motoristaNome||'Não informado'});
  if(a.veiculoId&&!registros.some(r=>r.id===a.veiculoId))registros.push({id:a.veiculoId,tipo:'veiculo',nome:[a.veiculoModelo,a.veiculoPlaca].filter(Boolean).join(' · ')||'Não informado',modelo:a.veiculoModelo,placa:a.veiculoPlaca,documento:a.veiculoPlaca});
 }
 return registros;
}

// Saldo por categoria: o /me traz "saldos" (F1). Sem ele, soma as contratações
// de uma categoria só (pacote AB não é repartido: fica "não informado").
function resumoPorCategoria(aluno,contratacoes){
 const categorias={};
 for(const c of ['A','B','D']){
  const s=(aluno.saldos||[]).find(x=>categoria(x.categoria)===c);
  if(aluno.saldos){
   const total=s?.contratadas??0,realizadas=s?.realizadas??0;
   categorias[c]={total,disponiveis:s?.disponiveis??0,reservadas:s?.agendadas??0,realizadas,faltas:s?.faltas??0,retidas:s?.retidas??0,percentual:total>0&&realizadas>0?Math.min(100,Math.round(100*realizadas/total)):null};
   continue;
  }
  const relevantes=contratacoes.filter(p=>[2,4].includes(numero(p.status))&&(p.categorias||[]).some(k=>categoria(k)===c)),ambiguo=relevantes.some(p=>p.categorias.length!==1);
  const soma=campo=>relevantes.reduce((n,p)=>n+p[campo],0);
  const completos=!ambiguo&&relevantes.every(p=>['quantidadeAulas','aulasRestantes','aulasRealizadas','aulasAgendadas'].every(k=>Number.isFinite(p[k])));
  categorias[c]={total:completos?soma('quantidadeAulas'):null,disponiveis:completos?soma('aulasRestantes'):null,reservadas:completos?soma('aulasAgendadas'):null,realizadas:completos?soma('aulasRealizadas'):null,percentual:null};
  if(categorias[c].total>0&&categorias[c].realizadas>0)categorias[c].percentual=Math.min(100,Math.round(100*categorias[c].realizadas/categorias[c].total));
 }
 return categorias;
}

export function adaptarDadosAluno(aluno,contratacoes,aulas,extras={}){
 const solicitacoes=extras.solicitacoes||{};
 const vistas=aulas.map(a=>adaptarAula(a,aluno.id,solicitacoes));
 const registros=registrosDasAulas(aulas);
 const categorias=resumoPorCategoria(aluno,contratacoes);
 const matricula=aluno.matriculas?.[0];
 const letras=[...new Set([...(aluno.saldos||[]).filter(s=>s.contratadas>0).map(s=>categoria(s.categoria)),...(aluno.saldos?[]:(aluno.categoriasFormacao||[]).map(categoria))].filter(Boolean))].sort();
 const mensagens=(extras.mensagens||[]).map(m=>({...m,unidade:nomeDe(m.unidade),remetente:nomeDe(m.remetente)||'Recepção'}));
 const cadastro={id:aluno.id,tipo:'aluno',nome:aluno.nome,documento:aluno.cpf,email:aluno.email,telefone:aluno.telefone,
  unidade:nomeDe(matricula?.unidadeBase)||aluno.unidades?.[0]?.nome||'Não informada',unidadeBaseId:matricula?.unidadeBase?.id??null,
  unidadeCarro:nomeDe(matricula?.unidadeCarro)||null,tipoCambio:CAMBIO[numero(matricula?.tipoCambio)]??null,nascimento:aluno.dataNascimento||null,
  categoria:letras.join(''),categoriasFormacao:aluno.categoriasFormacao,
  preferenciasAutomaticas:adaptarPreferenciasAutomaticas(aluno.preferenciasAutomaticas),
  avisosInternos:mensagens,leiturasMensagens:{}};
 registros.push(cadastro,...vistas);
 return {integrado:true,aluno:cadastro,aulas:vistas,registros,credito:null,categorias:letras,
  resumo:{categorias,total:aluno.aulasContratadas??null,realizadas:aluno.aulasRealizadas??null,percentual:aluno.aulasContratadas>0?aluno.percentualProgresso:null},
  acompanhamento:adaptarAcompanhamento(extras.acompanhamento,letras),contratacoes};
}

// Até 92 dias por consulta (DA17): uma janela para trás e outra para frente.
function janelas(hoje=hojeBrasil()){
 const status=[1,2,3,4,5,6,7];
 return [{de:somarDias(hoje,-91),ate:somarDias(hoje,1),status},{de:somarDias(hoje,1),ate:somarDias(hoje,93),status}];
}

export function criarServicoAluno(){
 let dados=null,carregando=null;
 const dias=new Map(),recursosVistos=new Map();
 const capacidades=Object.freeze({cancelamento:true,reservas:true,senha:true,interesse:true,conversa:true,automatico:true,configuracaoRecursos:false});
 // Categorias em que cada instrutor e veículo já apareceu para o aluno (aulas, consultas e propostas).
 const porCategoria=new Map();
 const anotar=(id,cat)=>{if(!id||!cat)return;const s=porCategoria.get(id)||new Set();s.add(cat);porCategoria.set(id,s);};
 const invalidar=()=>{dados=null;dias.clear();};
 const opcional=p=>p.then(v=>v,()=>null);

 async function carregar(){
  const aluno=await api.Get('alunos/me');
  const [contratacoes,listas,mensagens,acompanhamento]=await Promise.all([
   api.Get('contratacoes'),
   Promise.all(janelas().map(j=>api.Get(api.ComParams('agendamentos',j)))),
   opcional(api.Get(api.ComParams('alunos/me/mensagens',{pagina:1,tamanho:100}))),
   opcional(api.Get('alunos/me/acompanhamento'))]);
  const porId=new Map();for(const a of listas.flat())porId.set(a.id,a);
  const aulas=[...porId.values()];
  const ids=[...new Set(aulas.map(a=>a.solicitacaoMedica?.id).filter(Boolean))];
  const solicitacoes={};
  for(const [i,s] of (await Promise.all(ids.map(id=>opcional(api.Get('solicitacoes-medicas/'+id))))).entries())if(s)solicitacoes[ids[i]]=adaptarSolicitacao(s,aluno.id);
  const novo=adaptarDadosAluno(aluno,contratacoes||[],aulas,{mensagens:mensagens||[],acompanhamento,solicitacoes});
  for(const r of recursosVistos.values())if(!novo.registros.some(x=>x.id===r.id))novo.registros.push(r);
  dados=novo;return dados;
 }
 const dadosAlunoLocal=async()=>dados||(carregando??=carregar().finally(()=>{carregando=null;}));

 function lembrar(r){recursosVistos.set(r.id,r);if(dados&&!dados.registros.some(x=>x.id===r.id))dados.registros.push(r);}

 // Calendário: um dias-disponiveis por mês e categoria, em cache até reservar ou cancelar.
 async function disponibilidadeLocal({categoria:cat,data}){
  if(!NUMERO[cat]||!data)return [];
  const chave=cat+'|'+data.slice(0,7);
  if(!dias.has(chave))dias.set(chave,api.Get(api.ComParams('agendamentos/dias-disponiveis',{categoria:NUMERO[cat],mes:data.slice(0,7)})).catch(()=>({dias:[]})));
  const dia=(await dias.get(chave)).dias?.find(d=>String(d.data).slice(0,10)===data);
  if(dia&&!dia.fechado&&dia.temHorario)return [{data}];
  // Dia sem horário livre, mas com horário ocupado por aula de outro aluno (temLotado, C5): dá para marcar interesse.
  const vazio=[];if(dia&&!dia.fechado&&dia.temLotado===true)vazio.lotado=true;return vazio;
 }

 // Interesses que a Recepção descartou (situação 4), por "AAAA-MM-DDTHH:MM" na categoria. Lidos uma vez e relidos depois
 // de marcar ou desmarcar; falha na leitura não esconde nada.
 let descartados=null;
 async function interessesDescartados(cat){
  descartados??=api.Get('alunos/me/interesses-antecipacao').then(r=>(Array.isArray(r)?r:r?.itens||[]).filter(i=>numero(i?.situacao)===4),()=>[]);
  return new Set((await descartados).filter(i=>categoria(i.categoria)===cat).map(i=>String(i.dataHoraInicio).slice(0,16)));
 }

 // Horários do dia com os pares instrutor × veículo livres (incluirMotoristas). O horário ocupado por aula de outro aluno
 // (motivo "ocupado") vem sem pares, para o "Tenho interesse"; a aula do próprio aluno vem como "Sua aula" (propria);
 // passado e "indisponivel" (almoço, jornada, bloqueio, sem recurso) ficam de fora.
 async function consultarRecursosLocal({categoria:cat,data}){
  const vazio={horarios:[],contagem:{instrutores:0,veiculos:0},permiteAgendar:true};
  if(!data)return {...vazio,mensagem:'Escolha uma data no calendário para consultar os horários.'};
  let r;
  try{r=await api.Get(api.ComParams('agendamentos/horarios-disponiveis',{categoria:NUMERO[cat],data,incluirMotoristas:true}));}
  catch(e){if(e?.status===400||e?.status===404){const motivo=textoErro(e);return {...vazio,mensagem:motivo,permiteAgendar:false,motivoElegibilidade:motivo};}throw comoErro(e);}
  const instrutores=new Set(),veiculos=new Set();
  // A unidade em que a grade foi montada vai no POST do interesse (C2), quando a API informa.
  const unidadeId=r.unidadeId??r.unidade?.id??null;
  // A API v4 manda interesseDescartado por horário; só a antiga obriga a ler a lista de interesses do aluno.
  const semInteresse=(r.horarios||[]).some(h=>h.disponivel===false&&motivoIndisponivel(h)==='ocupado'&&!h.interesseId&&typeof h.interesseDescartado!=='boolean');
  const recusados=semInteresse?await interessesDescartados(cat):new Set();
  const horarios=(r.horarios||[]).map(h=>{
   const hora=String(h.horario).slice(0,5),fim=String(h.dataHoraFim).slice(11,16),motivo=motivoIndisponivel(h);
   if(h.disponivel===false){
    if(motivo==='alunoocupado')return {hora,fim,inicio:h.dataHoraInicio,pares:[],propria:true};
    if(motivo!=='ocupado')return null;
    const descartado=!h.interesseId&&(h.interesseDescartado===true||h.descartado===true||recusados.has(String(h.dataHoraInicio).slice(0,16)));
    return {hora,fim,inicio:h.dataHoraInicio,pares:[],ocupado:true,interesseId:h.interesseId??null,unidadeId,...(descartado?{descartado:true}:{})};
   }
   const pares=[];
   for(const m of h.motoristas||[]){
    lembrar({id:m.motoristaId,tipo:'instrutor',nome:m.nome});anotar(m.motoristaId,cat);instrutores.add(m.motoristaId);
    for(const v of m.veiculos||[]){lembrar({id:v.veiculoId,tipo:'veiculo',nome:[v.modelo,v.placa].filter(Boolean).join(' · ')||'Veículo',modelo:v.modelo,placa:v.placa,documento:v.placa,tipoCambio:CAMBIO[numero(v.tipoCambio)]??null});anotar(v.veiculoId,cat);veiculos.add(v.veiculoId);pares.push({instrutorId:m.motoristaId,veiculoId:v.veiculoId});}
   }
   return {hora,fim,inicio:h.dataHoraInicio,pares};
  }).filter(h=>h&&(h.ocupado||h.propria||h.pares.length));
  const mensagem=r.fechado?'Não há expediente nesta data.':horarios.some(h=>!h.ocupado&&!h.propria)?'':'Nenhum horário com instrutor e veículo livres nesta data.';
  return {horarios,contagem:{instrutores:instrutores.size,veiculos:veiculos.size},mensagem,permiteAgendar:true,unidade:r.unidade,unidadeId,local:r.local};
 }

 // POST /api/agendamentos em lote (tudo ou nada), com o operacaoId como Idempotency-Key.
 async function reservarAulasLocais(pedido){
  const n=NUMERO[pedido.categoria];
  if(!n||!Array.isArray(pedido.aulas)||!pedido.aulas.length)throw new Error('Seleção de aulas inválida.');
  let resposta;
  try{resposta=await api.Post('agendamentos',{categoria:n,aulas:pedido.aulas.map(x=>({dataHoraInicio:x.data+'T'+x.hora+':00',categoria:n,motoristaId:x.instrutorId,veiculoId:x.veiculoId}))},{cabecalhos:{'Idempotency-Key':pedido.operacaoId||chaveOperacao()}});}
  catch(e){invalidar();throw comoErro(e);}
  invalidar();const novo=await dadosAlunoLocal(),ids=resposta?.ids||[];
  const salvas=ids.map(id=>novo.aulas.find(a=>a.id===id)).filter(Boolean);
  return salvas.length?salvas:pedido.aulas.map((x,i)=>({id:ids[i],categoria:pedido.categoria,inicio:x.data+'T'+x.hora+':00-03:00',fim:null,status:1,instrutor:x.instrutorId,veiculo:x.veiculoId,unidade:''}));
 }

 async function cancelarReservaLocal(id,motivo,{aceitarConsequencias=false}={}){
  const m=identificarMotivo(motivo);if(!m)throw new Error('Selecione o motivo do cancelamento para continuar.');
  try{await api.Post('agendamentos/'+id+'/cancelar',{motivoCancelamentoId:MOTIVOS_CANCELAMENTO.indexOf(m)+1,motivo:m.nome,aceitarConsequencias:aceitarConsequencias===true},{cabecalhos:{'Idempotency-Key':chaveOperacao()}});}
  catch(e){throw comoErro(e);}finally{invalidar();}
 }

 async function solicitarCancelamentoMedico({aulaId,arquivo,observacoes='',operacaoId}){
  const corpo=new FormData();corpo.append('arquivo',arquivo,arquivo?.name||'atestado');if(observacoes)corpo.append('observacoes',observacoes);
  try{return adaptarSolicitacao(await api.Post('agendamentos/'+aulaId+'/atestado',corpo,{cabecalhos:{'Idempotency-Key':operacaoId||chaveOperacao()}}),dados?.aluno?.id);}
  catch(e){throw comoErro(e);}finally{invalidar();}
 }

 // Interesse num horário ocupado: a Recepção vê quando o horário vaga e liga para remarcar.
 // Só o horário "ocupado" aceita interesse (C2): a API recusa os outros com 400 e a mensagem dela aparece na tela.
 async function marcarInteresse({categoria:cat,data,hora,unidadeId}){
  if(!NUMERO[cat]||!data||!hora)throw new Error('Escolha a categoria, a data e o horário.');
  const corpo={categoria:NUMERO[cat],dataHoraInicio:data+'T'+hora+':00',...(GUID.test(String(unidadeId||''))?{unidadeId}:{})};
  try{return adaptarInteresse(await api.Post('alunos/me/interesses-antecipacao',corpo,{cabecalhos:{'Idempotency-Key':chaveOperacao()}}));}
  catch(e){throw comoErro(e);}finally{descartados=null;}
 }
 async function desmarcarInteresse(id){try{await api.Delete('alunos/me/interesses-antecipacao/'+id);}catch(e){throw comoErro(e);}finally{descartados=null;}}
 async function listarInteresses(){
  try{const r=await api.Get('alunos/me/interesses-antecipacao');return (Array.isArray(r)?r:r?.itens||[]).map(adaptarInteresse).sort((a,b)=>String(a.inicio).localeCompare(String(b.inicio)));}
  catch(e){throw comoErro(e);}
 }

 // Agendamento automático (F13): a proposta dos próximos 90 dias só lê; a reserva é o reservarAulasLocais.
 async function buscarAgendamentoAutomatico(p){
  let r;try{r=await api.Post('agendamentos/automatico',corpoPreferenciasAutomaticas(p));}catch(e){throw comoErro(e);}
  const proposta=adaptarPropostaAutomatica(r,(await dadosAlunoLocal()).aluno);
  for(const a of proposta.aulas){
   lembrar({id:a.instrutorId,tipo:'instrutor',nome:a.instrutor});lembrar({id:a.veiculoId,tipo:'veiculo',nome:a.veiculo,placa:a.placa,documento:a.placa});
   anotar(a.instrutorId,proposta.categoria);anotar(a.veiculoId,proposta.categoria);
  }
  return proposta;
 }
 async function salvarPreferenciasAutomaticas(p){
  try{await api.Put('alunos/me/preferencias-automaticas',corpoPreferenciasAutomaticas(p));}catch(e){throw comoErro(e);}finally{invalidar();}
 }
 // Instrutores e veículos para marcar como preferidos: os que o aluno já teve ou viu livres na categoria (a API não
 // lista a frota para o aluno). Carro com câmbio diferente do da matrícula fica de fora.
 function recursosAutomaticos(cat){
  if(!dados)return [];
  for(const a of dados.aulas){anotar(a.instrutorId,a.categoria);anotar(a.veiculoId,a.categoria);}
  const cambio=dados.aluno?.tipoCambio;
  return dados.registros.filter(r=>['instrutor','veiculo'].includes(r.tipo)&&porCategoria.get(r.id)?.has(cat)&&!(cat==='B'&&r.tipo==='veiculo'&&r.tipoCambio&&cambio&&r.tipoCambio!==cambio))
   .sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
 }

 return {capacidades,carregar:()=>{invalidar();return dadosAlunoLocal();},dadosAlunoLocal,
  registros:async()=>(await dadosAlunoLocal()).registros,sair,
  consultarHistorico:async id=>(await api.Get('agendamentos/'+id)).historico||[],
  disponibilidadeLocal,consultarRecursosLocal,reservarAulasLocais,cancelarReservaLocal,solicitarCancelamentoMedico,
  consultarPoliticaCancelamento:id=>api.Get('agendamentos/'+id+'/politica-cancelamento'),
  documentoMedico:async id=>{try{return await api.Get('solicitacoes-medicas/'+id+'/documento',{binario:true});}catch(e){throw comoErro(e);}},
  metadadosDocumentoMedico:id=>api.Get('solicitacoes-medicas/'+id+'/documento/metadados'),
  alterarSenhaLocal:async({atual,nova})=>{try{await api.Put('usuarios/me/senha',{senhaAtual:atual,novaSenha:nova});}catch(e){throw comoErro(e);}},
  politicaSenhaLocal:{minimo:8,maximo:128},
  marcarInteresse,desmarcarInteresse,listarInteresses,
  marcarMensagemLida:async id=>{try{await api.Post('alunos/me/mensagens/'+id+'/leitura');}catch(e){throw comoErro(e);}finally{invalidar();}},
  // Conversa com a Recepção (uma por autoescola em que o aluno tem matrícula), separada dos avisos.
  conversas:async()=>{try{return (await api.Get('alunos/me/conversas')||[]).map(adaptarConversaAluno);}catch(e){throw comoErro(e);}},
  mensagensConversa:async autoescolaId=>{try{return (await api.Get(api.ComParams('alunos/me/conversas/'+autoescolaId+'/mensagens',{tamanho:100}))||[]).map(adaptarMensagemConversa);}catch(e){throw comoErro(e);}},
  enviarMensagemRecepcao:async(autoescolaId,texto,chave)=>{
   const t=String(texto??'').trim();if(!t||t.length>2000)throw new Error('Mensagem deve ter entre 1 e 2000 caracteres.');
   try{return adaptarMensagemConversa(await api.Post('alunos/me/conversas/'+autoescolaId+'/mensagens',{texto:t},{cabecalhos:{'Idempotency-Key':chave||chaveOperacao()}}));}catch(e){throw comoErro(e);}
  },
  marcarConversaLida:async autoescolaId=>{try{await api.Post('alunos/me/conversas/'+autoescolaId+'/leitura');}catch(e){throw comoErro(e);}},
  // Sino e item Mensagens: avisos não lidos + mensagens da Recepção não lidas. Uma falha conta como zero naquela parte.
  totalNaoLidas:async()=>{const [avisos,conversa]=await Promise.all([opcional(api.Get('alunos/me/mensagens/nao-lidas')),opcional(api.Get('alunos/me/conversas/nao-lidas'))]);return (Number(avisos?.total??avisos)||0)+(Number(conversa?.total??conversa)||0);},
  // Agendamento automático: F13 (D19).
  buscarAgendamentoAutomatico,salvarPreferenciasAutomaticas,recursosAutomaticos};
}
