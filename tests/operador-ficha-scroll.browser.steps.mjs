export async function verificarRolagem({evaluate,send,check,screenshot},validar=false){
 await evaluate("(()=>{const d=document.querySelector('[data-op-ficha]');d.scrollTop=0;window.__scrollFicha={form:d.querySelector('[data-op-tentativa]'),foco:document.activeElement,mutacoes:0,y:scrollY};window.__scrollObserver=new MutationObserver(ms=>window.__scrollFicha.mutacoes+=ms.length);window.__scrollObserver.observe(d,{subtree:true,childList:true});})()");
 const pos=await evaluate("(()=>{const r=document.querySelector('[data-op-ficha]').getBoundingClientRect();return {x:Math.round(r.left+r.width/2),y:Math.round(r.top+r.height/2)};})()");
 for(const deltaY of [20000,-20000,900,-900,20000,-20000]){
  await send('Input.dispatchMouseEvent',{type:'mouseWheel',...pos,deltaX:0,deltaY});
  await evaluate("new Promise(r=>requestAnimationFrame(()=>requestAnimationFrame(r)))");
 }
 const diagnostico=await evaluate("(()=>{const d=document.querySelector('[data-op-ficha]'),c=getComputedStyle(d);window.__scrollObserver.disconnect();return {mutacoes:window.__scrollFicha.mutacoes,mesmoFormulario:window.__scrollFicha.form===d.querySelector('[data-op-tentativa]'),mesmoFoco:window.__scrollFicha.foco===document.activeElement,deslocamentoFundo:scrollY-window.__scrollFicha.y,backdrop:getComputedStyle(d,'::backdrop').backdropFilter,overflow:c.overflowY,altura:d.clientHeight,conteudo:d.scrollHeight};})()");
 console.log('Diagnostico de rolagem '+JSON.stringify(diagnostico));
 if(validar){
  await check("window.__scrollFicha.mutacoes===0&&window.__scrollFicha.form===document.querySelector('[data-op-tentativa]')&&window.__scrollFicha.foco===document.activeElement",'Rolagem repetida sem reconstruir campos ou mudar foco');
  await check("getComputedStyle(document.querySelector('[data-op-ficha]'),'::backdrop').backdropFilter==='blur(5px)'&&scrollY===window.__scrollFicha.y",'Ficha com blur constante sem deslocar pagina ao rolar');
  if(screenshot)await screenshot('rolagem-ficha.png');
 }
}
export async function verificarBackdropUnico({evaluate,waitFor,check,send,screenshot}){
 await evaluate("window.__fichaBackdrop=document.querySelector('[data-op-ficha]');sessionStorage.setItem('backdrop-antes',localStorage.getItem('sipa.operador.demo.v2'))");
 for(const width of [1440,390])for(const theme of ['light','dark']){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate(`SipaTema.salvar('${theme}')`);
  for(let volta=0;volta<2;volta++)for(const id of ['cadastro','etapas','creditos','provas','historico','acesso']){
   await evaluate(`document.querySelector('[data-op-ficha-aba=${id}]').click()`);await waitFor(()=>evaluate(`document.querySelector('[data-op-ficha]').dataset.opAba==='${id}'`),'Backdrop aba '+id);
   await check("(()=>{const d=document.querySelector('[data-op-ficha]'),b=getComputedStyle(d,'::backdrop'),c=getComputedStyle(d);return d===window.__fichaBackdrop&&d.open&&document.querySelectorAll('[data-op-ficha]').length===1&&b.backdropFilter==='blur(5px)'&&b.backgroundColor==='rgba(8, 29, 52, 0.627)'&&b.position==='fixed'&&b.inset==='0px'&&c.filter==='none'&&c.backdropFilter==='none'&&c.opacity==='1'&&d.scrollWidth<=d.clientWidth+1;})()",'Backdrop unico constante e modal nitido '+id+' '+width+' '+theme+' '+volta);
   if(volta===0&&['etapas','provas'].includes(id))await screenshot('backdrop-'+id+'-'+width+'-'+theme+'.png');
  }
 }
 await evaluate("document.querySelector('[data-op-ficha] .op-close').click()");await check("!document.querySelector('[data-op-ficha]').open",'Fechar ficha remove o backdrop nativo');
 await evaluate("document.querySelector('[data-op-aluno=s1]').click()");await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').open&&document.querySelector('[data-op-ficha]').dataset.opAba==='cadastro'"),'Reabrir ficha com backdrop');
 await check("document.querySelector('[data-op-ficha]')===window.__fichaBackdrop&&getComputedStyle(window.__fichaBackdrop,'::backdrop').backdropFilter==='blur(5px)'&&localStorage.getItem('sipa.operador.demo.v2')===sessionStorage.getItem('backdrop-antes')",'Reabrir mantem o mesmo modal sem alterar registros');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
}
export async function verificarCenarioExtenso(ctx){
 const {evaluate,waitFor,check,send,screenshot}=ctx;
 await evaluate("(()=>{const chave='sipa.operador.demo.v2',original=localStorage.getItem(chave);sessionStorage.setItem('scroll-snapshot',original);const e=JSON.parse(original),a=e.alunos[0];a.tentativasProvas.push(...['praticaCarro','praticaMoto'].map((tipo,i)=>({id:'scroll-ativa-'+i,tipo,ordem:1,data:'2027-12-31',status:'Agendado',historico:[]})),...Array.from({length:40},(_,i)=>({id:'scroll-anterior-'+i,tipo:'teorica',ordem:i+2,data:'2026-10-01',status:'Reprovado',resultado:'Reprovado',historico:[]})));localStorage.setItem(chave,JSON.stringify(e));document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[3].click();})()");
 await waitFor(()=>evaluate("document.querySelectorAll('[data-op-data-prova]').length===3"),'Tres provas agendadas');
 await check("[...document.querySelectorAll('[data-op-data-prova]')].every(c=>c.readOnly&&/^\\d{2}\\/\\d{2}\\/\\d{4}$/.test(c.value))&&document.querySelectorAll('[data-op-data-prova]')[1].value==='31/12/2027'",'Teoria, carro e moto com datas brasileiras protegidas');
 await evaluate("document.querySelectorAll('[data-op-data-prova]')[1].focus()");await send('Input.insertText',{text:'01/01/2030'});await check("document.querySelectorAll('[data-op-data-prova]')[1].value==='31/12/2027'",'Digitacao nao altera data confirmada');
 await check("document.querySelector('.op-tentativas-anteriores').tagName==='SECTION'&&!document.querySelector('.op-tentativas-anteriores summary')&&document.querySelectorAll('[data-op-resultado-prova]').length===40",'Quarenta resultados visiveis sem expandir');
 for(const width of [1440,390])for(const theme of ['light','dark']){
  await send('Emulation.setDeviceMetricsOverride',{width,height:900,deviceScaleFactor:1,mobile:false});await evaluate(`SipaTema.salvar('${theme}')`);
  await verificarRolagem({evaluate,send,check},true);
  await check("(()=>{const d=document.querySelector('[data-op-ficha]');return d.scrollWidth<=d.clientWidth+1&&d.dataset.opAba==='provas'&&document.querySelector('.op-tentativas-anteriores').children.length===41;})()",'Modal extenso estavel sem overflow '+width+' '+theme);
  await evaluate("document.querySelector('[data-op-data-prova]').scrollIntoView({block:'center'})");await screenshot('datas-provas-'+width+'-'+theme+'.png');
 }
 await evaluate("localStorage.setItem('sipa.operador.demo.v2',sessionStorage.getItem('scroll-snapshot'));document.querySelectorAll('[data-op-ficha] .op-local-tabs button')[3].click()");
 await waitFor(()=>evaluate("document.querySelectorAll('[data-op-data-prova]').length===1"),'Restaurar cenario original sem alterar dados');
 await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
}
