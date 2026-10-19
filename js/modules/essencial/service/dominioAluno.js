import {UNIDADES_INSTITUCIONAIS,normalizarChaveUnidade,nomeUnidadeInstitucional} from '../../unidades/catalogoUnidades.js';
import {MOTIVOS_CANCELAMENTO} from './agendamentoAluno.js';
export const MOTIVOS_CANCELAMENTO_LOCAL=MOTIVOS_CANCELAMENTO.map(m=>m.nome);
export function resumirCreditos(credito, aulas = [], agora = Date.now()) {
    const categorias = Object.fromEntries(["A", "B"].map(categoria => [categoria, { total: credito?.categorias?.[categoria] || 0, disponiveis: 0, reservadas: 0, realizadas: 0, consumidas: 0 }]));
    let incompletas = 0;
    // Consumos já existentes preservados ao retirar históricos descartáveis.
    for(const item of credito?.consumosPreservadosLimpeza || []) {
        if(categorias[item.categoria]&&item.quantidade===1) categorias[item.categoria].consumidas++;
        else incompletas++;
    }
    const vistos = new Set();
    for (const aula of aulas) {
        if (vistos.has(aula.id)) continue; vistos.add(aula.id);
        const c = categorias[aula.categoria], status = aula.status, inicio = Date.parse(aula.inicio);
        if (!c || ![1, 2, 3, 4, 5, 6].includes(status) || !Number.isFinite(inicio)) { incompletas++; continue; }
        if (status === 5) c.realizadas++;
        if ([1, 3, 4].includes(status) && inicio > agora) c.reservadas++;
        if ([1, 5, 6].includes(status) || (status === 2 && aula.cancelamento?.credito === "retido") || ([3, 4].includes(status) && inicio > agora)) c.consumidas++;
    }
    for (const c of Object.values(categorias)) c.disponiveis = incompletas ? null : Math.max(0, c.total - c.consumidas);
    const total = Object.values(categorias).reduce((s, c) => s + c.total, 0), realizadas = Object.values(categorias).reduce((s, c) => s + c.realizadas, 0);
    return { categorias, incompletas, total, realizadas, percentual: total && realizadas && !incompletas ? Math.min(100, Math.round(realizadas * 100 / total)) : null };
}
// Apresentação por categoria reutiliza o mesmo domínio de consumo de créditos.
export function progressoPorCategoria(credito,aulas=[],agora=Date.now()){
    const resumo=resumirCreditos(credito,aulas,agora);
    for(const c of Object.values(resumo.categorias))c.percentual=c.total>0&&!resumo.incompletas?Math.min(100,Math.round(c.realizadas*100/c.total)):null;
    return resumo;
}
// Consulta pura sobre um snapshot local. A gravação reexecuta esta consulta sob
// o mesmo lock usado pelos demais escritores, nunca confia no horário do DOM.
// Mesmas seis unidades divulgadas nas páginas públicas. Não representam recursos disponíveis.
export const UNIDADES_LOCAIS = Object.freeze(UNIDADES_INSTITUCIONAIS.map(u=>u.id));
export const normalizarUnidadeLocal=normalizarChaveUnidade;
export const nomeUnidadeLocal=nomeUnidadeInstitucional;
