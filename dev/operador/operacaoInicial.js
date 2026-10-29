import {criarAluno} from './dadosDemo.js';
import {agendarAula,ETAPAS,cpfValido} from '../../nivel-1-operador/js/dominioOperador.js';
import {hojeBrasil,somarDias} from '../../shared/js/calendario.js';
import {prepararOnibusTemporario} from './onibusTemporario.js';
const ORIGEM='operacao-inicial-v2';
export function prepararOperacaoInicial(estado,agora=new Date()){
 if(estado.preparacoes?.[ORIGEM])return estado;
 let e=structuredClone(estado),seq=0;
 const jornada=sabado=>Object.fromEntries([1,2,3,4,5,6].map(d=>[d,d===6?(sabado?[{inicio:'07:00',fim:'12:00'}]:[]):[{inicio:'07:00',fim:'19:00'}]]));
 for(const [u,n,sabados] of [['Terra Vermelha',3,0],['Vila Velha',4,3],['Cobilândia',2,2],['Itaparica',2,1],['Santa Rita',1,0]]){
  const existentes=e.recursos.filter(r=>r.tipo==='Veículos'&&r.categoria==='B'&&r.unidade===u);
  for(let k=existentes.length;k<n;k++){
   const id='operacao-v2-'+u+'-'+k,ii=id+'-i',vv=id+'-v',auto=['Vila Velha','Cobilândia'].includes(u)&&k===n-1;
   if(e.recursos.some(r=>[ii,vv].includes(r.id)))throw new Error('Identificador da preparação já utilizado. Nenhum dado será sobrescrito.');
   const base={unidade:u,ativo:true,disponivel:true,origem:ORIGEM,disponibilidade:jornada(k<sabados)};
   e.recursos.push({...base,id:ii,tipo:'Instrutores',nome:'Instrutor Teste '+u+' '+(k+1),identificacao:ii,categorias:['B'],horarioAlmoco:'12:00/14:00',veiculoIds:[vv]},
    {...base,id:vv,tipo:'Veículos',nome:'Carro Teste '+u+' '+(k+1),identificacao:'TESTE-'+(++seq),placa:'TESTE-'+seq,categoria:'B',tipoCambio:auto?'automatico':'manual',instrutorId:ii});
  }
 }
 const motos=e.recursos.filter(r=>r.tipo==='Veículos'&&r.categoria==='A'&&r.unidade==='Vila Velha');
 for(let k=motos.length;k<6;k+=2){const id='operacao-v2-moto-'+k,ii=id+'-i',ids=[id+'-v1',id+'-v2'];const base={unidade:'Vila Velha',ativo:true,disponivel:true,origem:ORIGEM,disponibilidade:jornada(true)};e.recursos.push({...base,id:ii,tipo:'Instrutores',nome:'Instrutor Teste Moto '+(k/2+1),identificacao:ii,categorias:['A'],horarioAlmoco:'12:00/14:00',veiculoIds:ids});for(const [n,v] of ids.entries())e.recursos.push({...base,id:v,tipo:'Veículos',nome:'Moto Teste '+(k+n+1),identificacao:v,categoria:'A',instrutorId:ii});}
 // A preparação inicial não depende da existência prévia de um aluno D.
 // Nunca cria uma segunda operação quando já há recursos de ônibus cadastrados.
 if(!e.recursos.some(r=>r.categoria==='D'||r.categorias?.includes('D'))){
  const ii='DEV-INSTRUTOR-ONIBUS-001',vv='DEV-ONIBUS-001',base={unidade:'Cobilândia',ativo:true,disponivel:true,origem:ORIGEM,temporarioOnibus:'sipa-onibus-local-v1',disponibilidade:Object.fromEntries([1,2,3,4,5,6].map(d=>[d,[{inicio:'07:00',fim:'19:00'}]]))};
  e.recursos.push({...base,id:ii,tipo:'Instrutores',nome:'Instrutor Teste — Categoria D',identificacao:ii,categorias:['D'],horarioAlmoco:'12:00/14:00',veiculoIds:[vv]},
   {...base,id:vv,tipo:'Veículos',nome:'Ônibus Teste — Categoria D',identificacao:vv,categoria:'D',instrutorId:ii});
 }else e=prepararOnibusTemporario(e);
 const veiculos=e.recursos.filter(r=>r.tipo==='Veículos'&&r.origem===ORIGEM);
 for(const [n,v] of veiculos.entries()){
  if(e.alunos.length>=500)break;
  const id='operacao-aluno-v2-'+v.id;if(e.alunos.some(a=>a.id===id))continue;
  let cpf=String(99000000000+n);while(e.alunos.some(a=>a.cpf===cpf)||cpfValido(cpf))cpf=String(Number(cpf)+1000);
  const a=criarAluno({nome:'Aluno Teste Agenda '+(n+1),cpf,categoria:v.categoria,nascimento:'2000-01-01',email:'agenda'+n+'@example.invalid',telefone:'27000000000'},id);
  Object.assign(a,{origem:ORIGEM,unidade:v.unidade,unidadePrincipal:v.unidade,unidadeCarro:v.categoria==='B'?v.unidade:'',tipoCambio:v.tipoCambio,financeiro:'Regular',aulas:0,aulasAdquiridas:{[v.categoria]:10},creditos:{[v.categoria]:{contratadas:10,liberadas:10,disponiveis:10}},etapas:Object.fromEntries(Object.keys(ETAPAS).map(k=>[k,{status:'Aprovado',origem:'preparacao-local'}]))});e.alunos.push(a);
  const op={id:'preparacao-operacional',nivel:1,unidade:v.unidade,permissoes:['consultar','agendar']};let data=somarDias(hojeBrasil(agora),1),total=0;
  for(let t=0;t<20&&total<2;t++,data=somarDias(data,1)){
   try{e=agendarAula(e,op,{alunoId:id,categoria:v.categoria,data,inicio:n%2?'09:00':'08:00',instrutorId:v.instrutorId,veiculoId:v.id},id+'-a'+total,agora);total++;}catch{/* Fecha, almoço ou recurso ocupado: não inventa disponibilidade. */}
  }
 }
 return {...e,preparacoes:{...e.preparacoes,[ORIGEM]:{em:agora.toISOString()}}};
}
