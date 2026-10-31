import { consultarVisaoGeral, formatarCpf, horariosLivres } from "../consultasOperador.js";
import { TIPOS_EXAME, pendencias, apto, concluido } from "../exames.js";
import { formatarData } from "../../../shared/js/calendario.js";
import { el, botao, campo, entrada, modal } from "./uiOperador.js";
import { cardAula } from "./aulaOperador.js";
const INDICADORES = [
    ["alunos", "Alunos da unidade", "Todos os cadastros vinculados", "users"],
    ["financeiro", "Pendências financeiras", "Alunos com situação pendente", "check"],
    ["exames", "Prova / exames pendentes", "Alunos com etapas a concluir", "file"],
    ["aptos", "Aptos para aulas", "Financeiro, exames e saldo em dia", "check"],
    ["hoje", "Aulas hoje", "Programação da data atual", "grid"],
    ["semana", "Próximos 7 dias", "Hoje e os seis dias seguintes", "grid"],
    ["veiculos", "Veículos disponíveis", "Ativos; ocupação varia por horário", "car"],
    ["instrutores", "Instrutores", "Ativos na unidade", "users"],
    ["livres", "Horários livres hoje", "Inícios futuros com recursos livres", "grid"]
];
function icone(nome) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), use = document.createElementNS(svg.namespaceURI, "use");
    svg.setAttribute("aria-hidden", "true"); use.setAttribute("href", `#op-${nome}`); svg.append(use); return svg;
}
export function montarVisaoGeral(raiz, painel, obterEstado, { verAluno, verAula, agendar, navegar }) {
    // Substitui apenas a apresentação da visão geral. Dados/regras permanecem nos módulos existentes.
    const metrics = el("div", undefined, "op-metrics op-dashboard-metrics"), proximas = el("article", undefined, "op-card op-proximas");
    painel.replaceChildren(metrics, proximas); painel.classList.add("op-dashboard");
    const detalhes = modal(raiz, "Registros do indicador", "opIndicador"), topo = el("div", undefined, "op-indicador-resumo"), controles = el("div", undefined, "op-indicador-filtros op-form-fields"), lista = el("div", undefined, "op-indicador-lista"), rodape = el("div", undefined, "op-dialog-actions");
    const busca = entrada("search"), data = entrada("date"); busca.placeholder = "Buscar nos registros"; busca.dataset.indicadorBusca = ""; data.dataset.indicadorData = "";
    const buscaLabel = campo("Buscar", busca), dataLabel = campo("Data da aula", data); controles.append(buscaLabel, dataLabel); detalhes.append(topo, controles, lista, rodape);
    let chave, fotografia;
    function abrirAluno(aluno) { detalhes.close(); verAluno(aluno); }
    function abrirAula(aula) { detalhes.close(); verAula(aula); }
    function abrirHorario(horario) { detalhes.close(); navegar("agenda"); agendar(horario.data, horario.inicio); }
    function registroAluno(aluno) {
        const card = el("article", undefined, "op-indicador-registro");
        card.append(el("h3", aluno.nome), el("p", `${formatarCpf(aluno.cpf)} · Unidade ${aluno.unidade} · Categoria ${aluno.categoria}`, "op-record-meta"));
        const infos = el("div", undefined, "op-record-tags");
        infos.append(el("span", `Financeiro: ${aluno.financeiro}`, `op-badge ${aluno.financeiro === "Regular" ? "op-status-ok" : "op-status-pending"}`));
        if (chave === "financeiro") {
            const ultima = [...aluno.historico].reverse().find(h => h.tipo === "financeiro");
            card.append(el("p", ultima ? `Última alteração fictícia: ${new Date(ultima.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })}` : "Última verificação: não informada · sem consulta ICFC", "op-record-meta"));
        }
        for (const [tipo, titulo] of Object.entries(TIPOS_EXAME)) {
            if (tipo === "toxicologico" && aluno.exames[tipo].status === "Não se aplica") continue;
            infos.append(el("span", `${titulo}: ${aluno.exames[tipo].status}`, `op-badge ${concluido(aluno.exames[tipo]) ? "" : "op-status-pending"}`));
        }
        infos.append(el("span", apto(aluno) ? "Apto para aulas" : "Não apto para aulas", "op-badge"), el("span", `${pendencias(aluno).length} pendência(s) de prova / exames`, "op-badge"), el("span", `${aluno.aulas} aulas de saldo`, "op-badge"));
        card.append(infos, botao("Ver detalhes", () => abrirAluno(aluno))); return card;
    }
    function registroRecurso(recurso) {
        const card = el("article", undefined, "op-indicador-registro"); card.append(el("h3", recurso.nome), el("p", recurso.descricao, "op-record-meta"));
        const filtro = recurso.tipo === "Veículos" ? { veiculoId: recurso.id } : { instrutorId: recurso.id };
        const livres = horariosLivres(obterEstado(), consultarVisaoGeral(obterEstado()).hoje, filtro);
        const associados = recurso.tipo === "Veículos" ? obterEstado().recursos.filter(r => r.tipo === "Instrutores" && r.veiculoIds?.includes(recurso.id)) : obterEstado().recursos.filter(r => recurso.veiculoIds?.includes(r.id));
        card.append(el("span", "Ativo · Centro", "op-badge op-status-ok"), el("p", recurso.categoria ? `Categoria ${recurso.categoria}` : `Categorias: ${recurso.categorias.join(", ")}`, "op-record-meta"),
            el("p", associados.length ? `Associações: ${associados.map(r => r.nome).join(", ")}` : "Associação fixa não informada", "op-record-meta"),
            el("p", livres.length ? `Hoje: ${livres.map(h => h.inicio).join(", ")}` : "Sem horários futuros livres hoje", "op-record-meta"));
        return card;
    }
    function registroHorario(h) {
        const card = el("article", undefined, "op-indicador-registro"), estado = obterEstado();
        card.append(el("h3", `${h.inicio} · ${formatarData(h.data)}`));
        const pares = el("ul", undefined, "op-pares-lista");
        for (const p of h.pares) pares.append(el("li", `Categoria ${p.categoria} · ${estado.recursos.find(r => r.id === p.instrutorId)?.nome} · ${estado.recursos.find(r => r.id === p.veiculoId)?.descricao}`));
        card.append(pares, botao("Agendar neste horário", () => abrirHorario(h), "op-button op-button-primary")); return card;
    }
    function renderizarDetalhes() {
        if (!chave) return;
        const registros = fotografia.grupos[chave], termo = busca.value.trim().toLocaleLowerCase("pt-BR");
        const filtrados = registros.filter(r => (!data.value || r.data === data.value) && (!termo || JSON.stringify(r).toLocaleLowerCase("pt-BR").includes(termo) || (r.alunoId && obterEstado().alunos.find(a => a.id === r.alunoId)?.nome.toLocaleLowerCase("pt-BR").includes(termo))));
        topo.replaceChildren(el("strong", String(registros.length)), el("p", `registro(s) no total · ${filtrados.length} exibido(s)`)); topo.dataset.indicadorTotal = String(registros.length);
        lista.replaceChildren();
        for (const registro of filtrados) {
            const card = ["alunos", "financeiro", "exames", "aptos"].includes(chave) ? registroAluno(registro)
                : ["hoje", "semana"].includes(chave) ? cardAula(obterEstado(), registro, abrirAula)
                    : chave === "livres" ? registroHorario(registro) : registroRecurso(registro);
            card.dataset.indicadorRegistro = registro.id || registro.inicio; lista.append(card);
        }
        if (!filtrados.length) lista.append(el("p", "Nenhum registro encontrado para este indicador ou filtro.", "op-empty-state"));
    }
    function abrirIndicador(id) {
        chave = id; busca.value = ""; data.value = "";
        atualizar();
        detalhes.dataset.indicadorAberto = id;
        detalhes.querySelector("h2").textContent = INDICADORES.find(([key]) => key === id)[1];
        dataLabel.hidden = !["hoje", "semana"].includes(id); buscaLabel.hidden = id === "livres";
        rodape.replaceChildren(botao("Fechar", () => detalhes.close()), botao(id === "livres" || ["hoje", "semana"].includes(id) ? "Abrir agenda" : ["veiculos", "instrutores"].includes(id) ? "Ver recursos" : "Consultar alunos", () => {
            detalhes.close(); navegar(id === "livres" || ["hoje", "semana"].includes(id) ? "agenda" : ["veiculos", "instrutores"].includes(id) ? "recursos" : "alunos");
        }));
        renderizarDetalhes(); detalhes.showModal();
    }
    busca.addEventListener("input", renderizarDetalhes); data.addEventListener("change", renderizarDetalhes);
    function atualizar() {
        const snapshot = consultarVisaoGeral(obterEstado());
        fotografia = snapshot;
        const foco = document.activeElement?.dataset.indicador;
        metrics.replaceChildren(...INDICADORES.map(([id, titulo, complemento, simbolo]) => {
            const card = botao("", () => abrirIndicador(id), "op-card op-metric op-metric-button"); card.dataset.indicador = id;
            card.setAttribute("aria-label", `${titulo}: ${snapshot.grupos[id].length}. Ver registros`);
            card.title = complemento;
            const cabecalho = el("span", undefined, "op-metric-heading"); cabecalho.append(el("span", titulo), icone(simbolo));
            const rodape = el("span", "Ver registros →", "op-metric-footer");
            card.append(cabecalho, el("strong", String(snapshot.grupos[id].length)), rodape); return card;
        }));
        if (foco) metrics.querySelector(`[data-indicador=${foco}]`)?.focus();
        const heading = el("div", undefined, "op-card-heading"); heading.append(el("h2", "Próximas aulas · Centro"), botao("Ver agenda →", () => navegar("agenda")));
        const listaAulas = el("div", undefined, "op-proximas-lista op-demo-agenda");
        snapshot.proximas.slice(0, 6).forEach(a => listaAulas.append(cardAula(obterEstado(), a, verAula, "lista")));
        if (!snapshot.proximas.length) listaAulas.append(el("p", "Nenhuma aula futura. Consulte a agenda para encontrar um horário disponível.", "op-empty-state"));
        proximas.replaceChildren(heading, listaAulas);
        if (detalhes.open) renderizarDetalhes();
    }
    atualizar(); return { atualizar };
}
