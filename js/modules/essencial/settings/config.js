// Endereço da API por ambiente (faz o papel do .env do Simplea).

const AMBIENTES = {
    local: "http://localhost:5080/api",
    producao: ""
};

const ehLocal =
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_URL =
    ehLocal ? AMBIENTES.local : AMBIENTES.producao;
