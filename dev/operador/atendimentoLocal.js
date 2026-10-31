import {regularizarCarrosDeTeste} from './compatibilidadeCarro.js';
import {auditarDiferencas} from '../../shared/js/auditoria.js';
import {prepararOnibusTemporario} from './onibusTemporario.js';
import {demonstracaoSolicitada,enderecoSemDemonstracao} from './modoDemonstracao.js';
import {repositorioDemo,CHAVE_DEMO} from './repositorioDemo.js';
import {servicoOperador} from '../../nivel-1-operador/js/servicoOperador.js';
import {montarUnidade} from '../../nivel-1-operador/js/components/unidadeOperador.js';
import {UNIDADES,unidade} from '../../nivel-1-operador/js/dominioOperador.js';
import {prepararRedefinicaoAlunoLocal,prepararAcessoAluno,resumirSegredo} from '../aluno/contaRecepcao.js';
import {prepararCenarioAgenda} from './cenarioAgenda.js';
import {criarPoliticaCpfLocal} from './politicaCpf.js';
import {exigirPerfil,sair,transacaoAdministrativaEmCurso,exigirPersistenciaEstavel} from '../autenticacao.js';

// Adaptador de laboratório: nunca lê sessão, token, API ou armazenamento de Aluno.
// O parâmetro de unidade escolhe uma identidade FICTÍCIA de teste, exclusivamente
// no loopback explícito. Não é claim, role ou autorização do ambiente integrado.
export async function iniciarAtendimentoLocal(raiz,template,endereco) {
    const conta=await exigirPerfil('operador'),u=conta.unidade;
    endereco=new URL('/nivel-1-operador/html/operador-cfc.html?demo=1',location.href).href;
    const identidade=Object.freeze({id:conta.id,perfil:'operador',perfilConta:conta.perfilConta,painel:'operador',nivel:1,nome:conta.nome,unidade:u,permissoes:Object.freeze(conta.permissoes)});
    const storage=window.localStorage,repo=repositorioDemo(endereco,storage);
    // Impede que um snapshot incompatível seja substituído por fixtures. A leitura
    // antiga tolerante continua disponível para consumidores legados do repositório.
    const adaptador={
        async ler(){
            await exigirPerfil('operador');
            // Uma instalação nova começa vazia. Não executar criarDadosDemo():
            // cadastro não pode conceder saldos ou gerar aulas automaticamente.
            if(!storage.getItem(CHAVE_DEMO))return {versao:2,alunos:[],recursos:[],aulas:[]};
            const atual=repo.carregar();if(repo.aviso)throw new Error('Dados locais incompatíveis ou indisponíveis. Nenhum registro foi alterado.');return atual;
        },
        async alterar(transformar){
            await exigirPerfil('operador');
            if(!navigator.locks)throw new Error('Este navegador não oferece bloqueio seguro de escrita local. Utilize Edge ou Chrome atualizado.');
            const gravar=async()=>{exigirPersistenciaEstavel();
                const atual=await adaptador.ler(),proximo=await transformar(structuredClone(atual));
                if(!repo.salvar(auditarDiferencas(atual,proximo,identidade)))throw new Error('Não foi possível persistir os dados. A operação não foi confirmada.');
            };return transacaoAdministrativaEmCurso()?gravar():navigator.locks.request(CHAVE_DEMO,gravar);
        }
    };
    const inicial=await adaptador.ler();
    if(regularizarCarrosDeTeste(inicial,identidade)!==inicial)await adaptador.alterar(e=>regularizarCarrosDeTeste(e,identidade));
    const servico=servicoOperador(adaptador,identidade,{prepararRedefinicao:prepararRedefinicaoAlunoLocal,prepararAcesso:prepararAcessoAluno,hashPedido:resumirSegredo,cadastrarInstrutor:async transformar=>(await import('../autenticacao.js')).cadastrarInstrutor(adaptador.alterar,transformar),politicaCpfLocal:criarPoliticaCpfLocal(endereco)});
    const ui=await montarUnidade(raiz,template,servico,{sair:async()=>{await sair();location.replace('/login.html');}});
    if(identidade.permissoes.includes('antecipar')){const host=ui.registrarSecao('antecipacao','Antecipa\u00e7\u00e3o de aulas');raiz.querySelector('[data-op-nav=antecipacao]').addEventListener('click',async()=>{try{await (await import('../../shared/components/antecipacaoPainel.js')).montarAntecipacaoPainel(host,servico,raiz);}catch(e){host.textContent=e.message;}});}
}
