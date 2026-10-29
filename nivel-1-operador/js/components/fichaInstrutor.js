import {confirmarExclusao} from '../../../shared/components/excluirCadastro.js';
import {gerirSituacaoRecurso} from '../../../shared/components/formularioAdministrativo.js';
import {el,botao,campo,entrada,modal} from './uiOperador.js';
import {formatarData} from '../../../shared/js/calendario.js';
import {formatarCpf} from '../../../shared/js/formatacao.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {camposDetalhes,intervaloDoRecurso} from './detalhesRecurso.js';

export function abrirFichaInstrutor(raiz,servico,id,{aoEditar}={}){
 const d=modal(raiz,'Detalhes do instrutor','opRecurso');d.classList.add('op-ficha-instrutor','op-resource-details');d.dataset.instrutorId=id;
 const resumo=el('header',undefined,'op-resource-summary'),corpo=el('div',undefined,'op-resource-content'),acoes=el('footer',undefined,'op-resource-actions'),cadastro=el('section',undefined,'op-resource-section'),totais=el('section',undefined,'op-resource-section op-instrutor-totais'),desempenho=el('section',undefined,'op-resource-section'),metricas=el('div',undefined,'op-instrutor-indicadores'),hist=el('section',undefined,'op-resource-section'),lista=el('div',undefined,'op-table-scroll'),erro=el('p',undefined,'op-acompanhamento-erro');erro.setAttribute('role','alert');
 const filtros=el('div',undefined,'op-resource-tabs');filtros.setAttribute('aria-label','Período de desempenho');const form=el('form',undefined,'op-instrutor-filtros'),inicio=entrada('date'),fim=entrada('date');inicio.required=fim.required=true;inicio.dataset.instrutorInicio='';fim.dataset.instrutorFim='';
 const consultar=el('button','Consultar período','op-button op-button-outline');consultar.type='submit';form.append(campo('Desde',inicio),campo('Até',fim),consultar);form.hidden=true;
 let modo='hoje',versao=0;
 for(const [valor,texto] of [['hoje','Hoje'],['semana','Semana'],['mes','Mês'],['periodo','Período personalizado']]){const b=botao(texto,()=>{modo=valor;form.hidden=modo!=='periodo';carregar();});b.dataset.instrutorPeriodo=valor;filtros.append(b);}
 const periodoAtual=el('p',undefined,'op-instrutor-periodo-atual');desempenho.append(el('h3','Desempenho do instrutor'),filtros,form,periodoAtual,metricas,erro);hist.classList.add('op-instrutor-historico');hist.append(el('h3','Histórico de aulas'),lista);corpo.append(resumo,cadastro,desempenho,totais,hist);d.append(corpo,acoes);
 form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())carregar();};
 async function carregar(){const ticket=++versao;erro.textContent='';try{
  const dados=await servico.detalhesInstrutor(id,{modo,...(modo==='periodo'?{inicio:inicio.value,fim:fim.value}:{})});if(ticket!==versao||!d.open)return;
  const i=dados.instrutor,identificacao=i.cpf||i.documento||i.identificacao||'N\u00e3o informada',cpf=/^[\d.\-\s]+$/.test(identificacao)&&identificacao.replace(/\D/g,'').length===11;
  const situacao=i.ativo?(i.disponivel===false?'Indispon\u00edvel':'Ativo'):'Inativo',meta=el('div',undefined,'op-resource-meta'),estado=el('span',situacao,'op-resource-state');estado.dataset.situacao=situacao;meta.append(el('span','Categoria '+(i.categorias?.join(' + ')||'n\u00e3o informada')),estado);resumo.replaceChildren(el('h3',i.nome),meta);
  cadastro.replaceChildren(el('h3','Informa\u00e7\u00f5es do instrutor'),camposDetalhes([[cpf?'CPF':'Identifica\u00e7\u00e3o',cpf?formatarCpf(identificacao):identificacao],...(i.identificacao&&i.identificacao!==identificacao?[['Identifica\u00e7\u00e3o',i.identificacao]]:[]),['Unidade vinculada',nomeUnidadeInstitucional(i.unidade)],['Hor\u00e1rio de almo\u00e7o',intervaloDoRecurso(i)||'Configura\u00e7\u00e3o pendente'],['Ve\u00edculo vinculado',dados.veiculos.map(v=>v.nome+(v.placa?' \u00b7 '+v.placa:'')).join('; ')||'Sem ve\u00edculo vinculado']]));
  acoes.replaceChildren();if(servico.identidade.nivel===3&&servico.identidade.permissoes.includes('excluir-cadastro')&&servico.excluirCadastro)acoes.append(botao('Excluir',()=>confirmarExclusao(raiz,servico,'instrutor',i,()=>location.reload())));if(aoEditar&&servico.identidade.permissoes.includes('editar-instrutor'))acoes.append(botao('Editar instrutor',()=>aoEditar(i,d),'op-button op-button-primary'));
  if(servico.situacaoRecurso&&servico.identidade.permissoes.includes('gerenciar-situacao'))acoes.append(botao('Gerenciar situa\u00e7\u00e3o',()=>gerirSituacaoRecurso(raiz,servico,i,carregar)));
  const conclusoes=camposDetalhes([['Hoje',String(dados.totais.hoje.concluidas)],['Semana',String(dados.totais.semana.concluidas)],['M\u00eas',String(dados.totais.mes.concluidas)],['Total',String(dados.total)]]);conclusoes.classList.add('op-instrutor-total-grid');totais.replaceChildren(el('h3','Aulas conclu\u00eddas'),conclusoes);
  periodoAtual.textContent=formatarData(dados.periodo.inicio)+' a '+formatarData(dados.periodo.fim);
  metricas.replaceChildren();for(const [titulo,n,chave] of [['Aulas realizadas',dados.concluidas,'concluidas'],['Presenças',dados.presencas,'presencas'],['Faltas',dados.faltas,'faltas']]){const card=el('article'),valor=el('strong',String(n));valor.dataset.instrutorIndicador=chave;card.append(el('span',titulo),valor);metricas.append(card);}
  for(const b of filtros.children)b.setAttribute('aria-pressed',String(b.dataset.instrutorPeriodo===modo));
  if(modo!=='periodo'){inicio.value=dados.periodo.inicio;fim.value=dados.periodo.fim;}
  lista.replaceChildren();if(!dados.historico.length){lista.append(el('p','Nenhuma aula encontrada neste per\u00edodo.','op-help'));return;}
  const table=el('table',undefined,'op-table'),head=el('thead'),tr=el('tr'),body=el('tbody');for(const titulo of ['Data','Horário','Aluno','Categoria','Veículo','Unidade','Resultado']){const th=el('th',titulo);th.scope='col';tr.append(th);}head.append(tr);
  for(const a of dados.historico){const row=el('tr');row.dataset.instrutorAula=a.id;for(const texto of [formatarData(a.data),a.inicio+'–'+a.fim,a.alunoNome,a.categoria,a.veiculoNome,nomeUnidadeInstitucional(a.unidade),a.status===5?'Presença':'Falta']){const td=el('td',texto);td.dataset.label=['Data','Hor\u00e1rio','Aluno','Categoria','Ve\u00edculo','Unidade','Resultado'][row.children.length];row.append(td);}body.append(row);}table.append(head,body);lista.append(table);
 }catch(e){if(ticket===versao)erro.textContent=e.message;}}
 const atualizar=e=>{if(e.key==='sipa.operador.demo.v2')carregar();};window.addEventListener('storage',atualizar);d.addEventListener('close',()=>{versao++;window.removeEventListener('storage',atualizar);d.remove();},{once:true});d.showModal();carregar();return d;
}
