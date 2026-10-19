import {readFile} from 'node:fs/promises';
export async function fonteLaboratorio(){let s=await readFile(new URL('./laboratorio/js/modules/essencial/service/authLocal.js.fixture',import.meta.url),'utf8');
for(const [rel,f] of [["'./agendamentoAluno.js'",'../../js/modules/essencial/service/agendamentoAluno.js'],["'../../unidades/catalogoUnidades.js'",'../../js/modules/unidades/catalogoUnidades.js'],['"../../compartilhado/calendario.js"','../../js/modules/compartilhado/calendario.js'],['"../../compartilhado/disponibilidade.js"','../../js/modules/compartilhado/disponibilidade.js']])s=s.replaceAll(rel,JSON.stringify(new URL(f,import.meta.url).href));return s;}
export const laboratorio=await import('data:text/javascript;base64,'+Buffer.from(await fonteLaboratorio()).toString('base64'));
