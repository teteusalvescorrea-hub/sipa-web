import {NOMES_PERFIL} from './permissoesAdministrativas.js';
import {nomeUnidadeInstitucional} from './catalogoUnidades.js';
const operacoes={
 'exclusao-conta':'Perfil excluído','exclusao-aluno':'Cadastro de aluno excluído','exclusao-instrutor':'Cadastro de instrutor excluído','exclusao-veiculo':'Cadastro de veículo excluído',
 redefinir:'Senha redefinida',revogar:'Sessões revogadas',salvar:'Acesso atualizado',criar:'Acesso criado',permissoes:'Permissões administrativas alteradas',
 'promocao-conta-principal':'Permissões administrativas alteradas','configuracao-local-solicitada':'Conta de teste configurada','configuracao-master-teste':'Conta de teste configurada','inicializacao-administrativa':'Contas administrativas configuradas'
};
const texto=v=>typeof v==='string'&&v.trim()?v.trim():null;
const perfil=v=>NOMES_PERFIL[String(v||'').toLowerCase()]||'Não informado';
export function dataHoraAcesso(v){if(!texto(v)||!Number.isFinite(Date.parse(v)))return 'Não informado';const partes=new Intl.DateTimeFormat('pt-BR',{timeZone:'America/Sao_Paulo',day:'2-digit',month:'2-digit',year:'numeric',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(v)),p=Object.fromEntries(partes.map(x=>[x.type,x.value]));return `${p.day}/${p.month}/${p.year} às ${p.hour}:${p.minute}:${p.second}`;}
export function apresentarHistoricoAcessos(eventos,registros=[]){
 const porId=new Map(registros.filter(r=>r?.id).map(r=>[r.id,r]));
 // Snapshots conhecidos são vinculados apenas pelo ID exato do evento.
 for(const e of eventos){const id=e.contaId||e.referencia||e.identificador;for(const r of [e.antes,e.depois])if(id&&texto(r?.nome)&&!porId.has(id))porId.set(id,{...r,id});if(e.responsavel&&texto(e.responsavelNome)&&!porId.has(e.responsavel))porId.set(e.responsavel,{id:e.responsavel,nome:e.responsavelNome,perfil:e.perfil});if(id&&texto(e.contaNome)&&!porId.has(id))porId.set(id,{id,nome:e.contaNome,perfil:e.contaPerfil,unidade:e.unidadeAlvo});}
 return eventos.map((e,indice)=>{const id=e.contaId||e.referencia||e.identificador,alvo=porId.get(id),autor=porId.get(e.responsavel||e.usuario),nomes=e.contas?.map(id=>porId.get(id)?.nome||'Usuário não identificado');return {
  original:e,indice,instante:Number.isFinite(Date.parse(e.em))?Date.parse(e.em):-Infinity,data:dataHoraAcesso(e.em),responsavel:texto(e.responsavelNome)||texto(autor?.nome)||'Usuário não identificado',perfilResponsavel:perfil(e.perfilConta||e.perfil||autor?.perfil),
  operacao:operacoes[e.acao]||'Operação administrativa',conta:texto(e.contaNome)||texto(e.depois?.nome)||texto(e.antes?.nome)||texto(alvo?.nome)||nomes?.join(', ')||'Usuário não identificado',perfilConta:perfil(e.contaPerfil||e.depois?.perfil||e.antes?.perfil||alvo?.perfil),
  unidade:(e.unidadeAlvo||e.depois?.unidade||e.antes?.unidade||alvo?.unidade)?nomeUnidadeInstitucional(e.unidadeAlvo||e.depois?.unidade||e.antes?.unidade||alvo?.unidade):'Não informado',justificativa:texto(e.justificativa)||'Não informado',resultado:e.modalidade==='logica'?'Exclusão lógica; registros vinculados preservados':e.modalidade==='definitiva'?'Exclusão definitiva':texto(e.resultado)||'Não informado'
 };}).sort((a,b)=>b.instante-a.instante||b.indice-a.indice);
}
