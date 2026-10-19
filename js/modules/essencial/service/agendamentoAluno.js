import { agoraBrasil, diaSemana, somarDias, feriadosBrasileiros } from '../../compartilhado/calendario.js';
import { GRADE_CENTRO } from '../../compartilhado/disponibilidade.js';
import { normalizarChaveUnidade, UNIDADES_INSTITUCIONAIS } from '../../unidades/catalogoUnidades.js';

export const POLITICA_CANCELAMENTO = Object.freeze({ versao: 'local-calendario-util-v2', minutosMinimos: 48 * 60, horasAtestado: 72 });
export const HORAS_AGENDAMENTO = Object.freeze(['07:00','08:00','09:00','10:00','11:00','14:00','15:00','16:00','17:00','18:00']);
const unidades = UNIDADES_INSTITUCIONAIS.map(u => u.id);
const lista = (valor, permitidos, nome) => {
    if (!Array.isArray(valor) || valor.some(v => !permitidos.includes(v))) throw new Error('Seleção inválida: '+nome+'.');
    return [...new Set(valor)];
};
export function normalizarPreferenciasAutomaticas(valor, registros = []) {
    if (!valor || !['A','B'].includes(valor.categoria)) throw new Error('Selecione a categoria.');
    const p = { categoria: valor.categoria,
        unidades: lista((valor.unidades || []).map(normalizarChaveUnidade), unidades, 'unidades'),
        dias: lista(valor.dias || [], [1,2,3,4,5,6], 'dias'),
        horarios: lista(valor.horarios || [], HORAS_AGENDAMENTO, 'horários'),
        quantidade: Number(valor.quantidade) };
    if (!p.unidades.length || !p.dias.length || !p.horarios.length) throw new Error('Selecione ao menos uma unidade, um dia e um horário.');
    if (!Number.isSafeInteger(p.quantidade) || p.quantidade < 1 || p.quantidade > 1000) throw new Error('Informe uma quantidade válida de aulas.');
    const recursos = registros.filter(r => p.unidades.includes(normalizarChaveUnidade(r.unidade)) && r.ativo === true && r.disponivel !== false);
    p.instrutores = lista(valor.instrutores || [], recursos.filter(r => r.tipo === 'instrutor' && r.categorias?.includes(p.categoria)).map(r => r.id), 'instrutores');
    p.veiculos = lista(valor.veiculos || [], recursos.filter(r => r.tipo === 'veiculo' && r.categoria === p.categoria).map(r => r.id), 'veículos');
    return p;
}

// Proposta sem gravação. Ordem: data, hora, ordem das unidades escolhidas, IDs dos recursos.
// O horizonte explícito evita prometer uma busca infinita ou uma rotina de servidor.
export async function gerarPropostaAutomatica(dados, valor, calcular, { agora = agoraBrasil(), horizonteDias = 90 } = {}) {
    const p = normalizarPreferenciasAutomaticas(valor, dados.registros);
    const saldo = dados.resumo.categorias[p.categoria]?.disponiveis;
    if (!Number.isFinite(saldo) || p.quantidade > saldo) throw new Error('Quantidade superior ao saldo disponível da categoria.');
    if (!Number.isInteger(horizonteDias) || horizonteDias < 1 || horizonteDias > 366) throw new Error('Período de busca inválido.');
    const snapshot = { ...dados, aulas: [...dados.aulas], registros: [...dados.registros] }, aulas = [];
    for (let d = 0; d < horizonteDias && aulas.length < p.quantidade; d++) {
        const data = somarDias(agora.slice(0,10), d);
        if (!p.dias.includes(diaSemana(data))) continue;
        const candidatos = [];
        for (const [ordem, unidade] of p.unidades.entries()) {
            for (const h of await calcular(snapshot, { categoria:p.categoria, unidade, data }, agora)) {
                if (!p.horarios.includes(h.hora)) continue;
                const pares = h.pares.filter(par => (!p.instrutores.length || p.instrutores.includes(par.instrutorId)) && (!p.veiculos.length || p.veiculos.includes(par.veiculoId)))
                    .sort((a,b) => a.instrutorId.localeCompare(b.instrutorId) || a.veiculoId.localeCompare(b.veiculoId));
                if (pares.length) candidatos.push({ data, hora:h.hora, fim:h.fim, unidade, ordem, ...pares[0] });
            }
        }
        candidatos.sort((a,b) => a.hora.localeCompare(b.hora) || a.ordem-b.ordem);
        for (const c of candidatos) {
            if (aulas.length >= p.quantidade) break;
            const livre = (await calcular(snapshot, { categoria:p.categoria, unidade:c.unidade, data }, agora)).some(h => h.hora === c.hora && h.pares.some(par => par.instrutorId === c.instrutorId && par.veiculoId === c.veiculoId));
            if (!livre) continue;
            aulas.push({ data, hora:c.hora, unidade:c.unidade, instrutorId:c.instrutorId, veiculoId:c.veiculoId });
            const aula = { id:'proposta-'+aulas.length, tipo:'aula', aluno:dados.aluno.id, status:1, categoria:p.categoria, unidade:c.unidade, instrutor:c.instrutorId, veiculo:c.veiculoId, inicio:data+'T'+c.hora+':00-03:00', fim:data+'T'+c.fim+':00-03:00' };
            snapshot.aulas.push(aula); snapshot.registros.push(aula);
        }
    }
    return { categoria:p.categoria, solicitadas:p.quantidade, aulas, horizonteDias, geradaEm:new Date().toISOString(), reservada:false };
}

// Política exclusiva de cancelamento. Não usa a grade de aulas nem bloqueios de recursos.
// Precisão em milissegundos; as fronteiras civis são convertidas com Intl no
// fuso America/Sao_Paulo, independentemente do fuso configurado no navegador.
function instanteCivilBrasil(dia,hora) {
    const alvo=Date.parse(dia+'T'+hora+'Z');let instante=alvo;
    for(let i=0;i<4;i++){
        const representado=Date.parse(agoraBrasil(new Date(instante))+'Z'),ajuste=alvo-representado;
        if(!ajuste)return instante;instante+=ajuste;
    }
    return instante;
}
export function calcularPrazoCancelamento(aula, registros = [], instante = new Date(), politica = POLITICA_CANCELAMENTO) {
    const agora = new Date(instante).getTime(), inicio = Date.parse(aula.inicio), limiar = politica.minutosMinimos * 60000;
    if (!Number.isFinite(agora) || !Number.isFinite(inicio) || !Number.isSafeInteger(limiar) || limiar <= 0) throw new Error('Dados inválidos para calcular o prazo de cancelamento.');
    const recursos = registros.filter(r => ['instrutor','veiculo'].includes(r.tipo) && normalizarChaveUnidade(r.unidade) === normalizarChaveUnidade(aula.unidade));
    let uteis = 0, dia = agoraBrasil(new Date(agora)).slice(0,10);
    while (instanteCivilBrasil(dia,'00:00:00') < inicio && uteis < limiar) {
        const semana = diaSemana(dia);
        const feriado = [...feriadosBrasileiros(Number(dia.slice(0,4))), ...GRADE_CENTRO.feriadosLocais].some(f => f.data === dia && (f.tipo === 'nacional' || f.tipo === 'local' || (f.tipo === 'religioso' && GRADE_CENTRO.paixaoFechada))) || recursos.some(r => (r.feriadosUnidade || []).includes(dia));
        if (semana !== 0 && !feriado) {
            const comeco = instanteCivilBrasil(dia,semana === 6?'00:01:00':'00:00:00');
            const termino = semana === 6 ? instanteCivilBrasil(dia,'12:00:00') : instanteCivilBrasil(somarDias(dia,1),'00:00:00');
            uteis += Math.max(0, Math.min(inicio,termino)-Math.max(agora,comeco));
        }
        dia = somarDias(dia,1);
    }
    return { versaoPolitica:politica.versao, minutosMinimos:politica.minutosMinimos, milissegundosUteis:Math.min(uteis,limiar), minutosUteis:Math.min(uteis,limiar)/60000, dentroPrazo:uteis >= limiar, semConsumoOriginal:[3,4].includes(aula.status) && inicio <= agora };
}

export const MOTIVOS_CANCELAMENTO = Object.freeze([
    { id:'familiar', nome:'Imprevisto familiar' }, { id:'trabalho', nome:'Imprevisto no trabalho' },
    { id:'pessoal', nome:'Motivos pessoais' }, { id:'profissional', nome:'Compromisso profissional' },
    { id:'saude', nome:'Motivos de saúde' }, { id:'transporte', nome:'Problemas de transporte' }, { id:'outro', nome:'Outros' }
]);
export function identificarMotivo(valor) {
    const aliases = { 'Outro motivo':'outro', 'Por motivos de trabalho':'profissional', 'Problema de locomoção':'transporte', 'Conflito de horário':'outro' };
    return MOTIVOS_CANCELAMENTO.find(m => m.id === valor || m.nome === valor || m.id === aliases[valor]);
}
export function criarCancelamento(aula, registros, motivo, aceite, instante = new Date()) {
    const m = identificarMotivo(motivo);
    if (!m) throw new Error('Selecione o motivo do cancelamento para continuar.');
    const prazo = calcularPrazoCancelamento(aula,registros,instante);
    if (!prazo.dentroPrazo && !prazo.semConsumoOriginal && aceite !== true) throw new Error('Confirme explicitamente que compreendeu a retenção do crédito.');
    const em = new Date(instante).toISOString();
    return { ...prazo, em, motivoId:m.id, credito:prazo.semConsumoOriginal?'nao_consumido':prazo.dentroPrazo?'devolvido':'retido', frequencia:prazo.dentroPrazo||prazo.semConsumoOriginal?'cancelada':m.id==='saude'?'justificativa_pendente':'falta',
        justificativa:!prazo.dentroPrazo && !prazo.semConsumoOriginal && m.id === 'saude' ? { estado:'aguardando_apresentacao', prazoApresentacao:new Date(Date.parse(em)+POLITICA_CANCELAMENTO.horasAtestado*3600000).toISOString(), resultado:null } : null };
}

export function normalizarAntecipacao(valor) {
    if (!valor || typeof valor.ativo !== 'boolean' || typeof valor.notificacoes !== 'boolean') throw new Error('Informe as preferências de antecipação.');
    const observacoes = String(valor.observacoes || '').trim();
    if (observacoes.length > 240) throw new Error('Use no máximo 240 caracteres nas observações.');
    return { ativo:valor.ativo, notificacoes:valor.notificacoes, categorias:lista(valor.categorias || [],['A','B'],'categorias'), unidades:lista((valor.unidades || []).map(normalizarChaveUnidade),unidades,'unidades'), dias:lista(valor.dias || [],[1,2,3,4,5,6],'dias'), horarios:lista(valor.horarios || [],HORAS_AGENDAMENTO,'horários'), observacoes };
}

// Disponibilidade de interesse, independente de reservas e de recursos livres.
export function horariosAntecipacao(dia){
    if(!Number.isInteger(dia)||dia<1||dia>6)throw new Error('Dia de disponibilidade inválido.');
    return (dia===6?GRADE_CENTRO.sabado:GRADE_CENTRO.semana).map(h=>String(h).padStart(2,'0')+':00');
}
export function normalizarDisponibilidadeAntecipacao(valor,ativa=false){
    if(!valor||typeof valor!=='object'||Array.isArray(valor)||Object.keys(valor).some(d=>!['1','2','3','4','5','6'].includes(d)))throw new Error('Informe dias e horários válidos para antecipação.');
    const normalizado=Object.fromEntries([1,2,3,4,5,6].map(d=>{
        const horas=valor[d]||[];
        if(!Array.isArray(horas)||horas.some(h=>!horariosAntecipacao(d).includes(h)))throw new Error('Selecione apenas horários da grade de cada dia.');
        return [d,[...new Set(horas)].sort()];
    }));
    if(ativa&&!Object.values(normalizado).some(h=>h.length))throw new Error('Selecione pelo menos um dia com um horário disponível.');
    return normalizado;
}
