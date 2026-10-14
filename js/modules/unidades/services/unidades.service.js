/* =========================================
   SIPA — UNIDADES (da autoescola logada)
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* GET /api/unidades — Autoescola
   [{ id, nome, endereco, locais: [{ id, categoria, endereco, mesmoEnderecoDaUnidade }] }] */
export const listarUnidades = () =>
    api.Get("unidades");


/* POST /api/unidades — Autoescola
   { nome, endereco, locais?: [{ categoria, usarEnderecoDaUnidade, endereco? }] } → 201 { id } */
export const cadastrarUnidade = (unidade) =>
    api.Post("unidades", unidade);


/* PUT /api/unidades/{id} — Autoescola
   { nome, endereco } → 204 */
export const atualizarUnidade = (id, unidade) =>
    api.Put(`unidades/${id}`, unidade);


/* DELETE /api/unidades/{id} — Autoescola → 204.
   Não exclui a última unidade nem unidade com aula futura. */
export const excluirUnidade = (id) =>
    api.Delete(`unidades/${id}`);
