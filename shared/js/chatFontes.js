// As "fontes" do chat estilo WhatsApp (shared/components/chatWhats.js): o que cada login vê e como conversa.
// Equipe (Recepção, Gerência e Master): grupos da unidade, pessoas da equipe, instrutores e as conversas dos alunos
// (a Recepção atende e transfere para a Gerência; a Gerência e o Master veem as transferidas e devolvem).
// Instrutor: a Recepção e a Gerência das unidades dele. Aluno: a Recepção.
import {dataDe} from '../components/chatWhats.js';
import {nomeUnidadeInstitucional} from './catalogoUnidades.js';
import {formatarTelefone} from './formatacao.js';

const porData=(a,b)=>(dataDe(b.ultimaEm)||0)-(dataDe(a.ultimaEm)||0);
// 10/11/2026: o grupo geral da autoescola (equipe de todas as unidades e instrutores) fica fixo no topo da lista.
const porFixoEData=(a,b)=>(b.fixo?1:0)-(a.fixo?1:0)||porData(a,b);
const grupoDoChat=g=>({chave:'g:'+g.unidadeId,tipo:'grupo',id:g.unidadeId,nome:g.nome,categoria:'Grupos',fixo:g.geral===true,
 subtitulo:g.geral?'Todas as unidades · equipe e instrutores':'Recepção, Gerência e Master',ultimaEm:g.ultimaEm,
 ultima:g.ultimaMensagem?(g.ultimoAutor?String(g.ultimoAutor).replace(/\s*\(.*\)$/,'')+': ':'')+g.ultimaMensagem:'',naoLidas:g.naoLidas||0,mostrarAutor:true});
const interna=m=>({id:m.id,em:m.em,autor:m.autor,texto:m.texto,minha:m.minha===true,lida:m.lida===true});
// 17/11/2026 (pedido do usuário): toda a equipe responde o aluno, e cada mensagem diz quem escreveu e de onde: "Nome · Recepção",
// "Nome · Gerência", "Nome · Diretoria" (o Master), "Nome · Central de agendamento" (o cargo vem da API, em remetente).
export const autorComCargo=m=>{const cargo=m?.remetente||'Recepção',nome=String(m?.autor||'').trim();return nome&&nome!==cargo?nome+' · '+cargo:cargo;};
const categoriaDaPessoa=c=>c==='Instrutor'?'Instrutores':c;

export function fonteEquipe(servico){
 let perfil='',alunosCache=null,alunosEm=0;
 const gerencia=()=>['Gerência','Master'].includes(perfil);
 // Os alunos vinculados às unidades de quem está logado (a lista da equipe), relidos a cada 5 minutos.
 async function alunosDaUnidade(){if(!servico.estado)return [];if(!alunosCache||Date.now()-alunosEm>3e5){try{alunosCache=(await servico.estado()).alunos||[];alunosEm=Date.now();}catch{alunosCache=alunosCache||[];}}return alunosCache;}
 return {
  categorias:['Pedidos de aulas','Alunos','Grupos','Recepção','Gerência','Instrutores','Master'],
  async listar(){
   // 19/11/2026 (tarefa 18): o resumo, as conversas, os alunos e os pedidos saem juntos (antes um esperava o outro). Cada
   // erro continua tratado no mesmo ponto de antes.
   const resultado=p=>p.then(v=>({v}),e=>({e})),valor=x=>{if(x.e)throw x.e;return x.v;};
   const conversasP=servico.conversasAlunos?resultado(servico.conversasAlunos({})):null,alunosP=servico.conversasAlunos?alunosDaUnidade():null,pedidosP=servico.pedidosAulas?resultado(servico.pedidosAulas(true)):null;
   const r=await servico.chatResumo();perfil=r.perfil||'';
   const itens=[
    ...(r.grupos||[]).map(grupoDoChat),
    ...(r.contatos||[]).map(c=>({chave:'u:'+c.usuarioId,tipo:'pessoa',id:c.usuarioId,nome:c.nome,categoria:categoriaDaPessoa(c.categoria),subtitulo:(c.unidades||[]).join(', '),
     ultimaEm:c.ultimaEm,ultima:c.ultimaMensagem||'',ultimaMinha:c.ultimaMinha===true,naoLidas:c.naoLidas||0})),
   ];
   let conversasDoAluno=[];
   if(servico.conversasAlunos){
    try{
     // Todas as conversas com alunos (a transferida para a Gerência vem marcada) e, depois, os alunos da unidade que
     // ainda não conversaram: a primeira mensagem cria a conversa.
     const lista=valor(await conversasP);conversasDoAluno=lista;
     if(gerencia()){
      // Gerência e Master: só as conversas da Recepção transferidas (para acompanhar e devolver).
      // 17/11/2026 (pedido do usuário): e as que têm a mensagem da diretoria (aula cancelada pela autoescola), para a
      // Gerência seguir o atendimento junto com a Recepção.
      itens.push(...lista.filter(c=>c.encaminhada||c.diretoria).map(c=>({chave:'a:'+c.alunoId,tipo:'aluno',id:c.id,alunoId:c.alunoId,nome:c.aluno,categoria:'Alunos',subtitulo:'Conversa com a Recepção · '+(c.unidadeNome||''),ultimaEm:c.ultimaMensagemEm,ultima:c.ultimaMensagem,
       // 18/11/2026: a última da equipe nesta conversa é da Recepção ou da diretoria, não de quem está logado (sem o "Você:").
       ultimaMinha:false,naoLidas:c.naoLida?1:0,encaminhada:c.encaminhada===true,etiqueta:c.encaminhada?'Transferida':'Diretoria',somenteLeitura:!c.podeResponder,mostrarAutor:true})));
     }else{
      itens.push(...lista.map(c=>({chave:'a:'+c.alunoId,tipo:'aluno',id:c.id,alunoId:c.alunoId,nome:c.aluno,categoria:'Alunos',subtitulo:c.unidadeNome||'',ultimaEm:c.ultimaMensagemEm,ultima:c.ultimaMensagem,
       ultimaMinha:!c.ultimaDoAluno,naoLidas:c.naoLida?1:0,encaminhada:c.encaminhada===true,etiqueta:c.encaminhada?'Na Gerência':c.diretoria?'Diretoria':'',somenteLeitura:!c.podeResponder,mostrarAutor:true})));
     }
    }catch{}
    const unidadeDe=a=>a.unidadePrincipal?nomeUnidadeInstitucional(a.unidadePrincipal):'';
    const alunos=(await alunosP).filter(a=>a.id).sort((a,b)=>String(a.nome).localeCompare(String(b.nome),'pt-BR'));
    if(gerencia()){
     // A conversa direta da Gerência/Master com cada aluno da unidade (o aluno só vê depois da 1ª mensagem).
     const diretas=new Map((r.alunos||[]).map(a=>[a.alunoId,a]));
     itens.push(...alunos.map(a=>{const d=diretas.get(a.id);return {chave:'d:'+a.id,tipo:'aluno-direto',id:a.id,nome:a.nome||'Aluno',categoria:'Alunos',subtitulo:unidadeDe(a),
      ultimaEm:d?.ultimaEm||null,ultima:d?d.ultimaMensagem:'Toque para conversar',ultimaMinha:d?.ultimaMinha===true,naoLidas:d?.naoLidas||0};}));
    }else{
     const comConversa=new Set(conversasDoAluno.map(c=>c.alunoId));
     itens.push(...alunos.filter(a=>!comConversa.has(a.id)).map(a=>({chave:'a:'+a.id,tipo:'aluno',id:null,alunoId:a.id,nome:a.nome||'Aluno',categoria:'Alunos',subtitulo:unidadeDe(a),ultimaEm:null,ultima:'Toque para conversar',naoLidas:0,mostrarAutor:true})));
    }
   }
   // Pedidos de mais aulas em aberto: entram na própria conversa do aluno (um item só por aluno, a mesma conversa em que
   // chegou a mensagem do pedido), com a etiqueta "Novo pedido" e também no filtro "Pedidos de aulas".
   if(servico.pedidosAulas){
    try{
     const pedidos=valor(await pedidosP);
     const porAluno=new Map(conversasDoAluno.map(c=>[c.alunoId,c]));
     for(const p of pedidos){
      let item=itens.find(i=>i.chave==='a:'+p.alunoId);
      if(!item){const c=porAluno.get(p.alunoId);
       item={chave:'a:'+p.alunoId,tipo:'aluno',id:c?.id||null,alunoId:p.alunoId,nome:p.aluno||c?.aluno||'Aluno',ultimaEm:c?.ultimaMensagemEm||null,ultima:c?.ultimaMensagem||'',
        ultimaMinha:c?!c.ultimaDoAluno:false,naoLidas:c?.naoLida?1:0,encaminhada:c?.encaminhada===true,somenteLeitura:c?!c.podeResponder:false,mostrarAutor:true};
       itens.push(item);}
      Object.assign(item,{pedidoId:p.id,categoria:'Pedidos de aulas',categorias:['Pedidos de aulas','Alunos'],etiqueta:'Novo pedido',
       subtitulo:['Quer contratar mais aulas',p.unidade,p.telefone&&formatarTelefone(p.telefone),p.aceitaWhatsapp?'aceita WhatsApp':''].filter(Boolean).join(' · ')});
      if(!item.ultima||item.ultima==='Toque para conversar'){item.ultima='Quer contratar mais aulas';item.ultimaMinha=false;}
      if((dataDe(p.criadoEm)||0)>(dataDe(item.ultimaEm)||0))item.ultimaEm=p.criadoEm;
      if(!item.id)item.naoLidas=1;
     }
    }catch{}
   }
   return itens.sort(porFixoEData);
  },
  async mensagens(item){
   if(item.tipo==='grupo')return (await servico.chatGrupo(item.id)).map(interna);
   if(item.tipo==='pessoa')return (await servico.chatConversa(item.id)).map(interna);
   if(item.tipo==='aluno-direto')return (await servico.chatAluno(item.id)).map(interna);
   if(!item.id)return [];
   const r=await servico.conversa(item.id);
   // 10/11/2026: autorVisivel: as mensagens da equipe mostram quem escreveu (mais de uma pessoa responde o aluno).
   return (r.mensagens||[]).map(m=>({id:m.id,em:m.em,autor:m.daEquipe?autorComCargo(m):item.nome,texto:m.texto,minha:m.daEquipe,lida:m.lida,autorVisivel:m.daEquipe}));
  },
  async enviar(item,texto){
   if(item.tipo==='grupo')return interna(await servico.chatEnviarGrupo(item.id,texto));
   if(item.tipo==='pessoa')return interna(await servico.chatEnviar(item.id,texto));
   if(item.tipo==='aluno-direto')return interna(await servico.chatEnviarAluno(item.id,texto));
   if(!item.id){const r=await servico.enviarMensagemAluno(item.alunoId,texto);item.id=r.conversaId||null;const m=r.mensagem||{id:Date.now(),em:new Date().toISOString(),texto};return {id:m.id,em:m.em,autor:autorComCargo(m),texto:m.texto,minha:true,autorVisivel:true};}
   const m=await servico.enviarMensagemConversa(item.id,texto);return {id:m.id,em:m.em,autor:autorComCargo(m),texto:m.texto,minha:true,autorVisivel:true};
  },
  async ler(item){
   if(item.tipo==='grupo')return servico.chatLerGrupo(item.id);
   if(item.tipo==='pessoa')return servico.chatLer(item.id);
   if(item.tipo==='aluno-direto')return servico.chatLerAluno(item.id);
   return item.id?servico.marcarConversaLida(item.id):undefined;
  },
  acoes(item){
   const pedido=item.pedidoId?[{rotulo:'Contato feito',confirmar:'Marcar o pedido de mais aulas como atendido? Ele sai da lista de pedidos (a conversa continua).',executar:()=>servico.atenderPedidoAulas(item.pedidoId)}]:[];
   if(item.tipo!=='aluno'||!item.id)return pedido;
   if(gerencia())return [...pedido,...(item.encaminhada?[{rotulo:'Devolver à Recepção',confirmar:'Devolver esta conversa para a Recepção?',executar:()=>servico.devolverConversa(item.id)}]:[])];
   return [...pedido,...(item.encaminhada?[]:[{rotulo:'Transferir para a Gerência',confirmar:'Transferir esta conversa para a Gerência? Ela passa a aparecer para a Gerência e o Master.',executar:()=>servico.encaminharConversa(item.id)}])];
  },
 };
}

export function fonteInstrutor(servico){
 return {
  categorias:['Grupos','Recepção','Gerência'],
  async listar(){
   const r=await servico.chatResumo();
   // 10/11/2026: o grupo geral da autoescola (equipe de todas as unidades e instrutores), fixo no topo.
   return [...(servico.chatGrupo?(r.grupos||[]).map(grupoDoChat):[]),...(r.contatos||[]).map(c=>({chave:'u:'+c.usuarioId,tipo:'pessoa',id:c.usuarioId,nome:c.nome,categoria:categoriaDaPessoa(c.categoria),subtitulo:(c.unidades||[]).join(', '),
    ultimaEm:c.ultimaEm,ultima:c.ultimaMensagem||'',ultimaMinha:c.ultimaMinha===true,naoLidas:c.naoLidas||0}))].sort(porFixoEData);
  },
  async mensagens(item){return (await (item.tipo==='grupo'?servico.chatGrupo(item.id):servico.chatConversa(item.id))).map(interna);},
  async enviar(item,texto){return interna(await (item.tipo==='grupo'?servico.chatEnviarGrupo(item.id,texto):servico.chatEnviar(item.id,texto)));},
  async ler(item){return item.tipo==='grupo'?servico.chatLerGrupo(item.id):servico.chatLer(item.id);},
 };
}

export function fonteAluno(servico,{unidade=''}={}){
 return {
  categorias:[],
  async listar(){
   const recepcao=(await servico.conversas()).map(c=>({chave:'r:'+c.autoescolaId,tipo:'recepcao',id:c.autoescolaId,nome:'Recepção'+(unidade?' · '+unidade:''),categoria:'Recepção',subtitulo:c.autoescola,
    ultimaEm:c.ultimaMensagemEm,ultima:c.ultimaMensagemEm?'':'Fale com a equipe da sua unidade',naoLidas:c.naoLidas||0,somenteLeitura:c.podeEnviar===false,mostrarAutor:true}));
   let diretas=[];
   if(servico.chatResumo){try{diretas=((await servico.chatResumo()).contatos||[]).map(c=>({chave:'u:'+c.usuarioId,tipo:'pessoa',id:c.usuarioId,nome:c.categoria+(unidade?' · '+unidade:''),categoria:c.categoria,subtitulo:c.nome,
    ultimaEm:c.ultimaEm,ultima:c.ultimaMensagem||'',ultimaMinha:c.ultimaMinha===true,naoLidas:c.naoLidas||0}));}catch{}}
   return [...recepcao,...diretas].sort(porData);
  },
  async mensagens(item){
   if(item.tipo==='pessoa')return (await servico.chatConversa(item.id)).map(interna);
   return (await servico.mensagensConversa(item.id)).map(m=>({id:m.id,em:m.em,autor:m.remetente,texto:m.texto,minha:!m.daEquipe,lida:m.lida}));
  },
  async enviar(item,texto){
   if(item.tipo==='pessoa')return interna(await servico.chatEnviar(item.id,texto));
   const m=await servico.enviarMensagemRecepcao(item.id,texto);return {id:m.id,em:m.em,autor:'Você',texto:m.texto,minha:true};
  },
  async ler(item){return item.tipo==='pessoa'?servico.chatLer(item.id):servico.marcarConversaLida(item.id);},
 };
}
