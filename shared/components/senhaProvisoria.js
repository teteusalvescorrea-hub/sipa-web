// Senha provisória gerada pelo servidor (M8, M9): mostrada uma única vez, sem
// guardar em lugar nenhum. Quem recebe repassa à pessoa, que troca no 1º acesso.
import {el,botao,modal} from '../../nivel-1-operador/js/components/uiOperador.js';
export function mostrarSenhaProvisoria(raiz,{titulo='Senha provisória',nome='',senha}){
 if(!senha)return null;
 const d=modal(raiz,titulo,'opSenhaProvisoria');d.classList.add('op-reset-dialog');
 const valor=el('output',senha,'op-senha-provisoria');valor.setAttribute('aria-label','Senha provisória');
 const aviso=el('p','','op-help');aviso.setAttribute('role','status');
 const copiar=botao('Copiar senha',async()=>{try{await navigator.clipboard.writeText(senha);aviso.textContent='Senha copiada.';}catch{aviso.textContent='Copie a senha manualmente.';}});
 d.append(el('p',(nome?nome+': ':'')+'esta é a senha provisória. Ela aparece só agora; anote ou copie antes de fechar.','op-help'),valor,
  el('p','No primeiro acesso, a pessoa entra com o CPF e esta senha e cria uma senha pessoal (mínimo de 8 caracteres).','op-help'),copiar,aviso,
  botao('Entendi',()=>d.close(),'op-button op-button-primary'));
 d.addEventListener('close',()=>{valor.textContent='';d.remove();},{once:true});d.showModal();return d;
}
