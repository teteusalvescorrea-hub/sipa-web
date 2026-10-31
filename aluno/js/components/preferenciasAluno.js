import {localCarro,nomeCambio,recursoCarroConsultavel} from '../../../shared/js/operacaoCarro.js';
import { UNIDADES_INSTITUCIONAIS, obterUnidadeInstitucional, normalizarChaveUnidade } from '../../../shared/js/catalogoUnidades.js';
import { HORAS_AGENDAMENTO } from '../domain/agendamentoAluno.js';
import {localCategoriaD,AVISO_ONIBUS,recursosOperacionaisD} from '../../../shared/js/categorias.js';

const criar = (tag, texto, classe) => { const n=document.createElement(tag); if(texto)n.textContent=texto; if(classe)n.className=classe; return n; };
const marcados = (form,nome) => [...form.querySelectorAll('input[name="'+nome+'"]:checked')].map(n=>n.value);
function grupo(form,nome,titulo,opcoes,selecionados=[]) {
    const f=criar('fieldset'),l=criar('legend',titulo),lista=criar('div',null,'preference-options');f.dataset.grupo=nome;f.append(l,lista);
    for(const [valor,texto] of opcoes){const label=criar('label'),i=criar('input');i.type='checkbox';i.name=nome;i.value=String(valor);i.checked=selecionados.map(String).includes(String(valor));label.append(i,document.createTextNode(texto));lista.append(label);}
    form.append(f);return f;
}
const dias = [[1,'Segunda'],[2,'Terça'],[3,'Quarta'],[4,'Quinta'],[5,'Sexta'],[6,'Sábado']];
const unidades = UNIDADES_INSTITUCIONAIS.map(u=>[u.id,u.nome]);
function periodos(form) {
    const box=criar('div',null,'preference-periods');
    for(const [nome,horas] of [['Marcar manhã',HORAS_AGENDAMENTO.filter(h=>h<'11:00')],['Marcar tarde',HORAS_AGENDAMENTO.filter(h=>h>='13:00')]]){
        const b=criar('button',nome);b.type='button';b.onclick=()=>{form.querySelectorAll('input[name=horarios]').forEach(i=>{if(horas.includes(i.value))i.checked=true;});form.dispatchEvent(new Event('input',{bubbles:true}));};box.append(b);
    }
    form.querySelector('[data-grupo=horarios] legend').after(box);
}
function botao(texto,id){const b=criar('button',texto);b.type='button';if(id)b.id=id;return b;}
function feedback(erro,elemento){elemento.textContent=erro.message || String(erro);elemento.setAttribute('role','alert');}

export async function montarAgendamentoAutomatico(servico,aoConfirmar) {
    const manual=document.querySelector('.booking-content');
    if(!manual||document.getElementById('automatic-booking'))return;
    let dados=await servico.dadosAlunoLocal(),salvo=dados.aluno?.preferenciasAutomaticas;
    const modos=criar('div',null,'booking-mode-choice');modos.setAttribute('role','group');modos.setAttribute('aria-label','Forma de agendamento');
    const bManual=botao('Agendamento manual','booking-mode-manual'),bAuto=botao('Agendamento automático','booking-mode-auto');modos.append(bManual,bAuto);manual.before(modos);
    const secao=criar('section',null,'student-preferences');secao.id='automatic-booking';secao.hidden=true;manual.after(secao);
    secao.append(criar('h2','Agendamento automático'),criar('p','Escolha suas preferências. A busca considera os próximos 90 dias. A proposta só vira reserva após sua confirmação.'));
    const form=criar('form');form.noValidate=true;const campos=criar('fieldset');campos.className='preference-fields';form.append(campos);secao.append(form);
    const label=criar('label','Categoria'),categoria=criar('select');categoria.name='categoria';categoria.id='auto-categoria';label.htmlFor=categoria.id;categoria.append(new Option('Categoria A — Moto','A'),new Option('Categoria B — Carro','B'),...((dados.categorias?.includes('D')||dados.resumo.categorias.D?.total>0)?[new Option('Categoria D — Ônibus','D')]:[]));if(dados.categorias?.length)for(const o of [...categoria.options])if(!dados.categorias.includes(o.value))o.remove();categoria.value=salvo?.categoria||dados.categorias?.[0]||'B';label.append(categoria);campos.append(label);
    grupo(campos,'unidades','Unidades aceitas',unidades,salvo?.unidades||[dados.aluno?.unidade].filter(Boolean));
    grupo(campos,'dias','Dias da semana',dias,salvo?.dias||[1,2,3,4,5,6]);
    grupo(campos,'horarios','Horários de início',HORAS_AGENDAMENTO.map(h=>[h,h]),salvo?.horarios||HORAS_AGENDAMENTO);periodos(form);
    const instrutores=grupo(campos,'instrutores','Instrutores preferidos',[]),veiculos=grupo(campos,'veiculos','Veículos preferidos',[]);
    const instrucoes=criar('p','Nenhum recurso marcado significa sem preferência. A busca sempre exige um instrutor e um veículo compatíveis e disponíveis.');campos.append(instrucoes);
    const qtdLabel=criar('label','Quantidade de aulas'),qtd=criar('input');qtd.type='number';qtd.name='quantidade';qtd.id='auto-quantidade';qtd.min='1';qtd.value=String(salvo?.quantidade||1);qtdLabel.htmlFor=qtd.id;qtdLabel.append(qtd);campos.append(qtdLabel);
    const saldo=criar('p');saldo.id='auto-saldo';campos.append(saldo);
    const acoes=criar('div',null,'preference-actions'),salvar=botao('Salvar preferências','auto-salvar'),buscar=botao('Buscar horários automaticamente','auto-buscar');acoes.append(salvar,buscar);campos.append(acoes);
    const msg=criar('p');msg.id='auto-feedback';msg.setAttribute('role','status');const resultado=criar('div');resultado.id='auto-proposta';form.append(msg,resultado);
    let proposta=null,operacaoId=null,ocupado=false;
    const valores=()=>({categoria:categoria.value,unidades:marcados(form,'unidades'),dias:marcados(form,'dias').map(Number),horarios:marcados(form,'horarios'),instrutores:marcados(form,'instrutores'),veiculos:marcados(form,'veiculos'),quantidade:Number(qtd.value)});
    function recursos(inicial=false){
        const fixa=categoria.value==='D'?'Cobilândia':categoria.value==='A'?'Vila Velha':dados.aluno?.unidadeCarro||dados.aluno?.unidade;
        const grupoUnidades=form.querySelector('[data-grupo=unidades]');
        grupoUnidades.hidden=Boolean(fixa);
        if(fixa)grupoUnidades.querySelectorAll('input').forEach(i=>{i.checked=i.value===fixa;});
        let aviso=form.querySelector('[data-local-fixo]');if(!aviso){aviso=criar('p');aviso.dataset.localFixo='';grupoUnidades.after(aviso);}aviso.hidden=!fixa;aviso.textContent=categoria.value==='D'?AVISO_ONIBUS:categoria.value==='B'?'Carro '+nomeCambio(dados.aluno.tipoCambio)+' · unidade cadastrada: '+(obterUnidadeInstitucional(fixa)?.nome||fixa)+'. O local pode variar conforme a data.':'Categoria A: aulas na pista Centro de Vila Velha.';
        const us=marcados(form,'unidades');
        for(const [tipo,box] of [['instrutor',instrutores],['veiculo',veiculos]]){
            const nome=tipo==='instrutor'?'instrutores':'veiculos',antes=inicial?salvo?.[nome]||[]:marcados(form,nome),lista=box.querySelector('.preference-options');lista.replaceChildren();
            const rs=dados.registros.filter(r=>r.tipo===tipo&&r.ativo===true&&r.disponivel!==false&&(categoria.value==='D'?recursosOperacionaisD(dados.registros).some(x=>x.id===r.id):categoria.value==='B'?recursoCarroConsultavel(r,fixa)&&(tipo==='instrutor'||r.tipoCambio===dados.aluno.tipoCambio):us.includes(normalizarChaveUnidade(r.unidade)))&&(tipo==='instrutor'?r.categorias?.includes(categoria.value):r.categoria===categoria.value));
            for(const r of rs){const l=criar('label'),i=criar('input');i.type='checkbox';i.name=nome;i.value=r.id;i.checked=antes.includes(r.id);l.append(i,document.createTextNode(r.nome));lista.append(l);}
            if(inicial)for(const id of antes.filter(id=>!rs.some(r=>r.id===id))){const l=criar('label'),i=criar('input');i.type='checkbox';i.name=nome;i.value=id;i.checked=true;l.append(i,document.createTextNode('Recurso salvo indisponível — desmarque ou revise suas preferências.'));lista.append(l);}
            if(!rs.length)lista.append(criar('p','Nenhum recurso compatível cadastrado para esta seleção.'));
        }
        const disponiveis=dados.resumo.categorias[categoria.value].disponiveis;qtd.max=String(disponiveis??0);saldo.textContent=disponiveis==null?'Saldo precisa de conferência.':'Saldo disponível: '+disponiveis+' aula(s).';buscar.disabled=!(disponiveis>0);
    }
    function invalidar(){proposta=null;operacaoId=null;resultado.replaceChildren();msg.textContent='';}
    window.addEventListener('sipa-recursos-atualizados',async()=>{if(ocupado)return;dados=await servico.dadosAlunoLocal();invalidar();recursos();});
    form.oninput=e=>{if(ocupado)return;invalidar();if(e.target===categoria||e.target.name==='unidades')recursos();};
    form.onsubmit=e=>e.preventDefault();
    async function executar(tarefa){if(ocupado)return;ocupado=true;campos.disabled=true;try{await tarefa();}catch(e){feedback(e,msg);}finally{ocupado=false;campos.disabled=false;}}
    salvar.onclick=()=>executar(async()=>{await servico.salvarPreferenciasAutomaticas(valores());msg.textContent='Preferências salvas. Nenhuma aula foi reservada.';msg.setAttribute('role','status');});
    buscar.onclick=()=>executar(async()=>{
        invalidar();proposta=await servico.buscarAgendamentoAutomatico(valores());operacaoId=crypto.randomUUID();dados=await servico.dadosAlunoLocal();
        msg.textContent='Encontramos '+proposta.aulas.length+' horários compatíveis com suas preferências, de '+proposta.solicitadas+' solicitado(s). Ainda não estão reservados.';
        msg.setAttribute('role','status');const lista=criar('ol');
        for(const a of proposta.aulas){const li=criar('li'),u=obterUnidadeInstitucional(a.unidade),local=proposta.categoria==='D'?localCategoriaD(a.data):proposta.categoria==='B'?localCarro(dados.aluno,a.data):null;li.append(criar('strong',a.data.split('-').reverse().join('/')+' · '+a.hora+' · Categoria '+proposta.categoria),criar('p',local?.nome||u?.nome||a.unidade),criar('p',local?.endereco||u?.enderecoCompleto||'Endereço não informado'),criar('p',(dados.registros.find(r=>r.id===a.instrutorId)?.nome||'Instrutor')+' · '+(dados.registros.find(r=>r.id===a.veiculoId)?.nome||'Veículo')));lista.append(li);}
        resultado.append(lista);
        if(!proposta.aulas.length)return;
        resultado.append(criar('p','Créditos a utilizar: '+proposta.aulas.length+' · Saldo previsto: '+(dados.resumo.categorias[proposta.categoria].disponiveis-proposta.aulas.length)+'. A disponibilidade será verificada novamente ao confirmar.'));
        const confirmar=botao('Confirmar as '+proposta.aulas.length+' aulas','auto-confirmar');resultado.append(confirmar);
        confirmar.onclick=()=>executar(async()=>{
            confirmar.disabled=true;
            try{
                const aulas=await servico.reservarAulasLocais({categoria:proposta.categoria,operacaoId,aulas:proposta.aulas});
                proposta=null;resultado.replaceChildren();msg.textContent='Aulas confirmadas.';
                await aoConfirmar(aulas,buscar);dados=await servico.dadosAlunoLocal();recursos();
            }catch(e){confirmar.disabled=false;throw e;}
        });
    });
    function modo(automatico){if(ocupado)return;manual.hidden=automatico;secao.hidden=!automatico;bManual.setAttribute('aria-pressed',String(!automatico));bAuto.setAttribute('aria-pressed',String(automatico));}
    bManual.onclick=()=>modo(false);bAuto.onclick=()=>modo(true);recursos(true);modo(false);
}

export async function montarAntecipacaoAluno(servico){
 if(document.getElementById('student-anticipation'))return;
 const dados=await servico.dadosAlunoLocal(),box=criar('section',null,'student-preferences');box.id='student-anticipation';
 box.append(criar('h2','Antecipação de aulas'),criar('p','Deseja receber avisos quando surgirem horários disponíveis para antecipar suas aulas?'));
 const label=criar('label'),input=criar('input'),msg=criar('p');input.type='checkbox';input.name='notificacoes';input.checked=dados.aluno?.antecipacao?.ativo===true;label.append(input,document.createTextNode('Tenho interesse em antecipar minhas aulas'));msg.id='anticipation-status';msg.setAttribute('role','status');box.append(label,msg);
 const indisponivel=servico.capacidades?.antecipacao===false||typeof servico.salvarAvisosAntecipacao!=='function';input.disabled=indisponivel;if(indisponivel)msg.textContent='Preferência indisponível neste ambiente. Consulte a recepção.';
 input.onchange=async()=>{const valor=input.checked;input.disabled=true;try{await servico.salvarAvisosAntecipacao(valor);msg.textContent=valor?'Interesse salvo. Você poderá receber ofertas compatíveis com suas aulas pendentes.':'Interesse desativado. Suas mensagens anteriores foram preservadas.';}catch(e){input.checked=!valor;msg.textContent=e.message;}finally{input.disabled=false;}};
 const ancora=document.querySelector('.profile-security')||document.querySelector('main header');ancora?.after(box);
}
