// Chat do SIPA no estilo do WhatsApp (09/11/2026), igual em todos os logins: a lista de conversas à esquerda (busca e
// filtros por categoria: Alunos, Grupos, Recepção, Gerência, Instrutores, Master) e a conversa aberta à direita. Quem
// pode falar com quem vem da API; aqui só se mostra o que a "fonte" devolve (shared/js/chatFontes.js).
//
// fonte = {
//   perfil, categorias: [...],                  // as categorias possíveis, na ordem dos filtros
//   listar() -> [{chave, nome, categoria, subtitulo, ultimaEm, ultima, ultimaMinha, naoLidas, etiqueta}],
//   mensagens(item, depoisDe) -> [{id, em, autor, texto, minha}],
//   enviar(item, texto) -> mensagem, ler(item), acoes?(item) -> [{rotulo, executar}]
// }
import {confirmarAcao,avisarErro} from './confirmarAcao.js';
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const CSS=new URL('../css/chat-whats.css',import.meta.url).href;
export function carregarCssChat(){carregarCss();}
function carregarCss(){if(!document.querySelector('link[data-chat-whats]')){const l=document.createElement('link');l.rel='stylesheet';l.href=CSS;l.dataset.chatWhats='';document.head.append(l);}}

export const dataDe=v=>{if(!v)return null;if(v instanceof Date)return v;const s=String(v);return new Date(/Z$|[+-]\d\d:\d\d$/.test(s)?s:s+'-03:00');};
const fuso={timeZone:'America/Sao_Paulo'};
function horaCurta(d){d=dataDe(d);if(!d||isNaN(d))return '';const hoje=new Date().toLocaleDateString('pt-BR',fuso),dia=d.toLocaleDateString('pt-BR',fuso);
 if(dia===hoje)return d.toLocaleTimeString('pt-BR',{...fuso,hour:'2-digit',minute:'2-digit'});
 const ontem=new Date(Date.now()-864e5).toLocaleDateString('pt-BR',fuso);return dia===ontem?'Ontem':d.toLocaleDateString('pt-BR',{...fuso,day:'2-digit',month:'2-digit',year:'numeric'});}
const iniciais=n=>String(n||'?').split(/\s+/).filter(p=>/\p{L}/u.test(p)).slice(0,2).map(p=>p.match(/\p{L}/u)[0]).join('').toUpperCase()||'?';
const COR={'Pedidos de aulas':'pedido',Alunos:'aluno',Aluno:'aluno',Grupos:'grupo',Grupo:'grupo','Recepção':'recepcao','Gerência':'gerencia',Master:'master',Instrutores:'instrutor',Instrutor:'instrutor'};

export function montarChat(host,fonte,{aoMudarNaoLidas,titulo='Conversas',abrirUnica=false}={}){
 carregarCss();host.replaceChildren();host.classList.add('chat-wa');
 const lista=el('section',null,'chat-wa-lista'),painel=el('section',null,'chat-wa-conversa');
 const topo=el('header',null,'chat-wa-topo');topo.append(el('h2',titulo));
 const busca=el('input');busca.type='search';busca.placeholder='Pesquisar conversa';busca.setAttribute('aria-label','Pesquisar conversa');busca.className='chat-wa-busca';
 const filtros=el('div',null,'chat-wa-filtros');filtros.setAttribute('role','tablist');filtros.setAttribute('aria-label','Filtrar conversas');
 const itens=el('ul',null,'chat-wa-itens');itens.setAttribute('role','list');
 lista.append(topo,busca,filtros,itens);
 const vazio=el('div',null,'chat-wa-vazio');vazio.append(el('strong','Suas conversas'),el('span','Escolha uma conversa na lista para ver e enviar mensagens.'));
 painel.append(vazio);host.append(lista,painel);
 let jaAbriu=false,todos=[],filtro='Tudo',aberto=null,mensagens=[],ultimoCarregado=null,ocupado=false,versao=0;

 function chips(){
  // Todas as categorias do perfil aparecem sempre (vazias mostram "Nenhuma conversa").
  const opcoes=['Tudo','Não lidas',...(fonte.categorias||[])];if(!opcoes.includes(filtro))filtro='Tudo';
  filtros.replaceChildren(...opcoes.map(c=>{const b=el('button',c,'chat-wa-chip');b.type='button';b.setAttribute('role','tab');b.setAttribute('aria-selected',String(c===filtro));
   const n=c==='Não lidas'?todos.filter(i=>i.naoLidas).length:0;if(n){b.append(el('span',String(n),'chat-wa-chip-n'));}
   b.onclick=()=>{filtro=c;desenharLista();};return b;}));
 }
 function desenharLista(){
  chips();const termo=busca.value.trim().toLocaleLowerCase('pt-BR');
  const visiveis=todos.filter(i=>(filtro==='Tudo'||(filtro==='Não lidas'?i.naoLidas>0:i.categoria===filtro||(i.categorias||[]).includes(filtro)))&&(!termo||[i.nome,i.subtitulo,i.categoria].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(termo))));
  if(!visiveis.length){itens.replaceChildren(el('li',filtro==='Não lidas'?'Nenhuma conversa não lida.':filtro==='Pedidos de aulas'?'Nenhum pedido de mais aulas em aberto.':'Nenhuma conversa encontrada.','chat-wa-nada'));return;}
  itens.replaceChildren(...visiveis.map(i=>{
   const li=el('li'),b=el('button',null,'chat-wa-item'+(aberto?.chave===i.chave?' ativo':''));b.type='button';b.dataset.chatItem=i.chave;
   const av=el('span',iniciais(i.nome),'chat-wa-avatar '+(COR[i.categoria]||''));av.setAttribute('aria-hidden','true');
   const meio=el('span',null,'chat-wa-item-meio'),linha1=el('span',null,'chat-wa-linha'),linha2=el('span',null,'chat-wa-linha');
   linha1.append(el('strong',i.nome,'chat-wa-nome'),el('small',horaCurta(i.ultimaEm),'chat-wa-hora'+(i.naoLidas?' nova':'')));
   const previa=el('span',(i.ultimaMinha?'Você: ':'')+(i.ultima||i.subtitulo||''),'chat-wa-previa');linha2.append(previa);
   if(i.etiqueta)linha2.append(el('span',i.etiqueta,'chat-wa-etiqueta'));
   if(i.naoLidas)linha2.append(el('span',String(i.naoLidas),'chat-wa-contador'));
   meio.append(linha1,linha2);b.append(av,meio);b.setAttribute('aria-label',i.nome+(i.naoLidas?', '+i.naoLidas+' não lidas':''));b.onclick=()=>abrir(i);li.append(b);return li;}));
 }
 async function recarregarLista(){
  try{todos=await fonte.listar();}catch(e){itens.replaceChildren(el('li',e.message||'Não foi possível carregar as conversas.','chat-wa-nada'));return;}
  if(aberto){const atual=todos.find(i=>i.chave===aberto.chave);if(atual)aberto={...atual,naoLidas:0};}
  desenharLista();aoMudarNaoLidas?.(todos.reduce((s,i)=>s+(i.naoLidas||0),0));
  // Uma conversa só (o aluno com a Recepção): já abre, no computador.
  if(abrirUnica&&!aberto&&!jaAbriu&&todos.length===1&&!matchMedia('(max-width: 820px)').matches){jaAbriu=true;abrir(todos[0]);}
 }
 function bolhas(area,lista){
  area.replaceChildren();let diaAnterior='';
  if(!lista.length)area.append(el('p','Nenhuma mensagem ainda. Escreva a primeira.','chat-wa-sem'));
  for(const m of lista){const d=dataDe(m.em),dia=d?d.toLocaleDateString('pt-BR',fuso):'';
   if(dia&&dia!==diaAnterior){area.append(el('div',horaCurta(d).includes(':')?'Hoje':horaCurta(d),'chat-wa-dia'));diaAnterior=dia;}
   const b=el('div',null,'chat-wa-bolha'+(m.minha?' minha':''));b.dataset.chatMensagem=m.id||'';
   if(m.autor&&(m.minha?m.autorVisivel:aberto?.mostrarAutor))b.append(el('strong',m.autor,'chat-wa-autor'));
   const quando=el('small',d?d.toLocaleTimeString('pt-BR',{...fuso,hour:'2-digit',minute:'2-digit'}):'','chat-wa-quando');
   if(m.minha){const lida=m.lida&&aberto?.tipo!=='grupo',t=el('span',lida?'✓✓':'✓','chat-wa-tique'+(lida?' lida':''));t.setAttribute('aria-label',lida?'Lida':'Enviada');t.title=lida?'Lida':'Enviada';quando.append(' ',t);}
   b.append(el('p',m.texto),quando);area.append(b);}
  area.scrollTop=area.scrollHeight;
 }
 async function abrir(item){
  const minhaVersao=++versao;aberto={...item};mensagens=[];ultimoCarregado=null;host.classList.add('com-conversa');desenharLista();
  const cab=el('header',null,'chat-wa-cabecalho'),voltar=el('button','‹','chat-wa-voltar');voltar.type='button';voltar.setAttribute('aria-label','Voltar para a lista');voltar.onclick=()=>{host.classList.remove('com-conversa');aberto=null;desenharLista();painel.replaceChildren(vazio);};
  const av=el('span',iniciais(item.nome),'chat-wa-avatar '+(COR[item.categoria]||''));const info=el('div',null,'chat-wa-info');info.append(el('strong',item.nome),el('small',[item.categoria,item.subtitulo].filter(Boolean).join(' · ')));
  const acoes=el('div',null,'chat-wa-acoes');for(const a of fonte.acoes?.(item)||[]){const b=el('button',a.rotulo,'chat-wa-acao');b.type='button';b.onclick=async()=>{if(a.confirmar&&!await confirmarAcao(a.confirmar,{titulo:a.rotulo}))return;b.disabled=true;try{await a.executar();await recarregarLista();const novo=todos.find(i=>i.chave===item.chave);if(novo)abrir(novo);else{host.classList.remove('com-conversa');aberto=null;painel.replaceChildren(vazio);}}catch(e){avisarErro(e.message);b.disabled=false;}};acoes.append(b);}
  cab.append(voltar,av,info,acoes);
  const area=el('div',null,'chat-wa-mensagens');area.setAttribute('aria-live','polite');area.append(el('p','Carregando…','chat-wa-sem'));
  const form=el('form',null,'chat-wa-envio'),texto=el('textarea',null,'chat-wa-texto');texto.rows=1;texto.maxLength=2000;texto.placeholder=item.somenteLeitura?'Somente leitura':'Digite uma mensagem';texto.setAttribute('aria-label','Mensagem');texto.disabled=!!item.somenteLeitura;
  const enviar=el('button',null,'chat-wa-enviar');enviar.type='submit';enviar.setAttribute('aria-label','Enviar');enviar.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 20.5 21 12 3 3.5l2.5 7L15 12l-9.5 1.5L3 20.5Z"/></svg>';enviar.disabled=!!item.somenteLeitura;
  const erro=el('p',null,'chat-wa-erro');erro.setAttribute('role','alert');form.append(texto,enviar);
  texto.addEventListener('input',()=>{texto.style.height='auto';texto.style.height=Math.min(texto.scrollHeight,140)+'px';texto.style.overflowY=texto.scrollHeight>140?'auto':'hidden';});
  texto.addEventListener('keydown',e=>{if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();form.requestSubmit();}});
  form.onsubmit=async e=>{e.preventDefault();const t=texto.value.trim();if(!t||ocupado)return;ocupado=true;enviar.disabled=true;erro.textContent='';
   try{const m=await fonte.enviar(aberto,t);texto.value='';texto.style.height='auto';if(m){mensagens.push(m);ultimoCarregado=m.em;}bolhas(area,mensagens);recarregarLista();}
   catch(x){erro.textContent=x.message||'Não foi possível enviar.';}finally{ocupado=false;enviar.disabled=false;texto.focus();}};
  painel.replaceChildren(cab,area,erro,form);
  try{mensagens=await fonte.mensagens(item,null);}catch(e){if(minhaVersao===versao)area.replaceChildren(el('p',e.message,'chat-wa-sem'));return;}
  if(minhaVersao!==versao)return;ultimoCarregado=mensagens.at(-1)?.em||null;bolhas(area,mensagens);if(!item.somenteLeitura)texto.focus();
  if(item.naoLidas&&item.tipo!=='pedido'){try{await fonte.ler(item);}catch{}await recarregarLista();}
 }
 async function atualizarAberta(){
  if(!aberto||ocupado)return;const atual=aberto,minhaVersao=versao;
  try{const novas=await fonte.mensagens(atual,fonte.incremental?ultimoCarregado:null);if(minhaVersao!==versao)return;
   const area=painel.querySelector('.chat-wa-mensagens');if(!area)return;
   if(fonte.incremental){const ids=new Set(mensagens.map(m=>m.id));const add=novas.filter(m=>!ids.has(m.id));if(!add.length)return;mensagens.push(...add);}
   else{const assinatura=l=>l.map(m=>m.id+(m.lida?'L':'')).join('|');if(assinatura(novas)===assinatura(mensagens))return;mensagens=novas;}
   ultimoCarregado=mensagens.at(-1)?.em||ultimoCarregado;bolhas(area,mensagens);if(document.visibilityState==='visible'){try{await fonte.ler(atual);}catch{}}}catch{}
 }
 busca.addEventListener('input',desenharLista);
 const primeiraCarga=recarregarLista();
 const relogio=setInterval(()=>{if(!host.isConnected){clearInterval(relogio);return;}if(document.visibilityState!=='visible')return;atualizarAberta();recarregarLista();},8000);
 // 10/11/2026: abre a conversa pela chave (a Antecipação de aulas abre a do aluno). Sem ela na lista, abre a reserva:
 // a primeira mensagem cria a conversa.
 async function abrirChave(chave,reserva){await primeiraCarga;const item=todos.find(i=>i.chave===chave)||reserva;if(!item)return false;await abrir(item);return true;}
 return {recarregar:recarregarLista,abrirChave};
}
