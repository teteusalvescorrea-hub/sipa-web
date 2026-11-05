# Antecipação e mensagens

> Atualizado em 04/11: o fluxo antigo (interesse geral do aluno, consulta de vagas livres, campanhas, ofertas e fila de
> WhatsApp) saiu. Ficou a antecipação por interesse no horário, descrita abaixo.

## Como funciona

- O aluno, na tela de agendamento, vê os horários ocupados por outros alunos com "Ocupado · Tenho interesse". Marcar avisa a Recepção quando o horário vagar; o horário nunca entra na reserva. O botão só fica habilitado se o aluno tiver uma aula posterior, da mesma categoria, confirmada ou aguardando aceite, a pelo menos o prazo de cancelamento da autoescola (48 horas úteis por padrão). A API confere de novo ao marcar.
- Em Minhas aulas, a aba Interesses lista os interesses marcados, com Desmarcar.
- Recepção e Gerência veem, em "Antecipação de aulas", os horários ocupados que vagaram, com os interessados na ordem de quem marcou primeiro, os pares de instrutor e veículo livres e as aulas do aluno que podem ser antecipadas. O item do menu mostra um contador (consultado a cada 15 s e ao voltar para a aba). Ações ⋯: Marcar contatado, Remarcar (desmarca a aula escolhida e cria a nova com o par escolhido) e Descartar.
- Financeiro fica fora do SIPA: nada de preço ou validação financeira.
- Na demonstração local, a seção abre com a lista vazia (`dev/operador/antecipacaoLocal.js`); o fluxo só existe com a API.

## Rotas da API

- Aluno: `GET`, `POST` e `DELETE alunos/me/interesses-antecipacao/{id}`.
- Equipe: `GET antecipacoes/horarios-liberados`, `GET antecipacoes/horarios-liberados/total` e `POST antecipacoes/interesses/{id}/contato|remarcacao|descarte`.

## Mensagens do aluno

A tela Mensagens do aluno tem duas abas:

- **Avisos**: os avisos automáticos do sistema (aula remarcada, interesse, solicitação médica), só de leitura. Continua lendo `aluno.avisosInternos` (`shared/js/mensagensAluno.js`); no modo integrado vêm de `GET alunos/me/mensagens`. Não há mais ofertas de antecipação nem fila de WhatsApp.
- **Conversa com a Recepção**: nos dois sentidos, uma conversa por autoescola em que o aluno tem matrícula (com mais de uma, aparece o seletor). O aluno escreve e lê as respostas; a leitura é registrada ao abrir a aba. Sem matrícula ativa, o histórico continua legível, sem envio. Só existe no modo integrado: no modo local as abas ficam escondidas.

O sino e o item Mensagens somam os avisos e a conversa não lidos (`GET alunos/me/mensagens/nao-lidas` + `GET alunos/me/conversas/nao-lidas`), consultados a cada 15 s e ao voltar para a janela, em todas as páginas do aluno.

Recepção e Gerência têm a seção **Mensagens** (o Master não): contador de conversas com mensagem do aluno não lida no item do menu (15 s e foco), lista com busca por nome ou CPF, unidade e "Somente não lidas", e a conversa aberta com resposta. A leitura é uma marca só para a equipe: quem abre marca como lida para todos. A conversa usa a tela Alunos do papel (Ler para ver, Atualizar para responder) e o escopo das unidades; sem gravação na unidade, a conversa fica "Somente leitura nesta unidade.". "Enviar mensagem" (Ações ⋯ da lista de alunos e barra da ficha) abre um diálogo com a primeira mensagem e, depois de enviar, a conversa. Sem e-mail, anexos ou financeiro. Na demonstração local a seção abre com a lista vazia (`dev/operador/mensagensLocal.js`).

Rotas: aluno `GET alunos/me/conversas`, `GET alunos/me/conversas/nao-lidas`, `GET|POST alunos/me/conversas/{autoescolaId}/mensagens` e `POST alunos/me/conversas/{autoescolaId}/leitura`; equipe `GET conversas` (total no `X-Total-Count`), `GET conversas/nao-lidas`, `GET conversas/{id}`, `POST conversas/{id}/mensagens|leitura` e `POST alunos/{id}/conversa/mensagens`.

## Arquivos

- Aluno: `aluno/js/components/painelAluno.js` (botão de interesse e aba Interesses), `aluno/js/services/alunoIntegrado.js` (rotas do aluno), `aluno/css/agendamento.css` e `aluno/css/minhas-aulas.css`.
- Equipe: `shared/components/antecipacaoPainel.js`, `shared/components/menuAcoes.js`, `shared/css/antecipacao.css`, `shared/js/avisoAntecipacao.js` (contador do menu) e `shared/js/services/administracaoIntegrada.js` (rotas da equipe).
- Conversa: `aluno/js/components/conversaAluno.js`, `aluno/js/components/mensagensAluno.js` (sino), `shared/components/mensagensPainel.js`, `shared/css/mensagens-equipe.css` e `shared/js/avisoMensagens.js` (contador do menu e "Enviar mensagem").
- Demonstração: `dev/operador/antecipacaoLocal.js` e `dev/operador/mensagensLocal.js`.
- Testes: `tests/antecipacao-interesses.test.mjs`, `tests/mensagens-recepcao.test.mjs` e `tests/conversa-aluno.test.mjs`.
