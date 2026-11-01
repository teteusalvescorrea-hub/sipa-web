// Senha provisória gerada pelo servidor (M8, M9): mostrada uma única vez, sem
// guardar em lugar nenhum. Quem recebe repassa à pessoa, que troca no 1º acesso.
import {el,botao,mostrarAviso} from '../../nivel-1-operador/js/components/uiOperador.js';
export function mostrarSenhaProvisoria(raiz,{titulo='Senha provisória',nome='',senha}){
 if(!senha)return null;
 const valor=el('output',senha,'op-senha-provisoria');valor.setAttribute('aria-label','Senha provisória');
 const aviso=el('p','','op-help');aviso.setAttribute('role','status');
 const copiar=botao('Copiar senha',async()=>{try{await navigator.clipboard.writeText(senha);aviso.textContent='Senha copiada.';}catch{aviso.textContent='Copie a senha manualmente.';}});
 const d=mostrarAviso(raiz,titulo,'opSenhaProvisoria',el('p',(nome?nome+': ':'')+'esta é a senha provisória. Ela aparece só agora; anote ou copie antes de fechar.','op-help'),valor,
  el('p','No primeiro acesso, a pessoa entra com o CPF e esta senha e cria uma senha pessoal (mínimo de 8 caracteres).','op-help'),copiar,aviso);d.classList.add('op-reset-dialog');
 d.addEventListener('close',()=>{valor.textContent='';},{once:true});return d;
}
