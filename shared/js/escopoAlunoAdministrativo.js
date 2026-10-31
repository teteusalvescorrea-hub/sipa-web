import {normalizarChaveUnidade,obterUnidadeInstitucional} from './catalogoUnidades.js';
import {escopoPermitido} from './permissoesAdministrativas.js';
// A aula/evento só identifica o aluno. A unidade responsável vem do cadastro
// atual, nunca da localização operacional ou da unidade declarada na solicitação.
export function vinculoAdministrativoAluno(e,registro){
 const id=registro?.alunoId||registro?.dados?.alunoId,s=registro?.solicitacaoMedica;
 const aluno=id&&e.alunos.find(a=>a.id===id);
 const inconsistente=!aluno||!!s?.alunoId&&s.alunoId!==id||!!registro?.dados?.alunoId&&registro.dados.alunoId!==id;
 const valor=aluno?.unidadePrincipal||aluno?.unidade,unidadeBase=!inconsistente?normalizarChaveUnidade(valor==='Centro'?'Vila Velha':valor):null;
 return {aluno:aluno||null,unidadeBase:unidadeBase&&obterUnidadeInstitucional(unidadeBase)?unidadeBase:null,inconsistencia:inconsistente||!obterUnidadeInstitucional(unidadeBase)};
}
export function podeConsultarAdministrativoAluno(e,op,registro){
 const v=vinculoAdministrativoAluno(e,registro);
 return op?.nivel===3&&!op.unidadeConsulta||!!v.unidadeBase&&escopoPermitido(op,v.unidadeBase);
}
export function exigirAdministrativoAluno(e,op,registro,{leitura=false}={}){
 const v=vinculoAdministrativoAluno(e,registro);
 if(!podeConsultarAdministrativoAluno(e,op,registro)||!leitura&&!v.unidadeBase)throw new Error('Solicitação ou pendência fora da unidade-base autorizada, ou vínculo cadastral inconsistente.');
 return v;
}
// Projeção de leitura: preserva a operação da aula, sem entregar documentos,
// pareceres ou histórico médico a quem só possui acesso à agenda compartilhada.
const eventoMedico=h=>h.solicitacaoId||/atestado|m[eé]dic/i.test([h.tipo,h.acao,h.motivo,h.titulo,h.depois,h.texto].join(' '));
export function aulaSemAdministracaoAlheia(e,op,aula,origem=aula){
 if(podeConsultarAdministrativoAluno(e,op,origem))return structuredClone(aula);
 const a=structuredClone(aula);delete a.solicitacaoMedica;
 a.historico=(a.historico||[]).filter(h=>!eventoMedico(h));
 if(origem.solicitacaoMedica){delete a.motivoCancelamento;if(a.cancelamento){delete a.cancelamento.justificativa;delete a.cancelamento.frequencia;delete a.cancelamento.credito;delete a.cancelamento.motivoId;delete a.cancelamento.motivo;}}
 return a;
}
export function cadastroSemHistoriaMedicaAlheia(e,op,aluno){
 const a=structuredClone(aluno);if(!podeConsultarAdministrativoAluno(e,op,{alunoId:aluno.id})){a.historico=(a.historico||[]).filter(h=>!eventoMedico(h));a.avisosInternos=(a.avisosInternos||[]).filter(h=>!eventoMedico(h));}return a;
}
