import { demonstracaoSolicitada } from "./modoDemonstracao.js";
import { criarDadosDemo } from "./dadosDemo.js";
import { STATUS_EXAME, TIPOS_EXAME } from "../../nivel-1-operador/js/exames.js";
import { dataValida } from "../../shared/js/calendario.js";
import { obterUnidadeInstitucional } from "../../shared/js/catalogoUnidades.js";
export const CHAVE_DEMO = "sipa.operador.demo.v2";
const unidadeValida = valor => valor === 'Centro' || !!obterUnidadeInstitucional(valor);
// A exclusão lógica conserva o vínculo, mas remove o segredo. Isso não torna
// inválido o snapshot; contas ativas continuam exigindo hash e salt completos.
const credencialValida=c=>/^[a-f0-9]{64}$/.test(c.hash)&&/^[a-f0-9]{48}$/.test(c.sal);
const contaArquivada=c=>c.ativa===false&&typeof c.excluidoEm==='string'&&Number.isFinite(Date.parse(c.excluidoEm))&&typeof c.excluidoPor==='string'&&!!c.excluidoPor&&!Object.hasOwn(c,'hash')&&!Object.hasOwn(c,'sal');
function validar(estado) {
    if (estado?.versao !== 2 || !Array.isArray(estado.alunos) || estado.alunos.length > 500 || !Array.isArray(estado.aulas) || !Array.isArray(estado.recursos)) return false;
    if(estado.contasAlunos){
        if(!Array.isArray(estado.contasAlunos)||!estado.contasAlunos.every(c=>typeof c.id==='string'&&c.perfil==='ALUNO'&&/^\d{11}$/.test(c.login)&&(credencialValida(c)||contaArquivada(c))&&estado.alunos.some(a=>a.id===c.alunoId&&a.contaId===c.id&&a.cpf===c.login)))return false;
        for(const campo of ['id','login','alunoId'])if(new Set(estado.contasAlunos.map(c=>c[campo])).size!==estado.contasAlunos.length)return false;
    }
    return estado.alunos.every(a => unidadeValida(a.unidade) && (!a.unidadePrincipal || unidadeValida(a.unidadePrincipal)) && (!a.unidadeCarro || unidadeValida(a.unidadeCarro)) && typeof a.id === "string" && typeof a.nome === "string" && /^\d{11}$/.test(a.cpf)
        && ["A", "B", "D", "AB"].includes(a.categoria) && ["Pendente", "Regular", "Em atraso"].includes(a.financeiro)
        && Number.isInteger(a.aulas) && a.aulas >= 0 && Array.isArray(a.historico)
        && Object.keys(TIPOS_EXAME).every(t => STATUS_EXAME.includes(a.exames?.[t]?.status) && (!a.exames[t].data || dataValida(a.exames[t].data))))
        && new Set(estado.alunos.map(a => a.id)).size === estado.alunos.length
        && estado.recursos.every(r => unidadeValida(r.unidade) && typeof r.nome === "string")
        && estado.aulas.every(a => unidadeValida(a.unidade) && dataValida(a.data) && /^\d{2}:\d{2}$/.test(a.inicio) && /^\d{2}:\d{2}$/.test(a.fim) && [1, 2, 3, 4, 5, 6].includes(a.status));
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
