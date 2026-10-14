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
import {
    listarHorariosDisponiveis,
    listarMotoristasDisponiveis,
    agendarAulas
} from "./modules/agendamentos/services/agendamentos.service.js";


/* =========================================
   CONFIGURAÇÕES
   ========================================= */

let dataAtual = new Date();
// Agosto = mês 7 no JavaScript

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

const summaryDate =
    document.getElementById("summary-date");


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
       DATA DE HOJE
       ===================================== */

    const hoje =
        new Date();

    hoje.setHours(
        0,
        0,
        0,
        0
    );


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
           DATA COMPLETA DO DIA
           ================================= */

        const dataDoDia =
            new Date(
                ano,
                mes,
                dia
            );


        dataDoDia.setHours(
            0,
            0,
            0,
            0
        );


        /* =================================
           VERIFICAR DOMINGO
           ================================= */

        const domingo =
            dataDoDia.getDay() === 0;


        /* =================================
           VERIFICAR SÁBADO
           ================================= */

        const sabado =
            dataDoDia.getDay() === 6;


        /* =================================
           VERIFICAR DATA PASSADA
           ================================= */

        const dataPassada =
            dataDoDia < hoje;


        /* =================================
           DOMINGO
           ================================= */

        if (domingo) {

            elementoDia.classList.add(
                "closed-day"
            );


            elementoDia.disabled =
                true;


            elementoDia.title =
                "Autoescola fechada aos domingos";

        }


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
            dataDoDia.getTime() ===
            hoje.getTime();


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
           ================================= */

        if (
            !domingo &&
            !dataPassada
        ) {

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


    const ano =
        dataSelecionada.getFullYear();


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


    /* RESUMO */

    if (summaryDate) {

        summaryDate.textContent =
            `${dia.toString().padStart(2, "0")}/${(mes + 1)
                .toString()
                .padStart(2, "0")}/${ano}`;

    }

}


/* =========================================
   MÊS ANTERIOR
   ========================================= */

if (previousMonthButton) {

    previousMonthButton.addEventListener(
        "click",
        () => {

            dataAtual.setMonth(
                dataAtual.getMonth() - 1
            );


            dataSelecionada = null;


            renderizarCalendario();


            if (selectedDateLabel) {

                selectedDateLabel.textContent =
                    "Selecione uma data";

            }


            if (summaryDate) {

                summaryDate.textContent =
                    "Não selecionada";

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

            dataAtual.setMonth(
                dataAtual.getMonth() + 1
            );


            dataSelecionada = null;


            renderizarCalendario();


            if (selectedDateLabel) {

                selectedDateLabel.textContent =
                    "Selecione uma data";

            }


            if (summaryDate) {

                summaryDate.textContent =
                    "Não selecionada";

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
   Etapa 3: motorista
   Etapa 4: confirmar
   ========================================= */

const timeSlots = document.getElementById("time-slots");
const summaryTime = document.getElementById("summary-time");
const summaryCategory = document.getElementById("summary-category");
const confirmBookingButton = document.getElementById("confirm-booking");
const bookingMessage = document.getElementById("booking-message");
const bookingPackageInfo = document.getElementById("booking-package-info");
const contratacaoSelect = document.getElementById("booking-contratacao");
const selectedLessonsCount = document.getElementById("selected-lessons-count");
const categoryOptions = document.querySelectorAll(".category-option");
const instructorAvatar = document.querySelector(".instructor-avatar");
const selectedInstructor = document.getElementById("selected-instructor");
const selectedVehicle = document.getElementById("selected-vehicle");
const motoristaSelect = document.getElementById("motorista-select");

/* Os botões da tela usam letras. A API usa números: 1 = A, 2 = B. */
const VALOR_CATEGORIA = { A: 1, B: 2 };

let contratacoes = [];           // contratações aprovadas com saldo
let contratacaoAtual = null;     // contratação usada no pedido
let categoriaSelecionada = null; // 1, 2 ou null
let horariosDoDia = null;        // resposta de horarios-disponiveis
let aulasSelecionadas = [];      // aulas que vão no pedido
let aulaDoMotorista = null;      // aula mostrada no quadro do motorista
let buscaHorarios = 0;           // número da busca de horários mais recente
let buscaMotoristas = 0;         // número da busca de motoristas mais recente

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

/* Erro da API: a lista de erros (um por linha) ou a mensagem pronta. */
function mostrarErroApi(erro) {
    const texto = erro.erros ? erro.erros.join("\n") : erro.message;

    mostrarMensagem(texto, "error");
}

function atualizarContadorAulas() {
    selectedLessonsCount.textContent = aulasSelecionadas.length;
}

/* O botão Confirmar só fica ativo com pelo menos uma aula escolhida. */
function verificarAgendamento() {
    confirmBookingButton.disabled = aulasSelecionadas.length === 0;
}

/* =========================================
   ETAPA 1 — CONTRATAÇÃO
   GET /api/contratacoes?status=2 (2 = Aprovado)
   ========================================= */

async function carregarContratacoes() {
    let lista;

    try {
        lista = await listarContratacoes(2);
    } catch (erro) {
        bookingPackageInfo.textContent = erro.message;
        mostrarErroApi(erro);
        mostrarCategorias([]);
        mostrarHorarios();
        return;
    }

    /* Só as que ainda têm saldo. Quem calcula o saldo é a API. */
    contratacoes = lista.filter((contratacao) => contratacao.aulasRestantes > 0);

    if (contratacoes.length === 0) {
        bookingPackageInfo.textContent =
            "Você não tem pacote aprovado com aulas disponíveis. " +
            "Contrate um pacote e aguarde a aprovação da autoescola.";
        mostrarCategorias([]);
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

function escolherContratacao(contratacao) {
    contratacaoAtual = contratacao;
    aulasSelecionadas = [];

    bookingPackageInfo.textContent =
        `${contratacao.pacoteNome} (${contratacao.autoescolaNome}): ` +
        `${contratacao.aulasRestantes} de ${contratacao.quantidadeAulas} ` +
        "aulas disponíveis";

    /* Pacote de uma categoria só: ela já vem marcada. */
    const categorias = contratacao.categorias;

    mostrarCategorias(categorias);
    selecionarCategoria(categorias.length === 1 ? categorias[0].valor : null);

    limparMensagem();
    atualizarContadorAulas();
    atualizarPainelMotorista();
    verificarAgendamento();
}

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

    /* Nova busca de horários a cada troca de categoria. */
    carregarHorarios();
}

categoryOptions.forEach((botao) => {
    botao.addEventListener("click", () => {
        selecionarCategoria(VALOR_CATEGORIA[botao.dataset.category]);
    });
});

contratacaoSelect.addEventListener("change", () => {
    escolherContratacao(contratacoes[Number(contratacaoSelect.value)]);
});

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

    atualizarResumoHorario();

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

/* Resumo: horários já escolhidos no dia marcado no calendário. */
function atualizarResumoHorario() {
    const dataChave = dataSelecionada ? formatarDataSistema(dataSelecionada) : "";
    const doDia = aulasSelecionadas.filter((aula) => aula.data === dataChave);

    summaryTime.textContent = doDia.length > 0
        ? doDia.map((aula) => aula.horario).join(", ")
        : "Não selecionado";
}

function mostrarHorarios() {
    atualizarResumoHorario();

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
        const botao = document.createElement("button");
        botao.type = "button";
        botao.className = "time-slot";
        botao.textContent = item.horario;

        const escolhido = aulasSelecionadas.some(
            (aula) => aula.dataHoraInicio === item.dataHoraInicio
        );

        if (escolhido) {
            botao.classList.add("selected");
        }

        if (item.disponivel || escolhido) {
            botao.addEventListener("click", () => selecionarHorario(item));
        } else {
            botao.classList.add("unavailable");
            botao.disabled = true;
        }

        timeSlots.appendChild(botao);
    });
}

/* Clicou num horário: marca. Clicou de novo: desmarca. */
function selecionarHorario(item) {
    const indice = aulasSelecionadas.findIndex(
        (aula) => aula.dataHoraInicio === item.dataHoraInicio
    );

    if (indice !== -1) {
        aulasSelecionadas.splice(indice, 1);
    } else if (aulasSelecionadas.length >= contratacaoAtual.aulasRestantes) {
        const saldo = contratacaoAtual.aulasRestantes;

        mostrarMensagem(`Seu pacote tem ${saldo} aula(s) disponível(is).`, "error");
        return;
    } else {
        aulasSelecionadas.push({
            data: formatarDataSistema(dataSelecionada),
            horario: item.horario,
            dataHoraInicio: item.dataHoraInicio,
            categoria: categoriaSelecionada,
            motoristaId: null, // null = "Sem preferência"
            veiculoId: null
        });
    }

    limparMensagem();
    atualizarContadorAulas();
    mostrarHorarios();
    atualizarPainelMotorista();
    verificarAgendamento();
}

/* O calendário (parte 1) chama renderizarCalendario ao trocar de dia ou de mês.
   Depois de desenhar o calendário, busca os horários do dia na API. */
const renderizarCalendarioOriginal = renderizarCalendario;

renderizarCalendario = function () {
    renderizarCalendarioOriginal();
    carregarHorarios();
};

/* =========================================
   ETAPA 3 — MOTORISTA
   GET /api/agendamentos/motoristas-disponiveis
   O quadro mostra a última aula escolhida.
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

async function atualizarPainelMotorista() {
    const aula = aulasSelecionadas[aulasSelecionadas.length - 1] || null;

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

    motoristaSelect.disabled = false;
    guardarMotoristaEscolhido();
}

/* Guarda na aula o motorista escolhido e mostra no quadro. */
function guardarMotoristaEscolhido() {
    const aula = aulaDoMotorista;
    const [motoristaId, veiculoId] = motoristaSelect.value.split("|");

    aula.motoristaId = motoristaId || null;
    aula.veiculoId = veiculoId || null;

    const detalhe = `Aula de ${formatarDataHora(aula.dataHoraInicio)}`;

    if (aula.motoristaId) {
        const nome = motoristaSelect.selectedOptions[0].textContent;
        mostrarMotorista(nome.charAt(0).toUpperCase(), nome, detalhe);
    } else {
        mostrarMotorista("?", "Sem preferência", detalhe);
    }
}

motoristaSelect.addEventListener("change", guardarMotoristaEscolhido);

/* =========================================
   ETAPA 4 — CONFIRMAR
   POST /api/agendamentos (tudo ou nada)
   ========================================= */

confirmBookingButton.addEventListener("click", async () => {
    if (aulasSelecionadas.length === 0) {
        mostrarMensagem("Selecione pelo menos uma aula.", "error");
        return;
    }

    const aulas = aulasSelecionadas.map((aula) => ({
        dataHoraInicio: aula.dataHoraInicio,
        categoria: aula.categoria,
        motoristaId: aula.motoristaId,
        veiculoId: aula.veiculoId
    }));

    confirmBookingButton.disabled = true;
    mostrarMensagem("Enviando o pedido...", "success");

    try {
        const resposta = await agendarAulas(contratacaoAtual.id, aulas);

        mostrarMensagem(
            `${resposta.ids.length} aula(s) agendada(s). ` +
            "Cada motorista ainda precisa aceitar a aula.",
            "success"
        );

        aulasSelecionadas = [];
        atualizarContadorAulas();

        setTimeout(() => {
            window.location.href = "dashboard.html";
        }, 1800);
    } catch (erro) {
        if (erro.status === 422) {
            /* 422 = saldo insuficiente. A mensagem já traz o saldo. */
            mostrarMensagem(`${erro.message} Desmarque algumas aulas.`, "error");
        } else {
            /* 400 e 409: um erro por aula, com a data e a hora na frente. */
            mostrarErroApi(erro);
        }

        confirmBookingButton.disabled = false;
        carregarHorarios();
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