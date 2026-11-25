// 24/11/2026 (pedido do usuário): o saldo de uma categoria em três partes que sempre fecham no total do pacote:
// disponíveis + agendadas + já usadas. "Já usadas" junta tudo o que já gastou crédito (aulas feitas, as que já passaram
// e ainda não tiveram a presença registrada, faltas e cancelamentos fora do prazo, e o que sobrou de pacote encerrado):
// o aluno não depende do registro de presença para entender o próprio saldo.
const numero = v => (v !== null && v !== '' && Number.isFinite(Number(v)) ? Math.max(0, Number(v)) : 0);
const USADAS = ['realizadas', 'aguardando', 'faltas', 'retidas', 'encerradas'];

export const EXPLICACAO_USADAS = 'Já usadas: aulas que já passaram (feitas ou com falta) e cancelamentos fora do prazo.';

// {disponiveis, agendadas, usadas, total}: com o total conhecido, "usadas" é o que falta para fechar nele.
export function partesDoSaldo(c) {
  if (!c) return null;
  const disponiveis = numero(c.disponiveis), agendadas = numero(c.reservadas);
  const total = c.total === null || c.total === undefined ? null : numero(c.total);
  const usadas = total === null ? USADAS.reduce((s, k) => s + numero(c[k]), 0) : Math.max(0, total - disponiveis - agendadas);
  return {disponiveis, agendadas, usadas, total: total ?? disponiveis + agendadas + usadas};
}

const plural = (n, um, varios) => n + ' ' + (n === 1 ? um : varios);

// "Pacote de 20 aulas: 7 disponíveis · 3 agendadas · 10 já usadas".
export function textoDoSaldo(c) {
  const p = partesDoSaldo(c);
  if (!p) return 'Saldo por categoria ainda não informado.';
  return 'Pacote de ' + plural(p.total, 'aula', 'aulas') + ': ' +
    [plural(p.disponiveis, 'disponível', 'disponíveis'), plural(p.agendadas, 'agendada', 'agendadas'), plural(p.usadas, 'já usada', 'já usadas')].join(' · ');
}
