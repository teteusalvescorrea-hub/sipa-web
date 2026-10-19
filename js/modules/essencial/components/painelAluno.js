import {localDaAula,linkLocalizacaoUnidade,orientacoesComparecimento} from './localAula.js';
import {calcularPrazoCancelamento,identificarMotivo} from '../service/agendamentoAluno.js';
import {montarAgendamentoAutomatico,montarAntecipacaoAluno} from './preferenciasAluno.js';
import {obterUnidadeInstitucional} from '../../unidades/catalogoUnidades.js';
import {formatarCpf} from '../utils/formatacao.js';
import {MOTIVOS_CANCELAMENTO_LOCAL,UNIDADES_LOCAIS,normalizarUnidadeLocal,nomeUnidadeLocal} from '../service/dominioAluno.js';
export {preencherProgressoAlunoLocal as apresentarProgresso,preencherDadosAlunoLocal as apresentarPerfil,listarAulasAlunoLocal as apresentarAulas,iniciarReservaAlunoLocal as apresentarAgendamento,montarSenhaPerfilLocal as montarAlteracaoSenha};
function preencherProgressoAlunoLocal(dados){
    const resumo=dados.resumo,overview=document.querySelector('.progress-overview');overview.replaceChildren();
    for(const categoria of ['A','B']){
        const c=resumo.categorias[categoria],card=document.createElement('article');card.className='progress-card category-progress-card';card.dataset.categoriaProgresso=categoria;
        const h=document.createElement('h2');h.textContent=(categoria==='A'?'Moto':'Carro')+' — Categoria '+categoria;const dl=document.createElement('dl');
        for(const [campo,label,valor] of [['contratadas','Aulas contratadas',c.total??'—'],['disponiveis','Aulas disponíveis',c.disponiveis??'—'],['agendadas','Aulas agendadas',c.reservadas??'—'],['concluidas','Aulas concluídas',c.realizadas??'—']]){const div=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=String(valor);dd.dataset.metrica=campo;div.append(dt,dd);dl.append(div);}card.append(h,dl);overview.append(card);
    }
    const detalhes=document.querySelector('.progress-details');detalhes.replaceChildren();const vinculo=document.createElement('p');vinculo.className='progress-link-unit';vinculo.textContent='Unidade de vínculo: '+nomeUnidadeLocal(dados.aluno?.unidade)+'. As aulas podem ocorrer em outras unidades.';detalhes.append(vinculo);
    const evolucao=document.querySelector('.progress-bar-section');evolucao.replaceChildren();
    for(const categoria of ['B','A']){const c=resumo.categorias[categoria],card=document.createElement('article');card.className='category-evolution';card.dataset.evolucao=categoria;const h=document.createElement('h2');h.textContent='Seu avanço nas aulas de '+(categoria==='B'?'carro':'moto');const rotulo=document.createElement('p');rotulo.textContent='Categoria '+categoria+' · '+(c.realizadas??'—')+' de '+(c.total??'total não informado')+' aulas concluídas';const percentual=document.createElement('strong');percentual.textContent=c.percentual==null?(c.total==null?'Divisão por categoria não informada':c.total?'Ainda não iniciado':'Sem contratação informada'):c.percentual+'%';percentual.dataset.percentual=categoria;
        const barra=document.createElement('div');barra.className='category-progress-track';barra.setAttribute('role','progressbar');barra.setAttribute('aria-label','Evolução da Categoria '+categoria);barra.setAttribute('aria-valuemin','0');barra.setAttribute('aria-valuemax','100');if(c.percentual!=null)barra.setAttribute('aria-valuenow',String(c.percentual));barra.setAttribute('aria-valuetext',percentual.textContent);const fill=document.createElement('span');fill.style.width=(c.percentual??0)+'%';barra.append(fill);card.append(h,rotulo,percentual,barra);evolucao.append(card);
    }
    document.querySelector('#progress-packages').closest('.progress-details').hidden=true;
}

function preencherDadosAlunoLocal(dados) {
    const { aluno, resumo, credito } = dados;
    const texto = (id, valor) => { const n = document.getElementById(id); if (n) n.textContent = valor; };
    const disponiveis = Object.values(resumo.categorias).reduce((s, c) => s + (c.disponiveis || 0), 0), reservadas = Object.values(resumo.categorias).reduce((s, c) => s + c.reservadas, 0);
    const categorias = (aluno?.categoriasFormacao||[]).map(c=>({1:'A',2:'B'})[c.valor]).filter(Boolean).join(' e ');
    for (const id of ["profile-name", "profile-full-name"]) texto(id, aluno?.nome || "Cadastro ainda não vinculado");
    texto("profile-avatar", aluno?.nome?.charAt(0) || "—"); texto("profile-cpf", formatarCpf(aluno?.documento));
    texto("profile-email", aluno?.email || "Não cadastrado"); texto("profile-phone", aluno?.telefone || "Não cadastrado");
    for (const id of ["profile-category", "profile-course-category", "student-category"]) texto(id, categorias || "Não informadas");
    for (const id of ["profile-school", "student-school"]) texto(id, aluno?.unidade || "Não informada");
    const vinculo = document.getElementById("profile-school");
    if (vinculo) {
        const informado = aluno?.unidade && aluno.unidade !== "Não informada";
        vinculo.textContent = informado ? nomeUnidadeLocal(aluno.unidade) : "Unidade ainda não vinculada";
        vinculo.closest(".profile-info-card").querySelector("span").textContent = "Unidade de vínculo";
        vinculo.closest(".profile-info-card").querySelector("small").textContent = informado ? `Aluno vinculado à ${nomeUnidadeLocal(aluno.unidade)}. Suas aulas podem ocorrer em outras unidades.` : "Unidade de vínculo ainda não informada.";
    }
    for (const id of ["progress-package-label"]) texto(id, credito ? "Créditos contratados" : "Nenhum pacote disponível");
    for (const id of ["remaining-lessons"]) texto(id, String(disponiveis));
    for(const categoria of ['A','B']){const c=resumo.categorias[categoria],total=document.querySelector('[data-perfil-total="'+categoria+'"]'),saldo=document.querySelector('[data-perfil-disponivel="'+categoria+'"]');if(total)total.textContent=c.total==null?'Não informado':c.total+' aulas';if(saldo)saldo.textContent=c.disponiveis==null?'Não informado':c.disponiveis+' aulas';}
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
        form.onsubmit=async e=>{e.preventDefault();if(processando)return;const erro=validar();if(erro){feedback.textContent=erro;feedback.setAttribute('role','alert');return;}processando=true;enviar.disabled=true;cancelar.disabled=true;enviar.textContent='Salvando…';d.setAttribute('aria-busy','true');form.querySelectorAll('input,.profile-password-visibility').forEach(n=>n.disabled=true);try{await servico.alterarSenhaLocal(campos());d.close();let sucesso=document.getElementById('profile-password-success');if(!sucesso){sucesso=document.createElement('p');sucesso.id='profile-password-success';sucesso.setAttribute('role','status');botao.closest('.profile-security-card').after(sucesso);}sucesso.textContent='Senha alterada com sucesso!';}catch(erro){feedback.textContent='Não foi possível salvar a senha. Sua senha anterior foi mantida. Tente novamente.';feedback.setAttribute('role','alert');}finally{processando=false;enviar.textContent='Confirmar alteração';cancelar.disabled=false;form.querySelectorAll('input,.profile-password-visibility').forEach(n=>n.disabled=false);enviar.disabled=!!validar();d.removeAttribute('aria-busy');}};
        d.onclose=()=>{form.querySelectorAll('input').forEach(n=>{n.value='';n.type='password';});d.remove();botao.focus();};document.body.append(d);d.showModal();form.elements.atual.focus({preventScroll:true});d.scrollTop=0;
    };
}



function abrirCancelamentoAlunoLocal(aula,dados,origem,aoConfirmar){
    if(origem.disabled)return;
    origem.disabled=true;
    const d=document.createElement('dialog');d.className='lesson-cancel-dialog';d.setAttribute('aria-labelledby','lesson-cancel-title');d.setAttribute('aria-describedby','lesson-cancel-description');
    d.innerHTML='<header><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v6m0 3h.01"/></svg><h2 id="lesson-cancel-title" tabindex="-1">Cancelar aula?</h2></header><p id="lesson-cancel-description">Confira a aula antes de confirmar o cancelamento.</p><dl class="lesson-cancel-summary"></dl><div class="lesson-cancel-reason"><label for="lesson-cancel-reason">Motivo do cancelamento <span>(obrigatório)</span></label><select id="lesson-cancel-reason" required aria-describedby="lesson-cancel-hint"><option value="">Selecione um motivo</option></select><small id="lesson-cancel-hint">Selecione o motivo do cancelamento para continuar.</small></div><aside class="lesson-cancel-policy" aria-label="Política de cancelamento"><p></p></aside><aside class="lesson-cancel-policy" data-health-guidance hidden><strong>Apresentação de atestado médico</strong><p>Se possuir um atestado médico válido, apresente-o à recepção em até 72 horas após o cancelamento. A devolução do crédito dependerá de análise e aprovação.</p><p data-health-deadline></p><a href="https://wa.me/55227998713181" target="_blank" rel="noopener noreferrer">Falar com a recepção</a></aside><label class="cancel-consent" hidden><input type="checkbox" data-cancel-consent> Compreendi que o horário será liberado e o crédito ficará retido, com registro de falta. Uma justificativa de saúde dependerá de aprovação da recepção.</label><p data-cancel-error role="alert"></p><footer><button type="button" data-cancel-back>Voltar / Fechar</button><button type="button" data-cancel-confirm disabled>Confirmar cancelamento</button></footer>';
    const data=v=>new Date(v).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),hora=v=>new Date(v).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
    const estados={1:'Confirmada',3:'Reservada · aguardando aceite',4:'Recusada'};
    for(const [label,valor] of [['Data',data(aula.inicio)],['Horário',hora(aula.inicio)+(aula.fim?' às '+hora(aula.fim):'')],['Categoria',aula.categoria||'Não informada'],['Unidade',nomeUnidadeLocal(aula.unidade)],['Instrutor',dados.registros.find(r=>r.id===aula.instrutor)?.nome||'Não informado'],['Veículo',dados.registros.find(r=>r.id===aula.veiculo)?.nome||'Não informado'],['Status atual',estados[aula.status]||'Não informado']]){const campo=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=valor;campo.append(dt,dd);d.querySelector('dl').append(campo);}
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
        d.querySelector('[data-health-deadline]').textContent=semPenalidade?'Este cancelamento não depende de atestado para tratar o crédito.':'Prazo previsto para apresentação: '+new Date(Date.now()+72*3600000).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'})+'. O prazo definitivo será registrado ao confirmar.';
        confirmar.disabled=salvando||!MOTIVOS_CANCELAMENTO_LOCAL.includes(motivo.value)||(!semPenalidade&&!consentimento.checked);
    }
    motivo.onchange=()=>{erro.textContent='';atualizarPolitica();};consentimento.onchange=atualizarPolitica;atualizarPolitica();
    voltar.onclick=()=>d.close();
    d.addEventListener('cancel',e=>{if(salvando)e.preventDefault();});
    confirmar.onclick=async()=>{if(salvando)return;if(!MOTIVOS_CANCELAMENTO_LOCAL.includes(motivo.value)){erro.textContent='Selecione o motivo do cancelamento para continuar.';motivo.focus();return;}salvando=true;confirmar.disabled=true;voltar.disabled=true;motivo.disabled=true;d.setAttribute('aria-busy','true');erro.textContent='';try{await aoConfirmar(motivo.value,{aceitarConsequencias:consentimento.checked});d.close();}catch(e){erro.textContent=e.message||'Não foi possível cancelar a aula. Tente novamente.';}finally{salvando=false;atualizarPolitica();voltar.disabled=false;motivo.disabled=false;d.removeAttribute('aria-busy');}};
    d.addEventListener('close',()=>{d.remove();if(origem.isConnected){origem.disabled=false;origem.focus();}else document.querySelector('#local-lesson-tabs [aria-pressed="true"]')?.focus();},{once:true});
    document.body.append(d);d.showModal();d.querySelector('h2').focus({preventScroll:true});d.scrollTop=0;
}

async function listarAulasAlunoLocal(servico,dados){
    const estado={1:'Confirmada',2:'Cancelada',3:'Reservada · aguardando aceite',4:'Recusada',5:'Concluída',6:'Falta'},agora=Date.now();
    const futuras=dados.aulas.filter(a=>a.status===1&&Date.parse(a.inicio)>agora).sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio));
    const passadas=dados.aulas.filter(a=>!futuras.includes(a)).sort((a,b)=>Date.parse(b.inicio)-Date.parse(a.inicio));
    const canceladas=passadas.filter(a=>a.status===2),historico=passadas.filter(a=>a.status!==2);
    document.getElementById('local-lesson-tabs')?.remove();
    const tabs=document.createElement('div');tabs.id='local-lesson-tabs';tabs.className='local-lesson-tabs';tabs.setAttribute('role','group');tabs.setAttribute('aria-label','Visualização das aulas');
    const principal=document.getElementById('lessons-list').closest('section')||document.getElementById('lessons-list').parentElement;
    const anterior=document.getElementById('past-lessons-list').closest('section')||document.getElementById('past-lessons-list').parentElement;
    principal.before(tabs);
    for(const [valor,nome] of [['confirmadas','Aulas confirmadas'],['canceladas','Aulas canceladas'],['historico','Histórico e outros estados']]){const b=document.createElement('button');b.type='button';b.textContent=nome;b.dataset.vista=valor;b.setAttribute('aria-pressed',String(valor==='confirmadas'));b.onclick=()=>{tabs.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));principal.hidden=valor!=='confirmadas';anterior.hidden=valor==='confirmadas';const limpeza=document.getElementById('cleanup-cancelamentos');if(limpeza)limpeza.hidden=valor!=='canceladas';document.querySelectorAll('#past-lessons-list [data-aula-local]').forEach(n=>n.hidden=valor==='canceladas'?n.dataset.status!=='2':n.dataset.status==='2');const h=anterior.querySelector('h2');if(h)h.textContent=valor==='canceladas'?'Aulas canceladas':'Histórico e outros estados';const legenda=anterior.querySelector('.lessons-card-header > div > span');if(legenda)legenda.textContent=valor==='canceladas'?'HISTÓRICO DE CANCELAMENTOS':'REGISTROS PRESERVADOS';document.getElementById('past-lessons-count').textContent=String((valor==='canceladas'?canceladas:historico).length);const vazio=anterior.querySelector('.local-view-empty');if(vazio)vazio.remove();if(!(valor==='canceladas'?canceladas:historico).length){const p=document.createElement('p');p.className='local-view-empty';p.textContent='Nenhuma aula nesta visualização.';anterior.append(p);}};tabs.append(b);}
    document.getElementById('lesson-attendance')?.remove();if(futuras.length){const aviso=orientacoesComparecimento(true);aviso.id='lesson-attendance';document.getElementById('lessons-list').before(aviso);}
    principal.hidden=false;anterior.hidden=true;const h=principal.querySelector('h2');if(h)h.textContent='Minhas aulas confirmadas';
    const dataHora=v=>new Date(v).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo',dateStyle:'short',timeStyle:'short'});
    for(const [id,aulas] of [['lessons-list',futuras],['past-lessons-list',passadas]]){
        const lista=document.getElementById(id);lista.replaceChildren();
        if(!aulas.length){const p=document.createElement('p');p.className='sipa-local-empty';p.textContent=id==='lessons-list'?'Você ainda não possui aulas futuras confirmadas.':'';lista.append(p);}
        for(const aula of aulas){
            const card=document.createElement('article');card.className='student-local-lesson';card.dataset.aulaLocal=aula.id;card.dataset.status=aula.status;
            const cabecalho=document.createElement('div');cabecalho.className='local-lesson-heading';const h=document.createElement('h3');h.textContent=dataHora(aula.inicio)+(aula.fim?' às '+new Date(aula.fim).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'}):'');const situacao=document.createElement('strong');situacao.className='local-lesson-status';situacao.textContent=estado[aula.status]||'Situação não informada';cabecalho.append(h,situacao);
            const infos=document.createElement('dl');infos.className='local-lesson-fields';
            for(const [rotulo,valor] of [['Categoria',aula.categoria||'Não informada'],['Unidade',nomeUnidadeLocal(aula.unidade)],['Instrutor',dados.registros.find(r=>r.id===aula.instrutor)?.nome||'Não informado'],['Veículo',dados.registros.find(r=>r.id===aula.veiculo)?.nome||'Não informado']]){
                const campo=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=rotulo;dd.textContent=valor;campo.append(dt,dd);infos.append(campo);
            }
            const detalhes=document.createElement('details');detalhes.className='local-lesson-history';const resumo=document.createElement('summary');resumo.textContent='Detalhes e histórico';detalhes.append(resumo);
            const local=document.createElement('div'),tituloLocal=document.createElement('h4');tituloLocal.textContent='Local da aula';local.append(tituloLocal,localDaAula(aula.unidade));if(!futuras.includes(aula))detalhes.append(local);
            const textoDetalhe=valor=>{const p=document.createElement('p');p.textContent=valor;detalhes.append(p);};
            const consome=(aula.status===2&&aula.cancelamento?.credito==='retido')||[1,5,6].includes(aula.status)||([3,4].includes(aula.status)&&Date.parse(aula.inicio)>agora);
            textoDetalhe('Crédito: '+(consome?'contabilizado no saldo atual conforme a situação da aula.':'não contabiliza consumo no saldo atual.'));
            if(aula.cancelamento){
                const c=aula.cancelamento;textoDetalhe('Cancelamento: '+(c.dentroPrazo?'dentro':'fora')+' do prazo de 48 horas úteis · Crédito '+c.credito+' · Frequência: '+({cancelada:'cancelada',falta:'falta',justificativa_pendente:'justificativa pendente'})[c.frequencia]+'.');
                if(c.justificativa){const j=c.justificativa;const estado=j.estado==='aguardando_apresentacao'&&Date.now()>Date.parse(j.prazoApresentacao)?'Prazo encerrado para apresentação':({aguardando_apresentacao:'Aguardando apresentação do atestado',aguardando_analise:'Aguardando análise da recepção',aprovado:'Aprovado',rejeitado:'Rejeitado',prazo_encerrado:'Prazo encerrado'})[j.estado]||'Estado da justificativa não informado';textoDetalhe('Justificativa: '+estado+' · Prazo: '+dataHora(j.prazoApresentacao)+'. Nenhuma aprovação automática.');const contato=document.createElement('a');contato.href='https://wa.me/55227998713181?text=Ol%C3%A1!%20Gostaria%20de%20orienta%C3%A7%C3%B5es%20da%20recep%C3%A7%C3%A3o.';contato.target='_blank';contato.rel='noopener noreferrer';contato.textContent='Falar com a recepção';detalhes.append(contato);}
            }
            if(aula.motivoCancelamento)textoDetalhe('Motivo do cancelamento: '+aula.motivoCancelamento);
            const eventos=Array.isArray(aula.historico)?aula.historico:[],cancelamento=[...eventos].reverse().find(e=>e.status===2&&e.em);
            if(cancelamento)textoDetalhe('Cancelamento registrado em '+dataHora(cancelamento.em)+'.');
            if(eventos.length){const ul=document.createElement('ul');for(const evento of eventos){const li=document.createElement('li');li.textContent=(estado[evento.status]||'Atualização registrada')+(evento.em?' · '+dataHora(evento.em):'')+(evento.motivo?' · Motivo: '+evento.motivo:'');ul.append(li);}detalhes.append(ul);}else if(dados.integrado){const conteudo=document.createElement('p');conteudo.textContent='Abra para consultar o histórico.';detalhes.append(conteudo);detalhes.addEventListener('toggle',async()=>{if(!detalhes.open||detalhes.dataset.carregado)return;detalhes.dataset.carregado='true';conteudo.textContent='Consultando histórico…';try{const eventos=await servico.consultarHistorico(aula.id);conteudo.textContent=eventos.length?'':'Nenhuma alteração registrada.';for(const e of eventos){const p=document.createElement('p');p.textContent=(e.tipo?.descricao||'Atualização')+' · '+dataHora(e.quando)+(e.motivo?' · '+e.motivo:'');detalhes.append(p);}}catch{delete detalhes.dataset.carregado;conteudo.textContent='Não foi possível consultar o histórico. Feche e abra para tentar novamente.';}});}else textoDetalhe('Nenhuma alteração adicional registrada.');
            card.append(cabecalho,infos);if(futuras.includes(aula)){const local=localDaAula(aula.unidade,false,dados.integrado?(aula.enderecoReserva||''):undefined);local.classList.add('confirmed-lesson-location');card.append(local);}card.append(detalhes);
            if([1,3,4].includes(aula.status)){
                const cancelar=document.createElement('button');cancelar.type='button';cancelar.className='local-lesson-cancel';cancelar.textContent='Cancelar aula';cancelar.disabled=servico.capacidades?.cancelamento!==true||(aula.status===1&&!(Date.parse(aula.inicio)>Date.now()));
                if(cancelar.disabled)cancelar.title=servico.capacidades?.cancelamento!==true?'Cancelamento indisponível até a validação da política de créditos pelo serviço.':'A aula já foi iniciada.';
                cancelar.onclick=()=>abrirCancelamentoAlunoLocal(aula,dados,cancelar,async (motivo,opcoes)=>{await servico.cancelarReservaLocal(aula.id,motivo,opcoes);await listarAulasAlunoLocal(servico,await servico.dadosAlunoLocal());});card.append(cancelar);
            }
            lista.append(card);
        }
    }
    const texto=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=v;};texto('total-lessons',String(futuras.length));texto('lessons-count',String(futuras.length));texto('past-lessons-count',String(passadas.length));texto('next-lesson-summary',futuras.length?dataHora(futuras[0].inicio):'Nenhuma aula agendada');
    const campo=document.querySelector('.lessons-summary .summary-card:last-child > div');if(campo){campo.querySelector('span').textContent='Unidade da próxima aula';campo.querySelector('strong').textContent=futuras.length?nomeUnidadeLocal(futuras[0].unidade):'Nenhuma aula agendada';}

}

async function iniciarReservaAlunoLocal(servico, inicial) {
    const [{hojeBrasil,somarDias,diaSemana,formatarData},{motivoFechamento}] = await Promise.all([import('../../compartilhado/calendario.js'),import('../../compartilhado/disponibilidade.js')]);
    let dados=inicial,categoria='B',data='',mes=hojeBrasil().slice(0,7)+'-01',ocupada=false,trocando=false,revisao=0,revisaoCalendario=0,ativa=null,operacaoId=crypto.randomUUID();
    const selecoes=new Map(),$=s=>document.querySelector(s),texto=(id,v)=>{const n=document.getElementById(id);if(n)n.textContent=v;};
    const contadorData=document.createElement('p');contadorData.className='time-selection-summary';contadorData.id='time-selection-summary';contadorData.hidden=true;contadorData.setAttribute('aria-live','polite');$('.time-area').append(contadorData);
    const unidade=$('#booking-unidade'),motorista=$('#motorista-select'),confirmar=$('#confirm-booking'),feedback=$('#booking-message');
    const chave=(dia,hora)=>[categoria,unidade.value,dia,hora].join('|');
    const ordenadas=()=>[...selecoes.values()].sort((a,b)=>(a.data+a.hora).localeCompare(b.data+b.hora));
    const alterar=()=>{operacaoId=crypto.randomUUID();};
    function mensagem(v){feedback.textContent=v;feedback.style.display='block';feedback.setAttribute('role','status');}
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
    function pintar(){document.querySelectorAll('#time-slots button').forEach(b=>{const selecionada=selecoes.has(chave(data,b.dataset.hora));b.classList.toggle('selected',selecionada);b.setAttribute('aria-pressed',String(selecionada));b.disabled=ocupada||(!selecionada&&selecoes.size>=(dados.resumo.categorias[categoria].disponiveis||0));});}
    // A seleção local usa apenas pares devolvidos pelo serviço, sem liberar recursos por conta própria.
    motorista.closest('.instructor-preview').hidden=true;
    function recursos(){}
    async function escolherRecursos(item,origem){
        const itens=Array.isArray(item)?item:[item],emLote=itens.length>1;item=itens[0];
        if(!item)return;
        const d=document.createElement('dialog');d.className='booking-local-dialog booking-resource-dialog';d.setAttribute('aria-labelledby','resource-dialog-title');
        d.innerHTML='<h2 id="resource-dialog-title">Escolha o instrutor e o veículo</h2><p data-contexto></p><h3>Instrutores disponíveis</h3><div data-instrutores class="resource-options"></div><h3>Veículo</h3><div data-veiculos class="resource-options"></div><p data-erro role="status"></p><div class="booking-dialog-actions"><button type="button" data-confirmar disabled>Confirmar seleção</button><button type="button" data-cancelar>Cancelar</button></div>';
        d.querySelector('[data-contexto]').textContent='Categoria '+categoria+' · '+nomeUnidadeLocal(unidade.value)+' · '+formatarData(item.data)+' · '+item.hora+' às '+item.fim;
        if(emLote){d.querySelector('h2').textContent='Instrutor e veículo para todas as aulas';d.querySelector('[data-contexto]').textContent=itens.length+' aulas · Categoria '+categoria+' · '+nomeUnidadeLocal(unidade.value);const lista=document.createElement('ul');lista.className='booking-batch-dates';for(const i of itens){const li=document.createElement('li');li.textContent=formatarData(i.data)+' · '+i.hora+' às '+i.fim;lista.append(li);}d.querySelector('[data-contexto]').after(lista);}
        let pares=[],paresPorAula=[],instrutor=item.par?.instrutorId,veiculo=item.par?.veiculoId;
        const ok=d.querySelector('[data-confirmar]'),erro=d.querySelector('[data-erro]');
        // Placa apenas visual do laboratório; não altera o documento nem o cadastro persistido.
        function placaVisual(registro){return registro?.documento?'Placa: '+registro.documento:'Placa não informada';}
        function opcoes(tipo,ids,atual,selecionar){const lista=d.querySelector('[data-'+tipo+']');lista.replaceChildren();for(const id of new Set(ids)){const r=dados.registros.find(r=>r.id===id),b=document.createElement('button');b.type='button';b.dataset.recurso=id;b.setAttribute('aria-pressed',String(id===atual));const nome=document.createElement('strong'),info=document.createElement('span');nome.textContent=r?.nome||id;info.textContent=tipo==='veiculos'?placaVisual(r):[nomeUnidadeLocal(unidade.value),'Categoria '+categoria,'Disponível nesta consulta'].join(' · ');b.append(nome,info);b.onclick=()=>selecionar(id);lista.append(b);}}
        function pintarModal(){opcoes('instrutores',pares.map(p=>p.instrutorId),instrutor,id=>{instrutor=id;veiculo=null;pintarModal();});opcoes('veiculos',pares.filter(p=>p.instrutorId===instrutor).map(p=>p.veiculoId),veiculo,id=>{veiculo=id;pintarModal();});ok.disabled=!pares.some(p=>p.instrutorId===instrutor&&p.veiculoId===veiculo);}
        async function consultar(){
            const consultas=await Promise.all(itens.map(i=>servico.consultarRecursosLocal({categoria,data:i.data,unidade:unidade.value})));
            paresPorAula=consultas.map((c,n)=>c.horarios.find(h=>h.hora===itens[n].hora)?.pares||[]);
            // A seleção em lote exige o mesmo par válido em cada aula; nada é aplicado parcialmente.
            pares=paresPorAula[0].filter(p=>paresPorAula.every(lista=>lista.some(q=>q.instrutorId===p.instrutorId&&q.veiculoId===p.veiculoId)));
            const semRecursos=itens.filter((i,n)=>!paresPorAula[n].length);
            erro.textContent=pares.length?'':emLote?(semRecursos.length?'Recursos indisponíveis em: '+semRecursos.map(i=>formatarData(i.data)+' às '+i.hora).join('; ')+'. Nenhuma escolha foi alterada.':'Não há um mesmo instrutor e veículo disponível para todas as aulas. Configure as aulas individualmente. Nenhuma escolha foi alterada.'):(consultas[0].mensagem||'Recursos indisponíveis neste horário.');
            pintarModal();
        }
        d.querySelector('[data-cancelar]').onclick=()=>d.close();
        ok.onclick=async()=>{ok.disabled=true;try{await consultar();if(!pares.some(p=>p.instrutorId===instrutor&&p.veiculoId===veiculo)){if(pares.length)erro.textContent='A disponibilidade mudou. Escolha novamente os recursos.';return;}itens.forEach((i,n)=>{i.pares=paresPorAula[n];i.par={instrutorId:instrutor,veiculoId:veiculo};});alterar();resumo();d.close();}catch(e){erro.textContent=e.message;}};
        d.addEventListener('close',()=>{d.remove();(origem.isConnected?origem:document.querySelector('#summary-lessons button'))?.focus();},{once:true});document.body.append(d);d.showModal();
        try{await consultar();d.querySelector('[data-instrutores] button')?.focus();}catch(e){erro.textContent=e.message;}
    }
    function resumo(){
        const saldo=dados.resumo.categorias[categoria];texto('summary-category',(categoria==='A'?'Moto':'Carro')+' · Categoria '+categoria);texto('summary-unit',unidade.value?nomeUnidadeLocal(unidade.value):'Selecione uma unidade');
        contadorData.hidden=!data;contadorData.textContent=[...selecoes.values()].filter(i=>i.data===data).length+' selecionada(s) nesta data · '+selecoes.size+' no total';
        texto('selected-lessons-count',String(selecoes.size));texto('booking-package-info','Saldo disponível: '+(saldo.disponiveis??'a conferir')+' aulas');
        enderecoSelecionado.replaceChildren(...(unidade.value?[localDaAula(unidade.value)]:[]));enderecoResumo.replaceChildren(...(unidade.value?[localDaAula(unidade.value,false)]:[]));
        const lista=$('#summary-lessons');lista.replaceChildren();
        if(!selecoes.size){const li=document.createElement('li');li.textContent='Selecione horários em uma ou mais datas. Clique novamente para desmarcar.';lista.append(li);}
        for(const item of ordenadas()){
            const li=document.createElement('li');li.className='booking-pending-row';li.dataset.selecao=item.chave;
            const info=document.createElement('div'),titulo=document.createElement('strong'),detalhe=document.createElement('span');titulo.textContent=formatarData(item.data)+' · '+item.hora+' às '+item.fim+' · Categoria '+categoria;
            detalhe.textContent=nomeUnidadeLocal(unidade.value)+' · '+(item.par?((dados.registros.find(r=>r.id===item.par.instrutorId)?.nome||'Instrutor')+' · '+(dados.registros.find(r=>r.id===item.par.veiculoId)?.nome||'Veículo')):'Escolha instrutor e veículo para esta aula');info.append(titulo,detalhe);
            const editar=document.createElement('button');editar.type='button';editar.textContent='Selecionar instrutor';editar.disabled=ocupada;editar.onclick=()=>{if(!ocupada)escolherRecursos(item,editar);};
            const remover=document.createElement('button');remover.type='button';remover.textContent='Remover';remover.setAttribute('aria-label','Remover aula de '+formatarData(item.data)+' às '+item.hora);remover.disabled=ocupada;remover.onclick=()=>{if(ocupada)return;selecoes.delete(item.chave);if(ativa===item.chave)ativa=null;alterar();pintar();recursos();resumo();};li.append(info,editar,remover);lista.append(li);
        }
        document.getElementById('booking-batch-resources')?.remove();
        if(selecoes.size>=2){const aplicar=document.createElement('button');aplicar.type='button';aplicar.id='booking-batch-resources';aplicar.className='booking-batch-action';aplicar.textContent='Aplicar o mesmo instrutor e veículo em todas as aulas';aplicar.disabled=ocupada;aplicar.onclick=()=>{if(!ocupada)escolherRecursos(ordenadas(),aplicar);};lista.after(aplicar);}
        confirmar.disabled=ocupada||!selecoes.size||!unidade.value||!dados.aluno||!(saldo.disponiveis>=selecoes.size)||ordenadas().some(i=>!i.par);
        unidade.disabled=ocupada;
        document.querySelectorAll('.category-option').forEach(b=>{b.disabled=ocupada;b.classList.toggle('selected',b.dataset.category===categoria);b.setAttribute('aria-pressed',String(b.dataset.category===categoria));b.querySelector('.category-option-info span').textContent=(dados.resumo.categorias[b.dataset.category].disponiveis??'A conferir')+' aulas disponíveis';});
        pintar();
    }
    async function horarios(){
        const versao=++revisao;texto('selected-date-label',data?formatarData(data):'Selecione uma data');$('#time-slots').replaceChildren();
        let consulta;try{consulta=await servico.consultarRecursosLocal({categoria,data,unidade:unidade.value});}catch(e){if(versao===revisao)mensagem('Não foi possível consultar os horários: '+e.message);return;}
        if(versao!==revisao)return;
        const lista=$('#time-slots');
        $('.availability-status').hidden=!data;$('.availability-status').textContent=data?(consulta.horarios.length+' horários disponíveis'):'';
        if(!consulta.horarios.length&&(data||!consulta.contagem.instrutores||!consulta.contagem.veiculos)){const p=document.createElement('p');p.className='sipa-local-empty';p.textContent=consulta.mensagem;lista.append(p);}
        else if(!data){const vazio=document.createElement('div');vazio.className='empty-time-state';vazio.innerHTML='<svg class="booking-icon" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg><p>Escolha uma data no calendário para consultar os horários.</p>';lista.append(vazio);}
        for(const h of consulta.horarios){
            const b=document.createElement('button');b.type='button';b.className='time-slot';b.textContent=h.hora;b.dataset.hora=h.hora;
            b.onclick=()=>{
                if(ocupada)return;const id=chave(data,h.hora);
                if(selecoes.has(id)){selecoes.delete(id);if(ativa===id)ativa=null;}
                else{if(selecoes.size>=(dados.resumo.categorias[categoria].disponiveis||0)){mensagem('O número de escolhas atingiu os créditos disponíveis desta categoria.');return;}selecoes.set(id,{chave:id,data,hora:h.hora,fim:h.fim,pares:h.pares,par:null});ativa=id;}
                alterar();recursos();resumo();
            };lista.append(b);
        }
        if(!selecoes.has(ativa)||selecoes.get(ativa).data!==data)ativa=ordenadas().find(i=>i.data===data)?.chave||null;
        const item=selecoes.get(ativa);if(item){const atual=consulta.horarios.find(h=>h.hora===item.hora);item.pares=atual?.pares||[];if(item.par&&!item.pares.some(p=>p.instrutorId===item.par.instrutorId&&p.veiculoId===item.par.veiculoId)){item.par=null;alterar();}}
        recursos();resumo();
    }
    async function calendario() {
        const versao = ++revisaoCalendario;
        const grade = $("#calendar-days"); grade.replaceChildren();
        texto("calendar-month", new Date(`${mes}T12:00:00Z`).toLocaleDateString("pt-BR", { timeZone: "UTC", month: "long", year: "numeric" }));
        const inicio = somarDias(mes, -diaSemana(mes)), hoje = hojeBrasil();
        // Mesmas fontes de bloqueio integral consultadas por calcularHorariosLocais.
        const recursosDaUnidade = dados.registros.filter(r => ["instrutor", "veiculo"].includes(r.tipo) && normalizarUnidadeLocal(r.unidade) === normalizarUnidadeLocal(unidade.value));
        const fechamentoCadastrado = iso => recursosDaUnidade.some(r => (r.feriadosUnidade || []).includes(iso))
            ? "Feriado cadastrado da unidade" : recursosDaUnidade.some(r => (r.bloqueiosUnidade || []).some(b => b.data === iso && !b.inicio))
                ? "Bloqueio integral cadastrado da unidade" : "";
        const dias = await Promise.all(Array.from({ length: 42 }, async (_, i) => {
            const iso = somarDias(inicio, i), fora = iso.slice(0, 7) !== mes.slice(0, 7), fechado = motivoFechamento(iso) || fechamentoCadastrado(iso), passado = iso < hoje;
            const livres = fora || fechado || passado ? [] : await servico.disponibilidadeLocal({ categoria, data: iso, unidade: unidade.value });
            const b = document.createElement("button"); b.type = "button"; b.textContent = String(Number(iso.slice(-2))); b.dataset.dataLocal = iso;
            b.disabled = fora || !!fechado || passado; b.className = "calendar-day"; b.classList.toggle("selected", iso === data); b.classList.toggle("sem-disponibilidade", !livres.length); b.dataset.disponivel = String(livres.length > 0 && dados.resumo.categorias[categoria].disponiveis > 0);
            // Apresentação dos bloqueios existentes; não cria novas restrições.
            const motivos = [passado && "Data passada", fechado, fora && "Fora do mês exibido"].filter(Boolean);
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
            grade.replaceChildren(...dias);
            const lista = document.getElementById("calendar-block-reasons");
            if (lista) lista.replaceChildren(...dias.filter(b => b.disabled && b.dataset.dataLocal.slice(0, 7) === mes.slice(0, 7)).map(b => {
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
            mensagem((salvas.length===1?'Agendamento confirmado!':'Agendamentos confirmados!')+' '+salvas.length+' aula(s) de '+(salvas[0].categoria==='A'?'moto':'carro')+' na '+nomeUnidadeLocal(salvas[0].unidade)+' · Categoria '+salvas[0].categoria+'. Confirmadas.');
            mostrarConfirmacaoAulasLocais(salvas,dados,confirmar);
            try { await calendario(); await horarios(); }
            catch { mensagem('As aulas foram salvas. Não foi possível atualizar o calendário; consulte Minhas aulas ou recarregue a página.'); }
        }catch(e){try{dados=await servico.dadosAlunoLocal();}catch{}mensagem(e.message||'Não foi possível gravar as aulas.');feedback.setAttribute('role','alert');feedback.tabIndex=-1;feedback.focus();}
        finally{ocupada=false;recursos();resumo();}
    };
    $('.availability-status').hidden=true;$('.availability-status').textContent='';
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
    const d=document.createElement('dialog');d.id='agendamentos-confirmados';d.className='booking-local-dialog';d.setAttribute('aria-labelledby','booking-success-title');
    const icone=document.createElementNS('http://www.w3.org/2000/svg','svg');icone.setAttribute('viewBox','0 0 24 24');icone.setAttribute('aria-hidden','true');icone.classList.add('booking-success-icon');icone.innerHTML='<circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/>';
    const titulo=document.createElement('h2');titulo.id='booking-success-title';titulo.textContent=aulas.length===1?'Agendamento confirmado!':'Agendamentos confirmados!';
    const descricao=document.createElement('p'),c=aulas[0].categoria;descricao.textContent='Suas aulas foram agendadas com sucesso.';
    const lista=document.createElement('ul');lista.className='booking-success-list';
    const data=v=>new Date(v).toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'}),hora=v=>new Date(v).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});
    for(const [i,a] of aulas.entries()){const li=document.createElement('li'),titulo=document.createElement('h3'),campos=document.createElement('dl');titulo.textContent='Aula '+String(i+1).padStart(2,'0')+' — '+(a.categoria==='A'?'Moto':'Carro')+' | Categoria '+a.categoria;
        for(const [label,valor] of [['Data',data(a.inicio)],['Horário',hora(a.inicio)+' às '+hora(a.fim)],['Unidade',nomeUnidadeLocal(a.unidade)],['Endereço',obterUnidadeInstitucional(a.unidade)?.enderecoCompleto||'Não informado'],['Instrutor',dados.registros.find(r=>r.id===a.instrutor)?.nome||'Não informado'],['Veículo',dados.registros.find(r=>r.id===a.veiculo)?.nome||'Não informado'],['Situação',a.status===1?'Confirmada':'Situação registrada: '+a.status]]){const campo=document.createElement('div'),dt=document.createElement('dt'),dd=document.createElement('dd');dt.textContent=label;dd.textContent=valor;if(label==='Endereço')campo.className='booking-success-address';campo.append(dt,dd);campos.append(campo);}li.append(titulo,campos);const mapa=linkLocalizacaoUnidade(a.unidade);if(mapa)li.append(mapa);lista.append(li);}
    const saldo=document.createElement('p');saldo.textContent='Total de aulas confirmadas: '+aulas.length+' · Créditos utilizados: '+aulas.length+' · Créditos restantes: '+(dados.resumo.categorias[c].disponiveis??'a conferir');
    const acoes=document.createElement('div');acoes.className='booking-dialog-actions';const ver=document.createElement('a');ver.href='minhas-aulas.html';ver.textContent='Ver minhas aulas';const mais=document.createElement('button');mais.type='button';mais.textContent='Agendar mais aulas';mais.autofocus=true;mais.onclick=()=>d.close();const fechar=document.createElement('button');fechar.type='button';fechar.textContent='Fechar';fechar.onclick=()=>d.close();acoes.append(ver,mais,fechar);d.append(icone,titulo,descricao,lista,saldo,acoes);
    d.addEventListener('close',()=>{d.remove();(origem.disabled?document.querySelector('.category-option.selected'):origem)?.focus();},{once:true});document.body.append(d);d.showModal();
}
