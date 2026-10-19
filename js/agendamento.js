/* =========================================
   SIPA — SISTEMA DE AGENDAMENTO
   PARTE 1 — CALENDÁRIO
   ========================================= */

"use strict";
/* Funções da API usadas nesta tela */
import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import { listarContratacoes }
    from "./modules/contratacoes/services/contratacoes.service.js";
import { obterAutoescola }
    from "./modules/autoescolas/services/autoescolas.service.js";
import {
    listarHorariosDisponiveis,
    listarMotoristasDisponiveis,
    agendarAulas
} from "./modules/agendamentos/services/agendamentos.service.js";


/* =========================================
   CONFIGURAÇÕES
   ========================================= */

/* Hoje no horário de Brasília ("2026-10-14"), o mesmo da API. */
const formatoDataBrasilia = new Intl.DateTimeFormat(
    "sv-SE",
    { timeZone: "America/Sao_Paulo" }
);

function hojeEmBrasilia() {
    return formatoDataBrasilia.format(new Date());
}

const [anoHoje, mesHoje] =
    hojeEmBrasilia().split("-").map(Number);

/* Mês aberto no calendário, sempre no dia 1. */
let dataAtual = new Date(anoHoje, mesHoje - 1, 1);

let dataSelecionada = null;


/* =========================================
   ELEMENTOS DO HTML
   ========================================= */

const calendarDays =
    document.getElementById("calendar-days");

const calendarMonth =
    document.getElementById("calendar-month");

const previousMonthButton =
    document.getElementById("previous-month");

const nextMonthButton =
    document.getElementById("next-month");

const selectedDateLabel =
    document.getElementById("selected-date-label");


/* =========================================
   NOMES DOS MESES
   ========================================= */

const nomesMeses = [

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
   NOMES DOS DIAS
   ========================================= */

const nomesDias = [

    "Domingo",
    "Segunda-feira",
    "Terça-feira",
    "Quarta-feira",
    "Quinta-feira",
    "Sexta-feira",
    "Sábado"

];


/* =========================================
   RENDERIZAR CALENDÁRIO
   ========================================= */

function renderizarCalendario() {

    if (!calendarDays) {
        return;
    }


    /* =====================================
       LIMPAR CALENDÁRIO
       ===================================== */

    calendarDays.innerHTML = "";


    /* =====================================
       PEGAR MÊS E ANO
       ===================================== */

    const ano =
        dataAtual.getFullYear();

    const mes =
        dataAtual.getMonth();


    /* =====================================
       ATUALIZAR TÍTULO
       ===================================== */

    calendarMonth.textContent =
        `${nomesMeses[mes]} ${ano}`;


    /* =====================================
       PRIMEIRO DIA DO MÊS
       ===================================== */

    const primeiroDia =
        new Date(
            ano,
            mes,
            1
        ).getDay();


    /* =====================================
       QUANTIDADE DE DIAS
       ===================================== */

    const quantidadeDias =
        new Date(
            ano,
            mes + 1,
            0
        ).getDate();


    /* =====================================
       DATA DE HOJE (BRASÍLIA)
       ===================================== */

    const hoje =
        hojeEmBrasilia();


    /* =====================================
       ESPAÇOS ANTES DO PRIMEIRO DIA
       ===================================== */

    for (
        let i = 0;
        i < primeiroDia;
        i++
    ) {

        const diaVazio =
            document.createElement(
                "div"
            );


        diaVazio.classList.add(
            "calendar-day",
            "empty"
        );


        calendarDays.appendChild(
            diaVazio
        );

    }


    document.getElementById("calendar-block-reasons")?.replaceChildren();

    /* =====================================
       CRIAR OS DIAS
       ===================================== */

    for (
        let dia = 1;
        dia <= quantidadeDias;
        dia++
    ) {

        const elementoDia =
            document.createElement(
                "button"
            );


        elementoDia.type =
            "button";


        elementoDia.classList.add(
            "calendar-day"
        );


        elementoDia.textContent =
            dia;


        /* =================================
           DATA COMPLETA DO DIA ("2026-10-20")
           ================================= */

        const dataDoDia =
            formatarDataSistema(
                new Date(ano, mes, dia)
            );


        /* =================================
           VERIFICAR DATA PASSADA
           ================================= */

        const dataPassada =
            dataDoDia < hoje;


        /* =================================
           DATA ANTERIOR A HOJE
           ================================= */

        if (dataPassada) {

            elementoDia.classList.add(
                "disabled"
            );


            elementoDia.disabled =
                true;


            elementoDia.title =
                "Não é possível agendar em uma data passada";

        }


        /* =================================
           VERIFICAR SE É HOJE
           ================================= */

        const ehHoje =
            dataDoDia === hoje;


        if (ehHoje) {

            elementoDia.classList.add(
                "today"
            );

        }


        /* =================================
           VERIFICAR DATA SELECIONADA
           ================================= */

        if (
            dataSelecionada &&
            dia === dataSelecionada.getDate() &&
            mes === dataSelecionada.getMonth() &&
            ano === dataSelecionada.getFullYear()
        ) {

            elementoDia.classList.add(
                "selected"
            );

        }


        /* =================================
           CLIQUE NO DIA
           Dia fechado quem diz é a grade da autoescola.
           ================================= */

        if (!dataPassada) {

            elementoDia.addEventListener(
                "click",
                () => {

                    selecionarData(
                        ano,
                        mes,
                        dia
                    );

                }
            );

        }


        /* =================================
           ADICIONAR DIA AO CALENDÁRIO
           ================================= */

        elementoDia.setAttribute("aria-label", dataDoDia.split("-").reverse().join("/") + (dataPassada ? " · Data passada · agendamento indisponível" : " · Disponível para consulta"));
        elementoDia.setAttribute("aria-pressed", String(elementoDia.classList.contains("selected")));
        if (ehHoje) elementoDia.setAttribute("aria-current", "date");
        if (dataPassada) {
            elementoDia.classList.add("calendar-blocked");
            const numero = document.createElement("span"); numero.className = "calendar-day-number";
            numero.textContent = elementoDia.textContent; elementoDia.replaceChildren(numero);
            const x = document.createElement("span"); x.className = "calendar-block-mark";
            x.textContent = ""; x.setAttribute("aria-hidden", "true"); elementoDia.append(x);
        }
        if (dataPassada) {
            const motivo = document.createElement("li"); motivo.textContent = elementoDia.getAttribute("aria-label");
            document.getElementById("calendar-block-reasons")?.append(motivo);
        }
        calendarDays.appendChild(
            elementoDia
        );

    }

}


/* =========================================
   SELECIONAR DATA
   ========================================= */

function selecionarData(
    ano,
    mes,
    dia
) {

    dataSelecionada =
        new Date(
            ano,
            mes,
            dia
        );


    /* ATUALIZAR CALENDÁRIO */

    renderizarCalendario();


    /* ATUALIZAR TEXTO DA DATA */

    atualizarDataSelecionada();


    console.log(
        "Data selecionada:",
        dataSelecionada
    );

}


/* =========================================
   ATUALIZAR DATA SELECIONADA
   ========================================= */

function atualizarDataSelecionada() {

    if (!dataSelecionada) {
        return;
    }


    const dia =
        dataSelecionada.getDate();


    const mes =
        dataSelecionada.getMonth();


    const nomeDia =
        nomesDias[
            dataSelecionada.getDay()
        ];


    const textoData =
        `${nomeDia}, ${dia} de ${nomesMeses[mes]}`;


    /* HORÁRIOS */

    if (selectedDateLabel) {

        selectedDateLabel.textContent =
            textoData;

    }

}


/* =========================================
   MÊS ANTERIOR
   ========================================= */

if (previousMonthButton) {

    previousMonthButton.addEventListener(
        "click",
        () => {

            dataAtual = new Date(
                dataAtual.getFullYear(),
                dataAtual.getMonth() - 1,
                1
            );


            dataSelecionada = null;


            renderizarCalendario();


            if (selectedDateLabel) {

                selectedDateLabel.textContent =
                    "Selecione uma data";

            }

        }
    );

}


/* =========================================
   PRÓXIMO MÊS
   ========================================= */

if (nextMonthButton) {

    nextMonthButton.addEventListener(
        "click",
        () => {

            dataAtual = new Date(
                dataAtual.getFullYear(),
                dataAtual.getMonth() + 1,
                1
            );


            dataSelecionada = null;


            renderizarCalendario();


            if (selectedDateLabel) {

                selectedDateLabel.textContent =
                    "Selecione uma data";

            }

        }
    );

}


/* =========================================
   INICIAR CALENDÁRIO
   ========================================= */

renderizarCalendario();


/* =========================================
   PARTE 2 — DADOS DA API
   Etapa 1: contratação e categoria
   Etapa 2: horários do dia
   Etapa 3: resumo, unidade e motorista
   Etapa 4: confirmar
   ========================================= */

const timeSlots = document.getElementById("time-slots");
const summaryCategory = document.getElementById("summary-category");
const summaryUnit = document.getElementById("summary-unit");
const unidadeSelect = document.getElementById("booking-unidade");
const summaryLessons = document.getElementById("summary-lessons");
const confirmBookingButton = document.getElementById("confirm-booking");
const bookingMessage = document.getElementById("booking-message");
const bookingPackageInfo = document.getElementById("booking-package-info");
const bookingRetry = document.getElementById("booking-retry");
const contratacaoSelect = document.getElementById("booking-contratacao");
const selectedLessonsCount = document.getElementById("selected-lessons-count");
const categoryOptions = document.querySelectorAll(".category-option");
const instructorAvatar = document.querySelector(".instructor-avatar");
const selectedInstructor = document.getElementById("selected-instructor");
const selectedVehicle = document.getElementById("selected-vehicle");
const motoristaSelect = document.getElementById("motorista-select");
const sidebarUnit = document.getElementById("sidebar-unit");
const sidebarUnitName = document.getElementById("sidebar-unit-name");
const sidebarUnitSchool = document.getElementById("sidebar-unit-school");
const footerUnit = document.getElementById("footer-unit");

/* Os botões da tela usam letras. A API usa números: 1 = A, 2 = B. */
const VALOR_CATEGORIA = { A: 1, B: 2 };
const LETRA_CATEGORIA = { 1: "A", 2: "B" };

let contratacoes = [];           // contratações aprovadas com saldo
let contratacaoAtual = null;     // contratação usada no pedido
let autoescolaAtual = null;      // autoescola da contratação, com unidades e locais
let avisoUnidade = "";           // texto da unidade enquanto a autoescola não chega
let unidadePorCategoria = {};    // categoria → id da unidade escolhida
let categoriaSelecionada = null; // 1, 2 ou null
let horariosDoDia = null;        // resposta de horarios-disponiveis
let aulasSelecionadas = [];      // aulas que vão no pedido
let aulaDoMotorista = null;      // aula mostrada no quadro do motorista
let enviando = false;            // pedido em andamento: a seleção fica travada
let buscaHorarios = 0;           // número da busca de horários mais recente
let buscaMotoristas = 0;         // número da busca de motoristas mais recente
let buscaContratacoes = 0;       // número da carga da etapa 1 mais recente

/* =========================================
   AJUDANTES
   ========================================= */

/* Data do calendário → "2026-10-20" (formato da API) */
function formatarDataSistema(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, "0");
    const dia = String(data.getDate()).padStart(2, "0");

    return `${ano}-${mes}-${dia}`;
}

/* "2026-10-20T14:00:00" → "20/10/2026 às 14:00" */
function formatarDataHora(dataHoraInicio) {
    const [data, hora] = dataHoraInicio.split("T");
    const [ano, mes, dia] = data.split("-");

    return `${dia}/${mes}/${ano} às ${hora.slice(0, 5)}`;
}

/* Erro por aula da API, "20/10/2026 14:00: ..." → "2026-10-20T14:00" */
function inicioDoErro(texto) {
    const partes = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}:\d{2}):/.exec(texto);

    return partes ? `${partes[3]}-${partes[2]}-${partes[1]}T${partes[4]}` : null;
}

/* "27999998888" → "(27) 99999-8888" */
function formatarWhatsapp(numero) {
    const resto = numero.slice(2);

    return `(${numero.slice(0, 2)}) ${resto.slice(0, -4)}-${resto.slice(-4)}`;
}

/* tipo: "success" (verde) ou "error" (vermelho) */
function mostrarMensagem(mensagem, tipo) {
    bookingMessage.textContent = mensagem;
    bookingMessage.style.whiteSpace = "pre-line";
    bookingMessage.className = `booking-message visible ${tipo}`;
}

function limparMensagem() {
    bookingMessage.textContent = "";
    bookingMessage.className = "booking-message";
}

function atualizarContadorAulas() {
    selectedLessonsCount.textContent = aulasSelecionadas.length;
}

/* Confirmar só com aula escolhida. Com pedido em andamento, tudo travado. */
function verificarAgendamento() {
    confirmBookingButton.disabled = enviando || aulasSelecionadas.length === 0;
    contratacaoSelect.disabled = enviando;
    unidadeSelect.disabled = enviando;
    motoristaSelect.disabled = enviando || motoristaSelect.options.length === 0;
}

/* Depois de mudar o lote: contador, resumo, horários e botão. */
function atualizarSelecao() {
    atualizarContadorAulas();
    mostrarResumoAulas();

    if (horariosDoDia) {
        mostrarHorarios();
    }

    verificarAgendamento();
}

/* =========================================
   ETAPA 1 — CONTRATAÇÃO
   GET /api/contratacoes?status=2 (2 = Aprovado)
   ========================================= */

async function carregarContratacoes() {
    const busca = ++buscaContratacoes;

    contratacoes = [];
    contratacaoAtual = null;
    autoescolaAtual = null;
    categoriaSelecionada = null;
    aulasSelecionadas = [];
    horariosDoDia = null;
    buscaHorarios = buscaHorarios + 1; // descarta a busca de horários em andamento

    bookingPackageInfo.textContent = "Carregando informações...";
    bookingRetry.hidden = true;
    contratacaoSelect.style.display = "none";
    summaryCategory.textContent = "Não selecionada";

    mostrarCategorias([]);
    mostrarUnidade();
    mostrarAvisoHorarios("◷", "Carregando seu pacote", "Aguarde um instante.");
    atualizarPainelMotorista(null);
    atualizarSelecao();

    let lista;

    try {
        lista = await listarContratacoes(2);
    } catch (erro) {
        if (busca === buscaContratacoes) {
            bookingPackageInfo.textContent = erro.message;
            bookingRetry.hidden = false;
            mostrarHorarios();
        }
        return;
    }

    /* Uma carga mais nova já começou. */
    if (busca !== buscaContratacoes) {
        return;
    }

    /* Só as que ainda têm saldo. Quem calcula o saldo é a API. */
    contratacoes = lista.filter((contratacao) => contratacao.aulasRestantes > 0);

    if (contratacoes.length === 0) {
        mostrarSemPacote(lista[0], busca);
        mostrarHorarios();
        return;
    }

    /* Com mais de uma contratação, aparece a lista para escolher. */
    contratacaoSelect.innerHTML = "";

    contratacoes.forEach((contratacao, indice) => {
        const opcao = document.createElement("option");
        opcao.value = indice;
        opcao.textContent =
            `${contratacao.pacoteNome} — ${contratacao.autoescolaNome}`;
        contratacaoSelect.appendChild(opcao);
    });

    contratacaoSelect.style.display = contratacoes.length > 1 ? "block" : "none";

    escolherContratacao(contratacoes[0]);
}

/* Link para a vitrine (pacotes.html). */
function linkDaVitrine(texto) {
    const vitrine = document.createElement("a");

    vitrine.className = "booking-whatsapp-link";
    vitrine.href = "pacotes.html";
    vitrine.textContent = texto;

    return vitrine;
}

/*
 * Sem saldo. Pedido pendente (1): espera a autoescola.
 * Aprovada sem saldo: comprar com a autoescola (WhatsApp) e informar o pacote novo.
 * Sem nada: link para a vitrine. busca: número da carga que chamou.
 */
async function mostrarSemPacote(contratacao, busca) {
    const texto = "Você não tem pacote aprovado com aulas disponíveis. ";
    let pendentes = [];

    try {
        pendentes = await listarContratacoes(1);
    } catch {
        pendentes = []; // sem a lista, segue como se não houvesse pedido
    }

    /* Outra carga da etapa 1 já começou (ela escreve o próprio texto). */
    if (busca !== buscaContratacoes) {
        return;
    }

    if (pendentes.length > 0) {
        bookingPackageInfo.textContent =
            "Seu pacote está aguardando a confirmação da autoescola.";
        return;
    }

    if (!contratacao) {
        bookingPackageInfo.replaceChildren(texto, linkDaVitrine("Escolher um pacote"), ".");
        return;
    }

    const contato = `${texto}Compre mais aulas com ${contratacao.autoescolaNome}`;
    const fim = [" e depois ", linkDaVitrine("informe o novo pacote"), "."];

    if (!contratacao.autoescolaWhatsapp) {
        bookingPackageInfo.replaceChildren(contato, ...fim);
        return;
    }

    const link = document.createElement("a");

    link.className = "booking-whatsapp-link";
    link.href = `https://wa.me/55${contratacao.autoescolaWhatsapp}`;
    link.target = "_blank";
    link.rel = "noopener";
    link.textContent = formatarWhatsapp(contratacao.autoescolaWhatsapp);

    bookingPackageInfo.replaceChildren(`${contato} pelo WhatsApp `, link, ...fim);
}

function mostrarPacote(contratacao) {
    bookingPackageInfo.textContent =
        `${contratacao.pacoteNome} (${contratacao.autoescolaNome}): ` +
        `${contratacao.aulasRestantes} de ${contratacao.quantidadeAulas} ` +
        "aulas disponíveis";
}

function escolherContratacao(contratacao) {
    contratacaoAtual = contratacao;
    autoescolaAtual = null;
    unidadePorCategoria = {};
    aulasSelecionadas = [];

    mostrarPacote(contratacao);
    carregarAutoescola();

    /* Pacote de uma categoria só: ela já vem marcada. */
    const categorias = contratacao.categorias;

    mostrarCategorias(categorias);
    selecionarCategoria(categorias.length === 1 ? categorias[0].valor : null);

    atualizarPainelMotorista(null);
    atualizarSelecao();
}

/* Relê o saldo depois de um erro da contratação, sem apagar a seleção. */
async function atualizarContratacao() {
    const contratacao = contratacaoAtual;
    let lista;

    try {
        lista = await listarContratacoes(2);
    } catch {
        return;
    }

    if (enviando || contratacao !== contratacaoAtual) {
        return;
    }

    const atual = lista.find((item) => item.id === contratacao.id);

    /* Encerrada, recusada ou sem saldo: a etapa 1 recomeça. */
    if (!atual || atual.aulasRestantes === 0) {
        carregarContratacoes();
        return;
    }

    contratacao.aulasRestantes = atual.aulasRestantes;
    mostrarPacote(contratacao);
}

bookingRetry.addEventListener("click", () => carregarContratacoes());

/* =========================================
   ETAPA 1 — CATEGORIA
   categorias = [{ descricao: "Categoria B — Carro", valor: 2 }]
   ========================================= */

/* Mostra só os botões das categorias do pacote. */
function mostrarCategorias(categorias) {
    const valores = categorias.map((categoria) => categoria.valor);

    categoryOptions.forEach((botao) => {
        const valor = VALOR_CATEGORIA[botao.dataset.category];
        botao.style.display = valores.includes(valor) ? "" : "none";
    });
}

/* valor: 1, 2 ou null (nenhuma marcada) */
function selecionarCategoria(valor) {
    if (!contratacaoAtual) {
        return;
    }

    categoriaSelecionada = valor;

    categoryOptions.forEach((botao) => {
        const marcado = VALOR_CATEGORIA[botao.dataset.category] === valor;
        botao.classList.toggle("selected", marcado);
    });

    const categoria = contratacaoAtual.categorias.find(
        (item) => item.valor === valor
    );

    summaryCategory.textContent = categoria
        ? categoria.descricao
        : "Não selecionada";

    mostrarUnidade();

    /* Nova busca de horários a cada troca de categoria. */
    carregarHorarios();
}

categoryOptions.forEach((botao) => {
    botao.addEventListener("click", () => {
        if (!enviando) {
            selecionarCategoria(VALOR_CATEGORIA[botao.dataset.category]);
        }
    });
});

contratacaoSelect.addEventListener("change", () => {
    if (enviando) {
        return;
    }

    limparMensagem();
    escolherContratacao(contratacoes[Number(contratacaoSelect.value)]);
});

/* =========================================
   UNIDADE DAS AULAS
   GET /api/autoescolas/{id}
   2+ unidades com ponto de encontro da categoria: o aluno escolhe (DA8).
   ========================================= */

async function carregarAutoescola() {
    const contratacao = contratacaoAtual;

    avisoUnidade = "Carregando...";
    mostrarUnidade();

    try {
        const autoescola = await obterAutoescola(contratacao.autoescolaId);

        if (contratacao === contratacaoAtual) {
            autoescolaAtual = autoescola;
        }
    } catch {
        if (contratacao === contratacaoAtual) {
            autoescolaAtual = null;
            avisoUnidade = "Não foi possível carregar";
        }
    }

    if (contratacao === contratacaoAtual) {
        mostrarUnidade();
        mostrarResumoAulas();
    }

    return autoescolaAtual !== null;
}

function unidadesDaCategoria(categoria) {
    if (!autoescolaAtual) {
        return [];
    }

    return autoescolaAtual.unidades.filter((unidade) =>
        unidade.locais.some((local) => local.categoria.valor === categoria));
}

/* A única unidade da categoria ou a escolhida na lista. */
function unidadeDaCategoria(categoria) {
    const unidades = unidadesDaCategoria(categoria);

    if (unidades.length === 1) {
        return unidades[0];
    }

    return unidades.find((unidade) => unidade.id === unidadePorCategoria[categoria]) || null;
}

function textoDaUnidade(unidade) {
    if (unidade) {
        return unidade.nome;
    }

    if (!contratacaoAtual || !categoriaSelecionada) {
        return "Não selecionada";
    }

    return autoescolaAtual ? "Sem ponto de encontro" : avisoUnidade;
}

/* Resumo, barra lateral e rodapé mostram a unidade da categoria marcada. */
function mostrarUnidade() {
    const unidades = unidadesDaCategoria(categoriaSelecionada);
    const unidade = unidadeDaCategoria(categoriaSelecionada);
    const escolher = unidades.length > 1;

    summaryUnit.hidden = false;
    summaryUnit.textContent = textoDaUnidade(unidade);
    unidadeSelect.hidden = !escolher;
    const unidadeVisivel = document.getElementById("booking-unit-current");
    unidadeVisivel.textContent = textoDaUnidade(unidade);
    unidadeVisivel.hidden = escolher;

    if (escolher) {
        unidadeSelect.replaceChildren(new Option("Escolha a unidade", ""));
        unidades.forEach((item) => unidadeSelect.add(new Option(item.nome, item.id)));
        unidadeSelect.value = unidade ? unidade.id : "";
    } else {
        summaryUnit.textContent = textoDaUnidade(unidade);
    }

    sidebarUnit.hidden = !unidade;
    footerUnit.hidden = !unidade;

    if (unidade) {
        sidebarUnitName.textContent = unidade.nome;
        sidebarUnitSchool.textContent = autoescolaAtual.nome;
        footerUnit.textContent = unidade.nome;
    }
}

unidadeSelect.addEventListener("change", () => {
    unidadePorCategoria[categoriaSelecionada] = unidadeSelect.value || null;
    mostrarUnidade();
    mostrarResumoAulas();
});

/* Antes do pedido: autoescola carregada e unidade escolhida onde precisa. */
async function conferirUnidades() {
    if (!autoescolaAtual && !(await carregarAutoescola())) {
        return "Não foi possível carregar as unidades da autoescola. Tente de novo.";
    }

    const faltando = contratacaoAtual.categorias.filter((categoria) =>
        aulasSelecionadas.some((aula) => aula.categoria === categoria.valor) &&
        unidadesDaCategoria(categoria.valor).length > 1 &&
        !unidadeDaCategoria(categoria.valor));

    if (faltando.length === 0) {
        return "";
    }

    const nomes = faltando.map((categoria) => categoria.descricao).join(" e ");
    const outra = faltando.some((categoria) => categoria.valor !== categoriaSelecionada);

    return `Escolha a unidade das aulas de ${nomes}.` +
        (outra ? " Marque a categoria na etapa 1 para ver as unidades." : "");
}

/* =========================================
   ETAPA 2 — HORÁRIOS DO DIA
   GET /api/agendamentos/horarios-disponiveis
   ========================================= */

/* Quadro no lugar dos horários: aviso, "carregando" ou erro. */
function mostrarAvisoHorarios(icone, titulo, texto) {
    const aviso = document.createElement("div");

    aviso.className = "empty-time-state";
    aviso.innerHTML =
        '<span class="empty-time-icon"></span><strong></strong><span></span>';

    aviso.children[0].textContent = icone;
    aviso.children[1].textContent = titulo;
    aviso.children[2].textContent = texto;

    timeSlots.replaceChildren(aviso);
}

async function carregarHorarios() {
    horariosDoDia = null;
    buscaHorarios = buscaHorarios + 1;

    const busca = buscaHorarios;

    if (!contratacaoAtual || !categoriaSelecionada || !dataSelecionada) {
        mostrarHorarios();
        return;
    }

    mostrarAvisoHorarios("◷", "Carregando horários", "Aguarde um instante.");

    try {
        const resposta = await listarHorariosDisponiveis(
            contratacaoAtual.id,
            categoriaSelecionada,
            formatarDataSistema(dataSelecionada)
        );

        /* O aluno trocou de dia ou de categoria enquanto esperava. */
        if (busca !== buscaHorarios) {
            return;
        }

        horariosDoDia = resposta;
        mostrarHorarios();
    } catch (erro) {
        if (busca === buscaHorarios) {
            mostrarAvisoHorarios("!", "Horários indisponíveis", erro.message);
        }
    }
}

function mostrarHorarios() {
    if (!contratacaoAtual) {
        mostrarAvisoHorarios("!", "Nenhum pacote disponível",
            "Veja o aviso na etapa 1.");
        return;
    }

    if (!categoriaSelecionada) {
        mostrarAvisoHorarios("◷", "Escolha a categoria", "Ela fica na etapa 1.");
        return;
    }

    if (!dataSelecionada || !horariosDoDia) {
        mostrarAvisoHorarios("◷", "Escolha uma data",
            "Os horários disponíveis aparecerão aqui.");
        return;
    }

    if (horariosDoDia.fechado || horariosDoDia.horarios.length === 0) {
        mostrarAvisoHorarios("🔒", "Autoescola fechada",
            "Não há aulas neste dia.");
        return;
    }

    timeSlots.innerHTML = "";

    horariosDoDia.horarios.forEach((item) => {
        timeSlots.appendChild(criarBotaoHorario(item));
    });
}

/* Aula do lote que começa neste horário, em qualquer categoria. */
function aulaNoInicio(dataHoraInicio) {
    return aulasSelecionadas.find((aula) => aula.dataHoraInicio === dataHoraInicio);
}

function criarBotaoHorario(item) {
    const botao = document.createElement("button");
    const marcada = aulaNoInicio(item.dataHoraInicio);

    botao.type = "button";
    botao.className = "time-slot";
    botao.textContent = item.horario;

    /* A API recusa o mesmo início duas vezes no lote, mesmo em outra categoria. */
    if (marcada && marcada.categoria !== categoriaSelecionada) {
        const aviso = document.createElement("small");

        aviso.textContent = `já escolhido em ${LETRA_CATEGORIA[marcada.categoria]}`;
        botao.classList.add("other-category");
        botao.disabled = true;
        botao.appendChild(aviso);
        return botao;
    }

    if (marcada) {
        botao.classList.add("selected");
    }

    /* Escolhido que deixou de estar livre fica selected + unavailable e desmarca no clique. */
    if (!item.disponivel) {
        botao.classList.add("unavailable");
    }

    if (item.disponivel || marcada) {
        botao.addEventListener("click", () => selecionarHorario(item));
    } else {
        botao.disabled = true;
    }

    return botao;
}

/* Clicou num horário: marca. Clicou de novo: desmarca. */
function selecionarHorario(item) {
    if (enviando || !contratacaoAtual) {
        return;
    }

    const marcada = aulaNoInicio(item.dataHoraInicio);

    if (marcada) {
        if (marcada.categoria === categoriaSelecionada) {
            removerAula(marcada);
        }
        return;
    }

    if (aulasSelecionadas.length >= contratacaoAtual.aulasRestantes) {
        const saldo = contratacaoAtual.aulasRestantes;

        mostrarMensagem(`Seu pacote tem ${saldo} aula(s) disponível(is).`, "error");
        return;
    }

    const categoria = contratacaoAtual.categorias.find(
        (opcao) => opcao.valor === categoriaSelecionada
    );

    const aula = {
        dataHoraInicio: item.dataHoraInicio,
        categoria: categoriaSelecionada,
        categoriaDescricao: categoria ? categoria.descricao : "",
        motoristaId: null, // null = "Sem preferência"
        veiculoId: null,
        motoristaNome: null
    };

    aulasSelecionadas.push(aula);

    limparMensagem();
    atualizarPainelMotorista(aula);
    atualizarSelecao();
}

/* O calendário (parte 1) chama renderizarCalendario ao trocar de dia ou de mês.
   Depois de desenhar o calendário, busca os horários do dia na API. */
const renderizarCalendarioOriginal = renderizarCalendario;

renderizarCalendario = function () {
    renderizarCalendarioOriginal();
    carregarHorarios();
};

/* =========================================
   ETAPA 3 — RESUMO DO LOTE
   ========================================= */

function detalheDaAula(aula) {
    const partes = [aula.categoriaDescricao, aula.motoristaNome || "Sem preferência"];

    if (unidadesDaCategoria(aula.categoria).length > 1) {
        const unidade = unidadeDaCategoria(aula.categoria);
        partes.push(unidade ? unidade.nome : "Unidade a escolher");
    }

    return partes.join(" · ");
}

function criarItemResumo(aula) {
    const item = document.createElement("li");
    const abrir = document.createElement("button");
    const remover = document.createElement("button");
    const quando = formatarDataHora(aula.dataHoraInicio);

    item.className = "summary-lesson";
    item.classList.toggle("editing", aula === aulaDoMotorista);

    abrir.type = "button";
    abrir.className = "summary-lesson-info";
    abrir.title = "Escolher o motorista desta aula";
    abrir.innerHTML = "<strong></strong><span></span>";
    abrir.children[0].textContent = quando;
    abrir.children[1].textContent = detalheDaAula(aula);
    abrir.addEventListener("click", () => editarMotorista(aula));

    remover.type = "button";
    remover.className = "summary-lesson-remove";
    remover.textContent = "×";
    remover.setAttribute("aria-label", `Remover a aula de ${quando}`);
    remover.addEventListener("click", () => removerAula(aula));

    item.append(abrir, remover);

    return item;
}

function mostrarResumoAulas() {
    summaryLessons.replaceChildren();

    if (aulasSelecionadas.length === 0) {
        const vazio = document.createElement("li");

        vazio.className = "summary-lessons-empty";
        vazio.textContent = "Nenhuma aula selecionada";
        summaryLessons.appendChild(vazio);
        return;
    }

    [...aulasSelecionadas]
        .sort((a, b) => a.dataHoraInicio.localeCompare(b.dataHoraInicio))
        .forEach((aula) => summaryLessons.appendChild(criarItemResumo(aula)));
}

function editarMotorista(aula) {
    if (enviando || aula === aulaDoMotorista) {
        return;
    }

    atualizarPainelMotorista(aula);
    mostrarResumoAulas();
}

function removerAula(aula) {
    if (enviando) {
        return;
    }

    aulasSelecionadas = aulasSelecionadas.filter((item) => item !== aula);

    limparMensagem();
    aposRemoverAulas();
}

/* Se a aula do quadro do motorista saiu, o quadro passa para a última. */
function aposRemoverAulas() {
    if (!aulasSelecionadas.includes(aulaDoMotorista)) {
        atualizarPainelMotorista(aulasSelecionadas[aulasSelecionadas.length - 1]);
    }

    atualizarSelecao();
}

/* =========================================
   ETAPA 3 — MOTORISTA
   GET /api/agendamentos/motoristas-disponiveis
   ========================================= */

function mostrarMotorista(avatar, nome, detalhe) {
    instructorAvatar.textContent = avatar;
    selectedInstructor.textContent = nome;
    selectedVehicle.textContent = detalhe;
}

function adicionarOpcaoMotorista(valor, texto) {
    const opcao = document.createElement("option");

    opcao.value = valor;
    opcao.textContent = texto;
    motoristaSelect.appendChild(opcao);
}

async function atualizarPainelMotorista(aula = null) {
    buscaMotoristas = buscaMotoristas + 1;

    const busca = buscaMotoristas;

    aulaDoMotorista = aula;
    motoristaSelect.innerHTML = "";
    motoristaSelect.disabled = true;

    if (!aula) {
        mostrarMotorista("?", "Será definido após escolher o horário",
            "Escolha a data e o horário da aula");
        return;
    }

    const detalhe = `Aula de ${formatarDataHora(aula.dataHoraInicio)}`;

    mostrarMotorista("?", "Carregando motoristas...", detalhe);

    let motoristas;

    try {
        motoristas = await listarMotoristasDisponiveis(
            contratacaoAtual.id, aula.categoria, aula.dataHoraInicio);
    } catch (erro) {
        if (busca === buscaMotoristas) {
            mostrarMotorista("!", "Motoristas indisponíveis", erro.message);
        }
        return;
    }

    if (busca !== buscaMotoristas) {
        return;
    }

    preencherListaMotoristas(motoristas, aula);
}

/* Uma opção por motorista e veículo. Valor: "motoristaId|veiculoId". */
function preencherListaMotoristas(motoristas, aula) {
    if (motoristas.length === 0) {
        mostrarMotorista("!", "Nenhum motorista livre", "Desmarque este horário.");
        return;
    }

    adicionarOpcaoMotorista("", "Sem preferência");

    motoristas.forEach((motorista) => {
        motorista.veiculos.forEach((veiculo) => {
            adicionarOpcaoMotorista(
                `${motorista.motoristaId}|${veiculo.veiculoId}`,
                `${motorista.nome} — ${veiculo.modelo} (${veiculo.placa})`
            );
        });
    });

    motoristaSelect.value = aula.motoristaId
        ? `${aula.motoristaId}|${aula.veiculoId}`
        : "";

    /* O motorista escolhido antes não está mais livre: fica "Sem preferência". */
    if (motoristaSelect.selectedIndex === -1) {
        motoristaSelect.value = "";
    }

    motoristaSelect.disabled = enviando;
    guardarMotoristaEscolhido();
}

/* Guarda na aula o motorista escolhido e mostra no quadro e no resumo. */
function guardarMotoristaEscolhido() {
    const aula = aulaDoMotorista;

    if (!aula) {
        return;
    }

    const [motoristaId, veiculoId] = motoristaSelect.value.split("|");

    aula.motoristaId = motoristaId || null;
    aula.veiculoId = veiculoId || null;
    aula.motoristaNome = aula.motoristaId
        ? motoristaSelect.selectedOptions[0].textContent
        : null;

    const detalhe = `Aula de ${formatarDataHora(aula.dataHoraInicio)}`;

    if (aula.motoristaNome) {
        const nome = aula.motoristaNome;
        mostrarMotorista(nome.charAt(0).toUpperCase(), nome, detalhe);
    } else {
        mostrarMotorista("?", "Sem preferência", detalhe);
    }

    mostrarResumoAulas();
}

motoristaSelect.addEventListener("change", guardarMotoristaEscolhido);

/* =========================================
   ETAPA 4 — CONFIRMAR
   POST /api/agendamentos (tudo ou nada)
   ========================================= */

function montarAulas() {
    return aulasSelecionadas.map((aula) => {
        const escolher = unidadesDaCategoria(aula.categoria).length > 1;
        const unidade = unidadeDaCategoria(aula.categoria);

        return {
            dataHoraInicio: aula.dataHoraInicio,
            categoria: aula.categoria,
            motoristaId: aula.motoristaId,
            veiculoId: aula.veiculoId,
            unidadeId: escolher && unidade ? unidade.id : null
        };
    });
}

/* 409 e 400 por aula: o horário perdido sai do lote e as outras aulas ficam. */
function tratarErroDoPedido(erro) {
    const erros = erro.erros || [erro.message];
    const daUnidade = (texto) => /unidade/i.test(texto);
    const inicios = erros
        .filter((texto) => !daUnidade(texto))
        .map(inicioDoErro)
        .filter(Boolean);
    const perdidas = aulasSelecionadas.filter((aula) =>
        inicios.includes(aula.dataHoraInicio.slice(0, 16)));

    let texto = erro.status === 422
        ? `${erro.message} Desmarque algumas aulas.`
        : erros.join("\n");

    if (perdidas.length > 0) {
        const horarios = perdidas.map((aula) => formatarDataHora(aula.dataHoraInicio));

        aulasSelecionadas = aulasSelecionadas.filter((aula) => !perdidas.includes(aula));
        aposRemoverAulas();

        texto += `\nSaíram da seleção: ${horarios.join(", ")}.`;

        if (aulasSelecionadas.length > 0) {
            texto += " As outras aulas continuam marcadas.";
        }
    }

    mostrarMensagem(texto, "error");

    /* As unidades mudaram: relê a autoescola e o aluno escolhe de novo. */
    if (erros.some(daUnidade)) {
        carregarAutoescola();
    }

    /* 422 (saldo), 404 ou 400 sem data na frente: erro da contratação. */
    const semData = erros.some((item) => !inicioDoErro(item));

    if ([422, 404].includes(erro.status) || (erro.status === 400 && semData)) {
        atualizarContratacao();
    }

    carregarHorarios();
}

confirmBookingButton.addEventListener("click", async () => {
    if (enviando) {
        return;
    }

    if (aulasSelecionadas.length === 0) {
        mostrarMensagem("Selecione pelo menos uma aula.", "error");
        return;
    }

    enviando = true;
    verificarAgendamento();
    mostrarMensagem("Enviando o pedido...", "success");

    const aviso = await conferirUnidades();

    if (aviso) {
        enviando = false;
        verificarAgendamento();
        mostrarMensagem(aviso, "error");
        return;
    }

    try {
        const resposta = await agendarAulas(contratacaoAtual.id, montarAulas());

        mostrarMensagem(
            `${resposta.ids.length} aula(s) agendada(s). ` +
            "Cada motorista ainda precisa aceitar a aula.",
            "success"
        );

        /* Continua travado até ir para o painel. */
        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1800);
    } catch (erro) {
        enviando = false;
        tratarErroDoPedido(erro);
        verificarAgendamento();
    }
});

/* =========================================
   SAIR E INÍCIO DA TELA
   ========================================= */

document.getElementById("booking-logout").addEventListener("click", sair);

/* Só aluno logado usa esta tela. Sem login, volta para o login.html. */
if (exigirLogin(["Aluno"])) {
    carregarContratacoes();
}