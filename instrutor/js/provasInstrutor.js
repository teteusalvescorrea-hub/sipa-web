// 09/11/2026: os alunos de prova nos dias em que o veículo do instrutor foi reservado para a prova (a Recepção registra a
// prova no painel dela e aparece aqui sozinho). A agenda mostra o dia; o Histórico mostra o dia, o mês ou todos.
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined&&texto!==null)n.textContent=texto;if(classe)n.className=classe;return n;};
const dataLonga=iso=>new Date(iso+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const CLASSE_SITUACAO={Aprovado:'in-prova-ok',Reprovado:'in-prova-ruim',Agendado:'in-prova-agendado',Solicitado:'in-prova-agendado'};

function listaAlunos(alunos){
 if(!alunos.length)return el('p','Nenhum aluno registrado pela Recepção para esta prova ainda.','in-prova-vazio');
 const ul=el('ul',undefined,'in-prova-alunos');
 for(const a of alunos){const li=el('li'),info=el('div');info.append(el('strong',a.nome),el('span',[a.tipo,a.horario?'às '+a.horario:a.periodo].filter(Boolean).join(' · ')));li.append(el('span',(a.nome||'?').trim().charAt(0).toUpperCase(),'in-prova-avatar'),info,el('span',a.situacao||'—','in-prova-situacao '+(CLASSE_SITUACAO[a.situacao]||'')));ul.append(li);}
 return ul;
}

function blocoDoDia(prova,{comData=true}={}){
 const s=el('article',undefined,'in-prova-dia');const topo=el('header');
 const titulo=el('div');if(comData)titulo.append(el('strong',dataLonga(prova.data)));titulo.append(el('span','Veículo da prova: '+prova.veiculo,'in-prova-veiculo'));
 topo.append(titulo,el('span',prova.alunos.length===1?'1 aluno':prova.alunos.length+' alunos','in-prova-contagem'));
 s.append(topo,listaAlunos(prova.alunos));return s;
}

// Embaixo da agenda: só aparece no dia de prova com o veículo do instrutor.
export function secaoProvasDoDia(servico,dia){
 const s=el('section',undefined,'in-card in-prova-agenda');s.hidden=true;s.setAttribute('aria-label','Alunos da prova de hoje');
 if(!servico.provas)return s;
 servico.provas({de:dia,ate:dia}).then(lista=>{
  if(!lista?.length)return;
  const cab=el('div',undefined,'in-prova-cabecalho');cab.append(el('span','Dia de prova','in-prova-selo'),el('h3','Alunos que vão para a prova'));
  s.append(cab,el('p','A Recepção registra os alunos no painel dela; a lista atualiza sozinha.','in-prova-ajuda'),...lista.map(p=>blocoDoDia(p,{comData:false})));s.hidden=false;
 }).catch(()=>{});
 return s;
}

// Aba "Provas" do Histórico: Dia, Mês ou Todos.
export function painelProvasHistorico(host,servico,{hoje,estado={}}){
 const filtro=estado.provas||'dia',mes=hoje.slice(0,7);
 const grupo=el('div',undefined,'in-history-situations');grupo.setAttribute('role','group');grupo.setAttribute('aria-label','Período das provas');
 const resultado=el('div',undefined,'in-prova-historico');resultado.setAttribute('aria-live','polite');
 for(const [id,texto] of [['dia','Dia'],['mes','Mês'],['todos','Todos']]){const b=el('button',texto);b.type='button';b.dataset.provasPeriodo=id;b.setAttribute('aria-pressed',String(filtro===id));
  b.onclick=()=>{estado.provas=id;for(const x of grupo.children)x.setAttribute('aria-pressed',String(x===b));carregar(id);};grupo.append(b);}
 host.append(grupo,resultado);
 async function carregar(id){
  resultado.replaceChildren(el('p','Carregando as provas…','in-empty'));
  if(!servico.provas){resultado.replaceChildren(el('p','As provas aparecem com a API.','in-empty'));return;}
  const ultimo=new Date(Date.UTC(Number(mes.slice(0,4)),Number(mes.slice(5,7)),0)).toISOString().slice(0,10);
  const filtroApi=id==='dia'?{de:hoje,ate:hoje}:id==='mes'?{de:mes+'-01',ate:ultimo}:{};
  try{
   const lista=(await servico.provas(filtroApi))||[];
   const total=lista.reduce((s,p)=>s+p.alunos.length,0),dias=new Set(lista.map(p=>p.data)).size;
   const descricao=id==='dia'?'Provas de hoje':id==='mes'?'Provas de '+new Date(mes+'-01T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',month:'long',year:'numeric'}):'Todas as provas';
   const resumo=el('p',descricao+' · '+(total===1?'1 aluno':total+' alunos')+' em '+(dias===1?'1 dia de prova':dias+' dias de prova'),'in-history-summary');
   if(!lista.length){resultado.replaceChildren(resumo,el('p',id==='dia'?'Hoje não há prova com o seu veículo.':'Nenhuma prova com o seu veículo neste período.','in-empty'));return;}
   resultado.replaceChildren(resumo,...lista.map(p=>blocoDoDia(p)));
  }catch(e){resultado.replaceChildren(el('p',e?.message||'Não foi possível carregar as provas.','in-empty'));}
 }
 carregar(filtro);
}
