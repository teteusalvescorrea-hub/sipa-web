import {criarAluno} from './dadosDemo.js';
import {ETAPAS,autorizar,unidade,agendarAula,paresNaUnidade} from '../../nivel-1-operador/js/dominioOperador.js';
import {hojeBrasil,somarDias} from '../../shared/js/calendario.js';
import {motivoFechamento,validarHorario} from '../../shared/js/disponibilidade.js';
// Fixture explícita de laboratório. Injetada somente pelo adaptador local protegido.
// Não cria contas, não chama API e nunca redefine almoço/saldo de registros existentes.
export function prepararCenarioAgenda(estado,identidade){
 autorizar(identidade,'cadastrar');autorizar(identidade,'cadastrar-recurso');autorizar(identidade,'agendar');
 estado=prepararMotosLocais(estado,identidade);
 const u=unidade(identidade.unidade),prefixo='agenda-lab-'+u,antes=estado.cenariosAgenda?.[prefixo];if(antes)return estado;
 if(estado.alunos.length+20>500)throw new Error('Limite do laboratório atingido; nenhum registro foi alterado.');
 let e=structuredClone(estado);const recursos=[];
 for(let n=1;n<=2;n++){
  const v=prefixo+'-v'+n,i=prefixo+'-i'+n;
  recursos.push({id:v,tipo:'Veículos',nome:'Carro fictício '+n,categoria:'B',tipoCambio:'manual',unidade:u,ativo:true,placa:'DEMO-B'+n,origem:'cenario-agenda-local'},
   {id:i,tipo:'Instrutores',nome:'Instrutor fictício '+n,categorias:['B'],unidade:u,ativo:true,veiculoIds:[v],horarioAlmoco:n===1?'11-12':'12-13',origem:'cenario-agenda-local'});
 }
 if(recursos.some(r=>e.recursos.some(x=>x.id===r.id)))throw new Error('Identificador do cenário já utilizado. Nenhum registro foi substituído.');
 e.recursos.push(...recursos);
 const ids=[];
 for(let n=1;n<=20;n++){
  const id=prefixo+'-s'+n;let cpf=String(90000000000+n+['Cobilândia','Santa Rita','Vila Velha','Itaparica','Terra Vermelha','Novo Milênio'].indexOf(u)*100);
  while(e.alunos.some(a=>a.cpf===cpf))cpf=String(Number(cpf)+1000);
  if(e.alunos.some(a=>a.id===id))throw new Error('Aluno de cenário já existente. Nenhum registro foi substituído.');
  const a=criarAluno({nome:'Aluno Fictício Agenda '+String(n).padStart(2,'0'),cpf,categoria:'B',nascimento:'2000-01-01',email:'agenda'+n+'@example.invalid',telefone:'27000000000'},id);
  Object.assign(a,{unidade:u,unidadePrincipal:u,unidadeCarro:u,tipoCambio:'manual',financeiro:'Regular',aulas:0,aulasAdquiridas:{B:10},creditos:{B:{contratadas:10,disponiveis:10}},origem:'cenario-agenda-local',etapas:Object.fromEntries(Object.keys(ETAPAS).map(k=>[k,{status:'Aprovado',origem:'ficticia-local'}]))});
  e.alunos.push(a);ids.push(id);
 }
 let data=somarDias(hojeBrasil(),1),n=0;
 for(let tentativas=0;n<4&&tentativas<20;tentativas++,data=somarDias(data,1)){
  if(motivoFechamento(data)||validarHorario(data,'09:00',undefined,undefined,'B')||!paresNaUnidade(e,identidade,data,'09:00',{categoria:'B',alunoId:ids[n]}).some(p=>p.instrutorId===prefixo+'-i1'&&p.veiculoId===prefixo+'-v1'))continue;
  e=agendarAula(e,identidade,{alunoId:ids[n],categoria:'B',data,inicio:'09:00',instrutorId:prefixo+'-i1',veiculoId:prefixo+'-v1'},prefixo+'-a'+n);n++;
 }
 return {...e,cenariosAgenda:{...e.cenariosAgenda,[prefixo]:{origem:'fixture-local-explicita',criadoEm:new Date().toISOString()}}};
}

// Acionado exclusivamente pelo botão do adaptador de demonstração local.
// IDs estáveis e marca de origem permitem identificar/reverter o cenário sem
// remover recursos utilizados em reservas. Nunca sobrescreve cadastros reais.
export function prepararMotosLocais(estado,identidade){
 autorizar(identidade,'cadastrar-recurso');
 const e=structuredClone(estado),origem='cenario-motos-local',normalizar=s=>String(s||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
 const existentes=e.recursos.filter(r=>r.origem===origem||r.origem==='cenario-agenda-local'||r.ficticio===true);
 const jornada=Object.fromEntries([1,2,3,4,5,6].map(d=>[d,[{inicio:'07:00',fim:d===6?'11:00':'19:00'}]]));
 function recurso(id,nome,tipo,dados){
  const equivalente=existentes.find(r=>r.tipo===tipo&&normalizar(r.nome)===normalizar(nome));
  if(equivalente){if(unidade(equivalente.unidade)!=='Vila Velha'||(tipo==='Veículos'?equivalente.categoria!=='A':!equivalente.categorias?.includes('A')))throw new Error('Recurso fictício equivalente incompatível. Nenhum cadastro foi substituído.');return equivalente;}
  const anterior=e.recursos.find(r=>r.id===id);
  if(anterior){if(anterior.origem!==origem)throw new Error('Identificador de teste já utilizado. Nenhum recurso foi substituído.');return anterior;}
  const novo={id,nome,tipo,unidade:'Vila Velha',ativo:true,origem,ficticio:true,disponibilidade:structuredClone(jornada),...dados};e.recursos.push(novo);return novo;
 }
 for(let n=1;n<=3;n++){
  const motos=[n*2-1,n*2].map(k=>recurso('agenda-moto-local-v'+k,'Moto Teste '+String(k).padStart(2,'0'),'Veículos',{categoria:'A',identificacao:'MOTO-FICTICIA-'+String(k).padStart(2,'0')}));
  const i=recurso('agenda-moto-local-i'+n,'Instrutor Teste Moto '+String(n).padStart(2,'0'),'Instrutores',{categorias:['A'],horarioAlmoco:'11-12',veiculoIds:motos.map(m=>m.id)});
  // Reutiliza vínculos existentes; não realoca silenciosamente recursos usados.
  if(!i.veiculoIds?.length)i.veiculoIds=motos.map(m=>m.id);
  if(i.veiculoIds.length!==2||motos.some(m=>!i.veiculoIds.includes(m.id)))throw new Error('Vínculo de teste existente divergente. Confira as motos do instrutor; nenhum dado foi salvo.');
 }
 return e;
}
export function desativarMotosLocais(estado,identidade){
 autorizar(identidade,'cadastrar-recurso');
 const e=structuredClone(estado);
 for(const r of e.recursos)if(r.origem==='cenario-motos-local')r.ativo=false;
 return e; // Reservas, histórico e cadastros permanecem intactos.
}
