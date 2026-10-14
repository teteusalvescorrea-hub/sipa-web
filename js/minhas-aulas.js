/* =========================================
   SIPA — MINHAS AULAS
   As aulas vêm da API. Cancelar e ver o
   histórico também passam pela API.
   ========================================= */

import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import {
    listarAgendamentos,
    obterAgendamento,
    cancelarAula as cancelarAulaApi
} from "./modules/agendamentos/services/agendamentos.service.js";


/* =========================================
   ELEMENTOS
   ========================================= */

const lessonsList =
    document.getElementById("lessons-list");

const totalLessons =
    document.getElementById("total-lessons");

const lessonsCount =
    document.getElementById("lessons-count");

const nextLessonSummary =
    document.getElementById("next-lesson-summary");

const unitSummary =
    document.querySelector(".lessons-summary .summary-card:nth-child(3) strong");

const pastLessonsList =
    document.getElementById("past-lessons-list");

const pastLessonsCount =
    document.getElementById("past-lessons-count");

/* Aulas que vieram da API, guardadas pelo id. */
const aulasCarregadas = new Map();


/* =========================================
   AJUDANTES
   ========================================= */

/* Mostra o texto como texto (um nome ou motivo nunca vira código na tela). */
function escapar(texto) {

    const div = document.createElement("div");

    div.textContent = texto ?? "";

    return div.innerHTML;
}


/* "2026-10-20T14:00:00" vira { data: "20/10/2026", hora: "14:00" } */
function separarDataHora(dataHora) {

    const [data, hora] = dataHora.split("T");
    const [ano, mes, dia] = data.split("-");

    return {
        data: `${dia}/${mes}/${ano}`,
        hora: hora.slice(0, 5)
    };
}


/* ApiErro traz erros[]; outro erro qualquer só tem message. */
function mensagemDoErro(erro) {

    const erros = erro.erros ?? [erro.message || "Erro inesperado. Tente de novo."];

    return erros.join("\n");
}


function textoQuantidade(total) {

    return `${total} ${total === 1 ? "aula" : "aulas"}`;
}


/* Texto do selo: "Expirada", "Aguardando marcação" ou o status.descricao da API. */
function textoDoStatus(aula) {

    if (aula.expirada) {
        return "Expirada";
    }

    return aula.aguardandoMarcacao ? "Aguardando marcação" : aula.status.descricao;
}


/* Cor do selo. Sem classe = verde (Confirmada e Realizada). */
function classeDoStatus(aula) {

    if (aula.expirada) {
        return "status-neutro";
    }

    if (aula.aguardandoMarcacao) {
        return "status-espera";
    }

    const classes = {
        2: "status-neutro",
        3: "status-espera",
        4: "status-alerta",
        6: "status-alerta"
    };

    return classes[aula.status.valor] || "";
}


/* =========================================
   MOSTRAR ESTADO VAZIO
   ========================================= */

function mostrarEstadoVazio() {

    lessonsList.innerHTML = `

        <div class="lessons-empty">

            <div class="lessons-empty-icon">
                ◷
            </div>

            <strong>
                Você não tem próximas aulas
            </strong>

            <span>
                Agende sua próxima aula para continuar
                sua formação.
            </span>

            <a
                href="agendamento.html"
                class="new-lesson-button"
            >
                + Agendar aula
            </a>

        </div>

    `;
}


/* =========================================
   CRIAR CARD DA AULA
   ========================================= */

/* Linha das horas úteis. A API só manda o número na aula confirmada futura. */
function montarHorasUteis(aula) {

    if (aula.horasUteisAteAula === null || aula.horasUteisAteAula === undefined) {
        return "";
    }

    const horas = aula.horasUteisAteAula.toLocaleString("pt-BR");

    return `
        <div class="lesson-detail">
            <span class="lesson-detail-icon">⏱</span>
            ${horas} h úteis (prazo ${aula.prazoCancelamentoHorasUteis} h)
        </div>
    `;
}


/* O botão Cancelar só aparece quando a API manda podeCancelar = true. */
function montarBotaoCancelar(aula) {

    if (aula.podeCancelar) {
        return `
            <button
                type="button"
                class="cancel-lesson-button"
                data-id="${aula.id}"
            >
                Cancelar aula
            </button>
        `;
    }

    if (aula.horasUteisAteAula !== null && aula.horasUteisAteAula !== undefined) {
        return `<span class="lesson-cancel-blocked">Fora do prazo para cancelar</span>`;
    }

    return "";
}


/* Na 4 (Recusada), motorista e veículo são de quem recusou: não mostra. */
function montarVeiculo(aula) {

    if (aula.status.valor === 4) {
        return "";
    }

    const icone = aula.categoria.valor === 1 ? "🏍️" : "🚗";

    return `
        <div class="lesson-detail">
            <span class="lesson-detail-icon">${icone}</span>
            ${escapar(aula.veiculoModelo)} • ${escapar(aula.veiculoPlaca)}
        </div>
    `;
}


function criarCardAula(aula) {

    const { data, hora } = separarDataHora(aula.dataHoraInicio);

    let motorista = `Motorista: ${escapar(aula.motoristaNome)}`;

    if (aula.status.valor === 4) {
        motorista = aula.expirada ? "Sem motorista" : "Aguardando novo motorista";
    }

    const item = document.createElement("article");

    item.className = "lesson-item";

    item.innerHTML = `

        <div class="lesson-date">

            <div class="lesson-date-icon"></div>

            <div class="lesson-date-info">
                <span>DATA</span>
                <strong>${data}</strong>
                <small>${hora}</small>
            </div>

        </div>


        <div class="lesson-main-info">

            <strong class="lesson-category">
                ${escapar(aula.categoria.descricao)}
            </strong>

            <span class="lesson-instructor">
                ${motorista}
            </span>

        </div>


        <div class="lesson-details">

            ${montarVeiculo(aula)}

            <div class="lesson-detail">
                <span class="lesson-detail-icon">◎</span>
                ${escapar(aula.unidade)}
            </div>

            ${montarHorasUteis(aula)}

        </div>


        <div class="lesson-status">

            <span class="lesson-status-badge ${classeDoStatus(aula)}">
                <span class="lesson-status-dot"></span>
                ${escapar(textoDoStatus(aula))}
            </span>

        </div>


        <div class="lesson-actions">

            ${montarBotaoCancelar(aula)}

            <button
                type="button"
                class="history-lesson-button"
                data-id="${aula.id}"
            >
                Ver histórico
            </button>

        </div>

    `;

    return item;
}


/* =========================================
   MODAL DE SUCESSO
   ========================================= */

function mostrarSucessoCancelamento(
    dataFormatada,
    horario
) {

    const modal =
        document.createElement(
            "div"
        );


    modal.className =
        "cancel-success-overlay";


    modal.innerHTML = `

        <div class="cancel-success-modal">

            <div class="cancel-success-icon">
                ✓
            </div>


            <h2>
                Aula cancelada com sucesso!
            </h2>


            <p>

                Sua aula do dia

                <strong>
                    ${dataFormatada}
                </strong>

                às

                <strong>
                    ${horario}
                </strong>

                foi cancelada corretamente.

            </p>


            <div class="cancel-success-info">

                <strong>
                    Seu saldo foi atualizado.
                </strong>

                <span>
                    A aula retornou para seu saldo
                    e poderá ser reagendada.
                </span>

            </div>


            <button
                type="button"
                class="cancel-success-button"
                id="close-cancel-success"
            >
                Entendi
            </button>

        </div>

    `;


    document.body.appendChild(
        modal
    );


    const closeButton =
        document.getElementById(
            "close-cancel-success"
        );


    if (closeButton) {

        closeButton.addEventListener(
            "click",
            function () {

                modal.remove();

            }
        );

    }

}


/* =========================================
   CANCELAR AULA
   ========================================= */

function cancelarAula(id) {

    const aula = aulasCarregadas.get(id);

    if (!aula) {
        alert("Não foi possível identificar esta aula. Atualize a tela.");
        return;
    }

    const { data, hora } = separarDataHora(aula.dataHoraInicio);

    const modalConfirmacao = document.createElement("div");

    modalConfirmacao.className = "cancel-confirm-overlay";

    modalConfirmacao.innerHTML = `

        <div class="cancel-confirm-modal">

            <div class="cancel-confirm-icon">
                ?
            </div>

            <h2>
                Tem certeza que deseja cancelar?
            </h2>

            <p>
                Deseja realmente cancelar sua aula do dia
                <strong>${data}</strong>
                às
                <strong>${hora}</strong>?
            </p>

            <textarea
                class="cancel-confirm-motivo"
                maxlength="500"
                placeholder="Motivo (opcional)"
                aria-label="Motivo do cancelamento"
            ></textarea>

            <div class="cancel-confirm-info">
                <strong>Atenção</strong>
                <span>
                    Essa aula será devolvida ao seu saldo
                    e poderá ser reagendada.
                </span>
            </div>

            <div class="cancel-confirm-actions">

                <button type="button" class="cancel-confirm-back">
                    Voltar
                </button>

                <button type="button" class="cancel-confirm-yes">
                    Confirmar cancelamento
                </button>

            </div>

        </div>

    `;

    document.body.appendChild(modalConfirmacao);

    const campoMotivo = modalConfirmacao.querySelector(".cancel-confirm-motivo");
    const botaoVoltar = modalConfirmacao.querySelector(".cancel-confirm-back");
    const botaoConfirmar = modalConfirmacao.querySelector(".cancel-confirm-yes");

    botaoVoltar.addEventListener("click", function () {
        modalConfirmacao.remove();
    });

    botaoConfirmar.addEventListener("click", async function () {

        botaoConfirmar.disabled = true;

        try {
            /* POST /api/agendamentos/{id}/cancelar. O saldo volta na API. */
            await cancelarAulaApi(id, campoMotivo.value);
        } catch (erro) {

            alert(mensagemDoErro(erro));

            /* Sem conexão (status 0): a janela fica aberta para tentar de novo. */
            if (erro.status === 0) {
                botaoConfirmar.disabled = false;
                return;
            }

            modalConfirmacao.remove();
            carregarAulas();
            return;
        }

        modalConfirmacao.remove();

        mostrarSucessoCancelamento(data, hora);

        carregarAulas();
    });
}


/* =========================================
   HISTÓRICO DA AULA
   ========================================= */

async function mostrarHistorico(id) {

    let resposta;

    try {
        /* GET /api/agendamentos/{id}: { aula, historico } */
        resposta = await obterAgendamento(id);
    } catch (erro) {
        alert(mensagemDoErro(erro));
        return;
    }

    const { data, hora } = separarDataHora(resposta.aula.dataHoraInicio);

    const itens = resposta.historico.map(function (evento) {

        const quando = separarDataHora(evento.quando);

        const motorista = evento.motoristaNome
            ? `<span>Motorista: ${escapar(evento.motoristaNome)}</span>`
            : "";

        const motivo = evento.motivo
            ? `<span>Motivo: ${escapar(evento.motivo)}</span>`
            : "";

        return `
            <li>
                <strong>${escapar(evento.tipo.descricao)}</strong>
                <span>${quando.data} ${quando.hora} • ${escapar(evento.autorNome)}</span>
                ${motorista}
                ${motivo}
            </li>
        `;
    }).join("");

    const modal = document.createElement("div");

    modal.className = "cancel-success-overlay";

    modal.innerHTML = `
        <div class="cancel-success-modal">
            <h2>Histórico da aula</h2>
            <p>${data} às ${hora} • ${escapar(textoDoStatus(resposta.aula))}</p>
            <ul class="history-list">${itens}</ul>
            <button type="button" class="cancel-success-button">Fechar</button>
        </div>
    `;

    document.body.appendChild(modal);

    modal.querySelector("button").addEventListener("click", function () {
        modal.remove();
    });
}


/* =========================================
   CLIQUE NOS BOTÕES DAS AULAS
   ========================================= */

function tratarCliqueNaLista(event) {

    const botaoCancelar = event.target.closest(".cancel-lesson-button");

    if (botaoCancelar) {
        cancelarAula(botaoCancelar.dataset.id);
        return;
    }

    const botaoHistorico = event.target.closest(".history-lesson-button");

    if (botaoHistorico) {
        mostrarHistorico(botaoHistorico.dataset.id);
    }
}

lessonsList.addEventListener("click", tratarCliqueNaLista);

pastLessonsList.addEventListener("click", tratarCliqueNaLista);


/* =========================================
   MOSTRAR AS LISTAS
   ========================================= */

function mostrarErro(mensagem) {

    nextLessonSummary.textContent = "—";

    lessonsList.innerHTML = `
        <div class="lessons-empty">
            <strong>Não foi possível carregar suas aulas</strong>
            <span>${escapar(mensagem)}</span>
        </div>
    `;

    pastLessonsList.innerHTML = "";
}


function mostrarProximas(aulas) {

    totalLessons.textContent = aulas.length;

    lessonsCount.textContent = textoQuantidade(aulas.length);

    if (aulas.length === 0) {
        mostrarEstadoVazio();
        nextLessonSummary.textContent = "Nenhuma";
        unitSummary.textContent = "—";
        return;
    }

    /* A API manda em ordem de data: a aula [0] é a próxima. */
    const proxima = separarDataHora(aulas[0].dataHoraInicio);

    nextLessonSummary.textContent = `${proxima.data} • ${proxima.hora}`;

    unitSummary.textContent = aulas[0].unidade;

    lessonsList.innerHTML = "";

    aulas.forEach(function (aula) {
        lessonsList.appendChild(criarCardAula(aula));
    });
}


function mostrarAnteriores(aulas) {

    pastLessonsCount.textContent = textoQuantidade(aulas.length);

    if (aulas.length === 0) {
        pastLessonsList.innerHTML = `
            <div class="lessons-empty">
                <strong>Nenhuma aula anterior ou cancelada</strong>
            </div>
        `;
        return;
    }

    pastLessonsList.innerHTML = "";

    aulas.forEach(function (aula) {
        pastLessonsList.appendChild(criarCardAula(aula));
    });
}


/* =========================================
   CARREGAR AS AULAS DA API
   ========================================= */

async function carregarAulas() {

    /* Sem login de aluno, volta para o login.html. */
    if (!exigirLogin(["Aluno"])) {
        return;
    }

    /* Aulas anteriores: de 90 dias atrás até agora (a API aceita até 92 dias). */
    const agora = new Date();
    const inicio = new Date(agora);

    inicio.setDate(inicio.getDate() - 90);
    inicio.setHours(0, 0, 0, 0);

    try {

        /* Sem filtro, a API devolve as próximas aulas do aluno. */
        const proximas = await listarAgendamentos();

        /* de e ate em UTC (com Z): a API converte para Brasília. */
        const anteriores = await listarAgendamentos({
            de: inicio.toISOString(),
            ate: agora.toISOString()
        });

        /* Canceladas com data futura (próximos 31 dias). */
        const canceladasFuturas = await listarAgendamentos({
            status: [2],
            de: agora.toISOString()
        });

        aulasCarregadas.clear();

        proximas.concat(anteriores, canceladasFuturas).forEach(function (aula) {
            aulasCarregadas.set(aula.id, aula);
        });

        mostrarProximas(proximas);

        /* A mais recente primeiro. */
        const historico = anteriores.concat(canceladasFuturas)
            .sort((a, b) => b.dataHoraInicio.localeCompare(a.dataHoraInicio));

        mostrarAnteriores(historico);

    } catch (erro) {

        console.error(erro);

        mostrarErro(mensagemDoErro(erro));
    }
}


/* =========================================
   LOGOUT
   ========================================= */

const logoutButton = document.getElementById("lessons-logout");

logoutButton.addEventListener("click", function (event) {

    event.preventDefault();

    /* Apaga o token e volta para o login.html. */
    sair();
});


/* =========================================
   MENU MOBILE
   ========================================= */

const mobileMenu = document.getElementById("lessons-mobile-menu");

const sidebar = document.querySelector(".lessons-sidebar");

mobileMenu.addEventListener("click", function () {
    sidebar.classList.toggle("mobile-open");
});


/* =========================================
   FECHAR MENU AO CLICAR FORA
   ========================================= */

document.addEventListener("click", function (event) {

    if (window.innerWidth > 640 || !sidebar.classList.contains("mobile-open")) {
        return;
    }

    const clicouSidebar = sidebar.contains(event.target);
    const clicouMenu = mobileMenu.contains(event.target);

    if (!clicouSidebar && !clicouMenu) {
        sidebar.classList.remove("mobile-open");
    }
});


/* =========================================
   INICIAR
   ========================================= */

carregarAulas();