// Aviso da Recepção e da Gerência: horários que vagaram com aluno Aguardando que pode ser atendido (o total da API, C7), no item "Antecipação de aulas"
// do menu. Consulta a cada 15 s, ao voltar para a aba e depois de cada ação na tela. Falha na consulta não mexe no número.
export function acompanharHorariosLiberados(raiz,servico,ui){
 if(!servico.totalLiberados||!ui.marcarContador)return ()=>{};
 const contar=async()=>{if(document.hidden)return;try{ui.marcarContador('antecipacao',await servico.totalLiberados(),'horário(s) liberado(s) com aluno aguardando contato');}catch{}};
 setInterval(contar,15000);window.addEventListener('focus',contar);raiz.addEventListener('sipa-antecipacao-atualizada',contar);contar();
 return contar;
}
