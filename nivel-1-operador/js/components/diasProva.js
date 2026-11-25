// Fase 6 (3.4): os dias de prova prática. O instrutor e o veículo que vão para a prova saem da agenda só naquele dia.
// 13/11/2026: a prova prática é só pela manhã, até 11:00. O instrutor e o veículo ficam fora da agenda até 13:00 desse dia
// (de manhã não há como agendar com eles) e o expediente deles volta ao normal às 13:00.
// 25/11/2026 (pedido do usuário): tudo num bloco só, "Provas práticas". Sem limite de alunos: o sistema conta os alunos
// colocados. A Recepção marca a prova (data, instrutor e veículo) e coloca ou tira alunos; a Gerência (e o Master) também
// edita tudo (inclusive a data: alunos, instrutor e veículo vão junto) e exclui (desfaz tudo). Antes de gravar, a tela de
// conferência mostra a data por extenso, o instrutor, o veículo e as aulas da manhã que serão canceladas (a prévia da
// API), e o "Confirmar" só libera depois de marcar "Conferi".
import {el,botao,campo,select,entrada,modal,mostrarToast} from './uiOperador.js';
import {formatarData,hojeBrasil} from '../../../shared/js/calendario.js';
import {nomeDoVeiculo,formatarCpf} from '../../../shared/js/formatacao.js';
import {NOMES_CATEGORIA} from '../../../shared/js/categorias.js';
import {avisarErro,confirmarAcao} from '../../../shared/components/confirmarAcao.js';

// As provas práticas de cada categoria e a situação de cada aluno no dia.
const PRATICAS=Object.freeze([['A','praticaMoto','Prova prática · Moto'],['B','praticaCarro','Prova prática · Carro'],['D','praticaOnibus','Prova prática · Ônibus']]);
const semAcento=t=>String(t||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLowerCase();
const CLASSE_SITUACAO={Agendado:'op-badge',Aprovado:'op-badge op-badge-ok',Reprovado:'op-badge op-badge-erro',Faltou:'op-badge op-badge-erro'};
const porNome=(a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR');
const diaIso=d=>String(d?.data||d||'').slice(0,10);
const dataDe=dia=>new Date(dia+'T12:00:00');
const maiuscula=t=>t.charAt(0).toUpperCase()+t.slice(1);
const diaDaSemana=dia=>maiuscula(dataDe(dia).toLocaleDateString('pt-BR',{weekday:'long'}));
const porExtenso=dia=>maiuscula(dataDe(dia).toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}));
const faltam=dia=>Math.round((dataDe(dia)-dataDe(hojeBrasil()))/864e5);
const quando=dia=>{const n=faltam(dia);return n===0?'hoje':n===1?'amanhã':n>1?'daqui a '+n+' dias':'já passou';};
const plural=(n,um,varios)=>n+' '+(n===1?um:varios);

// O veículo da prova: um grupo por categoria (moto, carro, ônibus), em ordem de modelo e placa, com a placa no nome.
function seletorVeiculo(veiculos){
 const s=select([['','Sem veículo']]);
 for(const c of ['A','B','D']){const doGrupo=veiculos.filter(v=>v.categoria===c).sort((a,b)=>porNome(a,b)||String(a.placa).localeCompare(String(b.placa)));if(!doGrupo.length)continue;
  const g=document.createElement('optgroup');g.label=(NOMES_CATEGORIA[c]||c)+' · '+doGrupo.length;g.append(...doGrupo.map(v=>new Option(nomeDoVeiculo(v.nome||v.modelo,v.placa),v.id)));s.append(g);}
 return s;
}
const seletorInstrutor=instrutores=>select([['','Sem instrutor'],...[...instrutores].sort(porNome).map(i=>[i.id,i.nome])]);
// Escolhido um dos dois, o outro vem junto se estiver vazio: o veículo do instrutor, ou o instrutor do veículo.
function ligarPar(instrutor,veiculo,instrutores,veiculos){
 instrutor.addEventListener('change',()=>{if(veiculo.value||!instrutor.value)return;const i=instrutores.find(x=>x.id===instrutor.value),id=(i?.veiculoIds||[]).find(v=>veiculos.some(x=>x.id===v));if(id)veiculo.value=id;});
 veiculo.addEventListener('change',()=>{if(instrutor.value||!veiculo.value)return;const v=veiculos.find(x=>x.id===veiculo.value),id=v?.instrutorId||instrutores.find(i=>(i.veiculoIds||[]).includes(veiculo.value))?.id;if(id&&instrutores.some(i=>i.id===id))instrutor.value=id;});
}
// 25/11/2026: o instrutor ou o veículo que já está na prova e não veio na lista (inativo, de outra unidade) entra como
// opção, para o Editar não tirá-lo sem querer.
function garantirOpcao(s,id,texto){if(!id||[...s.options].some(o=>o.value===id))return;s.add(new Option((texto||'Atual')+' (atual)',id),1);}
const textoDoSelect=s=>s.value?s.selectedOptions[0]?.textContent||'':'';

// Uma linha do resumo da conferência: rótulo, valor e (opcional) o "antes".
function linhaResumo(rotulo,valor,{antes,alerta,nota}={}){
 const li=el('div',undefined,'op-prova-resumo-linha');li.append(el('span',rotulo,'op-prova-resumo-rotulo'));
 const v=el('div',undefined,'op-prova-resumo-valor');
 if(antes!=null&&antes!==valor){v.append(el('s',antes||'—','op-prova-resumo-antes'),el('strong',valor||'—'));li.classList.add('op-prova-resumo-mudou');}else v.append(el('strong',valor||'—'));
 if(nota)v.append(el('small',nota,'op-prova-resumo-nota'));if(alerta)v.append(el('small',alerta,'op-prova-resumo-alerta'));
 li.append(v);return li;
}
function listaDeAulas(aulas){
 const caixa=el('div',undefined,'op-prova-resumo-aulas');
 if(!aulas.length){caixa.append(el('p','Nenhuma aula da manhã será cancelada.','op-prova-resumo-ok'));return caixa;}
 caixa.classList.add('op-prova-resumo-aulas-alerta');
 caixa.append(el('p',plural(aulas.length,'aula da manhã será cancelada','aulas da manhã serão canceladas')+' (o crédito volta e o aluno recebe o aviso):'));
 const ul=el('ul');for(const a of aulas)ul.append(el('li',a.horario+' · '+a.aluno+' ('+a.recurso+')'));caixa.append(ul);return caixa;
}
function avisoDoDia(dia){const d=dataDe(dia).getDay();return d===0?'É domingo: confira se a data está certa.':d===6?'É sábado: confira se o Detran tem prova nesse dia.':faltam(dia)<=2?'Atenção: a prova é '+quando(dia)+'.':'';}

export function cartaoDiasProva(servico,{veiculos=[],instrutores=[],alunos=[],executar}={}){
 const gerencia=['gerencia','master'].includes(servico.identidade?.perfil);
 const raiz=el('section',undefined,'op-provas op-provas-bloco op-provas-pagina');raiz.dataset.opDiasProva='';raiz.dataset.opProvasGerencia=gerencia?'sim':'nao';

 // Topo no padrão da Agenda da Unidade (25/11/2026, pedido do usuário): os botões de ação lado a lado, direto na página.
 // "Histórico de provas" troca a lista pelas provas que já passaram (e volta com "Provas marcadas").
 const cab=el('div',undefined,'op-provas-topo-acoes'),contador=el('span','','op-provas-contador');
 const agendar=el('button','Agendar prova','op-button op-provas-acao');agendar.type='button';agendar.dataset.opAgendarProva='';
 const verHistorico=el('button','Histórico de provas','op-button op-provas-acao');verHistorico.type='button';verHistorico.dataset.opVerHistorico='';
 cab.append(agendar,verHistorico);

 // A tela do "Agendar prova" (25/11/2026, pedido do usuário): a categoria primeiro (moto, carro ou ônibus); o instrutor e o
 // veículo mostram só os da categoria; o veículo escolhido aparece com a placa no modelo Mercosul, para conferir na hora.
 const janela=modal(raiz,'Agendar prova','opJanelaAgendarProva');janela.classList.add('op-provas-janela');
 const nova=el('form',undefined,'op-provas-nova'),data=entrada('date',''),instrutor=select([['','Sem instrutor']]),veiculo=select([['','Sem veículo']]);
 data.min=hojeBrasil();data.required=true;data.name='data';instrutor.name='instrutorId';veiculo.name='veiculoId';instrutor.dataset.opInstrutorProva='';veiculo.dataset.opVeiculoProva='';
 const categorias=['A','B','D'].filter(c=>veiculos.some(v=>v.categoria===c));
 const categoriasDoInstrutor=i=>(i.categorias||[]).map(c=>String(c?.valor??c?.letra??c).toUpperCase());
 const temCategorias=instrutores.some(i=>categoriasDoInstrutor(i).length);
 let categoria=categorias.includes('B')?'B':categorias[0]||'';
 const grupoCategoria=el('div',undefined,'op-provas-categorias');grupoCategoria.setAttribute('role','radiogroup');grupoCategoria.setAttribute('aria-label','Categoria da prova');grupoCategoria.dataset.opCategoriaProva='';
 const botoesCategoria=categorias.map(c=>{const b=el('button',undefined,'op-provas-categoria');b.type='button';b.dataset.categoria=c;b.setAttribute('role','radio');
  const qtd=veiculos.filter(v=>v.categoria===c).length;b.append(el('strong',NOMES_CATEGORIA[c]||c),el('small',plural(qtd,'veículo','veículos')));
  b.addEventListener('click',()=>{if(categoria===c)return;categoria=c;aplicarCategoria(true);});return b;});
 grupoCategoria.append(...botoesCategoria);
 const dicaVeiculo=el('small','','op-provas-campo-dica'),dicaInstrutor=el('small','','op-provas-campo-dica');
 function aplicarCategoria(limpar){
  for(const b of botoesCategoria){const sim=b.dataset.categoria===categoria;b.classList.toggle('op-provas-categoria-ativa',sim);b.setAttribute('aria-checked',String(sim));}
  const antesI=limpar?'':instrutor.value,antesV=limpar?'':veiculo.value;
  const daCategoria=veiculos.filter(v=>v.categoria===categoria).sort((a,b)=>porNome(a,b)||String(a.placa).localeCompare(String(b.placa)));
  veiculo.replaceChildren(new Option('Sem veículo',''),...daCategoria.map(v=>new Option(nomeDoVeiculo(v.nome||v.modelo,v.placa),v.id)));
  const ensinam=temCategorias?instrutores.filter(i=>categoriasDoInstrutor(i).includes(categoria)):instrutores;
  instrutor.replaceChildren(new Option('Sem instrutor',''),...[...ensinam].sort(porNome).map(i=>new Option(i.nome,i.id)));
  if([...veiculo.options].some(o=>o.value===antesV))veiculo.value=antesV;if([...instrutor.options].some(o=>o.value===antesI))instrutor.value=antesI;
  dicaVeiculo.textContent=plural(daCategoria.length,'veículo','veículos')+' de '+(NOMES_CATEGORIA[categoria]||categoria).toLowerCase();
  dicaInstrutor.textContent=temCategorias?plural(ensinam.length,'instrutor que dá','instrutores que dão')+' aula de '+(NOMES_CATEGORIA[categoria]||categoria).toLowerCase():'';
  pintarFicha();
 }
 ligarPar(instrutor,veiculo,instrutores,veiculos);
 // O veículo escolhido em destaque: a placa (modelo Mercosul), o modelo, a categoria, o câmbio e o instrutor dele.
 const fichaVeiculo=el('div',undefined,'op-provas-ficha-veiculo');fichaVeiculo.hidden=true;fichaVeiculo.dataset.opFichaVeiculoProva='';
 function pintarFicha(){const v=veiculos.find(x=>x.id===veiculo.value);fichaVeiculo.hidden=!v;if(!v)return;
  const placa=el('div',undefined,'op-provas-placa');placa.setAttribute('aria-label','Placa '+String(v.placa||'').toUpperCase());
  const faixa=el('div',undefined,'op-provas-placa-faixa');faixa.append(el('span','BR','op-provas-placa-pais'),el('span','BRASIL'));
  placa.append(faixa,el('strong',String(v.placa||'—').toUpperCase().replace(/^([A-Z]{3})-?/,'$1')));
  const dados=el('div',undefined,'op-provas-ficha-dados'),dado=(rotulo,valor)=>{const d=el('div');d.append(el('small',rotulo),el('strong',valor||'—'));return d;};
  const dono=instrutores.find(i=>i.id===v.instrutorId)?.nome;
  dados.append(dado('Veículo',v.nome||v.modelo),dado('Categoria',NOMES_CATEGORIA[v.categoria]||v.categoria));
  if(v.tipoCambio)dados.append(dado('Câmbio',maiuscula(String(v.tipoCambio).toLowerCase())));
  dados.append(dado('Instrutor do veículo',dono||'Sem instrutor fixo'));
  fichaVeiculo.replaceChildren(placa,dados);}
 veiculo.addEventListener('change',pintarFicha);instrutor.addEventListener('change',()=>queueMicrotask(pintarFicha));
 // 25/11/2026 (pedido do usuário): o aviso do que acontece com as aulas marcadas com o instrutor ou o veículo da prova.
 const ajuda=el('div',undefined,'op-provas-aviso');ajuda.setAttribute('role','note');ajuda.dataset.opAvisoProva='';
 ajuda.append(el('strong','Aviso'),el('p','Se algum aluno tiver aula marcada com o instrutor ou o veículo da prova na manhã desse dia, a aula será cancelada e o aluno receberá o aviso automaticamente pelo chat da AgIA, informando que a aula voltou para o saldo dele.'+(gerencia?'':' Depois de marcada, só a Gerência troca a data, o instrutor ou o veículo.')));
 const cancelarNova=botao('Cancelar',()=>janela.close(),'op-button op-button-outline');
 const revisar=el('button','Revisar e marcar','op-button op-button-primary');revisar.type='submit';revisar.dataset.opRevisarProva='';
 const botoesNova=el('div',undefined,'op-provas-janela-botoes');botoesNova.append(cancelarNova,revisar);
 const campoCategoria=el('div',undefined,'op-provas-campo');campoCategoria.append(el('span','Categoria da prova','op-provas-rotulo'),grupoCategoria);
 const campoInstrutor=campo('Instrutor da prova',instrutor);campoInstrutor.append(dicaInstrutor);
 const campoVeiculo=campo('Veículo da prova',veiculo);campoVeiculo.append(dicaVeiculo);
 const linha=el('div',undefined,'op-provas-janela-linha');linha.append(campoInstrutor,campoVeiculo);
 // O instrutor e o veículo logo depois da categoria (a lista deles abre para baixo, com espaço); a data vem depois.
 nova.append(ajuda,campoCategoria,linha,fichaVeiculo,campo('Data da prova',data),botoesNova);
 janela.append(nova);
 const limparNova=()=>{nova.reset();categoria=categorias.includes('B')?'B':categorias[0]||'';aplicarCategoria(true);};
 aplicarCategoria(true);
 agendar.addEventListener('click',()=>{janela.showModal();data.focus();});

 const lista=el('div',undefined,'op-provas-lista');
 raiz.append(cab,lista);
 // O histórico (montado mais abaixo) fica escondido até o botão "Histórico de provas"; carrega na primeira vez.
 queueMicrotask(()=>{historico.hidden=true;raiz.append(historico);});
 let historicoCarregado=false;
 const mostrarHistorico=sim=>{historico.hidden=!sim;lista.hidden=sim;verHistorico.textContent=sim?'Provas marcadas':'Histórico de provas';verHistorico.setAttribute('aria-pressed',String(sim));if(sim&&!historicoCarregado){historicoCarregado=true;carregarHistorico();}};
 verHistorico.addEventListener('click',()=>mostrarHistorico(historico.hidden));

 let ocupado=false,diasAtuais=[];const abertos=new Set();
 const rodar=async(tarefa,textoBase)=>{if(ocupado)return;ocupado=true;raiz.classList.add('op-provas-ocupado');try{const r=await tarefa();if(r===false)return;const texto=typeof textoBase==='function'?textoBase(r):textoBase;if(executar)await executar(async()=>{},texto);else mostrarToast(texto);await carregar();}catch(e){avisarErro(e?.message||'Não foi possível concluir.');}finally{ocupado=false;raiz.classList.remove('op-provas-ocupado');}};
 const textoCanceladas=n=>n?' '+plural(n,'aula da manhã foi cancelada','aulas da manhã foram canceladas')+' com o crédito devolvido, e os alunos receberam o aviso.':'';

 // Marcar: a prévia, a conferência e só então grava (dia, instrutor e veículo).
 // A tela do "Agendar prova" fecha durante a conferência e volta, com o que foi preenchido, no "Voltar".
 nova.onsubmit=e=>{e.preventDefault();if(!nova.reportValidity())return;const dia=data.value;if(dia<hojeBrasil()){avisarErro('A data da prova não pode estar no passado.');return;}
  janela.close();
  rodar(async()=>{
   const previa=await servico.previaDiaProva(dia,{motoristaId:instrutor.value,veiculoId:veiculo.value});
   if(previa?.jaExiste){await avisarErro('Já existe prova marcada em '+formatarData(dia)+'.'+(gerencia?' Use o "Editar" dessa prova na lista.':' Para mudar algo nela, fale com a Gerência.'),{titulo:'Essa data já tem prova'});janela.showModal();return false;}
   const resumo=el('div',undefined,'op-prova-resumo');
   resumo.append(linhaResumo('Data',porExtenso(dia),{nota:quando(dia),alerta:avisoDoDia(dia)}),
    linhaResumo('Categoria',NOMES_CATEGORIA[categoria]||categoria||'—'),
    linhaResumo('Horário','Manhã, até 11:00'),
    linhaResumo('Instrutor',textoDoSelect(instrutor)||'Sem instrutor',{alerta:!instrutor.value?'Dá para pôr depois'+(gerencia?'.':', uma vez; trocar depois é com a Gerência.'):''}),
    linhaResumo('Veículo',textoDoSelect(veiculo)||'Sem veículo',{alerta:!veiculo.value?'Dá para pôr depois'+(gerencia?'.':', uma vez; trocar depois é com a Gerência.'):''}),
    listaDeAulas(previa?.aulasCanceladas||[]));
   const ok=await confirmarAcao('Confira com cuidado antes de confirmar. A partir da confirmação, o instrutor e o veículo saem da agenda na manhã da prova.',{titulo:'Conferir a prova de '+formatarData(dia),confirmar:'Confirmar prova',conteudo:resumo,conferencia:'Conferi a data, o instrutor e o veículo.'});
   if(!ok){janela.showModal();return false;}
   let canceladas=0;const avisos=[];
   await servico.definirDiaProva(dia);
   if(instrutor.value){const r=await servico.reservarInstrutorProva(dia,instrutor.value);canceladas+=Number(r?.aulasCanceladas)||0;const i=r?.instrutores?.find(x=>x.motoristaId===instrutor.value);if(i?.aulasNoDia)avisos.push('O instrutor tem '+plural(i.aulasNoDia,'aula','aulas')+' antes das 13:00 que não puderam ser canceladas.');}
   if(veiculo.value){const r=await servico.reservarVeiculoProva(dia,veiculo.value);canceladas+=Number(r?.aulasCanceladas)||0;const v=r?.veiculos?.find(x=>x.veiculoId===veiculo.value);if(v?.aulasNoDia)avisos.push('O veículo tem '+plural(v.aulasNoDia,'aula','aulas')+' antes das 13:00 que não puderam ser canceladas.');}
   if(avisos.length)avisarErro(avisos.join(' ')+' Remaneje essas aulas (na frota, "Realocar alunos").',{titulo:'Aulas na manhã da prova'});
   abertos.add(dia);limparNova();
   return canceladas;
  },n=>'Prova de '+formatarData(dia)+' marcada.'+textoCanceladas(n));};

 // Editar (Gerência): a mesma conferência, com o antes e o depois.
 function editar(d,form){const dia=diaIso(d),f=form.elements,novaData=f.novaData.value||dia,novoInstrutor=f.instrutorId.value,novoVeiculo=f.veiculoId.value;
  if(novaData<hojeBrasil()){avisarErro('A data da prova não pode estar no passado.');return;}
  const instrutorAntes=d.instrutores?.[0],veiculoAntes=d.veiculos?.[0];
  if(novaData===dia&&novoInstrutor===(instrutorAntes?.motoristaId||'')&&novoVeiculo===(veiculoAntes?.veiculoId||'')&&(d.instrutores||[]).length<=1&&(d.veiculos||[]).length<=1){mostrarToast('Nada mudou.');return;}
  rodar(async()=>{
   const previa=await servico.previaDiaProva(novaData,{motoristaId:novoInstrutor,veiculoId:novoVeiculo,origem:dia});
   if(previa?.jaExiste){avisarErro('Já existe prova marcada em '+formatarData(novaData)+'. Escolha outra data.',{titulo:'Essa data já tem prova'});return false;}
   const alunosNaProva=(d.alunos||[]).length,resumo=el('div',undefined,'op-prova-resumo');
   resumo.append(linhaResumo('Data',porExtenso(novaData),{antes:porExtenso(dia),nota:novaData!==dia?quando(novaData):'',alerta:novaData!==dia?avisoDoDia(novaData):''}),
    linhaResumo('Instrutor',textoDoSelect(f.instrutorId)||'Sem instrutor',{antes:(d.instrutores||[]).map(i=>i.instrutor).join(', ')||'Sem instrutor'}),
    linhaResumo('Veículo',textoDoSelect(f.veiculoId)||'Sem veículo',{antes:(d.veiculos||[]).map(v=>v.veiculo).join(', ')||'Sem veículo'}));
   if(novaData!==dia)resumo.append(linhaResumo('Alunos',alunosNaProva?plural(alunosNaProva,'aluno vai','alunos vão')+' para a nova data e '+(alunosNaProva===1?'recebe':'recebem')+' o aviso':'Nenhum aluno na prova'));
   resumo.append(listaDeAulas(previa?.aulasCanceladas||[]));
   const ok=await confirmarAcao('Confira o que muda antes de confirmar. O instrutor e o veículo que saem voltam para a agenda; os que entram saem dela na manhã da prova.',{titulo:'Conferir a alteração da prova',confirmar:'Confirmar alteração',conteudo:resumo,conferencia:'Conferi a data, o instrutor e o veículo.'});
   if(!ok)return false;
   const r=await servico.editarDiaProva(dia,{novaData:novaData!==dia?novaData:null,motoristaId:novoInstrutor,veiculoId:novoVeiculo});
   abertos.delete(dia);
   return Number(r?.aulasCanceladas)||0;
  },n=>'Prova '+(novaData!==dia?'remarcada para '+formatarData(novaData):'de '+formatarData(novaData)+' alterada')+'.'+textoCanceladas(n));}

 // Excluir (Gerência): desfaz tudo, com a conferência.
 function excluir(d){const dia=diaIso(d),n=(d.alunos||[]).length;
  rodar(async()=>{
   const resumo=el('div',undefined,'op-prova-resumo');
   resumo.append(linhaResumo('Data',porExtenso(dia)),
    linhaResumo('Alunos',n?plural(n,'aluno volta','alunos voltam')+' a aguardar a data da prova e '+(n===1?'recebe':'recebem')+' o aviso':'Nenhum aluno na prova'),
    linhaResumo('Instrutor e veículo',[...(d.instrutores||[]).map(i=>i.instrutor),...(d.veiculos||[]).map(v=>v.veiculo)].join(' · ')||'Nenhum',{alerta:(d.instrutores||[]).length+(d.veiculos||[]).length?'Voltam para a agenda na manhã desse dia.':''}));
   const ok=await confirmarAcao('A prova sai da lista e não dá para desfazer pela tela.',{titulo:'Excluir a prova de '+formatarData(dia)+'?',confirmar:'Excluir prova',perigo:true,conteudo:resumo,conferencia:'Conferi e quero excluir esta prova.'});
   if(!ok)return false;
   await servico.excluirDiaProva(dia);abertos.delete(dia);
  },'Prova de '+formatarData(dia)+' excluída.');}

 // 25/11/2026 (pedido do usuário): a categoria da prova é a do veículo dela (ônibus → prova de ônibus); sem veículo, a das
 // provas dos alunos já colocados. Com a categoria, a busca só mostra os alunos matriculados nela e não pergunta o tipo.
 function categoriaDaProva(d){
  const doVeiculo=(d.veiculos||[]).map(v=>veiculos.find(x=>x.id===v.veiculoId)?.categoria).find(Boolean);if(doVeiculo)return doVeiculo;
  const tipos=(d.alunos||[]).map(x=>semAcento(x.tipo));return tipos.some(t=>t.includes('onibus'))?'D':tipos.some(t=>t.includes('moto'))?'A':tipos.some(t=>t.includes('carro'))?'B':'';
 }
 // As categorias do aluno: as da matrícula (AB, AD...) e as do cadastro (a mesma lista que a ficha dele usa).
 const categoriasDoAluno=a=>['A','B','D'].filter(c=>(String(a.categoria||'').toUpperCase()+(a.categorias||[]).join('').toUpperCase()).includes(c));
 const nomeCategoria=c=>(NOMES_CATEGORIA[c]||c||'').toLowerCase();

 // Os alunos da prova: a lista (com "Tirar da prova") e "Colocar aluno", com a busca pelo nome ou CPF.
 function blocoAlunos(d){
  const dia=diaIso(d),caixa=el('div',undefined,'op-prova-alunos'),doDia=d.alunos||[],ids=new Set(doDia.map(x=>x.alunoId)),cat=categoriaDaProva(d);
  const cabeca=el('div',undefined,'op-prova-alunos-cabeca');cabeca.append(el('h4','Alunos na prova'),el('span',String(doDia.length),'op-prova-alunos-numero'));
  caixa.append(cabeca);
  if(doDia.length){const ul=el('ul',undefined,'op-prova-alunos-lista');
   for(const x of doDia){const li=el('li'),info=el('div',undefined,'op-prova-aluno-info');info.append(el('strong',x.nome),el('span',[x.cpf?'CPF '+formatarCpf(x.cpf):'',x.tipo].filter(Boolean).join(' · ')));li.append(info,el('span',x.situacao,CLASSE_SITUACAO[x.situacao]||'op-badge'));li.dataset.opAlunoNaProva=x.alunoId;
    if(x.situacao==='Agendado'&&servico.tirarDaProva){const tirar=botao('Tirar da prova',()=>rodar(async()=>{if(!await confirmarAcao(x.nome+' sai da prova de '+formatarData(dia)+' e volta a aguardar a data.',{titulo:'Tirar da prova?',confirmar:'Tirar da prova'}))return false;await servico.tirarDaProva(x.alunoId,x.tentativaId);},x.nome+' saiu da prova.'),'op-link op-link-perigo');tirar.dataset.opTirarDaProva=x.alunoId;li.append(tirar);}
    ul.append(li);}
   caixa.append(ul);
  }else caixa.append(el('p','Nenhum aluno nesta prova ainda.','op-prova-sem-alunos'));
  if(!servico.colocarNaProva||faltam(dia)<0)return caixa;

  const colocar=el('div',undefined,'op-prova-colocar'),cabecaColocar=el('div',undefined,'op-prova-colocar-cabeca');
  cabecaColocar.append(el('h4','Colocar aluno'),el('span',cat?'Só alunos com categoria '+cat+' ('+nomeCategoria(cat)+')':'Escolha o veículo da prova para filtrar pela categoria','op-prova-colocar-filtro'));
  const busca=entrada('search','');busca.placeholder='Digite o nome ou o CPF do aluno';busca.autocomplete='off';busca.dataset.opBuscaAlunoProva=dia;busca.classList.add('op-prova-busca');busca.setAttribute('aria-label','Buscar aluno para colocar na prova de '+formatarData(dia));
  const resultados=el('div',undefined,'op-prova-resultados');resultados.setAttribute('aria-live','polite');
  const LIMITE=6;
  busca.addEventListener('input',()=>{
   resultados.replaceChildren();const termo=semAcento(busca.value.trim()),numeros=busca.value.replace(/\D/g,'');if(termo.length<2&&numeros.length<3)return;
   const encontrados=alunos.filter(a=>!a.somenteAgenda&&!a.excluidoEm&&(semAcento(a.nome).includes(termo)||(numeros.length>=3&&String(a.cpf||a.documento||'').replace(/\D/g,'').includes(numeros))));
   const aptos=cat?encontrados.filter(a=>categoriasDoAluno(a).includes(cat)):encontrados.filter(a=>categoriasDoAluno(a).length);
   const fora=encontrados.length-aptos.length;
   if(!aptos.length){resultados.append(el('p',encontrados.length?'Nenhum aluno com categoria '+(cat?cat+' ('+nomeCategoria(cat)+')':'prática')+' encontrado.':'Nenhum aluno encontrado.','op-prova-resultados-nada'));return;}
   for(const a of [...aptos].sort(porNome).slice(0,LIMITE)){
    const linha=el('div',undefined,'op-prova-resultado'),info=el('div',undefined,'op-prova-aluno-info');const cats=categoriasDoAluno(a);info.append(el('strong',a.nome),el('span',[a.cpf?'CPF '+formatarCpf(a.cpf):'',cats.length?(cats.length>1?'Categorias ':'Categoria ')+cats.join(', '):''].filter(Boolean).join(' · ')));linha.append(info);
    if(ids.has(a.id))linha.append(el('span','Já está nesta prova','op-badge'));
    else{
     // Com a categoria da prova, o tipo já é dela; sem ela, pergunta só entre as categorias da matrícula do aluno.
     const opcoes=PRATICAS.filter(([c])=>cat?c===cat:categoriasDoAluno(a).includes(c));let tipo=null;
     if(opcoes.length>1){tipo=select(opcoes.map(([,v,t])=>[v,t]));tipo.dataset.opTipoProvaAluno=a.id;tipo.classList.add('op-prova-resultado-tipo');linha.append(tipo);}
     const valor=()=>tipo?tipo.value:opcoes[0][1];
     const por=botao('Colocar na prova',()=>rodar(()=>servico.colocarNaProva(a.id,valor(),dia),a.nome+' colocado na prova de '+formatarData(dia)+'.'),'op-button op-button-primary');por.dataset.opColocarNaProva=a.id;linha.append(por);
    }
    resultados.append(linha);}
   const notas=[];if(aptos.length>LIMITE)notas.push('Mostrando '+LIMITE+' de '+aptos.length+'. Continue digitando para achar o aluno.');if(fora)notas.push(plural(fora,'aluno encontrado não tem','alunos encontrados não têm')+' a categoria '+(cat||'prática')+' e não '+(fora===1?'aparece':'aparecem')+'.');
   if(notas.length)resultados.append(el('p',notas.join(' '),'op-prova-resultados-nota'));
  });
  colocar.append(cabecaColocar,busca,resultados);caixa.append(colocar);return caixa;
 }

 // Um item da lista: a data em destaque, o dia e a distância, a categoria, o instrutor e o veículo (com a placa) em blocos
 // separados, a conta de alunos e as ações.
 function itemDaProva(d){
  const dia=diaIso(d),item=el('article',undefined,'op-prova');item.dataset.opDiaProva=dia;
  const topo=el('div',undefined,'op-prova-topo'),dataCaixa=el('div',undefined,'op-prova-data'),dt=dataDe(dia);
  // 25/11/2026 (pedido do usuário): a data num bloco (dia da semana, número e mês) e, ao lado, o título, uma linha discreta
  // (quando e a categoria) e o instrutor e o veículo como uma ficha (rótulo à esquerda, valor à direita), sem caixinhas.
  dataCaixa.append(el('span',dt.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),'op-prova-data-semana'),el('strong',String(dt.getDate()).padStart(2,'0')),el('span',dt.toLocaleDateString('pt-BR',{month:'short'}).replace('.',''),'op-prova-data-mes'));
  const info=el('div',undefined,'op-prova-info'),cat=categoriaDaProva(d);
  const titulo=el('div',undefined,'op-prova-titulo');titulo.append(el('strong',maiuscula(dt.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long'}))));
  const meta=el('div',undefined,'op-prova-meta');meta.append(el('span',maiuscula(quando(dia))));if(cat)meta.append(el('span','Prova de '+nomeCategoria(cat)));meta.append(el('span','Manhã, até 11:00'));
  const nomeProprio=t=>String(t||'').toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/ (De|Da|Do|Dos|Das|E) /g,m=>m.toLowerCase());
  const ficha=el('dl',undefined,'op-prova-ficha');
  const linhaFicha=(rotulo,valor,vazio)=>{const dt_=el('dt',rotulo),dd=el('dd');if(valor)dd.append(valor);else{dd.textContent=vazio;dd.classList.add('op-prova-vazio-texto');}ficha.append(dt_,dd);};
  const nomes=(d.instrutores||[]).map(i=>nomeProprio(i.instrutor||'—')).join(', ');
  linhaFicha('Instrutor',nomes?document.createTextNode(nomes):null,'Sem instrutor');
  let veic=null;
  if((d.veiculos||[]).length){veic=document.createDocumentFragment();(d.veiculos||[]).forEach((v,k)=>{const [modelo,placa]=String(v.veiculo||'—').split(' · ');if(k)veic.append(document.createTextNode(', '));veic.append(document.createTextNode(modelo));if(placa)veic.append(el('span',placa,'op-prova-placa-texto'));});}
  linhaFicha('Veículo',veic,'Sem veículo');
  info.append(titulo,meta,ficha);
  const remanejar=[...(d.instrutores||[]),...(d.veiculos||[])].reduce((s,x)=>s+(x.aulasNoDia||0),0);
  if(remanejar)info.append(el('span',plural(remanejar,'aula','aulas')+' na manhã a remanejar','op-checklist-alerta'));
  const n=(d.alunos||[]).length,conta=el('span',plural(n,'aluno','alunos'),'op-prova-conta'+(n?'':' op-prova-conta-zero'));conta.dataset.opContaAlunos=String(n);
  const acoes=el('div',undefined,'op-prova-acoes');
  const verAlunos=botao(abertos.has(dia)?'Fechar alunos':'Ver alunos',()=>{if(abertos.has(dia))abertos.delete(dia);else abertos.add(dia);pintar();},'op-button op-button-outline');verAlunos.dataset.opVerAlunosProva=dia;verAlunos.setAttribute('aria-expanded',String(abertos.has(dia)));
  acoes.append(verAlunos);
  let formEdicao=null;
  if(gerencia&&faltam(dia)>=0){
   const ed=botao('Editar',()=>{formEdicao.hidden=!formEdicao.hidden;ed.setAttribute('aria-expanded',String(!formEdicao.hidden));if(!formEdicao.hidden)formEdicao.elements.novaData.focus();},'op-button op-button-outline');ed.dataset.opEditarDiaProva=dia;ed.setAttribute('aria-expanded','false');
   const ex=botao('Excluir',()=>excluir(d),'op-button op-button-outline op-prova-excluir');ex.dataset.opExcluirDiaProva=dia;
   acoes.append(ed,ex);
   formEdicao=el('form',undefined,'op-provas-nova op-prova-edicao');formEdicao.hidden=true;
   const nd=entrada('date',dia),ni=seletorInstrutor(instrutores),nv=seletorVeiculo(veiculos);nd.min=hojeBrasil();nd.required=true;nd.name='novaData';ni.name='instrutorId';nv.name='veiculoId';
   garantirOpcao(ni,d.instrutores?.[0]?.motoristaId,d.instrutores?.[0]?.instrutor);garantirOpcao(nv,d.veiculos?.[0]?.veiculoId,d.veiculos?.[0]?.veiculo);
   ni.value=d.instrutores?.[0]?.motoristaId||'';nv.value=d.veiculos?.[0]?.veiculoId||'';ligarPar(ni,nv,instrutores,veiculos);
   const cancelar=botao('Cancelar',()=>{formEdicao.reset();ni.value=d.instrutores?.[0]?.motoristaId||'';nv.value=d.veiculos?.[0]?.veiculoId||'';formEdicao.hidden=true;ed.setAttribute('aria-expanded','false');},'op-button op-button-outline');
   const salvar=el('button','Revisar alteração','op-button op-button-primary');salvar.type='submit';
   const botoes=el('div',undefined,'op-prova-edicao-botoes');botoes.append(cancelar,salvar);
   formEdicao.append(el('h3','Editar prova','op-provas-nova-titulo'),campo('Data da prova',nd),campo('Instrutor da prova',ni),campo('Veículo da prova',nv),botoes);
   formEdicao.onsubmit=e=>{e.preventDefault();if(formEdicao.reportValidity())editar(d,formEdicao);};
  }
  topo.append(dataCaixa,info,conta,acoes);item.append(topo);
  if(formEdicao)item.append(formEdicao);
  if(abertos.has(dia)){item.classList.add('op-prova-aberta');item.append(blocoAlunos(d));}
  return item;
 }

 // 25/11/2026 (pedido do usuário): o histórico das provas que já passaram. Cada uma mostra a data, o instrutor, o veículo e
 // o resumo dos resultados; o clique abre os alunos com o resultado de cada um e o aproveitamento. Só leitura.
 const historico=el('section',undefined,'op-provas-historico');historico.dataset.opHistoricoProvas='';
 const cabHist=el('div',undefined,'op-provas-historico-cabeca');
 const periodo=select([['30','Últimos 30 dias'],['90','Últimos 90 dias'],['180','Últimos 6 meses'],['365','Último ano']],'90');periodo.dataset.opPeriodoHistorico='';
 const campoPeriodo=campo('Selecione o período do histórico',periodo);campoPeriodo.className='op-provas-campo-topo';
 cabHist.append(campoPeriodo,el('p','Clique em uma prova para ver os alunos e os resultados.','op-provas-historico-ajuda'));
 const listaHist=el('div',undefined,'op-provas-historico-lista');
 historico.append(cabHist,listaHist);
 const somarDias=(iso,n)=>{const d=dataDe(iso);d.setDate(d.getDate()+n);return d.toISOString().slice(0,10);};
 const nomeProprioH=t=>String(t||'').toLowerCase().replace(/(^|[\s'-])(\p{L})/gu,(m,a,b)=>a+b.toUpperCase()).replace(/ (De|Da|Do|Dos|Das|E) /g,m=>m.toLowerCase());
 const contarSituacoes=al=>({aprovados:al.filter(x=>x.situacao==='Aprovado').length,reprovados:al.filter(x=>x.situacao==='Reprovado').length,faltas:al.filter(x=>x.situacao==='Faltou').length,semResultado:al.filter(x=>x.situacao==='Agendado').length});
 function itemDoHistorico(d){
  const dia=diaIso(d),dt=dataDe(dia),al=d.alunos||[],c=contarSituacoes(al),cat=categoriaDaProva(d);
  const item=el('details',undefined,'op-prova-hist');item.dataset.opProvaHistorico=dia;
  const resumo=el('summary',undefined,'op-prova-hist-resumo');
  const dataCaixa=el('div',undefined,'op-prova-data op-prova-data-passada');dataCaixa.append(el('span',dt.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.',''),'op-prova-data-semana'),el('strong',String(dt.getDate()).padStart(2,'0')),el('span',dt.toLocaleDateString('pt-BR',{month:'short',year:'2-digit'}).replace('.','').replace(' de ','/'),'op-prova-data-mes'));
  const info=el('div',undefined,'op-prova-info');
  const titulo=el('div',undefined,'op-prova-titulo');titulo.append(el('strong',maiuscula(dt.toLocaleDateString('pt-BR',{weekday:'long',day:'numeric',month:'long',year:'numeric'}))));
  const n=-faltam(dia),meta=el('div',undefined,'op-prova-meta');meta.append(el('span',n===1?'Ontem':'Há '+n+' dias'));if(cat)meta.append(el('span','Prova de '+nomeCategoria(cat)));meta.append(el('span',plural(al.length,'aluno','alunos')));
  const ficha=el('dl',undefined,'op-prova-ficha');
  const linha=(rotulo,valor,vazio)=>{const dd=el('dd');if(valor)dd.append(valor);else{dd.textContent=vazio;dd.classList.add('op-prova-vazio-texto');}ficha.append(el('dt',rotulo),dd);};
  const nomes=(d.instrutores||[]).map(i=>nomeProprioH(i.instrutor||'—')).join(', ');linha('Instrutor',nomes?document.createTextNode(nomes):null,'Sem instrutor');
  let veic=null;if((d.veiculos||[]).length){veic=document.createDocumentFragment();(d.veiculos||[]).forEach((v,k)=>{const [modelo,placa]=String(v.veiculo||'—').split(' · ');if(k)veic.append(document.createTextNode(', '));veic.append(document.createTextNode(modelo));if(placa)veic.append(el('span',placa,'op-prova-placa-texto'));});}
  linha('Veículo',veic,'Sem veículo');
  info.append(titulo,meta,ficha);
  // O resumo dos resultados, à direita.
  const placar=el('div',undefined,'op-prova-hist-placar');
  const ponto=(numero,rotulo,classe)=>{const p=el('span',undefined,'op-prova-hist-ponto '+classe);p.append(el('strong',String(numero)),el('small',rotulo));return p;};
  if(al.length){placar.append(ponto(c.aprovados,c.aprovados===1?'aprovado':'aprovados','op-prova-hist-ok'),ponto(c.reprovados,c.reprovados===1?'reprovado':'reprovados','op-prova-hist-erro'),ponto(c.faltas,c.faltas===1?'falta':'faltas','op-prova-hist-falta'));}
  else placar.append(el('span','Sem alunos','op-prova-hist-sem'));
  const seta=el('span',undefined,'op-prova-hist-seta');seta.setAttribute('aria-hidden','true');
  resumo.append(dataCaixa,info,placar,seta);item.append(resumo);
  // Os detalhes: o aproveitamento e os alunos com o resultado.
  const detalhes=el('div',undefined,'op-prova-hist-detalhes');
  const avaliados=c.aprovados+c.reprovados;
  const numeros=el('div',undefined,'op-prova-hist-numeros');
  const numero=(rotulo,valor,extra)=>{const b=el('div');b.append(el('small',rotulo),el('strong',valor));if(extra)b.append(el('span',extra));return b;};
  numeros.append(numero('Alunos na prova',String(al.length)),numero('Aprovados',String(c.aprovados)),numero('Reprovados',String(c.reprovados)),numero('Faltaram',String(c.faltas)),
   numero('Aproveitamento',avaliados?Math.round(c.aprovados*100/avaliados)+'%':'—',avaliados?'dos que fizeram a prova':''));
  detalhes.append(numeros);
  if(c.semResultado)detalhes.append(el('p',plural(c.semResultado,'aluno ainda está','alunos ainda estão')+' sem resultado registrado. O instrutor da prova registra no app dele.','op-prova-hist-pendente'));
  if(al.length){const ul=el('ul',undefined,'op-prova-alunos-lista');
   for(const x of [...al].sort(porNome)){const li=el('li'),inf=el('div',undefined,'op-prova-aluno-info');inf.append(el('strong',x.nome),el('span',[x.cpf?'CPF '+formatarCpf(x.cpf):'',x.tipo].filter(Boolean).join(' · ')));
    li.append(inf,el('span',x.situacao==='Agendado'?'Sem resultado':x.situacao,CLASSE_SITUACAO[x.situacao]||'op-badge'));ul.append(li);}
   detalhes.append(ul);
  }else detalhes.append(el('p','Nenhum aluno foi colocado nesta prova.','op-prova-sem-alunos'));
  item.append(detalhes);
  return item;
 }
 async function carregarHistorico(){
  const hoje=hojeBrasil(),ate=somarDias(hoje,-1),de=somarDias(hoje,-Number(periodo.value));
  listaHist.replaceChildren(el('p','Carregando o histórico...','op-help'));
  let dias;try{dias=await servico.diasProva({de,ate});}catch(e){listaHist.replaceChildren(el('p',e.message,'op-help'));return;}
  const ordenados=[...dias].sort((a,b)=>diaIso(b).localeCompare(diaIso(a)));
  if(!ordenados.length){const vazio=el('div',undefined,'op-dias-prova-vazio');vazio.append(el('strong','Nenhuma prova nesse período'),el('span','As provas aparecem aqui no dia seguinte à data da prova.'));listaHist.replaceChildren(vazio);return;}
  listaHist.replaceChildren(...ordenados.map(itemDoHistorico));
 }
 periodo.addEventListener('change',carregarHistorico);

 function pintar(){
  contador.textContent=diasAtuais.length?plural(diasAtuais.length,'prova','provas')+' nos próximos 60 dias':'';
  const titulo=el('div',undefined,'op-provas-lista-cabeca');titulo.append(el('h3','Provas marcadas','op-provas-lista-titulo'),contador);
  if(!diasAtuais.length){const vazio=el('div',undefined,'op-dias-prova-vazio');vazio.append(el('strong','Nenhuma prova marcada'),el('span','Clique em “Agendar prova” para marcar a primeira.'));lista.replaceChildren(titulo,vazio);return;}
  lista.replaceChildren(titulo,...diasAtuais.map(itemDaProva));
 }

 async function carregar(){
  let dias;try{dias=await servico.diasProva({});}catch(e){lista.replaceChildren(el('p',e.message,'op-help'));return;}
  diasAtuais=[...dias].sort((a,b)=>diaIso(a).localeCompare(diaIso(b)));
  // 25/11/2026 (pedido do usuário): ao entrar, as provas vêm com os alunos fechados; abrem no "Ver alunos".
  pintar();
 }
 carregar();
 return raiz;
}
