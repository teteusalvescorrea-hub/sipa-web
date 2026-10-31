// Página do link de redefinição de senha: o token vem no #token= (nunca vai ao servidor na URL), a senha nova segue
// a política da API (8 a 100 caracteres, letras e números) e o POST usuarios/redefinir-senha consome o link.
import {Post} from '../shared/js/api.js';
import '../shared/js/errosDeCampo.js';
import {marcarErroCampo} from '../shared/js/errosDeCampo.js';

const form = document.getElementById('redefinir-form'), mensagem = document.getElementById('redefinir-mensagem');
const senha = document.getElementById('nova-senha'), confirmar = document.getElementById('confirmar-senha'), enviar = document.getElementById('redefinir-enviar');
const token = new URLSearchParams(location.hash.slice(1)).get('token');
// O token sai da barra de endereço logo ao abrir (não fica no histórico nem é copiado junto com a URL).
if (token) history.replaceState(null, '', location.pathname);

function avisar(texto, tipo = 'error') { mensagem.textContent = texto; mensagem.className = `form-message visible ${tipo}`; }

if (!token) { avisar('Link inválido ou incompleto. Peça um novo link de redefinição.'); form.hidden = true; }

form.addEventListener('submit', async e => {
    e.preventDefault();
    if (!/^(?=.*[A-Za-z])(?=.*\d).{8,100}$/.test(senha.value)) { marcarErroCampo(senha, 'Use de 8 a 100 caracteres, com letras e números.'); senha.focus(); return; }
    if (senha.value !== confirmar.value) { marcarErroCampo(confirmar, 'As senhas não conferem.'); confirmar.focus(); return; }
    enviar.disabled = true;
    try {
        await Post('usuarios/redefinir-senha', { token, novaSenha: senha.value });
        form.hidden = true; document.getElementById('redefinir-login').hidden = false;
        avisar('Senha alterada. Entre com seu CPF e a nova senha.', 'success');
    } catch (erro) {
        avisar((erro?.erros || []).map(x => x?.mensagem ?? x).filter(x => typeof x === 'string').join(' ') || erro?.message || 'Não foi possível salvar a nova senha.');
    } finally { enviar.disabled = false; }
});
