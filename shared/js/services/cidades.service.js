import * as api from "../api.js";

// GET /api/cidades?uf=32 — Aluno, Motorista, Autoescola
export const listarCidades = (uf) =>
    api.Get(api.ComParams("cidades", { uf }));
