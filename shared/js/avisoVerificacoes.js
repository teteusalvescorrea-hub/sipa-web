// 18/11/2026 (pedido do usuário): número no item "Verificações" do menu da Recepção, da Gerência e do Master com os
// atestados ainda sem decisão. Consulta a cada 15 s, ao voltar para a aba e ao fechar um diálogo (depois de uma decisão).
// Falha na consulta não mexe no número.
export function acompanharVerificacoes(raiz,servico,ui){
 if(!servico.totalVerificacoesPendentes||!ui.marcarContador||!raiz.querySelector('[data-op-nav="verificacoes"]'))return ()=>{};
 const contar=async()=>{if(document.hidden)return;try{ui.marcarContador('verificacoes',await servico.totalVerificacoesPendentes(),'atestado(s) aguardando decisão');}catch{}};
 setInterval(contar,15000);window.addEventListener('focus',contar);raiz.addEventListener('close',()=>setTimeout(contar,800),true);
 raiz.addEventListener('sipa-verificacoes-atualizadas',contar);contar();
 return contar;
}
