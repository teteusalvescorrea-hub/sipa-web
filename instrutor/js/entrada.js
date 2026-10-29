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
        root.className = 'in-login-wrap';
        root.textContent = 'Painel do Instrutor: integração da agenda e do veículo com a API pendente. Nenhum dado de demonstração foi carregado.';
    }
}
