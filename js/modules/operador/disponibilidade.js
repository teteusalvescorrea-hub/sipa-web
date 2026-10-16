import { dataValida, diaSemana, feriadosBrasileiros, agoraBrasil } from "./calendario.js";
// Mesmo contrato de duração/horas inteiras de GradeHorariosHelper (API).
export const DURACAO_AULA = 60;
export const STATUS_AGENDAMENTO = Object.freeze({ 1: "Confirmada", 2: "Cancelada", 3: "Aguardando aceite", 4: "Recusada", 5: "Realizada", 6: "Falta" });
export const ocupaRecurso = aula => [1, 3, 5, 6].includes(aula.status);
export const GRADE_CENTRO = Object.freeze({
    semana: [7, 8, 9, 10, 11, 14, 15, 16, 17, 18], sabado: [7, 8, 9, 10, 11],
    fechaManha: 12, fechaTarde: 19, paixaoFechada: true, feriadosLocais: [], excecoes: {}
});
export function motivoFechamento(data, grade = GRADE_CENTRO) {
    if (!dataValida(data)) return "Data inválida";
    const feriado = [...feriadosBrasileiros(Number(data.slice(0, 4))), ...grade.feriadosLocais].find(f => f.data === data &&
        (f.tipo === "nacional" || f.tipo === "local" || (f.tipo === "religioso" && grade.paixaoFechada)));
    if (grade.excecoes[data] === "aberto") return "";
    if (grade.excecoes[data] === "fechado") return "Fechamento excepcional da unidade";
    if (feriado) return feriado.nome;
    return diaSemana(data) === 0 ? "Domingo · sem expediente" : "";
}
export function validarHorario(data, hora, grade = GRADE_CENTRO) {
    const fechado = motivoFechamento(data, grade); if (fechado) return fechado;
    if (!/^\d{2}:00$/.test(hora)) return "Aulas de 60 minutos, com início em hora inteira";
    const h = Number(hora.slice(0, 2)), sabado = diaSemana(data) === 6;
    if ([12, 13].includes(h) && !sabado) return "Intervalo de almoço · 12h às 14h";
    if (!(sabado ? grade.sabado : grade.semana).includes(h)) return "Fora do expediente";
    const fechamento = sabado || h < 12 ? grade.fechaManha : grade.fechaTarde;
    return h * 60 + DURACAO_AULA > fechamento * 60 ? "A duração ultrapassa o expediente" : "";
}
export function conflito(aulas, candidato) {
    const minuto = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
    return aulas.some(a => (!candidato.id || a.id !== candidato.id) && a.data === candidato.data && ocupaRecurso(a)
        && (a.instrutorId === candidato.instrutorId || a.veiculoId === candidato.veiculoId)
        && minuto(a.inicio) < minuto(candidato.fim) && minuto(candidato.inicio) < minuto(a.fim));
}
export const fimDaAula = inicio => `${String(Number(inicio.slice(0, 2)) + 1).padStart(2, "0")}:00`;
export const recursoAtivo = recurso => recurso.ativo === true && recurso.disponivel !== false;
export function motivoNovoAgendamento(data, inicio, agora = agoraBrasil()) {
    return validarHorario(data, inicio) || (`${data}T${inicio}:00` <= agora ? "Horário passado · novos agendamentos indisponíveis" : "");
}
export function paresDisponiveis(estado, data, inicio, filtros = {}) {
    if (validarHorario(data, inicio)) return [];
    const instrutores = estado.recursos.filter(r => r.unidade === "Centro" && r.tipo === "Instrutores" && recursoAtivo(r) && (!filtros.instrutorId || filtros.instrutorId === r.id));
    const veiculos = estado.recursos.filter(r => r.unidade === "Centro" && r.tipo === "Veículos" && recursoAtivo(r) && (!filtros.veiculoId || filtros.veiculoId === r.id));
    return instrutores.flatMap(i => veiculos.filter(v => i.categorias.includes(v.categoria) && (!filtros.categoria || filtros.categoria === v.categoria)
        && !conflito(estado.aulas, { data, inicio, fim: fimDaAula(inicio), instrutorId: i.id, veiculoId: v.id }))
        .map(v => ({ instrutorId: i.id, veiculoId: v.id, categoria: v.categoria })));
}
