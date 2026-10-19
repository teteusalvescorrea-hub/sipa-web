import {obterUnidadeInstitucional,pesquisaMapsUnidade,nomeUnidadeInstitucional as nomeUnidadeLocal} from '../../unidades/catalogoUnidades.js';
export function linkLocalizacaoUnidade(unidade){
    const url=pesquisaMapsUnidade(unidade);if(!url)return null;const a=document.createElement('a');a.className='unit-map-link';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Ver localização';return a;
}
export function localDaAula(unidade,mostrarNome=true,enderecoDaReserva){
    const secao=document.createElement('div');secao.className='unit-location';const u=enderecoDaReserva===undefined?obterUnidadeInstitucional(unidade):null;
    const icone=document.createElementNS('http://www.w3.org/2000/svg','svg');icone.setAttribute('viewBox','0 0 24 24');icone.setAttribute('aria-hidden','true');icone.innerHTML='<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>';
    const conteudo=document.createElement('div');if(mostrarNome){const h=document.createElement('strong');h.textContent=u?.nome||nomeUnidadeLocal(unidade);conteudo.append(h);}const endereco=document.createElement('p');endereco.textContent=enderecoDaReserva||u?.enderecoCompleto||'Endereço ainda não informado para esta unidade.';conteudo.append(endereco);const link=enderecoDaReserva?document.createElement('a'):enderecoDaReserva===undefined?linkLocalizacaoUnidade(unidade):null;if(enderecoDaReserva){link.className='unit-map-link';link.href='https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(enderecoDaReserva);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Ver localização';}if(link)conteudo.append(link);secao.append(icone,conteudo);return secao;
}
export function orientacoesComparecimento(compacto=false){
    const aviso=document.createElement('aside');aviso.className='lesson-attendance';
    const titulo=document.createElement('strong');titulo.textContent=compacto?'Antes da sua aula':'Orientações para sua aula';
    const texto=document.createElement('p');texto.append('Compareça à unidade com pelo menos ');
    for(const [i,trecho] of ['10 minutos de antecedência','documento oficial de identificação com foto','LADV'].entries()){
        const destaque=document.createElement('strong');destaque.textContent=trecho;texto.append(destaque);
        texto.append(i===0?', portando um ':i===1?' e sua ':' (Licença para Aprendizagem de Direção Veicular).');
    }
    aviso.append(titulo,texto);return aviso;
}
