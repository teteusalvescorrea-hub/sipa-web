import { Post } from "../utils/api.js";
import { salvarToken, limparSessao } from "../utils/sessao.js";


// POST /api/usuarios/login — CPF ou CNPJ. Guarda o token e devolve o perfil.
export const login = async (documento, senha) => {

    const resposta = await Post("usuarios/login", { documento, senha });

    salvarToken(resposta.token);

    return resposta;
};


export const sair = () => {

    limparSessao();
    window.location.href = "login.html";
};
