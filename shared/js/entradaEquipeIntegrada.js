// Entrada integrada dos painéis da equipe (ADM 1, 2 e 3): sessão da API,
// identidade pelo equipe/me e serviço HTTP. Sem nada de dev/ (M4).
import {exigirLogin} from './sessao.js';
import {sair} from './services/authService.js';
import {carregarIdentidadeEquipe,criarServicoAdministrativoIntegrado} from './services/administracaoIntegrada.js';
import {montarUnidade} from '../../nivel-1-operador/js/components/unidadeOperador.js';
import {acompanharHorariosLiberados} from './avisoAntecipacao.js';
import {acompanharVerificacoes} from './avisoVerificacoes.js';
import {montarChat} from '../components/chatWhats.js';
import {fonteEquipe} from './chatFontes.js';
import {cartaoPedidosAulas} from '../../nivel-1-operador/js/components/fase8Equipe.js';

// Unidade de consulta do Master (seletor do painel, por aba).
// 16/11/2026 (bug apontado pelo usuário): lia a primeira chave "sipa.admin.unidade.<conta>" da sessão, de qualquer conta;
// com a de outra conta usada antes no navegador, a troca de unidade recarregava e não mudava nada. Agora vale a chave
// única "sipa.admin.unidade.atual" (gravada pelo seletor, que apaga as antigas).
function unidadeEscolhida(){try{const atual=sessionStorage.getItem('sipa.admin.unidade.atual');if(atual!==null)return atual||null;return null;}catch{return null;}}

// raiz: onde o painel monta. template: o <template id="operador-template">.
// administracao: true nos painéis da Gerência e do Master.
export async function montarPainelEquipe({perfil,raiz,template,administracao=false}){
 if(!exigirLogin(['Autoescola']))return null;
 const {identidade,unidades}=await carregarIdentidadeEquipe(perfil,{unidadeEscolhida:unidadeEscolhida()});
 const servico=criarServicoAdministrativoIntegrado(identidade,unidades);
 const ui=await montarUnidade(raiz,template,servico,{sair:async()=>sair()});
 if(administracao){const {montarAdministracao}=await import('../components/painelAdministrativo.js');await montarAdministracao(raiz,servico,ui);}
 else{
  if(identidade.permissoes.includes('antecipar')){
   const host=ui.registrarSecao('antecipacao','Antecipação de aulas');
   raiz.querySelector('[data-op-nav=antecipacao]')?.addEventListener('click',async()=>{try{await (await import('../components/antecipacaoPainel.js')).montarAntecipacaoPainel(host,servico,raiz);}catch(e){host.textContent=e.message;}});
   acompanharHorariosLiberados(raiz,servico,ui);
  }
  // Mensagens (09/11/2026): o chat estilo WhatsApp (alunos, grupo da unidade, equipe e instrutores) e os pedidos de
  // mais aulas, com o total de não lidas no item do menu.
  if(identidade.permissoes.includes('mensagens')&&servico.chatResumo){
   const host=ui.registrarSecao('mensagens','Mensagens','Conversas com os alunos, a equipe e os instrutores.');
   const fonte=fonteEquipe(servico),marcar=n=>ui.marcarContador('mensagens',n,'mensagens não lidas');
   let chatAtual=null;
   const montarMensagens=()=>{if(host.querySelector('[data-op-chat]'))return chatAtual;const chat=document.createElement('div');chat.dataset.opChat='';host.replaceChildren(chat);chatAtual=montarChat(chat,fonte,{aoMudarNaoLidas:marcar});return chatAtual;};
   raiz.querySelector('[data-op-nav=mensagens]')?.addEventListener('click',montarMensagens);
   // 10/11/2026: o "Conversar" (e o nome do aluno) da Antecipação de aulas abre Mensagens já na conversa do aluno.
   // 11/11/2026: o "Enviar mensagem" da ficha e da lista de alunos (sipa-mensagem-iniciar) também: antes ninguém atendia
   // o evento na Recepção e o botão não fazia nada. A ficha fecha para a conversa aparecer.
   const conversarComAluno=e=>{const {alunoId,nome}=e.detail||{};if(!alunoId)return;for(const aberto of raiz.querySelectorAll('dialog[open]'))aberto.close();ui.navegar('mensagens');const chave='a:'+alunoId;
    montarMensagens()?.abrirChave(chave,{chave,tipo:'aluno',id:null,alunoId,nome:nome||'Aluno',categoria:'Alunos',subtitulo:'',ultimaEm:null,ultima:'',naoLidas:0,mostrarAutor:true});};
   raiz.addEventListener('sipa-conversar-aluno',conversarComAluno);raiz.addEventListener('sipa-mensagem-iniciar',conversarComAluno);
   const contar=async()=>{try{marcar((await fonte.listar()).reduce((s,i)=>s+(i.naoLidas||0),0));}catch{}};
   contar();const relogio=setInterval(()=>{if(!raiz.isConnected){clearInterval(relogio);return;}if(document.visibilityState==='visible'&&raiz.dataset.opSecao!=='mensagens')contar();},60000);
  }
 }
 // 18/11/2026: atestados sem decisão no item Verificações do menu (Recepção, Gerência e Master).
 acompanharVerificacoes(raiz,servico,ui);
 return {servico,ui};
}
