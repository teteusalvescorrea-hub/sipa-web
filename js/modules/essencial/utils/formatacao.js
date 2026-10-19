// Formatação de leitura, sem truncar nem modificar o identificador persistido.
export function formatarCpf(valor){
 if(valor==null||String(valor).trim()==='')return 'Não informado';
 const texto=String(valor).trim();if(!/^[0-9.\-\s]+$/.test(texto))return 'CPF inválido';
 const numero=texto.replace(/\D/g,'');if(numero.length!==11)return 'CPF incompleto';
 return numero.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4');
}
