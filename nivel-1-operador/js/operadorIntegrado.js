// Painel da Recepção (ADM 1) ligado na API: sessão do login, identidade pelo
// equipe/me e serviço HTTP. Sem nada de dev/ (M4).
const conteudo=document.getElementById('operador-conteudo'),orientacao=document.getElementById('acesso-orientacao');
try{
 const {montarPainelEquipe}=await import('../../shared/js/entradaEquipeIntegrada.js');
 if(await montarPainelEquipe({perfil:'operador',raiz:conteudo,template:document.getElementById('operador-template')}))document.getElementById('operador-acesso').hidden=true;
}catch(e){conteudo.replaceChildren();conteudo.hidden=true;orientacao.textContent=e?.message||'Não foi possível carregar o painel. Entre novamente.';orientacao.setAttribute('role','alert');}
