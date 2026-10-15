/* =========================================
   SIPA — MEU PROGRESSO
   ========================================= */

import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import { obterAlunoLogado } from "./modules/alunos/services/alunos.service.js";
import { listarContratacoes }
    from "./modules/contratacoes/services/contratacoes.service.js";



/* =========================================
   ELEMENTOS DA PÁGINA
   ========================================= */

const progressPercentage =
    document.getElementById(
        "progress-percentage"
    );


const progressMessage =
    document.getElementById(
        "progress-message"
    );


const completedLessons =
    document.getElementById(
        "completed-lessons"
    );


const remainingLessons =
    document.getElementById(
        "remaining-lessons"
    );


const packageLessons =
    document.getElementById(
        "package-lessons"
    );


const scheduledLessons =
    document.getElementById(
        "scheduled-lessons"
    );


const studentCategory =
    document.getElementById(
        "student-category"
    );


const progressBarPercentage =
    document.getElementById(
        "progress-bar-percentage"
    );


const progressFill =
    document.getElementById(
        "progress-fill"
    );


const progressCircle =
    document.getElementById(
        "progress-circle"
    );


const progressPackageLabel =
    document.getElementById(
        "progress-package-label"
    );


const studentSchool =
    document.getElementById(
        "student-school"
    );


const logoutButton =
    document.getElementById(
        "progress-logout"
    );





/* =========================================
   ELEMENTOS NOVOS (API)
   ========================================= */

const packagesList =
    document.getElementById(
        "progress-packages"
    );


const progressError =
    document.getElementById(
        "progress-error"
    );



/* =========================================
   MOSTRAR ERRO DA API
   ========================================= */

function mostrarErro(erro) {

    console.error(
        "SIPA — Erro ao carregar o progresso:",
        erro
    );

    progressError.textContent =
        erro.message;

    progressError.hidden =
        false;

}


/* =========================================
   TEXTOS DA TELA
   ========================================= */

function textoDasCategorias(categorias) {

    const temA =
        categorias.some(
            (categoria) => categoria.valor === 1
        );

    const temB =
        categorias.some(
            (categoria) => categoria.valor === 2
        );

    const texto =
        (temA ? "A" : "") + (temB ? "B" : "");

    return texto || "-";

}


function mensagemDoProgresso(percentual) {

    if (percentual === 0) {
        return "Continue avançando!";
    }

    if (percentual < 25) {
        return "Você está começando!";
    }

    if (percentual < 50) {
        return "Você está evoluindo!";
    }

    if (percentual < 75) {
        return "Você está na metade do caminho!";
    }

    if (percentual < 100) {
        return "Está quase lá!";
    }

    return "Parabéns! Formação concluída!";

}


/* =========================================
   TOTAIS DO ALUNO (GET /api/alunos/me)
   ========================================= */

function mostrarTotais(aluno) {

    const percentual =
        aluno.percentualProgresso;

    completedLessons.textContent =
        aluno.aulasRealizadas;

    remainingLessons.textContent =
        aluno.aulasRestantes;

    packageLessons.textContent =
        aluno.aulasContratadas;

    scheduledLessons.textContent =
        aluno.aulasAgendadas;

    studentCategory.textContent =
        textoDasCategorias(aluno.categoriasFormacao);

    progressPercentage.textContent =
        `${percentual}%`;

    progressBarPercentage.textContent =
        `${percentual}%`;

    progressFill.style.width =
        `${percentual}%`;

    progressCircle.style.background =
        `conic-gradient(#247cff ${percentual}%, #122d57 ${percentual}%)`;

    progressPackageLabel.textContent =
        `${aluno.aulasContratadas} aulas`;

    progressMessage.textContent =
        mensagemDoProgresso(percentual);

}


/* =========================================
   PROGRESSO POR PACOTE (GET /api/contratacoes)
   ========================================= */

function criarTexto(tag, texto) {

    const elemento =
        document.createElement(tag);

    elemento.textContent =
        texto;

    return elemento;

}


function criarCardPacote(contratacao) {

    const card =
        document.createElement("article");

    card.className =
        "progress-detail-card";

    card.append(
        criarTexto("span", contratacao.status.descricao),
        criarTexto("strong", contratacao.pacoteNome),
        criarTexto("small", contratacao.autoescolaNome),
        criarTexto("small", `${contratacao.percentualProgresso}% concluído`),
        criarTexto("small", `Realizadas: ${contratacao.aulasRealizadas}`),
        criarTexto("small", `Faltas: ${contratacao.aulasFaltas}`),
        criarTexto("small", `Agendadas: ${contratacao.aulasAgendadas}`),
        criarTexto(
            "small",
            `Aguardando marcação: ${contratacao.aulasAguardandoMarcacao}`
        ),
        criarTexto("small", `Restantes: ${contratacao.aulasRestantes}`)
    );

    return card;

}


function mostrarPacotes(contratacoes) {

    /*
     * Só as aprovadas (2) e as encerradas (4) têm progresso.
     */

    const comProgresso =
        contratacoes.filter(
            (contratacao) =>
                contratacao.status.valor === 2 ||
                contratacao.status.valor === 4
        );

    const autoescolas =
        [...new Set(comProgresso.map((contratacao) => contratacao.autoescolaNome))];

    studentSchool.textContent = autoescolas.join(", ") || "—";

    packagesList.replaceChildren();

    if (comProgresso.length === 0) {

        packagesList.append(
            criarTexto("p", "Você ainda não tem pacote aprovado.")
        );

        return;

    }

    comProgresso.forEach(
        (contratacao) => {
            packagesList.append(
                criarCardPacote(contratacao)
            );
        }
    );

}


/* =========================================
   LIMPAR A TELA ANTES DA API
   ========================================= */

function limparTela() {

    const campos = [
        progressPercentage, progressMessage, completedLessons, remainingLessons,
        packageLessons, scheduledLessons, studentCategory, progressBarPercentage,
        progressPackageLabel, studentSchool
    ];

    campos.forEach((campo) => {
        campo.textContent = "—";
    });

    progressFill.style.width = "0%";
    progressCircle.style.background = "";
}


/* =========================================
   CARREGAR PROGRESSO DA API
   ========================================= */

async function carregarProgresso() {

    limparTela();

    try {

        const aluno =
            await obterAlunoLogado();

        mostrarTotais(aluno);

        const contratacoes =
            await listarContratacoes();

        mostrarPacotes(contratacoes);

    } catch (erro) {

        mostrarErro(erro);

    }

}



/* =========================================
   LOGOUT
   ========================================= */

logoutButton.addEventListener(
    "click",
    (event) => {

        event.preventDefault();

        sair();

    }
);



/* =========================================
   INICIAR
   ========================================= */

if (exigirLogin(["Aluno"])) {

    carregarProgresso();

}
