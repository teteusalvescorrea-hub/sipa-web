import { UNIDADES_INSTITUCIONAIS, obterUnidadeInstitucional, normalizarChaveUnidade } from '../../unidades/catalogoUnidades.js';
import { horariosAntecipacao, HORAS_AGENDAMENTO } from '../service/agendamentoAluno.js';

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
    for(const [nome,horas] of [['Marcar manhã',HORAS_AGENDAMENTO.slice(0,5)],['Marcar tarde',HORAS_AGENDAMENTO.slice(5)]]){
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
    const label=criar('label','Categoria'),categoria=criar('select');categoria.name='categoria';categoria.id='auto-categoria';label.htmlFor=categoria.id;categoria.append(new Option('Categoria A — Moto','A'),new Option('Categoria B — Carro','B'));categoria.value=salvo?.categoria||'B';label.append(categoria);campos.append(label);
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
        const us=marcados(form,'unidades');
        for(const [tipo,box] of [['instrutor',instrutores],['veiculo',veiculos]]){
            const nome=tipo==='instrutor'?'instrutores':'veiculos',antes=inicial?salvo?.[nome]||[]:marcados(form,nome),lista=box.querySelector('.preference-options');lista.replaceChildren();
            const rs=dados.registros.filter(r=>r.tipo===tipo&&r.ativo===true&&r.disponivel!==false&&us.includes(normalizarChaveUnidade(r.unidade))&&(tipo==='instrutor'?r.categorias?.includes(categoria.value):r.categoria===categoria.value));
            for(const r of rs){const l=criar('label'),i=criar('input');i.type='checkbox';i.name=nome;i.value=r.id;i.checked=antes.includes(r.id);l.append(i,document.createTextNode(r.nome));lista.append(l);}
            if(inicial)for(const id of antes.filter(id=>!rs.some(r=>r.id===id))){const l=criar('label'),i=criar('input');i.type='checkbox';i.name=nome;i.value=id;i.checked=true;l.append(i,document.createTextNode('Recurso salvo indisponível — desmarque ou revise suas preferências.'));lista.append(l);}
            if(!rs.length)lista.append(criar('p','Nenhum recurso compatível cadastrado para esta seleção.'));
        }
        const disponiveis=dados.resumo.categorias[categoria.value].disponiveis;qtd.max=String(disponiveis??0);saldo.textContent=disponiveis==null?'Saldo precisa de conferência.':'Saldo disponível: '+disponiveis+' aula(s).';buscar.disabled=!(disponiveis>0);
    }
    function invalidar(){proposta=null;operacaoId=null;resultado.replaceChildren();msg.textContent='';}
    form.oninput=e=>{if(ocupado)return;invalidar();if(e.target===categoria||e.target.name==='unidades')recursos();};
    form.onsubmit=e=>e.preventDefault();
    async function executar(tarefa){if(ocupado)return;ocupado=true;campos.disabled=true;try{await tarefa();}catch(e){feedback(e,msg);}finally{ocupado=false;campos.disabled=false;}}
    salvar.onclick=()=>executar(async()=>{await servico.salvarPreferenciasAutomaticas(valores());msg.textContent='Preferências salvas. Nenhuma aula foi reservada.';msg.setAttribute('role','status');});
    buscar.onclick=()=>executar(async()=>{
        invalidar();proposta=await servico.buscarAgendamentoAutomatico(valores());operacaoId=crypto.randomUUID();dados=await servico.dadosAlunoLocal();
        msg.textContent='Encontramos '+proposta.aulas.length+' horários compatíveis com suas preferências, de '+proposta.solicitadas+' solicitado(s). Ainda não estão reservados.';
        msg.setAttribute('role','status');const lista=criar('ol');
        for(const a of proposta.aulas){const li=criar('li'),u=obterUnidadeInstitucional(a.unidade);li.append(criar('strong',a.data.split('-').reverse().join('/')+' · '+a.hora+' · Categoria '+proposta.categoria),criar('p',u?.nome||a.unidade),criar('p',u?.enderecoCompleto||'Endereço não informado'),criar('p',(dados.registros.find(r=>r.id===a.instrutorId)?.nome||'Instrutor')+' · '+(dados.registros.find(r=>r.id===a.veiculoId)?.nome||'Veículo')));lista.append(li);}
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

export async function montarAntecipacaoAluno(servico) {
    if(document.getElementById('student-anticipation'))return;
    const dados=await servico.dadosAlunoLocal(),atual=dados.aluno?.antecipacao||{};
    const escolhas=structuredClone(atual.disponibilidade||{}),dias=['Segunda-feira','Terça-feira','Quarta-feira','Quinta-feira','Sexta-feira','Sábado'];let diaAberto=1;
    const box=criar('section',null,'student-preferences');box.id='student-anticipation';
    box.append(criar('h2','Avisos de antecipação'),criar('p','Receba avisos quando surgirem oportunidades de realizar suas aulas mais cedo.'));
    const form=criar('form');box.append(form);
    const label=criar('label'),input=criar('input');input.type='checkbox';input.name='notificacoes';input.checked=atual.notificacoes===true;input.setAttribute('aria-controls','anticipation-availability');
    label.append(input,document.createTextNode('Desejo receber avisos de antecipação de aulas.'));
    const painel=criar('fieldset');painel.id='anticipation-availability';painel.append(criar('legend','Quando você pode antecipar suas aulas?'),criar('p','Selecione os dias e horários em que você tem disponibilidade. A recepção poderá consultar essas preferências quando surgir uma vaga.'));
    const nav=criar('div',null,'anticipation-days');nav.setAttribute('role','group');nav.setAttribute('aria-label','Dias disponíveis');painel.append(nav);
    const titulo=criar('h3');titulo.id='anticipation-hours-title';const horas=criar('div',null,'anticipation-hours');horas.id='anticipation-hours';horas.setAttribute('role','group');horas.setAttribute('aria-labelledby',titulo.id);
    const resumo=criar('p');resumo.id='anticipation-summary';resumo.setAttribute('aria-live','polite');painel.append(titulo,horas,resumo);
    const salvar=criar('button','Salvar preferência');salvar.type='submit';salvar.id='anticipation-save';
    const msg=criar('p');msg.id='anticipation-status';msg.setAttribute('role','status');msg.hidden=true;form.append(label,painel,salvar,msg);
    function atualizar(){
        painel.hidden=!input.checked;painel.disabled=!input.checked;input.setAttribute('aria-expanded',String(input.checked));
        nav.querySelectorAll('button').forEach((b,i)=>{const n=(escolhas[i+1]||[]).length;b.setAttribute('aria-pressed',String(n>0));b.dataset.open=String(diaAberto===i+1);b.setAttribute('aria-current',String(diaAberto===i+1));b.setAttribute('aria-label',dias[i]+', '+n+' horário(s) selecionado(s)');});
        titulo.textContent='Horários de '+dias[diaAberto-1].toLocaleLowerCase('pt-BR');horas.replaceChildren();
        for(const h of horariosAntecipacao(diaAberto)){const b=criar('button',h);b.type='button';b.dataset.hour=h;b.setAttribute('aria-pressed',String((escolhas[diaAberto]||[]).includes(h)));b.onclick=()=>{const selecionados=new Set(escolhas[diaAberto]||[]);if(selecionados.has(h))selecionados.delete(h);else selecionados.add(h);escolhas[diaAberto]=[...selecionados].sort();atualizar();horas.querySelector('[data-hour="'+h+'"]').focus();};horas.append(b);}
        const listas=Object.values(escolhas).filter(h=>h.length);resumo.textContent=listas.length+' dias selecionados · '+listas.reduce((n,h)=>n+h.length,0)+' horários de disponibilidade.';
    }
    dias.forEach((nome,i)=>{const b=criar('button',['Seg','Ter','Qua','Qui','Sex','Sáb'][i]);b.type='button';b.dataset.day=i+1;b.setAttribute('aria-controls','anticipation-hours');b.onclick=()=>{diaAberto=i+1;atualizar();};nav.append(b);});
    input.onchange=()=>{msg.hidden=true;atualizar();};atualizar();
    let ocupado=false;form.onsubmit=async e=>{e.preventDefault();if(ocupado)return;ocupado=true;salvar.disabled=true;input.disabled=true;painel.disabled=true;try{await servico.salvarAvisosAntecipacao(input.checked,escolhas);msg.textContent='Suas preferências de antecipação foram salvas.';msg.setAttribute('role','status');}catch(e){feedback(e,msg);}finally{msg.hidden=false;ocupado=false;salvar.disabled=false;input.disabled=false;painel.disabled=!input.checked;}};
    document.querySelector('.profile-security')?.after(box);
}
