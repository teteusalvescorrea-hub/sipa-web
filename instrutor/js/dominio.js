import {desempenhoInstrutor,periodoDesempenho} from '../../shared/js/desempenhoInstrutor.js';
import {agoraBrasil} from '../../shared/js/calendario.js';
import {periodoMensal} from './historico.js';
export const ORIGEM='sipa.instrutor.demo.v1';
export const INSTRUTOR_ID='instrutor-demo-01';
export const STATUS=Object.freeze({1:'Confirmada',2:'Cancelada',3:'Aguardando aceite',4:'Recusada',5:'Realizada',6:'Falta'});
export function aulasDoInstrutor(estado,id){return estado.aulas.filter(a=>a.instrutorId===id).sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio));}
export function diaDaAula(a){return a.inicio.slice(0,10);}
export function podeRegistrar(a,id,agora=Date.now()){
 return !!a&&a.instrutorId===id&&a.status===1&&Number.isFinite(Date.parse(a.inicio))&&Date.parse(a.inicio)<=agora;
}
export function registrarSituacao(estado,idAula,instrutorId,status,agora=Date.now()){
 if(![5,6].includes(status))throw new Error('Ação não permitida.');
 const aula=estado.aulas.find(a=>a.id===idAula);
 if(!aula||aula.instrutorId!==instrutorId)throw new Error('Esta aula não pertence ao instrutor autenticado.');
 if(!podeRegistrar(aula,instrutorId,agora))throw new Error(aula.status!==1?'Esta aula já possui uma situação definitiva.':'A aula ainda não começou.');
 if(aula.origem!==ORIGEM||estado.origem!==ORIGEM)throw new Error('O registro não pertence a este ambiente de demonstração.');
 const em=new Date(agora).toISOString();
 return {...estado,aulas:estado.aulas.map(a=>a.id===idAula?{...a,status,validadaEm:em,historico:[...(a.historico||[]),{status,em,autor:instrutorId,acao:status===5?'realizada':'falta'}]}:a)};
}
export function resumoInstrutor(estado,id,agora=Date.now()){
 const dia=agoraBrasil(new Date(agora)).slice(0,10),mes=periodoMensal(dia.slice(0,7)),aulas=aulasDoInstrutor(estado,id);
 const datas=new Map(aulas.filter(a=>Number.isFinite(Date.parse(a.inicio))).map(a=>[a,agoraBrasil(new Date(a.inicio)).slice(0,10)])),hoje=aulas.filter(a=>datas.get(a)===dia);
 const desempenho=Object.fromEntries(['hoje','semana','mes'].map(m=>[m,desempenhoInstrutor(aulas,id,periodoDesempenho(m,{},agora),agora)])),realizadasMes=desempenho.mes.presencas;
 return {hoje,agendadas:hoje.filter(a=>a.status===1).length,realizadas:desempenho.hoje.presencas,faltas:desempenho.hoje.faltas,realizadasMes,realizadasSemana:desempenho.semana.presencas,presencasMes:desempenho.mes.presencas,faltasMes:desempenho.mes.faltas,proxima:aulas.find(a=>a.status===1&&Date.parse(a.inicio)>agora)||null};
}
