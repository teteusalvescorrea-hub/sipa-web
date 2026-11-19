// 09/11/2026: "Documentos do aluno" na ficha (Recepção, Gerência e Master): o que for anexado aqui aparece na conta do
// aluno, em "Meus documentos". O contrato da matrícula e o agendamento da prova também aparecem (cada um tem a sua tela).
import {el,botao,campo,select,entrada,campoArquivo,modal} from './uiOperador.js';
import {confirmarAcao} from '../../../shared/components/confirmarAcao.js';

export const CATEGORIAS_DOCUMENTO=[['1','Contrato'],['2','Regras de roupas e calçados'],['3','LADV'],['4','Resultado de prova'],['5','Agendamento de prova'],['6','Outro documento']];
const data=iso=>{const d=new Date(iso);return Number.isNaN(d.getTime())?'':d.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});};

export function blocoDocumentosAluno(raiz,servico,aluno,{podeAlterar=false,informar=()=>{}}={}){
 const s=el('section',undefined,'op-ficha-bloco op-docs-aluno');s.dataset.opDocumentos='';
 const cab=el('div',undefined,'op-docs-cabecalho');cab.append(el('h4','Documentos do aluno'));
 if(podeAlterar&&servico.anexarDocumentoAluno){const anexar=botao('Anexar documento',()=>abrirAnexo(),'op-button op-button-primary');anexar.dataset.opAnexarDocumento='';cab.append(anexar);}
 const ajuda=el('p','Tudo o que for anexado aqui aparece para o aluno em "Meus documentos".','op-inline-note');
 const lista=el('ul',undefined,'op-docs-lista');lista.append(el('li','Carregando documentos…','op-docs-vazio'));
 s.append(cab,ajuda,lista);

 async function carregar(){
  if(!servico.documentosAluno){lista.replaceChildren(el('li','Disponível com a API.','op-docs-vazio'));return;}
  let docs;try{docs=await servico.documentosAluno(aluno.id);}catch(e){lista.replaceChildren(el('li',e.message||'Não foi possível carregar os documentos.','op-docs-vazio'));return;}
  if(!docs.length){lista.replaceChildren(el('li','Nenhum documento ainda.','op-docs-vazio'));return;}
  lista.replaceChildren(...docs.map(d=>{
   const li=el('li',undefined,'op-docs-item'),info=el('div',undefined,'op-docs-info');
   info.append(el('strong',d.titulo),el('small',[d.categoriaNome,d.nomeArquivo,data(d.enviadoEm)].filter(Boolean).join(' · ')));
   if(d.geral)info.append(el('span','Todos os alunos','op-docs-tag'));
   const acoes=el('div',undefined,'op-docs-acoes');
   acoes.append(botao('Abrir',async()=>{try{const b=await servico.arquivoDocumentoAluno(aluno.id,d.id);window.open(URL.createObjectURL(b),'_blank','noopener');}catch(e){informar(e.message,true);}},'op-link'));
   if(podeAlterar&&d.removivel&&servico.removerDocumentoAluno){const r=botao('Remover',async()=>{
     if(!await confirmarAcao(d.geral?'Remover este documento? Ele é geral: sai da conta de todos os alunos.':'Remover este documento da conta do aluno?',{titulo:'Remover documento',confirmar:'Remover',perigo:true}))return;
     try{await servico.removerDocumentoAluno(aluno.id,d.id);informar('Documento removido.');await carregar();}catch(e){informar(e.message,true);}},'op-link op-link-perigo');acoes.append(r);}
   li.append(info,acoes);return li;
  }));
 }

 function abrirAnexo(){
  const d=modal(raiz,'Anexar documento','opAnexarDocumento'),f=el('form',undefined,'op-form-fields');
  const categoria=select([['','Selecione o tipo'],...CATEGORIAS_DOCUMENTO]),titulo=entrada('text'),arquivo=entrada('file'),erro=el('p');erro.setAttribute('role','alert');
  categoria.required=true;titulo.maxLength=150;titulo.placeholder='Opcional (sem título, vale o tipo)';arquivo.required=true;arquivo.accept='.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
  const todos=el('label',undefined,'op-docs-todos'),marca=entrada('checkbox');todos.append(marca,el('span','Vale para todos os alunos da autoescola (ex.: regras de roupas e calçados)'));
  const salvar=el('button','Anexar','op-button op-button-primary');salvar.type='submit';
  f.append(campo('Tipo',categoria),campo('Título',titulo),campo('Arquivo',campoArquivo(arquivo)),todos,erro,salvar);d.append(f);
  f.onsubmit=async e=>{e.preventDefault();if(!f.reportValidity())return;salvar.disabled=true;erro.textContent='';
   try{await servico.anexarDocumentoAluno(aluno.id,{categoria:Number(categoria.value),titulo:titulo.value.trim(),paraTodos:marca.checked,arquivo:arquivo.files[0]});d.close();informar('Documento anexado. Já aparece para o aluno em "Meus documentos".');await carregar();}
   catch(x){erro.textContent=x.message;}finally{salvar.disabled=false;}};
  d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
 }

 carregar();
 return s;
}
