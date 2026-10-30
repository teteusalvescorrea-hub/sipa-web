import {ativarMascaraCpf,formatarCpf} from '../js/formatacao.js';

// Campo único de busca com sugestões (como o autocomplete dos filtros do Simplea): ao focar lista as opções,
// ao digitar filtra por nome ou CPF e a escolha vem da lista. Só dígitos: máscara e limite de CPF (14).
const semAcento=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('pt-BR');
const ehCpf=v=>/^[\d.\-\s]+$/.test(v);
let sequencia=0;

export function criarBuscaComSugestoes({placeholder='Nome ou CPF',vazio='Nenhum resultado encontrado.',obrigatorio='Selecione uma opção da lista.',maxResultados=50,aoEscolher}={}){
 const id='busca-sugestoes-'+(++sequencia),caixa=document.createElement('div'),input=document.createElement('input'),seta=document.createElement('button'),lista=document.createElement('ul');
 caixa.className='sipa-busca-sugestoes';input.type='text';input.placeholder=placeholder;input.autocomplete='off';input.maxLength=120;
 input.setAttribute('role','combobox');input.setAttribute('aria-autocomplete','list');input.setAttribute('aria-expanded','false');input.setAttribute('aria-controls',id);
 seta.type='button';seta.className='sipa-busca-sugestoes-seta';seta.tabIndex=-1;seta.setAttribute('aria-label','Mostrar opções');
 lista.id=id;lista.setAttribute('role','listbox');lista.hidden=true;caixa.append(input,seta,lista);
 ativarMascaraCpf(input,{permitirNome:true});
 let opcoes=[],visiveis=[],ativa=-1,escolhida=null,exigir=false;

 const rotulo=o=>o.nome+(ehCpf(o.cpf||'')&&String(o.cpf).replace(/\D/g,'').length===11?' · '+formatarCpf(o.cpf):'');
 function validar(){input.setCustomValidity(exigir&&!escolhida?obrigatorio:'');}
 function fechar(){lista.hidden=true;input.setAttribute('aria-expanded','false');input.removeAttribute('aria-activedescendant');ativa=-1;}
 function marcar(i){ativa=i;[...lista.children].forEach((li,n)=>li.setAttribute('aria-selected',String(n===i)));const li=lista.children[i];if(li?.id){input.setAttribute('aria-activedescendant',li.id);li.scrollIntoView({block:'nearest'});}}
 function abrir(){
  const termo=input.value.trim(),digitos=termo.replace(/\D/g,''),texto=semAcento(termo),filtrar=termo&&!(escolhida&&input.value===rotulo(escolhida));
  visiveis=(filtrar?opcoes.filter(o=>ehCpf(termo)?digitos&&String(o.cpf||'').replace(/\D/g,'').includes(digitos):semAcento(o.nome).includes(texto)):opcoes).slice(0,maxResultados);
  lista.replaceChildren(...(visiveis.length?visiveis.map((o,n)=>{const li=document.createElement('li');li.id=id+'-'+n;li.setAttribute('role','option');li.textContent=rotulo(o);li.addEventListener('mousedown',e=>{e.preventDefault();escolher(o);});return li;}):[Object.assign(document.createElement('li'),{className:'sipa-busca-sugestoes-vazio',textContent:vazio})]));
  lista.hidden=false;input.setAttribute('aria-expanded','true');marcar(visiveis.findIndex(o=>o.id===escolhida?.id));
 }
 function escolher(o,avisar=true){escolhida=o||null;input.value=o?rotulo(o):'';validar();fechar();if(avisar)aoEscolher?.(escolhida);}

 input.addEventListener('focus',abrir);input.addEventListener('click',abrir);
 seta.addEventListener('mousedown',e=>{e.preventDefault();if(input.disabled)return;if(!lista.hidden)fechar();else if(document.activeElement===input)abrir();else input.focus();});
 input.addEventListener('input',()=>{input.maxLength=ehCpf(input.value)?14:120;if(escolhida&&input.value!==rotulo(escolhida)){escolhida=null;validar();aoEscolher?.(null);}abrir();});
 input.addEventListener('blur',()=>{fechar();if(!escolhida)input.value='';});
 input.addEventListener('keydown',e=>{
  if(e.key==='ArrowDown'||e.key==='ArrowUp'){e.preventDefault();if(lista.hidden)abrir();if(visiveis.length)marcar((ativa+(e.key==='ArrowDown'?1:-1)+visiveis.length)%visiveis.length);}
  else if(e.key==='Enter'&&!lista.hidden){e.preventDefault();if(visiveis[ativa])escolher(visiveis[ativa]);}
  else if(e.key==='Escape'&&!lista.hidden){e.preventDefault();e.stopPropagation();fechar();}
 });

 return {
  elemento:caixa,input,
  get valor(){return escolhida?.id||'';},
  definirOpcoes(novas,preferido){opcoes=novas||[];escolher(opcoes.find(o=>o.id===(preferido??escolhida?.id))||null,false);},
  exigir(sim){exigir=!!sim;validar();},
  desabilitar(sim){input.disabled=seta.disabled=!!sim;}
 };
}
