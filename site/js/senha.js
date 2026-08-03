/**
 * Botao "olhinho": alterna a visibilidade de um campo de senha.
 *
 * O HTML declara o vinculo pelo atributo data-olho, que guarda o id do campo:
 *
 *   <div class="campo-senha">
 *     <input type="password" id="login-senha" ... />
 *     <button type="button" class="olho-btn" data-olho="login-senha" ...>
 *   </div>
 *
 * O botao PRECISA ser type="button": dentro de um <form>, o padrao seria
 * submit, e clicar no olhinho enviaria o formulario.
 *
 * Qual dos dois icones aparece e decidido no CSS pelo aria-pressed, entao o
 * estado visual e o estado anunciado por leitor de tela nunca se separam.
 */

export function ligarOlhosDeSenha() {
  for (const botao of document.querySelectorAll("[data-olho]")) {
    const campo = document.getElementById(botao.dataset.olho);
    if (!campo) continue;

    botao.addEventListener("click", () => {
      const estaVisivel = campo.type === "text";
      // Guarda onde estava o cursor: trocar o type do input costuma
      // jogar o cursor para o fim do texto.
      const inicio = campo.selectionStart;
      const fim = campo.selectionEnd;

      campo.type = estaVisivel ? "password" : "text";

      const rotulo = estaVisivel ? "Mostrar senha" : "Ocultar senha";
      botao.setAttribute("aria-pressed", String(!estaVisivel));
      botao.setAttribute("aria-label", rotulo);
      botao.title = rotulo;

      // Devolve o foco pro campo pra quem estava digitando continuar de onde parou.
      campo.focus({ preventScroll: true });
      if (inicio !== null) campo.setSelectionRange(inicio, fim);
    });
  }
}
