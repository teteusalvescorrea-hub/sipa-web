import {desenvolvimentoAtivo} from '../../shared/js/ambiente.js';
import {cpfValido} from '../../nivel-1-operador/js/dominioOperador.js';

// Configuração desta cópia de desenvolvimento, exclusiva de alunos.
// Desabilitar antes da integração; a distribuição integrada já exclui dev/.
// Não há controle de usuário, armazenamento ou parâmetro de URL para ativá-la.
export const CPF_FICTICIO_ALUNO_LOCAL_HABILITADO=false;
export function criarPoliticaCpfLocal(endereco,obterEndereco=()=>globalThis.location?.href||globalThis.window?.location?.href||'',permitirFicticio=CPF_FICTICIO_ALUNO_LOCAL_HABILITADO){
 const autorizado=()=>permitirFicticio===true&&desenvolvimentoAtivo(endereco)&&desenvolvimentoAtivo(obterEndereco());
 return Object.freeze({
  validar(valor){return autorizado()? /^\d{11}$/.test(String(valor)):cpfValido(valor);}
 });
}
