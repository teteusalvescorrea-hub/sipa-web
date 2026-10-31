/* =========================================
   SIPA — ESCOLHA DE PACOTES
   Cards da vitrine por categoria (1 = A, 2 = B).
   O aluno marca o pacote que comprou e pede a contratação.
   Usado no cadastro (login.html) e em pacotes.html.
   ========================================= */

import { listarVitrine } from "./pacotes.service.js";
import { contratarPacote }
    from "./contratacoes.service.js";


/* Carro primeiro: é o pedido mais comum. */
const SECOES = [
    { categoria: 2, titulo: "Carro — categoria B", nome: "Carro" },
    { categoria: 1, titulo: "Moto — categoria A", nome: "Moto" }
];

const formatoPreco = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL"
});


/* =========================================
   AJUDANTES
   ========================================= */

function criarTexto(tag, classe, texto) {

    const elemento = document.createElement(tag);

    elemento.className = classe;
    elemento.textContent = texto;

    return elemento;
}


/* 10 → "10 aulas"; 1 → "1 aula" */
function textoAulas(quantidade) {
    return quantidade === 1 ? "1 aula" : `${quantidade} aulas`;
}


/* "Autoescola X · Vila Velha/ES, Serra/ES" */
function textoAutoescola(pacote) {

    const cidades = (pacote.autoescolaCidades ?? []).join(", ");

    return cidades
        ? `${pacote.autoescolaNome} · ${cidades}`
        : pacote.autoescolaNome;
}


/* ["A"] → "A"; ["A", "B", "C"] → "A, B e C" */
function juntarNomes(nomes) {

    if (nomes.length <= 1) {
        return nomes.join("");
    }

    return `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;
}


/* Erro da API em uma linha (listErrors ou a mensagem). */
export function mensagemDoErro(erro) {
    return erro?.erros?.join(" ") || erro?.message || "Erro inesperado. Tente de novo.";
}


/* Texto de sucesso com as autoescolas dos pacotes pedidos. */
function mensagemDePedidoEnviado(pacotes) {

    const autoescolas = [...new Set(pacotes.map((pacote) => pacote.autoescolaNome))];

    return `Pedido enviado para ${juntarNomes(autoescolas)}. ` +
        "As aulas aparecem no seu painel assim que a autoescola confirmar.";
}


/* Uma linha por pacote que falhou. */
function mensagemDasFalhas(falhas) {

    return falhas
        .map((falha) => `${falha.pacote.nomeExibicao}: ${falha.erro}`)
        .join("\n");
}


/* Resultado do envio: sucesso (verde) e falhas (vermelho) em parágrafos separados. */
export function resumoDoEnvio(enviados, falhas) {

    const partes = [];

    if (enviados.length > 0) {
        partes.push(criarTexto(
            "p", "pacotes-resumo sucesso", mensagemDePedidoEnviado(enviados)
        ));
    }

    if (falhas.length > 0) {
        partes.push(criarTexto("p", "pacotes-resumo erro", mensagemDasFalhas(falhas)));
    }

    return partes;
}


/* Mensagem de erro com o botão "Tentar de novo". */
export function avisoDeErro(erro, tentarDeNovo) {

    const aviso = document.createElement("div");
    const botao = document.createElement("button");

    aviso.className = "pacotes-falha";

    botao.type = "button";
    botao.className = "pacotes-tentar";
    botao.textContent = "Tentar de novo";
    botao.addEventListener("click", tentarDeNovo);

    aviso.append(
        criarTexto("p", "pacotes-aviso pacotes-erro", mensagemDoErro(erro)),
        botao
    );

    return aviso;
}


/* =========================================
   MONTAR O COMPONENTE
   container: onde entram as seções
   categorias: [1], [2] ou [1, 2]
   opcoes.botao: botão de confirmar (o componente habilita e trava)
   opcoes.jaPedidos: ids de pacotes com pedido pendente (status 1)
   ========================================= */

export function montarEscolhaDePacotes(container, categorias, opcoes = {}) {

    const botao = opcoes.botao ?? null;

    const marcados = new Map();   // categoria → pacote marcado
    const enviados = new Map();   // id → pacote já pedido aqui (não reenvia)
    const cards = new Map();      // categoria → [{ pacote, elemento }]
    const buscas = new Map();     // categoria → número da busca mais recente

    let jaPedidos = new Set(opcoes.jaPedidos ?? []);  // pendentes de antes (409 se repetir)
    let enviando = false;


    /* Já tem pedido: o card fica travado em "Pedido enviado". */
    function pedido(pacote) {
        return enviados.has(pacote.id) || jaPedidos.has(pacote.id);
    }


    /* Marcados ainda não enviados, sem repetir (pacote A e B aparece nas duas seções). */
    function selecionados() {

        const porId = new Map();

        marcados.forEach((pacote) => {

            if (!pedido(pacote)) {
                porId.set(pacote.id, pacote);
            }
        });

        return [...porId.values()];
    }


    /* Estado dos cards e do botão. */
    function atualizar() {

        cards.forEach((lista, categoria) => {

            lista.forEach(({ pacote, elemento }) => {

                const enviado = pedido(pacote);
                const marcado = !enviado && marcados.get(categoria)?.id === pacote.id;
                const selo = elemento.querySelector(".pacote-card-selo");

                elemento.classList.toggle("selecionado", marcado);
                elemento.classList.toggle("enviado", enviado);
                elemento.setAttribute("aria-pressed", String(marcado));
                elemento.disabled = enviando || enviado;

                selo.textContent =
                    enviado ? "Pedido enviado" : marcado ? "Selecionado" : "";
            });
        });

        container.classList.toggle("pacotes-enviando", enviando);

        if (botao) {
            botao.disabled = enviando || selecionados().length === 0;
        }
    }


    /* Tira o pacote de todas as categorias em que está marcado. */
    function desmarcar(pacote) {

        marcados.forEach((marcado, categoria) => {

            if (marcado.id === pacote.id) {
                marcados.delete(categoria);
            }
        });
    }


    /*
     * No máximo 1 por categoria. Clicar de novo desmarca.
     * Pacote A e B ocupa as duas seções da tela.
     */
    function marcar(categoria, pacote) {

        if (enviando || pedido(pacote)) {
            return;
        }

        if (marcados.get(categoria)?.id === pacote.id) {
            desmarcar(pacote);
            atualizar();
            return;
        }

        /* Seções da tela que o pacote cobre (a do clique e as outras). */
        const cobertas = [categoria, ...pacote.categorias
            .map((item) => item.valor)
            .filter((valor) => valor !== categoria && cards.has(valor))];

        cobertas.forEach((valor) => {

            const anterior = marcados.get(valor);

            if (anterior) {
                desmarcar(anterior);
            }
        });

        cobertas.forEach((valor) => marcados.set(valor, pacote));

        atualizar();
    }


    function criarCard(categoria, pacote) {

        const elemento = document.createElement("button");

        elemento.type = "button";
        elemento.className = "pacote-card";

        elemento.append(
            criarTexto("span", "pacote-card-nome", pacote.nomeExibicao),
            criarTexto("strong", "pacote-card-aulas", textoAulas(pacote.quantidadeAulas)),
            criarTexto("span", "pacote-card-preco", formatoPreco.format(pacote.preco)),
            criarTexto("span", "pacote-card-autoescola", textoAutoescola(pacote)),
            criarTexto("span", "pacote-card-selo", "")
        );

        /* Clique duplo: o 2º clique desmarcaria. */
        elemento.addEventListener("click", (evento) => {

            if (evento.detail > 1) {
                return;
            }

            marcar(categoria, pacote);
        });

        return { pacote, elemento };
    }


    /* GET /api/pacotes/vitrine?categoria= */
    async function carregarSecao(secao, corpo) {

        const busca = (buscas.get(secao.categoria) ?? 0) + 1;

        buscas.set(secao.categoria, busca);
        cards.set(secao.categoria, []);

        if (marcados.has(secao.categoria)) {
            desmarcar(marcados.get(secao.categoria));
        }

        atualizar();

        corpo.replaceChildren(
            criarTexto("p", "pacotes-aviso", "Carregando pacotes...")
        );

        let pacotes;

        try {
            pacotes = await listarVitrine({ categoria: secao.categoria });
        } catch (erro) {

            if (busca === buscas.get(secao.categoria)) {
                corpo.replaceChildren(
                    avisoDeErro(erro, () => carregarSecao(secao, corpo))
                );
            }

            return;
        }

        /* Uma busca mais nova já começou. */
        if (busca !== buscas.get(secao.categoria)) {
            return;
        }

        if (pacotes.length === 0) {

            corpo.replaceChildren(criarTexto(
                "p",
                "pacotes-aviso",
                `Nenhuma autoescola oferece pacote de ${secao.nome} ainda.`
            ));

            return;
        }

        const lista = document.createElement("div");
        const novos = pacotes.map((pacote) => criarCard(secao.categoria, pacote));

        lista.className = "pacotes-lista";
        lista.append(...novos.map((card) => card.elemento));

        cards.set(secao.categoria, novos);
        corpo.replaceChildren(lista);
        atualizar();
    }


    function criarSecao(secao) {

        const elemento = document.createElement("section");
        const corpo = document.createElement("div");

        elemento.className = "pacotes-secao";
        corpo.className = "pacotes-secao-corpo";

        elemento.append(
            criarTexto("h3", "pacotes-secao-titulo", secao.titulo),
            corpo
        );

        container.append(elemento);

        carregarSecao(secao, corpo);
    }


    /* POST /api/contratacoes, um por vez. Devolve o resultado por pacote. */
    async function enviar() {

        const pacotes = selecionados();

        if (enviando || pacotes.length === 0) {
            return null;
        }

        enviando = true;
        atualizar();

        const resultados = [];

        for (const pacote of pacotes) {

            try {
                await contratarPacote(pacote.id);
                enviados.set(pacote.id, pacote);
                resultados.push({ pacote, ok: true });
            } catch (erro) {
                resultados.push({ pacote, ok: false, erro: mensagemDoErro(erro) });
            }
        }

        /* O que já foi sai da seleção. */
        marcados.forEach((pacote, categoria) => {

            if (enviados.has(pacote.id)) {
                marcados.delete(categoria);
            }
        });

        enviando = false;
        atualizar();

        return resultados;
    }


    /* Pendentes relidos da API (ids de pacote). */
    function definirJaPedidos(ids) {

        jaPedidos = new Set(ids);

        marcados.forEach((pacote) => {

            if (jaPedidos.has(pacote.id)) {
                desmarcar(pacote);
            }
        });

        atualizar();
    }


    container.replaceChildren();
    container.classList.add("pacotes-escolha");

    SECOES
        .filter((secao) => categorias.includes(secao.categoria))
        .forEach(criarSecao);

    atualizar();

    return {
        selecionados,
        enviar,
        definirJaPedidos,
        enviados: () => [...enviados.values()]
    };
}
