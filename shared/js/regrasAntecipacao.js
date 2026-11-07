// Antecipação por interesse: as regras de contagem que o aviso do menu, o painel, a tela de antecipação e a agenda da
// unidade usam (C7). Sem dependência de API ou de DOM.

// O interessado pode ser atendido (C4): tem aula da mesma categoria, agendada ou confirmada, depois do horário e dentro
// do prazo. Sem o campo (API antiga), vale a conta pelas aulas dentro do prazo.
export const interessadoApto=i=>i?.podeSerAtendido??(i?.aulas||[]).some(a=>a.dentroPrazo);

// Horário com pelo menos um interessado Aguardando que pode ser atendido: é o que o total da API conta.
export const aguardandoContato=h=>(h?.interessados||[]).some(i=>i.situacao==='Aguardando'&&interessadoApto(i));
export const contarAguardandoContato=liberados=>(liberados||[]).filter(aguardandoContato).length;

// Interessados em aberto (Aguardando ou Contatado) que ainda podem ser atendidos: o selo da agenda.
export const interessadosAptos=h=>(h?.interessados||[]).filter(i=>['Aguardando','Contatado'].includes(i.situacao)&&interessadoApto(i));

// O horário liberado na célula da agenda: mesma data, início e categoria, com o instrutor entre os pares livres.
export function liberadoDaCelula(liberados,{data,hora,categorias=[],instrutorId}){
 return (liberados||[]).filter(h=>h.data===data&&h.inicio===hora&&categorias.includes(h.categoria)&&(!instrutorId||(h.pares||[]).some(p=>p.instrutorId===instrutorId)))
  .find(h=>interessadosAptos(h).length)||null;
}

export const textoHorariosLiberados=n=>n+' '+(n===1?'horário liberado':'horários liberados')+' com aluno interessado';
