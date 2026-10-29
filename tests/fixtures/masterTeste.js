import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
import {UNIDADES_INSTITUCIONAIS} from '../../shared/js/catalogoUnidades.js';
import {permissoesDoPerfil} from '../../shared/js/permissoesAdministrativas.js';
import {CHAVE_AUTH,CHAVE_TRANSACAO} from '../../dev/autenticacao.js';

// Configuração nominal solicitada para esta cópia de testes. Excluir dev/ na
// entrega integrada. Não altera o validador geral nem dispensa autenticação.
export const MASTER_TESTE_LOCAL_HABILITADO=true;
const CPF='12312312311',MARCADOR='master-teste-local-v1';
export const BACKUP_MASTER_TESTE='sipa.backup.master-teste-local.v1';
const credencial={sal:'be22a71033e87d33c9203aed92419b90300f29be0c9d9382',hash:'07a56686085a18c0c254f5b51868b5e3fd998be8391b3cdd923d52dad03a8504'};
export function origemMasterTestePermitida(){
 try{const u=new URL(location.href);return MASTER_TESTE_LOCAL_HABILITADO&&desenvolvimentoAtivo()&&u.hostname==='127.0.0.1'&&u.pathname==='/login.html';}catch{return false;}
}
export async function prepararMasterTeste({permitirInstalacaoNova=false}={}){
 if(!origemMasterTestePermitida())return false;
 if(!navigator.locks)throw new Error('Controle de gravação local indisponível.');
 return navigator.locks.request(CHAVE_AUTH,async()=>{
  if(!origemMasterTestePermitida())return false;
  if(localStorage.getItem(CHAVE_TRANSACAO))throw new Error('Recupere a operação local pendente antes de configurar a conta de teste.');
  const antes=localStorage.getItem(CHAVE_AUTH);
  if(antes===null&&!permitirInstalacaoNova)throw new Error('Origem sem autenticação inicializada. Nenhum dado foi substituído.');
  const e=antes===null?{versao:2,contas:[],sessoes:[]}:JSON.parse(antes);
  if(!Array.isArray(e.contas)||!Array.isArray(e.sessoes))throw new Error('Contas locais incompatíveis. Nenhum dado foi substituído.');
  // Uma ação administrativa posterior não é desfeita por uma recarga do login.
  if(e.preparacoesLocais?.[MARCADOR])return false;
  const normalizar=v=>String(v||'').replace(/[.\-\s]/g,''),mesmas=e.contas.filter(c=>normalizar(c.login)===CPF);
  const operacao=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')||'{"alunos":[],"contasAlunos":[]}');
  if(mesmas.length>1||(operacao.contasAlunos||[]).some(c=>normalizar(c.login)===CPF)||(operacao.alunos||[]).some(a=>normalizar(a.cpf)===CPF))throw new Error('O CPF da conta de teste já está associado a registros conflitantes. Nenhum registro foi alterado.');
  const anterior=mesmas[0];
  if(anterior&&!['operador','gerencia','master'].includes(anterior.perfil))throw new Error('Esse CPF pertence a outro tipo de usuário. Nenhuma conta foi alterada.');
  const em=new Date().toISOString(),conta={...anterior,id:anterior?.id||crypto.randomUUID(),nome:'Master Teste',login:CPF,perfil:'master',unidade:'Vila Velha',unidades:UNIDADES_INSTITUCIONAIS.map(u=>u.id),ativa:true,trocaObrigatoria:false,versaoSenha:(anterior?.versaoSenha||0)+1,permissoes:permissoesDoPerfil('master'),permissoesNegadas:[],algoritmo:'PBKDF2-SHA256',iteracoes:600000,...credencial,origem:MARCADOR};
  const evento={id:crypto.randomUUID(),em,responsavel:'configuracao-local-solicitada',acao:'configuracao-master-teste',contaId:conta.id,perfil:'master',unidade:conta.unidade,justificativa:'Configuração nominal de acesso Master solicitada para testes locais.'};
  const proximo={...e,contas:anterior?e.contas.map(c=>c.id===anterior.id?conta:c):[...e.contas,conta],sessoes:e.sessoes.filter(s=>s.contaId!==conta.id),historicoAcessos:[...(e.historicoAcessos||[]),evento],preparacoesLocais:{...e.preparacoesLocais,[MARCADOR]:{contaId:conta.id,em}}};
  if(!localStorage.getItem(BACKUP_MASTER_TESTE))localStorage.setItem(BACKUP_MASTER_TESTE,JSON.stringify({origem:location.origin,em,authAntes:antes}));
  localStorage.setItem(CHAVE_AUTH,JSON.stringify(proximo));
  return true;
 });
}
