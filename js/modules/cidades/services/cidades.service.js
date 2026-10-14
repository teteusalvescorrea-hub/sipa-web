/* =========================================
   SIPA — CIDADES (as que já têm endereço cadastrado)
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* GET /api/cidades?uf=32 — Aluno, Motorista, Autoescola
   [{ id (código IBGE), nome, uf }] */
export const listarCidades = (uf) =>
    api.Get(api.ComParams("cidades", { uf }));
