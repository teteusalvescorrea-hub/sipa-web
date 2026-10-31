import {apresentarDashboard} from '../../aluno/js/dashboard.js';
export async function iniciarDashboardLocal(servico) {
    const aviso=document.getElementById('dashboard-notice');aviso.hidden=true;aviso.className='dashboard-notice';
    let dados=await servico.dadosAlunoLocal();apresentarDashboard(dados);if(!dados.podeConfigurar)return;
    const sessao=await servico.sessao();
    if(sessao?.interface!=='aluno'||(!sessao.demonstracaoLivre&&sessao.identificador!=='00000000000')||(dados.aluno&&dados.aluno.documento!==sessao.identificador))throw new Error('Não foi possível confirmar o vínculo da conta de testes. Nenhum crédito foi alterado.');
    const config=document.createElement('details');config.className='dashboard-test-setup';config.id='configurar-creditos-teste';
    config.open=!dados.credito;
    const titulo=document.createElement('summary');titulo.textContent=dados.credito?'Créditos da minha conta de testes':'Configurar meus créditos locais — 20 moto + 20 carro';
    const identidade=document.createElement('p');identidade.className='test-account-summary';identidade.id='creditos-vinculo-local';
    const descricao=document.createElement('p');
    function diagnostico() {
        identidade.textContent=`Sessão local: CPF final ${sessao.identificador.slice(-4)} · ${dados.aluno?`${dados.aluno.nome} · cadastro ${dados.aluno.id} · unidade ${dados.aluno.unidade}`:'Nenhum cadastro de aluno vinculado a este CPF. A configuração criará somente esse vínculo.'}`;
        descricao.textContent=dados.credito?['A','B'].map(c=>{const s=dados.resumo.categorias[c];return `Categoria ${c}: ${s.total} iniciais, ${s.disponiveis??'a conferir'} disponíveis, ${s.reservadas} reservadas, ${s.realizadas} concluídas`;}).join('. ')+'. Saldo calculado pelo histórico; esta ação não reinicia créditos consumidos.':`Não há registro de créditos vinculado a esta conta. Login e seleção de ambiente não concedem créditos automaticamente. A ação abaixo grava 20 créditos iniciais de moto e 20 de carro no armazenamento deste navegador, preservando ${dados.aulas.length} registro(s) de aula. Reservas e aulas que consomem créditos serão descontadas do saldo disponível.`;
    }
    diagnostico();
    const botao=document.createElement('button');botao.type='button';botao.textContent=dados.credito?'Créditos já registrados — histórico preservado':'Configurar 20 créditos de moto e 20 de carro';botao.disabled=Boolean(dados.credito);
    const vincular=document.createElement('button');vincular.type='button';vincular.id='vincular-unidade-teste';
    function situacaoVinculo(){vincular.disabled=dados.aluno?.unidade==='Cobilândia';vincular.textContent=vincular.disabled?'Vínculo com Unidade Cobilândia configurado':'Vincular minha conta à Unidade Cobilândia';}
    situacaoVinculo();
    const retorno=document.createElement('p');retorno.role='status';retorno.setAttribute('aria-live','polite');config.append(titulo,identidade,descricao,botao,vincular,retorno);
    if(!vincular.disabled)config.open=true;
    vincular.onclick=async()=>{
        if(vincular.disabled)return;vincular.disabled=true;
        try {await servico.configurarUnidadeTeste();dados=await servico.dadosAlunoLocal();diagnostico();situacaoVinculo();retorno.textContent='Vínculo salvo: Unidade Cobilândia. Créditos e agendamentos preservados. Você pode escolher outra unidade para cada aula.';}
        catch(erro){retorno.textContent=erro.message||'Não foi possível salvar o vínculo.';vincular.disabled=false;}
    };
    document.querySelector('.summary-grid').after(config);
    botao.onclick=async()=>{
        if(botao.disabled)return;botao.disabled=true;
        try {const resultado=await servico.configurarCreditosTeste();dados=await servico.dadosAlunoLocal();apresentarDashboard(dados);diagnostico();situacaoVinculo();titulo.textContent='Créditos da minha conta de testes';retorno.textContent=resultado.aplicado?'Créditos gravados e disponíveis na mesma fonte usada por Agendar aula. O saldo respeita seu histórico; horários exigem recursos cadastrados.':'Configuração já aplicada; nenhum crédito foi duplicado.';botao.textContent='Créditos já registrados — histórico preservado';}
        catch(erro){retorno.textContent=erro.message||'Falha ao salvar a configuração local.';botao.disabled=false;}
    };
}
