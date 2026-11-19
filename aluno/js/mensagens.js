import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
const host=document.getElementById('mensagens-lista');
// O menu (gaveta até 1024px) fica no sidebar-aluno.js.
if(desenvolvimentoAtivo()){
 try{const {consultarMinhaContaRecepcao}=await import('../../dev/aluno/contaRecepcao.js');await consultarMinhaContaRecepcao();const servico=(await import('../../dev/aluno/servicoRecepcao.js')).criarServicoContaRecepcao();await (await import('./components/mensagensAluno.js')).montarMensagensAluno(host,servico);document.querySelector('.sipa-sidebar-logout').onclick=async e=>{e.preventDefault();await servico.sair();location.assign(new URL('../../login.html',import.meta.url).href);};
  const verificar=async()=>{try{await consultarMinhaContaRecepcao();}catch{document.querySelectorAll('dialog').forEach(d=>d.remove());document.querySelector('main')?.replaceChildren();location.replace(new URL('../../login.html',import.meta.url).href);}};window.addEventListener('focus',verificar);window.addEventListener('storage',verificar);setInterval(verificar,15000);window.addEventListener('pagehide',()=>{document.querySelectorAll('dialog').forEach(d=>d.remove());document.querySelector('main')?.replaceChildren();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 }catch{document.querySelector('main')?.replaceChildren();location.replace(new URL('../../login.html',import.meta.url).href);}
}else{const {exigirLogin}=await import('../../shared/js/sessao.js');if(exigirLogin(['Aluno'])){const servico=(await import('./services/alunoIntegrado.js')).criarServicoAluno();document.querySelector('.sipa-sidebar-logout').onclick=e=>{e.preventDefault();servico.sair();};host.textContent='Carregando suas mensagens…';
 // 09/11/2026: a página é só o chat com a Recepção da unidade (e a Gerência, quando ela escreve). Sem os avisos.
 host.hidden=true;host.replaceChildren();document.querySelector('[data-mensagens-abas]')?.setAttribute('hidden','');
 const sub=document.querySelector('.profile-header p');if(sub)sub.textContent='Converse com a Recepção da sua unidade.';
 const caixa=document.getElementById('conversa-recepcao');
 try{
  if(caixa&&servico.conversas){caixa.hidden=false;caixa.removeAttribute('aria-labelledby');caixa.setAttribute('aria-label','Conversas');
   const [{montarChat},{fonteAluno},{marcarIndicadorMensagens,atualizarIndicadorNovidades}]=await Promise.all([import('../../shared/components/chatWhats.js'),import('../../shared/js/chatFontes.js'),import('./components/mensagensAluno.js')]);
   let unidade='';try{const d=await servico.dadosAlunoLocal?.();unidade=String(d?.aluno?.unidadePrincipal||d?.aluno?.unidade||'').replace(/^Unidade /,'');}catch{}
   montarChat(caixa,fonteAluno(servico,{unidade}),{titulo:'Conversas',abrirUnica:true,aoMudarNaoLidas:marcarIndicadorMensagens});atualizarIndicadorNovidades(servico);
  }
  // 16/11/2026 (pedido do usuário): os avisos e as ofertas de horário saíram daqui e viraram a aba "Avisos e ofertas"
  // de Minhas aulas; esta página fica só com o chat.
 }catch(e){if(caixa){caixa.hidden=false;caixa.textContent=e.message||'Não foi possível carregar a conversa.';}}}}
