import * as api from "../api.js";

// GET /api/dominios — anônimo
export const obterDominios = () =>
    api.Get("dominios");
