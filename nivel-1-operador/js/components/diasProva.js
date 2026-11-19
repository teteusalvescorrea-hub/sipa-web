// Fase 6 (3.4): os dias de prova prática. A Gerência define o máximo de alunos por período (manhã e tarde) e reserva o
// veículo da prova, que sai da agenda só naquele dia. A conta dos agendados vem das provas agendadas na ficha.
// 13/11/2026 (pedido do usuário): saiu do fim da Agenda e virou a seção "Provas" do menu (Recepção, Gerência e Master), em
// dois blocos: "Marcar dia de prova" (o formulário) e "Próximos dias de prova" (a lista, com o dia da semana, a ocupação,
// o instrutor e o veículo da prova e "Editar", que traz o dia de volta para o formulário).
// 13/11/2026: a prova prática é só pela manhã, até 11:00. O instrutor e o veículo que vão para a prova ficam fora da agenda
// até 13:00 desse dia (de manhã não há como agendar com eles) e o expediente deles volta ao normal às 13:00.
import {el,botao,campo,select,entrada,mostrarToast} from './uiOperador.js';
import {formatarData,hojeBrasil} from '../../../shared/js/calendario.js';
import {nomeDoVeiculo} from '../../../shared/js/formatacao.js';
import {NOMES_CATEGORIA} from '../../../shared/js/categorias.js';
import {avisarErro} from '../../../shared/components/confirmarAcao.js';

// "3 de 8" ou "3 · sem limite", com o alerta quando lotou.
const ocupacao=(agendados,max)=>{const s=el('span',max==null?agendados+' · sem limite':agendados+' de '+max,'op-dias-prova-ocupacao');if(max!=null&&agendados>=max){s.classList.add('op-dias-prova-lotado');s.title='Lotado';}return s;};
const diaDaSemana=data=>{const d=new Date(data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'});return d.charAt(0).toUpperCase()+d.slice(1);};
const porNome=(a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR');

// O veículo da prova: um grupo por categoria (moto, carro, ônibus), em ordem de modelo e placa, com a placa no nome.
function seletorVeiculo(veiculos){
 const s=select([['','Sem veículo']]);
 for(const c of ['A','B','D']){const doGrupo=veiculos.filter(v=>v.categoria===c).sort((a,b)=>porNome(a,b)||String(a.placa).localeCompare(String(b.placa)));if(!doGrupo.length)continue;
  const g=document.createElement('optgroup');g.label=(NOMES_CATEGORIA[c]||c)+' · '+doGrupo.length;g.append(...doGrupo.map(v=>new Option(nomeDoVeiculo(v.nome||v.modelo,v.placa),v.id)));s.append(g);}
 return s;
}
// O instrutor da prova: os ativos, em ordem de nome.
function seletorInstrutor(instrutores){
 return select([['','Sem instrutor'],...[...instrutores].sort(porNome).map(i=>[i.id,i.nome])]);
}

export function cartaoDiasProva(servico,{veiculos=[],instrutores=[],executar}={}){
 const raiz=el('div',undefined,'op-provas');raiz.dataset.opDiasProva='';
 // Bloco 1: marcar (ou alterar) um dia de prova.
 const marcar=el('section',undefined,'op-card op-dias-prova'),cabecalho=el('div',undefined,'op-card-heading'),textos=el('div');
 // 16/11/2026 (pedido do usuário): textos curtos, sem repetir o subtítulo da página, e as regras do dia em duas etiquetas.
 textos.append(el('h2','Marcar dia de prova'),el('p','Escolha a data e, se quiser, o limite de alunos, o instrutor e o veículo que vão para a prova.'));
 const regras=el('div',undefined,'op-dias-prova-regras');regras.append(el('span','Prova só de manhã, até 11:00'),el('span','Instrutor e veículo fora da agenda até 13:00'),el('span','Aulas deles na manhã são canceladas e o aluno avisado'));textos.append(regras);
 cabecalho.append(textos);marcar.append(cabecalho);
 const f=el('form',undefined,'op-form-fields op-dias-prova-form'),data=entrada('date',hojeBrasil()),manha=entrada('number',''),instrutor=seletorInstrutor(instrutores),veiculo=seletorVeiculo(veiculos);
 data.min=hojeBrasil();data.required=true;data.name='data';manha.min='0';manha.max='200';manha.placeholder='Sem limite';manha.name='maxManha';instrutor.name='instrutorId';veiculo.name='veiculoId';
 instrutor.dataset.opInstrutorProva='';veiculo.dataset.opVeiculoProva='';
 // Escolhido um dos dois, o outro vem junto se estiver vazio: o veículo do instrutor, ou o instrutor do veículo.
 instrutor.addEventListener('change',()=>{if(veiculo.value||!instrutor.value)return;const i=instrutores.find(x=>x.id===instrutor.value),id=(i?.veiculoIds||[]).find(v=>veiculos.some(x=>x.id===v));if(id)veiculo.value=id;});
 veiculo.addEventListener('change',()=>{if(instrutor.value||!veiculo.value)return;const v=veiculos.find(x=>x.id===veiculo.value),id=v?.instrutorId||instrutores.find(i=>(i.veiculoIds||[]).includes(veiculo.value))?.id;if(id&&instrutores.some(i=>i.id===id))instrutor.value=id;});
 const salvar=el('button','Salvar dia de prova','op-button op-button-primary');salvar.type='submit';
 const acoes=el('div',undefined,'op-dias-prova-acoes');acoes.append(el('p','Limite em branco: sem limite. Se a data já tiver prova, salvar atualiza o dia.','op-help'),salvar);
 f.append(campo('Data da prova',data),campo('Limite de alunos',manha),campo('Instrutor da prova',instrutor),campo('Veículo da prova',veiculo),acoes);
 marcar.append(f);
 // Bloco 2: os dias já marcados.
 const proximos=el('section',undefined,'op-card op-dias-prova op-dias-prova-proximos'),cab2=el('div',undefined,'op-card-heading'),textos2=el('div'),contador=el('span','Próximos 60 dias','op-badge'),corpo=el('div');
 textos2.append(el('h2','Próximos dias de prova'),el('p','"Editar" leva o dia para o formulário acima; "Liberar" devolve o instrutor ou o veículo à agenda.'));
 cab2.append(textos2,contador);proximos.append(cab2,corpo);
 raiz.append(marcar,proximos);

 let ocupado=false,diasAtuais=[];
 const rodar=async(tarefa,textoBase)=>{if(ocupado)return;ocupado=true;salvar.disabled=true;try{await tarefa();const texto=typeof textoBase==='function'?textoBase():textoBase;if(executar)await executar(async()=>{},texto);else mostrarToast(texto);await carregar();}catch(e){avisarErro(e?.message||'Não foi possível concluir.');}finally{ocupado=false;salvar.disabled=false;}};
 // 17/11/2026 (pedido do usuário): reservar o instrutor ou o veículo da prova cancela as aulas deles na manhã (antes das
 // 13:00), com o crédito devolvido, e os alunos recebem a mensagem da diretoria (a API faz isso); aqui só o resumo.
 let canceladas=0;
 f.onsubmit=e=>{e.preventDefault();if(!f.reportValidity())return;canceladas=0;rodar(async()=>{
  const dia=data.value,atual=diasAtuais.find(d=>String(d.data).slice(0,10)===dia),avisos=[];
  await servico.definirDiaProva(dia,{maxManha:manha.value,maxTarde:''});
  // O que já está reservado nesse dia não é reservado de novo (o "Editar" traz os atuais).
  if(instrutor.value&&!atual?.instrutores?.some(i=>i.motoristaId===instrutor.value)){const r=await servico.reservarInstrutorProva(dia,instrutor.value);canceladas+=Number(r?.aulasCanceladas)||0;const i=r?.instrutores?.find(x=>x.motoristaId===instrutor.value);if(i?.aulasNoDia)avisos.push('O instrutor tem '+i.aulasNoDia+' aula(s) antes das 13:00 neste dia que não puderam ser canceladas.');}
  if(veiculo.value&&!atual?.veiculos?.some(v=>v.veiculoId===veiculo.value)){const r=await servico.reservarVeiculoProva(dia,veiculo.value);canceladas+=Number(r?.aulasCanceladas)||0;const v=r?.veiculos?.find(x=>x.veiculoId===veiculo.value);if(v?.aulasNoDia)avisos.push('O veículo tem '+v.aulasNoDia+' aula(s) antes das 13:00 neste dia que não puderam ser canceladas.');}
  if(avisos.length)avisarErro(avisos.join(' ')+' Remaneje essas aulas (na frota, "Realocar alunos").',{titulo:'Aulas na manhã da prova'});
 },()=>'Dia de prova salvo.'+(canceladas?' '+canceladas+(canceladas===1?' aula da manhã foi cancelada':' aulas da manhã foram canceladas')+' com o crédito devolvido, e os alunos receberam a mensagem da diretoria.':''));};

 function editar(d){data.value=String(d.data).slice(0,10);manha.value=d.maxManha??'';instrutor.value=d.instrutores?.[0]?.motoristaId||'';veiculo.value=d.veiculos?.[0]?.veiculoId||'';marcar.scrollIntoView({behavior:'smooth',block:'start'});manha.focus({preventScroll:true});}

 // Um item reservado (instrutor ou veículo), com as aulas a remanejar e "Liberar".
 function reservado(texto,aulas,liberar,marca){const linha=el('div',undefined,'op-dias-prova-veiculo');linha.append(el('span',texto||''));if(aulas)linha.append(el('span',aulas+' aula(s) a remanejar','op-checklist-alerta'));const tirar=botao('Liberar',liberar,'op-link');tirar.dataset[marca[0]]=marca[1];linha.append(tirar);return linha;}

 async function carregar(){
  let dias;try{dias=await servico.diasProva({});}catch(e){corpo.replaceChildren(el('p',e.message,'op-help'));return;}
  diasAtuais=dias;
  contador.textContent=dias.length?dias.length+(dias.length===1?' dia marcado':' dias marcados')+' · 60 dias':'Próximos 60 dias';
  if(!dias.length){const vazio=el('div',undefined,'op-dias-prova-vazio');vazio.append(el('strong','Nenhum dia de prova marcado'),el('span','Os dias que você salvar acima aparecem aqui.'));corpo.replaceChildren(vazio);return;}
  const rolagem=el('div',undefined,'op-table-scroll'),t=el('table',undefined,'op-table'),cab=el('tr'),tb=el('tbody');
  for(const h of ['Data','Alunos na prova','Instrutor da prova','Veículo da prova',''])cab.append(el('th',h));
  for(const d of dias){
   const dia=String(d.data).slice(0,10),tr=el('tr');tr.dataset.opDiaProva=d.data;
   const tdData=el('td');tdData.append(el('strong',formatarData(dia)),el('small',diaDaSemana(dia)+' · prova até 11:00','op-dias-prova-semana'));
   // Tentativa antiga sem período ou marcada à tarde também conta (a prova agora é só de manhã).
   const tdManha=el('td'),outros=(d.agendadosSemPeriodo||0)+(d.agendadosTarde||0);tdManha.append(ocupacao(d.agendadosManha+outros,d.maxManha));
   const tdInstrutor=el('td'),tdVeiculo=el('td');
   if(!(d.instrutores||[]).length)tdInstrutor.append(el('span','Nenhum','op-help'));
   for(const i of d.instrutores||[])tdInstrutor.append(reservado(i.instrutor,i.aulasNoDia,()=>rodar(()=>servico.liberarInstrutorProva(dia,i.motoristaId),'Instrutor liberado.'),['opLiberarInstrutorProva',i.motoristaId]));
   if(!(d.veiculos||[]).length)tdVeiculo.append(el('span','Nenhum','op-help'));
   for(const v of d.veiculos||[])tdVeiculo.append(reservado(v.veiculo,v.aulasNoDia,()=>rodar(()=>servico.liberarVeiculoProva(dia,v.veiculoId),'Veículo liberado.'),['opLiberarVeiculoProva',v.veiculoId]));
   const tdAcoes=el('td',undefined,'op-dias-prova-acoes-linha'),ed=botao('Editar',()=>editar(d),'op-button op-button-outline');ed.dataset.opEditarDiaProva=dia;tdAcoes.append(ed);
   // 18/11/2026: o dia vazio (sem aluno, instrutor e veículo) pode ser excluído (Gerência e Master).
   if(servico.excluirDiaProva&&(servico.identidade?.nivel||1)>=2&&!(d.agendadosManha+outros)&&!(d.instrutores||[]).length&&!(d.veiculos||[]).length){const ex=botao('Excluir dia',()=>rodar(()=>servico.excluirDiaProva(dia),'Dia de prova excluído.'),'op-button op-button-outline');ex.dataset.opExcluirDiaProva=dia;tdAcoes.append(ex);}
   tr.append(tdData,tdManha,tdInstrutor,tdVeiculo,tdAcoes);tb.append(tr);
  }
  const head=el('thead');head.append(cab);t.append(head,tb);rolagem.append(t);corpo.replaceChildren(rolagem);
 }
 carregar();
 return raiz;
}
