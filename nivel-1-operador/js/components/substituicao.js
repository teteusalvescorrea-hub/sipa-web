// Fase 3 (3.2 e 4.4): só a Gerência cancela. A Gerência substitui o aluno no mesmo horário (ou só cancela, escolhendo
// o crédito); a Recepção pede a substituição à Gerência e marca a falta com ônus (o horário fica livre).
import {el,botao,campo,select,modal} from './uiOperador.js';
import {formatarData} from '../../../shared/js/calendario.js';

const CREDITOS=[['devolvido','Devolver o crédito ao aluno'],['retido','Reter o crédito']];

function dialogo(raiz,titulo,campos,enviar){
 const d=modal(raiz,titulo,'opSubstituicao'),f=el('form',undefined,'op-form-fields'),erro=el('p');erro.setAttribute('role','alert');
 const ok=el('button','Confirmar','op-button op-button-primary');ok.type='submit';ok.dataset.opConfirmarSubstituicao='';
 for(const [r,c] of campos)f.append(campo(r,c));f.append(erro,ok);d.append(f);
 f.onsubmit=async e=>{e.preventDefault();if(!f.reportValidity())return;ok.disabled=true;try{await enviar();d.close();}catch(x){erro.textContent=x.message;}finally{ok.disabled=false;}};
 d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
}
function alunos(estado,aula,vazio='Sem aluno substituto (só cancelar)'){return [['',vazio],...(estado.alunos||[]).filter(a=>!a.somenteAgenda&&a.id!==aula.alunoId&&String(a.categoria||'').includes(aula.categoria)).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR')).map(a=>[a.id,a.nome])];}
function motivoCampo(){const m=el('textarea');m.rows=2;m.maxLength=500;m.minLength=5;m.required=true;m.dataset.opMotivoSubstituicao='';return m;}

export function acoesDeCancelamento(raiz,servico,aula,estado,{executar,aoConcluir}){
 const nivel=servico.identidade?.nivel||1,botoes=[],quando=formatarData(aula.data)+' às '+aula.inicio;
 if(nivel>=2&&servico.substituirAluno){
  const b=botao('Substituir aluno',()=>{const novo=select(alunos(estado,aula)),motivo=motivoCampo(),credito=select(CREDITOS,'devolvido');novo.dataset.opNovoAluno='';
   dialogo(raiz,'Substituir aluno · '+quando,[['Aluno substituto (mesmo instrutor e veículo)',novo],['Motivo',motivo],['Crédito do aluno que sai',credito]],
    async()=>{const r=await servico.substituirAluno(aula.id,{novoAlunoId:novo.value,motivo:motivo.value,credito:credito.value});await executar(async()=>{},r.aulaNovaId?'Aluno substituído no mesmo horário.':'Aula cancelada.',aoConcluir);});});
  b.dataset.opSubstituirAluno='';botoes.push(b);
 }
 // 5.4: a Recepção não cancela. Ela pede o cancelamento (sem aluno novo) ou a substituição, e a Gerência decide.
 if(nivel===1&&servico.solicitarSubstituicao){
  const c=botao('Solicitar cancelamento',()=>{const motivo=motivoCampo();
   dialogo(raiz,'Solicitar cancelamento à Gerência · '+quando,[['Motivo',motivo]],
    async()=>{await servico.solicitarSubstituicao(aula.id,{novoAlunoId:'',motivo:motivo.value});await executar(async()=>{},'Pedido de cancelamento enviado à Gerência.',aoConcluir);});});
  c.dataset.opSolicitarCancelamento='';botoes.push(c);
  const b=botao('Solicitar substituição',()=>{const novo=select(alunos(estado,aula,'Selecione o aluno substituto')),motivo=motivoCampo();novo.required=true;novo.dataset.opNovoAluno='';
   dialogo(raiz,'Solicitar substituição à Gerência · '+quando,[['Aluno substituto',novo],['Motivo',motivo]],
    async()=>{await servico.solicitarSubstituicao(aula.id,{novoAlunoId:novo.value,motivo:motivo.value});await executar(async()=>{},'Solicitação enviada à Gerência.',aoConcluir);});});
  b.dataset.opSolicitarSubstituicao='';botoes.push(b);
 }
 if(servico.faltaComOnus){
  const b=botao('Falta com ônus',()=>{const motivo=el('textarea');motivo.rows=2;motivo.maxLength=500;
   dialogo(raiz,'Marcar falta com ônus · '+quando,[['Observação (opcional)',motivo]],async()=>{await servico.faltaComOnus(aula.id,motivo.value);await executar(async()=>{},'Falta com ônus registrada. O horário voltou a ficar livre.',aoConcluir);});});
  b.dataset.opFaltaComOnus='';botoes.push(b);
 }
 return botoes;
}

// A lista das solicitações: a Recepção acompanha; a Gerência aprova ou recusa.
export function cartaoSubstituicoes(raiz,servico,{executar,aoConcluir}){
 const caixa=el('section',undefined,'op-card op-substituicoes');caixa.dataset.opSubstituicoes='';
 const titulo=el('h2','Solicitações de cancelamento e substituição'),corpo=el('div');caixa.append(titulo,corpo);
 async function carregar(){
  try{const lista=await servico.substituicoes();const pendentes=lista.filter(s=>(s.status?.valor??s.status)===1);
   titulo.textContent='Solicitações de cancelamento e substituição'+(pendentes.length?' ('+pendentes.length+' pendente'+(pendentes.length>1?'s':'')+')':'');
   if(!lista.length){corpo.replaceChildren(el('p','Nenhuma solicitação.','op-help'));return;}
   const t=el('table',undefined,'op-table'),cab=el('tr');for(const h of ['Aula','Aluno','Substituto','Motivo','Pedido por','Situação',''])cab.append(el('th',h));const tb=el('tbody');
   for(const s of lista.slice(0,20)){const tr=el('tr');tr.dataset.opSubstituicao=s.id;const st=s.status?.descricao||'';
    for(const v of [formatarData(String(s.inicio).slice(0,10))+' '+String(s.inicio).slice(11,16)+' · '+s.categoria,s.aluno||'',s.novoAluno||'Cancelamento',s.motivo,s.solicitadaPor||'',st+(s.resposta?' · '+s.resposta:'')])tr.append(el('td',v));
    const acoes=el('td');
    if((s.status?.valor??s.status)===1&&(servico.identidade?.nivel||1)>=2){
     const aprovar=botao('Aprovar',()=>{const credito=select(CREDITOS,'devolvido');dialogo(raiz,'Aprovar solicitação',[['Crédito do aluno que sai',credito]],async()=>{await servico.decidirSubstituicao(s.id,{aprovar:true,credito:credito.value});await executar(async()=>{},'Solicitação aprovada.');await carregar();await aoConcluir?.();});});aprovar.dataset.opAprovarSubstituicao='';
     const recusar=botao('Recusar',()=>{const resposta=el('textarea');resposta.rows=2;resposta.minLength=5;resposta.maxLength=500;resposta.required=true;dialogo(raiz,'Recusar solicitação',[['Motivo da recusa',resposta]],async()=>{await servico.decidirSubstituicao(s.id,{aprovar:false,resposta:resposta.value});await executar(async()=>{},'Solicitação recusada.');await carregar();});});recusar.dataset.opRecusarSubstituicao='';
     acoes.append(aprovar,recusar);}
    tr.append(acoes);tb.append(tr);}
   const head=el('thead');head.append(cab);t.append(head,tb);
   // 10/11/2026 (pente-fino): rolagem própria; sem ela a tabela alargava a página inteira no celular.
   const rolagem=el('div',undefined,'op-table-scroll');rolagem.tabIndex=0;rolagem.setAttribute('role','region');rolagem.setAttribute('aria-label','Solicitações de cancelamento e substituição');rolagem.append(t);corpo.replaceChildren(rolagem);
  }catch(e){corpo.replaceChildren(el('p',e.message,'op-help'));}
 }
 carregar();return caixa;
}
