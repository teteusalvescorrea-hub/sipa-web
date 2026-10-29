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

const root = fileURLToPath(new URL("../", import.meta.url));
const artifacts = await fs.mkdtemp(path.join(os.tmpdir(), "sipa-login-ui-"));
const server = http.createServer(async (req, res) => {
    try {
        const pathname = decodeURIComponent(new URL(req.url, "http://localhost").pathname);
        if (pathname === "/__tests__/blank") return res.end("<!doctype html><title>Teste isolado</title>");
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
let browser = spawn(executable, ["--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "--disable-extensions", "--remote-debugging-port=0", `--user-data-dir=${profile}`, "about:blank"], { windowsHide: true, stdio: "ignore" });
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
    const result = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true, replMode: true });
    if (result.exceptionDetails) throw new Error(JSON.stringify(result.exceptionDetails));
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
    await send("Browser.setDownloadBehavior", { behavior: "allow", downloadPath: artifacts });

    await send("Page.addScriptToEvaluateOnNewDocument", { source: `
        window.selecionarParTeste=async()=>{
            const esperar=async fn=>{for(let i=0;i<200;i++){if(fn())return;await new Promise(r=>setTimeout(r,20));}throw Error('Modal de recursos não respondeu');};
            const rows=[...document.querySelectorAll('#summary-lessons [data-selecao]')];const row=rows.find(n=>n.textContent.includes('Escolha instrutor'))||rows.at(-1);row.querySelector('button').click();await esperar(()=>document.querySelector('[data-instrutores] button'));document.querySelector('[data-instrutores] button').click();document.querySelector('[data-veiculos] button').click();document.querySelector('[data-confirmar]').click();await esperar(()=>!document.querySelector('.booking-resource-dialog'));
        };
        window.auditarContraste=seletor=>[...document.querySelectorAll(seletor)].filter(n=>n.getClientRects().length&&getComputedStyle(n).visibility!=='hidden').map(n=>{const st=getComputedStyle(n),rgb=s=>(s.match(/[0-9.]+/g)||[]).map(Number),fg=rgb(st.color);let el=n,bg;while(el){bg=rgb(getComputedStyle(el).backgroundColor);if(bg.length===3||bg[3]>0.99)break;el=el.parentElement;}const lum=c=>c.slice(0,3).map(v=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;}).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);if(!bg||bg.length<3)return null;const a=lum(fg),b=lum(bg),ratio=(Math.max(a,b)+.05)/(Math.min(a,b)+.05),min=parseFloat(st.fontSize)>=24||(parseFloat(st.fontSize)>=18.66&&Number(st.fontWeight)>=700)?3:4.5;return {elemento:n.tagName,classe:n.className,ratio,min};}).filter(v=>v&&v.ratio<v.min);
        addEventListener('DOMContentLoaded',()=>window.temaNaCarga=document.documentElement.dataset.theme);
        window.testCalls = [];
        window.fetch = async (...args) => {
            window.testCalls.push({ url: String(args[0]), options: args[1] });
            const resposta = JSON.parse(sessionStorage.getItem('test.response') || 'null');
            await new Promise(resolve => setTimeout(resolve, 120));
            if (!resposta) throw new TypeError('API indisponível no teste');
            return new Response(JSON.stringify(resposta.body), {status: resposta.status, headers: {'Content-Type':'application/json'}});
        };
    ` });
    const preencher = async (selector, value) => evaluate(`{ const el = document.querySelector(${JSON.stringify(selector)}); el.value = ${JSON.stringify(value)}; el.dispatchEvent(new Event('input',{bubbles:true})); }`);
    const submeter = async selector => evaluate(`document.querySelector(${JSON.stringify(selector)}).requestSubmit()`);
    async function testarAutomaticoAluno(){
        await navigate('/aluno/html/agendamento.html',"!!document.querySelector('#booking-mode-auto')");
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();sessionStorage.setItem('antes-auto',JSON.stringify(await servico.backup()));true");
        await check("!document.querySelector('.booking-content').hidden&&document.querySelector('#automatic-booking').hidden",'Manual é padrão e automático fica na mesma página');
        await evaluate("document.querySelector('#booking-mode-auto').click()");
        await check("document.querySelector('.booking-content').hidden&&!document.querySelector('#automatic-booking').hidden&&document.querySelector('#booking-mode-auto').getAttribute('aria-pressed')==='true'",'Alternância de modo preserva manual');
        await evaluate("document.querySelector('#auto-categoria').value='A';document.querySelector('#auto-categoria').dispatchEvent(new Event('input',{bubbles:true}))");
        await check("[...document.querySelectorAll('#automatic-booking [name=veiculos]')].length>0&&[...document.querySelectorAll('#automatic-booking [name=veiculos]')].every(i=>i.parentElement.textContent.includes('Moto'))&&!document.querySelector('#automatic-booking [name=dias][value=\"0\"]')",'Categoria A filtra motos e domingo não é oferecido');
        await evaluate("document.querySelector('#auto-categoria').value='B';document.querySelector('#auto-categoria').dispatchEvent(new Event('input',{bubbles:true}))");
        await evaluate("const f=document.querySelector('#automatic-booking form');f.elements.quantidade.value=21;document.querySelector('#auto-buscar').click()");
        await waitFor(()=>evaluate("document.querySelector('#auto-feedback').textContent.includes('saldo')"),'Saldo bloqueia quantidade excessiva');
        await evaluate("const f=document.querySelector('#automatic-booking form');f.elements.quantidade.value=3;f.querySelectorAll('[name=unidades]').forEach(i=>i.checked=['Cobilândia','Itaparica'].includes(i.value));f.dispatchEvent(new Event('input',{bubbles:true}));document.querySelector('#auto-salvar').click()");
        await waitFor(()=>evaluate("document.querySelector('#auto-feedback').textContent.includes('Preferências salvas')"),'Salvar preferências');
        await check("{const d=await servico.dadosAlunoLocal();d.aluno.preferenciasAutomaticas.alunoId===d.aluno.id&&d.aluno.preferenciasAutomaticas.unidades.length===2&&d.aulas.length===0&&d.resumo.categorias.B.disponiveis===20}",'Preferências pertencem ao aluno e não reservam nem consomem crédito');
        await navigate('/aluno/html/agendamento.html',"!!document.querySelector('#booking-mode-auto')");await evaluate("document.querySelector('#booking-mode-auto').click()");
        await check("document.querySelector('#auto-quantidade').value==='3'&&document.querySelectorAll('#automatic-booking [name=unidades]:checked').length===2",'Preferências persistem após recarregar');
        await evaluate("const f=document.querySelector('#automatic-booking form');for(const nome of ['instrutores','veiculos'])[...f.querySelectorAll('[name='+nome+']')].slice(0,2).forEach(i=>i.checked=true);f.dispatchEvent(new Event('input',{bubbles:true}));true");
        await check("document.querySelectorAll('#automatic-booking [name=instrutores]:checked').length===2&&document.querySelectorAll('#automatic-booking [name=veiculos]:checked').length===2",'Seleção múltipla de instrutores e veículos compatíveis');
        await evaluate("document.querySelector('#auto-buscar').click()");
        await waitFor(()=>evaluate("!!document.querySelector('#auto-confirmar')"),'Proposta real');
        await check("document.querySelectorAll('#auto-proposta li').length===3&&document.querySelector('#auto-feedback').textContent.includes('Ainda não estão reservados')&&(await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal()).aulas.length===0",'Busca produz proposta revisável sem gravação');
        for(const tema of ['light','dark'])for(const width of [1366,768,390]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema)+';document.querySelector("#auto-proposta").scrollIntoView({block:"center",behavior:"instant"})');await new Promise(r=>setTimeout(r,350));
            await check("document.documentElement.scrollWidth<=innerWidth&&auditarContraste('#automatic-booking h2,#automatic-booking p,#automatic-booking legend').length===0",'Automático responsivo e contraste '+tema+' '+width);await screenshot('automatico-'+tema+'-'+width+'.png');
        }
        await evaluate("document.querySelector('#auto-confirmar').click()");await waitFor(()=>evaluate("!!document.querySelector('#agendamentos-confirmados[open]')"),'Confirmar automático');
        await check("{const s=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal(),d=await s.dadosAlunoLocal();d.aulas.length===3&&d.aulas.every(a=>a.status===1)&&d.resumo.categorias.B.disponiveis===17&&document.querySelector('#agendamentos-confirmados').textContent.includes('Endereço')}",'Mesmo serviço salva três confirmadas e atualiza saldo e modal');
        await evaluate("document.querySelector('#agendamentos-confirmados').close()");
        await navigate('/aluno/html/minhas-aulas.html',"document.querySelectorAll('#lessons-list .student-local-lesson').length===3");
        await evaluate("document.querySelector('#lessons-list .local-lesson-cancel').click()");await waitFor(()=>evaluate("!!document.querySelector('.lesson-cancel-dialog[open]')"),'Modal tardio');
        await evaluate("document.querySelector('#lesson-cancel-reason').value='Motivos de saúde';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'))");
        await check("!document.querySelector('[data-health-guidance]').hidden&&document.querySelector('[data-health-guidance]').textContent.includes('72 horas')&&document.querySelector('[data-cancel-confirm]').disabled&&!document.querySelector('.cancel-consent').hidden",'Saúde mostra prazo e impede confirmação sem aceite de retenção');
        for(const tema of ['light','dark'])for(const width of [1366,390]){
            await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema));await new Promise(r=>setTimeout(r,350));
            await check("document.querySelector('.lesson-cancel-dialog').getBoundingClientRect().width<innerWidth&&auditarContraste('.lesson-cancel-dialog p,.lesson-cancel-dialog label,.lesson-cancel-dialog small').length===0",'Modal de atestado responsivo e contraste '+tema+' '+width);
            await evaluate("document.querySelector('[data-health-guidance]').scrollIntoView({block:'center',behavior:'instant'})");await screenshot('cancelamento-saude-'+tema+'-'+width+'.png');
        }
        await evaluate("document.querySelector('[data-health-guidance] a').addEventListener('click',e=>e.preventDefault(),{once:true});document.querySelector('[data-health-guidance] a').click()");
        await check("(await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal()).aulas.every(a=>!a.cancelamento)",'Abrir contato não registra atestado nem cancela uma aula');
        await evaluate("document.querySelector('[data-cancel-consent]').checked=true;document.querySelector('[data-cancel-consent]').dispatchEvent(new Event('change'));document.querySelector('[data-cancel-confirm]').click()");
        await waitFor(()=>evaluate("!document.querySelector('.lesson-cancel-dialog')&&document.querySelectorAll('#lessons-list .student-local-lesson').length===2"),'Cancelamento com atestado pendente');
        await check("{const d=await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal(),c=d.aulas.find(a=>a.status===2);d.resumo.categorias.B.disponiveis===17&&c.cancelamento.credito==='retido'&&c.cancelamento.frequencia==='justificativa_pendente'&&c.cancelamento.justificativa.estado==='aguardando_apresentacao'&&c.cancelamento.justificativa.resultado===null&&Date.parse(c.cancelamento.justificativa.prazoApresentacao)-Date.parse(c.cancelamento.em)===72*3600000}",'Saúde retém crédito, libera reserva, registra 72h e não aprova automaticamente');
        await check("{const servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal(),d=await servico.dadosAlunoLocal(),c=d.aulas.find(a=>a.status===2),horarios=await servico.disponibilidadeLocal({categoria:c.categoria,unidade:c.unidade,data:c.inicio.slice(0,10)});horarios.some(h=>h.hora===c.inicio.slice(11,16)&&h.pares.some(p=>p.instrutorId===c.instrutor&&p.veiculoId===c.veiculo))}",'Cancelamento com crédito retido libera instrutor e veículo no horário original');
        await evaluate("document.querySelector('[data-vista=canceladas]').click()");
        await check("document.querySelector('#past-lessons-list').textContent.includes('Aguardando apresentação')&&document.querySelector('#past-lessons-list').textContent.includes('Crédito retido')",'Histórico distingue cancelamento, falta, crédito e justificativa');
        await evaluate("document.querySelector('[data-vista=confirmadas]').click();document.querySelector('#lessons-list .local-lesson-cancel').click()");
        await evaluate("document.querySelector('#lesson-cancel-reason').value='Motivos pessoais';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'))");
        await check("document.querySelector('.lesson-cancel-policy p').textContent.includes('não será devolvido')&&document.querySelector('[data-health-guidance]').hidden",'Cancelamento tardio pessoal mostra perda de crédito sem orientação médica');
        await evaluate("document.querySelector('[data-cancel-consent]').checked=true;document.querySelector('[data-cancel-consent]').dispatchEvent(new Event('change'));document.querySelector('[data-cancel-confirm]').click()");await waitFor(()=>evaluate("!document.querySelector('.lesson-cancel-dialog')"),'Cancelamento pessoal');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.antesRetidos=await servico.backup();window.saldoRetidos=(await servico.dadosAlunoLocal()).resumo;window.retidos=(await servico.planoCancelamentosTeste()).candidatos.filter(c=>c.registro.cancelamento?.credito==='retido');true");
        await evaluate("window.alvoOrigem=retidos[0].registro;await servico.salvar({...alvoOrigem,operacaoId:'origem-desconhecida'});window.planoOrigem=await servico.planoCancelamentosTeste();await servico.salvar(alvoOrigem);window.putCreditoOriginal=IDBObjectStore.prototype.put;IDBObjectStore.prototype.put=function(r){if(this.name==='creditos')throw new DOMException('Falha contábil isolada','DataCloneError');return putCreditoOriginal.call(this,r);};try{window.falhaRetidos=await Promise.allSettled([servico.limparCancelamentosTeste({ids:retidos.map(c=>c.registro.id),registrosConfirmados:retidos.map(c=>c.registro),confirmarTestes:true})]);}finally{IDBObjectStore.prototype.put=putCreditoOriginal;}true");
        await check("!planoOrigem.candidatos.find(c=>c.registro.id===alvoOrigem.id).elegivel&&falhaRetidos[0].status==='rejected'&&JSON.stringify(await servico.backup())===JSON.stringify(antesRetidos)",'Origem não verificável permanece protegida e falha contábil reverte exclusão inteira');
        await check("retidos.length===2&&retidos.every(c=>c.elegivel)",'Dois cancelamentos locais retidos, inclusive saúde, são selecionáveis');
        await evaluate("document.querySelector('[data-vista=canceladas]').click();document.querySelector('#cleanup-cancelamentos').open=true;document.querySelectorAll('#cleanup-cancelamentos input:not(:disabled)').forEach(n=>n.click());document.querySelector('#cleanup-cancelamentos button').click()");
        for(const tema of ['light','dark']){await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema));await check("document.querySelector('dialog').getBoundingClientRect().width<innerWidth&&document.querySelector('[data-cleanup-confirm]').disabled",'Revisão de retidos compacta e protegida '+tema);await screenshot('limpeza-retidos-'+tema+'.png');}
        await check("document.querySelector('.cleanup-review').children.length===2&&document.querySelector('.cleanup-review').textContent.includes('Crédito retido')&&document.querySelector('#cleanup-cancelamentos button').textContent.includes('(2)')",'Seleção múltipla mostra quantidade e retenção na revisão');
        await evaluate("document.querySelector('[data-cleanup-back]').click()");
        await check("JSON.stringify(await servico.backup())===JSON.stringify(antesRetidos)",'Voltar preserva históricos e créditos retidos');
        await evaluate("document.querySelector('#cleanup-cancelamentos button').click();document.querySelector('[data-cleanup-consent]').click();document.querySelector('[data-cleanup-confirm]').click()");
        await waitFor(()=>evaluate("!document.querySelector('dialog')&&document.querySelector('#cleanup-cancelamentos').textContent.includes('excluídos com sucesso')"),'Excluir retidos com preservação contábil');
        await evaluate("window.depoisRetidos=await servico.backup();true");
        await check("JSON.stringify((await servico.dadosAlunoLocal()).resumo)===JSON.stringify(saldoRetidos)&&depoisRetidos.creditos[0].consumosPreservadosLimpeza.length===2&&JSON.stringify(depoisRetidos.creditos[0].categorias)===JSON.stringify(antesRetidos.creditos[0].categorias)&&JSON.stringify(depoisRetidos.registros)===JSON.stringify(antesRetidos.registros.filter(r=>!retidos.some(c=>c.registro.id===r.id)))",'Exclusão retém consumo, justificativa e totais sem alterar os demais registros');
        await navigate('/aluno/html/minhas-aulas.html',"!!document.querySelector('#cleanup-cancelamentos')");
        await check("{const d=await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal();d.aulas.length===1&&d.resumo.categorias.B.disponiveis===17&&d.credito.consumosPreservadosLimpeza.some(r=>r.cancelamento.justificativa?.estado==='aguardando_apresentacao')}",'Recarregar não restaura cancelamentos nem libera créditos retidos');
        // Simula um cadastro legado somente neste perfil descartável.
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();await servico.salvarAntecipacao({ativo:true,notificacoes:false,categorias:['B'],unidades:['Itaparica'],dias:[1],horarios:['07:00'],observacoes:'Preferência antiga preservada'});sessionStorage.setItem('aulas-antes-avisos',JSON.stringify((await servico.dadosAlunoLocal()).aulas));true");
        await navigate('/aluno/html/meu-perfil.html',"!!document.querySelector('#student-anticipation')");
        await check("document.querySelector('#student-anticipation h2').textContent==='Avisos de antecipação'&&document.querySelectorAll('#student-anticipation input').length===1&&!document.querySelector('#student-anticipation details,#student-anticipation select,#student-anticipation textarea')&&!document.querySelector('#student-anticipation [name=ativo]')&&!document.querySelector('#student-anticipation [name=notificacoes]').checked",'Antecipação exibe só uma preferência de avisos e nenhum campo legado');
        await evaluate("document.querySelector('#student-anticipation [name=notificacoes]').checked=true;document.querySelector('#student-anticipation [name=notificacoes]').dispatchEvent(new Event('change'));document.querySelector('.anticipation-hours [data-hour=\"08:00\"]').click();document.querySelector('#student-anticipation form').requestSubmit()");await waitFor(()=>evaluate("document.querySelector('#anticipation-status').textContent==='Suas preferências de antecipação foram salvas.'"),'Ativar avisos');
        await navigate('/aluno/html/meu-perfil.html',"!!document.querySelector('#student-anticipation')");
        await check("document.querySelector('#student-anticipation [name=notificacoes]').checked",'Avisos ativos persistem após recarregar');
        await evaluate("document.querySelector('#student-anticipation [name=notificacoes]').checked=false;document.querySelector('#student-anticipation form').requestSubmit()");await waitFor(()=>evaluate("document.querySelector('#anticipation-status').textContent==='Suas preferências de antecipação foram salvas.'"),'Desativar avisos');
        await navigate('/aluno/html/meu-perfil.html',"!!document.querySelector('#student-anticipation')");
        await check("{const d=await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal(),p=d.aluno.antecipacao;!document.querySelector('#student-anticipation [name=notificacoes]').checked&&!p.ativo&&!p.notificacoes&&p.alunoId===d.aluno.id&&p.unidadeVinculo==='Cobilândia'&&p.atualizadoEm&&p.unidades[0]==='Itaparica'&&p.observacoes==='Preferência antiga preservada'&&JSON.stringify(d.aulas)===sessionStorage.getItem('aulas-antes-avisos')&&d.resumo.categorias.B.disponiveis===17}",'Desativação persiste sem apagar dados antigos, aulas, histórico ou créditos');
        for(const tema of ['light','dark']) {await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema));await new Promise(r=>setTimeout(r,350));await check("document.documentElement.scrollWidth<=innerWidth&&auditarContraste('#student-anticipation h2,#student-anticipation p').length===0",'Avisos responsivos no tema '+tema);await evaluate("document.querySelector('#student-anticipation').scrollIntoView({block:'center',behavior:'instant'})");await screenshot('antecipacao-'+tema+'.png');}
        // Exercita atomicidade multiunidade, política pontual e isolamento sem usar dados do usuário.
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.cal=await import('/shared/js/calendario.js');window.diaFuturo=cal.somarDias(cal.hojeBrasil(),21);while((await import('/shared/js/disponibilidade.js')).motivoFechamento(diaFuturo))diaFuturo=cal.somarDias(diaFuturo,1);window.itensMulti=[];for(const [u,hora] of [['Cobilândia','07:00'],['Itaparica','08:00']]){const h=(await servico.disponibilidadeLocal({categoria:'A',unidade:u,data:diaFuturo})).find(h=>h.hora===hora);itensMulti.push({data:diaFuturo,hora,unidade:u,...h.pares[0]});}window.antesMulti=JSON.stringify(await servico.backup());window.addOriginal=IDBObjectStore.prototype.add;window.contadorMulti=0;IDBObjectStore.prototype.add=function(r){if(r.tipo==='aula'&&++contadorMulti===2)throw new DOMException('Falha multiunidade','DataCloneError');return addOriginal.call(this,r);};window.falhaMulti=await Promise.allSettled([servico.reservarAulasLocais({categoria:'A',operacaoId:crypto.randomUUID(),aulas:itensMulti})]);IDBObjectStore.prototype.add=addOriginal;true");
        await check("falhaMulti[0].status==='rejected'&&JSON.stringify(await servico.backup())===antesMulti",'Falha em multiunidade não grava nem desconta parcialmente');
        await evaluate("window.operacaoMulti=crypto.randomUUID();window.multi=await servico.reservarAulasLocais({categoria:'A',operacaoId:operacaoMulti,aulas:itensMulti});window.repetidas=await servico.reservarAulasLocais({categoria:'A',operacaoId:operacaoMulti,aulas:itensMulti});true");
        await check("multi.length===2&&multi[0].unidade!==multi[1].unidade&&multi.every((a,i)=>a.id===repetidas[i].id)&&(await servico.dadosAlunoLocal()).resumo.categorias.A.disponiveis===18",'Lote multiunidade é atômico, idempotente e consome só dois créditos');
        await check("(await servico.consultarPoliticaCancelamento(multi[0].id)).dentroPrazo",'Cancelamento distante respeita as 48 horas úteis');
        const pontualId=await evaluate('multi[0].id');await evaluate("sessionStorage.setItem('lote-pontual',JSON.stringify(multi))");
        await navigate('/aluno/html/minhas-aulas.html',"document.querySelectorAll('#lessons-list .student-local-lesson').length>0");
        await evaluate('document.querySelector('+JSON.stringify('[data-aula-local="'+pontualId+'"] .local-lesson-cancel')+').click()');
        await evaluate("document.querySelector('#lesson-cancel-reason').value='Motivos de saúde';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'))");
        await check("document.querySelector('.lesson-cancel-policy p').textContent==='Cancelamento dentro do prazo. O crédito desta aula será devolvido ao seu saldo.'&&document.querySelector('.cancel-consent').hidden&&document.querySelector('[data-health-guidance]').hidden&&!document.querySelector('[data-cancel-confirm]').disabled",'Saúde dentro do prazo não mostra penalidade, ciência nem atestado obrigatório');
        await screenshot('cancelamento-dentro-do-prazo.png');await evaluate("document.querySelector('[data-cancel-confirm]').click()");await waitFor(()=>evaluate("!document.querySelector('.lesson-cancel-dialog')"),'Confirmar cancelamento sem penalidade');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.multi=JSON.parse(sessionStorage.getItem('lote-pontual'));window.canceladaPontual=await servico.cancelarReservaLocal(multi[0].id,'Motivos pessoais');true");
        await check("canceladaPontual.status===2&&canceladaPontual.cancelamento.credito==='devolvido'&&(await servico.dadosAlunoLocal()).resumo.categorias.A.disponiveis===19",'Cancelamento pontual devolve uma vez sem penalidade');
        await evaluate("await servico.salvar({id:'outro-aluno-teste',tipo:'aluno',documento:'52998224725',nome:'Outro aluno de teste',unidade:'Itaparica'});await servico.salvarAntecipacao({alunoId:'outro-aluno-teste',ativo:true,notificacoes:false});true");
        await check("{const d=await servico.dadosAlunoLocal();!d.registros.find(r=>r.id==='outro-aluno-teste').antecipacao&&d.aluno.antecipacao.alunoId===d.aluno.id}",'ID de outro aluno não altera o destinatário das preferências');
        await evaluate("window.protegida=JSON.stringify(await servico.backup());(await import('/dev/sessao.js')).entrarDemo('1','teste','instrutor');window.semPermissao=await Promise.allSettled([servico.salvarAvisosAntecipacao(true),servico.salvarAntecipacao({ativo:false,notificacoes:false}),servico.salvarPreferenciasAutomaticas({}),servico.cancelarReservaLocal(multi[1].id,'Motivos pessoais')]);(await import('/dev/sessao.js')).entrarDemo('1','teste','aluno');true");
        await check("semPermissao.every(r=>r.status==='rejected')&&JSON.stringify(await servico.backup())===protegida",'Preferências e cancelamento exigem sessão local de Aluno');
    }
    async function testarPreferenciasAntecipacao(){
        await navigate('/aluno/html/meu-perfil.html',"!!document.querySelector('#student-anticipation')");
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();await servico.salvar({id:'outro-aluno-preferencias',tipo:'aluno',nome:'Outro aluno somente no teste isolado',documento:'33344455566',unidade:'Itaparica',antecipacao:{ativo:false,notificacoes:false}});window.antesPreferencias=await servico.backup();sessionStorage.setItem('antes-preferencias',JSON.stringify(antesPreferencias.creditos));sessionStorage.setItem('registros-preferencias',JSON.stringify(antesPreferencias.registros));true");
        await check("document.querySelector('#anticipation-availability').hidden&&!document.querySelector('[name=notificacoes]').checked",'Preferência inicialmente compacta sem escolhas automáticas');
        await evaluate("document.querySelector('[name=notificacoes]').click();document.querySelector('#student-anticipation form').requestSubmit()");await waitFor(()=>evaluate("document.querySelector('#anticipation-status').textContent.includes('pelo menos')"),'Validar disponibilidade vazia');
        await check("JSON.stringify(await servico.backup())===JSON.stringify(antesPreferencias)",'Ativação sem horário é recusada sem gravar');
        for(let d=1;d<=6;d++){const selector=JSON.stringify('[data-day="'+d+'"]');await evaluate('document.querySelector('+selector+').click()');await check('document.querySelector('+selector+').dataset.open==="true"&&document.querySelectorAll(".anticipation-hours button").length==='+ (d===6?5:10),'Dia '+d+' utiliza grade operacional correta');}
        await check("document.querySelectorAll('.anticipation-days button').length===6&&![...document.querySelectorAll('.anticipation-hours button')].some(b=>['12:00','13:00','14:00'].includes(b.textContent))",'Domingo e horários inválidos de sábado não são oferecidos');
        await evaluate("document.querySelector('[data-day=\"1\"]').click();document.querySelector('[data-hour=\"08:00\"]').click();document.querySelector('[data-hour=\"09:00\"]').click();document.querySelector('[data-day=\"3\"]').click();document.querySelector('[data-hour=\"14:00\"]').click();document.querySelector('[data-day=\"6\"]').click();document.querySelector('[data-hour=\"09:00\"]').click();document.querySelector('[data-day=\"1\"]').click()");
        await check("document.querySelector('[data-hour=\"08:00\"]').getAttribute('aria-pressed')==='true'&&document.querySelector('[data-hour=\"09:00\"]').getAttribute('aria-pressed')==='true'&&document.querySelector('#anticipation-summary').textContent.includes('3 dias selecionados · 4 horários')",'Dias mantêm horários independentes ao alternar e resumo usa escolhas reais');
        await evaluate("document.querySelector('[data-hour=\"09:00\"]').click();document.querySelector('[data-day=\"3\"]').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        await check("document.querySelector('[data-day=\"3\"]').dataset.open==='true'&&document.querySelector('[data-hour=\"14:00\"]').getAttribute('aria-pressed')==='true'&&document.querySelector('#anticipation-summary').textContent.includes('3 horários')",'Teclado alterna dias; desmarcar horário preserva demais escolhas');
        await evaluate("document.querySelector('#student-anticipation form').requestSubmit()");await waitFor(()=>evaluate("document.querySelector('#anticipation-status').textContent==='Suas preferências de antecipação foram salvas.'"),'Salvar dias e horários');
        await navigate('/aluno/html/meu-perfil.html',"!!document.querySelector('#student-anticipation')");
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.salvas=await servico.dadosAlunoLocal();window.copiaAntesOff=structuredClone(salvas.aluno.antecipacao.disponibilidade);true");
        await check("salvas.aluno.antecipacao.disponibilidade[1].join()==='08:00'&&salvas.aluno.antecipacao.disponibilidade[3].join()==='14:00'&&salvas.aluno.antecipacao.disponibilidade[6].join()==='09:00'&&salvas.aluno.antecipacao.alunoId===salvas.aluno.id&&salvas.aluno.antecipacao.unidadeVinculo===salvas.aluno.unidade&&!!salvas.aluno.antecipacao.atualizadoEm",'IndexedDB persiste horários por dia, identidade e unidade após recarga');
        await check("{const antes=JSON.parse(sessionStorage.getItem('registros-preferencias')),depois=(await servico.backup()).registros;JSON.stringify(antes.filter(r=>r.id!==salvas.aluno.id))===JSON.stringify(depois.filter(r=>r.id!==salvas.aluno.id))&&JSON.stringify(antes.filter(r=>r.tipo==='aula'))===JSON.stringify(depois.filter(r=>r.tipo==='aula'))}",'Preferências não modificam outras contas, recursos ou aulas');
        await evaluate("window.antesInvalido=JSON.stringify(await servico.backup());window.invalidas=await Promise.allSettled([servico.salvarAvisosAntecipacao(true,{7:['08:00']}),servico.salvarAvisosAntecipacao(true,{6:['14:00']}),servico.salvarAvisosAntecipacao(true,{1:['12:00']}),servico.salvarAvisosAntecipacao(true,{alunoId:'outro-aluno-preferencias'})]);true");
        await check("invalidas.every(r=>r.status==='rejected')&&JSON.stringify(await servico.backup())===antesInvalido",'Serviço rejeita domingo, almoço, sábado à tarde e identificador de outro aluno sem gravar');
        for(const tema of ['light','dark'])for(const width of [1366,390]){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema));await new Promise(r=>setTimeout(r,350));await evaluate("document.querySelector('#student-anticipation').scrollIntoView({block:'center',behavior:'instant'})");await check("document.documentElement.scrollWidth<=innerWidth&&auditarContraste('#anticipation-availability p,#anticipation-availability button').length===0",'Preferências responsivas e legíveis '+tema+' '+width);await screenshot('preferencias-dias-'+tema+'-'+width+'.png');}
        await evaluate("document.querySelector('[name=notificacoes]').click();document.querySelector('#student-anticipation form').requestSubmit()");await waitFor(()=>evaluate("document.querySelector('#anticipation-status').textContent.includes('foram salvas')"),'Desativar mantendo escolhas');await navigate('/aluno/html/meu-perfil.html',"!!document.querySelector('#student-anticipation')");
        await check("{const s=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal(),d=await s.dadosAlunoLocal();!d.aluno.antecipacao.ativo&&!d.aluno.antecipacao.notificacoes&&d.aluno.antecipacao.disponibilidade[3].join()==='14:00'&&document.querySelector('#anticipation-availability').hidden&&JSON.stringify((await s.backup()).creditos)===JSON.stringify(JSON.parse(sessionStorage.getItem('antes-preferencias')||'null'))}",'Desativação mantém escolhas sem tornar aluno elegível');
    }
    async function testarLocalizacaoAluno(){
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.catalogo=await import('/shared/js/catalogoUnidades.js');window.cal=await import('/shared/js/calendario.js');window.dia=cal.somarDias(cal.hojeBrasil(),21);while((await import('/shared/js/disponibilidade.js')).motivoFechamento(dia))dia=cal.somarDias(dia,1);window.reservasEndereco=[];for(const [i,u] of catalogo.UNIDADES_INSTITUCIONAIS.entries()){const horarios=await servico.disponibilidadeLocal({categoria:'B',unidade:u.id,data:dia});const h=horarios[0];const a=await servico.reservarAulaLocal({categoria:'B',unidade:u.id,data:dia,hora:h.hora,...h.pares[0],operacaoId:crypto.randomUUID()});reservasEndereco.push(a);}sessionStorage.setItem('snapshot-enderecos',JSON.stringify(await servico.backup()));true");
        await navigate('/aluno/html/minhas-aulas.html',"document.querySelectorAll('#lessons-list .student-local-lesson').length===6");
        await check("{const cat=await import('/shared/js/catalogoUnidades.js');[...document.querySelectorAll('#lessons-list article')].every(n=>{const a=JSON.parse(sessionStorage.getItem('snapshot-enderecos')).registros.find(r=>r.id===n.dataset.aulaLocal);const u=cat.obterUnidadeInstitucional(a.unidade);const local=n.querySelector('.confirmed-lesson-location');return local&&local.textContent.includes(u.enderecoCompleto)&&n.querySelectorAll('.unit-location').length===1&&local.querySelector('a').href===cat.pesquisaMapsUnidade(a.unidade)&&local.querySelector('a').target==='_blank'&&local.querySelector('a').rel.includes('noopener');})}",'Seis reservas exibem endereço centralizado e Maps correspondente, sem duplicação');
        await check("document.querySelectorAll('#lesson-attendance').length===1&&document.querySelector('#lesson-attendance').textContent.includes('10 minutos')&&document.querySelector('#lesson-attendance').textContent.includes('documento oficial de identificação com foto')&&document.querySelector('#lesson-attendance').textContent.includes('LADV')",'Orientações únicas com antecedência e documentos');
        await evaluate("document.querySelector('[data-vista=canceladas]').click()");await check("document.querySelector('#lesson-attendance').closest('section').hidden",'Canceladas não exibem orientação de comparecimento');await evaluate("document.querySelector('[data-vista=confirmadas]').click()");
        for(const pagina of ['minhas-aulas.html','dashboard.html']){await navigate('/aluno/html/'+pagina,"document.body.dataset.sipaLocal==='aluno'&&!!document.querySelector('.unit-location')");for(const tema of ['light','dark'])for(const width of [1366,390]){await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema));await new Promise(r=>setTimeout(r,350));await check("document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.unit-location p')].every(n=>n.scrollWidth<=n.clientWidth)&&auditarContraste('.unit-location p,.lesson-attendance p').length===0",'Local e documentos legíveis sem transbordar '+pagina+' '+tema+' '+width);await evaluate("document.querySelector('.unit-location').scrollIntoView({block:'center',behavior:'instant'})");await screenshot('local-aula-'+pagina+'-'+tema+'-'+width+'.png');}}
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.dadosEnd=await servico.dadosAlunoLocal();window.apresentar=(await import('/aluno/js/dashboard.js')).apresentarDashboard;window.cat=await import('/shared/js/catalogoUnidades.js');window.todasUnidades=dadosEnd.aulas.every(a=>{apresentar({...dadosEnd,aulas:[a]});return document.querySelector('#proxima-aula-conteudo').textContent.includes(cat.obterUnidadeInstitucional(a.unidade).enderecoCompleto);});apresentar(dadosEnd);true");
        await check("todasUnidades&&dadosEnd.aluno.unidade==='Cobilândia'&&JSON.stringify(await servico.backup())===sessionStorage.getItem('snapshot-enderecos')",'Dashboard resolve as seis unidades da reserva e apresentação não altera o IndexedDB');
        await evaluate("window.modDash=await import('/aluno/js/dashboard.js');window.dApi=await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal();window.enderecoApi=(await import('/shared/js/catalogoUnidades.js')).obterUnidadeInstitucional('Itaparica').enderecoCompleto;modDash.apresentarDashboard({...dApi,integrado:true,aulas:[{...dApi.aulas[0],unidade:'Nome fornecido pela API',localAula:enderecoApi}]});true");
        await check("document.querySelector('#proxima-aula-conteudo .unit-location p').textContent===enderecoApi&&new URL(document.querySelector('#proxima-aula-conteudo .unit-map-link').href).searchParams.get('query')===enderecoApi",'Modo integrado usa o endereço localAula da reserva, sem inferir unidade pelo nome');
        await evaluate("window.primeira=[...dadosEnd.aulas].sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio))[0];await servico.cancelarReservaLocal(primeira.id,'Motivos pessoais');true");await navigate('/aluno/html/dashboard.html',"!!document.querySelector('#proxima-aula-conteudo .unit-location')");
        await check("{const d=await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal(),a=d.aulas.filter(a=>a.status===1).sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio))[0],cat=await import('/shared/js/catalogoUnidades.js');document.querySelector('#proxima-aula-conteudo .unit-location').textContent.includes(cat.obterUnidadeInstitucional(a.unidade).enderecoCompleto)}",'Dashboard passa a mostrar o endereço da próxima confirmada após cancelamento');
        await evaluate("(await import('/aluno/js/dashboard.js')).apresentarDashboard({aulas:[]})");await check("!document.querySelector('#proxima-aula-conteudo .unit-location,#proxima-aula-conteudo .lesson-attendance')",'Sem aula não apresenta endereço nem orientação');
    }
    async function testarCalendarioAcessivel() {
        await navigate('/aluno/html/agendamento.html', "document.querySelectorAll('#calendar-days button').length===42");
        await check("{const hoje=(await import('/shared/js/calendario.js')).hojeBrasil();const b=document.querySelector('#calendar-days [aria-current=date]');!!b&&b.dataset.dataLocal===hoje}",'Dia atual usa a data civil de São Paulo');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();const r=(await servico.backup()).registros.find(r=>['instrutor','veiculo'].includes(r.tipo)&&r.unidade==='Cobilândia');await servico.salvarRecursoLocal({...r,feriadosUnidade:r.feriadosUnidade||[]});true");
        const snapshot=await evaluate("JSON.stringify(await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).backup())");
        await waitFor(()=>evaluate("!!document.querySelector('#booking-mode-auto')"),'Seletor de modalidades');
        await check("!document.querySelector('.booking-steps,.booking-step')&&document.querySelector('main h1').textContent.trim()==='Agende sua aula'&&document.querySelector('.booking-header p').textContent.trim()==='Escolha a categoria, a unidade e os horários disponíveis.'",'Cabeçalho objetivo e stepper removido do HTML');
        await check("document.querySelectorAll('.category-option-icon svg').length===2&&document.querySelector('#booking-motorcycle path[fill=\"currentColor\"]')&&![...document.querySelector('main').textContent].some(c=>['🚗','🏍','🏠','📚','📅','👤'].includes(c))&&!!document.querySelector('#configurar-recursos-locais').closest('.booking-diagnostics')",'SVGs monocromáticos reaproveitados e diagnóstico isolado');
        for(const tema of ['light','dark'])for(const [width,height] of [[1920,1080],[1366,900],[768,1024],[390,844]]){
            await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema)+';scrollTo({top:0,behavior:"instant"})');await new Promise(r=>setTimeout(r,350));
            await check("document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.category-option')].every(b=>b.getBoundingClientRect().height>=44&&b.getBoundingClientRect().height<=82)&&getComputedStyle(document.querySelector('.booking-student-info')).backgroundColor==='rgba(0, 0, 0, 0)'&&document.querySelector('.booking-student-info').getBoundingClientRect().height<70",'Categorias e resumo compactos '+tema+' '+width);
            await check("auditarContraste('.booking-header h1,.booking-header p,.booking-card-header h2,.category-option-info strong,.category-option-info span,#booking-package-info,.calendar-weekdays span,.calendar-day:not(:disabled),.calendar-legend li,.booking-unit-local label,.unit-location p,.empty-time-state p').length===0",'Contraste da hierarquia, saldo, unidade e calendário '+tema+' '+width);
            await check('(()=>{const unit=document.querySelector("#booking-unit-picker").getBoundingClientRect(),cal=document.querySelector(".calendar-area").getBoundingClientRect(),time=document.querySelector(".time-area").getBoundingClientRect();return '+(width>=1366?'unit.bottom<=cal.top&&Math.abs(cal.top-time.top)<2&&cal.right<=time.left':'time.top>=cal.bottom')+'})()', 'Unidade e calendário agrupados com horários bem distribuídos '+width);
            await check("{const t=document.querySelector('.sipa-theme-toggle').getBoundingClientRect(),h=document.querySelector('.booking-header-left').getBoundingClientRect(),b=document.querySelector('.back-dashboard'),r=b.getBoundingClientRect();h.right<=t.left+1&&(!r.width||r.right<=t.left-8)&&((getComputedStyle(document.querySelector('#booking-mobile-menu')).display==='none')==="+(width>760?'true':'false')+")}",'Cabeçalho sem sobreposição e menu contextual '+tema+' '+width);
            await screenshot('agendamento-refinado-'+tema+'-'+width+'.png');
            await evaluate("document.querySelector('.schedule-card').scrollIntoView({block:'start',behavior:'instant'})");await screenshot('calendario-refinado-'+tema+'-'+width+'.png');
        }
        await evaluate("document.querySelector('#booking-mobile-menu').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        await check("document.querySelector('.sipa-sidebar').classList.contains('mobile-open')&&document.querySelector('#booking-mobile-menu').getAttribute('aria-expanded')==='true'",'Menu móvel abre por teclado e informa seu estado');
        await evaluate("document.querySelector('#booking-mobile-menu').click()");
        await evaluate("document.documentElement.dataset.theme='light';document.querySelector('#booking-mode-auto').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        await check("!document.querySelector('#automatic-booking').hidden&&document.querySelector('.booking-content').hidden",'Seletor automático acessível por teclado sem depender do stepper');
        await evaluate("document.querySelector('#booking-mode-manual').click()");

        await check("{const hoje=(await import('/shared/js/calendario.js')).hojeBrasil();const passados=[...document.querySelectorAll('#calendar-days button')].filter(b=>b.dataset.dataLocal<hoje);passados.length>0&&passados.every(b=>b.disabled&&b.querySelectorAll('.calendar-block-mark').length===1&&b.getAttribute('aria-label').includes('Data passada'))}",'Datas passadas mantêm número, risco único, motivo e disabled');
        await evaluate("window.dataAntesBloqueio=document.querySelector('#selected-date-label').textContent;document.querySelector('#calendar-days button:disabled').click();true");
        await check("document.querySelector('#selected-date-label').textContent===dataAntesBloqueio",'Clique em data bloqueada não altera seleção');
        await check("document.querySelector('.calendar-legend').textContent.includes('Selecionado')&&document.querySelector('.calendar-reasons summary')&&document.querySelectorAll('#calendar-block-reasons li').length>0",'Legenda e motivos acessíveis por toque e teclado');
        await evaluate("document.querySelector('.calendar-reasons summary').focus()");
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        await check("document.querySelector('.calendar-reasons').open",'Teclado abre motivos de bloqueio');
        await evaluate("document.querySelector('.calendar-reasons').open=false;document.querySelector('#calendar-days button[data-disponivel=true]:not(:disabled)').focus()");
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});
        await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
        await waitFor(()=>evaluate("document.querySelector('#calendar-days button.selected[aria-pressed=true]')&&document.querySelector('#time-slots button')"),'Seleção por teclado');
        await check("!document.querySelector('#calendar-days button.selected .calendar-block-mark')",'Data disponível selecionada por teclado sem risco');
        for(const ano of [2026,2027,2028]) {
            const alvo=ano+'-12-25';
            for(let n=0;n<40;n++) {
                if(await evaluate('!!document.querySelector('+JSON.stringify('#calendar-days button[data-data-local="'+alvo+'"]:not([disabled])')+')'))throw Error('Natal liberado');
                if(await evaluate('!!document.querySelector('+JSON.stringify('#calendar-days button[data-data-local="'+alvo+'"]')+')'))break;
                const anterior=await evaluate("document.querySelector('#calendar-month').textContent");
                await evaluate("document.querySelector('#next-month').click()");
                await waitFor(()=>evaluate('document.querySelectorAll("#calendar-days button").length===42&&document.querySelector("#calendar-month").textContent!=='+JSON.stringify(anterior)),'Navegar mês e ano');
            }
            await check('!!document.querySelector('+JSON.stringify('#calendar-days button[data-data-local="'+alvo+'"]:disabled .calendar-block-mark')+')&&document.querySelector('+JSON.stringify('#calendar-days button[data-data-local="'+alvo+'"]')+').getAttribute("aria-label").includes("Natal")','Natal bloqueado com risco e nome '+ano);
        }
        await check("[...document.querySelectorAll('#calendar-days button')].filter(b=>b.getAttribute('aria-label').includes('Domingo')).every(b=>b.disabled&&b.querySelector('.calendar-block-mark'))",'Domingos mantêm bloqueio e motivo distinto');
        for(const tema of ['light','dark']) for(const width of [1366,768,390]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
            await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema)+';document.querySelector(".calendar-area").scrollIntoView({block:"center",behavior:"instant"})');
            await new Promise(resolve=>setTimeout(resolve,350)); // Aguarda a transição existente de tema.
            await check("document.documentElement.scrollWidth<=innerWidth&&[...document.querySelectorAll('.calendar-block-mark')].every(x=>{const r=x.getBoundingClientRect(),b=x.parentElement.getBoundingClientRect();return r.left>=b.left&&r.right<=b.right&&r.top>=b.top&&r.bottom<=b.bottom})",'Grade e risco sem transbordamento '+tema+' '+width);
            await check("auditarContraste('.calendar-blocked,.calendar-legend li,.calendar-reasons summary').length===0",'Contraste do risco, legenda e motivos '+tema+' '+width);
            await check("{const b=document.querySelector('.calendar-blocked'),m=b.querySelector('.calendar-block-mark'),st=getComputedStyle(m),normal=document.querySelector('#calendar-days button:not(:disabled):not(.selected)'),lum=n=>getComputedStyle(n).backgroundColor.match(/[0-9.]+/g).slice(0,3).map(Number).reduce((s,v,i)=>s+v*[.2126,.7152,.0722][i],0);m.textContent===''&&getComputedStyle(m,'::after').backgroundImage.includes('to left bottom')&&m.getBoundingClientRect().height>=b.clientHeight-1&&m.getBoundingClientRect().width>=b.clientWidth-1&&getComputedStyle(b).overflow==='hidden'&&!!b.querySelector('.calendar-day-number')&&lum(b)<lum(normal)&&!document.querySelector('.calendar-key-x')}",'Diagonal acompanha a célula com número protegido e fundo escuro '+tema+' '+width);
            await screenshot('calendario-acessivel-'+tema+'-'+width+'.png');
        }
        await check('JSON.stringify(await (await (await import("/dev/aluno/authLocal.js")).criarServicoLocal()).backup())==='+JSON.stringify(snapshot),'Navegação preserva integralmente dados, recursos, aulas e créditos');
        // Recursos temporariamente indisponíveis só no perfil descartável deste teste.
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.recursosCalendario=(await servico.backup()).registros.filter(r=>['instrutor','veiculo'].includes(r.tipo)&&r.unidade==='Cobilândia');sessionStorage.setItem('recursos-calendario-teste',JSON.stringify(recursosCalendario));for(const r of recursosCalendario)await servico.salvarRecursoLocal({...r,disponivel:false});true");
        await navigate('/aluno/html/agendamento.html',"document.querySelectorAll('#calendar-days button').length===42");
        await check("[...document.querySelectorAll('#calendar-days button.sem-disponibilidade:not(:disabled)')].some(b=>!b.querySelector('.calendar-block-mark')&&b.getAttribute('aria-label').includes('Sem horários'))",'Falta de recursos não vira feriado nem recebe risco');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();for(const r of JSON.parse(sessionStorage.getItem('recursos-calendario-teste')))await servico.salvarRecursoLocal(r);true");
        await navigate('/aluno/html/agendamento.html',"document.querySelectorAll('#calendar-days button').length===42");
        await evaluate("window.feriadoTeste=document.querySelector('#calendar-days button[data-disponivel=true]:not(:disabled)').dataset.dataLocal;sessionStorage.setItem('feriado-calendario-teste',feriadoTeste);window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.recursoTeste=JSON.parse(sessionStorage.getItem('recursos-calendario-teste'))[0];await servico.salvarRecursoLocal({...recursoTeste,feriadosUnidade:[...(recursoTeste.feriadosUnidade||[]),feriadoTeste]});true");
        await navigate('/aluno/html/agendamento.html',"document.querySelectorAll('#calendar-days button').length===42");
        await check("{const b=[...document.querySelectorAll('#calendar-days button')].find(b=>b.dataset.dataLocal===sessionStorage.getItem('feriado-calendario-teste'));b.disabled&&!!b.querySelector('.calendar-block-mark')&&b.getAttribute('aria-label').includes('Feriado cadastrado da unidade')}",'Feriado explicitamente cadastrado da unidade recebe risco e bloqueio');
        await check("{const servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal(),recursos=JSON.parse(sessionStorage.getItem('recursos-calendario-teste')),i=recursos.find(r=>r.tipo==='instrutor'&&r.categorias.includes('B')),v=recursos.find(r=>r.tipo==='veiculo'&&r.categoria==='B'),{hojeBrasil,somarDias}=await import('/shared/js/calendario.js');let rejeitadas=0;for(const data of [somarDias(hojeBrasil(),-1),'2028-12-25',sessionStorage.getItem('feriado-calendario-teste')]){try{await servico.reservarAulasLocais({categoria:'B',unidade:'Cobilândia',operacaoId:crypto.randomUUID(),aulas:[{data,hora:'07:00',instrutorId:i.id,veiculoId:v.id}]});}catch{rejeitadas++;}}rejeitadas===3}",'Validação final rejeita data passada, Natal e feriado cadastrado');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();for(const r of JSON.parse(sessionStorage.getItem('recursos-calendario-teste')))await servico.salvarRecursoLocal(r);true");
        await check('JSON.stringify(await servico.backup())==='+JSON.stringify(snapshot),'Fixture descartável restaurada sem alterar aulas ou créditos');
        await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");
        for(const tema of ['light','dark']) {
            await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema));
            await new Promise(resolve=>setTimeout(resolve,350));
            await check("document.querySelectorAll('.credit-heading').length===2&&!document.querySelector('.credit-heading svg,.credit-heading .summary-icon')&&document.querySelector('.credit-heading').textContent.includes('Moto')&&document.querySelectorAll('.credit-heading')[1].textContent.includes('Carro')&&document.querySelector('#credito-A')&&document.querySelector('#credito-B')&&document.documentElement.scrollWidth<=innerWidth",'Cards de saldo sem ícones preservam títulos, valores e alinhamento '+tema);
            await screenshot('dashboard-saldo-sem-icones-'+tema+'.png');
        }
        const ordem=['dashboard.html','agendamento.html','minhas-aulas.html','meu-progresso.html','pacotes.html','meu-perfil.html'];
        const medidasMenu={};
        for (const pagina of ordem) {
            await navigate('/aluno/html/'+pagina,"document.body?.dataset.sipaLocal==='aluno'");
            await check('JSON.stringify([...document.querySelectorAll(".sipa-sidebar-menu .sipa-sidebar-link")].map(a=>a.getAttribute("href")))==='+JSON.stringify(JSON.stringify(ordem))+'&&document.querySelector(".sipa-sidebar-link.active").getAttribute("href")==='+JSON.stringify(pagina)+'&&document.querySelector(".sipa-sidebar-logout").textContent.includes("Sair da conta")','Ordem, links, destaque ativo e saída preservados em '+pagina);
            await check("document.querySelectorAll('.sipa-sidebar-menu .sipa-nav-icon').length===6&&document.querySelectorAll('.sipa-sidebar-link.active').length===1&&document.querySelectorAll('.sipa-sidebar-link[aria-current=page]').length===1&&document.querySelector('.sipa-sidebar-logout .sipa-nav-icon').dataset.icon==='exit'&&[...document.querySelectorAll('.sipa-sidebar-menu .sipa-nav-icon')].every(n=>getComputedStyle(n).strokeWidth==='1.7px'&&n.getBoundingClientRect().width===22)",'Ícones compartilhados uniformes e uma única opção ativa em '+pagina);
            for(const tema of ['light','dark'])for(const width of [1366,390]) {
                await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate('document.documentElement.dataset.theme='+JSON.stringify(tema));await new Promise(r=>setTimeout(r,350));
                const medidas=await evaluate("{const s=document.querySelector('.sipa-sidebar'),l=s.querySelector('.sipa-sidebar-link'),i=s.querySelector('.sipa-nav-icon');({largura:s.getBoundingClientRect().width,fonte:getComputedStyle(l).fontSize,altura:l.getBoundingClientRect().height,icone:i.getBoundingClientRect().width,traco:getComputedStyle(i).strokeWidth,fundo:getComputedStyle(s).backgroundColor,ativo:getComputedStyle(s.querySelector('.active')).backgroundColor})}");
                if(medidasMenu[tema])assert.deepEqual(medidas,medidasMenu[tema],'Menu idêntico em '+pagina+' '+tema);else medidasMenu[tema]=medidas;
                await check('document.documentElement.scrollWidth<=innerWidth','Menu uniforme e sem rolagem em '+pagina+' '+tema+' '+width);
                if(width===390){await evaluate("document.querySelector('#mobile-menu-button,[id$=\"-mobile-menu\"],.student-menu-toggle').click()");await check("document.querySelector('.sipa-sidebar').classList.contains('mobile-open')&&document.querySelector('.sipa-sidebar-logout').getBoundingClientRect().height>=38",'Menu móvel abre com saída acessível em '+pagina+' '+tema);}
                await screenshot('sidebar-'+pagina+'-'+tema+'-'+width+'.png');
                if(width===390)await evaluate("document.querySelector('#mobile-menu-button,[id$=\"-mobile-menu\"],.student-menu-toggle').click()");
            }
        }
        await evaluate("document.querySelector('.sipa-sidebar-menu a[href=\"agendamento.html\"]').click()");
        await waitFor(()=>evaluate("location.pathname==='/aluno/html/agendamento.html'&&document.querySelectorAll('#calendar-days button').length===42"),'Link Agendar aula navega normalmente');
        await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");await evaluate("document.querySelector('.sipa-sidebar-logout').click()");await waitFor(()=>evaluate("location.pathname==='/login.html'"),'Sair da conta preservado');checks.push('Botão Sair encerra a sessão local e retorna ao login');


    }
    async function testarMultiplas(){
        if(process.env.SIPA_TEST_TEMA_ONLY==='1'){
            await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");
            await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.snapshotTema=JSON.stringify(await servico.backup());true");
            const snapshotTema=await evaluate('snapshotTema');
            await navigate('/aluno/html/pacotes.html',"document.body?.dataset.sipaLocal==='aluno'");
            await check("document.title==='Pacotes adicionais | SIPA'&&document.querySelector('main h1').textContent==='Pacotes adicionais'&&[...document.querySelectorAll('.sipa-sidebar a[href=\"pacotes.html\"]')].every(n=>n.textContent.includes('Pacotes adicionais'))",'Pacotes adicionais preserva rota e atualiza título e navegação');
            await check("document.querySelector('#additional-title').textContent==='Precisa de mais aulas práticas?'&&document.querySelector('#additional-how-title').textContent==='Como solicitar aulas adicionais?'&&document.querySelector('#additional-information-title').textContent==='Informações importantes'&&!document.querySelector('#pedidos-lista,#pacotes-escolha,#confirmar-pacote,#escolha-message')&&document.querySelectorAll('.additional-steps>li').length===3&&document.querySelectorAll('.additional-information li').length===5&&!document.querySelector('main').textContent.includes('Créditos de testes')&&!document.querySelector('main').textContent.includes('integração')",'Página informativa substitui pedidos e seleção sem interface técnica ou compra simulada');
            await check("{const a=document.querySelector('#falar-recepcao'),u=new URL(a.href);u.origin==='https://wa.me'&&u.pathname==='/55227998713181'&&u.searchParams.get('text')==='Olá! Sou aluno da autoescola e gostaria de saber mais sobre os pacotes de aulas práticas adicionais. Poderiam me informar as opções disponíveis, os valores e as condições de contratação?'&&a.target==='_blank'&&a.relList.contains('noopener')&&a.relList.contains('noreferrer')}",'WhatsApp usa número exato, mensagem codificada e nova aba protegida');
            await evaluate("window.contatoAcionado=false;document.querySelector('#falar-recepcao').addEventListener('click',e=>{e.preventDefault();contatoAcionado=true;},{once:true});document.querySelector('#falar-recepcao').click()");
            await check("contatoAcionado&&location.pathname==='/aluno/html/pacotes.html'&&testCalls.length===0",'Link de contato acionável preserva página e não envia pedidos');
            for(const tema of ['light','dark']){
                if(await evaluate('document.documentElement.dataset.theme!=='+JSON.stringify(tema)))await evaluate("document.querySelector('.sipa-theme-toggle').click()");
                for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await evaluate("scrollTo({top:0,behavior:'instant'})");await check("document.documentElement.scrollWidth<=innerWidth&&getComputedStyle(document.querySelector('.additional-steps')).gridTemplateColumns.split(' ').length==="+(width<=800?'1':'3'), 'Pacotes adicionais responsivos '+tema+' '+width);await screenshot('pacotes-adicionais-'+tema+'-'+width+'.png');}
                await check("auditarContraste('.additional-hero h2,.additional-hero p,.additional-steps h3,.additional-steps p,.reception-link,.additional-information li').length===0",'Contraste dos cards, botão e textos de pacotes '+tema);
            }
            await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();true");
            await check('JSON.stringify(await servico.backup())==='+JSON.stringify(snapshotTema),'Pacotes adicionais não altera créditos, contratos ou registros locais');
            await evaluate("localStorage.setItem('sipa.dev.ambiente','integrado');sessionStorage.removeItem('sipa.token')");await send('Page.navigate',{url:origin+'/aluno/html/pacotes.html?ambiente=integrado'});await waitFor(()=>evaluate("location.pathname==='/login.html'&&document.readyState==='complete'"),'Pacotes mantém autenticação no modo integrado');
            await check("location.pathname==='/login.html'",'Página informativa mantém proteção para usuários não autenticados');
            await evaluate("sessionStorage.setItem('sipa.token','teste.'+btoa(JSON.stringify({role:'Aluno',exp:Math.floor(Date.now()/1000)+3600}))+'.teste')");
            await navigate('/aluno/html/pacotes.html?ambiente=integrado',"document.readyState==='complete'");
            await check("document.querySelector('#additional-title').textContent==='Precisa de mais aulas práticas?'&&document.querySelectorAll('.additional-steps>li').length===3&&testCalls.length===0&&!document.querySelector('.sipa-local-navigation')",'Aluno integrado recebe conteúdo informativo sem consultar ou criar contratações');
            await evaluate("sessionStorage.removeItem('sipa.token');localStorage.setItem('sipa.dev.ambiente','local')");
            await navigate('/aluno/html/pacotes.html',"document.body?.dataset.sipaLocal==='aluno'");

            await evaluate("document.querySelector('.sipa-theme-toggle').click()");
            await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");

            await check("document.documentElement.dataset.theme==='light'&&document.querySelector('.sipa-theme-toggle').getAttribute('aria-label')==='Ativar modo escuro'&&document.querySelector('.sipa-theme-toggle svg').dataset.icon==='moon'",'Tema inicial claro e botão com lua acessível');
            await evaluate("document.querySelector('.sipa-theme-toggle').focus()");await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Enter',code:'Enter',windowsVirtualKeyCode:13,text:'\r',unmodifiedText:'\r'});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Enter',code:'Enter',windowsVirtualKeyCode:13});
            await check("document.documentElement.dataset.theme==='dark'&&localStorage['sipa.ui.tema']==='dark'&&document.querySelector('.sipa-theme-toggle svg').dataset.icon==='sun'",'Teclado alterna imediatamente, salva preferência e troca ícone');
            for(const pagina of ['dashboard','minhas-aulas','agendamento','meu-progresso','pacotes','meu-perfil']){
                await navigate('/aluno/html/'+pagina+'.html',"document.body?.dataset.sipaLocal==='aluno'&&document.querySelector('.sipa-theme-toggle')");
                await check("document.documentElement.dataset.theme==='dark'&&getComputedStyle(document.body).backgroundColor==='rgb(16, 27, 43)'",'Tema persiste e fundo escuro correto em '+pagina);
                await check("temaNaCarga==='dark'&&auditarContraste('main h1,main h2,.credit-heading span,.credit-value span,.category-progress-card dt,.category-progress-card dd,.profile-info-card strong,.sipa-theme-toggle').length===0",'Tema aplicado antes do DOM e contraste AA dos textos principais em '+pagina);
                for(const [width,height] of [[1366,768],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await evaluate("scrollTo({top:0,behavior:'instant'})");await check("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.sipa-theme-toggle').getBoundingClientRect().width>=44&&document.querySelector('.sipa-theme-toggle').getBoundingClientRect().right<=innerWidth",'Botão e layout responsivos '+pagina+' '+width);await screenshot('tema-escuro-'+pagina+'-'+width+'.png');}
            }
            await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();true");
            await check('JSON.stringify(await servico.backup())==='+JSON.stringify(snapshotTema),'Alternar e navegar não altera IndexedDB, créditos ou agendamentos');
            await evaluate("document.querySelector('.sipa-theme-toggle').click()");await check("document.documentElement.dataset.theme==='light'&&localStorage['sipa.ui.tema']==='light'",'Retorno ao modo claro mantém preferência explícita');
            await evaluate("document.querySelector('.sipa-theme-toggle').click()");
            for(const rota of ['/index.html','/login.html']){await navigate(rota,"document.readyState==='complete'");await check("!document.documentElement.hasAttribute('data-theme')&&!document.querySelector('.sipa-theme-toggle')",'Tema do aluno não invade '+rota);}
            await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();true");
            await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});await check("getComputedStyle(document.querySelector('.sipa-theme-toggle')).transitionDuration==='0s'",'Tema respeita preferência por movimento reduzido');await send('Emulation.setEmulatedMedia',{features:[]});
        }

        await evaluate("window.m=await import('/shared/js/calendario.js');window.diasTeste=[];for(let n=14;diasTeste.length<5;n++){const d=m.somarDias(m.hojeBrasil(),n);if(!(await import('/shared/js/disponibilidade.js')).motivoFechamento(d)&&m.diaSemana(d)!==6)diasTeste.push(d);}window.dados=await servico.dadosAlunoLocal();window.pares=(await servico.disponibilidadeLocal({categoria:'B',unidade:'Cobilândia',data:diasTeste[0]}))[0].pares;window.pedidoTeste={categoria:'B',unidade:'Cobilândia',operacaoId:crypto.randomUUID(),aulas:[{data:diasTeste[0],hora:'07:00',...pares[0]},{data:diasTeste[0],hora:'08:00',...pares[0]}]};true");
        await check("(await Promise.allSettled([servico.reservarAulasLocais({...pedidoTeste,aulas:[pedidoTeste.aulas[0],{...pedidoTeste.aulas[1],hora:'12:00'}]})]))[0].status==='rejected' && (await servico.dadosAlunoLocal()).aulas.length===0",'Lote com almoço inválido não grava nenhuma aula');
        await check("(await Promise.allSettled([servico.reservarAulasLocais({...pedidoTeste,aulas:[pedidoTeste.aulas[0],pedidoTeste.aulas[0]]})]))[0].status==='rejected'",'Duplicação de data/horário é recusada');
        await check("(await Promise.allSettled([servico.reservarAulasLocais({...pedidoTeste,aulas:Array.from({length:21},(_,i)=>({...pedidoTeste.aulas[0],data:diasTeste[Math.floor(i/7)],hora:String(7+i%7).padStart(2,'0')+':00'}))})]))[0].status==='rejected' && (await servico.dadosAlunoLocal()).aulas.length===0",'Saldo insuficiente bloqueia lote inteiro antes da gravação');
        await evaluate("window.addOriginal=IDBObjectStore.prototype.add;window.tentativasAdd=0;IDBObjectStore.prototype.add=function(r){if(this.name==='registros'&&r.tipo==='aula'&&++tentativasAdd===2)throw new DOMException('Falha de teste','DataCloneError');return addOriginal.call(this,r);};window.falhou=await Promise.allSettled([servico.reservarAulasLocais(pedidoTeste)]);IDBObjectStore.prototype.add=addOriginal;true");
        await check("falhou[0].status==='rejected' && (await servico.dadosAlunoLocal()).aulas.length===0 && (await servico.dadosAlunoLocal()).resumo.categorias.B.disponiveis===20",'Falha durante inclusão aborta transação e preserva saldo sem gravação parcial');
        await evaluate("window.loteSalvo=await servico.reservarAulasLocais(pedidoTeste);window.repetido=await servico.reservarAulasLocais(pedidoTeste);true");
        await check("loteSalvo.every(a=>a.status===1&&a.historico[0].status===1) && loteSalvo.length===2 && repetido.every((r,i)=>r.id===loteSalvo[i].id) && (await servico.dadosAlunoLocal()).aulas.length===2 && (await servico.dadosAlunoLocal()).resumo.categorias.B.disponiveis===18",'Lote válido é persistido uma vez e utiliza dois créditos');
        await check("(await Promise.allSettled([servico.reservarAulasLocais({...pedidoTeste,operacaoId:crypto.randomUUID()})]))[0].status==='rejected' && (await servico.dadosAlunoLocal()).aulas.length===2",'Revalidação detecta conflitos e não duplica lote');
        await evaluate("for(const a of loteSalvo){await servico.excluir(a.id);}window.antigas=await servico.reservarAulasLocais({...pedidoTeste,operacaoId:crypto.randomUUID(),aulas:[...pedidoTeste.aulas,{...pedidoTeste.aulas[0],hora:'09:00'}]});for(const a of antigas){await servico.salvar({...a,status:2,motivoCancelamento:'Motivos pessoais',historico:[...a.historico,{status:2,em:new Date().toISOString(),motivo:'Motivos pessoais'}]});}window.historicoAntes=JSON.stringify((await servico.dadosAlunoLocal()).aulas);true");
        const historicoGuardado=await evaluate('historicoAntes');
        const creditoGuardado=await evaluate('(await servico.dadosAlunoLocal()).credito');
        const diasGuardados=await evaluate('diasTeste');
        const gravarCredito=async valor=>evaluate(`await new Promise((resolve,reject)=>{const r=indexedDB.open('sipa.dev.local.v1');r.onsuccess=()=>{const db=r.result,tx=db.transaction('creditos','readwrite');tx.objectStore('creditos').put(${JSON.stringify(valor)});tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);};});`);
        async function abrirData(indice){
            for(let t=0;t<14;t++){
                if(await evaluate("!!document.querySelector('#calendar-days button[data-data-local=\"'+diasTeste["+indice+"]+'\"]:not(:disabled)')"))break;
                await evaluate("window.mesAnterior=document.querySelector('#calendar-month').textContent;document.querySelector('#next-month').click()");
                await waitFor(()=>evaluate("document.querySelectorAll('#calendar-days button').length===42 && document.querySelector('#calendar-month').textContent!==mesAnterior"),'Mês da seleção');
            }
            await evaluate("document.querySelector('#calendar-days button[data-data-local=\"'+diasTeste["+indice+"]+'\"]:not(:disabled)').click()");
            await waitFor(()=>evaluate("document.querySelectorAll('#time-slots button').length===10"),'Horários da seleção');
        }
        async function escolher(hora){
            await evaluate(`document.querySelector('#time-slots button[data-hora="${hora}"]').click();[...document.querySelectorAll("#summary-lessons button")].find(b=>b.textContent==="Selecionar instrutor"&&b.closest("li").textContent.includes(" · "+${JSON.stringify(hora)}+" às ")).click()`);
            await waitFor(()=>evaluate("!!document.querySelector('[data-instrutores] button')"),'Instrutores do modal');
            await evaluate("document.querySelector('[data-instrutores] button').click();document.querySelector('[data-veiculos] button').click();document.querySelector('[data-confirmar]').click()");
            await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Seleção validada e modal fechado');
        }
        await navigate('/aluno/html/agendamento.html',"document.body?.dataset.sipaLocal==='aluno'");
        await evaluate("window.m=await import('/shared/js/calendario.js');window.diasTeste=[];for(let n=1;diasTeste.length<5;n++){const d=m.somarDias(m.hojeBrasil(),n);if(!(await import('/shared/js/disponibilidade.js')).motivoFechamento(d)&&m.diaSemana(d)!==6)diasTeste.push(d);}true");
        await evaluate("window.catalogoTeste=await import('/shared/js/catalogoUnidades.js');window.snapshotUnidades=JSON.stringify(await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).backup());true");
        for(const id of ['Cobilândia','Santa Rita','Vila Velha','Itaparica','Terra Vermelha','Novo Milênio']){
            await evaluate('document.querySelector("#booking-unidade").value='+JSON.stringify(id)+';document.querySelector("#booking-unidade").dispatchEvent(new Event("change"));true');
            await waitFor(()=>evaluate('document.querySelector("#booking-unit-address").textContent.includes(catalogoTeste.obterUnidadeInstitucional('+JSON.stringify(id)+').enderecoCompleto)'),'Endereço da unidade '+id);
            await check('document.querySelector("#summary-unit-address").textContent.includes(catalogoTeste.obterUnidadeInstitucional('+JSON.stringify(id)+').enderecoCompleto)&&new URL(document.querySelector("#booking-unit-address a").href).searchParams.get("query").includes(catalogoTeste.obterUnidadeInstitucional('+JSON.stringify(id)+').logradouro)&&document.querySelector("#booking-unit-address a").target==="_blank"&&document.querySelector("#booking-unit-address a").relList.contains("noopener")','Seletor, Etapa 03 e Maps correspondem a '+id);
        }
        await check("document.querySelectorAll('#booking-unidade option').length===6&&[...document.querySelector('#booking-unidade').options].find(n=>n.value==='Vila Velha').textContent==='Unidade Centro de Vila Velha'&&JSON.stringify(await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).backup())===snapshotUnidades",'Centro mantém ID legado sem criar sétima unidade ou alterar vínculos');
        await gravarCredito({...creditoGuardado,categorias:{...creditoGuardado.categorias,B:1}});
        await navigate('/aluno/html/agendamento.html',"document.body?.dataset.sipaLocal==='aluno'");
        await evaluate('window.diasTeste='+JSON.stringify(diasGuardados));
        await abrirData(0);await escolher('07:00');
        await check("document.querySelectorAll('#time-slots button:not(:disabled)').length===1 && document.querySelector('#selected-lessons-count').textContent==='1'",'Créditos limitam seleções pendentes sem descontar antes de confirmar');
        await gravarCredito(creditoGuardado);
        await navigate('/aluno/html/agendamento.html',"document.body?.dataset.sipaLocal==='aluno'");
        await evaluate('window.diasTeste='+JSON.stringify(diasGuardados));
        await abrirData(0);await escolher('07:00');
        await check("document.querySelector('#selected-lessons-count').textContent==='1' && document.querySelector('#time-slots button[data-hora=\"07:00\"]').classList.contains('selected')",'Primeiro horário entra na seleção');
        await check("!document.querySelector('#booking-batch-resources')",'Uma aula mantém apenas seleção individual');
        await evaluate("document.querySelector('#time-slots button[data-hora=\"07:00\"]').click()");
        await check("document.querySelector('#selected-lessons-count').textContent==='0' && !document.querySelector('#time-slots .selected')",'Segundo clique desmarca o mesmo horário');
        await escolher('07:00');await escolher('09:00');await abrirData(1);await escolher('10:00');
        await check("document.querySelector('#booking-batch-resources').previousElementSibling.id==='summary-lessons'",'Ação em lote aparece abaixo da lista com duas ou mais aulas');
        await evaluate("document.querySelector('#booking-batch-resources').click()");await waitFor(()=>evaluate("document.querySelectorAll('[data-instrutores] button').length===2"),'Modal em lote consulta todas as aulas');
        await check("document.querySelectorAll('.booking-batch-dates li').length===3&&getComputedStyle(document.querySelector('.booking-resource-dialog'),'::backdrop').backdropFilter.includes('blur')",'Modal em lote mostra datas e fundo desfocado');
        for(const [width,height] of [[1366,768],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await check("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.booking-resource-dialog').getBoundingClientRect().width<=innerWidth-16",'Modal em lote responsivo '+width);await screenshot('instrutor-lote-'+width+'.png');}
        await evaluate("document.querySelector('[data-instrutores] button:last-child').click();document.querySelector('[data-veiculos] button').click();window.nomeInstrutorLote=document.querySelector('[data-instrutores] button[aria-pressed=true] strong').textContent;window.nomeVeiculoLote=document.querySelector('[data-veiculos] button[aria-pressed=true] strong').textContent;document.querySelector('[data-confirmar]').click()");await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Aplicar lote de recursos');
        await check("[...document.querySelectorAll('#summary-lessons [data-selecao]')].every(n=>n.textContent.includes(nomeInstrutorLote)&&n.textContent.includes(nomeVeiculoLote))&&!document.querySelector('#confirm-booking').disabled",'Mesmo instrutor e veículo aplicados às três aulas');
        await evaluate("document.querySelector('#summary-lessons button').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-instrutores] button')"),'Editar individual após lote');await evaluate("document.querySelector('[data-instrutores] button').click();document.querySelector('[data-veiculos] button').click();document.querySelector('[data-confirmar]').click()");await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Aplicar edição individual');
        await check("![...document.querySelectorAll('#summary-lessons [data-selecao]')][0].textContent.includes(nomeInstrutorLote)&&[...document.querySelectorAll('#summary-lessons [data-selecao]')].slice(1).every(n=>n.textContent.includes(nomeInstrutorLote))",'Editar uma aula após lote preserva as outras');
        await evaluate("document.querySelector('#booking-batch-resources').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-instrutores] button')"),'Reaplicar lote');await evaluate("document.querySelector('[data-instrutores] button').click();document.querySelector('[data-veiculos] button').click();document.querySelector('[data-confirmar]').click()");await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Lote reaplicado');
        const escolhasAntesFalha=await evaluate("document.querySelector('#summary-lessons').textContent");
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.instrutoresLote=(await servico.registros()).filter(r=>r.tipo==='instrutor'&&r.unidade==='Cobilândia'&&r.categorias.includes('B'));for(const r of instrutoresLote)await servico.salvar({...r,ativo:false});document.querySelector('#booking-batch-resources').click();true");
        await waitFor(()=>evaluate("document.querySelector('[data-erro]')?.textContent.includes('Recursos indisponíveis em:')"),'Lote sem disponibilidade explica datas afetadas');
        await check("document.querySelector('[data-confirmar]').disabled&&document.querySelectorAll('[data-instrutores] button').length===0",'Lote indisponível não permite aplicação parcial');
        await evaluate("document.querySelector('[data-cancelar]').click();for(const r of instrutoresLote)await servico.salvar(r);true");await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Fechar lote indisponível');
        await check('document.querySelector("#summary-lessons").textContent==='+JSON.stringify(escolhasAntesFalha),'Falha em lote preserva todas as escolhas individuais');
        await evaluate("window.calLote=await import('/shared/js/calendario.js');for(const [n,r] of instrutoresLote.entries())await servico.salvar({...r,disponibilidadeSemanal:[{dia:calLote.diaSemana(diasTeste[n]),inicio:'07:00',fim:'19:00'}]});document.querySelector('#booking-batch-resources').click();true");
        await waitFor(()=>evaluate("document.querySelector('[data-erro]')?.textContent.includes('Não há um mesmo instrutor e veículo')"),'Pares distintos por data não são oferecidos como par comum');
        await check("document.querySelector('[data-confirmar]').disabled",'Aulas com recursos distintos exigem configuração individual');
        await evaluate("document.querySelector('[data-cancelar]').click();for(const r of instrutoresLote)await servico.salvar(r);true");await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Fechar ausência de par comum');
        const selecoesAntes=await evaluate("document.querySelector('#summary-lessons').textContent");
        await evaluate("document.querySelector('#summary-lessons button').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-instrutores] button')"),'Reabertura dos recursos');
        await check("getComputedStyle(document.querySelector('.booking-resource-dialog'),'::backdrop').backdropFilter.includes('blur') && document.querySelector('[data-instrutores] button[aria-pressed=true]')!==null",'Modal desfocado reabre com escolha anterior');
        await evaluate("document.querySelector('[data-instrutores] button:last-child').click()");
        await check("document.querySelector('.booking-resource-dialog h3:last-of-type').textContent==='Veículo' && !document.querySelector('.booking-resource-dialog').textContent.includes('Veículos compatíveis') && [...document.querySelectorAll('[data-veiculos] button')].every(b=>/Placa: [A-Z]{3}[0-9][A-Z][0-9]{2}/.test(b.textContent)&&b.textContent.includes('fictícia'))",'Modal mostra veículo e placa fictícia visual, sem alterar cadastro');
        await screenshot('modal-instrutor-veiculo.png');
        await check("document.querySelector('[data-confirmar]').disabled && [...document.querySelectorAll('[data-veiculos] button')].length===1",'Troca de instrutor exige veículo compatível e nova confirmação');
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Cancelar recursos por Esc');
        await check('document.querySelector("#summary-lessons").textContent==='+JSON.stringify(selecoesAntes),'Esc descarta apenas edição temporária e preserva outras aulas');
        await check("document.querySelector('#selected-lessons-count').textContent==='3' && document.querySelectorAll('#summary-lessons [data-selecao]').length===3 && !document.querySelector('#confirm-booking').disabled",'Três seleções em datas diferentes permanecem na revisão com recursos próprios');
        await abrirData(0);await check("document.querySelectorAll('#time-slots .selected').length===2",'Voltar à data restaura marcações acumuladas');
        await evaluate("document.querySelector('#summary-lessons .booking-pending-row button:last-child').click()");
        await check("document.querySelector('#selected-lessons-count').textContent==='2'",'Remover pela revisão atualiza o contador');
        await evaluate("document.querySelector('[data-category=A]').click()");await waitFor(()=>evaluate("!!document.querySelector('dialog[open] [data-manter]')"),'Confirmação de descarte por categoria');
        await evaluate("document.querySelector('dialog [data-manter]').click()");
        await waitFor(()=>evaluate("!document.querySelector('.booking-local-dialog')"),'Manter seleção');
        await check("document.querySelector('[data-category=B]').getAttribute('aria-pressed')==='true' && document.querySelector('#selected-lessons-count').textContent==='2'",'Cancelar troca de categoria preserva escolhas');
        await evaluate("document.querySelector('#booking-unidade').value='Itaparica';document.querySelector('#booking-unidade').dispatchEvent(new Event('change'))");
        await waitFor(()=>evaluate("!!document.querySelector('dialog[open] [data-manter]')"),'Confirmação de descarte por unidade');await evaluate("document.querySelector('dialog [data-manter]').click()");await waitFor(()=>evaluate("!document.querySelector('.booking-local-dialog')"),'Manter unidade');
        await check("document.querySelector('#booking-unidade').value==='Cobilândia' && document.querySelector('#selected-lessons-count').textContent==='2'",'Cancelar troca de unidade preserva escolhas');
        await abrirData(0);await escolher('07:00'); // item anterior foi removido; volta ao lote
        for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844]]) {
            await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
            if(process.env.SIPA_TEST_TEMA_ONLY==='1')await check("auditarContraste('.booking-unit-local label,.calendar-weekdays span,.calendar-day:not(:disabled),.time-slot:not(:disabled)').length===0&&getComputedStyle(document.querySelector('.calendar-area')).backgroundColor==='rgb(27, 43, 64)'",'Calendário, rótulos e horários com superfícies escuras e contraste AA');
            await check("getComputedStyle(document.querySelector('#time-slots')).gridTemplateColumns.split(' ').length===2 && document.documentElement.scrollWidth<=innerWidth",'Grade com duas colunas e revisão responsiva '+width);
            await check("!document.querySelector('.booking-steps,.booking-step')&&document.querySelector('#summary-lessons').children.length===3&&!document.querySelector('#confirm-booking').disabled",'Stepper removido com revisão e validação preservadas '+width);
            await evaluate("document.querySelector('.category-card').scrollIntoView({block:'center',behavior:'instant'})");await screenshot('stepper-'+width+'.png');
            await evaluate("document.querySelector('.category-options').scrollIntoView({block:'start'})");await screenshot('agendamento-etapas-'+width+'.png');
            await evaluate("document.querySelector('#summary-lessons').scrollIntoView({block:'center'})");await screenshot('selecao-multipla-'+width+'.png');
        }
        await check("(await (await (await import('/dev/aluno/authLocal.js')).criarServicoLocal()).dadosAlunoLocal()).resumo.categorias.B.disponiveis===20",'Escolhas pendentes não consomem saldo persistido');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.bloquear=(await servico.registros()).find(r=>r.tipo==='instrutor'&&r.unidade==='Cobilândia'&&r.categorias.includes('B'));await servico.salvar({...bloquear,ativo:false});document.querySelector('#confirm-booking').click();true");
        await waitFor(()=>evaluate("document.querySelector('#booking-message').textContent.includes('nenhuma seleção foi salva')"),'Erro de recurso indisponível no lote');
        await check("!document.querySelector('#agendamentos-confirmados') && (await servico.dadosAlunoLocal()).aulas.length===3 && document.querySelector('#selected-lessons-count').textContent==='3'",'Erro identifica seleção sem modal ou gravação parcial e mantém lista para correção');
        await evaluate("await servico.salvar({...bloquear,ativo:true});document.querySelector('#confirm-booking').click();document.querySelector('#confirm-booking').click()");
        await waitFor(()=>evaluate("!!document.querySelector('#agendamentos-confirmados[open]')"),'Modal após persistência do lote');
        await check("getComputedStyle(document.querySelector('.booking-success-list li')).paddingTop==='9px' && getComputedStyle(document.querySelector('.booking-success-list dl')).gridTemplateColumns.split(' ').length===2",'Confirmação usa cards compactos em duas colunas');
        await check("[...document.querySelectorAll('.booking-success-list li')].every(n=>n.querySelectorAll('dl > div').length===7&&n.textContent.includes('Confirmada')) && getComputedStyle(document.querySelector('.booking-success-list')).overflowY==='auto' && !document.querySelector('#agendamentos-confirmados').textContent.includes('aguardando')",'Modal usa blocos estruturados, rolagem interna e confirmação imediata');
        if(process.env.SIPA_TEST_TEMA_ONLY==='1')await check("auditarContraste('#agendamentos-confirmados h2,#agendamentos-confirmados dt,#agendamentos-confirmados dd').length===0",'Modal de confirmação com contraste AA');
        await check("[...document.querySelectorAll('.booking-success-list li')].every(n=>n.textContent.includes('Av. Jacinto Admiral, 125')&&new URL(n.querySelector('.unit-map-link').href).searchParams.get('query').includes('Cobilândia'))",'Cada aula confirmada mostra endereço e Maps da sua unidade');
        await check("document.querySelector('#booking-success-title').textContent==='Agendamentos confirmados!' && document.querySelectorAll('.booking-success-list li').length===3 && document.querySelector('#agendamentos-confirmados').textContent.includes('Créditos restantes: 17') && (await servico.dadosAlunoLocal()).aulas.length===6",'Modal apresenta exatamente três registros salvos e saldo 17');
        await check(`JSON.stringify((await servico.dadosAlunoLocal()).aulas.filter(a=>a.status===2))===${JSON.stringify(historicoGuardado)}`,'Três aulas canceladas e histórico existentes permanecem intactos');
        for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844]]){
            await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
            await check("document.documentElement.scrollWidth<=innerWidth && document.querySelector('#agendamentos-confirmados').getBoundingClientRect().width<=innerWidth-16",'Modal responsivo '+width);await screenshot('lote-confirmado-'+width+'.png');
        }
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});
        await waitFor(()=>evaluate("!document.querySelector('#agendamentos-confirmados')"),'Fechar modal por Esc');
        await check("document.activeElement.matches('.category-option.selected')",'Foco retorna ao fluxo após fechar modal');
        await abrirData(2);await escolher('14:00');await evaluate("document.querySelector('#confirm-booking').click()");
        await waitFor(()=>evaluate("document.querySelector('#booking-success-title')?.textContent==='Agendamento confirmado!'"),'Modal singular após nova reserva');
        await evaluate("[...document.querySelectorAll('#agendamentos-confirmados button')].find(b=>b.textContent==='Agendar mais aulas').click()");
        await waitFor(()=>evaluate("!document.querySelector('#agendamentos-confirmados')"),'Botão agendar mais fecha modal');
        await abrirData(3);await escolher('15:00');await evaluate("document.querySelector('#confirm-booking').click()");
        await waitFor(()=>evaluate("!!document.querySelector('#agendamentos-confirmados[open]')"),'Novo modal após nova operação');
        await evaluate("document.querySelector('#agendamentos-confirmados .booking-dialog-actions a').click()");
        await waitFor(()=>evaluate("location.pathname==='/aluno/html/minhas-aulas.html' && document.body?.dataset.sipaLocal==='aluno' && !!document.querySelector('[data-vista=confirmadas]')"),'Link do modal abre Minhas aulas');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();true");
        await check("document.querySelectorAll('#lessons-list [data-aula-local]').length===5 && document.querySelectorAll('#past-lessons-list [data-status=\"2\"]').length===3 && document.querySelector('#past-lessons-list').closest('section').hidden && document.querySelector('#total-lessons').textContent==='5'",'Minhas aulas separa cinco futuras das três canceladas');
        await check("[...document.querySelectorAll('#lessons-list [data-aula-local]')].every(n=>n.querySelector('.confirmed-lesson-location').textContent.includes('Av. Jacinto Admiral, 125')&&!!n.querySelector('.confirmed-lesson-location .unit-map-link'))",'Detalhes das aulas consultam endereço pela unidade agendada');
        await check("[...document.querySelectorAll('#lessons-list [data-aula-local]')].every(n=>n.dataset.status==='1') && document.querySelector('[data-vista=confirmadas]').getAttribute('aria-pressed')==='true'",'Visualização inicial contém somente futuras confirmadas');
        for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844]]){
            await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});
            await check("document.documentElement.scrollWidth<=innerWidth && [...document.querySelectorAll('#lessons-list [data-status=\"1\"]')].every(c=>getComputedStyle(c).paddingTop==='10px'&&!c.querySelector('button').disabled)",'Confirmadas compactas e cancelamento acessível '+width);
            await evaluate("document.querySelector('#lessons-list').scrollIntoView({block:'start'})");await screenshot('confirmadas-compactas-'+width+'.png');
        }
        await evaluate("document.querySelector('[data-vista=canceladas]').click()");
        await check("[...document.querySelectorAll('#past-lessons-list [data-status=\"2\"]')].every(c=>getComputedStyle(c).paddingTop==='10px'&&c.querySelectorAll('.local-lesson-fields dd').length===4&&c.querySelector('summary').textContent==='Detalhes e histórico')",'Canceladas compactas preservam categoria, unidade, instrutor, veículo e histórico');
        await evaluate("document.querySelector('#past-lessons-list summary').click()");
        await check("document.querySelector('#past-lessons-list details').textContent.includes('Motivo do cancelamento') && document.querySelector('#past-lessons-list details').textContent.includes('Cancelamento registrado em')",'Histórico mostra motivo e datas efetivamente registrados');
        for(const [width,height] of [[1920,1080],[1366,768],[768,1024],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await check('document.documentElement.scrollWidth<=innerWidth','Minhas aulas sem transbordamento '+width);await screenshot('minhas-aulas-lote-'+width+'.png');}
        await evaluate("window.concluida={...(await servico.dadosAlunoLocal()).aulas[0],id:'concluida-fixture-local',categoria:'A',inicio:'2020-10-19T07:00:00-03:00',fim:'2020-10-19T08:00:00-03:00',status:5};await servico.salvar(concluida);true");
        await navigate('/aluno/html/minhas-aulas.html',"document.body?.dataset.sipaLocal==='aluno'");
        await evaluate("document.querySelector('[data-vista=historico]').click()");
        await check("document.querySelector('[data-aula-local=concluida-fixture-local]')?.hidden===false && document.querySelector('[data-aula-local=concluida-fixture-local]').textContent.includes('Concluída')",'Aula concluída permanece acessível no histórico após recarregar');
        await check("document.querySelector('#past-lessons-list').closest('section').hidden===false && [...document.querySelectorAll('#past-lessons-list [data-status=\"2\"]')].every(n=>n.hidden)",'Histórico não mistura cancelamentos e continua acessível');
        await evaluate("document.querySelector('[data-vista=confirmadas]').click()");
        await check("!document.querySelector('#lessons-list').closest('section').hidden && document.querySelector('#past-lessons-list').closest('section').hidden",'Voltar às confirmadas alterna sem recarregar');
        await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");
        await check("!document.querySelector('.credit-heading svg')&&document.querySelectorAll('.credit-heading').length===2",'Cards de saldo sem ícones preservam os títulos');
        await screenshot('dashboard-motocicleta.png');
        await check("!document.querySelector('.dashboard-header .header-actions')&&!document.querySelector('#student-initial')&&!document.querySelector('#header-student-name')&&document.querySelector('#student-name').textContent==='Aluno de demonstra??o'&&document.querySelector('.sipa-sidebar')!==null",'Home sem bloco superior de perfil preserva saudação e sidebar');
        await check("document.querySelector('#credito-B').textContent==='15' && document.querySelector('#proxima-aula-conteudo').textContent.includes('Cobilândia')",'Dashboard lê saldo e próxima aula persistidos pelo lote');
        await navigate('/aluno/html/minhas-aulas.html',"document.body?.dataset.sipaLocal==='aluno'");
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.antesCancelar=await servico.dadosAlunoLocal();window.idCarro=document.querySelector('#lessons-list [data-aula-local]').dataset.aulaLocal;window.confirm=window.alert=window.prompt=()=>{throw Error('Diálogo nativo proibido no cancelamento');};document.querySelector('#lessons-list .local-lesson-cancel').click();true");
        await waitFor(()=>evaluate("!!document.querySelector('.lesson-cancel-dialog[open]')"),'Abrir modal próprio de cancelamento');
        await check("{const d=document.querySelector('.lesson-cancel-dialog'),a=antesCancelar.aulas.find(a=>a.id===idCarro);d.querySelectorAll('dl > div').length===7&&d.textContent.includes('Cancelar aula?')&&d.textContent.includes('Confirmada')&&d.textContent.includes(antesCancelar.registros.find(r=>r.id===a.instrutor).nome)&&d.textContent.includes(antesCancelar.registros.find(r=>r.id===a.veiculo).nome)&&getComputedStyle(d,'::backdrop').backdropFilter.includes('blur')&&document.activeElement.id==='lesson-cancel-title'}",'Modal mostra sete campos corretos, fundo desfocado e foco seguro');
        if(process.env.SIPA_TEST_TEMA_ONLY==='1')await check("auditarContraste('.lesson-cancel-dialog h2,.lesson-cancel-dialog dd,.lesson-cancel-dialog label,.lesson-cancel-dialog select,.lesson-cancel-policy p').length===0",'Modal de cancelamento e campo de motivo com contraste AA');
        await check("document.querySelector('#lesson-cancel-reason').required&&document.querySelector('[data-cancel-confirm]').disabled&&['Imprevisto familiar','Imprevisto no trabalho','Motivos pessoais','Compromisso profissional','Motivos de saúde'].every(m=>[...document.querySelector('#lesson-cancel-reason').options].some(o=>o.value===m))",'Motivo obrigatório apresenta todas as opções e inicia confirmação bloqueada');
        await check("(await Promise.allSettled([servico.cancelarReservaLocal(idCarro),servico.cancelarReservaLocal(idCarro,'   '),servico.cancelarReservaLocal(idCarro,'não cadastrado')])).every(r=>r.status==='rejected')&&JSON.stringify((await servico.dadosAlunoLocal()).aulas)===JSON.stringify(antesCancelar.aulas)",'Serviço rejeita motivo ausente, vazio ou inválido sem alterar histórico ou saldo');
        await check("document.querySelector('.lesson-cancel-policy p').textContent.includes('será devolvido')&&document.querySelector('.cancel-consent').hidden&&!document.querySelector('.cancel-rule')&&!document.querySelector('.lesson-cancel-dialog').textContent.includes('Como o prazo é contado')",'Modal explica devolução sem componente expansível');
        await evaluate("document.querySelector('[data-cancel-confirm]').click()");
        await check("(await servico.dadosAlunoLocal()).aulas.find(a=>a.id===idCarro).status===1&&document.querySelector('.lesson-cancel-dialog').open",'Sem motivo não confirma cancelamento');
        await evaluate("document.querySelector('#lesson-cancel-reason').value='Motivos de saúde';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'))");
        await check("!document.querySelector('[data-cancel-confirm]').disabled",'Escolher motivo habilita confirmação');
        await evaluate("document.querySelector('#lesson-cancel-reason').value='';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'))");
        await check("document.querySelector('[data-cancel-confirm]').disabled",'Remover motivo volta a bloquear confirmação');
        for(const [width,height] of [[1366,768],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await check("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('.lesson-cancel-dialog').getBoundingClientRect().width<=innerWidth-16",'Modal de cancelamento responsivo '+width);await screenshot('cancelamento-'+width+'.png');}
        await evaluate("document.querySelector('[data-cancel-back]').click()");await waitFor(()=>evaluate("!document.querySelector('.lesson-cancel-dialog')"),'Voltar sem cancelar');
        await check("JSON.stringify((await servico.dadosAlunoLocal()).aulas)===JSON.stringify(antesCancelar.aulas)&&document.activeElement.matches('.local-lesson-cancel')&&!document.activeElement.disabled",'Voltar preserva dados, crédito e restaura foco');
        await evaluate("document.querySelector('#lessons-list .local-lesson-cancel').click()");
        await send('Input.dispatchKeyEvent',{type:'keyDown',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await send('Input.dispatchKeyEvent',{type:'keyUp',key:'Escape',code:'Escape',windowsVirtualKeyCode:27});await waitFor(()=>evaluate("!document.querySelector('.lesson-cancel-dialog')"),'Esc fecha cancelamento');
        await check("(await servico.dadosAlunoLocal()).resumo.categorias.B.disponiveis===15",'Esc preserva saldo sem cancelar');
        await evaluate("document.querySelector('#lessons-list .local-lesson-cancel').click();document.querySelector('#lesson-cancel-reason').value='Motivos pessoais';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'));document.querySelector('[data-cancel-confirm]').click();document.querySelector('#lesson-cancel-reason').value='Motivos pessoais';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'));document.querySelector('[data-cancel-confirm]').click()");
        await waitFor(()=>evaluate("document.querySelector('#total-lessons').textContent==='4'"),'Cancelar confirmada de carro atualiza contador');
        await check("!document.querySelector('#lessons-list [data-aula-local=\"'+idCarro+'\"]') && (await servico.dadosAlunoLocal()).resumo.categorias.B.disponiveis===16 && (await servico.dadosAlunoLocal()).credito.categorias.B===20",'Clique em cancelar carro remove da lista e devolve somente o crédito reservado');
        await evaluate("document.querySelector('[data-vista=canceladas]').click();true");
        await check("document.querySelector('#past-lessons-list [data-aula-local=\"'+idCarro+'\"]').dataset.status==='2' && (await servico.dadosAlunoLocal()).aulas.find(a=>a.id===idCarro).historico.map(h=>h.status).join(',')==='1,2'",'Cancelamento mantém registro e histórico na aba correta');
        await check("{const a=(await servico.dadosAlunoLocal()).aulas.find(a=>a.id===idCarro);a.motivoCancelamento==='Motivos pessoais'&&a.historico.at(-1).motivo==='Motivos pessoais'&&document.querySelector('#past-lessons-list [data-aula-local=\"'+idCarro+'\"] details').textContent.includes('Motivo do cancelamento: Motivos pessoais')}",'Motivo escolhido salvo na aula e no evento e exibido nos detalhes');
        await check("(await servico.cancelarReservaLocal(idCarro)).status===2 && (await servico.dadosAlunoLocal()).resumo.categorias.B.disponiveis===16",'Repetir cancelamento é idempotente e não duplica crédito');
        await check("(await Promise.allSettled([servico.cancelarReservaLocal('concluida-fixture-local')]))[0].status==='rejected'",'Aula concluída continua protegida de cancelamento');
        await evaluate("window.cal=await import('/shared/js/calendario.js');window.diaMoto=cal.somarDias(cal.hojeBrasil(),14);while((await import('/shared/js/disponibilidade.js')).motivoFechamento(diaMoto))diaMoto=cal.somarDias(diaMoto,1);window.hMoto=(await servico.disponibilidadeLocal({categoria:'A',unidade:'Cobilândia',data:diaMoto}))[0];window.motoCancelamento=await servico.reservarAulaLocal({categoria:'A',unidade:'Cobilândia',data:diaMoto,hora:hMoto.hora,...hMoto.pares[0],operacaoId:crypto.randomUUID()});true");
        const idMoto=await evaluate('motoCancelamento.id');
        const idCarroPersistido=await evaluate('idCarro');
        await navigate('/aluno/html/minhas-aulas.html',"document.body?.dataset.sipaLocal==='aluno'");
        await check(`document.querySelector('#past-lessons-list [data-aula-local="${idCarroPersistido}"] details').textContent.includes('Motivo do cancelamento: Motivos pessoais')`,'Motivo permanece nos detalhes após recarregar a página');
        await evaluate(`window.idMoto=${JSON.stringify(idMoto)};window.confirm=()=>true;document.querySelector('#lessons-list [data-aula-local="${idMoto}"] .local-lesson-cancel').click();true`);
        await evaluate("document.querySelector('#lesson-cancel-reason').value='Motivos pessoais';document.querySelector('#lesson-cancel-reason').dispatchEvent(new Event('change'));document.querySelector('[data-cancel-confirm]').click()");
        await waitFor(()=>evaluate("!document.querySelector('#lessons-list [data-aula-local=\"'+idMoto+'\"]') && !document.querySelector('.lesson-cancel-dialog')"),'Cancelar confirmada de moto');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();true");
        await check("(await servico.dadosAlunoLocal()).resumo.categorias.A.disponiveis===19 && (await servico.dadosAlunoLocal()).aulas.find(a=>a.id===idMoto).status===2",'Moto usa a mesma regra de cancelamento sem alterar saldo contratado');
        await navigate('/aluno/html/dashboard.html',"document.body?.dataset.sipaLocal==='aluno'");
        await check("document.querySelector('#credito-B').textContent==='16' && document.querySelector('#credito-A').textContent==='19'",'Dashboard consulta saldos atualizados depois dos cancelamentos persistidos');
        await navigate('/aluno/html/meu-progresso.html',"document.body?.dataset.sipaLocal==='aluno'&&document.querySelector('[data-evolucao=A]')");
        await check("document.querySelectorAll('[data-categoria-progresso]').length===2&&document.querySelector('[data-categoria-progresso=A] [data-metrica=contratadas]').textContent==='20'&&document.querySelector('[data-categoria-progresso=B] [data-metrica=contratadas]').textContent==='20'",'Progresso separa contratações A e B do armazenamento');
        await check("document.querySelector('[data-categoria-progresso=A] [data-metrica=disponiveis]').textContent==='19'&&document.querySelector('[data-categoria-progresso=B] [data-metrica=disponiveis]').textContent==='16'&&document.querySelector('[data-categoria-progresso=B] [data-metrica=agendadas]').textContent==='4'&&document.querySelector('[data-categoria-progresso=A] [data-metrica=concluidas]').textContent==='1'",'Disponíveis, agendadas e concluídas usam estados distintos');
        await check("document.querySelector('[data-percentual=A]').textContent==='5%'&&document.querySelector('[data-percentual=B]').textContent==='0%'&&document.querySelector('[data-evolucao=A] [role=progressbar]').getAttribute('aria-valuenow')==='5'&&document.querySelector('.progress-link-unit').textContent.includes('Unidade Cobilândia')",'Barras independentes e unidade de vínculo corretas sem concluir cancelamentos');
        for(const [width,height] of [[1366,768],[768,1024],[390,844]]){await send('Emulation.setDeviceMetricsOverride',{width,height,deviceScaleFactor:1,mobile:width<500});await check("document.documentElement.scrollWidth<=innerWidth&&getComputedStyle(document.querySelector('.category-progress-card h2')).fontSize==='19px'",'Progresso compacto e responsivo '+width);await evaluate("document.querySelector('.progress-header').scrollIntoView({block:'start',behavior:'instant'})");await screenshot('progresso-categorias-'+width+'.png');}
        await navigate('/aluno/html/meu-progresso.html',"document.body?.dataset.sipaLocal==='aluno'&&document.querySelector('[data-evolucao=A]')");
        await check("document.querySelector('[data-percentual=A]').textContent==='5%'",'Evolução preservada ao recarregar');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.canceladasTeste=(await servico.dadosAlunoLocal()).aulas.filter(a=>a.status===2).sort((a,b)=>Number(!!b.cancelamento)-Number(!!a.cancelamento));await servico.salvar({id:'outro-aluno-limpeza',tipo:'aluno',nome:'Outra conta somente no teste isolado',documento:'33344455566',unidade:'Cobilândia'});await servico.salvar({...canceladasTeste[0],id:'cancelamento-outra-conta',aluno:'outro-aluno-limpeza',referenciaOrigem:canceladasTeste[0].id});await servico.salvar({...canceladasTeste[1],movimentacaoCredito:{contabilizado:true}});window.legadoAtualizado=canceladasTeste.find(a=>!a.cancelamento);window.metadadosLocais=structuredClone(canceladasTeste[0].cancelamento);await servico.salvar({...legadoAtualizado,cancelamento:metadadosLocais,historico:legadoAtualizado.historico.map(e=>e.status===2?{...e,cancelamento:metadadosLocais}:e)});window.planoLimpeza=await servico.planoCancelamentosTeste();window.elegiveis=planoLimpeza.candidatos.filter(c=>c.elegivel).map(c=>c.registro);window.pedidoLimpeza={ids:elegiveis.map(a=>a.id),registrosConfirmados:elegiveis,confirmarTestes:true};window.antesLimpeza=await servico.backup();true");
        await check("elegiveis.some(a=>a.id===legadoAtualizado.id&&a.cancelamento)&&planoLimpeza.candidatos.length===5&&elegiveis.length===3&&!planoLimpeza.candidatos.some(c=>c.registro.id==='cancelamento-outra-conta')&&planoLimpeza.candidatos.filter(c=>!c.elegivel).length===2",'Limpeza aceita formato local conhecido e protege outra conta, referências e contabilidade');
        await evaluate("window.alvoSeguro=elegiveis.find(a=>a.cancelamento);window.protecoesMetadados=[];for(const alteracao of [{cancelamento:{...alvoSeguro.cancelamento,campoNaoReconhecido:true}},{cancelamento:{...alvoSeguro.cancelamento,credito:'retido'}},{cancelamento:{...alvoSeguro.cancelamento,justificativa:{estado:'aguardando_apresentacao'}}},{historico:[...alvoSeguro.historico,{status:6,em:new Date().toISOString()}]}]){await servico.salvar({...alvoSeguro,...alteracao});const plano=await servico.planoCancelamentosTeste();const antes=JSON.stringify(await servico.backup());const tentativa=await Promise.allSettled([servico.limparCancelamentosTeste({ids:[alvoSeguro.id],registrosConfirmados:[{...alvoSeguro,...alteracao}],confirmarTestes:true})]);protecoesMetadados.push(!plano.candidatos.find(c=>c.registro.id===alvoSeguro.id).elegivel&&tentativa[0].status==='rejected'&&JSON.stringify(await servico.backup())===antes);}await servico.salvar(alvoSeguro);true");
        await check("protecoesMetadados.every(Boolean)",'Metadados desconhecidos, retenção, justificativa e falta continuam bloqueados sem gravação');
        await check("(await Promise.allSettled([servico.limparCancelamentosTeste({...pedidoLimpeza,confirmarTestes:false}),servico.limparCancelamentosTeste({...pedidoLimpeza,ids:['cancelamento-outra-conta']}),servico.limparCancelamentosTeste({...pedidoLimpeza,ids:[canceladasTeste[0].id]})])).every(r=>r.status==='rejected')&&JSON.stringify(await servico.backup())===JSON.stringify(antesLimpeza)",'Sem confirmação específica, outra conta ou dependência não pode ser removida');
        await evaluate("window.storageSetOriginal=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k.startsWith('sipa.dev.backup.cancelamentos.'))throw new DOMException('Sem espaço no teste','QuotaExceededError');return storageSetOriginal.call(this,k,v);};try{window.falhaBackup=await Promise.allSettled([servico.limparCancelamentosTeste(pedidoLimpeza)]);}finally{Storage.prototype.setItem=storageSetOriginal;}true");
        await check("falhaBackup[0].status==='rejected'&&JSON.stringify(await servico.backup())===JSON.stringify(antesLimpeza)",'Falha no backup impede exclusão e preserva saldos');
        await evaluate("await servico.salvar({...elegiveis[0],motivoCancelamento:'Conflito de horário'});window.planoDesatualizado=await Promise.allSettled([servico.limparCancelamentosTeste(pedidoLimpeza)]);await servico.salvar(elegiveis[0]);true");
        await check("planoDesatualizado[0].status==='rejected'",'Limpeza revalida o conteúdo confirmado antes de excluir');
        const snapshotAntes=await evaluate('antesLimpeza'),idsRemovidos=await evaluate('pedidoLimpeza.ids');
        await navigate('/aluno/html/minhas-aulas.html',"document.body?.dataset.sipaLocal==='aluno'&&document.querySelector('#cleanup-cancelamentos')");
        await evaluate("document.querySelector('[data-vista=canceladas]').click();document.querySelector('#cleanup-cancelamentos').open=true");
        await check("document.querySelectorAll('#cleanup-cancelamentos input:checked').length===0&&document.querySelectorAll('#cleanup-cancelamentos input:not(:disabled)').length===3&&document.querySelector('#cleanup-cancelamentos button').disabled",'Ferramenta lista quantidades e não pré-seleciona testes não certificados');
        await evaluate("document.querySelectorAll('#cleanup-cancelamentos input:not(:disabled)').forEach(n=>n.click());document.querySelector('#cleanup-cancelamentos button').click()");
        await check("document.querySelector('.cleanup-review').children.length===3&&document.querySelector('[data-cleanup-confirm]').disabled",'Revisão identifica três registros e exige confirmação específica');
        await check("document.querySelector('.cleanup-review').textContent.includes('Categoria')&&document.querySelector('.cleanup-review').textContent.includes('Unidade')&&document.querySelector('[data-cleanup-backup]')&&document.querySelector('dialog h2').textContent==='Excluir cancelamentos de teste?'",'Revisão mostra unidade, categoria, quantidade e backup antes da exclusão');
        await evaluate("document.querySelector('[data-cleanup-backup]').click()");
        await screenshot('limpeza-revisao.png');
        await evaluate("document.querySelector('[data-cleanup-back]').click()");await waitFor(()=>evaluate("!document.querySelector('dialog')"),'Cancelar limpeza sem excluir');
        await check("document.querySelectorAll('#past-lessons-list [data-status=\"2\"]').length===5",'Voltar preserva todos os cancelamentos');
        await evaluate("document.querySelector('#cleanup-cancelamentos button').click();document.querySelector('[data-cleanup-consent]').click();document.querySelector('[data-cleanup-confirm]').click()");await waitFor(()=>evaluate("!document.querySelector('dialog')&&document.querySelector('#cleanup-cancelamentos').textContent.includes('Cancelamentos de teste excluídos com sucesso.')"),'Executar limpeza confirmada com backup');
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.depoisLimpeza=await servico.backup();true");
        await check('JSON.stringify(depoisLimpeza.creditos)==='+JSON.stringify(JSON.stringify(snapshotAntes.creditos))+'&&JSON.stringify(depoisLimpeza.registros)==='+JSON.stringify(JSON.stringify(snapshotAntes.registros.filter(r=>!idsRemovidos.includes(r.id)))),'Somente os três cancelamentos escolhidos são excluídos; outras contas, confirmadas, concluídas e créditos permanecem idênticos');
        await check("document.querySelectorAll('#past-lessons-list [data-status=\"2\"]').length===2&&[...Object.keys(localStorage)].filter(k=>k.startsWith('sipa.dev.backup.cancelamentos.')).some(k=>JSON.parse(localStorage.getItem(k)).registros.length===3)",'Aba atualizada e backup durável completo disponível após limpar');
        await waitFor(async()=> (await fs.readdir(artifacts)).some(n=>n.startsWith('sipa-cancelamentos-teste-')&&n.endsWith('.json')),'Download do backup concluído');
        const arquivoBackup=(await fs.readdir(artifacts)).find(n=>n.startsWith('sipa-cancelamentos-teste-')&&n.endsWith('.json')),conteudoBackup=JSON.parse(await fs.readFile(path.join(artifacts,arquivoBackup),'utf8'));
        assert.deepEqual(conteudoBackup.registros,snapshotAntes.registros.filter(r=>idsRemovidos.includes(r.id)));checks.push('Backup JSON baixado contém exatamente os registros excluídos e seu histórico');
        await screenshot('limpeza-concluida.png');
        await navigate('/aluno/html/meu-perfil.html',"document.body?.dataset.sipaLocal==='aluno'");
        await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.antesSenha=JSON.stringify(await servico.backup());window.recusaSenha=await Promise.allSettled([servico.alterarSenhaLocal({atual:'qualquer',nova:'qualquer',confirmacao:'qualquer'})]);true");
        await check("document.querySelector('#change-password-button').disabled&&recusaSenha[0].status==='rejected'&&JSON.stringify(await servico.backup())===antesSenha",'Login livre nao modifica credenciais nem dados locais; alteracao com conta autenticada permanece preservada no servico legado');
        await check("document.querySelector('#profile-cpf').textContent==='000.000.000-00'&&document.querySelector('[data-perfil-total=A]').textContent==='20 aulas'",'Perfil preserva CPF formatado e creditos do cadastro demonstrativo');
        for(const [unidade,tema] of [['Terra Vermelha','light'],['Vila Velha','dark']]){
            await navigate('/aluno/html/agendamento.html',"document.body?.dataset.sipaLocal==='aluno'");
            if(await evaluate('document.documentElement.dataset.theme!=='+JSON.stringify(tema)))await evaluate("document.querySelector('.sipa-theme-toggle').click()");
            await evaluate('document.querySelector("#booking-unidade").value='+JSON.stringify(unidade)+';document.querySelector("#booking-unidade").dispatchEvent(new Event("change"));true');
            await waitFor(()=>evaluate("!!document.querySelector('#calendar-days [data-disponivel=true]:not(:disabled)')"),'Calendário da outra unidade');
            await evaluate("document.querySelector('#calendar-days [data-disponivel=true]:not(:disabled)').click()");await waitFor(()=>evaluate("!!document.querySelector('#time-slots button:not(:disabled)')"),'Horários da outra unidade');
            await evaluate("document.querySelector('#time-slots button:not(:disabled)').click();await selecionarParTeste();document.querySelector('#summary-unit-address').scrollIntoView({block:'center',behavior:'instant'})");await screenshot('endereco-agendamento-'+tema+'.png');
            await evaluate("document.querySelector('#confirm-booking').click()");await waitFor(()=>evaluate("!!document.querySelector('#agendamentos-confirmados[open]')"),'Modal da outra unidade');
            await evaluate("window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();window.cat=await import('/shared/js/catalogoUnidades.js');true");
            await check('document.querySelector("#agendamentos-confirmados").textContent.includes(cat.obterUnidadeInstitucional('+JSON.stringify(unidade)+').enderecoCompleto)&&(await servico.dadosAlunoLocal()).aluno.unidade==="Cobilândia"','Modal usa endereço de '+unidade+' sem alterar vínculo Cobilândia');await screenshot('endereco-confirmacao-'+tema+'.png');
            await navigate('/aluno/html/minhas-aulas.html',"document.body?.dataset.sipaLocal==='aluno'");
            const trecho=unidade==='Vila Velha'?'Av. Luciano das Neves, 1335':'Av. Boa Esperança, 19';
            await check('document.querySelector("#lessons-list").textContent.includes('+JSON.stringify(trecho)+')','Detalhes mantêm endereço da aula em '+unidade);
            await evaluate('[...document.querySelectorAll("#lessons-list .confirmed-lesson-location")].find(n=>n.textContent.includes('+JSON.stringify(trecho)+')).scrollIntoView({block:"center",behavior:"instant"})');await screenshot('endereco-minhas-aulas-'+tema+'.png');
        }





    }
    await navigate('/__tests__/blank',"document.readyState==='complete'");
    await evaluate("(await import('/dev/sessao.js')).entrarDemo('1','qualquer-senha','aluno');window.servico=await (await import('/dev/aluno/authLocal.js')).criarServicoLocal();await servico.configurarCreditosTeste();await servico.configurarUnidadeTeste();await servico.prepararRecursosTeste();true");
    const modo=process.env.SIPA_TEST_CENARIO||'multiplas';
    if(modo==='automatico')await testarAutomaticoAluno();
    else if(modo==='preferencias')await testarPreferenciasAntecipacao();
    else if(modo==='calendario')await testarCalendarioAcessivel();
    else if(modo==='enderecos')await testarLocalizacaoAluno();
    else await testarMultiplas();
    assert.deepEqual(consoleErrors,[]);checks.push('Sem novos erros no console');
    await check('testCalls.length===0','Regressao sem chamadas a API');
    console.log(JSON.stringify({passed:checks.length,checks,medidasLayout,artifacts},null,2));
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
