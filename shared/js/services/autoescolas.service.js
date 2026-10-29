import * as api from "../api.js";

// POST /api/autoescolas — anônimo (cadastro)
export const cadastrarAutoescola = (autoescola) =>
    api.Post("autoescolas", autoescola);

// GET /api/autoescolas/me — Autoescola
export const obterAutoescolaLogada = () =>
    api.Get("autoescolas/me");

// PUT /api/autoescolas/me — Autoescola
export const atualizarAutoescolaLogada = (autoescola) =>
    api.Put("autoescolas/me", autoescola);

// GET /api/autoescolas?cidadeId=&categoria=&termo= — Aluno, Motorista
export const listarAutoescolas = (filtro = {}) =>
    api.Get(api.ComParams("autoescolas", filtro));

// GET /api/autoescolas/{id} — Aluno, Motorista
export const obterAutoescola = (id) =>
    api.Get(`autoescolas/${id}`);
