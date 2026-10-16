import { dataValida } from "./calendario.js";
export const TIPOS_EXAME = Object.freeze({ teorica: "Prova teórica", psicotecnico: "Exame psicotécnico", toxicologico: "Exame toxicológico", vista: "Vista / aptidão física" });
export const STATUS_EXAME = Object.freeze(["Pendente", "Aprovado", "Reprovado", "Agendado", "Não se aplica"]);
export const concluido = exame => ["Aprovado", "Não se aplica"].includes(exame.status);
export const pendencias = aluno => Object.keys(TIPOS_EXAME).filter(tipo => !concluido(aluno.exames[tipo]));
export const apto = aluno => aluno.financeiro === "Regular" && !pendencias(aluno).length && aluno.aulas > 0;
export function atualizarExame(aluno, tipo, dados, agora = new Date().toISOString()) {
    if (!Object.hasOwn(TIPOS_EXAME, tipo) || !STATUS_EXAME.includes(dados.status)) throw new Error("Exame ou situação inválida.");
    if (dados.data && !dataValida(dados.data)) throw new Error("Data inválida.");
    const anterior = aluno.exames[tipo];
    const exame = { status: dados.status, data: dados.data || "", observacoes: String(dados.observacoes || "").slice(0, 1000), atualizadoEm: agora };
    return { ...aluno, exames: { ...aluno.exames, [tipo]: exame }, historico: [...aluno.historico,
        { tipo, antes: anterior.status, depois: exame.status, em: agora, data: exame.data, observacoes: exame.observacoes }].slice(-200) };
}
