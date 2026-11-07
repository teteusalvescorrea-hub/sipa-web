import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
const host=document.getElementById('mensagens-lista');
// O menu (gaveta até 1024px) fica no sidebar-aluno.js.
if(desenvolvimentoAtivo()){
 try{const {consultarMinhaContaRecepcao}=await import('../../dev/aluno/contaRecepcao.js');await consultarMinhaContaRecepcao();const servico=(await import('../../dev/aluno/servicoRecepcao.js')).criarServicoContaRecepcao();await (await import('./components/mensagensAluno.js')).montarMensagensAluno(host,servico);document.querySelector('.sipa-sidebar-logout').onclick=async e=>{e.preventDefault();await servico.sair();location.assign('/login.html');};
  const verificar=async()=>{try{await consultarMinhaContaRecepcao();}catch{document.querySelectorAll('dialog').forEach(d=>d.remove());document.querySelector('main')?.replaceChildren();location.replace('/login.html');}};window.addEventListener('focus',verificar);window.addEventListener('storage',verificar);setInterval(verificar,15000);window.addEventListener('pagehide',()=>{document.querySelectorAll('dialog').forEach(d=>d.remove());document.querySelector('main')?.replaceChildren();});window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 }catch{document.querySelector('main')?.replaceChildren();location.replace('/login.html');}
}else{const {exigirLogin}=await import('../../shared/js/sessao.js');if(exigirLogin(['Aluno'])){const servico=(await import('./services/alunoIntegrado.js')).criarServicoAluno();document.querySelector('.sipa-sidebar-logout').onclick=e=>{e.preventDefault();servico.sair();};host.textContent='Carregando suas mensagens…';
 try{await (await import('./components/mensagensAluno.js')).montarMensagensAluno(host,servico);}catch(e){host.textContent=e.status===0?'Não foi possível falar com o servidor. Tente novamente.':e.message||'Não foi possível carregar suas mensagens.';}
 // Sino e item Mensagens a cada 15 s, como nas outras páginas (integrado.js não carrega aqui); no foco os avisos já atualizam.
 const {atualizarIndicadorMensagens}=await import('./components/mensagensAluno.js');setInterval(()=>{if(!document.hidden)atualizarIndicadorMensagens(servico);},15000);}}
