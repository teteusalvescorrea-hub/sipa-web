import { login } from "./modules/essencial/service/authService.js";
import { limparSessao } from "./modules/essencial/utils/sessao.js";
import { cadastrarAluno } from "./modules/alunos/services/alunos.service.js";


/* =========================================
   ELEMENTOS
   ========================================= */

const loginModeButton = document.getElementById("login-mode-button");
const registerModeButton = document.getElementById("register-mode-button");

const loginPanel = document.getElementById("login-panel");
const registerPanel = document.getElementById("register-panel");

const loginForm = document.getElementById("login-form");
const cadastroForm = document.getElementById("cadastroForm");

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
        loginMessage.className = "login-message";
    }

    if (cadastroMessage) {
        cadastroMessage.textContent = "";
        cadastroMessage.className = "cadastro-message";
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
   CPF DO LOGIN
   ========================================= */

if (loginCpf) {

    loginCpf.addEventListener("input", function () {
        this.value = formatarCPF(this.value);
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

        const cpf = loginCpf.value.replace(/\D/g, "");

        const senha = loginPassword.value;


        /* CPF */

        if (cpf.length !== 11) {

            loginMessage.textContent =
                "Digite um CPF com 11 números.";

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

        try {

            resposta = await login(cpf, senha);

        } catch (erro) {

            loginMessage.textContent =
                erro.message;

            loginMessage.classList.add("error");

            return;
        }


        /* SÓ O ALUNO TEM TELAS POR ENQUANTO */

        if (resposta.perfil.descricao !== "Aluno") {

            limparSessao();

            loginMessage.textContent =
                "As telas de motorista e autoescola ainda estão em construção.";

            loginMessage.classList.add("info");

            return;
        }


        loginMessage.textContent =
            "Login realizado com sucesso!";

        loginMessage.classList.add("success");


        /* DASHBOARD */

        setTimeout(function () {

            window.location.href = "dashboard.html";

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

            erro.erros.forEach(mostrarErroDaApi);

            return;
        }


        /* =====================================
           SUCESSO
           ===================================== */

        cadastroMessage.textContent =
            "Cadastro realizado com sucesso!";

        cadastroMessage.classList.add("success");


        cadastroForm.reset();


        /* =====================================
           VOLTA PARA LOGIN
           ===================================== */

        setTimeout(function () {

            mostrarLogin();

            loginCpf.value = formatarCPF(cpf);

            loginPassword.focus();

        }, 1000);

    });
}


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