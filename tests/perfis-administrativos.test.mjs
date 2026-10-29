import test from 'node:test';
import assert from 'node:assert/strict';
import {painelPermitido} from '../dev/autenticacao.js';
test('conta real e painel efetivo seguem a hierarquia cumulativa sem misturar Aluno e Instrutor',()=>{
 const esperado={aluno:['aluno'],instrutor:['instrutor'],operador:['operador'],gerencia:['operador','gerencia'],master:['operador','gerencia','master']};
 for(const real of Object.keys(esperado))for(const painel of Object.keys(esperado))assert.equal(painelPermitido(real,painel),esperado[real].includes(painel),real+' -> '+painel);
});
test('perfis e paineis desconhecidos nunca concedem acesso',()=>{
 for(const valor of [undefined,null,'','admin4','Autoescola']){assert.equal(painelPermitido(valor,valor),false);assert.equal(painelPermitido('master',valor),false);}
});
