import test from 'node:test';
import assert from 'node:assert/strict';
import {situacaoExame,resumoExames,situacaoProva,etapasHabilitacao,diaMes} from '../aluno/js/domain/habilitacaoAluno.js';
import {LINK_CONTRATAR_AULAS,ROTA_CONTRATAR_AULAS} from '../aluno/js/domain/contatoRecepcao.js';

const hoje='2026-11-04';
const exame=(situacao,validade='',tipo='medico')=>({tipo,nome:tipo,situacao,data:'2026-10-01',validade});

test('exames: aprovado, pendente no lugar de "Não informado", vencido e "Vence em breve" com menos de 30 dias',()=>{
 assert.deepEqual(situacaoExame(exame('Aprovado','2027-10-01'),hoje),{chave:'aprovado',rotulo:'Aprovado',tom:'ok',emDia:true});
 assert.equal(situacaoExame(exame('Aprovado'),hoje).chave,'aprovado','sem validade continua aprovado');
 for(const s of ['Não informado','Pendente',undefined,''])assert.deepEqual(situacaoExame(exame(s),hoje),{chave:'pendente',rotulo:'Pendente',tom:'neutro',emDia:false});
 assert.equal(situacaoExame(exame('Aprovado','2026-12-03'),hoje).rotulo,'Vence em breve','29 dias');
 assert.equal(situacaoExame(exame('Aprovado','2026-12-04'),hoje).rotulo,'Aprovado','30 dias já não avisa');
 assert.deepEqual(situacaoExame(exame('Aprovado','2026-11-04'),hoje),{chave:'vencendo',rotulo:'Vence em breve',tom:'alerta',emDia:true},'vence hoje: ainda válido');
 assert.equal(situacaoExame(exame('Aprovado','2026-11-03'),hoje).rotulo,'Vencido','validade passou');
 assert.deepEqual(situacaoExame(exame('Vencido','2026-01-01'),hoje),{chave:'vencido',rotulo:'Vencido',tom:'alerta',emDia:false},'API já manda Vencido');
 assert.equal(situacaoExame(exame('Aprovado','2026-12-01T00:00:00'),hoje).chave,'vencendo','data com hora');
 assert.equal(situacaoExame(exame('Reprovado'),hoje).tom,'alerta');
 assert.equal(situacaoExame(exame('Não se aplica'),hoje).emDia,true);
});

test('exames: resumo "N de 4 exames em dia" conta aprovados (inclusive vencendo) e não conta vencido nem pendente',()=>{
 const lista=[exame('Aprovado','2027-01-01','toxicologico'),exame('Aprovado','2026-11-20','oftalmologico'),exame('Vencido','2026-10-01','psicologico'),exame('Não informado','','medico')];
 assert.deepEqual(resumoExames(lista,hoje),{emDia:2,total:4,texto:'2 de 4 exames em dia'});
 assert.equal(resumoExames([],hoje).texto,'0 de 0 exames em dia');
});

test('provas: aguardando agendamento, agendada com data/hora/local, aprovada e reprovada com a próxima data',()=>{
 const t=(ordem,situacao,extra={})=>({id:'t'+ordem,ordem,data:'2026-11-20',situacao,resultado:['Aprovado','Reprovado','Cancelado'].includes(situacao)?situacao:null,...extra});
 assert.deepEqual(situacaoProva({tentativas:[]}),{estado:'pendente',situacao:'Aguardando agendamento',detalhe:''});
 assert.equal(situacaoProva({tentativas:[t(1,'Solicitado')]}).situacao,'Aguardando agendamento');
 assert.equal(situacaoProva({tentativas:[t(1,'Agendado')]}).situacao,'Agendada · 20/11');
 assert.deepEqual(situacaoProva({tentativas:[t(1,'Agendado',{hora:'08:30',local:'Detran Cariacica'})]}),{estado:'atual',situacao:'Agendada · 20/11 às 08:30 · Detran Cariacica',detalhe:''});
 assert.equal(situacaoProva({tentativas:[t(1,'Agendado',{data:'2026-11-20T14:00:00'})]}).situacao,'Agendada · 20/11 às 14:00');
 assert.deepEqual(situacaoProva({tentativas:[t(1,'Aprovado',{data:'2026-10-15'})]}),{estado:'feito',situacao:'Aprovado em 15/10',detalhe:''});
 assert.deepEqual(situacaoProva({tentativas:[t(1,'Reprovado')]}),{estado:'falhou',situacao:'Reprovado · 1ª tentativa',detalhe:''});
 const nova=situacaoProva({tentativas:[t(2,'Agendado',{data:'2027-01-10'}),t(1,'Reprovado',{data:'2026-12-15'})]});
 assert.deepEqual(nova,{estado:'falhou',situacao:'Reprovado · 1ª tentativa',detalhe:'Nova prova: 10/01'},'ordem das tentativas não importa');
 assert.equal(situacaoProva({tentativas:[t(1,'Reprovado'),t(2,'Reprovado'),t(3,'Aprovado',{data:'2027-02-01'})]}).situacao,'Aprovado em 01/02');
 assert.equal(situacaoProva({tentativas:[t(1,'Agendado'),t(2,'Cancelado')]}).situacao,'Agendada · 20/11','cancelada não conta');
 assert.equal(situacaoProva({tentativas:[t(1,'Cancelado')]}).situacao,'Aguardando agendamento');
 assert.equal(situacaoProva({tentativas:[t(1,'Agendado',{arquivada:true})]}).situacao,'Aguardando agendamento','arquivada (agendamento excluído) não conta');
 assert.equal(situacaoProva({tentativas:[t(1,'Reprovado'),t(2,'Agendado',{arquivada:true})]}).detalhe,'');
 assert.equal(diaMes('2026-01-05'),'05/01');assert.equal(diaMes(''),'');
});

test('etapas: Exames, teórica e prática de cada categoria; a primeira não concluída fica como atual',()=>{
 const exames=['toxicologico','oftalmologico','psicologico','medico'].map(tipo=>exame('Aprovado','2027-10-01',tipo));
 const provas=[{tipo:'teorica',nome:'Prova teórica',tentativas:[]},{tipo:'praticaCarro',nome:'Prova prática de carro — Categoria B',tentativas:[]},{tipo:'praticaOnibus',nome:'Prova prática de ônibus — Categoria D',tentativas:[]}];
 let e=etapasHabilitacao({exames,provas},hoje);
 assert.deepEqual(e.map(x=>x.titulo),['Exames','Prova teórica','Prática · Carro B','Prática · Ônibus D']);
 assert.deepEqual(e.map(x=>x.estado),['feito','atual','pendente','pendente']);
 assert.equal(e[0].situacao,'Em dia');assert.equal(e[1].situacao,'Aguardando agendamento');
 e=etapasHabilitacao({exames:[...exames.slice(0,3),exame('Não informado')],provas},hoje);
 assert.deepEqual([e[0].estado,e[0].situacao],['atual','3 de 4 em dia']);assert.equal(e[1].estado,'pendente');
 e=etapasHabilitacao({exames:[...exames.slice(0,3),exame('Vencido','2026-01-01')],provas},hoje);
 assert.equal(e[0].estado,'falhou');
 assert.deepEqual(etapasHabilitacao({exames:[],provas:[{tipo:'praticaMoto',tentativas:[]}]},hoje).map(x=>x.titulo),['Exames','Prática · Moto A']);
 assert.deepEqual(etapasHabilitacao(null,hoje).map(x=>x.tipo),['exames']);
});

test('contratar mais aulas: mesmo WhatsApp da antiga tela Pacotes adicionais e atalho para o pop-up',()=>{
 const u=new URL(LINK_CONTRATAR_AULAS);
 assert.equal(u.origin+u.pathname,'https://wa.me/55227998713181');
 assert.match(u.searchParams.get('text'),/^Olá! Sou aluno da autoescola/);
 assert.equal(ROTA_CONTRATAR_AULAS,'minhas-aulas.html#contratar');
});
