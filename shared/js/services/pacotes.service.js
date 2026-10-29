import * as api from "../api.js";

// GET /api/pacotes — Autoescola (os dela)
export const listarPacotes = () =>
    api.Get("pacotes");

// GET /api/pacotes/vitrine?autoescolaId=&cidadeId=&categoria= — Aluno
export const listarVitrine = (filtro = {}) =>
    api.Get(api.ComParams("pacotes/vitrine", filtro));

// POST /api/pacotes — Autoescola
export const cadastrarPacote = (pacote) =>
    api.Post("pacotes", pacote);

// PUT /api/pacotes/{id} — Autoescola
export const atualizarPacote = (id, pacote) =>
    api.Put(`pacotes/${id}`, pacote);

// DELETE /api/pacotes/{id} — Autoescola → 204 (tira de venda)
export const excluirPacote = (id) =>
    api.Delete(`pacotes/${id}`);
