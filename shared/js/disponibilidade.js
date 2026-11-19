import { dataValida, diaSemana, feriadosBrasileiros, agoraBrasil } from "./calendario.js";
import {motivoAlmoco} from './categorias.js';
// Regra compartilhada local. O backend deverá validar o mesmo contrato na integração.
export const DURACAO_AULA = 50;
export const STATUS_AGENDAMENTO = Object.freeze({ 1: "Confirmada", 2: "Cancelada", 3: "Aguardando aceite", 4: "Recusada", 5: "Realizada", 6: "Falta" });
export const ocupaRecurso = aula => [1, 3, 5, 6].includes(aula.status);
export const GRADE_CENTRO = Object.freeze({
    semana: [7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18], sabado: [7, 8, 9, 10, 11],
    fechaManha: 12, fechaTarde: 19, paixaoFechada: true, feriadosLocais: [], excecoes: {}
});
// Dias que o Master bloqueou em todas as unidades, lidos da API pela equipe.
let diasBloqueados = new Set();
export function definirDiasBloqueados(datas = []) { diasBloqueados = new Set(datas); }
// 11/11/2026: o dia fechado (true) ou aberto (false) numa unidade só, lido da API (agenda/excecoes-unidades).
let excecoesUnidades = new Map();
export function definirExcecoesUnidades(lista = []) { excecoesUnidades = new Map(lista.map(e => [e.unidade + "|" + e.data, e.fechada === true])); motivosExcecoes = new Map(lista.filter(e => e.fechada === true).map(e => [e.unidade + "|" + e.data, String(e.justificativa || "").trim()])); }
// 16/11/2026 (pedido do usuário): o "Dia sem aula" da agenda mostra o motivo informado no dia fechado.
let motivosExcecoes = new Map();
export function diasSemAula(unidade) { return [...motivosExcecoes.entries()].filter(([k]) => !unidade || k.startsWith(unidade + "|")).map(([k, motivo]) => { const [u, data] = k.split("|"); return { unidade: u, data, motivo }; }).sort((a, b) => a.data.localeCompare(b.data)); }
export function motivoFechamento(data, grade = GRADE_CENTRO, unidade) {
    if (!dataValida(data)) return "Data inválida";
    if (diasBloqueados.has(data)) return "Dia bloqueado pela administração";
    const daUnidade = unidade ? excecoesUnidades.get(unidade + "|" + data) : undefined;
    if (daUnidade === true) { const motivo = motivosExcecoes.get(unidade + "|" + data); return motivo ? "Sem aula · " + motivo : "Sem aula neste dia"; }
    if (daUnidade === false) return "";
    const feriado = [...feriadosBrasileiros(Number(data.slice(0, 4))), ...grade.feriadosLocais].find(f => f.data === data &&
        (f.tipo === "nacional" || f.tipo === "local" || (f.tipo === "religioso" && grade.paixaoFechada)));
    if (grade.excecoes[data] === "aberto") return "";
    if (grade.excecoes[data] === "fechado") return "Fechamento excepcional da unidade";
    if (feriado) return feriado.nome;
    return diaSemana(data) === 0 ? "Domingo · sem expediente" : "";
}
export function horariosDaCategoria(data,categoria,grade=GRADE_CENTRO){
    return diaSemana(data)===6&&categoria!=='D'?grade.sabado:grade.semana;
}
export function validarHorario(data, hora, grade = GRADE_CENTRO, instrutor, categoria, unidade) {
    const fechado = motivoFechamento(data, grade, unidade); if (fechado) return fechado;
    if (!/^\d{2}:00$/.test(hora)) return "Aulas de 50 minutos, com início em hora inteira";
    const h = Number(hora.slice(0, 2)), sabado = diaSemana(data) === 6;
    if (!horariosDaCategoria(data,categoria,grade).includes(h)) return "Fora do expediente";
    // Sábado de meio período (carro e moto, 7h às 11h) não tem intervalo de almoço; o ônibus faz o dia inteiro e mantém.
    if(instrutor&&!(sabado&&categoria!=='D')){const almoço=motivoAlmoco(instrutor,hora);if(almoço)return almoço;}
    const fechamento = sabado && categoria!=='D' ? grade.fechaManha : grade.fechaTarde;
    return h * 60 + DURACAO_AULA > fechamento * 60 ? "A duração ultrapassa o expediente" : "";
}
// 16/11/2026 (pedido do usuário): na moto, o instrutor dá aula em duas motos ao mesmo tempo, um aluno em cada (como a
// API, OcupacaoDoInstrutorHelper). Na moto, ele só conflita com aula de outra categoria ou quando já tem as duas de moto.
// O veículo continua com uma aula por horário. Sem a categoria no candidato, qualquer aula do instrutor conflita.
export const AULAS_DE_MOTO_NO_MESMO_HORARIO = 2;
export function conflito(aulas, candidato) {
    const minuto = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
    const noHorario = aulas.filter(a => (!candidato.id || a.id !== candidato.id) && a.data === candidato.data && ocupaRecurso(a)
        && minuto(a.inicio) < minuto(candidato.fim) && minuto(candidato.inicio) < minuto(a.fim));
    if (noHorario.some(a => a.veiculoId === candidato.veiculoId)) return true;
    const doInstrutor = noHorario.filter(a => a.instrutorId === candidato.instrutorId);
    // A mesma aula pode vir nas aulas e nas ocupações da tela: na moto, conta cada moto uma vez só.
    const motos = new Set(doInstrutor.map((a, n) => a.veiculoId || 'sem-veiculo-' + n));
    return candidato.categoria === 'A'
        ? doInstrutor.some(a => a.categoria !== 'A') || motos.size >= AULAS_DE_MOTO_NO_MESMO_HORARIO
        : doInstrutor.length > 0;
}
export const fimDaAula = inicio => {
    const minutos = Number(inicio.slice(0, 2)) * 60 + Number(inicio.slice(3, 5)) + DURACAO_AULA;
    return `${String(Math.floor(minutos / 60)).padStart(2, "0")}:${String(minutos % 60).padStart(2, "0")}`;
};
export const recursoAtivo = recurso => recurso.ativo === true && recurso.disponivel !== false;
export function motivoNovoAgendamento(data, inicio, agora = agoraBrasil(), categoria, unidade) {
    return validarHorario(data, inicio, GRADE_CENTRO, undefined, categoria, unidade) || (`${data}T${inicio}:00` <= agora ? "Horário passado · novos agendamentos indisponíveis" : "");
}
export function paresDisponiveis(estado, data, inicio, filtros = {}) {
    if (validarHorario(data, inicio)) return [];
    const instrutores = estado.recursos.filter(r => r.unidade === "Centro" && r.tipo === "Instrutores" && recursoAtivo(r) && (!filtros.instrutorId || filtros.instrutorId === r.id));
    const veiculos = estado.recursos.filter(r => r.unidade === "Centro" && r.tipo === "Veículos" && recursoAtivo(r) && (!filtros.veiculoId || filtros.veiculoId === r.id));
    return instrutores.filter(i=>!motivoAlmoco(i,inicio)).flatMap(i => veiculos.filter(v => i.categorias.includes(v.categoria) && (!filtros.categoria || filtros.categoria === v.categoria)
        && !conflito(estado.aulas, { data, inicio, fim: fimDaAula(inicio), instrutorId: i.id, veiculoId: v.id, categoria: v.categoria }))
        .map(v => ({ instrutorId: i.id, veiculoId: v.id, categoria: v.categoria })));
}
