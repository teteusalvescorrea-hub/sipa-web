// Fase 2 (3.1 e 4.3): move as aulas futuras de um instrutor e/ou veículo para o substituto, numa hora ou num período.
// A prévia mostra cada aula e o conflito (substituto ocupado, de outra categoria, em manutenção...). Só as aulas sem
// conflito são movidas; o aluno não é avisado.
import {el,botao,campo,entrada,select,modal} from './uiOperador.js';
import {hojeBrasil,somarDias,formatarData} from '../../../shared/js/calendario.js';
import {nomeDoVeiculo} from '../../../shared/js/formatacao.js';

const horaDe=iso=>String(iso).slice(11,16);

export function abrirRealocacao(raiz,servico,{origem,recursos,informar,aoConcluir}){
 const d=modal(raiz,'Realocar alunos','opRealocacao'),f=el('form',undefined,'op-form-fields'),erro=el('p'),previa=el('div');erro.setAttribute('role','alert');previa.dataset.opPreviaRealocacao='';
 const categorias=origem.categorias||[];
 const instrutores=recursos.filter(r=>r.tipo==='Instrutores'&&r.id!==origem.instrutorId&&r.ativo!==false&&(!categorias.length||categorias.some(c=>r.categorias?.includes(c))));
 const veiculos=recursos.filter(r=>r.tipo==='Veículos'&&r.id!==origem.veiculoId&&r.ativo!==false&&(!categorias.length||categorias.includes(r.categoria))&&!/Manutenção/.test(r.statusVeiculo||''))
  .sort((a,b)=>(b.statusVeiculo==='Reserva')-(a.statusVeiculo==='Reserva')||String(a.nome).localeCompare(String(b.nome),'pt-BR'));
 const instrutor=select([['','Manter o instrutor'],...instrutores.map(i=>[i.id,i.nome])]),veiculo=select([['','Manter o veículo'],...veiculos.map(v=>[v.id,(v.statusVeiculo==='Reserva'?'Reserva · ':'')+nomeDoVeiculo(v.modelo||v.nome,v.placa,' ')])]);
 const deData=entrada('date',hojeBrasil()),deHora=entrada('time','07:00'),ateData=entrada('date',somarDias(hojeBrasil(),7)),ateHora=entrada('time','19:00'),motivo=el('textarea');
 instrutor.dataset.opDestinoInstrutor='';veiculo.dataset.opDestinoVeiculo='';motivo.rows=2;motivo.maxLength=500;motivo.dataset.opMotivoRealocacao='';
 for(const c of [deData,deHora,ateData,ateHora])c.required=true;
 const ver=el('button','Ver aulas e conflitos','op-button op-button-outline');ver.type='submit';
 const confirmar=botao('Confirmar realocação',async()=>{confirmar.disabled=true;erro.textContent='';try{const r=await servico.realocar(pedido(true));informar(r.realocadas+' aula(s) realocada(s)'+(r.aulas.some(a=>a.conflito)?'; as com conflito ficaram como estavam.':'.'));d.close();await aoConcluir?.();}catch(x){erro.textContent=x.message;confirmar.disabled=false;}},'op-button op-button-primary');
 confirmar.disabled=true;confirmar.dataset.opConfirmarRealocacao='';
 f.append(el('p','Origem: '+origem.nome+'. O aluno não é avisado da troca.','op-help'),campo('De (data)',deData),campo('De (hora)',deHora),campo('Até (data)',ateData),campo('Até (hora)',ateHora),campo('Instrutor substituto',instrutor),campo('Veículo substituto (reservas primeiro)',veiculo),campo('Motivo',motivo),ver,previa,erro,confirmar);
 function pedido(comMotivo){return {motoristaOrigemId:origem.instrutorId||null,veiculoOrigemId:origem.veiculoId||null,de:deData.value+'T'+deHora.value+':00',ate:ateData.value+'T'+ateHora.value+':00',motoristaDestinoId:instrutor.value||null,veiculoDestinoId:veiculo.value||null,motivo:comMotivo?motivo.value:''};}
 for(const c of [instrutor,veiculo,deData,deHora,ateData,ateHora])c.addEventListener('change',()=>{confirmar.disabled=true;});
 f.onsubmit=async e=>{e.preventDefault();if(!f.reportValidity())return;erro.textContent='';confirmar.disabled=true;previa.replaceChildren(el('p','Consultando aulas…','op-help'));
  try{const r=await servico.previaRealocacao(pedido(false));
   if(!r.aulas.length){previa.replaceChildren(el('p','Nenhuma aula confirmada nesse período.','op-help'));return;}
   const t=el('table',undefined,'op-table'),cab=el('tr');for(const h of ['Aula','Aluno','Hoje','Depois','Situação'])cab.append(el('th',h));const corpo=el('tbody');
   for(const a of r.aulas){const tr=el('tr');tr.dataset.opAulaRealocada=a.aulaId;for(const v of [formatarData(String(a.inicio).slice(0,10))+' '+horaDe(a.inicio)+' · '+a.categoria,a.aluno||'',(a.motoristaAtual||'')+' · '+(a.veiculoAtual||''),(a.motoristaNovo||'')+' · '+(a.veiculoNovo||''),a.conflito||'Será realocada'])tr.append(el('td',v));if(a.conflito)tr.classList.add('op-conflito');corpo.append(tr);}
   const head=el('thead');head.append(cab);t.append(head,corpo);const livres=r.aulas.filter(a=>!a.conflito).length;
   previa.replaceChildren(el('p',livres+' de '+r.aulas.length+' aula(s) podem ser realocadas.','op-help'),t);confirmar.disabled=!livres;
  }catch(x){previa.replaceChildren();erro.textContent=x.message;}};
 d.append(f);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
}
