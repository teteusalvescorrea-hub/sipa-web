import {abrirFormularioVeiculo} from './cadastroRecurso.js';
import {cambioValido} from '../../../shared/js/operacaoCarro.js';
import {nomeCambio,localCarro} from '../../../shared/js/operacaoCarro.js';
import {el,botao,campo,select,entrada,modal,mostrarAviso} from './uiOperador.js';
import {formatarCpf,nomeDoVeiculo} from '../../../shared/js/formatacao.js';
import {formatarData} from '../../../shared/js/calendario.js';
import {fimDaAula,ocupaRecurso} from '../../../shared/js/disponibilidade.js';
import {localCategoriaD,NOMES_CATEGORIA} from '../../../shared/js/categorias.js';
import {obterUnidadeInstitucional,nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';

// Por que um aluno encontrado na busca não pode agendar neste par. A API é quem decide a elegibilidade; isto só explica
// na tela o motivo mais provável (decisão do João em 03/11: o aluno aparece, sem poder ser escolhido, com a pendência).
function motivoInelegivel(a,p,dados,data,hora){
 if(a.situacao==='Inativo')return 'aluno inativo';
 if(!String(a.categoria||'').includes(p.categoria))return `não tem a categoria ${p.categoria}`;
 const v=dados.recursos.find(r=>r.id===p.veiculoId);
 if(p.categoria==='B'&&a.tipoCambio&&v?.tipoCambio&&a.tipoCambio!==v.tipoCambio)return `câmbio ${nomeCambio(a.tipoCambio).toLocaleLowerCase('pt-BR')}, e este veículo é ${nomeCambio(v.tipoCambio).toLocaleLowerCase('pt-BR')}`;
 if(a.bloqueioAdministrativo?.ativo)return 'agendamento bloqueado pela administração';
 const c=a.creditos?.[p.categoria];if(c&&!(c.disponiveis>0))return `sem aulas disponíveis na categoria ${p.categoria}`;
 if(dados.aulas.some(x=>x.alunoId===a.id&&x.data===data&&x.inicio===hora&&ocupaRecurso(x)))return 'já tem aula neste horário';
 return 'não elegível neste horário (confira a ficha do aluno)';
}
// Consulta e confirmação passam pelo serviço autorizado; nenhuma identidade vem da URL.
export function montarReservaRecepcao(raiz,servico,executar){
 const janela=modal(raiz,'Agendar aula','opAgendar'),corpo=el('div',undefined,'op-reserva');janela.classList.add('op-reserva-dialog');janela.append(corpo);
 let versao=0;
 return async function abrir(data,hora,filtros={}){
  const ticket=++versao;
  try{
   const dados=await servico.consultar();if(ticket!==versao)return;
   const veiculo=dados.recursos.find(v=>v.id===filtros.veiculoId);
   if(veiculo?.categoria==='B'&&!cambioValido(veiculo.tipoCambio)){
    const cadastro=await servico.recursoAdministrativo(veiculo.id);if(ticket!==versao)return;
    const d=abrirFormularioVeiculo(raiz,servico,executar,()=>abrir(data,hora,filtros),cadastro);
    const aviso=el('p','Informe o tipo de câmbio para validar a compatibilidade com o aluno. Nenhuma aula foi reservada.','op-help');d.querySelector('form').before(aviso);return;
   }
   const pares=await servico.pares(data,hora,filtros);if(ticket!==versao)return;
   if(!pares.length)throw new Error('Nenhum instrutor e veículo disponível neste horário. Confira a jornada, o almoço e os conflitos.');
   // Vindo da agenda do instrutor, a escolha é só do veículo (os dele livres no horário).
   const soVeiculo=!!filtros.instrutorId&&!filtros.veiculoId,veiculoDo=p=>dados.recursos.find(r=>r.id===p.veiculoId);
   const instrutorDo=p=>dados.recursos.find(r=>r.id===p.instrutorId)?.nome||'Instrutor';
   const par=select(pares.map((p,i)=>[String(i),[...(soVeiculo?[]:[dados.recursos.find(r=>r.id===p.instrutorId)?.nome||'Instrutor']),nomeDoVeiculo(veiculoDo(p)?.modelo||veiculoDo(p)?.nome||'Veículo',veiculoDo(p)?.placa,' '),`Categoria ${p.categoria}${p.categoria==='B'?' · '+nomeCambio(veiculoDo(p)?.tipoCambio):''}`].join(' · ')]),'0');par.dataset.opReservaPar='';par.setAttribute('aria-label',soVeiculo?'Veículo da aula':'Instrutor e veículo da aula');
   const busca=entrada('search');busca.placeholder='Buscar aluno por nome ou CPF';busca.dataset.opReservaBusca='';busca.setAttribute('aria-label','Buscar aluno por nome ou CPF');
   const lista=el('div',undefined,'op-reserva-resultados'),saldo=el('div',undefined,'op-reserva-saldo'),erro=el('p',undefined,'op-reserva-erro');erro.setAttribute('role','alert');saldo.setAttribute('role','status');
   // Os créditos do aluno escolhido, em destaque; sem aluno, a orientação.
   const mostrarSaldo=(a,p)=>{saldo.hidden=false;saldo.classList.toggle('op-reserva-saldo-ativo',!!a);if(!a){saldo.replaceChildren(document.createTextNode('Selecione um aluno para consultar seus créditos.'));return;}
    const chips=el('div',undefined,'op-reserva-chips');for(const t of [`Créditos disponíveis: ${a.saldo}`,`Reservadas: ${a.agendadas}`,`Categoria ${p.categoria}`,...(p.categoria==='B'?[nomeCambio(a.tipoCambio),'Local: '+a.localAula]:[])])chips.append(el('span',t));saldo.replaceChildren(el('strong',a.nome),chips);
    // 17/11/2026 (pedido do usuário): as reposições por atestado do aluno; com uma aberta na categoria, esta aula vira a
    // reposição (a API liga a próxima aula agendada) e a agenda mostra "Reposição".
    if(servico.reposicoesDoAluno){const pedido=a.id;servico.reposicoesDoAluno(a.id).then(lista=>{if(selecionado?.id!==pedido)return;const abertas=lista.filter(r=>!r.aulaReposicaoId),daCategoria=abertas.filter(r=>r.categoria===p.categoria).length;if(!abertas.length)return;
     const chip=el('span',`Reposição por atestado: ${abertas.length}`,'op-reserva-chip-reposicao');chips.append(chip);
     if(daCategoria)saldo.append(el('p',`Esta aula vai ficar marcada como reposição por atestado (${daCategoria} ${daCategoria===1?'reposição autorizada':'reposições autorizadas'} na categoria ${p.categoria}).`,'op-reserva-aviso-reposicao'));}).catch(()=>{});}
   };
   mostrarSaldo(null);
   let selecionado=null,buscando=0,ocupado=false;
   // Alunos elegíveis consultados uma vez por par nesta abertura; a busca filtra aqui, sem chamar a API a cada tecla.
   const elegiveis=new Map(),alunosDoPar=i=>{if(!elegiveis.has(i)){const r=servico.alunosAgendaveis(data,hora,pares[i]);elegiveis.set(i,r);r.catch(()=>elegiveis.delete(i));}return elegiveis.get(i);};
   const confirmar=botao('Confirmar agendamento',async()=>{
    if(ocupado||!selecionado)return;ocupado=true;confirmar.disabled=true;
    const p=pares[Number(par.value)];
    const ok=await executar(()=>servico.agendar({...p,alunoId:selecionado.id,data,inicio:hora}),'Reserva confirmada.',()=>janela.close());
    // Reserva recusada: a próxima busca consulta de novo a elegibilidade.
    if(!ok){erro.textContent='Não foi possível reservar. Confira o aviso e consulte novamente a disponibilidade.';ocupado=false;confirmar.disabled=false;elegiveis.clear();}
   },'op-button op-button-primary');confirmar.dataset.opReservaConfirmar='';confirmar.disabled=true;
   async function pesquisar(){
    const id=++buscando;selecionado=null;confirmar.disabled=true;lista.replaceChildren();mostrarSaldo(null);
    try{const p=pares[Number(par.value)],alunos=await alunosDoPar(Number(par.value)),termo=busca.value.trim().toLocaleLowerCase('pt-BR'),numeros=termo.replace(/\D/g,'');if(id!==buscando)return;
     const encontrados=alunos.filter(a=>!termo||a.nome.toLocaleLowerCase('pt-BR').includes(termo)||(numeros&&/^[\d.\-\s]+$/.test(termo)&&a.cpf?.includes(numeros)));
     // 16/11/2026 (pedido do usuário): o item do aluno com as iniciais, o nome e os dados em duas linhas curtas. Usa classe
     // própria (sem .op-button): a altura mínima do botão comum espremia o item e o CPF vazava por cima do aluno seguinte.
     for(const a of encontrados){const b=botao('',()=>{selecionado=a;lista.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));mostrarSaldo(a,p);confirmar.disabled=false;},'op-reserva-aluno');b.dataset.opReservaAluno=a.id;b.dataset.iniciais=String(a.nome||'').trim().split(/\s+/).filter(Boolean).filter((_,i,t)=>i===0||i===t.length-1).map(n=>n[0]).join('').toLocaleUpperCase('pt-BR');b.setAttribute('aria-pressed','false');
      b.append(el('strong',a.nome),el('span',`${a.cpf?'CPF: '+formatarCpf(a.cpf):'Consulta restrita ao vínculo operacional da pista'} · Categoria ${a.categoria}${p.categoria==='B'&&a.tipoCambio?' · '+nomeCambio(a.tipoCambio):''}`),el('span',`Cadastro: ${nomeUnidadeInstitucional(a.unidadeAulas)}${p.categoria==='B'&&a.localAula?' · Aula em: '+a.localAula:''}`));lista.append(b);}
     // Com algo digitado, quem não é elegível também aparece, sem poder ser escolhido, com o motivo.
     const elegiveis=new Set(alunos.map(a=>a.id)),outros=termo?dados.alunos.filter(a=>!elegiveis.has(a.id)&&(a.nome.toLocaleLowerCase('pt-BR').includes(termo)||(numeros&&/^[\d.\-\s]+$/.test(termo)&&a.cpf?.includes(numeros)))).slice(0,10):[];
     for(const a of outros){const linha=el('div',undefined,'op-reserva-inelegivel');linha.dataset.opReservaInelegivel=a.id;linha.append(el('strong',a.nome),el('span',`${a.cpf?'CPF: '+formatarCpf(a.cpf)+' · ':''}Não pode agendar: ${motivoInelegivel(a,p,dados,data,hora)}`));lista.append(linha);}
     // Sem aluno para escolher, a orientação dos créditos não aparece (o aviso da lista basta).
     saldo.hidden=!encontrados.length;
     if(!encontrados.length&&!outros.length)lista.append(el('p','Nenhum aluno autorizado e elegível encontrado. Confira categoria, créditos, bloqueios administrativos e conflitos do aluno.','op-reserva-vazio'));
    }catch(e){erro.textContent=e.message;}
   }
   busca.addEventListener('input',pesquisar);par.addEventListener('change',pesquisar);
   const acoes=el('div',undefined,'op-dialog-actions');acoes.append(botao('Voltar',()=>janela.close()),confirmar);
   // Resumo do horário: dia, horário e, conforme o par escolhido, instrutor, local e categoria.
   const dia=new Date(data+'T12:00:00').toLocaleDateString('pt-BR',{weekday:'long'}),resumo=el('div',undefined,'op-reserva-resumo'),quando=el('div',undefined,'op-reserva-quando'),fatos=el('dl',undefined,'op-reserva-fatos');
   quando.append(el('strong',dia.charAt(0).toUpperCase()+dia.slice(1)+', '+formatarData(data)),el('span',`${hora} às ${fimDaAula(hora)}`));
   const fato=rotulo=>{const item=el('div'),valor=el('dd');item.append(el('dt',rotulo),valor);fatos.append(item);return valor;},fInstrutor=fato('Instrutor'),fLocal=fato('Local da aula'),fCategoria=fato('Categoria');resumo.append(quando,fatos);
   const atualizarResumo=()=>{const p=pares[Number(par.value)];fInstrutor.textContent=soVeiculo?dados.recursos.find(r=>r.id===filtros.instrutorId)?.nome||'Instrutor':instrutorDo(p);
    fLocal.textContent=(p.categoria==='D'?localCategoriaD(data)?.nome:p.categoria==='A'?obterUnidadeInstitucional('Vila Velha')?.nome:localCarro({unidadeCarro:filtros.unidade||servico.identidade.unidade},data)?.nome)||'Conforme operação autorizada';
    fCategoria.textContent=p.categoria+' — '+(NOMES_CATEGORIA[p.categoria]||'')+(p.categoria==='B'&&veiculoDo(p)?.tipoCambio?' · '+nomeCambio(veiculoDo(p).tipoCambio):'');};
   par.addEventListener('change',atualizarResumo);atualizarResumo();
   // Os passos: 1. o veículo (ou o instrutor e o veículo); 2. o aluno.
   const secao=(numero,titulo,...filhos)=>{const s=el('section',undefined,'op-reserva-secao'),h=el('h3',undefined,'op-reserva-titulo');h.append(el('span',numero,'op-reserva-numero'),document.createTextNode(titulo));s.append(h,...filhos);return s;};
   const caixaBusca=el('div',undefined,'op-reserva-busca');caixaBusca.append(busca);
   corpo.replaceChildren(resumo,secao('1',soVeiculo?'Veículo da aula':'Instrutor e veículo',par),secao('2','Aluno',caixaBusca,lista,saldo),erro,acoes);
   await pesquisar();if(!janela.open)janela.showModal();busca.focus();
  }catch(e){
   mostrarAviso(raiz,'Não foi possível agendar','opReservaErro',el('p',e?.message||'Não foi possível concluir a operação.','op-help'));
  }
 };
}
