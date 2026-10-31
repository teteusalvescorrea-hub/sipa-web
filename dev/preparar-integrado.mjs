// Preparação local, sem publicação, Git ou alteração da cópia de desenvolvimento.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const raiz = fileURLToPath(new URL('../', import.meta.url));
export async function prepararIntegrado(destino) {
    if (!destino) throw new Error('Informe um diretório novo fora de sipa-web.');
    const saida = path.resolve(destino);
    const relativa = path.relative(raiz, saida);
    if (!relativa || (!relativa.startsWith('..' + path.sep) && !path.isAbsolute(relativa)))
        throw new Error('A distribuição deve ficar fora da aplicação e dos worktrees.');
    try { await fs.access(saida); throw new Error('O destino já existe; nenhum arquivo será sobrescrito.'); }
    catch (erro) { if (erro.code !== 'ENOENT') throw erro; }
    await fs.mkdir(saida, {recursive: true});
    const permitidos = ['index.html', 'login.html', 'cadastro.html', 'autoescola.html',
        'css', 'js', 'aluno', 'instrutor', 'nivel-1-operador', 'nivel-2-gerencia', 'nivel-3-master', 'shared', 'assets'];
    for (const nome of permitidos) await fs.cp(path.join(raiz, nome), path.join(saida, nome), {recursive: true, errorOnExist: true, force: false});
    const arquivo = path.join(saida, 'shared/js/configuracao.js');
    const texto = await fs.readFile(arquivo, 'utf8');
    await fs.writeFile(arquivo, texto.replace('DESENVOLVIMENTO_LOCAL_HABILITADO = true', 'DESENVOLVIMENTO_LOCAL_HABILITADO = false'));
    // Remove também os caminhos mortos de laboratório dos entrypoints da cópia
    // entregue. Os módulos operacionais originais continuam no workspace.
    const login=path.join(saida,'js/login.js');
    await fs.writeFile(login,(await fs.readFile(login,'utf8')).replace("const servicoDemo = desenvolvimentoAtivo() ? (await import('../dev/login.js')).montarLoginDemo(form) : null;",'const servicoDemo = null;'));
    await fs.writeFile(path.join(saida,'aluno/js/entrada.js'),"await import('./integrado.js');\n");
    await fs.writeFile(path.join(saida,'instrutor/js/entrada.js'),"import {exigirLogin} from '../../shared/js/sessao.js';\nconst root=document.getElementById('instrutor-root');\nif(exigirLogin(['Motorista']))root.textContent='Painel do Instrutor: integração da agenda, veículo e registro de frequência com a API pendente.';\n");
    await fs.writeFile(path.join(saida,'shared/js/entradaAdministrativa.js'),"document.getElementById('administracao-root').textContent='O acesso administrativo depende da integração autenticada com o servidor.';\n");
    await fs.writeFile(path.join(saida,'nivel-1-operador/js/operador-cfc.js'),"document.getElementById('acesso-orientacao').textContent='O acesso administrativo aguarda a integração de perfil, unidade e permissões com o servidor.';\n");
    const mensagens=path.join(saida,'aluno/js/mensagens.js'),fonte=await fs.readFile(mensagens,'utf8');
    await fs.writeFile(mensagens,fonte.slice(0,fonte.indexOf('if(desenvolvimentoAtivo())'))+'{'+fonte.slice(fonte.lastIndexOf('}else{')+6));
    // Componentes legados usados exclusivamente pelos adaptadores excluídos.
    for(const nome of ['agendamentoOperador.js','fichaAluno.js','visaoGeralOperador.js'])await fs.unlink(path.join(saida,'nivel-1-operador/js/components',nome));
    const servico=path.join(saida,'nivel-1-operador/js/servicoOperador.js');
    await fs.writeFile(servico,(await fs.readFile(servico,'utf8')).replaceAll("import('../../dev/aluno/documentosMedicos.js')","import('../../shared/js/armazenamentoMedicoPendente.js')"));
    await fs.writeFile(path.join(saida,'shared/js/armazenamentoMedicoPendente.js'),"// Sem fallback de armazenamento local na entrega.\nconst pendente=async()=>{throw new Error('Armazenamento de atestados depende da integração autenticada com a API.');};\nexport const guardarAtestado=pendente,lerAtestado=pendente,descartarUploadNaoSalvo=pendente;\n");
    try{await fs.copyFile(path.join(raiz,'ENTREGA-FRONTEND-SIPA.md'),path.join(saida,'ENTREGA-FRONTEND-SIPA.md'));}catch(e){if(e.code!=='ENOENT')throw e;}
    const arquivos=[];async function listar(dir){for(const item of await fs.readdir(dir,{withFileTypes:true})){const p=path.join(dir,item.name);if(item.isDirectory())await listar(p);else arquivos.push(path.relative(saida,p).replaceAll(path.sep,'/'));}}await listar(saida);
    await fs.writeFile(path.join(saida,'MANIFESTO-ENTREGA.json'),JSON.stringify({versao:1,geradoEm:new Date().toISOString(),laboratorio:false,excluidos:['dev/','tests/','.git/','.entrega-aluno/','.instrutor-local/'],arquivos},null,2));
    return saida;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try { console.log(await prepararIntegrado(process.argv[2])); }
    catch (erro) { console.error(erro.message); process.exitCode = 1; }
}
