import {agoraBrasil,somarDias,diaSemana,dataValida} from './calendario.js';

export function periodoDesempenho(modo='hoje',datas={},instante=new Date()){
 const hoje=agoraBrasil(new Date(instante)).slice(0,10);
 if(modo==='hoje')return {inicio:hoje,fim:hoje};
 if(modo==='semana'){const inicio=somarDias(hoje,-((diaSemana(hoje)+6)%7));return {inicio,fim:somarDias(inicio,6)};}
 if(modo==='mes'){const [ano,mes]=hoje.split('-').map(Number);return {inicio:hoje.slice(0,7)+'-01',fim:new Date(Date.UTC(ano,mes,0)).toISOString().slice(0,10)};}
 if(modo!=='periodo'||!dataValida(datas.inicio)||!dataValida(datas.fim)||datas.inicio>datas.fim)throw new Error('Informe um período válido, com data inicial anterior ou igual à final.');
 return {inicio:datas.inicio,fim:datas.fim};
}
// Uma entrada por aula do instrutor (a versão mais recente vence), com o início já como instante.
const comHora=(a,campo)=>a.data&&/^\d{2}:\d{2}$/.test(a[campo])?a.data+'T'+a[campo]+':00-03:00':a[campo];
function aulasUnicas(aulas,id){
 const unicas=new Map(),tempo=x=>Date.parse(x.validadaEm||x.atualizadoEm||x.criadoEm||'')||0;
 for(const a of aulas){if(!a.id||String(a.instrutorId??a.instrutor)!==String(id))continue;const anterior=unicas.get(a.id);if(!anterior||tempo(a)>=tempo(anterior))unicas.set(a.id,a);}
 return [...unicas.values()].map(a=>{const inicio=comHora(a,'inicio'),t=Date.parse(inicio),f=Date.parse(comHora(a,'fim')||'');return {a,inicio,tempo:t,termino:Number.isFinite(f)?f:t+50*60000,dia:Number.isFinite(t)?agoraBrasil(new Date(t)).slice(0,10):''};}).filter(x=>Number.isFinite(x.tempo));
}
export function desempenhoInstrutor(aulas,id,periodo,instante=new Date()){
 if(!dataValida(periodo?.inicio)||!dataValida(periodo?.fim)||periodo.inicio>periodo.fim)throw new Error('Período inválido.');
 const agora=new Date(instante).getTime();
 const historico=aulasUnicas(aulas,id).filter(x=>[5,6].includes(x.a.status)&&x.tempo<=agora&&x.dia>=periodo.inicio&&x.dia<=periodo.fim).sort((a,b)=>b.tempo-a.tempo||String(a.a.id).localeCompare(String(b.a.id))).map(x=>x.a);
 return {concluidas:historico.length,presencas:historico.filter(a=>a.status===5).length,faltas:historico.filter(a=>a.status===6).length,historico};
}
export const DIAS_SEMANA=Object.freeze(['Dom','Seg','Ter','Qua','Qui','Sex','Sáb']);
const rotuloDia=dia=>dia.slice(8)+'/'+dia.slice(5,7);
export function escalaEixo(maximo){const passo=Math.max(1,Math.ceil(Math.max(1,maximo)/3));return [0,passo,passo*2,passo*3];}
// Aulas ativas (sem canceladas e recusadas) da semana de Brasília até hoje (o instrutor não vê os próximos dias); domingo entra se tiver aula ou for hoje.
export function aulasDaSemana(aulas,id,instante=new Date()){
 const {inicio}=periodoDesempenho('semana',{},instante),hoje=agoraBrasil(new Date(instante)).slice(0,10),contagem=new Map();
 for(const x of aulasUnicas(aulas,id))if(![2,4].includes(x.a.status))contagem.set(x.dia,(contagem.get(x.dia)||0)+1);
 return Array.from({length:7},(_,i)=>{const dia=somarDias(inicio,i);return {dia,rotulo:DIAS_SEMANA[diaSemana(dia)],total:contagem.get(dia)||0};}).filter(d=>d.dia<=hoje&&(diaSemana(d.dia)!==0||d.total||d.dia===hoje));
}
// Bloco "Meu desempenho" do Início: tudo calculado com as aulas já carregadas, em dias de Brasília.
export function painelDesempenho(aulas,id,dias=30,instante=new Date()){
 const agora=new Date(instante).getTime(),hoje=agoraBrasil(new Date(agora)).slice(0,10),periodo={inicio:somarDias(hoje,-(dias-1)),fim:hoje},lista=aulasUnicas(aulas,id);
 const feitas=lista.filter(x=>[5,6].includes(x.a.status)&&x.tempo<=agora&&x.dia>=periodo.inicio&&x.dia<=periodo.fim),realizadas=feitas.filter(x=>x.a.status===5),faltas=feitas.length-realizadas.length;
 const primeira=somarDias(periodo.inicio,-((diaSemana(periodo.inicio)+6)%7)),semanas=[];
 // A primeira semana pode começar antes do período: "desde" diz a partir de quando ela foi contada.
 for(let s=primeira;s<=hoje;s=somarDias(s,7))semanas.push({inicio:s,rotulo:rotuloDia(s),desde:s<periodo.inicio?rotuloDia(periodo.inicio):null,realizadas:0,faltas:0});
 for(const x of feitas)semanas[Math.floor((Date.parse(x.dia+'T12:00:00Z')-Date.parse(primeira+'T12:00:00Z'))/6048e5)][x.a.status===5?'realizadas':'faltas']++;
 const categorias=new Map();for(const x of realizadas){const c=x.a.categoria||'—';categorias.set(c,(categorias.get(c)||0)+1);}
 return {periodo,dias,realizadas:realizadas.length,faltas,presenca:feitas.length?Math.round(realizadas.length/feitas.length*100):null,mediaSemana:Math.round(realizadas.length/(dias/7)*10)/10,
  aguardandoRegistro:lista.filter(x=>x.a.status===1&&x.termino<=agora).length,semanas,
  categorias:[...categorias].map(([categoria,total])=>({categoria,total})).sort((a,b)=>b.total-a.total||a.categoria.localeCompare(b.categoria))};
}
