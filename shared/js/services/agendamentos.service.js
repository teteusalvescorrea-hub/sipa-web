import * as api from "../api.js";

// GET /api/agendamentos/horarios-disponiveis?contratacaoId=&categoria=&data= — Aluno
export const listarHorariosDisponiveis = (contratacaoId, categoria, data) =>
    api.Get(api.ComParams("agendamentos/horarios-disponiveis",
        { contratacaoId, categoria, data }));

// GET /api/agendamentos/motoristas-disponiveis?contratacaoId=&categoria=&dataHoraInicio= — Aluno
export const listarMotoristasDisponiveis = (contratacaoId, categoria, dataHoraInicio) =>
    api.Get(api.ComParams("agendamentos/motoristas-disponiveis",
        { contratacaoId, categoria, dataHoraInicio }));

// POST /api/agendamentos — Aluno (lote tudo-ou-nada)
export const agendarAulas = (contratacaoId, aulas) =>
    api.Post("agendamentos", { contratacaoId, aulas });

// GET /api/agendamentos?de=&ate=&status=&contratacaoId=&motoristaId=&alunoId=
export const listarAgendamentos = (filtro = {}) =>
    api.Get(api.ComParams("agendamentos", filtro));

// GET /api/agendamentos/{id} — dono da aula
export const obterAgendamento = (id) =>
    api.Get(`agendamentos/${id}`);

// GET /api/agendamentos/{id}/motoristas-disponiveis — Autoescola (para trocar o motorista)
export const listarMotoristasParaTroca = (id) =>
    api.Get(`agendamentos/${id}/motoristas-disponiveis`);

// GET /api/agendamentos/{id}/veiculos-disponiveis — Motorista ou Autoescola
export const listarVeiculosParaTroca = (id) =>
    api.Get(`agendamentos/${id}/veiculos-disponiveis`);

// Motorista: 3 Aguardando aceite → 1 Confirmada
export const aceitarAula = (id) =>
    api.Post(`agendamentos/${id}/aceitar`);

// Motorista: 3 → 4 Recusada. motivo opcional.
export const recusarAula = (id, motivo) =>
    api.Post(`agendamentos/${id}/recusar`, { motivo });

// Motorista: 1 Confirmada → 4 Recusada. motivo obrigatório.
export const desistirAula = (id, motivo) =>
    api.Post(`agendamentos/${id}/desistir`, { motivo });

// Autoescola: 1, 3 ou 4 → 3 com outro motorista. veiculoId opcional.
export const trocarMotorista = (id, motoristaId, veiculoId, motivo) =>
    api.Post(`agendamentos/${id}/trocar-motorista`, { motoristaId, veiculoId, motivo });

// Motorista ou Autoescola: troca o veículo; o status não muda.
export const trocarVeiculo = (id, veiculoId, motivo) =>
    api.Post(`agendamentos/${id}/trocar-veiculo`, { veiculoId, motivo });

// Autoescola: troca o ponto de encontro; o status não muda.
export const trocarLocal = (id, localAulaId, motivo) =>
    api.Post(`agendamentos/${id}/trocar-local`, { localAulaId, motivo });

// Aluno ou Autoescola: → 2 Cancelada. O saldo volta.
export const cancelarAula = (id, motivo) =>
    api.Post(`agendamentos/${id}/cancelar`, { motivo });

// Motorista ou Autoescola, depois do início: 1 → 5 Realizada
export const marcarRealizada = (id) =>
    api.Post(`agendamentos/${id}/marcar-realizada`);

// Motorista ou Autoescola, depois do início: 1 → 6 Falta (consome saldo)
export const marcarFalta = (id) =>
    api.Post(`agendamentos/${id}/marcar-falta`);
