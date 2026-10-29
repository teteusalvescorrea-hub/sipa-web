import {localDaReserva,localDaAula,orientacoesComparecimento} from '../../shared/components/localAula.js';
import {localDaReservaOperacional} from '../../shared/js/categorias.js';
import {nomeUnidadeInstitucional} from '../../shared/js/catalogoUnidades.js';
﻿// Apresentação compartilhada. Saldo vem dos serviços; nunca é debitado pela tela.
const texto = (id, valor) => { const node = document.getElementById(id); if (node) node.textContent = valor; };
const statusAula = {1:'Confirmada',2:'Cancelada',3:'Aguardando aceite',4:'Recusada',5:'Realizada',6:'Falta'};
const numeroStatus = aula => aula.status?.valor ?? aula.status;
const dataInicio = aula => aula.inicio || aula.dataHoraInicio;
function detalhe(lista, titulo, valor) {
    if (!valor) return;
    const item=document.createElement('div'), label=document.createElement('dt'), dado=document.createElement('dd');
    label.textContent=titulo; dado.textContent=valor; item.append(label,dado); lista.append(item);
}
export function apresentarDashboard({aluno,resumo,aulas=[],registros=[],categorias=[],integrado=false}) {
    const nome=aluno?.nome?.trim();
    texto('student-name',nome?nome.split(/\s+/)[0]:'bem-vindo');
    if((categorias.includes('D')||resumo?.categorias?.D?.total>0)&&!document.getElementById('credito-D')){const card=document.getElementById('credito-B').closest('article').cloneNode(true);for(const n of card.querySelectorAll('[id]'))n.id=n.id.replace('credito-B','credito-D');card.querySelector('.credit-heading span').textContent='Ônibus';card.querySelector('h2').textContent='Categoria D';document.querySelector('.summary-grid').append(card);}for(const categoria of ['A','B','D']) {
        const card=document.getElementById('credito-'+categoria)?.closest('article');if(card&&categorias.length)card.hidden=!categorias.includes(categoria);
        const saldo=resumo?.categorias?.[categoria]; texto('credito-'+categoria,saldo?.disponiveis??'—');
        texto('credito-'+categoria+'-detalhe',saldo?`${saldo.total??'Total não informado'} créditos${Number.isFinite(saldo.liberadas)?' · '+saldo.liberadas+' liberadas':''} · ${saldo.reservadas} reservadas · ${saldo.realizadas} concluídas`:'Saldo por categoria ainda não informado.');
    }
    texto('creditos-resumo',resumo?`${resumo.total??'Total não informado'} créditos no total · créditos não são aulas realizadas`:'Seus saldos serão apresentados por categoria.');
    const percentual=resumo?.percentual;
    texto('progress-number',percentual!=null?percentual+'%':'Ainda não iniciado');
    texto('progress-description',resumo?.realizadas>0?(resumo.total?`${resumo.realizadas} de ${resumo.total} aulas concluídas.`:`${resumo.realizadas} aulas concluídas. Total de créditos ainda não informado.`):'Sua evolução aparecerá conforme as aulas forem concluídas.');
    const barra=document.getElementById('progress-bar');barra.style.width=(percentual??0)+'%';
    barra.parentElement.setAttribute('aria-valuenow',String(percentual??0));barra.parentElement.setAttribute('aria-valuetext',percentual!=null?percentual+'%':'Sem aulas concluídas para calcular progresso');
    const proxima=aulas.filter(a=>(integrado?[1,3,4]:[1]).includes(numeroStatus(a))&&Date.parse(dataInicio(a))>Date.now()).sort((a,b)=>Date.parse(dataInicio(a))-Date.parse(dataInicio(b)))[0];
    const conteudo=document.getElementById('proxima-aula-conteudo'),selo=document.getElementById('next-lesson-status');conteudo.replaceChildren();selo.hidden=!proxima;
    if(!proxima) {
        const titulo=document.createElement('p');titulo.textContent='Você ainda não possui aulas agendadas.';
        const link=document.createElement('a');link.href='agendamento.html';link.textContent='Agendar aula →';conteudo.append(titulo,link);
    } else {
        selo.textContent=statusAula[numeroStatus(proxima)];const dados=document.createElement('dl');dados.className='next-class-details';const inicio=new Date(dataInicio(proxima));
        detalhe(dados,'Data',inicio.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'long',year:'numeric'}));
        const hora=v=>new Date(v).toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour:'2-digit',minute:'2-digit'});detalhe(dados,'Horário',hora(dataInicio(proxima))+((proxima.fim||proxima.dataHoraFim)?' às '+hora(proxima.fim||proxima.dataHoraFim):''));
        detalhe(dados,'Categoria',proxima.categoria?.descricao||proxima.categoria||'Não informada');
        const recusada=numeroStatus(proxima)===4;
        detalhe(dados,'Veículo',recusada?null:proxima.veiculoModelo||registros.find(r=>r.id===proxima.veiculo)?.nome);
        detalhe(dados,'Instrutor',recusada?'Aguardando nova designação':proxima.motoristaNome||registros.find(r=>r.id===proxima.instrutor)?.nome);
        detalhe(dados,['B','D'].includes(proxima.categoria)?'Local da aula':'Unidade',['B','D'].includes(proxima.categoria)?localDaReservaOperacional(proxima)?.nome||nomeUnidadeInstitucional(proxima.unidade):integrado?proxima.unidade:nomeUnidadeInstitucional(proxima.unidade));conteudo.append(dados);if(numeroStatus(proxima)===1){conteudo.append(['B','D'].includes(proxima.categoria)?localDaReserva(proxima,false):localDaAula(proxima.unidade,false,integrado?(proxima.localAula||''):undefined),orientacoesComparecimento());}
        const link=document.createElement('a');link.href='minhas-aulas.html';link.textContent='Consultar minhas aulas →';conteudo.append(link);
    }
    const aviso=document.getElementById('dashboard-notice');
    if(!integrado&&Object.hasOwn(resumo||{},'motivoBloqueio')){aviso.textContent=resumo.motivoBloqueio;aviso.hidden=!resumo.motivoBloqueio;}
    if(!integrado&&resumo?.incompletas){aviso.textContent='Há registros locais sem categoria ou situação. Confira esses dados antes de utilizar o saldo.';aviso.hidden=false;}
    document.querySelectorAll('.notification-badge').forEach(node=>{node.hidden=true;});
    const notificacoes=document.getElementById('notification-button');if(notificacoes){notificacoes.disabled=true;notificacoes.title='Notificações ainda indisponíveis.';}
}
async function iniciarIntegrado() {
    const [{exigirLogin},{sair},{obterAlunoLogado},{listarAgendamentos},{listarContratacoes}]=await Promise.all([
        import('../../shared/js/sessao.js'),import('../../shared/js/services/authService.js'),import('../../shared/js/services/alunos.service.js'),import('../../shared/js/services/agendamentos.service.js'),import('../../shared/js/services/contratacoes.service.js')]);
    if(!exigirLogin(['Aluno']))return;
    document.getElementById('logout-button').onclick=sair;document.getElementById('mobile-menu-button').onclick=()=>document.querySelector('.sipa-sidebar').classList.toggle('mobile-open');
    apresentarDashboard({});
    try {
        const aluno=await obterAlunoLogado();
        const categorias=(aluno.categoriasFormacao||[]).map(c=>({1:'A',2:'B'})[c.valor]).filter(Boolean);
        const dados={aluno,categorias,integrado:true,resumo:{categorias:{},total:aluno.aulasContratadas,realizadas:aluno.aulasRealizadas,percentual:aluno.aulasRealizadas>0&&Number.isFinite(aluno.percentualProgresso)?aluno.percentualProgresso:null}};
        // /me só informa saldo agregado. Não repartir artificialmente um pacote AB.
        apresentarDashboard(dados);
        const respostas=await Promise.allSettled([listarAgendamentos(),listarContratacoes()]);
        if(respostas[0].status==='fulfilled')apresentarDashboard({...dados,aulas:respostas[0].value});
        texto('creditos-resumo',`${aluno.aulasRestantes} aulas disponíveis no saldo conjunto · ${aluno.aulasAgendadas} agendadas · ${aluno.aulasRealizadas} realizadas`);
        const aviso=document.getElementById('dashboard-notice');
        if(respostas.some(r=>r.status==='rejected')){aviso.hidden=false;aviso.textContent=respostas.filter(r=>r.status==='rejected').map(r=>r.reason.message).join(' ');}
        else if(aluno.aulasRestantes===0){
            aviso.hidden=false;
            const pendentes=respostas[1].value.filter(c=>c.status?.valor===1);
            aviso.textContent=pendentes.length?'Seu pacote está aguardando a confirmação da autoescola.':'Você não possui saldo disponível para novos agendamentos.';
            if(!pendentes.length){const link=document.createElement('a');link.href='pacotes.html';link.textContent=' Consultar pacotes adicionais →';aviso.append(link);}
        }
    }catch(erro){const aviso=document.getElementById('dashboard-notice');aviso.hidden=false;aviso.textContent=erro.message||'Não foi possível carregar o painel.';}
}
