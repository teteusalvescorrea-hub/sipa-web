import {el,botao,campo,entrada,select,modal,card,mostrarToast} from '../../nivel-1-operador/js/components/uiOperador.js';
import {UNIDADES_INSTITUCIONAIS,nomeUnidadeInstitucional} from '../js/catalogoUnidades.js';
import {hojeBrasil,somarDias,formatarData} from '../js/calendario.js';
import {escopoPermitido} from '../js/permissoesAdministrativas.js';
import {dataRelatorio} from '../js/apresentacaoRelatorios.js';
import {formatarTelefone} from '../js/formatacao.js';
import {menuAcoes} from './menuAcoes.js';
// Antecipação (Recepção e Gerência): horários ocupados que vagaram e os alunos que marcaram interesse neles.
// A equipe liga para o aluno e remarca; a aula desmarcada precisa estar a pelo menos o prazo da autoescola (48 horas úteis
// por padrão; a API manda o valor em cada horário).
// Padrão da tela de alunos: filtros numa linha, contagem, tabela e Ações ⋯. Agrupada por horário, na ordem de quem marcou primeiro.
const categorias={A:'Moto',B:'Carro',D:'Ônibus'},principal='op-button op-button-primary',DIAS=14;
const plural=(n,um,varios)=>n+' '+(n===1?um:varios);
const aulaTexto=a=>formatarData(a.data)+' às '+a.inicio;
const dicaPrazo=prazo=>'O aluno não tem aula que possa ser remarcada: só dá para remarcar aulas com '+prazo+' horas úteis de antecedência.';
export async function montarAntecipacaoPainel(host,servico,root){
 host.antecipacaoController?.abort();const controller=new AbortController();host.antecipacaoController=controller;
 if(!document.querySelector('[data-css-antecipacao]')){const l=el('link');l.rel='stylesheet';l.href=new URL('../css/antecipacao.css',import.meta.url);l.dataset.cssAntecipacao='';document.head.append(l);}
 host.classList.add('sipa-antecipacao');const op=servico.identidade,hoje=hojeBrasil();let liberados=[],revisao=0;
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
 const textoAjuda=prazo=>'Horários ocupados que vagaram, com os alunos que marcaram interesse (quem marcou primeiro aparece primeiro). Ligue para o aluno e remarque uma aula dele que esteja a pelo menos '+(prazo?prazo+' horas úteis':'o prazo de cancelamento da autoescola')+'.';
 const ajuda=el('p',textoAjuda(),'adm-nota');
 const quantidade=el('p',undefined,'op-help');quantidade.dataset.antContagem='';const retorno=el('p',undefined,'ant-retorno');retorno.setAttribute('role','status');const lista=el('div');
 host.replaceChildren(card('Antecipação de aulas',ajuda,barra,retorno,quantidade,lista));
 const avisar=()=>root.dispatchEvent(new Event('sipa-antecipacao-atualizada'));
 async function consultar(){
  const pedido=++revisao;retorno.textContent='';
  if(!filtros.de.value||!filtros.ate.value||filtros.de.value>filtros.ate.value||filtros.ate.value>somarDias(filtros.de.value,DIAS)){liberados=[];retorno.textContent='Informe um período de até '+DIAS+' dias.';desenhar();return;}
  lista.replaceChildren(el('p','Consultando horários…','op-help'));
  try{const r=await servico.consultarLiberados({unidade:filtros.unidade.value,categoria:filtros.categoria.value,de:filtros.de.value,ate:filtros.ate.value});if(pedido!==revisao)return;liberados=r;if(r[0]?.prazo)ajuda.textContent=textoAjuda(r[0].prazo);}
  catch(e){if(pedido!==revisao)return;liberados=[];retorno.textContent=e.message;}
  desenhar();
 }
 function visiveis(){
  const termo=filtros.busca.value.trim().toLocaleLowerCase('pt-BR'),numeros=termo.replace(/\D/g,'');
  const combina=i=>!termo||i.aluno.toLocaleLowerCase('pt-BR').includes(termo)||numeros&&String(i.telefone).replace(/\D/g,'').includes(numeros);
  return liberados.map(h=>({...h,interessados:h.interessados.filter(combina)})).filter(h=>h.interessados.length);
 }
 function desenhar(){
  const horarios=visiveis();quantidade.textContent=plural(horarios.length,'horário liberado','horários liberados');
  const wrap=el('div',undefined,'op-table-scroll'),tabela=el('table',undefined,'op-table ant-tabela'),head=el('thead'),tr=el('tr'),colunas=['Aluno','Telefone','Interesse desde','Situação','Aula a antecipar','Ações'];
  wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label','Horários liberados com alunos interessados');
  for(const c of colunas){const th=el('th',c);th.scope='col';tr.append(th);}head.append(tr);tabela.append(head);
  for(const h of horarios){
   const grupo=el('tbody',undefined,'ant-grupo'),cab=el('tr',undefined,'ant-grupo-cabecalho'),th=el('th');th.colSpan=colunas.length;th.scope='colgroup';
   th.append(el('strong',formatarData(h.data)+' · '+h.inicio+'–'+h.fim),el('span',' · '+(h.unidadeNome||nomeUnidadeInstitucional(h.unidade))+' · '+(categorias[h.categoria]||'Categoria')+' — '+h.categoria+' · '+plural(h.pares.length,'par livre','pares livres')));
   cab.append(th);grupo.append(cab);
   for(const i of h.interessados){
    const linha=el('tr'),nome=el('strong',i.aluno),situacao=el('span',i.situacao,'ant-situacao'),noPrazo=i.aulas.filter(a=>a.dentroPrazo),podeRemarcar=noPrazo.length&&h.pares.length;
    linha.dataset.antInteresse=i.id;situacao.dataset.situacao=i.situacao;if(i.contatadoEm||i.observacao)situacao.title=[i.contatadoEm&&'Contatado em '+dataRelatorio(i.contatadoEm),i.observacao].filter(Boolean).join(' · ');
    const aula=noPrazo.length?aulaTexto(noPrazo[0])+(noPrazo.length>1?' (+'+(noPrazo.length-1)+')':''):i.aulas.length?'Fora do prazo ('+Math.min(...i.aulas.map(a=>a.horasUteis??0))+' h úteis)':'Nenhuma aula futura';
    const menu=menuAcoes(i.aluno,[['Marcar contatado',()=>contatar(h,i)],['Remarcar…',podeRemarcar&&(()=>remarcar(h,i)),undefined,h.pares.length?dicaPrazo(h.prazo):'Sem instrutor e veículo livres neste horário.'],['Descartar',()=>descartar(h,i)]]);menu.gatilho.dataset.antAcoes=i.id;
    for(const [k,v] of [['Aluno',nome],['Telefone',formatarTelefone(i.telefone)],['Interesse desde',i.marcadoEm?dataRelatorio(i.marcadoEm):'Não informado'],['Situação',situacao],['Aula a antecipar',aula],['Ações',menu.caixa]]){const td=el('td');td.dataset.rotulo=k;td.append(v instanceof Node?v:document.createTextNode(v));linha.append(td);}
    if(!noPrazo.length)linha.querySelector('[data-rotulo="Aula a antecipar"]').title=dicaPrazo(h.prazo);
    grupo.append(linha);
   }
   tabela.append(grupo);
  }
  if(!horarios.length){const b=el('tbody'),r=el('tr'),td=el('td','Nenhum horário liberado com aluno interessado.','op-demo-no-results');td.colSpan=colunas.length;r.append(td);b.append(r);tabela.append(b);}
  wrap.append(tabela);lista.replaceChildren(wrap);
 }
 // Diálogo curto das ações: título, resumo, campos e Confirmar. Fecha e recarrega a lista quando dá certo.
 function dialogo(titulo,id,conteudo,rotulo,executar){
  const d=modal(root,titulo,id),f=el('form',undefined,'adm-form'),erro=el('p',undefined,'op-acompanhamento-erro'),rodape=el('footer',undefined,'op-dialog-actions'),confirmar=el('button',rotulo,principal);let ocupado=false;
  d.classList.add('adm-dialog','ant-dialogo');erro.setAttribute('role','alert');confirmar.type='submit';const voltar=botao('Voltar',()=>{if(!ocupado)d.close();});rodape.append(voltar,confirmar);f.append(...conteudo,erro,rodape);d.append(f);
  f.onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;confirmar.disabled=true;voltar.disabled=true;erro.textContent='';
   try{const texto=await executar();d.close();mostrarToast(texto);avisar();await consultar();}catch(x){erro.textContent=x.message||'Não foi possível concluir a operação.';}finally{ocupado=false;confirmar.disabled=false;voltar.disabled=false;}};
  d.oncancel=e=>{if(ocupado)e.preventDefault();};d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();return d;
 }
 const resumo=(h,i)=>el('p',i.aluno+' · '+formatarData(h.data)+' · '+h.inicio+'–'+h.fim+' · '+(h.unidadeNome||nomeUnidadeInstitucional(h.unidade))+' · Categoria '+h.categoria,'op-help');
 function observacao(valor=''){const t=el('textarea');t.name='observacao';t.rows=3;t.maxLength=500;t.value=valor;return t;}
 function contatar(h,i){const obs=observacao(i.observacao);dialogo('Marcar contatado','antContato',[resumo(h,i),campo('Observação (opcional)',obs)],'Confirmar',async()=>{await servico.marcarContatado(i.id,obs.value);return 'Contato registrado.';});}
 function descartar(h,i){const obs=observacao();dialogo('Descartar interesse','antDescarte',[resumo(h,i),el('p','O aluno sai da lista deste horário. As aulas dele não mudam.','op-help'),campo('Observação (opcional)',obs)],'Descartar',async()=>{await servico.descartarInteresse(i.id,obs.value);return 'Interesse descartado.';});}
 function remarcar(h,i){
  const chave=crypto.randomUUID(),aulas=el('fieldset',undefined,'ant-aulas'),par=select(h.pares.map((p,n)=>[String(n),p.instrutor+' · '+p.veiculo]),'0');par.name='par';
  aulas.append(el('legend','Aula que será desmarcada'));
  for(const a of i.aulas){const r=entrada('radio',a.id);r.name='aula';r.required=true;r.disabled=!a.dentroPrazo;const l=el('label');l.append(r,document.createTextNode(aulaTexto(a)+(a.dentroPrazo?(a.horasUteis!=null?' · '+a.horasUteis+' h úteis':''):' · Fora do prazo ('+(a.horasUteis??0)+' h úteis)')));aulas.append(l);}
  const primeira=aulas.querySelector('input:not(:disabled)');if(primeira)primeira.checked=true;
  dialogo('Remarcar aula','antRemarcacao',[resumo(h,i),aulas,campo('Instrutor e veículo',par),el('p','A aula escolhida é desmarcada sem contar como desmarcação do aluno, e a nova é criada neste horário. O aluno recebe um aviso no SIPA.','op-help')],'Remarcar',async()=>{
   const aula=aulas.querySelector('input:checked')?.value,p=h.pares[Number(par.value)];if(!aula||!p)throw new Error('Escolha a aula a antecipar, o instrutor e o veículo.');
   await servico.remarcarInteresse(i.id,{aulaId:aula,instrutorId:p.instrutorId,veiculoId:p.veiculoId},chave);return 'Aula remarcada. O aluno recebeu o aviso.';});
 }
 window.addEventListener('focus',()=>{if(!host.hidden&&!root.querySelector('dialog[open]'))consultar();},{signal:controller.signal});
 await consultar();
}
