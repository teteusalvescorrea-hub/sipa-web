// Coluna Ações das listas (padrão da tela de alunos): o ⋯ e o menu com as ações da linha. Usado pela Recepção e pela Gerência.
import {el,botao} from '../../nivel-1-operador/js/components/uiOperador.js';
const ICONES_ACAO={olho:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',lapis:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'};
function iconeAcao(nome){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','op-acao-icone');svg.innerHTML=ICONES_ACAO[nome]||'';return svg;}
// Ações da linha no padrão do Simplea: o ⋯ abre um menu só com as ações permitidas (item sem ação fica de fora).
// Item sem ação mas com dica (4º valor) aparece desabilitado, com a dica no title.
// O menu é fixo na tela, para a rolagem da tabela não cortá-lo, e abre para cima quando falta espaço embaixo.
const fecharMenusAcoes=()=>document.querySelectorAll('.op-menu-acoes-lista:not([hidden])').forEach(m=>{m.hidden=true;m.previousElementSibling?.setAttribute('aria-expanded','false');});
document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('.op-menu-acoes'))fecharMenusAcoes();});
window.addEventListener('scroll',e=>{if(!e.target.closest?.('.op-menu-acoes-lista'))fecharMenusAcoes();},true);window.addEventListener('resize',fecharMenusAcoes);
export function menuAcoes(nome,itens){
    const caixa=el('div',undefined,'op-menu-acoes'),gatilho=botaoMais(nome,null),menu=el('div',undefined,'op-menu-acoes-lista');menu.setAttribute('role','menu');menu.hidden=true;gatilho.setAttribute('aria-haspopup','menu');gatilho.setAttribute('aria-expanded','false');gatilho.title='Ações';gatilho.setAttribute('aria-label','Ações de '+nome);
    const fechar=()=>{menu.hidden=true;gatilho.setAttribute('aria-expanded','false');};
    for(const [rotulo,acao,icone,dica] of itens.filter(i=>i[1]||i[3])){const b=botao(rotulo,()=>{if(!acao)return;fechar();acao();},'op-menu-acoes-item');if(icone)b.prepend(iconeAcao(icone));b.setAttribute('role','menuitem');b.dataset.opAcao=rotulo.toLocaleLowerCase('pt-BR');if(!acao){b.disabled=true;b.title=dica;}menu.append(b);}
    gatilho.onclick=()=>{const abrir=menu.hidden;fecharMenusAcoes();if(!abrir)return;menu.hidden=false;gatilho.setAttribute('aria-expanded','true');
        const r=gatilho.getBoundingClientRect(),h=menu.offsetHeight,emCima=innerHeight-r.bottom<h+8&&r.top>h+8;
        Object.assign(menu.style,{position:'fixed',left:'auto',right:Math.max(8,innerWidth-r.right)+'px',top:emCima?'auto':(r.bottom+4)+'px',bottom:emCima?(innerHeight-r.top+4)+'px':'auto'});
        menu.querySelector('button:not(:disabled)')?.focus();};
    caixa.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.stopPropagation();fechar();gatilho.focus();}});
    caixa.append(gatilho,menu);return {caixa,gatilho};
}
export function botaoMais(nome,aoClicar,b=botao('⋯',aoClicar)){b.textContent='⋯';b.className='op-acao-mais';b.setAttribute('aria-label','Ver detalhes de '+nome);b.title='Ver detalhes';return b;}
