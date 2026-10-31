// Ferramenta manual de manutenção. Não é importada pela aplicação nem entregue.
import {hostLocal} from '../shared/js/ambiente.js';
const AUTH='sipa.acessos.v2',OP='sipa.operador.demo.v2';
const marcadores=new Set(['cenario-agenda-local','fixture-local-explicita']);
const referencia=(v,id)=>v===id||v&&typeof v==='object'&&Object.values(v).some(x=>referencia(x,id));
const parse=(s,k)=>{try{return JSON.parse(s[k]||'null');}catch{throw new Error('JSON incompatível em '+k+'. Nenhuma limpeza foi executada.');}};
export function planejarLimpeza(snapshot){
 const auth=parse(snapshot,AUTH),e=parse(snapshot,OP),alteracoes={},removidos=[],preservados=[];
 if(auth){if(!Array.isArray(auth.contas)||!Array.isArray(auth.sessoes))throw new Error('Autenticação incompatível.');const n=structuredClone(auth),ids=new Set(n.contas.filter(c=>c.origem==='master-teste-local-v1'&&c.login==='12312312311').map(c=>c.id));
  if(ids.size){n.contas=n.contas.filter(c=>!ids.has(c.id));n.sessoes=n.sessoes.filter(s=>!ids.has(s.contaId));n.historicoAcessos=(n.historicoAcessos||[]).filter(h=>!(ids.has(h.contaId)&&h.acao==='configuracao-master-teste'));for(const id of ids)removidos.push({tipo:'conta de teste comprovada',id});alteracoes[AUTH]=JSON.stringify(n);}
  preservados.push(...n.contas.map(c=>({tipo:'conta sem prova de teste',id:c.id})));
 }
 if(e){if(!Array.isArray(e.alunos)||!Array.isArray(e.recursos)||!Array.isArray(e.aulas))throw new Error('Snapshot operacional incompatível.');const n=structuredClone(e),candidatos=[...e.alunos,...e.recursos].filter(r=>marcadores.has(r.origem)||r.origem==='desenvolvimento-local'&&r.temporarioOnibus==='sipa-onibus-local-v1');
  // Por segurança, qualquer referência fora do próprio cadastro impede a
  // remoção automática. Nunca inferimos finalidade apenas pelo nome ou CPF.
  const apagar=new Set();for(const r of candidatos){const externo={...e,alunos:e.alunos.filter(a=>a.id!==r.id),recursos:e.recursos.filter(x=>x.id!==r.id)};if(referencia(externo,r.id)||referencia(auth,r.id))preservados.push({tipo:'teste com dependências a revisar',id:r.id});else{apagar.add(r.id);removidos.push({tipo:'recurso/aluno de gerador comprovado sem dependências',id:r.id});}}
  n.alunos=n.alunos.filter(r=>!apagar.has(r.id));n.recursos=n.recursos.filter(r=>!apagar.has(r.id));if(apagar.size)alteracoes[OP]=JSON.stringify(n);
  preservados.push(...[...e.alunos,...e.recursos].filter(r=>!candidatos.includes(r)).map(r=>({tipo:'cadastro sem prova de teste',id:r.id})));
 }
 const k='sipa.instrutor.dev.dados.v1',cenario=parse(snapshot,k);if(cenario?.origem==='sipa.instrutor.demo.v1'&&cenario.instrutor?.origem===cenario.origem&&cenario.veiculo?.origem===cenario.origem&&Array.isArray(cenario.aulas)&&cenario.aulas.every(a=>a.origem===cenario.origem)){alteracoes[k]=null;removidos.push({tipo:'cenário isolado comprovado do instrutor',id:k});}
 return {versao:1,origem:'limpeza-entrega-sipa',antes:Object.fromEntries(Object.keys(alteracoes).map(k=>[k,snapshot[k]??null])),depois:alteracoes,removidos,preservados};
}
export function capturar(storage=localStorage){return Object.fromEntries(Array.from({length:storage.length},(_,i)=>storage.key(i)).filter(k=>k?.startsWith('sipa.')).map(k=>[k,storage.getItem(k)]));}
export async function aplicarPlano(plano,{confirmado=false,backupConfirmado=false,origem='',restaurar=false,storage=localStorage}={}){
 if(!hostLocal(location.href)||origem!==location.origin||!confirmado||!backupConfirmado)throw new Error('Confirme a origem, o backup salvo e a operação.');
 if(plano.versao!==1||plano.origem!=='limpeza-entrega-sipa')throw new Error('Plano não reconhecido.');
 if(storage.getItem('sipa.administracao.transacao.v1'))throw new Error('Há uma operação administrativa pendente; preserve os dados e recupere-a antes.');
 const antes=restaurar?plano.depois:plano.antes,depois=restaurar?plano.antes:plano.depois;
 const permitidas=new Set([AUTH,OP,'sipa.instrutor.dev.dados.v1']);if(Object.keys(depois).some(k=>!permitidas.has(k)))throw new Error('Chave fora do escopo de manutenção.');
 return navigator.locks.request(AUTH,()=>navigator.locks.request(OP,async()=>{
  if(Object.entries(antes).some(([k,v])=>storage.getItem(k)!==v))throw new Error('Os dados mudaram. Gere outro backup e revise o novo plano.');
  const escrever=(k,v)=>v===null?storage.removeItem(k):storage.setItem(k,v);
  try{for(const [k,v]of Object.entries(depois))escrever(k,v);}catch(e){for(const [k,v]of Object.entries(antes))escrever(k,v);throw e;}
 }));
}
if(typeof document!=='undefined'&&document.getElementById('limpeza-entrega')){
 const q=s=>document.querySelector(s);let plano,baixado=false;
 const informar=t=>q('#resultado').textContent=t;
 q('#analisar').onclick=async()=>{try{if(!hostLocal(location.href))throw new Error('Ferramenta exclusiva de localhost.');const snapshot=capturar();plano={...planejarLimpeza(snapshot),urlOrigem:location.origin,backupCompleto:snapshot,criadoEm:new Date().toISOString()};baixado=false;const bancos=await indexedDB.databases();informar(JSON.stringify({removidosPropostos:plano.removidos,preservados:plano.preservados,bancosPreservados:bancos.map(b=>b.name),observacao:'IndexedDB, anexos e registros sem prova de teste não serão apagados.'},null,2));}catch(e){informar(e.message);}};
 q('#backup').onclick=()=>{if(!plano)return informar('Analise primeiro.');const blob=new Blob([JSON.stringify(plano,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='SIPA-backup-limpeza-'+Date.now()+'.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);baixado=true;};
 q('#executar').onclick=async()=>{try{if(!plano||!baixado)throw new Error('Analise e baixe o backup antes.');await aplicarPlano(plano,{confirmado:q('#confirmar').checked,backupConfirmado:q('#salvo').checked,origem:q('#origem').value});informar('Limpeza limitada concluída. Demais registros e todo o IndexedDB foram preservados. O backup permite restaurar as chaves alteradas.');}catch(e){informar(e.message);}};
 q('#restaurar').onclick=async()=>{try{const f=q('#arquivo').files[0];if(!f)throw new Error('Selecione o backup JSON.');const p=JSON.parse(await f.text());if(p.urlOrigem!==location.origin)throw new Error('Backup de outra origem.');await aplicarPlano(p,{confirmado:q('#confirmar').checked,backupConfirmado:q('#salvo').checked,origem:q('#origem').value,restaurar:true});informar('Chaves alteradas restauradas.');}catch(e){informar(e.message);}};
}
