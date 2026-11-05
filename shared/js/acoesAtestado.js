// Ações da solicitação médica no painel administrativo. Fluxo: aluno -> Recepção confere e encaminha -> Gerência decide.
// A Gerência só aguarda enquanto está com a Recepção; o Master mantém o encaminhamento e a correção da decisão.
export function acoesDoAtestado(s,{master=false,inconsistente=false}={}){
 const status=s?.status;
 return {encaminhar:master&&!inconsistente&&status==='recepcao',aguardandoRecepcao:!master&&status==='recepcao',decidir:!inconsistente&&(status==='gerencia'||master&&['aprovado','rejeitado'].includes(status))};
}
