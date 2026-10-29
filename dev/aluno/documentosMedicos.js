import {exigirLaboratorio} from './contaRecepcao.js';
// Somente laboratório explícito. Bytes não vão ao LocalStorage, logs ou servidor.
const abrir=()=>new Promise((resolve,reject)=>{exigirLaboratorio();const r=indexedDB.open('sipa.dev.atestados.v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('documentos',{keyPath:'id'});r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(new Error('Não foi possível acessar os documentos locais.'));});
async function transacao(modo,acao){const db=await abrir();try{return await new Promise((resolve,reject)=>{const tx=db.transaction('documentos',modo),r=acao(tx.objectStore('documentos'));tx.oncomplete=()=>resolve(r.result);tx.onerror=tx.onabort=()=>reject(new Error('Não foi possível salvar ou ler o documento local.'));});}finally{db.close();}}
export const guardarAtestado=registro=>transacao('readwrite',s=>s.add(registro));
export const lerAtestado=id=>transacao('readonly',s=>s.get(id));
// Compensação apenas de upload novo cuja reserva NÃO foi salva. Nenhuma ação
// de exclusão é exposta aos painéis, nem usada para documentos já referenciados.
export const descartarUploadNaoSalvo=id=>transacao('readwrite',s=>s.delete(id));
