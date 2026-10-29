import {diaSemana,dataValida,agoraBrasil} from './calendario.js';
import {obterUnidadeInstitucional,normalizarChaveUnidade as normalizarCatalogo} from './catalogoUnidades.js';

const normalizarChaveUnidade=v=>normalizarCatalogo(v)==='Centro'?'Vila Velha':normalizarCatalogo(v);
export const CAMBIOS=Object.freeze([['manual','Manual'],['automatico','Automático']].map(Object.freeze));
export const DESLOCAMENTOS_CARRO=Object.freeze([
 Object.freeze({origem:'Santa Rita',destino:'Itaparica',dia:1}),
 Object.freeze({origem:'Terra Vermelha',destino:'Vila Velha',dia:2}),
 Object.freeze({origem:'Cobilândia',destino:'Vila Velha',dia:4})
]);
export const nomeCambio=valor=>CAMBIOS.find(([id])=>id===valor)?.[1]||'Não informado — regularização pelo ADM 2 pendente';
export const cambioValido=valor=>CAMBIOS.some(([id])=>id===valor);
// Compatibilidade de leitura dos cadastros legados, sem gravar vínculo presumido.
// Com mais de um candidato o cadastro precisa de escolha explícita.
export function resolverInstrutorCarro(recursos,veiculo){
 if(veiculo.instrutorId)return veiculo.instrutorId;
 const instrutores=recursos.filter(r=>['Instrutores','instrutor'].includes(r.tipo)&&r.ativo===true&&r.disponivel!==false&&r.categorias?.includes('B')&&(normalizarChaveUnidade(r.unidade)===normalizarChaveUnidade(veiculo.unidade)||(r.operacoesCarro||[]).some(op=>op.origem===normalizarChaveUnidade(veiculo.unidade)&&[op.origem,op.destino].includes(normalizarChaveUnidade(r.unidade)))));
 const vinculados=instrutores.filter(i=>i.veiculoIds?.includes(veiculo.id));
 if(vinculados.length)return vinculados.length===1?vinculados[0].id:null;
 const legados=instrutores.filter(i=>i.veiculoIds==null&&normalizarChaveUnidade(i.unidade)===normalizarChaveUnidade(veiculo.unidade));
 return legados.length===1?legados[0].id:null;
}
export const unidadeCarroPermitida=(tipoCambio,unidade)=>cambioValido(tipoCambio)&&!!obterUnidadeInstitucional(normalizarChaveUnidade(unidade))&&(tipoCambio!=='automatico'||['Cobilândia','Vila Velha'].includes(normalizarChaveUnidade(unidade)));
export function operacaoCarro(aluno,data){
 if(typeof data==='string'&&data.includes('T')&&Number.isFinite(Date.parse(data)))data=agoraBrasil(new Date(data)).slice(0,10);
 const origem=normalizarChaveUnidade(aluno.unidadeCarro||aluno.unidade);
 if(!obterUnidadeInstitucional(origem)||!dataValida(data))return null;
 const dia=diaSemana(data);if(dia===0)return null;
 const deslocamento=DESLOCAMENTOS_CARRO.find(x=>x.origem===origem&&x.dia===dia);
 return {origem,destino:origem==='Novo Milênio'?'Vila Velha':deslocamento?.destino||origem,dia,compartilhada:origem==='Novo Milênio',deslocamento:!!deslocamento,tipoCambio:aluno.tipoCambio};
}
export function localCarro(aluno,data){
 const op=operacaoCarro(aluno,data);if(!op)return null;
 const u=obterUnidadeInstitucional(op.destino);
 return {id:u.id,nome:u.nome,endereco:u.enderecoCompleto,unidadeAdministrativa:op.origem,deslocamento:op.deslocamento};
}
export function localReservaCarro(aula){
 if(aula.categoria!=='B')return null;
 // Reservas novas guardam snapshot; registros anteriores não são transferidos.
 if(aula.localReal)return aula.localReal;
 return aula.unidadeCarro||!aula.id?localCarro(aula,aula.data||aula.inicio):null;
}
export function recursoNaOperacaoCarro(r,op){
 if(!op)return false;
 const propria=normalizarChaveUnidade(r.unidade);
 if(op.compartilhada)return propria==='Vila Velha';
 if(!op.deslocamento)return propria===op.origem;
 // A grade semanal desloca a operação da origem, não abre o catálogo do destino.
 if(propria===op.origem)return true;
 // Declaração explícita, cadastrada pelo responsável pelo recurso. Nunca abre
 // todo o catálogo da unidade de destino nem muda a jornada do profissional.
 return (r.operacoesCarro||[]).some(x=>x.origem===op.origem&&x.destino===op.destino&&x.dia===op.dia)&&[op.origem,op.destino].includes(propria);
}
export function recursoCarroCompativel(r,aluno,data){
 const op=operacaoCarro(aluno,data);
 if(!unidadeCarroPermitida(aluno.tipoCambio,op?.origem)||!recursoNaOperacaoCarro(r,op))return false;
 const veiculo=r.tipo==='veiculo'||r.tipo==='Veículos';
 return veiculo?r.categoria==='B'&&r.tipoCambio===aluno.tipoCambio:(r.categorias||[]).includes('B');
}
export function recursoCarroConsultavel(r,origem){
 origem=normalizarChaveUnidade(origem);
 if(origem==='Novo Milênio')return normalizarChaveUnidade(r.unidade)==='Vila Velha'&&(r.categoria==='B'||r.categorias?.includes('B'));
 return normalizarChaveUnidade(r.unidade)===origem||DESLOCAMENTOS_CARRO.some(op=>op.origem===origem&&recursoNaOperacaoCarro(r,{...op,deslocamento:true}));
}
export function motivoCarro(aluno){
 if(!cambioValido(aluno.tipoCambio))return 'Tipo de carro não informado. Solicite regularização autorizada ao ADM 2 antes de novas reservas de carro.';
 return unidadeCarroPermitida(aluno.tipoCambio,aluno.unidadeCarro||aluno.unidade)?'':'Unidade incompatível com o tipo de carro cadastrado.';
}
