# Categoria D e almoço individual — desenvolvimento local

## Contrato e localização

Categorias de aula: A (Moto), B (Carro), D (Ônibus). Matrículas aceitas: A, B, D e AB. Não foram criadas combinações AD, BD ou ABD, nem um código numérico D para a API.

`shared/js/categorias.js` centraliza nomes, matrículas, opções de almoço e os locais de ônibus. A unidade administrativa D é Cobilândia. O local físico é calculado pela data civil de Brasília:

- Segunda a sexta: KM Cobilândia — Av. Jacinto Admiral, 125 – Cobilândia, Vila Velha – ES, CEP 29111-470.
- Sábado: Arena Tartarugão — Ginásio Poliesportivo Presidente João Goulart. Ponto oficial e coordenadas definidos exclusivamente em `shared/js/categorias.js` (`LOCAIS_ONIBUS.sabado`).
- Domingo: fechado.

Tartarugão não é uma sétima unidade. Novas reservas D guardam `localReal` com o local físico, preservando `unidade` administrativa. A apresentação de cada reserva D resolve o local pela sua própria data, inclusive para snapshots antigos, sem regravar registros. O vínculo administrativo não é apresentado como local físico. O botão Ver localização abre o link exato fornecido em nova aba; não pesquisa o endereço antigo. As coordenadas ficam na configuração e no link, sem aparecer como endereço na interface. Nos dias úteis, o endereço e a localização permanecem inalterados. Datas ISO com fuso são convertidas para Brasília antes da escolha do local.

## Disponibilidade e almoço

Inícios em horas cheias: segunda a sexta, 07:00 a 18:00. Sábado: A/B somente 07:00 a 10:00; D de 07:00 a 18:00, respeitando o almoço individual. Cada aula dura 50 minutos. Feriados, conflitos de aluno/instrutor/veículo, categoria, unidade e disponibilidade continuam sendo validados. A grade D não substitui disponibilidades específicas já cadastradas nem cria outra agenda: todos os alunos consultam os mesmos recursos de Cobilândia e seus conflitos, independentemente da unidade de origem.

Correção do sábado D: regras compartilhadas, consulta/confirmação do Aluno, pares/agenda da Recepção, jornada do Instrutor e preferências de antecipação reconhecem a jornada integral. Novos cadastros manuais D na Recepção preservam no sábado o intervalo informado; cadastros A/B continuam limitados à manhã. Não houve alteração automática de jornadas ou reservas existentes.

O cadastro manual de instrutor exige `horarioAlmoco`, sem opção preselecionada:

- `11-12`: bloqueia inícios às 11:00 e 12:00; pode oferecer 13:00.
- `12-13`: bloqueia inícios às 12:00 e 13:00; pode oferecer 11:00.

12:00 é bloqueado nas duas opções. A disponibilidade da unidade é a união dos pares realmente válidos, não um bloqueio global de 11:00 ou 13:00. O mesmo cálculo é aplicado à consulta e à confirmação de novas reservas. A agenda do Instrutor mostra suas próprias faixas bloqueadas.

Instrutores legados sem configuração não recebem almoço automaticamente. Novas reservas dependentes dos horários 11:00, 12:00 e 13:00 ficam bloqueadas para eles, com indicação de configuração ausente; os demais horários continuam sujeitos às regras normais. Aulas antigas inconsistentes são preservadas e sinalizadas. O ADM 1 não recebe edição livre de almoço existente. A correção administrativa desse legado depende de autorização futura e tratamento dos conflitos.

## Uso local e dados

No painel da Recepção, use o cadastro manual em Instrutores ou Recursos. Informe nome, identificação, categoria, disponibilidade e, para instrutor, almoço obrigatório. Veículo D precisa de categoria D e vínculo Cobilândia. Nenhum novo recurso D é gerado automaticamente. No laboratório do Aluno, o formulário local de recursos também oferece D e exige almoço para instrutor.

No cadastro do aluno, D tem quantidade de ônibus separada. Quantidade adquirida disponibiliza saldo automaticamente, sem segunda liberacao financeira. Os resumos, reservas, presenças, faltas, progresso e perfil tratam D separadamente de A/B. Provas incluem prática de ônibus, resultados e novas tentativas sem sobrescrever as anteriores. As seis abas da ficha e as limitações do ADM 1 foram preservadas.

Existem dois repositórios locais: snapshot da Recepção e IndexedDB do login livre do Aluno. A conta gerada pela Recepção agora usa o painel original completo, por `dev/aluno/servicoRecepcao.js`, lendo e gravando diretamente no snapshot com a identidade autenticada. Não copia cadastros para o IndexedDB. Exibe as quantidades adquiridas registradas e preserva saldos explícitos, inclusive zero, descontando as reservas na mesma fonte. O agendamento exige créditos e as verificações financeiras/etapas já previstas; nenhum resultado é aprovado automaticamente. A integração definitiva com a API permanece pendente. Ver `docs/ALUNO-CONTA-RECEPCAO.md`.

Pacotes continuam informativos/contato. Não foram inventados preço D, checkout, pagamento ou liberação de créditos. A regra existente de cancelamento de 48 horas úteis foi preservada.

## Integração e decisões pendentes

A API não foi modificada. Ainda precisa definir o contrato D (inclusive enum/DTO), persistência de local físico e almoço, autorização por unidade, disponibilidade e conflitos no servidor, reserva/créditos atômicos, auditoria e resultados de provas. Integrações ICFC/DETRAN não são verificações reais neste laboratório. As validações locais não substituem autorização no backend.

Creditos informados no cadastro ficam disponiveis automaticamente. O antigo atalho de liberacao foi removido/desativado. Bloqueios administrativos explicitos, exames, recursos e conflitos continuam validados. Ver contrato definitivo em ALUNO-CONTA-RECEPCAO.md.

A hierarquia de referência é somente ADM 1 — Recepção, ADM 2 — Gerência da Loja, ADM 3 — Master. Os painéis 2 e 3 não foram implementados. ADM 1 não ganhou edição/exclusão de registros anteriores.

Decisões administrativas restantes: configurar explicitamente o almoço dos instrutores antigos; autorizar e tratar conflitos antes de trocar almoço existente; informar contratação/saldo D por fluxo autorizado; definir valores comerciais e integrar creditos automaticos do cadastro; homologar a integração entre cadastro da Recepção e conta agendável do Aluno.

## Preparação para produção

Preservados para desenvolvimento, devem ser removidos ou desativados na entrega integrada:

- `shared/js/configuracao.js`: flag explícita de desenvolvimento; a preparação integrada deve fixá-la em false e excluir `dev/`.
- `dev/login.js` e `dev/sessao.js`: login livre local, seletor de perfil e unidade fictícia; não são autenticação real.
- `dev/aluno/authLocal.js`, `painelLocal.js` e `acessoRecepcao.js`: contas/sessões IndexedDB, recursos locais, ações explícitas de laboratório, dados de teste e senha provisória local. Não promover credenciais/procedimentos fictícios para a API.
- `dev/instrutor/`: entrada demonstrativa, dados fictícios e seleção explícita de origem dos registros locais.
- `dev/operador/`: operador fictício, unidade demonstrativa e snapshot local. O seletor não é autorização de troca de unidade real.
- Fixtures em `tests/`: recursos, CPF, placas, saldos e aulas exclusivos de testes descartáveis; não são cadastros de produção.

Não foram apagados IndexedDB, LocalStorage, worktrees, contas ou registros existentes. Não foram alterados API, SQL Server ou Docker.

## Validação executada

- `node --test tests/*.test.mjs`: 121 testes aprovados após a correção do sábado D.
- `node --test tests/categoria-d-almoco.test.mjs`: 12 aprovados, incluindo reservas às 14h, 15h, 16h, 17h e 18h, ambos os almoços, A/B restritos à manhã e conflito entre alunos de unidades diferentes.
- `node tests/operador-cfc.browser.mjs`: 293 verificações aprovadas.
- `node tests/reorganizacao.browser.mjs`: 181 verificações aprovadas.
- `node tests/categoria-d.browser.mjs`: 20 verificações aprovadas: cadastro, recursos manuais, provas D, reservas de semana/sábado, local/Maps, almoço, presença/falta, saldos, Dashboard, progresso e perfil, telas 1440/390 e temas claro/escuro.

Os testes de navegador usam servidor e perfil temporários; não limpam o perfil pessoal. As últimas correções de rótulos e proposta automática foram verificadas adicionalmente pelo mesmo teste D. Não houve chamada à API real.

## Arquivos desta implementação

Novos:

- `shared/js/categorias.js`
- `nivel-1-operador/js/components/cadastroRecurso.js`
- `tests/categoria-d-almoco.test.mjs`
- `tests/categoria-d.browser.mjs`
- `tests/categoria-d.browser.steps.mjs`
- `docs/CATEGORIA-D-ALMOCO.md`

Compartilhados: `shared/js/disponibilidade.js`, `shared/components/localAula.js`.

Recepção: `nivel-1-operador/js/dominioOperador.js`, `fichaOperador.js`, `servicoOperador.js`; componentes `unidadeOperador.js`, `fichaEvolucao.js`, `agendaOperador.js`, `aulaOperador.js`; `dev/operador/atendimentoLocal.js`, `repositorioDemo.js`.

Instrutor: `instrutor/js/agenda.js`, `instrutor/js/painel.js`.

Aluno: `aluno/js/domain/dominioAluno.js`, `agendamentoAluno.js`; `aluno/js/components/painelAluno.js`, `preferenciasAluno.js`; `aluno/js/dashboard.js`, `aluno/js/services/alunoIntegrado.js`; `dev/aluno/authLocal.js`, `painelLocal.js`, `acessoRecepcao.js`.

Testes existentes ajustados para almoço explícito: `tests/login-local.test.mjs`, `instrutor-agenda.test.mjs`, `operador-cfc-regras.test.mjs`, `operador-cfc-paineis.test.mjs`, `operador-unidade.test.mjs`, `reorganizacao.browser.mjs`.

Alterações anteriores de organização presentes no workspace não pertencem a esta entrega. Nenhuma operação de sincronização, commit, push ou merge foi executada.
