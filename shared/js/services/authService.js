import { Post } from "../api.js";
import { salvarToken, limparSessao } from "../sessao.js";


// POST /api/usuarios/login — CPF ou CNPJ. Guarda o token e devolve o perfil.
export const login = async (documento, senha) => {

    limparSessao();

    const resposta = await Post("usuarios/login", { documento, senha });

    salvarToken(resposta.token);

    return resposta;
};


export const sair = () => {

    limparSessao();
    window.location.href = "/login.html";
};
