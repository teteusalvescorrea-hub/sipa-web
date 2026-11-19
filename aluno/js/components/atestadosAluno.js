import {creditoDoAtestado,etapasDoAtestado,ultimaAtualizacaoAtestado} from '../../../shared/js/solicitacoesMedicas.js';
import {situacaoMedica} from '../../../shared/components/situacaoMedica.js';
import {nomeLocalDaReserva} from '../../../shared/components/localAula.js';
import {dataHoraBrasilia,horaBrasilia} from '../../../shared/js/calendario.js';
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
const data=v=>v&&Number.isFinite(Date.parse(v))?dataHoraBrasilia(v):'Não informada';
async function visualizarDocumento(servico,id,origem){
 const d=el('dialog',undefined,'lesson-cancel-dialog medical-document-viewer'),h=el('h2','Atestado enviado'),conteudo=el('div'),fechar=el('button','Fechar');h.id='medical-viewer-title';h.tabIndex=-1;d.setAttribute('aria-labelledby',h.id);d.dataset.medicalViewer='';fechar.type='button';fechar.onclick=()=>d.close();conteudo.textContent='Consultando documento autorizado…';let url;
 d.append(h,conteudo,fechar);d.addEventListener('close',()=>{if(url)URL.revokeObjectURL(url);d.remove();if(origem.isConnected)origem.focus();},{once:true});document.body.append(d);d.showModal();h.focus();
 try{const arquivo=await servico.documentoMedico(id);if(!d.open)return;url=URL.createObjectURL(arquivo);conteudo.replaceChildren();
  if(arquivo.type.startsWith('image/')){const img=el('img');img.src=url;img.alt='Documento enviado pela sua conta';await img.decode();if(!d.open)return;conteudo.append(img);}
  const link=el('a',arquivo.type==='application/pdf'?'Abrir PDF em nova aba':'Abrir imagem em nova aba');link.href=url;link.target='_blank';link.rel='noopener noreferrer';link.dataset.medicalOwnDocument='';conteudo.append(link);
 }catch(e){if(d.open){conteudo.textContent=e.message||'Documento indisponível neste navegador.';conteudo.setAttribute('role','alert');}}
}
export function montarAtestadosAluno(servico,dados){
 const painel=el('section',undefined,'student-medical-requests');painel.id='student-medical-requests';painel.hidden=true;painel.setAttribute('aria-label','Atestados médicos');painel.append(el('h2','Atestados médicos'));
 const ids=new Set(),aulas=dados.aulas.filter(a=>{const s=a.solicitacaoMedica;if(!s?.id||s.alunoId!==dados.aluno?.id||(a.alunoId||a.aluno)!==dados.aluno.id||ids.has(s.id))return false;ids.add(s.id);return true;}).sort((a,b)=>(Date.parse(b.solicitacaoMedica.criadaEm)||0)-(Date.parse(a.solicitacaoMedica.criadaEm)||0));
 if(!aulas.length)painel.append(el('p','Nenhum atestado médico enviado.'),el('p','Quando você solicitar um cancelamento por motivo médico, poderá acompanhar a análise nesta página.'));
 for(const aula of aulas){
  // 17/11/2026 (pedido do usuário): um cartão só por atestado (antes, o do pedido e o da aula repetiam as informações):
  // qual aula foi, o resultado numa faixa (verde aprovado, azul em análise, vermelha recusado), o acompanhamento em
  // etapas e, no rodapé, o envio e o documento.
  const s=aula.solicitacaoMedica,credito=creditoDoAtestado(s),card=el('article',undefined,'student-local-lesson medical-request-card medical-request-unico');card.dataset.medicalRequestCard=s.id;card.tabIndex=-1;
  const nomeCategoria={A:'Moto',B:'Carro',D:'Ônibus'}[aula.categoria]||'Aula';
  const heading=el('header',undefined,'local-lesson-heading');heading.append(el('h3','Aula de '+data(aula.inicio)+(aula.fim?' às '+horaBrasilia(aula.fim):'')+' · '+nomeCategoria+' ('+aula.categoria+')'),situacaoMedica(s));
  const campos=el('dl',undefined,'local-lesson-fields');
  for(const [titulo,valor] of [['Instrutor',dados.registros.find(r=>r.id===(aula.instrutor||aula.instrutorId))?.nome||'Não informado'],['Veículo',dados.registros.find(r=>r.id===(aula.veiculo||aula.veiculoId))?.nome||'Não informado'],['Local',nomeLocalDaReserva(aula)]]){const c=el('div');c.append(el('dt',titulo),el('dd',valor));campos.append(c);}
  const aprovado=s.status==='aprovado',recusado=s.status==='rejeitado'||s.status==='reprovado';
  const resultado=el('p',undefined,'local-lesson-cancel-info local-lesson-atestado-info '+(aprovado?'aprovado':recusado?'recusado':'analise'));
  // 18/11/2026 (pedido do usuário): no atestado de mais dias, as outras aulas do afastamento que a Gerência abonou.
  const extras=aprovado?(s.aulasDoAfastamento||[]):[],total=1+extras.length;
  resultado.append(el('strong',aprovado?'Atestado aprovado':recusado?'Atestado recusado':'Atestado em análise'),el('span',aprovado?(total>1?'As '+total+' aulas do afastamento foram abonadas e voltaram para o seu saldo para você reagendar.':'A aula foi abonada e voltou para o seu saldo para você reagendar.'):recusado?'A aula conta como falta e não volta para o saldo.':'A aula está cancelada por motivo de saúde. Assim que a análise terminar, o resultado aparece aqui.'));
  const abonadas=el('div',undefined,'medical-request-abonadas');
  if(extras.length){abonadas.append(el('strong','Outras aulas abonadas por este atestado ('+extras.length+')'));const lista=el('ul');
   for(const x of extras){const nome={A:'Moto',B:'Carro',D:'Ônibus'}[x.categoria]||'Aula';lista.append(el('li',data(x.inicio)+(x.fim?' às '+horaBrasilia(x.fim):'')+' · '+nome+(x.categoria?' ('+x.categoria+')':'')+(x.instrutor?' · '+x.instrutor:'')+(x.unidade?' · '+x.unidade:'')));}
   abonadas.append(lista);}
  const documento=el('div',undefined,'medical-request-document'),nome=el('span','Consultando documento…'),ver=el('button','Visualizar documento');ver.type='button';ver.dataset.medicalOwnView=s.id;ver.disabled=true;documento.append(el('span','Enviado em '+data(s.criadaEm)+' · ','medical-request-enviado'),nome,ver);
  if(servico.metadadosDocumentoMedico&&servico.documentoMedico){servico.metadadosDocumentoMedico(s.id).then(meta=>{if(!card.isConnected)return;nome.textContent='Documento: '+(meta.nome||'Nome não informado');ver.disabled=false;}).catch(()=>{if(card.isConnected)nome.textContent='Documento indisponível neste navegador.';});ver.onclick=()=>visualizarDocumento(servico,s.id,ver);}else nome.textContent='Documento indisponível: integração pendente.';
  const creditos=el('p',undefined,'medical-request-credit');creditos.dataset.medicalCredit=s.id;creditos.textContent='Crédito: '+credito.texto+' · '+(Number.isSafeInteger(s.creditosEnvolvidos)?s.creditosEnvolvidos+' crédito(s) envolvido(s)':'Quantidade não informada')+' · Categoria '+s.categoria+(credito.confirmado?' · '+credito.quantidade+' crédito(s) devolvido(s)':'');
  const etapas=el('ol',undefined,'medical-request-progress');etapas.setAttribute('aria-label','Andamento do atestado');for(const [i,etapa] of etapasDoAtestado(s).entries()){const n=el('li');n.dataset.medicalStep=etapa.estado;if(etapa.estado==='atual')n.setAttribute('aria-current','step');n.append(el('strong',(i+1)+'. '+etapa.titulo),el('span',({concluida:'Concluída',atual:'Em análise',pendente:'Pendente'})[etapa.estado]));etapas.append(n);}
  creditos.hidden=true;
  card.append(heading,campos,resultado,...(extras.length?[abonadas]:[]),etapas,documento);if(s.observacoes)card.append(el('p','Sua observação: '+s.observacoes,'medical-request-observations'));card.append(creditos);painel.append(card);
 }
 return {painel,destacar(id){const card=[...painel.querySelectorAll('[data-medical-request-card]')].find(n=>n.dataset.medicalRequestCard===id);if(!card)return;painel.querySelectorAll('.medical-request-highlight').forEach(n=>n.classList.remove('medical-request-highlight'));card.classList.add('medical-request-highlight');card.focus({preventScroll:true});card.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}};
}
