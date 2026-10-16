import { demonstracaoSolicitada } from "./modoDemonstracao.js";
import { agoraBrasil } from "../calendario.js";
import { apto } from "../exames.js";
import { conflito, fimDaAula, motivoNovoAgendamento, paresDisponiveis } from "../disponibilidade.js";

export function validarAgendamentoDemo(estado, dados, agora = agoraBrasil()) {
    const motivo = motivoNovoAgendamento(dados.data, dados.inicio, agora); if (motivo) return motivo;
    const aluno = estado.alunos.find(a => a.id === dados.alunoId && a.unidade === "Centro");
    if (!aluno) return "Selecione um aluno da unidade Centro.";
    if (!apto(aluno)) return "Aluno inelegível: confira financeiro, provas, exames e saldo de aulas na ficha.";
    const instrutor = estado.recursos.find(r => r.id === dados.instrutorId && r.unidade === "Centro" && r.tipo === "Instrutores");
    const veiculo = estado.recursos.find(r => r.id === dados.veiculoId && r.unidade === "Centro" && r.tipo === "Veículos");
    if (!instrutor) return "Selecione um instrutor da unidade Centro.";
    if (!veiculo) return "Selecione um veículo da unidade Centro.";
    if (!["A", "B"].includes(dados.categoria) || veiculo.categoria !== dados.categoria || !aluno.categoria.includes(dados.categoria) || !instrutor.categorias.includes(dados.categoria)) return "Categoria incompatível com aluno, instrutor ou veículo.";
    if (conflito(estado.aulas, { ...dados, fim: fimDaAula(dados.inicio) })) return "Conflito: instrutor ou veículo já ocupado neste intervalo.";
    // OCUPA_ALUNO da API também inclui Recusada (4).
    const minutos = h => Number(h.slice(0, 2)) * 60 + Number(h.slice(3));
    if (estado.aulas.some(a => a.alunoId === aluno.id && a.data === dados.data && [1, 3, 4, 5, 6].includes(a.status)
        && minutos(a.inicio) < minutos(fimDaAula(dados.inicio)) && minutos(dados.inicio) < minutos(a.fim))) return "O aluno já possui uma aula neste intervalo.";
    if (!paresDisponiveis(estado, dados.data, dados.inicio, dados).some(p => p.instrutorId === dados.instrutorId && p.veiculoId === dados.veiculoId)) return "Recursos indisponíveis para a categoria e o horário selecionados.";
    return "";
}
export function criarAgendamentoDemo(estado, dados, endereco, agora = agoraBrasil(), id = `aula-demo-${globalThis.crypto.randomUUID()}`) {
    if (!demonstracaoSolicitada(endereco) || (typeof window !== "undefined" && !demonstracaoSolicitada(window.location.href))) throw new Error("Operação fictícia restrita à demonstração local explícita.");
    const motivo = validarAgendamentoDemo(estado, dados, agora); if (motivo) throw new Error(motivo);
    const aula = { id, unidade: "Centro", data: dados.data, inicio: dados.inicio, fim: fimDaAula(dados.inicio), categoria: dados.categoria,
        alunoId: dados.alunoId, instrutorId: dados.instrutorId, veiculoId: dados.veiculoId, status: 1 };
    return { ...estado, aulas: [...estado.aulas, aula], alunos: estado.alunos.map(a => a.id === dados.alunoId ? { ...a, aulas: a.aulas - 1 } : a) };
}
