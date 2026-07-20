const STORAGE_KEY = "nutribalance_data";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function seedData() {
  const today = todayISO();
  return {
    profile: { name: "João Silva", goalKcal: 2000 },
    meals: [
      {
        id: crypto.randomUUID(),
        tipo: "Café da Manhã",
        descricao: "Ovos mexidos com pão integral",
        kcal: 350,
        proteina: 22,
        carbo: 30,
        gordura: 15,
        data: today,
      },
      {
        id: crypto.randomUUID(),
        tipo: "Almoço",
        descricao: "Frango grelhado com arroz e salada",
        kcal: 620,
        proteina: 42,
        carbo: 70,
        gordura: 18,
        data: today,
      },
      {
        id: crypto.randomUUID(),
        tipo: "Lanche da Tarde",
        descricao: "Iogurte natural com granola e banana",
        kcal: 280,
        proteina: 18,
        carbo: 35,
        gordura: 8,
        data: today,
      },
    ],
  };
}

function loadData() {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    const data = seedData();
    saveData(data);
    return data;
  }
  return JSON.parse(raw);
}

function saveData(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

let state = loadData();

function formatDateBR(iso) {
  const [y, m, d] = iso.split("-");
  return `${d}/${m}/${y}`;
}

function initials(name) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function todaysMeals() {
  const today = todayISO();
  return state.meals.filter((m) => m.data === today);
}

function render() {
  document.getElementById("profile-name").textContent = state.profile.name;
  document.getElementById(
    "profile-goal"
  ).textContent = `Meta: ${state.profile.goalKcal.toLocaleString("pt-BR")} kcal / dia`;
  document.getElementById("profile-avatar").textContent = initials(state.profile.name);

  const meals = todaysMeals();
  const totals = meals.reduce(
    (acc, m) => {
      acc.kcal += Number(m.kcal);
      acc.proteina += Number(m.proteina);
      acc.carbo += Number(m.carbo);
      acc.gordura += Number(m.gordura);
      return acc;
    },
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0 }
  );

  document.getElementById("stat-kcal").textContent = totals.kcal.toLocaleString("pt-BR");
  document.getElementById("stat-protein").textContent = `${totals.proteina}g`;
  document.getElementById("stat-carbs").textContent = `${totals.carbo}g`;
  document.getElementById("stat-fat").textContent = `${totals.gordura}g`;

  const list = document.getElementById("meals-list");
  list.innerHTML = "";

  if (state.meals.length === 0) {
    const empty = document.createElement("p");
    empty.className = "empty-state";
    empty.textContent = "Nenhuma refeição registrada ainda. Toque em + pra adicionar.";
    list.appendChild(empty);
    return;
  }

  const sorted = [...state.meals].sort((a, b) => (a.data < b.data ? 1 : -1));

  for (const meal of sorted) {
    const card = document.createElement("div");
    card.className = "meal-card";
    card.innerHTML = `
      <div class="meal-main">
        <p class="meal-title">${escapeHtml(meal.tipo)}</p>
        <p class="meal-desc">${escapeHtml(meal.descricao)}</p>
        <p class="meal-macros">${meal.kcal} kcal · P: ${meal.proteina}g · C: ${meal.carbo}g · G: ${meal.gordura}g</p>
      </div>
      <div class="meal-side">
        <span class="meal-date">${formatDateBR(meal.data)}</span>
        <button class="meal-delete" data-id="${meal.id}">remover</button>
      </div>
    `;
    list.appendChild(card);
  }

  list.querySelectorAll(".meal-delete").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (confirm("Remover essa refeição?")) {
        state.meals = state.meals.filter((m) => m.id !== btn.dataset.id);
        saveData(state);
        render();
      }
    });
  });
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// Meal modal
const mealModal = document.getElementById("meal-modal-overlay");
const mealForm = document.getElementById("meal-form");

document.getElementById("add-meal-btn").addEventListener("click", () => {
  mealForm.reset();
  document.getElementById("meal-data").value = todayISO();
  mealModal.hidden = false;
});

document.getElementById("meal-cancel-btn").addEventListener("click", () => {
  mealModal.hidden = true;
});

mealForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.meals.push({
    id: crypto.randomUUID(),
    tipo: document.getElementById("meal-tipo").value,
    descricao: document.getElementById("meal-descricao").value.trim(),
    kcal: Number(document.getElementById("meal-kcal").value),
    proteina: Number(document.getElementById("meal-proteina").value),
    carbo: Number(document.getElementById("meal-carbo").value),
    gordura: Number(document.getElementById("meal-gordura").value),
    data: document.getElementById("meal-data").value,
  });
  saveData(state);
  mealModal.hidden = true;
  render();
});

// Profile modal
const profileModal = document.getElementById("profile-modal-overlay");
const profileForm = document.getElementById("profile-form");

document.getElementById("edit-profile-btn").addEventListener("click", () => {
  document.getElementById("profile-name-input").value = state.profile.name;
  document.getElementById("profile-goal-input").value = state.profile.goalKcal;
  profileModal.hidden = false;
});

document.getElementById("profile-cancel-btn").addEventListener("click", () => {
  profileModal.hidden = true;
});

profileForm.addEventListener("submit", (e) => {
  e.preventDefault();
  state.profile.name = document.getElementById("profile-name-input").value.trim();
  state.profile.goalKcal = Number(document.getElementById("profile-goal-input").value);
  saveData(state);
  profileModal.hidden = true;
  render();
});

render();
