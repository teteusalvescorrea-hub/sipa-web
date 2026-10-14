/* =========================================
   SIPA — ERRO DA API
   A API responde os erros no formato ProblemDetails:
   { status, title, detail, listErrors? }
   ========================================= */

export class ApiErro extends Error {

    constructor(status, corpo) {

        const mensagem =
            corpo?.detail ||
            corpo?.title ||
            "Não foi possível falar com o servidor. Tente de novo.";

        super(mensagem);

        this.name = "ApiErro";
        this.status = status;
        this.titulo = corpo?.title || "";
        this.erros = Array.isArray(corpo?.listErrors)
            ? corpo.listErrors
            : [mensagem];
    }
}
