// Fase 8 na equipe: os pedidos de mais aulas (4.6), o chat interno (7), as avaliações dos alunos (5.5, Gerência e
// Master) e o horário de atendimento do chat com o aluno (5.6).
import {el,botao,campo,entrada} from './uiOperador.js';
import {formatarData} from '../../../shared/js/calendario.js';
import {formatarTelefone} from '../../../shared/js/formatacao.js';

const dataHora=iso=>iso?formatarData(String(iso).slice(0,10))+' '+String(iso).slice(11,16):'';
const local=iso=>{if(!iso)return '';const d=new Date(iso);return isNaN(d)?'':d.toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',hour:'2-digit',minute:'2-digit'});};

export function cartaoPedidosAulas(servico){
 // Uma faixa compacta que expande ao clicar: o título, o total em aberto e, aberta, a tabela.
 const card=el('details',undefined,'op-pedidos-aulas');card.dataset.opPedidosAulas='';const corpo=el('div',undefined,'op-pedidos-corpo');let todos=false;
 const resumo=el('summary',undefined,'op-pedidos-resumo'),icone=el('span','+','op-pedidos-icone'),textos=el('span',undefined,'op-pedidos-textos'),contador=el('span','0','op-pedidos-contador'),seta=el('span','▾','op-pedidos-seta');
 icone.setAttribute('aria-hidden','true');seta.setAttribute('aria-hidden','true');contador.hidden=true;
 textos.append(el('strong','Pedidos de mais aulas'),el('small','Alunos que clicaram em "Contratar mais aulas". Entre em contato para informar os valores.'));
 resumo.append(icone,textos,contador,seta);
 // Abertos por padrão; "Ver todas as solicitações" mostra também as já atendidas, com quem atendeu e quando.
 const barra=el('div',undefined,'op-pedidos-barra'),alternar=botao('Ver todas as solicitações',()=>{todos=!todos;alternar.textContent=todos?'Ver só as em aberto':'Ver todas as solicitações';carregar();},'op-button op-button-outline');alternar.dataset.opPedidosTodos='';
 barra.append(alternar);card.append(resumo,barra,corpo);
 const contar=lista=>{const n=lista.filter(p=>!p.atendidoEm).length;contador.textContent=n+(n===1?' em aberto':' em aberto');contador.hidden=!n;};
 async function carregar(){
  let lista;try{lista=await servico.pedidosAulas(todos?null:true);}catch(e){corpo.replaceChildren(el('p',e.message,'op-help'));return;}
  contar(lista);
  if(!lista.length){corpo.replaceChildren(el('p',todos?'Nenhuma solicitação registrada.':'Nenhum pedido em aberto.','op-help'));return;}
  const rolagem=el('div',undefined,'op-table-scroll'),t=el('table',undefined,'op-table'),cab=el('tr'),tb=el('tbody');
  for(const h of ['Aluno','Contato','Unidade','Pedido em','Situação',''])cab.append(el('th',h));
  for(const p of lista){const tr=el('tr');tr.dataset.opPedido=p.id;
   const contato=[p.telefone&&formatarTelefone(p.telefone),p.email].filter(Boolean).join(' · ')+(p.aceitaWhatsapp?' · aceita WhatsApp':'');
   const situacao=p.atendidoEm?'Contato feito em '+dataHora(p.atendidoEm)+(p.atendidoPor?' por '+p.atendidoPor:''):'Em aberto';
   const acoes=el('td');if(!p.atendidoEm){const b=botao('Contato feito',async()=>{b.disabled=true;try{await servico.atenderPedidoAulas(p.id);await carregar();}catch(e){alert(e.message);b.disabled=false;}},'op-link');b.dataset.opAtenderPedido=p.id;acoes.append(b);}
   const nome=el('td');nome.append(el('strong',p.aluno||'Aluno'));
   tr.append(nome,el('td',contato||'—'),el('td',p.unidade||'—'),el('td',dataHora(p.criadoEm)),el('td',situacao,p.atendidoEm?'':'op-pedido-aberto'),acoes);tb.append(tr);}
  const head=el('thead');head.append(cab);t.append(head,tb);rolagem.append(t);corpo.replaceChildren(rolagem);
 }
 carregar();return card;
}

export function cartaoChatEquipe(servico,{aoMudarNaoLidas}={}){
 const card=el('section',undefined,'op-card op-chat-equipe');card.dataset.opChatEquipe='';
 const lista=el('ol',undefined,'op-chat-lista');lista.setAttribute('aria-live','polite');
 const f=el('form'),texto=el('textarea');texto.rows=2;texto.maxLength=2000;texto.name='texto';texto.placeholder='Mensagem para a equipe (Recepção e Gerência)';texto.setAttribute('aria-label','Mensagem para a equipe');
 const enviar=el('button','Enviar','op-button');enviar.type='submit';const erro=el('p',undefined,'op-help');erro.setAttribute('role','alert');
 const titulo=el('h2','Chat da equipe');f.append(texto,enviar,erro);card.append(titulo,lista,f);
 let ultimo=null;const vistas=new Set();
 // 5.3: as mensagens de outras pessoas depois da última leitura ficam marcadas como novas até a pessoa interagir com o chat.
 let lidoEm=null,naoLidas=0,divisor=null;
 const contar=()=>{titulo.textContent='Chat da equipe'+(naoLidas?' ('+naoLidas+(naoLidas>1?' não lidas)':' não lida)'):'');card.dataset.opChatNaoLidas=String(naoLidas);aoMudarNaoLidas?.(naoLidas);};
 async function marcarLido(){if(!naoLidas||!servico.marcarChatLido)return;naoLidas=0;contar();lidoEm=new Date().toISOString();try{await servico.marcarChatLido();}catch{}}
 card.addEventListener('focusin',marcarLido);card.addEventListener('click',marcarLido);
 function mostrar(msgs){for(const m of msgs){if(vistas.has(m.id))continue;vistas.add(m.id);const li=el('li',undefined,m.minha?'op-chat-minha':'');li.dataset.opChatMensagem=m.id;const nova=!m.minha&&(!lidoEm||new Date(m.em)>new Date(lidoEm));if(nova&&!divisor&&lista.querySelector('[data-op-chat-mensagem]')){divisor=el('li','Novas mensagens','op-help');divisor.dataset.opChatDivisor='';lista.append(divisor);}if(nova){li.dataset.opChatNova='';naoLidas++;}li.append(el('strong',m.minha?'Você':m.autor),el('small',' '+local(m.em)+(nova?' · nova':'')),el('p',m.texto));lista.append(li);ultimo=m.em;}contar();lista.scrollTop=lista.scrollHeight;if(!lista.children.length)lista.append(el('li','Nenhuma mensagem ainda.','op-help'));else lista.querySelector('li.op-help')?.remove();}
 async function atualizar(){try{mostrar(await servico.chatEquipe(ultimo));}catch{}}
 f.onsubmit=async e=>{e.preventDefault();const t=texto.value.trim();if(!t)return;enviar.disabled=true;erro.textContent='';try{const m=await servico.enviarChatEquipe(t);texto.value='';mostrar([m]);}catch(x){erro.textContent=x.message;}finally{enviar.disabled=false;}};
 texto.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();f.requestSubmit();}});
 (async()=>{try{const r=await servico.chatNaoLidas?.();if(r)lidoEm=r.lidoEm||(r.total?null:new Date(0).toISOString());}catch{}await atualizar();})();const id=setInterval(()=>{if(!card.isConnected){clearInterval(id);return;}if(document.visibilityState==='visible')atualizar();},15000);
 return card;
}

export function cartaoAvaliacoes(servico){
 const card=el('section',undefined,'op-card');card.dataset.opAvaliacoes='';const corpo=el('div');
 // 7.8: período escolhido (padrão: 30 dias), médias por critério e a evolução por semana ou mês.
 const hoje=new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}),inicio=new Date(Date.now()-30*864e5).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
 const filtro=el('form',undefined,'op-atendimento-form'),de=entrada('date',inicio),ate=entrada('date',hoje),ver=el('button','Atualizar','op-button op-button-primary');de.name='de';ate.name='ate';ver.type='submit';de.max=ate.max=hoje;
 filtro.append(campo('De',de),campo('Até',ate),ver);filtro.onsubmit=e=>{e.preventDefault();carregar();};
 card.append(el('h2','Avaliações dos alunos'),filtro,corpo);
 const media=v=>v==null?'—':Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+' ★';
 async function carregar(){let r;corpo.replaceChildren(el('p','Carregando…','op-help'));try{r=await servico.avaliacoesResumo({de:de.value,ate:ate.value});}catch(e){corpo.replaceChildren(el('p',e.message,'op-help'));return;}
  if(!r.total){corpo.replaceChildren(el('p','Nenhuma avaliação no período.','op-help'));return;}
  const bloco=(titulo,itens,conservacao)=>{const s=el('div');s.append(el('h3',titulo));const ul=el('ul',undefined,'op-summary-list');for(const i of itens)ul.append(el('li',i.nome+' · '+media(i.media)+(conservacao&&i.mediaConservacao!=null?' · conservação '+media(i.mediaConservacao):'')+' · aula '+media(i.mediaAula)+' · '+i.total+' avaliação(ões)'));s.append(ul);return s;};
  const evolucao=()=>{const s=el('div');s.dataset.opAvaliacoesEvolucao='';s.append(el('h3','Evolução no período'));const t=el('table',undefined,'op-table'),cab=el('tr'),tb=el('tbody');for(const h of ['Período','Avaliações','Aula','Instrutor','Veículo','Conservação','Experiência'])cab.append(el('th',h));
   for(const p of r.evolucao||[]){const tr=el('tr');for(const v of [p.periodo,String(p.total),media(p.mediaAula),media(p.mediaInstrutor),media(p.mediaVeiculo),media(p.mediaConservacao),media(p.mediaExperiencia)])tr.append(el('td',v));tb.append(tr);}
   const head=el('thead');head.append(cab);t.append(head,tb);s.append(t);return s;};
  const resumo=el('p',r.total+' avaliação(ões) · aula '+media(r.mediaAula)+' · conservação do veículo '+media(r.mediaConservacao)+' · experiência '+media(r.mediaExperiencia),'op-avaliacoes-resumo');
  corpo.replaceChildren(resumo,bloco('Por instrutor',r.instrutores),bloco('Por veículo',r.veiculos,true),evolucao(),
   ...(r.tags?.length?[el('p','Destaques: '+r.tags.map(t=>t.tag+' ('+t.total+')').join(', '),'op-help')]:[]),
   ...(r.comentarios?.length?[bloco2(r.comentarios)]:[]));
  function bloco2(cs){const s=el('div');s.append(el('h3','Comentários recentes'));const ul=el('ul',undefined,'op-summary-list');for(const c of cs)ul.append(el('li',dataHora(c.em)+' · '+(c.instrutor||'')+' · '+c.notaAula+' ★ · '+c.comentario));s.append(ul);return s;}
 }
 carregar();return card;
}

export function cartaoAtendimento(servico){
 const card=el('section',undefined,'op-card');card.dataset.opAtendimento='';const corpo=el('div');
 card.append(el('h2','Horário do chat com o aluno'),el('p','Fora deste horário o aluno vê o horário de atendimento e não consegue enviar mensagens.','op-help'),corpo);
 const NOMES=['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
 (async()=>{let h;try{h=await servico.atendimentoChat();}catch(e){corpo.replaceChildren(el('p',e.message,'op-help'));return;}
  const f=el('form',undefined,'op-atendimento-form'),inicio=entrada('time',h.inicio),fim=entrada('time',h.fim),dias=el('fieldset');inicio.name='inicio';fim.name='fim';dias.append(el('legend','Dias'));
  NOMES.forEach((n,i)=>{const l=el('label'),c=el('input');c.type='checkbox';c.value=String(i);c.name='dias';c.checked=h.dias.includes(i);l.append(c,document.createTextNode(' '+n));dias.append(l);});
  const status=el('p',(h.aberto?'Aberto agora · ':'Fechado agora · ')+h.descricao,'op-help');status.setAttribute('role','status');
  const salvar=el('button','Salvar horário','op-button op-button-primary');salvar.type='submit';
  f.append(campo('Início',inicio),campo('Fim',fim),dias,salvar,status);
  f.onsubmit=async e=>{e.preventDefault();salvar.disabled=true;try{const r=await servico.definirAtendimentoChat({inicio:inicio.value,fim:fim.value,dias:[...f.querySelectorAll('input[name=dias]:checked')].map(c=>Number(c.value))});status.textContent='Salvo · '+(r.aberto?'aberto agora · ':'fechado agora · ')+r.descricao;}catch(x){status.textContent=x.message;}finally{salvar.disabled=false;}};
  corpo.replaceChildren(f);})();
 return card;
}
