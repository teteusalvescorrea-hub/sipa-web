import test from 'node:test';
import assert from 'node:assert/strict';
import {partesDoSaldo, textoDoSaldo} from '../aluno/js/domain/saldoAluno.js';
import {resumirCreditos} from '../aluno/js/domain/dominioAluno.js';

const soma = p => p.disponiveis + p.agendadas + p.usadas;

test('saldo do aluno: disponíveis + agendadas + já usadas fecham no pacote', () => {
  // O caso do print: 20 no pacote, 7 disponíveis, 3 agendadas, 1 feita e 9 que passaram sem o registro de presença.
  const c = {total: 20, disponiveis: 7, reservadas: 3, realizadas: 1, aguardando: 9};
  assert.deepEqual(partesDoSaldo(c), {disponiveis: 7, agendadas: 3, usadas: 10, total: 20});
  assert.equal(textoDoSaldo(c), 'Pacote de 20 aulas: 7 disponíveis · 3 agendadas · 10 já usadas');
  assert.equal(textoDoSaldo({total: 1, disponiveis: 0, reservadas: 0, realizadas: 1}), 'Pacote de 1 aula: 0 disponíveis · 0 agendadas · 1 já usada');
  assert.equal(textoDoSaldo(null), 'Saldo por categoria ainda não informado.');
  // Sem total, soma as partes usadas.
  assert.deepEqual(partesDoSaldo({total: null, disponiveis: 2, reservadas: 1, realizadas: 1, faltas: 1}), {disponiveis: 2, agendadas: 1, usadas: 2, total: 5});
});

test('saldo local: falta, cancelada com crédito retido e aula passada sem registro entram em "já usadas"', () => {
  const agora = Date.parse('2026-11-24T12:00:00-03:00');
  const aulas = [
    {id: '1', categoria: 'A', status: 5, inicio: '2026-11-10T08:00:00-03:00'},
    {id: '2', categoria: 'A', status: 6, inicio: '2026-11-11T08:00:00-03:00'},
    {id: '3', categoria: 'A', status: 2, inicio: '2026-11-12T08:00:00-03:00', cancelamento: {credito: 'retido'}},
    {id: '4', categoria: 'A', status: 1, inicio: '2026-11-20T08:00:00-03:00'},
    {id: '5', categoria: 'A', status: 1, inicio: '2026-11-30T08:00:00-03:00'},
    {id: '6', categoria: 'A', status: 2, inicio: '2026-11-13T08:00:00-03:00', cancelamento: {credito: 'devolvido'}},
  ];
  const p = partesDoSaldo(resumirCreditos({categorias: {A: 10}}, aulas, agora).categorias.A);
  assert.deepEqual(p, {disponiveis: 5, agendadas: 1, usadas: 4, total: 10});
  assert.equal(soma(p), 10);
});
