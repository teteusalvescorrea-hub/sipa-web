// Compatibilidade de importacao apenas. A segunda liberacao foi descontinuada.
// Registros historicos de liberacao permanecem intactos no armazenamento.
export function criarLiberacaoAgendaTeste(){
 return ()=>{throw new Error('Operacao desativada: os creditos do cadastro ja ficam disponiveis automaticamente.');};
}
