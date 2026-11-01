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
