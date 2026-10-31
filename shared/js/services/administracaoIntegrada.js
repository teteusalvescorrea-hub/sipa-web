// Adaptador dos painéis da equipe (ADM 1 Recepção, ADM 2 Gerência, ADM 3 Master)
// com a API (contrato 3.3 a 3.5 do plano). Mantém a interface que as telas já
// usam (servicoOperador + serviço administrativo). Leituras: a API vira o mesmo
// formato do front e as regras de tela continuam as do front. Comandos: vão
// direto para a rota da API. O servidor é a autoridade (escopo e permissão).
// Unidades pela chave do catálogo na tela e pelo Guid da API no fio (M7).
import {Get,Post,Put,Patch,Delete,ComParams} from '../api.js';
import {servicoOperador} from '../../../nivel-1-operador/js/servicoOperador.js';
import * as regras from '../../../nivel-1-operador/js/dominioOperador.js';
import {NIVEIS,permissoesDoPerfil,exigirCapacidade,escopoPermitido} from '../permissoesAdministrativas.js';
import {obterUnidadeInstitucional} from '../catalogoUnidades.js';
import {hojeBrasil,somarDias} from '../calendario.js';
import {fimDaAula} from '../disponibilidade.js';
import {localCarro} from '../operacaoCarro.js';
import {aulaSemAdministracaoAlheia,vinculoAdministrativoAluno} from '../escopoAlunoAdministrativo.js';
import {validarAtestado} from '../solicitacoesMedicas.js';
import {gerarRelatorio} from '../relatoriosAdministrativos.js';
import {MOTIVOS_ADMIN} from '../administracao.js';
import {identificarMotivo,MOTIVOS_CANCELAMENTO} from '../../../aluno/js/domain/agendamentoAluno.js';
import {adaptarSolicitacao,textoErro} from '../../../aluno/js/services/alunoIntegrado.js';
import {adaptarEvento} from '../../../instrutor/js/services/instrutorIntegrado.js';

const numero=v=>v?.valor??v??null;
const descricao=v=>v?.descricao??(typeof v==='string'?v:null);
const digitos=v=>String(v??'').replace(/\D/g,'');
const LETRA=Object.freeze({1:'A',2:'B',3:'D'}),NUMERO=Object.freeze({A:1,B:2,D:3});
const CAMBIO=Object.freeze({1:'manual',2:'automatico'}),CAMBIO_ID=Object.freeze({manual:1,automatico:2});
const ORIGEM=Object.freeze({1:'aluno',2:'recepcao',3:'gerencia',4:'master',5:'sistema'});
const SITUACAO_ALUNO_ID=Object.freeze({Pendente:1,Regular:2,Inativo:3});
const FINANCEIRO_ID=Object.freeze({Pendente:1,Regular:2,'Em atraso':3});
const EXAME_ID=Object.freeze({toxicologico:1,oftalmologico:2,psicologico:3,medico:4,ladv:5,pratica:6});
const EXAME_CHAVE=Object.freeze(Object.fromEntries(Object.entries(EXAME_ID).map(([k,v])=>[v,k])));
const SITUACAO_EXAME_ID=Object.freeze({Pendente:1,Aprovado:2,Reprovado:3,'Não se aplica':4});
const SITUACAO_EXAME=Object.freeze({1:'Pendente',2:'Aprovado',3:'Reprovado',4:'Não se aplica',5:'Vencido'});
const PROVA_ID=Object.freeze({teorica:1,praticaCarro:2,praticaMoto:3,praticaOnibus:4});
const PROVA_CHAVE=Object.freeze(Object.fromEntries(Object.entries(PROVA_ID).map(([k,v])=>[v,k])));
const STATUS_PROVA_ID=Object.freeze({Solicitado:1,Agendado:2,Aprovado:3,Reprovado:4,Cancelado:5});
const STATUS_PROVA=Object.freeze(Object.fromEntries(Object.entries(STATUS_PROVA_ID).map(([k,v])=>[v,k])));
const PERFIL_DO_PAINEL=Object.freeze({1:'operador',2:'gerencia',3:'master'});
// Almoço legado do front (duas horas cheias) → intervalo do vínculo na API.
const ALMOCO_LEGADO=Object.freeze({'11-12':'11:00/13:00','12-13':'12:00/14:00'});

export const categoria=c=>typeof c==='string'?(NUMERO[c]?c:null):/^[ABD]$/.test(c?.descricao)?c.descricao:LETRA[numero(c)]??null;
const categoriasId=texto=>['A','B','D'].filter(c=>String(texto||'').includes(c)).map(c=>NUMERO[c]);
const chaveOperacao=()=>crypto.randomUUID();
const comChave=chave=>({cabecalhos:{'Idempotency-Key':chave||chaveOperacao()}});
const semRota=e=>e?.status===404||e?.status===405;

// Erro da API → Error com o texto da validação (a tela mostra e.message).
export function comoErro(e){
 if(!e||e instanceof Error&&e.name!=='ApiErro')return e;
 const n=new Error(semRota(e)&&!e.erros?.some(x=>typeof (x?.mensagem??x)==='string'&&(x?.mensagem??x)!=='Não encontrado.')?'Registro não encontrado ou operação ainda não disponível no servidor.':textoErro(e));
 n.status=e.status;if(Array.isArray(e.erros))n.mensagens=e.erros.map(x=>x?.mensagem??x).filter(x=>typeof x==='string');if(Array.isArray(e.erros))n.campos=Object.fromEntries(e.erros.filter(x=>x?.campo).map(x=>[x.campo,x.mensagem]));return n;
}
const chamar=async p=>{try{return await p;}catch(e){throw comoErro(e);}};
// Rota nova ainda ausente no back (404/405): devolve o reserva para a leitura.
async function opcional(p,reserva=null){try{return await p;}catch(e){if(semRota(e))return reserva;throw comoErro(e);}}
const lista=r=>Array.isArray(r)?r:Array.isArray(r?.itens)?r.itens:Array.isArray(r?.items)?r.items:[];

// ---------------------------------------------------------------- unidades
// GET /api/unidades?todas=true → chave do catálogo do front (regras da tela) ↔ Guid (API). Todas as unidades ativas,
// porque a das aulas de carro pode ser de fora do escopo; o escopo da tela continua vindo do equipe/me.
export function mapaUnidades(unidadesApi=[]){
 const porGuid=new Map(),porChave=new Map();
 const chaveDoNome=nome=>obterUnidadeInstitucional(regras.unidade(nome))?.id||regras.unidade(nome)||'';
 for(const u of unidadesApi){const k=chaveDoNome(u.nome);if(!k)continue;porGuid.set(String(u.id),k);if(!porChave.has(k))porChave.set(k,String(u.id));}
 function chave(v){
  if(!v)return '';
  if(typeof v==='object')return porGuid.get(String(v.id))||(v.nome?chaveDoNome(v.nome):'');
  return porGuid.get(String(v))||chaveDoNome(v);
 }
 function guid(v){
  if(!v)return undefined;if(porGuid.has(String(v)))return String(v);
  const g=porChave.get(chave(v));if(!g)throw new Error('Unidade sem cadastro no servidor: '+v+'.');return g;
 }
 return Object.freeze({chave,guid,chaves:Object.freeze([...porChave.keys()]),lista:unidadesApi});
}

// ---------------------------------------------------------------- identidade
// Capacidade do front → tela e ação do papel (tabela da 3.3 do plano). Usada só
// quando o equipe/me ainda não manda "capacidades"; o servidor autoriza cada rota.
const TELAS_DA_CAPACIDADE=Object.freeze({
 consultar:[['alunos','le']],cadastrar:[['alunos','cria']],anotar:[['alunos','atualiza']],transferir:[['alunos','atualiza']],'redefinir-senha-aluno':[['alunos','atualiza']],
 verificar:[['atestados','cria']],'cancelar-prova':[['acompanhamento','atualiza']],'editar-prova':[['acompanhamento','remove']],'excluir-prova':[['acompanhamento','remove']],
 'cadastrar-recurso':[['motoristas','cria']],'editar-instrutor':[['motoristas','atualiza']],'editar-veiculo':[['motoristas','atualiza']],
 agendar:[['agenda','cria']],'registrar-frequencia':[['agenda','atualiza']],'cancelar-aula':[['agenda','remove']],antecipar:[['antecipacoes','cria']],
 'decidir-atestado':[['decisao-atestados','atualiza']],'corrigir-decisao':[['decisao-atestados','remove']],relatorios:[['relatorios','le']],
 'editar-cadastro':[['alunos','atualiza']],'editar-categoria':[['correcoes','atualiza']],'gerenciar-situacao':[['correcoes','atualiza']],'corrigir-registro':[['correcoes','atualiza']],
 'excluir-cadastro':[['exclusoes','remove']],'gestao-acessos':[['equipe','cria']],'gerir-permissoes':[['papeis','cria']],auditoria:[['auditoria','le']],
 configurar:[['unidades','atualiza']],'gestao-global':[],'excecao-agenda':[['excecao-agenda','atualiza']]
});
export function capacidadesDoMembro(me,perfil){
 const doPerfil=permissoesDoPerfil(perfil);
 if(Array.isArray(me?.capacidades))return doPerfil.filter(p=>me.capacidades.includes(p));
 const telas=new Map((me?.telas||[]).map(t=>[t.alias,t]));
 return doPerfil.filter(p=>(TELAS_DA_CAPACIDADE[p]||[]).every(([alias,acao])=>telas.get(alias)?.[acao]===true));
}
// equipe/me + unidades → identidade da tela. O painel vem do papel; sem ele
// (back antigo), vale o painel escolhido no login e o servidor barra o resto.
export async function carregarIdentidadeEquipe(perfil,{unidadeEscolhida}={}){
 const nivel=NIVEIS[perfil];if(!nivel)throw new Error('Perfil administrativo inválido.');
 const [me,unidadesApi]=await Promise.all([chamar(Get('equipe/me')),chamar(Get(ComParams('unidades',{todas:true})))]);
 const painel=numero(me?.painel);if(painel!=null&&painel!==nivel)throw Object.assign(new Error('Sua conta não possui acesso a este painel administrativo.'),{status:403});
 const u=mapaUnidades(lista(unidadesApi)),proprias=(me.unidades||[]).map(u.chave).filter(Boolean);
 const base=proprias[0]||(nivel===3?u.chaves[0]:null);if(!base||!regras.UNIDADES.some(([id])=>id===base))throw new Error('Conta sem unidade vinculada. Solicite o ajuste ao Master.');
 const escopos=nivel===3?u.chaves.filter(k=>regras.UNIDADES.some(([id])=>id===k)):[base],consulta=nivel===3&&escopos.includes(unidadeEscolhida)?unidadeEscolhida:null;
 const identidade=Object.freeze({id:me.membroId??me.id,nome:me.nome,perfil,perfilConta:perfil,painel:perfil,nivel,unidade:consulta||base,unidadeConsulta:consulta,unidades:Object.freeze(escopos),permissoes:Object.freeze(capacidadesDoMembro(me,perfil)),autoescola:me.autoescola?.nomeFantasia||''});
 return {identidade,unidades:u};
}

// ---------------------------------------------------------------- conversões
function categoriaMatricula(lista){const c=new Set(lista.map(categoria).filter(Boolean));return c.has('A')&&c.has('B')?'AB':['B','A','D'].find(x=>c.has(x))||'';}
export function adaptarAlunoEquipe(a,u){
 const m=a.matricula||a.matriculas?.[0]||{},saldos=a.saldos||[];
 const cat=categoriaMatricula([...(a.categorias||[]),...(m.categorias||[]),...(a.categoriasPretendidas||[]),...(a.categorias?.length||a.categoriasPretendidas?.length?[]:saldos.map(s=>s.categoria))]);
 const base=u.chave(m.unidadeBase||a.unidadeBase||a.unidades?.[0]),carro=cat.includes('B')?u.chave(m.unidadeCarro||a.unidadeCarro)||base:'';
 const financeiro=descricao(m.situacaoFinanceira??a.situacaoFinanceira);
 const creditos=Object.fromEntries(saldos.filter(s=>categoria(s.categoria)).map(s=>[categoria(s.categoria),{contratadas:s.contratadas,liberadas:s.contratadas,disponiveis:s.disponiveis,agendadas:s.agendadas,realizadas:s.realizadas,faltas:s.faltas,retidas:s.retidas}]));
 const acesso=a.acesso||{};
 return {id:a.id,nome:a.nome,cpf:digitos(a.cpf),email:a.email||'',telefone:digitos(a.telefone),nascimento:a.dataNascimento||'',categoria:cat,unidade:base,unidadePrincipal:base,unidadeCarro:carro,
  ...(cat.includes('B')?{tipoCambio:CAMBIO[numero(m.tipoCambio??a.tipoCambio)]??''}:{}),
  situacao:a.situacaoCadastral||descricao(m.situacaoAluno??a.situacaoAluno)||undefined,
  ...(financeiro?{financeiro,verificacaoFinanceira:{situacao:financeiro,origem:'api'}}:{}),
  ...(saldos.length?{creditos,aulasAdquiridas:Object.fromEntries(Object.entries(creditos).map(([k,v])=>[k,v.contratadas]))}:{}),
  observacoes:a.observacoes||'',bloqueioAdministrativo:{ativo:(m.bloqueioAdministrativo??a.bloqueioAdministrativo)===true},
  acesso:acesso.possuiConta===false?'Sem conta de acesso':(acesso.deveTrocarSenha??a.deveTrocarSenha)?'Conta criada · primeiro acesso pendente':'Ativo',contaId:acesso.possuiConta===false?null:a.id,
  historico:[],criadoEm:a.criadoEm,origem:'api',api:a};
}
function adaptarCancelamento(a,st){
 const c=a.cancelamento;
 if(!c)return st===7?{credito:'retido',frequencia:'falta',dentroPrazo:false}:null;
 return {...c,motivo:descricao(c.motivo)??c.motivo,origem:ORIGEM[numero(c.origem)]??c.origem,responsavel:c.responsavel?.id??c.responsavel};
}
export function adaptarAulaEquipe(a,u){
 const st=numero(a.status),cat=categoria(a.categoria),ini=String(a.dataHoraInicio||''),fim=String(a.dataHoraFim||''),inicio=ini.slice(11,16);
 const cancelamento=adaptarCancelamento(a,st),unidade=u.chave(a.unidadeId?{id:a.unidadeId,nome:a.unidade}:a.unidade);
 return {id:a.id,alunoId:a.alunoId,categoria:cat,data:ini.slice(0,10),inicio,fim:fim.slice(11,16)||fimDaAula(inicio),instrutorId:a.motoristaId,veiculoId:a.veiculoId,unidade,unidadeId:a.unidadeId,
  status:st===7?2:st,statusApi:st,...(cancelamento?{cancelamento,...(cancelamento.motivo?{motivoCancelamento:cancelamento.motivo}:{})}:{}),
  ...(a.local?{localReal:{nome:a.local.nome,endereco:a.local.endereco,mapsUrl:a.local.mapsUrl}}:{}),
  ...(cat==='B'?{tipoCambio:CAMBIO[numero(a.veiculoTipoCambio)]??undefined,unidadeCarro:unidade}:{}),
  ...(a.solicitacaoMedica?{solicitacaoMedica:adaptarSolicitacao({...a.solicitacaoMedica,aulaIds:[a.id],categoria:a.categoria},a.alunoId)}:{}),
  historico:(a.historico||[]).map(h=>({...adaptarEvento(h),autor:h.autorNome||h.autor})),criadoEm:a.criadoEm,
  alunoNome:a.alunoNome,instrutorNome:a.motoristaNome,veiculoNome:a.veiculoModelo,origem:'api'};
}
function jornadaLocal(j,categorias){
 if(!j?.inicio||!j?.fim)return undefined;const inicio=j.inicio.slice(0,5),fim=j.fim.slice(0,5);
 const semana=Object.fromEntries([1,2,3,4,5].map(d=>[d,[{inicio,fim}]]));
 semana[6]=categorias.includes('D')?[{inicio,fim}]:inicio<'12:00'?[{inicio,fim:fim<'12:00'?fim:'12:00'}]:[];return semana;
}
// GET vinculos (status 2) → instrutores e veículos do front.
export function adaptarRecursos(vinculos,u){
 const recursos=new Map();
 for(const v of vinculos){
  const cats=(v.motoristaCategorias||[]).map(categoria).filter(Boolean),unidades=(v.unidades||[]).map(u.chave).filter(Boolean),veiculos=v.veiculos||[];
  const ativo=v.ativo??!(v.cnhVencida||v.credenciamentoVencido);
  if(!recursos.has(v.motoristaId))recursos.set(v.motoristaId,{id:v.motoristaId,vinculoId:v.id,tipo:'Instrutores',nome:v.motoristaNome,cpf:digitos(v.motoristaCpf),identificacao:digitos(v.motoristaCpf),telefone:v.motoristaTelefone||'',email:v.motoristaEmail||'',
   categorias:cats,unidade:unidades[0]||'',unidades,ativo:ativo===true,disponivel:v.disponivel??true,horarioAlmoco:v.horarioAlmoco??null,observacoes:v.observacoes||'',
   veiculoIds:veiculos.map(x=>x.id??x.veiculoId),...(jornadaLocal(v.jornada,cats)?{disponibilidade:jornadaLocal(v.jornada,cats)}:{}),deveTrocarSenha:v.deveTrocarSenha,podeRedefinirAcesso:v.podeRedefinirAcesso,origem:'api'});
  for(const x of veiculos){const id=x.id??x.veiculoId;if(recursos.has(id))continue;const c=categoria(x.categoria);
   recursos.set(id,{id,tipo:'Veículos',nome:x.modelo,modelo:x.modelo,placa:x.placa,identificacao:x.placa,categoria:c,...(c==='B'?{tipoCambio:CAMBIO[numero(x.tipoCambio)]??undefined}:{}),unidade:unidades[0]||'',instrutorId:v.motoristaId,ativo:x.ativo??true,disponivel:true,origem:'api'});}
 }
 return [...recursos.values()];
}
function adaptarExames(itens,a){
 const exames={},etapas={};
 const entradas=Array.isArray(itens)?itens:Array.isArray(itens?.exames)?[...itens.exames,...(itens.processo||[])]:Object.entries(itens||{}).map(([tipo,v])=>({...v,tipo}));
 for(const x of entradas){
  const chave=typeof x.tipo==='string'?x.tipo:x.tipo?.chave||EXAME_CHAVE[numero(x.tipo??x.tipoExameId)];if(!chave)continue;
  const s=x.situacao??x.situacaoId,status=typeof s==='string'?s:SITUACAO_EXAME[numero(s)]||'Não informado';
  const item={status,data:x.data||'',validade:x.validade||'',fonte:x.fonte||'',origem:descricao(x.origem)==='Oficial'?'oficial':'manual',responsavel:x.responsavel?.id??x.responsavel,em:x.atualizadoEm||x.em};
  if(['toxicologico','oftalmologico','psicologico','medico'].includes(chave))exames[chave]=item;
  if(['medico','psicologico','ladv','pratica'].includes(chave))etapas[chave]=item;
 }
 return {...a,examesAdministrativos:exames,etapas};
}
function adaptarProvas(itens,a){
 const tentativas=[];
 for(const p of Array.isArray(itens)?itens:itens?.provas||[]){
  const tipo=typeof p.tipo==='string'?p.tipo:p.tipo?.chave||PROVA_CHAVE[numero(p.tipo??p.tipoProvaId)];if(!tipo)continue;
  for(const t of p.tentativas||[]){const status=typeof t.status==='string'?t.status:STATUS_PROVA[numero(t.status??t.situacao)]||'Solicitado';
   tentativas.push({id:t.id,tipo,ordem:t.ordem||1,status,data:t.data||'',resultado:['Aprovado','Reprovado','Cancelado'].includes(status)?status:null,resultadoEm:t.resultadoEm||null,arquivada:!!t.arquivadaEm,arquivadaEm:t.arquivadaEm||null,origem:descricao(t.origem)==='Oficial'?'oficial':'manual',historico:[]});}
 }
 return {...a,tentativasProvas:tentativas};
}
const adaptarHistoricoAluno=itens=>lista(itens).map(h=>({id:h.id,tipo:h.grupo,titulo:h.titulo,em:h.em,responsavel:h.responsavel?.nome??h.responsavel,depois:h.descricao||'',dados:h.dados||[],referencia:h.referencia}));
const quando=v=>v&&!/(Z|[+-]\d\d:\d\d)$/.test(v)?v+'-03:00':v;
function adaptarAuditoria(itens){
 return lista(itens).map(x=>({id:x.id,em:quando(x.quando??x.em),usuario:x.usuario?.id??x.usuario,responsavel:x.usuario?.id,responsavelNome:x.usuario?.nome,...(x.usuario?.id&&x.usuario.id===x.registroId?{contaNome:x.usuario.nome}:{}),tipo:[descricao(x.acao),x.tabela].filter(Boolean).join(' · ').toLowerCase()||'registro',unidade:x.unidade||'',referencia:x.registroId,justificativa:x.justificativa||''}));
}
const janelas=(hoje=hojeBrasil())=>[{de:somarDias(hoje,-91),ate:hoje},{de:somarDias(hoje,1),ate:somarDias(hoje,92)}];
const dataHora=(data,inicio)=>data+'T'+inicio+':00';

// ---------------------------------------------------------------- serviço
export function criarServicoAdministrativoIntegrado(identidade,u){
 const op=identidade,master=op.nivel===3;
 const negado={alterar:async()=>{throw new Error('Operação local indisponível no modo integrado.');}};
 const filtroUnidade=()=>op.unidadeConsulta?{unidadeId:u.guid(op.unidadeConsulta)}:{};
 // Snapshot de leitura no formato do front, refeito a cada consulta.
 async function ler(){
  const [alunos,vinculos,solicitacoes,...aulas]=await Promise.all([
   chamar(Get(ComParams('alunos',filtroUnidade()))),
   chamar(Get(ComParams('vinculos',{status:2,...filtroUnidade()}))),
   opcional(Get(ComParams('solicitacoes-medicas',{pagina:1,tamanho:100,...filtroUnidade()})),[]),
   ...janelas().map(j=>chamar(Get(ComParams('agendamentos',{...j,status:[1,2,3,4,5,6,7],...filtroUnidade()}))))]);
  const porId=new Map(lista(alunos).map(a=>[a.id,adaptarAlunoEquipe(a,u)]));
  const unicas=new Map(aulas.flatMap(lista).map(a=>[a.id,adaptarAulaEquipe(a,u)]));
  for(const s of lista(solicitacoes)){const sol=s.solicitacao??s,aulaId=sol.aulaIds?.[0]??sol.aulaId??s.aula?.id,aula=unicas.get(aulaId);if(aula)aula.solicitacaoMedica=adaptarSolicitacao({...sol,aulaIds:sol.aulaIds||[aulaId]},aula.alunoId);}
  // Alunos fora do cadastro autorizado só aparecem pelo nome nas agendas compartilhadas.
  for(const a of unicas.values())if(a.alunoId&&!porId.has(a.alunoId))porId.set(a.alunoId,{id:a.alunoId,nome:a.alunoNome||'Aluno não informado',categoria:'',historico:[],somenteAgenda:true,excluidoEm:'somente-agenda'});
  return {versao:2,alunos:[...porId.values()],recursos:adaptarRecursos(lista(vinculos),u),aulas:[...unicas.values()],excecoesAgenda:[],ofertasAntecipacao:[],configuracoesUnidades:{}};
 }
 const leitor=estado=>servicoOperador({ler:async()=>estado,...negado},op);
 const base=servicoOperador({ler,...negado},op);
 async function lerComAluno(id){
  const e=await ler(),atual=e.alunos.find(a=>a.id===id);
  const [det,historico,exames,provas]=await Promise.all([chamar(Get('alunos/'+id)),opcional(Get(ComParams(`alunos/${id}/historico`,{pagina:1,tamanho:100})),[]),opcional(Get(`alunos/${id}/exames`)),opcional(Get(`alunos/${id}/provas`))]);
  let aluno=adaptarAlunoEquipe({...(atual?.api||{}),...det},u);aluno={...aluno,historico:adaptarHistoricoAluno(historico)};
  if(exames)aluno=adaptarExames(exames,aluno);if(provas)aluno=adaptarProvas(provas,aluno);
  return {...e,alunos:[...e.alunos.filter(a=>a.id!==id),aluno]};
 }
 const contextoAula=a=>({...op,unidade:escopoPermitido(op,regras.unidade(a.unidade))?regras.unidade(a.unidade):op.unidade});
 const permitido=e=>({...e,alunos:e.alunos.filter(a=>!a.somenteAgenda&&escopoPermitido(op,regras.principal(a))),recursos:regras.consultarRecursos(e,op),aulas:e.aulas.map(a=>{const vista=aulaSemAdministracaoAlheia(e,op,a),v=vinculoAdministrativoAluno(e,a);return {...vista,...(vista.solicitacaoMedica?{unidadeBaseAdministrativa:v.unidadeBase,vinculoAdministrativoInconsistente:v.inconsistencia}:{})};})});
 const motivoAluno=m=>{const x=identificarMotivo(m);if(!x)throw new Error('Selecione o motivo do cancelamento.');return MOTIVOS_CANCELAMENTO.indexOf(x)+1;};
 const respostaSenha=r=>r?.senhaProvisoria?{senhaProvisoria:r.senhaProvisoria}:{};
 // Contas da gestão de acessos (Master): equipe, alunos e motoristas.
 const origemConta=new Map();let papeis=null;
 async function papelDoPerfil(perfil){
  papeis??=lista(await chamar(Get('equipe/papeis-atribuiveis')));
  const nivel=NIVEIS[perfil],porPainel=papeis.find(p=>numero(p.painel??p.painelAdministrativo??p.painelAdministrativoId)===nivel);
  return (porPainel||papeis.find(p=>p.nivelPadrao===({1:1,2:3,3:5})[nivel]))?.id;
 }
 async function consultarAcessos(){
  exigirCapacidade(op,'gestao-acessos',3);
  const [equipe,alunos,motoristas]=await Promise.all([chamar(Get(ComParams('equipe',filtroUnidade()))),chamar(Get(ComParams('alunos',filtroUnidade()))),opcional(Get(ComParams('motoristas',filtroUnidade())),[])]);
  const contas=[
   ...lista(equipe).map(m=>({id:m.id,nome:m.nome,login:digitos(m.cpf)||m.email,cpf:digitos(m.cpf),email:m.email,perfil:PERFIL_DO_PAINEL[numero(m.painel??m.papel?.painel)]||'operador',papelId:m.papel?.id,unidade:u.chave(m.unidades?.[0]),unidades:(m.unidades||[]).map(u.chave),ativa:m.ativo!==false,trocaObrigatoria:!!m.deveTrocarSenha,permissoesNegadas:m.permissoesNegadas||[],origemConta:'equipe'})),
   ...lista(alunos).map(a=>({id:a.id,alunoId:a.id,nome:a.nome,login:digitos(a.cpf),cpf:digitos(a.cpf),perfil:'aluno',unidade:u.chave(a.unidadeBase||a.matricula?.unidadeBase||a.unidades?.[0]),ativa:a.ativo!==false,trocaObrigatoria:!!(a.acesso?.deveTrocarSenha??a.deveTrocarSenha),origemConta:'aluno'})),
   ...lista(motoristas).map(m=>({id:m.id,recursoId:m.id,nome:m.nome,login:digitos(m.cpf),cpf:digitos(m.cpf),perfil:'instrutor',unidade:u.chave(m.unidades?.[0]),ativa:m.ativo!==false,trocaObrigatoria:!!m.deveTrocarSenha,origemConta:'motorista'}))];
  for(const c of contas)origemConta.set(c.id,c);
  return contas;
 }
 async function contaConhecida(id){if(!origemConta.has(id))await consultarAcessos();return origemConta.get(id);}
 async function gerirAcesso(dados){
  exigirCapacidade(op,'gestao-acessos',3);if(dados.confirmado!==true||String(dados.justificativa||'').trim().length<5)throw new Error('Confirme a operação e informe uma justificativa.');
  const justificativa=dados.justificativa.trim(),original=dados.id?await contaConhecida(dados.id):null,perfil=dados.perfil||original?.perfil;
  if(perfil==='master'&&original?.perfil!=='master')throw new Error('A criação ou promoção Master exige procedimento exclusivo; não está disponível neste cadastro.');
  if(perfil==='aluno'){
   if(dados.acao==='redefinir')throw new Error('Redefina a senha do aluno na Ficha completa, aba Redefinir senha.');
   if(!original)throw new Error('Cadastre o aluno pela Recepção; o acesso nasce com o cadastro.');
   await chamar(Patch(`alunos/${original.id}/matricula`,{situacaoAlunoId:dados.ativa===false?SITUACAO_ALUNO_ID.Inativo:SITUACAO_ALUNO_ID.Regular,justificativa}));return {};
  }
  if(perfil==='instrutor'){
   if(!original)throw new Error('Cadastre o instrutor pela Recepção; o acesso nasce com o cadastro.');
   if(dados.acao==='redefinir')return respostaSenha(await chamar(Post(`motoristas/${original.id}/redefinir-acesso`,{justificativa})));
   await chamar(Put(`motoristas/${original.id}/pela-autoescola`,{nome:String(dados.nome||original.nome).trim(),ativo:dados.ativa!==false,justificativa}));return {};
  }
  if(!['operador','gerencia','master'].includes(perfil))throw new Error('Perfil ou unidade não autorizados.');
  const unidade=dados.unidade||original?.unidade;if(!escopoPermitido(op,unidade))throw new Error('Perfil ou unidade não autorizados.');
  const corpo={nome:String(dados.nome||original?.nome||'').trim(),cpf:digitos(dados.cpf||original?.cpf)||null,email:dados.email||original?.email||null,telefone:dados.telefone||null,papelId:perfil===original?.perfil?original.papelId:await papelDoPerfil(perfil),unidadeIds:[u.guid(unidade)],justificativa};
  if(!original)return respostaSenha(await chamar(Post('equipe',corpo,comChave())));
  if(dados.acao==='redefinir')return respostaSenha(await chamar(Post(`equipe/${original.id}/redefinir-acesso`,{justificativa})));
  if(dados.ativa===false&&original.ativa){await chamar(Delete(`equipe/${original.id}`,{justificativa}));return {};}
  if(dados.ativa!==false&&!original.ativa)await chamar(Post(`equipe/${original.id}/reativar`,{justificativa}));
  await chamar(Put(`equipe/${original.id}`,corpo));return {};
 }
 return {...base,
  identidade:op,senhaPeloServidor:true,
  validarCadastro:base.validarCadastro,
  // ---- leituras
  consultar:base.consultar,
  async estado(){
   const e=permitido(await ler());let auditoria=[];
   if(master&&op.permissoes.includes('auditoria')){const hoje=hojeBrasil();auditoria=adaptarAuditoria(await opcional(Get(ComParams('auditoria',{de:somarDias(hoje,-30),ate:hoje,pagina:1,tamanho:100})),[]));}
   return {responsaveis:[],alunos:e.alunos,recursos:e.recursos,aulas:e.aulas,excecoesAgenda:[],ofertasAntecipacao:[],configuracoesUnidades:{},auditoria};
  },
  async ficha(id){return leitor(await lerComAluno(id)).ficha(id);},
  async acessoAluno(id){
   const a=await chamar(Get('alunos/'+id)),acesso=a.acesso||{},al=adaptarAlunoEquipe(a,u);
   return {nome:a.nome,cpf:digitos(a.cpf),unidadeBase:al.unidadePrincipal,possuiConta:acesso.possuiConta!==false,ativa:acesso.ativa!==false,trocaObrigatoria:!!(acesso.trocaObrigatoria??acesso.deveTrocarSenha??a.deveTrocarSenha),ultimaRedefinicao:acesso.ultimaRedefinicaoEm||null};
  },
  async detalhesAgendamento(id){
   const e=await ler(),a=e.aulas.find(x=>x.id===id);if(!a)throw new Error('Aula não autorizada.');
   const det=await opcional(Get('agendamentos/'+id));if(det?.historico)a.historico=det.historico.map(h=>({...adaptarEvento(h),autor:h.autorNome,motivo:h.motivo||descricao(h.motivoCancelamento)}));
   const r=regras.detalhesAgendamento(e,contextoAula(a),id);return {...r,aula:aulaSemAdministracaoAlheia(e,op,r.aula,a)};
  },
  async solicitacaoMedica(id){
   const e=await ler(),r=await opcional(Get('solicitacoes-medicas/'+id));
   if(r){const sol=r.solicitacao??r,aulaId=r.aula?.id??sol.aulaIds?.[0],aula=e.aulas.find(a=>a.id===aulaId);if(aula)aula.solicitacaoMedica=adaptarSolicitacao(sol,aula.alunoId);}
   return leitor(e).solicitacaoMedica(id);
  },
  async documentoMedico(id){return chamar(Get(`solicitacoes-medicas/${id}/documento`,{binario:true}));},
  async instrutoresParaVeiculo(cat,unidade=op.unidade){if(!escopoPermitido(op,unidade))throw new Error('Unidade não autorizada.');return regras.instrutoresParaVeiculo(await ler(),{...op,unidade},cat);},
  async pares(data,hora,f={}){
   const e=await ler(),v=e.recursos.find(r=>r.id===f.veiculoId),unidade=v?.unidade||f.unidade||op.unidade;
   const r=await opcional(Get(ComParams('disponibilidade',{unidadeId:u.guid(unidade),categoria:NUMERO[f.categoria||v?.categoria],de:data,ate:data,motoristaId:f.instrutorId,veiculoId:f.veiculoId,alunoId:f.alunoId})));
   if(!r)return regras.paresNaUnidade(e,{...op,unidade:['A','D'].includes(f.categoria)?op.unidade:unidade},data,hora,f);
   return lista(r).filter(x=>x.data===data&&String(x.inicio).slice(0,5)===hora).flatMap(x=>(x.pares||[]).map(p=>({instrutorId:p.motoristaId,veiculoId:p.veiculoId,categoria:categoria(p.categoria)})));
  },
  async alunosAgendaveis(data,inicio,par){
   const r=await opcional(Get(ComParams('disponibilidade/alunos',{data,inicio,motoristaId:par.instrutorId,veiculoId:par.veiculoId,categoria:NUMERO[par.categoria]})));
   if(!r)return base.alunosAgendaveis(data,inicio,par);
   return lista(r).map(a=>({id:a.id,nome:a.nome,...(a.cpf?{cpf:digitos(a.cpf)}:{}),categoria:typeof a.categoria==='string'?a.categoria:categoriaMatricula([a.categoria]),tipoCambio:CAMBIO[numero(a.tipoCambio)]??a.tipoCambio,unidadeCarro:u.chave(a.unidadeCarro),localAula:a.localAula?.nome??a.localAula??(par.categoria==='B'?localCarro({unidadeCarro:u.chave(a.unidadeCarro)||u.chave(a.unidadeAulas),tipoCambio:CAMBIO[numero(a.tipoCambio)]},data)?.nome??null:null),unidadeAulas:u.chave(a.unidadeAulas)||a.unidadeAulas,saldo:a.saldo,agendadas:a.agendadas}));
  },
  async previa(id,para){
   const r=await chamar(Get(ComParams(`alunos/${id}/transferencia-carro`,{unidadeId:u.guid(para)})));
   return {de:u.chave(r.de),para:u.chave(r.para)||regras.unidade(para),aulas:(r.aulas||[]).map(a=>{const i=String(a.dataHoraInicio||'');return {id:a.id,data:i.slice(0,10),inicio:i.slice(11,16),fim:String(a.dataHoraFim||'').slice(11,16)||fimDaAula(i.slice(11,16)),categoria:'B',unidade:u.chave(a.unidade),cancelavel:a.cancelavel===true};})};
  },
  async detalhesInstrutor(id,consulta={}){
   const local=await base.detalhesInstrutor(id,consulta),vinculoId=local.instrutor.vinculoId;
   const r=vinculoId&&await opcional(Get(ComParams(`vinculos/${vinculoId}/desempenho`,{de:local.periodo.inicio,ate:local.periodo.fim})));
   if(!r)return local;
   return {...local,concluidas:r.concluidas,presencas:r.presencas,faltas:r.faltas,total:local.total,totais:local.totais,veiculos:r.veiculos?r.veiculos.map(v=>({id:v.id,nome:v.modelo??v.nome,placa:v.placa,categoria:categoria(v.categoria)})):local.veiculos,
    historico:(r.historico||[]).map(h=>{const a=h.aula?adaptarAulaEquipe(h.aula,u):{};return {id:a.id,instrutorId:id,veiculoId:a.veiculoId,data:a.data,inicio:a.inicio,fim:a.fim,categoria:a.categoria,unidade:a.unidade,status:a.status,registradoPor:h.registradoPor?.nome??h.registradoPor,alunoNome:h.aluno?.nome??h.aluno??a.alunoNome??'Aluno não informado',veiculoNome:h.veiculo?.modelo??h.veiculo??a.veiculoNome??'Não informado',em:h.em};})};
  },
  async relatorio(f){
   exigirCapacidade(op,'relatorios');
   const r=await opcional(Get(ComParams('relatorios',{tipo:f.tipo,unidadeId:f.unidade?u.guid(f.unidade):undefined,categoria:NUMERO[f.categoria],alunoId:f.alunoId,motoristaId:f.instrutorId,veiculoId:f.veiculoId,de:f.inicio,ate:f.fim,horaInicial:f.horaInicio,horaFinal:f.horaFim,status:f.status})));
   if(!r)return gerarRelatorio(permitido(await ler()),op,f);
   // A API ainda não calcula a ocupação por par elegível: usa a regra do front sobre os dados lidos da API.
   const totais={...(r.totais||{})};
   if(!Object.hasOwn(totais,'ocupacao')){const local=(await gerarRelatorio(permitido(await ler()),op,f))?.totais||{};for(const k of ['elegiveis','ocupados','disponiveis','ocupacao'])if(Object.hasOwn(local,k))totais[k]=local[k];}
   return {nomes:r.nomes||{},filtros:{...f},totais,colunas:r.colunas||[],linhas:r.linhas||[],criterio:r.criterio||''};
  },
  // ---- comandos da Recepção
  async cadastrar(dados,solicitacaoId=chaveOperacao()){
   regras.autorizar(op,'cadastrar');const erros=base.validarCadastro(dados,[]);if(Object.keys(erros).length)throw Object.assign(new Error(Object.values(erros)[0]),{campos:erros});
   const cat=dados.categoria,quantidades={B:dados.quantidadeCarro,A:dados.quantidadeMoto,D:dados.quantidadeOnibus};
   const r=await chamar(Post('alunos/pela-autoescola',{nome:String(dados.nome).trim(),cpf:digitos(dados.cpf),dataNascimento:dados.nascimento,email:String(dados.email).trim(),telefone:digitos(dados.telefone),categorias:categoriasId(cat),
    unidadeId:u.guid(op.unidade),unidadeCarroId:cat.includes('B')?u.guid(dados.unidadeCarro):null,tipoCambioId:cat.includes('B')?CAMBIO_ID[dados.tipoCambio]??null:null,observacoes:String(dados.observacoes||'').trim(),
    aulas:['A','B','D'].filter(c=>cat.includes(c)).map(c=>({categoria:NUMERO[c],quantidade:Number(quantidades[c])}))},comChave(solicitacaoId)));
   return {id:r?.id,...respostaSenha(r),linkAcesso:r?.linkAcesso||null};
  },
  anotar:async(id,texto)=>{regras.autorizar(op,'anotar');if(String(texto).length>2000)throw new Error('Use até 2000 caracteres nas observações.');await chamar(Put(`alunos/${id}/observacoes`,{observacoes:String(texto)}));},
  financeiro:async(id,situacao,fonte)=>{regras.autorizar(op,'verificar');if(!FINANCEIRO_ID[situacao]||!String(fonte||'').trim())throw new Error('Informe situação e fonte da informação manual.');await chamar(Put(`alunos/${id}/financeiro`,{situacaoFinanceiraId:FINANCEIRO_ID[situacao],fonte:String(fonte).trim().slice(0,240)}));},
  async verificar(id,tipo,dados){
   regras.autorizar(op,'verificar');if(tipo==='teorica')throw new Error('Utilize o fluxo de tentativas para a prova teórica.');
   if(!EXAME_ID[tipo]||!String(dados.fonte||'').trim())throw new Error('Informe a etapa, a situação e a fonte da verificação.');
   await chamar(Put(`alunos/${id}/exames`,{[tipo]:{situacaoId:SITUACAO_EXAME_ID[dados.status]??null,data:dados.data||null,validade:dados.validade||null,fonte:String(dados.fonte).trim().slice(0,240)}}));
  },
  async salvarExames(id,dados){
   regras.autorizar(op,'verificar');const corpo={};
   for(const [tipo,status] of Object.entries(dados||{})){if(!EXAME_ID[tipo])throw new Error('Exame ou situação inválida.');corpo[tipo]={situacaoId:SITUACAO_EXAME_ID[status]??null};}
   if(Object.keys(corpo).length)await chamar(Put(`alunos/${id}/exames`,corpo));
  },
  async salvarAcompanhamento(id,dados){
   const corpo={};for(const [tipo,item] of Object.entries(dados||{})){const chave=tipo==='oftalmologico'?'oftalmologico':tipo;if(!EXAME_ID[chave])throw new Error('Utilize o fluxo de tentativas para as provas.');corpo[chave]={situacaoId:SITUACAO_EXAME_ID[item.status]??null};}
   if(Object.keys(corpo).length)await chamar(Put(`alunos/${id}/exames`,corpo));
  },
  async movimentarProva(id,dados,eventoId=chaveOperacao()){
   regras.autorizar(op,'verificar');
   if(dados.acao==='arquivar')return chamar(Post(`alunos/${id}/provas/${dados.tentativaId}/arquivar`,{motivo:String(dados.motivo||'').trim()}));
   const corpo={statusProvaId:STATUS_PROVA_ID[dados.status],data:dados.status==='Agendado'?dados.data:undefined};if(!corpo.statusProvaId)throw new Error('Selecione uma situação válida.');
   if(!dados.tentativaId)return chamar(Post(`alunos/${id}/provas`,{tipoProvaId:PROVA_ID[dados.tipo],...corpo},comChave(eventoId)));
   return chamar(Post(`alunos/${id}/provas/${dados.tentativaId}/movimentar`,corpo,comChave(eventoId)));
  },
  async transferir(id,para,motivo,cancelar=[]){
   regras.autorizar(op,'transferir');if(String(motivo||'').trim().length<5)throw new Error('Informe o motivo da solicitação do aluno (mínimo de 5 caracteres).');
   return chamar(Post(`alunos/${id}/transferencia-carro`,{unidadeId:u.guid(para),motivo:String(motivo).trim(),cancelarAulaIds:cancelar},comChave()));
  },
  async agendar(d){
   regras.autorizar(op,'agendar');
   return chamar(Post('agendamentos/pela-equipe',{alunoId:d.alunoId,categoria:NUMERO[d.categoria],aulas:[{dataHoraInicio:dataHora(d.data,d.inicio),motoristaId:d.instrutorId,veiculoId:d.veiculoId}]},comChave()));
  },
  async cancelarAula(id,d){
   regras.autorizar(op,'cancelar-aula');if(typeof d.observacoes!=='string'||d.observacoes.length>2000)throw new Error('Informe uma observação administrativa válida.');
   return chamar(Post(`agendamentos/${id}/cancelar`,{motivoCancelamentoId:motivoAluno(d.motivo),observacoes:d.observacoes,aceitarConsequencias:d.aceitarConsequencias===true},comChave()));
  },
  async registrarFrequencia(id,status,motivo){
   regras.autorizar(op,'registrar-frequencia');if(![5,6].includes(status))throw new Error('Resultado inválido.');
   if(typeof motivo!=='string'||motivo.trim().length<5||motivo.length>2000)throw new Error('Informe o motivo da intervenção administrativa (5 a 2000 caracteres).');
   await chamar(Post(`agendamentos/${id}/${status===5?'marcar-realizada':'marcar-falta'}`,{motivo:motivo.trim()}));
  },
  async cadastrarRecurso(dados){
   regras.autorizar(op,'cadastrar-recurso');const unidade=dados.categoria==='A'?'Vila Velha':dados.categoria==='D'?'Cobilândia':op.unidade;
   if(dados.tipo==='Instrutores'){
    const r=await chamar(Post('motoristas/pela-autoescola',{nome:String(dados.nome||'').trim(),cpf:digitos(dados.cpf||dados.identificacao),email:dados.email||null,telefone:digitos(dados.telefone)||null,categorias:categoriasId(dados.categoria),unidadeIds:[u.guid(unidade)],
     horarioAlmoco:ALMOCO_LEGADO[dados.horarioAlmoco]||dados.horarioAlmoco||null,jornadaInicio:dados.inicio||null,jornadaFim:dados.fim||null,observacoes:String(dados.observacoes||'').trim()},comChave()));
    return {id:r?.id,...respostaSenha(r)};
   }
   if(dados.tipo!=='Veículos')throw new Error('Informe nome, identificação e tipo do recurso.');
   return chamar(Post('veiculos/pela-autoescola',{placa:String(dados.identificacao||'').trim(),modelo:String(dados.nome||'').trim(),categoria:NUMERO[dados.categoria],tipoCambioId:dados.categoria==='B'?CAMBIO_ID[dados.tipoCambio]??null:null,motoristaId:dados.instrutorId||null},comChave()));
  },
  async editarInstrutor(id,d){
   regras.autorizar(op,'editar-instrutor');const e=await ler(),r=e.recursos.find(x=>x.id===id&&x.tipo==='Instrutores');if(!r)throw new Error('Instrutor fora do escopo de edição desta unidade.');
   await chamar(Put(`motoristas/${id}/pela-autoescola`,{nome:String(d.nome??r.nome).trim(),categorias:categoriasId(d.categoria??r.categorias.join('')),ativo:d.ativo??r.ativo,justificativa:d.justificativa||null}));
   if(r.vinculoId)await chamar(Put(`vinculos/${r.vinculoId}/operacao`,{horarioAlmoco:d.alterarAlmoco?ALMOCO_LEGADO[d.horarioAlmoco]||d.horarioAlmoco:ALMOCO_LEGADO[r.horarioAlmoco]||r.horarioAlmoco,jornadaInicio:d.inicio??r.disponibilidade?.[1]?.[0]?.inicio??null,jornadaFim:d.fim??r.disponibilidade?.[1]?.[0]?.fim??null,disponivel:d.disponivel??r.disponivel,observacoes:String(d.observacoes??r.observacoes??'').trim()}));
  },
  async editarVeiculo(id,d){
   regras.autorizar(op,'editar-veiculo');const e=await ler(),v=e.recursos.find(x=>x.id===id&&x.tipo==='Veículos');if(!v)throw new Error('Cadastro de recurso fora do escopo administrativo desta unidade.');
   await chamar(Put(`veiculos/${id}/pela-autoescola`,{modelo:String(d.nome??v.nome).trim(),placa:String(d.identificacao??v.placa).trim(),tipoCambioId:Object.hasOwn(d,'tipoCambio')?CAMBIO_ID[d.tipoCambio]??null:undefined}));
   if(d.instrutorId&&d.instrutorId!==v.instrutorId)await chamar(Put(`veiculos/${id}/responsavel`,{motoristaId:d.instrutorId},comChave()));
  },
  async redefinirSenhaAluno(id,dados){
   regras.autorizar(op,'redefinir-senha-aluno');const j=String(dados?.justificativa||'').trim();if(j.length<5||j.length>1000)throw new Error('Informe a justificativa da redefinição (5 a 1000 caracteres).');
   return {acessoCriado:false,...respostaSenha(await chamar(Post(`alunos/${id}/redefinir-acesso`,{justificativa:j})))};
  },
  async solicitarAtestadoRecepcao({aulaId,arquivo,observacoes='',operacaoId}){
   regras.autorizar(op,'verificar');await validarAtestado(arquivo);
   const corpo=new FormData();corpo.append('arquivo',arquivo,arquivo.name);if(observacoes)corpo.append('observacoes',String(observacoes).slice(0,2000));
   return chamar(Post(`agendamentos/${aulaId}/atestado`,corpo,comChave(operacaoId)));
  },
  encaminharSolicitacaoMedica:async(id,parecer)=>{regras.autorizar(op,'verificar');const t=String(parecer||'').trim();if(t.length<5||t.length>2000)throw new Error('Informe o parecer da recepção (5 a 2000 caracteres).');return chamar(Post(`solicitacoes-medicas/${id}/encaminhar`,{parecer:t}));},
  // ---- antecipação
  async consultarVagas(f){
   exigirCapacidade(op,'antecipar',1);if(!escopoPermitido(op,f.unidade))throw new Error('Informe unidade autorizada, categoria e data válidas.');
   const r=await chamar(Get(ComParams('antecipacoes/vagas',{unidadeId:u.guid(f.unidade),categoria:NUMERO[f.categoria],data:f.data})));
   return lista(r).map(v=>{const i=String(v.dataHoraInicio),inicio=i.slice(11,16);return {unidade:f.unidade,categoria:f.categoria,data:i.slice(0,10),inicio,fim:String(v.dataHoraFim||'').slice(11,16)||fimDaAula(inicio),instrutorId:v.motoristaId,veiculoId:v.veiculoId,instrutor:v.instrutor?.nome??v.instrutor??'Não informado',veiculo:v.veiculo?.modelo??v.veiculo??'Não informado',local:v.local?.nome??v.local??'',api:v};});
  },
  async consultarInteressados(vagas){
   exigirCapacidade(op,'antecipar',1);const r=await chamar(Post('antecipacoes/interessados',{vagas:vagas.map(v=>v.api||{dataHoraInicio:dataHora(v.data,v.inicio),motoristaId:v.instrutorId,veiculoId:v.veiculoId})}));
   const porChave=new Map(vagas.map(v=>[v.api?.dataHoraInicio+'|'+v.instrutorId+'|'+v.veiculoId,v]));
   return lista(r).map(a=>({id:a.id,nome:a.nome,categoria:typeof a.categoria==='string'?a.categoria:categoria(a.categoria),unidade:u.chave(a.unidade),telefone:a.telefone||'',whatsappPermitido:a.whatsappPermitido!==false,elegivel:a.elegivel!==false,motivo:a.motivo||'Elegível e interessado',
    vagas:(a.vagas||vagas).map(x=>x.inicio?x:porChave.get(x.dataHoraInicio+'|'+x.motoristaId+'|'+x.veiculoId)).filter(Boolean)}));
  },
  async enviarCampanha({campanhaId,alunoIds,vagas,canais,confirmado}){
   exigirCapacidade(op,'antecipar',1);if(confirmado!==true||!alunoIds?.length||!canais||!canais.sipa&&!canais.whatsapp)throw new Error('Confirme os destinatários e ao menos um canal.');
   return chamar(Post('antecipacoes/campanhas',{campanhaId,vagas:vagas.map(v=>v.api||{dataHoraInicio:dataHora(v.data,v.inicio),motoristaId:v.instrutorId,veiculoId:v.veiculoId}),alunoIds,canais},comChave(campanhaId)));
  },
  async historicoOfertas(){
   exigirCapacidade(op,'antecipar',1);const hoje=hojeBrasil(),r=await opcional(Get(ComParams('antecipacoes/ofertas',{de:somarDias(hoje,-30),ate:somarDias(hoje,30),pagina:1})),[]);
   return lista(r).map(o=>({...o,vagas:(o.vagas||[]).map(v=>{const i=String(v.dataHoraInicio||''),inicio=i.slice(11,16);return {...v,data:i.slice(0,10),inicio,fim:String(v.dataHoraFim||'').slice(11,16)||fimDaAula(inicio),local:v.local?.nome??v.local??''};}),canais:{sipa:{situacao:descricao(o.canais?.sipa?.situacao)?.toLowerCase()||'não solicitado'},whatsapp:{situacao:descricao(o.canais?.whatsapp?.situacao)?.toLowerCase()==='preparada'?'preparado':descricao(o.canais?.whatsapp?.situacao)?.toLowerCase()||'não solicitado',motivo:o.canais?.whatsapp?.motivo||null}}})).sort((a,b)=>String(b.em).localeCompare(String(a.em)));
  },
  async linkWhatsAppOferta(id){exigirCapacidade(op,'antecipar',1);return (await chamar(Get(`antecipacoes/ofertas/${id}/whatsapp`)))?.url;},
  // ---- Gerência e Master
  async decidirAtestado(id,d){
   exigirCapacidade(op,'decidir-atestado');if(!['aprovado','rejeitado'].includes(d.resultado)||d.confirmado!==true)throw new Error('Confirme a decisão com identificador válido.');
   const j=String(d.justificativa||'').trim();if(j.length<5||j.length>2000)throw new Error('Informe uma justificativa de 5 a 2000 caracteres.');
   const atual=(await ler()).aulas.find(a=>a.solicitacaoMedica?.id===id)?.solicitacaoMedica,final=['aprovado','rejeitado'].includes(atual?.status);
   if(final)exigirCapacidade(op,'corrigir-decisao',3);
   return chamar(Post(`solicitacoes-medicas/${id}/${final?'correcao':'decisao'}`,{resultado:d.resultado,justificativa:j},comChave(d.operacaoId)));
  },
  async cancelarExcepcional(id,d){
   exigirCapacidade(op,'excecao-agenda',3);const i=MOTIVOS_ADMIN.indexOf(d.motivo);
   if(i<0||!['retido','devolvido'].includes(d.credito)||d.confirmado!==true||String(d.justificativa||'').trim().length<5)throw new Error('Confirme um cancelamento administrativo válido. Aulas concluídas não podem ser canceladas.');
   return chamar(Post(`agendamentos/${id}/cancelar-excepcional`,{motivoCancelamentoId:8+i,credito:d.credito,justificativa:d.justificativa.trim()},comChave()));
  },
  async excecao(d){
   exigirCapacidade(op,'excecao-agenda',3);if(d.confirmado!==true||String(d.justificativa||'').trim().length<5||!d.operacaoId)throw new Error('Confirme a exceção e suas consequências.');
   return chamar(Post('agendamentos/excecao-agenda',{alunoId:d.alunoId,categoria:NUMERO[d.categoria],aulaId:d.aulaId||null,pendenciaId:d.pendenciaId||null,dataHoraInicio:dataHora(d.data,d.inicio),motoristaId:d.instrutorId,veiculoId:d.veiculoId,justificativa:d.justificativa.trim()},comChave(d.operacaoId)));
  },
  async corrigirAluno(id,dados,justificativa){
   exigirCapacidade(op,'corrigir-registro');const j=String(justificativa||'').trim();if(j.length<5)throw new Error('Informe uma justificativa de 5 a 2000 caracteres.');
   if(dados.unidadePrincipal&&!escopoPermitido(op,dados.unidadePrincipal))throw new Error('Unidade fora do escopo.');
   await chamar(Patch(`alunos/${id}/matricula`,{...(dados.unidadePrincipal?{unidadeBaseId:u.guid(dados.unidadePrincipal)}:{}),...(dados.situacao?{situacaoAlunoId:SITUACAO_ALUNO_ID[dados.situacao]}:{}),...(dados.bloqueioAdministrativo?{bloqueioAdministrativo:dados.bloqueioAdministrativo.ativo===true}:{}),justificativa:j}));
  },
  async editarCadastro(id,d,justificativa){
   exigirCapacidade(op,'editar-cadastro');const j=String(justificativa||'').trim();if(j.length<5)throw new Error('Justifique a correção cadastral.');
   const e=await lerComAluno(id),a=regras.alunoAutorizado(e,op,id);
   await chamar(Put(`alunos/${id}/cadastro`,{nome:String(d.nome??a.nome).trim(),cpf:digitos(d.cpf??a.cpf),dataNascimento:d.nascimento??a.nascimento,telefone:digitos(d.telefone??a.telefone),email:String(d.email??a.email).trim(),justificativa:j||null}));
   if(d.categoria&&d.categoria!==a.categoria){exigirCapacidade(op,'editar-categoria');await chamar(Patch(`alunos/${id}/matricula`,{categorias:categoriasId(d.categoria),justificativa:j||null}));}
   if(d.observacoes!=null&&String(d.observacoes)!==String(a.observacoes||''))await chamar(Put(`alunos/${id}/observacoes`,{observacoes:String(d.observacoes)}));
  },
  async corrigirProva(id,tentativaId,d){
   exigirCapacidade(op,'editar-prova');if(!STATUS_PROVA_ID[d.status]||String(d.justificativa||'').trim().length<5||d.confirmado!==true)throw new Error('Confirme uma correção com data, situação e justificativa válidas.');
   return chamar(Post(`alunos/${id}/provas/${tentativaId}/corrigir`,{statusProvaId:STATUS_PROVA_ID[d.status],data:d.data||null,justificativa:d.justificativa.trim()}));
  },
  async situacaoRecurso(id,ativo,justificativa){
   exigirCapacidade(op,'gerenciar-situacao');const j=String(justificativa||'').trim();if(j.length<5||typeof ativo!=='boolean')throw new Error('Informe uma justificativa de 5 a 2000 caracteres.');
   const r=(await ler()).recursos.find(x=>x.id===id);if(!r||!escopoPermitido(op,regras.unidade(r.unidade)))throw new Error('Recurso fora do escopo.');
   if(r.tipo==='Instrutores')await chamar(Put(`motoristas/${id}/pela-autoescola`,{nome:r.nome,categorias:categoriasId(r.categorias.join('')),ativo,justificativa:j}));
   else await chamar(Put(`veiculos/${id}/pela-autoescola`,{modelo:r.nome,placa:r.placa,ativo,justificativa:j}));
  },
  async configurarUnidade(id,{fechada,data,justificativa}){
   exigirCapacidade(op,'configurar',3);if(typeof fechada!=='boolean'||String(justificativa||'').trim().length<5)throw new Error('Informe unidade e data válidas, sem alterar o passado.');
   await chamar(Post(`unidades/${u.guid(id)}/excecoes`,{data,fechada,justificativa:justificativa.trim()}));
  },
  async excluirCadastro({tipo,id,confirmado,justificativa}={}){
   exigirCapacidade(op,'excluir-cadastro',3);if(confirmado!==true||String(justificativa||'').trim().length<5)throw new Error('Confirme explicitamente e informe a justificativa.');
   if(id===op.id)throw new Error('Não é permitido excluir a própria conta durante a sessão ativa.');
   const corpo={justificativa:justificativa.trim()};
   if(tipo==='conta'){const c=await contaConhecida(id);if(!c)throw new Error('Cadastro inexistente, ambíguo ou já excluído.');
    return chamar(c.origemConta==='equipe'?Delete(`equipe/${id}`,corpo):Delete(`${c.origemConta==='aluno'?'alunos':'motoristas'}/${id}/cadastro`,corpo));}
   const rota={aluno:'alunos',instrutor:'motoristas',veiculo:'veiculos'}[tipo];if(!rota)throw new Error('Cadastro inválido.');
   return chamar(Delete(`${rota}/${id}/cadastro`,corpo));
  },
  // ---- acessos (Master)
  consultarAcessos,gerirAcesso,
  async configurarPermissoes(id,negadas,justificativa){
   exigirCapacidade(op,'gerir-permissoes',3);if(String(justificativa||'').trim().length<5||!Array.isArray(negadas))throw new Error('Informe as restrições e a justificativa.');
   await chamar(Put(`equipe/${id}/permissoes`,{negadas:[...new Set(negadas)],justificativa:justificativa.trim()}));
  },
  async historicoAcessos(){
   exigirCapacidade(op,'gestao-acessos',3);const hoje=hojeBrasil();
   return adaptarAuditoria(lista(await opcional(Get(ComParams('auditoria',{de:somarDias(hoje,-91),ate:hoje,tabela:'USUARIOS',pagina:1,tamanho:100})),[])).filter(x=>descricao(x.acao)!=='Login')).map(x=>({...x,acao:x.tipo.includes('cria')?'criar':'salvar',contaId:x.referencia}));
  },
  async identidadesHistorico(){return (await consultarAcessos()).map(({id,nome,perfil,unidade})=>({id,nome,perfil,unidade}));},
  async consultarPendenciasAdministrativas(){return [];}
 };
}
