// Apresentação compartilhada do menu existente. Não acessa sessão nem altera rotas.
(() => {
    const itens = [
        ['dashboard.html','home'], ['agendamento.html','calendar'],
        ['minhas-aulas.html','lessons'], ['meu-progresso.html','chart'],
        ['pacotes.html','package'], ['mensagens.html','message'], ['meu-perfil.html','user']
    ];
    const pagina = location.pathname.split('/').pop();
    if (!itens.some(([rota]) => rota === pagina)) return;
    const paths = {
        message:'<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 6 9 7 9-7"/>',
        home:'<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3V10Z"/>',
        calendar:'<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M7 2v6m10-6v6M3 11h18m-12 4h1m4 0h1"/>',
        lessons:'<path d="M4 3h16v18H4zM8 7h8M8 11h8m-8 4h5"/>',
        chart:'<path d="M4 3v18h17M8 17v-5m5 5V8m5 9V4"/>',
        package:'<path d="m3 7 9-5 9 5v11l-9 4-9-4V7Zm0 0 9 5 9-5m-9 5v10M7 5l9 5"/>',
        user:'<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>',
        exit:'<path d="M10 4H4v16h6m4-12 4 4-4 4m-6-4h12"/>'
    };
    function icone(nome) {
        const svg = document.createElementNS('http://www.w3.org/2000/svg','svg');
        svg.setAttribute('viewBox','0 0 24 24');svg.setAttribute('aria-hidden','true');svg.setAttribute('focusable','false');
        svg.classList.add('sipa-nav-icon');svg.dataset.icon=nome;svg.innerHTML=paths[nome];return svg;
    }
    function montar() {
        const sidebar=document.querySelector('.sipa-sidebar');if(!sidebar)return;
        const menu=sidebar.querySelector('.sipa-sidebar-menu'),conta=menu?.querySelectorAll('.sipa-sidebar-title')[1];
        if(menu&&!menu.querySelector('a[href="mensagens.html"]')){const a=document.createElement('a');a.href='mensagens.html';a.className='sipa-sidebar-link';const i=document.createElement('span');i.className='sipa-sidebar-icon';a.append(i,document.createTextNode('Mensagens'));menu.insertBefore(a,conta||null);}
        if(menu&&conta){for(const [rota] of itens.slice(0,-1)){const a=menu.querySelector('a[href="'+rota+'"]');if(a)menu.insertBefore(a,conta);}const perfil=menu.querySelector('a[href="meu-perfil.html"]');if(perfil)menu.append(perfil);}
        for(const [rota,nome] of itens){
            const a=sidebar.querySelector('.sipa-sidebar-menu a[href="'+rota+'"]');if(!a)continue;
            a.querySelector('.sipa-sidebar-icon')?.replaceChildren(icone(nome));
            a.classList.toggle('active',rota===pagina);
            if(rota===pagina)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
        }
        const sair=sidebar.querySelector('.sipa-sidebar-logout');
        if(sair){let span=sair.querySelector('span');if(!span){span=document.createElement('span');sair.prepend(span);}span.setAttribute('aria-hidden','true');span.replaceChildren(icone('exit'));}
    }
    if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',montar,{once:true});else montar();
})();
