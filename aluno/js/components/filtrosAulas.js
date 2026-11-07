import {agoraBrasil} from '../../../shared/js/calendario.js';
import {nomeLocalDaReserva} from '../../../shared/components/localAula.js';

export function selecionarPaginaAulas(aulas,filtro={},pagina=1,tamanho=5){
 const itens=aulas.filter(a=>{
  if(filtro.categoria&&a.categoria!==filtro.categoria)return false;
  if(filtro.unidade&&nomeLocalDaReserva(a)!==filtro.unidade)return false;
  const dia=Number.isFinite(Date.parse(a.inicio))?agoraBrasil(new Date(a.inicio)).slice(0,10):'';
  return (!filtro.de||dia>=filtro.de)&&(!filtro.ate||dia<=filtro.ate);
 });
 const paginas=Math.max(1,Math.ceil(itens.length/tamanho)),atual=Math.min(paginas,Math.max(1,pagina));
 return {itens:itens.slice((atual-1)*tamanho,atual*tamanho),total:itens.length,pagina:atual,paginas};
}

export function montarFiltrosAulas(principal,anterior,grupos,tabs){
 const anteriorForm=document.getElementById('student-lesson-filters'),salvos={};
 anteriorForm?.querySelectorAll('[name]').forEach(c=>salvos[c.name]=c.value);anteriorForm?.remove();
 document.querySelectorAll('.student-lesson-pagination').forEach(n=>n.remove());
 const form=document.createElement('form');form.id='student-lesson-filters';form.className='student-lesson-filters';form.setAttribute('aria-label','Filtros das minhas aulas');form.onsubmit=e=>e.preventDefault();
 const controles={},todas=Object.values(grupos).flat(),campos=[['categoria','Categoria','select'],['unidade','Unidade ou local','select'],['de','De','date'],['ate','Até','date']];
 for(const [nome,titulo,tipo] of campos){const label=document.createElement('label'),c=document.createElement(tipo==='select'?'select':'input');label.textContent=titulo;c.name=nome;
  if(tipo==='select'){c.append(new Option('Todas',''));const valores=[...new Set(todas.map(a=>nome==='categoria'?a.categoria:nomeLocalDaReserva(a)).filter(Boolean))].sort();for(const v of valores)c.append(new Option(v,v));}else c.type=tipo;
  c.value=salvos[nome]||'';controles[nome]=c;label.append(c);form.append(label);
 }
 const limpar=document.createElement('button');limpar.type='button';limpar.textContent='Limpar filtros';limpar.className='local-lesson-cancel';form.append(limpar);
 const erro=document.createElement('p');erro.className='student-lesson-filter-error';erro.setAttribute('role','alert');form.append(erro);principal.before(form);
 let pagina=1;const barras=new Map();
 for(const secao of [principal,anterior]){const nav=document.createElement('nav');nav.className='student-lesson-pagination';nav.setAttribute('aria-label','Paginação das aulas');secao.append(nav);barras.set(secao,nav);}
 function aplicar(){
  const vista=tabs.querySelector('[aria-pressed=true]')?.dataset.vista||'confirmadas',aulas=grupos[vista];form.hidden=!aulas;
  for(const n of barras.values())n.hidden=true;
  if(!aulas)return;
  const filtro=Object.fromEntries(Object.entries(controles).map(([k,c])=>[k,c.value])),invalido=filtro.de&&filtro.ate&&filtro.de>filtro.ate;
  erro.textContent=invalido?'A data final deve ser igual ou posterior à inicial.':'';
  const resultado=selecionarPaginaAulas(invalido?[]:aulas,filtro,pagina);pagina=resultado.pagina;
  const ids=new Set(resultado.itens.map(a=>a.id)),secao=vista==='confirmadas'?principal:anterior;
  secao.querySelectorAll('[data-aula-local]').forEach(n=>n.hidden=!ids.has(n.dataset.aulaLocal));
  secao.querySelectorAll('.local-view-empty,.sipa-local-empty').forEach(n=>n.hidden=true);
  secao.querySelector('.student-lesson-filter-empty')?.remove();
  if(!resultado.total){const vazio=document.createElement('p');vazio.className='student-lesson-filter-empty';vazio.textContent='Nenhuma aula encontrada para os filtros selecionados.';secao.append(vazio);}
  const nav=barras.get(secao),voltar=document.createElement('button'),avancar=document.createElement('button'),info=document.createElement('span');nav.replaceChildren();nav.hidden=false;
  voltar.type=avancar.type='button';voltar.className=avancar.className='local-lesson-cancel';voltar.textContent='Anterior';avancar.textContent='Próxima';voltar.disabled=pagina===1;avancar.disabled=pagina===resultado.paginas;
  info.setAttribute('aria-live','polite');info.textContent='Página '+pagina+' de '+resultado.paginas+' · '+resultado.total+' aula(s)';
  voltar.onclick=()=>{pagina--;aplicar();};avancar.onclick=()=>{pagina++;aplicar();};nav.append(voltar,info,avancar);
 }
 for(const c of Object.values(controles))c.onchange=()=>{pagina=1;aplicar();};limpar.onclick=()=>{for(const c of Object.values(controles))c.value='';pagina=1;aplicar();};
 tabs.addEventListener('click',()=>{pagina=1;aplicar();});aplicar();
}
