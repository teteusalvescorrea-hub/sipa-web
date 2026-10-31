import {formularioAdministrativo} from './formularioAdministrativo.js';
import {formatarCpf} from '../js/formatacao.js';
import {NOMES_PERFIL} from '../js/permissoesAdministrativas.js';
export function confirmarExclusao(raiz,servico,tipo,r,atualizar=()=>{}){
 const nome=r.nome||'Não informado',cpf=r.cpf||r.login,perfil=tipo==='conta'?NOMES_PERFIL[String(r.perfil).toLowerCase()]||r.perfil:tipo;
 return formularioAdministrativo(raiz,tipo==='conta'?'Excluir perfil':'Excluir cadastro',[['justificativa','Justificativa da exclusão','textarea','']],async dados=>{
  await servico.excluirCadastro({...dados,tipo,id:r.id});await atualizar();
 },{descricao:`Nome: ${nome}. ${cpf?'CPF: '+formatarCpf(cpf)+'. ':''}Perfil/tipo: ${perfil}. Deseja realmente excluir? Os acessos associados serão revogados. Registros com dependências serão preservados por exclusão lógica; registros sem dependências poderão ser excluídos definitivamente. Esta operação será auditada.`});
}
