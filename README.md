# SIPA — painel do Aluno

Entrega independente baseada em hml, sem incluir o PR #6 do Operador.
HTML/CSS/JavaScript com módulos ES, sem instalação de bibliotecas adicional.
Os seis painéis compartilham menu, tema e componentes de apresentação.

## Executar

Sirva a raiz por HTTP, por exemplo com o Live Server do editor em
http://127.0.0.1:5500/login.html. Não abra HTML via file://.
A URL local padrão da API é http://localhost:5080/api, definida em
js/modules/essencial/settings/config.js. Apenas no host de desenvolvimento é
aceita a configuração local sipa.API_URL. Homologação e produção precisam de URL
HTTPS publicada, a ser configurada nesse mesmo módulo. URL vazia produz estado
de indisponibilidade; não inicia um login alternativo nem dados de demonstração.
Não coloque senhas, JWT, conexão SQL ou configurações privadas neste repositório.

## Fluxo e organização

- login.html / js/login.js: CPF, máscara e validação, senha, entrar via API,
  recuperação orientada e contato da recepção. O token fica em sessionStorage;
  perfil vem da resposta autenticada. Nenhuma escolha livre de perfil.
- js/aluno.js: entrada única das seis páginas, exige sessão Aluno, carrega o
  serviço integrado e monta o painel. Sem fallback de IndexedDB.
- js/modules/essencial/service/alunoIntegrado.js: adaptação do contrato atual.
- js/modules/essencial/components/painelAluno.js: agenda manual/múltipla,
  recursos individuais/em lote, confirmação, aulas, histórico, cancelamento,
  progresso, perfil e modal de senha. Operações sem contrato ficam indisponíveis.
- components/preferenciasAluno.js: interface de agendamento automático e de
  disponibilidade para avisos; não inventa endpoints nem dados.
- components/localAula.js: localização, Maps e orientação de comparecimento.
- service/agendamentoAluno.js: regras puras de cancelamento e preferências,
  proposta automática determinística, sem persistência ou autenticação.
- service/dominioAluno.js: resumos e identificadores institucionais puros.
- js/modules/compartilhado: calendário, datas de São Paulo, feriados e grade
  extraídos como regras comuns; não importam o painel ou o demo do Operador.
- js/modules/unidades/catalogoUnidades.js: seis endereços oficiais, IDs legados
  preservados; esses IDs textuais não são GUIDs da API.
- js/sidebar-aluno.js, js/tema-aluno.js e css/tema-aluno.css: menu uniforme,
  SVGs monocromáticos, temas claro/escuro e persistência apenas do tema visual.

A autorização definitiva pertence ao servidor. Exigir perfil no navegador serve
para navegação, não substitui validação de token, dono, unidade e permissões na API.
Autoescola não é convertida automaticamente em Operador Nível 1. O Operador e o
PR #6 não foram alterados por esta entrega. main e prod não são destinos de push.

## Estado das páginas e contratos

| Área | Interface preservada | Integração nesta entrega |
| --- | --- | --- |
| Dashboard | Créditos A/B, próxima aula, localização, documentos e progresso | GET alunos/me, contratacoes e agendamentos |
| Minhas aulas | Confirmadas/canceladas, detalhes, histórico e modal de cancelamento | Listagem e GET agendamentos/{id}; cancelamento v2 indisponível |
| Meu progresso | Totais e evolução por categoria | Contratações da API quando a separação é inequívoca |
| Pacotes adicionais | Contato com a recepção e layout informativo | Sem contratação ou crédito simulado |
| Meu perfil | Dados, formação, senha e disponibilidade por dia | Dados pessoais via alunos/me; senha/preferências indisponíveis |
| Agendar aula | Categorias, unidades, calendário, horários múltiplos, pares, lote, confirmação e automático | Pendente adaptar a disponibilidade/IDs de unidades e recursos ao contrato da UI |

Não significa que todos os fluxos já estejam integrados. As flags do serviço
integrado são false para reservas, cancelamento v2, senha, antecipação e automático.
Não devem ser habilitadas só mudando uma flag: precisam de contrato implementado,
validação no backend e testes de integração. O serviço recusa essas operações.
O legado js/agendamento.js conserva chamadas existentes de horários/motoristas e
POST agendamentos para a integração futura; não é carregado junto à interface nova.
Não há endpoint inventado para salvar preferências ou alterar senha.

### Créditos e categorias

O total conjunto vem de alunos/me. Quando contratações aprovadas/encerradas têm
uma única categoria, os totais/realizadas/agendadas/restantes são somados a partir
dos valores retornados. Zero da API aparece como zero. Se um contrato compartilha
saldo entre A e B, a divisão por categoria fica não informada, sem duplicar o
saldo conjunto, sem atribuir 20 créditos e sem inferir saldo pela quantidade de
cards. O Bigas deverá fornecer saldos por categoria se essa for a regra definitiva.
Não são usados créditos, consumos ou reservas do IndexedDB de desenvolvimento.

### Agendamento e automático

A UI permite revisar propostas e recursos antes de confirmar; a confirmação
precisa de resposta da API e revalidação de saldo, conflitos e recursos no servidor.
O contrato atual possui horários e motoristas por contratação/categoria e criação
em lote. A interface nova também exige unidade e pares instrutor/veículo por aula.
É preciso mapear IDs reais (autoescola, contratação, local da aula, motorista,
veículo), disponibilidade e transação de lote, sem usar os nomes como IDs reais.
Enquanto isso não estiver validado, não aparecem horários fictícios nem sucesso.
A proposta automática preservada é separada dos avisos de antecipação e não é
executada sobre cadastros inventados quando a API falha.

### Política de cancelamento v2

Cálculo de apresentação centralizado, America/Sao_Paulo, precisão de milissegundos:
segunda a sexta contam 24h; sábado conta apenas 00h01–12h; domingo e feriados
aplicáveis não contam. Não descontar noite, almoço ou expediente comercial.
Exatamente 48h úteis está dentro; menos está fora. Motivo sempre obrigatório.
Dentro: devolução única. Fora: ciência obrigatória e sem devolução automática.
Saúde fora do prazo: 72h corridas para apresentar atestado à recepção, sem envio
médico ou aprovação automática; contato https://wa.me/55227998713181.

O contrato atual de cancelamento não confirma todos esses estados e efeitos no
saldo. Por isso o botão fica indisponível nesta entrega integrada. Modal e regra
foram preservados para integração; não prometem devolução baseada no navegador.
O servidor deverá decidir enquadramento, crédito, frequência, justificativa,
prazos, feriados por unidade, concorrência e idempotência na mesma transação.

### Endereços

As seis unidades oficiais continuam no catálogo, com pesquisa Maps e sem
geolocalização. Reservas integradas usam localAula retornado pela API como
endereço do ponto de encontro. Nunca substituir pela unidade de vínculo.
Sem endereço, não há link fictício. Comparecer 10 minutos antes, com documento
oficial com foto e LADV. Aviso único nas confirmadas; nada nas canceladas.

### Preferências e senha: integração do Bigas

A estrutura preservada de antecipação é alunoId, unidadeVinculo, ativo,
notificacoes, atualizadoEm, versaoDisponibilidade:1, disponibilidade com chaves
1–6 (segunda–sábado) contendo horários HH:mm, e diasDisponiveis. Ativar exige
um horário válido. Desativar mantém escolhas e remove elegibilidade. Preservar
histórico. A consulta ADM deve usar categoria real, escopo de unidade e permissões
no servidor. Não reservar, consumir créditos ou notificar ao salvar interesse.
A UI integrada não persiste essas escolhas no IndexedDB como se estivessem na API.
A senha aguarda serviço e política de segurança do backend; a regra de seis
caracteres do antigo laboratório não existe na aplicação entregue.

## Limpeza do laboratório

A aplicação normal não carrega authLocal, painelLocal, Master, seletores de
ambiente, geradores de créditos/recursos, limpeza de cancelamentos ou backups.
Não é possível habilitá-los com ?ambiente=local, dados em localStorage ou sessão
antiga. Não há exclusão, migração ou alteração do IndexedDB pessoal.
Fontes históricas necessárias à regressão estão em tests/fixtures/laboratorio
como arquivos .fixture de texto; só o servidor Node de teste com variável de
processo explícita as serve como módulos. Não são importadas por HTML ou módulos
de produção. Fixtures são dados sintéticos de teste, nunca contas oficiais.

## Testes

Requer Node 24 e Edge instalado; sem dependências novas. Perfil, servidor e dados
são descartáveis e isolados do navegador pessoal.

- node --test tests/*.test.mjs: domínio, política, grade e regras disponíveis.
- node tests/login.browser.mjs: entrega integrada por padrão; servidor controlado
  conforme DTOs, autenticação, leituras, estados vazio/erro, navegação e temas.
- Para regressão histórica em PowerShell: definir SIPA_TEST_LABORATORIO=1 e
  SIPA_TEST_MULTIPLAS_ONLY=1 (ou SIPA_TEST_AUTOMATICO_ONLY=1,
  SIPA_TEST_PREFERENCIAS_ONLY=1, SIPA_TEST_CALENDARIO_ONLY=1), então executar
  node tests/login.browser.mjs. Remover essas variáveis ao terminar.

Os testes de contrato usam respostas controladas no servidor do teste. Não provam
comunicação com a API real, persistência SQL ou uma implantação em homologação.
A integração real precisa ser validada pelo Bigas com API autenticada, dados
reais autorizados, CORS, HTTPS e transações. Nenhuma mudança no backend/Docker/SQL.

## Validação desta entrega

Executados: 30 testes unitários; 42 verificações do fluxo integrado com servidor
controlado; 140 de regressão de aulas múltiplas/créditos/cancelamentos; 46 do
fluxo automático; 122 de calendário/menu/temas; 21 de preferências; 32 do teste
existente do Operador de hml. Todos passaram. Também foram verificados os 43
arquivos JavaScript da aplicação quanto à sintaxe, imports do grafo integrado,
ausência de entradas/credenciais de laboratório no código de aplicação e diff
sem alterações em arquivos do Operador. Nenhuma base pessoal foi limpa.

Esses resultados validam apresentação, contratos controlados e regressões
isoladas, não uma conexão com a API real nem operações no SQL Server.
