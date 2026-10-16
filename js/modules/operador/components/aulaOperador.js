import { dataPorExtenso, formatarData } from "../calendario.js";
import { STATUS_AGENDAMENTO } from "../disponibilidade.js";
import { el, botao, modal } from "./uiOperador.js";
export function identificarAula(estado, aula) {
    const recursos = estado.recursos.filter(r => r.unidade === "Centro");
    return { aluno: estado.alunos.find(a => a.id === aula.alunoId && a.unidade === "Centro")?.nome || "Aluno não informado",
        instrutor: recursos.find(r => r.id === aula.instrutorId)?.nome || "Instrutor não informado",
        veiculo: recursos.find(r => r.id === aula.veiculoId)?.nome || "Veículo não informado",
        identificacao: recursos.find(r => r.id === aula.veiculoId)?.descricao || "" };
}
export function cardAula(estado, aula, abrir, variante = "completo") {
    // Preserva os consumidores antigos que usavam um booleano como quarto argumento.
    if (typeof variante === "boolean") variante = variante ? "semana" : "completo";
    const nomes = identificarAula(estado, aula);
    if (["agenda", "semana"].includes(variante)) {
        const evento = botao("", () => abrir(aula), `op-aula-card op-aula-evento${variante === "semana" ? " op-aula-compact" : ""}`);
        evento.dataset.aulaId = aula.id;
        evento.setAttribute("aria-label", `Ver detalhes: ${nomes.aluno}, ${aula.inicio} às ${aula.fim}, categoria ${aula.categoria}, ${STATUS_AGENDAMENTO[aula.status]}`);
        const nome = el("span", nomes.aluno, "op-evento-nome"); nome.title = nomes.aluno;
        evento.append(nome, el("span", `${aula.inicio} às ${aula.fim}`, "op-evento-horario"), el("span", aula.categoria, "op-evento-categoria"),
            el("span", STATUS_AGENDAMENTO[aula.status], `op-badge op-aula-status-${aula.status}`));
        evento.querySelector(".op-badge").title = STATUS_AGENDAMENTO[aula.status];
        return evento;
    }
    const card = el("article", undefined, `op-aula-card${variante === "lista" ? " op-aula-lista" : ""}`);
    card.dataset.aulaId = aula.id;
    card.append(el("h3", nomes.aluno), el("strong", `${aula.inicio} às ${aula.fim}`, "op-aula-horario"),
        el("p", `${formatarData(aula.data)} · ${dataPorExtenso(aula.data).split(",")[0]}`, "op-aula-data"));
    const recursos = el("div", undefined, "op-aula-recursos");
    recursos.append(el("p", `Instrutor: ${nomes.instrutor}`), el("p", `Veículo: ${nomes.identificacao || nomes.veiculo}`));
    const rodape = el("div", undefined, "op-aula-footer");
    rodape.append(el("span", `Categoria ${aula.categoria}`, "op-aula-categoria"), el("span", STATUS_AGENDAMENTO[aula.status], `op-badge op-aula-status-${aula.status}`), botao("Ver detalhes", () => abrir(aula)));
    card.append(recursos, rodape);
    card.querySelector("h3").title = nomes.aluno;
    recursos.querySelectorAll("p").forEach(p => { p.title = p.textContent; });
    return card;
}
export function criarDetalhesAula(raiz, obterEstado) {
    const dialogo = modal(raiz, "Detalhes do agendamento", "opAula"), corpo = el("div"); dialogo.append(corpo);
    return { abrir(aula) {
        if (aula.unidade !== "Centro") return;
        const nomes = identificarAula(obterEstado(), aula);
        const destaque = el("header", undefined, "op-aula-destaque"); destaque.append(el("span", "AULA PRÁTICA · CENTRO", "op-eyebrow"), el("h3", nomes.aluno), el("strong", `${aula.inicio} às ${aula.fim}`, "op-aula-horario"), el("p", `${formatarData(aula.data)} · ${dataPorExtenso(aula.data)}`, "op-aula-data"), el("span", STATUS_AGENDAMENTO[aula.status], `op-badge op-aula-status-${aula.status}`));
        const dl = el("dl", undefined, "op-fields op-aula-ficha");
        for (const [nome, valor] of [["Instrutor", nomes.instrutor], ["Veículo", nomes.veiculo], ["Identificação", nomes.identificacao], ["Categoria", aula.categoria], ["Unidade", "Centro"], ["Duração", "60 minutos"]]) {
            const div = el("div"); div.append(el("dt", nome), el("dd", valor)); dl.append(div);
        }
        const cancelar = botao("Cancelamento administrativo indisponível", () => {}); cancelar.disabled = true;
        corpo.replaceChildren(destaque, dl, el("p", "Registro fictício da demonstração local.", "op-help"), cancelar);
        if (!dialogo.open) dialogo.showModal();
    } };
}
