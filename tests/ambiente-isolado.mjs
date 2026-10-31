// Exclusivo do processo de testes. Não é importado pela aplicação nem entregue.
import {registerHooks} from 'node:module';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
const raiz=path.resolve(fileURLToPath(new URL('../',import.meta.url)));
export function fonteLaboratorio(caminho,fonte){
 const p=caminho.replaceAll('\\','/');
 if(p.endsWith('/shared/js/configuracao.js')||p.endsWith('/dev/aluno/authLocal.js'))return fonte.replace('DESENVOLVIMENTO_LOCAL_HABILITADO = false','DESENVOLVIMENTO_LOCAL_HABILITADO = true');
 if(p.endsWith('/dev/operador/politicaCpf.js'))return fonte.replace('CPF_FICTICIO_ALUNO_LOCAL_HABILITADO=false','CPF_FICTICIO_ALUNO_LOCAL_HABILITADO=true');
 return fonte;
}
registerHooks({load(url,context,next){const r=next(url,context);if(!url.startsWith('file:'))return r;const p=fileURLToPath(url);if(!p.startsWith(raiz+path.sep)||!r.source)return r;return {...r,source:fonteLaboratorio(p,String(r.source))};}});
