# SIPA — Progresso das funcionalidades pedidas pelo Adriano

Registro vivo para continuar o trabalho sem refazer o que já está pronto. As fases 1 a 9 do pedido
"SIPA: novas funcionalidades e regras de negócio" foram implementadas antes (7 e 8/11/2026). Este documento
compara o pedido detalhado ("Implementação completa...", 09/11/2026) com o código e registra as lacunas.

Legenda: **OK** = implementado e testado · **Parcial** = existe, falta parte · **Lacuna** = a fazer nesta rodada ·
**Decisão** = depende de regra de negócio.

## Auditoria (09/11/2026)

| Item | Situação | Onde está / o que falta |
|---|---|---|
| 4.1 Filtros da agenda do Master | OK | `painelAdministrativo.js` (`filtrosDependentes`, `consultaAgenda`): unidade, categoria, instrutor, veículo, aluno, período e horário, combináveis. Situação operacional do veículo aparece no detalhe da frota. |
| 4.2 Status dos equipamentos | Parcial | `FrotaAppService`, `frotaVeiculo.js`: Ativo, Reserva, Preventiva (por dias e/ou KM), Reativa com previsão, andamento e contagem regressiva. **Falta:** preventiva programada com data/hora de início e período (bloqueando só a janela) e painel consolidado de manutenções (todos os veículos, prazo vencido). |
| 4.3 Realocação de veículo | OK | `agenda/realocacoes/previa` e `agenda/realocacoes`, por hora ou período, prévia com conflitos, sem aviso ao aluno, auditoria. |
| 4.4 Realocação de instrutor | OK | Mesma função, origem instrutor, destino instrutor e/ou veículo. |
| 5.1 PDF da prova | OK | `alunos/{id}/provas/{t}/agendamento`; aluno baixa em "Meu progresso". |
| 5.2 Listas de marketing | OK | `GET relatorios` tipos `finalizaram`, `prova-agendada`, `reprovados` (período, unidade, categoria); CSV/Excel/PDF. Só Gerência e Master. |
| 5.3 Chat interno da equipe | Parcial | `equipe/chat`. **Falta:** indicador de mensagens não lidas. |
| 5.4 Cancelamento só pela Gerência | Parcial | Cancelamento e substituição exigem Gerência/Master (403 para Recepção). **Falta:** a transferência de unidade de carro ainda deixa a Recepção cancelar aulas; o botão da Recepção se chama só "Solicitar substituição" (o pedido de cancelamento existe, mas não está claro). |
| 5.5 Substituição de aluno | OK | `agendamentos/{id}/substituir` cancela e reagenda numa transação, validando o aluno novo pelas regras normais (liberação, saldo, contrato, conflitos). |
| 5.6 Veículo de prova e capacidade | OK | `DiaProva`, `RecursoBloqueio.ParaProva` (só aquele dia), capacidade manhã/tarde. |
| 5.7 Agendamento automático | OK | Já existia; testes em `AutomaticoFase5Tests.cs`. |
| 6.1 Validação do aluno | Parcial | `validar-cadastro`, pendências para o aluno. **Falta:** mostrar na ficha quem validou e a situação do contrato (vigente/vencido). |
| 6.2 Relatório SIT | OK | `agenda/relatorio-sit`, 2 primeiras aulas do agendamento inicial, "Lançado no SIT" persistido. |
| 6.3 Transferência pela Recepção | OK | Realocação permitida à Recepção (tela Agenda, atualizar). Cancelamento continua da Gerência. |
| 6.4 Falta com ônus | OK | `agendamentos/{id}/falta-com-onus`: retém o crédito, libera o horário, mantém o registro. |
| 6.5 Atestados | OK | Vão para a Gerência; a Recepção só acompanha. |
| 7.1 24h do primeiro agendamento | OK | Validado na API (manual e automático). |
| 7.2 Modalidade de ingresso | OK | CNH Brasil/Social; Cortesia e Permuta só o Master (API recusa). |
| 7.3 Faltoso e reposição por atestado | OK | Aula fica "Faltoso (atestado)"; reposição com registro próprio. |
| 7.4 Chat do aluno em horário comercial | OK | Configurável pela Gerência (padrão seg–sáb 08–18). |
| 7.5 Contratar mais aulas | OK | Pedido único em aberto, aviso à Recepção, "Contato feito". |
| 7.6 LADV | OK | Aba Exames; trava a liberação. |
| 7.7 Contrato 12 meses | Parcial | Data, validade, anexo e bloqueio após o vencimento. **Falta:** situação contratual visível na ficha. |
| 7.8 Avaliação estilo Uber | Parcial | Aula, instrutor e veículo (1–5), tags e comentário; médias para Gerência/Master. **Falta:** notas de conservação do veículo e experiência, e evolução por período. |
| 8.1 Placa no primeiro acesso do dia | OK | Seleção entre as placas que o instrutor pode usar (a API recusa as demais). |
| 8.2–8.4 Checklist e fotos | OK | Itens OK/manutenção, combustível, avarias, observações, até 5 fotos; alerta à Gerência; histórico por veículo e instrutor. |

## Ordem desta rodada

1. Permissões: transferência de unidade sem cancelamento pela Recepção; "Solicitar cancelamento" separado.
2. Ficha do aluno: quem validou e situação do contrato.
3. Chat da equipe: não lidas.
4. Manutenção preventiva programada e painel consolidado de manutenções.
5. Avaliações: conservação, experiência e evolução por período.

## Andamento

### 09/11/2026 — rodada 1

| Etapa | Situação | Arquivos |
|---|---|---|
| 1. Transferência de unidade: Recepção não cancela | Implementado; teste escrito (`Transferir_RecepcaoNaoCancela_403`), **não executado** (bloqueio do Windows, abaixo) | `TransferenciaCarroAppService.cs`, `unidadeOperador.js` (checkbox desabilitado para a Recepção) |
| 1. "Solicitar cancelamento" separado | Implementado; front testado (302/302) | `substituicao.js` (botão próprio, substituição exige aluno; quadro "Solicitações de cancelamento e substituição"), mensagem 403 da API |
| 2. Ficha: quem validou e situação do contrato | Implementado; compila, **não executado** | `ContratoDoAlunoDtos.cs` (`ValidadoPor`), `AlunosEquipeAppService.cs`, `AlunosEquipeExtensions.cs`, `administracaoIntegrada.js`, `unidadeOperador.js` |
| 3. Chat da equipe: não lidas | Implementado; teste escrito, **não executado** | Tabela `LEITURAS_CHAT_EQUIPE` (fora do log), `GET equipe/chat/nao-lidas`, `POST equipe/chat/lidas`, `fase8Equipe.js` |
| 4. Preventiva programada e painel | Implementado; testes escritos, **não executados** | `RECURSOS_BLOQUEIOS.MANUTENCAO_ID`, `POST veiculos/{id}/manutencao/programada`, `.../cancelar`, `GET agenda/manutencoes`, `frotaVeiculo.js` (`cartaoManutencoes`, "Programar preventiva"), `painelAdministrativo.js` |
| 5. Avaliações: conservação, experiência e evolução | Implementado (rodada 2) | `AVALIACOES_AULA.NOTA_CONSERVACAO` e `NOTA_EXPERIENCIA` (nulas nas antigas, obrigatórias nas novas), `GET equipe/avaliacoes?de=&ate=` com `mediaConservacao`, `mediaExperiencia` e `evolucao` (semana até 62 dias, mês acima; até 366 dias), `avaliacaoAula.js`, `fase8Equipe.js` (filtro de período e tabela "Evolução no período") |

Banco local: `sipa_v4_fase10_ajustes.sql` aplicado (tabela nova e coluna nova; nada apagado).

### 09/11/2026 — rodada 2 (Docker)

- Testes e API no Docker (`sipa-api/scripts/sipa-docker.ps1`, `scripts/docker/sipa-container.sh`, seção no README):
  **API 1562/1562 aprovados** (inclui os testes novos das rodadas 1 e 2). Front: **302/302**.
- O teste `Transferir_RecepcaoNaoCancela_403` falhou na 1ª execução por supor a unidade de carro inicial no Centro (ela
  começa nula); a regra (403 para a Recepção) estava certa. Teste corrigido.
- API no container na porta 5080: CORS para 5500 e 5501 conferido, rota protegida devolve 401 sem token, porta 1433
  do SQL Server acessível do container.
- Validação com a sessão Master do usuário (só leituras): login 200 e 30+ chamadas da tela (agendamentos, relatórios,
  auditoria, equipe, chat, não lidas, avaliações, provas, substituições), todas 200, sem erro no log da API.
- Live Server: o front redirecionava para `/login.html` (caminho absoluto) e quebrava quando servido de uma subpasta.
  Os 6 arquivos passaram a usar caminho relativo ao módulo (`aluno/js/entrada.js`, `aluno/js/mensagens.js`,
  `instrutor/js/entrada.js`, `nivel-1-operador/js/operador-cfc.js`, `shared/js/entradaAdministrativa.js`).
  Atalhos locais `SIPA/index.html` e `SIPA/login.html` (fora dos repositórios) levam ao `sipa-web`.

### 09/11/2026 — pedido do usuário: KM fora do cadastro

- O campo "KM (local de aula e prova)" saiu do formulário de cadastro do aluno e do resumo de confirmação
  (`unidadeOperador.js`). A API não exige mais o KM no cadastro: sem ele, grava a unidade principal do aluno
  (`AlunosEquipeAppService.cs`); a regra local do laboratório faz o mesmo (`dominioOperador.js`). O KM continua na
  ficha (bloco Contrato) e em "Editar contrato". Testes: API 1562/1562, front 302/302.

### 09/11/2026 — pedido do usuário: Início da Gerência organizado

- Os cartões das funções novas saíram do Início da Gerência e do Master (`painelAdministrativo.js`) e foram para a
  seção do assunto: **Veículos e recursos** (Manutenções da frota, Alertas de checklist), **Agendas** (Dias de prova),
  **Relatórios** (Avaliações dos alunos) e o item novo **Mensagens** na barra lateral (Chat da equipe, Pedidos de mais
  aulas, Horário do chat com o aluno e, com a permissão, as conversas dos alunos). O item Mensagens mostra o contador
  de mensagens da equipe não lidas. O Início ficou só com os indicadores e as funções rápidas. O painel da Recepção
  não mudou.
- A pedido do usuário, o quadro "Solicitações de cancelamento e substituição" saiu do painel da Gerência e do Master.
  **Pendência:** a Recepção ainda tem "Solicitar cancelamento" e "Solicitar substituição" (e vê as que pediu), mas a
  Gerência não tem mais onde aprovar ou recusar; a API (`agenda/substituicoes`) continua pronta. Decidir: tirar os
  botões da Recepção ou devolver a aprovação à Gerência em outro lugar.

### 09/11/2026 — Chat estilo WhatsApp em todos os logins

Regras definidas pelo usuário: o aluno fala só com a Recepção (que transfere para a Gerência quando precisa); sem
restrição de horário; o instrutor fala só com a Recepção e a Gerência; a equipe (Recepção, Gerência e Master) tem o
grupo da unidade e conversas individuais.

- **API:** tabelas `CONVERSAS_INTERNAS` e `MENSAGENS_INTERNAS`; `UNIDADE_ID` em `MENSAGENS_EQUIPE` e
  `LEITURAS_CHAT_EQUIPE` (grupo por unidade); `ENCAMINHADA_GERENCIA_EM`/`ENCAMINHADA_POR_ID` em `CONVERSAS`.
  Rotas `chat/resumo`, `chat/conversas/{usuarioId}` (+ `/mensagens`, `/leitura`), `chat/grupos/{unidadeId}` (+ `/mensagens`,
  `/leitura`), `motoristas/me/chat/...` e `conversas/{id}/encaminhar` e `/devolver`. O envio do aluno não confere mais
  horário. Testes: `ChatInternoTests` (4) e o de horário reescrito. Script em `sipa_v4_fase10_ajustes.sql`.
- **Front:** `shared/components/chatWhats.js` + `shared/css/chat-whats.css` + `shared/js/chatFontes.js`. Gerência e
  Master: seção Mensagens (chat + pedidos de mais aulas com "Ver todas as solicitações"; o quadro de horário saiu).
  Recepção: Mensagens com o mesmo chat (o chat e os pedidos saíram do Início). Instrutor: item Mensagens no menu. Aluno:
  a aba "Conversa" usa o mesmo visual. Contador de não lidas no menu.
- Ajustes do usuário: o chat ocupa quase a tela toda (`height: calc(100vh - 210px)`); os pedidos de mais aulas viraram a
  categoria **"Pedidos de aulas"** dentro do chat (cada aluno que pediu, com a conversa para informar os valores e o
  botão "Contato feito"); a faixa separada saiu. A Recepção ganhou o item Mensagens (a permissão vem de "consultar").
- Testes: API 1566/1566, front 302/302. Visual conferido numa prévia com dados de exemplo (claro, escuro e celular);
  **falta conferir logado** em cada perfil.

### 09/11/2026 — rodada de ajustes pedidos pelo usuário

- **Checklist (8.2/8.4):** agora é um por instrutor, placa e dia (índice `IX_CHECKLISTS_VEICULO_VEICULO_ID_MOTORISTA_ID_DATA_UNIQUE`,
  script na fase 10). A escolha do veículo do dia é guardada por instrutor (antes um instrutor herdava a do outro no mesmo
  navegador). Diálogo refeito; seletor "Veículo de hoje" no topo; item "Checklist do veículo" no menu do instrutor.
- **Chat:** confirmação de leitura (✓ enviada, ✓✓ azul lida) nas conversas individuais e nas do aluno; Gerência e Master
  conversam direto com o aluno (`chat/alunos/{alunoId}`); o aluno vê a Recepção da unidade e só vê a Gerência depois que
  ela escreve (`alunos/me/chat/...`). Página Mensagens do aluno = só o chat (avisos fora); o número do menu conta o chat.
- **Recepção:** indicador "Lançamento no SIT" no Início (a lançar de ontem) e seção própria na barra lateral.
- **Aluno:** filtros de Minhas aulas ocultos; "Ainda não iniciado" menor; resumo de Minhas aulas com ícones; Meu perfil
  redesenhado; Agendamento automático com botões no lugar das caixinhas e a opção "Qualquer veículo, qualquer instrutor e
  qualquer horário".
- **Meus documentos (aluno):** item novo no menu do aluno. A ficha do aluno (Recepção, Gerência e Master) ganhou "Documentos do
  aluno": anexar (contrato, regras de roupas e calçados, LADV, resultado e agendamento de prova, outro), abrir e remover.
  O documento pode valer para todos os alunos da autoescola. O contrato da matrícula e o PDF do agendamento da prova
  aparecem sozinhos. Tabela nova `ALUNOS_DOCUMENTOS` (95 tabelas) e tipos de documento 5 e 6 (fase10, já aplicada no
  banco local). Rotas `alunos/{id}/documentos` e `alunos/me/documentos`.
- **Foto de perfil (aluno):** clicar na imagem em Meu perfil coloca, troca ou remove a foto (JPG ou PNG, até 5 MB).
  Rotas `alunos/me/foto`.
- **Pedido de mais aulas:** vira uma mensagem automática do aluno no chat com a Recepção ("Olá! Quero contratar mais
  aulas..."). No chat da equipe, pedido e conversa são um item só, com a etiqueta "Novo pedido" e o botão "Contato
  feito". O pop-up "Contratar mais aulas" ganhou dois cartões: Pedir pelo chat e Falar no WhatsApp.
- **Instrutor:** nos dias em que o veículo dele está reservado para a prova, a agenda mostra embaixo os alunos que a
  Recepção registrou. O Histórico ganhou a aba Provas (Dia, Mês, Todos). Rota `motoristas/me/provas`.
- **Master, Auditoria:** abre na aba Veículos, com KM atual e rodado no período, itens com problema no último
  checklist, observações dos instrutores, preventiva vencendo ou vencida, manutenção e histórico por veículo. O registro
  das ações com os alunos fica na aba "Registro de ações".
- **Ajustes:** o filtro de Minhas aulas não volta mais ao trocar de aba; "Lançamento no SIT" é o último item do menu
  da Recepção; o botão de tema não cobre mais o chat do aluno.
- **Checklist do veículo (instrutor):** o campo de KM aceita só números, com o "km" encostado ao lado, e não muda mais
  o valor com a roda do mouse. Ao rolar o pop-up "Veículo de hoje", uma sombra marca o topo e o rodapé em vez de cortar o texto.
- **Checklist do fim do dia (instrutor):** o checklist não abre mais sozinho ao entrar no sistema; o instrutor faz
  pela seção "Checklist do veículo". Cada veículo mostra o início e o fim do dia (feito ou pendente) e ganhou o botão
  "Checklist do fim do dia": KM atual (não pode ser menor que o do início), combustível e se o veículo está com defeito
  (com descrição obrigatória e fotos; o defeito avisa a Gerência). Coluna nova `CHECKLISTS_VEICULO.MOMENTO` (1 início,
  2 fim), itens nulos no fim do dia e índice único por instrutor, placa, dia e momento (fase10, já aplicada no banco
  local; os checklists antigos ficaram como início do dia). As listas da equipe e a Auditoria mostram "fim do dia".
- **Menu "Mensagens":** o mesmo balão de conversa do Instrutor em todos os perfis (Aluno, Recepção, Gerência e Master;
  antes era um envelope no Aluno e o ícone genérico na equipe).
- **Ícones do menu da equipe:** nenhum item usa mais o quadradinho genérico. Início (casa), Agendas e Consulta de agendas
  (calendário), Antecipação de aulas (cronômetro), Lançamento no SIT (documento com seta de envio), Relatórios (gráfico),
  Auditoria (documento com lupa), Unidades (prédio), Permissões (cadeado), Gestão de acessos (chave) e Configurações
  (controles). Os atalhos e indicadores do Início também ganharam calendário e relógio.
- **Ícones iguais em todos os perfis:** a mesma opção tem o mesmo ícone no Aluno, no Instrutor e na equipe (Início casa,
  agenda calendário, Mensagens balão, Meu perfil pessoa, Sair da conta seta). Os itens próprios ganharam os seus: Agendar aula
  (calendário com +), Minhas aulas (volante), Meu progresso (linha subindo), Histórico do instrutor (relógio voltando),
  Checklist do veículo (prancheta com visto), Cadastrar aluno (pessoa com +) e Instrutores (crachá).
- **Meu perfil (aluno):** sem foto, o avatar mostra o boneco padrão (silhueta branca no círculo azul) em vez da inicial;
  a categoria aparece pequena ("Categoria: B"). A foto de perfil agora sempre aparece por cima (o CSS antigo forçava a cor
  do avatar com !important).
- **Pedido de mais aulas no chat:** todo pedido deixa a mensagem do aluno no chat com a Recepção ("Olá! Gostaria de
  contratar mais aulas. Pode me informar as quantidades disponíveis e os valores?"), também quando já havia um pedido
  aberto. Só não repete se a última mensagem da conversa já for esse pedido, sem resposta desde então.
- **Agenda da Recepção, Gerência e Master:** aulas canceladas e recusadas saem da grade (o horário volta a mostrar
  "+ Agendar"); aparecem escolhendo a Situação no filtro. As divisórias de todas as agendas (inclusive a do Instrutor)
  ficaram grafite (um pouco mais claras que o preto), com a grade de cantos arredondados e "Passado", "Intervalo" e feriados como etiquetas
  arredondadas.
- **Início da Recepção:** o cartão "Alunos vinculados" abre a lista de alunos ao clicar (como o do SIT).
- **Chat com o aluno (equipe):** em cima de cada mensagem enviada pela equipe aparece o nome de quem escreveu
  (ex.: "Recepção Centro", "Gerência Centro"), também logo depois de enviar.
- **Grupo geral no chat:** "Geral · <nome da autoescola>", fixo no topo das conversas, com a Recepção, a Gerência e o Master
  de todas as unidades e todos os instrutores com vínculo aprovado. As mensagens são as da equipe sem unidade
  (MENSAGENS_EQUIPE.UNIDADE_ID nulo; sem tabela nova). A equipe usa as rotas `chat/grupos/{id}` com o id da autoescola; o
  instrutor ganhou `motoristas/me/chat/grupos/{autoescolaId}` (ler, enviar e marcar como lido).
- **Lançamento no SIT:** cada aula numa linha-cartão (aluno, 1ª/2ª aula, categoria; dia, instrutor, veículo e unidade),
  com o botão "Marcar como lançado" à direita (verde e com quem/quando depois de lançado), a barra de progresso e os
  filtros Todas, Pendentes e Lançadas. Exemplos no banco local (aulas marcadas pela Recepção Centro em 09/11 e uma em
  07/11, com alunos de teste sem aulas): 1ª e 2ª no mesmo dia (Carla, a 1ª já lançada), 3 no mesmo dia (Daniel: só 2
  aparecem), a cancelada conta como 1ª (Bruno: só a 2ª), 1ª em 07/11 e 2ª em 09/11 (Eduarda), cancelada e remarcada
  (Fabio: só a 2ª), moto (Moto Centro Bruno), aluno de Cobilândia com aula no Centro (aparece) e aluno de Cobilândia com
  aula em Cobilândia (não aparece para a Recepção Centro). Testes novos: cancelada conta na ordem e remarcação não
  aparece; 1ª num dia e 2ª no outro.
- **SIT do ônibus:** o ônibus (categoria D) precisa de pelo menos 10 lançamentos no SIT, então todas as aulas de ônibus
  marcadas no dia aparecem (numeradas entre as não canceladas), com a etiqueta "X de 10 lançadas no SIT" (verde ao chegar
  em 10). A caixinha virou um quadrado arredondado que fica verde com o visto. Exemplos: Ônibus Centro Bruno (4 aulas em
  09/11, 0 de 10) e Ônibus Centro Carla (10 já lançadas, a 11ª em 09/11 com o mínimo atingido).
- **"Tenho interesse" com saldo:** antes só valia para quem tinha uma aula posterior para antecipar (48 horas úteis).
  Agora quem tem saldo na categoria também marca interesse em horário ocupado (carro, moto e ônibus): vira a espera por
  uma aula nova. Na fila da Recepção (Antecipação de aulas) o interessado aparece com "Aula nova (saldo de N aulas)" e,
  na oferta, o aluno marca a aula com 1 crédito. Sem saldo e sem aula para antecipar, o botão continua desabilitado com
  a mensagem "Você não tem saldo de aulas nem aula que possa ser remarcada".
- **Quero adiantar minhas aulas:** botão no topo de Minhas aulas; o clique envia o pedido à Recepção e mostra a
  confirmação; o botão fica "✓ Pedido de antecipação enviado" (verde) enquanto o pedido estiver aberto, também ao voltar à
  tela (GET `alunos/me/pedido-adiantamento`), e volta ao normal com o "Contato feito" da Recepção. Na Antecipação de aulas da equipe,
  o novo cartão "Pedidos para adiantar aulas" mostra o aluno, telefone, unidade, pedido em, próxima aula, agendadas e saldo,
  com "Contato feito". Banco: `PEDIDOS_AULAS.TIPO` (1 mais aulas, 2 adiantar aulas; fase10 aplicada no banco local; o
  chat de "Pedidos de aulas" continua só com os de mais aulas). Rotas `alunos/me/pedido-adiantamento` e
  `antecipacoes/pedidos-adiantamento`.
- **Interesses aguardando vaga:** a Antecipação de aulas mostra também os interesses dos horários que ainda estão
  ocupados (antes só apareciam depois de o horário vagar), com o que acontece quando vagar (antecipa a aula X ou aula
  nova com o saldo). Rota `antecipacoes/interesses-em-espera`.
- **Minhas aulas:** os cartões Aulas agendadas e Unidade ficaram no mesmo azul da Próxima aula (antes verde e roxo).
- **Antecipação de aulas (Recepção) refeita:** no topo, três indicadores com o número de cada frente, que também são
  as abas: Pedidos para adiantar, Horários liberados e Aguardando vaga (visual sóbrio: cinza e o azul do sistema na aba
  aberta; vermelho só no saldo zerado e verde só em 'vaga livre'). A tela abre na primeira
  com algo a fazer. Cada aba traz uma dica de "o que fazer" e um bloco só de filtros (vale para as três). Pedidos em
  cartões (iniciais, telefone, unidade, "Pedido há X", próxima aula, agendadas e saldo em rótulo e valor, WhatsApp e
  "Contato feito");
  horários liberados na tabela com seleção e envio de ofertas (dia da semana e vagas livres no cabeçalho do horário);
  aguardando vaga agrupado por horário desejado, com o que acontece quando vagar. Estados vazios explicativos. Conferido
  em prévia com dados de exemplo (claro, escuro, celular e vazio).
  Contato pelo chat do SIPA no lugar do WhatsApp: o nome do aluno (nas três abas) e o botão "Conversar" dos pedidos
  abrem Mensagens já na conversa do aluno (evento `sipa-conversar-aluno`; `montarChat` ganhou `abrirChave`; sem conversa
  ainda, a primeira mensagem cria).
- **Pente-fino (10/11/2026):** varredura de todas as telas (Aluno, Instrutor, Recepção, Gerência e Master) no computador,
  no celular e no tema escuro, com as contas de teste, mais os fluxos de agendar, cancelar, mensagens, ficha do aluno,
  solicitação de cancelamento e aprovação. Corrigido:
  - Gerência e Master não tinham onde aprovar as solicitações de cancelamento e substituição da Recepção (o Início era
    remontado sem o cartão): o cartão voltou, com o indicador "Solicitações da Recepção" no topo;
  - a tabela dessas solicitações e os indicadores da Auditoria de veículos alargavam a página inteira no celular;
  - menu lateral da equipe não cabia em notebook (1366x768): itens compactos conforme a altura da janela;
  - Meus documentos do aluno fora do tema escuro e sem o botão de tema; botão "Pedido de antecipação enviado" cortado no
    celular e sem o verde no escuro; rótulo do Agendamento, recuo do Início e linha solta em Mensagens;
  - Meu perfil do instrutor mostra os veículos vinculados (antes "Não informado" e "Placa de demonstração");
  - texto de desenvolvimento em Verificações, placa quebrando em Veículos e recursos, unidade como "Vila Velha" nos
    detalhes da aula e no agendar, setas de rolagem no campo do chat e título do Início no primeiro carregamento.
  Resolvido em 11/11/2026 (os pontos que tinham ficado para decidir):
  - "Alterar senha" no Meu perfil do Instrutor, da Recepção, da Gerência e do Master (cartão "Segurança da conta", mesma
    rota `PUT usuarios/me/senha` do aluno; shared/components/alterarSenha.js);
  - checklist recusa KM mais de 2.000 km acima do último registrado da placa (`ChecklistAppService.SaltoMaximoKm`, com
    teste); o 3.000.000 km já gravado na HND3C10 continua no banco;
  - Gerência e Master (com unidade escolhida) listam também o aluno de outra base que faz as aulas de carro na unidade,
    como a Recepção já listava (26 alunos no Centro);
  - aviso "Aula cancelada com sucesso!" depois do cancelamento pelo aluno, dizendo se o crédito voltou ou ficou retido;
  - imagem da página inicial: aula-pratica.jpg (1280x853, 133 KB) no lugar do PNG de 2,2 MB (o PNG continua na pasta);
  - pacote `System.Security.Cryptography.Pkcs` fixado em 10.0.15 (o SqlClient trazia o 9.0.4, com CVE-2026-70162 e
    CVE-2026-84008); o aviso sumiu do build;
  - unidade com o nome completo no histórico da ficha; menu à esquerda na barra do Instrutor no celular.
- Testes: API 1583/1583; front 302/302 (`node tests/executar.mjs`).

### 11 e 12/11/2026 — teste completo do roteiro "Funcionalidades do SIPA" (163 itens)

Todos os itens do PDF foram testados no navegador com as contas de teste (API no Docker, front no servidor estático).
O que deu errado foi corrigido na hora; o resultado item a item ficou no relatório da conversa. Correções principais:

- **Aluno:** a oferta de vaga da antecipação não aparecia em lugar nenhum (desde 09/11 a página Mensagens era só o
  chat) — voltou o bloco "Avisos e ofertas de horário", só quando há aviso; etapa "Análise da recepção" aparecia como
  concluída no atestado (agora "Direto para a gerência"); telefone formatado no perfil; avisos depois do cancelamento
  médico e da senha errada.
- **Login e acesso:** a página `confirmar-email.html` do link "Confirme seu e-mail" não existia (404) e nenhuma conta
  nova da equipe conseguia entrar — criada (`js/confirmarEmail.js`); aviso da senha provisória diz "entra com o e-mail"
  para a equipe.
- **Recepção:** "Enviar mensagem" da ficha não fazia nada (abre a conversa no chat); Histórico da ficha sem exames,
  provas e documentos (API) e com o código da conta no atestado; "Último acesso" sempre "Ainda não entrou" (API);
  "Corrigir registro de prova" só para quem pode; aviso da ficha atualizado depois das ações; "Crédito retido" na aba
  Aulas; realocação deixava de fora a aula do horário "De" (API, com teste); "Movimentação" no histórico da aula;
  instrutor novo sem campo de CNH/credenciamento ficava inativo para sempre (campos no cadastro e na edição; API aceita
  na edição, com teste; situação "Documentos pendentes"); textos dos atestados alinhados à regra da Fase 3 (direto à
  Gerência); "2 vagas livres" quando vagava 1; contadores da Antecipação seguem a busca; telefone com máscara no chat.
- **Gerência:** aluno inativo continuava agendando (API, com teste); "Reprovar atestado" com o texto do aprovar;
  unidade com nome completo em atestados e na consulta de agendas; relatório "Operações excepcionais" dava 400 e deixava
  a tabela anterior (agora vem das exceções, só Master, e a tela limpa antes de consultar); ocupação com vírgula;
  perfil do responsável na auditoria ("Gerência", não o nome interno do papel); opção "Pendente" retirada da situação.
- **Master:** dia fechado numa unidade só não aparecia na agenda da equipe (nova rota `GET api/agenda/excecoes-unidades`
  e a agenda usa a unidade do veículo) e "liberar" o dia dava 409 (remove a exceção); responsável "nome indisponível"
  em todos os relatórios de auditoria; aviso do novo perfil ao alterar o perfil; "CPF inválido" ao excluir conta sem CPF.
- **Padrão visual:** confirm/alert do navegador trocados por diálogo do SIPA (`shared/components/confirmarAcao.js`);
  datas com maiúscula só na primeira letra (não "Terça-Feira, 01 De Dezembro"); contraste do tema escuro corrigido
  em Minhas aulas, agendamento automático, abas, "×" dos diálogos e cartões da agenda.
- Testes: API 1586/1586 (3 novos); front 302/302.
- **Pendências do pedido fechadas (12/11):** filtro "Situação do veículo" (Ativo, Reserva, Manutenção preventiva ou
  reativa; a situação atual) na consulta de agendas e nos relatórios (4.1), e o "Tipo de CNH" (modalidade de ingresso,
  7.2) como filtro na consulta de agendas e nos relatórios e como coluna em Aulas, Atestados, Devoluções e decisões e
  nos 3 de Marketing. `GET api/relatorios` aceita `statusVeiculo` (1 a 4) e `tipoCnh` (1 a 4); valor fora disso dá 400.
  Na consulta, o veículo fora de Ativo aparece com a situação ao lado do nome. Testes: API 1588/1588 (2 novos); front 302/302.
- **Instrutor só com nome, CPF e categoria (12/11, pedido do usuário):** e-mail, telefone, unidade e veículo deixaram
  de ser obrigatórios no cadastro do instrutor. Banco: `sipa_v4_fase11_instrutor_contato.sql` (EMAIL e TELEFONE de
  USUARIOS aceitam nulo e o novo `CK_USUARIOS_CONTATO` deixa só o instrutor sem eles; aluno e equipe continuam com os
  dois) e consolidado v4 atualizado. API: `POST motoristas/pela-autoescola` aceita sem e-mail, telefone e
  `unidadeIds` vazio (o vínculo vale para a autoescola toda; as unidades entram depois pelo `PUT vinculos/{id}/unidades`)
  e os avisos por e-mail são ignorados para quem não tem e-mail. Tela: "Unidade (opcional)" com "Sem unidade fixa",
  e-mail e telefone opcionais, veículo opcional (antes, decisão de 03/11: pelo menos um) e filtro "Sem unidade fixa"
  na lista. Testes: API 1590/1590 (2 novos); front 302/302.
- **Unidade administrativa no Editar instrutor (12/11):** a Gerência e o Master trocam a unidade do instrutor a
  qualquer hora (ou voltam para "Sem unidade fixa"); a Recepção só consulta. `PUT vinculos/{id}/unidades` passou a
  recusar a Recepção (403 "Somente a Gerência e o Master alteram a unidade do instrutor.") e a aceitar a lista vazia; a
  unidade que sai com aula futura continua barrada. Na tela, a troca vai antes do resto da edição. Testes: API
  1590/1590 (EscopoTests.Rota92 refeito); front 302/302.
- **Sem CNH e credenciamento no formulário do instrutor (12/11, pedido do usuário):** os 5 campos e o aviso saíram do
  cadastro e da edição (`cadastroRecurso.js`); o formulário não manda mais documentos e os gravados ficam como estão.
  Front 302/302.
- **CNH e credenciamento deixaram de ser exigidos para dar aula (12/11, pedido do usuário):** a regra 22 saiu da API
  (agendamento, aceite do instrutor, troca de instrutor, realocação, substituição, pares e dias livres e ocupação) e
  `Motorista.DocumentosValidosEm` foi removido; os dados e as flags de vencido ficam só para consulta. Na tela sumiu o
  "Documentos pendentes": o "ativo" do instrutor passa a ser o vínculo disponível (a chave Ativar/Inativar), que também
  aceita o instrutor sem unidade fixa. Testes: API 1585/1585 (7 casos de documento vencido saíram e entraram 2 testes
  de que o vencido não trava); front 302/302.
- **Agenda sem instrutor (12/11):** a "Agenda da Unidade" só lista instrutor ativo com veículo vinculado (e a API só
  marca aula com a unidade da aula no vínculo). Com a lista vazia, a tela agora explica o que falta: unidade em Editar
  instrutor e um veículo com ele como instrutor responsável. Front 302/302.
- **Veículo no Editar instrutor (12/11, pedido do usuário):** campo "Veículo" (não é fixo; troca quando quiser) com
  "Sem veículo" e os veículos das categorias do instrutor ("hoje com Fulano" quando está com outro). Ao salvar, solta os
  outros veículos dele e liga o escolhido pelo `PUT veiculos/{id}/responsavel`, que leva as aulas futuras do veículo e
  agora aceita `motoristaId: null` (veículo sem instrutor; com aula futura no veículo, 409 e nada muda). A agenda do
  instrutor passa a usar o veículo salvo. Testes: API 1587/1587 (2 novos); front 302/302.
- **Veículo sem unidade fixa (12/11, pedido do usuário):** `POST veiculos/pela-autoescola` sem unidade e sem instrutor,
  por quem grava mais de uma unidade (o Master), cria o veículo sem unidade (da autoescola toda; antes dava 400). Na
  lista aparece "Sem unidade fixa"; na agenda, o veículo sem unidade vale em qualquer unidade e só entra o instrutor que
  tem unidade (sem ela a API não dá horário). Os 74 veículos da lista do usuário foram cadastrados assim (18 motos,
  55 carros, 2 deles automáticos, e 1 ônibus), sem instrutor. Testes: API 1587/1587; front 302/302.
- **Editar veículo sem unidade (12/11):** dava "Permissão insuficiente" e o "Instrutor responsável" vinha vazio (a regra
  local recusava a unidade vazia e escondia o instrutor sem unidade). Agora a lista traz os instrutores ativos da
  categoria, inclusive os sem unidade (o Master vê todos), o formulário mostra "Sem unidade fixa" e os filtros da tela
  tratam o instrutor ou veículo sem unidade como da autoescola toda, como a API. Ao ganhar responsável, o veículo da
  autoescola sem unidade continua sem unidade (só o veículo antigo, sem autoescola, herda a do vínculo). Testes: API
  1588/1588 (1 novo); front 302/302.
- **Janela do instrutor e do veículo maior (12/11):** até 960px (antes 700px), o campo "Veículo" na linha inteira e a
  lista com busca (`selectComBusca.js`) aberta dentro de janelas cresce até caber a linha inteira de cada opção (nunca
  menor que o botão nem maior que a tela). Conferido em 1366px e em 375px, sem rolagem lateral. Front 302/302.
- **Veículos em ordem (12/11):** no campo "Veículo" do Editar instrutor, um grupo por categoria (Moto, Carro, Ônibus,
  com a quantidade) e, dentro dele, ordem por modelo e placa; a busca filtra mantendo o grupo. A lista de veículos do
  cadastro novo segue a mesma ordem. O carro automático (o elétrico, que só existe em Cobilândia e no Centro) aparece
  com "(AUTOMÁTICO - ELÉTRICO)" depois da placa. Front 302/302.
- **"Piscada" ao rolar a lista de veículos (12/11):** com a lista aberta, a rolagem que caía na janela (mouse fora da
  lista ou o fim da lista "passando" para a janela) fechava a lista de repente. Agora a lista com busca acompanha o
  botão quando a janela rola (só fecha se o botão sair da área visível) e a rolagem dela não passa para a janela
  (`overscroll-behavior: contain`). Vale para todas as listas com busca. Conferido com rolagem real; front 302/302.
  Segunda causa (12/11, a principal): clicar ou arrastar a barra de rolagem da lista tirava o foco da busca e o
  `focusout` fechava a lista na hora. Agora, com o botão do mouse apertado dentro da lista, a perda de foco não fecha e
  o foco volta para a busca ao soltar (sem `preventDefault` no mousedown, que travava a barra). Conferido com clique no
  trilho, roda do mouse, rolagem da janela e escolha de um veículo; front 302/302.
- **Agenda do instrutor travando e sem horário (12/11):** cada célula da semana levava ~390 ms (~33 s por semana),
  quase tudo em `resolverInstrutorCarro`, que comparava a unidade de todos os instrutores para cada um dos 55 carros.
  Agora o filtro barato (quem tem o carro) vem antes da unidade e `paresNaUnidade` filtra a categoria antes: a semana
  inteira sai em ~45 ms e a troca de semana em ~60 ms. Sem horário: `motivoCatalogoOnibus` exigia um único instrutor
  com a categoria D, e os 57 têm D; agora vale o instrutor ligado ao ônibus (como na API, que só limita a um ônibus).
  Conferido com o JOSE ROBERTO CAVASSA (Cobilândia, ônibus PPH6I28): 50 a 60 horários "+ Agendar" por semana, e o
  "Agendar aula" abre com o veículo e o local. Testes do front: 3 ajustados para a regra nova; 302/302.
- **Base zerada (12/11):** a base de testes foi limpa a pedido do usuário (backup antes); ficaram autoescola, unidades,
  locais, grade, papéis e um único Master. Os 57 instrutores da lista do usuário foram cadastrados sem unidade, com as
  categorias A, B e D.

- **Equipe sem telefone (13/11, pedido do usuário):** o funcionário pode ser cadastrado sem telefone (o login dele é
  o e-mail, que continua obrigatório). API: `Usuario.TelefoneOpcional` (instrutor e equipe), `EquipeAppService` só
  valida o telefone informado (cadastro, edição e /me), e o `CK_USUARIOS_CONTATO` passa a ser "e-mail nulo só no
  instrutor; telefone nulo no instrutor e na equipe" (aluno continua com os dois). Script novo e idempotente
  `sipa_v4_fase12_equipe_telefone.sql`, já no `atualizar-banco-v4.ps1` e no consolidado. Na tela, "Telefone com DDD
  (opcional)" no Criar/Editar acesso. Testes: API 1589/1589 (1 novo).
- **Conta com várias unidades (13/11):** quem não é Master e tem mais de uma unidade (ex.: Gerência de duas unidades,
  Recepção de quatro, central de agendamento das seis) ganha um seletor "Unidade de atendimento" no topo da Recepção e
  da Gerência; a troca recarrega o painel na unidade escolhida (guardada na sessão; começa na primeira da conta). A API
  já liberava todas as unidades do membro; a tela usava só a primeira. Na Gestão de acessos, a coluna "Unidade" mostra
  todas ("Todas (6 unidades)" ou os nomes curtos), o filtro por unidade acha a conta por qualquer uma delas, e editar a
  conta sem trocar a unidade mantém todas (antes ficava só a primeira); o formulário avisa quantas unidades a conta tem.
  Corrigido no mesmo dia: na Gerência o seletor aparecia duas vezes (o painel movia o select para fora da caixa com busca);
  agora ele fica onde foi montado.
- **Papel "Central de agendamento" (13/11):** papel da autoescola (painel Recepção, ADM 1, escopo "unidades do
  membro"), criado pela API como Master: Agenda completa (ler, agendar, frequência e cancelamento), Antecipações (ler e
  liberar) e leitura de Alunos, Contratações, Pacotes, Instrutores, Unidades, Grade e Dados da autoescola. Sem cadastro
  ou edição de alunos e instrutores, relatórios, equipe, auditoria, atestados ou correções; a API barra pelas mesmas
  telas. Com as seis unidades vinculadas, a pessoa agenda em qualquer unidade trocando no seletor do topo.
- **Relatório e Início do Master com veículo sem unidade (13/11):** desde 12/11 os veículos podem ficar sem unidade, e
  a conta de ocupação (no Início do Master e no relatório de veículos) consultava a agenda "na unidade do veículo", o
  que dava "Permissão insuficiente para esta operação". Agora vale a unidade do veículo ou, sem ela, a do instrutor
  ligado a ele; sem nenhuma, o veículo fica fora da conta. Testes do front: 304/304 (2 novos).
- **Equipe da KM cadastrada (13/11, base local):** 21 contas da equipe criadas pela API (`POST /api/equipe`) com os
  papéis e as unidades pedidos (10 Recepção, 5 Gerência com o papel "Gerenciador", 3 central de agendamento, 2 Recepção
  de quatro unidades e 1 Master). Senha inicial provisória definida pelo usuário, com troca obrigatória no primeiro
  login e validade de 30 dias; e-mails confirmados pela administração (o envio de e-mail está desligado). Backup do
  banco antes da mudança fora dos repositórios. Nenhum dado pessoal ou senha neste arquivo.

- **Ativar ou desativar instrutor num clique, só o Master (13/11, pedido do usuário):** na lista de instrutores, a
  chave da coluna Ações muda a situação na hora, sem janela de justificativa, e avisa "<nome> ativado/desativado"
  (com aula futura, a API recusa a desativação e a chave volta). Na ficha do instrutor, o "Gerenciar situação" virou o
  botão direto "Ativar/Desativar instrutor". Só o Master vê a chave e o botão; a API também barra (403) quem não é do
  painel Master, no PUT do motorista (`ativo`) e no da operação do vínculo (`disponivel`), só quando a situação muda
  de fato (o Editar instrutor da Gerência continua salvando o resto). O modo de demonstração local, sem API, ficou como
  estava. Testes: API 1590/1590 (1 novo); front 305/305 (1 novo). Conferido na tela: desativar e reativar sem janela.

- **Senha com no mínimo 4 caracteres para todos (13/11, pedido do usuário):** equipe e instrutor precisavam de 8 a 100
  caracteres com letras e números; agora todos (equipe, instrutor e aluno) usam de 4 a 100 caracteres de qualquer tipo
  (letras, números ou símbolos). Continua: diferente do CPF e do e-mail, diferente da senha atual, e só espaços não vale.
  API: `RegrasDeSenha` (uma regra só) e a mensagem "A senha deve ter de 4 a 100 caracteres." Tela: textos de ajuda
  do "Alterar senha", da confirmação de e-mail e da troca da senha provisória no login. Testes: API 1593/1593; front
  305/305. Conferido na tela: com 3 caracteres o botão fica bloqueado; com 4, libera.

- **Meu perfil editável do Master (13/11, pedido do usuário):** no "Meu perfil", o Master troca a foto de
  identificação (clique na foto: JPG ou PNG até 5 MB; com foto, trocar ou remover) e, em "Editar perfil", o nome, o
  e-mail de acesso, o telefone e o CPF de acesso. Trocar o e-mail ou o CPF pede a senha atual; para o Master o e-mail
  muda na hora (o envio de e-mail está desligado), e quem não é Master continua trocando o e-mail pela confirmação e
  não troca o próprio CPF (403). A foto aparece no perfil e no selo da barra lateral. API: `PUT equipe/me` com `cpf`
  (null não muda; vazio tira), `GET equipe/me` com `cpf` e `temFoto`, e as rotas novas `GET/POST
  equipe/me/foto` e `POST equipe/me/foto/remover` (cada um mexe só na própria foto). Sem tabela nova: a foto é um
  DOCUMENTOS "Foto de perfil" da pasta `fotos-equipe/`, criado pela própria pessoa. Testes: API 1596/1596 (3 novos e a
  matriz de rotas com as 3 rotas); front 306/306 (1 novo). Conferido na tela: foto colocada e removida, salvar o
  perfil e a recusa de trocar o e-mail sem a senha.

- **Auditoria virou Controle de veículos (13/11, pedido do usuário):** a seção da Gerência e do Master que já abria no
  acompanhamento dos veículos (quilometragem, observações, desgaste e manutenção) agora se chama "Controle de veículos" no
  menu, no título e no caminho, com a descrição da página e um ícone de painel de quilometragem. O "Registro de ações"
  continua como segunda aba. O id interno da seção (`auditoria`) e as permissões não mudaram. Front 306/306.

- **Ativar ou desativar veículo num clique, só o Master (13/11, pedido do usuário):** a lista de veículos ganhou a mesma
  chave dos instrutores na coluna Ações: muda na hora, sem justificativa, e avisa "<placa> ativado/desativado" (com aula
  futura, a API recusa e a chave volta). Só o Master vê a chave; a API barra (403) quem não é do painel Master no
  `PUT veiculos/{id}/pela-autoescola` quando a situação muda de fato (desativar = bloqueio sem data final, como antes).
  O Editar veículo não mexe na situação. Testes: API 1597/1597 (1 novo); front 307/307 (1 novo). Conferido na tela:
  desativar e reativar sem janela.

- **Editar veículo com unidade e câmbio liberados (13/11, pedido do usuário):** no Editar veículo (carro), a "Unidade
  administrativa" passou a ser editável pela Gerência e pelo Master (vazia = sem unidade fixa), e o câmbio troca a
  qualquer hora (a API recusa só se o veículo tiver aula futura). Ligado a uma unidade, o veículo passa a aparecer para a
  Gerência e a Recepção dela (e some das outras); sem unidade, vale para a autoescola toda. A categoria continua
  travada: no banco ela faz parte da chave do veículo (as aulas e os pares com instrutor apontam para "este veículo nesta
  categoria"); para outra categoria, cadastra-se outro veículo. API: `PUT veiculos/{id}/pela-autoescola` com
  `unidadeId` ou `semUnidade` (403 para a Recepção). Agenda do aluno: ele escolhe só o instrutor; o veículo é o do
  instrutor no horário, escolhido sozinho, e os textos não pedem mais veículo. Testes: API 1599/1599 (rodados no Docker:
  o Windows bloqueou a DLL de testes); front 307/307. Conferido na tela: ligar o carro a Cobilândia e voltar.

- **Troca obrigatória de senha só do aluno (13/11, pedido do usuário):** o "Crie sua senha" do login (senha provisória)
  vale só para o aluno. Equipe e instrutor entram direto com a senha que receberam, mesmo vencida; no primeiro login ela
  passa a ser a senha da pessoa (some o "troca pendente") e a troca fica em "Meu perfil" > Alterar senha (a equipe e o
  instrutor já tinham). Conta que também é de aluno continua com a troca pendente. O aviso da senha gerada pelo servidor
  diz isso para equipe e instrutor. Testes: API 1602/1602 (3 novos, rodados no Docker); front 307/307.

- **Janela "Agendar aula" organizada (13/11, pedido do usuário):** a janela da Recepção, Gerência e Master ganhou um
  resumo do horário no topo (dia da semana, data, horário, instrutor, local e categoria), dois passos numerados
  ("1. Veículo da aula" ou "Instrutor e veículo" e "2. Aluno"), busca com lupa, alunos em cartões e os créditos do aluno
  escolhido em destaque (disponíveis, reservadas, categoria e, no carro, câmbio e local). Sem aluno para escolher, só o
  aviso da lista aparece. Nada mudou nas regras nem nos campos (`reservaRecepcao.js` e `unidade.css`). Conferida na
  tela nos temas claro e escuro; front 307/307.
  Ajuste no mesmo dia (pedido do usuário, "muito colorido"): o resumo saiu do azul forte para o fundo claro do painel com
  bordas finas; os números dos passos e os créditos ficaram neutros (só a borda esquerda dos créditos tem cor).

- **Seção Provas no menu (13/11, pedido do usuário):** os "Dias de prova" saíram do fim da Agenda e viraram a seção
  "Provas" do menu, logo depois de "Agendas", na Recepção, na Gerência e no Master. Dois blocos: "Marcar dia de prova"
  (data, limite de alunos de manhã e de tarde e o veículo reservado, agora com a placa e agrupado por moto, carro e
  ônibus) e "Próximos dias de prova" (dia da semana, ocupação de cada período, veículo com "Liberar" e "Editar", que
  traz o dia de volta para o formulário). Os avisos viraram janelas do SIPA (antes, alert do navegador). API: a Recepção
  também marca o dia e reserva ou libera o veículo (antes, só Gerência e Master; a rota continua exigindo "Agenda:
  atualizar"). Testes: API 1602/1602 (o teste da Recepção virou "configura"); front 307/307. Conferido na tela (Master).

- **Prova só de manhã, aulas a partir das 13:00 (13/11, pedido do usuário):** nos dias de prova, a prova prática é só pela
  manhã, até 11:00, e as aulas voltam às 13:00. O veículo reservado para a prova fica fora da agenda só até 13:00 desse
  dia (antes, o dia inteiro); a API recusa a prova prática à tarde e o limite da tarde deixou de existir; o aviso de
  "aulas no dia" conta só as de antes das 13:00. Na tela: a seção Provas tem só o limite da manhã e o veículo "(até
  13:00)"; na ficha, o período da prova é "Manhã (até 11:00)"; e a agenda já mostra o veículo da prova ocupado até as
  13:00 (antes ela só descobria ao tentar agendar). Testes: API 1602/1602 (testes da prova ajustados para a manhã e o
  bloqueio até 13:00); front 308/308 (1 novo).

- **Instrutor da prova (13/11, pedido do usuário):** no dia de prova, escolhem-se o instrutor e o veículo que vão para a
  prova; os dois ficam sem horário na agenda até 13:00 desse dia e voltam ao normal a partir das 13:00. Escolhido um, o
  outro vem junto se estiver vazio (o veículo do instrutor ou o instrutor do veículo). A lista dos próximos dias mostra o
  instrutor e o veículo de cada dia, com as aulas deles antes das 13:00 a remanejar e "Liberar"; o "Editar" não reserva
  de novo o que já está reservado. API: `POST agenda/provas/{data}/instrutores` e `DELETE
  agenda/provas/{data}/instrutores/{motoristaId}` (Agenda: atualizar), e o GET dos dias traz os instrutores. A agenda
  da tela já mostra os dois ocupados até 13:00. Testes: API 1603/1603 (1 novo); front 308/308.

- **Filtros e ordem da lista de veículos (13/11, pedido do usuário):** a lista de "Veículos e recursos" ganhou a busca
  por placa ou modelo (a placa sem traço e sem diferença de maiúsculas: "rba-1c90" acha RBA1C90), o filtro de categoria
  (A, B, D), o de câmbio, a opção "Sem unidade fixa" no filtro de unidade e o "Limpar filtros". A lista sai em ordem de
  categoria (A, depois B, depois D) e, dentro dela, por modelo e placa. Os títulos das colunas continuam ordenando ao
  clicar. Conferido na tela; front 308/308.
  Corrigido no mesmo dia: com uma unidade escolhida no topo, o ônibus (ligado a Cobilândia) sumia da lista. Moto e ônibus
  são operação compartilhada (como na API e na agenda): os de outra unidade aparecem na lista para consulta; editar
  continua só para a unidade dona.

- **Nova marca AgIA (16/11, pedido do usuário):** onde aparecia "SIPA" para as pessoas agora aparece "AgIA" e o
  subtítulo virou "Gestão Inteligente de Agenda"; a logo "S" deu lugar à marca da AgIA (o "A" com a estrada e o check,
  em SVG: `assets/images/agia-marca.svg`; a imagem enviada pelo usuário está em `assets/images/agia-logo.jpg`). Vale para
  títulos das páginas, logos, rodapés, mensagens, PDF e Excel (arquivos "AgIA_Relatorio_...") e os textos e e-mails da
  API. Os nomes internos não mudaram (classes sipa-*, chaves sipa.*, banco SIPA, usuário técnico "Sistema SIPA", pasta
  de arquivos). Para voltar ao SIPA: `node restaurar.mjs` na pasta SIPA-backups/2026-11-16-antes-agia. Testes: API
  1603/1603; front 308/308.
  Ajuste no mesmo dia: algumas telas (a página inicial) herdavam da logo antiga um contorno de 10px que engrossava a
  marca; as formas cheias ganharam stroke="none" e o nome e o subtítulo da página inicial seguem o login (todas iguais).

- **Duas aulas de moto ao mesmo tempo (16/11, pedido do usuário):** o instrutor de moto tem duas motos e agora dá aula
  para dois alunos no mesmo horário, um em cada moto (antes, a aula numa moto deixava a outra como "Instrutor ocupado em
  outra aula"). Na moto, o instrutor só fica ocupado com aula de outra categoria no horário ou com as duas motos em aula;
  no carro e no ônibus nada muda, e cada moto continua com uma aula por horário. API: a regra fica em
  `OcupacaoDoInstrutorHelper` e vale nos pares livres, na agenda dos pares, no agendamento com instrutor escolhido, na
  troca de instrutor, na troca do responsável pelo veículo e na realocação. Banco: o índice único do instrutor no horário
  (`IX_AGENDAMENTOS_MOTORISTA_DATA_HORA_UNIQUE`) deixa a moto de fora (`AND [CATEGORIA_ID] <> 1`); o do veículo não muda.
  Script novo `sipa_v4_moto_duas_aulas.sql` (idempotente, não apaga nada), já no `atualizar-banco-v4.ps1`, no consolidado
  v4 e aplicado na base local. Tela: o conflito (`shared/js/disponibilidade.js`) segue a mesma regra e conta cada moto
  uma vez (a mesma aula vinha repetida nas aulas e nas ocupações); o seletor da agenda mostra a placa de cada moto.
  Conferido na agenda do Ronaldo (SGA0H99 livre nos horários em que o SGA0H96 tem aula, e o Agendar oferece a moto).
  Testes: API 1615/1615 (12 novos em `MotoDuasAulasTests`); front 308/308 (2 testes ajustados para a regra nova e 1 caso
  novo de aula repetida).

- **Base local com alunos fictícios (16/11, pedido do usuário):** só dados, nenhum código. 25 alunos "Aluno Fictício
  <Unidade> <Um..Cinco>" (5 em Vila Velha, 4 em cada outra unidade), cada um com 20 aulas de moto, carro e ônibus e 15 de
  cada agendadas; instrutores e veículos da escala do usuário ativos, com a escala de sábado feita por bloqueios por data
  até 16/01/2027. Os logins ficam fora dos repositórios (LOGINS-ALUNOS-FICTICIOS.txt, na pasta Projetos). Depois da
  regra das duas motos, as 375 aulas de moto foram canceladas pelo cancelamento excepcional do Master (crédito devolvido)
  e remarcadas nos horários mais cedo, agora usando as duas motos de cada instrutor: vão de 16/11 a 26/11 (antes, até
  05/12). Conferido no banco: nenhum instrutor, moto ou aluno com duas aulas no mesmo horário fora da regra.

- **Saldo do aluno casado na linha (16/11, pedido do usuário):** no Início do aluno, com moto, carro e ônibus, o cartão
  do Ônibus descia sozinho para a segunda linha (a grade era fixa em 2 colunas). Agora a grade segue quantos cartões
  estão visíveis (`data-cartoes`, posto pelo `aluno/js/dashboard.js`): na tela larga, 3 categorias em 3 colunas e, embaixo,
  "Sua próxima aula prática" na largura de dois cartões e "Acesso rápido" na de um (as bordas batem); na tela média, o
  terceiro cartão ocupa a linha inteira; no celular, um embaixo do outro. Conferido a 1370, 820 e 375 px; front 308/308.

- **Senha dos instrutores ativos (16/11, pedido do usuário):** só dados. Os 17 instrutores ativos (a escala do usuário)
  ficaram com a senha 123456, como a equipe, já definitiva (sem troca obrigatória e sem vencimento); o login é o CPF. O
  sistema não tem rota para escolher a senha do instrutor (o "Redefinir acesso" gera uma aleatória), então o hash foi
  gravado direto no banco, sem registro no histórico (o usuário aceitou). A lista fica fora dos repositórios
  (LOGINS-EQUIPE-E-INSTRUTORES.txt, na pasta Projetos, junto com os logins por e-mail das 21 contas da equipe, todas
  ainda com a senha 123456 do cadastro). Os 40 instrutores desativados não mudaram.

- **Tela do instrutor: logo, chat e agenda da moto (16/11, pedido do usuário):**
  - Logo: a marca AgIA do menu do instrutor (`instrutor/js/painel.js`) ficou com o tamanho de desenho da logo antiga
    (`viewBox="0 0 64 70"`) e saía cortada (sem a perna azul, a curva e o check). Agora `0 0 100 100`, como as outras telas.
  - Chat: a atualização da tela a cada 15 s (e ao voltar para a janela) redesenhava a seção aberta; em Mensagens isso
    fechava a conversa e apagava o que o instrutor estava escrevendo. Em Mensagens a tela não redesenha mais (o chat já
    se atualiza sozinho a cada 8 s, só as mensagens). Conferido com a conversa aberta e texto digitado.
  - Minha agenda: com uma moto em "Veículo de hoje", a agenda é a dessa moto (uma aula por horário, em vez de "2
    registros neste horário"); as aulas de moto da outra moto ficam fora, com o aviso de quantas são; carro e ônibus
    continuam. Trocar o veículo redesenha a agenda. A escolha do veículo passou a guardar a categoria.
  - O quadro "Aula realizada / Aluno faltou" da direita só aparece depois de clicar no nome do aluno na agenda (a aula
    clicada fica marcada); antes ele mostrava sozinho a próxima aula. Registrada a aula, o quadro mostra a situação.
  - Conferido na tela com dados de teste (sem entrar em conta real); front 308/308.

- **Central de agendamento não abria o painel (16/11, pedido do usuário):** a conta da Central (papel "Central de
  agendamento", sem a tela Atestados) entrava e caía em "Acesso ainda não habilitado — Seu papel não tem acesso a esta
  ação". Na abertura, o painel lê a lista de atestados (`solicitacoes-medicas`, exige Atestados: ler); o 403 dessa leitura
  derrubava o painel inteiro. Agora, sem a permissão, os atestados vêm vazios e o resto abre. O mesmo vale para a ficha
  do aluno: exames e provas (exigem Acompanhamento) vêm vazios em vez de impedir a ficha. Achado pelo log da API e pela
  auditoria (sem entrar na conta). As permissões do papel não mudaram. Front 309/309 (1 teste novo).
  O usuário decidiu manter as permissões da Central como estão. Em seguida, pedido do usuário: sem a permissão de
  atestados ("verificar"), a seção **Verificações** sai do menu da Recepção (`unidadeOperador.js`); a Recepção comum
  continua com ela.

- **Agendar aula, lista de alunos (16/11, pedido do usuário):** os itens se sobrepunham (a linha do CPF vazava por cima
  do aluno seguinte). Causa: o botão herdava a altura mínima do botão comum (`.op-button`, 45 px) e, na grade com altura
  máxima, cada item era espremido para essa altura. Agora o item tem classe própria (`op-reserva-aluno`), a lista é uma
  coluna em que cada aluno tem a altura do próprio conteúdo, com as iniciais num círculo, o nome e duas linhas curtas
  (CPF, categoria e câmbio; unidade do cadastro e local da aula). O selecionado fica azul, com um visto
  (`reservaRecepcao.js`, `unidade.css`). A linha do CPF continua começando por "CPF: " (teste de navegador).
- **Menu e tela de Provas (16/11, pedido do usuário):** na Recepção, "Provas" aparecia no topo do menu; a reordenação do
  menu não a incluía. Agora fica logo abaixo de "Agendas". A tela ficou mais limpa: o subtítulo e o texto do cartão não
  repetem mais a mesma explicação, as regras do dia viraram duas etiquetas ("Prova só de manhã, até 11:00" e "Instrutor e
  veículo fora da agenda até 13:00"), os rótulos cabem numa linha e os quatro campos têm a mesma altura (44 px), e o
  estado vazio ganhou ícone. O título da seção não mostra mais o contorno azul do foco (`diasProva.js`,
  `painelAdministrativo.js`, `operador-paineis.css`). Conferido na tela com o Master de testes; front 309/309.
- **Lançamento no SIT: buscar pela data e calendário de pendências (16/11, pedido do usuário):** ao lado de "Agendadas
  em" há "Buscar" (Enter também busca) e "Dias com pendência", com a quantidade de dias que ainda têm aula para lançar
  nos últimos 62. O botão abre um calendário do mês (com setas para os meses anteriores): dia laranja com o número de
  aulas pendentes, dia verde com ✓ quando tudo foi lançado; o clique no dia busca aquele dia. Lançar ou desfazer
  atualiza o calendário. API: nova rota `GET api/agenda/relatorio-sit/dias?de=&ate=` (Agenda: ler; padrão os últimos 62
  dias até hoje; no máximo 62 dias por vez) com o total, as lançadas e as pendentes de cada dia, pelas mesmas regras do
  relatório (o cálculo saiu para `ItensAsync`, usado pelos dois). 1 teste novo da API e a matriz de rotas (274); API
  1616/1616. Conferido com a API no Docker: hoje tem 426 aulas pendentes (as dos alunos fictícios).
- **Minhas aulas do aluno: filtro por categoria (16/11, pedido do usuário):** abaixo das abas, os botões "Todas", "Moto",
  "Carro" e "Ônibus", cada um com a contagem da aba aberta, mostram só as aulas daquela categoria (com a paginação).
  Aparecem só para quem tem mais de uma categoria; usam o filtro de categoria do formulário que está escondido desde
  09/11 (`filtrosAulas.js`, `minhas-aulas.css`). Conferido na tela com aulas de exemplo, sem entrar na conta de aluno.
- **"Sem base elegível" virou texto claro (16/11, pedido do usuário):** no cartão "Ocupação hoje" (unidade sem nenhum
  horário de veículo disponível no dia, ex.: Novo Milênio) aparece "Sem horários disponíveis hoje"; nos relatórios e no
  Excel, "Sem horários disponíveis no período" (e "Sem horários disponíveis" na linha do veículo). Front 309/309.
- **"Quero adiantar minhas aulas" com dias e horários (16/11, pedido do usuário):** o clique abre a pergunta "Quando
  você pode fazer aula?": dias (seg a sáb) e horários (07:00 a 18:00, manhã e tarde, com "Todos"); só envia com pelo
  menos um de cada. Com o pedido enviado, o botão mostra o que foi informado e "Alterar dias e horários". A dica de
  "Tenho interesse" saiu da confirmação. Na Antecipação de aulas da equipe, cada pedido mostra os dias (marcados) e os
  horários. API: `PEDIDOS_AULAS` ganhou `DIAS_SEMANA` e `HORARIOS` (script `sipa_v4_adiantar_disponibilidade.sql`,
  idempotente, só acrescenta colunas; aplicado na base local); `POST alunos/me/pedido-adiantamento` aceita
  `{diasDaSemana, horarios}` (com o pedido aberto, atualiza) e valida dia 1–6 e hora cheia de 07 a 18. 1 teste novo;
  API 1617/1617.
- **Agendar aula do aluno (16/11, pedido do usuário):** as categorias ficam lado a lado (Ônibus na mesma linha) e mais
  baixas; a lista de horários mostra todos os horários do dia (07–18; sábado 07–11): os livres como antes e os demais
  riscados, mais escuros, "Ocupado", sem o "Tenho interesse" (`painelAluno.js`, `agendamento.css`).
- **Mensagens do aluno só com o chat (16/11, pedido do usuário):** os "Avisos e ofertas de horário" saíram da página
  Mensagens e viraram a aba "Avisos e ofertas" de Minhas aulas (mesmo componente: lidas/recebidas e aceitar oferta).
- **Página inicial (16/11, pedido do usuário):** o slogan "Tecnologia que organiza o hoje e acelera o amanhã" no topo
  (com o traço azul da marca) e no rodapé, e a faixa "Organiza o hoje / Acelera o amanhã / Seu caminho, nossa direção".
  Em telas largas (ou zoom de 80%) o cartão ocupa até 1880 px e o texto cresce junto. Conferido a 2370 px.
- As telas do aluno acima foram checadas por sintaxe e pelos testes (front 309/309), sem entrar em conta de aluno.
- **Cartão "Ocupação hoje" (16/11, pedido do usuário):** valor em texto ("Sem horários disponíveis hoje") em letra
  menor (`adm-stat-texto`, `administracao.css`); os números continuam grandes.
- **Categoria do aluno (16/11, bug apontado pelo usuário):** quem tinha moto, carro e ônibus aparecia como "AB" (a
  função que monta a categoria juntava A e B e descartava o D). O adaptador agora manda também `categorias` (todas, das
  categorias da matrícula e dos saldos contratados); a lista mostra "ABD", o filtro "D" acha quem tem ônibus, a ficha
  mostra todas e as aulas extras oferecem as três. O campo antigo `categoria` (A, B, D, AB) ficou como estava, para a
  edição de categoria.
- **Instrutores só com carro e moto (16/11, pedido do usuário):** "tirando o José Roberto, todos os outros instrutores
  somente carro e moto". 56 instrutores passaram de A, B e D para A e B pela rota da API (`PUT
  motoristas/{id}/pela-autoescola`, com justificativa e auditoria), como o Master de testes. Antes, conferido que só o
  José Roberto tinha aula de ônibus (376). Agora ele é o único com D.
- **Lista "Selecione o instrutor" da agenda (16/11, pedido do usuário):** por unidade e, dentro dela, por categoria
  ("Unidade Cobilândia · Carro", "· Ônibus"...; ordem Moto, Carro, Ônibus), cada grupo por nome e placa.
- **Local das aulas em cada dia da agenda (16/11, pedido do usuário):** no cabeçalho de cada dia (semana) e no topo
  (modo dia), "Aulas em: …" pelas regras: moto no Centro de Vila Velha; ônibus na KM Cobilândia (sábado no local do
  sábado); carro na unidade do instrutor, com os deslocamentos (Santa Rita→Itaparica na segunda, Terra
  Vermelha→Vila Velha na terça, Cobilândia→Vila Velha na quinta; Novo Milênio sempre em Vila Velha), o dia de
  deslocamento em destaque laranja. Dias fechados (domingo, feriado) sem o local. Conferido na agenda de um instrutor
  de carro de Cobilândia (quinta: Centro de Vila Velha).
- **"Dia sem aula" na agenda do Master e da Gerência (16/11, pedido do usuário):** ao lado de "Consultar todas as
  agendas", o botão abre: unidade (o Master escolhe entre todas; a Gerência, entre as dela), data, motivo (Sem
  expediente, Reunião ou treinamento da equipe, Feriado municipal, Manutenção ou reforma, Evento externo, Outro) e um
  detalhe opcional; embaixo, os dias já fechados da unidade com "Reabrir". O dia fica fechado na agenda com "Sem aula ·
  motivo" e ninguém agenda (usa a exceção de calendário por unidade que já existia). Com aula marcada no dia, a API
  recusa ("remaneje antes"). API: `POST/DELETE unidades/{id}/excecoes` passaram de Unidades:atualizar para
  Agenda:atualizar, e o serviço só aceita a Gerência nas unidades em que grava ou o Master (a Recepção recebe 403). 1
  teste novo; API 1618/1618. Conferido na tela: fechado 20/01/2027 na Santa Rita, a agenda mostrou o motivo, a
  recusa num dia com aula apareceu e o dia de teste foi reaberto (fica só o registro excluído do teste).
- **Troca de unidade no topo do Master (16/11, bug apontado pelo usuário):** ao trocar, a página recarregava
  ("Validando acesso...") e a unidade não mudava. Causa: a escolha ia para a chave de sessão da conta
  (`sipa.admin.unidade.<conta>`), mas na abertura o painel lia a primeira chave desse tipo de qualquer conta; com a de
  outra conta usada antes no mesmo navegador (ex.: uma Gerência da Novo Milênio), ela vencia sempre. Agora a escolha
  fica em `sipa.admin.unidade.atual` e o seletor apaga as chaves antigas (`guardarUnidadeEscolhida`, em
  `permissoesAdministrativas.js`; vale também para a conta com várias unidades). Conferido na tela com uma chave antiga
  plantada: a troca para Cobilândia valeu e a chave antiga sumiu. Front 309/309.
- **Agenda mais limpa (16/11, pedido do usuário):** o "Aulas em" do dia só aparece quando o local é diferente do normal
  (o de uma quarta-feira da mesma semana): os deslocamentos e o sábado do ônibus; o local normal fica uma vez no
  "Agenda de: … · aulas em …". Na semana, o texto de horário fechado aparece só na primeira célula de cada sequência
  ("Domingo · sem expediente" uma vez, "Intervalo" uma vez); o cartão da aula ficou só com o nome e a bolinha da
  situação (a hora já está na linha), fundo suave sem contorno e cor pela situação (confirmada azul, aguardando
  laranja, realizada verde, falta vermelha, cancelada cinza). Conferido na agenda do José Roberto.
- **Agenda: horários fechados em bloco (16/11, 2ª rodada, pedido do usuário):** com o texto repetido tirado, as
  células vazias pareciam faltar coisa. Agora os horários fechados seguidos (Intervalo, Passado, Fora do expediente,
  feriado, domingo) formam um bloco só, com fundo hachurado cinza, sem linha entre as horas e o rótulo num selo no topo.
  As linhas entre as horas ficaram claras (`#e3eaf1`) também na Gerência e no Master, onde `agendas.css` pintava tudo
  de grafite (a borda de fora e as divisórias entre os dias continuam). Conferido na agenda da Flavia (Terra Vermelha).
- **Agenda: visual desfeito (16/11, pedido do usuário):** o usuário pediu para voltar como estava; saíram o cartão
  enxuto, o texto fechado sem repetição, os blocos hachurados e as linhas claras (JS e CSS). Fica só o "Aulas em" no dia
  diferente do normal.
- **Almoço de 2 horas (16/11, pedido do usuário):** sem almoço configurado, o bloqueio passou de 11, 12 e 13 para 11 e
  12 (11:00 às 13:00), na API (`AlmocoHelper`) e na tela (`motivoAlmoco`); o Raphael (11:00 às 12:00) passou a 11:00
  às 13:00 pela rota do vínculo. Agora: 54 no padrão 11–13 e 3 configurados 11–13. API 1618/1618, front 309/309.
- **Aula de reposição por atestado nas agendas (17/11, pedido do usuário):** já existia na API: a Gerência aprova o
  atestado com devolução, nasce a `ReposicaoAtestado`, e a próxima aula agendada da categoria (pelo aluno ou pela
  Recepção) vira a reposição; a aula do atestado fica no histórico como "Faltoso (atestado)". Agora: o DTO da aula ganhou
  `Reposicao` (a aula de origem e o horário), preenchido em `GET agendamentos` (aluno e equipe) e na agenda do
  instrutor (`AgendaDoMotoristaAppService`, que passou a receber o `AppDbContext`); se a aula de reposição for
  cancelada, a reposição volta a valer para a próxima aula agendada. Telas: selo roxo "Reposição" no cartão da agenda
  (Recepção, Gerência, Master) e no detalhe ("Repõe a aula de dd/mm/aaaa às hh:mm, abonada por atestado"); na agenda do
  instrutor, o selo e o "Tipo: Reposição por atestado"; no Agendar aula da Recepção, o chip "Reposição por atestado: N"
  e o aviso de que esta aula ficará como reposição; no agendamento do aluno, o aviso de quantas reposições ele tem. 1
  teste novo da API (1619/1619); front 309/309. Mostrado ao usuário numa prévia com dados de exemplo.
- **Selo do local do dia na agenda (17/11, pedido do usuário):** o "Aulas em: …" laranja virou um selo azul-claro com
  ícone de local e só o nome ("Centro de Vila Velha"); o texto completo ("Aulas neste dia em …, deslocamento do dia")
  fica na dica e no leitor de tela. Em coluna estreita o nome quebra em duas linhas. Conferido na agenda da Flavia.
- **Agenda da semana: períodos fechados num bloco só (17/11, pedido do usuário):** feriado, domingo, dia fechado sem aula
  e o sábado depois do expediente não repetem mais a mensagem em cada hora. As horas seguidas viram um bloco liso, um
  pouco mais escuro (`#e3e9ef`), ocupando as linhas da grade (subgrid), com ícone e uma mensagem só: "Consciência Negra /
  Domingo · Sem expediente · não é possível agendar" ou "Fora do expediente · Expediente encerrado às 12:00 · não é
  possível agendar" (`unirFechados` em `agendaOperador.js`). "Passado", "Intervalo" e as aulas ficam como estavam.
  Conferido na agenda da Flavia.
- **Agenda da semana: aula cheia e almoço em bloco (17/11, pedido do usuário):** a aula agendada ocupa a célula inteira
  (sem margem nem cantos arredondados, faixa de 4px à esquerda pela situação); o almoço do instrutor aparece como
  "Horário de almoço" (antes "Intervalo"). Na 2ª rodada (o usuário não gostou do almoço junto num bloco), cada hora de
  almoço fica na própria célula, toda cinza (`#e5e7eb`), com ícone de talheres e "Horário de almoço" centralizado
  (`op-slot-almoco-cheio`). Conferido na agenda da Flavia.
- **"Dia sem aula" em todas as unidades (17/11, pedido do usuário):** com mais de uma unidade, a lista de unidades ganhou
  "Todas as unidades" (Master) ou "Todas as minhas unidades" (Gerência). O dia é fechado em cada unidade (a mesma
  exceção por unidade); a que já tem aula marcada no dia (ou já estava fechada) fica de fora e aparece no aviso com o
  motivo. Com "Todas", a lista de dias fechados mostra o nome da unidade, e "Reabrir" reabre só aquela unidade. A lista
  saiu do laranja para um tom neutro. Conferido: 27/01/2027 fechado nas 6 unidades e reaberto em seguida (ficam só os
  registros excluídos do teste).
- **Fechar o dia ou reservar para a prova cancela as aulas e avisa o aluno (17/11, pedido do usuário):** novo
  `CancelamentoPelaAutoescolaHelper` (API): as aulas abertas (confirmada ou aguardando aceite) são canceladas com o mesmo
  pedido do cancelamento excepcional, com o crédito forçado como devolvido (situação 2, não 7), e cada aluno recebe na
  conversa com a unidade (a da base dele) a mensagem, remetente "Diretoria": "Mensagem da diretoria", "Bom dia / Boa
  tarde / Boa noite, Nome!" pela hora de Brasília, as aulas canceladas (dia da semana, data, horário, categoria), o
  motivo, o crédito devolvido e como remarcar. Usado em: (1) `POST unidades/{id}/excecoes` com `cancelarAulas: true`
  (o "Dia sem aula" manda marcado por padrão; aula já realizada no dia continua impedindo; retorna `aulasCanceladas`); as
  travas das conversas vão junto com a dos locais (ordem fixa); (2) a reserva do instrutor ou do veículo da prova
  cancela as aulas deles antes das 13:00 (`ProvasAgendaAppService`, `DiaProvaReadDto.AulasCanceladas`). A lista de
  conversas da equipe ganhou `ComMensagemDaDiretoria`: a Gerência e o Master passam a ver essas conversas (etiqueta
  "Diretoria"), a Recepção já via. Telas: a opção "Cancelar as aulas já marcadas…" no Dia sem aula e o resumo "N aulas
  canceladas… os alunos receberam a mensagem da diretoria"; na Provas, a etiqueta "Aulas deles na manhã são canceladas
  e o aluno avisado" e o resumo ao salvar. 2 testes novos da API (1621/1621); front 309/309. Teste real: Cobilândia em
  04/01/2027 (2 aulas de ônibus de 2 alunos fictícios) cancelada, mensagens conferidas no banco e no chat do Master; o
  dia foi reaberto, as 2 aulas ficaram canceladas com o crédito devolvido.
- **Confirmação do dia desmarcado (17/11, pedido do usuário):** ao fechar o dia (o usuário fechou 21/11 em todas as
  unidades, e Santa Rita e Novo Milênio já estavam fechadas, o que aparecia como erro em vermelho), a janela mostra uma
  confirmação verde: "Dia dd/mm/aaaa desmarcado", as unidades que ficaram sem aula, quantas aulas foram canceladas (ou
  "Não havia aula marcada nesse dia") e "Já estava sem aula: …". A unidade já fechada nesse dia é pulada (não é mais
  erro); o vermelho fica só para o que não pôde ser fechado. Conferido em 27/01/2027 (fechado e reaberto).
- **Uma mensagem só por aluno e "- CANCELADA" (17/11, pedido do usuário):** com "Todas as unidades" a tela fechava uma
  unidade por vez e o aluno com aulas em duas unidades no dia recebia duas mensagens. Agora há a rota `POST
  unidades/excecoes/lote` (Agenda: atualizar; Gerência nas unidades dela, Master em todas), que fecha as unidades numa
  operação só, devolve o resultado por unidade (fechada, ja-fechada, recusada) e cancela as aulas juntas: cada aluno
  recebe uma mensagem com todas as aulas canceladas do dia. Cada linha termina com "- CANCELADA"; o motivo cita a unidade
  (ou "as unidades X e Y") das aulas do aluno (`PorqueDiaSemAula`). A tela usa a rota para o "Dia sem aula". 1 teste novo
  (API 1622/1622; matriz 275 rotas); front 309/309.
- **Dia sem aula com período (de/até) e uma mensagem só por aluno (17/11, pedido do usuário):** o "Dia sem aula" ganhou
  "De" e "Até (opcional, para vários dias seguidos)"; sem o "Até" é um dia só. A rota em lote aceita `ate` (até 62 dias;
  o domingo do meio do período fica de fora), fecha cada unidade em cada dia (resultado por unidade e data) e cancela as
  aulas do período juntas: o aluno com aulas em vários dias recebe uma mensagem só, com todas as aulas ("- CANCELADA") e
  o motivo "não terá aulas nesses dias". A confirmação verde mostra o período, as unidades, os dias e as aulas canceladas;
  o botão vira "Fechar os dias". 1 teste novo (API 1623/1623); front 309/309. Conferido na tela: 25 a 28/01/2027 em todas
  as unidades (24 fechamentos, depois reabertos; o recesso e o 21/11 do usuário intactos).
- **Recesso de fim de ano registrado (17/11, pedido do usuário — DADO REAL, não é teste):** "A Auto Escola estará fechada"
  em 24, 25, 26/12/2026, 31/12/2026, 01 e 02/01/2027: as 6 unidades fechadas em cada data (36 exceções, justificativa
  "Sem expediente: recesso de fim de ano (a Auto Escola estará fechada)"), pela rota em lote; 40 aulas de alunos
  fictícios nesses dias canceladas com o crédito devolvido e mensagem da diretoria (2 por aluno, uma por dia). Registrado
  na memória do assistente como dado real a preservar numa limpeza de testes (junto com os instrutores, a equipe, o Master
  do usuário e os dias que ele mesmo fechou, como 21/11).
- **Botões da agenda em azul sólido (17/11, pedido do usuário):** "Consultar todas as agendas" e "Dia sem aula" (agenda
  da Gerência e do Master) passaram de contorno para azul `#1769aa` com texto branco (`adm-agenda-acao`, em
  `administracao.css`). Conferido na tela.
- **Chat sem arrastar a página (17/11, pedido do usuário):** ao chegar no fim (ou no começo) da conversa, a rolagem do
  mouse parava ali e descia a página inteira. `overscroll-behavior: contain` na lista de mensagens e na lista de
  conversas (`chat-whats.css`) e na lista de conversas do aluno (`mensagens.css`): a rolagem fica presa no chat.
- **Toda a equipe responde o aluno, com nome e cargo (17/11, pedido do usuário):** a conversa aberta pela "Mensagem da
  diretoria" (ou transferida) ficava "Somente leitura" para quem não gravava na unidade-base do aluno. Agora quem vê a
  conversa responde: Recepção, Gerência, Diretoria (Master), Central de agendamento e o que vier (equipe de vendas). Na
  API, `POST conversas/{id}/mensagens` e `POST alunos/{id}/conversa/mensagens` pedem Alunos **ler** (antes, atualizar),
  e responder pede a base do aluno no escopo de **leitura**. Marcar como lida continua de quem atende a unidade (quem só
  lê responde, mas não esvazia a caixa de não lidas da Recepção). Cada mensagem grava o cargo de quem escreveu:
  "Diretoria" (Master; antes "Administração"), "Gerência" (painel da Gerência, inclui o Administrador operacional),
  "Recepção" (Operador de CFC e interunidades) e o nome do papel nos demais ("Central de agendamento"). No chat da equipe
  cada balão mostra "Nome · Cargo" (`autorComCargo` em `chatFontes.js`); o aluno continua vendo só o cargo. 3 testes da
  API reescritos para a regra nova (API 1623/1623); front 309/309 (2 testes ajustados). Conferido na tela: "JOELMA
  CARDOZO · Gerência", "INGRID KUSTER VANDELINO · Recepção" e "Master de Testes (Claude) · Diretoria", campo de envio
  liberado.
- **Aulas canceladas do aluno em cartão baixo, com quem cancelou e o motivo (17/11, pedido do usuário):** na aba "Aulas
  canceladas" de Minhas aulas, o cartão da cancelada perdeu o bloco do local (a aula não acontece) e o quadro dos dados
  (categoria, unidade, instrutor e veículo viram uma linha corrida), e ganhou uma faixa com "Cancelamento feito pelo
  aluno / pela Recepção / pela Gerência / pela Diretoria (Master) / pelo sistema" e o motivo. O motivo é o da lista
  ("Imprevisto familiar", "Manutenção emergencial"…); no "Outro motivo" (dia sem aula, remarcação) aparece o texto
  informado ("Sem expediente: recesso…"). A origem vem do `cancelamento.origem` da API (`quemCancelou` e
  `motivoDoCancelamento` em `painelAluno.js`; estilo em `minhas-aulas.css` e o escuro em `tema-aluno.css`). No
  computador o cartão caiu de mais de 200px para 137px; no celular o "Detalhes e histórico" mantém a área de toque de
  44px. 2 testes novos (front 311/311). Conferido com aulas canceladas reais de um aluno fictício (e cópias com as
  outras origens) desenhadas na página, no computador, no celular e no tema escuro.
- **Abas de Minhas aulas: "Histórico" só com presença e falta, atestados em "Atestados médicos" (17/11, pedido do
  usuário):** a aula de hoje 07:00 (já passou, ninguém registrou presença) aparecia como "Confirmada", com o "Cancelar
  aula" apagado, na aba "Histórico e outros estados", que misturava tudo. Agora (`separarAulasDoAluno` em
  `painelAluno.js`): "Aulas confirmadas" só com as que vão acontecer (e a reserva aguardando aceite); a aba virou
  **"Histórico"**, SÓ com presença e falta (as realizadas, as faltas e a confirmada que passou sem registro, com o selo
  neutro "Em andamento" ou "Aguardando registro de presença" e sem o botão de cancelar, `situacaoDaConfirmada`);
  "Aulas canceladas" ganha a recusada e a reserva que expirou sem aceite; e as aulas com atestado (cancelada ou falta)
  passam para a aba **"Atestados médicos"**, numa lista "Aulas com atestado" abaixo dos pedidos, para o aluno
  acompanhar. "Aulas realizadas" continua (as realizadas também estão no Histórico). O resumo do topo continua só com as
  futuras confirmadas. 2 testes novos (front 313/313). Conferido com as 60 aulas reais do Aluno Fictício Terra Vermelha
  Um: a de 07:00 no Histórico, "Aguardando registro de presença", sem botão; e, com uma cópia de exemplo com atestado,
  a aula aparecendo em "Atestados médicos" com o "Acompanhar atestado".
- **Checklist do instrutor: o erro do envio aparece (17/11, bug relatado pelo usuário):** "Enviar checklist" parecia não
  fazer nada. A API recusava (33 envios em ~1 h, placa SGA0H80): "O KM informado (52.000 km) está mais de 2.000 km acima
  do último registrado desta placa (5.800 km)…", regra contra erro de digitação (`SaltoMaximoKm` no
  `ChecklistAppService`). A mensagem ia para o fim da área que rola, fora da vista. Agora o erro fica fixo logo acima dos
  botões, em vermelho, nos checklists do início e do fim do dia; se é do KM, o campo fica vermelho e recebe o foco, e a
  marca some ao corrigir o número (`mostrarErro` em `instrutor/js/checklist.js`; estilo em `instrutor.css`). Se o KM
  alto estiver certo, a Recepção atualiza o "KM atual" da placa em Veículos → Configurar preventiva. Front 313/313.
  Conferido com o checklist isolado e a mesma recusa (sem enviar nada à API).
- **Checklist: o instrutor confirma o KM alto (17/11, pedido do usuário):** a recusa do KM mais de 2.000 km acima do
  último da placa agora leva o código `km-acima-do-ultimo` (novo `Codigo` na `ValidacaoExcecao`, saindo em "codigo" no
  corpo do erro). No aviso aparece "Sim, o KM está certo", que reenvia com `confirmarKm`; a API aceita, sobe o KM da
  placa e anota no fim das observações "KM confirmado pelo instrutor: X km, Y km acima do último registrado da placa"
  (a Gerência vê; o texto do instrutor é cortado se a nota não couber em 1000). Vale no início e no fim do dia. 1 teste
  novo na API (1624/1624, publicada); front 313/313. Conferido com o checklist isolado (recusa, confirmar, envio).
- **Agenda do instrutor (17/11, pedido do usuário):** (1) sem o veículo de hoje escolhido, a agenda não mostra aulas,
  só o aviso "Escolha o veículo de hoje" com o botão (para quem tem veículo vinculado); (2) os "3 registros neste
  horário" do Raphael (duas motos) eram uma aula cancelada no mesmo horário, com a vaga remarcada: só as aulas ativas
  ocupam o horário agora (`agruparFaixas`); (3) como na agenda da Recepção, a aula preenche a célula inteira (faixa de
  4px pela situação: azul confirmada, verde realizada, vermelha falta, roxa reposição) e cada hora de almoço é a célula
  toda cinza com talheres e "Horário de almoço". Front 313/313. Conferido com as aulas reais do Raphael de hoje num
  painel montado com serviço falso (sem login de instrutor): sem veículo, o aviso; com a SGA0H91, uma aula por horário.
- **Cabeçalho do dia da agenda do instrutor e almoço em preto (17/11, pedido do usuário):** o cabeçalho deixou de ser
  três linhas de texto corrido: o dia da semana em azul e maiúsculas, a data em destaque e selos ("9 aulas" em azul,
  "Expediente 07:00 às 18:50" e "Moto SGA0H91" com ícone); o aviso da outra moto fica numa linha própria e "Horário de
  Brasília" foi para a dica do cabeçalho. "Horário de almoço" (texto, talheres e hora) passou de cinza para preto.
  Conferido no mesmo painel de teste. 2ª rodada: os três selos no mesmo padrão (contorno azul-claro, cantos de 8px) e
  sem o ícone da moto; o horário vago passou de "Livre" para "Sem aluno nesse horário".
- **Agenda do instrutor: cor da presença e da falta, e seleção que sai (17/11, pedido do usuário):** a aula realizada
  ganhou fundo verde-claro (`#e6f4ea`) e a falta vermelho-claro (`#fbe9e7`), além da faixa. Clicar fora da aula (fora
  do quadro da direita e das janelas) tira a seleção do horário e volta o quadro da direita ao normal. Front 313/313;
  conferido no painel de teste (selecionar 15h, clicar fora: a marca some).
- **Minhas aulas: "Aulas realizadas e faltas" no lugar do "Histórico" (17/11, pedido do usuário):** a aba "Histórico"
  saiu; "Aulas realizadas" virou "Aulas realizadas e faltas (n)", com as presenças, as faltas e a aula que passou sem
  registro. A presença aparece como "Presente" (selo e faixa verdes) e a falta como "Falta" (selo e faixa vermelhos),
  com o aviso "Falta registrada · Esta aula foi descontada do seu saldo e não é devolvida.". Na API a falta já consome
  a aula para sempre (`StatusAgendamentoRegras.ConsomeSaldo`, coberto por `SaldoAulasRulesTests`); nada mudou lá.
  Front 313/313. Conferido com as aulas do Aluno Fictício Terra Vermelha Um (e uma cópia de exemplo como falta).
- **Agenda do instrutor: dias anteriores (17/11, pedido do usuário):** a aula de 16/11 18:00 ficou "Aguardando
  registro de presença" e o instrutor só via o dia de hoje. A agenda ganhou "‹ Dia anterior", o campo de data (máximo
  hoje), "Próximo dia ›" (desativado em hoje) e "Hoje": dá para abrir qualquer dia passado, nunca um futuro (a API já
  recusava dia futuro em `motoristas/me/agenda?data=`). No dia anterior aparecem as aulas das duas motos (o veículo de
  hoje não vale para o passado), não há o destaque do horário atual e o cabeçalho avisa "Dia anterior: registre aqui a
  presença ou a falta que ficou pendente". Marcar presença ou falta numa aula passada já era aceito pela API (só pede
  que a aula tenha começado). `agendaHoje(data)` no serviço do instrutor; front 313/313. Conferido no painel de teste
  com as aulas reais do Raphael (hoje → 16/11: 17h e 18h com as duas motos).
- **Minhas aulas: todos os cartões baixos (17/11, pedido do usuário, 2ª vez):** o cartão compacto da cancelada passou a
  valer para todas as abas (confirmadas, realizadas e faltas, atestados): dados numa linha corrida, o local numa linha
  pequena, "Detalhes e histórico" e "Cancelar aula" (botão menor) na mesma linha, sem a borda do rodapé. No computador
  (1440px) o cartão de aula confirmada caiu de mais de 240px para 131px; no toque os alvos ficam com 36px. Front
  313/313; conferido com as aulas do Aluno Fictício Terra Vermelha Um.
- **Agenda do instrutor: a moto escolhida vale no dia anterior (17/11, pedido do usuário):** no dia anterior a agenda
  mostrava as duas motos ("2 registros neste horário") mesmo com a moto escolhida. Agora o filtro da moto vale em
  qualquer dia: um aluno por horário, o selo "Moto …" e o aviso de quantas aulas a outra moto tem (para ver, troca em
  Veículo de hoje). Front 313/313. Não conferido na tela (o navegador ficou indisponível nesta rodada).
- **Avaliar a aula pelo cartão (17/11, pedido do usuário):** a janela "Como foi sua aula?" abria sozinha no painel do
  aluno e sem formatação. Agora não abre mais sozinha: a aula realizada ainda sem avaliação ganha o botão "Avaliar minha
  aula" no cartão (Minhas aulas → Aulas realizadas e faltas); depois de enviada, o cartão mostra "✓ Aula avaliada". A
  janela foi refeita com estilo próprio (`aluno/css/avaliacao.css`, carregado junto): centralizada, cinco estrelas
  amarelas clicáveis por item, tags em chips, comentário, "Avaliar depois" e "Enviar avaliação", aviso se faltar nota,
  tela de "Obrigado!" e tema escuro. Front 313/313. Conferido com as aulas do Aluno Fictício Terra Vermelha Um e um
  serviço de teste (nada foi enviado à API). 2ª rodada: o botão ficou um pouco maior (36px, texto 13,5px) e sempre azul
  sólido (`#1769aa`, mais escuro ao passar o mouse). 3ª rodada: a confirmação final virou um painel próprio, sem o
  cabeçalho repetido: ✓ verde num círculo, "Avaliação enviada!", a aula avaliada, a média das estrelas dadas (ex.:
  ★★★★★ 4,8), o agradecimento e "Fechar" largo. Conferido na tela com serviço de teste.
- **Avaliações do instrutor no perfil (17/11, pedido do usuário):** como nos aplicativos de transporte, o perfil do
  instrutor ganhou "Minhas avaliações": a média das estrelas que os alunos deram a ele (uma casa, ex.: 4,7, com as
  estrelas preenchidas na proporção), "N avaliações recebidas", "N aulas realizadas" e "% das aulas avaliadas", as
  barras de 5 a 1 estrela, as médias da aula em geral e do veículo, as tags mais citadas e os 5 últimos comentários
  (anônimos). Sem avaliações, o cartão diz que elas aparecem conforme os alunos avaliam. API: nova rota
  `GET motoristas/me/avaliacoes` (`GetMinhasAvaliacoesAsync` no `Fase8AppService`, só do próprio instrutor), coberta
  no teste de avaliação (API 1624/1624, publicada). Front: `instrutor/js/avaliacoesInstrutor.js`; 313/313. Conferido no
  painel de teste com avaliações de exemplo (o Raphael tem 1 avaliação real até agora, nota 5 para o instrutor).
  2ª rodada: o mesmo painel entrou no Início do instrutor, em "Meu desempenho", no lugar do gráfico "Aulas por semana"
  (os indicadores de presença, aulas realizadas e aguardando registro continuam). Tudo anônimo, sem o nome do aluno.
  Front 313/313; conferido no painel de teste.
- **Avaliações dos instrutores para a Gerência e o Master (17/11, pedido do usuário):** a lista de instrutores ganhou a
  coluna "Avaliação" com a nota atual ("★ 5,0 · 1" ou "Sem avaliação"), e os "Detalhes do instrutor" ganharam o quadro
  "Avaliações dos alunos" logo abaixo das informações: média em estrelas, avaliações, aulas realizadas, % avaliadas,
  barras de 5 a 1, médias da aula e do veículo, tags e os 3 últimos comentários (anônimos). Só Gerência e Master (a
  Recepção não vê). API: `GET equipe/avaliacoes/instrutores` (a média de todas as notas de cada instrutor) e
  `GET equipe/avaliacoes/instrutores/{id}` (o mesmo quadro do painel do instrutor), as duas com Instrutores L e só para
  os painéis de Gerência e Master; API 1624/1624, publicada. Front: `shared/components/avaliacoesInstrutorEquipe.js`;
  313/313. Conferido como Master: Raphael "★ 5,0 · 1" na lista e o quadro na ficha.
- **Meu perfil da equipe proporcional (17/11, pedido do usuário):** "Unidades que você acessa" esticava vazio ao lado de
  "Dados do acesso" e "Segurança da conta" ficava sozinho embaixo. Agora "Dados do acesso" fica à esquerda (ocupando as
  duas linhas) e, à direita, "Unidades" em cima e "Segurança da conta" embaixo, com as duas colunas terminando juntas
  (`adm-perfil-colunas` em `administracao.css`; no celular, uma coluna só). Vale para Recepção, Gerência e Master.
  Conferido como Master em 1600px.
- **Meu progresso do aluno mais limpo (17/11, pedido do usuário):** cada categoria tinha dois cartões (números e
  "Seu avanço nas aulas de …") com números de 24px azuis e "Ainda não iniciado" grande. Agora é um cartão só por
  categoria (os três lado a lado em tela larga): título menor, os quatro números em 2×2 com 19px escuros, e embaixo
  "Seu avanço" com um selo pequeno ("Ainda não iniciado" ou "5%"), "1 de 20 aulas concluídas" e a barra fina
  (`painelAluno.js` e `meu-progresso.css`; tema escuro incluído). Front 313/313; conferido com os números da tela do
  usuário.
- **Cartão do atestado mais baixo (17/11, pedido do usuário):** em "Atestados médicos" do aluno, o cartão do pedido ficou
  no padrão dos outros: local, instrutor, enviado em e última atualização numa linha corrida; documento, observação e
  crédito em texto menor; e as 4 etapas ("1. Atestado enviado · Concluída" …) numa faixa só no rodapé. Caiu de cerca
  de 250px para 188px em 1600px. Só CSS (`minhas-aulas.css`); conferido com um atestado de exemplo igual ao da tela.
- **Aula com atestado sem o vermelho de "erro" (17/11, pedido do usuário):** a aula com atestado mostrava a faixa
  vermelha "Cancelamento feito pelo aluno · Motivos de saúde" e o selo "Faltoso (atestado)", que pareciam erro. Agora a
  faixa segue o resultado: verde "Atestado aprovado · A aula foi abonada e voltou para o seu saldo.", azul "Atestado em
  análise · …" e vermelha só no "Atestado recusado · A aula conta como falta…"; o selo diz "Aula abonada", "Atestado em
  análise" ou "Falta (atestado recusado)". Front 313/313; conferido com um atestado aprovado.
- **Atestado de mais dias: a Gerência abona as aulas do afastamento (17/11, pedido do usuário):** na janela "Solicitação
  médica" da Gerência (antes de aprovar) entrou "Aulas abonadas pelo atestado": a aula do atestado já incluída, os
  campos "Início do afastamento" e "Dias de afastamento" e a tabela das aulas marcadas do aluno (carro, moto, ônibus;
  Data, Hora, Veículo, Cat., Instrutor; filtro por categoria) nos 30 dias depois da aula do atestado. As aulas do
  período são marcadas sozinhas (dá para desmarcar ou marcar outra) e o resumo diz "N aulas serão devolvidas ao aluno
  se aprovar". Ao aprovar, as marcadas são canceladas por "Motivos de saúde" com a aula devolvida ao saldo (some da
  agenda do instrutor e da recepção e o aluno reagenda). API: `DecidirAtestadoDto.AulasDoPeriodo` e
  `GET solicitacoes-medicas/{id}/aulas-do-periodo?ate=` (Decisão de atestados L; até 30 dias; aula fora do afastamento
  é recusada); 1 teste novo (API 1625/1625, publicada). Front: `shared/components/afastamentoAtestado.js`. Conferido
  com aulas de exemplo (4 dias → 3 aulas marcadas, "4 aulas serão devolvidas"); a aprovação real não foi feita.
- **Atestado do aluno num cartão só (17/11, pedido do usuário):** em "Atestados médicos" do aluno, o cartão do pedido e
  a lista "Aulas com atestado" repetiam as informações. Agora é um cartão só: "Aula de 18/11/2026, 07:00 às 07:50 ·
  Carro (B)" com o selo, instrutor/veículo/local, a faixa do resultado (verde aprovado, azul em análise, vermelha
  recusado), as etapas do acompanhamento e, no rodapé, "Enviado em … · Documento" com "Visualizar documento" e a
  observação do aluno. Front 313/313; conferido com um atestado aprovado. 2ª rodada: mais respiro entre as partes
  (12px entre os blocos, margem de 16/20px, faixa e etapas com mais folga).
- **"Informações importantes" em Meus documentos, com PDF (17/11, pedido do usuário):** todo aluno (desde a criação
  da conta pela Recepção) vê no topo de Meus documentos o bloco "Informações importantes", que abre e fecha. Dentro:
  "Onde são as suas aulas" pela unidade e pelas categorias do aluno — carro na KM da unidade, com os dias em outra KM
  (`DESLOCAMENTOS_CARRO`: Santa Rita → segunda na KM de Itaparica; Terra Vermelha → terça no Centro; Cobilândia →
  quinta no Centro; Novo Milênio sempre no Centro), moto na KM Centro e ônibus de segunda a sexta na KM Cobilândia e
  sábado na Arena Tartarugão — com endereços (Santa Rita e Itaparica com o texto e os pontos de referência que o
  usuário passou); e as regras da autoescola: calçado e documentos (sapatilha proibida, identidade e LADV), faltas
  (48 horas úteis, cobrança na reposição, tabela vigente, chuva, 10 minutos sem tolerância), antecipação (as últimas
  aulas), crianças (responsável maior de idade) e, como extra, o uso do aplicativo (cancelar com 48 h úteis, atestado,
  mensagens). "Baixar em PDF" abre a página no visual do AgIA (nome do aluno, unidade, data) e o navegador salva em
  PDF. Front: `aluno/js/components/informacoesImportantes.js` e `aluno/css/informacoes.css`; 2 testes novos (front
  315/315). Conferido com um aluno de Santa Rita com moto, carro e ônibus e a prévia do PDF. 2ª rodada: sem documentos,
  a página mostra só as Informações importantes (saiu o aviso "Nenhum documento por aqui ainda").
- **Horário da prova (17/11, pedido do usuário):** na aba Provas da ficha, "Período da prova" (Manhã/Tarde) virou
  "Horário da prova", um campo para digitar a hora (06:00 a 20:00, de 5 em 5 minutos), e a prova agendada mostra "dia às
  hora". API: coluna nova `PROVAS_TENTATIVAS.HORARIO` (time) pelo script `sipa_v4_prova_horario.sql` (registrado no
  `atualizar-banco-v4.ps1`, aplicado no banco local, sem apagar nada), `Horario` nos DTOs de criar/movimentar/ler e no
  acompanhamento do aluno; o período sai do horário (antes das 12:00, manhã) para a capacidade do dia de prova; no
  mesmo dia, sem informar, o horário fica. 1 teste novo (API 1626/1626, publicada); front 315/315.
- **Aba Cadastro da ficha organizada (17/11, pedido do usuário):** o "Validado em … por …" era um selo que invadia a
  coluna ao lado: virou texto verde com ✓ que quebra linha ("por …" embaixo); a contratação, um texto corrido enorme,
  virou etiquetas por pacote ("Ônibus (D) · 20 aulas", "Carro (B) · 20 aulas", "Moto (A) · 20 aulas"); os avisos
  soltos da pista de moto e do ônibus entraram na Matrícula como "Local das aulas"; e os campos ficaram com espaçamento
  uniforme. Conferido como Master na ficha do Aluno Fictício Novo Milênio Dois.
- **"Enviar arquivo para o aluno" (17/11, pedido do usuário):** botão azul ao lado das abas da ficha (em todas as abas,
  para quem pode anotar). A janela pede o que é o arquivo, em opções rápidas: agendamento da prova teórica e das provas
  práticas só das categorias do aluno (carro B, moto A, ônibus D: o arquivo que o SIT emite), resultado de prova, LADV,
  contrato ou outro (com título); o arquivo (PDF, JPG, PNG); e a mensagem pronta e editável (ex.: "ÓTIMA NOTÍCIA! Sua
  prova prática de carro (B) foi agendada! Abra o arquivo do agendamento para ver a data, o horário e o local… O
  arquivo já está no app, em Meus documentos."). Ao enviar, o arquivo entra em "Meus documentos" do aluno com o tipo
  e o título certos e a mensagem vai para a conversa dele. `nivel-1-operador/js/components/enviarArquivoAluno.js`;
  1 teste novo (front 316/316). Conferido como Master (janela e mensagem; nenhum arquivo foi enviado).
- **Aba "Avisos e ofertas" de Minhas aulas com estilo (16/11, pedido do usuário):** a aba aparecia sem formatação (o
  estilo dos avisos ficava só em `mensagens.css`, da página Mensagens). A aba carrega `mensagens.css` ao abrir (inclui a
  janela da oferta) e ganhou acabamento próprio em `minhas-aulas.css`: cartão como os da página, abas sublinhadas,
  cada aviso num cartão com o selo "Não lida", data e remetente numa linha e paginação em botões. Conferido com avisos
  de exemplo.
- **Gerência vê os instrutores de moto e ônibus (17/11, pedido do usuário):** os instrutores de moto e ônibus são fixos
  para todas as unidades; agora a Gerência de qualquer unidade vê os ativos na lista de Instrutores, com a nota média e
  a ficha com as avaliações, só para consulta ("Instrutor de moto ou ônibus de outra unidade: só para consulta"; sem
  editar, mudar situação ou realocar). API: `GetMotoristasAsync` inclui quem tem veículo A ou D vinculado (disponível e
  não excluído) mesmo fora do escopo; 1 teste novo (`Instrutores_DeMotoEOnibus_AparecemParaAsOutrasUnidades`). Front:
  `instrutoresCompartilhados` em `unidadeOperador.js` e `somenteConsulta` em `fichaInstrutor.js`.
- **Revisão geral das telas (17/11, pedido do usuário):** todas as páginas, blocos e abas abertos e conferidos (Master,
  ficha do aluno com as 6 abas, Aluno e Instrutor no computador e no celular; o Aluno e o Instrutor com dados simulados
  no navegador, sem conta real). Ajustes de padrão e falhas corrigidas:
  - blocos empilhados sem espaço (Visão global, Recursos) ganharam 16px entre si;
  - Cadastrar aluno: seleções alinhadas aos campos (sobrava margem de 3px) e o texto do campo do contrato quebra linha
    em vez de cortar; as seleções com busca têm a mesma altura (44px) dos campos em todos os painéis da equipe;
  - Unidades: linhas da tabela mais baixas (as ações tinham margem extra); Mensagens: a busca não passa mais da coluna;
  - Relatórios: o bloco "Avaliações dos alunos" organizado (filtro em linha, botão Atualizar azul, resumo em destaque,
    seções com espaço) e o indicador "aulas" virou "Total de aulas"; Controle de veículos: KM sem quebrar linha;
  - ficha do aluno: as autorizações (LADV e liberação) em grade de 4 colunas, em cartões (antes 4 campos empilhados);
    **falha corrigida:** a aba Aulas não mostrava o cartão de Ônibus (D) — o resumo e os créditos liam só o texto da
    categoria, que não traz o D (`resumoAulasAluno` e `creditosRecepcao.js` usam a lista de categorias); a legenda dos
    cartões ficou numa linha só;
  - Aluno: **falha corrigida:** o horário da prova não chegava ao aluno (Meu progresso mostra "Agendada · 10/12 às
    08:30" e o botão do PDF com o horário); o PDF do agendamento virou botão; o rótulo "Ônibus" do Início em negrito
    como Moto e Carro; a categoria aparece igual em todas as aulas ("B — Carro"); Interesses e Atestados médicos no mesmo
    cartão das outras abas; e-mail longo do perfil quebra depois do @; "UNIDADE DE VÍNCULO" no padrão das etiquetas;
    rodapé do menu legível (era 7–8px); no celular, os números de Meu progresso não grudam mais no rótulo e Agendar aula
    não tem mais o vão de 260px antes de "Confirmar agendamentos";
  - Instrutor: selos Realizada (verde), Falta (vermelho) e Cancelada (cinza) no Histórico, como na agenda; o laranja do
    checklist (fim do dia pendente, botão do fim do dia, item com problema) virou azul/vermelho.
  Testes: API 1627/1627 e front 316/316. **PDF das funções das telas** (perfis Aluno, Instrutor, Recepção, Gerência e
  Master, cada um com um usuário de exemplo fictício e capturas sem dados pessoais reais):
  `C:\Users\Sander\Projetos\SIPA\AgIA-Funcoes-das-telas.pdf` (18 páginas, fora dos repositórios).
- **Teste completo com contas de teste (18/11, pedido do usuário):** criadas pelas próprias telas, só com dados
  fictícios: Recepção Teste Claude e Gerência Teste Claude (e-mails @example.com, Unidade Centro de Vila Velha),
  Instrutor Teste Um e Dois Claude (CPF 900.000.101-38 e 900.000.102-19, categoria B), os veículos TST1A01 e TST1A02
  (KWID manual de teste) e o Aluno Teste Claude (CPF 900.000.201-09, B, 20 aulas). As senhas ficam fora dos
  repositórios. Testado de ponta a ponta, cada perfil no seu painel:
  - Recepção: cadastro do aluno com contrato, validação, exames, LADV, prova teórica e prática com data e horário,
    PDF do agendamento da prova, "Enviar arquivo para o aluno", anexar documento, agendar pelo balcão, pedir
    cancelamento e substituição à Gerência, mensagens com aluno e instrutor, pedido de mais aulas e antecipação.
  - Aluno: primeiro acesso (troca da senha), agendamento manual (5 aulas com escolha do instrutor) e automático
    (proposta), cancelamento no prazo, atestado com cancelamento por motivo de saúde, mensagens, adiantar aulas,
    contratar mais aulas, documentos (os 4 PDFs abrem íntegros), Meu progresso e a avaliação da aula realizada.
  - Gerência: aprovar e recusar solicitações, decidir o atestado escolhendo as aulas do período (2 devolvidas, 1
    mantida), realocação de instrutor e veículo, mensagem direta ao aluno, nota do instrutor na lista, relatórios
    (CSV, Excel e PDF), Controle de veículos com histórico e registro de ações.
  - Master: criar acessos (com a confirmação do e-mail pelo link), cadastrar instrutores e veículos, desativar e
    reativar veículo, instrutor e conta da equipe, redefinir acesso (link por e-mail), trocar a unidade do instrutor.
  - Instrutor: primeiro acesso, checklist do início e do fim do dia (KM menor que o do início recusado; salto acima de
    2.000 km pede confirmação; defeito no fim do dia vira alerta na Gerência), presença e falta registradas (o aluno vê
    "Presente" e "Falta registrada"), botões desativados antes do horário, mensagens com leitura.
  - Também: falta com ônus pela Recepção, atestado anexado pela Recepção e reprovado pela Gerência, aulas avulsas,
    link de nova senha ao aluno e a troca do veículo do instrutor (recusada com explicação quando o veículo antigo
    ainda tem aula marcada).
  Falhas encontradas e corrigidas:
  - **Realocação** passava por cima da folga e dos bloqueios do substituto, do veículo desativado e da jornada e do
    almoço do instrutor: agora a prévia mostra o conflito e a aula fica como estava (API `RealocacaoAppService`, 1
    teste novo; a tela não oferece mais veículo desativado como substituto).
  - **Veículo desativado com instrutor responsável aparecia como "Ativo"** na lista (o vínculo do instrutor vinha antes
    sem a situação): `adaptarRecursos` usa o "ativo" da frota (1 teste novo).
  - **Gestão de acessos:** quem era desativado sumia da lista e não dava para reativar pela tela; agora aparece como
    "Desativado" e o "Conta ativa" reativa (o reativar cria um vínculo novo; a edição vai para ele). O aviso também
    deixou de dizer "Sessões anteriores foram invalidadas" ao criar ou editar.
  - **Gerência:** "Controle de veículos" abria a auditoria antiga dos alunos; agora abre no acompanhamento dos veículos,
    como o Master (decisão de 13/11), com o Registro de ações na 2ª aba. A lista de conversas não mostra mais "Você:" na
    mensagem que a Recepção ou a diretoria enviaram; a nota dos instrutores é relida a cada 2 minutos.
  - **Recepção:** "Meu perfil" ficava no meio do menu (antes de Antecipação, Mensagens e SIT); voltou para o fim.
  - Aluno: a falta com ônus marcada pela Recepção aparecia só como "Aula cancelada"; agora diz "Falta registrada pela
    autoescola" e que a aula foi descontada do saldo.
  - Cartão da prova sem a linha "Período: manhã" quando há horário; prazo do atestado sem os segundos; o atestado
    recusado diz "reprovado" em todos os lugares (antes "rejeitado" na etapa); a edição do instrutor não diz mais "Não
    foi possível salvar" junto com "os dados foram salvos" quando só a troca de veículo é recusada.
  Testes: API 1628/1628 (publicada) e front 317/317. Contas e senhas de teste em
  `C:\Users\Sander\Projetos\LOGINS-CONTAS-TESTE-CLAUDE.txt` (fora dos repositórios).
  Para conferir com o usuário: o Lançamento no SIT não mostrou as aulas agendadas hoje (só dias anteriores); o horário
  que já é aula do próprio aluno aparece como "Ocupado" no agendamento (poderia ser "Sua aula").
- **Teste completo, 2ª rodada (18/11, o usuário autorizou testar tudo):** o que tinha ficado de fora.
  - Troca do veículo do instrutor até o fim (as aulas futuras do veículo vão junto para o novo instrutor e voltam),
    troca da unidade do veículo, transferência da unidade de carro do aluno (ida e volta), substituição de aluno
    aprovada, prova reprovada com nova tentativa, cancelar prova, corrigir registro de prova, dia de prova (criado com o
    instrutor e o veículo de teste em 10/12: o instrutor sai da agenda até 13:00, a contagem "1 de 3" e a aba Provas do
    instrutor; depois excluído) e bloqueio da Unidade Novo Milênio em 20/01/2027 (criado e retirado), confirmação do
    agendamento automático. Nada de teste ficou na agenda real.
  - Falhas corrigidas:
    - **Veículo com instrutor mostrava a unidade do instrutor** na lista e na edição; a troca de unidade salvava, mas a
      tela continuava igual (e voltar ao Centro não salvava). Agora a lista e a edição usam a unidade do próprio veículo
      (`unidadeAdministrativa`; a agenda continua com a do vínculo). 1 teste novo.
    - **Correção de prova gravava a data errada:** o formulário abria com a data e a situação da 1ª tentativa e não
      mudava ao escolher outra. Agora acompanha a tentativa escolhida.
    - **Resultado da prova antes do dia:** dava para registrar aprovado ou reprovado numa prova futura. Agora a API
      recusa ("O resultado só pode ser registrado a partir do dia da prova") e a ficha mostra só "Cancelar prova" antes
      do dia, com o aviso. 1 teste novo; 1 teste antigo ajustado (o relógio chega ao dia da prova).
    - **Dia de prova não tinha como ser excluído** (só liberar instrutor e veículo): rota nova `DELETE
      agenda/provas/{data}` (agenda R, só o dia vazio; com aluno, veículo ou instrutor, 409) e o botão "Excluir dia" na
      lista (Gerência e Master). 1 teste novo; matriz com 280 rotas.
    - A lista de provas do instrutor mostra o horário digitado ("às 08:00") no lugar de "Manhã".
    - Ao trocar o veículo do instrutor, a tela avisa quantas aulas futuras do veículo passaram para ele.
  - Para decidir com o usuário: não existe tela para cadastrar pacotes (a API tem), então "Contratar pacote" sempre diz
    que não há pacote; o "Tenho interesse" do aluno saiu em 16/11 e o botão ficou sem uso, então a parte "Aguardando vaga
    / Horários liberados / oferta de horário" da Antecipação só funciona com interesses antigos.
  Testes: API 1630/1630 (publicada) e front 318/318.

### 18/11/2026 — avisos de novidade e aulas abonadas pelo atestado (pedidos do usuário)

- **Número em Verificações (Recepção, Gerência e Master):** o item do menu mostra os atestados ainda sem decisão
  (`GET solicitacoes-medicas/totais`, que já existia e não era usado), no mesmo padrão de Mensagens: consulta a cada
  15 s, ao voltar para a aba e ao fechar um diálogo. `shared/js/avisoVerificacoes.js`, `totalVerificacoesPendentes` em
  `administracaoIntegrada.js`, ligado em `entradaEquipeIntegrada.js`.
- **Novidades no painel do aluno:** número verde no item "Minhas aulas" e nas abas "Avisos e ofertas" e "Atestados
  médicos" com os avisos ainda não lidos (o resultado do atestado decidido pela Gerência é um aviso do tipo Atestado).
  Abrir "Atestados médicos" marca esses avisos como lidos. `avisosNaoLidos` em `alunoIntegrado.js`,
  `marcarIndicadorNovidades` em `mensagensAluno.js`, `marcarNovidadesDasAbas` em `painelAluno.js`.
- **Atestado de mais dias mostrava só uma aula:** as outras aulas do afastamento eram canceladas, mas não ficavam
  ligadas ao atestado. A API passou a devolver `aulasDoAfastamento` na solicitação (cancelamentos por saúde com o texto
  do afastamento, do mesmo aluno, feitos no momento da aprovação; sem mudança no banco) e o cartão do aluno lista
  "Outras aulas abonadas por este atestado". Teste do afastamento ampliado.
  Testes: API 1630/1630 (publicada) e front 318/318.

**Bloqueio do ambiente (09/11/2026):** o Controle Inteligente de Aplicativos do Windows (Smart App Control) está
ligado e passou a barrar as DLLs recompiladas (`0x800711C7`). A solução compila (0 erros), mas a suíte da API não
carrega e a API não sobe nesta máquina. A última suíte executada (antes desta rodada) teve 1559/1559.
