import {desenvolvimentoAtivo} from '../shared/js/ambiente.js';
import {autenticar,inicializarAcessos,definirSenha} from './autenticacao.js';
import {abrirDefinicaoSenhaRecepcao} from './aluno/acessoRecepcao.js';
export function montarLoginDemo(form){
 if(!desenvolvimentoAtivo())return null;
 const existente=document.getElementById('tipo-acesso');
 const ferramentas=existente?.parentElement||document.createElement('div');ferramentas.className='local-login-tools';
 if(!existente)ferramentas.innerHTML='<label for="tipo-acesso">Tipo de acesso</label><select id="tipo-acesso"><option value="aluno">Aluno</option><option value="instrutor">Instrutor</option><option value="operador">Recepção</option><option value="gerencia">Gerência</option><option value="master">Acesso Master</option></select>';
 form.querySelector('#login-submit').before(ferramentas);
 const pronto=inicializarAcessos();pronto.catch(e=>{const m=document.getElementById('login-message');m.textContent=e.message;m.className='form-message visible error';});
 return {async entrar(cpf,senha){await pronto;const perfil=ferramentas.querySelector('select').value,r=await autenticar(cpf,senha,perfil);if(r.trocaObrigatoria){if(perfil==='aluno')await abrirDefinicaoSenhaRecepcao();else await trocarSenhaInstrutor();}location.assign(({aluno:'/aluno/html/dashboard.html',instrutor:'/instrutor/html/instrutor.html',operador:'/nivel-1-operador/html/operador-cfc.html',gerencia:'/nivel-2-gerencia/html/gerencia.html',master:'/nivel-3-master/html/master.html'})[perfil]);}};
}
async function trocarSenhaInstrutor(){return new Promise((resolve,reject)=>{
 const d=document.createElement('dialog');d.className='login-dialog';d.setAttribute('aria-labelledby','senha-instrutor-titulo');d.innerHTML='<h2 id="senha-instrutor-titulo">Definir nova senha</h2><form class="local-form"><label>Nova senha (mínimo de 4 caracteres)<input name="nova" type="password" required minlength="4" maxlength="128" autocomplete="new-password"></label><label>Confirmar nova senha<input name="confirmacao" type="password" required minlength="4" maxlength="128" autocomplete="new-password"></label><p role="alert"></p><button type="button">Voltar</button><button type="submit">Salvar nova senha</button></form>';
 let concluido=false,ocupado=false;const f=d.querySelector('form');d.querySelector('[type=button]').onclick=()=>{if(!ocupado)d.close();};d.oncancel=e=>{if(ocupado)e.preventDefault();};
 f.onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;f.querySelector('[type=submit]').disabled=true;try{await definirSenha(f.elements.nova.value,f.elements.confirmacao.value);concluido=true;d.close();resolve();}catch(e){f.querySelector('[role=alert]').textContent=e.message;}finally{ocupado=false;f.querySelector('[type=submit]').disabled=false;}};
 d.onclose=()=>{d.remove();if(!concluido)reject(new Error('Defina a nova senha antes de acessar o painel.'));};document.body.append(d);d.showModal();
});}
