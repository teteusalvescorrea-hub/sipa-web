import * as api from "../api.js";

// POST /api/unidades/{unidadeId}/locais-aula — Autoescola
export const cadastrarLocalAula = (unidadeId, local) =>
    api.Post(`unidades/${unidadeId}/locais-aula`, local);

// POST /api/unidades/{unidadeId}/locais-aula/{id}/substituir — Autoescola
export const substituirLocalAula = (unidadeId, id, dados) =>
    api.Post(`unidades/${unidadeId}/locais-aula/${id}/substituir`, dados);

// DELETE /api/unidades/{unidadeId}/locais-aula/{id} — Autoescola → 204
export const excluirLocalAula = (unidadeId, id) =>
    api.Delete(`unidades/${unidadeId}/locais-aula/${id}`);
