/**
 * Autenticação compartilhada entre login/cadastro/onboarding/dashboard.
 * O site não usa módulos ES — este arquivo expõe funções globais.
 *
 * Endpoints em api/ (sessão PHP via cookie): registrar, login, logout, sessao.
 */

/** POST JSON num endpoint; devolve { status, dados }. */
async function enviarApi(url, corpo) {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(corpo || {}),
  });
  let dados = {};
  try {
    dados = await res.json();
  } catch {
    /* resposta sem corpo JSON */
  }
  return { status: res.status, dados };
}

function mostrarErro(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function definirCarregando(btn, carregando, textoNormal) {
  if (!btn) return;
  btn.disabled = carregando;
  btn.textContent = carregando ? "Aguarde…" : textoNormal;
}

/** Após login/cadastro: onboarding se o perfil estiver incompleto, senão dashboard. */
function irAposAutenticar(perfilCompleto) {
  window.location.href = perfilCompleto ? "index.html" : "personalizacao.html";
}

async function tratarLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("login-enviar");
  const erro = document.getElementById("login-erro");
  erro.hidden = true;
  definirCarregando(btn, true, "Entrar");

  const { status, dados } = await enviarApi("api/login.php", {
    email: document.getElementById("login-email").value.trim(),
    senha: document.getElementById("login-senha").value,
  }).catch(() => ({ status: 0, dados: {} }));

  if (status === 200 && dados.ok) {
    return irAposAutenticar(dados.perfil_completo);
  }
  definirCarregando(btn, false, "Entrar");
  mostrarErro(erro, dados.erro || "Não foi possível entrar. Verifique se o servidor está no ar.");
}

async function tratarCadastro(e) {
  e.preventDefault();
  const btn = document.getElementById("cadastro-enviar");
  const erro = document.getElementById("cadastro-erro");
  erro.hidden = true;
  definirCarregando(btn, true, "Criar conta");

  const { status, dados } = await enviarApi("api/registrar.php", {
    nome: document.getElementById("cadastro-nome").value.trim(),
    email: document.getElementById("cadastro-email").value.trim(),
    senha: document.getElementById("cadastro-senha").value,
  }).catch(() => ({ status: 0, dados: {} }));

  if (status === 200 && dados.ok) {
    return irAposAutenticar(dados.perfil_completo);
  }
  definirCarregando(btn, false, "Criar conta");
  mostrarErro(erro, dados.erro || "Não foi possível criar a conta. Verifique se o servidor está no ar.");
}

/** Faz logout e volta pro login. */
async function sair() {
  await enviarApi("api/logout.php").catch(() => {});
  window.location.href = "login.html";
}

/**
 * Guarda de página. Chama sessao.php:
 *  - 401 → redireciona pra login.html e devolve null.
 *  - perfil incompleto (e não estamos na personalização) → vai pro onboarding.
 *  - ok → devolve os dados da sessão pra página usar.
 */
async function exigirSessao(opcoes) {
  const permitirIncompleto = opcoes && opcoes.permitirIncompleto;
  let res;
  try {
    res = await fetch("api/sessao.php", { headers: { Accept: "application/json" } });
  } catch {
    window.location.href = "login.html";
    return null;
  }
  if (res.status === 401) {
    window.location.href = "login.html";
    return null;
  }
  const dados = await res.json().catch(() => null);
  if (!dados || !dados.ok) {
    window.location.href = "login.html";
    return null;
  }
  if (!dados.perfil_completo && !permitirIncompleto) {
    window.location.href = "personalizacao.html";
    return null;
  }
  return dados;
}

/** Nas telas de login/cadastro: se já há sessão, pula direto pro app. */
async function redirecionarSeLogado() {
  try {
    const res = await fetch("api/sessao.php", { headers: { Accept: "application/json" } });
    if (res.status !== 200) return;
    const dados = await res.json().catch(() => null);
    if (dados && dados.ok) irAposAutenticar(dados.perfil_completo);
  } catch {
    /* servidor fora do ar — deixa a tela de login normalmente */
  }
}
