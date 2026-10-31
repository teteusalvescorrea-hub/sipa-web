import {exigirCapacidade,escopoPermitido} from './permissoesAdministrativas.js';
import {auditar} from './auditoria.js';
import {resumirCreditosRecepcao} from '../../aluno/js/domain/creditosRecepcao.js';
import {agendarAula,principal,unidade} from '../../nivel-1-operador/js/dominioOperador.js';
import {agoraBrasil,dataValida} from './calendario.js';
import {UNIDADES_INSTITUCIONAIS} from './catalogoUnidades.js';
import {exigirAdministrativoAluno} from './escopoAlunoAdministrativo.js';
const motivo=v=>{if(typeof v!=='string'||v.trim().length<5||v.length>2000)throw new Error('Informe uma justificativa de 5 a 2000 caracteres.');return v.trim();};
function escopo(e,op,id){const a=e.alunos.find(a=>a.id===id);if(!a||!escopoPermitido(op,principal(a)))throw new Error('Aluno fora do escopo autorizado.');return a;}
function saldo(e,a,categoria){return resumirCreditosRecepcao(a,e.aulas.filter(x=>x.alunoId===a.id).map(x=>({...x,inicio:x.data+'T'+x.inicio+':00-03:00'}))).categorias[categoria]?.saldoLiberado;}
function moverSaldo(e,a,categoria,delta){const n=saldo(e,a,categoria),teto=a.aulasAdquiridas?.[categoria]??a.creditos?.[categoria]?.contratadas;if(!Number.isSafeInteger(n)||n+delta<0||!Number.isSafeInteger(teto)||n+delta>teto)throw new Error('Saldo inconsistente ou crédito já utilizado. Operação bloqueada para conciliação.');return {...e,alunos:e.alunos.map(x=>x.id===a.id?{...x,creditos:{...x.creditos,[categoria]:{...x.creditos?.[categoria],disponiveis:n+delta}}}:x)};}
export function decidirAtestado(e,op,id,{resultado,justificativa,confirmado,operacaoId},agora=new Date()){
 exigirCapacidade(op,'decidir-atestado');const aula=e.aulas.find(a=>a.solicitacaoMedica?.id===id),s=aula?.solicitacaoMedica;if(!s)throw new Error('Solicitação não encontrada.');const {aluno:a}=exigirAdministrativoAluno(e,op,aula);
 if(!['aprovado','rejeitado'].includes(resultado)||confirmado!==true||typeof operacaoId!=='string'||operacaoId.length<8)throw new Error('Confirme a decisão com identificador válido.');const nota=motivo(justificativa);
 if(s.decisoes?.some(d=>d.operacaoId===operacaoId)){if(s.decisoes.find(d=>d.operacaoId===operacaoId).resultado!==resultado)throw new Error('Operação já utilizada.');return e;}
 const final=['aprovado','rejeitado'].includes(s.status);if(final)exigirCapacidade(op,'corrigir-decisao',3);else if(s.status!=='gerencia')throw new Error('A solicitação deve ser encaminhada pela recepção antes da decisão.');
 if(!s.documento?.id||aula.status!==2||!['retido','devolvido'].includes(aula.cancelamento?.credito))throw new Error('Solicitação ou cancelamento incompatível.');
 let n=e;const devolver=resultado==='aprovado',jaDevolvido=aula.cancelamento.credito==='devolvido';if(devolver!==jaDevolvido)n=moverSaldo(e,a,aula.categoria,devolver?1:-1);
 const em=agora.toISOString(),decisao={id:crypto.randomUUID(),operacaoId,resultado,anterior:s.status,responsavel:op.id,perfil:op.perfil,em,observacoes:nota},devolucao=devolver?{estado:'confirmada',operacaoId,responsavel:op.id,em,aulas:[{aulaId:aula.id,alunoId:a.id,categoria:aula.categoria,quantidade:1}]}:{estado:'nao_autorizada',operacaoId,responsavel:op.id,em,aulas:[]};
 n={...n,aulas:n.aulas.map(x=>x.id===aula.id?{...x,cancelamento:{...x.cancelamento,credito:devolver?'devolvido':'retido'},solicitacaoMedica:{...s,status:resultado,devolucao,decisoes:[...(s.decisoes||[]),{...decisao,devolucaoAnterior:s.devolucao}],eventos:[...(s.eventos||[]),{...decisao,novo:resultado,acao:final?'Correção administrativa da decisão':'Decisão da gerência'}]},historico:[...(x.historico||[]),{...decisao,acao:'decisao-atestado',solicitacaoId:id}]}:x),alunos:n.alunos.map(x=>x.id===a.id?{...x,historico:[...(x.historico||[]),{...decisao,tipo:'decisao-atestado',referencia:id,depois:resultado+(devolver?' · crédito devolvido':' · crédito retido')}]}:x)};
 return auditar(n,op,final?'correcao-atestado':'decisao-atestado',id,s,{resultado,devolucao},nota,agora);
}
export const MOTIVOS_ADMIN=['Manutenção preventiva','Manutenção emergencial','Agendamento de prova','Ausência do instrutor','Outro motivo'];
export function cancelarExcepcional(e,op,id,dados,agora=new Date()){
 exigirCapacidade(op,'excecao-agenda',3);const nota=motivo(dados.justificativa),aula=e.aulas.find(a=>a.id===id);if(!aula||![1,3].includes(aula.status)||!MOTIVOS_ADMIN.includes(dados.motivo)||!['retido','devolvido'].includes(dados.credito)||dados.confirmado!==true)throw new Error('Confirme um cancelamento administrativo válido. Aulas concluídas não podem ser canceladas.');
 if(aula.status===3&&aula.data+'T'+aula.inicio+':00'<=agoraBrasil(agora))throw new Error('Reserva pendente expirada: faça a conciliação antes de alterar seu crédito.');
 const aluno=escopo(e,op,aula.alunoId);let n=e;if(dados.credito==='devolvido')n=moverSaldo(e,aluno,aula.categoria,1);const em=agora.toISOString(),evento={id:crypto.randomUUID(),em,autor:op.id,perfil:op.perfil,status:2,acao:'cancelamento-excepcional',motivo:dados.motivo,observacoes:nota,credito:dados.credito};
 n={...n,aulas:n.aulas.map(a=>a.id===id?{...a,status:2,motivoCancelamento:dados.motivo,cancelamento:{...a.cancelamento,em,origem:'master',motivoId:'administrativo',motivo:dados.motivo,credito:dados.credito,observacoes:nota,responsavel:op.id},historico:[...(a.historico||[]),evento]}:a),alunos:n.alunos.map(a=>a.id===aluno.id?{...a,avisosInternos:[...(a.avisosInternos||[]),{id:evento.id,em,texto:'Aula de '+aula.data.split('-').reverse().join('/')+' às '+aula.inicio+' cancelada: '+dados.motivo+'. Consulte os horários para novo agendamento.'}],historico:[...(a.historico||[]),{...evento,tipo:'cancelamento-administrativo',referencia:id,depois:dados.motivo}]}:a)};
 return auditar(n,op,'cancelamento-excepcional',id,aula,n.aulas.find(a=>a.id===id),nota,agora);
}
export function excecaoAgenda(e,op,dados,agora=new Date()){
 if(dados.acao&&!['incluir','ajustar'].includes(dados.acao)||dados.acao==='ajustar'&&!dados.aulaId)throw new Error('Tipo de exceção inválido ou reserva não selecionada.');
 exigirCapacidade(op,'excecao-agenda',3);const nota=motivo(dados.justificativa);if(dados.confirmado!==true)throw new Error('Confirme a exceção e suas consequências.');const aluno=escopo(e,op,dados.alunoId),id=dados.operacaoId;if(!id)throw new Error('Identificador da operação obrigatório.');if(e.excecoesAgenda?.some(x=>x.id===id))return e;
 const anterior=dados.aulaId&&e.aulas.find(a=>a.id===dados.aulaId);if(dados.aulaId&&(!anterior||anterior.alunoId!==aluno.id||![1,3].includes(anterior.status)||anterior.data+'T'+anterior.inicio+':00'<=agoraBrasil(agora)))throw new Error('Somente reservas futuras ativas podem ser ajustadas.');
 let n=e,pendencia=null;
 try{
  const contexto={...op,unidade:aluno.categoria==='D'?'Cobilândia':aluno.unidadeCarro||principal(aluno)},base={...e,aulas:e.aulas.filter(a=>a.id!==anterior?.id),alunos:e.alunos.map(a=>a.id===aluno.id?{...a,bloqueioAdministrativo:{...a.bloqueioAdministrativo,ativo:false},bloqueioAgendamento:{...a.bloqueioAgendamento,ativo:false},...(anterior?{creditos:{...a.creditos,[anterior.categoria]:{...a.creditos?.[anterior.categoria],disponiveis:saldo(e,a,anterior.categoria)+1}}}:{})}:a)};
  const reservado=agendarAula(base,contexto,dados,anterior?.id||'excecao-'+id,agora),nova=reservado.aulas.at(-1);n={...e,alunos:reservado.alunos.map(a=>a.id===aluno.id?{...e.alunos.find(x=>x.id===a.id),creditos:a.creditos}:a),aulas:[...e.aulas.filter(a=>a.id!==anterior?.id),{...nova,historico:[...(anterior?.historico||[]),{em:agora.toISOString(),acao:'excecao-autorizada',autor:op.id,justificativa:nota,antes:anterior||null}]}]};
 }catch(erro){pendencia=erro.message;}
 if(dados.pendenciaId){const p=e.excecoesAgenda?.find(x=>x.id===dados.pendenciaId);if(p){exigirAdministrativoAluno(e,op,p);if((p.alunoId||p.dados?.alunoId)!==aluno.id)throw new Error('A pendência pertence a outro aluno.');}}
 if(dados.pendenciaId&&!e.excecoesAgenda?.some(x=>x.id===dados.pendenciaId&&x.status==='pendente'))throw new Error('Pendência inexistente ou já resolvida.');
 const evento={id,em:agora.toISOString(),responsavel:op.id,alunoId:aluno.id,unidade:principal(aluno),dados:{...dados},justificativa:nota,status:pendencia?'pendente':'executada',bloqueio:pendencia};n={...n,excecoesAgenda:[...(n.excecoesAgenda||[]).map(x=>!pendencia&&x.id===dados.pendenciaId?{...x,status:'resolvida',resolvidaPor:id,resolvidaEm:agora.toISOString()}:x),evento]};return auditar(n,op,'excecao-agenda',id,anterior||null,evento,nota,agora);
}
export function corrigirAluno(e,op,id,dados,justificativa,agora=new Date()){
 exigirCapacidade(op,'corrigir-registro');const a=escopo(e,op,id),nota=motivo(justificativa),permitidos=['unidadePrincipal','situacao','bloqueioAdministrativo'];if(Object.keys(dados).some(k=>!permitidos.includes(k)))throw new Error('Campo não autorizado neste comando.');
 if(dados.unidadePrincipal&&(!UNIDADES_INSTITUCIONAIS.some(u=>u.id===dados.unidadePrincipal)||!escopoPermitido(op,dados.unidadePrincipal)))throw new Error('Unidade fora do escopo.');if(dados.situacao&&!['Pendente','Regular','Inativo'].includes(dados.situacao))throw new Error('Situação inválida.');if(dados.bloqueioAdministrativo&&typeof dados.bloqueioAdministrativo.ativo!=='boolean')throw new Error('Bloqueio inválido.');
 const em=agora.toISOString(),novo={...a,...dados,...(dados.unidadePrincipal?{unidade:dados.unidadePrincipal}:{}),historico:[...(a.historico||[]),{id:crypto.randomUUID(),tipo:'correcao-administrativa',em,responsavel:op.id,antes:dadosAuditados(a,dados),depois:dados,justificativa:nota}]};return auditar({...e,alunos:e.alunos.map(x=>x.id===id?novo:x)},op,'correcao-aluno',id,a,novo,nota,agora);
}
const dadosAuditados=(a,d)=>Object.fromEntries(Object.keys(d).map(k=>[k,a[k]??null]));
export function situacaoRecurso(e,op,id,ativo,justificativa,agora=new Date()){
 exigirCapacidade(op,'gerenciar-situacao');const nota=motivo(justificativa),r=e.recursos.find(r=>r.id===id);if(!r||r.excluidoEm||!escopoPermitido(op,unidade(r.unidade))||typeof ativo!=='boolean')throw new Error('Recurso fora do escopo.');if(!ativo&&e.aulas.some(a=>[1,3].includes(a.status)&&(a.instrutorId===id||a.veiculoId===id)&&a.data+'T'+a.inicio+':00'>agoraBrasil(agora)))throw new Error('Realoque ou cancele as aulas futuras antes de desativar o recurso.');return auditar({...e,recursos:e.recursos.map(x=>x.id===id?{...x,ativo}:x)},op,'situacao-recurso',id,{ativo:r.ativo},{ativo},nota,agora);
}
export function configurarUnidade(e,op,id,{fechada,data,justificativa},agora=new Date()){
 exigirCapacidade(op,'configurar',3);const nota=motivo(justificativa);if(!UNIDADES_INSTITUCIONAIS.some(u=>u.id===id)||!escopoPermitido(op,id)||!dataValida(data)||data<agoraBrasil(agora).slice(0,10)||typeof fechada!=='boolean')throw new Error('Informe unidade e data válidas, sem alterar o passado.');
 if(fechada&&e.aulas.some(a=>a.unidade===id&&a.data===data&&[1,3].includes(a.status)))throw new Error('Existem reservas ativas. Resolva os agendamentos antes de fechar a operação.');
 const recursos=e.recursos.map(r=>r.unidade===id?{...r,datasBloqueadas:fechada?[...new Set([...(r.datasBloqueadas||[]),data])]:(r.datasBloqueadas||[]).filter(d=>d!==data)}:r);return auditar({...e,recursos,configuracoesUnidades:{...e.configuracoesUnidades,[id]:{...e.configuracoesUnidades?.[id],[data]:fechada?'fechado':'aberto'}}},op,'configuracao-unidade',id,e.configuracoesUnidades?.[id],{data,fechada},nota,agora);
}
