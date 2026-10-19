import {obterAlunoLogado} from '../../alunos/services/alunos.service.js';
import {listarAgendamentos,obterAgendamento} from '../../agendamentos/services/agendamentos.service.js';
import {listarContratacoes} from '../../contratacoes/services/contratacoes.service.js';
const numero=v=>v?.valor??v;
const categoria=c=>typeof c==='string'?c:/^[AB]$/.test(c?.descricao)?c.descricao:({1:'A',2:'B'})[numero(c)];
const dataBrasil=v=>v&&!/(Z|[+-]\d\d:\d\d)$/.test(v)?v+'-03:00':v;
export function adaptarDadosAluno(aluno,contratacoes,aulas){
 const registros=[],vistas=aulas.map(a=>({id:a.id,tipo:'aula',nome:'Aula prática',aluno:aluno.id,categoria:categoria(a.categoria),unidade:a.unidade||'',enderecoReserva:a.localAula||'',localAula:a.localAula||'',localAulaId:a.localAulaId,instrutor:a.motoristaId,veiculo:a.veiculoId,inicio:dataBrasil(a.dataHoraInicio),fim:null,status:numero(a.status),historico:[],api:a}));
 for(const a of aulas){if(a.motoristaId&&!registros.some(r=>r.id===a.motoristaId))registros.push({id:a.motoristaId,tipo:'instrutor',nome:a.motoristaNome||'Não informado'});if(a.veiculoId&&!registros.some(r=>r.id===a.veiculoId))registros.push({id:a.veiculoId,tipo:'veiculo',nome:[a.veiculoModelo,a.veiculoPlaca].filter(Boolean).join(' · ')||'Não informado'});}
 const categorias={};
 for(const c of ['A','B']){
  const relevantes=contratacoes.filter(p=>[2,4].includes(numero(p.status))&&(p.categorias||[]).some(k=>categoria(k)===c)),ambiguo=relevantes.some(p=>p.categorias.length!==1);
  const soma=campo=>relevantes.reduce((n,p)=>n+p[campo],0);
  const completos=!ambiguo&&relevantes.every(p=>['quantidadeAulas','aulasRestantes','aulasRealizadas','aulasAgendadas'].every(k=>Number.isFinite(p[k])));
  categorias[c]={total:completos?soma('quantidadeAulas'):null,disponiveis:completos?soma('aulasRestantes'):null,reservadas:completos?soma('aulasAgendadas'):null,realizadas:completos?soma('aulasRealizadas'):null,percentual:null};
  if(categorias[c].total>0&&categorias[c].realizadas>0)categorias[c].percentual=Math.min(100,100*categorias[c].realizadas/categorias[c].total);
 }
 const cadastro={id:aluno.id,tipo:'aluno',nome:aluno.nome,documento:aluno.cpf,email:aluno.email,telefone:aluno.telefone,unidade:'Não informada',categoriasFormacao:aluno.categoriasFormacao};registros.push(cadastro,...vistas);
 return {integrado:true,aluno:cadastro,aulas:vistas,registros,credito:null,resumo:{categorias,total:aluno.aulasContratadas??null,realizadas:aluno.aulasRealizadas??null,percentual:aluno.aulasContratadas>0?aluno.percentualProgresso:null},contratacoes};
}
export function criarServicoAluno(){
 let dados;
 const capacidades=Object.freeze({cancelamento:false,reservas:false,senha:false,antecipacao:false,automatico:false});
 const pendente=async()=>{throw new Error('Esta operação ainda não está disponível. Entre em contato com a recepção.');};
 const carregar=async()=>{const aluno=await obterAlunoLogado();const [contratacoes,aulas]=await Promise.all([listarContratacoes(),listarAgendamentos()]);dados=adaptarDadosAluno(aluno,contratacoes,aulas);return dados;};
 return {capacidades,carregar,dadosAlunoLocal:async()=>dados||carregar(),
 consultarHistorico:async id=>(await obterAgendamento(id)).historico,consultarRecursosLocal:async()=>({horarios:[],contagem:{instrutores:0,veiculos:0},mensagem:'Consulta de horários por unidade ainda indisponível. Entre em contato com a recepção.'}),
 disponibilidadeLocal:async()=>[],consultarPoliticaCancelamento:pendente,cancelarReservaLocal:pendente,reservarAulasLocais:pendente,
 buscarAgendamentoAutomatico:pendente,salvarPreferenciasAutomaticas:pendente,salvarAvisosAntecipacao:pendente,alterarSenhaLocal:pendente};
}
