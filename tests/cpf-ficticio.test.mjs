import test from 'node:test';
import assert from 'node:assert/strict';
import {criarPoliticaCpfLocal} from '../dev/operador/politicaCpf.js';
import {cpfValido,validarCadastroAluno,cadastrarAluno} from '../nivel-1-operador/js/dominioOperador.js';
import {editarCadastro} from '../nivel-1-operador/js/fichaOperador.js';
import {permissoesDoPerfil} from '../shared/js/permissoesAdministrativas.js';
const url='http://127.0.0.1:5500/nivel-1-operador/html/operador-cfc.html';
const op={id:'op',nivel:1,unidade:'Itaparica',permissoes:permissoesDoPerfil('operador')};
const dados={nome:'Aluno Ficticio Teste',cpf:'111.111.111-11',nascimento:'2000-01-01',telefone:'27999999999',email:'teste@example.invalid',tipoCambio:'manual',categoria:'B',unidadeCarro:'Itaparica',quantidadeCarro:'5',observacoes:'Teste local'};
test('politica de aluno: codigo, 11 digitos e producao oficial',()=>{
 let atual=url;const p=criarPoliticaCpfLocal(url,()=>atual);
 assert.equal(cpfValido('11111111111'),false);assert.equal(p.validar('11111111111'),true);assert.equal(p.configurar,undefined);
 for(const cpf of ['111.111.111-11','12345678901'])assert.equal(validarCadastroAluno({...dados,cpf},op,[],new Date(),p.validar).cpf,undefined);
 for(const cpf of ['','1234567890','123456789012','1234567890x1'])assert.ok(validarCadastroAluno({...dados,cpf},op,[],new Date(),p.validar).cpf);
 const oficial=criarPoliticaCpfLocal(url,()=>atual,false);assert.equal(oficial.validar('11111111111'),false);assert.equal(oficial.validar('52998224725'),true);
 for(const endereco of ['https://sipa.example/?demo=1&cpfFicticio=1','http://localhost/?ambiente=integrado&demo=1']){atual=endereco;assert.equal(p.validar('11111111111'),false);assert.equal(criarPoliticaCpfLocal(endereco,()=>endereco).validar('11111111111'),false);}
 assert.equal(criarPoliticaCpfLocal('http://localhost/?demo=1&cpfFicticio=1',()=>url,false).validar('11111111111'),false);
});
test('A/B/AB/D: cadastro e edicao compartilham politica sem ampliar permissoes',()=>{
 const p=criarPoliticaCpfLocal(url,()=>url),e={versao:2,alunos:[],recursos:[],aulas:[]};
 for(const categoria of ['A','B','AB','D']){
  const n=cadastrarAluno(e,op,{...dados,categoria,quantidadeMoto:'5',quantidadeOnibus:'5'},'s',new Date(),p.validar);
  assert.equal(n.alunos[0].cpf,'11111111111');assert.deepEqual(e.alunos,[]);
  assert.match(validarCadastroAluno(dados,op,n.alunos,new Date(),p.validar).cpf,/cadastrado/);
  assert.throws(()=>editarCadastro(n,op,'s',{cpf:'12345678901'},'h',new Date(),p.validar),/reservada/);
  for(const [nivel,perfil]of [[2,'gerencia'],[3,'master']]){
   const admin={...op,nivel,permissoes:permissoesDoPerfil(perfil)},antes=structuredClone(n),novo=editarCadastro(n,admin,'s',{cpf:'12345678901'},'h',new Date(),p.validar);
   assert.equal(novo.alunos[0].cpf,'12345678901');assert.deepEqual(n,antes);
   assert.throws(()=>editarCadastro(n,admin,'s',{cpf:'12345678901'},'h'),/CPF v.lido/);
   for(const cpf of ['','1234567890','123456789012','1234567890x1'])assert.throws(()=>editarCadastro(n,admin,'s',{cpf},'h',new Date(),p.validar),/11 d.gitos/);
   const duplicado={...n,alunos:[...n.alunos,{...n.alunos[0],id:'outro',cpf:'12345678901'}]};assert.throws(()=>editarCadastro(duplicado,admin,'s',{cpf:'12345678901'},'h',new Date(),p.validar),/cadastrado/);
  }
 }
});
