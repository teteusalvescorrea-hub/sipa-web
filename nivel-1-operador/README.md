# Operador de CFC — Nível 1

## Abrir no workspace atual

Também é possível abrir `login.html` pelo Live Server, preencher CPF e senha não
vazios e escolher **Administrador Nível 1 — Operador de CFC** no ambiente de
demonstração. O campo de unidade aparece somente para esse perfil local. Não
cria uma conta e não armazena as credenciais digitadas.

**Preparação para produção:** remover ou desativar o login livre e ambos os
seletores antes da integração definitiva com a API do Bigas. A distribuição
integrada existente já desativa esse mecanismo e exclui os adaptadores `dev/`.

Abra `nivel-1-operador/html/operador-cfc.html` com **Open with Live Server**.
No navegador, acrescente `?demo=1&ambiente=local` ao endereço. Exemplo:

`http://127.0.0.1:5500/nivel-1-operador/html/operador-cfc.html?demo=1&ambiente=local`

O contexto padrão de desenvolvimento é Centro de Vila Velha. Para testar outra
identidade fictícia, use, por exemplo, `&unidade=Itaparica` ou
`&unidade=Santa%20Rita`. Isso só existe no adaptador local: não é troca de unidade
de uma conta real, e não existe seletor de unidade do operador na interface.
Sem `demo=1`, com `ambiente=integrado`, fora do loopback, ou na distribuição
preparada por `dev/preparar-integrado.mjs`, a demonstração não é habilitada.

Uma instalação nova começa **vazia**, sem gravar alunos, recursos, aulas ou
créditos. Registros de demonstração já existentes na chave
`sipa.operador.demo.v2` são preservados e reutilizados, inclusive IDs, históricos,
status, saldos e duração original. Nenhuma migração de registros é automática.
Não há limpeza de armazenamento. Os testes usam perfil descartável do Edge.

## Organização

- `html/operador-cfc.html`: entrada, template, navegação e acesso fechado.
- `css/unidade.css`: acabamento do atendimento, responsividade e temas.
- `js/dominioOperador.js`: CPF, cadastro, vínculos, etapas, disponibilidade e transferência.
- `js/servicoOperador.js`: comandos e consultas autorizadas através de uma porta de dados.
- `js/components/unidadeOperador.js`: apresentação e interações das telas.
- `js/components/agendaOperador.js`: agenda diária, semanal e mensal reaproveitada.
- `dev/operador/atendimentoLocal.js`: identidade fictícia, persistência e bloqueio de escrita.
- Os componentes e o compositor anteriores permanecem preservados; a entrada
  atual delega para o novo atendimento. Não há uma segunda página do Operador.

O adaptador local não usa sessão real, tokens da API, HTTP ou o IndexedDB do Aluno.
Mantém o formato v2 que o vínculo local do Instrutor já consegue ler. Escritas
usam o mesmo `navigator.locks` do Instrutor, relendo os dados antes do comando.
Snapshots incompatíveis ou indisponibilidade do armazenamento bloqueiam a
operação, sem substituir os dados por exemplos.

## Operações disponíveis no frontend local

Início com seis indicadores calculados, busca e filtros de alunos, paginação de
10 registros, cadastro validado e confirmado, ficha com cadastro, etapas,
créditos por categoria, histórico e acesso. Consulta de instrutores, veículos,
equipamentos e agendas da unidade. A inclusão/edição de recursos permanece
desabilitada porque não há permissão de escrita integrada para o Nível 1.

CPF é validado, mascarado na lista e nunca usado como ID interno. Cadastro
exige nome completo, CPF, nascimento anterior a hoje, telefone com DDD, e-mail,
categoria e unidade de carro para B/AB. Unidade principal vem da identidade.
Cadastro não libera créditos ou acesso real. Na demonstração, novos cadastros
passam a criar uma conta fictícia vinculada; convites reais continuam pendentes.

Novos cadastros também exigem observações administrativas e quantidades inteiras
positivas das categorias escolhidas. O formulário apresenta erros por campo e
confirma as quantidades separadas. `aulasAdquiridas: { A, B }` guarda somente o
que foi informado (apenas as chaves aplicáveis), sem criar créditos disponíveis.
A liberação definitiva desses valores depende de autorização e idempotência na
API. Alunos existentes não são migrados nem têm seus saldos alterados.

Etapas manuais exigem fonte, responsável e data; não representam verificação
oficial. Resultados de origem oficial são somente leitura. Registros legados
continuam consultáveis, sem serem convertidos automaticamente em liberação
prática. As cinco etapas, validade, situação financeira, saldo já existente,
recursos e conflitos são revalidados antes de confirmar uma reserva.

## Unidades e transferência

O serviço limita consulta de recursos e agendas à unidade da identidade.
Ficha administrativa requer unidade principal ou unidade de carro. Centro pode
operar aulas A de alunos externos com projeção mínima (ID, nome e categoria),
sem acesso à ficha ou aos dados administrativos desses alunos.

Moto usa sempre Centro de Vila Velha (ID institucional `Vila Velha`; alias legado
`Centro` aceito na leitura), Av. Luciano das Neves, 1335 – Divino, Vila Velha – ES.
Carro usa exclusivamente a unidade autorizada separada do cadastro principal.

A transferência altera apenas o destino de **novas reservas B**. A prévia
reaproveita `calcularPrazoCancelamento` do Aluno, com a mesma política de 48
horas úteis, feriados e horário de Brasília. Aulas anteriores não são migradas.
Aulas fora do prazo têm seleção de cancelamento desabilitada e são novamente
recusadas pelo comando, mesmo se a interface for manipulada.

Cancelar é opcional e exige seleção explícita das reservas elegíveis. Só esses
cancelamentos aplicam a devolução prevista pela política ao saldo B existente
e discriminado. A transferência sem cancelamentos não muda saldos. Saldo AB
legado sem discriminação não é dividido ou inventado; requer conciliação.
O histórico registra origem, destino, motivo, operador, instante e IDs das aulas
mantidas e canceladas. Reservas de amanhã fora do prazo ficam na origem.

## Integração pendente com a API

Na cópia local da API inspecionada, `PerfilEnum` contém Aluno, Motorista e
Autoescola; `TokenReadDto` retorna Token, ExpiraEm e Perfil. Não há identificação
de Operador N1, unidade autorizada e permissões suficientes para abrir esta área.
Autoescola **não** é automaticamente tratado como Operador.

Já existem serviços/rotas de alunos (`POST /api/alunos`, `GET/PUT /api/alunos/me`),
agendamentos, motoristas, veículos e unidades. Seus contratos/roles atuais não
autorizam esta recepção N1: não são chamados nem reaproveitados para contornar
as permissões existentes. O cadastro público não substitui o cadastro por operador.

Antes da integração, a API deve fornecer e validar:

1. Identidade, perfil N1, permissões e unidade do operador autenticado.
2. Consultas paginadas e projeções mínimas por vínculo, incluindo a pista A.
3. Cadastro com duplicidade global, etapas verificadas e auditoria persistente.
4. Créditos/contratações por categoria, disponibilidade e reservas transacionais.
5. Prévia e transferência B atômicas, com revalidação do prazo e das reservas.
6. Convites temporários de uso único, senha provisória, primeiro acesso e redefinição.
7. Integrações autorizadas de ICFC/DETRAN e permissões de escrita de recursos.

O serviço local é uma porta substituível (`ler`/`alterar`); seus IDs e estruturas
são contratos internos do frontend, não novos endpoints supostamente existentes.
Autorização no navegador **não substitui autorização no servidor**. O ambiente
integrado continua fechado. Não foi implementada autenticação real local N1.
O painel do Aluno não foi alterado: a aplicação dos novos vínculos de carro/moto
no agendamento integrado do Aluno é uma etapa futura, dependente dessa API.
Os dados locais do Operador também não são convertidos em contas reais ou
sobrescritos no armazenamento do Aluno.

## Conta fictícia vinculada ao cadastro

A confirmação tem sete cartões, processamento e bloqueio de repetição. Cadastro,
conta `ALUNO` e chave idempotente são persistidos juntos, em uma única escrita no
snapshot v2 existente. Falha de hash ou de armazenamento não deixa um cadastro
parcial. O `alunoId` é um UUID interno; CPF normalizado é somente o login. Repetir
a mesma solicitação não cria outro cadastro nem troca o hash da conta existente.
Não se provisionam contas automaticamente para cadastros antigos ao consultá-los
ou editá-los. O IndexedDB anterior permanece intacto.

Para testar: cadastre um aluno **fictício**, abra `login.html` no mesmo endereço
e porta, selecione Aluno e marque **Entrar na conta fictícia criada pela recepção**.
Use o CPF e, inicialmente, seus seis primeiros dígitos como senha. O diálogo
**Definir nova senha** exige confirmação e uma senha diferente, de 4 a 128
caracteres. Até concluir, consultas e páginas do aluno são recusadas. Contas
importadas compatíveis, sem ativação concluída, também são tratadas como pendentes.

O laboratório reaproveita PBKDF2-SHA256 (600 mil iterações, sal aleatório de
24 bytes) de `dev/aluno/authLocal.js`. Não guarda senha em texto puro. Sessões
fictícias usam nonce aleatório com hash no snapshot, expiração de duas horas e
versão da senha; logout e troca invalidam as sessões correspondentes. Cinco
falhas por identificação bloqueiam novas tentativas por 15 minutos; há também
limite global de falhas. Esse limite local pode ser removido por quem controla o
próprio navegador e **não substitui proteção no servidor**.

As consultas da conta não recebem CPF/ID de aluno: usam somente o vínculo da
sessão e retornam o próprio cadastro e suas aulas. Essa entrada é uma consulta
local inicial, nas rotas existentes do Aluno. Agendamento, liberação de créditos
e demais escritas para essa conta aguardam integração; não usam como fallback a
conta antiga do laboratório. O acesso livre já existente continua separado e não
requer a nova ativação. Nenhuma sessão JWT real é criada, alterada ou substituída.

**Backend pendente:** cadastro/identidade com FK estável e unicidade de CPF,
transação e chave de idempotência no servidor, hash e sessão próprios da API,
`mustChangePassword` validado em todos os endpoints protegidos, ativação real por
link com token aleatório de uso único e expiração, invalidação de sessões, limite
de tentativas/auditoria no servidor e consultas autorizadas pelo usuário do token.
Não habilitar a senha baseada em CPF em produção. A distribuição integrada
continua excluindo `dev/` e desativando o laboratório. Não foi feita migração ou
alteração da API/SQL Server, e não há autenticação real implementada por este fluxo.

## Validação

`node --test tests/operador-unidade.test.mjs` cobre vínculos, CPF, segregação,
transferência com três aulas amanhã, cancelamentos elegíveis, recursos, conflitos,
etapas, créditos e persistência. Os demais testes unitários continuam disponíveis.
`node tests/operador-cfc.browser.mjs` usa Edge descartável e HTTP local para testar
a UI real, formulários, transferência, carro/moto, temas e tamanhos de tela.
`node tests/reorganizacao.browser.mjs` verifica os fluxos consolidados de Aluno,
Instrutor, login e index. Testes reais dos endpoints N1 aguardam integração.

Alterações do fluxo de contas: `dev/aluno/contaRecepcao.js` (persistência/autenticação
fictícia), `dev/aluno/acessoRecepcao.js` (ativação e consulta própria),
`dev/aluno/authLocal.js` (exportação do hash já existente), `dev/login.js`,
`js/login.js`, `css/login.css`, `aluno/js/entrada.js` (gate da conta vinculada),
`dev/operador/atendimentoLocal.js`, `dev/operador/repositorioDemo.js`,
`js/servicoOperador.js`, `js/components/unidadeOperador.js`, `css/unidade.css`,
`tests/conta-recepcao.test.mjs` e `tests/operador-cfc.browser.mjs`.

Validação deste fluxo: 91 testes unitários aprovados, 144 verificações do Operador
e da conta vinculada no Edge descartável, e 181 verificações de regressão da
organização/login livre/Aluno/Instrutor. Foram exercitados erro de hash e falha
de persistência sem cadastro parcial, duplicidade/idempotência, troca obrigatória,
senha antiga recusada, consulta de terceiros recusada e proteção fora do loopback.
### Evolução da ficha local: cadastro, exames, provas e linha do tempo

A ficha tem seis abas superiores, nesta ordem: Cadastro, Exames e agendamento de prova,
Aulas, **Provas marcadas**, Histórico e Acesso. `montarExamesProvas`
apresenta somente acompanhamento e formulários de registro; `montarProvasAgendadas`
é exclusivo da quarta aba e apresenta duas seções sempre visíveis: Provas agendadas
e Histórico de provas e resultados, com tipo, tentativa, data e resultado, sem
expansor. As seis situações permitidas são Não solicitado, Solicitado, Agendado,
Aprovado, Reprovado e Cancelado. Situações antigas fora dessa lista permanecem
somente para consulta, sem habilitar novos lançamentos. A consulta relê a fonte ao abrir a aba;
a mudança de navegação não migra nem duplica registros. O mesmo `dialog` nativo
permanece aberto durante a navegação: suas seis abas compartilham o único
`::backdrop`, com escurecimento `#081d34a0` e `blur(5px)`. A contenção de rolagem
e a reserva estável da barra são aplicadas à ficha inteira; nenhuma aba desativa
ou altera a intensidade do filtro. O conteúdo do modal permanece sem filtro.

**Permissões corrigidas do Nível 1:** cadastro existente é somente consulta,
com observações administrativas e transferência de unidade de carro preservadas.
A identidade local possui `nivel: 1` e não recebe capacidades de edição.
Edição cadastral, remarcação de data já confirmada e exclusão administrativa
exigem `nivel: 2` e a capacidade específica no domínio; capacidades residuais
isoladas não liberam essas operações para o N1. Não há painel ou identidade N2
disponível no laboratório. Testes de comandos reservados usam identidades
sintéticas, exclusivamente no ambiente descartável de testes.

N1 mantém exames, solicitações, primeiro agendamento de cada tentativa, resultados
confirmados e novas tentativas após encerramento. Cancelamento exige a capacidade
`cancelar-prova` (expressamente concedida à identidade fictícia local). Datas
confirmadas ficam protegidas; os botões Editar e Excluir agendamento não aparecem
para N1. Os fluxos legados também não podem corrigir provas pelo N1. Registros e
eventos já existentes permanecem consultáveis. A API deverá validar nível,
capacidade, unidade e vínculo a partir da identidade autenticada no servidor.

`js/fichaOperador.js` concentra comandos puros de edição e tentativas; os comandos
do `servicoOperador` executam a alteração e a auditoria no mesmo snapshot, sob o
bloqueio já existente do adaptador local. Não há segunda base de aulas.
`js/components/fichaEvolucao.js` apresenta edição, quatro exames, provas teórica,
carro/moto, agendamentos ativos, resultados, exclusão lógica motivada e histórico
somente para leitura, filtrável e paginado em dez eventos.

Compatibilidade: os campos `exames`, `etapas`, `acompanhamentoExames`, créditos,
IDs e históricos anteriores não são apagados. Novas gravações utilizam
`examesAdministrativos` e `tentativasProvas`; registros antigos são projetados
na leitura e uma tentativa legada só é atualizada por ação explícita. Datas e
responsáveis ausentes continuam não informados. Novos cadastros guardam no evento
inicial categoria, unidades e quantidades adquiridas; não se deduzem condições
iniciais de cadastros antigos a partir dos valores atuais.

O CPF continua sendo login da conta fictícia vinculada, nunca o ID do aluno;
a edição atualiza esse login atomicamente, sem trocar hash ou credenciais.
Unidade principal e unidade de carro não podem ser editadas por esse formulário.
Categoria exige permissão explícita, impede remover categorias com compromissos
ativos e não concede créditos. A inclusão de carro sem vínculo previamente
configurado depende de procedimento autorizado ainda pendente de integração.

A linha do tempo consulta os eventos originais do Instrutor (status 5/6), sem
gerar presença ou falta. Dados locais exigem a mesma origem do navegador;
atualizações aparecem ao reabrir a aba. Pacotes adicionais só terão eventos
quando houver lançamento confirmado na fonte; nenhum pagamento é simulado.
Permissões, auditoria transacional, sincronização entre dispositivos e operações
oficiais de exames/provas precisam da API definitiva. Os registros manuais locais
não representam consultas, agendamentos ou cancelamentos oficiais no DETRAN.

Verificação: `node --test tests/operador-ficha-evolucao.test.mjs` e
`node tests/operador-cfc.browser.mjs` (Edge isolado, dados descartáveis).
