// Fase 8 (5.5) e 7.8: o aluno avalia a aula com estrelas (instrutor, veículo, conservação do veículo, experiência durante
// a aula e aula em geral), tags rápidas e um comentário opcional.
// 17/11/2026 (pedido do usuário): a janela não abre mais sozinha no painel; o aluno abre pelo botão "Avaliar minha aula"
// no cartão da aula realizada (Minhas aulas → Aulas realizadas e faltas). A janela ganhou estilo próprio (avaliacao.css).
const TAGS=['Pontualidade','Didática','Paciência','Cordialidade','Segurança','Limpeza do veículo','Conservação do veículo'];
const NOTAS=[['notaInstrutor','Instrutor'],['notaVeiculo','Veículo'],['notaConservacao','Conservação e condições do veículo'],['notaExperiencia','Experiência durante a aula'],['notaAula','Aula em geral']];
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};

export function carregarCss(){
 if(document.querySelector('link[data-css-avaliacao]'))return;
 const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('../../css/avaliacao.css',import.meta.url).href;l.dataset.cssAvaliacao='';document.head.append(l);
}

// Cinco estrelas clicáveis (rádios com cara de estrela; a escolhida e as anteriores ficam amarelas).
function estrelas(nome,rotulo){
 const linha=el('div',undefined,'rating-linha');linha.dataset.avaliacao=nome;
 const titulo=el('span',rotulo,'rating-rotulo');titulo.id='rating-'+nome;
 const grupo=el('div',undefined,'rating-estrelas');grupo.setAttribute('role','radiogroup');grupo.setAttribute('aria-labelledby',titulo.id);
 // Do 5 para o 1 no HTML (o CSS inverte a ordem), para "~" pintar as anteriores ao passar o mouse.
 for(let n=5;n>=1;n--){const i=el('input');i.type='radio';i.name=nome;i.value=String(n);i.id=nome+'-'+n;i.required=true;
  const l=el('label','★');l.htmlFor=i.id;l.title=n+' estrela'+(n>1?'s':'');l.setAttribute('aria-label',n+' estrela'+(n>1?'s':''));grupo.append(i,l);}
 linha.append(titulo,grupo);return linha;
}

// Abre a avaliação de uma aula: {agendamentoId, inicio, instrutor, veiculo}. aoEnviar: depois de enviada.
export function abrirAvaliacao(servico,aula,{aoEnviar}={}){
 if(!servico?.avaliarAula||!aula?.agendamentoId)return;
 document.querySelector('[data-avaliacao-aula]')?.close();
 carregarCss();
 const d=el('dialog',undefined,'rating-dialog');d.dataset.avaliacaoAula=aula.agendamentoId;d.setAttribute('aria-labelledby','rating-title');
 const titulo=el('h2','Como foi sua aula?');titulo.id='rating-title';titulo.tabIndex=-1;
 const quando=String(aula.inicio||'');
 const resumo=el('p',[quando?quando.slice(8,10)+'/'+quando.slice(5,7)+' às '+quando.slice(11,16):'',aula.instrutor,aula.veiculo].filter(Boolean).join(' · '),'rating-resumo');
 const cabecalho=el('header',undefined,'rating-cabecalho');cabecalho.append(titulo,resumo);
 let enviado=false;const f=el('form',undefined,'rating-form'),erro=el('p',undefined,'rating-erro');erro.setAttribute('role','alert');
 const notas=el('div',undefined,'rating-notas');notas.append(...NOTAS.map(([n,r])=>estrelas(n,r)));
 const tags=el('fieldset',undefined,'rating-tags');tags.append(el('legend','O que se destacou? (opcional)'));
 for(const t of TAGS){const l=el('label'),i=el('input');i.type='checkbox';i.name='tags';i.value=t;l.append(i,el('span',t));tags.append(l);}
 const comentario=el('textarea');comentario.name='comentario';comentario.maxLength=1000;comentario.rows=3;comentario.placeholder='Conte como foi a aula (opcional)';
 const campoComentario=el('label',undefined,'rating-comentario');campoComentario.append(el('span','Comentário (opcional)'),comentario);
 const depois=el('button','Avaliar depois','rating-botao');depois.type='button';depois.onclick=()=>d.close();
 const enviar=el('button','Enviar avaliação','rating-botao rating-botao-primario');enviar.type='submit';
 const rodape=el('footer',undefined,'rating-rodape');rodape.append(depois,enviar);
 f.append(notas,tags,campoComentario,erro,rodape);
 f.onsubmit=async e=>{e.preventDefault();erro.textContent='';
  const falta=NOTAS.find(([n])=>!f.querySelector('input[name='+n+']:checked'));
  if(falta){erro.textContent='Dê de 1 a 5 estrelas em "'+falta[1]+'".';f.querySelector('input[name='+falta[0]+']')?.focus();return;}
  enviar.disabled=true;
  const nota=n=>Number(f.querySelector('input[name='+n+']:checked')?.value);
  try{await servico.avaliarAula(aula.agendamentoId,{notaInstrutor:nota('notaInstrutor'),notaVeiculo:nota('notaVeiculo'),notaAula:nota('notaAula'),notaConservacao:nota('notaConservacao'),notaExperiencia:nota('notaExperiencia'),tags:[...f.querySelectorAll('input[name=tags]:checked')].map(i=>i.value),comentario:comentario.value.trim()||null});
   // 17/11/2026 (pedido do usuário): a confirmação final em painel próprio: ✓ verde, a aula, a média das estrelas dadas.
   enviado=true;const media=NOTAS.reduce((s,[n])=>s+nota(n),0)/NOTAS.length;
   const fechar=el('button','Fechar','rating-botao rating-botao-primario rating-botao-largo');fechar.type='button';fechar.onclick=()=>d.close();
   const pronto=el('div',undefined,'rating-pronto');pronto.setAttribute('role','status');
   const icone=el('span','✓','rating-pronto-icone');icone.setAttribute('aria-hidden','true');
   const nota5=el('div',undefined,'rating-pronto-nota');const cheias=Math.round(media);
   nota5.append(el('span','★'.repeat(cheias)+'☆'.repeat(5-cheias),'rating-pronto-estrelas'),el('strong',media.toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})));
   const tituloPronto=el('h2','Avaliação enviada!');tituloPronto.id='rating-enviada-titulo';
   pronto.append(icone,tituloPronto,el('p',resumo.textContent,'rating-pronto-aula'),nota5,el('p','Obrigado! A sua opinião ajuda a autoescola a melhorar as aulas e o atendimento.','rating-pronto-texto'),fechar);
   cabecalho.hidden=true;d.setAttribute('aria-labelledby',tituloPronto.id);d.classList.add('rating-enviada');f.replaceChildren(pronto);fechar.focus();}
  catch(x){erro.textContent=x.message||'Não foi possível enviar a avaliação.';enviar.disabled=false;}};
 d.append(cabecalho,f);
 d.addEventListener('close',()=>{d.remove();if(enviado)aoEnviar?.();},{once:true});
 document.body.append(d);d.showModal();titulo.focus();
}
