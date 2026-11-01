// Erro de campo (decisão do João em 31/10): o campo com problema fica com a borda vermelha e o motivo aparece logo
// abaixo dele, em todos os formulários. A data impossível (ano com 5 dígitos, dia inexistente) é barrada antes do
// envio; o erro que a API devolve para um campo ("O campo validade tem um valor inválido.") vai para o campo de mesmo
// nome no último formulário enviado.
import { semAcento as normalizar } from './formatacao.js';
const ANO_MINIMO = 1900, ANO_MAXIMO = 2100;
export const MOTIVO_DATA = `Data inválida. Use dd/mm/aaaa, com ano entre ${ANO_MINIMO} e ${ANO_MAXIMO}.`;
const MOTIVO_GENERICO = 'Valor inválido. Confira o que foi digitado.';
const CAMPO_DA_API = /O campo (\S+) tem um valor inválido/i;
let sequencia = 0, ultimoFormulario = null;

if (!document.querySelector('style[data-erros-campo]')) {
  const estilo = document.createElement('style');
  estilo.dataset.errosCampo = '';
  estilo.textContent =
    '[data-erro-campo]{border-color:#b42318!important;box-shadow:0 0 0 1px #b42318!important}' +
    '.sipa-select-busca:has([data-erro-campo]) .sipa-select-busca-botao{border-color:#b42318!important;box-shadow:0 0 0 1px #b42318!important}' +
    '.sipa-erro-campo{display:block;margin-top:4px;color:#b42318;font-size:.85rem;font-weight:500;line-height:1.3}' +
    '[data-theme=dark] [data-erro-campo]{border-color:#ffb4ab!important;box-shadow:0 0 0 1px #ffb4ab!important}' +
    '[data-theme=dark] .sipa-erro-campo{color:#ffb4ab}';
  document.head.append(estilo);
}

export function limparErroCampo(controle) {
  const id = controle?.dataset.erroCampo;
  if (!id) return;
  document.getElementById(id)?.remove();
  controle.removeAttribute('aria-invalid');
  const descricao = (controle.getAttribute('aria-describedby') || '').split(' ').filter(x => x && x !== id).join(' ');
  if (descricao) controle.setAttribute('aria-describedby', descricao); else controle.removeAttribute('aria-describedby');
  delete controle.dataset.erroCampo;
}

export function marcarErroCampo(controle, motivo) {
  limparErroCampo(controle);
  const aviso = document.createElement('small');
  aviso.className = 'sipa-erro-campo'; aviso.id = 'erro-campo-' + (++sequencia); aviso.textContent = motivo;
  (controle.closest('.sipa-select-busca') || controle).after(aviso);
  controle.dataset.erroCampo = aviso.id;
  controle.setAttribute('aria-invalid', 'true');
  controle.setAttribute('aria-describedby', [controle.getAttribute('aria-describedby'), aviso.id].filter(Boolean).join(' '));
  const sair = () => limparErroCampo(controle);
  controle.addEventListener('input', sair, { once: true });
  controle.addEventListener('change', sair, { once: true });
}

function motivoLocal(c) {
  if (c.disabled || c.type !== 'date' || c.closest('[hidden]')) return '';
  if (c.validity.badInput) return MOTIVO_DATA;
  const ano = Number(c.value.slice(0, 4));
  return c.value && !(ano >= ANO_MINIMO && ano <= ANO_MAXIMO && /^\d{4}-/.test(c.value)) ? MOTIVO_DATA : '';
}

// Antes do envio (fase de captura, antes dos ouvintes do próprio formulário): limpa os avisos e barra a data inválida.
document.addEventListener('submit', e => {
  const f = e.target;
  if (!(f instanceof HTMLFormElement)) return;
  ultimoFormulario = f;
  for (const c of f.querySelectorAll('[data-erro-campo]')) limparErroCampo(c);
  const invalidos = [...f.elements].map(c => [c, motivoLocal(c)]).filter(([, m]) => m);
  if (!invalidos.length) return;
  e.preventDefault(); e.stopImmediatePropagation();
  for (const [c, m] of invalidos) marcarErroCampo(c, m);
  invalidos[0][0].focus();
}, true);

// Leva os erros de campo da API para o formulário. Devolve quantos campos foram marcados (0 = erro geral).
export function marcarErrosDoServidor(erro, formulario = ultimoFormulario) {
  if (!formulario?.isConnected) return 0;
  const campos = { ...(erro?.campos || {}) };
  for (const m of erro?.mensagens || [String(erro?.message || '')]) {
    const r = CAMPO_DA_API.exec(m);
    if (r && !(r[1] in campos)) campos[r[1]] = '';
  }
  let marcados = 0;
  for (const [nome, mensagem] of Object.entries(campos)) {
    const alvo = normalizar(nome);
    const c = [...formulario.elements].find(x => x.name && normalizar(x.name) === alvo || x.id && normalizar(x.id) === alvo);
    if (!c) continue;
    marcarErroCampo(c, mensagem && !CAMPO_DA_API.test(mensagem) ? mensagem : c.type === 'date' ? MOTIVO_DATA : MOTIVO_GENERICO);
    marcados++;
  }
  if (marcados) formulario.querySelector('[data-erro-campo]')?.focus();
  return marcados;
}
