// Preferência visual comum aos perfis. Nenhuma sessão ou informação de negócio.
(() => {
    const chave = 'sipa.ui.tema';
    const ler = () => { try { return localStorage.getItem(chave) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } };
    const aplicar = valor => { const tema = valor === 'dark' ? 'dark' : 'light'; document.documentElement.dataset.theme = tema; globalThis.dispatchEvent(new Event('sipa:tema')); return tema; };
    const salvar = valor => { const tema = aplicar(valor); try { localStorage.setItem(chave, tema); } catch {} return tema; };
    const montarBotao=({texto=false}={})=>{const b=document.createElement('button');b.type='button';b.className='sipa-theme-control';const atualizar=()=>{const dark=document.documentElement.dataset.theme==='dark';b.setAttribute('aria-label',dark?'Ativar modo claro':'Ativar modo escuro');b.title=b.getAttribute('aria-label');b.setAttribute('aria-pressed',String(dark));b.innerHTML='<svg viewBox="0 0 24 24" aria-hidden="true">'+(dark?'<circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M2 12h2m16 0h2M5 5l1.5 1.5m11 11L19 19M5 19l1.5-1.5m11-11L19 5"/>':'<path d="M20.5 14A9 9 0 0 1 10 3.5 9 9 0 1 0 20.5 14Z"/>')+'</svg>'+(texto?'<span>Alternar tema</span>':'');};b.onclick=()=>salvar(document.documentElement.dataset.theme==='dark'?'light':'dark');globalThis.addEventListener('sipa:tema',atualizar);atualizar();return b;};
    globalThis.SipaTema = Object.freeze({ler, aplicar, salvar, montarBotao});
    globalThis.addEventListener('storage',e=>{if(e.key===chave)aplicar(e.newValue);});
    aplicar(ler());
})();
