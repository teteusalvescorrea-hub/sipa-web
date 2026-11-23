// 19/11/2026 (tarefa 18, desempenho): gera os <link rel="modulepreload"> das páginas a partir dos imports estáticos.
// Sem eles, o navegador só descobre cada nível de import depois de baixar o anterior (até 13 níveis em cadeia na entrada
// da equipe); com eles, os módulos da entrada baixam juntos. Rodar depois de mudar os imports da entrada:
//   node dev/modulepreload.mjs
// Reescreve só os blocos entre <!-- precarga:inicio/fim --> e <!-- modulepreload:inicio/fim --> (ver blocosDaPagina).
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const raiz=fileURLToPath(new URL('../',import.meta.url));
// Página → módulos de entrada (os importados por import() na entrada também entram, porque são carregados sempre).
const ALUNO=['aluno/js/entrada.js','aluno/js/integrado.js'];
const EQUIPE=['shared/js/entradaEquipeIntegrada.js'];
const PRE_CARGA='shared/js/preCargaEquipe.js';
export const PAGINAS=Object.freeze({
 'nivel-3-master/html/master.html':[PRE_CARGA,'shared/js/entradaAdministrativa.js','shared/js/entradaAdministrativaIntegrada.js',...EQUIPE,'shared/components/painelAdministrativo.js'],
 'nivel-2-gerencia/html/gerencia.html':[PRE_CARGA,'shared/js/entradaAdministrativa.js','shared/js/entradaAdministrativaIntegrada.js',...EQUIPE,'shared/components/painelAdministrativo.js'],
 'nivel-1-operador/html/operador-cfc.html':[PRE_CARGA,'nivel-1-operador/js/operador-cfc.js','nivel-1-operador/js/operadorIntegrado.js',...EQUIPE],
 'instrutor/html/instrutor.html':['instrutor/js/entrada.js','shared/js/sessao.js','instrutor/js/services/instrutorIntegrado.js','instrutor/js/painel.js','shared/js/services/authService.js'],
 'aluno/html/dashboard.html':ALUNO,
 'aluno/html/agendamento.html':ALUNO,
 'aluno/html/minhas-aulas.html':[...ALUNO,'aluno/js/contratar-aulas.js'],
 'aluno/html/meu-progresso.html':ALUNO,
 'aluno/html/meu-perfil.html':[...ALUNO,'aluno/js/foto-perfil.js'],
 'aluno/html/mensagens.html':['aluno/js/mensagens.js','shared/js/sessao.js','aluno/js/services/alunoIntegrado.js','aluno/js/components/mensagensAluno.js','shared/components/chatWhats.js','shared/js/chatFontes.js'],
 'aluno/html/meus-documentos.html':['aluno/js/meus-documentos.js','shared/js/api.js','shared/js/sessao.js','aluno/js/services/alunoIntegrado.js','aluno/js/components/mensagensAluno.js','aluno/js/components/informacoesImportantes.js'],
});

// Grafo dos imports estáticos (import ... from, import '...', export ... from), sem dev/.
export function grafoEstatico(entradas){
 const vistos=new Set(),ordem=[];
 function visitar(rel){
  if(vistos.has(rel)||rel.startsWith('dev/'))return;vistos.add(rel);
  const texto=fs.readFileSync(path.join(raiz,rel),'utf8').replace(/\/\*[\s\S]*?\*\//g,'');
  for(const m of texto.matchAll(/(?:^|[;\s}])(?:import\s*(?:[\w*{}\s,$]+from\s*)?|export\s*(?:\*|\{[^}]*\})\s*from\s*)['"](\.{1,2}\/[^'"]+\.js)['"]/g))
   visitar(path.posix.normalize(path.posix.join(path.posix.dirname(rel),m[1])));
  ordem.push(rel);
 }
 for(const e of entradas)visitar(e);
 return ordem;
}

// Dois blocos: logo depois do <title>, só a pré-carga dos dados dos painéis da equipe (o módulo async e os módulos dele,
// que assim entram primeiro na fila do navegador); no fim do <head>, depois do CSS, o resto da entrada (antes do CSS, os
// módulos atrasavam o CSS, que os módulos esperam para rodar).
const link=(dir,m)=>'<link rel="modulepreload" href="'+path.posix.relative(dir,m)+'">';
export function blocosDaPagina(pagina){
 const dir=path.posix.dirname(pagina),entradas=PAGINAS[pagina],comPreCarga=entradas[0]===PRE_CARGA;
 const daPreCarga=comPreCarga?grafoEstatico([PRE_CARGA]):[],resto=grafoEstatico(entradas).filter(m=>!daPreCarga.includes(m));
 const script=`<script type="module" async>import {preCarregarEquipe} from '${path.posix.relative(dir,PRE_CARGA)}';preCarregarEquipe();</script>`;
 return {preCarga:comPreCarga?[script,...daPreCarga.map(m=>link(dir,m))].join('\n'):'',resto:resto.map(m=>link(dir,m)).join('\n')};
}

if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 for(const pagina of Object.keys(PAGINAS)){
  const arquivo=path.join(raiz,pagina),html=fs.readFileSync(arquivo,'utf8'),nl=html.includes('\r\n')?'\r\n':'\n',{preCarga,resto}=blocosDaPagina(pagina);
  const bloco=(nome,conteudo)=>'<!-- '+nome+':inicio (gerado por dev/modulepreload.mjs) -->'+nl+conteudo.replaceAll('\n',nl)+nl+'<!-- '+nome+':fim -->';
  const trecho=nome=>new RegExp('\\r?\\n?<!-- '+nome+':inicio[^>]*-->[\\s\\S]*?<!-- '+nome+':fim -->(\\r?\\n)?');
  let novo=html.replace(trecho('precarga'),'').replace(trecho('modulepreload'),'');
  if(preCarga)novo=novo.replace(/<\/title>/i,t=>t+nl+bloco('precarga',preCarga)+nl);
  novo=novo.replace(/<\/head>/i,()=>nl+bloco('modulepreload',resto)+nl+'</head>');
  if(novo!==html){fs.writeFileSync(arquivo,novo);console.log('atualizado',pagina,grafoEstatico(PAGINAS[pagina]).length,'módulos');}
 }
}
