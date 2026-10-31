// Select com busca no estilo dos filtros do Simplea: caixa "Busque..." com seta e, ao abrir, um campo "Buscar..." e a
// lista com os grupos (optgroup). O <select> original continua sendo a fonte do valor (fica escondido e recebe 'change'),
// então quem já usava o select não muda nada; trocar as opções ou o value por código atualiza a caixa.
let sequencia = 0;
const semAcento = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
const VALOR = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
const INDICE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

export function aprimorarSelect(select, { placeholder = 'Busque...', busca = 'Buscar...', vazio = 'Nenhum resultado encontrado.' } = {}) {
  const id = 'select-busca-' + (++sequencia);
  const caixa = document.createElement('div'), botao = document.createElement('button'), texto = document.createElement('span');
  const painel = document.createElement('div'), campo = document.createElement('input'), lista = document.createElement('div');
  caixa.className = 'sipa-select-busca'; botao.type = 'button'; botao.className = 'sipa-select-busca-botao';
  botao.setAttribute('aria-haspopup', 'listbox'); botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-controls', id);
  painel.className = 'sipa-select-busca-painel'; painel.hidden = true;
  campo.type = 'search'; campo.placeholder = busca; campo.autocomplete = 'off'; campo.setAttribute('aria-label', busca);
  lista.id = id; lista.className = 'sipa-select-busca-lista'; lista.setAttribute('role', 'listbox');
  botao.append(texto); painel.append(campo, lista);
  select.after(caixa); caixa.append(select, botao, painel); select.hidden = true; select.tabIndex = -1;
  let itens = [], ativo = -1;

  function sincronizar() {
    const o = select.selectedOptions[0];
    const temValor = o && o.value !== '';
    texto.textContent = temValor ? o.textContent : placeholder; texto.classList.toggle('sipa-select-busca-vazio', !temValor);
    botao.disabled = select.disabled;
  }
  function montar() {
    const termo = semAcento(campo.value.trim());
    lista.replaceChildren(); itens = [];
    const opcao = (o, recuo) => {
      if (termo && !semAcento(o.textContent).includes(termo)) return;
      const d = document.createElement('div');
      d.className = 'sipa-select-busca-opcao' + (o.value === '' ? ' sipa-select-busca-limpar' : '') + (recuo ? ' sipa-select-busca-recuo' : '');
      d.setAttribute('role', 'option'); d.id = id + '-' + itens.length; d.textContent = o.value === '' ? (o.textContent.trim() || 'Selecione...') : o.textContent;
      d.setAttribute('aria-selected', String(o.selected && o.value !== ''));
      d.addEventListener('mousedown', e => { e.preventDefault(); escolher(o); });
      lista.append(d); itens.push({ d, o });
    };
    for (const filho of select.children) {
      if (filho.tagName === 'OPTGROUP') {
        const antes = itens.length, g = document.createElement('div'); g.className = 'sipa-select-busca-grupo'; g.textContent = filho.label; lista.append(g);
        for (const o of filho.children) opcao(o, true);
        if (itens.length === antes) g.remove();
      } else if (!termo || filho.value !== '') opcao(filho, false);
    }
    if (!itens.length) { const v = document.createElement('div'); v.className = 'sipa-select-busca-nada'; v.textContent = vazio; lista.append(v); }
    marcar(itens.findIndex(i => i.o.selected && i.o.value !== ''));
  }
  function marcar(i) { ativo = i; itens.forEach((x, n) => x.d.classList.toggle('sipa-select-busca-ativa', n === i)); const x = itens[i]; if (x) { campo.setAttribute('aria-activedescendant', x.d.id); x.d.scrollIntoView({ block: 'nearest' }); } else campo.removeAttribute('aria-activedescendant'); }
  function abrir() { if (select.disabled) return; painel.hidden = false; botao.setAttribute('aria-expanded', 'true'); campo.value = ''; montar(); campo.focus(); }
  function fechar(focar = false) { painel.hidden = true; botao.setAttribute('aria-expanded', 'false'); if (focar) botao.focus(); }
  function escolher(o) { const mudou = select.value !== o.value; VALOR.set.call(select, o.value); sincronizar(); fechar(true); if (mudou) select.dispatchEvent(new Event('change', { bubbles: true })); }

  botao.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
  campo.addEventListener('input', montar);
  campo.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (itens.length) marcar((ativo + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length); }
    else if (e.key === 'Enter') { e.preventDefault(); if (itens[ativo]) escolher(itens[ativo].o); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(true); }
  });
  caixa.addEventListener('focusout', e => { if (!caixa.contains(e.relatedTarget)) fechar(); });
  document.addEventListener('pointerdown', e => { if (!caixa.contains(e.target)) fechar(); });
  // value/selectedIndex por código, opções trocadas e o change de fora mantêm a caixa em dia.
  Object.defineProperty(select, 'value', { configurable: true, get() { return VALOR.get.call(this); }, set(v) { VALOR.set.call(this, v); sincronizar(); } });
  Object.defineProperty(select, 'selectedIndex', { configurable: true, get() { return INDICE.get.call(this); }, set(v) { INDICE.set.call(this, v); sincronizar(); } });
  new MutationObserver(() => { sincronizar(); if (!painel.hidden) montar(); }).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled'] });
  select.addEventListener('change', sincronizar);
  sincronizar();
  return caixa;
}
