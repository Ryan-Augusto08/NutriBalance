/**
 * Calculo de macros a partir dos itens das refeicoes.
 *
 * Cada item guarda os valores por 100 g (kcal100, proteina100, ...) e a
 * quantidade em gramas; aqui eles viram os numeros consumidos de verdade.
 */

import { estado } from "./estado.js";
import { arred } from "./utilitarios.js";

export function macrosDoItem(item) {
  const f = (Number(item.gramas) || 0) / 100;
  return {
    kcal: item.kcal100 * f,
    proteina: item.proteina100 * f,
    carbo: item.carbo100 * f,
    gordura: item.gordura100 * f,
  };
}

export function somarMacros(lista) {
  return lista.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      proteina: a.proteina + m.proteina,
      carbo: a.carbo + m.carbo,
      gordura: a.gordura + m.gordura,
    }),
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0 }
  );
}

export function totaisDaRefeicao(refeicao) {
  return somarMacros(refeicao.itens.map(macrosDoItem));
}

export function totaisDoDia(dataISO) {
  return somarMacros(
    estado.dados.refeicoes
      .filter((m) => m.data === dataISO)
      .flatMap((m) => m.itens.map(macrosDoItem))
  );
}

/* ---------- detalhamento de macros ---------- */
// Legenda de bolinhas (.macro-legenda em css/base.css), reaproveitada no card
// de refeição e na prévia do alimento.
export function blocoMacros(macros) {
  return `
    <ul class="macro-legenda">
      <li><span class="bolinha bolinha-carbo"></span>Carboidrato <b>${arred(macros.carbo)} g</b></li>
      <li><span class="bolinha bolinha-proteina"></span>Proteína <b>${arred(macros.proteina)} g</b></li>
      <li><span class="bolinha bolinha-gordura"></span>Gordura <b>${arred(macros.gordura)} g</b></li>
    </ul>`;
}
