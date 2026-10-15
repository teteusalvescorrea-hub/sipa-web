import { estaLogado, obterPerfil } from "./modules/essencial/utils/sessao.js";

// A API atual não identifica operador, nível, permissões ou unidade na sessão.
// Nenhum perfil é considerado autorizado. Não montar o template nem chamar
// endpoints de outro perfil até existir um contrato validado pelo backend.
const destinosExistentes = {
    Aluno: "dashboard.html",
    Autoescola: "autoescola.html"
};

const voltar = document.getElementById("operador-voltar");
const orientacao = document.getElementById("acesso-orientacao");

if (estaLogado()) {
    const perfil = obterPerfil();
    const destino = Object.hasOwn(destinosExistentes, perfil) ? destinosExistentes[perfil] : null;

    if (destino) {
        voltar.href = destino;
        voltar.textContent = "Voltar para minha área";
    }

    orientacao.textContent = "Sua sessão foi preservada. Continue utilizando a área já disponível para o seu perfil.";
}
