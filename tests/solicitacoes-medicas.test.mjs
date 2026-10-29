import test from 'node:test';
import assert from 'node:assert/strict';
import {validarAtestado,LIMITE_ATESTADO,solicitarMedico,encaminharMedico,STATUS_MEDICO,creditoDoAtestado,etapasDoAtestado,ultimaAtualizacaoAtestado} from '../shared/js/solicitacoesMedicas.js';
import {consultarSolicitacoesMedicas,obterSolicitacaoMedica,encaminharSolicitacaoMedica} from '../nivel-1-operador/js/solicitacoesOperador.js';
import {resumirCreditosRecepcao} from '../aluno/js/domain/creditosRecepcao.js';
import {linhaTempoAluno} from '../nivel-1-operador/js/fichaOperador.js';
import {consultarAgenda} from '../nivel-1-operador/js/dominioOperador.js';
const agora=new Date('2026-10-19T08:00:00-03:00'),op={id:'recepcao',nivel:1,unidade:'Cobilândia',permissoes:['consultar','verificar']};
const aluno={id:'s',nome:'Aluno teste',cpf:'52998224725',categoria:'B',unidade:'Cobilândia',unidadePrincipal:'Cobilândia',aulasAdquiridas:{B:10},creditos:{B:{contratadas:10,disponiveis:9}},historico:[]};
const aula={id:'a',alunoId:'s',categoria:'B',unidade:'Cobilândia',data:'2026-10-20',inicio:'10:00',fim:'10:50',status:1,historico:[]};
const pedido={id:'medica-teste-001',documento:{id:'medica-teste-001',tipo:'image/png',hash:'a'.repeat(64),tamanho:100},observacoes:'Documento fictício.'};
const criar=()=>solicitarMedico(aluno,aula,[],pedido,agora);
test('anexo obrigatório: extensão, MIME, assinatura, vazio e limite configurável',async()=>{
 const png=new File([new Uint8Array([137,80,78,71,13,10,26,10,0])],'teste.PNG',{type:'image/png'});
 const d=await validarAtestado(png);assert.equal(d.tipo,'image/png');assert.equal(d.hash.length,64);
 for(const f of [null,new File([],'vazio.pdf',{type:'application/pdf'}),new File(['MZexecutavel'],'x.png',{type:'image/png'}),new File(['%PDF-teste'],'x.exe',{type:'application/pdf'}),new File(['%PDF-teste'],'x.pdf',{type:'text/plain'})])await assert.rejects(validarAtestado(f));
 await assert.rejects(validarAtestado(png,8),/até/);
 await assert.rejects(validarAtestado({name:'x.png',type:'image/png',size:LIMITE_ATESTADO+1,arrayBuffer:async()=>png.arrayBuffer()}),/até/);
 assert.equal((await validarAtestado(new File(['%PDF-teste'],'teste.pdf',{type:'application/pdf'}))).tipo,'application/pdf');
 assert.equal((await validarAtestado(new File([new Uint8Array([255,216,255,0])],'teste.jpeg',{type:'image/jpeg'}))).tipo,'image/jpeg');
});
test('cancelamento médico retém crédito, tem ID único, não duplica e preserva o cadastro',()=>{
 const antes=structuredClone({aluno,aula}),n=criar();assert.equal(n.status,2);assert.equal(n.cancelamento.credito,'retido');assert.equal(n.solicitacaoMedica.status,'recepcao');assert.equal(n.solicitacaoMedica.creditosEnvolvidos,1);assert.deepEqual(n.solicitacaoMedica.aulaIds,['a']);
 assert.deepEqual({aluno,aula},antes);assert.equal(solicitarMedico(aluno,n,[],pedido,agora),n);
 assert.throws(()=>solicitarMedico(aluno,n,[],{...pedido,id:'outro-id-teste'},agora),/já possui/);
 const projetar=a=>({...a,inicio:a.data+'T'+a.inicio+':00-03:00'});assert.equal(resumirCreditosRecepcao(aluno,[projetar(n)]).categorias.B.disponiveis,9);
});
test('dentro do prazo usa cancelamento normal; aula alheia, passada, documento ausente e observação inválida são bloqueados',()=>{
 assert.throws(()=>solicitarMedico(aluno,{...aula,data:'2026-10-24'},[],pedido,agora),/normal/);
 for(const a of [{...aula,alunoId:'outro'},{...aula,data:'2026-10-18'},{...aula,status:5}])assert.throws(()=>solicitarMedico(aluno,a,[],pedido,agora));
 assert.throws(()=>solicitarMedico(aluno,aula,[],{...pedido,documento:null},agora));
 assert.throws(()=>solicitarMedico(aluno,aula,[],{...pedido,observacoes:'x'.repeat(2001)},agora));
});
test('recepção consulta somente sua unidade e aluno autorizado; não recebe permissões de gerência',()=>{
 const e={alunos:[aluno],aulas:[criar()],recursos:[]};assert.equal(consultarSolicitacoesMedicas(e,op).length,1);
 assert.equal(consultarAgenda(e,op)[0].solicitacaoMedica,undefined);
 const externa={...op,unidade:'Itaparica'};assert.equal(consultarSolicitacoesMedicas(e,externa).length,0);assert.throws(()=>obterSolicitacaoMedica(e,externa,pedido.id));
 assert.throws(()=>encaminharSolicitacaoMedica(e,{...op,permissoes:['consultar']},pedido.id,'Parecer válido',agora));
 assert.doesNotThrow(()=>encaminharMedico(e.aulas[0],{...op,nivel:2},'Parecer válido',agora));
 for(const s of ['aprovado','rejeitado','gerencia'])assert.throws(()=>encaminharMedico({...e.aulas[0],solicitacaoMedica:{...e.aulas[0].solicitacaoMedica,status:s}},op,'Parecer válido',agora));
 assert.equal(Object.keys(STATUS_MEDICO).length,4);
});
test('encaminhamento preserva documento e créditos, histórico estável e sem devolução ou decisão final',()=>{
 const e={alunos:[aluno],aulas:[criar()],recursos:[]},antes=structuredClone(e);
 assert.throws(()=>encaminharSolicitacaoMedica(e,op,pedido.id,'',agora));assert.throws(()=>encaminharSolicitacaoMedica(e,op,pedido.id,{status:'aprovado',creditos:10},agora));
 const n=encaminharSolicitacaoMedica(e,op,pedido.id,'Documento conferido para encaminhamento.',agora),s=n.aulas[0].solicitacaoMedica;
 assert.equal(s.status,'gerencia');assert.equal(s.parecer.responsavel,op.id);assert.equal(n.aulas[0].status,2);assert.equal(n.aulas[0].cancelamento.credito,'retido');assert.deepEqual(s.documento,pedido.documento);assert.deepEqual(n.alunos,e.alunos);assert.deepEqual(e,antes);
 assert.deepEqual(s.devolucao,{estado:'pendente_decisao',aulas:[],operacaoId:null});assert.equal(s.eventos.length,2);assert.throws(()=>encaminharSolicitacaoMedica(n,op,pedido.id,'Outro parecer',agora));
 const h=linhaTempoAluno(aluno,n.aulas);assert.ok(h.some(x=>x.id===pedido.id+'-envio'));assert.ok(h.some(x=>x.id===pedido.id+'-encaminhamento'));assert.deepEqual(linhaTempoAluno(aluno,n.aulas),h);
});
test('acompanhamento distingue aprovação de devolução e exige comprovante da operação correta',()=>{
 const s=criar().solicitacaoMedica,antes=structuredClone(s);
 assert.equal(creditoDoAtestado(s).texto,'Não devolvido — aguardando decisão');
 assert.equal(creditoDoAtestado({...s,status:'gerencia'}).texto,'Não devolvido — aguardando decisão da gerência');
 const aprovado={...s,status:'aprovado'};
 assert.equal(creditoDoAtestado(aprovado).texto,'Devolução pendente');
 assert.equal(creditoDoAtestado({...aprovado,cancelamento:{credito:'devolvido'}}).confirmado,false);
 assert.equal(creditoDoAtestado({...aprovado,devolucao:{estado:'confirmada'}}).confirmado,false);
 const confirmacao={estado:'confirmada',operacaoId:'operacao-teste-isolado',responsavel:'gerente-autorizado',em:'2026-10-20T12:00:00-03:00',aulas:[{aulaId:aula.id,alunoId:aluno.id,categoria:'B',quantidade:1}]};
 assert.deepEqual(creditoDoAtestado({...aprovado,devolucao:confirmacao}),{texto:'Devolvido',quantidade:1,confirmado:true});
 for(const alteracao of [{aulaId:'outra'},{alunoId:'outro'},{categoria:'D'},{quantidade:2}])assert.equal(creditoDoAtestado({...aprovado,devolucao:{...confirmacao,aulas:[{...confirmacao.aulas[0],...alteracao}]}}).confirmado,false);
 assert.equal(creditoDoAtestado({...aprovado,devolucao:{...confirmacao,aulas:[confirmacao.aulas[0],confirmacao.aulas[0]]}}).confirmado,false);
 assert.equal(creditoDoAtestado({...s,status:'rejeitado',devolucao:confirmacao}).texto,'Não devolvido — solicitação rejeitada');
 assert.deepEqual(s,antes);assert.equal(aluno.creditos.B.disponiveis,9);
});
test('etapas e última atualização refletem somente eventos conhecidos sem concluir etapas futuras',()=>{
 const s=criar().solicitacaoMedica;
 assert.deepEqual(etapasDoAtestado(s).map(e=>e.estado),['concluida','atual','pendente','pendente']);
 const em='2026-10-20T09:00:00-03:00',g={...s,status:'gerencia',parecer:{responsavel:'recepcao',em}};
 assert.deepEqual(etapasDoAtestado(g).map(e=>e.estado),['concluida','concluida','atual','pendente']);
 assert.equal(ultimaAtualizacaoAtestado(g),em);
 assert.equal(etapasDoAtestado({...s,status:'gerencia'})[1].estado,'pendente');
 for(const status of ['aprovado','rejeitado'])assert.equal(etapasDoAtestado({...g,status}).at(-1).estado,'concluida');
 assert.equal(ultimaAtualizacaoAtestado({}),null);
});
