// 24/11/2026 (pedido do usuário, "Diferenciação dos pacotes e tipos de aulas"): o tipo de cada aula, gravado no banco
// (AGENDAMENTOS.TIPO_AULA) e mostrado nas agendas do instrutor e da empresa. A reposição de atestado não remunera o
// instrutor (regra da KM Autoescola).
export const TIPOS_AULA = Object.freeze({
  1: {id: 1, nome: 'Pacote inicial', classe: 'pacote'},
  2: {id: 2, nome: 'Aula extra', classe: 'extra'},
  3: {id: 3, nome: 'Reposição com ônus', classe: 'onus'},
  4: {id: 4, nome: 'Cortesia', classe: 'cortesia'},
  5: {id: 5, nome: 'Habilitados', classe: 'habilitados'},
  // 25/11/2026 (pedido do usuário): nas agendas do instrutor e da recepção a reposição de atestado aparece abreviada, "A.T.".
  6: {id: 6, nome: 'Reposição de atestado', sigla: 'A.T.', classe: 'atestado'},
});
export const REPOSICAO_ATESTADO = 6;

// Os que se escolhem ao lançar as aulas (a reposição de atestado só nasce do atestado aprovado).
export const OPCOES_TIPO_AULA = Object.freeze([1, 2, 3, 4, 5].map(id => [String(id), TIPOS_AULA[id].nome]));

// O tipo da aula: o gravado; sem ele, a reposição ligada ao atestado; sem nada, null (dado local antigo).
export function tipoDaAula(aula) {
  const id = Number(aula?.tipoAula?.valor ?? aula?.tipoAula) || (aula?.reposicao ? REPOSICAO_ATESTADO : 0);
  return TIPOS_AULA[id] || null;
}

export const remunera = aula => tipoDaAula(aula)?.id !== REPOSICAO_ATESTADO;

export function textoTipoAula(aula) {
  const t = tipoDaAula(aula);
  if (!t) return '';
  return t.id === REPOSICAO_ATESTADO ? t.nome + ' (A.T.) · não remunera o instrutor' : t.nome;
}

// O selo do tipo (o CSS entra uma vez na página, nos dois temas).
export function seloTipoAula(aula, extra = '') {
  const t = tipoDaAula(aula);
  if (!t) return null;
  garantirCss();
  const s = document.createElement('span');
  s.className = `tipo-aula tipo-aula-${t.classe}${extra ? ' ' + extra : ''}`;
  s.textContent = t.sigla || t.nome;
  s.dataset.tipoAula = String(t.id);
  s.title = t.id === REPOSICAO_ATESTADO
    ? 'A.T. · Reposição de aula abonada por atestado' + (aula?.reposicao?.aulaOrigemInicio ? ' · repõe a aula de ' + dataHora(aula.reposicao.aulaOrigemInicio) : '') + ' · não remunera o instrutor'
    : 'Tipo da aula: ' + t.nome;
  return s;
}

function dataHora(v) {
  const s = String(v || '');
  return s.length >= 16 ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)} às ${s.slice(11, 16)}` : s;
}

function garantirCss() {
  if (typeof document === 'undefined' || document.getElementById('css-tipos-aula')) return;
  const st = document.createElement('style');
  st.id = 'css-tipos-aula';
  st.textContent = `
.tipo-aula{display:inline-block;justify-self:start;width:max-content;max-width:100%;margin:1px 0;padding:1px 8px;border-radius:999px;border:1px solid transparent;font-size:10.5px;font-weight:700;line-height:1.5;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;vertical-align:middle}
.tipo-aula-pacote{background:#eef2f6;color:#334155;border-color:#d7dee7}
.tipo-aula-extra{background:#e0efff;color:#0b4a8b;border-color:#b9d8fb}
.tipo-aula-onus{background:#fff1dc;color:#8a4b00;border-color:#f6d39f}
.tipo-aula-cortesia{background:#dcf7e8;color:#106b3c;border-color:#a8e4c3}
.tipo-aula-habilitados{background:#efe7ff;color:#5b21b6;border-color:#d6c6fb}
.tipo-aula-atestado{background:#ffe3e6;color:#a1122a;border-color:#f7b4bd;box-shadow:0 0 0 2px rgba(225,29,72,.12)}
html[data-theme=dark] .tipo-aula-pacote{background:#1f2a37;color:#cbd5e1;border-color:#334155}
html[data-theme=dark] .tipo-aula-extra{background:#0f2c4a;color:#bcdcff;border-color:#1f4f80}
html[data-theme=dark] .tipo-aula-onus{background:#3a2608;color:#ffd79a;border-color:#6b4510}
html[data-theme=dark] .tipo-aula-cortesia{background:#0f3524;color:#a9efc8;border-color:#1d6544}
html[data-theme=dark] .tipo-aula-habilitados{background:#2e1f52;color:#d8c7ff;border-color:#5b3fa0}
html[data-theme=dark] .tipo-aula-atestado{background:#4a1220;color:#ffc2cb;border-color:#8a2638}
`;
  document.head.append(st);
}
