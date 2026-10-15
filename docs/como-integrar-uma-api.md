# Como integrar uma API no front do SIPA

## 1. Onde fica cada coisa

| Pasta ou arquivo | O que tem | Você mexe? |
| --- | --- | --- |
| `js/modules/essencial/` | A base: endereço da API, cliente HTTP, erros, login e sessão | Não |
| `js/modules/<recurso>/services/<recurso>.service.js` | **Uma função por rota da API.** Ex.: `alunos.service.js` tem `obterAlunoLogado()` | Só para criar uma rota nova |
| `js/<tela>.js` | O código da tela. **É aqui que você chama a função do service** | Sim |
| `<tela>.html` | A página. Só a tag `<script>` muda | Sim, uma linha |

As 58 rotas da API já têm função pronta nos services. Para ver todas, abra a pasta `js/modules`.

## 2. Os 5 passos de toda integração

1. **Achar a rota no Swagger.** Com a API rodando, abra `http://localhost:5080/swagger`. Veja o método (GET, POST...), a rota e o que ela devolve. Clique em **Try it out** para ver um exemplo de resposta.
2. **Achar a função no service.** Abra `js/modules/<recurso>/services/<recurso>.service.js` e procure a rota no comentário. O nome da função é o que você vai importar.
3. **HTML: carregar o script como módulo.** Troque `<script src="js/<tela>.js">` por `<script type="module" src="js/<tela>.js">`. Sem isso o `import` não funciona.
4. **JS da tela:**
   - no topo, `import` da função;
   - proteja a tela com `exigirLogin(["Aluno"])`;
   - chame a função com `await`, dentro de `try/catch`;
   - preencha a tela com os campos da resposta;
   - apague a leitura antiga do `sessionStorage` ou do `localStorage`.
5. **Testar e subir.** F12 → aba **Network** (Rede): a chamada tem que aparecer com Status `200`. Depois: branch, commit, push e pull request para a `hml`.

## 3. Rota que ainda não tem função

Abra o service do recurso e copie o modelo. O comentário é a rota e o perfil:

```js
// GET /api/exemplos/{id} — Aluno
export const obterExemplo = (id) =>
    api.Get(`exemplos/${id}`);

// POST /api/exemplos — Aluno
export const cadastrarExemplo = (exemplo) =>
    api.Post("exemplos", exemplo);

// PUT /api/exemplos/{id} — Aluno
export const atualizarExemplo = (id, exemplo) =>
    api.Put(`exemplos/${id}`, exemplo);
```

- A rota vai **sem** `/api/` na frente (o cliente já coloca).
- Recurso novo: crie a pasta `js/modules/<recurso>/services/` e o arquivo `<recurso>.service.js` com o `import` do cliente na primeira linha:

```js
import * as api from "../../essencial/utils/api.js";
```

## 4. Exemplo: como o Meu perfil foi integrado

Rota: **`GET /api/alunos/me`** (a função `obterAlunoLogado`, em `js/modules/alunos/services/alunos.service.js`). É a mais simples do sistema: uma chamada, sem parâmetro, e a resposta preenche a tela.

Antes, o `js/meu-perfil.js` lia o aluno do `sessionStorage` (`sipaAluno`), que não existe mais depois do login pela API. Abaixo estão as mudanças feitas, na ordem. Use o mesmo caminho nas próximas telas.

### Antes de começar uma tela nova

Na pasta `sipa-web`, no terminal do VS Code (troque `<tela>` pelo nome da tela):

```powershell
git switch hml
git pull
git switch -c feature/integracao-<tela>
```

Se o PR #1 ainda não entrou na `hml`, troque `hml` por `feature/sipa-v1` nos dois primeiros comandos.

### Passo 1 — HTML (`meu-perfil.html`)

Procure: `<script src="js/meu-perfil.js"></script>`

Troque por:

```html
<script type="module" src="js/meu-perfil.js"></script>
```

### Passo 2 — Imports (`js/meu-perfil.js`)

Procure: `"use strict";` (no topo do arquivo)

Troque por:

```js
import { exigirLogin } from "./modules/essencial/utils/sessao.js";
import { sair } from "./modules/essencial/service/authService.js";
import { obterAlunoLogado } from "./modules/alunos/services/alunos.service.js";
```

### Passo 3 — Apagar a leitura do sessionStorage

Apague do bloco `BUSCAR ALUNO LOGADO` até a linha antes do bloco `FORMATAR CPF`. É a função `obterAluno()` inteira.

### Passo 4 — Buscar o aluno na API

Procure: `function carregarPerfil() {`

Apague dessa linha até o `}` do `if (!aluno)` (as 11 linhas que pegam o aluno e param se não tiver) e cole no lugar:

```js
async function carregarPerfil() {

    let aluno;

    try {

        aluno = await obterAlunoLogado();

    } catch (erro) {

        profileName.textContent = erro.message;

        return;

    }
```

O `await` espera a API responder. Se der erro (API desligada, por exemplo), a mensagem aparece no lugar do nome.

### Passo 5 — Categoria

A API manda as categorias como lista: `[{ descricao: "Categoria B — Carro", valor: 2 }]`.

Procure:

```js
    const categoria =
        aluno.categoria;
```

Troque por:

```js
    const siglas = { 1: "A", 2: "B" };

    const categoria = aluno.categoriasPretendidas
        .map((item) => siglas[item.valor])
        .join("");
```

Assim `categoria` vira `"A"`, `"B"` ou `"AB"`, como a tela já espera.

### Passo 6 — Pacote

Procure:

```js
        profilePackage.textContent =
            aluno.pacote
                ? `${aluno.pacote}`
                : "-";
```

Troque por:

```js
        profilePackage.textContent =
            aluno.aulasContratadas;
```

### Passo 7 — Sair

No bloco `LOGOUT`, troque o `logoutButton.addEventListener(...)` inteiro por:

```js
    logoutButton.addEventListener(
        "click",
        sair
    );
```

### Passo 8 — Iniciar só com login

Procure, no fim do arquivo: `carregarPerfil();`

Troque por:

```js
if (exigirLogin(["Aluno"])) {
    carregarPerfil();
}
```

Os outros campos (nome, CPF, e-mail, telefone e aulas restantes) já usam os mesmos nomes que a API devolve e não precisam mudar.

### Testar

1. Banco, API e front rodando (`docker start sql_server_local`, `dotnet run` na `sipa-api` e o Go Live no `sipa-web`).
2. Entre com um aluno em `http://localhost:5500/login.html`.
3. Clique em **Meu perfil**. Devem aparecer nome, CPF, e-mail, telefone, categoria, pacote e aulas restantes do aluno.
4. F12 → **Network**: `me` com Status `200`.
5. F12 → **Console**: nenhum erro vermelho.
6. Clique em **Sair da conta**: volta para o login.

### Erros comuns

| O que aparece | O que fazer |
| --- | --- |
| `Cannot use import statement outside a module` | Faltou o passo 1 (`type="module"`) |
| A tela volta para o login sozinha | Faltou o login antes, ou o passo 3 deixou `obterAluno()` sendo chamada |
| `Não foi possível falar com o servidor` no lugar do nome | A API não está rodando em `localhost:5080` |
| `obterAluno is not defined` no Console | Ainda tem uma chamada a `obterAluno()`: troque pelo passo 4 |

### Subir

```powershell
git add <tela>.html js/<tela>.js
git commit -m "Liga a tela <tela> na API"
git push -u origin feature/integracao-<tela>
```

No GitHub, abra o pull request com base **`hml`** e o outro dev como revisor.
