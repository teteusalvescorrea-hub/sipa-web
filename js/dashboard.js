/* =========================================
   SIPA — DASHBOARD
   JAVASCRIPT DO PAINEL DO ALUNO
   ========================================= */

import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import { obterAlunoLogado } from "./modules/alunos/services/alunos.service.js";
import { listarAgendamentos } from "./modules/agendamentos/services/agendamentos.service.js";
import { listarContratacoes }
    from "./modules/contratacoes/services/contratacoes.service.js";


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

const welcomeProgressMessage =
    document.getElementById("welcome-progress-message");

const progressCheer =
    document.getElementById("progress-cheer");

const licenseStatus =
    document.getElementById("license-status");


/* =========================================
   SIGLAS DAS CATEGORIAS (1 = A, 2 = B)
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


    /* CATEGORIA */

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


    /* PACOTE */

    if (studentPackage) {

        studentPackage.textContent =
            aluno.aulasContratadas;

    }


    /* PROGRESSO */

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
   TEXTOS DO PROGRESSO
   Sem pacote (0 aulas contratadas), nada de "Em andamento".
   Com pedido pendente, o selo concorda com o aviso do topo.
   contratacoes: null quando a lista falhou
   ========================================= */

function mostrarTextosDoProgresso(aluno, contratacoes) {

    const semPacote =
        aluno.aulasContratadas === 0;

    const aguardando = (contratacoes ?? []).some(
        (contratacao) => contratacao.status.valor === 1
    );

    welcomeProgressMessage.textContent =
        aluno.aulasRealizadas > 0
            ? "Você está indo muito bem!"
            : "Vamos começar?";

    let selo = "Em andamento";

    if (semPacote) {
        selo = aguardando ? "Aguardando autoescola" : "Sem pacote";
    }

    licenseStatus.textContent = selo;

    licenseStatus.classList.toggle("sem-pacote", semPacote);
    licenseStatus.hidden = false;

    progressCheer.hidden = semPacote;

}


/* =========================================
   LOGOUT
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
   ELEMENTOS DA PRÓXIMA AULA, DO RESUMO E DO AVISO
   ========================================= */

const nextLessonStatus = document.getElementById("next-lesson-status");
const nextLessonDay = document.getElementById("next-lesson-day");
const nextLessonWeekday = document.getElementById("next-lesson-weekday");
const nextLessonMonth = document.getElementById("next-lesson-month");
const nextLessonTime = document.getElementById("next-lesson-time");
const nextLessonVehicle = document.getElementById("next-lesson-vehicle");
const nextLessonInstructor = document.getElementById("next-lesson-instructor");
const nextLessonLocation = document.getElementById("next-lesson-location");
const lessonsSummary = document.querySelector(".progress-footer span");
const dashboardNotice = document.getElementById("dashboard-notice");
const packageAlert = document.getElementById("package-alert");
const packageAlertTitle = document.getElementById("package-alert-title");
const packageAlertText = document.getElementById("package-alert-text");
const packageAlertButton = document.getElementById("package-alert-button");

const lessonsList = document.getElementById("lessons-list");


/* =========================================
   NOMES DOS DIAS E DOS MESES
   ========================================= */

const diasSemanaSipa = [
    "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado"
];

const mesesSipa = [
    "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
    "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
];


/* =========================================
   LIMPAR OS VALORES DE EXEMPLO DO HTML
   ========================================= */

function limparTela() {

    const campos = [
        studentName, headerStudentName, studentInitial, studentCategory,
        headerStudentCategory, licenseCategory, remainingLessons, studentPackage,
        progressPercent, progressNumber, lessonsSummary, nextLessonDay,
        nextLessonWeekday, nextLessonMonth, nextLessonTime, nextLessonVehicle,
        nextLessonInstructor, nextLessonLocation, welcomeProgressMessage
    ];

    campos.forEach((campo) => {
        campo.textContent = "—";
    });

    progressBar.style.width = "0%";
    nextLessonStatus.hidden = true;
    licenseStatus.hidden = true;
    progressCheer.hidden = true;
    packageAlert.hidden = true;
    lessonsList.replaceChildren();
}


/* Ordem: aluno, contratações e agenda. */
function resultado(lista, indice) {
    return lista[indice].status === "fulfilled" ? lista[indice].value : null;
}


/* =========================================
   AVISO DO PACOTE, NO TOPO
   Só aparece sem contratação aprovada (2) com saldo.
   ========================================= */

function mostrarAvisoDoPacote(contratacoes) {

    const temSaldo = contratacoes.some(
        (contratacao) => contratacao.status.valor === 2 && contratacao.aulasRestantes > 0
    );

    if (temSaldo) {
        packageAlert.hidden = true;
        return;
    }

    const pendentes = contratacoes.filter(
        (contratacao) => contratacao.status.valor === 1
    );

    /* Já teve pacote (aprovado sem saldo ou encerrado). */
    const jaTevePacote = contratacoes.some(
        (contratacao) => contratacao.status.valor === 2 || contratacao.status.valor === 4
    );

    if (pendentes.length > 0) {

        packageAlertTitle.textContent = pendentes
            .map((contratacao) =>
                `Seu pacote ${contratacao.pacoteNome} está aguardando ` +
                `a confirmação de ${contratacao.autoescolaNome}.`)
            .join(" ");

        packageAlertText.textContent =
            "As aulas aparecem aqui assim que a autoescola confirmar.";

        packageAlertButton.hidden = true;

    } else if (jaTevePacote) {

        /* Mesmo caminho do agendamento: comprar na autoescola e informar o pacote. */
        packageAlertTitle.textContent = "Você não tem mais aulas para agendar.";
        packageAlertText.textContent =
            "Compre mais aulas com a autoescola e informe o novo pacote.";
        packageAlertButton.hidden = false;

    } else {

        packageAlertTitle.textContent = "Você ainda não tem um pacote de aulas.";
        packageAlertText.textContent =
            "Informe o pacote que você comprou na autoescola para começar a agendar.";
        packageAlertButton.hidden = false;
    }

    packageAlert.hidden = false;
}


/* =========================================
   PRÓXIMAS AULAS (ATÉ 3)
   ========================================= */

function criarElemento(tag, classe, texto) {

    const elemento = document.createElement(tag);

    if (classe) {
        elemento.className = classe;
    }

    if (texto !== undefined) {
        elemento.textContent = texto;
    }

    return elemento;
}


function criarLinhaDeAula(aula) {

    const [data, hora] = aula.dataHoraInicio.split("T");
    const [ano, mes, dia] = data.split("-").map(Number);
    const diaDaSemana = diasSemanaSipa[new Date(ano, mes - 1, dia).getDay()];

    /* Na 4 (Recusada), o motorista é quem recusou. */
    const recusada = aula.status.valor === 4;

    const linha = criarElemento("article", "lesson-row");

    const quando = criarElemento("div", "lesson-row-date");
    quando.append(
        criarElemento("span", "", mesesSipa[mes - 1].slice(0, 3).toUpperCase()),
        criarElemento("strong", "", String(dia).padStart(2, "0"))
    );

    const info = criarElemento("div", "lesson-row-info");
    info.append(
        criarElemento("strong", "", `${diaDaSemana}, ${hora.slice(0, 5)}`),
        criarElemento("span", "", aula.unidade)
    );

    const categoria = criarElemento("div", "lesson-row-category");
    categoria.append(criarElemento("span", "category-badge", aula.categoria.descricao));

    const motorista = criarElemento("div", "lesson-row-instructor");
    motorista.append(
        criarElemento("span", "", "MOTORISTA"),
        criarElemento("strong", "", recusada ? "Aguardando novo motorista" : aula.motoristaNome)
    );

    const classeStatus = aula.status.valor === 1 ? "confirmed" : "pending";

    linha.append(
        quando,
        info,
        categoria,
        motorista,
        criarElemento("span", `lesson-row-status ${classeStatus}`, aula.status.descricao)
    );

    return linha;
}


function mostrarProximasAulas(aulas) {

    if (aulas.length === 0) {
        lessonsList.replaceChildren(
            criarElemento("p", "lessons-empty", "Nenhuma aula agendada.")
        );
        return;
    }

    lessonsList.replaceChildren(...aulas.slice(0, 3).map(criarLinhaDeAula));
}


/* =========================================
   RESUMO DAS AULAS, EMBAIXO DA BARRA
   ========================================= */

function mostrarResumoDasAulas(aluno) {

    lessonsSummary.textContent =
        `${aluno.aulasRealizadas} de ${aluno.aulasContratadas} aulas realizadas · ` +
        `${aluno.aulasAgendadas} agendadas · ` +
        `${aluno.aulasAguardandoMarcacao} aguardando marcação`;
}


/* =========================================
   MOSTRAR A PRÓXIMA AULA
   ========================================= */

function mostrarProximaAula(aula) {

    if (!aula) {
        nextLessonWeekday.textContent = "Nenhuma aula agendada";
        nextLessonMonth.textContent = "Agende sua próxima aula";
        return;
    }

    const [data, hora] = aula.dataHoraInicio.split("T");
    const [ano, mes, dia] = data.split("-").map(Number);
    const diaDaSemana = new Date(ano, mes - 1, dia).getDay();
    const local = `${aula.unidade} — ${aula.localAula}`;

    /* Na 4 (Recusada), motorista e veículo são de quem recusou. */
    const recusada = aula.status.valor === 4;
    const veiculo = recusada ? "" : `${aula.veiculoModelo} · ${aula.veiculoPlaca}`;

    nextLessonDay.textContent = String(dia).padStart(2, "0");
    nextLessonWeekday.textContent = diasSemanaSipa[diaDaSemana];
    nextLessonMonth.textContent = `${mesesSipa[mes - 1]} de ${ano}`;
    nextLessonTime.textContent = hora.slice(0, 5);

    nextLessonVehicle.textContent = veiculo || "—";
    nextLessonVehicle.title = veiculo;
    nextLessonInstructor.textContent = recusada ? "Aguardando novo motorista" : aula.motoristaNome;
    nextLessonLocation.textContent = local;
    nextLessonLocation.title = local;

    nextLessonStatus.textContent = aula.status.descricao;
    nextLessonStatus.hidden = false;
}


/* =========================================
   MOSTRAR ERRO NO QUADRO DE AVISO
   ========================================= */

function mostrarErro(erro) {

    console.error("Erro ao carregar o painel:", erro);

    dashboardNotice.querySelector("strong").textContent =
        "Não foi possível carregar o painel";

    dashboardNotice.querySelector(".notice-content span").textContent =
        erro.message;

    dashboardNotice.scrollIntoView({ behavior: "smooth", block: "center" });
}


/* =========================================
   CARREGAR O PAINEL
   ========================================= */

async function carregarPainel() {

    limparTela();

    /* As três juntas. Contratações só servem ao aviso: se falharem, o resto segue. */
    const respostas = await Promise.allSettled([
        obterAlunoLogado(),
        listarContratacoes(),
        listarAgendamentos()
    ]);

    const aluno = resultado(respostas, 0);
    const contratacoes = resultado(respostas, 1);
    const proximasAulas = resultado(respostas, 2);

    if (!aluno) {
        mostrarErro(respostas[0].reason);
        return;
    }

    carregarDadosAluno(aluno);
    mostrarTextosDoProgresso(aluno, contratacoes);
    mostrarResumoDasAulas(aluno);

    if (contratacoes) {
        mostrarAvisoDoPacote(contratacoes);
    } else {
        console.error("Erro ao carregar as contratações:", respostas[1].reason);
    }

    if (proximasAulas) {
        mostrarProximaAula(proximasAulas[0]);
        mostrarProximasAulas(proximasAulas);
    } else {
        mostrarErro(respostas[2].reason);
    }
}


/* =========================================
   EXECUTAR
   ========================================= */

if (exigirLogin(["Aluno"])) {
    carregarPainel();
}