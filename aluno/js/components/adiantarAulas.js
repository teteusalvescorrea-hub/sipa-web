// 10/11/2026: "Quero adiantar minhas aulas" (Minhas aulas). O clique já envia o pedido à Recepção (um em aberto por aluno:
// pedir de novo só confirma o que já está com ela) e abre a confirmação, no mesmo visual do "Contratar mais aulas". A
// Recepção vê o pedido em Antecipação de aulas e entra em contato quando tiver horário mais cedo. Depois de enviado (e ao
// voltar à tela, enquanto o pedido estiver aberto), o botão fica "✓ Pedido de antecipação enviado"; com o "Contato feito"
// da Recepção, ele volta ao normal.
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
const ICONE='<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="14" r="7.5"/><path d="M9.5 2.5h5M12 2.5v4M12 14l3.2-3.2M18.6 6.6 20 5.2"/></svg>';
const quando=iso=>{const s=String(iso||'');return s?s.slice(8,10)+'/'+s.slice(5,7)+' às '+s.slice(11,16):'';};
const ICONE_OK='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12.5 4.5 4.5L19 7.5"/></svg>';
const ROTULO='Quero adiantar minhas aulas',ROTULO_ENVIADO='Pedido de antecipação enviado';
const JA_ENVIADO=pedidoEm=>({titulo:'Seu pedido já está com a Recepção',texto:'Você pediu para adiantar suas aulas em '+quando(pedidoEm)+'. A Recepção já está com o pedido e entra em contato quando houver um horário mais cedo.'});

// O botão no estado "enviado" (verde, com o visto) ou de volta ao normal.
function mostrarEstado(botao,pedidoEm){
 const enviado=!!pedidoEm;
 botao.classList.toggle('lessons-adiantar-enviado',enviado);
 if(enviado)botao.dataset.pedidoEm=pedidoEm;else delete botao.dataset.pedidoEm;
 botao.querySelector('i').innerHTML=enviado?ICONE_OK:ICONE;
 botao.querySelector('span').textContent=enviado?ROTULO_ENVIADO:ROTULO;
 botao.title=enviado?'Enviado em '+quando(pedidoEm)+'. A Recepção entra em contato quando houver um horário mais cedo.':'';
 botao.setAttribute('aria-label',enviado?ROTULO_ENVIADO+' em '+quando(pedidoEm):ROTULO);
}

function confirmacao(origem,{titulo,texto,erro=false,alterar=null}){
 document.querySelector('.lesson-adiantar-dialog')?.remove();
 const d=el('dialog',undefined,'lesson-cancel-dialog lesson-hire-dialog lesson-adiantar-dialog'+(erro?' lesson-adiantar-erro':''));
 d.setAttribute('aria-labelledby','lesson-adiantar-title');d.setAttribute('aria-describedby','lesson-adiantar-texto');
 const cabecalho=el('header');cabecalho.innerHTML=ICONE;
 const h=el('h2',titulo);h.id='lesson-adiantar-title';h.tabIndex=-1;cabecalho.append(h);
 const corpo=el('div',undefined,'lesson-adiantar-corpo');
 if(!erro){const selo=el('span','✓','lesson-adiantar-selo');selo.setAttribute('aria-hidden','true');corpo.append(selo);}
 const p=el('p',texto);p.id='lesson-adiantar-texto';corpo.append(p);
 const fechar=el('button','Fechar','lesson-hire-fechar');fechar.type='button';fechar.onclick=()=>d.close();
 const rodape=el('footer');
 if(alterar){const b=el('button','Alterar dias e horários','lesson-hire-fechar lesson-adiantar-alterar');b.type='button';b.onclick=()=>{d.onclose=null;d.close();d.remove();alterar();};rodape.append(b);}
 rodape.append(fechar);
 d.append(cabecalho,corpo,rodape);
 d.onclose=()=>{d.remove();origem?.focus();};
 document.body.append(d);d.showModal();h.focus({preventScroll:true});
}

// 16/11/2026 (pedido do usuário): antes de enviar, o aluno escolhe os dias da semana e os horários em que pode fazer
// aula, para a equipe da agenda achar o horário mais cedo. Com o pedido já enviado, dá para alterar a escolha.
export const DIAS_SEMANA=[[1,'Seg','Segunda'],[2,'Ter','Terça'],[3,'Qua','Quarta'],[4,'Qui','Quinta'],[5,'Sex','Sexta'],[6,'Sáb','Sábado']];
export const HORARIOS_ADIANTAR=Array.from({length:12},(_,i)=>String(7+i).padStart(2,'0')+':00');
export const PERIODOS_ADIANTAR=[['Manhã',['07:00','08:00','09:00','10:00','11:00']],['Tarde',['12:00','13:00','14:00','15:00','16:00','17:00','18:00']]];
const escolhaAtual=botao=>{try{return JSON.parse(botao.dataset.disponibilidade||'{}');}catch{return {};}};

function escolherDisponibilidade(botao,{alterar=false}={}){
 document.querySelector('.lesson-adiantar-dialog')?.remove();
 const atual=escolhaAtual(botao),dias=new Set(atual.dias||[]),horas=new Set(atual.horarios||[]);
 const d=el('dialog',undefined,'lesson-cancel-dialog lesson-hire-dialog lesson-adiantar-dialog lesson-adiantar-escolha');
 d.setAttribute('aria-labelledby','lesson-adiantar-title');
 const cabecalho=el('header');cabecalho.innerHTML=ICONE;
 const h=el('h2',alterar?'Alterar dias e horários':'Quando você pode fazer aula?');h.id='lesson-adiantar-title';h.tabIndex=-1;cabecalho.append(h);
 const corpo=el('div',undefined,'lesson-adiantar-form');
 corpo.append(el('p','Marque os dias e os horários em que você pode vir. A Recepção usa isso para encaixar suas aulas mais cedo.','lesson-adiantar-intro'));
 const chip=(texto,ativo,aoMudar,titulo)=>{const b=el('button',texto,'lesson-adiantar-chip');b.type='button';b.setAttribute('aria-pressed',String(ativo));if(titulo)b.setAttribute('aria-label',titulo);
  b.onclick=()=>{const v=b.getAttribute('aria-pressed')!=='true';b.setAttribute('aria-pressed',String(v));aoMudar(v);validar();};return b;};
 const grupo=(titulo,...filhos)=>{const s=el('fieldset',undefined,'lesson-adiantar-grupo');s.append(el('legend',titulo),...filhos);return s;};
 const linhaDias=el('div',undefined,'lesson-adiantar-chips lesson-adiantar-dias');
 for(const [n,curto,longo] of DIAS_SEMANA)linhaDias.append(chip(curto,dias.has(n),v=>v?dias.add(n):dias.delete(n),longo));
 corpo.append(grupo('Dias da semana',linhaDias));
 const blocos=[];
 for(const [periodo,lista] of PERIODOS_ADIANTAR){
  const linha=el('div',undefined,'lesson-adiantar-chips');for(const hh of lista)linha.append(chip(hh,horas.has(hh),v=>v?horas.add(hh):horas.delete(hh)));
  const todos=el('button','Todos','lesson-adiantar-todos');todos.type='button';
  todos.onclick=()=>{const marcar=!lista.every(x=>horas.has(x));for(const x of lista)marcar?horas.add(x):horas.delete(x);linha.querySelectorAll('.lesson-adiantar-chip').forEach((b,i)=>b.setAttribute('aria-pressed',String(horas.has(lista[i]))));validar();};
  const topo=el('div',undefined,'lesson-adiantar-periodo');topo.append(el('span',periodo),todos);blocos.push(topo,linha);
 }
 corpo.append(grupo('Horários',...blocos));
 corpo.append(el('p','No sábado, as aulas vão até as 11:00.','lesson-adiantar-dica'));
 const aviso=el('p','','lesson-adiantar-aviso');aviso.setAttribute('role','status');corpo.append(aviso);
 const cancelar=el('button','Cancelar','lesson-hire-fechar');cancelar.type='button';cancelar.onclick=()=>d.close();
 const enviar=el('button',alterar?'Salvar alteração':'Enviar pedido','lesson-adiantar-enviar');enviar.type='button';
 function validar(){const ok=dias.size>0&&horas.size>0;enviar.disabled=!ok;aviso.textContent=ok?dias.size+(dias.size===1?' dia':' dias')+' e '+horas.size+(horas.size===1?' horário':' horários')+' escolhidos.':'Escolha pelo menos um dia e um horário.';}
 enviar.onclick=()=>{d.close();enviarPedido(botao,{diasDaSemana:[...dias].sort((a,b)=>a-b),horarios:[...horas].sort()},alterar);};
 const rodape=el('footer');rodape.append(cancelar,enviar);
 d.append(cabecalho,corpo,rodape);d.onclose=()=>{d.remove();};
 document.body.append(d);d.showModal();h.focus({preventScroll:true});validar();
}

// O resumo da escolha para a confirmação ("Seg, Qua e Sex · 07:00, 08:00 e 14:00").
const juntar=l=>l.length>1?l.slice(0,-1).join(', ')+' e '+l.at(-1):l.join('');
export const resumoDisponibilidade=(dias=[],horarios=[])=>dias.length||horarios.length?[juntar(DIAS_SEMANA.filter(([n])=>dias.includes(n)).map(([,c])=>c)),juntar(horarios)].filter(Boolean).join(' · '):'';

async function enviarPedido(botao,disponibilidade,alterar){
 if(botao.dataset.enviando)return;botao.dataset.enviando='1';botao.setAttribute('aria-busy','true');
 const rotulo=botao.querySelector('span');rotulo.textContent='Enviando…';
 try{
  const api=await import('../../../shared/js/api.js');
  const r=await api.Post('alunos/me/pedido-adiantamento',disponibilidade);
  guardarDisponibilidade(botao,r);mostrarEstado(botao,r?.pedidoEm||new Date().toISOString());
  const resumo=resumoDisponibilidade(r?.diasDaSemana||disponibilidade.diasDaSemana,r?.horarios||disponibilidade.horarios);
  confirmacao(botao,{titulo:alterar?'Dias e horários atualizados':'Pedido enviado à Recepção',texto:(alterar?'A Recepção já vê os novos dias e horários':'A Recepção recebeu que você deseja adiantar suas aulas e entra em contato quando houver um horário mais cedo')+(resumo?'. Você pode: '+resumo+'.':'.')});
 }catch(e){if(!alterar)mostrarEstado(botao,null);else mostrarEstado(botao,botao.dataset.pedidoEm);confirmacao(botao,{titulo:'Não foi possível enviar',texto:e?.message||'Tente de novo em instantes ou fale com a Recepção.',erro:true});}
 finally{delete botao.dataset.enviando;botao.removeAttribute('aria-busy');}
}
function guardarDisponibilidade(botao,r){if(r)botao.dataset.disponibilidade=JSON.stringify({dias:r.diasDaSemana||[],horarios:r.horarios||[]});}

async function pedir(botao){
 // Já enviado: lembra a data e os dias e horários, com a opção de alterar.
 if(botao.dataset.pedidoEm){const a=escolhaAtual(botao),resumo=resumoDisponibilidade(a.dias,a.horarios),j=JA_ENVIADO(botao.dataset.pedidoEm);
  confirmacao(botao,{...j,texto:j.texto+(resumo?' Você informou: '+resumo+'.':''),alterar:()=>escolherDisponibilidade(botao,{alterar:true})});return;}
 escolherDisponibilidade(botao);
}

// Ao abrir a tela: o pedido em aberto (204 = nenhum) deixa o botão como "enviado".
async function carregarEstado(botao){
 try{const api=await import('../../../shared/js/api.js');const r=await api.Get('alunos/me/pedido-adiantamento');if(r?.pedidoEm){guardarDisponibilidade(botao,r);mostrarEstado(botao,r.pedidoEm);}}catch{}
}

// O botão entra no topo de Minhas aulas, antes do "Contratar mais aulas". É um link com papel de botão (como o Contratar):
// ao abrir a página, o integrado.js desabilita todos os <button> de main enquanto carrega os dados, e um <button> novo
// ficaria desabilitado.
export function montarAdiantarAulas(){
 const acoes=document.querySelector('.lessons-header-actions');
 if(!acoes||acoes.querySelector('[data-adiantar-aulas]'))return;
 const b=el('a',undefined,'lessons-hire-button lessons-adiantar-button');b.href='#adiantar-aulas';b.setAttribute('role','button');b.dataset.adiantarAulas='';
 b.setAttribute('aria-haspopup','dialog');
 const icone=el('i');icone.innerHTML=ICONE;icone.setAttribute('aria-hidden','true');
 b.append(icone,el('span',ROTULO));
 b.onclick=e=>{e.preventDefault();pedir(b);};
 b.onkeydown=e=>{if(e.key===' '){e.preventDefault();pedir(b);}};
 acoes.prepend(b);
 carregarEstado(b);
}
