import {recursoMotoCentral,motivoRecursoIndisponivel} from '../dominioOperador.js';
import {resolverInstrutorCarro,recursoCarroConsultavel,operacaoCarro,localCarro} from '../../../shared/js/operacaoCarro.js';
import {recursoCategoriaD,recursosOperacionaisD,almocoConfigurado} from '../../../shared/js/categorias.js';
import { hojeBrasil, somarDias, diaSemana, formatarData, dataPorExtenso, datasDoMes, feriadosBrasileiros, dataValida } from "../../../shared/js/calendario.js";
import { STATUS_AGENDAMENTO, motivoNovoAgendamento, motivoFechamento, paresDisponiveis } from "../../../shared/js/disponibilidade.js";
import { ordenarAulas } from "../consultasOperador.js";
import { cardAula, criarDetalhesAula } from "./aulaOperador.js";
import { el, botao, campo, select, entrada } from "./uiOperador.js";

export function montarAgenda(raiz, painel, obterEstado, { aoAgendar, detalhesAula, unidade = 'Centro', obterPares = paresDisponiveis } = {}) {
    let data = hojeBrasil(), modo = "semana";
    const filtros = { instrutorId: "", veiculoId: "", categoria: "", status: "" };
    const detalhes = detalhesAula || criarDetalhesAula(raiz, obterEstado);
    painel.replaceChildren(); painel.classList.add("op-agenda");
    const toolbar = el("div", undefined, "op-agenda-toolbar");
    const navegacao = el("div", undefined, "op-agenda-nav"), periodo = el("h2"); periodo.setAttribute("aria-live", "polite"); periodo.dataset.agendaPeriodo = "";
    const anterior = botao("‹", () => mover(-1)), proximo = botao("›", () => mover(1));
    anterior.setAttribute("aria-label", "Período anterior"); proximo.setAttribute("aria-label", "Próximo período");
    navegacao.append(anterior, botao("Hoje", () => { data = hojeBrasil(); renderizar(); }), proximo, periodo);
    const modos = el("div", undefined, "op-resource-tabs op-agenda-modos"); modos.setAttribute("aria-label", "Visualização da agenda");
    for (const [id, texto] of [["dia", "Dia"], ["semana", "Semana"], ["mes", "Mês"]]) {
        const b = botao(texto, () => { modo = id; renderizar(); }); b.dataset.agendaModo = id; modos.append(b);
    }
    const dataInput = entrada("date", data); dataInput.dataset.agendaData = ""; dataInput.min = "1900-01-01"; dataInput.max = "9998-12-31";
    dataInput.addEventListener("change", () => { if (dataValida(dataInput.value)) { data = dataInput.value; renderizar(); } });
    toolbar.append(navegacao, campo("Data selecionada", dataInput), modos);
    const painelFiltros = el("details", undefined, "op-agenda-filter-panel"), resumoFiltros = el("summary", "Filtros da agenda");
    const controles = el("div", undefined, "op-agenda-filters op-form-fields");

    controles.prepend(dataInput.parentElement);
    const seletorVeiculo=select([["","Selecionar veículo"]]);seletorVeiculo.dataset.agendaVeiculo='';
    seletorVeiculo.addEventListener('change',()=>{const r=veiculosAutorizados().find(r=>r.id===seletorVeiculo.value);if(r)selecionar(r);else{filtros.veiculoId='';renderizar();}});
    const campoVeiculo=campo('Selecione o veículo para visualizar a agenda',seletorVeiculo);campoVeiculo.className='op-agenda-seletor';
    for (const [key, titulo, tipo] of [["instrutorId", "Instrutor", "Instrutores"], ["veiculoId", "Veículo", "Veículos"]]) {
        if(key==='veiculoId')continue;
        const controle = select([["", "Todos"], ...obterEstado().recursos.filter(r => (recursoCategoriaD(r)?recursosOperacionaisD(obterEstado().recursos).some(x=>x.id===r.id):recursoMotoCentral(r)||recursoCarroConsultavel(r,unidade)) && r.tipo === tipo).map(r => [r.id, r.nome])]);
        controle.dataset.agendaFiltro = key; controle.addEventListener("change", () => { filtros[key] = controle.value; renderizar(); }); controles.append(campo(titulo, controle));
    }
    for (const [key, titulo, opcoes] of [["categoria", "Categoria", [["", "Todas"], "A", "B", "D"]], ["status", "Situação", [["", "Todas"], ...Object.entries(STATUS_AGENDAMENTO)]]]) {
        const controle = select(opcoes); controle.dataset.agendaFiltro = key;
        controle.addEventListener("change", () => { filtros[key] = controle.value; renderizar(); }); controles.append(campo(titulo, controle));
    }
    const limpar = botao("Limpar filtros", () => { for(const k of ['instrutorId','status'])filtros[k]=''; controles.querySelectorAll("select").forEach(s => { if(['instrutorId','status'].includes(s.dataset.agendaFiltro))s.value = ""; }); renderizar(); });
    painelFiltros.append(resumoFiltros, controles, limpar);
    const feedback = el("p", "", "op-agenda-success"); feedback.hidden = true; feedback.setAttribute("role", "status"); feedback.tabIndex = -1;
    const legenda = el("div", undefined, "op-agenda-legenda");
    for (const [texto, classe] of [["Disponível", "livre"], ["Confirmada", "confirmada"], ["Aguardando aceite", "aguardando"], ["Cancelada", "cancelada"], ["Fechado / bloqueado", "fechado"], ["Feriado", "feriado"], ["Ponto facultativo", "facultativo"]]) legenda.append(el("span", texto, `op-legenda-${classe}`));
    const conteudo = el("div", undefined, "op-agenda-content");
    const diagnostico=el('p',undefined,'op-help');diagnostico.setAttribute('role','status');
    const escolha=el('section',undefined,'op-agenda-escolha'), cabecalho=el('div',undefined,'op-agenda-veiculo-heading');
    toolbar.prepend(campoVeiculo);painel.append(toolbar,escolha,cabecalho, painelFiltros, diagnostico, feedback, legenda, conteudo);
    // O veículo é escolhido na central, nunca implicitamente pelo primeiro recurso.
    seletorVeiculo.parentElement.hidden=false;
    controles.querySelector('[data-agenda-filtro=categoria]').parentElement.hidden=true;
    function aulasConsultaveis(){const e=obterEstado();return filtros.categoria==='D'?(e.agendaOnibus||e.aulas):filtros.categoria==='A'?(e.agendaMotos||e.aulas):e.aulas;}
    function selecionar(r){filtros.veiculoId=r.id;filtros.categoria=r.categoria;filtros.instrutorId='';filtros.status='';controles.querySelectorAll('select').forEach(s=>s.value=s.dataset.agendaFiltro==='categoria'?r.categoria:'');renderizar();}
    function central(){escolha.replaceChildren(el('p','Selecione um veículo para consultar os horários e agendamentos.','op-help'));}
    function aulasData(d) {
        // A porta de dados já restringe alunos autorizados. D usa a unidade
        // operacional Cobilândia, mesmo para alunos vinculados à recepção atual.
        return ordenarAulas(aulasConsultaveis().filter(a => a.data === d && Object.entries(filtros).every(([k,v])=>!v||String(a[k])===v)));
    }
    function mover(delta) {
        if (modo === "mes") {
            const dt = new Date(`${data.slice(0, 7)}-01T12:00:00Z`); dt.setUTCMonth(dt.getUTCMonth() + delta);
            const resultado = dt.toISOString().slice(0, 10); if (dataValida(resultado) && resultado < "9999-01-01") data = resultado;
        } else {
            const resultado = somarDias(data, delta * (modo === "semana" ? 7 : 1)); if (dataValida(resultado) && resultado < "9999-01-01") data = resultado;
        }
        renderizar();
    }
    function gradeDoDia(d) {
        const secao = el("section", undefined, "op-agenda-day"); secao.dataset.agendaColuna = d;
        const heading = el("header", undefined, "op-day-heading"); heading.append(el("h3", dataPorExtenso(d)), el("span", formatarData(d))); secao.append(heading);
        heading.querySelector("h3").title = dataPorExtenso(d);
        const fechado = motivoFechamento(d), especial = feriadosBrasileiros(Number(d.slice(0, 4))).find(f => f.data === d);
        secao.classList.toggle("op-agenda-fechada", !!fechado);
        if (especial && !fechado) heading.append(el("span", `${especial.nome} · ${especial.tipo}`, "op-day-special"));
        if (fechado && modo!=="semana") {
            const avisoFechamento = el("p", `${fechado} · sem expediente`, "op-slot-closed op-day-closed");
            avisoFechamento.title = avisoFechamento.textContent; secao.append(avisoFechamento);
            aulasData(d).forEach(a => secao.append(cardAula(obterEstado(), a, detalhes.abrir, modo === "semana" ? "semana" : "agenda"))); return secao;
        }
        if(modo==='semana'){heading.replaceChildren(el('h3',['DOM','SEG','TER','QUA','QUI','SEX','SAB'][diaSemana(d)]),el('span',formatarData(d).slice(0,5)));heading.title=dataPorExtenso(d);if(d===hojeBrasil())heading.setAttribute('aria-current','date');}
        if(filtros.categoria==='B'&&operacaoCarro({unidadeCarro:unidade},d)?.deslocamento)heading.append(el('small','Local: '+localCarro({unidadeCarro:unidade},d).nome,'op-agenda-local'));
        const aulas = aulasData(d);
        for (let h = 7; h <= 18; h++) {
            const hora = `${String(h).padStart(2, "0")}:00`, pares = obterPares(obterEstado(), d, hora, filtros).filter(p=>p.veiculoId===filtros.veiculoId&&p.categoria===filtros.categoria), motivo = motivoNovoAgendamento(d, hora, undefined, filtros.categoria || (pares.some(p=>p.categoria==='D')?'D':undefined));
            const linha = el("div", undefined, "op-agenda-slot"); linha.dataset.agendaHorario = hora;
            linha.append(el("time", hora)); const celula = el("div", undefined, "op-slot-conteudo");
            const ocupadas = aulas.filter(a => a.inicio === hora);
            ocupadas.forEach(a => celula.append(cardAula(obterEstado(), a, detalhes.abrir, modo === "semana" ? "semana" : "agenda")));
            if (!motivo && pares.length) {
                const categorias = [...new Set(pares.map(p => p.categoria))].join(" / ");
                const livre = botao("", () => {
                    if (!aoAgendar?.(d, hora,{...filtros})) { feedback.textContent = "Este horário não está mais disponível. Confira a grade atualizada."; feedback.hidden = false; renderizar(); }
                }, "op-slot-disponivel");
                livre.dataset.agendarHorario = hora; livre.dataset.agendarData = d; livre.disabled = !aoAgendar;
                livre.setAttribute("aria-label", `Agendar ${formatarData(d)} às ${hora}, categoria ${categorias}`);
                livre.append(el("strong", "＋ Agendar"), el("span", `Categoria ${categorias}`)); celula.append(livre);
            } else if (!ocupadas.length) {
                const mensagem = motivo || motivoRecursoIndisponivel(obterEstado(),{id:'consulta-agenda',unidade,permissoes:['consultar']},d,hora,filtros);
                const curto = mensagem.startsWith('Horário passado')?'Passado':mensagem.includes('almoço')||mensagem.includes('Intervalo')?'Intervalo':mensagem;
                const bloqueado = el("p", curto, `op-slot-closed${mensagem.includes("almoço") ? " op-slot-almoco" : ""}`); bloqueado.title = mensagem; celula.append(bloqueado);
            } else {
                // O próprio evento já identifica a ocupação; evita um segundo
                // bloco repetitivo abaixo da aula, sem liberar outro agendamento.
                celula.title = motivo || "Recursos ocupados neste intervalo";
            }
            linha.append(celula); secao.append(linha);
        }
        return secao;
    }
    function calendarioMensal() {
        const grid = el("div", undefined, "op-month-grid");
        for (const nome of ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]) grid.append(el("span", nome, "op-month-weekday"));
        for (const d of datasDoMes(data)) {
            const aulas = aulasData(d), especial = feriadosBrasileiros(Number(d.slice(0, 4))).find(f => f.data === d), fechado = motivoFechamento(d);
            const dia = botao("", () => { data = d; modo = "dia"; renderizar(); }, "op-month-day"); dia.dataset.agendaDia = d;
            dia.classList.toggle("op-outside", d.slice(0, 7) !== data.slice(0, 7)); dia.classList.toggle("op-closed", !!fechado); dia.classList.toggle("op-selected", d === data); dia.classList.toggle("op-holiday", !!especial && especial.tipo !== "facultativo"); dia.classList.toggle("op-facultativo", especial?.tipo === "facultativo");
            dia.setAttribute("aria-pressed", String(d === data));
            dia.setAttribute("aria-label", `${formatarData(d)}, ${especial ? `${especial.nome} · ${especial.tipo}` : fechado || "unidade aberta"}, ${aulas.length} aula(s). Consultar dia`);
            if (d === hojeBrasil()) dia.setAttribute("aria-current", "date");
            dia.append(el("strong", String(Number(d.slice(8)))));
            if (especial || fechado) dia.append(el("span", especial ? `${especial.nome}${especial.tipo === "facultativo" ? " · facultativo" : ""}` : "Domingo fechado", "op-month-special"));
            dia.append(el("span", `${aulas.length} aula(s)`, "op-month-count"));
            aulas.slice(0, 2).forEach(a => dia.append(el("span", `${a.inicio} · ${a.alunoNome||obterEstado().alunos.find(al => al.id === a.alunoId)?.nome || "Aluno"}`, "op-month-event")));
            grid.append(dia);
        }
        return grid;
    }
    function veiculosAutorizados(){return obterEstado().recursos.filter(r=>r.tipo==='Veículos'&&(r.categoria==='D'?recursosOperacionaisD(obterEstado().recursos).some(x=>x.id===r.id):r.categoria==='A'?recursoMotoCentral(r):r.categoria==='B'&&recursoCarroConsultavel(r,unidade)));}
    function instrutorVinculado(r){return obterEstado().recursos.find(i=>i.tipo==='Instrutores'&&i.categorias?.includes(r.categoria)&&(r.categoria==='B'?i.id===resolverInstrutorCarro(obterEstado().recursos,r):r.categoria==='A'?i.veiculoIds?.includes(r.id):!i.veiculoIds?.length||i.veiculoIds.includes(r.id)));}
    function atualizarSeletor(recursos){
        seletorVeiculo.replaceChildren();const vazio=el('option','Selecionar veículo');vazio.value='';seletorVeiculo.append(vazio);
        for(const [categoria,nome] of [['B','CARROS DA UNIDADE'],['A','MOTOS — CATEGORIA A'],['D','ÔNIBUS — CATEGORIA D']]){const g=el('optgroup');g.label=nome;for(const r of recursos.filter(r=>r.categoria===categoria)){const i=instrutorVinculado(r);const o=el('option',[...(r.categoria==='B'?[r.placa||r.identificacao,r.modelo||r.nome,r.tipoCambio==='automatico'?'Automático':r.tipoCambio==='manual'?'Manual':'Câmbio pendente']:[r.nome]),i?.nome||'Instrutor não vinculado'].filter(Boolean).join(' — '));o.value=r.id;g.append(o);}if(g.children.length)seletorVeiculo.append(g);}
    }
    function renderizar() {
        const recursos=veiculosAutorizados();
        atualizarSeletor(recursos);
        if(!recursos.some(r=>r.id===filtros.veiculoId))filtros.veiculoId='';
        const selecionado=recursos.find(r=>r.id===filtros.veiculoId);
        escolha.hidden=!!selecionado;
        for(const n of [cabecalho,painelFiltros,diagnostico,legenda,conteudo])n.hidden=!selecionado;
        seletorVeiculo.value=filtros.veiculoId;
        if(!selecionado){for(const n of [navegacao,modos,dataInput.parentElement])n.hidden=true;conteudo.replaceChildren();feedback.hidden=true;central(recursos);return;}
        const vinculado=instrutorVinculado(selecionado);
        cabecalho.replaceChildren(el('h2',`Agenda de: ${selecionado.nome}`),el('p',`Categoria ${selecionado.categoria} · ${selecionado.categoria==='D'?'Ônibus · operação compartilhada':selecionado.categoria==='A'?'Moto · Centro de Vila Velha':`Carro · ${selecionado.unidade}`}${vinculado?' · '+vinculado.nome:''}`,'op-help'));
        if(selecionado.categoria==='B'&&operacaoCarro({unidadeCarro:unidade},data)?.deslocamento)cabecalho.append(el('p','Local das aulas hoje: '+localCarro({unidadeCarro:unidade},data).nome+'. Unidade responsável pelo aluno preservada.','op-agenda-local'));
        const instrutores=obterEstado().recursos.filter(r=>r.tipo==='Instrutores'&&r.categorias?.includes(selecionado.categoria)&&(selecionado.categoria==='B'?r.id===resolverInstrutorCarro(obterEstado().recursos,selecionado):selecionado.categoria==='A'?r.veiculoIds?.includes(selecionado.id):!r.veiculoIds?.length||r.veiculoIds.includes(selecionado.id)));
        const filtroInstrutor=controles.querySelector('[data-agenda-filtro=instrutorId]');if(!instrutores.some(i=>i.id===filtros.instrutorId))filtros.instrutorId='';filtroInstrutor.replaceChildren(...[['','Todos'],...instrutores.map(i=>[i.id,i.nome])].map(([id,nome])=>{const o=el('option',nome);o.value=id;return o;}));filtroInstrutor.value=filtros.instrutorId;
        diagnostico.textContent=!recursos.length?'Sem veículos ativos nesta unidade. Cadastre os recursos ou prepare o cenário fictício local.':!instrutores.length?'Sem instrutores ativos nesta unidade. Cadastre o profissional e sua disponibilidade.':instrutores.some(i=>!almocoConfigurado(i))?'Há instrutores sem almoço configurado: 11h, 12h e 13h ficam bloqueados para esses profissionais. Cadastros existentes não serão alterados automaticamente.':'Selecione um veículo e uma data futura. Os horários livres consideram jornada, almoço, bloqueios e reservas existentes.';
        diagnostico.hidden=true;cabecalho.title=diagnostico.textContent;
        for(const n of [navegacao,modos,dataInput.parentElement])n.hidden=!selecionado;
        dataInput.value = data;
        for (const b of modos.children) b.setAttribute("aria-pressed", String(b.dataset.agendaModo === modo));
        resumoFiltros.textContent = `Filtros da agenda${Object.values(filtros).some(Boolean) ? ` · ${Object.values(filtros).filter(Boolean).length} ativo(s)` : ""}`;
        const primeiro = somarDias(data, -((diaSemana(data) + 6) % 7));
        periodo.textContent = modo === "dia" ? dataPorExtenso(data) : modo === "semana" ? `${formatarData(primeiro)} — ${formatarData(somarDias(primeiro, 6))}` : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`));
        conteudo.replaceChildren(); conteudo.dataset.agendaVista = modo;
        if (modo === "mes") conteudo.append(calendarioMensal());
        else if (modo === "semana") {
            const semana = el("div", undefined, "op-week-grid");
            const horas=el('div',undefined,'op-week-hours');horas.append(el('strong','Horário'));for(let h=7;h<=18;h++)horas.append(el('time',String(h).padStart(2,'0')+':00'));semana.append(horas);
            for (let i = 0; i < 7; i++) semana.append(gradeDoDia(somarDias(primeiro, i))); conteudo.append(semana);
        } else conteudo.append(gradeDoDia(data));
    }
    renderizar(); return {
        atualizar: renderizar,
        abrirDia(d, hora) { data = d; modo = "dia"; renderizar(); if (hora) aoAgendar?.(d, hora); },
        confirmar(texto) { feedback.textContent = texto; feedback.hidden = false; }
    };
}
