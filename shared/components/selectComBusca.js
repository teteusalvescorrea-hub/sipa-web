// Select com busca no estilo dos filtros do Simplea: caixa com a opção escolhida e a seta; ao abrir, um campo "Buscar..."
// e a lista com os grupos (optgroup). O <select> original continua sendo a fonte do valor (fica invisível dentro da
// caixa e recebe 'change'), então quem já usava o select não muda nada: trocar as opções, o value, o disabled ou o
// hidden por código atualiza a caixa, e a validação (required) continua aparecendo no lugar dele.
let sequencia = 0;
const semAcento = v => String(v || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLocaleLowerCase('pt-BR');
const VALOR = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value');
const INDICE = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'selectedIndex');

export function aprimorarSelect(select, { placeholder, busca = 'Buscar...', vazio = 'Nenhum resultado encontrado.' } = {}) {
  if (!select?.parentNode || 'selectBusca' in select.dataset || select.multiple) return null;
  select.dataset.selectBusca = '';
  const id = 'select-busca-' + (++sequencia);
  const caixa = document.createElement('div'), botao = document.createElement('button'), texto = document.createElement('span');
  const painel = document.createElement('div'), campo = document.createElement('input'), lista = document.createElement('div');
  caixa.className = 'sipa-select-busca'; botao.type = 'button'; botao.className = 'sipa-select-busca-botao';
  botao.setAttribute('aria-haspopup', 'listbox'); botao.setAttribute('aria-expanded', 'false'); botao.setAttribute('aria-controls', id);
  const rotulo = select.getAttribute('aria-label') || select.labels?.[0]?.textContent?.trim();
  if (rotulo) botao.setAttribute('aria-label', rotulo);
  painel.className = 'sipa-select-busca-painel'; painel.hidden = true;
  campo.type = 'search'; campo.placeholder = busca; campo.autocomplete = 'off'; campo.setAttribute('aria-label', busca);
  lista.id = id; lista.className = 'sipa-select-busca-lista'; lista.setAttribute('role', 'listbox');
  botao.append(texto); painel.append(campo, lista);
  select.after(caixa); caixa.append(select, botao, painel); select.tabIndex = -1;
  let itens = [], ativo = -1;

  function sincronizar() {
    const o = select.selectedOptions[0];
    const semValor = !o || (o.value === '' && placeholder);
    texto.textContent = semValor ? (placeholder || 'Selecione...') : o.textContent;
    texto.classList.toggle('sipa-select-busca-vazio', !!semValor);
    botao.disabled = select.disabled; caixa.hidden = select.hidden;
  }
  function montar() {
    const termo = semAcento(campo.value.trim());
    lista.replaceChildren(); itens = [];
    const opcao = (o, recuo) => {
      if (o.hidden || (termo && !semAcento(o.textContent).includes(termo))) return;
      const d = document.createElement('div');
      d.className = 'sipa-select-busca-opcao' + (o.value === '' && /^selecion|^$/i.test(o.textContent.trim()) ? ' sipa-select-busca-limpar' : '') + (recuo ? ' sipa-select-busca-recuo' : '') + (o.disabled ? ' sipa-select-busca-desabilitada' : '');
      d.setAttribute('role', 'option'); d.id = id + '-' + itens.length; d.textContent = o.textContent.trim() || 'Selecione...';
      d.setAttribute('aria-selected', String(o.selected)); if (o.disabled) d.setAttribute('aria-disabled', 'true');
      d.addEventListener('mousedown', e => { e.preventDefault(); if (!o.disabled) escolher(o); });
      lista.append(d); itens.push({ d, o });
    };
    for (const filho of select.children) {
      if (filho.tagName === 'OPTGROUP') {
        const antes = itens.length, g = document.createElement('div'); g.className = 'sipa-select-busca-grupo'; g.textContent = filho.label; lista.append(g);
        for (const o of filho.children) opcao(o, true);
        if (itens.length === antes) g.remove();
      } else opcao(filho, false);
    }
    if (!itens.length) { const v = document.createElement('div'); v.className = 'sipa-select-busca-nada'; v.textContent = vazio; lista.append(v); }
    marcar(itens.findIndex(i => i.o.selected));
  }
  function marcar(i) { ativo = i; itens.forEach((x, n) => x.d.classList.toggle('sipa-select-busca-ativa', n === i)); const x = itens[i]; if (x) { campo.setAttribute('aria-activedescendant', x.d.id); x.d.scrollIntoView({ block: 'nearest' }); } else campo.removeAttribute('aria-activedescendant'); }
  function abrir() { if (select.disabled) return; painel.hidden = false; botao.setAttribute('aria-expanded', 'true'); campo.value = ''; montar(); campo.focus(); }
  function fechar(focar = false) { if (painel.hidden) return; painel.hidden = true; botao.setAttribute('aria-expanded', 'false'); if (focar) botao.focus(); }
  function escolher(o) { const mudou = select.value !== o.value; VALOR.set.call(select, o.value); sincronizar(); fechar(true); if (mudou) { select.dispatchEvent(new Event('input', { bubbles: true })); select.dispatchEvent(new Event('change', { bubbles: true })); } }

  botao.addEventListener('click', () => (painel.hidden ? abrir() : fechar()));
  botao.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); abrir(); } });
  campo.addEventListener('input', montar);
  campo.addEventListener('keydown', e => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); if (itens.length) marcar((ativo + (e.key === 'ArrowDown' ? 1 : -1) + itens.length) % itens.length); }
    else if (e.key === 'Enter') { e.preventDefault(); if (itens[ativo] && !itens[ativo].o.disabled) escolher(itens[ativo].o); }
    else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); fechar(true); }
    else if (e.key === 'Tab') fechar();
  });
  caixa.addEventListener('focusout', e => { if (!caixa.contains(e.relatedTarget)) fechar(); });
  document.addEventListener('pointerdown', e => { if (!caixa.contains(e.target)) fechar(); });
  // O clique no texto do <label> ia para o select invisível: vai para a caixa.
  select.closest('label')?.addEventListener('click', e => { if (!caixa.contains(e.target)) { e.preventDefault(); botao.focus(); } });
  select.addEventListener('focus', () => { if (!select.matches(':invalid')) botao.focus(); });
  // value/selectedIndex por código, opções trocadas, disabled/hidden, reset do form e change de fora.
  Object.defineProperty(select, 'value', { configurable: true, get() { return VALOR.get.call(this); }, set(v) { VALOR.set.call(this, v); sincronizar(); } });
  Object.defineProperty(select, 'selectedIndex', { configurable: true, get() { return INDICE.get.call(this); }, set(v) { INDICE.set.call(this, v); sincronizar(); } });
  new MutationObserver(() => { sincronizar(); if (!painel.hidden) montar(); }).observe(select, { childList: true, subtree: true, attributes: true, attributeFilter: ['disabled', 'hidden', 'selected', 'label'] });
  select.addEventListener('change', sincronizar);
  select.form?.addEventListener('reset', () => setTimeout(sincronizar));
  sincronizar();
  return caixa;
}
