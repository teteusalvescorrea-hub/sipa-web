# SIPA — Sistema Inteligente para Agendamentos

O **SIPA (Sistema Inteligente para Agendamentos)** é uma aplicação web desenvolvida para facilitar o gerenciamento e o agendamento de aulas práticas em autoescolas.

O sistema foi desenvolvido com foco em organização, praticidade e controle dos agendamentos de alunos, instrutores, veículos e categorias de habilitação.

## Acesse o sistema

[**Acessar o SIPA**](https://teteusalvescorrea-hub.github.io/sipa-web/)

O site publica a branch `prod`. As telas ligadas na API só funcionam no site depois que a API estiver num servidor; até lá, rode local (veja abaixo).

## Funcionalidades

- Cadastro e gerenciamento de alunos
- Login e controle de acesso
- Agendamento de aulas práticas
- Agendamento para categoria A (Moto)
- Agendamento para categoria B (Carro)
- Suporte à categoria AB (Carro + Moto)
- Seleção de múltiplos horários
- Controle de disponibilidade de instrutores
- Identificação do veículo utilizado na aula
- Bloqueio de domingos para agendamento
- Bloqueio de datas anteriores à data atual
- Controle da quantidade de aulas disponíveis
- Visualização das aulas agendadas
- Cancelamento de aulas
- Dashboard do aluno
- Página de progresso do aluno
- Armazenamento dos agendamentos no sistema

## Tecnologias utilizadas

- HTML5
- CSS3
- JavaScript
- Módulos ES (`js/modules`, no padrão de pastas do front do Simplea)
- API do SIPA em .NET 10 (repositório `sipa-api`)
- Font Awesome

## Estrutura do projeto

```text
sipa-web/
│
├── assets/
├── css/
├── docs/
├── js/
├── agendamento.html
├── cadastro.html
├── dashboard.html
├── index.html
├── login.html
├── meu-perfil.html
├── meu-progresso.html
├── minhas-aulas.html
└── README.md

## Rodar local

- Banco (Docker), API em `http://localhost:5080` e front em `http://localhost:5500`: veja `js/README.md`.
- Como ligar uma tela numa rota da API: `docs/como-integrar-uma-api.md`.
