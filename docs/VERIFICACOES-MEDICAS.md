# Cancelamento médico e Verificações — fluxo local

## Funcionamento atual

O fluxo está disponível para contas locais de alunos cadastrados pela recepção. No cancelamento fora das 48 horas úteis, o aluno pode abrir **Solicitar cancelamento por motivo médico**, anexar um JPG/JPEG/PNG/PDF, informar observações e confirmar expressamente o cancelamento imediato com retenção do crédito.

O limite padrão é 5 MiB, centralizado em `shared/js/solicitacoesMedicas.js` (`LIMITE_ATESTADO`). Extensão, MIME, tamanho e assinatura binária são validados tanto na apresentação quanto no serviço local. Isso não comprova autenticidade do atestado e não substitui análise/antimalware no servidor.

O cancelamento normal dentro do prazo continua independente de documento e com a devolução prevista na política existente. O fluxo médico não modifica essa política, categorias, jornadas nem créditos de outras aulas.

O serviço autenticado lê a identidade da sessão e a aula do próprio aluno, usando o lock do repositório existente. Salva o arquivo primeiro no IndexedDB exclusivo de laboratório e só então persiste a aula cancelada com a solicitação; uma falha na gravação da reserva remove apenas aquele upload novo não referenciado. Não existe ação de exclusão de documentos nos painéis. A aula cancelada deixa de ocupar instrutor/veículo; o crédito continua retido no cálculo existente.

## Dados e privacidade

- Cada aula recebe uma única `solicitacaoMedica`, com ID próprio, ID do aluno, `aulaIds`, categoria, unidade responsável, data, observações, referência ao documento, estados e eventos. Neste fluxo, cada solicitação trata exatamente uma aula; um atestado não cancela nem justifica automaticamente outras aulas.
- `documento` contém apenas ID, MIME, tamanho e SHA-256. O arquivo original é preservado como File/Blob em `sipa.dev.atestados.v1`, store `documentos`. Os bytes e o nome original não são publicados em LocalStorage, URLs de servidor ou logs.
- Arquivos são servidos à interface por URLs Blob temporárias após consulta autorizada, revogadas ao fechar/trocar o modal. Imagens precisam ser decodificadas para permitir análise; PDFs podem ser abertos em nova aba com `noopener noreferrer`.
- A recepção consulta somente solicitações da sua unidade responsável e de alunos que pode consultar integralmente. O cadastro da unidade principal define a recepção responsável; o local físico da aula é mostrado separadamente. Ocupações de recursos não concedem acesso a documentos de terceiros.
- Este armazenamento no navegador é **exclusivo para documentos fictícios de teste**. Não é armazenamento seguro de atestados reais para produção, não sincroniza dispositivos e não constitui autenticação administrativa de servidor. O gate local explícito impede ativação em produção por parâmetros de URL.
- A entrada livre de demonstração sem conta vinculada à recepção e o ambiente integrado sem endpoint médico exibem a indisponibilidade do envio; não criam uma identidade nem simulam uma solicitação compartilhada.

## Verificações — ADM 1

Substitui a listagem antiga por três indicadores reais (aguardando análise, encaminhadas, concluídas), filtros combinados por nome/CPF, status, unidade/local e intervalo de envio em Brasília, e listagem paginada em 10 solicitações.

**Analisar** abre os dados autorizados do aluno e da aula, o documento original, observações e o parecer da recepção. **Encaminhar para gerência** exige parecer, documento disponível, escopo de unidade e permissão `verificar`. A operação é relida e validada dentro da alteração do repositório. Nenhum comando do ADM 1 permite aprovar/rejeitar, alterar crédito, excluir pedido/documento ou mudar decisão final. Uma solicitação encaminhada fica em consulta, sem reenviar ou sobrescrever o parecer.

Estados: `recepcao` (Aguardando análise da recepção), `gerencia` (Encaminhado para análise da gerência), `aprovado` (Aprovado pela gerência), `rejeitado` (Rejeitado pela gerência). Os dois estados finais estão previstos apenas para leitura; não há comando local de decisão/devolução. `devolucao` reserva estado, aulas aprovadas e identificador de operação para a futura integração, sempre sem executar devolução agora.

## Acompanhamento na recepção e no aluno

A coluna **Situação** substitui **Status**, imediatamente antes da ação. Texto e identificação visual são compartilhados entre os painéis: recepção em amarelo discreto, encaminhamento em azul, aprovação em verde e rejeição em vermelho, com contraste nos dois temas. Após encaminhar, a ação passa a **Visualizar**, com documento e parecer somente para consulta.

Em Minhas aulas, a quarta aba **Atestados médicos** lista os registros da própria conta, sem outra base de solicitações. Exibe aula/local/instrutor, envio, última atualização, nome original do documento, visualização autorizada, observação, etapas e crédito. O nome original é lido no IndexedDB por serviço autenticado; não é copiado para LocalStorage. O link **Acompanhar atestado**, em Aulas canceladas, abre a aba e destaca o registro correspondente. As três abas anteriores continuam disponíveis; a aba selecionada é preservada nas atualizações locais.

Etapas: envio confirmado pelo documento/data; recepção concluída mediante parecer ou evento de encaminhamento; gerência em análise até decisão final; resultado pendente até receber estado aprovado/rejeitado. A última atualização usa datas efetivamente registradas. Nenhuma etapa é gravada artificialmente pelo componente de apresentação.

### Contrato de leitura da devolução futura

Aprovação e devolução são fatos distintos. `recepcao` mostra **Não devolvido — aguardando decisão**; `gerencia`, **Não devolvido — aguardando decisão da gerência**; `aprovado` sem comprovante, **Devolução pendente**; `rejeitado`, **Não devolvido — solicitação rejeitada**.

Para apresentar **Devolvido**, o backend deverá retornar, na solicitação aprovada, `devolucao.estado: 'confirmada'`, `operacaoId`, `responsavel`, `em` válido e `aulas: [{aulaId, alunoId, categoria, quantidade}]`. Cada item deve corresponder a uma aula única da solicitação, ao mesmo aluno e categoria, com quantidade inteira positiva, sem superar os créditos envolvidos. A interface informa a quantidade comprovada; dados incompletos, IDs alheios e duplicações não são tratados como devolução. Uma simples flag de aprovação ou `cancelamento.credito` não substitui esse registro da operação. O formato deverá ser confirmado com o contrato real da API; este código apenas lê o comprovante e nunca executa devolução.

Na mesma origem do navegador, o mecanismo existente de `storage`, foco e reconsulta atualiza os dois painéis. Não existe sincronização entre dispositivos sem a API. Os testes dos estados finais usam objetos isolados do modelo de leitura, sem aprovar pedidos reais ou alterar saldos.

Eventos preservam identificadores, horários, autor, estado anterior/novo e parecer. A linha do tempo do aluno incorpora os eventos da solicitação sem gravar eventos a cada consulta. O aluno acompanha o status em Aulas canceladas, atualizado pelo mecanismo de sincronização local já existente.

O botão azul do cabeçalho **Cadastrar aluno** aparece exclusivamente em **Alunos**. O formulário, sidebar e funções rápidas de cadastro permanecem disponíveis.

## Pendências de backend / ADM 2

Implementar contratos autenticados para envio/cancelamento atômico, armazenamento privado de documentos, inspeção de arquivo e malware, download autorizado e auditado, escopo de unidade e consulta de solicitações. O navegador não deve decidir autorização real. Decisão definitiva e devolução precisam de transação no servidor com unicidade por aula/solicitação, valores por categoria, motivo, responsável, timestamp e chave idempotente — preservando cancelamento e histórico. Implementar separadamente o futuro painel ADM 2 e seus comandos; nada disso é simulado nesta entrega.

## Arquivos desta entrega

- `shared/js/solicitacoesMedicas.js` — contrato, validação e transições limitadas.
- `dev/aluno/documentosMedicos.js`, `dev/aluno/servicoRecepcao.js` — arquivos locais e envio autenticado.
- `aluno/js/components/solicitacaoMedica.js`, `aluno/js/components/painelAluno.js`, `aluno/css/minhas-aulas.css` — modal e acompanhamento do aluno.
- `nivel-1-operador/js/solicitacoesOperador.js`, `nivel-1-operador/js/servicoOperador.js`, `nivel-1-operador/js/fichaOperador.js` — autorização, encaminhamento e histórico.
- `nivel-1-operador/js/components/verificacoesMedicas.js`, `unidadeOperador.js`, `painelOperador.js` e `nivel-1-operador/css/operador-paineis.css` — listagem, análise e cabeçalhos.
- `nivel-1-operador/js/dominioOperador.js`, `dev/instrutor/agendamentosLocais.js` — omitem o conteúdo da solicitação médica nas projeções genéricas de agenda; a análise usa o serviço específico autorizado.
- `tests/solicitacoes-medicas.test.mjs`, `tests/solicitacoes-medicas.browser.steps.mjs`, `tests/agenda-recepcao.browser.mjs` — testes unitários e fluxo em perfil descartável. `tests/operador-cfc.browser.mjs` teve as fixtures alinhadas ao câmbio obrigatório já existente da entrega anterior, para executar a regressão administrativa completa.

Arquivos do refinamento de acompanhamento: `aluno/js/components/atestadosAluno.js`, `aluno/js/components/painelAluno.js`, `aluno/css/minhas-aulas.css`, `dev/aluno/servicoRecepcao.js`, `shared/js/solicitacoesMedicas.js`, `shared/components/situacaoMedica.js`, `shared/css/solicitacoesMedicas.css`, `nivel-1-operador/js/components/verificacoesMedicas.js`, `nivel-1-operador/css/operador-paineis.css`, os dois testes de solicitações médicas e este documento. O fluxo de envio/cancelamento foi reaproveitado.

## Executar testes

`node --test tests/solicitacoes-medicas.test.mjs`

`$env:SIPA_TEST_CENARIO='medico'; node tests/agenda-recepcao.browser.mjs`

O teste de navegador usa documentos fictícios, IndexedDB isolado e duas abas descartáveis. Nenhum arquivo é gravado no navegador pessoal, API, banco real ou worktrees históricos.

## Autorização definitiva por unidade-base

A unidade responsável é resolvida em `shared/js/escopoAlunoAdministrativo.js`, a partir do aluno identificado na aula/pendência e de `aluno.unidadePrincipal || aluno.unidade`, validada no catálogo institucional. `unidadeRecepcao`, unidade da aula, veículo, instrutor, URL e filtros não concedem autorização. Campos antigos são preservados; a resolução ocorre na leitura, inclusive para solicitações anteriores sem unidade registrada.

Recepção consulta documentos, analisa e encaminha somente os registros da sua unidade-base. Gerência consulta e decide somente os registros da sua unidade-base. Master mantém leitura global e filtros pela base; um filtro global não transforma um registro sem vínculo seguro em autorização para alterar créditos. Aluno ausente, base inválida ou IDs incompatíveis são sinalizados ao Master e bloqueados para decisões/encaminhamentos até tratamento cadastral autorizado. Nenhum vínculo é inferido da localização da aula.

Listagens, detalhes, documentos, encaminhamentos, decisões, relatórios médicos, pendências e indicadores utilizam a mesma resolução. As projeções operacionais mantêm aulas compartilhadas, mas retiram documentos, pareceres e histórico médico alheios, sem alterar os registros armazenados. Pendências concluídas continuam no histórico e não são contadas como pendentes. Crédito, idempotência, anexos e decisões anteriores permanecem protegidos pelas regras existentes.

Na integração, o backend deverá derivar perfil e unidade da sessão autenticada e repetir a autorização por cadastro em todas as consultas e comandos, inclusive downloads de documentos, histórico e devoluções. O armazenamento local é um laboratório no navegador e não oferece proteção contra quem altera o próprio JavaScript ou armazenamento. Esta correção não altera autenticação, API ou SQL Server.

Testes específicos: `node --test tests/escopo-medico-unidade-base.test.mjs` e `$env:SIPA_TEST_CENARIO='escopo-medico'; node tests/agenda-recepcao.browser.mjs`.

Arquivos da correção por unidade-base: `shared/js/escopoAlunoAdministrativo.js` (novo), `nivel-1-operador/js/solicitacoesOperador.js`, `nivel-1-operador/js/servicoOperador.js`, `dev/servicoAdministrativo.js`, `shared/js/administracao.js`, `shared/js/relatoriosAdministrativos.js`, `shared/components/painelAdministrativo.js`, `nivel-1-operador/js/components/verificacoesMedicas.js`, os novos testes `tests/escopo-medico-unidade-base.test.mjs` e `tests/escopo-medico.browser.steps.mjs`, o registro do cenário em `tests/agenda-recepcao.browser.mjs`, a espera pela reautorização do modal em `tests/administracao.browser.steps.mjs` e este documento. Não houve alteração de CSS, autenticação, API ou banco de dados.
