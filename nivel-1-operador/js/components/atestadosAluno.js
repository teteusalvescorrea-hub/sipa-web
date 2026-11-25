// 24/11/2026 (pedido do usuário, "Relatório de atestados do aluno"): na ficha do aluno, cada atestado com o período
// coberto, os dias e as aulas abrangidos, a situação da autorização, quantas aulas voltaram como reposição de atestado
// e as reposições já agendadas e realizadas (com a aula de origem de cada uma). Vem de GET alunos/{id}/atestados.
import {el} from './uiOperador.js';

const data = d => { const s = String(d || ''); return s.length >= 10 ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)}` : '—'; };
const dataHora = d => { const s = String(d || ''); return s.length >= 16 ? `${data(s)} às ${s.slice(11, 16)}` : data(s); };
const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);
const nomeStatus = s => s?.descricao || s || 'Não informado';

export async function montarAtestadosAluno(host, aluno, servico) {
  const secao = el('section', undefined, 'op-atestados-aluno');
  secao.dataset.opAtestadosAluno = '';
  secao.append(el('h4', 'Atestados e reposições'), el('p', 'Carregando os atestados…', 'op-help'));
  host.append(secao);
  let lista;
  try { lista = await servico.atestadosDoAluno(aluno.id); }
  catch (e) { secao.replaceChildren(el('h4', 'Atestados e reposições'), el('p', e?.message || 'Não foi possível carregar os atestados.', 'op-help')); return; }

  secao.replaceChildren(el('h4', 'Atestados e reposições'),
    el('p', 'Períodos em que o aluno esteve afastado por atestado e as aulas que voltaram como reposição de atestado. A reposição de atestado não gera remuneração ao instrutor.', 'op-help'));
  if (!lista?.length) { secao.append(el('p', 'Nenhum atestado enviado por este aluno.', 'op-atestados-vazio')); return; }

  for (const a of lista) {
    const card = el('article', undefined, 'op-atestado-card');
    card.dataset.atestadoId = a.id;
    const cab = el('header', undefined, 'op-atestado-cab');
    const periodo = a.periodoInicio === a.periodoFim ? data(a.periodoInicio) : `${data(a.periodoInicio)} a ${data(a.periodoFim)}`;
    cab.append(el('strong', `Atestado · ${periodo}`), el('span', nomeStatus(a.status), 'op-badge op-atestado-status'));
    card.append(cab);

    const numeros = el('dl', undefined, 'op-atestado-numeros');
    for (const [t, v] of [['Período', `${periodo} · ${plural(a.dias, 'dia', 'dias')}`], ['Enviado em', dataHora(a.enviadoEm)],
      ['Aulas abrangidas', String(a.aulas?.length || 0)], ['Liberadas para reposição', String(a.aulasLiberadas)],
      ['Reposições agendadas', String(a.reposicoesAgendadas)], ['Reposições realizadas', String(a.reposicoesRealizadas)]]) {
      const d = el('div'); d.append(el('dt', t), el('dd', v)); numeros.append(d);
    }
    card.append(numeros);

    if (a.aulas?.length) {
      const bloco = el('div', undefined, 'op-atestado-bloco');
      bloco.append(el('h5', 'Aulas cobertas pelo atestado'));
      const ul = el('ul', undefined, 'op-atestado-lista');
      for (const x of a.aulas) ul.append(el('li', [dataHora(x.dataHoraInicio), x.categoria?.descricao || (x.categoria?.valor ? 'Categoria ' + x.categoria.valor : ''), x.motoristaNome, x.situacao].filter(Boolean).join(' · ')));
      bloco.append(ul); card.append(bloco);
    }

    if (a.reposicoes?.length) {
      const bloco = el('div', undefined, 'op-atestado-bloco');
      bloco.append(el('h5', 'Reposições de atestado'));
      const ul = el('ul', undefined, 'op-atestado-lista');
      for (const r of a.reposicoes) {
        const li = el('li');
        li.dataset.reposicaoId = r.id;
        li.append(el('span', 'Repõe a aula de ' + dataHora(r.aulaOrigemInicio)), document.createTextNode(' → '),
          el('strong', r.aulaReposicaoInicio ? dataHora(r.aulaReposicaoInicio) : 'ainda não agendada'),
          document.createTextNode(' · ' + [r.situacao, r.motoristaNome].filter(Boolean).join(' · ')));
        ul.append(li);
      }
      bloco.append(ul); card.append(bloco);
    }
    secao.append(card);
  }
}

// O CSS da seção (uma vez na página, nos dois temas).
export function garantirCssAtestados() {
  if (document.getElementById('css-atestados-aluno')) return;
  const st = document.createElement('style');
  st.id = 'css-atestados-aluno';
  st.textContent = `
.op-atestados-aluno{display:grid;gap:12px;margin-top:16px}
.op-atestado-card{border:1px solid #dbe4ee;border-left:4px solid #e11d48;border-radius:12px;padding:12px 14px;background:#fff;display:grid;gap:10px}
.op-atestado-cab{display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:8px}
.op-atestado-numeros{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:8px;margin:0}
.op-atestado-numeros div{background:#f6f8fb;border-radius:8px;padding:6px 10px}
.op-atestado-numeros dt{font-size:11px;color:#5b6b7d;margin:0}
.op-atestado-numeros dd{margin:2px 0 0;font-weight:700}
.op-atestado-bloco h5{margin:0 0 4px;font-size:12.5px}
.op-atestado-lista{margin:0;padding-left:18px;display:grid;gap:3px;font-size:13px}
.op-atestados-vazio{color:#5b6b7d}
html[data-theme=dark] .op-atestado-card{background:#13263a;border-color:#2b4560;border-left-color:#e11d48}
html[data-theme=dark] .op-atestado-numeros div{background:#1a3148}
html[data-theme=dark] .op-atestado-numeros dt,html[data-theme=dark] .op-atestados-vazio{color:#a9bccd}
`;
  document.head.append(st);
}
