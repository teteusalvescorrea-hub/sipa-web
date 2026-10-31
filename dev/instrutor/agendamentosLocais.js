import {auditar} from '../../shared/js/auditoria.js';
import {exigirInstrutorLocal} from './acessoLocal.js';
import {podeRegistrar} from '../../instrutor/js/dominio.js';
import {exigirPerfil,exigirPersistenciaEstavel} from '../autenticacao.js';
export const CHAVE_VINCULO='sipa.instrutor.dev.vinculo.v1';
const BANCO='sipa.dev.local.v1',OPERADOR='sipa.operador.demo.v2';
async function banco(){
 if(!(await indexedDB.databases()).some(d=>d.name===BANCO))return null;
 return new Promise((resolve,reject)=>{const r=indexedDB.open(BANCO);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});
}
async function registros(){const db=await banco();if(!db)return [];try{return await new Promise((resolve,reject)=>{const r=db.transaction('registros','readonly').objectStore('registros').getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}finally{db.close();}}
function operador(){const bruto=localStorage.getItem(OPERADOR);if(!bruto)return null;let s;try{s=JSON.parse(bruto);}catch{return null;}return s?.versao===2&&Array.isArray(s.recursos)&&Array.isArray(s.aulas)&&Array.isArray(s.alunos)?s:null;}
export async function cadastrosLocais(){
 const conta=await exigirPerfil('instrutor');const lista=await registros(),op=operador();
 return (op?.recursos||[]).filter(r=>r.tipo==='Instrutores'&&r.id===conta.recursoId).map(r=>({origem:'operador',id:r.id,nome:r.nome,unidade:r.unidade}));
}
export async function vincularCadastro(valor){
 exigirInstrutorLocal();if(false){localStorage.setItem(CHAVE_VINCULO,JSON.stringify({origem:'cenario'}));return;}
 const cadastro=(await cadastrosLocais()).find(r=>JSON.stringify([r.origem,r.id])===valor);if(!cadastro)throw new Error('Selecione um cadastro local existente.');
 localStorage.setItem(CHAVE_VINCULO,JSON.stringify({origem:cadastro.origem,id:cadastro.id}));
}
export function vinculoAtual(){const c=exigirInstrutorLocal();return {origem:'operador',id:c.recursoId};}
export async function lerAgendamentosVinculados(){
 await exigirPerfil('instrutor');const vinculo=vinculoAtual();if(vinculo.origem==='cenario')return null;
 const lista=vinculo.origem==='aluno'?await registros():null,op=vinculo.origem==='operador'?operador():null;
 const i=(lista||op?.recursos||[]).find(r=>r.id===vinculo.id&&r.tipo===(lista?'instrutor':'Instrutores'));if(!i)throw new Error('O cadastro de Instrutor vinculado não está disponível. Selecione outro cadastro de desenvolvimento.');
 const aulas=(lista?lista.filter(r=>r.tipo==='aula'&&r.instrutor===i.id):(op?.aulas||[]).filter(r=>r.instrutorId===i.id)).map(r=>{
  const aluno=(lista||op.alunos).find(a=>a.id===(lista?r.aluno:r.alunoId));
  const v=(lista||op.recursos).find(v=>v.id===(lista?r.veiculo:r.veiculoId)&&v.tipo===(lista?'veiculo':'Veículos'));
  const {solicitacaoMedica,...publica}=r;
  return {...publica,id:r.id,aluno:{id:lista?r.aluno:r.alunoId,nome:aluno?.nome||'Aluno não identificado'},instrutorId:i.id,veiculoId:lista?r.veiculo:r.veiculoId,instrutor:{nome:i.nome},veiculo:v?{id:v.id,modelo:v.modelo||v.nome,placa:v.placa||v.documento||null}:null,inicio:lista?r.inicio:r.data+'T'+r.inicio+':00-03:00',fim:lista?r.fim:r.data+'T'+r.fim+':00-03:00',origemLocal:vinculo.origem,historico:r.historico||[]};
 });
 const veiculoId=i.veiculoId||(i.veiculoIds?.length===1?i.veiculoIds[0]:null),veiculo=(lista||op?.recursos||[]).find(v=>v.id===veiculoId);
 return {instrutor:{...i,categorias:i.categorias||[],ativo:i.ativo===true},veiculo:veiculo?{...veiculo,modelo:veiculo.modelo||veiculo.nome,placa:veiculo.placa||veiculo.documento}: {modelo:'Consultar veículo em cada aula',placa:'Não informado'},aulas};
}
export async function registrarAgendamentoVinculado(id,status){
 exigirInstrutorLocal();if(![5,6].includes(status))throw new Error('Ação não permitida.');
 const vinculo=vinculoAtual();if(!['aluno','operador'].includes(vinculo.origem))throw new Error('Selecione um cadastro vinculado.');
 if(!navigator.locks)throw new Error('Controle de concorrência indisponível.');
 await navigator.locks.request(vinculo.origem==='aluno'?'sipa.dev.local.registros':'sipa.operador.demo.v2',async()=>{exigirPersistenciaEstavel();
  exigirInstrutorLocal();if(JSON.stringify(vinculo)!==JSON.stringify(vinculoAtual()))throw new Error('O vínculo mudou. Consulte novamente a aula.');
  const atual=await lerAgendamentosVinculados(),aula=atual.aulas.find(a=>a.id===id);if(!atual.instrutor.ativo||!podeRegistrar(aula,vinculo.id))throw new Error('Instrutor inativo ou aula futura, encerrada ou não vinculada a este instrutor.');
  const em=new Date().toISOString(),evento={status,em,autor:vinculo.id,acao:status===5?'realizada':'falta'};
  if(vinculo.origem==='aluno'){
   const db=await banco();try{await new Promise((resolve,reject)=>{const tx=db.transaction('registros','readwrite'),store=tx.objectStore('registros'),r=store.get(id);r.onsuccess=()=>{const a=r.result;if(a?.instrutor!==vinculo.id||a.status!==1){tx.abort();return;}store.put({...a,status,validadaEm:em,historico:[...(a.historico||[]),evento]});};tx.oncomplete=resolve;tx.onabort=()=>reject(new Error('Registro alterado; operação recusada.'));tx.onerror=()=>reject(tx.error);});}finally{db.close();}
  }else{const op=operador(),a=op?.aulas.find(a=>a.id===id);if(!a||a.instrutorId!==vinculo.id||a.status!==1)throw new Error('Registro alterado; operação recusada.');const antes=structuredClone(a);a.status=status;a.validadaEm=em;a.historico=[...(a.historico||[]),evento];localStorage.setItem(OPERADOR,JSON.stringify(auditar(op,{id:vinculo.id,perfil:'instrutor',unidade:a.unidade},status===5?'presenca':'falta',a.id,antes,a)));}
 });
}
