# SIPA — ENTREGA AO BIGAS: PRONTO PARA AUTORIZAÇÃO

Preparação local em 29/10/2026. **Nenhum envio ou operação de escrita no Git executado.**
Entrega de código para integração, não uma homologação de produção.

Este relatório registra a preparação anterior à autorização de commit. Na etapa
seguinte, o usuário autorizou criar a branch e o commit, mantendo o push pendente.
A conferência pré-commit ampliou a revisão para todas as extensões textuais e
anonimizou também `tests/legado/login-conta-anterior.browser.mjs.fixture`, sem
alterar sua lógica. Os 271 testes automatizados foram aprovados novamente.

## Repositório e recorte

- Repositório: `teteusalvescorrea-hub/sipa-web`.
- Remoto configurado: `https://github.com/teteusalvescorrea-hub/sipa-web.git`.
- Branch atual: `feature/organizacao-estrutura-sipa`.
- HEAD de referência: `5a9667de517f5da26ed70165bcc5a29200f0789b`.
- A referência **local** `hml` está dois commits atrás desse HEAD e não possui
  commits exclusivos nessa comparação. O GitHub não foi consultado ou sincronizado.
- O índice Git está vazio de alterações preparadas. A entrega reúne a reorganização
  anterior, funcionalidades dos cinco perfis e preparação/validação das Etapas 1–2.
  Não se limita às modificações documentais da Etapa 3.
- Mudanças em index/login, cadastros públicos, estilos, serviços e testes pertencem
  ao conjunto consolidado. As remoções de caminhos antigos acompanham os arquivos
  nos diretórios de perfil e `shared/`; não são uma proposta de apagar os painéis.
- Fora do recorte: worktrees `.entrega-aluno/` e `.instrutor-local/`, backups,
  artefatos de navegador, metadados privados de preservação e arquivos de ambiente.
  Os antigos roteiros `MASTER-TESTE-LOCAL.md` e `ACESSOS-LOCAIS-V2.md` também ficam
  preservados somente localmente, pois suas instruções de provisionamento foram desativadas.
  Não foram encontrados outros arquivos de trabalho avulsos no inventário selecionado.
  A origem de cada alteração histórica não pode ser atribuída automaticamente pelo Git.

## Lista exata

[ARQUIVOS-ENTREGA-BIGAS.tsv](ARQUIVOS-ENTREGA-BIGAS.tsv) é a lista fechada de caminhos,
sem glob ou seleção por diretório. Colunas:

- `A`: arquivo novo a incluir em eventual commit.
- `M`: arquivo rastreado modificado a incluir.
- `D`: remoção do caminho anterior a registrar junto com seus destinos.
- `=`: arquivo já no HEAD, necessário à árvore entregue, sem mudança para preparar.
- `publico-candidato`: pertence à entrada do preparador de distribuição. Alguns
  entrypoints são transformados e três componentes legados são excluídos pelo preparador.
- `fonte-referencia`, `teste-isolado`, `documentacao`: somente no fonte Git;
  não publicar esses diretórios no servidor estático.

O inventário inclui a si próprio. O relatório
[VERIFICACAO-ENTREGA-ETAPA3.json](VERIFICACAO-ENTREGA-ETAPA3.json) resume contagens,
checagens e exclusões. Não usar `git add .` ou `git add -A` sem a seleção revisada.
Antes de qualquer commit autorizado, comparar novamente a lista com o estado atual;
novas alterações posteriores não estão automaticamente autorizadas.

Inventário final: **276 novos, 15 modificados, 58 remoções e 6 já existentes sem
alteração** — 355 caminhos, dos quais 297 são arquivos presentes. Todos os 58
caminhos removidos possuem destino existente no mapa da reorganização.

## Branch e commit propostos — ainda não executados

Criar **`feature/entrega-frontend-integracao`**, a partir do HEAD local atual.
Essa branch ainda não existe. A criação não separa sozinha as mudanças pendentes:
a seleção explícita do manifesto será necessária. Não mover/copiar arquivos de worktrees.

Mensagem proposta:

```text
feat: prepara frontend SIPA para integracao com a API

Consolida os cinco perfis e as regras compartilhadas.
Mantem demonstracoes desativadas e documenta contratos pendentes.
Inclui testes isolados, preparador de distribuicao e inventario da entrega.
```

Após autorização específica: criar a branch, preparar somente A/M/D do manifesto,
revisar o diff preparado, criar o commit e enviar **somente essa branch** ao origin.
Proposta de destino de revisão: `hml`. A situação atual dos PRs e da branch remota
precisará ser conferida em leitura antes de preparar um PR; não foi verificada agora.
Merge, publicação e Etapa de produção permanecem separados da entrega.

## Funcionalidades preservadas

- Login oficial e cliente HTTP com Bearer; cinco opções de painel sem concessão de
  autorização por seletor. Recuperação e redefinição precisam de serviço seguro.
- Aluno: dashboard, saldos, agendamento manual/automático, revisão e confirmação,
  aulas confirmadas/realizadas/canceladas, histórico, progresso, provas, exames,
  atestados, perfil, pacotes, antecipação, mensagens e contadores.
- Instrutor: início, agenda, frequência, faltas, detalhes, histórico e perfil.
- Recepção: atendimento, alunos, ficha, provas/tentativas, recursos, agendas,
  transferências e encaminhamento de solicitações médicas.
- Gerência: unidade-base, análise médica, relatórios e operações autorizadas.
- Master: visão global, unidades, gestão de acessos e exclusões com auditoria,
  preservação de dependências e proibição de autoexclusão.
- Calendário, pareamento, conflitos, créditos por categoria, cancelamentos,
  locais, compartilhamentos operacionais, temas e responsividade preservados.

Esses componentes e regras foram exercitados com adaptadores isolados. A presença
da interface e de regras JavaScript não significa que os comandos estejam ligados
à API. Os pontos ainda sem serviço permanecem indisponíveis no ambiente integrado.

## Integração a cargo do Bigas

Contrato detalhado em [ENTREGA-FRONTEND-SIPA.md](../ENTREGA-FRONTEND-SIPA.md):

1. Oficializar identidade, perfis/capacidades, unidade-base e escopo. Não converter
   `Autoescola` em ADM 1/2/3. Autorização no servidor para toda leitura e comando.
2. Integrar cadastros, recursos, jornadas, agenda, frequência, créditos,
   transferências, provas/tentativas, relatórios e exclusões.
3. Tornar atestados privados e decisões da Gerência transacionais, idempotentes e
   auditadas. Não devolver créditos duas vezes.
4. Implementar senha temporária aleatória/recuperação segura, troca obrigatória,
   revogação e política de produção; não usar prefixo do CPF.
5. Persistir entidades e relações no SQL Server, com proteção da auditoria,
   integridade referencial e migração explicitamente autorizada.
6. Integrar mensagens/notificações/leitura e antecipação com o aluno correto.
7. Configurar HTTPS, URL da API, CORS, retenção e armazenamento privado de arquivos.
8. Revisar os dados antigos do navegador por origem/proveniência, sem importação
   automática. A preparação não certifica nem limpa o armazenamento pessoal.

## Segurança e validação

- Configuração de laboratório e exceção de CPF fictício permanecem desligadas.
- A distribuição nova é gerada por allowlist, sem `dev/`, `tests/`, worktrees,
  contas pré-carregadas, backups, bancos de navegador ou snapshots de cadastros.
- O fonte de manutenção conserva geradores inativos e fixtures sintéticas somente
  como referência/teste. Não é a pasta a publicar diretamente no servidor.
- Um CPF pessoal antigo foi substituído apenas nas fixtures e verificadores;
  documentos públicos deixaram de conter caminhos pessoais de backup/evidências.
  As versões anteriores permanecem num backup privado fora do repositório.
- Nenhum segredo real foi identificado na revisão dos caminhos candidatos
  (tokens completos, chaves privadas, credenciais de serviço e dados de conta).
  Hashes/senhas de fixtures não são credenciais operacionais e ficam fora do pacote.
- O link existente de contato da recepção foi preservado como configuração de
  interface. Confirmar o destino institucional antes de produção; não foi criada
  lista de contatos ou importada informação do navegador.
- Etapa 2: 271 testes automatizados e 555 verificações de navegador aprovados,
  zero falhas finais. Resultados e limites preservados no relatório correspondente.
- Etapa 3: suíte automatizada repetida após anonimizar fixtures: **271/271**.
  Navegador afetado de múltiplos painéis: **29/29**.
  Distribuição integrada/recusa de demonstração: **10/10**.
  Auditoria estática: **151 arquivos, 547 referências, nenhuma ausente**.
  Não se somam esses testes às contagens da Etapa 2 como funcionalidades distintas.
- API e SQL Server não foram alterados. O repositório da API está sem mudanças
  pendentes nesta leitura; isso não equivale a testar a integração com ele.
- Nenhum layout ou regra da aplicação foi alterado nesta Etapa 3. Nada foi removido
  dos worktrees históricos nem do armazenamento pessoal.

**Pronto para autorização de entrega do fonte. Pendente de integração e homologação
antes de qualquer uso com dados reais.**

## Arquivos ajustados especificamente nesta Etapa 3

Além do conjunto anterior inventariado, esta preparação alterou somente documentação,
exclusões de entrega e identificadores de fixtures, sem modificar código da aplicação:

```text
.gitignore
README.md
ENTREGA-FRONTEND-SIPA.md
docs/reorganizacao.md
docs/movimentacoes.json
docs/RELATORIO-VALIDACAO-ETAPA-2.md
docs/VALIDACAO-ETAPA2-RESULTADOS.json
docs/PLANO-ENTREGA-BIGAS.md
docs/ARQUIVOS-ENTREGA-BIGAS.tsv
docs/VERIFICACAO-ENTREGA-ETAPA3.json
tests/acessos-v2.browser.steps.mjs
tests/auditoria-etapa2.mjs
tests/conta-multipaineis.browser.steps.mjs
tests/entrega-segura.test.mjs
tests/login-local.test.mjs
tests/sessao-demo.test.mjs
```
