// Acompanhamento administrativo. Ausência, pendência ou resultado destes campos
// não condicionam a consulta/reserva de horários. Não representa consulta ao DETRAN.
export const ETAPAS = Object.freeze({medico:'Exame médico',psicologico:'Avaliação psicológica',teorica:'Prova teórica',ladv:'LADV',pratica:'Liberação para aulas práticas'});

export function etapaParaAgendamento(aluno,tipo){
 if(['medico','psicologico'].includes(tipo)){
  const atual=aluno.examesAdministrativos?.[tipo]||aluno.acompanhamentoExames?.[tipo];
  if(atual)return atual;
 }
 if(tipo==='teorica'){
  const tentativas=(aluno.tentativasProvas||[]).filter(p=>p.tipo==='teorica'&&!p.arquivada);
  if(tentativas.length)return tentativas.at(-1);
  if(aluno.acompanhamentoExames?.teorica)return aluno.acompanhamentoExames.teorica;
 }
 return aluno.etapas?.[tipo]||aluno.exames?.[tipo==='psicologico'?'psicotecnico':tipo]||null;
}

export function pendenciasAgendamento(aluno,data){
 const requisitos={...ETAPAS};
 // Esses exames, quando explicitamente registrados na ficha, também são respeitados.
 for(const [tipo,nome] of [['toxicologico','Exame toxicológico'],['oftalmologico','Exame oftalmológico']]){
  if(aluno.examesAdministrativos?.[tipo])requisitos[tipo]=nome;
 }
 return Object.entries(requisitos).flatMap(([tipo,nome])=>{
  const item=aluno.examesAdministrativos?.[tipo]||etapaParaAgendamento(aluno,tipo);
  const status=item?.status||'Não informado';
  const vencido=!!(data&&item?.validade&&item.validade<data);
  if(!vencido&&(status==='Aprovado'||(['medico','psicologico','toxicologico','oftalmologico'].includes(tipo)&&status==='Não se aplica')))return [];
  return [{tipo,nome,situacao:vencido?'Vencido':status}];
 });
}

export function motivoEtapasAgendamento(aluno,data){
 const pendencias=pendenciasAgendamento(aluno,data);
 return pendencias.length?'Acompanhamento administrativo: '+pendencias.map(p=>p.nome+' — '+p.situacao).join('; ')+'. Consulte a recepção para informações sobre o processo.':'';
}
