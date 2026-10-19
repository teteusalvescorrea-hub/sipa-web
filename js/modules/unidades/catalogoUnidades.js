// Dados institucionais fornecidos pelo responsável pelo projeto, sem verificação externa.
// A ordem e os IDs legados são preservados; não são IDs de banco/API nem dados de demonstração.
export const UNIDADES_INSTITUCIONAIS=Object.freeze([
  {
    "id": "Cobilândia",
    "nome": "Unidade Cobilândia",
    "logradouro": "Av. Jacinto Admiral",
    "numero": "125",
    "bairro": "Cobilândia",
    "cidade": "Vila Velha",
    "uf": "ES",
    "cep": "29111-470",
    "enderecoCompleto": "Av. Jacinto Admiral, 125 – Cobilândia, Vila Velha – ES, 29111-470"
  },
  {
    "id": "Santa Rita",
    "nome": "Unidade Santa Rita",
    "logradouro": "Av. Fern. Antônio da Silveira",
    "numero": "66",
    "bairro": "Santa Rita",
    "cidade": "Vila Velha",
    "uf": "ES",
    "cep": "29118-450",
    "enderecoCompleto": "Av. Fern. Antônio da Silveira, 66 – Santa Rita, Vila Velha – ES, 29118-450"
  },
  {
    "id": "Vila Velha",
    "nome": "Unidade Centro de Vila Velha",
    "aliases": [
      "Centro de Vila Velha"
    ],
    "logradouro": "Av. Luciano das Neves",
    "numero": "1335",
    "bairro": "Divino",
    "cidade": "Vila Velha",
    "uf": "ES",
    "cep": null,
    "enderecoCompleto": "Av. Luciano das Neves, 1335 – Divino, Vila Velha – ES"
  },
  {
    "id": "Itaparica",
    "nome": "Unidade Itaparica",
    "logradouro": "Av. João Mendes",
    "numero": "240",
    "complemento": "Loja 2",
    "bairro": "Santa Mônica Popular",
    "cidade": "Vila Velha",
    "uf": "ES",
    "cep": "29105-200",
    "enderecoCompleto": "Av. João Mendes, 240 – Loja 2, Santa Mônica Popular, Vila Velha – ES, 29105-200"
  },
  {
    "id": "Terra Vermelha",
    "nome": "Unidade Terra Vermelha",
    "logradouro": "Av. Boa Esperança",
    "numero": "19",
    "bairro": "Terra Vermelha",
    "cidade": "Vila Velha",
    "uf": "ES",
    "cep": "29127-335",
    "enderecoCompleto": "Av. Boa Esperança, 19 – Terra Vermelha, Vila Velha – ES, 29127-335"
  },
  {
    "id": "Novo Milênio",
    "nome": "Unidade Novo Milênio",
    "logradouro": "Av. Santa Leopoldina",
    "numero": "840",
    "complemento": "03",
    "bairro": "Coqueiral de Itaparica",
    "cidade": "Vila Velha",
    "uf": "ES",
    "cep": "29102-041",
    "enderecoCompleto": "Av. Santa Leopoldina, 840 - 03 - Coqueiral de Itaparica, Vila Velha - ES, 29102-041"
  }
].map(u=>Object.freeze({...u,aliases:Object.freeze(u.aliases||[])})));
const chave=valor=>String(valor||'').trim().replace(/^Unidade\s+/i,'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase('pt-BR');
export function obterUnidadeInstitucional(idOuAlias){const k=chave(idOuAlias);return UNIDADES_INSTITUCIONAIS.find(u=>[u.id,u.nome,...u.aliases].some(v=>chave(v)===k))||null;}
export function normalizarChaveUnidade(valor){return obterUnidadeInstitucional(valor)?.id||String(valor||'').trim().replace(/^Unidade\s+/i,'');}
export function nomeUnidadeInstitucional(valor){return obterUnidadeInstitucional(valor)?.nome||normalizarChaveUnidade(valor)||'Unidade não informada';}
export function pesquisaMapsUnidade(valor){const u=obterUnidadeInstitucional(valor);if(!u)return null;const consulta=u.logradouro+', '+u.numero+(u.complemento?' – '+u.complemento:'')+', '+u.bairro+', '+u.cidade+' – '+u.uf+(u.cep?', '+u.cep:'');return 'https://www.google.com/maps/search/?api=1&query='+encodeURIComponent(consulta);}
