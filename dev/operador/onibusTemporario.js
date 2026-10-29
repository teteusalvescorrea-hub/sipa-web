// TEMPORÁRIO: remover este módulo e as duas chamadas antes da integração.
// Não altera alunos, créditos, reservas, recursos reais ou históricos existentes.
import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
import {recursoCategoriaD,onibusTemporario} from '../../shared/js/categorias.js';
export const IDS_ONIBUS_TEMPORARIO=Object.freeze({instrutor:'DEV-INSTRUTOR-ONIBUS-001',veiculo:'DEV-ONIBUS-001'});
export function prepararOnibusTemporario(estado){
 if(!desenvolvimentoAtivo()||!estado.alunos?.some(a=>a.categoria==='D'))return estado;
 const reais=estado.recursos.filter(r=>recursoCategoriaD(r)&&!onibusTemporario(r)&&r.ativo===true&&r.disponivel!==false);
 const instrutores=reais.filter(r=>['Instrutores','instrutor'].includes(r.tipo)),veiculos=reais.filter(r=>['Veículos','veiculo'].includes(r.tipo));
 // Não encobre catálogos reais duplicados nem configurações reais incompatíveis.
 if(instrutores.length&&veiculos.length||instrutores.length>1||veiculos.length>1)return estado;
 const ids=Object.values(IDS_ONIBUS_TEMPORARIO);
 if(estado.recursos.some(r=>ids.includes(r.id)&&!onibusTemporario(r)))throw new Error('Identificador temporário de ônibus já utilizado por outro cadastro. Nenhum recurso foi alterado.');
 const jornada=()=>Object.fromEntries([1,2,3,4,5,6].map(d=>[d,[{inicio:'07:00',fim:'19:00'}]]));
 const comum={unidade:'Cobilândia',ativo:true,disponivel:true,temporarioOnibus:'sipa-onibus-local-v1',origem:'desenvolvimento-local',operacao:'KM — Categoria D'};
 const candidatos=[{...comum,id:IDS_ONIBUS_TEMPORARIO.instrutor,tipo:'Instrutores',nome:'Instrutor Teste — Categoria D',identificacao:IDS_ONIBUS_TEMPORARIO.instrutor,categorias:['D'],horarioAlmoco:'12-13',intervaloAlmoco:{inicio:'12:00',fim:'13:00'},veiculoIds:[IDS_ONIBUS_TEMPORARIO.veiculo],disponibilidade:jornada()},
 {...comum,id:IDS_ONIBUS_TEMPORARIO.veiculo,tipo:'Veículos',nome:'Ônibus Teste — Categoria D',identificacao:IDS_ONIBUS_TEMPORARIO.veiculo,categoria:'D',disponibilidade:jornada()}];
 const novos=candidatos.filter(r=>!estado.recursos.some(x=>x.id===r.id));
 return novos.length?{...estado,recursos:[...estado.recursos,...novos]}:estado;
}
