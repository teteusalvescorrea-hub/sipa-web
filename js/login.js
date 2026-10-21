import { login } from "./modules/essencial/service/authService.js";
import { limparSessao } from "./modules/essencial/utils/sessao.js";
import { cadastrarAluno } from "./modules/alunos/services/alunos.service.js";
import {
    montarEscolhaDePacotes,
    resumoDoEnvio
} from "./modules/pacotes/components/escolhaDePacotes.js";


/* =========================================
   ELEMENTOS
   ========================================= */

const loginModeButton = document.getElementById("login-mode-button");
const registerModeButton = document.getElementById("register-mode-button");

const loginPanel = document.getElementById("login-panel");
const registerPanel = document.getElementById("register-panel");

const loginForm = document.getElementById("login-form");
const cadastroForm = document.getElementById("cadastroForm");

const loginSubmit = document.getElementById("login-submit");
const cadastroSubmit = cadastroForm?.querySelector('button[type="submit"]');

const loginCpf = document.getElementById("login-cpf");
const loginPassword = document.getElementById("login-password");
const loginMessage = document.getElementById("login-message");

const cadastroMessage = document.getElementById("cadastro-message");

const passwordToggle = document.getElementById("password-toggle");
const forgotPassword = document.getElementById("forgot-password");

const bottomRegisterButton = document.getElementById("bottom-register-button");
const bottomLoginButton = document.getElementById("bottom-login-button");


/* =========================================
   DESATIVA VALIDAÇÃO NATIVA DO NAVEGADOR
   ========================================= */

if (cadastroForm) {
    cadastroForm.noValidate = true;
}


/* =========================================
   ALTERNAR ENTRE LOGIN E CADASTRO
   ========================================= */

function mostrarLogin() {
    loginPanel.classList.add("active");
    registerPanel.classList.remove("active");

    loginModeButton.classList.add("active");
    registerModeButton.classList.remove("active");

    limparMensagens();
}


function mostrarCadastro() {
    loginPanel.classList.remove("active");
    registerPanel.classList.add("active");

    loginModeButton.classList.remove("active");
    registerModeButton.classList.add("active");

    limparMensagens();
}


/* =========================================
   BOTÕES SUPERIORES
   ========================================= */

if (loginModeButton) {
    loginModeButton.addEventListener("click", mostrarLogin);
}

if (registerModeButton) {
    registerModeButton.addEventListener("click", mostrarCadastro);
}


/* =========================================
   BOTÃO "QUERO ME CADASTRAR"
   ========================================= */

if (bottomRegisterButton) {
    bottomRegisterButton.addEventListener("click", mostrarCadastro);
}


/* =========================================
   BOTÃO "JÁ SOU ALUNO"
   ========================================= */

if (bottomLoginButton) {
    bottomLoginButton.addEventListener("click", mostrarLogin);
}


/* =========================================
   LIMPAR MENSAGENS
   ========================================= */

function limparMensagens() {

    if (loginMessage) {
        loginMessage.textContent = "";
        loginMessage.className = "form-message";
    }

    if (cadastroMessage) {
        cadastroMessage.textContent = "";
        cadastroMessage.className = "form-message";
    }

    limparErrosCadastro();
}


/* =========================================
   LIMPAR ERROS DOS CAMPOS
   ========================================= */

function limparErrosCadastro() {

    document.querySelectorAll(".cadastro-field-error").forEach(function (campo) {
        campo.classList.remove("cadastro-field-error");
    });

    document.querySelectorAll(".cadastro-error-message").forEach(function (erro) {
        erro.remove();
    });
}


/* =========================================
   MOSTRAR ERRO EM UM CAMPO
   ========================================= */

function mostrarErroCampo(campo, mensagem) {

    if (!campo) {
        return;
    }

    campo.classList.add("cadastro-field-error");

    const campoContainer = campo.closest(".form-field");

    if (!campoContainer) {
        return;
    }

    const erroExistente = campoContainer.querySelector(
        ".cadastro-error-message"
    );

    if (erroExistente) {
        erroExistente.remove();
    }

    const mensagemErro = document.createElement("span");

    mensagemErro.className = "cadastro-error-message";
    mensagemErro.textContent = mensagem;

    campoContainer.appendChild(mensagemErro);
}


/* =========================================
   MOSTRAR ERRO DA API NO CAMPO
   ========================================= */

function mostrarErroDaApi(mensagem) {

    const texto = mensagem.toLowerCase();

    const camposPorPalavra = [
        ["cpf", cadastroCpf],
        ["nome", cadastroNome],
        ["e-mail", cadastroEmail],
        ["telefone", cadastroTelefone],
        ["categoria", cadastroCategoria],
        ["senha", cadastroSenha]
    ];

    const encontrado = camposPorPalavra.find(
        ([palavra]) => texto.includes(palavra)
    );


    if (encontrado) {

        mostrarErroCampo(encontrado[1], mensagem);

        return;
    }


    cadastroMessage.textContent = mensagem;

    cadastroMessage.classList.add("error");
}


/* =========================================
   REMOVER ERRO AO DIGITAR
   ========================================= */

function ativarRemocaoDeErro(campo) {

    if (!campo) {
        return;
    }

    campo.addEventListener("input", function () {

        campo.classList.remove("cadastro-field-error");

        const campoContainer = campo.closest(".form-field");

        if (!campoContainer) {
            return;
        }

        const erro = campoContainer.querySelector(
            ".cadastro-error-message"
        );

        if (erro) {
            erro.remove();
        }
    });


    campo.addEventListener("change", function () {

        campo.classList.remove("cadastro-field-error");

        const campoContainer = campo.closest(".form-field");

        if (!campoContainer) {
            return;
        }

        const erro = campoContainer.querySelector(
            ".cadastro-error-message"
        );

        if (erro) {
            erro.remove();
        }
    });
}


/* =========================================
   FORMATAÇÃO DE CPF
   ========================================= */

function formatarCPF(valor) {

    let cpf = valor.replace(/\D/g, "");

    cpf = cpf.substring(0, 11);

    if (cpf.length > 9) {
        return cpf.replace(
            /(\d{3})(\d{3})(\d{3})(\d{1,2})/,
            "$1.$2.$3-$4"
        );
    }

    if (cpf.length > 6) {
        return cpf.replace(
            /(\d{3})(\d{3})(\d{1,3})/,
            "$1.$2.$3"
        );
    }

    if (cpf.length > 3) {
        return cpf.replace(
            /(\d{3})(\d{1,3})/,
            "$1.$2"
        );
    }

    return cpf;
}


/* =========================================
   CPF OU CNPJ DO LOGIN
   O CNPJ novo tem letras nas 12 primeiras posições.
   ========================================= */

function limparDocumento(valor) {
    return valor.replace(/[^0-9A-Za-z]/g, "").toUpperCase().substring(0, 14);
}


function formatarDocumento(valor) {

    const documento = limparDocumento(valor);

    if (documento.length <= 11 && /^\d*$/.test(documento)) {
        return formatarCPF(documento);
    }

    return documento.replace(
        /^(\w{2})(\w{0,3})(\w{0,3})(\w{0,4})(\w{0,2})$/,
        function (_, p1, p2, p3, p4, p5) {

            let resultado = p1;

            resultado += p2 ? `.${p2}` : "";
            resultado += p3 ? `.${p3}` : "";
            resultado += p4 ? `/${p4}` : "";
            resultado += p5 ? `-${p5}` : "";

            return resultado;
        }
    );
}


if (loginCpf) {

    loginCpf.addEventListener("input", function () {
        this.value = formatarDocumento(this.value);
    });
}


/* =========================================
   CPF DO CADASTRO
   ========================================= */

const cadastroCpf = document.getElementById("cpf");

if (cadastroCpf) {

    cadastroCpf.addEventListener("input", function () {
        this.value = formatarCPF(this.value);
    });

    ativarRemocaoDeErro(cadastroCpf);
}


/* =========================================
   CAMPOS DO CADASTRO
   ========================================= */

const cadastroNome = document.getElementById("nome");
const cadastroEmail = document.getElementById("email");
const cadastroTelefone = document.getElementById("telefone");
const cadastroCategoria = document.getElementById("categoria");
const cadastroSenha = document.getElementById("senha");
const cadastroConfirmarSenha = document.getElementById("confirmarSenha");


ativarRemocaoDeErro(cadastroNome);
ativarRemocaoDeErro(cadastroEmail);
ativarRemocaoDeErro(cadastroTelefone);
ativarRemocaoDeErro(cadastroCategoria);
ativarRemocaoDeErro(cadastroSenha);
ativarRemocaoDeErro(cadastroConfirmarSenha);


/* =========================================
   FORMATAÇÃO DE TELEFONE
   ========================================= */

const cadastroTelefoneInput = document.getElementById("telefone");


function formatarTelefone(valor) {

    let telefone = valor.replace(/\D/g, "");

    telefone = telefone.substring(0, 11);

    if (telefone.length <= 10) {

        return telefone.replace(
            /(\d{2})(\d{4})(\d{0,4})/,
            function (_, ddd, parte1, parte2) {

                let resultado = `(${ddd}) ${parte1}`;

                if (parte2) {
                    resultado += `-${parte2}`;
                }

                return resultado;
            }
        );
    }

    return telefone.replace(
        /(\d{2})(\d{5})(\d{0,4})/,
        function (_, ddd, parte1, parte2) {

            let resultado = `(${ddd}) ${parte1}`;

            if (parte2) {
                resultado += `-${parte2}`;
            }

            return resultado;
        }
    );
}


if (cadastroTelefoneInput) {

    cadastroTelefoneInput.addEventListener("input", function () {

        this.value = formatarTelefone(this.value);
    });
}


/* =========================================
   MOSTRAR / OCULTAR SENHA
   ========================================= */

if (passwordToggle && loginPassword) {

    passwordToggle.addEventListener("click", function () {

        if (loginPassword.type === "password") {

            loginPassword.type = "text";
            passwordToggle.textContent = "Ocultar";

        } else {

            loginPassword.type = "password";
            passwordToggle.textContent = "Mostrar";
        }
    });
}


/* =========================================
   LOGIN
   ========================================= */

if (loginForm) {

    loginForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        limparMensagens();

        const documento = limparDocumento(loginCpf.value);

        const senha = loginPassword.value;


        /* CPF (aluno e motorista) OU CNPJ (autoescola) */

        const cpfValido = documento.length === 11 && /^\d+$/.test(documento);

        if (!cpfValido && documento.length !== 14) {

            loginMessage.textContent =
                "Digite um CPF com 11 números ou um CNPJ com 14 caracteres.";

            loginMessage.classList.add("error");

            return;
        }


        /* SENHA */

        if (!senha) {

            loginMessage.textContent =
                "Digite sua senha.";

            loginMessage.classList.add("error");

            return;
        }


        /* LOGIN */

        let resposta;

        loginSubmit.disabled = true;

        try {

            resposta = await login(documento, senha);

        } catch (erro) {

            loginMessage.textContent =
                erro.message;

            loginMessage.classList.add("error");

            return;

        } finally {

            loginSubmit.disabled = false;
        }


        /* TELA DE CADA PERFIL (O MOTORISTA AINDA NÃO TEM) */

        const telaDoPerfil = {
            Aluno: "dashboard.html",
            Autoescola: "autoescola.html"
        };

        const tela = telaDoPerfil[resposta.perfil.descricao];

        if (!tela) {

            limparSessao();

            loginMessage.textContent =
                "A tela do motorista ainda está em construção.";

            loginMessage.classList.add("info");

            return;
        }


        loginMessage.textContent =
            "Login realizado com sucesso!";

        loginMessage.classList.add("success");


        setTimeout(function () {

            window.location.href = tela;

        }, 700);

    });
}


/* =========================================
   CADASTRO
   ========================================= */

if (cadastroForm) {

    cadastroForm.addEventListener("submit", async function (event) {

        event.preventDefault();

        limparMensagens();


        /* =====================================
           CAMPOS
           ===================================== */

        const nome = cadastroNome.value.trim();

        const cpf = cadastroCpf.value.replace(/\D/g, "");

        const email = cadastroEmail.value.trim();

        const telefone = cadastroTelefoneInput.value.replace(/\D/g, "");

        const categoria = cadastroCategoria.value;

        const senha = cadastroSenha.value;

        const confirmarSenha = cadastroConfirmarSenha.value;


        let formularioValido = true;


        /* =====================================
           NOME
           ===================================== */

        if (nome.length < 3) {

            mostrarErroCampo(
                cadastroNome,
                "Digite seu nome completo."
            );

            formularioValido = false;
        }


        /* =====================================
           CPF
           ===================================== */

        if (cpf.length !== 11) {

            mostrarErroCampo(
                cadastroCpf,
                "Digite um CPF com 11 números."
            );

            formularioValido = false;
        }


        /* =====================================
           E-MAIL
           ===================================== */

        if (!email.includes("@") || !email.includes(".")) {

            mostrarErroCampo(
                cadastroEmail,
                "Digite um e-mail válido."
            );

            formularioValido = false;
        }


        /* =====================================
           TELEFONE
           ===================================== */

        if (telefone.length < 10) {

            mostrarErroCampo(
                cadastroTelefoneInput,
                "Digite um telefone válido."
            );

            formularioValido = false;
        }


        /* =====================================
           CATEGORIA
           ===================================== */

        if (!["A", "B", "AB"].includes(categoria)) {

            mostrarErroCampo(
                cadastroCategoria,
                "Selecione uma categoria."
            );

            formularioValido = false;
        }


        /* =====================================
           SENHA
           ===================================== */

        if (senha.length < 6) {

            mostrarErroCampo(
                cadastroSenha,
                "A senha deve ter pelo menos 6 caracteres."
            );

            formularioValido = false;
        }


        /* =====================================
           CONFIRMAR SENHA
           ===================================== */

        if (senha !== confirmarSenha) {

            mostrarErroCampo(
                cadastroConfirmarSenha,
                "As senhas não coincidem."
            );

            formularioValido = false;
        }


        /* =====================================
           PARA SE EXISTIR ERRO
           ===================================== */

        if (!formularioValido) {
            return;
        }


        /* =====================================
           CADASTRO
           ===================================== */

        const categoriasDaApi = {
            A: [1],
            B: [2],
            AB: [1, 2]
        };


        /* O botão fica travado até o login da conta nova. */
        cadastroSubmit.disabled = true;

        try {

            await cadastrarAluno({
                nome: nome,
                cpf: cpf,
                email: email,
                telefone: telefone,
                categorias: categoriasDaApi[categoria],
                senha: senha
            });

        } catch (erro) {

            cadastroSubmit.disabled = false;

            const erros =
                erro.erros ?? [erro.message || "Erro inesperado. Tente de novo."];

            erros.forEach(mostrarErroDaApi);

            return;
        }


        /* =====================================
           ENTRA COM A CONTA NOVA
           ===================================== */

        try {

            await login(cpf, senha);

        } catch {

            cadastroSubmit.disabled = false;

            voltarParaLogin(cpf);

            return;
        }


        cadastroSubmit.disabled = false;

        mostrarEtapaPacote(categoriasDaApi[categoria]);

    });
}


/* =========================================
   LOGIN DEPOIS DO CADASTRO FALHOU:
   VOLTA PARA O LOGIN COM O CPF
   ========================================= */

function voltarParaLogin(cpf) {

    cadastroMessage.textContent =
        "Cadastro realizado com sucesso!";

    cadastroMessage.classList.add("success");


    cadastroForm.reset();


    setTimeout(function () {

        mostrarLogin();

        loginCpf.value = formatarCPF(cpf);

        loginPassword.focus();

    }, 1000);
}


/* =========================================
   ETAPA DO PACOTE (DEPOIS DO CADASTRO)
   ========================================= */

const accessSwitch = document.querySelector(".access-switch");
const pacoteStep = document.getElementById("pacote-step");
const pacoteEscolha = document.getElementById("pacote-escolha");
const pacoteMessage = document.getElementById("pacote-message");
const pacoteConfirmar = document.getElementById("pacote-confirmar");
const pacoteDepois = document.getElementById("pacote-depois");

let escolhaDePacotes = null;
let indoParaPainel = false;


function irParaPainel() {

    window.location.href = "dashboard.html";
}


/* categorias: [1], [2] ou [1, 2] */
function mostrarEtapaPacote(categorias) {

    limparMensagens();

    cadastroForm.reset();


    /* Fica só a etapa do pacote no painel de cadastro. */
    accessSwitch.hidden = true;

    Array.from(registerPanel.children).forEach(function (filho) {
        filho.hidden = filho !== pacoteStep;
    });


    escolhaDePacotes = montarEscolhaDePacotes(
        pacoteEscolha,
        categorias,
        { botao: pacoteConfirmar }
    );

    pacoteStep.scrollIntoView({ behavior: "smooth", block: "start" });
}


pacoteConfirmar.addEventListener("click", async function () {

    if (!escolhaDePacotes || indoParaPainel) {
        return;
    }

    pacoteMessage.replaceChildren();


    /* Sair no meio do envio deixaria pedido sem aviso. */
    pacoteDepois.disabled = true;

    const resultados = await escolhaDePacotes.enviar();

    if (!resultados) {
        pacoteDepois.disabled = false;
        return;
    }


    /* Falhou algum: mostra e deixa tentar de novo (os enviados não voltam). */

    const falhas = resultados.filter((resultado) => !resultado.ok);

    if (falhas.length > 0) {

        const enviados = resultados
            .filter((resultado) => resultado.ok)
            .map((resultado) => resultado.pacote);

        pacoteMessage.replaceChildren(...resumoDoEnvio(enviados, falhas));

        pacoteDepois.disabled = false;

        return;
    }


    /* Tudo enviado: "Escolher depois" continua travado. */

    indoParaPainel = true;

    pacoteMessage.replaceChildren(
        ...resumoDoEnvio(escolhaDePacotes.enviados(), [])
    );

    setTimeout(irParaPainel, 2000);
});


pacoteDepois.addEventListener("click", irParaPainel);


/* =========================================
   ESQUECI MINHA SENHA
   ========================================= */

if (forgotPassword) {

    forgotPassword.addEventListener("click", function (event) {

        event.preventDefault();

        loginMessage.textContent =
            "Entre em contato com a recepção para recuperar sua senha.";

        loginMessage.classList.add("info");

    });
}



/* =========================================
   ABRIR CADASTRO PELO LINK
   ========================================= */

const parametrosUrl =
    new URLSearchParams(window.location.search);

if (parametrosUrl.get("cadastro") === "true") {

    mostrarCadastro();
}


/* =========================================
   SESSÃO EXPIRADA (401 NA API)
   ========================================= */

if (parametrosUrl.get("sessao") === "expirada" && loginMessage) {

    loginMessage.textContent =
        "Sua sessão expirou. Entre de novo.";

    loginMessage.classList.add("info");
}