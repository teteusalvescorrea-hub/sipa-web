import {editarVeiculo,unidade,consultarCadastrosRecursos} from '../../nivel-1-operador/js/dominioOperador.js';
import {cambioValido} from '../../shared/js/operacaoCarro.js';

// A definição versionada do cenário agenda-lab cria B1/B2 como MANUAL.
// Nome ou placa isolados não comprovam que um recurso seja de demonstração.
export function regularizarCarrosDeTeste(estado,op,agora=new Date()){
 if(!op.permissoes?.includes('editar-veiculo'))return estado;
 let proximo=estado;
 for(const v of consultarCadastrosRecursos(estado,op)){
  if(v.tipo!=='Veículos'||v.categoria!=='B'||cambioValido(v.tipoCambio)||v.tipoCambio!=null&&v.tipoCambio!=='')continue;
  const prefixo='agenda-lab-'+unidade(v.unidade),n=[1,2].find(n=>v.id===prefixo+'-v'+n&&(v.placa===`DEMO-B${n}`||v.identificacao===`DEMO-B${n}`));
  const marcado=v.origem==='cenario-agenda-local'||estado.cenariosAgenda?.[prefixo]?.origem==='fixture-local-explicita';
  if(!n||!marcado)continue;
  // Evidência conflitante em reservas impede inferência, inclusive histórica.
  if(estado.aulas.some(a=>a.veiculoId===v.id&&(a.tipoCambio||estado.alunos.find(s=>s.id===a.alunoId)?.tipoCambio)&&
   (a.tipoCambio||estado.alunos.find(s=>s.id===a.alunoId)?.tipoCambio)!=='manual'))continue;
  proximo=editarVeiculo(proximo,op,v.id,{nome:v.nome,identificacao:v.identificacao||v.placa,tipoCambio:'manual'},agora);
 }
 return proximo;
}
