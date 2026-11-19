// 11/11/2026: página do link "Confirme seu e-mail" (confirmar-email.html), que não existia (o link dava 404). O token vem
// no #token= (sai da barra de endereço ao abrir); a senha atual é obrigatória e, no primeiro acesso (senha provisória),
// a senha nova vai junto: a API troca a senha na confirmação (UsuariosAppService.ConfirmarEmailAsync).
import {Post} from '../shared/js/api.js';
import {textoErro} from '../shared/js/apiErro.js';
import {marcarErroCampo} from '../shared/js/errosDeCampo.js';

const form = document.getElementById('confirmar-form'), mensagem = document.getElementById('confirmar-mensagem');
const atual = document.getElementById('senha-atual'), nova = document.getElementById('nova-senha'), confirmar = document.getElementById('confirmar-senha');
const enviar = document.getElementById('confirmar-enviar');
const token = new URLSearchParams(location.hash.slice(1)).get('token');
if (token) history.replaceState(null, '', location.pathname);

function avisar(texto, tipo = 'error') { mensagem.textContent = texto; mensagem.className = `form-message visible ${tipo}`; }
if (!token) { avisar('Link inválido ou incompleto. Peça um novo link de confirmação.'); form.hidden = true; }

const regras = {
    tamanho: () => nova.value.length >= 4 && nova.value.length <= 100,
    iguais: () => !!nova.value && nova.value === confirmar.value
};
function conferir() { for (const [k, ok] of Object.entries(regras)) document.querySelector(`[data-requisito=${k}]`).classList.toggle('ok', ok()); }
nova.addEventListener('input', conferir); confirmar.addEventListener('input', conferir);

for (const b of document.querySelectorAll('[data-mostrar]')) b.addEventListener('click', () => {
    const campo = document.getElementById(b.dataset.mostrar), mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(mostrar)); b.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    b.querySelector('i').className = mostrar ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
});

form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!atual.value) { marcarErroCampo(atual, 'Digite a sua senha atual.'); atual.focus(); return; }
    // A senha nova é opcional (só no primeiro acesso); preenchida, as duas têm de ser iguais. A regra completa é da API
    // (de 4 a 100 caracteres de qualquer tipo para todos, desde 13/11/2026).
    if ((nova.value || confirmar.value) && nova.value !== confirmar.value) { marcarErroCampo(confirmar, 'As senhas não conferem.'); confirmar.focus(); return; }
    enviar.disabled = true;
    try {
        await Post('usuarios/confirmar-email', { token, senha: atual.value, novaSenha: nova.value || null });
        document.getElementById('confirmar-painel').hidden = true;
        document.getElementById('confirmar-sucesso').hidden = false;
    } catch (erro) {
        avisar(textoErro(erro, 'Não foi possível confirmar o e-mail.'));
    } finally { enviar.disabled = false; }
});
