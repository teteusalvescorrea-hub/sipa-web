/* =========================================
   SIPA — VEÍCULOS (do motorista logado)
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* GET /api/veiculos — Motorista
   [{ id, placa, modelo, categoria, compartilhado, usadoEmAula }] */
export const listarVeiculos = () =>
    api.Get("veiculos");


/* POST /api/veiculos — Motorista
   { placa: "ABC1D23", modelo, categoria: 1 | 2 } → 201 { id } */
export const cadastrarVeiculo = (veiculo) =>
    api.Post("veiculos", veiculo);


/* PUT /api/veiculos/{id} — Motorista
   { placa, modelo, categoria } → 204.
   Placa e categoria só mudam se o veículo nunca foi usado em aula e não é compartilhado. */
export const atualizarVeiculo = (id, veiculo) =>
    api.Put(`veiculos/${id}`, veiculo);


/* DELETE /api/veiculos/{id} — Motorista → 204 */
export const excluirVeiculo = (id) =>
    api.Delete(`veiculos/${id}`);
