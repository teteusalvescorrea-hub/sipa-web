// Seleção múltipla em lista suspensa com caixas de marcação (como o multiselect dos filtros do Simplea).
// O valor fica num input oculto (`input.value` = códigos marcados, na ordem das opções) que dispara 'change'.
let sequencia=0;

export function criarMultiSelecao({opcoes=[],selecionados=[],placeholder='Selecione'}={}){
 const id='multi-selecao-'+(++sequencia),caixa=document.createElement('div'),botao=document.createElement('button'),texto=document.createElement('span'),lista=document.createElement('div'),input=document.createElement('input');
 caixa.className='sipa-multi-selecao';botao.type='button';botao.className='sipa-multi-selecao-botao';botao.setAttribute('aria-haspopup','true');botao.setAttribute('aria-expanded','false');botao.setAttribute('aria-controls',id);
 lista.id=id;lista.className='sipa-multi-selecao-lista';lista.hidden=true;input.type='hidden';
 const marcas=opcoes.map(([valor,rotulo])=>{const l=document.createElement('label'),c=document.createElement('input');c.type='checkbox';c.value=valor;c.checked=selecionados.includes(valor);l.append(c,document.createTextNode(rotulo));lista.append(l);return c;});
 botao.append(texto);caixa.append(botao,lista,input);
 function atualizar(){const marcadas=marcas.filter(c=>c.checked);input.value=marcadas.map(c=>c.value).join('');texto.textContent=marcadas.length?marcadas.map(c=>opcoes.find(([v])=>v===c.value)[1]).join(', '):placeholder;texto.classList.toggle('sipa-multi-selecao-vazio',!marcadas.length);}
 function abrir(sim=true){lista.hidden=!sim;botao.setAttribute('aria-expanded',String(sim));}
 botao.addEventListener('click',()=>abrir(lista.hidden));
 lista.addEventListener('change',()=>{atualizar();input.dispatchEvent(new Event('change'));});
 caixa.addEventListener('keydown',e=>{if(e.key==='Escape'&&!lista.hidden){e.preventDefault();e.stopPropagation();abrir(false);botao.focus();}});
 caixa.addEventListener('focusout',e=>{if(!caixa.contains(e.relatedTarget))abrir(false);});
 document.addEventListener('pointerdown',e=>{if(!caixa.contains(e.target))abrir(false);});
 atualizar();
 return {elemento:caixa,input,botao,abrir,valores:()=>marcas.filter(c=>c.checked).map(c=>c.value),desabilitar(sim){botao.disabled=!!sim;if(sim)abrir(false);}};
}
