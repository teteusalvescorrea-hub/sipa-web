/* =========================================
   SIPA — AUTOESCOLA
   Pedidos dos alunos (aprovar e recusar) e pacotes à venda.
   ========================================= */

import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import { obterAutoescolaLogada }
    from "./modules/autoescolas/services/autoescolas.service.js";
import {
    listarPacotes,
    cadastrarPacote,
    excluirPacote
} from "./modules/pacotes/services/pacotes.service.js";
import {
    listarContratacoes,
    aprovarContratacao,
    recusarContratacao
} from "./modules/contratacoes/services/contratacoes.service.js";
import { avisoDeErro, mensagemDoErro }
    from "./modules/pacotes/components/escolhaDePacotes.js";


/* =========================================
   ELEMENTOS DA PÁGINA
   ========================================= */

const autoescolaNome = document.getElementById("autoescola-nome");
const pedidosLista = document.getElementById("pedidos-lista");
const pacotesLista = document.getElementById("pacotes-lista");
const pacoteForm = document.getElementById("pacote-form");
const pacoteNome = document.getElementById("pacote-nome");
const pacoteQuantidade = document.getElementById("pacote-quantidade");
const pacotePreco = document.getElementById("pacote-preco");
const pacoteSalvar = document.getElementById("pacote-salvar");
const pacoteMessage = document.getElementById("pacote-form-message");
const logoutButton = document.getElementById("autoescola-logout");

const formatoPreco = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});

let buscaPedidos = 0;     // número da busca de pedidos mais recente
let buscaPacotes = 0;     // número da busca de pacotes mais recente
let salvando = false;


/* =========================================
   AJUDANTES
   ========================================= */

function criarTexto(tag, classe, texto) {

    const elemento = document.createElement(tag);

    elemento.className = classe;
    elemento.textContent = texto;

    return elemento;
}


function criarBotao(texto, classe, aoClicar) {

    const botao = document.createElement("button");

    botao.type = "button";
    botao.className = `autoescola-botao ${classe}`;
    botao.textContent = texto;
    botao.addEventListener("click", aoClicar);

    return botao;
}


/* 10 → "10 aulas"; 1 → "1 aula" */
function textoAulas(quantidade) {
    return quantidade === 1 ? "1 aula" : `${quantidade} aulas`;
}


/* "2026-10-14T10:30:00" → "14/10/2026" */
function dataDoPedido(criadoEm) {

    if (!criadoEm) {
        return "";
    }

    const [ano, mes, dia] = criadoEm.slice(0, 10).split("-");

    return `${dia}/${mes}/${ano}`;
}


/* "27999998888" → "(27) 99999-8888" */
function formatarTelefone(numero) {

    if (!numero || numero.length < 10) {
        return numero ?? "";
    }

    const resto = numero.slice(2);

    return `(${numero.slice(0, 2)}) ${resto.slice(0, -4)}-${resto.slice(-4)}`;
}


/* Erro embaixo do card. */
function mostrarErroNoCard(card, erro) {

    let aviso = card.querySelector(".autoescola-card-erro");

    if (!aviso) {
        aviso = criarTexto("p", "autoescola-card-erro", "");
        card.append(aviso);
    }

    aviso.textContent = mensagemDoErro(erro);
}


/* =========================================
   NOME NO CABEÇALHO (GET /api/autoescolas/me)
   ========================================= */

async function carregarAutoescola() {

    try {
        const autoescola = await obterAutoescolaLogada();
        autoescolaNome.textContent = autoescola.nomeFantasia || autoescola.nome;
    } catch {
        autoescolaNome.textContent = "Sua autoescola";
    }
}


/* =========================================
   PEDIDOS DOS ALUNOS (GET /api/contratacoes)
   ========================================= */

function textoDoStatus(contratacao) {

    const status = contratacao.status.valor;

    if (status === 1) {
        return "Aguardando sua confirmação";
    }

    if (status === 2) {
        return `Aprovado — ${contratacao.aulasRestantes} de ` +
            `${textoAulas(contratacao.quantidadeAulas)} restantes`;
    }

    if (status === 3) {
        return "Recusado";
    }

    if (status === 4) {
        return "Encerrado";
    }

    return contratacao.status.descricao;
}


/* aprovar: true (aprovar) ou false (recusar). Os dois são definitivos. */
async function decidirPedido(contratacao, aprovar, card) {

    const pedido = `${contratacao.alunoNome} (${contratacao.pacoteNome})`;

    const pergunta = aprovar
        ? `Aprovar o pedido de ${pedido}? Confirme só se já recebeu o pagamento.`
        : `Recusar o pedido de ${pedido}?`;

    if (!window.confirm(pergunta)) {
        return;
    }

    const botoes = card.querySelectorAll("button");

    botoes.forEach((botao) => {
        botao.disabled = true;
    });

    try {

        if (aprovar) {
            await aprovarContratacao(contratacao.id);
        } else {
            await recusarContratacao(contratacao.id);
        }

    } catch (erro) {

        mostrarErroNoCard(card, erro);

        botoes.forEach((botao) => {
            botao.disabled = false;
        });

        return;
    }

    carregarPedidos();
}


function criarCardPedido(contratacao) {

    const card = document.createElement("article");
    const data = dataDoPedido(contratacao.criadoEm);
    const contato = [contratacao.alunoEmail, formatarTelefone(contratacao.alunoTelefone)]
        .filter(Boolean)
        .join(" · ");

    card.className = "pedido-card";

    card.append(
        criarTexto("strong", "pedido-nome", contratacao.alunoNome),
        criarTexto("small", "pedido-autoescola", contato),
        criarTexto(
            "span",
            "autoescola-pedido-pacote",
            `${contratacao.pacoteNome} · ${formatoPreco.format(contratacao.preco)}`
        ),
        criarTexto(
            "span",
            `pedido-status status-${contratacao.status.valor}`,
            textoDoStatus(contratacao)
        )
    );

    if (data) {
        card.append(criarTexto("small", "pedido-data", `Pedido em ${data}`));
    }

    /* As flags vêm da API (só na pendente). */
    if (contratacao.podeAprovar || contratacao.podeRecusar) {

        const acoes = document.createElement("div");

        acoes.className = "autoescola-acoes";

        if (contratacao.podeAprovar) {
            acoes.append(criarBotao("Aprovar", "aprovar",
                () => decidirPedido(contratacao, true, card)));
        }

        if (contratacao.podeRecusar) {
            acoes.append(criarBotao("Recusar", "recusar",
                () => decidirPedido(contratacao, false, card)));
        }

        card.append(acoes);
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

    if (contratacoes.length === 0) {

        pedidosLista.replaceChildren(
            criarTexto("p", "pacotes-aviso", "Nenhum aluno pediu pacote ainda.")
        );

        return;
    }

    /* Pendentes primeiro; dentro de cada grupo, a ordem da API (mais novos antes). */
    const ordenados = [...contratacoes].sort(
        (a, b) => Number(a.status.valor !== 1) - Number(b.status.valor !== 1)
    );

    pedidosLista.replaceChildren(...ordenados.map(criarCardPedido));
}


/* =========================================
   PACOTES À VENDA (GET /api/pacotes)
   ========================================= */

async function tirarDeVenda(pacote, card) {

    const pergunta =
        `Tirar "${pacote.nomeExibicao}" de venda? ` +
        "Ele sai da vitrine, e os pedidos já feitos continuam valendo.";

    if (!window.confirm(pergunta)) {
        return;
    }

    const botao = card.querySelector("button");

    botao.disabled = true;

    try {
        await excluirPacote(pacote.id);
    } catch (erro) {
        mostrarErroNoCard(card, erro);
        botao.disabled = false;
        return;
    }

    carregarPacotes();
}


function criarCardPacote(pacote) {

    const card = document.createElement("article");
    const categorias = pacote.categorias.map((categoria) => categoria.descricao);

    card.className = "pedido-card";

    card.append(
        criarTexto("strong", "pedido-nome", pacote.nomeExibicao),
        criarTexto("span", "pacote-card-aulas", textoAulas(pacote.quantidadeAulas)),
        criarTexto("span", "pacote-card-preco", formatoPreco.format(pacote.preco)),
        criarTexto("small", "pedido-autoescola", categorias.join(" · ")),
        criarTexto(
            "small",
            "pedido-data",
            pacote.contratado ? "Já tem pedido de aluno" : "Ainda sem pedidos"
        ),
        criarBotao("Tirar de venda", "recusar", () => tirarDeVenda(pacote, card))
    );

    return card;
}


async function carregarPacotes() {

    const busca = ++buscaPacotes;

    pacotesLista.replaceChildren(
        criarTexto("p", "pacotes-aviso", "Carregando pacotes...")
    );

    let pacotes;

    try {
        pacotes = await listarPacotes();
    } catch (erro) {

        if (busca === buscaPacotes) {
            pacotesLista.replaceChildren(avisoDeErro(erro, carregarPacotes));
        }

        return;
    }

    /* Uma busca mais nova já começou. */
    if (busca !== buscaPacotes) {
        return;
    }

    if (pacotes.length === 0) {

        pacotesLista.replaceChildren(criarTexto(
            "p",
            "pacotes-aviso",
            "Nenhum pacote à venda. Cadastre o primeiro acima para ele aparecer aos alunos."
        ));

        return;
    }

    // Carro antes de moto e, dentro de cada um, por quantidade de aulas.
    const primeiraCategoria = (pacote) =>
        Math.max(...pacote.categorias.map((categoria) => categoria.valor));

    const ordenados = [...pacotes].sort((a, b) =>
        primeiraCategoria(b) - primeiraCategoria(a) || a.quantidadeAulas - b.quantidadeAulas);

    pacotesLista.replaceChildren(...ordenados.map(criarCardPacote));
}


/* =========================================
   NOVO PACOTE (POST /api/pacotes)
   ========================================= */

/* "1.890,00", "1890,5" ou "1890.50" → 1890.5. Inválido → null. */
function lerPreco(texto) {

    const limpo = texto.replace(/R\$|\s/g, "");

    const numero = limpo.includes(",")
        ? limpo.replace(/\./g, "").replace(",", ".")
        : limpo;

    if (!/^\d+(\.\d{1,2})?$/.test(numero)) {
        return null;
    }

    const preco = Number(numero);

    return preco <= 99999999.99 ? preco : null;
}


/* textos: uma linha por mensagem; tipo: "sucesso" ou "erro" */
function mostrarMensagem(textos, tipo) {

    pacoteMessage.replaceChildren(
        criarTexto("p", `pacotes-resumo ${tipo}`, textos.join("\n"))
    );

    pacoteMessage.hidden = false;
}


/* As mesmas regras da API, com as mesmas mensagens. */
function validarPacote(pacote) {

    const erros = [];

    if (pacote.nome.length > 100) {
        erros.push("O nome do pacote deve ter no máximo 100 caracteres.");
    }

    const quantidade = pacote.quantidadeAulas;

    if (!Number.isInteger(quantidade) || quantidade < 1 || quantidade > 100) {
        erros.push("Informe a quantidade de aulas, de 1 a 100.");
    }

    if (pacote.preco === null) {
        erros.push("Informe um preço válido, de 0 a 99.999.999,99.");
    }

    if (pacote.categorias.length === 0) {
        erros.push("Selecione uma categoria.");
    }

    return erros;
}


pacoteForm.addEventListener("submit", async (evento) => {

    evento.preventDefault();

    if (salvando) {
        return;
    }

    const marcadas = pacoteForm.querySelectorAll('input[name="pacote-categoria"]:checked');

    const pacote = {
        nome: pacoteNome.value.trim(),
        quantidadeAulas: pacoteQuantidade.value === "" ? null : Number(pacoteQuantidade.value),
        preco: lerPreco(pacotePreco.value),
        categorias: [...marcadas].map((caixa) => Number(caixa.value)).sort()
    };

    const erros = validarPacote(pacote);

    if (erros.length > 0) {
        mostrarMensagem(erros, "erro");
        return;
    }

    salvando = true;
    pacoteSalvar.disabled = true;

    try {
        await cadastrarPacote(pacote);
    } catch (erro) {
        mostrarMensagem(erro.erros ?? [mensagemDoErro(erro)], "erro");
        return;
    } finally {
        salvando = false;
        pacoteSalvar.disabled = false;
    }

    pacoteForm.reset();

    mostrarMensagem(["Pacote cadastrado. Ele já aparece na vitrine dos alunos."], "sucesso");

    carregarPacotes();
});


/* =========================================
   LOGOUT
   ========================================= */

logoutButton.addEventListener("click", sair);


/* =========================================
   INICIAR
   ========================================= */

if (exigirLogin(["Autoescola"])) {

    carregarAutoescola();

    carregarPedidos();

    carregarPacotes();
}
