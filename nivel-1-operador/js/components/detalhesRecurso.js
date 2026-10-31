import {el} from './uiOperador.js';
import {INTERVALOS_ALMOCO,ALMOCOS,LOCAIS_ONIBUS,NOMES_CATEGORIA} from '../../../shared/js/categorias.js';
import {CAMBIOS} from '../../../shared/js/operacaoCarro.js';
import {obterUnidadeInstitucional,nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {dataValida,formatarData} from '../../../shared/js/calendario.js';

const dias=['Domingo','Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];
const texto=v=>typeof v==='string'&&v.trim()?v.trim():'Não informado';
const hora=v=>typeof v==='string'&&/^\d{2}:\d{2}$/.test(v);
const faixa=f=>typeof f==='string'?f:f&&hora(f.inicio)&&hora(f.fim)?`${f.inicio} às ${f.fim}`:'Faixa incompleta — conferir configuração';
function jornada(r){
 if(!r.disponibilidade&&!Array.isArray(r.disponibilidadeSemanal))return [['Expediente','Não informado']];
 const grupos=new Map();
 for(const dia of [1,2,3,4,5,6,0]){
  const faixas=r.disponibilidade?r.disponibilidade[dia]||[]:r.disponibilidadeSemanal.filter(f=>f.dia===dia);
  const valor=faixas.length?faixas.map(faixa).join(' · '):'Sem expediente cadastrado';
  if(!grupos.has(valor))grupos.set(valor,[]);grupos.get(valor).push(dias[dia]);
 }
 return [...grupos].map(([valor,nomes])=>[nomes.length===5&&nomes[0]===dias[1]&&nomes[4]===dias[5]?'Segunda a sexta-feira':nomes.join(', '),valor]);
}
function intervalo(r){
 const configurado=INTERVALOS_ALMOCO.find(([id])=>id===r.horarioAlmoco);
 if(configurado)return configurado[1];
 if(hora(r.intervaloAlmoco?.inicio)&&hora(r.intervaloAlmoco?.fim))return faixa(r.intervaloAlmoco);
 if(ALMOCOS.some(([id])=>id===r.horarioAlmoco))return r.horarioAlmoco==='11-12'?'11:00 às 13:00':'12:00 às 14:00';
 return null;
}
const data=d=>dataValida(d)?formatarData(d):'Data não informada';
function bloqueios(r,origem){
 return [...(r.datasBloqueadas||[]).map(d=>`${origem} · ${data(d)} — data bloqueada`),
  ...(r.feriadosUnidade||[]).map(d=>`${origem} · ${data(d)} — feriado da unidade`),
  ...[...(r.bloqueios||[]),...(r.bloqueiosUnidade||[])].map(b=>`${origem} · ${data(b.data)}${hora(b.inicio)&&hora(b.fim)?' · '+faixa(b):' · dia completo'}${b.motivo?' — '+b.motivo:''}`)];
}
// Modelo de leitura: não completa cadastros, não calcula vagas nem grava vínculos.
export function apresentarRecurso(r,recursos=[]){
 const veiculo=r.tipo==='Veículos',categoria=veiculo?r.categoria:null;
 const candidatos=r.instrutorId?recursos.filter(i=>i.id===r.instrutorId&&i.tipo==='Instrutores'):recursos.filter(i=>i.tipo==='Instrutores'&&i.veiculoIds?.includes(r.id));
 const responsavel=candidatos.length?candidatos.map(i=>i.nome||'Nome não informado').join(' · '):r.instrutorId?'Instrutor vinculado não disponível nesta consulta':'Não informado';
 const unidade=nomeUnidadeInstitucional(r.unidade),pista=obterUnidadeInstitucional('Vila Velha');
 const local=categoria==='A'?`Pista KM Centro de Vila Velha · ${pista.enderecoCompleto}`:categoria==='D'?`Segunda a sexta: ${LOCAIS_ONIBUS.semana.nome} · ${LOCAIS_ONIBUS.semana.endereco}\nSábado: ${LOCAIS_ONIBUS.sabado.nome} · ${LOCAIS_ONIBUS.sabado.endereco}`:categoria==='B'?unidade:typeof r.localOperacao==='string'?r.localOperacao:'Não informado';
 const identificacao=[['Tipo',categoria?{A:'Motocicleta',B:'Automóvel',D:'Ônibus'}[categoria]||r.tipo:r.tipo]];
 if(veiculo&&r.placa!==(r.identificacao||r.placa))identificacao.push(['Placa',texto(r.placa)]);
 if(r.modelo)identificacao.push(['Modelo',r.modelo]);
 if(categoria==='B')identificacao.push(['Câmbio',CAMBIOS.find(([id])=>id===r.tipoCambio)?.[1]||'Não informado']);
 const vinculo=local===unidade?[['Unidade administrativa e local das aulas',unidade]]:[['Unidade administrativa',unidade],['Local de realização das aulas',local]];
 if(veiculo)vinculo.push(['Instrutor responsável',responsavel],['Situação do vínculo',candidatos.length===1?'Vínculo cadastrado'+(candidatos[0].ativo===false?' · instrutor inativo':candidatos[0].disponivel===false?' · instrutor indisponível':''):candidatos.length>1?'Mais de um vínculo cadastrado — conferir configuração':r.instrutorId?'Referência cadastrada; consulta do instrutor pendente':'Vínculo não informado']);
 const intervalos=candidatos.length?candidatos.map(i=>({origem:i.nome||'Instrutor',valor:intervalo(i),doInstrutor:true})):[];
 const proprio=intervalo(r);if(proprio)intervalos.push({origem:veiculo?'Veículo':'Recurso',valor:proprio,doInstrutor:false});
 if(veiculo&&!intervalos.length)intervalos.push({origem:'Instrutor responsável',valor:null,doInstrutor:true});
 const adicionais=[];for(const [k,v]of [['Descrição',r.descricao],['Observações',r.observacoes]])if(typeof v==='string'&&v.trim())adicionais.push([k,v]);
 if(categoria==='B'&&r.operacoesCarro?.length)adicionais.push(['Operações de carro',r.operacoesCarro.map(o=>`${nomeUnidadeInstitucional(o.origem)} → ${nomeUnidadeInstitucional(o.destino)} · ${dias[o.dia]||'Dia não informado'}`).join('\n')]);
 return {titulo:veiculo?'Detalhes do veículo':'Detalhes do recurso',nome:texto(r.nome),identificacao:texto(r.identificacao||r.placa),categoria:categoria?'Categoria '+categoria:r.tipo,situacao:r.ativo===false?'Inativo':r.disponivel===false?'Indisponível':r.ativo===true?'Ativo':'Não informada',camposIdentificacao:identificacao,vinculo,jornada:jornada(r),jornadaInstrutor:candidatos.flatMap(i=>jornada(i).map(([dia,v])=>[`${i.nome||'Instrutor'} · ${dia}`,v])),intervalos,bloqueios:[...bloqueios(r,'Recurso'),...candidatos.flatMap(i=>bloqueios(i,i.nome||'Instrutor'))],adicionais};
}
function campos(itens){const dl=el('dl',undefined,'op-resource-fields');for(const [rotulo,valor]of itens){const linha=el('div');if(String(valor).length>110||String(valor).includes('\n'))linha.dataset.wide='';linha.append(el('dt',rotulo),el('dd',String(valor)));dl.append(linha);}return dl;}
export {campos as camposDetalhes,intervalo as intervaloDoRecurso};
export function montarDetalhesRecurso(d,r,recursos){
 const m=apresentarRecurso(r,recursos);d.classList.add('op-resource-details');d.querySelector('.op-dialog-heading h2').textContent=m.titulo;
 const corpo=el('div',undefined,'op-resource-content'),resumo=el('header',undefined,'op-resource-summary'),meta=el('div',undefined,'op-resource-meta');
 const situacao=el('span',m.situacao,'op-resource-state');situacao.dataset.situacao=m.situacao;
 meta.append(el('span',m.categoria),situacao);resumo.append(el('h3',m.nome),el('p',m.identificacao),meta);corpo.append(resumo);
 const secao=(titulo,linhas)=>{const n=el('section',undefined,'op-resource-section');n.append(el('h3',titulo),campos(linhas));corpo.append(n);return n;};
 secao(r.tipo==='Veículos'?'Informações do veículo':'Identificação',m.camposIdentificacao);secao('Vínculo e localização',m.vinculo);
 const horarios=secao('Disponibilidade e horários',m.jornada);
 for(const i of m.intervalos){horarios.append(campos([['Intervalo'+(i.doInstrutor?' do instrutor':' do recurso'),(i.valor||'Configuração pendente')+' · '+i.origem]]));if(!i.valor){const aviso=el('details');aviso.append(el('summary','Sobre esta pendência'),el('p','O intervalo do instrutor não está configurado ou não está disponível nesta consulta. As restrições existentes de agendamento permanecem aplicadas; consulte a configuração antes de agendar.'));horarios.append(aviso);}}
 if(m.bloqueios.length){const detalhe=el('details'),lista=el('ul');for(const b of m.bloqueios)lista.append(el('li',b));detalhe.append(el('summary',`Bloqueios cadastrados (${m.bloqueios.length})`),lista);horarios.append(detalhe);}
 if(m.adicionais.length)secao('Informações adicionais',m.adicionais);
 const acoes=el('footer',undefined,'op-resource-actions');d.append(corpo,acoes);return acoes;
}
