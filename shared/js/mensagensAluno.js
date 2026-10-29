export function mensagensDoAluno(aluno){return (aluno?.avisosInternos||[]).map((m,i)=>({...m,id:m.id||m.ofertaId||'aviso-anterior-'+i,assunto:m.assunto||'Aviso administrativo',texto:m.texto||'',lidaEm:aluno.leiturasMensagens?.[m.id||m.ofertaId||'aviso-anterior-'+i]||m.lidaEm||null})).sort((a,b)=>String(b.em||'').localeCompare(String(a.em||'')));}
export function lerMensagemAluno(aluno,id,agora=new Date()){
 if(!mensagensDoAluno(aluno).some(m=>m.id===id))throw new Error('Mensagem indisponível para esta conta.');
 return {...aluno,leiturasMensagens:{...aluno.leiturasMensagens,[id]:aluno.leiturasMensagens?.[id]||agora.toISOString()}};
}
