// Endereço da API por ambiente. Faz o papel dos .env do Simplea
// (.env.development, .env.homolog e .env.production).

const AMBIENTES = {
    development: { API_URL: "http://localhost:5080/api" },
    // Demonstração: a tela e a API vêm do mesmo endereço; o servidor da demonstração (demo/servidor-demo.mjs, fora
    // dos repositórios) manda o /api para a API da máquina.
    demo: { API_URL: window.location.origin + "/api" },
    homolog: { API_URL: "" },
    production: { API_URL: "" }
};

// O ambiente sai do endereço em que o front está aberto.
const AMBIENTE_POR_HOST = {
    "localhost": "development",
    "127.0.0.1": "development",
    "teteusalvescorrea-hub.github.io": "production"
};

// 22/11/2026: demonstração pelo link do Cloudflare quick tunnel (*.trycloudflare.com) ou pelo próprio servidor da
// demonstração aberto nesta máquina (porta 5600). O Live Server (5500) continua no development, direto na 5080.
const PORTA_DEMO = "5600";
const PELA_DEMO = window.location.hostname.endsWith(".trycloudflare.com") ||
    (AMBIENTE_POR_HOST[window.location.hostname] === "development" && window.location.port === PORTA_DEMO);

export const AMBIENTE =
    PELA_DEMO ? "demo" : AMBIENTE_POR_HOST[window.location.hostname] ?? "production";

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

export const API_URL = (AMBIENTE === "development" ? urlLocal() : null) || AMBIENTES[AMBIENTE].API_URL;
