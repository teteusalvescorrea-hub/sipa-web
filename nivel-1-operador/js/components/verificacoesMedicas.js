import {montarHistoricoMedico} from '../../../shared/components/historicoMedico.js';
import {situacaoMedica} from '../../../shared/components/situacaoMedica.js';
import {agoraBrasil} from '../../../shared/js/calendario.js';
import {el,botao,campo,entrada,select,modal} from './uiOperador.js';
import {STATUS_MEDICO} from '../../../shared/js/solicitacoesMedicas.js';
import {formatarCpf,ativarMascaraCpf} from '../../../shared/js/formatacao.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {nomeLocalDaReserva} from '../../../shared/components/localAula.js';
const data=v=>v?new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'}):'Não informado';
export function montarVerificacoesMedicas(raiz,painel,servico,executar,tabela){
 const metricas=el('div',undefined,'op-medical-metrics'),form=el('form',undefined,'op-medical-filters op-form-fields'),lista=el('div'),paginas=el('nav',undefined,'op-local-pagination');paginas.setAttribute('aria-label','Páginas das solicitações médicas');
 const busca=entrada('search'),status=select([['','Todos'],...Object.entries(STATUS_MEDICO)]),unidade=select([['','Todas as autorizadas']]),inicio=entrada('date'),fim=entrada('date');busca.placeholder='Nome ou CPF';ativarMascaraCpf(busca,{permitirNome:true});
 for(const [id,titulo,n] of [['busca','Buscar aluno',busca],['status','Status da solicitação',status],['unidade','Unidade-base do aluno',unidade],['inicio','Solicitações desde',inicio],['fim','Solicitações até',fim]]){n.dataset.medicalFilter=id;form.append(campo(titulo,n));}
 const erroFiltros=el('p');erroFiltros.setAttribute('role','status');const filtrar=botao('Pesquisar',()=>{pagina=1;renderizar();});filtrar.type='submit';form.append(filtrar);form.onsubmit=e=>{e.preventDefault();pagina=1;renderizar();};for(const n of [status,unidade,inicio,fim])n.onchange=()=>{pagina=1;renderizar();};
 const card=el('article',undefined,'op-card');card.append(el('h2','Solicitações médicas'),el('p','Atestados locais de teste. A recepção analisa e encaminha; somente a futura gerência poderá decidir sobre créditos.','op-help'),form,erroFiltros,lista,paginas);painel.replaceChildren(metricas,card);
 let registros=[],pagina=1,atual=null,url=null;
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
  corpo.append(resumo,documento,el('p','Observações do aluno: '+(s.observacoes||'Não informadas')),campo('Parecer da recepção',parecer),erro,acoes,montarHistoricoMedico(s,{aluno,responsaveis:[servico.identidade]}));
  if(s.parecer)corpo.append(el('p','Encaminhado pela recep\u00e7\u00e3o \u00b7 '+data(s.parecer.em),'op-help'));
  if(!d.open)d.showModal();
  try{const arquivo=await servico.documentoMedico(s.id);if(!d.open||atual!==s.id)return;url=URL.createObjectURL(arquivo);documento.replaceChildren(el('h3','Atestado enviado'));
   if(arquivo.type.startsWith('image/')){const img=el('img');img.src=url;img.alt='Atestado enviado pelo aluno';await img.decode();if(!d.open||atual!==s.id)return;documento.append(img);}
   const abrir=el('a',arquivo.type==='application/pdf'?'Abrir PDF em nova aba':'Abrir imagem em nova aba');abrir.href=url;abrir.target='_blank';abrir.rel='noopener noreferrer';abrir.dataset.medicalDocument='';documento.append(abrir);encaminhar.disabled=s.status!=='recepcao';
  }catch(e){if(d.open&&atual===s.id){documento.replaceChildren(el('h3','Documento indisponível'),el('p',e.message));erro.textContent='Não é possível encaminhar sem consultar o documento original.';}}
 }
 function renderizar(){
  metricas.replaceChildren(...[['Aguardando análise',registros.filter(r=>r.solicitacao.status==='recepcao').length],['Encaminhadas à gerência',registros.filter(r=>r.solicitacao.status==='gerencia').length],['Concluídas',registros.filter(r=>['aprovado','rejeitado'].includes(r.solicitacao.status)).length]].map(([titulo,n])=>{const c=el('article',undefined,'op-card');c.append(el('span',titulo),el('strong',String(n)));return c;}));
  if(inicio.value&&fim.value&&inicio.value>fim.value){erroFiltros.textContent='A data inicial deve ser anterior ou igual à final.';lista.replaceChildren();paginas.replaceChildren();return;}erroFiltros.textContent='';
  const termo=busca.value.trim().toLocaleLowerCase('pt-BR'),cpf=termo.replace(/\D/g,''),numerico=/^[\d.\-\s]+$/.test(termo);
  const filtrados=registros.filter(r=>(!termo||(numerico?r.aluno.cpf.includes(cpf):r.aluno.nome.toLocaleLowerCase('pt-BR').includes(termo)))&&(!status.value||r.solicitacao.status===status.value)&&(!unidade.value||r.unidadeBase===unidade.value)&&(!inicio.value||agoraBrasil(new Date(r.solicitacao.criadaEm)).slice(0,10)>=inicio.value)&&(!fim.value||r.solicitacao.criadaEm.slice(0,10)<=fim.value)).sort((a,b)=>b.solicitacao.criadaEm.localeCompare(a.solicitacao.criadaEm));
  const total=Math.ceil(filtrados.length/10);pagina=Math.max(1,Math.min(pagina,total||1));lista.replaceChildren(tabela(['Aluno','Categoria','Aula cancelada','Unidade / local','Solicitação','Situação','Ação'],filtrados.slice((pagina-1)*10,pagina*10).map(r=>{const b=botao(r.solicitacao.status==='recepcao'?'Analisar':'Visualizar',()=>analisar(r));b.dataset.medicalAnalyze=r.solicitacao.id;return [r.aluno.nome,r.aula.categoria,r.aula.data.split('-').reverse().join('/')+' · '+r.aula.inicio,nomeLocalDaReserva(r.aula),data(r.solicitacao.criadaEm),situacaoMedica(r.solicitacao),b];}),'Nenhuma solicitação médica nos filtros selecionados.'));
  paginas.replaceChildren();for(let p=1;p<=total;p++){if(total<=1)break;const b=botao(String(p),()=>{pagina=p;renderizar();});b.setAttribute('aria-current',p===pagina?'page':'false');paginas.append(b);}
 }
 return {atualizar(dados){registros=dados.solicitacoesMedicas||[];const anterior=unidade.value;unidade.replaceChildren(...[['','Todas as autorizadas'],...[...new Set(registros.map(r=>r.unidadeBase).filter(Boolean))].map(u=>[u,nomeUnidadeInstitucional(u)])].map(([id,nome])=>new Option(nome,id)));unidade.value=anterior;renderizar();}};
}
