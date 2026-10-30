import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
const root = document.getElementById('instrutor-root');
if (desenvolvimentoAtivo()) {
    const {exigirPerfil,sair,vigiarPerfil} = await import('../../dev/autenticacao.js');let conta;try{conta=await exigirPerfil('instrutor');}catch{};
    if (!conta) location.replace('/login.html');
    else {
        const {criarServicoAutenticado} = await import('../../dev/instrutor/repositorio.js');
        const {montarPainel} = await import('./painel.js');
        try {
            
            await montarPainel(root, criarServicoAutenticado(), {async aoSair() { await sair(); location.assign('/login.html'); }});
            vigiarPerfil('instrutor',root);
        } catch (erro) { root.textContent = erro.message; }
    }
} else {
    const {exigirLogin} = await import('../../shared/js/sessao.js');
    if (exigirLogin(['Motorista'])) {
        const [{criarServicoInstrutor},{montarPainel},{sair}] = await Promise.all([import('./services/instrutorIntegrado.js'),import('./painel.js'),import('../../shared/js/services/authService.js')]);
        try {
            await montarPainel(root, criarServicoInstrutor(), {aoSair() { sair(); }});
        } catch (erro) {
            root.className = 'in-login-wrap';
            root.textContent = erro.status === 0 ? 'Não foi possível falar com o servidor. Tente novamente.' : erro.message || 'Não foi possível carregar o painel do instrutor.';
        }
    }
}
