/**
 * Modal de perfil: ajuste fino das metas e foto do usuario.
 *
 * As metas ficam no localStorage (ajuste manual); a foto vai para o servidor
 * por api/foto.php e o caminho volta no perfil da sessao.
 *
 * Importar este modulo ja registra os listeners.
 */

import { estado } from "./estado.js";
import { salvarDados } from "./dados.js";
import { atualizarTela, mostrarFotoEm } from "./tela.js";
import { ajustarMacrosParaKcal } from "./calculo.js";
import { enviarApi } from "./auth.js";

const modalPerfil = document.getElementById("perfil-modal-fundo");
const formPerfil = document.getElementById("perfil-form");

document.getElementById("editar-perfil-btn").addEventListener("click", () => {
  const perfil = estado.dados.perfil;
  document.getElementById("perfil-nome-campo").value = perfil.nome;
  document.getElementById("perfil-meta-campo").value = perfil.metaKcal;
  document.getElementById("perfil-carbo-campo").value = perfil.metaCarbo;
  document.getElementById("perfil-proteina-campo").value = perfil.metaProteina;
  document.getElementById("perfil-gordura-campo").value = perfil.metaGordura;
  document.getElementById("foto-erro").hidden = true;
  mostrarFotoNoModal();
  modalPerfil.hidden = false;
});

/* ---------- foto de perfil ---------- */

const TIPOS_IMAGEM = ["image/jpeg", "image/png", "image/webp"];
const FOTO_MAX_BYTES = 3 * 1024 * 1024; // 3 MB — igual ao limite do api/foto.php
const campoFoto = document.getElementById("foto-campo");
const elErroFoto = document.getElementById("foto-erro");

// Atualiza a prévia da foto dentro do modal e mostra "Remover" só quando há foto.
function mostrarFotoNoModal() {
  mostrarFotoEm(document.getElementById("modal-foto"), estado.dados.perfil);
  document.getElementById("foto-remover-btn").hidden = !estado.dados.perfil.foto;
}

// Erro inline no modal quando ele está aberto; senão, alerta (clique direto na foto do card).
function avisarErroFoto(msg) {
  if (!modalPerfil.hidden) {
    elErroFoto.textContent = msg;
    elErroFoto.hidden = false;
  } else {
    alert(msg);
  }
}

async function enviarFoto(arquivo) {
  const dadosForm = new FormData();
  dadosForm.append("foto", arquivo);
  const res = await fetch("api/foto.php", { method: "POST", body: dadosForm });
  let dados = {};
  try {
    dados = await res.json();
  } catch {
    /* resposta sem corpo JSON */
  }
  return { status: res.status, dados };
}

// Abre o seletor de arquivo tanto pela foto do card quanto pelo botão do modal.
document.getElementById("perfil-foto").addEventListener("click", () => campoFoto.click());
document.getElementById("foto-escolher-btn").addEventListener("click", () => campoFoto.click());

campoFoto.addEventListener("change", async () => {
  const arquivo = campoFoto.files[0];
  campoFoto.value = ""; // permite reenviar o mesmo arquivo depois
  if (!arquivo) return;
  elErroFoto.hidden = true;

  if (!TIPOS_IMAGEM.includes(arquivo.type)) {
    return avisarErroFoto("Formato inválido. Use uma imagem JPG, PNG ou WEBP.");
  }
  if (arquivo.size > FOTO_MAX_BYTES) {
    return avisarErroFoto("A imagem deve ter no máximo 3 MB.");
  }

  const { status, dados } = await enviarFoto(arquivo).catch(() => ({ status: 0, dados: {} }));
  if (status === 200 && dados.ok) {
    estado.dados.perfil.foto = dados.foto;
    salvarDados();
    atualizarTela();
    mostrarFotoNoModal();
  } else {
    avisarErroFoto(dados.erro || "Não foi possível enviar a foto. Verifique se o servidor está no ar.");
  }
});

document.getElementById("foto-remover-btn").addEventListener("click", async () => {
  if (!estado.dados.perfil.foto) return;
  elErroFoto.hidden = true;
  const { status, dados } = await enviarApi("api/foto.php", { acao: "remover" }).catch(() => ({
    status: 0,
    dados: {},
  }));
  if (status === 200 && dados.ok) {
    estado.dados.perfil.foto = null;
    salvarDados();
    atualizarTela();
    mostrarFotoNoModal();
  } else {
    avisarErroFoto(dados.erro || "Não foi possível remover a foto.");
  }
});

/* ---------- salvar / cancelar ---------- */

document.getElementById("perfil-cancelar-btn").addEventListener("click", () => {
  modalPerfil.hidden = true;
});

formPerfil.addEventListener("submit", (e) => {
  e.preventDefault();
  const perfil = estado.dados.perfil;
  const metaKcal = Number(document.getElementById("perfil-meta-campo").value);
  // Recalcula os macros pelas kcal mantendo a proporção atual (perfil ainda
  // guarda os valores de abertura do modal).
  const m = ajustarMacrosParaKcal(metaKcal, perfil);
  perfil.nome = document.getElementById("perfil-nome-campo").value.trim();
  perfil.metaKcal = metaKcal;
  perfil.metaCarbo = m.metaCarbo;
  perfil.metaProteina = m.metaProteina;
  perfil.metaGordura = m.metaGordura;
  salvarDados();
  modalPerfil.hidden = true;
  atualizarTela();
});
