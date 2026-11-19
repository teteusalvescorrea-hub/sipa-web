// Contratar mais aulas (Minhas aulas): pop-up com os 3 passos e as duas formas de pedir (o chat com a Recepção, que leva
// a mensagem do pedido, ou o WhatsApp). Não mostra preços.
// Abre pelo botão do topo ou pelo endereço #contratar (atalhos de outras telas e o antigo pacotes.html).
import {LINK_CONTRATAR_AULAS} from '../domain/contatoRecepcao.js';
const ANCORA='#contratar';
const PASSOS=['Peça pelo chat ou fale com a Recepção pelo WhatsApp.','A Recepção registra o pacote ou as aulas avulsas.','As aulas entram no seu saldo e você já pode agendar.'];

export function abrirContratarAulas(origem){
 if(document.querySelector('.lesson-hire-dialog'))return;
 const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
 const d=el('dialog',undefined,'lesson-cancel-dialog lesson-hire-dialog');d.setAttribute('aria-labelledby','lesson-hire-title');d.setAttribute('aria-describedby','lesson-hire-description');
 const cabecalho=el('header');cabecalho.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-9 3v5m-2.5-2.5h5"/></svg>';
 const titulo=el('h2','Contratar mais aulas');titulo.id='lesson-hire-title';titulo.tabIndex=-1;cabecalho.append(titulo);
 const descricao=el('p','Como funciona:');descricao.id='lesson-hire-description';
 const passos=el('ol',undefined,'lesson-hire-steps');PASSOS.forEach((texto,i)=>{const li=el('li');const n=el('span',String(i+1),'lesson-hire-step-number');n.setAttribute('aria-hidden','true');li.append(n,el('span',texto));passos.append(li);});
 // 09/11/2026: as duas formas de pedir viraram cartões, um embaixo do outro; o Fechar fica sozinho no rodapé.
 const opcao=(tag,classe,icone,rotulo,ajuda)=>{const n=el(tag,undefined,'lesson-hire-opcao '+classe),i=el('span',undefined,'lesson-hire-opcao-icone'),texto=el('span',undefined,'lesson-hire-opcao-texto'),seta=el('span','›','lesson-hire-opcao-seta');
  i.innerHTML=icone;i.setAttribute('aria-hidden','true');seta.setAttribute('aria-hidden','true');texto.append(el('strong',rotulo),el('small',ajuda));n.append(i,texto,seta);return n;};
 const ICONE_CHAT='<svg viewBox="0 0 24 24"><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.6A8 8 0 1 1 21 12Z"/><path d="M8.5 10.5h7m-7 3h4.5"/></svg>';
 const ICONE_WPP='<svg viewBox="0 0 24 24"><path d="M3.5 20.5l1.3-4.1A8.6 8.6 0 1 1 8 19.5Z"/><path d="M9.2 8.3c-.4 2.9 2.6 6.4 5.9 6.4l.9-1.5-1.9-1-.9.9a3.9 3.9 0 0 1-2.2-2.2l.9-.9-1-1.9Z"/></svg>';
 // Fase 8 (4.6) + 09/11/2026: o pedido avisa a Recepção e já deixa a mensagem no chat do aluno com ela.
 const pedir=opcao('button','lesson-hire-opcao-chat',ICONE_CHAT,'Pedir pelo chat','A Recepção recebe sua mensagem em Mensagens e responde com os valores.');pedir.type='button';pedir.dataset.hirePedido='';
 const whatsapp=opcao('a','lesson-hire-opcao-wpp',ICONE_WPP,'Falar no WhatsApp','Abre o WhatsApp da Recepção em uma nova aba.');whatsapp.href=LINK_CONTRATAR_AULAS;whatsapp.target='_blank';whatsapp.rel='noopener noreferrer';whatsapp.dataset.hireWhatsapp='';
 const opcoes=el('div',undefined,'lesson-hire-opcoes');opcoes.append(pedir,whatsapp);
 const retorno=el('p',undefined,'lesson-hire-note');retorno.setAttribute('role','status');
 pedir.onclick=async()=>{pedir.disabled=true;retorno.classList.remove('lesson-hire-erro');
  try{const api=await import('../../../shared/js/api.js');await api.Post('alunos/me/pedidos-aulas',{});
   pedir.classList.add('lesson-hire-opcao-ok');pedir.querySelector('strong').textContent='Pedido enviado';pedir.querySelector('small').textContent='A mensagem chegou à Recepção. Acompanhe em Mensagens.';pedir.querySelector('.lesson-hire-opcao-seta').textContent='✓';
   retorno.textContent='';const ir=el('a','Abrir Mensagens','lesson-hire-ir');ir.href=new URL('../../html/mensagens.html',import.meta.url).href;retorno.append(ir);}
  catch(e){pedir.disabled=false;retorno.classList.add('lesson-hire-erro');retorno.textContent=e?.message||'Não foi possível enviar o pedido. Use o WhatsApp.';}};
 const fechar=el('button','Fechar','lesson-hire-fechar');fechar.type='button';fechar.dataset.hireClose='';fechar.onclick=()=>d.close();
 const rodape=el('footer');rodape.append(fechar);
 d.append(cabecalho,descricao,passos,el('p','Escolha como prefere pedir:','lesson-hire-escolha'),opcoes,retorno,rodape);
 // Esc fecha pelo próprio <dialog>; ao fechar, o endereço perde o #contratar e o foco volta ao botão.
 d.onclose=()=>{d.remove();if(location.hash===ANCORA)history.replaceState(null,'',location.pathname+location.search);(origem||document.querySelector('[data-contratar-aulas]'))?.focus();};
 document.body.append(d);d.showModal();titulo.focus({preventScroll:true});
}

export function montarContratarAulas(){
 for(const botao of document.querySelectorAll('[data-contratar-aulas]'))botao.addEventListener('click',e=>{e.preventDefault();abrirContratarAulas(botao);});
 const pelaAncora=()=>{if(location.hash===ANCORA)abrirContratarAulas();};
 window.addEventListener('hashchange',pelaAncora);pelaAncora();
}
