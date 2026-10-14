import * as api from "../../essencial/utils/api.js";

// GET /api/dominios — anônimo
export const obterDominios = () =>
    api.Get("dominios");
