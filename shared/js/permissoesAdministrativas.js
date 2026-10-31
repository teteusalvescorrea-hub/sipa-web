export const NIVEIS=Object.freeze({operador:1,gerencia:2,master:3});
export const NOMES_PERFIL=Object.freeze({aluno:'Aluno',instrutor:'Instrutor',operador:'Recepção',gerencia:'Gerência',master:'Acesso Master'});
export const RECEPCAO=Object.freeze(['consultar','redefinir-senha-aluno','cadastrar','anotar','verificar','transferir','agendar','cancelar-prova','cadastrar-recurso','editar-instrutor','editar-veiculo','cancelar-aula','registrar-frequencia','antecipar']);
export const GERENCIA=Object.freeze([...RECEPCAO,'editar-cadastro','editar-categoria','editar-prova','excluir-prova','decidir-atestado','relatorios','corrigir-registro','gerenciar-situacao']);
export const MASTER=Object.freeze([...GERENCIA,'excluir-cadastro','gestao-acessos','gestao-global','gerir-permissoes','excecao-agenda','corrigir-decisao','auditoria','configurar']);
export function permissoesDoPerfil(perfil,negadas=[]){const base=perfil==='master'?MASTER:perfil==='gerencia'?GERENCIA:perfil==='operador'?RECEPCAO:[];return base.filter(p=>!negadas.includes(p));}
export function escopoPermitido(op,unidade){return op?.nivel===3?(!op.unidadeConsulta||op.unidadeConsulta===unidade):!!op&&op.unidade===unidade;}
export function exigirCapacidade(op,acao,minimo=2){if(!op?.id||![1,2,3].includes(op.nivel)||op.nivel<minimo||!permissoesDoPerfil(Object.keys(NIVEIS).find(p=>NIVEIS[p]===op.nivel)).includes(acao)||!op.permissoes?.includes(acao))throw new Error('Permissão insuficiente para esta operação.');}
