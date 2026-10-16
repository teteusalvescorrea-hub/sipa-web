// Composição exclusivamente local. Não importar serviços HTTP, login ou tokens.
import { montarEstruturaOperador } from "../components/painelOperador.js";
import { demonstracaoSolicitada, enderecoSemDemonstracao } from "./modoDemonstracao.js";
import { repositorioDemo } from "./repositorioDemo.js";
import { criarAluno } from "./dadosDemo.js";
import { apto, pendencias } from "../exames.js";
import { criarAgendamentoDemo } from "./agendamentosDemo.js";
import { criarFichaAluno } from "../components/fichaAluno.js";
import { montarAgenda } from "../components/agendaOperador.js";
import { montarVisaoGeral } from "../components/visaoGeralOperador.js";
import { criarDetalhesAula } from "../components/aulaOperador.js";
import { criarFormularioAgendamento } from "../components/agendamentoOperador.js";
import { el, botao, campo, select, modal } from "../components/uiOperador.js";

export function iniciarDemonstracao(raiz, template, endereco) {
    if (!demonstracaoSolicitada(endereco) || !demonstracaoSolicitada(window.location.href)) throw new Error("Demonstração restrita à ativação local explícita.");
    // Acesso ao storage pode ser negado pelo navegador. Mantém a demonstração em
    // memória nesse caso e avisa que não foi possível persistir.
    let storage; try { storage = window.localStorage; } catch { storage = { getItem() { throw new Error(); }, setItem() { throw new Error(); }, removeItem() {} }; }
    const repo = repositorioDemo(endereco, storage);
    let estado = repo.carregar(), alunoId = estado.alunos[0].id, agenda, dashboard;
    const $ = s => raiz.querySelector(s), todos = s => [...raiz.querySelectorAll(s)];
    const atual = () => estado.alunos.find(a => a.id === alunoId);
    const sair = () => window.location.replace(enderecoSemDemonstracao(window.location.href));
    function recursos(tipo = "Todos") {
        const painel = $("#op-resource-panel"), titulo = el("h3", `${tipo} · Unidade Centro`); titulo.dataset.opResourceHeading = "";
        const lista = el("div", undefined, "op-demo-resources");
        estado.recursos.filter(r => r.unidade === "Centro" && (tipo === "Todos" || r.tipo === tipo)).forEach(r => {
            const card = el("article", undefined, "op-demo-resource");
            card.append(el("small", r.tipo), el("h4", r.nome), el("p", r.descricao), el("small", "Centro · recurso fictício ativo")); lista.append(card);
        }); painel.replaceChildren(titulo, lista);
    }
    const navegacao = montarEstruturaOperador(raiz, template, { aoSair: sair, aoSelecionarRecurso: recursos });
    raiz.hidden = false; raiz.classList.add("op-mode-demo");
    const faixa = el("aside", undefined, "op-demo-banner"); faixa.setAttribute("aria-label", "Demonstração local");
    const aviso = el("div"); aviso.append(el("strong", "DEMONSTRAÇÃO LOCAL · DADOS FICTÍCIOS"), el("p", "Unidade Centro · salvo somente neste navegador · sem API ou ICFC"));
    faixa.append(aviso, botao("Restaurar dados", () => reset.showModal()), botao("Encerrar", sair)); $(".op-main").prepend(faixa);
    const feedback = el("p", repo.aviso || "Use apenas dados fictícios. Alterações salvas localmente; nenhum dado é enviado ao sistema.", "op-demo-feedback"); feedback.setAttribute("role", "status"); feedback.setAttribute("aria-live", "polite");
    feedback.hidden = !repo.aviso;
    if (repo.aviso) feedback.dataset.opFeedbackGlobal = "";
    $(".op-header").after(feedback);
    function informar(texto) { feedback.textContent = texto; feedback.hidden = false; feedback.dataset.opFeedbackSecao = raiz.dataset.opSecao; feedback.classList.add("op-feedback-active"); }
    function salvar() {
        const salvo = repo.salvar(estado); if (!salvo) informar("Armazenamento indisponível: alterações fictícias permanecem somente nesta sessão.");
        return salvo;
    }
    function salvarAluno(aluno) {
        estado.alunos = estado.alunos.map(a => a.id === aluno.id ? aluno : a); const persistiu = salvar(); atualizar();
        if (!persistiu) setTimeout(() => informar("Armazenamento indisponível: alteração mantida apenas nesta sessão."), 0);
    }
    $(".op-operator-label strong").textContent = "Operador fictício";
    $(".op-operator-label small").textContent = "Nível 1 · Demonstração";
    $(".sipa-sidebar-unit-text strong").textContent = "Unidade Centro";
    $(".sipa-sidebar-unit-text small").textContent = "Vínculo fictício";
    $("[data-op-sair]").textContent = "Sair da demonstração";
    $(".sipa-sidebar-logo").href = endereco;
    todos(".op-unit-chip").forEach(n => { n.textContent = "Unidade Centro · fictícia"; });
    $(".op-notice strong").textContent = "Atendimento da unidade Centro";
    $(".op-notice p").textContent = "Explore os alunos, acompanhe as pendências e consulte a agenda. Todos os registros são fictícios.";
    $(".op-notice .op-badge").textContent = "Ambiente local";

    const reset = modal(raiz, "Restaurar demonstração?", "opReset");
    reset.append(el("p", "Isso remove apenas as alterações fictícias deste painel. Sua sessão e as configurações reais serão preservadas.", "op-copy"),
        botao("Manter alterações", () => reset.close()), botao("Restaurar dados iniciais", () => {
            estado = repo.restaurar(); alunoId = estado.alunos[0].id; salvar(); busca.value = ""; Object.values(filtros).forEach(f => { f.value = ""; });
            ficha.fechar(); formularioAgenda.fechar(); atualizar(); recursos(); reset.close(); informar("Dados fictícios restaurados. Nenhuma configuração real foi alterada.");
        }, "op-button op-button-primary"));

    const busca = $(".op-search input"); busca.disabled = false;
    const toolbar = $("[data-op-panel=alunos] .op-toolbar"); $(".op-filter").remove();
    const filtros = {};
    for (const [key, nome, valores] of [["financeiro", "Financeiro", ["Regular", "Pendente", "Em atraso"]], ["exames", "Prova / exames", ["Com pendências", "Concluídos"]], ["categoria", "Categoria", ["A", "B", "AB"]]]) {
        const controle = select([["", "Todos"], ...valores]); controle.dataset.alunoFiltro = key;
        controle.addEventListener("change", listarAlunos); filtros[key] = controle; toolbar.append(campo(nome, controle));
    }
    $("#alunos-pendente").textContent = "Dados fictícios da unidade Centro. CPF, situação e filtros não consultam a API.";
    const tr = $(".op-table thead tr"); tr.replaceChildren(...["Aluno / unidade", "Financeiro", "Prova e exames", "Categoria / aulas", "Acesso", ""].map(t => el("th", t)));
    const ficha = criarFichaAluno(raiz, atual, salvarAluno, informar);
    function listarAlunos() {
        const termo = busca.value.trim().toLocaleLowerCase("pt-BR"), cpf = termo.replace(/\D/g, "");
        const alunos = estado.alunos.filter(a => a.unidade === "Centro" && (!termo || a.nome.toLocaleLowerCase("pt-BR").includes(termo) || (cpf && a.cpf.includes(cpf)))
            && (!filtros.financeiro.value || a.financeiro === filtros.financeiro.value) && (!filtros.categoria.value || a.categoria === filtros.categoria.value)
            && (!filtros.exames.value || (filtros.exames.value === "Concluídos" ? !pendencias(a).length : pendencias(a).length)));
        const tbody = $(".op-table tbody"); tbody.replaceChildren();
        for (const a of alunos) {
            const linha = el("tr"); linha.dataset.demoAluno = a.id;
            const identidade = el("td"); identidade.append(el("strong", a.nome), el("small", `${a.cpf} · Centro`));
            const exames = el("td"); exames.append(el("span", `Teórica: ${a.exames.teorica.status}`, "op-badge"), el("small", `${3 - pendencias(a).filter(t => t !== "teorica").length}/3 exames concluídos`));
            const financeiro = el("td"); financeiro.append(el("span", a.financeiro, `op-badge ${a.financeiro === "Regular" ? "op-status-ok" : "op-status-pending"}`));
            const categoria = el("td"); categoria.append(el("strong", a.categoria), el("small", `${a.aulas} aulas disponíveis`));
            const acao = el("td"); acao.append(botao("Ver detalhes", () => { alunoId = a.id; atualizar(); ficha.abrir(); }));
            linha.append(identidade, financeiro, exames, categoria, el("td", a.acesso), acao); tbody.append(linha);
        }
        if (!alunos.length) { const linha = el("tr"), td = el("td", "Nenhum aluno encontrado para estes filtros.", "op-demo-no-results"); td.colSpan = 6; linha.append(td); tbody.append(linha); }
        $("[data-op-panel=alunos] .op-card-heading .op-badge").textContent = `${alunos.length} aluno(s)`;
    }
    busca.addEventListener("input", listarAlunos);

    const verificacoes = $(".op-verifications"); verificacoes.replaceChildren();
    const seletorAluno = select(estado.alunos.map(a => [a.id, a.nome]), alunoId); seletorAluno.dataset.verificacaoAluno = "";
    $(".op-student-selector").append(campo("Aluno fictício", seletorAluno));
    seletorAluno.addEventListener("change", () => { alunoId = seletorAluno.value; atualizar(); });
    const financeiroCard = el("article", undefined, "op-card"), financeiroValor = el("dd"), dlFinanceiro = el("dl", undefined, "op-fields");
    const itemFinanceiro = el("div"); itemFinanceiro.append(el("dt", "Situação fictícia"), financeiroValor); dlFinanceiro.append(itemFinanceiro);
    const editarFinanceiro = select(["Pendente", "Regular", "Em atraso"]); editarFinanceiro.dataset.financeiroDemo = "";
    financeiroCard.append(el("h2", "Situação financeira · ICFC"), el("span", "Sem integração", "op-badge"), dlFinanceiro, campo("Cenário financeiro", editarFinanceiro), botao("Salvar cenário financeiro", () => {
        salvarAluno({ ...atual(), financeiro: editarFinanceiro.value, historico: [...atual().historico, { tipo: "financeiro", antes: atual().financeiro, depois: editarFinanceiro.value, em: new Date().toISOString() }].slice(-200) });
        informar("Cenário fictício salvo. Nenhuma verificação financeira ou consulta ao ICFC foi realizada.");
    }), el("p", "Somente edição de cenário. A consulta oficial ao ICFC permanece indisponível.", "op-help"));
    verificacoes.append(financeiroCard);
    for (const [titulo, descricao] of [["Prova teórica", "Edite o resultado, a data e as observações de forma independente."], ["Exames necessários", "Psicotécnico, toxicológico e vista / aptidão física têm estados próprios."]]) {
        const card = el("article", undefined, "op-card"); card.append(el("h2", titulo), el("p", descricao), botao("Abrir ficha e editar", () => ficha.abrir()), el("p", "Resultados fictícios, sem aprovação oficial.", "op-help")); verificacoes.append(card);
    }

    const formulario = $("[data-op-dialog] form"), dialogo = $("[data-op-dialog]");
    formulario.querySelector("fieldset").disabled = false; formulario.querySelector("button[type=submit]").disabled = false;
    formulario.querySelector("button[type=submit]").textContent = "Adicionar à demonstração"; formulario.elements.unidade.value = "Centro · fictícia";
    ["nome", "cpf", "email", "categoria"].forEach(n => { formulario.elements[n].required = true; });
    [...formulario.elements.categoria.options].forEach((o, i) => { o.value = i ? ["A", "B", "AB"][i - 1] : ""; });
    formulario.elements.cpf.pattern = "[0-9]{11}"; formulario.elements.cpf.maxLength = 11;
    formulario.elements.cpf.placeholder = "00000000004 (fictício)";
    $("#cadastro-pendente").textContent = "Use somente dados fictícios. Cadastro salvo neste navegador, sem envio à API.";
    formulario.addEventListener("submit", event => {
        event.preventDefault(); if (!formulario.reportValidity()) return;
        const dados = Object.fromEntries(new FormData(formulario)); dados.nome = dados.nome.trim();
        if (!dados.nome || estado.alunos.some(a => a.cpf === dados.cpf)) { informar("Informe um nome e um CPF fictício ainda não cadastrado."); return; }
        const aluno = criarAluno(dados, `demo-${crypto.randomUUID()}`); estado.alunos.push(aluno); alunoId = aluno.id;
        salvar(); formulario.reset(); formulario.elements.unidade.value = "Centro · fictícia"; busca.value = ""; Object.values(filtros).forEach(f => { f.value = ""; });
        atualizar(); dialogo.close(); informar("Aluno fictício adicionado localmente. Nenhum cadastro real foi criado.");
    });

    const acessos = $("[data-op-panel=acessos]"); acessos.querySelector("fieldset").disabled = false;
    const tipos = acessos.querySelector("select"); tipos.replaceChildren(...["Aluno (simulado)", "Instrutor (simulado)"].map(t => el("option", t)));
    const [cpfAcesso, unidadeAcesso] = acessos.querySelectorAll("input"); cpfAcesso.dataset.demoCpf = ""; cpfAcesso.readOnly = true; unidadeAcesso.value = "Centro · fictícia";
    tipos.addEventListener("change", () => { cpfAcesso.value = tipos.selectedIndex === 0 ? atual().cpf : "00000000010"; });
    const emitir = acessos.querySelector(".op-button-primary"); emitir.disabled = false; emitir.textContent = "Simular solicitação de acesso";
    $("#acesso-pendente").textContent = "Fluxo visual: nenhuma senha, convite ou link autenticável será criado.";
    acessos.querySelector(".op-detail .op-card-heading p").textContent = "Demonstração visual, sem autorização real.";
    acessos.querySelector(".op-detail .op-badge").textContent = "Simulação";
    emitir.addEventListener("click", () => {
        if (tipos.selectedIndex === 0) salvarAluno({ ...atual(), acesso: "Solicitação simulada" });
        $("#acesso-pendente").textContent = "Solicitação simulada. Nenhum link, senha provisória ou acesso real foi gerado.";
        informar("Fluxo de acesso simulado; permissões e credenciais reais preservadas.");
    });

    const detalhesAula = criarDetalhesAula(raiz, () => estado);
    const formularioAgenda = criarFormularioAgendamento(raiz, () => estado, dados => {
        estado = criarAgendamentoDemo(estado, dados, window.location.href);
        const persistiu = salvar(); atualizar();
        agenda.confirmar(persistiu ? "Agendamento fictício confirmado e salvo neste navegador." : "Agendamento fictício confirmado apenas nesta sessão; armazenamento indisponível.");
    });
    agenda = montarAgenda(raiz, $("[data-op-panel=agenda]"), () => estado, { aoAgendar: (data, inicio) => formularioAgenda.abrir(data, inicio), detalhesAula });
    dashboard = montarVisaoGeral(raiz, $("[data-op-panel=visao-geral]"), () => estado, {
        verAluno(aluno) { alunoId = aluno.id; atualizar(); ficha.abrir(); },
        verAula: detalhesAula.abrir,
        navegar: navegacao.navegar,
        agendar(data, inicio) { agenda.abrirDia(data); return formularioAgenda.abrir(data, inicio); }
    });
    function atualizar() {
        listarAlunos();
        const aluno = atual();
        const valores = [aluno.nome, `${aluno.cpf} (fictício)`, `${aluno.email} · ${aluno.telefone}`, "Centro · fictícia", aluno.categoria, aluno.acesso];
        [...$("[data-op-panel=alunos] .op-detail").querySelectorAll("dd")].forEach((dd, i) => { dd.textContent = valores[i]; });
        $("[data-op-panel=alunos] .op-detail .op-help").textContent = "Abra Ver detalhes para editar prova, exames e observações individualmente.";
        $("[data-op-panel=alunos] .op-detail .op-badge").textContent = apto(aluno) ? "Apto · fictício" : "Com pendências";
        seletorAluno.replaceChildren(...estado.alunos.map(a => { const o = el("option", a.nome); o.value = a.id; return o; })); seletorAluno.value = alunoId;
        $(".op-student-selector p").textContent = `Aluno selecionado: ${aluno.nome} · Centro`;
        financeiroValor.textContent = `${aluno.financeiro} (simulado)`; editarFinanceiro.value = aluno.financeiro;
        cpfAcesso.value = tipos.selectedIndex === 0 ? aluno.cpf : "00000000010";
        dashboard?.atualizar(); agenda?.atualizar();
    }
    atualizar(); recursos(); document.title = "Operador de CFC · Demonstração local | SIPA";
}
