// Apresentação apenas: não modifica filtros, registros ou cálculos do relatório.
export function dataRelatorio(valor){
 const s=String(valor??'');
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
 if(/^\d{4}-\d{2}-\d{2}T/.test(s)&&!Number.isNaN(Date.parse(s)))return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s)).replace(',', '');
 return s;
}
export const ROTULOS_RESUMO={agendadas:'Aulas agendadas',realizadas:'Aulas realizadas',presencas:'Presenças',faltas:'Faltas',canceladas:'Aulas canceladas',elegiveis:'Horários elegíveis',ocupados:'Horários ocupados',disponiveis:'Horários disponíveis',ocupacao:'Taxa de ocupação',solicitacoes:'Solicitações',pendentes:'Pendentes',aprovadas:'Aprovadas',reprovadas:'Reprovadas',creditosDevolvidos:'Créditos devolvidos',naoDevolvidos:'Sem devolução'};
export const valorIndicador=(k,v)=>v==null?'Sem base elegível':k==='ocupacao'?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v)+'%':String(v);
const situacoes={recepcao:'Em análise pela recepção',gerencia:'Em análise pela gerência',aprovado:'Aprovada',rejeitado:'Reprovada',pendente:'Pendente',executada:'Executada',devolvido:'Devolvido',retido:'Retido','decisao-atestado':'Decisão de atestado','correcao-atestado':'Correção de atestado','cancelamento-excepcional':'Cancelamento excepcional','excecao-agenda':'Exceção de agenda','correcao-aluno':'Correção cadastral','situacao-recurso':'Situação do recurso','configuracao-unidade':'Configuração de unidade'};
export function apresentarRelatorio(r){return {...r,linhas:r.linhas.map(l=>l.map((v,i)=>{
 const c=r.colunas[i];if(['Data','Cancelada em','Solicitação'].includes(c)||c==='Agrupamento'&&r.filtros.tipo==='dias')return dataRelatorio(v);
 if(c==='Responsável')return r.nomes?.[v]|| (v?'Responsável registrado (nome indisponível)':'Não informado');
 if(c==='Referência')return r.nomes?.[v]||'Registro administrativo vinculado';
 if(['Situação','Crédito','Tipo / situação'].includes(c))return situacoes[v]||String(v??'').replace(/[-_]/g,' ');
 return String(v??'');
}))};}
export function metadadosRelatorio(form,titulo,unidadePadrao){
 const selecionado=n=>{const e=form.elements[n];return e?.selectedOptions?.[0]?.textContent||e?.value||'';};
 const filtros=[['categoria','Categoria'],['alunoId','Aluno'],['instrutorId','Instrutor'],['veiculoId','Veículo'],['horaInicio','Horário inicial'],['horaFim','Horário final'],['status','Situação']].filter(([n])=>form.elements[n]?.value).map(([n,l])=>[l,selecionado(n)]);
 return {titulo,unidade:form.elements.unidade.value?selecionado('unidade'):unidadePadrao,filtros};
}
