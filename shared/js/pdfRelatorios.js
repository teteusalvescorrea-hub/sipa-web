import {apresentarRelatorio,dataRelatorio,ROTULOS_RESUMO,valorIndicador} from './apresentacaoRelatorios.js';
let carregamento;
async function bibliotecas(){
 carregamento??=(async()=>{await import('../vendor/jspdf.umd.min.js');await import('../vendor/jspdf.plugin.autotable.min.js');})();
 await carregamento;
 return globalThis.jspdf.jsPDF;
}
const texto=v=>String(v??'').replace(/[\u2013\u2014]/g,'-');
export async function criarPdfRelatorio(relatorio,meta={},agora=new Date()){
 const JsPDF=await bibliotecas(),r=apresentarRelatorio(relatorio),doc=new JsPDF({orientation:'landscape',unit:'mm',format:'a4',compress:true});
 const titulo='Relatório de '+(meta.titulo||'Aulas'),largura=doc.internal.pageSize.getWidth(),altura=doc.internal.pageSize.getHeight(),m=12;
 const periodo=dataRelatorio(r.filtros.inicio)+' a '+dataRelatorio(r.filtros.fim);
 doc.setProperties({title:'SIPA - '+titulo,author:'SIPA',subject:periodo});
 const desenhadas=new Set();
 function cabecalho(){const pagina=doc.internal.getCurrentPageInfo().pageNumber;if(desenhadas.has(pagina))return;desenhadas.add(pagina);doc.setTextColor(0);doc.setFont('helvetica','bold');doc.setFontSize(15);doc.text('SIPA - Sistema Inteligente Para Agendamentos',m,15);doc.setFontSize(12);doc.text(texto(titulo),m,23);doc.setFont('helvetica','normal');doc.setFontSize(9);doc.text(texto('Unidade: '+(meta.unidade||r.filtros.unidade||'Todas as unidades autorizadas')),m,30);doc.text('Período: '+periodo,m,36);doc.text('Emitido em: '+dataRelatorio(agora.toISOString()),largura-m,30,{align:'right'});doc.setDrawColor(55,101,160);doc.line(m,40,largura-m,40);}
 const comum={theme:'grid',margin:{left:m,right:m,top:46,bottom:16},styles:{font:'helvetica',fontSize:9,textColor:0,lineColor:[199,207,216],lineWidth:.15,cellPadding:2,overflow:'linebreak',valign:'middle'},headStyles:{fillColor:[231,239,249],textColor:0,fontStyle:'bold'},rowPageBreak:'avoid',showHead:'everyPage',didDrawPage:cabecalho};
 let y=46;
 if(meta.filtros?.length){doc.autoTable({...comum,startY:y,head:[['Filtros da consulta','Seleção']],body:meta.filtros.map(l=>l.map(texto))});y=doc.lastAutoTable.finalY+6;}
 const pesos=r.colunas.map(c=>['Aluno','Instrutor','Veículo','Agrupamento','Justificativa','Motivo'].includes(c)?2.1:['Data','Horário','Cancelada em','Solicitação'].includes(c)?1.35:c==='Categoria'?.9:1.25),soma=pesos.reduce((a,b)=>a+b,0);
 const columnStyles=Object.fromEntries(pesos.map((p,i)=>[i,{cellWidth:(largura-2*m)*p/soma}]));
 doc.autoTable({...comum,startY:y,head:[r.colunas.map(texto)],body:r.linhas.length?r.linhas.map(l=>l.map(texto)):[[{content:'Nenhum registro encontrado para os filtros selecionados.',colSpan:r.colunas.length}]],columnStyles,styles:{...comum.styles,fontSize:r.colunas.length>10?8:9}});
 y=doc.lastAutoTable.finalY+8;
 if(y>altura-45){doc.addPage();cabecalho();y=46;}
 doc.setFont('helvetica','bold');doc.setFontSize(11);doc.text('Resumo do período',m,y);
 const totais=Object.entries(r.totais),resumo=[];for(let i=0;i<totais.length;i+=3){const l=[];for(const [k,v] of totais.slice(i,i+3))l.push(ROTULOS_RESUMO[k]||k,valorIndicador(k,v));while(l.length<6)l.push('');resumo.push(l);}
 doc.autoTable({...comum,startY:y+3,body:resumo,showHead:false,styles:{...comum.styles,fontSize:8.5},columnStyles:{0:{fontStyle:'bold'},2:{fontStyle:'bold'},4:{fontStyle:'bold'}}});
 y=doc.lastAutoTable.finalY+6;
 const observacao='Ocupação calculada pela configuração atual de jornada e calendário. O filtro de situação afeta os horários ocupados. Configurações históricas não são reconstruídas.';
 if(y>altura-28){doc.addPage();cabecalho();y=46;}
 doc.setFont('helvetica','normal');doc.setFontSize(8);doc.text(doc.splitTextToSize('Observação: '+observacao,largura-2*m),m,y);
 const paginas=doc.getNumberOfPages();for(let n=1;n<=paginas;n++){doc.setPage(n);doc.setFontSize(8);doc.setTextColor(0);doc.text(texto('SIPA - '+titulo+' | Página '+n+' de '+paginas),largura-m,altura-7,{align:'right'});}
 const nome='SIPA_Relatorio_'+(meta.titulo||'Aulas').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'_')+'_'+dataRelatorio(r.filtros.inicio).replaceAll('/','-')+'_a_'+dataRelatorio(r.filtros.fim).replaceAll('/','-')+'.pdf';
 return {doc,nome};
}
export async function exportarPdfRelatorio(r,meta){const {doc,nome}=await criarPdfRelatorio(r,meta);await doc.save(nome,{returnPromise:true});return {nome,paginas:doc.getNumberOfPages()};}
