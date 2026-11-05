// Contratar mais aulas (Minhas aulas): pop-up com os 3 passos e o WhatsApp da Recepção. Não envia nada e não mostra preços.
// Abre pelo botão do topo ou pelo endereço #contratar (atalhos de outras telas e o antigo pacotes.html).
import {LINK_CONTRATAR_AULAS} from '../domain/contatoRecepcao.js';
const ANCORA='#contratar';
const PASSOS=['Fale com a Recepção pelo WhatsApp.','A Recepção registra o pacote ou as aulas avulsas.','As aulas entram no seu saldo e você já pode agendar.'];

export function abrirContratarAulas(origem){
 if(document.querySelector('.lesson-hire-dialog'))return;
 const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
 const d=el('dialog',undefined,'lesson-cancel-dialog lesson-hire-dialog');d.setAttribute('aria-labelledby','lesson-hire-title');d.setAttribute('aria-describedby','lesson-hire-description');
 const cabecalho=el('header');cabecalho.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-9 3v5m-2.5-2.5h5"/></svg>';
 const titulo=el('h2','Contratar mais aulas');titulo.id='lesson-hire-title';titulo.tabIndex=-1;cabecalho.append(titulo);
 const descricao=el('p','Como funciona:');descricao.id='lesson-hire-description';
 const passos=el('ol',undefined,'lesson-hire-steps');PASSOS.forEach((texto,i)=>{const li=el('li');const n=el('span',String(i+1),'lesson-hire-step-number');n.setAttribute('aria-hidden','true');li.append(n,el('span',texto));passos.append(li);});
 const fechar=el('button','Fechar');fechar.type='button';fechar.dataset.hireClose='';fechar.onclick=()=>d.close();
 const whatsapp=el('a','Falar no WhatsApp','lesson-hire-whatsapp');whatsapp.href=LINK_CONTRATAR_AULAS;whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';whatsapp.dataset.hireWhatsapp='';
 const rodape=el('footer');rodape.append(fechar,whatsapp);
 d.append(cabecalho,descricao,passos,rodape,el('small','Abre o WhatsApp em uma nova aba.','lesson-hire-note'));
 // Esc fecha pelo próprio <dialog>; ao fechar, o endereço perde o #contratar e o foco volta ao botão.
 d.onclose=()=>{d.remove();if(location.hash===ANCORA)history.replaceState(null,'',location.pathname+location.search);(origem||document.querySelector('[data-contratar-aulas]'))?.focus();};
 document.body.append(d);d.showModal();titulo.focus({preventScroll:true});
}

export function montarContratarAulas(){
 for(const botao of document.querySelectorAll('[data-contratar-aulas]'))botao.addEventListener('click',e=>{e.preventDefault();abrirContratarAulas(botao);});
 const pelaAncora=()=>{if(location.hash===ANCORA)abrirContratarAulas();};
 window.addEventListener('hashchange',pelaAncora);pelaAncora();
}
