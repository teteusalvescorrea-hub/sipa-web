// Entrada pública única. Serviços da API são carregados somente ao autenticar
// no modo integrado; cadastro interno permanece em template inerte no HTML.
import {normalizarCpfEntrada,formatarCpfEntrada,ativarMascaraCpf} from '../shared/js/formatacao.js';
import '../shared/js/selectsComBusca.js';
import '../shared/js/errosDeCampo.js';
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
if(servicoDemo&&!document.getElementById('tipo-acesso')){
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
// Equipe (ADM 1, 2 e 3) entra com CPF ou e-mail no mesmo campo; aluno e instrutor, só CPF.
// A máscara só formata quando o texto é numérico, então o e-mail passa intacto.
ativarMascaraCpf(cpf,{permitirNome:true});
const tipoAcesso=document.getElementById('tipo-acesso'),rotuloLogin=document.querySelector('label[for="login-cpf"]');
// Integrado: sem "Tipo de acesso" (decisão do João em 03/11); o campo aceita CPF ou e-mail e o painel vem da conta.
const equipeSelecionada=()=>!servicoDemo||['operador','gerencia','master'].includes(tipoAcesso?.value);
function ajustarCampoLogin(){
    const equipe=!servicoDemo&&equipeSelecionada();
    if(rotuloLogin)rotuloLogin.textContent=equipe?'CPF ou e-mail':'CPF';
    cpf.placeholder=equipe?'CPF ou e-mail':'000.000.000-00';cpf.maxLength=equipe?254:14;cpf.inputMode=equipe?'email':'numeric';
    if(!equipe&&/[^\d.\-\s]/.test(cpf.value))cpf.value='';
}
tipoAcesso?.addEventListener('change',ajustarCampoLogin);ajustarCampoLogin();
if(servicoDemo)senha.maxLength=128;
ativarMascaraCpf(document.getElementById("recuperacao-cpf"));
senha.addEventListener("input", () => senha.removeAttribute("aria-invalid"));
olho.addEventListener("click", () => {
    const mostrar = senha.type === "password"; senha.type = mostrar ? "text" : "password";
    olho.setAttribute("aria-label", mostrar ? "Ocultar senha" : "Mostrar senha"); olho.setAttribute("aria-pressed", String(mostrar));
    olho.querySelector("i").className = mostrar ? "fa-regular fa-eye-slash" : "fa-regular fa-eye";
});
// Destinos relativos a este arquivo (js/ → raiz): funcionam no Pages de projeto (M1).
const destino = caminho => new URL('../' + caminho, import.meta.url).href;
const destinos = Object.freeze({ Aluno: destino("aluno/html/dashboard.html"), Motorista: destino("instrutor/html/instrutor.html") });
const paineisEquipe = Object.freeze({ operador: [1, destino("nivel-1-operador/html/operador-cfc.html")], gerencia: [2, destino("nivel-2-gerencia/html/gerencia.html")], master: [3, destino("nivel-3-master/html/master.html")] });
const emailValido = valor => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(valor);

// Senha provisória (deveTrocarSenha): o login não devolve token. Pede a nova
// senha aqui mesmo e troca por POST /api/usuarios/trocar-senha-provisoria (M3).
function pedirNovaSenha(trocar) {
    return new Promise(resolve => {
        const d = document.createElement("dialog"); d.className = "login-provisoria"; d.setAttribute("aria-labelledby", "provisoria-titulo");
        d.innerHTML = '<form method="dialog" novalidate><h2 id="provisoria-titulo">Crie sua senha</h2><p>Sua senha atual é provisória. Escolha uma nova senha com pelo menos 8 caracteres.</p><label for="provisoria-nova">Nova senha</label><input type="password" id="provisoria-nova" autocomplete="new-password" minlength="8" maxlength="128" required><label for="provisoria-confirmacao">Confirme a nova senha</label><input type="password" id="provisoria-confirmacao" autocomplete="new-password" minlength="8" maxlength="128" required><p data-provisoria-erro role="alert"></p><footer><button type="button" data-provisoria-cancelar>Cancelar</button><button type="submit" data-provisoria-salvar>Salvar e entrar</button></footer></form>';
        const nova = d.querySelector("#provisoria-nova"), confirmacao = d.querySelector("#provisoria-confirmacao"), erro = d.querySelector("[data-provisoria-erro]"), salvar = d.querySelector("[data-provisoria-salvar]");
        let resultado = null, ocupado = false;
        d.querySelector("[data-provisoria-cancelar]").onclick = () => d.close();
        d.addEventListener("cancel", e => { if (ocupado) e.preventDefault(); });
        d.querySelector("form").onsubmit = async e => {
            e.preventDefault(); if (ocupado) return;
            if (nova.value.length < 8) { erro.textContent = "A nova senha precisa ter pelo menos 8 caracteres."; nova.focus(); return; }
            if (nova.value !== confirmacao.value) { erro.textContent = "A confirmação não corresponde à nova senha."; confirmacao.focus(); return; }
            ocupado = true; salvar.disabled = true; erro.textContent = "";
            try { resultado = await trocar(nova.value); d.close(); }
            catch (falha) { erro.textContent = falha?.erros?.map(x => x?.mensagem || x).join(" ") || falha?.message || "Não foi possível salvar a nova senha."; }
            finally { ocupado = false; salvar.disabled = false; }
        };
        d.addEventListener("close", () => { nova.value = confirmacao.value = ""; d.remove(); resolve(resultado); }, { once: true });
        document.body.append(d); d.showModal(); nova.focus();
    });
}
// Uma conta, vários perfis (decisão do João em 03/11): o mesmo CPF pode ser aluno e instrutor. O login pergunta com qual entrar.
function escolherPerfil(perfis) {
    return new Promise(resolve => {
        const nomes = { 1: "Aluno", 2: "Instrutor" };
        const d = document.createElement("dialog"); d.className = "login-provisoria"; d.setAttribute("aria-labelledby", "perfil-titulo");
        d.innerHTML = '<form method="dialog"><h2 id="perfil-titulo">Como deseja entrar?</h2><p>Este CPF tem mais de um acesso no SIPA.</p><div data-perfis style="display:grid;gap:8px"></div><footer><button type="button" data-perfil-cancelar>Cancelar</button></footer></form>';
        let escolhido = null;
        for (const p of perfis) {
            const valor = p?.valor ?? p, b = document.createElement("button");
            b.type = "button"; b.textContent = nomes[valor] || p?.descricao || String(valor);
            b.onclick = () => { escolhido = valor; d.close(); };
            d.querySelector("[data-perfis]").append(b);
        }
        d.querySelector("[data-perfil-cancelar]").onclick = () => d.close();
        d.addEventListener("close", () => { d.remove(); resolve(escolhido); }, { once: true });
        document.body.append(d); d.showModal(); d.querySelector("[data-perfis] button")?.focus();
    });
}
form.addEventListener("submit", async event => {
    event.preventDefault(); if (enviando) return;
    enviando = true; entrar.disabled = true; form.setAttribute("aria-busy", "true");
    entrar.querySelector("span").textContent = "Entrando…";
    entrar.querySelector("i").className = "fa-solid fa-spinner fa-spin";
    let redirecionando = false;
    try {
        informar('');
        const escolhido=document.getElementById('tipo-acesso')?.value,equipe=!servicoDemo||Object.hasOwn(paineisEquipe,escolhido);
        const porEmail=!servicoDemo&&cpf.value.includes('@');
        if(porEmail){if(!emailValido(cpf.value.trim())){informar('Informe um e-mail válido.','error',cpf);return;}}
        else if(cpf.value.replace(/\D/g,'').length!==11||/[^\d.\-\s]/.test(cpf.value)){informar(equipe&&!servicoDemo?'Informe o CPF (11 dígitos) ou o e-mail.':'Informe os 11 dígitos do CPF.','error',cpf);return;}
        if (servicoDemo) { await servicoDemo.entrar(normalizarCPF(cpf.value), senha.value); senha.value = ''; redirecionando = true; return; }
        if (!porEmail && !validarCPF(cpf.value)) { informar('Informe um CPF válido.', 'error', cpf); return; }
        if (!senha.value) { informar('Digite sua senha.', 'error', senha); return; }
        const identificacao = porEmail ? cpf.value.trim() : normalizarCPF(cpf.value);
        const { login, trocarSenhaProvisoria } = await import("../shared/js/services/authService.js");
        const { limparSessao } = await import('../shared/js/sessao.js');
        let resposta = await login(identificacao, senha.value), perfilEscolhido = null;
        if (!resposta?.token && resposta?.perfis?.length > 1) {
            perfilEscolhido = await escolherPerfil(resposta.perfis);
            if (!perfilEscolhido) { limparSessao(); informar('Escolha com qual acesso deseja entrar.', 'info'); return; }
            resposta = await login(identificacao, senha.value, perfilEscolhido);
        }
        if (resposta?.deveTrocarSenha && !resposta.token) {
            informar('Sua senha é provisória. Crie uma nova senha para continuar.', 'info');
            resposta = await pedirNovaSenha(nova => trocarSenhaProvisoria(identificacao, senha.value, nova, perfilEscolhido));
            if (!resposta?.token) { limparSessao(); informar('A nova senha não foi salva. Entre novamente para tentar de novo.', 'info'); return; }
        }
        senha.value = '';
        const perfil = resposta?.perfil?.descricao;
        // O perfil da conta decide a tela: equipe pelo painel do papel (equipe/me), aluno e instrutor pelo perfil do token.
        if (perfil === 'Autoescola') {
            const { Get } = await import('../shared/js/api.js');
            const membro = await Get('equipe/me'), painel = membro?.painel?.valor ?? membro?.painel ?? null;
            const url = Object.values(paineisEquipe).find(([nivel]) => nivel === painel)?.[1];
            if (!url) { limparSessao(); informar('Sua conta não tem um painel administrativo liberado. Fale com o Master.', 'info'); return; }
            redirecionando = true; informar("Login realizado. Abrindo seu painel…", "success");
            window.location.assign(url); return;
        }
        if(!Object.hasOwn(destinos, perfil)){
            limparSessao();
            informar('Esta conta não tem um painel disponível no SIPA.','info');return;
        }
        redirecionando = true; informar("Login realizado. Abrindo seu painel…", "success");
        window.location.assign(destinos[perfil]);
    } catch (erro) {
        try { (await import('../shared/js/sessao.js')).limparSessao(); } catch {}
        informar(erro.status === 401 ? (equipeSelecionada() ? "CPF, e-mail ou senha inválidos, ou conta indisponível." : "CPF ou senha inválidos, ou conta indisponível.") : erro.message || "Não foi possível concluir o acesso. Tente novamente.");
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
