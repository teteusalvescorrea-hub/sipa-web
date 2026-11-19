// Fase 2: status do veículo (Ativo, Reserva, Manutenção preventiva ou reativa), a manutenção aberta com a contagem
// regressiva e o andamento, a preventiva por tempo e por KM e o histórico. Só a Gerência e o Master alteram; a API confere.
import {el,botao,campo,entrada,select,modal} from './uiOperador.js';
import {confirmarAcao,avisarErro} from '../../../shared/components/confirmarAcao.js';
import {formatarData,hojeBrasil,dataBrasilia,horaBrasilia} from '../../../shared/js/calendario.js';
import {listaChecklists} from './checklists.js';

export const STATUS_VEICULO=Object.freeze([['1','Ativo'],['2','Reserva'],['3','Manutenção preventiva'],['4','Manutenção reativa']]);
const data=d=>d?formatarData(String(d).slice(0,10)):'Não informada';
const quando=d=>d?dataBrasilia(d)+' às '+horaBrasilia(d):'';
const km=v=>v==null?'—':Number(v).toLocaleString('pt-BR')+' km';

// 4.2: o tempo até a previsão (ou desde ela, quando passou), em dias e horas, pelas datas gravadas.
export function tempoAte(iso,agora=new Date()){if(!iso)return '';const alvo=new Date(String(iso).length<=10?iso+'T23:59:00':iso);if(isNaN(alvo))return '';const min=Math.round((alvo-agora)/6e4),abs=Math.abs(min),d=Math.floor(abs/1440),h=Math.floor(abs%1440/60),m=abs%60;const txt=d?d+(d===1?' dia':' dias')+(h?' e '+h+' h':''):h?h+' h'+(m?' '+m+' min':''):m+' min';return min>=0?'faltam '+txt:'vencida há '+txt;}
const dataHora=iso=>iso?formatarData(String(iso).slice(0,10))+' '+String(iso).slice(11,16):'';

// 4.2: o painel das manutenções da frota (Gerência e Master): abertas, programadas e, a pedido, as concluídas.
export function cartaoManutencoes(servico){
 const card=el('section',undefined,'op-card');card.dataset.opManutencoes='';const corpo=el('div');let concluidas=false;
 const alternar=botao('Mostrar concluídas (90 dias)',()=>{concluidas=!concluidas;alternar.textContent=concluidas?'Ocultar concluídas':'Mostrar concluídas (90 dias)';carregar();},'op-link');alternar.dataset.opManutencoesConcluidas='';
 card.append(el('h2','Manutenções da frota'),alternar,corpo);
 async function carregar(){
  corpo.replaceChildren(el('p','Carregando…','op-help'));
  let lista;try{lista=await servico.painelManutencoes({incluirConcluidas:concluidas});}catch(e){corpo.replaceChildren(el('p',e.message,'op-help'));return;}
  if(!lista.length){corpo.replaceChildren(el('p','Nenhuma manutenção em aberto ou programada.','op-help'));return;}
  const t=el('table',undefined,'op-table'),cab=el('tr'),tb=el('tbody');for(const h of ['Veículo','Unidade','Status','Tipo','Motivo','Início','Previsão','Tempo','Situação'])cab.append(el('th',h));
  for(const m of lista){const tr=el('tr');tr.dataset.opManutencao=m.programacaoId||m.veiculoId;
   const tempo=m.situacao==='Concluída'?'Concluída em '+dataHora(m.concluidaEm):m.situacao==='Programada'?'começa: '+tempoAte(m.inicio).replace('faltam ','em '):tempoAte(m.previsao);
   for(const v of [m.veiculo,m.unidade||'',m.statusVeiculo?.descricao||'',m.tipo,m.motivo,dataHora(m.inicio),m.previsao?dataHora(m.previsao):'Sem previsão',tempo,m.vencida?'Prazo vencido':m.situacao])tr.append(el('td',v));
   if(m.vencida)tr.dataset.opManutencaoVencida='';tb.append(tr);}
  const head=el('thead');head.append(cab);t.append(head,tb);corpo.replaceChildren(t);
 }
 carregar();return card;
}

export function contagem(dias){if(dias==null)return '';if(dias>1)return 'faltam '+dias+' dias';if(dias===1)return 'falta 1 dia';if(dias===0)return 'previsão para hoje';return 'atrasada '+Math.abs(dias)+(Math.abs(dias)===1?' dia':' dias');}

function formulario(raiz,titulo,campos,enviar){
 const d=modal(raiz,titulo,'opFrota'),f=el('form',undefined,'op-form-fields'),erro=el('p');erro.setAttribute('role','alert');
 const salvar=el('button','Salvar','op-button op-button-primary');salvar.type='submit';
 for(const [rotulo,controle] of campos)f.append(campo(rotulo,controle));f.append(erro,salvar);d.append(f);
 f.onsubmit=async e=>{e.preventDefault();if(!f.reportValidity())return;salvar.disabled=true;try{await enviar();d.close();}catch(x){erro.textContent=x.message;}finally{salvar.disabled=false;}};
 d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
}

export function montarFrotaVeiculo(dialogo,acoes,r,{raiz,servico,podeAlterar,aoAtualizar,aoRealocar}){
 const corpo=dialogo.querySelector('.op-resource-content'),secao=el('section',undefined,'op-resource-section op-frota');secao.dataset.opFrota='';
 const status=r.statusVeiculo||'Ativo',m=r.manutencao,p=r.preventiva;
 secao.append(el('h3','Status e manutenção'));
 const linhas=el('dl',undefined,'op-resource-fields');const linha=(t,v)=>{const div=el('div');div.append(el('dt',t),el('dd',v));linhas.append(div);};
 linha('Status',status);
 if(m){linha('Manutenção',m.tipo+' · '+m.descricao);linha('Iniciada em',quando(m.iniciadaEm));linha('Previsão de conclusão',m.previsao?data(m.previsao)+' · '+contagem(m.diasRestantes):'Sem previsão');}
 if(p){linha('Preventiva','A cada '+[p.dias?p.dias+' dias':'',p.km?km(p.km):''].filter(Boolean).join(' ou '));linha('Última preventiva',[p.ultimaEm?data(p.ultimaEm):'',p.ultimaKm!=null?km(p.ultimaKm):''].filter(Boolean).join(' · ')||'Não informada');linha('Próxima preventiva',[p.proximaEm?data(p.proximaEm):'',p.proximaKm!=null?km(p.proximaKm):''].filter(Boolean).join(' ou ')||'Não calculada');linha('KM atual',km(p.kmAtual));}
 secao.append(linhas);
 if(p?.proxima){const aviso=el('p','Preventiva próxima: agende a manutenção.','op-inline-note');aviso.dataset.opPreventivaProxima='';aviso.setAttribute('role','status');secao.append(aviso);}
 if(m?.andamentos?.length){const lista=el('ol',undefined,'op-summary-list');for(const a of m.andamentos)lista.append(el('li',quando(a.em)+(a.autor?' · '+a.autor:'')+' · '+a.texto));secao.append(el('h4','Andamento'),lista);}
 const historico=el('div');const verHistorico=botao('Ver histórico de manutenções',async()=>{verHistorico.disabled=true;try{const lista=await servico.manutencoes(r.id);historico.replaceChildren(lista.length?(()=>{const ol=el('ol',undefined,'op-summary-list');for(const h of lista)ol.append(el('li',descricaoEnum(h.tipo)+' · '+h.descricao+' · iniciada '+quando(h.iniciadaEm)+(h.concluidaEm?' · concluída '+quando(h.concluidaEm):' · em aberto')+(h.andamentos?.length?' · '+h.andamentos.length+' andamento(s)':'')));return ol;})():el('p','Nenhuma manutenção registrada.','op-help'));}catch(e){historico.replaceChildren(el('p',e.message));}},'op-link');verHistorico.dataset.opHistoricoManutencao='';
 secao.append(verHistorico,historico);
 // 4.2: as preventivas programadas deste veículo (a janela some da agenda; a Gerência pode cancelar).
 if(servico.painelManutencoes){const programadas=el('div');programadas.dataset.opProgramadas='';secao.append(programadas);
  servico.painelManutencoes({veiculoId:r.id}).then(lista=>{const p=lista.filter(m=>m.programacaoId);if(!p.length)return;const ol=el('ol',undefined,'op-summary-list');
   for(const m of p){const li=el('li',dataHora(m.inicio)+' até '+dataHora(m.previsao)+' · '+m.motivo+' · '+(m.situacao==='Programada'?'programada':'em andamento'));
    if(podeAlterar){const c=botao('Cancelar',async()=>{if(!await confirmarAcao('Cancelar esta manutenção programada? O veículo volta à agenda nesse período.',{titulo:'Cancelar manutenção',confirmar:'Cancelar manutenção',perigo:true}))return;c.disabled=true;try{await servico.cancelarProgramada(r.id,m.programacaoId);await aoAtualizar('Manutenção programada cancelada.');}catch(e){avisarErro(e.message);c.disabled=false;}},'op-link');c.dataset.opCancelarProgramada=m.programacaoId;li.append(' ',c);}
    ol.append(li);}
   programadas.replaceChildren(el('h4','Preventivas programadas'),ol);}).catch(()=>{});}
 corpo.append(secao);
 if(servico.checklists)corpo.append(listaChecklists(servico,{veiculoId:r.id},{titulo:'Checklists do veículo (últimos 30 dias)'}));
 if(podeAlterar){
  const alterar=botao('Alterar status',()=>{const s=select(STATUS_VEICULO,String(STATUS_VEICULO.find(([,n])=>n===status)?.[0]||'1')),motivo=el('textarea'),previsao=entrada('date',m?.previsao||''),kmAtual=entrada('number',p?.kmAtual??'');motivo.rows=2;motivo.maxLength=500;motivo.required=true;motivo.minLength=5;previsao.min=hojeBrasil();kmAtual.min='0';
   const ajustar=()=>{previsao.required=s.value==='4';};s.addEventListener('change',ajustar);ajustar();
   formulario(raiz,'Alterar status do veículo',[['Status',s],['Motivo',motivo],['Previsão de conclusão (obrigatória na manutenção reativa)',previsao],['KM atual (opcional)',kmAtual]],async()=>{await servico.alterarStatusVeiculo(r.id,{status:s.value,descricao:motivo.value,previsao:previsao.value,km:kmAtual.value});await aoAtualizar('Status do veículo atualizado.');});});
  alterar.dataset.opAlterarStatus='';acoes.append(alterar);
  if(m){const andamento=botao('Registrar andamento',()=>{const texto=el('textarea'),previsao=entrada('date',m.previsao||'');texto.rows=2;texto.maxLength=1000;texto.required=true;texto.minLength=3;previsao.min=hojeBrasil();
   formulario(raiz,'Andamento da manutenção',[['O que foi feito ou mudou',texto],['Nova previsão (opcional)',previsao]],async()=>{await servico.registrarAndamento(r.id,{texto:texto.value,previsao:previsao.value!==m.previsao?previsao.value:''});await aoAtualizar('Andamento registrado.');});});andamento.dataset.opRegistrarAndamento='';acoes.append(andamento);}
  const preventiva=botao('Configurar preventiva',()=>{const dias=entrada('number',p?.dias??''),kmP=entrada('number',p?.km??''),ultimaEm=entrada('date',p?.ultimaEm||''),ultimaKm=entrada('number',p?.ultimaKm??''),kmAtual=entrada('number',p?.kmAtual??'');for(const c of [dias,kmP,ultimaKm,kmAtual])c.min='0';ultimaEm.max=hojeBrasil();
   formulario(raiz,'Manutenção preventiva',[['A cada (dias)',dias],['A cada (km)',kmP],['Última preventiva em',ultimaEm],['KM na última preventiva',ultimaKm],['KM atual',kmAtual]],async()=>{await servico.configurarPreventiva(r.id,{dias:dias.value,km:kmP.value,ultimaEm:ultimaEm.value,ultimaKm:ultimaKm.value,kmAtual:kmAtual.value});await aoAtualizar('Preventiva configurada.');});});
  preventiva.dataset.opConfigurarPreventiva='';acoes.append(preventiva);
  if(servico.programarPreventiva){const programar=botao('Programar preventiva',()=>{const inicio=entrada('datetime-local',''),fim=entrada('datetime-local',''),motivo=el('textarea');inicio.required=fim.required=motivo.required=true;motivo.rows=2;motivo.minLength=5;motivo.maxLength=500;inicio.min=hojeBrasil()+'T00:00';
   inicio.addEventListener('change',()=>{fim.min=inicio.value;});
   formulario(raiz,'Programar manutenção preventiva',[['Início (data e hora)',inicio],['Fim previsto (data e hora)',fim],['Motivo e observações',motivo]],async()=>{await servico.programarPreventiva(r.id,{inicio:inicio.value,fim:fim.value,motivo:motivo.value});await aoAtualizar('Manutenção preventiva programada. O veículo sai da agenda só nesse período.');});});
   programar.dataset.opProgramarPreventiva='';acoes.append(programar);}
 }
 if(aoRealocar){const realocar=botao('Realocar alunos',()=>aoRealocar(r));realocar.dataset.opRealocar='';acoes.append(realocar);}
}
const descricaoEnum=v=>v?.descricao??String(v??'');
