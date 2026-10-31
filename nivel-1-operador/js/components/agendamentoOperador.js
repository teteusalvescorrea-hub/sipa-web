import { el, botao, campo, select, modal } from "./uiOperador.js";
import { apto } from "../exames.js";
import { formatarData } from "../../../shared/js/calendario.js";
import { fimDaAula, paresDisponiveis, motivoNovoAgendamento } from "../../../shared/js/disponibilidade.js";
import { validarAgendamentoDemo } from "../../../dev/operador/agendamentosDemo.js";

export function criarFormularioAgendamento(raiz, obterEstado, aoConfirmar) {
    const dialogo = modal(raiz, "Novo agendamento", "opAgendar");
    const resumo = el("div", undefined, "op-booking-resumo"), aviso = el("p", "", "op-booking-feedback"); aviso.setAttribute("role", "status"); aviso.hidden = true;
    const form = el("form"), campos = el("fieldset", undefined, "op-form-fields op-form-grid");
    const aluno = select([]), categoria = select([]), instrutor = select([]), veiculo = select([]);
    for (const [nome, controle, rotulo] of [["alunoId", aluno, "Aluno"], ["categoria", categoria, "Categoria"], ["instrutorId", instrutor, "Instrutor disponível"], ["veiculoId", veiculo, "Veículo disponível"]]) {
        controle.name = nome; controle.required = true; campos.append(campo(rotulo, controle));
    }
    const saldo = el("p", "", "op-help"), confirmar = el("button", "Confirmar agendamento", "op-button op-button-primary"); confirmar.type = "submit";
    const acoes = el("div", undefined, "op-dialog-actions"); acoes.append(botao("Voltar", () => dialogo.close()), confirmar);
    form.append(campos, saldo, acoes); dialogo.append(resumo, aviso, form, el("p", "Demonstração local · cria somente uma aula fictícia neste navegador.", "op-help"));
    let selecao;
    function erro(texto) { aviso.textContent = texto; aviso.hidden = !texto; }
    function preencher(controle, opcoes, placeholder, anterior = controle.value) {
        controle.replaceChildren(...[["", placeholder], ...opcoes].map(([id, nome]) => { const o = el("option", nome); o.value = id; return o; }));
        controle.value = opcoes.some(([id]) => id === anterior) ? anterior : "";
    }
    function atualizarVeiculos() {
        const estado = obterEstado(), pares = paresDisponiveis(estado, selecao.data, selecao.inicio, { categoria: categoria.value, instrutorId: instrutor.value });
        const ids = new Set(pares.map(p => p.veiculoId));
        preencher(veiculo, estado.recursos.filter(r => ids.has(r.id)).map(r => [r.id, `${r.nome} · ${r.categoria}`]), instrutor.value ? "Selecione o veículo" : "Selecione primeiro o instrutor");
        veiculo.disabled = !instrutor.value || !categoria.value;
        const alunoAtual = estado.alunos.find(a => a.id === aluno.value);
        saldo.textContent = alunoAtual ? `Saldo: ${alunoAtual.aulas} aula(s) · ${apto(alunoAtual) ? "Apto no cenário fictício" : "Pendências na ficha: agendamento bloqueado"}` : "Selecione um aluno para consultar categoria e saldo.";
    }
    function atualizarInstrutores() {
        const estado = obterEstado(), ids = new Set(paresDisponiveis(estado, selecao.data, selecao.inicio, { categoria: categoria.value }).map(p => p.instrutorId));
        preencher(instrutor, estado.recursos.filter(r => ids.has(r.id)).map(r => [r.id, r.nome]), "Selecione o instrutor");
        instrutor.disabled = !categoria.value; atualizarVeiculos();
    }
    function atualizarCategorias() {
        const estado = obterEstado(), alunoAtual = estado.alunos.find(a => a.id === aluno.value);
        const disponiveis = new Set(paresDisponiveis(estado, selecao.data, selecao.inicio).map(p => p.categoria));
        const categorias = ["A", "B"].filter(c => alunoAtual?.categoria.includes(c) && disponiveis.has(c));
        preencher(categoria, categorias.map(c => [c, c]), "Selecione a categoria");
        if (categorias.length === 1) categoria.value = categorias[0];
        categoria.disabled = !alunoAtual; atualizarInstrutores();
        if (alunoAtual && !apto(alunoAtual)) erro("Aluno com pendências de elegibilidade. Confira financeiro, exames e saldo na ficha antes de agendar.");
        else if (alunoAtual && !categorias.length) erro("Não há recursos livres para a categoria deste aluno neste horário. Escolha outro horário ou aluno.");
    }
    aluno.addEventListener("change", () => { erro(""); atualizarCategorias(); });
    categoria.addEventListener("change", () => { erro(""); atualizarInstrutores(); });
    instrutor.addEventListener("change", () => { erro(""); atualizarVeiculos(); });
    veiculo.addEventListener("change", () => erro(""));
    form.addEventListener("submit", event => {
        event.preventDefault(); if (!form.reportValidity() || !selecao) return;
        const dados = { ...selecao, alunoId: aluno.value, categoria: categoria.value, instrutorId: instrutor.value, veiculoId: veiculo.value };
        const motivo = validarAgendamentoDemo(obterEstado(), dados); if (motivo) { erro(motivo); return; }
        try { aoConfirmar(dados); dialogo.close(); } catch (e) { erro(e.message); }
    });
    return { abrir(data, inicio) {
        const bloqueio = motivoNovoAgendamento(data, inicio);
        if (bloqueio || !paresDisponiveis(obterEstado(), data, inicio).length) return false;
        selecao = { data, inicio };
        resumo.replaceChildren(el("strong", `${formatarData(data)} · ${inicio} às ${fimDaAula(inicio)}`), el("span", "Unidade Centro · Aula de 50 minutos"));
        preencher(aluno, obterEstado().alunos.filter(a => a.unidade === "Centro").map(a => [a.id, `${a.nome}${apto(a) ? "" : " · com pendências"}`]), "Selecione o aluno", "");
        erro(""); atualizarCategorias(); if (!dialogo.open) dialogo.showModal(); return true;
    }, fechar() { dialogo.close(); } };
}
