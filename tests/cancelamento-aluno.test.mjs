import test from 'node:test';
import assert from 'node:assert/strict';
import {quemCancelou,motivoDoCancelamento,situacaoDaConfirmada,separarAulasDoAluno} from '../aluno/js/components/painelAluno.js';

// 17/11/2026 (pedido do usuário): a aula cancelada do aluno mostra quem cancelou e o motivo.
test('aula cancelada: quem cancelou vem da origem da API ou do modo local',()=>{
 assert.equal(quemCancelou({valor:1,descricao:'Aluno'}),'pelo aluno');
 assert.equal(quemCancelou({valor:2,descricao:'Recepção'}),'pela Recepção');
 assert.equal(quemCancelou({valor:3,descricao:'Gerência'}),'pela Gerência');
 assert.equal(quemCancelou({valor:4,descricao:'Master'}),'pela Diretoria');
 assert.equal(quemCancelou({valor:5,descricao:'Sistema'}),'pelo sistema');
 assert.equal(quemCancelou({descricao:'Recepção'}),'pela Recepção');
 assert.equal(quemCancelou('recepcao'),'pela Recepção');
 assert.equal(quemCancelou('aluno'),'pelo aluno');
 assert.equal(quemCancelou(4),'pela Diretoria');
 assert.equal(quemCancelou(null),null);
 assert.equal(quemCancelou({valor:99}),null);
});

test('aula cancelada: o motivo da lista; no "Outro motivo", o texto informado',()=>{
 assert.equal(motivoDoCancelamento({cancelamento:{motivo:'Outro motivo',observacoes:'Sem expediente: recesso de fim de ano'}}),'Sem expediente: recesso de fim de ano');
 assert.equal(motivoDoCancelamento({cancelamento:{motivo:'Outros',observacoes:'Vou viajar'}}),'Vou viajar');
 assert.equal(motivoDoCancelamento({cancelamento:{motivo:'Imprevisto familiar',observacoes:'detalhe do aluno'}}),'Imprevisto familiar');
 assert.equal(motivoDoCancelamento({cancelamento:{motivo:'Manutenção emergencial'}}),'Manutenção emergencial');
 assert.equal(motivoDoCancelamento({motivoCancelamento:'Cancelamento por solicitação médica',cancelamento:{credito:'retido'}}),'Cancelamento por solicitação médica');
 assert.equal(motivoDoCancelamento({cancelamento:{credito:'retido'}}),'');
});

// 17/11/2026 (pedido do usuário): a confirmada que já começou não aparece mais como "Confirmada".
test('aula confirmada: em andamento, aguardando presença ou situação normal',()=>{
 const aula={status:1,inicio:'2026-11-17T07:00:00-03:00',fim:'2026-11-17T07:50:00-03:00'},em=h=>Date.parse('2026-11-17T'+h+':00-03:00');
 assert.equal(situacaoDaConfirmada(aula,em('06:59')),null);
 assert.equal(situacaoDaConfirmada(aula,em('07:00')),'Em andamento');
 assert.equal(situacaoDaConfirmada(aula,em('07:49')),'Em andamento');
 assert.equal(situacaoDaConfirmada(aula,em('07:50')),'Aguardando registro de presença');
 assert.equal(situacaoDaConfirmada(aula,em('13:49')),'Aguardando registro de presença');
 assert.equal(situacaoDaConfirmada({...aula,fim:null},em('07:10')),'Aguardando registro de presença');
 assert.equal(situacaoDaConfirmada({...aula,status:5},em('13:49')),null);
 assert.equal(situacaoDaConfirmada({...aula,status:2},em('13:49')),null);
});

// 17/11/2026 (pedido do usuário): "Aulas realizadas e faltas" junta presença, falta e a aula sem registro (no lugar do
// "Histórico"); as aulas com atestado vão para "Atestados médicos". Cada aula numa aba só.
test('abas do aluno: realizadas e faltas juntas; atestado à parte',()=>{
 const agora=Date.parse('2026-11-17T13:49:00-03:00'),aula=(id,status,dia,extra={})=>({id,status,inicio:'2026-11-'+dia+':00-03:00',...extra});
 const atestado={solicitacaoMedica:{id:'s1',status:'aprovado'}};
 const aulas=[aula('futura',1,'18T08:00'),aula('reserva',3,'19T08:00'),aula('sem-presenca',1,'17T07:00'),aula('sem-presenca-antiga',1,'16T07:00'),
  aula('reserva-expirada',3,'15T08:00'),aula('recusada',4,'14T08:00'),aula('cancelada',2,'13T08:00'),aula('cancelada-atestado',2,'12T08:00',atestado),
  aula('falta',6,'11T08:00'),aula('falta-atestado',6,'10T08:00',atestado),aula('realizada',5,'09T08:00')];
 const g=separarAulasDoAluno(aulas,agora),ids=l=>l.map(a=>a.id);
 assert.deepEqual(ids(g.confirmadas),['futura','reserva']);
 assert.equal(g.historico,undefined);
 assert.deepEqual(ids(g.realizadas),['sem-presenca','sem-presenca-antiga','falta','realizada']);
 assert.deepEqual(ids(g.canceladas),['reserva-expirada','recusada','cancelada']);
 assert.deepEqual(ids(g.atestados),['cancelada-atestado','falta-atestado']);
 const todas=[...g.confirmadas,...g.realizadas,...g.canceladas,...g.atestados];
 assert.equal(todas.length,aulas.length);assert.equal(new Set(ids(todas)).size,aulas.length);
});
