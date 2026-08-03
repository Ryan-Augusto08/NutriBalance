/**
 * Desenho do dashboard: card de perfil, resumo do dia e lista de refeicoes.
 *
 * Este modulo so LE o estado e escreve no DOM — quem altera os dados sao
 * refeicoes.js, alimentos.js e perfil.js, que chamam atualizarTela() no fim.
 */

import { estado } from "./estado.js";
import { arred, escaparHtml, iniciais, rotuloData, somarDiasISO } from "./utilitarios.js";
import { blocoMacros, macrosDoItem, totaisDaRefeicao, totaisDoDia } from "./macros.js";
import { prazoRelativo } from "./calculo.js";

/* ---------- resumo do dia ---------- */

function linhaProgresso(rotulo, unidade, consumido, meta, classe) {
  const pct = meta > 0 ? Math.min(100, (consumido / meta) * 100) : 0;
  const passou = consumido > meta && meta > 0;
  const restante = Math.max(0, meta - consumido);
  return `
    <div class="progresso-linha ${classe} ${passou ? "passou" : ""}">
      <div class="progresso-topo">
        <span class="progresso-rotulo">${rotulo}</span>
        <span class="progresso-numeros">${arred(consumido)} / ${arred(meta)} ${unidade}</span>
      </div>
      <div class="progresso-trilha">
        <div class="progresso-barra" style="width:${pct}%"></div>
      </div>
      <div class="progresso-sub">${
        passou
          ? `Passou ${arred(consumido - meta)} ${unidade} da meta`
          : `Restante ${arred(restante)} ${unidade}`
      }</div>
    </div>`;
}

function mostrarProgressoDiario() {
  const t = totaisDoDia(estado.dataSelecionada);
  const p = estado.dados.perfil;
  document.getElementById("progresso-diario").innerHTML = [
    linhaProgresso("Calorias", "kcal", t.kcal, p.metaKcal, "kcal"),
    linhaProgresso("Carboidrato", "g", t.carbo, p.metaCarbo, "carbo"),
    linhaProgresso("Proteína", "g", t.proteina, p.metaProteina, "proteina"),
    linhaProgresso("Gordura", "g", t.gordura, p.metaGordura, "gordura"),
  ].join("");
}

/* ---------- lista de refeições ---------- */

function linhaItem(item) {
  const m = macrosDoItem(item);
  const marca = item.marca ? ` · ${escaparHtml(item.marca)}` : "";
  return `
    <div class="item-linha">
      <div class="item-principal">
        <span class="item-nome">${escaparHtml(item.nome)}${marca}</span>
        <span class="item-sub">${arred(item.gramas)} g · ${arred(m.kcal)} kcal · P ${arred(m.proteina)} · C ${arred(m.carbo)} · G ${arred(m.gordura)}</span>
      </div>
      <button class="item-remover" data-remover-item="${item.id}" title="Remover alimento" aria-label="Remover alimento">✕</button>
    </div>`;
}

function cardRefeicao(refeicao) {
  const totais = totaisDaRefeicao(refeicao);
  const htmlItens = refeicao.itens.length
    ? refeicao.itens.map(linhaItem).join("")
    : `<p class="refeicao-vazia">Nenhum alimento ainda. Toque em "+ Adicionar alimento".</p>`;
  const resumo = refeicao.itens.length
    ? `<div class="refeicao-resumo">${blocoMacros(totais)}<div class="refeicao-kcal">${arred(totais.kcal)} <span>kcal</span></div></div>`
    : "";
  return `
    <div class="refeicao-card" data-refeicao-id="${refeicao.id}">
      <div class="refeicao-card-topo">
        <p class="refeicao-titulo">${escaparHtml(refeicao.tipo)}</p>
        <button class="refeicao-remover" data-remover-refeicao="${refeicao.id}">remover</button>
      </div>
      <div class="refeicao-itens">${htmlItens}</div>
      <button class="adicionar-alimento-btn" data-adicionar-alimento="${refeicao.id}">+ Adicionar alimento</button>
      ${resumo}
    </div>`;
}

/* ---------- card de perfil ---------- */

// Preenche um elemento de foto (card ou modal) com a foto do perfil, ou
// cai nas iniciais do nome quando não há foto.
export function mostrarFotoEm(el, perfil) {
  if (perfil.foto) {
    el.innerHTML = `<img class="foto-img" src="${escaparHtml(perfil.foto)}" alt="Foto de perfil" />`;
    el.classList.add("com-foto");
  } else {
    el.textContent = iniciais(perfil.nome);
    el.classList.remove("com-foto");
  }
}

// Linha compacta de previsão no card de perfil. Formatos por tipo de meta;
// esconde quando não há previsão (dados incompletos ou sem peso desejado).
function mostrarLinhaPrevisao() {
  const el = document.getElementById("perfil-previsao");
  const previsao = estado.previsao;
  if (!previsao) {
    el.hidden = true;
    return;
  }
  if (previsao.tipo === "prazo") {
    const data = new Date(previsao.dataISO + "T00:00:00").toLocaleDateString("pt-BR");
    // Prazo relativo ("daqui a 6 meses") no selo; a data exata fica no tooltip.
    el.textContent = `Meta ${prazoRelativo(previsao.dias)}`;
    el.title = `Meta prevista para ${data}`;
  } else if (previsao.tipo === "definir") {
    el.textContent = "Recomposição em andamento";
    el.title = "Objetivo de recomposição corporal (definição)";
  } else {
    el.textContent = "Plano de manutenção";
    el.title = "Objetivo de manter o peso atual";
  }
  el.hidden = false;
}

/* ---------- navegação por data ---------- */

// Atualiza o rótulo da barra de data e o botão "Copiar refeições de ontem".
function mostrarNavegacaoData() {
  document.getElementById("dia-valor").textContent = rotuloData(estado.dataSelecionada);

  const anterior = somarDiasISO(estado.dataSelecionada, -1);
  const temAnterior = estado.dados.refeicoes.some((m) => m.data === anterior);
  const btn = document.getElementById("copiar-dia-btn");
  if (temAnterior) {
    btn.textContent = `Copiar refeições de ${rotuloData(anterior)}`;
    btn.hidden = false;
  } else {
    btn.hidden = true;
  }
}

/* ---------- orquestrador ---------- */

export function atualizarTela() {
  const perfil = estado.dados.perfil;
  document.getElementById("perfil-nome").textContent = perfil.nome;
  document.getElementById("perfil-meta").textContent = `Meta: ${perfil.metaKcal.toLocaleString(
    "pt-BR"
  )} kcal / dia`;
  mostrarFotoEm(document.getElementById("perfil-foto"), perfil);
  mostrarLinhaPrevisao();

  mostrarNavegacaoData();
  mostrarProgressoDiario();

  const lista = document.getElementById("lista-refeicoes");
  const doDia = estado.dados.refeicoes.filter((m) => m.data === estado.dataSelecionada);
  if (doDia.length === 0) {
    lista.innerHTML = `<p class="estado-vazio">Nenhuma refeição nesse dia. Toque em + pra adicionar.</p>`;
    return;
  }
  lista.innerHTML = doDia.map(cardRefeicao).join("");
}
