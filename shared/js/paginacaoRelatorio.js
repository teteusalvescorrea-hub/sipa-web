// Paginação local da tabela de resultado dos relatórios (as exportações usam todas as linhas).
export const POR_PAGINA_RELATORIO=25;
export function paginaRelatorio(linhas,pagina=1,tamanho=POR_PAGINA_RELATORIO){
 const total=linhas.length,paginas=Math.max(1,Math.ceil(total/tamanho)),atual=Math.min(Math.max(1,pagina),paginas),inicio=total?(atual-1)*tamanho+1:0,fim=Math.min(total,atual*tamanho);
 return {linhas:linhas.slice((atual-1)*tamanho,fim),pagina:atual,paginas,inicio,fim,total,resumo:total?'Exibindo '+inicio+'–'+fim+' de '+total:''};
}
