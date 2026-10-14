/* =========================================
   SIPA — PACOTES DE AULAS
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* GET /api/pacotes — Autoescola (os dela)
   [{ id, nome, nomeExibicao, quantidadeAulas, preco, categorias, contratado, criadoEm }] */
export const listarPacotes = () =>
    api.Get("pacotes");


/* GET /api/pacotes/vitrine?autoescolaId=&cidadeId=&categoria= — Aluno
   [{ id, nomeExibicao, quantidadeAulas, preco, categorias,
      autoescolaId, autoescolaNome, autoescolaWhatsapp, autoescolaCidades }]
   Sem categoria, mostra os pacotes das categorias pretendidas do aluno. */
export const listarVitrine = (filtro = {}) =>
    api.Get(api.ComParams("pacotes/vitrine", filtro));


/* POST /api/pacotes — Autoescola
   { nome?, quantidadeAulas: 1..100, preco: 1890.00, categorias: int[] } → 201 { id } */
export const cadastrarPacote = (pacote) =>
    api.Post("pacotes", pacote);


/* PUT /api/pacotes/{id} — Autoescola
   Os campos do cadastro → 204. Pacote já contratado: só o nome muda. */
export const atualizarPacote = (id, pacote) =>
    api.Put(`pacotes/${id}`, pacote);


/* DELETE /api/pacotes/{id} — Autoescola → 204 (tira de venda) */
export const excluirPacote = (id) =>
    api.Delete(`pacotes/${id}`);
