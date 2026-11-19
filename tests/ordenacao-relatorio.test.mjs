import test from 'node:test';
import assert from 'node:assert/strict';
import {ordenarRelatorio} from '../shared/js/apresentacaoRelatorios.js';

const relatorio={colunas:['Data','Aluno','Aulas'],filtros:{tipo:'aulas'},linhas:[['2026-11-10','Bruno',2],['2026-11-09','Ana',10],['2026-11-11','Carla',1]]};

test('ordena as linhas originais pelo texto exibido, em data, texto e número',()=>{
 assert.deepEqual(ordenarRelatorio(relatorio,{coluna:0,direcao:1}).linhas.map(l=>l[1]),['Ana','Bruno','Carla']);
 assert.deepEqual(ordenarRelatorio(relatorio,{coluna:1,direcao:-1}).linhas.map(l=>l[1]),['Carla','Bruno','Ana']);
 assert.deepEqual(ordenarRelatorio(relatorio,{coluna:2,direcao:1}).linhas.map(l=>l[2]),[1,2,10]);
});

test('sem coluna mantém a ordem do relatório e não altera o original',()=>{
 assert.equal(ordenarRelatorio(relatorio,{coluna:null}),relatorio);
 ordenarRelatorio(relatorio,{coluna:1,direcao:1});
 assert.equal(relatorio.linhas[0][1],'Bruno');
});
