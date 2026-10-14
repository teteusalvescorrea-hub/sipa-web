/* =========================================
   SIPA — DOMÍNIOS (listas fixas para selects e rótulos)
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* GET /api/dominios — anônimo
   { perfis, statusAprovacao, statusAgendamento, tiposEventoAgendamento, diasSemana,
     categorias: [{ valor, sigla, descricao }], ufs: [{ valor, sigla, descricao }] } */
export const obterDominios = () =>
    api.Get("dominios");
