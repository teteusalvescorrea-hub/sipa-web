import {localReservaCarro} from './operacaoCarro.js';
import {dataValida,diaSemana,agoraBrasil} from './calendario.js';
import {desenvolvimentoAtivo} from './ambiente.js';
export const CATEGORIAS=Object.freeze(['A','B','D']);
export const MATRICULAS=Object.freeze(['A','B','D','AB']);
export const NOMES_CATEGORIA=Object.freeze({A:'Moto',B:'Carro',D:'Ônibus'});
export const ALMOCOS=Object.freeze([['11-12','11:00 e 12:00'],['12-13','12:00 e 13:00']]);
export const INTERVALOS_ALMOCO=Object.freeze([['11:00/12:00','11:00 às 12:00'],['12:00/13:00','12:00 às 13:00'],['13:00/14:00','13:00 às 14:00'],['11:00/13:00','11:00 às 13:00'],['12:00/14:00','12:00 às 14:00']]);
export const almocoConfigurado=i=>INTERVALOS_ALMOCO.some(([id])=>id===i?.horarioAlmoco)||ALMOCOS.some(([id])=>id===i?.horarioAlmoco)||!!i?.intervaloAlmoco;
export const LOCAIS_ONIBUS=Object.freeze({semana:Object.freeze({id:'km-cobilandia',nome:'KM Cobilândia',unidadeAdministrativa:'Cobilândia',endereco:'Av. Jacinto Admiral, 125 – Cobilândia, Vila Velha – ES, CEP 29111-470.'}),sabado:Object.freeze({id:'tartarugao',nome:'Arena Tartarugão',unidadeAdministrativa:'Cobilândia',endereco:'Ginásio Poliesportivo Presidente João Goulart — Vila Velha/ES.',latitude:-20.3621362,longitude:-40.3048018,mapsUrl:'https://www.google.com/maps/place/Gin%C3%A1sio+Poliesportivo+Presidente+Jo%C3%A3o+Goulart+(Arena+Tartarug%C3%A3o)/@-20.3621362,-40.3048018,17z/data=!3m1!4b1!4m6!3m5!1s0xb815fe8d654517:0x83cfe2073491cb3b!8m2!3d-20.3621362!4d-40.3048018!16s%2Fg%2F1vbl8v4w?entry=ttu'})});
// Resolve o local físico pela data da aula sem regravar snapshots históricos.
export function localDaReservaOperacional(aula){return aula.categoria==='B'?localReservaCarro(aula):localDaReservaCategoriaD(aula);}
export function localDaReservaCategoriaD(aula){
 const oficial=aula.categoria==='D'?localCategoriaD(aula.data||aula.inicio||''):null;
 return aula.categoria==='D'?oficial:aula.localReal||null;
}
export function motivoAlmoco(instrutor,hora){
 const novo=INTERVALOS_ALMOCO.find(([id])=>id===instrutor?.horarioAlmoco)?.[0]?.split('/');
 const intervalo=novo?{inicio:novo[0],fim:novo[1]}:instrutor?.intervaloAlmoco;
 if(intervalo&&/^\d{2}:\d{2}$/.test(intervalo.inicio)&&/^\d{2}:\d{2}$/.test(intervalo.fim)&&intervalo.inicio<intervalo.fim){
  const minutos=h=>Number(h.slice(0,2))*60+Number(h.slice(3));
  return minutos(hora)<minutos(intervalo.fim)&&minutos(hora)+50>minutos(intervalo.inicio)?'Intervalo de almoço do instrutor':'';
 }
 const h=Number(hora.slice(0,2));if(![11,12,13].includes(h))return '';
 if(!ALMOCOS.some(([id])=>id===instrutor?.horarioAlmoco))return 'Horário de almoço não configurado para este instrutor.';
 return (instrutor.horarioAlmoco==='11-12'?[11,12]:[12,13]).includes(h)?'Intervalo de almoço do instrutor':'';
}
export function localCategoriaD(data){
 if(typeof data==='string'&&data.includes('T')&&Number.isFinite(Date.parse(data)))data=agoraBrasil(new Date(data)).slice(0,10);
 if(!dataValida(data))return null;const dia=diaSemana(data);if(dia===0)return null;
 return {...(dia===6?LOCAIS_ONIBUS.sabado:LOCAIS_ONIBUS.semana)};
}
export const AVISO_ONIBUS=`Aulas de ônibus: segunda a sexta na KM Cobilândia; sábados na ${LOCAIS_ONIBUS.sabado.nome}.`;
// O vínculo operacional é a habilitação D, não a unidade cadastral do recurso.
export const recursoCategoriaD=r=>['Instrutores','instrutor'].includes(r.tipo)?r.categorias?.includes('D')===true:['Veículos','veiculo'].includes(r.tipo)&&r.categoria==='D';
export const onibusTemporario=r=>r.temporarioOnibus==='sipa-onibus-local-v1';
export function recursosOperacionaisD(recursos){
 const ativos=recursos.filter(r=>recursoCategoriaD(r)&&r.ativo===true&&r.disponivel!==false);
 const reais=ativos.filter(r=>!onibusTemporario(r)),tipo=r=>['Instrutores','instrutor'].includes(r.tipo);
 const instrutores=reais.filter(tipo),veiculos=reais.filter(r=>!tipo(r));
 if(instrutores.length&&veiculos.length||instrutores.length>1||veiculos.length>1)return reais;
 const temporarios=ativos.filter(onibusTemporario);
 return desenvolvimentoAtivo()&&temporarios.filter(tipo).length===1&&temporarios.filter(r=>!tipo(r)).length===1?temporarios:reais;
}
export function motivoCatalogoOnibus(recursos){
 const ativos=recursosOperacionaisD(recursos),instrutores=ativos.filter(r=>['Instrutores','instrutor'].includes(r.tipo)),veiculos=ativos.filter(r=>['Veículos','veiculo'].includes(r.tipo));
 if(!instrutores.length)return 'Sem instrutor ativo habilitado para a operação Categoria D neste ambiente. Solicite o cadastro ou a conferência do recurso à recepção.';
 if(!veiculos.length)return 'Sem ônibus ativo na operação Categoria D neste ambiente. Solicite o cadastro ou a conferência do recurso à recepção.';
 if(instrutores.length!==1||veiculos.length!==1)return 'Configuração da Categoria D inconsistente: deve existir um único instrutor e um único ônibus ativos. Consulte a recepção; nenhuma agenda paralela será utilizada.';
 if(instrutores[0].veiculoIds?.length&&!instrutores[0].veiculoIds.includes(veiculos[0].id))return 'O instrutor de ônibus não está vinculado ao ônibus ativo.';
 return '';
}
