// Minhas aulas: botão "Contratar mais aulas" e abertura por #contratar, nos dois modos (API e laboratório).
import {montarContratarAulas} from './components/contratarAulas.js';
import {montarAdiantarAulas} from './components/adiantarAulas.js';
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',()=>{montarContratarAulas();montarAdiantarAulas();},{once:true});else{montarContratarAulas();montarAdiantarAulas();}
