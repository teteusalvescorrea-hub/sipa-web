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
function confirmar(ctx,titulo,descricao,acao,conteudo){
 const d=modal(ctx.raiz,titulo,'opConfirmacaoFicha'),f=el('form');f.append(el('p',descricao,'op-help'));if(conteudo)f.append(conteudo);const rodape=el('footer',undefined,'op-ficha-acoes'),voltar=botao('Voltar',()=>d.close()),b=el('button','Confirmar',primario);b.type='submit';rodape.append(voltar,b);f.append(rodape);d.append(f);
 envio(f,async()=>{if(await acao())d.close();});d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
}
export function montarEdicaoCadastro(destino,a,ctx){
 if(ctx.servico.identidade.nivel<2||!ctx.permissoes.includes('editar-cadastro'))return;
 if(ctx.servico.corrigirAluno)destino.append(botao('Vínculo e situação cadastral',()=>formularioAdministrativo(ctx.raiz,'Correção administrativa',[['unidadePrincipal','Unidade principal','select',a.unidadePrincipal||a.unidade,UNIDADES_INSTITUCIONAIS.filter(u=>ctx.servico.identidade.nivel===3||ctx.servico.identidade.unidades?.includes(u.id)).map(u=>[u.id,u.nome])],['situacao','Situação cadastral','select',a.situacao||'Pendente',['Pendente','Regular','Inativo']],['bloqueado','Bloquear novos agendamentos','checkbox',a.bloqueioAdministrativo?.ativo===true],['justificativa','Justificativa','textarea','']],d=>ctx.executar(()=>ctx.servico.corrigirAluno(a.id,{unidadePrincipal:d.unidadePrincipal,situacao:d.situacao,bloqueioAdministrativo:{ativo:d.bloqueado,motivo:d.justificativa}},d.justificativa),'Correção registrada.',ctx.reabrir))));
 const editar=botao('Editar cadastro',()=>{
  const f=el('form',undefined,'op-form-grid');f.dataset.opEditarCadastro='';f.noValidate=true;
  const controles={};for(const [k,titulo,tipo] of [['nome','Nome completo','text'],['cpf','CPF','text'],['nascimento','Data de nascimento','date'],['telefone','Telefone','tel'],['email','E-mail','email'],['categoria','Categoria','select'],['observacoes','Observações administrativas','textarea']]){
   const c=tipo==='select'?select(['A','B','D','AB'],a[k]):tipo==='textarea'?el('textarea'):entrada(tipo,a[k]||'');c.name=k;c.value=a[k]||'';c.disabled=k==='categoria'&&!ctx.permissoes.includes('editar-categoria');if(tipo==='textarea'){c.rows=3;c.maxLength=2000;}if(k==='nome')c.maxLength=180;if(k==='email')c.maxLength=200;if(k==='cpf')c.maxLength=14;
   if(k==='cpf'){c.inputMode='numeric';c.value=formatarCpf(c.value);ativarMascaraCpf(c);}
   controles[k]=c;f.append(campo(titulo,c));
  }
  f.append(el('p','Unidade principal protegida. A unidade de carro é alterada exclusivamente pelo fluxo de transferência.','op-help'));
  const motivo=el('textarea');motivo.required=true;motivo.minLength=5;f.append(campo('Justificativa da correção',motivo));const erro=erroFormulario(f),acoes=el('div',undefined,'op-ficha-acoes'),salvar=el('button','Salvar alterações',primario);salvar.type='submit';acoes.append(botao('Cancelar edição',()=>ctx.reabrir()),salvar);f.append(acoes);destino.replaceChildren(f);
  envio(f,async()=>{
   erro.textContent='';Object.values(controles).forEach(c=>c.removeAttribute('aria-invalid'));
   const valores=Object.fromEntries(Object.entries(controles).map(([k,c])=>[k,c.value]));
   await ctx.executar(async()=>{try{return await ctx.servico.editarCadastro(a.id,valores,motivo.value);}catch(e){erro.textContent=e.message;for(const k of Object.keys(e.campos||{}))controles[k]?.setAttribute('aria-invalid','true');f.querySelector('[aria-invalid=true]')?.focus();throw e;}},'Cadastro atualizado.',ctx.reabrir);
  });
 });editar.dataset.opEditar='';editar.disabled=!ctx.permissoes.includes('editar-cadastro');destino.append(editar);
}
export function montarExamesProvas(destino,a,ctx){
 const permitido=ctx.permissoes.includes('verificar'),tentativas=provasDoAluno(a);
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
 destino.append(el('h4','Provas e agendamentos'));
 function formularioProva(tipo,atual,host){
  const cfg=PROVAS_FICHA[tipo],f=el('form',undefined,'op-prova-form'),situacao=select(SITUACOES_PROVA,atual?.status||'Não solicitado'),dia=entrada('date',atual?.data||''),dataCampo=campo('Data da prova',dia),erro=erroFormulario(f),acoes=el('div',undefined,'op-ficha-acoes');
  f.dataset.opProva=tipo;f.noValidate=true;situacao.name='status';dia.name='data';const encerrada=atual&&(final(atual.status)||atual.arquivada);situacao.disabled=dia.disabled=!permitido||encerrada||atual?.origem==='oficial';
  const sincronizar=()=>{dataCampo.hidden=situacao.value!=='Agendado';dia.required=!dataCampo.hidden;erro.textContent='';dia.removeAttribute('aria-invalid');};situacao.addEventListener('change',sincronizar);sincronizar();
  if(atual?.status==='Agendado'&&ctx.servico.identidade.nivel<2)dia.disabled=true;
  if(!ctx.permissoes.includes('cancelar-prova'))[...situacao.options].find(o=>o.value==='Cancelado').disabled=true;
  const b=el('button','Salvar prova',primario);b.type='submit';b.disabled=situacao.disabled;acoes.append(b);
  if(encerrada&&permitido)acoes.append(botao('Nova tentativa',()=>formularioProva(tipo,null,host)));
  f.prepend(campo(cfg.nome,situacao),dataCampo);if(atual)f.append(el('p',`Tentativa ${atual.ordem}${atual.data?' · '+data(atual.data):''}${atual.arquivada?' · Arquivada':''}${atual.legado?' · Registro anterior':''}`,'op-help'));f.append(acoes);
  const pedido=crypto.randomUUID();envio(f,async()=>{
   if(situacao.value==='Agendado'&&!dataValida(dia.value)){erro.textContent='Informe uma data de prova válida.';dia.setAttribute('aria-invalid','true');dia.focus();return;}
   const salvarProva=confirmado=>ctx.executar(()=>ctx.servico.movimentarProva(a.id,{tipo,tentativaId:atual?.id,status:situacao.value,data:dia.value,confirmado},pedido),'Prova atualizada.',ctx.reabrir);
   if(final(situacao.value))confirmar(ctx,'Confirmar resultado da prova?',`${cfg.nome} · ${situacao.value}. O resultado encerrará esta tentativa.`,()=>salvarProva(true));else await salvarProva(false);
  });host.replaceChildren(f);
 }
 for(const [tipo,cfg] of Object.entries(PROVAS_FICHA).filter(([,c])=>!c.categoria||a.categoria.includes(c.categoria))){
  const lista=tentativas.filter(p=>p.tipo===tipo),atual=lista.find(p=>!p.arquivada&&['Solicitado','Agendado'].includes(p.status))||lista.at(-1),host=el('div');formularioProva(tipo,atual,host);destino.append(host);
 }
}
export function montarProvasAgendadas(destino,a,ctx){
 const permitido=ctx.permissoes.includes('verificar'),tentativas=provasDoAluno(a);
 if(ctx.servico.corrigirProva&&tentativas.length)destino.append(botao('Corrigir registro de prova',()=>formularioAdministrativo(ctx.raiz,'Correção de prova',[['tentativa','Tentativa','select',tentativas[0].id,tentativas.map(p=>[p.id,PROVAS_FICHA[p.tipo].nome+' · Tentativa '+p.ordem+' · '+p.status])],['data','Data da prova','date',tentativas[0].data||hojeBrasil()],['status','Situação corrigida','select',tentativas[0].status,SITUACOES_PROVA],['justificativa','Justificativa','textarea','']],d=>ctx.executar(()=>ctx.servico.corrigirProva(a.id,d.tentativa,d),'Correção preservada no histórico.',ctx.reabrir))));
 destino.append(el('h4','Provas agendadas'));const ativos=tentativas.filter(p=>p.status==='Agendado'&&!p.arquivada);
 if(!ativos.length)destino.append(el('p','Nenhuma prova agendada.','op-help'));
 for(const p of ativos){
  const cfg=PROVAS_FICHA[p.tipo],linha=el('article',undefined,'op-prova-ativa'),identificacao=el('div',undefined,'op-prova-identificacao'),dataConsulta=entrada('text',data(p.data));
  linha.dataset.opTentativa=p.id;dataConsulta.readOnly=true;dataConsulta.dataset.opDataProva='';dataConsulta.setAttribute('aria-readonly','true');
  identificacao.append(el('strong',cfg.nome),el('span',`Tentativa ${p.ordem}`),el('span','Situação: Agendada'));linha.append(identificacao,campo('Data da prova',dataConsulta));const acoes=el('div',undefined,'op-ficha-acoes');
  const autorizada=permitido&&p.origem!=='oficial'&&(!cfg.categoria||a.categoria.includes(cfg.categoria));
  function acao(titulo,rotulo,controle,dados){const d=modal(ctx.raiz,titulo,'opAcaoProva'),f=el('form'),erro=erroFormulario(f),b=el('button','Confirmar',primario),chave=crypto.randomUUID();f.noValidate=true;b.type='submit';f.prepend(campo(rotulo,controle));f.append(botao('Voltar',()=>d.close()),b);d.append(f);envio(f,async()=>{if(controle.type==='date'&&!dataValida(controle.value)){erro.textContent='Informe uma data válida.';controle.setAttribute('aria-invalid','true');return;}if(dados.acao==='arquivar'&&controle.value.trim().length<5){erro.textContent='Informe o motivo (mínimo de 5 caracteres).';controle.setAttribute('aria-invalid','true');return;}const ok=await ctx.executar(()=>ctx.servico.movimentarProva(a.id,{tipo:p.tipo,tentativaId:p.id,...dados,[dados.acao==='arquivar'?'motivo':controle.type==='date'?'data':'status']:controle.value},chave),'Tentativa atualizada.',ctx.reabrir);if(ok)d.close();});d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();}
  const acoesPermitidas=[['Registrar resultado',()=>acao('Registrar resultado','Resultado confirmado',select(ctx.permissoes.includes('cancelar-prova')?['Aprovado','Reprovado','Cancelado']:['Aprovado','Reprovado'],'Reprovado'),{confirmado:true})]];
  if(ctx.servico.identidade.nivel>=2&&ctx.permissoes.includes('editar-prova'))acoesPermitidas.push(['Editar',()=>acao('Editar data da prova','Nova data',entrada('date',p.data),{status:'Agendado'})]);
  if(ctx.servico.identidade.nivel>=2&&ctx.permissoes.includes('excluir-prova'))acoesPermitidas.push(['Excluir agendamento',()=>acao('Excluir agendamento administrativo','Motivo obrigatório — não cancela a prova no DETRAN',el('textarea'),{acao:'arquivar'})]);
  for(const [titulo,fn] of acoesPermitidas){const b=botao(titulo,fn);b.disabled=!autorizada;acoes.append(b);}linha.append(acoes);destino.append(linha);
 }
 const anteriores=el('section',undefined,'op-tentativas-anteriores');anteriores.append(el('h4','Histórico de provas e resultados'));
 for(const p of tentativas.filter(p=>p.arquivada||final(p.status)||!SITUACOES_PROVA.includes(p.status))){
  const linha=el('article',undefined,'op-prova-resultado');linha.dataset.opResultadoProva=p.id;
  linha.append(el('strong',PROVAS_FICHA[p.tipo]?.nome||p.tipo),el('p',`Tentativa ${p.ordem} · Data da prova: ${data(p.data)} · ${p.arquivada?'Arquivada':p.status}${!SITUACOES_PROVA.includes(p.status)?' (registro anterior, somente consulta)':''}`));
  if(p.motivoExclusao)linha.append(el('p','Motivo: '+p.motivoExclusao));anteriores.append(linha);
 }if(anteriores.children.length===1)anteriores.append(el('p','Nenhum resultado anterior registrado.','op-help'));destino.append(anteriores);
}
export function montarLinhaTempo(destino,eventos,{abrirAula}={}){
 const box=el('section',undefined,'op-linha-tempo');box.dataset.opLinhaTempo='';box.setAttribute('aria-label','Histórico do aluno');
 const filtros=el('form',undefined,'op-timeline-filtros'),tipo=select([['','Todos os eventos'],['cadastro','Cadastro e alterações'],['aulas','Aulas e pacotes'],['exames','Exames'],['provas','Provas'],['unidades','Unidades'],['acessos','Acessos']]),inicio=entrada('date'),fim=entrada('date'),erro=erroFormulario(filtros),lista=el('div'),paginacao=el('nav',undefined,'op-ficha-acoes');let pagina=1;
 tipo.name='tipo';inicio.name='inicio';fim.name='fim';filtros.prepend(campo('Eventos',tipo),campo('De',inicio),campo('Até',fim));filtros.append(botao('Aplicar filtros',()=>{pagina=1;render();}),botao('Limpar filtros',()=>{filtros.reset();pagina=1;render();}));filtros.addEventListener('submit',e=>{e.preventDefault();pagina=1;render();});box.append(filtros,lista,paginacao);destino.append(box);
 const dia=em=>em&&Number.isFinite(Date.parse(em))?new Date(em).toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'}):'';
 function render(){
  lista.replaceChildren();paginacao.replaceChildren();erro.textContent='';if((inicio.value&&!dataValida(inicio.value))||(fim.value&&!dataValida(fim.value))||(inicio.value&&fim.value&&inicio.value>fim.value)){erro.textContent='Informe um período válido.';return;}
  const resultado=eventos.filter(h=>(!tipo.value||h.grupo===tipo.value)&&(!inicio.value||(dia(h.em)&&dia(h.em)>=inicio.value))&&(!fim.value||(dia(h.em)&&dia(h.em)<=fim.value))),total=Math.ceil(resultado.length/10);pagina=Math.min(pagina,Math.max(1,total));let grupo;
  for(const h of resultado.slice((pagina-1)*10,pagina*10)){
   const chave=dia(h.em);if(chave!==grupo){grupo=chave;lista.append(el('h5',chave?data(chave):'Data não informada'));}
   const item=el('article',undefined,'op-timeline-evento');item.dataset.opEvento=h.id;
   const horario=chave?new Date(h.em).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}):'Horário não informado';item.append(el('small',`${horario} · ${h.grupo}`),el('strong',h.titulo));if(h.descricao)item.append(el('p',h.descricao));
   for(const d of h.dados||[])item.append(el('p',`${d.campo}: ${d.antes!==undefined?String(d.antes)+' → ':''}${typeof d.depois==='object'?JSON.stringify(d.depois):d.depois??'Não informado'}`));
   if(h.motivo)item.append(el('p','Motivo: '+h.motivo));if(h.mantidas)item.append(el('p',`Aulas preservadas na unidade original: ${h.mantidas.length}. Canceladas explicitamente: ${h.canceladas?.length||0}.`));if(h.responsavel)item.append(el('small','Responsável: '+h.responsavel));if(h.grupo==='aulas'&&h.referencia&&abrirAula)item.append(botao('Ver detalhes da aula',()=>abrirAula(h.referencia)));lista.append(item);
  }
  if(!resultado.length)lista.append(el('p','Nenhum evento encontrado para os filtros informados.','op-help'));
  if(total>1){const anterior=botao('Anterior',()=>{pagina--;render();}),proximo=botao('Próxima',()=>{pagina++;render();});anterior.disabled=pagina===1;proximo.disabled=pagina===total;paginacao.append(anterior,el('span',`Página ${pagina} de ${total}`),proximo);}
 }
 render();
}
