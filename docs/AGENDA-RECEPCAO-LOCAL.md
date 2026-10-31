# Agenda da Recepção — laboratório local

## Causa e correção

A grade já possuía eventos de clique. A ação dependia de pares válidos: instalação vazia, recursos de outra unidade, falta de almoço configurado, conflitos e filtros podiam deixar a grade sem ações. A ausência de aluno não bloqueia a disponibilidade do recurso; a elegibilidade é validada ao abrir/confirmar o agendamento. O relógio continua comparando datas civis de Brasília; horários passados não foram liberados.

O veículo agora é selecionado acima da grade. São consultados apenas recursos do serviço autorizado, sem usar parâmetros de URL para autorizar veículos. O mesmo filtro é levado ao modal e revalidado na confirmação. Vínculos explícitos de instrutor com veículos (`veiculoIds`) são respeitados. A agenda informa ausência de recursos e configuração de almoço pendente.

O modal recebe data, horário, veículo e par responsável, oferece pesquisa por nome/CPF durante digitação e mostra saldo. Alunos sem categoria, vínculo, saldo, financeiro ou etapas válidas não são oferecidos. A confirmação relê os registros sob bloqueio de escrita local, revalida as regras, debita o saldo existente, persiste e atualiza a grade. Cliques repetidos não criam outra reserva.

As projeções operacionais da pista continuam mínimas: quem não possui autorização cadastral não recebe CPF por este novo serviço. Alunos com autorização cadastral exibem CPF completo e pontuado. O próprio aluno também recebe a formatação completa; nenhuma política de autorização foi ampliada.

## Como usar

1. Abra o login de desenvolvimento e selecione ADM 1 e a unidade, ou use a entrada local já existente em `nivel-1-operador/html/operador-cfc.html?demo=1&unidade=Itaparica`.
2. Entre em **Agendas**.
3. Se faltar cenário, clique em **Preparar dados ficticios de agenda**. A ação adiciona 20 alunos, dois carros B e seus instrutores fictícios na unidade, com almoços explícitos, além de quatro reservas futuras. Não cria contas/senhas, recursos D adicionais nem altera registros anteriores. Repetir não duplica o cenário.
4. Selecione um veículo no controle acima da grade e navegue para uma data futura.
5. Clique em **Agendar**, pesquise por nome ou CPF, selecione o aluno e confirme. O nome aparece na agenda e permanece após recarga.

O cenário não configura silenciosamente os instrutores antigos. Novos recursos devem ser cadastrados manualmente quando for necessário testar uma configuração específica. A/B mantêm sábado pela manhã; D mantém sábado integral e local Tartarugão, com almoço individual e conflitos dos recursos compartilhados. Cancelamento e regras de 48 horas úteis não foram modificados.

## Produção e API

`dev/operador/cenarioAgenda.js` é fixture local explícita, injetada apenas pelo adaptador de desenvolvimento. Remover/desativar botão, fixture, login livre, seletores fictícios e demais entradas `dev/` antes da integração/produção. O build integrado continua excluindo desenvolvimento. Não são dados verificados de ICFC nem credenciais reais.

A API ainda deverá fornecer identidade/unidade autorizada, alunos elegíveis e saldos, recursos, disponibilidade, reserva atômica, prevenção de duplicidade e auditoria. As validações locais não substituem autorização no servidor. Nenhuma alteração de API, banco, worktree histórico ou sincronização Git foi feita.

## Testes executados

- 122 testes automatizados aprovados, incluindo cenário idempotente, preservação de registros, consulta sem mutação, saldo, conflito e isolamento por unidade.
- 14 verificações no navegador do novo fluxo: pesquisa nome/CPF pontuado e sem pontuação, recursos preenchidos, confirmação, clique duplicado, persistência, almoço, outro escopo, desktop/celular e claro/escuro.
- 293 verificações de regressão do Operador aprovadas, incluindo carro/moto, ficha, CPF formatado, autorização, perfil próprio, preservação de dados e ausência de erros no console.

Os testes utilizam perfil temporário, sem limpar o armazenamento pessoal nem chamar a API real.

## Arquivos alterados

Agenda: `nivel-1-operador/js/components/agendaOperador.js`, `unidadeOperador.js`, novo `reservaRecepcao.js`, `nivel-1-operador/js/servicoOperador.js`, `dominioOperador.js`, `nivel-1-operador/css/unidade.css`.

Laboratório: `dev/operador/atendimentoLocal.js`, novo `dev/operador/cenarioAgenda.js`.

Exibição de CPF do pedido anterior, preservada nesta continuidade: `nivel-1-operador/js/consultasOperador.js`, `fichaOperador.js`, `components/visaoGeralOperador.js`, `dev/aluno/acessoRecepcao.js`; listagem, ficha e acesso em `unidadeOperador.js`. As duas antigas funções de mascaramento foram substituídas pelo formatador compartilhado existente, sem alterar o armazenamento.

Testes: novos `tests/agenda-recepcao.test.mjs`, `agenda-recepcao.browser.mjs`, `agenda-recepcao.browser.steps.mjs`; ajustados `tests/operador-cfc.browser.mjs`, `operador-unidade.test.mjs`, `operador-cfc-paineis.test.mjs`. Documento: `docs/AGENDA-RECEPCAO-LOCAL.md`.
# Agenda operacional por veículo

## Cadastros administrativos e permissões do ADM 1

O serviço separa `cadastrosRecursos` (cadastros completos da própria unidade) de
`recursos` (projeção operacional necessária à agenda). `recursoAdministrativo(id)`
revalida o escopo; consultar uma moto ou ônibus na agenda não autoriza abrir seu
cadastro administrativo. A página Instrutores combina busca por nome/identificação
e categoria, limitada aos cadastros da unidade autenticada localmente.

Cadastro e edição não solicitam jornada nem situação operacional. Novos recursos
utilizam a grade operacional compartilhada já existente (`GRADE_CENTRO`); a edição
preserva exatamente disponibilidade, bloqueios, situação e vínculos armazenados.
Instrutores mantêm os cinco intervalos de almoço e a proteção de reservas futuras.
A edição de veículo permite nome/modelo e placa/identificação, sem mudar categoria,
câmbio, unidade, jornada ou operações de deslocamento.

O campo Unidade administrativa aparece para B/AB, limitado à unidade autorizada.
A usa a referência Centro de Vila Velha; D usa Cobilândia. Por segurança, a recepção
só cadastra recursos da sua unidade administrativa: cadastros A são feitos pelo
Centro e D por Cobilândia. As demais unidades continuam consultando e agendando
nessas operações, sem receber permissão administrativa. Vínculos históricos não
são migrados automaticamente.

Gestão de acessos foi retirada do menu, atalhos, painel e mapa de navegação do ADM 1.
Chamadas diretas à navegação dessa seção são rejeitadas. Contas, credenciais,
primeiro acesso, login e informações existentes permanecem preservados.

Na API futura, unidade e permissões deverão vir da identidade autenticada. Os
endpoints de consulta administrativa e edição devem validar o escopo e os campos
permitidos, separadamente da consulta operacional. ADM 2/3 e Gestão de acessos
exigem autorização própria no servidor e não estão implementados nesta etapa.

## Edição local de instrutores pelo ADM 1

A permissão local `editar-instrutor` autoriza editar somente instrutores da própria
unidade. A consulta global de moto/ônibus não concede edição externa. A unidade é
somente leitura no formulário. Nome, identificação, categoria, jornada, almoço,
situação operacional e observações usam o mesmo formulário de cadastro/edição.
IDs, origem, vínculos de veículos, bloqueios e registros anteriores são preservados.
Mudanças incompatíveis com aulas futuras confirmadas ou aguardando aceite são
rejeitadas integralmente; nenhuma reserva é cancelada, movida ou excluída.
Jornadas com múltiplas faixas não são simplificadas automaticamente: mudanças de
horário nesses cadastros exigem configuração detalhada ainda não disponível aqui.

Os cinco novos intervalos são contínuos e usam IDs `HH:MM/HH:MM`. O fim representa
o retorno, sem bloqueio universal das 12h. Os códigos legados `11-12` e `12-13`
mantêm a interpretação anterior (duas faixas bloqueadas), até edição explícita.
Não existe migração automática desses dados.

Na integração, a API deverá obter unidade/permissão da identidade autenticada,
validar os campos permitidos e verificar conflitos de reservas atomicamente antes
de atualizar o instrutor. Esta implementação permanece local, sem endpoint real.

Refinamento visual da grade: Semana é o modo inicial e mantém a escolha de modo
durante a navegação. A barra reúne seletor, setas, Hoje, período e controle
segmentado Dia/Semana/Mês. O botão Trocar veículo foi removido; utilizar o seletor
para trocar ou limpar a escolha. A data específica está no painel de filtros.
A semana possui uma única coluna fixa de horários, dias SEG–DOM com DD/MM,
células compactas e rolagem horizontal contida. As consultas e comandos de reserva
permanecem os mesmos; esta alteração não muda saldos, vínculos ou permissões.

Atualização do seletor: a seção “Consulta de agendas” e os cartões de categorias
foram removidos. O seletor nativo acessível é a única entrada para escolher o
veículo, com grupos de carros, motos e ônibus. Ao selecionar, a grade abre sem
clique adicional.

## Preparação explícita das motos de teste

No ambiente local, abrir Agendas e clicar em **Preparar dados fictícios de agenda**.
Além do cenário de carros já existente, o botão prepara globalmente seis motos
(`Moto Teste 01` a `06`) e três instrutores (`Instrutor Teste Moto 01` a `03`).
O instrutor 01 recebe 01/02, o 02 recebe 03/04 e o 03 recebe 05/06.
Esse botão continua preparando também os alunos/carros de laboratório anteriores;
não deve ser utilizado no ambiente integrado.

Os recursos têm origem `cenario-motos-local`, IDs estáveis e identificações
fictícias, sem placas ou credenciais reais. A jornada é 07h–19h de segunda a sexta,
07h–11h no sábado e intervalo 11h/12h; as regras compartilhadas continuam validando
50 minutos, domingos, feriados e conflitos. Repetir a preparação, inclusive em outra
unidade, não duplica recursos. Equivalentes identificados como fictícios são
reutilizados; vínculos divergentes interrompem a operação sem sobrescrever registros.

A função local `desativarMotosLocais` permite desativar os recursos desta origem
sem excluir reservas ou histórico; não desativa recursos reais nem os equivalentes
de outra origem. Nenhuma limpeza é executada automaticamente. Antes da integração,
desativar o laboratório, seus atalhos e os recursos fictícios.

A agenda abre sem veículo selecionado. O seletor superior reúne carros autorizados,
motos da operação central do Centro de Vila Velha e o ônibus compartilhado.
Cada opção utiliza identificação, modelo, câmbio e vínculo de instrutor existentes.
Não há criação automática de motos, instrutores ou ônibus ao abrir a tela.

As motos são consultáveis por todas as seis unidades. Novas reservas continuam
restritas aos alunos autorizados da recepção (ou ao vínculo operacional da pista
já existente). O cadastro completo, CPF e histórico administrativo de alunos
externos não são entregues pela projeção global das agendas.

Para moto, o instrutor deve declarar a moto em `veiculoIds`. A estrutura esperada
é de seis motos e três instrutores, com duas motos por instrutor. Recursos ausentes
e vínculos ausentes aparecem como pendências; não são inferidos nem preenchidos.
As duas motos compartilham a ocupação do instrutor: uma reserva bloqueia o mesmo
horário na outra moto. O serviço também verifica conflitos do aluno e saldo por
categoria antes de gravar no armazenamento local compartilhado.

A grade diferencia expediente, intervalo, veículo bloqueado, instrutor ocupado,
vínculo ausente e restrição operacional. Carros mantêm os deslocamentos declarados
e o câmbio contratado; ônibus mantém Cobilândia durante a semana e Arena Tartarugão
no sábado. Dia, Semana e Mês filtram o ID exato do veículo.

Na integração, a API deverá autorizar essas consultas e revalidar cada reserva
transacionalmente (aluno, saldo, unidade, operação, instrutor e veículo). O ambiente
local não sincroniza computadores ou navegadores diferentes.

## Restauração da aparência original — 28/10/2026

As alterações de design da última intervenção foram removidas. A agenda volta a usar o select nativo, com os grupos **CARROS DA UNIDADE**, **MOTOS — CATEGORIA A** e **ÔNIBUS — CATEGORIA D**, e o texto original das opções. O seletor personalizado e seu arquivo foram removidos.

O cabeçalho, a localização do campo de data nos filtros, a navegação, os modos Dia/Semana/Mês, a legenda, a grade, os cards, os estados das células e os espaçamentos usam novamente os componentes e CSS imediatamente anteriores. Não foram adicionados novos ícones, cores ou controles à agenda. A sidebar e as outras páginas não foram redesenhadas.

### Correção funcional preservada

O bloqueio de carro foi reproduzido em cadastro legado sem `tipoCambio`. A disponibilidade não encontrava um par compatível com Manual/Automático; a edição anterior, por sua vez, impedia preencher o câmbio mesmo quando ausente.

Para regularizar um registro assim, utilize o caminho já existente: **Veículos e recursos → Ver detalhes → Editar veículo**. Informe o câmbio ausente e confira o instrutor responsável. A gravação mantém o mesmo ID, registra a alteração e atualiza a disponibilidade. Não há botão de regularização novo na agenda.

O tipo de câmbio não é adivinhado. Um valor já configurado continua protegido; configurações incompatíveis com reservas futuras são recusadas. Vínculos ambíguos exigem seleção explícita no formulário existente. Não são recriados recursos nem alteradas aulas históricas ou créditos durante essa regularização.

Conflitos de veículo, instrutor e aluno, horário passado, almoço, expediente, categoria, escopo e regras de deslocamento continuam sendo verificados no agendamento. Motos e ônibus permanecem na mesma agenda e no mesmo armazenamento compartilhado.

### Arquivos desta restauração

- `nivel-1-operador/js/components/agendaOperador.js`: restauração dos elementos e comportamento visual anteriores.
- `nivel-1-operador/js/components/unidadeOperador.js`: remoção do atalho de regularização adicionado à agenda.
- `nivel-1-operador/css/unidade.css`: remoção exclusiva do bloco CSS acrescentado na última intervenção.
- `nivel-1-operador/js/components/seletorAgenda.js`: removido; não tem mais consumidores.
- `tests/agenda-acabamento.browser.steps.mjs`: verificação adaptada à agenda original e à edição pelo caminho existente.
- Este documento.

As correções funcionais de `dominioOperador.js` e `cadastroRecurso.js`, assim como seus testes de lógica, foram preservadas. Autenticação, Gerência/Master, atestados, relatórios, API, SQL Server e worktrees históricos não foram revertidos.

### Testes

O cenário `agenda-acabamento` verifica o select nativo e a ausência do componente personalizado, a reprodução do bloqueio, a edição do mesmo carro pelo formulário existente, reserva efetiva, grade, ficha/histórico, recarga, consulta no Aluno/Instrutor/Gerência/Master e reservas de moto/ônibus. As capturas em temas claro/escuro e celular mostram a aparência restaurada.

Também são executados os testes focados de regularização, regras de carro/deslocamentos e Recepção, além da verificação estrutural de imports. Os testes usam perfil descartável do Edge e dados de cenário explícitos; não limpam nem modificam o armazenamento do navegador pessoal.

Resultado final desta restauração: **23 testes de lógica**, **4 estruturais** e **66 verificações de navegador aprovados**, sem erros JavaScript capturados. As capturas finais foram inspecionadas para conferir o seletor nativo, os controles e a grade originais. Uma falha intermediária causada pela codificação de textos no próprio teste foi corrigida antes da execução aprovada.

```powershell
$env:SIPA_TEST_CENARIO = 'agenda-acabamento'
node tests/agenda-recepcao.browser.mjs
node --test tests/agenda-recepcao-acabamento.test.mjs tests/operacao-carro.test.mjs tests/agenda-recepcao.test.mjs tests/estrutura.test.mjs
```

## Compatibilidade dos carros antigos e linhas pretas — atualização

A disponibilidade estrita continua exigindo câmbio para confirmar a compatibilidade do aluno, mas a grade agora pode consultar a disponibilidade **física** do carro desconhecido. Essa consulta não autoriza reservar sem câmbio: `agendarAula` continua recalculando os pares em modo estrito, sem aceitar a opção de consulta física como autorização.

Ao clicar em um horário fisicamente livre de carro sem câmbio confiável, o fluxo abre o formulário existente para preencher o campo no mesmo veículo. Após salvar, retoma a escolha de aluno para o horário solicitado. Cancelar a edição não cria uma reserva. A confirmação mantém saldo, categoria, câmbio, operação, jornada, almoço e conflitos.

### DEMO-B1 e DEMO-B2

Na abertura local da Recepção, uma correção idempotente regulariza apenas os veículos antigos identificados de forma consistente pelo cenário `agenda-lab`: ID correspondente, placa/identificação B1/B2 e origem `cenario-agenda-local` ou marcador do cenário explícito. A definição desse cenário estabelece carros manuais. Nome ou placa isolados não bastam.

A correção preserva IDs, vínculos, aulas, alunos e créditos e registra a alteração do recurso. Não modifica câmbio já preenchido nem um veículo real desconhecido. Evidência conflitante de câmbio em reservas, inclusive históricas, impede a inferência automática. O escopo e a permissão de edição do operador continuam sendo exigidos.

### Divisórias

As regras CSS novas são restritas ao elemento da Recepção `#operador-conteudo`. Alteram somente a cor das bordas existentes para `#000000`. No mês, o espaçamento original de 1 px usa fundo preto para desenhar as divisórias. Não mudam dimensões, fontes, fundos dos dias, indicadores, seletor ou botões; a agenda dos outros administradores não recebe esse CSS.

### Arquivos desta atualização

- `dev/operador/compatibilidadeCarro.js` e `atendimentoLocal.js`: compatibilidade local controlada dos registros de teste existentes.
- `nivel-1-operador/js/dominioOperador.js`: consulta física separada da autorização estrita de reserva.
- `nivel-1-operador/js/components/unidadeOperador.js` e `reservaRecepcao.js`: consulta da grade e regularização dentro do fluxo de agendamento.
- `nivel-1-operador/css/unidade.css`: somente as divisórias pretas da Recepção.
- `tests/compatibilidade-carros-legados.test.mjs`, `tests/carros-legados.browser.steps.mjs`, `tests/agenda-acabamento.browser.steps.mjs` e `tests/agenda-recepcao.browser.mjs`.
- Este documento.

### Resultado dos testes

**227 testes de lógica aprovados**, sem falhas. **78 verificações de navegador aprovadas** no cenário `carros-legados`, incluindo criação efetiva de reservas no DEMO-B1 e DEMO-B2 regularizados automaticamente, veículo desconhecido regularizado dentro do agendamento, categoria B, saldo, conflitos, recarga, ficha/histórico, Aluno/Instrutor/Gerência/Master e operações A/D.

As linhas pretas de 1 px foram verificadas em Dia/Semana/Mês e tema escuro. Um teste compara o layout com e sem as duas regras CSS: dimensões, fontes, cores dos textos e fundos das células permanecem iguais. Capturas da grade foram inspecionadas. Todos os testes usam navegador descartável e dados explícitos de cenário, sem limpar ou acessar os dados pessoais do usuário.

```powershell
$env:SIPA_TEST_CENARIO = 'carros-legados'
node tests/agenda-recepcao.browser.mjs
```

