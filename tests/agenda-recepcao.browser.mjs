import {fonteLaboratorio} from './ambiente-isolado.mjs';
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
// O fluxo padrão agora utiliza contas registradas. Cenários históricos de login
// livre permanecem nos arquivos anteriores, sem reativar atalhos na aplicação.
process.env.SIPA_TEST_CENARIO ||= 'administracao';

const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "sipa-operador-ui-"));
const source = await fs.readFile(path.join(root, "nivel-1-operador/html/operador-cfc.html"), "utf8");
const layout = source.replace("<head>", '<head><base href="/nivel-1-operador/html/">').replace(
    /<script type="module"[^>]*>[\s\S]*?<\/script>/,
    `<script type="module">
        import { montarEstruturaOperador } from '/nivel-1-operador/js/components/painelOperador.js';
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
        res.end(fonteLaboratorio(target,await fs.readFile(target,'utf8')));
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
        try {
            const value = await fn();
            if (value) return value;
        } catch (erro) {
            // Uma navegação pode substituir o documento entre duas consultas.
            // Erros de execução da aplicação continuam capturados pelo CDP.
            if (!/Cannot read properties of (null|undefined)|Execution context was destroyed/.test(erro.message)) throw erro;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }
    throw new Error(`Tempo esgotado: ${label}`);
}
function send(method, params = {}, sessionId) {
    return new Promise((resolve, reject) => {
        const id = ++nextId;
        const timeout = setTimeout(() => { pending.delete(id); reject(new Error(`CDP: ${method}`)); }, 15000);
        pending.set(id, { resolve, reject, timeout });
        ws.send(JSON.stringify({ id, method, params, ...(sessionId?{sessionId}:{}) }));
    });
}
async function evaluate(expression) {
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, userGesture:true });
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
    return result.result.value;
}
async function abrirAba(route){
 const {targetId}=await send('Target.createTarget',{url:origin+route}),{sessionId}=await send('Target.attachToTarget',{targetId,flatten:true});
 await send('Runtime.enable',{},sessionId);await send('Page.enable',{},sessionId);
 return {send:(method,params)=>send(method,params,sessionId),screenshot:name=>screenshot(name,sessionId),ativar:()=>send('Page.bringToFront',{},sessionId),async evaluate(expression){const r=await send('Runtime.evaluate',{expression,awaitPromise:true,returnByValue:true},sessionId);if(r.exceptionDetails)throw new Error(r.exceptionDetails.exception?.description||r.exceptionDetails.text);return r.result.value;},fechar:()=>send('Target.closeTarget',{targetId})};
}
async function navigate(route, ready) {
    await send("Page.navigate", { url: origin + route });
    await waitFor(async () => {
        try { return await evaluate(`location.pathname + location.search + location.hash === ${JSON.stringify(route)} && document.readyState === 'complete' && (${ready})`); }
        catch { return false; }
    }, route);
}
async function check(expression, label) {
    assert.equal(await evaluate(expression), true, label);
    checks.push(label);
}
async function screenshot(name,sessionId) {
    // Aguarda somente a transição visual dos componentes antes da captura.
    await new Promise(resolve => setTimeout(resolve, 300));
    const image = await send("Page.captureScreenshot", { format: "png", captureBeyondViewport: false },sessionId);
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
        if(message.method==='Debugger.scriptFailedToParse')consoleErrors.push('Falha ao analisar modulo: '+message.params.url);
        if (message.method === "Runtime.exceptionThrown") consoleErrors.push(message.params.exceptionDetails.text);
        if (message.method === "Runtime.consoleAPICalled" && message.params.type === "error") consoleErrors.push("console.error");
        const item = pending.get(message.id);
        if (!item) return;
        clearTimeout(item.timeout); pending.delete(message.id);
        if (message.error) item.reject(new Error(message.error.message)); else item.resolve(message.result);
    });
    await send("Debugger.enable");
    await send("Page.enable");
    await send("Runtime.enable");
    await send("Page.addScriptToEvaluateOnNewDocument", { source: "window.testCalls = []; window.testStorageReads = []; const originalGetItem = Storage.prototype.getItem; Storage.prototype.getItem = function(key) { window.testStorageReads.push(key); return originalGetItem.call(this, key); }; const fetchOriginal=window.fetch.bind(window);window.fetch = (...args) => { const u=new URL(String(args[0]),location.href);if(u.origin===location.origin&&u.pathname==='/nivel-1-operador/html/operador-cfc.html')return fetchOriginal(...args);window.testCalls.push(String(args[0])); return Promise.reject(new Error('Nenhuma API deve ser chamada neste teste')); };" });
    await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 1080, deviceScaleFactor: 1, mobile: false });


    // Navegacao real, sem alterar as contas ou o navegador do usuario.
    await send('Page.addScriptToEvaluateOnNewDocument',{source:"const Original=Date;window.Date=class extends Original{constructor(...a){super(...(a.length?a:['2026-10-19T08:00:00-03:00']));}static now(){return Original.parse('2026-10-19T08:00:00-03:00');}};"});
    if(process.env.SIPA_TEST_CENARIO==='divisorias-agendas')await (await import('./divisorias-agendas.browser.steps.mjs')).validarDivisorias({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='dashboard-alinhamento')await (await import('./dashboard-alinhamento.browser.steps.mjs')).validarDashboardAlinhamento({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='aulas-realizadas')await (await import('./aulas-realizadas.browser.steps.mjs')).validarAulasRealizadas({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='master-historico')await (await import('./master-historico.browser.steps.mjs')).validarMasterHistorico({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='exclusoes-master')await (await import('./exclusoes-master.browser.steps.mjs')).validarExclusoes({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='instrutor-detalhes')await (await import('./instrutor-detalhes.browser.steps.mjs')).validarDetalhesInstrutor({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='master-teste-local')await (await import('./master-teste-local.browser.steps.mjs')).validarMasterTesteLocal({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='cpf-aluno-local')await (await import('./cpf-aluno-local.browser.steps.mjs')).validarCpfAlunoLocal({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='redefinicao-aluno')await (await import('./redefinicao-aluno.browser.steps.mjs')).validarRedefinicaoAluno({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='escala-global')await (await import('./escala-global.browser.steps.mjs')).validarEscalaGlobal({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='master-visual')await (await import('./master-visual.browser.steps.mjs')).validarMasterVisual({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='escopo-medico')await (await import('./escopo-medico.browser.steps.mjs')).validarEscopoMedico({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='antecipacao')await (await import('./antecipacao.browser.steps.mjs')).validarAntecipacao({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='relatorios-pdf')await (await import('./relatorios.browser.steps.mjs')).validarRelatorios({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='redesign-modais')await (await import('./redesign-modais.browser.steps.mjs')).validarRedesignModais({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='detalhes-recurso')await (await import('./detalhes-recurso.browser.steps.mjs')).validarDetalhesRecursos({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='escala-gerencia')await (await import('./escala-gerencia.browser.steps.mjs')).validarEscalaGerencia({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='ajustes-administrativos')await (await import('./ajustes-administrativos.browser.steps.mjs')).validarAjustesAdministrativos({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='legibilidade')await (await import('./legibilidade.browser.steps.mjs')).validarLegibilidade({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='cores-agendas')await (await import('./cores-agendas.browser.steps.mjs')).validarCores({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='carros-legados')await (await import('./carros-legados.browser.steps.mjs')).validarCarrosLegados({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='agenda-acabamento')await (await import('./agenda-acabamento.browser.steps.mjs')).validarAcabamentoAgenda({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='multipaineis')await (await import('./conta-multipaineis.browser.steps.mjs')).validarContaMultipaineis({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='administracao')await (await import('./administracao.browser.steps.mjs')).validarAdministracao({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='acessos-v2')await (await import('./acessos-v2.browser.steps.mjs')).validarAcessosV2({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='desempenho')await (await import('./desempenho-instrutor.browser.steps.mjs')).validarDesempenho({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='operacoes-adm')await (await import('./operacoes-agenda.browser.steps.mjs')).validarOperacoesAdm({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='medico')await (await import('./solicitacoes-medicas.browser.steps.mjs')).validarMedico({evaluate,waitFor,check,navigate,send,screenshot,abrirAba});else if(process.env.SIPA_TEST_CENARIO==='carro')await (await import('./operacao-carro.browser.steps.mjs')).validarOperacaoCarro({evaluate,waitFor,check,navigate,send,screenshot});else if(['creditos','onibus-temporario'].includes(process.env.SIPA_TEST_CENARIO))await (await import('./creditos-d-fluxo.browser.steps.mjs')).validarCreditosD({evaluate,waitFor,check,navigate,send,screenshot,abrirAba,temporario:process.env.SIPA_TEST_CENARIO==='onibus-temporario'});else if(process.env.SIPA_TEST_CENARIO==='mascara')await (await import('./mascara-cpf.browser.steps.mjs')).validarMascaraCpf({evaluate,waitFor,check,navigate,send,screenshot});else if(process.env.SIPA_TEST_CENARIO==='aluno')await (await import('./aluno-recepcao.browser.steps.mjs')).validarAlunoRecepcao({evaluate,waitFor,check,navigate,send,screenshot});else await (await import('./agenda-recepcao.browser.steps.mjs'))[process.env.SIPA_TEST_CENARIO==='cpf'?'validarCpfLocal':'validarCategoriaD']({evaluate,waitFor,check,navigate,send,screenshot});
    assert.deepEqual(consoleErrors,[]);
    console.log(JSON.stringify({passed:checks.length,checks,artifacts},null,2));
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
