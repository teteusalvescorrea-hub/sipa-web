# Jornada individual do Instrutor — preparação para integração

## Implementado nesta etapa

A agenda mantém as regras compartilhadas atuais e os dados existentes. A função
`projetarFaixasJornada` transforma os horários resolvidos pelo serviço em linhas,
bloqueios visuais e resumo do expediente. O HTML não presume início às 07h,
término às 18h50 ou intervalo fixo. No serviço local, a origem continua sendo
`GRADE_CENTRO`; não foi criada uma política individual de agendamento paralela.

Não há editor de jornada no Instrutor. O seletor de cadastro de testes continua
identificando qual agenda local consultar; não concede permissão de configuração.
Não houve migração, gravação de jornada, mudança de disponibilidade ou atualização
automática de aulas já agendadas.

## Contrato proposto para uma etapa posterior

O backend deverá associar uma jornada versionada ao ID do instrutor. A proposta
de dados inclui:

- ID, versão, vigência e fuso `America/Sao_Paulo`.
- Dias de trabalho e início/fim do expediente por dia da semana.
- Intervalos com início/fim e duração calculada, sem assumir uma ou duas horas.
- Bloqueios com data, início/fim e motivo; indisponibilidades de dia inteiro.
- Exceções por data, substituindo explicitamente a jornada daquele dia.
- Autor, autorização e data de cada alteração para auditoria.

Os limites de expediente representam a janela completa de trabalho. Por exemplo,
a política atual permite início às 18h e término às 18h50; o limite de trabalho
deve comportar esse término. Não confundir último início com fim do expediente.

O serviço deve resolver a jornada efetiva por instrutor/data e retornar as faixas
de apresentação, aulas, origem/versão da configuração e referência de tempo
validada no servidor. O contrato atual `agendaHoje()` pode receber essa resposta
sem adicionar controles de alteração ao painel do Instrutor. O exemplo visual
de outra jornada não autoriza agendamentos por si só.

## Validação e autorização futuras

Uma única política no backend deverá ser utilizada por Aluno, Recepção e
Instrutor. A disponibilidade será a interseção da jornada do instrutor,
expediente da unidade, veículo, categoria, bloqueios, feriados e conflitos.
Toda confirmação de reserva revalida essa interseção no servidor. O cliente
não poderá escolher arbitrariamente instrutor, unidade, jornada ou data.

Gestores precisam de permissão específica e escopo de unidade. O Instrutor terá
somente leitura, salvo autorização futura explícita. As regras de duração e
início em hora cheia permanecem na política central; uma eventual flexibilização
precisará de alteração coordenada, sem depender desta projeção visual.

Antes de salvar uma alteração administrativa, gerar uma prévia dos agendamentos
afetados e exigir tratamento autorizado dos conflitos. Usar versão/precondição
para evitar salvar sobre mudanças concorrentes. Não cancelar, deslocar ou
reescrever aulas silenciosamente. Preservar datas, términos e histórico dos
registros antigos, mesmo quando diferirem da política vigente.

## Trabalho ainda não executado

Persistência e migração de jornada no banco, endpoints oficiais e suas permissões,
resolução central da política, editor administrativo, auditoria e fluxo de
confirmação de conflitos. Os nomes e rotas da API deverão ser acordados com o
backend; este documento não descreve endpoints já disponíveis.
