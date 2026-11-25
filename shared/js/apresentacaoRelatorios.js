import {compararTextos} from './ordenacaoTabela.js';
// Apresentação apenas: não modifica filtros, registros ou cálculos do relatório.
export function dataRelatorio(valor){
 const s=String(valor??'');
 if(/^\d{4}-\d{2}-\d{2}$/.test(s))return s.slice(8,10)+'/'+s.slice(5,7)+'/'+s.slice(0,4);
 if(/^\d{4}-\d{2}-\d{2}T/.test(s)&&!Number.isNaN(Date.parse(s)))return new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',hour12:false}).format(new Date(s)).replace(',', '');
 return s;
}
export const ROTULOS_RESUMO={excecoes:'Operações excepcionais',agendadas:'Aulas agendadas',realizadas:'Aulas realizadas',presencas:'Presenças',faltas:'Faltas',canceladas:'Aulas canceladas',elegiveis:'Horários elegíveis',ocupados:'Horários ocupados',disponiveis:'Horários disponíveis',ocupacao:'Taxa de ocupação',solicitacoes:'Solicitações',pendentes:'Pendentes',aprovadas:'Aprovadas',reprovadas:'Reprovadas',creditosDevolvidos:'Créditos devolvidos',naoDevolvidos:'Sem devolução',remuneraveis:'Aulas remuneráveis',reposicoesDeAtestado:'Reposições de atestado (A.T.)',faltasAbonadas:'Faltas com atestado aprovado'};
export const valorIndicador=(k,v)=>v==null?'Sem horários disponíveis no período':k==='ocupacao'?new Intl.NumberFormat('pt-BR',{maximumFractionDigits:1}).format(v)+'%':String(v);
const situacoes={recepcao:'Em análise pela recepção',gerencia:'Em análise pela gerência',aprovado:'Aprovada',rejeitado:'Reprovada',pendente:'Pendente',executada:'Executada',devolvido:'Devolvido',retido:'Retido','decisao-atestado':'Decisão de atestado','correcao-atestado':'Correção de atestado','cancelamento-excepcional':'Cancelamento excepcional','excecao-agenda':'Exceção de agenda','correcao-aluno':'Correção cadastral','situacao-recurso':'Situação do recurso','configuracao-unidade':'Configuração de unidade'};
// 11/11/2026: tabelas da auditoria por extenso.
const TABELAS_AUDITORIA={USUARIOS:'Conta',MEMBROS_EQUIPE:'Equipe',MEMBROS_EQUIPE_UNIDADES:'Unidades da equipe',PAPEIS:'Papéis',PAPEIS_TELAS:'Permissões do papel',ALUNOS:'Aluno',ALUNOS_MATRICULAS:'Matrícula',ALUNOS_UNIDADES:'Unidade do aluno',ALUNOS_EXAMES:'Exame',ALUNOS_DOCUMENTOS:'Documento do aluno',PROVAS_TENTATIVAS:'Prova',CONTRATACOES:'Aulas adquiridas',AGENDAMENTOS:'Aula',SOLICITACOES_MEDICAS:'Atestado',VEICULOS:'Veículo',MOTORISTAS:'Instrutor',MOTORISTAS_AUTOESCOLAS:'Vínculo do instrutor',PACOTES:'Pacote',DOCUMENTOS:'Arquivo',MENSAGENS:'Aviso',CONVERSAS:'Conversa',CONVERSAS_MENSAGENS:'Mensagem',UNIDADES_EXCECOES_CALENDARIO:'Calendário da unidade',DIAS_PROVA:'Dia de prova',INTERESSES_ANTECIPACAO:'Interesse de antecipação'};
export function apresentarRelatorio(r){return {...r,linhas:r.linhas.map(l=>l.map((v,i)=>{
 const c=r.colunas[i];if(['Data','Cancelada em','Solicitação'].includes(c)||c==='Agrupamento'&&r.filtros.tipo==='dias')return dataRelatorio(v);
 if(c==='Responsável')return r.nomes?.[v]||(v?(/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(String(v))?'Responsável registrado (nome indisponível)':String(v)):'Não informado');
 if(c==='Tabela')return TABELAS_AUDITORIA[v]||String(v??'');
 if(c==='Referência')return r.nomes?.[v]||'Registro administrativo vinculado';
 if(['Situação','Crédito','Tipo / situação'].includes(c))return situacoes[v]||String(v??'').replace(/[-_]/g,' ');
 return String(v??'');
}))};}
// O relatório na ordem escolhida. Compara o texto exibido e reordena as linhas originais, porque o Excel usa as duas pela mesma posição.
export function ordenarRelatorio(r,{coluna=null,direcao=1}={}){
 if(coluna==null)return r;
 const v=apresentarRelatorio(r).linhas;
 return {...r,linhas:r.linhas.map((_,i)=>i).sort((a,b)=>compararTextos(v[a][coluna],v[b][coluna])*direcao).map(i=>r.linhas[i])};
}
export function metadadosRelatorio(form,titulo,unidadePadrao){
 const selecionado=n=>{const e=form.elements[n];return e?.selectedOptions?.[0]?.textContent||e?.value||'';};
 const filtros=[['categoria','Categoria'],['alunoId','Aluno'],['tipoCnh','Tipo de CNH'],['instrutorId','Instrutor'],['veiculoId','Veículo'],['statusVeiculo','Situação do veículo'],['horaInicio','Horário inicial'],['horaFim','Horário final'],['status','Situação']].filter(([n])=>form.elements[n]?.value).map(([n,l])=>[l,selecionado(n)]);
 return {titulo,unidade:form.elements.unidade.value?selecionado('unidade'):unidadePadrao,filtros};
}
