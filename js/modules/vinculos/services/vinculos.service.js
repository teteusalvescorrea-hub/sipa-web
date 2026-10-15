import * as api from "../../essencial/utils/api.js";

// GET /api/vinculos?status= — Motorista (os seus), Autoescola (os dela)
export const listarVinculos = (status) =>
    api.Get(api.ComParams("vinculos", { status }));

// POST /api/vinculos — Motorista (pede o vínculo)
export const pedirVinculo = (autoescolaId) =>
    api.Post("vinculos", { autoescolaId });

// POST /api/vinculos/{id}/aprovar — Autoescola → 204
export const aprovarVinculo = (id) =>
    api.Post(`vinculos/${id}/aprovar`);

// POST /api/vinculos/{id}/recusar — Autoescola → 204
export const recusarVinculo = (id) =>
    api.Post(`vinculos/${id}/recusar`);

// POST /api/vinculos/{id}/encerrar — Motorista ou Autoescola → 204
export const encerrarVinculo = (id) =>
    api.Post(`vinculos/${id}/encerrar`);
