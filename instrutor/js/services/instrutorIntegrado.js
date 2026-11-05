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
const comoErro=e=>{const n=new Error(textoErro(e));n.status=e?.status;return n;};
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
  endereco:a.local?.endereco||a.localAula||'',historico:(a.historico||[]).map(adaptarEvento)};
}

export function adaptarInstrutor(me,veiculos=[]){
 const vinculo=(me.vinculos||[])[0],categorias=(me.categorias||[]).map(categoria).filter(Boolean);
 const instrutor={id:me.id,nome:me.nome,categorias,ativo:me.ativo??!(me.cnhVencida||me.credenciamentoVencido),
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
 async function agendaHoje(){
  if(rotaAgenda){
   try{
    const r=await api.Get(api.ComParams('motoristas/me/agenda',{data:hojeBrasil()}));
    const faixas=(r.faixas||[]).map(f=>({inicio:String(f.inicio).slice(0,5),fim:String(f.fim).slice(0,5),bloqueado:!!f.bloqueado,motivo:f.motivo||''}));
    return {dia:String(r.dia||hojeBrasil()).slice(0,10),agora:r.agora?String(r.agora).slice(0,19):agoraBrasil(),fechamento:r.fechamento||'',faixas,
     periodoExibicao:faixas.length?faixas[0].inicio+' — '+faixas.at(-1).fim:'',aulas:(r.aulas||[]).map(adaptarAulaInstrutor),inconsistencias:(r.inconsistencias||[]).map(adaptarAulaInstrutor)};
   }catch(e){if(!semRota(e))throw comoErro(e);rotaAgenda=false;}
  }
  // Back sem a F3: a agenda é montada aqui com as aulas da API e o almoço do vínculo.
  const estado=ultimo&&Date.now()-ultimo.em<5000?ultimo.estado:await dados();
  return agendaDeHoje(estado,estado.instrutor.id);
 }
 async function registrar(id,status){
  if(![5,6].includes(status))throw new Error('Ação não permitida.');
  try{await api.Post('agendamentos/'+id+'/'+(status===5?'marcar-realizada':'marcar-falta'));}catch(e){throw comoErro(e);}
  ultimo=null;return dados();
 }
 return {demonstracao:false,dados,agendaHoje,registrar};
}
