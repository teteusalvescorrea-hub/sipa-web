import {normalizarChaveUnidade} from './catalogoUnidades.js';
// Interesse geral. Preferências antigas de dias/horários são preservadas no
// armazenamento, mas não limitam mais a consulta de oportunidades.
export function interessadoNaAntecipacao(aluno,data,hora,categoria,unidade){
 const p=aluno.antecipacao;if(p?.ativo!==true||!aluno.categoria?.includes(categoria))return false;
 const origem=normalizarChaveUnidade(aluno.unidadePrincipal||aluno.unidade),destino=categoria==='A'?'Vila Velha':categoria==='D'?'Cobilândia':normalizarChaveUnidade(aluno.unidadeCarro||origem);
 return unidade===destino||categoria==='B'&&destino==='Novo Milênio'&&unidade==='Vila Velha'||categoria!=='B'&&unidade===origem;
}
export function preferenciaAntecipacao(ativo,anterior={},agora=new Date()){
 if(typeof ativo!=='boolean')throw new Error('Informe uma preferência válida.');
 const em=agora.toISOString();return {...anterior,versao:2,interesseGeral:true,ativo,notificacoes:ativo,atualizadoEm:em,ativadoEm:ativo?(anterior.ativadoEm||em):(anterior.ativadoEm||null)};
}
