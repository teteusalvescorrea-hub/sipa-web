import {el} from '../../nivel-1-operador/js/components/uiOperador.js';
import {historicoMedicoParaExibicao} from '../js/solicitacoesMedicas.js';
export function montarHistoricoMedico(s,contexto){
 const secao=el('section',undefined,'adm-medical-history'),lista=el('ol');
 secao.append(el('h3','Histórico da solicitação'),lista);
 for(const evento of historicoMedicoParaExibicao(s,contexto)){
  const item=el('li'),cabecalho=el('div',undefined,'adm-medical-event-heading');
  cabecalho.append(el('time',evento.data),el('strong',evento.responsavel));
  const dl=el('dl');for(const [titulo,valor] of [['Situação anterior',evento.anterior],['Nova situação',evento.novo],['Observação',evento.observacao||'Sem observações adicionais.']]){const linha=el('div');linha.append(el('dt',titulo),el('dd',valor));dl.append(linha);}
  item.append(cabecalho,dl);lista.append(item);
 }
 if(!lista.children.length)secao.append(el('p','Nenhuma movimentação registrada.'));
 return secao;
}
