/**
 * Modal de busca de alimento (TACO / banco MySQL).
 *
 * Fluxo: digitar -> api/buscar.php -> escolher um resultado -> ajustar a
 * quantidade (campo livre ou chips de medida caseira) -> adicionar na refeicao.
 * Quando o alimento nao esta na TACO, o formulario manual resolve.
 *
 * Importar este modulo ja registra os listeners; abrirBuscaAlimento() e
 * chamada por refeicoes.js quando o usuario toca em "+ Adicionar alimento".
 */

import { estado } from "./estado.js";
import { salvarDados } from "./dados.js";
import { atualizarTela } from "./tela.js";
import { blocoMacros } from "./macros.js";
import { arred, atrasarChamada, escaparHtml, uid } from "./utilitarios.js";

const modalAlimento = document.getElementById("alimento-modal-fundo");
const campoBuscaAlimento = document.getElementById("alimento-busca-campo");
const elResultadosAlimento = document.getElementById("alimento-resultados");
const elPreviaAlimento = document.getElementById("alimento-previa");
const elPreviaAlimentoNome = document.getElementById("alimento-previa-nome");
const elPreviaAlimentoMacros = document.getElementById("alimento-previa-macros");
const campoQtdAlimento = document.getElementById("alimento-qtd");
const elChipsQtd = document.getElementById("alimento-qtd-chips");
const botaoManual = document.getElementById("manual-alternar");
const formManual = document.getElementById("manual-form");

/* ---------- estado do modal ---------- */

let idRefeicaoAtual = null;
let ultimosResultados = [];
let alimentoSelecionado = null;

/* ---------- porções em medidas caseiras ---------- */
// A TACO não traz peso de porção; estes valores seguem tabelas de medidas
// caseiras (ex.: Pinheiro et al.) e servem só como atalho. O usuário sempre
// pode digitar os gramas na mão. Vence a PRIMEIRA regra que casar com o nome.
const PORCOES = [
  { chave: /pao.*(forma|integral|gluten|aveia|milho)|forma/, itens: [["1 fatia", 25], ["2 fatias", 50]] },
  { chave: /pao.*(frances|sal|agua)|frances/, itens: [["1 unidade", 50]] },
  { chave: /arroz/, itens: [["1 colher de sopa", 25], ["1 escumadeira", 90]] },
  { chave: /feijao/, itens: [["1 concha", 80]] },
  { chave: /macarrao|espaguete|talharim/, itens: [["1 pegador", 100]] },
  { chave: /ovo.*(galinha|inteiro|frito|cozido|omelete|poche)/, itens: [["1 unidade", 50]] },
  { chave: /frango.*(peito|file|grelh|assad)/, itens: [["1 filé", 120]] },
  { chave: /carne|bife|patinho|alcatra|coxao|contra/, itens: [["1 bife", 100]] },
  { chave: /banana/, itens: [["1 unidade", 100]] },
  { chave: /maca\b/, itens: [["1 unidade", 130]] },
  { chave: /mamao|melao|melancia|abacaxi/, itens: [["1 fatia", 150]] },
  { chave: /leite.*(vaca|po|integral|desnatado|semi)/, itens: [["1 copo", 200]] },
  { chave: /batata/, itens: [["1 unidade média", 120]] },
];

const ACENTOS = { á:"a", à:"a", ã:"a", â:"a", ä:"a", é:"e", ê:"e", ë:"e", í:"i", ï:"i", ó:"o", ô:"o", õ:"o", ö:"o", ú:"u", ü:"u", ç:"c" };
function normalizar(s) {
  return (s || "").toLowerCase().replace(/[áàãâäéêëíïóôõöúüç]/g, (c) => ACENTOS[c] || c);
}

// Monta os chips de um alimento: porções caseiras que casarem + 100 g e 150 g
// como base genérica (sem duplicar gramaturas que a porção caseira já cobre).
function porcoesDe(alimento) {
  const nome = normalizar(alimento.nome);
  let nomeados = [];
  for (const p of PORCOES) {
    if (p.chave.test(nome)) { nomeados = p.itens; break; }
  }
  const chips = nomeados.map(([rotulo, g]) => ({ rotulo, gramas: g, nomeado: true }));
  for (const g of [100, 150]) {
    if (!chips.some((c) => c.gramas === g)) chips.push({ rotulo: g + " g", gramas: g, nomeado: false });
  }
  return chips;
}

function mostrarChipsQtd() {
  if (!alimentoSelecionado) return;
  const atual = Number(campoQtdAlimento.value) || 0;
  elChipsQtd.innerHTML = porcoesDe(alimentoSelecionado)
    .map(
      (c) =>
        `<button type="button" class="qtd-chip${c.gramas === atual ? " ativo" : ""}" data-g="${c.gramas}">${
          c.nomeado ? `${escaparHtml(c.rotulo)} · ${c.gramas} g` : escaparHtml(c.rotulo)
        }</button>`
    )
    .join("");
}

elChipsQtd.addEventListener("click", (e) => {
  const chip = e.target.closest(".qtd-chip");
  if (!chip || !alimentoSelecionado) return;
  campoQtdAlimento.value = chip.dataset.g;
  mostrarPrevia();
  mostrarChipsQtd();
});

/* ---------- abrir e fechar ---------- */

export function abrirBuscaAlimento(idRefeicao) {
  idRefeicaoAtual = idRefeicao;
  alimentoSelecionado = null;
  ultimosResultados = [];
  campoBuscaAlimento.value = "";
  elResultadosAlimento.innerHTML = `<p class="alimento-dica">Digite pra buscar no banco de alimentos.</p>`;
  elPreviaAlimento.hidden = true;
  formManual.hidden = true;
  formManual.reset();
  modalAlimento.hidden = false;
  campoBuscaAlimento.focus();
}

document.getElementById("alimento-cancelar-btn").addEventListener("click", () => {
  modalAlimento.hidden = true;
});

/* ---------- busca ---------- */

// Busca no banco local (MySQL/TACO) via backend PHP. O JSON ja vem no formato
// que o app usa para cada alimento:
// { nome, marca, categoria, kcal100, proteina100, carbo100, gordura100 }.
async function buscarAlimentos(q) {
  const url = "api/buscar.php?q=" + encodeURIComponent(q);
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const alimentos = await res.json();
  return Array.isArray(alimentos) ? alimentos : [];
}

function mostrarResultados(alimentos) {
  ultimosResultados = alimentos;
  if (!alimentos.length) {
    elResultadosAlimento.innerHTML = `<p class="alimento-dica">Nenhum alimento encontrado. Tente outro termo ou adicione manualmente.</p>`;
    return;
  }
  elResultadosAlimento.innerHTML = alimentos
    .map(
      (a, i) => `
      <button type="button" class="alimento-resultado" data-idx="${i}">
        <span class="alimento-nome">${escaparHtml(a.nome)}</span>
        <span class="alimento-info">${(a.marca || a.categoria) ? escaparHtml(a.marca || a.categoria) + " · " : ""}${arred(a.kcal100)} kcal / 100 g</span>
      </button>`
    )
    .join("");
}

const executarBusca = atrasarChamada(async () => {
  const q = campoBuscaAlimento.value.trim();
  if (q.length < 2) {
    elResultadosAlimento.innerHTML = `<p class="alimento-dica">Digite pelo menos 2 letras.</p>`;
    return;
  }
  elResultadosAlimento.innerHTML = `<p class="alimento-dica">Buscando…</p>`;
  try {
    mostrarResultados(await buscarAlimentos(q));
  } catch {
    elResultadosAlimento.innerHTML = `<p class="alimento-erro">Não foi possível consultar o banco de alimentos. Verifique se o Apache e o MySQL do XAMPP estão ligados, ou use "Adicionar manualmente" abaixo.</p>`;
  }
}, 400);

campoBuscaAlimento.addEventListener("input", executarBusca);

elResultadosAlimento.addEventListener("click", (e) => {
  const btn = e.target.closest(".alimento-resultado");
  if (!btn) return;
  selecionarAlimento(ultimosResultados[Number(btn.dataset.idx)]);
});

/* ---------- prévia e quantidade ---------- */

function macrosDaPrevia() {
  const gramas = Number(campoQtdAlimento.value) || 0;
  const f = gramas / 100;
  return {
    gramas,
    kcal: alimentoSelecionado.kcal100 * f,
    proteina: alimentoSelecionado.proteina100 * f,
    carbo: alimentoSelecionado.carbo100 * f,
    gordura: alimentoSelecionado.gordura100 * f,
  };
}

function mostrarPrevia() {
  const m = macrosDaPrevia();
  elPreviaAlimentoNome.textContent =
    alimentoSelecionado.nome +
    (alimentoSelecionado.marca ? " · " + alimentoSelecionado.marca : "") +
    ` — ${arred(m.kcal)} kcal`;
  elPreviaAlimentoMacros.innerHTML = blocoMacros(m);
}

function selecionarAlimento(alimento) {
  if (!alimento) return;
  alimentoSelecionado = alimento;
  campoQtdAlimento.value = 100;
  mostrarPrevia();
  mostrarChipsQtd();
  elPreviaAlimento.hidden = false;
  elPreviaAlimento.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

campoQtdAlimento.addEventListener("input", () => {
  if (alimentoSelecionado) {
    mostrarPrevia();
    mostrarChipsQtd();
  }
});

/* ---------- adicionar na refeição ---------- */

document.getElementById("alimento-adicionar-btn").addEventListener("click", () => {
  const gramas = Number(campoQtdAlimento.value);
  if (!alimentoSelecionado || !(gramas > 0)) return;
  adicionarItemNaRefeicao({
    nome: alimentoSelecionado.nome,
    marca: alimentoSelecionado.marca,
    gramas,
    kcal100: alimentoSelecionado.kcal100,
    proteina100: alimentoSelecionado.proteina100,
    carbo100: alimentoSelecionado.carbo100,
    gordura100: alimentoSelecionado.gordura100,
  });
});

function adicionarItemNaRefeicao(item) {
  const refeicao = estado.dados.refeicoes.find((m) => m.id === idRefeicaoAtual);
  if (!refeicao) return;
  refeicao.itens.push({ id: uid(), ...item });
  salvarDados();
  modalAlimento.hidden = true;
  atualizarTela();
}

/* ---------- entrada manual (quando o alimento não está na TACO) ---------- */

botaoManual.addEventListener("click", () => {
  formManual.hidden = !formManual.hidden;
  if (!formManual.hidden) formManual.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

formManual.addEventListener("submit", (e) => {
  e.preventDefault();
  const gramas = Number(document.getElementById("manual-gramas").value);
  if (!(gramas > 0)) return;
  const fator = 100 / gramas; // macros informados são para essa quantidade → converte pra base 100 g
  adicionarItemNaRefeicao({
    nome: document.getElementById("manual-nome").value.trim(),
    marca: "",
    gramas,
    kcal100: (Number(document.getElementById("manual-kcal").value) || 0) * fator,
    proteina100: (Number(document.getElementById("manual-proteina").value) || 0) * fator,
    carbo100: (Number(document.getElementById("manual-carbo").value) || 0) * fator,
    gordura100: (Number(document.getElementById("manual-gordura").value) || 0) * fator,
  });
});
