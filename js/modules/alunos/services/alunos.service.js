/* =========================================
   SIPA — ALUNOS
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* POST /api/alunos — anônimo (cadastro)
   { nome, cpf, email, telefone, categorias: [1] | [2] | [1, 2], senha } → 201 { id } */
export const cadastrarAluno = (aluno) =>
    api.Post("alunos", aluno);


/* GET /api/alunos/me — Aluno
   { id, nome, cpf, email, telefone, categoriasPretendidas, categoriasFormacao,
     aulasContratadas, aulasRealizadas, aulasAgendadas, aulasAguardandoMarcacao,
     aulasRestantes, percentualProgresso } */
export const obterAlunoLogado = () =>
    api.Get("alunos/me");


/* PUT /api/alunos/me — Aluno
   { nome, email, telefone, categorias } → 204. O CPF não muda. */
export const atualizarAlunoLogado = (aluno) =>
    api.Put("alunos/me", aluno);
