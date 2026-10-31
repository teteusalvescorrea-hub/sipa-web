import {obterUnidadeInstitucional,pesquisaMapsUnidade,nomeUnidadeInstitucional as nomeUnidadeLocal} from '../js/catalogoUnidades.js';
import {localDaReservaOperacional} from '../js/categorias.js';
export function nomeLocalDaReserva(aula){return localDaReservaOperacional(aula)?.nome||((aula.categoria==='D'||aula.categoria==='B'&&!aula.id)?'Local conforme a data da aula':nomeUnidadeLocal(aula.unidade));}
export function localDaReserva(aula,mostrarNome=true){
 const local=localDaReservaOperacional(aula);
 if(['B','D'].includes(aula.categoria)&&!aula.id&&!local){const aviso=document.createElement('p');aviso.textContent='Selecione uma data para consultar o local da aula.';return aviso;}
 const secao=local?localDaAula(local.nome,mostrarNome,local.endereco,local.mapsUrl):localDaAula(aula.unidade,mostrarNome,aula.enderecoReserva||undefined);
 if(local?.deslocamento){const aviso=document.createElement('p');aviso.className='lesson-relocation-note';aviso.textContent='Neste dia, as aulas de carro da sua unidade são realizadas na '+local.nome+'.';secao.querySelector('div').append(aviso);}
 return secao;
}
export function linkLocalizacaoReserva(aula){
 const local=localDaReservaOperacional(aula);
 if(!local)return linkLocalizacaoUnidade(aula.unidade);
 return localDaAula(local.nome,true,local.endereco,local.mapsUrl).querySelector('a');
}
export function linkLocalizacaoUnidade(unidade){
    const url=pesquisaMapsUnidade(unidade);if(!url)return null;const a=document.createElement('a');a.className='unit-map-link';a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.textContent='Ver localização';return a;
}
export function localDaAula(unidade,mostrarNome=true,enderecoDaReserva,mapsUrl){
    const secao=document.createElement('div');secao.className='unit-location';const u=enderecoDaReserva===undefined?obterUnidadeInstitucional(unidade):null;
    const icone=document.createElementNS('http://www.w3.org/2000/svg','svg');icone.setAttribute('viewBox','0 0 24 24');icone.setAttribute('aria-hidden','true');icone.innerHTML='<path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/>';
    const conteudo=document.createElement('div');if(mostrarNome){const h=document.createElement('strong');h.textContent=u?.nome||nomeUnidadeLocal(unidade);conteudo.append(h);}const endereco=document.createElement('p');endereco.textContent=enderecoDaReserva||u?.enderecoCompleto||'Endereço ainda não informado para esta unidade.';conteudo.append(endereco);const link=enderecoDaReserva?document.createElement('a'):enderecoDaReserva===undefined?linkLocalizacaoUnidade(unidade):null;if(enderecoDaReserva){link.className='unit-map-link';link.href=mapsUrl||'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(enderecoDaReserva);link.target='_blank';link.rel='noopener noreferrer';link.textContent='Ver localização';}if(link)conteudo.append(link);secao.append(icone,conteudo);return secao;
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
