/* =========================================
   SIPA — LOGIN E SAÍDA (os 3 perfis)
   Mesmo papel do modules/essencial/service/authService.ts do Simplea.
   ========================================= */

import { Post } from "../utils/api.js";
import { salvarToken, limparSessao } from "../utils/sessao.js";


/* POST /api/usuarios/login — anônimo
   documento: CPF (aluno e motorista) ou CNPJ (autoescola), com ou sem máscara.
   Guarda o token e devolve { token, expiraEm, perfil: { descricao, valor } }.
   perfil.descricao: "Aluno", "Motorista" ou "Autoescola". */
export const login = async (documento, senha) => {

    const resposta = await Post("usuarios/login", { documento, senha });

    salvarToken(resposta.token);

    return resposta;
};


export const sair = () => {

    limparSessao();
    window.location.href = "login.html";
};
