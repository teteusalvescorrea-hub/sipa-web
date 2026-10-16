import test from "node:test";
import assert from "node:assert/strict";
import { ambienteLocalPermitido, demonstracaoSolicitada, enderecoSemDemonstracao } from "../js/modules/operador/demo/modoDemonstracao.js";

test("demonstração exige ativação explícita em loopback HTTP(S)", () => {
    for (const host of ["localhost", "127.0.0.1", "[::1]"]) {
        assert.equal(demonstracaoSolicitada(`http://${host}:5500/operador-cfc.html?demo=1`), true);
        assert.equal(demonstracaoSolicitada(`https://${host}/operador-cfc.html?demo=1`), true);
        for (const query of ["", "?demo=0", "?demo=true", "?demo=", "?demo=1&demo=0", "?demo=1&demo=1", "?outro=1#demo=1"]) {
            assert.equal(demonstracaoSolicitada(`http://${host}/operador-cfc.html${query}`), false);
        }
    }
});

test("produção, rede local, file e nomes parecidos continuam bloqueados", () => {
    for (const endereco of [
        "https://teteusalvescorrea-hub.github.io/sipa-web/operador-cfc.html?demo=1",
        "https://sipa.example/operador-cfc.html?demo=1", "http://192.168.0.10:5500/operador-cfc.html?demo=1",
        "http://localhost.example/operador-cfc.html?demo=1", "http://127.0.0.1.example/?demo=1",
        "http://localhost@evil.example/?demo=1", "http://0.0.0.0:5500/?demo=1",
        "file:///C:/projeto/operador-cfc.html?demo=1", "data:text/html,localhost?demo=1", "invalido"
    ]) {
        assert.equal(ambienteLocalPermitido(endereco), false, endereco);
        assert.equal(demonstracaoSolicitada(endereco), false, endereco);
    }
});

test("encerrar remove apenas o parâmetro demo, sem persistência", () => {
    assert.equal(enderecoSemDemonstracao("http://127.0.0.1:5500/operador-cfc.html?demo=1&outro=2#alunos"), "http://127.0.0.1:5500/operador-cfc.html?outro=2#alunos");
});
