import {autorizarAntecipacao,consultarVagasOferta,interessadosOferta,enviarOferta,telefoneWhatsApp} from './ofertasAntecipacao.js';
import {escopoPermitido} from './permissoesAdministrativas.js';
import {principal} from '../../nivel-1-operador/js/dominioOperador.js';
export function criarServicoAntecipacao(adaptador,op){
 return {
  consultarVagas:async f=>consultarVagasOferta(await adaptador.ler(),op,f),
  consultarInteressados:async vagas=>interessadosOferta(await adaptador.ler(),op,vagas),
  enviarCampanha:p=>adaptador.alterar(e=>enviarOferta(e,op,p)),
  async historicoOfertas(){autorizarAntecipacao(op);const e=await adaptador.ler();return (e.ofertasAntecipacao||[]).filter(o=>e.alunos.some(a=>a.id===o.alunoId&&escopoPermitido(op,principal(a)))).map(o=>{const a=e.alunos.find(a=>a.id===o.alunoId);return {...o,alunoNome:a.nome,lidaEm:a.leiturasMensagens?.[o.id]||null};}).sort((a,b)=>String(b.em).localeCompare(String(a.em)));},
  async linkWhatsAppOferta(id,agora=new Date()){autorizarAntecipacao(op);const e=await adaptador.ler(),o=e.ofertasAntecipacao?.find(o=>o.id===id),a=o&&e.alunos.find(a=>a.id===o.alunoId&&escopoPermitido(op,principal(a)));if(!a||o.canais?.whatsapp.situacao!=='preparado')throw new Error('Mensagem não preparada ou fora da unidade autorizada.');if(a.antecipacao?.ativo!==true||a.preferenciasContato?.whatsapp===false||a.antecipacao?.whatsapp===false)throw new Error('A preferência atual do aluno não autoriza esta oferta por WhatsApp.');if(o.vagas?.every(v=>Date.parse(v.data+'T'+v.inicio+':00-03:00')<=agora.getTime()))throw new Error('Os horários desta oferta já passaram.');const numero=telefoneWhatsApp(a.telefone);if(!numero)throw new Error('Este aluno não possui um WhatsApp válido cadastrado.');return 'https://wa.me/'+numero+'?text='+encodeURIComponent(o.texto);}
 };
}
