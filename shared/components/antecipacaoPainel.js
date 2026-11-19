import {el,botao,campo,entrada,select,modal,mostrarAviso} from '../../nivel-1-operador/js/components/uiOperador.js';
import {UNIDADES_INSTITUCIONAIS,nomeUnidadeInstitucional} from '../js/catalogoUnidades.js';
import {hojeBrasil,somarDias,formatarData} from '../js/calendario.js';
import {escopoPermitido} from '../js/permissoesAdministrativas.js';
import {dataRelatorio} from '../js/apresentacaoRelatorios.js';
import {formatarTelefone} from '../js/formatacao.js';
// Antecipação (Recepção, Gerência e Master): o que a equipe precisa acompanhar para adiantar aulas.
// 10/11/2026 (refeita para ficar mais indicativa e, depois, mais sóbria: cinza e o azul do sistema, sem cores por aba):
// três indicadores no topo, que também são as abas —
//  1. Pedidos para adiantar: o "Quero adiantar minhas aulas" dos alunos (contato e "Contato feito");
//  2. Horários liberados: horários ocupados que vagaram com alunos interessados (seleção e envio das ofertas);
//  3. Aguardando vaga: os "Tenho interesse" em horários que ainda estão ocupados.
// Os filtros (busca, unidade, categoria e período) são um bloco só, que vai junto com a aba aberta e vale para as três.
const categorias={A:'Moto',B:'Carro',D:'Ônibus'},principal='op-button op-button-primary',DIAS=14;
const plural=(n,um,varios)=>n+' '+(n===1?um:varios);
const aulaTexto=a=>formatarData(a.data)+' às '+a.inicio;
const dicaPrazo=prazo=>'O aluno não tem aula que possa ser remarcada: só dá para remarcar aulas com '+prazo+' horas úteis de antecedência.';
const dicaAulaNova='Sem aula para antecipar: na oferta, o aluno marca uma aula nova usando 1 crédito do saldo.';
// Data e hora de Brasília vindas da API sem fuso ("2026-11-13T09:00:00").
const dataHoraLocal=s=>{s=String(s||'');return s?formatarData(s.slice(0,10))+' às '+s.slice(11,16):'—';};
const diaSemana=data=>new Date(data+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',weekday:'short'}).replace('.','');
// "há 5 min", "há 2 h", "há 3 dias" (o pedido vem em horário de Brasília, sem fuso).
function haQuanto(s){
 const d=new Date(String(s||'')+(/[zZ]|[+-]\d\d:\d\d$/.test(String(s))?'':'-03:00'));if(isNaN(d))return '';
 const min=Math.max(0,Math.round((Date.now()-d)/60000));
 return min<1?'agora':min<60?'há '+min+' min':min<1440?'há '+Math.round(min/60)+' h':'há '+plural(Math.round(min/1440),'dia','dias');
}
const iniciais=n=>String(n||'?').split(/\s+/).filter(p=>/\p{L}/u.test(p)).slice(0,2).map(p=>p.match(/\p{L}/u)[0]).join('').toUpperCase()||'?';
const svg=d=>{const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.innerHTML=d;return s;};
const ICONES={
 pedidos:'<circle cx="12" cy="14" r="7.5"/><path d="M9.5 2.5h5M12 2.5v4M12 14l3.2-3.2M18.6 6.6 20 5.2"/>',
 liberados:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18M9 16l2 2 4-4"/>',
 espera:'<path d="M6 3h12M6 21h12M7 3v3a5 5 0 0 0 10 0V3M7 21v-3a5 5 0 0 1 10 0v3"/>',
 info:'<circle cx="12" cy="12" r="9"/><path d="M12 11v5m0-8h.01"/>',
 chat:'<path d="M20 11.5a7.5 7.5 0 0 1-10.9 6.7L4 19.5l1.4-4.4A7.5 7.5 0 1 1 20 11.5Z"/><path d="M8.5 11.5h.01M12 11.5h.01M15.5 11.5h.01"/>',
 ok:'<path d="m5 12.5 4.5 4.5L19 7.5"/>',
 relogio:'<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
};
const ABAS=[
 ['pedidos','Pedidos para adiantar','Alunos que pediram para adiantar as aulas','laranja','O aluno pediu para adiantar as aulas. Fale com ele pelo chat do AgIA (clique no nome ou em "Conversar") e, depois, marque "Contato feito".'],
 ['liberados','Horários liberados','Vagas abertas com alunos interessados','verde','Um horário ocupado vagou e há alunos interessados. Selecione e envie a oferta: o primeiro que aceitar fica com a vaga.'],
 ['espera','Aguardando vaga','Interesses em horários ainda ocupados','azul','Alunos que querem um horário que ainda está ocupado. Quando ele vagar, o aluno passa para "Horários liberados".'],
];

export async function montarAntecipacaoPainel(host,servico,root){
 host.antecipacaoController?.abort();const controller=new AbortController();host.antecipacaoController=controller;
 if(!document.querySelector('[data-css-antecipacao]')){const l=el('link');l.rel='stylesheet';l.href=new URL('../css/antecipacao.css',import.meta.url);l.dataset.cssAntecipacao='';document.head.append(l);}
 host.classList.add('sipa-antecipacao');const op=servico.identidade,hoje=hojeBrasil();let liberados=[],revisao=0;const selecionadas=new Set(),enviadas=new Set();
 let pedidos=[],espera=[],erroPedidos='',erroEspera='',aba=null,carregado=false;

 // ---- filtros (um cartão só, valem para as três abas)
 const unidades=UNIDADES_INSTITUCIONAIS.filter(u=>escopoPermitido(op,u.id)).map(u=>[u.id,u.nome]);
 const filtros={busca:entrada('search'),unidade:select(unidades.length>1?[['','Todas'],...unidades]:unidades,op.unidadeConsulta||op.unidade),categoria:select([['','Todas'],['A','Moto — A'],['B','Carro — B'],['D','Ônibus — D']]),de:entrada('date',hoje),ate:entrada('date',somarDias(hoje,DIAS))};
 const valoresIniciais=Object.fromEntries(Object.entries(filtros).map(([k,c])=>[k,c.value]));
 filtros.busca.placeholder='Nome ou telefone';filtros.de.min=hoje;filtros.ate.min=hoje;filtros.ate.max=somarDias(hoje,DIAS);
 const barra=el('form',undefined,'ant-filtros');barra.setAttribute('role','search');barra.setAttribute('aria-label','Filtros da antecipação');barra.onsubmit=e=>e.preventDefault();
 for(const [k,t] of [['busca','Buscar aluno'],['unidade','Unidade'],['categoria','Categoria'],['de','De'],['ate','Até']]){
  filtros[k].name=k;filtros[k].dataset.antFiltro=k;const grupo=campo(t,filtros[k]);grupo.className='ant-filtro';barra.append(grupo);
  // A busca filtra o que já foi carregado; unidade, categoria e período consultam de novo.
  filtros[k].addEventListener(k==='busca'?'input':'change',k==='busca'?desenhar:consultar);
 }
 const limpar=botao('Limpar filtros',()=>{for(const [k,c] of Object.entries(filtros))c.value=valoresIniciais[k];consultar();},'op-button op-button-outline');limpar.dataset.antLimpar='';const acoesFiltro=el('div',undefined,'ant-filtro-acoes');acoesFiltro.append(limpar);barra.append(acoesFiltro);
 const cartaoFiltros=el('div',undefined,'ant-filtros-card');cartaoFiltros.append(barra);

 // ---- indicadores = abas
 const resumo=el('div',undefined,'ant-resumo');resumo.setAttribute('role','tablist');resumo.setAttribute('aria-label','O que acompanhar na antecipação');
 const abas={},paineis={},numeros={};
 for(const [id,titulo,desc,cor,dica] of ABAS){
  const b=el('button',undefined,'ant-aba');b.type='button';b.id='ant-aba-'+id;b.dataset.antAba=id;b.dataset.cor=cor;b.setAttribute('role','tab');b.setAttribute('aria-controls','ant-painel-'+id);
  const icone=el('span',undefined,'ant-aba-icone');icone.append(svg(ICONES[id]));
  const numero=el('strong','–','ant-aba-numero');numeros[id]=numero;
  const topo=el('span',undefined,'ant-aba-topo');topo.append(numero,el('span',titulo,'ant-aba-titulo'));
  b.append(icone,topo,el('span',desc,'ant-aba-desc'));
  b.onclick=()=>mostrarAba(id,true);
  b.onkeydown=e=>{const ids=ABAS.map(a=>a[0]),i=ids.indexOf(id),alvo=e.key==='ArrowRight'?ids[(i+1)%3]:e.key==='ArrowLeft'?ids[(i+2)%3]:null;if(alvo){e.preventDefault();mostrarAba(alvo,true);abas[alvo].focus();}};
  abas[id]=b;resumo.append(b);
  const painel=el('section',undefined,'op-card ant-painel');painel.id='ant-painel-'+id;painel.dataset.cor=cor;painel.setAttribute('role','tabpanel');painel.setAttribute('aria-labelledby',b.id);painel.hidden=true;
  const cabecalho=el('div',undefined,'ant-dica');cabecalho.append(svg(ICONES.info),el('p',dica));
  painel.append(el('h2',titulo,'ant-painel-titulo'),cabecalho);paineis[id]=painel;
 }
 function mostrarAba(id,doUsuario=false){
  aba=id;if(doUsuario)abaEscolhida=true;
  for(const [k,b] of Object.entries(abas)){const sel=k===id;b.setAttribute('aria-selected',String(sel));b.tabIndex=sel?0:-1;paineis[k].hidden=!sel;}
  // Os filtros valem para as três abas: ficam dentro da aba aberta, logo abaixo da dica.
  const dica=paineis[id].querySelector('.ant-dica');if(cartaoFiltros.previousElementSibling!==dica)dica.after(cartaoFiltros);
 }
 let abaEscolhida=false;

 // ---- conteúdo de cada aba
 const retornoPedidos=el('p',undefined,'ant-retorno');retornoPedidos.setAttribute('role','status');const listaPedidos=el('div');
 paineis.pedidos.dataset.antPedidos='';paineis.pedidos.append(retornoPedidos,listaPedidos);
 const retorno=el('p',undefined,'ant-retorno');retorno.setAttribute('role','status');const lista=el('div');
 const marcarTodas=botao('Selecionar todas',()=>{const ids=visiveis().flatMap(h=>h.interessados.filter(i=>!i.ofertaEnviada).map(i=>i.id)),limparSel=ids.length>0&&ids.every(id=>selecionadas.has(id));for(const id of ids)limparSel?selecionadas.delete(id):selecionadas.add(id);desenhar();},'op-button op-button-outline');
 const enviarLote=botao('Enviar ofertas selecionadas',()=>enviar([...selecionadas]),principal);enviarLote.disabled=true;
 const selecao=el('div',undefined,'ant-acoes-lote');selecao.append(marcarTodas,enviarLote);
 paineis.liberados.append(retorno,selecao,lista);
 const listaEspera=el('div');paineis.espera.dataset.antEspera='';paineis.espera.append(listaEspera);

 const conteudo=el('div',undefined,'ant-conteudo');conteudo.append(...Object.values(paineis));
 host.replaceChildren(resumo,conteudo);
 const avisar=()=>root.dispatchEvent(new Event('sipa-antecipacao-atualizada'));

 // 10/11/2026: contato pelo chat do SIPA (no lugar do WhatsApp). O nome do aluno e o "Conversar" abrem Mensagens já na
 // conversa dele (entradaEquipeIntegrada.js ouve o evento). Sem Mensagens no painel, o nome fica só texto.
 const temChat=()=>!!root.querySelector('[data-op-nav=mensagens]');
 const conversar=(alunoId,nome)=>root.dispatchEvent(new CustomEvent('sipa-conversar-aluno',{detail:{alunoId,nome}}));
 function nomeAluno(nome,alunoId){
  if(!alunoId||!temChat())return el('strong',nome);
  const b=el('button',nome,'ant-nome-link');b.type='button';b.title='Abrir a conversa com '+nome+' no chat do AgIA';b.dataset.antConversar=alunoId;b.onclick=()=>conversar(alunoId,nome);return b;
 }
 function vazio(icone,titulo,texto){const n=el('div',undefined,'ant-vazio');n.append(svg(ICONES[icone]),el('strong',titulo),el('p',texto));return n;}
 function carregando(){const n=el('p','Consultando…','ant-carregando');return n;}

 async function consultar(){
  const pedido=++revisao;retorno.textContent='';selecionadas.clear();
  if(!filtros.de.value||!filtros.ate.value||filtros.de.value>filtros.ate.value||filtros.ate.value>somarDias(filtros.de.value,DIAS)){liberados=[];retorno.textContent='Informe um período de até '+DIAS+' dias.';desenhar();return;}
  if(!carregado){for(const n of [listaPedidos,lista,listaEspera])n.replaceChildren(carregando());}
  const f={unidade:filtros.unidade.value,categoria:filtros.categoria.value,de:filtros.de.value,ate:filtros.ate.value};
  const extras=Promise.all([servico.pedidosAdiantamento?servico.pedidosAdiantamento({unidade:f.unidade}).then(r=>[r,''],e=>[[],e.message]):[[],''],servico.consultarEmEspera?servico.consultarEmEspera(f).then(r=>[r,''],e=>[[],e.message]):[[],'']]);
  try{const r=await servico.consultarLiberados(f);if(pedido!==revisao)return;liberados=r;}
  catch(e){if(pedido!==revisao)return;liberados=[];retorno.textContent=e.message;}
  const [[p,ep],[es,ee]]=await extras;if(pedido!==revisao)return;pedidos=p;espera=es;erroPedidos=ep;erroEspera=ee;carregado=true;
  desenhar();
 }
 function combinaBusca(x){const termo=filtros.busca.value.trim().toLocaleLowerCase('pt-BR'),numeros=termo.replace(/\D/g,'');return !termo||String(x.aluno).toLocaleLowerCase('pt-BR').includes(termo)||numeros&&String(x.telefone).replace(/\D/g,'').includes(numeros);}
 function visiveis(){return liberados.map(h=>({...h,interessados:h.interessados.filter(i=>!i.ofertaEnviada&&!enviadas.has(i.id)&&combinaBusca(i))})).filter(h=>h.interessados.length);}
 function emEspera(){const naTabela=new Set(liberados.flatMap(h=>h.interessados.map(i=>i.id)));return espera.filter(x=>!naTabela.has(x.id));}

 function desenhar(){
  const totais={pedidos:pedidos.filter(combinaBusca).length,liberados:visiveis().length,espera:emEspera().filter(combinaBusca).length};
  for(const [id,n] of Object.entries(totais)){numeros[id].textContent=String(n);numeros[id].classList.toggle('zero',!n);abas[id].setAttribute('aria-label',ABAS.find(a=>a[0]===id)[1]+': '+n);}
  // Abre na primeira aba com algo a fazer (pedidos, liberados, espera), até a pessoa escolher uma.
  if(!abaEscolhida)mostrarAba(['pedidos','liberados','espera'].find(id=>totais[id])||'pedidos');
  desenharPedidos();desenharLiberados();desenharEspera();
 }

 // ---- 1. Pedidos para adiantar: cartões com o contato e o "Contato feito"
 function desenharPedidos(){
  if(erroPedidos){listaPedidos.replaceChildren(el('p',erroPedidos,'op-help'));return;}
  const ped=pedidos.filter(combinaBusca);
  if(!ped.length){listaPedidos.replaceChildren(pedidos.length?vazio('pedidos','Nenhum pedido para a busca','Limpe a busca para ver todos os pedidos.'):vazio('pedidos','Nenhum pedido em aberto','Quando um aluno clicar em "Quero adiantar minhas aulas", ele aparece aqui.'));return;}
  const grade=el('div',undefined,'ant-cards');
  for(const p of ped){
   const c=el('article',undefined,'ant-cartao');c.dataset.antPedido=p.id;
   const topo=el('div',undefined,'ant-cartao-topo'),nome=el('div',undefined,'ant-cartao-nome');
   nome.append(nomeAluno(p.aluno,p.alunoId),el('span',[formatarTelefone(p.telefone),p.unidadeNome||nomeUnidadeInstitucional(p.unidade)].filter(Boolean).join(' · ')));
   const tempo=el('span',undefined,'ant-tempo');tempo.append(svg(ICONES.relogio),el('span',haQuanto(p.pedidoEm)?'Pedido '+haQuanto(p.pedidoEm):'Pedido'));tempo.title='Pedido em '+dataHoraLocal(p.pedidoEm);
   topo.append(el('span',iniciais(p.aluno),'ant-avatar'),nome,tempo);
   // Próxima aula, agendadas e saldo em rótulo e valor (o saldo zerado em vermelho).
   const dados=el('dl',undefined,'ant-dados');
   for(const [rotulo,valor,alerta] of [['Próxima aula',p.proximaAula?dataHoraLocal(p.proximaAula):'Nenhuma agendada'],['Agendadas',String(p.aulasAgendadas)],['Saldo',plural(p.saldo,'aula','aulas'),p.saldo<=0]]){const d=el('div',undefined,'ant-dado'+(alerta?' alerta':''));d.append(el('dt',rotulo),el('dd',valor));dados.append(d);}
   // 16/11/2026 (pedido do usuário): os dias e os horários em que o aluno pode, escolhidos no pedido.
   const disp=el('div',undefined,'ant-disponibilidade');disp.dataset.antDisponibilidade=p.id;
   if(p.diasDaSemana?.length||p.horarios?.length){
    const dias=el('div',undefined,'ant-disp-linha'),horas=el('div',undefined,'ant-disp-linha');
    dias.append(el('span','Dias','ant-disp-rotulo'),...[[1,'Seg'],[2,'Ter'],[3,'Qua'],[4,'Qui'],[5,'Sex'],[6,'Sáb']].map(([n,t])=>el('span',t,'ant-disp-chip'+(p.diasDaSemana?.includes(n)?' sim':''))));
    horas.append(el('span','Horários','ant-disp-rotulo'),...(p.horarios||[]).map(h=>el('span',h,'ant-disp-chip sim')));
    disp.append(dias,horas);
   }else disp.append(el('span','O aluno não informou dias e horários.','ant-disp-vazio'));
   const acoes=el('div',undefined,'ant-cartao-acoes');
   if(p.alunoId&&temChat()){const chat=botao('',()=>conversar(p.alunoId,p.aluno),'op-button op-button-outline ant-botao-chat');chat.append(svg(ICONES.chat),el('span','Conversar'));chat.title='Abrir a conversa com '+p.aluno+' no chat do AgIA';chat.dataset.antConversar=p.alunoId;acoes.append(chat);}
   const feito=botao('',async()=>{feito.disabled=true;retornoPedidos.textContent='';try{await servico.atenderPedidoAdiantamento(p.id);pedidos=pedidos.filter(x=>x.id!==p.id);retornoPedidos.textContent='Contato registrado: '+p.aluno+' saiu da lista.';desenhar();avisar();}catch(e){feito.disabled=false;retornoPedidos.textContent=e.message;}},principal+' ant-botao-ok');
   feito.append(svg(ICONES.ok),el('span','Contato feito'));feito.dataset.antPedidoAtendido=p.id;acoes.append(feito);
   c.append(topo,dados,disp,acoes);grade.append(c);
  }
  listaPedidos.replaceChildren(grade);
 }

 // ---- 2. Horários liberados: a tabela agrupada por horário, com a seleção e o envio das ofertas
 function desenharLiberados(){
  const horarios=visiveis(),disponiveis=horarios.flatMap(h=>h.interessados.filter(i=>!i.ofertaEnviada).map(i=>i.id));marcarTodas.textContent=disponiveis.length>0&&disponiveis.every(id=>selecionadas.has(id))?'Limpar seleção':'Selecionar todas';marcarTodas.disabled=!disponiveis.length;
  selecao.hidden=!horarios.length;
  if(!horarios.length){selecionadas.clear();enviarLote.disabled=true;lista.replaceChildren(vazio('liberados','Nenhum horário liberado','Quando uma aula de um horário com interessados for cancelada, a vaga aparece aqui para você enviar a oferta.'));return;}
  const wrap=el('div',undefined,'op-table-scroll'),tabela=el('table',undefined,'op-table ant-tabela'),head=el('thead'),tr=el('tr'),colunas=['Selecionar','Aluno','Telefone','Interesse desde','Situação','Aula a antecipar','Ações'];
  wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Horários liberados com alunos interessados');
  for(const c of colunas){const th=el('th',c);th.scope='col';if(c==='Selecionar'){const todos=entrada('checkbox');todos.setAttribute('aria-label','Selecionar todas as ofertas exibidas');const ids=horarios.flatMap(h=>h.interessados.filter(i=>!i.ofertaEnviada).map(i=>i.id));todos.checked=ids.length>0&&ids.every(id=>selecionadas.has(id));todos.disabled=!ids.length;todos.onchange=()=>{for(const id of ids)todos.checked?selecionadas.add(id):selecionadas.delete(id);desenhar();};th.replaceChildren(todos);}tr.append(th);}head.append(tr);tabela.append(head);
  for(const h of horarios){
   const grupo=el('tbody',undefined,'ant-grupo'),cab=el('tr',undefined,'ant-grupo-cabecalho'),th=el('th');th.colSpan=colunas.length;th.scope='colgroup';
   const quando=el('span',diaSemana(h.data)+', '+formatarData(h.data)+' · '+h.inicio+'–'+h.fim,'ant-horario');
   th.append(quando,el('span',[(categorias[h.categoria]||'Categoria')+' ('+h.categoria+')',h.unidadeNome||nomeUnidadeInstitucional(h.unidade)].join(' · '),'ant-meta'),el('span',plural(new Set(h.pares.map(p=>p.instrutorId||p.veiculoId)).size,'vaga livre','vagas livres'),'ant-estado livre'));
   cab.append(th);grupo.append(cab);
   for(const i of h.interessados){
    const linha=el('tr'),nome=nomeAluno(i.aluno,i.alunoId),situacao=el('span',i.ofertaEnviada?'Oferta enviada':i.situacao,'ant-situacao'),noPrazo=i.aulas.filter(a=>a.dentroPrazo);
    linha.dataset.antInteresse=i.id;situacao.dataset.situacao=i.situacao;if(i.contatadoEm||i.observacao)situacao.title=[i.contatadoEm&&'Contatado em '+dataRelatorio(i.contatadoEm),i.observacao].filter(Boolean).join(' · ');
    const aula=noPrazo.length?aulaTexto(noPrazo[0])+(noPrazo.length>1?' (+'+(noPrazo.length-1)+')':''):i.saldo>0?'Aula nova (saldo de '+plural(i.saldo,'aula','aulas')+')':i.aulas.length?'Fora do prazo ('+Math.min(...i.aulas.map(a=>a.horasUteis??0))+' h úteis)':'Nenhuma aula futura';
    const escolher=entrada('checkbox');escolher.setAttribute('aria-label','Selecionar oferta para '+i.aluno+' às '+h.inicio);escolher.disabled=i.ofertaEnviada;escolher.checked=selecionadas.has(i.id);escolher.onchange=()=>{escolher.checked?selecionadas.add(i.id):selecionadas.delete(i.id);desenhar();};
    const enviarUma=botao(i.ofertaEnviada?'Oferta enviada':'Enviar oferta',()=>enviar([i.id]),'op-button op-button-outline');enviarUma.disabled=i.ofertaEnviada;
    for(const [k,v] of [['Selecionar',escolher],['Aluno',nome],['Telefone',formatarTelefone(i.telefone)],['Interesse desde',i.marcadoEm?dataRelatorio(i.marcadoEm):'Não informado'],['Situação',situacao],['Aula a antecipar',aula],['Ações',enviarUma]]){const td=el('td');td.dataset.rotulo=k;td.append(v instanceof Node?v:document.createTextNode(v));linha.append(td);}
    if(!noPrazo.length)linha.querySelector('[data-rotulo="Aula a antecipar"]').title=i.saldo>0?dicaAulaNova:dicaPrazo(h.prazo);
    grupo.append(linha);
   }
   tabela.append(grupo);
  }
  enviarLote.disabled=!selecionadas.size;enviarLote.textContent='Enviar ofertas selecionadas'+(selecionadas.size?' ('+selecionadas.size+')':'');
  wrap.append(tabela);lista.replaceChildren(wrap);
 }

 // ---- 3. Aguardando vaga: agrupado por horário desejado, com o que acontece quando vagar
 function desenharEspera(){
  if(erroEspera){listaEspera.replaceChildren(el('p',erroEspera,'op-help'));return;}
  const esp=emEspera().filter(combinaBusca);
  if(!esp.length){listaEspera.replaceChildren(espera.length&&filtros.busca.value.trim()?vazio('espera','Nenhum interesse para a busca','Limpe a busca para ver todos.'):vazio('espera','Nenhum interesse aguardando vaga','Quando um aluno marcar "Tenho interesse" num horário ocupado, ele aparece aqui.'));return;}
  const grupos=new Map();
  for(const x of esp){const chave=[x.data,x.inicio,x.categoria,x.unidade].join('|');if(!grupos.has(chave))grupos.set(chave,[]);grupos.get(chave).push(x);}
  const caixa=el('div',undefined,'ant-grupos-espera');
  for(const itens of grupos.values()){
   const x0=itens[0],g=el('section',undefined,'ant-grupo-espera'),cab=el('header');
   cab.append(el('strong',diaSemana(x0.data)+', '+formatarData(x0.data)+' · '+x0.inicio+'–'+x0.fim,'ant-horario'),el('span',[(categorias[x0.categoria]||'Categoria')+' ('+x0.categoria+')',x0.unidadeNome||nomeUnidadeInstitucional(x0.unidade),plural(itens.length,'interessado','interessados')].join(' · '),'ant-meta'),el('span','Ainda ocupado','ant-estado ocupado'));
   const ul=el('ul',undefined,'ant-lista-espera');
   for(const x of itens){
    const li=el('li');li.dataset.antEsperaItem=x.id;
    const nome=el('div',undefined,'ant-cartao-nome');nome.append(nomeAluno(x.aluno,x.alunoId),el('span',[formatarTelefone(x.telefone),x.marcadoEm?'interesse desde '+dataRelatorio(x.marcadoEm):''].filter(Boolean).join(' · ')));
    const quando=el('div',undefined,'ant-quando'+(x.aulaParaAntecipar||x.saldo>0?'':' alerta'));
    quando.append(el('span','Quando vagar'),el('strong',x.aulaParaAntecipar?'Antecipa a aula de '+dataHoraLocal(x.aulaParaAntecipar):x.saldo>0?'Aula nova (saldo de '+plural(x.saldo,'aula','aulas')+')':'Sem saldo nem aula para antecipar'));
    li.append(el('span',iniciais(x.aluno),'ant-avatar'),nome,quando);ul.append(li);
   }
   g.append(cab,ul);caixa.append(g);
  }
  listaEspera.replaceChildren(caixa);
 }

 // Diálogo curto das ações: título, resumo, campos e Confirmar. Fecha e recarrega a lista quando dá certo.
 function dialogo(titulo,id,conteudoDialogo,rotulo,executar){
  const d=modal(root,titulo,id),f=el('form',undefined,'adm-form'),erro=el('p',undefined,'op-acompanhamento-erro'),rodape=el('footer',undefined,'op-dialog-actions'),confirmar=el('button',rotulo,principal);let ocupado=false;
  d.classList.add('adm-dialog','ant-dialogo');erro.setAttribute('role','alert');confirmar.type='submit';const voltar=botao('Voltar',()=>{if(!ocupado)d.close();});rodape.append(voltar,confirmar);f.append(...conteudoDialogo,erro,rodape);d.append(f);
  f.onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;confirmar.disabled=true;voltar.disabled=true;erro.textContent='';
   try{const texto=await executar();d.close();avisar();const sucesso=mostrarAviso(root,'Ofertas enviadas com sucesso!','antEnvioConcluido',el('p',texto+' Os alunos podem consultar as ofertas em Mensagens.'));sucesso.classList.add('ant-envio-sucesso');const icone=el('span','✓','ant-envio-icone');icone.setAttribute('aria-hidden','true');sucesso.prepend(icone);sucesso.querySelector('.op-button')?.focus();await consultar();}catch(x){erro.textContent=x.message||'Não foi possível concluir a operação.';}finally{ocupado=false;confirmar.disabled=false;voltar.disabled=false;}};
  d.oncancel=e=>{if(ocupado)e.preventDefault();};d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
 }
 function enviar(ids){
  if(!ids.length)return;const chave=crypto.randomUUID();
  dialogo('Enviar oferta de vaga','antEnviarOferta',[el('p',ids.length+' oferta(s) serão enviadas à caixa de mensagens dos alunos. O envio não reserva as vagas: o primeiro aluno a aceitar fica com o horário e os demais são avisados.')],'Enviar ofertas',async()=>{const r=await servico.enviarOfertas(ids,{unidade:filtros.unidade.value},chave);++revisao;for(const id of ids)enviadas.add(id);selecionadas.clear();desenhar();return (r.enviadas??0)+' oferta(s) enviada(s).';});
 }
 mostrarAba('pedidos');
 window.addEventListener('focus',()=>{if(!host.hidden&&!root.querySelector('dialog[open]'))consultar();},{signal:controller.signal});
 await consultar();
}
