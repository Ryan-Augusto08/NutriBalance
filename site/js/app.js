// Definida durante o boot como `nutribalance_data_<uid>`, isolando as refeições
// por usuário no mesmo navegador (ver boot() no fim do arquivo).
let STORAGE_KEY = null;
const DATA_VERSION = 2;

/* ---------- utilidades ---------- */

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return crypto.randomUUID();
}

const r = (n) => Math.round(Number(n) || 0);

function formatDateBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

// Soma `dias` a uma data ISO (YYYY-MM-DD) sem drift de fuso e devolve ISO.
function shiftISO(iso, dias) {
  const [y, m, d] = iso.split("-").map(Number);
  const dt = new Date(y, m - 1, d + dias);
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

// Rótulo amigável do dia: "Hoje", "Ontem" ou "Amanhã" + a data (dd/mm/aaaa).
function dateLabel(iso) {
  const hoje = todayISO();
  let rel = "";
  if (iso === hoje) rel = "Hoje";
  else if (iso === shiftISO(hoje, -1)) rel = "Ontem";
  else if (iso === shiftISO(hoje, 1)) rel = "Amanhã";
  return rel ? `${rel} · ${formatDateBR(iso)}` : formatDateBR(iso);
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str ?? "";
  return div.innerHTML;
}

function debounce(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// deriveMacroGoals() vem de js/calculo.js (carregado antes deste arquivo),
// compartilhada com a tela de personalização.

/* ---------- dados / persistência ---------- */

// Estado inicial de um usuário sem dados salvos: perfil vindo da sessão (banco)
// e nenhuma refeição ainda.
function emptyData(profile) {
  return { version: DATA_VERSION, profile: { ...profile }, meals: [] };
}

// Converte o formato antigo (v1: refeição plana com macros) para o novo (v2: refeição com itens).
function migrate(data, sessionProfile) {
  if (data && data.version === DATA_VERSION) return data;
  try {
    const goalKcal = data?.profile?.goalKcal ?? 2000;
    const profile = {
      name: data?.profile?.name ?? "Meu Perfil",
      goalKcal,
      ...deriveMacroGoals(goalKcal),
    };
    const meals = (data?.meals ?? []).map((m) => ({
      id: m.id ?? uid(),
      tipo: m.tipo ?? "Refeição",
      data: m.data ?? todayISO(),
      items: [
        {
          id: uid(),
          nome: m.descricao || m.tipo || "Alimento",
          marca: "",
          gramas: 100,
          kcal100: Number(m.kcal) || 0,
          p100: Number(m.proteina) || 0,
          c100: Number(m.carbo) || 0,
          g100: Number(m.gordura) || 0,
        },
      ],
    }));
    return { version: DATA_VERSION, profile, meals };
  } catch {
    return emptyData(sessionProfile);
  }
}

function goalsOf(p) {
  return {
    goalKcal: p.goalKcal,
    goalCarbo: p.goalCarbo,
    goalProteina: p.goalProteina,
    goalGordura: p.goalGordura,
  };
}

function sameGoals(a, b) {
  return (
    !!a &&
    !!b &&
    a.goalKcal === b.goalKcal &&
    a.goalCarbo === b.goalCarbo &&
    a.goalProteina === b.goalProteina &&
    a.goalGordura === b.goalGordura
  );
}

// Mantém o dashboard em sincronia com a conta (banco). O nome sempre reflete a
// conta logada. Para as metas, o banco é a autoridade quando ELAS MUDAM (via
// personalização): se as metas da sessão diferem do último snapshot
// sincronizado, adota as novas; caso contrário preserva o que está no
// localStorage — que pode conter o ajuste fino manual do modal de perfil.
function syncFromSession(data, sessionProfile) {
  data.profile.name = sessionProfile.name;
  // Foto é da conta (banco), não do localStorage — sempre reflete a sessão.
  data.profile.foto = sessionProfile.foto ?? null;
  const sessionGoals = goalsOf(sessionProfile);
  if (!sameGoals(data.lastSessionGoals, sessionGoals)) {
    Object.assign(data.profile, sessionGoals);
    data.lastSessionGoals = sessionGoals;
  }
  return data;
}

// Carrega as refeições salvas deste usuário; o perfil (nome + metas) é semeado
// da sessão (banco) na primeira vez e mantido em sincronia depois via
// syncFromSession().
function loadData(sessionProfile) {
  const raw = localStorage.getItem(STORAGE_KEY);
  let data;
  if (!raw) {
    data = emptyData(sessionProfile);
  } else {
    let parsed = null;
    try {
      parsed = JSON.parse(raw);
    } catch {
      /* localStorage corrompido — recomeça do perfil da sessão */
    }
    data = parsed ? migrate(parsed, sessionProfile) : emptyData(sessionProfile);
  }
  syncFromSession(data, sessionProfile);
  saveData(data);
  return data;
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

// Inicializado no boot(), depois que a sessão é validada.
let state = null;

// Previsão de resultado (prazo até o objetivo), calculada uma vez no boot a
// partir do perfil da sessão (banco). Ver preverResultado() em calculo.js.
let forecast = null;

// Dia que o dashboard está exibindo (Resumo do Dia + lista de refeições).
// Começa em hoje; as setas ‹ › mudam este valor.
let selectedDate = todayISO();

/* ---------- cálculo de macros ---------- */

function itemMacros(item) {
  const f = (Number(item.gramas) || 0) / 100;
  return {
    kcal: item.kcal100 * f,
    proteina: item.p100 * f,
    carbo: item.c100 * f,
    gordura: item.g100 * f,
  };
}

function sumMacros(list) {
  return list.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      proteina: a.proteina + m.proteina,
      carbo: a.carbo + m.carbo,
      gordura: a.gordura + m.gordura,
    }),
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0 }
  );
}

function mealTotals(meal) {
  return sumMacros(meal.items.map(itemMacros));
}

function dayTotals(dataISO) {
  return sumMacros(
    state.meals.filter((m) => m.data === dataISO).flatMap((m) => m.items.map(itemMacros))
  );
}

/* ---------- detalhamento de macros ---------- */
function macroBlock(macros) {
  return `
    <ul class="macro-legend">
      <li><span class="dot dot-carbo"></span>Carboidrato <b>${r(macros.carbo)} g</b></li>
      <li><span class="dot dot-proteina"></span>Proteína <b>${r(macros.proteina)} g</b></li>
      <li><span class="dot dot-gordura"></span>Gordura <b>${r(macros.gordura)} g</b></li>
    </ul>`;
}

/* ---------- render ---------- */

function progressRow(label, unit, consumed, goal, cls) {
  const pct = goal > 0 ? Math.min(100, (consumed / goal) * 100) : 0;
  const over = consumed > goal && goal > 0;
  const restante = Math.max(0, goal - consumed);
  return `
    <div class="progress-row ${cls} ${over ? "over" : ""}">
      <div class="progress-head">
        <span class="progress-label">${label}</span>
        <span class="progress-nums">${r(consumed)} / ${r(goal)} ${unit}</span>
      </div>
      <div class="progress-track">
        <div class="progress-fill" style="width:${pct}%"></div>
      </div>
      <div class="progress-sub">${
        over ? `Passou ${r(consumed - goal)} ${unit} da meta` : `Restante ${r(restante)} ${unit}`
      }</div>
    </div>`;
}

function renderDailyProgress() {
  const t = dayTotals(selectedDate);
  const p = state.profile;
  document.getElementById("daily-progress").innerHTML = [
    progressRow("Calorias", "kcal", t.kcal, p.goalKcal, "kcal"),
    progressRow("Carboidrato", "g", t.carbo, p.goalCarbo, "carbo"),
    progressRow("Proteína", "g", t.proteina, p.goalProteina, "proteina"),
    progressRow("Gordura", "g", t.gordura, p.goalGordura, "gordura"),
  ].join("");
}

function itemRow(item) {
  const m = itemMacros(item);
  const marca = item.marca ? ` · ${escapeHtml(item.marca)}` : "";
  return `
    <div class="item-row">
      <div class="item-main">
        <span class="item-name">${escapeHtml(item.nome)}${marca}</span>
        <span class="item-sub">${r(item.gramas)} g · ${r(m.kcal)} kcal · P ${r(m.proteina)} · C ${r(m.carbo)} · G ${r(m.gordura)}</span>
      </div>
      <button class="item-del" data-del-item="${item.id}" title="Remover alimento" aria-label="Remover alimento">✕</button>
    </div>`;
}

function mealCard(meal) {
  const totals = mealTotals(meal);
  const itemsHtml = meal.items.length
    ? meal.items.map(itemRow).join("")
    : `<p class="meal-empty">Nenhum alimento ainda. Toque em "+ Adicionar alimento".</p>`;
  const summary = meal.items.length
    ? `<div class="meal-summary">${macroBlock(totals)}<div class="meal-kcal">${r(totals.kcal)} <span>kcal</span></div></div>`
    : "";
  return `
    <div class="meal-card" data-meal-id="${meal.id}">
      <div class="meal-card-head">
        <p class="meal-title">${escapeHtml(meal.tipo)}</p>
        <button class="meal-delete" data-del-meal="${meal.id}">remover</button>
      </div>
      <div class="meal-items">${itemsHtml}</div>
      <button class="add-food-btn" data-add-food="${meal.id}">+ Adicionar alimento</button>
      ${summary}
    </div>`;
}

// Preenche um elemento de avatar (card ou modal) com a foto do perfil, ou
// cai nas iniciais do nome quando não há foto.
function renderAvatarInto(el, profile) {
  if (profile.foto) {
    el.innerHTML = `<img class="avatar-img" src="${escapeHtml(profile.foto)}" alt="Foto de perfil" />`;
    el.classList.add("has-photo");
  } else {
    el.textContent = initials(profile.name);
    el.classList.remove("has-photo");
  }
}

// Linha compacta de previsão no card de perfil. Formatos por tipo de meta;
// esconde quando não há previsão (dados incompletos ou sem peso desejado).
function renderForecastLine() {
  const el = document.getElementById("profile-forecast");
  if (!forecast) {
    el.hidden = true;
    return;
  }
  if (forecast.tipo === "prazo") {
    const data = new Date(forecast.dataISO + "T00:00:00").toLocaleDateString("pt-BR");
    // Prazo relativo ("daqui a 6 meses") no selo; a data exata fica no tooltip.
    el.textContent = `Meta ${prazoRelativo(forecast.dias)}`;
    el.title = `Meta prevista para ${data}`;
  } else if (forecast.tipo === "definir") {
    el.textContent = "Recomposição em andamento";
    el.title = "Objetivo de recomposição corporal (definição)";
  } else {
    el.textContent = "Plano de manutenção";
    el.title = "Objetivo de manter o peso atual";
  }
  el.hidden = false;
}

function render() {
  document.getElementById("profile-name").textContent = state.profile.name;
  document.getElementById("profile-goal").textContent = `Meta: ${state.profile.goalKcal.toLocaleString(
    "pt-BR"
  )} kcal / dia`;
  renderAvatarInto(document.getElementById("profile-avatar"), state.profile);
  renderForecastLine();

  renderDateNav();
  renderDailyProgress();

  const list = document.getElementById("meals-list");
  const doDia = state.meals.filter((m) => m.data === selectedDate);
  if (doDia.length === 0) {
    list.innerHTML = `<p class="empty-state">Nenhuma refeição nesse dia. Toque em + pra adicionar.</p>`;
    return;
  }
  list.innerHTML = doDia.map(mealCard).join("");
}

// Atualiza o rótulo da barra de data e o botão "Copiar refeições de ontem".
function renderDateNav() {
  document.getElementById("date-value").textContent = dateLabel(selectedDate);

  const anterior = shiftISO(selectedDate, -1);
  const temAnterior = state.meals.some((m) => m.data === anterior);
  const btn = document.getElementById("copy-day-btn");
  if (temAnterior) {
    btn.textContent = `Copiar refeições de ${dateLabel(anterior)}`;
    btn.hidden = false;
  } else {
    btn.hidden = true;
  }
}

/* ---------- ações sobre refeições/itens ---------- */

function removeMeal(id) {
  state.meals = state.meals.filter((m) => m.id !== id);
  saveData(state);
  render();
}

function removeItem(itemId) {
  for (const meal of state.meals) {
    const before = meal.items.length;
    meal.items = meal.items.filter((it) => it.id !== itemId);
    if (meal.items.length !== before) break;
  }
  saveData(state);
  render();
}

// Delegação de eventos na lista de refeições
document.getElementById("meals-list").addEventListener("click", (e) => {
  const addFood = e.target.closest("[data-add-food]");
  if (addFood) return openFoodSearch(addFood.dataset.addFood);

  const delItem = e.target.closest("[data-del-item]");
  if (delItem) return removeItem(delItem.dataset.delItem);

  const delMeal = e.target.closest("[data-del-meal]");
  if (delMeal && confirm("Remover essa refeição inteira?")) return removeMeal(delMeal.dataset.delMeal);
});

/* ---------- navegação por data ---------- */

document.getElementById("date-prev").addEventListener("click", () => {
  selectedDate = shiftISO(selectedDate, -1);
  render();
});

document.getElementById("date-next").addEventListener("click", () => {
  selectedDate = shiftISO(selectedDate, 1);
  render();
});

// Copia (clona) as refeições do dia anterior para o dia selecionado,
// mantendo as que já existirem no dia atual. Cada refeição/item ganha novo id.
document.getElementById("copy-day-btn").addEventListener("click", () => {
  const anterior = shiftISO(selectedDate, -1);
  const doAnterior = state.meals.filter((m) => m.data === anterior);
  if (doAnterior.length === 0) return;
  for (const m of doAnterior) {
    state.meals.push({
      id: uid(),
      tipo: m.tipo,
      data: selectedDate,
      items: m.items.map((it) => ({ ...it, id: uid() })),
    });
  }
  saveData(state);
  render();
});

/* ---------- modal: nova refeição ---------- */

const mealModal = document.getElementById("meal-modal-overlay");
const mealForm = document.getElementById("meal-form");

document.getElementById("add-meal-btn").addEventListener("click", () => {
  mealForm.reset();
  // Adiciona no dia que está sendo exibido (permite planejar dias futuros).
  document.getElementById("meal-data").value = selectedDate;
  mealModal.hidden = false;
});

document.getElementById("meal-cancel-btn").addEventListener("click", () => {
  mealModal.hidden = true;
});

mealForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.meals.push({
    id: uid(),
    tipo: document.getElementById("meal-tipo").value,
    data: document.getElementById("meal-data").value,
    items: [],
  });
  saveData(state);
  mealModal.hidden = true;
  render();
});

/* ---------- modal: buscar alimento (TACO / banco MySQL) ---------- */

const foodModal = document.getElementById("food-modal-overlay");
const foodSearchInput = document.getElementById("food-search-input");
const foodResultsEl = document.getElementById("food-results");
const foodPreviewEl = document.getElementById("food-preview");
const foodPreviewNameEl = document.getElementById("food-preview-name");
const foodPreviewMacrosEl = document.getElementById("food-preview-macros");
const foodQtyInput = document.getElementById("food-qty");
const foodQtyChipsEl = document.getElementById("food-qty-chips");
const manualToggle = document.getElementById("manual-toggle");

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
function porcoesDe(food) {
  const nome = normalizar(food.nome);
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

function renderQtyChips() {
  if (!selectedFood) return;
  const atual = Number(foodQtyInput.value) || 0;
  foodQtyChipsEl.innerHTML = porcoesDe(selectedFood)
    .map(
      (c) =>
        `<button type="button" class="qty-chip${c.gramas === atual ? " active" : ""}" data-g="${c.gramas}">${
          c.nomeado ? `${escapeHtml(c.rotulo)} · ${c.gramas} g` : escapeHtml(c.rotulo)
        }</button>`
    )
    .join("");
}

foodQtyChipsEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".qty-chip");
  if (!chip || !selectedFood) return;
  foodQtyInput.value = chip.dataset.g;
  renderPreview();
  renderQtyChips();
});
const manualForm = document.getElementById("manual-form");

let currentMealId = null;
let lastResults = [];
let selectedFood = null;

function openFoodSearch(mealId) {
  currentMealId = mealId;
  selectedFood = null;
  lastResults = [];
  foodSearchInput.value = "";
  foodResultsEl.innerHTML = `<p class="food-hint">Digite pra buscar no banco de alimentos.</p>`;
  foodPreviewEl.hidden = true;
  manualForm.hidden = true;
  manualForm.reset();
  foodModal.hidden = false;
  foodSearchInput.focus();
}

document.getElementById("food-cancel-btn").addEventListener("click", () => {
  foodModal.hidden = true;
});

// Busca no banco local (MySQL/TACO) via backend PHP. O JSON ja vem no formato
// que o app usa para cada alimento: { nome, marca, categoria, kcal100, p100, c100, g100 }.
async function searchFoods(q) {
  const url = "api/buscar.php?q=" + encodeURIComponent(q);
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const foods = await res.json();
  return Array.isArray(foods) ? foods : [];
}

function renderResults(foods) {
  lastResults = foods;
  if (!foods.length) {
    foodResultsEl.innerHTML = `<p class="food-hint">Nenhum alimento encontrado. Tente outro termo ou adicione manualmente.</p>`;
    return;
  }
  foodResultsEl.innerHTML = foods
    .map(
      (f, i) => `
      <button type="button" class="food-result" data-idx="${i}">
        <span class="food-name">${escapeHtml(f.nome)}</span>
        <span class="food-meta">${(f.marca || f.categoria) ? escapeHtml(f.marca || f.categoria) + " · " : ""}${r(f.kcal100)} kcal / 100 g</span>
      </button>`
    )
    .join("");
}

const runSearch = debounce(async () => {
  const q = foodSearchInput.value.trim();
  if (q.length < 2) {
    foodResultsEl.innerHTML = `<p class="food-hint">Digite pelo menos 2 letras.</p>`;
    return;
  }
  foodResultsEl.innerHTML = `<p class="food-hint">Buscando…</p>`;
  try {
    renderResults(await searchFoods(q));
  } catch {
    foodResultsEl.innerHTML = `<p class="food-error">Não foi possível consultar o banco de alimentos. Verifique se o Apache e o MySQL do XAMPP estão ligados, ou use "Adicionar manualmente" abaixo.</p>`;
  }
}, 400);

foodSearchInput.addEventListener("input", runSearch);

foodResultsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".food-result");
  if (!btn) return;
  selectFood(lastResults[Number(btn.dataset.idx)]);
});

function previewMacros() {
  const gramas = Number(foodQtyInput.value) || 0;
  const f = gramas / 100;
  return {
    gramas,
    kcal: selectedFood.kcal100 * f,
    proteina: selectedFood.p100 * f,
    carbo: selectedFood.c100 * f,
    gordura: selectedFood.g100 * f,
  };
}

function renderPreview() {
  const m = previewMacros();
  foodPreviewNameEl.textContent =
    selectedFood.nome + (selectedFood.marca ? " · " + selectedFood.marca : "") + ` — ${r(m.kcal)} kcal`;
  foodPreviewMacrosEl.innerHTML = macroBlock(m);
}

function selectFood(food) {
  if (!food) return;
  selectedFood = food;
  foodQtyInput.value = 100;
  renderPreview();
  renderQtyChips();
  foodPreviewEl.hidden = false;
  foodPreviewEl.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

foodQtyInput.addEventListener("input", () => {
  if (selectedFood) {
    renderPreview();
    renderQtyChips();
  }
});

document.getElementById("food-add-btn").addEventListener("click", () => {
  const gramas = Number(foodQtyInput.value);
  if (!selectedFood || !(gramas > 0)) return;
  addItemToCurrentMeal({
    nome: selectedFood.nome,
    marca: selectedFood.marca,
    gramas,
    kcal100: selectedFood.kcal100,
    p100: selectedFood.p100,
    c100: selectedFood.c100,
    g100: selectedFood.g100,
  });
});

function addItemToCurrentMeal(item) {
  const meal = state.meals.find((m) => m.id === currentMealId);
  if (!meal) return;
  meal.items.push({ id: uid(), ...item });
  saveData(state);
  foodModal.hidden = true;
  render();
}

/* fallback manual */
manualToggle.addEventListener("click", () => {
  manualForm.hidden = !manualForm.hidden;
  if (!manualForm.hidden) manualForm.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

manualForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const gramas = Number(document.getElementById("manual-gramas").value);
  if (!(gramas > 0)) return;
  const factor = 100 / gramas; // macros informados são para essa quantidade → converte pra base 100 g
  addItemToCurrentMeal({
    nome: document.getElementById("manual-nome").value.trim(),
    marca: "",
    gramas,
    kcal100: (Number(document.getElementById("manual-kcal").value) || 0) * factor,
    p100: (Number(document.getElementById("manual-proteina").value) || 0) * factor,
    c100: (Number(document.getElementById("manual-carbo").value) || 0) * factor,
    g100: (Number(document.getElementById("manual-gordura").value) || 0) * factor,
  });
});

/* ---------- modal: perfil ---------- */

const profileModal = document.getElementById("profile-modal-overlay");
const profileForm = document.getElementById("profile-form");

document.getElementById("edit-profile-btn").addEventListener("click", () => {
  document.getElementById("profile-name-input").value = state.profile.name;
  document.getElementById("profile-goal-input").value = state.profile.goalKcal;
  document.getElementById("profile-carbo-input").value = state.profile.goalCarbo;
  document.getElementById("profile-proteina-input").value = state.profile.goalProteina;
  document.getElementById("profile-gordura-input").value = state.profile.goalGordura;
  document.getElementById("avatar-error").hidden = true;
  renderModalAvatar();
  profileModal.hidden = false;
});

/* ---------- foto de perfil (avatar) ---------- */

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const AVATAR_MAX_BYTES = 3 * 1024 * 1024; // 3 MB — igual ao limite do api/foto.php
const avatarInput = document.getElementById("avatar-input");
const avatarErrorEl = document.getElementById("avatar-error");

// Atualiza a prévia do avatar dentro do modal e mostra "Remover" só quando há foto.
function renderModalAvatar() {
  renderAvatarInto(document.getElementById("modal-avatar"), state.profile);
  document.getElementById("avatar-remove-btn").hidden = !state.profile.foto;
}

// Erro inline no modal quando ele está aberto; senão, alerta (clique direto no avatar do card).
function notifyAvatarError(msg) {
  if (!profileModal.hidden) {
    avatarErrorEl.textContent = msg;
    avatarErrorEl.hidden = false;
  } else {
    alert(msg);
  }
}

async function uploadAvatar(file) {
  const fd = new FormData();
  fd.append("foto", file);
  const res = await fetch("api/foto.php", { method: "POST", body: fd });
  let dados = {};
  try {
    dados = await res.json();
  } catch {
    /* resposta sem corpo JSON */
  }
  return { status: res.status, dados };
}

// Abre o seletor de arquivo tanto pelo avatar do card quanto pelo botão do modal.
document.getElementById("profile-avatar").addEventListener("click", () => avatarInput.click());
document.getElementById("avatar-choose-btn").addEventListener("click", () => avatarInput.click());

avatarInput.addEventListener("change", async () => {
  const file = avatarInput.files[0];
  avatarInput.value = ""; // permite reenviar o mesmo arquivo depois
  if (!file) return;
  avatarErrorEl.hidden = true;

  if (!TIPOS_IMAGEM.includes(file.type)) {
    return notifyAvatarError("Formato inválido. Use uma imagem JPG, PNG ou WEBP.");
  }
  if (file.size > AVATAR_MAX_BYTES) {
    return notifyAvatarError("A imagem deve ter no máximo 3 MB.");
  }

  const { status, dados } = await uploadAvatar(file).catch(() => ({ status: 0, dados: {} }));
  if (status === 200 && dados.ok) {
    state.profile.foto = dados.foto;
    saveData(state);
    render();
    renderModalAvatar();
  } else {
    notifyAvatarError(dados.erro || "Não foi possível enviar a foto. Verifique se o servidor está no ar.");
  }
});

document.getElementById("avatar-remove-btn").addEventListener("click", async () => {
  if (!state.profile.foto) return;
  avatarErrorEl.hidden = true;
  const { status, dados } = await apiPost("api/foto.php", { acao: "remover" }).catch(() => ({
    status: 0,
    dados: {},
  }));
  if (status === 200 && dados.ok) {
    state.profile.foto = null;
    saveData(state);
    render();
    renderModalAvatar();
  } else {
    notifyAvatarError(dados.erro || "Não foi possível remover a foto.");
  }
});

document.getElementById("profile-cancel-btn").addEventListener("click", () => {
  profileModal.hidden = true;
});

profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const goalKcal = Number(document.getElementById("profile-goal-input").value);
  // Recalcula os macros pelas kcal mantendo a proporção atual (state.profile
  // ainda guarda os valores de abertura do modal).
  const g = scaleMacrosToKcal(goalKcal, state.profile);
  state.profile.name = document.getElementById("profile-name-input").value.trim();
  state.profile.goalKcal = goalKcal;
  state.profile.goalCarbo = g.goalCarbo;
  state.profile.goalProteina = g.goalProteina;
  state.profile.goalGordura = g.goalGordura;
  saveData(state);
  profileModal.hidden = true;
  render();
});

/* ---------- botão Mudar meta (recalcula pela personalização, grava no banco) ---------- */
document.getElementById("edit-plan-btn").addEventListener("click", () => {
  window.location.href = "personalizacao.html";
});

/* ---------- botão Sair ---------- */
document.getElementById("logout-btn").addEventListener("click", logout);

/* ---------- boot: valida a sessão antes de montar o dashboard ---------- */
async function boot() {
  // guard() (auth.js) redireciona pra login se não autenticado, ou pra
  // personalizacao.html se o perfil ainda estiver incompleto.
  const session = await guard();
  if (!session) return;

  const p = session.perfil;
  const sessionProfile = {
    name: session.usuario.nome,
    foto: session.usuario.foto ?? null,
    goalKcal: p.goalKcal,
    goalCarbo: p.goalCarbo,
    goalProteina: p.goalProteina,
    goalGordura: p.goalGordura,
  };

  // O perfil da sessão traz sexo/idade/altura/peso/atividade/meta/peso_alvo/objetivo,
  // tudo que preverResultado precisa para estimar o prazo até o objetivo.
  forecast = preverResultado(p);

  STORAGE_KEY = `nutribalance_data_${session.usuario.id}`;
  state = loadData(sessionProfile);
  render();

  // Seção de Progresso (histórico de peso/cintura + gráfico). Definida em
  // progresso.js, carregado antes deste arquivo. A sessão já foi validada.
  if (typeof initProgresso === "function") initProgresso(session);
}

boot();
