import {montarFiltrosAulas} from './filtrosAulas.js';
import {abrirSolicitacaoMedica} from './solicitacaoMedica.js';
import {montarAtestadosAluno} from './atestadosAluno.js';
import {situacaoMedica} from '../../../shared/components/situacaoMedica.js';
import {STATUS_MEDICO} from '../../../shared/js/solicitacoesMedicas.js';
import {nomeCambio} from '../../../shared/js/operacaoCarro.js';
import {NOMES_CATEGORIA,localDaReservaOperacional,recursoCategoriaD} from '../../../shared/js/categorias.js';
import {localDaReserva,nomeLocalDaReserva,linkLocalizacaoReserva,orientacoesComparecimento} from '../../../shared/components/localAula.js';
import {calcularPrazoCancelamento,identificarMotivo,parAutomaticoCategoriaD,POLITICA_CANCELAMENTO} from '../domain/agendamentoAluno.js';
import {GRADE_CENTRO} from '../../../shared/js/disponibilidade.js';
import {montarAgendamentoAutomatico} from './preferenciasAluno.js';
import {obterUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {formatarCpf,formatarTelefone} from '../../../shared/js/formatacao.js';
import {formatarData,dataBrasilia,horaBrasilia,dataHoraBrasilia,hojeBrasil} from '../../../shared/js/calendario.js';
import {situacaoExame,resumoExames,etapasHabilitacao} from '../domain/habilitacaoAluno.js';
import {MOTIVOS_CANCELAMENTO_LOCAL,UNIDADES_LOCAIS,normalizarUnidadeLocal,nomeUnidadeLocal} from '../domain/dominioAluno.js';
export {preencherProgressoAlunoLocal as apresentarProgresso,preencherDadosAlunoLocal as apresentarPerfil,listarAulasAlunoLocal as apresentarAulas,iniciarReservaAlunoLocal as apresentarAgendamento,montarSenhaPerfilLocal as montarAlteracaoSenha};
// "Antes da sua aula": a partir de 768px o resumo não recebe clique (mouse), então ao alargar a janela o bloco abre.
if(typeof matchMedia==='function')matchMedia('(max-width:767px)').addEventListener?.('change',e=>{const b=document.getElementById('lesson-attendance');if(b&&!e.matches)b.open=true;});
const categoriasDoPainel=(dados,ordem=['A','B','D'])=>ordem.filter(c=>dados.categorias?.length?dados.categorias.includes(c):c!=='D'||dados.resumo.categorias.D?.total>0);
function preencherProgressoAlunoLocal(dados){
    const resumo=dados.resumo,overview=document.querySelector('.progress-overview');overview.replaceChildren();
    for(const categoria of categoriasDoPainel(dados)){
        const c=resumo.categorias[categoria],card=document.createElement('article');card.className='progress-card category-progress-card';card.dataset.categoriaProgresso=categoria;
        const h=document.createElement('h2');h.textContent=(NOMES_CATEGORIA[categoria])+' — Categoria '+categoria;const dl=document.createElement('dl');
        for(const [campo,label,valor] of [['contratadas','Aulas contratadas',c.total??'—'],['disponiveis','Aulas disponíveis',c.disponiveis??'—'],['agendadas','Aulas agendadas',c.reservadas??'—'],['concluidas','Aulas concluídas',c.realizadas??'—']]){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(valor);dd.dataset.metrica=campo;div.append(dt,dd);dl.append(div);}card.append(h,dl);overview.append(card);
    }
    const detalhes=document.querySelector('.progress-details');detalhes.replaceChildren();detalhes.hidden=true;
    const evolucao=document.querySelector('.progress-bar-section');evolucao.replaceChildren();evolucao.hidden=true;
    // 17/11/2026 (pedido do usuário): o avanço de cada categoria dentro do próprio cartão (antes, um cartão ao lado com
    // título e números grandes), numa linha "Seu avanço · 0 de 20 aulas concluídas" com o selo e a barra.
    for(const categoria of categoriasDoPainel(dados)){const c=resumo.categorias[categoria],card=document.createElement('div');card.className='category-evolution category-evolution-dentro';card.dataset.evolucao=categoria;const h=document.createElement('span');h.className='category-evolution-titulo';h.textContent='Seu avanço';const rotulo=document.createElement('p');rotulo.textContent=(c.realizadas??'—')+' de '+(c.total??'total não informado')+' aulas concluídas';const percentual=document.createElement('strong');percentual.textContent=c.percentual==null?(c.total==null?'Divisão por categoria não informada':c.total?'Ainda não iniciado':'Sem contratação informada'):c.percentual+'%';percentual.dataset.percentual=categoria;if(c.percentual==null)percentual.classList.add('category-evolution-texto');
        const barra=document.createElement('div');barra.className='category-progress-track';barra.setAttribute('role','progressbar');barra.setAttribute('aria-label','Evolução da Categoria '+categoria);barra.setAttribute('aria-valuemin','0');barra.setAttribute('aria-valuemax','100');if(c.percentual!=null)barra.setAttribute('aria-valuenow',String(c.percentual));barra.setAttribute('aria-valuetext',percentual.textContent);const fill=document.createElement('span');fill.style.width=(c.percentual??0)+'%';barra.append(fill);const linha=document.createElement('div');linha.className='category-evolution-linha';linha.append(h,percentual);card.append(linha,rotulo,barra);overview.querySelector('[data-categoria-progresso='+categoria+']').append(card);
    }
    document.querySelector('#progress-packages').closest('.progress-details').hidden=true;
    apresentarAcompanhamento(dados.acompanhamento,overview);
}

// Sua habilitação: resumo dos exames, exames em cards com selo (ícone e borda coloridos) e provas como etapas.
const ICONES_SELO={ok:'<path d="m5 12 4 4 10-10"/>',neutro:'<circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/>',alerta:'<path d="M12 3 2 20h20L12 3Z"/><path d="M12 10v4m0 3h.01"/>'};
function apresentarAcompanhamento(dados,apos){
 let raiz=document.querySelector('[data-acompanhamento-aluno]');
 if(!dados){raiz?.remove();return;}
 if(!raiz){raiz=document.createElement('div');raiz.dataset.acompanhamentoAluno='';raiz.className='progress-admin-grid';apos.after(raiz);}
 raiz.replaceChildren();
 const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined)n.textContent=texto;if(classe)n.className=classe;return n;};
 const hoje=hojeBrasil(),exames=dados.exames||[];
 const secao=el('section',undefined,'progress-detail-card progress-admin-section progress-habilitacao');secao.dataset.habilitacaoAluno='';secao.setAttribute('aria-labelledby','progress-habilitacao-titulo');
 const topo=el('header'),titulo=el('h2','Sua habilitação');titulo.id='progress-habilitacao-titulo';
 const resumo=el('p',resumoExames(exames,hoje).texto,'progress-habilitacao-resumo');resumo.dataset.examesEmDia='';topo.append(titulo,resumo);secao.append(topo);
 secao.append(el('h3','Exames'));
 const lista=el('ul',undefined,'progress-exames');
 for(const exame of exames){
  const s=situacaoExame(exame,hoje),card=el('li',undefined,'progress-exame');card.dataset.exameAluno=exame.tipo;card.dataset.situacao=s.chave;
  const selo=el('span',undefined,'progress-selo');selo.dataset.tom=s.tom;selo.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+ICONES_SELO[s.tom]+'</svg>';selo.append(s.rotulo);
  card.append(el('strong',exame.nome),selo);
  if(exame.validade&&['aprovado','vencendo','vencido'].includes(s.chave))card.append(el('small',(s.chave==='vencido'?'Venceu em ':'Válido até ')+formatarData(exame.validade.slice(0,10)),'progress-exame-validade'));
  if(exame.data)card.append(el('small','Registrado em '+formatarData(exame.data.slice(0,10)),'progress-exame-registro'));
  lista.append(card);
 }
 if(!exames.length)lista.append(el('li','Nenhum exame registrado.','progress-admin-note'));
 secao.append(lista,el('h3','Provas'));
 const etapas=el('ol',undefined,'progress-etapas');etapas.setAttribute('aria-label','Etapas até a habilitação');
 etapasHabilitacao(dados,hoje).forEach((e,i)=>{
  const li=el('li',undefined,'progress-etapa');li.dataset.estado=e.estado;if(e.tipo==='exames')li.dataset.etapaExames='';else li.dataset.provaAluno=e.tipo;
  const marca=el('span',e.estado==='feito'?'✓':e.estado==='falhou'?'!':String(i+1),'progress-etapa-marca');marca.setAttribute('aria-hidden','true');
  const texto=el('div',undefined,'progress-etapa-texto');texto.append(el('strong',e.titulo),el('span',e.situacao,'progress-etapa-situacao'));if(e.detalhe)texto.append(el('small',e.detalhe));
  if(e.estado==='atual')li.setAttribute('aria-current','step');
  li.append(marca,texto);etapas.append(li);
 });
 secao.append(etapas,el('p','A Recepção agenda suas provas quando os exames estiverem em dia.','progress-admin-note'));
 // Fase 6: o PDF do agendamento da prova, anexado pela autoescola.
 const comPdf=(dados.provas||[]).flatMap(p=>(p.tentativas||[]).filter(t=>t.temAgendamento&&!t.resultado).map(t=>({...t,nome:p.nome})));
 if(comPdf.length){const box=el('div',undefined,'progress-agendamentos-prova');box.dataset.agendamentosProva='';box.append(el('h3','Agendamento da prova'));
  for(const t of comPdf){const b=el('button','Baixar agendamento · '+t.nome+(t.data?' · '+formatarData(t.data.slice(0,10)):'')+(t.hora?' às '+t.hora:t.periodo?' ('+(t.periodo===1?'manhã':'tarde')+')':''),'progress-pdf-prova');b.type='button';b.dataset.agendamentoProva=t.id;
   b.onclick=async()=>{b.disabled=true;try{const api=await import('../../../shared/js/api.js');const blob=await api.Get('alunos/me/provas/'+t.id+'/agendamento',{binario:true});window.open(URL.createObjectURL(blob),'_blank','noopener');}catch(e){alert(e?.message||'Não foi possível baixar o agendamento.');}finally{b.disabled=false;}};box.append(b);}
  secao.append(box);}
 raiz.append(secao);
}

function preencherDadosAlunoLocal(dados) {
    const { aluno, resumo, credito } = dados;
    if(dados.categorias?.includes('D')||resumo.categorias.D?.total>0)for(const chave of ['total','disponivel']){const base=document.querySelector(`[data-perfil-${chave}=B]`);if(base&&!document.querySelector(`[data-perfil-${chave}=D]`)){const card=base.parentElement.cloneNode(true);card.querySelector('span').textContent='Categoria D — Ônibus';card.querySelector('strong').setAttribute('data-perfil-'+chave,'D');base.parentElement.after(card);}}
    const texto = (id, valor) => { const n = document.getElementById(id); if (n) n.textContent = valor; };
    const disponiveis = Object.values(resumo.categorias).reduce((s, c) => s + (c.disponiveis || 0), 0), reservadas = Object.values(resumo.categorias).reduce((s, c) => s + c.reservadas, 0);
    for(const n of document.querySelectorAll('[data-perfil-total],[data-perfil-disponivel]'))if(dados.categorias?.length)n.parentElement.hidden=!dados.categorias.includes(n.dataset.perfilTotal||n.dataset.perfilDisponivel);
    if(aluno?.categoria?.includes('B')){let n=document.getElementById('profile-car-transmission');if(!n){const c=document.createElement('div'),l=document.createElement('span');n=document.createElement('strong');n.id='profile-car-transmission';l.textContent='TIPO DE CARRO';c.className='profile-info-card';c.append(l,n);document.querySelector('.profile-info-grid').append(c);}n.textContent=nomeCambio(aluno.tipoCambio);}
    if(aluno?.nascimento){for(const [id,titulo,valor] of [['profile-birthdate','DATA DE NASCIMENTO',aluno.nascimento.split('-').reverse().join('/')],['profile-car-unit','UNIDADE DAS AULAS DE CARRO',aluno.categoria?.includes('B')?nomeUnidadeLocal(aluno.unidadeCarro||aluno.unidade):'Nao se aplica']]){let n=document.getElementById(id);if(!n){const c=document.createElement('div'),l=document.createElement('span');n=document.createElement('strong');n.id=id;l.textContent=titulo;c.className='profile-info-card';c.append(l,n);document.querySelector('.profile-info-grid').append(c);}n.textContent=valor;}}
    const categorias = (aluno?.categoriasFormacao||[]).map(c=>({1:'A',2:'B',3:'D'})[c.valor]).filter(Boolean).join(', ').replace(/, (?=[^,]+$)/,' e ') || (['A','B','D','AB'].includes(aluno?.categoria)?aluno.categoria.replace('AB','A e B'):'');
    for (const id of ["profile-name", "profile-full-name"]) texto(id, aluno?.nome || "Cadastro ainda não vinculado");
    texto("profile-avatar", aluno?.nome?.charAt(0) || "—"); texto("profile-cpf", formatarCpf(aluno?.documento));
    { const n = document.getElementById("profile-email"), e = aluno?.email || "", i = e.indexOf("@"); if (n) { if (i > 0) n.replaceChildren(e.slice(0, i + 1), document.createElement("wbr"), e.slice(i + 1)); else n.textContent = e || "Não cadastrado"; } } // quebra o e-mail longo depois do @, não no meio texto("profile-phone", aluno?.telefone ? formatarTelefone(aluno.telefone) : "Não cadastrado");
    for (const id of ["profile-course-category", "student-category"]) texto(id, categorias || "Não informadas");
    // 10/11/2026: no topo de Meu perfil, pequeno: "Categoria: B" (ou "Categorias: A e B").
    texto("profile-category", categorias ? (/ e |,/.test(categorias) ? "Categorias: " : "Categoria: ") + categorias : "Categoria não informada");
    for (const id of ["profile-school", "student-school"]) texto(id, aluno?.unidade || "Não informada");
    const vinculo = document.getElementById("profile-school");
    if (vinculo) {
        const informado = aluno?.unidade && aluno.unidade !== "Não informada";
        vinculo.textContent = informado ? nomeUnidadeLocal(aluno.unidade) : "Unidade ainda não vinculada";
        vinculo.closest(".profile-info-card").querySelector("span").textContent = "UNIDADE DE VÍNCULO";
        vinculo.closest(".profile-info-card").querySelector("small").textContent = informado ? `Aluno vinculado à ${nomeUnidadeLocal(aluno.unidade)}. Suas aulas podem ocorrer em outras unidades.` : "Unidade de vínculo ainda não informada.";
    }
    for (const id of ["progress-package-label"]) texto(id, credito ? "Créditos contratados" : "Nenhum pacote disponível");
    for (const id of ["remaining-lessons"]) texto(id, String(disponiveis));
    for(const categoria of categoriasDoPainel(dados)){const c=resumo.categorias[categoria],total=document.querySelector('[data-perfil-total="'+categoria+'"]'),saldo=document.querySelector('[data-perfil-disponivel="'+categoria+'"]');if(total)total.textContent=c.total==null?'Não informado':c.total+' aulas';if(saldo)saldo.textContent=c.disponiveis==null?'Não informado':c.disponiveis+' aulas';}
    texto("package-lessons", String(resumo.total)); texto("completed-lessons", String(resumo.realizadas)); texto("scheduled-lessons", String(reservadas));
    texto("progress-percentage", resumo.percentual == null ? "—" : `${resumo.percentual}%`);
    texto("progress-bar-percentage", resumo.percentual == null ? "Ainda não iniciado" : `${resumo.percentual}%`);
    texto("progress-message", resumo.realizadas ? `${resumo.realizadas} aulas concluídas · ${reservadas} reservadas` : "Sua evolução começa com as aulas concluídas.");
    const barra = document.getElementById("progress-fill"); if (barra) barra.style.width = `${resumo.percentual || 0}%`;
    for (const id of ["progress-packages", "pedidos-lista"]) {
        const node = document.getElementById(id); if (!node) continue; node.replaceChildren();
        const p = document.createElement("p"); p.className = "sipa-local-empty";
        p.textContent = 'Consulte suas contratações para mais informações.'; node.append(p);
    }
    const escolha = document.getElementById("pacotes-escolha"); if (escolha) escolha.textContent = "Pacotes comerciais e contratações aguardam integração. Nenhum preço ou compra foi simulado.";
}

function montarSenhaPerfilLocal(servico){
    const botao=document.getElementById('change-password-button');if(!botao)return;botao.disabled=false;botao.removeAttribute('title');
    botao.onclick=()=>{
        if(document.querySelector('.profile-password-dialog'))return;
        const d=document.createElement('dialog');d.className='profile-password-dialog';d.setAttribute('aria-labelledby','profile-password-title');d.setAttribute('aria-describedby','profile-password-description');
        d.innerHTML='<header><svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V6a4 4 0 0 1 8 0v4m-4 5v2"/></svg><h2 id="profile-password-title">Alterar senha</h2></header><p id="profile-password-description">Para sua segurança, informe sua senha atual e escolha uma nova senha para acessar sua conta.</p><form novalidate><div data-password-fields></div><small>A nova senha deverá atender à política informada pelo serviço.</small><p data-password-feedback role="status"></p><footer><button type="button" data-password-cancel>Cancelar</button><button type="submit" data-password-submit disabled>Confirmar alteração</button></footer></form>';
        const form=d.querySelector('form'),enviar=d.querySelector('[data-password-submit]'),cancelar=d.querySelector('[data-password-cancel]'),feedback=d.querySelector('[data-password-feedback]');let processando=false;
        const eye='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z"/><circle cx="12" cy="12" r="3"/></svg>';
        for(const [nome,label,placeholder,auto] of [['atual','Senha atual','Digite sua senha atual','current-password'],['nova','Nova senha','Digite a nova senha','new-password'],['confirmacao','Confirmar nova senha','Digite novamente a nova senha','new-password']]){const box=document.createElement('div');box.className='profile-password-field';const l=document.createElement('label');l.htmlFor='profile-password-'+nome;l.textContent=label;const wrap=document.createElement('div'),input=document.createElement('input'),mostrar=document.createElement('button');wrap.className='profile-password-input';input.id=l.htmlFor;input.name=nome;input.type='password';input.required=true;input.placeholder=placeholder;input.autocomplete=auto;input.setAttribute('aria-describedby','profile-password-feedback');mostrar.type='button';mostrar.className='profile-password-visibility';mostrar.setAttribute('aria-label','Mostrar '+label.toLowerCase());mostrar.setAttribute('aria-pressed','false');mostrar.innerHTML=eye;mostrar.onclick=()=>{const visivel=input.type==='password';input.type=visivel?'text':'password';mostrar.setAttribute('aria-pressed',String(visivel));mostrar.setAttribute('aria-label',(visivel?'Ocultar ':'Mostrar ')+label.toLowerCase());};wrap.append(input,mostrar);box.append(l,wrap);d.querySelector('[data-password-fields]').append(box);}
        feedback.id='profile-password-feedback';
        const campos=()=>({atual:form.elements.atual.value,nova:form.elements.nova.value,confirmacao:form.elements.confirmacao.value});
        function validar(){const v=campos();if(!v.atual)return 'Informe sua senha atual.';if(!v.nova)return 'Informe uma nova senha.';if(!v.confirmacao||v.confirmacao!==v.nova)return 'A confirmação não corresponde à nova senha.';if(v.nova===v.atual)return 'A nova senha deve ser diferente da senha atual.';return '';}
        form.oninput=()=>{const erro=validar();enviar.disabled=processando||!!erro;feedback.textContent=erro;feedback.setAttribute('role','status');};
        cancelar.onclick=()=>d.close();d.oncancel=e=>{if(processando)e.preventDefault();};
        form.onsubmit=async e=>{e.preventDefault();if(processando)return;const erro=validar();if(erro){feedback.textContent=erro;feedback.setAttribute('role','alert');return;}processando=true;enviar.disabled=true;cancelar.disabled=true;enviar.textContent='Salvando…';d.setAttribute('aria-busy','true');form.querySelectorAll('input,.profile-password-visibility').forEach(n=>n.disabled=true);try{await servico.alterarSenhaLocal(campos());d.close();let sucesso=document.getElementById('profile-password-success');if(!sucesso){sucesso=document.createElement('p');sucesso.id='profile-password-success';sucesso.setAttribute('role','status');botao.closest('.profile-security-card').after(sucesso);}sucesso.textContent='Senha alterada com sucesso!';}catch(erro){feedback.textContent=(erro?.message&&!/^Failed|NetworkError/i.test(erro.message)?erro.message+' ':'')+'Sua senha anterior foi mantida.';feedback.setAttribute('role','alert');}finally{processando=false;enviar.textContent='Confirmar alteração';cancelar.disabled=false;form.querySelectorAll('input,.profile-password-visibility').forEach(n=>n.disabled=false);enviar.disabled=!!validar();d.removeAttribute('aria-busy');}};
        d.onclose=()=>{form.querySelectorAll('input').forEach(n=>{n.value='';n.type='password';});d.remove();botao.focus();};document.body.append(d);d.showModal();form.elements.atual.focus({preventScroll:true});d.scrollTop=0;
    };
}



// 11/11/2026: confirmação depois do cancelamento (antes a lista só atualizava). Usa o visual "cancel-success" de Minhas aulas.
// creditoDevolvido: true (voltou), false (retido) ou null (motivo médico: o crédito depende da análise da Gerência).
// 17/11/2026 (pedido do usuário): a aula cancelada diz, numa linha, quem cancelou e o motivo. A origem vem da API
// (EnumValueDto {valor, descricao}: 1 aluno, 2 Recepção, 3 Gerência, 4 Master = Diretoria, 5 sistema) ou do modo local
// ('aluno', 'recepcao'...). O motivo é o da lista; no "Outro motivo" (dia sem aula, por exemplo), o texto informado.
const QUEM_CANCELOU=Object.freeze({1:'pelo aluno',2:'pela Recepção',3:'pela Gerência',4:'pela Diretoria',5:'pelo sistema'});
const ORIGEM_CANCELAMENTO=Object.freeze({aluno:1,recepcao:2,'recepção':2,gerencia:3,'gerência':3,master:4,diretoria:4,sistema:5});
export function quemCancelou(origem){
    if(origem==null||origem==='')return null;
    const texto=v=>ORIGEM_CANCELAMENTO[String(v||'').trim().toLowerCase()];
    const valor=typeof origem==='object'?(Number(origem.valor)||texto(origem.descricao)):(Number(origem)||texto(origem));
    return QUEM_CANCELOU[valor]||null;
}
export function motivoDoCancelamento(aula){
    const c=aula?.cancelamento||{},motivo=String(c.motivo||aula?.motivoCancelamento||'').trim(),obs=String(c.observacoes||'').trim();
    return obs&&(!motivo||/^outros?( motivo)?$/i.test(motivo))?obs:motivo;
}
// 17/11/2026 (pedido do usuário): a confirmada cujo horário já começou deixa de aparecer como "Confirmada": durante a
// aula, "Em andamento"; depois do fim, "Aguardando registro de presença", até o instrutor ou a Recepção marcar presença
// (vai para "Aulas realizadas") ou falta. Fora disso, null (vale a situação normal).
export function situacaoDaConfirmada(aula,agora=Date.now()){
    if(aula?.status!==1)return null;
    const inicio=Date.parse(aula.inicio||''),fim=Date.parse(aula.fim||'');
    if(!(inicio<=agora))return null;
    return Number.isFinite(fim)&&agora<fim?'Em andamento':'Aguardando registro de presença';
}
function linhaDoCancelamento(aula){
    // 17/11/2026 (pedido do usuário): a aula com atestado não usa a faixa vermelha de cancelamento (parecia erro): verde
    // quando aprovado ("a aula voltou para o seu saldo"), azul em análise e vermelha só quando recusado.
    const atestado=aula.solicitacaoMedica?.status;
    if(atestado){const aprovado=atestado==='aprovado',recusado=atestado==='rejeitado'||atestado==='reprovado';
        const p=document.createElement('p');p.className='local-lesson-cancel-info local-lesson-atestado-info '+(aprovado?'aprovado':recusado?'recusado':'analise');p.dataset.cancelamentoInfo='';
        const t=document.createElement('strong');t.textContent=aprovado?'Atestado aprovado':recusado?'Atestado recusado':'Atestado em análise';
        const s=document.createElement('span');s.textContent=aprovado?'A aula foi abonada e voltou para o seu saldo.':recusado?'A aula conta como falta e não volta para o saldo.':'Aula cancelada por motivo de saúde. Assim que a análise terminar, você vê o resultado aqui.';
        p.append(t,s);return p;}
    const quem=quemCancelou(aula.cancelamento?.origem),motivo=motivoDoCancelamento(aula);
    const p=document.createElement('p');p.className='local-lesson-cancel-info';p.dataset.cancelamentoInfo='';
    // 18/11/2026: a falta com ônus marcada pela autoescola (status 7, crédito retido) dizia só "Aula cancelada".
    const comOnus=aula.statusApi===7||(aula.cancelamento?.credito==='retido'&&aula.cancelamento?.frequencia==='falta');
    if(comOnus&&!quem){const titulo=document.createElement('strong'),s=document.createElement('span');titulo.textContent='Falta registrada pela autoescola';s.textContent='Você avisou fora do prazo ou não compareceu: esta aula foi descontada do seu saldo e não é devolvida.';p.append(titulo,s);return p;}
    const titulo=document.createElement('strong');titulo.textContent=quem?'Cancelamento feito '+quem:'Aula cancelada';p.append(titulo);
    if(motivo){const s=document.createElement('span');s.textContent='Motivo: '+motivo;p.append(s);}
    return p;
}
function avisoCancelamento(aula,creditoDevolvido){
    document.querySelector('.cancel-success-overlay')?.remove();
    const fundo=document.createElement('div');fundo.className='cancel-success-overlay';
    const caixa=document.createElement('div');caixa.className='cancel-success-modal';caixa.setAttribute('role','alertdialog');caixa.setAttribute('aria-modal','true');caixa.setAttribute('aria-labelledby','cancel-success-title');
    const icone=document.createElement('div');icone.className='cancel-success-icon';icone.textContent='✓';icone.setAttribute('aria-hidden','true');
    const h=document.createElement('h2');h.id='cancel-success-title';h.textContent='Aula cancelada com sucesso!';
    const p=document.createElement('p');p.append('Sua aula do dia ',Object.assign(document.createElement('strong'),{textContent:dataBrasilia(aula.inicio)}),' às ',Object.assign(document.createElement('strong'),{textContent:horaBrasilia(aula.inicio)}),' foi cancelada.');
    const info=document.createElement('div');info.className='cancel-success-info';const [tituloInfo,textoInfo]=creditoDevolvido===null?['Atestado enviado para análise.','O crédito desta aula volta para o saldo se a Gerência aprovar o atestado. Acompanhe em "Atestados médicos".']:creditoDevolvido?['Seu saldo foi atualizado.','O crédito desta aula voltou para o seu saldo e você pode reagendar.']:['Crédito retido.','O cancelamento foi fora do prazo, então o crédito desta aula não volta para o saldo.'];
    info.append(Object.assign(document.createElement('strong'),{textContent:tituloInfo}),Object.assign(document.createElement('span'),{textContent:textoInfo}));
    const ok=document.createElement('button');ok.type='button';ok.className='cancel-success-button';ok.textContent='Entendi';
    const fechar=()=>{fundo.remove();document.removeEventListener('keydown',tecla);};const tecla=e=>{if(e.key==='Escape')fechar();};
    ok.onclick=fechar;fundo.onclick=e=>{if(e.target===fundo)fechar();};document.addEventListener('keydown',tecla);
    caixa.append(icone,h,p,info,ok);fundo.append(caixa);document.body.append(fundo);ok.focus();
}

function abrirCancelamentoAlunoLocal(aula,dados,origem,aoConfirmar,servico){
    if(origem.disabled)return;
    origem.disabled=true;
    const d=document.createElement('dialog');d.className='lesson-cancel-dialog';d.setAttribute('aria-labelledby','lesson-cancel-title');d.setAttribute('aria-describedby','lesson-cancel-description');
    d.innerHTML='<header><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/></svg><h2 id="lesson-cancel-title" tabindex="-1">Cancelar aula?</h2></header><p id="lesson-cancel-description">Confira a aula antes de confirmar o cancelamento.</p><dl class="lesson-cancel-summary"></dl><div class="lesson-cancel-reason"><label for="lesson-cancel-reason">Motivo do cancelamento <span>(obrigatório)</span></label><select id="lesson-cancel-reason" required aria-describedby="lesson-cancel-hint"><option value="">Selecione um motivo</option></select><small id="lesson-cancel-hint">Selecione o motivo do cancelamento para continuar.</small></div><aside class="lesson-cancel-policy" aria-label="Política de cancelamento"><p></p></aside><aside class="lesson-cancel-policy" data-health-guidance hidden><strong>Apresentação de atestado médico</strong><p>Se possuir um atestado médico válido, apresente-o à recepção em até 72 horas após o cancelamento. A devolução do crédito dependerá de análise e aprovação.</p><p data-health-deadline></p><a href="https://wa.me/55227998713181" target="_blank" rel="noopener noreferrer">Falar com a recepção</a></aside><label class="cancel-consent" hidden><input type="checkbox" data-cancel-consent> Compreendi que o horário será liberado e o crédito ficará retido, com registro de falta. Uma justificativa de saúde dependerá de aprovação da recepção.</label><p data-cancel-error role="alert"></p><footer><button type="button" data-cancel-back>Voltar / Fechar</button><button type="button" data-cancel-confirm disabled>Confirmar cancelamento</button></footer>';
    const estados={1:'Confirmada',3:'Reservada · aguardando aceite',4:'Recusada'};
    for(const [label,valor] of [['Data',dataBrasilia(aula.inicio)],['Horário',horaBrasilia(aula.inicio)+(aula.fim?' às '+horaBrasilia(aula.fim):'')],['Categoria',aula.categoria?(NOMES_CATEGORIA[aula.categoria]?aula.categoria+' — '+NOMES_CATEGORIA[aula.categoria]:aula.categoria):'Não informada'],[['B','D'].includes(aula.categoria)?'Local da aula':'Unidade',nomeLocalDaReserva(aula)],['Instrutor',dados.registros.find(r=>r.id===aula.instrutor)?.nome||'Não informado'],['Veículo',dados.registros.find(r=>r.id===aula.veiculo)?.nome||'Não informado'],['Status atual',estados[aula.status]||'Não informado']]){const campo=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=valor;campo.append(dt,dd);d.querySelector('dl').append(campo);}
    let salvando=false;
    const voltar=d.querySelector('[data-cancel-back]'),confirmar=d.querySelector('[data-cancel-confirm]'),erro=d.querySelector('[data-cancel-error]');
    const motivo=d.querySelector('#lesson-cancel-reason');
    motivo.append(...MOTIVOS_CANCELAMENTO_LOCAL.map(m=>new Option(m,m)));
    const consentimento=d.querySelector('[data-cancel-consent]');
    function atualizarPolitica(){
        const prazo=calcularPrazoCancelamento(aula,dados.registros),semPenalidade=prazo.dentroPrazo||prazo.semConsumoOriginal,saude=identificarMotivo(motivo.value)?.id==='saude';
        const aviso=d.querySelector('.lesson-cancel-policy');aviso.dataset.penalidade=String(!semPenalidade);
        aviso.querySelector('p').textContent=prazo.semConsumoOriginal?'Esta reserva pendente já expirou. Não há consumo adicional de crédito.':prazo.dentroPrazo?'Cancelamento dentro do prazo. O crédito desta aula será devolvido ao seu saldo.':'Cancelamento fora do prazo. Se você continuar, o crédito não será devolvido automaticamente ao saldo.';
        consentimento.parentElement.hidden=semPenalidade;
        consentimento.parentElement.lastChild.textContent=' Estou ciente de que este cancelamento está fora do prazo e que o crédito não será devolvido automaticamente.';
        d.querySelector('[data-health-guidance]').hidden=semPenalidade||!saude;
        d.querySelector('[data-health-deadline]').textContent=semPenalidade?'Este cancelamento não depende de atestado para tratar o crédito.':'Prazo previsto para apresentação: '+new Date(Date.now()+72*3600000).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit'}).replace(', ',' às ')+'. O prazo definitivo será registrado ao confirmar.';
        confirmar.disabled=salvando||!MOTIVOS_CANCELAMENTO_LOCAL.includes(motivo.value)||(!semPenalidade&&!consentimento.checked);
    }
    const solicitar=document.createElement('button');solicitar.type='button';solicitar.dataset.medicalStart='';solicitar.textContent='Solicitar cancelamento por motivo médico';
    const prazoMedico=calcularPrazoCancelamento(aula,dados.registros);solicitar.hidden=prazoMedico.dentroPrazo||prazoMedico.semConsumoOriginal;solicitar.disabled=!servico?.solicitarCancelamentoMedico;
    if(solicitar.disabled)solicitar.title='Envio disponível para contas locais cadastradas pela recepção. Integração com a API pendente.';
    if(solicitar.disabled&&!solicitar.hidden){const aviso=document.createElement('p');aviso.textContent='Envio de atestado disponível para contas locais cadastradas pela recepção. Integração com a API pendente.';d.querySelector('footer').before(aviso);}
    solicitar.onclick=()=>abrirSolicitacaoMedica({aula,servico,origem:solicitar,aoConcluir:async()=>{await listarAulasAlunoLocal(servico,await servico.dadosAlunoLocal());d.close();avisoCancelamento(aula,null);}});d.querySelector('footer').before(solicitar);
    motivo.onchange=()=>{erro.textContent='';atualizarPolitica();};consentimento.onchange=atualizarPolitica;atualizarPolitica();
    voltar.onclick=()=>d.close();
    d.addEventListener('cancel',e=>{if(salvando)e.preventDefault();});
    confirmar.onclick=async()=>{if(salvando)return;if(!prazoMedico.dentroPrazo&&identificarMotivo(motivo.value)?.id==='saude'&&servico?.solicitarCancelamentoMedico){solicitar.click();return;}if(!MOTIVOS_CANCELAMENTO_LOCAL.includes(motivo.value)){erro.textContent='Selecione o motivo do cancelamento para continuar.';motivo.focus();return;}salvando=true;confirmar.disabled=true;voltar.disabled=true;motivo.disabled=true;d.setAttribute('aria-busy','true');erro.textContent='';try{await aoConfirmar(motivo.value,{aceitarConsequencias:consentimento.checked});d.close();const p=calcularPrazoCancelamento(aula,dados.registros);avisoCancelamento(aula,p.dentroPrazo||p.semConsumoOriginal);}catch(e){erro.textContent=e.message||'Não foi possível cancelar a aula. Tente novamente.';}finally{salvando=false;atualizarPolitica();voltar.disabled=false;motivo.disabled=false;d.removeAttribute('aria-busy');}};
    d.addEventListener('close',()=>{d.remove();if(origem.isConnected){origem.disabled=false;origem.focus();}else document.querySelector('#local-lesson-tabs [aria-pressed="true"]')?.focus();},{once:true});
    document.body.append(d);d.showModal();d.querySelector('h2').focus({preventScroll:true});d.scrollTop=0;
}

// Aba Interesses (Minhas aulas): horários ocupados em que o aluno marcou interesse, com o Desmarcar.
function montarInteressesAluno(servico){
    const painel=document.createElement('section');painel.id='student-interests';painel.className='student-interests';painel.hidden=true;painel.setAttribute('aria-label','Interesses em antecipar');
    const titulo=document.createElement('h2'),ajuda=document.createElement('p'),lista=document.createElement('div'),erro=document.createElement('p');
    titulo.textContent='Interesses em antecipar';ajuda.textContent='Horários ocupados em que você marcou interesse. Se um deles vagar, a recepção entra em contato para remarcar uma aula sua.';erro.setAttribute('role','status');
    painel.append(titulo,ajuda,erro,lista);
    async function carregar(){
        lista.replaceChildren();let itens;
        try{itens=await servico.listarInteresses();}catch(e){erro.textContent=e.message||'Não foi possível consultar seus interesses.';return;}
        if(!itens.length){const p=document.createElement('p');p.className='sipa-local-empty';p.textContent='Nenhum interesse marcado. Na agenda, escolha um horário ocupado e clique em "Tenho interesse".';lista.append(p);return;}
        for(const i of itens){
            const card=document.createElement('article'),cabecalho=document.createElement('div'),h=document.createElement('h3'),situacao=document.createElement('strong'),info=document.createElement('p');
            card.className='student-local-lesson';card.dataset.interesse=i.id;cabecalho.className='local-lesson-heading';situacao.className='local-lesson-status';
            h.textContent=formatarData(i.data)+' às '+i.hora;situacao.textContent=i.situacao;info.textContent=['Categoria '+(i.categoria||'—'),i.unidade].filter(Boolean).join(' · ');cabecalho.append(h,situacao);card.append(cabecalho,info);
            if(i.aberto){const desmarcar=document.createElement('button');desmarcar.type='button';desmarcar.className='local-lesson-cancel';desmarcar.textContent='Desmarcar';desmarcar.setAttribute('aria-label','Desmarcar interesse de '+h.textContent);
                desmarcar.onclick=async()=>{desmarcar.disabled=true;erro.textContent='';try{await servico.desmarcarInteresse(i.id);erro.textContent='Interesse desmarcado.';await carregar();}catch(e){erro.textContent=e.message;desmarcar.disabled=false;}};card.append(desmarcar);}
            lista.append(card);
        }
    }
    return {painel,carregar};
}

// 17/11/2026 (pedido do usuário): as abas de Minhas aulas, para não confundir o aluno.
// - "Aulas confirmadas": as que vão acontecer (e a reserva aguardando aceite).
// - "Aulas realizadas e faltas" (2ª rodada, no lugar do "Histórico"): presenças (verde), faltas (vermelho) e a confirmada
//   que já passou e espera o registro de presença. A falta nunca volta para o saldo.
// - "Aulas canceladas": cancelada, recusada e reserva que expirou sem aceite (não aconteceram).
// - "Atestados médicos": as aulas com atestado (abaixo dos pedidos), para o aluno acompanhar.
export function separarAulasDoAluno(aulas,agora=Date.now()){
    const inicio=a=>Date.parse(a.inicio),vaiAcontecer=a=>(a.status===1||a.status===3)&&inicio(a)>agora,comAtestado=a=>!!a.solicitacaoMedica;
    const confirmadas=aulas.filter(vaiAcontecer).sort((a,b)=>inicio(a)-inicio(b));
    const passadas=aulas.filter(a=>!vaiAcontecer(a)).sort((a,b)=>inicio(b)-inicio(a));
    return {confirmadas,passadas,
        realizadas:passadas.filter(a=>[1,5,6].includes(a.status)&&!comAtestado(a)),
        canceladas:passadas.filter(a=>[2,3,4].includes(a.status)&&!comAtestado(a)),
        atestados:passadas.filter(comAtestado)};
}
// 18/11/2026 (pedido do usuário): número de novidades nas abas "Avisos e ofertas" e "Atestados médicos" (avisos ainda
// não lidos; o do atestado é o resultado decidido pela Gerência) e no item "Minhas aulas" do menu. Abrir "Atestados
// médicos" marca os avisos de atestado como lidos; os outros avisos são lidos um a um em "Avisos e ofertas".
async function marcarNovidadesDasAbas(tabs,servico){
    if(!servico?.avisosNaoLidos)return;
    let marcarIndicadorNovidades=()=>{};try{({marcarIndicadorNovidades}=await import('./mensagensAluno.js'));}catch{}
    const selo=(b,n,texto)=>{if(!b)return;let s=b.querySelector('.aba-novidade');if(!s){s=document.createElement('span');s.className='aba-novidade';b.append(s);}s.textContent=n>99?'99+':String(n);s.hidden=!n;s.title=n?n+' '+texto:'';s.setAttribute('aria-label',s.title);};
    const contar=async()=>{if(!tabs.isConnected)return null;let l;try{l=await servico.avisosNaoLidos();}catch{return null;}
        selo(tabs.querySelector('[data-vista=avisos]'),l.length,'aviso(s) não lido(s)');selo(tabs.querySelector('[data-vista=atestados]'),l.filter(m=>m.tipo===4).length,'resultado(s) de atestado novo(s)');marcarIndicadorNovidades(l.length);return l;};
    let lendo=false;
    const lerAtestados=async()=>{if(lendo)return;lendo=true;try{const l=await contar();for(const m of (l||[]).filter(m=>m.tipo===4)){try{await servico.marcarMensagemLida(m.id);}catch{}}await contar();}finally{lendo=false;}};
    tabs.querySelector('[data-vista=atestados]')?.addEventListener('click',lerAtestados);
    tabs.addEventListener('click',e=>{if(!e.target.closest('[data-vista=atestados]'))setTimeout(contar,800);});window.addEventListener('focus',contar);
    await contar();
}
async function listarAulasAlunoLocal(servico,dados){
    const estado={1:'Confirmada',2:'Cancelada',3:'Reservada · aguardando aceite',4:'Recusada',5:'Presente',6:'Falta'},agora=Date.now();
    const futuras=dados.aulas.filter(a=>a.status===1&&Date.parse(a.inicio)>agora).sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio));
    const {confirmadas,passadas,realizadas,canceladas,atestados:comAtestado}=separarAulasDoAluno(dados.aulas,agora);
    // 17/11/2026 (pedido do usuário): as aulas realizadas ainda sem avaliação ganham "Avaliar minha aula" no cartão.
    let pendentesAvaliacao=new Map(),avaliacao=null;
    if(servico.avaliacoesPendentes&&servico.avaliarAula&&realizadas.some(a=>a.status===5)){
        try{pendentesAvaliacao=new Map(((await servico.avaliacoesPendentes())||[]).map(p=>[p.agendamentoId,p]));}catch{pendentesAvaliacao=new Map();}
        if(pendentesAvaliacao.size){try{avaliacao=await import('./avaliacaoAula.js');avaliacao.carregarCss();}catch{avaliacao=null;}}
    }
    const vistaAnterior=document.querySelector('#local-lesson-tabs [aria-pressed=true]')?.dataset.vista||'confirmadas';
    document.getElementById('local-lesson-tabs')?.remove();
    const tabs=document.createElement('div');tabs.id='local-lesson-tabs';tabs.className='local-lesson-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Visualização das aulas');
    const principal=document.getElementById('lessons-list').closest('section')||document.getElementById('lessons-list').parentElement;
    const anterior=document.getElementById('past-lessons-list').closest('section')||document.getElementById('past-lessons-list').parentElement;
    document.getElementById('student-medical-requests')?.remove();
    const atestados=montarAtestadosAluno(servico,dados);principal.after(atestados.painel);
    document.getElementById('student-interests')?.remove();const interesses=servico.capacidades?.interesse?montarInteressesAluno(servico):null;if(interesses)principal.after(interesses.painel);
    // 16/11/2026 (pedido do usuário): os avisos e as ofertas de horário (antes na página Mensagens) numa aba daqui, como
    // histórico. O componente é o mesmo (marcar como lido, aceitar a oferta); carrega na primeira vez que a aba abre.
    document.getElementById('student-avisos')?.remove();
    const avisos=servico.consultarAvisos?(()=>{const painel=document.createElement('section');painel.id='student-avisos';painel.className='student-avisos-card';painel.hidden=true;
        const titulo=document.createElement('h2');titulo.textContent='Avisos e ofertas de horário';const ajuda=document.createElement('p');ajuda.className='student-avisos-ajuda';ajuda.textContent='Cancelamentos, remarcações e ofertas de horário mais cedo. Uma oferta pode ser aceita aqui.';
        const host=document.createElement('div');host.id='student-avisos-lista';host.className='mensagens-lista';painel.append(titulo,ajuda,host);let montado=false;
        return {painel,carregar:async()=>{if(montado)return;montado=true;if(!document.querySelector('link[data-css-avisos]')){const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('../../css/mensagens.css',import.meta.url).href;l.dataset.cssAvisos='';document.head.append(l);}host.textContent='Carregando avisos…';try{host.replaceChildren();await (await import('./mensagensAluno.js')).montarMensagensAluno(host,servico);}catch(e){montado=false;host.textContent=e?.message||'Não foi possível carregar os avisos.';}}};})():null;
    if(avisos)principal.after(avisos.painel);
    principal.before(tabs);
    // As aulas com atestado aparecem na aba "Atestados médicos", abaixo dos pedidos (só quando houver alguma).
    // 17/11/2026 (pedido do usuário): as aulas com atestado ficam só no cartão do atestado (a lista "Aulas com atestado"
    // repetia as informações); por isso não há grupo "atestados" para a lista de baixo.
    void comAtestado;
    const grupos={realizadas,canceladas};
    for(const [valor,nome] of [['confirmadas','Aulas confirmadas'],['realizadas','Aulas realizadas e faltas'],['canceladas','Aulas canceladas'],...(interesses?[['interesses','Interesses']]:[]),...(avisos?[['avisos','Avisos e ofertas']]:[]),['atestados','Atestados médicos']]){
        const b=document.createElement('button');b.type='button';b.textContent=nome+(valor==='realizadas'?' ('+realizadas.length+')':'');b.dataset.vista=valor;b.setAttribute('aria-pressed',String(valor==='confirmadas'));
        b.onclick=()=>{
            tabs.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));if(tabs.scrollWidth>tabs.clientWidth){const r=b.getBoundingClientRect(),c=tabs.getBoundingClientRect();tabs.scrollLeft+=r.left-c.left-(c.width-r.width)/2;}principal.hidden=valor!=='confirmadas';anterior.hidden=['confirmadas','interesses','avisos'].includes(valor)||(valor==='atestados'&&!grupos.atestados);atestados.painel.hidden=valor!=='atestados';if(avisos){avisos.painel.hidden=valor!=='avisos';if(valor==='avisos')avisos.carregar();}if(interesses){interesses.painel.hidden=valor!=='interesses';if(valor==='interesses')interesses.carregar();}const limpeza=document.getElementById('cleanup-cancelamentos');if(limpeza)limpeza.hidden=valor!=='canceladas';
            if(!grupos[valor])return;
            const grupo=grupos[valor],ids=new Set(grupo.map(a=>a.id));document.querySelectorAll('#past-lessons-list [data-aula-local]').forEach(n=>n.hidden=!ids.has(n.dataset.aulaLocal));
            const h=anterior.querySelector('h2');if(h)h.textContent=valor==='atestados'?'Aulas com atestado':nome;const legenda=anterior.querySelector('.lessons-card-header > div > span');if(legenda)legenda.textContent=({canceladas:'HISTÓRICO DE CANCELAMENTOS',realizadas:'PRESENÇAS E FALTAS',atestados:'ACOMPANHE O ATESTADO'})[valor]||'REGISTROS PRESERVADOS';document.getElementById('past-lessons-count').textContent=String(grupo.length);anterior.querySelector('.local-view-empty')?.remove();
            if(!grupo.length){const p=document.createElement('p');p.className='local-view-empty';p.textContent=valor==='realizadas'?'Nenhuma presença ou falta registrada até o momento.':'Nenhuma aula nesta visualização.';anterior.append(p);}
        };tabs.append(b);
    }
    void marcarNovidadesDasAbas(tabs,servico);
    // "Antes da sua aula" recolhível: fechado no celular, aberto no desktop.
    document.getElementById('lesson-attendance')?.remove();if(futuras.length){const aviso=orientacoesComparecimento(true),bloco=document.createElement('details'),resumo=document.createElement('summary');resumo.textContent=aviso.firstElementChild.textContent;bloco.id='lesson-attendance';bloco.className='lesson-attendance lesson-attendance-recolhivel';bloco.append(resumo,...[...aviso.children].slice(1));bloco.open=!matchMedia('(max-width:767px)').matches;document.getElementById('lessons-list').before(bloco);}
    principal.hidden=false;anterior.hidden=true;const h=principal.querySelector('h2');if(h)h.textContent='Minhas aulas confirmadas';
    for(const [id,aulas] of [['lessons-list',confirmadas],['past-lessons-list',passadas]]){
        const lista=document.getElementById(id);lista.replaceChildren();
        if(!aulas.length){const p=document.createElement('p');p.className='sipa-local-empty';p.textContent=id==='lessons-list'?'Você ainda não possui aulas futuras confirmadas.':'';lista.append(p);}
        for(const aula of aulas){
            const card=document.createElement('article');card.className='student-local-lesson confirmed-lesson';card.dataset.aulaLocal=aula.id;card.dataset.status=aula.status;
            const cabecalho=document.createElement('div');cabecalho.className='local-lesson-heading';const h=document.createElement('h3');h.textContent=dataHoraBrasilia(aula.inicio)+(aula.fim?' às '+horaBrasilia(aula.fim):'');const situacao=document.createElement('strong');situacao.className='local-lesson-status';situacao.textContent=estado[aula.status]||'Situação não informada';
            const horarioPassou=situacaoDaConfirmada(aula,agora);if(horarioPassou){situacao.textContent=horarioPassou;card.dataset.horarioPassou='';}
            // Fase 3 (5.4): a aula com atestado fica como faltoso; a que repõe aparece como reposição por atestado.
            const reposicoes=dados.aluno?.reposicoes||[];
            // 17/11/2026 (pedido do usuário): o selo diz o que aconteceu com o atestado (não "Faltoso", que parecia erro).
            if(aula.solicitacaoMedica&&aula.status!==1){const st=aula.solicitacaoMedica.status;situacao.textContent=st==='aprovado'?'Aula abonada':st==='rejeitado'||st==='reprovado'?'Falta (atestado recusado)':'Atestado em análise';card.dataset.atestado=st==='aprovado'?'aprovado':st==='rejeitado'||st==='reprovado'?'recusado':'analise';}
            if(reposicoes.some(r=>r.aulaReposicaoId===aula.id)){situacao.textContent+=' · Reposição por atestado';card.dataset.reposicao='';}
            cabecalho.append(h,situacao);
            const infos=document.createElement('dl');infos.className='local-lesson-fields';
            for(const [rotulo,valor] of [['Categoria',aula.categoria?(NOMES_CATEGORIA[aula.categoria]?aula.categoria+' — '+NOMES_CATEGORIA[aula.categoria]:aula.categoria):'Não informada'],[aula.categoria==='D'?'Local da aula':'Unidade',nomeLocalDaReserva(aula)],['Instrutor',dados.registros.find(r=>r.id===aula.instrutor)?.nome||'Não informado'],['Veículo',dados.registros.find(r=>r.id===aula.veiculo)?.nome||'Não informado']]){
                const campo=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=rotulo;dd.textContent=valor;campo.append(dt,dd);infos.append(campo);
            }
            const detalhes=document.createElement('details');detalhes.className='local-lesson-history';const resumo=document.createElement('summary');resumo.textContent='Detalhes e histórico';detalhes.append(resumo);
            const textoDetalhe=valor=>{const p=document.createElement('p');p.textContent=valor;detalhes.append(p);};
            const consome=(aula.status===2&&aula.cancelamento?.credito==='retido')||[1,5,6].includes(aula.status)||([3,4].includes(aula.status)&&Date.parse(aula.inicio)>agora);
            textoDetalhe('Crédito: '+(consome?'contabilizado no saldo atual conforme a situação da aula.':'não contabiliza consumo no saldo atual.'));
            if(aula.cancelamento){
                const c=aula.cancelamento;textoDetalhe('Cancelamento: '+(c.dentroPrazo?'dentro':'fora')+' do prazo de 48 horas úteis · Crédito '+c.credito+' · Frequência: '+({cancelada:'cancelada',falta:'falta',justificativa_pendente:'justificativa pendente'})[c.frequencia]+'.');
                if(aula.solicitacaoMedica){textoDetalhe('Análise médica: '+(STATUS_MEDICO[aula.solicitacaoMedica.status]||'Estado anterior preservado'));}else if(c.justificativa){const j=c.justificativa;const estado=j.estado==='aguardando_apresentacao'&&Date.now()>Date.parse(j.prazoApresentacao)?'Prazo encerrado para apresentação':({aguardando_apresentacao:'Aguardando apresentação do atestado',aguardando_analise:'Aguardando análise da recepção',aprovado:'Aprovado',rejeitado:'Rejeitado',prazo_encerrado:'Prazo encerrado'})[j.estado]||'Estado da justificativa não informado';textoDetalhe('Justificativa: '+estado+' · Prazo: '+dataHoraBrasilia(j.prazoApresentacao)+'. Nenhuma aprovação automática.');const contato=document.createElement('a');contato.href='https://wa.me/55227998713181?text=Ol%C3%A1!%20Gostaria%20de%20orienta%C3%A7%C3%B5es%20da%20recep%C3%A7%C3%A3o.';contato.target='_blank';contato.rel='noopener noreferrer';contato.textContent='Falar com a recepção';detalhes.append(contato);}
            }
            if(aula.motivoCancelamento)textoDetalhe('Motivo do cancelamento: '+aula.motivoCancelamento);
            const eventos=Array.isArray(aula.historico)?aula.historico:[],cancelamento=[...eventos].reverse().find(e=>e.status===2&&e.em);
            if(cancelamento)textoDetalhe('Cancelamento registrado em '+dataHoraBrasilia(cancelamento.em)+'.');
            if(eventos.length){const ul=document.createElement('ul');for(const evento of eventos){const li=document.createElement('li');li.textContent=(estado[evento.status]||'Atualização registrada')+(evento.em?' · '+dataHoraBrasilia(evento.em):'')+(evento.motivo?' · Motivo: '+evento.motivo:'');ul.append(li);}detalhes.append(ul);}else if(dados.integrado){const conteudo=document.createElement('p');conteudo.textContent='Abra para consultar o histórico.';detalhes.append(conteudo);detalhes.addEventListener('toggle',async()=>{if(!detalhes.open||detalhes.dataset.carregado)return;detalhes.dataset.carregado='true';conteudo.textContent='Consultando histórico…';try{const eventos=await servico.consultarHistorico(aula.id);conteudo.textContent=eventos.length?'':'Nenhuma alteração registrada.';for(const e of eventos){const p=document.createElement('p');p.textContent=(e.tipo?.descricao||'Atualização')+' · '+dataHoraBrasilia(e.quando)+(e.motivo?' · '+e.motivo:'');detalhes.append(p);}}catch{delete detalhes.dataset.carregado;conteudo.textContent='Não foi possível consultar o histórico. Feche e abra para tentar novamente.';}});}else textoDetalhe('Nenhuma alteração adicional registrada.');
            card.append(cabecalho,infos);
            // 17/11/2026 (pedido do usuário): a cancelada em cartão baixo (sem o bloco do local) e com quem cancelou e o motivo.
            if(aula.status===2){card.classList.add('local-lesson-cancelada');card.append(linhaDoCancelamento(aula));}
            // 17/11/2026 (pedido do usuário): a falta nunca volta para o saldo; o cartão diz isso.
            if(aula.status===6&&!aula.solicitacaoMedica){const p=document.createElement('p');p.className='local-lesson-falta-info';p.dataset.faltaInfo='';const t=document.createElement('strong');t.textContent='Falta registrada';p.append(t,document.createTextNode(' · Esta aula foi descontada do seu saldo e não é devolvida.'));card.append(p);}
            if(aula.solicitacaoMedica){
                const aviso=document.createElement('p');aviso.className='student-medical-state';aviso.dataset.medicalStatus=aula.solicitacaoMedica.status;
                aviso.append(document.createTextNode('Cancelamento por motivo médico · '),situacaoMedica(aula.solicitacaoMedica));
                const acompanhar=document.createElement('button');acompanhar.type='button';acompanhar.className='medical-follow-link';acompanhar.textContent='Acompanhar atestado';acompanhar.dataset.medicalFollow=aula.solicitacaoMedica.id;
                acompanhar.onclick=()=>{tabs.querySelector('[data-vista=atestados]').click();atestados.destacar(aula.solicitacaoMedica.id);};aviso.append(document.createTextNode(' '),acompanhar);card.append(aviso);
            }
            // Todas as abas usam o mesmo cartão: local com "Ver localização" e, no rodapé, detalhes à esquerda e ação à direita.
            const acoes=document.createElement('div'),local=localDaReserva(aula,false);local.classList.add('confirmed-lesson-location');acoes.className='confirmed-lesson-actions';card.append(...(aula.status===2?[]:[local]),acoes);acoes.append(detalhes);
            // 17/11/2026: a confirmada que já começou não mostra mais o "Cancelar aula" (ficava apagado, sem uso).
            if(aula.status===5&&avaliacao&&pendentesAvaliacao.has(aula.id)){
                const avaliar=document.createElement('button');avaliar.type='button';avaliar.className='local-lesson-avaliar';avaliar.dataset.avaliarAula=aula.id;avaliar.textContent='Avaliar minha aula';
                avaliar.onclick=()=>avaliacao.abrirAvaliacao(servico,pendentesAvaliacao.get(aula.id),{aoEnviar:()=>{pendentesAvaliacao.delete(aula.id);const ok=document.createElement('span');ok.className='local-lesson-avaliada';ok.textContent='✓ Aula avaliada';avaliar.replaceWith(ok);}});
                acoes.append(avaliar);
            }
            if([1,3,4].includes(aula.status)&&!horarioPassou){
                const cancelar=document.createElement('button');cancelar.type='button';cancelar.className='local-lesson-cancel';cancelar.textContent='Cancelar aula';cancelar.disabled=servico.capacidades?.cancelamento!==true||(aula.status===1&&!(Date.parse(aula.inicio)>Date.now()));
                if(cancelar.disabled)cancelar.title=servico.capacidades?.cancelamento!==true?'Cancelamento indisponível até a validação da política de créditos pelo serviço.':'A aula já foi iniciada.';
                cancelar.onclick=()=>abrirCancelamentoAlunoLocal(aula,dados,cancelar,async (motivo,opcoes)=>{await servico.cancelarReservaLocal(aula.id,motivo,opcoes);await listarAulasAlunoLocal(servico,await servico.dadosAlunoLocal());},servico);acoes.append(cancelar);
            }
            lista.append(card);
        }
    }
    const texto=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=v;};texto('total-lessons',String(futuras.length));texto('lessons-count',String(futuras.length));texto('past-lessons-count',String(passadas.length));texto('next-lesson-summary',futuras.length?dataHoraBrasilia(futuras[0].inicio):'Nenhuma aula agendada');
    if(vistaAnterior!=='confirmadas')tabs.querySelector('[data-vista='+vistaAnterior+']')?.click();
    montarFiltrosAulas(principal,anterior,{confirmadas,...grupos},tabs);
    const campo=document.querySelector('.lessons-summary .summary-card:last-child > div');if(campo){campo.querySelector('span').textContent='LOCAL DA PRÓXIMA AULA';campo.querySelector('strong').textContent=futuras.length?nomeLocalDaReserva(futuras[0]):'Nenhuma aula agendada';}

}

async function iniciarReservaAlunoLocal(servico, inicial) {
    const [{hojeBrasil,somarDias,diaSemana,formatarData},{motivoFechamento}] = await Promise.all([import('../../../shared/js/calendario.js'),import('../../../shared/js/disponibilidade.js')]);
    let dados=inicial,categoria=inicial.categorias?.length?inicial.categorias[0]:inicial.resumo.categorias.D?.total>0&&!inicial.resumo.categorias.B?.total&&!inicial.resumo.categorias.A?.total?'D':'B',data='',mes=hojeBrasil().slice(0,7)+'-01',ocupada=false,trocando=false,revisao=0,revisaoCalendario=0,ativa=null,operacaoId=crypto.randomUUID();
    let impedimentoConsulta='';
    const selecoes=new Map(),$=s=>document.querySelector(s),texto=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=v;};
    const botaoD=document.querySelector('.category-option[data-category=B]').cloneNode(true);botaoD.dataset.category='D';botaoD.querySelector('strong').textContent='Ônibus — Categoria D';botaoD.querySelector('.category-option-icon')?.remove();document.querySelector('.category-option[data-category=A]').after(botaoD);
    const contadorData=document.createElement('p');contadorData.className='time-selection-summary';contadorData.id='time-selection-summary';contadorData.hidden=true;contadorData.setAttribute('aria-live','polite');$('.time-area').append(contadorData);
    const unidade=$('#booking-unidade'),motorista=$('#motorista-select'),confirmar=$('#confirm-booking'),feedback=$('#booking-message');
    const chave=(dia,hora)=>[categoria,unidade.value,dia,hora].join('|');
    const ordenadas=()=>[...selecoes.values()].sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
    const alterar=()=>{operacaoId=crypto.randomUUID();};
    function mensagem(v){feedback.textContent=v;feedback.style.display='block';feedback.setAttribute('role','status');}
    // Fase 1: o aluno vê o que falta para agendar (validação da recepção, exames, teórica e LADV).
    if(dados.aluno?.pendenciasAgendamento?.length){mensagem('Agendamento bloqueado. Falta: '+dados.aluno.pendenciasAgendamento.join(', ')+'.');feedback.setAttribute('role','alert');feedback.dataset.bookingPendencias='';}
    else if(dados.aluno?.validadeContrato)feedback.title='Contrato válido até '+formatarData(dados.aluno.validadeContrato)+'.';
    unidade.replaceChildren(...UNIDADES_LOCAIS.map(u=>new Option(nomeUnidadeLocal(u),u)));
    const vinculo=normalizarUnidadeLocal(dados.aluno?.unidade);
    if(UNIDADES_LOCAIS.includes(vinculo))unidade.value=vinculo;
    else unidade.prepend(new Option('Selecione uma unidade','',true,true));
    let unidadeAtual=unidade.value;
    unidade.hidden=false;unidade.required=true;unidade.disabled=false;unidade.style.display='block';
    const campo=document.createElement('div');campo.className='booking-unit-local';const label=document.createElement('label');label.htmlFor=unidade.id;label.textContent='Unidade da aula';const enderecoSelecionado=document.createElement('div');enderecoSelecionado.id='booking-unit-address';enderecoSelecionado.setAttribute('aria-live','polite');campo.append(label,unidade,enderecoSelecionado);const enderecoResumo=document.createElement('div');enderecoResumo.id='summary-unit-address';$('#summary-unit').parentElement.append(enderecoResumo);$('#booking-unit-picker').replaceChildren(campo);
    confirmar.textContent='Confirmar agendamentos';
    $('.confirmation-card .booking-card-header h2').textContent='Revisão e confirmação';
    $('.booking-warning p').textContent='Após confirmar, as aulas válidas serão confirmadas e os créditos correspondentes serão utilizados.';
    function pintar(){document.querySelectorAll('#time-slots button:not([data-ocupado])').forEach(b=>{const selecionada=selecoes.has(chave(data,b.dataset.hora));b.classList.toggle('selected',selecionada);b.setAttribute('aria-pressed',String(selecionada));b.disabled=ocupada||!!impedimentoConsulta||(!selecionada&&selecoes.size>=(dados.resumo.categorias[categoria].disponiveis||0));});}
    // Horário ocupado por outro aluno: "Tenho interesse" avisa a Recepção quando ele vagar; nunca entra na reserva.
    // Só dá para remarcar aula que esteja a pelo menos o prazo de cancelamento da autoescola (prazoCancelamentoHorasUteis
    // da aula; 48 horas úteis no modo local): sem nenhuma aula posterior nesse prazo, o botão fica desabilitado (a API
    // confere de novo ao marcar). A API só manda horasUteisAteAula na aula confirmada; na aguardando aceite a conta é local.
    const prazoDaAula=a=>Number(a.api?.prazoCancelamentoHorasUteis)||POLITICA_CANCELAMENTO.minutosMinimos/60;
    const noPrazo=a=>a.horasUteisAteAula!=null?a.horasUteisAteAula>=prazoDaAula(a):calcularPrazoCancelamento(a,dados.registros,new Date(),{...POLITICA_CANCELAMENTO,minutosMinimos:prazoDaAula(a)*60}).dentroPrazo;
    // 10/11/2026: com saldo na categoria o interesse também vale (sem aula para antecipar): vira a espera por uma aula nova.
    const saldoNaCategoria=()=>Number(dados.resumo?.categorias?.[categoria]?.disponiveis)||0;
    const semAulaNoPrazo=()=>'Você não tem saldo de aulas nem aula que possa ser remarcada (só dá para remarcar aulas com '+prazoDaAula(dados.aulas.find(a=>a.api)||{})+' horas úteis de antecedência).';
    const temAulaParaAntecipar=hora=>dados.aulas.some(a=>a.categoria===categoria&&[1,3].includes(a.status)&&Date.parse(a.inicio)>Date.parse(data+'T'+hora+':00-03:00')&&noPrazo(a));
    function botaoInteresse(h){
        const b=document.createElement('button'),hora=document.createElement('span'),rotulo=document.createElement('small'),marcado=!!h.interesseId;
        b.type='button';b.className='time-slot unavailable time-slot-interesse';b.dataset.hora=h.hora;b.dataset.ocupado='';b.setAttribute('aria-pressed',String(marcado));
        hora.textContent=h.hora;rotulo.textContent=marcado?'Interesse marcado ✓':'Ocupado · Tenho interesse';b.append(hora,rotulo);b.setAttribute('aria-label',h.hora+' · '+rotulo.textContent);
        const antecipa=temAulaParaAntecipar(h.hora);
        b.disabled=!marcado&&!antecipa&&!saldoNaCategoria();b.title=b.disabled?semAulaNoPrazo():marcado?'Clique para desmarcar o interesse.':antecipa?'A recepção avisa você se este horário vagar.':'A recepção avisa você se este horário vagar, para marcar a aula com o seu saldo.';
        b.onclick=async()=>{
            if(ocupada||b.disabled)return;b.disabled=true;
            try{
                if(marcado){await servico.desmarcarInteresse(h.interesseId);mensagem('Interesse desmarcado.');}
                else{await servico.marcarInteresse({categoria,data,hora:h.hora});mensagem('Interesse marcado. Se o horário vagar, você recebe a oferta em Mensagens.');}
                await horarios();
            }catch(e){mensagem(e.message||'Não foi possível registrar o interesse.');feedback.setAttribute('role','alert');b.disabled=false;}
        };
        return b;
    }
    // A seleção local usa apenas pares devolvidos pelo serviço, sem liberar recursos por conta própria.
    motorista.closest('.instructor-preview').hidden=true;
    function recursos(){}
    async function escolherRecursos(item,origem){
        const itens=Array.isArray(item)?item:[item],emLote=itens.length>1;item=itens[0];
        if(!item)return;
        const d=document.createElement('dialog');d.className='booking-local-dialog booking-resource-dialog';d.setAttribute('aria-labelledby','resource-dialog-title');
        d.innerHTML='<h2 id="resource-dialog-title">Escolha o instrutor</h2><p data-contexto></p><h3>Instrutores disponíveis</h3><div data-instrutores class="resource-options"></div><h3 hidden>Veículo</h3><div data-veiculos class="resource-options" hidden></div><p data-erro role="status"></p><div class="booking-dialog-actions"><button type="button" data-confirmar disabled>Confirmar seleção</button><button type="button" data-cancelar>Cancelar</button></div>';
        d.querySelector('[data-contexto]').textContent='Categoria '+categoria+' · '+nomeLocalDaReserva({categoria,data:item.data,unidade:unidade.value})+' · '+formatarData(item.data)+' · '+item.hora+' às '+item.fim;
        if(emLote){d.querySelector('h2').textContent='Instrutor para todas as aulas';d.querySelector('[data-contexto]').textContent=itens.length+' aulas · Categoria '+categoria+' · '+(categoria==='D'?'Locais indicados por aula':nomeUnidadeLocal(unidade.value));const lista=document.createElement('ul');lista.className='booking-batch-dates';for(const i of itens){const li=document.createElement('li');li.textContent=formatarData(i.data)+' · '+i.hora+' às '+i.fim+' · '+nomeLocalDaReserva({categoria,data:i.data,unidade:unidade.value});lista.append(li);}d.querySelector('[data-contexto]').after(lista);}
        let pares=[],paresPorAula=[],instrutor=item.par?.instrutorId,veiculo=item.par?.veiculoId;
        const ok=d.querySelector('[data-confirmar]'),erro=d.querySelector('[data-erro]');
        // Placa apenas visual do laboratório; não altera o documento nem o cadastro persistido.
        function placaVisual(registro){return registro?.documento?'Placa: '+registro.documento:'Placa não informada';}
        // O tipo do carro de cada opção, vindo dos pares da consulta: "Carro manual" ou "Carro automático".
        function tipoDoCarro(lista){return [...new Set(lista.map(p=>p.tipoCambio).filter(Boolean))].map(t=>'Carro '+nomeCambio(t).toLowerCase()).join(' e ');}
        function opcoes(tipo,ids,atual,selecionar){const lista=d.querySelector('[data-'+tipo+']');lista.replaceChildren();for(const id of new Set(ids)){const r=dados.registros.find(r=>r.id===id),b=document.createElement('button');b.type='button';b.dataset.recurso=id;b.setAttribute('aria-pressed',String(id===atual));const nome=document.createElement('strong'),info=document.createElement('span');nome.textContent=r?.nome||id;const carro=categoria==='B'?tipoDoCarro(pares.filter(p=>tipo==='veiculos'?p.veiculoId===id:p.instrutorId===id)):'';info.textContent=tipo==='veiculos'?[carro,placaVisual(r)].filter(Boolean).join(' · '):[nomeUnidadeLocal(unidade.value),'Categoria '+categoria,carro||'Disponível nesta consulta'].join(' · ');b.append(nome,info);b.onclick=()=>selecionar(id);lista.append(b);}}
        // 13/11/2026: o aluno escolhe só o instrutor; o veículo é o do instrutor neste horário (o primeiro par livre dele).
        function pintarModal(){const doInstrutor=pares.filter(p=>p.instrutorId===instrutor);if(instrutor&&!doInstrutor.some(p=>p.veiculoId===veiculo))veiculo=doInstrutor[0]?.veiculoId??null;
            opcoes('instrutores',pares.map(p=>p.instrutorId),instrutor,id=>{instrutor=id;veiculo=null;pintarModal();});opcoes('veiculos',doInstrutor.map(p=>p.veiculoId),veiculo,id=>{veiculo=id;pintarModal();});ok.disabled=!pares.some(p=>p.instrutorId===instrutor&&p.veiculoId===veiculo);}
        async function consultar(){
            const consultas=await Promise.all(itens.map(i=>servico.consultarRecursosLocal({categoria,data:i.data,unidade:unidade.value})));
            paresPorAula=consultas.map((c,n)=>c.horarios.find(h=>h.hora===itens[n].hora)?.pares||[]);
            // A seleção em lote exige o mesmo par válido em cada aula; nada é aplicado parcialmente.
            pares=paresPorAula[0].filter(p=>paresPorAula.every(lista=>lista.some(q=>q.instrutorId===p.instrutorId&&q.veiculoId===p.veiculoId)));
            const semRecursos=itens.filter((i,n)=>!paresPorAula[n].length);
            erro.textContent=pares.length?'':emLote?(semRecursos.length?'Recursos indisponíveis em: '+semRecursos.map(i=>formatarData(i.data)+' às '+i.hora).join('; ')+'. Nenhuma escolha foi alterada.':'Não há um mesmo instrutor disponível para todas as aulas. Configure as aulas individualmente. Nenhuma escolha foi alterada.'):(consultas[0].mensagem||'Recursos indisponíveis neste horário.');
            pintarModal();
        }
        d.querySelector('[data-cancelar]').onclick=()=>d.close();
        ok.onclick=async()=>{ok.disabled=true;try{await consultar();if(!pares.some(p=>p.instrutorId===instrutor&&p.veiculoId===veiculo)){if(pares.length)erro.textContent='A disponibilidade mudou. Escolha o instrutor novamente.';return;}itens.forEach((i,n)=>{i.pares=paresPorAula[n];i.par={instrutorId:instrutor,veiculoId:veiculo};});alterar();resumo();d.close();}catch(e){erro.textContent=e.message;}};
        d.addEventListener('close',()=>{d.remove();(origem.isConnected?origem:document.querySelector('#summary-lessons button'))?.focus();},{once:true});document.body.append(d);d.showModal();
        try{await consultar();d.querySelector('[data-instrutores] button')?.focus();}catch(e){erro.textContent=e.message;}
    }
    function resumo(){
        $('#booking-unit-picker').hidden=categoria==='A';
        if(categoria==='D'||categoria==='A'){unidade.value=categoria==='D'?'Cobilândia':'Vila Velha';unidade.disabled=true;}else{unidade.value=normalizarUnidadeLocal(dados.aluno?.unidadeCarro||dados.aluno?.unidade);unidade.disabled=true;}
        const saldo=dados.resumo.categorias[categoria];texto('summary-category',(NOMES_CATEGORIA[categoria])+' · Categoria '+categoria);texto('summary-unit',['B','D'].includes(categoria)?(selecoes.size>1?'Local indicado em cada aula':nomeLocalDaReserva({categoria,data:ordenadas()[0]?.data||data,unidade:unidade.value})):unidade.value?nomeUnidadeLocal(unidade.value):'Selecione uma unidade');$('#summary-unit').parentElement.querySelector('span').textContent=['B','D'].includes(categoria)?'LOCAL DA AULA':'UNIDADE';label.textContent=['B','D'].includes(categoria)?'Local da aula':'Unidade da aula';if(['B','D'].includes(categoria))unidade.selectedOptions[0].textContent=nomeLocalDaReserva({categoria,data,unidade:unidade.value});else for(const o of unidade.options)o.textContent=nomeUnidadeLocal(o.value);
        contadorData.hidden=!data;contadorData.textContent=[...selecoes.values()].filter(i=>i.data===data).length+' selecionada(s) nesta data · '+selecoes.size+' no total';
        texto('selected-lessons-count',String(selecoes.size));texto('booking-package-info','Saldo disponível: '+(saldo.disponiveis??'a conferir')+' aulas');
        // 17/11/2026 (pedido do usuário): com reposição por atestado autorizada na categoria, a próxima aula agendada vira a
        // reposição; o aluno vê o aviso aqui.
        {const letra=c=>{const s=String(c||'').trim();return ['A','B','D'].includes(s)?s:s.startsWith('Moto')?'A':s.startsWith('Carro')?'B':s.startsWith('Ô')||s.startsWith('O')?'D':s.slice(-1);};const n=(dados.aluno?.reposicoes||[]).filter(r=>!r.aulaReposicaoId&&letra(r.categoria)===categoria).length;const base=document.getElementById('booking-package-info');let aviso=document.getElementById('booking-reposicao-aviso');if(!aviso&&base){aviso=document.createElement('p');aviso.id='booking-reposicao-aviso';aviso.className='booking-reposicao-aviso';base.closest('.booking-balance-main')?.after(aviso);}if(aviso){aviso.hidden=!n;aviso.textContent=n?(n===1?'Você tem 1 aula de reposição por atestado. A próxima aula que agendar nesta categoria será a reposição.':'Você tem '+n+' aulas de reposição por atestado. As próximas '+n+' aulas que agendar nesta categoria serão as reposições.'):'';}}
        const reservaLocal={categoria,data,unidade:unidade.value};enderecoSelecionado.replaceChildren(...(unidade.value?[localDaReserva(reservaLocal)]:[]));enderecoResumo.replaceChildren(...(unidade.value&&!(['B','D'].includes(categoria)&&selecoes.size>1)?[localDaReserva({...reservaLocal,data:ordenadas()[0]?.data||data},false)]:[]));
        const lista=$('#summary-lessons');lista.replaceChildren();
        if(!selecoes.size){const li=document.createElement('li');li.textContent='Selecione horários em uma ou mais datas. Clique novamente para desmarcar.';lista.append(li);}
        for(const item of ordenadas()){
            const li=document.createElement('li');li.className='booking-pending-row';li.dataset.selecao=item.chave;
            const info=document.createElement('div'),titulo=document.createElement('strong'),detalhe=document.createElement('span');titulo.textContent=formatarData(item.data)+' · '+item.hora+' às '+item.fim+' · Categoria '+categoria;
            detalhe.textContent=nomeLocalDaReserva({categoria,data:item.data,unidade:unidade.value})+' · '+(item.par?'Instrutor: '+(dados.registros.find(r=>r.id===item.par.instrutorId)?.nome||'Não informado'):'Escolha o instrutor para esta aula');
            if(categoria==='D'){
                titulo.textContent=formatarData(item.data)+' · '+item.hora+' às '+item.fim+' · Ônibus — Categoria D';
                detalhe.textContent='Local: '+nomeLocalDaReserva({categoria,data:item.data,unidade:unidade.value})+' · '+(item.par?'Instrutor: '+(dados.registros.find(r=>r.id===item.par.instrutorId)?.nome||'Não informado'):item.pares.length?'Escolha o instrutor para esta aula':'Não há recursos disponíveis para este horário. Remova a aula ou consulte outra data.');
            }
            info.append(titulo,detalhe);
            const editar=document.createElement('button');editar.type='button';editar.textContent='Selecionar instrutor';editar.disabled=ocupada;editar.onclick=()=>{if(!ocupada)escolherRecursos(item,editar);};
            const remover=document.createElement('button');remover.type='button';remover.textContent='Remover';remover.setAttribute('aria-label','Remover aula de '+formatarData(item.data)+' às '+item.hora);remover.disabled=ocupada;remover.onclick=()=>{if(ocupada)return;selecoes.delete(item.chave);if(ativa===item.chave)ativa=null;alterar();pintar();recursos();resumo();};li.append(info);if(!(categoria==='D'&&item.automatico&&item.par)){editar.disabled=ocupada||(categoria==='D'&&!item.pares.length);li.append(editar);}li.append(remover);lista.append(li);
        }
        document.getElementById('booking-batch-resources')?.remove();
        if(selecoes.size>=2&&!(categoria==='D'&&ordenadas().every(i=>i.automatico&&i.par))){const aplicar=document.createElement('button');aplicar.type='button';aplicar.id='booking-batch-resources';aplicar.className='booking-batch-action';aplicar.textContent='Aplicar o mesmo instrutor em todas as aulas';aplicar.disabled=ocupada;aplicar.onclick=()=>{if(!ocupada)escolherRecursos(ordenadas(),aplicar);};lista.after(aplicar);}
        confirmar.disabled=ocupada||!!impedimentoConsulta||!selecoes.size||!unidade.value||!dados.aluno||!(saldo.disponiveis>=selecoes.size)||ordenadas().some(i=>!i.par);
        unidade.disabled=true;
        document.querySelectorAll('.category-option').forEach(b=>{b.hidden=dados.categorias?.length?!dados.categorias.includes(b.dataset.category):b.dataset.category==='D'&&!(dados.resumo.categorias.D?.total>0);b.disabled=ocupada||!(dados.resumo.categorias[b.dataset.category]?.disponiveis>0);b.classList.toggle('selected',b.dataset.category===categoria);b.setAttribute('aria-pressed',String(b.dataset.category===categoria));b.querySelector('.category-option-info span').textContent=(dados.resumo.categorias[b.dataset.category].disponiveis??'A conferir')+' aulas disponíveis';});
        pintar();
    }
    async function horarios(){
        const versao=++revisao;texto('selected-date-label',data?formatarData(data):'Selecione uma data');$('#time-slots').replaceChildren();
        let consulta;try{consulta=await servico.consultarRecursosLocal({categoria,data,unidade:unidade.value});}catch(e){if(versao===revisao)mensagem('Não foi possível consultar os horários: '+e.message);return;}
        if(versao!==revisao)return;
        impedimentoConsulta=consulta.permiteAgendar===false?(consulta.motivoElegibilidade||consulta.mensagem):'';
        const lista=$('#time-slots');
        if(impedimentoConsulta){const aviso=document.createElement('p');aviso.className='sipa-local-empty';aviso.dataset.bookingElegibilidade='';aviso.setAttribute('role','status');aviso.textContent=impedimentoConsulta;lista.append(aviso);}
        
        if(!consulta.horarios.length&&(data||!consulta.contagem.instrutores||!consulta.contagem.veiculos)){const p=document.createElement('p');p.className='sipa-local-empty';p.textContent=consulta.mensagem;lista.append(p);}
        else if(!data){const vazio=document.createElement('div');vazio.className='empty-time-state';vazio.innerHTML='<svg class="booking-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><p>Escolha uma data no calendário para consultar os horários.</p>';lista.append(vazio);}
        // 16/11/2026 (pedido do usuário): todos os horários do dia aparecem; o que não está livre fica riscado e mais escuro
        // ("Ocupado"), sem o "Tenho interesse".
        const livresDoDia=new Map(consulta.horarios.filter(h=>!h.ocupado).map(h=>[h.hora,h]));
        const grade=data&&consulta.horarios.length?(new Date(data+'T12:00:00Z').getUTCDay()===6?GRADE_CENTRO.sabado:new Date(data+'T12:00:00Z').getUTCDay()===0?[]:GRADE_CENTRO.semana).map(n=>String(n).padStart(2,'0')+':00'):[];
        const todas=[...new Set([...grade,...consulta.horarios.map(h=>h.hora)])].sort();
        const nLivres=livresDoDia.size,nOcupados=todas.length-nLivres;$('.availability-status').hidden=!data;$('.availability-status').textContent=data?(nLivres+(nLivres===1?' livre':' livres')+(nOcupados?' · '+nOcupados+(nOcupados===1?' ocupado':' ocupados'):'')+(impedimentoConsulta?' · somente consulta':'')):'';
        for(const hora of todas){
            const h=livresDoDia.get(hora);
            if(!h){const o=document.createElement('button');o.type='button';o.className='time-slot unavailable time-slot-ocupado';o.disabled=true;o.dataset.hora=hora;o.dataset.ocupado='';
             const t=document.createElement('span');t.textContent=hora;const r=document.createElement('small');r.textContent='Ocupado';o.append(t,r);o.setAttribute('aria-label',hora+' · ocupado');lista.append(o);continue;}
            const b=document.createElement('button');b.type='button';b.className='time-slot';b.textContent=h.hora;b.dataset.hora=h.hora;
            b.title=impedimentoConsulta;
            b.onclick=()=>{
                if(ocupada||impedimentoConsulta)return;const id=chave(data,h.hora);
                if(selecoes.has(id)){selecoes.delete(id);if(ativa===id)ativa=null;}
                else{if(selecoes.size>=(dados.resumo.categorias[categoria].disponiveis||0)){mensagem('O número de escolhas atingiu os créditos disponíveis desta categoria.');return;}if(categoria==='D'&&!h.pares?.length){mensagem('Não há instrutor e ônibus disponíveis para este horário. Consulte novamente a data.');return;}const par=parAutomaticoCategoriaD(categoria,h.pares);selecoes.set(id,{chave:id,data,hora:h.hora,fim:h.fim,pares:h.pares,par,automatico:!!par});ativa=id;}
                alterar();recursos();resumo();
            };lista.append(b);
        }
        if(!selecoes.has(ativa)||selecoes.get(ativa).data!==data)ativa=ordenadas().find(i=>i.data===data)?.chave||null;
        for(const item of selecoes.values())if(item.data===data){
            const atual=consulta.horarios.find(h=>h.hora===item.hora);item.pares=atual?.pares||[];
            const automatico=parAutomaticoCategoriaD(categoria,item.pares);
            if(automatico){if(item.par?.instrutorId!==automatico.instrutorId||item.par?.veiculoId!==automatico.veiculoId)alterar();item.par=automatico;item.automatico=true;}
            else{item.automatico=false;if(item.par&&!item.pares.some(p=>p.instrutorId===item.par.instrutorId&&p.veiculoId===item.par.veiculoId)){item.par=null;alterar();}}
        }
        recursos();resumo();
    }
    async function calendario() {
        const versao = ++revisaoCalendario;
        const grade = $("#calendar-days"); grade.replaceChildren();
        texto("calendar-month", new Date(`${mes}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }));
        // Só os dias do mês; as casas antes do dia 1 ficam vazias, para o dia cair na coluna certa.
        const hoje = hojeBrasil(), [anoExibido, mesExibido] = mes.split('-').map(Number), diasNoMes = new Date(Date.UTC(anoExibido, mesExibido, 0)).getUTCDate();
        // Mesmas fontes de bloqueio integral consultadas por calcularHorariosLocais.
        const recursosDaUnidade = dados.registros.filter(r => ["instrutor", "veiculo"].includes(r.tipo) && (categoria==='D'?recursoCategoriaD(r):normalizarUnidadeLocal(r.unidade) === normalizarUnidadeLocal(unidade.value)));
        const fechamentoCadastrado = iso => recursosDaUnidade.some(r => (r.feriadosUnidade || []).includes(iso))
            ? "Feriado cadastrado da unidade" : recursosDaUnidade.some(r => (r.bloqueiosUnidade || []).some(b => b.data === iso && !b.inicio))
                ? "Bloqueio integral cadastrado da unidade" : "";
        const dias = await Promise.all(Array.from({ length: diasNoMes }, async (_, i) => {
            const iso = somarDias(mes, i), passado = iso < hoje, fechado = (dados.aluno?.pendenciasAgendamento?.length ? "Agendamento bloqueado: etapas pendentes" : "") || motivoFechamento(iso) || fechamentoCadastrado(iso) || (!passado && await servico.motivoFechamentoDoDia?.({ categoria, data: iso })) || "";
            const livres = fechado || passado ? [] : await servico.disponibilidadeLocal({ categoria, data: iso, unidade: unidade.value });
            const b = document.createElement("button"); b.type = "button"; b.textContent = String(Number(iso.slice(-2))); b.dataset.dataLocal = iso;
            b.disabled = !!fechado || passado; b.className = "calendar-day"; b.classList.toggle("selected", iso === data); b.classList.toggle("sem-disponibilidade", !livres.length); b.dataset.disponivel = String(livres.length > 0 && dados.resumo.categorias[categoria].disponiveis > 0);
            // Apresentação dos bloqueios existentes; não cria novas restrições.
            const motivos = [passado && "Data passada", fechado].filter(Boolean);
            const bloqueado = passado || !!fechado;
            b.classList.toggle("calendar-blocked", bloqueado);
            if (bloqueado) {
            const numero = document.createElement("span"); numero.className = "calendar-day-number";
            numero.textContent = b.textContent; b.replaceChildren(numero);
                const x = document.createElement("span"); x.className = "calendar-block-mark";
                x.textContent = ""; x.setAttribute("aria-hidden", "true"); b.append(x);
            }
            const descricao = motivos.length ? motivos.join(" · ") + " · agendamento indisponível"
                : livres.length ? "Disponível para consulta" : "Sem horários com recursos disponíveis · consulte outra data ou unidade";
            b.title = formatarData(iso) + " · " + descricao;
            b.setAttribute("aria-label", b.title);
            b.setAttribute("aria-pressed", String(iso === data));
            if (iso === hoje) b.setAttribute("aria-current", "date");
            b.onclick = async () => {
                if (ocupada || b.disabled) return;
                data = iso;
                grade.querySelectorAll("button").forEach(n => {
                    n.classList.toggle("selected", n === b); n.setAttribute("aria-pressed", String(n === b));
                });
                await horarios();
            };
            return b;
        })); if (versao === revisaoCalendario) {
            const vazios = Array.from({ length: diaSemana(mes) }, () => { const v = document.createElement("span"); v.className = "calendar-day-vazio"; v.setAttribute("aria-hidden", "true"); return v; });
            grade.replaceChildren(...vazios, ...dias);
            const lista = document.getElementById("calendar-block-reasons");
            if (lista) lista.replaceChildren(...dias.filter(b => b.disabled).map(b => {
                const item = document.createElement("li"); item.textContent = b.title; return item;
            }));
        }
    }
    document.querySelectorAll('.category-option').forEach(b=>{b.removeAttribute('title');b.onclick=async()=>{
        if(ocupada||trocando||categoria===b.dataset.category)return;trocando=true;
        let continuar=true;try{if(selecoes.size)continuar=await confirmarDescarteLocal();}finally{trocando=false;}
        if(!continuar)return;selecoes.clear();ativa=null;alterar();++revisao;categoria=b.dataset.category;data='';$('#time-slots').replaceChildren();recursos();resumo();await calendario();await horarios();
    };});
    for(const [id,delta] of [['previous-month',-1],['next-month',1]]){const b=document.getElementById(id);b.disabled=false;b.onclick=async()=>{if(ocupada)return;const d=new Date(mes+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);if(d.getUTCFullYear()<1900||d.getUTCFullYear()>9998)return;mes=d.toISOString().slice(0,10);await calendario();};}
    motorista.onchange=()=>{if(ocupada)return;const item=selecoes.get(ativa);if(!item)return;item.par=motorista.value===''?null:item.pares[Number(motorista.value)]||null;alterar();recursos();resumo();};
    unidade.onchange=async()=>{
        const nova=unidade.value;unidade.value=unidadeAtual;if(ocupada||trocando||nova===unidadeAtual)return;trocando=true;
        let continuar=true;try{if(selecoes.size)continuar=await confirmarDescarteLocal();}finally{trocando=false;}
        if(!continuar)return;selecoes.clear();ativa=null;alterar();++revisao;unidadeAtual=nova;unidade.value=nova;data='';feedback.style.display='none';$('#time-slots').replaceChildren();recursos();resumo();await calendario();await horarios();
    };
    confirmar.onclick=async()=>{
        if(confirmar.disabled||ocupada)return;ocupada=true;resumo();recursos();
        try{
            const pedido={categoria,unidade:unidade.value,operacaoId,aulas:ordenadas().map(i=>({data:i.data,hora:i.hora,...i.par}))};
            const salvas=await servico.reservarAulasLocais(pedido);
            dados=await servico.dadosAlunoLocal();selecoes.clear();ativa=null;alterar();
            mensagem((salvas.length===1?'Agendamento confirmado!':'Agendamentos confirmados!')+' '+salvas.length+' aula(s) de '+(NOMES_CATEGORIA[salvas[0].categoria].toLocaleLowerCase('pt-BR'))+' · locais indicados na confirmação'+' · Categoria '+salvas[0].categoria+'. Confirmadas.');
            mostrarConfirmacaoAulasLocais(salvas,dados,confirmar);
            try { await calendario(); await horarios(); }
            catch { mensagem('As aulas foram salvas. Não foi possível atualizar o calendário; consulte Minhas aulas ou recarregue a página.'); }
        }catch(e){try{dados=await servico.dadosAlunoLocal();if(categoria==='D')await horarios();}catch{}mensagem(e.message||'Não foi possível gravar as aulas.');feedback.setAttribute('role','alert');feedback.tabIndex=-1;mostrarErroAgendamento(e.message||'Não foi possível gravar as aulas.',confirmar);}
        finally{ocupada=false;recursos();resumo();}
    };
    $('.availability-status').hidden=true;$('.availability-status').textContent='';
    window.addEventListener('sipa-recursos-atualizados',async()=>{++revisao;dados=await servico.dadosAlunoLocal();resumo();await calendario();await horarios();});
    resumo();await calendario();await horarios();
    await montarAgendamentoAutomatico(servico,async(aulas,origem)=>{
        dados=await servico.dadosAlunoLocal();selecoes.clear();ativa=null;alterar();
        mostrarConfirmacaoAulasLocais(aulas,dados,origem);
        await calendario();await horarios();recursos();resumo();
    });
}

async function confirmarDescarteLocal(){
    return new Promise(resolve=>{
        const d=document.createElement('dialog');d.className='booking-local-dialog';
        d.innerHTML='<h2>Descartar aulas selecionadas?</h2><p>Trocar categoria ou unidade remove as escolhas pendentes. Nenhum crédito foi utilizado.</p><div class="booking-dialog-actions"><button type="button" data-manter autofocus>Manter seleção</button><button type="button" data-descartar>Descartar e continuar</button></div>';
        d.setAttribute('aria-label','Descartar aulas selecionadas');let descartar=false;d.querySelector('[data-manter]').onclick=()=>d.close();d.querySelector('[data-descartar]').onclick=()=>{descartar=true;d.close();};d.addEventListener('close',()=>{d.remove();resolve(descartar);},{once:true});document.body.append(d);d.showModal();
    });
}
function mostrarConfirmacaoAulasLocais(aulas,dados,origem){
    const d=document.createElement('dialog');d.id='agendamentos-confirmados';d.className='booking-local-dialog booking-result-success';d.setAttribute('aria-labelledby','booking-success-title');
    const icone=document.createElementNS('http://www.w3.org/2000/svg','svg');icone.setAttribute('viewBox','0 0 24 24');icone.setAttribute('aria-hidden','true');icone.classList.add('booking-success-icon');icone.innerHTML='<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>';
    const titulo=document.createElement('h2');titulo.id='booking-success-title';titulo.textContent=aulas.length===1?'Agendamento confirmado!':'Agendamentos confirmados!';
    const descricao=document.createElement('p'),c=aulas[0].categoria;descricao.textContent='Suas aulas foram agendadas com sucesso.';
    const lista=document.createElement('ul');lista.className='booking-success-list';
    for(const [i,a] of aulas.entries()){const li=document.createElement('li'),titulo=document.createElement('h3'),campos=document.createElement('dl');titulo.textContent='Aula '+String(i+1).padStart(2,'0')+' — '+(NOMES_CATEGORIA[a.categoria])+' | Categoria '+a.categoria;
        for(const [label,valor] of [['Data',dataBrasilia(a.inicio)],['Horário',horaBrasilia(a.inicio)+' às '+horaBrasilia(a.fim)],['Local',a.categoria==='A'?'KM Centro':localDaReservaOperacional(a)?.nome||nomeUnidadeLocal(a.unidade)],['Endereço',localDaReservaOperacional(a)?.endereco||obterUnidadeInstitucional(a.unidade)?.enderecoCompleto||'Não informado'],['Instrutor',dados.registros.find(r=>r.id===a.instrutor)?.nome||'Não informado'],['Veículo',dados.registros.find(r=>r.id===a.veiculo)?.nome||'Não informado'],['Situação',a.status===1?'Confirmada':'Situação registrada: '+a.status]]){const campo=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=valor;if(label==='Endereço')campo.className='booking-success-address';campo.append(dt,dd);campos.append(campo);}li.append(titulo,campos);const mapa=linkLocalizacaoReserva(a);if(mapa)li.append(mapa);lista.append(li);}
    const saldo=document.createElement('p');saldo.textContent='Total de aulas confirmadas: '+aulas.length+' · Créditos utilizados: '+aulas.length+' · Créditos restantes: '+(dados.resumo.categorias[c].disponiveis??'a conferir');
    const acoes=document.createElement('div');acoes.className='booking-dialog-actions';const ver=document.createElement('a');ver.href='minhas-aulas.html';ver.textContent='Ver minhas aulas';const mais=document.createElement('button');mais.type='button';mais.textContent='Agendar mais aulas';mais.autofocus=true;mais.onclick=()=>d.close();const fechar=document.createElement('button');fechar.type='button';fechar.textContent='Fechar';fechar.onclick=()=>d.close();acoes.append(ver,mais,fechar);d.append(icone,titulo,descricao,lista,saldo,acoes);
    d.addEventListener('close',()=>{d.remove();(origem.disabled?document.querySelector('.category-option.selected'):origem)?.focus();},{once:true});document.body.append(d);d.showModal();
}

function mostrarErroAgendamento(mensagem,origem){
 const d=document.createElement('dialog');d.className='booking-local-dialog booking-result-error';d.setAttribute('role','alertdialog');d.setAttribute('aria-labelledby','booking-error-title');
 const h=document.createElement('h2');h.id='booking-error-title';h.textContent='Não foi possível agendar';const p=document.createElement('p');p.textContent=mensagem;
 const fechar=document.createElement('button');fechar.type='button';fechar.textContent='Voltar e revisar';fechar.onclick=()=>d.close();d.append(h,p,fechar);d.addEventListener('close',()=>{d.remove();origem?.focus();},{once:true});document.body.append(d);d.showModal();fechar.focus();
}
