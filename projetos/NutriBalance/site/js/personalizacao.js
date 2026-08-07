/**
 * Onboarding — lê os campos, mostra a prévia ao vivo da meta (via calcularMeta
 * de calculo.js) e salva em api/salvar_perfil.php (que recalcula como autoridade).
 *
 * Módulo ES: é o script que personalizacao.html carrega.
 */

import "./travas.js";
import { definirCarregando, enviarApi, exigirSessao, mostrarErro } from "./auth.js";
import {
  calcularIMC,
  calcularMeta,
  faixaPesoIdeal,
  prazoRelativo,
  preverResultado,
} from "./calculo.js";

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

const elPrevia = document.getElementById("meta-previa");
const elPreviaKcal = document.getElementById("previa-kcal");
const elPreviaMacros = document.getElementById("previa-macros");
const elPrevisao = document.getElementById("prev-resultado");
const elPrevisaoCorpo = document.getElementById("prev-resultado-corpo");
const elErro = document.getElementById("perfil-erro");
const btnEnviar = document.getElementById("perfil-enviar");
const formulario = document.getElementById("perfil-form");

// Rótulo do botão de envio (muda para "Salvar alterações" no modo edição).
let textoBotao = "Salvar e continuar";

// Campo peso desejado, campo objetivo (só na meta "manter") e painel de IMC / peso ideal.
const caixaPesoAlvo = document.getElementById("peso-alvo-caixa");
const caixaObjetivo = document.getElementById("objetivo-caixa");
const elImc = document.getElementById("imc-previa");
const elImcNum = document.getElementById("imc-num");
const elImcClasse = document.getElementById("imc-classe");
const elImcMin = document.getElementById("imc-min");
const elImcMax = document.getElementById("imc-max");
const elImcAlvo = document.getElementById("imc-alvo");

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
  caixaPesoAlvo.hidden = !mostrar;
  if (!mostrar) campos.peso_alvo.value = "";
}

// Mostra o campo de objetivo apenas na meta "manter"; fora dela, volta ao padrão.
function atualizarCampoObjetivo() {
  const manter = campos.meta.value === "manter";
  caixaObjetivo.hidden = !manter;
  if (!manter) campos.objetivo.value = "manter";
}

// Atualiza o painel de IMC + faixa de peso ideal e, se houver alvo, os kg que faltam.
function atualizarIMC() {
  const imc = calcularIMC(campos.peso_kg.value, campos.altura_cm.value);
  const faixa = faixaPesoIdeal(campos.altura_cm.value);
  if (!imc || !faixa) {
    elImc.hidden = true;
    return;
  }
  elImcNum.textContent = imc.imc.toLocaleString("pt-BR", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  });
  elImcClasse.textContent = imc.classe;
  elImcMin.textContent = faixa.min.toLocaleString("pt-BR");
  elImcMax.textContent = faixa.max.toLocaleString("pt-BR");

  const pesoAtual = Number(campos.peso_kg.value);
  const pesoAlvo = Number(campos.peso_alvo.value);
  const meta = campos.meta.value;
  if ((meta === "perder" || meta === "ganhar") && pesoAlvo > 0) {
    const diferenca = meta === "perder" ? pesoAtual - pesoAlvo : pesoAlvo - pesoAtual;
    if (diferenca > 0) {
      const faltam = diferenca.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
      elImcAlvo.textContent = `Faltam ${faltam} kg até seu peso desejado.`;
      elImcAlvo.hidden = false;
    } else {
      elImcAlvo.hidden = true;
    }
  } else {
    elImcAlvo.hidden = true;
  }
  elImc.hidden = false;
}

// Número "bonito" em pt-BR (1 casa quando faz sentido, ex.: 0,7 kg/semana).
function num(n, casas = 0) {
  return Number(n).toLocaleString("pt-BR", { maximumFractionDigits: casas });
}

// Monta o corpo da previsão de resultado conforme o tipo devolvido por preverResultado.
function mostrarPrevisao(r) {
  if (!r) {
    elPrevisao.hidden = true;
    return;
  }

  if (r.tipo === "prazo") {
    const alerta = r.ritmoAcelerado
      ? `<p class="prev-alerta">Ritmo acelerado (acima de 1% do peso por semana). Um prazo mais folgado tende a ser mais sustentável.</p>`
      : "";
    elPrevisaoCorpo.innerHTML = `
      <p class="prev-destaque">Meta ${prazoRelativo(r.dias)}</p>
      <p class="prev-linha">Você chega a <b>${num(r.pesoAlvo, 1)} kg</b> num ritmo de ~${num(r.taxaSemana, 1)} kg por semana (faltam ${num(r.kg, 1)} kg).</p>
      ${alerta}`;
  } else if (r.tipo === "definir") {
    elPrevisaoCorpo.innerHTML = `
      <p class="prev-linha">Na recomposição o peso na balança muda pouco — você troca gordura por músculo mantendo ~<b>${num(r.metaKcal)} kcal/dia</b>.</p>
      <p class="prev-linha">Resultados visíveis costumam levar <b>8 a 12 semanas</b> com treino de força e proteína alta. <span class="prev-nota">(orientação geral, não calculada dos seus dados)</span></p>`;
  } else {
    // manter
    elPrevisaoCorpo.innerHTML = `
      <p class="prev-linha">Sem prazo — o objetivo é estabilidade. Mantendo ~<b>${num(r.metaKcal)} kcal/dia</b>, seu peso de <b>${num(r.peso, 1)} kg</b> tende a se manter.</p>`;
  }
  elPrevisao.hidden = false;
}

function atualizarPrevia() {
  atualizarCampoPesoAlvo();
  atualizarCampoObjetivo();
  atualizarIMC();

  const dados = lerCampos();
  const r = calcularMeta(dados);
  if (!r) {
    elPrevia.hidden = true;
    mostrarPrevisao(null);
    return;
  }
  elPreviaKcal.textContent = r.metaKcal.toLocaleString("pt-BR");
  elPreviaMacros.innerHTML = `
    <li><span class="bolinha bolinha-carbo"></span>Carboidrato <b>${r.metaCarbo} g</b></li>
    <li><span class="bolinha bolinha-proteina"></span>Proteína <b>${r.metaProteina} g</b></li>
    <li><span class="bolinha bolinha-gordura"></span>Gordura <b>${r.metaGordura} g</b></li>`;
  elPrevia.hidden = false;

  mostrarPrevisao(preverResultado(dados));
}

Object.values(campos).forEach((el) => {
  el.addEventListener("input", atualizarPrevia);
  el.addEventListener("change", atualizarPrevia);
});

formulario.addEventListener("submit", async (e) => {
  e.preventDefault();
  elErro.hidden = true;
  definirCarregando(btnEnviar, true, textoBotao);

  const { status, dados } = await enviarApi("api/salvar_perfil.php", lerCampos()).catch(() => ({
    status: 0,
    dados: {},
  }));

  if (status === 200 && dados.ok) {
    window.location.href = "index.html";
    return;
  }
  definirCarregando(btnEnviar, false, textoBotao);
  if (status === 401) {
    window.location.href = "login.html";
    return;
  }
  mostrarErro(elErro, dados.erro || "Não foi possível salvar. Verifique se o servidor está no ar.");
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
  document.getElementById("perfil-enviar").textContent = textoBotao;
  document.getElementById("perfil-cancelar").hidden = false;

  // Mostra prévia/IMC e os campos condicionais já preenchidos.
  atualizarPrevia();
}

// Guarda a página (aceita perfil incompleto — é justamente onde ele se completa).
// Se o perfil já estiver completo, entra em modo edição pré-preenchido.
(async () => {
  const dados = await exigirSessao({ permitirIncompleto: true });
  if (dados && dados.perfil_completo) entrarModoEdicao(dados.perfil);
})();
