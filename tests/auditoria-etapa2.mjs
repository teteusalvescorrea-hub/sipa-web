// Auditoria somente de leitura: não acessa storage do navegador pessoal.
import fs from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import {fileURLToPath} from 'node:url';
const raiz=fileURLToPath(new URL('../',import.meta.url));
const pastas=['aluno','instrutor','nivel-1-operador','nivel-2-gerencia','nivel-3-master','shared','js','css','assets'];
async function listar(dir){const itens=[];for(const x of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,x.name);if(x.isDirectory())itens.push(...await listar(p));else itens.push(p);}return itens;}
const arquivos=[...await Promise.all(pastas.map(p=>listar(path.join(raiz,p)))).then(r=>r.flat()),...['index.html','login.html','cadastro.html','autoescola.html'].map(p=>path.join(raiz,p))];
const pendencias=[],referencias=[];
for(const arquivo of arquivos){if(arquivo.includes(path.sep+'vendor'+path.sep))continue;const ext=path.extname(arquivo);if(!['.js','.html','.css'].includes(ext))continue;const s=await fs.readFile(arquivo,'utf8');let refs=[];
 if(ext==='.js')refs=[...s.matchAll(/(?:\bfrom\s*|\bimport\s*\()\s*(['"])([^'"]+)\1/g)].map(m=>m[2]);
 if(ext==='.html')refs=[...s.matchAll(/(?:src|href)\s*=\s*['"]([^'"]+)['"]/g)].map(m=>m[1]);
 if(ext==='.css')refs=[...s.matchAll(/url\(\s*['"]?([^)'"\s]+)['"]?\s*\)/g)].map(m=>m[1]);
 for(const ref of refs){if(/^(https?:|data:|blob:|mailto:|tel:|#|\/\/)/.test(ref)||ref.includes('${'))continue;const limpo=ref.split(/[?#]/)[0];if(!limpo||ext==='.js'&&!ref.startsWith('.'))continue;const alvo=ref.startsWith('/')?path.join(raiz,limpo):path.resolve(path.dirname(arquivo),limpo);if(!alvo.startsWith(raiz))continue;referencias.push({arquivo:path.relative(raiz,arquivo),ref});try{await fs.access(alvo);}catch{pendencias.push({arquivo:path.relative(raiz,arquivo),ref});}}
}
const config=await fs.readFile(path.join(raiz,'shared/js/configuracao.js'),'utf8'),loginLocal=await fs.readFile(path.join(raiz,'dev/login.js'),'utf8'),auth=await fs.readFile(path.join(raiz,'dev/autenticacao.js'),'utf8');
const r={etapa:2,geradoEm:new Date().toISOString(),arquivosInspecionados:arquivos.length,referenciasVerificadas:referencias.length,referenciasAusentes:pendencias,laboratorioDesligado:/DESENVOLVIMENTO_LOCAL_HABILITADO = false/.test(config),provisionamentoMasterNoLogin:/prepararMasterTeste/.test(loginLocal),promocaoNominalNoAutenticador:/const promover=|login==='93541134780'/.test(auth),storagePessoal:'não acessado; não classificado e não apagado',atencao:'Fluxos administrativos e médicos reais dependem da integração com a API.'};
const destino=path.join(os.tmpdir(),'SIPA-etapa2-auditoria-estatica.json');await fs.writeFile(destino,JSON.stringify(r,null,2));console.log(JSON.stringify({...r,relatorio:destino},null,2));if(pendencias.length||!r.laboratorioDesligado||r.provisionamentoMasterNoLogin||r.promocaoNominalNoAutenticador)process.exitCode=1;
