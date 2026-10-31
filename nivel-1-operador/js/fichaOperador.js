import {autorizar,alunoAutorizado,substituir,cpfValido,formatarCpf,vinculo} from './dominioOperador.js';
import {dataValida,agoraBrasil} from '../../shared/js/calendario.js';
export const EXAMES_FICHA={toxicologico:'Exame toxicológico',oftalmologico:'Exame(s) oftalmológico(s)',psicologico:'Exame(s) psicológico(s)',medico:'Exame(s) médico(s)'};
export const SITUACOES_EXAME=['Não informado','Pendente','Aprovado','Reprovado','Não se aplica'];
export const PROVAS_FICHA={teorica:{nome:'Prova teórica'},praticaCarro:{nome:'Prova prática de carro — Categoria B',categoria:'B'},praticaMoto:{nome:'Prova prática de moto — Categoria A',categoria:'A'},praticaOnibus:{nome:'Prova prática de ônibus — Categoria D',categoria:'D'}};
export const SITUACOES_PROVA=['Não solicitado','Solicitado','Agendado','Aprovado','Reprovado','Cancelado'];
// Capacidades reservadas ao futuro N2. Não existe identidade N2 no laboratório.
// A API deverá resolver nível/permissões no servidor, nunca a partir do cliente.
function autorizarCorrecao(op,permissao){
 if(![2,3].includes(op.nivel))throw new Error('Operação reservada ao Administrador Nível 2.');
 autorizar(op,permissao);
}
const finais=['Aprovado','Reprovado','Cancelado'];
const evento=(id,aluno,tipo,titulo,dados,op,em,referencia)=>({id,alunoId:aluno.id,tipo,titulo,dados,responsavel:op.id,em,origem:'administrativo-local',referencia});
function gravar(e,a,h){return substituir(e,{...a,historico:[...(a.historico||[]),h]});}
function falhar(campos){if(Object.keys(campos).length)throw Object.assign(new Error(Object.values(campos)[0]),{campos});}
export function lerExameFicha(a,tipo){
 const antigo={oftalmologico:'vista',psicologico:'psicotecnico'}[tipo]||tipo;
 const item=a.examesAdministrativos?.[tipo]||a.acompanhamentoExames?.[tipo]||a.exames?.[antigo]||a.etapas?.[tipo];
 return {...item,status:SITUACOES_EXAME.includes(item?.status)?item.status:'Não informado'};
}
export function provasDoAluno(a){
 const lista=structuredClone(a.tentativasProvas||[]);
 for(const tipo of Object.keys(PROVAS_FICHA)){
  const antigo=a.acompanhamentoExames?.[tipo]||(tipo==='teorica'?a.exames?.teorica:null);
  if(!lista.some(p=>p.tipo===tipo)&&antigo&&SITUACOES_PROVA.includes(antigo.status)&&antigo.status!=='Não solicitado')lista.push({...antigo,id:'legado-'+tipo,tipo,ordem:1,resultado:finais.includes(antigo.status)?antigo.status:null,legado:true,historico:[]});
 }
 return lista;
}
export function editarCadastro(e,op,id,dados,eventoId,agora=new Date(),validarCpf=cpfValido){
 autorizarCorrecao(op,'editar-cadastro');const a=alunoAutorizado(e,op,id),erros={},novo={};
 const rotulos={nome:'Nome completo',cpf:'CPF',nascimento:'Data de nascimento',telefone:'Telefone',email:'E-mail',categoria:'Categoria',observacoes:'Observações administrativas'};
 for(const chave of Object.keys(dados))if(!Object.hasOwn(rotulos,chave))erros[chave]='Campo protegido ou desconhecido.';
 for(const k of Object.keys(rotulos))novo[k]=String(dados[k]??a[k]??'').trim();
 novo.cpf=novo.cpf.replace(/\D/g,'');novo.telefone=novo.telefone.replace(/\D/g,'');
 if(novo.nome.length<5||novo.nome.length>180||novo.nome.split(/\s+/).length<2)erros.nome='Informe o nome completo.';
 if(!/^[\d.\-\s]+$/.test(String(dados.cpf??a.cpf??''))||!/^\d{11}$/.test(novo.cpf))erros.cpf='Informe um CPF com exatamente 11 dígitos numéricos.';
 else if(!validarCpf(novo.cpf))erros.cpf='Informe um CPF válido.';
 if(e.alunos.some(x=>x.id!==id&&String(x.cpf).replace(/\D/g,'')===novo.cpf)||(e.contasAlunos||[]).some(c=>c.alunoId!==id&&c.login===novo.cpf))erros.cpf='CPF já cadastrado.';
 if(!dataValida(novo.nascimento)||novo.nascimento>=agoraBrasil(agora).slice(0,10))erros.nascimento='Informe uma data de nascimento anterior a hoje.';
 if(!/^[1-9]{2}\d{8,9}$/.test(novo.telefone))erros.telefone='Informe telefone com DDD.';
 if(novo.email.length>200||! /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(novo.email))erros.email='Informe um e-mail válido.';
 if(novo.observacoes.length>2000)erros.observacoes='Use até 2000 caracteres.';
 if(!['A','B','D','AB'].includes(novo.categoria))erros.categoria='Categoria inválida.';
 if(novo.categoria!==a.categoria){
  if(!op.permissoes.includes('editar-categoria'))erros.categoria='Alteração de categoria não autorizada.';
  if(vinculo({...a,...novo},op)!=='cadastro')erros.categoria='Esta alteração remove o vínculo da sua unidade. Solicite a alteração pela unidade principal autorizada.';
  if(novo.categoria.includes('B')&&!a.categoria.includes('B')&&!a.unidadeCarro)erros.categoria='A inclusão de carro exige configurar o vínculo de unidade pelo fluxo autorizado; integração pendente.';
  if(e.aulas.some(x=>x.alunoId===id&&[1,3].includes(x.status)&&!novo.categoria.includes(x.categoria))||provasDoAluno(a).some(p=>!p.arquivada&&['Solicitado','Agendado'].includes(p.status)&&PROVAS_FICHA[p.tipo]?.categoria&&!novo.categoria.includes(PROVAS_FICHA[p.tipo].categoria)))erros.categoria='Existem aulas ou provas ativas na categoria removida.';
 }
 falhar(erros);
 const alteracoes=Object.keys(rotulos).filter(k=>novo[k]!==String(a[k]??'')).map(k=>({campo:rotulos[k],antes:k==='cpf'?formatarCpf(a[k]):a[k]??'Não informado',depois:k==='cpf'?formatarCpf(novo[k]):novo[k]}));
 if(!alteracoes.length)return e;
 const h=evento(eventoId,a,'cadastro','Cadastro atualizado',alteracoes,op,agora.toISOString(),id);
 const proximo=gravar(e,{...a,...novo},h);
 // A conta continua vinculada ao ID do aluno; hash, sessões e credenciais intactos.
 return {...proximo,...(e.contasAlunos?{contasAlunos:e.contasAlunos.map(c=>c.alunoId===id?{...c,login:novo.cpf}:c)}:{})};
}
export function salvarExamesFicha(e,op,id,dados,eventoId,agora=new Date()){
 autorizar(op,'verificar');const a=alunoAutorizado(e,op,id),exames={...a.examesAdministrativos},mudancas=[];
 for(const [tipo,status] of Object.entries(dados)){
  if(!Object.hasOwn(EXAMES_FICHA,tipo)||!SITUACOES_EXAME.includes(status))throw new Error('Exame ou situação inválida.');
  const antes=lerExameFicha(a,tipo);if(antes.status===status)continue;
  if(antes.origem==='oficial')throw new Error('Informação oficial protegida.');
  exames[tipo]={...antes,status,em:agora.toISOString(),responsavel:op.id,origem:'manual-local'};
  mudancas.push({campo:EXAMES_FICHA[tipo],antes:antes.status,depois:status});
 }
 if(!mudancas.length)return e;
 return gravar(e,{...a,examesAdministrativos:exames},evento(eventoId,a,'exames','Exames atualizados',mudancas,op,agora.toISOString(),id));
}
export function movimentarProva(e,op,id,dados,eventoId,agora=new Date()){
 autorizar(op,'verificar');const a=alunoAutorizado(e,op,id),cfg=PROVAS_FICHA[dados.tipo];
 if(!cfg)throw new Error('Tipo de prova inválido.');
 const lista=provasDoAluno(a),existente=lista.find(p=>p.id===dados.tentativaId&&p.tipo===dados.tipo),acao=dados.acao||'salvar',em=agora.toISOString();
 if(acao==='arquivar')autorizarCorrecao(op,'excluir-prova');
 if(existente?.status==='Agendado'&&dados.status==='Agendado'&&dados.data!==existente.data)autorizarCorrecao(op,'editar-prova');
 if(dados.status==='Cancelado')autorizar(op,'cancelar-prova');
 if((a.historico||[]).some(h=>h.id===eventoId))return e;
 if(cfg.categoria&&!a.categoria.includes(cfg.categoria))throw new Error('Prova não autorizada para esta categoria. Registros anteriores permanecem consultáveis.');
 if(existente?.origem==='oficial')throw new Error('Informação oficial protegida.');
 let atual=existente;
 if(!atual){
  if(dados.tentativaId||acao!=='salvar')throw new Error('Tentativa não encontrada. Consulte novamente.');
  if(lista.some(p=>p.tipo===dados.tipo&&!p.arquivada&&['Solicitado','Agendado'].includes(p.status)))throw new Error('Já existe uma tentativa ativa desta prova.');
  if(!['Solicitado','Agendado'].includes(dados.status))throw new Error('Solicite ou agende a prova antes de registrar resultado.');
  atual={id:eventoId,tipo:dados.tipo,ordem:Math.max(0,...lista.filter(p=>p.tipo===dados.tipo).map(p=>p.ordem||1))+1,status:'Não solicitado',data:'',historico:[],criadoEm:em,origem:'manual-local'};
 }else if(atual.arquivada||finais.includes(atual.status))throw new Error('Tentativa encerrada. Inicie uma nova tentativa; resultados anteriores são preservados.');
 let proximo={...atual,legado:false},titulo;
 if(acao==='arquivar'){
  if(atual.status!=='Agendado')throw new Error('Somente um agendamento ativo pode ser excluído administrativamente.');
  if(String(dados.motivo||'').trim().length<5)throw new Error('Informe o motivo da exclusão (mínimo de 5 caracteres).');
  proximo={...proximo,arquivada:true,arquivadaEm:em,motivoExclusao:String(dados.motivo).trim().slice(0,1000)};titulo='Agendamento excluído administrativamente';
 }else{
  if(!SITUACOES_PROVA.includes(dados.status)||dados.status==='Não solicitado')throw new Error('Selecione uma situação válida.');
  if(finais.includes(dados.status)&&dados.confirmado!==true)throw new Error('Confirme explicitamente o resultado da tentativa.');
  if(atual.status==='Agendado'&&dados.status==='Solicitado')throw new Error('Use Editar, Registrar resultado ou Excluir agendamento para a tentativa agendada.');
  if(dados.status==='Agendado'&&!dataValida(dados.data))throw new Error('Informe uma data de prova válida.');
  proximo.status=dados.status;if(dados.status==='Agendado')proximo.data=dados.data;
  if(proximo.status===atual.status&&proximo.data===atual.data)return e;
  if(finais.includes(dados.status)){proximo.resultado=dados.status;proximo.resultadoEm=em;}
  titulo=dados.status==='Agendado'?(atual.status==='Agendado'?'Prova remarcada':'Prova agendada'):dados.status==='Solicitado'?'Prova solicitada':'Resultado de prova registrado';
 }
 proximo.responsavel=op.id;proximo.atualizadoEm=em;
 const detalhes=[{campo:cfg.nome+' · tentativa '+atual.ordem,antes:atual.status+(atual.data?' · '+atual.data:''),depois:proximo.arquivada?'Arquivada · '+proximo.motivoExclusao:proximo.status+(proximo.data?' · '+proximo.data:'')}];
 const h=evento(eventoId,a,'provas',titulo,detalhes,op,em,atual.id);
 proximo.historico=[...(atual.historico||[]),h];
 const tentativas=lista.filter(p=>p.id!==atual.id).concat(proximo);
 return gravar(e,{...a,tentativasProvas:tentativas},h);
}
const tipos={cadastro:'cadastro','acompanhamento-exames':'exames',verificacao:'exames',exame:'exames',transferencia:'unidades','acesso-local':'acessos',observacao:'cadastro',pacote:'aulas','pacote-adicional':'aulas'};
export function linhaTempoAluno(a,aulas){
 const eventos=(a.historico||[]).map((h,i)=>({...h,id:h.id||'administrativo-'+a.id+'-'+i,alunoId:a.id,grupo:tipos[h.tipo]||(['exames','provas','unidades','acessos'].includes(h.tipo)?h.tipo:'cadastro'),titulo:h.titulo||({cadastro:'Aluno cadastrado',transferencia:'Unidade de carro alterada','acesso-local':'Conta local criada',verificacao:'Verificação administrativa',observacao:'Observações atualizadas','acompanhamento-exames':'Acompanhamento atualizado'}[h.tipo]||h.tipo),descricao:h.antes?String(h.antes)+' → '+String(h.depois||''):h.depois||'',dados:h.dados||h.alteracoes||[]}));
 if(a.criadoEm&&!eventos.some(h=>h.tipo==='cadastro'))eventos.push({id:'cadastro-'+a.id,alunoId:a.id,grupo:'cadastro',titulo:'Aluno cadastrado',em:a.criadoEm,descricao:'Registro legado; responsável e condições iniciais não informados.'});
 for(const p of provasDoAluno(a).filter(p=>p.legado))eventos.push({id:p.id,alunoId:a.id,grupo:'provas',titulo:PROVAS_FICHA[p.tipo].nome+' · registro anterior',em:p.em,descricao:p.status+(p.data?' · data da prova: '+p.data:''),responsavel:p.responsavel});
 for(const aula of aulas){
  for(const h of aula.solicitacaoMedica?.eventos||[])eventos.push({id:h.id,alunoId:a.id,grupo:'aulas',titulo:h.acao,em:h.em,responsavel:h.responsavel,referencia:aula.id,descricao:h.observacoes||'',dados:[{campo:'Solicitação médica',antes:h.anterior||'Não enviada',depois:h.novo}]});
  const referencia=`${aula.categoria} · ${aula.data} · ${aula.inicio}–${aula.fim} · ${aula.unidade} · ${aula.instrutorNome||aula.instrutorId||'Instrutor não informado'} · ${aula.veiculoNome||aula.veiculoId||'Veículo não informado'}`;
  const hs=aula.historico||[],status={1:'Aula agendada',2:'Aula cancelada',3:'Aula aguardando aceite',4:'Aula recusada',5:'Aula realizada',6:'Falta registrada pelo instrutor'};
  if(aula.criadoEm)eventos.push({id:'aula-criada-'+aula.id,grupo:'aulas',titulo:'Aula agendada',em:aula.criadoEm,descricao:referencia,referencia:aula.id});
  hs.forEach((h,i)=>eventos.push({id:'aula-'+aula.id+'-'+i,alunoId:a.id,grupo:'aulas',titulo:h.acao==='troca-instrutor'?'Instrutor alterado':h.origem==='recepcao'&&h.status===6?'Falta registrada pela recepção':status[h.status]||'Aula atualizada',em:h.em,descricao:referencia+(h.motivo?' · '+h.motivo:''),responsavel:h.autor||h.responsavel,referencia:aula.id}));
  if(!hs.some(h=>h.status===aula.status)&&!(aula.status===1&&aula.criadoEm))eventos.push({id:'aula-atual-'+aula.id,alunoId:a.id,grupo:'aulas',titulo:status[aula.status]||'Aula',em:aula.status===2?aula.cancelamento?.em:aula.validadaEm,descricao:referencia,referencia:aula.id,responsavel:aula.cancelamento?.responsavel});
 }
 if(a.primeiroAcessoEm)eventos.push({id:'primeiro-acesso-'+a.id,grupo:'acessos',titulo:'Primeiro acesso concluído',em:a.primeiroAcessoEm,referencia:a.id});
 return [...new Map(eventos.map(h=>[h.id,h])).values()].map((h,i)=>({...h,ordemFonte:i})).sort((x,y)=>(Date.parse(y.em)||0)-(Date.parse(x.em)||0)||y.ordemFonte-x.ordemFonte).map(({ordemFonte,...h})=>h);
}
