import * as api from "../../essencial/utils/api.js";

// GET /api/contratacoes?status= — Aluno (as suas), Autoescola (as dos pacotes dela)
export const listarContratacoes = (status) =>
    api.Get(api.ComParams("contratacoes", { status }));

// POST /api/contratacoes — Aluno
export const contratarPacote = (pacoteId) =>
    api.Post("contratacoes", { pacoteId });

// POST /api/contratacoes/{id}/aprovar — Autoescola → 204
export const aprovarContratacao = (id) =>
    api.Post(`contratacoes/${id}/aprovar`);

// POST /api/contratacoes/{id}/recusar — Autoescola → 204
export const recusarContratacao = (id) =>
    api.Post(`contratacoes/${id}/recusar`);

// POST /api/contratacoes/{id}/encerrar — Aluno (pendente) ou Autoescola (aprovada) → 204
export const encerrarContratacao = (id) =>
    api.Post(`contratacoes/${id}/encerrar`);
