import {validarAtestado,LIMITE_ATESTADO} from '../../../shared/js/solicitacoesMedicas.js';
import {nomeLocalDaReserva} from '../../../shared/components/localAula.js';
const el=(t,v)=>{const n=document.createElement(t);if(v!==undefined)n.textContent=v;return n;};
export function abrirSolicitacaoMedica({aula,servico,origem,aoConcluir}){
 const d=el('dialog');d.className='lesson-cancel-dialog medical-request-dialog';d.setAttribute('aria-labelledby','medical-request-title');d.dataset.medicalRequest='';
 const h=el('h2','Solicitar cancelamento por motivo médico');h.id='medical-request-title';h.tabIndex=-1;
 const data=new Date(aula.inicio).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
 const resumo=el('p',`${data} · Categoria ${aula.categoria} · ${nomeLocalDaReserva(aula)}`);
 const aviso=el('p','Sua aula será cancelada imediatamente. O crédito correspondente ficará pendente de análise e somente poderá ser devolvido caso a gerência aprove seu atestado médico.');aviso.className='lesson-cancel-policy';
 const form=el('form'),arq=el('input');arq.type='file';arq.accept='.jpg,.jpeg,.png,.pdf';arq.required=true;arq.name='atestado';arq.id='medical-file';
 const label=el('label','Atestado médico (JPG, PNG ou PDF — até '+Math.round(LIMITE_ATESTADO/1024/1024)+' MB)');label.htmlFor=arq.id;label.append(arq);
 const obs=el('textarea');obs.name='observacoesMedicas';obs.maxLength=2000;obs.rows=3;const labelObs=el('label','Observações (opcional)');labelObs.append(obs);
 const consent=el('input');consent.type='checkbox';consent.required=true;consent.name='confirmacaoMedica';const labelConsent=el('label','');labelConsent.className='medical-consent';labelConsent.append(consent,document.createTextNode(' Li e confirmo o cancelamento imediato, sem devolução automática do crédito.'));
 const erro=el('p');erro.setAttribute('role','alert');erro.dataset.medicalError='';
 const footer=el('footer'),voltar=el('button','Voltar'),enviar=el('button','Enviar solicitação e cancelar aula');voltar.type='button';enviar.type='submit';enviar.dataset.medicalSubmit='';footer.append(voltar,enviar);
 const id=crypto.randomUUID();let ocupado=false;voltar.onclick=()=>d.close();
 form.onsubmit=async e=>{e.preventDefault();if(ocupado||!form.reportValidity())return;ocupado=true;enviar.disabled=voltar.disabled=true;arq.disabled=obs.disabled=true;erro.textContent='';try{
  const arquivo=arq.files[0];await validarAtestado(arquivo);
  await servico.solicitarCancelamentoMedico({aulaId:aula.id,arquivo,observacoes:obs.value,operacaoId:id});
  await aoConcluir();d.close();
 }catch(e){erro.textContent=e.message||'Não foi possível enviar a solicitação. Nenhuma devolução foi realizada.';}finally{ocupado=false;enviar.disabled=voltar.disabled=false;arq.disabled=obs.disabled=false;}};
 d.addEventListener('cancel',e=>{if(ocupado)e.preventDefault();});d.addEventListener('close',()=>{arq.value='';d.remove();if(origem.isConnected)origem.focus();},{once:true});
 form.append(label,labelObs,labelConsent,erro,footer);d.append(h,resumo,el('p','Anexe somente documentação relacionada a esta aula, para análise da recepção e gerência.'),aviso,form);document.body.append(d);d.showModal();h.focus();
}
