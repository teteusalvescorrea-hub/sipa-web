// Entrada integrada única: nenhum login, sessão ou armazenamento de demonstração.
import {exigirLogin} from '../../shared/js/sessao.js';
import {sair} from '../../shared/js/services/authService.js';
import {criarServicoAluno} from './services/alunoIntegrado.js';
import {ROTA_CONTRATAR_AULAS} from './domain/contatoRecepcao.js';
import {apresentarDashboard} from './dashboard.js';
import {apresentarProgresso,apresentarPerfil,apresentarAulas,apresentarAgendamento,montarAlteracaoSenha} from './components/painelAluno.js';
import {marcarIndicadorMensagens,atualizarIndicadorNovidades} from './components/mensagensAluno.js';
const pagina=location.pathname.split('/').pop();
function aviso(texto){let n=document.getElementById('student-service-status');if(!n){n=document.createElement('p');n.id='student-service-status';n.className='dashboard-notice';n.setAttribute('role','status');document.querySelector('main').prepend(n);}n.textContent=texto;n.hidden=!texto;}
function preparar(){
 document.querySelectorAll('main [id]').forEach(n=>{if(['SPAN','STRONG','SMALL','TIME','H2'].includes(n.tagName)&&!n.children.length&&!n.closest('button'))n.textContent='—';});
 for(const id of ['lessons-list','past-lessons-list','calendar-days','time-slots','progress-packages']){const n=document.getElementById(id);if(n)n.replaceChildren();}
 document.querySelectorAll('main button:not(.sipa-theme-toggle),main input,main select').forEach(n=>n.disabled=true);
 document.querySelectorAll('#logout-button,[id$="-logout"]').forEach(b=>b.onclick=sair);
 // Menu (gaveta até 1024px): montado pelo sidebar-aluno.js; aqui só volta a ficar ativo.
 const menu=document.querySelector('.sipa-aluno-menu');if(menu)menu.disabled=false;
 const rotas={schedule:'agendamento.html',lessons:'minhas-aulas.html',progress:'meu-progresso.html',profile:'meu-perfil.html',packages:ROTA_CONTRATAR_AULAS};document.querySelectorAll('[data-action]').forEach(b=>{if(rotas[b.dataset.action]){b.disabled=false;b.onclick=()=>location.assign(rotas[b.dataset.action]);}});
 document.querySelectorAll('.sipa-theme-toggle').forEach(b=>b.disabled=false);
}
async function iniciar(){
 if(!exigirLogin(['Aluno']))return;
 preparar();if(pagina==='pacotes.html')return;
 aviso('Carregando seus dados…');const servico=criarServicoAluno();
 try{
 const dados=await servico.carregar();aviso('');
 if(pagina==='dashboard.html'){apresentarDashboard(dados);/* 17/11/2026: a avaliação da aula não abre mais sozinha; fica no cartão da aula em Minhas aulas. */}
 else if(pagina==='minhas-aulas.html')await apresentarAulas(servico,dados);
 else if(pagina==='agendamento.html'){await apresentarAgendamento(servico,dados);
  // Agendamento automático (F13): ligado pela capacidade do serviço; sem ela, só o manual.
  const auto=document.getElementById('booking-mode-auto');if(auto&&!servico.capacidades.automatico){auto.disabled=true;auto.title='Agendamento automático ainda indisponível. Use o agendamento manual.';}}
 else if(pagina==='meu-progresso.html'){apresentarProgresso(dados);
  // 24/11/2026: o pedido de liberação para agendar, da etapa "Liberação para agendamento".
  document.addEventListener('sipa-pedir-liberacao',async e=>{try{await servico.solicitarLiberacao();apresentarProgresso(await servico.carregar());aviso('Pedido enviado. A AgIA avisa você quando o agendamento for liberado.');}catch(x){if(e.detail?.botao)e.detail.botao.disabled=false;aviso(x.message||'Não foi possível enviar o pedido.');}});}
 else if(pagina==='meu-perfil.html'){apresentarPerfil(dados);montarAlteracaoSenha(servico);}
 if(['dashboard.html','meu-progresso.html'].includes(pagina))aviso(Object.values(dados.resumo.categorias).some(c=>c.total===null)?'O saldo conjunto está disponível. A separação por categoria ainda não foi informada pelo serviço.':'');
 }catch(e){aviso(e.status===0?'Não foi possível falar com o servidor. Tente novamente em instantes ou fale com a equipe da autoescola.':e.message||'Não foi possível carregar seus dados. Tente novamente.');}
 // Depois de desenhar: junto com a leitura da página, as 3 consultas do contador disputavam as conexões com ela.
 acompanharNaoLidas(servico);
}
// Sino e item Mensagens em todas as páginas: avisos + conversa com a Recepção, a cada 30 s (19/11/2026: antes 15 s), ao
// voltar para a janela e ao mostrar a aba de novo.
function acompanharNaoLidas(servico){const contar=()=>{if(!document.hidden){servico.totalNaoLidas().then(marcarIndicadorMensagens,()=>{});atualizarIndicadorNovidades(servico);}};setInterval(contar,30000);window.addEventListener('focus',contar);document.addEventListener('visibilitychange',()=>{if(!document.hidden)contar();});contar();}
iniciar();
