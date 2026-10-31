import { hojeBrasil, somarDias, diaSemana } from "../../shared/js/calendario.js";
import { motivoFechamento } from "../../shared/js/disponibilidade.js";
export function criarAluno(dados, id) {
    return { ...dados, id, unidade: "Centro", aulas: 10, financeiro: "Pendente", acesso: "Não solicitado", observacoes: "", historico: [],
        exames: Object.fromEntries(["teorica", "psicotecnico", "toxicologico", "vista"].map(tipo => [tipo,
            { status: tipo === "toxicologico" ? "Não se aplica" : "Pendente", data: "", observacoes: "", atualizadoEm: "" }])) };
}
export function criarDadosDemo() {
    const alunos = ["Um", "Dois", "Três"].map((nome, i) => criarAluno({ nome: `Aluno Exemplo ${nome}`, cpf: `0000000000${i + 1}`, email: `aluno${i + 1}@example.invalid`, telefone: `(00) 00000-000${i + 1}`, categoria: ["B", "A", "AB"][i] }, `demo-${i + 1}`));
    alunos[1].financeiro = "Regular";
    for (const e of Object.values(alunos[1].exames)) if (e.status !== "Não se aplica") e.status = "Aprovado";
    alunos[2].exames.teorica.status = "Aprovado";
    const recursos = [
        { id: "v1", tipo: "Veículos", nome: "Carro de demonstração 01", descricao: "DEMO-01 · Categoria B", categoria: "B" },
        { id: "v2", tipo: "Veículos", nome: "Moto de demonstração 01", descricao: "DEMO-02 · Categoria A", categoria: "A" },
        { id: "i1", tipo: "Instrutores", nome: "Instrutor Exemplo Um", descricao: "Categorias A e B", categorias: ["A", "B"] },
        { id: "i2", tipo: "Instrutores", nome: "Instrutora Exemplo Dois", descricao: "Categorias A e B", categorias: ["A", "B"] },
        { id: "e1", tipo: "Equipamentos", nome: "Simulador de exemplo", descricao: "Recurso fictício" }
    ].map(r => ({ ...r, unidade: "Centro", ativo: true }));
    const datas = []; let data = hojeBrasil();
    while (datas.length < 4) { if (!motivoFechamento(data)) datas.push(data); data = somarDias(data, 1); }
    const aulas = datas.map((d, i) => {
        const tarde = i % 2 && diaSemana(d) !== 6;
        return { id: `a${i}`, unidade: "Centro", data: d, inicio: tarde ? "14:00" : "09:00", fim: tarde ? "15:00" : "10:00", categoria: "A", alunoId: "demo-2", veiculoId: "v2", instrutorId: i % 2 ? "i2" : "i1", status: i === 2 ? 3 : 1 };
    });
    return { versao: 2, alunos, recursos, aulas };
}
