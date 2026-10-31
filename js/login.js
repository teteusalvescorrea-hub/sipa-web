// Entrada pública única. Serviços da API são carregados somente ao autenticar
// no modo integrado; cadastro interno permanece em template inerte no HTML.
import {normalizarCpfEntrada,formatarCpfEntrada,ativarMascaraCpf} from '../shared/js/formatacao.js';
export const normalizarCPF=normalizarCpfEntrada;
export const formatarCPF=formatarCpfEntrada;
export function validarCPF(valor) {
    const cpf = normalizarCPF(valor);
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
    for (let tamanho = 9; tamanho <= 10; tamanho++) {
        const soma = [...cpf.slice(0, tamanho)].reduce((total, digito, i) => total + Number(digito) * (tamanho + 1 - i), 0);
        const resto = soma * 10 % 11;
        if ((resto === 10 ? 0 : resto) !== Number(cpf[tamanho])) return false;
    }
    return true;
}

const form = document.getElementById("login-form"), cpf = document.getElementById("login-cpf"), senha = document.getElementById("login-password");
const mensagem = document.getElementById("login-message"), entrar = document.getElementById("login-submit"), olho = document.getElementById("password-toggle");
let enviando = false;
const {desenvolvimentoAtivo} = await import('../shared/js/ambiente.js');
const servicoDemo = desenvolvimentoAtivo() ? (await import('../dev/login.js')).montarLoginDemo(form) : null;
if(!document.getElementById('tipo-acesso')){
// A escolha informa o destino pretendido; a API continua sendo a autoridade.
// Nenhum perfil administrativo é inferido de Autoescola ou de parâmetros da URL.
const ferramentasPerfil=document.createElement('div');ferramentasPerfil.className='local-login-tools';
ferramentasPerfil.innerHTML='<label for="tipo-acesso">Tipo de acesso</label><select id="tipo-acesso"><option value="aluno">Aluno</option><option value="instrutor">Instrutor</option><option value="operador">Recepção — ADM 1</option><option value="gerencia">Gerência — ADM 2</option><option value="master">Acesso Master — ADM 3</option></select>';
entrar.before(ferramentasPerfil);
}

function informar(texto, tipo = "error", campo) {
    mensagem.textContent = texto; mensagem.className = `form-message ${texto ? `visible ${tipo}` : ""}`;
    if (campo) { campo.setAttribute("aria-invalid", "true"); campo.focus(); }
}
ativarMascaraCpf(cpf);
if(servicoDemo)senha.maxLength=128;
ativarMascaraCpf(document.getElementById("recuperacao-cpf"));
senha.addEventListener("input", () => senha.removeAttribute("aria-invalid"));
olho.addEventListener("click", () => {
    const mostrar = senha.type === "password"; senha.type = mostrar ? "text" : "password";
    olho.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha"); olho.setAttribute("aria-pressed", String(mostrar));
    olho.querySelector("i").className = mostrar ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
});
const destinos = Object.freeze({ Aluno: "/aluno/html/dashboard.html", Motorista: "/instrutor/html/instrutor.html", Autoescola: "/autoescola.html" });
form.addEventListener("submit", async event => {
    event.preventDefault(); if (enviando) return;
    enviando = true; entrar.disabled = true; form.setAttribute("aria-busy", "true");
    entrar.querySelector("span").textContent = "Entrando…";
    entrar.querySelector("i").className = "fa-solid fa-spinner fa-spin";
    let redirecionando = false;
    try {
        informar('');
        if(cpf.value.replace(/\D/g,'').length!==11){informar('Informe os 11 dígitos do CPF.','error',cpf);return;}
        if (servicoDemo) { await servicoDemo.entrar(normalizarCPF(cpf.value), senha.value); senha.value = ''; redirecionando = true; return; }
        if (!validarCPF(cpf.value)) { informar('Informe um CPF válido.', 'error', cpf); return; }
        if (!senha.value) { informar('Digite sua senha.', 'error', senha); return; }
        const { login } = await import("../shared/js/services/authService.js");
        const resposta = await login(normalizarCPF(cpf.value), senha.value);
        const perfil = resposta?.perfil?.descricao;
        const escolhido=document.getElementById('tipo-acesso').value;
        const contrato={aluno:'Aluno',instrutor:'Motorista'};
        if(!Object.hasOwn(contrato,escolhido)||contrato[escolhido]!==perfil){
            const {limparSessao}=await import('../shared/js/sessao.js');limparSessao();
            informar(Object.hasOwn(contrato,escolhido)?'A conta autenticada não possui o perfil selecionado.':'Este perfil administrativo aguarda o contrato de autenticação e autorização da API. Nenhum acesso foi concedido.','info');return;
        }
        if (!Object.hasOwn(destinos, perfil)) {
            const { limparSessao } = await import("../shared/js/sessao.js"); limparSessao();
            informar(perfil === "Motorista" ? "A interface do instrutor ainda aguarda integração. Nenhuma permissão administrativa foi concedida." : "O perfil retornado ainda não possui um painel integrado.", "info"); return;
        }
        redirecionando = true; informar("Login realizado. Abrindo seu painel…", "success");
        window.location.assign(destinos[perfil]);
    } catch (erro) {
        informar(erro.status === 401 ? "CPF ou senha inválidos, ou conta indisponível." : erro.message || "Não foi possível concluir o acesso. Tente novamente.");
    } finally {
        if (!redirecionando) { enviando = false; entrar.disabled = false; form.removeAttribute("aria-busy"); entrar.querySelector("span").textContent = "Entrar"; entrar.querySelector("i").className = "fa-solid fa-arrow-right"; }
    }
});

// Única configuração do contato: o destino já informado no link principal.
const contato = document.getElementById("contato-recepcao");
const urlContato = new URL(contato.href);
urlContato.searchParams.set("text", "Olá! Estou tentando acessar minha conta no SIPA e preciso de ajuda da recepção.");
contato.href = urlContato.href;
document.querySelectorAll("[data-contato-copia]").forEach(link => { link.href = contato.href; });
const recuperacao = document.getElementById("recuperar-acesso");
document.getElementById("forgot-password").addEventListener("click", () => recuperacao.showModal());
document.querySelector("[data-fechar-recuperacao]").addEventListener("click", () => recuperacao.close());
document.querySelectorAll("[data-recuperacao]").forEach(botao => botao.addEventListener("click", () => {
    const metodo = botao.dataset.recuperacao;
    document.querySelectorAll("[data-recuperacao]").forEach(item => item.setAttribute("aria-pressed", String(item === botao)));
    document.getElementById("recuperacao-presencial").hidden = metodo !== "presencial";
    document.getElementById("recuperacao-digital").hidden = metodo === "presencial";
    if (metodo !== "presencial") {
        document.getElementById("recuperacao-metodo").textContent = metodo === "email" ? "Recuperação por e-mail" : "Recuperação pelo celular";
        document.getElementById("recuperacao-pendente").textContent = `A recuperação ${metodo === "email" ? "por e-mail" : "pelo celular"} ainda não está disponível. Entre em contato com a recepção.`;
        document.getElementById("recuperacao-cpf").focus();
    }
}));
if (new URLSearchParams(window.location.search).get("sessao") === "expirada") informar("Sua sessão expirou. Entre novamente.", "info");
