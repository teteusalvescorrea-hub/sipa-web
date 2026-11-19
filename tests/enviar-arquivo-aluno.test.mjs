import test from 'node:test';
import assert from 'node:assert/strict';
import {tiposDeArquivo} from '../nivel-1-operador/js/components/enviarArquivoAluno.js';

// 17/11/2026 (pedido do usuário): os tipos rápidos do "Enviar arquivo para o aluno", pelas categorias do aluno.
test('enviar arquivo: provas práticas só das categorias do aluno, com a mensagem pronta',()=>{
 const ab=tiposDeArquivo(['A','B']).map(t=>t.id);
 assert.deepEqual(ab,['teorica','pratica-B','pratica-A','resultado','ladv','contrato','outro']);
 const carro=tiposDeArquivo(['B']).find(t=>t.id==='pratica-B');
 assert.equal(carro.categoria,'5');
 assert.equal(carro.titulo,'Agendamento da prova prática de carro (B)');
 assert.match(carro.mensagem,/^ÓTIMA NOTÍCIA!/);
 assert.match(carro.mensagem,/prova prática de carro \(B\) foi agendada/);
 assert.match(carro.mensagem,/Meus documentos/);
 assert.equal(tiposDeArquivo(['D']).some(t=>t.id==='pratica-A'),false);
});
