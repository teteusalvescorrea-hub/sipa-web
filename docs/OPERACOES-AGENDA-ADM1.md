# Operações de aulas e vínculo de carros — ADM 1 local

## Uso

Na raiz principal, abrir o painel `nivel-1-operador/html/operador-cfc.html` em
desenvolvimento local. Em **Veículos e recursos**, cadastrar ou editar o carro e
selecionar **Instrutor responsável**. As operações semanais não exigem caixas de
seleção. Não são criados instrutores automaticamente.

Em **Agendas**, selecionar o veículo, data e um horário livre. A reserva continua
passando pelo serviço existente, com aluno autorizado, saldo por categoria, câmbio,
jornada, almoço, feriados, bloqueios e conflitos. Os detalhes exibem informações
compactas e ações conforme a permissão e o estado atual da aula.

## Ações e integridade

- Cancelamento de reserva futura ativa: confirmação com aluno, data, horário e
  consequência do crédito. A política compartilhada de 48 horas úteis determina
  devolução ou retenção. Dentro do prazo restrito, a retenção exige aceite explícito.
- A aula cancelada permanece no histórico, libera os recursos e não pode ser
  cancelada novamente. Saldos conhecidos são devolvidos uma vez; saldo desconhecido
  não é criado ou presumido. Bloqueios administrativos continuam respeitados.
- Presença/falta: somente aula confirmada que já começou e ainda sem resultado.
  Exige motivo administrativo e registra responsável, instante e origem. Não gera
  novo débito nem substitui resultado final; correções pertencem à gerência.
- Atestados: reutilizam validação de arquivo, armazenamento privado e fluxo de
  análise existentes. Após cancelamento administrativo com crédito retido, a
  unidade principal pode anexar o atestado dentro do prazo médico já configurado.
  A recepção analisa e encaminha; não aprova ou executa devolução excepcional.
- Consulta global de motos/ônibus não concede operações sobre qualquer aluno.
  Mutações verificam vínculo operacional/cadastral e unidade responsável. Documentos
  médicos mantêm a restrição da unidade principal do aluno.

## Troca de instrutor do carro

O novo vínculo fica em `veiculo.instrutorId`, com os índices `instrutor.veiculoIds`
atualizados na mesma operação. O serviço valida habilitação B, atividade, unidade
e operações autorizadas, jornada, almoço e todos os conflitos das aulas futuras.

Somente aulas futuras ativas (status 1/3) são transferidas, inclusive confirmadas.
Qualquer conflito aborta a edição inteira, inclusive metadados do veículo. O erro
identifica datas/horários impeditivos. Aulas passadas, realizadas, faltas e canceladas
permanecem intactas. Créditos não mudam. O histórico registra instrutores anterior
e novo, veículo, responsável, instante e IDs das aulas afetadas.

Registros legados com vínculo reverso único continuam consultáveis. Quando não há
vínculo registrado, somente um candidato legado inequívoco, ativo e da operação
compatível pode ser resolvido para leitura; nenhum vínculo é gravado por inferência.
Casos ambíguos exigem escolha no cadastro. Câmbio desconhecido não é tratado como
manual. Uma lista explícita vazia de veículos não autoriza outros carros.

## Deslocamentos

- Segunda: Santa Rita → Itaparica.
- Terça: Terra Vermelha → Centro de Vila Velha.
- Quinta: Cobilândia → Centro de Vila Velha.

Os recursos da origem atendem automaticamente a sua operação prevista. Recursos
do destino continuam exigindo autorização operacional existente: o catálogo inteiro
do destino não é liberado. A origem administrativa do aluno é preservada e o local
físico é exibido na agenda, reserva, painel do aluno e dados do instrutor. Feriados,
conflitos e restrições de câmbio permanecem obrigatórios. Snapshots históricos não
são remapeados silenciosamente.

## Persistência e contrato futuro

O adaptador existente grava sob o mesmo lock do armazenamento do operador. Reserva,
cancelamento, frequência, transferência de responsável e anexos usam a fonte
compartilhada com as contas locais dos alunos e instrutores. Não existe sincronização
entre navegadores ou computadores diferentes.

A API futura deverá resolver identidade, nível, unidade e permissões no servidor;
autorizar cada consulta/comando; validar saldos e recursos; exigir motivo de
intervenção; assegurar unicidade do resultado e idempotência da devolução; e
efetivar troca de responsável/várias reservas atomicamente sob controle de
concorrência. Arquivos médicos precisam de armazenamento e autorização privados.
ADM 2/3 e decisão médica definitiva não foram implementados.

## Arquivos desta implementação

- `nivel-1-operador/js/dominioOperador.js`, `servicoOperador.js`, `fichaOperador.js`.
- `nivel-1-operador/js/components/aulaOperador.js`, `cadastroRecurso.js`,
  `agendaOperador.js`, `reservaRecepcao.js`, `unidadeOperador.js`.
- `nivel-1-operador/css/operador-paineis.css`.
- `dev/operador/atendimentoLocal.js`.
- `shared/js/operacaoCarro.js`, `solicitacoesMedicas.js`.
- `dev/aluno/authLocal.js`, `servicoRecepcao.js` (disponibilidade compartilhada;
  nenhuma alteração visual nas agendas do aluno ou instrutor).
- `tests/operacoes-agenda-adm.test.mjs`, `operacoes-agenda.browser.steps.mjs`.
- Ajustes nos testes existentes de agenda, operação de carro, almoço D e ônibus
  temporário, e no executor de cenários `tests/agenda-recepcao.browser.mjs`.

Testes usam perfis descartáveis com recursos e documentos explicitamente fictícios.
Nenhum dado existente do navegador do usuário é limpo ou substituído.
## Consulta e desempenho dos instrutores

A listagem administrativa mantém o escopo da unidade, com busca por nome,
CPF/identificação e categoria. Ver detalhes abre diretamente o profissional,
sem uma nova seleção. O modal consulta cadastro, veículos atuais e aulas
concluídas, com filtros Hoje, Semana, Mês e período personalizado em Brasília.
Semana começa na segunda-feira. Registros futuros e cancelados não entram.

No modal, **Aulas realizadas** significa conclusões (presenças + faltas),
com os dois resultados discriminados. No Início do próprio instrutor,
os indicadores já existentes de realizadas continuam contando presenças;
foram acrescentados semana e presenças/faltas do mês, sem redesenhar a agenda.
O cálculo compartilhado deduplica IDs e usa o instrutor gravado em cada aula,
nunca o responsável atual do veículo. O autor do lançamento administrativo
fica separado do instrutor da aula. Documentos médicos não integram a projeção
de desempenho.

O campo Instrutor responsável dos veículos A/B/D permite pesquisar nome ou CPF
e salva o ID escolhido. Trocas validam categoria, unidade, jornada, almoço e
conflitos antes da atualização atômica das futuras ativas. Aulas concluídas,
canceladas e passadas permanecem intactas. Moto mantém o limite de duas motos
por instrutor. Consultas operacionais especiais não ampliam acesso cadastral
ou exposição de CPF de outra unidade.

Na integração, a API deverá oferecer essas consultas com escopo definido pelo
usuário autenticado, calcular os mesmos períodos e resultados e executar trocas
em transação, com concorrência controlada e auditoria. O controle local não
substitui autorização no servidor. Nenhuma API foi modificada nesta etapa.

Arquivos complementares: `shared/js/desempenhoInstrutor.js`,
`nivel-1-operador/js/components/fichaInstrutor.js`, estilos em
`nivel-1-operador/css/unidade.css` e `instrutor/css/instrutor.css`,
`instrutor/js/dominio.js`, `instrutor/js/painel.js` e os testes
`tests/desempenho-instrutor.test.mjs` e
`tests/desempenho-instrutor.browser.steps.mjs` (cenário `desempenho`).

