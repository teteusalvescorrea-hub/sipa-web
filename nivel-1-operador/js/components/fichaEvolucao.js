import {el,botao,campo,select,entrada,modal} from './uiOperador.js';
import {EXAMES_FICHA,SITUACOES_EXAME,PROVAS_FICHA,SITUACOES_PROVA,lerExameFicha,provasDoAluno} from '../fichaOperador.js';
import {formatarData,dataValida,hojeBrasil} from '../../../shared/js/calendario.js';
import {ETAPAS,etapaParaAgendamento} from '../../../shared/js/elegibilidadeAluno.js';
import {formularioAdministrativo} from '../../../shared/components/formularioAdministrativo.js';
import {UNIDADES_INSTITUCIONAIS} from '../../../shared/js/catalogoUnidades.js';
import {formatarCpf,ativarMascaraCpf} from '../../../shared/js/formatacao.js';
const data=d=>d?formatarData(d):'Não informada';
const final=s=>['Aprovado','Reprovado','Cancelado'].includes(s);
const primario='op-button op-button-primary';
function erroFormulario(f){const p=el('p',undefined,'op-acompanhamento-erro');p.setAttribute('role','alert');f.append(p);return p;}
function envio(f,fn){let ocupado=false;f.addEventListener('submit',async e=>{e.preventDefault();if(ocupado)return;ocupado=true;const botoes=[...f.querySelectorAll('button')];botoes.forEach(b=>b.disabled=true);try{await fn();}finally{ocupado=false;botoes.forEach(b=>b.disabled=false);}});}
// Passos (stepper): cada item com título, detalhe e estado — feito, atual, falhou ou pendente. Para ficar enxuto,
// o detalhe só aparece na etapa atual ou reprovada; nas outras vai no title (passar o mouse).
function passos(rotulo,itens){
 const ol=el('ol',undefined,'op-passos');ol.setAttribute('aria-label',rotulo);
 itens.forEach((p,i)=>{const li=el('li',undefined,'op-passo op-passo-'+p.estado),marca=el('span',p.estado==='feito'?'✓':p.estado==='falhou'?'✕':String(i+1),'op-passo-marca'),texto=el('div',undefined,'op-passo-texto');marca.setAttribute('aria-hidden','true');texto.append(el('strong',p.titulo));if(p.estado==='atual'||p.estado==='falhou')texto.append(el('small',p.detalhe));else li.title=p.detalhe;li.setAttribute('aria-label',p.titulo+': '+p.detalhe);li.append(marca,texto);if(p.estado==='atual')li.setAttribute('aria-current','step');ol.append(li);});
 return ol;
}
const ultimaProva=(tentativas,tipo)=>tentativas.filter(p=>p.tipo===tipo&&!p.arquivada).at(-1);
function passoProva(titulo,p){
 const s=p?.status||'Não solicitado';
 if(s==='Aprovado')return {titulo,estado:'feito',detalhe:'Aprovado'+(p.data?' em '+data(p.data):'')};
 if(s==='Reprovado'||s==='Cancelado')return {titulo,estado:'falhou',detalhe:`${s} · tentativa ${p.ordem||1}`};
 if(s==='Agendado')return {titulo,estado:'atual',detalhe:'Agendada'+(p.data?' para '+data(p.data):'')};
 if(s==='Solicitado')return {titulo,estado:'atual',detalhe:'Solicitada, aguardando data'};
 return {titulo,estado:'pendente',detalhe:'Não solicitada'};
}
function passoEtapa(titulo,item,feito){
 const s=item?.status||'Não informado';
 if(s==='Aprovado')return {titulo,estado:'feito',detalhe:feito};
 if(s==='Reprovado'||s==='Vencido')return {titulo,estado:'falhou',detalhe:s};
 return {titulo,estado:s==='Pendente'?'atual':'pendente',detalhe:s==='Não informado'?'Não informada':s};
}
// Jornada até a habilitação: exames, prova teórica, LADV, liberação das aulas práticas, provas práticas e habilitação.
function jornada(a,tentativas){
 const exames=Object.keys(EXAMES_FICHA).map(t=>lerExameFicha(a,t).status),ok=exames.filter(s=>s==='Aprovado'||s==='Não se aplica').length;
 const itens=[exames.includes('Reprovado')?{titulo:'Exames',estado:'falhou',detalhe:'Há exame reprovado'}:ok===exames.length?{titulo:'Exames',estado:'feito',detalhe:'Todos aprovados'}:{titulo:'Exames',estado:ok||exames.includes('Pendente')?'atual':'pendente',detalhe:`${ok} de ${exames.length} aprovados`}];
 itens.push(passoProva('Prova teórica',ultimaProva(tentativas,'teorica')),passoEtapa('LADV',etapaParaAgendamento(a,'ladv'),'Emitida'),passoEtapa('Aulas práticas',etapaParaAgendamento(a,'pratica'),'Liberadas'));
 const praticas=Object.entries(PROVAS_FICHA).filter(([t,c])=>t!=='teorica'&&c.categoria&&a.categoria.includes(c.categoria));
 for(const [t,c] of praticas)itens.push(passoProva('Prova prática '+c.categoria,ultimaProva(tentativas,t)));
 const habilitado=praticas.length>0&&praticas.every(([t])=>ultimaProva(tentativas,t)?.status==='Aprovado');
 itens.push({titulo:'Habilitação',estado:habilitado?'feito':'pendente',detalhe:habilitado?'Concluída':'Após as provas práticas'});
 // A próxima etapa a cumprir aparece como a atual.
 const proxima=itens.find(p=>p.estado!=='feito');if(proxima?.estado==='pendente')proxima.estado='atual';
 return itens;
}
// A jornada em passos, no topo da aba Cadastro (decisão do João em 31/10: é a primeira coisa que se vê na ficha).
export function montarJornada(destino,a){const resumo=el('section',undefined,'op-jornada');resumo.dataset.opJornada='';resumo.append(passos('Jornada até a habilitação',jornada(a,provasDoAluno(a))));destino.prepend(resumo);}
// Status do aluno (sem o antigo "Pendente"): a primeira etapa da jornada ainda não concluída, ou Habilitado.
export function etapaAtual(a){const p=jornada(a,provasDoAluno(a)).find(x=>x.estado!=='feito'&&x.titulo!=='Habilitação');return p?p.titulo:'Habilitado';}
function confirmar(ctx,titulo,descricao,acao,conteudo){
 const d=modal(ctx.raiz,titulo,'opConfirmacaoFicha'),f=el('form');f.append(el('p',descricao,'op-help'));if(conteudo)f.append(conteudo);const rodape=el('footer',undefined,'op-ficha-acoes'),voltar=botao('Voltar',()=>d.close()),b=el('button','Confirmar',primario);b.type='submit';rodape.append(voltar,b);f.append(rodape);d.append(f);
 envio(f,async()=>{if(await acao())d.close();});d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
}
export function montarEdicaoCadastro(destino,a,ctx,{aberto=false}={}){
 if(!ctx.permissoes.includes('editar-cadastro'))return;
 if(ctx.servico.corrigirAluno&&ctx.permissoes.includes('corrigir-registro'))destino.append(botao('Vínculo e situação cadastral',()=>formularioAdministrativo(ctx.raiz,'Correção administrativa',[['unidadePrincipal','Unidade principal','select',a.unidadePrincipal||a.unidade,UNIDADES_INSTITUCIONAIS.filter(u=>ctx.servico.identidade.nivel===3||ctx.servico.identidade.unidades?.includes(u.id)).map(u=>[u.id,u.nome])],['situacao','Situação cadastral','select',a.situacao||'Pendente',['Pendente','Regular','Inativo']],['bloqueado','Bloquear novos agendamentos','checkbox',a.bloqueioAdministrativo?.ativo===true],['justificativa','Justificativa','textarea','']],d=>ctx.executar(()=>ctx.servico.corrigirAluno(a.id,{unidadePrincipal:d.unidadePrincipal,situacao:d.situacao,bloqueioAdministrativo:{ativo:d.bloqueado,motivo:d.justificativa}},d.justificativa),'Correção registrada.',ctx.reabrir))));
 const abrir=()=>{
  const f=el('form',undefined,'op-form-grid');f.dataset.opEditarCadastro='';f.noValidate=true;
  const controles={};for(const [k,titulo,tipo] of [['nome','Nome completo','text'],['cpf','CPF','text'],['nascimento','Data de nascimento','date'],['telefone','Telefone','tel'],['email','E-mail','email'],['categoria','Categoria','select'],['observacoes','Observações administrativas','textarea']]){
   const c=tipo==='select'?select(['A','B','D','AB'],a[k]):tipo==='textarea'?el('textarea'):entrada(tipo,a[k]||'');c.name=k;c.value=a[k]||'';c.disabled=k==='categoria'&&!ctx.permissoes.includes('editar-categoria');if(tipo==='textarea'){c.rows=3;c.maxLength=2000;}if(k==='nome')c.maxLength=180;if(k==='email')c.maxLength=200;if(k==='cpf')c.maxLength=14;
   if(k==='cpf'){c.inputMode='numeric';c.value=formatarCpf(c.value);ativarMascaraCpf(c);}
   controles[k]=c;f.append(campo(titulo,c));
  }
  f.append(el('p','Unidade principal protegida. A unidade de carro é alterada exclusivamente pelo fluxo de transferência.','op-help'));
  const motivo=el('textarea');motivo.required=true;motivo.minLength=5;f.append(campo('Justificativa da correção',motivo));const erro=erroFormulario(f),acoes=el('div',undefined,'op-ficha-acoes'),salvar=el('button','Salvar',primario);salvar.type='submit';acoes.append(botao('Cancelar',()=>ctx.reabrir()),salvar);f.append(acoes);destino.replaceChildren(f);
  envio(f,async()=>{
   erro.textContent='';Object.values(controles).forEach(c=>c.removeAttribute('aria-invalid'));
   const valores=Object.fromEntries(Object.entries(controles).map(([k,c])=>[k,c.value]));
   await ctx.executar(async()=>{try{return await ctx.servico.editarCadastro(a.id,valores,motivo.value);}catch(e){erro.textContent=e.message;for(const k of Object.keys(e.campos||{}))controles[k]?.setAttribute('aria-invalid','true');f.querySelector('[aria-invalid=true]')?.focus();throw e;}},'Cadastro atualizado.',ctx.reabrir);
  });
 };
 if(aberto)abrir();
}
export function montarExamesProvas(destino,a,ctx){
 const permitido=ctx.permissoes.includes('verificar');
 destino.append(el('p','Acompanhamento administrativo local. Não realiza consulta, agendamento ou cancelamento oficial no DETRAN.','op-inline-note'));
 const exames=el('form',undefined,'op-acompanhamento');exames.dataset.opExamesFicha='';exames.append(el('h4','Exames'));const controles={};
 for(const [tipo,nome] of Object.entries(EXAMES_FICHA)){
  const atual=lerExameFicha(a,tipo),c=select(SITUACOES_EXAME,atual.status),linha=el('div',undefined,'op-acompanhamento-linha op-acompanhamento-simples');c.name=tipo;c.disabled=!permitido||atual.origem==='oficial';controles[tipo]=c;linha.append(campo(nome,c));exames.append(linha);
 }
 const salvar=el('button','Salvar exames',primario);salvar.type='submit';salvar.disabled=!permitido;exames.append(salvar);envio(exames,()=>ctx.executar(()=>ctx.servico.salvarExames(a.id,Object.fromEntries(Object.entries(controles).filter(([,c])=>!c.disabled).map(([k,c])=>[k,c.value]))),'Exames salvos.',ctx.reabrir));destino.append(exames);
 // Os requisitos já exigidos pelo motor precisam ter um fluxo administrativo
 // acessível. Usa o mesmo comando autorizado, com fonte, data e auditoria.
 destino.append(el('h4','Autorizações para aulas práticas'));
 for(const tipo of ['ladv','pratica']){
  const atual=etapaParaAgendamento(a,tipo),f=el('form',undefined,'op-acompanhamento'),bloqueado=!permitido||atual?.origem==='oficial';f.dataset.opAutorizacao=tipo;
  const status=select(['Não informado','Pendente','Aprovado','Reprovado','Vencido'],atual?.status||'Não informado'),dia=entrada('date',atual?.data||hojeBrasil()),validade=entrada('date',atual?.validade||''),fonte=entrada('text',atual?.fonte||'');
  for(const [nome,c] of Object.entries({status,data:dia,validade,fonte})){c.name=nome;c.disabled=bloqueado;}
  dia.required=fonte.required=true;dia.max=hojeBrasil();fonte.maxLength=240;
  f.append(el('h4',ETAPAS[tipo]),campo('Situação',status),campo('Data da conferência',dia),campo('Validade (se aplicável)',validade),campo('Fonte da informação',fonte));
  const b=el('button','Salvar autorização',primario);b.type='submit';b.disabled=bloqueado;f.append(b);
  envio(f,()=>ctx.executar(()=>ctx.servico.verificar(a.id,tipo,{status:status.value,data:dia.value,validade:validade.value,fonte:fonte.value}),'Autorização registrada.',ctx.reabrir));destino.append(f);
 }
}
// Aba Provas: um card por prova. O card só agenda (Não solicitado, Solicitado, Agendado + data);
// agendada, mostra a data e Registrar resultado; reprovada ou cancelada, Nova tentativa; aprovada, só o cabeçalho.
export function montarProvas(destino,a,ctx){
 const permitido=ctx.permissoes.includes('verificar'),tentativas=provasDoAluno(a);
 function formularioProva(tipo,atual,host){
  const cfg=PROVAS_FICHA[tipo],f=el('form',undefined,'op-prova-form'),situacao=select(['Não solicitado','Solicitado','Agendado'],atual?.status||'Não solicitado'),dia=entrada('date',atual?.data||''),dataCampo=campo('Data da prova',dia),erro=erroFormulario(f),acoes=el('div',undefined,'op-ficha-acoes');
  f.dataset.opProva=tipo;f.noValidate=true;situacao.name='status';dia.name='data';situacao.disabled=dia.disabled=!permitido||atual?.origem==='oficial';
  const sincronizar=()=>{dataCampo.hidden=situacao.value!=='Agendado';dia.required=!dataCampo.hidden;erro.textContent='';dia.removeAttribute('aria-invalid');};situacao.addEventListener('change',sincronizar);sincronizar();
  const b=el('button','Salvar prova',primario);b.type='submit';b.disabled=situacao.disabled;acoes.append(b);
  situacao.setAttribute('aria-label','Situação da '+cfg.nome.toLocaleLowerCase('pt-BR'));f.prepend(campo('Situação',situacao),dataCampo);f.append(acoes);
  const pedido=crypto.randomUUID();envio(f,async()=>{
   if(situacao.value==='Agendado'&&!dataValida(dia.value)){erro.textContent='Informe uma data de prova válida.';dia.setAttribute('aria-invalid','true');dia.focus();return;}
   await ctx.executar(()=>ctx.servico.movimentarProva(a.id,{tipo,tentativaId:atual?.id,status:situacao.value,data:dia.value,confirmado:false},pedido),'Prova atualizada.',ctx.reabrir);
  });host.replaceChildren(f);
 }
 function agendada(p,host){
  const cfg=PROVAS_FICHA[p.tipo],linha=el('div',undefined,'op-prova-agendada'),dataConsulta=entrada('text',data(p.data)),acoes=el('div',undefined,'op-ficha-acoes');
  linha.dataset.opTentativa=p.id;dataConsulta.readOnly=true;dataConsulta.dataset.opDataProva='';dataConsulta.setAttribute('aria-readonly','true');
  const autorizada=permitido&&p.origem!=='oficial'&&(!cfg.categoria||a.categoria.includes(cfg.categoria));
  function acao(titulo,rotulo,controle,dados){const d=modal(ctx.raiz,titulo,'opAcaoProva'),f=el('form'),erro=erroFormulario(f),b=el('button','Confirmar',primario),chave=crypto.randomUUID();f.noValidate=true;b.type='submit';f.prepend(campo(rotulo,controle));f.append(botao('Voltar',()=>d.close()),b);d.append(f);envio(f,async()=>{if(controle.type==='date'&&!dataValida(controle.value)){erro.textContent='Informe uma data válida.';controle.setAttribute('aria-invalid','true');return;}if(dados.acao==='arquivar'&&controle.value.trim().length<5){erro.textContent='Informe o motivo (mínimo de 5 caracteres).';controle.setAttribute('aria-invalid','true');return;}const ok=await ctx.executar(()=>ctx.servico.movimentarProva(a.id,{tipo:p.tipo,tentativaId:p.id,...dados,[dados.acao==='arquivar'?'motivo':controle.type==='date'?'data':'status']:controle.value},chave),'Tentativa atualizada.',ctx.reabrir);if(ok)d.close();});d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();}
  const acoesPermitidas=[['Registrar resultado',()=>acao('Registrar resultado','Resultado da prova',select(ctx.permissoes.includes('cancelar-prova')?['Aprovado','Reprovado','Cancelado']:['Aprovado','Reprovado'],'Aprovado'),{confirmado:true}),primario]];
  if(ctx.servico.identidade.nivel>=2&&ctx.permissoes.includes('editar-prova'))acoesPermitidas.push(['Editar data',()=>acao('Editar data da prova','Nova data',entrada('date',p.data),{status:'Agendado'})]);
  if(ctx.servico.identidade.nivel>=2&&ctx.permissoes.includes('excluir-prova'))acoesPermitidas.push(['Excluir agendamento',()=>acao('Excluir agendamento administrativo','Motivo obrigatório — não cancela a prova no DETRAN',el('textarea'),{acao:'arquivar'})]);
  for(const [titulo,fn,classe] of acoesPermitidas){const b=botao(titulo,fn,classe);b.disabled=!autorizada;acoes.append(b);}
  linha.append(campo('Data da prova',dataConsulta),acoes);host.replaceChildren(linha);
 }
 for(const [tipo,cfg] of Object.entries(PROVAS_FICHA).filter(([,c])=>!c.categoria||a.categoria.includes(c.categoria))){
  const lista=tentativas.filter(p=>p.tipo===tipo),atual=lista.find(p=>!p.arquivada&&['Solicitado','Agendado'].includes(p.status))||lista.at(-1),host=el('div');
  const s=!atual||atual.arquivada?'Não solicitado':atual.status;
  if(s==='Agendado')agendada(atual,host);
  else if(s==='Reprovado'||s==='Cancelado'){if(permitido){const nova=botao('Nova tentativa',()=>formularioProva(tipo,null,host));nova.dataset.opNovaTentativa=tipo;host.append(nova);}}
  else if(s!=='Aprovado')formularioProva(tipo,atual,host);
  const card=el('article',undefined,'op-prova-card'),topo=el('header',undefined,'op-prova-card-topo'),titulo=el('div');titulo.append(el('h5',cfg.nome));if(s!=='Não solicitado')titulo.append(el('small',`Tentativa ${atual.ordem||1}${atual.data&&s!=='Agendado'?' · '+data(atual.data):''}`));
  topo.append(titulo,el('span',s,'op-badge op-prova-situacao op-prova-situacao-'+(s==='Aprovado'?'ok':s==='Reprovado'||s==='Cancelado'?'erro':s==='Não solicitado'?'neutra':'andamento')));
  card.dataset.opProvaCard=tipo;card.append(topo,host);destino.append(card);
 }
}
// Histórico das tentativas encerradas (só aparece quando há alguma) e a correção de registro.
export function montarProvasAgendadas(destino,a,ctx){
 const tentativas=provasDoAluno(a);
 const corrigir=ctx.servico.corrigirProva&&tentativas.length&&botao('Corrigir registro de prova',()=>formularioAdministrativo(ctx.raiz,'Correção de prova',[['tentativa','Tentativa','select',tentativas[0].id,tentativas.map(p=>[p.id,PROVAS_FICHA[p.tipo].nome+' · Tentativa '+p.ordem+' · '+p.status])],['data','Data da prova','date',tentativas[0].data||hojeBrasil()],['status','Situação corrigida','select',tentativas[0].status,SITUACOES_PROVA],['justificativa','Justificativa','textarea','']],d=>ctx.executar(()=>ctx.servico.corrigirProva(a.id,d.tentativa,d),'Correção preservada no histórico.',ctx.reabrir)),'op-link');
 const encerradas=tentativas.filter(p=>p.arquivada||final(p.status)||!SITUACOES_PROVA.includes(p.status));
 if(encerradas.length){
  const anteriores=el('section',undefined,'op-tentativas-anteriores');anteriores.append(el('h4','Histórico de provas e resultados'));
  for(const p of encerradas){
   const linha=el('article',undefined,'op-prova-resultado'),texto=el('div'),situacao=p.arquivada?'Arquivada':p.status;linha.dataset.opResultadoProva=p.id;
   texto.append(el('strong',PROVAS_FICHA[p.tipo]?.nome||p.tipo),el('small',`Tentativa ${p.ordem} · ${data(p.data)}${!SITUACOES_PROVA.includes(p.status)?' · registro anterior, somente consulta':''}${p.motivoExclusao?' · Motivo: '+p.motivoExclusao:''}`));
   linha.append(texto,el('span',situacao,'op-badge op-prova-situacao op-prova-situacao-'+(situacao==='Aprovado'?'ok':['Reprovado','Cancelado'].includes(situacao)?'erro':'neutra')));anteriores.append(linha);
  }
  destino.append(anteriores);
 }
 if(corrigir){const rodape=el('div',undefined,'op-provas-rodape');rodape.append(corrigir);destino.append(rodape);}
}
// Histórico enxuto: filtros numa linha (aplicam ao mudar) e um evento por linha, com a hora, o título e um resumo.
const datasBrasileiras=t=>String(t).replace(/\b(\d{4})-(\d{2})-(\d{2})\b/g,'$3/$2/$1');
// O histórico vem da auditoria (colunas do banco): some com o técnico (ids, chaves, datas de controle) e traduz o resto.
const CAMPOS_HISTORICO={NOME:'Nome',EMAIL:'E-mail',TELEFONE:'Telefone',DOCUMENTO:'CPF',CPF:'CPF',DATA_NASCIMENTO:'Nascimento',OBSERVACOES:'Observações',QUANTIDADE_AULAS:'Aulas',ACEITA_WHATSAPP:'Aceita WhatsApp',RECEBE_OFERTAS_ANTECIPACAO:'Ofertas de antecipação',BLOQUEIO_ADMINISTRATIVO:'Bloqueio administrativo',LOGIN:'Login',DATA:'Data',VALIDADE:'Validade',FONTE:'Fonte',ORDEM:'Tentativa',MOTIVO:'Motivo',JUSTIFICATIVA:'Justificativa'};
const GUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const tecnico=c=>/^id$|_id$|^id_|_em$|^criado|^atualizado|^deletado|senha|hash|token/i.test(c);
function valorHistorico(v){if(v===null||v===undefined||v==='')return 'vazio';if(typeof v==='object')return '';const t=String(v);if(/^true$/i.test(t))return 'Sim';if(/^false$/i.test(t))return 'Não';const d=/^(\d{4})-(\d{2})-(\d{2})(?:T(\d{2}):(\d{2}))?/.exec(t);if(d)return `${d[3]}/${d[2]}/${d[1]}`;return t.length>60?t.slice(0,57)+'…':t;}
function dadosLegiveis(h){
 if(/cria[çc][aã]o$/i.test(h.titulo||''))return [];
 return (h.dados||[]).filter(d=>d?.campo&&!tecnico(d.campo)&&!GUID.test(String(d.depois??''))&&typeof d.depois!=='object').map(d=>{const nome=CAMPOS_HISTORICO[String(d.campo).toUpperCase()]||String(d.campo).toLowerCase().replace(/_/g,' ').replace(/^./,x=>x.toUpperCase());return d.antes!==undefined&&d.antes!==null?`${nome}: ${valorHistorico(d.antes)} → ${valorHistorico(d.depois)}`:`${nome}: ${valorHistorico(d.depois)}`;});
}
export function montarLinhaTempo(destino,eventos,{abrirAula}={}){
 const box=el('section',undefined,'op-linha-tempo');box.dataset.opLinhaTempo='';box.setAttribute('aria-label','Histórico do aluno');
 const filtros=el('form',undefined,'op-timeline-filtros'),tipo=select([['','Todos os eventos'],['cadastro','Cadastro e alterações'],['aulas','Aulas e pacotes'],['exames','Exames'],['provas','Provas'],['unidades','Unidades'],['acessos','Acessos']]),inicio=entrada('date'),fim=entrada('date'),erro=erroFormulario(filtros),lista=el('div',undefined,'op-timeline-lista'),paginacao=el('nav',undefined,'op-timeline-paginas');let pagina=1;
 tipo.name='tipo';inicio.name='inicio';fim.name='fim';filtros.prepend(campo('Eventos',tipo),campo('De',inicio),campo('Até',fim));
 filtros.append(botao('Limpar',()=>{filtros.reset();pagina=1;render();},'op-link'));
 for(const c of [tipo,inicio,fim])c.addEventListener('change',()=>{pagina=1;render();});
 filtros.addEventListener('submit',e=>{e.preventDefault();pagina=1;render();});box.append(filtros,lista,paginacao);destino.append(box);
 const dia=em=>em&&Number.isFinite(Date.parse(em))?new Date(em).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}):'';
 function render(){
  lista.replaceChildren();paginacao.replaceChildren();erro.textContent='';if((inicio.value&&!dataValida(inicio.value))||(fim.value&&!dataValida(fim.value))||(inicio.value&&fim.value&&inicio.value>fim.value)){erro.textContent='Informe um período válido.';return;}
  const resultado=eventos.filter(h=>(!tipo.value||h.grupo===tipo.value)&&(!inicio.value||(dia(h.em)&&dia(h.em)>=inicio.value))&&(!fim.value||(dia(h.em)&&dia(h.em)<=fim.value))),total=Math.ceil(resultado.length/10);pagina=Math.min(pagina,Math.max(1,total));let grupo;
  for(const h of resultado.slice((pagina-1)*10,pagina*10)){
   const chave=dia(h.em);if(chave!==grupo){grupo=chave;lista.append(el('h5',chave?data(chave):'Data não informada','op-timeline-dia'));}
   const item=el('article',undefined,'op-timeline-evento'),corpo=el('div',undefined,'op-timeline-corpo'),titulo=el('div',undefined,'op-timeline-titulo');item.dataset.opEvento=h.id;item.dataset.opGrupo=h.grupo;
   titulo.append(el('strong',h.titulo));if(h.grupo==='aulas'&&h.referencia&&abrirAula)titulo.append(botao('Ver aula',()=>abrirAula(h.referencia),'op-link'));corpo.append(titulo);
   const resumo=[h.descricao&&datasBrasileiras(h.descricao),...dadosLegiveis(h),h.motivo&&'Motivo: '+h.motivo,h.mantidas&&`${h.mantidas.length} aula(s) mantida(s), ${h.canceladas?.length||0} cancelada(s)`,h.responsavel&&'Por '+h.responsavel].filter(Boolean);
   if(resumo.length)corpo.append(el('small',resumo.join(' · '),'op-timeline-detalhe'));
   item.append(el('time',chave?new Date(h.em).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}):'—','op-timeline-hora'),corpo);lista.append(item);
  }
  if(!resultado.length)lista.append(el('p','Nenhum evento encontrado para os filtros informados.','op-help'));
  if(total>1){const anterior=botao('Anterior',()=>{pagina--;render();},'op-link'),proximo=botao('Próxima',()=>{pagina++;render();},'op-link');anterior.disabled=pagina===1;proximo.disabled=pagina===total;paginacao.append(anterior,el('span',`Página ${pagina} de ${total}`),proximo);}
 }
 render();
}
