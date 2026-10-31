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
export function resumoLista(titulo, itens) {
    const card = el("article", undefined, "op-card"); card.append(el("h2", titulo)); const lista = el("ul", undefined, "op-summary-list");
    itens.forEach(item => lista.append(el("li", item))); card.append(lista); return card;
}
