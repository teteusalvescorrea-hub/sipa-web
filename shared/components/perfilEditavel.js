// 13/11/2026 (pedido do usuário): o Master edita o próprio perfil por inteiro no "Meu perfil": foto de identificação,
// nome, e-mail de acesso, telefone e CPF de acesso. E-mail e CPF pedem a senha atual (a API confere e grava na hora para o
// Master). A foto (JPG ou PNG, até 5 MB) aparece no perfil e no selo da barra lateral.
import {el,botao,card,modal,mostrarToast} from '../../nivel-1-operador/js/components/uiOperador.js';
import {formularioAdministrativo} from './formularioAdministrativo.js';
import {formatarCpf,ativarMascaraCpf} from '../js/formatacao.js';
import {confirmarAcao,avisarErro} from './confirmarAcao.js';

const iniciaisDe=nome=>String(nome||'').trim().split(/\s+/).slice(0,2).map(p=>p[0]||'').join('').toUpperCase();
const digitos=v=>String(v||'').replace(/\D/g,'');
export function telefoneLegivel(t){const d=digitos(t);return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:d;}

// A foto de quem está logado: uma URL só para a página (o perfil e o selo da barra lateral usam a mesma).
let urlFoto=null;
function pintar(alvo,url,iniciais){if(!alvo)return;alvo.textContent=url?'':iniciais;alvo.classList.toggle('sipa-com-foto',!!url);
 if(url){alvo.style.setProperty('background-image',`url("${url}")`,'important');alvo.style.setProperty('background-size','cover','important');alvo.style.setProperty('background-position','center','important');}
 else for(const p of ['background-image','background-size','background-position'])alvo.style.removeProperty(p);}
export async function carregarFoto(servico,temFoto){
 if(urlFoto){URL.revokeObjectURL(urlFoto);urlFoto=null;}
 if(!temFoto||!servico.minhaFoto)return null;
 try{const blob=await servico.minhaFoto();urlFoto=blob?.size?URL.createObjectURL(blob):null;}catch{urlFoto=null;}
 return urlFoto;
}
// O selo da barra lateral (o "CFC" ao lado do nome) com a foto, ou as iniciais.
export function pintarSeloLateral(raiz,url){const selo=raiz.querySelector('.op-operator-label .op-avatar');pintar(selo,url,'CFC');}

export async function montarPerfilEditavel(host,{raiz,servico,op,nomePerfil,unidades,notas,cartaoSenha,vigente=()=>true}){
 let dados={nome:op.nome,email:op.email||'',telefone:'',cpf:'',temFoto:!!op.temFoto};
 try{dados=await servico.meuPerfil();}catch(e){mostrarToast(e.message||'Não foi possível ler o seu perfil.',true);}
 if(!vigente())return;
 const capa=el('header',undefined,'adm-perfil-capa'),identidade=el('div',undefined,'adm-perfil-identidade'),avatar=el('button',undefined,'adm-perfil-avatar adm-perfil-avatar-editavel');
 avatar.type='button';avatar.title='Colocar ou trocar a foto de identificação';avatar.setAttribute('aria-label',avatar.title);
 const camera=el('span','','adm-perfil-camera');camera.setAttribute('aria-hidden','true');
 const nome=el('h2',dados.nome),email=el('p',dados.email||'Conta da equipe');identidade.append(nome,email);
 const editar=botao('Editar perfil',()=>abrirEdicao(),'op-button adm-perfil-editar');editar.dataset.admEditarPerfil='';
 const lado=el('div',undefined,'adm-perfil-lado');lado.append(el('span',nomePerfil+' · ADM '+op.nivel,'adm-perfil-selo'),editar);
 const caixaAvatar=el('div',undefined,'adm-perfil-avatar-caixa');caixaAvatar.append(avatar,camera);
 capa.append(caixaAvatar,identidade,lado);

 const lista=el('dl',undefined,'adm-perfil-dados'),etiquetas=el('ul',undefined,'adm-perfil-unidades'),colunas=el('div',undefined,'adm-perfil-colunas');
 function preencher(){
  nome.textContent=dados.nome;email.textContent=dados.email||'Conta da equipe';lista.replaceChildren();
  for(const [titulo,valor] of [['Nome',dados.nome],['E-mail de acesso',dados.email||'Não informado'],['Telefone',telefoneLegivel(dados.telefone)||'Não informado'],['CPF de acesso',dados.cpf?formatarCpf(dados.cpf):'Não informado'],['Perfil',nomePerfil],['Nível de acesso','ADM '+op.nivel],['Unidades','Todas as unidades']]){const item=el('div');item.append(el('dt',titulo),el('dd',valor));lista.append(item);}
  const rotulo=raiz.querySelector('.op-operator-label strong');if(rotulo)rotulo.textContent=dados.nome;
 }
 async function mostrarFoto(){const url=await carregarFoto(servico,dados.temFoto);pintar(avatar,url,iniciaisDe(dados.nome));pintarSeloLateral(raiz,url);}
 for(const u of unidades)etiquetas.append(el('li',u.nome.replace(/^Unidade\s+/,'')));
 colunas.append(card('Dados do acesso',lista,notas('Clique em "Editar perfil" para mudar o nome, o e-mail, o telefone ou o CPF. Na foto, clique para colocar ou trocar.')),card('Unidades que você acessa',notas('Acesso a todas as unidades da autoescola.'),etiquetas),cartaoSenha({classeCartao:'op-card'}));
 preencher();host.replaceChildren(capa,colunas);await mostrarFoto();

 // Foto: sem foto, já abre a escolha do arquivo; com foto, as opções de trocar ou remover.
 const arquivo=el('input');arquivo.type='file';arquivo.accept='.jpg,.jpeg,.png,image/jpeg,image/png';arquivo.hidden=true;host.append(arquivo);
 arquivo.onchange=async()=>{const f=arquivo.files[0];arquivo.value='';if(!f)return;
  if(!/^image\/(jpeg|png)$/.test(f.type)){avisarErro('Escolha uma foto JPG ou PNG.',{titulo:'Foto não aceita'});return;}
  if(f.size>5*1024*1024){avisarErro('A foto deve ter até 5 MB.',{titulo:'Foto muito grande'});return;}
  avatar.classList.add('adm-perfil-avatar-enviando');
  try{await servico.definirMinhaFoto(f);dados.temFoto=true;await mostrarFoto();mostrarToast('Foto atualizada.');}
  catch(e){avisarErro(e?.message||'Não foi possível salvar a foto.');}
  finally{avatar.classList.remove('adm-perfil-avatar-enviando');}};
 avatar.onclick=()=>{if(!dados.temFoto){arquivo.click();return;}
  const d=modal(raiz,'Foto de identificação','adminFotoPerfil');d.classList.add('adm-foto-dialog');
  const previa=el('div',undefined,'adm-foto-previa');if(urlFoto)previa.style.backgroundImage=`url("${urlFoto}")`;
  const acoes=el('div',undefined,'op-dialog-actions');
  acoes.append(botao('Remover foto',async()=>{d.close();if(!await confirmarAcao('A foto de identificação sai do seu perfil.',{titulo:'Remover foto',confirmar:'Remover',perigo:true}))return;
    try{await servico.removerMinhaFoto();dados.temFoto=false;await mostrarFoto();mostrarToast('Foto removida.');}catch(e){avisarErro(e?.message||'Não foi possível remover a foto.');}}),
   botao('Trocar foto',()=>{d.close();arquivo.click();},'op-button op-button-primary'));
  d.append(previa,acoes);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();};

 // Dados: nome, e-mail, telefone e CPF; e-mail e CPF trocados pedem a senha atual.
 function abrirEdicao(){
  formularioAdministrativo(raiz,'Editar perfil',[['nome','Nome completo','text',dados.nome],['email','E-mail de acesso','email',dados.email],['telefone','Telefone com DDD (opcional)','tel',telefoneLegivel(dados.telefone)],['cpf','CPF de acesso (opcional)','text',dados.cpf?formatarCpf(dados.cpf):''],['senhaAtual','Senha atual (só para trocar o e-mail ou o CPF)','password','']],async v=>{
   const novoEmail=String(v.email||'').trim().toLowerCase(),novoCpf=digitos(v.cpf),trocaLogin=novoEmail!==String(dados.email||'').toLowerCase()||novoCpf!==digitos(dados.cpf);
   if(trocaLogin&&!v.senhaAtual)throw new Error('Para trocar o e-mail ou o CPF, digite a sua senha atual.');
   await servico.salvarMeuPerfil({nome:v.nome,email:novoEmail,telefone:v.telefone,cpf:novoCpf,senhaAtual:trocaLogin?v.senhaAtual:null});
   dados={...dados,...await servico.meuPerfil()};preencher();await mostrarFoto();mostrarToast('Perfil atualizado.');
  },{confirmacao:false,descricao:'Mude o que precisar. O CPF e o e-mail são os seus logins: para trocar algum deles, confirme com a senha atual.'});
  const f=raiz.querySelector('[data-admin-formulario][open]');if(!f)return;
  for(const n of ['telefone','cpf','senhaAtual']){const c=f.querySelector(`[name=${n}]`);if(c)c.required=false;}
  const cpf=f.querySelector('[name=cpf]');if(cpf)ativarMascaraCpf(cpf);const senha=f.querySelector('[name=senhaAtual]');if(senha)senha.autocomplete='current-password';
 }
}
