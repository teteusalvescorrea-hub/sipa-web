import {nomeDoVeiculo} from '../../../shared/js/formatacao.js';
import {nomeUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {recursoMotoCentral,motivoRecursoIndisponivel} from '../dominioOperador.js';
import {resolverInstrutorCarro,recursoCarroConsultavel,operacaoCarro,localCarro} from '../../../shared/js/operacaoCarro.js';
import {recursosOperacionaisD,almocoConfigurado,localCategoriaD} from '../../../shared/js/categorias.js';
import {obterUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import { hojeBrasil, somarDias, diaSemana, formatarData, dataPorExtenso, datasDoMes, feriadosBrasileiros, dataValida } from "../../../shared/js/calendario.js";
import { STATUS_AGENDAMENTO, motivoNovoAgendamento, motivoFechamento, paresDisponiveis } from "../../../shared/js/disponibilidade.js";
import { ordenarAulas } from "../consultasOperador.js";
import { cardAula, criarDetalhesAula } from "./aulaOperador.js";
import { el, botao, campo, select, entrada } from "./uiOperador.js";
import {aprimorarSelect} from '../../../shared/components/selectComBusca.js';

export function montarAgenda(raiz, painel, obterEstado, { aoAgendar, aoRealocar, detalhesAula, unidade = 'Centro', todasAsUnidades = false, recursosDaAgenda, obterPares = paresDisponiveis } = {}) {
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
    seletorInstrutor.addEventListener('change',()=>{const a=agendasAutorizadas().find(x=>x.valor===seletorInstrutor.value);if(a)selecionar(a);else{filtros.instrutorId='';filtros.veiculoId='';renderizar();}});
    const campoInstrutor=campo('Selecione o instrutor para visualizar a agenda',seletorInstrutor);campoInstrutor.className='op-agenda-seletor';aprimorarSelect(seletorInstrutor,{placeholder:'Busque o instrutor...',busca:'Buscar instrutor, categoria ou veículo...',vazio:'Nenhum instrutor encontrado.'});
    for (const [key, titulo, opcoes] of [["categoria", "Categoria", [["", "Todas"], "A", "B", "D"]], ["status", "Situação", [["", "Todas"], ...Object.entries(STATUS_AGENDAMENTO)]]]) {
        const controle = select(opcoes); controle.dataset.agendaFiltro = key;
        controle.addEventListener("change", () => { filtros[key] = controle.value; renderizar(); }); controles.append(campo(titulo, controle));
    }
    const limpar = botao("Limpar filtros", () => { filtros.status=''; controles.querySelectorAll("select").forEach(s => { if(s.dataset.agendaFiltro==='status')s.value = ""; }); renderizar(); });
    painelFiltros.append(resumoFiltros, controles, el("p", "Aulas canceladas e recusadas não aparecem na grade. Para vê-las, escolha a Situação.", "op-help op-agenda-filtro-ajuda"), limpar);
    const feedback = el("p", "", "op-agenda-success"); feedback.hidden = true; feedback.setAttribute("role", "status"); feedback.tabIndex = -1;
    const legenda = el("div", undefined, "op-agenda-legenda");
    for (const [texto, classe] of [["Disponível", "livre"], ["Confirmada", "confirmada"], ["Aguardando aceite", "aguardando"], ["Cancelada", "cancelada"], ["Fechado / bloqueado", "fechado"], ["Feriado", "feriado"], ["Ponto facultativo", "facultativo"]]) legenda.append(el("span", texto, `op-legenda-${classe}`));
    const conteudo = el("div", undefined, "op-agenda-content");
    const diagnostico=el('p',undefined,'op-help');diagnostico.setAttribute('role','status');
    const escolha=el('section',undefined,'op-agenda-escolha'), cabecalho=el('div',undefined,'op-agenda-veiculo-heading');
    toolbar.prepend(campoInstrutor);painel.append(toolbar,escolha,cabecalho, painelFiltros, diagnostico, feedback, legenda, conteudo);
    // O instrutor é escolhido na central, nunca implicitamente pelo primeiro recurso.
    seletorInstrutor.parentElement.hidden=false;
    controles.querySelector('[data-agenda-filtro=categoria]').parentElement.hidden=true;
    function motivoDoRecurso(d,hora,categoria,unidadeConsulta){const acesso={id:'consulta-agenda',unidade:unidadeConsulta,permissoes:['consultar']};return motivoRecursoIndisponivel(obterEstado(),acesso,d,hora,{...filtros,categoria,recursosConsultados:recursosDaAgenda?.(acesso)});}
    function aulasConsultaveis(){const e=obterEstado();return filtros.categoria==='D'?(e.agendaOnibus||e.aulas):filtros.categoria==='A'?(e.agendaMotos||e.aulas):e.aulas;}
    function selecionar(a){const cats=categoriasDe(a.veiculos);filtros.instrutorId=a.instrutor.id;filtros.veiculoId=a.veiculo?.id||'';filtros.categoria=cats.length===1?cats[0]:'';filtros.status='';controles.querySelectorAll('select').forEach(s=>s.value=s.dataset.agendaFiltro==='categoria'?filtros.categoria:'');renderizar();}
    // 12/11/2026: sem nenhum instrutor na lista, diz o que falta (a agenda é do par instrutor e veículo; a API ainda pede a
    // unidade da aula no vínculo do instrutor).
    function central(){escolha.replaceChildren(el('p',agendasAutorizadas().length?'Selecione um instrutor para consultar os horários e agendamentos.':'Nenhum instrutor com agenda ainda. Para aparecer aqui, o instrutor precisa estar ativo, ter a unidade definida (Editar instrutor › Unidade administrativa) e ter um veículo vinculado (Veículos e recursos › Cadastrar veículo, com ele como instrutor responsável).','op-help'));}
    // 10/11/2026: canceladas (2, também as "com ônus") e recusadas (4) saem da grade, e o horário volta a aparecer livre;
    // escolhendo a Situação no filtro, elas aparecem.
    const FORA_DA_GRADE = new Set(["2", "4"]);
    function aulasData(d) {
        // A porta de dados já restringe alunos autorizados. D usa a unidade
        // operacional Cobilândia, mesmo para alunos vinculados à recepção atual.
        return ordenarAulas(aulasConsultaveis().filter(a => a.data === d && (filtros.status || !FORA_DA_GRADE.has(String(a.status))) && Object.entries(filtros).every(([k,v])=>!v||String(a[k])===v)));
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
        const fechado = motivoFechamento(d, undefined, frotaDaAgenda()[0]?.unidade), especial = feriadosBrasileiros(Number(d.slice(0, 4))).find(f => f.data === d);
        secao.classList.toggle("op-agenda-fechada", !!fechado);
        if (especial && !fechado) heading.append(el("span", `${especial.nome} · ${especial.tipo}`, "op-day-special"));
        if (fechado && modo!=="semana") {
            const avisoFechamento = el("p", `${fechado} · sem expediente`, "op-slot-closed op-day-closed");
            avisoFechamento.title = avisoFechamento.textContent; secao.append(avisoFechamento);
            aulasData(d).forEach(a => secao.append(cardAula(obterEstado(), a, detalhes.abrir, modo === "semana" ? "semana" : "agenda"))); return secao;
        }
        if(modo==='semana'){heading.replaceChildren(el('h3',['DOM','SEG','TER','QUA','QUI','SEX','SAB'][diaSemana(d)]),el('span',formatarData(d).slice(0,5)));heading.title=dataPorExtenso(d);if(d===hojeBrasil())heading.setAttribute('aria-current','date');}
        // 17/11/2026 (pedido do usuário): o local diferente do dia num selo azul com ícone de local (sai o laranja e o "Aulas em:");
        // o texto completo fica na dica e no leitor de tela.
        {const l=fechado?null:localDiferente(d);if(l){const s=el('small',undefined,'op-agenda-local op-agenda-local-dia');s.append(el('span',l.curto));s.title='Aulas neste dia em '+l.longo+(l.deslocamento?' (deslocamento do dia)':'');s.setAttribute('aria-label',s.title);heading.append(s);}}
        const aulas = aulasData(d);
        for (let h = 7; h <= 18; h++) {
            const hora = `${String(h).padStart(2, "0")}:00`, pares = categoriasAtuais.flatMap(c=>obterPares(obterEstado(), d, hora, {...filtros,categoria:c,unidadeDoVeiculo:frotaDaAgenda().find(v=>v.categoria===c)?.unidade}).filter(p=>p.instrutorId===filtros.instrutorId&&p.categoria===c));
            const categoriaHorario = pares[0]?.categoria || categoriasAtuais[0], motivo = motivoNovoAgendamento(d, hora, undefined, categoriaHorario, frotaDaAgenda().find(v=>v.categoria===categoriaHorario)?.unidade);
            const linha = el("div", undefined, "op-agenda-slot"); linha.dataset.agendaHorario = hora;
            linha.append(el("time", hora)); const celula = el("div", undefined, "op-slot-conteudo");
            const ocupadas = aulas.filter(a => a.inicio === hora);
            ocupadas.forEach(a => celula.append(cardAula(obterEstado(), a, detalhes.abrir, modo === "semana" ? "semana" : "agenda")));
            // 17/11/2026 (pedido do usuário): na semana, a aula agendada preenche a célula inteira.
            if (ocupadas.length) linha.classList.add("op-slot-com-aula");
            // Aula no horário desta agenda: um segundo veículo livre não abre outro agendamento. Cada moto tem a própria agenda, e o
            // instrutor atende as duas motos no mesmo horário (16/11/2026); a aula de uma moto não aparece na agenda da outra.
            if (!ocupadas.length && !motivo && pares.length) {
                const categorias = [...new Set(pares.map(p => p.categoria))].join(" / ");
                const livre = botao("", () => {
                    if (!aoAgendar?.(d, hora,{...filtros,categoria:categoriaHorario,unidade:frotaDaAgenda().find(v=>v.categoria===categoriaHorario)?.unidade})) { feedback.textContent = "Este horário não está mais disponível. Confira a grade atualizada."; feedback.hidden = false; renderizar(); }
                }, "op-slot-disponivel");
                livre.dataset.agendarHorario = hora; livre.dataset.agendarData = d; livre.disabled = !aoAgendar;
                livre.setAttribute("aria-label", `Agendar ${formatarData(d)} às ${hora}, categoria ${categorias}`);
                livre.append(el("strong", "＋ Agendar"), el("span", `Categoria ${categorias}`)); celula.append(livre);
            } else if (!ocupadas.length) {
                const frota=frotaDaAgenda(),motoForaDaPista=todasAsUnidades&&categoriaHorario==='A'&&!frota.some(recursoMotoCentral);
                const mensagem = motivo || (motoForaDaPista?'Moto atende só na pista do Centro':motivoDoRecurso(d,hora,categoriaHorario,todasAsUnidades?frota[0]?.unidade||unidade:unidade));
                // 17/11/2026 (pedido do usuário): o almoço do instrutor aparece como "Horário de almoço".
                const curto = mensagem.startsWith('Horário passado')?'Passado':mensagem.includes('almoço')?'Horário de almoço':mensagem.includes('Intervalo')?'Intervalo':mensagem;
                const bloqueado = el("p", curto, `op-slot-closed${mensagem.includes("almoço") ? " op-slot-almoco" : ""}`); bloqueado.title = mensagem; celula.append(bloqueado); if (curto === "Horário de almoço") linha.classList.add("op-slot-almoco-cheio");
            } else {
                // O próprio evento já identifica a ocupação; evita um segundo
                // bloco repetitivo abaixo da aula, sem liberar outro agendamento.
                celula.title = motivo || "Recursos ocupados neste intervalo";
            }
            linha.append(celula); secao.append(linha);
        }
        if (modo === "semana") unirFechados(secao, d, fechado, especial);
        return secao;
    }
    // 17/11/2026 (pedido do usuário): na semana, o dia fechado (feriado, domingo, dia sem aula) e o sábado depois do
    // expediente não repetem a mesma mensagem em cada hora: as horas seguidas viram um bloco liso e mais escuro, com uma
    // mensagem só dizendo o que impede o agendamento. Os outros horários (passado, intervalo, aulas) ficam como estão.
    // O horário de almoço não entra no bloco: cada hora fica na própria célula, cinza (17/11/2026, pedido do usuário).
    function textoFechado(slot) { const c = slot.querySelector(".op-slot-conteudo"); if (!c || c.children.length !== 1) return ""; const p = c.firstElementChild; return p.classList.contains("op-slot-closed") ? p.textContent : ""; }
    function unirFechados(secao, d, fechado, especial) {
        const slots = [...secao.querySelectorAll(":scope > .op-agenda-slot")];
        for (let i = 0; i < slots.length;) {
            const texto = textoFechado(slots[i]);
            if (!texto || !(fechado || texto === "Fora do expediente")) { i++; continue; }
            let j = i + 1; while (j < slots.length && textoFechado(slots[j]) === texto) j++;
            const n = j - i;
            if (n >= 1) {
                const hora = slots[i].dataset.agendaHorario, domingo = diaSemana(d) === 0, feriado = !!especial && String(fechado || "").includes(especial.nome);
                const titulo = fechado ? (domingo ? "Domingo" : feriado ? especial.nome : String(fechado).replace(/ · sem expediente$/, "")) : "Fora do expediente";
                const detalhe = fechado ? (domingo || feriado ? "Sem expediente · não é possível agendar" : "Não é possível agendar neste dia") : `Expediente encerrado às ${hora} · não é possível agendar`;
                const bloco = slots[i], msg = el("div", undefined, "op-slot-bloco-msg");
                msg.append(el("strong", titulo), el("span", detalhe));
                bloco.replaceChildren(msg); bloco.classList.add("op-slot-bloco"); bloco.style.gridRow = `span ${n}`;
                bloco.title = `${titulo} · ${detalhe}`; bloco.setAttribute("aria-label", `${titulo}, ${detalhe}`);
                for (let k = i + 1; k < j; k++) slots[k].remove();
            }
            i = j;
        }
    }
    function calendarioMensal() {
        const grid = el("div", undefined, "op-month-grid");
        for (const nome of ["Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado", "Domingo"]) grid.append(el("span", nome, "op-month-weekday"));
        for (const d of datasDoMes(data)) {
            const aulas = aulasData(d), especial = feriadosBrasileiros(Number(d.slice(0, 4))).find(f => f.data === d), fechado = motivoFechamento(d, undefined, frotaDaAgenda()[0]?.unidade);
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
    // Master em "Todas as unidades": consulta a frota inteira; nos demais casos, a da unidade em uso.
    // Frota e veículos por instrutor calculados uma vez por estado, e não a cada horário.
    let memoFrota=null;
    function frotaAtual(){const e=obterEstado();if(memoFrota?.estado!==e)memoFrota={estado:e,lista:calcularVeiculosAutorizados(e),porInstrutor:new Map()};return memoFrota;}
    function veiculosAutorizados(){return frotaAtual().lista;}
    // 12/11/2026: o veículo sem unidade fixa vale em qualquer unidade (a unidade da aula vem do instrutor).
function calcularVeiculosAutorizados(estado){const operacionais=recursosOperacionaisD(estado.recursos);return estado.recursos.filter(r=>r.tipo==='Veículos'&&(todasAsUnidades?r.ativo!==false:(!r.unidade&&r.ativo!==false)||(r.categoria==='D'?operacionais.some(x=>x.id===r.id):r.categoria==='A'?recursoMotoCentral(r):r.categoria==='B'&&recursoCarroConsultavel(r,unidade))));}
    // O instrutor atende o veículo: carro pelo vínculo do carro, moto pelos veículos do instrutor, ônibus compartilhado.
    function atende(i,v){return i.tipo==='Instrutores'&&i.categorias?.includes(v.categoria)&&(v.categoria==='B'?i.id===resolverInstrutorCarro(obterEstado().recursos,v):v.categoria==='A'?i.veiculoIds?.includes(v.id):!i.veiculoIds?.length||i.veiculoIds.includes(v.id));}
    function veiculosDoInstrutor(i){if(!i)return [];const f=frotaAtual();if(!f.porInstrutor.has(i.id))f.porInstrutor.set(i.id,f.lista.filter(v=>atende(i,v)));return f.porInstrutor.get(i.id);}
    function categoriasDe(veiculos){return ['B','A','D'].filter(c=>veiculos.some(v=>v.categoria===c));}
    // Cada moto tem a própria agenda; carro e ônibus seguem uma agenda por instrutor.
    function agendasDoInstrutor(i){const frota=veiculosDoInstrutor(i),outros=frota.filter(v=>v.categoria!=='A');return [...(outros.length?[{instrutor:i,veiculo:null,veiculos:outros,valor:i.id}]:[]),...frota.filter(v=>v.categoria==='A').map(v=>({instrutor:i,veiculo:v,veiculos:[v],valor:i.id+'|'+v.id}))];}
    function agendasAutorizadas(){return instrutoresAutorizados().flatMap(agendasDoInstrutor);}
    function frotaDaAgenda(){return agendaAtual?.veiculos||[];}
    // 12/11/2026: só entra na agenda o instrutor com unidade (sem ela a API não dá horário) e com veículo.
function instrutoresAutorizados(){return obterEstado().recursos.filter(i=>i.tipo==='Instrutores'&&i.ativo!==false&&(i.unidades?.length||i.unidade)&&veiculosDoInstrutor(i).length).sort((a,b)=>a.nome.localeCompare(b.nome,'pt-BR'));}
    let selecionadoAtual=null,agendaAtual=null,categoriasAtuais=[];
    // 16/11/2026 (pedido do usuário): o local das aulas em cada dia da agenda, pelas regras da operação: moto sempre no
    // Centro de Vila Velha; ônibus na KM Cobilândia (sábado no local do sábado); carro na unidade do instrutor, com os
    // deslocamentos (Santa Rita→Itaparica na segunda, Terra Vermelha→Vila Velha na terça, Cobilândia→Vila Velha na
    // quinta) e o Novo Milênio sempre em Vila Velha.
    // 16/11/2026 (pedido do usuário): o local só aparece no dia em que é diferente do normal (o de uma quarta-feira, que
    // não tem deslocamento); o normal fica uma vez no cabeçalho "Agenda de".
    const quartaDaSemana=d=>somarDias(d,3-diaSemana(d));
    function localNormal(d){return localDoDia(quartaDaSemana(d));}
    function localDiferente(d){const l=localDoDia(d);if(!l)return null;const n=localNormal(d);return n&&n.curto===l.curto?null:l;}
    function localDoDia(d){
        if(!selecionadoAtual||diaSemana(d)===0)return null;
        const base=frotaDaAgenda().find(v=>v.categoria==='B')?.unidade||selecionadoAtual.unidade||frotaDaAgenda()[0]?.unidade||unidade;
        const itens=[];let deslocamento=false;
        for(const c of ['A','B','D'].filter(x=>categoriasAtuais.includes(x))){
            let nome='';
            if(c==='A')nome=obterUnidadeInstitucional('Vila Velha')?.nome||'';
            else if(c==='B'){const l=localCarro({unidadeCarro:base},d);nome=l?.nome||'';if(l?.deslocamento)deslocamento=true;}
            else nome=localCategoriaD(d)?.nome||'';
            if(nome)itens.push([c,nome]);
        }
        if(!itens.length)return null;
        const curto=n=>n.replace(/^Unidade /,'');const NOME={A:'Moto',B:'Carro',D:'Ônibus'};
        const iguais=new Set(itens.map(([,n])=>n)).size===1;
        return {deslocamento,curto:iguais?curto(itens[0][1]):itens.map(([c,n])=>NOME[c]+': '+curto(n)).join(' · '),longo:iguais?itens[0][1]:itens.map(([c,n])=>NOME[c]+' em '+n).join('; ')};
    }
    function atualizarSeletor(agendas){
        seletorInstrutor.replaceChildren();const vazio=el('option','Selecionar instrutor');vazio.value='';seletorInstrutor.append(vazio);
        // Agrupados por unidade, em ordem alfabética; dentro da unidade, por nome.
        // 16/11/2026 (pedido do usuário): dentro da unidade, um grupo por categoria (Moto, Carro, Ônibus), cada um em ordem
        // de nome e, para o mesmo instrutor (as duas motos), de placa.
        const ORDEM_CAT={A:0,B:1,D:2},NOME_CAT={A:'Moto',B:'Carro',D:'Ônibus'};
        const catDe=a=>categoriasDe(a.veiculos).sort((x,y)=>(ORDEM_CAT[x]??9)-(ORDEM_CAT[y]??9))[0]||'';
        const placaDe=a=>a.veiculos.map(v=>v.placa||v.identificacao||'').join(',');
        const unidadeDe=a=>nomeUnidadeInstitucional(a.instrutor.unidade||a.veiculos[0]?.unidade),grupos=new Map();
        for(const a of agendas){const nome=unidadeDe(a);if(!grupos.has(nome))grupos.set(nome,[]);grupos.get(nome).push(a);}
        for(const nome of [...grupos.keys()].sort((a,b)=>a.localeCompare(b,'pt-BR')))for(const cat of [...new Set(grupos.get(nome).map(catDe))].sort((x,y)=>(ORDEM_CAT[x]??9)-(ORDEM_CAT[y]??9))){const grupo=document.createElement('optgroup');grupo.label=nome+(NOME_CAT[cat]?' · '+NOME_CAT[cat]:'');for(const a of grupos.get(nome).filter(x=>catDe(x)===cat).sort((x,y)=>x.instrutor.nome.localeCompare(y.instrutor.nome,'pt-BR')||placaDe(x).localeCompare(placaDe(y)))){const o=el('option',[a.instrutor.nome,'Categoria '+categoriasDe(a.veiculos).join(', '),a.veiculos.map(v=>[v.modelo||v.nome,v.placa||v.identificacao||''].filter(Boolean).join(' · ')).join(', '),nome].join(' — '));o.value=a.valor;grupo.append(o);}seletorInstrutor.append(grupo);}
    }
    function renderizar() {
        const agendas=agendasAutorizadas();
        atualizarSeletor(agendas);
        agendaAtual=agendas.find(a=>a.instrutor.id===filtros.instrutorId&&(a.veiculo?.id||'')===filtros.veiculoId)||null;
        if(!agendaAtual){filtros.instrutorId='';filtros.veiculoId='';}
        const selecionado=agendaAtual?.instrutor;selecionadoAtual=selecionado||null;categoriasAtuais=categoriasDe(frotaDaAgenda());
        escolha.hidden=!!selecionado;
        for(const n of [cabecalho,painelFiltros,diagnostico,legenda,conteudo])n.hidden=!selecionado;
        seletorInstrutor.value=agendaAtual?.valor||'';
        if(!selecionado){for(const n of [navegacao,modos,dataInput.parentElement])n.hidden=true;conteudo.replaceChildren();feedback.hidden=true;central();return;}
        const veiculos=frotaDaAgenda();
        cabecalho.replaceChildren(el('h2',`Agenda de: ${selecionado.nome}`),el('p',[`Categoria ${categoriasAtuais.join(', ')}`,veiculos.map(v=>nomeDoVeiculo(v.modelo||v.nome,v.placa,' ')).join(', '),...(agendaAtual.veiculo?[]:['o veículo é escolhido ao agendar']),...(localNormal(data)?['aulas em '+localNormal(data).curto]:[])].join(' · '),'op-help'));
        if(modo==='dia'){const l=localDiferente(data);if(l)cabecalho.append(el('p','Local das aulas neste dia: '+l.longo+(l.deslocamento?' (deslocamento do dia; a unidade responsável pelo aluno não muda).':'.'),'op-agenda-local'));}
        if(aoRealocar){const b=botao('Realocar alunos',()=>aoRealocar(agendaAtual),'op-button op-button-outline');b.dataset.opRealocarAgenda='';cabecalho.append(b);}
        diagnostico.textContent=!almocoConfigurado(selecionado)?'Instrutor sem almoço configurado: 11h, 12h e 13h ficam bloqueados. Cadastros existentes não são alterados automaticamente.':'Os horários livres consideram jornada, almoço, bloqueios e reservas existentes; o veículo é escolhido ao agendar.';
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
