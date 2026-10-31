import {criarCancelamento,calcularPrazoCancelamento,POLITICA_CANCELAMENTO} from '../../aluno/js/domain/agendamentoAluno.js';
export const STATUS_MEDICO=Object.freeze({recepcao:'Aguardando análise da recepção',gerencia:'Encaminhado para análise da Gerência',aprovado:'Aprovado pela gerência',rejeitado:'Reprovado pela gerência'});
export function historicoMedicoParaExibicao(s,{aluno,responsaveis=[]}={}){
 const perfis={aluno:'Aluno',operador:'Recepção',gerencia:'Gerência',master:'Master'};
 const situacoes={...STATUS_MEDICO,reprovado:'Reprovado pela gerência',devolvido:'Crédito devolvido'};
 return (s.eventos||[]).map(e=>{
  const conta=responsaveis.find(c=>c.id===e.responsavel),doAluno=e.responsavel===aluno?.id||e.responsavel===s.alunoId||e.responsavel==='aluno:'+s.alunoId||!!aluno?.contaId&&e.responsavel===aluno.contaId;
  const perfil=e.perfil||(doAluno?'aluno':conta?.perfil)||(e.novo==='gerencia'?'operador':['aprovado','rejeitado','reprovado'].includes(e.novo)?'gerencia':null);
  const unidade=e.unidade||s.unidadeRecepcao;
  const nome=doAluno?aluno?.nome:conta?.nome;
  const unidadeLegivel=unidade==='Vila Velha'?'Centro de Vila Velha':unidade;
  const responsavel=nome?(perfis[perfil]||'Responsável')+' — '+nome:(perfis[perfil]||'Responsável registrado')+(unidadeLegivel?' — '+unidadeLegivel:'');
  let data='Data não informada';
  if(e.em&&Number.isFinite(Date.parse(e.em))){const partes=Object.fromEntries(new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(e.em)).map(p=>[p.type,p.value]));data=`${partes.day}/${partes.month}/${partes.year} às ${partes.hour}:${partes.minute}`;}
  return {data,responsavel,anterior:e.anterior?situacoes[e.anterior]||'Estado anterior preservado':'—',novo:situacoes[e.novo]||'Movimentação administrativa registrada',observacao:[/correção/i.test(e.acao||'')?'Decisão corrigida pelo Master':null,e.observacoes||e.acao].filter(Boolean).join(' · ')};
 });
}
const instanteValido=v=>typeof v==='string'&&Number.isFinite(Date.parse(v));
// Modelo de leitura. Nenhuma destas funções aprova, devolve ou altera saldo.
export function creditoDoAtestado(s){
 const d=s.devolucao,itens=d?.aulas,ids=s.aulaIds||[];
 const comprovada=s.status==='aprovado'&&d?.estado==='confirmada'&&typeof d.operacaoId==='string'&&d.operacaoId.trim()&&typeof d.responsavel==='string'&&d.responsavel.trim()&&instanteValido(d.em)&&Array.isArray(itens)&&itens.length>0&&new Set(itens.map(x=>x.aulaId)).size===itens.length&&itens.every(x=>ids.includes(x.aulaId)&&x.alunoId===s.alunoId&&x.categoria===s.categoria&&Number.isSafeInteger(x.quantidade)&&x.quantidade>0);
 const quantidade=comprovada?itens.reduce((total,x)=>total+x.quantidade,0):0;
 if(comprovada&&Number.isSafeInteger(s.creditosEnvolvidos)&&quantidade<=s.creditosEnvolvidos)return {texto:'Devolvido',quantidade,confirmado:true};
 return {texto:({recepcao:'Não devolvido — aguardando decisão',gerencia:'Não devolvido — aguardando decisão da gerência',aprovado:'Devolução pendente',rejeitado:'Não devolvido — solicitação rejeitada'})[s.status]||'Situação da devolução não informada',quantidade:0,confirmado:false};
}
export function etapasDoAtestado(s){
 const final=['aprovado','rejeitado'].includes(s.status),recepcaoConcluida=!!s.parecer?.responsavel&&instanteValido(s.parecer.em)||(s.eventos||[]).some(e=>e.novo==='gerencia'&&e.responsavel&&instanteValido(e.em));
 return [
  {titulo:'Atestado enviado',estado:s.documento?.id&&instanteValido(s.criadaEm)?'concluida':'pendente'},
  {titulo:'Análise da recepção',estado:recepcaoConcluida?'concluida':s.status==='recepcao'?'atual':'pendente'},
  {titulo:'Análise da gerência',estado:final?'concluida':s.status==='gerencia'?'atual':'pendente'},
  {titulo:final?(s.status==='aprovado'?'Resultado: aprovado':'Resultado: rejeitado'):'Resultado',estado:final?'concluida':'pendente'}
 ];
}
export function ultimaAtualizacaoAtestado(s){
 return [s.criadaEm,s.parecer?.em,s.devolucao?.em,...(s.eventos||[]).map(e=>e.em)].filter(instanteValido).sort((a,b)=>Date.parse(b)-Date.parse(a))[0]||null;
}
export const LIMITE_ATESTADO=5*1024*1024;
export async function validarAtestado(arquivo,limite=LIMITE_ATESTADO){
 if(!arquivo||typeof arquivo.arrayBuffer!=='function'||!Number.isSafeInteger(arquivo.size)||arquivo.size<1)throw new Error('Anexe um atestado JPG, PNG ou PDF.');
 if(arquivo.size>limite)throw new Error(`O arquivo deve ter até ${Math.round(limite/1024/1024)} MB.`);
 const ext=String(arquivo.name||'').split('.').at(-1).toLowerCase(),mime={jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',pdf:'application/pdf'}[ext];
 if(!mime||arquivo.type!==mime)throw new Error('Formato não permitido. Utilize JPG, JPEG, PNG ou PDF.');
 const bytes=new Uint8Array(await arquivo.arrayBuffer());
 const assinatura=mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255:mime==='image/png'?[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v):[37,80,68,70,45].every((v,i)=>bytes[i]===v);
 if(!assinatura)throw new Error('O conteúdo do arquivo não corresponde ao formato informado.');
 const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(x=>x.toString(16).padStart(2,'0')).join('');
 return {tipo:mime,tamanho:arquivo.size,hash};
}
export function solicitarMedico(aluno,aula,registros,{id,documento,observacoes=''},agora=new Date()){
 if(aula?.alunoId!==aluno.id)throw new Error('Aula não autorizada para este aluno.');
 if(aula.solicitacaoMedica){if(aula.solicitacaoMedica.id===id&&aula.solicitacaoMedica.documento.hash===documento?.hash&&typeof observacoes==='string'&&aula.solicitacaoMedica.observacoes===observacoes.trim())return aula;throw new Error('Esta aula já possui solicitação médica.');}
 const inicio=aula.data+'T'+aula.inicio+':00-03:00',projecao={...aula,inicio};
 const posteriorAdministrativo=aula.status===2&&aula.cancelamento?.origem==='recepcao'&&aula.cancelamento.credito==='retido'&&Date.parse(aula.cancelamento.em)<=agora.getTime()&&agora.getTime()-Date.parse(aula.cancelamento.em)<=POLITICA_CANCELAMENTO.horasAtestado*3600000;
 if(!posteriorAdministrativo&&(aula.status!==1||Date.parse(inicio)<=agora.getTime()))throw new Error('Somente aulas futuras confirmadas ou cancelamentos administrativos retidos dentro do prazo permitem esta solicitação.');
 if(calcularPrazoCancelamento(projecao,registros,agora).dentroPrazo)throw new Error('Esta aula permite cancelamento normal com devolução de crédito, sem atestado.');
 if(!/^[a-zA-Z0-9-]{8,80}$/.test(id||'')||documento?.id!==id||!['image/jpeg','image/png','application/pdf'].includes(documento?.tipo)||!/^[a-f0-9]{64}$/.test(documento?.hash||'')||!(documento?.tamanho>0&&documento.tamanho<=LIMITE_ATESTADO))throw new Error('Documento validado obrigatório.');
 if(typeof observacoes!=='string'||observacoes.length>2000)throw new Error('Utilize até 2000 caracteres nas observações.');
 const em=agora.toISOString(),cancelamento=posteriorAdministrativo?{...aula.cancelamento,motivoId:'saude',frequencia:'justificativa_pendente',justificativa:{estado:'aguardando_apresentacao',prazoApresentacao:new Date(Date.parse(aula.cancelamento.em)+72*3600000).toISOString(),resultado:null}}:criarCancelamento(projecao,registros,'saude',true,agora);
 const evento={id:id+'-envio',em,responsavel:'aluno:'+aluno.id,perfil:'aluno',anterior:null,novo:'recepcao',acao:'Atestado anexado; solicitação recebida pela recepção; aula cancelada; crédito retido.'};
 const solicitacaoMedica={id,alunoId:aluno.id,aulaIds:[aula.id],categoria:aula.categoria,creditosEnvolvidos:1,unidadeRecepcao:aluno.unidadePrincipal||aluno.unidade,criadaEm:em,status:'recepcao',documento:{...documento},observacoes:observacoes.trim(),eventos:[evento],devolucao:{estado:'pendente_decisao',aulas:[],operacaoId:null}};
 return {...aula,status:2,motivoCancelamento:'Cancelamento por solicitação médica',cancelamento:{...cancelamento,credito:'retido',justificativa:{...cancelamento.justificativa,estado:'aguardando_analise',solicitacaoId:id}},solicitacaoMedica,historico:[...(aula.historico||[]),{status:2,em,motivo:'Solicitação médica enviada; crédito retido.',responsavel:evento.responsavel,solicitacaoId:id}]};
}
export function encaminharMedico(aula,operador,parecer,agora=new Date()){
 const s=aula.solicitacaoMedica;
 if(![1,2,3].includes(operador.nivel)||!operador.permissoes?.includes('verificar'))throw new Error('Permissão insuficiente para encaminhar.');
 if(!s||s.status!=='recepcao')throw new Error('Somente solicitações aguardando análise podem ser encaminhadas.');
 if(typeof parecer!=='string'||parecer.trim().length<5||parecer.length>2000)throw new Error('Registre um parecer de 5 a 2000 caracteres.');
 const em=agora.toISOString(),evento={id:s.id+'-encaminhamento',em,responsavel:operador.id,perfil:operador.perfil||({1:'operador',2:'gerencia',3:'master'})[operador.nivel],anterior:s.status,novo:'gerencia',acao:'Parecer registrado e solicitação encaminhada para gerência.',observacoes:parecer.trim()};
 return {...aula,solicitacaoMedica:{...s,status:'gerencia',parecer:{texto:parecer.trim(),em,responsavel:operador.id},eventos:[...s.eventos,evento]}};
}
