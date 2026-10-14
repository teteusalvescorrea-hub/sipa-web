/* =========================================
   SIPA — GRADE DE HORÁRIOS (da autoescola logada)
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* GET /api/grades-horarios — Autoescola
   [{ id, diaSemana: { descricao, valor }, hora, horario: "HH:mm" }] */
export const obterGradeHorarios = () =>
    api.Get("grades-horarios");


/* PUT /api/grades-horarios — Autoescola (substitui a grade inteira)
   { horarios: [{ diaSemana: 1..7, hora: 0..23 }] } → 204 */
export const salvarGradeHorarios = (horarios) =>
    api.Put("grades-horarios", { horarios });
