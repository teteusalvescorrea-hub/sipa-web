import test from 'node:test';
import assert from 'node:assert/strict';
import {escopoPermitido,exigirCapacidade,permissoesDoPerfil} from '../shared/js/permissoesAdministrativas.js';
import {historicoMedicoParaExibicao} from '../shared/js/solicitacoesMedicas.js';
import {criarServicoAdministrativo} from '../dev/servicoAdministrativo.js';
const identidade=(perfil,extra={})=>({id:'conta',perfil,nivel:{operador:1,gerencia:2,master:3}[perfil],unidade:'Vila Velha',unidades:['Vila Velha','Itaparica'],permissoes:permissoesDoPerfil(perfil),...extra});
test('Recepção e Gerência ignoram listas legadas de múltiplas unidades e não gerenciam acessos',()=>{
 for(const perfil of ['operador','gerencia']){
  const op=identidade(perfil);assert.ok(escopoPermitido(op,'Vila Velha'));assert.equal(escopoPermitido(op,'Itaparica'),false);
  assert.equal(op.permissoes.includes('gestao-acessos'),false);
  assert.throws(()=>exigirCapacidade({...op,permissoes:permissoesDoPerfil('master')},'gestao-acessos'));
 }
 assert.doesNotThrow(()=>exigirCapacidade(identidade('master'),'gestao-acessos',3));
});
test('Master consulta todas as unidades ou filtra uma sem ampliar o perfil inferior',async()=>{
 const e={alunos:[{id:'centro',unidade:'Vila Velha'},{id:'itaparica',unidade:'Itaparica'}],recursos:[],aulas:[],excecoesAgenda:[],ofertasAntecipacao:[],auditoria:[],configuracoesUnidades:{}};
 const adaptador={ler:async()=>structuredClone(e),alterar:async fn=>fn(structuredClone(e))};
 const global=criarServicoAdministrativo(adaptador,identidade('master'));assert.equal((await global.estado()).alunos.length,2);
 const local=criarServicoAdministrativo(adaptador,identidade('master',{unidade:'Itaparica',unidadeConsulta:'Itaparica'}));assert.deepEqual((await local.estado()).alunos.map(a=>a.id),['itaparica']);
 const gerente=criarServicoAdministrativo(adaptador,identidade('gerencia'));assert.deepEqual((await gerente.estado()).alunos.map(a=>a.id),['centro']);
 await assert.rejects(gerente.relatorio({tipo:'usuarios',inicio:'2026-10-01',fim:'2026-10-31'}),/Permissão/);
 assert.deepEqual(e.alunos.map(a=>a.id),['centro','itaparica']);
});
test('histórico médico formata Brasília, responsáveis e estados sem modificar eventos ou inventar nomes',()=>{
 const s={alunoId:'aluno',unidadeRecepcao:'Vila Velha',eventos:[{em:'2026-10-27T12:55:31.109Z',responsavel:'id-interno-longo',anterior:'recepcao',novo:'gerencia',observacoes:'Documento conferido'},{em:'2026-10-28T12:00:00Z',responsavel:'gerente',perfil:'gerencia',anterior:'gerencia',novo:'aprovado',observacoes:'Aprovado após análise'},{em:'invalida',responsavel:'aluno',novo:'recepcao'}]};
 const antes=structuredClone(s),itens=historicoMedicoParaExibicao(s,{aluno:{id:'aluno',nome:'Aluno de teste'},responsaveis:[{id:'gerente',nome:'Gerente de teste',perfil:'gerencia'}]});
 assert.equal(itens[0].data,'27/10/2026 às 09:55');assert.equal(itens[0].responsavel,'Recepção — Centro de Vila Velha');
 assert.equal(itens[1].responsavel,'Gerência — Gerente de teste');assert.equal(itens[1].novo,'Aprovado pela gerência');
 assert.equal(itens[2].responsavel,'Aluno — Aluno de teste');assert.equal(itens[2].data,'Data não informada');assert.deepEqual(s,antes);
 assert.ok(!JSON.stringify(itens).includes('id-interno-longo'));
 const envio=historicoMedicoParaExibicao({...s,eventos:[{responsavel:'aluno:aluno',perfil:'aluno',novo:'recepcao'}]},{aluno:{id:'aluno',nome:'Aluno de teste'}});
 assert.equal(envio[0].responsavel,'Aluno — Aluno de teste');
});
