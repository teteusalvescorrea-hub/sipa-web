import {STATUS_MEDICO,creditoDoAtestado,etapasDoAtestado,ultimaAtualizacaoAtestado} from '../../../shared/js/solicitacoesMedicas.js';
import {situacaoMedica} from '../../../shared/components/situacaoMedica.js';
import {nomeLocalDaReserva} from '../../../shared/components/localAula.js';
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
const data=v=>v&&Number.isFinite(Date.parse(v))?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):'Não informada';
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
  const s=aula.solicitacaoMedica,credito=creditoDoAtestado(s),card=el('article',undefined,'student-local-lesson medical-request-card');card.dataset.medicalRequestCard=s.id;card.tabIndex=-1;
  const heading=el('header',undefined,'local-lesson-heading');heading.append(el('h3',data(aula.inicio)+' · Categoria '+aula.categoria),situacaoMedica(s));
  const campos=el('dl',undefined,'local-lesson-fields');
  for(const [titulo,valor] of [['Local da aula',nomeLocalDaReserva(aula)],['Instrutor',dados.registros.find(r=>r.id===(aula.instrutor||aula.instrutorId))?.nome||'Não informado'],['Enviado em',data(s.criadaEm)],['Última atualização',data(ultimaAtualizacaoAtestado(s))]]){const c=el('div');c.append(el('dt',titulo),el('dd',valor));campos.append(c);}
  const documento=el('div',undefined,'medical-request-document'),nome=el('span','Consultando documento…'),ver=el('button','Visualizar documento');ver.type='button';ver.dataset.medicalOwnView=s.id;ver.disabled=true;documento.append(nome,ver);
  if(servico.metadadosDocumentoMedico&&servico.documentoMedico){servico.metadadosDocumentoMedico(s.id).then(meta=>{if(!card.isConnected)return;nome.textContent='Documento: '+(meta.nome||'Nome não informado');ver.disabled=false;}).catch(()=>{if(card.isConnected)nome.textContent='Documento indisponível neste navegador.';});ver.onclick=()=>visualizarDocumento(servico,s.id,ver);}else nome.textContent='Documento indisponível: integração pendente.';
  const creditos=el('p',undefined,'medical-request-credit');creditos.dataset.medicalCredit=s.id;creditos.textContent='Crédito: '+credito.texto+' · '+(Number.isSafeInteger(s.creditosEnvolvidos)?s.creditosEnvolvidos+' crédito(s) envolvido(s)':'Quantidade não informada')+' · Categoria '+s.categoria+(credito.confirmado?' · '+credito.quantidade+' crédito(s) devolvido(s)':'');
  const etapas=el('ol',undefined,'medical-request-progress');etapas.setAttribute('aria-label','Andamento do atestado');for(const [i,etapa] of etapasDoAtestado(s).entries()){const n=el('li');n.dataset.medicalStep=etapa.estado;if(etapa.estado==='atual')n.setAttribute('aria-current','step');n.append(el('strong',(i+1)+'. '+etapa.titulo),el('span',({concluida:'Concluída',atual:'Em análise',pendente:'Pendente'})[etapa.estado]));etapas.append(n);}
  card.append(heading,campos,documento);if(s.observacoes)card.append(el('p','Observação: '+s.observacoes,'medical-request-observations'));card.append(creditos,etapas);painel.append(card);
 }
 return {painel,destacar(id){const card=[...painel.querySelectorAll('[data-medical-request-card]')].find(n=>n.dataset.medicalRequestCard===id);if(!card)return;painel.querySelectorAll('.medical-request-highlight').forEach(n=>n.classList.remove('medical-request-highlight'));card.classList.add('medical-request-highlight');card.focus({preventScroll:true});card.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});}};
}
