// Painéis da Gerência (ADM 2) e do Master (ADM 3) ligados na API: sessão do
// login, identidade pelo equipe/me e serviço HTTP. Sem nada de dev/ (M4).
const root=document.getElementById('administracao-root'),perfil=document.body.dataset.perfil,login=new URL('../../login.html',import.meta.url).href;
let sessaoValidada=false;
try{
 const resposta=await fetch(new URL('../../nivel-1-operador/html/operador-cfc.html',import.meta.url),{credentials:'same-origin'});if(!resposta.ok)throw new Error('Não foi possível carregar a estrutura administrativa.');
 const estrutura=new DOMParser().parseFromString(await resposta.text(),'text/html'),template=estrutura.getElementById('operador-template');if(!template)throw new Error('Estrutura administrativa ausente.');document.body.prepend(document.importNode(estrutura.querySelector('.op-sprite'),true));
 const {montarPainelEquipe}=await import('./entradaEquipeIntegrada.js');sessaoValidada=true;
 await montarPainelEquipe({perfil,raiz:root,template,administracao:true});
}catch(e){
 if([401,403].includes(e?.status))sessaoValidada=false;
 root.replaceChildren();const area=document.createElement('section'),h=document.createElement('h1'),p=document.createElement('p'),voltar=document.createElement('a');area.style.padding='24px';
 h.textContent=sessaoValidada?'Não foi possível carregar o painel':'Acesso administrativo não autorizado';p.setAttribute('role','alert');
 p.textContent=sessaoValidada?e.message:(e?.status===403&&e.message)||'Sua sessão expirou ou não permite acessar este perfil. Entre novamente com uma conta autorizada.';
 voltar.href=login;voltar.textContent='Voltar ao login';area.append(h,p,voltar);
 if(sessaoValidada){const tentar=document.createElement('button');tentar.type='button';tentar.textContent='Tentar novamente';tentar.onclick=()=>location.reload();area.append(tentar);}root.append(area);
}
