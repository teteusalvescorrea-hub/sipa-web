// 11/11/2026: confirmação e aviso de erro no padrão do SIPA, no lugar do confirm()/alert() do navegador (que aparecem
// fora do estilo das telas e são bloqueados em alguns navegadores). Resolve true no "Confirmar"; false no "Voltar", no X
// ou no Esc.
const ESTILO = `
html body dialog.sipa-confirmar.sipa-confirmar{max-width:min(440px,calc(100vw - 32px));width:100%;height:fit-content;min-height:0;margin:auto;inset:0;padding:0;border:1px solid #c9d6e3;border-radius:12px;background:#fff;color:#10233f;box-shadow:0 18px 48px rgba(16,35,63,.22);font:inherit}
.sipa-confirmar::backdrop{background:rgba(16,35,63,.45)}
.sipa-confirmar-corpo{padding:20px 22px 8px}
.sipa-confirmar h2{margin:0 0 8px;font-size:1.05rem;font-weight:600}
.sipa-confirmar p{margin:0;line-height:1.5;color:#3a4a5e}
.sipa-confirmar-acoes{display:flex;justify-content:flex-end;gap:8px;padding:16px 22px 20px}
.sipa-confirmar-acoes button{min-height:40px;padding:8px 16px;border-radius:8px;font:inherit;font-weight:600;cursor:pointer}
.sipa-confirmar-voltar{border:1px solid #b9c8d7;background:#fff;color:#10233f}
.sipa-confirmar-ok{border:1px solid #1769ab;background:#1769ab;color:#fff}
.sipa-confirmar-ok.perigo{border-color:#b42318;background:#b42318}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]) .sipa-confirmar{background:#16212e;color:#e6edf5;border-color:#2c3b4d}:root:not([data-theme="light"]) .sipa-confirmar p{color:#b7c4d3}:root:not([data-theme="light"]) .sipa-confirmar-voltar{background:#16212e;color:#e6edf5;border-color:#3a4b60}}
:root[data-theme="dark"] .sipa-confirmar{background:#16212e;color:#e6edf5;border-color:#2c3b4d}
:root[data-theme="dark"] .sipa-confirmar p{color:#b7c4d3}
:root[data-theme="dark"] .sipa-confirmar-voltar{background:#16212e;color:#e6edf5;border-color:#3a4b60}
`;

function garantirEstilo() {
  if (document.getElementById('sipa-confirmar-estilo')) return;
  const s = document.createElement('style');
  s.id = 'sipa-confirmar-estilo';
  s.textContent = ESTILO;
  document.head.append(s);
}

function montar(titulo, mensagem, botoes) {
  garantirEstilo();
  const d = document.createElement('dialog');
  d.className = 'sipa-confirmar';
  d.setAttribute('aria-labelledby', 'sipa-confirmar-titulo');
  const corpo = document.createElement('div');
  corpo.className = 'sipa-confirmar-corpo';
  const h = document.createElement('h2');
  h.id = 'sipa-confirmar-titulo';
  h.textContent = titulo;
  const p = document.createElement('p');
  p.textContent = mensagem;
  corpo.append(h, p);
  const acoes = document.createElement('div');
  acoes.className = 'sipa-confirmar-acoes';
  acoes.append(...botoes);
  d.append(corpo, acoes);
  document.body.append(d);
  return d;
}

function botao(texto, classe) {
  const b = document.createElement('button');
  b.type = 'button';
  b.className = classe;
  b.textContent = texto;
  return b;
}

export function confirmarAcao(mensagem, { titulo = 'Confirmar', confirmar = 'Confirmar', cancelar = 'Voltar', perigo = false } = {}) {
  return new Promise(resolver => {
    const voltar = botao(cancelar, 'sipa-confirmar-voltar');
    const ok = botao(confirmar, 'sipa-confirmar-ok' + (perigo ? ' perigo' : ''));
    const d = montar(titulo, mensagem, [voltar, ok]);
    let respondido = false;
    const responder = valor => {
      if (respondido) return;
      respondido = true;
      if (d.open) d.close();
      d.remove();
      resolver(valor);
    };
    voltar.onclick = () => responder(false);
    ok.onclick = () => responder(true);
    d.addEventListener('cancel', e => { e.preventDefault(); responder(false); });
    d.showModal();
    voltar.focus();
  });
}

export function avisarErro(mensagem, { titulo = 'Não foi possível concluir' } = {}) {
  return new Promise(resolver => {
    const ok = botao('Entendi', 'sipa-confirmar-ok');
    const d = montar(titulo, mensagem || 'Tente novamente.', [ok]);
    const fechar = () => { if (d.open) d.close(); d.remove(); resolver(); };
    ok.onclick = fechar;
    d.addEventListener('cancel', e => { e.preventDefault(); fechar(); });
    d.showModal();
    ok.focus();
  });
}
