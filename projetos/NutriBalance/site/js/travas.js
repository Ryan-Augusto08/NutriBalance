/**
 * travas.js — bloqueio dos atalhos de zoom.
 *
 * A trava de selecao de texto e o gesto de pinca no toque estao no CSS
 * (base.css). Sobram os caminhos que o CSS nao alcanca e que so o
 * JavaScript consegue interceptar: atalho de teclado, Ctrl + roda do mouse
 * e o gesto de pinca do trackpad no Safari.
 *
 * O modulo nao exporta nada: importar pelo efeito colateral, que importar
 * e o que registra os listeners.
 *
 *     import "./travas.js";
 *
 * Limite conhecido: o zoom aplicado pelo menu do navegador (os botoes - e +
 * do menu, ou Configuracoes > Aparencia) nao dispara evento nenhum dentro da
 * pagina. Nao existe forma de bloquear por codigo — vale pra qualquer site.
 */

/* O "=" e o "_" entram na lista porque em boa parte dos teclados o + e o -
   so saem com Shift, e o navegador aceita as duas formas como zoom.
   O 0 fica de fora de proposito: Ctrl+0 devolve a pagina pra 100%, entao e
   justamente o atalho que reforca o que a gente quer. Bloquear ele so
   tiraria a saida de quem tivesse dado zoom pelo menu. */
const TECLAS_DE_ZOOM = ["+", "-", "=", "_"];

/* Ctrl (ou Cmd, no Mac) + roda do mouse.
   O passive: false la embaixo e obrigatorio: o navegador assume passive em
   wheel por padrao, e em listener passive o preventDefault e ignorado. */
function bloquearZoomPorRoda(evento) {
  if (evento.ctrlKey || evento.metaKey) evento.preventDefault();
}

function bloquearZoomPorTeclado(evento) {
  if (!(evento.ctrlKey || evento.metaKey)) return;
  if (TECLAS_DE_ZOOM.includes(evento.key)) evento.preventDefault();
}

/* Gesto de pinca do trackpad no Safari, que emite os eventos gesture*.
   No Chrome e no Opera o mesmo gesto chega como wheel com ctrlKey ligado,
   ja tratado por bloquearZoomPorRoda. */
function bloquearGestoDeZoom(evento) {
  evento.preventDefault();
}

window.addEventListener("wheel", bloquearZoomPorRoda, { passive: false });
window.addEventListener("keydown", bloquearZoomPorTeclado);

for (const nome of ["gesturestart", "gesturechange", "gestureend"]) {
  window.addEventListener(nome, bloquearGestoDeZoom);
}
