import {nomeCambio} from '../../shared/js/operacaoCarro.js';
import {NOMES_CATEGORIA,localDaReservaOperacional} from '../../shared/js/categorias.js';
import {localDaReserva} from '../../shared/components/localAula.js';
import {periodoMensal,moverMes,validarPeriodo,consultarAbaHistorico,paginarHistorico,numerosPaginas} from './historico.js';
import {hojeBrasil,formatarData} from '../../shared/js/calendario.js';
import {obterUnidadeInstitucional,pesquisaMapsUnidade} from '../../shared/js/catalogoUnidades.js';
import {STATUS,podeRegistrar,resumoInstrutor} from './dominio.js';
import {agruparFaixas,resumoDoDia,proximaDoDia,aulaAtiva} from './agenda.js';
import {painelDesempenho,aulasDaSemana,escalaEixo} from '../../shared/js/desempenhoInstrutor.js';
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const paths={home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z"/>',calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-12 4h1m4 0h1"/>',history:'<path d="M4 3h16v18H4zM8 7h8M8 11h8m-8 4h5"/>',user:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',exit:'<path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h12"/>',menu:'<path d="M4 6h16M4 12h16M4 18h16"/>',moon:'<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>',sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>',check:'<path d="m5 12 4 4L19 6"/>',info:'<circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/>',left:'<path d="m14 5-7 7 7 7"/>',right:'<path d="m10 5 7 7-7 7"/>',close:'<path d="m6 6 12 12M6 18 18 6"/>'};
function icone(nome){const s=document.createElementNS('http://www.w3.org/2000/svg','svg');s.setAttribute('viewBox','0 0 24 24');s.setAttribute('aria-hidden','true');s.classList.add('in-icon');s.innerHTML=paths[nome]||paths.info;return s;}
export function marca(){const n=el('div',null,'in-brand');n.innerHTML='<svg viewBox="0 0 64 70" aria-hidden="true"><path d="M52 12H29C17 12 9 20 9 31C9 40 14 46 23 48L42 52C46 53 48 55 48 58C48 61 46 63 41 63H18"/><path d="M18 58H41C53 58 61 50 61 39C61 30 56 24 47 22L28 18C24 17 22 15 22 12"/></svg><div><strong>SIPA</strong><small>SISTEMA INTELIGENTE<br>PARA AGENDAMENTOS</small></div>';return n;}
export function aplicarTema(tema=globalThis.SipaTema.ler()){globalThis.SipaTema.aplicar(tema);}
const data=v=>new Date(v).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric'});
const hora=v=>new Date(v).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
const periodo=a=>hora(a.inicio)+' às '+hora(a.fim);
function campos(pares){const dl=el('dl',null,'in-dl');for(const [titulo,valor,wide] of pares){const div=el('div',null,wide?'wide':null);div.append(el('dt',titulo),el('dd',valor||'Não informado'));dl.append(div);}return dl;}
function botao(texto,acao,classe='in-button'){const b=el('button',texto,classe);b.type='button';b.onclick=acao;return b;}
const svgEl=(tag,atributos={},texto)=>{const n=document.createElementNS('http://www.w3.org/2000/svg',tag);for(const [k,v] of Object.entries(atributos))n.setAttribute(k,v);if(texto!=null)n.textContent=texto;return n;};
const contar=(n,palavra)=>n+' '+palavra+(n===1?'':'s');
export async function montarPainel(root,servico,{aoSair}={}){
 let estado=await servico.dados(),secao=['inicio','agenda','historico','perfil'].includes(location.hash.slice(1))?location.hash.slice(1):'inicio',agendaAtual=await servico.agendaHoje(),filtro='dia',diasDesempenho=30,cadastros=servico.cadastrosLocais?await servico.cadastrosLocais():[];
 const consultaHistorico={mes:null,periodo:null,aberto:false,inicio:'',fim:'',pagina:1,situacao:'todas'};
 const vida=new AbortController(),signal=vida.signal;root.replaceChildren();root.className='in-shell';
 const side=el('aside',null,'in-sidebar');side.id='in-sidebar';side.setAttribute('aria-label','Navegação do Instrutor');const fecharGaveta=botao('',()=>fecharMenu(true),'in-icon-button in-drawer-close');fecharGaveta.append(icone('close'));fecharGaveta.setAttribute('aria-label','Fechar menu');side.append(fecharGaveta,marca());const nav=el('nav');nav.setAttribute('aria-label','Menu do Instrutor');nav.append(el('p','Menu','in-nav-label'));
 for(const [id,texto,icon] of [['inicio','Início','home'],['agenda','Minha agenda','calendar'],['historico','Histórico','history'],['perfil','Meu perfil','user']]){if(id==='perfil')nav.append(el('p','Conta','in-nav-label'));const a=el('a');a.href='#'+id;a.dataset.nav=id;a.append(icone(icon),el('span',texto));nav.append(a);}side.append(nav);const foot=el('footer'),sair=botao('Sair da conta',()=>{encerrar();aoSair?.();});sair.prepend(icone('exit'));foot.append(sair);side.append(foot);
 // Até 1024px o menu vira gaveta: barra fixa no topo com menu e tema, véu que fecha ao tocar e conteúdo inerte enquanto aberta.
 const main=el('main',null,'in-main'),barra=el('div',null,'in-topbar'),veu=el('div',null,'in-drawer-backdrop'),telaEstreita=matchMedia('(max-width:1024px)');veu.hidden=true;veu.onclick=()=>fecharMenu(true);main.append(barra);if(servico.demonstracao){const faixa=el('div',null,'in-demo-banner');faixa.append(el('span','Desenvolvimento local · Dados fictícios · Sem conexão com a API'),botao('Reiniciar dados fictícios',()=>confirmarReinicio(),'in-link-button'));main.append(faixa);}
 const header=el('header',null,'in-header'),titulos=el('div'),h1=el('h1'),sub=el('p'),acoes=el('div',null,'in-header-actions');h1.tabIndex=-1;titulos.append(h1,sub);const menu=botao('',()=>{if(side.classList.contains('open'))fecharMenu(true);else abrirMenu();},'in-icon-button in-mobile-toggle');menu.append(icone('menu'));menu.setAttribute('aria-label','Abrir menu');menu.setAttribute('aria-controls',side.id);menu.setAttribute('aria-expanded','false');const tema=globalThis.SipaTema.montarBotao();tema.classList.add('in-icon-button');header.append(titulos,acoes);main.append(header);
 function posicionarTopo(){(telaEstreita.matches?barra:acoes).append(menu,tema);if(!telaEstreita.matches)fecharMenu();}
 const feedback=el('p',null,'in-feedback');feedback.setAttribute('role','status');feedback.hidden=true;const conteudo=el('div');conteudo.id='in-content';main.append(feedback,conteudo);const rodape=el('footer',null,'in-footer');rodape.append(el('span','SIPA · Ambiente do Instrutor'),el('span',servico.demonstracao?'Demonstração local':'Acesso individual'));main.append(rodape);root.append(side,veu,main);
 // Dica única dos gráficos do Início: segue o ponteiro (no toque, acima do dedo) e some ao rolar, ao tocar fora e a cada nova renderização.
 const dica=el('div',null,'in-tooltip');dica.setAttribute('aria-hidden','true');dica.hidden=true;root.append(dica);
 function posicionarDica(e){dica.hidden=false;const raiz=document.documentElement,w=dica.offsetWidth,h=dica.offsetHeight,toque=e.pointerType!=='mouse';let topo=toque?e.clientY-h-16:e.clientY+14;if(topo<8)topo=e.clientY+24;dica.style.left=Math.max(8,Math.min(toque?e.clientX-w/2:e.clientX+14,raiz.clientWidth-w-8))+'px';dica.style.top=Math.max(8,Math.min(topo,raiz.clientHeight-h-8))+'px';}
 addEventListener('scroll',()=>{dica.hidden=true;},{capture:true,passive:true,signal});document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('.in-chart-svg'))dica.hidden=true;},{signal});
 function avisar(texto){feedback.textContent=texto;feedback.hidden=!texto;}
 function badge(a){return el('span',STATUS[a.status]||'Não informada','in-badge in-status-'+a.status);}
 // Veículo da aula: o da própria aula ou o vinculado, só quando a aula aponta para ele.
 const veiculoDaAula=a=>a.veiculo||((a.veiculoId===estado.veiculo?.id)?estado.veiculo:null);
 function dadosAula(a){const unidade=obterUnidadeInstitucional(a.unidade),veiculo=veiculoDaAula(a);return [['Aluno',a.aluno.nome],['Data',data(a.inicio)],['Horário',periodo(a)],['Categoria',a.categoria+' — '+(NOMES_CATEGORIA[a.categoria]||'Categoria não informada')],[a.categoria==='D'?'Vínculo administrativo':'Unidade',unidade?.nome||a.unidade],...(a.categoria==='B'?[['Tipo de carro',nomeCambio(a.tipoCambio)]]:[]),['Local',localDaReservaOperacional(a)?.nome],['Endereço',localDaReservaOperacional(a)?.endereco||a.endereco||unidade?.enderecoCompleto,true],['Instrutor',a.instrutor?.nome||(a.instrutorId===estado.instrutor.id?estado.instrutor.nome:null)],['Veículo',veiculo?.modelo],['Placa'+(servico.demonstracao?' de demonstração':''),veiculo?.placa],['Situação',STATUS[a.status]]];}
 function dialogo(titulo,mensagem,origem){const d=el('dialog',null,'in-dialog');const tituloId='in-dialog-title-'+crypto.randomUUID();d.setAttribute('aria-labelledby',tituloId);const header=el('header'),h=el('h2',titulo);h.id=tituloId;h.tabIndex=-1;header.append(icone('info'),h);d.append(header,el('p',mensagem));d.onclose=()=>{d.remove();if(document.querySelector('dialog[open]'))return;if(origem?.isConnected)origem.focus();else document.querySelector('.in-header h1')?.focus({preventScroll:true});};document.body.append(d);return d;}
 function detalhes(a,origem,somenteLeitura=false){
  const d=dialogo('Detalhes da aula',servico.demonstracao?'Registro de demonstração local · Sem conexão com a API.':'Confira os dados e as alterações registradas.',origem);d.classList.add('in-lesson-dialog');
  const fechar=botao('×',()=>d.close(),'in-icon-button in-dialog-close');fechar.setAttribute('aria-label','Fechar detalhes da aula');d.querySelector('header').append(fechar);
  const corpo=el('div',null,'in-lesson-content'),identidade=el('div',null,'in-lesson-head');identidade.append(el('strong',a.aluno.nome),badge(a));corpo.append(identidade,el('h3','Informações da aula'));
  const camposDaAula=dadosAula(a).filter(([titulo])=>!['Aluno','Local','Endereço','Situação'].includes(titulo));corpo.append(campos(camposDaAula));
  const local=el('section',null,'in-lesson-location');local.append(el('h3','Local da aula'),localDaReserva(a));corpo.append(local);
  if(a.duracaoAnterior)corpo.append(el('p','Registro anterior: o horário de término original foi preservado. Novas aulas têm duração de 50 minutos.','in-register-note'));
  const eventos=el('section',null,'in-events');eventos.append(el('h3','Histórico'));for(const e of a.historico||[]){const texto=e.acao==='cenario_demonstracao'?'Cenário de demonstração':STATUS[e.status]||e.descricao||'Atualização';eventos.append(el('p',texto+' · '+data(e.em)+' às '+hora(e.em)));}if(!(a.historico||[]).length)eventos.append(el('p','Sem informações adicionais.'));corpo.append(eventos);d.append(corpo);
  const f=el('footer',null,'in-lesson-result');
  if(a.status===1&&!somenteLeitura){
   f.append(el('h3','Registrar resultado da aula'));const permitido=podeRegistrar(a,estado.instrutor.id);if(!permitido)f.append(el('p','O registro estará disponível quando a aula confirmada começar.','in-register-note'));
   const acoes=el('div',null,'in-result-actions');for(const [status,texto] of [[5,'Aluno presente'],[6,'Aluno faltou']]){const b=botao(texto,()=>{d.close();confirmar(a,status,origem,()=>detalhes(estado.aulas.find(item=>item.id===a.id)||a,origem,somenteLeitura));},status===5?'in-button in-primary':'in-button');const icon=icone(status===5?'check':'info');if(status===6)icon.innerHTML='<path d="m6 6 12 12M6 18 18 6"/>';b.prepend(icon);b.dataset.registrar=status;b.disabled=!permitido;acoes.append(b);}f.append(acoes);
  }else f.append(el('p',somenteLeitura==='consulta'?'Consulta do histórico. O registro de presença e falta é feito em Minha agenda.':somenteLeitura?'Registro inconsistente, disponível para consulta. A correção exige autorização.':'Resultado encerrado. Alterações exigem um procedimento de correção autorizado.','in-register-note'));
  d.append(f);d.showModal();d.querySelector('h2').focus();
 }
 function confirmar(a,status,origem,aoCancelar){
  const realizada=status===5,d=dialogo(realizada?'Confirmar presença':'Confirmar falta',`Você confirma que o aluno ${a.aluno.nome} ${realizada?'compareceu e realizou a aula':'não compareceu à aula'} do dia ${data(a.inicio)}, às ${hora(a.inicio)}?`,origem);d.classList.add('in-result-dialog');let concluida=false;
  const fechar=d.onclose;d.onclose=()=>{fechar();if(!concluida)aoCancelar?.();};
  const erro=el('p');erro.setAttribute('role','alert');const f=el('footer'),voltar=botao('Cancelar',()=>d.close()),ok=botao(realizada?'Confirmar presença':'Confirmar falta',async()=>{
   if(ok.disabled)return;ok.disabled=true;voltar.disabled=true;d.setAttribute('aria-busy','true');
   try{estado=await servico.registrar(a.id,status);agendaAtual=await servico.agendaHoje();concluida=true;d.close();render();avisar(realizada?'Aula registrada como realizada.':'Falta do aluno registrada.');}catch(e){erro.textContent=e.message;ok.disabled=false;voltar.disabled=false;}finally{d.removeAttribute('aria-busy');}
  },'in-button in-primary');ok.dataset.confirmar=status;f.append(voltar,ok);d.append(erro,f);d.oncancel=e=>{if(ok.disabled)e.preventDefault();};d.showModal();d.querySelector('h2').focus();
 }
 function linha(a,acoes=true){const n=el('article',null,'in-row');n.dataset.aula=a.id;n.append(el('p',periodo(a),'in-row-time'));const texto=el('div');texto.append(el('strong',a.aluno.nome),el('p','Categoria '+a.categoria+' · '+(obterUnidadeInstitucional(a.unidade)?.nome||a.unidade)));if(acoes)texto.append(el('small',(a.veiculo||estado.veiculo).modelo+' · '+(a.veiculo||estado.veiculo).placa));n.append(texto,badge(a));const controles=el('div',null,'in-row-actions');const ver=botao('Ver detalhes',()=>detalhes(a,ver,secao==='historico'?'consulta':false));controles.append(ver);
 if(acoes&&a.status===1){for(const [status,texto] of [[5,'Aula realizada'],[6,'Aluno faltou']]){const b=botao(texto,()=>confirmar(a,status,b));b.dataset.registrar=status;b.disabled=!podeRegistrar(a,estado.instrutor.id);if(b.disabled)b.title='Disponível quando a aula confirmada já tiver começado.';controles.append(b);}}
 n.append(controles);return n;}
 function lista(aulas,acoes=true){const l=el('div',null,'in-list');for(const a of aulas)l.append(linha(a,acoes));if(!aulas.length)l.append(el('p','Nenhuma aula neste período.','in-empty'));return l;}
 function inicio(){
 const resumo=resumoInstrutor(estado,estado.instrutor.id),metricas=el('div',null,'in-metrics');
 for(const [texto,n,atributo] of [['Agendadas hoje',resumo.agendadas,'agendadas'],['Realizadas hoje',resumo.realizadas,'realizadas'],['Faltas hoje',resumo.faltas,'faltas'],['Realizadas no mês',resumo.realizadasMes,'realizadas-mes']]){const c=el('article',null,'in-card in-metric'),valor=el('strong',String(n));valor.dataset.metrica=atributo;c.append(el('span',texto),valor);metricas.append(c);}conteudo.append(metricas);const resumoSemana=el('div',null,'in-performance-summary');for(const [texto,n,chave] of [['Realizadas na semana',resumo.realizadasSemana,'realizadas-semana'],['Presenças no mês',resumo.presencasMes,'presencas-mes'],['Faltas no mês',resumo.faltasMes,'faltas-mes']]){const v=el('strong',String(n));v.dataset.metrica=chave;const item=el('span');item.append(el('span',texto+' '),v);resumoSemana.append(item);}conteudo.append(resumoSemana);
 const proxima=el('section',null,'in-card in-next-lesson');proxima.id='in-proxima';proxima.append(el('h2','Próxima aula'));
 if(resumo.proxima){const a=resumo.proxima,h=el('div',null,'in-lesson-head');h.append(el('strong',a.aluno.nome),badge(a));proxima.append(h,campos(dadosAula(a).filter(([campo])=>!['Aluno','Situação','Endereço','Instrutor'].includes(campo))));}
 else{proxima.classList.add('is-empty');proxima.append(el('p','Nenhuma outra aula confirmada hoje.','in-empty'));}
 conteudo.append(proxima,desempenho());
 }
 // Meu desempenho: indicadores e gráficos dos últimos 30 ou 90 dias com as aulas já carregadas.
 function desempenho(){
  const p=painelDesempenho(estado.aulas,estado.instrutor.id,diasDesempenho),bloco=el('section',null,'in-performance'),topo=el('div',null,'in-performance-head'),titulo=el('h2','Meu desempenho'),filtros=el('div',null,'in-segmented');bloco.setAttribute('aria-labelledby','in-performance-title');titulo.id='in-performance-title';filtros.setAttribute('role','group');filtros.setAttribute('aria-label','Período do desempenho');
  for(const n of [30,90]){const b=botao(n+' dias',()=>{if(diasDesempenho===n)return;diasDesempenho=n;dica.hidden=true;const novo=desempenho();bloco.replaceWith(novo);novo.querySelector('[data-dias="'+n+'"]').focus();},'');b.dataset.dias=n;b.setAttribute('aria-pressed',String(diasDesempenho===n));filtros.append(b);}
  topo.append(titulo,filtros);const kpis=el('div',null,'in-kpis');
  function kpi(texto,valor,detalhe,chave){const c=el('article',null,'in-card in-kpi'),v=el('strong',valor),d=el('small',detalhe);v.dataset.desempenho=chave;c.append(el('span',texto),v,d);kpis.append(c);return c;}
  const presenca=kpi('Presença dos alunos',p.presenca==null?'—':p.presenca+'%',p.presenca==null?'Sem registros no período':contar(p.realizadas,'realizada')+' · '+contar(p.faltas,'falta'),'presenca');
  if(p.presenca!=null){const m=el('div',null,'in-meter'),i=el('i');m.setAttribute('aria-hidden','true');i.style.width=p.presenca+'%';m.append(i);presenca.append(m);}
  kpi('Aulas realizadas',String(p.realizadas),'Média de '+p.mediaSemana.toLocaleString('pt-BR')+' por semana','realizadas');
  const pendente=kpi('Aguardando registro',String(p.aguardandoRegistro),p.aguardandoRegistro?'Aulas passadas sem realizada ou falta':'Nenhuma aula pendente','aguardando');if(p.aguardandoRegistro)pendente.querySelector('small').prepend(icone('info'));
  const graficos=el('div',null,'in-charts');
  function cartao(titulo,texto,corpo){const c=el('section',null,'in-card in-chart');c.append(el('h3',titulo),el('p',texto,'in-chart-hint'),corpo);graficos.append(c);}
  cartao('Aulas por semana','Realizadas e faltas dos alunos',graficoSemanas(p.semanas));
  bloco.append(topo,kpis,graficos);return bloco;
 }
 // Barras empilhadas (realizadas embaixo, faltas em cima) redesenhadas na largura real, sem texto escalado.
 function graficoSemanas(semanas){
  if(!semanas.some(s=>s.realizadas+s.faltas))return el('p','Sem aulas registradas no período.','in-chart-empty');
  const caixa=el('div'),legenda=el('div',null,'in-legend');for(const [texto,classe] of [['Realizadas','in-serie-real'],['Faltas','in-serie-falta']]){const s=el('span',texto);s.prepend(el('i',null,classe));legenda.append(s);}
  const nomeSemana=s=>'Semana de '+s.rotulo+(s.desde?' (contada desde '+s.desde+')':''),ticks=escalaEixo(Math.max(...semanas.map(s=>s.realizadas+s.faltas))),maximo=ticks.at(-1),H=170,L=26,B=146,T=8,y=v=>B-(B-T)*v/maximo;
  const svg=svgEl('svg',{class:'in-chart-svg',role:'img','aria-label':'Aulas por semana. '+semanas.map(s=>nomeSemana(s)+': '+contar(s.realizadas,'realizada')+' e '+contar(s.faltas,'falta')).join('; ')});let W=520,sumir=0;
  function desenhar(nova){W=nova;svg.setAttribute('viewBox','0 0 '+W+' '+H);svg.replaceChildren();const bw=(W-L)/semanas.length,salto=Math.max(1,Math.ceil(40/bw));
   for(const v of ticks)svg.append(svgEl('line',{x1:L,x2:W,y1:y(v),y2:y(v),class:'in-grid-line'}),svgEl('text',{x:L-6,y:y(v)+4,'text-anchor':'end'},String(v)));
   semanas.forEach((s,i)=>{const g=svgEl('g'),w=Math.min(28,bw*.6),x=L+i*bw+(bw-w)/2,hr=B-y(s.realizadas),hf=B-y(s.faltas);
    if(s.realizadas)g.append(svgEl('rect',{x,y:B-hr,width:w,height:hr,rx:3,class:'in-serie-real'}));
    if(s.faltas)g.append(svgEl('rect',{x,y:B-hr-hf-(s.realizadas?2:0),width:w,height:hf,rx:3,class:'in-serie-falta'}));
    svg.append(g);
    if((semanas.length-1-i)%salto===0)svg.append(svgEl('text',{x:x+w/2,y:B+16,'text-anchor':'middle'},s.rotulo));});}
  // A semana sai da posição x do ponteiro no svg inteiro: o dedo desliza sobre as barras estreitas sem precisar acertar cada uma.
  function mostrar(e){const r=svg.getBoundingClientRect();if(!r.width)return;const i=Math.floor(((e.clientX-r.left)*W/r.width-L)/((W-L)/semanas.length));if(i<0||i>=semanas.length){dica.hidden=true;return;}const s=semanas[i];dica.replaceChildren(el('strong',nomeSemana(s)),el('span',contar(s.realizadas,'realizada')+' · '+contar(s.faltas,'falta')));posicionarDica(e);clearTimeout(sumir);if(e.pointerType!=='mouse')sumir=setTimeout(()=>{dica.hidden=true;},2500);}
  svg.addEventListener('pointerdown',mostrar);svg.addEventListener('pointermove',mostrar);svg.addEventListener('pointerleave',e=>{if(e.pointerType==='mouse')dica.hidden=true;});svg.addEventListener('pointercancel',()=>{dica.hidden=true;});
  desenhar(520);let largura=0;if(globalThis.ResizeObserver){const ro=new ResizeObserver(([e])=>{if(!svg.isConnected){ro.disconnect();return;}const w=Math.round(e.contentRect.width);if(w&&w!==largura){largura=w;desenhar(w);}});ro.observe(svg);}
  caixa.append(legenda,svg);return caixa;
 }
 function agenda(){
 if(agendaAtual.erro){conteudo.append(el('p',agendaAtual.erro,'in-empty'));return;}
 const {dia,agora,fechamento,faixas,periodoExibicao,aulas,inconsistencias}=agendaAtual;
 const layout=el('div',null,'in-agenda-layout'),card=el('section',null,'in-agenda'),toolbar=el('div',null,'in-agenda-toolbar');card.setAttribute('aria-label','Agenda de hoje do Instrutor');
 const diaExtenso=new Date(dia+'T12:00:00-03:00').toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',weekday:'long',day:'2-digit',month:'long',year:'numeric'});
 const titulo=el('div',null,'in-agenda-date');const ativas=aulas.filter(aulaAtiva).length;titulo.append(el('h2',diaExtenso),el('p',[ativas?contar(ativas,'aula'):'Nenhuma aula',faixas.length?periodoExibicao.replace(' — ',' às '):'Sem expediente','Horário de Brasília'].join(' · '),'muted'));titulo.setAttribute('aria-live','polite');toolbar.append(titulo);
 if(servico.vincularCadastro){const label=el('label','Cadastro local de teste','in-cadastro-label'),select=el('select');select.setAttribute('aria-label','Cadastro do instrutor no ambiente local');const atual=servico.vinculoAtual();const original=el('option','Cadastro original preservado');original.value='cenario';select.append(original);const grupos={aluno:el('optgroup'),operador:el('optgroup')};grupos.aluno.label='Aluno';grupos.operador.label='Operador';for(const c of cadastros){const o=el('option',c.nome+' · '+c.unidade);o.value=JSON.stringify([c.origem,c.id]);grupos[c.origem==='aluno'?'aluno':'operador'].append(o);}for(const g of Object.values(grupos))if(g.children.length)select.append(g);select.value=atual.origem==='cenario'?'cenario':JSON.stringify([atual.origem,atual.id]);select.onchange=async()=>{select.disabled=true;try{await servico.vincularCadastro(select.value);estado=await servico.dados();agendaAtual=await servico.agendaHoje();render();}catch(e){avisar(e.message);select.disabled=false;}};label.append(select);toolbar.append(label);}
 card.append(toolbar);
 function bloco(aula,somenteLeitura=false){const abrir=botao('',()=>detalhes(aula,abrir,somenteLeitura),'in-agenda-lesson');abrir.dataset.aula=aula.id;abrir.setAttribute('aria-label',aula.aluno.nome+', '+periodo(aula)+', Categoria '+aula.categoria+', '+STATUS[aula.status]+'. Abrir detalhes');const corpo=el('div',null,'in-agenda-body');corpo.append(el('strong',aula.aluno.nome),el('span','Categoria '+aula.categoria+' · '+periodo(aula)+' · '+(localDaReservaOperacional(aula)?.nome||obterUnidadeInstitucional(aula.unidade)?.nome||aula.unidade),'in-agenda-meta'));abrir.append(corpo,badge(aula),icone('right'));return abrir;}
 function conferir(grupo,titulo,origem){const d=dialogo(titulo,'Dados originais preservados. Selecione um registro para consultar os detalhes.',origem);for(const aula of grupo){const b=bloco(aula,inconsistencias.includes(aula));b.onclick=()=>{d.close();d.remove();detalhes(aula,origem,inconsistencias.includes(aula));};d.append(b);}d.classList.add('in-review-dialog');const f=el('footer');f.append(botao('Fechar',()=>d.close()));d.append(f);d.showModal();}
 if(fechamento)card.append(el('div','Hoje não há expediente. '+fechamento+'.','in-empty'));
 else{
 const grade=el('div',null,'in-timeline');grade.setAttribute('aria-label','Expediente de hoje. Faixas vazias não indicam disponibilidade para agendamento.');
 for(const item of agruparFaixas(faixas,aulas)){const linha=el('div',null,'in-time-slot'),varias=item.faixas.length>1;linha.dataset.horario=item.inicio;if(varias)linha.dataset.ate=item.ate;const tempo=el('time',item.inicio,'in-slot-time');tempo.dateTime=dia+'T'+item.inicio+':00-03:00';const conteudoFaixa=el('div',null,'in-slot-content');
 if(item.tipo==='pausa'){const motivo=item.motivo||'Fora do expediente';linha.classList.add('in-blocked');conteudoFaixa.setAttribute('aria-label',motivo+(varias?' até '+item.ate:''));conteudoFaixa.append(el('small',motivo+(varias?' · até '+item.ate:'')));}
 else if(item.tipo==='livre'){linha.classList.add('in-free');conteudoFaixa.append(el('small','Livre'+(varias?' · até '+item.ate:'')));}
 else{const grupo=item.aulas;if(grupo.length===1)conteudoFaixa.append(bloco(grupo[0]));else{const ver=botao(grupo.length+' registros neste horário',()=>conferir(grupo,'Registros do horário '+item.inicio,ver),'in-agenda-lesson');conteudoFaixa.append(ver);}linha.classList.add('has-lessons');}
 if(agora.slice(11,16)>=item.inicio&&agora.slice(11,16)<item.fim){linha.classList.add('in-current');tempo.setAttribute('aria-label','Faixa atual de Brasília: '+item.inicio);}
 linha.append(tempo,conteudoFaixa);grade.append(linha);}
 card.append(grade);
 }
 if(inconsistencias.length){const ver=botao('Conferir '+inconsistencias.length+' registro(s) preservado(s) com pendência de horário',()=>conferir(inconsistencias,'Conferência de registros preservados',ver),'in-review-records');ver.dataset.revisar='true';card.append(ver);}
 layout.append(card,ladoDaAgenda());conteudo.append(layout);
 }
 // Coluna da direita: resumo do dia, aula a registrar (mesmo fluxo de confirmar) e contagem da semana.
 function ladoDaAgenda(){
  const lado=el('div',null,'in-agenda-side'),r=resumoDoDia(agendaAtual),resumo=el('section',null,'in-card in-side-card'),numeros=el('div',null,'in-day-stats');resumo.setAttribute('aria-label','Resumo do dia');resumo.append(el('h3','Resumo do dia'));
  for(const [texto,valor,chave] of [['Aulas',String(r.aulas),'aulas'],['Realizadas',String(r.realizadas),'realizadas'],['Livres',r.horasLivres+' h','livres']]){const d=el('div'),v=el('strong',valor);v.dataset.resumo=chave;d.append(el('span',texto),v);numeros.append(d);}resumo.append(numeros);
  const a=proximaDoDia(agendaAtual.aulas),proxima=el('section',null,'in-card in-side-card');proxima.id='in-agenda-proxima';
  if(a){const veiculo=veiculoDaAula(a),agora=Date.now();proxima.append(el('h3',(Date.parse(a.inicio)>agora?'Próxima aula':Date.parse(a.fim)>agora?'Aula em andamento':'Aguardando registro')+' · '+hora(a.inicio)),campos([['Aluno',a.aluno.nome],['Categoria',a.categoria+' · '+(NOMES_CATEGORIA[a.categoria]||'Não informada')],['Veículo',veiculo?.modelo?veiculo.modelo+(veiculo.placa?' · '+veiculo.placa:''):null,true],['Local',localDaReservaOperacional(a)?.nome||obterUnidadeInstitucional(a.unidade)?.nome||a.unidade]]));
   // O motivo do bloqueio fica visível (no toque o title não aparece) e ligado aos botões por aria-describedby.
   const acoes=el('div',null,'in-side-actions'),motivo='Disponível quando a aula confirmada já tiver começado.';let bloqueado=false;for(const [status,texto] of [[5,'Aula realizada'],[6,'Aluno faltou']]){const b=botao(texto,()=>confirmar(a,status,b),status===5?'in-button in-primary':'in-button');b.dataset.registrarProxima=status;b.disabled=!podeRegistrar(a,estado.instrutor.id);if(b.disabled){b.title=motivo;b.setAttribute('aria-describedby','in-proxima-aviso');bloqueado=true;}acoes.append(b);}
   if(bloqueado){const aviso=el('small',motivo,'in-side-empty in-side-hint');aviso.id='in-proxima-aviso';acoes.append(aviso);}
   const ver=botao('Ver detalhes',()=>detalhes(a,ver),'in-link-button');acoes.append(ver);proxima.append(acoes);}
  else proxima.append(el('h3','Próxima aula'),el('p','Nenhuma aula confirmada para registrar hoje.','in-side-empty'));
  const semana=el('section',null,'in-card in-side-card'),dias=el('ol',null,'in-week');semana.append(el('h3','Esta semana'));
  for(const d of aulasDaSemana(estado.aulas,estado.instrutor.id,new Date(agendaAtual.dia+'T12:00:00-03:00'))){const li=el('li');li.setAttribute('aria-label',d.rotulo+' '+formatarData(d.dia)+': '+contar(d.total,'aula'));if(d.dia===agendaAtual.dia)li.setAttribute('aria-current','date');li.append(el('span',d.rotulo),el('strong',String(d.total)));dias.append(li);}
  semana.append(dias);lado.append(resumo,proxima,semana);return lado;
 }
 function historico(){
 const mes=consultaHistorico.mes||hojeBrasil().slice(0,7),periodo=consultaHistorico.periodo||periodoMensal(mes),card=el('section',null,'in-card in-history-card');
 const abas=el('div',null,'in-history-tabs');abas.setAttribute('role','tablist');abas.setAttribute('aria-label','Consultas do Histórico');
 const opcoes=[['dia','Histórico do dia'],['5','Realizadas'],['6','Faltas'],['completo','Histórico completo']];
 for(const [id,texto] of opcoes){const b=botao(texto,()=>{if(id==='completo'&&filtro!==id)Object.assign(consultaHistorico,{mes:null,periodo:null,aberto:false,inicio:'',fim:'',pagina:1,situacao:'todas'});filtro=id;render();conteudo.querySelector('[data-filter="'+id+'"]').focus({preventScroll:true});});b.dataset.filter=id;b.id='in-history-tab-'+id;b.setAttribute('role','tab');b.setAttribute('aria-selected',String(filtro===id));b.setAttribute('aria-controls','in-history-panel');b.tabIndex=filtro===id?0:-1;b.onkeydown=e=>{const indice=opcoes.findIndex(o=>o[0]===id),destino=e.key==='ArrowRight'?(indice+1)%4:e.key==='ArrowLeft'?(indice+3)%4:e.key==='Home'?0:e.key==='End'?3:null;if(destino!==null){e.preventDefault();conteudo.querySelector('[data-filter="'+opcoes[destino][0]+'"]').click();}};abas.append(b);}card.append(abas);
 const painel=el('div');painel.id='in-history-panel';painel.setAttribute('role','tabpanel');painel.setAttribute('aria-labelledby','in-history-tab-'+filtro);
 if(filtro==='completo'){
 const toolbar=el('div',null,'in-history-toolbar'),navegacao=el('div',null,'in-history-month');
 function escolherMes(valor,foco){consultaHistorico.mes=valor;consultaHistorico.pagina=1;consultaHistorico.periodo=null;consultaHistorico.aberto=false;render();conteudo.querySelector(foco)?.focus({preventScroll:true});}
 const anterior=botao('',()=>escolherMes(moverMes(mes,-1),'[data-mes=anterior]'),'in-icon-button');anterior.append(icone('left'));anterior.dataset.mes='anterior';anterior.setAttribute('aria-label','Mês anterior');anterior.disabled=mes==='1900-01';
 const proximo=botao('',()=>escolherMes(moverMes(mes,1),'[data-mes=proximo]'),'in-icon-button');proximo.append(icone('right'));proximo.dataset.mes='proximo';proximo.setAttribute('aria-label','Próximo mês');proximo.disabled=mes>=hojeBrasil().slice(0,7);
 const titulo=el('h2',consultaHistorico.periodo?'Consulta por período':new Date(mes+'-01T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',month:'long',year:'numeric'}));titulo.id='in-history-title';
 navegacao.setAttribute('role','group');navegacao.setAttribute('aria-label','Navegação mensal do Histórico');navegacao.append(el('span','Navegação mensal','in-history-month-label'),anterior,titulo,proximo);const acoes=el('div',null,'in-history-controls');
 const atual=botao('Voltar ao mês atual',()=>escolherMes(null,'[data-mes=atual]'));atual.dataset.mes='atual';
 const abrir=botao('Consultar período',()=>{consultaHistorico.aberto=!consultaHistorico.aberto;render();conteudo.querySelector(consultaHistorico.aberto?'#in-history-start':'[data-periodo]')?.focus({preventScroll:true});});abrir.dataset.periodo='true';abrir.setAttribute('aria-expanded',String(consultaHistorico.aberto));abrir.setAttribute('aria-controls','in-history-range');acoes.append(abrir,atual);toolbar.append(navegacao,acoes);painel.append(toolbar);
 const form=el('form',null,'in-history-range');form.id='in-history-range';form.hidden=!consultaHistorico.aberto;form.noValidate=true;
 for(const [id,titulo,chave,padrao] of [['in-history-start','Data inicial','inicio',periodo.inicio],['in-history-end','Data final','fim',periodo.fim>hojeBrasil()?hojeBrasil():periodo.fim]]){const label=el('label',titulo),input=el('input');input.type='date';input.id=id;input.min='1900-01-01';input.max=hojeBrasil();input.required=true;input.value=consultaHistorico[chave]||padrao;label.htmlFor=id;input.oninput=()=>{consultaHistorico[chave]=input.value;input.removeAttribute('aria-invalid');};label.append(input);form.append(label);}
 const consultar=el('button','Consultar','in-button in-primary');consultar.type='submit';const erro=el('p',null,'in-history-error');erro.id='in-history-error';erro.setAttribute('role','alert');erro.hidden=true;
 form.onsubmit=e=>{e.preventDefault();const inicio=form.querySelector('#in-history-start'),fim=form.querySelector('#in-history-end');try{const p=validarPeriodo(inicio.value,fim.value,hojeBrasil());consultaHistorico.inicio=p.inicio;consultaHistorico.fim=p.fim;consultaHistorico.periodo=p;consultaHistorico.pagina=1;render();conteudo.querySelector('#in-history-summary').focus({preventScroll:true});}catch(e){erro.textContent=e.message;erro.hidden=false;inicio.setAttribute('aria-describedby',erro.id);fim.setAttribute('aria-describedby',erro.id);fim.setAttribute('aria-invalid','true');}};
 form.append(consultar,erro);painel.append(form);
 }
 const resultado=consultarAbaHistorico(estado.aulas,estado.instrutor.id,filtro,{periodo,status:consultaHistorico.situacao});
 if(filtro==='completo'){
  const situacoes=el('div',null,'in-history-situations');situacoes.setAttribute('role','group');situacoes.setAttribute('aria-label','Filtrar registros por situação');
  for(const [id,texto] of [['todas','Todas'],['5','Realizadas'],['6','Faltas'],['2','Canceladas']]){const b=botao(texto+' ('+resultado.contagens[id]+')',()=>{consultaHistorico.situacao=id;consultaHistorico.pagina=1;render();conteudo.querySelector('[data-situacao="'+id+'"]').focus({preventScroll:true});});b.dataset.situacao=id;b.setAttribute('aria-pressed',String(consultaHistorico.situacao===id));situacoes.append(b);}painel.append(situacoes);
 }
 let exibicao=resultado;
 if(filtro==='completo'){const chave=estado.instrutor.id+'|'+periodo.inicio+'|'+periodo.fim+'|'+consultaHistorico.situacao;if(consultaHistorico.chavePagina!==chave){consultaHistorico.pagina=1;consultaHistorico.chavePagina=chave;}exibicao=paginarHistorico(resultado,consultaHistorico.pagina);consultaHistorico.pagina=exibicao.pagina;}
 const descricao=filtro==='completo'?'Período exibido: '+formatarData(resultado.inicio)+' a '+formatarData(resultado.fim):filtro==='dia'?'Histórico de hoje · '+formatarData(hojeBrasil()):filtro==='5'?'Todas as aulas realizadas':'Todas as faltas registradas';
 const resumo=el('p',descricao+' · '+resultado.total+' registro(s)','in-history-summary');resumo.id='in-history-summary';resumo.tabIndex=-1;resumo.setAttribute('role','status');painel.append(resumo);
 const resultados=el('div');resultados.id='in-history-results';resultados.tabIndex=-1;resultados.setAttribute('role','region');resultados.setAttribute('aria-label','Aulas encontradas');painel.append(resultados);
 if(!resultado.total)resultados.append(el('p',filtro==='completo'?({'5':'Nenhuma aula realizada neste período.','6':'Nenhuma falta registrada neste período.','2':'Nenhuma aula cancelada neste período.'}[consultaHistorico.situacao]||'Nenhuma aula encontrada para o período selecionado.'):'Nenhuma aula encontrada nesta aba.','in-empty'));
 for(const grupo of exibicao.grupos){const secaoDia=el('section',null,'in-history-day');secaoDia.dataset.dia=grupo.dia;const h=el('h3',new Date(grupo.dia+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',weekday:'long',day:'2-digit',month:'long',year:'numeric'}));if(filtro!=='dia')secaoDia.append(h);secaoDia.append(lista(grupo.aulas,false));resultados.append(secaoDia);}
 if(filtro==='completo'&&exibicao.total){
  const rodape=el('footer',null,'in-history-pagination'),indicador=el('p','Exibindo '+exibicao.inicioRegistro+'–'+exibicao.fimRegistro+' de '+exibicao.total+' aulas','in-page-summary');indicador.setAttribute('role','status');rodape.append(indicador);
  function irPagina(numero){consultaHistorico.pagina=numero;render();const lista=conteudo.querySelector('#in-history-results');lista?.focus({preventScroll:true});requestAnimationFrame(()=>{if(!lista?.isConnected)return;const r=lista.getBoundingClientRect();if(r.top<0||r.top>innerHeight*.65)lista.scrollIntoView({block:'start',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'instant':'smooth'});});}
  if(exibicao.totalPaginas>1)for(const compacta of [false,true]){
   const navPaginas=el('nav',null,'in-page-nav '+(compacta?'in-page-compact':'in-page-wide'));navPaginas.setAttribute('aria-label','Páginas do Histórico completo');
   const anterior=botao('',()=>irPagina(exibicao.pagina-1),'in-page-button');anterior.append(icone('left'));anterior.setAttribute('aria-label','Página anterior');anterior.dataset.pageAction='anterior';anterior.disabled=exibicao.pagina===1;navPaginas.append(anterior);
   for(const numero of numerosPaginas(exibicao.pagina,exibicao.totalPaginas,compacta)){if(typeof numero!=='number'){const reticencias=el('span','…','in-page-gap');reticencias.setAttribute('aria-hidden','true');navPaginas.append(reticencias);continue;}const b=botao(String(numero),()=>irPagina(numero),'in-page-button');b.dataset.page=numero;b.setAttribute('aria-label','Página '+numero);if(numero===exibicao.pagina)b.setAttribute('aria-current','page');navPaginas.append(b);}
   const proxima=botao('',()=>irPagina(exibicao.pagina+1),'in-page-button');proxima.append(icone('right'));proxima.setAttribute('aria-label','Próxima página');proxima.dataset.pageAction='proxima';proxima.disabled=exibicao.pagina===exibicao.totalPaginas;navPaginas.append(proxima);rodape.append(navPaginas);
  }
  painel.append(rodape);
 }
 card.append(painel);conteudo.append(card);centralizar(abas,'[aria-selected=true]');centralizar(painel.querySelector('.in-history-situations'),'[aria-pressed=true]');
 }
 // Faixas que deslizam (abas e situações): o render recria o DOM, então a opção ativa volta para dentro da faixa sem mexer na rolagem vertical.
 function centralizar(faixa,seletor){const ativo=faixa?.querySelector(seletor);if(!ativo||faixa.scrollWidth<=faixa.clientWidth)return;const r=ativo.getBoundingClientRect(),c=faixa.getBoundingClientRect();faixa.scrollLeft+=r.left-c.left-(c.width-r.width)/2;}
 function perfil(){const grade=el('div',null,'in-profile-layout'),pessoa=el('section',null,'in-card'),i=estado.instrutor;pessoa.append(el('div',i.nome.slice(0,1),'in-avatar'),el('h2',i.nome,'in-profile-name'),el('p','Instrutor · Categoria '+i.categorias.join(' e '),'muted'),el('span',i.ativo?'Ativo':'Inativo','in-badge'));const unidade=obterUnidadeInstitucional(i.unidade),local=el('div',null,'in-location');local.append(el('h3',unidade?.nome||i.unidade),el('p',unidade?.enderecoCompleto||'Endereço não informado'));const url=pesquisaMapsUnidade(i.unidade);if(url){const mapa=el('a','Ver localização');mapa.href=url;mapa.target='_blank';mapa.rel='noopener noreferrer';local.append(mapa);}pessoa.append(local);const v=el('section',null,'in-card');v.id='in-vehicle';v.append(el('h2','Veículo vinculado'),campos([['Identificação',estado.veiculo.id],['Modelo',estado.veiculo.modelo],['Placa de demonstração',estado.veiculo.placa],['Categoria',estado.veiculo.categoria+' — '+(NOMES_CATEGORIA[estado.veiculo.categoria]||'Categoria não informada')],['Unidade',unidade?.nome||i.unidade],['Vínculo','Vinculado ao seu cadastro']]),el('p','Unidade, habilitação e veículo são definidos pela recepção. Estes dados estão disponíveis apenas para consulta.','in-profile-note'));grade.append(pessoa,v);conteudo.append(grade);}
 function render(focar=false){root.dataset.secao=secao;conteudo.replaceChildren();dica.hidden=true;avisar('');nav.querySelectorAll('a').forEach(a=>{if(a.dataset.nav===secao)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});h1.textContent=secao==='inicio'?'Olá, '+estado.instrutor.nome+'!':({agenda:'Minha agenda',historico:'Histórico',perfil:'Meu perfil'})[secao];sub.textContent=({inicio:'Confira seus próximos compromissos e acompanhe suas aulas.',agenda:'Visualize sua programação diária e registre a realização das aulas.',historico:'Consulte os registros das suas aulas.',perfil:'Seus dados profissionais e veículo vinculado.'})[secao];({inicio,agenda,historico,perfil})[secao]();if(focar)h1.focus({preventScroll:true});}
 function confirmarReinicio(){const origem=document.activeElement,d=dialogo('Reiniciar dados fictícios?','Somente as aulas e o cadastro fictícios deste ambiente do Instrutor serão restaurados. A conta de acesso e os demais painéis serão preservados.',origem),erro=el('p'),f=el('footer');erro.setAttribute('role','alert');const voltar=botao('Voltar',()=>d.close()),ok=botao('Reiniciar demonstração',async()=>{ok.disabled=true;voltar.disabled=true;try{estado=await servico.reiniciar(true);agendaAtual=await servico.agendaHoje();d.close();render();avisar('Dados de demonstração restaurados.');}catch(e){erro.textContent=e.message;ok.disabled=false;voltar.disabled=false;}},'in-button in-primary');ok.dataset.resetConfirm='true';d.oncancel=e=>{if(ok.disabled)e.preventDefault();};f.append(voltar,ok);d.append(erro,f);d.showModal();d.querySelector('h2').focus();}
 function abrirMenu(){side.classList.add('open');menu.setAttribute('aria-expanded','true');menu.setAttribute('aria-label','Fechar menu');veu.hidden=false;main.inert=true;document.documentElement.style.overflow='hidden';(nav.querySelector('[aria-current=page]')||nav.querySelector('a'))?.focus();}
 function fecharMenu(focar=false){const estava=side.classList.contains('open');side.classList.remove('open');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-label','Abrir menu');veu.hidden=true;main.inert=false;document.documentElement.style.overflow='';if(focar&&estava)menu.focus();}
 posicionarTopo();telaEstreita.addEventListener('change',posicionarTopo,{signal});
 nav.addEventListener('click',e=>{if(e.target.closest('a'))fecharMenu(telaEstreita.matches);},{signal});
 addEventListener('keydown',e=>{if(e.key==='Escape'&&side.classList.contains('open'))fecharMenu(true);},{signal});
 function mudar(){const proxima=location.hash.slice(1);if(!['inicio','agenda','historico','perfil'].includes(proxima))return;if(proxima==='historico'&&secao!=='historico')filtro='dia';secao=proxima;fecharMenu();render(true);}
 addEventListener('hashchange',mudar,{signal});addEventListener('storage',e=>{if(e.key==='sipa.ui.tema'){aplicarTema(e.newValue);}},{signal});
 let atualizando=false;
 async function atualizar(){
  if(atualizando||signal.aborted)return;atualizando=true;
  try{const nova=await servico.agendaHoje(),novoEstado=await servico.dados();if(servico.cadastrosLocais)cadastros=await servico.cadastrosLocais();if(signal.aborted)return;const virou=nova.dia!==agendaAtual.dia;agendaAtual=nova;estado=novoEstado;
   if(virou)document.querySelectorAll('.in-dialog').forEach(d=>d.close());
   if(virou||(!document.querySelector('.in-dialog')&&!document.activeElement?.closest('#in-history-range'))){const scroll=conteudo.querySelector('.in-timeline')?.scrollTop;render();if(!virou&&scroll!=null)conteudo.querySelector('.in-timeline')?.scrollTo(0,scroll);if(virou)avisar('A programação foi atualizada para o novo dia de Brasília.');}
  }catch(e){document.querySelectorAll('.in-dialog').forEach(d=>d.close());agendaAtual={dia:hojeBrasil(),erro:'Agenda indisponível: '+e.message};if(secao==='agenda')render();avisar('Não foi possível atualizar a agenda: '+e.message);}finally{atualizando=false;}
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')atualizar();},{signal});
 addEventListener('focus',atualizar,{signal});
 addEventListener('storage',e=>{if(['sipa.instrutor.dev.dados.v1','sipa.operador.demo.v2'].includes(e.key))atualizar();},{signal});
 const timer=setInterval(atualizar,15000);
 function encerrar(){clearInterval(timer);vida.abort();document.documentElement.style.overflow='';root.replaceChildren();}
 aplicarTema();render();return encerrar;
}
