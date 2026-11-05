import {dataRelatorio} from '../../../shared/js/apresentacaoRelatorios.js';
import {atualizarIndicadorMensagens} from './mensagensAluno.js';
// Conversa com a Recepção (aluno): uma por autoescola em que tem matrícula. Separada dos avisos automáticos.
// Consulta a cada 15 s, ao voltar para a janela e ao mostrar a aba; a leitura só é registrada com a aba visível.
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
const MAXIMO=2000;

// Abas "Avisos" e "Conversa com a Recepção" (div[role=tablist] da página). Sem a conversa, as abas ficam escondidas.
export function prepararAbasMensagens(){
 const lista=document.querySelector('[data-mensagens-abas]'),abas=[...(lista?.querySelectorAll('[role=tab]')||[])],ouvintes=[];
 const painel=aba=>document.getElementById(aba.getAttribute('aria-controls'));
 function mostrar(nome,focar=false){
  for(const aba of abas){const ativa=aba.dataset.aba===nome;aba.setAttribute('aria-selected',String(ativa));aba.tabIndex=ativa?0:-1;const p=painel(aba);if(p)p.hidden=!ativa;if(ativa&&focar)aba.focus();}
  for(const f of ouvintes)f(nome);
 }
 abas.forEach((aba,i)=>{aba.onclick=()=>mostrar(aba.dataset.aba);aba.onkeydown=e=>{const d={ArrowRight:1,ArrowLeft:-1}[e.key];if(!d)return;e.preventDefault();mostrar(abas[(i+d+abas.length)%abas.length].dataset.aba,true);};});
 return {
  ativar(){if(!lista)return;lista.hidden=false;for(const aba of abas){const p=painel(aba);if(p){p.setAttribute('role','tabpanel');p.setAttribute('aria-labelledby',aba.id);p.removeAttribute('aria-label');}}mostrar(location.hash==='#conversa'?'conversa':'avisos');},
  mostrar,aoMudar:f=>ouvintes.push(f),
  ativa:()=>abas.find(a=>a.getAttribute('aria-selected')==='true')?.dataset.aba||'avisos',
  contar(nome,n){const c=lista?.querySelector('[data-contador="'+nome+'"]');if(!c)return;n=Math.max(0,Number(n)||0);c.textContent=n>99?'99+':String(n);c.hidden=!n;c.title=n?n+' não lida(s)':'';}
 };
}

export async function montarConversaAluno(host,servico,abas){
 const seletorCaixa=host.querySelector('[data-conversa-autoescola]'),seletor=host.querySelector('select'),aviso=host.querySelector('[data-conversa-aviso]'),lista=host.querySelector('[data-conversa-lista]');
 const form=host.querySelector('form'),texto=form.querySelector('textarea'),contador=form.querySelector('[data-conversa-contador]'),erro=form.querySelector('[data-conversa-erro]'),enviar=form.querySelector('button[type=submit]');
 let conversas=[],atual=null,assinatura='',chave=crypto.randomUUID(),ocupado=false,pendente=false,enviando=false;
 texto.maxLength=MAXIMO;
 const visivel=()=>!host.hidden&&document.visibilityState==='visible';
 function desenhar(mensagens){
  const nova=JSON.stringify([atual,mensagens.map(m=>m.id)]);if(nova===assinatura)return;assinatura=nova;
  lista.replaceChildren();
  if(!mensagens.length)lista.append(el('li','Ainda não há mensagens. Escreva para a Recepção quando precisar.','conversa-vazio'));
  for(const m of mensagens){const li=el('li',undefined,'conversa-item'),topo=el('p',undefined,'conversa-topo');li.dataset.autor=m.daEquipe?'recepcao':'aluno';li.dataset.conversaMensagem=m.id;
   topo.append(el('strong',m.daEquipe?m.remetente||'Recepção':'Você'),el('span',m.em?dataRelatorio(m.em):''));li.append(topo,el('p',m.texto,'conversa-texto'));lista.append(li);}
  lista.scrollTop=lista.scrollHeight;
 }
 async function atualizar(){
  if(ocupado){pendente=true;return;}ocupado=true;
  try{
   conversas=await servico.conversas();
   if(!conversas.some(c=>c.autoescolaId===atual))atual=(conversas.find(c=>c.naoLidas)||conversas[0])?.autoescolaId??null;
   seletor.replaceChildren(...conversas.map(c=>{const o=el('option',c.autoescola+(c.naoLidas?' ('+c.naoLidas+')':''));o.value=c.autoescolaId;return o;}));seletor.value=atual||'';seletorCaixa.hidden=conversas.length<2;
   const c=conversas.find(x=>x.autoescolaId===atual);
   if(!c){aviso.textContent='Você ainda não tem matrícula em uma autoescola para conversar com a Recepção.';form.hidden=true;lista.hidden=true;abas?.contar('conversa',0);return;}
   lista.hidden=false;form.hidden=!c.podeEnviar;aviso.textContent=c.podeEnviar?'':'Você não está mais matriculado nesta autoescola. O histórico continua disponível.';
   desenhar(await servico.mensagensConversa(c.autoescolaId));
   if(c.naoLidas&&visivel()){try{await servico.marcarConversaLida(c.autoescolaId);c.naoLidas=0;atualizarIndicadorMensagens(servico);}catch{}}
   abas?.contar('conversa',conversas.reduce((n,x)=>n+x.naoLidas,0));
  }catch(e){aviso.textContent=e.status===0?'Não foi possível falar com o servidor. Tente novamente.':e.message||'Não foi possível carregar a conversa.';}
  finally{ocupado=false;if(pendente){pendente=false;await atualizar();}}
 }
 seletor.onchange=()=>{atual=seletor.value;assinatura='';erro.textContent='';atualizar();};
 texto.addEventListener('input',()=>{contador.textContent=texto.value.length+' / '+MAXIMO;chave=crypto.randomUUID();erro.textContent='';});
 texto.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();form.requestSubmit();}});
 // A mesma chave de idempotência vale até dar certo ou o texto mudar: repetir depois de uma falha de rede não duplica.
 form.onsubmit=async e=>{
  e.preventDefault();if(enviando||!atual)return;const t=texto.value.trim();if(!t){erro.textContent='Escreva a mensagem.';texto.focus();return;}
  enviando=true;enviar.disabled=true;erro.textContent='';
  try{await servico.enviarMensagemRecepcao(atual,t,chave);texto.value='';contador.textContent='0 / '+MAXIMO;chave=crypto.randomUUID();await atualizar();}
  catch(x){erro.textContent=x.status===0?'Não foi possível falar com o servidor. Tente novamente.':x.message||'Não foi possível enviar a mensagem.';}
  finally{enviando=false;enviar.disabled=false;}
 };
 const refrescar=()=>{if(document.visibilityState==='visible')atualizar();};
 setInterval(refrescar,15000);window.addEventListener('focus',refrescar);document.addEventListener('visibilitychange',refrescar);
 abas?.aoMudar(nome=>{if(nome==='conversa')atualizar();});
 await atualizar();
 return {atualizar};
}
