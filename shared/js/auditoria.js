const segredo=/senha|password|hash|sal$|token|documentoMedico|arquivo/i;
export function dadosAuditaveis(v){if(v===undefined)return null;if(v===null||typeof v!=='object')return v;if(v instanceof Blob)return '[anexo privado]';if(Array.isArray(v))return v.map(dadosAuditaveis);return Object.fromEntries(Object.entries(v).filter(([k])=>!segredo.test(k)).map(([k,x])=>[k,dadosAuditaveis(x)]));}
export function auditar(e,op,tipo,referencia,antes,depois,justificativa='',agora=new Date()){
 const evento={id:crypto.randomUUID(),em:agora.toISOString(),usuario:op.id,perfilConta:op.perfilConta||op.perfil,painel:op.painel||op.perfil,perfil:op.perfil||({1:'operador',2:'gerencia',3:'master'})[op.nivel],unidade:op.unidade,tipo,referencia,antes:dadosAuditaveis(antes),depois:dadosAuditaveis(depois),justificativa};
 return {...e,auditoria:[...(e.auditoria||[]),evento]};
}
export function auditarDiferencas(antes,depois,op){
 let e=depois;for(const [colecao,tipo] of [['alunos','aluno'],['recursos','recurso'],['aulas','aula']])for(const r of depois[colecao]||[]){const a=antes[colecao]?.find(x=>x.id===r.id);if(JSON.stringify(a)!==JSON.stringify(r)){const categoria=tipo==='aula'?(r.status!==a?.status?({1:'agendamento',2:'cancelamento',5:'presenca',6:'falta'})[r.status]||'aula':r.solicitacaoMedica?.status!==a?.solicitacaoMedica?.status?'atestado':'aula'):tipo;e=auditar(e,op,categoria,r.id,a,r);}}
 return e;
}
