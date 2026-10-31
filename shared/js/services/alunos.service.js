import * as api from "../api.js";

// POST /api/alunos — anônimo (cadastro)
export const cadastrarAluno = (aluno) =>
    api.Post("alunos", aluno);

// GET /api/alunos/me — Aluno
export const obterAlunoLogado = () =>
    api.Get("alunos/me");

// PUT /api/alunos/me — Aluno
export const atualizarAlunoLogado = (aluno) =>
    api.Put("alunos/me", aluno);
