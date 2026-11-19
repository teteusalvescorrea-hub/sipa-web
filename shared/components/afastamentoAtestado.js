// 17/11/2026 (pedido do usuário): o atestado de mais dias. Na janela da Gerência aparecem as aulas marcadas do aluno
// (carro, moto, ônibus) depois da aula do atestado, até 30 dias; a Gerência informa o início e quantos dias de
// afastamento e o sistema marca as aulas do período (dá para desmarcar ou marcar outra). Ao aprovar, as marcadas são
// canceladas por saúde com a aula devolvida ao saldo (POST decisao com aulasDoPeriodo). Estilo em administracao.css.
const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const somarDias=(d,n)=>{const x=new Date(d+'T12:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10);};
const dataBr=d=>d.slice(8,10)+'/'+d.slice(5,7)+'/'+d.slice(0,4);
export const DIAS_MAXIMOS_AFASTAMENTO=30;

// aula: a do atestado, com data (AAAA-MM-DD) e inicio (HH:MM). Devolve {elemento, selecionadas(), total()}.
export function secaoAfastamento(servico,solicitacaoId,aula){
 const s=el('section',null,'adm-afastamento');s.dataset.admAfastamento='';
 const dia=String(aula?.data||'').slice(0,10);
 s.append(el('h3','Aulas abonadas pelo atestado'),
  el('p','A aula do atestado ('+(dia?dataBr(dia):'')+(aula?.inicio?' às '+aula.inicio:'')+') já está incluída. Se o atestado for de mais dias, informe o afastamento: as aulas marcadas do aluno no período são marcadas abaixo e, ao aprovar, são canceladas com a aula devolvida ao saldo para ele reagendar.','adm-afastamento-ajuda'));
 const inicio=el('input');inicio.type='date';inicio.value=dia;inicio.min=dia;inicio.max=somarDias(dia,DIAS_MAXIMOS_AFASTAMENTO);inicio.dataset.admAfastamentoInicio='';
 const dias=el('input');dias.type='number';dias.min='1';dias.max=String(DIAS_MAXIMOS_AFASTAMENTO+1);dias.value='1';dias.dataset.admAfastamentoDias='';
 const campo=(rotulo,input)=>{const l=el('label',null,'adm-afastamento-campo');l.append(el('span',rotulo),input);return l;};
 const filtros=el('div',null,'adm-afastamento-filtros');
 const linhaCampos=el('div',null,'adm-afastamento-linha');linhaCampos.append(campo('Início do afastamento',inicio),campo('Dias de afastamento',dias),filtros);
 const tabela=el('div',null,'adm-afastamento-tabela');tabela.append(el('p','Carregando as aulas do aluno…','adm-afastamento-vazio'));
 const resumo=el('p',null,'adm-afastamento-resumo');resumo.setAttribute('role','status');
 s.append(linhaCampos,tabela,resumo);
 let aulas=[],marcadas=new Set(),categoria='',manual=false;
 const fimDoPeriodo=()=>somarDias(inicio.value||dia,Math.max(1,Math.min(DIAS_MAXIMOS_AFASTAMENTO+1,Number(dias.value)||1))-1);
 const dentro=a=>a.data>=(inicio.value||dia)&&a.data<=fimDoPeriodo();
 function marcarPeloPeriodo(){marcadas=new Set(aulas.filter(dentro).map(a=>a.id));manual=false;desenhar();}
 function desenhar(){
  filtros.replaceChildren();
  const cats=[...new Set(aulas.map(a=>a.categoria))].sort();
  if(cats.length>1)for(const [v,t] of [['','Todas'],...cats.map(c=>[c,c])]){const b=el('button',t,'adm-afastamento-filtro');b.type='button';b.setAttribute('aria-pressed',String(categoria===v));b.onclick=()=>{categoria=v;desenhar();};filtros.append(b);}
  const lista=aulas.filter(a=>!categoria||a.categoria===categoria);
  if(!aulas.length)tabela.replaceChildren(el('p','O aluno não tem outras aulas marcadas nos 30 dias depois da aula do atestado.','adm-afastamento-vazio'));
  else{const t=el('table');const cab=el('tr');for(const h of ['','Data','Hora','Veículo','Cat.','Instrutor'])cab.append(el('th',h));t.append(el('thead'));t.tHead.append(cab);const corpo=el('tbody');
   for(const a of lista){const tr=el('tr');tr.dataset.admAfastamentoAula=a.id;if(marcadas.has(a.id))tr.classList.add('marcada');if(dentro(a))tr.classList.add('no-periodo');
    const cb=el('input');cb.type='checkbox';cb.checked=marcadas.has(a.id);cb.setAttribute('aria-label','Abonar a aula de '+dataBr(a.data)+' às '+a.hora);cb.onchange=()=>{if(cb.checked)marcadas.add(a.id);else marcadas.delete(a.id);manual=true;desenhar();};
    const c0=el('td');c0.append(cb);tr.append(c0,el('td',dataBr(a.data)),el('td',a.hora),el('td',a.veiculo||'—'),el('td',a.categoria),el('td',a.instrutor||'—'));corpo.append(tr);}
   t.append(corpo);tabela.replaceChildren(t);}
  const n=marcadas.size;
  resumo.replaceChildren(el('strong',(n+1)+(n+1===1?' aula será devolvida':' aulas serão devolvidas')+' ao aluno se aprovar'),document.createTextNode(' · a aula do atestado'+(n?' + '+n+(n===1?' aula marcada':' aulas marcadas'):'')+(n||manual?'':' (sem outras aulas no período informado)')+'.'));
 }
 inicio.onchange=()=>{if(inicio.value<dia)inicio.value=dia;marcarPeloPeriodo();};dias.oninput=marcarPeloPeriodo;
 if(servico.aulasDoAfastamento&&dia){
  servico.aulasDoAfastamento(solicitacaoId,somarDias(dia,DIAS_MAXIMOS_AFASTAMENTO)).then(lista=>{
   aulas=(lista||[]).map(a=>{const ini=String(a.dataHoraInicio||'');return {id:a.id,data:ini.slice(0,10),hora:ini.slice(11,16),categoria:a.categoria?.descricao?String(a.categoria.descricao).replace(/^Categoria\s+/,'').slice(0,1):String(a.categoria||''),instrutor:a.motoristaNome,veiculo:a.veiculo};});
   marcarPeloPeriodo();
  }).catch(e=>{tabela.replaceChildren(el('p',e?.message||'Não foi possível carregar as aulas do aluno.','adm-afastamento-vazio'));desenhar();});
 }else{tabela.replaceChildren(el('p','Consulta das aulas indisponível neste ambiente.','adm-afastamento-vazio'));}
 desenhar();
 return {elemento:s,selecionadas:()=>[...marcadas],total:()=>marcadas.size+1};
}
