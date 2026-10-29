# Escala visual compartilhada

As páginas mantidas carregam `shared/css/escala.css` após suas folhas específicas.
O atributo `data-sipa-escala` identifica a apresentação do perfil, sem conceder
permissões ou ativar demonstrações. A escala funciona com zoom do navegador em
100%, sem `zoom` CSS ou transformação do documento.

## Medidas de referência

| Componente | Medida desktop |
| --- | --- |
| Fonte base | 14,3px |
| Título principal | 29,7px |
| Título de seção | 16,5px |
| Título de modal | 25,3px |
| Controles e labels | 13,2px |
| Campo | 44px |
| Ação principal | mínimo 45px |
| Ação compacta | mínimo 38px |
| Botão de ícone | 42px |
| Sidebar | 244px |
| Item de navegação | mínimo 46,2px |
| Padding de card | 20px; 16px no celular |

Os valores estão nas variáveis `--sipa-*`. Textos longos podem aumentar a altura
dos botões, sem cortes. No login, os 44px incluem a borda do contêiner do input.
Títulos menores e espaçamentos adaptados são usados no celular.

## Aplicação

- Login e seus diálogos; páginas públicas existentes.
- Aluno: Início, Agendamento, Minhas aulas, Meu progresso, Pacotes adicionais,
  Meu perfil e Mensagens.
- Instrutor: Início, Minha agenda, Histórico e Meu perfil.
- Recepção, Gerência e Master: todas as seções existentes.

`escala-administrativa.css` concentra as adaptações específicas do componente
administrativo compartilhado. `gerencia.css` e `master.css` permanecem como
entradas de compatibilidade; as páginas atuais usam a entrada global.

As folhas dos perfis continuam definindo os layouts próprios e as cores. As
grades das agendas, seus bloqueios, linhas, cores de status e alturas iguais
do Instrutor são preservados. Calendários e cartões de seleção conservam sua
geometria própria. O logotipo e o rodapé das sidebars não rolam: somente a
navegação central rola, sem barra visível e com acesso por teclado.

## Validação reproduzível

```powershell
node --test tests/*.test.mjs
$env:SIPA_TEST_CENARIO='escala-global'
node tests/agenda-recepcao.browser.mjs
$env:SIPA_TEST_CENARIO='master-visual'
node tests/agenda-recepcao.browser.mjs
```

Os testes de navegador usam Edge e uma origem/perfil temporários, com registros
exclusivos do teste. Não utilizam as contas nem o armazenamento do usuário.
O cenário global compara medidas e percorre os seis perfis nos temas claro e
escuro e nas resoluções 1366×768, 1440×900, 1920×1080 e 390×844. Também verifica
modais, seleção de recursos e gravação de reserva com consumo de um crédito.

Nenhuma política de autenticação, operação administrativa, regra de agenda ou
persistência foi transferida para essa camada de apresentação.

## Arquivos desta alteração

- CSS: `shared/css/escala.css`, `shared/css/escala-administrativa.css`,
  `shared/css/sidebar.css`, `nivel-2-gerencia/css/gerencia.css`,
  `nivel-3-master/css/master.css`.
- Entradas públicas: `index.html`, `login.html`, `cadastro.html`, `autoescola.html`.
- Aluno: `aluno/html/dashboard.html`, `agendamento.html`, `minhas-aulas.html`,
  `meu-progresso.html`, `pacotes.html`, `meu-perfil.html`, `mensagens.html`.
- Demais perfis: `instrutor/html/instrutor.html`,
  `nivel-1-operador/html/operador-cfc.html`, `nivel-2-gerencia/html/gerencia.html`,
  `nivel-3-master/html/master.html`.
- Testes: `tests/estrutura.test.mjs`, `tests/agenda-recepcao.browser.mjs`,
  `tests/escala-global.browser.steps.mjs`, `tests/escala-gerencia.browser.steps.mjs`,
  `tests/master-visual.browser.steps.mjs`.
- Esta documentação: `docs/ESCALA-VISUAL.md`.

Resultados: 261 testes Node; 229 verificações do cenário global; 66 de navegação
do Master; 126 de escala/modais/agenda administrativa; 43 do fluxo administrativo.
Após o ajuste final de especificidade dos títulos do Instrutor, mais 64
verificações focadas nas quatro seções, quatro resoluções e dois temas passaram.
