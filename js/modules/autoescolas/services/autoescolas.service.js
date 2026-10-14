/* =========================================
   SIPA — AUTOESCOLAS
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* POST /api/autoescolas — anônimo (cadastro)
   { nome (razão social), cnpj, email, telefone, senha,
     nomeFantasia?, whatsapp?, prazoCancelamentoHorasUteis: 48,
     unidade: { nome, endereco, locais?: [{ categoria, usarEnderecoDaUnidade, endereco? }] },
     grade?: [{ diaSemana, hora }] } → 201 { id }
   endereco: { cep, logradouro, numero, complemento?, bairro, cidadeId (IBGE), cidadeNome }
   Sem grade, a API cria a padrão (seg a sex 7–11 e 13–18; sáb 7–11). */
export const cadastrarAutoescola = (autoescola) =>
    api.Post("autoescolas", autoescola);


/* GET /api/autoescolas/me — Autoescola
   { id, nome, cnpj, email, telefone, nomeFantasia, whatsapp, prazoCancelamentoHorasUteis } */
export const obterAutoescolaLogada = () =>
    api.Get("autoescolas/me");


/* PUT /api/autoescolas/me — Autoescola
   { nome, email, telefone, nomeFantasia, whatsapp, prazoCancelamentoHorasUteis } → 204 */
export const atualizarAutoescolaLogada = (autoescola) =>
    api.Put("autoescolas/me", autoescola);


/* GET /api/autoescolas?cidadeId=&categoria=&termo= — Aluno, Motorista
   [{ id, nome, whatsapp, cidades: string[], categorias }] */
export const listarAutoescolas = (filtro = {}) =>
    api.Get(api.ComParams("autoescolas", filtro));


/* GET /api/autoescolas/{id} — Aluno, Motorista
   { id, nome, whatsapp, prazoCancelamentoHorasUteis, unidades, grade } */
export const obterAutoescola = (id) =>
    api.Get(`autoescolas/${id}`);
