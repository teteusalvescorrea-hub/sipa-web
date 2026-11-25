// 24/11/2026: o Administrador de Frotas usa o nível 3 nas telas de veículos (todas as unidades, como o Master), com o
// painel próprio (4) e só as capacidades dos veículos. O resto do painel não aparece e a API nega.
export const NIVEIS=Object.freeze({operador:1,gerencia:2,master:3,frota:3});
export const PAINEL_DO_PERFIL=Object.freeze({operador:1,gerencia:2,master:3,frota:4});
export const NOMES_PERFIL=Object.freeze({aluno:'Aluno',instrutor:'Instrutor',operador:'Recepção',gerencia:'Gerência',master:'Acesso Master',frota:'Administrador de Frotas'});
export const RECEPCAO=Object.freeze(['consultar','redefinir-senha-aluno','cadastrar','anotar','verificar','transferir','agendar','cancelar-prova','cadastrar-recurso','editar-cadastro','editar-instrutor','editar-veiculo','cancelar-aula','registrar-frequencia','antecipar','mensagens','responder-mensagem']);
export const GERENCIA=Object.freeze([...RECEPCAO,'editar-categoria','editar-prova','excluir-prova','decidir-atestado','relatorios','corrigir-registro','gerenciar-situacao','auditoria']);
export const MASTER=Object.freeze([...GERENCIA,'excluir-cadastro','gestao-acessos','gestao-global','gerir-permissoes','excecao-agenda','corrigir-decisao','configurar']);
// "consultar" aqui é ler os dados do próprio painel (só os veículos chegam; a API nega alunos e agendas).
export const FROTA=Object.freeze(['consultar','cadastrar-recurso','editar-veiculo','excluir-cadastro','gestao-global']);
export function permissoesDoPerfil(perfil,negadas=[]){const base=perfil==='master'?MASTER:perfil==='gerencia'?GERENCIA:perfil==='operador'?RECEPCAO:perfil==='frota'?FROTA:[];return base.filter(p=>!negadas.includes(p));}
export function escopoPermitido(op,unidade){return op?.nivel===3?(!op.unidadeConsulta||op.unidadeConsulta===unidade):!!op&&op.unidade===unidade;}
export function exigirCapacidade(op,acao,minimo=2){if(!op?.id||![1,2,3].includes(op.nivel)||op.nivel<minimo||!permissoesDoPerfil(Object.keys(NIVEIS).find(p=>NIVEIS[p]===op.nivel)).includes(acao)||!op.permissoes?.includes(acao))throw new Error('Permissão insuficiente para esta operação.');}
// 16/11/2026: a unidade escolhida no topo do painel numa chave só ("sipa.admin.unidade.atual"); apaga as chaves antigas
// por conta, que faziam a troca de unidade não valer. A chave da conta continua gravada para o modo local (dev).
export function guardarUnidadeEscolhida(valor,contaId){try{for(const k of Object.keys(sessionStorage))if(k.startsWith('sipa.admin.unidade.'))sessionStorage.removeItem(k);sessionStorage.setItem('sipa.admin.unidade.atual',valor||'');if(contaId)sessionStorage.setItem('sipa.admin.unidade.'+contaId,valor||'');}catch{}}
