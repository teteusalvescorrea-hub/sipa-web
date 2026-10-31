export async function validarOperacaoCarro({evaluate,waitFor,check,navigate,send,screenshot}){
 await navigate('/nivel-1-operador/html/operador-cfc.html?demo=1&ambiente=local&unidade=Cobil%C3%A2ndia',"!!document.querySelector('.op-unidade')");
 await evaluate("document.querySelector('[data-op-nav=cadastro]').click()");
 for(const categoria of ['A','D','B','AB']){
  await evaluate(`var f=document.querySelector('[data-op-panel=cadastro] form');f.elements.categoria.value='${categoria}';f.elements.categoria.dispatchEvent(new Event('change'))`);
  await check(`document.querySelector('[name=tipoCambio]').disabled===${!categoria.includes('B')}`,'Campo de cambio por categoria '+categoria);
 }
 for(const [categoria,tipoCambio,cpf] of [['B','manual','52998224725'],['B','automatico','93541134780'],['AB','manual','11144477735'],['AB','automatico','16899535009']]){
  const count=await evaluate("JSON.parse(localStorage.getItem('sipa.operador.demo.v2'))?.alunos.length||0");
  await evaluate(`document.querySelector('[data-op-nav=cadastro]').click();var f=document.querySelector('[data-op-panel=cadastro] form');f.elements.categoria.value='${categoria}';f.elements.categoria.dispatchEvent(new Event('change'));f.elements.tipoCambio.value='${tipoCambio}';f.elements.tipoCambio.dispatchEvent(new Event('change'))`);
  await check(`document.querySelector('[name=unidadeCarro]').options.length===${tipoCambio==='automatico'?3:7}`,'Unidades de cadastro '+categoria+' '+tipoCambio);
  if(categoria==='B'&&tipoCambio==='automatico'){
   for(const width of [1440,390])for(const theme of ['light','dark']){
    await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate(`SipaTema.salvar('${theme}')`);
    await check("document.documentElement.scrollWidth<=innerWidth+1&&!document.querySelector('[name=tipoCambio]').closest('label').hidden",'Cadastro carro responsivo '+width+' '+theme);await screenshot('cadastro-carro-'+width+'-'+theme+'.png');
   }
   await send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:1,mobile:false});
  }
  await evaluate(`var f=document.querySelector('[data-op-panel=cadastro] form');Object.entries({nome:'Aluno Carro ${tipoCambio} ${categoria}',cpf:'${cpf}',nascimento:'2000-01-01',telefone:'27999999999',email:'${cpf}@example.invalid',unidadeCarro:'Cobilândia',quantidadeCarro:'10',quantidadeMoto:'5',observacoes:'Cadastro explicito no teste descartavel.'}).forEach(([k,v])=>f.elements[k].value=v);f.requestSubmit()`);
  await waitFor(()=>evaluate("document.querySelector('[data-op-confirmar-cadastro]').open"),'Confirmacao cadastro');
  await check(`document.querySelector('[data-op-confirmar-cadastro]').textContent.includes('${tipoCambio==='manual'?'Manual':'Automático'}')`,'Revisao mostra cambio '+tipoCambio);
  await evaluate("document.querySelector('[data-op-confirmar-cadastro] .op-button-primary').click()");
  await waitFor(()=>evaluate(`JSON.parse(localStorage.getItem('sipa.operador.demo.v2'))?.alunos.length===${count+1}&&!document.querySelector('#operador-conteudo[aria-busy]')`),'Cadastro persistido');
 }
 await evaluate("document.querySelector('[data-op-nav=alunos]').click();document.querySelector('[data-op-aluno]').click()");
 await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').open"),'Ficha');
 await check("document.querySelector('[data-op-ficha]').textContent.includes('Manual')&&!document.querySelector('[data-op-editar-cadastro]')",'Ficha mostra cambio somente leitura');
 await evaluate("document.querySelector('[data-op-ficha]').close()");
 for(const [tipo,cambio] of [['instrutores',''],['recursos','manual'],['recursos','automatico']]){
  await evaluate(`document.querySelector('[data-op-nav=${tipo}]').click();document.querySelector('[data-op-panel=${tipo}] .op-card button').click()`);
  await waitFor(()=>evaluate("!!document.querySelector('[data-op-cadastro-recurso-form]')"),'Formulario recurso');
  if(tipo==='recursos')await waitFor(()=>evaluate("document.querySelector('[name=instrutorId]').options.length>1"),'Instrutores para carro');
  await evaluate(`var f=document.querySelector('[data-op-cadastro-recurso-form]');f.elements.categoria.value='B';f.elements.categoria.dispatchEvent(new Event('change'));Object.entries({nome:'Recurso ${tipo} ${cambio}',identificacao:'TESTE-${tipo}-${cambio}'}).forEach(([k,v])=>f.elements[k].value=v);${tipo==='instrutores'?"f.elements.horarioAlmoco.value='11:00/13:00'":`f.elements.tipoCambio.value='${cambio}'`};if(f.elements.instrutorId)f.elements.instrutorId.selectedIndex=1;f.requestSubmit()`);
  await waitFor(()=>evaluate("!document.querySelector('[data-op-cadastro-recurso]')"),'Recurso salvo');
 }
 await evaluate("(async()=>{const m=await import('/dev/aluno/contaRecepcao.js');await m.autenticarContaRecepcao('52998224725','529982');await m.definirSenhaRecepcao('abcd','abcd');})()");
 await navigate('/aluno/html/meu-perfil.html',"!!document.querySelector('#profile-car-transmission')");
 await check("document.querySelector('#profile-car-transmission').textContent==='Manual'",'Perfil usa mesmo cambio da recepcao');
 await navigate('/aluno/html/agendamento.html',"!!document.querySelector('#booking-mode-auto')&&!!document.querySelector('[data-category=B]')&&!document.querySelector('[data-category=B]').disabled");
 await waitFor(()=>evaluate("[...document.querySelectorAll('#calendar-days button')].some(b=>b.textContent.trim()==='22'&&!b.disabled)"),'Calendario');
 await evaluate("[...document.querySelectorAll('#calendar-days button')].find(b=>b.textContent.trim()==='22'&&!b.disabled).click()");
 await waitFor(()=>evaluate("!!document.querySelector('[data-hora=\"09:00\"]')"),'Horarios B deslocamento');
 await check("document.querySelector('#booking-unit-address').textContent.includes('Centro de Vila Velha')&&document.querySelector('#booking-unit-address').textContent.includes('Neste dia')&&document.querySelector('#booking-unidade').disabled",'Quinta usa local real sem transferencia');
 await evaluate("document.querySelector('[data-hora=\"09:00\"]').click();document.querySelector('#summary-lessons button').click()");
 await waitFor(()=>evaluate("!!document.querySelector('[data-instrutores] button')"),'Recursos');
 await evaluate("document.querySelector('[data-instrutores] button').click()");
 await check("document.querySelector('[data-veiculos]').textContent.includes('manual')&&!document.querySelector('[data-veiculos]').textContent.includes('automatico')",'Aluno manual nao recebe veiculo automatico');
 await evaluate("document.querySelector('[data-veiculos] button').click();document.querySelector('[data-confirmar]').click()");
 await waitFor(()=>evaluate("!document.querySelector('.booking-resource-dialog')"),'Escolha recursos');
 await check("document.querySelector('#summary-lessons').textContent.includes('Centro de Vila Velha')",'Revisao usa local da data');
 await evaluate("document.querySelector('#confirm-booking').click()");
 await waitFor(()=>evaluate("!!document.querySelector('#agendamentos-confirmados[open]')"),'Reserva B');
 await check("document.querySelector('#agendamentos-confirmados').textContent.includes('Centro de Vila Velha')",'Confirmacao usa local real');
 await navigate('/aluno/html/minhas-aulas.html',"document.querySelectorAll('#lessons-list [data-aula-local]').length===1");
 await check("document.querySelector('#lessons-list').textContent.includes('Centro de Vila Velha')&&document.querySelector('#lessons-list .unit-map-link').href.includes('Luciano')",'Minhas aulas e mapa no destino');
 await navigate('/aluno/html/dashboard.html',"document.querySelector('#credito-B')?.textContent==='9'");
 await check("document.querySelector('#proxima-aula-conteudo').textContent.includes('Centro de Vila Velha')",'Proxima aula e credito unicos');
 await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')),a=e.alunos.find(a=>a.cpf==='52998224725');return e.aulas.length===1&&a.unidadeCarro==='Cobilândia'&&a.unidadePrincipal==='Cobilândia'&&a.tipoCambio==='manual'&&e.aulas[0].localReal.id==='Vila Velha'&&e.aulas[0].tipoCambio==='manual';})()",'Reserva unica, cadastro e historico sem transferencia artificial');
 for(const width of [1440,390])for(const theme of ['light','dark']){
  await send('Emulation.setDeviceMetricsOverride',{width,height:1000,deviceScaleFactor:1,mobile:false});await evaluate(`SipaTema.salvar('${theme}')`);
  await check("document.documentElement.scrollWidth<=innerWidth+1",'Carro responsivo '+width+' '+theme);await screenshot('carro-'+width+'-'+theme+'.png');
 }
 await navigate('/nivel-1-operador/html/operador-cfc.html?demo=1&ambiente=local&unidade=Cobil%C3%A2ndia',"!!document.querySelector('.op-unidade')");
 await evaluate("document.querySelector('[data-op-nav=agenda]').click();var v=document.querySelector('[data-agenda-veiculo]');v.value=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).aulas.find(a=>a.categoria==='B').veiculoId;v.dispatchEvent(new Event('change'));var d=document.querySelector('[data-agenda-data]');d.value='2026-10-22';d.dispatchEvent(new Event('change'));document.querySelector('[data-agenda-modo=dia]').click()");
 await waitFor(()=>evaluate("!!document.querySelector('[data-aula-id]')"),'Reserva na agenda da recepcao');
 await evaluate("document.querySelector('[data-aula-id]').click()");await waitFor(()=>evaluate("!!document.querySelector('.op-aula-dados')"),'Detalhes carregados');
 await check("document.querySelector('[data-op-aula]').textContent.includes('Centro de Vila Velha')&&document.querySelector('[data-op-aula]').textContent.includes('Manual')",'Agenda da recepcao mostra cambio, origem e local real');
 await evaluate("document.querySelector('[data-op-aula]').close();document.querySelector('[data-op-nav=alunos]').click();[...document.querySelectorAll('[data-op-aluno]')].find(b=>b.textContent==='Aluno Carro automatico B').click()");
 await waitFor(()=>evaluate("document.querySelector('[data-op-ficha]').open"),'Ficha automatico');await evaluate("document.querySelector('[data-op-transferir]').click()");
 await check("[...document.querySelector('[data-op-nova-unidade]').options].filter(o=>o.value).length===1&&document.querySelector('[data-op-nova-unidade]').options[1].value==='Vila Velha'",'Transferencia do automatico mantem restricao de unidade');
 await evaluate("document.querySelector('[data-op-transferencia]').close();document.querySelector('[data-op-ficha]').close()");
 await evaluate("(async()=>{const m=await import('/dev/aluno/contaRecepcao.js');await m.sairContaRecepcao();await m.autenticarContaRecepcao('93541134780','935411');await m.definirSenhaRecepcao('abcd','abcd');})()");
 await navigate('/aluno/html/agendamento.html',"!!document.querySelector('#booking-mode-auto')");
 await waitFor(()=>evaluate("[...document.querySelectorAll('#calendar-days button')].some(b=>b.textContent.trim()==='22'&&!b.disabled)"),'Calendario automatico');
 await evaluate("[...document.querySelectorAll('#calendar-days button')].find(b=>b.textContent.trim()==='22'&&!b.disabled).click()");
 await waitFor(()=>evaluate("!!document.querySelector('[data-hora=\"10:00\"]')"),'Horarios automatico');
 await check("!document.querySelector('[data-hora=\"09:00\"]')",'Instrutor compartilhado nao duplica reserva de outro aluno');
 await evaluate("document.querySelector('[data-hora=\"10:00\"]').click();document.querySelector('#summary-lessons button').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-instrutores] button')"),'Recursos automatico');await evaluate("document.querySelector('[data-instrutores] button').click()");
 await check("document.querySelector('[data-veiculos]').textContent.includes('automatico')&&!document.querySelector('[data-veiculos]').textContent.includes('manual')",'Automatico nao recebe carro manual');
}
