# Operação de carro — contrato local e integração pendente

As regras estão em `shared/js/operacaoCarro.js`. Identificadores persistidos de câmbio: `manual` e `automatico`; a apresentação usa Manual e Automático.

- Segunda: Santa Rita → Itaparica.
- Terça: Terra Vermelha → Centro de Vila Velha (`Vila Velha` no catálogo).
- Quinta: Cobilândia → Centro de Vila Velha.
- Demais dias: local habitual; domingo fechado. Expediente, almoço e feriados continuam no cálculo compartilhado.

## Cadastro e operação local

Novos alunos B/AB exigem `tipoCambio` e `unidadeCarro`. Automático aceita somente Cobilândia e Centro; Manual aceita as seis unidades do catálogo. Escolher uma unidade no cadastro não cria nem habilita recursos: sem recursos compatíveis não existem horários disponíveis. Créditos continuam disponíveis a partir do cadastro, sem segunda liberação.

O ADM 1 não altera o câmbio de alunos existentes. A transferência de unidade mantém o câmbio e limita os destinos do automático. Alunos e veículos antigos sem câmbio não são migrados nem presumidos manuais. Os registros e o restante do painel continuam acessíveis; novas reservas B exigem regularização autorizada, pendente do ADM 2/API.

No formulário existente de cadastro de recurso, cada veículo B exige câmbio. Instrutor e veículo precisam ter a operação de deslocamento explicitamente marcada quando forem atender fora do local habitual. O campo `operacoesCarro` guarda declarações `{origem, destino, dia}`; somente operações oficiais envolvendo a unidade responsável pelo recurso são aceitas. Não é autorização de consulta irrestrita ao catálogo do destino. Para regularizar recursos existentes, não há edição administrativa irrestrita neste painel; será necessário o fluxo autorizado futuro.

Exemplo: na quinta-feira, selecionar a operação Cobilândia → Centro nos recursos que efetivamente a atendem. O aluno de Cobilândia não recebe automaticamente todos os carros/instrutores do Centro. Mesmo com a operação marcada, jornada, almoço, vínculo de veículo, bloqueios e conflitos são obrigatórios. Configurar uma operação não muda horários nem cria recursos. Nenhum dado fictício adicional é criado automaticamente por esta implementação.

Uma reserva nova B guarda `tipoCambio`, `unidadeCarro` (origem cadastral) e `localReal` (snapshot do local físico). `unidade` mantém o escopo administrativo de origem; a ocupação é controlada pelos IDs únicos de instrutor/veículo, inclusive nas consultas autorizadas do destino. Não existe cópia da reserva no destino. Snapshots históricos e matrículas não são alterados quando a regra semanal é apresentada.

O histórico inicial registra câmbio e unidade escolhidos. Transferências autorizadas continuam registrando origem, destino, data e responsável; o deslocamento semanal não gera transferência nem evento cadastral duplicado.

## Pendências para a API do Bigas

Esta implementação funciona nos serviços locais existentes, sem alterar API, SQL Server ou Docker. O backend integrado ainda precisa confirmar/implementar o contrato:

1. Persistir e retornar `tipoCambio` e `unidadeCarro` no cadastro, login/contexto do aluno, ficha e perfil, com validação de categoria/unidade.
2. Persistir câmbio do veículo e operações autorizadas dos recursos. A configuração deve exigir autorização do servidor, nunca aceitar a unidade do navegador como credencial.
3. Disponibilidade e reserva devem resolver a operação por data no servidor, aplicar câmbio e todas as restrições, verificar conflito global de recursos e saldo em transação, com idempotência. A consulta deve retornar o local físico e sua localização.
4. Persistir o snapshot da reserva, origem e destino sem duplicar o agendamento ou descontar crédito duas vezes. Consultas no destino devem respeitar escopo e anonimizar ocupações de terceiros.
5. Implementar regularização/alteração de câmbio exclusivamente no fluxo autorizado do ADM 2. Registrar valor anterior, novo valor, data, responsável e identificador idempotente do evento, preservando reservas e tentativas anteriores. Não existe edição desse campo pelo ADM 1 nesta entrega.
6. Antes da entrega, desativar demonstrações, login livre e exceções de CPF conforme o checklist pré-produção já existente. Não executar essa limpeza nos dados locais agora.

## Validação

`node --test tests/operacao-carro.test.mjs` cobre cadastro B/AB, câmbio ausente, destinos do automático, os três deslocamentos e dias habituais, filtragem de recursos, vínculos, almoço, jornada, bloqueios, conflitos, saldos, permissões e preservação.

`$env:SIPA_TEST_CENARIO='carro'; node tests/agenda-recepcao.browser.mjs` usa perfil descartável para cadastrar alunos e recursos pela interface e testar login, ficha, perfil, consulta, reserva, revisão, confirmação, Minhas aulas, mapa, dashboard, conflito entre dois câmbios e temas/resoluções. Não utiliza os dados do navegador pessoal.
