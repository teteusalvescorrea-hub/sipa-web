import test from "node:test";
import assert from "node:assert/strict";
import { criarDadosDemo } from "../dev/operador/dadosDemo.js";
import { consultarVisaoGeral, horariosLivres, formatarCpf } from "../nivel-1-operador/js/consultasOperador.js";
import { criarAgendamentoDemo, validarAgendamentoDemo } from "../dev/operador/agendamentosDemo.js";
import { agoraBrasil } from "../shared/js/calendario.js";
import { conflito } from "../shared/js/disponibilidade.js";
import { repositorioDemo } from "../dev/operador/repositorioDemo.js";
const url = "http://localhost:5500/operador-cfc.html?demo=1", agora = "2030-01-07T06:00:00";
const dados = { data: "2030-01-07", inicio: "07:00", alunoId: "demo-2", instrutorId: "i1", veiculoId: "v2", categoria: "A" };
function inicial() { const estado = criarDadosDemo(); estado.aulas = [];for(const r of estado.recursos.filter(r=>r.tipo==="Instrutores"))r.horarioAlmoco="11-12"; return estado; }
function aula(id, data, inicio = "09:00") { return { ...dados, id, data, inicio, fim: `${String(Number(inicio.slice(0, 2)) + 1).padStart(2, "0")}:00`, unidade: "Centro", status: 1 }; }

test("nove grupos: somente unidade atual, pendências aplicáveis e recursos ativos", () => {
    const estado = inicial(); estado.alunos.push({ ...estado.alunos[1], id: "outro", unidade: "Outra" });
    estado.recursos.push({ ...estado.recursos[0], id: "manutencao", disponivel: false }, { ...estado.recursos[0], id: "inativo", ativo: false }, { ...estado.recursos[0], id: "outra", unidade: "Outra" });
    const { grupos } = consultarVisaoGeral(estado, agora);
    assert.equal(Object.keys(grupos).length, 9); assert.equal(grupos.alunos.length, 3); assert.equal(grupos.financeiro.length, 2);
    assert.equal(grupos.exames.length, 2); assert.equal(grupos.aptos.length, 1); assert.equal(grupos.veiculos.length, 2); assert.equal(grupos.instrutores.length, 2);
    assert.equal(grupos.livres.length, 10); assert.equal(grupos.aptos[0].id, "demo-2"); assert.equal(formatarCpf("00000000001"), "000.000.000-01");
    estado.alunos[1].exames.toxicologico.status = "Pendente";
    assert.equal(consultarVisaoGeral(estado, agora).grupos.aptos.length, 0);
});
test("sete dias incluem hoje e seis seguintes; próximas aulas excluem passado, canceladas e realizadas", () => {
    const estado = inicial(); estado.aulas = [aula("ontem", "2030-01-06"), aula("hoje-passada", "2030-01-07", "07:00"), aula("hoje", "2030-01-07", "14:00"), aula("limite", "2030-01-13"), aula("fora", "2030-01-14"), { ...aula("cancelada", "2030-01-08"), status: 2 }, { ...aula("realizada", "2030-01-08"), status: 5 }];
    const snapshot = consultarVisaoGeral(estado, "2030-01-07T10:00:00");
    assert.deepEqual(snapshot.grupos.hoje.map(a => a.id), ["hoje-passada", "hoje"]);
    assert.deepEqual(snapshot.grupos.semana.map(a => a.id), ["hoje-passada", "hoje", "realizada", "limite"]);
    assert.deepEqual(snapshot.proximas.map(a => a.id), ["hoje", "limite", "fora"]);
    assert.equal(agoraBrasil(new Date("2030-01-08T01:00:00Z")), "2030-01-07T22:00:00");
});
test("criação atômica: novo estado, saldo decrementado uma vez, original preservado e indicadores sincronizados", () => {
    const estado = inicial(), novo = criarAgendamentoDemo(estado, dados, url, agora, "nova");
    assert.equal(estado.aulas.length, 0); assert.equal(estado.alunos[1].aulas, 10);
    assert.equal(novo.aulas.length, 1); assert.equal(novo.aulas[0].fim, "07:50"); assert.equal(novo.aulas[0].status, 1); assert.equal(novo.alunos[1].aulas, 9);
    const snapshot = consultarVisaoGeral(novo, agora); assert.equal(snapshot.grupos.hoje.length, 1); assert.equal(snapshot.grupos.semana.length, 1); assert.equal(snapshot.proximas.length, 1);
    assert.throws(() => criarAgendamentoDemo(novo, dados, url, agora, "duplicada"), /Conflito/);
    assert.equal(novo.aulas.length, 1); assert.equal(novo.alunos[1].aulas, 9);
});
test("disponibilidade distingue categoria e não oferece veículo/instrutor ocupado", () => {
    const estado = inicial(); estado.aulas = [aula("ocupada", dados.data, dados.inicio)];
    const horario = horariosLivres(estado, dados.data, {}, agora).find(h => h.inicio === "07:00");
    assert.deepEqual(horario.pares, [{ categoria: "B", instrutorId: "i2", veiculoId: "v1" }]);
    assert.deepEqual(horariosLivres(estado, dados.data, { categoria: "A" }, agora).map(h => h.inicio).includes("07:00"), false);
    assert.equal(horariosLivres(estado, dados.data, {}, "2030-01-07T18:00:00").length, 0);
    assert.equal(consultarVisaoGeral(estado, agora).grupos.livres.length, 10, "um horário ainda tem outro par livre");
    estado.aulas.push({ ...aula("ocupada2", dados.data, dados.inicio), instrutorId: "i2", veiculoId: "v1" });
    assert.equal(consultarVisaoGeral(estado, agora).grupos.livres.length, 9);
});
for (const [nome, mudar, mensagem] of [
    ["sem aluno", d => ({ ...d, alunoId: "" }), /aluno/], ["sem instrutor", d => ({ ...d, instrutorId: "" }), /instrutor/],
    ["sem veículo", d => ({ ...d, veiculoId: "" }), /veículo/], ["categoria incompatível", d => ({ ...d, categoria: "B" }), /Categoria/],
    ["data inválida", d => ({ ...d, data: "2030-99-99" }), /Data inválida/], ["hora fracionada", d => ({ ...d, inicio: "07:30" }), /hora inteira/],
    ["bloqueio 11h", d => ({ ...d, inicio: "11:00" }), /indisponíveis|bloqueado/], ["bloqueio 12h", d => ({ ...d, inicio: "12:00" }), /bloqueado|indispon/],
    ["domingo", d => ({ ...d, data: "2030-01-13" }), /Domingo/], ["sábado à tarde", d => ({ ...d, data: "2030-01-12", inicio: "14:00" }), /expediente/],
    ["feriado 2026", d => ({ ...d, data: "2026-12-25" }), /Natal/], ["feriado 2027", d => ({ ...d, data: "2027-11-20" }), /Consciência/],
    ["feriado 2028", d => ({ ...d, data: "2028-09-07" }), /Independência/]
]) test(`validação bloqueia ${nome} sem mutação`, () => {
    const estado = inicial(), antes = JSON.stringify(estado); assert.throws(() => criarAgendamentoDemo(estado, mudar(dados), url, agora), mensagem); assert.equal(JSON.stringify(estado), antes);
});
test("saldo, financeiro, exames, recursos inativos e unidade são revalidados na confirmação", () => {
    for (const alterar of [s => { s.alunos[1].aulas = 0; }, s => { s.alunos[1].financeiro = "Pendente"; }, s => { s.alunos[1].exames.vista.status = "Agendado"; }]) {
        const s = inicial(); alterar(s); assert.match(validarAgendamentoDemo(s, dados, agora), /inelegível/);
    }
    const estado = inicial(); estado.recursos.find(r => r.id === "v2").unidade = "Outra";
    assert.match(validarAgendamentoDemo(estado, dados, agora), /veículo da unidade/);
    estado.recursos.find(r => r.id === "v2").unidade = "Centro"; estado.recursos.find(r => r.id === "v2").ativo = false;
    assert.match(validarAgendamentoDemo(estado, dados, agora), /indisponíveis/);
    estado.alunos[1].unidade = "Outra"; assert.match(validarAgendamentoDemo(estado, dados, agora), /aluno da unidade/);
});
test("aluno ocupado, recurso com sobreposição parcial e cliques repetidos são bloqueados", () => {
    const s = inicial(); s.aulas.push({ ...aula("aluno-ocupado", dados.data, dados.inicio), instrutorId: "i2", veiculoId: "v1", status: 4 });
    assert.match(validarAgendamentoDemo(s, dados, agora), /aluno já possui/);
    assert.equal(conflito([{ ...aula("parcial", dados.data), inicio: "07:30", fim: "08:30" }], { ...dados, fim: "08:00" }), true);
    const novo = criarAgendamentoDemo(inicial(), { ...dados, inicio: "18:00" }, url, agora); assert.equal(novo.aulas[0].fim, "18:50");
    assert.throws(() => criarAgendamentoDemo(inicial(), dados, url, "2030-01-07T07:00:00"), /passado/);
});
test("operação local não ativa em produção; persiste na chave existente sem alterar outras", () => {
    assert.throws(() => criarAgendamentoDemo(inicial(), dados, "https://sipa.example/?demo=1", agora), /local explícita/);
    const mapa = new Map([["sipa.token", "preservado"]]); const repo = repositorioDemo(url, { getItem: k => mapa.get(k), setItem: (k, v) => mapa.set(k, v), removeItem: k => mapa.delete(k) });
    const novo = criarAgendamentoDemo(inicial(), dados, url, agora); assert.equal(repo.salvar(novo), true); assert.equal(repo.carregar().aulas.length, 1); assert.equal(repo.carregar().alunos[1].aulas, 9);
    assert.equal(mapa.get("sipa.token"), "preservado");
});
