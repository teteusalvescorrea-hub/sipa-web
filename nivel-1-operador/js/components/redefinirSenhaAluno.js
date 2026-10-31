import {el,botao,modal} from './uiOperador.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {formatarCpf} from '../../../shared/js/formatacao.js';

export async function montarAcessoAluno(host,aluno,{raiz,servico,reabrir}){
 const secao=el('section',undefined,'op-reset-access');secao.append(el('h4','Redefinir senha'));host.append(secao);
 if(!servico.identidade.permissoes.includes('redefinir-senha-aluno')){secao.append(el('p','Sem permissão para redefinir a senha deste aluno.','op-help'));return;}
 let acesso;try{acesso=await servico.acessoAluno(aluno.id);}catch(e){secao.append(el('p','Redefinição indisponível: '+e.message,'op-help'));return;}
 const dados=el('dl',undefined,'op-fields'),situacao=!acesso.possuiConta?'Sem conta de acesso':!acesso.ativa?'Conta desativada':acesso.trocaObrigatoria?(acesso.ultimaRedefinicao?'Redefinição pendente':'Primeiro acesso pendente'):'Ativa';
 for(const [label,valor]of [['Nome completo',acesso.nome],['CPF cadastrado',formatarCpf(acesso.cpf)],['Situação do acesso',situacao],['Última redefinição',acesso.ultimaRedefinicao?new Date(acesso.ultimaRedefinicao).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não realizada']]){const linha=el('div');linha.append(el('dt',label),el('dd',valor));dados.append(linha);}secao.append(dados);
 if(acesso.possuiConta&&!acesso.ativa){
  secao.append(el('p','Conta desativada. Solicite a regulariza\u00e7\u00e3o ao Master.','op-help'));
 }else{
  const abrir=botao('Redefinir senha do aluno',async()=>{
   abrir.disabled=true;
   try{const atual=await servico.acessoAluno(aluno.id);if(atual.possuiConta&&!atual.ativa)throw new Error('Conta indisponível. Feche e reabra a ficha para consultar a situação atual.');abrirRedefinicao(raiz,aluno.id,atual,servico,reabrir,abrir);}
   catch(e){aviso.textContent=e.message;}finally{abrir.disabled=false;}
  },'op-button op-button-primary');abrir.dataset.opRedefinirAluno=aluno.id;
  const aviso=el('p','','op-help');aviso.setAttribute('role','status');secao.append(abrir,aviso);
 }
}
function abrirRedefinicao(raiz,id,acesso,servico,reabrir,origem){
 const d=modal(raiz,'Confirmar redefini\u00e7\u00e3o de senha','opRedefinirAluno');d.classList.add('op-reset-dialog');
 const descricao=el('p','Tem certeza de que deseja redefinir a senha de '+acesso.nome+'?','op-help');descricao.id='descricao-redefinir-aluno';d.setAttribute('aria-describedby',descricao.id);d.append(descricao);
 const resumo=el('dl',undefined,'op-fields');
 const cpf=String(acesso.cpf).replace(/\D/g,'');
 for(const [label,valor]of [['Nome completo',acesso.nome],['CPF',formatarCpf(cpf)],['Unidade principal',nomeUnidadeInstitucional(acesso.unidadeBase)]]){const linha=el('div');linha.append(el('dt',label),el('dd',valor));resumo.append(linha);}
 const form=el('form',undefined,'op-form-fields'),erro=el('p','','op-help'),acoes=el('footer',undefined,'op-reset-actions');erro.setAttribute('role','alert');
 const cancelar=botao('Cancelar',()=>d.close()),enviar=el('button','Sim, redefinir senha','op-button op-button-primary');enviar.type='submit';
 acoes.append(cancelar,enviar);form.append(el('p','Ao confirmar, a senha atual ser\u00e1 substitu\u00edda pelos seis primeiros n\u00fameros do CPF cadastrado, sem pontos ou tra\u00e7os.','op-inline-note'),el('p','O aluno poder\u00e1 utilizar essa senha provis\u00f3ria para entrar novamente no SIPA e dever\u00e1 cadastrar uma senha pessoal de sua prefer\u00eancia no pr\u00f3ximo acesso.','op-help'),el('p','Esta opera\u00e7\u00e3o ficar\u00e1 registrada no hist\u00f3rico do sistema.','op-help'),erro,acoes);d.append(resumo,form);
 let salvando=false;
 d.addEventListener('cancel',e=>{if(salvando)e.preventDefault();});
 form.addEventListener('submit',async e=>{
  e.preventDefault();if(salvando)return;erro.textContent='';
  salvando=true;enviar.textContent='Redefinindo\u2026';d.setAttribute('aria-busy','true');d.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=true);
  try{
   const resultado=await servico.redefinirSenhaAluno(id,{justificativa:'Recupera\u00e7\u00e3o de acesso solicitada pelo atendimento administrativo.'});
   d.close();
   let atualizada=true;try{await reabrir();}catch{atualizada=false;}
   const sucesso=modal(raiz,resultado.acessoCriado?'Acesso criado com sucesso!':'Senha redefinida com sucesso!','opSenhaRedefinida');sucesso.classList.add('op-reset-dialog');
   sucesso.append(el('p',resultado.acessoCriado?'O acesso do aluno '+acesso.nome+' foi criado com sucesso.':'A senha de acesso de '+acesso.nome+' foi redefinida com sucesso.','op-help'));
   if(resultado.acessoCriado)sucesso.append(el('p','O acesso do aluno foi criado e vinculado ao cadastro existente.','op-inline-note'));
   sucesso.append(el('p','A nova senha provis\u00f3ria corresponde aos seis primeiros n\u00fameros do CPF cadastrado, sem pontos ou tra\u00e7os.','op-help'),el('p','O aluno j\u00e1 pode acessar o SIPA utilizando seu CPF e essa senha. No pr\u00f3ximo acesso, dever\u00e1 cadastrar uma nova senha pessoal de sua prefer\u00eancia, que substituir\u00e1 a senha provis\u00f3ria.','op-help'),el('p','A redefini\u00e7\u00e3o foi registrada no hist\u00f3rico do sistema.','op-help'));
   if(!atualizada)sucesso.append(el('p','N\u00e3o foi poss\u00edvel atualizar a ficha. Feche e reabra para consultar a situa\u00e7\u00e3o atual.','op-help'));
   sucesso.append(botao('Entendi',()=>sucesso.close(),'op-button op-button-primary'));sucesso.addEventListener('close',()=>sucesso.remove(),{once:true});sucesso.showModal();
  }catch(e){erro.textContent=e.message;}
  finally{salvando=false;d.removeAttribute('aria-busy');d.querySelectorAll('button,input,textarea').forEach(n=>n.disabled=false);enviar.textContent='Sim, redefinir senha';}
 });
 d.addEventListener('close',()=>{d.remove();if(origem.isConnected)origem.focus();},{once:true});d.showModal();cancelar.focus();
}
