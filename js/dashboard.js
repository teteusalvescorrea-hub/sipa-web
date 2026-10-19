import {localDaAula,orientacoesComparecimento} from './modules/essencial/components/localAula.js';
import {nomeUnidadeInstitucional} from './modules/unidades/catalogoUnidades.js';
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
    for(const categoria of ['A','B']) {
        const saldo=resumo?.categorias?.[categoria]; texto('credito-'+categoria,saldo?.disponiveis??'—');
        texto('credito-'+categoria+'-detalhe',saldo?`${saldo.total} créditos · ${saldo.reservadas} reservadas · ${saldo.realizadas} concluídas`:'Saldo por categoria ainda não informado.');
    }
    texto('creditos-resumo',resumo?.total!=null?`${resumo.total} créditos no total · créditos não são aulas realizadas`:'Seus saldos serão apresentados por categoria.');
    const percentual=resumo?.percentual;
    texto('progress-number',percentual!=null?percentual+'%':'Ainda não iniciado');
    texto('progress-description',resumo?.realizadas>0?(resumo.total?`${resumo.realizadas} de ${resumo.total} aulas concluídas.`:`${resumo.realizadas} aulas concluídas. Total de créditos ainda não informado.`):'Sua evolução aparecerá conforme as aulas forem concluídas.');
    const barra=document.getElementById('progress-bar');barra.style.width=(percentual??0)+'%';
    barra.parentElement.setAttribute('aria-valuenow',String(percentual??0));barra.parentElement.setAttribute('aria-valuetext',percentual!=null?percentual+'%':'Sem aulas concluídas para calcular progresso');
    const proxima=aulas.filter(a=>[1].includes(numeroStatus(a))&&Date.parse(dataInicio(a))>Date.now()).sort((a,b)=>Date.parse(dataInicio(a))-Date.parse(dataInicio(b)))[0];
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
        detalhe(dados,'Unidade',integrado?proxima.unidade:nomeUnidadeInstitucional(proxima.unidade));conteudo.append(dados);if(numeroStatus(proxima)===1){conteudo.append(localDaAula(proxima.unidade,false,integrado?(proxima.localAula||''):undefined),orientacoesComparecimento());}
        const link=document.createElement('a');link.href='minhas-aulas.html';link.textContent='Consultar minhas aulas →';conteudo.append(link);
    }
    const aviso=document.getElementById('dashboard-notice');
    if(!integrado&&resumo?.incompletas){aviso.textContent='Há registros locais sem categoria ou situação. Confira esses dados antes de utilizar o saldo.';aviso.hidden=false;}
    document.querySelectorAll('.notification-badge').forEach(node=>{node.hidden=true;});
    const notificacoes=document.getElementById('notification-button');if(notificacoes){notificacoes.disabled=true;notificacoes.title='Notificações ainda indisponíveis.';}
}
