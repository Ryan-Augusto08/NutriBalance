/**
 * Onboarding — lê os campos, mostra a prévia ao vivo da meta (via calcularMeta
 * de calculo.js) e salva em api/salvar_perfil.php (que recalcula como autoridade).
 * Depende de calculo.js e auth.js carregados antes.
 */

const campos = {
  sexo: document.getElementById("p-sexo"),
  idade: document.getElementById("p-idade"),
  altura_cm: document.getElementById("p-altura"),
  peso_kg: document.getElementById("p-peso"),
  cintura_cm: document.getElementById("p-cintura"),
  atividade: document.getElementById("p-atividade"),
  meta: document.getElementById("p-meta"),
  peso_alvo: document.getElementById("p-peso-alvo"),
  objetivo: document.getElementById("p-objetivo"),
};

const previewEl = document.getElementById("meta-preview");
const previewKcalEl = document.getElementById("preview-kcal");
const previewMacrosEl = document.getElementById("preview-macros");
const prevResultadoEl = document.getElementById("prev-resultado");
const prevResultadoBodyEl = document.getElementById("prev-resultado-body");
const erroEl = document.getElementById("perfil-error");
const submitBtn = document.getElementById("perfil-submit");
const form = document.getElementById("perfil-form");

// Rótulo do botão de envio (muda para "Salvar alterações" no modo edição).
let textoBotao = "Salvar e continuar";

// Campo peso desejado, campo objetivo (só na meta "manter") e painel de IMC / peso ideal.
const pesoAlvoWrap = document.getElementById("peso-alvo-wrap");
const objetivoWrap = document.getElementById("objetivo-wrap");
const imcEl = document.getElementById("imc-preview");
const imcNumEl = document.getElementById("imc-num");
const imcClasseEl = document.getElementById("imc-classe");
const imcMinEl = document.getElementById("imc-min");
const imcMaxEl = document.getElementById("imc-max");
const imcAlvoEl = document.getElementById("imc-alvo");

function lerCampos() {
  return {
    sexo: campos.sexo.value,
    idade: campos.idade.value,
    altura_cm: campos.altura_cm.value,
    peso_kg: campos.peso_kg.value,
    cintura_cm: campos.cintura_cm.value,
    atividade: campos.atividade.value,
    meta: campos.meta.value,
    peso_alvo: campos.peso_alvo.value,
    objetivo: campos.objetivo.value,
  };
}

// Mostra o campo de peso desejado quando a meta é "perder" ou "ganhar".
function atualizarCampoPesoAlvo() {
  const mostrar = campos.meta.value === "perder" || campos.meta.value === "ganhar";
  pesoAlvoWrap.hidden = !mostrar;
  if (!mostrar) campos.peso_alvo.value = "";
}

// Mostra o campo de objetivo apenas na meta "manter"; fora dela, volta ao padrão.
function atualizarCampoObjetivo() {
  const manter = campos.meta.value === "manter";
  objetivoWrap.hidden = !manter;
  if (!manter) campos.objetivo.value = "manter";
}

// Atualiza o painel de IMC + faixa de peso ideal e, se houver alvo, os kg que faltam.
function atualizarIMC() {
  const imc = calcularIMC(campos.peso_kg.value, campos.altura_cm.value);
  const faixa = faixaPesoIdeal(campos.altura_cm.value);
  if (!imc || !faixa) {
    imcEl.hidden = true;
    return;
  }
  imcNumEl.textContent = imc.imc.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  imcClasseEl.textContent = imc.classe;
  imcMinEl.textContent = faixa.min.toLocaleString("pt-BR");
  imcMaxEl.textContent = faixa.max.toLocaleString("pt-BR");

  const pesoAtual = Number(campos.peso_kg.value);
  const pesoAlvo = Number(campos.peso_alvo.value);
  const meta = campos.meta.value;
  if ((meta === "perder" || meta === "ganhar") && pesoAlvo > 0) {
    const diff = meta === "perder" ? pesoAtual - pesoAlvo : pesoAlvo - pesoAtual;
    if (diff > 0) {
      const faltam = diff.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
      imcAlvoEl.textContent = `Faltam ${faltam} kg até seu peso desejado.`;
      imcAlvoEl.hidden = false;
    } else {
      imcAlvoEl.hidden = true;
    }
  } else {
    imcAlvoEl.hidden = true;
  }
  imcEl.hidden = false;
}

// Número "bonito" em pt-BR (1 casa quando faz sentido, ex.: 0,7 kg/semana).
function num(n, casas = 0) {
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

// Monta o corpo da previsão de resultado conforme o tipo devolvido por preverResultado.
function renderPrevisao(r) {
  if (!r) {
    prevResultadoEl.hidden = true;
    return;
  }

  if (r.tipo === "prazo") {
    const alerta = r.ritmoAcelerado
      ? `<p class="prev-alerta">Ritmo acelerado (acima de 1% do peso por semana). Um prazo mais folgado tende a ser mais sustentável.</p>`
      : "";
    prevResultadoBodyEl.innerHTML = `
      <p class="prev-destaque">Meta ${prazoRelativo(r.dias)}</p>
      <p class="prev-linha">Você chega a <b>${num(r.pesoAlvo, 1)} kg</b> num ritmo de ~${num(r.taxaSemana, 1)} kg por semana (faltam ${num(r.kg, 1)} kg).</p>
      ${alerta}`;
  } else if (r.tipo === "definir") {
    prevResultadoBodyEl.innerHTML = `
      <p class="prev-linha">Na recomposição o peso na balança muda pouco — você troca gordura por músculo mantendo ~<b>${num(r.goalKcal)} kcal/dia</b>.</p>
      <p class="prev-linha">Resultados visíveis costumam levar <b>8 a 12 semanas</b> com treino de força e proteína alta. <span class="prev-nota">(orientação geral, não calculada dos seus dados)</span></p>`;
  } else {
    // manter
    prevResultadoBodyEl.innerHTML = `
      <p class="prev-linha">Sem prazo — o objetivo é estabilidade. Mantendo ~<b>${num(r.goalKcal)} kcal/dia</b>, seu peso de <b>${num(r.peso, 1)} kg</b> tende a se manter.</p>`;
  }
  prevResultadoEl.hidden = false;
}

function atualizarPreview() {
  atualizarCampoPesoAlvo();
  atualizarCampoObjetivo();
  atualizarIMC();

  const dados = lerCampos();
  const r = calcularMeta(dados);
  if (!r) {
    previewEl.hidden = true;
    renderPrevisao(null);
    return;
  }
  previewKcalEl.textContent = r.goalKcal.toLocaleString("pt-BR");
  previewMacrosEl.innerHTML = `
    <li><span class="dot dot-carbo"></span>Carboidrato <b>${r.goalCarbo} g</b></li>
    <li><span class="dot dot-proteina"></span>Proteína <b>${r.goalProteina} g</b></li>
    <li><span class="dot dot-gordura"></span>Gordura <b>${r.goalGordura} g</b></li>`;
  previewEl.hidden = false;

  renderPrevisao(preverResultado(dados));
}

Object.values(campos).forEach((el) => {
  el.addEventListener("input", atualizarPreview);
  el.addEventListener("change", atualizarPreview);
});

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  erroEl.hidden = true;
  setLoading(submitBtn, true, textoBotao);

  const { status, dados } = await apiPost("api/salvar_perfil.php", lerCampos()).catch(() => ({
    status: 0,
    dados: {},
  }));

  if (status === 200 && dados.ok) {
    window.location.href = "index.html";
    return;
  }
  setLoading(submitBtn, false, textoBotao);
  if (status === 401) {
    window.location.href = "login.html";
    return;
  }
  showError(erroEl, dados.erro || "Não foi possível salvar. Verifique se o servidor está no ar.");
});

// Pré-preenche o formulário com o perfil atual (modo edição) e ajusta a cópia.
function entrarModoEdicao(perfil) {
  campos.sexo.value = perfil.sexo ?? "";
  campos.idade.value = perfil.idade ?? "";
  campos.altura_cm.value = perfil.altura_cm ?? "";
  campos.peso_kg.value = perfil.peso_kg ?? "";
  campos.cintura_cm.value = perfil.cintura_cm ?? "";
  campos.atividade.value = perfil.atividade ?? "";
  campos.meta.value = perfil.meta ?? "";
  campos.objetivo.value = perfil.objetivo ?? "manter";
  campos.peso_alvo.value = perfil.peso_alvo ?? "";

  document.getElementById("perfil-titulo").textContent = "Editar personalização";
  document.getElementById("perfil-subtitulo").textContent =
    "Ajuste seus dados ou mude sua meta — recalculamos as calorias e macros.";
  textoBotao = "Salvar alterações";
  document.getElementById("perfil-submit").textContent = textoBotao;
  document.getElementById("perfil-cancelar").hidden = false;

  // Mostra preview/IMC e os campos condicionais já preenchidos.
  atualizarPreview();
}

// Guarda a página (aceita perfil incompleto — é justamente onde ele se completa).
// Se o perfil já estiver completo, entra em modo edição pré-preenchido.
(async () => {
  const dados = await guard({ permitirIncompleto: true });
  if (dados && dados.perfil_completo) entrarModoEdicao(dados.perfil);
})();
