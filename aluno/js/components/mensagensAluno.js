import {mensagensDoAluno} from '../../../shared/js/mensagensAluno.js';
import {dataRelatorio} from '../../../shared/js/apresentacaoRelatorios.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
export function indicadorMensagens(aluno){marcarIndicadorMensagens(mensagensDoAluno(aluno).filter(m=>!m.lidaEm).length);}
// Sino e item Mensagens do menu: total dos avisos ainda não lidos.
export function marcarIndicadorMensagens(total){
 const n=Math.max(0,Number(total)||0),a=document.querySelector('.sipa-sidebar-menu a[href="mensagens.html"]');
 if(a){a.setAttribute('aria-label','Mensagens'+(n?' — '+n+' não lida(s)':''));let badge=a.querySelector('.sipa-message-count');if(!badge){badge=el('span',undefined,'sipa-message-count');badge.setAttribute('aria-hidden','true');a.append(badge);}badge.textContent=n>99?'99+':String(n);badge.hidden=!n;}
 const b=document.getElementById('notification-button');if(b){b.disabled=false;b.title='Mensagens';b.onclick=()=>location.assign('mensagens.html');}document.querySelectorAll('.notification-badge').forEach(e=>{e.textContent=n>99?'99+':n;e.hidden=!n;});
}
// 18/11/2026 (pedido do usuário): novidades no item "Minhas aulas" do menu (avisos ainda não lidos, como o resultado do
// atestado decidido pela Gerência). Some quando o aluno lê os avisos.
export function marcarIndicadorNovidades(total){
 const n=Math.max(0,Number(total)||0),a=document.querySelector('.sipa-sidebar-menu a[href="minhas-aulas.html"]');if(!a)return;
 a.setAttribute('aria-label','Minhas aulas'+(n?' — '+n+' novidade(s)':''));let badge=a.querySelector('.sipa-message-count');
 if(!badge){badge=el('span',undefined,'sipa-message-count');badge.setAttribute('aria-hidden','true');a.append(badge);}badge.textContent=n>99?'99+':String(n);badge.hidden=!n;badge.title=n?n+' novidade(s) em Minhas aulas':'';
}
export function atualizarIndicadorNovidades(servico){if(!servico?.avisosNaoLidos)return Promise.resolve(null);return servico.avisosNaoLidos().then(l=>{marcarIndicadorNovidades(l.length);return l;},()=>null);}
export function atualizarIndicadorMensagens(servico,aluno){if(servico.totalNaoLidas)return servico.totalNaoLidas().then(marcarIndicadorMensagens,()=>{});indicadorMensagens(aluno);}
// aoContar(n): avisos não lidos, para o contador da aba "Avisos".
export async function montarMensagensAluno(host,servico,{aoContar}={}){
 let ocupado=false,pendente=false,vista='recebidas',pagina=1;const tamanho=5;
 // 25/11/2026 (pedido do usuário): os avisos que estavam sem ler quando o aluno entrou (já marcados como lidos no servidor).
 let novasDaVisita=null;const ehNova=m=>!!novasDaVisita?.some(x=>x.id===m.id);
 const abas=el('div',undefined,'mensagens-abas');abas.setAttribute('role','tablist');abas.setAttribute('aria-label','Visualização dos avisos');
 const botoes={};for(const [id,nome] of [['recebidas','Recebidas'],['lidas','Lidas']]){const b=el('button',nome);b.type='button';b.id='mensagens-aba-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',host.id);b.onclick=()=>{vista=id;pagina=1;atualizar();};b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const destino=e.key==='Home'?'recebidas':e.key==='End'?'lidas':id==='recebidas'?'lidas':'recebidas';botoes[destino].click();botoes[destino].focus();}};botoes[id]=b;abas.append(b);}host.before(abas);host.setAttribute('role','tabpanel');

 const nav=el('nav',undefined,'mensagens-paginacao');host.after(nav);nav.setAttribute('aria-label','Paginação das mensagens');
 // forcar: relê do servidor (ao voltar para a janela); sem ele, usa os dados já carregados.
 async function atualizar(forcar=false){if(ocupado){pendente=true;return;}ocupado=true;try{const dados=await (forcar&&servico.carregar?servico.carregar():servico.dadosAlunoLocal()),aluno=dados.aluno;let itens=mensagensDoAluno(aluno);let totais={recebidas:itens.filter(m=>!m.lidaEm).length,lidas:itens.filter(m=>m.lidaEm).length};atualizarIndicadorMensagens(servico,aluno);aoContar?.(totais.recebidas);host.replaceChildren();nav.replaceChildren();
  let visiveis,total;
  if(servico.consultarAvisos){
   let [r,outro]=await Promise.all([servico.consultarAvisos({lidas:vista==='lidas',pagina,tamanho}),servico.consultarAvisos({lidas:vista!=='lidas',pagina:1,tamanho:1})]);
   total=r.total;const maximo=Math.max(1,Math.ceil(total/tamanho));if(pagina>maximo){pagina=maximo;r=await servico.consultarAvisos({lidas:vista==='lidas',pagina,tamanho});}
   visiveis=r.itens;totais[vista]=total;totais[vista==='lidas'?'recebidas':'lidas']=outro.total;
   // Nesta visita, "Recebidas" mostra os avisos que chegaram sem ler (o servidor já os conta como lidos).
   if(novasDaVisita?.length){totais.recebidas=novasDaVisita.length;if(vista==='recebidas'){total=novasDaVisita.length;pagina=Math.min(pagina,Math.max(1,Math.ceil(total/tamanho)));visiveis=novasDaVisita.slice((pagina-1)*tamanho,pagina*tamanho);}}
  }else{
   const lista=itens.filter(m=>vista==='lidas'?!!m.lidaEm:!m.lidaEm);total=lista.length;pagina=Math.min(pagina,Math.max(1,Math.ceil(total/tamanho)));visiveis=lista.slice((pagina-1)*tamanho,pagina*tamanho);
  }
  const anterior=el('button','Anterior'),proxima=el('button','Próxima'),info=el('span','Página '+pagina+' de '+Math.max(1,Math.ceil(total/tamanho))+' · '+total+' mensagem(ns)');anterior.type=proxima.type='button';anterior.disabled=pagina===1;proxima.disabled=pagina*tamanho>=total;anterior.onclick=()=>{pagina--;atualizar();};proxima.onclick=()=>{pagina++;atualizar();};info.setAttribute('aria-live','polite');nav.append(anterior,info,proxima);
  for(const [id,b] of Object.entries(botoes)){const ativa=id===vista;b.setAttribute('aria-selected',String(ativa));b.tabIndex=ativa?0:-1;b.textContent=(id==='recebidas'?'Recebidas':'Lidas')+' ('+totais[id]+')';}
  host.setAttribute('aria-labelledby',botoes[vista].id);
  if(!visiveis.length){host.append(el('p',vista==='lidas'?'Você ainda não possui avisos lidos.':'Nenhum aviso novo. Os avisos descartados ficam em Lidas.','mensagens-vazio'));return;}
  for(const m of visiveis){const b=el('button',undefined,'mensagem-item');b.type='button';b.dataset.mensagem=m.id;b.dataset.naoLida=String(!m.lidaEm);const topo=el('span',undefined,'mensagem-topo');topo.append(el('strong',m.assunto),el('span',ehNova(m)?'Nova':m.lidaEm?'Lida':'Não lida','mensagem-situacao'));b.append(topo,el('span',m.em?dataRelatorio(m.em):'Data não informada'),el('span',(m.remetente||'Recepção')+' — '+nomeUnidadeInstitucional(m.unidade||aluno.unidadePrincipal||aluno.unidade)),el('span',m.texto.slice(0,160)+(m.texto.length>160?'…':'')));b.onclick=()=>abrir(m,aluno);host.append(b);}
 }finally{ocupado=false;if(pendente){pendente=false;await atualizar();}}}
 async function mostrarConfirmacao(tituloTexto,texto){
  const sucesso=el('dialog',undefined,'mensagem-dialog oferta-confirmacao'),titulo=el('h2',tituloTexto),icone=el('span','✓','oferta-confirmacao-icone'),mensagem=el('p',texto),ok=el('button','Entendi');ok.type='button';ok.onclick=()=>sucesso.close();
  icone.setAttribute('aria-hidden','true');titulo.id='oferta-confirmada-titulo';sucesso.setAttribute('aria-labelledby',titulo.id);sucesso.append(icone,titulo,mensagem,ok);sucesso.addEventListener('close',()=>{sucesso.remove();botoes[vista]?.focus();},{once:true});document.body.append(sucesso);sucesso.showModal();ok.focus();
  try{await atualizar(true);}catch{mensagem.append(document.createTextNode(' Atualize a lista para consultar os dados atualizados.'));}
 }
 // Negativa da oferta: outro aluno ficou com a vaga. Fechar sem escolher mantém a mensagem aberta para decidir depois.
 function decidirEspera(interesseId,inicio){
  const p=el('dialog',undefined,'mensagem-dialog oferta-espera'),h=el('h2','Horário preenchido'),corpo=el('div',undefined,'mensagem-conteudo'),caixa=el('section',undefined,'oferta-acoes'),vaga=el('div',undefined,'oferta-vaga'),erro=el('p'),rodape=el('footer'),cancelar=el('button','Cancelar espera'),continuar=el('button','Continuar na espera'),chaves=new Map();let enviando=false;
  h.id='oferta-espera-titulo';h.tabIndex=-1;p.setAttribute('aria-labelledby',h.id);erro.setAttribute('role','alert');cancelar.type=continuar.type='button';vaga.dataset.disponivel='false';vaga.append(el('span','Horário da vaga'),el('strong',dataRelatorio(inicio)),el('em','Preenchido'));
  caixa.append(vaga,el('p','Este horário foi preenchido por outro aluno.','oferta-nota'),el('p','Deseja continuar na espera deste horário?','oferta-pergunta'));corpo.append(caixa);rodape.append(cancelar,continuar);p.append(h,corpo,erro,rodape);
  const responder=async(acao,titulo,texto)=>{if(enviando)return;enviando=true;cancelar.disabled=continuar.disabled=true;erro.textContent='';if(!chaves.has(acao))chaves.set(acao,crypto.randomUUID());
   try{await servico.responderOferta(interesseId,acao,undefined,chaves.get(acao));p.close();await mostrarConfirmacao(titulo,texto);}catch(e){erro.textContent=e.message;cancelar.disabled=continuar.disabled=false;}finally{enviando=false;}};
  continuar.onclick=()=>responder('continuar','Você continua na espera','Se este horário voltar a ficar livre, a AgIA poderá enviar uma nova oferta.');
  cancelar.onclick=()=>responder('descartar','Espera cancelada','Você não está mais na espera deste horário. Suas aulas foram mantidas.');
  p.addEventListener('cancel',e=>{if(enviando)e.preventDefault();});p.addEventListener('close',()=>{p.remove();botoes[vista]?.focus();},{once:true});document.body.append(p);p.showModal();h.focus();
 }
 async function abrir(m,aluno){const d=el('dialog',undefined,'mensagem-dialog'),h=el('h2',m.assunto),corpo=el('div',undefined,'mensagem-conteudo'),erro=el('p'),fechar=el('button','Fechar'),ler=el('button','Descartar aviso');h.id='mensagem-assunto';h.tabIndex=-1;d.setAttribute('aria-labelledby',h.id);d.dataset.mensagemAberta=m.id;fechar.type=ler.type='button';fechar.onclick=()=>d.close();ler.hidden=!!m.lidaEm||ehNova(m);erro.setAttribute('role','alert');
  const registrarLeitura=async()=>{ler.disabled=true;try{await servico.marcarMensagemLida(m.id);d.close();await atualizar(true);}catch(e){erro.textContent=e.message;ler.hidden=false;ler.disabled=false;}};ler.onclick=registrarLeitura;
  corpo.append(el('p',(m.remetente||'Recepção')+' — '+nomeUnidadeInstitucional(m.unidade||aluno.unidadePrincipal||aluno.unidade),'mensagem-origem'),el('p',m.texto,'mensagem-texto'));const rodape=el('footer');rodape.append(ler,fechar);d.append(h,corpo,erro,rodape);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();h.focus();
  if(m.interesseAntecipacaoId&&servico.ofertaAntecipacao){
   const ofertaBox=el('section',undefined,'oferta-acoes'),estado=el('p','Consultando oferta…');ofertaBox.append(estado);corpo.append(ofertaBox);
   try{
    const oferta=await servico.ofertaAntecipacao(m.interesseAntecipacaoId);
    estado.textContent=oferta.situacao+(oferta.disponivel?' · Vaga disponível neste momento.':' · Esta vaga não está disponível neste momento.');
    if(oferta.situacao==='Vaga preenchida'){d.close();decidirEspera(m.interesseAntecipacaoId,oferta.inicio);return;}
    if(oferta.situacao==='Oferta enviada'){
     ler.hidden=true;estado.hidden=true;d.classList.add('oferta-dialog');
     const temSaldo=Number(oferta.saldoDisponivel)>0,chaves=new Map(),introducao=[...corpo.children].filter(n=>n!==ofertaBox),nomeTroca=temSaldo?'Adiantar aula':'Reagendar aula',aulasTroca=oferta.aulas.filter(a=>a.dentroPrazo);let enviando=false;
     const vaga=el('div',undefined,'oferta-vaga'),opcoes=el('div',undefined,'oferta-etapa');vaga.dataset.disponivel=String(!!oferta.disponivel);
     vaga.append(el('span','Horário da vaga'),el('strong',dataRelatorio(oferta.inicio)),el('em',oferta.disponivel?'Vaga disponível':'Vaga indisponível'));ofertaBox.append(vaga,opcoes);
     const botao=(texto,fn)=>{const b=el('button',texto);b.type='button';b.onclick=fn;return b;};
     const aoTopo=()=>{corpo.scrollTop=0;h.focus();};
     // Ações em cartões: uma lista curta não precisa de select; o motivo aparece quando a ação está indisponível.
     function inicio(){
      h.textContent=m.assunto;introducao.forEach(n=>n.hidden=false);erro.textContent='';d.dataset.etapa='inicio';rodape.replaceChildren(fechar);opcoes.replaceChildren();
      const pergunta=el('p','O que deseja fazer?','oferta-pergunta'),lista=el('div',undefined,'oferta-opcoes');pergunta.id='oferta-pergunta';lista.setAttribute('role','group');lista.setAttribute('aria-labelledby',pergunta.id);
      const adicionar=(valor,nome,descricao,habilitada=true)=>{const b=botao(undefined,()=>etapa(valor));b.className='oferta-opcao';b.dataset.oferta=valor;b.disabled=!habilitada;b.append(el('strong',nome),el('span',descricao));lista.append(b);};
      const semVaga='Vaga indisponível no momento.';
      if(temSaldo)adicionar('nova','Aceitar oferta',oferta.disponivel?'Agendar este horário usando 1 crédito do saldo.':semVaga,oferta.disponivel);
      adicionar('antecipar',nomeTroca,!oferta.disponivel?semVaga:aulasTroca.length?'Trocar uma aula já marcada por este horário.':'Nenhuma aula dentro do prazo para troca.',oferta.disponivel&&aulasTroca.length>0);
      adicionar('descartar','Descartar oferta','Recusar esta vaga. Suas aulas não mudam.');
      if(!temSaldo)opcoes.append(el('p','Sem saldo para uma aula nova. Você pode reagendar uma aula existente.','oferta-nota'));
      opcoes.append(pergunta,lista);
     }
     function etapa(acao){
      introducao.forEach(n=>n.hidden=true);erro.textContent='';opcoes.replaceChildren();d.dataset.etapa=acao;h.textContent=acao==='antecipar'?nomeTroca:acao==='nova'?'Aceitar oferta':'Descartar oferta';
      const voltar=botao('Voltar',()=>{inicio();aoTopo();});
      if(acao==='antecipar'){
       const grupo=el('fieldset',undefined,'oferta-aulas'),confirmar=botao('Confirmar reagendamento',()=>responder('antecipar',grupo.querySelector('input:checked')?.value)),resumo=el('p',undefined,'oferta-nota');resumo.setAttribute('aria-live','polite');grupo.append(el('legend','Qual aula você deseja reagendar?'));
       const conferir=()=>{const a=oferta.aulas.find(a=>a.id===grupo.querySelector('input:checked')?.value);confirmar.disabled=!a;resumo.replaceChildren(...(a?[el('span','Será cancelada: '+dataRelatorio(a.dataHoraInicio)),el('span','Será agendada: '+dataRelatorio(oferta.inicio))]:[el('span','Escolha a aula que será substituída.')]));};
       for(const a of aulasTroca){const rotulo=el('label',undefined,'oferta-aula'),radio=el('input');radio.type='radio';radio.name='oferta-aula';radio.value=a.id;radio.checked=aulasTroca.length===1;radio.onchange=conferir;rotulo.append(radio,el('span',dataRelatorio(a.dataHoraInicio)));grupo.append(rotulo);}
       conferir();opcoes.append(grupo,resumo);rodape.replaceChildren(voltar,confirmar);
      }else{
       const confirmar=botao(acao==='nova'?'Confirmar agendamento':'Confirmar descarte',()=>responder(acao));
       opcoes.append(el('p',acao==='nova'?'O agendamento utilizará 1 crédito do seu saldo disponível.':'Esta oferta será descartada. Suas aulas não serão alteradas.','oferta-nota'));rodape.replaceChildren(voltar,confirmar);
      }
      aoTopo();
     }
     async function responder(acao,aulaId){
      if(enviando)return;enviando=true;const controles=[...d.querySelectorAll('button,input')].map(b=>[b,b.disabled]);controles.forEach(([b])=>b.disabled=true);erro.textContent='';
      const pedido=acao+':'+(aulaId||'');if(!chaves.has(pedido))chaves.set(pedido,crypto.randomUUID());
      try{
       await servico.responderOferta(m.interesseAntecipacaoId,acao,aulaId,chaves.get(pedido));
       const anterior=oferta.aulas.find(a=>a.id===aulaId),texto=acao==='descartar'?'A oferta foi descartada. Suas aulas foram mantidas.':acao==='nova'?'Aula agendada para '+dataRelatorio(oferta.inicio)+' utilizando 1 crédito do seu saldo.':'Aula de '+dataRelatorio(anterior.dataHoraInicio)+' cancelada. Nova aula agendada para '+dataRelatorio(oferta.inicio)+'.';
       d.close();await mostrarConfirmacao(acao==='descartar'?'Oferta descartada!':'Agendamento confirmado!',texto);
      }catch(e){
       // Outro aluno pode ter aceitado enquanto a oferta estava aberta: a negativa vem no lugar do erro.
       const atual=await servico.ofertaAntecipacao(m.interesseAntecipacaoId).catch(()=>null);
       if(atual?.situacao==='Vaga preenchida'){d.close();decidirEspera(m.interesseAntecipacaoId,atual.inicio);atualizar(true).catch(()=>{});return;}
       erro.textContent=e.message;controles.forEach(([b,desabilitado])=>b.disabled=desabilitado);
      }finally{enviando=false;}
     }
     d.addEventListener('cancel',e=>{if(enviando)e.preventDefault();});inicio();

    }else{
     for(const n of corpo.children)if(n!==ofertaBox)n.hidden=true;
     ofertaBox.classList.add('oferta-final');
     h.textContent=oferta.situacao==='Atendida'?'Agendamento confirmado!':oferta.situacao==='Descartada'?'Oferta descartada':'Oferta encerrada';
     estado.textContent=oferta.situacao==='Atendida'?'Sua aula foi agendada para '+dataRelatorio(oferta.inicio)+'. Consulte Minhas aulas.':oferta.situacao==='Descartada'?'Esta oferta foi descartada.':'Esta oferta não está mais disponível.';
     if(oferta.situacao==='Atendida')ofertaBox.classList.add('oferta-atendida');
    }
   }catch(e){estado.textContent=e.message;}
  }

 }
 // 25/11/2026 (pedido do usuário): entrar aqui já conta como visualizado. Os avisos sem ler são marcados como lidos no
 // servidor (os contadores zeram); nesta visita continuam em "Recebidas", com o selo "Nova".
 if(servico.consultarAvisos&&servico.marcarMensagemLida){try{const r=await servico.consultarAvisos({lidas:false,pagina:1,tamanho:100});const pendentes=r?.itens||[];if(pendentes.length){await Promise.allSettled(pendentes.map(m=>servico.marcarMensagemLida(m.id)));novasDaVisita=pendentes;atualizarIndicadorNovidades(servico);}}catch{novasDaVisita=null;}}
 await atualizar(!!novasDaVisita?.length);const refrescar=()=>atualizar(true).catch(e=>{host.replaceChildren(el('p',e.message));});window.addEventListener('focus',refrescar);window.addEventListener('storage',e=>{if(e.key==='sipa.operador.demo.v2')refrescar();});
}
