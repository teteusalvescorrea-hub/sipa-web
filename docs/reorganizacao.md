> Documento histórico: instruções de demonstração abaixo foram desativadas. O estado atual está em `../ENTREGA-FRONTEND-SIPA.md`.

# Relatório da reorganização local

## Retomada, backup e Git

Na retomada, a branch `feature/organizacao-estrutura-sipa` já estava criada. O
inventário, hashes e backup seletivo estavam concluídos, e nenhuma movimentação
havia começado. A implementação continuou desse ponto, sem repetir a preparação.

Backup verificado, fora das pastas servidas:
`organizacao-2026-10-19T17-54-04-185Z` (artefato privado fora do repositório).

O backup contém os arquivos pendentes da raiz e do Instrutor, o workspace anterior
e `inventario.json`, com status, branches, commits e hashes dos três worktrees.
A raiz tinha 39 entradas pendentes, e o Instrutor 14. Nenhum commit foi criado.

## Fonte das funcionalidades

- Aluno: versão completa da raiz, não a versão reduzida da entrega histórica.
- Instrutor: implementação existente em `.instrutor-local`, reaproveitada
  seletivamente sem modificar sua origem.
- Nível 1: implementação da raiz, preservando todas as funções de calendário,
  conflito, pareamento, exames, agenda e demonstração.
- API do Aluno: somente os adaptadores e componentes de integração necessários
  foram aproveitados de `.entrega-aluno`, sem substituir o laboratório completo.

## Estrutura efetiva

```text
index.html                         # institucional aprovado
login.html                         # formulário aprovado, único
aluno/
  html/                            # as seis páginas existentes
  css/                             # estilos próprios e tema do Aluno
  js/
    components/                    # apresentação e preferências
    domain/                        # regras do Aluno
    services/                      # adaptador integrado
instrutor/
  html/instrutor.html               # quatro seções internas existentes
  css/
  js/
nivel-1-operador/
  html/operador-cfc.html
  css/
  js/
shared/
  css/sidebar.css
  js/                              # API, sessão, configuração, tema, catálogo,
    services/                      # calendário e disponibilidade completos
  components/localAula.js
dev/
  login.js                         # login livre exclusivamente local
  sessao.js                        # sessão demonstrativa sem CPF/senha
  aluno/                           # serviço e interface local completos
  instrutor/                       # cenários e persistência existentes
  operador/                        # demonstração do Nível 1
  preparar-integrado.mjs            # preparação futura, sem publicação
tests/
docs/
```

Níveis futuros documentados, sem pastas/páginas vazias: Nível 2 — Operador
Interunidades (`nivel-2-operador-interunidades`); Nível 3 — Administrador
Operacional (`nivel-3-administrador-operacional`); Nível 4 — Gerenciador
(`nivel-4-gerenciador`); Nível 5 — Administrador Master
(`nivel-5-administrador-master`).

## Movimentações e compatibilidade

`movimentacoes.json` registra cada origem e destino: 69 arquivos da aplicação
principal organizados, 9 arquivos aproveitados seletivamente e as extrações do
Dashboard local e dos cenários do Instrutor. Não houve cópia integral de projeto.

Os seis HTMLs e seus CSS/JS próprios saíram da raiz para `aluno/`. Os módulos
exclusivos do Operador ficaram em `nivel-1-operador/`. API/sessão/serviços,
catálogo, calendário e disponibilidade foram centralizados em `shared/`.
O módulo completo do Operador foi a fonte das regras comuns: funções adicionais
de conflito e pareamento não foram descartadas.

Os links internos, imports, assets, redirecionamentos e testes foram ajustados.
A preferência de tema continua na mesma chave, agora com helper compartilhado;
os estilos e controles específicos dos perfis permanecem os mesmos.

`cadastro.html`, `autoescola.html`, seus arquivos públicos e `js/script.js`
permanecem por compatibilidade com as áreas anteriores. Não são uma nova entrada
de desenvolvimento. Autoescola não é convertido automaticamente em Nível 1.
A documentação anterior está preservada localmente em `referencia-anterior.md`
(metadado privado, fora da entrega Git), e os
roteiros do login antigo em `tests/legado/`, separados da regressão atual.

## Acesso e ambientes

Abra o `index.html` principal com **Open with Live Server**, no workspace atual.
Pare e reabra o Live Server uma vez caso ele estivesse ativo com os mounts antigos.
Hostname e porta habituais não foram alterados na configuração.

No laboratório explicitamente habilitado em `shared/js/configuracao.js`, basta
preencher CPF e senha e selecionar Aluno ou Instrutor. Não há consulta de cadastro,
verificação de dígitos, senha universal ou chamada de autenticação à API.
CPF e senha digitados não são salvos ou usados como chave. Apenas uma sessão
demonstrativa de duas horas é gravada em `sipa.dev.navegacao.v1`.

A sessão não é JWT e não concede acesso administrativo ou autorização para API.
Sair encerra apenas essa sessão. A navegação passa a ser inteiramente da aplicação
principal: nenhum perfil depende de abrir os worktrees históricos.

`?ambiente=integrado` somente desliga o laboratório nesta cópia local. Produção
exige configuração false e não permite ativação por URL ou armazenamento.
A preparação integrada usa uma lista explícita de arquivos, exclui `dev/`, testes
e worktrees e desliga a configuração. Não publica, não sobrescreve destinos e não
altera a cópia de desenvolvimento. Foi executada somente em diretórios temporários
para validação, sem envio de entrega.

## Preservação de dados e identidade

Nenhum navegador pessoal foi utilizado nos testes. Não houve limpeza, migração
ou exportação dos dados pessoais do navegador.

O Aluno mantém o IndexedDB `sipa.dev.local.v1`, versão e stores anteriores. A conta
antiga é consultada em leitura para preservar o vínculo ao conjunto de testes.
O CPF arbitrário digitado não cria outro aluno e não redefine seus dados. Sem
dados anteriores, as configurações de créditos e recursos continuam sendo ações
explícitas, não efeitos do login. Nenhum saldo real recebe 20 aulas padrão.

O Instrutor mantém `sipa.instrutor.dev.dados.v1`; a entrada reaproveita dados
existentes e não os regrava a cada carga. Os cenários originais são criados somente
se ainda não existirem. As chaves de Operador e tema foram mantidas. Token real e
sessões antigas não são removidos pelo login livre.

Troca de senha não é oferecida a uma sessão livre, pois ela não possui senha
armazenada. O código anterior foi preservado, mas essa sessão não pode usá-lo
para alterar credenciais antigas. A troca integrada depende do backend.

`preservacao.json` (metadado privado, preservado localmente e fora da entrega Git)
confirma, por hashes, zero alteração nos arquivos inventariados
de `.entrega-aluno` e `.instrutor-local`, commits inalterados, branch anterior
preservada e index/CSS institucionais originais intactos. No HTML do login, a
referência ao CSS de pacotes foi atualizada para a nova pasta, sem redesenho.

## Integração real e pendências

O login integrado usa o endpoint existente `/api/usuarios/login`; a API determina
identidade e perfil. O frontend guarda somente o token oficial e não usa a sessão
livre como autenticação. Validação efetiva de token, revogação, dono, unidade e
permissões pertence ao servidor.

O Aluno integrado usa ID/CPF do cadastro retornado por `/api/alunos/me`,
contratações e agendamentos autorizados. Zero oficial continua zero e saldo
conjunto não é dividido artificialmente por categoria. CPF digitado não determina
sozinho quais dados serão lidos.

Continuam pendentes de integração: operações oficiais de reserva/cancelamento,
senha, automático e antecipação no adaptador integrado; contrato de dados e
veículo do Instrutor; permissões/unidade dos cinco níveis e verificações ICFC.
Essas ações não são simuladas como sucesso no ambiente integrado.

A API real não foi iniciada nem alterada e estava indisponível nos endereços
locais durante a auditoria. Os testes não comprovam comunicação com SQL Server,
revogação real ou implantação. Bigas deverá validar esses contratos e transações.

## Validações executadas

| Comando/cenário | Resultado final |
| --- | --- |
| `node --test tests/*.test.mjs` | 65 testes aprovados |
| `node tests/reorganizacao.browser.mjs` | 35 verificações: preservação integral de conta e saldos anteriores (7 carro/9 moto), Live Server, index/login, entrada livre sem conta, seis páginas, Instrutor, realização/falta, sessão, temas e isolamento |
| `node tests/login.browser.mjs` | 120 verificações: múltiplas aulas, recursos em lote/individuais, reservas, falhas atômicas, créditos, modais, cancelamentos, progresso, histórico e endereços |
| `SIPA_TEST_CENARIO=automatico` | 46 verificações: automático, preferências, penalidade, atestado/72h, cancelamento pontual e multiunidade |
| `SIPA_TEST_CENARIO=preferencias` | 21 verificações: horários por dia, teclado, persistência, preservação e temas |
| `SIPA_TEST_CENARIO=calendario` | 122 verificações: grade, feriados, restrições, contraste, responsividade e menus das seis páginas |
| `SIPA_TEST_CENARIO=enderecos` | 17 verificações: endereços das seis unidades e links de mapas |
| `node tests/operador-cfc.browser.mjs` | 134 verificações: bloqueio real, interface, ICFC pendente, agenda, recursos, conflitos, persistência e responsividade |
| `node tests/integrado.browser.mjs` | 7 verificações na preparação integrada: dev ausente, configuração false mesmo com query local, token obrigatório e recusa da API sem fallback |

Todos os resultados finais passaram. Falhas intermediárias de caminhos antigos e
expectativas do login com conta foram corrigidas nos testes para refletir as rotas
e o login livre atuais. Não há regressão final conhecida nos cenários executados.

As referências HTML e imports foram verificados, assim como a ausência de
dependência dos worktrees e a preservação por hashes. As capturas de tela ficam
nos diretórios temporários informados por cada teste, não na aplicação.

Não houve pull, fetch, merge, rebase, commit, push, PR, modificação de backend,
Docker ou SQL Server, nem incorporação de atualizações recentes do Bigas.

## Checklist pré-produção — exceção temporária de CPF

Ônibus temporário: antes da entrega, desligar a configuração de desenvolvimento e retirar `dev/operador/onibusTemporario.js` e suas chamadas nos adaptadores de Recepção/Aluno. Revisar a seleção temporária em `shared/js/categorias.js`. Os IDs `DEV-INSTRUTOR-ONIBUS-001` e `DEV-ONIBUS-001` ficam em `sipa.operador.demo.v2.recursos`, marcados com `temporarioOnibus: 'sipa-onibus-local-v1'`. Separar/exportar dados de laboratório e preservar referências das reservas antes de qualquer remoção. Não realizar essa limpeza agora. Procedimento e testes em `ALUNO-CONTA-RECEPCAO.md`.

- [ ] Antes da entrega ao Bigas, remover/desabilitar `dev/operador/politicaCpf.js` e a opção **Permitir CPF ficticio neste teste** do cadastro. Nunca injetar `politicaCpfLocal` no serviço integrado.
- [ ] Garantir validação matemática obrigatória, exatamente 11 dígitos e duplicidade no fluxo integrado; o backend também deverá validar esses requisitos.
- [ ] Desativar a flag de desenvolvimento e excluir `dev/`, fixtures, atalhos, seletores e mecanismos de demonstração na preparação integrada. Não realizar essa limpeza no laboratório atual.
- [ ] Não transformar os CPFs fictícios existentes em cadastros reais nem enviar automaticamente o armazenamento de testes à API. A limpeza/migração de dados precisa de planejamento próprio; nenhum registro foi apagado por esta alteração.
- [x] Segunda liberacao de teste desativada: botao e injecao removidos, factory residual rejeita operacoes. Preservar auditorias antigas. Creditos adquiridos no cadastro ficam disponiveis automaticamente; implementar a mesma regra no backend, sem segunda liberacao financeira.
- [ ] Manter a máscara numérica de CPF no login e a validação matemática integrada; retirar login livre, seletores e exceções de desenvolvimento. O modo local aceita CPF fictício com exatamente 11 dígitos apenas para tentar autenticar as credenciais locais.

A exceção é centralizada em `dev/operador/politicaCpf.js`, na constante de código `CPF_FICTICIO_ALUNO_LOCAL_HABILITADO=true`, exclusiva desta cópia de desenvolvimento. Não há checkbox, comando de usuário ou preferência em LocalStorage para habilitá-la. Ela exige host loopback e modo de desenvolvimento ativo; produção e execução integrada mantêm a validação oficial. `?demo=1` ou outros parâmetros não ativam uma configuração desabilitada. Para desligar a exceção, definir a constante como `false`. Antes da integração, desabilitá-la; o preparo integrado também exclui `dev/` e desliga a configuração geral de desenvolvimento.

Mesmo quando ativada, exige exatamente 11 dígitos, mantém a pontuação de apresentação e rejeita duplicidade. O validador matemático `cpfValido` permanece intacto como padrão do domínio e dos serviços sem política local. A mesma política de alunos é usada na pré-validação e gravação dos cadastros ADM 1/2/3 e nas edições autorizadas do ADM 2/3. A Recepção continua sem edição de dados protegidos. Nenhuma validação de funcionário, instrutor ou administrador é flexibilizada. Isso não consulta a Receita Federal nem comprova existência ou titularidade.

Validação desta alteração: `node --test tests/*.test.mjs` passou em 123 testes. O novo `tests/cpf-ficticio.test.mjs` cobre padrão oficial, ativação local, tamanhos, duplicidade, categorias A/B/D, preservação, desativação e recusa fora do ambiente autorizado. O cenário de navegador `$env:SIPA_TEST_CENARIO='cpf'; node tests/agenda-recepcao.browser.mjs` passou em 12 verificações: cadastro fictício, apresentação, consulta, persistência, duplicidade, comprimentos inválidos e retorno ao padrão após recarga. Os testes usam perfil temporário e não alteram o armazenamento pessoal.

Arquivos da implementação inicial: `dev/operador/politicaCpf.js`, `dev/operador/atendimentoLocal.js`, `nivel-1-operador/js/dominioOperador.js`, `nivel-1-operador/js/servicoOperador.js`, `nivel-1-operador/js/components/unidadeOperador.js`, `tests/cpf-ficticio.test.mjs`, `tests/agenda-recepcao.browser.mjs`, `tests/agenda-recepcao.browser.steps.mjs` e este documento. Nenhuma API ou banco foi alterado.

Atualização da política de alunos: a configuração em código agora é compartilhada também por `shared/js/entradaAdministrativa.js`, `dev/servicoAdministrativo.js` e `nivel-1-operador/js/fichaOperador.js`; o serviço não expõe mais um comando de ativação pelo usuário. `nivel-1-operador/js/components/fichaEvolucao.js` reutiliza a máscara de CPF na edição. Não houve migração de cadastros existentes.

Validação atual: 263 testes Node aprovados. O cenário `$env:SIPA_TEST_CENARIO='cpf-aluno-local'; node tests/agenda-recepcao.browser.mjs`, definido em `tests/cpf-aluno-local.browser.steps.mjs`, passou em 16 verificações: cadastro com CPF fictício nos três perfis, duplicidade, máscara, edição autorizada mantendo o acesso individual, login do aluno com `111.111.111-11`, troca obrigatória de senha, agendamento completo, débito único do crédito, persistência e novo login pessoal. O teste roda em origem e perfil descartáveis, sem dados do usuário.
