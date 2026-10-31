import {abrirFormularioVeiculo} from './cadastroRecurso.js';
import {cambioValido} from '../../../shared/js/operacaoCarro.js';
import {nomeCambio,localCarro} from '../../../shared/js/operacaoCarro.js';
import {el,botao,campo,select,entrada,modal} from './uiOperador.js';
import {formatarCpf} from '../../../shared/js/formatacao.js';
import {formatarData} from '../../../shared/js/calendario.js';
import {fimDaAula} from '../../../shared/js/disponibilidade.js';
import {localCategoriaD} from '../../../shared/js/categorias.js';
import {obterUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';

// Consulta e confirmação passam pelo serviço autorizado; nenhuma identidade vem da URL.
export function montarReservaRecepcao(raiz,servico,executar){
 const janela=modal(raiz,'Agendar aula','opAgendar'),corpo=el('div');janela.append(corpo);
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
   const par=select(pares.map((p,i)=>[String(i),`${dados.recursos.find(r=>r.id===p.instrutorId)?.nome||'Instrutor'} · ${dados.recursos.find(r=>r.id===p.veiculoId)?.nome||'Veículo'} · Categoria ${p.categoria}${p.categoria==='B'?' · '+nomeCambio(dados.recursos.find(r=>r.id===p.veiculoId)?.tipoCambio):''}`]),'0');par.dataset.opReservaPar='';
   const busca=entrada('search');busca.placeholder='Buscar aluno por nome ou CPF';busca.dataset.opReservaBusca='';
   const lista=el('div',undefined,'op-reserva-resultados'),saldo=el('p','Selecione um aluno para consultar seus créditos.','op-help'),erro=el('p');erro.setAttribute('role','alert');
   let selecionado=null,buscando=0,ocupado=false;
   const confirmar=botao('Confirmar agendamento',async()=>{
    if(ocupado||!selecionado)return;ocupado=true;confirmar.disabled=true;
    const p=pares[Number(par.value)];
    const ok=await executar(()=>servico.agendar({...p,alunoId:selecionado.id,data,inicio:hora}),'Reserva confirmada.',()=>janela.close());
    if(!ok){erro.textContent='Não foi possível reservar. Confira o aviso e consulte novamente a disponibilidade.';ocupado=false;confirmar.disabled=false;}
   },'op-button op-button-primary');confirmar.dataset.opReservaConfirmar='';confirmar.disabled=true;
   async function pesquisar(){
    const id=++buscando;selecionado=null;confirmar.disabled=true;lista.replaceChildren();saldo.textContent='Selecione um aluno para consultar seus créditos.';
    try{const p=pares[Number(par.value)],alunos=await servico.alunosAgendaveis(data,hora,p),termo=busca.value.trim().toLocaleLowerCase('pt-BR'),numeros=termo.replace(/\D/g,'');if(id!==buscando)return;
     const encontrados=alunos.filter(a=>!termo||a.nome.toLocaleLowerCase('pt-BR').includes(termo)||(numeros&&/^[\d.\-\s]+$/.test(termo)&&a.cpf?.includes(numeros)));
     for(const a of encontrados){const b=botao('',()=>{selecionado=a;lista.querySelectorAll('button').forEach(n=>n.setAttribute('aria-pressed',String(n===b)));saldo.textContent=`${a.nome} · Créditos disponíveis: ${a.saldo} · Reservadas: ${a.agendadas} · Categoria ${p.categoria}${p.categoria==='B'?' · '+nomeCambio(a.tipoCambio)+' · Local: '+a.localAula:''}`;confirmar.disabled=false;});b.dataset.opReservaAluno=a.id;b.setAttribute('aria-pressed','false');b.append(el('strong',a.nome),el('span',`${a.cpf?'CPF: '+formatarCpf(a.cpf):'Consulta restrita ao vínculo operacional da pista'} · Categoria ${a.categoria} · Unidade cadastrada: ${a.unidadeAulas}${p.categoria==='B'?' · '+nomeCambio(a.tipoCambio)+' · Local da aula: '+a.localAula:''}`));lista.append(b);}
     if(!encontrados.length)lista.append(el('p','Nenhum aluno autorizado e elegível encontrado. Confira categoria, créditos, bloqueios administrativos e conflitos do aluno.','op-help'));
    }catch(e){erro.textContent=e.message;}
   }
   busca.addEventListener('input',pesquisar);par.addEventListener('change',pesquisar);
   const acoes=el('div',undefined,'op-dialog-actions');acoes.append(botao('Voltar',()=>janela.close()),confirmar);
   const local=el('p',undefined,'op-help');
   const atualizarLocal=()=>{const p=pares[Number(par.value)];local.textContent='Local da aula: '+(p.categoria==='D'?localCategoriaD(data)?.nome:p.categoria==='A'?obterUnidadeInstitucional('Vila Velha')?.nome:localCarro({unidadeCarro:servico.identidade.unidade},data)?.nome||'Conforme operação autorizada');};
   par.addEventListener('change',atualizarLocal);atualizarLocal();
   corpo.replaceChildren(el('p',`${formatarData(data)} · ${hora}–${fimDaAula(hora)}`),campo('Instrutor responsável · veículo selecionado · categoria',par),local,campo('Selecionar aluno · nome ou CPF',busca),lista,saldo,erro,acoes);
   await pesquisar();if(!janela.open)janela.showModal();busca.focus();
  }catch(e){await executar(()=>{throw e;},'');}
 };
}
