import {agoraBrasil,somarDias,diaSemana,dataValida} from './calendario.js';

export function periodoDesempenho(modo='hoje',datas={},instante=new Date()){
 const hoje=agoraBrasil(new Date(instante)).slice(0,10);
 if(modo==='hoje')return {inicio:hoje,fim:hoje};
 if(modo==='semana'){const inicio=somarDias(hoje,-((diaSemana(hoje)+6)%7));return {inicio,fim:somarDias(inicio,6)};}
 if(modo==='mes'){const [ano,mes]=hoje.split('-').map(Number);return {inicio:hoje.slice(0,7)+'-01',fim:new Date(Date.UTC(ano,mes,0)).toISOString().slice(0,10)};}
 if(modo!=='periodo'||!dataValida(datas.inicio)||!dataValida(datas.fim)||datas.inicio>datas.fim)throw new Error('Informe um período válido, com data inicial anterior ou igual à final.');
 return {inicio:datas.inicio,fim:datas.fim};
}
export function desempenhoInstrutor(aulas,id,periodo,instante=new Date()){
 if(!dataValida(periodo?.inicio)||!dataValida(periodo?.fim)||periodo.inicio>periodo.fim)throw new Error('Período inválido.');
 const unicas=new Map(),agora=new Date(instante).getTime();
 for(const a of aulas){if(!a.id||String(a.instrutorId??a.instrutor)!==String(id))continue;const anterior=unicas.get(a.id),tempo=x=>Date.parse(x.validadaEm||x.atualizadoEm||x.criadoEm||'')||0;if(!anterior||tempo(a)>=tempo(anterior))unicas.set(a.id,a);}
 const historico=[...unicas.values()].map(a=>{const inicio=a.data&&/^\d{2}:\d{2}$/.test(a.inicio)?a.data+'T'+a.inicio+':00-03:00':a.inicio;return {a,inicio,tempo:Date.parse(inicio)};}).filter(x=>[5,6].includes(x.a.status)&&Number.isFinite(x.tempo)&&x.tempo<=agora).filter(x=>{const dia=agoraBrasil(new Date(x.tempo)).slice(0,10);return dia>=periodo.inicio&&dia<=periodo.fim;}).sort((a,b)=>b.tempo-a.tempo||String(a.a.id).localeCompare(String(b.a.id))).map(x=>x.a);
 return {concluidas:historico.length,presencas:historico.filter(a=>a.status===5).length,faltas:historico.filter(a=>a.status===6).length,historico};
}
