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

A caixa de mensagens continua lendo `aluno.avisosInternos` (`shared/js/mensagensAluno.js`), com leituras separadas em `aluno.leiturasMensagens`. Não há mais ofertas de antecipação nem fila de WhatsApp.

## Arquivos

- Aluno: `aluno/js/components/painelAluno.js` (botão de interesse e aba Interesses), `aluno/js/services/alunoIntegrado.js` (rotas do aluno), `aluno/css/agendamento.css` e `aluno/css/minhas-aulas.css`.
- Equipe: `shared/components/antecipacaoPainel.js`, `shared/components/menuAcoes.js`, `shared/css/antecipacao.css`, `shared/js/avisoAntecipacao.js` (contador do menu) e `shared/js/services/administracaoIntegrada.js` (rotas da equipe).
- Demonstração: `dev/operador/antecipacaoLocal.js`.
- Testes: `tests/antecipacao-interesses.test.mjs`.
