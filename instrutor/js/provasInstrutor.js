// 09/11/2026: os alunos de prova nos dias em que o veículo do instrutor foi reservado para a prova (a Recepção registra a
// prova no painel dela e aparece aqui sozinho). A agenda mostra o dia; o Histórico mostra o dia, o mês ou todos.
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined&&texto!==null)n.textContent=texto;if(classe)n.className=classe;return n;};
const dataLonga=iso=>new Date(iso+'T12:00:00Z').toLocaleDateString('pt-BR',{timeZone:'UTC',weekday:'long',day:'2-digit',month:'long',year:'numeric'});
const CLASSE_SITUACAO={Aprovado:'in-prova-ok',Reprovado:'in-prova-ruim',Faltou:'in-prova-ruim',Agendado:'in-prova-agendado',Solicitado:'in-prova-agendado'};
// 24/11/2026 (pedido do usuário): no dia da prova o instrutor marca se o aluno passou, reprovou ou faltou (e pode trocar no
// mesmo dia, se clicou errado).
const RESULTADOS=[[3,'Aprovado','Passou'],[4,'Reprovado','Reprovou'],[6,'Faltou','Faltou']];
const hojeLocal=()=>new Date(Date.now()-3*3600000).toISOString().slice(0,10);
function botoesResultado(a,data,servico,aoMudar){
 if(!servico?.registrarResultadoProva||!a.tentativaId||data>hojeLocal()||!['Agendado','Aprovado','Reprovado','Faltou'].includes(a.situacao))return null;
 if(a.situacao!=='Agendado'&&data!==hojeLocal())return null;
 const grupo=el('div',undefined,'in-prova-resultado');grupo.setAttribute('role','group');grupo.setAttribute('aria-label','Resultado da prova de '+a.nome);
 const aviso=el('span',undefined,'in-prova-erro');aviso.setAttribute('role','alert');
 for(const [id,situacao,texto] of RESULTADOS){const b=el('button',texto,'in-prova-botao');b.type='button';b.dataset.provaResultado=situacao;b.setAttribute('aria-pressed',String(a.situacao===situacao));
  b.onclick=async()=>{for(const x of grupo.querySelectorAll('button'))x.disabled=true;aviso.textContent='';try{const r=await servico.registrarResultadoProva(a.tentativaId,id);a.situacao=r?.situacao||situacao;aoMudar();}catch(e){aviso.textContent=e?.message||'Não foi possível registrar.';for(const x of grupo.querySelectorAll('button'))x.disabled=false;}};grupo.append(b);}
 grupo.append(aviso);return grupo;
}

function listaAlunos(alunos,data,servico){
 if(!alunos.length)return el('p','Nenhum aluno colocado nesta prova ainda. A AgIA mostra aqui assim que entrarem.','in-prova-vazio');
 const ul=el('ul',undefined,'in-prova-alunos');
 for(const a of alunos){const li=el('li'),info=el('div');info.append(el('strong',a.nome),el('span',[a.tipo,a.horario?'às '+a.horario:a.periodo].filter(Boolean).join(' · ')));const selo=el('span',a.situacao||'—','in-prova-situacao '+(CLASSE_SITUACAO[a.situacao]||''));li.append(el('span',(a.nome||'?').trim().charAt(0).toUpperCase(),'in-prova-avatar'),info,selo);
  const pintar=()=>{selo.textContent=a.situacao||'—';selo.className='in-prova-situacao '+(CLASSE_SITUACAO[a.situacao]||'');li.querySelector('.in-prova-resultado')?.remove();const b=botoesResultado(a,data,servico,pintar);if(b)li.append(b);};
  const b=botoesResultado(a,data,servico,pintar);if(b)li.append(b);ul.append(li);}
 return ul;
}

function blocoDoDia(prova,{comData=true,servico}={}){
 const s=el('article',undefined,'in-prova-dia');const topo=el('header');
 const titulo=el('div');if(comData)titulo.append(el('strong',dataLonga(prova.data)));titulo.append(el('span','Veículo da prova: '+prova.veiculo,'in-prova-veiculo'));
 topo.append(titulo,el('span',prova.alunos.length===1?'1 aluno':prova.alunos.length+' alunos','in-prova-contagem'));
 s.append(topo,listaAlunos(prova.alunos,prova.data,servico));return s;
}

// Embaixo da agenda: só aparece no dia de prova com o veículo do instrutor.
export function secaoProvasDoDia(servico,dia){
 const s=el('section',undefined,'in-card in-prova-agenda');s.hidden=true;s.setAttribute('aria-label','Alunos da prova de hoje');
 if(!servico.provas)return s;
 servico.provas({de:dia,ate:dia}).then(lista=>{
  if(!lista?.length)return;
  const cab=el('div',undefined,'in-prova-cabecalho');cab.append(el('span','Dia de prova','in-prova-selo'),el('h3','Alunos que vão para a prova'));
  s.append(cab,el('p','A AgIA coloca os alunos na prova. No dia, marque se cada um passou, reprovou ou faltou.','in-prova-ajuda'),...lista.map(p=>blocoDoDia(p,{comData:false,servico})));s.hidden=false;
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
   if(!lista.length){resultado.replaceChildren(resumo,el('p',id==='dia'?'Hoje não há prova sua.':'Nenhuma prova sua neste período.','in-empty'));return;}
   resultado.replaceChildren(resumo,...lista.map(p=>blocoDoDia(p,{servico})));
  }catch(e){resultado.replaceChildren(el('p',e?.message||'Não foi possível carregar as provas.','in-empty'));}
 }
 carregar(filtro);
}
