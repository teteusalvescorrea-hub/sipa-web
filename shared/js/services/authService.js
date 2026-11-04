import { Post } from "../api.js";
import { salvarToken, limparSessao, urlLogin } from "../sessao.js";


// POST /api/usuarios/login — CPF (aluno, instrutor e equipe) ou e-mail (equipe) no mesmo campo.
// Com senha provisória (deveTrocarSenha) o token vem nulo: nada é guardado e
// o login.html pede a senha nova (trocarSenhaProvisoria). Conta com mais de um
// perfil (aluno e instrutor no mesmo CPF): sem perfil, o token vem nulo e a
// resposta traz os perfis; o login.html pergunta e chama de novo com o perfil.
export const login = async (login, senha, perfil = null) => {

    limparSessao();

    const resposta = await Post("usuarios/login", { login, senha, ...(perfil ? { perfil } : {}) });

    if (resposta?.token) {
        salvarToken(resposta.token);
    }

    return resposta;
};


// POST /api/usuarios/trocar-senha-provisoria — devolve o TokenReadDto já com o token.
export const trocarSenhaProvisoria = async (login, senhaProvisoria, novaSenha, perfil = null) => {

    limparSessao();

    const resposta = await Post("usuarios/trocar-senha-provisoria", { login, senhaProvisoria, novaSenha, ...(perfil ? { perfil } : {}) });

    if (resposta?.token) {
        salvarToken(resposta.token);
    }

    return resposta;
};


export const sair = () => {

    limparSessao();
    window.location.href = urlLogin();
};
