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
export function atualizarIndicadorMensagens(servico,aluno){if(servico.totalNaoLidas)return servico.totalNaoLidas().then(marcarIndicadorMensagens,()=>{});indicadorMensagens(aluno);}
// aoContar(n): avisos não lidos, para o contador da aba "Avisos".
export async function montarMensagensAluno(host,servico,{aoContar}={}){
 let ocupado=false,pendente=false,vista='recebidas',pagina=1;const tamanho=5;
 const abas=el('div',undefined,'mensagens-abas');abas.setAttribute('role','tablist');abas.setAttribute('aria-label','Visualização dos avisos');
 const botoes={};for(const [id,nome] of [['recebidas','Recebidas'],['lidas','Lidas']]){const b=el('button',nome);b.type='button';b.id='mensagens-aba-'+id;b.setAttribute('role','tab');b.setAttribute('aria-controls',host.id);b.onclick=()=>{vista=id;pagina=1;atualizar();};b.onkeydown=e=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(e.key)){e.preventDefault();const destino=e.key==='Home'?'recebidas':e.key==='End'?'lidas':id==='recebidas'?'lidas':'recebidas';botoes[destino].click();botoes[destino].focus();}};botoes[id]=b;abas.append(b);}host.before(abas);host.setAttribute('role','tabpanel');

 const filtros=el('form',undefined,'mensagens-filtros'),de=el('input'),ate=el('input'),avisoFiltro=el('p'),nav=el('nav',undefined,'mensagens-paginacao');
 filtros.setAttribute('aria-label','Filtrar mensagens por data de envio');filtros.onsubmit=e=>e.preventDefault();de.type=ate.type='date';
 for(const [texto,input] of [['De',de],['Até',ate]]){const label=el('label',texto);label.append(input);filtros.append(label);input.onchange=()=>{pagina=1;atualizar();};}
 const limpar=el('button','Limpar filtro');limpar.type='button';limpar.onclick=()=>{de.value=ate.value='';pagina=1;atualizar();};avisoFiltro.setAttribute('role','alert');filtros.append(limpar,avisoFiltro);host.before(filtros);host.after(nav);nav.setAttribute('aria-label','Paginação das mensagens');
 // forcar: relê do servidor (ao voltar para a janela); sem ele, usa os dados já carregados.
 async function atualizar(forcar=false){if(ocupado){pendente=true;return;}ocupado=true;try{const dados=await (forcar&&servico.carregar?servico.carregar():servico.dadosAlunoLocal()),aluno=dados.aluno;let itens=mensagensDoAluno(aluno);let totais={recebidas:itens.filter(m=>!m.lidaEm).length,lidas:itens.filter(m=>m.lidaEm).length};atualizarIndicadorMensagens(servico,aluno);aoContar?.(totais.recebidas);host.replaceChildren();nav.replaceChildren();avisoFiltro.textContent='';
  if(de.value&&ate.value&&de.value>ate.value){avisoFiltro.textContent='A data final deve ser igual ou posterior à inicial.';return;}
  let visiveis,total;
  if(servico.consultarAvisos){
   const filtro={de:de.value||undefined,ate:ate.value||undefined};
   let [r,outro]=await Promise.all([servico.consultarAvisos({...filtro,lidas:vista==='lidas',pagina,tamanho}),servico.consultarAvisos({...filtro,lidas:vista!=='lidas',pagina:1,tamanho:1})]);
   total=r.total;const maximo=Math.max(1,Math.ceil(total/tamanho));if(pagina>maximo){pagina=maximo;r=await servico.consultarAvisos({...filtro,lidas:vista==='lidas',pagina,tamanho});}
   visiveis=r.itens;totais[vista]=total;totais[vista==='lidas'?'recebidas':'lidas']=outro.total;
  }else{
   itens=itens.filter(m=>(!de.value||String(m.em).slice(0,10)>=de.value)&&(!ate.value||String(m.em).slice(0,10)<=ate.value));
   totais={recebidas:itens.filter(m=>!m.lidaEm).length,lidas:itens.filter(m=>m.lidaEm).length};const lista=itens.filter(m=>vista==='lidas'?!!m.lidaEm:!m.lidaEm);total=lista.length;pagina=Math.min(pagina,Math.max(1,Math.ceil(total/tamanho)));visiveis=lista.slice((pagina-1)*tamanho,pagina*tamanho);
  }
  const anterior=el('button','Anterior'),proxima=el('button','Próxima'),info=el('span','Página '+pagina+' de '+Math.max(1,Math.ceil(total/tamanho))+' · '+total+' mensagem(ns)');anterior.type=proxima.type='button';anterior.disabled=pagina===1;proxima.disabled=pagina*tamanho>=total;anterior.onclick=()=>{pagina--;atualizar();};proxima.onclick=()=>{pagina++;atualizar();};info.setAttribute('aria-live','polite');nav.append(anterior,info,proxima);
  for(const [id,b] of Object.entries(botoes)){const ativa=id===vista;b.setAttribute('aria-selected',String(ativa));b.tabIndex=ativa?0:-1;b.textContent=(id==='recebidas'?'Recebidas':'Lidas')+' ('+totais[id]+')';}
  host.setAttribute('aria-labelledby',botoes[vista].id);
  if(!visiveis.length){host.append(el('p',vista==='lidas'?'Você ainda não possui avisos lidos.':'Nenhum aviso novo. Os avisos descartados ficam em Lidas.','mensagens-vazio'));return;}
  for(const m of visiveis){const b=el('button',undefined,'mensagem-item');b.type='button';b.dataset.mensagem=m.id;b.dataset.naoLida=String(!m.lidaEm);const topo=el('span',undefined,'mensagem-topo');topo.append(el('strong',m.assunto),el('span',m.lidaEm?'Lida':'Não lida','mensagem-situacao'));b.append(topo,el('span',m.em?dataRelatorio(m.em):'Data não informada'),el('span',(m.remetente||'Recepção')+' — '+nomeUnidadeInstitucional(m.unidade||aluno.unidadePrincipal||aluno.unidade)),el('span',m.texto.slice(0,160)+(m.texto.length>160?'…':'')));b.onclick=()=>abrir(m,aluno);host.append(b);}
 }finally{ocupado=false;if(pendente){pendente=false;await atualizar();}}}
 async function abrir(m,aluno){const d=el('dialog',undefined,'mensagem-dialog'),h=el('h2',m.assunto),corpo=el('div',undefined,'mensagem-conteudo'),erro=el('p'),fechar=el('button','Fechar'),ler=el('button','Descartar aviso');h.id='mensagem-assunto';h.tabIndex=-1;d.setAttribute('aria-labelledby',h.id);d.dataset.mensagemAberta=m.id;fechar.type=ler.type='button';fechar.onclick=()=>d.close();ler.hidden=!!m.lidaEm;erro.setAttribute('role','alert');
  const registrarLeitura=async()=>{ler.disabled=true;try{await servico.marcarMensagemLida(m.id);d.close();await atualizar(true);}catch(e){erro.textContent=e.message;ler.hidden=false;ler.disabled=false;}};ler.onclick=registrarLeitura;
  corpo.append(el('p',(m.remetente||'Recepção')+' — '+nomeUnidadeInstitucional(m.unidade||aluno.unidadePrincipal||aluno.unidade)),el('p',m.texto,'mensagem-texto'));const rodape=el('footer');rodape.append(ler,fechar);d.append(h,corpo,erro,rodape);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();h.focus();
  if(m.interesseAntecipacaoId&&servico.ofertaAntecipacao){
   const ofertaBox=el('section',undefined,'oferta-acoes'),estado=el('p','Consultando oferta…');ofertaBox.append(estado);corpo.append(ofertaBox);
   try{
    const oferta=await servico.ofertaAntecipacao(m.interesseAntecipacaoId);
    estado.textContent=oferta.situacao+(oferta.disponivel?' · Vaga disponível neste momento.':' · Esta vaga não está disponível neste momento.');
    if(oferta.situacao==='Oferta enviada'){
     ler.hidden=true;
     const temSaldo=Number(oferta.saldoDisponivel)>0,chaves=new Map(),introducao=[...corpo.children].filter(n=>n!==ofertaBox);let enviando=false;
     const opcoes=el('div');ofertaBox.append(opcoes);
     const botao=(texto,fn)=>{const b=el('button',texto);b.type='button';b.onclick=fn;return b;};
     function inicio(){
      h.textContent=m.assunto;introducao.forEach(n=>n.hidden=false);estado.textContent=oferta.disponivel?'Vaga disponível neste momento.':'Esta vaga não está disponível neste momento.';erro.textContent='';opcoes.replaceChildren();
      const label=el('label','O que deseja fazer?'),seletor=el('select');seletor.setAttribute('aria-label','Ação da oferta');
      const adicionar=(valor,texto,habilitada=true)=>{const o=el('option',texto);o.value=valor;o.disabled=!habilitada;seletor.append(o);};
      adicionar('','Selecione uma opção');if(temSaldo)adicionar('nova','Aceitar oferta',oferta.disponivel);
      adicionar('antecipar',temSaldo?'Adiantar aula':'Reagendar aula',oferta.disponivel&&oferta.aulas.some(a=>a.dentroPrazo));adicionar('descartar','Descartar oferta');
      if(!temSaldo)opcoes.append(el('p','Sem saldo para uma aula nova. Você pode reagendar uma aula existente.'));
      seletor.onchange=()=>{if(seletor.value)etapa(seletor.value);};label.append(seletor);opcoes.append(label);
     }
     function etapa(acao){
      introducao.forEach(n=>n.hidden=true);erro.textContent='';opcoes.replaceChildren();h.textContent=acao==='antecipar'?'Adiantar aula':acao==='nova'?'Aceitar oferta':'Descartar oferta';
      estado.textContent='Vaga: '+dataRelatorio(oferta.inicio)+'.';
      const voltar=botao('Voltar',inicio);voltar.className='oferta-voltar';
      if(acao==='antecipar'){
       const escolher=el('select'),rotulo=el('label','Qual aula você deseja reagendar?'),confirmar=botao('Confirmar reagendamento',()=>responder('antecipar',escolher.value)),resumo=el('p');resumo.setAttribute('aria-live','polite');
       escolher.setAttribute('aria-label','Aula que deseja reagendar');const vazio=el('option','Selecione uma aula');vazio.value='';escolher.append(vazio);
       for(const a of oferta.aulas.filter(a=>a.dentroPrazo)){const o=el('option',dataRelatorio(a.dataHoraInicio));o.value=a.id;escolher.append(o);}
       const conferir=()=>{const a=oferta.aulas.find(a=>a.id===escolher.value);confirmar.disabled=!a;resumo.textContent=a?'Será cancelada: '+dataRelatorio(a.dataHoraInicio)+'. Será agendada: '+dataRelatorio(oferta.inicio)+'.':'Escolha a aula que será substituída.';};
       escolher.onchange=conferir;conferir();rotulo.append(escolher);opcoes.append(rotulo,resumo,confirmar,voltar);escolher.focus();
      }else{
       opcoes.append(el('p',acao==='nova'?'O agendamento utilizará 1 crédito do seu saldo disponível.':'Esta oferta será descartada. Suas aulas não serão alteradas.'),botao(acao==='nova'?'Confirmar agendamento':'Confirmar descarte',()=>responder(acao)),voltar);
      }
     }
     async function responder(acao,aulaId){
      if(enviando)return;enviando=true;const controles=[...ofertaBox.querySelectorAll('button,select')].map(b=>[b,b.disabled]);controles.forEach(([b])=>b.disabled=true);erro.textContent='';
      const pedido=acao+':'+(aulaId||'');if(!chaves.has(pedido))chaves.set(pedido,crypto.randomUUID());
      try{
       await servico.responderOferta(m.interesseAntecipacaoId,acao,aulaId,chaves.get(pedido));
       const anterior=oferta.aulas.find(a=>a.id===aulaId),texto=acao==='descartar'?'A oferta foi descartada. Suas aulas foram mantidas.':acao==='nova'?'Aula agendada para '+dataRelatorio(oferta.inicio)+' utilizando 1 crédito do seu saldo.':'Aula de '+dataRelatorio(anterior.dataHoraInicio)+' cancelada. Nova aula agendada para '+dataRelatorio(oferta.inicio)+'.';
       d.close();const sucesso=el('dialog',undefined,'mensagem-dialog oferta-confirmacao'),titulo=el('h2',acao==='descartar'?'Oferta descartada!':'Agendamento confirmado!'),icone=el('span','✓','oferta-confirmacao-icone'),mensagem=el('p',texto),ok=botao('Entendi',()=>sucesso.close());
       icone.setAttribute('aria-hidden','true');titulo.id='oferta-confirmada-titulo';sucesso.setAttribute('aria-labelledby',titulo.id);sucesso.append(icone,titulo,mensagem,ok);sucesso.addEventListener('close',()=>{sucesso.remove();botoes[vista]?.focus();},{once:true});document.body.append(sucesso);sucesso.showModal();ok.focus();
       try{await atualizar(true);}catch{mensagem.append(document.createTextNode(' Atualize a lista para consultar os dados atualizados.'));}
      }catch(e){erro.textContent=e.message;controles.forEach(([b,desabilitado])=>b.disabled=desabilitado);}finally{enviando=false;}
     }
     d.addEventListener('cancel',e=>{if(enviando)e.preventDefault();});inicio();

    }else{
     for(const n of corpo.children)if(n!==ofertaBox)n.hidden=true;
     h.textContent=oferta.situacao==='Atendida'?'Agendamento confirmado!':oferta.situacao==='Descartada'?'Oferta descartada':'Oferta encerrada';
     estado.textContent=oferta.situacao==='Atendida'?'Sua aula foi agendada para '+dataRelatorio(oferta.inicio)+'. Consulte Minhas aulas.':oferta.situacao==='Descartada'?'Esta oferta foi descartada.':'Esta oferta não está mais disponível.';
     if(oferta.situacao==='Atendida')ofertaBox.classList.add('oferta-atendida');
    }
   }catch(e){estado.textContent=e.message;}
  }

 }
 await atualizar();const refrescar=()=>atualizar(true).catch(e=>{host.replaceChildren(el('p',e.message));});window.addEventListener('focus',refrescar);window.addEventListener('storage',e=>{if(e.key==='sipa.operador.demo.v2')refrescar();});
}
