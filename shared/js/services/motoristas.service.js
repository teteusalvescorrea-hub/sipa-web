import * as api from "../api.js";

// POST /api/motoristas — anônimo (cadastro)
export const cadastrarMotorista = (motorista) =>
    api.Post("motoristas", motorista);

// GET /api/motoristas/me — Motorista
export const obterMotoristaLogado = () =>
    api.Get("motoristas/me");

// PUT /api/motoristas/me — Motorista
export const atualizarMotoristaLogado = (motorista) =>
    api.Put("motoristas/me", motorista);
