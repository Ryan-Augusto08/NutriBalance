/**
 * Utilidades gerais do NutriBalance — datas, texto e ids.
 *
 * Modulo sem dependencias: nao importa nada e nao toca no DOM nem no estado.
 * Usado pelo dashboard (tela, refeicoes, alimentos) e pelo progresso.
 */

export function isoHoje() {
  return new Date().toISOString().slice(0, 10);
}

export function uid() {
  return crypto.randomUUID();
}

export const arred = (n) => Math.round(Number(n) || 0);

export function formatarDataBR(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// Soma `dias` a uma data ISO (YYYY-MM-DD) sem drift de fuso e devolve ISO.
export function somarDiasISO(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d + dias);
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

// Rótulo amigável do dia: "Hoje", "Ontem" ou "Amanhã" + a data (dd/mm/aaaa).
export function rotuloData(iso) {
  const hoje = isoHoje();
  let rel = "";
  if (iso === hoje) rel = "Hoje";
  else if (iso === somarDiasISO(hoje, -1)) rel = "Ontem";
  else if (iso === somarDiasISO(hoje, 1)) rel = "Amanhã";
  return rel ? `${rel} · ${formatarDataBR(iso)}` : formatarDataBR(iso);
}

export function iniciais(nome) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

export function atrasarChamada(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}
