import {criarBuscaComSugestoes} from '../../../shared/components/buscaComSugestoes.js';
import {montarHistoricoMedico} from '../../../shared/components/historicoMedico.js';
import {situacaoMedica} from '../../../shared/components/situacaoMedica.js';
import {dataHoraBrasilia} from '../../../shared/js/calendario.js';
import {el,botao,campo,modal} from './uiOperador.js';
import {dataDecisaoMedica,solicitacaoDecidida,STATUS_MEDICO} from '../../../shared/js/solicitacoesMedicas.js';
import {formatarCpf,ativarMascaraCpf} from '../../../shared/js/formatacao.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {nomeLocalDaReserva} from '../../../shared/components/localAula.js';
import {ordenarLinhas,estadoOrdenacao} from '../../../shared/js/ordenacaoTabela.js';
const data=v=>v?dataHoraBrasilia(v):'Não informado';
export function montarVerificacoesMedicas(raiz,painel,servico,executar,tabela){
 const metricas=el('div',undefined,'op-medical-metrics'),form=el('form',undefined,'op-medical-filters op-form-fields'),lista=el('div'),paginas=el('nav',undefined,'op-local-pagination');paginas.setAttribute('aria-label','Páginas das solicitações médicas');
 // Busca com sugestões dos alunos da unidade (decisão do João em 03/11): ao focar ou digitar lista os alunos; escolher um
 // filtra as solicitações dele; texto solto continua filtrando por nome ou CPF.
 const sugestao=criarBuscaComSugestoes({placeholder:'Nome ou CPF',vazio:'Nenhum aluno encontrado.',aoEscolher:()=>{pagina=1;renderizar();}}),busca=sugestao.input;
 sugestao.elemento.dataset.medicalFilter='busca';form.append(campo('Nome do aluno ou CPF',sugestao.elemento));
 const erroFiltros=el('p');erroFiltros.setAttribute('role','status');busca.addEventListener('input',()=>{pagina=1;renderizar();});form.onsubmit=e=>{e.preventDefault();pagina=1;renderizar();};
 // Pendentes: ainda com a Recepção ou a Gerência. Histórico: aprovadas e reprovadas, como na tela da Gerência.
 const abas=el('div',undefined,'op-resource-tabs');abas.setAttribute('role','group');abas.setAttribute('aria-label','Visualização das solicitações médicas');
 const botoesAba={};for(const id of ['pendentes','historico']){const b=botao('',()=>{if(aba===id)return;aba=id;pagina=1;renderizar();});b.dataset.medicalAba=id;botoesAba[id]=b;abas.append(b);}
 const card=el('article',undefined,'op-card');card.append(el('h2','Solicitações médicas'),el('p','A AgIA envia os atestados direto para a Gerência, que decide sobre os créditos. Aqui você acompanha cada pedido.','op-help'),abas,form,erroFiltros,lista,paginas);painel.replaceChildren(metricas,card);
 let registros=[],pagina=1,atual=null,url=null,aba='pendentes';const ordem=estadoOrdenacao();
 const d=modal(raiz,'Analisar solicitação médica','opMedica'),corpo=el('div');d.classList.add('op-medical-dialog');d.append(corpo);
 const revogar=()=>{if(url){URL.revokeObjectURL(url);url=null;}};d.addEventListener('close',()=>{revogar();corpo.replaceChildren();atual=null;});
 async function analisar(r){
  try{r=await servico.solicitacaoMedica(r.solicitacao.id);}catch(e){erroFiltros.textContent=e.message;return;}
  revogar();atual=r.solicitacao.id;corpo.replaceChildren();const {aluno,aula,solicitacao:s}=r;
  d.querySelector('.op-dialog-heading h2').textContent=s.status==='recepcao'?'Analisar solicitação médica':'Visualizar solicitação médica';
  const resumo=el('dl',undefined,'op-fields');
  for(const [titulo,valor] of [['Nome completo',aluno.nome],['CPF',formatarCpf(aluno.cpf)],['Categoria do aluno',aluno.categoria],['Unidade principal',nomeUnidadeInstitucional(aluno.unidadePrincipal||aluno.unidade)],['Aula cancelada',aula.data.split('-').reverse().join('/')+' · '+aula.inicio+'–'+aula.fim],['Categoria da aula',aula.categoria],['Local da aula',nomeLocalDaReserva(aula)],['Instrutor',aula.instrutorNome],['Veículo',aula.veiculoNome],['Créditos envolvidos',String(s.creditosEnvolvidos)+' · retidos até decisão definitiva'],['Status',STATUS_MEDICO[s.status]||'Estado anterior preservado']]){const n=el('div');n.append(el('dt',titulo),el('dd',valor));resumo.append(n);}
  const documento=el('section',undefined,'op-medical-document'),erro=el('p');erro.setAttribute('role','alert');documento.append(el('h3','Atestado enviado'),el('p','Carregando documento…'));
  const parecer=el('textarea');parecer.rows=3;parecer.maxLength=2000;parecer.value=s.parecer?.texto||'';parecer.disabled=s.status!=='recepcao';parecer.dataset.medicalOpinion='';
  const encaminhar=botao('Encaminhar para gerência',async()=>{encaminhar.disabled=true;fechar.disabled=true;d.querySelector('.op-close').disabled=true;d.oncancel=e=>e.preventDefault();try{await executar(()=>servico.encaminharSolicitacaoMedica(s.id,parecer.value),'Solicitação encaminhada. Crédito permanece retido.',()=>d.close());}finally{if(d.open)encaminhar.disabled=s.status!=='recepcao';fechar.disabled=false;d.querySelector('.op-close').disabled=false;d.oncancel=null;}},'op-button op-button-primary');encaminhar.dataset.medicalForward='';encaminhar.disabled=true;
  const fechar=botao('Fechar',()=>d.close()),acoes=el('footer',undefined,'op-dialog-actions');acoes.append(fechar,encaminhar);
  encaminhar.hidden=s.status!=='recepcao';
  corpo.append(resumo,documento,el('p','Observações do envio: '+(s.observacoes||'Não informadas')),...(s.status==='recepcao'||s.parecer?.texto?[campo('Parecer da recepção',parecer)]:[]),erro,acoes,montarHistoricoMedico(s,{aluno,responsaveis:[servico.identidade]}));
  if(s.parecer)corpo.append(el('p','Encaminhado pela recep\u00e7\u00e3o \u00b7 '+data(s.parecer.em),'op-help'));
  if(!d.open)d.showModal();
  try{const arquivo=await servico.documentoMedico(s.id);if(!d.open||atual!==s.id)return;url=URL.createObjectURL(arquivo);documento.replaceChildren(el('h3','Atestado enviado'));
   if(arquivo.type.startsWith('image/')){const img=el('img');img.src=url;img.alt='Atestado enviado pelo aluno';await img.decode();if(!d.open||atual!==s.id)return;documento.append(img);}
   const abrir=el('a',arquivo.type==='application/pdf'?'Abrir PDF em nova aba':'Abrir imagem em nova aba');abrir.href=url;abrir.target='_blank';abrir.rel='noopener noreferrer';abrir.dataset.medicalDocument='';documento.append(abrir);encaminhar.disabled=s.status!=='recepcao';
  }catch(e){if(d.open&&atual===s.id){documento.replaceChildren(el('h3','Documento indisponível'),el('p',e.message));erro.textContent='Não é possível encaminhar sem consultar o documento original.';}}
 }
 function renderizar(){
  metricas.replaceChildren(...[['Aguardando análise',registros.filter(r=>r.solicitacao.status==='recepcao').length],['Na Gerência',registros.filter(r=>r.solicitacao.status==='gerencia').length],['Concluídas',registros.filter(r=>['aprovado','rejeitado'].includes(r.solicitacao.status)).length]].filter(([titulo,n])=>titulo!=='Aguardando análise'||n>0).map(([titulo,n])=>{const c=el('article',undefined,'op-card');c.append(el('span',titulo),el('strong',String(n)));return c;}));
  const historico=aba==='historico',totalHistorico=registros.filter(r=>solicitacaoDecidida(r.solicitacao)).length;
  for(const [id,nome,n] of [['pendentes','Pendentes',registros.length-totalHistorico],['historico','Histórico',totalHistorico]]){botoesAba[id].textContent=nome+' ('+n+')';botoesAba[id].setAttribute('aria-pressed',String(aba===id));}
  erroFiltros.textContent='';
  const termo=busca.value.trim().toLocaleLowerCase('pt-BR'),cpf=termo.replace(/\D/g,''),numerico=/^[\d.\-\s]+$/.test(termo);
  const escolhido=sugestao.valor;
  const momento=r=>String((historico&&dataDecisaoMedica(r.solicitacao))||r.solicitacao.criadaEm);
  const filtrados=registros.filter(r=>solicitacaoDecidida(r.solicitacao)===historico).filter(r=>(escolhido?r.aluno.id===escolhido:!termo||(numerico?r.aluno.cpf.includes(cpf):r.aluno.nome.toLocaleLowerCase('pt-BR').includes(termo)))).sort((a,b)=>momento(b).localeCompare(momento(a)));
  const total=Math.ceil(filtrados.length/10);pagina=Math.max(1,Math.min(pagina,total||1));lista.replaceChildren(tabela(['Aluno','Categoria','Aula cancelada','Unidade / local','Solicitação',...(historico?['Decidido em']:[]),'Situação','Ação'],ordenarLinhas(filtrados.map(r=>{const b=botao(r.solicitacao.status==='recepcao'?'Analisar':'Visualizar',()=>analisar(r));b.dataset.medicalAnalyze=r.solicitacao.id;return [r.aluno.nome,r.aula.categoria,r.aula.data.split('-').reverse().join('/')+' · '+r.aula.inicio,nomeLocalDaReserva(r.aula),data(r.solicitacao.criadaEm),...(historico?[data(dataDecisaoMedica(r.solicitacao))]:[]),situacaoMedica(r.solicitacao),b];}),ordem).slice((pagina-1)*10,pagina*10),historico?'Nenhuma decisão encontrada.':'Nenhuma solicitação pendente encontrada.',{estado:ordem,aoMudar:()=>{pagina=1;renderizar();}}));
  paginas.replaceChildren();for(let p=1;p<=total;p++){if(total<=1)break;const b=botao(String(p),()=>{pagina=p;renderizar();});b.setAttribute('aria-current',p===pagina?'page':'false');paginas.append(b);}
 }
 return {atualizar(dados){registros=dados.solicitacoesMedicas||[];sugestao.definirOpcoes((dados.alunos||[]).filter(a=>!a.somenteAgenda).map(a=>({id:a.id,nome:a.nome,cpf:a.cpf})));renderizar();}};
}
