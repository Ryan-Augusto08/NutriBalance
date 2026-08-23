/**
 * Refeicoes do dia: remover refeicao/item, navegar entre dias, copiar o dia
 * anterior e o modal de nova refeicao.
 *
 * Importar este modulo ja registra os listeners (nao ha funcao de inicio).
 */

import { estado } from "./estado.js";
import { salvarDados } from "./dados.js";
import { atualizarTela } from "./tela.js";
import { somarDiasISO, uid } from "./utilitarios.js";
import { abrirBuscaAlimento } from "./alimentos.js";

/* ---------- ações sobre refeições/itens ---------- */

function removerRefeicao(id) {
  estado.dados.refeicoes = estado.dados.refeicoes.filter((m) => m.id !== id);
  salvarDados();
  atualizarTela();
}

function removerItem(idItem) {
  for (const refeicao of estado.dados.refeicoes) {
    const antes = refeicao.itens.length;
    refeicao.itens = refeicao.itens.filter((it) => it.id !== idItem);
    if (refeicao.itens.length !== antes) break;
  }
  salvarDados();
  atualizarTela();
}

// Delegação de eventos na lista de refeições
document.getElementById("lista-refeicoes").addEventListener("click", (e) => {
  // dataset converte o atributo kebab-case em camelCase:
  // data-adicionar-alimento → dataset.adicionarAlimento
  const botaoAdicionarAlimento = e.target.closest("[data-adicionar-alimento]");
  if (botaoAdicionarAlimento) return abrirBuscaAlimento(botaoAdicionarAlimento.dataset.adicionarAlimento);

  const botaoRemoverItem = e.target.closest("[data-remover-item]");
  if (botaoRemoverItem) return removerItem(botaoRemoverItem.dataset.removerItem);

  const botaoRemoverRefeicao = e.target.closest("[data-remover-refeicao]");
  if (botaoRemoverRefeicao && confirm("Remover essa refeição inteira?")) {
    return removerRefeicao(botaoRemoverRefeicao.dataset.removerRefeicao);
  }
});

/* ---------- navegação por data ---------- */

document.getElementById("dia-anterior").addEventListener("click", () => {
  estado.dataSelecionada = somarDiasISO(estado.dataSelecionada, -1);
  atualizarTela();
});

document.getElementById("dia-proximo").addEventListener("click", () => {
  estado.dataSelecionada = somarDiasISO(estado.dataSelecionada, 1);
  atualizarTela();
});

// Copia (clona) as refeições do dia anterior para o dia selecionado,
// mantendo as que já existirem no dia atual. Cada refeição/item ganha novo id.
document.getElementById("copiar-dia-btn").addEventListener("click", () => {
  const anterior = somarDiasISO(estado.dataSelecionada, -1);
  const doAnterior = estado.dados.refeicoes.filter((m) => m.data === anterior);
  if (doAnterior.length === 0) return;
  for (const m of doAnterior) {
    estado.dados.refeicoes.push({
      id: uid(),
      tipo: m.tipo,
      data: estado.dataSelecionada,
      itens: m.itens.map((it) => ({ ...it, id: uid() })),
    });
  }
  salvarDados();
  atualizarTela();
});

/* ---------- modal: nova refeição ---------- */

const modalRefeicao = document.getElementById("refeicao-modal-fundo");
const formRefeicao = document.getElementById("refeicao-form");

document.getElementById("nova-refeicao-btn").addEventListener("click", () => {
  formRefeicao.reset();
  // Adiciona no dia que está sendo exibido (permite planejar dias futuros).
  document.getElementById("refeicao-data").value = estado.dataSelecionada;
  modalRefeicao.hidden = false;
});

document.getElementById("refeicao-cancelar-btn").addEventListener("click", () => {
  modalRefeicao.hidden = true;
});

formRefeicao.addEventListener("submit", (e) => {
  e.preventDefault();
  estado.dados.refeicoes.push({
    id: uid(),
    tipo: document.getElementById("refeicao-tipo").value,
    data: document.getElementById("refeicao-data").value,
    itens: [],
  });
  salvarDados();
  modalRefeicao.hidden = true;
  atualizarTela();
});
