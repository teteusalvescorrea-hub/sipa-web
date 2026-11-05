import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
const host=document.getElementById('mensagens-lista');
const menu=document.getElementById('mensagens-menu');menu.onclick=()=>{const side=document.querySelector('.sipa-sidebar');side.classList.toggle('mobile-open');menu.setAttribute('aria-expanded',String(side.classList.contains('mobile-open')));};
if(desenvolvimentoAtivo()){
 try{const {consultarMinhaContaRecepcao}=await import('../../dev/aluno/contaRecepcao.js');await consultarMinhaContaRecepcao();const servico=(await import('../../dev/aluno/servicoRecepcao.js')).criarServicoContaRecepcao();await (await import('./components/mensagensAluno.js')).montarMensagensAluno(host,servico);document.querySelector('.sipa-sidebar-logout').onclick=async e=>{e.preventDefault();await servico.sair();location.assign('/login.html');};
  const verificar=async()=>{try{await consultarMinhaContaRecepcao();}catch{document.querySelectorAll('dialog').forEach(d=>d.remove());document.querySelector('main')?.replaceChildren();location.replace('/login.html');}};window.addEventListener('focus',verificar);window.addEventListener('storage',verificar);setInterval(verificar,15000);window.addEventListener('pagehide',()=>{document.querySelectorAll('dialog').forEach(d=>d.remove());document.querySelector('main')?.replaceChildren();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 }catch{document.querySelector('main')?.replaceChildren();location.replace('/login.html');}
}else{const {exigirLogin}=await import('../../shared/js/sessao.js');if(exigirLogin(['Aluno'])){const servico=(await import('./services/alunoIntegrado.js')).criarServicoAluno();document.querySelector('.sipa-sidebar-logout').onclick=e=>{e.preventDefault();servico.sair();};host.textContent='Carregando suas mensagens…';
 // Abas "Avisos" (automáticos do sistema) e "Conversa com a Recepção" (nos dois sentidos).
 const conversa=servico.capacidades.conversa?await import('./components/conversaAluno.js'):null,abas=conversa?.prepararAbasMensagens();abas?.ativar();
 const montarConversa=conversa?conversa.montarConversaAluno(document.getElementById('conversa-recepcao'),servico,abas).catch(e=>{document.querySelector('[data-conversa-aviso]').textContent=e.message||'Não foi possível carregar a conversa.';}):null;
 try{await (await import('./components/mensagensAluno.js')).montarMensagensAluno(host,servico,{aoContar:n=>abas?.contar('avisos',n)});}catch(e){host.textContent=e.status===0?'Não foi possível falar com o servidor. Tente novamente.':e.message||'Não foi possível carregar suas mensagens.';}
 await montarConversa;
 // Sino e item Mensagens a cada 15 s, como nas outras páginas (integrado.js não carrega aqui); no foco os avisos já atualizam.
 const {atualizarIndicadorMensagens}=await import('./components/mensagensAluno.js');setInterval(()=>{if(!document.hidden)atualizarIndicadorMensagens(servico);},15000);}}
