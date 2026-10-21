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
        try { return await evaluate(`location.pathname === ${JSON.stringify(route)} && document.readyState === 'complete' && (${ready})`); }
        catch { return false; }
    }, route);
}
async function check(expression, label) {
    assert.equal(await evaluate(expression), true, label);
    checks.push(label);
}
async function screenshot(name) {
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
        const item = pending.get(message.id);
        if (!item) return;
        clearTimeout(item.timeout); pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    });
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.testCalls = []; window.fetch = (...args) => { window.testCalls.push(String(args[0])); return Promise.reject(new Error('Nenhuma API deve ser chamada neste teste')); };" });
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
    await check("document.querySelectorAll('[data-op-panel]').length === 5 && document.querySelectorAll('[data-op-panel]:not([hidden])').length === 1", "Cinco áreas, apenas uma visível");
    await screenshot("visao-geral-desktop.png");
    for (const section of ["alunos", "verificacoes", "acessos", "recursos", "visao-geral"]) {
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
    console.log(JSON.stringify({ passed: checks.length, checks, artifacts }, null, 2));
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
