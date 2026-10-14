# Pastas do JavaScript

Integração com a API do SIPA, no mesmo padrão de pastas do front do Simplea (`src/modules`).

```
js/
├── modules/
│   ├── essencial/                        # base comum (igual ao modules/essencial do Simplea)
│   │   ├── settings/config.js            # endereço da API por ambiente (faz o papel do .env)
│   │   ├── utils/api.js                  # cliente HTTP: Get, Post, Put, Delete, ToParams, ComParams
│   │   ├── utils/apiErro.js              # erro da API (ProblemDetails: detail e listErrors)
│   │   ├── utils/sessao.js               # token, perfil do usuário e proteção de rota
│   │   └── service/authService.js        # login e sair (os 3 perfis)
│   │
│   ├── alunos/services/alunos.service.js               # cadastro e "me"
│   ├── motoristas/services/motoristas.service.js       # cadastro e "me"
│   ├── autoescolas/services/autoescolas.service.js     # cadastro, "me", lista e detalhe
│   ├── veiculos/services/veiculos.service.js           # veículos do motorista
│   ├── unidades/services/unidades.service.js           # unidades da autoescola
│   ├── locaisAula/services/locaisAula.service.js       # pontos de encontro de cada unidade
│   ├── gradesHorarios/services/gradesHorarios.service.js
│   ├── dominios/services/dominios.service.js           # listas fixas (categorias, UFs, status...)
│   ├── cidades/services/cidades.service.js
│   ├── vinculos/services/vinculos.service.js           # motorista × autoescola
│   ├── pacotes/services/pacotes.service.js             # pacotes e vitrine
│   ├── contratacoes/services/contratacoes.service.js   # compra do pacote
│   └── agendamentos/services/agendamentos.service.js   # pedido, consulta e ações da aula
│
└── *.js                                  # scripts de cada tela (login.js, dashboard.js, ...)
```

Cada `*.service.js` tem uma função por rota da API, com a rota, o perfil, o corpo e a resposta no comentário. Os 58 endpoints do contrato (`mapa-api-v2.md`) estão cobertos.

## Como usar numa tela

Os arquivos de `modules/` são módulos ES. A tela que usar a API carrega o seu script como módulo:

```html
<script type="module" src="js/login.js"></script>
```

E importa só o que precisa:

```js
import { login } from "./modules/essencial/service/authService.js";

try {
    const { perfil } = await login(documento, senha);   // já guarda o token

    if (perfil.descricao === "Aluno") window.location.href = "dashboard.html";
} catch (erro) {
    mostrarErros(erro.erros);                          // lista pronta para a tela
}
```

Tela logada:

```js
import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { obterAlunoLogado } from "./modules/alunos/services/alunos.service.js";

if (exigirLogin(["Aluno"])) {
    const aluno = await obterAlunoLogado();
}
```

Erros chegam como `ApiErro`, com `status`, `message` (a mensagem pronta para a tela) e `erros` (a lista, quando a API devolve várias). Sem conexão com a API, `status` é 0. Um 401 numa tela logada limpa a sessão e volta para o `login.html` sozinho.

## Rodar local

- API em `http://localhost:5080` (o endereço está em `modules/essencial/settings/config.js`).
- Front servido em `http://localhost:5500` (por exemplo, com a extensão Live Server do VS Code). É a única origem que a API aceita (CORS).
