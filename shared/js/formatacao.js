// Formatação de leitura, sem truncar nem modificar o identificador persistido.
export function formatarCpf(valor){
 if(valor==null||String(valor).trim()==='')return 'Não informado';
 const texto=String(valor).trim();if(!/^[0-9.\-\s]+$/.test(texto))return 'CPF inválido';
 const numero=texto.replace(/\D/g,'');if(numero.length!==11)return 'CPF incompleto';
 return numero.replace(/^(\d{3})(\d{3})(\d{3})(\d{2})$/,'$1.$2.$3-$4');
}
// Telefone com DDD: (27) 99999-8888 ou (27) 3333-4444; outro tamanho aparece como veio. Cada tela escolhe o texto do vazio.
export function formatarTelefone(valor,vazio='Não informado'){
 const d=String(valor||'').replace(/\D/g,'');
 return d.length===11?`(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`:d.length===10?`(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`:(valor||vazio);
}
// Comparação de buscas sem acento nem caixa ("Cobilândia" = "cobilandia").
export const semAcento=v=>String(v||'').normalize('NFD').replace(/[̀-ͯ]/g,'').toLocaleLowerCase('pt-BR');

// Máscara de entrada; não confundir com validação matemática nem ocultação.
export const normalizarCpfEntrada=valor=>String(valor||'').replace(/\D/g,'').slice(0,11);
export const formatarCpfEntrada=valor=>normalizarCpfEntrada(valor).replace(/^(\d{3})(\d)/,'$1.$2').replace(/^(\d{3})\.(\d{3})(\d)/,'$1.$2.$3').replace(/(\d{3})\.(\d{3})\.(\d{3})(\d)/,'$1.$2.$3-$4');
export function ativarMascaraCpf(campo,{permitirNome=false}={}){
 if(!campo)return;
 if(!permitirNome){campo.maxLength=14;campo.inputMode='numeric';}
 const numerico=valor=>!permitirNome||/^[\d.\-\s]*$/.test(valor);
 function formatar(){if(!numerico(campo.value))return;const antes=campo.value.slice(0,campo.selectionStart??campo.value.length).replace(/\D/g,'').length;campo.value=formatarCpfEntrada(campo.value);let cursor=0,vistos=0;while(cursor<campo.value.length&&vistos<antes)if(/\d/.test(campo.value[cursor++]))vistos++;campo.setSelectionRange(cursor,cursor);campo.removeAttribute('aria-invalid');}
 campo.addEventListener('input',formatar);
 campo.addEventListener('paste',e=>{const texto=e.clipboardData?.getData('text');if(texto==null||!numerico(texto))return;e.preventDefault();const inicio=campo.selectionStart??0,fim=campo.selectionEnd??inicio;campo.value=campo.value.slice(0,inicio)+texto+campo.value.slice(fim);campo.setSelectionRange(inicio+texto.length,inicio+texto.length);campo.dispatchEvent(new Event('input',{bubbles:true}));});
 campo.addEventListener('beforeinput',e=>{if(!numerico(campo.value)||campo.selectionStart!==campo.selectionEnd||!['deleteContentBackward','deleteContentForward'].includes(e.inputType))return;const pos=campo.selectionStart,atras=e.inputType==='deleteContentBackward',adj=atras?pos-1:pos;if(adj<0||adj>=campo.value.length||/\d/.test(campo.value[adj]))return;let i=adj;while(i>=0&&i<campo.value.length&&/\D/.test(campo.value[i]))i+=atras?-1:1;if(i<0||i>=campo.value.length)return;e.preventDefault();campo.value=campo.value.slice(0,i)+campo.value.slice(i+1);campo.setSelectionRange(atras?i:pos,atras?i:pos);campo.dispatchEvent(new Event('input',{bubbles:true}));});
}
