// Fase 7 (4.2): ao entrar, a Recepção vê as aulas agendadas no dia anterior (só as 2 primeiras de cada aluno) e marca
// "Lançado no SIT". A API guarda quem confirmou e quando. 10/11/2026: cada aula numa linha-cartão (aluno, ordem e
// categoria; dia, instrutor, veículo e unidade) com o botão de lançado à direita, a barra de progresso e os filtros
// Todas, Pendentes e Lançadas. O ônibus (D) mostra todas as aulas e o progresso até o mínimo de 10 lançamentos.
import {el,campo,entrada} from './uiOperador.js';
import {formatarData,hojeBrasil,somarDias} from '../../../shared/js/calendario.js';
import {formatarCpf} from '../../../shared/js/formatacao.js';

const hora=iso=>String(iso||'').slice(11,16);
const dataHora=iso=>iso?formatarData(String(iso).slice(0,10))+' '+hora(iso):'';
const semana=iso=>{const d=String(iso||'').slice(0,10);return d?new Date(d+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',weekday:'short'}).replace('.',''):'';};
const NOME_CATEGORIA={A:'Moto',B:'Carro',D:'Ônibus'};
const FILTROS=[['todas','Todas'],['pendentes','Pendentes'],['lancadas','Lançadas']];

export function cartaoSit(servico,{aoMudar}={}){
 const card=el('section',undefined,'op-card op-sit');card.dataset.opRelatorioSit='';
 const dia=entrada('date',somarDias(hojeBrasil(),-1));dia.max=hojeBrasil();dia.name='data';
 const campoDia=campo('Agendadas em',dia);campoDia.classList.add('op-sit-dia');
 const resumo=el('div',undefined,'op-sit-resumo'),filtros=el('div',undefined,'op-sit-filtros'),corpo=el('div');
 resumo.setAttribute('role','status');filtros.setAttribute('role','group');filtros.setAttribute('aria-label','Mostrar');
 // 16/11/2026 (pedido do usuário): "Buscar" (e Enter) para consultar a data digitada, e o calendário dos dias com aulas
 // pendentes de lançamento (o botão mostra quantos dias têm pendência nos últimos 62).
 const buscar=el('button','Buscar','op-button op-button-primary op-sit-buscar');buscar.type='button';buscar.dataset.opSitBuscar='';
 const abrirCal=el('button',undefined,'op-button op-button-outline op-sit-abrir-cal');abrirCal.type='button';abrirCal.dataset.opSitCalendario='';abrirCal.setAttribute('aria-expanded','false');
 const rotuloCal=el('span','Dias com pendência'),contaCal=el('span','','op-sit-cal-conta');contaCal.hidden=true;abrirCal.append(rotuloCal,contaCal);
 const barraDia=el('div',undefined,'op-sit-barra-dia');barraDia.append(campoDia,buscar,abrirCal);
 const calendario=el('div',undefined,'op-sit-cal');calendario.hidden=true;calendario.dataset.opSitCal='';
 card.append(el('h2','Lançamento no SIT'),el('p','Aulas agendadas no dia escolhido (padrão: ontem). Só as 2 primeiras aulas de cada aluno; remarcações não aparecem. No ônibus aparecem todas (mínimo de 10 lançamentos no SIT).','op-help'),barraDia,calendario,resumo,filtros,corpo);
 let itens=[],filtro='todas';

 // O calendário: um mês por vez, com os dias do mês consultados na API (cache por mês; limpo ao lançar ou desfazer).
 const MESES=['janeiro','fevereiro','março','abril','maio','junho','julho','agosto','setembro','outubro','novembro','dezembro'];
 const mesesCarregados=new Map();let mesVisivel=String(dia.value||hojeBrasil()).slice(0,7);
 const ultimoDoMes=mes=>{const [a,m]=mes.split('-').map(Number);return mes+'-'+String(new Date(Date.UTC(a,m,0)).getUTCDate()).padStart(2,'0');};
 const somarMes=(mes,n)=>{const [a,m]=mes.split('-').map(Number),d=new Date(Date.UTC(a,m-1+n,1));return d.getUTCFullYear()+'-'+String(d.getUTCMonth()+1).padStart(2,'0');};
 function diasDoMes(mes){
  if(!mesesCarregados.has(mes)){const hoje=hojeBrasil(),fim=ultimoDoMes(mes)<hoje?ultimoDoMes(mes):hoje;
   const p=mes+'-01'>hoje?Promise.resolve([]):Promise.resolve(servico.diasSit?.(mes+'-01',fim)).then(r=>r||[]);mesesCarregados.set(mes,p);p.catch(()=>mesesCarregados.delete(mes));}
  return mesesCarregados.get(mes);
 }
 async function contarPendentes(){
  if(!servico.diasSit){abrirCal.hidden=true;return;}
  try{const dias=await servico.diasSit();const n=(dias||[]).filter(d=>d.pendentes>0).length;contaCal.textContent=String(n);contaCal.hidden=!n;
   abrirCal.title=n?n+(n===1?' dia':' dias')+' com aulas para lançar nos últimos 62 dias':'Nenhuma aula pendente nos últimos 62 dias';}catch{contaCal.hidden=true;}
 }
 async function desenharCalendario(){
  const mes=mesVisivel,[ano,m]=mes.split('-').map(Number),hoje=hojeBrasil();
  const topo=el('div',undefined,'op-sit-cal-topo'),anterior=el('button','‹','op-sit-cal-nav'),proximo=el('button','›','op-sit-cal-nav');
  anterior.type=proximo.type='button';anterior.setAttribute('aria-label','Mês anterior');proximo.setAttribute('aria-label','Próximo mês');proximo.disabled=mes>=hoje.slice(0,7);
  anterior.onclick=()=>{mesVisivel=somarMes(mesVisivel,-1);desenharCalendario();};proximo.onclick=()=>{mesVisivel=somarMes(mesVisivel,1);desenharCalendario();};
  const titulo=el('strong',MESES[m-1].charAt(0).toUpperCase()+MESES[m-1].slice(1)+' de '+ano);topo.append(anterior,titulo,proximo);
  const grade=el('div',undefined,'op-sit-cal-grade');grade.setAttribute('role','grid');
  for(const s of ['dom','seg','ter','qua','qui','sex','sáb'])grade.append(el('span',s,'op-sit-cal-semana'));
  const legenda=el('div',undefined,'op-sit-cal-legenda');legenda.append(el('span','Com pendência','pendente'),el('span','Tudo lançado','ok'));
  calendario.replaceChildren(topo,grade,legenda);grade.setAttribute('aria-busy','true');
  let dias;try{dias=await diasDoMes(mes);}catch(e){grade.after(el('p',e.message,'op-help'));dias=[];}
  if(mes!==mesVisivel)return;grade.removeAttribute('aria-busy');
  const porDia=new Map((dias||[]).map(d=>[String(d.data).slice(0,10),d]));
  const primeiro=new Date(Date.UTC(ano,m-1,1)).getUTCDay(),total=Number(ultimoDoMes(mes).slice(8));
  for(let i=0;i<primeiro;i++)grade.append(el('span','','op-sit-cal-vazio'));
  for(let n=1;n<=total;n++){
   const data=mes+'-'+String(n).padStart(2,'0'),d=porDia.get(data),b=el('button',undefined,'op-sit-cal-dia');b.type='button';b.dataset.opSitDia=data;
   b.append(el('span',String(n),'op-sit-cal-num'));
   if(d?.pendentes>0){b.classList.add('pendente');b.append(el('span',String(d.pendentes),'op-sit-cal-marca'));b.title=d.pendentes+' de '+d.total+' aula(s) para lançar';}
   else if(d?.total>0){b.classList.add('ok');b.append(el('span','✓','op-sit-cal-marca'));b.title='Tudo lançado ('+d.total+' aula(s))';}
   if(data===dia.value)b.setAttribute('aria-current','date');if(data===hoje)b.classList.add('hoje');
   if(data>hoje)b.disabled=true;
   b.onclick=()=>{dia.value=data;fecharCalendario();buscarDia();};
   grade.append(b);
  }
 }
 function fecharCalendario(){calendario.hidden=true;abrirCal.setAttribute('aria-expanded','false');}
 abrirCal.onclick=()=>{if(!calendario.hidden){fecharCalendario();return;}mesVisivel=String(dia.value||hojeBrasil()).slice(0,7);calendario.hidden=false;abrirCal.setAttribute('aria-expanded','true');desenharCalendario();};
 function buscarDia(){if(!dia.value){dia.reportValidity?.();return;}if(dia.value>hojeBrasil())dia.value=hojeBrasil();filtro='todas';carregar();}
 calendario.addEventListener('keydown',e=>{if(e.key==='Escape'){fecharCalendario();abrirCal.focus();}});
 buscar.onclick=buscarDia;dia.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();buscarDia();}});
 // Lançou ou desfez: o calendário e a contagem de dias pendentes voltam a consultar a API.
 const atualizarPendencias=()=>{mesesCarregados.clear();contarPendentes();if(!calendario.hidden)desenharCalendario();};

 function linha(i){
  const li=el('li',undefined,'op-sit-item'+(i.lancado?' op-sit-lancado':''));li.dataset.opSit=i.agendamentoId;
  const info=el('div',undefined,'op-sit-info'),topo=el('div',undefined,'op-sit-topo');
  topo.append(el('strong',i.aluno,'op-sit-aluno'),el('span',i.ordem+'ª aula','op-sit-ordem'),el('span','Categoria '+i.categoria+(NOME_CATEGORIA[i.categoria]?' · '+NOME_CATEGORIA[i.categoria]:''),'op-sit-cat'));
  // Ônibus: quantas aulas do aluno já foram lançadas no SIT, até o mínimo.
  if(i.minimoSit){const ok=i.lancadasNoSit>=i.minimoSit;topo.append(el('span',ok?'✓ Mínimo de '+i.minimoSit+' no SIT atingido':i.lancadasNoSit+' de '+i.minimoSit+' lançadas no SIT','op-sit-minimo'+(ok?' ok':'')));}
  if(i.cpf)topo.append(el('span','CPF '+formatarCpf(i.cpf),'op-sit-cpf'));
  info.append(topo,el('p',[semana(i.inicio)+' '+dataHora(i.inicio),i.instrutor,i.veiculo,i.unidade].filter(x=>x&&String(x).trim()).join(' · '),'op-sit-detalhe'));
  const marca=el('input');marca.type='checkbox';marca.checked=i.lancado;marca.id='sit-'+i.agendamentoId;marca.dataset.opSitLancado='';marca.className='op-sit-check';
  const rotulo=el('label',undefined,'op-sit-marca');rotulo.htmlFor=marca.id;rotulo.append(marca,el('span',i.lancado?'Lançado no SIT':'Marcar como lançado'));
  const acao=el('div',undefined,'op-sit-acao');acao.append(rotulo);
  if(i.lancado)acao.append(el('small','por '+(i.lancadoPor||'equipe')+' em '+dataHora(i.lancadoEm),'op-sit-quem'));
  marca.onchange=async()=>{marca.disabled=true;try{if(marca.checked)await servico.lancarSit(i.agendamentoId);else await servico.desfazerSit(i.agendamentoId);await carregar();aoMudar?.();atualizarPendencias();}catch(e){marca.checked=!marca.checked;alert(e.message);}finally{marca.disabled=false;}};
  li.append(info,acao);return li;
 }

 function desenhar(){
  const feitos=itens.filter(i=>i.lancado).length,total=itens.length;
  const barra=el('div',undefined,'op-sit-barra'),preenchido=el('span');preenchido.style.width=(total?Math.round(feitos*100/total):0)+'%';barra.append(preenchido);
  barra.setAttribute('aria-hidden','true');
  resumo.replaceChildren(el('strong',feitos+' de '+total+' lançada(s) no SIT'+(feitos===total?' · tudo lançado ✓':'')),barra);
  const contagem={todas:total,pendentes:total-feitos,lancadas:feitos};
  filtros.replaceChildren(...FILTROS.map(([id,texto])=>{const b=el('button',texto+' ('+contagem[id]+')');b.type='button';b.dataset.opSitFiltro=id;b.setAttribute('aria-pressed',String(filtro===id));b.onclick=()=>{filtro=id;desenhar();};return b;}));
  const visiveis=itens.filter(i=>filtro==='todas'||(filtro==='lancadas')===i.lancado);
  if(!visiveis.length){corpo.replaceChildren(el('p',filtro==='pendentes'?'Nenhuma aula pendente: tudo lançado.':'Nenhuma aula lançada ainda.','op-help'));return;}
  const lista=el('ul',undefined,'op-sit-lista');lista.append(...visiveis.map(linha));corpo.replaceChildren(lista);
 }

 async function carregar(){
  let r;try{r=await servico.relatorioSit(dia.value);}catch(e){resumo.replaceChildren();filtros.replaceChildren();corpo.replaceChildren(el('p',e.message,'op-help'));return;}
  itens=r?.itens||[];
  if(!itens.length){resumo.replaceChildren();filtros.replaceChildren();corpo.replaceChildren(el('p','Nenhuma aula para lançar neste dia.','op-help'));return;}
  desenhar();
 }
 dia.onchange=()=>{if(dia.value)buscarDia();};carregar();contarPendentes();
 return card;
}
