// Somente estrutura de interface, sem dados, permissões, persistência ou API.
// Em ambiente real só integrar após autorização do operador/unidade no servidor.
// A demonstração local injeta callbacks próprios e nunca utiliza a sessão real.

const SECOES = Object.freeze({
    "visao-geral": ["Visão geral", "Visão geral da unidade", "Acompanhe os alunos e organize as etapas do atendimento."],
    alunos: ["Alunos", "Cadastro e consulta de alunos", "Encontre informações e acompanhe o atendimento de cada aluno."],
    cadastro: ["Cadastrar aluno", "Cadastrar aluno", "Identificação, contatos e vínculos separados por categoria."],
    instrutores: ["Instrutores", "Instrutores da unidade", "Consulte os profissionais vinculados à sua unidade."],
    perfil: ["Meu perfil", "Meu perfil", "Identidade e permissões do atendimento atual."],
    agenda: ["Agenda da Unidade", "Agenda da Unidade", "Consulte as aulas e a disponibilidade dos recursos da unidade."],
    verificacoes: ["Verificações", "Verificações", "Analise solicitações médicas de cancelamento e encaminhe os atestados para a gerência."],
    recursos: ["Recursos da unidade", "Recursos da unidade", "Veículos, instrutores e equipamentos vinculados à sua unidade."]
});

export function montarEstruturaOperador(raiz, template, { aoSair, aoSelecionarRecurso } = {}) {
    const secoes={...SECOES};
    raiz.replaceChildren(template.content.cloneNode(true));
    const $ = (seletor) => raiz.querySelector(seletor);
    const todos = (seletor) => [...raiz.querySelectorAll(seletor)];
    todos('[data-op-nav=acessos], [data-op-go=acessos], [data-op-panel=acessos]').forEach(n=>n.remove());
    const dialogo = $("[data-op-dialog]");

    function navegar(secao, focar = true) {
        if (!Object.hasOwn(secoes, secao)) return false;

        const [rotulo, titulo, descricao] = secoes[secao];
        raiz.dataset.opSecao = secao;
        $("[data-op-cadastro]").hidden = secao !== "alunos";
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
        const { sair } = await import("../../../shared/js/services/authService.js");
        sair();
    });
    navegar("visao-geral", false);
    return { navegar, registrarSecao(id,titulo,descricao=''){
        secoes[id]=[titulo,titulo,descricao];let painel=$(`[data-op-panel="${id}"]`);
        if(!painel){painel=document.createElement('section');painel.dataset.opPanel=id;painel.hidden=true;$('.op-footer').before(painel);}
        let link=$(`[data-op-nav="${id}"]`);if(!link){link=document.createElement('a');link.className='sipa-sidebar-link';link.href='#'+id;link.dataset.opNav=id;const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS(svg.namespaceURI,'use');use.setAttribute('href','#op-grid');svg.setAttribute('aria-hidden','true');svg.append(use);link.append(svg,document.createTextNode(titulo));$('.sipa-sidebar-menu').append(link);link.onclick=e=>{e.preventDefault();navegar(id);$('.op-sidebar').classList.remove('op-open');$('.op-menu-mobile')?.setAttribute('aria-expanded','false');};}return painel;
    }};
}
