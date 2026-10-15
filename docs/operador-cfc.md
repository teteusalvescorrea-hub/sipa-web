# Operador de CFC — nível 1

## Escopo entregue

Interface em `operador-cfc.html`, com as cores e variáveis de `css/meu-progresso.css`, a sidebar existente, fonte Inter e adaptação para desktop e celular. A estrutura fica no `template#operador-template` e o componente de navegação em `js/modules/operador/components/painelOperador.js`.

O acesso normal mostra **Acesso ainda não habilitado**. O template não é montado, não há prévia pública por parâmetro/armazenamento local e nenhuma role é tratada como operador. O login existente de Aluno e Autoescola não foi alterado. Não há dados fictícios, chamadas administrativas, senhas geradas, links de acesso emitidos ou persistência de cadastros no navegador.

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

As autorizações foram conferidas nos controllers de Usuarios, Alunos, Unidades, Vinculos e Veiculos. Não houve alteração na API nem no banco.

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
```

Requer Node com `WebSocket` global e Edge instalado. Para outro caminho do navegador, configure `SIPA_TEST_BROWSER`. O teste inicia um servidor temporário em loopback e um perfil headless isolado, sem acessar a API, o banco ou a sessão do navegador do usuário.

O teste monta o template somente em uma rota do seu servidor efêmero para avaliar a apresentação. Essa rota não existe no aplicativo. No endereço normal `operador-cfc.html`, verifica acesso fechado para visitante e para os perfis existentes, preservação das sessões, navegação, formulário pendente, consultas e emissão desabilitadas, teclado, layout móvel e ausência de requisições administrativas. As capturas visuais ficam na pasta temporária indicada ao final da execução.
