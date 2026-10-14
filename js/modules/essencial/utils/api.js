// Cliente da API: monta a URL, manda o token e transforma erro em ApiErro.

import { API_URL } from "../settings/config.js";
import { ApiErro } from "./apiErro.js";
import { obterToken, limparSessao } from "./sessao.js";


async function requisicao(metodo, rota, corpo) {

    const cabecalhos = { "Content-Type": "application/json" };
    const token = obterToken();

    if (token) {
        cabecalhos.Authorization = `Bearer ${token}`;
    }

    let resposta;

    try {
        resposta = await fetch(`${API_URL}/${rota}`, {
            method: metodo,
            headers: cabecalhos,
            body: corpo === undefined ? undefined : JSON.stringify(corpo)
        });
    } catch {
        throw new ApiErro(0, null);
    }

    // 401 numa tela logada: volta para o login.
    if (resposta.status === 401 && token) {
        limparSessao();
        window.location.href = "login.html";
    }

    const texto = await resposta.text();
    const dados = texto ? JSON.parse(texto) : null;

    if (!resposta.ok) {
        throw new ApiErro(resposta.status, dados);
    }

    return dados;
}


export const Get = (rota) => requisicao("GET", rota);

export const Post = (rota, corpo) => requisicao("POST", rota, corpo ?? {});

export const Put = (rota, corpo) => requisicao("PUT", rota, corpo ?? {});

export const Delete = (rota) => requisicao("DELETE", rota);


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
