import {el,botao,campo,entrada,select,modal,card,mostrarToast} from '../../nivel-1-operador/js/components/uiOperador.js';
import {UNIDADES_INSTITUCIONAIS,nomeUnidadeInstitucional} from '../js/catalogoUnidades.js';
import {dataRelatorio} from '../js/apresentacaoRelatorios.js';
import {menuAcoes} from './menuAcoes.js';
// Mensagens (Recepção e Gerência): a caixa das conversas com os alunos. Os avisos automáticos do sistema ficam fora daqui.
// Padrão da tela de alunos: filtros numa linha, contagem, tabela e Ações ⋯. Abrir uma conversa troca a tabela pela
// conversa, com "Voltar". A leitura é uma marca só para a equipe: quem abre marca como lida para todos.
// Consulta a cada 15 s enquanto a seção está visível e ao voltar para a janela.
const principal='op-button op-button-primary',TAMANHO=20,MAXIMO=2000;
const plural=(n,um,varios)=>n+' '+(n===1?um:varios);
const nomeUnidade=c=>c.unidadeNome||nomeUnidadeInstitucional(c.unidade)||'Unidade não informada';
function carregarCss(){if(document.querySelector('[data-css-mensagens-equipe]'))return;const l=el('link');l.rel='stylesheet';l.href=new URL('../css/mensagens-equipe.css',import.meta.url);l.dataset.cssMensagensEquipe='';document.head.append(l);}
const avisar=raiz=>raiz.dispatchEvent(new Event('sipa-mensagens-atualizadas'));

// Caixa de texto com contador e envio; a mesma chave de idempotência vale até dar certo ou o texto mudar.
function caixaDeTexto(rotulo,enviar,{rotuloBotao='Enviar'}={}){
 const form=el('form',undefined,'msg-form'),texto=el('textarea'),contador=el('span','0 / '+MAXIMO,'msg-contador'),erro=el('p',undefined,'op-acompanhamento-erro'),rodape=el('div',undefined,'msg-form-rodape'),enviarBotao=el('button',rotuloBotao,principal);
 let chave=crypto.randomUUID(),ocupado=false;
 texto.name='texto';texto.rows=3;texto.maxLength=MAXIMO;texto.required=true;texto.setAttribute('aria-label',rotulo);texto.placeholder='Escreva a mensagem';erro.setAttribute('role','alert');enviarBotao.type='submit';enviarBotao.dataset.msgEnviar='';
 texto.addEventListener('input',()=>{contador.textContent=texto.value.length+' / '+MAXIMO;chave=crypto.randomUUID();erro.textContent='';});
 texto.addEventListener('keydown',e=>{if(e.key==='Enter'&&(e.ctrlKey||e.metaKey)){e.preventDefault();form.requestSubmit();}});
 form.onsubmit=async e=>{e.preventDefault();if(ocupado)return;const t=texto.value.trim();if(!t){erro.textContent='Escreva a mensagem.';texto.focus();return;}
  ocupado=true;enviarBotao.disabled=true;erro.textContent='';
  try{await enviar(t,chave);texto.value='';contador.textContent='0 / '+MAXIMO;chave=crypto.randomUUID();}catch(x){erro.textContent=x.message||'Não foi possível enviar a mensagem.';}finally{ocupado=false;enviarBotao.disabled=false;}};
 rodape.append(contador,enviarBotao);form.append(campo(rotulo,texto),erro,rodape);return {form,texto};
}

function listaDeMensagens(mensagens){
 const lista=el('ol',undefined,'msg-lista');lista.setAttribute('aria-label','Mensagens da conversa');
 if(!mensagens.length)lista.append(el('li','Nenhuma mensagem nesta conversa.','msg-vazio'));
 for(const m of mensagens){
  const li=el('li',undefined,'msg-item');li.dataset.autor=m.daEquipe?'equipe':'aluno';li.dataset.msgId=m.id;
  const topo=el('p',undefined,'msg-topo');topo.append(el('strong',m.daEquipe?(m.remetente||'Recepção')+(m.autor?' · '+m.autor:''):m.remetente||'Aluno'),el('span',m.em?dataRelatorio(m.em):''));
  li.append(topo,el('p',m.texto,'msg-texto'));lista.append(li);
 }
 return lista;
}

export async function montarMensagensPainel(host,servico,raiz,ui,{conversaId}={}){
 host.mensagensController?.abort();const controller=new AbortController();host.mensagensController=controller;carregarCss();
 host.classList.add('sipa-mensagens-equipe');const op=servico.identidade;let pagina=1,total=0,itens=[],revisao=0,aberta=conversaId||null,revisaoConversa=0,ultimaAssinatura='';
 const unidades=UNIDADES_INSTITUCIONAIS.filter(u=>op.unidades?.includes(u.id)).map(u=>[u.id,u.nome]);
 // "Todas" = todas as unidades que a conta lê (a API aplica o escopo).
 const filtros={busca:entrada('search'),unidade:select([['','Todas'],...unidades],op.unidadeConsulta||''),somenteNaoLidas:entrada('checkbox')};
 filtros.busca.placeholder='Nome ou CPF';filtros.busca.maxLength=150;
 const barra=el('form',undefined,'msg-filtros');barra.setAttribute('role','search');barra.setAttribute('aria-label','Filtros das conversas');barra.onsubmit=e=>{e.preventDefault();pagina=1;consultar();};
 for(const [k,t] of [['busca','Buscar aluno'],['unidade','Unidade']]){filtros[k].name=k;filtros[k].dataset.msgFiltro=k;const g=campo(t,filtros[k]);g.className='msg-filtro';barra.append(g);}
 let espera;filtros.busca.addEventListener('input',()=>{clearTimeout(espera);espera=setTimeout(()=>{pagina=1;consultar();},400);});
 filtros.unidade.addEventListener('change',()=>{pagina=1;consultar();});
 filtros.somenteNaoLidas.name='somenteNaoLidas';filtros.somenteNaoLidas.dataset.msgFiltro='somenteNaoLidas';filtros.somenteNaoLidas.addEventListener('change',()=>{pagina=1;consultar();});
 const marca=el('label',undefined,'msg-filtro msg-filtro-marca');marca.append(filtros.somenteNaoLidas,document.createTextNode('Somente não lidas'));barra.append(marca);
 const limpar=botao('Limpar filtros',()=>{filtros.busca.value='';filtros.unidade.value=op.unidadeConsulta||'';filtros.somenteNaoLidas.checked=false;pagina=1;consultar();},'op-button op-button-outline');limpar.dataset.msgLimpar='';
 const acoes=el('div',undefined,'msg-filtro-acoes');acoes.append(limpar);barra.append(acoes);
 const quantidade=el('p',undefined,'op-help');quantidade.dataset.msgContagem='';const retorno=el('p',undefined,'msg-retorno');retorno.setAttribute('role','status');
 const lista=el('div'),paginacao=el('nav',undefined,'adm-pagination');paginacao.setAttribute('aria-label','Páginas de conversas');
 const caixa=el('div');caixa.append(barra,retorno,quantidade,lista,paginacao);const conversaHost=el('div');conversaHost.hidden=true;
 host.replaceChildren(card('Mensagens',el('p','Conversas dos alunos com a Recepção. Os avisos automáticos do sistema não aparecem aqui.','adm-nota'),caixa,conversaHost));

 async function consultar(){
  const pedido=++revisao;retorno.textContent='';if(!lista.childElementCount)lista.replaceChildren(el('p','Consultando conversas…','op-help'));
  try{const r=await servico.conversas({unidade:filtros.unidade.value,busca:filtros.busca.value,somenteNaoLidas:filtros.somenteNaoLidas.checked,pagina,tamanho:TAMANHO});if(pedido!==revisao)return;itens=r.itens;total=r.total;
   if(!itens.length&&pagina>1&&total>0){pagina=Math.ceil(total/TAMANHO);return consultar();}}
  catch(e){if(pedido!==revisao)return;itens=[];total=0;retorno.textContent=e.message;}
  desenhar();
 }
 // Sem mudança desde o último desenho, a tabela fica como está: o menu ⋯ aberto e o foco do teclado não se perdem.
 let ultimaLista='';
 function desenhar(){
  quantidade.textContent=plural(total,'conversa','conversas');
  const assinatura=JSON.stringify([itens,total,pagina,!!(filtros.busca.value||filtros.somenteNaoLidas.checked||filtros.unidade.value)]);
  if(assinatura===ultimaLista&&lista.querySelector('.msg-tabela'))return;ultimaLista=assinatura;
  // Mudou: redesenha e devolve o foco ao mesmo nome ou ⋯ da conversa, se ele estava na tabela.
  const focado=lista.contains(document.activeElement)?document.activeElement:null,foco=focado&&(focado.dataset.msgAbrir!==undefined?['msgAbrir',focado.dataset.msgAbrir]:focado.dataset.msgAcoes!==undefined?['msgAcoes',focado.dataset.msgAcoes]:['regiao']);
  const wrap=el('div',undefined,'op-table-scroll'),tabela=el('table',undefined,'op-table msg-tabela'),head=el('thead'),tr=el('tr'),corpo=el('tbody'),colunas=['Aluno','Unidade','Última mensagem','Em','Situação','Ações'];
  wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Conversas com os alunos');
  for(const c of colunas){const th=el('th',c);th.scope='col';tr.append(th);}head.append(tr);
  for(const c of itens){
   const linha=el('tr'),nome=botao(c.aluno,()=>abrir(c.id),'op-link'),situacao=c.naoLida?el('span','Não lida','msg-situacao'):'—';linha.dataset.msgConversa=c.id;linha.dataset.naoLida=String(c.naoLida);nome.dataset.msgAbrir=c.id;
   const trecho=el('span',(c.ultimaDoAluno?'':'Equipe: ')+c.ultimaMensagem,'msg-trecho');
   const menu=menuAcoes(c.aluno,[['Abrir conversa',()=>abrir(c.id),'olho'],['Ver ficha',ui?.abrirFicha&&(()=>ui.abrirFicha(c.alunoId))]]);menu.gatilho.dataset.msgAcoes=c.id;
   for(const [k,v] of [['Aluno',nome],['Unidade',nomeUnidade(c)],['Última mensagem',trecho],['Em',c.ultimaMensagemEm?dataRelatorio(c.ultimaMensagemEm):'—'],['Situação',situacao],['Ações',menu.caixa]]){const td=el('td');td.dataset.rotulo=k;td.append(v instanceof Node?v:document.createTextNode(v));linha.append(td);}
   corpo.append(linha);
  }
  if(!itens.length){const r=el('tr'),td=el('td',filtros.busca.value||filtros.somenteNaoLidas.checked||filtros.unidade.value?'Nenhuma conversa encontrada para os filtros informados.':'Nenhuma conversa ainda.','op-demo-no-results');td.colSpan=colunas.length;r.append(td);corpo.append(r);}
  tabela.append(head,corpo);wrap.append(tabela);lista.replaceChildren(wrap);
  if(foco){const alvo=foco[0]==='regiao'?wrap:[...wrap.querySelectorAll('[data-msg-abrir],[data-msg-acoes]')].find(b=>b.dataset[foco[0]]===foco[1]);(alvo||wrap).focus({preventScroll:true});}
  const paginas=Math.ceil(total/TAMANHO);paginacao.replaceChildren();
  if(paginas>1){const ant=botao('Anterior',()=>{pagina--;consultar();}),prox=botao('Próxima',()=>{pagina++;consultar();});ant.disabled=pagina<=1;prox.disabled=pagina>=paginas;paginacao.append(ant,el('span',pagina+' / '+paginas),prox);}
 }

 // Conversa aberta: troca a tabela pela conversa. Marca como lida quando há mensagem do aluno não lida.
 // Na consulta periódica só o cabeçalho e as mensagens são trocados: o rascunho da resposta não se perde.
 let partes=null;
 async function abrir(id,{inicio=true}={}){
  aberta=id;const pedido=++revisaoConversa;caixa.hidden=true;conversaHost.hidden=false;
  if(inicio){partes=null;ultimaAssinatura='';conversaHost.replaceChildren(el('p','Carregando conversa…','op-help'));}
  let r;try{r=await servico.conversa(id);}catch(e){if(pedido!==revisaoConversa||aberta!==id)return;if(inicio)conversaHost.replaceChildren(voltarBotao(),el('p',e.message,'op-acompanhamento-erro'));return;}
  if(pedido!==revisaoConversa||aberta!==id)return;
  const c=r.conversa,assinatura=JSON.stringify([c.aluno,c.unidadeNome,c.podeResponder,r.mensagens.map(m=>m.id)]);
  if(assinatura!==ultimaAssinatura){
   ultimaAssinatura=assinatura;
   const cab=el('div',undefined,'msg-cabecalho'),titulo=el('div',undefined,'msg-titulo');titulo.append(el('strong',c.aluno),el('span',nomeUnidade(c)));cab.append(voltarBotao(),titulo);
   if(ui?.abrirFicha)cab.append(botao('Ver ficha',()=>ui.abrirFicha(c.alunoId)));
   const mensagens=listaDeMensagens(r.mensagens);
   if(partes?.podeResponder===c.podeResponder){partes.cab.replaceWith(cab);partes.mensagens.replaceWith(mensagens);Object.assign(partes,{cab,mensagens});}
   else{
    const rodape=c.podeResponder?caixaDeTexto('Resposta',async(t,chave)=>{await servico.enviarMensagemConversa(id,t,chave);avisar(raiz);await abrir(id,{inicio:false});}).form:el('p','Somente leitura nesta unidade.','msg-somente-leitura');
    partes={cab,mensagens,rodape,podeResponder:c.podeResponder};conversaHost.replaceChildren(cab,mensagens,rodape);
   }
   conversaHost.dataset.msgConversaAberta=id;mensagens.scrollTop=mensagens.scrollHeight;
  }
  if(c.naoLida)ler(id);
 }
 async function ler(id){try{await servico.marcarConversaLida(id);avisar(raiz);}catch{}}
 function voltarBotao(){const b=botao('Voltar',fechar);b.dataset.msgVoltar='';return b;}
 function fechar(){aberta=null;partes=null;revisaoConversa++;ultimaAssinatura='';delete conversaHost.dataset.msgConversaAberta;conversaHost.hidden=true;conversaHost.replaceChildren();caixa.hidden=false;consultar();}
 host.mensagens={abrir:id=>abrir(id),consultar};
 const visivel=()=>!host.hidden&&!document.hidden&&host.isConnected&&!raiz.querySelector('dialog[open]');
 // Com o menu ⋯ de uma linha aberto, a lista espera a próxima consulta.
 const refrescar=()=>{if(!visivel())return;if(aberta)abrir(aberta,{inicio:false});else if(!lista.querySelector('.op-menu-acoes-lista:not([hidden])'))consultar();};
 const relogio=setInterval(()=>{if(controller.signal.aborted)clearInterval(relogio);else refrescar();},15000);
 controller.signal.addEventListener('abort',()=>clearInterval(relogio));
 window.addEventListener('focus',refrescar,{signal:controller.signal});
 if(aberta)await abrir(aberta);else await consultar();
}

// "Enviar mensagem" da ficha ou da lista de alunos: diálogo com a primeira mensagem. A API acha ou cria a conversa;
// depois de enviar, a seção Mensagens abre já na conversa.
export function iniciarMensagem(host,servico,raiz,ui,{alunoId,nome}){
 carregarCss();
 const d=modal(raiz,'Enviar mensagem','msgIniciar');d.classList.add('adm-dialog','msg-dialogo');
 const voltar=botao('Voltar',()=>d.close());
 const caixaTexto=caixaDeTexto('Mensagem',async(t,chave)=>{
  const r=await servico.enviarMensagemAluno(alunoId,t,chave);
  for(const aberto of raiz.querySelectorAll('dialog[open]'))aberto.close();
  mostrarToast('Mensagem enviada.');avisar(raiz);ui?.navegar?.('mensagens');
  await montarMensagensPainel(host,servico,raiz,ui,{conversaId:r.conversaId});
 });
 caixaTexto.form.querySelector('[data-msg-enviar]').before(voltar);
 d.append(el('p','Para '+(nome||'o aluno')+'. A mensagem aparece em Mensagens, na conta do aluno.','op-help'),caixaTexto.form);
 d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();caixaTexto.texto.focus();return d;
}
