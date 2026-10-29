import {el,botao,campo,entrada,select,modal} from '../../nivel-1-operador/js/components/uiOperador.js';
import {UNIDADES_INSTITUCIONAIS,nomeUnidadeInstitucional} from '../js/catalogoUnidades.js';
import {hojeBrasil,somarDias,formatarData} from '../js/calendario.js';
import {escopoPermitido} from '../js/permissoesAdministrativas.js';
import {chaveVaga,mensagemOferta} from '../js/ofertasAntecipacao.js';
import {dataRelatorio} from '../js/apresentacaoRelatorios.js';
const categorias={A:'Moto',B:'Carro',D:'Ônibus'},principal='op-button op-button-primary';
export async function montarAntecipacaoPainel(host,servico,root){
 host.ofertaController?.abort();const controller=new AbortController();host.ofertaController=controller;
 if(!document.querySelector('[data-css-antecipacao]')){const l=el('link');l.rel='stylesheet';l.href=new URL('../css/antecipacao.css',import.meta.url);l.dataset.cssAntecipacao='';document.head.append(l);}
 host.classList.add('sipa-antecipacao');const op=servico.identidade,selecionadas=new Map();let revisao=0;
 const titulo=el('h2','Antecipação de aulas'),form=el('form',undefined,'adm-filtros'),unidade=select(UNIDADES_INSTITUCIONAIS.filter(u=>escopoPermitido(op,u.id)).map(u=>[u.id,u.nome]),op.unidadeConsulta||op.unidade),categoria=select([['B','Carro — Categoria B'],['A','Moto — Categoria A'],['D','Ônibus — Categoria D']],'B'),data=entrada('date',somarDias(hojeBrasil(),1)),consultar=botao('Consultar',()=>{},principal);
 unidade.name='unidade';categoria.name='categoria';data.name='data';data.required=true;consultar.type='submit';form.append(campo('Unidade',unidade),campo('Categoria',categoria),campo('Data',data),consultar);
 const aviso=el('p','As ofertas não reservam horários nem consomem créditos. A disponibilidade será conferida novamente ao agendar.','adm-nota'),erro=el('p',undefined,'oferta-retorno');erro.setAttribute('role','status');
 const lista=el('div',undefined,'oferta-vagas'),resumo=el('p','Nenhuma vaga selecionada.'),interessados=botao('Consultar alunos interessados',abrirInteressados,principal),historico=el('section',undefined,'oferta-historico');interessados.disabled=true;
 host.replaceChildren(titulo,form,aviso,erro,el('h3','Horários disponíveis'),lista,resumo,interessados,historico);
 function falha(e){erro.textContent=e.message;}
 function atualizarSelecao(){resumo.textContent=selecionadas.size+' vaga(s) selecionada(s).';interessados.disabled=!selecionadas.size;}
 function invalidar(){revisao++;selecionadas.clear();lista.replaceChildren(el('p','Clique em Consultar para atualizar os horários.'));atualizarSelecao();}
 for(const c of [unidade,categoria,data])c.addEventListener('change',invalidar);
 form.onsubmit=async ev=>{ev?.preventDefault();const pedido=++revisao;selecionadas.clear();atualizarSelecao();consultar.disabled=true;erro.textContent='';lista.replaceChildren(el('p','Consultando horários…'));
  try{const vagas=await servico.consultarVagas({unidade:unidade.value,categoria:categoria.value,data:data.value});if(pedido!==revisao)return;lista.replaceChildren();
   for(const v of vagas){const card=el('label',undefined,'oferta-vaga'),check=entrada('checkbox'),conteudo=el('span');check.dataset.ofertaVaga=chaveVaga(v);conteudo.append(el('strong',v.inicio+' – '+v.fim),el('span',categorias[v.categoria]+' — Categoria '+v.categoria),el('span','Veículo: '+v.veiculo),el('span','Instrutor: '+v.instrutor),el('span','Local: '+v.local));card.append(check,conteudo);check.onchange=()=>{if(check.checked)selecionadas.set(chaveVaga(v),v);else selecionadas.delete(chaveVaga(v));card.classList.toggle('selecionada',check.checked);atualizarSelecao();};lista.append(card);}
   if(!vagas.length)lista.append(el('p','Nenhum horário disponível para esta consulta.'));
  }catch(e){if(pedido===revisao){lista.replaceChildren();falha(e);}}finally{consultar.disabled=false;}
 };
 function novoModal(titulo,id){const d=modal(root,titulo,id);d.classList.add('oferta-modal');d.addEventListener('close',()=>d.remove(),{once:true});return d;}
 async function abrirInteressados(){interessados.disabled=true;try{const vagas=[...selecionadas.values()],alunos=await servico.consultarInteressados(vagas),d=novoModal('Alunos interessados em antecipação','ofertaInteressados'),corpo=el('div',undefined,'oferta-corpo');
   corpo.append(el('p',nomeUnidadeInstitucional(vagas[0].unidade)+' · '+categorias[vagas[0].categoria]+' · '+formatarData(vagas[0].data)),el('p',[...new Set(vagas.map(v=>v.inicio+' – '+v.fim))].join(' | ')));
   if(!alunos.length)corpo.append(el('p','Nenhum aluno interessado e elegível encontrado para esta oferta.'));
   else{const tabela=el('table',undefined,'oferta-alunos'),h=el('thead'),hr=el('tr'),body=el('tbody'),colunas=['Aluno','Categoria','Unidade vinculada','Situação','Contato','Ações'];for(const c of colunas){const th=el('th',c);th.scope='col';hr.append(th);}h.append(hr);
    for(const a of alunos){const r=el('tr'),acao=botao('Enviar oferta',()=>confirmar([a],vagas,d));[a.nome,a.categoria,nomeUnidadeInstitucional(a.unidade),'Elegível · '+a.vagas.length+' vaga(s)',a.telefone||'Não informado',acao].forEach((v,i)=>{const c=el('td');c.dataset.rotulo=colunas[i];c.append(v instanceof Node?v:document.createTextNode(v));r.append(c);});body.append(r);}tabela.append(h,body);corpo.append(tabela);}
   const todos=botao('Enviar oferta para todos os interessados',()=>confirmar(alunos,vagas,d),principal);todos.disabled=!alunos.length;const rodape=el('footer');rodape.append(el('span',alunos.length+' destinatário(s) elegível(is).'),todos);d.append(corpo,rodape);d.showModal();
  }catch(e){falha(e);}finally{interessados.disabled=!selecionadas.size;}}
 function confirmar(alunos,vagas,anterior){const d=novoModal('Confirmar oferta de antecipação','ofertaConfirmacao'),corpo=el('div',undefined,'oferta-corpo'),sipa=entrada('checkbox'),whatsapp=entrada('checkbox'),erroModal=el('p'),enviar=botao('Enviar para '+alunos.length+(alunos.length===1?' aluno':' alunos'),async()=>{
   if(enviar.disabled)return;enviar.disabled=true;voltar.disabled=true;d.dataset.enviando='true';erroModal.textContent='';try{await servico.enviarCampanha({campanhaId,alunoIds:alunos.map(a=>a.id),vagas,canais:{sipa:sipa.checked,whatsapp:whatsapp.checked},confirmado:true});d.close();anterior.close();erro.textContent='Oferta registrada. Consulte o resultado de cada canal no histórico.';await carregarHistorico();}catch(e){erroModal.textContent=e.message;}finally{enviar.disabled=false;voltar.disabled=false;delete d.dataset.enviando;}},principal),voltar=botao('Cancelar',()=>d.close()),campanhaId=crypto.randomUUID();sipa.checked=true;sipa.name='sipa';whatsapp.name='whatsapp';erroModal.setAttribute('role','alert');
   const canais=el('div',undefined,'oferta-canais');canais.append(campo('Enviar notificação pelo SIPA',sipa),campo('Preparar mensagem para WhatsApp',whatsapp));for(const c of [sipa,whatsapp])c.onchange=()=>enviar.disabled=!sipa.checked&&!whatsapp.checked;
   corpo.append(el('p',alunos.length+' destinatário(s). Cada aluno receberá apenas as vagas compatíveis com seu cadastro.'),canais,el('h3','Prévia da mensagem'),el('pre',mensagemOferta(alunos[0],alunos[0].vagas),'oferta-previa'),el('p','WhatsApp: preparação individual. Cada conversa exige revisão e confirmação no próprio WhatsApp.','adm-nota'),erroModal);const rodape=el('footer');rodape.append(voltar,enviar);d.append(corpo,rodape);d.addEventListener('cancel',e=>{if(d.dataset.enviando)e.preventDefault();});d.querySelector('.op-close').addEventListener('click',e=>{if(d.dataset.enviando){e.preventDefault();e.stopImmediatePropagation();}},true);d.showModal();
 }
 async function carregarHistorico(){const ofertas=await servico.historicoOfertas();historico.replaceChildren(el('h3','Histórico de ofertas'));if(!ofertas.length){historico.append(el('p','Nenhuma oferta registrada.'));return;}
  const campanhas=new Map();for(const o of ofertas){const k=o.campanhaId||o.id;if(!campanhas.has(k))campanhas.set(k,[]);campanhas.get(k).push(o);}
  for(const itens of campanhas.values()){const o=itens[0],card=el('article',undefined,'oferta-registro');card.append(el('strong',dataRelatorio(o.em)+' · '+itens.length+' destinatário(s)'),el('p',(o.responsavelNome||'Equipe da unidade')+' · '+nomeUnidadeInstitucional(o.unidadeAluno||o.par?.unidade||op.unidade)),el('p',o.vagas?[...new Set(o.vagas.map(v=>'Categoria '+v.categoria+' · '+formatarData(v.data)+' · '+v.inicio+' – '+v.fim))].join(' | '):'Registro anterior · '+formatarData(o.data)+' · '+o.hora));
   for(const i of itens){const linha=el('div',undefined,'oferta-destinatario'),expirada=i.vagas?.every(v=>Date.parse(v.data+'T'+v.inicio+':00-03:00')<=Date.now()),s=i.canais?.sipa;linha.append(el('strong',i.alunoNome),el('span',!s?'Oferta preparada anteriormente':s.situacao==='enviada'?(i.lidaEm?'Mensagem interna lida':'Notificação interna enviada'):'SIPA: '+s.situacao),el('span','WhatsApp: '+(i.canais?.whatsapp.situacao||'pendente de integração')));if(expirada)linha.append(el('span','Oferta expirada'));
    if(i.canais?.whatsapp.motivo)linha.append(el('span',i.canais.whatsapp.motivo));
    if(!expirada&&i.canais?.whatsapp.situacao==='preparado'){const b=botao('Abrir WhatsApp',async()=>{try{const url=await servico.linkWhatsAppOferta(i.id);window.open(url,'_blank','noopener,noreferrer');}catch(e){falha(e);}});linha.append(b);}card.append(linha);
   }historico.append(card);
  }
 }
 const refrescar=()=>{if(!host.hidden)carregarHistorico().catch(falha);};window.addEventListener('focus',refrescar,{signal:controller.signal});window.addEventListener('storage',e=>{if(e.key==='sipa.operador.demo.v2')refrescar();},{signal:controller.signal});
 await form.onsubmit();await carregarHistorico();
}
