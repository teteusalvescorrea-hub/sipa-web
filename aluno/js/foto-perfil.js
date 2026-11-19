// 09/11/2026: a foto de perfil do aluno (Meu perfil). Clicar na imagem escolhe uma foto (JPG ou PNG, até 5 MB); com foto,
// abre as opções de trocar ou remover. A foto vai como fundo do quadrado, então a inicial (texto) pode ser reescrita à vontade.
import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
import {confirmarAcao,avisarErro} from '../../shared/components/confirmarAcao.js';

const avatar=document.getElementById('profile-avatar');
if(avatar&&!desenvolvimentoAtivo()){
 const api=await import('../../shared/js/api.js');
 let urlAtual=null,temFoto=false;
 const entrada=document.createElement('input');entrada.type='file';entrada.accept='.jpg,.jpeg,.png,image/jpeg,image/png';entrada.hidden=true;document.body.append(entrada);
 avatar.classList.add('profile-avatar-editavel');avatar.tabIndex=0;avatar.setAttribute('role','button');
 const rotular=()=>{const r=temFoto?'Trocar ou remover a foto de perfil':'Colocar uma foto de perfil';avatar.setAttribute('aria-label',r);avatar.title=r;};

 function mostrar(blob){
  if(urlAtual)URL.revokeObjectURL(urlAtual);urlAtual=blob?URL.createObjectURL(blob):null;temFoto=!!blob;
  // 10/11/2026: com prioridade (o CSS do perfil fixa o fundo do avatar com !important; sem foto aparece o boneco padrão).
  for(const [p,v] of [['background-image',urlAtual?`url("${urlAtual}")`:''],['background-size',urlAtual?'cover':''],['background-position',urlAtual?'center':'']]){if(v)avatar.style.setProperty(p,v,'important');else avatar.style.removeProperty(p);}
  avatar.classList.toggle('profile-avatar-com-foto',temFoto);rotular();
 }
 async function carregar(){try{mostrar(await api.Get('alunos/me/foto',{binario:true}));}catch{mostrar(null);}}

 entrada.onchange=async()=>{
  const arquivo=entrada.files[0];entrada.value='';if(!arquivo)return;
  if(!/^image\/(jpeg|png)$/.test(arquivo.type)){avisarErro('Escolha uma foto JPG ou PNG.',{titulo:'Foto não aceita'});return;}
  if(arquivo.size>5*1024*1024){avisarErro('A foto deve ter até 5 MB.',{titulo:'Foto muito grande'});return;}
  avatar.classList.add('profile-avatar-enviando');
  try{const corpo=new FormData();corpo.append('arquivo',arquivo,arquivo.name||'foto');await api.Post('alunos/me/foto',corpo);mostrar(arquivo);}
  catch(e){avisarErro(e?.message||'Não foi possível salvar a foto.');}
  finally{avatar.classList.remove('profile-avatar-enviando');}
 };

 function opcoes(){
  if(!temFoto){entrada.click();return;}
  const d=document.createElement('dialog');d.className='profile-foto-dialog';d.setAttribute('aria-label','Foto de perfil');
  const titulo=document.createElement('h2');titulo.textContent='Foto de perfil';
  const previa=document.createElement('div');previa.className='profile-foto-previa';previa.style.backgroundImage=avatar.style.backgroundImage;
  const acoes=document.createElement('div');acoes.className='profile-foto-acoes';
  const botao=(texto,classe,acao)=>{const b=document.createElement('button');b.type='button';b.textContent=texto;b.className=classe;b.onclick=acao;return b;};
  acoes.append(
   botao('Trocar foto','profile-foto-principal',()=>{d.close();entrada.click();}),
   botao('Remover foto','profile-foto-remover',async()=>{if(!await confirmarAcao('Remover a sua foto de perfil?',{titulo:'Remover foto',confirmar:'Remover',perigo:true}))return;try{await api.Post('alunos/me/foto/remover',{});mostrar(null);d.close();}catch(e){avisarErro(e?.message||'Não foi possível remover a foto.');}}),
   botao('Cancelar','profile-foto-cancelar',()=>d.close()));
  d.append(titulo,previa,acoes);d.addEventListener('close',()=>d.remove(),{once:true});document.body.append(d);d.showModal();
 }
 avatar.addEventListener('click',opcoes);
 avatar.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();opcoes();}});
 rotular();carregar();
}
