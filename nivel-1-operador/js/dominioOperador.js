import {escopoPermitido} from '../../shared/js/permissoesAdministrativas.js';
import {resolverInstrutorCarro,recursoNaOperacaoCarro,CAMBIOS,DESLOCAMENTOS_CARRO,cambioValido,unidadeCarroPermitida,recursoCarroCompativel,recursoCarroConsultavel,operacaoCarro,localCarro,motivoCarro} from '../../shared/js/operacaoCarro.js';
// Regras puras do atendimento. O adaptador integrado deverá repetir as autorizações
// no servidor: estas funções não substituem a autorização da API.
import { UNIDADES_INSTITUCIONAIS, normalizarChaveUnidade } from '../../shared/js/catalogoUnidades.js';
import { hojeBrasil, dataValida, agoraBrasil } from '../../shared/js/calendario.js';
import { GRADE_CENTRO,motivoNovoAgendamento, validarHorario, fimDaAula, conflito, ocupaRecurso, recursoAtivo } from '../../shared/js/disponibilidade.js';
import { calcularPrazoCancelamento, criarCancelamento,identificarMotivo,POLITICA_CANCELAMENTO } from '../../aluno/js/domain/agendamentoAluno.js';
import { TIPOS_EXAME } from './exames.js';
import {resumirCreditosRecepcao,motivoBloqueioCreditos} from '../../aluno/js/domain/creditosRecepcao.js';
import {motivoAlmoco,localCategoriaD,motivoCatalogoOnibus,recursoCategoriaD,recursosOperacionaisD,onibusTemporario,ALMOCOS,INTERVALOS_ALMOCO,MATRICULAS} from '../../shared/js/categorias.js';

export const unidade = valor => valor === 'Centro' ? 'Vila Velha' : normalizarChaveUnidade(valor);
export const UNIDADES = UNIDADES_INSTITUCIONAIS.map(u => [u.id, u.nome]);
export {ETAPAS} from '../../shared/js/elegibilidadeAluno.js';
import {ETAPAS} from '../../shared/js/elegibilidadeAluno.js';
export const SITUACOES = ['Não informado', 'Pendente', 'Aprovado', 'Reprovado', 'Vencido'];
const statusExames=['Não informado','Pendente','Aprovado','Reprovado'];
const statusPraticas=['Não solicitado','Solicitado','Agendado','Aprovado','Reprovado','Cancelado'];
export const ACOMPANHAMENTOS=Object.freeze({
    teorica:{nome:'Prova teórica',status:statusExames,legado:'teorica'},
    toxicologico:{nome:'Exame toxicológico',status:[...statusExames,'Não se aplica'],legado:'toxicologico'},
    oftalmologico:{nome:'Exame(s) oftalmológico(s)',status:statusExames,legado:'vista'},
    praticaCarro:{nome:'Prova prática de carro — Categoria B',status:statusPraticas,categoria:'B',data:'Data da prova de carro'},
    praticaMoto:{nome:'Prova prática de moto — Categoria A',status:statusPraticas,categoria:'A',data:'Data da prova de moto'}
});
export function lerAcompanhamento(aluno,tipo){
    const cfg=ACOMPANHAMENTOS[tipo];if(!cfg)throw new Error('Acompanhamento inválido.');
    const item=aluno.acompanhamentoExames?.[tipo]||aluno.exames?.[cfg.legado];
    return {...item,status:cfg.status.includes(item?.status)?item.status:cfg.status[0],data:item?.data||''};
}
export function validarAcompanhamento(aluno,dados){
    const erros={};
    for(const [tipo,item] of Object.entries(dados||{})){
        const cfg=ACOMPANHAMENTOS[tipo];
        if(!cfg||!item||typeof item!=='object'){erros[tipo]='Acompanhamento inválido.';continue;}
        if(cfg.categoria&&!aluno.categoria.includes(cfg.categoria)){erros[tipo]='Prova não autorizada para a categoria do aluno.';continue;}
        if(!cfg.status.includes(item.status)){erros[tipo]='Selecione uma situação válida.';continue;}
        if(cfg.categoria&&item.status==='Agendado'&&!dataValida(item.data))erros[tipo]=`Informe uma ${cfg.data.toLocaleLowerCase('pt-BR')} válida.`;
        const atual=lerAcompanhamento(aluno,tipo);
        if(atual.origem==='oficial'&&(atual.status!==item.status||(cfg.categoria&&item.status==='Agendado'&&atual.data!==item.data)))erros[tipo]='Informação oficial protegida; consulte a fonte autorizada.';
    }
    return erros;
}
export function salvarAcompanhamento(estado,identidade,id,dados,instante=new Date()){
    if(identidade.nivel===1&&Object.keys(dados||{}).some(k=>['teorica','praticaCarro','praticaMoto'].includes(k)))throw new Error('Utilize o fluxo de tentativas; correções de provas são reservadas ao Nível 2.');
    autorizar(identidade,'verificar');const a=alunoAutorizado(estado,identidade,id),erros=validarAcompanhamento(a,dados);
    if(Object.keys(erros).length)throw Object.assign(new Error(Object.values(erros)[0]),{campos:erros});
    const acompanhamento={...a.acompanhamentoExames},alteracoes=[],em=instante.toISOString();
    for(const [tipo,item] of Object.entries(dados||{})){
        const cfg=ACOMPANHAMENTOS[tipo],anterior=lerAcompanhamento(a,tipo),data=cfg.categoria&&item.status==='Agendado'?item.data:anterior.data;
        if(anterior.status===item.status&&anterior.data===data)continue;
        const depois={status:item.status,data};alteracoes.push({campo:tipo,antes:{status:anterior.status,data:anterior.data},depois});
        acompanhamento[tipo]={...anterior,...depois,origem:'manual-local',responsavel:identidade.id,em};
    }
    if(!alteracoes.length)return estado;
    const resumo=alteracoes.map(x=>`${ACOMPANHAMENTOS[x.campo].nome}: ${x.antes.status}${x.antes.data?' ('+x.antes.data+')':''} → ${x.depois.status}${x.depois.data?' ('+x.depois.data+')':''}`).join('; ');
    return substituir(estado,{...a,acompanhamentoExames:acompanhamento,historico:[...a.historico,{tipo:'acompanhamento-exames',em,responsavel:identidade.id,depois:resumo,alteracoes}]});
}
export const principal = a => unidade(a.unidadePrincipal || a.unidade);
export const carro = a => a.categoria.includes('B') ? unidade(a.unidadeCarro || a.unidadePrincipal || a.unidade) : '';
export {formatarCpf} from '../../shared/js/formatacao.js';
export function cpfValido(valor) {
    const cpf = String(valor).replace(/\D/g, '');
    if (!/^\d{11}$/.test(cpf) || /^(\d)\1{10}$/.test(cpf)) return false;
    return [9, 10].every(n => { let soma = 0; for (let i = 0; i < n; i++) soma += Number(cpf[i]) * (n + 1 - i); return Number(cpf[n]) === (soma * 10 % 11 % 10); });
}
export function autorizar(identidade, permissao) {
    if (!identidade?.id || !UNIDADES.some(([id]) => id === unidade(identidade.unidade)) || !identidade.permissoes?.includes(permissao)) throw new Error('Permissão insuficiente para esta operação.');
}
export function vinculo(a, identidade) {
    if(identidade.nivel>=2)return escopoPermitido(identidade,principal(a))?'cadastro':null;
    const u = unidade(identidade.unidade);
    if (principal(a) === u || carro(a) === u) return 'cadastro';
    return (u === 'Vila Velha' && a.categoria.includes('A'))||(u==='Cobilândia'&&a.categoria==='D') ? 'pista' : null;
}
export function alunoAutorizado(estado, identidade, id, completo = true) {
    autorizar(identidade, 'consultar');
    const a = estado.alunos.find(a => a.id === id), v = a && vinculo(a, identidade);
    if (a?.excluidoEm || !v || (completo && v !== 'cadastro')) throw new Error('Aluno sem vínculo cadastral autorizado com esta unidade.');
    return a;
}
export function consultarAlunos(estado, identidade) {
    autorizar(identidade, 'consultar');
    return estado.alunos.filter(a => !a.excluidoEm && vinculo(a, identidade) === 'cadastro').map(a => structuredClone(a));
}
export function consultarRecursos(estado, identidade) {
    autorizar(identidade, 'consultar');
    const operacionais=recursosOperacionaisD(estado.recursos);
    return estado.recursos.filter(r => !r.excluidoEm && (escopoPermitido(identidade,unidade(r.unidade))||recursoMotoCentral(r)||recursoCategoriaD(r)||recursoCarroConsultavel(r,identidade.unidade))&&(!onibusTemporario(r)||operacionais.some(x=>x.id===r.id))).map(r => structuredClone(r));
}
export function consultarCadastrosRecursos(estado,identidade){autorizar(identidade,'consultar');return estado.recursos.filter(r=>!r.excluidoEm&&escopoPermitido(identidade,unidade(r.unidade))).map(r=>structuredClone(r));}
export function recursoAdministrativo(estado,identidade,id){const r=consultarCadastrosRecursos(estado,identidade).find(r=>r.id===id);if(!r)throw new Error('Cadastro de recurso fora do escopo administrativo desta unidade.');return r;}
export const recursoMotoCentral=r=>unidade(r.unidade)==='Vila Velha'&&(r.tipo==='Veículos'?r.categoria==='A':r.tipo==='Instrutores'&&r.categorias?.includes('A'));
export function consultarAgendaMotos(estado,identidade){
    autorizar(identidade,'consultar');
    return estado.aulas.filter(a=>a.categoria==='A').map(a=>({id:a.id,categoria:a.categoria,data:a.data,inicio:a.inicio,fim:a.fim,status:a.status,unidade:a.unidade,instrutorId:a.instrutorId,veiculoId:a.veiculoId,alunoNome:estado.alunos.find(s=>s.id===a.alunoId)?.nome||'Aluno não informado',instrutorNome:estado.recursos.find(r=>r.id===a.instrutorId)?.nome||'Não informado',veiculoNome:estado.recursos.find(r=>r.id===a.veiculoId)?.nome||'Não informado'}));
}
export function consultarAgenda(estado, identidade) {
    autorizar(identidade, 'consultar');
    // A aula antiga permanece consultável na unidade de origem após a transferência.
    return estado.aulas.filter(a => escopoPermitido(identidade,unidade(a.unidade))||(a.categoria==='D'&&estado.alunos.some(s=>s.id===a.alunoId&&vinculo(s,identidade)==='cadastro'))).map(({solicitacaoMedica,...a}) => ({ ...structuredClone(a),
        alunoNome: estado.alunos.find(s => s.id === a.alunoId)?.nome || 'Cadastro indisponível',
        instrutorNome: estado.recursos.find(r => r.id === a.instrutorId)?.nome || 'Não informado',
        veiculoNome: estado.recursos.find(r => r.id === a.veiculoId)?.nome || 'Não informado' }));
}
// Permissão específica de leitura da operação compartilhada D. Não entrega
// cadastro, CPF ou histórico administrativo de alunos de outras unidades.
export function consultarAgendaOnibus(estado, identidade) {
    autorizar(identidade,'consultar');
    return estado.aulas.filter(a=>a.categoria==='D').map(a=>({
        id:a.id,categoria:a.categoria,data:a.data,inicio:a.inicio,fim:a.fim,
        status:a.status,unidade:a.unidade,instrutorId:a.instrutorId,veiculoId:a.veiculoId,
        localReal:structuredClone(a.localReal),
        alunoNome:estado.alunos.find(s=>s.id===a.alunoId)?.nome||'Aluno não informado',
        instrutorNome:estado.recursos.find(r=>r.id===a.instrutorId)?.nome||'Não informado',
        veiculoNome:estado.recursos.find(r=>r.id===a.veiculoId)?.nome||'Não informado'
    }));
}
export function validarCadastroAluno(dados, identidade, alunos = [], instante = new Date(),validarCpf=cpfValido) {
    const erros={},categoria=dados.categoria;
    if(['B','AB'].includes(categoria)){if(!cambioValido(dados.tipoCambio))erros.tipoCambio='Selecione Manual ou Automático.';else if(!unidadeCarroPermitida(dados.tipoCambio,dados.unidadeCarro))erros.unidadeCarro='Unidade incompatível com o tipo de carro.';}
    const nome = String(dados.nome || '').trim(), cpf = String(dados.cpf || '').replace(/\D/g, ''), telefone = String(dados.telefone || '').replace(/\D/g, ''), email = String(dados.email || '').trim();
    if (nome.length < 5 || nome.length>180 || nome.split(/\s+/).length < 2) erros.nome='Informe o nome completo (até 180 caracteres).';
    if (!/^[\d.\-\s]+$/.test(String(dados.cpf||''))||!/^\d{11}$/.test(cpf)) erros.cpf='Informe um CPF com exatamente 11 dígitos numéricos.';
    else if (!validarCpf(cpf)) erros.cpf='Informe um CPF válido.';
    else if (alunos.some(a=>a.cpf===cpf)) erros.cpf='CPF já cadastrado. Solicite a consulta do vínculo existente.';
    if (!dataValida(dados.nascimento) || dados.nascimento >= agoraBrasil(instante).slice(0,10)) erros.nascimento='Informe uma data de nascimento válida anterior a hoje.';
    if (!/^[1-9]{2}\d{8,9}$/.test(telefone)) erros.telefone='Informe um telefone com DDD (10 ou 11 dígitos).';
    if (email.length>200 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) erros.email='Informe um e-mail válido.';
    if (!['A','B','D','AB'].includes(categoria)) erros.categoria='Selecione a categoria.';
    if (!UNIDADES.some(([id])=>id===unidade(identidade?.unidade))) erros.unidade='Unidade principal inválida. Confira o vínculo do operador.';
    if (['B','AB'].includes(categoria) && !UNIDADES.some(([id])=>id===unidade(dados.unidadeCarro))) erros.unidadeCarro='Selecione a unidade para aulas de carro.';
    for(const [cat,chave,nome] of [['B','quantidadeCarro','carro'],['A','quantidadeMoto','moto'],['D','quantidadeOnibus','ônibus']]){
        const valor=String(dados[chave]??'').trim();
        if(['A','B','D','AB'].includes(categoria)&&categoria.includes(cat)&&(!/^[1-9]\d*$/.test(valor)||!Number.isSafeInteger(Number(valor))))erros[chave]=`Informe a quantidade de aulas de ${nome} (inteiro positivo).`;
    }
    if (!String(dados.observacoes||'').trim()) erros.observacoes='Preencha as observações administrativas.';
    else if(String(dados.observacoes).length>2000)erros.observacoes='Use até 2000 caracteres nas observações.';
    return erros;
}
export function cadastrarRecurso(estado,identidade,dados,id){
 autorizar(identidade,'cadastrar-recurso');
 const referencia=dados.categoria==='A'?'Vila Velha':dados.categoria==='D'?'Cobilândia':unidade(identidade.unidade);
 if(referencia!==unidade(identidade.unidade)||dados.unidade&&unidade(dados.unidade)!==referencia)throw new Error('Cadastro fora do escopo administrativo da unidade de referência da categoria.');
 if(dados.inicio==null&&dados.fim==null)dados={...dados,inicio:String(Math.min(...GRADE_CENTRO.semana)).padStart(2,'0')+':00',fim:String(GRADE_CENTRO.fechaTarde).padStart(2,'0')+':00'};
 if(!['Instrutores','Veículos'].includes(dados.tipo)||String(dados.nome||'').trim().length<3||!String(dados.identificacao||'').trim())throw new Error('Informe nome, identificação e tipo do recurso.');
 if(!MATRICULAS.includes(dados.categoria)||(dados.tipo==='Veículos'&&dados.categoria==='AB'))throw new Error('Categoria de recurso inválida.');
 if(dados.categoria==='D'&&estado.recursos.some(r=>recursoCategoriaD(r)&&!onibusTemporario(r)&&r.tipo===dados.tipo&&r.ativo===true&&r.disponivel!==false))throw new Error('Já existe um recurso ativo desse tipo na agenda única da Categoria D. Consulte o cadastro existente; não será criada outra agenda.');
 if(dados.tipo==='Instrutores'&&![...ALMOCOS,...INTERVALOS_ALMOCO].some(([id])=>id===dados.horarioAlmoco))throw new Error('Escolha obrigatoriamente o horário de almoço do instrutor.');
 if(!/^\d{2}:00$/.test(dados.inicio)||!/^\d{2}:00$/.test(dados.fim)||dados.inicio>='19:00'||dados.fim>'19:00'||dados.inicio<'07:00'||dados.fim<=dados.inicio)throw new Error('Informe disponibilidade válida, em horas inteiras, entre 07:00 e 19:00.');
 if(!id||estado.recursos.some(r=>r.id===id||r.tipo===dados.tipo&&r.identificacao===dados.identificacao))throw new Error('Identificação já cadastrada.');
 if(dados.tipo==='Veículos'&&dados.categoria==='B'&&(!cambioValido(dados.tipoCambio)||!unidadeCarroPermitida(dados.tipoCambio,identidade.unidade)))throw new Error('Informe o tipo de câmbio e uma unidade compatível.');
 const operacoesCarro=dados.operacoesCarro||[];
 if(!Array.isArray(operacoesCarro)||operacoesCarro.some(x=>!DESLOCAMENTOS_CARRO.some(op=>op.origem===x.origem&&op.destino===x.destino&&op.dia===x.dia&&[op.origem,op.destino].includes(unidade(identidade.unidade))))||operacoesCarro.length&&!dados.categoria.includes('B'))throw new Error('Operação de deslocamento não autorizada para este recurso.');
 const r={operacoesCarro,...(dados.tipo==='Veículos'&&dados.categoria==='B'?{tipoCambio:dados.tipoCambio}:{}),...(dados.tipo==='Instrutores'&&dados.cpf?{cpf:String(dados.cpf).replace(/\D/g,'')}:{}),id,tipo:dados.tipo,nome:String(dados.nome).trim(),identificacao:String(dados.identificacao).trim(),unidade:unidade(identidade.unidade),ativo:dados.ativo??true,disponivel:dados.disponivel??true,observacoes:String(dados.observacoes||'').trim(),origem:'manual-local',...(dados.tipo==='Instrutores'?{categorias:dados.categoria==='AB'?['A','B']:[dados.categoria],horarioAlmoco:dados.horarioAlmoco}:{categoria:dados.categoria,placa:dados.identificacao}),disponibilidade:Object.fromEntries([1,2,3,4,5].map(d=>[d,[{inicio:dados.inicio,fim:dados.fim}]]))};
 r.disponibilidade[6]=dados.categoria==='D'?[{inicio:dados.inicio,fim:dados.fim}]:dados.inicio<'12:00'?[{inicio:dados.inicio,fim:dados.fim<'12:00'?dados.fim:'12:00'}]:[];
 if(r.tipo==='Veículos'&&['A','B','D'].includes(r.categoria)){
  const legados=estado.recursos.filter(i=>i.tipo==='Instrutores'&&i.veiculoIds?.includes(id));
  const candidatos=instrutoresParaVeiculo(estado,identidade,r.categoria);const i=instrutorResponsavelAutorizado(estado,identidade,r,dados.instrutorId||(legados.length===1?legados[0].id:r.categoria==='D'&&candidatos.length===1?candidatos[0].id:''));r.instrutorId=i.id;
  return {...estado,recursos:[...estado.recursos.map(x=>x.id===i.id?{...x,veiculoIds:[...new Set([...(x.veiculoIds||[]),id])]}:x),r]};
 }
 return {...estado,recursos:[...estado.recursos,r]};
}
export function editarInstrutor(estado,identidade,id,dados,instante=new Date()){
 autorizar(identidade,'editar-instrutor');
 const anterior=estado.recursos.find(r=>r.id===id&&r.tipo==='Instrutores');
 if(!anterior||!escopoPermitido(identidade,unidade(anterior.unidade))||unidade(dados.unidade||anterior.unidade)!==unidade(anterior.unidade))throw new Error('Instrutor fora do escopo de edição desta unidade.');
 if(Object.keys(dados).some(k=>!['nome','identificacao','categoria','unidade','inicio','fim','horarioAlmoco','ativo','disponivel','observacoes','alterarAlmoco','cpf'].includes(k)))throw new Error('Campo protegido na edição de instrutor.');
 if(dados.ativo!=null&&typeof dados.ativo!=='boolean'||dados.disponivel!=null&&typeof dados.disponivel!=='boolean'||String(dados.observacoes||'').length>2000)throw new Error('Informe situação operacional e observações válidas.');
 const categoriaAnterior=anterior.categorias?.join(''),jornadaAnterior=anterior.disponibilidade?.[1]?.[0]||anterior.disponibilidadeSemanal?.find(f=>f.dia===1);
 const alterouJornada=dados.inicio!=null||dados.fim!=null;
 dados={...dados,inicio:dados.inicio??jornadaAnterior?.inicio??'07:00',fim:dados.fim??jornadaAnterior?.fim??'19:00',ativo:dados.ativo??anterior.ativo,disponivel:dados.disponivel??anterior.disponivel};
 // Reutiliza a validação de cadastro sem criar ID, apagar vínculos ou mudar a origem.
 if(dados.categoria!==categoriaAnterior&&['A','D'].includes(dados.categoria)&&unidade(anterior.unidade)!==(dados.categoria==='A'?'Vila Velha':'Cobilândia'))throw new Error('Categoria fora do escopo administrativo da unidade.');
 const validado=cadastrarRecurso({...estado,recursos:estado.recursos.filter(r=>r.id!==id)}, {...identidade,unidade:dados.categoria==='A'?'Vila Velha':dados.categoria==='D'?'Cobilândia':identidade.unidade,permissoes:[...identidade.permissoes,'cadastrar-recurso']},{...dados,unidade:dados.categoria==='A'?'Vila Velha':dados.categoria==='D'?'Cobilândia':identidade.unidade,tipo:'Instrutores',horarioAlmoco:dados.alterarAlmoco?dados.horarioAlmoco:anterior.horarioAlmoco||'11-12',operacoesCarro:dados.categoria.includes('B')?anterior.operacoesCarro||[]:[]},id).recursos.at(-1);
 const novo={...anterior,nome:validado.nome,identificacao:validado.identificacao,categorias:validado.categorias,ativo:dados.ativo,disponivel:dados.disponivel,observacoes:String(dados.observacoes||'').trim()};
 if(dados.alterarAlmoco){if(!INTERVALOS_ALMOCO.some(([v])=>v===dados.horarioAlmoco))throw new Error('Selecione um dos cinco intervalos de almoço.');novo.horarioAlmoco=dados.horarioAlmoco;delete novo.intervaloAlmoco;}
 else if(dados.horarioAlmoco!==anterior.horarioAlmoco)throw new Error('Confirme explicitamente a alteração do almoço.');
 if(alterouJornada){
  const original=anterior.disponibilidade|| (anterior.disponibilidadeSemanal?Object.fromEntries([0,1,2,3,4,5,6].map(d=>[d,anterior.disponibilidadeSemanal.filter(f=>f.dia===d)])):null);
  if(original&&Object.values(original).some(f=>f.length>1))throw new Error('Jornada com múltiplas faixas: configuração detalhada necessária; nenhum horário foi substituído.');
  novo.disponibilidade=original?Object.fromEntries(Object.entries(original).map(([dia,faixas])=>[dia,faixas.length?validado.disponibilidade[dia]||[]:[]])):validado.disponibilidade;delete novo.disponibilidadeSemanal;
 }
 const operacaoAlterada=alterouJornada||dados.alterarAlmoco||categoriaAnterior!==dados.categoria||novo.ativo!==anterior.ativo||novo.disponivel!==anterior.disponivel;
 if(operacaoAlterada){const conflito=estado.aulas.find(a=>a.instrutorId===id&&[1,3].includes(a.status)&&`${a.data}T${a.inicio}:00`>agoraBrasil(instante)&&(!recursoAtivo(novo)||!novo.categorias.includes(a.categoria)||!livreNaData(novo,a.data,a.inicio,a.fim)||validarHorario(a.data,a.inicio,undefined,novo,a.categoria)));
 if(conflito)throw new Error(`Alteração bloqueada: aula futura em ${conflito.data} às ${conflito.inicio} conflita com a nova configuração. Resolva pelo procedimento autorizado; nenhuma aula foi alterada.`);}
 novo.historicoAlteracoes=[...(anterior.historicoAlteracoes||[]),{em:instante.toISOString(),responsavel:identidade.id,tipo:'edicao-instrutor',antes:{nome:anterior.nome,horarioAlmoco:anterior.horarioAlmoco},depois:{nome:novo.nome,horarioAlmoco:novo.horarioAlmoco}}];
 return {...estado,recursos:estado.recursos.map(r=>r.id===id?novo:r)};
}
export function editarVeiculo(estado,identidade,id,dados,instante=new Date()){
 autorizar(identidade,'editar-veiculo');const anterior=recursoAdministrativo(estado,identidade,id);
 if(anterior.tipo!=='Veículos'||Object.keys(dados).some(k=>!['nome','identificacao','instrutorId','tipoCambio'].includes(k)))throw new Error('Campo protegido na edição do veículo.');
 const regularizar=Object.hasOwn(dados,'tipoCambio');
 if(regularizar){
  if(anterior.categoria!=='B'||!cambioValido(dados.tipoCambio)||!unidadeCarroPermitida(dados.tipoCambio,anterior.unidade))throw new Error('Informe Manual ou Automático em uma unidade compatível.');
  if(cambioValido(anterior.tipoCambio)&&anterior.tipoCambio!==dados.tipoCambio)throw new Error('Campo protegido: o câmbio já configurado não pode ser alterado nesta regularização.');
  if(estado.aulas.some(a=>a.veiculoId===id&&[1,3].includes(a.status)&&a.data+'T'+a.inicio+':00'>agoraBrasil(instante)&&(a.tipoCambio||estado.alunos.find(s=>s.id===a.alunoId)?.tipoCambio)&&(a.tipoCambio||estado.alunos.find(s=>s.id===a.alunoId)?.tipoCambio)!==dados.tipoCambio))throw new Error('Câmbio incompatível com reservas futuras. Nenhum registro foi alterado.');
 }
 const nome=String(dados.nome||'').trim(),identificacao=String(dados.identificacao||'').trim();
 if(nome.length<3||nome.length>120||!identificacao||identificacao.length>30)throw new Error('Informe nome/modelo e identificação válidos.');
 if(estado.recursos.some(r=>r.id!==id&&r.tipo==='Veículos'&&r.identificacao===identificacao))throw new Error('Identificação já cadastrada.');
 const novo={...anterior,nome,identificacao,...(regularizar?{tipoCambio:dados.tipoCambio}:{}),...(Object.hasOwn(anterior,'placa')?{placa:identificacao}:{}),historicoAlteracoes:[...(anterior.historicoAlteracoes||[]),{em:instante.toISOString(),responsavel:identidade.id,tipo:regularizar?'regularizacao-veiculo':'edicao-veiculo',...(regularizar?{antes:{tipoCambio:anterior.tipoCambio||null},depois:{tipoCambio:dados.tipoCambio}}:{})}]};
 const atualizado={...estado,recursos:estado.recursos.map(r=>r.id===id?novo:r)};
 return dados.instrutorId!=null?trocarInstrutorVeiculo(atualizado,identidade,id,dados.instrutorId,instante):atualizado;
}
export function instrutoresParaCarro(estado,identidade){autorizar(identidade,'consultar');return consultarRecursos(estado,identidade).filter(i=>i.tipo==='Instrutores'&&i.categorias?.includes('B')&&recursoAtivo(i)&&recursoCarroConsultavel(i,identidade.unidade)).map(i=>({id:i.id,nome:i.nome,unidade:i.unidade,veiculoIds:structuredClone(i.veiculoIds||[])}));}
export function instrutoresParaVeiculo(estado,identidade,categoria='B'){
 autorizar(identidade,'consultar');if(!['A','B','D'].includes(categoria))throw new Error('Categoria inválida.');
 let lista=categoria==='B'?instrutoresParaCarro(estado,identidade):consultarCadastrosRecursos(estado,identidade).filter(i=>i.tipo==='Instrutores'&&i.categorias?.includes(categoria)&&recursoAtivo(i));
 if(categoria==='D'&&lista.some(i=>!onibusTemporario(i)))lista=lista.filter(i=>!onibusTemporario(i));
 return lista.map(i=>{const completo=estado.recursos.find(r=>r.id===i.id),proprio=unidade(i.unidade)===unidade(identidade.unidade);return {id:i.id,nome:i.nome,unidade:i.unidade,veiculoIds:structuredClone(completo.veiculoIds||[]),...(proprio?{cpf:completo.cpf||completo.documento||completo.identificacao||''}:{})};});
}
function instrutorResponsavelAutorizado(estado,identidade,v,id){
 const i=estado.recursos.find(r=>r.id===id&&r.tipo==='Instrutores');
 if(!i||!instrutoresParaVeiculo(estado,identidade,v.categoria).some(r=>r.id===id)||!(unidade(i.unidade)===unidade(v.unidade)||v.categoria==='B'&&(i.operacoesCarro||[]).some(op=>op.origem===unidade(v.unidade))))throw new Error('Selecione um instrutor ativo, habilitado para a categoria e autorizado para esta operação.');
 if(v.categoria==='A'&&estado.recursos.filter(r=>r.tipo==='Veículos'&&r.categoria==='A'&&r.id!==v.id&&(r.instrutorId?r.instrutorId===i.id:i.veiculoIds?.includes(r.id))).length>=2)throw new Error('Cada instrutor de moto pode ter no máximo duas motos vinculadas.');
 return i;
}
export function trocarInstrutorVeiculo(estado,identidade,id,instrutorId,instante=new Date()){
 autorizar(identidade,'editar-veiculo');const v=recursoAdministrativo(estado,identidade,id);
 if(v.tipo!=='Veículos'||!['A','B','D'].includes(v.categoria))throw new Error('Categoria de veículo inválida.');
 const i=instrutorResponsavelAutorizado(estado,identidade,v,instrutorId),antigos=estado.recursos.filter(x=>x.tipo==='Instrutores'&&x.veiculoIds?.includes(id)),anterior=v.instrutorId||(antigos.length===1?antigos[0].id:null);
 if(anterior===i.id&&v.instrutorId===i.id)return estado;
 const afetadas=estado.aulas.filter(a=>a.veiculoId===id&&[1,3].includes(a.status)&&`${a.data}T${a.inicio}:00`>agoraBrasil(instante));
 const propostas=estado.aulas.map(a=>afetadas.includes(a)?{...a,instrutorId:i.id}:a),problemas=[];
 for(const a of afetadas){const aluno=estado.alunos.find(s=>s.id===a.alunoId),operacao={unidadeCarro:a.unidadeCarro||a.unidade,tipoCambio:a.tipoCambio||aluno?.tipoCambio};
  if(!recursoAtivo(v)||!livreNaData(v,a.data,a.inicio,a.fim)||!livreNaData(i,a.data,a.inicio,a.fim)||validarHorario(a.data,a.inicio,undefined,i,v.categoria)||a.categoria!==v.categoria||v.categoria==='B'&&(!recursoCarroCompativel(i,operacao,a.data)||!recursoCarroCompativel(v,operacao,a.data))||conflito(propostas,{...a,instrutorId:i.id}))problemas.push(`${a.data} às ${a.inicio}`);
 }
 if(problemas.length)throw new Error('Troca bloqueada. Conflitos nas aulas: '+problemas.join('; ')+'. Nenhum vínculo ou agendamento foi alterado.');
 const em=instante.toISOString(),evento={acao:'troca-instrutor',em,responsavel:identidade.id,instrutorAnterior:anterior,novoInstrutor:i.id,veiculoId:id,agendamentosAfetados:afetadas.map(a=>a.id)};
 return {...estado,recursos:estado.recursos.map(r=>r.id===id?{...r,instrutorId:i.id,historicoAlteracoes:[...(r.historicoAlteracoes||[]),evento]}:r.tipo==='Instrutores'&&r.id===i.id?{...r,veiculoIds:[...new Set([...(r.veiculoIds||[]),id])]}:r.tipo==='Instrutores'&&r.veiculoIds?.includes(id)?{...r,veiculoIds:r.veiculoIds.filter(v=>v!==id)}:r),aulas:estado.aulas.map(a=>afetadas.includes(a)?{...a,instrutorId:i.id,instrutorNome:i.nome,historico:[...(a.historico||[]),{...evento,instrutorAnterior:a.instrutorId}]}:a)};
}
export function cadastrarAluno(estado, identidade, dados, id, instante = new Date(),validarCpf=cpfValido) {
    autorizar(identidade, 'cadastrar');
    const erros=validarCadastroAluno(dados,identidade,estado.alunos,instante,validarCpf);
    if(Object.keys(erros).length){const erro=new Error(Object.values(erros)[0]);erro.campos=erros;throw erro;}
    const nome=String(dados.nome).trim(),cpf=String(dados.cpf).replace(/\D/g,''),telefone=String(dados.telefone).replace(/\D/g,''),email=String(dados.email).trim();
    const unidadeCarro=dados.categoria.includes('B')?unidade(dados.unidadeCarro):'';
    if (!id || estado.alunos.some(a => a.id === id)) throw new Error('Identificador interno inválido.');
    autorizar(identidade, 'anotar');
    const em = instante.toISOString();
    const aluno = { id, nome, cpf, telefone, email, nascimento:dados.nascimento, categoria:dados.categoria, unidade:unidade(identidade.unidade),
        unidadePrincipal:unidade(identidade.unidade), unidadeCarro,...(dados.categoria.includes('B')?{tipoCambio:dados.tipoCambio}:{}), situacao:'Pendente', criadoEm:em, aulas:0, creditos:Object.fromEntries([['B','quantidadeCarro'],['A','quantidadeMoto'],['D','quantidadeOnibus']].filter(([cat])=>dados.categoria.includes(cat)).map(([cat,chave])=>[cat,{contratadas:Number(dados[chave]),liberadas:Number(dados[chave]),disponiveis:Number(dados[chave])}])), financeiro:'Pendente', acesso:'Pendente de integração',
        aulasAdquiridas:Object.fromEntries([['B','quantidadeCarro'],['A','quantidadeMoto'],['D','quantidadeOnibus']].filter(([cat])=>dados.categoria.includes(cat)).map(([cat,chave])=>[cat,Number(dados[chave])])),
        observacoes:String(dados.observacoes || '').trim(), etapas:{}, exames:Object.fromEntries(Object.keys(TIPOS_EXAME).map(t => [t, {status:'Pendente', data:'', observacoes:'', atualizadoEm:''}])),
        historico:[{tipo:'cadastro', em, responsavel:identidade.id, depois:'Cadastro local criado com aulas adquiridas disponiveis automaticamente.',dados:[{campo:'Categoria inicial',depois:dados.categoria},...(dados.categoria.includes('B')?[{campo:'Tipo de carro inicial',depois:dados.tipoCambio}]:[]),{campo:'Unidade principal inicial',depois:unidade(identidade.unidade)},{campo:'Unidade inicial das aulas de carro',depois:unidadeCarro||'Não se aplica'},...([['A','quantidadeMoto'],['B','quantidadeCarro'],['D','quantidadeOnibus']].filter(([cat])=>dados.categoria.includes(cat)).map(([cat,chave])=>({campo:`Aulas adquiridas — Categoria ${cat}`,depois:Number(dados[chave])})))]}] };
    return { ...estado, alunos:[...estado.alunos, aluno] };
}
export function registrarEtapa(estado, identidade, id, tipo, dados, instante = new Date()) {
    autorizar(identidade, 'verificar'); const a = alunoAutorizado(estado, identidade, id);
    if (!ETAPAS[tipo] || !SITUACOES.includes(dados.status)) throw new Error('Etapa ou situação inválida.');
    if (a.etapas?.[tipo]?.origem === 'oficial') throw new Error('Resultados oficiais só podem ser atualizados pela fonte autorizada.');
    if (!String(dados.fonte || '').trim() || !dataValida(dados.data) || dados.data > agoraBrasil(instante).slice(0,10)) throw new Error('Informe a fonte e uma data de verificação válida.');
    if (dados.validade && (!dataValida(dados.validade) || dados.validade < dados.data)) throw new Error('Validade inválida.');
    const item = {status:dados.status, fonte:String(dados.fonte).trim().slice(0,240), data:dados.data, validade:dados.validade || '', origem:'manual-local', responsavel:identidade.id, em:instante.toISOString()};
    const etapas={...a.etapas,[tipo]:item};
    return substituir(estado, {...a, etapas, situacao:Object.keys(ETAPAS).every(t=>etapas[t]?.status==='Aprovado')?'Verificado':'Pendente', historico:[...a.historico, {tipo:'verificacao', em:item.em, responsavel:identidade.id, depois:`${ETAPAS[tipo]}: ${dados.status}; fonte: ${item.fonte} (manual local)`}]});
}
export const substituir = (estado, aluno) => ({...estado, alunos:estado.alunos.map(a => a.id === aluno.id ? aluno : a)});
const recursosPolitica = estado => estado.recursos.map(r=>({...r,tipo:r.tipo==='Instrutores'?'instrutor':r.tipo==='Veículos'?'veiculo':r.tipo,unidade:unidade(r.unidade)}));
export function destinoNovasAulas(a, categoria) {
    if (!['A','B','D'].includes(categoria) || !a.categoria.includes(categoria)) throw new Error('Categoria não autorizada para este aluno.');
    return categoria==='D'?'Cobilândia':categoria === 'A' ? 'Vila Velha' : carro(a);
}
export function saldoCategoria(a, categoria) {
    const saldo = a.creditos?.[categoria]?.disponiveis;
    // Saldo legado sem categoria só é atribuível quando não há ambiguidade.
    return a.creditos?.[categoria] ? (Number.isInteger(saldo) && saldo >= 0 ? saldo : null) : a.categoria === categoria && Number.isInteger(a.aulas) && a.aulas>=0 ? a.aulas : null;
}
export function resumoCreditos(estado, a, categoria) {
    const aulas = estado.aulas.filter(x => x.alunoId === a.id && x.categoria === categoria);
    return { contratadas:a.creditos?.[categoria]?.contratadas ?? a.aulasAdquiridas?.[categoria] ?? null, disponiveis:saldoCategoria(a,categoria), realizadas:aulas.filter(x=>x.status===5).length,
        agendadas:aulas.filter(x=>[1,3].includes(x.status)).length, faltas:aulas.filter(x=>x.status===6).length, canceladas:aulas.filter(x=>x.status===2).length };
}
// Projeção de leitura: não altera saldos, unidade ou histórico. Cada ID representa
// uma aula; em snapshots legados duplicados, prevalece a atualização mais recente.
export function resumoAulasAluno(estado, aluno) {
    const unicas=new Map();
    for(const aula of estado.aulas.filter(a=>a.alunoId===aluno.id&&a.id)){
        const anterior=unicas.get(aula.id),instante=a=>Date.parse(a.validadaEm||a.atualizadoEm||'')||0;
        if(!anterior||instante(aula)>=instante(anterior))unicas.set(aula.id,aula);
    }
    return Object.fromEntries(['A','B','D'].filter(c=>aluno.categoria.includes(c)).map(c=>{
        const aulas=[...unicas.values()].filter(a=>a.categoria===c),quantidade=aluno.aulasAdquiridas?.[c];
        return [c,{adquiridas:Number.isInteger(quantidade)&&quantidade>=0?quantidade:null,realizadas:aulas.filter(a=>a.status===5).length,faltas:aulas.filter(a=>a.status===6).length}];
    }));
}
export function preverTransferencia(estado, identidade, id, destino, instante = new Date()) {
    autorizar(identidade, 'transferir'); const aluno = alunoAutorizado(estado, identidade, id), de = carro(aluno), para = unidade(destino);
    if(aluno.categoria.includes('B')&&!unidadeCarroPermitida(aluno.tipoCambio,para))throw new Error(motivoCarro(aluno)||'Unidade incompatível com o tipo de carro.');
    if (!aluno.categoria.includes('B') || !UNIDADES.some(([u])=>u===para) || de === para) throw new Error('Escolha uma nova unidade válida para aulas de carro.');
    const aulas = estado.aulas.filter(a => a.alunoId === id && a.categoria === 'B' && unidade(a.unidade) === de && [1,3].includes(a.status) && `${a.data}T${a.inicio}:00` > agoraBrasil(instante));
    return {de, para, aulas:aulas.map(a => ({...structuredClone(a), cancelavel:calcularPrazoCancelamento({...a,unidade:unidade(a.unidade),inicio:`${a.data}T${a.inicio}:00-03:00`}, recursosPolitica(estado), instante).dentroPrazo}))};
}
export function transferirAluno(estado, identidade, id, destino, motivo, cancelar = [], instante = new Date()) {
    const previa = preverTransferencia(estado,identidade,id,destino,instante), a = alunoAutorizado(estado,identidade,id);
    if (String(motivo || '').trim().length < 5) throw new Error('Informe o motivo da solicitação do aluno (mínimo de 5 caracteres).');
    if (!Array.isArray(cancelar) || new Set(cancelar).size !== cancelar.length || cancelar.some(id => !previa.aulas.some(x=>x.id===id&&x.cancelavel))) throw new Error('Cancelamento impedido: reserva sem 48 horas úteis ou fora desta transferência.');
    const em = instante.toISOString(), aulas = estado.aulas.map(x => {
        if (!cancelar.includes(x.id)) return x;
        return {...x,status:2,cancelamento:{...criarCancelamento({...x,unidade:unidade(x.unidade),inicio:`${x.data}T${x.inicio}:00-03:00`},recursosPolitica(estado),'outro',false,instante), responsavel:identidade.id, observacoes:String(motivo).trim()}};
    });
    // Transferir sem selecionar cancelamentos nunca altera saldos. Cancelar uma
    // reserva explicitamente elegível aplica a devolução da política existente,
    // apenas quando o saldo B já está discriminado (não inventar saldos AB).
    const saldo=saldoCategoria(a,'B');
    const atualizado=cancelar.length&&saldo!==null?(a.creditos?.B?{...a,creditos:{...a.creditos,B:{...a.creditos.B,disponiveis:saldo+cancelar.length}}}:{...a,aulas:saldo+cancelar.length}):a;
    const historico = {tipo:'transferencia',antes:previa.de,depois:previa.para,em,responsavel:identidade.id,motivo:String(motivo).trim(),mantidas:previa.aulas.filter(x=>!cancelar.includes(x.id)).map(x=>x.id),canceladas:[...cancelar]};
    return substituir({...estado,aulas},{...atualizado,unidadeCarro:previa.para,historico:[...a.historico,historico]});
}
function livreNaData(r, data, inicio, fim) {
    if ((r.datasBloqueadas || []).includes(data) || (r.feriadosUnidade || []).includes(data)) return false;
    const dia = new Date(`${data}T12:00:00Z`).getUTCDay();
    if (r.disponibilidade && !(r.disponibilidade[dia] || []).some(f => typeof f === 'string' ? f === inicio : f.inicio <= inicio && f.fim >= fim)) return false;
    if (r.disponibilidadeSemanal && !r.disponibilidadeSemanal.some(f=>f.dia===dia&&f.inicio<=inicio&&fim<=f.fim)) return false;
    return ![...(r.bloqueios || []),...(r.bloqueiosUnidade||[])].some(b=> b.data===data && (!b.inicio||b.inicio<fim && inicio<b.fim));
}
export function motivoRecursoIndisponivel(estado,identidade,data,inicio,filtros={},instante=new Date()){
    autorizar(identidade,'consultar');
    const horario=motivoNovoAgendamento(data,inicio,agoraBrasil(instante),filtros.categoria);if(horario)return horario;
    const recursos=consultarRecursos(estado,identidade),v=recursos.find(r=>r.id===filtros.veiculoId&&r.tipo==='Veículos');
    if(!v)return 'Veículo não cadastrado ou sem autorização operacional';
    if(!recursoAtivo(v))return 'Veículo indisponível';
    if(!livreNaData(v,data,inicio,fimDaAula(inicio)))return 'Veículo fora da jornada ou bloqueado nesta data';
    if(v.categoria==='B'&&!cambioValido(v.tipoCambio))return 'Defina o câmbio do veículo em Editar veículo';
    if(v.categoria==='B'&&!recursoCarroCompativel(v,{unidadeCarro:identidade.unidade,tipoCambio:v.tipoCambio},data))return 'Veículo fora da operação autorizada desta unidade nesta data';
    if(v.categoria==='D'){const motivo=motivoCatalogoOnibus(estado.recursos);if(motivo)return motivo;}
    const instrutores=recursos.filter(r=>r.tipo==='Instrutores'&&(v.categoria!=='B'||(r.id===resolverInstrutorCarro(estado.recursos,v)))&&r.categorias?.includes(v.categoria)&&(!filtros.instrutorId||r.id===filtros.instrutorId)&&(v.categoria==='A'?recursoMotoCentral(r)&&r.veiculoIds?.includes(v.id):!r.veiculoIds?.length||r.veiculoIds.includes(v.id)));
    if(!instrutores.length)return 'Sem instrutor cadastrado e vinculado ao veículo';
    const ativos=instrutores.filter(recursoAtivo);if(!ativos.length)return 'Instrutor indisponível';
    const jornada=ativos.filter(i=>livreNaData(i,data,inicio,fimDaAula(inicio)));if(!jornada.length)return 'Instrutor fora da jornada ou bloqueado';
    const semIntervalo=jornada.filter(i=>!motivoAlmoco(i,inicio));if(!semIntervalo.length)return 'Intervalo do instrutor';
    const aulas=[...estado.aulas,...(estado.ocupacoes||[])];
    if(aulas.some(a=>a.veiculoId===v.id&&a.data===data&&ocupaRecurso(a)&&a.inicio<fimDaAula(inicio)&&inicio<a.fim))return 'Horário ocupado neste veículo';
    if(semIntervalo.every(i=>conflito(aulas,{data,inicio,fim:fimDaAula(inicio),instrutorId:i.id,veiculoId:v.id})))return 'Instrutor ocupado em outra aula';
    return 'Restrição operacional: confira o vínculo e a configuração dos recursos';
}
export function paresNaUnidade(estado, identidade, data, inicio, filtros = {}, instante = new Date()) {
    autorizar(identidade,'consultar'); if (motivoNovoAgendamento(data,inicio,agoraBrasil(instante),filtros.categoria||'D')) return [];
    const alunoCarro=filtros.alunoId&&filtros.categoria==='B'?alunoAutorizado(estado,identidade,filtros.alunoId):{unidadeCarro:unidade(identidade.unidade),tipoCambio:filtros.tipoCambio};
    const recursos = consultarRecursos(estado,identidade).filter(r=>recursoAtivo(r)&&livreNaData(r,data,inicio,fimDaAula(inicio))&&(!(r.tipo==='Instrutores')||!motivoAlmoco(r,inicio)));
    return recursos.filter(r=>r.tipo==='Instrutores'&&(!filtros.instrutorId||r.id===filtros.instrutorId)).flatMap(i=>recursos.filter(v=>v.tipo==='Veículos'&&i.categorias?.includes(v.categoria)&&(v.categoria==='B'?(i.id===resolverInstrutorCarro(estado.recursos,v)):v.instrutorId?i.id===v.instrutorId:!i.veiculoIds?.length||i.veiculoIds.includes(v.id))&&(!filtros.categoria||v.categoria===filtros.categoria)&&(!filtros.veiculoId||v.id===filtros.veiculoId)
        && (v.categoria==='D'||v.categoria==='B'?(v.categoria==='D'||(filtros.consultaOperacional===true&&!filtros.alunoId&&!cambioValido(v.tipoCambio)?recursoNaOperacaoCarro(i,operacaoCarro(alunoCarro,data))&&recursoNaOperacaoCarro(v,operacaoCarro(alunoCarro,data)):filtros.alunoId||filtros.tipoCambio?recursoCarroCompativel(i,alunoCarro,data)&&recursoCarroCompativel(v,alunoCarro,data):['manual','automatico'].some(tipoCambio=>recursoCarroCompativel(i,{...alunoCarro,tipoCambio},data)&&recursoCarroCompativel(v,{...alunoCarro,tipoCambio},data)))):recursoMotoCentral(i)&&recursoMotoCentral(v)&&i.veiculoIds?.includes(v.id)) && !validarHorario(data,inicio,undefined,i,v.categoria) && (v.categoria!=='D'||recursosOperacionaisD(estado.recursos).some(r=>r.id===i.id)&&recursosOperacionaisD(estado.recursos).some(r=>r.id===v.id)&&localCategoriaD(data)&&!motivoCatalogoOnibus(estado.recursos)&&![...estado.aulas,...(estado.ocupacoes||[])].some(a=>a.categoria==='D'&&a.data===data&&ocupaRecurso(a)&&a.inicio<fimDaAula(inicio)&&inicio<a.fim)) && !conflito([...estado.aulas,...(estado.ocupacoes||[])],{data,inicio,fim:fimDaAula(inicio),instrutorId:i.id,veiculoId:v.id})).map(v=>({instrutorId:i.id,veiculoId:v.id,categoria:v.categoria})));
}
export function agendarAula(estado, identidade, dados, id, instante = new Date()) {
    autorizar(identidade,'agendar'); const a = alunoAutorizado(estado,identidade,dados.alunoId,false);
    const destino=destinoNovasAulas(a,dados.categoria);
    if (!['A','D'].includes(dados.categoria)&&destino!==unidade(identidade.unidade)) throw new Error('Novas aulas devem utilizar a unidade autorizada para esta categoria.');
    if (motivoBloqueioCreditos(a)) throw new Error(motivoBloqueioCreditos(a));
    let saldo=saldoCategoria(a,dados.categoria);
    if(Number.isFinite(a.aulasAdquiridas?.[dados.categoria])||Number.isFinite(a.creditos?.[dados.categoria]?.contratadas))saldo=resumirCreditosRecepcao(a,estado.aulas.filter(x=>x.alunoId===a.id).map(x=>({...x,inicio:x.data+'T'+x.inicio+':00-03:00'}))).categorias[dados.categoria]?.disponiveis??0;
    if (!(saldo>0)) throw new Error('Crédito da categoria indisponível ou não informado. Nenhum saldo será criado.');
    if (!paresNaUnidade(estado,identidade,dados.data,dados.inicio,{categoria:dados.categoria,alunoId:a.id},instante).some(p=>p.instrutorId===dados.instrutorId&&p.veiculoId===dados.veiculoId)) throw new Error('Instrutor/veículo indisponíveis ou em conflito.');
    const fim=fimDaAula(dados.inicio);
    if(estado.aulas.some(x=>x.alunoId===a.id&&x.data===dados.data&&ocupaRecurso(x)&&x.inicio<fim&&dados.inicio<x.fim))throw new Error('O aluno já possui uma aula neste horário.');
    if(!id||estado.aulas.some(x=>x.id===id))throw new Error('Identificador de reserva inválido.');
    const aluno = (a.creditos?.[dados.categoria]||Number.isFinite(a.aulasAdquiridas?.[dados.categoria])) ? {...a,creditos:{...a.creditos,[dados.categoria]:{...a.creditos?.[dados.categoria],contratadas:a.aulasAdquiridas?.[dados.categoria]??a.creditos?.[dados.categoria]?.contratadas,disponiveis:saldo-1}}} : {...a,aulas:saldo-1};
    return substituir({...estado,aulas:[...estado.aulas,{id,alunoId:a.id,categoria:dados.categoria,data:dados.data,inicio:dados.inicio,fim,instrutorId:dados.instrutorId,veiculoId:dados.veiculoId,unidade:['A','D'].includes(dados.categoria)?destinoNovasAulas(a,dados.categoria):unidade(identidade.unidade),...(dados.categoria==='D'?{localReal:localCategoriaD(dados.data)}:dados.categoria==='B'?{tipoCambio:a.tipoCambio,unidadeCarro:carro(a),localReal:localCarro(a,dados.data)}:{}),status:1,criadoEm:instante.toISOString(),responsavel:identidade.id}]},aluno);
}
export function aulaOperavel(estado,identidade,id){
 autorizar(identidade,'consultar');const a=estado.aulas.find(a=>a.id===id),aluno=a&&estado.alunos.find(s=>s.id===a.alunoId);
 if(!a||!aluno||!vinculo(aluno,identidade)||(a.categoria==='B'&&unidade(a.unidade)!==unidade(identidade.unidade)))throw new Error('Aula fora do escopo de operação desta recepção.');
 return a;
}
export function detalhesAgendamento(estado,identidade,id,instante=new Date()){
 autorizar(identidade,'consultar');const a=estado.aulas.find(a=>a.id===id),v=a&&estado.recursos.find(r=>r.id===a.veiculoId);
 if(!a||!(['A','D'].includes(a.categoria)||consultarAgenda(estado,identidade).some(x=>x.id===id)||v&&consultarRecursos(estado,identidade).some(r=>r.id===v.id)&&recursoCarroCompativel(v,{unidadeCarro:identidade.unidade,tipoCambio:v.tipoCambio},a.data)))throw new Error('Agenda não autorizada.');
 let propria=false;try{aulaOperavel(estado,identidade,id);propria=true;}catch{}
 const inicio=a.data+'T'+a.inicio+':00-03:00',valida=dataValida(a.data)&&Number.isFinite(Date.parse(inicio)),futura=Date.parse(inicio)>instante.getTime();
 return {aula:{id:a.id,categoria:a.categoria,data:a.data,inicio:a.inicio,fim:a.fim,status:a.status,instrutorId:a.instrutorId,veiculoId:a.veiculoId,unidade:a.unidade,tipoCambio:a.tipoCambio,unidadeCarro:a.unidadeCarro,localReal:structuredClone(a.localReal),alunoNome:estado.alunos.find(s=>s.id===a.alunoId)?.nome||'Aluno não informado',instrutorNome:estado.recursos.find(r=>r.id===a.instrutorId)?.nome||'Não informado',veiculoNome:v?.nome||'Não informado',...(propria?{cancelamento:structuredClone(a.cancelamento),historico:structuredClone(a.historico||[])}:{})},
 podeSolicitarMedico:propria&&principal(estado.alunos.find(s=>s.id===a.alunoId))===unidade(identidade.unidade)&&identidade.permissoes.includes('verificar')&&((a.status===1&&futura&&identidade.permissoes.includes('cancelar-aula')&&!calcularPrazoCancelamento({...a,inicio},recursosPolitica(estado),instante).dentroPrazo)||(a.status===2&&a.cancelamento?.origem==='recepcao'&&a.cancelamento.credito==='retido'&&!a.solicitacaoMedica&&instante.getTime()-Date.parse(a.cancelamento.em)<=POLITICA_CANCELAMENTO.horasAtestado*3600000)),
 podeCancelar:valida&&propria&&identidade.permissoes.includes('cancelar-aula')&&[1,3].includes(a.status)&&futura,
 podeRegistrar:valida&&propria&&identidade.permissoes.includes('registrar-frequencia')&&a.status===1&&!futura,
 prazo:propria&&[1,3].includes(a.status)?calcularPrazoCancelamento({...a,inicio},recursosPolitica(estado),instante):null};
}
export function cancelarAulaRecepcao(estado,identidade,id,dados,instante=new Date()){
 autorizar(identidade,'cancelar-aula');const a=aulaOperavel(estado,identidade,id),inicio=a.data+'T'+a.inicio+':00-03:00';
 if(![1,3].includes(a.status)||!dataValida(a.data)||!Number.isFinite(Date.parse(inicio))||Date.parse(inicio)<=instante.getTime())throw new Error('Somente reservas futuras ativas podem ser canceladas; registros encerrados não podem ser substituídos.');
 if(typeof dados.observacoes!=='string'||dados.observacoes.length>2000)throw new Error('Informe uma observação administrativa válida.');
 const cancelamento={...criarCancelamento({...a,inicio},recursosPolitica(estado),dados.motivo,dados.aceitarConsequencias,instante),responsavel:identidade.id,origem:'recepcao',observacoes:dados.observacoes};
 const aluno=estado.alunos.find(s=>s.id===a.alunoId),k=a.categoria,resumo=resumirCreditosRecepcao(aluno,estado.aulas.filter(x=>x.alunoId===aluno.id).map(x=>({...x,inicio:x.data+'T'+x.inicio+':00-03:00'}))).categorias[k];
 let atualizado=aluno;
 if(cancelamento.credito==='devolvido'){
  const teto=aluno.aulasAdquiridas?.[k]??aluno.creditos?.[k]?.contratadas,legado=!aluno.creditos?.[k]&&teto==null;
  const base=Number.isSafeInteger(teto)&&teto>=0||Number.isSafeInteger(aluno.creditos?.[k]?.disponiveis)&&aluno.creditos[k].disponiveis>=0||legado&&aluno.categoria===k&&Number.isSafeInteger(aluno.aulas)&&aluno.aulas>=0;
  const saldo=legado?saldoCategoria(aluno,k):resumo?.saldoLiberado;
  if(!base||!Number.isSafeInteger(saldo)||saldo<0||Number.isSafeInteger(teto)&&saldo+1>teto)throw new Error('Saldo inconsistente ou não documentado; regularize antes de devolver o crédito. Nenhum crédito foi criado.');
  atualizado=aluno.creditos?.[k]||Number.isFinite(aluno.aulasAdquiridas?.[k])?{...aluno,creditos:{...aluno.creditos,[k]:{...aluno.creditos?.[k],disponiveis:saldo+1}}}:{...aluno,aulas:saldo+1};
 }
 const nomeMotivo=identificarMotivo(dados.motivo).nome;
 const evento={status:2,acao:'cancelamento-administrativo',origem:'recepcao',em:cancelamento.em,autor:identidade.id,motivo:nomeMotivo,observacoes:dados.observacoes,credito:cancelamento.credito};
 return {...estado,alunos:estado.alunos.map(s=>s.id===aluno.id?atualizado:s),aulas:estado.aulas.map(x=>x.id===id?{...x,status:2,cancelamento,motivoCancelamento:nomeMotivo,historico:[...(x.historico||[]),evento]}:x)};
}
export function registrarFrequenciaRecepcao(estado,identidade,id,status,motivo,instante=new Date()){
 autorizar(identidade,'registrar-frequencia');const a=aulaOperavel(estado,identidade,id);
 if(![5,6].includes(status)||a.status!==1)throw new Error('Resultado já registrado ou situação incompatível. Correções são reservadas à gerência.');
 if(!dataValida(a.data)||!Number.isFinite(Date.parse(a.data+'T'+a.inicio+':00-03:00'))||Date.parse(a.data+'T'+a.inicio+':00-03:00')>instante.getTime())throw new Error('Não é permitido registrar presença ou falta em aula futura.');
 if(typeof motivo!=='string'||motivo.trim().length<5||motivo.length>2000)throw new Error('Informe o motivo da intervenção administrativa (5 a 2000 caracteres).');
 const em=instante.toISOString(),evento={status,em,autor:identidade.id,origem:'recepcao',acao:status===5?'presenca-administrativa':'falta-administrativa',motivo:motivo.trim()};
 return {...estado,aulas:estado.aulas.map(x=>x.id===id?{...x,status,validadaEm:em,historico:[...(x.historico||[]),evento]}:x)};
}
