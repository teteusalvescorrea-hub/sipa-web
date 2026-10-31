import {mensagensDoAluno} from '../../shared/js/mensagensAluno.js';
import {auditarDiferencas} from '../../shared/js/auditoria.js';
import {exigirPersistenciaEstavel} from '../autenticacao.js';
import {prepararOnibusTemporario} from '../operador/onibusTemporario.js';
// Laboratório fictício, sem API/JWT. Não constitui autenticação de produção.
// O snapshot único torna cadastro + conta atômicos; não toca no IndexedDB antigo.
import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
import {repositorioDemo,CHAVE_DEMO} from '../operador/repositorioDemo.js';
import {derivar,segredo} from './authLocal.js';
export const CHAVE_CONTA_RECEPCAO='sipa.dev.aluno.recepcao.v1';
const bytes=s=>new TextEncoder().encode(s);
export async function resumirSegredo(valor){return [...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes(valor)))].map(n=>n.toString(16).padStart(2,'0')).join('');}
export function exigirLaboratorio(){if(!desenvolvimentoAtivo())throw new Error('Contas locais indisponíveis neste ambiente.');}
// EXCLUSIVO DO LABORATÓRIO. Substituir por recuperação segura no backend.
// A credencial é derivada do login persistido, nunca de CPF enviado pelo cliente.
export async function prepararRedefinicaoAlunoLocal(conta,{justificativa}={}){
 exigirLaboratorio();
 const cpf=String(conta?.login||'').replace(/\D/g,'');
 if(conta?.perfil!=='ALUNO'||!/^\d{11}$/.test(cpf))throw new Error('Conta de aluno inválida para redefinição local.');
 const provisoria=cpf.slice(0,6);
 if(String(justificativa||'').includes(provisoria))throw new Error('Não inclua a senha provisória na justificativa.');
 const credencial=await segredo(provisoria);exigirLaboratorio();return credencial;
}
export async function prepararAcessoAluno(alunoId,cpf){
 exigirLaboratorio();if(!/^\d{11}$/.test(cpf))throw new Error('CPF inválido para o acesso local.');
 return {id:'acesso-'+alunoId,alunoId,perfil:'ALUNO',login:cpf,...await segredo(cpf.slice(0,6)),algoritmo:'PBKDF2-SHA256',iteracoes:600000,ativa:true,trocaObrigatoria:true,versaoSenha:1,criadaEm:new Date().toISOString()};
}
function repositorio(){
 exigirLaboratorio();const endereco=new URL('/nivel-1-operador/html/operador-cfc.html?demo=1',location.href).href;
 const repo=repositorioDemo(endereco,localStorage);
 return {ler(){exigirLaboratorio();if(!localStorage.getItem(CHAVE_DEMO))return {versao:2,alunos:[],aulas:[],recursos:[]};const e=repo.carregar();if(repo.aviso)throw new Error('Dados locais incompatíveis. Nenhuma informação foi substituída.');return e;},salvar(e){exigirLaboratorio();if(!repo.salvar(e))throw new Error('Não foi possível salvar a operação local.');}};
}
async function sobLock(operacao){exigirLaboratorio();if(!navigator.locks)throw new Error('Controle de escrita local indisponível.');return navigator.locks.request(CHAVE_DEMO,()=>{exigirPersistenciaEstavel();return operacao();});}
const tokenAtual=()=>{try{return JSON.parse(sessionStorage.getItem(CHAVE_CONTA_RECEPCAO)||'null')?.token||null;}catch{return null;}};
export function temSessaoRecepcao(){exigirLaboratorio();return !!sessionStorage.getItem(CHAVE_CONTA_RECEPCAO);}
export async function sairContaRecepcao(){exigirLaboratorio();try{const token=tokenAtual();if(token){const hash=await resumirSegredo(token),repo=repositorio();await sobLock(async()=>{const e=repo.ler();e.sessoesAlunos=(e.sessoesAlunos||[]).filter(s=>s.tokenHash!==hash);repo.salvar(e);});}}finally{sessionStorage.removeItem(CHAVE_CONTA_RECEPCAO);}}
async function autorizarSessao(e,permitirPendente=false){
 const token=tokenAtual(),hash=token&&await resumirSegredo(token),s=e.sessoesAlunos?.find(s=>s.tokenHash===hash&&s.expira>Date.now()),c=e.contasAlunos?.find(c=>c.id===s?.contaId&&c.ativa&&c.perfil==='ALUNO');
 if(!c||s.versaoSenha!==c.versaoSenha||!e.alunos.some(a=>a.id===c.alunoId&&a.contaId===c.id))throw new Error('Sessão local inválida ou expirada. Entre novamente.');
 const pendente=c.trocaObrigatoria!==false||!c.ativadaEm;
 if(pendente&&!permitirPendente)throw Object.assign(new Error('Defina sua nova senha antes de acessar o painel.'),{codigo:'troca_obrigatoria'});
 return {conta:c,sessao:s,pendente};
}
function novaSessao(c,tokenHash){return {contaId:c.id,tokenHash,expira:Date.now()+2*3600000,versaoSenha:c.versaoSenha};}
export async function autenticarContaRecepcao(cpf,senha){
 exigirLaboratorio();const login=String(cpf||'').replace(/[.\-\s]/g,'');if(!/^\d{11}$/.test(login)||typeof senha!=='string'||!senha||senha.length>128)throw new Error('Credenciais locais inválidas.');
 const repo=repositorio(),token=crypto.randomUUID()+crypto.randomUUID(),tokenHash=await resumirSegredo(token),chave=await resumirSegredo(login);
 const resultado=await sobLock(async()=>{
  const e=repo.ler(),limite=e.tentativasAcesso?.[chave];
  if((e.bloqueioLoginAte||0)>Date.now()||(limite?.ate||0)>Date.now())throw new Error('Muitas tentativas. Aguarde 15 minutos antes de tentar novamente.');
  const conta=e.contasAlunos?.find(c=>c.login===login&&c.perfil==='ALUNO'&&c.ativa),valida=conta&&await derivar(senha,conta.sal)===conta.hash;
  if(!valida){const n=(limite?.quantidade||0)+1,total=(e.falhasLogin||0)+1;e.tentativasAcesso={...e.tentativasAcesso,[chave]:{quantidade:n,ate:n>=5?Date.now()+15*60000:0}};e.falhasLogin=total;e.bloqueioLoginAte=total>=20?Date.now()+15*60000:0;repo.salvar(e);throw new Error('Credenciais locais inválidas.');}
  delete e.tentativasAcesso?.[chave];e.falhasLogin=0;e.bloqueioLoginAte=0;
  e.sessoesAlunos=[...(e.sessoesAlunos||[]).filter(s=>s.expira>Date.now()),novaSessao(conta,tokenHash)];repo.salvar(e);
  return {trocaObrigatoria:conta.trocaObrigatoria!==false||!conta.ativadaEm};
 });
 sessionStorage.setItem(CHAVE_CONTA_RECEPCAO,JSON.stringify({token}));return resultado;
}
export async function estadoAcessoRecepcao(){const repo=repositorio(),{pendente}=await autorizarSessao(repo.ler(),true);return {trocaObrigatoria:pendente};}
export async function definirSenhaRecepcao(nova,confirmacao){
 exigirLaboratorio();if(typeof nova!=='string'||nova.length<4||nova.length>128)throw new Error('Use uma senha com no mínimo 4 e no máximo 128 caracteres.');if(nova!==confirmacao)throw new Error('A confirmação da senha não confere.');
 const repo=repositorio(),novoSegredo=await segredo(nova),token=crypto.randomUUID()+crypto.randomUUID(),tokenHash=await resumirSegredo(token);
 await sobLock(async()=>{const e=repo.ler(),{conta}=await autorizarSessao(e,true);if(await derivar(nova,conta.sal)===conta.hash)throw new Error('Use uma senha diferente da anterior.');
  const c={...conta,...novoSegredo,trocaObrigatoria:false,ativadaEm:new Date().toISOString(),versaoSenha:(conta.versaoSenha||0)+1};e.contasAlunos=e.contasAlunos.map(x=>x.id===c.id?c:x);e.sessoesAlunos=[...(e.sessoesAlunos||[]).filter(s=>s.contaId!==c.id&&s.expira>Date.now()),novaSessao(c,tokenHash)];
  const a=e.alunos.find(a=>a.id===c.alunoId);a.acesso='Ativo';a.primeiroAcessoEm=a.primeiroAcessoEm||c.ativadaEm;a.historico.push({tipo:'ativacao-local',em:c.ativadaEm,responsavel:c.id,depois:'Nova senha local definida; etapa de ativação concluída.'});repo.salvar(e);
 });sessionStorage.setItem(CHAVE_CONTA_RECEPCAO,JSON.stringify({token}));
}
export async function consultarMinhaContaRecepcao(){
 const e=repositorio().ler(),{conta}=await autorizarSessao(e),a=e.alunos.find(a=>a.id===conta.alunoId);
 // Não aceita CPF/ID de consulta: a identidade da sessão é a única origem do vínculo.
 return {aluno:structuredClone(a),aulas:e.aulas.filter(x=>x.alunoId===a.id).map(x=>({...structuredClone(x),instrutor:e.recursos.find(r=>r.id===x.instrutorId)?.nome||'Não informado',veiculo:e.recursos.find(r=>r.id===x.veiculoId)?.nome||'Não informado'}))};
}

export async function alterarSenhaContaRecepcao({atual,nova,confirmacao}){
 exigirLaboratorio();if(typeof nova!=='string'||nova.length<4||nova.length>128||nova!==confirmacao)throw new Error('Informe e confirme uma senha de 4 a 128 caracteres.');
 const repo=repositorio(),novo=await segredo(nova);
 await sobLock(async()=>{const e=repo.ler(),{conta,sessao}=await autorizarSessao(e);if(typeof atual!=='string'||await derivar(atual,conta.sal)!==conta.hash)throw new Error('Senha atual incorreta.');if(nova===atual)throw new Error('Use uma senha diferente da atual.');
  const c={...conta,...novo,versaoSenha:conta.versaoSenha+1};e.contasAlunos=e.contasAlunos.map(x=>x.id===c.id?c:x);e.sessoesAlunos=e.sessoesAlunos.filter(s=>s.contaId!==c.id||s.tokenHash===sessao.tokenHash).map(s=>s.tokenHash===sessao.tokenHash?{...s,versaoSenha:c.versaoSenha}:s);repo.salvar(e);
 });
}

// Porta do painel original: identidade derivada da sessão, sem ID/CPF solicitado.
// Ocupações de terceiros não carregam identidade nem dados pessoais do aluno.
export async function operarPainelRecepcao(operacao,escrever=false){
 const executar=async()=>{const repo=repositorio();let e=repo.ler();const antes=structuredClone(e),{conta}=await autorizarSessao(e),a=e.alunos.find(a=>a.id===conta.alunoId);
  const contexto={aluno:structuredClone(a),recursos:structuredClone(e.recursos),aulas:structuredClone(e.aulas.filter(x=>x.alunoId===a.id)),ocupacoes:e.aulas.filter(x=>x.alunoId!==a.id).map(x=>({id:x.id,categoria:x.categoria,data:x.data,inicio:x.inicio,fim:x.fim,status:x.status,instrutorId:x.instrutorId,veiculoId:x.veiculoId}))};
  const resultado=await operacao(contexto);if(!escrever)return resultado;
  if(!resultado||!Array.isArray(resultado.aulas)||contexto.aulas.some(x=>!resultado.aulas.some(y=>y.id===x.id))||resultado.aulas.some(x=>x.alunoId!==a.id||e.aulas.some(y=>y.id===x.id&&y.alunoId!==a.id)))throw new Error('Operação fora do cadastro autenticado.');
  // Histórico administrativo, exames e provas pertencem aos comandos da recepção.
  // Reservas/preferências do aluno não podem substituir esses campos.
  if(resultado.aluno?.leiturasMensagens&&Object.entries(resultado.aluno.leiturasMensagens).some(([id,em])=>!mensagensDoAluno(a).some(m=>m.id===id)||typeof em!=='string'||Number.isNaN(Date.parse(em))))throw new Error('Leitura de mensagem fora do cadastro autenticado.');
  const campos=['creditos','preferenciasAutomaticas','antecipacao','historicoPreferencias','leiturasMensagens'];const patch=Object.fromEntries(campos.filter(k=>Object.hasOwn(resultado.aluno||{},k)).map(k=>[k,resultado.aluno[k]]));
  e.alunos=e.alunos.map(x=>x.id===a.id?{...x,...patch}:x);e.aulas=[...e.aulas.filter(x=>x.alunoId!==a.id),...resultado.aulas];repo.salvar(auditarDiferencas(antes,e,{id:conta.id,perfil:'aluno',unidade:a.unidadePrincipal||a.unidade}));return resultado.retorno;
 };
 return sobLock(executar);
}
