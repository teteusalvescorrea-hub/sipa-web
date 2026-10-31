import {mensagensDoAluno} from '../../../shared/js/mensagensAluno.js';
import {dataRelatorio} from '../../../shared/js/apresentacaoRelatorios.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
export function indicadorMensagens(aluno){
 const n=mensagensDoAluno(aluno).filter(m=>!m.lidaEm).length,a=document.querySelector('.sipa-sidebar-menu a[href="mensagens.html"]');
 if(a){a.setAttribute('aria-label','Mensagens'+(n?' — '+n+' não lida(s)':''));let badge=a.querySelector('.sipa-message-count');if(!badge){badge=el('span',undefined,'sipa-message-count');badge.setAttribute('aria-hidden','true');a.append(badge);}badge.textContent=n>99?'99+':String(n);badge.hidden=!n;}
 const b=document.getElementById('notification-button');if(b){b.disabled=false;b.title='Mensagens';b.onclick=()=>location.assign('mensagens.html');}document.querySelectorAll('.notification-badge').forEach(e=>{e.textContent=n>99?'99+':n;e.hidden=!n;});
}
export async function montarMensagensAluno(host,servico){
 let ocupado=false,pendente=false;
 async function atualizar(){if(ocupado){pendente=true;return;}ocupado=true;try{const dados=await servico.dadosAlunoLocal(),aluno=dados.aluno,itens=mensagensDoAluno(aluno);indicadorMensagens(aluno);host.replaceChildren();if(!itens.length){host.append(el('p','Você ainda não recebeu mensagens.','mensagens-vazio'));return;}
  for(const m of itens){const b=el('button',undefined,'mensagem-item');b.type='button';b.dataset.mensagem=m.id;b.dataset.naoLida=String(!m.lidaEm);const topo=el('span',undefined,'mensagem-topo');topo.append(el('strong',m.assunto),el('span',m.lidaEm?'Lida':'Não lida','mensagem-situacao'));b.append(topo,el('span',m.em?dataRelatorio(m.em):'Data não informada'),el('span',(m.remetente||'Recepção')+' — '+nomeUnidadeInstitucional(m.unidade||aluno.unidadePrincipal||aluno.unidade)),el('span',m.texto.slice(0,160)+(m.texto.length>160?'…':'')));b.onclick=()=>abrir(m,aluno);host.append(b);}
 }finally{ocupado=false;if(pendente){pendente=false;await atualizar();}}}
 async function abrir(m,aluno){const d=el('dialog',undefined,'mensagem-dialog'),h=el('h2',m.assunto),corpo=el('div',undefined,'mensagem-conteudo'),erro=el('p'),fechar=el('button','Fechar'),ler=el('button','Tentar registrar leitura');h.id='mensagem-assunto';h.tabIndex=-1;d.setAttribute('aria-labelledby',h.id);d.dataset.mensagemAberta=m.id;fechar.type=ler.type='button';fechar.onclick=()=>d.close();ler.hidden=true;erro.setAttribute('role','alert');
  const registrarLeitura=async()=>{ler.disabled=true;try{await servico.marcarMensagemLida(m.id);ler.hidden=true;erro.textContent='';await atualizar();}catch(e){erro.textContent=e.message;ler.hidden=false;ler.disabled=false;}};ler.onclick=registrarLeitura;
  corpo.append(el('p',m.em?dataRelatorio(m.em):'Data não informada'),el('p',(m.remetente||'Recepção')+' — '+nomeUnidadeInstitucional(m.unidade||aluno.unidadePrincipal||aluno.unidade)),el('p',m.texto,'mensagem-texto'));const rodape=el('footer');rodape.append(ler,fechar);d.append(h,corpo,erro,rodape);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();h.focus();
  // A consulta da lista não registra leitura. Somente o conteúdo completo aberto
  // e visível nesta página aciona o serviço autenticado já existente.
  const quandoVisivel=()=>{if(d.open&&document.visibilityState==='visible'){document.removeEventListener('visibilitychange',quandoVisivel);if(!m.lidaEm)registrarLeitura();}};
  d.addEventListener('close',()=>document.removeEventListener('visibilitychange',quandoVisivel),{once:true});document.addEventListener('visibilitychange',quandoVisivel);quandoVisivel();
 }
 await atualizar();const refrescar=()=>atualizar().catch(e=>{host.replaceChildren(el('p',e.message));});window.addEventListener('focus',refrescar);window.addEventListener('storage',e=>{if(e.key==='sipa.operador.demo.v2')refrescar();});
}
