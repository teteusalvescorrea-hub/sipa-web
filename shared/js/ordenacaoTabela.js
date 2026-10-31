// Ordenação por coluna nas tabelas de listagem: clique no título ordena crescente, de novo decrescente.
// Datas (dd/mm/aaaa [hh:mm]) e números comparam pelo valor; o resto em ordem alfabética pt-BR (números no texto em
// ordem natural). Sem aoMudar, ordena as linhas já desenhadas; com aoMudar (listas paginadas), quem chama ordena os
// dados com ordenarLinhas antes de paginar e redesenha.
const SEM_ORDEM = new Set(['', 'Ações', 'Ação', 'Detalhes']);
const textoDe = v => (v instanceof Node ? v.textContent : String(v ?? '')).replace(/\s+/g, ' ').trim();

function chave(texto) {
  const data = texto.match(/^(\d{2})\/(\d{2})\/(\d{4})(?:\D+(\d{2}):(\d{2}))?/);
  if (data) return { n: Number(data[3] + data[2] + data[1] + (data[4] || '00') + (data[5] || '00')) };
  if (/^-?\d{1,3}(\.\d{3})*(,\d+)?%?$|^-?\d+(,\d+)?%?$/.test(texto)) return { n: Number(texto.replace(/\./g, '').replace(',', '.').replace('%', '')) };
  return { s: texto };
}
export function compararTextos(a, b) {
  const x = chave(textoDe(a)), y = chave(textoDe(b));
  if (x.n != null && y.n != null) return x.n - y.n;
  return String(x.s ?? x.n).localeCompare(String(y.s ?? y.n), 'pt-BR', { numeric: true, sensitivity: 'base' });
}

export const estadoOrdenacao = () => ({ coluna: null, direcao: 1 });

// Linhas como arrays de células (texto ou nó), na ordem do estado. Não altera a lista original.
export function ordenarLinhas(linhas, estado) {
  if (estado?.coluna == null) return linhas;
  return [...linhas].sort((a, b) => compararTextos(a[estado.coluna], b[estado.coluna]) * estado.direcao);
}

export function tornarOrdenavel(table, { estado = estadoOrdenacao(), aoMudar } = {}) {
  const ths = [...(table.tHead?.rows[0]?.cells || [])];
  const marcar = () => ths.forEach((th, i) => {
    if (!('ordenavel' in th.dataset)) return;
    th.setAttribute('aria-sort', estado.coluna === i ? (estado.direcao > 0 ? 'ascending' : 'descending') : 'none');
  });
  function ordenarDom() {
    const corpo = table.tBodies[0]; if (!corpo || estado.coluna == null) return;
    const linhas = [...corpo.rows].filter(r => r.cells.length === ths.length);
    linhas.sort((a, b) => compararTextos(a.cells[estado.coluna], b.cells[estado.coluna]) * estado.direcao).forEach(r => corpo.append(r));
  }
  ths.forEach((th, i) => {
    const titulo = th.textContent.trim();
    if (SEM_ORDEM.has(titulo)) return;
    const b = document.createElement('button'), seta = document.createElement('span');
    b.type = 'button'; b.className = 'op-ordenar'; b.title = 'Ordenar por ' + titulo;
    seta.className = 'op-ordenar-seta'; seta.setAttribute('aria-hidden', 'true');
    b.append(seta, titulo); th.replaceChildren(b); th.dataset.ordenavel = '';
    b.addEventListener('click', () => {
      estado.direcao = estado.coluna === i ? -estado.direcao : 1; estado.coluna = i;
      if (aoMudar) aoMudar(estado); else { ordenarDom(); marcar(); }
    });
  });
  marcar(); if (!aoMudar) ordenarDom();
  return table;
}
