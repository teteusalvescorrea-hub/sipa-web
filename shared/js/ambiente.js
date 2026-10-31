import {DESENVOLVIMENTO_LOCAL_HABILITADO} from './configuracao.js';
const CHAVE_INTEGRADO = 'sipa.execucao.integrada.v1';
export function hostLocal(url) {
    try { const u = new URL(url); return ['http:', 'https:'].includes(u.protocol) &&
        ['localhost', '127.0.0.1', '[::1]'].includes(u.hostname); } catch { return false; }
}
export function desenvolvimentoAtivo(endereco = globalThis.location?.href || globalThis.window?.location?.href || '') {
    if (!DESENVOLVIMENTO_LOCAL_HABILITADO || !hostLocal(endereco)) return false;
    const modos = new URL(endereco).searchParams.getAll('ambiente');
    if (modos.length > 1 || (modos.length === 1 && !['local', 'integrado'].includes(modos[0]))) return false;
    // Esta preferência somente DESLIGA o laboratório já habilitado no código.
    // A configuração false da distribuição não pode ser sobreposta por ela.
    if (typeof sessionStorage === 'undefined') return modos[0] !== 'integrado';
    try {
        if (modos[0] === 'integrado') { sessionStorage.setItem(CHAVE_INTEGRADO, '1'); return false; }
        if (modos[0] === 'local') sessionStorage.removeItem(CHAVE_INTEGRADO);
        return sessionStorage.getItem(CHAVE_INTEGRADO) !== '1';
    } catch { return false; }
}
