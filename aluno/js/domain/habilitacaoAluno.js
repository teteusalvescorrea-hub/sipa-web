// Sua habilitação (Meu progresso): situação dos exames pela validade e das provas como etapas.
// Vale nos dois modos: os dados vêm de adaptarAcompanhamento (API) ou de acompanhamentoDaConta (laboratório).
export const DIAS_AVISO_VALIDADE=30;
const PRATICAS=Object.freeze({praticaCarro:'Prática · Carro B',praticaMoto:'Prática · Moto A',praticaOnibus:'Prática · Ônibus D'});
const dia=d=>/^\d{4}-\d{2}-\d{2}/.test(String(d||''))?String(d).slice(0,10):'';
const diasEntre=(de,ate)=>Math.round((Date.parse(ate+'T12:00:00Z')-Date.parse(de+'T12:00:00Z'))/86400000);
export const diaMes=d=>dia(d)?dia(d).slice(8,10)+'/'+dia(d).slice(5,7):'';

// Selo do exame. tom: ok (verde), neutro (cinza) ou alerta (laranja); só o ícone e a borda do selo usam essa cor.
export function situacaoExame(exame,hoje){
 const s=exame?.situacao||'Não informado',validade=dia(exame?.validade),restam=validade&&dia(hoje)?diasEntre(dia(hoje),validade):null;
 if(s==='Vencido'||(s==='Aprovado'&&restam!==null&&restam<0))return {chave:'vencido',rotulo:'Vencido',tom:'alerta',emDia:false};
 if(s==='Aprovado'&&restam!==null&&restam<DIAS_AVISO_VALIDADE)return {chave:'vencendo',rotulo:'Vence em breve',tom:'alerta',emDia:true};
 if(s==='Aprovado')return {chave:'aprovado',rotulo:'Aprovado',tom:'ok',emDia:true};
 if(s==='Reprovado')return {chave:'reprovado',rotulo:'Reprovado',tom:'alerta',emDia:false};
 if(s==='Não se aplica')return {chave:'dispensado',rotulo:'Não se aplica',tom:'neutro',emDia:true};
 return {chave:'pendente',rotulo:'Pendente',tom:'neutro',emDia:false};
}
export function resumoExames(exames,hoje){
 const lista=exames||[],emDia=lista.filter(e=>situacaoExame(e,hoje).emDia).length;
 return {emDia,total:lista.length,texto:emDia+' de '+lista.length+' exames em dia'};
}

// Situação da prova pela última tentativa válida (cancelada ou arquivada não conta). estado: feito, atual, falhou ou pendente.
const resultado=t=>t.resultado||t.situacao;
function agendada(t){
 const hora=t.hora||(/T\d{2}:\d{2}/.test(String(t.data||''))?String(t.data).slice(11,16):'');
 return [diaMes(t.data)+(hora?' às '+hora:''),t.local].filter(Boolean).join(' · ');
}
export function situacaoProva(prova){
 const tentativas=[...(prova?.tentativas||[])].filter(t=>!t.arquivada&&resultado(t)!=='Cancelado').sort((a,b)=>(a.ordem||1)-(b.ordem||1));
 const aprovada=tentativas.find(t=>resultado(t)==='Aprovado');
 if(aprovada)return {estado:'feito',situacao:'Aprovado'+(diaMes(aprovada.data)?' em '+diaMes(aprovada.data):''),detalhe:''};
 const ultima=tentativas.at(-1),reprovada=tentativas.filter(t=>['Reprovado','Faltou'].includes(resultado(t))).at(-1);
 const proxima=ultima&&resultado(ultima)==='Agendado'?ultima:null;
 if(reprovada)return {estado:'falhou',situacao:(resultado(reprovada)==='Faltou'?'Faltou':'Reprovado')+' · '+(reprovada.ordem||1)+'ª tentativa',detalhe:proxima?'Nova prova: '+(agendada(proxima)||'data a definir'):''};
 if(proxima)return {estado:'atual',situacao:'Agendada'+(agendada(proxima)?' · '+agendada(proxima):''),detalhe:''};
 return {estado:'pendente',situacao:'Aguardando agendamento',detalhe:''};
}

// Etapas: Exames → Prova teórica → prática de cada categoria. A primeira etapa não concluída fica como a atual.
// 24/11/2026: a etapa da liberação para agendar. acao 'solicitar' = o aluno já pode pedir (aprovado na teórica).
export function etapaLiberacao(l){
 if(l?.liberadoEm)return {tipo:'liberacao',titulo:'Liberação para agendamento',estado:'feito',situacao:'Liberado'+(diaMes(l.liberadoEm)?' em '+diaMes(l.liberadoEm):''),detalhe:'Você já pode agendar suas aulas práticas.'};
 if(l?.solicitadaEm)return {tipo:'liberacao',titulo:'Liberação para agendamento',estado:'pendente',situacao:'Pedido enviado'+(diaMes(l.solicitadaEm)?' em '+diaMes(l.solicitadaEm):''),detalhe:'A AgIA avisa você quando o agendamento for liberado.'};
 if(l?.podeSolicitar)return {tipo:'liberacao',titulo:'Liberação para agendamento',estado:'pendente',situacao:'Disponível para pedir',detalhe:'Você foi aprovado na prova teórica. Peça a liberação para agendar suas aulas práticas.',acao:'solicitar'};
 return {tipo:'liberacao',titulo:'Liberação para agendamento',estado:'pendente',situacao:'Depois da aprovação na prova teórica',detalhe:''};
}
export function etapasHabilitacao(acompanhamento,hoje){
 // 25/11/2026 (pedido do usuário): o toxicológico pode ser feito por último; não segura a etapa dos exames.
 const todos=acompanhamento?.exames||[],exames=todos.filter(e=>e.tipo!=='toxicologico'),resumo=resumoExames(exames,hoje);
 const toxico=todos.find(e=>e.tipo==='toxicologico'),toxicoFeito=toxico&&situacaoExame(toxico,hoje).emDia;
 const alerta=exames.some(e=>['vencido','reprovado'].includes(situacaoExame(e,hoje).chave));
 const etapas=[{tipo:'exames',titulo:'Exames médicos',estado:exames.length&&resumo.emDia===resumo.total?'feito':alerta?'falhou':'pendente',situacao:exames.length&&resumo.emDia===resumo.total?'Em dia':resumo.emDia+' de '+resumo.total+' em dia',detalhe:toxico&&!toxicoFeito?'O toxicológico pode ser feito depois.':''}];
 for(const prova of acompanhamento?.provas||[]){etapas.push({tipo:prova.tipo,titulo:prova.tipo==='teorica'?'Prova teórica':PRATICAS[prova.tipo]||prova.nome||'Prova',...situacaoProva(prova)});
  // 24/11/2026 (pedido do usuário): depois da teórica, a liberação para agendar as aulas práticas.
  if(prova.tipo==='teorica'&&acompanhamento?.liberacao)etapas.push(etapaLiberacao(acompanhamento.liberacao));}
 const proxima=etapas.find(e=>e.estado!=='feito');if(proxima?.estado==='pendente')proxima.estado='atual';
 return etapas;
}
