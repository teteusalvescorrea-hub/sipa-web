import { agoraBrasil, somarDias } from "../../shared/js/calendario.js";
import { apto, pendencias } from "./exames.js";
import { ocupaRecurso, paresDisponiveis, motivoNovoAgendamento, recursoAtivo } from "../../shared/js/disponibilidade.js";
export const ordenarAulas = aulas => [...aulas].sort((a, b) => `${a.data}T${a.inicio}`.localeCompare(`${b.data}T${b.inicio}`));
export {formatarCpf} from '../../shared/js/formatacao.js';
export function horariosLivres(estado, data, filtros = {}, agora = agoraBrasil()) {
    return Array.from({ length: 12 }, (_, i) => `${String(i + 7).padStart(2, "0")}:00`)
        .filter(inicio => !motivoNovoAgendamento(data, inicio, agora))
        .map(inicio => ({ data, inicio, pares: paresDisponiveis(estado, data, inicio, filtros) })).filter(h => h.pares.length);
}
// Cada indicador e seu detalhamento usam exatamente o mesmo array. Filtros de
// navegação nunca alteram estes totais. Sete dias = hoje + seis dias seguintes.
export function consultarVisaoGeral(estado, agora = agoraBrasil()) {
    const hoje = agora.slice(0, 10), fim = somarDias(hoje, 6);
    const alunos = estado.alunos.filter(a => a.unidade === "Centro"), recursos = estado.recursos.filter(r => r.unidade === "Centro");
    const aulas = ordenarAulas(estado.aulas.filter(a => a.unidade === "Centro" && ocupaRecurso(a)));
    return {
        hoje, fim,
        grupos: {
            alunos, financeiro: alunos.filter(a => a.financeiro !== "Regular"), exames: alunos.filter(a => pendencias(a).length), aptos: alunos.filter(apto),
            hoje: aulas.filter(a => a.data === hoje), semana: aulas.filter(a => a.data >= hoje && a.data <= fim),
            veiculos: recursos.filter(r => r.tipo === "Veículos" && recursoAtivo(r)), instrutores: recursos.filter(r => r.tipo === "Instrutores" && recursoAtivo(r)),
            livres: horariosLivres(estado, hoje, {}, agora)
        },
        proximas: aulas.filter(a => [1, 3].includes(a.status) && `${a.data}T${a.inicio}:00` > agora)
    };
}
