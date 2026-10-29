import {indicadorMensagens} from '../../aluno/js/components/mensagensAluno.js';
import {exigirLaboratorio,estadoAcessoRecepcao,definirSenhaRecepcao,consultarMinhaContaRecepcao,sairContaRecepcao} from './contaRecepcao.js';
const node=(tag,texto,classe)=>{const e=document.createElement(tag);if(texto!==undefined)e.textContent=texto;if(classe)e.className=classe;return e;};
export async function abrirDefinicaoSenhaRecepcao(){
 exigirLaboratorio();await estadoAcessoRecepcao();
 return new Promise((resolve,reject)=>{
  const d=node('dialog',undefined,'login-dialog'),h=node('h2','Definir nova senha');h.id='definir-senha-recepcao';d.setAttribute('aria-labelledby',h.id);d.dataset.definirSenhaRecepcao='';
  const form=node('form',undefined,'local-form'),nova=node('input'),confirmacao=node('input'),erro=node('p',undefined,'local-feedback'),salvar=node('button','Salvar nova senha'),voltar=node('button','Voltar');erro.setAttribute('role','alert');salvar.type='submit';voltar.type='button';
  for(const [input,titulo,nome] of [[nova,'Nova senha (mínimo de 4 caracteres)','nova'],[confirmacao,'Confirmar nova senha','confirmacao']]){const label=node('label',titulo);input.type='password';input.name=nome;input.required=true;input.minLength=4;input.maxLength=128;input.autocomplete='new-password';label.append(input);form.append(label);}
  let ocupado=false,concluido=false;
  voltar.onclick=()=>{if(!ocupado)d.close();};d.addEventListener('cancel',e=>{if(ocupado)e.preventDefault();});
  form.onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;salvar.disabled=true;voltar.disabled=true;salvar.textContent='Salvando…';try{await definirSenhaRecepcao(nova.value,confirmacao.value);nova.value='';confirmacao.value='';concluido=true;d.close();resolve();}catch(e){erro.textContent=e.message;}finally{ocupado=false;salvar.disabled=false;voltar.disabled=false;salvar.textContent='Salvar nova senha';}};
  d.addEventListener('close',()=>{d.remove();if(!concluido)reject(new Error('Definição de senha pendente. O painel continua bloqueado.'));},{once:true});form.append(erro,voltar,salvar);d.append(h,node('p','Defina uma nova senha antes de acessar suas informações.'),form);document.body.append(d);d.showModal();nova.focus();
 });
}
// A conta recebe um adaptador; nenhuma p?gina original ? substitu?da.
export async function montarPainelContaRecepcao(){
 exigirLaboratorio();
 try{await consultarMinhaContaRecepcao();}catch{document.querySelector('main')?.replaceChildren();location.replace('/login.html?ambiente=local&conta=aluno');return;}
 const {criarServicoContaRecepcao}=await import('./servicoRecepcao.js');
 const {prepararPaginaLocal}=await import('./painelLocal.js');
 const servico=criarServicoContaRecepcao();await prepararPaginaLocal('aluno',servico);document.body.dataset.sipaOrigem='recepcao';
 function avisos(dados){indicadorMensagens(dados.aluno);document.getElementById('sipa-avisos-internos')?.remove();}
 avisos(await servico.dadosAlunoLocal());
 let assinatura=JSON.stringify(await servico.dadosAlunoLocal()),atualizando=false;
 const verificar=async()=>{if(atualizando)return;atualizando=true;try{
  const dados=await servico.dadosAlunoLocal(),nova=JSON.stringify(dados);indicadorMensagens(dados.aluno);if(nova===assinatura||document.querySelector('dialog[open]'))return;
  const pagina=location.pathname.split('/').at(-1);
  if(pagina==='agendamento.html')window.dispatchEvent(new Event('sipa-recursos-atualizados'));
  else if(pagina==='dashboard.html'){const {apresentarDashboard}=await import('../../aluno/js/dashboard.js');apresentarDashboard(dados);}
  else if(pagina==='meu-progresso.html'){const {apresentarProgresso}=await import('../../aluno/js/components/painelAluno.js');apresentarProgresso(dados);}
  else if(pagina==='minhas-aulas.html'){const {apresentarAulas}=await import('../../aluno/js/components/painelAluno.js');await apresentarAulas(servico,dados);}
  else if(pagina==='meu-perfil.html'){const {apresentarPerfil}=await import('../../aluno/js/components/painelAluno.js');apresentarPerfil(dados);}
  avisos(dados);assinatura=nova;
 }catch{document.querySelector('main')?.replaceChildren();location.replace('/login.html?ambiente=local&conta=aluno');}finally{atualizando=false;}};
 window.addEventListener('focus',verificar);window.addEventListener('storage',e=>{if(e.key==='sipa.operador.demo.v2')verificar();});document.addEventListener('close',verificar,true);setInterval(verificar,15000);
 window.addEventListener('pagehide',()=>document.querySelector('main')?.replaceChildren());window.addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
}
