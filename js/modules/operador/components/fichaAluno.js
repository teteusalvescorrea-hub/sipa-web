import { TIPOS_EXAME, STATUS_EXAME, atualizarExame, pendencias, apto } from "../exames.js";
import { formatarData } from "../calendario.js";
import { el, botao, campo, select, entrada, modal } from "./uiOperador.js";

export function criarFichaAluno(raiz, obterAluno, salvarAluno, informar) {
    const dialogo = modal(raiz, "Ficha do aluno", "opFicha");
    const confirmado = el("p", "", "op-demo-feedback"); confirmado.setAttribute("role", "status"); confirmado.setAttribute("aria-live", "polite"); confirmado.hidden = true;
    const corpo = el("div"); dialogo.append(confirmado, corpo);
    function confirmar(texto) { confirmado.textContent = texto; confirmado.hidden = false; informar(texto); }
    function renderizar() {
        const aluno = obterAluno(); corpo.replaceChildren();
        const identidade = el("div", undefined, "op-ficha-identidade");
        identidade.append(el("h3", aluno.nome), el("p", `${aluno.cpf} · Centro · Categoria ${aluno.categoria}`, "op-help"),
            el("p", `${aluno.email || "Sem e-mail"} · ${aluno.telefone || "Sem telefone"}`, "op-help"),
            el("span", `${aluno.aulas} aulas disponíveis · Acesso: ${aluno.acesso}`, "op-badge"));
        corpo.append(identidade);
        const faltam = pendencias(aluno);
        const progresso = el("progress"); progresso.max = 4; progresso.value = 4 - faltam.length; progresso.setAttribute("aria-label", "Etapas de prova e exames concluídas");
        corpo.append(progresso, el("p", apto(aluno) ? "Apto no cenário fictício para realizar aulas." : `Pendências: ${[aluno.financeiro !== "Regular" ? "Financeiro" : "", ...faltam.map(t => TIPOS_EXAME[t]), aluno.aulas === 0 ? "Saldo de aulas" : ""].filter(Boolean).join(", ")}.`, "op-inline-note"));
        const grade = el("div", undefined, "op-exam-grid");
        for (const [tipo, titulo] of Object.entries(TIPOS_EXAME)) {
            const exame = aluno.exames[tipo], form = el("form", undefined, "op-exam-card op-form-fields"); form.dataset.exame = tipo;
            const status = select(STATUS_EXAME, exame.status); status.name = "status";
            const data = entrada("date", exame.data); data.name = "data";
            const notas = el("textarea"); notas.value = exame.observacoes; notas.name = "observacoes"; notas.maxLength = 1000; notas.rows = 2;
            const salvar = el("button", "Salvar este exame", "op-button op-button-primary"); salvar.type = "submit";
            form.append(el("h3", titulo), el("span", exame.status, "op-badge"), campo("Situação", status), campo("Data de realização / aprovação", data), campo("Observações deste exame", notas),
                el("small", `Atualizado: ${exame.atualizadoEm ? new Date(exame.atualizadoEm).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "Sem alteração"}`, "op-help"), salvar);
            form.addEventListener("submit", event => {
                event.preventDefault(); if (!form.reportValidity()) return;
                try {
                    salvarAluno(atualizarExame(obterAluno(), tipo, { status: status.value, data: data.value, observacoes: notas.value }));
                    renderizar(); confirmar(`${titulo}: atualização fictícia salva. Os demais exames foram preservados.`);
                    corpo.querySelector(`[data-exame=${tipo}] select`).focus();
                } catch (erro) { informar(erro.message); }
            });
            grade.append(form);
        }
        corpo.append(grade);
        const notasForm = el("form", undefined, "op-form-fields op-detail"); const notas = el("textarea"); notas.value = aluno.observacoes || ""; notas.maxLength = 2000; notas.rows = 3;
        const salvarNotas = el("button", "Salvar observações administrativas", "op-button op-button-outline"); salvarNotas.type = "submit";
        notasForm.append(campo("Observações administrativas do aluno", notas), salvarNotas);
        notasForm.addEventListener("submit", event => {
            event.preventDefault(); const atual = obterAluno();
            salvarAluno({ ...atual, observacoes: notas.value, historico: [...atual.historico, { tipo: "observacoes", antes: "", depois: "Observações administrativas atualizadas", em: new Date().toISOString(), observacoes: notas.value }].slice(-200) });
            renderizar(); confirmar("Observações fictícias salvas localmente.");
        });
        corpo.append(notasForm, el("h3", "Histórico demonstrativo"));
        const historico = el("ol", undefined, "op-summary-list");
        for (const item of [...aluno.historico].reverse()) {
            historico.append(el("li", `${new Date(item.em).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo" })} · ${TIPOS_EXAME[item.tipo] || "Anotações"}: ${item.antes ? `${item.antes} → ` : ""}${item.depois}${item.data ? ` · Realização: ${formatarData(item.data)}` : ""}${item.observacoes ? ` · ${item.observacoes}` : ""}`));
        }
        if (!aluno.historico.length) historico.append(el("li", "Nenhuma alteração fictícia registrada."));
        corpo.append(historico, el("p", "Somente demonstração local. Estes registros não comprovam aprovação ou consulta oficial ao ICFC.", "op-help"));
    }
    return { abrir() { confirmado.hidden = true; renderizar(); if (!dialogo.open) dialogo.showModal(); }, fechar() { dialogo.close(); } };
}
