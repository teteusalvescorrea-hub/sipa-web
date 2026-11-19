// Fase 7 (3.5): o relatório em CSV (separador ";" e BOM, para abrir direto no Excel em pt-BR).
const celula=v=>{const s=v==null?'':String(v);return /[";\n\r]/.test(s)?'"'+s.replaceAll('"','""')+'"':s;};

export function criarCsvRelatorio(r){
 const linhas=[r.colunas||[],...(r.linhas||[])].map(l=>l.map(celula).join(';'));
 return '\uFEFF'+linhas.join('\r\n')+'\r\n';
}

export function exportarCsvRelatorio(r,meta={}){
 const texto=criarCsvRelatorio(r),nome=String(meta.titulo||'relatorio').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^\w-]+/g,'-').toLowerCase()+'.csv';
 const url=URL.createObjectURL(new Blob([texto],{type:'text/csv;charset=utf-8'})),a=document.createElement('a');
 a.href=url;a.download=nome;a.hidden=true;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
 return {nome,tamanho:texto.length};
}
