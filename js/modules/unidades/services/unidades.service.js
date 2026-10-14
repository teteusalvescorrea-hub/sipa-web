import * as api from "../../essencial/utils/api.js";

// GET /api/unidades — Autoescola
export const listarUnidades = () =>
    api.Get("unidades");

// POST /api/unidades — Autoescola
export const cadastrarUnidade = (unidade) =>
    api.Post("unidades", unidade);

// PUT /api/unidades/{id} — Autoescola
export const atualizarUnidade = (id, unidade) =>
    api.Put(`unidades/${id}`, unidade);

// DELETE /api/unidades/{id} — Autoescola → 204
export const excluirUnidade = (id) =>
    api.Delete(`unidades/${id}`);
