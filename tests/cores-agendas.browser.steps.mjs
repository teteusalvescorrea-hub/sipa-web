import {validarAdministracao} from './administracao.browser.steps.mjs';
export async function validarCores(ctx){
 const {evaluate,waitFor,check,navigate,send,screenshot}=ctx;
 await validarAdministracao(ctx);
 const rotas={operador:'/nivel-1-operador/html/operador-cfc.html',gerencia:'/nivel-2-gerencia/html/gerencia.html',master:'/nivel-3-master/html/master.html',instrutor:'/instrutor/html/instrutor.html',aluno:'/aluno/html/dashboard.html'};
 async function login(perfil,cpf,senha){await navigate('/login.html',"!!document.querySelector('#tipo-acesso')");await evaluate(`document.querySelector('#tipo-acesso').value=${JSON.stringify(perfil)};document.querySelector('#login-cpf').value=${JSON.stringify(cpf)};document.querySelector('#login-password').value=${JSON.stringify(senha)};document.querySelector('#login-form').requestSubmit()`);await waitFor(()=>evaluate(`location.pathname===${JSON.stringify(rotas[perfil])}&&document.readyState==='complete'&&${perfil==='aluno'?"document.body?.dataset.sipaOrigem==='recepcao'":perfil==='instrutor'?"!!document.querySelector('[data-metrica=agendadas]')":"!!document.querySelector('[data-op-nav=agenda]')"}`),'Login '+perfil);}
 async function validar(nome,seletor){
  await waitFor(()=>evaluate(`!!document.querySelector(${JSON.stringify(seletor)})`),nome);
  for(const tema of ['light','dark']){
   await evaluate(`document.documentElement.dataset.theme='${tema}'`);
   await check(`getComputedStyle(document.querySelector(${JSON.stringify(seletor)})).color===${JSON.stringify(tema==='light'?'rgb(0, 0, 0)':'rgb(244, 247, 251)')}`,nome+' texto '+tema);
   await check(`(()=>{const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/shared/css/agendas.css'));const el=document.querySelector(${JSON.stringify(seletor)});function medidas(){const c=getComputedStyle(el),r=el.getBoundingClientRect();return JSON.stringify([r.x,r.y,r.width,r.height,c.fontSize,c.fontFamily,c.lineHeight,c.padding,c.margin,c.borderWidth,c.backgroundColor]);}const antes=medidas();sheet.disabled=true;const depois=medidas();sheet.disabled=false;return antes===depois;})()`,nome+' preserva geometria '+tema);
  }
  await check(`(()=>{const sheet=[...document.styleSheets].find(s=>s.href?.endsWith('/shared/css/agendas.css'));const controles=[...document.querySelectorAll('.op-badge,.op-slot-disponivel,.op-evento-horario,.op-agenda-modos button[aria-pressed=true],.sipa-sidebar-link,.in-badge,.in-primary,.in-sidebar a,.calendar-day.selected,.time-slot.selected,.confirm-booking-button,.local-lesson-status,.sidebar a')];const cores=()=>JSON.stringify(controles.map(e=>{const c=getComputedStyle(e);return [c.color,c.backgroundColor];}));const antes=cores();sheet.disabled=true;const depois=cores();sheet.disabled=false;if(antes!==depois)throw new Error(JSON.stringify(controles.map((e,i)=>({classe:e.className,antes:JSON.parse(antes)[i],depois:JSON.parse(depois)[i]})).filter(x=>JSON.stringify(x.antes)!==JSON.stringify(x.depois))));return controles.length>0;})()`,nome+' preserva cores funcionais e sidebar');
  await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});
  await check('document.documentElement.scrollWidth<=390',nome+' sem overflow da pagina');
  await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1080,deviceScaleFactor:1,mobile:false});
 }
 for(const [perfil,cpf,senha] of [['operador','77777777777','123456'],['gerencia','22222222222','gerenteNova4'],['master','33333333333','masterNova4']]){
  await login(perfil,cpf,senha);await evaluate("document.querySelector('[data-op-nav=agenda]').click()");
  await waitFor(()=>evaluate("!!document.querySelector('[data-agenda-veiculo] option[value]:not([value=\"\"])')"),'Recursos');
  await evaluate("var v=document.querySelector('[data-agenda-veiculo]');v.selectedIndex=1;v.dispatchEvent(new Event('change'));var d=document.querySelector('[data-agenda-data]');d.value='2026-10-23';d.dispatchEvent(new Event('change'))");
  for(const modo of ['dia','semana','mes']){await evaluate(`document.querySelector('[data-agenda-modo=${modo}]').click()`);await validar(perfil+' '+modo,modo==='mes'?'.op-month-weekday':modo==='semana'?'.op-week-hours>*':'.op-agenda-slot>time');}
  await screenshot('cores-'+perfil+'.png');
  if(perfil!=='operador'){
   await evaluate("document.querySelector('[data-op-nav=agenda]').click()");
   await waitFor(()=>evaluate("!!document.querySelector('[data-admin-consulta-agendas]')"),'Consulta global');await evaluate("document.querySelector('[data-admin-consulta-agendas]').click()");await validar(perfil+' consulta global','[data-op-panel=agenda-global] label');
   await evaluate("document.querySelector('[data-op-nav=antecipacao]').click()");await validar(perfil+' antecipacao','[data-op-panel=antecipacao] label');
  }
 }
 await login('instrutor','44444444444','instrutorNova4');await evaluate("document.querySelector('[data-nav=agenda]').click()");await validar('Instrutor agenda','.in-blocked>.in-slot-time');await screenshot('cores-instrutor.png');
 await login('aluno','52998224725','alunoNova4');await navigate('/aluno/html/agendamento.html',"!!document.querySelector('.calendar-weekdays span')");await validar('Aluno calendario','.calendar-weekdays span');await screenshot('cores-aluno.png');
 await navigate('/aluno/html/minhas-aulas.html',"!!document.querySelector('.local-lesson-fields dt')");await validar('Aluno aulas','.local-lesson-fields dt');
}
