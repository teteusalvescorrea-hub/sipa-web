import {contaAlunoAutorizada,validarRedefinicaoAluno,registrarRedefinicaoAluno} from '../../shared/js/redefinicaoAluno.js';
import {cadastroSemHistoriaMedicaAlheia,podeConsultarAdministrativoAluno,aulaSemAdministracaoAlheia,exigirAdministrativoAluno,vinculoAdministrativoAluno} from '../../shared/js/escopoAlunoAdministrativo.js';
import {criarServicoAntecipacao} from '../../shared/js/servicoAntecipacao.js';
import {validarAtestado,solicitarMedico} from '../../shared/js/solicitacoesMedicas.js';
import {periodoDesempenho,desempenhoInstrutor} from '../../shared/js/desempenhoInstrutor.js';
import {consultarSolicitacoesMedicas,obterSolicitacaoMedica,encaminharSolicitacaoMedica} from './solicitacoesOperador.js';
import {localCarro} from '../../shared/js/operacaoCarro.js';
import * as regras from './dominioOperador.js';
import {resumirCreditosRecepcao} from '../../aluno/js/domain/creditosRecepcao.js';
import { atualizarExame } from './exames.js';
import {editarCadastro,salvarExamesFicha,movimentarProva,linhaTempoAluno,provasDoAluno} from './fichaOperador.js';
// Porta de dados: ler() e alterar(transformacao) pertencem ao adaptador. Uma API
// futura deve obter a identidade no servidor, filtrar consultas e autorizar cada
// comando; nunca receber do navegador uma unidade arbitrária como autorização.
export function servicoOperador(adaptador, identidade, {prepararRedefinicao,prepararAcesso,hashPedido,prepararCenarioAgenda,politicaCpfLocal,cadastrarInstrutor} = {}) {
    regras.autorizar(identidade, 'consultar');
    const executar = (transformar) => adaptador.alterar(estado => transformar(estado));
    return Object.freeze({
        ...criarServicoAntecipacao(adaptador,identidade),
        identidade,
        async detalhesInstrutor(id,consulta={}){
            const e=await adaptador.ler(),instrutor=regras.recursoAdministrativo(e,identidade,id);
            if(instrutor.tipo!=='Instrutores')throw new Error('Cadastro não corresponde a um instrutor.');
            const agora=new Date(),periodo=periodoDesempenho(consulta.modo||'hoje',consulta,agora),resumo=desempenhoInstrutor(e.aulas,id,periodo,agora);
            return {instrutor,periodo,...resumo,total:desempenhoInstrutor(e.aulas,id,{inicio:'1900-01-01',fim:agora.toLocaleDateString('sv-SE',{timeZone:'America/Sao_Paulo'})},agora).concluidas,totais:Object.fromEntries(['hoje','semana','mes'].map(m=>{const r=desempenhoInstrutor(e.aulas,id,periodoDesempenho(m,{},agora),agora);return [m,{concluidas:r.concluidas,presencas:r.presencas,faltas:r.faltas}];})),historico:resumo.historico.map(a=>({id:a.id,instrutorId:a.instrutorId,veiculoId:a.veiculoId,data:a.data,inicio:a.inicio,fim:a.fim,categoria:a.categoria,unidade:a.unidade,status:a.status,registradoPor:(a.historico||[]).findLast(h=>h.status===a.status)?.autor||(a.historico||[]).findLast(h=>h.status===a.status)?.responsavel,alunoNome:e.alunos.find(s=>s.id===a.alunoId)?.nome||'Aluno não informado',veiculoNome:e.recursos.find(v=>v.id===a.veiculoId)?.nome||'Não informado'})),veiculos:e.recursos.filter(v=>v.tipo==='Veículos'&&(v.instrutorId?v.instrutorId===id:instrutor.veiculoIds?.includes(v.id))).map(v=>({id:v.id,nome:v.nome,placa:v.placa,categoria:v.categoria}))};
        },
        validarCadastro:(dados,alunos)=>regras.validarCadastroAluno(dados,identidade,alunos,new Date(),politicaCpfLocal?.validar),
        ...(prepararCenarioAgenda?{criarCenarioAgenda:()=>executar(e=>prepararCenarioAgenda(e,identidade))}:{}),
        async alunosAgendaveis(data,inicio,par){
            const e=await adaptador.ler();
            regras.autorizar(identidade,'consultar');
            return e.alunos.filter(a=>regras.vinculo(a,identidade)).flatMap(a=>{
                try{regras.agendarAula(e,identidade,{...par,alunoId:a.id,data,inicio},'consulta-'+crypto.randomUUID());}
                catch{return [];}
                const resumo=resumirCreditosRecepcao(a,e.aulas.filter(x=>x.alunoId===a.id).map(x=>({...x,inicio:x.data+'T'+x.inicio+':00-03:00'}))).categorias[par.categoria];
                return [{id:a.id,nome:a.nome,...(regras.vinculo(a,identidade)==='cadastro'?{cpf:a.cpf}:{}),categoria:a.categoria,tipoCambio:a.tipoCambio,unidadeCarro:a.unidadeCarro,localAula:par.categoria==='B'?localCarro(a,data)?.nome:null,unidadeAulas:regras.destinoNovasAulas(a,par.categoria),saldo:resumo?.disponiveis??a.aulas,agendadas:resumo?.reservadas??0}];
            });
        },
        async solicitarAtestadoRecepcao({aulaId,arquivo,observacoes='',operacaoId}){
            let uploadNovo=false;
            const {guardarAtestado,descartarUploadNaoSalvo}=await import('../../dev/aluno/documentosMedicos.js');
            try{return await executar(async e=>{
                regras.autorizar(identidade,'verificar');const a=regras.aulaOperavel(e,identidade,aulaId);if(a.status===1)regras.autorizar(identidade,'cancelar-aula');
                const aluno=regras.alunoAutorizado(e,identidade,a.alunoId);if(regras.principal(aluno)!==regras.unidade(identidade.unidade))throw new Error('Atestados devem ser enviados ? recep??o da unidade principal do aluno.');const meta=await validarAtestado(arquivo),nova=solicitarMedico(aluno,a,e.recursos.map(r=>({...r,tipo:r.tipo==='Instrutores'?'instrutor':'veiculo'})),{id:operacaoId,documento:{...meta,id:operacaoId},observacoes});
                if(nova===a)return e;
                nova.cancelamento={...nova.cancelamento,responsavel:a.cancelamento?.responsavel||identidade.id,origem:a.cancelamento?.origem||'recepcao'};
                const evento=nova.solicitacaoMedica.eventos.at(-1);evento.responsavel=identidade.id;evento.acao='Atestado anexado pela recepção; crédito retido para decisão da gerência.';nova.historico.at(-1).responsavel=identidade.id;
                await guardarAtestado({id:operacaoId,alunoId:aluno.id,arquivo,hash:meta.hash});uploadNovo=true;
                return {...e,aulas:e.aulas.map(x=>x.id===aulaId?nova:x)};
            });}catch(e){if(uploadNovo)await descartarUploadNaoSalvo(operacaoId);throw e;}
        },
        detalhesAgendamento:async id=>{const e=await adaptador.ler(),r=regras.detalhesAgendamento(e,identidade,id),a=e.aulas.find(a=>a.id===id);return {...r,aula:aulaSemAdministracaoAlheia(e,identidade,r.aula,a)};},
        solicitacaoMedica:async id=>obterSolicitacaoMedica(await adaptador.ler(),identidade,id),
        async consultarPendenciasAdministrativas(){const e=await adaptador.ler();regras.autorizar(identidade,'consultar');return (e.excecoesAgenda||[]).filter(p=>podeConsultarAdministrativoAluno(e,identidade,p)).map(p=>({...structuredClone(p),unidadeBaseAdministrativa:vinculoAdministrativoAluno(e,p).unidadeBase,vinculoAdministrativoInconsistente:vinculoAdministrativoAluno(e,p).inconsistencia}));},
        cancelarAula:(id,dados)=>executar(e=>regras.cancelarAulaRecepcao(e,identidade,id,dados)),
        registrarFrequencia:(id,status,motivo)=>executar(e=>regras.registrarFrequenciaRecepcao(e,identidade,id,status,motivo)),
        instrutoresParaVeiculo:async categoria=>regras.instrutoresParaVeiculo(await adaptador.ler(),identidade,categoria),
        instrutoresParaCarro:async()=>regras.instrutoresParaCarro(await adaptador.ler(),identidade),
        recursoAdministrativo:async id=>regras.recursoAdministrativo(await adaptador.ler(),identidade,id),
        editarVeiculo:(id,dados)=>executar(e=>regras.editarVeiculo(e,identidade,id,dados)),
        async consultar() {
            const e=await adaptador.ler();
            const recursos=regras.consultarRecursos(e,identidade),ids=new Set(recursos.map(r=>r.id));
            return {agendaMotos:regras.consultarAgendaMotos(e,identidade),agendaOnibus:regras.consultarAgendaOnibus(e,identidade),solicitacoesMedicas:consultarSolicitacoesMedicas(e,identidade),alunos:regras.consultarAlunos(e,identidade).map(a=>cadastroSemHistoriaMedicaAlheia(e,identidade,a)), cadastrosRecursos:regras.consultarCadastrosRecursos(e,identidade),recursos:recursos.map(r=>Object.fromEntries(['id','nome','tipo','categoria','categorias','unidade','ativo','disponivel','veiculoIds','instrutorId','horarioAlmoco','intervaloAlmoco','disponibilidade','disponibilidadeSemanal','bloqueios','bloqueiosUnidade','datasBloqueadas','feriadosUnidade','operacoesCarro','tipoCambio','temporarioOnibus',...(r.tipo==='Veículos'?['placa','identificacao','modelo']:[])].filter(k=>Object.hasOwn(r,k)).map(k=>[k,structuredClone(r[k])]))), aulas:regras.consultarAgenda({...e,aulas:e.aulas.map(a=>aulaSemAdministracaoAlheia(e,identidade,a))},identidade),
                // Apenas ocupação dos próprios recursos, sem identidade de aluno,
                // unidade externa ou ID de reserva de terceiros.
                ocupacoes:e.aulas.filter(a=>a.categoria==='D'||ids.has(a.instrutorId)||ids.has(a.veiculoId)).map(a=>({categoria:a.categoria,data:a.data,inicio:a.inicio,fim:a.fim,status:a.status,instrutorId:ids.has(a.instrutorId)?a.instrutorId:undefined,veiculoId:ids.has(a.veiculoId)?a.veiculoId:undefined})),
                pista:e.alunos.filter(a=>regras.vinculo(a,identidade)==='pista').map(a=>({id:a.id,nome:a.nome,categoria:a.categoria}))};
        },
        async documentoMedico(id){
            const {solicitacao,aula}=obterSolicitacaoMedica(await adaptador.ler(),identidade,id);
            const {lerAtestado}=await import('../../dev/aluno/documentosMedicos.js');
            const d=await lerAtestado(solicitacao.documento.id);
            if(!d||d.alunoId!==aula.alunoId||d.hash!==solicitacao.documento.hash)throw new Error('Documento original não disponível neste navegador.');
            return d.arquivo;
        },
        encaminharSolicitacaoMedica:(id,parecer)=>executar(async e=>{
            regras.autorizar(identidade,'verificar');const {solicitacao,aula}=obterSolicitacaoMedica(e,identidade,id);exigirAdministrativoAluno(e,identidade,aula);
            const {lerAtestado}=await import('../../dev/aluno/documentosMedicos.js');const d=await lerAtestado(solicitacao.documento.id);
            if(!d||d.alunoId!==aula.alunoId||d.hash!==solicitacao.documento.hash)throw new Error('Documento original indisponível. Encaminhamento bloqueado.');
            return encaminharSolicitacaoMedica(e,identidade,id,parecer);
        }),
        async acessoAluno(id){
            const {aluno,conta,unidadeBase}=contaAlunoAutorizada(await adaptador.ler(),identidade,id);
            return {nome:aluno.nome,cpf:aluno.cpf,unidadeBase,possuiConta:!!conta,ativa:!!conta?.ativa,trocaObrigatoria:!!conta&&(conta.trocaObrigatoria!==false||!conta.ativadaEm),ultimaRedefinicao:conta?.redefinidaEm||null};
        },
        redefinirSenhaAluno:async(id,dados)=>{let acessoCriado=false;await executar(async e=>{
            const {aluno,conta}=contaAlunoAutorizada(e,identidade,id);validarRedefinicaoAluno(dados);
            if(conta&&!conta.ativa)throw new Error('Conta desativada. Solicite atendimento ao Master.');
            if(!prepararRedefinicao||!conta&&!prepararAcesso)throw new Error('Redefinicao indisponivel: integracao autenticada pendente.');
            const base=conta||await prepararAcesso(aluno.id,aluno.cpf);
            const segredo=await prepararRedefinicao(base,{justificativa:dados.justificativa});
            const credencial=conta?segredo:{...base,...segredo};
            acessoCriado=!conta;
            return registrarRedefinicaoAluno(e,identidade,id,dados,credencial);
        });return {acessoCriado};},
        async ficha(id) {
            const e=await adaptador.ler(), a=cadastroSemHistoriaMedicaAlheia(e,identidade,regras.alunoAutorizado(e,identidade,id));
            const aulas=e.aulas.filter(x=>x.alunoId===id).map(x=>({...aulaSemAdministracaoAlheia(e,identidade,x),instrutorNome:e.recursos.find(r=>r.id===x.instrutorId)?.nome||'Não informado',veiculoNome:e.recursos.find(r=>r.id===x.veiculoId)?.nome||'Não informado'}));
            const resumoLiberacao=resumirCreditosRecepcao(a,aulas.map(x=>({...x,inicio:x.data+'T'+x.inicio+':00-03:00'})));
            return {aluno:structuredClone(a),tentativas:provasDoAluno(a),linhaTempo:linhaTempoAluno(a,aulas),resumoAulas:regras.resumoAulasAluno(e,a),resumoLiberacao, creditos:Object.fromEntries(['A','B','D'].map(c=>[c,regras.resumoCreditos(e,a,c)])),aulas};
        },
        async cadastrar(dados,solicitacaoId=crypto.randomUUID()) {
            regras.autorizar(identidade,'cadastrar');
            if(!prepararAcesso||!hashPedido)throw new Error('Criação de acesso indisponível. Nenhum cadastro foi salvo.');
            const alunoId=crypto.randomUUID(),assinatura=await hashPedido(JSON.stringify(dados)),acesso=await prepararAcesso(alunoId,String(dados.cpf||'').replace(/\D/g,''));
            return executar(e=>{
                const anterior=e.cadastrosConfirmados?.[solicitacaoId];
                if(anterior){if(anterior.assinatura!==assinatura||anterior.operadorId!==identidade.id)throw new Error('Solicitação já utilizada para outro cadastro.');return e;}
                const novo=regras.cadastrarAluno(e,identidade,dados,alunoId,new Date(),politicaCpfLocal?.validar);
                if((e.contasAlunos||[]).some(c=>c.login===acesso.login||c.alunoId===alunoId))throw new Error('Já existe uma conta local para este CPF. Nenhum cadastro foi salvo.');
                const aluno=novo.alunos.find(a=>a.id===alunoId);aluno.contaId=acesso.id;aluno.acesso='Conta criada · primeiro acesso pendente';
                aluno.historico.push({tipo:'acesso-local',em:acesso.criadaEm,responsavel:identidade.id,depois:'Conta vinculada. Alteração de senha obrigatória no primeiro acesso.'});
                return {...novo,contasAlunos:[...(e.contasAlunos||[]),acesso],cadastrosConfirmados:{...e.cadastrosConfirmados,[solicitacaoId]:{alunoId,contaId:acesso.id,assinatura,operadorId:identidade.id}}};
            });
        },
        verificar:(id,tipo,dados)=>executar(e=>regras.registrarEtapa(e,identidade,id,tipo,dados)),
        editarInstrutor:(id,dados)=>executar(e=>regras.editarInstrutor(e,identidade,id,dados)),
        cadastrarRecurso:dados=>{const id=crypto.randomUUID(),transformar=e=>regras.cadastrarRecurso(e,identidade,dados,id);return dados.tipo==='Instrutores'&&cadastrarInstrutor?cadastrarInstrutor(transformar):executar(transformar);},
        editarCadastro:(id,dados)=>{const eventoId=crypto.randomUUID();return executar(e=>editarCadastro(e,identidade,id,dados,eventoId,new Date(),politicaCpfLocal?.validar));},
        salvarExames:(id,dados)=>{const eventoId=crypto.randomUUID();return executar(e=>salvarExamesFicha(e,identidade,id,dados,eventoId));},
        movimentarProva:(id,dados,eventoId=crypto.randomUUID())=>executar(e=>movimentarProva(e,identidade,id,dados,eventoId)),
        salvarAcompanhamento:(id,dados)=>executar(e=>regras.salvarAcompanhamento(e,identidade,id,dados)),
        async previa(id,para) { return regras.preverTransferencia(await adaptador.ler(),identidade,id,para); },
        transferir:(id,para,motivo,cancelar)=>executar(e=>regras.transferirAluno(e,identidade,id,para,motivo,cancelar)),
        async pares(data,hora,filtros) { return regras.paresNaUnidade(await adaptador.ler(),identidade,data,hora,filtros); },
        agendar:dados=>executar(e=>regras.agendarAula(e,identidade,dados,crypto.randomUUID())),
        exameLegado:(id,tipo,dados)=>executar(e=>{
            if(identidade.nivel!==2&&tipo==='teorica')throw new Error('Utilize o fluxo de tentativas; correções de provas são reservadas ao Nível 2.');
            regras.autorizar(identidade,'verificar'); const a=regras.alunoAutorizado(e,identidade,id);
            if(a.exames?.[tipo]?.origem==='oficial')throw new Error('Resultado oficial protegido.');
            if(!String(dados.fonte||'').trim())throw new Error('Informe a fonte da verificação manual.');
            const atualizado=atualizarExame(a,tipo,dados);
            atualizado.exames[tipo]={...atualizado.exames[tipo],origem:'manual-local',responsavel:identidade.id,fonte:String(dados.fonte).trim().slice(0,240)};
            atualizado.historico.at(-1).responsavel=identidade.id;
            atualizado.historico.at(-1).fonte=String(dados.fonte).trim().slice(0,240);
            return regras.substituir(e,atualizado);
        }),
        financeiro:(id,situacao,fonte)=>executar(e=>{
            regras.autorizar(identidade,'verificar'); const a=regras.alunoAutorizado(e,identidade,id);
            if(a.verificacaoFinanceira?.origem==='oficial')throw new Error('Resultado financeiro oficial protegido. Consulte a fonte autorizada.');
            if(!['Pendente','Regular','Em atraso'].includes(situacao)||!String(fonte).trim())throw new Error('Informe situação e fonte da informação manual.');
            const em=new Date().toISOString();
            return regras.substituir(e,{...a,financeiro:situacao,verificacaoFinanceira:{situacao,fonte:String(fonte).trim().slice(0,240),responsavel:identidade.id,em,origem:'manual-local'},historico:[...a.historico,{tipo:'financeiro',em,responsavel:identidade.id,depois:`${situacao}; fonte manual: ${String(fonte).trim().slice(0,240)}; sem consulta ao ICFC`}]});
        }),
        anotar:(id,texto)=>executar(e=>{
            regras.autorizar(identidade,'anotar'); const a=regras.alunoAutorizado(e,identidade,id);
            if(String(texto).length>2000)throw new Error('Use até 2000 caracteres nas observações.');
            return regras.substituir(e,{...a,observacoes:String(texto),historico:[...a.historico,{tipo:'observacoes',em:new Date().toISOString(),responsavel:identidade.id,depois:'Observações administrativas atualizadas.'}]});
        })
    });
}
