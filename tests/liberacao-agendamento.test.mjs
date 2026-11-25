import test from 'node:test';
import assert from 'node:assert/strict';
import {etapaLiberacao, etapasHabilitacao} from '../aluno/js/domain/habilitacaoAluno.js';

// 24/11/2026 (pedido do usuário): a etapa "Liberação para agendamento" do aluno, depois da prova teórica.
test('liberação para agendar: os quatro momentos da etapa', () => {
  assert.equal(etapaLiberacao({}).situacao, 'Depois da aprovação na prova teórica');
  const pode = etapaLiberacao({podeSolicitar: true});
  assert.deepEqual([pode.estado, pode.acao], ['pendente', 'solicitar']);
  const pedido = etapaLiberacao({solicitadaEm: '2026-11-24T10:00:00'});
  assert.equal(pedido.situacao, 'Pedido enviado em 24/11');
  assert.equal(pedido.acao, undefined);
  const liberado = etapaLiberacao({solicitadaEm: '2026-11-24T10:00:00', liberadoEm: '2026-11-25T09:00:00'});
  assert.deepEqual([liberado.estado, liberado.situacao], ['feito', 'Liberado em 25/11']);
});

test('liberação para agendar: a etapa entra logo depois da teórica', () => {
  const dados = {exames: [], provas: [{tipo: 'teorica', tentativas: []}, {tipo: 'praticaCarro', tentativas: []}], liberacao: {podeSolicitar: true}};
  assert.deepEqual(etapasHabilitacao(dados, '2026-11-24').map(e => e.tipo), ['exames', 'teorica', 'liberacao', 'praticaCarro']);
  // Sem os dados da liberação (modo local antigo), as etapas continuam como antes.
  assert.deepEqual(etapasHabilitacao({...dados, liberacao: undefined}, '2026-11-24').map(e => e.tipo), ['exames', 'teorica', 'praticaCarro']);
});
