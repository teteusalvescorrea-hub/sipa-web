// Adaptador do Instrutor com a API (contrato 3.2 do plano). Implementa a mesma
// interface do repositório local ({dados(), agendaHoje(), registrar(id, status)}),
// então o painel não muda. O servidor autoriza; aqui só se converte o formato.
import * as api from '../../../shared/js/api.js';
import {textoErro} from '../../../shared/js/apiErro.js';
import {hojeBrasil,somarDias,agoraBrasil,comFusoBrasil} from '../../../shared/js/calendario.js';
import {agendaDeHoje} from '../agenda.js';

const numero=v=>v?.valor??v;
const LETRA=Object.freeze({1:'A',2:'B',3:'D'});
const CAMBIO=Object.freeze({1:'manual',2:'automatico'});
const categoria=c=>typeof c==='string'?c:/^[ABD]$/.test(c?.descricao)?c.descricao:LETRA[numero(c)];
// Tipo do evento (TIPOS_EVENTO_AGENDAMENTO) → status que o painel sabe nomear.
const STATUS_DO_EVENTO=Object.freeze({2:1,3:4,5:2,6:5,7:6,10:2});
const comoErro=e=>{const n=new Error(textoErro(e));n.status=e?.status;n.codigo=e?.codigo||null;return n;};
const semRota=e=>e?.status===404||e?.status===405;

export function adaptarEvento(e){
 const tipo=numero(e.tipo);
 return {status:STATUS_DO_EVENTO[tipo],descricao:e.tipo?.descricao||null,em:e.quando??e.em,motivo:e.motivo||null};
}

// AgendamentoReadDto (& historico) → aula do painel. Status 7 aparece como Cancelada.
export function adaptarAulaInstrutor(a){
 const status=numero(a.status),cat=categoria(a.categoria),inicio=comFusoBrasil(a.dataHoraInicio);
 return {id:a.id,aluno:{id:a.alunoId,nome:a.alunoNome||'Aluno não identificado'},instrutorId:a.motoristaId,instrutor:{nome:a.motoristaNome},
  veiculoId:a.veiculoId,veiculo:a.veiculoId?{id:a.veiculoId,modelo:a.veiculoModelo,placa:a.veiculoPlaca}:null,
  categoria:cat,unidade:a.unidade||'',unidadeId:a.unidadeId,inicio,fim:a.dataHoraFim?comFusoBrasil(a.dataHoraFim):null,data:inicio?.slice(0,10),
  status:status===7?2:status,statusApi:status,tipoCambio:CAMBIO[numero(a.veiculoTipoCambio)]??null,
  ...(a.local&&cat==='B'?{localReal:{nome:a.local.nome,endereco:a.local.endereco,mapsUrl:a.local.mapsUrl}}:{}),
  endereco:a.local?.endereco||a.localAula||'',historico:(a.historico||[]).map(adaptarEvento),
  // 17/11/2026: a aula é reposição de uma aula abonada por atestado.
  ...(a.reposicao?{reposicao:{aulaOrigemInicio:comFusoBrasil(a.reposicao.aulaOrigemInicio)}}:{})};
}

export function adaptarInstrutor(me,veiculos=[]){
 const vinculo=(me.vinculos||[])[0],categorias=(me.categorias||[]).map(categoria).filter(Boolean);
 const instrutor={id:me.id,nome:me.nome,categorias,ativo:me.ativo??true,
  unidade:vinculo?.unidades?.[0]?.nome||'',horarioAlmoco:vinculo?.horarioAlmoco||null,jornada:vinculo?.jornada||null,vinculos:me.vinculos||[]};
 const v=veiculos.length===1?veiculos[0]:null;
 const veiculo=v?{id:v.id,modelo:v.modelo,placa:v.placa,categoria:categoria(v.categoria),tipoCambio:CAMBIO[numero(v.tipoCambio)]??null}
  :{modelo:'Consultar veículo em cada aula',placa:'Não informado',categoria:categorias[0]||'—'};
 return {instrutor,veiculo};
}

// Até 92 dias por consulta (DA17): uma janela para trás e outra para frente.
// Só o histórico e o dia de hoje: o instrutor não vê os próximos dias (decisão do João em 04/11).
function janelas(hoje=hojeBrasil()){return [{de:somarDias(hoje,-91),ate:somarDias(hoje,1)}];}

export function criarServicoInstrutor(){
 let rotaAulas=true,rotaAgenda=true,ultimo=null;
 async function aulas(){
  if(rotaAulas){
   try{return (await Promise.all(janelas().map(j=>api.Get(api.ComParams('motoristas/me/aulas',j))))).flat();}
   catch(e){if(!semRota(e))throw e;rotaAulas=false;}
  }
  // Back sem a F3: a lista geral do motorista (sem o histórico de cada aula).
  return (await Promise.all(janelas().map(j=>api.Get(api.ComParams('agendamentos',{...j,status:[1,2,3,4,5,6,7]}))))).flat();
 }
 async function dados(){
  try{
   const [me,veiculos,lista]=await Promise.all([api.Get('motoristas/me'),api.Get('veiculos').catch(()=>[]),aulas()]);
   const porId=new Map();for(const a of lista)porId.set(a.id,adaptarAulaInstrutor(a));
   const estado={...adaptarInstrutor(me,veiculos||[]),aulas:[...porId.values()].sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio))};
   ultimo={em:Date.now(),estado};return estado;
  }catch(e){throw comoErro(e);}
 }
 // 17/11/2026 (pedido do usuário): data opcional, para o instrutor ver um dia anterior (a API recusa dia futuro).
 async function agendaHoje(data){
  const dia=data&&data<hojeBrasil()?data:hojeBrasil();
  if(rotaAgenda){
   try{
    const r=await api.Get(api.ComParams('motoristas/me/agenda',{data:dia}));
    const faixas=(r.faixas||[]).map(f=>({inicio:String(f.inicio).slice(0,5),fim:String(f.fim).slice(0,5),bloqueado:!!f.bloqueado,motivo:f.motivo||''}));
    return {dia:String(r.dia||hojeBrasil()).slice(0,10),agora:r.agora?String(r.agora).slice(0,19):agoraBrasil(),fechamento:r.fechamento||'',faixas,
     periodoExibicao:faixas.length?faixas[0].inicio+' — '+faixas.at(-1).fim:'',aulas:(r.aulas||[]).map(adaptarAulaInstrutor),inconsistencias:(r.inconsistencias||[]).map(adaptarAulaInstrutor)};
   }catch(e){if(!semRota(e))throw comoErro(e);rotaAgenda=false;}
  }
  // Back sem a F3: a agenda é montada aqui com as aulas da API e o almoço do vínculo.
  const estado=ultimo&&Date.now()-ultimo.em<5000?ultimo.estado:await dados();
  return agendaDeHoje(estado,estado.instrutor.id,dia===hojeBrasil()?new Date():new Date(dia+'T23:59:00-03:00'));
 }
 async function registrar(id,status){
  if(![5,6].includes(status))throw new Error('Ação não permitida.');
  try{await api.Post('agendamentos/'+id+'/'+(status===5?'marcar-realizada':'marcar-falta'));}catch(e){throw comoErro(e);}
  ultimo=null;return dados();
 }
 // Fase 4 (6.1): o veículo do dia e o checklist do primeiro uso da placa.
 async function veiculosDoDia(){try{return await api.Get('motoristas/me/veiculos-do-dia');}catch(e){throw comoErro(e);}}
 async function registrarChecklist(dados,fotos=[]){
  const corpo=new FormData();for(const [k,v] of Object.entries(dados))if(v!==''&&v!=null)corpo.append(k,String(v));
  for(const f of fotos)corpo.append('fotos',f,f.name||'foto');
  try{return await api.Post('motoristas/me/checklists',corpo);}catch(e){throw comoErro(e);}
 }
 // Chat (09/11/2026): o instrutor conversa com a Recepção e a Gerência das unidades dele.
 const chamarChat=async p=>{try{return await p;}catch(e){throw comoErro(e);}};
 const chatResumo=()=>chamarChat(api.Get('motoristas/me/chat/resumo'));
 const chatConversa=async id=>(await chamarChat(api.Get('motoristas/me/chat/conversas/'+id)))||[];
 const chatEnviar=(id,texto)=>{const t=String(texto??'').trim();if(!t||t.length>2000)throw new Error('Mensagem deve ter entre 1 e 2000 caracteres.');return chamarChat(api.Post('motoristas/me/chat/conversas/'+id+'/mensagens',{texto:t}));};
 const chatLer=id=>chamarChat(api.Post('motoristas/me/chat/conversas/'+id+'/leitura',{}));
 // 10/11/2026: o grupo geral da autoescola (o id é o da autoescola).
 const chatGrupo=async id=>(await chamarChat(api.Get('motoristas/me/chat/grupos/'+id)))||[];
 const chatEnviarGrupo=(id,texto)=>{const t=String(texto??'').trim();if(!t||t.length>2000)throw new Error('Mensagem deve ter entre 1 e 2000 caracteres.');return chamarChat(api.Post('motoristas/me/chat/grupos/'+id+'/mensagens',{texto:t}));};
 const chatLerGrupo=id=>chamarChat(api.Post('motoristas/me/chat/grupos/'+id+'/leitura',{}));
 const meusChecklists=async()=>{try{return (await api.Get('motoristas/me/checklists'))||[];}catch(e){throw comoErro(e);}};
 // 09/11/2026: os alunos de prova nos dias em que o veículo do instrutor foi reservado para a prova.
 const provas=async({de,ate}={})=>{const q=new URLSearchParams();if(de)q.set('de',de);if(ate)q.set('ate',ate);const s=q.toString();try{return (await api.Get('motoristas/me/provas'+(s?'?'+s:'')))||[];}catch(e){throw comoErro(e);}};
 // 17/11/2026: as avaliações que os alunos deram ao instrutor (média, total, distribuição, tags e comentários).
 const minhasAvaliacoes=async()=>{try{return await api.Get('motoristas/me/avaliacoes');}catch(e){throw comoErro(e);}};
 return {demonstracao:false,dados,agendaHoje,registrar,veiculosDoDia,registrarChecklist,meusChecklists,provas,minhasAvaliacoes,chatResumo,chatConversa,chatEnviar,chatLer,chatGrupo,chatEnviarGrupo,chatLerGrupo};
}
