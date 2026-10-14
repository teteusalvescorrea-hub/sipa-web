/* =========================================
   SIPA — DASHBOARD
   JAVASCRIPT DO PAINEL DO ALUNO
   ========================================= */

/* =========================================
   IMPORTS DA API
   O painel busca os dados do aluno e a
   próxima aula na API (nada no localStorage).
   ========================================= */

import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import { obterAlunoLogado } from "./modules/alunos/services/alunos.service.js";
import { listarAgendamentos } from "./modules/agendamentos/services/agendamentos.service.js";


/* =========================================
   ELEMENTOS DO DASHBOARD
   ========================================= */

const studentName =
    document.getElementById("student-name");

const headerStudentName =
    document.getElementById("header-student-name");

const studentInitial =
    document.getElementById("student-initial");

const studentCategory =
    document.getElementById("student-category");

const headerStudentCategory =
    document.getElementById("header-student-category");

const licenseCategory =
    document.getElementById("license-category");

const remainingLessons =
    document.getElementById("remaining-lessons");

const studentPackage =
    document.getElementById("student-package");

const progressPercent =
    document.getElementById("progress-percent");

const progressNumber =
    document.getElementById("progress-number");

const progressBar =
    document.getElementById("progress-bar");


/* =========================================
   SIGLAS DAS CATEGORIAS
   A API manda cada categoria como
   { descricao, valor }: 1 = A (moto), 2 = B (carro).
   ========================================= */

function siglasDasCategorias(categorias) {

    const siglas = {
        1: "A",
        2: "B"
    };

    return categorias
        .map((categoria) => siglas[categoria.valor])
        .join("");

}


/* =========================================
   CARREGAR DADOS DO ALUNO
   aluno = resposta do GET /api/alunos/me
   ========================================= */

function carregarDadosAluno(aluno) {

    /* NOME */

    if (studentName) {

        studentName.textContent =
            aluno.nome.split(" ")[0];

    }


    if (headerStudentName) {

        headerStudentName.textContent =
            aluno.nome;

    }


    /* INICIAL */

    if (studentInitial) {

        studentInitial.textContent =
            aluno.nome
                .charAt(0)
                .toUpperCase();

    }


    /* CATEGORIA (a do pacote contratado ou, sem pacote, a escolhida no cadastro) */

    const categoria =
        siglasDasCategorias(aluno.categoriasFormacao);


    if (studentCategory) {

        studentCategory.textContent =
            categoria;

    }


    if (headerStudentCategory) {

        headerStudentCategory.textContent =
            `Categoria ${categoria}`;

    }


    if (licenseCategory) {

        licenseCategory.textContent =
            `Categoria ${categoria}`;

    }


    /* AULAS RESTANTES */

    if (remainingLessons) {

        remainingLessons.textContent =
            aluno.aulasRestantes;

    }


    /* PACOTE (total de aulas contratadas) */

    if (studentPackage) {

        studentPackage.textContent =
            aluno.aulasContratadas;

    }


    /* PROGRESSO (a API já calcula a porcentagem) */

    const progresso =
        aluno.percentualProgresso;


    if (progressPercent) {

        progressPercent.textContent =
            `${progresso}%`;

    }


    if (progressNumber) {

        progressNumber.textContent =
            `${progresso}%`;

    }


    if (progressBar) {

        progressBar.style.width =
            `${progresso}%`;

    }

}


/* =========================================
   LOGOUT
   sair() apaga o token e volta para o login.
   ========================================= */

const logoutButton =
    document.getElementById("logout-button");


if (logoutButton) {

    logoutButton.addEventListener(
        "click",
        sair
    );

}


/* =========================================
   MENU MOBILE
   ========================================= */

const mobileMenuButton =
    document.getElementById(
        "mobile-menu-button"
    );

const sidebar =
    document.querySelector(".sidebar");


if (
    mobileMenuButton &&
    sidebar
) {

    mobileMenuButton.addEventListener(
        "click",
        () => {

            sidebar.classList.toggle(
                "mobile-open"
            );

        }
    );

}


/* =========================================
   FECHAR MENU MOBILE
   AO CLICAR EM UM LINK
   ========================================= */

const sidebarLinks =
    document.querySelectorAll(
        ".sidebar-link"
    );


sidebarLinks.forEach((link) => {

    link.addEventListener(
        "click",
        () => {

            if (
                window.innerWidth <= 640 &&
                sidebar
            ) {

                sidebar.classList.remove(
                    "mobile-open"
                );

            }

        }
    );

});


/* =========================================
   MENU DO DASHBOARD
   ========================================= */

sidebarLinks.forEach((link) => {

    link.addEventListener(
        "click",
        () => {

            sidebarLinks.forEach(
                (item) => {

                    item.classList.remove(
                        "active"
                    );

                }
            );

            link.classList.add(
                "active"
            );

        }
    );

});


/* =========================================
   NOTIFICAÇÕES
   ========================================= */

const notificationButton =
    document.getElementById(
        "notification-button"
    );


if (notificationButton) {

    notificationButton.addEventListener(
        "click",
        () => {

            console.log(
                "Abrindo notificações..."
            );

        }
    );

}


/* =========================================
   AÇÕES RÁPIDAS
   ========================================= */

const quickActions =
    document.querySelectorAll(
        ".quick-action"
    );


quickActions.forEach((action) => {

    action.addEventListener(
        "click",
        () => {

            const actionType =
                action.dataset.action;

            console.log(
                "Ação selecionada:",
                actionType
            );

        }
    );

});


/* =========================================
   BOTÃO — VER DETALHES
   ========================================= */

const viewLessonButton =
    document.getElementById(
        "view-lesson-button"
    );


if (viewLessonButton) {

    viewLessonButton.addEventListener(
        "click",
        () => {

            console.log(
                "Abrindo detalhes da próxima aula..."
            );

        }
    );

}


/* =========================================
   BOTÃO — VER TODAS AS AULAS
   ========================================= */

const viewAllLessons =
    document.getElementById(
        "view-all-lessons"
    );


if (viewAllLessons) {

    viewAllLessons.addEventListener(
        "click",
        () => {

            console.log(
                "Abrindo todas as aulas..."
            );

        }
    );

}


/* =========================================
   FECHAR SIDEBAR AO CLICAR FORA
   NO CELULAR
   ========================================= */

document.addEventListener(
    "click",
    (event) => {

        if (
            window.innerWidth > 640 ||
            !sidebar ||
            !sidebar.classList.contains(
                "mobile-open"
            )
        ) {

            return;

        }


        const clickedInsideSidebar =
            sidebar.contains(event.target);

        const clickedMenuButton =
            mobileMenuButton &&
            mobileMenuButton.contains(
                event.target
            );


        if (
            !clickedInsideSidebar &&
            !clickedMenuButton
        ) {

            sidebar.classList.remove(
                "mobile-open"
            );

        }

    }
);


/* =========================================
   ELEMENTOS DA PRÓXIMA AULA
   ========================================= */

const nextLessonDay =
    document.getElementById(
        "next-lesson-day"
    );


const nextLessonWeekday =
    document.getElementById(
        "next-lesson-weekday"
    );


const nextLessonMonth =
    document.getElementById(
        "next-lesson-month"
    );


const nextLessonTime =
    document.getElementById(
        "next-lesson-time"
    );


const nextLessonInstructor =
    document.getElementById(
        "next-lesson-instructor"
    );


const nextLessonVehicle =
    document.getElementById(
        "next-lesson-vehicle"
    );


const nextLessonCategory =
    document.getElementById(
        "next-lesson-category"
    );


/* =========================================
   LOCALIZAÇÃO DA PRÓXIMA AULA
   ========================================= */

const nextLessonLocation =
    document.querySelector(
        ".lesson-footer > span"
    );


/* =========================================
   NOMES DOS DIAS
   ========================================= */

const diasSemanaSipa = [
    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"
];


/* =========================================
   NOMES DOS MESES
   ========================================= */

const mesesSipa = [
    "Janeiro",
    "Fevereiro",
    "Março",
    "Abril",
    "Maio",
    "Junho",
    "Julho",
    "Agosto",
    "Setembro",
    "Outubro",
    "Novembro",
    "Dezembro"
];


/* =========================================
   MOSTRAR PRÓXIMA AULA
   aula = 1º item do GET /api/agendamentos
   (a API já devolve as próximas aulas em ordem)
   ========================================= */

function carregarProximaAula(aula) {

    /* =====================================
       NENHUMA AULA FUTURA
       ===================================== */

    if (!aula) {

        if (nextLessonDay) {

            nextLessonDay.textContent =
                "—";

        }


        if (nextLessonWeekday) {

            nextLessonWeekday.textContent =
                "Nenhuma aula agendada";

        }


        if (nextLessonMonth) {

            nextLessonMonth.textContent =
                "Agende sua próxima aula";

        }


        if (nextLessonTime) {

            nextLessonTime.textContent =
                "—";

        }


        if (nextLessonInstructor) {

            nextLessonInstructor.textContent =
                "—";

        }


        if (nextLessonVehicle) {

            nextLessonVehicle.textContent =
                "—";

        }


        if (nextLessonCategory) {

            nextLessonCategory.textContent =
                "—";

        }


        if (nextLessonLocation) {

            nextLessonLocation.textContent =
                "—";

        }


        return;

    }


    /* =====================================
       DATA
       "2026-10-20T14:00:00" vira uma data
       (horário de Brasília, sem fuso)
       ===================================== */

    const data =
        new Date(aula.dataHoraInicio);


    /* =====================================
       DIA
       ===================================== */

    if (nextLessonDay) {

        nextLessonDay.textContent =
            String(
                data.getDate()
            ).padStart(2, "0");

    }


    /* =====================================
       DIA DA SEMANA
       ===================================== */

    if (nextLessonWeekday) {

        nextLessonWeekday.textContent =
            diasSemanaSipa[
                data.getDay()
            ];

    }


    /* =====================================
       MÊS E ANO
       ===================================== */

    if (nextLessonMonth) {

        nextLessonMonth.textContent =
            `${mesesSipa[data.getMonth()]} de ${data.getFullYear()}`;

    }


    /* =====================================
       HORÁRIO
       Se a aula ainda não está confirmada,
       mostra o status junto (ex.: Aguardando aceite).
       ===================================== */

    if (nextLessonTime) {

        let horario =
            aula.dataHoraInicio.substring(11, 16);

        if (aula.status.valor !== 1) {
            horario += ` · ${aula.status.descricao}`;
        }

        nextLessonTime.textContent =
            horario;

    }


    /* =====================================
       MOTORISTA
       ===================================== */

    if (nextLessonInstructor) {

        nextLessonInstructor.textContent =
            aula.motoristaNome ||
            "—";

    }


    /* =====================================
       VEÍCULO
       ===================================== */

    if (nextLessonVehicle) {

        nextLessonVehicle.textContent =
            `${aula.veiculoModelo} — ${aula.veiculoPlaca}`;

    }


    /* =====================================
       CATEGORIA
       ===================================== */

    if (nextLessonCategory) {

        nextLessonCategory.textContent =
            aula.categoria.descricao;

    }


    /* =====================================
       LOCALIZAÇÃO DA AULA
       (unidade e endereço do ponto de encontro)
       ===================================== */

    if (nextLessonLocation) {

        nextLessonLocation.textContent =
            `${aula.unidade}: ${aula.localAula}`;

    }

}


/* =========================================
   MOSTRAR ERRO NO CARD DA PRÓXIMA AULA
   ========================================= */

function mostrarErroPainel(mensagem) {

    if (nextLessonWeekday) {

        nextLessonWeekday.textContent =
            "Não foi possível carregar o painel";

    }


    if (nextLessonMonth) {

        nextLessonMonth.textContent =
            mensagem;

    }

}


/* =========================================
   CARREGAR O PAINEL
   Busca o aluno e as próximas aulas na API.
   Se o login venceu, o cliente da API já
   volta para o login sozinho.
   ========================================= */

async function carregarPainel() {

    try {

        const aluno =
            await obterAlunoLogado();

        carregarDadosAluno(aluno);


        const proximasAulas =
            await listarAgendamentos();

        carregarProximaAula(proximasAulas[0]);

    } catch (erro) {

        mostrarErroPainel(erro.message);

    }

}


/* =========================================
   EXECUTAR
   Só carrega se houver login de aluno.
   Sem login, exigirLogin manda para o login.
   ========================================= */

if (exigirLogin(["Aluno"])) {

    carregarPainel();

}
