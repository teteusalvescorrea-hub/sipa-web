import fs from 'node:fs';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
const raiz=fileURLToPath(new URL('../',import.meta.url));
const arquivos=fs.readdirSync(new URL('./',import.meta.url)).filter(f=>f.endsWith('.test.mjs')).map(f=>'tests/'+f);
const r=spawnSync(process.execPath,['--import','./tests/ambiente-isolado.mjs','--test',...arquivos],{cwd:raiz,stdio:'inherit',windowsHide:true});process.exitCode=r.status??1;
