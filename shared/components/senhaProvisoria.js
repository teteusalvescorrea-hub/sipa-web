// Senha provisória gerada pelo servidor (M8, M9): mostrada uma única vez, sem
// guardar em lugar nenhum. Quem recebe repassa à pessoa. 13/11/2026: só o aluno troca no 1º acesso; equipe e instrutor
// entram com ela e trocam quando quiserem no perfil (aluno=false).
// 25/11/2026 (pedido do usuário): janela compacta: o nome, o login (CPF) e a senha numa caixa pequena com "Copiar" em cada
// linha, uma linha de aviso e os botões "Copiar tudo" e "Entendi" lado a lado. cpf é opcional ("CPF cadastrado").
import {el,botao,modal} from '../../nivel-1-operador/js/components/uiOperador.js';
import {formatarCpf} from '../js/formatacao.js';

const ESTILO=`
html body dialog.op-senha-dialogo{width:min(440px,calc(100% - 32px));padding:22px 24px}
html body dialog.op-senha-dialogo .op-dialog-heading{margin-bottom:4px}
html body dialog.op-senha-dialogo .op-dialog-heading h2{font-size:19px}
.op-senha-nome{margin:0 0 14px;font-size:13px;color:#5a6b7f}
.op-senha-nome strong{color:#10233f}
.op-senha-caixa{border:1px solid #d5e4f3;border-radius:10px;background:#f5f9fd}
.op-senha-linha{display:grid;grid-template-columns:64px minmax(0,1fr) auto;align-items:center;gap:10px;padding:9px 12px}
.op-senha-linha+.op-senha-linha{border-top:1px solid #e1ebf5}
.op-senha-rotulo{font-size:12px;font-weight:600;color:#5a6b7f}
.op-senha-valor{font-size:15px;font-weight:700;color:#10233f;overflow-wrap:anywhere}
.op-senha-linha output.op-senha-valor{font-family:ui-monospace,Consolas,monospace;letter-spacing:.04em}
html body .op-senha-linha .op-senha-copiar{min-height:0;padding:4px 10px;border:0;border-radius:6px;background:none;color:#1769ab;font-size:12px;font-weight:700;cursor:pointer}
html body .op-senha-linha .op-senha-copiar:hover{background:#e4effa}
.op-senha-nota{margin:10px 0 0;font-size:12px;line-height:1.5;color:#6b4a14}
.op-senha-status{min-height:16px;margin:6px 0 0;font-size:12px;font-weight:600;color:#1f7a45}
.op-senha-rodape{display:flex;justify-content:flex-end;gap:8px;margin-top:10px}
.op-senha-rodape .op-button{min-height:38px;padding:8px 16px;font-size:13px}
html[data-theme=dark] body dialog.op-senha-dialogo{background:#16212e;color:#e6edf5;border-color:#2c3b4d}
html[data-theme=dark] body dialog.op-senha-dialogo h2,html[data-theme=dark] .op-senha-nome strong,html[data-theme=dark] .op-senha-valor{color:#e6edf5}
html[data-theme=dark] .op-senha-nome,html[data-theme=dark] .op-senha-rotulo{color:#9fb0c2}
html[data-theme=dark] .op-senha-caixa{background:#1b2a3a;border-color:#30465b}
html[data-theme=dark] .op-senha-linha+.op-senha-linha{border-color:#30465b}
html[data-theme=dark] body .op-senha-linha .op-senha-copiar{color:#8cc3f3}
html[data-theme=dark] body .op-senha-linha .op-senha-copiar:hover{background:#22384f}
html[data-theme=dark] .op-senha-nota{color:#f0c27a}
html[data-theme=dark] .op-senha-status{color:#8fdcb0}
`;
function garantirEstilo(){let s=document.getElementById('op-senha-estilo');if(!s){s=document.createElement('style');s.id='op-senha-estilo';document.head.append(s);}s.textContent=ESTILO;}

export function mostrarSenhaProvisoria(raiz,{titulo='Senha provisória',nome='',senha,cpf='',aluno=true}){
 if(!senha)return null;
 garantirEstilo();
 const login=cpf?formatarCpf(cpf):'';
 const status=el('p','','op-senha-status');status.setAttribute('role','status');
 const copiarTexto=async(texto,ok)=>{try{await navigator.clipboard.writeText(texto);status.textContent=ok;}catch{status.textContent='Não foi possível copiar. Anote manualmente.';}};
 const linha=(rotulo,valor,copiar)=>{const l=el('div',undefined,'op-senha-linha');l.append(el('span',rotulo,'op-senha-rotulo'),valor);if(copiar)l.append(botao('Copiar',copiar,'op-senha-copiar'));return l;};
 const valorSenha=el('output',senha,'op-senha-valor');valorSenha.setAttribute('aria-label','Senha provisória');
 const caixa=el('div',undefined,'op-senha-caixa');
 caixa.append(linha('CPF',el('span',login||'CPF cadastrado','op-senha-valor'),login?()=>copiarTexto(login,'CPF copiado.'):null),
  linha('Senha',valorSenha,()=>copiarTexto(senha,'Senha copiada.')));
 const nomeLinha=el('p',undefined,'op-senha-nome');if(nome)nomeLinha.append(el('strong',nome),document.createTextNode(' entra com o CPF e esta senha.'));else nomeLinha.textContent='A pessoa entra com o CPF e esta senha.';
 const nota=el('p',(aluno?'A senha aparece só agora. No primeiro acesso, o aluno cria a própria senha.':'A senha aparece só agora. A pessoa pode trocá-la depois em "Meu perfil".'),'op-senha-nota');
 const d=modal(raiz,titulo,'opSenhaProvisoria');d.classList.add('op-senha-dialogo');
 const rodape=el('div',undefined,'op-senha-rodape');
 rodape.append(botao('Copiar tudo',()=>copiarTexto((login?'CPF: '+login+'\n':'')+'Senha: '+senha,'CPF e senha copiados.'),'op-button op-button-outline'),botao('Entendi',()=>d.close(),'op-button op-button-primary'));
 d.append(nomeLinha,caixa,nota,status,rodape);
 d.addEventListener('close',()=>{valorSenha.textContent='';d.remove();},{once:true});
 d.showModal();return d;
}
