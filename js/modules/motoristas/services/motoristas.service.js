/* =========================================
   SIPA — MOTORISTAS
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* POST /api/motoristas — anônimo (cadastro)
   { nome, cpf, email, telefone, categorias: int[],
     cnhNumero, cnhValidade: "2029-05-31",
     credenciamentoNumero, credenciamentoUf: int (código IBGE da UF),
     credenciamentoValidade: "2029-05-31", senha } → 201 { id } */
export const cadastrarMotorista = (motorista) =>
    api.Post("motoristas", motorista);


/* GET /api/motoristas/me — Motorista
   { id, nome, cpf, email, telefone, categorias, cnhNumero, cnhValidade, cnhVencida,
     credenciamentoNumero, credenciamentoUf, credenciamentoValidade, credenciamentoVencido } */
export const obterMotoristaLogado = () =>
    api.Get("motoristas/me");


/* PUT /api/motoristas/me — Motorista
   Os campos do cadastro, menos cpf e senha → 204.
   Acrescentar categoria ou trocar CNH/credenciamento volta os vínculos aprovados para Pendente. */
export const atualizarMotoristaLogado = (motorista) =>
    api.Put("motoristas/me", motorista);
