import test from "node:test";
import assert from "node:assert/strict";
import { dataValida, feriadosBrasileiros, somarDias, datasDoMes, pascoa } from "../shared/js/calendario.js";
import { atualizarExame, apto, pendencias } from "../nivel-1-operador/js/exames.js";
import { validarHorario, paresDisponiveis, conflito, motivoFechamento, GRADE_CENTRO, ocupaRecurso, STATUS_AGENDAMENTO } from "../shared/js/disponibilidade.js";
import { criarDadosDemo } from "../dev/operador/dadosDemo.js";
import { repositorioDemo, CHAVE_DEMO } from "../dev/operador/repositorioDemo.js";

for (const [ano, p, paixao, carnaval, corpus] of [[2026, "04-05", "04-03", "02-17", "06-04"], [2027, "03-28", "03-26", "02-09", "05-27"], [2028, "04-16", "04-14", "02-29", "06-15"]]) {
    test(`feriados ${ano}: nacionais fixos, Paixão e facultativos móveis`, () => {
        const feriados = feriadosBrasileiros(ano);
        assert.equal(pascoa(ano), `${ano}-${p}`);
        assert.equal(feriados.filter(f => f.tipo === "nacional").length, 9);
        for (const mesdia of ["01-01", "04-21", "05-01", "09-07", "10-12", "11-02", "11-15", "11-20", "12-25"]) {
            assert.equal(feriados.find(f => f.data === `${ano}-${mesdia}`)?.tipo, "nacional");
            assert.ok(motivoFechamento(`${ano}-${mesdia}`));
        }
        assert.equal(feriados.find(f => f.data === `${ano}-${paixao}`)?.tipo, "religioso");
        for (const mesdia of [carnaval, corpus]) {
            assert.equal(feriados.find(f => f.data === `${ano}-${mesdia}`)?.tipo, "facultativo");
            assert.equal(motivoFechamento(`${ano}-${mesdia}`), "");
        }
    });
}
test("datas civis, ano bissexto, virada do mês/ano e calendários não dependem do fuso", () => {
    assert.equal(dataValida("2028-02-29"), true); assert.equal(dataValida("2027-02-29"), false);
    assert.equal(dataValida("2026-99-99"), false); assert.equal(dataValida("2026-02-31"), false);
    assert.equal(somarDias("2028-02-28", 1), "2028-02-29"); assert.equal(somarDias("2028-12-31", 1), "2029-01-01");
    assert.equal(datasDoMes("2028-02-29").length, 42);
    assert.equal(feriadosBrasileiros(2035).filter(f => f.tipo === "nacional").length, 9);
});
test("grade: segunda a sexta, almoço, sábado, domingo e duração até fechamento", () => {
    for (let h = 0; h < 24; h++) {
        const hora = `${String(h).padStart(2, "0")}:00`;
        assert.equal(validarHorario("2026-10-19", hora) === "", GRADE_CENTRO.semana.includes(h), hora);
        assert.equal(validarHorario("2026-10-17", hora) === "", GRADE_CENTRO.sabado.includes(h), hora);
        assert.ok(validarHorario("2026-10-18", hora));
    }
    assert.match(validarHorario("2026-10-19", "11:00",GRADE_CENTRO,{horarioAlmoco:"11-12"}), /almoço|bloqueado/);
    assert.ok(validarHorario("2026-10-19", "07:30"));
    assert.match(validarHorario("2026-10-19", "18:00", { ...GRADE_CENTRO, fechaTarde: 18.5 }), /duração/);
    assert.ok(validarHorario("2026-12-25", "09:00"));
});
test("configuração prepara feriado local e exceção autorizada sem alterar feriados nacionais", () => {
    const g = { ...GRADE_CENTRO, feriadosLocais: [{ data: "2026-10-19", nome: "Feriado municipal fictício", tipo: "local" }], excecoes: {} };
    assert.match(motivoFechamento("2026-10-19", g), /municipal/);
    assert.equal(motivoFechamento("2026-10-19", { ...g, excecoes: { "2026-10-19": "aberto" } }), "");
});
test("conflitos: instrutor ou veículo, sobreposição, adjacência, status e dia", () => {
    const aula = { id: "a1", data: "2026-10-19", inicio: "09:00", fim: "10:00", instrutorId: "i1", veiculoId: "v1", status: 1 };
    const base = { ...aula, id: "outra", instrutorId: "i2", veiculoId: "v2" };
    assert.equal(conflito([aula], base), false);
    assert.equal(conflito([aula], { ...base, instrutorId: "i1" }), true);
    assert.equal(conflito([aula], { ...base, veiculoId: "v1", inicio: "09:30", fim: "10:30" }), true);
    assert.equal(conflito([aula], { ...base, instrutorId: "i1", inicio: "10:00", fim: "11:00" }), false);
    assert.equal(conflito([aula], { ...base, instrutorId: "i1", data: "2026-10-20" }), false);
    for (const status of [1, 2, 3, 4, 5, 6]) {
        assert.equal(ocupaRecurso({ status }), [1, 3, 5, 6].includes(status));
        assert.equal(conflito([{ ...aula, status }], { ...base, instrutorId: "i1" }), [1, 3, 5, 6].includes(status));
    }
    assert.equal(STATUS_AGENDAMENTO[3], "Aguardando aceite");
});
test("disponibilidade respeita filtros, categoria, conflito e unidade", () => {
    const estado = criarDadosDemo(); estado.aulas = [];
    assert.equal(paresDisponiveis(estado, "2026-10-19", "09:00").length, 4);
    assert.equal(paresDisponiveis(estado, "2026-10-19", "09:00", { categoria: "B" }).length, 2);
    estado.recursos.push({ id: "fora", unidade: "Outra", tipo: "Veículos", ativo: true, categoria: "B" });
    assert.equal(paresDisponiveis(estado, "2026-10-19", "09:00", { veiculoId: "fora" }).length, 0);
    estado.aulas.push({ data: "2026-10-19", inicio: "09:00", fim: "10:00", status: 1, instrutorId: "i1", veiculoId: "v1" });
    assert.equal(paresDisponiveis(estado, "2026-10-19", "09:00").length, 1);
    assert.deepEqual(paresDisponiveis(estado, "2026-10-18", "09:00"), []);
});
test("exames independentes, datas, observações, histórico e indicadores de aptidão", () => {
    const original = criarDadosDemo().alunos[1]; assert.equal(apto(original), true);
    const alterado = atualizarExame(original, "psicotecnico", { status: "Reprovado", data: "2026-10-15", observacoes: "Teste local" });
    assert.equal(alterado.exames.vista, original.exames.vista); assert.equal(alterado.exames.teorica, original.exames.teorica);
    assert.equal(original.exames.psicotecnico.status, "Aprovado"); assert.equal(alterado.exames.psicotecnico.status, "Reprovado");
    assert.equal(alterado.historico.length, 1); assert.equal(alterado.historico[0].observacoes, "Teste local");
    assert.equal(apto(alterado), false); assert.deepEqual(pendencias(alterado), ["psicotecnico"]);
    assert.throws(() => atualizarExame(original, "inexistente", { status: "Aprovado" }));
    assert.throws(() => atualizarExame(original, "vista", { status: "oficial" }));
    assert.throws(() => atualizarExame(original, "vista", { status: "Agendado", data: "2026-99-99" }));
});
test("persistência isolada, dados inválidos, reset e bloqueio de produção", () => {
    const mapa = new Map([["sipa.token", "intocado"], ["sipa.API_URL", "intocada"]]), lidas = [];
    const storage = { getItem(k) { lidas.push(k); return mapa.get(k); }, setItem(k, v) { mapa.set(k, v); }, removeItem(k) { mapa.delete(k); } };
    assert.throws(() => repositorioDemo("https://sipa.example/operador-cfc.html?demo=1", storage)); assert.equal(lidas.length, 0);
    const repo = repositorioDemo("http://localhost:5500/operador-cfc.html?demo=1", storage), estado = repo.carregar();
    estado.alunos[0] = atualizarExame(estado.alunos[0], "vista", { status: "Agendado", observacoes: "teste" });
    assert.equal(repo.salvar(estado), true); assert.equal(repo.carregar().alunos[0].exames.vista.status, "Agendado");
    assert.ok(lidas.every(k => k === CHAVE_DEMO)); repo.restaurar(); assert.equal(mapa.has(CHAVE_DEMO), false);
    assert.equal(mapa.get("sipa.token"), "intocado"); assert.equal(mapa.get("sipa.API_URL"), "intocada");
    mapa.set(CHAVE_DEMO, "{invalid"); assert.equal(repo.carregar().alunos.length, 3);
    mapa.set(CHAVE_DEMO, JSON.stringify({ ...estado, alunos: [{ ...estado.alunos[0], unidade: "Outra" }] }));
    assert.equal(repo.carregar().alunos.length, 3);
    const negado = repositorioDemo("http://localhost/?demo=1", { getItem() { throw new Error(); }, setItem() { throw new Error(); } });
    assert.equal(negado.carregar().alunos.length, 3); assert.equal(negado.salvar(estado), false);
});
