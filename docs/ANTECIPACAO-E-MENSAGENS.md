# Antecipação e mensagens

## Funcionamento local

- O aluno ativa o interesse geral em Meu perfil ou Minhas aulas. Não informa datas nem horários. Preferências antigas são preservadas, mas deixam de limitar a consulta.
- Recepção e Gerência operam a unidade principal autorizada; Master consulta seu escopo global ou a unidade selecionada. Os recursos compartilhados de A e D continuam usando as regras existentes. O acesso aos alunos permanece limitado ao vínculo administrativo.
- A equipe consulta vagas, seleciona uma ou várias, consulta os elegíveis e confirma os canais/destinatários. Cada aluno recebe somente as vagas válidas para si. Créditos, bloqueios, compatibilidade, jornada, almoço e conflitos são verificados pelas regras existentes em uma validação sem persistir reserva.
- Campanhas possuem identificador e assinatura do pedido. Repetir o mesmo pedido não duplica ofertas ou mensagens; reutilizar o identificador com outro conteúdo é rejeitado. Nova campanha explicitamente confirmada é uma nova comunicação.
- Ofertas ficam em `ofertasAntecipacao`; notificações reutilizam `aluno.avisosInternos`. Leituras ficam separadas em `aluno.leiturasMensagens`, sem reescrever o conteúdo. Avisos antigos continuam acessíveis. Desativar interesse não remove mensagens ou ofertas.
- SIPA registra uma notificação interna local como enviada após persistir a operação. Não significa entrega em outro dispositivo. Somente a conta do aluno pode marcar suas mensagens como lidas. O histórico mostra os resultados por destinatário/canal e preserva campanhas anteriores.
- WhatsApp utiliza o telefone do cadastro (formato brasileiro com DDD), normalizado para 55 + DDD + número. Números ausentes/inválidos e `preferenciasContato.whatsapp === false` ou `antecipacao.whatsapp === false` impedem a preparação/abertura. A fila mantém status **preparado**, nunca enviado/entregue. Abrir conversa não é confirmação de envio. Não há automação de WhatsApp Web nem integração oficial de disparos encontrada nos serviços atuais.
- A oferta não garante reserva. A confirmação de uma aula continua exclusivamente no fluxo normal, que revalida disponibilidade. O histórico indica expiração após passarem todos os horários ofertados.

## Integração necessária

Não existe comunicação entre computadores ou celulares por armazenamento local. Os testes usam o mesmo armazenamento/origem do navegador, com sessões distintas de equipe e aluno.

Antes da produção, implementar na API autenticada:

1. Leitura/alteração da preferência da própria conta, com autorização no servidor.
2. Consultas de vagas e elegibilidade com escopo administrativo derivado da sessão; as unidades e IDs recebidos do cliente não concedem autorização.
3. Criação transacional e idempotente de campanha, destinatários e notificações; revalidar disponibilidade, preferência, categoria, saldo e vínculo no instante do envio. Não reservar recursos ou consumir créditos nessa transação.
4. Caixa de mensagens e marcação de leitura restritas ao destinatário autenticado, com paginação e histórico de auditoria. Notificações push e atualização entre dispositivos exigem infraestrutura compartilhada.
5. Integração oficial e autorizada com o provedor WhatsApp para eventual envio em lote. Aplicar consentimento, limites e políticas do provedor; somente confirmações confiáveis/webhooks podem mudar estados para enviado/entregue.

O ambiente integrado mantém a caixa identificada como indisponível até existir contrato de mensagens. Não usa dados demonstrativos como fallback. Não houve mudança de API ou banco nesta entrega.

## Arquivos desta entrega

Regras, serviço com adaptador e apresentação compartilhada:

- `shared/js/antecipacaoAdministrativa.js`
- `shared/js/ofertasAntecipacao.js` (novo)
- `shared/js/servicoAntecipacao.js` (novo)
- `shared/js/mensagensAluno.js` (novo)
- `shared/js/permissoesAdministrativas.js` (somente a capacidade de antecipação da Recepção)
- `shared/components/antecipacaoPainel.js` (novo)
- `shared/components/painelAdministrativo.js` (somente o conteúdo de Antecipação)
- `shared/css/antecipacao.css` (novo, estilos restritos aos componentes da funcionalidade)

Entrada da Recepção e adaptadores locais:

- `nivel-1-operador/js/servicoOperador.js`
- `dev/operador/atendimentoLocal.js`
- `dev/aluno/servicoRecepcao.js`
- `dev/aluno/contaRecepcao.js` (leitura de mensagens próprias, sem alterar credenciais)
- `dev/aluno/authLocal.js` (preferência geral, preservando o armazenamento legado)
- `dev/aluno/painelLocal.js`
- `dev/aluno/acessoRecepcao.js`

Painel do Aluno:

- `aluno/html/mensagens.html` (novo, reutiliza a sidebar existente)
- `aluno/js/mensagens.js` (novo)
- `aluno/js/components/mensagensAluno.js` (novo)
- `aluno/css/mensagens.css` (novo)
- `aluno/js/components/preferenciasAluno.js`
- `aluno/js/sidebar-aluno.js` (link Mensagens)
- `aluno/js/tema-aluno.js` (inclui Mensagens no tema existente)

Validação e documentação:

- `tests/antecipacao-mensagens.test.mjs` (novo)
- `tests/antecipacao.browser.steps.mjs` (novo)
- `tests/agenda-recepcao.browser.mjs` (registro do cenário isolado)
- `tests/administracao.test.mjs` (interesse geral substitui a expectativa antiga de horários)
- `tests/administracao.browser.steps.mjs` (fluxo atualizado de antecipação)
- Este documento.
