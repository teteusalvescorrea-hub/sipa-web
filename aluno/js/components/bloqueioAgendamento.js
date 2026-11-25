// 25/11/2026 (pedido do usuário): com o agendamento bloqueado, a tela de agendar fica esfumaçada e um aviso no meio da
// tela explica que faltam as primeiras etapas, com a linha do tempo: o que o aluno já fez, onde está e o que falta. As
// pendências vêm da API (LiberacaoDoAlunoHelper.PendenciasDoAluno), sempre com estes nomes e nesta ordem.
// 25/11/2026: o toxicológico não trava (pode ser feito por último); por isso não entra na lista dos exames exigidos.
const EXAMES=[['Exame oftalmológico','Oftalmológico'],['Avaliação psicológica','Psicológica'],['Exame médico','Médico']];
const VALIDACAO='Validação do cadastro pela recepção',TEORICA='Prova teórica aprovada',LADV='LADV',LIBERACAO='Liberação para agendamento';
const CONHECIDAS=new Set([VALIDACAO,TEORICA,LADV,LIBERACAO,'Exame toxicológico',...EXAMES.map(([n])=>n)]);

const ESTILO=`
.booking-main.booking-bloqueado>:not(.booking-bloqueio-camada){filter:blur(5px);opacity:.55;pointer-events:none;user-select:none}
.booking-bloqueio-camada{position:fixed;top:0;right:0;bottom:0;z-index:40;display:flex;align-items:center;justify-content:center;padding:24px;background:rgba(16,35,63,.18);overflow:auto}
.booking-bloqueio-cartao{width:min(560px,100%);max-height:calc(100vh - 48px);overflow:auto;padding:26px 28px;border:1px solid #c9d6e3;border-radius:16px;background:#fff;color:#10233f;box-shadow:0 24px 60px rgba(16,35,63,.25)}
.booking-bloqueio-selo{display:inline-block;margin-bottom:10px;padding:4px 10px;border-radius:999px;background:#fff1e0;color:#9a5b0f;font-size:11px;font-weight:800;letter-spacing:.06em;text-transform:uppercase}
.booking-bloqueio-cartao h2{margin:0 0 8px;font-size:22px;line-height:1.25}
.booking-bloqueio-cartao>p{margin:0 0 18px;font-size:14px;line-height:1.55;color:#3a4a5e}
.booking-linha{position:relative;margin:0;padding:0;list-style:none}
.booking-etapa{position:relative;display:grid;grid-template-columns:28px minmax(0,1fr);gap:12px;padding-bottom:16px}
.booking-etapa:last-child{padding-bottom:0}
.booking-etapa::before{content:"";position:absolute;left:13px;top:28px;bottom:0;width:2px;background:#d5e1ec}
.booking-etapa:last-child::before{display:none}
.booking-etapa.feito::before{background:#7cc59a}
.booking-marca{position:relative;z-index:1;display:grid;place-items:center;width:28px;height:28px;border-radius:50%;border:2px solid #c9d6e3;background:#fff;color:#8a99a9;font-size:13px;font-weight:800}
.booking-etapa.feito .booking-marca{border-color:#1f7a45;background:#1f7a45;color:#fff}
.booking-etapa.atual .booking-marca{border-color:#1769ab;background:#e8f2fc;color:#1769ab;box-shadow:0 0 0 4px #1769ab22}
.booking-etapa-texto{padding-top:3px;min-width:0}
.booking-etapa-texto strong{display:block;font-size:14px;color:#10233f}
.booking-etapa.pendente .booking-etapa-texto strong{color:#5a6b7f}
.booking-etapa-texto span{display:block;margin-top:2px;font-size:12px;color:#5a6b7f}
.booking-etapa.feito .booking-etapa-texto span{color:#1f7a45}
.booking-etapa-texto strong span.booking-aqui{display:inline-block;margin:0 0 0 8px;padding:1px 8px;border-radius:999px;background:#1769ab;color:#fff;font-size:11px;font-weight:700;vertical-align:1px}
.booking-exames{display:flex;flex-wrap:wrap;gap:6px;margin-top:6px}
.booking-exames span{display:inline-block;margin:0;padding:2px 8px;border-radius:999px;font-size:11px;font-weight:700;background:#f1f4f7;color:#5f7183}
.booking-exames span.ok{background:#e7f6ec;color:#1f7a45}
.booking-etapa-texto small.booking-exames-nota{display:block;margin-top:6px;font-size:11px;color:#5a6b7f}
.booking-bloqueio-pedido{margin-top:8px}
.booking-bloqueio-pedido .booking-liberacao-botao{margin:0}
.booking-bloqueio-acoes{display:flex;flex-wrap:wrap;justify-content:flex-end;gap:8px;margin-top:20px}
.booking-bloqueio-acoes a{display:inline-flex;align-items:center;min-height:40px;padding:8px 16px;border-radius:9px;font-size:13px;font-weight:700;text-decoration:none}
.booking-bloqueio-acoes .secundario{border:1px solid #b9c8d7;color:#10233f;background:#fff}
.booking-bloqueio-acoes .primario{border:1px solid #1769ab;background:#1769ab;color:#fff}
html[data-theme=dark] .booking-bloqueio-camada{background:rgba(5,12,22,.45)}
html[data-theme=dark] .booking-bloqueio-cartao{background:#16212e;border-color:#2c3b4d;color:#e6edf5}
html[data-theme=dark] .booking-bloqueio-cartao>p,html[data-theme=dark] .booking-etapa-texto span,html[data-theme=dark] .booking-etapa.pendente .booking-etapa-texto strong{color:#a9b9ca}
html[data-theme=dark] .booking-etapa-texto strong{color:#e6edf5}
html[data-theme=dark] .booking-marca{background:#16212e;border-color:#3a4b60}
html[data-theme=dark] .booking-etapa::before{background:#30465b}
html[data-theme=dark] .booking-etapa.feito::before{background:#2f7a52}
html[data-theme=dark] .booking-etapa.atual .booking-marca{background:#183552;border-color:#5aa0e6;color:#9cc9f3}
html[data-theme=dark] .booking-etapa.feito .booking-etapa-texto span{color:#8fdcb0}
html[data-theme=dark] .booking-exames span{background:#1b3044;color:#a9b9ca}
html[data-theme=dark] .booking-exames span.ok{background:#163b29;color:#8fdcb0}
html[data-theme=dark] .booking-etapa-texto small.booking-exames-nota{color:#a9b9ca}
html[data-theme=dark] .booking-bloqueio-selo{background:#33261a;color:#f0c27a}
html[data-theme=dark] .booking-bloqueio-acoes .secundario{background:#16212e;color:#e6edf5;border-color:#3a4b60}
@media(max-width:700px){.booking-bloqueio-camada{left:0!important;align-items:flex-start;padding:14px}.booking-bloqueio-cartao{padding:20px}.booking-bloqueio-cartao h2{font-size:19px}}
`;
function garantirEstilo(){if(document.getElementById('booking-bloqueio-estilo'))return;const s=document.createElement('style');s.id='booking-bloqueio-estilo';s.textContent=ESTILO;document.head.append(s);}
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const diaMes=d=>{const s=String(d||'').slice(0,10);return s.length===10?s.slice(8,10)+'/'+s.slice(5,7):'';};

// Monta as etapas a partir das pendências: a primeira que falta é a atual ("Você está aqui").
export function etapasDoBloqueio(pendencias=[],liberacao=null){
 const falta=new Set(pendencias);
 const examesFeitos=EXAMES.filter(([n])=>!falta.has(n)).length;
 const etapas=[
  {chave:'cadastro',titulo:'Cadastro validado pela autoescola',feito:!falta.has(VALIDACAO),feitoTexto:'Cadastro conferido',faltaTexto:'A AgIA confere os seus dados e documentos'},
  {chave:'exames',titulo:'Exames',feito:examesFeitos===EXAMES.length,feitoTexto:'Todos os exames em dia',faltaTexto:examesFeitos+' de '+EXAMES.length+' concluídos',exames:EXAMES.map(([n,curto])=>({nome:curto,ok:!falta.has(n)}))},
  {chave:'teorica',titulo:'Prova teórica',feito:!falta.has(TEORICA),feitoTexto:'Aprovado',faltaTexto:'Aguardando a aprovação na prova teórica'},
  {chave:'ladv',titulo:'LADV',feito:!falta.has(LADV),feitoTexto:'LADV emitida',faltaTexto:'Licença de Aprendizagem de Direção Veicular'},
  {chave:'liberacao',titulo:'Liberação para agendar',feito:!falta.has(LIBERACAO),feitoTexto:'Liberado',
   faltaTexto:liberacao?.solicitadaEm?'Pedido enviado'+(diaMes(liberacao.solicitadaEm)?' em '+diaMes(liberacao.solicitadaEm):'')+'. A AgIA avisa quando liberar.':liberacao?.podeSolicitar?'Você já pode pedir a liberação':'Depois das etapas acima, a AgIA libera o agendamento'},
  {chave:'aulas',titulo:'Agendar as aulas práticas',feito:false,faltaTexto:'Liberado assim que as etapas acima forem concluídas'},
 ];
 let achou=false;for(const e of etapas){e.estado=e.feito?'feito':!achou?(achou=true,'atual'):'pendente';}
 const outras=pendencias.filter(p=>!CONHECIDAS.has(p));
 return {etapas,outras};
}

export function mostrarBloqueioAgendamento({pendencias=[],liberacao=null,pedirLiberacao=null}={}){
 const principal=document.querySelector('main.booking-main')||document.querySelector('main');if(!principal)return null;
 garantirEstilo();
 principal.querySelector(':scope>.booking-bloqueio-camada')?.remove();
 const {etapas,outras}=etapasDoBloqueio(pendencias,liberacao);
 const camada=el('div',undefined,'booking-bloqueio-camada');camada.dataset.bookingBloqueio='';
 const cartao=el('section',undefined,'booking-bloqueio-cartao');cartao.setAttribute('role','alertdialog');cartao.setAttribute('aria-modal','false');cartao.setAttribute('aria-labelledby','booking-bloqueio-titulo');
 const titulo=el('h2','Seu agendamento ainda está bloqueado');titulo.id='booking-bloqueio-titulo';
 cartao.append(el('span','Agendamento bloqueado','booking-bloqueio-selo'),titulo,
  el('p','Para agendar as aulas práticas, primeiro é preciso concluir as etapas abaixo. Assim que todas estiverem concluídas, a AgIA libera o agendamento das suas aulas.'));
 const linha=el('ol',undefined,'booking-linha');
 etapas.forEach((e,i)=>{
  const li=el('li',undefined,'booking-etapa '+e.estado);li.dataset.etapa=e.chave;li.dataset.estado=e.estado;
  const marca=el('span',e.estado==='feito'?'✓':String(i+1),'booking-marca');marca.setAttribute('aria-hidden','true');
  const texto=el('div',undefined,'booking-etapa-texto'),nome=el('strong',e.titulo);
  if(e.estado==='atual')nome.append(el('span','Você está aqui','booking-aqui'));
  texto.append(nome,el('span',e.feito?e.feitoTexto:e.faltaTexto));
  if(e.exames){const lista=el('div',undefined,'booking-exames');for(const x of e.exames)lista.append(el('span',(x.ok?'✓ ':'')+x.nome,x.ok?'ok':''));texto.append(lista,el('small','O toxicológico pode ser feito depois, não trava o agendamento.','booking-exames-nota'));}
  if(e.chave==='liberacao'&&!e.feito&&liberacao?.podeSolicitar&&!liberacao?.solicitadaEm&&pedirLiberacao){const caixa=el('div',undefined,'booking-bloqueio-pedido');caixa.append(pedirLiberacao());texto.append(caixa);}
  li.setAttribute('aria-label',e.titulo+': '+(e.estado==='feito'?'concluído':e.estado==='atual'?'etapa atual':'a fazer'));
  li.append(marca,texto);linha.append(li);
 });
 cartao.append(linha);
 if(outras.length)cartao.append(el('p','Também falta: '+outras.join(', ')+'.'));
 const acoes=el('div',undefined,'booking-bloqueio-acoes');
 const progresso=el('a','Ver meu progresso','secundario');progresso.href='meu-progresso.html';
 const inicio=el('a','Voltar ao início','primario');inicio.href='dashboard.html';
 acoes.append(progresso,inicio);cartao.append(acoes);
 camada.append(cartao);principal.append(camada);principal.classList.add('booking-bloqueado');
 // A camada cobre só a área da página (o menu do lado continua usável).
 const ajustar=()=>{const r=principal.getBoundingClientRect();camada.style.left=Math.max(0,r.left)+'px';};
 ajustar();addEventListener('resize',ajustar);
 return camada;
}
