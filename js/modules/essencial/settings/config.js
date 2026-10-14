// Endereço da API por ambiente. Faz o papel dos .env do Simplea
// (.env.development, .env.homolog e .env.production).

const AMBIENTES = {
    development: { API_URL: "http://localhost:5080/api" },
    homolog: { API_URL: "" },
    production: { API_URL: "" }
};

// O ambiente sai do endereço em que o front está aberto.
const AMBIENTE_POR_HOST = {
    "localhost": "development",
    "127.0.0.1": "development",
    "teteusalvescorrea-hub.github.io": "production"
};

export const AMBIENTE =
    AMBIENTE_POR_HOST[window.location.hostname] ?? "production";

// Troca local sem commit (como o .env.local do Simplea). No console do navegador:
// localStorage.setItem("sipa.API_URL", "http://localhost:5081/api") e recarregar.
// Para voltar ao padrão: localStorage.removeItem("sipa.API_URL").
function urlLocal() {
    try {
        return localStorage.getItem("sipa.API_URL");
    } catch {
        return null;
    }
}

export const API_URL = urlLocal() || AMBIENTES[AMBIENTE].API_URL;
