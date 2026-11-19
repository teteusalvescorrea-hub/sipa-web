// 17/11/2026 (pedido do usuário): "Enviar arquivo para o aluno" na ficha. A Recepção escolhe rápido o que é o arquivo
// (agendamento da prova emitido pelo SIT, resultado, LADV, contrato…), anexa e envia: o arquivo vai para "Meus documentos"
// do aluno (com o tipo e o título certos) e o aluno recebe na conversa uma mensagem pronta explicando o que é.
import {el,botao,campo,entrada,campoArquivo,modal} from './uiOperador.js';

const NOMES={A:'moto',B:'carro',D:'ônibus'};
const RODAPE='\n\nO arquivo já está no app, em Meus documentos.';

// Os tipos que aparecem para este aluno (as provas práticas só das categorias dele).
export function tiposDeArquivo(categorias=[]){
 const praticas=['B','A','D'].filter(c=>categorias.includes(c)).map(c=>({
  id:'pratica-'+c,categoria:'5',titulo:'Agendamento da prova prática de '+NOMES[c]+' ('+c+')',rotulo:'Prova prática de '+NOMES[c]+' ('+c+')',grupo:'Agendamento de prova',
  mensagem:'ÓTIMA NOTÍCIA!\n\nSua prova prática de '+NOMES[c]+' ('+c+') foi agendada!\n\nAbra o arquivo do agendamento para ver a data, o horário e o local da prova. No dia, leve o documento original com foto e a LADV, use calçado fechado e chegue com antecedência.\n\nBoa prova!'
 }));
 return [
  {id:'teorica',categoria:'5',titulo:'Agendamento da prova teórica',rotulo:'Prova teórica',grupo:'Agendamento de prova',
   mensagem:'ÓTIMA NOTÍCIA!\n\nSua prova teórica foi agendada!\n\nAbra o arquivo do agendamento para ver a data, o horário e o local. Leve o documento original com foto e chegue com antecedência.\n\nBoa prova!'},
  ...praticas,
  {id:'resultado',categoria:'4',titulo:'Resultado de prova',rotulo:'Resultado de prova',grupo:'Outros',mensagem:'O resultado da sua prova chegou! Abra o arquivo para conferir.'},
  {id:'ladv',categoria:'3',titulo:'LADV (licença de aprendizagem)',rotulo:'LADV',grupo:'Outros',mensagem:'Sua LADV (licença de aprendizagem) foi emitida! Leve o documento original em todas as aulas práticas.'},
  {id:'contrato',categoria:'1',titulo:'Contrato',rotulo:'Contrato',grupo:'Outros',mensagem:'Seu contrato está disponível para consulta.'},
  {id:'outro',categoria:'6',titulo:'',rotulo:'Outro arquivo',grupo:'Outros',mensagem:'Enviamos um novo arquivo para você.'}
 ].map(t=>({...t,mensagem:t.mensagem+RODAPE}));
}

export function abrirEnvioArquivo(raiz,servico,aluno,categorias,{informar=()=>{},aoConcluir}={}){
 const d=modal(raiz,'Enviar arquivo para o aluno','opEnviarArquivo');d.classList.add('op-enviar-arquivo');
 const f=el('form',undefined,'op-form-fields op-envio-form');f.noValidate=true;
 const tipos=tiposDeArquivo(categorias);let escolhido=null;
 const ajuda=el('p','O arquivo vai para "Meus documentos" de '+(aluno.nome||'aluno')+' e ele recebe a mensagem abaixo na conversa.','op-envio-ajuda');
 const grade=el('div',undefined,'op-envio-tipos');grade.setAttribute('role','radiogroup');grade.setAttribute('aria-label','O que é este arquivo?');
 for(const grupo of ['Agendamento de prova','Outros']){const bloco=el('div',undefined,'op-envio-grupo');bloco.append(el('span',grupo,'op-envio-grupo-titulo'));const linha=el('div',undefined,'op-envio-opcoes');
  for(const t of tipos.filter(x=>x.grupo===grupo)){const b=el('button',t.rotulo,'op-envio-opcao');b.type='button';b.setAttribute('role','radio');b.setAttribute('aria-checked','false');b.dataset.opEnvioTipo=t.id;b.onclick=()=>escolher(t,b);linha.append(b);}
  bloco.append(linha);grade.append(bloco);}
 const titulo=entrada('text');titulo.maxLength=150;titulo.placeholder='Ex.: Comprovante de pagamento';const campoTitulo=campo('Título do arquivo',titulo);campoTitulo.hidden=true;
 const arquivo=entrada('file');arquivo.accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
 const mensagem=el('textarea');mensagem.rows=7;mensagem.maxLength=2000;mensagem.placeholder='Escolha acima o que é o arquivo para preencher a mensagem.';
 const semMensagem=!servico.enviarMensagemAluno;
 const erro=el('p',undefined,'op-envio-erro');erro.setAttribute('role','alert');
 const enviar=el('button','Enviar para o aluno','op-button op-button-primary');enviar.type='submit';enviar.disabled=true;
 const acoes=el('div',undefined,'op-envio-acoes');acoes.append(botao('Cancelar',()=>d.close()),enviar);
 f.append(ajuda,campo('O que é este arquivo?',grade),campoTitulo,campo('Arquivo (PDF, JPG ou PNG)',campoArquivo(arquivo)),...(semMensagem?[]:[campo('Mensagem para o aluno',mensagem)]),erro,acoes);
 d.append(f);
 const pronto=()=>{enviar.disabled=!escolhido||!arquivo.files?.length||(escolhido.id==='outro'&&!titulo.value.trim());};
 function escolher(t,b){escolhido=t;grade.querySelectorAll('[role=radio]').forEach(x=>x.setAttribute('aria-checked',String(x===b)));campoTitulo.hidden=t.id!=='outro';mensagem.value=t.mensagem;erro.textContent='';pronto();if(t.id==='outro')titulo.focus();}
 arquivo.addEventListener('change',pronto);titulo.addEventListener('input',()=>{if(escolhido?.id==='outro'){const tt=titulo.value.trim();mensagem.value='Enviamos um novo arquivo para você'+(tt?': '+tt:'')+'.'+RODAPE;}pronto();});
 f.onsubmit=async e=>{e.preventDefault();if(enviar.disabled)return;enviar.disabled=true;erro.textContent='';
  const t=escolhido,nome=t.id==='outro'?titulo.value.trim():t.titulo;
  try{await servico.anexarDocumentoAluno(aluno.id,{categoria:t.categoria,titulo:nome,paraTodos:false,arquivo:arquivo.files[0]});}
  catch(x){erro.textContent=x.message||'Não foi possível anexar o arquivo.';enviar.disabled=false;return;}
  let avisado=false;
  if(!semMensagem&&mensagem.value.trim()){try{await servico.enviarMensagemAluno(aluno.id,mensagem.value.trim());avisado=true;}catch(x){informar('Arquivo enviado, mas a mensagem não foi: '+(x.message||'tente pela conversa.'),true);}}
  d.close();informar(avisado?'Arquivo enviado. O aluno recebeu a mensagem e o arquivo está em Meus documentos.':'Arquivo enviado para Meus documentos do aluno.');aoConcluir?.();
 };
 d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
}
