// Preferência exclusivamente visual; não acessa sessão, API ou IndexedDB.
(()=>{
 const paginas=['dashboard.html','minhas-aulas.html','agendamento.html','meu-progresso.html','pacotes.html','meu-perfil.html'];
 if(!paginas.includes(location.pathname.split('/').pop()))return;
 const raiz=document.documentElement,chave='sipa.ui.tema';raiz.dataset.sipaTheme='aluno';
 let tema='light';try{if(localStorage.getItem(chave)==='dark')tema='dark';}catch{}
 const aplicar=valor=>{tema=valor==='dark'?'dark':'light';raiz.dataset.theme=tema;const b=document.querySelector('.sipa-theme-toggle');if(b){const rotulo=tema==='dark'?'Ativar modo claro':'Ativar modo escuro';b.setAttribute('aria-label',rotulo);b.title=rotulo;b.setAttribute('aria-pressed',String(tema==='dark'));b.querySelector('svg').dataset.icon=tema==='dark'?'sun':'moon';b.querySelector('svg').innerHTML=tema==='dark'?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>':'<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>';}};
 aplicar(tema);
 const montar=()=>{const header=document.querySelector('main > header');if(!header)return;header.classList.add('sipa-theme-header');const b=document.createElement('button');b.type='button';b.className='sipa-theme-toggle';b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true"></svg>';b.onclick=()=>{aplicar(tema==='dark'?'light':'dark');try{localStorage.setItem(chave,tema);}catch{}};header.append(b);aplicar(tema);};
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',montar,{once:true});else montar();
 addEventListener('storage',e=>{if(e.key===chave)aplicar(e.newValue);});
})();
