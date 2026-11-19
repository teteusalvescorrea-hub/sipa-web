// Gera o PDF do guia a partir do Markdown (só lê o .md e as imagens; não toca na aplicação).
// uso: node gerar-guia.mjs <arquivo.md> <saida.pdf>
// Passo 1: Markdown → HTML (capa, sumário com links, capítulos, figuras com legenda).
// Passo 2: Edge sem janela imprime o HTML em PDF (A4, cabeçalho e rodapé pelo @page).
// Passo 3: lê no PDF a página de cada destino do sumário e imprime de novo com os números das páginas.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import {spawn} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const [entrada, saida] = process.argv.slice(2);
const EDGE = 'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe';
const base = path.dirname(path.resolve(entrada));
const md = fs.readFileSync(entrada, 'utf8').replace(/\r/g, '');

// ---------- Markdown → HTML (o necessário para o guia) ----------
const esc = s => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = s => esc(s).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>').replace(/(^|[^*])\*(?!\s)(.+?)\*/g, '$1<em>$2</em>').replace(/`([^`]+)`/g, '<code>$1</code>');
const slug = s => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
const sumario = [], usados = new Set();
let figura = 0;
function idPara(t) { let id = slug(t) || 'sec', n = 2; while (usados.has(id)) id = slug(t) + '-' + n++; usados.add(id); return id; }

const capa = {}; let corpo = md;
const m = /^---\n([\s\S]*?)\n---\n/.exec(md);
if (m) { for (const l of m[1].split('\n')) { const i = l.indexOf(':'); if (i > 0) capa[l.slice(0, i).trim()] = l.slice(i + 1).trim(); } corpo = md.slice(m[0].length); }

const linhas = corpo.split('\n'), html = [];
let i = 0, capitulo = 0, secao = 0;
while (i < linhas.length) {
  const l = linhas[i];
  if (!l.trim()) { i++; continue; }
  if (l.startsWith('<')) { const bloco = []; while (i < linhas.length && linhas[i].trim()) bloco.push(linhas[i++]); html.push(bloco.join('\n')); continue; }
  let h = /^(#{1,3}) (.+)$/.exec(l);
  if (h) {
    const nivel = h[1].length, texto = h[2].replace(/\s*\{([^}]*)\}$/, ''), classe = (/\{([^}]*)\}$/.exec(h[2]) || [])[1] || '';
    const id = idPara(texto);
    if (nivel === 1) { capitulo++; secao = 0; sumario.push({nivel, texto, id, num: String(capitulo)}); html.push(`<h1 id="${id}" class="${classe}"><span class="num">${capitulo}</span>${inline(texto)}</h1>`); }
    else if (nivel === 2) { secao++; sumario.push({nivel, texto, id, num: capitulo + '.' + secao}); html.push(`<h2 id="${id}" class="${classe}"><span class="num">${capitulo}.${secao}</span> ${inline(texto)}</h2>`); }
    else html.push(`<h3 id="${id}" class="${classe}">${inline(texto)}</h3>`);
    i++; continue;
  }
  // figuras: cada linha é um bloco; várias imagens na mesma linha ficam lado a lado
  if (/^!\[/.test(l)) {
    const imgs = [...l.matchAll(/!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)/g)]; i++;
    const lado = imgs.length > 1;
    html.push(`<div class="figuras${lado ? ' lado' : ''} ${imgs[0][3] || ''}">` + imgs.map(x => { figura++; const op = x[3] || ''; return `<figure class="${op}"><img src="${pathToFileURL(path.resolve(base, x[2])).href}" alt="">${x[1] ? `<figcaption>${inline(x[1])}</figcaption>` : ''}</figure>`; }).join('') + '</div>');
    continue;
  }
  if (/^\|/.test(l)) {
    const t = []; while (i < linhas.length && /^\|/.test(linhas[i])) t.push(linhas[i++]);
    const cel = r => r.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
    const cab = cel(t[0]), corpoT = t.slice(2).map(cel);
    html.push('<table><thead><tr>' + cab.map(c => `<th>${inline(c)}</th>`).join('') + '</tr></thead><tbody>' + corpoT.map(r => '<tr>' + r.map(c => `<td>${inline(c).replace(/^(OK|Pronto)$/, '<span class="ok">$1</span>').replace(/^(Decidir|Pendente|A decidir)$/, '<span class="pend">$1</span>').replace(/^(Parcial)$/, '<span class="parcial">$1</span>')}</td>`).join('') + '</tr>').join('') + '</tbody></table>');
    continue;
  }
  if (/^> /.test(l)) { const b = []; while (i < linhas.length && /^> ?/.test(linhas[i])) b.push(linhas[i++].replace(/^> ?/, '')); html.push(`<div class="nota">${b.map(inline).join('<br>')}</div>`); continue; }
  if (/^[-*] /.test(l)) {
    const itens = []; while (i < linhas.length && /^([-*] |  +\S)/.test(linhas[i])) { if (/^[-*] /.test(linhas[i])) itens.push(linhas[i].slice(2)); else itens[itens.length - 1] += ' ' + linhas[i].trim(); i++; }
    html.push('<ul>' + itens.map(t => `<li>${inline(t)}</li>`).join('') + '</ul>'); continue;
  }
  // lista numerada = legenda da imagem: o número do Markdown (ex.: "8." ou "1-7.") é o mesmo do círculo na tela
  if (/^\d+(-\d+)?\. /.test(l)) {
    const itens = []; while (i < linhas.length && /^(\d+(-\d+)?\. |  +\S)/.test(linhas[i])) { const m = /^(\d+(?:-\d+)?)\. (.*)$/.exec(linhas[i]); if (m) itens.push({n: m[1], t: m[2]}); else itens[itens.length - 1].t += ' ' + linhas[i].trim(); i++; }
    html.push('<ol>' + itens.map(x => `<li><span class="n${x.n.includes('-') ? ' larga' : ''}">${x.n.replace('-', '–')}</span><span class="t">${inline(x.t)}</span></li>`).join('') + '</ol>'); continue;
  }
  const p = []; while (i < linhas.length && linhas[i].trim() && !/^(#|!\[|\||> |[-*] |\d+(-\d+)?\. |<)/.test(linhas[i])) p.push(linhas[i++]);
  html.push(`<p>${inline(p.join(' '))}</p>`);
}

function montar(paginas = {}) {
  const toc = sumario.map(s => `<li class="n${s.nivel}"><a href="#${s.id}"><span class="tn">${s.num}</span><span class="tt">${inline(s.texto)}</span><span class="pt">${paginas[s.id] ?? '00'}</span></a></li>`).join('');
  const estilo = fs.readFileSync(path.join(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Z]:)/, '$1')), 'guia.css'), 'utf8');
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(capa.titulo || 'Guia')}</title><style>${estilo}</style></head><body>
  <section class="capa">
    <div class="marca"><span class="ag">Ag</span><span class="ia">IA</span><small>GESTÃO INTELIGENTE DE AGENDA</small></div>
    <div class="capa-meio"><p class="sobre">${esc(capa.empresa || '')}</p><div class="titulo">${esc(capa.titulo || '')}</div><p class="sub">${esc(capa.subtitulo || '')}</p></div>
    <div class="capa-rodape">${(capa.linhas || '').split(';').map(x => `<div>${inline(x.trim())}</div>`).join('')}</div>
  </section>
  <section class="sumario"><h2 class="sem-num">Sumário</h2><ul>${toc}</ul></section>
  <main>${html.join('\n')}</main></body></html>`;
}

// ---------- impressão pelo Edge (CDP) ----------
async function imprimir(conteudo, arquivoPdf) {
  const tmpHtml = path.join(base, '.guia-temp.html'); fs.writeFileSync(tmpHtml, conteudo);
  const perfil = fs.mkdtempSync(path.join(os.tmpdir(), 'guia-pdf-')), porta = 9500 + Math.floor(Math.random() * 300);
  const proc = spawn(EDGE, ['--headless=new', '--disable-gpu', '--no-first-run', '--allow-file-access-from-files', `--remote-debugging-port=${porta}`, `--user-data-dir=${perfil}`, 'about:blank'], {stdio: 'ignore'});
  let alvo; for (let k = 0; k < 80 && !alvo; k++) { try { alvo = (await (await fetch(`http://127.0.0.1:${porta}/json/list`)).json()).find(t => t.type === 'page'); } catch {} if (!alvo) await new Promise(r => setTimeout(r, 250)); }
  const ws = new WebSocket(alvo.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
  let id = 0; const pend = new Map(); ws.onmessage = e => { const x = JSON.parse(e.data); if (x.id && pend.has(x.id)) { pend.get(x.id)(x); pend.delete(x.id); } };
  const cdp = (metodo, params = {}) => new Promise(r => { const n = ++id; pend.set(n, r); ws.send(JSON.stringify({id: n, method: metodo, params})); });
  await cdp('Page.enable'); await cdp('Page.navigate', {url: pathToFileURL(tmpHtml).href});
  await new Promise(r => setTimeout(r, 2500));
  await cdp('Runtime.evaluate', {expression: 'Promise.all([...document.images].map(i=>i.complete?1:new Promise(r=>{i.onload=i.onerror=r})))', awaitPromise: true});
  const quebradas = (await cdp('Runtime.evaluate', {expression: '[...document.images].filter(i=>!i.naturalWidth).map(i=>i.src)', returnByValue: true})).result.result.value;
  const r = await cdp('Page.printToPDF', {printBackground: true, preferCSSPageSize: true, generateDocumentOutline: true, generateTaggedPDF: false, transferMode: 'ReturnAsBase64'});
  if (r.error) throw new Error(r.error.message);
  fs.writeFileSync(arquivoPdf, Buffer.from(r.result.data, 'base64'));
  ws.close(); proc.kill(); if (!process.env.MANTER_HTML) fs.rmSync(tmpHtml, {force: true});
  return quebradas;
}

// ---------- página de cada destino (lê os objetos do PDF) ----------
function paginasDosDestinos(arquivoPdf) {
  const buf = fs.readFileSync(arquivoPdf), txt = buf.toString('latin1');
  const objetos = new Map();
  for (const x of txt.matchAll(/(\d+) 0 obj\s*([\s\S]*?)endobj/g)) objetos.set(Number(x[1]), x[2]);
  // objetos dentro de /ObjStm (fluxos comprimidos)
  for (const [, corpoObj] of objetos) {
    if (!/\/Type\s*\/ObjStm/.test(corpoObj)) continue;
    const ini = txt.indexOf(corpoObj); const s = corpoObj.indexOf('stream'); if (s < 0) continue;
    let pos = ini + s + 6; if (txt[pos] === '\r') pos++; if (txt[pos] === '\n') pos++;
    const len = Number((/\/Length (\d+)/.exec(corpoObj) || [])[1]); const dados = zlib.inflateSync(buf.subarray(pos, pos + len)).toString('latin1');
    const n = Number(/\/N (\d+)/.exec(corpoObj)[1]), first = Number(/\/First (\d+)/.exec(corpoObj)[1]);
    const cab = dados.slice(0, first).trim().split(/\s+/).map(Number);
    for (let k = 0; k < n; k++) { const num = cab[2 * k], off = cab[2 * k + 1], fim = k + 1 < n ? cab[2 * k + 3] : dados.length - first; objetos.set(num, dados.slice(first + off, first + fim)); }
  }
  // ordem das páginas pela árvore /Pages
  const raiz = Number(/\/Root (\d+) 0 R/.exec(txt)[1]);
  const pagesRaiz = Number(/\/Pages (\d+) 0 R/.exec(objetos.get(raiz))[1]);
  const ordem = [];
  (function andar(n) { const o = objetos.get(n); if (/\/Type\s*\/Pages/.test(o)) { const kids = /\/Kids\s*\[([^\]]*)\]/.exec(o)[1]; for (const k of kids.matchAll(/(\d+) 0 R/g)) andar(Number(k[1])); } else ordem.push(n); })(pagesRaiz);
  const indice = new Map(ordem.map((n, k) => [n, k + 1]));
  // destinos nomeados (/Dests) ou links do sumário (/Link com /Dest [pagina ...])
  const paginas = {};
  const nomes = [...txt.matchAll(/\(([^()]+)\)\s*\[\s*(\d+) 0 R\s*\/XYZ/g), ...txt.matchAll(/\/([\w.-]+)\s*\[\s*(\d+) 0 R\s*\/XYZ/g)];
  for (const x of nomes) if (indice.has(Number(x[2]))) paginas[x[1]] = indice.get(Number(x[2]));
  if (!Object.keys(paginas).length) for (const [, o] of objetos) for (const x of o.matchAll(/\(([^()]+)\)\s*\[\s*(\d+) 0 R/g)) if (indice.has(Number(x[2]))) paginas[x[1]] = indice.get(Number(x[2]));
  return {paginas, total: ordem.length};
}

const rascunho = saida.replace(/\.pdf$/i, '.rascunho.pdf');
let q = await imprimir(montar(), rascunho);
const {paginas, total} = paginasDosDestinos(rascunho);
const faltam = sumario.filter(s => !paginas[s.id]).map(s => s.id);
console.log('páginas', total, '| destinos achados', Object.keys(paginas).length, 'de', sumario.length, faltam.length ? '| sem página: ' + faltam.join(', ') : '');
q = await imprimir(montar(paginas), saida);
fs.rmSync(rascunho, {force: true});
console.log('PDF:', saida, '| imagens quebradas:', q.length ? q.join(', ') : 'nenhuma', '| figuras', figura);
