import {contextoSessao,sair} from './autenticacao.js';
export const CHAVE_SESSAO_DEMO='sipa.dev.navegacao.v1';
export function sessaoDemo(){const c=contextoSessao();return c&&!c.pendente?c:null;}
export function entrarDemo(){throw new Error('Entre com CPF, senha e perfil autorizado.');}
export function sairDemo(){return sair();}
