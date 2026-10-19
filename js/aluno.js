// Entrada integrada única: nenhum login, sessão ou armazenamento de demonstração.
import {exigirLogin} from './modules/essencial/utils/sessao.js';
import {sair} from './modules/essencial/service/authService.js';
import {criarServicoAluno} from './modules/essencial/service/alunoIntegrado.js';
import {apresentarDashboard} from './dashboard.js';
import {apresentarProgresso,apresentarPerfil,apresentarAulas,apresentarAgendamento,montarAlteracaoSenha} from './modules/essencial/components/painelAluno.js';
import {montarAntecipacaoAluno} from './modules/essencial/components/preferenciasAluno.js';
const pagina=location.pathname.split('/').pop();
function aviso(texto){let n=document.getElementById('student-service-status');if(!n){n=document.createElement('p');n.id='student-service-status';n.className='dashboard-notice';n.setAttribute('role','status');document.querySelector('main').prepend(n);}n.textContent=texto;n.hidden=!texto;}
function preparar(){
 document.querySelectorAll('main [id]').forEach(n=>{if(['SPAN','STRONG','SMALL','TIME','H2'].includes(n.tagName)&&!n.children.length&&!n.closest('button'))n.textContent='—';});
 for(const id of ['lessons-list','past-lessons-list','calendar-days','time-slots','progress-packages']){const n=document.getElementById(id);if(n)n.replaceChildren();}
 document.querySelectorAll('main button:not(.sipa-theme-toggle),main input,main select').forEach(n=>n.disabled=true);
 document.querySelectorAll('#logout-button,[id$="-logout"]').forEach(b=>b.onclick=sair);
 let menu=document.querySelector('#mobile-menu-button,[id$="-mobile-menu"]');if(!menu){menu=document.createElement('button');menu.type='button';menu.className='student-menu-toggle';menu.textContent='Menu';document.querySelector('main header')?.prepend(menu);}menu.disabled=false;menu.onclick=()=>{const side=document.querySelector('.sipa-sidebar');side.classList.toggle('mobile-open');menu.setAttribute('aria-expanded',String(side.classList.contains('mobile-open')));};
 const rotas={schedule:'agendamento.html',lessons:'minhas-aulas.html',progress:'meu-progresso.html',profile:'meu-perfil.html',packages:'pacotes.html'};document.querySelectorAll('[data-action]').forEach(b=>{if(rotas[b.dataset.action]){b.disabled=false;b.onclick=()=>location.assign(rotas[b.dataset.action]);}});
 document.querySelectorAll('.sipa-theme-toggle').forEach(b=>b.disabled=false);
}
async function iniciar(){
 if(!exigirLogin(['Aluno']))return;
 preparar();if(pagina==='pacotes.html')return;
 aviso('Carregando seus dados…');const servico=criarServicoAluno();
 try{
 const dados=await servico.carregar();
 if(pagina==='dashboard.html')apresentarDashboard(dados);
 else if(pagina==='minhas-aulas.html'){await apresentarAulas(servico,dados);aviso('Cancelamento indisponível no momento. Para solicitar, entre em contato com a recepção.');}
 else if(pagina==='agendamento.html'){await apresentarAgendamento(servico,dados);aviso('Agendamento por unidade indisponível no momento. Consulte a recepção.');}
 else if(pagina==='meu-progresso.html')apresentarProgresso(dados);
 else if(pagina==='meu-perfil.html'){apresentarPerfil(dados);montarAlteracaoSenha(servico);await montarAntecipacaoAluno(servico);const senha=document.getElementById('change-password-button');if(senha){senha.disabled=true;senha.title='Alteração de senha indisponível no momento.';}document.querySelectorAll('#student-anticipation input,#student-anticipation button').forEach(b=>b.disabled=true);aviso('Alteração de senha e preferências de antecipação indisponíveis no momento. Consulte a recepção.');}
 if(['dashboard.html','meu-progresso.html'].includes(pagina))aviso(Object.values(dados.resumo.categorias).some(c=>c.total===null)?'O saldo conjunto está disponível. A separação por categoria ainda não foi informada pelo serviço.':'');
 }catch(e){aviso(e.status===0?'Não foi possível falar com o servidor. Tente novamente ou contate a recepção.':e.message||'Não foi possível carregar seus dados. Tente novamente.');}
}
iniciar();
