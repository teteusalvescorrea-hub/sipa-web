import {el,botao,campo,entrada,select,modal,card,mostrarAviso} from '../../nivel-1-operador/js/components/uiOperador.js';
import {UNIDADES_INSTITUCIONAIS,nomeUnidadeInstitucional} from '../js/catalogoUnidades.js';
import {hojeBrasil,somarDias,formatarData} from '../js/calendario.js';
import {escopoPermitido} from '../js/permissoesAdministrativas.js';
import {dataRelatorio} from '../js/apresentacaoRelatorios.js';
import {formatarTelefone} from '../js/formatacao.js';
// Antecipação (Recepção e Gerência): horários ocupados que vagaram e os alunos que marcaram interesse neles.
// A equipe envia ofertas pelo SIPA; o aluno decide como usar a vaga.
// Padrão da tela de alunos: filtros numa linha, contagem, tabela e envio de ofertas. Agrupada por horário, na ordem de quem marcou primeiro.
const categorias={A:'Moto',B:'Carro',D:'Ônibus'},principal='op-button op-button-primary',DIAS=14;
const plural=(n,um,varios)=>n+' '+(n===1?um:varios);
const aulaTexto=a=>formatarData(a.data)+' às '+a.inicio;
const dicaPrazo=prazo=>'O aluno não tem aula que possa ser remarcada: só dá para remarcar aulas com '+prazo+' horas úteis de antecedência.';
export async function montarAntecipacaoPainel(host,servico,root){
 host.antecipacaoController?.abort();const controller=new AbortController();host.antecipacaoController=controller;
 if(!document.querySelector('[data-css-antecipacao]')){const l=el('link');l.rel='stylesheet';l.href=new URL('../css/antecipacao.css',import.meta.url);l.dataset.cssAntecipacao='';document.head.append(l);}
 host.classList.add('sipa-antecipacao');const op=servico.identidade,hoje=hojeBrasil();let liberados=[],revisao=0;const selecionadas=new Set(),enviadas=new Set();
 const unidades=UNIDADES_INSTITUCIONAIS.filter(u=>escopoPermitido(op,u.id)).map(u=>[u.id,u.nome]);
 const filtros={busca:entrada('search'),unidade:select(unidades.length>1?[['','Todas'],...unidades]:unidades,op.unidadeConsulta||op.unidade),categoria:select([['','Todas'],['A','Moto — A'],['B','Carro — B'],['D','Ônibus — D']]),de:entrada('date',hoje),ate:entrada('date',somarDias(hoje,DIAS))};
 const iniciais=Object.fromEntries(Object.entries(filtros).map(([k,c])=>[k,c.value]));
 filtros.busca.placeholder='Nome ou telefone';filtros.de.min=hoje;filtros.ate.min=hoje;filtros.ate.max=somarDias(hoje,DIAS);
 const barra=el('form',undefined,'ant-filtros');barra.setAttribute('role','search');barra.setAttribute('aria-label','Filtros da antecipação');barra.onsubmit=e=>e.preventDefault();
 for(const [k,t] of [['busca','Buscar aluno'],['unidade','Unidade'],['categoria','Categoria'],['de','De'],['ate','Até']]){
  filtros[k].name=k;filtros[k].dataset.antFiltro=k;const grupo=campo(t,filtros[k]);grupo.className='ant-filtro';barra.append(grupo);
  // A busca filtra a lista já carregada; unidade, categoria e período consultam de novo.
  filtros[k].addEventListener(k==='busca'?'input':'change',k==='busca'?desenhar:consultar);
 }
 const limpar=botao('Limpar filtros',()=>{for(const [k,c] of Object.entries(filtros))c.value=iniciais[k];consultar();},'op-button op-button-outline');limpar.dataset.antLimpar='';const acoes=el('div',undefined,'ant-filtro-acoes');acoes.append(limpar);barra.append(acoes);
 // O prazo vem da API em cada horário (prazoHorasUteis); antes da consulta, o texto não cita número.
  const textoAjuda=()=> 'Selecione os alunos e envie uma oferta de vaga pelo SIPA. O aluno poderá antecipar uma aula, marcar uma nova com saldo ou descartar. A disponibilidade será conferida na confirmação.';
 const ajuda=el('p',textoAjuda(),'adm-nota');
 const quantidade=el('p',undefined,'op-help');quantidade.dataset.antContagem='';const retorno=el('p',undefined,'ant-retorno');retorno.setAttribute('role','status');const lista=el('div');
 const marcarTodas=botao('Selecionar todas',()=>{const ids=visiveis().flatMap(h=>h.interessados.filter(i=>!i.ofertaEnviada).map(i=>i.id)),limpar=ids.length>0&&ids.every(id=>selecionadas.has(id));for(const id of ids)limpar?selecionadas.delete(id):selecionadas.add(id);desenhar();},'op-button op-button-outline');
 const enviarLote=botao('Enviar ofertas selecionadas',()=>enviar([...selecionadas]),principal);enviarLote.disabled=true;
 const selecao=el('div',undefined,'ant-acoes-lote');selecao.append(marcarTodas,enviarLote);
 host.replaceChildren(card('Antecipação de aulas',ajuda,barra,retorno,quantidade,selecao,lista));
 const avisar=()=>root.dispatchEvent(new Event('sipa-antecipacao-atualizada'));
 async function consultar(){
  const pedido=++revisao;retorno.textContent='';selecionadas.clear();
  if(!filtros.de.value||!filtros.ate.value||filtros.de.value>filtros.ate.value||filtros.ate.value>somarDias(filtros.de.value,DIAS)){liberados=[];retorno.textContent='Informe um período de até '+DIAS+' dias.';desenhar();return;}
  lista.replaceChildren(el('p','Consultando horários…','op-help'));
  try{const r=await servico.consultarLiberados({unidade:filtros.unidade.value,categoria:filtros.categoria.value,de:filtros.de.value,ate:filtros.ate.value});if(pedido!==revisao)return;liberados=r;if(r[0]?.prazo)ajuda.textContent=textoAjuda(r[0].prazo);}
  catch(e){if(pedido!==revisao)return;liberados=[];retorno.textContent=e.message;}
  desenhar();
 }
 function visiveis(){
  const termo=filtros.busca.value.trim().toLocaleLowerCase('pt-BR'),numeros=termo.replace(/\D/g,'');
  const combina=i=>!i.ofertaEnviada&&!enviadas.has(i.id)&&(!termo||i.aluno.toLocaleLowerCase('pt-BR').includes(termo)||numeros&&String(i.telefone).replace(/\D/g,'').includes(numeros));
  return liberados.map(h=>({...h,interessados:h.interessados.filter(combina)})).filter(h=>h.interessados.length);
 }
 function desenhar(){
  const horarios=visiveis(),disponiveis=horarios.flatMap(h=>h.interessados.filter(i=>!i.ofertaEnviada).map(i=>i.id));marcarTodas.textContent=disponiveis.length>0&&disponiveis.every(id=>selecionadas.has(id))?'Limpar seleção':'Selecionar todas';marcarTodas.disabled=!disponiveis.length;quantidade.textContent=plural(horarios.length,'horário liberado','horários liberados');
  selecao.hidden=!horarios.length;
  if(!horarios.length){selecionadas.clear();enviarLote.disabled=true;lista.replaceChildren(el('p','Nenhuma oferta pendente de envio para os filtros selecionados.','op-demo-no-results'));return;}
  const wrap=el('div',undefined,'op-table-scroll'),tabela=el('table',undefined,'op-table ant-tabela'),head=el('thead'),tr=el('tr'),colunas=['Selecionar','Aluno','Telefone','Interesse desde','Situação','Aula a antecipar','Ações'];
  wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Horários liberados com alunos interessados');
  for(const c of colunas){const th=el('th',c);th.scope='col';if(c==='Selecionar'){const todos=entrada('checkbox');todos.setAttribute('aria-label','Selecionar todas as ofertas exibidas');const ids=horarios.flatMap(h=>h.interessados.filter(i=>!i.ofertaEnviada).map(i=>i.id));todos.checked=ids.length>0&&ids.every(id=>selecionadas.has(id));todos.disabled=!ids.length;todos.onchange=()=>{for(const id of ids)todos.checked?selecionadas.add(id):selecionadas.delete(id);desenhar();};th.replaceChildren(todos);}tr.append(th);}head.append(tr);tabela.append(head);
  for(const h of horarios){
   const grupo=el('tbody',undefined,'ant-grupo'),cab=el('tr',undefined,'ant-grupo-cabecalho'),th=el('th');th.colSpan=colunas.length;th.scope='colgroup';
   th.append(el('strong',formatarData(h.data)+' · '+h.inicio+'–'+h.fim),el('span',' · '+(h.unidadeNome||nomeUnidadeInstitucional(h.unidade))+' · '+(categorias[h.categoria]||'Categoria')+' — '+h.categoria+' · '+plural(h.pares.length,'par livre','pares livres')));
   cab.append(th);grupo.append(cab);
   for(const i of h.interessados){
    const linha=el('tr'),nome=el('strong',i.aluno),situacao=el('span',i.ofertaEnviada?'Oferta enviada':i.situacao,'ant-situacao'),noPrazo=i.aulas.filter(a=>a.dentroPrazo);
    linha.dataset.antInteresse=i.id;situacao.dataset.situacao=i.situacao;if(i.contatadoEm||i.observacao)situacao.title=[i.contatadoEm&&'Contatado em '+dataRelatorio(i.contatadoEm),i.observacao].filter(Boolean).join(' · ');
    const aula=noPrazo.length?aulaTexto(noPrazo[0])+(noPrazo.length>1?' (+'+(noPrazo.length-1)+')':''):i.aulas.length?'Fora do prazo ('+Math.min(...i.aulas.map(a=>a.horasUteis??0))+' h úteis)':'Nenhuma aula futura';
    const escolher=entrada('checkbox');escolher.setAttribute('aria-label','Selecionar oferta para '+i.aluno+' às '+h.inicio);escolher.disabled=i.ofertaEnviada;escolher.checked=selecionadas.has(i.id);escolher.onchange=()=>{escolher.checked?selecionadas.add(i.id):selecionadas.delete(i.id);desenhar();};
    const enviarUma=botao(i.ofertaEnviada?'Oferta enviada':'Enviar oferta ao aluno',()=>enviar([i.id]),'op-button op-button-outline');enviarUma.disabled=i.ofertaEnviada;
    for(const [k,v] of [['Selecionar',escolher],['Aluno',nome],['Telefone',formatarTelefone(i.telefone)],['Interesse desde',i.marcadoEm?dataRelatorio(i.marcadoEm):'Não informado'],['Situação',situacao],['Aula a antecipar',aula],['Ações',enviarUma]]){const td=el('td');td.dataset.rotulo=k;td.append(v instanceof Node?v:document.createTextNode(v));linha.append(td);}
    if(!noPrazo.length)linha.querySelector('[data-rotulo="Aula a antecipar"]').title=dicaPrazo(h.prazo);
    grupo.append(linha);
   }
   tabela.append(grupo);
  }
  if(!horarios.length){const b=el('tbody'),r=el('tr'),td=el('td','Nenhum horário liberado com aluno interessado.','op-demo-no-results');td.colSpan=colunas.length;r.append(td);b.append(r);tabela.append(b);}
  enviarLote.disabled=!selecionadas.size;enviarLote.textContent='Enviar ofertas selecionadas'+(selecionadas.size?' ('+selecionadas.size+')':'');
  wrap.append(tabela);lista.replaceChildren(wrap);
 }
 // Diálogo curto das ações: título, resumo, campos e Confirmar. Fecha e recarrega a lista quando dá certo.
 function dialogo(titulo,id,conteudo,rotulo,executar){
  const d=modal(root,titulo,id),f=el('form',undefined,'adm-form'),erro=el('p',undefined,'op-acompanhamento-erro'),rodape=el('footer',undefined,'op-dialog-actions'),confirmar=el('button',rotulo,principal);let ocupado=false;
  d.classList.add('adm-dialog','ant-dialogo');erro.setAttribute('role','alert');confirmar.type='submit';const voltar=botao('Voltar',()=>{if(!ocupado)d.close();});rodape.append(voltar,confirmar);f.append(...conteudo,erro,rodape);d.append(f);
  f.onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;confirmar.disabled=true;voltar.disabled=true;erro.textContent='';
   try{const texto=await executar();d.close();avisar();const sucesso=mostrarAviso(root,'Ofertas enviadas com sucesso!','antEnvioConcluido',el('p',texto+' Os alunos podem consultar as ofertas em Mensagens.'));sucesso.classList.add('ant-envio-sucesso');const icone=el('span','✓','ant-envio-icone');icone.setAttribute('aria-hidden','true');sucesso.prepend(icone);sucesso.querySelector('.op-button')?.focus();await consultar();}catch(x){erro.textContent=x.message||'Não foi possível concluir a operação.';}finally{ocupado=false;confirmar.disabled=false;voltar.disabled=false;}};
  d.oncancel=e=>{if(ocupado)e.preventDefault();};d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
 }
 function enviar(ids){
  if(!ids.length)return;const chave=crypto.randomUUID();
  dialogo('Enviar oferta de vaga','antEnviarOferta',[el('p',ids.length+' oferta(s) serão enviadas à caixa de mensagens dos alunos. O envio não reserva as vagas.')],'Enviar ofertas',async()=>{const r=await servico.enviarOfertas(ids,{unidade:filtros.unidade.value},chave);++revisao;for(const id of ids)enviadas.add(id);selecionadas.clear();desenhar();return (r.enviadas??0)+' oferta(s) enviada(s).';});
 }
 window.addEventListener('focus',()=>{if(!host.hidden&&!root.querySelector('dialog[open]'))consultar();},{signal:controller.signal});
 await consultar();
}
