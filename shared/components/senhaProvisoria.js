// Senha provisória gerada pelo servidor (M8, M9): mostrada uma única vez, sem
// guardar em lugar nenhum. Quem recebe repassa à pessoa. 13/11/2026: só o aluno troca no 1º acesso; equipe e instrutor
// entram com ela e trocam quando quiserem no perfil (aluno=false).
import {el,botao,mostrarAviso} from '../../nivel-1-operador/js/components/uiOperador.js';
export function mostrarSenhaProvisoria(raiz,{titulo='Senha provisória',nome='',senha,login='o CPF',aluno=true}){
 if(!senha)return null;
 const valor=el('output',senha,'op-senha-provisoria');valor.setAttribute('aria-label','Senha provisória');
 const aviso=el('p','','op-help');aviso.setAttribute('role','status');
 const copiar=botao('Copiar senha',async()=>{try{await navigator.clipboard.writeText(senha);aviso.textContent='Senha copiada.';}catch{aviso.textContent='Copie a senha manualmente.';}});
 const d=mostrarAviso(raiz,titulo,'opSenhaProvisoria',el('p',(nome?nome+': ':'')+(aluno?'esta é a senha provisória.':'esta é a senha de acesso.')+' Ela aparece só agora; anote ou copie antes de fechar.','op-help'),valor,
  el('p',aluno?'No primeiro acesso, a pessoa entra com '+login+' e esta senha e cria uma senha pessoal.':'A pessoa entra com '+login+' e esta senha. Se quiser, troca depois em "Meu perfil", em Alterar senha.','op-help'),copiar,aviso);d.classList.add('op-reset-dialog');
 d.addEventListener('close',()=>{valor.textContent='';},{once:true});return d;
}
