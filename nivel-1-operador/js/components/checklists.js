// Fase 4 (6.1): o histórico dos checklists (por veículo ou por instrutor) e os alertas para a Gerência.
import {el,botao} from './uiOperador.js';
import {formatarData} from '../../../shared/js/calendario.js';

const COMBUSTIVEL={1:'Reserva',2:'1/4',3:'1/2',4:'3/4',5:'Cheio'};
// 10/11/2026: o checklist do fim do dia (momento 2) não confere os itens (vêm nulos); só o defeito.
export const fimDoDia=c=>c?.momento===2;
export function problemas(c){return [['pneusOk','Pneus'],['oleoOk','Óleo'],['iluminacaoOk','Iluminação'],['limpezaOk','Limpeza']].filter(([k])=>c[k]===false).map(([,n])=>n+': precisa de manutenção').concat(c.semAvarias===false?[fimDoDia(c)?'Com defeito':'Com avarias']:[]);}

export function listaChecklists(servico,filtro,{titulo='Checklists',vazio='Nenhum checklist no período.'}={}){
 const secao=el('section',undefined,'op-resource-section op-checklists');secao.dataset.opChecklists='';const corpo=el('div');secao.append(el('h3',titulo),corpo);
 (async()=>{try{const lista=await servico.checklists(filtro);if(!lista.length){corpo.replaceChildren(el('p',vazio,'op-help'));return;}
  const ol=el('ol',undefined,'op-summary-list');
  for(const c of lista.slice(0,15)){const li=el('li');li.dataset.opChecklist=c.id;const p=problemas(c);
   li.append(el('strong',formatarData(String(c.data).slice(0,10))+(fimDoDia(c)?' · fim do dia':'')+' · '+(c.veiculo||'')+' · '+(c.instrutor||'')),el('span',' · '+Number(c.km).toLocaleString('pt-BR')+' km · combustível '+(COMBUSTIVEL[c.combustivel]||'')),el('span',p.length?' · '+p.join(', '):' · tudo OK',p.length?'op-checklist-alerta':''));
   if(c.observacoes)li.append(el('p',c.observacoes,'op-help'));
   for(const [i,doc] of (c.fotos||[]).entries())li.append(botao('Foto '+(i+1),async()=>{try{const b=await servico.fotoChecklist(c.id,doc);window.open(URL.createObjectURL(b),'_blank','noopener');}catch(e){alert(e.message);}},'op-link'));
   ol.append(li);}
  corpo.replaceChildren(ol);}catch(e){corpo.replaceChildren(el('p',e.message,'op-help'));}})();
 return secao;
}

// Os alertas dos últimos 7 dias, para a Gerência e o Master.
export function cartaoAlertasChecklist(servico){
 const card=el('section',undefined,'op-card');card.dataset.opAlertasChecklist='';
 const hoje=new Date(),de=new Date(hoje.getTime()-7*864e5).toISOString().slice(0,10);
 card.append(listaChecklists(servico,{alertas:true,de},{titulo:'Alertas de checklist (últimos 7 dias)',vazio:'Nenhum item precisando de manutenção.'}));
 return card;
}
