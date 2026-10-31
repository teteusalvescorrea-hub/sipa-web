# Entrega do frontend SIPA para integração

Preparação de 29/10/2026. HTML, CSS e JavaScript nativos, módulos ES e componentes
DOM; não exige bundler. A identidade visual, temas e regras foram preservados.
Não foram alterados .NET, SQL Server, Git remoto ou worktrees históricos.

## Estado da entrega — ler primeiro

- Laboratório e CPF fictício desligados por padrão, inclusive em localhost.
  `demo=1`, `ambiente=local` e dados antigos no navegador não os reativam.
- Não há provisionamento automático de Master nem promoção por CPF nominal.
  A antiga fixture nominal foi deslocada para `tests/fixtures/masterTeste.js`.
- Seleção dos cinco perfis permanece no login. Selecionar um perfil NÃO autentica
  nem concede suas permissões. Não existe senha universal ou conta inicial.
- A API atual autentica Aluno/Motorista/Autoescola. Não existe contrato equivalente
  a ADM 1/2/3. Autoescola NÃO é convertida em administrador. Uma seleção
  administrativa permanece bloqueada com informação de integração pendente.
- Os componentes e operações locais continuam preservados no workspace e no
  backup como referência e para testes. A distribuição exclui `dev/`, testes e
  worktrees. Os entrypoints entregues não importam adaptadores de demonstração.
- A entrega não representa integração concluída: agendas e comandos administrativos,
  agenda/frequência do Instrutor e mensagens aguardam serviços autenticados. Não
  foram inventados endpoints, respostas ou usuários para liberar esses fluxos.

## Estrutura e perfis

| Caminho | Responsabilidade |
|---|---|
| `index.html`, `login.html`, `css/`, `js/` | Páginas públicas oficiais e login |
| `aluno/html`, `aluno/js`, `aluno/css` | Aluno: dashboard, manual/automático, minhas aulas, realizadas, progresso, mensagens, atestados, antecipação, perfil e pacotes |
| `instrutor/` | Agenda, detalhes, presença, falta, histórico e perfil |
| `nivel-1-operador/` | Recepção: cadastro e consulta, agendas, recursos, provas, exames, acompanhamento e redefinição autorizada |
| `nivel-2-gerencia/` | Gerência: escopo da unidade-base, análise médica, relatórios e operações autorizadas |
| `nivel-3-master/` | Master: escopo global, unidades, acessos e exclusões exclusivas |
| `shared/` | Temas, escala visual, calendário, disponibilidade, categorias, localização, permissões, auditoria, serviços HTTP e componentes |
| `assets/`, `shared/vendor/` | Recursos visuais e biblioteca de exportação PDF |
| `dev/` | Adaptadores locais preservados, ferramentas manuais; NÃO distribuir |
| `tests/` | Testes e fixtures isoladas; NÃO distribuir no servidor público |
| `.entrega-aluno/`, `.instrutor-local/` | Worktrees históricos intocados; NÃO distribuir |

As interfaces e os serviços de domínio estão preservados. Onde ainda há
persistência local, o Bigas deverá conectar o adaptador ao backend, mantendo os
contratos de apresentação. Não utilizar armazenamento local como autoridade de
identidade, unidade, créditos, presença ou autorização.

## Regras a preservar na integração

- A/B/AB/D; créditos separados por categoria. Créditos adquiridos no cadastro
  ficam disponíveis sem segunda liberação financeira; reserva consome uma vez,
  realização transforma reservada em realizada sem novo desconto.
- Cancelamento e retenção/devolução seguem a política existente de 48 horas
  úteis. Decisões médicas, comprovação e auditoria não podem ser duplicadas.
- Aulas de 50 minutos, início na hora cheia, última às 18h quando o expediente
  permitir. Respeitar almoço individual, feriados, domingos e bloqueios.
- A/B com sábado reduzido; D com sábado integral, um instrutor/ônibus e agenda
  compartilhada, sem conflitos entre unidades. D: KM Cobilândia durante a semana
  e Arena Tartarugão aos sábados, com o ponto oficial do Maps em `categorias.js`.
- Preservar câmbio manual/automático, deslocamentos de carro e locais da moto.
- Recepção/Gerência operam na unidade-base autorizada. A unidade de aula não
  concede autorização cadastral ou médica. Compartilhamentos A/D são operacionais.
- Exclusão somente Master, proibição de autoexclusão, análise de dependências,
  revogação e auditoria; conservar histórico e vínculos necessários.
- Registro de presença/falta valida instrutor, aula, status e instante; exige
  confirmação e idempotência. Realizadas usam status 5, faltas status 6.
- Tentativas de provas são preservadas; não sobrescrever tentativas anteriores.
- Mensagens somente do aluno autenticado, leitura individual persistida ao abrir
  o conteúdo, contador real; não divulgar conteúdo nas outras páginas.
- O CPF real deve receber validação matemática oficial e unicidade no servidor;
  a verificação matemática não comprova identidade ou cadastro na Receita.

## Autenticação e API .NET

O cliente existente usa `POST /api/usuarios/login` e token Bearer. A configuração
está em `shared/js/config-api.js`: localhost aponta atualmente para
`http://localhost:5080/api`; homologação/produção não têm URL configurada.
A substituição `sipa.API_URL` existente destina-se à configuração local, não
armazena senha nem concede perfis. Não inserir credenciais ou JWT no código.

Para integração administrativa, definir no backend:

1. Identidade, perfil, capacidades e unidade-base/escopo por claims/contrato oficial.
   O seletor do login somente expressa o painel pretendido.
2. Autorização de cada comando no servidor, inclusive chamadas HTTP diretas.
   Nunca confiar em unidade, CPF de autor, perfil ou permissões fornecidos pelo JS.
3. Serviços transacionais de cadastros, créditos, reserva/conflito, frequência,
   provas/exames, transferências, mensagens/leitura, atestados/decisões e auditoria.
4. Idempotência, concorrência, revogação de sessões e códigos de erro claros.
5. Recuperação de senha segura. A regra local de seis primeiros dígitos do CPF
   e as senhas simples dos testes NÃO são política de produção.
6. Integrar as portas de dados já existentes; não mapear Autoescola para Master.

O token é guardado em `sessionStorage` pelo cliente existente. A leitura das
claims na interface não valida assinatura nem substitui o servidor. A API deve
validar assinatura, expiração, revogação e autorização em todas as operações.

## Persistência esperada no SQL Server e arquivos privados

Definir entidades e relacionamentos para usuários/perfis/escopos, alunos,
instrutores, veículos, vínculos/jornadas/bloqueios, aquisições e movimentos de
crédito, agendamentos, frequência, cancelamentos, provas/tentativas, exames,
transferências, ofertas, mensagens e leituras, decisões médicas e auditoria.
Anexos médicos exigem armazenamento privado autenticado e metadados/hash;
não presumir que o binário precisa ser uma coluna SQL. Não há migração de banco
executada pelo frontend nesta preparação.

## Dados locais: classificação e limpeza

Dados do navegador são separados por origem completa. `localhost` e `127.0.0.1`,
portas diferentes e perfis de navegador não compartilham armazenamento.

| Armazenamento | Tratamento |
|---|---|
| `sipa.acessos.v2` | Misto: contas/sessões/auditoria. Não apagar a chave inteira |
| `sipa.operador.demo.v2` | Misto: alunos, recursos, aulas, créditos, provas, mensagens e auditoria. Nome “demo” não prova finalidade de cada registro |
| `sipa.dev.local.v1` (IndexedDB) | Legado misto; preservado sem classificação individual |
| Bancos de documentos médicos e outros IndexedDB SIPA | Preservados, inclusive anexos; não inferir que são descartáveis |
| `sipa.instrutor.dev.dados.v1` | Removível somente se todo o cenário corresponder aos marcadores conhecidos |
| `sipa.ui.tema`, preferências visuais, `sipa.API_URL` | Preservados |
| Backups/marcadores de migração/transações | Preservados; transação pendente bloqueia a ferramenta |
| Sessões e chaves restantes | Não remover sem comprovação; sessões locais já não concedem acesso na aplicação normal |

Não se classificam registros pelo nome “Teste”, placa, CPF inválido ou por estarem
em localhost. Cadastros manuais e dados de origem desconhecida permanecem intactos.
Não foi acessado nem limpo o armazenamento do navegador pessoal nesta execução.

### Procedimento manual, reversível, no navegador correto

1. Conservar o backup de código abaixo e fechar outras abas do SIPA.
2. Na mesma origem dos testes, abrir
   `http://127.0.0.1:5500/dev/limpeza-entrega.html` pelo Live Server do workspace.
   Essa ferramenta NÃO faz parte do pacote entregue.
3. Usar **Analisar sem alterar**. Revisar todos os identificadores propostos e
   os registros preservados por origem desconhecida ou dependências.
4. Baixar o backup JSON e conferir se foi salvo. Ele contém os valores anteriores
   das chaves, o plano e a origem; contém informações sensíveis locais.
5. Digitar a origem exata e marcar as duas confirmações antes de executar.
6. A limpeza limita-se a marcadores de geradores comprovados sem dependências,
   à conta nominal com marcador `master-teste-local-v1` e ao cenário exclusivo
   do instrutor. Sessões da conta nominal e seu evento de configuração de teste
   são removidos; outros históricos permanecem preservados.
7. **Restaurar** aceita o backup na mesma origem e somente quando as chaves
   alteradas ainda correspondem ao estado pós-limpeza. Recusa sobrescrever dados
   modificados posteriormente. Não restaura nem apaga chaves visuais ou IndexedDB.

Nenhuma limpeza é executada ao abrir login/index. Não há `localStorage.clear()`
ou exclusão em massa. Dependências não classificadas exigem revisão individual
e eventual autorização específica; a ferramenta não as força.

## Backup anterior às modificações

Arquivo recuperável:
`SIPA-frontend-antes-entrega-ddf35d56d65041f5873d037551e56a9a.zip` (backup privado fora do repositório)

SHA-256: `1D5ECC829CB0DFB4B4EBA2835868378B0ED1531C6942F00F0C95B10B1ED78BAF`.
Inclui arquivos atuais, documentação e testes antes desta preparação. Exclui
`.git` e worktrees históricos, que não foram modificados. Não contém os dados
do navegador pessoal: o backup desses dados é o JSON manual descrito acima.
Para recuperar código, extrair em uma pasta nova e comparar/copiar somente os
arquivos necessários, sem sobrescrever trabalho posterior indiscriminadamente.

## Executar e preparar o pacote

No workspace atual, usar Live Server em `index.html` ou `login.html`. O modo
normal já é integrado, mesmo em localhost. Uma API indisponível gera erro real,
não login simulado. Não habilitar flags para entregar.

Para criar uma distribuição nova, fora do workspace:

```powershell
node dev/preparar-integrado.mjs "$env:TEMP\SIPA-ENTREGA-nova"
```

O destino deve ser novo. O comando recusa sobrescrever destinos existentes ou
gerar dentro do projeto. Não publica nem usa Git. Copia as interfaces oficiais,
gera `MANIFESTO-ENTREGA.json`, desliga/exclui laboratório, remove componentes
legados usados exclusivamente por demonstrações e adapta entrypoints para não
importarem `dev/`. Serviços indisponíveis não recebem mocks substitutos.

Abrir `index.html` dessa pasta por um servidor HTTP estático/Live Server. Não
usar `file://`. Configurar a URL HTTPS e o CORS da API para o ambiente de destino.
Enviar o pacote gerado ao integrador e preservar o workspace como fonte completa.

## Desenvolvimento e testes isolados

Node.js 24 e Edge instalado para testes de navegador. Não instalar fixtures na
aplicação normal. O executor unitário habilita laboratório somente na memória
do processo; o servidor de testes fornece a configuração equivalente apenas
em seu perfil Edge temporário. Não são preferências ou parâmetros de URL.

```powershell
node tests/executar.mjs
node tests/integrado.browser.mjs
$env:SIPA_TEST_CENARIO='divisorias-agendas'
node tests/agenda-recepcao.browser.mjs
$env:SIPA_TEST_CENARIO='master-historico'
node tests/agenda-recepcao.browser.mjs
```

As fixtures e senhas de teste pertencem somente aos testes isolados. O cenário
de múltiplos painéis foi atualizado para semear uma conta Master explicitamente
no teste, sem promover uma conta da aplicação.
`node --test` sem o executor executa com laboratório desligado e não é o comando
da suíte local. Não modificar a configuração normal para fazê-la passar.

Validação final da Etapa 2: 271 testes automatizados e 555 verificações de navegador aprovados, sem falhas nas execuções finais. Relatório e limites em `docs/RELATORIO-VALIDACAO-ETAPA-2.md`. Os testes usam perfis temporários, sem acessar dados pessoais do navegador.

Principais arquivos alterados na Etapa 1 (histórico da preparação): configurações de ambiente, `js/login.js`,
`dev/login.js`, `dev/autenticacao.js`, `dev/contasAdministrativas.js`, gerador
`dev/preparar-integrado.mjs`, nova ferramenta `dev/limpeza-entrega.*`, executor
isolado e fixtures/testes. `dev/masterTeste.js` foi movido para
`tests/fixtures/masterTeste.js`. Layouts, CSS e regras de agenda/créditos não
foram reescritos nesta etapa. README e documentação antiga apontam para esta
política de entrega.

Lista da preparação inicial (a lista completa da entrega Git está em `docs/ARQUIVOS-ENTREGA-BIGAS.tsv`):

```text
ENTREGA-FRONTEND-SIPA.md
README.md
shared/js/configuracao.js
js/login.js
dev/login.js
dev/autenticacao.js
dev/contasAdministrativas.js
dev/aluno/authLocal.js
dev/operador/politicaCpf.js
dev/preparar-integrado.mjs
dev/limpeza-entrega.html
dev/limpeza-entrega.js
dev/masterTeste.js -> tests/fixtures/masterTeste.js
docs/MASTER-TESTE-LOCAL.md
docs/ACESSOS-LOCAIS-V2.md
tests/ambiente-isolado.mjs
tests/executar.mjs
tests/limpeza-entrega.test.mjs
tests/entrega-segura.test.mjs
tests/estrutura.test.mjs
tests/agenda-recepcao.browser.mjs
tests/login.browser.mjs
tests/integrado.browser.mjs
tests/master-teste-local.test.mjs
tests/master-teste-local.browser.steps.mjs
tests/conta-multipaineis.browser.steps.mjs
```

## Pendências e limites conhecidos

- Conectar os cinco perfis ao contrato real; os três administrativos permanecem
  bloqueados até isso existir. Não declarar esses painéis integrados/operacionais
  com dados reais somente porque seus componentes foram preservados.
- Integrar agenda/frequência do Instrutor, mensagens, anexos e comandos sem
  endpoints equivalentes. Os fluxos locais ficam como referência, não fallback.
- Definir autorização Master de exclusão no backend; o DELETE Motorista atual
  não equivale à operação administrativa. Ver `docs/EXCLUSOES-MASTER.md` no fonte.
- Revisar manualmente cadastros e dados do navegador que não possuem proveniência
  comprovada. Nenhum usuário de origem desconhecida foi excluído nesta execução.
- Definir a migração autorizada de dados locais legítimos; não importar snapshots
  de laboratório ou backups para o SQL Server automaticamente.
- Configurar URL/CORS, política de senhas, cookies/tokens, retenção de auditoria
  e arquivos privados no ambiente de destino.


## Contratos existentes no cliente e lacunas

As rotas abaixo são as chamadas preservadas em `shared/js/services/`, com prefixo
`/api`. Esta etapa não consultou Swagger nem executou a API: a existência de um
cliente não comprova o contrato .NET atual ou sua autorização. Conferir DTOs,
enumerações e respostas com o Bigas antes de ligar cada tela.

| Área | Chamadas já expressas no cliente | Integração restante |
|---|---|---|
| Autenticação | POST `usuarios/login`, corpo `documento, senha`, resposta `token` e `perfil.descricao` | Contrato ADM 1/2/3, unidade-base, capacidades, revogação e recuperação segura |
| Aluno | POST `alunos`; GET/PUT `alunos/me` | Cadastro administrativo por escopo e sincronização da ficha completa |
| Instrutor | POST `motoristas`; GET/PUT `motoristas/me` | Vincular ao painel, jornada, disponibilidade, frequência e permissões reais |
| Agenda | GET `agendamentos`, `agendamentos/{id}`, `agendamentos/horarios-disponiveis`, `agendamentos/motoristas-disponiveis`; POST `agendamentos` com `contratacaoId, aulas` | Conectar o calendário atual, recursos, transações e conflitos compartilhados |
| Comandos da aula | POST `agendamentos/{id}/aceitar`, `recusar`, `desistir`, `cancelar`, `marcar-realizada`, `marcar-falta`, `trocar-motorista`, `trocar-veiculo`, `trocar-local` | Validar papel, vínculo, estado, crédito, prazo e idempotência no servidor |
| Recursos | `veiculos`, `unidades`, `grades-horarios`, `unidades/{id}/locais-aula` e seus comandos existentes | Escopo administrativo, jornadas, intervalos, deslocamentos e dependências |
| Comercial | `pacotes`, `pacotes/vitrine`, `contratacoes`, aprovar/recusar/encerrar | Contrato de créditos por categoria sem segunda liberação do cadastro |
| Catálogos/vínculos | `dominios`, `cidades`, `autoescolas`, `vinculos` | Confirmar catálogo oficial e separar vínculo comercial de autorização ADM |
| Sem equivalente integrado na interface atual | Atestados/anexos/decisões, provas/tentativas, mensagens/leitura, antecipação, auditoria, redefinição administrativa, exclusão por dependências e relatórios consolidados | Definir contratos autenticados; nenhum endpoint novo foi presumido |

O adaptador `aluno/js/services/alunoIntegrado.js` já lê aluno, contratações,
agendamentos e detalhes. Ele desabilita reservas, cancelamento, troca de senha,
antecipação e automático até haver integração equivalente; não concede saldos
padrão. Contratações AB ambíguas não são divididas artificialmente. O contrato
Categoria D e os valores das enumerações precisam ser confirmados explicitamente.

### Autorização e persistência mínimas

| Entidade/fluxo | Informação que o servidor deve preservar e validar |
|---|---|
| Conta e sessão | ID estável, CPF único normalizado, hash seguro, perfil/capacidades, situação, versão/revogação, troca obrigatória e unidade-base |
| Aluno | Identidade, dados cadastrais, categoria(s), unidade-base e unidade de carro separadas, observações autorizadas |
| Recursos | Instrutor/categorias, veículo/categoria/câmbio, unidade/vínculos, jornada, almoço, bloqueios e histórico de alterações |
| Crédito | Aquisição por categoria, saldo disponível, reservas, realização, retenção/devolução, origem e ID idempotente do movimento |
| Aula | Aluno, instrutor, veículo, categoria, início/fim de 50 minutos, unidade/local, status e histórico; conflitos protegidos em transação |
| Exames e provas | Tipo, situação, tentativa, data e resultado; preservar tentativas anteriores e autorizar novas movimentações |
| Atestado | Aula/aluno/base, prazo, metadados/anexo privado, encaminhamento, decisões, motivo e comprovante de devolução |
| Comunicação | Destinatário, conteúdo, momento e leitura por usuário; nunca confiar em ID de outro aluno vindo do cliente |
| Auditoria | Responsável autenticado, perfil efetivo, base, alvo, operação, justificativa e instante; sem senha/token no evento |
| Exclusão | Somente Master, sem autoexclusão; revogar acessos e preservar vínculos/histórico por exclusão lógica quando necessário |

Aluno consulta somente os próprios registros. Instrutor consulta e registra
frequência somente das aulas autorizadas. Recepção e Gerência têm uma unidade-base;
aulas em outra unidade ou compartilhamento de ônibus/moto não abrem dados cadastrais
ou documentos médicos alheios. Master possui escopo global; filtro de consulta não
muda a unidade vinculada da conta. Revalidar também downloads e relatórios.

Nos atestados, a Recepção consulta e encaminha registros da base; a Gerência da base
aprova/rejeita; o Master possui as correções autorizadas. Aprovação e devolução
devem compartilhar identificador transacional e preservar decisão anterior.
O aluno acompanha somente sua solicitação. Arquivos não podem ficar em URL pública.

Datas civis devem manter o dia informado; timestamps devem incluir fuso e exibição
em Brasília. O servidor resolve expediente, almoço individual e feriados.
A política de 48 horas úteis e as regras de retenção/devolução estão no domínio
compartilhado; replicá-las no serviço transacional, não confiar no botão habilitado.

### Ordem recomendada de integração

1. Confirmar DTOs existentes, identidade e autorização por perfil/base.
2. Ligar leituras reais sem substituir ausências por dados de teste.
3. Implementar comandos transacionais e concorrência de agenda/crédito.
4. Integrar frequência, exames/provas, atestados e comunicação/auditoria.
5. Testar com API e SQL Server em homologação; revisar segurança, migração e dados.
6. Gerar nova distribuição e homologar antes de produção. O aceite do fonte não
   substitui nenhuma dessas etapas.
