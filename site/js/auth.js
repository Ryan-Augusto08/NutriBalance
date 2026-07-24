/**
 * Autenticação compartilhada entre login/cadastro/onboarding/dashboard.
 * O site não usa módulos ES — este arquivo expõe funções globais.
 *
 * Endpoints em api/ (sessão PHP via cookie): registrar, login, logout, sessao.
 */

/** POST JSON num endpoint; devolve { status, dados }. */
async function apiPost(url, corpo) {
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

function showError(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

function setLoading(btn, loading, textoNormal) {
  if (!btn) return;
  btn.disabled = loading;
  btn.textContent = loading ? "Aguarde…" : textoNormal;
}

/** Após login/cadastro: onboarding se o perfil estiver incompleto, senão dashboard. */
function irAposAutenticar(perfilCompleto) {
  window.location.href = perfilCompleto ? "index.html" : "personalizacao.html";
}

async function handleLogin(e) {
  e.preventDefault();
  const btn = document.getElementById("login-submit");
  const erro = document.getElementById("login-error");
  erro.hidden = true;
  setLoading(btn, true, "Entrar");

  const { status, dados } = await apiPost("api/login.php", {
    email: document.getElementById("login-email").value.trim(),
    senha: document.getElementById("login-senha").value,
  }).catch(() => ({ status: 0, dados: {} }));

  if (status === 200 && dados.ok) {
    return irAposAutenticar(dados.perfil_completo);
  }
  setLoading(btn, false, "Entrar");
  showError(erro, dados.erro || "Não foi possível entrar. Verifique se o servidor está no ar.");
}

async function handleCadastro(e) {
  e.preventDefault();
  const btn = document.getElementById("cadastro-submit");
  const erro = document.getElementById("cadastro-error");
  erro.hidden = true;
  setLoading(btn, true, "Criar conta");

  const { status, dados } = await apiPost("api/registrar.php", {
    nome: document.getElementById("cadastro-nome").value.trim(),
    email: document.getElementById("cadastro-email").value.trim(),
    senha: document.getElementById("cadastro-senha").value,
  }).catch(() => ({ status: 0, dados: {} }));

  if (status === 200 && dados.ok) {
    return irAposAutenticar(dados.perfil_completo);
  }
  setLoading(btn, false, "Criar conta");
  showError(erro, dados.erro || "Não foi possível criar a conta. Verifique se o servidor está no ar.");
}

/** Faz logout e volta pro login. */
async function logout() {
  await apiPost("api/logout.php").catch(() => {});
  window.location.href = "login.html";
}

/**
 * Guarda de página. Chama sessao.php:
 *  - 401 → redireciona pra login.html e devolve null.
 *  - perfil incompleto (e não estamos na personalização) → vai pro onboarding.
 *  - ok → devolve os dados da sessão pra página usar.
 */
async function guard(opts) {
  const permitirIncompleto = opts && opts.permitirIncompleto;
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
async function redirectIfLogged() {
  try {
    const res = await fetch("api/sessao.php", { headers: { Accept: "application/json" } });
    if (res.status !== 200) return;
    const dados = await res.json().catch(() => null);
    if (dados && dados.ok) irAposAutenticar(dados.perfil_completo);
  } catch {
    /* servidor fora do ar — deixa a tela de login normalmente */
  }
}
