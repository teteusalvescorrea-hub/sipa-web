import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
if (desenvolvimentoAtivo()) {
    const {temSessaoRecepcao} = await import('../../dev/aluno/contaRecepcao.js');
    if(temSessaoRecepcao()){
        const {montarPainelContaRecepcao}=await import('../../dev/aluno/acessoRecepcao.js');
        await montarPainelContaRecepcao();
    } else {
    location.replace('/login.html');
    }
} else await import('./integrado.js');
