import {formularioAdministrativo} from './formularioAdministrativo.js';
import {formatarCpf} from '../js/formatacao.js';
import {NOMES_PERFIL} from '../js/permissoesAdministrativas.js';
export function confirmarExclusao(raiz,servico,tipo,r,atualizar=()=>{}){
 const nome=r.nome||'Não informado',cpf=r.cpf||(/^[0-9. -]+$/.test(String(r.login||''))?r.login:''),email=!cpf&&String(r.login||'').includes('@')?r.login:'',perfil=tipo==='conta'?NOMES_PERFIL[String(r.perfil).toLowerCase()]||r.perfil:({aluno:'Aluno',instrutor:'Instrutor'})[tipo]||tipo;
 return formularioAdministrativo(raiz,tipo==='conta'?'Excluir perfil':'Excluir cadastro',[['justificativa','Justificativa da exclusão','textarea','']],async dados=>{
  await servico.excluirCadastro({...dados,tipo,id:r.id});await atualizar();
 },{descricao:`Nome: ${nome}. ${cpf?'CPF: '+formatarCpf(cpf)+'. ':email?'Login: '+email+'. ':''}Perfil/tipo: ${perfil}. Deseja realmente excluir? Os acessos associados serão revogados. Registros com dependências serão preservados por exclusão lógica; registros sem dependências poderão ser excluídos definitivamente. Esta operação será auditada.`});
}
