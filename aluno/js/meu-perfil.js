/* =========================================
   SIPA — MEU PERFIL
   PARTE 1 — CARREGAR DADOS DO ALUNO
   ========================================= */

import { formatarCpf } from '../../shared/js/formatacao.js';
import { exigirLogin } from "../../shared/js/sessao.js";
import { sair } from "../../shared/js/services/authService.js";
import { obterAlunoLogado } from "../../shared/js/services/alunos.service.js";
import { listarContratacoes }
    from "../../shared/js/services/contratacoes.service.js";


/* =========================================
   ELEMENTOS
   ========================================= */

const profileAvatar =
    document.getElementById(
        "profile-avatar"
    );

const profileName =
    document.getElementById(
        "profile-name"
    );

const profileCategory =
    document.getElementById(
        "profile-category"
    );

const profileFullName =
    document.getElementById(
        "profile-full-name"
    );

const profileCpf =
    document.getElementById(
        "profile-cpf"
    );

const profileEmail =
    document.getElementById(
        "profile-email"
    );

const profilePhone =
    document.getElementById(
        "profile-phone"
    );

const profileCourseCategory =
    document.getElementById(
        "profile-course-category"
    );

const profilePackage =
    document.getElementById(
        "profile-package"
    );

const profileRemaining =
    document.getElementById(
        "profile-remaining"
    );

const profileSchool =
    document.getElementById(
        "profile-school"
    );


/* =========================================
   FORMATAR CPF
   ========================================= */

/* =========================================
   FORMATAR TELEFONE
   ========================================= */

function formatarTelefone(telefone) {

    if (!telefone) {

        return "-";

    }


    const numero =
        String(telefone).replace(
            /\D/g,
            ""
        );


    if (numero.length === 11) {

        return (
            "(" +
            numero.substring(0, 2) +
            ") " +
            numero.substring(2, 7) +
            "-" +
            numero.substring(7, 11)
        );

    }


    if (numero.length === 10) {

        return (
            "(" +
            numero.substring(0, 2) +
            ") " +
            numero.substring(2, 6) +
            "-" +
            numero.substring(6, 10)
        );

    }


    return telefone;

}


/* =========================================
   CATEGORIA
   ========================================= */

function obterNomeCategoria(categoria) {

    const categorias = {

        A:
            "Categoria A — Moto",

        B:
            "Categoria B — Carro",

        AB:
            "Categoria AB — Carro + Moto"

    };


    return (
        categorias[categoria] ||
        "Categoria não informada"
    );

}


/* =========================================
   CARREGAR PERFIL
   ========================================= */

async function carregarPerfil() {

    let aluno;

    try {

        aluno = await obterAlunoLogado();

    } catch (erro) {

        profileName.textContent = erro.message;

        return;

    }


    /* =====================================
       NOME
       ===================================== */

    const nomeCompleto =
        aluno.nome || "Aluno";


    const primeiroNome =
        nomeCompleto
            .trim()
            .split(" ")[0];


    if (profileName) {

        profileName.textContent =
            nomeCompleto;

    }


    if (profileFullName) {

        profileFullName.textContent =
            nomeCompleto;

    }


    /* =====================================
       INICIAL
       ===================================== */

    if (profileAvatar) {

        profileAvatar.textContent =
            primeiroNome
                .charAt(0)
                .toUpperCase();

    }


    /* =====================================
       CATEGORIA
       ===================================== */

    const siglas = { 1: "A", 2: "B" };

    const categoria = aluno.categoriasPretendidas
        .map((item) => siglas[item.valor])
        .join("");


    const nomeCategoria =
        obterNomeCategoria(
            categoria
        );


    if (profileCategory) {

        profileCategory.textContent =
            nomeCategoria;

    }


    if (profileCourseCategory) {

        profileCourseCategory.textContent =
            categoria || "-";

    }


    /* =====================================
       CPF
       ===================================== */

    if (profileCpf) {

        profileCpf.textContent =
            formatarCpf(
                aluno.cpf
            );

    }


    /* =====================================
       E-MAIL
       ===================================== */

    if (profileEmail) {

        profileEmail.textContent =
            aluno.email || "-";

    }


    /* =====================================
       TELEFONE
       ===================================== */

    if (profilePhone) {

        profilePhone.textContent =
            formatarTelefone(
                aluno.telefone
            );

    }


    /* =====================================
       PACOTE
       ===================================== */

    if (profilePackage) {

        profilePackage.querySelectorAll('strong').forEach(n=>n.textContent='Não informado');
        profilePackage.nextElementSibling.textContent='Totais por categoria ainda não disponíveis.';

    }


    /* =====================================
       AULAS RESTANTES
       ===================================== */

    if (profileRemaining) {

        profileRemaining.querySelectorAll('strong').forEach(n=>n.textContent='Não informado');
        profileRemaining.nextElementSibling.textContent='Saldos por categoria ainda não disponíveis.';

    }


    /* =====================================
       CONSOLE
       ===================================== */



}


/* =========================================
   LOGOUT
   ========================================= */

const logoutButton =
    document.getElementById(
        "profile-logout"
    );


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        sair
    );

}


/* =========================================
   AUTOESCOLA (CONTRATAÇÕES APROVADAS E ENCERRADAS)
   ========================================= */

async function carregarAutoescola() {

    try {

        const contratacoes = await listarContratacoes([2, 4]);

        const nomes =
            [...new Set(contratacoes.map((contratacao) => contratacao.autoescolaNome))];

        profileSchool.textContent = nomes.join(", ") || "—";

    } catch {

        profileSchool.textContent = "—";

    }

}


/* =========================================
   INICIAR
   ========================================= */

if (exigirLogin(["Aluno"])) {
    carregarPerfil();
    carregarAutoescola();
}


// O serviço integrado atual não oferece alteração de senha; a política local não é reutilizada aqui.
const alterarSenha=document.getElementById('change-password-button');if(alterarSenha){alterarSenha.disabled=true;alterarSenha.title='Alteração de senha indisponível neste ambiente.';const aviso=document.createElement('small');aviso.id='profile-password-availability';aviso.textContent='Alteração de senha ainda indisponível neste ambiente.';alterarSenha.setAttribute('aria-describedby',aviso.id);aviso.style.display='block';alterarSenha.closest('.profile-security-card').querySelector('div').append(aviso);}
