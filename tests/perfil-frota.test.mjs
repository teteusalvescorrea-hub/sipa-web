import test from 'node:test';
import assert from 'node:assert/strict';
import {NIVEIS,PAINEL_DO_PERFIL,NOMES_PERFIL,FROTA,MASTER,permissoesDoPerfil,exigirCapacidade} from '../shared/js/permissoesAdministrativas.js';

// 24/11/2026 (pedido do usuário): o Administrador de Frotas só tem as capacidades dos veículos.
test('perfil frota: painel 4, nome e só as capacidades dos veículos', () => {
  assert.equal(PAINEL_DO_PERFIL.frota, 4);
  assert.equal(NIVEIS.frota, 3);
  assert.equal(NOMES_PERFIL.frota, 'Administrador de Frotas');
  assert.deepEqual(permissoesDoPerfil('frota'), ['consultar', 'cadastrar-recurso', 'editar-veiculo', 'excluir-cadastro', 'gestao-global']);
  assert.ok(FROTA.every(p => MASTER.includes(p)), 'nada além do que o Master já tem');
  for (const fora of ['cadastrar', 'agendar', 'cancelar-aula', 'relatorios', 'gestao-acessos', 'mensagens', 'editar-instrutor'])
    assert.ok(!permissoesDoPerfil('frota').includes(fora), fora);
});

test('perfil frota: a capacidade precisa estar no perfil e na conta', () => {
  const op = {id: 'f', nivel: NIVEIS.frota, permissoes: ['consultar', 'cadastrar-recurso', 'editar-veiculo']};
  assert.doesNotThrow(() => exigirCapacidade(op, 'editar-veiculo'));
  assert.throws(() => exigirCapacidade(op, 'agendar'), /Permissão insuficiente/);
  assert.throws(() => exigirCapacidade(op, 'excluir-cadastro'), /Permissão insuficiente/);
});
