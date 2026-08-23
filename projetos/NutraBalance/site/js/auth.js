/**
 * Autenticação compartilhada entre login/cadastro/onboarding/dashboard.
 *
 * Módulo ES: irAposAutenticar() é interna; o resto é exportado para as
 * páginas e para o dashboard. mostrarErro() e definirCarregando() eram
 * internas até o onboarding precisar delas — as duas mexem em elementos de
 * formulário e não têm nada de específico de autenticação, então servem
 * qualquer tela com botão de enviar.
 *
 * Endpoints em api/ (sessão PHP via cookie): registrar, login, logout,
 * sessao, esqueceu_senha, redefinir_senha.
 */

/**
 * POST JSON num endpoint; devolve { status, dados }.
 *
 * `fetch` é a função do navegador que conversa com o servidor sem
 * recarregar a página — é o que substitui o envio tradicional de <form>.
 * Como a resposta demora, ela é assíncrona: `async`/`await` faz o código
 * esperar a resposta chegar e seguir na linha de baixo, em vez de
 * encadear callbacks.
 *
 * O objeto JavaScript vira texto com JSON.stringify na ida, e o texto do
 * servidor vira objeto com res.json() na volta. O cookie da sessão o
 * navegador anexa sozinho, por ser o mesmo domínio.
 *
 * Devolve status e dados juntos porque quem chama precisa dos dois: o
 * número (200, 401, 422) diz o que aconteceu, o corpo diz o porquê.
 */
export async function enviarApi(url, corpo) {
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

export function mostrarErro(el, msg) {
  if (!el) return;
  el.textContent = msg;
  el.hidden = false;
}

export function definirCarregando(btn, carregando, textoNormal) {
  if (!btn) return;
  btn.disabled = carregando;
  btn.textContent = carregando ? "Aguarde…" : textoNormal;
}

/** Após login/cadastro: onboarding se o perfil estiver incompleto, senão dashboard. */
function irAposAutenticar(perfilCompleto) {
  window.location.href = perfilCompleto ? "index.html" : "personalizacao.html";
}

export async function tratarLogin(e) {
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

export async function tratarCadastro(e) {
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

/**
 * Tela "esqueceu a senha": pede o link de redefinição.
 *
 * O back responde a mesma coisa exista ou não a conta, então aqui não há
 * caminho de erro por "e-mail não encontrado" — só falha de rede ou
 * formato inválido.
 */
export async function tratarEsqueceuSenha(e) {
  e.preventDefault();
  const btn = document.getElementById("esqueceu-enviar");
  const erro = document.getElementById("esqueceu-erro");
  const aviso = document.getElementById("esqueceu-ok");
  erro.hidden = true;
  aviso.hidden = true;
  definirCarregando(btn, true, "Enviar link");

  const { status, dados } = await enviarApi("api/esqueceu_senha.php", {
    email: document.getElementById("esqueceu-email").value.trim(),
  }).catch(() => ({ status: 0, dados: {} }));

  definirCarregando(btn, false, "Enviar link");

  if (status === 200 && dados.ok) {
    aviso.textContent = dados.mensagem;
    aviso.hidden = false;
    document.getElementById("esqueceu-form").reset();
    return;
  }
  mostrarErro(erro, dados.erro || "Não foi possível enviar o link. Verifique se o servidor está no ar.");
}

/** Tela do link do e-mail: grava a senha nova e volta pro login. */
export async function tratarRedefinirSenha(e) {
  e.preventDefault();
  const btn = document.getElementById("redefinir-enviar");
  const erro = document.getElementById("redefinir-erro");
  const aviso = document.getElementById("redefinir-ok");
  const senha = document.getElementById("redefinir-senha").value;
  const confirmacao = document.getElementById("redefinir-confirmacao").value;
  erro.hidden = true;

  // Confere aqui para não gastar uma ida ao servidor — o token é de uso
  // único, e um erro de digitação queimaria o link.
  if (senha !== confirmacao) {
    mostrarErro(erro, "As duas senhas não são iguais.");
    return;
  }

  definirCarregando(btn, true, "Salvar nova senha");

  const { status, dados } = await enviarApi("api/redefinir_senha.php", {
    token: new URLSearchParams(window.location.search).get("token") || "",
    senha,
  }).catch(() => ({ status: 0, dados: {} }));

  if (status === 200 && dados.ok) {
    document.getElementById("redefinir-form").hidden = true;
    aviso.hidden = false;
    window.setTimeout(() => (window.location.href = "login.html"), 2500);
    return;
  }
  definirCarregando(btn, false, "Salvar nova senha");
  mostrarErro(erro, dados.erro || "Não foi possível redefinir a senha. Verifique se o servidor está no ar.");
}

/** Faz logout e volta pro login. */
export async function sair() {
  await enviarApi("api/logout.php").catch(() => {});
  window.location.href = "login.html";
}

/**
 * Guarda de página. Chama sessao.php:
 *
 * ATENÇÃO ao que esta função NÃO é: ela não protege dado nenhum. Esconder
 * a tela no navegador é conforto de interface — quem editar o JavaScript
 * pula essa checagem. A proteção real está no servidor, onde cada
 * endpoint chama `exigir_login()` e recusa com 401. Esta guarda existe
 * para a pessoa cair no login em vez de ver uma tela vazia e quebrada.
 *
 *  - 401 → redireciona pra login.html e devolve null.
 *  - perfil incompleto (e não estamos na personalização) → vai pro onboarding.
 *  - ok → devolve os dados da sessão pra página usar.
 */
export async function exigirSessao(opcoes) {
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
export async function redirecionarSeLogado() {
  try {
    const res = await fetch("api/sessao.php", { headers: { Accept: "application/json" } });
    if (res.status !== 200) return;
    const dados = await res.json().catch(() => null);
    if (dados && dados.ok) irAposAutenticar(dados.perfil_completo);
  } catch {
    /* servidor fora do ar — deixa a tela de login normalmente */
  }
}
