import {criarCenariosDemo} from './cenarios.js';
import {CHAVES,exigirInstrutorLocal} from './acessoLocal.js';
import {ORIGEM,INSTRUTOR_ID,registrarSituacao,aulasDoInstrutor} from '../../instrutor/js/dominio.js';
import {agendaDeHoje} from '../../instrutor/js/agenda.js';
import {lerAgendamentosVinculados,registrarAgendamentoVinculado,cadastrosLocais,vincularCadastro,vinculoAtual} from './agendamentosLocais.js';
export function criarServicoAutenticado(){const dados=async()=>{const d=await lerAgendamentosVinculados();if(!d)throw new Error('Cadastro indisponível.');return d;};return {demonstracao:false,dados,agendaHoje:async()=>{const d=await dados();return agendaDeHoje(d,d.instrutor.id);},registrar:async(id,status)=>{await registrarAgendamentoVinculado(id,status);return dados();}};}
function ler(){const s=JSON.parse(localStorage.getItem(CHAVES.dados)||'null');if(s&&(s.origem!==ORIGEM||s.versao!==1||s.instrutor?.id!==INSTRUTOR_ID||!Array.isArray(s.aulas)))throw new Error('Dados locais não reconhecidos. Nenhum registro foi alterado.');return s;}
async function alterar(fn){exigirInstrutorLocal();if(!navigator.locks)throw new Error('Este navegador não oferece o controle de concorrência necessário.');return navigator.locks.request('sipa.instrutor.dev.v1',async()=>{exigirInstrutorLocal();const anterior=ler(),novo=fn(anterior);localStorage.setItem(CHAVES.dados,JSON.stringify(novo));return structuredClone(novo);});}
export async function iniciarDados(){exigirInstrutorLocal();const existente=ler();return existente?structuredClone(existente):alterar(s=>s||{...criarCenariosDemo(),aulas:[]});}
export function criarServicoDemo(){
 const dados=async()=>{exigirInstrutorLocal();const s=ler();if(!s)throw new Error('Entre novamente para iniciar os dados de demonstração.');const vinculado=await lerAgendamentosVinculados();return vinculado?{...structuredClone(s),...vinculado}:{...structuredClone(s),aulas:structuredClone(aulasDoInstrutor(s,INSTRUTOR_ID))};};
 // Sem parâmetro de data: URL ou controles não podem escolher outro dia.
 // Na API real, este contrato deverá usar data/tempo e autorização do servidor.
 return {demonstracao:true,dados,cadastrosLocais,vinculoAtual,vincularCadastro,agendaHoje:async()=>{const s=await dados();return agendaDeHoje(s,s.instrutor.id);},registrar:async(id,status)=>{if(vinculoAtual().origem!=='cenario')await registrarAgendamentoVinculado(id,status);else await alterar(s=>registrarSituacao(s,id,INSTRUTOR_ID,status));return dados();},reiniciar:async confirmado=>{if(vinculoAtual().origem!=='cenario')throw new Error('Reservas vinculadas não podem ser reiniciadas pelo Instrutor.');if(confirmado!==true)throw new Error('Confirme a restauração dos dados fictícios.');await alterar(s=>{if(s?.aulas.some(a=>a.instrutorId!==INSTRUTOR_ID||a.origem!==ORIGEM))throw new Error('Há registros fora deste instrutor. A restauração foi recusada.');return criarCenariosDemo();});return dados();}};
}
