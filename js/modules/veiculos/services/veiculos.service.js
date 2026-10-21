import * as api from "../../essencial/utils/api.js";

// GET /api/veiculos — Motorista
export const listarVeiculos = () =>
    api.Get("veiculos");

// POST /api/veiculos — Motorista
export const cadastrarVeiculo = (veiculo) =>
    api.Post("veiculos", veiculo);

// PUT /api/veiculos/{id} — Motorista
export const atualizarVeiculo = (id, veiculo) =>
    api.Put(`veiculos/${id}`, veiculo);

// DELETE /api/veiculos/{id} — Motorista → 204
export const excluirVeiculo = (id) =>
    api.Delete(`veiculos/${id}`);
