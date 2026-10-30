import { Post } from "../api.js";
import { salvarToken, limparSessao, urlLogin } from "../sessao.js";


// POST /api/usuarios/login — CPF (aluno, instrutor e equipe) ou e-mail (equipe) no mesmo campo.
// Com senha provisória (deveTrocarSenha) o token vem nulo: nada é guardado e
// o login.html pede a senha nova (trocarSenhaProvisoria).
export const login = async (login, senha) => {

    limparSessao();

    const resposta = await Post("usuarios/login", { login, senha });

    if (resposta?.token) {
        salvarToken(resposta.token);
    }

    return resposta;
};


// POST /api/usuarios/trocar-senha-provisoria — devolve o TokenReadDto já com o token.
export const trocarSenhaProvisoria = async (login, senhaProvisoria, novaSenha) => {

    limparSessao();

    const resposta = await Post("usuarios/trocar-senha-provisoria", { login, senhaProvisoria, novaSenha });

    if (resposta?.token) {
        salvarToken(resposta.token);
    }

    return resposta;
};


export const sair = () => {

    limparSessao();
    window.location.href = urlLogin();
};
