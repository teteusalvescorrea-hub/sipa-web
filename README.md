# SIPA — frontend para integração

HTML, CSS e JavaScript nativos, com módulos ES. Fonte completo dos painéis
Aluno, Instrutor, Recepção (ADM 1), Gerência (ADM 2) e Master (ADM 3).

**Preparado para integração; ainda não homologado para produção.**
Leia [o contrato e as pendências de integração](ENTREGA-FRONTEND-SIPA.md) e
[o plano de entrega](docs/PLANO-ENTREGA-BIGAS.md).

## Executar

Abra a raiz deste projeto no VS Code. No `index.html` ou `login.html`,
clique em **Open with Live Server**. Endereço habitual:
`http://127.0.0.1:5500/index.html`. Não usar `file://` nem entradas dos
worktrees históricos.

O laboratório está **desligado por padrão**, inclusive em localhost.
Parâmetros de URL e dados antigos do navegador não liberam demonstrações.
O login exige a API e um perfil autorizado; não há conta pré-carregada ou
senha universal. Os três perfis administrativos aguardam contrato de identidade,
unidade e permissões no servidor. Autoescola não equivale a Master.

A API local está configurada em `shared/js/config-api.js`, atualmente
`http://localhost:5080/api`. Homologação/produção precisam de URL e CORS próprios.
Não inserir credenciais, tokens ou configurações de banco no frontend.

## Estrutura

| Pasta | Conteúdo |
|---|---|
| `index.html`, `login.html`, `css/`, `js/` | Entradas públicas e autenticação |
| `aluno/` | Dashboard, agendamento, aulas, progresso, perfil, pacotes e mensagens |
| `instrutor/` | Início, agenda, frequência, histórico e perfil |
| `nivel-1-operador/` | Recepção e atendimento da unidade |
| `nivel-2-gerencia/` | Gerência da unidade-base |
| `nivel-3-master/` | Administração global |
| `shared/` | Regras, serviços HTTP, componentes, temas e PDF |
| `dev/` | Adaptadores de referência e preparação; fora da distribuição pública |
| `tests/` | Testes e fixtures sintéticas isoladas; fora da distribuição pública |
| `docs/` | Contratos, regras e relatórios |

Os worktrees históricos permanecem intactos e fora da entrega. A navegação atual
não depende deles. Os caminhos antigos movidos estão em `docs/movimentacoes.json`.

## Testes e distribuição

Node.js 24; Microsoft Edge para os testes de navegador.

```powershell
node tests/executar.mjs
node tests/integrado.browser.mjs
node tests/auditoria-etapa2.mjs
node dev/preparar-integrado.mjs "$env:TEMP\SIPA-ENTREGA-nova"
```

O executor habilita os adaptadores somente no processo/perfil descartável do
teste. Não habilitar flags na aplicação para executar a suíte.

O preparador exige destino novo fora do projeto; exclui `dev/`, `tests/`, Git
e worktrees, remove imports de demonstração e gera um manifesto. Não publica.
O fonte Git e a distribuição pública têm finalidades diferentes: o fonte preserva
os adaptadores necessários à integração e às regressões automatizadas.

Etapa 2: **271 testes automatizados e 555 verificações de navegador aprovados**,
sem falhas nas execuções finais. Veja [o relatório](docs/RELATORIO-VALIDACAO-ETAPA-2.md).
São testes isolados; não certificam API, SQL Server ou implantação.

Não importar automaticamente dados antigos do navegador para o servidor.
A classificação e eventual limpeza desses dados continuam manuais e reversíveis,
conforme a documentação de integração. Nenhum armazenamento pessoal foi limpo.
