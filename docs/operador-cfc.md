# Operador de CFC — nível 1

## Escopo entregue

Interface em `operador-cfc.html`, com as cores e variáveis de `css/meu-progresso.css`, a sidebar existente, fonte Inter e adaptação para desktop e celular. A estrutura fica no `template#operador-template` e o componente de navegação em `js/modules/operador/components/painelOperador.js`.

O acesso normal mostra **Acesso ainda não habilitado**. Nenhuma role é tratada como operador. O login existente de Aluno e Autoescola não foi alterado. Há uma demonstração explicitamente ativada somente em loopback, isolada da sessão real, sem chamadas administrativas, senhas ou links autenticáveis. Os dados fictícios ficam em uma chave exclusiva de armazenamento local.

## Como visualizar a demonstração local

Com o front aberto pelo Live Server na porta 5500, acesse:

```text
http://127.0.0.1:5500/operador-cfc.html?demo=1
http://localhost:5500/operador-cfc.html?demo=1
```

Também existe o botão **Abrir demonstração local** na tela bloqueada, visível somente em ambiente local. Não é necessário iniciar a API, o SQL Server ou autenticar uma conta para usar a demonstração.

O parâmetro `demo=1` precisa estar presente uma única vez. Somente HTTP/HTTPS em `localhost`, `127.0.0.1` e `[::1]` são aceitos. GitHub Pages, domínios públicos, IPs de rede local, nomes semelhantes a localhost e `file://` permanecem bloqueados, mesmo com o parâmetro. Não há ativação por localStorage, sessionStorage, token ou perfil.

Uma faixa visível identifica **DEMONSTRAÇÃO LOCAL · DADOS FICTÍCIOS**. O operador é fictício de nível 1, vinculado à unidade Centro. Isso não cria uma identidade administrativa, JWT, permissão ou vínculo no backend.

### O que pode ser testado

- Visão geral com nove indicadores interativos derivados dos alunos, aulas e recursos fictícios. Cada card abre exatamente os registros de seu total, com busca, estado vazio e navegação para a seção correspondente. CPF mascarado nas listagens dos indicadores. Foram retirados os blocos Atenção da recepção e Fluxo do atendimento da apresentação da demonstração.
- Busca por nome/CPF e filtros cumulativos por financeiro, prova/exames e categoria. A tabela agrupa informações; os detalhes completos ficam na ficha.
- Cadastro de exemplos com validação de preenchimento, CPF fictício de 11 dígitos não duplicado e renderização segura como texto.
- **Ver detalhes** abre uma ficha com prova teórica, psicotécnico, toxicológico e vista/aptidão física independentes. Cada formulário salva apenas seu exame, data de realização/aprovação e observações. Há confirmação, progresso e histórico demonstrativo.
- Observações administrativas e edição explícita do cenário financeiro. Isso não é consulta, aprovação nem confirmação oficial do ICFC.
- **Agenda da Unidade** com dia/semana/mês, navegação contextual entre datas e filtros recolhíveis por instrutor, veículo, categoria e situação. No modo semanal, os horários ficam alinhados entre as colunas; no celular os dias são empilhados. O mês mostra um calendário com quantidades e consulta por dia. Clique em uma aula ocupada para consultar seus detalhes ou em **Agendar** para criar uma aula fictícia.
- Solicitação visual de acesso de aluno ou instrutor. Nenhum link, senha provisória ou credencial é gerado.
- Filtros de veículos, instrutores e equipamentos fictícios da unidade Centro.

Use somente informações de exemplo. Os CPFs de demonstração são deliberadamente fictícios e os e-mails usam `example.invalid`. Não há contas reais correspondentes a esses registros.

### Como desativar

Clique em **Encerrar** ou **Sair da demonstração**, ou remova `?demo=1` do endereço. O bloqueio normal volta e a sessão real permanece intacta. Recarregar preserva as alterações fictícias neste navegador e nesta origem (localhost e 127.0.0.1 têm armazenamentos separados). Nada é salvo no banco.

Para começar novamente, clique em **Restaurar dados** e confirme **Restaurar dados iniciais**. Só a chave `sipa.operador.demo.v2` é restaurada; não há limpeza de tokens ou configuração da API. Se o navegador bloquear o armazenamento, o painel avisa e funciona em memória durante a sessão. Use apenas informações fictícias, inclusive nas observações.

### Isolamento e integração real

`js/modules/operador/demo/modoDemonstracao.js` valida o endereço e a ativação explícita. `demonstracaoOperador.js` compõe a apresentação; `dadosDemo.js` cria os exemplos e `repositorioDemo.js` valida e persiste exclusivamente o cenário local. Não importam clientes HTTP ou serviços da API. O componente visual recebe callbacks de demonstração para que sair e filtrar recursos não utilizem serviços reais. O entrypoint não consulta a sessão quando a demonstração está ativa. Persistência não habilita a demonstração sem o parâmetro explícito.

## Agenda e calendário

A análise considerou `js/agendamento.js`, `css/agendamento.css`, `agendamentos.service.js` e os helpers de grade/status na API. Foram mantidos a estrutura visual de calendário/seleção, o uso de datas civis de Brasília, aulas de **60 minutos em horas inteiras**, sem intervalo adicional, e os status da API: Confirmada, Cancelada, Aguardando aceite, Recusada, Realizada e Falta. Os códigos 1, 3, 5 e 6 ocupam instrutor/veículo conforme `StatusAgendamentoRegras.OcupaMotorista`. Conflitos consideram sobreposição, não somente igualdade de início. Filtros de visualização nunca removem aulas da validação de disponibilidade.

A grade **fictícia Centro** atende ao pedido: seg–sex 07h–11h e 14h–18h (última aula termina 19h); sábado 07h–11h (termina 12h); domingo fechado. Há uma diferença explícita para integração: `GradePadraoHelper` da API atualmente inclui **13h**. A agenda do aluno permanece consumindo a grade autorizada pela API, sem alteração nesta entrega. Antes de integrar o operador real, a grade da unidade precisa ser configurada e obtida do mesmo backend; estas regras locais não podem autorizar gravações reais.

### Cards e fonte compartilhada

`consultasOperador.js` produz os nove conjuntos usados simultaneamente nos totais e nos detalhamentos. Ao abrir um indicador, a fotografia dos dados é atualizada; busca e filtro de data informam quantos registros estão sendo exibidos sem alterar o total do grupo. Os quatro primeiros detalhamentos reutilizam a ficha de aluno existente. Aulas e próximas aulas reutilizam `aulaOperador.js` e o mesmo modal de detalhes da agenda.

**Próximos 7 dias** significa hoje até hoje + 6 dias, inclusive. Aulas hoje e no período preservam o critério anterior de status 1, 3, 5 e 6 (não canceladas/recusadas). **Próximas aulas** mostra somente status 1 e 3 com início estritamente futuro, ordenado por data e hora, até seis cards de prévia; a agenda oferece a consulta completa. Datas/horas usam Brasília, inclusive perto da meia-noite.

Veículos/instrutores disponíveis são recursos ativos da unidade, excluindo `disponivel: false` quando informado. Isso não significa que estejam livres em todos os horários: cada detalhamento informa a disponibilidade de hoje e associações, se cadastradas. A ausência de associação fixa é apresentada explicitamente; nenhuma associação é inferida. Horários livres contam **inícios futuros com pelo menos um par disponível**, não a quantidade de pares. O detalhamento apresenta as categorias e os pares exatos.

### Como criar e testar uma aula fictícia

1. Abra **Agenda da Unidade**, escolha uma data futura de expediente e use **Dia** ou **Semana**.
2. Clique em **Agendar** em um horário disponível. Data, início, fim e unidade vêm preenchidos no resumo.
3. Selecione **Aluno Exemplo Dois**, inicialmente apto e com categoria A. Se suas alterações locais o deixaram inelegível, confira a ficha ou restaure o cenário inicial.
4. A categoria será inferida quando houver uma única opção. Escolha um instrutor disponível e a moto compatível.
5. Clique em **Confirmar agendamento**. Uma aula Confirmada (status existente 1) será acrescentada ao estado fictício, e uma aula será descontada do saldo local. A grade, próximas aulas, totais e detalhamentos serão recalculados imediatamente.
6. Recarregue para conferir a persistência ou tente repetir o horário: os recursos ocupados deixam de ser oferecidos. Mesmo uma seleção antiga é revalidada no momento de confirmar.

`demo/agendamentosDemo.js` valida dados obrigatórios, data/hora futura, expediente, feriados, categoria do aluno/instrutor/veículo, recursos ativos da unidade, aptidão existente e saldo. Valida sobreposição de todo o intervalo para instrutor, veículo e aluno (incluindo status 4 para ocupação do aluno, conforme a API). O comando retorna um estado novo apenas após todas as validações; falhas não alteram aulas nem saldo. Usa o armazenamento já existente, sem migrar ou apagar registros anteriores. O formulário não oferece cancelamento, alteração de aula nem permissão administrativa real.

A elegibilidade da demonstração continua sendo a já implementada no módulo: financeiro Regular, avaliações aplicáveis aprovadas/não aplicáveis e saldo positivo. O backend real também valida pacote/contratação e outras condições indisponíveis neste cenário. A demonstração não representa autorização para agendar em produção.

`calendario.js` calcula Páscoa e datas móveis sem converter datas civis para o fuso do navegador. Reconhece nove feriados nacionais fixos conforme a legislação vigente, em 2026, 2027, 2028 e anos seguintes. Carnaval e Corpus Christi são identificados como **facultativos**, sem fechamento automático. Paixão de Cristo é identificada separadamente como religiosa e adotada como fechamento da unidade fictícia: sua aplicação ao CFC depende de legislação municipal, conforme a [Lei 9.093/1995, art. 2](https://www2.camara.leg.br/legin/fed/lei/1995/lei-9093-12-setembro-1995-348594-normaatualizada-pl.html). O calendário federal de 2026 distingue essas datas na [Portaria MGI 11.460/2025](https://www2.unifap.br/prosear/files/2026/01/Portaria_Gov_MGI_11460_de29_de_dezembro_de_2025_Feriados-Nacionais-de-2026.pdf); ele não substitui a legislação aplicável ao CFC. O dia 20/11 segue a [Lei 14.759/2023](https://www.presidencia.gov.br/ccivil_03/_ato2023-2026/2023/lei/l14759.htm).

`GRADE_CENTRO` prepara `feriadosLocais`, `paixaoFechada` e `excecoes` de funcionamento; não existe editor de exceções administrativas nem integração real dessas regras. Novas leis futuras exigirão manutenção, embora o cálculo dispense cadastro anual. Os feriados são marcados no calendário e seus nomes aparecem no título acessível e no dia selecionado.

## Organização dos arquivos

- `operador-cfc.html`, `css/operador-cfc.css`: estrutura e estilos exclusivos do módulo, usando a identidade SIPA existente. `css/operador-paineis.css` concentra o redesign de visão geral/agenda e seus modais, sem alterar as outras telas.
- `js/operador-cfc.js`, `demo/modoDemonstracao.js`: gate local explícito e bloqueio real preservado.
- `js/modules/operador/demo/{demonstracaoOperador,dadosDemo,repositorioDemo,agendamentosDemo}.js`: composição, dados locais isolados e comando fictício de agendamento.
- `js/modules/operador/{calendario,disponibilidade,exames}.js`: regras puras reutilizáveis/testáveis, sem HTTP ou autorização real.
- `js/modules/operador/consultasOperador.js`: conjuntos compartilhados dos indicadores, próximas aulas e horários livres.
- `js/modules/operador/components/{painelOperador,uiOperador,fichaAluno,agendaOperador,visaoGeralOperador,aulaOperador,agendamentoOperador}.js`: navegação, elementos seguros, ficha, agenda, cards/detalhamentos e formulário fictício.
- `tests/operador-cfc*.mjs`: testes de gate, regras e navegador isolado. Nenhuma dependência adicional instalada.

Nenhuma funcionalidade operacional do painel está conectada à API nesta etapa. O login real das outras telas continua conectado aos seus serviços existentes. Cadastro administrativo, unidade/permissões, ICFC, exames e criação de acesso ainda dependem do contrato de backend descrito abaixo. A demonstração não substitui essas validações.

## Contrato conferido na API hml

`POST /api/usuarios/login` retorna `token`, `expiraEm` e `perfil: { descricao, valor }`, conforme `TokenReadDto` e `EnumValueDto`.

Os únicos perfis em `PerfilEnum` são Aluno (1), Motorista (2) e Autoescola (3). Não existe operador, administrador, nível de administrador ou permissão administrativa no contrato atual. Nenhum novo número ou nome de role foi definido pelo front.

O JWT contém o identificador do usuário, a role e `perfil_registro_id`. Este último é o ID do registro de Aluno, Motorista ou Autoescola; **não é uma unidade**. Não há unidade do operador, lista de unidades autorizadas ou permissões de atendimento no login/JWT atual. `GET /api/unidades` lista unidades da Autoescola autenticada, sem identificar o vínculo de um operador.

Referências no back: `Sipa.App.Domain/Core/Enums/PerfilEnum.cs`, `Sipa.App.Application/Common/Dto/TokenReadDto.cs`, `EnumValueDto.cs`, `Common/Services/TokenService.cs` e `Sipa.App.Domain/Core/Services/CurrentUserService.cs`.

## Endpoints e disponibilidade

| Necessidade | O que já existe | Situação para o operador |
|---|---|---|
| Login do operador e unidade | Login dos três perfis atuais | Não disponível; acesso permanece bloqueado |
| Cadastro de alunos pela unidade | `POST /api/alunos` anônimo para autocadastro, com senha escolhida pelo próprio aluno | Não reutilizado: não oferece o fluxo de operador, vínculo de unidade ou criação de acesso provisório |
| Buscar e consultar alunos | `GET /api/alunos/me` e `PUT /api/alunos/me`, somente Aluno | Não há busca/lista/detalhe de alunos da unidade para operador |
| Primeira consulta financeira ICFC | Nenhum endpoint | Pendente; nenhuma situação financeira é inferida de pacotes ou pagamentos |
| Prova teórica e exames | Nenhum endpoint de consulta/validação | Pendente; não é possível marcar aprovação |
| Criar acesso, link, senha provisória e troca obrigatória | Nenhum endpoint | Pendente; nada é gerado no JavaScript |
| Permissões para criar instrutores/outros usuários | Somente autocadastros dos perfis existentes | Não disponíveis; nenhuma permissão é presumida |
| Recursos da unidade | `GET /api/unidades` e `GET /api/vinculos` para Autoescola; `GET /api/veiculos` para Motorista | Não reutilizados com outro perfil. Falta consulta autorizada com escopo de unidade |
| Equipamentos | Nenhum endpoint | Pendente |

As autorizações foram conferidas nos controllers de Usuarios, Alunos, Unidades, Vinculos e Veiculos. Não houve alteração na API nem no banco. As disponibilidades desta tabela se referem ao ambiente real; o cenário local usa apenas dados fictícios.

## Interface preparada

- Visão geral: indicadores indisponíveis (`—`, nunca contagens inventadas), etapas do atendimento e atalhos internos.
- Alunos: busca pendente, lista vazia, ficha sem dados e diálogo de cadastro com campos e envio indisponíveis.
- Verificações: financeiro ICFC, prova teórica e exames com situação não consultada/não informada e consultas desabilitadas.
- Acessos: CPF como login previsto, tipos de usuário ainda sem autorização e fluxo de primeiro acesso descrito. Emissão permanece desabilitada.
- Recursos: navegação entre veículos, instrutores e equipamentos, sem carregar dados ou permitir selecionar outra unidade.

Navegação, diálogo nativo e abas são apenas componentes de apresentação. Não constituem autorização. Alterar HTML/JavaScript no navegador não concede acesso a nenhum recurso no servidor.

## O que falta para ligar ao login

1. Definir no backend a identidade real do operador nível 1 e o campo/claim que a representa, sem reaproveitar automaticamente Autoescola.
2. Disponibilizar um contexto autenticado com unidade autorizada e permissões efetivas. Cada endpoint deve validar esse contexto no servidor.
3. Implementar consultas e comandos de atendimento com o escopo de unidade aplicado no backend, inclusive ao buscar por CPF ou ID.
4. Implementar ICFC/exames com origem, resultado e data reais; distinguir pendência, indisponibilidade e reprovação.
5. Implementar emissão e expiração de convites, senha provisória e troca obrigatória no primeiro acesso no servidor, com auditoria e permissões por tipo de usuário.
6. Só então acrescentar o perfil real ao roteamento de `js/login.js` e montar o template após a confirmação do contexto autorizado. Qualquer 401, 403 ou unidade ausente deve manter a área fechada.

Não basta verificar uma claim, esconder menus ou filtrar uma lista no JavaScript para restringir acesso aos dados da unidade.

## Validação da interface

```powershell
node tests/operador-cfc.browser.mjs
node --test tests/operador-cfc-demo.test.mjs
node --test tests/operador-cfc-regras.test.mjs
node --test tests/operador-cfc-paineis.test.mjs
```

Requer Node com `WebSocket` global e Edge instalado. Para outro caminho do navegador, configure `SIPA_TEST_BROWSER`. O teste inicia um servidor temporário em loopback e um perfil headless isolado, sem acessar a API, o banco ou a sessão do navegador do usuário.

O teste mantém a avaliação da estrutura sem integrações em uma rota efêmera e testa a demonstração pelo endereço real `operador-cfc.html?demo=1`. Confere bloqueio normal, preservação da sessão/configuração, ausência de leitura de credenciais e chamadas à API, navegação, cadastro persistido, exames independentes/histórico, restauração confirmada, conteúdo seguro como texto, filtros, calendário, saída, teclado, layout móvel e exceções/console.error. Os testes de regras cobrem gate de produção, feriados 2026–2028, datas bissextas, grade, almoço, duração, domingo, conflitos por recurso, status e unidade, persistência isolada e armazenamento indisponível. As capturas visuais ficam na pasta temporária indicada ao final da execução.

A suíte `operador-cfc-paineis.test.mjs` acrescenta testes dos nove conjuntos, período inclusivo, exclusão de aulas passadas da prévia, fuso de Brasília, categorias, recursos indisponíveis, saldo, inelegibilidade, aluno ocupado, sobreposição parcial, comando sem mutações em falhas, persistência e bloqueio em produção. O teste de navegador confere os nove cards, o formulário real da demonstração, criação/persistência/consumo de saldo, sincronização com o dashboard e seleção de recursos ocupados, além dos três modos e alinhamento semanal.

## Entrega da refatoração de visão geral e agenda

Arquivos alterados nesta etapa:

| Grupo | Arquivos |
|---|---|
| Página e estilos | `operador-cfc.html`, novo `css/operador-paineis.css` |
| Datas e disponibilidade | `js/modules/operador/calendario.js`, `disponibilidade.js` e novo `consultasOperador.js` |
| Componentes | `js/modules/operador/components/painelOperador.js`, `agendaOperador.js`; novos `visaoGeralOperador.js`, `aulaOperador.js` e `agendamentoOperador.js` |
| Demonstração | `js/modules/operador/demo/demonstracaoOperador.js` e novo `agendamentosDemo.js` |
| Testes e documentação | `tests/operador-cfc.browser.mjs`, novo `tests/operador-cfc-paineis.test.mjs`, `docs/operador-cfc.md` |

Resultado executado após o redesign minimalista: **33 testes unitários aprovados** e **134 verificações no Edge isolado aprovadas**, sem exceções de JavaScript ou `console.error`. Inclui abertura por Enter, ficha existente a partir do indicador, tentativa de confirmar seleção antiga conflitante sem alteração de aulas/saldo e capturas de desktop/celular. `git diff --check` sem erros de whitespace. Nenhuma dependência instalada, troca de branch, alteração no backend, commit, push ou merge.

O navegador de teste usa perfil temporário: as aulas criadas pelos testes não aparecem no navegador do desenvolvedor nem alteram seus dados fictícios existentes. Não houve descarte ou migração da chave de demonstração.

## Redesign minimalista: visão geral, lista e eventos

Os indicadores usam uma grade equilibrada de três colunas no desktop e duas no celular, sem altura mínima artificial nem descrições repetidas. Título/ícone ficam na primeira linha, número/ação na segunda. Os nove botões mantêm os mesmos conjuntos de registros e ações de detalhamento.

`cardAula` preserva a apresentação completa para os detalhamentos e oferece variantes de apresentação: `lista` organiza as próximas aulas em linhas horizontais verticais; `agenda` e `semana` mostram eventos como botões compactos. O quarto argumento booleano anterior continua aceito. A lista mantém nome, horário, data, instrutor, veículo, categoria, status e detalhes, reorganizando o conteúdo no celular. Nomes e identificações longas têm truncamento visual e título completo.

Na agenda, os eventos exibem nome, intervalo, categoria e status. O clique ou Enter abre o mesmo modal completo. A semana usa pontos de status com legenda, título e nome acessível completo no botão. Data, instrutor e veículo ficam nos detalhes, sem repetição no evento. A ocupação não acrescenta outro bloco de indisponibilidade abaixo de um evento já visível; isso não modifica nenhuma regra de disponibilidade ou o oferecimento de horários livres.

Os sete dias permanecem em colunas em 1366×768 e 1920×1080, com alinhamento por `subgrid` e altura determinada pelo conteúdo. Não há limite que esconda aulas simultâneas. Em telas menores, a semana reorganiza as colunas/dias, mantendo os horários acessíveis. Campos, filtros, navegação mensal, formulário, saldo, autenticação e persistência permanecem com o mesmo comportamento.

Arquivos desta etapa: `css/operador-paineis.css`, `js/modules/operador/components/aulaOperador.js`, `agendaOperador.js`, `visaoGeralOperador.js`, `tests/operador-cfc.browser.mjs` e esta documentação. O CSS foi revisado nos blocos existentes, sem acrescentar uma segunda camada de regras de compactação duplicadas.

Medições no cenário automatizado, iguais para textos normais e longos em 1366×768 e 1920×1080:

| Componente | Altura medida |
|---|---:|
| Grade completa dos nove indicadores | 270 px |
| Cada registro de próximas aulas | 64 px |
| Faixa diária com duas aulas simultâneas | 68 px |
| Maior faixa semanal, com duas aulas simultâneas | 115 px |

O teste acrescenta cenários com aulas confirmadas/aguardando aceite, horários livres, bloqueados e nomes/recursos extensos, além de tablet (768 px) e celular (390 px). Confere ausência de transbordamento, altura dos componentes, visibilidade das duas aulas simultâneas, alinhamento semanal e abertura dos detalhes. As medidas são resultados desse cenário, não alturas fixadas no código; o conteúdo pode exigir mais espaço em outras condições.
