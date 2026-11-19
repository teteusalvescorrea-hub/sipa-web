import test from 'node:test';
import assert from 'node:assert/strict';
import {locaisDoAluno,REGRAS,htmlDoPdf} from '../aluno/js/components/informacoesImportantes.js';

// 17/11/2026 (pedido do usuário): onde são as aulas de cada aluno, pela unidade e pelas categorias.
test('informações importantes: carro pela unidade (com os dias em outra KM), moto no Centro e ônibus em Cobilândia',()=>{
 const santaRita=locaisDoAluno({unidade:'Unidade Santa Rita',categorias:['B']});
 assert.equal(santaRita.length,1);
 const textos=santaRita[0].itens.map(i=>i.texto);
 assert.deepEqual(textos,['Aulas de carro na KM de Santa Rita.','Segunda-feira: as aulas são na KM de Itaparica.']);
 assert.match(santaRita[0].itens[0].referencia,/Mineirão/);
 assert.match(santaRita[0].itens[1].referencia,/DFrango/);

 const terra=locaisDoAluno({unidade:'Unidade Terra Vermelha',categorias:['B']})[0].itens.map(i=>i.texto);
 assert.equal(terra[1],'Terça-feira: as aulas são na KM Centro.');
 const cobi=locaisDoAluno({unidade:'Unidade Cobilândia',categorias:['B']})[0].itens.map(i=>i.texto);
 assert.equal(cobi[1],'Quinta-feira: as aulas são na KM Centro.');
 const nm=locaisDoAluno({unidade:'Unidade Novo Milênio',categorias:['B']})[0].itens.map(i=>i.texto);
 assert.deepEqual(nm,['Todas as aulas de carro são na KM Centro.']);
 const centro=locaisDoAluno({unidade:'Unidade Centro de Vila Velha',categorias:['B']})[0].itens.map(i=>i.texto);
 assert.deepEqual(centro,['Aulas de carro na KM Centro.']);

 const todas=locaisDoAluno({unidade:'Unidade Itaparica',categorias:['A','B','D']});
 assert.deepEqual(todas.map(b=>b.categoria),['B','A','D']);
 assert.equal(todas[1].itens[0].texto,'Todas as aulas de moto são na KM Centro.');
 assert.deepEqual(todas[2].itens.map(i=>i.texto),['Segunda a sexta: na KM Cobilândia.','Sábados: na Arena Tartarugão.']);
});

test('informações importantes: regras da autoescola e o PDF com o nome do aluno',()=>{
 const tudo=REGRAS.flatMap(r=>r.itens).join(' ');
 for(const trecho of ['sapatilha','48 horas úteis','chuva','10 minutos','últimas aulas','responsável maior de idade','LADV'])assert.ok(tudo.includes(trecho),trecho);
 const html=htmlDoPdf({nome:'Aluno <Teste>',unidade:'Unidade Santa Rita',categorias:['B']});
 assert.match(html,/Informações importantes/);
 assert.match(html,/Aluno &lt;Teste&gt;/);
 assert.match(html,/KM de Itaparica/);
 assert.match(html,/window\.print/);
});
