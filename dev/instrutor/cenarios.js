import {agoraBrasil,somarDias,diaSemana} from '../../shared/js/calendario.js';
import {motivoFechamento} from '../../shared/js/disponibilidade.js';
import {ORIGEM,INSTRUTOR_ID} from '../../instrutor/js/dominio.js';
export function criarCenariosDemo(agora=new Date()){
 const hoje=agoraBrasil(agora).slice(0,10);let anterior=somarDias(hoje,-1),proximo=somarDias(hoje,1);
 while(motivoFechamento(anterior))anterior=somarDias(anterior,-1);
 while(motivoFechamento(proximo))proximo=somarDias(proximo,1);
 const em=agora.toISOString(),instrutor={id:INSTRUTOR_ID,nome:'Instrutor Teste 01',unidade:'Cobilândia',categorias:['B'],veiculoId:'veiculo-demo-b-01',ativo:true,origem:ORIGEM};
 const veiculo={id:instrutor.veiculoId,modelo:'Carro Escola Demo B',placa:'DEMO-B01',categoria:'B',unidade:'Cobilândia',instrutorId:instrutor.id,origem:ORIGEM};
 const cenarios=[['anterior-01',anterior,'07:00',1],['anterior-02',anterior,'08:00',1],['realizada',anterior,'09:00',5],['falta',anterior,'10:00',6],['cancelada',anterior,'11:00',2],['hoje-01',hoje,'09:00',1],['hoje-02',hoje,diaSemana(hoje)===6?'10:00':'14:00',1],['futura',proximo,diaSemana(proximo)===6?'09:00':'14:00',1]];
 const aulas=cenarios.filter(c=>c[1]!==hoje||!motivoFechamento(hoje)).map(([id,data,hora,status],i)=>({id:'aula-demo-'+id,aluno:{id:'aluno-demo-'+(i+1),nome:'Aluno Exemplo '+String(i+1).padStart(2,'0')},instrutorId:instrutor.id,veiculoId:veiculo.id,categoria:'B',unidade:'Cobilândia',inicio:data+'T'+hora+':00-03:00',fim:data+'T'+hora.slice(0,2)+':50:00-03:00',status,origem:ORIGEM,historico:[{status,em,acao:'cenario_demonstracao'}]}));
 return {versao:1,origem:ORIGEM,criadoEm:em,instrutor,veiculo,aulas};
}
