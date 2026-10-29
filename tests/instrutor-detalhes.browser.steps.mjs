export async function validarDetalhesInstrutor({evaluate,waitFor,check,navigate,send,screenshot}){
 await navigate('/__tests__/blank',"document.readyState==='complete'");
 await evaluate(`(async()=>{
 const {segredo}=await import('/dev/aluno/authLocal.js');
 const c={...await segredo('InstrutorTeste8'),id:'conta-instrutor-modal',recursoId:'instrutor-modal',nome:'Instrutor Modal',login:'52998224725',perfil:'instrutor',ativa:true,trocaObrigatoria:false,versaoSenha:1,unidade:'Vila Velha'};
 localStorage.setItem('sipa.acessos.v2',JSON.stringify({versao:2,contas:[c],sessoes:[]}));localStorage.setItem('sipa.migracao.acessos.v2','concluida');
 const recursos=[{id:c.recursoId,nome:c.nome,cpf:c.login,tipo:'Instrutores',ativo:true,categorias:['B'],unidade:'Vila Velha',horarioAlmoco:'11-12',veiculoIds:['veiculo-modal']},{id:'veiculo-modal',nome:'Carro do teste',modelo:'Carro do teste',placa:'TST1A23',tipo:'Veículos',categoria:'B',ativo:true,unidade:'Vila Velha',instrutorId:c.recursoId}];
 const aulas=[['presenca-modal','07:00'],['falta-modal','08:00'],['futura-modal','09:00']].map(([id,inicio])=>({id,alunoId:'aluno-modal',instrutorId:c.recursoId,veiculoId:'veiculo-modal',categoria:'B',tipoCambio:'manual',unidade:'Vila Velha',data:'2026-10-19',inicio,fim:inicio.slice(0,2)+':50',status:1,historico:Array.from({length:14},(_,i)=>({status:1,em:'2026-10-18T10:00:00-03:00',acao:'agendamento'}))}));
 localStorage.setItem('sipa.operador.demo.v2',JSON.stringify({versao:2,alunos:[{id:'aluno-modal',nome:'Aluno do modal',cpf:'11111111111',unidade:'Vila Velha',categoria:'B',creditos:{B:{contratadas:10,disponiveis:7}}}],recursos,aulas}));
 const {autenticar}=await import('/dev/autenticacao.js');await autenticar(c.login,'InstrutorTeste8','instrutor');
 })()`);
 await navigate('/instrutor/html/instrutor.html#agenda',"!!document.querySelector('[data-agenda-aula]')||!!document.querySelector('.in-agenda-lesson')");
 const abrir=async(id)=>{await evaluate(`document.querySelector('[data-aula="${id}"], [data-agenda-aula="${id}"]').click()`);await waitFor(()=>evaluate("!!document.querySelector('.in-lesson-dialog[open]')"),'Detalhes abertos');};
 // A agenda expõe seu botão por data-aula; evita depender da ordem visual.
 await check("document.querySelectorAll('.in-agenda-lesson').length===3",'Agenda mantém as três aulas');
 await abrir('presenca-modal');
 await check("(()=>{const d=document.querySelector('.in-lesson-dialog');return ['Aluno do modal','Informações da aula','Tipo de carro','Instrutor Modal','TST1A23','Local da aula','Histórico','Registrar resultado da aula'].every(t=>d.textContent.includes(t))})()",'Dados, localização, histórico e ações organizados');
 await check("(()=>{const s=document.querySelector('.unit-location>svg'),c=getComputedStyle(s),r=s.getBoundingClientRect();return r.width===18&&r.height===18&&c.fill==='none'&&c.stroke!=='none'})()",'Ícone pequeno com dimensões e traço explícitos');
 await check("(()=>{const a=document.querySelector('.unit-map-link');return a.href.startsWith('https://www.google.com/maps/')&&a.target==='_blank'&&a.rel.includes('noopener')})()",'Ver localização mantém Google Maps em nova aba');
 await evaluate("document.querySelector('.unit-map-link').click()");
 const alvos=await send('Target.getTargets');const mapa=alvos.targetInfos.find(t=>t.type==='page'&&t.url.startsWith('https://www.google.com/maps/'));if(!mapa)throw new Error('O link não abriu a aba do mapa');await send('Target.closeTarget',{targetId:mapa.targetId});
 await check("!!document.querySelector('.in-lesson-dialog[open]')",'Mapa abre em outra aba e mantém os detalhes abertos');
 for(const tema of ['light','dark']){await evaluate(`SipaTema.aplicar('${tema}')`);await screenshot('instrutor-detalhes-'+tema+'.png');await check("(()=>{const d=document.querySelector('.in-lesson-dialog'),b=document.querySelector('.in-lesson-content');b.scrollTop=b.scrollHeight;return d.scrollWidth<=d.clientWidth&&b.scrollTop>0})()",'Rolagem interna sem excesso horizontal: '+tema);}
 await send('Emulation.setDeviceMetricsOverride',{width:1280,height:720,deviceScaleFactor:1,mobile:false});
 await check("(()=>{const d=document.querySelector('.in-lesson-dialog'),r=d.getBoundingClientRect();return r.top>=0&&r.bottom<=720&&d.scrollWidth<=d.clientWidth})()",'Modal cabe no notebook com rolagem interna');
 await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:1,mobile:true});await evaluate("document.querySelector('.in-lesson-content').scrollTop=0");
 await screenshot('instrutor-detalhes-celular.png');
 await check("(()=>{const d=document.querySelector('.in-lesson-dialog'),r=d.getBoundingClientRect();return r.left>=0&&r.right<=390&&d.scrollWidth<=d.clientWidth&&r.bottom<=844})()",'Modal responsivo no celular');
 await send('Emulation.clearDeviceMetricsOverride');
 await evaluate("document.querySelector('[data-registrar=\"5\"]').click()");
 await waitFor(()=>evaluate("!!document.querySelector('.in-result-dialog[open]')"),'Confirmação de presença');
 await check("document.querySelector('.in-result-dialog').textContent.includes('compareceu e realizou a aula do dia 19/10/2026, às 07:00')",'Confirmação mostra aluno, data e horário');
 await evaluate("[...document.querySelectorAll('.in-result-dialog button')].find(b=>b.textContent==='Cancelar').click()");
 await waitFor(()=>evaluate("!!document.querySelector('.in-lesson-dialog[open]')"),'Cancelar retorna aos detalhes');
 await check("JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).aulas.every(a=>a.status===1)",'Cancelar não altera nenhuma aula');
 await evaluate("document.querySelector('[data-registrar=\"5\"]').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-confirmar=\"5\"]')"),'Confirmação reaberta');
 await evaluate("document.querySelector('[data-confirmar=\"5\"]').click();document.querySelector('[data-confirmar=\"5\"]')?.click()");
 await waitFor(()=>evaluate("!document.querySelector('dialog[open]')"),'Presença salva');
 await check("(()=>{const e=JSON.parse(localStorage.getItem('sipa.operador.demo.v2')),a=e.aulas.find(a=>a.id==='presenca-modal');return a.status===5&&a.historico.filter(h=>h.status===5).length===1&&e.alunos[0].creditos.B.disponiveis===7})()",'Presença persistida uma única vez e créditos preservados');
 await abrir('presenca-modal');await check("!document.querySelector('.in-lesson-dialog [data-registrar]')",'Resultado encerrado não pode ser registrado de novo');await evaluate("document.querySelector('.in-dialog-close').click()");await waitFor(()=>evaluate("!document.querySelector('dialog[open]')"),'Fechar detalhes');
 await abrir('falta-modal');await evaluate("document.querySelector('[data-registrar=\"6\"]').click()");await waitFor(()=>evaluate("!!document.querySelector('[data-confirmar=\"6\"]')"),'Confirmação de falta');await check("document.querySelector('.in-result-dialog').textContent.includes('não compareceu à aula do dia 19/10/2026, às 08:00')",'Confirmação de falta correta');await evaluate("document.querySelector('[data-confirmar=\"6\"]').click()");await waitFor(()=>evaluate("!document.querySelector('dialog[open]')"),'Falta salva');
 await check("JSON.parse(localStorage.getItem('sipa.operador.demo.v2')).aulas.find(a=>a.id==='falta-modal').status===6",'Falta refletida no registro compartilhado da recepção e aluno');
 await check("(async()=>{const {registrarAgendamentoVinculado}=await import('/dev/instrutor/agendamentosLocais.js');const antes=localStorage.getItem('sipa.operador.demo.v2');for(const [id,s] of [['presenca-modal',6],['falta-modal',5],['futura-modal',5]]){let recusada=false;try{await registrarAgendamentoVinculado(id,s)}catch{recusada=true}if(!recusada)return false;}return antes===localStorage.getItem('sipa.operador.demo.v2')})()",'Serviço recusa repetição, alteração de resultado e registro futuro sem mutações');
 await abrir('futura-modal');await check("[...document.querySelectorAll('.in-lesson-dialog [data-registrar]')].every(b=>b.disabled)",'Aula futura continua bloqueada');await evaluate("document.querySelector('.in-dialog-close').click()");
 await evaluate("document.querySelector('[data-nav=inicio]').click()");
 await check("document.querySelector('[data-metrica=realizadas]').textContent==='1'&&document.querySelector('[data-metrica=faltas]').textContent==='1'",'Indicadores atualizados imediatamente após os registros');
 await navigate('/instrutor/html/instrutor.html',"!!document.querySelector('[data-metrica=realizadas]')");await check("document.querySelector('[data-metrica=realizadas]').textContent==='1'&&document.querySelector('[data-metrica=faltas]').textContent==='1'",'Presença e falta persistem após recarregar');
}
