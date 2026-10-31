import {agoraBrasil,diaSemana} from '../../shared/js/calendario.js';
import {motivoFechamento,validarHorario,fimDaAula,GRADE_CENTRO,horariosDaCategoria} from '../../shared/js/disponibilidade.js';
import {motivoAlmoco} from '../../shared/js/categorias.js';

// Apresentação de uma jornada já resolvida pelo serviço, sem conceder disponibilidade.
// Futuramente o serviço autorizado poderá resolver os horários por instrutor/data.
export function projetarFaixasJornada(horarios){
 if(!horarios.length)return {faixas:[],periodoExibicao:''};
 const horas=[...new Set(horarios)].sort((a,b)=>a-b);
 if(horas.some(h=>!Number.isInteger(h)||h<0||h>23))throw new Error('Jornada de exibição inválida.');
 const formatar=h=>String(h).padStart(2,'0')+':00';
 const faixas=Array.from({length:horas.at(-1)-horas[0]+1},(_,i)=>{const h=horas[0]+i;return {inicio:formatar(h),fim:formatar(h+1),bloqueado:!horas.includes(h)};});
 return {faixas,periodoExibicao:formatar(horas[0])+' — '+fimDaAula(formatar(horas.at(-1)))};
}

// Projeção de leitura exclusiva do Instrutor; não altera a agenda dos outros perfis.
export function agendaDeHoje(estado,instrutorId,instante=new Date()){
 const agora=agoraBrasil(instante),dia=agora.slice(0,10),fechamento=motivoFechamento(dia),sabado=diaSemana(dia)===6;
 const instrutor=estado.instrutor?.id===instrutorId?estado.instrutor:{};
 const categoria=estado.veiculo?.categoria||(instrutor.categorias?.includes('D')?'D':undefined);
 const {faixas,periodoExibicao}=projetarFaixasJornada(fechamento?[]:horariosDaCategoria(dia,categoria));
 for(const faixa of faixas){const motivo=motivoAlmoco(instrutor,faixa.inicio);faixa.bloqueado=faixa.bloqueado||!!motivo;faixa.motivo=motivo;}
 const doDia=estado.aulas.filter(a=>a.instrutorId===instrutorId&&agoraBrasil(new Date(a.inicio)).slice(0,10)===dia).sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio));
 const aulas=[],inconsistencias=[];
 for(let aula of doDia){
  const inicio=agoraBrasil(new Date(aula.inicio)),termino=agoraBrasil(new Date(aula.fim)),hora=inicio.slice(11,16),ate=termino.slice(11,16);
  // Duração padrão vale para novas reservas. Legados de até uma hora são
  // apresentados com seu término original, sem regravar ou chamar de fora do expediente.
  const duracao=Date.parse(aula.fim)-Date.parse(aula.inicio);
  const valido=!validarHorario(dia,hora,GRADE_CENTRO,instrutor,aula.categoria||categoria)&&inicio.slice(17)==='00'&&termino.slice(0,10)===dia&&duracao>0&&duracao<=3600000;
  if(valido&&ate!==fimDaAula(hora))aula={...aula,duracaoAnterior:true};
  (valido?aulas:inconsistencias).push(aula);
 }
 return {dia,agora,fechamento,faixas,periodoExibicao,aulas,inconsistencias};
}
