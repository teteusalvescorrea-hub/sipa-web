import {DESLOCAMENTOS_CARRO} from '../shared/js/operacaoCarro.js';
import { UNIDADES_INSTITUCIONAIS, obterUnidadeInstitucional, pesquisaMapsUnidade } from '../shared/js/catalogoUnidades.js';
import { formatarCpf } from '../shared/js/formatacao.js';
import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { modoLocalPermitido, criarServicoLocal, resolverAmbiente, resumirCreditos, progressoPorCategoria } from "../dev/aluno/authLocal.js";

test("laboratório exige loopback HTTP(S) e parâmetro único explícito", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
        assert.equal(modoLocalPermitido(`http://${host}:5500/login.html?ambiente=local`), true);
        assert.equal(modoLocalPermitido(`https://${host}/login.html?ambiente=local`), true);
        for (const query of ["", "?ambiente=integrado", "?ambiente=LOCAL", "?ambiente=local&ambiente=local", "?ambiente=local&ambiente=integrado"]) {
            assert.equal(modoLocalPermitido(`http://${host}/login.html${query}`), false);
        }
    }
});
test("produção, file, rede local e hosts parecidos são rejeitados", () => {
    for (const url of ["invalido", "file:///login.html?ambiente=local", "https://sipa.example/login.html?ambiente=local", "http://localhost.evil.test/?ambiente=local", "http://localhost@evil.test/?ambiente=local", "http://192.168.1.10/?ambiente=local", "http://0.0.0.0/?ambiente=local"]) assert.equal(modoLocalPermitido(url), false);
});
test("serviço bloqueia antes de acessar IndexedDB fora do ambiente permitido", async () => {
    globalThis.window = { location: { href: "https://sipa.example/login.html?ambiente=local" } };
    try { await assert.rejects(criarServicoLocal(), /não autorizado/); } finally { delete globalThis.window; }
});
test("preferência explícita persiste somente em loopback e query integrado tem precedência", () => {
    assert.equal(resolverAmbiente("http://localhost/login.html", "local"), "local");
    assert.equal(resolverAmbiente("http://localhost/login.html?ambiente=integrado", "local"), "integrado");
    assert.equal(resolverAmbiente("https://sipa.example/login.html", "local"), "integrado");
    assert.equal(resolverAmbiente("http://localhost/login.html", null), "integrado");
    assert.throws(() => resolverAmbiente("http://localhost/login.html?ambiente=local&ambiente=integrado", "local"));
});
test("desligar a configuração de desenvolvimento recusa modo local mesmo em localhost", async () => {
    const fonte = await readFile(new URL("../dev/aluno/authLocal.js", import.meta.url), "utf8");
    const fonteDesligada=fonte.replace('DESENVOLVIMENTO_LOCAL_HABILITADO = true','DESENVOLVIMENTO_LOCAL_HABILITADO = false').replace(/(from\s*['"])(\.[^'"]+)(['"])/g,(_,inicio,ref,fim)=>inicio+new URL(ref,new URL('../dev/aluno/authLocal.js',import.meta.url)).href+fim);
    const desligado=await import('data:text/javascript;base64,'+Buffer.from(fonteDesligada).toString('base64'));
    assert.equal(desligado.modoLocalPermitido("http://localhost/login.html?ambiente=local", "local"), false);
    assert.equal(desligado.resolverAmbiente("http://localhost/login.html", "local"), "integrado");
    globalThis.window = { location: { href: "http://localhost/login.html?ambiente=local" } };
    try { await assert.rejects(desligado.criarServicoLocal(), /não autorizado/); } finally { delete globalThis.window; }
});
test("créditos por categoria não são aulas realizadas nem geram progresso", () => {
    const saldo = resumirCreditos({ categorias: { A: 20, B: 20 } });
    assert.equal(saldo.categorias.A.disponiveis, 20); assert.equal(saldo.categorias.B.disponiveis, 20);
    assert.equal(saldo.realizadas, 0); assert.equal(saldo.percentual, null);
});
test("reserva, cancelamento, expiração, falta e realização seguem o domínio sem duplo consumo", () => {
    const agora = Date.parse("2030-01-01T12:00:00Z"), futura = "2030-02-01T12:00:00Z", passada = "2029-02-01T12:00:00Z";
    const aula = (id, categoria, status, inicio = futura) => ({ id, categoria, status, inicio });
    const reserva = aula("1", "A", 1);
    const saldo = resumirCreditos({ categorias: { A: 20, B: 20 } }, [reserva, reserva, aula("2", "A", 2), aula("3", "B", 5, passada), aula("4", "B", 6, passada), aula("5", "A", 3, passada), aula("6", "B", 4), aula("7", "A", 4, passada)], agora);
    assert.equal(saldo.categorias.A.disponiveis, 19); assert.equal(saldo.categorias.A.reservadas, 1);
    assert.equal(saldo.categorias.B.disponiveis, 17); assert.equal(saldo.categorias.B.realizadas, 1);
    assert.equal(saldo.percentual, 3); // 1 / 40, arredondado como no domínio.
});
test("histórico sem situação/categoria não vira aula confirmada nem saldo inventado", () => {
    const saldo = resumirCreditos({ categorias: { A: 20, B: 20 } }, [{ id: "antiga", inicio: "2030-01-01" }]);
    assert.equal(saldo.incompletas, 1); assert.equal(saldo.categorias.A.disponiveis, null); assert.equal(saldo.percentual, null);
});

test("grade local reutiliza expediente, almoço, sábados, domingos e feriados", async () => {
 const { calcularHorariosLocais: calcular } = await import('../dev/aluno/authLocal.js');
 const registros = [{id:'i',tipo:'instrutor',horarioAlmoco:'11-12',unidade:'Centro',ativo:true,categorias:['A','B']},{id:'v',tipo:'veiculo',unidade:'Centro',ativo:true,categoria:'A'}];
 const dados={registros,aulas:[],aluno:{tipoCambio:'manual',unidade:'Centro'}}, consulta={categoria:'A',unidade:'Centro',data:'2030-02-04'}, agora='2030-01-01T00:00:00';
 assert.deepEqual((await calcular(dados,consulta,agora)).map(h=>h.hora),['07:00','08:00','09:00','10:00','13:00','14:00','15:00','16:00','17:00','18:00']);
 assert.equal((await calcular(dados,{...consulta,data:'2030-02-02'},agora)).length,4);
 for(const data of ['2030-02-03','2030-01-01','2029-12-31'])assert.equal((await calcular(dados,{...consulta,data},agora)).length,0);
 assert.deepEqual((await calcular(dados,consulta,'2030-02-04T14:30:00')).map(h=>h.hora),['15:00','16:00','17:00','18:00']);
 assert.equal((await calcular(dados,{...consulta,tipoCambio:'manual',categoria:'B'},agora)).length,0);
 assert.equal((await calcular(dados,{...consulta,unidade:'Outra'},agora)).length,0);
 assert.equal((await calcular({...dados,aluno:{tipoCambio:'manual',unidade:'Não informada'}},consulta,agora)).length,0);
 assert.equal((await calcular({...dados,registros:[]},consulta,agora)).length,0);
 assert.equal((await calcular({...dados,registros:registros.map(r=>({...r,ativo:false}))},consulta,agora)).length,0);
});
test("grade local respeita conflitos, vínculos de recursos e bloqueios efetivamente cadastrados",async()=>{
 const {calcularHorariosLocais:calcular}=await import('../dev/aluno/authLocal.js');
 const consulta={tipoCambio:'manual',categoria:'B',unidade:'Centro',data:'2030-02-04'},agora='2030-01-01T00:00:00';
 const recursos=[{id:'i',tipo:'instrutor',horarioAlmoco:'11-12',unidade:'Centro',ativo:true,categorias:['B'],veiculoIds:['v']},{id:'v',tipo:'veiculo',unidade:'Centro',ativo:true,tipoCambio:'manual',categoria:'B'}];
 const aula={id:'a',tipo:'aula',instrutor:'i',veiculo:'v',inicio:'2030-02-04T07:00:00-03:00',fim:'2030-02-04T08:00:00-03:00',status:3};
 let dados={registros:[...recursos,aula],aulas:[],aluno:{tipoCambio:'manual',unidade:'Centro'}};
 assert.equal((await calcular(dados,consulta,agora))[0].hora,'08:00');
 dados.registros[2]={...aula,status:2};assert.equal((await calcular(dados,consulta,agora))[0].hora,'07:00');
 dados.aulas=[{...aula,instrutor:'outro',veiculo:'outro'}];assert.equal((await calcular(dados,consulta,agora))[0].hora,'08:00');
 dados.aulas=[];dados.registros=recursos.map(r=>({...r,bloqueiosUnidade:[{data:consulta.data,inicio:'07:00',fim:'10:00'}]}));assert.equal((await calcular(dados,consulta,agora))[0].hora,'10:00');
 dados.registros=recursos.map(r=>({...r,feriadosUnidade:[consulta.data]}));assert.equal((await calcular(dados,consulta,agora)).length,0);
 dados.registros=recursos.map(r=>({...r,veiculoIds:r.tipo==='instrutor'?['outro']:undefined}));assert.equal((await calcular(dados,consulta,agora)).length,0);
});

test("unidade da reserva é independente do vínculo e usa somente recursos daquela unidade", async()=>{
 const {calcularHorariosLocais:calcular,normalizarUnidadeLocal,nomeUnidadeLocal,UNIDADES_LOCAIS}=await import('../dev/aluno/authLocal.js');
 assert.equal(UNIDADES_LOCAIS.length,6);assert.equal(normalizarUnidadeLocal('Unidade Cobilandia'),'Cobilândia');assert.equal(nomeUnidadeLocal('Itaparica'),'Unidade Itaparica');
 const dados={aluno:{tipoCambio:'manual',id:'aluno',unidade:'Cobilândia',unidadeCarro:'Itaparica'},aulas:[],registros:[{id:'i',tipo:'instrutor',horarioAlmoco:'11-12',unidade:'Unidade Itaparica',ativo:true,categorias:['B']},{id:'v',tipo:'veiculo',unidade:'Itaparica',ativo:true,tipoCambio:'manual',categoria:'B'}]};
 const consulta={tipoCambio:'manual',categoria:'B',data:'2030-02-04',unidade:'Itaparica'},agora='2030-01-01T00:00:00';
 assert.equal((await calcular(dados,consulta,agora)).length,10);
 assert.equal((await calcular(dados,{...consulta,unidade:'Cobilândia'},agora)).length,0);
 assert.equal((await calcular({...dados,registros:dados.registros.map(r=>r.tipo==='veiculo'?{...r,unidade:'Santa Rita'}:r)},consulta,agora)).length,0);
 dados.aulas=[{inicio:'2030-02-04T07:00:00-03:00',fim:'2030-02-04T08:00:00-03:00',status:3,unidade:'Santa Rita'}];
 assert.equal((await calcular(dados,consulta,agora))[0].hora,'08:00');assert.equal(dados.aluno.unidade,'Cobilândia');
});

test("jornadas explícitas limitam instrutor e veículo sem liberar almoço ou dias fechados", async()=>{
 const {calcularHorariosLocais:calcular,validarDisponibilidadeSemanal:validar}=await import('../dev/aluno/authLocal.js');
 for(const j of [[],[{dia:1,inicio:'25:00',fim:'26:00'}],[{dia:1,inicio:'10:00',fim:'09:00'}],[{dia:1,inicio:'07:00',fim:'19:00'},{dia:1,inicio:'08:00',fim:'10:00'}]])assert.throws(()=>validar(j));
 const jornada=[{dia:1,inicio:'08:00',fim:'16:00'}];assert.equal(validar(jornada),jornada);
 const dados={aluno:{tipoCambio:'manual',unidade:'Cobilândia'},aulas:[],registros:[{id:'i',tipo:'instrutor',horarioAlmoco:'11-12',unidade:'Cobilândia',ativo:true,categorias:['A','B'],disponibilidadeSemanal:jornada},{id:'v',tipo:'veiculo',unidade:'Cobilândia',ativo:true,tipoCambio:'manual',categoria:'B',disponibilidadeSemanal:[{dia:1,inicio:'09:00',fim:'17:00'}]}]};
 const consulta={tipoCambio:'manual',categoria:'B',unidade:'Cobilândia',data:'2030-02-04'},agora='2030-01-01T00:00:00';
 assert.deepEqual((await calcular(dados,consulta,agora)).map(h=>h.hora),['09:00','10:00','13:00','14:00','15:00']);
 assert.equal((await calcular(dados,{...consulta,data:'2030-02-05'},agora)).length,0);
 assert.equal((await calcular(dados,{...consulta,data:'2030-02-03'},agora)).length,0);
});
test("diagnóstico distingue falta de cadastro, categoria, jornada, bloqueio e conflitos",async()=>{
 const {consultarRecursosLocais:consultar}=await import('../dev/aluno/authLocal.js');
 const consulta={tipoCambio:'manual',categoria:'B',unidade:'Cobilândia',data:'2030-02-04'},agora='2030-01-01T00:00:00';
 const i={id:'i',tipo:'instrutor',horarioAlmoco:'11-12',unidade:'Cobilândia',ativo:true,categorias:['B'],disponibilidadeSemanal:[{dia:1,inicio:'07:00',fim:'08:00'}]},v={id:'v',tipo:'veiculo',unidade:'Cobilândia',ativo:true,tipoCambio:'manual',categoria:'B',disponibilidadeSemanal:i.disponibilidadeSemanal};
 const dados={aluno:{tipoCambio:'manual',unidade:'Cobilândia'},aulas:[],registros:[]};
 assert.match((await consultar(dados,consulta,agora)).mensagem,/Sem instrutores/);
 dados.registros=[i];assert.match((await consultar(dados,consulta,agora)).mensagem,/Sem veículos/);
 dados.registros=[i,v];assert.equal((await consultar(dados,consulta,agora)).horarios.length,1);
 dados.registros=[{...i,ativo:false},v];assert.match((await consultar(dados,consulta,agora)).mensagem,/indisponíveis/);
 dados.registros=[{...i,bloqueios:[{data:consulta.data}]},v];assert.match((await consultar(dados,consulta,agora)).mensagem,/indisponíveis/);
 const a={id:'a',tipo:'aula',instrutor:'i',veiculo:'v',status:3,inicio:'2030-02-04T07:00:00-03:00',fim:'2030-02-04T08:00:00-03:00'};
 dados.registros=[i,v,a];assert.match((await consultar(dados,consulta,agora)).mensagem,/ocupados por outros agendamentos/);
 assert.match((await consultar(dados,{...consulta,categoria:'A'},agora)).mensagem,/Sem instrutores/);
 assert.match((await consultar(dados,{...consulta,unidade:'Santa Rita'},agora)).mensagem,/unidade.*cadastrad/);
});

test("recursos fictícios têm IDs estáveis, documentos sintéticos e vínculos compatíveis nas seis unidades", async () => {
    const { criarRecursosFicticiosLocais, UNIDADES_LOCAIS, validarDisponibilidadeSemanal } = await import("../dev/aluno/authLocal.js");
    const recursos = criarRecursosFicticiosLocais();
    assert.equal(recursos.length, 48);
    assert.equal(new Set(recursos.map(r => r.id)).size, 48);
    assert.equal(new Set(recursos.map(r => r.documento)).size, 48);
    assert.deepEqual(recursos, criarRecursosFicticiosLocais(), "repetir a operação gera os mesmos identificadores e relacionamentos");
    for (const r of recursos) {
        assert.match(r.id, /^sipa-seed-recursos-v1-/);
        assert.equal(r.seedId, "sipa-recursos-agendamento-v1");
        assert.equal(r.dadosDeTeste, true);
        assert.equal(r.ativo, true);
        assert.notEqual(r.disponivel, false);
        assert.match(r.documento, r.tipo === "instrutor" ? /^TSTI\d{4}$/ : /^TSTV\d{4}$/);
        assert.match(r.nome, /teste/i);
        validarDisponibilidadeSemanal(r.disponibilidadeSemanal);
    }
    for (const unidade of UNIDADES_LOCAIS) {
        const locais = recursos.filter(r => r.unidade === unidade);
        assert.equal(locais.filter(r => r.tipo === "instrutor").length, 4);
        assert.equal(locais.filter(r => r.tipo === "veiculo").length, 4);
        for (const categoria of ["A", "B"]) {
            const instrutores = locais.filter(r => r.tipo === "instrutor" && r.categorias?.includes(categoria));
            const veiculos = locais.filter(r => r.tipo === "veiculo" && r.categoria === categoria);
            assert.equal(instrutores.length, 2);
            assert.equal(veiculos.length, 2);
            for (const i of instrutores) {
                assert.ok(i.veiculoIds?.length, "instrutor fictício possui vínculo explícito de veículo");
                assert.ok(i.veiculoIds.every(id => veiculos.some(v => v.id === id)), "vínculo respeita unidade e categoria");
            }
            assert.ok(veiculos.every(v => instrutores.some(i => i.veiculoIds.includes(v.id))));
        }
    }
    recursos[0].nome = "alterado apenas no snapshot";
    recursos[0].disponibilidadeSemanal[0].inicio = "09:00";
    assert.notEqual(criarRecursosFicticiosLocais()[0].nome, recursos[0].nome);
    assert.equal(criarRecursosFicticiosLocais()[0].disponibilidadeSemanal[0].inicio, "07:00");
});

test("recursos fictícios passam pelo mesmo cálculo de expediente, feriados e conflitos", async () => {
    const { criarRecursosFicticiosLocais, UNIDADES_LOCAIS, calcularHorariosLocais } = await import("../dev/aluno/authLocal.js");
    const dados = { aluno: {tipoCambio:'manual', id: "aluno-teste", unidade: "Cobilândia" }, aulas: [], registros: criarRecursosFicticiosLocais().map(r=>({...r,tipoCambio:'manual',operacoesCarro:DESLOCAMENTOS_CARRO})).map(r=>r.tipo==="instrutor"?{...r,horarioAlmoco:"11-12"}:r) };
    const agora = "2030-01-01T00:00:00";
    for (const unidade of UNIDADES_LOCAIS) for (const categoria of ["A", "B"]) {dados.aluno.unidadeCarro=unidade;
        const consulta = { unidade, categoria, data: "2030-02-04" };
        const horarios = await calcularHorariosLocais(dados, consulta, agora);
        assert.deepEqual(horarios.map(h => h.hora), ["07:00", "08:00", "09:00", "10:00", "13:00", "14:00", "15:00", "16:00", "17:00", "18:00"]);
        assert.ok(horarios.every(h => h.pares.length >= 2));
        assert.deepEqual((await calcularHorariosLocais(dados, { ...consulta, data: "2030-02-02" }, agora)).map(h => h.hora), ["07:00", "08:00", "09:00", "10:00"]);
        for (const data of ["2030-02-03", "2030-01-01", "2029-12-31"]) assert.equal((await calcularHorariosLocais(dados, { ...consulta, data }, agora)).length, 0);
    }
    dados.aluno.unidadeCarro="Cobilândia";const consulta = { unidade: "Cobilândia", tipoCambio: "manual", categoria: "B", data: "2030-02-04" };
    const par = (await calcularHorariosLocais(dados, consulta, agora))[0].pares[0];
    const aula = { id: "conflito-teste", tipo: "aula", aluno: "outro-aluno", instrutor: par.instrutorId, veiculo: par.veiculoId, tipoCambio: "manual", categoria: "B", unidade: "Cobilândia", status: 3, inicio: "2030-02-04T07:00:00-03:00", fim: "2030-02-04T08:00:00-03:00" };
    dados.registros.push(aula);
    const alternativas = (await calcularHorariosLocais(dados, consulta, agora))[0];
    assert.equal(alternativas.hora, "07:00", "segundo par da unidade permanece disponível");
    assert.ok(alternativas.pares.every(p => p.instrutorId !== par.instrutorId && p.veiculoId !== par.veiculoId));
    dados.aulas = [{ ...aula, aluno: "aluno-teste", instrutor: "outro", veiculo: "outro" }];
    assert.equal((await calcularHorariosLocais(dados, consulta, agora))[0].hora, "08:00", "conflito do aluno bloqueia o horário mesmo com outro par livre");
});

test('progresso por categoria considera somente concluídas, deduplica e limita a 100%',()=>{
 const a={id:'a',categoria:'A',status:5,inicio:'2020-01-01'},b={id:'b',tipoCambio:'manual',categoria:'B',status:5,inicio:'2020-01-01'};
 const r=progressoPorCategoria({categorias:{A:20,B:10}},[a,a,b,{...a,id:'c',status:2},{...b,id:'d',status:1,inicio:'2099-01-01'}]);
 assert.equal(r.categorias.A.realizadas,1);assert.equal(r.categorias.A.percentual,5);assert.equal(r.categorias.B.percentual,10);assert.equal(r.categorias.B.reservadas,1);assert.equal(r.categorias.A.disponiveis,19);
 assert.equal(progressoPorCategoria({categorias:{A:1,B:0}},[a,{...a,id:'outro'}]).categorias.A.percentual,100);
});
test('progresso sem contratação ou com histórico incompleto não inventa percentual',()=>{
 assert.equal(progressoPorCategoria(null,[]).categorias.A.percentual,null);
 assert.equal(progressoPorCategoria({categorias:{A:20,B:20}},[]).categorias.A.percentual,0);
 assert.equal(progressoPorCategoria({categorias:{A:20,B:20}},[{id:'antiga',inicio:'2020-01-01'}]).categorias.B.percentual,null);
});

test('CPF de leitura não trunca, duplica pontuação nem altera valores ausentes',()=>{assert.equal(formatarCpf('93541134780'),'935.411.347-80');assert.equal(formatarCpf('935.411.347-80'),'935.411.347-80');assert.equal(formatarCpf(null),'Não informado');assert.equal(formatarCpf('12345'),'CPF incompleto');assert.equal(formatarCpf('935411347800'),'CPF incompleto');assert.equal(formatarCpf('abc93541134780'),'CPF inválido');});

test('catálogo institucional independente do navegador preserva seis IDs e endereços fornecidos',()=>{
 assert.deepEqual(UNIDADES_INSTITUCIONAIS.map(u=>u.id),['Cobilândia','Santa Rita','Vila Velha','Itaparica','Terra Vermelha','Novo Milênio']);
 assert.equal(new Set(UNIDADES_INSTITUCIONAIS.map(u=>u.id)).size,6);
 assert.equal(obterUnidadeInstitucional('Unidade Vila Velha').nome,'Unidade Centro de Vila Velha');assert.equal(obterUnidadeInstitucional('Centro de Vila Velha').id,'Vila Velha');assert.equal(obterUnidadeInstitucional('Vila Velha').cep,null);
 assert.equal(obterUnidadeInstitucional('Santa Rita').logradouro,'Av. Fern. Antônio da Silveira');assert.equal(obterUnidadeInstitucional('Novo Milênio').complemento,'03');assert.equal(obterUnidadeInstitucional('Itaparica').complemento,'Loja 2');
 assert.equal(obterUnidadeInstitucional('Cobilândia').enderecoCompleto,'Av. Jacinto Admiral, 125 – Cobilândia, Vila Velha – ES, 29111-470');
 for(const u of UNIDADES_INSTITUCIONAIS){assert.ok(u.logradouro&&u.numero&&u.bairro&&u.cidade&&u.uf);assert.equal(u.dadosDeTeste,undefined);assert.equal(u.seedId,undefined);}
});
test('pesquisas Maps distintas usam campos institucionais codificados e não inventam IDs de API',()=>{
 const links=UNIDADES_INSTITUCIONAIS.map(u=>pesquisaMapsUnidade(u.id));assert.equal(new Set(links).size,6);
 for(const u of UNIDADES_INSTITUCIONAIS){const url=new URL(pesquisaMapsUnidade(u.id));assert.equal(url.origin,'https://www.google.com');assert.equal(url.pathname,'/maps/search/');assert.equal(url.searchParams.get('api'),'1');for(const campo of ['logradouro','numero','bairro','cidade','uf'])assert.ok(url.searchParams.get('query').includes(u[campo]));}
 assert.equal(pesquisaMapsUnidade('id-api-desconhecido'),null);
});


test("datas civis usam São Paulo na virada UTC e feriados permanecem anuais sem bloquear facultativos", async () => {
    const { agoraBrasil, feriadosBrasileiros } = await import('../shared/js/calendario.js');
    const { motivoFechamento } = await import('../shared/js/disponibilidade.js');
    assert.equal(agoraBrasil(new Date('2026-10-19T01:30:00Z')).slice(0,10), '2026-10-18');
    assert.equal(agoraBrasil(new Date('2026-10-19T03:00:00Z')).slice(0,10), '2026-10-19');
    for (const ano of [2026,2027,2028,2035]) {
        assert.equal(motivoFechamento(ano+'-12-25'),'Natal');
        for (const f of feriadosBrasileiros(ano).filter(f=>f.tipo==='facultativo')) assert.equal(motivoFechamento(f.data),'');
    }
});


test('cancelamento conta dias completos, sábado 00h01–12h, sem domingos e feriados, com precisão no limite',async()=>{
 const {calcularPrazoCancelamento:calc}=await import('../aluno/js/domain/agendamentoAluno.js');
 const aula={unidade:'Cobilândia',status:1,inicio:'2026-10-21T08:00:00-03:00'};
 assert.equal(calc(aula,[],'2026-10-19T08:00:00-03:00').dentroPrazo,true);
 assert.equal(calc(aula,[],'2026-10-19T08:00:00.001-03:00').dentroPrazo,false);
 assert.equal(calc(aula,[],'2026-10-19T07:59:59.999-03:00').dentroPrazo,true);
 const parcial=(inicio,agora,registros=[],unidade='Cobilândia')=>calc({unidade,status:1,inicio},registros,agora).milissegundosUteis;
 assert.equal(parcial('2026-10-20T00:00:00-03:00','2026-10-19T00:00:00-03:00'),24*3600000);
 assert.equal(parcial('2026-10-19T14:00:00-03:00','2026-10-19T12:00:00-03:00'),2*3600000);
 assert.equal(parcial('2026-10-24T12:00:00-03:00','2026-10-24T00:00:00-03:00'),(12*60-1)*60000);
 assert.equal(parcial('2026-10-24T00:01:00-03:00','2026-10-24T00:00:59.999-03:00'),0);
 assert.equal(parcial('2026-10-24T00:01:00.001-03:00','2026-10-24T00:01:00-03:00'),1);
 assert.equal(parcial('2026-10-26T00:00:00-03:00','2026-10-24T12:00:00-03:00'),0);
 assert.equal(calc({...aula,inicio:'2026-10-26T00:01:00-03:00'},[],'2026-10-22T12:00:00-03:00').dentroPrazo,true);
 assert.equal(calc({...aula,inicio:'2026-10-26T00:01:00-03:00'},[],'2026-10-22T12:00:00.001-03:00').dentroPrazo,false);
 assert.equal(parcial('2026-12-26T00:00:00-03:00','2026-12-25T00:00:00-03:00'),0);
 assert.equal(parcial('2027-12-25T12:00:00-03:00','2027-12-25T00:00:00-03:00'),0);
 const r={tipo:'instrutor',horarioAlmoco:'11-12',unidade:'Cobilândia',feriadosUnidade:['2026-10-19']};
 assert.equal(parcial('2026-10-20T00:00:00-03:00','2026-10-19T00:00:00-03:00',[r]),0);
 assert.equal(parcial('2026-10-20T00:00:00-03:00','2026-10-19T00:00:00-03:00',[r],'Itaparica'),24*3600000);
 assert.equal(parcial('2026-10-20T00:00:00-03:00','2026-10-19T00:00:00-03:00',[{tipo:'veiculo',unidade:'Cobilândia',bloqueiosUnidade:[{data:'2026-10-19'}]}]),24*3600000);
 assert.equal(parcial('2026-10-20T03:00:00Z','2026-10-20T02:00:00Z'),3600000);
});

test('cancelamento tardio exige aceite, retém crédito e não aprova atestado; legado não é migrado',async()=>{
 const {criarCancelamento,identificarMotivo}=await import('../aluno/js/domain/agendamentoAluno.js');
 const aula={id:'a',tipoCambio:'manual',categoria:'B',status:1,unidade:'Cobilândia',inicio:'2026-10-19T08:00:00-03:00'},agora=new Date('2026-10-19T07:00:00-03:00');
 assert.throws(()=>criarCancelamento(aula,[],'',true,agora),/motivo/);
 assert.throws(()=>criarCancelamento(aula,[],'Motivos pessoais',false,agora),/explicitamente/);
 const c=criarCancelamento(aula,[],'Motivos de saúde',true,agora);
 assert.equal(c.credito,'retido');assert.equal(c.frequencia,'justificativa_pendente');assert.equal(c.justificativa.estado,'aguardando_apresentacao');assert.equal(c.justificativa.resultado,null);
 assert.equal(Date.parse(c.justificativa.prazoApresentacao)-Date.parse(c.em),72*3600000);
 assert.equal(identificarMotivo('Problema de locomoção').id,'transporte');
 const credito={categorias:{B:20,A:20}};
 assert.equal(resumirCreditos(credito,[{...aula,status:2,cancelamento:c}],Date.parse(c.em)).categorias.B.disponiveis,19);
 assert.equal(resumirCreditos(credito,[{...aula,status:2}],Date.parse(c.em)).categorias.B.disponiveis,20);
 const pontual=criarCancelamento({...aula,inicio:'2026-11-03T08:00:00-03:00'},[],'Motivos pessoais',false,agora);
 assert.equal(pontual.credito,'devolvido');assert.equal(pontual.justificativa,null);
 const expirada=criarCancelamento({...aula,status:3,inicio:'2026-10-18T08:00:00-03:00'},[],'Motivos pessoais',false,agora);assert.equal(expirada.credito,'nao_consumido');
});

test('preferências e antecipação validam campos sem depender de IDs enviados de outros alunos',async()=>{
 const {normalizarPreferenciasAutomaticas:n,normalizarAntecipacao:a}=await import('../aluno/js/domain/agendamentoAluno.js');
 const p={tipoCambio:'manual',categoria:'B',unidades:['Cobilândia'],dias:[1],horarios:['07:00'],quantidade:2};
 assert.equal(n(p).quantidade,2);assert.throws(()=>n({...p,dias:[0]}));assert.throws(()=>n({...p,horarios:['12:00']}));assert.throws(()=>n({...p,instrutores:['outro']}));assert.throws(()=>n({...p,quantidade:1.5}));
 assert.equal(a({ativo:true,notificacoes:false,alunoId:'outro'}).alunoId,undefined);
 assert.equal(a({ativo:false,notificacoes:true}).notificacoes,true);
 assert.throws(()=>a({ativo:true,notificacoes:false,observacoes:'a'.repeat(241)}));
});

test('proposta determinística usa recursos reais, respeita saldo, unidades, preferências e conflitos sem gravar',async()=>{
 const {gerarPropostaAutomatica:g}=await import('../aluno/js/domain/agendamentoAluno.js');
 const {criarRecursosFicticiosLocais,calcularHorariosLocais}=await import('../dev/aluno/authLocal.js');
 const registros=criarRecursosFicticiosLocais().map(r=>({...r,tipoCambio:'manual',operacoesCarro:DESLOCAMENTOS_CARRO})),dados={aluno:{tipoCambio:'manual',id:'aluno',unidade:'Cobilândia'},registros,aulas:[],resumo:{categorias:{B:{disponiveis:5},A:{disponiveis:5}}}},antes=JSON.stringify(dados);
 const p={tipoCambio:'manual',categoria:'B',unidades:['Itaparica','Cobilândia'],dias:[1],horarios:['07:00'],quantidade:5};
 const opts={agora:'2026-10-19T06:00:00',horizonteDias:1};
 const proposta=await g(dados,p,calcularHorariosLocais,opts);
 assert.equal(proposta.aulas.length,1);assert.equal(proposta.aulas[0].unidade,'Cobilândia');assert.equal(proposta.reservada,false);
 assert.deepEqual((await g(dados,p,calcularHorariosLocais,opts)).aulas,proposta.aulas);assert.equal(JSON.stringify(dados),antes);
 const r=registros.find(r=>r.tipo==='instrutor'&&r.categorias.includes('B')&&r.unidade==='Cobilândia');
 const selecionada=await g(dados,{...p,instrutores:[r.id]},calcularHorariosLocais,opts);assert.equal(selecionada.aulas[0].instrutorId,r.id);
 await assert.rejects(g(dados,{...p,quantidade:6},calcularHorariosLocais,opts),/saldo/);
 const sem={...dados,registros:[]};assert.equal((await g(sem,p,calcularHorariosLocais,opts)).aulas.length,0);
 const moto=await g(dados,{...p,categoria:'A'},calcularHorariosLocais,opts);assert.ok(moto.aulas.every(a=>registros.find(r=>r.id===a.veiculoId).categoria==='A'));
 const ocupada={...dados,aulas:[{id:'existente',status:1,inicio:'2026-10-19T07:00:00-03:00',fim:'2026-10-19T08:00:00-03:00'}]};assert.equal((await g(ocupada,p,calcularHorariosLocais,opts)).aulas.length,0);
});

test('limpeza preserva consumos retidos sem alterar totais, reservas ou progresso',()=>{
    const agora=Date.parse('2026-10-19T10:00:00-03:00'),credito={categorias:{A:20,B:20}};
    const retidas=['A','B'].map((categoria,i)=>({id:'retida-'+i,categoria,status:2,inicio:'2026-10-20T07:00:00-03:00',cancelamento:{credito:'retido'}}));
    const outras=[{id:'confirmada',tipoCambio:'manual',categoria:'B',status:1,inicio:'2026-10-20T08:00:00-03:00'},{id:'concluida',categoria:'A',status:5,inicio:'2026-10-18T08:00:00-03:00'}];
    const preservado={...credito,consumosPreservadosLimpeza:retidas.map(a=>({categoria:a.categoria,quantidade:1}))};
    assert.deepEqual(resumirCreditos(preservado,outras,agora),resumirCreditos(credito,[...retidas,...outras],agora));
    assert.deepEqual(progressoPorCategoria(preservado,outras,agora),progressoPorCategoria(credito,[...retidas,...outras],agora));
    assert.deepEqual(preservado.categorias,{A:20,B:20});
});

test('disponibilidade de antecipação valida grade e preserva combinações por dia',async()=>{
 const {normalizarDisponibilidadeAntecipacao:n,horariosAntecipacao:h}=await import('../aluno/js/domain/agendamentoAluno.js');
 const valor={1:['09:00','08:00','08:00'],3:['14:00'],6:['10:00']},original=JSON.stringify(valor),normal=n(valor,true);
 assert.deepEqual(normal[1],['08:00','09:00']);assert.deepEqual(normal[3],['14:00']);assert.deepEqual(normal[6],['10:00']);assert.equal(JSON.stringify(valor),original);
 assert.equal(h(1).length,11);assert.equal(h(6).length,5);assert.ok(!h(1).includes('12:00'));assert.throws(()=>h(0));
 for(const invalido of [{},{7:['08:00']},{6:['14:00']},{1:['12:00']},{1:'08:00'},{alunoId:'outra-conta'}])assert.throws(()=>n(invalido,true));
 assert.deepEqual(n({},false),{1:[],2:[],3:[],4:[],5:[],6:[]});
});
