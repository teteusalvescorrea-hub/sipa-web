import * as api from "../../essencial/utils/api.js";

// GET /api/grades-horarios — Autoescola
export const obterGradeHorarios = () =>
    api.Get("grades-horarios");

// PUT /api/grades-horarios — Autoescola (substitui a grade inteira)
export const salvarGradeHorarios = (horarios) =>
    api.Put("grades-horarios", { horarios });
