// Antecipação na demonstração: o fluxo de interesses só existe com a API. A seção continua abrindo, com a lista vazia.
import {exigirCapacidade} from '../../shared/js/permissoesAdministrativas.js';
const indisponivel=async()=>{throw new Error('Antecipação disponível só no ambiente integrado.');};
export function antecipacaoLocal(op){
 return {
  async consultarLiberados(){exigirCapacidade(op,'antecipar',1);return [];},
  async totalLiberados(){return 0;},
  marcarContatado:indisponivel,remarcarInteresse:indisponivel,descartarInteresse:indisponivel
 };
}
