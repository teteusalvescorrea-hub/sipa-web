import * as regras from '../../nivel-1-operador/js/dominioOperador.js';
import {exigirCapacidade,escopoPermitido} from './permissoesAdministrativas.js';
import {interessadoNaAntecipacao} from './antecipacaoAdministrativa.js';
import {dataValida,formatarData} from './calendario.js';
import {fimDaAula} from './disponibilidade.js';
import {localDaReservaOperacional} from './categorias.js';
import {nomeUnidadeInstitucional} from './catalogoUnidades.js';
import {auditar} from './auditoria.js';

export function autorizarAntecipacao(op){exigirCapacidade(op,'antecipar',1);}
export const chaveVaga=v=>JSON.stringify([v.unidade,v.categoria,v.data,v.inicio,v.instrutorId,v.veiculoId]);
export function validarConsultaOferta(op,f){autorizarAntecipacao(op);if(!escopoPermitido(op,f.unidade)||!['A','B','D'].includes(f.categoria)||!dataValida(f.data))throw new Error('Informe unidade autorizada, categoria e data válidas.');}
export function consultarVagasOferta(e,op,f,agora=new Date()){
 validarConsultaOferta(op,f);const vagas=[];
 for(let h=7;h<=18;h++){const inicio=String(h).padStart(2,'0')+':00';
  for(const par of regras.paresNaUnidade(e,{...op,unidade:f.unidade},f.data,inicio,{categoria:f.categoria},agora)){
   const veiculo=e.recursos.find(r=>r.id===par.veiculoId),instrutor=e.recursos.find(r=>r.id===par.instrutorId);
   if(f.categoria==='B'&&regras.unidade(veiculo?.unidade)!==f.unidade&&!(f.unidade==='Novo Milênio'&&regras.unidade(veiculo?.unidade)==='Vila Velha'))continue;
   const vaga={unidade:f.unidade,categoria:f.categoria,data:f.data,inicio,fim:fimDaAula(inicio),instrutorId:par.instrutorId,veiculoId:par.veiculoId,veiculo:veiculo?.nome||'Não informado',instrutor:instrutor?.nome||'Não informado'};
   vaga.local=localDaReservaOperacional(vaga)?.nome||nomeUnidadeInstitucional(f.unidade);vagas.push(vaga);
  }
 }return vagas;
}
export function vagasValidadas(e,op,vagas,agora=new Date()){
 if(!Array.isArray(vagas)||!vagas.length||vagas.length>100)throw new Error('Selecione uma ou mais vagas (até 100).');
 const primeiras=vagas[0],f={unidade:primeiras.unidade,categoria:primeiras.categoria,data:primeiras.data};validarConsultaOferta(op,f);
 if(vagas.some(v=>v.unidade!==f.unidade||v.categoria!==f.categoria||v.data!==f.data))throw new Error('Consulte vagas da mesma unidade, categoria e data.');
 const disponiveis=new Map(consultarVagasOferta(e,op,f,agora).map(v=>[chaveVaga(v),v]));
 return [...new Set(vagas.map(chaveVaga))].map(k=>{if(!disponiveis.has(k))throw new Error('Uma vaga deixou de estar disponível. Consulte novamente.');return disponiveis.get(k);});
}
export function interessadosOferta(e,op,selecionadas,agora=new Date()){
 const vagas=vagasValidadas(e,op,selecionadas,agora);
 return e.alunos.filter(a=>escopoPermitido(op,regras.principal(a))).flatMap(a=>{
  const validas=vagas.filter(v=>{
   if(!interessadoNaAntecipacao(a,v.data,v.inicio,v.categoria,v.unidade))return false;
   // Validação pura: descarta o estado retornado e nunca persiste uma reserva.
   // A permissão de comunicar é independente da permissão de agendar do ator.
   try{regras.agendarAula(e,{...op,unidade:a.unidadeCarro||a.unidade,permissoes:['consultar','agendar']},{...v,alunoId:a.id},'consulta-oferta',agora);return true;}catch{return false;}
  });
  return validas.length?[{id:a.id,nome:a.nome,categoria:a.categoria,unidade:regras.principal(a),telefone:a.telefone||'',whatsappPermitido:a.preferenciasContato?.whatsapp!==false&&a.antecipacao?.whatsapp!==false,vagas:validas,elegivel:true,motivo:'Elegível e interessado'}]:[];
 });
}
export function telefoneWhatsApp(valor){const original=String(valor||'').trim();if(!/^[+\d\s().-]+$/.test(original))return null;let n=original.replace(/\D/g,'');if(n.startsWith('55')&&[12,13].includes(n.length))n=n.slice(2);if(!/^[1-9]{2}(?:[2-5]\d{7}|9\d{8})$/.test(n))return null;return '55'+n;}
export function mensagemOferta(aluno,vagas){const v=vagas[0],horarios=[...new Set(vagas.map(x=>x.inicio+' às '+x.fim))].sort().join(', '),locais=[...new Set(vagas.map(x=>x.local))].join('; ');return 'SIPA — Antecipação de aulas\n\nOlá, '+aluno.nome+'!\n\nSurgiram horários disponíveis para antecipação de aulas da Categoria '+v.categoria+'.\nUnidade: '+nomeUnidadeInstitucional(v.unidade)+'\nLocal: '+locais+'\nData: '+formatarData(v.data)+'\nHorários disponíveis: '+horarios+'\n\nSe tiver interesse, entre em contato com a recepção para verificar a disponibilidade e realizar o agendamento.\nA oferta não garante reserva. Os horários estão sujeitos à disponibilidade no momento da confirmação.';}
export function enviarOferta(e,op,pedido,agora=new Date()){
 autorizarAntecipacao(op);const {campanhaId,alunoIds,canais,confirmado}=pedido;
 if(typeof campanhaId!=='string'||!campanhaId||campanhaId.length>100||confirmado!==true||!Array.isArray(alunoIds)||!alunoIds.length||alunoIds.length>500||!canais||typeof canais.sipa!=='boolean'||typeof canais.whatsapp!=='boolean'||!canais.sipa&&!canais.whatsapp)throw new Error('Confirme os destinatários e ao menos um canal.');
 if(!Array.isArray(pedido.vagas)||!pedido.vagas.length||pedido.vagas.length>100)throw new Error('Selecione uma ou mais vagas (até 100).');
 const ids=[...new Set(alunoIds)],assinatura=JSON.stringify({vagas:[...new Set(pedido.vagas.map(chaveVaga))].sort(),ids:[...ids].sort(),canais});
 const anteriores=(e.ofertasAntecipacao||[]).filter(o=>o.campanhaId===campanhaId);
 if(anteriores.length){if(anteriores.some(o=>o.responsavel!==op.id||o.assinatura!==assinatura||!e.alunos.some(a=>a.id===o.alunoId&&escopoPermitido(op,regras.principal(a)))))throw new Error('Campanha já utilizada em outra operação.');return e;}
 const candidatos=interessadosOferta(e,op,pedido.vagas,agora);if(ids.some(id=>!candidatos.some(a=>a.id===id)))throw new Error('Um dos destinatários deixou de ser elegível. Consulte novamente.');
 const em=agora.toISOString(),ofertas=ids.map(id=>{const a=candidatos.find(a=>a.id===id),telefone=telefoneWhatsApp(a.telefone);return {id:crypto.randomUUID(),campanhaId,assinatura,em,responsavel:op.id,responsavelNome:op.nome||'Equipe da unidade',unidadeAdministrativa:op.unidade,alunoId:id,unidadeAluno:a.unidade,vagas:a.vagas,data:a.vagas[0].data,hora:a.vagas[0].inicio,par:a.vagas[0],texto:mensagemOferta(a,a.vagas),assunto:'Oferta de antecipação',situacao:'ofertada',canais:{sipa:{situacao:canais.sipa?'enviada':'não solicitado',em:canais.sipa?em:null},whatsapp:{situacao:!canais.whatsapp?'não solicitado':!a.whatsappPermitido?'não autorizado':telefone?'preparado':'falha',motivo:!a.whatsappPermitido?'Preferência de contato não autoriza WhatsApp.':!telefone?'Este aluno não possui um WhatsApp válido cadastrado.':null,telefone:canais.whatsapp&&a.whatsappPermitido?telefone:null}}};});
 const n={...e,ofertasAntecipacao:[...(e.ofertasAntecipacao||[]),...ofertas],alunos:e.alunos.map(a=>{const o=ofertas.find(o=>o.alunoId===a.id);if(!o||!canais.sipa)return a;return {...a,avisosInternos:[...(a.avisosInternos||[]),{id:o.id,ofertaId:o.id,campanhaId,assunto:o.assunto,texto:o.texto,em,unidade:o.unidadeAluno,remetente:o.responsavelNome,vagas:o.vagas}]};})};
 return auditar(n,op,'oferta-antecipacao',campanhaId,null,ofertas,'Oferta confirmada; não cria reserva nem consome créditos.',agora);
}
