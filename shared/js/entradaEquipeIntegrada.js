// Entrada integrada dos painéis da equipe (ADM 1, 2 e 3): sessão da API,
// identidade pelo equipe/me e serviço HTTP. Sem nada de dev/ (M4).
import {exigirLogin} from './sessao.js';
import {sair} from './services/authService.js';
import {carregarIdentidadeEquipe,criarServicoAdministrativoIntegrado} from './services/administracaoIntegrada.js';
import {montarUnidade} from '../../nivel-1-operador/js/components/unidadeOperador.js';
import {acompanharHorariosLiberados} from './avisoAntecipacao.js';
import {acompanharMensagens} from './avisoMensagens.js';

// Unidade de consulta do Master (seletor do painel, por aba).
function unidadeEscolhida(){try{return Object.entries(sessionStorage).find(([k])=>k.startsWith('sipa.admin.unidade.'))?.[1]||null;}catch{return null;}}

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
  // Conversa com os alunos: caixa da Recepção, com o contador de não lidas no item do menu.
  if(identidade.permissoes.includes('mensagens')){
   const host=ui.registrarSecao('mensagens','Mensagens','Conversas dos alunos com a Recepção.');
   raiz.querySelector('[data-op-nav=mensagens]')?.addEventListener('click',async()=>{try{await (await import('../components/mensagensPainel.js')).montarMensagensPainel(host,servico,raiz,ui);}catch(e){host.textContent=e.message;}});
   acompanharMensagens(raiz,servico,ui);
  }
 }
 return {servico,ui};
}
