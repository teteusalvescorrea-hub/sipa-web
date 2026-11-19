// 09/11/2026: Auditoria do Master — acompanhamento dos veículos. Junta o que a API já registra: o KM de cada checklist
// (histórico de quilometragem), as observações dos instrutores, os itens com problema no checklist (pneus, óleo,
// iluminação, limpeza, avarias = desgaste ou troca), a preventiva (próxima por data e por KM) e as manutenções.
import {el,botao,select,modal,card} from '../../nivel-1-operador/js/components/uiOperador.js';

const ITENS=[['pneusOk','Pneus'],['oleoOk','Óleo'],['iluminacaoOk','Iluminação'],['limpezaOk','Limpeza'],['semAvarias','Avarias']];
const PERIODOS=[['7','Últimos 7 dias'],['30','Últimos 30 dias'],['90','Últimos 90 dias']];
const fmtKm=n=>n==null||!Number.isFinite(Number(n))?'—':Number(n).toLocaleString('pt-BR')+' km';
const fmtData=iso=>{if(!iso)return '—';const t=String(iso);const d=new Date(t.length<=10?t+'T12:00:00':t);return Number.isNaN(d.getTime())?'—':d.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});};
const hojeIso=()=>new Date().toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'});
const menosDias=(iso,n)=>{const d=new Date(iso+'T12:00:00');d.setDate(d.getDate()-n);return d.toISOString().slice(0,10);};
const diasAte=iso=>{if(!iso)return null;const d=new Date(String(iso).slice(0,10)+'T12:00:00'),h=new Date(hojeIso()+'T12:00:00');return Math.round((d-h)/864e5);};
const problemas=c=>ITENS.filter(([k])=>c&&c[k]===false).map(([,n])=>n);
// 10/11/2026: a situação mais recente de cada item (o checklist do fim do dia não confere pneus, óleo, iluminação e
// limpeza; esses itens vêm nulos e não apagam o problema anotado no início do dia).
const problemasAtuais=lista=>ITENS.filter(([k])=>lista.find(c=>c[k]!=null)?.[k]===false).map(([,n])=>n);
const momento=c=>c?.momento===2?' · fim do dia':'';

// O retrato de cada veículo no período.
export function analisarVeiculo(v,checklists,manutencoes=[]){
 const doVeiculo=checklists.filter(c=>c.veiculoId===v.id).sort((a,b)=>String(b.criadoEm||b.data).localeCompare(String(a.criadoEm||a.data)));
 const ultimo=doVeiculo[0]||null,kms=doVeiculo.map(c=>Number(c.km)).filter(Number.isFinite);
 const p=v.preventiva||null,kmAtual=Math.max(...[...kms,Number(p?.kmAtual)].filter(Number.isFinite),-Infinity);
 const km=Number.isFinite(kmAtual)?kmAtual:null,rodou=kms.length>1?Math.max(...kms)-Math.min(...kms):null;
 const observacoes=doVeiculo.filter(c=>String(c.observacoes||'').trim());
 const itensRuins=problemasAtuais(doVeiculo);
 const faltaKm=p?.proximaKm!=null&&km!=null?Number(p.proximaKm)-km:null,faltaDias=diasAte(p?.proximaEm);
 const motivos=[];
 if(itensRuins.length)motivos.push({nivel:'alto',texto:'Checklist com problema: '+itensRuins.join(', ')});
 if(faltaKm!=null&&faltaKm<=0)motivos.push({nivel:'alto',texto:'Preventiva vencida por KM ('+fmtKm(-faltaKm)+' além)'});
 else if(faltaKm!=null&&faltaKm<=1000)motivos.push({nivel:'medio',texto:'Preventiva em '+fmtKm(faltaKm)});
 if(faltaDias!=null&&faltaDias<0)motivos.push({nivel:'alto',texto:'Preventiva vencida em '+fmtData(p.proximaEm)});
 else if(faltaDias!=null&&faltaDias<=15)motivos.push({nivel:'medio',texto:'Preventiva em '+(faltaDias===0?'hoje':faltaDias+(faltaDias===1?' dia':' dias'))});
 else if(p?.proxima&&!motivos.some(m=>m.texto.startsWith('Preventiva')))motivos.push({nivel:'medio',texto:'Preventiva próxima'});
 const status=v.statusVeiculo||'Ativo';
 if(/reativa/i.test(status))motivos.push({nivel:'alto',texto:'Em manutenção reativa'+(v.manutencao?.descricao?': '+v.manutencao.descricao:'')});
 else if(/preventiva/i.test(status))motivos.push({nivel:'medio',texto:'Em manutenção preventiva'});
 const atrasada=manutencoes.find(m=>m.veiculoId===v.id&&(m.vencida||/atrasad/i.test(m.situacao||'')));
 if(atrasada)motivos.push({nivel:'alto',texto:'Manutenção com prazo vencido'});
 if(observacoes.length)motivos.push({nivel:'baixo',texto:observacoes.length===1?'1 observação no período':observacoes.length+' observações no período'});
 if(!doVeiculo.length&&status==='Ativo')motivos.push({nivel:'baixo',texto:'Sem checklist no período'});
 return {v,checklists:doVeiculo,ultimo,km,rodou,observacoes,itensRuins,faltaKm,faltaDias,motivos,status,
  nivel:motivos.some(m=>m.nivel==='alto')?3:motivos.some(m=>m.nivel==='medio')?2:motivos.length?1:0};
}

export async function montarAuditoriaVeiculos(host,servico,{veiculos,unidades=[],raiz=document.body}){
 const lista=()=>(typeof veiculos==='function'?veiculos():veiculos)||[];
 const nomeUnidade=id=>unidades.find(u=>u.id===id)?.nome||String(id||'').replace(/^Unidade /,'')||'—';
 const periodo=select(PERIODOS,'30'),unidade=select([['','Todas as unidades'],...[...new Set(lista().map(v=>v.unidade).filter(Boolean))].map(u=>[u,nomeUnidade(u)])]),
  veiculo=select([['','Todos os veículos'],...lista().map(v=>[v.id,[v.placa,v.modelo].filter(Boolean).join(' · ')])]),atualizar=botao('Atualizar',()=>carregar(),'op-button op-button-primary');
 const rotulado=(t,c)=>{const l=el('label',undefined,'adm-veic-filtro');l.append(el('span',t),c);return l;};
 const filtros=el('div',undefined,'adm-veic-filtros');filtros.append(rotulado('Período',periodo),rotulado('Unidade',unidade),rotulado('Veículo',veiculo),atualizar);
 const corpo=el('div',undefined,'adm-veic-corpo');corpo.append(el('p','Carregando os veículos…','adm-veic-vazio'));
 host.replaceChildren(card('Acompanhamento dos veículos',el('p','Quilometragem, observações dos instrutores, desgaste e o que precisa trocar, a partir dos checklists, das preventivas e das manutenções.','adm-veic-ajuda'),filtros,corpo));
 for(const s of [periodo,unidade,veiculo])s.addEventListener('change',()=>carregar());

 let dados=null;
 async function carregar(){
  atualizar.disabled=true;corpo.setAttribute('aria-busy','true');
  try{
   const ate=hojeIso(),de=menosDias(ate,Number(periodo.value)||30);
   const [checklists,manutencoes]=await Promise.all([servico.checklists?servico.checklists({de,ate}).catch(()=>[]):[],servico.painelManutencoes?servico.painelManutencoes({}).catch(()=>[]):[]]);
   const escolhidos=lista().filter(v=>(!unidade.value||v.unidade===unidade.value)&&(!veiculo.value||v.id===veiculo.value));
   dados=escolhidos.map(v=>analisarVeiculo(v,checklists||[],manutencoes||[])).sort((a,b)=>b.nivel-a.nivel||String(a.v.placa).localeCompare(String(b.v.placa)));
   desenhar(de,ate);
  }catch(e){corpo.replaceChildren(el('p',e.message||'Não foi possível carregar os veículos.','adm-veic-vazio'));}
  finally{atualizar.disabled=false;corpo.removeAttribute('aria-busy');}
 }

 function desenhar(de,ate){
  if(!dados.length){corpo.replaceChildren(el('p','Nenhum veículo para os filtros escolhidos.','adm-veic-vazio'));return;}
  const tile=(titulo,valor,ajuda,classe='')=>{const t=el('div',undefined,'adm-veic-tile '+classe);t.append(el('span',titulo),el('strong',String(valor)),el('small',ajuda));return t;};
  const tiles=el('div',undefined,'adm-veic-tiles');
  tiles.append(
   tile('Veículos',dados.length,'no filtro escolhido'),
   tile('Com desgaste ou avaria',dados.filter(d=>d.itensRuins.length).length,'no último checklist','adm-veic-tile-alto'),
   tile('Precisam de manutenção',dados.filter(d=>d.motivos.some(m=>/Preventiva|manutenção/i.test(m.texto))).length,'preventiva vencendo ou em manutenção','adm-veic-tile-medio'),
   tile('Com observação',dados.filter(d=>d.observacoes.length).length,'dos instrutores no período'),
   tile('Rodaram no período',fmtKm(dados.reduce((s,d)=>s+(d.rodou||0),0)),'pela diferença de KM dos checklists'));

  const atencao=dados.filter(d=>d.nivel>=2);
  const blocoAtencao=el('section',undefined,'adm-veic-secao');blocoAtencao.append(el('h3','Precisam de atenção'));
  if(!atencao.length)blocoAtencao.append(el('p','Nenhum veículo com desgaste, avaria ou manutenção pendente no período.','adm-veic-ok'));
  else{const grade=el('div',undefined,'adm-veic-alertas');for(const d of atencao){const c=el('article',undefined,'adm-veic-alerta adm-veic-n'+d.nivel);const topo=el('header');topo.append(el('strong',d.v.placa||d.v.nome),el('span',[d.v.modelo,nomeUnidade(d.v.unidade)].filter(Boolean).join(' · ')));
    const ul=el('ul');for(const m of d.motivos.filter(m=>m.nivel!=='baixo'))ul.append(el('li',m.texto,'adm-veic-m-'+m.nivel));
    c.append(topo,ul,botao('Ver histórico',()=>historico(d,de,ate),'op-link'));grade.append(c);}blocoAtencao.append(grade);}

  const blocoTabela=el('section',undefined,'adm-veic-secao');blocoTabela.append(el('h3','Todos os veículos'));
  const rolagem=el('div',undefined,'adm-veic-tabela'),t=el('table'),cab=el('tr');for(const h of ['Veículo','Unidade','Status','KM atual','Rodou','Último checklist','Itens com problema','Próxima preventiva','Observações',''])cab.append(el('th',h));
  const thead=el('thead');thead.append(cab);const tb=el('tbody');
  for(const d of dados){const tr=el('tr');if(d.nivel>=3)tr.className='adm-veic-linha-alta';else if(d.nivel===2)tr.className='adm-veic-linha-media';
   const veic=el('td');veic.append(el('strong',d.v.placa||'—'),el('small',d.v.modelo||''));
   const itens=el('td');if(d.itensRuins.length)for(const i of d.itensRuins)itens.append(el('span',i,'adm-veic-chip adm-veic-chip-alto'));else itens.append(el('span',d.ultimo?'Tudo ok':'—','adm-veic-chip'+(d.ultimo?' adm-veic-chip-ok':'')));
   const p=d.v.preventiva;const prev=[p?.proximaEm?fmtData(p.proximaEm):'',p?.proximaKm!=null?fmtKm(p.proximaKm):''].filter(Boolean).join(' ou ')||'Não configurada';
   const ultimo=d.ultimo?fmtData(d.ultimo.data)+momento(d.ultimo)+(d.ultimo.instrutor?' · '+d.ultimo.instrutor:''):'Sem checklist';
   for(const v of [veic,nomeUnidade(d.v.unidade),d.status,fmtKm(d.km),d.rodou!=null?fmtKm(d.rodou):'—',ultimo,itens,prev,String(d.observacoes.length)]){if(v instanceof Node)tr.append(v);else tr.append(el('td',v));}
   const acao=el('td');acao.append(botao('Histórico',()=>historico(d,de,ate),'op-link'));tr.append(acao);tb.append(tr);}
  t.append(thead,tb);rolagem.append(t);blocoTabela.append(rolagem);

  const obs=dados.flatMap(d=>d.observacoes.map(c=>({d,c}))).sort((a,b)=>String(b.c.criadoEm||b.c.data).localeCompare(String(a.c.criadoEm||a.c.data))).slice(0,20);
  const blocoObs=el('section',undefined,'adm-veic-secao');blocoObs.append(el('h3','Observações recentes dos instrutores'));
  if(!obs.length)blocoObs.append(el('p','Nenhuma observação no período.','adm-veic-ok'));
  else{const ul=el('ul',undefined,'adm-veic-obs');for(const {d,c} of obs){const li=el('li');const meta=el('span',[d.v.placa,fmtData(c.data),c.instrutor,fmtKm(c.km)].filter(Boolean).join(' · '));li.append(meta,el('p',c.observacoes));ul.append(li);}blocoObs.append(ul);}

  corpo.replaceChildren(tiles,blocoAtencao,blocoTabela,blocoObs);
 }

 async function historico(d,de,ate){
  const dlg=modal(raiz,'Histórico · '+(d.v.placa||d.v.nome),'admVeiculoHistorico');dlg.classList.add('adm-dialog','adm-veic-dialog');
  const p=d.v.preventiva;const resumo=el('dl',undefined,'adm-veic-resumo');const linha=(k,v)=>{const x=el('div');x.append(el('dt',k),el('dd',v));resumo.append(x);};
  linha('Modelo',d.v.modelo||'—');linha('Status',d.status);linha('KM atual',fmtKm(d.km));linha('Rodou no período',d.rodou!=null?fmtKm(d.rodou):'—');
  linha('Preventiva','A cada '+([p?.dias?p.dias+' dias':'',p?.km?fmtKm(p.km):''].filter(Boolean).join(' ou ')||'— (não configurada)'));
  linha('Última preventiva',[p?.ultimaEm?fmtData(p.ultimaEm):'',p?.ultimaKm!=null?fmtKm(p.ultimaKm):''].filter(Boolean).join(' · ')||'Não informada');
  linha('Próxima preventiva',[p?.proximaEm?fmtData(p.proximaEm):'',p?.proximaKm!=null?fmtKm(p.proximaKm):''].filter(Boolean).join(' ou ')||'Não calculada');
  dlg.append(resumo);
  if(d.motivos.length){const ul=el('ul',undefined,'adm-veic-motivos');for(const m of d.motivos)ul.append(el('li',m.texto,'adm-veic-m-'+m.nivel));dlg.append(el('h3','Pontos de atenção'),ul);}
  dlg.append(el('h3','Quilometragem e checklists ('+fmtData(de)+' a '+fmtData(ate)+')'));
  if(!d.checklists.length)dlg.append(el('p','Nenhum checklist no período.','adm-veic-ok'));
  else{const rol=el('div',undefined,'adm-veic-tabela'),t=el('table'),h=el('tr');for(const x of ['Data','KM','Instrutor','Combustível','Itens com problema','Observação'])h.append(el('th',x));const th=el('thead');th.append(h);const tb=el('tbody');
   for(const c of d.checklists){const tr=el('tr');const ruins=problemas(c);for(const v of [fmtData(c.data)+momento(c),fmtKm(c.km),c.instrutor||'—',c.combustivel?c.combustivel+'/5':'—',ruins.join(', ')||'Tudo ok',c.observacoes||'—'])tr.append(el('td',v));if(ruins.length)tr.className='adm-veic-linha-alta';tb.append(tr);}
   t.append(th,tb);rol.append(t);dlg.append(rol);}
  const manut=el('div');manut.append(el('p','Carregando as manutenções…','adm-veic-ok'));dlg.append(el('h3','Manutenções'),manut);
  dlg.addEventListener('close',()=>dlg.remove(),{once:true});dlg.showModal();
  try{const ms=servico.manutencoes?await servico.manutencoes(d.v.id):[];
   if(!ms.length)manut.replaceChildren(el('p','Nenhuma manutenção registrada.','adm-veic-ok'));
   else{const ol=el('ol',undefined,'adm-veic-manut');for(const m of ms)ol.append(el('li',[m.tipo?.descricao||m.tipo||'Manutenção',m.descricao,'iniciada '+fmtData(m.iniciadaEm),m.concluidaEm?'concluída '+fmtData(m.concluidaEm):'em aberto',m.km!=null?fmtKm(m.km):''].filter(Boolean).join(' · ')));manut.replaceChildren(ol);}}
  catch(e){manut.replaceChildren(el('p',e.message||'Não foi possível carregar as manutenções.','adm-veic-ok'));}
 }

 await carregar();
}
