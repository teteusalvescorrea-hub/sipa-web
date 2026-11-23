// Adaptador dos painéis da equipe (ADM 1 Recepção, ADM 2 Gerência, ADM 3 Master)
// com a API (contrato 3.3 a 3.5 do plano). Mantém a interface que as telas já
// usam (servicoOperador + serviço administrativo). Leituras: a API vira o mesmo
// formato do front e as regras de tela continuam as do front. Comandos: vão
// direto para a rota da API. O servidor é a autoridade (escopo e permissão).
// Unidades pela chave do catálogo na tela e pelo Guid da API no fio (M7).
import {nomeDoVeiculo} from '../formatacao.js';
import {Get,ComParams,Post as PostApi,Put as PutApi,Patch as PatchApi,Delete as DeleteApi} from '../api.js';
import {servicoOperador} from '../../../nivel-1-operador/js/servicoOperador.js';
import * as regras from '../../../nivel-1-operador/js/dominioOperador.js';
import {NIVEIS,permissoesDoPerfil,exigirCapacidade,escopoPermitido} from '../permissoesAdministrativas.js';
import {obterUnidadeInstitucional} from '../catalogoUnidades.js';
import {hojeBrasil,somarDias,comFusoBrasil,formatarData} from '../calendario.js';
import {fimDaAula,definirDiasBloqueados,definirExcecoesUnidades} from '../disponibilidade.js';
import {localCarro} from '../operacaoCarro.js';
import {aulaSemAdministracaoAlheia,vinculoAdministrativoAluno} from '../escopoAlunoAdministrativo.js';
import {validarAtestado} from '../solicitacoesMedicas.js';
import {gerarRelatorio} from '../relatoriosAdministrativos.js';
import {MOTIVOS_ADMIN} from '../administracao.js';
import {identificarMotivo,MOTIVOS_CANCELAMENTO} from '../../../aluno/js/domain/agendamentoAluno.js';
import {adaptarSolicitacao} from '../../../aluno/js/services/alunoIntegrado.js';
import {textoErro} from '../apiErro.js';
import {adaptarEvento} from '../../../instrutor/js/services/instrutorIntegrado.js';
import {tomarPreCarga,rotasDaLeitura,ROTA_UNIDADES} from '../preCargaEquipe.js';

const numero=v=>v?.valor??v??null;
const descricao=v=>v?.descricao??(typeof v==='string'?v:null);
const digitos=v=>String(v??'').replace(/\D/g,'');
const LETRA=Object.freeze({1:'A',2:'B',3:'D'}),NUMERO=Object.freeze({A:1,B:2,D:3});
const CAMBIO=Object.freeze({1:'manual',2:'automatico'}),CAMBIO_ID=Object.freeze({manual:1,automatico:2});
const ORIGEM=Object.freeze({1:'aluno',2:'recepcao',3:'gerencia',4:'master',5:'sistema'});
const SITUACAO_ALUNO_ID=Object.freeze({Pendente:1,Regular:2,Inativo:3});
const FINANCEIRO_ID=Object.freeze({Pendente:1,Regular:2,'Em atraso':3});
const EXAME_ID=Object.freeze({toxicologico:1,oftalmologico:2,psicologico:3,medico:4,ladv:5,pratica:6});
// Fase 1: tipo de CNH do contrato (Cortesia e Permuta só o Master cadastra).
export const TIPOS_CNH=Object.freeze([['1','CNH Brasil'],['2','CNH Social'],['3','Cortesia'],['4','Permuta']].map(Object.freeze));
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
// 16/11/2026: leitura complementar que o papel não tem (403, ex.: a Central de agendamento sem Acompanhamento): vem vazia.
const semPermissao=e=>{if(e?.status===403)return null;throw e;};

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
 configurar:[['unidades','atualiza']],'gestao-global':[],'excecao-agenda':[['excecao-agenda','atualiza']],
 // Conversa com o aluno: sem tela própria, usa a de Alunos. 17/11/2026 (pedido do usuário): quem vê a conversa também
 // responde (Recepção, Gerência, Diretoria, Central de agendamento...): Ler basta para as duas.
 mensagens:[['alunos','le']],'responder-mensagem':[['alunos','le']]
});
export function capacidadesDoMembro(me,perfil){
 const doPerfil=permissoesDoPerfil(perfil);
 // A API não lista as conversas: elas seguem a tela de Alunos (17/11/2026: consultar = ver e responder).
 if(Array.isArray(me?.capacidades)){const c=new Set(me.capacidades);if(c.has('consultar')){c.add('mensagens');c.add('responder-mensagem');}return doPerfil.filter(p=>c.has(p));}
 const telas=new Map((me?.telas||[]).map(t=>[t.alias,t]));
 return doPerfil.filter(p=>(TELAS_DA_CAPACIDADE[p]||[]).every(([alias,acao])=>telas.get(alias)?.[acao]===true));
}
// equipe/me + unidades → identidade da tela. O painel vem do papel; sem ele
// (back antigo), vale o painel escolhido no login e o servidor barra o resto.
export async function carregarIdentidadeEquipe(perfil,{unidadeEscolhida}={}){
 const nivel=NIVEIS[perfil];if(!nivel)throw new Error('Perfil administrativo inválido.');
 // 19/11/2026 (desempenho): a pré-carga do HTML do painel (preCargaEquipe.js) já pediu as duas; sem ela, pede aqui.
 const [me,unidadesApi]=await Promise.all([chamar(tomarPreCarga('equipe/me')||Get('equipe/me')),chamar(tomarPreCarga(ROTA_UNIDADES)||Get(ROTA_UNIDADES))]);
 const painel=numero(me?.painel);if(painel!=null&&painel!==nivel)throw Object.assign(new Error('Sua conta não possui acesso a este painel administrativo.'),{status:403});
 const u=mapaUnidades(lista(unidadesApi)),proprias=(me.unidades||[]).map(u.chave).filter(Boolean);
 const base=proprias[0]||(nivel===3?u.chaves[0]:null);if(!base||!regras.UNIDADES.some(([id])=>id===base))throw new Error('Conta sem unidade vinculada. Solicite o ajuste ao Master.');
 // 13/11/2026: quem não é Master e tem mais de uma unidade (ex.: Santa Rita e Itaparica) atende uma por vez, a escolhida
 // no topo do painel (guardada na sessão); a primeira unidade da conta é a inicial. A API já libera todas as unidades dela.
 const valida=k=>regras.UNIDADES.some(([id])=>id===k),proprias_=[...new Set(proprias.filter(valida))];
 const escopos=nivel===3?u.chaves.filter(valida):(proprias_.length?proprias_:[base]),consulta=nivel===3&&escopos.includes(unidadeEscolhida)?unidadeEscolhida:null;
 const atual=consulta||(nivel!==3&&escopos.includes(unidadeEscolhida)?unidadeEscolhida:base);
 const identidade=Object.freeze({id:me.membroId??me.id,nome:me.nome,perfil,perfilConta:perfil,painel:perfil,nivel,unidade:atual,unidadeConsulta:consulta,unidades:Object.freeze(escopos),permissoes:Object.freeze(capacidadesDoMembro(me,perfil)),temFoto:!!me.temFoto,autoescola:me.autoescola?.nomeFantasia||''});
 return {identidade,unidades:u};
}

// ---------------------------------------------------------------- conversões
// Fase 2: o pedido de realocação (origem e destino por instrutor e/ou veículo, período em horário de Brasília).
function corpoRealocacao(d){return {motoristaOrigemId:d.motoristaOrigemId||null,veiculoOrigemId:d.veiculoOrigemId||null,de:d.de,ate:d.ate,motoristaDestinoId:d.motoristaDestinoId||null,veiculoDestinoId:d.veiculoDestinoId||null,motivo:String(d.motivo||'').trim()||null};}
// 16/11/2026: todas as categorias do aluno, em ordem (o "AB" de categoriaMatricula deixava o ônibus de fora).
function todasAsCategorias(lista){const c=new Set(lista.map(categoria).filter(Boolean));return ['A','B','D'].filter(x=>c.has(x));}
function categoriaMatricula(lista){const c=new Set(lista.map(categoria).filter(Boolean));return c.has('A')&&c.has('B')?'AB':['B','A','D'].find(x=>c.has(x))||'';}
export function adaptarAlunoEquipe(a,u){
 const m=a.matricula||a.matriculas?.[0]||{},saldos=a.saldos||[];
 const cat=categoriaMatricula([...(a.categorias||[]),...(m.categorias||[]),...(a.categoriasPretendidas||[]),...(a.categorias?.length||a.categoriasPretendidas?.length?[]:saldos.map(s=>s.categoria))]);
 const base=u.chave(m.unidadeBase||a.unidadeBase||a.unidades?.[0]),carro=cat.includes('B')?u.chave(m.unidadeCarro||a.unidadeCarro)||base:'';
 const financeiro=descricao(m.situacaoFinanceira??a.situacaoFinanceira);
 const creditos=Object.fromEntries(saldos.filter(s=>categoria(s.categoria)).map(s=>[categoria(s.categoria),{contratadas:s.contratadas,liberadas:s.contratadas,disponiveis:s.disponiveis,agendadas:s.agendadas,realizadas:s.realizadas,faltas:s.faltas,retidas:s.retidas}]));
 const acesso=a.acesso||{};
 return {id:a.id,nome:a.nome,cpf:digitos(a.cpf),email:a.email||'',telefone:digitos(a.telefone),nascimento:a.dataNascimento||'',categoria:cat,categorias:todasAsCategorias([...(a.categorias||[]),...(m.categorias||[]),...(a.categoriasPretendidas||[]),...saldos.filter(s=>(s.contratadas||0)>0).map(s=>s.categoria)]),unidade:base,unidadePrincipal:base,unidadeCarro:carro,
  ...(cat.includes('B')?{tipoCambio:CAMBIO[numero(m.tipoCambio??a.tipoCambio)]??''}:{}),
  situacao:a.situacaoCadastral||descricao(m.situacaoAluno??a.situacaoAluno)||undefined,etapa:a.etapa||undefined,
  // Como a API (BloqueiaReserva): o financeiro Pendente só conta como verificado (e bloqueia) depois de conferido (financeiroEm).
  ...(financeiro?{financeiro,...(financeiro!=='Pendente'||m.financeiroEm?{verificacaoFinanceira:{situacao:financeiro,origem:'api',em:m.financeiroEm||null}}:{})}:{}),
  ...(saldos.length?{creditos,aulasAdquiridas:Object.fromEntries(Object.entries(creditos).map(([k,v])=>[k,v.contratadas]))}:{}),
  observacoes:a.observacoes||'',bloqueioAdministrativo:{ativo:(m.bloqueioAdministrativo??a.bloqueioAdministrativo)===true},
  // Fase 1: o contrato e a validação do cadastro pela Recepção.
  contrato:m.contrato?{tipoCnh:String(numero(m.contrato.tipoCnh)||''),tipoCnhNome:descricao(m.contrato.tipoCnh)||'',dataContrato:m.contrato.dataContrato||'',validade:m.contrato.validadeContrato||'',km:u.chave(m.contrato.km)||'',temArquivo:m.contrato.temArquivo===true,validadoEm:m.contrato.validadoEm||null,validadoPor:m.contrato.validadoPor||''}:null,
  acesso:acesso.possuiConta===false?'Sem conta de acesso':(acesso.deveTrocarSenha??a.deveTrocarSenha)?'Conta criada · primeiro acesso pendente':'Ativo',contaId:acesso.possuiConta===false?null:a.id,ultimoAcessoEm:acesso.ultimoAcessoEm||null,
  // Contratações da ficha (GET alunos/{id}): pacote (ou avulsa), aulas, categorias e situação da aprovação.
  ...(Array.isArray(a.contratacoes)?{contratacoes:a.contratacoes.map(c=>({id:c.id,pacote:c.pacoteNome||'',quantidade:c.quantidadeAulas,categorias:(c.categorias||[]).map(categoria).filter(Boolean),status:descricao(c.status)}))}:{}),
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
  // 17/11/2026: a aula que repõe outra abonada por atestado (a de origem e o horário dela).
  ...(a.reposicao?{reposicao:{id:a.reposicao.id,aulaOrigemId:a.reposicao.aulaOrigemId,aulaOrigemInicio:String(a.reposicao.aulaOrigemInicio||'')}}:{}),
  historico:(a.historico||[]).map(h=>({...adaptarEvento(h),autor:h.autorNome||h.autor})),criadoEm:a.criadoEm,
  alunoNome:a.alunoNome,instrutorNome:a.motoristaNome,veiculoNome:a.veiculoModelo,origem:'api'};
}
function jornadaLocal(j,categorias){
 if(!j?.inicio||!j?.fim)return undefined;const inicio=j.inicio.slice(0,5),fim=j.fim.slice(0,5);
 const semana=Object.fromEntries([1,2,3,4,5].map(d=>[d,[{inicio,fim}]]));
 semana[6]=categorias.includes('D')?[{inicio,fim}]:inicio<'12:00'?[{inicio,fim:fim<'12:00'?fim:'12:00'}]:[];return semana;
}
// GET vinculos (status 2) → instrutores e veículos do front.
// 11/11/2026: CNH e credenciamento do instrutor (só quando a recepção preencheu algum campo).
const documentosInstrutor=d=>d?.cnhNumero||d?.cnhValidade||d?.credenciamentoNumero||d?.credenciamentoValidade?{cnhNumero:digitos(d.cnhNumero)||null,cnhValidade:d.cnhValidade||null,credenciamentoNumero:String(d.credenciamentoNumero||'').trim()||null,credenciamentoUf:d.credenciamentoUf||null,credenciamentoValidade:d.credenciamentoValidade||null}:{};
export function adaptarRecursos(vinculos,u,daAutoescola=[]){
 const recursos=new Map();
 for(const v of vinculos){
  const cats=(v.motoristaCategorias||[]).map(categoria).filter(Boolean),unidades=(v.unidades||[]).map(u.chave).filter(Boolean),veiculos=v.veiculos||[];
  // 12/11/2026: CNH e credenciamento não travam mais a aula; "ativo" é o vínculo disponível (a chave Ativar/Inativar).
  const ativo=v.ativo??(v.disponivel??true);
  if(!recursos.has(v.motoristaId))recursos.set(v.motoristaId,{id:v.motoristaId,vinculoId:v.id,tipo:'Instrutores',nome:v.motoristaNome,cpf:digitos(v.motoristaCpf),identificacao:String(v.motoristaCodigo??'')||digitos(v.motoristaCpf),telefone:v.motoristaTelefone||'',email:v.motoristaEmail||'',
   categorias:cats,unidade:unidades[0]||'',unidades,ativo:ativo===true,disponivel:v.disponivel??true,horarioAlmoco:v.horarioAlmoco??null,observacoes:v.observacoes||'',
   veiculoIds:veiculos.map(x=>x.id??x.veiculoId),...(jornadaLocal(v.jornada,cats)?{disponibilidade:jornadaLocal(v.jornada,cats)}:{}),deveTrocarSenha:v.deveTrocarSenha,podeRedefinirAcesso:v.podeRedefinirAcesso,origem:'api',
   cnhNumero:v.cnhNumero||'',cnhValidade:v.cnhValidade||'',credenciamentoNumero:v.credenciamentoNumero||'',credenciamentoUf:numero(v.credenciamentoUf?.valor??v.credenciamentoUf)||null,credenciamentoValidade:v.credenciamentoValidade||''});
  for(const x of veiculos){const id=x.id??x.veiculoId;if(recursos.has(id))continue;const c=categoria(x.categoria);
   recursos.set(id,{id,tipo:'Veículos',nome:x.modelo,modelo:x.modelo,placa:x.placa,identificacao:x.placa,categoria:c,...(c==='B'?{tipoCambio:CAMBIO[numero(x.tipoCambio)]??undefined}:{}),unidade:unidades[0]||'',instrutorId:v.motoristaId,ativo:x.ativo??true,disponivel:true,origem:'api'});}
 }
 // Veículos da autoescola (GET veiculos/da-autoescola), inclusive os sem instrutor (decisão do João em 03/11).
 // Fase 2: status, manutenção aberta e preventiva. Só o veículo Ativo recebe agendamento novo (disponivel false).
 // 18/11/2026: o veículo com instrutor vem antes pelo vínculo (sem a situação); o desativado (ativo false) vale daqui.
 for(const x of daAutoescola){const id=x.id,frota=frotaDoVeiculo(x);if(recursos.has(id)){Object.assign(recursos.get(id),frota,x.ativo===false?{ativo:false}:{},{unidadeAdministrativa:u.chave(x.unidade)||''});continue;}const c=categoria(x.categoria);
  recursos.set(id,{id,tipo:'Veículos',nome:x.modelo,modelo:x.modelo,placa:x.placa,identificacao:x.placa,categoria:c,...(c==='B'?{tipoCambio:CAMBIO[numero(x.tipoCambio)]??undefined}:{}),unidade:u.chave(x.unidade)||'',unidadeAdministrativa:u.chave(x.unidade)||'',instrutorId:x.motoristaId||null,ativo:x.ativo??true,disponivel:true,origem:'api',...frota});}
 return [...recursos.values()];
}
function frotaDoVeiculo(x){
 const status=descricao(x.status)||'Ativo',m=x.manutencao;
 return {statusVeiculo:status,...(status!=='Ativo'?{disponivel:false}:{}),
  manutencao:m?{tipo:descricao(m.tipo),descricao:m.descricao,previsao:m.previsaoConclusao||'',diasRestantes:m.diasRestantes??null,iniciadaEm:m.iniciadaEm,andamentos:(m.andamentos||[]).map(a=>({em:a.em,texto:a.texto,autor:a.autor||''}))}:null,
  preventiva:x.preventiva?{...x.preventiva}:null};
}
function adaptarExames(itens,a){
 const exames={},etapas={};
 const entradas=Array.isArray(itens)?itens:Array.isArray(itens?.exames)?[...itens.exames,...(itens.processo||[])]:Object.entries(itens||{}).map(([tipo,v])=>({...v,tipo}));
 for(const x of entradas){
  const chave=typeof x.tipo==='string'?x.tipo:x.tipo?.chave||EXAME_CHAVE[numero(x.tipo??x.tipoExameId)];if(!chave)continue;
  const s=x.situacao??x.situacaoId,status=typeof s==='string'?s:SITUACAO_EXAME[numero(s)]||'Não informado';
  const item={status,data:x.data||'',validade:x.validade||'',fonte:x.fonte||'',origem:descricao(x.origem)==='Oficial'?'oficial':'manual',responsavel:x.responsavel?.id??x.responsavel,em:x.atualizadoEm||x.em};
  if(['toxicologico','oftalmologico','psicologico','medico'].includes(chave))exames[chave]=item;
  if(['medico','psicologico','pratica','ladv'].includes(chave))etapas[chave]=item;
 }
 return {...a,examesAdministrativos:exames,etapas};
}
function adaptarProvas(itens,a){
 const tentativas=[];
 for(const p of Array.isArray(itens)?itens:itens?.provas||[]){
  const tipo=typeof p.tipo==='string'?p.tipo:p.tipo?.chave||PROVA_CHAVE[numero(p.tipo??p.tipoProvaId)];if(!tipo)continue;
  for(const t of p.tentativas||[]){const status=typeof t.status==='string'?t.status:STATUS_PROVA[numero(t.status??t.situacao)]||'Solicitado';
   tentativas.push({id:t.id,tipo,ordem:t.ordem||1,status,data:t.data||'',periodo:numero(t.periodo?.valor??t.periodo)||null,horario:t.horario?String(t.horario).slice(0,5):'',temAgendamento:!!t.temAgendamento,resultado:['Aprovado','Reprovado','Cancelado'].includes(status)?status:null,resultadoEm:t.resultadoEm||null,arquivada:!!t.arquivadaEm,arquivadaEm:t.arquivadaEm||null,origem:descricao(t.origem)==='Oficial'?'oficial':'manual',historico:[]});}
 }
 return {...a,tentativasProvas:tentativas};
}
const adaptarHistoricoAluno=itens=>lista(itens).map(h=>({id:h.id,tipo:h.grupo,titulo:h.titulo,em:h.em,responsavel:h.responsavel?.nome??h.responsavel,depois:h.descricao||'',dados:h.dados||[],referencia:h.referencia}));
function adaptarAuditoria(itens){
 return lista(itens).map(x=>({id:x.id,em:comFusoBrasil(x.quando??x.em),usuario:x.usuario?.id??x.usuario,responsavel:x.usuario?.id,responsavelNome:x.usuario?.nome,...(x.usuario?.id&&x.usuario.id===x.registroId?{contaNome:x.usuario.nome}:{}),tipo:[descricao(x.acao),x.tabela].filter(Boolean).join(' · ').toLowerCase()||'registro',unidade:x.unidade||'',referencia:x.registroId,justificativa:x.justificativa||''}));
}
// As janelas de agendamentos da leitura (o "ate" da API é exclusivo) ficam em rotasDaLeitura (preCargaEquipe.js).
const dataHora=(data,inicio)=>data+'T'+inicio+':00';

// Horário liberado (HorarioLiberadoReadDto): o horário que vagou, os pares livres e quem marcou interesse,
// na ordem de quem marcou primeiro. Cada interessado traz as aulas que podem ser antecipadas e o prazo de cada uma.
const SITUACAO_INTERESSE=Object.freeze({1:'Aguardando',2:'Contatado',3:'Remarcado',4:'Descartado'});
const nomeOu=(v,...extras)=>v?.nome??(typeof v==='string'?v:null)??extras.find(Boolean)??'';
export function adaptarLiberado(h,u){
 const i=String(h.dataHoraInicio||''),inicio=i.slice(11,16);
 // Formato da API (HorarioLiberadoReadDto): unidadeId e unidade em texto; o par traz instrutor (texto), modelo e placa;
 // o interessado traz alunoId e nome soltos.
 return {unidade:u.chave(h.unidadeId??h.unidade),unidadeNome:nomeOu(h.unidade),categoria:categoria(h.categoria),data:i.slice(0,10),inicio,fim:String(h.dataHoraFim||'').slice(11,16)||fimDaAula(inicio),prazo:h.prazoHorasUteis??48,
  pares:(h.pares||[]).map(p=>({instrutorId:p.motoristaId,veiculoId:p.veiculoId,instrutor:nomeOu(p.instrutor)||'Instrutor',
   veiculo:nomeDoVeiculo(p.modelo,p.placa)||'Veículo'})),
  interessados:(h.interessados||[]).map(x=>({id:x.interesseId,alunoId:x.alunoId,aluno:nomeOu(x.nome)||'Aluno não informado',telefone:x.telefone??'',
   ofertaEnviada:x.ofertaEnviada===true,saldo:Number(x.saldo)||0,situacao:SITUACAO_INTERESSE[numero(x.situacao)]??descricao(x.situacao)??'Aguardando',marcadoEm:x.marcadoEm??null,contatadoEm:x.contatadoEm??null,observacao:x.observacao??'',
   aulas:(x.aulas||[]).map(a=>{const ai=String(a.dataHoraInicio||'');return {id:a.id??a.agendamentoId,data:ai.slice(0,10),inicio:ai.slice(11,16),horasUteis:a.horasUteis??null,dentroPrazo:a.dentroPrazo!==false};})}))};
}
function observacaoInteresse(v){const t=String(v??'').trim();if(t.length>500)throw new Error('Use no máximo 500 caracteres na observação.');return t||null;}
// Conversa com o aluno (ConversasDtos.cs). Datas em Brasília sem fuso; o front põe o -03:00.
export const TEXTO_MENSAGEM_MAXIMO=2000;
export function textoMensagem(v){const t=String(v??'').trim();if(!t||t.length>TEXTO_MENSAGEM_MAXIMO)throw new Error('Mensagem deve ter entre 1 e '+TEXTO_MENSAGEM_MAXIMO+' caracteres.');return t;}
export const adaptarMensagemConversa=m=>({id:m.id,texto:m.texto??'',em:comFusoBrasil(m.em)??null,daEquipe:m.daEquipe===true,remetente:m.remetente||(m.daEquipe?'Recepção':'Aluno'),autor:m.autor??null,lida:m.lida===true});
export function adaptarConversaEquipe(c,u){
 return {id:c.id,alunoId:c.alunoId,aluno:c.aluno||'Aluno não informado',unidadeId:c.unidadeId,unidade:u.chave(c.unidadeId?{id:c.unidadeId,nome:c.unidade}:c.unidade),unidadeNome:c.unidade||'',
  ultimaMensagemEm:comFusoBrasil(c.ultimaMensagemEm)??null,ultimaMensagem:c.ultimaMensagem||'',ultimaDoAluno:c.ultimaDoAluno===true,naoLida:c.naoLida===true,podeResponder:c.podeResponder===true,encaminhada:c.encaminhada===true,
  // 17/11/2026: a conversa tem a mensagem da diretoria (aula cancelada pela autoescola).
  diretoria:c.comMensagemDaDiretoria===true};
}
// Por quanto tempo uma listagem lida da API é reaproveitada (ver GetCache). 19/11/2026 (tarefa 18): 60 s (antes 15 s). As
// leituras do retrato da tela (ler e auditoria) valem até 10 min depois de vencidas: a tela desenha na hora com a guardada e a
// rota é relida em segundo plano; se vier diferente, quem assinou aoMudarDados redesenha. Os contadores que mudam sozinhos
// (substituições, SIT) valem 10 s: só juntam os pedidos repetidos da mesma entrada.
const VALIDADE_CACHE=60000,VALIDADE_VENCIDA=600000,VALIDADE_CURTA=10000;
const SWR=Object.freeze({vencida:VALIDADE_VENCIDA}),CURTA=Object.freeze({validade:VALIDADE_CURTA});
// Leitura complementar que falhou: sempre o mesmo vazio, para o retrato guardado continuar valendo (ver ler).
const SEM_DADOS=Object.freeze([]);

// ---------------------------------------------------------------- serviço
export function criarServicoAdministrativoIntegrado(identidade,u){
 const op=identidade,master=op.nivel===3;
 const negado={alterar:async()=>{throw new Error('Operação local indisponível no modo integrado.');}};
 const filtroUnidade=()=>op.unidadeConsulta?{unidadeId:u.guid(op.unidadeConsulta)}:{};
 // Listagens reaproveitadas por alguns segundos: trocar de seção, abrir um diálogo ou encadear ações baixava tudo de novo
 // (até 25 GETs ao abrir a Gerência). Quem pede durante a consulta espera a mesma requisição. Todo comando (Post, Put,
 // Patch, Delete) descarta o cache ao terminar, com sucesso ou erro: depois de salvar, a tela relê do servidor como antes.
 let cache=new Map();
 const descartarCache=()=>{cache=new Map();};
 // 19/11/2026: a primeira leitura de cada rota reaproveita a pré-carga do HTML (preCargaEquipe.js).
 function buscar(rota){
  const mapa=cache,item={p:tomarPreCarga(rota)||Get(rota),em:Date.now()};mapa.set(rota,item);
  item.p.then(()=>{item.pronto=true;},()=>{if(mapa.get(rota)===item)mapa.delete(rota);});return item.p;
 }
 function GetCache(rota,{validade=VALIDADE_CACHE,vencida=0}={}){
  const guardado=cache.get(rota),idade=guardado?Date.now()-guardado.em:Infinity;
  if(guardado&&idade<validade)return guardado.p;
  if(guardado?.pronto&&idade<vencida){revalidar(rota,guardado);return guardado.p;}
  return buscar(rota);
 }
 // Releitura em segundo plano (stale-while-revalidate). Igual: a guardada volta a valer. Diferente: entra no lugar e avisa.
 // Um comando no meio (cache descartado) deixa a releitura de lado.
 const ouvintesMudanca=new Set();let avisoMudanca=null;
 function revalidar(rota,antigo){
  if(antigo.relendo)return;antigo.relendo=true;const mapa=cache;
  Get(rota).then(async novo=>{
   if(cache!==mapa||mapa.get(rota)!==antigo)return;
   const velho=await antigo.p;
   if(JSON.stringify(velho)===JSON.stringify(novo)){antigo.em=Date.now();antigo.relendo=false;return;}
   mapa.set(rota,{p:Promise.resolve(novo),em:Date.now(),pronto:true});
   clearTimeout(avisoMudanca);avisoMudanca=setTimeout(()=>{for(const f of [...ouvintesMudanca]){try{f();}catch{}}},80);
  },()=>{antigo.relendo=false;});
 }
 const comando=enviar=>(...args)=>{const p=enviar(...args);p.then(descartarCache,descartarCache);return p;};
 const Post=comando(PostApi),Put=comando(PutApi),Patch=comando(PatchApi),Delete=comando(DeleteApi);
 // Snapshot de leitura no formato do front (objetos novos: quem altera o retorno não suja o cache).
 // 19/11/2026 (tarefa 18): adaptado uma vez por conjunto de respostas. Com as mesmas respostas do cache, o retrato guardado
 // volta em cópia (listas e itens novos), sem readaptar todos os alunos e aulas a cada troca de seção.
 let retratoGuardado=null;
 const copiaRetrato=r=>({...r,alunos:r.alunos.map(a=>({...a})),recursos:r.recursos.map(x=>({...x})),aulas:r.aulas.map(a=>({...a})),excecoesAgenda:[],configuracoesUnidades:{}});
 async function ler(){
  const rotas=rotasDaLeitura(filtroUnidade());
  const respostas=await Promise.all([
   chamar(GetCache(rotas.alunos,SWR)),
   chamar(GetCache(rotas.vinculos,SWR)),
   // 16/11/2026: o papel sem a tela Atestados (a Central de agendamento) recebia 403 aqui e o painel inteiro não abria
   // ("Acesso ainda não habilitado"). Sem a permissão, os atestados vêm vazios e o resto do painel abre.
   opcional(GetCache(rotas.solicitacoes,SWR),SEM_DADOS).catch(e=>{if(e?.status===403)return SEM_DADOS;throw e;}),
   // Complemento (veículos sem instrutor): qualquer falha aqui não derruba a tela, os veículos dos vínculos continuam.
   GetCache(rotas.veiculos,SWR).catch(()=>SEM_DADOS),
   GetCache(rotas.diasBloqueados,SWR).catch(()=>SEM_DADOS),
   GetCache(rotas.excecoes,SWR).catch(()=>SEM_DADOS),
   // 13/11/2026: os veículos reservados para a prova (fora da agenda até 13:00 nesse dia).
   GetCache(rotas.provas,SWR).catch(()=>SEM_DADOS),
   ...rotas.agendamentos.map(rota=>chamar(GetCache(rota,SWR)))]);
  const [alunos,vinculos,solicitacoes,veiculosDaAutoescola,diasBloqueados,excecoesUnidades,diasProva,...aulas]=respostas;
  definirDiasBloqueados(lista(diasBloqueados).map(d=>String(d.data).slice(0,10)));
  definirExcecoesUnidades(lista(excecoesUnidades).map(e=>({unidade:u.chave(e.unidadeId),data:String(e.data).slice(0,10),fechada:e.fechada,justificativa:e.justificativa||''})));
  if(retratoGuardado&&retratoGuardado.respostas.length===respostas.length&&retratoGuardado.respostas.every((r,i)=>r===respostas[i]))return copiaRetrato(retratoGuardado.retrato);
  const porId=new Map(lista(alunos).map(a=>[a.id,adaptarAlunoEquipe(a,u)]));
  const unicas=new Map(aulas.flatMap(lista).map(a=>[a.id,adaptarAulaEquipe(a,u)]));
  for(const s of lista(solicitacoes)){const sol=s.solicitacao??s,aulaId=sol.aulaIds?.[0]??sol.aulaId??s.aula?.id;let aula=unicas.get(aulaId);/* Aula em outra unidade (carro fora da base): a lista de agendamentos não a traz, mas o atestado é da base do aluno. */if(!aula&&s.aula?.id){aula=adaptarAulaEquipe({...s.aula,alunoId:sol.alunoId,alunoNome:s.aluno?.nome},u);unicas.set(aula.id,aula);}if(aula)aula.solicitacaoMedica=adaptarSolicitacao({...sol,aulaIds:sol.aulaIds||[aulaId]},aula.alunoId);}
  // Alunos fora do cadastro autorizado só aparecem pelo nome nas agendas compartilhadas.
  for(const a of unicas.values())if(a.alunoId&&!porId.has(a.alunoId))porId.set(a.alunoId,{id:a.alunoId,nome:a.alunoNome||'Aluno não informado',categoria:'',historico:[],somenteAgenda:true,excluidoEm:'somente-agenda'});
  const recursos=adaptarRecursos(lista(vinculos),u,lista(veiculosDaAutoescola));
  for(const d of lista(diasProva)){const dia=String(d.data).slice(0,10),marcar=r=>{if(r)(r.reservasProva||=[]).push({data:dia,ate:'13:00'});};
   for(const v of d.veiculos||[])marcar(recursos.find(x=>x.tipo==='Veículos'&&x.id===v.veiculoId));
   for(const i of d.instrutores||[])marcar(recursos.find(x=>x.tipo==='Instrutores'&&x.id===i.motoristaId));}
  const retrato={versao:2,alunos:[...porId.values()],recursos,aulas:[...unicas.values()],excecoesAgenda:[],configuracoesUnidades:{}};
  retratoGuardado={respostas,retrato};return copiaRetrato(retrato);
 }
 const leitor=estado=>servicoOperador({ler:async()=>estado,...negado},op);
 const base=servicoOperador({ler,...negado},op);
 async function lerComAluno(id){
  const e=await ler(),atual=e.alunos.find(a=>a.id===id);
  const [det,historico,exames,provas]=await Promise.all([chamar(Get('alunos/'+id)),opcional(Get(ComParams(`alunos/${id}/historico`,{pagina:1,tamanho:100})),[]),opcional(Get(`alunos/${id}/exames`)).catch(semPermissao),opcional(Get(`alunos/${id}/provas`)).catch(semPermissao)]);
  let aluno=adaptarAlunoEquipe({...(atual?.api||{}),...det},u);aluno={...aluno,historico:adaptarHistoricoAluno(historico)};
  if(exames)aluno=adaptarExames(exames,aluno);if(provas)aluno=adaptarProvas(provas,aluno);
  return {...e,alunos:[...e.alunos.filter(a=>a.id!==id),aluno]};
 }
 const contextoAula=a=>({...op,unidade:escopoPermitido(op,regras.unidade(a.unidade))?regras.unidade(a.unidade):op.unidade});
 const permitido=e=>({...e,alunos:e.alunos.filter(a=>!a.somenteAgenda&&(escopoPermitido(op,regras.principal(a))||!!regras.carro(a)&&escopoPermitido(op,regras.carro(a)))),recursos:regras.consultarRecursos(e,op),aulas:e.aulas.map(a=>{const vista=aulaSemAdministracaoAlheia(e,op,a),v=vinculoAdministrativoAluno(e,a);return {...vista,...(vista.solicitacaoMedica?{unidadeBaseAdministrativa:v.unidadeBase,vinculoAdministrativoInconsistente:v.inconsistencia}:{})};})});
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
  // 18/11/2026: os membros desativados também aparecem (situação Inativo), para o Master reativar pela própria tela.
  const [equipe,alunos,motoristas,desativados]=await Promise.all([chamar(GetCache(ComParams('equipe',filtroUnidade()))),chamar(GetCache(ComParams('alunos',filtroUnidade()))),opcional(GetCache(ComParams('motoristas',filtroUnidade())),[]),opcional(GetCache(ComParams('equipe',{...filtroUnidade(),situacao:2})),[])]);
  const ativosEquipe=new Set(lista(equipe).map(m=>m.usuarioId||m.email||m.cpf).filter(Boolean));
  const contas=[
   ...[...lista(equipe),...lista(desativados).filter(m=>!ativosEquipe.has(m.usuarioId||m.email||m.cpf)).map(m=>({...m,ativo:false}))].map(m=>({id:m.id,nome:m.nome,login:digitos(m.cpf)||m.email,cpf:digitos(m.cpf),email:m.email,telefone:m.telefone,perfil:PERFIL_DO_PAINEL[numero(m.painel??m.papel?.painel)]||'operador',papelId:m.papel?.id,unidade:u.chave(m.unidades?.[0]),unidades:(m.unidades||[]).map(u.chave),ativa:m.ativo!==false,trocaObrigatoria:!!m.deveTrocarSenha,permissoesNegadas:m.permissoesNegadas||[],origemConta:'equipe'})),
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
  const corpo={nome:String(dados.nome||original?.nome||'').trim(),cpf:digitos(dados.cpf??original?.cpf)||null,email:dados.email||original?.email||null,telefone:dados.telefone||original?.telefone||null,papelId:perfil===original?.perfil?original.papelId:await papelDoPerfil(perfil),unidadeIds:(original?.unidades?.length>1&&unidade===original.unidade?original.unidades:[unidade]).map(u.guid),justificativa};
  if(!original)return respostaSenha(await chamar(Post('equipe',corpo,comChave())));
  if(dados.acao==='redefinir')return respostaSenha(await chamar(Post(`equipe/${original.id}/redefinir-acesso`,{justificativa})));
  if(dados.ativa===false&&original.ativa){await chamar(Delete(`equipe/${original.id}`,{justificativa}));return {};}
  // Reativar cria um vínculo novo (outro Id): a edição vale para ele.
  if(dados.ativa!==false&&!original.ativa){const r=await chamar(Post(`equipe/${original.id}/reativar`,{justificativa}));origemConta.clear();await chamar(Put(`equipe/${r?.id||original.id}`,corpo));return {};}
  await chamar(Put(`equipe/${original.id}`,corpo));return {};
 }
 return {...base,
  identidade:op,senhaPeloServidor:true,
  // 19/11/2026: avisa quando a releitura em segundo plano trouxe dados diferentes (a tela visível redesenha). Devolve o
  // cancelamento da assinatura.
  aoMudarDados(f){ouvintesMudanca.add(f);return ()=>ouvintesMudanca.delete(f);},
  // 13/11/2026: o "Meu perfil" editável (o Master): os dados de quem está logado, o CPF de acesso e a foto de identificação.
  async meuPerfil(){const me=await chamar(Get('equipe/me'));return {nome:me.nome||'',email:me.email||'',telefone:me.telefone||'',cpf:digitos(me.cpf)||'',temFoto:!!me.temFoto,emailConfirmado:me.emailConfirmado!==false};},
  async salvarMeuPerfil(d){await chamar(Put('equipe/me',{nome:String(d.nome||'').trim(),telefone:digitos(d.telefone)||'',email:String(d.email||'').trim()||null,senhaAtual:d.senhaAtual||null,cpf:d.cpf==null?null:(digitos(d.cpf)||'')}));},
  async minhaFoto(){return chamar(Get('equipe/me/foto',{binario:true}));},
  async definirMinhaFoto(arquivo){if(!arquivo?.size||!/^image\/(jpeg|png)$/.test(arquivo.type))throw new Error('Escolha uma foto JPG ou PNG.');if(arquivo.size>5*1024*1024)throw new Error('A foto deve ter até 5 MB.');const corpo=new FormData();corpo.append('arquivo',arquivo,arquivo.name||'foto');await chamar(Post('equipe/me/foto',corpo));},
  async removerMinhaFoto(){await chamar(Post('equipe/me/foto/remover',{}));},
  validarCadastro:base.validarCadastro,
  // ---- leituras
  consultar:base.consultar,
  async estado(){
   // 19/11/2026: a auditoria do Master sai junto com a leitura, e não depois dela.
   const hoje=hojeBrasil(),comAuditoria=master&&op.permissoes.includes('auditoria');
   const [lido,registros]=await Promise.all([ler(),comAuditoria?opcional(GetCache(ComParams('auditoria',{de:somarDias(hoje,-30),ate:hoje,pagina:1,tamanho:100}),SWR),[]):null]);
   const e=permitido(lido),auditoria=comAuditoria?adaptarAuditoria(registros):[];
   return {responsaveis:[],alunos:e.alunos,recursos:e.recursos,aulas:e.aulas,excecoesAgenda:[],configuracoesUnidades:{},auditoria};
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
  // 12/11/2026: os instrutores ativos da categoria, inclusive os sem unidade fixa; o Master vê todos e os outros, os das
  // suas unidades e os sem unidade (a API confere a gravação ao trocar o responsável). O CPF, só de quem está no escopo.
  async instrutoresParaVeiculo(cat){if(!['A','B','D'].includes(cat))throw new Error('Categoria inválida.');const e=await ler(),deTodas=op.nivel===3&&!op.unidadeConsulta;
   const noEscopo=i=>deTodas||!(i.unidades||[]).length&&!i.unidade||(i.unidades?.length?i.unidades:[i.unidade]).some(x=>escopoPermitido(op,x));
   return e.recursos.filter(i=>i.tipo==='Instrutores'&&i.ativo!==false&&i.categorias?.includes(cat)&&noEscopo(i)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'))
    .map(i=>({id:i.id,nome:i.nome,unidade:i.unidade,veiculoIds:[...(i.veiculoIds||[])],cpf:i.cpf||''}));},
  async pares(data,hora,f={}){
   const e=await ler(),v=e.recursos.find(r=>r.id===f.veiculoId),unidade=v?.unidade||f.unidade||op.unidade;
   const r=await opcional(Get(ComParams('disponibilidade',{unidadeId:u.guid(unidade),categoria:NUMERO[f.categoria||v?.categoria],de:data,ate:data,motoristaId:f.instrutorId,veiculoId:f.veiculoId,alunoId:f.alunoId})));
   if(!r)return regras.paresNaUnidade(e,{...op,unidade:['A','D'].includes(f.categoria)?op.unidade:unidade},data,hora,f);
   return lista(r).filter(x=>x.data===data&&String(x.inicio).slice(0,5)===hora).flatMap(x=>(x.pares||[]).map(p=>({instrutorId:p.motoristaId,veiculoId:p.veiculoId,categoria:categoria(p.categoria)})));
  },
  // Pacotes da autoescola para contratar no balcão.
  async pacotes(){return lista(await chamar(GetCache('pacotes'))).map(p=>({id:p.id,nome:p.nomeExibicao||p.nome,quantidade:p.quantidadeAulas,preco:p.preco,categorias:(p.categorias||[]).map(categoria).filter(Boolean)}));},
  // No balcão o pacote entra já aprovado (o financeiro fica em outro sistema).
  async contratarPacote(alunoId,pacoteId){return chamar(Post('contratacoes',{pacoteId,alunoId}));},
  // Aulas extras avulsas no balcão: já aprovadas, como as do cadastro.
  async adicionarAulasAvulsas(alunoId,categoria,quantidade){return chamar(Post('contratacoes',{alunoId,categoria:NUMERO[categoria],quantidadeAulas:Number(quantidade)}));},
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
   // 11/11/2026: operações excepcionais vêm da lista de exceções da agenda (EXCECOES_AGENDA, só Master).
   if(f.tipo==='excecoes'){
    if(op.nivel!==3)throw new Error('Relatório exclusivo do Master.');
    const lista=await chamar(Get('agendamentos/excecoes-agenda')),e=await ler(),nome=id=>e.recursos.find(r=>r.id===id)?.nome||'Não informado';
    const linhas=(Array.isArray(lista)?lista:[]).filter(x=>{const d=String(x.dataHoraInicio||'').slice(0,10);return (!f.inicio||d>=f.inicio)&&(!f.fim||d<=f.fim)&&(!f.alunoId||x.alunoId===f.alunoId);})
     .map(x=>[formatarData(String(x.dataHoraInicio).slice(0,10))+' '+String(x.dataHoraInicio).slice(11,16),x.aluno||x.alunoNome||'Aluno não informado',categoria(x.categoria)||'',nome(x.motoristaId),nome(x.veiculoId),descricao(x.situacao)||'',x.bloqueio||'—',x.justificativa||'']);
    return {nomes:{},filtros:{...f},totais:{excecoes:linhas.length},colunas:['Aula','Aluno','Categoria','Instrutor','Veículo','Situação','Bloqueio','Justificativa'],linhas,criterio:'Inclusões e ajustes excepcionais registrados pelo Master, pela data da aula, de '+formatarData(f.inicio)+' a '+formatarData(f.fim)+'.'};
   }
   const r=await opcional(Get(ComParams('relatorios',{tipo:f.tipo,unidadeId:f.unidade?u.guid(f.unidade):undefined,categoria:NUMERO[f.categoria],alunoId:f.alunoId,motoristaId:f.instrutorId,veiculoId:f.veiculoId,de:f.inicio,ate:f.fim,horaInicial:f.horaInicio,horaFinal:f.horaFim,status:f.status,statusVeiculo:f.statusVeiculo,tipoCnh:f.tipoCnh})));
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
    unidadeId:u.guid(op.unidade),unidadeCarroId:cat.includes('B')?u.guid(dados.unidadeCarro):null,tipoCnhId:Number(dados.tipoCnh)||null,dataContrato:dados.dataContrato||null,kmUnidadeId:u.guid(dados.km)||null,tipoCambioId:cat.includes('B')?CAMBIO_ID[dados.tipoCambio]??null:null,observacoes:String(dados.observacoes||'').trim(),
    aulas:['A','B','D'].filter(c=>cat.includes(c)).map(c=>({categoria:NUMERO[c],quantidade:Number(quantidades[c])}))},comChave(solicitacaoId)));
   // O contrato anexado no cadastro sobe logo depois; uma falha aqui não desfaz o cadastro (a ficha anexa de novo).
   let avisoContrato='';if(r?.id&&dados.contratoArquivo?.size){try{await this.anexarContrato(r.id,dados.contratoArquivo);}catch(e){avisoContrato='O cadastro foi criado, mas o contrato não foi anexado: '+(e?.message||'tente de novo pela ficha')+'.';}}
   return {id:r?.id,contaExistente:!!r?.contaExistente,...respostaSenha(r),linkAcesso:r?.linkAcesso||null,avisoContrato};
  },
  // Fase 1: validação do cadastro e contrato do aluno.
  // 11/11/2026: nome próprio (antes "validarCadastro", o mesmo da validação do formulário, que ficava apagada e chamava
  // alunos/[object Object]/validar-cadastro a cada campo do cadastro).
  async validarCadastroDoAluno(id){regras.autorizar(op,'anotar');await chamar(Post(`alunos/${id}/validar-cadastro`,{}));},
  async salvarContrato(id,{tipoCnh,dataContrato,km}){regras.autorizar(op,'anotar');await chamar(Put(`alunos/${id}/contrato`,{tipoCnhId:Number(tipoCnh)||null,dataContrato:dataContrato||null,kmUnidadeId:u.guid(km)||null}));},
  async anexarContrato(id,arquivo){regras.autorizar(op,'anotar');if(!arquivo?.size)throw new Error('Escolha o arquivo do contrato (PDF, JPG ou PNG).');const corpo=new FormData();corpo.append('arquivo',arquivo,arquivo.name||'contrato');await chamar(Post(`alunos/${id}/contrato/arquivo`,corpo));},
  // 17/11/2026: as reposições por atestado do aluno: as que ainda não viraram aula (a próxima aula agendada da categoria
  // vira a reposição) e as já usadas.
  async reposicoesDoAluno(id){const a=await chamar(Get('alunos/'+id)),l=Array.isArray(a?.reposicoes)?a.reposicoes:[];return l.map(r=>({id:r.id,categoria:categoria(r.categoria),aulaOrigemId:r.aulaOrigemId,aulaReposicaoId:r.aulaReposicaoId||null,criadaEm:r.criadaEm}));},
  async arquivoContrato(id){return chamar(Get(`alunos/${id}/contrato/arquivo`,{binario:true}));},
  // 09/11/2026: "Meus documentos" do aluno (a ficha anexa; o aluno vê na conta dele).
  async documentosAluno(id){const r=await chamar(Get(`alunos/${id}/documentos`));return Array.isArray(r)?r:[];},
  async anexarDocumentoAluno(id,{categoria,titulo,paraTodos,arquivo}){regras.autorizar(op,'anotar');if(!arquivo?.size)throw new Error('Escolha o arquivo (PDF, JPG ou PNG).');
   const corpo=new FormData();corpo.append('arquivo',arquivo,arquivo.name||'documento');corpo.append('categoria',String(categoria));if(titulo)corpo.append('titulo',titulo);corpo.append('paraTodos',paraTodos?'true':'false');
   return chamar(Post(`alunos/${id}/documentos`,corpo));},
  async arquivoDocumentoAluno(id,documentoId){return chamar(Get(`alunos/${id}/documentos/${documentoId}/arquivo`,{binario:true}));},
  async removerDocumentoAluno(id,documentoId){regras.autorizar(op,'anotar');await chamar(Post(`alunos/${id}/documentos/${documentoId}/remover`,{}));},
  // Fase 8: os pedidos de mais aulas, o chat da equipe, as avaliações e o horário de atendimento do chat.
  async pedidosAulas(abertos){return lista(await chamar(Get(ComParams('equipe/pedidos-aulas',{abertos:abertos?true:undefined}))));},
  async atenderPedidoAulas(id){return chamar(Post(`equipe/pedidos-aulas/${id}/atendido`,{}));},
  async chatEquipe(depois){return lista(await chamar(Get(ComParams('equipe/chat',{depois:depois||undefined}))));},
  async enviarChatEquipe(texto){return chamar(PostApi('equipe/chat',{texto}));},
  async chatNaoLidas(){return chamar(Get('equipe/chat/nao-lidas'));},
  // Chat estilo WhatsApp (09/11/2026): conversas individuais e o grupo da unidade; a API decide quem fala com quem.
  async chatResumo(){return chamar(Get('chat/resumo'));},
  async chatConversa(usuarioId){return lista(await chamar(Get('chat/conversas/'+usuarioId)));},
  async chatEnviar(usuarioId,texto){return chamar(PostApi('chat/conversas/'+usuarioId+'/mensagens',{texto:textoMensagem(texto)}));},
  async chatLer(usuarioId){await chamar(PostApi('chat/conversas/'+usuarioId+'/leitura',{}));},
  async chatGrupo(unidadeId){return lista(await chamar(Get('chat/grupos/'+unidadeId)));},
  async chatEnviarGrupo(unidadeId,texto){return chamar(PostApi('chat/grupos/'+unidadeId+'/mensagens',{texto:textoMensagem(texto)}));},
  async chatLerGrupo(unidadeId){await chamar(PostApi('chat/grupos/'+unidadeId+'/leitura',{}));},
  // Gerência e Master com o aluno (conversa direta; o aluno só vê depois da 1ª mensagem da equipe).
  async chatAluno(alunoId){return lista(await chamar(Get('chat/alunos/'+alunoId)));},
  async chatEnviarAluno(alunoId,texto){return chamar(PostApi('chat/alunos/'+alunoId+'/mensagens',{texto:textoMensagem(texto)}));},
  async chatLerAluno(alunoId){await chamar(PostApi('chat/alunos/'+alunoId+'/leitura',{}));},
  // As conversas dos alunos para o chat (a Gerência e o Master veem só as transferidas pela Recepção).
  async conversasAlunos({encaminhadas}={}){exigirCapacidade(op,'mensagens',1);const r=await chamar(Get(ComParams('conversas',{encaminhadas:encaminhadas?true:undefined,pagina:1,tamanho:100}),{comTotal:true}));return r.itens.map(c=>adaptarConversaEquipe(c,u));},
  async encaminharConversa(id){await chamar(Post(`conversas/${id}/encaminhar`));},
  async devolverConversa(id){await chamar(Post(`conversas/${id}/devolver`));},
  async marcarChatLido(){await chamar(PostApi('equipe/chat/lidas',{}));},
  async avaliacoesResumo(f={}){return chamar(Get(ComParams('equipe/avaliacoes',{de:f.de||undefined,ate:f.ate||undefined})));},
  async atendimentoChat(){return chamar(Get('equipe/atendimento'));},
  async definirAtendimentoChat(d){return chamar(Put('equipe/atendimento',d));},
  // Fase 7 (4.2): o relatório diário do SIT (as 2 primeiras aulas de cada aluno marcadas no dia) e o "Lançado no SIT".
  // 19/11/2026: o contador do menu e o cartão do SIT pedem o mesmo dia: um pedido só (10 s; o lançamento descarta o cache).
  async relatorioSit(data){return chamar(GetCache(ComParams('agenda/relatorio-sit',{data:data||undefined}),CURTA));},
  // 16/11/2026: os dias do período com aulas do SIT (total, lançadas e pendentes), para o calendário da tela.
  async diasSit(de,ate){return chamar(GetCache(ComParams('agenda/relatorio-sit/dias',{de:de||undefined,ate:ate||undefined}),CURTA));},
  async lancarSit(agendamentoId){return chamar(Post(`agenda/relatorio-sit/${agendamentoId}/lancamento`,{}));},
  async desfazerSit(agendamentoId){return chamar(Delete(`agenda/relatorio-sit/${agendamentoId}/lancamento`));},
  // Fase 6 (3.4): o PDF do agendamento da prova (o aluno recebe no app), o dia de prova e o veículo da prova.
  async anexarAgendamentoProva(id,tentativaId,arquivo){if(!arquivo?.size)throw new Error('Escolha o PDF do agendamento.');const corpo=new FormData();corpo.append('arquivo',arquivo,arquivo.name||'agendamento.pdf');await chamar(Post(`alunos/${id}/provas/${tentativaId}/agendamento`,corpo));},
  async agendamentoProva(id,tentativaId){return chamar(Get(`alunos/${id}/provas/${tentativaId}/agendamento`,{binario:true}));},
  async diasProva(f={}){return lista(await chamar(Get(ComParams('agenda/provas',Object.fromEntries(Object.entries(f).filter(([,v])=>v))))));},
  async definirDiaProva(data,{maxManha,maxTarde}){const n=v=>v===''||v==null?null:Number(v);return chamar(Put(`agenda/provas/${data}`,{maxManha:n(maxManha),maxTarde:n(maxTarde)}));},
  async reservarVeiculoProva(data,veiculoId){return chamar(Post(`agenda/provas/${data}/veiculos`,{veiculoId}));},
  async liberarVeiculoProva(data,veiculoId){return chamar(Delete(`agenda/provas/${data}/veiculos/${veiculoId}`));},
  // 18/11/2026: exclui o dia de prova vazio (sem aluno, veículo e instrutor).
  async excluirDiaProva(data){return chamar(Delete(`agenda/provas/${data}`));},
  // 13/11/2026: o instrutor que vai para a prova (fora da agenda até 13:00 desse dia).
  async reservarInstrutorProva(data,motoristaId){return chamar(Post(`agenda/provas/${data}/instrutores`,{motoristaId}));},
  async liberarInstrutorProva(data,motoristaId){return chamar(Delete(`agenda/provas/${data}/instrutores/${motoristaId}`));},
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
   const corpo={statusProvaId:STATUS_PROVA_ID[dados.status],data:dados.status==='Agendado'?dados.data:undefined,periodoId:dados.status==='Agendado'&&dados.periodoId?Number(dados.periodoId):undefined,horario:dados.status==='Agendado'&&dados.horario?String(dados.horario).slice(0,5):undefined};if(!corpo.statusProvaId)throw new Error('Selecione uma situação válida.');
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
    const r=await chamar(Post('motoristas/pela-autoescola',{nome:String(dados.nome||'').trim(),cpf:digitos(dados.cpf||dados.identificacao),email:dados.email||null,telefone:digitos(dados.telefone)||null,categorias:categoriasId(dados.categoria),unidadeIds:Object.hasOwn(dados,'unidade')?(dados.unidade?[u.guid(dados.unidade)]:[]):[u.guid(unidade)],
     horarioAlmoco:ALMOCO_LEGADO[dados.horarioAlmoco]||dados.horarioAlmoco||null,jornadaInicio:dados.inicio||null,jornadaFim:dados.fim||null,observacoes:String(dados.observacoes||'').trim(),...documentosInstrutor(dados)},comChave()));
    // Os veículos escolhidos passam para o instrutor novo (PUT responsavel move as aulas futuras de cada um).
    const falhas=[];for(const veiculoId of dados.veiculoIds||[]){try{await chamar(Put(`veiculos/${veiculoId}/responsavel`,{motoristaId:r?.id},comChave()));}catch(e){falhas.push(e.message);}}
    if(falhas.length)throw new Error('Instrutor cadastrado, mas nem todos os veículos foram vinculados: '+falhas.join(' '));
    return {id:r?.id,contaExistente:!!r?.contaExistente,...respostaSenha(r)};
   }
   if(dados.tipo!=='Veículos')throw new Error('Informe nome, identificação e tipo do recurso.');
   return chamar(Post('veiculos/pela-autoescola',{placa:String(dados.identificacao||'').trim(),modelo:String(dados.nome||'').trim(),categoria:NUMERO[dados.categoria],tipoCambioId:dados.categoria==='B'?CAMBIO_ID[dados.tipoCambio]??null:null,motoristaId:dados.instrutorId||null},comChave()));
  },
  async editarInstrutor(id,d){
   regras.autorizar(op,'editar-instrutor');const e=await ler(),r=e.recursos.find(x=>x.id===id&&x.tipo==='Instrutores');if(!r)throw new Error('Instrutor fora do escopo de edição desta unidade.');
   // 12/11/2026: a "Unidade administrativa" (Gerência e Master, a qualquer hora; vazia = sem unidade fixa). Vai primeiro: se a
   // API recusar (aula futura na unidade que sai), o resto da edição não é gravado.
   if(Object.hasOwn(d,'novaUnidade')&&(d.novaUnidade||'')!==(r.unidade||'')){if(op.nivel<2)throw new Error('Somente a Gerência e o Master alteram a unidade do instrutor.');if(!r.vinculoId)throw new Error('Instrutor sem vínculo com a autoescola.');
    await chamar(Put('vinculos/'+r.vinculoId+'/unidades',{unidadeIds:d.novaUnidade?[u.guid(d.novaUnidade)]:[]}));}
   // 11/11/2026: "ativo" só quando a tela muda a situação (o r.ativo daqui vem dos documentos e desativava o vínculo).
   await chamar(Put(`motoristas/${id}/pela-autoescola`,{nome:String(d.nome??r.nome).trim(),categorias:categoriasId(d.categoria??r.categorias.join('')),ativo:d.ativo??null,justificativa:d.justificativa||null,...documentosInstrutor(d)}));
   if(r.vinculoId)await chamar(Put(`vinculos/${r.vinculoId}/operacao`,{horarioAlmoco:d.alterarAlmoco?ALMOCO_LEGADO[d.horarioAlmoco]||d.horarioAlmoco:ALMOCO_LEGADO[r.horarioAlmoco]||r.horarioAlmoco,jornadaInicio:d.inicio??r.disponibilidade?.[1]?.[0]?.inicio??null,jornadaFim:d.fim??r.disponibilidade?.[1]?.[0]?.fim??null,disponivel:d.disponivel??r.disponivel,observacoes:String(d.observacoes??r.observacoes??'').trim()}));
   // 12/11/2026: o "Veículo" do Editar instrutor (não é fixo). Solta os outros veículos dele (com aula marcada, a API recusa e
   // nada muda naquele veículo) e liga o escolhido (a API leva junto as aulas futuras dele). Vai por último: o resto já foi salvo.
   if(Object.hasOwn(d,'novoVeiculo')){const atuais=r.veiculoIds||[],novo=d.novoVeiculo||'';
    if(!(atuais.length===(novo?1:0)&&(!novo||atuais[0]===novo))){
     try{for(const x of atuais.filter(x=>x!==novo))await chamar(Put('veiculos/'+x+'/responsavel',{motoristaId:null},comChave()));
      // 18/11/2026: as aulas futuras do veículo que vieram junto (para a tela avisar).
      if(novo&&!atuais.includes(novo)){const r=await chamar(Put('veiculos/'+novo+'/responsavel',{motoristaId:id},comChave()));if(r?.aulasMovidas>0)return {aulasMovidas:r.aulasMovidas};}}
     catch(e){throw new Error('Os dados do instrutor foram salvos, mas o veículo não foi trocado: '+(e?.message||'tente de novo.'));}}}
  },
  async editarVeiculo(id,d){
   regras.autorizar(op,'editar-veiculo');const e=await ler(),v=e.recursos.find(x=>x.id===id&&x.tipo==='Veículos');if(!v)throw new Error('Cadastro de recurso fora do escopo administrativo desta unidade.');
   // 13/11/2026: a unidade (Gerência e Master; vazia = sem unidade fixa). A categoria não muda depois do cadastro.
   const trocaUnidade=Object.hasOwn(d,'novaUnidade')&&(d.novaUnidade||'')!==((v.unidadeAdministrativa??v.unidade)||'');if(trocaUnidade&&op.nivel<2)throw new Error('Somente a Gerência e o Master alteram a unidade do veículo.');
   await chamar(Put(`veiculos/${id}/pela-autoescola`,{modelo:String(d.nome??v.nome).trim(),placa:String(d.identificacao??v.placa).trim(),tipoCambioId:Object.hasOwn(d,'tipoCambio')?CAMBIO_ID[d.tipoCambio]??null:undefined,
    ...(trocaUnidade?(d.novaUnidade?{unidadeId:u.guid(d.novaUnidade)}:{semUnidade:true}):{})}));
   if(d.instrutorId&&d.instrutorId!==v.instrutorId)await chamar(Put(`veiculos/${id}/responsavel`,{motoristaId:d.instrutorId},comChave()));
  },
  // Redefinir senha (decisão do João em 31/10): a API manda o link de redefinição ao e-mail do aluno.
  async enviarRedefinicaoAluno(id){exigirCapacidade(op,'redefinir-senha-aluno',1);return chamar(Post(`alunos/${id}/enviar-redefinicao`,{}));},
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
  // ---- antecipação: horários ocupados que o aluno marcou e que vagaram (a API calcula na hora da consulta).
  async consultarLiberados(f={}){
   exigirCapacidade(op,'antecipar',1);if(f.unidade&&!escopoPermitido(op,f.unidade))throw new Error('Unidade não autorizada.');
   const r=await chamar(Get(ComParams('antecipacoes/horarios-liberados',{unidadeId:f.unidade?u.guid(f.unidade):undefined,categoria:NUMERO[f.categoria],de:f.de||undefined,ate:f.ate||undefined})));
   return lista(r).map(h=>adaptarLiberado(h,u));
  },
  async totalLiberados(){exigirCapacidade(op,'antecipar',1);const unidade=op.unidadeConsulta||op.unidade;const r=await opcional(Get(ComParams('antecipacoes/horarios-liberados/total',{unidadeId:unidade?u.guid(unidade):undefined})),0);return Number(r?.total??r)||0;},
  async enviarOfertas(ids,f={},chave){exigirCapacidade(op,'antecipar',1);if(f.unidade&&!escopoPermitido(op,f.unidade))throw new Error('Unidade não autorizada.');return chamar(Post('antecipacoes/ofertas',{interesseIds:ids,unidadeId:f.unidade?u.guid(f.unidade):null},comChave(chave)));},
  async marcarContatado(id,observacao){exigirCapacidade(op,'antecipar',1);return chamar(Post(`antecipacoes/interesses/${id}/contato`,{observacao:observacaoInteresse(observacao)}));},
  async remarcarInteresse(id,{aulaId,instrutorId,veiculoId},chave){
   exigirCapacidade(op,'antecipar',1);if(!aulaId||!instrutorId||!veiculoId)throw new Error('Escolha a aula a antecipar, o instrutor e o veículo.');
   return chamar(Post(`antecipacoes/interesses/${id}/remarcacao`,{agendamentoAnteriorId:aulaId,motoristaId:instrutorId,veiculoId},comChave(chave)));
  },
  async descartarInteresse(id,observacao){exigirCapacidade(op,'antecipar',1);return chamar(Post(`antecipacoes/interesses/${id}/descarte`,{observacao:observacaoInteresse(observacao)}));},
  // 10/11/2026: os interesses abertos (inclusive dos horários que ainda não vagaram) e o "Quero adiantar minhas aulas".
  async consultarEmEspera(f={}){
   exigirCapacidade(op,'antecipar',1);if(f.unidade&&!escopoPermitido(op,f.unidade))throw new Error('Unidade não autorizada.');
   const r=await chamar(Get(ComParams('antecipacoes/interesses-em-espera',{unidadeId:f.unidade?u.guid(f.unidade):undefined,categoria:NUMERO[f.categoria],de:f.de||undefined,ate:f.ate||undefined})));
   return lista(r).map(x=>{const i=String(x.dataHoraInicio||'');return {id:x.interesseId,alunoId:x.alunoId,aluno:x.nome||'Aluno não informado',telefone:x.telefone??'',categoria:categoria(x.categoria),data:i.slice(0,10),inicio:i.slice(11,16),fim:String(x.dataHoraFim||'').slice(11,16),
    unidade:u.chave(x.unidadeId),unidadeNome:x.unidade||'',situacao:SITUACAO_INTERESSE[numero(x.situacao)]??descricao(x.situacao)??'Aguardando',marcadoEm:x.marcadoEm??null,aulaParaAntecipar:x.aulaParaAntecipar??null,saldo:Number(x.saldo)||0};});
  },
  async pedidosAdiantamento(f={}){
   exigirCapacidade(op,'antecipar',1);if(f.unidade&&!escopoPermitido(op,f.unidade))throw new Error('Unidade não autorizada.');
   const r=await chamar(Get(ComParams('antecipacoes/pedidos-adiantamento',{unidadeId:f.unidade?u.guid(f.unidade):undefined})));
   return lista(r).map(x=>({id:x.id,alunoId:x.alunoId,aluno:x.nome||'Aluno não informado',telefone:x.telefone??'',unidade:u.chave(x.unidadeId),unidadeNome:x.unidade||'',pedidoEm:x.pedidoEm??null,proximaAula:x.proximaAula??null,diasDaSemana:Array.isArray(x.diasDaSemana)?x.diasDaSemana.map(Number):[],horarios:Array.isArray(x.horarios)?x.horarios:[],aulasAgendadas:Number(x.aulasAgendadas)||0,saldo:Number(x.saldo)||0}));
  },
  async atenderPedidoAdiantamento(id){exigirCapacidade(op,'antecipar',1);return chamar(Post(`antecipacoes/pedidos-adiantamento/${id}/atendido`,{}));},
  // ---- conversa com o aluno: caixa da equipe (escopo pelas unidades na API). Leituras sem cache: o contador e a
  // conversa aberta consultam a cada 15 s.
  async conversas(f={}){
   exigirCapacidade(op,'mensagens',1);if(f.unidade&&!op.unidades.includes(f.unidade))throw new Error('Unidade não autorizada.');
   const r=await chamar(Get(ComParams('conversas',{unidadeId:f.unidade?u.guid(f.unidade):undefined,busca:String(f.busca||'').trim()||undefined,somenteNaoLidas:f.somenteNaoLidas?true:undefined,pagina:f.pagina||1,tamanho:f.tamanho||20}),{comTotal:true}));
   return {itens:r.itens.map(c=>adaptarConversaEquipe(c,u)),total:r.total};
  },
  async conversa(id){
   exigirCapacidade(op,'mensagens',1);const r=await chamar(Get(ComParams('conversas/'+id,{tamanho:100})));
   return {conversa:adaptarConversaEquipe(r.conversa||{},u),mensagens:(r.mensagens||[]).map(adaptarMensagemConversa)};
  },
  // 18/11/2026: atestados ainda sem decisão (com a Recepção ou a Gerência) no escopo da conta, para o número do item
  // Verificações do menu. Sem a permissão (403) ou com a API fora, conta zero e o número não aparece.
  async totalVerificacoesPendentes(){const unidade=op.unidadeConsulta||op.unidade;const r=await opcional(Get(ComParams('solicitacoes-medicas/totais',{unidadeId:unidade?u.guid(unidade):undefined})),null).catch(()=>null);return r?(Number(r.recepcao)||0)+(Number(r.gerencia)||0):0;},
  async totalMensagensNaoLidas(){exigirCapacidade(op,'mensagens',1);const r=await opcional(Get('conversas/nao-lidas'),0);return Number(r?.total??r)||0;},
  async marcarConversaLida(id){exigirCapacidade(op,'mensagens',1);await chamar(Post(`conversas/${id}/leitura`));},
  async enviarMensagemConversa(id,texto,chave){exigirCapacidade(op,'responder-mensagem',1);return adaptarMensagemConversa(await chamar(Post(`conversas/${id}/mensagens`,{texto:textoMensagem(texto)},comChave(chave))));},
  // Iniciar pela ficha: a API acha ou cria a conversa do aluno (sem conversa vazia).
  async enviarMensagemAluno(alunoId,texto,chave){
   exigirCapacidade(op,'responder-mensagem',1);const r=await chamar(Post(`alunos/${alunoId}/conversa/mensagens`,{texto:textoMensagem(texto)},comChave(chave)));
   return {conversaId:r?.conversaId,mensagem:r?.mensagem?adaptarMensagemConversa(r.mensagem):null};
  },
  // ---- Gerência e Master
  async decidirAtestado(id,d){
   exigirCapacidade(op,'decidir-atestado');if(!['aprovado','rejeitado'].includes(d.resultado)||d.confirmado!==true)throw new Error('Confirme a decisão com identificador válido.');
   const j=String(d.justificativa||'').trim();if(j.length<5||j.length>2000)throw new Error('Informe uma justificativa de 5 a 2000 caracteres.');
   const atual=(await ler()).aulas.find(a=>a.solicitacaoMedica?.id===id)?.solicitacaoMedica,final=['aprovado','rejeitado'].includes(atual?.status);
   if(final)exigirCapacidade(op,'corrigir-decisao',3);
   return chamar(Post(`solicitacoes-medicas/${id}/${final?'correcao':'decisao'}`,{resultado:d.resultado,justificativa:j,...(!final&&d.resultado==='aprovado'&&Array.isArray(d.aulasDoPeriodo)&&d.aulasDoPeriodo.length?{aulasDoPeriodo:d.aulasDoPeriodo}:{})},comChave(d.operacaoId)));
  },
  // 17/11/2026: as aulas marcadas do aluno depois da aula do atestado, até a data (atestado de mais dias).
  async aulasDoAfastamento(id,ate){exigirCapacidade(op,'decidir-atestado');return lista(await chamar(Get(ComParams(`solicitacoes-medicas/${id}/aulas-do-periodo`,{ate}))));},
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
   exigirCapacidade(op,'editar-cadastro',1);const j=String(justificativa||'').trim();if(j.length<5)throw new Error('Justifique a correção cadastral.');
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
   exigirCapacidade(op,'gerenciar-situacao');const j=String(justificativa||'').trim();if(typeof ativo!=='boolean')throw new Error('Situação inválida.');
   const r=(await ler()).recursos.find(x=>x.id===id);if(!r||(r.unidade&&!escopoPermitido(op,regras.unidade(r.unidade))))throw new Error('Recurso fora do escopo.');
   // 13/11/2026: instrutor só pelo Master, num clique e sem justificativa (a API também barra quem não é Master).
   // 13/11/2026: o veículo segue a mesma regra (só o Master, num clique e sem justificativa).
   if(r.tipo==='Veículos'){if(op.nivel!==3)throw new Error('Somente o Master ativa ou desativa veículo.');await chamar(Put(`veiculos/${id}/pela-autoescola`,{modelo:r.nome,placa:r.placa,ativo,justificativa:j||null}));return;}
   if(r.tipo==='Instrutores'){if(op.nivel!==3)throw new Error('Somente o Master ativa ou desativa instrutor.');await chamar(Put(`motoristas/${id}/pela-autoescola`,{nome:r.nome,categorias:categoriasId(r.categorias.join('')),ativo,justificativa:j||null}));return;}
   if(j.length<5)throw new Error('Informe uma justificativa de 5 a 2000 caracteres.');
   await chamar(Put(`veiculos/${id}/pela-autoescola`,{modelo:r.nome,placa:r.placa,ativo,justificativa:j}));
  },
  async diasBloqueados(){return lista(await chamar(GetCache('agenda/dias-bloqueados'))).map(d=>({data:String(d.data).slice(0,10),justificativa:d.justificativa,aulasNoDia:d.aulasNoDia}));},
  async bloquearDia({data,justificativa}){exigirCapacidade(op,'configurar',3);const r=await chamar(Post('agenda/dias-bloqueados',{data,justificativa:String(justificativa||'').trim()}));return {data,aulasNoDia:r?.aulasNoDia??0};},
  async liberarDia(data,justificativa){exigirCapacidade(op,'configurar',3);await chamar(Delete('agenda/dias-bloqueados/'+data,{justificativa:String(justificativa||'').trim()}));},
  // Fase 4: os checklists dos veículos (histórico e alertas) e as fotos.
  // 17/11/2026 (pedido do usuário): as avaliações dos instrutores (só Gerência e Master; a API recusa os outros painéis).
  async mediasInstrutores(){return new Map(lista(await chamar(Get('equipe/avaliacoes/instrutores'))).map(m=>[m.motoristaId,{media:m.media,total:m.total}]));},
  async avaliacoesInstrutor(id){return chamar(Get('equipe/avaliacoes/instrutores/'+id));},
  async checklists(filtro={}){return lista(await chamar(Get(ComParams('veiculos/checklists',Object.fromEntries(Object.entries(filtro).filter(([,v])=>v!==''&&v!=null))))));},
  async fotoChecklist(id,documentoId){return chamar(Get(`veiculos/checklists/${id}/fotos/${documentoId}`,{binario:true}));},
  // Fase 3: só a Gerência cancela; a Recepção pede a substituição e marca a falta com ônus.
  async substituirAluno(id,{novoAlunoId,motivo,credito}){return chamar(Post(`agendamentos/${id}/substituir`,{novoAlunoId:novoAlunoId||null,motivo:String(motivo||'').trim(),credito}));},
  async solicitarSubstituicao(id,{novoAlunoId,motivo}){return chamar(Post(`agendamentos/${id}/solicitar-substituicao`,{novoAlunoId:novoAlunoId||null,motivo:String(motivo||'').trim()}));},
  // 19/11/2026: a home e o cartão de substituições pediam a mesma lista 3 vezes na entrada: um pedido só (10 s).
  async substituicoes(status){return [...lista(await chamar(GetCache(ComParams('agenda/substituicoes',status?{status}:{}),CURTA)))];},
  async decidirSubstituicao(id,{aprovar,resposta,credito}){return chamar(Post(`agenda/substituicoes/${id}/decisao`,{aprovar:aprovar===true,resposta:String(resposta||'').trim()||null,credito:credito||null}));},
  async faltaComOnus(id,motivo){await chamar(Post(`agendamentos/${id}/falta-com-onus`,{motivo:String(motivo||'').trim()||null}));},
  // Fase 2: status do veículo, manutenção, preventiva e realocação dos alunos.
  async alterarStatusVeiculo(id,{status,descricao:texto,previsao,km}){await chamar(Put(`veiculos/${id}/status`,{status:Number(status),descricao:String(texto||'').trim(),previsaoConclusao:previsao||null,km:km===''||km==null?null:Number(km)}));},
  async registrarAndamento(id,{texto,previsao}){await chamar(Post(`veiculos/${id}/manutencao/andamento`,{texto:String(texto||'').trim(),previsaoConclusao:previsao||null}));},
  async configurarPreventiva(id,d){const n=v=>v===''||v==null?null:Number(v);await chamar(Put(`veiculos/${id}/preventiva`,{dias:n(d.dias),km:n(d.km),ultimaEm:d.ultimaEm||null,ultimaKm:n(d.ultimaKm),kmAtual:n(d.kmAtual)}));},
  async manutencoes(id){return lista(await chamar(Get(`veiculos/${id}/manutencoes`)));},
  // 4.2: preventiva programada (janela com data e hora) e o painel das manutenções da frota.
  async programarPreventiva(id,{inicio,fim,motivo}){return chamar(Post(`veiculos/${id}/manutencao/programada`,{inicio:inicio||null,fim:fim||null,motivo:String(motivo||'').trim()}));},
  async cancelarProgramada(id,programacaoId){await chamar(Post(`veiculos/${id}/manutencao/programada/${programacaoId}/cancelar`,{}));},
  async painelManutencoes(filtro={}){return lista(await chamar(Get(ComParams('agenda/manutencoes',{veiculoId:filtro.veiculoId||undefined,incluirConcluidas:filtro.incluirConcluidas?true:undefined}))));},
  async previaRealocacao(d){return chamar(Post('agenda/realocacoes/previa',corpoRealocacao(d)));},
  async realocar(d){return chamar(Post('agenda/realocacoes',corpoRealocacao(d)));},
  // 17/11/2026: cancelarAulas fecha o dia mesmo com aula marcada (a API cancela com o crédito devolvido e avisa os alunos);
  // devolve quantas aulas foram canceladas.
  // 17/11/2026: o dia sem aula em várias unidades numa chamada só (o aluno com aulas em mais de uma recebe uma mensagem
  // só). Devolve o resultado por unidade: fechada, ja-fechada ou recusada (com a mensagem).
  async fecharDiaEmLote(ids,{data,ate,justificativa,cancelarAulas}){
   if(op.nivel>=3)exigirCapacidade(op,'configurar',3);else exigirCapacidade(op,'registrar-frequencia',2);
   if(String(justificativa||'').trim().length<5)throw new Error('Informe o motivo (5 a 2000 caracteres).');
   const r=await chamar(Post('unidades/excecoes/lote',{unidadeIds:ids.map(id=>u.guid(id)),data,...(ate?{ate}:{}),justificativa:justificativa.trim(),...(cancelarAulas?{cancelarAulas:true}:{})}));
   return {aulasCanceladas:Number(r?.aulasCanceladas)||0,unidades:(r?.unidades||[]).map(x=>({unidade:u.chave(x.unidadeId),situacao:x.situacao,mensagem:x.mensagem||'',aulasCanceladas:Number(x.aulasCanceladas)||0,data:String(x.data||'').slice(0,10)||data}))};
  },
  async configurarUnidade(id,{fechada,data,justificativa,cancelarAulas}){
   // 16/11/2026: a Gerência também fecha o dia na unidade dela, pela agenda (a API confere a unidade).
   if(op.nivel>=3)exigirCapacidade(op,'configurar',3);else exigirCapacidade(op,'registrar-frequencia',2);if(typeof fechada!=='boolean'||String(justificativa||'').trim().length<5)throw new Error('Informe unidade e data válidas, sem alterar o passado.');
   if(!fechada){try{await chamar(Delete(`unidades/${u.guid(id)}/excecoes/${data}`,{justificativa:justificativa.trim()}));return;}catch(e){if(e?.status!==404)throw e;}}
   const r=await chamar(Post(`unidades/${u.guid(id)}/excecoes`,{data,fechada,justificativa:justificativa.trim(),...(cancelarAulas?{cancelarAulas:true}:{})}));
   return {aulasCanceladas:Number(r?.aulasCanceladas)||0};
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
  async auditoriaDoAluno({de,ate,alunoId,responsavel,tipo,pagina=1,tamanho=25}={}){exigirCapacidade(op,'auditoria',2);const unidadeId=op.nivel===3?filtroUnidade().unidadeId:u.guid(op.unidade),filtro=Object.fromEntries(Object.entries({de,ate,alunoId,unidadeId,responsavel,tipo,pagina,tamanho}).filter(([,v])=>v!==''&&v!=null));return chamar(Get(ComParams('auditoria/alunos',filtro)));},
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
