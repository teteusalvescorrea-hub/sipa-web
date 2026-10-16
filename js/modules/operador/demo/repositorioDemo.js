import { demonstracaoSolicitada } from "./modoDemonstracao.js";
import { criarDadosDemo } from "./dadosDemo.js";
import { STATUS_EXAME, TIPOS_EXAME } from "../exames.js";
import { dataValida } from "../calendario.js";
export const CHAVE_DEMO = "sipa.operador.demo.v2";
function validar(estado) {
    if (estado?.versao !== 2 || !Array.isArray(estado.alunos) || !estado.alunos.length || estado.alunos.length > 500 || !Array.isArray(estado.aulas) || !Array.isArray(estado.recursos)) return false;
    return estado.alunos.every(a => a.unidade === "Centro" && typeof a.id === "string" && typeof a.nome === "string" && /^\d{11}$/.test(a.cpf)
        && ["A", "B", "AB"].includes(a.categoria) && ["Pendente", "Regular", "Em atraso"].includes(a.financeiro)
        && Number.isInteger(a.aulas) && a.aulas >= 0 && Array.isArray(a.historico)
        && Object.keys(TIPOS_EXAME).every(t => STATUS_EXAME.includes(a.exames?.[t]?.status) && (!a.exames[t].data || dataValida(a.exames[t].data))))
        && new Set(estado.alunos.map(a => a.id)).size === estado.alunos.length
        && estado.recursos.every(r => r.unidade === "Centro" && typeof r.nome === "string")
        && estado.aulas.every(a => a.unidade === "Centro" && dataValida(a.data) && /^\d{2}:\d{2}$/.test(a.inicio) && /^\d{2}:\d{2}$/.test(a.fim) && [1, 2, 3, 4, 5, 6].includes(a.status));
}
// Não lê tokens, configuração da API ou chaves de outras telas. A chave não
// habilita a demonstração: o gate explícito de URL é obrigatório em cada acesso.
export function repositorioDemo(endereco, storage) {
    if (!demonstracaoSolicitada(endereco)) throw new Error("Armazenamento de demonstração restrito ao ambiente local explícito.");
    let aviso = "";
    return {
        carregar() {
            try {
                const bruto = storage.getItem(CHAVE_DEMO);
                if (bruto) { const dados = JSON.parse(bruto); if (validar(dados)) return dados; aviso = "Dados fictícios incompatíveis; cenário inicial carregado."; }
            } catch { aviso = "Armazenamento local indisponível ou inválido; alterações ficam apenas nesta sessão."; }
            return criarDadosDemo();
        },
        salvar(dados) {
            if (!validar(dados)) throw new Error("Dados de demonstração inválidos.");
            try { storage.setItem(CHAVE_DEMO, JSON.stringify(dados)); return true; } catch { return false; }
        },
        restaurar() { try { storage.removeItem(CHAVE_DEMO); } catch { /* sem armazenamento: reset em memória */ } return criarDadosDemo(); },
        get aviso() { return aviso; }
    };
}
