import {confirmarExclusao} from '../../../shared/components/excluirCadastro.js';
import {montarAcessoAluno} from './redefinirSenhaAluno.js';
import {mostrarSenhaProvisoria} from '../../../shared/components/senhaProvisoria.js';
import {montarDetalhesRecurso} from './detalhesRecurso.js';
import {gerirSituacaoRecurso,alternarSituacaoRecurso,formularioAdministrativo} from '../../../shared/components/formularioAdministrativo.js';
import {abrirFichaInstrutor} from './fichaInstrutor.js';
import {montarVerificacoesMedicas} from './verificacoesMedicas.js';
import {CAMBIOS,nomeCambio,unidadeCarroPermitida} from '../../../shared/js/operacaoCarro.js';
import {montarReservaRecepcao} from './reservaRecepcao.js';
import {botaoCadastroRecurso,abrirFormularioInstrutor,abrirFormularioVeiculo} from './cadastroRecurso.js';
import {AVISO_ONIBUS,NOMES_CATEGORIA,LOCAIS_ONIBUS} from '../../../shared/js/categorias.js';
import {marcarErrosDoServidor} from '../../../shared/js/errosDeCampo.js';
import {montarEdicaoCadastro,montarJornada,etapaAtual,montarExamesProvas,montarProvas,montarHistoricoProvas,montarLinhaTempo} from './fichaEvolucao.js';
import {el,botao,campo,select,entrada,modal,card,iconeSvg,mostrarToast} from './uiOperador.js';
import {montarEstruturaOperador} from './painelOperador.js';
import {tornarOrdenavel,ordenarLinhas,estadoOrdenacao} from '../../../shared/js/ordenacaoTabela.js';
import {montarAgenda} from './agendaOperador.js';
import {criarDetalhesAula} from './aulaOperador.js';
import {UNIDADES,principal,carro,unidade,paresNaUnidade} from '../dominioOperador.js';
import {hojeBrasil,formatarData,dataBrasilia,horaBrasilia} from '../../../shared/js/calendario.js';
import {formatarCpf,ativarMascaraCpf,formatarTelefone} from '../../../shared/js/formatacao.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';

const nomeUnidade=u=>nomeUnidadeInstitucional(unidade(u));
const textoData=d=>d?formatarData(d):'Não informada';
const dataHoraCurta=d=>d?dataBrasilia(d)+' às '+horaBrasilia(d):'Não informado';
// Campos da ficha: o valor pode ser texto ou nó (etiqueta, link de ação).
// Contratação na ficha: 'Pacote X · 15 aulas · B' ou 'Avulsa · 15 aulas · B'; recusadas ficam de fora.
const textoContratacoes=lista=>lista.filter(c=>c.status!=='Recusado').map(c=>[c.pacote?'Pacote '+c.pacote:'Avulsa',c.quantidade+' aulas',c.categorias.join('/'),c.status&&c.status!=='Aprovado'?c.status:''].filter(Boolean).join(' · ')).join('; ')||'Nenhuma contratação';
function camposFicha(itens){const dl=el('dl',undefined,'op-fields op-ficha-campos');for(const [k,v] of itens){const item=el('div'),dd=el('dd');dd.append(v instanceof Node?v:document.createTextNode(v==null||v===''?'Não informado':String(v)));item.append(el('dt',k),dd);dl.append(item);}return dl;}
function blocoFicha(titulo,...filhos){const s=el('section',undefined,'op-ficha-bloco');s.append(el('h4',titulo),...filhos);return s;}
const badge=t=>el('span',t,'op-badge');
// Coluna Ações das listas (como no Simplea): chave ativo/inativo e o ⋯ que abre os detalhes.
function chaveSituacao(ativo,nome,aoClicar){const b=el('button',undefined,'op-chave');b.type='button';b.setAttribute('role','switch');b.setAttribute('aria-checked',String(!!ativo));b.setAttribute('aria-label',(ativo?'Inativar ':'Ativar ')+nome);b.title=ativo?'Ativo: clique para inativar':'Inativo: clique para ativar';b.onclick=aoClicar;return b;}
const ICONES_ACAO={olho:'<path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/>',lapis:'<path d="M4 20h4L19 9l-4-4L4 16v4z"/><path d="M13.5 6.5l4 4"/>'};
function iconeAcao(nome){const svg=document.createElementNS('http://www.w3.org/2000/svg','svg');svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('class','op-acao-icone');svg.innerHTML=ICONES_ACAO[nome]||'';return svg;}
// Ações da linha no padrão do Simplea: o ⋯ abre um menu só com as ações permitidas (item sem ação fica de fora).
// O menu é fixo na tela, para a rolagem da tabela não cortá-lo, e abre para cima quando falta espaço embaixo.
const fecharMenusAcoes=()=>document.querySelectorAll('.op-menu-acoes-lista:not([hidden])').forEach(m=>{m.hidden=true;m.previousElementSibling?.setAttribute('aria-expanded','false');});
document.addEventListener('pointerdown',e=>{if(!e.target.closest?.('.op-menu-acoes'))fecharMenusAcoes();});
window.addEventListener('scroll',e=>{if(!e.target.closest?.('.op-menu-acoes-lista'))fecharMenusAcoes();},true);window.addEventListener('resize',fecharMenusAcoes);
function menuAcoes(nome,itens){
    const caixa=el('div',undefined,'op-menu-acoes'),gatilho=botaoMais(nome,null),menu=el('div',undefined,'op-menu-acoes-lista');menu.setAttribute('role','menu');menu.hidden=true;gatilho.setAttribute('aria-haspopup','menu');gatilho.setAttribute('aria-expanded','false');gatilho.title='Ações';gatilho.setAttribute('aria-label','Ações de '+nome);
    const fechar=()=>{menu.hidden=true;gatilho.setAttribute('aria-expanded','false');};
    for(const [rotulo,acao,icone] of itens.filter(i=>i[1])){const b=botao(rotulo,()=>{fechar();acao();},'op-menu-acoes-item');if(icone)b.prepend(iconeAcao(icone));b.setAttribute('role','menuitem');b.dataset.opAcao=rotulo.toLocaleLowerCase('pt-BR');menu.append(b);}
    gatilho.onclick=()=>{const abrir=menu.hidden;fecharMenusAcoes();if(!abrir)return;menu.hidden=false;gatilho.setAttribute('aria-expanded','true');
        const r=gatilho.getBoundingClientRect(),h=menu.offsetHeight,emCima=innerHeight-r.bottom<h+8&&r.top>h+8;
        Object.assign(menu.style,{position:'fixed',left:'auto',right:Math.max(8,innerWidth-r.right)+'px',top:emCima?'auto':(r.bottom+4)+'px',bottom:emCima?(innerHeight-r.top+4)+'px':'auto'});
        menu.querySelector('button:not(:disabled)')?.focus();};
    caixa.addEventListener('keydown',e=>{if(e.key==='Escape'&&!menu.hidden){e.stopPropagation();fechar();gatilho.focus();}});
    caixa.append(gatilho,menu);return {caixa,gatilho};
}
function botaoMais(nome,aoClicar,b=botao('⋯',aoClicar)){b.textContent='⋯';b.className='op-acao-mais';b.setAttribute('aria-label','Ver detalhes de '+nome);b.title='Ver detalhes';return b;}
// Status do aluno (decisão do João em 31/10): não existe mais o "Pendente". Inativo, Incompleto (faltam dados) ou a etapa
// da jornada até a habilitação — calculada aqui quando a ficha já trouxe exames e provas, senão a que a API manda.
const ETAPAS_ALUNO=['Incompleto','Exames','Prova teórica','LADV','Aulas práticas','Prova prática','Habilitado','Inativo'];
const situacaoCadastro=a=>a.situacao==='Inativo'?'Inativo':a.situacao==='Incompleto'||!a.nascimento||!a.email||!a.telefone?'Incompleto':(a.examesAdministrativos||a.tentativasProvas?etapaAtual(a):a.etapa)||'Exames';
const etapaDoFiltro=a=>situacaoCadastro(a).startsWith('Prova prática')?'Prova prática':situacaoCadastro(a);
function campos(itens) {const dl=el('dl',undefined,'op-fields');for(const [k,v] of itens){const item=el('div');item.append(el('dt',k),el('dd',v==null||v===''?'Não informado':String(v)));dl.append(item);}return dl;}
function tabela(titulos,linhas,vazio='Nenhum registro disponível.',ordem) {
    const wrap=el('div',undefined,'op-table-scroll'), table=el('table',undefined,'op-table'),head=el('thead'),tr=el('tr'),body=el('tbody');
    wrap.tabIndex=0;wrap.setAttribute('role','region');wrap.setAttribute('aria-label',titulos.join(', '));
    titulos.forEach(t=>{const th=el('th',t);th.scope='col';tr.append(th);});head.append(tr);
    linhas.forEach(valores=>{const linha=el('tr');valores.forEach(v=>{const td=el('td');td.append(v instanceof Node?v:document.createTextNode(String(v??'Não informado')));linha.append(td);});body.append(linha);});
    if(!linhas.length){const row=el('tr'),td=el('td',vazio,'op-demo-no-results');td.colSpan=titulos.length;row.append(td);body.append(row);}
    table.append(head,body);tornarOrdenavel(table,ordem);wrap.append(table);return wrap;
}

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
    $('.op-notice').hidden=true;
    const feedback=el('p',avisoInicial,'op-demo-feedback');feedback.setAttribute('role','status');feedback.setAttribute('aria-live','polite');feedback.hidden=!avisoInicial;$('.op-header').after(feedback);
    const informar=(texto,erro=false)=>{
        if(!texto){feedback.hidden=true;return;}
        feedback.textContent=texto;feedback.hidden=false;feedback.dataset.erro=String(erro);
        const aberto=[...raiz.querySelectorAll('dialog[open]')].at(-1);
        if(aberto){let aviso=aberto.querySelector(':scope>.op-modal-feedback');if(!aviso){aviso=el('p',undefined,'op-modal-feedback op-help');aberto.querySelector('.op-dialog-heading').after(aviso);}aviso.textContent=texto;aviso.setAttribute('role',erro?'alert':'status');}
        mostrarToast(texto,erro);
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
    const cadastrar=$('[data-op-cadastro]'),novo=cadastrar.cloneNode(true);cadastrar.replaceWith(novo);novo.addEventListener('click',()=>abrirCadastro());
    // O cadastro do aluno abre em popup (decisão do João em 31/10): o link do menu e o atalho não trocam de aba.
    raiz.addEventListener('click',e=>{if(e.target.closest('[data-op-nav=cadastro],[data-op-go=cadastro]')){e.preventDefault();e.stopImmediatePropagation();abrirCadastro();}},true);

    const estadoAgenda=()=>({...dados,alunos:[...dados.alunos,...dados.pista],recursos:dados.recursos.map(r=>({...r,unidade:unidade(r.unidade)})),aulas:dados.aulas.map(a=>({...a,unidade:unidade(a.unidade)}))});
    const detalhes=criarDetalhesAula(raiz,estadoAgenda,{servico,executar});
    async function executar(acao,mensagem,apos) {
        if(atualizando)return false;atualizando=true;raiz.setAttribute('aria-busy','true');
        try{await acao();dados=await servico.consultar();atualizar();informar(mensagem);await apos?.();return true;}
        catch(e){const campos=marcarErrosDoServidor(e);informar(campos?(campos>1?'Corrija os campos destacados em vermelho.':'Corrija o campo destacado em vermelho.'):e.message||'Não foi possível concluir a operação.',true);return false;}
        finally{atualizando=false;raiz.removeAttribute('aria-busy');}
    }
    // Consultas que alimentam filtros nunca alteram a coleção persistida.
    const filtros={busca:entrada('search'),situacao:select([['','Todas'],...ETAPAS_ALUNO]),categoria:select([['','Todas'],'A','B','D','AB']),principal:select([['','Todas'],...UNIDADES]),carro:select([['','Todas'],...UNIDADES])};
    filtros.busca.placeholder='Nome ou CPF';filtros.busca.dataset.opBusca='';
    const filtrosVazios=()=>Object.fromEntries(Object.keys(filtros).map(k=>[k,'']));let filtrosAplicados=filtrosVazios();
    const barra=el('form',undefined,'op-local-filters');barra.setAttribute('role','search');barra.setAttribute('aria-label','Pesquisa de alunos autorizados');
    function pesquisar(){const novos=Object.fromEntries(Object.entries(filtros).map(([k,c])=>[k,c.value]));if(pagina===1&&JSON.stringify(novos)===JSON.stringify(filtrosAplicados))return;filtrosAplicados=novos;pagina=1;listar();}
    barra.addEventListener('submit',e=>{e.preventDefault();pesquisar();});
    for(const [k,t] of [['busca','Buscar aluno'],['situacao','Etapa'],['categoria','Categoria'],['principal','Unidade principal'],['carro','Unidade de carro']]){
        const grupo=el('div',undefined,'op-aluno-filter'),label=el('label',t),linha=el('div',undefined,'op-aluno-filter-input'),lupa=botao('',pesquisar,'op-aluno-search-button');
        filtros[k].dataset.opFiltro=k;filtros[k].id=`op-alunos-filtro-${k}`;label.htmlFor=filtros[k].id;
        lupa.dataset.opPesquisar=k;lupa.setAttribute('aria-label',`Pesquisar com todos os filtros: ${t}`);lupa.title='Pesquisar com todos os filtros';
        lupa.append(iconeSvg('search'));
        // Dropdown aplica ao escolher (sem lupa); a lupa fica só na busca por nome ou CPF.
        if(k==='busca')linha.append(filtros[k],lupa);else{linha.append(filtros[k]);filtros[k].addEventListener('change',pesquisar);}grupo.append(label,linha);barra.append(grupo);
    }
    const limparBusca=botao('Limpar filtros',()=>{Object.values(filtros).forEach(c=>c.value='');filtrosAplicados=filtrosVazios();pagina=1;listar();},'op-button op-button-outline');limparBusca.dataset.opLimparBusca='';const acoesBusca=el('div',undefined,'op-aluno-filter-actions');acoesBusca.append(limparBusca);barra.append(acoesBusca);
    // Só entradas numéricas/pontuadas recebem máscara; nomes com números continuam nomes.
    const termoCPF=texto=>/^[\d.\-\s]+$/.test(texto)&&/\d/.test(texto);
    ativarMascaraCpf(filtros.busca,{permitirNome:true});
    filtros.busca.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();pesquisar();}});
    const lista=el('div'),paginacao=el('nav',undefined,'op-local-pagination');paginacao.setAttribute('aria-label','Páginas de alunos');const quantidade=el('p',undefined,'op-help');quantidade.dataset.opContagem='';
    painel('alunos').replaceChildren(card('Alunos autorizados',barra,quantidade,lista,paginacao));
    const ordemAlunos=estadoOrdenacao();
    function listar(){
        const f=filtrosAplicados,termo=f.busca.trim().toLocaleLowerCase('pt-BR'),numeros=termo.replace(/\D/g,''),cpf=termoCPF(termo);
        const alunos=dados.alunos.filter(a=>(!termo||(cpf?(numeros.length===11?a.cpf===numeros:a.cpf.includes(numeros)):a.nome.toLocaleLowerCase('pt-BR').includes(termo)))&&(!f.situacao||etapaDoFiltro(a)===f.situacao)&&(!f.categoria||a.categoria===f.categoria)&&(!f.principal||principal(a)===f.principal)&&(!f.carro||carro(a)===f.carro));
        const total=Math.ceil(alunos.length/10);pagina=Math.max(1,Math.min(pagina,total||1));quantidade.textContent=`${alunos.length} aluno(s) · somente vínculos autorizados`;
        lista.replaceChildren(tabela(['Aluno / CPF','Categoria','Unidade principal','Aulas de carro','Etapa','Ações'],ordenarLinhas(alunos.map(a=>{
            const n=el('div'),abrir=botao(a.nome,()=>abrirFicha(a.id),'op-link');abrir.dataset.opAluno=a.id;n.append(abrir,el('small',formatarCpf(a.cpf)));const acoes=el('div',undefined,'op-linha-acoes');{const podeAlterar=!!servico.corrigirAluno&&permissoes.includes('corrigir-registro'),ativo=a.situacao!=='Inativo',chave=chaveSituacao(ativo,a.nome,()=>formularioAdministrativo(raiz,(ativo?'Inativar':'Ativar')+' aluno',[['justificativa','Justificativa','textarea','']],async d=>{await servico.corrigirAluno(a.id,{situacao:ativo?'Inativo':'Regular'},d.justificativa);await dadosAtualizados();},{descricao:a.nome+(ativo?' deixa de poder reservar aulas.':' volta a poder reservar aulas.')}));chave.dataset.opSituacaoAluno=a.id;if(!podeAlterar){chave.disabled=true;chave.title=(ativo?'Ativo':'Inativo')+' · só a Gerência ativa ou inativa o aluno';}acoes.append(chave);}const podeEditar=permissoes.includes('editar-cadastro');
            const menu=menuAcoes(a.nome,[['Visualizar',()=>abrirFicha(a.id),'olho'],['Editar',podeEditar&&(()=>abrirFicha(a.id,'cadastro',{editar:true})),'lapis']]);menu.gatilho.dataset.opAlunoAcoes=a.id;acoes.append(menu.caixa);
            return [n,a.categoria,nomeUnidade(principal(a)),carro(a)?nomeUnidade(carro(a)):'Não se aplica',badge(situacaoCadastro(a)),acoes];
        }),ordemAlunos).slice((pagina-1)*10,pagina*10),'Nenhum aluno encontrado para os filtros informados.',{estado:ordemAlunos,aoMudar:()=>{pagina=1;listar();}}));
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
    const revisar=el('button','Confirmar cadastro','op-button op-button-primary');revisar.type='submit';revisar.disabled=!permissoes.includes('cadastrar')||!permissoes.includes('anotar');form.append(erroCadastro,revisar);const dialogoCadastro=modal(raiz,'Cadastrar aluno','opCadastroAluno');dialogoCadastro.append(el('p','Registre as aulas adquiridas por categoria. As aulas adquiridas ficam disponíveis automaticamente para agendamento.','op-help'),form);
    function abrirCadastro(){if(!dialogoCadastro.open)dialogoCadastro.showModal();}
    const confirmarCadastro=modal(raiz,'Confirmar cadastro?','opConfirmarCadastro'),resumoCadastro=el('div',undefined,'op-confirm-grid'),erroConfirmacao=el('p');erroConfirmacao.setAttribute('role','alert');let cadastroPendente,chaveCadastro;
    let salvandoCadastro=false;
    const voltarCadastro=botao('Voltar',()=>confirmarCadastro.close());
    const salvarCadastro=botao('Confirmar cadastro',async()=>{if(salvandoCadastro)return;salvandoCadastro=true;salvarCadastro.disabled=true;voltarCadastro.disabled=true;confirmarCadastro.querySelector('.op-close').disabled=true;salvarCadastro.textContent='Criando cadastro e acesso…';confirmarCadastro.setAttribute('aria-busy','true');try{let criado;const nomeCriado=cadastroPendente.nome;const ok=await executar(async()=>{criado=await servico.cadastrar(cadastroPendente,chaveCadastro);},'',()=>{confirmarCadastro.close();form.reset();validacaoIniciada=false;mostrarErrosCadastro({});cadastroPendente=null;chaveCadastro=null;camposCadastro.unidade.value=nomeUnidade(propria);categoriaCadastro();dialogoCadastro.close();navegacao.navegar('alunos');mostrarSenhaProvisoria(raiz,{titulo:'Acesso do aluno criado',nome:nomeCriado,senha:criado?.senhaProvisoria});});if(!ok)erroConfirmacao.textContent=feedback.textContent;}finally{salvandoCadastro=false;salvarCadastro.disabled=false;voltarCadastro.disabled=false;confirmarCadastro.querySelector('.op-close').disabled=false;salvarCadastro.textContent='Confirmar cadastro';confirmarCadastro.removeAttribute('aria-busy');}},'op-button op-button-primary');
    confirmarCadastro.addEventListener('cancel',e=>{if(salvandoCadastro)e.preventDefault();});const rodapeCadastro=el('footer',undefined,'op-confirm-actions');rodapeCadastro.append(voltarCadastro,salvarCadastro);confirmarCadastro.append(resumoCadastro,el('p',servico.senhaPeloServidor?'A conta será vinculada a este cadastro. O servidor gera a senha provisória, mostrada uma única vez, que deve ser trocada no primeiro acesso.':'A conta será vinculada a este cadastro. A senha provisória usa os seis primeiros dígitos do CPF e deve ser trocada no primeiro acesso.','op-help'),erroConfirmacao,rodapeCadastro);
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

    const ficha=modal(raiz,'Ficha completa do aluno','opFicha'),fichaConteudo=el('div',undefined,'op-ficha-conteudo');ficha.append(fichaConteudo);let abaFicha='cadastro',consultaFicha=0;
    let editarAoAbrir=false;
    async function abrirFicha(id,aba='cadastro',{editar=false}={}) {alunoAtual=id;abaFicha=aba;editarAoAbrir=editar;ficha.dataset.opAlunoAtual=id;try{await renderizarFicha();if(!ficha.open)ficha.showModal();}catch(e){informar(e.message,true);}finally{editarAoAbrir=false;}}
    // Trocar de aba reaproveita a última consulta do mesmo aluno; abrir a ficha ou salvar algo (reabrir) consulta de novo.
    let fichaEmCache=null;
    async function renderizarFicha(recarregar=true){
        const consulta=++consultaFicha;let resposta;
        if(!recarregar&&fichaEmCache?.id===alunoAtual)resposta=fichaEmCache.resposta;
        else{const carregando=el('p','Consultando registros…','op-help');carregando.setAttribute('role','status');fichaConteudo.prepend(carregando);fichaConteudo.setAttribute('aria-busy','true');
        try{resposta=await servico.ficha(alunoAtual);fichaEmCache={id:alunoAtual,resposta};}catch(erro){if(consulta===consultaFicha){fichaConteudo.replaceChildren(el('p','Não foi possível consultar os registros. Feche e reabra a ficha para tentar novamente.','op-help'));}throw erro;}finally{carregando.remove();if(consulta===consultaFicha)fichaConteudo.removeAttribute('aria-busy');}}
        if(consulta!==consultaFicha)return;
        if(abaFicha==='senha')abaFicha='acesso';
        ficha.dataset.opAba=abaFicha;
        const {aluno:a,resumoAulas,resumoLiberacao,aulas,linhaTempo}=resposta;ficha.querySelector('.op-dialog-heading h2').textContent=a.nome;
        const subtitulo=el('p',undefined,'op-ficha-subtitulo');subtitulo.append(`${formatarCpf(a.cpf)} · Categoria ${a.categoria||'não informada'} · `,badge(situacaoCadastro(a)));fichaConteudo.replaceChildren(subtitulo);
        const abas=el('div',undefined,'op-local-tabs');abas.setAttribute('aria-label','Seções da ficha');
        for(const [id,titulo] of [['cadastro','Cadastro'],['etapas','Exames'],['provas','Provas'],['creditos','Aulas'],['historico','Histórico'],['acesso','Acesso']]){const b=botao(titulo,()=>{abaFicha=id;renderizarFicha(false).catch(e=>informar(e.message,true));});b.dataset.opFichaAba=id;b.setAttribute('aria-pressed',String(abaFicha===id));b.className='op-ficha-aba';abas.append(b);}fichaConteudo.append(abas);
        const contextoFicha={raiz,servico,permissoes,executar,reabrir:renderizarFicha};
        if(abaFicha==='cadastro'){
            const cadastroArea=el('section');fichaConteudo.append(cadastroArea);
            let aulasDeCarro=carro(a)?nomeUnidade(carro(a)):'Não se aplica';
            // Contratação com o link para contratar um pacote no balcão (a Recepção abre; a Gerência aprova o pagamento).
            function contratacaoComAcao(a){
                const valor=el('span',undefined,'op-ficha-valor-acao');valor.append(textoContratacoes(a.contratacoes)+' ');
                if(!servico.contratarPacote||!permissoes.includes('cadastrar'))return valor;
                const contratar=botao('Contratar pacote',async()=>{
                    let pacotes;try{pacotes=await servico.pacotes();}catch(e){informar(e.message,true);return;}
                    if(!pacotes.length){informar('Nenhum pacote cadastrado nesta autoescola.',true);return;}
                    const real=v=>Number(v||0).toLocaleString('pt-BR',{style:'currency',currency:'BRL'}),aprova=identidade.nivel>=2;
                    formularioAdministrativo(raiz,'Contratar pacote',[['pacote','Pacote','select',pacotes[0].id,pacotes.map(p=>[p.id,`${p.nome} · ${p.quantidade} aulas · ${p.categorias.join('/')||'—'} · ${real(p.preco)}`])],...(aprova?[['aprovar','Pagamento recebido: aprovar agora','checkbox',true]]:[])],
                        d=>executar(()=>servico.contratarPacote(a.id,d.pacote,d.aprovar===true),aprova&&d.aprovar?'Pacote contratado e aprovado.':'Pacote contratado. Aguarda a aprovação da Gerência.',()=>renderizarFicha()),
                        {confirmacao:false,descricao:`${a.nome}. `+(aprova?'Sem marcar o pagamento, a contratação fica pendente.':'A contratação fica pendente até a Gerência aprovar o pagamento.')});
                },'op-link');contratar.dataset.opContratarPacote='';valor.append(contratar);return valor;
            }
            if(a.categoria.includes('B')){const valor=el('span',undefined,'op-ficha-valor-acao'),alterar=botao('Alterar',()=>abrirTransferencia(a),'op-link');alterar.dataset.opTransferir='';alterar.disabled=!permissoes.includes('transferir');alterar.setAttribute('aria-label','Alterar unidade de aulas de carro');valor.append(aulasDeCarro+' ',alterar);aulasDeCarro=valor;}
            cadastroArea.append(blocoFicha('Dados pessoais',camposFicha([['Nome completo',a.nome],['CPF',formatarCpf(a.cpf)],['Nascimento',textoData(a.nascimento)],['Telefone',formatarTelefone(a.telefone)],['E-mail',a.email]])),
                blocoFicha('Matrícula',camposFicha([['Categoria',a.categoria],...(a.contratacoes?[['Contratação',contratacaoComAcao(a)]]:[]),['Unidade principal',nomeUnidade(principal(a))],...(a.categoria.includes('B')?[['Tipo de carro',nomeCambio(a.tipoCambio)]]:[]),['Aulas de carro',aulasDeCarro],['Etapa',badge(situacaoCadastro(a))],['Criado em',dataHoraCurta(a.criadoEm)]])));
            if(a.categoria==='D')cadastroArea.append(el('p',AVISO_ONIBUS+' '+Object.values(LOCAIS_ONIBUS).map(l=>l.endereco).join(' '),'op-inline-note'));if(a.categoria.includes('A'))cadastroArea.append(el('p',pista.textContent,'op-inline-note'));
            const notas=el('textarea');notas.value=a.observacoes||'';notas.maxLength=2000;notas.rows=3;notas.disabled=!permissoes.includes('anotar');const salvar=botao('Salvar observações',()=>executar(()=>servico.anotar(a.id,notas.value),'Observações salvas.',renderizarFicha),'op-button op-button-primary');salvar.disabled=true;notas.addEventListener('input',()=>{salvar.disabled=notas.disabled||notas.value===(a.observacoes||'');});
            const acoesNotas=el('div',undefined,'op-ficha-acoes-notas');acoesNotas.append(salvar);cadastroArea.append(blocoFicha('Observações administrativas',notas,acoesNotas));notas.setAttribute('aria-label','Observações administrativas');
            // Editar cadastro e correções (Gerência e Master) ficam numa barra no topo; a edição troca a aba pelo formulário.
            const antes=cadastroArea.childElementCount;montarEdicaoCadastro(cadastroArea,a,contextoFicha,{aberto:editarAoAbrir&&abaFicha==='cadastro'});const extras=[...cadastroArea.children].slice(antes);if(extras.length){const barra=el('div',undefined,'op-ficha-barra');barra.append(...extras);cadastroArea.prepend(barra);}
            if(!cadastroArea.querySelector('[data-op-editar-cadastro]'))montarJornada(cadastroArea,a);
            if(servico.identidade.nivel===3&&permissoes.includes('excluir-cadastro')&&servico.excluirCadastro)cadastroArea.append(botao('Excluir',()=>confirmarExclusao(raiz,servico,'aluno',a,()=>location.reload())));

        }
        if(abaFicha==='etapas')montarExamesProvas(fichaConteudo,a,contextoFicha);
        if(abaFicha==='provas'){montarProvas(fichaConteudo,a,contextoFicha);const painel=el('section');painel.dataset.opProvasAgendadas='';montarHistoricoProvas(painel,a,contextoFicha);fichaConteudo.append(painel);}
        if(abaFicha==='creditos'){
            // Aba Aulas enxuta: uma faixa com a liberação (bloqueio em destaque) e, por categoria, o progresso das aulas
            // realizadas sobre as adquiridas e os números que importam para agendar.
            const bloqueio=resumoLiberacao.motivoBloqueio,semSaldo=!bloqueio&&Object.values(resumoLiberacao.categorias||{}).every(s=>!(s?.disponiveis>0));
            const faixa=el('div',undefined,'op-aulas-liberacao'+(bloqueio?' op-aulas-bloqueada':semSaldo?' op-aulas-sem-saldo':''));faixa.setAttribute('role',bloqueio?'alert':'status');
            faixa.append(el('strong',bloqueio?'Agendamento bloqueado':semSaldo?'Sem aulas disponíveis':'Liberado para agendar'),el('span',bloqueio?bloqueio:semSaldo?'Todas as aulas já estão reservadas ou realizadas. Contrate um pacote na aba Cadastro.':'Há aulas disponíveis para agendar.'));fichaConteudo.append(faixa);
            const grade=el('div',undefined,'op-resumo-aulas'),numero=(chave,v)=>{const n=el('strong',v===null||v===undefined?'—':String(v));n.dataset.opTotal=chave;return n;};
            for(const [c,resumo] of Object.entries(resumoAulas)){
                const saldos=resumoLiberacao.categorias[c],item=el('section',undefined,'op-resumo-aulas-card');item.dataset.opResumoCategoria=c;
                const topo=el('header'),progresso=el('p',undefined,'op-resumo-progresso');progresso.append(numero('adquiridas',resumo.adquiridas),' aulas adquiridas');
                topo.append(el('h4',`${NOMES_CATEGORIA[c]} · Categoria ${c}`),progresso);
                const total=Math.max(Number(resumo.adquiridas)||0,1),barra=el('div',undefined,'op-resumo-barra'),feitas=el('span',undefined,'op-resumo-barra-feitas'),reservadas=el('span',undefined,'op-resumo-barra-reservadas');
                feitas.style.width=Math.min(100,(Number(saldos.realizadas)||0)/total*100)+'%';reservadas.style.width=Math.min(100,(Number(saldos.reservadas)||0)/total*100)+'%';barra.append(feitas,reservadas);barra.setAttribute('aria-hidden','true');
                const numeros=el('dl');for(const [chave,titulo,v] of [['disponiveis','Disponíveis',saldos.disponiveis],['reservadas','Reservadas',saldos.reservadas],['realizadas','Realizadas',saldos.realizadas],['faltas','Faltas',resumo.faltas]]){const linha=el('div'),dd=el('dd');dd.append(numero(chave,v));linha.append(el('dt',titulo),dd);numeros.append(linha);}
                item.append(topo,barra,numeros);grade.append(item);
            }
            fichaConteudo.append(grade);
        }
        if(abaFicha==='historico')montarLinhaTempo(fichaConteudo,linhaTempo,{abrirAula:id=>{const aula=aulas.find(a=>a.id===id);if(aula)detalhes.abrir(aula);}});
        if(abaFicha==='acesso'){fichaConteudo.append(campos([['Login (CPF)',formatarCpf(a.cpf)],['E-mail',a.email||'Não cadastrado'],['Último acesso',a.ultimoAcessoEm?dataHoraCurta(a.ultimoAcessoEm):'Ainda não entrou']]));

        }
        if(abaFicha==='acesso')await montarAcessoAluno(fichaConteudo,a,contextoFicha);
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
        const grade=el('div',undefined,'op-quick-grid');
        for(const [secao,titulo,descricao,simbolo] of [
            ['cadastro','Cadastrar aluno','Abra o formulário de cadastro e vínculos do aluno.','plus'],
            ['alunos','Consultar alunos','Busque os alunos autorizados para sua unidade.','users'],
            ['agenda','Consultar agendas','Consulte aulas e disponibilidade da unidade.','grid'],
            ['instrutores','Consultar instrutores','Veja os profissionais vinculados à unidade.','users'],
            ['recursos','Veículos e recursos','Consulte veículos e equipamentos da unidade.','car'],
        ]){
            const atalho=botao('',()=>secao==='cadastro'?abrirCadastro():navegacao.navegar(secao),'op-quick-action'),texto=el('span',undefined,'op-quick-copy');
            atalho.dataset.opAtalho=secao;texto.append(el('strong',titulo),el('span',descricao));
            atalho.append(iconeSvg(simbolo),texto,iconeSvg('arrow'));grade.append(atalho);
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
        busca.oninput=()=>{filtrosInstrutores.busca=busca.value;const pos=busca.selectionStart;recursos(tipo,secao);const n=painel(secao).querySelector('[data-op-busca-instrutor]');n.focus();n.setSelectionRange(pos,pos);};cat.onchange=()=>{filtrosInstrutores.categoria=cat.value;recursos(tipo,secao);};if(tipo==='Instrutores')barra.append(campo('Buscar instrutor',busca),campo('Categoria',cat));
        if(identidade.nivel>=2){barra.hidden=false;const u=select([['','Todas as unidades'],...UNIDADES.filter(([id])=>identidade.nivel===3||identidade.unidades?.includes(id))],filtrosInstrutores.unidade),st=select([['','Todas as situações'],['true','Ativos'],['false','Inativos']],filtrosInstrutores.situacao);u.onchange=()=>{filtrosInstrutores.unidade=u.value;recursos(tipo,secao);};st.onchange=()=>{filtrosInstrutores.situacao=st.value;recursos(tipo,secao);};barra.append(campo('Unidade',u),campo('Situação',st));}
        if(tipo==='Instrutores')barra.append(botao('Limpar filtros',()=>{for(const k of Object.keys(filtrosInstrutores))filtrosInstrutores[k]='';recursos(tipo,secao);}));
        const criar=botaoCadastroRecurso(raiz,tipo==='Instrutores'?'Instrutores':'Veículos',servico,executar,()=>recursos(tipo,secao));criar.disabled=!permissoes.includes('cadastrar-recurso');
        painel(secao).replaceChildren(card(tipo==='Instrutores'?'Instrutores vinculados':'Veículos e equipamentos',criar,el('p','Consulta por escopo autorizado. Instrutores da própria unidade podem ser editados pela recepção; consulta operacional externa não concede edição.','op-help'),barra,tabela(tipo==='Instrutores'?['Nome','Identificação','Categorias','Unidade','Veículo vinculado','Situação','Ações']:['Identificação / modelo','Placa','Categoria / tipo','Unidade','Disponibilidade',''],registros.map(recurso=>{let r=recurso;
            const ver=botao('Ver detalhes',async()=>{try{r=await servico.recursoAdministrativo(r.id);}catch(e){informar(e.message,true);return;}if(r.tipo==='Instrutores'){abrirFichaInstrutor(raiz,servico,r.id,{aoEditar:(i,d)=>abrirFormularioInstrutor(raiz,servico,executar,()=>{d.close();recursos(tipo,secao);painel(secao).querySelector('[data-op-recurso=\"'+i.id+'\"]')?.click();},i)});return;}const d=modal(raiz,'Detalhes do recurso','opRecurso'),acoes=montarDetalhesRecurso(d,r,dados.recursos);if(r.tipo==='Instrutores'&&unidade(r.unidade)===propria&&permissoes.includes('editar-instrutor'))acoes.append(botao('Editar instrutor',()=>abrirFormularioInstrutor(raiz,servico,executar,()=>{d.close();recursos(tipo,secao);const atual=dados.recursos.find(x=>x.id===r.id);if(atual){const b=painel(secao).querySelector('[data-op-recurso="'+r.id+'"]');b?.click();}},r),'op-button op-button-primary'));if(r.tipo==='Veículos'&&permissoes.includes('editar-veiculo'))acoes.append(botao('Editar veículo',()=>abrirFormularioVeiculo(raiz,servico,executar,()=>{d.close();recursos(tipo,secao);painel(secao).querySelector('[data-op-recurso="'+r.id+'"]')?.click();},r),'op-button op-button-primary'));if(servico.situacaoRecurso&&permissoes.includes('gerenciar-situacao'))acoes.append(botao('Gerenciar situação',()=>gerirSituacaoRecurso(raiz,servico,r,async()=>{await dadosAtualizados();d.close();})));if(r.tipo==='Veículos'&&servico.identidade.nivel===3&&permissoes.includes('excluir-cadastro')&&servico.excluirCadastro)acoes.append(botao('Excluir',()=>confirmarExclusao(raiz,servico,'veiculo',r,()=>location.reload())));d.addEventListener('close',()=>d.remove(),{once:true});d.showModal();});
            ver.dataset.opRecurso=r.id;const acoesLinha=el('div',undefined,'op-linha-acoes');if(tipo==='Instrutores'){if(servico.situacaoRecurso&&permissoes.includes('gerenciar-situacao')){const sit=chaveSituacao(r.ativo,r.nome,()=>alternarSituacaoRecurso(raiz,servico,r,dadosAtualizados));sit.dataset.opSituacaoRecurso=r.id;acoesLinha.append(sit);}
                const editarInstrutor=permissoes.includes('editar-instrutor')&&(async()=>{try{const i=await servico.recursoAdministrativo(r.id);abrirFormularioInstrutor(raiz,servico,executar,()=>recursos(tipo,secao),i);}catch(e){informar(e.message,true);}});
                const menu=menuAcoes(r.nome,[['Visualizar',()=>ver.click(),'olho'],['Editar',editarInstrutor,'lapis']]);menu.gatilho.dataset.opInstrutorAcoes=r.id;ver.hidden=true;acoesLinha.append(menu.caixa);}acoesLinha.append(ver);return tipo==='Instrutores'?[r.nome,r.identificacao||'Não informada',r.categorias?.join(', ')||'Não informadas',nomeUnidade(r.unidade),dados.recursos.filter(v=>v.tipo==='Veículos'&&(v.instrutorId?v.instrutorId===r.id:r.veiculoIds?.includes(v.id))).map(v=>v.nome).join('; ')||'Sem veículo',r.ativo?(r.disponivel===false?'Indisponível':'Ativo'):'Inativo',acoesLinha]:[`${r.nome}${r.modelo?' / '+r.modelo:''}`,r.placa||'Não informada',(r.categoria||r.tipo)+(r.categoria==='B'?' · '+nomeCambio(r.tipoCambio):''),nomeUnidade(r.unidade),r.ativo&&r.disponivel!==false?'Ativo · sujeito à agenda':'Indisponível',ver];
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
