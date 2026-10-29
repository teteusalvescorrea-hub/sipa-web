import {validarAdministracao} from './administracao.browser.steps.mjs';
export async function validarLegibilidade(ctx){
 const {evaluate,waitFor,check,navigate,send,screenshot}=ctx;
 const problemas=[];let paginas=0;await send('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
 async function auditar(nome){
  for(const tema of ['light','dark']){
   await evaluate(`document.documentElement.dataset.theme='${tema}'`);
   await evaluate('new Promise(r=>setTimeout(r,350))');
   const itens=await evaluate(`(()=>{const erros=[];const funcional=e=>e.closest('aside,nav,.sipa-sidebar,.in-sidebar,[class*=badge],[class*=status],[class*=situacao],[class*=situation],[class*=alert],[role=alert],[class*=error],[class*=erro],[class*=warning],[class*=success],[class*=icon],.op-close,.dialog-close,svg,i,[data-erro=true],[data-medical-situation]');function rgb(c){return (c.match(/[\\d.]+/g)||[]).map(Number);}function fundo(e){for(;e;e=e.parentElement){const css=getComputedStyle(e),imagem=css.backgroundImage.match(/rgba?[(][^)]+[)]/);if(imagem){const g=rgb(imagem[0]);if(g[0]+g[1]+g[2]<500)return g;}const c=rgb(css.backgroundColor);if(c.length===3||c[3]>.95)return c;}return [255,255,255];}for(const e of document.querySelectorAll('body *')){if(funcional(e)||!e.getClientRects().length)continue;const c=getComputedStyle(e);if(c.visibility==='hidden'||!([...e.childNodes].some(n=>n.nodeType===3&&n.textContent.trim())||e.matches('input,select,textarea')))continue;const v=rgb(c.color),b=fundo(e);if(!v.length||b[0]+b[1]+b[2]<600)continue;const max=Math.max(...v.slice(0,3)),min=Math.min(...v.slice(0,3));const neutro=max-min<45||(v[0]<=v[1]&&v[1]<=v[2]&&max-min<105&&max<190);if(neutro&&max>0)erros.push({tag:e.tagName,classe:e.className,cor:c.color,fundo:b});}return erros.slice(0,18);})()`);
   if(itens.length)problemas.push({pagina:nome,tema,itens});
   await screenshot('legibilidade-'+nome+'-'+tema+'.png');paginas++;
  }
 }
 await navigate('/login.html',"!!document.querySelector('#tipo-acesso')");await auditar('login');await evaluate("document.querySelector('#forgot-password').click()");await auditar('login-recuperacao');await evaluate("document.querySelector('#recuperar-acesso').close()");
 await validarAdministracao(ctx);
 async function login(perfil,cpf,senha,rota){await navigate('/login.html',"!!document.querySelector('#tipo-acesso')");await evaluate(`document.querySelector('#tipo-acesso').value=${JSON.stringify(perfil)};document.querySelector('#login-cpf').value=${JSON.stringify(cpf)};document.querySelector('#login-password').value=${JSON.stringify(senha)};document.querySelector('#login-form').requestSubmit()`);await waitFor(()=>evaluate(`location.pathname===${JSON.stringify(rota)}&&document.readyState==='complete'&&${perfil==='aluno'?"document.body.dataset.sipaOrigem==='recepcao'":perfil==='instrutor'?"!!document.querySelector('[data-metrica=agendadas]')":"!!document.querySelector('[data-op-nav=agenda]')"}`),'Login '+perfil);}
 for(const [perfil,cpf,senha,rota] of [['operador','77777777777','123456','/nivel-1-operador/html/operador-cfc.html'],['gerencia','22222222222','gerenteNova4','/nivel-2-gerencia/html/gerencia.html'],['master','33333333333','masterNova4','/nivel-3-master/html/master.html']]){
  await login(perfil,cpf,senha,rota);
  const secoes=await evaluate("[...document.querySelectorAll('[data-op-nav]')].map(e=>e.dataset.opNav)");
  for(const secao of secoes){await evaluate(`document.querySelector('[data-op-nav=${secao}]').click()`);if(perfil!=='operador')await waitFor(()=>evaluate(`document.querySelector('#administracao-root').dataset.admSecaoPronta===${JSON.stringify(secao)}`),'Secao '+secao);await auditar(perfil+'-'+secao);
   if(perfil==='operador'&&secao==='alunos'){
    await evaluate("document.querySelector('[data-op-aluno]').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-op-ficha][open] [data-op-ficha-aba]')"),'Ficha aberta');
    for(const aba of ['cadastro','etapas','creditos','provas','historico','acesso']){await evaluate(`document.querySelector('[data-op-ficha-aba=${aba}]').click()`);await auditar('ficha-'+aba);}
    await evaluate("document.querySelector('[data-op-ficha]').close()");
   }}
 }
 await login('instrutor','44444444444','instrutorNova4','/instrutor/html/instrutor.html');for(const secao of ['inicio','agenda','historico','perfil']){await evaluate(`document.querySelector('[data-nav=${secao}]').click()`);await auditar('instrutor-'+secao);}
 await login('aluno','52998224725','alunoNova4','/aluno/html/dashboard.html');for(const pagina of ['dashboard','agendamento','minhas-aulas','meu-progresso','pacotes','meu-perfil']){await navigate('/aluno/html/'+pagina+'.html',"document.body.dataset.sipaOrigem==='recepcao'");await auditar('aluno-'+pagina);}
 if(problemas.length)throw new Error('Textos neutros restantes: '+JSON.stringify(problemas));
 await check('true',paginas+' paginas/temas auditados e capturados sem textos neutros cinza em superficie clara');
}
