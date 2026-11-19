export function el(tag, texto, classe) {
    const node = document.createElement(tag);
    if (texto !== undefined) node.textContent = texto;
    if (classe) node.className = classe;
    return node;
}
export function botao(texto, executar, classe = "op-button op-button-outline") {
    const node = el("button", texto, classe); node.type = "button"; node.addEventListener("click", executar); return node;
}
export function campo(rotulo, controle) { const label = el("label", rotulo); label.append(controle); return label; }
// Campo de arquivo do SIPA no lugar do botão do navegador. O <input type=file> continua no formulário (o mesmo .files e o
// mesmo FormData); a área aceita clique e arrastar e mostra o escolhido. maximoBytes: acima disso, avisa e limpa.
export function campoArquivo(input, { dica = "PDF, JPG ou PNG · até 5 MB", maximoBytes = 5 * 1024 * 1024 } = {}) {
    const caixa = el("div", undefined, "op-arquivo"); caixa.dataset.opArquivo = "";
    input.classList.add("op-arquivo-input");
    const zona = el("div", undefined, "op-arquivo-zona"), icone = el("span", undefined, "op-arquivo-icone"), textos = el("span", undefined, "op-arquivo-textos");
    icone.setAttribute("aria-hidden", "true");
    icone.innerHTML = '<svg viewBox="0 0 24 24"><path d="M12 16V4m0 0-4 4m4-4 4 4M5 14v4a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-4"/></svg>';
    textos.append(el("strong", "Clique para escolher ou arraste o arquivo aqui"), el("small", dica));
    zona.append(icone, textos);
    const escolhido = el("div", undefined, "op-arquivo-escolhido"); escolhido.hidden = true;
    const nome = el("strong"), tamanho = el("small"), info = el("span", undefined, "op-arquivo-info"), doc = el("span", undefined, "op-arquivo-doc");
    doc.setAttribute("aria-hidden", "true");
    doc.innerHTML = '<svg viewBox="0 0 24 24"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8l-5-5Zm0 0v5h5"/></svg>';
    info.append(nome, tamanho);
    const remover = el("button", "Remover", "op-arquivo-remover"); remover.type = "button";
    const aviso = el("small", "", "op-arquivo-aviso"); aviso.setAttribute("role", "alert");
    escolhido.append(doc, info, remover);
    const kb = n => n < 1024 * 1024 ? Math.max(1, Math.round(n / 1024)) + " KB" : (n / 1024 / 1024).toLocaleString("pt-BR", { maximumFractionDigits: 1 }) + " MB";
    function atualizar() {
        const f = input.files?.[0]; aviso.textContent = "";
        if (f && maximoBytes && f.size > maximoBytes) { aviso.textContent = "O arquivo tem " + kb(f.size) + ". O limite é " + kb(maximoBytes) + "."; input.value = ""; }
        const atual = input.files?.[0];
        escolhido.hidden = !atual; zona.hidden = !!atual; caixa.classList.toggle("com-arquivo", !!atual);
        if (atual) { nome.textContent = atual.name; tamanho.textContent = kb(atual.size); }
    }
    remover.addEventListener("click", e => { e.preventDefault(); e.stopPropagation(); input.value = ""; input.dispatchEvent(new Event("input", { bubbles: true })); atualizar(); input.focus(); });
    input.addEventListener("change", atualizar);
    for (const ev of ["dragenter", "dragover"]) caixa.addEventListener(ev, e => { e.preventDefault(); caixa.classList.add("arrastando"); });
    for (const ev of ["dragleave", "drop"]) caixa.addEventListener(ev, () => caixa.classList.remove("arrastando"));
    caixa.addEventListener("drop", e => {
        e.preventDefault(); const f = e.dataTransfer?.files?.[0]; if (!f) return;
        const dt = new DataTransfer(); dt.items.add(f); input.files = dt.files;
        input.dispatchEvent(new Event("change", { bubbles: true })); input.dispatchEvent(new Event("input", { bubbles: true }));
    });
    caixa.append(input, zona, escolhido, aviso);
    return caixa;
}
export function select(opcoes, valor = "") {
    const node = el("select");
    for (const item of opcoes) { const [id, texto] = Array.isArray(item) ? item : [item, item]; const o = el("option", texto); o.value = id; node.append(o); }
    node.value = valor; return node;
}
export function entrada(tipo, valor = "") { const node = el("input"); node.type = tipo; node.value = valor; return node; }
export function modal(raiz, titulo, id) {
    const node = el("dialog", undefined, "op-dialog op-dialog-wide"); node.dataset[id] = "";
    const heading = el("div", undefined, "op-dialog-heading"), h = el("h2", titulo); h.id = `titulo-${id}`;
    node.setAttribute("aria-labelledby", h.id);
    const fechar = botao("×", () => node.close(), "op-close"); fechar.setAttribute("aria-label", "Fechar detalhes");
    heading.append(h, fechar); node.append(heading); raiz.append(node); return node;
}
// Aviso de um botão só ("Entendi"): abre na hora e sai do DOM ao fechar.
export function mostrarAviso(raiz, titulo, id, ...conteudo) {
    const node = modal(raiz, titulo, id); node.append(...conteudo, botao("Entendi", () => node.close(), "op-button op-button-primary"));
    node.addEventListener("close", () => node.remove(), { once: true }); node.showModal(); return node;
}
export function card(titulo, ...filhos) { const node = el("article", undefined, "op-card"); node.append(el("h2", titulo), ...filhos); return node; }
// Ícone decorativo do sprite da página (<symbol id="op-…">). Alguns painéis fixam o viewBox do <svg>.
export function iconeSvg(nome, viewBox) {
    const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg"), use = document.createElementNS(svg.namespaceURI, "use");
    svg.setAttribute("aria-hidden", "true"); if (viewBox) svg.setAttribute("viewBox", viewBox); use.setAttribute("href", `#op-${nome}`); svg.append(use); return svg;
}

// Aviso rápido no canto da tela (some sozinho): confirma que salvou ou mostra o erro onde a pessoa está olhando, mesmo
// com a ficha rolada. Com um <dialog> aberto, vai dentro dele (camada de cima).
export function mostrarToast(texto, erro = false) {
    const alvo = [...document.querySelectorAll("dialog[open]")].at(-1) || document.body;
    alvo.querySelector(":scope > .op-toast")?.remove();
    const toast = el("div", texto, "op-toast" + (erro ? " op-toast-erro" : "")); toast.setAttribute("role", erro ? "alert" : "status"); alvo.append(toast);
    setTimeout(() => toast.remove(), erro ? 6000 : 3500);
}
