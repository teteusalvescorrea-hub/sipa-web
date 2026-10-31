import {agoraBrasil,dataValida} from '../../shared/js/calendario.js';

export function periodoMensal(mes=agoraBrasil().slice(0,7)){
 if(!/^\d{4}-\d{2}$/.test(mes)||!dataValida(mes+'-01'))throw new Error('Selecione um mês válido.');
 const inicio=mes+'-01',ultimo=new Date(inicio+'T12:00:00Z');ultimo.setUTCMonth(ultimo.getUTCMonth()+1,0);
 return {inicio,fim:ultimo.toISOString().slice(0,10)};
}
export function moverMes(mes,delta){
 const {inicio}=periodoMensal(mes),d=new Date(inicio+'T12:00:00Z');d.setUTCMonth(d.getUTCMonth()+delta);
 const novo=d.toISOString().slice(0,7);periodoMensal(novo);return novo;
}
export function validarPeriodo(inicio,fim){
 if(!dataValida(inicio)||!dataValida(fim))throw new Error('Informe uma data inicial e uma data final válidas.');
 if(fim<inicio)throw new Error('A data final não pode ser anterior à data inicial.');
 return {inicio,fim};
}
// Mesmas aulas da agenda, em uma projeção de leitura; sem segunda base ou migração.
export function consultarHistorico(aulas,instrutorId,{inicio,fim,status='todas'}){
 validarPeriodo(inicio,fim);if(!['todas','5','6','2'].includes(String(status)))throw new Error('Filtro de status inválido.');
 const registros=aulas.filter(a=>a.instrutorId===instrutorId&&Number.isFinite(Date.parse(a.inicio)))
  .map(a=>({aula:a,dia:agoraBrasil(new Date(a.inicio)).slice(0,10)}))
  .filter(r=>r.dia>=inicio&&r.dia<=fim&&(status==='todas'||String(r.aula.status)===String(status)))
  .sort((a,b)=>Date.parse(b.aula.inicio)-Date.parse(a.aula.inicio)||String(a.aula.id).localeCompare(String(b.aula.id)));
 const grupos=[];for(const r of registros){if(grupos.at(-1)?.dia!==r.dia)grupos.push({dia:r.dia,aulas:[]});grupos.at(-1).aulas.push(r.aula);}
 return {inicio,fim,total:registros.length,grupos};
}
export function consultarAbaHistorico(aulas,instrutorId,aba,{periodo,instante=new Date(),status='todas'}={}){
 if(!['dia','5','6','completo'].includes(aba))throw new Error('Aba de histórico inválida.');
 const hoje=agoraBrasil(instante).slice(0,10);
 const limites=aba==='completo'?(periodo||periodoMensal(hoje.slice(0,7))):aba==='dia'?{inicio:hoje,fim:hoje}:{inicio:'1900-01-01',fim:'9999-12-31'};
 const origem=aba==='dia'?aulas.filter(a=>[1,5,6].includes(a.status)):aulas;
 const resultado=consultarHistorico(origem,instrutorId,{...limites,status:['5','6'].includes(aba)?aba:'todas'});
 if(aba==='completo'){
  if(!['todas','5','6','2'].includes(String(status)))throw new Error('Filtro de situação inválido.');
  const contagens={todas:resultado.total,5:0,6:0,2:0};
  for(const grupo of resultado.grupos)for(const aula of grupo.aulas){const chave=String(aula.status);if(['5','6','2'].includes(chave))contagens[chave]++;}
  const grupos=resultado.grupos.map(g=>({...g,aulas:g.aulas.filter(a=>status==='todas'||String(a.status)===String(status))})).filter(g=>g.aulas.length);
  return {...resultado,grupos,total:grupos.reduce((n,g)=>n+g.aulas.length,0),contagens};
 }
 if(aba==='dia')resultado.grupos=resultado.grupos.map(g=>({...g,aulas:[...g.aulas].sort((a,b)=>Date.parse(a.inicio)-Date.parse(b.inicio)||String(a.id).localeCompare(String(b.id)))}));
 return resultado;
}

// Paginação local de leitura. Na integração, o servidor deverá fornecer total,
// página e registros já autorizados/ordenados, sem paginar novamente a resposta.
export function paginarHistorico(resultado,pagina=1){
 const tamanhoPagina=10,registros=resultado.grupos.flatMap(g=>g.aulas.map(aula=>({dia:g.dia,aula}))),total=registros.length,totalPaginas=Math.ceil(total/tamanhoPagina);
 const atual=Math.min(Math.max(Number.isSafeInteger(pagina)?pagina:1,1),Math.max(1,totalPaginas)),offset=(atual-1)*tamanhoPagina,grupos=[];
 for(const r of registros.slice(offset,offset+tamanhoPagina)){if(grupos.at(-1)?.dia!==r.dia)grupos.push({dia:r.dia,aulas:[]});grupos.at(-1).aulas.push(r.aula);}
 return {total,totalPaginas,pagina:atual,tamanhoPagina,inicioRegistro:total?offset+1:0,fimRegistro:Math.min(offset+tamanhoPagina,total),grupos};
}
export function numerosPaginas(pagina,total,compacta=false){
 if(!Number.isSafeInteger(total)||total<1)return [];
 const atual=Math.min(Math.max(Number.isSafeInteger(pagina)?pagina:1,1),total),janela=compacta?3:5;
 const inicio=Math.max(1,Math.min(atual-Math.floor(janela/2),total-janela+1)),fim=Math.min(total,inicio+janela-1);
 const numeros=[...new Set([1,...Array.from({length:fim-inicio+1},(_,i)=>inicio+i),total])].sort((a,b)=>a-b),itens=[];
 for(const n of numeros){const anterior=itens.at(-1);if(typeof anterior==='number'&&n-anterior===2)itens.push(n-1);else if(typeof anterior==='number'&&n-anterior>2)itens.push('…');itens.push(n);}
 return itens;
}
