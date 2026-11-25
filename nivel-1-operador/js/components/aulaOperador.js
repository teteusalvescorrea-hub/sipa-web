import {abrirSolicitacaoMedica} from '../../../aluno/js/components/solicitacaoMedica.js';
import {nomeCambio} from '../../../shared/js/operacaoCarro.js';
import {nomeLocalDaReserva,linkLocalizacaoReserva} from '../../../shared/components/localAula.js';
import { dataPorExtenso, formatarData } from "../../../shared/js/calendario.js";
import { STATUS_AGENDAMENTO } from "../../../shared/js/disponibilidade.js";
import { el, botao, modal } from "./uiOperador.js";
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {acoesDeCancelamento} from './substituicao.js';
import {seloTipoAula,tipoDaAula,textoTipoAula,REPOSICAO_ATESTADO} from '../../../shared/js/tiposAula.js';
export function identificarAula(estado, aula) {
    const recursos = estado.recursos.filter(r => r.unidade === aula.unidade);
    return { aluno: aula.alunoNome || estado.alunos.find(a => a.id === aula.alunoId)?.nome || "Aluno não informado",
        instrutor: aula.instrutorNome || recursos.find(r => r.id === aula.instrutorId)?.nome || "Instrutor não informado",
        // 24/11/2026 (pedido do usuário): o veículo com a placa na agenda.
        veiculo: [aula.veiculoNome || recursos.find(r => r.id === aula.veiculoId)?.nome || estado.recursos.find(r => r.id === aula.veiculoId)?.nome, (recursos.find(r => r.id === aula.veiculoId) || estado.recursos.find(r => r.id === aula.veiculoId))?.placa].filter(Boolean).join(" · ") || "Veículo não informado",
        identificacao: recursos.find(r => r.id === aula.veiculoId)?.descricao || "" };
}
// 17/11/2026 (pedido do usuário): a aula que repõe outra abonada por atestado aparece como "Reposição" na agenda da
// Recepção, da Gerência e do Master, com a aula de origem no detalhe.
const textoOrigem = r => { const s = String(r?.aulaOrigemInicio || ""); return s ? `${s.slice(8, 10)}/${s.slice(5, 7)}/${s.slice(0, 4)} às ${s.slice(11, 16)}` : ""; };
export function seloReposicao(aula, classe = "op-evento-reposicao") { const s = el("span", "A.T.", classe); s.title = "A.T. · Aula de reposição por atestado" + (textoOrigem(aula.reposicao) ? " · repõe a aula de " + textoOrigem(aula.reposicao) : ""); return s; }
export function cardAula(estado, aula, abrir, variante = "completo") {
    // Preserva os consumidores antigos que usavam um booleano como quarto argumento.
    if (typeof variante === "boolean") variante = variante ? "semana" : "completo";
    const nomes = identificarAula(estado, aula);
    if (["agenda", "semana"].includes(variante)) {
        const evento = botao("", () => abrir(aula), `op-aula-card op-aula-evento${variante === "semana" ? " op-aula-compact" : ""}`);
        evento.dataset.aulaId = aula.id;
        evento.setAttribute("aria-label", `Ver detalhes: ${nomes.aluno}, ${aula.inicio} às ${aula.fim}, categoria ${aula.categoria}, ${STATUS_AGENDAMENTO[aula.status]}`);
        const nome = el("span", nomes.aluno, "op-evento-nome"); nome.title = nomes.aluno;
        evento.append(nome, el("span", `${aula.inicio} às ${aula.fim}`, "op-evento-horario"), el("span", aula.categoria, "op-evento-categoria"),
            el("span", STATUS_AGENDAMENTO[aula.status], `op-badge op-aula-status-${aula.status}`));
        evento.querySelector(".op-badge").title = STATUS_AGENDAMENTO[aula.status];
        // 24/11/2026: o tipo da aula em toda aula da agenda (a reposição de atestado em destaque).
        const tipo = tipoDaAula(aula), selo = seloTipoAula(aula);
        if (selo) { nome.after(selo); evento.setAttribute("aria-label", evento.getAttribute("aria-label") + ", " + textoTipoAula(aula)); }
        if (tipo?.id === REPOSICAO_ATESTADO) evento.classList.add("op-aula-reposicao");
        return evento;
    }
    const card = el("article", undefined, `op-aula-card${variante === "lista" ? " op-aula-lista" : ""}`);
    card.dataset.aulaId = aula.id;
    card.append(el("h3", nomes.aluno), el("strong", `${aula.inicio} às ${aula.fim}`, "op-aula-horario"),
        el("p", `${formatarData(aula.data)} · ${dataPorExtenso(aula.data).split(",")[0]}`, "op-aula-data"));
    const recursos = el("div", undefined, "op-aula-recursos");
    recursos.append(el("p", `Instrutor: ${nomes.instrutor}`), el("p", `Veículo: ${nomes.identificacao || nomes.veiculo}`));
    const rodape = el("div", undefined, "op-aula-footer");
    rodape.append(el("span", `Categoria ${aula.categoria}`, "op-aula-categoria"), el("span", STATUS_AGENDAMENTO[aula.status], `op-badge op-aula-status-${aula.status}`), botao("Ver detalhes", () => abrir(aula)));
    const seloCard = seloTipoAula(aula);
    if (seloCard) rodape.prepend(seloCard);
    if (tipoDaAula(aula)?.id === REPOSICAO_ATESTADO) card.classList.add("op-aula-reposicao");
    card.append(recursos, rodape);
    card.querySelector("h3").title = nomes.aluno;
    recursos.querySelectorAll("p").forEach(p => { p.title = p.textContent; });
    return card;
}
export function criarDetalhesAula(raiz,obterEstado,{servico,executar}={}){
 const dialogo=modal(raiz,'Detalhes do agendamento','opAula'),corpo=el('div');dialogo.classList.add('op-aula-dialog');dialogo.append(corpo);let versao=0;
 async function abrir(referencia){const ticket=++versao;corpo.replaceChildren(el('p','Carregando agendamento…','op-help'));if(!dialogo.open)dialogo.showModal();
  try{const resultado=servico?await servico.detalhesAgendamento(referencia.id):{aula:referencia,podeCancelar:false,podeRegistrar:false},aula=resultado.aula;if(ticket!==versao)return;
   const nomes=identificarAula(obterEstado(),aula),header=el('header',undefined,'op-aula-resumo');header.append(el('h3',nomes.aluno),el('p','Categoria '+aula.categoria+' · '+formatarData(aula.data)+' · '+aula.inicio+'–'+aula.fim),el('span',STATUS_AGENDAMENTO[aula.status],'op-badge op-aula-status-'+aula.status));
   const reposicao=aula.reposicao||referencia.reposicao,comTipo={...referencia,...aula,reposicao,tipoAula:aula.tipoAula??referencia.tipoAula},seloDetalhe=seloTipoAula(comTipo);if(seloDetalhe)header.append(seloDetalhe);
   const dados=el('dl',undefined,'op-aula-dados'),minutos=h=>Number(h.slice(0,2))*60+Number(h.slice(3));
   for(const [nome,valor] of [['Instrutor',nomes.instrutor],['Veículo',nomes.veiculo],...(aula.categoria==='B'?[['Câmbio',nomeCambio(aula.tipoCambio)]]:[]),['Unidade responsável',nomeUnidadeInstitucional(aula.unidade)],['Local real',nomeLocalDaReserva(aula)],['Duração',(minutos(aula.fim)-minutos(aula.inicio))+' minutos'],...(textoTipoAula(comTipo)?[['Tipo da aula',textoTipoAula(comTipo)]]:[]),...((aula.reposicao||referencia.reposicao)?[['Reposição','Repõe a aula de '+(textoOrigem(aula.reposicao||referencia.reposicao)||'data não informada')+', abonada por atestado']]:[])]){const n=el('div');n.append(el('dt',nome),el('dd',valor));dados.append(n);}
   const acoes=el('footer',undefined,'op-dialog-actions'),mapa=linkLocalizacaoReserva(aula);if(mapa)acoes.append(mapa);
   // Fase 3: só a Gerência (e o Master) cancela; a Recepção pede a substituição e marca a falta com ônus.
   const nivel=servico?.identidade?.nivel||1;
   if(resultado.podeCancelar&&nivel>=2){const b=botao('Cancelar aula',()=>confirmar('cancelar',aula,resultado),'op-button op-button-outline');b.dataset.opAulaCancelar='';acoes.append(b);}
   if(servico&&resultado.podeCancelar&&[1,3].includes(aula.status))acoes.append(...acoesDeCancelamento(raiz,servico,aula,obterEstado(),{executar,aoConcluir:()=>dialogo.close()}));
   if(resultado.podeRegistrar)for(const [status,texto] of [[5,'Registrar presença'],[6,'Registrar falta']]){const b=botao(texto,()=>confirmar(status,aula,resultado),'op-button op-button-outline');b.dataset.opAulaResultado=String(status);acoes.append(b);}
   if(resultado.podeSolicitarMedico){const b=botao('Anexar atestado para análise',()=>{abrirSolicitacaoMedica({aula:{...aula,inicio:aula.data+'T'+aula.inicio+':00-03:00'},servico:{solicitarCancelamentoMedico:dados=>executar(()=>servico.solicitarAtestadoRecepcao(dados),'A AgIA enviou o atestado para análise da Gerência.').then(ok=>{if(!ok)throw new Error('Solicitação recusada. Confira o aviso do atendimento.');})},origem:b,aoConcluir:()=>abrir(aula)});const d=document.querySelector('dialog[data-medical-request]');d.querySelector('[data-medical-submit]').textContent='Enviar atestado para análise';const c=d.querySelector('[name=confirmacaoMedica]');d.querySelector('.medical-consent').replaceChildren(c,document.createTextNode(aula.status===6?' Confirmo que o atestado é desta aula.':' Confirmo o envio do atestado, sem devolução automática do crédito.'));d.querySelector('h2').textContent=aula.status===6?'Anexar atestado da falta':'Anexar atestado · análise administrativa';d.querySelector('.lesson-cancel-policy').textContent=aula.status===6?'A falta continua registrada. A AgIA envia o atestado para a Gerência: aprovado, o crédito volta ao aluno e a próxima aula da categoria fica como reposição (A.T.).':'Documento vinculado ao aluno. O crédito fica retido até a decisão: a AgIA envia o atestado direto para a Gerência decidir a devolução.';},'op-button op-button-outline');b.dataset.opAulaAtestado='';acoes.append(b);}
   corpo.replaceChildren(header,dados,acoes);
   if(aula.cancelamento)corpo.append(el('p',aula.cancelamento.credito==='retido'?'Crédito retido. Eventual justificativa médica deve seguir o fluxo de atestados, com decisão exclusiva da gerência.':'Crédito: '+aula.cancelamento.credito,'op-help'));
   if(aula.historico?.length){const h=el('details'),lista=el('ul');h.append(el('summary','Histórico da aula'));for(const e of aula.historico)lista.append(el('li',(e.em?new Date(e.em).toLocaleString('pt-BR')+' · ':'')+(e.acao||STATUS_AGENDAMENTO[e.status]||({Solicitado:'Aula agendada'})[e.descricao]||e.descricao||'Movimentação')+' · '+(e.autor||e.responsavel||'Responsável não informado')+(e.motivo?' · '+e.motivo:'')));h.append(lista);corpo.append(h);}
  }catch(e){if(ticket===versao)corpo.replaceChildren(el('p',e.message,'op-acompanhamento-erro'));}
 }
 function confirmar(acao,aula,resultado){
  const cancelando=acao==='cancelar',d=modal(raiz,cancelando?'Cancelar aula?':acao===5?'Registrar presença?':'Registrar falta?','opConfirmarAula');d.classList.add('op-aula-dialog');
  const resumo=el('p',aula.alunoNome+' · '+formatarData(aula.data)+' · '+aula.inicio+'–'+aula.fim+' · Categoria '+aula.categoria),motivo=el('textarea');motivo.maxLength=2000;motivo.rows=3;motivo.dataset.opMotivoIntervencao='';const escolha=el('select');escolha.dataset.opMotivoCancelamento='';
  for(const [id,texto] of [['','Selecione'],['familiar','Imprevisto familiar'],['trabalho','Imprevisto no trabalho'],['pessoal','Motivos pessoais'],['profissional','Compromisso profissional'],['saude','Motivos de saúde'],['transporte','Problemas de transporte'],['outro','Outros']]){const o=el('option',texto);o.value=id;escolha.append(o);}
  const retido=cancelando&&!resultado.prazo?.dentroPrazo,aceite=el('input');aceite.type='checkbox';aceite.dataset.opAceitarRetencao='';const rotulo=el('label');rotulo.append(aceite,document.createTextNode(' Compreendo que o crédito não será devolvido automaticamente.'));rotulo.hidden=!retido;
  const erro=el('p',undefined,'op-acompanhamento-erro');erro.setAttribute('role','alert');const acoes=el('footer',undefined,'op-dialog-actions'),salvar=botao(cancelando?'Confirmar cancelamento':'Confirmar registro',async()=>{
   if(salvando)return;if(cancelando&&!escolha.value){erro.textContent='Selecione o motivo do cancelamento.';return;}if(!cancelando&&motivo.value.trim().length<5){erro.textContent='Informe o motivo da intervenção (mínimo de 5 caracteres).';return;}if(retido&&!aceite.checked){erro.textContent='Confirme a consequência sobre o crédito.';return;}
   salvando=true;salvar.disabled=true;try{const ok=await executar(()=>cancelando?servico.cancelarAula(aula.id,{motivo:escolha.value,observacoes:motivo.value,aceitarConsequencias:aceite.checked}):servico.registrarFrequencia(aula.id,acao,motivo.value),'Aula atualizada.',async()=>{d.close();await abrir(aula);});if(!ok)erro.textContent='Operação recusada. Confira o aviso acima.';}finally{salvando=false;salvar.disabled=false;}
  },'op-button op-button-primary');salvar.dataset.opConfirmarOperacao='';let salvando=false;acoes.append(botao('Voltar',()=>d.close()),salvar);
  d.append(resumo);if(cancelando)d.append(el('p',retido?'Cancelamento dentro de 48 horas úteis: crédito retido. A AgIA envia os atestados para análise e decisão da Gerência.':'Cancelamento com antecedência permitida: crédito devolvido uma única vez.'),escolha);d.append(el('label',cancelando?'Observações':'Motivo da intervenção administrativa'),motivo,rotulo,erro,acoes);d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();
 }
 return {abrir};
}
