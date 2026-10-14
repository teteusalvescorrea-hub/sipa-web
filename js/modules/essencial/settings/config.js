/* =========================================
   SIPA — CONFIGURAÇÃO DA API
   Faz o papel do .env do front do Simplea:
   o endereço da API muda conforme o ambiente.
   ========================================= */

const AMBIENTES = {
    local: "http://localhost:5080/api",
    producao: ""
};

const ehLocal =
    ["localhost", "127.0.0.1"].includes(window.location.hostname);

export const API_URL =
    ehLocal ? AMBIENTES.local : AMBIENTES.producao;
