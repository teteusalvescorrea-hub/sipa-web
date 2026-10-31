// Página do link de redefinição de senha: o token vem no #token= (nunca vai ao servidor na URL), a senha nova segue
// a política da API (8 a 100 caracteres, letras e números) e o POST usuarios/redefinir-senha consome o link.
import {Post} from '../shared/js/api.js';
import {marcarErroCampo} from '../shared/js/errosDeCampo.js';

const form = document.getElementById('redefinir-form'), mensagem = document.getElementById('redefinir-mensagem');
const senha = document.getElementById('nova-senha'), confirmar = document.getElementById('confirmar-senha'), enviar = document.getElementById('redefinir-enviar');
const token = new URLSearchParams(location.hash.slice(1)).get('token');
// O token sai da barra de endereço logo ao abrir (não fica no histórico nem é copiado junto com a URL).
if (token) history.replaceState(null, '', location.pathname);

function avisar(texto, tipo = 'error') { mensagem.textContent = texto; mensagem.className = `form-message visible ${tipo}`; }
if (!token) { avisar('Link inválido ou incompleto. Peça um novo link de redefinição.'); form.hidden = true; }

// Os requisitos marcam conforme a pessoa digita.
const regras = {
    tamanho: () => senha.value.length >= 8 && senha.value.length <= 100,
    letra: () => /[A-Za-zÀ-ÿ]/.test(senha.value),
    numero: () => /\d/.test(senha.value),
    iguais: () => !!senha.value && senha.value === confirmar.value
};
function conferir() { for (const [k, ok] of Object.entries(regras)) document.querySelector(`[data-requisito=${k}]`).classList.toggle('ok', ok()); }
senha.addEventListener('input', conferir); confirmar.addEventListener('input', conferir);

for (const b of document.querySelectorAll('[data-mostrar]')) b.addEventListener('click', () => {
    const campo = document.getElementById(b.dataset.mostrar), mostrar = campo.type === 'password';
    campo.type = mostrar ? 'text' : 'password';
    b.setAttribute('aria-pressed', String(mostrar)); b.setAttribute('aria-label', mostrar ? 'Ocultar senha' : 'Mostrar senha');
    b.querySelector('i').className = mostrar ? 'fa-regular fa-eye-slash' : 'fa-regular fa-eye';
});

form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!regras.tamanho() || !regras.letra() || !regras.numero()) { marcarErroCampo(senha, 'Use de 8 a 100 caracteres, com letras e números.'); senha.focus(); return; }
    if (!regras.iguais()) { marcarErroCampo(confirmar, 'As senhas não conferem.'); confirmar.focus(); return; }
    enviar.disabled = true;
    try {
        await Post('usuarios/redefinir-senha', { token, novaSenha: senha.value });
        document.getElementById('redefinir-painel').hidden = true;
        document.getElementById('redefinir-sucesso').hidden = false;
    } catch (erro) {
        avisar((erro?.erros || []).map(x => x?.mensagem ?? x).filter(x => typeof x === 'string').join(' ') || erro?.message || 'Não foi possível salvar a nova senha.');
    } finally { enviar.disabled = false; }
});
