// 09/11/2026: Meus documentos — o que a Recepção anexa na ficha do aluno (e os gerais da autoescola), mais o contrato da
// matrícula e os agendamentos de prova. O aluno abre ou baixa cada um.
import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
const host=document.getElementById('meus-documentos');
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!==undefined&&texto!==null)n.textContent=texto;if(classe)n.className=classe;return n;};
const GRUPOS=[[1,'Contrato'],[2,'Regras de roupas e calçados'],[3,'LADV'],[4,'Resultado de prova'],[5,'Agendamento de prova'],[6,'Outros documentos']];
const ICONES={pdf:'<path d="M6 2h8l5 5v15H6z"/><path d="M14 2v5h5"/><path d="M8.5 13.5h1.6a1.2 1.2 0 0 1 0 2.4H8.5V12m5 0v4m0-4h1.2a2 2 0 0 1 0 4H13.5"/>',img:'<rect x="3" y="4" width="18" height="16" rx="2"/><circle cx="9" cy="10" r="2"/><path d="m21 16-5-5-9 9"/>'};
const tamanho=b=>b>=1048576?(b/1048576).toFixed(1).replace('.',',')+' MB':Math.max(1,Math.round(b/1024))+' KB';
const data=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});};

// 17/11/2026 (pedido do usuário): "Informações importantes" no topo, para todos os alunos (com ou sem documentos).
async function montar(api,servico){
 let topo=[];
 try{const {montarInformacoesImportantes}=await import('./components/informacoesImportantes.js');let aluno={};try{const d=await servico?.dadosAlunoLocal?.();aluno={nome:d?.aluno?.nome,unidade:d?.aluno?.unidade,unidadeCarro:d?.aluno?.unidadeCarro,categorias:d?.categorias||[]};}catch{}topo=[montarInformacoesImportantes(aluno)];}catch{}
 let docs;
 try{docs=await api.Get('alunos/me/documentos');}catch(e){host.replaceChildren(el('p',e?.message||'Não foi possível carregar seus documentos.','docs-erro'));return;}
 docs=Array.isArray(docs)?docs:[];
 if(!docs.length){const vazio=el('div',undefined,'docs-vazio');vazio.append(el('strong','Nenhum documento por aqui ainda.'),el('span','Quando a Recepção anexar o seu contrato, a LADV, as regras de vestimenta ou o agendamento da prova, eles aparecem nesta página.'));/* 17/11/2026 (pedido do usuário): com as Informações importantes, sem o aviso de "nenhum documento". */host.replaceChildren(...(topo.length?topo:[vazio]));return;}
 const resumo=el('p',docs.length===1?'1 documento disponível.':docs.length+' documentos disponíveis.','docs-resumo');
 const grade=el('div',undefined,'docs-grupos');
 for(const [categoria,titulo] of GRUPOS){
  const itens=docs.filter(d=>(d.categoria===categoria)||(categoria===6&&!GRUPOS.some(([c])=>c===d.categoria&&c!==6)&&d.categoria===6));
  if(!itens.length)continue;
  const grupo=el('section',undefined,'docs-grupo');grupo.append(el('h2',titulo));
  const lista=el('ul',undefined,'docs-lista');
  for(const d of itens){
   const li=el('li',undefined,'docs-item'),icone=el('span',undefined,'docs-icone '+(String(d.mime).includes('pdf')?'docs-pdf':'docs-img'));
   icone.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(String(d.mime).includes('pdf')?ICONES.pdf:ICONES.img)+'</svg>';
   const info=el('div',undefined,'docs-info');info.append(el('strong',d.titulo));
   const meta=[d.nomeArquivo,tamanho(d.tamanhoBytes||0),data(d.enviadoEm)?'enviado em '+data(d.enviadoEm):''].filter(Boolean).join(' · ');info.append(el('small',meta));
   if(d.geral)info.append(el('span','Para todos os alunos','docs-tag'));
   const acoes=el('div',undefined,'docs-acoes'),abrir=el('button','Abrir','docs-botao docs-botao-primario'),baixar=el('button','Baixar','docs-botao');abrir.type=baixar.type='button';
   const rota='alunos/me/documentos/'+d.id+'/arquivo';
   const obter=async b=>{b.disabled=true;try{return await api.Get(rota,{binario:true});}catch(e){alert(e?.message||'Não foi possível abrir o documento.');return null;}finally{b.disabled=false;}};
   abrir.onclick=async()=>{const blob=await obter(abrir);if(blob)window.open(URL.createObjectURL(blob),'_blank','noopener');};
   baixar.onclick=async()=>{const blob=await obter(baixar);if(!blob)return;const a=el('a');a.href=URL.createObjectURL(blob);a.download=d.nomeArquivo||'documento';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),4000);};
   acoes.append(abrir,baixar);li.append(icone,info,acoes);lista.append(li);
  }
  grupo.append(lista);grade.append(grupo);
 }
 host.replaceChildren(...topo,resumo,grade);
}

if(desenvolvimentoAtivo()){host.replaceChildren(el('p','Meus documentos funciona com a API (fora do modo de desenvolvimento).','docs-erro'));}
else{const {exigirLogin}=await import('../../shared/js/sessao.js');if(exigirLogin(['Aluno'])){const servico=(await import('./services/alunoIntegrado.js')).criarServicoAluno();document.querySelector('.sipa-sidebar-logout').onclick=e=>{e.preventDefault();servico.sair();};
 try{const {marcarIndicadorMensagens,atualizarIndicadorNovidades}=await import('./components/mensagensAluno.js');servico.totalNaoLidas?.().then(n=>marcarIndicadorMensagens?.(n)).catch(()=>{});atualizarIndicadorNovidades(servico);}catch{}
 await montar(await import('../../shared/js/api.js'),servico);}}
