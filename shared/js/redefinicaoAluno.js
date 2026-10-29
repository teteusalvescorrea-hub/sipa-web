import {exigirCapacidade} from './permissoesAdministrativas.js';
import {exigirAdministrativoAluno} from './escopoAlunoAdministrativo.js';
import {auditar} from './auditoria.js';

export function contaAlunoAutorizada(e,op,id){
 exigirCapacidade(op,'redefinir-senha-aluno',1);
 const {aluno,unidadeBase}=exigirAdministrativoAluno(e,op,{alunoId:id});
 if(aluno.excluidoEm)throw new Error('Cadastro excluido.');
 const conta=(e.contasAlunos||[]).find(c=>c.id===aluno.contaId&&c.alunoId===id&&c.perfil==='ALUNO'&&c.login===aluno.cpf);
 if(!conta&&(e.contasAlunos||[]).some(c=>c.alunoId===id||c.login===aluno.cpf||c.id===aluno.contaId))throw new Error('Vínculo de conta inconsistente. Nenhuma credencial foi substituída.');
 return {aluno,unidadeBase,conta};
}
// Validação administrativa compartilhada. A estratégia de credencial pertence
// ao adaptador: o servidor deverá fornecer uma recuperação segura na integração.
export function validarRedefinicaoAluno({justificativa}={}){
 if(typeof justificativa!=='string'||!justificativa.trim()||justificativa.trim().length>1000)throw new Error('Informe uma justificativa de até 1000 caracteres.');
}
export function registrarRedefinicaoAluno(e,op,id,dados,credencial,agora=new Date()){
 validarRedefinicaoAluno(dados);
 const {aluno,conta,unidadeBase}=contaAlunoAutorizada(e,op,id);
 if(conta&&!conta.ativa)throw new Error('Conta desativada. Solicite ao Master a regularização do acesso.');
 const criada=!conta,base=conta||credencial;
 if(criada&&(!base?.id||base.alunoId!==id||base.login!==aluno.cpf||base.perfil!=='ALUNO'||(e.contasAlunos||[]).some(c=>c.id===base.id||c.login===base.login||c.alunoId===id)))throw new Error('Conta de aluno inválida ou duplicada.');
 if(!/^[a-f0-9]{64}$/.test(credencial?.hash)||!/^[a-f0-9]{48}$/.test(credencial?.sal))throw new Error('Credencial local inválida.');
 const em=agora.toISOString(),nota=dados.justificativa.trim(),evento={id:crypto.randomUUID(),tipo:'acessos',titulo:criada?'Conta de acesso do aluno criada':'Redefinição administrativa de senha',em,responsavel:op.id,responsavelNome:op.nome||op.id,perfil:op.perfil,unidade:op.unidade,unidadeBase,alunoId:id,justificativa:nota,depois:(criada?'Acesso criado. ':'')+'Senha provisória definida; troca obrigatória no próximo acesso. '+nota};
 const atualizado={...base,hash:credencial.hash,sal:credencial.sal,trocaObrigatoria:true,versaoSenha:criada?1:(conta.versaoSenha||0)+1,redefinidaEm:em};
 const n={...e,contasAlunos:criada?[...(e.contasAlunos||[]),atualizado]:e.contasAlunos.map(c=>c.id===conta.id?atualizado:c),sessoesAlunos:(e.sessoesAlunos||[]).filter(s=>s.contaId!==base.id),alunos:e.alunos.map(a=>a.id===id?{...a,...(criada?{contaId:base.id,acesso:'Conta criada · primeiro acesso pendente'}:{}),historico:[...(a.historico||[]),evento]}:a)};
 return auditar(n,op,criada?'acesso-aluno-criado':'redefinicao-senha-aluno',id,null,{alunoId:id,contaId:base.id,unidadeBase,responsavelNome:op.nome||op.id,operacao:evento.titulo,trocaObrigatoria:true,sessoesRevogadas:true},nota,agora);
}
