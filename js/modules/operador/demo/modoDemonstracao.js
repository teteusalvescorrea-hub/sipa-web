// Exceção de apresentação somente para desenvolvimento. Não é autorização.
// Sem flags persistentes, roles adicionais ou leitura da sessão do usuário.
export function ambienteLocalPermitido(endereco) {
    try {
        const url = new URL(endereco);
        return ["http:", "https:"].includes(url.protocol)
            && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname);
    } catch {
        return false;
    }
}

export function demonstracaoSolicitada(endereco) {
    if (!ambienteLocalPermitido(endereco)) return false;
    const parametros = new URL(endereco).searchParams.getAll("demo");
    return parametros.length === 1 && parametros[0] === "1";
}

export function enderecoSemDemonstracao(endereco) {
    const url = new URL(endereco);
    url.searchParams.delete("demo");
    return url.href;
}
