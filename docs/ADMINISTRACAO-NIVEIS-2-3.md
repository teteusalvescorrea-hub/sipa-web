# Gerência e Acesso Master — implementação local

Esta documentação complementa `ACESSOS-LOCAIS-V2.md`. As opções Gerência e Acesso Master agora têm painéis próprios. Existem exatamente três níveis administrativos: Recepção, Gerência e Master. O login livre permanece desativado.

## Abrir no Live Server

Use a raiz atual `sipa-web`, na mesma origem e porta em todos os perfis. Abra `index.html` ou `login.html` com **Open with Live Server**. Não utilize os worktrees históricos `.entrega-aluno` ou `.instrutor-local` para testar esta implementação.

Rotas:

| Perfil | Página |
| --- | --- |
| Recepção | `/nivel-1-operador/html/operador-cfc.html` |
| Gerência | `/nivel-2-gerencia/html/gerencia.html` |
| Acesso Master | `/nivel-3-master/html/master.html` |
| Aluno | `/aluno/html/dashboard.html` |
| Instrutor | `/instrutor/html/instrutor.html` |

Selecionar outro perfil ou alterar a URL não concede privilégios. A conta autenticada determina o perfil, o vínculo e as capacidades disponíveis.

## Ajustes de unidades, contas e apresentação

- Recepção/Gerência exibem a unidade vinculada sem seletor. Parâmetros de URL e preferências antigas de múltiplas unidades não ampliam seu escopo. As verificações ocorrem nas consultas e nos comandos locais.
- O cabeçalho administrativo agrupa unidade e tema à direita. Os cinco perfis reutilizam `SipaTema` para o botão vetorial e a preferência persistida.
- No Master, “Criar acesso” permite Recepção ou Gerência. Exige nome, CPF, unidade, situação e credencial provisória individual de 12 a 128 caracteres, diferente do CPF. É armazenado somente o derivado criptográfico com salt; o primeiro acesso exige troca. A política local de nova senha existente continua separada dessa credencial administrativa provisória.
- Alterar perfil/unidade preserva ID e senha, registra antes/depois e invalida sessões. Redefinir credencial é uma ação explícita separada. A conta principal mantém CPF, vínculo original, credencial e autorização Master.
- O histórico médico usa data/hora de Brasília, responsável amigável, estados traduzidos e observação integral. IDs e instantes originais continuam armazenados. Aprovação/reprovação e correção exclusiva do Master preservam decisões anteriores e impedem devolução duplicada.

**Limite local e contrato para integração:** quem controla o código e o armazenamento do navegador pode adulterar a base local. Essas validações não representam segurança definitiva de produção. A API deve obter identidade e unidade da sessão autenticada, autorizar cada consulta/comando, revogar sessões após alterações, manter a trilha imutável e garantir atomicidade/idempotência na devolução. A criação administrativa comum deve excluir Master e exigir CPF único; o provisionamento Master deve ser um procedimento separado e protegido. Nenhum endpoint ou banco real foi alterado nesta etapa.

### Arquivos desta entrega

- Operações e autenticação local: `dev/autenticacao.js`, `dev/contasAdministrativas.js`, `dev/servicoAdministrativo.js`, `dev/operador/atendimentoLocal.js`.
- Regras compartilhadas: `shared/js/permissoesAdministrativas.js`, `shared/js/entradaAdministrativa.js`, `shared/js/relatoriosAdministrativos.js`, `shared/js/solicitacoesMedicas.js`, `shared/js/tema.js`.
- Interface: `shared/components/painelAdministrativo.js`, `shared/components/historicoMedico.js`, `shared/css/legibilidade.css`, `shared/css/administracao.css`, `nivel-1-operador/js/components/unidadeOperador.js`, `nivel-1-operador/js/components/verificacoesMedicas.js`, `aluno/js/tema-aluno.js`, `instrutor/js/painel.js`.
- Testes: `tests/escopo-administrativo.test.mjs`, `tests/administracao.test.mjs`, `tests/administracao.browser.steps.mjs`, `tests/conta-multipaineis.browser.steps.mjs`, `tests/ajustes-administrativos.browser.steps.mjs`, `tests/agenda-recepcao.browser.mjs`.
- Documentação: este arquivo.

Validação final: **40 testes de domínio/estrutura**, **64 verificações administrativas no navegador** e **29 verificações da conta principal/múltiplos painéis**, aprovados. Incluem consulta por unidade, negativas de permissão, aprovação/reprovação e crédito único, criação/edição/transferência/promoção de contas, invalidação de sessão, preservação da conta principal, PDF, histórico médico no celular e nos dois temas, e persistência do tema em Aluno/Instrutor/Gerência. Todos os dados de teste foram criados em origem e perfil descartáveis. A API/SQL Server e as credenciais pessoais não foram usados.

## Conta principal — atualização de 28/10/2026

A conta principal indicada pelo titular usa uma única senha existente para os três painéis. Basta abrir o login da raiz atual, na mesma origem do cadastro, e escolher Recepção, Gerência ou Acesso Master. Não é necessário inicializar duas contas adicionais.

Após validar a senha da conta ativa, uma migração nominal autorizada promove somente essa conta de Recepção/Gerência para Master, preservando ID, hash, salt e versão da senha. O vínculo permanece Centro de Vila Velha. A promoção é auditada uma vez e revoga sessões anteriores; não cria duplicatas nem modifica dados operacionais.

A sessão separa `perfilConta` real, `painel` selecionado e `perfil`/capacidades efetivas. Recepção e Gerência operam em uma única unidade, inclusive quando a conta real é Master. O Master conserva seu vínculo original; uma unidade escolhida no contexto Master pode ser usada ao autenticar novamente em um painel inferior. O perfil e a unidade operacional participam da verificação do token. Nas operações, a auditoria registra a identidade real e o perfil utilizado.

Contas comuns seguem a hierarquia: Aluno somente Aluno; Instrutor somente Instrutor; Recepção somente Recepção; Gerência pode escolher Recepção/Gerência; Master pode escolher os três painéis administrativos. Para trocar o painel é preciso autenticar novamente. O novo login mantém a revogação da sessão anterior da mesma conta.

Conta inativa ou senha incorreta não permitem a promoção. Não há senha padrão criada automaticamente. A falta do marcador antigo não apaga contas nem limpa IndexedDB. Se a autenticação estiver ausente nesta origem, um backup compatível pode recuperar suas credenciais preservadas; sem credencial recuperável, a aplicação informa o problema sem redefinir senha. Use o mesmo protocolo, host e porta: `localhost` e `127.0.0.1` possuem armazenamentos separados.

O painel da sessão participa da validação do hash do token. Alterar a URL ou adicionar um perfil ao token do cliente não eleva a sessão. A segurança definitiva continua dependendo da API: alguém que controla todo o código e armazenamento do navegador não está sujeito a uma fronteira de segurança de servidor.

## Inicialização opcional de outras bases locais compatíveis

O procedimento abaixo não é necessário para a conta principal promovida. Ele permanece disponível apenas para a conta inicial comum, em base ainda sem Master, com as proteções existentes.

1. Entre no login com a **conta inicial já existente da Recepção**.
2. Na mesma origem do Live Server, abra `/dev/inicializar-administracao.html`.
3. Confirme a senha atual da Recepção e informe nome, CPF e senha provisória individual para cada uma das duas contas: Gerência e Master.
4. Confirme a operação. Não são criados alunos, instrutores, veículos ou aulas.
5. Volte ao login, selecione o perfil correspondente e utilize suas credenciais escolhidas.
6. Defina uma nova senha no primeiro acesso. A senha deve diferir da provisória, ter de 4 a 128 caracteres e coincidir com a confirmação, conforme a política local atual.

O procedimento exige sessão válida da conta inicial e nova conferência da senha. Após a criação, o marcador persistente e a existência do Master impedem nova inicialização. Não há credencial universal para os novos perfis. Contas adicionais são administradas em Gestão de acessos/usuários. O último Master ativo não pode ser desativado ou rebaixado.

Se a inicialização já foi concluída, utilize as contas que criou. Não limpe o armazenamento para reiniciá-la. Os testes automatizados utilizam perfil descartável do Edge; suas credenciais de teste não são inseridas no navegador de uso pessoal.

## Funcionalidades locais

| Área | Funcionamento |
| --- | --- |
| Hierarquia | Capacidades cumulativas, teto por perfil e restrições específicas por conta, verificadas pelos comandos. |
| Escopo | Recepção e Gerência possuem exatamente uma unidade administrativa. Listas legadas não ampliam o acesso. Somente Master dispõe do seletor consolidado ou por unidade. Compartilhamentos operacionais A/B/D não concedem acesso cadastral às outras unidades. |
| Alunos | Cadastro e ficha existente de seis abas; Gerência/Master podem corrigir cadastro, situação e provas com justificativa, preservando o histórico. |
| Agendas | Mesma agenda e mesmos recursos; grade existente e consulta global filtrada; operações normais respeitam créditos, jornada, almoço, calendário e conflitos. |
| Instrutores e veículos | Reuso dos cadastros e vínculos existentes; filtros de unidade/situação, ativação/desativação e acompanhamento. A desativação exige resolver reservas futuras. |
| Acessos | Exclusivo do painel Master, tanto na interface quanto nos comandos. Criação administrativa comum oferece Recepção e Gerência, com uma unidade obrigatória e CPF único. Contas Master não podem ser criadas/promovidas por esse formulário. Edição, ativação, desativação, revogação e redefinição preservam a trilha; alterações invalidam sessões anteriores. |
| Atestados | Aluno cancela a aula e retém o crédito; Recepção confere o documento e encaminha; Gerência aprova/reprova; aprovação devolve uma única vez. |
| Correção médica | Exclusiva do Master após decisão final; gera nova decisão e preserva a anterior. Se o crédito a recuperar já foi utilizado, bloqueia para conciliação. |
| Antecipação | Consulta pares e horários reais, lê as preferências por dia salvas pelo aluno, verifica elegibilidade e prepara ofertas individuais/coletivas. Não reserva, não consome saldo e não envia mensagens externas. |
| Relatórios | Aulas, instrutores, veículos/ocupação, unidades, datas, alunos, cancelamentos/motivos, atestados, créditos, usuários, exceções e auditoria conforme permissão. Filtros, totais, comparação de períodos no Master e visualização de impressão para PDF. |
| Exceções | Somente Master, com confirmação, motivo e justificativa. Inclusão/ajuste válido reutiliza a validação normal; conflito físico gera pendência, sem segunda ocupação impossível. |
| Cancelamento Master | Escolha explícita do tratamento do crédito, histórico e aviso interno ao aluno. Não altera aulas concluídas nem fabrica crédito de reserva pendente expirada. |
| Unidades/configurações | Consulta das seis unidades e bloqueio operacional por data futura, após resolver reservas conflitantes. Não modifica retroativamente aulas concluídas. |
| Auditoria | Registro persistente com identidade, perfil, unidade, operação, referência, antes/depois e justificativa. Consulta por filtros; sem ação de exclusão. Segredos e arquivos privados são omitidos. |

As seis abas da ficha continuam: Cadastro; Exames e agendamento de prova; Aulas; Provas marcadas; Histórico; Acesso. Não foi criado o estado Adiada nem o controle das duas aulas obrigatórias.

### Critério da ocupação

O denominador é a quantidade de horários únicos de veículo elegíveis no período, segundo a configuração atual: jornada, almoço, calendário, bloqueios, recursos ativos e vínculos. O numerador considera horários ocupados elegíveis, sem contar duas vezes o mesmo veículo/data/horário. Uma ausência de base elegível aparece como tal, nunca como estatística inventada. O filtro de situação pode restringir o numerador.

Não há versões históricas completas das configurações antigas. Portanto, a ocupação de períodos passados não pode reconstruir uma jornada antiga que nunca foi armazenada. Essa limitação aparece no relatório e deverá ser tratada na API com versionamento/vigência.

### Persistência e concorrência

- Os cinco perfis compartilham `sipa.operador.demo.v2`; não são criadas bases operacionais paralelas.
- Credenciais administrativas/instrutores permanecem em `sipa.acessos.v2`; contas de alunos continuam vinculadas ao cadastro operacional pelo ID.
- Senhas usam PBKDF2-SHA256 com salt; não são armazenadas em texto puro nem exibidas nas listagens.
- As operações relêem os dados sob Web Locks antes da gravação.
- Operações que afetam autenticação e cadastro usam diário temporário `sipa.administracao.transacao.v1`, com os snapshots anteriores. Falha restaura ambos; interrupção bloqueia novas escritas até a recuperação ao abrir o login, sem repetir a migração anterior.
- Anexos médicos continuam no armazenamento privado existente em IndexedDB. A decisão verifica a referência e a integridade do documento original.
- Alterações entre abas são relidas por eventos de armazenamento/foco; os painéis administrativos também verificam mudanças periodicamente. Não existe push de servidor.

Armazenamento e código controlados pelo próprio navegador **não são segurança de produção**, nem auditoria inviolável. O diário reduz falhas entre as duas chaves locais; não substitui transação de banco.

## Arquivos desta entrega

Novos:

- `nivel-2-gerencia/html/gerencia.html` e `nivel-3-master/html/master.html`.
- `shared/js/entradaAdministrativa.js`, `permissoesAdministrativas.js`, `administracao.js`, `auditoria.js`, `relatoriosAdministrativos.js`, `antecipacaoAdministrativa.js`.
- `shared/components/painelAdministrativo.js`, `formularioAdministrativo.js` e `shared/css/administracao.css`.
- `dev/servicoAdministrativo.js`, `contasAdministrativas.js`, `inicializar-administracao.html` e `inicializar-administracao.js`.
- `tests/administracao.test.mjs`, `tests/administracao.browser.steps.mjs` e esta documentação.

Adaptados para integrar os novos perfis e preservar o reuso:

- `dev/autenticacao.js`, `dev/login.js`, `dev/preparar-integrado.mjs`.
- `dev/operador/atendimentoLocal.js`, `dev/aluno/contaRecepcao.js`, `dev/aluno/acessoRecepcao.js`, `dev/instrutor/agendamentosLocais.js`.
- `nivel-1-operador/js/dominioOperador.js`, `fichaOperador.js` e componentes `painelOperador.js`, `unidadeOperador.js`, `fichaInstrutor.js`, `fichaEvolucao.js`.
- `shared/js/solicitacoesMedicas.js`, `shared/css/sidebar.css`, `aluno/js/components/solicitacaoMedica.js`.
- `tests/agenda-recepcao.browser.mjs`, `tests/integrado.browser.mjs`, `tests/conta-recepcao.test.mjs`, `tests/solicitacoes-medicas.test.mjs`.

Os diretórios reorganizados já estavam majoritariamente não rastreados no Git. O `git diff` da raiz também inclui movimentos de tarefas anteriores; não deve ser interpretado como lista exclusiva desta entrega.

## Contratos necessários na API — ainda sem implementação no backend

Não se prescreve uma URL inexistente. Os adaptadores locais delimitam estes contratos:

1. **Identidade/sessão:** ID autenticado, perfil com nível 1/2/3, unidade, unidades autorizadas, capacidades, expiração e troca obrigatória. O servidor deve validar cada comando, sem confiar no seletor, ID ou capacidade enviados pelo cliente.
2. **Contas:** criar/editar/desativar/redefinir com teto de perfil, vínculo a pessoa/recurso, escopo e proteção do último Master; senhas e hashes jamais retornam na consulta. Revogação efetiva de sessões pelo servidor.
3. **Operação compartilhada:** IDs estáveis, versão otimista e transação para reserva, saldo e conflitos globais de instrutor/veículo; preservação da autoria histórica e das regras de 50 minutos/deslocamento/almoço.
4. **Atestado:** upload privado com autorização e integridade; máquina de estados; decisão com chave de idempotência; lançamento de crédito e cancelamento na mesma transação; reversões auditadas, sem apagar a decisão original.
5. **Exceção:** comando identificado, bloqueio original, motivo, justificativa, confirmação, recursos/alunos envolvidos e resultado executado/pendente; nunca permitir ocupação fisicamente impossível.
6. **Relatórios:** filtros e paginação sob escopo, estatísticas agregadas no servidor, definições de ocupação e configurações com vigência; exportação protegida.
7. **Auditoria:** persistência append-only no servidor, identidade derivada do token, timestamps confiáveis, antes/depois sanitizados e acesso restrito.
8. **Ofertas/avisos:** preparação separada de envio; integração futura com serviço de notificações e comprovante real de entrega. Nenhum SMS, WhatsApp ou e-mail é enviado pela implementação atual.

ICFC, DETRAN, autenticação administrativa integrada, armazenamento privado remoto e notificações externas permanecem dependentes de integrações autorizadas. O frontend não as representa como executadas.

## Isolamento e preparação para produção

O modo local exige configuração explícita `DESENVOLVIMENTO_LOCAL_HABILITADO = true` e host loopback. Query string não o habilita em produção. `dev/preparar-integrado.mjs` copia os perfis para uma distribuição nova, exclui `dev`, testes e worktrees e fixa a configuração em `false`.

Os painéis administrativos integrados permanecem fechados até haver contrato autenticado da API. Não existe fallback para contas locais após recusa da API. A inicialização local única não é distribuída.

Antes da entrega integrada: desativar os mecanismos locais, CPF fictício e provisões de desenvolvimento; não transportar dados de teste; implementar os contratos acima. Não realizar essa limpeza sobre os dados de desenvolvimento do usuário.

## Validação

Os testes de navegador usam Edge headless, origem temporária, relógio controlado e perfil descartável. Dados de cenário só são criados pelo próprio teste nesse perfil. O navegador de uso pessoal, LocalStorage e IndexedDB existentes não são limpos.

Comandos:

```powershell
$tests = @(Get-ChildItem tests -Filter '*.test.mjs' -File | ForEach-Object { $_.FullName })
node --test @tests
$env:SIPA_TEST_CENARIO = 'administracao'
node tests/agenda-recepcao.browser.mjs
node tests/integrado.browser.mjs
```

Resultados da entrega inicial dos painéis (anteriores à atualização de conta única):

| Verificação | Resultado |
| --- | --- |
| Suíte de lógica da raiz | 219 aprovados; zero falhas, ignorados ou cancelados. |
| Cenário administrativo em navegador | 45 verificações aprovadas; código de saída zero e nenhum erro JavaScript capturado. |
| Distribuição integrada em navegador | 9 verificações aprovadas, incluindo as novas rotas administrativas, sem carregar adaptadores locais. |
| Apresentação | Capturas inspecionadas em desktop e celular, temas claro e escuro; sem rolagem horizontal da página. Tabelas têm rolagem própria quando necessário. |
| PDF | Documento efetivamente renderizado pelo navegador, com tabela e totais. |
| Armazenamento | Rollback, recuperação de interrupção e falha de quota injetados no perfil descartável; nenhuma confirmação falsa de gravação. |

O cenário cobre login dos cinco perfis, fluxo médico completo, devolução única, presença/falta, inicialização única, criação/redefinição/desativação/reativação de contas, perfil incorreto, restrições por capacidade e unidade, ofertas individuais/coletivas, conflitos, pendências, avisos, histórico, recarga e logout. A lógica também verifica reprovação sem devolução e correção médica exclusiva do Master.

As falhas intermediárias de espera de montagem/navegação foram corrigidas nos testes. A investigação da antecipação também encontrou consultas concorrentes que podiam misturar datas; a interface agora aguarda a consulta inicial e descarta consultas anteriores. A Gerência restrita mantém a operação compartilhada A/D sem ganhar edição dos recursos centrais ou acesso cadastral de alunos de outras unidades.

Nenhum teste final necessário permaneceu bloqueado pela revisão de comandos. Os cenários históricos baseados em login livre não foram reativados nem apresentados como aprovados. `git diff --check` na raiz apontou espaços/finais de linha em alterações anteriores de login, cadastro e autoescola, fora desta retomada; esses arquivos não foram normalizados desnecessariamente.

Os painéis, comandos e fluxos acima estão implementados e testados **no ambiente local**. A autenticação administrativa integrada, auditoria inviolável, transações remotas, envio externo de ofertas e integrações ICFC/DETRAN **não foram implementados no backend**. Seus contratos estão documentados; o acesso administrativo integrado permanece fechado.

### Validação da conta única

O cenário `SIPA_TEST_CENARIO=multipaineis` em `tests/agenda-recepcao.browser.mjs` utiliza `tests/conta-multipaineis.browser.steps.mjs`: conta existente com senha de teste não padrão, promoção única, três painéis, isolamento das capacidades, recarga, logout, senha errada, conta inativa, tokens alterados, URL superior, Gerência comum, preservação dos dados e do IndexedDB. Ele não utiliza a senha pessoal do titular nem seu perfil de navegador.

`tests/perfis-administrativos.test.mjs` cobre a matriz dos cinco perfis e rejeição de perfis desconhecidos. O cenário administrativo anterior usa agora uma conta inicial fictícia de outro CPF para testar a inicialização legada sem acionar a exceção nominal autorizada ao titular.

Resultados desta atualização: **221 testes de lógica**, **27 verificações de conta única**, **45 de regressão administrativa** e **9 de isolamento integrado**, todos aprovados. As falhas intermediárias de espera por redirecionamento e de carregamento de módulo do servidor temporário foram corrigidas/verificadas antes do resultado final. A conta e a senha pessoais do navegador do titular não foram inspecionadas; a promoção se aplica quando a credencial existente é validada no próximo login local.

Arquivos da atualização de conta única: `dev/autenticacao.js`, `dev/contasAdministrativas.js`, `dev/servicoAdministrativo.js`, `shared/js/auditoria.js`, `tests/agenda-recepcao.browser.mjs`, `tests/administracao.browser.steps.mjs`, os dois novos testes descritos acima e esta documentação. A aparência do login, API, banco e worktrees históricos não foram alterados.
