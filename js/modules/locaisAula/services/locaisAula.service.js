/* =========================================
   SIPA — PONTOS DE ENCONTRO (locais de aula de uma unidade)
   ========================================= */

import * as api from "../../essencial/utils/api.js";


/* POST /api/unidades/{unidadeId}/locais-aula — Autoescola
   { categoria: 1 | 2, usarEnderecoDaUnidade: bool, endereco? } → 201 { id }
   Um local ativo por categoria em cada unidade. */
export const cadastrarLocalAula = (unidadeId, local) =>
    api.Post(`unidades/${unidadeId}/locais-aula`, local);


/* POST /api/unidades/{unidadeId}/locais-aula/{id}/substituir — Autoescola
   { usarEnderecoDaUnidade, endereco?, motivo? } → 201 { id } (Id do local novo).
   As aulas futuras do local antigo passam para o novo. */
export const substituirLocalAula = (unidadeId, id, dados) =>
    api.Post(`unidades/${unidadeId}/locais-aula/${id}/substituir`, dados);


/* DELETE /api/unidades/{unidadeId}/locais-aula/{id} — Autoescola → 204.
   Com aula futura no local, use substituir. */
export const excluirLocalAula = (unidadeId, id) =>
    api.Delete(`unidades/${unidadeId}/locais-aula/${id}`);
