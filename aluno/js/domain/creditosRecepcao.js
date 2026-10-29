import {progressoPorCategoria} from './dominioAluno.js';

// Cadastro nao comprova pagamento. Apenas bloqueios explicitamente registrados
// podem impedir o uso das aulas adquiridas; Pendente inicial nao e liberacao.
export function motivoBloqueioCreditos(aluno){
 if(aluno.bloqueioAdministrativo?.ativo===true||aluno.bloqueioAgendamento?.ativo===true)return 'Agendamento bloqueado administrativamente. Consulte a recepção.';
 if(aluno.financeiro==='Em atraso'||(aluno.financeiro==='Pendente'&&aluno.verificacaoFinanceira))return 'Situação financeira com bloqueio registrado. Consulte a recepção.';
 return '';
}
// Projecao sem migracao: saldo liquido ja debitado nunca sofre segundo desconto.
export function resumirCreditosRecepcao(aluno,aulas){
 const categorias=['A','B','D'].filter(k=>aluno.categoria.includes(k));
 const totais=Object.fromEntries(categorias.map(k=>[k,aluno.aulasAdquiridas?.[k]??aluno.creditos?.[k]?.contratadas??null]));
 const resumo=progressoPorCategoria({categorias:totais},aulas);
 const bloqueio=motivoBloqueioCreditos(aluno);
 for(const k of categorias){
  const c=resumo.categorias[k],registro=aluno.creditos?.[k];
  const capacidade=totais[k]??(Number.isFinite(registro?.disponiveis)?registro.disponiveis+c.consumidas:0);
  const restante=Math.max(0,capacidade-c.consumidas);
  const liquido=Number.isFinite(registro?.disponiveis)?registro.disponiveis:restante;
  c.total=totais[k];c.adquiridas=totais[k];c.liberadas=capacidade;
  c.saldoLiberado=resumo.incompletas?0:Math.max(0,Math.min(liquido,restante));
  c.disponiveis=bloqueio?0:c.saldoLiberado;
 }
 if(categorias.some(k=>totais[k]===null)){resumo.total=null;resumo.percentual=null;}
 resumo.motivoBloqueio=bloqueio||(categorias.some(k=>resumo.categorias[k].disponiveis>0)?'':'Saldo disponível esgotado ou bloqueado. Consulte suas reservas e a recepção.');
 return resumo;
}
