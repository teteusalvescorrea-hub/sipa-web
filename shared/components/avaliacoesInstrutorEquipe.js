// 17/11/2026 (pedido do usuário): as avaliações do instrutor para a Gerência e o Master. A nota atual na lista de
// instrutores ("★ 4,8 · 23") e um quadro limpo nos "Detalhes do instrutor" (média, quantidades, distribuição, tags e os
// últimos comentários). Tudo anônimo: o nome do aluno nunca aparece. Estilo em administracao.css (av-eq-*).
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const numero=v=>Number(v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1});

function estrelas(media){
 const caixa=el('span',null,'av-eq-estrelas');caixa.setAttribute('aria-hidden','true');
 const cheio=el('span','★★★★★','av-eq-estrelas-cheias');cheio.style.width=Math.max(0,Math.min(100,(Number(media)||0)/5*100))+'%';
 caixa.append(el('span','★★★★★','av-eq-estrelas-vazias'),cheio);return caixa;
}

// A célula da lista: "★ 4,8 · 23" (ou "Sem avaliação").
export function notaNaLista(media){
 if(media===undefined)return el('span','…','av-eq-nota-lista av-eq-carregando');
 if(!media||!media.total){const s=el('span','Sem avaliação','av-eq-nota-lista av-eq-sem');return s;}
 const s=el('span',null,'av-eq-nota-lista');s.title=numero(media.media)+' de 5 estrelas · '+media.total+(media.total===1?' avaliação':' avaliações');
 s.setAttribute('aria-label',s.title);s.append(el('span','★','av-eq-nota-estrela'),el('strong',numero(media.media)),el('small','· '+media.total));return s;
}

// A seção dos "Detalhes do instrutor".
export function secaoAvaliacoes(servico,instrutorId){
 const s=el('section',null,'op-resource-section av-eq');s.dataset.avaliacoesInstrutorEquipe='';
 s.append(el('h3','Avaliações dos alunos'),el('p','Carregando as avaliações…','op-help'));
 servico.avaliacoesInstrutor(instrutorId).then(r=>desenhar(s,r)).catch(()=>{s.replaceChildren(el('h3','Avaliações dos alunos'),el('p','Não foi possível carregar as avaliações agora.','op-help'));});
 return s;
}

function desenhar(s,r){
 const total=r?.total||0,realizadas=Math.max(r?.aulasRealizadas||0,total);
 s.replaceChildren(el('h3','Avaliações dos alunos'));
 const topo=el('div',null,'av-eq-topo');
 const nota=el('div',null,'av-eq-nota');nota.append(el('strong',total?numero(r.media):'—','av-eq-media'),estrelas(total?r.media:0));
 nota.setAttribute('aria-label',total?'Média '+numero(r.media)+' de 5 estrelas':'Sem avaliações');
 const conta=(valor,rotulo)=>{const d=el('div',null,'av-eq-conta');d.append(el('strong',String(valor)),el('span',rotulo));return d;};
 const contas=el('div',null,'av-eq-contas');contas.append(conta(total,total===1?'avaliação':'avaliações'),conta(realizadas,realizadas===1?'aula realizada':'aulas realizadas'),conta(realizadas?Math.round(total/realizadas*100)+'%':'—','das aulas avaliadas'));
 topo.append(nota,contas);
 if(total){const barras=el('div',null,'av-eq-barras');const por=r.porEstrelas||[],maior=Math.max(1,...por);
  for(let n=5;n>=1;n--){const q=por[n-1]||0,b=el('div',null,'av-eq-barra'),t=el('span',null,'av-eq-trilho'),c=el('span',null,'av-eq-trilho-cheio');c.style.width=(q/maior*100)+'%';t.append(c);
   b.append(el('span',n+' ★','av-eq-barra-rotulo'),t,el('span',String(q),'av-eq-barra-qtd'));barras.append(b);}
  topo.append(barras);}
 s.append(topo);
 if(!total){s.append(el('p','Este instrutor ainda não recebeu avaliações dos alunos.','op-help'));return;}
 const outras=[['Aula em geral',r.mediaAula],['Veículo',r.mediaVeiculo]].filter(([,v])=>v!=null);
 if(outras.length){const o=el('p',null,'av-eq-outras');o.append(...outras.flatMap(([t,v],i)=>[...(i?[el('span','·','av-eq-sep')]:[]),el('span',t+': '),el('strong',numero(v)+' ★')]));s.append(o);}
 if(r.tags?.length){const c=el('div',null,'av-eq-chips');for(const x of r.tags.slice(0,7)){const chip=el('span',null,'av-eq-chip');chip.append(el('span',x.tag),el('strong',String(x.total)));c.append(chip);}s.append(c);}
 if(r.comentarios?.length){const lista=el('div',null,'av-eq-comentarios');
  for(const x of r.comentarios.slice(0,3)){const f=el('figure',null,'av-eq-comentario'),cab=el('figcaption');
   cab.append(el('span','★'.repeat(x.nota)+'☆'.repeat(5-x.nota),'av-eq-comentario-estrelas'),el('time',new Date(x.em).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})));
   f.append(cab,el('blockquote','“'+x.comentario+'”'));lista.append(f);}
  s.append(lista);}
 s.append(el('p','Avaliações anônimas: o nome do aluno não aparece.','av-eq-nota-rodape'));
}
