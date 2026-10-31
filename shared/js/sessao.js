// Sessão: guarda só o token do login. O perfil vem dentro do token.

const CHAVE_TOKEN = "sipa.token";
const CLAIM_PERFIL = "http://schemas.microsoft.com/ws/2008/06/identity/claims/role";


export function salvarToken(token) {
    sessionStorage.setItem(CHAVE_TOKEN, token);
}


export function obterToken() {
    return sessionStorage.getItem(CHAVE_TOKEN);
}


export function limparSessao() {
    sessionStorage.removeItem(CHAVE_TOKEN);
}


function lerToken() {

    const token = obterToken();

    if (!token) {
        return null;
    }

    try {
        const base64 = token.split(".")[1].replace(/-/g, "+").replace(/_/g, "/");
        return JSON.parse(decodeURIComponent(escape(atob(base64))));
    } catch {
        return null;
    }
}


export function obterPerfil() {

    const conteudo = lerToken();

    return conteudo?.[CLAIM_PERFIL] || conteudo?.role || null;
}


export function estaLogado() {

    const conteudo = lerToken();

    return !!conteudo && conteudo.exp * 1000 > Date.now();
}


// Proteção de rota. Ex.: exigirLogin(["Aluno"])
export function exigirLogin(perfisPermitidos = []) {

    const perfil = obterPerfil();

    if (!estaLogado() ||
        (perfisPermitidos.length && !perfisPermitidos.includes(perfil))) {

        limparSessao();
        window.location.href = "/login.html";
        return false;
    }

    return true;
}
