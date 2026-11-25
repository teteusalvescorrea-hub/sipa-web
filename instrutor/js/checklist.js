// Fase 4 (6.1) e 8.1–8.4: o instrutor escolhe a placa do dia e faz o checklist do início do dia (por instrutor e placa).
// Item com problema avisa a Gerência (pela lista de alertas). A seção "Checklist do veículo" do menu mostra o veículo de
// hoje, os veículos e o histórico. 10/11/2026: o checklist não abre mais sozinho ao entrar no sistema, e cada veículo
// ganhou o checklist do fim do dia (KM, combustível e se está com defeito).
import {hojeBrasil,formatarData} from '../../shared/js/calendario.js';

const CHAVE='sipa.instrutor.veiculoDoDia';
const chaveDe=id=>CHAVE+(id?'.'+id:'');
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const COMBUSTIVEL=[['1','Reserva'],['2','1/4'],['3','1/2'],['4','3/4'],['5','Cheio']];
const ITENS=[['pneusOk','Pneus'],['oleoOk','Óleo'],['iluminacaoOk','Iluminação'],['limpezaOk','Limpeza']];
const MAXIMO_FOTOS=5;
const MOMENTO_FIM=2;
const kmTexto=n=>Number(n).toLocaleString('pt-BR')+' km';

function lerEscolha(id){try{const v=JSON.parse(localStorage.getItem(chaveDe(id))||'null');return v?.data===hojeBrasil()?v:null;}catch{return null;}}
function gravarEscolha(id,veiculo){try{localStorage.setItem(chaveDe(id),JSON.stringify({data:hojeBrasil(),veiculoId:veiculo.id,placa:veiculo.placa,modelo:veiculo.modelo||'',categoria:veiculo.categoria||''}));}catch{}}
const nomeVeiculo=v=>v?((v.placa||'')+(v.modelo&&v.modelo!==v.placa?' · '+String(v.modelo).replace(/^[A-Z0-9-]+ - /,''):'')):'';

// Grupo de botões de escolha (rádios com cara de botão). tom 'alerta' pinta o escolhido de laranja.
function segmentado(nome,opcoes){
 const g=el('div',null,'in-seg');g.setAttribute('role','radiogroup');
 for(const [v,t,tom] of opcoes){const l=el('label',null,'in-seg-op'+(tom?' '+tom:''));const r=el('input');r.type='radio';r.name=nome;r.value=v;r.required=true;l.append(r,el('span',t));g.append(l);}
 return {el:g,get value(){return g.querySelector('input:checked')?.value||'';}};
}
// 17/11/2026 (bug relatado pelo usuário): a recusa do envio (ex.: o KM mais de 2.000 km acima do último da placa) ia para
// o fim da área que rola, fora da vista, e o "Enviar checklist" parecia não fazer nada. O erro agora fica fixo logo
// acima dos botões; se o problema é o KM, o campo fica vermelho e recebe o foco.
function mostrarErro(erro,mensagem,km){
 erro.textContent=mensagem||'';
 if(km){const doKm=/\bKM\b/.test(mensagem||'');km.toggleAttribute('aria-invalid',doKm);km.closest('.in-ck-km')?.classList.toggle('in-ck-km-erro',doKm);if(doKm){km.scrollIntoView({block:'center',behavior:'smooth'});km.focus({preventScroll:true});}}
}
// 17/11/2026 (pedido do usuário): no KM mais de 2.000 km acima do último da placa, o próprio instrutor confirma e envia
// (a API anota a confirmação nas observações do checklist).
const CODIGO_KM_ACIMA='km-acima-do-ultimo';
function oferecerConfirmacaoKm(erro,aoConfirmar){
 const b=el('button','Sim, o KM está certo','in-button in-ck-confirmar-km');b.type='button';b.dataset.confirmarKm='';b.onclick=aoConfirmar;
 erro.append(el('br'),b);
}
function limparErroDoKm(km){km.addEventListener('input',()=>{km.removeAttribute('aria-invalid');km.closest('.in-ck-km')?.classList.remove('in-ck-km-erro');});}
function secao(titulo,...filhos){const s=el('section',null,'in-ck-secao');s.append(el('h3',titulo),...filhos);return s;}

// Campo de KM: texto só com números (o tipo number mudava o valor com a roda do mouse ao rolar o checklist).
function campoKm(){
 const km=el('input');km.type='text';km.required=true;km.name='km';km.inputMode='numeric';km.pattern='[0-9]{1,7}';km.maxLength=7;km.autocomplete='off';km.placeholder='Ex.: 52300';
 km.addEventListener('input',()=>{const limpo=km.value.replace(/\D/g,'');if(limpo!==km.value)km.value=limpo;});
 const sufixo=el('span','km','in-ck-km-sufixo');sufixo.setAttribute('aria-hidden','true');
 const caixa=el('div',null,'in-ck-km');caixa.append(km,sufixo);
 return {km,caixa};
}
// Observações (obrigatórias quando há problema) e as fotos.
function campoObservacoes(){
 const observacoes=el('textarea');observacoes.rows=3;observacoes.maxLength=1000;observacoes.name='observacoes';
 const rotulo=el('span');const campo=el('label',null,'in-ck-campo');campo.append(rotulo,observacoes);
 const exigir=(problema,{rotuloProblema,dicaProblema})=>{observacoes.required=problema;rotulo.textContent=problema?rotuloProblema:'Observações';observacoes.placeholder=problema?dicaProblema:'Algo a registrar sobre o veículo? (opcional)';};
 exigir(false,{});
 const fotos=el('input');fotos.type='file';fotos.accept='image/jpeg,image/png';fotos.multiple=true;fotos.name='fotos';fotos.className='in-ck-fotos-input';
 const zona=el('label',null,'in-ck-fotos');const lista=el('ul',null,'in-ck-fotos-lista');
 zona.append(fotos,el('strong','Adicionar fotos'),el('small','JPG ou PNG · até '+MAXIMO_FOTOS+' fotos (pneu, avaria, luz…)'));
 fotos.addEventListener('change',()=>{lista.replaceChildren(...[...fotos.files].map(f=>el('li',f.name)));});
 return {observacoes,campo,fotos,zona,lista,exigir};
}
// Sombra no topo/rodapé enquanto há conteúdo escondido (o texto não parece "cortado" pelo cabeçalho).
function ligarSombras(d,corpo,...observados){
 const sombras=()=>{d.classList.toggle('in-ck-rolado',corpo.scrollTop>2);d.classList.toggle('in-ck-mais',corpo.scrollTop+corpo.clientHeight<corpo.scrollHeight-2);};
 corpo.addEventListener('scroll',sombras,{passive:true});
 const observador=typeof ResizeObserver==='function'?new ResizeObserver(sombras):null;for(const o of [corpo,...observados])observador?.observe(o);
 return observador;
}

export function veiculoDoDia(id){return lerEscolha(id);}

// Sem pop-up: o veículo escolhido hoje ou, se não houver, o do checklist do início feito hoje (em outro aparelho).
export async function veiculoAtual(servico,{instrutorId}={}){
 const atual=lerEscolha(instrutorId);if(atual||!servico.veiculosDoDia)return atual;
 try{const feito=(await servico.veiculosDoDia())?.find(v=>v.checklistHoje);if(feito){gravarEscolha(instrutorId,feito);return lerEscolha(instrutorId);}}catch{}
 return null;
}

// O formulário do checklist do início do dia da placa v (devolve os controles para o envio).
function formularioChecklist(area,v){
 const {km,caixa}=campoKm();limparErroDoKm(km);
 const combustivel=segmentado('combustivel',COMBUSTIVEL);
 const painel=el('div',null,'in-ck-painel'),cKm=el('label',null,'in-ck-campo'),cComb=el('div',null,'in-ck-campo');
 cKm.append(el('span','Quilometragem atual'),caixa);cComb.append(el('span','Combustível'),combustivel.el);painel.append(cKm,cComb);
 const itens=ITENS.map(([nome,rot])=>{const s=segmentado(nome,[['true','OK'],['false','Precisa de manutenção','alerta']]);const linha=el('div',null,'in-ck-item');linha.append(el('strong',rot),s.el);return [nome,rot,s,linha];});
 const lista=el('div',null,'in-ck-itens');lista.append(...itens.map(i=>i[3]));
 const avarias=segmentado('semAvarias',[['true','Sem avarias'],['false','Com avarias','alerta']]);
 const obs=campoObservacoes();
 // Com avaria ou item a consertar, a descrição passa a ser obrigatória.
 area.addEventListener('change',()=>obs.exigir(avarias.value==='false'||itens.some(i=>i[2].value==='false'),{rotuloProblema:'Descreva o problema (obrigatório)',dicaProblema:'O que está com problema? Onde?'}));
 area.replaceChildren(
  el('div',null,'in-ck-separador'),
  secao('Painel',painel),
  secao('Itens do veículo',lista),
  secao('Avarias',avarias.el),
  secao('Observações e fotos',obs.campo,obs.zona,obs.lista));
 const titulo=el('p','Checklist da placa '+v.placa,'in-ck-titulo');area.prepend(titulo);
 return {km,combustivel,itens:itens.map(([nome,,s])=>[nome,null,s]),avarias,observacoes:obs.observacoes,fotos:obs.fotos};
}

// Escolher (ou trocar) o veículo; na 1ª vez do dia com a placa, o checklist do início é feito aqui. Se o instrutor já fez
// o checklist de hoje (em outro aparelho), segue com aquele veículo. trocar = true: o instrutor pediu para mudar o
// veículo (dá para cancelar). veiculoId: já abre com essa placa. Devolve a escolha do dia.
export async function garantirChecklist(servico,{instrutorId,trocar=false,veiculoId=null}={}){
 if(!servico.veiculosDoDia)return null;
 let veiculos;try{veiculos=await servico.veiculosDoDia();}catch{return lerEscolha(instrutorId);}
 if(!veiculos?.length)return null;
 const atual=lerEscolha(instrutorId);
 if(!trocar){
  if(atual&&veiculos.some(v=>v.id===atual.veiculoId&&v.checklistHoje))return atual;
  const feito=veiculos.find(v=>v.checklistHoje);if(feito&&!atual){gravarEscolha(instrutorId,feito);return lerEscolha(instrutorId);}
 }
 await new Promise(resolve=>{
  const d=el('dialog',null,'in-dialog in-checklist');d.dataset.checklistDoDia='';d.setAttribute('aria-labelledby','in-checklist-titulo');
  const cab=el('header',null,'in-ck-cabecalho'),titulo=el('h2','Veículo de hoje');titulo.id='in-checklist-titulo';titulo.tabIndex=-1;
  cab.append(titulo,el('p',trocar?'Escolha o veículo que você está usando agora. Se for a primeira vez hoje com essa placa, faça o checklist do início do dia.':'Antes de começar, escolha o veículo. Na primeira vez do dia com a placa, o checklist é obrigatório.','in-muted'));
  const f=el('form',null,'in-checklist-form');const erro=el('p',null,'in-error');erro.setAttribute('role','alert');
  const placa=el('select');placa.name='veiculoId';placa.required=true;placa.dataset.checklistPlaca='';placa.append(new Option('Selecione o veículo',''));
  for(const v of veiculos)placa.append(new Option(nomeVeiculo(v),v.id));
  const situacao=el('p',null,'in-ck-situacao');situacao.hidden=true;
  const cVeiculo=el('label',null,'in-ck-campo');cVeiculo.append(el('span','Veículo'),placa,situacao);
  const area=el('div',null,'in-ck-area');const salvar=el('button','Continuar','in-button in-primary');salvar.type='submit';
  const rodape=el('div',null,'in-checklist-acoes');
  if(trocar){const cancelar=el('button','Cancelar','in-button');cancelar.type='button';cancelar.onclick=()=>d.close();rodape.append(cancelar);}
  rodape.append(salvar);
  const corpo=el('div',null,'in-ck-corpo');corpo.append(cVeiculo,area);
  const observador=ligarSombras(d,corpo,area);
  f.append(corpo,erro,rodape);d.append(cab,f);
  const inicial=veiculoId||atual?.veiculoId;if(inicial&&veiculos.some(v=>v.id===inicial))placa.value=inicial;
  d.oncancel=e=>{if(!trocar)e.preventDefault();};
  let controles=null,confirmarKm=false;
  placa.onchange=()=>{const v=veiculos.find(x=>x.id===placa.value);area.replaceChildren();controles=null;confirmarKm=false;salvar.textContent='Continuar';situacao.hidden=!v;
   if(!v)return;
   situacao.textContent=v.checklistHoje?'✓ Seu checklist desta placa já foi feito hoje.':'Primeira vez hoje com esta placa: faça o checklist abaixo.'+(v.checklistPor?' (Já feito hoje por '+v.checklistPor+'.)':'');
   situacao.className='in-ck-situacao '+(v.checklistHoje?'ok':'pendente');
   if(v.checklistHoje)return;
   controles=formularioChecklist(area,v);salvar.textContent='Enviar checklist';controles.km.addEventListener('input',()=>{confirmarKm=false;});
  };
  f.onsubmit=async e=>{e.preventDefault();erro.textContent='';
   if(!f.checkValidity()){const faltando=f.querySelector(':invalid');erro.textContent=faltando?.type==='radio'?'Responda todos os itens do checklist.':'Preencha os campos obrigatórios.';faltando?.focus?.();return;}
   const v=veiculos.find(x=>x.id===placa.value);if(!v)return;
   if(!controles){gravarEscolha(instrutorId,v);d.close();return;}
   if(controles.fotos.files.length>MAXIMO_FOTOS){erro.textContent='Envie até '+MAXIMO_FOTOS+' fotos.';return;}
   salvar.disabled=true;
   try{
    const dados={veiculoId:v.id,km:controles.km.value,combustivel:controles.combustivel.value,semAvarias:controles.avarias.value,observacoes:controles.observacoes.value,...(confirmarKm?{confirmarKm:true}:{})};
    for(const [nome,,c] of controles.itens)dados[nome]=c.value;
    const r=await servico.registrarChecklist(dados,[...controles.fotos.files]);gravarEscolha(instrutorId,v);mostrarErro(erro,'',controles.km);
    if(r?.alerta){area.replaceChildren(el('p','Checklist enviado. A AgIA registrou os itens que precisam de manutenção e avisou a equipe.','in-ck-situacao ok'));salvar.textContent='Continuar';controles=null;salvar.disabled=false;placa.disabled=true;return;}
    d.close();
   }catch(x){mostrarErro(erro,x.message,controles?.km);salvar.disabled=false;if(x?.codigo===CODIGO_KM_ACIMA&&controles)oferecerConfirmacaoKm(erro,()=>{confirmarKm=true;f.requestSubmit();});}
  };
  d.addEventListener('close',()=>{observador?.disconnect();d.remove();resolve();},{once:true});document.body.append(d);d.showModal();titulo.focus();
  if(placa.value)placa.dispatchEvent(new Event('change'));
 });
 return lerEscolha(instrutorId);
}

// 10/11/2026: o checklist do fim do dia da placa v: KM, combustível e se o veículo está com defeito (com descrição e
// fotos). kmInicio: o KM do checklist do início de hoje (o do fim não pode ser menor). Devolve true se foi enviado.
export function checklistFimDoDia(servico,v,{kmInicio=null}={}){
 return new Promise(resolve=>{
  let enviado=false,confirmarKm=false;
  const d=el('dialog',null,'in-dialog in-checklist in-ck-fim');d.dataset.checklistFimDoDia='';d.setAttribute('aria-labelledby','in-ck-fim-titulo');
  const cab=el('header',null,'in-ck-cabecalho'),titulo=el('h2','Checklist do fim do dia');titulo.id='in-ck-fim-titulo';titulo.tabIndex=-1;
  cab.append(titulo,el('p','Placa '+nomeVeiculo(v)+'. Registre como o veículo ficou ao terminar o dia.','in-muted'));
  const f=el('form',null,'in-checklist-form');const erro=el('p',null,'in-error');erro.setAttribute('role','alert');
  const {km,caixa}=campoKm();limparErroDoKm(km);km.addEventListener('input',()=>{confirmarKm=false;});
  const cKm=el('label',null,'in-ck-campo');cKm.append(el('span','Quilometragem atual'),caixa);
  if(kmInicio!=null)cKm.append(el('small','No início do dia: '+kmTexto(kmInicio),'in-ck-dica'));
  const combustivel=segmentado('combustivel',COMBUSTIVEL);
  const cComb=el('div',null,'in-ck-campo');cComb.append(el('span','Combustível'),combustivel.el);
  const painel=el('div',null,'in-ck-painel');painel.append(cKm,cComb);
  const defeito=segmentado('semAvarias',[['true','Não, está tudo certo'],['false','Sim, está com defeito','alerta']]);
  const obs=campoObservacoes();
  f.addEventListener('change',()=>obs.exigir(defeito.value==='false',{rotuloProblema:'Descreva o defeito (obrigatório)',dicaProblema:'Qual é o defeito? Onde?'}));
  const corpo=el('div',null,'in-ck-corpo');
  corpo.append(secao('Painel',painel),secao('O veículo está com algum defeito?',defeito.el),secao('Observações e fotos',obs.campo,obs.zona,obs.lista));
  const cancelar=el('button','Cancelar','in-button');cancelar.type='button';cancelar.onclick=()=>d.close();
  const salvar=el('button','Enviar checklist','in-button in-primary');salvar.type='submit';
  const rodape=el('div',null,'in-checklist-acoes');rodape.append(cancelar,salvar);
  const observador=ligarSombras(d,corpo);
  f.append(corpo,erro,rodape);d.append(cab,f);
  f.onsubmit=async e=>{e.preventDefault();mostrarErro(erro,'',km);
   if(!f.checkValidity()){const faltando=f.querySelector(':invalid');erro.textContent=faltando?.type==='radio'?'Responda o combustível e se o veículo está com defeito.':'Preencha os campos obrigatórios.';faltando?.focus?.();return;}
   if(kmInicio!=null&&Number(km.value)<kmInicio){mostrarErro(erro,'O KM do fim do dia não pode ser menor que o do início do dia ('+kmTexto(kmInicio)+').',km);return;}
   if(obs.fotos.files.length>MAXIMO_FOTOS){erro.textContent='Envie até '+MAXIMO_FOTOS+' fotos.';return;}
   salvar.disabled=true;
   try{
    const r=await servico.registrarChecklist({veiculoId:v.id,momento:MOMENTO_FIM,km:km.value,combustivel:combustivel.value,semAvarias:defeito.value,observacoes:obs.observacoes.value,...(confirmarKm?{confirmarKm:true}:{})},[...obs.fotos.files]);
    enviado=true;
    if(r?.alerta){corpo.replaceChildren(el('p','Checklist do fim do dia enviado. A AgIA registrou o defeito e avisou a equipe.','in-ck-situacao ok'));cancelar.remove();salvar.textContent='Fechar';salvar.type='button';salvar.disabled=false;salvar.onclick=()=>d.close();salvar.focus();return;}
    d.close();
   }catch(x){mostrarErro(erro,x.message,km);salvar.disabled=false;if(x?.codigo===CODIGO_KM_ACIMA)oferecerConfirmacaoKm(erro,()=>{confirmarKm=true;f.requestSubmit();});}
  };
  d.addEventListener('close',()=>{observador?.disconnect();d.remove();resolve(enviado);},{once:true});document.body.append(d);d.showModal();titulo.focus();
 });
}

// "✓ feito" (verde) ou "pendente" (laranja) para o início e o fim do dia.
const marca=(feito,texto)=>el('small',(feito?'✓ ':'')+texto+(feito?' feito':' pendente'),'in-ck-marca'+(feito?' ok':''));

// A seção "Checklist do veículo": o veículo de hoje, os veículos do instrutor (com o checklist do início e o do fim do
// dia) e o histórico.
export async function montarSecaoChecklist(host,servico,{instrutorId,aoMudar}={}){
 host.replaceChildren(el('p','Carregando…','in-muted'));
 let veiculos=[],historico=[];
 try{[veiculos,historico]=await Promise.all([servico.veiculosDoDia(),servico.meusChecklists?servico.meusChecklists().catch(()=>[]):[]]);}catch(e){host.replaceChildren(el('p',e.message,'in-error'));return;}
 const atual=lerEscolha(instrutorId),escolhido=veiculos.find(v=>v.id===atual?.veiculoId);
 const recarregar=()=>montarSecaoChecklist(host,servico,{instrutorId,aoMudar});
 const abrir=async veiculoId=>{const r=await garantirChecklist(servico,{instrutorId,trocar:true,veiculoId});aoMudar?.(r);await recarregar();};
 const hojeIso=hojeBrasil();
 const kmDoInicio=id=>historico.find(c=>c.veiculoId===id&&String(c.data).slice(0,10)===hojeIso&&(c.momento??1)!==MOMENTO_FIM)?.km??null;
 const fimDoDia=async v=>{if(await checklistFimDoDia(servico,v,{kmInicio:kmDoInicio(v.id)}))await recarregar();};
 const botaoFim=(v,{primario=false}={})=>{
  if(v.fimDoDiaHoje)return null;
  const b=el('button','Checklist do fim do dia','in-button'+(primario?' in-primary':' in-ck-botao-fim'));b.type='button';b.dataset.checklistFim=v.id;b.onclick=()=>fimDoDia(v);return b;
 };

 const hoje=el('section',null,'in-card in-ck-hoje');
 const info=el('div');info.append(el('span','Veículo de hoje','in-ck-rotulo'),el('strong',escolhido?nomeVeiculo(escolhido):'Nenhum veículo escolhido'));
 if(escolhido){const marcas=el('div',null,'in-ck-marcas');marcas.append(marca(escolhido.checklistHoje,'Início do dia'),marca(escolhido.fimDoDiaHoje,'Fim do dia'));info.append(marcas);}
 else info.append(el('span','Escolha o veículo antes de começar as aulas.','in-ck-situacao pendente'));
 const acoesHoje=el('div',null,'in-ck-acoes');
 const fimHoje=escolhido&&botaoFim(escolhido,{primario:escolhido.checklistHoje});if(fimHoje)acoesHoje.append(fimHoje);
 const trocar=el('button',escolhido?'Trocar veículo':'Escolher veículo','in-button'+(escolhido?.checklistHoje?'':' in-primary'));trocar.type='button';trocar.onclick=()=>abrir(escolhido?.id);
 acoesHoje.append(trocar);
 hoje.append(info,acoesHoje);

 const lista=el('section',null,'in-card');lista.append(el('h2','Meus veículos','in-ck-h2'));
 if(!veiculos.length)lista.append(el('p','Nenhum veículo vinculado a você.','in-muted'));
 for(const v of veiculos){const linha=el('div',null,'in-ck-veiculo');const t=el('div');const marcas=el('div',null,'in-ck-marcas');
  marcas.append(marca(v.checklistHoje,'Início do dia'),marca(v.fimDoDiaHoje,'Fim do dia'));
  t.append(el('strong',nomeVeiculo(v)),marcas);if(!v.checklistHoje&&v.checklistPor)t.append(el('small','Início do dia feito hoje por '+v.checklistPor,'in-ck-outro'));
  const b=el('button',v.checklistHoje?'Usar este veículo':'Checklist do início','in-button'+(v.checklistHoje?'':' in-primary'));b.type='button';b.onclick=()=>abrir(v.id);
  const acoes=el('div',null,'in-ck-acoes');acoes.append(...[b,botaoFim(v)].filter(Boolean));linha.append(t,acoes);lista.append(linha);}

 const hist=el('section',null,'in-card');hist.append(el('h2','Meus checklists recentes','in-ck-h2'));
 if(!historico.length)hist.append(el('p','Nenhum checklist registrado ainda.','in-muted'));
 for(const c of historico.slice(0,15)){const linha=el('div',null,'in-ck-historico');const fim=c.momento===MOMENTO_FIM;
  const problemas=[...ITENS.filter(([n])=>c[n]===false).map(([,r])=>r),...(c.semAvarias===false?[fim?'Defeito':'Avarias']:[])];
  linha.append(el('strong',formatarData(String(c.data).slice(0,10))),el('span',fim?'Fim do dia':'Início do dia','in-ck-momento'+(fim?' fim':'')),
   el('span',(c.veiculo||'')+' · '+kmTexto(c.km)+' · combustível '+(COMBUSTIVEL.find(([v])=>Number(v)===c.combustivel)?.[1]||'—')),
   el('span',problemas.length?(fim?'Com defeito':'Manutenção: '+problemas.join(', ')):'Tudo OK','in-ck-situacao '+(problemas.length?'pendente':'ok')));hist.append(linha);}
 host.replaceChildren(hoje,lista,hist);
}
