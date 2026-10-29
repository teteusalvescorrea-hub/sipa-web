import {el,botao,modal} from '../../nivel-1-operador/js/components/uiOperador.js';
import {apresentarHistoricoAcessos} from '../js/historicoAcessos.js';
export function montarHistoricoAcessos(root,eventos,registros){
 const host=el('article',undefined,'op-card adm-access-history');host.append(el('h2','Histórico de acessos administrativos'));const tabela=el('table',undefined,'op-table'),thead=el('thead'),cabecalho=el('tr'),corpo=el('tbody'),titulos=['Data e hora','Responsável','Operação','Conta afetada','Justificativa','Detalhes'];for(const t of titulos){const th=el('th',t);th.scope='col';cabecalho.append(th);}thead.append(cabecalho);
 for(const h of apresentarHistoricoAcessos(eventos,registros)){
  const tr=el('tr'),abrir=botao('Ver detalhes',()=>{const d=modal(root,'Detalhes do acesso administrativo','historicoAcesso'),dl=el('dl',undefined,'adm-access-fields');for(const [nome,valor] of [['Data e horário',h.data],['Responsável',h.responsavel],['Perfil do responsável',h.perfilResponsavel],['Operação realizada',h.operacao],['Conta afetada',h.conta],['Perfil da conta afetada',h.perfilConta],['Unidade vinculada',h.unidade],['Justificativa',h.justificativa],['Resultado',h.resultado]]){const linha=el('div');linha.append(el('dt',nome),el('dd',valor));dl.append(linha);}d.append(dl);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();});
  [h.data,h.responsavel,el('span',h.operacao,'op-badge'),h.conta,h.justificativa,abrir].forEach((v,i)=>{const td=el('td');td.dataset.label=titulos[i];td.append(v instanceof Node?v:document.createTextNode(v));tr.append(td);});corpo.append(tr);
 }
 if(!eventos.length){const td=el('td','Nenhuma operação registrada.');td.colSpan=6;const tr=el('tr');tr.append(td);corpo.append(tr);}tabela.append(thead,corpo);host.append(tabela);return host;
}
