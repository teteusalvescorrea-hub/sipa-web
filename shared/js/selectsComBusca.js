// Todos os dropdowns do SIPA no estilo dos filtros do Simplea (decisão do João em 31/10): cada <select> simples que
// entra na página vira o select com busca. Para manter um select nativo, marque com data-sem-busca.
import { aprimorarSelect } from '../components/selectComBusca.js';

const SELETOR = 'select:not([multiple]):not([data-sem-busca]):not([data-select-busca])';

if (!document.querySelector('link[data-select-busca-css]')) {
  const css = document.createElement('link');
  css.rel = 'stylesheet'; css.href = new URL('../css/select-busca.css', import.meta.url).href; css.dataset.selectBuscaCss = '';
  document.head.append(css);
}

function aplicar(raiz) {
  if (raiz.nodeType !== 1) return;
  if (raiz.matches?.(SELETOR)) aprimorarSelect(raiz);
  raiz.querySelectorAll?.(SELETOR).forEach(s => aprimorarSelect(s));
}

aplicar(document.body);
new MutationObserver(mudancas => {
  for (const m of mudancas) for (const n of m.addedNodes) if (n.isConnected) aplicar(n);
}).observe(document.body, { childList: true, subtree: true });
