import {NIVEIS,RECEPCAO,permissoesDoPerfil} from '../shared/js/permissoesAdministrativas.js';
// Adaptador exclusivo do loopback. A API deverá substituir credenciais, sessão,
// autorização e transações locais antes da distribuição integrada.
import {desenvolvimentoAtivo} from '../shared/js/ambiente.js';
import {UNIDADES_INSTITUCIONAIS} from '../shared/js/catalogoUnidades.js';
export function painelPermitido(perfilConta,painel){return ['aluno','instrutor','operador','gerencia','master'].includes(perfilConta)&&(perfilConta===painel||!!NIVEIS[perfilConta]&&!!NIVEIS[painel]&&NIVEIS[painel]<=NIVEIS[perfilConta]);}
export const CHAVE_AUTH='sipa.acessos.v2',CHAVE_TOKEN='sipa.acesso.sessao.v2',CHAVE_MIGRACAO='sipa.migracao.acessos.v2',CHAVE_BACKUP='sipa.backup.acessos.v2';
const OPERADOR='sipa.operador.demo.v2';
export const CHAVE_TRANSACAO='sipa.administracao.transacao.v1';
let transacaoAtiva=false;
export const transacaoAdministrativaEmCurso=()=>transacaoAtiva;
export function exigirPersistenciaEstavel(){if(globalThis.localStorage?.getItem(CHAVE_TRANSACAO)&&!transacaoAtiva)throw new Error('Recupere a operação administrativa interrompida abrindo o login.');}
function restaurarChave(k,v){if(v===null)localStorage.removeItem(k);else localStorage.setItem(k,v);}
export const PERMISSOES_RECEPCAO=RECEPCAO;
const exigir=()=>{if(!desenvolvimentoAtivo())throw new Error('Acesso indisponível neste ambiente.');};
const ler=()=>JSON.parse(localStorage.getItem(CHAVE_AUTH)||'{"contas":[],"sessoes":[]}');
const salvar=e=>localStorage.setItem(CHAVE_AUTH,JSON.stringify(e));
const lock=f=>{exigir();if(!navigator.locks)throw new Error('Controle de gravação indisponível.');return navigator.locks.request(CHAVE_AUTH,f);};
const pedido=r=>new Promise((resolve,reject)=>{r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
const transacao=t=>new Promise((resolve,reject)=>{t.oncomplete=resolve;t.onabort=t.onerror=()=>reject(t.error||new Error('Falha de armazenamento.'));});
async function credenciais(){return import('./aluno/authLocal.js');}
async function hash(v){return (await import('./aluno/contaRecepcao.js')).resumirSegredo(v);}
async function dadosAntigos(){
 if(!(await indexedDB.databases()).some(d=>d.name==='sipa.dev.local.v1'))return null;
 const db=await pedido(indexedDB.open('sipa.dev.local.v1'));
 try{const nomes=['contas','sessoes'].filter(n=>db.objectStoreNames.contains(n));if(!nomes.length)return null;const tx=db.transaction(nomes),fim=transacao(tx),dados={};await Promise.all(nomes.map(async n=>{dados[n]=await pedido(tx.objectStore(n).getAll());}));await fim;return dados;}finally{db.close();}
}
export async function inicializarAcessos(){
 exigir();return lock(async()=>{
  if(localStorage.getItem(CHAVE_TRANSACAO))await navigator.locks.request(OPERADOR,async()=>{const t=JSON.parse(localStorage.getItem(CHAVE_TRANSACAO));restaurarChave(CHAVE_AUTH,t.authAntes);restaurarChave(OPERADOR,t.operacaoAntes);localStorage.removeItem(CHAVE_TRANSACAO);});
  if(localStorage.getItem(CHAVE_MIGRACAO)==='concluida'&&localStorage.getItem(CHAVE_AUTH))return;
  // Backup preservado antes de recuperar o marcador. Inclui snapshots de
  // autenticação e operação para recuperação de vínculos e migração interrompida.
  if(!localStorage.getItem(CHAVE_BACKUP)){
   const chaves=[OPERADOR,CHAVE_AUTH,'sipa.dev.navegacao.v1','sipa.instrutor.dev.vinculo.v1'];
   const copia={versao:2,criadoEm:new Date().toISOString(),local:Object.fromEntries(chaves.map(k=>[k,localStorage.getItem(k)])),indexedDB:await dadosAntigos()};
   localStorage.setItem(CHAVE_BACKUP,JSON.stringify(copia));if(!JSON.parse(localStorage.getItem(CHAVE_BACKUP))?.criadoEm)throw new Error('Não foi possível confirmar o backup.');
  }
  // Marcador ausente não é autorização para substituir contas ou limpar dados.
  const existente=localStorage.getItem(CHAVE_AUTH);
  if(existente){const e=JSON.parse(existente);if(!Array.isArray(e.contas)||!Array.isArray(e.sessoes))throw new Error('Autenticação local incompatível. Os dados foram preservados.');}
  else{
   const backup=JSON.parse(localStorage.getItem(CHAVE_BACKUP)||'{}'),anterior=backup.local?.[CHAVE_AUTH];
   if(anterior){const e=JSON.parse(anterior);if(!Array.isArray(e.contas)||!Array.isArray(e.sessoes))throw new Error('Backup de autenticação incompatível. Nenhuma credencial foi substituída.');salvar(e);}
   else if((await dadosAntigos())?.contas?.length)throw new Error('Existem credenciais antigas preservadas. É necessária recuperação local antes de criar novos acessos.');
   else throw Object.assign(new Error('Nenhuma conta administrativa foi encontrada nesta origem. Utilize o mesmo endereço e porta do cadastro; nenhuma senha foi criada ou redefinida.'),{codigo:'sem_contas_locais'});
  }
  localStorage.setItem(CHAVE_MIGRACAO,'concluida');
 });
}
export function contextoSessao(){
 if(!desenvolvimentoAtivo())return null;
 try{const t=JSON.parse(sessionStorage.getItem(CHAVE_TOKEN)||'null'),e=ler(),s=e.sessoes.find(s=>s.id===t?.id&&s.expira>Date.now()),c=e.contas.find(c=>c.id===s?.contaId&&c.ativa&&c.versaoSenha===s.versaoSenha),painel=s?.painel||c?.perfil,unidadeOperacional=c?.perfil==='master'&&painel!=='master'?(s?.unidadeOperacional||c.unidade):c?.unidade;if(!c||!painelPermitido(c.perfil,painel)||NIVEIS[painel]&&!UNIDADES_INSTITUCIONAIS.some(u=>u.id===unidadeOperacional))return null;return {...c,unidade:unidadeOperacional,perfilConta:c.perfil,nivelConta:NIVEIS[c.perfil],perfil:painel,painel,unidades:painel==='master'?UNIDADES_INSTITUCIONAIS.map(u=>u.id):[unidadeOperacional],permissoes:permissoesDoPerfil(painel,c.permissoesNegadas||[]),nivel:NIVEIS[painel],hash:undefined,sal:undefined,pendente:c.trocaObrigatoria,expira:s.expira};}catch{return null;}
}
export async function exigirPerfil(perfil,pendente=false){
 exigir();const c=contextoSessao(),t=JSON.parse(sessionStorage.getItem(CHAVE_TOKEN)||'null'),s=ler().sessoes.find(s=>s.id===t?.id);
 if(!c||c.perfil!==perfil||!s||s.tokenHash!==await hash(t.token+(s.painel?'|'+s.painel:'')+(s.unidadeOperacional?'|'+s.unidadeOperacional:''))||!pendente&&c.pendente)throw new Error('Entre novamente com uma conta autorizada.');
 if(perfil==='instrutor'){const e=JSON.parse(localStorage.getItem(OPERADOR)||'{"recursos":[]}');if(!e.recursos.some(r=>r.id===c.recursoId&&r.tipo==='Instrutores'&&r.cpf===c.login&&r.ativo===true))throw new Error('Cadastro de instrutor indisponível.');}
 return c;
}
export function vigiarPerfil(perfil,raiz){
 const verificar=async()=>{try{await exigirPerfil(perfil);}catch{raiz.replaceChildren();location.replace('/login.html');}};
 addEventListener('focus',verificar);addEventListener('storage',e=>{if(e.key===CHAVE_AUTH)verificar();});
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')verificar();});
 addEventListener('pagehide',()=>raiz.replaceChildren());addEventListener('pageshow',e=>{if(e.persisted)location.reload();});
 setInterval(verificar,30000);
}
export async function sair(){
 if(!desenvolvimentoAtivo())return;await lock(async()=>{const t=JSON.parse(sessionStorage.getItem(CHAVE_TOKEN)||'null'),e=ler();e.sessoes=e.sessoes.filter(s=>s.id!==t?.id);salvar(e);});sessionStorage.removeItem(CHAVE_TOKEN);sessionStorage.removeItem('sipa.dev.navegacao.v1');
 const m=await import('./aluno/contaRecepcao.js');if(m.temSessaoRecepcao())await m.sairContaRecepcao();
}
export async function autenticar(cpf,senha,perfil){
 exigir();await inicializarAcessos();await sair();
 const login=String(cpf).replace(/[.\-\s]/g,'');if(!/^\d{11}$/.test(login)||typeof senha!=='string'||!senha||senha.length>128)throw new Error('CPF ou senha inválidos.');
 const e=ler(),operacao=JSON.parse(localStorage.getItem(OPERADOR)||'{"contasAlunos":[]}');
 const normalizar=v=>String(v||'').replace(/[.\-\s]/g,''),alunos=(operacao.contasAlunos||[]).filter(c=>c.ativa&&normalizar(c.login)===login),contas=e.contas.filter(c=>c.ativa&&normalizar(c.login)===login);
 const {derivar}=await credenciais();
 if(perfil==='aluno'&&alunos.length){const m=await import('./aluno/contaRecepcao.js');return {perfil,...await m.autenticarContaRecepcao(login,senha)};}
 let c;for(const candidata of [...contas].sort((a,b)=>Number(b.perfil===perfil)-Number(a.perfil===perfil))){if(await derivar(senha,candidata.sal)===candidata.hash){c=candidata;break;}}
 if(!c){for(const a of alunos)if(await derivar(senha,a.sal)===a.hash)throw new Error('Esta conta não possui permissão para acessar o perfil selecionado.');throw new Error('CPF ou senha inválidos, ou conta indisponível.');}
 if(!painelPermitido(c.perfil,perfil))throw new Error('Esta conta não possui permissão para acessar o perfil selecionado.');
 const preferida=sessionStorage.getItem('sipa.admin.unidade.'+c.id),unidadeOperacional=(c.perfil==='master')&&perfil!=='master'&&UNIDADES_INSTITUCIONAIS.some(u=>u.id===preferida)?preferida:c.unidade;
 const token=crypto.randomUUID()+crypto.randomUUID(),id=crypto.randomUUID(),tokenHash=await hash(token+'|'+perfil+'|'+unidadeOperacional);
 await lock(async()=>{const atual=ler(),conta=atual.contas.find(x=>x.id===c.id&&x.ativa&&x.hash===c.hash&&x.sal===c.sal&&x.versaoSenha===c.versaoSenha);if(!conta)throw new Error('Conta indisponível.');

  atual.sessoes=[...atual.sessoes.filter(s=>s.expira>Date.now()&&s.contaId!==c.id),{id,contaId:c.id,painel:perfil,unidadeOperacional,tokenHash,versaoSenha:c.versaoSenha,expira:Date.now()+2*3600000}];salvar(atual);});
 sessionStorage.setItem(CHAVE_TOKEN,JSON.stringify({id,token}));return {perfil,trocaObrigatoria:c.trocaObrigatoria};
}
export async function definirSenha(nova,confirmacao){
 const atual=contextoSessao();const c=await exigirPerfil(atual?.perfil,true);if(typeof nova!=='string'||nova.length<4||nova.length>128)throw new Error('Use uma senha de 4 a 128 caracteres.');if(nova!==confirmacao)throw new Error('A confirmação da senha não confere.');
 const {segredo,derivar}=await credenciais(),seg=await segredo(nova);await lock(async()=>{const e=ler(),atual=e.contas.find(x=>x.id===c.id);if(!atual?.ativa||atual.versaoSenha!==c.versaoSenha)throw new Error('Sessão expirada.');if(await derivar(nova,atual.sal)===atual.hash)throw new Error('Use uma senha diferente da provisoria.');Object.assign(atual,seg,{trocaObrigatoria:false,versaoSenha:atual.versaoSenha+1});const t=JSON.parse(sessionStorage.getItem(CHAVE_TOKEN));e.sessoes=e.sessoes.filter(s=>s.contaId!==c.id||s.id===t.id).map(s=>s.id===t.id?{...s,versaoSenha:atual.versaoSenha}:s);salvar(e);});
}
export async function prepararContaInstrutor(recurso){
 await exigirAdministrativo(1);const cpf=String(recurso.cpf||'').replace(/\D/g,'');if(!/^\d{11}$/.test(cpf))throw new Error('Informe os 11 dígitos do CPF do instrutor.');
 const {segredo}=await credenciais();return {id:'instrutor-'+recurso.id,recursoId:recurso.id,perfil:'instrutor',login:cpf,nome:recurso.nome,unidade:recurso.unidade,ativa:true,trocaObrigatoria:true,versaoSenha:1,...await segredo(cpf.slice(0,6))};
}
// Conta e recurso são escritos sob os mesmos locks. Se a segunda escrita falhar,
// o snapshot anterior é restaurado; a migração nunca será repetida por recarga.
export async function cadastrarInstrutor(operar,transformar){
 const op=await exigirAdministrativo(1);return transacaoAcessos(async auth=>{await operar(async e=>{const novo=transformar(e),r=novo.recursos.at(-1);if(r.unidade!==op.unidade&&op.nivel===1||op.nivel===2&&!(op.unidades||[]).includes(r.unidade))throw new Error('Unidade nao autorizada.');if(auth.contas.some(c=>c.perfil==='instrutor'&&c.login===r.cpf)||e.recursos.some(i=>i.tipo==='Instrutores'&&i.cpf===r.cpf))throw new Error('CPF de instrutor ja cadastrado.');auth.contas.push(await prepararContaInstrutor(r));return novo;});return auth;});
}

export async function exigirAdministrativo(minimo=2){const c=contextoSessao();if(!c||!NIVEIS[c.perfil]||NIVEIS[c.perfil]<minimo)throw new Error('Permissao administrativa insuficiente.');return exigirPerfil(c.perfil);}
export async function transacaoAcessos(fn){return lock(()=>navigator.locks.request(OPERADOR,async()=>{
 exigirPersistenciaEstavel();
 const authAntes=localStorage.getItem(CHAVE_AUTH),operacaoAntes=localStorage.getItem(OPERADOR);localStorage.setItem(CHAVE_TRANSACAO,JSON.stringify({authAntes,operacaoAntes,em:new Date().toISOString()}));transacaoAtiva=true;
 try{const n=await fn(ler());if(n)salvar(n);localStorage.removeItem(CHAVE_TRANSACAO);return n?true:n;}
 catch(e){restaurarChave(CHAVE_AUTH,authAntes);restaurarChave(OPERADOR,operacaoAntes);localStorage.removeItem(CHAVE_TRANSACAO);throw e;}
 finally{transacaoAtiva=false;}
 }));}
