import {inicializarAdministracao} from './contasAdministrativas.js';
import {exigirAdministrativo} from './autenticacao.js';
import {ativarMascaraCpf} from '../shared/js/formatacao.js';
const f=document.getElementById('inicializar-administracao'),retorno=document.getElementById('retorno');let ocupado=false;
try{const c=await exigirAdministrativo(1);if(c.id!=='recepcao-inicial'||c.perfil!=='operador')throw new Error('Entre com a conta inicial da Recepção.');}catch(e){f.querySelector('button').disabled=true;retorno.textContent=e.message;}
ativarMascaraCpf(f.elements.gerenciaCpf);ativarMascaraCpf(f.elements.masterCpf);
f.onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;f.querySelector('button').disabled=true;try{await inicializarAdministracao({senhaRecepcao:f.elements.senhaRecepcao.value,gerencia:{nome:f.elements.gerenciaNome.value,cpf:f.elements.gerenciaCpf.value.replace(/\D/g,''),senha:f.elements.gerenciaSenha.value},master:{nome:f.elements.masterNome.value,cpf:f.elements.masterCpf.value.replace(/\D/g,''),senha:f.elements.masterSenha.value},confirmado:f.elements.confirmado.checked});f.reset();retorno.textContent='Configuração concluída. Entre pelo login e defina a senha de cada conta no primeiro acesso.';}catch(e){retorno.textContent=e.message;f.querySelector('button').disabled=false;}finally{ocupado=false;}};
