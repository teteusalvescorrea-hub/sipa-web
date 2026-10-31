// Adaptador local: exige sessão verificada em cada comando. Não substitui a
// autorização do servidor nem habilita exclusões no ambiente integrado.
import {exigirAdministrativo,transacaoAcessos} from './autenticacao.js';
import {exigirCapacidade} from '../shared/js/permissoesAdministrativas.js';
import {auditar} from '../shared/js/auditoria.js';
const CHAVE='sipa.operador.demo.v2';
const referencia=(valor,id)=>valor===id||!!valor&&typeof valor==='object'&&Object.values(valor).some(v=>referencia(v,id));
function dependencias(e,auth,tipo,r){
 const fora={...e};delete fora[tipo==='aluno'?'alunos':tipo==='conta'?'contasAlunos':'recursos'];
 const outros=(tipo==='aluno'?e.alunos:tipo==='conta'?e.contasAlunos:e.recursos)||[];
 return !!r.historico?.length||!!r.financeiro||referencia(fora,r.id)||outros.some(x=>x.id!==r.id&&referencia(x,r.id))||auth.contas.some(c=>c.id!==r.id&&referencia(c,r.id))||referencia(auth.historicoAcessos||[],r.id)||
  (tipo==='aluno'&&(!!r.historico?.length||!!r.provas?.length||!!r.financeiro||Object.values(r.aulasAdquiridas||{}).some(Number)||Object.values(r.creditos||{}).some(v=>Object.values(v||{}).some(Number))))||
  (tipo==='conta'&&!!(r.alunoId||r.recursoId));
}
export async function excluirCadastro({tipo,id,confirmado,justificativa}={}){
 const inicial=await exigirAdministrativo(3);exigirCapacidade(inicial,'excluir-cadastro',3);
 if(!['aluno','instrutor','veiculo','conta'].includes(tipo)||typeof id!=='string'||!id)throw new Error('Cadastro inválido.');
 if(confirmado!==true||typeof justificativa!=='string'||justificativa.trim().length<5)throw new Error('Confirme explicitamente e informe a justificativa.');
 return transacaoAcessos(async auth=>{
  const op=await exigirAdministrativo(3);exigirCapacidade(op,'excluir-cadastro',3);if(op.id!==inicial.id)throw new Error('A sessão mudou.');
  let e=JSON.parse(localStorage.getItem(CHAVE)||'{"versao":2,"alunos":[],"recursos":[],"aulas":[]}');
  const colecao=tipo==='aluno'?e.alunos:tipo==='conta'?[...auth.contas,...(e.contasAlunos||[])]:e.recursos;
  const encontrados=colecao.filter(r=>r.id===id),r=encontrados[0];if(encontrados.length!==1||!r||r.excluidoEm||tipo==='instrutor'&&r.tipo!=='Instrutores'||tipo==='veiculo'&&r.tipo!=='Veículos')throw new Error('Cadastro inexistente, ambíguo ou já excluído.');
  const contas=tipo==='conta'?[r]:[...auth.contas,...(e.contasAlunos||[])].filter(c=>tipo==='aluno'?c.alunoId===id:c.recursoId===id);
  if(contas.some(c=>c.id===op.id))throw new Error('Não é permitido excluir a própria conta durante a sessão ativa.');
  const ids=new Set(contas.map(c=>c.id)),em=new Date().toISOString(),nota=justificativa.trim();
  const logica=dependencias(e,auth,tipo,r),exclusao={excluidoEm:em,excluidoPor:op.id,motivoExclusao:nota};
  const removerCredencial=c=>{const {hash,sal,...resto}=c;return {...resto,...exclusao,ativa:false,versaoSenha:(c.versaoSenha||0)+1};};
  auth.contas=auth.contas.flatMap(c=>!ids.has(c.id)?[c]:tipo==='conta'&&!logica?[]:[removerCredencial(c)]);
  e.contasAlunos=(e.contasAlunos||[]).flatMap(c=>!ids.has(c.id)?[c]:tipo==='conta'&&!logica?[]:[removerCredencial(c)]);
  auth.sessoes=(auth.sessoes||[]).filter(s=>!ids.has(s.contaId));e.sessoesAlunos=(e.sessoesAlunos||[]).filter(s=>!ids.has(s.contaId));
  if(tipo!=='conta'){const chave=tipo==='aluno'?'alunos':'recursos';e[chave]=e[chave].flatMap(x=>x.id!==id?[x]:logica?[{...x,...exclusao,ativo:false,disponivel:false}]:[]);}
  // Auditoria não inclui credenciais nem cópias de documentos pessoais.
  const resumo={tipoCadastro:tipo,identificador:id,modalidade:logica?'logica':'definitiva',contasRevogadas:[...ids]};
  e=auditar(e,op,'exclusao-'+tipo,id,null,resumo,nota,new Date(em));
  auth.historicoAcessos=[...(auth.historicoAcessos||[]),{id:crypto.randomUUID(),em,responsavel:op.id,responsavelNome:op.nome,contaNome:r.nome||e.alunos.find(a=>a.id===r.alunoId)?.nome,contaPerfil:r.perfil||tipo,unidadeAlvo:r.unidade,perfil:op.perfil,acao:'exclusao-'+tipo,contaId:tipo==='conta'?id:undefined,referencia:id,...resumo,justificativa:nota}];
  localStorage.setItem(CHAVE,JSON.stringify(e));return auth;
 });
}
