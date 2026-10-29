import {confirmarExclusao} from '../../../shared/components/excluirCadastro.js';
import {montarAcessoAluno} from './redefinirSenhaAluno.js';
import {montarDetalhesRecurso} from './detalhesRecurso.js';
import {gerirSituacaoRecurso} from '../../../shared/components/formularioAdministrativo.js';
import {abrirFichaInstrutor} from './fichaInstrutor.js';
import {montarVerificacoesMedicas} from './verificacoesMedicas.js';
import {CAMBIOS,nomeCambio,unidadeCarroPermitida} from '../../../shared/js/operacaoCarro.js';
import {montarReservaRecepcao} from './reservaRecepcao.js';
import {botaoCadastroRecurso,abrirFormularioInstrutor,abrirFormularioVeiculo} from './cadastroRecurso.js';
import {AVISO_ONIBUS,NOMES_CATEGORIA,LOCAIS_ONIBUS} from '../../../shared/js/categorias.js';
import {montarEdicaoCadastro,montarExamesProvas,montarProvasAgendadas,montarLinhaTempo} from './fichaEvolucao.js';
import {el,botao,campo,select,entrada,modal} from './uiOperador.js';
import {montarEstruturaOperador} from './painelOperador.js';
import {montarAgenda} from './agendaOperador.js';
import {criarDetalhesAula} from './aulaOperador.js';
import {UNIDADES,principal,carro,unidade,paresNaUnidade,destinoNovasAulas} from '../dominioOperador.js';
import {hojeBrasil,formatarData,agoraBrasil} from '../../../shared/js/calendario.js';
import {STATUS_AGENDAMENTO,fimDaAula,validarHorario} from '../../../shared/js/disponibilidade.js';
import {formatarCpf,ativarMascaraCpf} from '../../../shared/js/formatacao.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';

const nomeUnidade=u=>nomeUnidadeInstitucional(unidade(u));
const textoData=d=>d?formatarData(d):'Não informada';
const dataHora=d=>d?new Date(d).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não informado';
const badge=t=>el('span',t,'op-badge');
const situacaoCadastro=a=>a.situacao||(!a.nascimento||!a.email||!a.telefone?'Incompleto':'Pendente');
function campos(itens) {const dl=el('dl',undefined,'op-fields');for(const [k,v] of itens){const item=el('div');item.append(el('dt',k),el('dd',v==null||v===''?'Não informado':String(v)));dl.append(item);}return dl;}
function tabela(titulos,linhas,vazio='Nenhum registro disponível.') {
    const wrap=el('div',undefined,'op-table-scroll'), table=el('table',undefined,'op-table'),head=el('thead'),tr=el('tr'),body=el('tbody');
    wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',titulos.join(', '));
    titulos.forEach(t=>{const th=el('th',t);th.scope='col';tr.append(th);});head.append(tr);
    linhas.forEach(valores=>{const linha=el('tr');valores.forEach(v=>{const td=el('td');td.append(v instanceof Node?v:document.createTextNode(String(v??'Não informado')));linha.append(td);});body.append(linha);});
    if(!linhas.length){const row=el('tr'),td=el('td',vazio,'op-demo-no-results');td.colSpan=titulos.length;row.append(td);body.append(row);}
    table.append(head,body);wrap.append(table);return wrap;
}
function card(titulo,...filhos){const n=el('article',undefined,'op-card');n.append(el('h2',titulo),...filhos);return n;}

export async function montarUnidade(raiz,template,servico,{sair,avisoInicial=''}) {
    const identidade=servico.identidade, propria=unidade(identidade.unidade), permissoes=identidade.permissoes;
    let dados=await servico.consultar(), pagina=1, agenda, alunoAtual, atualizando=false;
    const $=s=>raiz.querySelector(s), painel=id=>$(`[data-op-panel=${id}]`);
    const navegacao=montarEstruturaOperador(raiz,template,{aoSair:sair});
    raiz.addEventListener('close',e=>{if(e.target.matches('dialog'))e.target.querySelector(':scope>.op-modal-feedback')?.remove();},true);
    raiz.hidden=false;raiz.classList.add('op-mode-demo','op-unidade');
    $('.op-operator-label strong').textContent=identidade.nome;
    $('.op-operator-label small').textContent='Recepção (ADM 1)';
    $('.sipa-sidebar-unit-text strong').textContent=nomeUnidade(propria);
    $('.sipa-sidebar-unit-text small').textContent='Unidade vinculada';
    $('.op-unit-chip').textContent=nomeUnidade(propria);
    $('.op-notice').replaceChildren(el('strong',`${identidade.nome} · Recepção (ADM 1)`),el('p',`${nomeUnidade(propria)} · vínculo somente de leitura`));
    const feedback=el('p',avisoInicial,'op-demo-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.hidden=!avisoInicial;$('.op-header').after(feedback);
    const informar=(texto,erro=false)=>{
        feedback.textContent=texto;feedback.hidden=false;feedback.dataset.erro=String(erro);
        const aberto=[...raiz.querySelectorAll('dialog[open]')].at(-1);
        if(aberto){let aviso=aberto.querySelector(':scope>.op-modal-feedback');if(!aviso){aviso=el('p',undefined,'op-modal-feedback op-help');aberto.querySelector('.op-dialog-heading').after(aviso);}aviso.textContent=texto;aviso.setAttribute('role',erro?'alert':'status');}
    };
    const tema=globalThis.SipaTema.montarBotao({texto:true});tema.dataset.opTema='';const contexto=el('div',undefined,'op-header-context');contexto.append($('.op-topbar .op-unit-chip'),tema);$('.op-topbar').append(contexto);
    const menu=botao('Menu',()=>{const aberto=$('.op-sidebar').classList.toggle('op-open');menu.setAttribute('aria-expanded',String(aberto));if(aberto)$('.op-sidebar a').focus();});menu.classList.add('op-menu-mobile');menu.setAttribute('aria-expanded','false');menu.setAttribute('aria-controls','op-menu-lateral');$('.op-sidebar').id='op-menu-lateral';$('.op-topbar').prepend(menu);
    raiz.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('.op-sidebar').classList.contains('op-open')){$('.op-sidebar').classList.remove('op-open');menu.setAttribute('aria-expanded','false');menu.focus();}});
    raiz.querySelectorAll('[data-op-nav]').forEach(n=>n.addEventListener('click',()=>{$('.op-sidebar').classList.remove('op-open');menu.setAttribute('aria-expanded','false');}));
    const nomeNav=(id,nome)=>{const a=$(`[data-op-nav=${id}]`);a.lastChild.textContent=nome;};nomeNav('recursos','Veículos e recursos');nomeNav('agenda','Agendas');
    // Ordem do atendimento; verificações legadas continuam acessíveis na ficha.
    const nav=$('.sipa-sidebar-menu');for(const id of ['visao-geral','alunos','cadastro','agenda','instrutores','recursos','verificacoes','perfil'])nav.append($(`[data-op-nav=${id}]`));
    $('.sipa-sidebar-logo').href='#visao-geral';$('.sipa-sidebar-logo').addEventListener('click',e=>{e.preventDefault();navegacao.navegar('visao-geral');});
    const antigo=$('[data-op-dialog]');antigo.remove();
    // O listener antigo pertence à estrutura e só abria o diálogo sem dados.
    const cadastrar=$('[data-op-cadastro]'),novo=cadastrar.cloneNode(true);cadastrar.replaceWith(novo);novo.addEventListener('click',()=>navegacao.navegar('cadastro'));

    const estadoAgenda=()=>({...dados,alunos:[...dados.alunos,...dados.pista],recursos:dados.recursos.map(r=>({...r,unidade:unidade(r.unidade)})),aulas:dados.aulas.map(a=>({...a,unidade:unidade(a.unidade)}))});
    const detalhes=criarDetalhesAula(raiz,estadoAgenda,{servico,executar});
    async function executar(acao,mensagem,apos) {
        if(atualizando)return false;atualizando=true;raiz.setAttribute('aria-busy','true');
        try{await acao();dados=await servico.consultar();atualizar();informar(mensagem);await apos?.();return true;}
        catch(e){informar(e.message||'Não foi possível concluir a operação.',true);return false;}
        finally{atualizando=false;raiz.removeAttribute('aria-busy');}
    }
    // Consultas que alimentam filtros nunca alteram a coleção persistida.
    const filtros={busca:entrada('search'),situacao:select([['','Todas'],'Pendente','Verificado','Incompleto']),categoria:select([['','Todas'],'A','B','D','AB']),principal:select([['','Todas'],...UNIDADES]),carro:select([['','Todas'],...UNIDADES])};
    filtros.busca.placeholder='Nome ou CPF';filtros.busca.dataset.opBusca='';
    const filtrosVazios=()=>Object.fromEntries(Object.keys(filtros).map(k=>[k,'']));let filtrosAplicados=filtrosVazios();
    const barra=el('form',undefined,'op-local-filters');barra.setAttribute('role','search');barra.setAttribute('aria-label','Pesquisa de alunos autorizados');
    function pesquisar(){const novos=Object.fromEntries(Object.entries(filtros).map(([k,c])=>[k,c.value]));if(pagina===1&&JSON.stringify(novos)===JSON.stringify(filtrosAplicados))return;filtrosAplicados=novos;pagina=1;listar();}
    barra.addEventListener('submit',e=>{e.preventDefault();pesquisar();});
    for(const [k,t] of [['busca','Buscar aluno'],['situacao','Situação cadastral'],['categoria','Categoria'],['principal','Unidade principal'],['carro','Unidade de carro']]){
        const grupo=el('div',undefined,'op-aluno-filter'),label=el('label',t),linha=el('div',undefined,'op-aluno-filter-input'),lupa=botao('',pesquisar,'op-aluno-search-button');
        filtros[k].dataset.opFiltro=k;filtros[k].id=`op-alunos-filtro-${k}`;label.htmlFor=filtros[k].id;
        lupa.dataset.opPesquisar=k;lupa.setAttribute('aria-label',`Pesquisar com todos os filtros: ${t}`);lupa.title='Pesquisar com todos os filtros';
        const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');svg.setAttribute('aria-hidden','true');use.setAttribute('href','#op-search');svg.append(use);lupa.append(svg);
        linha.append(filtros[k],lupa);grupo.append(label,linha);barra.append(grupo);
    }
    const limparBusca=botao('Limpar filtros',()=>{Object.values(filtros).forEach(c=>c.value='');filtrosAplicados=filtrosVazios();pagina=1;listar();},'op-button op-button-outline');limparBusca.dataset.opLimparBusca='';const acoesBusca=el('div',undefined,'op-aluno-filter-actions');acoesBusca.append(limparBusca);barra.append(acoesBusca);
    // Só entradas numéricas/pontuadas recebem máscara; nomes com números continuam nomes.
    const termoCPF=texto=>/^[\d.\-\s]+$/.test(texto)&&/\d/.test(texto);
    ativarMascaraCpf(filtros.busca,{permitirNome:true});
    filtros.busca.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();pesquisar();}});
    const lista=el('div'),paginacao=el('nav',undefined,'op-local-pagination');paginacao.setAttribute('aria-label','Páginas de alunos');const quantidade=el('p',undefined,'op-help');quantidade.dataset.opContagem='';
    painel('alunos').replaceChildren(card('Alunos autorizados',barra,quantidade,lista,paginacao));
    function listar(){
        const f=filtrosAplicados,termo=f.busca.trim().toLocaleLowerCase('pt-BR'),numeros=termo.replace(/\D/g,''),cpf=termoCPF(termo);
        const alunos=dados.alunos.filter(a=>(!termo||(cpf?(numeros.length===11?a.cpf===numeros:a.cpf.includes(numeros)):a.nome.toLocaleLowerCase('pt-BR').includes(termo)))&&(!f.situacao||situacaoCadastro(a)===f.situacao)&&(!f.categoria||a.categoria===f.categoria)&&(!f.principal||principal(a)===f.principal)&&(!f.carro||carro(a)===f.carro));
        const total=Math.ceil(alunos.length/10);pagina=Math.max(1,Math.min(pagina,total||1));quantidade.textContent=`${alunos.length} aluno(s) · somente vínculos autorizados`;
        lista.replaceChildren(tabela(['Aluno / CPF','Categoria','Unidade principal','Aulas de carro','Cadastro','Acesso'],alunos.slice((pagina-1)*10,pagina*10).map(a=>{
            const n=el('div'),abrir=botao(a.nome,()=>abrirFicha(a.id),'op-link');abrir.dataset.opAluno=a.id;n.append(abrir,el('small',formatarCpf(a.cpf)));return [n,a.categoria,nomeUnidade(principal(a)),carro(a)?nomeUnidade(carro(a)):'Não se aplica',badge(situacaoCadastro(a)),a.acesso||'Não informado'];
        }),'Nenhum aluno encontrado para os filtros informados.'));
        paginacao.replaceChildren();if(total>1){paginacao.append(botao('Anterior',()=>{pagina=Math.max(1,pagina-1);listar();}));for(let i=Math.max(1,pagina-2);i<=Math.min(total,pagina+2);i++){const b=botao(String(i),()=>{pagina=i;listar();});if(i===pagina)b.setAttribute('aria-current','page');paginacao.append(b);}paginacao.append(botao('Próxima',()=>{pagina=Math.min(total,pagina+1);listar();}));}
    }

    const form=el('form',undefined,'op-form-fields op-form-grid'),camposCadastro={nome:entrada('text'),cpf:entrada('text'),nascimento:entrada('date'),telefone:entrada('tel'),email:entrada('email'),categoria:select([['','Selecione'],['A','A — Moto'],['B','B — Carro'],['D','D — Ônibus'],['AB','AB — Carro e Moto']]),tipoCambio:select([['','Selecione o tipo de carro'],...CAMBIOS]),unidade:entrada('text',nomeUnidade(propria)),quantidadeCarro:entrada('number'),quantidadeMoto:entrada('number'),quantidadeOnibus:entrada('number'),unidadeCarro:select([['','Escolha a unidade de carro'],...UNIDADES]),observacoes:el('textarea')};
    form.noValidate=true;let validacaoIniciada=false;const rotulosCadastro={},avisosCadastro={},quantidades=el('div',undefined,'op-cadastro-quantidades op-wide');
    camposCadastro.unidade.readOnly=true;camposCadastro.cpf.inputMode='numeric';camposCadastro.cpf.maxLength=14;camposCadastro.telefone.maxLength=16;camposCadastro.nome.maxLength=180;camposCadastro.email.maxLength=200;camposCadastro.observacoes.maxLength=2000;camposCadastro.nascimento.max=hojeBrasil();
    ativarMascaraCpf(camposCadastro.cpf);
    camposCadastro.telefone.addEventListener('input',()=>{const n=camposCadastro.telefone.value.replace(/\D/g,'').slice(0,11);camposCadastro.telefone.value=n.replace(/^(\d{2})(\d)/,'($1) $2').replace(/(\d{4,5})(\d{4})$/,'$1-$2');});
    for(const [key,titulo] of Object.entries({nome:'Nome completo',cpf:'CPF',nascimento:'Data de nascimento',telefone:'Telefone com DDD',email:'E-mail',unidade:'Unidade principal (vínculo do operador)',categoria:'Categoria',tipoCambio:'Tipo de carro para as aulas práticas',quantidadeCarro:'Quantidade de aulas de carro adquiridas',quantidadeMoto:'Quantidade de aulas de moto adquiridas',quantidadeOnibus:'Quantidade de aulas de ônibus adquiridas',unidadeCarro:'Unidade escolhida para aulas de carro',observacoes:'Observações administrativas'})){
        const controle=camposCadastro[key];controle.name=key;controle.required=true;if(key==='observacoes')controle.disabled=!permissoes.includes('anotar');
        if(key.startsWith('quantidade')){controle.min='1';controle.step='1';controle.inputMode='numeric';}
        const label=campo(titulo,controle),aviso=el('small','','op-cadastro-erro');aviso.id=`cadastro-erro-${key}`;aviso.hidden=true;controle.setAttribute('aria-describedby',aviso.id);label.append(aviso);avisosCadastro[key]=aviso;rotulosCadastro[key]=label;
        if(key==='categoria'||key==='observacoes')label.classList.add('op-wide');
        if(key.startsWith('quantidade'))quantidades.append(label);else form.append(label);
        if(key==='categoria')form.append(quantidades);
        controle.addEventListener(controle.tagName==='SELECT'?'change':'input',()=>{if(validacaoIniciada)mostrarErrosCadastro(servico.validarCadastro(Object.fromEntries(new FormData(form)),dados.alunos));});
    }
    const pista=el('aside',undefined,'op-pista-aviso'),textoPista=el('span','Categoria A · pista KM Centro de Vila Velha: Av. Luciano das Neves, 1335 – Divino, Vila Velha – ES.');
    pista.append(textoPista);
    const unidadesCadastro=el('div',undefined,'op-cadastro-unidades op-wide');
    rotulosCadastro.unidadeCarro.before(unidadesCadastro);unidadesCadastro.append(rotulosCadastro.unidadeCarro,pista);
    rotulosCadastro.categoria.after(rotulosCadastro.tipoCambio,unidadesCadastro,quantidades);
    function categoriaCadastro(){
        const categoria=camposCadastro.categoria.value,b=categoria.includes('B');camposCadastro.tipoCambio.disabled=!b;camposCadastro.tipoCambio.required=b;rotulosCadastro.tipoCambio.hidden=!b;if(!b)camposCadastro.tipoCambio.value='';
        const anterior=camposCadastro.unidadeCarro.value;camposCadastro.unidadeCarro.replaceChildren(...[['','Escolha a unidade de carro'],...UNIDADES.filter(([id])=>unidadeCarroPermitida(camposCadastro.tipoCambio.value,id))].map(([id,nome])=>new Option(nome,id)));if(unidadeCarroPermitida(camposCadastro.tipoCambio.value,anterior))camposCadastro.unidadeCarro.value=anterior;camposCadastro.unidadeCarro.disabled=!b;camposCadastro.unidadeCarro.required=b;camposCadastro.unidadeCarro.hidden=!b;rotulosCadastro.unidadeCarro.hidden=!b;unidadesCadastro.hidden=!categoria;if(!b)camposCadastro.unidadeCarro.value='';pista.hidden=!categoria.includes('A')&&categoria!=='D';textoPista.textContent=categoria==='D'?AVISO_ONIBUS+' '+Object.values(LOCAIS_ONIBUS).map(l=>l.nome+': '+l.endereco).join(' '):'Categoria A · pista KM Centro de Vila Velha: Av. Luciano das Neves, 1335 – Divino, Vila Velha – ES.';quantidades.hidden=!categoria;
        for(const [key,cat] of [['quantidadeCarro','B'],['quantidadeMoto','A'],['quantidadeOnibus','D']]){const ativo=categoria.includes(cat);camposCadastro[key].disabled=!ativo;camposCadastro[key].required=ativo;rotulosCadastro[key].hidden=!ativo;if(!ativo)camposCadastro[key].value='';}
        if(validacaoIniciada)mostrarErrosCadastro(servico.validarCadastro(Object.fromEntries(new FormData(form)),dados.alunos));
    }
    camposCadastro.categoria.addEventListener('change',categoriaCadastro);camposCadastro.tipoCambio.addEventListener('change',categoriaCadastro);categoriaCadastro();const erroCadastro=el('p','','op-wide');erroCadastro.setAttribute('role','alert');erroCadastro.dataset.opCadastroErro='';
    function mostrarErrosCadastro(erros){for(const [key,controle] of Object.entries(camposCadastro)){const texto=erros[key]||'';avisosCadastro[key].textContent=texto;avisosCadastro[key].hidden=!texto;if(texto)controle.setAttribute('aria-invalid','true');else controle.removeAttribute('aria-invalid');}erroCadastro.textContent=Object.keys(erros).length?'Existem campos pendentes. Confira as informações destacadas.':'';}
    const revisar=el('button','Confirmar cadastro','op-button op-button-primary');revisar.type='submit';revisar.disabled=!permissoes.includes('cadastrar')||!permissoes.includes('anotar');form.append(erroCadastro,revisar);painel('cadastro').replaceChildren(card('Identificação e vínculos',el('p','Registre as aulas adquiridas por categoria. As aulas adquiridas ficam disponiveis automaticamente para agendamento.','op-help'),form));
    const confirmarCadastro=modal(raiz,'Confirmar cadastro?','opConfirmarCadastro'),resumoCadastro=el('div',undefined,'op-confirm-grid'),erroConfirmacao=el('p');erroConfirmacao.setAttribute('role','alert');let cadastroPendente,chaveCadastro;
    let salvandoCadastro=false;
    const voltarCadastro=botao('Voltar',()=>confirmarCadastro.close());
    const salvarCadastro=botao('Confirmar cadastro',async()=>{if(salvandoCadastro)return;salvandoCadastro=true;salvarCadastro.disabled=true;voltarCadastro.disabled=true;confirmarCadastro.querySelector('.op-close').disabled=true;salvarCadastro.textContent='Criando cadastro e acesso…';confirmarCadastro.setAttribute('aria-busy','true');try{const ok=await executar(()=>servico.cadastrar(cadastroPendente,chaveCadastro),'Cadastro e conta criados. O aluno deve definir nova senha no primeiro acesso. As aulas adquiridas ja estao disponiveis, respeitando os bloqueios e a disponibilidade.',()=>{confirmarCadastro.close();form.reset();validacaoIniciada=false;mostrarErrosCadastro({});cadastroPendente=null;chaveCadastro=null;camposCadastro.unidade.value=nomeUnidade(propria);categoriaCadastro();navegacao.navegar('alunos');});if(!ok)erroConfirmacao.textContent=feedback.textContent;}finally{salvandoCadastro=false;salvarCadastro.disabled=false;voltarCadastro.disabled=false;confirmarCadastro.querySelector('.op-close').disabled=false;salvarCadastro.textContent='Confirmar cadastro';confirmarCadastro.removeAttribute('aria-busy');}},'op-button op-button-primary');
    confirmarCadastro.addEventListener('cancel',e=>{if(salvandoCadastro)e.preventDefault();});const rodapeCadastro=el('footer',undefined,'op-confirm-actions');rodapeCadastro.append(voltarCadastro,salvarCadastro);confirmarCadastro.append(resumoCadastro,el('p','A conta será vinculada a este cadastro. A senha provisória usa os seis primeiros dígitos do CPF e deve ser trocada no primeiro acesso.','op-help'),erroConfirmacao,rodapeCadastro);
    form.addEventListener('submit',e=>{e.preventDefault();if(salvandoCadastro)return;validacaoIniciada=true;
        if(!permissoes.includes('cadastrar')||!permissoes.includes('anotar')){informar('Permissão insuficiente para confirmar cadastros.',true);return;}
        const d=Object.fromEntries(new FormData(form));
        const erros=servico.validarCadastro(d,dados.alunos);mostrarErrosCadastro(erros);
        if(Object.keys(erros).length){const primeiro=camposCadastro[Object.keys(erros)[0]];primeiro.focus();primeiro.scrollIntoView({block:'center',behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});return;}
        if(JSON.stringify(cadastroPendente)!==JSON.stringify(d))chaveCadastro=crypto.randomUUID();cadastroPendente=d;erroConfirmacao.textContent='';resumoCadastro.replaceChildren();
        for(const [rotulo,valor] of [['Nome completo',d.nome],['CPF',formatarCpf(d.cpf)],['Categoria',d.categoria==='AB'?'A+B':d.categoria],['Unidade principal',nomeUnidade(propria)],...(d.categoria.includes('B')?[['Tipo de carro',nomeCambio(d.tipoCambio)]]:[]),['Unidade das aulas de carro',d.unidadeCarro?nomeUnidade(d.unidadeCarro):'Não se aplica'],['Aulas de carro adquiridas',d.categoria.includes('B')?d.quantidadeCarro:'Não se aplica'],['Aulas de moto adquiridas',d.categoria.includes('A')?d.quantidadeMoto:'Não se aplica'],...(d.categoria==='D'?[['Aulas de ônibus adquiridas',d.quantidadeOnibus]]:[])]){
            const item=el('div',undefined,'op-confirm-item');item.append(el('strong',`${rotulo}:`),document.createTextNode(' '),el('span',valor,'op-confirm-value'));resumoCadastro.append(item);
        }
        if(!confirmarCadastro.open)confirmarCadastro.showModal();
    });

    const ficha=modal(raiz,'Ficha completa do aluno','opFicha'),fichaConteudo=el('div');ficha.append(fichaConteudo);let abaFicha='cadastro',consultaFicha=0;
    async function abrirFicha(id,aba='cadastro') {alunoAtual=id;abaFicha=aba;try{await renderizarFicha();if(!ficha.open)ficha.showModal();}catch(e){informar(e.message,true);}}
    async function renderizarFicha(){
        const consulta=++consultaFicha,carregando=el('p','Consultando registros…','op-help');carregando.setAttribute('role','status');fichaConteudo.prepend(carregando);fichaConteudo.setAttribute('aria-busy','true');
        let resposta;try{resposta=await servico.ficha(alunoAtual);}catch(erro){if(consulta===consultaFicha){fichaConteudo.replaceChildren(el('p','Não foi possível consultar os registros. Feche e reabra a ficha para tentar novamente.','op-help'));}throw erro;}finally{carregando.remove();if(consulta===consultaFicha)fichaConteudo.removeAttribute('aria-busy');}
        if(consulta!==consultaFicha)return;
        ficha.dataset.opAba=abaFicha;
        const {aluno:a,resumoAulas,resumoLiberacao,aulas,linhaTempo}=resposta;fichaConteudo.replaceChildren(el('h3',a.nome));
        const abas=el('div',undefined,'op-local-tabs');abas.setAttribute('aria-label','Seções da ficha');
        for(const [id,titulo] of [['cadastro','Cadastro'],['etapas','Exames e agendamento de prova'],['creditos','Aulas'],['provas','Provas marcadas'],['historico','Histórico'],['acesso','Acesso'],['senha','Redefinir senha']]){const b=botao(titulo,()=>{abaFicha=id;renderizarFicha().catch(e=>informar(e.message,true));});b.dataset.opFichaAba=id;b.setAttribute('aria-pressed',String(abaFicha===id));abas.append(b);}fichaConteudo.append(abas);
        const contextoFicha={raiz,servico,permissoes,executar,reabrir:renderizarFicha};
        if(abaFicha==='cadastro'){
            const cadastroArea=el('section');fichaConteudo.append(cadastroArea);
            cadastroArea.append(campos([['Nome',a.nome],['CPF',formatarCpf(a.cpf)],['Nascimento',textoData(a.nascimento)],['Telefone',a.telefone],['E-mail',a.email],['Categoria',a.categoria],['Unidade principal',nomeUnidade(principal(a))],...(a.categoria.includes('B')?[['Tipo de carro',nomeCambio(a.tipoCambio)]]:[]),['Aulas de carro',carro(a)?nomeUnidade(carro(a)):'Não se aplica'],['Cadastro',situacaoCadastro(a)],['Criado em',dataHora(a.criadoEm)]]));
            if(a.categoria==='D')cadastroArea.append(el('p',AVISO_ONIBUS+' '+Object.values(LOCAIS_ONIBUS).map(l=>l.endereco).join(' '),'op-inline-note'));if(a.categoria.includes('A'))cadastroArea.append(el('p',pista.textContent,'op-inline-note'));
            if(a.categoria.includes('B')){const b=botao('Alterar unidade de aulas de carro',()=>abrirTransferencia(a));b.dataset.opTransferir='';b.disabled=!permissoes.includes('transferir');cadastroArea.append(b);}
            const notas=el('textarea');notas.value=a.observacoes||'';notas.maxLength=2000;notas.rows=3;notas.disabled=!permissoes.includes('anotar');const salvar=botao('Salvar observações',()=>executar(()=>servico.anotar(a.id,notas.value),'Observações locais salvas.',renderizarFicha));salvar.disabled=notas.disabled;cadastroArea.append(campo('Observações administrativas',notas),salvar);
            montarEdicaoCadastro(cadastroArea,a,contextoFicha);
            if(servico.identidade.nivel===3&&permissoes.includes('excluir-cadastro')&&servico.excluirCadastro)cadastroArea.append(botao('Excluir',()=>confirmarExclusao(raiz,servico,'aluno',a,()=>location.reload())));

        }
        if(abaFicha==='etapas')montarExamesProvas(fichaConteudo,a,contextoFicha);
        if(abaFicha==='provas'){const painel=el('section');painel.dataset.opProvasAgendadas='';montarProvasAgendadas(painel,a,contextoFicha);fichaConteudo.append(painel);}
        if(abaFicha==='creditos'){
            fichaConteudo.append(campos([['Situação financeira',a.financeiro],['Motivo do bloqueio',resumoLiberacao.motivoBloqueio||'Sem bloqueio financeiro ou de saldo; exames e recursos continuam sujeitos à validação.']]));
            const grade=el('div',undefined,'op-resumo-aulas');
            for(const [c,resumo] of Object.entries(resumoAulas)){
                const item=el('section',undefined,'op-resumo-aulas-card');item.dataset.opResumoCategoria=c;item.append(el('h4',`Aulas de ${NOMES_CATEGORIA[c].toLocaleLowerCase('pt-BR')} — Categoria ${c}`));
                const numeros=el('dl'),saldos=resumoLiberacao.categorias[c];for(const [chave,titulo] of [['adquiridas','Aulas adquiridas'],['disponiveis','Aulas disponíveis para agendamento'],['reservadas','Aulas reservadas'],['realizadas','Aulas realizadas'],['faltas','Faltas']]){const linha=el('div'),dado=chave==='adquiridas'?resumo.adquiridas:chave==='faltas'?resumo.faltas:saldos[chave],valor=el('dd',dado===null?'Não informado':String(dado));valor.dataset.opTotal=chave;linha.append(el('dt',titulo),valor);numeros.append(linha);}item.append(numeros);grade.append(item);
            }
            fichaConteudo.append(grade,el('p','Totais calculados a partir dos registros de aulas do aluno.','op-help'));
        }
        if(abaFicha==='historico')montarLinhaTempo(fichaConteudo,linhaTempo,{abrirAula:id=>{const aula=aulas.find(a=>a.id===id);if(aula)detalhes.abrir(aula);}});
        if(abaFicha==='acesso'){fichaConteudo.append(campos([['Login previsto (CPF)',formatarCpf(a.cpf)],['Ativação',a.acesso],['Convite',a.convite?.status||'Não emitido / integração pendente'],['Primeiro acesso',a.primeiroAcessoEm?dataHora(a.primeiroAcessoEm):'Não informado'],['Troca obrigatória de senha',a.contaId?'Obrigatória no primeiro acesso':'Validação pendente na API'],['Último acesso',dataHora(a.ultimoAcessoEm)]]),el('p',a.contaId?'Acesso vinculado ao cadastro do aluno.':'Nenhuma credencial foi emitida para este cadastro legado.','op-inline-note'));

        }
        if(abaFicha==='senha')await montarAcessoAluno(fichaConteudo,a,contextoFicha);
    }

    const transfer=modal(raiz,'Alterar unidade de aulas de carro','opTransferencia'),tcorpo=el('div');transfer.append(tcorpo);let versaoPrevia=0;
    function abrirTransferencia(a){
        tcorpo.replaceChildren(el('p',`Unidade atual: ${nomeUnidade(carro(a))}`));const nova=select([['','Selecione a nova unidade'],...UNIDADES.filter(([id])=>id!==carro(a)&&unidadeCarroPermitida(a.tipoCambio,id))]),motivo=el('textarea'),previa=el('div'),erro=el('p');motivo.rows=2;motivo.maxLength=1000;motivo.dataset.opMotivoTransferencia='';nova.dataset.opNovaUnidade='';erro.setAttribute('role','alert');
        const confirmar=botao('Confirmar transferência',async()=>{const ids=[...previa.querySelectorAll('input:checked')].map(n=>n.value);const ok=await executar(()=>servico.transferir(a.id,nova.value,motivo.value,ids),'Unidade de novos agendamentos atualizada. Reservas anteriores preservadas.',async()=>{transfer.close();try{await renderizarFicha();}catch{ficha.close();informar('Transferência salva. O vínculo anterior não autoriza mais a ficha completa.');}});if(!ok)erro.textContent=feedback.textContent;},'op-button op-button-primary');confirmar.disabled=true;confirmar.dataset.opConfirmarTransferencia='';
        nova.addEventListener('change',async()=>{const ticket=++versaoPrevia;confirmar.disabled=true;previa.replaceChildren(el('p','Consultando reservas…'));try{const p=await servico.previa(a.id,nova.value);if(ticket!==versaoPrevia)return;
            const linhas=p.aulas.map(x=>{const c=entrada('checkbox');c.value=x.id;c.disabled=!x.cancelavel;c.setAttribute('aria-label',`Cancelar ${textoData(x.data)} às ${x.inicio}`);return [c,`${textoData(x.data)} · ${x.inicio}–${x.fim}`,nomeUnidade(x.unidade),x.cancelavel?'Pode cancelar · seleção opcional':'Mantida · fora das 48 horas úteis'];});
            previa.replaceChildren(tabela(['Cancelar','Aula na origem','Unidade original','Prazo'],linhas,'Nenhuma reserva futura na unidade anterior.'),el('p','Nenhuma aula será migrada ou cancelada automaticamente. Aulas fora do prazo permanecem confirmadas na origem. A transferência, por si só, não devolve créditos.','op-inline-note'));confirmar.disabled=false;
        }catch(e){previa.replaceChildren(el('p',e.message));}});
        tcorpo.append(campo('Nova unidade para carro',nova),campo('Motivo informado pelo aluno',motivo),previa,erro,botao('Voltar',()=>{versaoPrevia++;transfer.close();}),confirmar);transfer.showModal();
    }

    const agendaPanel=painel('agenda');
    const abrirAgendamento=montarReservaRecepcao(raiz,servico,executar);
    agenda=montarAgenda(raiz,agendaPanel,estadoAgenda,{unidade:propria,detalhesAula:detalhes,obterPares:(estado,d,h,f)=>paresNaUnidade(estado,identidade,d,h,{...f,consultaOperacional:true}),aoAgendar:(data,hora,filtros)=>{abrirAgendamento(data,hora,filtros);return true;}});

    function inicio(){
        const indicador=card('Alunos vinculados',el('strong',String(dados.alunos.length)));
        indicador.dataset.opMetrica='alunos';indicador.classList.add('op-home-count');
        function icone(id){
            const svg=document.createElementNS('http://www.w3.org/2000/svg','svg'),use=document.createElementNS('http://www.w3.org/2000/svg','use');
            svg.setAttribute('aria-hidden','true');use.setAttribute('href',`#op-${id}`);svg.append(use);return svg;
        }
        const grade=el('div',undefined,'op-quick-grid');
        for(const [secao,titulo,descricao,simbolo] of [
            ['cadastro','Cadastrar aluno','Abra o formulário de cadastro e vínculos do aluno.','plus'],
            ['alunos','Consultar alunos','Busque os alunos autorizados para sua unidade.','users'],
            ['agenda','Consultar agendas','Consulte aulas e disponibilidade da unidade.','grid'],
            ['instrutores','Consultar instrutores','Veja os profissionais vinculados à unidade.','users'],
            ['recursos','Veículos e recursos','Consulte veículos e equipamentos da unidade.','car'],
        ]){
            const atalho=botao('',()=>navegacao.navegar(secao),'op-quick-action'),texto=el('span',undefined,'op-quick-copy');
            atalho.dataset.opAtalho=secao;texto.append(el('strong',titulo),el('span',descricao));
            atalho.append(icone(simbolo),texto,icone('arrow'));grade.append(atalho);
        }
        painel('visao-geral').replaceChildren(indicador,card('Funções rápidas',grade));
    }
    const filtrosInstrutores={busca:'',categoria:'',unidade:'',situacao:''};
    async function dadosAtualizados(){dados=await servico.consultar();atualizar();}
    function recursos(tipo,secao){
        let registros=dados.cadastrosRecursos.filter(r=>tipo==='Instrutores'?r.tipo==='Instrutores'&&(!filtrosInstrutores.categoria||r.categorias?.includes(filtrosInstrutores.categoria))&&(!filtrosInstrutores.busca||[r.nome,r.identificacao,r.cpf,r.documento].some(v=>String(v||'').toLocaleLowerCase('pt-BR').includes(filtrosInstrutores.busca.toLocaleLowerCase('pt-BR'))||/^[\d.\-\s]+$/.test(filtrosInstrutores.busca)&&String(v||'').replace(/\D/g,'').includes(filtrosInstrutores.busca.replace(/\D/g,'')))):r.tipo!=='Instrutores');
        if(identidade.nivel>=2)registros=registros.filter(r=>(!filtrosInstrutores.unidade||r.unidade===filtrosInstrutores.unidade)&&(!filtrosInstrutores.situacao||String(r.ativo)===filtrosInstrutores.situacao));
        const barra=el('div',undefined,'op-instrutor-filtros');barra.hidden=tipo!=='Instrutores';
        const busca=entrada('search',filtrosInstrutores.busca),cat=select([['','Todos'],['B','Carro — Categoria B'],['A','Moto — Categoria A'],['D','Ônibus — Categoria D']],filtrosInstrutores.categoria);busca.dataset.opBuscaInstrutor='';cat.dataset.opCategoriaInstrutor='';busca.placeholder='Nome, CPF ou identificação';
        busca.oninput=()=>{filtrosInstrutores.busca=busca.value;const pos=busca.selectionStart;recursos(tipo,secao);const n=painel(secao).querySelector('[data-op-busca-instrutor]');n.focus();n.setSelectionRange(pos,pos);};cat.onchange=()=>{filtrosInstrutores.categoria=cat.value;recursos(tipo,secao);};if(tipo==='Instrutores')barra.append(campo('Buscar instrutor',busca),campo('Categoria',cat),botao('Limpar filtros',()=>{filtrosInstrutores.busca='';filtrosInstrutores.categoria='';recursos(tipo,secao);}));
        if(identidade.nivel>=2){barra.hidden=false;const u=select([['','Todas as unidades'],...UNIDADES.filter(([id])=>identidade.nivel===3||identidade.unidades?.includes(id))],filtrosInstrutores.unidade),st=select([['','Todas as situações'],['true','Ativos'],['false','Inativos']],filtrosInstrutores.situacao);u.onchange=()=>{filtrosInstrutores.unidade=u.value;recursos(tipo,secao);};st.onchange=()=>{filtrosInstrutores.situacao=st.value;recursos(tipo,secao);};barra.append(campo('Unidade',u),campo('Situação',st));}
        const criar=botaoCadastroRecurso(raiz,tipo==='Instrutores'?'Instrutores':'Veículos',servico,executar,()=>recursos(tipo,secao));criar.disabled=!permissoes.includes('cadastrar-recurso');
        painel(secao).replaceChildren(card(tipo==='Instrutores'?'Instrutores vinculados':'Veículos e equipamentos',criar,el('p','Consulta por escopo autorizado. Instrutores da própria unidade podem ser editados pela recepção; consulta operacional externa não concede edição.','op-help'),barra,tabela(tipo==='Instrutores'?['Nome','Identificação','Categorias','Unidade','Veículo vinculado','Situação','']:['Identificação / modelo','Placa','Categoria / tipo','Unidade','Disponibilidade',''],registros.map(recurso=>{let r=recurso;
            const ver=botao('Ver detalhes',async()=>{try{r=await servico.recursoAdministrativo(r.id);}catch(e){informar(e.message,true);return;}if(r.tipo==='Instrutores'){abrirFichaInstrutor(raiz,servico,r.id,{aoEditar:(i,d)=>abrirFormularioInstrutor(raiz,servico,executar,()=>{d.close();recursos(tipo,secao);painel(secao).querySelector('[data-op-recurso=\"'+i.id+'\"]')?.click();},i)});return;}const d=modal(raiz,'Detalhes do recurso','opRecurso'),acoes=montarDetalhesRecurso(d,r,dados.recursos);if(r.tipo==='Instrutores'&&unidade(r.unidade)===propria&&permissoes.includes('editar-instrutor'))acoes.append(botao('Editar instrutor',()=>abrirFormularioInstrutor(raiz,servico,executar,()=>{d.close();recursos(tipo,secao);const atual=dados.recursos.find(x=>x.id===r.id);if(atual){const b=painel(secao).querySelector('[data-op-recurso="'+r.id+'"]');b?.click();}},r),'op-button op-button-primary'));if(r.tipo==='Veículos'&&permissoes.includes('editar-veiculo'))acoes.append(botao('Editar veículo',()=>abrirFormularioVeiculo(raiz,servico,executar,()=>{d.close();recursos(tipo,secao);painel(secao).querySelector('[data-op-recurso="'+r.id+'"]')?.click();},r),'op-button op-button-primary'));if(servico.situacaoRecurso&&permissoes.includes('gerenciar-situacao'))acoes.append(botao('Gerenciar situação',()=>gerirSituacaoRecurso(raiz,servico,r,async()=>{await dadosAtualizados();d.close();})));if(r.tipo==='Veículos'&&servico.identidade.nivel===3&&permissoes.includes('excluir-cadastro')&&servico.excluirCadastro)acoes.append(botao('Excluir',()=>confirmarExclusao(raiz,servico,'veiculo',r,()=>location.reload())));d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();});
            ver.dataset.opRecurso=r.id;return tipo==='Instrutores'?[r.nome,r.identificacao||'Não informada',r.categorias?.join(', ')||'Não informadas',nomeUnidade(r.unidade),dados.recursos.filter(v=>v.tipo==='Veículos'&&(v.instrutorId?v.instrutorId===r.id:r.veiculoIds?.includes(v.id))).map(v=>v.nome).join('; ')||'Sem veículo',r.ativo?(r.disponivel===false?'Indisponível':'Ativo'):'Inativo',ver]:[`${r.nome}${r.modelo?' / '+r.modelo:''}`,r.placa||'Não informada',(r.categoria||r.tipo)+(r.categoria==='B'?' · '+nomeCambio(r.tipoCambio):''),nomeUnidade(r.unidade),r.ativo&&r.disponivel!==false?'Ativo · sujeito à agenda':'Indisponível',ver];
        }))));
    }
    const medicas=identidade.nivel===1?montarVerificacoesMedicas(raiz,painel('verificacoes'),servico,executar,tabela):null;
    function verificacoes(){medicas?.atualizar(dados);}
    painel('perfil').replaceChildren(card('Identidade do atendimento',campos([['Nome',identidade.nome],['Perfil','Recepção (ADM 1)'],['Unidade vinculada',nomeUnidade(propria)],['Acesso','Recepção da unidade']]),el('p','A unidade vinculada à conta não pode ser alterada neste painel.','op-inline-note')));
    function atualizar(){listar();inicio();recursos('Instrutores','instrutores');recursos('Outros','recursos');verificacoes();agenda?.atualizar();}
    atualizar();document.title='Recepção | SIPA';
    // Alterações feitas pelo Instrutor em outra aba são relidas, sem sobrescrever
    // registros com um snapshot antigo. O adaptador também relê antes de escrever.
    window.addEventListener('storage',async e=>{if(e.key==='sipa.operador.demo.v2'){try{dados=await servico.consultar();atualizar();if(ficha.open)await renderizarFicha();}catch(erro){informar(erro.message,true);}}});
    return {...navegacao,executar,abrirFicha,abrirAula:id=>{const a=dados.aulas.find(a=>a.id===id);if(a)detalhes.abrir(a);},recarregar:async()=>{dados=await servico.consultar();atualizar();if(ficha.open)await renderizarFicha();}};
}
