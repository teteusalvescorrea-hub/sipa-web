import {recursoMotoCentral,motivoRecursoIndisponivel} from '../dominioOperador.js';
import {resolverInstrutorCarro,recursoCarroConsultavel,operacaoCarro,localCarro} from '../../../shared/js/operacaoCarro.js';
import {recursosOperacionaisD,almocoConfigurado} from '../../../shared/js/categorias.js';
import { hojeBrasil, somarDias, diaSemana, formatarData, dataPorExtenso, datasDoMes, feriadosBrasileiros, dataValida } from "../../../shared/js/calendario.js";
import { STATUS_AGENDAMENTO, motivoNovoAgendamento, motivoFechamento, paresDisponiveis } from "../../../shared/js/disponibilidade.js";
import { ordenarAulas } from "../consultasOperador.js";
import { cardAula, criarDetalhesAula } from "./aulaOperador.js";
import { el, botao, campo, select, entrada } from "./uiOperador.js";
import {aprimorarSelect} from '../../../shared/components/selectComBusca.js';

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
    // A agenda é do instrutor (decisão do João em 31/10): o veículo é escolhido no Agendar, entre os dele livres no horário.
    const seletorInstrutor=select([["","Selecionar instrutor"]]);seletorInstrutor.dataset.agendaInstrutor='';
    seletorInstrutor.addEventListener('change',()=>{const i=instrutoresAutorizados().find(r=>r.id===seletorInstrutor.value);if(i)selecionar(i);else{filtros.instrutorId='';renderizar();}});
    const campoInstrutor=campo('Selecione o instrutor para visualizar a agenda',seletorInstrutor);campoInstrutor.className='op-agenda-seletor';aprimorarSelect(seletorInstrutor,{placeholder:'Busque o instrutor...',busca:'Buscar instrutor, categoria ou veículo...',vazio:'Nenhum instrutor encontrado.'});
    for (const [key, titulo, opcoes] of [["categoria", "Categoria", [["", "Todas"], "A", "B", "D"]], ["status", "Situação", [["", "Todas"], ...Object.entries(STATUS_AGENDAMENTO)]]]) {
        const controle = select(opcoes); controle.dataset.agendaFiltro = key;
        controle.addEventListener("change", () => { filtros[key] = controle.value; renderizar(); }); controles.append(campo(titulo, controle));
    }
    const limpar = botao("Limpar filtros", () => { filtros.status=''; controles.querySelectorAll("select").forEach(s => { if(s.dataset.agendaFiltro==='status')s.value = ""; }); renderizar(); });
    painelFiltros.append(resumoFiltros, controles, limpar);
    const feedback = el("p", "", "op-agenda-success"); feedback.hidden = true; feedback.setAttribute("role", "status"); feedback.tabIndex = -1;
    const legenda = el("div", undefined, "op-agenda-legenda");
    // A legenda mostra só o que aparece na grade (atualizarLegenda depois de cada renderização).
    const LEGENDA = [["Disponível", "livre", ".op-slot-disponivel"], ["Confirmada", "confirmada", ".op-aula-st-1"], ["Aguardando aceite", "aguardando", ".op-aula-st-3"], ["Cancelada", "cancelada", ".op-aula-st-2"], ["Realizada", "realizada", ".op-aula-st-5"], ["Fechado / almoço", "fechado", ".op-dia-fechado,.op-slot-almoco"], ["Feriado ou ponto facultativo", "feriado", ".op-day-special"]];
    for (const [texto, classe, seletor] of LEGENDA) { const item = el("span", texto, `op-legenda-${classe}`); item.dataset.legenda = seletor; legenda.append(item); }
    const atualizarLegenda = () => { for (const item of legenda.children) item.hidden = !conteudo.querySelector(item.dataset.legenda); };
    const conteudo = el("div", undefined, "op-agenda-content");
    const diagnostico=el('p',undefined,'op-help');diagnostico.setAttribute('role','status');
    const escolha=el('section',undefined,'op-agenda-escolha'), cabecalho=el('div',undefined,'op-agenda-veiculo-heading');
    toolbar.prepend(campoInstrutor);painel.append(toolbar,escolha,cabecalho, painelFiltros, diagnostico, feedback, legenda, conteudo);
    // O instrutor é escolhido na central, nunca implicitamente pelo primeiro recurso.
    seletorInstrutor.parentElement.hidden=false;
    controles.querySelector('[data-agenda-filtro=categoria]').parentElement.hidden=true;
    function aulasConsultaveis(){const e=obterEstado();return filtros.categoria==='D'?(e.agendaOnibus||e.aulas):filtros.categoria==='A'?(e.agendaMotos||e.aulas):e.aulas;}
    function selecionar(i){const cats=categoriasDoInstrutor(i);filtros.instrutorId=i.id;filtros.veiculoId='';filtros.categoria=cats.length===1?cats[0]:'';filtros.status='';controles.querySelectorAll('select').forEach(s=>s.value=s.dataset.agendaFiltro==='categoria'?filtros.categoria:'');renderizar();}
    function central(){escolha.replaceChildren(el('p','Selecione um instrutor para consultar os horários e agendamentos.','op-help'));}
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
        if(categoriasAtuais.includes('B')&&operacaoCarro({unidadeCarro:unidade},d)?.deslocamento)heading.append(el('small',localCarro({unidadeCarro:unidade},d).nome.replace(/^Unidade\s+/i,''),'op-agenda-local op-agenda-local-etiqueta'));
        const aulas = aulasData(d);
        for (let h = 7; h <= 18; h++) {
            const hora = `${String(h).padStart(2, "0")}:00`, pares = categoriasAtuais.flatMap(c=>obterPares(obterEstado(), d, hora, {...filtros,categoria:c}).filter(p=>p.instrutorId===filtros.instrutorId&&p.categoria===c));
            const categoriaHorario = pares[0]?.categoria || categoriasAtuais[0], motivo = motivoNovoAgendamento(d, hora, undefined, categoriaHorario);
            const linha = el("div", undefined, "op-agenda-slot"); linha.dataset.agendaHorario = hora;
            if (d === hojeBrasil() && Number(new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", hour12: false, timeZone: "America/Sao_Paulo" }).format(new Date())) === h) linha.classList.add("op-slot-agora");
            linha.append(el("time", hora)); const celula = el("div", undefined, "op-slot-conteudo");
            const ocupadas = aulas.filter(a => a.inicio === hora);
            ocupadas.forEach(a => celula.append(cardAula(obterEstado(), a, detalhes.abrir, modo === "semana" ? "semana" : "agenda")));
            if (!motivo && pares.length) {
                const categorias = [...new Set(pares.map(p => p.categoria))].join(" / ");
                const livre = botao("", () => {
                    if (!aoAgendar?.(d, hora,{...filtros,categoria:categoriaHorario,unidade:veiculosDoInstrutor(selecionadoAtual).find(v=>v.categoria===categoriaHorario)?.unidade})) { feedback.textContent = "Este horário não está mais disponível. Confira a grade atualizada."; feedback.hidden = false; renderizar(); }
                }, "op-slot-disponivel");
                livre.dataset.agendarHorario = hora; livre.dataset.agendarData = d; livre.disabled = !aoAgendar;
                livre.setAttribute("aria-label", `Agendar ${formatarData(d)} às ${hora}, categoria ${categorias}`);
                livre.append(el("strong", "＋ Agendar"), el("span", `Categoria ${categorias}`)); celula.append(livre);
            } else if (!ocupadas.length) {
                const mensagem = motivo || motivoRecursoIndisponivel(obterEstado(),{id:'consulta-agenda',unidade,permissoes:['consultar']},d,hora,{...filtros,categoria:categoriaHorario});
                // Sem texto repetido em cada horário: o dia fechado diz o motivo uma vez (no primeiro horário); passado e fora do
                // expediente ficam vazios (o motivo continua no title); o almoço é uma faixa com "Almoço".
                const diaFechado = fechado && mensagem.startsWith(fechado), almoco = mensagem.includes('almoço') || mensagem.includes('Intervalo');
                let bloqueado;
                if (diaFechado) bloqueado = h === 7 ? el("p", fechado, "op-slot-closed op-dia-fechado") : el("div", undefined, "op-slot-vazio op-slot-fechado");
                else if (mensagem.startsWith('Horário passado')) bloqueado = el("div", undefined, "op-slot-vazio op-slot-passado");
                else if (mensagem === 'Fora do expediente') bloqueado = el("div", undefined, "op-slot-vazio op-slot-fora");
                else bloqueado = el("p", almoco ? 'Almoço' : mensagem, `op-slot-closed${almoco ? " op-slot-almoco" : ""}`);
                bloqueado.title = mensagem; linha.classList.toggle('op-slot-indisponivel', !almoco); celula.append(bloqueado);
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
    // O instrutor atende o veículo: carro pelo vínculo do carro, moto pelos veículos do instrutor, ônibus compartilhado.
    function atende(i,v){return i.tipo==='Instrutores'&&i.categorias?.includes(v.categoria)&&(v.categoria==='B'?i.id===resolverInstrutorCarro(obterEstado().recursos,v):v.categoria==='A'?i.veiculoIds?.includes(v.id):!i.veiculoIds?.length||i.veiculoIds.includes(v.id));}
    function veiculosDoInstrutor(i){return i?veiculosAutorizados().filter(v=>atende(i,v)):[];}
    function categoriasDoInstrutor(i){return ['B','A','D'].filter(c=>veiculosDoInstrutor(i).some(v=>v.categoria===c));}
    function instrutoresAutorizados(){return obterEstado().recursos.filter(i=>i.tipo==='Instrutores'&&i.ativo!==false&&veiculosDoInstrutor(i).length).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));}
    let selecionadoAtual=null,categoriasAtuais=[];
    function atualizarSeletor(instrutores){
        seletorInstrutor.replaceChildren();const vazio=el('option','Selecionar instrutor');vazio.value='';seletorInstrutor.append(vazio);
        for(const i of instrutores){const o=el('option',[i.nome,'Categoria '+categoriasDoInstrutor(i).join(', '),veiculosDoInstrutor(i).map(v=>v.modelo||v.nome).join(', ')].join(' — '));o.value=i.id;seletorInstrutor.append(o);}
    }
    function renderizar() {
        const instrutores=instrutoresAutorizados();
        atualizarSeletor(instrutores);
        if(!instrutores.some(i=>i.id===filtros.instrutorId))filtros.instrutorId='';
        const selecionado=instrutores.find(i=>i.id===filtros.instrutorId);selecionadoAtual=selecionado||null;categoriasAtuais=categoriasDoInstrutor(selecionado);
        escolha.hidden=!!selecionado;
        for(const n of [cabecalho,painelFiltros,diagnostico,legenda,conteudo])n.hidden=!selecionado;
        seletorInstrutor.value=filtros.instrutorId;
        if(!selecionado){for(const n of [navegacao,modos,dataInput.parentElement])n.hidden=true;conteudo.replaceChildren();feedback.hidden=true;central();return;}
        const veiculos=veiculosDoInstrutor(selecionado);
        cabecalho.replaceChildren(el('h2',`Agenda de: ${selecionado.nome}`),el('p',`Categoria ${categoriasAtuais.join(', ')} · ${veiculos.map(v=>[v.modelo||v.nome,v.placa].filter(Boolean).join(' ')).join(', ')} · o veículo é escolhido ao agendar`,'op-help'));
        if(categoriasAtuais.includes('B')&&operacaoCarro({unidadeCarro:unidade},data)?.deslocamento)cabecalho.append(el('p','Local das aulas hoje: '+localCarro({unidadeCarro:unidade},data).nome+'. Unidade responsável pelo aluno preservada.','op-agenda-local'));
        diagnostico.textContent=!almocoConfigurado(selecionado)?'Instrutor sem almoço configurado: 11h, 12h e 13h ficam bloqueados. Cadastros existentes não são alterados automaticamente.':'Os horários livres consideram jornada, almoço, bloqueios e reservas existentes; o veículo é escolhido ao agendar.';
        diagnostico.hidden=true;cabecalho.title=diagnostico.textContent;
        for(const n of [navegacao,modos,dataInput.parentElement])n.hidden=!selecionado;
        dataInput.value = data;
        for (const b of modos.children) b.setAttribute("aria-pressed", String(b.dataset.agendaModo === modo));
        resumoFiltros.textContent = `Filtros da agenda${filtros.status ? " · 1 ativo" : ""}`;
        const primeiro = somarDias(data, -((diaSemana(data) + 6) % 7));
        periodo.textContent = modo === "dia" ? dataPorExtenso(data) : modo === "semana" ? `${formatarData(primeiro)} — ${formatarData(somarDias(primeiro, 6))}` : new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(`${data}T12:00:00Z`));
        conteudo.replaceChildren(); conteudo.dataset.agendaVista = modo;
        if (modo === "mes") conteudo.append(calendarioMensal());
        else if (modo === "semana") {
            const semana = el("div", undefined, "op-week-grid");
            const horas=el('div',undefined,'op-week-hours');horas.append(el('strong','Horário'));for(let h=7;h<=18;h++)horas.append(el('time',String(h).padStart(2,'0')+':00'));semana.append(horas);
            for (let i = 0; i < 7; i++) semana.append(gradeDoDia(somarDias(primeiro, i))); conteudo.append(semana);
        } else conteudo.append(gradeDoDia(data));
        atualizarLegenda();
    }
    renderizar(); return {
        atualizar: renderizar,
        abrirDia(d, hora) { data = d; modo = "dia"; renderizar(); if (hora) aoAgendar?.(d, hora); },
        confirmar(texto) { feedback.textContent = texto; feedback.hidden = false; }
    };
}
