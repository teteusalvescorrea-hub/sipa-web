// Aviso da Recepção e da Gerência: conversas com mensagem do aluno ainda não lida, no item "Mensagens" do menu.
// Consulta a cada 15 s, ao voltar para a aba e depois de cada ação na tela. Falha na consulta não mexe no número.
// Também atende o "Enviar mensagem" da ficha e da lista de alunos (evento sipa-mensagem-iniciar).
export function acompanharMensagens(raiz,servico,ui){
 if(!servico.totalMensagensNaoLidas||!ui.marcarContador)return ()=>{};
 const contar=async()=>{if(document.hidden)return;try{ui.marcarContador('mensagens',await servico.totalMensagensNaoLidas(),'conversa(s) com mensagem não lida');}catch{}};
 setInterval(contar,15000);window.addEventListener('focus',contar);raiz.addEventListener('sipa-mensagens-atualizadas',contar);
 raiz.addEventListener('sipa-mensagem-iniciar',async e=>{
  const host=raiz.querySelector('[data-op-panel="mensagens"]');if(!host||!e.detail?.alunoId)return;
  try{(await import('../components/mensagensPainel.js')).iniciarMensagem(host,servico,raiz,ui,e.detail);}catch(x){host.textContent=x.message;}
 });
 contar();return contar;
}
