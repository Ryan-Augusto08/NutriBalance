/**
 * menu.js — destaque da seção ativa no menu do painel.
 *
 * O MENU FUNCIONA SEM ESTE ARQUIVO. Os links de .menu-secoes são âncoras de
 * HTML puro (`<a href="#progresso">`): clicar já leva à seção, mesmo com o
 * JavaScript desligado. O que este módulo acrescenta é só o destaque de onde
 * a pessoa está — se nada aqui rodar, o menu continua navegando.
 *
 * O modulo nao exporta nada: importar pelo efeito colateral, que importar
 * e o que registra os listeners.
 *
 *     import "./menu.js";
 *
 * Mesmo padrão do travas.js.
 */

const barra = document.querySelector(".menu-secoes");

// Sem a barra na página (as outras telas não têm menu), não há o que fazer.
if (barra) {
  // Cada link aponta para o id de uma seção. Monta o par link -> seção uma
  // vez, em vez de procurar no DOM a cada rolagem.
  const pares = Array.from(barra.querySelectorAll("a[href^='#']"))
    .map((link) => ({ link, secao: document.querySelector(link.getAttribute("href")) }))
    .filter((p) => p.secao);

  function destacar(secaoAtiva) {
    for (const { link, secao } of pares) {
      const ativo = secao === secaoAtiva;
      link.classList.toggle("ativo", ativo);
      // aria-current avisa o leitor de tela qual item representa o lugar
      // atual. Remover é melhor que pôr "false": o atributo presente já
      // significa "é este".
      if (ativo) link.setAttribute("aria-current", "true");
      else link.removeAttribute("aria-current");
    }
  }

  /*
   * A margem de cima desconta a altura MEDIDA da barra (55px) mais uma
   * folga, senão a seção escondida ATRÁS dela ainda contaria como visível —
   * e a seção que a âncora acabou de trazer pararia bem na borda da faixa,
   * que é um empate instável. A de baixo (-55%)
   * estreita a faixa de decisão para o terço superior da tela: sem isso, com
   * duas seções aparecendo ao mesmo tempo, o destaque fica pulando entre as
   * duas a cada pixel de rolagem.
   */
  /*
   * Altura em que uma seção passa a contar como "a que está sendo lida".
   *
   * Tem que ser MAIOR que o scroll-padding-top do dashboard.css, que hoje é
   * 68px. É nessa altura que a âncora pousa o topo da seção — com a linha
   * acima disso, a seção que o clique acabou de trazer fica logo abaixo dela
   * e não é contada, e o link clicado não acende. Os 4px são folga de
   * arredondamento.
   *
   * Se o scroll-padding-top mudar, este número muda junto.
   */
  const LINHA = 72;

  /*
   * Qual seção destacar.
   *
   * A regra é "a última cujo topo já passou pela linha" — e não "a que está
   * mais acima na tela", que foi a primeira tentativa e estava errada: uma
   * seção que já saiu pela parte de cima continuava ganhando.
   *
   * O caso do FIM DA PÁGINA precisa de tratamento próprio. Medido em
   * 01/10/2026 com a conta demo: a página tem 1534px numa tela de 844px,
   * então a rolagem máxima é 690px. A seção de Progresso começa em 1020px e
   * precisaria de 952px de rolagem para encostar no topo — ela NUNCA passa
   * pela linha. Sem este caso, quem rola até o fim e está olhando o gráfico
   * vê "Resumo" destacado.
   */
  function secaoAtual() {
    const fimDaPagina =
      window.scrollY >= document.documentElement.scrollHeight - window.innerHeight - 2;
    if (fimDaPagina) return pares[pares.length - 1].secao;

    let atual = null;
    for (const { secao } of pares) {
      if (secao.getBoundingClientRect().top <= LINHA) atual = secao;
    }
    return atual;
  }

  // rAF para não recalcular a cada evento de rolagem — o navegador dispara
  // dezenas por segundo, e três getBoundingClientRect por quadro já bastam.
  let agendado = false;
  function aoRolar() {
    if (agendado) return;
    agendado = true;
    requestAnimationFrame(() => {
      agendado = false;
      destacar(secaoAtual());
    });
  }

  window.addEventListener("scroll", aoRolar, { passive: true });
  window.addEventListener("resize", aoRolar, { passive: true });
  aoRolar();
}
