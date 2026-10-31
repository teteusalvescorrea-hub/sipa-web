export async function validarRedefinicaoAluno({evaluate,waitFor,check,navigate,send,screenshot}){
 await navigate('/__tests__/blank',"document.readyState==='complete'");
 await evaluate(`(async()=>{
 const {segredo}=await import('/dev/aluno/authLocal.js'),{criarAluno}=await import('/dev/operador/dadosDemo.js'),seg=await segredo('AdministrativoTeste8');
 const contas=[['operador','77777777777','Vila Velha'],['operador','88888888888','Terra Vermelha'],['gerencia','22222222222','Vila Velha'],['master','33333333333','Terra Vermelha']].map(([perfil,login,unidade])=>({...seg,id:'conta-'+login,perfil,login,unidade,nome:'Administrador de teste',ativa:true,trocaObrigatoria:false,versaoSenha:1}));
 localStorage.setItem('sipa.acessos.v2',JSON.stringify({versao:2,contas,sessoes:[]}));localStorage.setItem('sipa.migracao.acessos.v2','concluida');
 const aluno={...criarAluno({nome:'Aluno para recuperação',cpf:'52998224725',categoria:'B'},'reset-aluno'),unidade:'Vila Velha',unidadePrincipal:'Vila Velha',unidadeCarro:'Terra Vermelha',contaId:'conta-aluno',aulasAdquiridas:{B:10},creditos:{B:{contratadas:10,disponiveis:9}}};
 const conta={...await segredo('AntigaTeste8'),id:aluno.contaId,alunoId:aluno.id,perfil:'ALUNO',login:aluno.cpf,ativa:true,trocaObrigatoria:false,ativadaEm:new Date().toISOString(),versaoSenha:1};
 const aulas=[{id:'reserva-preservada',alunoId:aluno.id,categoria:'B',data:'2026-11-20',inicio:'14:00',fim:'14:50',unidade:'Terra Vermelha',status:1,historico:[]}];
 localStorage.setItem('sipa.operador.demo.v2',JSON.stringify({versao:2,alunos:[aluno],recursos:[],aulas,contasAlunos:[conta],sessoesAlunos:[]}));window.antesRedefinicao={aluno,aulas};
 })()`);
 const antes=await evaluate("JSON.stringify(JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).aulas)");
 async function login(perfil,cpf,senha='AdministrativoTeste8'){
  await navigate('/login.html',"!!document.querySelector('#tipo-acesso')");
  await evaluate(`document.querySelector('#tipo-acesso').value='${perfil}';document.querySelector('#login-cpf').value='${cpf}';document.querySelector('#login-password').value='${senha}';document.querySelector('#login-form').requestSubmit()`);if(['gerencia','master'].includes(perfil))await waitFor(()=>evaluate("document.querySelector('#administracao-root')?.dataset.admSecaoPronta==='visao-geral'"),'Painel administrativo pronto');
 }
 async function ficha(){
  await waitFor(()=>evaluate("!!document.querySelector('[data-op-nav=alunos]')"),'Painel carregado');
  await evaluate("document.querySelector('[data-op-nav=alunos]').click();document.querySelector('[data-op-aluno=reset-aluno]').click()");
  await waitFor(()=>evaluate("!!document.querySelector('[data-op-ficha][open]')"),'Ficha aberta');
  await check("!document.querySelector('[data-op-ficha] [data-op-redefinir-aluno]')",'Cadastro preservado sem acao duplicada');
  await evaluate("document.querySelector('[data-op-ficha-aba=acesso]').click()");
  await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').dataset.opAba==='acesso'"),'Aba Acesso');
  await check("!document.querySelector('[data-op-ficha] [data-op-redefinir-aluno]')&&!document.querySelector('[data-op-ficha] .op-reset-access')",'Acesso sem método anterior de redefinição');
  await check("[...document.querySelectorAll('[data-op-ficha-aba]')].map(b=>b.textContent).join('|')==='Cadastro|Exames e agendamento de prova|Aulas|Provas marcadas|Histórico|Acesso|Redefinir senha'",'Sete abas com Redefinir senha imediatamente após Acesso');
  await evaluate("document.querySelector('[data-op-ficha-aba=senha]').click()");
  await waitFor(()=>evaluate("!!document.querySelector('[data-op-ficha][open] [data-op-redefinir-aluno]')"),'Ação de redefinição disponível');
  await check("document.querySelector('.op-reset-access').textContent.includes('529.982.247-25')&&document.querySelector('.op-reset-access').textContent.includes('Aluno para recuperação')",'Novo painel mostra nome e CPF cadastrado');
  for(const [w,h]of [[1366,768],[390,844]])for(const tema of ['light','dark']){
   await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<600});await evaluate(`SipaTema.salvar('${tema}');document.querySelector('[data-op-ficha-aba=senha]').scrollIntoView({block:'nearest',inline:'end',behavior:'instant'})`);
   await check("(()=>{const d=document.querySelector('[data-op-ficha]'),b=document.querySelector('[data-op-ficha-aba=senha]'),t=d.querySelector('.op-local-tabs'),r=t.getBoundingClientRect();return t.scrollWidth<=t.clientWidth+1&&[...t.children].every(b=>{const x=b.getBoundingClientRect();return x.left>=r.left-1&&x.right<=r.right+1;})&&d.scrollWidth<=d.clientWidth+1&&b.getAttribute('aria-pressed')==='true'&&document.querySelector('[data-op-redefinir-aluno]').textContent==='Redefinir senha do aluno';})()",'Nova aba responsiva '+w+' '+tema);
   await screenshot('aba-redefinir-'+w+'-'+tema+'.png');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
 }
 for(const [perfil,cpf]of [['operador','77777777777'],['gerencia','22222222222'],['master','33333333333']]){
  await login(perfil,cpf);await ficha();
  const antesCancelar=await evaluate("localStorage.getItem('sipa.operador.demo.v2')");
  await evaluate("document.querySelector('[data-op-redefinir-aluno]').click()");
  await waitFor(()=>evaluate("!!document.querySelector('[data-op-redefinir-aluno][open]')"),'Modal aberto');
  await check("(()=>{const d=document.querySelector('.op-reset-dialog');return d.textContent.includes('529.982.247-25')&&d.querySelector('h2').textContent==='Confirmar redefini\u00e7\u00e3o de senha'&&d.querySelectorAll('input[type=password]').length===0&&d.textContent.includes('seis primeiros');})()",perfil+' modal mostra CPF cadastrado e não exibe senha anterior');
  for(const [w,h]of [[1366,768],[390,844]])for(const tema of ['light','dark']){
   await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<600});await evaluate(`SipaTema.salvar('${tema}')`);
   await check("(()=>{const d=document.querySelector('.op-reset-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&d.scrollWidth<=d.clientWidth+1;})()",perfil+' modal responsivo '+w+' '+tema);
   if(perfil==='operador')await screenshot('redefinir-'+w+'-'+tema+'.png');
  }
  await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  await evaluate("document.querySelector('.op-reset-dialog footer button').click()");await check("!document.querySelector('.op-reset-dialog[open]')",perfil+' cancelar fecha sem redefinir');
  await waitFor(()=>evaluate("!document.querySelector('.op-reset-dialog')"),'Modal anterior removido');await evaluate("document.querySelector('[data-op-ficha] [data-op-redefinir-aluno]').click()");await waitFor(()=>evaluate("!!document.querySelector('.op-reset-dialog[open]')"),'Reabrir modal');
  await check('localStorage.getItem("sipa.operador.demo.v2")==='+JSON.stringify(antesCancelar),perfil+' cancelar não altera credenciais');
  const antesOperacao=await evaluate("localStorage.getItem('sipa.operador.demo.v2')");
  if(perfil==='operador'){
   await evaluate("window.setItemOriginalReset=Storage.prototype.setItem;Storage.prototype.setItem=function(k,v){if(k==='sipa.operador.demo.v2')throw Error('Falha de gravacao de teste');return window.setItemOriginalReset.call(this,k,v);};document.querySelector('.op-reset-dialog[open] form').requestSubmit()");
   await waitFor(()=>evaluate("!!document.querySelector('.op-reset-dialog[open] [role=alert]')?.textContent&&!document.querySelector('.op-reset-dialog[open]').hasAttribute('aria-busy')"),'Falha de persistencia informada');
   await check('!document.querySelector("[data-op-senha-redefinida][open]")&&localStorage.getItem("sipa.operador.demo.v2")==='+JSON.stringify(antesOperacao),'Falha nao mostra sucesso nem altera dados');
   await evaluate("Storage.prototype.setItem=window.setItemOriginalReset");
  }
  const antesEventos=await evaluate("JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).auditoria?.filter(h=>h.tipo==='redefinicao-senha-aluno').length||0");
  await evaluate("const f=document.querySelector('.op-reset-dialog[open] form');f.requestSubmit();f.requestSubmit()");
  await check("document.querySelector('.op-reset-dialog[open]').getAttribute('aria-busy')==='true'&&document.querySelector('.op-reset-dialog[open] button[type=submit]').disabled",perfil+' processamento bloqueia cliques repetidos');
  // Nas passagens seguintes a provisória anterior já foi substituída pela pessoal.
  await waitFor(()=>evaluate("!!document.querySelector('[data-op-senha-redefinida][open]')"),'Sucesso da redefinição');
  await check("document.querySelector('[data-op-ficha] .op-reset-access').textContent.includes('Redefinição pendente')&&!document.querySelector('[data-op-ficha] .op-reset-access').textContent.includes('Não realizada')",perfil+' status e data atualizados');
  await check("document.querySelector('[data-op-senha-redefinida] h2').textContent==='Senha redefinida com sucesso!'",perfil+' confirmação visual de sucesso');
  await evaluate("document.querySelector('[data-op-senha-redefinida] button.op-button-primary').click()");
  await check("JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).auditoria.filter(h=>h.tipo==='redefinicao-senha-aluno').length==="+(antesEventos+1),perfil+' confirmacao executada uma unica vez');
  await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));return e.contasAlunos[0].trocaObrigatoria&&e.sessoesAlunos.length===0&&e.auditoria.some(h=>h.tipo==='redefinicao-senha-aluno');})()",perfil+' revoga sessões e registra auditoria');
  await login('aluno','52998224725',perfil==='operador'?'AntigaTeste8':'PessoalTeste9');
  await waitFor(()=>evaluate("document.querySelector('#login-submit')?.disabled===false"),'Tentativa de login concluída');
  await check("location.pathname==='/login.html'&&!document.querySelector('[data-definir-senha-recepcao]')",perfil+' senha anterior não permite entrada');
  await login('aluno','52998224725','529982');
  await waitFor(()=>evaluate("!!document.querySelector('[data-definir-senha-recepcao][open]')"),'Troca obrigatória');
  await check("location.pathname==='/login.html'",perfil+' painel permanece bloqueado durante troca');
  await evaluate("(()=>{const f=document.querySelector('[data-definir-senha-recepcao] form');f.elements.nova.value=f.elements.confirmacao.value='PessoalTeste9';f.requestSubmit();})()");
  await waitFor(()=>evaluate("location.pathname==='/aluno/html/dashboard.html'&&document.body.dataset.sipaOrigem==='recepcao'"),'Aluno acessa painel original');
  await check(`JSON.stringify(JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).aulas)===${JSON.stringify(antes)}`,perfil+' agendamento existente preservado');
 }
 await login('operador','88888888888');await waitFor(()=>evaluate("!!document.querySelector('[data-op-nav=alunos]')"),'Recepção da unidade de carro');await evaluate("document.querySelector('[data-op-nav=alunos]').click();document.querySelector('[data-op-aluno=reset-aluno]').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-op-ficha][open]')"),'Ficha operacional');
 await evaluate("document.querySelector('[data-op-ficha-aba=senha]').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-op-ficha][data-op-aba=senha] .op-reset-access')"),'Redefinição da unidade externa');
 await check("!document.querySelector('[data-op-ficha] [data-op-redefinir-aluno]')",'Unidade de aulas não concede redefinição de credenciais');
 await login('master','33333333333');await waitFor(()=>evaluate("!!document.querySelector('[data-op-nav=alunos]')"),'Master');await check("JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).auditoria.filter(h=>h.tipo==='redefinicao-senha-aluno').length===3",'As três redefinições permanecem na auditoria interna');
 await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));return e.alunos[0].creditos.B.disponiveis===9&&!Object.hasOwn(e.contasAlunos[0],'senha')&&!(function contem(v){return v==='529982'||!!v&&typeof v==='object'&&Object.values(v).some(contem);})(e.auditoria)&&!JSON.stringify(e).includes('PessoalTeste9');})()",'Créditos preservados e senhas ausentes do snapshot em texto puro');
 await evaluate("document.querySelector('[data-op-nav=acessos]').click()");await waitFor(()=>evaluate("document.querySelector('#administracao-root').dataset.admSecaoPronta==='acessos'"),'Acessos do Master');
 await check("(()=>{const r=[...document.querySelectorAll('[data-op-panel=acessos] tr')].find(r=>r.textContent.includes('529.982.247-25'));return !!r&&!r.textContent.includes('Abrir senha na ficha')&&!r.textContent.includes('Redefinir acesso');})()",'Gestão de acessos sem opções anteriores de redefinição de aluno');
 await check("(async()=>{const {gerirAcesso}=await import('/dev/contasAdministrativas.js');try{await gerirAcesso({id:'conta-aluno',acao:'redefinir',confirmado:true,justificativa:'Teste de bloqueio'});return false;}catch(e){return e.message.includes('Ficha completa');}})()",'Comando genérico não redefine senha de aluno');
 if(process.env.SIPA_REDEFINICAO_FOCO!=='primeiro-acesso'){
 // Registros exclusivos desta origem descartável, sem alterar os cadastros do usuário.
 await evaluate(`(async()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')),{criarAluno}=await import('/dev/operador/dadosDemo.js');for(const [i,categoria]of ['A','B','AB','D'].entries()){
 const id='resumo-'+categoria,categorias=categoria==='AB'?['A','B']:[categoria],a={...criarAluno({nome:'Resumo '+categoria,cpf:'1111111111'+i,categoria},id),unidade:'Vila Velha',unidadePrincipal:'Vila Velha',unidadeCarro:'Vila Velha',financeiro:'Regular',aulasAdquiridas:Object.fromEntries(categorias.map(c=>[c,10])),creditos:Object.fromEntries(categorias.map(c=>[c,{contratadas:10,disponiveis:6}]))};e.alunos.push(a);
 for(const c of categorias)for(const [n,status]of [1,3,5,6].entries())e.aulas.push({id:id+c+n,alunoId:id,categoria:c,data:[1,3].includes(status)?'2026-11-20':'2026-10-15',inicio:String(7+n).padStart(2,'0')+':00',fim:String(7+n).padStart(2,'0')+':50',status,unidade:'Vila Velha',historico:[]});}localStorage.setItem('sipa.operador.demo.v2',JSON.stringify(e));})()`);
 for(const [perfil,cpf]of [['operador','77777777777'],['gerencia','22222222222'],['master','33333333333']]){
  await login(perfil,cpf);await waitFor(()=>evaluate("!!document.querySelector('[data-op-nav=alunos]')"),'Resumo '+perfil);await evaluate("document.querySelector('[data-op-nav=alunos]').click()");
  for(const categoria of ['A','B','AB','D']){
   await evaluate(`document.querySelector('[data-op-aluno="resumo-${categoria}"]').click()`);await waitFor(()=>evaluate("!!document.querySelector('[data-op-ficha][open]')"),'Ficha de resumo');await evaluate("document.querySelector('[data-op-ficha-aba=creditos]').click()");
   await waitFor(()=>evaluate("!!document.querySelector('.op-resumo-aulas-card')"),'Resumo renderizado');
   const quantidade=categoria==='AB'?2:1;
   await check(`(()=>{const cards=[...document.querySelectorAll('.op-resumo-aulas-card')];return cards.length===${quantidade}&&cards.every(c=>c.querySelectorAll('dl>div').length===5&&!c.textContent.includes('Aulas liberadas')&&c.querySelector('[data-op-total=adquiridas]').textContent==='10'&&c.querySelector('[data-op-total=disponiveis]').textContent==='6'&&c.querySelector('[data-op-total=reservadas]').textContent==='2'&&c.querySelector('[data-op-total=realizadas]').textContent==='1'&&c.querySelector('[data-op-total=faltas]').textContent==='1');})()`,perfil+' '+categoria+' cinco indicadores e cálculos preservados');
   for(const [w,h]of [[1366,768],[390,844]])for(const tema of ['light','dark']){
    await send('Emulation.setDeviceMetricsOverride',{width:w,height:h,deviceScaleFactor:1,mobile:w<600});await evaluate(`SipaTema.salvar('${tema}')`);await check("(()=>{const d=document.querySelector('[data-op-ficha]');return d.scrollWidth<=d.clientWidth+1&&document.documentElement.scrollWidth<=innerWidth+1;})()",perfil+' resumo '+categoria+' '+w+' '+tema);
    if(perfil==='operador'&&categoria==='AB')await screenshot('resumo-ab-'+w+'-'+tema+'.png');
   }
   await evaluate("document.querySelector('[data-op-ficha]').close()");await send('Emulation.setDeviceMetricsOverride',{width:1366,height:768,deviceScaleFactor:1,mobile:false});
  }
 }
 }
 for(const [perfil,cpf]of [['operador','77777777777'],['gerencia','22222222222'],['master','33333333333']]){
  await evaluate("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2'));e.contasAlunos=[];e.sessoesAlunos=[];delete e.alunos[0].contaId;localStorage.setItem('sipa.operador.demo.v2',JSON.stringify(e));})()");
  await login(perfil,cpf);await ficha();
  await check("!document.querySelector('.op-reset-access').textContent.includes('Somente no desenvolvimento')&&!document.querySelector('.op-reset-access').textContent.includes('Gest'+String.fromCharCode(227)+'o de Acessos')",perfil+' sem avisos tecnicos ou bloqueio por falta de conta');
  await evaluate("document.querySelector('[data-op-redefinir-aluno]').click()");await waitFor(()=>evaluate("!!document.querySelector('.op-reset-dialog[open]')"),'Confirmacao de criacao');
  await evaluate("const f=document.querySelector('.op-reset-dialog[open] form');f.requestSubmit();f.requestSubmit()");await waitFor(()=>evaluate("!!document.querySelector('[data-op-senha-redefinida][open]')"),'Conta criada');
  await check("document.querySelector('[data-op-senha-redefinida]').textContent.includes('foi criado')&&JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).contasAlunos.length===1",perfil+' criou exatamente uma conta no cadastro existente');
  await check("document.querySelector('[data-op-senha-redefinida] h2').textContent==='Acesso criado com sucesso!'",perfil+' título de sucesso identifica criação de acesso');
  await evaluate("document.querySelector('[data-op-senha-redefinida] button.op-button-primary').click()");
  await login('aluno','52998224725','529982');await waitFor(()=>evaluate("!!document.querySelector('[data-definir-senha-recepcao][open]')"),'Primeiro acesso da conta criada');
  await evaluate("(()=>{const f=document.querySelector('[data-definir-senha-recepcao] form');f.elements.nova.value=f.elements.confirmacao.value='NovaPessoalTeste9';f.requestSubmit();})()");await waitFor(()=>evaluate("document.body.dataset.sipaOrigem==='recepcao'"),'Conta criada abre painel');
  await login('aluno','52998224725','529982');await waitFor(()=>evaluate("document.querySelector('#login-submit')?.disabled===false"),'Tentativa com provisória antiga concluída');
  await check("location.pathname==='/login.html'&&!document.querySelector('[data-definir-senha-recepcao][open]')",perfil+' senha provisória deixa de funcionar após a troca');
  await login('aluno','52998224725','NovaPessoalTeste9');await waitFor(()=>evaluate("document.body.dataset.sipaOrigem==='recepcao'"),'Novo login da conta criada');await check("location.pathname==='/aluno/html/dashboard.html'",perfil+' aluno sem conta passa a usar senha pessoal normalmente');
 }
}
