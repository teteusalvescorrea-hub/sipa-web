# Redefinição administrativa de senha do aluno

Na ficha do aluno, a aba **Redefinir senha**, imediatamente após **Acesso**, permite redefinir
a senha provisória. A Recepção e a Gerência precisam pertencer à unidade-base
do aluno; a unidade das aulas não concede essa autorização. O Master pode
atender qualquer unidade dentro do contexto de consulta escolhido.

A capacidade específica é `redefinir-senha-aluno`. O serviço verifica a
capacidade, o perfil, o cadastro, a unidade-base e o vínculo da conta em toda
operação. A Gestão de Acessos geral continua exclusiva do Master.

O painel mostra nome, CPF completo, situação do acesso e última redefinição.
O botão azul **Redefinir senha do aluno** abre **Confirmar redefinição de senha**,
com nome e CPF cadastrado. **Cancelar** não grava nada; **Sim, redefinir senha**
confirma a operação. Não há campos para digitar a senha provisória. Exclusivamente no
desenvolvimento local, ela é calculada pelos seis primeiros dígitos numéricos
do CPF persistido no cadastro. Não é mostrada depois da conclusão. O motivo do
atendimento é registrado automaticamente, sem incluir credenciais. A senha pessoal continua seguindo a política local
existente de 4 a 128 caracteres, com confirmação, no fluxo obrigatório de troca.

A seção informa **Ativa**, **Primeiro acesso pendente** ou **Redefinição pendente**,
calculados a partir da credencial existente, e a última redefinição em Brasília.
Durante a gravação, os botões ficam desabilitados e a ação mostra **Redefinindo…**.
O mesmo formulário não executa novamente enquanto estiver processando. Uma falha
de escrita mantém a confirmação aberta com erro, sem apresentar sucesso.
Depois da gravação, a ficha é atualizada e um modal de sucesso oferece **Entendi**.
Para conta existente, o título é **Senha redefinida com sucesso!**; para a conta
criada na operação, é **Acesso criado com sucesso!**. A pergunta de confirmação
identifica o aluno pelo nome, sem apresentar a senha atual.
Cancelar a confirmação não grava nenhuma mudança.

Não há opções de redefinição de alunos na aba Acesso nem na Gestão de Acessos
do Master. O comando genérico rejeita redefinição de uma conta de aluno existente;
as operações legítimas com contas administrativas e a criação de acesso continuam
disponíveis. Histórico e credenciais anteriores não são recriados.

## Resumo de aulas na ficha

Os cards de A, B, AB e D mostram cinco linhas: adquiridas, disponíveis para
agendamento, reservadas, realizadas e faltas. Aulas liberadas foi removida somente
da apresentação; os cálculos e campos persistidos continuam intactos. AB mantém
um card por categoria, sem exibir categorias não contratadas.

A regra previsível está centralizada em `prepararRedefinicaoAlunoLocal`, no
adaptador `dev/aluno/contaRecepcao.js`, que exige o laboratório ativo antes e
depois da derivação. Produção e modo integrado rejeitam essa operação. Parâmetros
como `?demo=1` não permitem ativá-la em um host público. Na integração, substituir
por credencial temporária aleatória ou recuperação segura validada no servidor.

São reutilizados o hash PBKDF2-SHA256 com salt aleatório e 600.000 iterações, a
versão de credencial e o fluxo existente de troca obrigatória. A operação salva
conta, revogação das sessões e eventos administrativos em um único snapshot,
sob o bloqueio de escrita já usado pelo adaptador local. Nenhuma senha é
incluída no histórico/auditoria ou mostrada novamente na conclusão.

A conta não é ativada automaticamente caso esteja desativada. Para cadastros
sem conta, a própria confirmação cria um acesso de perfil Aluno e o vincula ao
ID e CPF do cadastro já autorizado. A criação utiliza `prepararAcessoAluno`,
o mesmo mecanismo usado no cadastro inicial. Ela ocorre sob o bloqueio de escrita
do adaptador, junto da credencial, vínculo e auditoria no mesmo snapshot.
Vínculos conflitantes são rejeitados sem substituir outra conta. Nenhum aluno
é recriado. O sucesso informa quando o acesso foi criado. O aluno entra com a
provisória e precisa definir senha pessoal antes de acessar o painel.

As sete abas da ficha usam quebra de linha, sem rolagem horizontal. Tamanho de
fonte, cores e estilos permanecem compartilhados; as abas se distribuem em mais
linhas nas telas menores, mantendo todos os nomes visíveis.

## Integração futura obrigatória

Este fluxo é compatível com o protótipo local, não autenticação de produção.
O armazenamento do navegador não oferece uma barreira de segurança contra
alguém com controle do próprio dispositivo.

A API deverá autorizar o administrador pela sessão autenticada no servidor,
resolver a unidade-base pelo cadastro persistido e validar a política de senha,
confirmação e justificativa. Deve gravar a nova credencial com hash seguro,
marcar troca obrigatória e revogar sessões/refresh tokens de todos os
dispositivos atomicamente, além de auditar sem credenciais. Nunca confiar em
perfil ou unidade enviados pelo navegador.

Atualmente a invalidação alcança as sessões na mesma origem e armazenamento
local. As páginas abertas usam o verificador de sessão já existente (evento de
storage/foco e checagem periódica); operações do aluno revalidam a versão da
credencial. Revogação entre dispositivos depende da integração com o backend.
No ambiente integrado o comando não possui adaptador de senha e não é liberado.

## Testes

```powershell
node --test tests/redefinicao-aluno.test.mjs
$env:SIPA_TEST_CENARIO='redefinicao-aluno'
node tests/agenda-recepcao.browser.mjs
```

São utilizadas contas e registros exclusivamente da origem temporária do teste.

## Arquivos alterados

- `shared/js/redefinicaoAluno.js`: autorização específica, validação e registro
  atômico da redefinição, revogação e auditoria.
- `shared/js/permissoesAdministrativas.js`: nova capacidade dos três níveis.
- `nivel-1-operador/js/servicoOperador.js`: consulta segura da situação da conta
  e comando compartilhado pela Recepção, Gerência e Master.
- `dev/operador/atendimentoLocal.js` e `shared/js/entradaAdministrativa.js`:
  reutilização da derivação de senha do autenticador local existente.
- `dev/aluno/contaRecepcao.js`: estratégia temporária automática, isolada por
  ambiente e baseada no CPF já persistido.
- `nivel-1-operador/js/components/unidadeOperador.js` e
  `nivel-1-operador/js/components/redefinirSenhaAluno.js`: seção na ficha e modal.
- `nivel-1-operador/css/operador-paineis.css`: apresentação localizada do modal;
  `nivel-1-operador/css/unidade.css`: quebra de linha das sete abas da ficha.
- `shared/components/painelAdministrativo.js` e `dev/contasAdministrativas.js`:
  encaminhamento da recuperação de aluno à ficha e bloqueio do comando genérico
  de redefinição para alunos existentes, preservando contas administrativas.
- `tests/redefinicao-aluno.test.mjs`,
  `tests/redefinicao-aluno.browser.steps.mjs` e
  `tests/agenda-recepcao.browser.mjs`: testes e seleção do cenário.
- Esta documentação.

Validação integral anterior: 263 testes Node aprovados; 168 verificações do fluxo no Edge,
incluindo os três perfis, login/troca obrigatória, preservação das reservas,
temas claro/escuro, desktop/celular, auditoria e cadastro sem conta.
O cenário também compara os cinco indicadores de A/B/AB/D nos três painéis,
incluindo reservas futuras, presenças e faltas passadas. As 43 verificações do
fluxo administrativo existente também foram aprovadas.

A ficha tem sete abas, nesta ordem: Cadastro, Exames e agendamento de prova,
Aulas, Provas marcadas, Histórico, Acesso e Redefinir senha. A recuperação feita
pelo próprio aluno e a gestão de credenciais de funcionários não foram alteradas.

## Continuação final — 29/10/2026

A implementação existente foi preservada. Nesta continuação foram alterados
somente `nivel-1-operador/js/components/redefinirSenhaAluno.js` (pergunta com nome
e sucesso específico para conta criada), `tests/redefinicao-aluno.test.mjs`,
`tests/redefinicao-aluno.browser.steps.mjs` e este documento.

Passaram 7 testes Node de conta, redefinição e estrutura, e 114 verificações
focadas no Edge, sem falhas. A execução usou `SIPA_REDEFINICAO_FOCO=primeiro-acesso`
para não repetir a validação já aprovada dos cards de aulas. Foram confirmados
os três perfis, contas existentes e novas, recusa de unidade alheia, cancelamento
sem escrita, clique repetido com uma única operação, falha de gravação sem falso
sucesso, auditoria sem senha, sete abas sem rolagem lateral e temas claro/escuro.
Para cada conta criada, o aluno entrou com a provisória, definiu a senha pessoal,
teve a provisória recusada depois da troca e entrou novamente com a pessoal.

Para testar manualmente, abrir o `login.html` da pasta principal pelo Live Server
(fora de `.entrega-aluno`), entrar com uma conta administrativa autorizada e
seguir Alunos → Ficha completa → Redefinir senha → Redefinir senha do aluno.
Após confirmar, entrar como Aluno usando o CPF e os seis primeiros números dele;
a definição de senha pessoal deve aparecer antes do painel.
