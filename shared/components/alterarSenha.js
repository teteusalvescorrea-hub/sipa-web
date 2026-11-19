// 11/11/2026: "Alterar senha" para quem não é aluno (Instrutor, Recepção, Gerência e Master). O aluno já tinha o seu, em
// Meu perfil. A mesma rota para todos os perfis: PUT usuarios/me/senha (senha atual + nova). O diálogo não guarda nada:
// os campos são apagados ao fechar.
import {Put} from '../js/api.js';

function carregarCss(){
 if(document.querySelector('[data-css-alterar-senha]'))return;
 const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('../css/alterar-senha.css',import.meta.url);l.dataset.cssAlterarSenha='';document.head.append(l);
}
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const OLHO='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
const CADEADO='<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/></svg>';

// O cartão "Segurança da conta" com o botão (para colocar no Meu perfil). classeCartao: a classe de cartão do painel.
export function cartaoSenha({classeCartao='',classeBotao=''}={}){
 carregarCss();
 const c=el('section',null,('sipa-senha-cartao '+classeCartao).trim());c.dataset.senhaCartao='';
 const h=el('h2','Segurança da conta'),p=el('p','Troque a sua senha de acesso. Você vai precisar informar a senha atual.','sipa-senha-nota');
 const b=el('button',null,('sipa-senha-botao '+classeBotao).trim());b.type='button';b.dataset.alterarSenha='';b.innerHTML=CADEADO;b.append(el('span','Alterar senha'));
 const retorno=el('p',null,'sipa-senha-retorno');retorno.setAttribute('role','status');
 b.onclick=()=>abrirAlterarSenha({origem:b,aoConcluir:()=>{retorno.textContent='Senha alterada com sucesso!';}});
 c.append(h,p,b,retorno);return c;
}

export function abrirAlterarSenha({origem,aoConcluir}={}){
 carregarCss();
 if(document.querySelector('dialog.sipa-senha-dialogo[open]'))return;
 const d=el('dialog',null,'sipa-senha-dialogo');d.setAttribute('aria-labelledby','sipa-senha-titulo');
 const cab=el('header');cab.innerHTML=CADEADO;const h=el('h2','Alterar senha');h.id='sipa-senha-titulo';cab.append(h);
 const form=el('form');form.noValidate=true;
 const campos={};
 for(const [nome,rotulo,auto] of [['atual','Senha atual','current-password'],['nova','Nova senha','new-password'],['confirmacao','Confirmar nova senha','new-password']]){
  const box=el('div',null,'sipa-senha-campo'),l=el('label',rotulo),wrap=el('div',null,'sipa-senha-entrada'),i=el('input'),olho=el('button');
  i.id='sipa-senha-'+nome;l.htmlFor=i.id;i.type='password';i.name=nome;i.required=true;i.autocomplete=auto;
  olho.type='button';olho.className='sipa-senha-olho';olho.innerHTML=OLHO;olho.setAttribute('aria-label','Mostrar '+rotulo.toLowerCase());olho.setAttribute('aria-pressed','false');
  olho.onclick=()=>{const ver=i.type==='password';i.type=ver?'text':'password';olho.setAttribute('aria-pressed',String(ver));olho.setAttribute('aria-label',(ver?'Ocultar ':'Mostrar ')+rotulo.toLowerCase());};
  wrap.append(i,olho);box.append(l,wrap);form.append(box);campos[nome]=i;
 }
 const ajuda=el('small','Use de 4 a 100 caracteres (letras, números ou símbolos), diferente do seu CPF e do seu e-mail.','sipa-senha-ajuda');
 const retorno=el('p',null,'sipa-senha-erro');retorno.setAttribute('role','status');
 const rodape=el('footer'),cancelar=el('button','Cancelar','sipa-senha-cancelar'),confirmar=el('button','Confirmar alteração','sipa-senha-confirmar');
 cancelar.type='button';confirmar.type='submit';confirmar.disabled=true;rodape.append(cancelar,confirmar);
 form.append(ajuda,retorno,rodape);d.append(cab,form);
 let ocupado=false;
 const validar=()=>{const a=campos.atual.value,n=campos.nova.value,c=campos.confirmacao.value;
  if(!a)return 'Informe sua senha atual.';if(!n)return 'Informe a nova senha.';if(!c||c!==n)return 'A confirmação não corresponde à nova senha.';if(n===a)return 'A nova senha deve ser diferente da atual.';if(n.length<4||n.length>100)return 'A senha deve ter de 4 a 100 caracteres.';return '';};
 form.oninput=()=>{const e=validar();confirmar.disabled=ocupado||!!e;retorno.textContent=e;retorno.setAttribute('role','status');};
 cancelar.onclick=()=>d.close();d.oncancel=e=>{if(ocupado)e.preventDefault();};
 form.onsubmit=async e=>{e.preventDefault();if(ocupado)return;const erro=validar();if(erro){retorno.textContent=erro;retorno.setAttribute('role','alert');return;}
  ocupado=true;confirmar.disabled=true;cancelar.disabled=true;confirmar.textContent='Salvando…';d.setAttribute('aria-busy','true');
  try{await Put('usuarios/me/senha',{senhaAtual:campos.atual.value,novaSenha:campos.nova.value});d.close();aoConcluir?.();}
  catch(x){retorno.textContent=x?.message||'Não foi possível alterar a senha. A senha anterior foi mantida.';retorno.setAttribute('role','alert');}
  finally{ocupado=false;confirmar.textContent='Confirmar alteração';cancelar.disabled=false;confirmar.disabled=!!validar();d.removeAttribute('aria-busy');}};
 d.addEventListener('close',()=>{for(const i of Object.values(campos)){i.value='';i.type='password';}d.remove();origem?.focus();},{once:true});
 document.body.append(d);d.showModal();campos.atual.focus();
}
