// Cliente da API: monta a URL, manda o token e transforma erro em ApiErro.

import { API_URL } from "./config-api.js";
import { ApiErro } from "./apiErro.js";
import { obterToken, limparSessao, urlLogin } from "./sessao.js";


// opcoes.cabecalhos: cabeçalhos extras (ex.: Idempotency-Key).
// opcoes.binario: devolve o Blob da resposta (documento do atestado).
// Corpo FormData vai como multipart, sem Content-Type (o navegador põe o boundary).
async function requisicao(metodo, rota, corpo, opcoes = {}) {

    const multipart = typeof FormData !== "undefined" && corpo instanceof FormData;
    const cabecalhos = multipart ? {} : { "Content-Type": "application/json" };
    Object.assign(cabecalhos, opcoes.cabecalhos);
    const token = obterToken();

    if (token) {
        cabecalhos.Authorization = `Bearer ${token}`;
    }

    let resposta;

    try {
        resposta = await fetch(`${API_URL}/${rota}`, {
            method: metodo,
            headers: cabecalhos,
            body: corpo === undefined ? undefined : multipart ? corpo : JSON.stringify(corpo)
        });
    } catch {
        throw new ApiErro(0, null);
    }

    // 401 numa tela logada: volta para o login e não resolve, para a tela não mostrar erro.
    if (resposta.status === 401 && token) {
        limparSessao();
        window.location.href = urlLogin("sessao=expirada");
        return new Promise(() => {});
    }

    if (opcoes.binario && resposta.ok) {
        return resposta.blob();
    }

    const texto = await resposta.text();

    // Corpo que não é JSON (HTML de 404/502 do servidor) vira null.
    let dados = null;

    try {
        dados = texto ? JSON.parse(texto) : null;
    } catch {
        dados = null;
    }

    if (!resposta.ok) {
        throw new ApiErro(resposta.status, dados);
    }

    return dados;
}


export const Get = (rota, opcoes) => requisicao("GET", rota, undefined, opcoes);

export const Post = (rota, corpo, opcoes) => requisicao("POST", rota, corpo ?? {}, opcoes);

export const Put = (rota, corpo, opcoes) => requisicao("PUT", rota, corpo ?? {}, opcoes);

export const Patch = (rota, corpo, opcoes) => requisicao("PATCH", rota, corpo ?? {}, opcoes);

// DELETE com corpo opcional (ex.: { justificativa }).
export const Delete = (rota, corpo, opcoes) => requisicao("DELETE", rota, corpo, opcoes);


// Query string. Lista vira chave repetida: { status: [3, 4] } → "status=3&status=4".
export const ToParams = (filtro = {}) => {

    const params = new URLSearchParams();

    Object.entries(filtro).forEach(([chave, valor]) => {

        if (valor === undefined || valor === null || valor === "") {
            return;
        }

        if (Array.isArray(valor)) {
            valor.forEach((item) => params.append(chave, item));
            return;
        }

        params.append(chave, valor);
    });

    return params.toString();
};


export const ComParams = (rota, filtro) => {

    const query = ToParams(filtro);

    return query ? `${rota}?${query}` : rota;
};
