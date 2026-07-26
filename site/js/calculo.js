/**
 * Cálculo de metas nutricionais — compartilhado entre app.js (dashboard),
 * personalizacao.js (onboarding) e replicado em PHP (salvar_perfil.php, que é
 * a autoridade no salvamento). Carregado como <script> antes desses arquivos,
 * então expõe funções globais (o site não usa módulos ES).
 */

/* ---------- metas de macro ---------- */
// Divisões de macro (kcal/g: carbo 4, proteína 4, gordura 9).
// Padrão: 50/20/30. Definição (recomposição): mais proteína — 40/35/25.
const DIVISAO_PADRAO = { carbo: 0.5, proteina: 0.2, gordura: 0.3 };
const DIVISAO_DEFINICAO = { carbo: 0.4, proteina: 0.35, gordura: 0.25 };

// `objetivo` é opcional: só "definir" (meta manter) troca a divisão; o resto usa o padrão.
function derivarMetasMacro(metaKcal, objetivo) {
  const k = Number(metaKcal) || 0;
  const d = objetivo === "definir" ? DIVISAO_DEFINICAO : DIVISAO_PADRAO;
  return {
    metaCarbo: Math.round((k * d.carbo) / 4),
    metaProteina: Math.round((k * d.proteina) / 4),
    metaGordura: Math.round((k * d.gordura) / 9),
  };
}

// Reescala as metas de macro para um novo total de kcal MANTENDO a proporção
// atual (percentual de cada macro no total). Preserva a divisão do usuário
// (padrão, definição ou ajuste manual). Sem base válida, cai na divisão padrão.
// kcal/g: carbo 4, proteína 4, gordura 9.
function ajustarMacrosParaKcal(novaKcal, macros) {
  const k = Number(novaKcal) || 0;
  const kcalCarbo = (Number(macros.metaCarbo) || 0) * 4;
  const kcalProteina = (Number(macros.metaProteina) || 0) * 4;
  const kcalGordura = (Number(macros.metaGordura) || 0) * 9;
  const total = kcalCarbo + kcalProteina + kcalGordura;
  if (!(total > 0)) return derivarMetasMacro(k);
  return {
    metaCarbo: Math.round((k * (kcalCarbo / total)) / 4),
    metaProteina: Math.round((k * (kcalProteina / total)) / 4),
    metaGordura: Math.round((k * (kcalGordura / total)) / 9),
  };
}

/* ---------- meta diária de kcal ---------- */
// Fatores de atividade física (multiplicam o metabolismo basal → TDEE).
const FATOR_ATIVIDADE = {
  sedentario: 1.2,
  leve: 1.375,
  moderado: 1.55,
  intenso: 1.725,
  muito_intenso: 1.9,
};

// Ajuste conforme o objetivo: déficit de 15% p/ perder, superávit de 15% p/ ganhar.
const AJUSTE_META = {
  perder: -0.15,
  manter: 0,
  ganhar: 0.15,
};

/**
 * Calcula a meta diária de kcal via Mifflin-St Jeor × fator de atividade ×
 * ajuste da meta. Retorna `null` se faltar algum dado obrigatório.
 *
 * @param {{sexo:string, idade:number, altura_cm:number, peso_kg:number,
 *          atividade:string, meta:string, objetivo?:string}} d
 */
/**
 * Gasto energético diário (TDEE) = metabolismo basal (Mifflin-St Jeor) × fator
 * de atividade. Retorna `null` se faltar algum dado obrigatório.
 * @returns {number|null}
 */
function calcularTDEE(d) {
  const sexo = d.sexo;
  const idade = Number(d.idade);
  const altura = Number(d.altura_cm);
  const peso = Number(d.peso_kg);
  const fator = FATOR_ATIVIDADE[d.atividade];

  if (
    (sexo !== "M" && sexo !== "F") ||
    !(idade > 0) ||
    !(altura > 0) ||
    !(peso > 0) ||
    fator === undefined
  ) {
    return null;
  }
  const tmb = 10 * peso + 6.25 * altura - 5 * idade + (sexo === "M" ? 5 : -161);
  return tmb * fator;
}

function calcularMeta(d) {
  const tdee = calcularTDEE(d);
  const ajuste = AJUSTE_META[d.meta];
  if (tdee === null || ajuste === undefined) return null;

  const metaKcal = Math.round(tdee * (1 + ajuste));
  return { metaKcal, ...derivarMetasMacro(metaKcal, d.objetivo) };
}

/* ---------- previsão de resultado (prazo até o objetivo) ---------- */
// Energia aproximada por kg de tecido corporal. A literatura usa 7000–7700;
// adotamos 7700 (padrão clássico de ~7,7 kcal/g). Estimativa, não valor exato.
const KCAL_POR_KG = 7700;

/**
 * Traduz uma quantidade de dias num prazo relativo amigável, em pt-BR:
 * até ~6 semanas usa semanas ("daqui a 5 semanas"); acima disso, meses
 * ("daqui a 3 meses"). Sempre pelo menos "daqui a 1 semana".
 */
function prazoRelativo(dias) {
  const d = Number(dias) || 0;
  // Até ~8 semanas fala em semanas; a partir daí, meses (mais fácil de captar
  // em prazos longos, ex.: 24 semanas → "daqui a 6 meses").
  if (d < 56) {
    const semanas = Math.max(1, Math.round(d / 7));
    return `daqui a ${semanas} ${semanas === 1 ? "semana" : "semanas"}`;
  }
  const meses = Math.round(d / 30);
  return `daqui a ${meses} ${meses === 1 ? "mês" : "meses"}`;
}

/**
 * Estima quanto tempo até o objetivo, a partir dos mesmos dados de calcularMeta.
 * Modelo linear (ritmo constante) — o TDEE real muda com o peso, então trate
 * como estimativa. Retorna:
 *  - perder/ganhar (com peso_alvo válido): { tipo:'prazo', kg, dias, semanas,
 *      dataISO, taxaSemana, ritmoAcelerado, pesoAlvo }
 *  - manter:  { tipo:'manter',  metaKcal, peso }
 *  - definir: { tipo:'definir', metaKcal, peso }
 *  - dados insuficientes / sem kg a percorrer: null
 */
function preverResultado(d) {
  const tdee = calcularTDEE(d);
  const meta = d.meta;
  const ajuste = AJUSTE_META[meta];
  if (tdee === null || ajuste === undefined) return null;

  const peso = Number(d.peso_kg);
  const metaKcal = Math.round(tdee * (1 + ajuste));

  // Manter: sem alvo de peso. "definir" (recomposição) é sinalizado pelo objetivo.
  if (meta === "manter") {
    const tipo = d.objetivo === "definir" ? "definir" : "manter";
    return { tipo, metaKcal, peso };
  }

  // Perder / ganhar: precisa de peso desejado coerente com a direção da meta.
  const pesoAlvo = Number(d.peso_alvo);
  if (!(pesoAlvo > 0)) return null;
  const kg = meta === "perder" ? peso - pesoAlvo : pesoAlvo - peso;
  if (!(kg > 0)) return null;

  const diferencaDia = Math.abs(tdee - metaKcal); // déficit ou superávit diário
  if (!(diferencaDia > 0)) return null;

  const dias = (kg * KCAL_POR_KG) / diferencaDia;
  const taxaSemana = (diferencaDia * 7) / KCAL_POR_KG; // kg por semana

  const alvo = new Date();
  alvo.setDate(alvo.getDate() + Math.round(dias));
  const p = (n) => String(n).padStart(2, "0");
  const dataISO = `${alvo.getFullYear()}-${p(alvo.getMonth() + 1)}-${p(alvo.getDate())}`;

  return {
    tipo: "prazo",
    kg,
    dias,
    semanas: dias / 7,
    dataISO,
    taxaSemana,
    ritmoAcelerado: taxaSemana > peso * 0.01, // > 1% do peso/semana = agressivo
    pesoAlvo,
  };
}

/* ---------- IMC e peso ideal ---------- */
// Limites de IMC da faixa saudavel (OMS): 18.5 a 24.9.
const IMC_MIN_SAUDAVEL = 18.5;
const IMC_MAX_SAUDAVEL = 24.9;

// Classifica o IMC nas faixas da OMS.
function classificarIMC(imc) {
  if (imc < 18.5) return "Abaixo do peso";
  if (imc < 25) return "Peso normal";
  if (imc < 30) return "Sobrepeso";
  return "Obesidade";
}

/**
 * IMC = peso / altura(m)^2. Retorna `null` se faltar peso ou altura validos.
 * @returns {{imc:number, classe:string}|null}
 */
function calcularIMC(peso_kg, altura_cm) {
  const peso = Number(peso_kg);
  const alturaM = Number(altura_cm) / 100;
  if (!(peso > 0) || !(alturaM > 0)) return null;
  const imc = peso / (alturaM * alturaM);
  return { imc, classe: classificarIMC(imc) };
}

/**
 * Faixa de peso saudavel (kg) para a altura, pela faixa de IMC 18.5–24.9.
 * @returns {{min:number, max:number}|null}
 */
function faixaPesoIdeal(altura_cm) {
  const alturaM = Number(altura_cm) / 100;
  if (!(alturaM > 0)) return null;
  const area = alturaM * alturaM;
  return {
    min: Math.round(IMC_MIN_SAUDAVEL * area * 10) / 10,
    max: Math.round(IMC_MAX_SAUDAVEL * area * 10) / 10,
  };
}
