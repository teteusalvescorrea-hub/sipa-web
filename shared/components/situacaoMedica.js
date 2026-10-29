import {STATUS_MEDICO} from '../js/solicitacoesMedicas.js';
export function situacaoMedica(s){
 const n=document.createElement('span');n.className='medical-situation';n.dataset.medicalSituation=Object.hasOwn(STATUS_MEDICO,s.status)?s.status:'desconhecida';n.textContent=STATUS_MEDICO[s.status]||'Situação anterior não informada';return n;
}
