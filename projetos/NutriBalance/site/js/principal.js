/**
 * Ponto de entrada do dashboard (index.html).
 *
 * E o unico script que o HTML carrega: os demais modulos entram por import.
 * Os tres imports sem chaves existem pelo efeito colateral — importar o
 * modulo e o que registra os listeners daquela area da tela.
 */

import { estado } from "./estado.js";
import { carregarDados } from "./dados.js";
import { atualizarTela } from "./tela.js";
import { preverResultado } from "./calculo.js";
import { exigirSessao, sair } from "./auth.js";
import { iniciarProgresso } from "./progresso.js";

import "./refeicoes.js";
import "./alimentos.js";
import "./perfil.js";
import "./travas.js";

/* ---------- botão Mudar meta (recalcula pela personalização, grava no banco) ---------- */
document.getElementById("mudar-meta-btn").addEventListener("click", () => {
  window.location.href = "personalizacao.html";
});

/* ---------- botão Sair ---------- */
document.getElementById("sair-btn").addEventListener("click", sair);

/* ---------- boot: valida a sessão antes de montar o dashboard ---------- */
async function iniciar() {
  // exigirSessao() (auth.js) redireciona pra login se não autenticado, ou pra
  // personalizacao.html se o perfil ainda estiver incompleto.
  const sessao = await exigirSessao();
  if (!sessao) return;

  const p = sessao.perfil;
  const perfilDaSessao = {
    nome: sessao.usuario.nome,
    foto: sessao.usuario.foto ?? null,
    metaKcal: p.metaKcal,
    metaCarbo: p.metaCarbo,
    metaProteina: p.metaProteina,
    metaGordura: p.metaGordura,
  };

  // O perfil da sessão traz sexo/idade/altura/peso/atividade/meta/peso_alvo/objetivo,
  // tudo que preverResultado precisa para estimar o prazo até o objetivo.
  estado.previsao = preverResultado(p);

  estado.chaveStorage = `nutribalance_data_${sessao.usuario.id}`;
  estado.dados = carregarDados(perfilDaSessao);
  atualizarTela();

  // Seção de Progresso (histórico de peso/cintura + gráfico). A sessão já foi validada.
  await iniciarProgresso(sessao);
}

iniciar();
