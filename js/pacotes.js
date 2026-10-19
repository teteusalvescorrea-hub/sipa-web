// Página informativa: não consulta contratações, não envia pedidos e não modifica créditos.
import { exigirLogin } from './modules/essencial/utils/sessao.js';
import { sair } from './modules/essencial/service/authService.js';

if (exigirLogin(['Aluno'])) {
    document.getElementById('packages-logout')?.addEventListener('click', event => {
        event.preventDefault();
        sair();
    });
}
