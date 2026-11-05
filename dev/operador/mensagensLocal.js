// Conversa com o aluno na demonstração: só existe com a API. A seção Mensagens abre com a lista vazia.
import {exigirCapacidade} from '../../shared/js/permissoesAdministrativas.js';
const indisponivel=async()=>{throw new Error('Mensagens disponíveis só no ambiente integrado.');};
export function mensagensLocal(op){
 return {
  async conversas(){exigirCapacidade(op,'mensagens',1);return {itens:[],total:0};},
  async totalMensagensNaoLidas(){return 0;},
  conversa:indisponivel,marcarConversaLida:indisponivel,enviarMensagemConversa:indisponivel,enviarMensagemAluno:indisponivel
 };
}
