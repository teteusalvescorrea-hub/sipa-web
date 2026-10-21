// Erro da API (ProblemDetails: title, detail, listErrors).

// Sem corpo (rede, HTML de erro do servidor), a mensagem sai pelo status.
function mensagemDoStatus(status) {

    if (status === 0) {
        return "Não foi possível falar com o servidor. Tente de novo.";
    }

    if (status === 401) {
        return "Faça login para continuar.";
    }

    if (status === 403) {
        return "Seu perfil não tem acesso a esta ação.";
    }

    if (status === 404) {
        return "Não encontrado.";
    }

    return "Erro inesperado no servidor. Tente de novo em alguns instantes.";
}


export class ApiErro extends Error {

    constructor(status, corpo) {

        const mensagem =
            corpo?.detail ||
            corpo?.title ||
            mensagemDoStatus(status);

        super(mensagem);

        this.name = "ApiErro";
        this.status = status;
        this.titulo = corpo?.title || "";
        this.erros = Array.isArray(corpo?.listErrors)
            ? corpo.listErrors
            : [mensagem];
    }
}
