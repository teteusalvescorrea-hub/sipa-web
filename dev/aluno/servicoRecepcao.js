import {lerMensagemAluno} from '../../shared/js/mensagensAluno.js';
import {preferenciaAntecipacao} from '../../shared/js/antecipacaoAdministrativa.js';
import {validarAtestado,solicitarMedico} from '../../shared/js/solicitacoesMedicas.js';
import {guardarAtestado,lerAtestado,descartarUploadNaoSalvo} from './documentosMedicos.js';
import {recursoCarroConsultavel,localCarro} from '../../shared/js/operacaoCarro.js';
import {operarPainelRecepcao,consultarMinhaContaRecepcao,sairContaRecepcao,exigirLaboratorio,alterarSenhaContaRecepcao} from './contaRecepcao.js';
import {calcularHorariosLocais,consultarRecursosLocais} from './authLocal.js';
import {normalizarUnidadeLocal} from '../../aluno/js/domain/dominioAluno.js';
import {resumirCreditosRecepcao,motivoBloqueioCreditos} from '../../aluno/js/domain/creditosRecepcao.js';
import {gerarPropostaAutomatica,normalizarPreferenciasAutomaticas,criarCancelamento} from '../../aluno/js/domain/agendamentoAluno.js';
import {fimDaAula} from '../../shared/js/disponibilidade.js';
import {localCategoriaD,recursosOperacionaisD} from '../../shared/js/categorias.js';
import {hojeBrasil} from '../../shared/js/calendario.js';
import {EXAMES_FICHA,lerExameFicha,PROVAS_FICHA,SITUACOES_PROVA,provasDoAluno} from '../../nivel-1-operador/js/fichaOperador.js';
import {etapaParaAgendamento,ETAPAS} from '../../shared/js/elegibilidadeAluno.js';

export function acompanhamentoDaConta(aluno){
 const exames=Object.entries(EXAMES_FICHA).map(([tipo,nome])=>{
  const e=lerExameFicha(aluno,tipo);return {tipo,nome,situacao:e.status,data:e.data||'',validade:e.validade||''};
 });
 const tentativas=provasDoAluno(aluno);
 const provas=Object.entries(PROVAS_FICHA).filter(([,p])=>!p.categoria||aluno.categoria.includes(p.categoria)).map(([tipo,p])=>({tipo,nome:p.nome,tentativas:tentativas.filter(t=>t.tipo===tipo).map(t=>({id:t.id,ordem:t.ordem||1,data:t.data||'',situacao:SITUACOES_PROVA.includes(t.status)?t.status:'Registro anterior',resultado:SITUACOES_PROVA.includes(t.resultado)?t.resultado:null}))}));
 const processo=['ladv','pratica'].map(tipo=>{const e=etapaParaAgendamento(aluno,tipo);return {tipo,nome:ETAPAS[tipo],situacao:e?.status||'Não informado',data:e?.data||'',validade:e?.validade||''};});
 return {exames,provas,processo};
}

export function projetarContaRecepcao(c){
 const a=c.aluno,aluno={...a,tipo:'aluno',documento:a.cpf,unidade:normalizarUnidadeLocal(a.unidadePrincipal||a.unidade),unidadeCarro:normalizarUnidadeLocal(a.unidadeCarro)};
 const categorias=['A','B','D'].filter(k=>a.categoria.includes(k));
 const destino=k=>k==='D'?'Cobilândia':k==='A'?'Vila Velha':aluno.unidadeCarro||aluno.unidade;
 const operacionaisD=recursosOperacionaisD(c.recursos);
 const recursos=c.recursos.filter(r=>['Instrutores','Veículos'].includes(r.tipo)&&categorias.some(k=>(k==='D'?(operacionaisD.some(x=>x.id===r.id)||c.aulas.some(x=>x.instrutorId===r.id||x.veiculoId===r.id)):k==='B'?recursoCarroConsultavel(r,aluno.unidadeCarro||aluno.unidade):normalizarUnidadeLocal(r.unidade)===destino(k))&&(r.tipo==='Instrutores'?r.categorias?.includes(k):r.categoria===k))).map(r=>({...Object.fromEntries(['id','nome','ativo','disponivel','categoria','categorias','placa','modelo','tipoCambio','operacoesCarro','horarioAlmoco','intervaloAlmoco','temporarioOnibus','veiculoIds','instrutorId','feriadosUnidade','bloqueiosUnidade'].filter(k=>Object.hasOwn(r,k)).map(k=>[k,r[k]])),tipo:r.tipo==='Instrutores'?'instrutor':'veiculo',unidade:normalizarUnidadeLocal(r.unidade),disponibilidadeSemanal:r.disponibilidade?Object.entries(r.disponibilidade).flatMap(([dia,faixas])=>faixas.map(f=>({dia:Number(dia),...(typeof f==='string'?{inicio:f,fim:fimDaAula(f)}:f)}))):r.disponibilidadeSemanal,bloqueios:[...(r.bloqueios||[]),...(r.datasBloqueadas||[]).map(data=>({data}))]}));
 const converter=x=>({...x,tipo:'aula',aluno:x.alunoId,instrutor:x.instrutorId,veiculo:x.veiculoId,unidade:normalizarUnidadeLocal(x.unidade),inicio:x.data+'T'+x.inicio+':00-03:00',fim:x.data+'T'+x.fim+':00-03:00'});
 const aulas=c.aulas.map(converter),resumo=resumirCreditosRecepcao(a,aulas),credito={id:a.id,alunoId:a.id,categorias:Object.fromEntries(categorias.map(k=>[k,resumo.categorias[k].total]))};
 return {aluno,aulas,credito,resumo,categorias,acompanhamento:acompanhamentoDaConta(a),registros:[aluno,...recursos,...aulas,...c.ocupacoes.filter(o=>categorias.includes('D')&&o.categoria==='D'||recursos.some(r=>r.id===o.instrutorId||r.id===o.veiculoId)).map(converter)],podeConfigurar:false};
}
export function elegibilidadeContaRecepcao(d,data){
 if(motivoBloqueioCreditos(d.aluno))return motivoBloqueioCreditos(d.aluno);
 return '';
}
const elegibilidade=elegibilidadeContaRecepcao;
export function criarServicoContaRecepcao(){
 exigirLaboratorio();
 const dadosAlunoLocal=()=>operarPainelRecepcao(projetarContaRecepcao);
 const calcular=async(d,q,agora)=>d.categorias.includes(q.categoria)&&d.resumo.categorias[q.categoria].disponiveis>0&&!elegibilidade(d,q.data)?calcularHorariosLocais(d,q,agora):[];
 async function reservarAulasLocais(pedido){
  return operarPainelRecepcao(async c=>{
   const d=projetarContaRecepcao(c),categoria=pedido.categoria,selecoes=pedido.aulas,operacaoId=pedido.operacaoId;
   if(!d.categorias.includes(categoria)||!Array.isArray(selecoes)||!selecoes.length||selecoes.length>40||typeof operacaoId!=='string'||!operacaoId||operacaoId.length>100)throw new Error('Seleção de aulas inválida.');
   const unidade=categoria==='D'?'Cobilândia':categoria==='A'?'Vila Velha':d.aluno.unidadeCarro||d.aluno.unidade;
   const assinatura=JSON.stringify({categoria,aulas:selecoes.map(x=>({data:x.data,hora:x.hora,instrutorId:x.instrutorId,veiculoId:x.veiculoId,unidade}))});
   const anteriores=c.aulas.filter(x=>x.operacaoId===operacaoId);
   if(anteriores.length){if(anteriores.length!==selecoes.length||anteriores.some(x=>x.assinaturaPedido!==assinatura))throw new Error('Operação já utilizada por outra seleção.');return {aluno:c.aluno,aulas:c.aulas,retorno:d.aulas.filter(x=>x.operacaoId===operacaoId)};}
   if(!(d.resumo.categorias[categoria].disponiveis>=selecoes.length))throw new Error('Créditos insuficientes. Nenhuma aula foi salva.');
   const novos=[];
   for(const x of selecoes){
    const motivo=elegibilidade(d,x.data);if(motivo)throw new Error(motivo);
    const disponivel=(await calcular(d,{categoria,data:x.data,unidade})).some(h=>h.hora===x.hora&&h.pares.some(p=>p.instrutorId===x.instrutorId&&p.veiculoId===x.veiculoId));if(!disponivel)throw new Error('Horário ou recursos indisponíveis. Nenhuma aula foi salva.');
    const em=new Date().toISOString(),aula={id:crypto.randomUUID(),alunoId:c.aluno.id,categoria,unidade,data:x.data,inicio:x.hora,fim:fimDaAula(x.hora),instrutorId:x.instrutorId,veiculoId:x.veiculoId,status:1,operacaoId,assinaturaPedido:assinatura,criadoEm:em,responsavel:'aluno-local-'+c.aluno.id,historico:[{status:1,em}],...(categoria==='D'?{localReal:localCategoriaD(x.data)}:categoria==='B'?{tipoCambio:c.aluno.tipoCambio,unidadeCarro:unidade,localReal:localCarro(c.aluno,x.data)}:{})};
    novos.push(aula);const atual=projetarContaRecepcao({...c,aulas:[...c.aulas,...novos]});d.aulas=atual.aulas;d.registros=atual.registros;
   }
   const restante=d.resumo.categorias[categoria].disponiveis-novos.length,aluno={...c.aluno,creditos:{...c.aluno.creditos,[categoria]:{...c.aluno.creditos?.[categoria],contratadas:d.credito.categorias[categoria],disponiveis:restante}}};
   const aulas=[...c.aulas,...novos],retorno=projetarContaRecepcao({...c,aluno,aulas}).aulas.filter(x=>novos.some(n=>n.id===x.id));return {aluno,aulas,retorno};
  },true);
 }
 async function salvarPreferencia(campo,valor){return operarPainelRecepcao(c=>({aluno:{...c.aluno,[campo]:typeof valor==='function'?valor(c):valor},aulas:c.aulas}),true);}
 async function documentoMedico(id,metadados=false){
  return operarPainelRecepcao(async c=>{
   const aula=c.aulas.find(a=>a.solicitacaoMedica?.id===id&&a.solicitacaoMedica.alunoId===c.aluno.id&&a.alunoId===c.aluno.id);
   if(!aula)throw new Error('Solicitação médica não autorizada para esta conta.');
   const referencia=aula.solicitacaoMedica.documento,d=await lerAtestado(referencia.id);
   if(!d||d.alunoId!==c.aluno.id||d.hash!==referencia.hash||d.arquivo.type!==referencia.tipo||d.arquivo.size!==referencia.tamanho)throw new Error('Documento original indisponível neste navegador.');
   return metadados?{nome:d.arquivo.name,tipo:d.arquivo.type,tamanho:d.arquivo.size}:d.arquivo;
  });
 }
 return {
  documentoMedico:id=>documentoMedico(id),metadadosDocumentoMedico:id=>documentoMedico(id,true),
  capacidades:{cancelamento:true,configuracaoRecursos:false},dadosAlunoLocal,carregar:dadosAlunoLocal,
  alterarSenhaLocal:alterarSenhaContaRecepcao,politicaSenhaLocal:{minimo:4,maximo:128},
  sessao:async()=>{const {aluno}=await consultarMinhaContaRecepcao();return {interface:'aluno',identificador:aluno.cpf,alunoId:aluno.id};},registros:async()=>(await dadosAlunoLocal()).registros,sair:sairContaRecepcao,
  disponibilidadeLocal:async q=>calcular(await dadosAlunoLocal(),q),
  consultarRecursosLocal:async q=>{
   const d=await dadosAlunoLocal();
   if(!d.categorias.includes(q.categoria))return {horarios:[],mensagem:'Categoria nao autorizada para esta matricula.',permiteAgendar:false,contagem:{instrutores:0,veiculos:0}};
   const consulta=await consultarRecursosLocais(d,q);
   const motivo=elegibilidade(d,q.data)||(!(d.resumo.categorias[q.categoria]?.disponiveis>0)?d.resumo.motivoBloqueio||'Voce nao possui aulas disponiveis para agendamento.':'');
   return {...consulta,permiteAgendar:!motivo,motivoElegibilidade:motivo};
  },
  async solicitarCancelamentoMedico({aulaId,arquivo,observacoes='',operacaoId}){
   let uploadNovo=false;
   try{return await operarPainelRecepcao(async c=>{
    const aula=c.aulas.find(a=>a.id===aulaId);if(!aula)throw new Error('Aula não autorizada.');
    const meta=await validarAtestado(arquivo),documento={...meta,id:operacaoId};
    const nova=solicitarMedico(c.aluno,aula,projetarContaRecepcao(c).registros,{id:operacaoId,documento,observacoes});
    if(nova===aula)return {aluno:c.aluno,aulas:c.aulas,retorno:aula.solicitacaoMedica};
    await guardarAtestado({id:operacaoId,alunoId:c.aluno.id,arquivo,hash:meta.hash});uploadNovo=true;
    return {aluno:c.aluno,aulas:c.aulas.map(a=>a.id===aulaId?nova:a),retorno:nova.solicitacaoMedica};
   },true);}catch(e){if(uploadNovo)await descartarUploadNaoSalvo(operacaoId);throw e;}
  },
  reservarAulasLocais,
  buscarAgendamentoAutomatico:async p=>{
   const d=await dadosAlunoLocal(),motivo=elegibilidade(d,hojeBrasil());
   if(motivo)throw new Error(motivo);
   return gerarPropostaAutomatica(d,p,calcular);
  },
  salvarPreferenciasAutomaticas:p=>salvarPreferencia('preferenciasAutomaticas',normalizarPreferenciasAutomaticas(p)),
  salvarAvisosAntecipacao:ativo=>salvarPreferencia('antecipacao',c=>preferenciaAntecipacao(ativo,c.aluno.antecipacao)),
  marcarMensagemLida:id=>operarPainelRecepcao(c=>({aluno:lerMensagemAluno(c.aluno,id),aulas:c.aulas}),true),
  cancelarReservaLocal:(id,motivo,{aceitarConsequencias=false}={})=>operarPainelRecepcao(c=>{
   const d=projetarContaRecepcao(c),a=d.aulas.find(x=>x.id===id);if(!a||a.status!==1||Date.parse(a.inicio)<=Date.now())throw new Error('Reserva não autorizada para cancelamento.');
   const cancelamento=criarCancelamento(a,d.registros,motivo,aceitarConsequencias),aulas=c.aulas.map(x=>x.id===id?{...x,status:2,cancelamento,motivoCancelamento:motivo,historico:[...(x.historico||[]),{status:2,em:cancelamento.em,motivo}]}:x),aluno=structuredClone(c.aluno);
   if(cancelamento.credito==='devolvido'){const k=a.categoria;aluno.creditos={...aluno.creditos,[k]:{...aluno.creditos?.[k],contratadas:d.credito.categorias[k],disponiveis:d.resumo.categorias[k].disponiveis+1}};}
   return {aluno,aulas};
  },true)
 };
}
