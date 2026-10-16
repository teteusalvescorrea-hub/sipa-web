// Somente estrutura de interface, sem dados, permissões, persistência ou API.
// Em ambiente real só integrar após autorização do operador/unidade no servidor.
// A demonstração local injeta callbacks próprios e nunca utiliza a sessão real.

const SECOES = Object.freeze({
    "visao-geral": ["Visão geral", "Visão geral da unidade", "Acompanhe os alunos e organize as etapas do atendimento."],
    alunos: ["Alunos", "Cadastro e consulta de alunos", "Encontre informações e acompanhe o atendimento de cada aluno."],
    agenda: ["Agenda da Unidade", "Agenda da Unidade", "Consulte as aulas e a disponibilidade dos recursos da unidade."],
    verificacoes: ["Verificações", "Verificações do aluno", "Situação financeira, prova teórica e exames em um só lugar."],
    acessos: ["Gestão de acessos", "Gestão de acessos", "Libere acessos conforme as permissões concedidas ao seu perfil."],
    recursos: ["Recursos da unidade", "Recursos da unidade", "Veículos, instrutores e equipamentos vinculados à sua unidade."]
});

export function montarEstruturaOperador(raiz, template, { aoSair, aoSelecionarRecurso } = {}) {
    raiz.replaceChildren(template.content.cloneNode(true));
    const $ = (seletor) => raiz.querySelector(seletor);
    const todos = (seletor) => [...raiz.querySelectorAll(seletor)];
    const dialogo = $("[data-op-dialog]");

    function navegar(secao, focar = true) {
        if (!Object.hasOwn(SECOES, secao)) return;

        const [rotulo, titulo, descricao] = SECOES[secao];
        raiz.dataset.opSecao = secao;
        todos("[data-op-panel]").forEach((painel) => {
            painel.hidden = painel.dataset.opPanel !== secao;
        });
        todos("[data-op-nav]").forEach((item) => {
            const ativo = item.dataset.opNav === secao;
            item.classList.toggle("active", ativo);
            if (ativo) item.setAttribute("aria-current", "page");
            else item.removeAttribute("aria-current");
        });
        $("[data-op-breadcrumb]").textContent = rotulo;
        $("[data-op-heading]").textContent = titulo;
        $("[data-op-description]").textContent = descricao;
        if (focar) $("[data-op-heading]").focus();
    }

    todos("[data-op-nav], [data-op-go]").forEach((item) => {
        item.addEventListener("click", (event) => {
            event.preventDefault();
            navegar(item.dataset.opNav || item.dataset.opGo);
        });
    });

    $("[data-op-cadastro]").addEventListener("click", () => dialogo.showModal());
    todos("[data-op-fechar]").forEach((botao) => {
        botao.addEventListener("click", () => dialogo.close());
    });
    // Impede submit implícito/Enter, inclusive se um controle for alterado no DOM.
    dialogo.querySelector("form").addEventListener("submit", (event) => event.preventDefault());

    const abas = todos("[data-op-resource]");
    function selecionarRecurso(aba) {
        abas.forEach((item) => {
            const ativo = item === aba;
            item.setAttribute("aria-selected", String(ativo));
            item.tabIndex = ativo ? 0 : -1;
        });
        $("#op-resource-panel").setAttribute("aria-labelledby", aba.id);
        $("[data-op-resource-heading]").textContent = aba.dataset.opResource === "Todos"
            ? "Recursos aguardando consulta"
            : `${aba.dataset.opResource} aguardando consulta`;
        aoSelecionarRecurso?.(aba.dataset.opResource);
    }
    abas.forEach((aba, indice) => {
        aba.addEventListener("click", () => selecionarRecurso(aba));
        aba.addEventListener("keydown", (event) => {
            let destino;
            if (event.key === "ArrowRight") destino = (indice + 1) % abas.length;
            if (event.key === "ArrowLeft") destino = (indice - 1 + abas.length) % abas.length;
            if (event.key === "Home") destino = 0;
            if (event.key === "End") destino = abas.length - 1;
            if (destino === undefined) return;
            event.preventDefault();
            selecionarRecurso(abas[destino]);
            abas[destino].focus();
        });
    });

    // Sair é a única ação de sessão; não apaga dados locais do atendimento.
    $("[data-op-sair]").addEventListener("click", async () => {
        if (aoSair) {
            aoSair();
            return;
        }
        const { sair } = await import("../../essencial/service/authService.js");
        sair();
    });
    navegar("visao-geral", false);
    return { navegar };
}
