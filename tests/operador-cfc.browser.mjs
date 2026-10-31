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
    if (result.exceptionDetails) throw new Error(result.exceptionDetails.exception?.description || result.exceptionDetails.text);
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


    // Navegacao real, sem alterar as contas ou o navegador do usuario.
    await send('Page.addScriptToEvaluateOnNewDocument',{source:"const Original=Date;window.Date=class extends Original{constructor(...a){super(...(a.length?a:['2026-10-19T08:00:00-03:00']));}static now(){return Original.parse('2026-10-19T08:00:00-03:00');}};"});
    const route='/nivel-1-operador/html/operador-cfc.html';
    await navigate('/__tests__/blank','true');
    await evaluate("localStorage.setItem('sipa.aluno.preservar','original');sessionStorage.setItem('sipa.token','sessao-preservada-no-teste')");
    for(const query of ['', '?demo=0', '?demo=1&demo=1', '?demo=1&ambiente=integrado']) {
        await navigate(route+query,"!document.getElementById('operador-acesso').hidden");
        await check("document.getElementById('operador-conteudo').hidden&&testCalls.length===0",'Acesso fechado '+query);
    }
    for(const role of ['Aluno','Autoescola','Motorista','PerfilInexistente']){
        const payload=Buffer.from(JSON.stringify({role,exp:2000000000})).toString('base64url');
        await evaluate("sessionStorage.setItem('sipa.token','teste."+payload+".sem-assinatura')");
        await navigate(route,"!document.getElementById('operador-acesso').hidden");
        await check("document.getElementById('operador-conteudo').hidden",'Perfil existente nao vira Operador '+role);
    }
    await evaluate("sessionStorage.setItem('sipa.token','sessao-preservada-no-teste')");
    await navigate(route+'?demo=1&ambiente=local',"!!document.querySelector('.op-unidade')&&!document.getElementById('operador-acesso').hidden===false");
    await check("document.querySelectorAll('[data-op-panel]').length===9&&document.querySelectorAll('[data-op-panel]:not([hidden])').length===1",'Nove secoes, uma visivel');
    await check("document.querySelector('.op-main').textContent.includes('DADOS FICT')&&!document.querySelector('[data-op-nav=acessos]')&&!document.querySelector('[data-op-panel=acessos]')",'Laboratorio identificado e credenciais indisponiveis');
    await check("localStorage.getItem('sipa.operador.demo.v2')===null",'Abrir painel novo nao persiste fixtures ou saldos');
    for(const section of ['alunos','cadastro','agenda','instrutores','recursos','verificacoes','perfil','visao-geral']){
        await evaluate("document.querySelector('[data-op-nav="+section+"]').click()");
        await check("!document.querySelector('[data-op-panel="+section+"]').hidden&&document.activeElement.matches('[data-op-heading]')",'Navegacao e foco '+section);
    }
    await check("document.querySelectorAll('[data-op-metrica]').length===1&&document.querySelector('[data-op-metrica=alunos] strong').textContent==='0'",'Somente indicador autorizado de alunos, sem gerar registros ou creditos');
    await check("!document.querySelector('[data-op-panel=visao-geral] table')&&document.querySelectorAll('[data-op-atalho]').length===6&&!document.querySelector('[data-op-panel=visao-geral]').textContent.match(/Aten\u00e7\u00e3o no atendimento|Acompanhamento de hoje|Agendadas hoje|Realizadas hoje|Ativa\u00e7\u00e3o pendente|Cadastros em verifica\u00e7\u00e3o|Faltas hoje/)",'Inicio sem indicadores e secoes removidos');
    for(const section of ['cadastro','alunos','agenda','instrutores','recursos']){
        await evaluate("document.querySelector('[data-op-atalho="+section+"]').click()");
        await check("!document.querySelector('[data-op-panel="+section+"]').hidden&&document.querySelector('[data-op-nav="+section+"]').getAttribute('aria-current')==='page'",'Atalho funcional '+section);
        await evaluate("document.querySelector('[data-op-nav=visao-geral]').click()");
    }
    await screenshot('inicio-centro-light.png');
    // Somente o perfil descartavel recebe fixtures para o cenario multiunidade.
    await evaluate("(async()=>{const {criarDadosDemo}=await import('/dev/operador/dadosDemo.js');const e=criarDadosDemo();const a={...e.alunos[0],id:'s1',nome:'Aluno Teste Vinculado',cpf:'52998224725',tipoCambio:'manual',categoria:'AB',unidade:'Itaparica',unidadePrincipal:'Itaparica',unidadeCarro:'Itaparica',nascimento:'2000-01-01',financeiro:'Regular',creditos:{A:{contratadas:7,disponiveis:7},B:{contratadas:10,disponiveis:6}},etapas:Object.fromEntries(['medico','psicologico','teorica','ladv','pratica'].map(t=>[t,{status:'Aprovado'}]))};e.alunos=[a,...Array.from({length:11},(_,i)=>({...structuredClone(a),id:'list-'+i,nome:'Cadastro Teste '+String(i).padStart(2,'0'),cpf:'00000000'+String(i+1).padStart(3,'0')})),{...structuredClone(a),id:'externo',nome:'Cadastro Sem Vinculo',unidade:'Santa Rita',unidadePrincipal:'Santa Rita',unidadeCarro:'Santa Rita',tipoCambio:'manual',categoria:'B',cpf:'11144477735'}];e.recursos=['Itaparica','Santa Rita','Centro'].flatMap(u=>[{id:'i-'+u,tipo:'Instrutores',nome:'Instrutor Teste '+u,unidade:u,categorias:['A','B'],ativo:true},{id:'v-'+u,tipo:'Ve\u00edculos',nome:'Carro Teste '+u,unidade:u,tipoCambio:'manual',categoria:'B',ativo:true},{id:'m-'+u,tipo:'Ve\u00edculos',nome:'Moto Teste '+u,unidade:u,categoria:'A',ativo:true}]);e.aulas=['09:00','10:00','13:00'].map((h,i)=>({id:'amanha-'+i,alunoId:'s1',unidade:'Itaparica',tipoCambio:'manual',categoria:'B',data:'2026-10-20',inicio:h,fim:h.slice(0,2)+':50',instrutorId:'i-Itaparica',veiculoId:'v-Itaparica',status:1}));e.aulas.push({id:'elegivel',alunoId:'s1',unidade:'Itaparica',tipoCambio:'manual',categoria:'B',data:'2026-10-23',inicio:'09:00',fim:'09:50',instrutorId:'i-Itaparica',veiculoId:'v-Itaparica',status:1});localStorage.setItem('sipa.operador.demo.v2',JSON.stringify(e));window.fixtureSalva=JSON.stringify(e);})()");
    await navigate(route+'?demo=1&unidade=Itaparica',"document.querySelector('[data-op-metrica=alunos] strong')?.textContent==='12'");
    await evaluate("document.querySelector('[data-op-nav=alunos]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===10&&document.querySelector('.op-local-pagination').children.length>0&&!document.querySelector('[data-op-panel=alunos]').textContent.includes('Cadastro Sem Vinculo')",'Escopo e paginacao de 10 alunos');
    await evaluate("document.querySelector('.op-local-pagination button:last-child').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===2",'Segunda pagina');
    await evaluate("document.querySelector('[data-op-busca]').focus()");
    for(const [digito,esperado] of [['5','5'],['2','52'],['9','529'],['9','529.9'],['8','529.98'],['2','529.982']]){
        await send('Input.insertText',{text:digito});await check("document.querySelector('[data-op-busca]').value==="+JSON.stringify(esperado),'Digitacao progressiva real '+esperado);
    }
    await evaluate("var b=document.querySelector('[data-op-busca]');b.value='529982';b.dispatchEvent(new Event('input'))");
    await check("document.querySelector('[data-op-busca]').value==='529.982'&&document.querySelectorAll('[data-op-aluno]').length===2",'Mascara progressiva sem executar pesquisa durante digitacao');
    await evaluate("document.querySelector('[data-op-pesquisar=busca]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===1&&document.querySelector('.op-local-pagination').children.length===0&&document.querySelector('[data-op-panel=alunos]').textContent.includes('529.982.247-25')",'Busca CPF completo formatado e retorno a pagina 1');
    await evaluate("window.linhaPesquisa=document.querySelector('[data-op-panel=alunos] tbody');document.querySelector('[data-op-pesquisar=busca]').click();document.querySelector('[data-op-pesquisar=busca]').click()");
    await check("window.linhaPesquisa===document.querySelector('[data-op-panel=alunos] tbody')",'Cliques repetidos sem mudanca nao refazem a consulta local');
    await evaluate("var b=document.querySelector('[data-op-busca]');b.value='inexistente';b.dispatchEvent(new Event('input'))");
    await evaluate("document.querySelector('[data-op-pesquisar=categoria]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===0",'Busca sem resultados');
    for(const cpf of ['52998224725','529.982.247-25','52998224725999']){
        await evaluate("var b=document.querySelector('[data-op-busca]');b.value="+JSON.stringify(cpf)+";b.dispatchEvent(new Event('input'));document.querySelector('[data-op-pesquisar=busca]').click()");
        await check("document.querySelector('[data-op-busca]').value==='529.982.247-25'&&document.querySelectorAll('[data-op-aluno]').length===1&&document.querySelector('[data-op-aluno]').dataset.opAluno==='s1'",'CPF pontuado ou sem pontos, limite e comparacao exata '+cpf);
    }
    await evaluate("var b=document.querySelector('[data-op-busca]');b.value='529.982.247-25';b.setSelectionRange(4,4);b.dispatchEvent(new InputEvent('beforeinput',{inputType:'deleteContentBackward',bubbles:true,cancelable:true}))");
    await check("document.querySelector('[data-op-busca]').value.replace(/\\D/g,'')==='5298224725'",'Backspace sobre pontuacao remove digito sem prender cursor');
    await evaluate("document.querySelector('[data-op-limpar-busca]').click();var b=document.querySelector('[data-op-busca]');b.value='Aluno Teste';b.dispatchEvent(new Event('input'));b.dispatchEvent(new KeyboardEvent('keydown',{key:'Enter',bubbles:true,cancelable:true}))");
    await check("document.querySelector('[data-op-busca]').value==='Aluno Teste'&&document.querySelectorAll('[data-op-aluno]').length===1",'Nome parcial preservado e pesquisa por Enter');
    await evaluate("var b=document.querySelector('[data-op-busca]');b.value='Aluno 529982';b.dispatchEvent(new Event('input'));document.querySelector('[data-op-pesquisar=busca]').click()");
    await check("document.querySelector('[data-op-busca]').value==='Aluno 529982'&&document.querySelectorAll('[data-op-aluno]').length===0",'Nome com numeros nao vira pesquisa por CPF');
    for(const [key,value,total] of [['situacao','Pendente',12],['categoria','AB',12],['categoria','B',0],['principal','Itaparica',12],['carro','Itaparica',12],['principal','Santa Rita',0]]){
        await evaluate("document.querySelector('[data-op-limpar-busca]').click();document.querySelector('[data-op-filtro="+key+"]').value="+JSON.stringify(value)+";document.querySelector('[data-op-pesquisar="+key+"]').click()");
        await check("document.querySelector('[data-op-contagem]').textContent.startsWith('"+total+" aluno')&&document.querySelector('[data-op-filtro="+key+"]').value==="+JSON.stringify(value), 'Filtro individual '+key+' '+value);
    }
    await evaluate("document.querySelector('[data-op-limpar-busca]').click();document.querySelector('[data-op-busca]').value='52998224725';document.querySelector('[data-op-busca]').dispatchEvent(new Event('input'));document.querySelector('[data-op-filtro=categoria]').value='B';document.querySelector('[data-op-filtro=principal]').value='Itaparica';document.querySelector('[data-op-pesquisar=principal]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===0&&document.querySelector('[data-op-panel=alunos]').textContent.includes('Nenhum aluno encontrado para os filtros informados.')",'Filtros combinados nao ignoram categoria ao pesquisar CPF');
    await evaluate("document.querySelector('[data-op-filtro=categoria]').value='AB';document.querySelector('[data-op-pesquisar=carro]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===1",'Todos os filtros sao aplicados por qualquer lupa');
    await evaluate("document.querySelector('[data-op-limpar-busca]').click();document.querySelector('[data-op-busca]').value='11144477735';document.querySelector('[data-op-busca]').dispatchEvent(new Event('input'));document.querySelector('[data-op-pesquisar=busca]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===0",'CPF completo externo nao revela aluno de outra unidade');
    await evaluate("document.querySelector('[data-op-limpar-busca]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===10&&[...document.querySelectorAll('[data-op-filtro]')].every(n=>n.value==='')&&document.querySelector('[data-op-contagem]').textContent.startsWith('12 aluno')",'Limpeza restaura todos os autorizados na primeira pagina');
    await evaluate("document.querySelector('[data-op-nav=cadastro]').click()");
    await evaluate("document.querySelector('[data-op-panel=cadastro] form').requestSubmit()");
    await check("document.querySelectorAll('[data-op-panel=cadastro] [aria-invalid=true]').length>=7&&document.activeElement.name==='nome'&&!document.querySelector('[data-op-confirmar-cadastro]').open",'Cadastro vazio bloqueado com erros por campo e foco no primeiro');
    for(const [categoria,carro,moto] of [['A',false,true],['B',true,false],['AB',true,true]]){
        await evaluate("var f=document.querySelector('[data-op-panel=cadastro] form');f.elements.categoria.value='"+categoria+"';f.elements.categoria.dispatchEvent(new Event('change'))");
        await check("(()=>{const f=document.querySelector('[data-op-panel=cadastro] form'),d=new FormData(f);return !f.elements.quantidadeCarro.disabled==="+carro+"&&!f.elements.quantidadeMoto.disabled==="+moto+"&&d.has('quantidadeCarro')==="+carro+"&&d.has('quantidadeMoto')==="+moto+"&&f.elements.unidadeCarro.required==="+carro+";})()",'Quantidades e unidade condicionais '+categoria);
    }
    await evaluate("var f=document.querySelector('[data-op-panel=cadastro] form');f.elements.quantidadeCarro.value='20';f.elements.quantidadeMoto.value='15';f.elements.categoria.value='A';f.elements.categoria.dispatchEvent(new Event('change'));f.elements.categoria.value='AB';f.elements.categoria.dispatchEvent(new Event('change'))");
    await check("(()=>{const f=document.querySelector('[data-op-panel=cadastro] form');return f.elements.quantidadeCarro.value===''&&f.elements.quantidadeMoto.value==='15';})()",'Troca de categoria descarta somente quantidade nao aplicavel');
    await evaluate("var f=document.querySelector('[data-op-panel=cadastro] form');Object.entries({nome:'Cadastro Teste Novo',cpf:'12345678901',nascimento:'2000-01-01',telefone:'27999998888',email:'novo@example.invalid',tipoCambio:'manual',categoria:'AB',unidadeCarro:'Santa Rita',quantidadeCarro:'20',quantidadeMoto:'15',observacoes:'Cadastro de teste solicitado no atendimento.'}).forEach(([k,v])=>f.elements[k].value=v);f.elements.categoria.dispatchEvent(new Event('change'));f.elements.tipoCambio.value='manual';f.elements.tipoCambio.dispatchEvent(new Event('change'));f.elements.unidadeCarro.value='Santa Rita';f.requestSubmit()");
    await waitFor(()=>evaluate("document.querySelector('[name=cpf]').getAttribute('aria-invalid')==='true'&&document.querySelector('#cadastro-erro-cpf').textContent.includes('CPF')"),'CPF invalido');
    await evaluate("var f=document.querySelector('[data-op-panel=cadastro] form');f.elements.cpf.value='93541134780';f.elements.cpf.dispatchEvent(new Event('input'))");
    await check("!document.querySelector('[name=cpf]').hasAttribute('aria-invalid')&&document.querySelector('[name=nome]').value==='Cadastro Teste Novo'",'Correcao remove erro e preserva dados');
    for(const [key,value] of [['email','invalido'],['quantidadeCarro','0'],['quantidadeCarro','-1'],['quantidadeMoto','1.5'],['unidadeCarro',''],['observacoes','   ']]){
        await evaluate("var f=document.querySelector('[data-op-panel=cadastro] form');window.valorAnterior=f.elements['"+key+"'].value;f.elements['"+key+"'].value="+JSON.stringify(value)+";f.requestSubmit()");
        await check("document.querySelector('[name="+key+"]').getAttribute('aria-invalid')==='true'&&!document.querySelector('[data-op-confirmar-cadastro]').open",'Validacao visual bloqueia '+key+' '+value);
        await evaluate("var f=document.querySelector('[data-op-panel=cadastro] form');f.elements['"+key+"'].value=window.valorAnterior;f.elements['"+key+"'].dispatchEvent(new Event('"+(key==='unidadeCarro'?'change':'input')+"'))");
    }
    await evaluate("document.querySelector('[data-op-panel=cadastro] [name=cpf]').value='93541134780';document.querySelector('[data-op-panel=cadastro] form').requestSubmit()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-confirmar-cadastro]').open"),'Revisar cadastro');
    await check("JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).alunos.length===13",'Nenhum cadastro salvo antes de confirmar');
    for(const width of [1440,390])for(const theme of ['light','dark']){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate("SipaTema.salvar('"+theme+"')");
        await check("(()=>{const d=document.querySelector('[data-op-confirmar-cadastro]');return d.querySelectorAll('.op-confirm-item').length===8&&[...d.querySelectorAll('.op-confirm-item')].every(n=>!n.querySelector('svg')&&n.querySelector('strong').textContent.endsWith(':')&&n.querySelector('.op-confirm-value'))&&d.scrollWidth<=d.clientWidth;})()",'Confirmacao com oito campos legiveis '+width+' '+theme);
        await check("(()=>{const d=document.querySelector('[data-op-confirmar-cadastro]'),itens=[...d.querySelectorAll('.op-confirm-item')],r=d.getBoundingClientRect(),footer=d.querySelector('footer').getBoundingClientRect(),g=d.querySelector('.op-confirm-grid');return itens[1].querySelector('.op-confirm-value').textContent==='935.411.347-80'&&itens[2].querySelector('.op-confirm-value').textContent==='A+B'&&itens.every((n,i)=>!i||n.getBoundingClientRect().top>=itens[i-1].getBoundingClientRect().bottom)&&getComputedStyle(g).gridTemplateColumns.split(' ').length===1&&footer.bottom<=r.bottom&&getComputedStyle(d,'::backdrop').backdropFilter==='none'&&getComputedStyle(itens[0]).backgroundColor==="+(theme==='dark'?"'rgb(32, 50, 71)'":"'rgb(255, 255, 255)'")+";})()",'Lista vertical solida, CPF completo e rodape visivel '+width+' '+theme);
        await evaluate("document.querySelector('.op-confirm-grid').scrollTop=9999");
        await check("(()=>{const d=document.querySelector('[data-op-confirmar-cadastro]'),h=d.querySelector('.op-dialog-heading').getBoundingClientRect(),f=d.querySelector('footer').getBoundingClientRect(),r=d.getBoundingClientRect();return h.top>=r.top&&f.bottom<=r.bottom&&d.scrollTop===0;})()",'Rolagem restrita aos dados '+width+' '+theme);
        await screenshot('confirmar-cadastro-'+width+'-'+theme+'.png');
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
    await evaluate("sessionStorage.setItem('alunos-antes-cadastro',JSON.stringify(JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).alunos));var b=document.querySelector('[data-op-confirmar-cadastro] .op-button-primary');b.click();b.click()");
    await waitFor(()=>evaluate("JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).alunos.length===14"),'Cadastro persistido');
    await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')),a=e.alunos.at(-1);return a.unidadePrincipal==='Itaparica'&&a.unidadeCarro==='Santa Rita'&&a.aulas===0&&a.creditos.B.disponiveis===20&&a.creditos.A.disponiveis===15&&a.id!==a.cpf&&a.aulasAdquiridas.B===20&&a.aulasAdquiridas.A===15&&JSON.stringify(e.alunos.slice(0,-1))===sessionStorage.getItem('alunos-antes-cadastro');})()",'Cadastro unico com quantidades separadas, com creditos imediatos sem alterar alunos existentes');
    await evaluate("document.querySelector('[data-op-nav=alunos]').click();document.querySelector('[data-op-aluno=s1]').click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').open"),'Ficha abre');
    await check("document.querySelector('[data-op-ficha]').textContent.includes('529.982.247-25')&&document.querySelector('[data-op-ficha]').textContent.includes('Unidade Itaparica')",'Ficha autorizada completa');
    await (await import('./operador-ficha.browser.steps.mjs')).validarFicha({evaluate,waitFor,check,send,screenshot});
    for(const categoria of ['A','B']){
        await evaluate("document.querySelector('[data-op-ficha]').close();var e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));e.alunos.find(a=>a.id==='list-0').categoria='"+categoria+"';localStorage.setItem('sipa.operador.demo.v2',JSON.stringify(e));document.querySelector('[data-op-aluno=list-0]').click()");
        await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').open&&document.querySelectorAll('[data-op-ficha] .op-local-tabs button').length===6"),'Ficha categoria '+categoria);
        await evaluate("document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[1].click()");
        await waitFor(()=>evaluate("!!document.querySelector('[data-op-exames-ficha]')"),'Acompanhamento categoria '+categoria);
        await check("document.querySelectorAll('[data-op-prova]').length===2&&!!document.querySelector('[data-op-prova="+(categoria==='A'?'praticaMoto':'praticaCarro')+"]')&&!document.querySelector('[data-op-prova="+(categoria==='A'?'praticaCarro':'praticaMoto')+"]')",'Somente prova aplicavel categoria '+categoria);
        await evaluate("document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[2].click()");
        await waitFor(()=>evaluate("!!document.querySelector('[data-op-resumo-categoria]')"),'Resumo da categoria '+categoria);
        await check("document.querySelectorAll('[data-op-resumo-categoria]').length===1&&document.querySelector('[data-op-resumo-categoria]').dataset.opResumoCategoria==='"+categoria+"'",'Somente card da categoria '+categoria);
    }
    await evaluate("document.querySelector('[data-op-ficha]').close();var e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));e.alunos.find(a=>a.id==='list-0').categoria='AB';localStorage.setItem('sipa.operador.demo.v2',JSON.stringify(e));document.querySelector('[data-op-aluno=s1]').click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').open&&!!document.querySelector('[data-op-transferir]')"),'Retorno ficha original');
    await evaluate("document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[2].click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').textContent.includes('Categoria B')"),'Creditos por categoria');
    await check("document.querySelectorAll('[data-op-resumo-categoria]').length===2&&!document.querySelector('[data-op-ficha] table')&&[...document.querySelectorAll('[data-op-total=adquiridas]')].every(x=>x.textContent==='Não informado')",'Dois cards compactos sem saldo inventado ou tabela');
    await evaluate("(async()=>{sessionStorage.setItem('antes-resumo',localStorage.getItem('sipa.operador.demo.v2'));const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));e.alunos[0].aulasAdquiridas={A:5,B:10};e.aulas.push(...['A','B'].flatMap(c=>[5,6].map(status=>({id:'resultado-'+c+'-'+status,alunoId:'s1',categoria:c,unidade:c==='A'?'Centro':'Santa Rita',data:'2026-10-16',inicio:'07:00',fim:'07:50',instrutorId:'i-'+(c==='A'?'Centro':'Santa Rita'),veiculoId:(c==='A'?'m-Centro':'v-Santa Rita'),status:1}))));localStorage.setItem('sipa.operador.demo.v2',JSON.stringify(e));sessionStorage.setItem('resumo-antes-presenca',JSON.stringify(e));const sessao=await import('/dev/sessao.js'),r=await import('/dev/instrutor/agendamentosLocais.js');sessao.entrarDemo('teste','teste','instrutor');for(const c of ['A','B']){await r.vincularCadastro(JSON.stringify(['operador','i-'+(c==='A'?'Centro':'Santa Rita')]));for(const status of [5,6])await r.registrarAgendamentoVinculado('resultado-'+c+'-'+status,status);}let recusado=false;try{await r.registrarAgendamentoVinculado('resultado-B-5',5);}catch{recusado=true;}window.__duplicadoRecusado=recusado;sessao.entrarDemo('teste','teste','operador','Itaparica');document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[2].click();})()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-resumo-categoria=A] [data-op-total=realizadas]')?.textContent==='1'"),'Presenca do instrutor refletida na ficha');
    await check("window.__duplicadoRecusado&&[...document.querySelectorAll('[data-op-total=realizadas],[data-op-total=faltas]')].every(x=>x.textContent==='1')&&document.querySelector('[data-op-resumo-categoria=A] [data-op-total=adquiridas]').textContent==='5'&&document.querySelector('[data-op-resumo-categoria=B] [data-op-total=adquiridas]').textContent==='10'",'Presenca e falta A/B entre unidades sem contagem duplicada');
    await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')),antes=JSON.parse(sessionStorage.getItem('resumo-antes-presenca'));return JSON.stringify(e.alunos)===JSON.stringify(antes.alunos)&&e.aulas.slice(-4).every(a=>a.historico.length===1&&a.historico[0].autor===a.instrutorId)&&e.aulas.slice(-4).every((a,i)=>a.unidade===antes.aulas.at(-4+i).unidade);})()",'Presencas preservam creditos, cadastros, unidades e auditam o registro original');
    for(const width of [1440,390])for(const theme of ['light','dark']){
        await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate("SipaTema.salvar('"+theme+"')");
        await check("(()=>{const d=document.querySelector('[data-op-ficha]'),g=d.querySelector('.op-resumo-aulas');return d.scrollWidth<=d.clientWidth+1&&getComputedStyle(g).gridTemplateColumns.split(' ').length==="+(width===1440?2:1)+";})()",'Resumo responsivo '+width+' '+theme);await screenshot('aulas-creditos-'+width+'-'+theme+'.png');
    }
    await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
    await evaluate("document.querySelector('[data-op-ficha]').close();document.querySelector('[data-op-aluno=s1]').click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').open"),'Reabrir ficha de resultados');
    await evaluate("document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[2].click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-resumo-categoria=B] [data-op-total=faltas]')?.textContent==='1'"),'Resultados persistem ao reabrir');
    await evaluate("document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[4].click()");
    await waitFor(()=>evaluate("!!document.querySelector('[data-op-linha-tempo]')"),'Historico detalhado preservado');
    await evaluate("var f=document.querySelector('.op-timeline-filtros');f.elements.tipo.value='aulas';f.requestSubmit()");
    await check("document.querySelector('[data-op-ficha]').textContent.includes('Aula realizada')&&document.querySelector('[data-op-ficha]').textContent.includes('Cobil')===false&&document.querySelector('[data-op-ficha]').textContent.includes('Santa Rita')",'Historico mostra aulas e unidades originais');
    await evaluate("localStorage.setItem('sipa.operador.demo.v2',sessionStorage.getItem('antes-resumo'))");
    await evaluate("document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[5].click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').textContent.includes('Nenhuma credencial')"),'Acesso da ficha');
    await check("!document.querySelector('[data-op-ficha] input[type=password]')",'Ficha de acesso nao expoe senha');
    // Resultado administrativo permanece registrado, mas nao condiciona reserva.
    await check("(async()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')),a=e.alunos[0],m=await import('/shared/js/elegibilidadeAluno.js'),r=await import('/nivel-1-operador/js/dominioOperador.js');const n=r.agendarAula(e,{id:'operador-teste',unidade:'Itaparica',permissoes:['consultar','agendar']},{alunoId:a.id,tipoCambio:'manual',categoria:'B',data:'2026-10-23',inicio:'14:00',instrutorId:'i-Itaparica',veiculoId:'v-Itaparica'},'consulta-sem-gravacao',new Date('2026-10-19T08:00:00-03:00'));return m.pendenciasAgendamento(a,'2026-10-23').some(p=>p.tipo==='medico'&&p.situacao==='Reprovado')&&n.aulas.at(-1).id==='consulta-sem-gravacao'&&a.examesAdministrativos.medico.status==='Reprovado';})()",'Reprovacao medica permanece no acompanhamento sem bloquear a reserva');
    await evaluate("document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[0].click()");
    await waitFor(()=>evaluate("!!document.querySelector('[data-op-transferir]')"),'Retorno ao cadastro');
    await evaluate("document.querySelector('[data-op-transferir]').click();const s=document.querySelector('[data-op-nova-unidade]');s.value='Santa Rita';s.dispatchEvent(new Event('change'))");
    await waitFor(()=>evaluate("!document.querySelector('[data-op-confirmar-transferencia]').disabled"),'Previa transferencia');
    await check("document.querySelectorAll('[data-op-transferencia] input[type=checkbox]:disabled').length===3&&document.querySelectorAll('[data-op-transferencia] input[type=checkbox]:not(:disabled)').length===1",'Tres aulas amanha bloqueadas e uma elegivel');
    await screenshot('transferencia-light.png');
    await evaluate("document.querySelector('[data-op-motivo-transferencia]').value='Solicitado pelo aluno no atendimento';document.querySelector('[data-op-confirmar-transferencia]').click()");
    await waitFor(()=>evaluate("!document.querySelector('[data-op-transferencia]').open"),'Transferencia salva');
    await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));return e.alunos[0].unidadeCarro==='Santa Rita'&&e.alunos[0].unidadePrincipal==='Itaparica'&&e.alunos[0].creditos.B.disponiveis===6&&e.aulas.every(a=>a.unidade==='Itaparica'&&a.status===1)&&e.alunos[0].historico.at(-1).mantidas.length===4;})()",'Transferencia imediata sem migrar, cancelar ou restituir automaticamente');
    await evaluate("document.querySelector('[data-op-ficha]').close()");
    await navigate(route+'?demo=1&unidade=Santa%20Rita',"document.querySelector('.op-unidade')&&!document.getElementById('operador-acesso').hidden===false");
    await evaluate("document.querySelector('[data-op-nav=agenda]').click();const d=document.querySelector('[data-agenda-data]');d.value='2026-10-23';d.dispatchEvent(new Event('change'))");
    await check("document.querySelectorAll('[data-agenda-coluna] [data-agenda-horario]').length===12&&!document.querySelector('[data-agendar-horario=\"11:00\"]')&&!document.querySelector('[data-agendar-horario=\"12:00\"]')",'Grade com 12 linhas e almoco bloqueado');
    await evaluate("document.querySelector('[data-agendar-horario=\"14:00\"]').click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-agendar]').open"),'Modal de agendamento');
    await evaluate("document.querySelector('[data-op-reserva-aluno=s1]').click();document.querySelector('[data-op-reserva-confirmar]').click()");
    await waitFor(()=>evaluate("!document.querySelector('[data-op-agendar]').open"),'Reserva salva');
    await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')),a=e.aulas.at(-1);return a.unidade==='Santa Rita'&&a.instrutorId==='i-Santa Rita'&&a.veiculoId==='v-Santa Rita'&&a.inicio==='14:00'&&a.fim==='14:50'&&e.alunos[0].creditos.B.disponiveis===5&&e.aulas.slice(0,4).every(x=>x.unidade==='Itaparica');})()",'Nova reserva utiliza recursos atuais, 50 min, saldo existente e preserva anteriores');
    await evaluate("document.querySelector('[data-agenda-modo=semana]').click()");await check("document.querySelectorAll('[data-agenda-coluna]').length===7",'Agenda semanal preservada');
    await evaluate("document.querySelector('[data-agenda-modo=mes]').click()");await check("document.querySelectorAll('[data-agenda-dia]').length>=28",'Agenda mensal preservada');
    await navigate(route+'?demo=1&unidade=Centro',"!!document.querySelector('.op-unidade')");
    await evaluate("document.querySelector('[data-op-nav=alunos]').click()");
    await check("document.querySelectorAll('[data-op-aluno]').length===0&&!document.querySelector('[data-op-panel=alunos]').textContent.includes('Aluno Teste Vinculado')",'Pista Centro nao libera ficha administrativa externa');
    await evaluate("document.querySelector('[data-op-nav=agenda]').click();const d=document.querySelector('[data-agenda-data]');d.value='2026-10-23';d.dispatchEvent(new Event('change'));document.querySelector('[data-agendar-horario=\"15:00\"]').click()");
    await waitFor(()=>evaluate("document.querySelector('[data-op-agendar]').open"),'Agendamento moto na pista');
    await evaluate("var s=document.querySelector('[data-op-reserva-par]');s.value='1';s.dispatchEvent(new Event('change'))");
    await waitFor(()=>evaluate("!!document.querySelector('[data-op-reserva-aluno=s1]')"),'Aluno autorizado na pista');
    await evaluate("document.querySelector('[data-op-reserva-aluno=s1]').click();document.querySelector('[data-op-reserva-confirmar]').click()");
    await waitFor(()=>evaluate("!document.querySelector('[data-op-agendar]').open"),'Reserva moto salva');
    await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));return e.aulas.at(-1).categoria==='A'&&e.aulas.at(-1).unidade==='Vila Velha'&&e.alunos[0].creditos.A.disponiveis===6;})()",'Moto exclusivamente Centro com dados minimos para operacao');
    await evaluate("document.querySelector('[data-op-nav=visao-geral]').click()");
    for(const width of [1440,900,390]){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});
        for(const theme of ['light','dark']){
            await evaluate("SipaTema.salvar('"+theme+"')");
            for(const section of ['visao-geral','alunos','cadastro','agenda','instrutores','recursos','perfil']){
                await evaluate("document.querySelector('[data-op-nav="+section+"]').click()");
                if(section==='alunos'){
                    await check("(()=>{const f=document.querySelector('.op-local-filters'),r=f.getBoundingClientRect();return document.querySelectorAll('[data-op-pesquisar]').length===5&&[...document.querySelectorAll('[data-op-pesquisar]')].every(b=>{const x=b.getBoundingClientRect();return x.width>=38&&x.height>=40&&x.right<=r.right+1&&b.querySelector('svg');});})()",'Lupas alinhadas e clicaveis '+width+' '+theme);
                    await screenshot('pesquisa-alunos-'+width+'-'+theme+'.png');
                }
                if(section==='cadastro'){
                    await evaluate("var f=document.querySelector('[data-op-panel=cadastro] form');f.elements.categoria.value='AB';f.elements.categoria.dispatchEvent(new Event('change'));f.elements.quantidadeCarro.value='20';f.elements.quantidadeMoto.value='15'");
                    await check("getComputedStyle(document.querySelector('.op-cadastro-quantidades')).gridTemplateColumns.split(' ').length==="+(width>760?2:1)+"&&document.querySelector('[data-op-panel=cadastro] button[type=submit]').textContent==='Confirmar cadastro'",'Quantidades AB alinhadas '+width+' '+theme);
                    await check("(()=>{const n=document.querySelector('.op-pista-aviso'),s=document.querySelector('[name=unidadeCarro]'),r=n.getBoundingClientRect(),b=s.getBoundingClientRect();return n.textContent.includes('1335')&&!n.querySelector('svg')&&getComputedStyle(n).fontSize==='12px'&&("+(width>760?"r.left>=b.right&&Math.abs(r.top-b.top)<3&&Math.abs(r.width-b.width)<2":"r.top>=b.bottom&&Math.abs(r.left-b.left)<2")+")&&!document.querySelector('[data-op-panel=cadastro] .op-inline-note');})()",'Pista em coluna direita ou empilhada sem sobreposicao '+width+' '+theme);
                    await screenshot('cadastro-'+width+'-'+theme+'.png');
                }
                await check("document.documentElement.scrollWidth<=innerWidth+1",'Sem overflow '+section+' '+width+' '+theme);
            }
            await evaluate("document.querySelector('[data-op-nav=visao-geral]').click()");
            const colunas=width>1100?3:width>600?2:1;
            await check("getComputedStyle(document.querySelector('.op-quick-grid')).gridTemplateColumns.split(' ').length==="+colunas+"&&[...document.querySelectorAll('.op-quick-action')].every(n=>n.scrollHeight<=n.clientHeight&&n.querySelectorAll('svg').length===2)&&document.documentElement.dataset.theme==='"+theme+"'",'Grade de atalhos legivel '+colunas+' colunas '+theme);
            await screenshot('inicio-'+width+'-'+theme+'.png');
        }
    }
    await evaluate("document.querySelector('.op-menu-mobile').click()");await check("document.querySelector('.op-sidebar').classList.contains('op-open')",'Menu mobile acessivel');
    await evaluate("document.querySelector('[data-op-nav=alunos]').click()");await check("!document.querySelector('.op-sidebar').classList.contains('op-open')",'Menu mobile fecha na navegacao');
    await check("localStorage.getItem('sipa.aluno.preservar')==='original'&&sessionStorage.getItem('sipa.token')==='sessao-preservada-no-teste'&&testCalls.length===0",'Dados dos outros perfis e sessao preservados, nenhuma API');
    await navigate(route+'?demo=1&unidade=Itaparica',"!!document.querySelector('.op-unidade')");
    await evaluate("document.querySelector('[data-op-nav=alunos]').click();document.querySelector('[data-op-aluno=s1]').click()");
    await waitFor(()=>evaluate("!!document.querySelector('[data-op-transferir]')&&document.querySelector('[data-op-ficha]').open"),'Ficha depois de recarregar');
    await check("document.querySelector('[data-op-ficha]').textContent.includes('Unidade Santa Rita')",'Unidade transferida persiste na recarga');
    await evaluate("document.querySelector('[data-op-transferir]').click();var s=document.querySelector('[data-op-nova-unidade]');s.value='Cobil\u00e2ndia';s.dispatchEvent(new Event('change'))");
    await waitFor(()=>evaluate("!document.querySelector('[data-op-confirmar-transferencia]').disabled"),'Segunda previa');
    await evaluate("document.querySelector('[data-op-transferencia] input[type=checkbox]').checked=true;document.querySelector('[data-op-motivo-transferencia]').value='Nova solicitacao com cancelamento expresso';document.querySelector('[data-op-confirmar-transferencia]').click()");
    await waitFor(()=>evaluate("!document.querySelector('[data-op-transferencia]').open"),'Cancelamento elegivel confirmado');
    await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));return e.aulas[4].status===2&&e.aulas[4].unidade==='Santa Rita'&&e.aulas.slice(0,4).every(a=>a.status===1&&a.unidade==='Itaparica')&&e.alunos[0].creditos.B.disponiveis===6&&e.alunos[0].historico.at(-1).canceladas.length===1;})()",'Somente cancelamento selecionado altera reserva e devolve credito existente');
    await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));return e.contasAlunos.length===1&&e.contasAlunos[0].hash.length===64&&e.contasAlunos[0].alunoId===e.alunos.at(-1).id&&!localStorage.getItem('sipa.operador.demo.v2').includes('senha-segura-local-123');})()",'Conta ficticia vinculada com hash e sem senha em texto puro');
    await navigate('/login.html?ambiente=local',"!!document.querySelector('#conta-aluno-cadastrada')");
    await evaluate("document.querySelector('#conta-aluno-cadastrada').checked=true;document.querySelector('#login-cpf').value='935.411.347-80';document.querySelector('#login-password').value='935411';document.querySelector('#login-form').requestSubmit()");
    await waitFor(()=>evaluate("document.querySelector('[data-definir-senha-recepcao]')?.open"),'Primeiro login exige nova senha');
    await check("(()=>{const f=document.querySelector('[data-definir-senha-recepcao] form');return f.elements.nova.minLength===4&&f.elements.confirmacao.minLength===4&&f.elements.nova.maxLength===128&&f.textContent.includes('m\u00ednimo de 4 caracteres');})()",'Primeiro acesso permite quatro caracteres e preserva limite de 128');
    await send('Page.navigate',{url:origin+'/aluno/html/dashboard.html?alunoId=s1'});
    await waitFor(()=>evaluate("location.pathname==='/login.html'&&document.querySelector('[data-definir-senha-recepcao]')?.open"),'Pagina protegida bloqueada antes da troca');
    await check("!document.querySelector('.conta-recepcao')",'Nenhum dado protegido exposto durante ativacao pendente');
    await evaluate("var f=document.querySelector('[data-definir-senha-recepcao] form');f.elements.nova.value='1234';f.elements.confirmacao.value='1234';f.requestSubmit()");
    await waitFor(()=>evaluate("document.body.dataset.sipaOrigem==='recepcao'"),'Aluno ativado acessa seu painel');
    await navigate('/aluno/html/meu-perfil.html',"document.querySelector('#profile-cpf')?.textContent==='935.411.347-80'");
    await check("document.querySelector('main').textContent.includes('Cadastro Teste Novo')&&document.querySelector('main').textContent.includes('935.411.347-80')&&!document.querySelector('main').textContent.includes('Aluno Teste Vinculado')",'Painel le cadastro central do aluno autenticado, sem outros alunos');
    await check("(async()=>{const m=await import('/dev/aluno/contaRecepcao.js');return (await m.consultarMinhaContaRecepcao('s1')).aluno.cpf==='93541134780';})()",'Parametro de terceiro nao altera identidade da consulta');
    await evaluate("(async()=>{const m=await import('/dev/aluno/contaRecepcao.js');await m.sairContaRecepcao();location.assign('/login.html?ambiente=local');})()");
    await waitFor(()=>evaluate("location.pathname==='/login.html'&&!!document.querySelector('#conta-aluno-cadastrada')"),'Sair da conta vinculada');
    await evaluate("document.querySelector('#conta-aluno-cadastrada').checked=true;document.querySelector('#login-cpf').value='93541134780';document.querySelector('#login-password').value='935411';document.querySelector('#login-form').requestSubmit()");
    await waitFor(()=>evaluate("!document.querySelector('#login-submit').disabled&&document.querySelector('#login-message').textContent.includes('inv')"),'Senha provisoria deixa de autenticar');
    await evaluate("document.querySelector('#login-password').value='1234';document.querySelector('#login-form').requestSubmit()");
    await waitFor(()=>evaluate("document.body.dataset.sipaOrigem==='recepcao'"),'Novo login com senha definida');
    await navigate('/aluno/html/meu-perfil.html',"document.querySelector('#profile-cpf')?.textContent==='935.411.347-80'");
    await check("!document.querySelector('[data-definir-senha-recepcao]')&&sessionStorage.getItem('sipa.token')==='sessao-preservada-no-teste'",'Login posterior sem nova ativacao e token real preservado');
    for(const width of [1440,390])for(const theme of ['light','dark']){
        await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate("SipaTema.salvar('"+theme+"')");
        await check("document.documentElement.scrollWidth<=innerWidth&&document.querySelector('main').textContent.includes('Cadastro Teste Novo')",'Conta propria responsiva '+width+' '+theme);await screenshot('conta-aluno-'+width+'-'+theme+'.png');
    }
    await evaluate("document.querySelector('#mobile-menu-button,[id$=\"-mobile-menu\"],.student-menu-toggle').click()");await check("document.querySelector('.sipa-sidebar').classList.contains('mobile-open')",'Conta vinculada preserva acesso ao menu no celular');
    assert.deepEqual(consoleErrors,[]);checks.push('Nenhum erro novo no console');
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
