// 17/11/2026 (pedido do usuário): "Informações importantes" em Meus documentos, para TODOS os alunos (aparece assim que a
// Recepção cria a conta). Um bloco que abre e fecha com as regras das aulas e onde elas acontecem, conforme a unidade do
// aluno e as categorias dele (carro com os dias em que a unidade usa outra KM, moto e ônibus), e o botão para gerar o PDF.
import {obterUnidadeInstitucional} from '../../../shared/js/catalogoUnidades.js';
import {DESLOCAMENTOS_CARRO} from '../../../shared/js/operacaoCarro.js';
import {LOCAIS_ONIBUS} from '../../../shared/js/categorias.js';

const el=(tag,texto,classe)=>{const n=document.createElement(tag);if(texto!=null)n.textContent=texto;if(classe)n.className=classe;return n;};
const DIAS=['domingo','segunda-feira','terça-feira','quarta-feira','quinta-feira','sexta-feira','sábado'];
const chave=u=>{const k=obterUnidadeInstitucional(u)?.id||String(u||'').replace(/^Unidade\s+/i,'').trim();return k==='Centro'?'Vila Velha':k;};

// Endereços e pontos de referência informados pela autoescola (valem sobre o catálogo).
const LOCAIS=Object.freeze({
 'Santa Rita':{nome:'KM de Santa Rita',endereco:'Rua Fernando Antônio da Silveira, nº 66 – Santa Rita – Vila Velha – CEP 29.118-450',referencia:'Em frente ao Material de Construção Mineirão.'},
 'Itaparica':{nome:'KM de Itaparica',endereco:'Avenida João Mendes, 240 – Loja 02, Santa Mônica Popular – Vila Velha – CEP 29.105-640',referencia:'Ao lado do abatedouro DFrango.'}
});
function local(unidade){
 const k=chave(unidade);if(LOCAIS[k])return LOCAIS[k];
 const u=obterUnidadeInstitucional(k);return {nome:u?'KM '+(u.nome.replace(/^Unidade\s+/,'').replace(/^Centro de Vila Velha$/,'Centro')):k,endereco:u?.enderecoCompleto||'',referencia:''};
}

// O texto de "Onde são as suas aulas" por categoria do aluno.
export function locaisDoAluno({unidade,unidadeCarro,categorias=[]}={}){
 const blocos=[];const cats=categorias.length?categorias:['B'];
 if(cats.includes('B')){
  const origem=chave(unidadeCarro||unidade),itens=[];
  if(origem==='Novo Milênio'){const c=local('Vila Velha');itens.push({texto:'Todas as aulas de carro são na '+c.nome+'.',endereco:c.endereco,referencia:c.referencia});}
  else if(origem){const base=local(origem);itens.push({texto:'Aulas de carro na '+base.nome+'.',endereco:base.endereco,referencia:base.referencia});
   for(const d of DESLOCAMENTOS_CARRO.filter(x=>x.origem===origem)){const destino=local(d.destino);itens.push({texto:DIAS[d.dia].charAt(0).toUpperCase()+DIAS[d.dia].slice(1)+': as aulas são na '+destino.nome+'.',endereco:destino.endereco,referencia:destino.referencia,destaque:true});}}
  else itens.push({texto:'O local das aulas de carro segue a sua unidade (a AgIA mostra o endereço em cada aula).'});
  blocos.push({categoria:'B',titulo:'Aulas de carro (4 rodas)',itens});
 }
 if(cats.includes('A')){const c=local('Vila Velha');blocos.push({categoria:'A',titulo:'Aulas de moto (2 rodas)',itens:[{texto:'Todas as aulas de moto são na '+c.nome+'.',endereco:c.endereco}]});}
 if(cats.includes('D'))blocos.push({categoria:'D',titulo:'Aulas de ônibus',itens:[{texto:'Segunda a sexta: na '+LOCAIS_ONIBUS.semana.nome+'.',endereco:LOCAIS_ONIBUS.semana.endereco},{texto:'Sábados: na '+LOCAIS_ONIBUS.sabado.nome+'.',endereco:LOCAIS_ONIBUS.sabado.endereco,destaque:true}]});
 return blocos;
}

// As regras (texto da autoescola), em seções.
export const REGRAS=Object.freeze([
 {titulo:'Calçado e documentos',itens:['As aulas práticas de moto (2 rodas) e de carro (4 rodas) só são realizadas com calçado adequado: tênis ou sapato fechado. É proibido o uso de sapatilha.','Leve sempre o documento original com foto (identidade) e a LADV (licença de aprendizagem).']},
 {titulo:'Faltas, horário e reposição',itens:['Faltar na aula prática sem avisar com no mínimo 48 horas úteis de antecedência gera cobrança por aula no ato da reposição.','Valores de reposição de aula prática conforme a tabela vigente.','Em caso de chuva, as aulas acontecem normalmente.','Chegue com 10 minutos de antecedência: não há tolerância de atraso.']},
 {titulo:'Antecipação de aulas',itens:['Na antecipação de aulas, o cronograma segue a ordem crescente: são antecipadas as últimas aulas.']},
 {titulo:'Crianças',itens:['Se vier com criança, é obrigatório trazer um responsável maior de idade para acompanhá-la. Não cuidamos de menores no local.','Sem responsável, a aula não será realizada: será registrada falta e haverá custo de reposição.']},
 {titulo:'Pelo aplicativo',itens:['Para cancelar uma aula, use Minhas aulas com pelo menos 48 horas úteis de antecedência.','Em caso de problema de saúde, envie o atestado médico pelo próprio cancelamento da aula e acompanhe em Minhas aulas → Atestados médicos.','Dúvidas: fale com a equipe da sua unidade em Mensagens.']}
]);

export function montarInformacoesImportantes(aluno={}){
 carregarCss();
 const caixa=el('details',null,'info-imp');caixa.dataset.informacoesImportantes='';
 const resumo=el('summary',null,'info-imp-resumo');
 const icone=el('span','!','info-imp-icone');icone.setAttribute('aria-hidden','true');
 const textos=el('span',null,'info-imp-textos');textos.append(el('strong','Informações importantes'),el('small','Regras das aulas e onde elas acontecem. Leia antes da primeira aula.'));
 resumo.append(icone,textos,el('span','Ver','info-imp-ver'));
 caixa.addEventListener('toggle',()=>{resumo.querySelector('.info-imp-ver').textContent=caixa.open?'Fechar':'Ver';});
 const corpo=el('div',null,'info-imp-corpo');
 const onde=el('section',null,'info-imp-secao info-imp-locais');onde.append(el('h3','Onde são as suas aulas'+(aluno.unidade?' · '+String(aluno.unidade).replace(/^Unidade\s+/,''):'')));
 const grade=el('div',null,'info-imp-locais-grade');
 for(const b of locaisDoAluno(aluno)){const c=el('article',null,'info-imp-local');c.dataset.categoria=b.categoria;c.append(el('h4',b.titulo));
  for(const i of b.itens){const p=el('div',null,'info-imp-local-item'+(i.destaque?' destaque':''));p.append(el('strong',i.texto));if(i.endereco)p.append(el('span',i.endereco));if(i.referencia)p.append(el('em','Ponto de referência: '+i.referencia));c.append(p);}
  grade.append(c);}
 onde.append(grade);corpo.append(onde);
 for(const r of REGRAS){const s=el('section',null,'info-imp-secao');s.append(el('h3',r.titulo));const ul=el('ul');for(const t of r.itens)ul.append(el('li',t));s.append(ul);corpo.append(s);}
 const pdf=el('button','Baixar em PDF','info-imp-pdf');pdf.type='button';pdf.dataset.informacoesPdf='';pdf.onclick=()=>gerarPdf(aluno);
 const rodape=el('div',null,'info-imp-rodape');rodape.append(el('small','Guarde estas informações: elas valem para todas as suas aulas práticas.'),pdf);
 corpo.append(rodape);caixa.append(resumo,corpo);
 return caixa;
}

function carregarCss(){
 if(document.querySelector('link[data-css-informacoes]'))return;
 const l=document.createElement('link');l.rel='stylesheet';l.href=new URL('../../css/informacoes.css',import.meta.url).href;l.dataset.cssInformacoes='';document.head.append(l);
}

const esc=t=>String(t??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'})[c]);
// O PDF: uma página de impressão com o visual da AgIA; o navegador abre "Salvar como PDF".
export function htmlDoPdf(aluno={}){
 const hoje=new Date().toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'});
 const locais=locaisDoAluno(aluno).map(b=>`<div class="local"><h4>${esc(b.titulo)}</h4>${b.itens.map(i=>`<p class="${i.destaque?'destaque':''}"><b>${esc(i.texto)}</b>${i.endereco?`<br><span>${esc(i.endereco)}</span>`:''}${i.referencia?`<br><i>Ponto de referência: ${esc(i.referencia)}</i>`:''}</p>`).join('')}</div>`).join('');
 const regras=REGRAS.map(r=>`<section><h3>${esc(r.titulo)}</h3><ul>${r.itens.map(t=>`<li>${esc(t)}</li>`).join('')}</ul></section>`).join('');
 return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Informações importantes${aluno.nome?' - '+esc(aluno.nome):''}</title><style>
@page{size:A4;margin:16mm 14mm}*{box-sizing:border-box}body{margin:0;font-family:Inter,Segoe UI,Arial,sans-serif;color:#14263a;font-size:11.5pt;line-height:1.45}
header{display:flex;justify-content:space-between;align-items:flex-end;padding-bottom:10px;border-bottom:3px solid #1769aa;margin-bottom:14px}
.marca{font-size:22pt;font-weight:800;color:#0f3557}.marca span{color:#1f8ad8}.sub{font-size:8.5pt;letter-spacing:.08em;color:#53687d;text-transform:uppercase}
.aluno{text-align:right;font-size:9.5pt;color:#53687d}.aluno b{display:block;font-size:11pt;color:#14263a}
h1{margin:0 0 4px;font-size:17pt}.intro{margin:0 0 14px;color:#3d5268}
h3{margin:14px 0 6px;font-size:12pt;color:#0f3557;border-left:4px solid #1769aa;padding-left:8px}
.locais{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px}
.local{border:1px solid #c9dbeb;border-radius:8px;padding:8px 10px;background:#f5f9fd;break-inside:avoid}.local h4{margin:0 0 4px;font-size:11pt}
.local p{margin:4px 0;font-size:10pt}.local p span{color:#3d5268}.local p i{color:#53687d;font-size:9pt}.local p.destaque{padding:4px 6px;border-radius:6px;background:#fff7e6}
ul{margin:0;padding-left:18px}li{margin:3px 0}section{break-inside:avoid}
footer{margin-top:18px;padding-top:8px;border-top:1px solid #c9dbeb;font-size:8.5pt;color:#53687d;display:flex;justify-content:space-between}
</style></head><body><header><div><div class="marca">Ag<span>IA</span></div><div class="sub">Gestão inteligente de agenda</div></div><div class="aluno">${aluno.nome?`<b>${esc(aluno.nome)}</b>`:''}${aluno.unidade?esc(String(aluno.unidade))+'<br>':''}Emitido em ${esc(hoje)}</div></header>
<h1>Informações importantes</h1><p class="intro">Regras das aulas práticas e locais onde elas acontecem. Leia com atenção antes da primeira aula.</p>
<h3>Onde são as suas aulas</h3><div class="locais">${locais}</div>${regras}
<footer><span>AgIA · Auto Escola</span><span>Dúvidas: fale com a Recepção da sua unidade.</span></footer>
<script>window.addEventListener('load',()=>setTimeout(()=>window.print(),250));<\/script></body></html>`;
}
function gerarPdf(aluno){
 const w=window.open('','_blank');if(!w){alert('Permita a abertura de janelas para gerar o PDF.');return;}
 w.document.open();w.document.write(htmlDoPdf(aluno));w.document.close();
}
