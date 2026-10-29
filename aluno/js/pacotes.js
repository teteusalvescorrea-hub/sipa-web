// Página informativa: não consulta contratações, não envia pedidos e não modifica créditos.
import { exigirLogin } from '../../shared/js/sessao.js';
import { sair } from '../../shared/js/services/authService.js';

if (exigirLogin(['Aluno'])) {
    document.getElementById('packages-logout')?.addEventListener('click', event => {
        event.preventDefault();
        sair();
    });
}
