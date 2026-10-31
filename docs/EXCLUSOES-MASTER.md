# Exclusões administrativas

No protótipo local, `dev/exclusoes.js` concentra a operação. A identidade vem
da sessão validada novamente dentro dos locks de autenticação e operação.
Somente o painel efetivo Master, com `excluir-cadastro`, pode executá-la.
Ocultar botões não é a autorização: chamadas diretas também são recusadas.
Autoexclusão da conta da sessão ativa é proibida.

Gestão de acessos apresenta Excluir perfil. A ficha do aluno (Cadastro), a ficha
do instrutor e os detalhes do veículo apresentam Excluir somente para Master.
A confirmação identifica o alvo, exige justificativa e consentimento explícito.

Referências operacionais, histórico, financeiro e vínculos com contas determinam
exclusão lógica conservadora. Os dados originais e aulas são mantidos, o cadastro
é arquivado, as credenciais associadas desabilitadas e suas sessões revogadas.
Sem dependências, o registro é removido definitivamente do snapshot ativo.
Backups preexistentes não são apagados. Não há anonimização automática.
Aulas futuras não são canceladas nem créditos devolvidos pela exclusão; o Master
deve organizar os compromissos antes de remover seus recursos responsáveis.
Cada exclusão gera auditoria com responsável, perfil, horário UTC, tipo,
identificador, modalidade e justificativa, sem senhas ou hashes.

## Limite da integração — requisito pendente

Os painéis administrativos atuais usam um adaptador local. A API consultada
não define ADM 1/2/3 nem endpoints administrativos equivalentes para todos
esses cadastros. O DELETE de veículos existente autoriza Motorista e tem
semântica de desligamento de vínculo; não foi reutilizado como exclusão Master.
Nenhuma alteração foi feita na API ou no SQL Server nesta etapa.

Não é possível garantir resistência à manipulação do armazenamento do próprio
navegador. As verificações locais não equivalem à autorização de servidor.
A exclusão administrativa integrada permanece indisponível, sem fallback local.
Antes da integração, implementar e testar no backend:

- Claims oficiais de perfil, identidade e unidade emitidas pelo servidor.
- Comandos administrativos de exclusão de aluno, instrutor, veículo e conta,
  com política Master e respostas 401/403, inclusive a chamadas HTTP diretas.
- Proibição de autoexclusão pela identidade autenticada; nunca por ID de autor
  enviado pelo frontend.
- Confirmação, controle de versão, transação, análise de dependências e política
  de retenção. Revogação de sessões e auditoria devem fazer parte da transação.
- Impedir reativação de registros excluídos pelos comandos de edição comuns.
- Rever o DELETE Motorista existente conforme o contrato definitivo, sem mapear
  Autoescola automaticamente para Master.

Testes locais não comprovam essa proteção por API. A política definitiva de
backend depende da definição/autorização do contrato administrativo.
