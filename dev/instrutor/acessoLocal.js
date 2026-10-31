import {sessaoDemo} from '../sessao.js';
export const CHAVES = Object.freeze({dados: 'sipa.instrutor.dev.dados.v1'});
export function exigirInstrutorLocal() {
    const s = sessaoDemo();
    if (s?.perfil !== 'instrutor') throw new Error('Entre como Instrutor no login de demonstração.');
    return s;
}
