// Teste isolado da apresentação e do acesso fechado. Não usa API, banco,
// contas reais ou o perfil do navegador do usuário. Requer Node com WebSocket
// global e Microsoft Edge instalado; não instala dependências.
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import http from "node:http";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "sipa-operador-ui-"));
const source = await fs.readFile(path.join(root, "operador-cfc.html"), "utf8");
const layout = source.replace("<head>", '<head><base href="/">').replace(
    '<script type="module" src="js/operador-cfc.js"></script>',
    `<script type="module">
        import { montarEstruturaOperador } from '/js/modules/operador/components/painelOperador.js';
        document.getElementById('operador-acesso').hidden = true;
        const root = document.getElementById('operador-conteudo');
        montarEstruturaOperador(root, document.getElementById('operador-template'));
        root.hidden = false;
        window.layoutReady = true;
    </script>`
);

const server = http.createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
        if (pathname === "/__tests__/blank") return res.end("<!doctype html><title>Teste isolado</title>");
        if (pathname === "/__tests__/layout") {
            res.setHeader("Content-Type", "text/html; charset=utf-8");
            return res.end(layout);
        }
        const target = path.resolve(root, `.${pathname}`);
        if (!target.startsWith(root) || pathname.split("/").some(part => part.startsWith("."))) {
            res.writeHead(403).end(); return;
        }
        const mime = { ".html": "text/html", ".css": "text/css", ".js": "text/javascript" };
        if (!mime[path.extname(target)]) { res.writeHead(404).end(); return; }
        res.setHeader("Content-Type", `${mime[path.extname(target)]}; charset=utf-8`);
        res.end(await fs.readFile(target));
    } catch { res.writeHead(404).end(); }
});
await new Promise(resolve => server.listen(0, "127.0.0.1", resolve));
const origin = `http://127.0.0.1:${server.address().port}`;
const profile = path.join(artifacts, "edge-profile");
const executable = process.env.SIPA_TEST_BROWSER || "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe";
const browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
let launchError;
browser.on("error", error => { launchError = error; });
let ws;
const pending = new Map();
let nextId = 0;
const checks = [];
const medidasLayout = [];
const consoleErrors = [];

async function waitFor(fn, label) {
    const deadline = Date.now() + 20000;
    while (Date.now() < deadline) {
        if (launchError) throw launchError;
        const value = await fn();
        if (value) return value;
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Tempo esgotado: ${label}`);
}
function send(method, params = {}) {
    return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timeout });
        ws.send(JSON.stringify({ id, method, params }));
    });
}
async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.text);
    return result.result.value;
}
async function navigate(route, ready) {
    await send("Page.navigate", { url: origin + route });
    await waitFor(async () => {
        try { return await evaluate(`location.pathname + location.search === ${JSON.stringify(route)} && document.readyState === 'complete' && (${ready})`); }
        catch { return false; }
    }, route);
}
async function check(expression, label) {
    assert.equal(await evaluate(expression), true, label);
    checks.push(label);
}
async function screenshot(name) {
    // Aguarda somente a transição visual dos componentes antes da captura.
    await new Promise(resolve => setTimeout(resolve, 300));
    const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false });
    await fs.writeFile(path.join(artifacts, name), Buffer.from(image.data, "base64"));
}

try {
    const debugPort = await waitFor(async () => {
        try { return Number((await fs.readFile(path.join(profile, "DevToolsActivePort"), "utf8")).split("\n")[0]); }
        catch { return false; }
    }, "inicialização do Edge isolado");
    const target = await fetch(`http://127.0.0.1:${debugPort}/json/new?about:blank`, { method: "PUT" }).then(res => res.json());
    ws = new WebSocket(target.webSocketDebuggerUrl);
    await new Promise((resolve, reject) => { ws.addEventListener("open", resolve, { once: true }); ws.addEventListener("error", reject, { once: true }); });
    ws.addEventListener("message", event => {
        const message = JSON.parse(event.data);
        if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.text);
        if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push("console.error");
        const item = pending.get(message.id);
        if (!item) return;
        clearTimeout(item.timeout); pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.testCalls = []; window.testStorageReads = []; const originalGetItem = Storage.prototype.getItem; Storage.prototype.getItem = function(key) { window.testStorageReads.push(key); return originalGetItem.call(this, key); }; window.fetch = (...args) => { window.testCalls.push(String(args[0])); return Promise.reject(new Error('Nenhuma API deve ser chamada neste teste')); };" });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });

    // Payloads artificiais existem somente neste navegador de teste; não há login,
    // assinatura JWT ou sessão de usuário real sendo criada ou alterada.
    const cases = [null, "Aluno", "Autoescola", "Motorista", "PerfilInexistente", "__proto__"];
    for (const role of cases) {
        await navigate("/__tests__/blank", "true");
        const payload = Buffer.from(JSON.stringify({ role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url");
        await evaluate(`sessionStorage.clear(); ${role === null ? "" : `sessionStorage.setItem('sipa.token', 'teste.${payload}.sem-assinatura');`}`);
        await navigate("/operador-cfc.html", "document.getElementById('operador-voltar')");
        await check("!document.getElementById('operador-acesso').hidden && document.getElementById('operador-conteudo').hidden && document.getElementById('operador-conteudo').children.length === 0 && window.testCalls.length === 0", `Área fechada para ${role ?? "visitante"}`);
        if (role === "Autoescola") await check("document.getElementById('operador-voltar').getAttribute('href') === 'autoescola.html'", "Autoescola mantém sua área existente");
        if (role === "Aluno") await check("document.getElementById('operador-voltar').getAttribute('href') === 'dashboard.html'", "Aluno mantém sua área existente");
        if (role) await check("sessionStorage.getItem('sipa.token') !== null", "Sessão existente preservada");
    }
    await screenshot("acesso-bloqueado.png");

    // A rota abaixo só existe no servidor efêmero deste teste. Não é incluída no app.
    await navigate("/__tests__/layout", "window.layoutReady === true");
    await check("document.querySelectorAll('[data-op-panel]').length === 6 && document.querySelectorAll('[data-op-panel]:not([hidden])').length === 1", "Seis áreas, apenas uma visível");
    await screenshot("visao-geral-desktop.png");
    for (const section of ["alunos", "agenda", "verificacoes", "acessos", "recursos", "visao-geral"]) {
        await evaluate(`document.querySelector('[data-op-nav="${section}"]').click()`);
        await check(`document.querySelector('[data-op-panel="${section}"]').hidden === false && document.querySelectorAll('[data-op-panel]:not([hidden])').length === 1 && document.activeElement.matches('[data-op-heading]')`, `Navegação e foco: ${section}`);
    }
    await evaluate("document.querySelector('[data-op-nav=alunos]').click()");
    await screenshot("alunos-desktop.png");
    await evaluate("document.querySelector('[data-op-cadastro]').click()");
    await check("document.querySelector('[data-op-dialog]').open && document.querySelector('[data-op-dialog] input').matches(':disabled') && document.querySelector('[data-op-dialog] button[type=submit]').disabled", "Cadastro pendente abre, sem aceitar ou enviar dados");
    await screenshot("cadastro-desktop.png");
    await evaluate("document.querySelector('[data-op-dialog] [data-op-fechar]').click()");
    await check("!document.querySelector('[data-op-dialog]').open", "Diálogo fecha corretamente");
    await evaluate("document.querySelector('[data-op-nav=recursos]').click(); document.querySelector('#recurso-todos').focus()");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "ArrowRight", code: "ArrowRight", windowsVirtualKeyCode: 39 });
    await check("document.querySelector('#recurso-veiculos').getAttribute('aria-selected') === 'true' && document.querySelector('#op-resource-panel').getAttribute('aria-labelledby') === 'recurso-veiculos'", "Abas de recursos respondem ao teclado");
    await evaluate("document.querySelector('[data-op-nav=verificacoes]').click()");
    await check("[...document.querySelectorAll('[data-op-panel=verificacoes] button:not([data-op-go])')].every(button => button.disabled) && document.querySelector('[data-op-panel=verificacoes]').textContent.includes('Nenhuma verificação financeira foi realizada')", "ICFC e exames não simulam verificações");
    await evaluate("document.querySelector('[data-op-nav=acessos]').click()");
    await check("document.querySelector('[data-op-panel=acessos] .op-button-primary').disabled && [...document.querySelectorAll('[data-op-panel=acessos] input, [data-op-panel=acessos] select')].every(input => input.matches(':disabled'))", "Nenhuma emissão de acesso ou senha habilitada");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await check("Math.abs(document.querySelector('.op-sidebar').getBoundingClientRect().width - innerWidth) < 1", "Menu ocupa a largura do celular, sem herdar largura fixa do desktop");
    for (const section of ["visao-geral", "alunos", "verificacoes", "acessos", "recursos"]) {
        await evaluate(`document.querySelector('[data-op-nav="${section}"]').click()`);
        await check("document.documentElement.scrollWidth <= innerWidth", `Sem transbordamento horizontal no celular: ${section}`);
    }
    await evaluate("document.querySelector('[data-op-nav=visao-geral]').click(); document.activeElement.blur(); window.scrollTo(0,0)");
    await screenshot("visao-geral-mobile.png");
    await check("getComputedStyle(document.querySelector('[data-op-sair]')).display !== 'none' && getComputedStyle(document.querySelector('.sipa-sidebar-bottom')).display !== 'none'", "Saída da conta disponível no celular");
    await check("window.testCalls.length === 0", "Nenhuma requisição administrativa, ICFC ou criação de acesso");

    // Demonstração no endereço real do aplicativo, sem a rota de montagem do teste.
    await navigate("/__tests__/blank", "true");
    await evaluate("sessionStorage.setItem('sipa.token', 'sessao-preservada-no-teste'); localStorage.setItem('sipa.API_URL', 'http://exemplo.invalid/api'); localStorage.setItem('demo', '1')");
    await navigate("/operador-cfc.html", "document.getElementById('operador-voltar')");
    await check("document.getElementById('operador-conteudo').hidden", "Flags no armazenamento não ativam demonstração");
    await navigate("/operador-cfc.html?demo=1", "document.querySelector('.op-demo-banner')");
    await check("document.getElementById('operador-acesso').hidden && !document.getElementById('operador-conteudo').hidden && document.querySelector('.op-demo-banner').textContent.includes('DADOS FICTÍCIOS')", "Ativação explícita monta painel completo e identificado");
    await check("window.testStorageReads.every(k => k === 'sipa.operador.demo.v2') && sessionStorage['sipa.token'] === 'sessao-preservada-no-teste' && localStorage['sipa.API_URL'] === 'http://exemplo.invalid/api'", "Demonstração lê somente sua chave e preserva sessão e configuração reais");
    await check("document.querySelector('.op-operator-label').textContent.includes('Operador fictício') && document.querySelector('.op-unit-chip').textContent.includes('Centro')", "Operador fictício nível 1 vinculado à unidade Centro");
    await check("!document.querySelector('[data-op-panel=visao-geral]').textContent.includes('Atenção da recepção') && !document.querySelector('[data-op-panel=visao-geral]').textContent.includes('Fluxo do atendimento') && !document.querySelector('.op-metric-index')", "Visão geral sem blocos redundantes ou números decorativos");
    for (const id of ["alunos", "financeiro", "exames", "aptos", "hoje", "semana", "veiculos", "instrutores", "livres"]) {
        await evaluate(`window.totalIndicador = Number(document.querySelector('[data-indicador=${id}] > strong').textContent); document.querySelector('[data-indicador=${id}]').click()`);
        await check("document.querySelector('[data-op-indicador]').open && Number(document.querySelector('[data-indicador-total]').dataset.indicadorTotal) === window.totalIndicador && document.querySelectorAll('[data-indicador-registro]').length === window.totalIndicador", `Card ${id}: total igual aos registros exibidos`);
        if (id === "financeiro") await check("[...document.querySelectorAll('[data-indicador-registro]')].every(r => !r.textContent.includes('Financeiro: Regular'))", "Detalhamento financeiro contém somente pendências");
        if (id === "alunos") await check("document.querySelector('[data-op-indicador]').textContent.includes('000.***.***-01') && !document.querySelector('[data-op-indicador]').textContent.includes('00000000001')", "CPF mascarado na listagem do indicador");
        await evaluate("document.querySelector('[data-op-indicador] .op-close').click()");
    }
    await evaluate("document.querySelector('[data-indicador=alunos]').focus()");
    await send("Input.dispatchKeyEvent", { type: "keyDown", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13, text: "\r", unmodifiedText: "\r" });
    await send("Input.dispatchKeyEvent", { type: "keyUp", key: "Enter", code: "Enter", windowsVirtualKeyCode: 13 });
    await check("document.querySelector('[data-op-indicador]').open", "Indicador abre por teclado com Enter");
    await evaluate("document.querySelector('[data-indicador-registro] button').click()");
    await check("document.querySelector('[data-op-ficha]').open && document.querySelector('[data-op-ficha]').textContent.includes('Aluno Exemplo Um')", "Card reutiliza ficha existente do aluno");
    await evaluate("document.querySelector('[data-op-ficha] .op-close').click()");
    await evaluate("document.querySelector('[data-op-nav=alunos]').click()");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 3", "Lista inicial contém somente três alunos fictícios");
    await evaluate("var filtroAluno = document.querySelector('[data-aluno-filtro=financeiro]'); filtroAluno.value = 'Regular'; filtroAluno.dispatchEvent(new Event('change'))");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 1 && document.querySelector('[data-demo-aluno]').dataset.demoAluno === 'demo-2'", "Filtro financeiro seleciona os alunos correspondentes");
    await evaluate("filtroAluno.value = ''; filtroAluno.dispatchEvent(new Event('change')); var categoriaAluno = document.querySelector('[data-aluno-filtro=categoria]'); categoriaAluno.value = 'AB'; categoriaAluno.dispatchEvent(new Event('change'))");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 1 && document.querySelector('[data-demo-aluno]').dataset.demoAluno === 'demo-3'", "Filtro de categoria restringe a lista");
    await evaluate("categoriaAluno.value = ''; categoriaAluno.dispatchEvent(new Event('change')); var examesAluno = document.querySelector('[data-aluno-filtro=exames]'); examesAluno.value = 'Concluídos'; examesAluno.dispatchEvent(new Event('change'))");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 1", "Filtro de exames considera as quatro avaliações");
    await evaluate("examesAluno.value = ''; examesAluno.dispatchEvent(new Event('change'))");
    await evaluate("const busca = document.querySelector('.op-search input'); busca.value = 'Exemplo Dois'; busca.dispatchEvent(new Event('input'))");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 1", "Busca filtra somente os dados fictícios locais");
    await evaluate("document.querySelector('[data-demo-aluno] button').click()");
    await check("document.querySelector('[data-op-panel=alunos] .op-detail').textContent.includes('Aluno Exemplo Dois')", "Detalhes mostram o aluno fictício selecionado");
    await check("document.querySelector('[data-op-ficha]').open && document.querySelectorAll('[data-exame]').length === 4", "Ficha abre quatro avaliações independentes");
    await evaluate("const exame = document.querySelector('[data-exame=psicotecnico]'); exame.elements.status.value = 'Reprovado'; exame.elements.data.value = '2026-10-15'; exame.elements.observacoes.value = 'Anotação fictícia de teste'; exame.requestSubmit()");
    await check("document.querySelector('[data-exame=psicotecnico] select').value === 'Reprovado' && document.querySelector('[data-exame=vista] select').value === 'Aprovado' && document.querySelector('[data-exame=teorica] select').value === 'Aprovado' && document.querySelector('[data-op-ficha]').textContent.includes('Aprovado → Reprovado')", "Salvar psicotécnico preserva vista e teórica, com histórico");
    await screenshot("ficha-exames.png");
    await evaluate("document.querySelector('[data-op-ficha] .op-close').click(); document.querySelector('[data-op-nav=verificacoes]').click(); document.querySelector('.op-verifications button').click()");
    await check("document.querySelector('.op-verifications dd').textContent.includes('simulado') && document.querySelector('.op-demo-feedback').textContent.includes('Nenhuma verificação')", "Cenário financeiro não é consulta oficial ao ICFC");
    await evaluate("document.querySelector('[data-op-nav=acessos]').click(); document.querySelector('[data-op-panel=acessos] .op-button-primary').click()");
    await check("document.querySelector('#acesso-pendente').textContent.includes('Nenhum link, senha provisória ou acesso real')", "Acesso simulado não gera link ou senha");
    await evaluate("const tipos = document.querySelector('[data-op-panel=acessos] select'); tipos.selectedIndex = 1; tipos.dispatchEvent(new Event('change')); document.querySelector('[data-demo-aluno] button').click(); document.querySelector('[data-op-ficha] .op-close').click()");
    await check("document.querySelector('[data-demo-cpf]').value === '00000000010' && document.querySelector('[data-demo-cpf]').readOnly", "Simulação do instrutor mantém identificação fictícia separada do aluno");
    await evaluate("document.querySelector('[data-op-cadastro]').click(); const form = document.querySelector('[data-op-dialog] form'); form.elements.nome.value = '<img src=x onerror=alert(1)>'; form.elements.cpf.value = '00000000004'; form.elements.email.value = 'novo@example.invalid'; form.elements.telefone.value = '(00) 00000-0004'; form.elements.categoria.selectedIndex = 1; form.requestSubmit()");
    await evaluate("document.querySelector('[data-op-nav=alunos]').click()");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 4 && !document.querySelector('[data-op-dialog]').open && !document.querySelector('.op-table tbody img')", "Cadastro fictício é local e conteúdo é tratado como texto");
    await evaluate("document.querySelector('[data-op-nav=recursos]').click(); document.querySelector('#recurso-instrutores').click()");
    await check("document.querySelectorAll('.op-demo-resource').length === 2 && document.querySelector('.op-demo-resource').textContent.includes('Instrutor Exemplo')", "Recursos fictícios podem ser filtrados");
    await evaluate("document.querySelector('[data-op-nav=visao-geral]').click()");
    await check("document.querySelectorAll('.op-metric').length === 9 && document.querySelector('.op-demo-agenda').textContent.includes('DEMO-02')", "Indicadores e próximas aulas derivados dos dados fictícios");
    await evaluate("document.querySelector('[data-op-nav=agenda]').click(); var d = document.querySelector('[data-agenda-data]'); d.value = '2026-10-19'; d.dispatchEvent(new Event('change'))");
    await check("document.querySelectorAll('.op-agenda-slot').length === 12 && [...document.querySelectorAll('.op-agenda-slot')].filter(s => s.textContent.includes('Intervalo de almoço')).length === 2", "Grade semanal exibe almoço às 12h e 13h");
    await evaluate("var filtroAgenda = document.querySelector('[data-agenda-filtro=categoria]'); filtroAgenda.value = 'B'; filtroAgenda.dispatchEvent(new Event('change'))");
    await check("document.querySelectorAll('.op-agenda .op-aula-card').length === 0", "Filtro da agenda exclui aulas de outra categoria");
    await evaluate("filtroAgenda.value = ''; filtroAgenda.dispatchEvent(new Event('change')); var aulaFicticia = JSON.parse(localStorage['sipa.operador.demo.v2']).aulas[0]; d.value = aulaFicticia.data; d.dispatchEvent(new Event('change')); document.querySelector('.op-agenda .op-aula-evento').click()");
    await check("document.querySelector('[data-op-aula]').open && document.querySelector('[data-op-aula]').textContent.includes('Centro') && document.querySelector('[data-op-aula]').textContent.includes('Instrutor Exemplo') && document.querySelector('[data-op-aula] button:disabled') !== null", "Aula ocupada abre detalhes sem cancelamento administrativo");
    await screenshot("agenda-detalhes.png");
    await evaluate("document.querySelector('[data-op-aula] .op-close').click(); d.value = '2026-10-19'; d.dispatchEvent(new Event('change'))");
    await screenshot("agenda-mobile.png");
    await evaluate("document.querySelector('[data-agenda-modo=semana]').click()");
    await check("document.querySelectorAll('.op-agenda-day').length === 7", "Visualização semanal contém sete dias");
    await evaluate("document.querySelector('[data-agenda-modo=mes]').click()");
    await check("document.querySelectorAll('.op-month-day').length === 42", "Visualização mensal mostra calendário com dias adjacentes");
    await evaluate("document.querySelector('[data-agenda-modo=dia]').click(); var d = document.querySelector('[data-agenda-data]'); d.value = '2026-10-18'; d.dispatchEvent(new Event('change'))");
    await check("document.querySelector('.op-agenda-content').textContent.includes('Domingo') && document.querySelectorAll('.op-agenda-slot').length === 0 && !document.querySelector('[data-agendar-horario]')", "Domingo apresenta fechamento");
    await evaluate("var d = document.querySelector('[data-agenda-data]'); d.value = '2027-11-20'; d.dispatchEvent(new Event('change'))");
    await check("document.querySelector('.op-agenda-content').textContent.includes('Consciência Negra') && !document.querySelector('[data-agendar-horario]')", "Feriado nacional fechado sem oferecer agendamento");
    await evaluate("document.querySelector('[data-agenda-modo=mes]').click()");
    await check("document.querySelector('[data-agenda-dia=\"2027-11-20\"]').classList.contains('op-closed')", "Calendário mensal identifica feriado");
    await evaluate("var d = document.querySelector('[data-agenda-data]'); d.value = '2028-02-29'; d.dispatchEvent(new Event('change')); document.querySelector('[aria-label=\"Próximo período\"]').click()");
    await check("document.querySelector('[data-agenda-data]').value === '2028-03-01'", "Navegação de mês em ano bissexto");
    for (const section of ["visao-geral", "alunos", "agenda", "verificacoes", "acessos", "recursos"]) {
        await evaluate(`document.querySelector('[data-op-nav="${section}"]').click()`);
        await check("document.documentElement.scrollWidth <= innerWidth", `Demonstração sem transbordamento móvel: ${section}`);
    }
    await evaluate("document.querySelector('[data-op-nav=visao-geral]').click(); document.activeElement.blur(); scrollTo(0,0)");
    await screenshot("demonstracao-mobile.png");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
    await screenshot("demonstracao-desktop.png");
    await evaluate("document.querySelector('[data-op-nav=agenda]').click()");
    await screenshot("agenda-desktop.png");
    await evaluate("d.value = aulaFicticia.data; d.dispatchEvent(new Event('change')); document.querySelector('[data-agenda-modo=semana]').click()");
    await screenshot("agenda-semana-desktop.png");
    await check("document.documentElement.scrollWidth <= innerWidth", "Agenda semanal sem transbordamento no desktop");
    await check("[...document.querySelectorAll('.op-week-grid [data-agenda-horario=\"10:00\"]')].every(s => Math.abs(s.getBoundingClientRect().top - document.querySelector('.op-week-grid [data-agenda-horario=\"10:00\"]').getBoundingClientRect().top) < 1)", "Horários semanais alinhados entre colunas com e sem aulas");
    await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
    await check("document.documentElement.scrollWidth <= innerWidth", "Agenda semanal responsiva sem transbordamento no celular");
    await screenshot("agenda-semana-mobile.png");
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });
    await check("window.testCalls.length === 0 && sessionStorage['sipa.token'] === 'sessao-preservada-no-teste' && localStorage['sipa.API_URL'] === 'http://exemplo.invalid/api'", "Nenhuma API ou alteração de credenciais após todas as simulações");
    await navigate("/operador-cfc.html?demo=1", "document.querySelector('.op-demo-banner')");
    await evaluate("document.querySelector('[data-op-nav=alunos]').click()");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 4", "Recarregar preserva os cadastros fictícios");
    await evaluate("document.querySelector('[data-demo-aluno=demo-2] button').click()");
    await check("document.querySelector('[data-exame=psicotecnico] select').value === 'Reprovado' && document.querySelector('[data-exame=psicotecnico] textarea').value === 'Anotação fictícia de teste'", "Recarregar preserva exame, data e observações");
    await evaluate("var exameApto = document.querySelector('[data-exame=psicotecnico]'); exameApto.elements.status.value = 'Aprovado'; exameApto.requestSubmit(); document.querySelector('[data-op-ficha] .op-close').click()");
    await evaluate("(async () => { var datas = await import('/js/modules/operador/calendario.js'); var regras = await import('/js/modules/operador/disponibilidade.js'); window.dataAulaTeste = datas.somarDias(datas.hojeBrasil(), 1); while (regras.motivoFechamento(window.dataAulaTeste)) window.dataAulaTeste = datas.somarDias(window.dataAulaTeste, 1); })()");
    await evaluate("document.querySelector('[data-op-nav=agenda]').click(); document.querySelector('[data-agenda-modo=dia]').click(); var d = document.querySelector('[data-agenda-data]'); d.value = window.dataAulaTeste; d.dispatchEvent(new Event('change')); document.querySelector('[data-agendar-horario=\"07:00\"]').click()");
    await check("document.querySelector('[data-op-agendar]').open && document.querySelector('.op-booking-resumo').textContent.includes('07:00 às 08:00')", "Horário livre abre formulário com data e duração preenchidas");
    await evaluate("var agForm = document.querySelector('[data-op-agendar] form'); agForm.elements.alunoId.value = 'demo-2'; agForm.elements.alunoId.dispatchEvent(new Event('change')); agForm.elements.instrutorId.value = 'i1'; agForm.elements.instrutorId.dispatchEvent(new Event('change')); agForm.elements.veiculoId.value = 'v2'");
    await check("agForm.elements.categoria.value === 'A' && [...agForm.elements.veiculoId.options].every(o => !o.value || o.value === 'v2')", "Categoria inferida e veículos filtrados por compatibilidade");
    await screenshot("novo-agendamento.png");
    await evaluate("window.aulasAntes = JSON.parse(localStorage['sipa.operador.demo.v2']).aulas.length; agForm.requestSubmit()");
    await check("!document.querySelector('[data-op-agendar]').open && JSON.parse(localStorage['sipa.operador.demo.v2']).aulas.length === window.aulasAntes + 1 && document.querySelector('[data-agenda-horario=\"07:00\"] .op-aula-card').textContent.includes('Aluno Exemplo Dois') && document.querySelector('.op-agenda-success').textContent.includes('confirmado')", "Confirmar cria e persiste aula fictícia, ocupa a grade e mostra sucesso");
    await check("JSON.parse(localStorage['sipa.operador.demo.v2']).alunos.find(a => a.id === 'demo-2').aulas === 9", "Agendamento consome somente uma aula do saldo fictício");
    await evaluate("document.querySelector('[data-agendar-horario=\"07:00\"]').click(); agForm.elements.alunoId.value = 'demo-2'; agForm.elements.alunoId.dispatchEvent(new Event('change'))");
    await check("[...agForm.elements.instrutorId.options].every(o => o.value !== 'i1')", "Instrutor ocupado não é oferecido para novo agendamento");
    // Simula uma seleção antiga que ficou indisponível após abrir o formulário.
    await evaluate("agForm.elements.categoria.append(new Option('A', 'A')); agForm.elements.categoria.disabled = false; agForm.elements.categoria.value = 'A'; agForm.elements.instrutorId.append(new Option('Seleção antiga', 'i1')); agForm.elements.instrutorId.disabled = false; agForm.elements.instrutorId.value = 'i1'; agForm.elements.veiculoId.append(new Option('Seleção antiga', 'v2')); agForm.elements.veiculoId.disabled = false; agForm.elements.veiculoId.value = 'v2'; agForm.requestSubmit()");
    await check("document.querySelector('[data-op-agendar]').open && document.querySelector('.op-booking-feedback').textContent.includes('Conflito') && JSON.parse(localStorage['sipa.operador.demo.v2']).aulas.length === window.aulasAntes + 1 && JSON.parse(localStorage['sipa.operador.demo.v2']).alunos.find(a => a.id === 'demo-2').aulas === 9", "Seleção antiga conflitante é bloqueada na confirmação sem alterar aulas ou saldo");
    await evaluate("document.querySelector('[data-op-agendar] .op-close').click(); document.querySelector('[data-op-nav=visao-geral]').click(); document.querySelector('[data-indicador=semana]').click()");
    await check("[...document.querySelectorAll('[data-indicador-registro]')].some(r => r.textContent.includes('07:00 às 08:00')) && Number(document.querySelector('[data-indicador-total]').dataset.indicadorTotal) === document.querySelectorAll('[data-indicador-registro]').length", "Nova aula sincronizada com indicador e detalhamento dos sete dias");
    await evaluate("document.querySelector('[data-op-indicador] .op-close').click()");
    await navigate("/operador-cfc.html?demo=1", "document.querySelector('.op-demo-banner')");
    await check("JSON.parse(localStorage['sipa.operador.demo.v2']).aulas.length === 5 && JSON.parse(localStorage['sipa.operador.demo.v2']).aulas.some(a => a.inicio === '07:00')", "Agendamento fictício preservado após recarga");
    await evaluate("[...document.querySelectorAll('.op-demo-banner button')].find(b => b.textContent === 'Restaurar dados').click()");
    await check("document.querySelector('[data-op-reset]').open", "Restauração pede confirmação no diálogo");
    await evaluate("[...document.querySelectorAll('[data-op-reset] button')].find(b => b.textContent === 'Restaurar dados iniciais').click()");
    await check("document.querySelectorAll('[data-demo-aluno]').length === 3 && JSON.parse(localStorage['sipa.operador.demo.v2']).aulas.length === 4 && sessionStorage['sipa.token'] === 'sessao-preservada-no-teste' && localStorage['sipa.API_URL'] === 'http://exemplo.invalid/api'", "Restaurar remove apenas dados fictícios e preserva credenciais/configuração");

    // Cenário exclusivamente neste perfil temporário: duas aulas no mesmo início,
    // com recursos distintos, mais uma aguardando aceite. Nunca altera o navegador do usuário.
    async function cenarioCompacto(longo) {
        await evaluate(`(async () => {
            const { criarDadosDemo } = await import('/js/modules/operador/demo/dadosDemo.js');
            const { hojeBrasil, somarDias, diaSemana } = await import('/js/modules/operador/calendario.js');
            const { motivoFechamento } = await import('/js/modules/operador/disponibilidade.js');
            const estado = criarDadosDemo(); let data = somarDias(hojeBrasil(), 1);
            while (motivoFechamento(data) || diaSemana(data) === 6) data = somarDias(data, 1);
            if (${longo}) {
                estado.alunos.forEach(a => { a.nome = a.nome + ' SobrenomeMuitoLongo'.repeat(12); });
                estado.recursos.forEach(r => { r.nome += ' IdentificaçãoLonga'.repeat(12); r.descricao += ' DescriçãoLonga'.repeat(12); });
            }
            estado.aulas = [
                { id: 'compacta-1', alunoId: 'demo-1', instrutorId: 'i1', veiculoId: 'v1', categoria: 'B', inicio: '07:00', fim: '08:00', status: 1 },
                { id: 'compacta-2', alunoId: 'demo-2', instrutorId: 'i2', veiculoId: 'v2', categoria: 'A', inicio: '07:00', fim: '08:00', status: 1 },
                { id: 'compacta-3', alunoId: 'demo-3', instrutorId: 'i1', veiculoId: 'v1', categoria: 'B', inicio: '09:00', fim: '10:00', status: 3 }
            ].map(a => ({ ...a, unidade: 'Centro', data }));
            localStorage.setItem('sipa.operador.demo.v2', JSON.stringify(estado));
        })()`);
        await navigate('/operador-cfc.html?demo=1', "document.querySelector('[data-indicador]')");
    }
    for (const longo of [false, true]) {
        await cenarioCompacto(longo);
        for (const [width, height] of [[1366, 768], [1920, 1080]]) {
            await send('Emulation.setDeviceMetricsOverride', { width, height, deviceScaleFactor: 1, mobile: false });
            await evaluate("document.querySelector('[data-op-nav=visao-geral]').click(); scrollTo(0, 0)");
            await check("document.querySelectorAll('[data-indicador]').length === 9 && document.querySelector('.op-dashboard-metrics').getBoundingClientRect().height < 310 && [...document.querySelectorAll('[data-indicador]')].every(c => c.getBoundingClientRect().height < 110)", `Indicadores compactos em ${width}, textos ${longo ? 'longos' : 'normais'}`);
            await check("getComputedStyle(document.querySelector('.op-proximas-lista')).gridTemplateColumns.split(' ').length === 1 && [...document.querySelectorAll('.op-aula-lista')].every(c => c.getBoundingClientRect().height < 100)", `Próximas aulas em lista compacta em ${width}, textos ${longo ? 'longos' : 'normais'}`);
            await check("document.documentElement.scrollWidth <= innerWidth", `Visão geral sem transbordamento em ${width}, textos ${longo ? 'longos' : 'normais'}`);
            if (!longo) await screenshot(`compacto-dashboard-${width}.png`);
            const medidas = await evaluate("({ indicadores: Math.round(document.querySelector('.op-dashboard-metrics').getBoundingClientRect().height), aulaLista: Math.round(document.querySelector('.op-aula-lista').getBoundingClientRect().height) })");
            await evaluate("document.querySelector('[data-op-nav=agenda]').click(); document.querySelector('[data-agenda-modo=dia]').click(); var dataCompacta = JSON.parse(localStorage['sipa.operador.demo.v2']).aulas[0].data; var inputCompacto = document.querySelector('[data-agenda-data]'); inputCompacto.value = dataCompacta; inputCompacto.dispatchEvent(new Event('change')); scrollTo(0,0)");
            await check("document.querySelectorAll('.op-aula-evento').length === 3 && document.querySelectorAll('[data-agenda-horario=\"07:00\"] .op-aula-evento').length === 2 && [...document.querySelectorAll('.op-agenda-slot')].every(s => s.getBoundingClientRect().height < 90)", `Dia compacto preserva aulas simultâneas em ${width}, textos ${longo ? 'longos' : 'normais'}`);
            await check("[...document.querySelectorAll('.op-aula-evento')].every(e => e.matches('button') && !e.querySelector('.op-aula-recursos') && e.getAttribute('aria-label').includes('Ver detalhes'))", 'Eventos preservam ação acessível e resumo sem dados repetidos');
            medidas.faixaDiaria = await evaluate("Math.round(document.querySelector('[data-agenda-horario=\"07:00\"]').getBoundingClientRect().height)");
            if (!longo) await screenshot(`compacto-dia-${width}.png`);
            await evaluate("document.querySelector('.op-aula-evento').click()");
            await check("document.querySelector('[data-op-aula]').open && document.querySelector('[data-op-aula]').textContent.includes('Instrutor') && document.querySelector('[data-op-aula]').textContent.includes('Identificação')", 'Resumo compacto continua abrindo todos os detalhes');
            await evaluate("document.querySelector('[data-op-aula] .op-close').click(); document.querySelector('[data-agenda-modo=semana]').click(); scrollTo(0,0)");
            await check("getComputedStyle(document.querySelector('.op-week-grid')).gridTemplateColumns.split(' ').length === 7 && document.documentElement.scrollWidth <= innerWidth", `Sete dias em colunas sem rolagem horizontal em ${width}`);
            if (!longo) await screenshot(`compacto-semana-${width}.png`);
            await check("[...document.querySelectorAll('.op-week-grid [data-agenda-horario=\"09:00\"]')].every(s => Math.abs(s.getBoundingClientRect().top - document.querySelector('.op-week-grid [data-agenda-horario=\"09:00\"]').getBoundingClientRect().top) < 1) && [...document.querySelectorAll('.op-week-grid .op-agenda-slot')].every(s => s.getBoundingClientRect().height < 135)", `Semana compacta e alinhada em ${width}, textos ${longo ? 'longos' : 'normais'}`);
            medidas.faixaSemanal = await evaluate("Math.round([...document.querySelectorAll('.op-week-grid .op-agenda-slot')].reduce((max, s) => Math.max(max, s.getBoundingClientRect().height), 0))");
            medidasLayout.push({ width, longo, ...medidas });
            if (!longo) await screenshot(`compacto-semana-${width}.png`);
        }
    }
    for (const width of [768, 390]) {
        await send('Emulation.setDeviceMetricsOverride', { width, height: 900, deviceScaleFactor: 1, mobile: width < 500 });
        for (const secao of ['visao-geral', 'agenda']) {
            await evaluate(`document.querySelector('[data-op-nav=${secao}]').click(); scrollTo(0,0)`);
            await check('document.documentElement.scrollWidth <= innerWidth', `Textos longos sem transbordamento em ${secao}, largura ${width}`);
            await screenshot(`compacto-${secao}-${width}.png`);
        }
    }
    assert.deepEqual(consoleErrors, [], "Sem exceções ou console.error no navegador"); checks.push("Sem erros de JavaScript no console");
    await evaluate("document.querySelector('[data-op-sair]').click()");
    await waitFor(async () => await evaluate("location.search === '' && document.readyState === 'complete' && !document.getElementById('operador-acesso').hidden"), "saída da demonstração");
    await check("sessionStorage['sipa.token'] === 'sessao-preservada-no-teste' && document.getElementById('operador-conteudo').hidden", "Sair da demonstração restaura bloqueio sem fazer logout real");
    console.log(JSON.stringify({ passed: checks.length, checks, medidasLayout, artifacts }, null, 2));
} finally {
    if (ws?.readyState === WebSocket.OPEN) {
        try { await send("Browser.close"); } catch { /* processo pode já ter encerrado */ }
    }
    ws?.close();
    browser.kill();
    for (const item of pending.values()) { clearTimeout(item.timeout); item.reject(new Error("Teste encerrado")); }
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
}
