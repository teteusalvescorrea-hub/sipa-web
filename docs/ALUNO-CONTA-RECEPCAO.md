# Creditos do cadastro e conta da Recepcao

Regra definitiva: **cadastro com quantidade adquirida = creditos disponiveis automaticamente**, para A, B, AB e D. Nao ha segunda liberacao financeira, botao de teste ou concessao pelo login.

## Funcionamento atual

- Cadastro grava por categoria as quantidades informadas em aulasAdquiridas e creditos (contratadas, liberadas e disponiveis iguais a quantidade adquirida). O campo liberadas e apenas compatibilidade de apresentacao; nao representa uma segunda etapa.
- Financeiro inicial Pendente nao comprova pagamento nem bloqueia por si so. Verificacao financeira explicitamente registrada como Pendente, Em atraso e bloqueios administrativos ativos continuam impedindo reservas. Exames, provas, LADV e liberacao pratica sao exclusivamente acompanhamento administrativo e nao condicionam consulta ou reserva. Recursos, calendario, bloqueios operacionais, conflitos e saldo continuam validados. Nenhum exame e aprovado automaticamente.
- Cadastros antigos com aquisicao conhecida e sem ledger passam a projetar adquirido menos consumo, sem migrar dados ou criar credito no login. Saldo liquido explicito menor/zero e bloqueios registrados sao preservados. Quantidade desconhecida nao recebe pacote padrao.
- Reserva debita uma vez. Conclusao/presenca troca reservado por realizado, sem novo debito. Faltas e cancelamentos seguem a politica existente, inclusive 48 horas uteis e retencao/devolucao.
- Leitura e recarga nao escrevem saldos. O painel original do Aluno continua sendo usado, com mesmo ID, sessao e origem de dados da Recepcao. AB mantem A e B independentes; D compartilha unico instrutor/onibus.
- O botao e a injecao de liberacao de teste foram removidos. A antiga factory foi desativada para impedir chamadas residuais. Auditorias de liberacoes anteriores permanecem armazenadas.

## Regra definitiva de reserva e acompanhamento

Esta orientacao substitui a correcao anterior que condicionava a reserva a exames, provas, LADV e liberacao pratica. Nenhum desses campos, ausente, pendente, vencido ou com resultado, e usado como bloqueio automatico da consulta/reserva. Os registros continuam disponiveis para acompanhamento administrativo e nao sao transformados em aprovacoes. Esta mudanca nao altera procedimentos de realizacao efetiva da aula.

### Operacao unica da Categoria D

A causa de "Sem instrutor ... vinculado a Cobilandia" era um filtro pela unidade cadastral do recurso, aplicado tanto no catalogo quanto na projecao/consulta. O vinculo operacional agora vem da habilitacao D do instrutor e da categoria D do veiculo, independentemente da unidade cadastral. A unidade principal do aluno permanece independente. O fallback temporário autorizado abaixo atende o desenvolvimento quando falta o par real; não migra cadastros.

Catalogo global exige exatamente um instrutor e um onibus ativos e compativeis. Duplicidades reais sao diagnosticadas, nao escolhidas silenciosamente; o cadastro administrativo recusa um segundo recurso real ativo D do mesmo tipo. O cadastro real continua em Instrutores / Veiculos e recursos no ADM 1: informar nome, identificacao/placa, categoria D, jornada e almoco do instrutor. O fallback local não cria horários fixos: a disponibilidade é calculada pelo mesmo motor. A mesma regra vale para consulta manual, proposta automatica, conflitos e recepcao.

A unidade operacional da reserva continua Cobilandia. Local fisico: KM Cobilandia nos dias uteis; Tartarugao aos sabados, com expediente integral; domingo fechado. Aulas de 50 minutos, almoco individual e bloqueios permanecem. Recepcao pode reservar D para alunos autorizados de sua unidade; a agenda compartilhada nao amplia a consulta cadastral a alunos externos. Ocupacoes de terceiros continuam anonimas.

### Ônibus temporário — desenvolvimento local

Implementação central: `dev/operador/onibusTemporario.js`. Registros em `localStorage['sipa.operador.demo.v2'].recursos`, no mesmo snapshot e origem usados pela Recepção e pela conta cadastrada do Aluno:

- `DEV-INSTRUTOR-ONIBUS-001` — **Instrutor Teste — Categoria D**.
- `DEV-ONIBUS-001` — **Ônibus Teste — Categoria D**.
- Ambos identificados por `temporarioOnibus: 'sipa-onibus-local-v1'`, ativos, operação **KM — Categoria D**, com vínculo entre os IDs.

Não requer comando manual. No projeto principal, abrir `login.html` pelo Live Server, entrar na conta local criada pela Recepção e acessar Agendar aula. Havendo aluno D e faltando o par real completo, os recursos são preparados sob o mesmo lock do snapshot: no fluxo administrativo (`dev/operador/atendimentoLocal.js`) ou após autenticar a conta D (`dev/aluno/contaRecepcao.js`). Repetir a leitura/recarregar não duplica recursos, não redefine créditos nem reativa um recurso explicitamente desativado. Uma colisão de ID não sobrescreve cadastro existente.

Somente com `DESENVOLVIMENTO_LOCAL_HABILITADO=true`, origem HTTP(S) loopback autorizada e ambiente local ativo. Produção, rede local e modo integrado não criam nem selecionam os temporários, mesmo que seus registros permaneçam no armazenamento. Não há API ou SQL envolvidos.

O par real completo tem prioridade. Quando existe somente parte dele, a seleção temporária usa seus dois próprios recursos; nunca combina um instrutor real com o ônibus fictício ou vice-versa. Duplicidade/incompatibilidade real é diagnosticada, não escondida pelo fallback. O cadastro de recursos reais permanece disponível sem contar o temporário como um segundo recurso real.

Expediente temporário: segunda a sábado, 07h–18h50, aulas de 50 minutos. Campo `intervaloAlmoco: {inicio:'12:00',fim:'13:00'}`: bloqueia 12h, permite 11h e 13h. Isso não muda o almoço dos registros anteriores. Semana na KM Cobilândia; sábado integral no Tartarugão; domingo fechado.

Recepção e Aluno usam a mesma seleção operacional e os mesmos conflitos. Uma reserva D ocupa a operação global mesmo após trocar do par temporário para um par real com outros IDs. Os registros antigos mantêm os IDs originais, os nomes consultáveis e o consumo de crédito. A agenda da recepção autorizada também mostra as próprias aulas D cuja unidade operacional é Cobilândia; não expõe nomes de alunos externos.

**Remoção futura:** desligar a configuração de desenvolvimento na distribuição integrada e excluir o mecanismo dev; retirar os imports/chamadas de preparação dos dois adaptadores e revisar a seleção temporária em `shared/js/categorias.js`. Antes de retirar os registros/IDs de uma base, separar/exportar os dados de laboratório e preservar referências/históricos das aulas. Não apagar esses dados agora. Preferências salvas que fixavam IDs temporários deverão ser revisadas se o usuário passar a escolher os recursos reais.

**Validação da conclusão:** 157 testes unitários aprovados (7 específicos do temporário); 25 verificações em navegador usando recursos preparados pela própria aplicação, sem injetar recursos pela fixture; 20 específicas da Categoria D com cadastro manual real; regressões de 58 verificações do Aluno e 294 do Operador. O cenário temporário cobre aluno D com 10 créditos, recarga sem duplicação, reservas/Minhas aulas, agenda da recepção de Itaparica, almoço, sábado integral, endereços e conclusão mantendo 9 disponíveis, 0 reservadas e 1 realizada. Perfis de navegador descartáveis; nenhum armazenamento pessoal foi apagado.

Arquivos envolvidos nesta implementação: `dev/operador/onibusTemporario.js`, `shared/js/categorias.js`, `dev/operador/atendimentoLocal.js`, `dev/aluno/contaRecepcao.js`, `dev/aluno/servicoRecepcao.js`, `dev/aluno/authLocal.js`, `nivel-1-operador/js/dominioOperador.js`, `nivel-1-operador/js/servicoOperador.js`, `nivel-1-operador/js/components/agendaOperador.js`, `aluno/js/domain/agendamentoAluno.js`, `aluno/js/components/preferenciasAluno.js`; testes `onibus-temporario.test.mjs`, `agenda-recepcao.browser.mjs` e `creditos-d-fluxo.browser.steps.mjs`; este documento e o checklist `reorganizacao.md`.

### Um cadastro, duas visualizacoes

A conta autenticada mantem o mesmo aluno.id e snapshot sipa.operador.demo.v2; nao recebe copia no IndexedDB da conta livre. acompanhamentoDaConta le os mesmos EXAMES_FICHA, lerExameFicha, PROVAS_FICHA e provasDoAluno usados pelo ADM 1. Expoe exames, provas das categorias da matricula, datas, resultados, todas as tentativas e situacoes LADV/liberacao pratica. Nao expoe fonte interna/responsavel, credenciais ou observacoes internas nesse resumo.

Meu progresso preserva indicadores e barras e acrescenta Seus exames, Informacoes do processo e Suas provas. Tudo somente leitura, sem comandos de lancamento. Datas brasileiras, resultados e numero da tentativa nao sao sobrescritos por uma nova tentativa. Nao existe situacao nova Adiada. Historico administrativo, exames e tentativas nao fazem parte do patch de escrita do aluno. Agendar/cancelar nao substitui esses dados.

O mecanismo existente de storage, foco e verificacao periodica atualiza Meu progresso na mesma origem/navegador, adiando renderizacao durante dialogos abertos. Recarga consulta o registro atual. Nao ha sincronizacao entre dispositivos sem backend.

### Validacao desta entrega

- 150 testes unitarios aprovados: creditos, limites, categoria D em outras unidades, agenda global, recursos duplicados/ausentes, jornada, almoco, conflitos, escopo por unidade e acompanhamento.
- 23 verificacoes em navegador descartavel no fluxo cadastro D10 sem exames/LADV, recursos D com unidade cadastral Santa Rita/Itaparica, reserva, automatico, recepcao, Meu progresso atualizado em duas abas, resultados e novas tentativas, protecao de escrita, persistencia, temas e responsividade. Conclusao mantem 9 disponiveis, 0 reservadas e 1 realizada.
- Regressao: 26 verificacoes do Aluno e 294 do Operador aprovadas, incluindo que reprovacao medica e preservada como acompanhamento sem impedir reserva. Mais 20 verificacoes especificas da Categoria D aprovadas (cadastro explicito, almoco, sabado, locais, instrutor e persistencia).

Arquivos principais desta entrega: shared/js/categorias.js, shared/js/elegibilidadeAluno.js, dev/aluno/servicoRecepcao.js, dev/aluno/authLocal.js, dev/aluno/contaRecepcao.js, nivel-1-operador/js/dominioOperador.js, aluno/js/components/painelAluno.js, aluno/js/components/preferenciasAluno.js, aluno/js/domain/agendamentoAluno.js e aluno/css/meu-progresso.css. Testes atualizados: aluno-recepcao.test.mjs, categoria-d-almoco.test.mjs, operador-unidade.test.mjs, creditos-d-fluxo.browser.steps.mjs e operador-cfc.browser.mjs. Documentacao neste arquivo.

## Contrato esperado da API (nao implementado nesta etapa)

1. Criar aluno, acesso autorizado e ledger por categoria em transacao atomica e idempotente. A identidade/unidade e as permissoes devem vir da sessao validada no servidor.
2. Aceitar quantidades adquiridas inteiras positivas para as categorias da matricula. Registrar totais adquiridos e saldo imediatamente disponivel; nao exigir endpoint de liberacao financeira adicional. Nao presumir pagamento ou aprovacao de exames.
3. Disponivel = adquirido - reservas comprometidas - realizadas - faltas consumidas - cancelamentos com retencao, observando ajustes e bloqueios administrativos auditados. Se armazenar saldo liquido, nao subtrair novamente as mesmas aulas na leitura.
4. Reservar sob controle transacional de concorrencia: validar saldo, categoria, acesso/unidade, recursos, bloqueios operacionais e conflitos antes de debitar e persistir o lote. Pedido repetido nao debita novamente. D usa uma agenda global entre todas as unidades.
5. Realizar aula apenas altera status e historico, nunca debita outra vez. Cancelamento validado no servidor devolve credito somente uma vez quando autorizado pela regra de 48 horas uteis.
6. Consultas autenticadas retornam somente aluno autorizado, totais por categoria e motivos explicitos de bloqueio. Nenhum CPF recebido do cliente concede permissao.
7. Exames, provas e autorizações são acompanhamento somente de leitura para o aluno, não condições automáticas de reserva. Lançamentos permanecem nos comandos administrativos autorizados e auditados. A API deverá filtrar pelo aluno autenticado, rejeitar escrita desses campos pelo aluno e preservar todas as tentativas.
8. A operação D deve resolver instrutor habilitado e ônibus ativos globalmente, sem filtrar pela unidade cadastral. A disponibilidade e a transação de reserva usam os mesmos IDs globais de recursos para todas as unidades; local físico varia conforme o dia, não conforme a matrícula.

## Validacao executada nesta correcao

- 143 testes unitarios aprovados. Apos o ajuste final do saldo legado na Recepcao, os 40 testes diretamente afetados foram reexecutados e aprovados.
- 12 verificacoes no navegador: cadastro D10, saldo imediato, reserva, persistencia e conclusao pelo servico existente do Instrutor, mantendo 9 disponiveis, 0 reservadas e 1 realizada.
- 26 verificacoes das telas originais do Aluno e 293 do Operador aprovadas, em perfis descartaveis; nenhum erro novo no console.

## Teste local

Abra login.html pelo Live Server no ambiente de desenvolvimento autorizado. Recepcao cadastra o aluno e a quantidade; a conta criada acessa o painel original pela opcao de conta cadastrada. Nenhuma liberacao adicional e necessaria. Para reservar, configure os recursos pelo fluxo administrativo. Exames, provas e autorizacoes sao acompanhamento e nao precisam estar preenchidos para reservar.

Testes desta correcao: matriz A/B/AB/D com 1, 10 e 20 aulas; reserva, conclusao sem duplo debito, limites, bloqueios, categorias independentes e serializacao. Navegador descartavel: cadastro D com 10, login, saldo imediato, reserva com clique repetido, saldo 9 apos recarga e mesma reserva na Recepcao. Regressao das telas originais inclui cancelamento, conflitos, automatico e temas/responsividade.

Antes da integracao, remover/desabilitar mecanismos exclusivos de demonstracao e dados ficticios conforme checklist. **A disponibilidade automatica das aulas adquiridas e regra permanente, nao uma excecao de desenvolvimento.** API, banco e worktrees historicos nao foram alterados.

<details>
<summary>Historico tecnico anterior: regras de segunda liberacao abaixo estao revogadas</summary>

# Conta da Recepção no painel original do Aluno

## Causa confirmada

`aluno/js/entrada.js` identifica a sessão de conta criada pela Recepção e chama `montarPainelContaRecepcao()` em `dev/aluno/acessoRecepcao.js`. Antes da correção, essa função executava `main.replaceChildren()` e construía a mesma ficha genérica em todas as seis rotas. Isso substituía dashboard, calendário, aulas e progresso por uma consulta reduzida.

A função agora somente autentica e escolhe o adaptador de dados. Usa `prepararPaginaLocal` e os componentes originais em `aluno/js/dashboard.js`, `components/painelAluno.js` e `components/preferenciasAluno.js`. Nenhum segundo HTML, layout ou painel D foi criado. O gate local da conta não depende mais da preferência antiga usada pelo login livre: a sessão autenticada da Recepção usa a verificação compartilhada de desenvolvimento autorizado.

## Dados, créditos e gravações

- `dev/aluno/servicoRecepcao.js` adapta o snapshot `sipa.operador.demo.v2` ao contrato das telas existentes.
- O identificador continua sendo `aluno.id`, ligado à conta autenticada. Não há consulta por CPF/ID recebido do navegador nem cópia para o IndexedDB do login livre.
- O painel mostra apenas as categorias da matrícula A, B, AB ou D. Quantidades vêm de `aulasAdquiridas`/contratação registrada; não há pacote padrão de 20, preço inventado ou compra fictícia. Saldo explícito é autoritativo, inclusive zero. Sem saldo liberado explícito, a disponibilidade é zero: quantidade adquirida não presume pagamento nem autorização para reservar. A liberação de teste descrita abaixo exige ação explícita da Recepção; nunca ocorre na consulta/login.
- Reservar relê a conta sob o mesmo lock do snapshot, verifica saldo, categoria, unidade, etapas e financeiro, consulta os recursos novamente e grava as aulas e o débito em uma única persistência. A operação é idempotente pelo pedido e não salva parcialmente um lote inválido.
- A conta só consulta suas aulas; conflitos de terceiros são projeções de ocupação sem nome, CPF ou ID do aluno. Catálogos enviados às telas limitam categoria/unidade e omitem identificação pessoal dos instrutores. Alterações de dados cadastrais protegidos não são disponibilizadas.
- Cancelamento reutiliza a política compartilhada de 48 horas úteis; preserva a reserva no histórico e devolve ou retém o crédito conforme a política existente. Presença/falta registrada na origem é refletida na próxima consulta das telas.
- Preferências, primeiro acesso e alteração de senha continuam vinculados à mesma conta; senhas permanecem com hash. Não há configuração de recursos nem concessão de créditos do laboratório livre nessas contas.

## Categoria D e uso

Entre pelo login local, marcando **Entrar na conta fictícia criada pela recepção**. O primeiro acesso mantém a troca obrigatória da senha provisória. Depois, navegue normalmente pelas seis páginas originais do menu.

Ônibus usa sempre os recursos compartilhados de Cobilândia, independentemente da unidade principal do aluno. Segunda a sexta: KM Cobilândia; sábado integral: Tartarugão. Domingo permanece fechado. Aulas de 50 minutos, almoço individual, bloqueios e conflitos são os mesmos do cálculo compartilhado. A/B continuam com sábado reduzido. As reservas guardam o local físico real e o exibem com endereço/Maps.

O cadastro recém-criado não aprova automaticamente financeiro ou exames. Se houver pendência, falta de crédito ou recurso sem almoço/jornada configurada, o painel completo abre normalmente, mas a disponibilidade informa a pendência e não permite reserva inválida. Os testes preparam explicitamente esses pré-requisitos no perfil descartável; a aplicação não os aprova por conta própria.

Pacotes mantém a página original informativa. Pagamentos, preços D não configurados, contratos e liberação comercial definitiva dependem da integração autorizada. Nenhum checkout foi simulado.

## Validação executada

- Suíte automatizada: 132 testes aprovados, incluindo projeção A/B/AB/D, ID original, ausência de mutação/defaults, saldo zero preservado, contagem única de presença/falta, restrição do catálogo e distinção entre adquiridas/liberadas/saldo líquido.
- `$env:SIPA_TEST_CENARIO='aluno'; node tests/agenda-recepcao.browser.mjs`: 26 verificações aprovadas. Incluem cadastro D pela Recepção, login e troca de senha, dashboard original, manual e automático, quinta-feira e sábado integral/endereço, persistência, progresso, perfil, pacotes, quatro categorias, duas contas D de unidades diferentes, conflito do ônibus, recusa de cancelamento de terceiro e cancelamento próprio com devolução pela política vigente. Perfil conferido em 1440/390, claro/escuro, sem rolagem horizontal indevida.
- `node tests/operador-cfc.browser.mjs`: 293 verificações de regressão aprovadas, adaptadas para verificar o painel original em vez da ficha simplificada.
- `node tests/categoria-d.browser.mjs`: 20 verificações adicionais aprovadas no laboratório original do Aluno e nos registros do Instrutor, com os mesmos componentes compartilhados.

Testes executam em perfis temporários, sem apagar dados pessoais e sem chamar API real. Não houve alteração de API, SQL Server, Docker, permissões do ADM 1 ou worktrees históricos, nem commit/push/merge.

## Arquivos alterados

- `dev/aluno/acessoRecepcao.js`: remove renderização alternativa; mantém primeiro acesso e usa a entrada original.
- `dev/aluno/contaRecepcao.js`: porta autenticada de leitura/escrita e alteração segura da senha da própria conta.
- `dev/aluno/servicoRecepcao.js` (novo): adaptador da conta para os componentes originais.
- `dev/aluno/painelLocal.js`: recebe adaptador autenticado e desabilita ferramentas de recursos para essa conta.
- `aluno/js/dashboard.js`: categorias da matrícula e card D, inclusive saldo zero.
- `aluno/js/components/painelAluno.js`: categorias visíveis, perfil com nascimento/unidade de carro e faltas no progresso.
- `aluno/js/components/preferenciasAluno.js`: categorias autorizadas no modo automático.
- `tests/aluno-recepcao.test.mjs` e `tests/aluno-recepcao.browser.steps.mjs` (novos).
- `tests/agenda-recepcao.browser.mjs` e `tests/operador-cfc.browser.mjs`: cenário e regressão atualizados.
- `docs/CATEGORIA-D-ALMOCO.md` e este documento: limitação antiga atualizada e contrato local documentado.

## Antes da integração

O adaptador é somente de desenvolvimento, protegido pelo gate local existente. A entrega integrada deve continuar desativando a flag e excluindo `dev/` e fixtures. A API precisará implementar identidade/autorização de aluno, catálogo permitido, saldo/contratações, disponibilidade global, reserva/cancelamento atômicos e auditoria. O frontend local não substitui essas validações de servidor. A limpeza geral dos recursos de teste não foi antecipada.

## Correção adicional — financeiro, créditos liberados e CPF do login

A mensagem de financeiro pendente vinha da elegibilidade real do adaptador, não de um erro no calendário D. Agora aulas adquiridas, saldo liberado e situação financeira ficam explicitamente separados: um cadastro com 10 adquiridas e sem liberação não recebe automaticamente 10 créditos agendáveis.

Para liberar um aluno fictício: entre como ADM 1 local na unidade autorizada → **Cadastro e consulta de alunos** → abra a ficha → **Aulas** → **Liberar créditos fictícios para teste** → confira nome/CPF → confirme a ação. Isso utiliza somente as quantidades já adquiridas, desconta consumo existente, preserva saldos positivos e impede nova liberação/reinício pelo mesmo atalho. Não registra pagamento. A situação fictícia fica Regular com origem `teste-local-sem-pagamento`, responsável, data e snapshot anterior (financeiro, verificação e créditos) preservados na auditoria. Os demais alunos não são alterados. A liberação não remove bloqueio oficial ou situação Em atraso e não aprova exames. Se faltarem exames/etapas válidas, instrutor/ônibus ativo, vínculo, jornada ou almoço, a reserva continua bloqueada com a respectiva orientação. Reabra/atualize o agendamento do aluno depois da ação.

O catálogo D exige exatamente um ônibus e um instrutor ativos em Cobilândia. Ausência, duplicidade ou vínculo explícito incompatível gera orientação, sem escolher silenciosamente outra agenda. Recepção e contas criadas por ela continuam lendo/gravam no mesmo snapshot do navegador/origem; não há sincronização prometida entre dispositivos. Domingo, feriados, almoço e conflitos permanecem bloqueados. Quinta-feira usa Cobilândia; sábado integral usa Tartarugão.

No login, a exceção antiga que aumentava o CPF para 80 caracteres e desligava a máscara no modo demo foi removida. `shared/js/formatacao.js` centraliza a máscara progressiva de entrada, limite de 11 números/14 caracteres e tratamento de colagem e cursor; o formatador de leitura completo permanece separado. Login, recuperação, cadastro e busca administrativa por CPF usam essa implementação. Na busca, nomes continuam sendo nomes. Ao enviar login, CPF vazio/incompleto é recusado com orientação discreta, a autenticação recebe dígitos normalizados e o modo local não exige dígitos verificadores. A validação matemática integrada permanece intacta; não há consulta à Receita Federal. Senha, perfis e destinos não foram redesenhados ou substituídos.

Testes desta correção: 129 automatizados aprovados; 36 verificações de navegador para máscara, colagem, edição, celular, cadastro e login fictício; 26 verificações do fluxo Aluno/Recepção, incluindo liberação explícita e quinta 29/10/2026, sábado integral, A/B/AB, conflitos e persistência; 293 verificações de regressão do Operador aprovadas. Todos em perfis descartáveis, sem alterar os dados pessoais existentes.

Arquivos desta correção: `shared/js/formatacao.js`, `shared/js/categorias.js`, `js/login.js`, `dev/operador/liberacaoAgendaTeste.js` (novo), `dev/operador/atendimentoLocal.js`, `nivel-1-operador/js/servicoOperador.js`, `nivel-1-operador/js/dominioOperador.js`, `nivel-1-operador/js/components/unidadeOperador.js`, `dev/aluno/authLocal.js`, `dev/aluno/servicoRecepcao.js`; testes `agenda-financeiro-cpf.test.mjs` (novo), `mascara-cpf.browser.steps.mjs` (novo), `agenda-recepcao.browser.mjs`, `aluno-recepcao.browser.steps.mjs`, `aluno-recepcao.test.mjs`, `categoria-d-almoco.test.mjs`; documentação neste arquivo, `CATEGORIA-D-ALMOCO.md` e checklist em `reorganizacao.md`.

## Consolidação do fluxo de dez aulas D

A origem de **10 adquiridas / 0 disponíveis** é explícita: o cadastro grava `aulasAdquiridas.D=10`, financeiro Pendente e não cria saldo liberado. Não foi corrigido atribuindo dez automaticamente. A ação administrativa de teste já existente foi mantida e passou a registrar também `creditos.D.liberadas`, limitada à quantidade adquirida e preservando consumo, auditoria e isolamento.

`aluno/js/domain/creditosRecepcao.js` centraliza a projeção que a Recepção e o Aluno utilizam. Distingue adquiridas, liberadas, reservadas, realizadas e disponíveis. O saldo persistido já é líquido: consultar não o desconta novamente. A capacidade restante é conferida contra o total liberado/adquirido, sem aumentar saldos explícitos menores ou zero. Bloqueio financeiro mantém zero agendável. Registros legados sem quantidade contratada continuam indicando **Não informado**, preservando o saldo autorizado existente sem inventar contratação nem migrar dados.

Na ficha → **Aulas**, a Recepção vê os cinco números, faltas, situação financeira e motivo do bloqueio. No dashboard original, o detalhe informa também quantas aulas foram liberadas e o aviso explica o bloqueio. Não há redesign nem painel paralelo.

A conta da Recepção agora acompanha alterações no mesmo armazenamento: o dashboard aberto atualiza quando outra aba libera os créditos; agendamento manual/automático, aulas, progresso e perfil renovam os dados quando necessário, sem reconstruir a tela durante um modal aberto. Foco e verificação periódica retomam a atualização se ela foi adiada. A agenda administrativa já acompanha os mesmos registros. Isso vale no mesmo navegador/origem; não representa sincronização entre dispositivos.

**Como testar:** cadastro D com quantidade real de teste → ficha → Aulas → confira aluno/CPF e pendências → **Liberar créditos fictícios para teste** → confirme. Com exames/etapas e recursos válidos, o Aluno verá o saldo liberado e os horários reais. Exames não são aprovados pelo atalho. O snapshot continua sendo único: reservar uma aula reduz dez disponíveis para nove, compromete o mesmo ônibus/instrutor para os demais alunos e aparece na Recepção e em Minhas aulas após recarga.

Novo teste `$env:SIPA_TEST_CENARIO='creditos'; node tests/agenda-recepcao.browser.mjs`: **12 verificações aprovadas em duas abas reais**. Cobre cadastro de dez aulas, bloqueio inicial, ficha com valores distintos, liberação autorizada sem afetar outro cadastro, dashboard atualizado sem recarga, quinta-feira em Cobilândia, almoço, confirmação com clique repetido, saldo nove sem desconto duplo, visualização na Recepção, persistência e sábado manhã/tarde no Tartarugão. Os pré-requisitos fictícios de exames e recursos são preparados explicitamente apenas no perfil descartável do teste, nunca nos dados pessoais da aplicação.

Arquivos desta consolidação: novo `aluno/js/domain/creditosRecepcao.js`; `dev/aluno/servicoRecepcao.js`, `dev/aluno/acessoRecepcao.js`, `dev/operador/liberacaoAgendaTeste.js`, `nivel-1-operador/js/dominioOperador.js`, `nivel-1-operador/js/servicoOperador.js`, `nivel-1-operador/js/components/unidadeOperador.js`, `aluno/js/dashboard.js`, `aluno/js/components/preferenciasAluno.js`; novos `tests/creditos-recepcao.test.mjs` e `tests/creditos-d-fluxo.browser.steps.mjs`; `tests/agenda-recepcao.browser.mjs`, `tests/operador-cfc.browser.mjs` e este documento. A regressão do Operador foi executada novamente: 293 verificações aprovadas.

Permanecem pendentes na API: autorização financeira real, contratos/pagamentos, liberação real, identidade, validação de disponibilidade global e transações atômicas. Antes do Bigas, desativar/excluir o atalho e a liberação fictícia, fixtures, login/seletores/exceções de teste, dados simulados e mensagens próprias do laboratório. Não realizar essa limpeza no ambiente atual; nenhuma sincronização Git, commit, push, merge, edição de API/banco ou limpeza de armazenamento foi feita.

</details>
