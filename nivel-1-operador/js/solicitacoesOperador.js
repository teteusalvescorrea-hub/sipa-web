import {autorizar} from './dominioOperador.js';
import {exigirAdministrativoAluno} from '../../shared/js/escopoAlunoAdministrativo.js';
import {encaminharMedico} from '../../shared/js/solicitacoesMedicas.js';
export function obterSolicitacaoMedica(e,op,id){
 autorizar(op,'consultar');const aula=e.aulas.find(a=>a.solicitacaoMedica?.id===id);
 if(!aula)throw new Error('Solicitação médica não autorizada para esta unidade.');
 const {aluno,unidadeBase,inconsistencia}=exigirAdministrativoAluno(e,op,aula,{leitura:true});
 return {solicitacao:structuredClone(aula.solicitacaoMedica),aluno:structuredClone(aluno),unidadeBase,inconsistencia,aula:{...structuredClone(aula),instrutorNome:e.recursos.find(r=>r.id===aula.instrutorId)?.nome||'Não informado',veiculoNome:e.recursos.find(r=>r.id===aula.veiculoId)?.nome||'Não informado'}};
}
export function consultarSolicitacoesMedicas(e,op){
 autorizar(op,'consultar');return e.aulas.filter(a=>a.solicitacaoMedica).flatMap(a=>{try{return [obterSolicitacaoMedica(e,op,a.solicitacaoMedica.id)];}catch{return [];}});
}
export function encaminharSolicitacaoMedica(e,op,id,parecer,agora=new Date()){
 const {aula}=obterSolicitacaoMedica(e,op,id);autorizar(op,'verificar');
 exigirAdministrativoAluno(e,op,aula);
 const atualizada=encaminharMedico(aula,op,parecer,agora);
 // Este comando só substitui a solicitação na aula autorizada. Não toca em
 // créditos, documentos, situação da aula nem registros de outros alunos.
 return {...e,aulas:e.aulas.map(a=>a.id===aula.id?{...a,solicitacaoMedica:atualizada.solicitacaoMedica}:a)};
}
