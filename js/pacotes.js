/* =========================================
   SIPA — PACOTES
   Pedidos do aluno e escolha do pacote comprado.
   ========================================= */

import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import { obterAlunoLogado } from "./modules/alunos/services/alunos.service.js";
import { listarContratacoes }
    from "./modules/contratacoes/services/contratacoes.service.js";
import {
    montarEscolhaDePacotes,
    resumoDoEnvio,
    avisoDeErro
} from "./modules/pacotes/components/escolhaDePacotes.js";


/* =========================================
   ELEMENTOS DA PÁGINA
   ========================================= */

const pedidosLista =
    document.getElementById("pedidos-lista");

const pacotesEscolha =
    document.getElementById("pacotes-escolha");

const escolhaMessage =
    document.getElementById("escolha-message");

const confirmarPacote =
    document.getElementById("confirmar-pacote");

const logoutButton =
    document.getElementById("packages-logout");


let escolha = null;       // componente da vitrine
let buscaPedidos = 0;     // número da busca de pedidos mais recente
let pendentes = [];       // ids dos pacotes com pedido pendente (status 1)


/* =========================================
   AJUDANTES
   ========================================= */

function criarTexto(tag, classe, texto) {

    const elemento = document.createElement(tag);

    elemento.className = classe;
    elemento.textContent = texto;

    return elemento;
}


/* "2026-10-14T10:30:00" → "14/10/2026" */
function dataDoPedido(criadoEm) {

    if (!criadoEm) {
        return "";
    }

    const [ano, mes, dia] = criadoEm.slice(0, 10).split("-");

    return `${dia}/${mes}/${ano}`;
}


/* partes: parágrafos de resumoDoEnvio */
function mostrarMensagem(partes) {

    escolhaMessage.replaceChildren(...partes);
    escolhaMessage.hidden = false;
}


function esconderMensagem() {

    escolhaMessage.replaceChildren();
    escolhaMessage.hidden = true;
}


/* =========================================
   SEUS PEDIDOS (GET /api/contratacoes)
   ========================================= */

function textoDoStatus(contratacao) {

    const status = contratacao.status.valor;
    const restantes = contratacao.aulasRestantes;

    if (status === 1) {
        return "Aguardando a autoescola confirmar";
    }

    if (status === 2) {
        return restantes === 1
            ? "Aprovado — 1 aula restante"
            : `Aprovado — ${restantes} aulas restantes`;
    }

    if (status === 3) {
        return "Recusado pela autoescola";
    }

    if (status === 4) {
        return "Encerrado";
    }

    return contratacao.status.descricao;
}


function criarCardPedido(contratacao) {

    const card = document.createElement("article");
    const data = dataDoPedido(contratacao.criadoEm);

    card.className = "pedido-card";

    card.append(
        criarTexto("strong", "pedido-nome", contratacao.pacoteNome),
        criarTexto("small", "pedido-autoescola", contratacao.autoescolaNome),
        criarTexto(
            "span",
            `pedido-status status-${contratacao.status.valor}`,
            textoDoStatus(contratacao)
        )
    );

    if (data) {
        card.append(criarTexto("small", "pedido-data", `Pedido em ${data}`));
    }

    return card;
}


async function carregarPedidos() {

    const busca = ++buscaPedidos;

    pedidosLista.replaceChildren(
        criarTexto("p", "pacotes-aviso", "Carregando pedidos...")
    );

    let contratacoes;

    try {
        contratacoes = await listarContratacoes();
    } catch (erro) {

        if (busca === buscaPedidos) {
            pedidosLista.replaceChildren(avisoDeErro(erro, carregarPedidos));
        }

        return;
    }

    /* Uma busca mais nova já começou. */
    if (busca !== buscaPedidos) {
        return;
    }

    /* Pacote com pedido pendente não pode ser pedido de novo (409). */
    pendentes = contratacoes
        .filter((contratacao) => contratacao.status.valor === 1)
        .map((contratacao) => contratacao.pacoteId);

    escolha?.definirJaPedidos(pendentes);

    if (contratacoes.length === 0) {

        pedidosLista.replaceChildren(
            criarTexto("p", "pacotes-aviso", "Você ainda não pediu nenhum pacote.")
        );

        return;
    }

    pedidosLista.replaceChildren(...contratacoes.map(criarCardPedido));
}


/* =========================================
   ESCOLHER PACOTE
   Categorias pretendidas do aluno (GET /api/alunos/me)
   ========================================= */

async function carregarEscolha() {

    escolha = null;
    confirmarPacote.disabled = true;

    pacotesEscolha.replaceChildren(
        criarTexto("p", "pacotes-aviso", "Carregando pacotes...")
    );

    let aluno;

    try {
        aluno = await obterAlunoLogado();
    } catch (erro) {
        pacotesEscolha.replaceChildren(avisoDeErro(erro, carregarEscolha));
        return;
    }

    const categorias =
        aluno.categoriasPretendidas.map((categoria) => categoria.valor);

    /* Sem categoria pretendida: mostra as duas. */
    escolha = montarEscolhaDePacotes(
        pacotesEscolha,
        categorias.length > 0 ? categorias : [1, 2],
        { botao: confirmarPacote, jaPedidos: pendentes }
    );
}


/* =========================================
   CONFIRMAR (POST /api/contratacoes)
   ========================================= */

confirmarPacote.addEventListener("click", async () => {

    if (!escolha) {
        return;
    }

    esconderMensagem();

    const resultados = await escolha.enviar();

    if (!resultados) {
        return;
    }

    const enviados = resultados
        .filter((resultado) => resultado.ok)
        .map((resultado) => resultado.pacote);

    const falhas = resultados.filter((resultado) => !resultado.ok);

    mostrarMensagem(resumoDoEnvio(enviados, falhas));

    carregarPedidos();
});


/* =========================================
   LOGOUT
   ========================================= */

logoutButton.addEventListener("click", sair);


/* =========================================
   INICIAR
   ========================================= */

if (exigirLogin(["Aluno"])) {

    carregarPedidos();

    carregarEscolha();
}
