import { hojeBrasil, somarDias, diaSemana, formatarData, dataPorExtenso, datasDoMes, feriadosBrasileiros, dataValida } from "../calendario.js";
import { STATUS_AGENDAMENTO, motivoNovoAgendamento, motivoFechamento, paresDisponiveis } from "../disponibilidade.js";
import { ordenarAulas } from "../consultasOperador.js";
import { cardAula, criarDetalhesAula } from "./aulaOperador.js";
import { el, botao, campo, select, entrada } from "./uiOperador.js";

export function montarAgenda(raiz, painel, obterEstado, { aoAgendar, detalhesAula } = {}) {
    let data = hojeBrasil(), modo = "dia";
    const filtros = { instrutorId: "", veiculoId: "", categoria: "", status: "" };
    const detalhes = detalhesAula || criarDetalhesAula(raiz, obterEstado);
    painel.replaceChildren(); painel.classList.add("op-agenda");
    const toolbar = el("div", undefined, "op-agenda-toolbar");
    const navegacao = el("div", undefined, "op-agenda-nav"), periodo = el("h2"); periodo.setAttribute("aria-live", "polite"); periodo.dataset.agendaPeriodo = "";
    const anterior = botao("‹", () => mover(-1)), proximo = botao("›", () => mover(1));
    anterior.setAttribute("aria-label", "Período anterior"); proximo.setAttribute("aria-label", "Próximo período");
    navegacao.append(anterior, botao("Hoje", () => { data = hojeBrasil(); renderizar(); }), proximo, periodo);
    const modos = el("div", undefined, "op-resource-tabs op-agenda-modos"); modos.setAttribute("aria-label", "Visualização da agenda");
    for (const [id, texto] of [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]]) {
        const b = botao(texto, () => { modo = id; renderizar(); }); b.dataset.agendaModo = id; modos.append(b);
    }
    const dataInput = entrada("date", data); dataInput.dataset.agendaData = ""; dataInput.min = "1900-01-01"; dataInput.max = "9998-12-31";
    dataInput.addEventListener("change", () => { if (dataValida(dataInput.value)) { data = dataInput.value; renderizar(); } });
    toolbar.append(navegacao, campo("Data selecionada", dataInput), modos);
    const painelFiltros = el("details", undefined, "op-agenda-filter-panel"), resumoFiltros = el("summary", "Filtros da agenda");
    const controles = el("div", undefined, "op-agenda-filters op-form-fields");
    for (const [key, titulo, tipo] of [["instrutorId", "Instrutor", "Instrutores"], ["veiculoId", "Veículo", "Veículos"]]) {
        const controle = select([["", "Todos"], ...obterEstado().recursos.filter(r => r.unidade === "Centro" && r.tipo === tipo).map(r => [r.id, r.nome])]);
        controle.dataset.agendaFiltro = key; controle.addEventListener("change", () => { filtros[key] = controle.value; renderizar(); }); controles.append(campo(titulo, controle));
    }
    for (const [key, titulo, opcoes] of [["categoria", "Categoria", [["", "Todas"], "A", "B"]], ["status", "Situação", [["", "Todas"], ...Object.entries(STATUS_AGENDAMENTO)]]]) {
        const controle = select(opcoes); controle.dataset.agendaFiltro = key;
        controle.addEventListener("change", () => { filtros[key] = controle.value; renderizar(); }); controles.append(campo(titulo, controle));
    }
    const limpar = botao("Limpar filtros", () => { Object.keys(filtros).forEach(k => { filtros[k] = ""; }); controles.querySelectorAll("select").forEach(s => { s.value = ""; }); renderizar(); });
    painelFiltros.append(resumoFiltros, controles, limpar);
    const feedback = el("p", "", "op-agenda-success"); feedback.hidden = true; feedback.setAttribute("role", "status"); feedback.tabIndex = -1;
    const legenda = el("div", undefined, "op-agenda-legenda");
    for (const [texto, classe] of [["Disponível", "livre"], ["Confirmada", "confirmada"], ["Aguardando aceite", "aguardando"], ["Fechado / bloqueado", "fechado"], ["Feriado", "feriado"], ["Ponto facultativo", "facultativo"]]) legenda.append(el("span", texto, `op-legenda-${classe}`));
    const conteudo = el("div", undefined, "op-agenda-content");
    painel.append(toolbar, painelFiltros, feedback, legenda, conteudo);
    function aulasData(d) {
        return ordenarAulas(obterEstado().aulas.filter(a => a.unidade === "Centro" && a.data === d && Object.entries(filtros).every(([k, v]) => !v || String(a[k]) === v)));
    }
    function mover(delta) {
        if (modo === "mes") {
            const dt = new Date(`${data.slice(0, 7)}-01T12:00:00Z`); dt.setUTCMonth(dt.getUTCMonth() + delta);
            const resultado = dt.toISOString().slice(0, 10); if (dataValida(resultado) && resultado < "9999-01-01") data = resultado;
        } else {
            const resultado = somarDias(data, delta * (modo === "semana" ? 7 : 1)); if (dataValida(resultado) && resultado < "9999-01-01") data = resultado;
        }
        renderizar();
    }
    function gradeDoDia(d) {
        const secao = el("section", undefined, "op-agenda-day"); secao.dataset.agendaColuna = d;
        const heading = el("header", undefined, "op-day-heading"); heading.append(el("h3", dataPorExtenso(d)), el("span", formatarData(d))); secao.append(heading);
        heading.querySelector("h3").title = dataPorExtenso(d);
        const fechado = motivoFechamento(d), especial = feriadosBrasileiros(Number(d.slice(0, 4))).find(f => f.data === d);
        secao.classList.toggle("op-agenda-fechada", !!fechado);
        if (especial && !fechado) heading.append(el("span", `${especial.nome} · ${especial.tipo}`, "op-day-special"));
        if (fechado) {
            const avisoFechamento = el("p", `${fechado} · sem expediente`, "op-slot-closed op-day-closed");
            avisoFechamento.title = avisoFechamento.textContent; secao.append(avisoFechamento);
            aulasData(d).forEach(a => secao.append(cardAula(obterEstado(), a, detalhes.abrir, modo === "semana" ? "semana" : "agenda"))); return secao;
        }
        const aulas = aulasData(d);
        for (let h = 7; h <= 18; h++) {
            const hora = `${String(h).padStart(2, "0")}:00`, motivo = motivoNovoAgendamento(d, hora), pares = paresDisponiveis(obterEstado(), d, hora, filtros);
            const linha = el("div", undefined, "op-agenda-slot"); linha.dataset.agendaHorario = hora;
            linha.append(el("time", hora)); const celula = el("div", undefined, "op-slot-conteudo");
            const ocupadas = aulas.filter(a => a.inicio === hora);
            ocupadas.forEach(a => celula.append(cardAula(obterEstado(), a, detalhes.abrir, modo === "semana" ? "semana" : "agenda")));
            if (!motivo && pares.length) {
                const categorias = [...new Set(pares.map(p => p.categoria))].join(" / ");
                const livre = botao("", () => {
                    if (!aoAgendar?.(d, hora)) { feedback.textContent = "Este horário não está mais disponível. Confira a grade atualizada."; feedback.hidden = false; renderizar(); }
                }, "op-slot-disponivel");
                livre.dataset.agendarHorario = hora; livre.dataset.agendarData = d; livre.disabled = !aoAgendar;
                livre.setAttribute("aria-label", `Agendar ${formatarData(d)} às ${hora}, categoria ${categorias}`);
                livre.append(el("strong", "＋ Agendar"), el("span", `Categoria ${categorias}`)); celula.append(livre);
            } else if (!ocupadas.length) {
                const mensagem = motivo || "Indisponível · recursos ocupados ou filtros sem disponibilidade";
                const curto = mensagem.startsWith("Horário passado") ? "Horário encerrado" : mensagem;
                const bloqueado = el("p", curto, `op-slot-closed${mensagem.includes("almoço") ? " op-slot-almoco" : ""}`); bloqueado.title = mensagem; celula.append(bloqueado);
            } else {
                // O próprio evento já identifica a ocupação; evita um segundo
                // bloco repetitivo abaixo da aula, sem liberar outro agendamento.
                celula.title = motivo || "Recursos ocupados neste intervalo";
            }
            linha.append(celula); secao.append(linha);
        }
        return secao;
    }
    function calendarioMensal() {
        const grid = el("div", undefined, "op-month-grid");
        for (const nome of ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]) grid.append(el("span", nome, "op-month-weekday"));
        for (const d of datasDoMes(data)) {
            const aulas = aulasData(d), especial = feriadosBrasileiros(Number(d.slice(0, 4))).find(f => f.data === d), fechado = motivoFechamento(d);
            const dia = botao("", () => { data = d; modo = "dia"; renderizar(); }, "op-month-day"); dia.dataset.agendaDia = d;
            dia.classList.toggle("op-outside", d.slice(0, 7) !== data.slice(0, 7)); dia.classList.toggle("op-closed", !!fechado); dia.classList.toggle("op-selected", d === data); dia.classList.toggle("op-holiday", !!especial && especial.tipo !== "facultativo"); dia.classList.toggle("op-facultativo", especial?.tipo === "facultativo");
            dia.setAttribute("aria-pressed", String(d === data));
            dia.setAttribute("aria-label", `${formatarData(d)}, ${especial ? `${especial.nome} · ${especial.tipo}` : fechado || "unidade aberta"}, ${aulas.length} aula(s). Consultar dia`);
            if (d === hojeBrasil()) dia.setAttribute("aria-current", "date");
            dia.append(el("strong", String(Number(d.slice(8)))));
            if (especial || fechado) dia.append(el("span", especial ? `${especial.nome}${especial.tipo === "facultativo" ? " · facultativo" : ""}` : "Domingo fechado", "op-month-special"));
            dia.append(el("span", `${aulas.length} aula(s)`, "op-month-count"));
            aulas.slice(0, 2).forEach(a => dia.append(el("span", `${a.inicio} · ${obterEstado().alunos.find(al => al.id === a.alunoId)?.nome || "Aluno"}`, "op-month-event")));
            grid.append(dia);
        }
        return grid;
    }
    function renderizar() {
        dataInput.value = data;
        for (const b of modos.children) b.setAttribute("aria-pressed", String(b.dataset.agendaModo === modo));
        resumoFiltros.textContent = `Filtros da agenda${Object.values(filtros).some(Boolean) ? ` · ${Object.values(filtros).filter(Boolean).length} ativo(s)` : ""}`;
        const primeiro = somarDias(data, -((diaSemana(data) + 6) % 7));
        periodo.textContent = modo === "dia" ? dataPorExtenso(data) : modo === "semana" ? `${formatarData(primeiro)} — ${formatarData(somarDias(primeiro, 6))}` : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`));
        conteudo.replaceChildren(); conteudo.dataset.agendaVista = modo;
        if (modo === "mes") conteudo.append(calendarioMensal());
        else if (modo === "semana") {
            const semana = el("div", undefined, "op-week-grid");
            for (let i = 0; i < 7; i++) semana.append(gradeDoDia(somarDias(primeiro, i))); conteudo.append(semana);
        } else conteudo.append(gradeDoDia(data));
    }
    renderizar(); return {
        atualizar: renderizar,
        abrirDia(d, hora) { data = d; modo = "dia"; renderizar(); if (hora) aoAgendar?.(d, hora); },
        confirmar(texto) { feedback.textContent = texto; feedback.hidden = false; }
    };
}
