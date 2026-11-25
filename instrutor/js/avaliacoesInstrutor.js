// 17/11/2026 (pedido do usuário): as avaliações do instrutor no perfil, como nos aplicativos de transporte: a média das
// estrelas que os alunos deram (ex.: 4,8), quantas avaliações recebeu e de quantas aulas realizadas, a distribuição de
// 5 a 1 estrela, o que mais se destacou e os últimos comentários (sem o nome do aluno). Vem de GET motoristas/me/avaliacoes.
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const numero=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});
const plural=(n,um,varios)=>n+' '+(n===1?um:varios);
const dataCurta=d=>d?String(d).slice(8,10)+'/'+String(d).slice(5,7):'';
// 24/11/2026 (pedido do usuário): o quadro atualiza de 15 em 15 dias (dias 1º e 16); a API manda as datas.
export function textoDaAtualizacao(r){
 if(!r?.atualizadoEm)return 'As avaliações são anônimas: o nome do aluno não aparece.';
 return 'Atualizado em '+dataCurta(r.atualizadoEm)+(r.proximaAtualizacao?' · próxima atualização em '+dataCurta(r.proximaAtualizacao):'')+'. As avaliações chegam a cada 15 dias e são anônimas: o nome do aluno e o dia da aula não aparecem.';
}

// Cinco estrelas com preenchimento proporcional à média (4,5 = quatro e meia).
export function estrelasDaMedia(media){
 const caixa=el('span',null,'in-aval-estrelas');caixa.setAttribute('aria-hidden','true');
 const cheio=el('span','★★★★★','in-aval-estrelas-cheias');cheio.style.width=Math.max(0,Math.min(100,(Number(media)||0)/5*100))+'%';
 caixa.append(el('span','★★★★★','in-aval-estrelas-vazias'),cheio);return caixa;
}

export function textoDaMedia(r){
 if(!r?.total)return 'Sem avaliações ainda';
 return numero(r.media)+' de 5 · '+plural(r.total,'avaliação','avaliações');
}

export function cartaoAvaliacoes(servico){
 const card=el('section',null,'in-card in-aval');card.dataset.avaliacoesInstrutor='';
 card.append(el('h2','Minhas avaliações'),el('p','Carregando as avaliações…','muted'));
 if(!servico?.minhasAvaliacoes){card.hidden=true;return card;}
 servico.minhasAvaliacoes().then(r=>desenhar(card,r)).catch(()=>{card.replaceChildren(el('h2','Minhas avaliações'),el('p','Não foi possível carregar as avaliações agora.','muted'));});
 return card;
}

function desenhar(card,r){
 const total=r?.total||0,realizadas=Math.max(r?.aulasRealizadas||0,total);
 card.replaceChildren(el('h2','Minhas avaliações'));
 const topo=el('div',null,'in-aval-topo');
 const nota=el('div',null,'in-aval-nota');
 nota.append(el('strong',total?numero(r.media):'—','in-aval-media'),estrelasDaMedia(total?r.media:0));
 nota.setAttribute('aria-label',total?'Média '+numero(r.media)+' de 5 estrelas':'Sem avaliações ainda');
 const contas=el('div',null,'in-aval-contas');
 const linha=(valor,rotulo)=>{const d=el('div',null,'in-aval-conta');d.append(el('strong',String(valor)),el('span',rotulo));return d;};
 contas.append(linha(total,total===1?'avaliação recebida':'avaliações recebidas'),linha(realizadas,realizadas===1?'aula realizada':'aulas realizadas'),
  linha(realizadas?Math.round(total/realizadas*100)+'%':'—','das aulas avaliadas'));
 topo.append(nota,contas);card.append(topo);
 if(!total){card.append(el('p','Você ainda não recebeu avaliações. Elas aparecem aqui conforme os alunos avaliam as aulas.','in-aval-vazio'),el('p',textoDaAtualizacao(r),'in-profile-note'));return;}

 // Distribuição de 5 a 1 estrela.
 const barras=el('div',null,'in-aval-barras');const por=r.porEstrelas||[];const maior=Math.max(1,...por);
 for(let n=5;n>=1;n--){const qtd=por[n-1]||0,b=el('div',null,'in-aval-barra');b.append(el('span',n+' ★','in-aval-barra-rotulo'));
  const trilho=el('span',null,'in-aval-trilho'),cheio=el('span',null,'in-aval-trilho-cheio');cheio.style.width=(qtd/maior*100)+'%';trilho.append(cheio);
  b.append(trilho,el('span',String(qtd),'in-aval-barra-qtd'));b.setAttribute('aria-label',plural(qtd,'avaliação','avaliações')+' com '+n+' estrela'+(n>1?'s':''));barras.append(b);}
 card.append(barras);

 const outras=[['Aula em geral',r.mediaAula],['Veículo',r.mediaVeiculo]].filter(([,v])=>v!=null);
 if(outras.length){const o=el('p',null,'in-aval-outras');o.append(...outras.flatMap(([t,v],i)=>[...(i?[el('span','·','in-aval-sep')]:[]),el('span',t+': '),el('strong',numero(v)+' ★')]));card.append(o);}

 if(r.tags?.length){const t=el('div',null,'in-aval-tags');t.append(el('h3','O que os alunos destacaram'));const ul=el('div',null,'in-aval-chips');
  for(const x of r.tags.slice(0,7)){const c=el('span',null,'in-aval-chip');c.append(el('span',x.tag),el('strong',String(x.total)));ul.append(c);}t.append(ul);card.append(t);}

 if(r.comentarios?.length){const c=el('div',null,'in-aval-comentarios');c.append(el('h3','Últimos comentários'));
  for(const x of r.comentarios){const item=el('figure',null,'in-aval-comentario');const cab=el('figcaption');
   cab.append(el('span','★'.repeat(x.nota)+'☆'.repeat(5-x.nota),'in-aval-comentario-estrelas'),el('span',r.atualizadoEm?'Quinzena de '+new Date(x.em).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit'}):new Date(x.em).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})));
   item.append(cab,el('blockquote','“'+x.comentario+'”'));c.append(item);}
  card.append(c);}
 card.append(el('p',textoDaAtualizacao(r),'in-profile-note'));
}
