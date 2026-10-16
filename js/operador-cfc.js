import { estaLogado, obterPerfil } from "./modules/essencial/utils/sessao.js";
import {
    ambienteLocalPermitido, demonstracaoSolicitada
} from "./modules/operador/demo/modoDemonstracao.js";

// A API atual não identifica operador, nível, permissões ou unidade na sessão.
// Nenhum perfil é considerado autorizado em ambiente real. Este bloqueio deve
// permanecer até existir um contrato de operador/unidade validado pelo backend.
// A demonstração abaixo apenas monta dados fictícios, sem sessão ou API.
const destinosExistentes = {
    Aluno: "dashboard.html",
    Autoescola: "autoescola.html"
};

const voltar = document.getElementById("operador-voltar");
const orientacao = document.getElementById("acesso-orientacao");

const endereco = window.location.href;
const demonstracao = demonstracaoSolicitada(endereco);
const conviteDemo = document.getElementById("operador-demo-local");
if (conviteDemo && ambienteLocalPermitido(endereco)) conviteDemo.hidden = false;

if (demonstracao) {
    try {
        const { iniciarDemonstracao } = await import("./modules/operador/demo/demonstracaoOperador.js");
        iniciarDemonstracao(document.getElementById("operador-conteudo"), document.getElementById("operador-template"), endereco);
        document.getElementById("operador-acesso").hidden = true;
    } catch {
        // Falha de inicialização nunca libera parcialmente uma área real.
        document.getElementById("operador-conteudo").replaceChildren();
        document.getElementById("operador-conteudo").hidden = true;
        orientacao.textContent = "Não foi possível iniciar a demonstração local. Recarregue a página para tentar novamente.";
    }
} else if (estaLogado()) {
    const perfil = obterPerfil();
    const destino = Object.hasOwn(destinosExistentes, perfil) ? destinosExistentes[perfil] : null;

    if (destino) {
        voltar.href = destino;
        voltar.textContent = "Voltar para minha área";
    }

    orientacao.textContent = "Sua sessão foi preservada. Continue utilizando a área já disponível para o seu perfil.";
}
