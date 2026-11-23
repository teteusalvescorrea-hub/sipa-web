// 19/11/2026 (tarefa 18, desempenho): pré-carga da entrada dos painéis da equipe (Recepção, Gerência e Master).
// O painel só pedia os dados depois de baixar os cerca de 80 módulos da tela (a espera era a rede dos módulos, não a
// API). Este módulo é pequeno (api.js, sessao.js e calendario.js) e roda primeiro, num <script type="module" async> no
// <head> do painel (gerado por dev/modulepreload.mjs), sem esperar o CSS nem os outros módulos: ele já
// dispara o equipe/me, as unidades e as listagens da leitura inicial. As promessas ficam guardadas por pouco tempo e o
// serviço da equipe (administracaoIntegrada.js) as reaproveita na primeira leitura de cada rota, no lugar de pedir de novo.
// As rotas saem da mesma função (rotasDaLeitura) que o serviço usa, para a chave bater.
import {Get,ComParams} from './api.js';
import {obterToken,obterPerfil,estaLogado} from './sessao.js';
import {hojeBrasil,somarDias} from './calendario.js';
import {desenvolvimentoAtivo} from './ambiente.js';

// O equipe/me lido no login (para escolher o painel) fica na sessão por 60 s e serve a entrada do painel.
export const CHAVE_EQUIPE_ME='sipa.equipe.me';
const VALIDADE_ME=60000,VALIDADE_PRE_CARGA=30000;
const preCargas=new Map();

// O "ate" da API é exclusivo (início < ate): a primeira janela vai até amanhã para trazer as aulas de hoje.
export const janelasAgenda=(hoje=hojeBrasil())=>[{de:somarDias(hoje,-91),ate:somarDias(hoje,1)},{de:somarDias(hoje,1),ate:somarDias(hoje,92)}];
// As rotas da leitura da equipe (ler() do serviço), com o filtro de unidade do Master quando houver.
export function rotasDaLeitura(filtro={}){
 return {alunos:ComParams('alunos',filtro),vinculos:ComParams('vinculos',{status:2,...filtro}),solicitacoes:ComParams('solicitacoes-medicas',{pagina:1,tamanho:100,...filtro}),
  veiculos:ComParams('veiculos/da-autoescola',filtro),diasBloqueados:'agenda/dias-bloqueados',excecoes:'agenda/excecoes-unidades',provas:'agenda/provas',
  agendamentos:janelasAgenda().map(j=>ComParams('agendamentos',{...j,status:[1,2,3,4,5,6,7],...filtro}))};
}
export const ROTA_UNIDADES=ComParams('unidades',{todas:true});

// Assinatura curta do token: o equipe/me guardado só vale para a mesma sessão.
const assinatura=token=>String(token||'').slice(-24);
export function guardarEquipeMe(dados){try{sessionStorage.setItem(CHAVE_EQUIPE_ME,JSON.stringify({em:Date.now(),token:assinatura(obterToken()),dados}));}catch{}}
// Lê e apaga (uso único): a próxima leitura do equipe/me vai ao servidor.
function tomarEquipeMeGuardado(){
 try{const bruto=sessionStorage.getItem(CHAVE_EQUIPE_ME);if(!bruto)return null;sessionStorage.removeItem(CHAVE_EQUIPE_ME);
  const x=JSON.parse(bruto);return x&&x.token===assinatura(obterToken())&&Date.now()-x.em>=0&&Date.now()-x.em<VALIDADE_ME&&x.dados?x.dados:null;}catch{return null;}
}

function guardar(rota,p){p.catch(()=>{});preCargas.set(rota,{p,em:Date.now()});}
// A promessa da pré-carga da rota, uma vez só e se ainda for recente; sem ela, null (o serviço pede normalmente).
// O serviço já começou a ler: uma pré-carga que chegue atrasada não pede nada (seria pedido em dobro).
let servicoLendo=false;
export function tomarPreCarga(rota){servicoLendo=true;const x=preCargas.get(rota);if(!x)return null;preCargas.delete(rota);return Date.now()-x.em<VALIDADE_PRE_CARGA?x.p:null;}

export function preCarregarEquipe(){
 try{
  if(servicoLendo||desenvolvimentoAtivo()||!estaLogado()||obterPerfil()!=='Autoescola')return;
  const me=tomarEquipeMeGuardado();
  guardar('equipe/me',me?Promise.resolve(me):Get('equipe/me'));
  guardar(ROTA_UNIDADES,Get(ROTA_UNIDADES));
  // O Master com uma unidade escolhida no topo lê com o Guid dela: essa leitura sai pelo caminho normal do serviço.
  let escolhida=null;try{escolhida=sessionStorage.getItem('sipa.admin.unidade.atual');}catch{}
  // O módulo é async e pode rodar antes do <body>: o Master sai do endereço da página.
  const master=/\/nivel-3-master\//.test(location.pathname)||document.body?.dataset?.perfil==='master';
  if(master&&escolhida)return;
  const r=rotasDaLeitura();
  for(const rota of [r.alunos,r.vinculos,r.solicitacoes,r.veiculos,r.diasBloqueados,r.excecoes,r.provas,...r.agendamentos])guardar(rota,Get(rota));
 }catch{}
}
