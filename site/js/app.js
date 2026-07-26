// Definida durante o boot como `nutribalance_data_<uid>`, isolando as refeições
// por usuário no mesmo navegador (ver iniciar() no fim do arquivo).
let CHAVE_STORAGE = null;
const VERSAO_DADOS = 3;

/* ---------- utilidades ---------- */

function isoHoje() {
  return new Date().toISOString().slice(0, 10);
}

function uid() {
  return crypto.randomUUID();
}

const arred = (n) => Math.round(Number(n) || 0);

function formatarDataBR(iso) {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

// Soma `dias` a uma data ISO (YYYY-MM-DD) sem drift de fuso e devolve ISO.
function somarDiasISO(iso, dias) {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d + dias);
  const p = (n) => String(n).padStart(2, "0");
  return `${dt.getFullYear()}-${p(dt.getMonth() + 1)}-${p(dt.getDate())}`;
}

// Rótulo amigável do dia: "Hoje", "Ontem" ou "Amanhã" + a data (dd/mm/aaaa).
function rotuloData(iso) {
  const hoje = isoHoje();
  let rel = "";
  if (iso === hoje) rel = "Hoje";
  else if (iso === somarDiasISO(hoje, -1)) rel = "Ontem";
  else if (iso === somarDiasISO(hoje, 1)) rel = "Amanhã";
  return rel ? `${rel} · ${formatarDataBR(iso)}` : formatarDataBR(iso);
}

function iniciais(nome) {
  return nome
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

function escaparHtml(texto) {
  const div = document.createElement("div");
  div.textContent = texto ?? "";
  return div.innerHTML;
}

function atrasarChamada(fn, ms) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

// derivarMetasMacro() vem de js/calculo.js (carregado antes deste arquivo),
// compartilhada com a tela de personalização.

/* ---------- dados / persistência ---------- */

// Estado inicial de um usuário sem dados salvos: perfil vindo da sessão (banco)
// e nenhuma refeição ainda.
function dadosVazios(perfil) {
  return { versao: VERSAO_DADOS, perfil: { ...perfil }, refeicoes: [] };
}

/**
 * Traz os dados salvos para a versão atual do formato.
 *  - v1: refeição plana com macros no próprio objeto.
 *  - v2: refeição com itens, mas com as chaves em inglês (profile/meals/items).
 *  - v3: mesmas informações com as chaves em português (perfil/refeicoes/itens).
 */
function migrar(dados, perfilDaSessao) {
  if (dados && dados.versao === VERSAO_DADOS) return dados;
  try {
    // --- v1 -> v2: cada refeição plana vira uma refeição com um item ---
    let v2 = dados;
    if (!dados || dados.version !== 2) {
      v2 = {
        version: 2,
        profile: {
          name: dados?.profile?.name ?? "Meu Perfil",
          goalKcal: dados?.profile?.goalKcal ?? 2000,
        },
        meals: (dados?.meals ?? []).map((m) => ({
          id: m.id ?? uid(),
          tipo: m.tipo ?? "Refeição",
          data: m.data ?? isoHoje(),
          items: [
            {
              id: uid(),
              nome: m.descricao || m.tipo || "Alimento",
              marca: "",
              gramas: 100,
              kcal100: Number(m.kcal) || 0,
              p100: Number(m.proteina) || 0,
              c100: Number(m.carbo) || 0,
              g100: Number(m.gordura) || 0,
            },
          ],
        })),
      };
    }

    // --- v2 -> v3: traduz as chaves para português ---
    const perfilV2 = v2?.profile ?? {};
    const metaKcal = Number(perfilV2.goalKcal) || 2000;
    // Só reaproveita os macros salvos se os três existirem; senão redistribui
    // a partir das kcal (evita um perfil meio preenchido zerar uma barra).
    const salvos = {
      metaCarbo: Number(perfilV2.goalCarbo) || 0,
      metaProteina: Number(perfilV2.goalProteina) || 0,
      metaGordura: Number(perfilV2.goalGordura) || 0,
    };
    const macros =
      salvos.metaCarbo > 0 && salvos.metaProteina > 0 && salvos.metaGordura > 0
        ? salvos
        : derivarMetasMacro(metaKcal);

    // Preserva o último snapshot sincronizado com o banco — sem ele, um ajuste
    // manual de metas seria sobrescrito pela sessão no próximo carregamento.
    const ultimas = v2?.lastSessionGoals;

    return {
      versao: VERSAO_DADOS,
      perfil: {
        nome: perfilV2.name ?? "Meu Perfil",
        foto: perfilV2.foto ?? null,
        metaKcal,
        ...macros,
      },
      ultimasMetasSessao: ultimas
        ? {
            metaKcal: ultimas.goalKcal,
            metaCarbo: ultimas.goalCarbo,
            metaProteina: ultimas.goalProteina,
            metaGordura: ultimas.goalGordura,
          }
        : null,
      refeicoes: (v2?.meals ?? []).map((m) => ({
        id: m.id ?? uid(),
        tipo: m.tipo ?? "Refeição",
        data: m.data ?? isoHoje(),
        itens: (m.items ?? []).map((it) => ({
          id: it.id ?? uid(),
          nome: it.nome ?? "Alimento",
          marca: it.marca ?? "",
          gramas: Number(it.gramas) || 0,
          kcal100: Number(it.kcal100) || 0,
          proteina100: Number(it.p100) || 0,
          carbo100: Number(it.c100) || 0,
          gordura100: Number(it.g100) || 0,
        })),
      })),
    };
  } catch {
    return dadosVazios(perfilDaSessao);
  }
}

function metasDe(p) {
  return {
    metaKcal: p.metaKcal,
    metaCarbo: p.metaCarbo,
    metaProteina: p.metaProteina,
    metaGordura: p.metaGordura,
  };
}

function metasIguais(a, b) {
  return (
    !!a &&
    !!b &&
    a.metaKcal === b.metaKcal &&
    a.metaCarbo === b.metaCarbo &&
    a.metaProteina === b.metaProteina &&
    a.metaGordura === b.metaGordura
  );
}

// Mantém o dashboard em sincronia com a conta (banco). O nome sempre reflete a
// conta logada. Para as metas, o banco é a autoridade quando ELAS MUDAM (via
// personalização): se as metas da sessão diferem do último snapshot
// sincronizado, adota as novas; caso contrário preserva o que está no
// localStorage — que pode conter o ajuste fino manual do modal de perfil.
function sincronizarComSessao(dados, perfilDaSessao) {
  dados.perfil.nome = perfilDaSessao.nome;
  // Foto é da conta (banco), não do localStorage — sempre reflete a sessão.
  dados.perfil.foto = perfilDaSessao.foto ?? null;
  const metasDaSessao = metasDe(perfilDaSessao);
  if (!metasIguais(dados.ultimasMetasSessao, metasDaSessao)) {
    Object.assign(dados.perfil, metasDaSessao);
    dados.ultimasMetasSessao = metasDaSessao;
  }
  return dados;
}

// Carrega as refeições salvas deste usuário; o perfil (nome + metas) é semeado
// da sessão (banco) na primeira vez e mantido em sincronia depois via
// sincronizarComSessao().
function carregarDados(perfilDaSessao) {
  const bruto = localStorage.getItem(CHAVE_STORAGE);
  let dados;
  if (!bruto) {
    dados = dadosVazios(perfilDaSessao);
  } else {
    let lido = null;
    try {
      lido = JSON.parse(bruto);
    } catch {
      /* localStorage corrompido — recomeça do perfil da sessão */
    }
    dados = lido ? migrar(lido, perfilDaSessao) : dadosVazios(perfilDaSessao);
  }
  sincronizarComSessao(dados, perfilDaSessao);
  salvarDados(dados);
  return dados;
}

function salvarDados(dados) {
  localStorage.setItem(CHAVE_STORAGE, JSON.stringify(dados));
}

// Inicializado no iniciar(), depois que a sessão é validada.
let estado = null;

// Previsão de resultado (prazo até o objetivo), calculada uma vez no boot a
// partir do perfil da sessão (banco). Ver preverResultado() em calculo.js.
let previsao = null;

// Dia que o dashboard está exibindo (Resumo do Dia + lista de refeições).
// Começa em hoje; as setas ‹ › mudam este valor.
let dataSelecionada = isoHoje();

/* ---------- cálculo de macros ---------- */

function macrosDoItem(item) {
  const f = (Number(item.gramas) || 0) / 100;
  return {
    kcal: item.kcal100 * f,
    proteina: item.proteina100 * f,
    carbo: item.carbo100 * f,
    gordura: item.gordura100 * f,
  };
}

function somarMacros(lista) {
  return lista.reduce(
    (a, m) => ({
      kcal: a.kcal + m.kcal,
      proteina: a.proteina + m.proteina,
      carbo: a.carbo + m.carbo,
      gordura: a.gordura + m.gordura,
    }),
    { kcal: 0, proteina: 0, carbo: 0, gordura: 0 }
  );
}

function totaisDaRefeicao(refeicao) {
  return somarMacros(refeicao.itens.map(macrosDoItem));
}

function totaisDoDia(dataISO) {
  return somarMacros(
    estado.refeicoes.filter((m) => m.data === dataISO).flatMap((m) => m.itens.map(macrosDoItem))
  );
}

/* ---------- detalhamento de macros ---------- */
function blocoMacros(macros) {
  return `
    <ul class="macro-legenda">
      <li><span class="bolinha bolinha-carbo"></span>Carboidrato <b>${arred(macros.carbo)} g</b></li>
      <li><span class="bolinha bolinha-proteina"></span>Proteína <b>${arred(macros.proteina)} g</b></li>
      <li><span class="bolinha bolinha-gordura"></span>Gordura <b>${arred(macros.gordura)} g</b></li>
    </ul>`;
}

/* ---------- desenho da tela ---------- */

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
  const t = totaisDoDia(dataSelecionada);
  const p = estado.perfil;
  document.getElementById("progresso-diario").innerHTML = [
    linhaProgresso("Calorias", "kcal", t.kcal, p.metaKcal, "kcal"),
    linhaProgresso("Carboidrato", "g", t.carbo, p.metaCarbo, "carbo"),
    linhaProgresso("Proteína", "g", t.proteina, p.metaProteina, "proteina"),
    linhaProgresso("Gordura", "g", t.gordura, p.metaGordura, "gordura"),
  ].join("");
}

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

// Preenche um elemento de foto (card ou modal) com a foto do perfil, ou
// cai nas iniciais do nome quando não há foto.
function mostrarFotoEm(el, perfil) {
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

function atualizarTela() {
  document.getElementById("perfil-nome").textContent = estado.perfil.nome;
  document.getElementById("perfil-meta").textContent = `Meta: ${estado.perfil.metaKcal.toLocaleString(
    "pt-BR"
  )} kcal / dia`;
  mostrarFotoEm(document.getElementById("perfil-foto"), estado.perfil);
  mostrarLinhaPrevisao();

  mostrarNavegacaoData();
  mostrarProgressoDiario();

  const lista = document.getElementById("lista-refeicoes");
  const doDia = estado.refeicoes.filter((m) => m.data === dataSelecionada);
  if (doDia.length === 0) {
    lista.innerHTML = `<p class="estado-vazio">Nenhuma refeição nesse dia. Toque em + pra adicionar.</p>`;
    return;
  }
  lista.innerHTML = doDia.map(cardRefeicao).join("");
}

// Atualiza o rótulo da barra de data e o botão "Copiar refeições de ontem".
function mostrarNavegacaoData() {
  document.getElementById("dia-valor").textContent = rotuloData(dataSelecionada);

  const anterior = somarDiasISO(dataSelecionada, -1);
  const temAnterior = estado.refeicoes.some((m) => m.data === anterior);
  const btn = document.getElementById("copiar-dia-btn");
  if (temAnterior) {
    btn.textContent = `Copiar refeições de ${rotuloData(anterior)}`;
    btn.hidden = false;
  } else {
    btn.hidden = true;
  }
}

/* ---------- ações sobre refeições/itens ---------- */

function removerRefeicao(id) {
  estado.refeicoes = estado.refeicoes.filter((m) => m.id !== id);
  salvarDados(estado);
  atualizarTela();
}

function removerItem(idItem) {
  for (const refeicao of estado.refeicoes) {
    const antes = refeicao.itens.length;
    refeicao.itens = refeicao.itens.filter((it) => it.id !== idItem);
    if (refeicao.itens.length !== antes) break;
  }
  salvarDados(estado);
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
  dataSelecionada = somarDiasISO(dataSelecionada, -1);
  atualizarTela();
});

document.getElementById("dia-proximo").addEventListener("click", () => {
  dataSelecionada = somarDiasISO(dataSelecionada, 1);
  atualizarTela();
});

// Copia (clona) as refeições do dia anterior para o dia selecionado,
// mantendo as que já existirem no dia atual. Cada refeição/item ganha novo id.
document.getElementById("copiar-dia-btn").addEventListener("click", () => {
  const anterior = somarDiasISO(dataSelecionada, -1);
  const doAnterior = estado.refeicoes.filter((m) => m.data === anterior);
  if (doAnterior.length === 0) return;
  for (const m of doAnterior) {
    estado.refeicoes.push({
      id: uid(),
      tipo: m.tipo,
      data: dataSelecionada,
      itens: m.itens.map((it) => ({ ...it, id: uid() })),
    });
  }
  salvarDados(estado);
  atualizarTela();
});

/* ---------- modal: nova refeição ---------- */

const modalRefeicao = document.getElementById("refeicao-modal-fundo");
const formRefeicao = document.getElementById("refeicao-form");

document.getElementById("nova-refeicao-btn").addEventListener("click", () => {
  formRefeicao.reset();
  // Adiciona no dia que está sendo exibido (permite planejar dias futuros).
  document.getElementById("refeicao-data").value = dataSelecionada;
  modalRefeicao.hidden = false;
});

document.getElementById("refeicao-cancelar-btn").addEventListener("click", () => {
  modalRefeicao.hidden = true;
});

formRefeicao.addEventListener("submit", (e) => {
  e.preventDefault();
  estado.refeicoes.push({
    id: uid(),
    tipo: document.getElementById("refeicao-tipo").value,
    data: document.getElementById("refeicao-data").value,
    itens: [],
  });
  salvarDados(estado);
  modalRefeicao.hidden = true;
  atualizarTela();
});

/* ---------- modal: buscar alimento (TACO / banco MySQL) ---------- */

const modalAlimento = document.getElementById("alimento-modal-fundo");
const campoBuscaAlimento = document.getElementById("alimento-busca-campo");
const elResultadosAlimento = document.getElementById("alimento-resultados");
const elPreviaAlimento = document.getElementById("alimento-previa");
const elPreviaAlimentoNome = document.getElementById("alimento-previa-nome");
const elPreviaAlimentoMacros = document.getElementById("alimento-previa-macros");
const campoQtdAlimento = document.getElementById("alimento-qtd");
const elChipsQtd = document.getElementById("alimento-qtd-chips");
const botaoManual = document.getElementById("manual-alternar");

/* ---------- porções em medidas caseiras ---------- */
// A TACO não traz peso de porção; estes valores seguem tabelas de medidas
// caseiras (ex.: Pinheiro et al.) e servem só como atalho. O usuário sempre
// pode digitar os gramas na mão. Vence a PRIMEIRA regra que casar com o nome.
const PORCOES = [
  { chave: /pao.*(forma|integral|gluten|aveia|milho)|forma/, itens: [["1 fatia", 25], ["2 fatias", 50]] },
  { chave: /pao.*(frances|sal|agua)|frances/, itens: [["1 unidade", 50]] },
  { chave: /arroz/, itens: [["1 colher de sopa", 25], ["1 escumadeira", 90]] },
  { chave: /feijao/, itens: [["1 concha", 80]] },
  { chave: /macarrao|espaguete|talharim/, itens: [["1 pegador", 100]] },
  { chave: /ovo.*(galinha|inteiro|frito|cozido|omelete|poche)/, itens: [["1 unidade", 50]] },
  { chave: /frango.*(peito|file|grelh|assad)/, itens: [["1 filé", 120]] },
  { chave: /carne|bife|patinho|alcatra|coxao|contra/, itens: [["1 bife", 100]] },
  { chave: /banana/, itens: [["1 unidade", 100]] },
  { chave: /maca\b/, itens: [["1 unidade", 130]] },
  { chave: /mamao|melao|melancia|abacaxi/, itens: [["1 fatia", 150]] },
  { chave: /leite.*(vaca|po|integral|desnatado|semi)/, itens: [["1 copo", 200]] },
  { chave: /batata/, itens: [["1 unidade média", 120]] },
];

const ACENTOS = { á:"a", à:"a", ã:"a", â:"a", ä:"a", é:"e", ê:"e", ë:"e", í:"i", ï:"i", ó:"o", ô:"o", õ:"o", ö:"o", ú:"u", ü:"u", ç:"c" };
function normalizar(s) {
  return (s || "").toLowerCase().replace(/[áàãâäéêëíïóôõöúüç]/g, (c) => ACENTOS[c] || c);
}

// Monta os chips de um alimento: porções caseiras que casarem + 100 g e 150 g
// como base genérica (sem duplicar gramaturas que a porção caseira já cobre).
function porcoesDe(alimento) {
  const nome = normalizar(alimento.nome);
  let nomeados = [];
  for (const p of PORCOES) {
    if (p.chave.test(nome)) { nomeados = p.itens; break; }
  }
  const chips = nomeados.map(([rotulo, g]) => ({ rotulo, gramas: g, nomeado: true }));
  for (const g of [100, 150]) {
    if (!chips.some((c) => c.gramas === g)) chips.push({ rotulo: g + " g", gramas: g, nomeado: false });
  }
  return chips;
}

function mostrarChipsQtd() {
  if (!alimentoSelecionado) return;
  const atual = Number(campoQtdAlimento.value) || 0;
  elChipsQtd.innerHTML = porcoesDe(alimentoSelecionado)
    .map(
      (c) =>
        `<button type="button" class="qtd-chip${c.gramas === atual ? " ativo" : ""}" data-g="${c.gramas}">${
          c.nomeado ? `${escaparHtml(c.rotulo)} · ${c.gramas} g` : escaparHtml(c.rotulo)
        }</button>`
    )
    .join("");
}

elChipsQtd.addEventListener("click", (e) => {
  const chip = e.target.closest(".qtd-chip");
  if (!chip || !alimentoSelecionado) return;
  campoQtdAlimento.value = chip.dataset.g;
  mostrarPrevia();
  mostrarChipsQtd();
});
const formManual = document.getElementById("manual-form");

let idRefeicaoAtual = null;
let ultimosResultados = [];
let alimentoSelecionado = null;

function abrirBuscaAlimento(idRefeicao) {
  idRefeicaoAtual = idRefeicao;
  alimentoSelecionado = null;
  ultimosResultados = [];
  campoBuscaAlimento.value = "";
  elResultadosAlimento.innerHTML = `<p class="alimento-dica">Digite pra buscar no banco de alimentos.</p>`;
  elPreviaAlimento.hidden = true;
  formManual.hidden = true;
  formManual.reset();
  modalAlimento.hidden = false;
  campoBuscaAlimento.focus();
}

document.getElementById("alimento-cancelar-btn").addEventListener("click", () => {
  modalAlimento.hidden = true;
});

// Busca no banco local (MySQL/TACO) via backend PHP. O JSON ja vem no formato
// que o app usa para cada alimento:
// { nome, marca, categoria, kcal100, proteina100, carbo100, gordura100 }.
async function buscarAlimentos(q) {
  const url = "api/buscar.php?q=" + encodeURIComponent(q);
  const res = await fetch(url);
  if (!res.ok) throw new Error("HTTP " + res.status);
  const alimentos = await res.json();
  return Array.isArray(alimentos) ? alimentos : [];
}

function mostrarResultados(alimentos) {
  ultimosResultados = alimentos;
  if (!alimentos.length) {
    elResultadosAlimento.innerHTML = `<p class="alimento-dica">Nenhum alimento encontrado. Tente outro termo ou adicione manualmente.</p>`;
    return;
  }
  elResultadosAlimento.innerHTML = alimentos
    .map(
      (a, i) => `
      <button type="button" class="alimento-resultado" data-idx="${i}">
        <span class="alimento-nome">${escaparHtml(a.nome)}</span>
        <span class="alimento-info">${(a.marca || a.categoria) ? escaparHtml(a.marca || a.categoria) + " · " : ""}${arred(a.kcal100)} kcal / 100 g</span>
      </button>`
    )
    .join("");
}

const executarBusca = atrasarChamada(async () => {
  const q = campoBuscaAlimento.value.trim();
  if (q.length < 2) {
    elResultadosAlimento.innerHTML = `<p class="alimento-dica">Digite pelo menos 2 letras.</p>`;
    return;
  }
  elResultadosAlimento.innerHTML = `<p class="alimento-dica">Buscando…</p>`;
  try {
    mostrarResultados(await buscarAlimentos(q));
  } catch {
    elResultadosAlimento.innerHTML = `<p class="alimento-erro">Não foi possível consultar o banco de alimentos. Verifique se o Apache e o MySQL do XAMPP estão ligados, ou use "Adicionar manualmente" abaixo.</p>`;
  }
}, 400);

campoBuscaAlimento.addEventListener("input", executarBusca);

elResultadosAlimento.addEventListener("click", (e) => {
  const btn = e.target.closest(".alimento-resultado");
  if (!btn) return;
  selecionarAlimento(ultimosResultados[Number(btn.dataset.idx)]);
});

function macrosDaPrevia() {
  const gramas = Number(campoQtdAlimento.value) || 0;
  const f = gramas / 100;
  return {
    gramas,
    kcal: alimentoSelecionado.kcal100 * f,
    proteina: alimentoSelecionado.proteina100 * f,
    carbo: alimentoSelecionado.carbo100 * f,
    gordura: alimentoSelecionado.gordura100 * f,
  };
}

function mostrarPrevia() {
  const m = macrosDaPrevia();
  elPreviaAlimentoNome.textContent =
    alimentoSelecionado.nome +
    (alimentoSelecionado.marca ? " · " + alimentoSelecionado.marca : "") +
    ` — ${arred(m.kcal)} kcal`;
  elPreviaAlimentoMacros.innerHTML = blocoMacros(m);
}

function selecionarAlimento(alimento) {
  if (!alimento) return;
  alimentoSelecionado = alimento;
  campoQtdAlimento.value = 100;
  mostrarPrevia();
  mostrarChipsQtd();
  elPreviaAlimento.hidden = false;
  elPreviaAlimento.scrollIntoView({ behavior: "smooth", block: "nearest" });
}

campoQtdAlimento.addEventListener("input", () => {
  if (alimentoSelecionado) {
    mostrarPrevia();
    mostrarChipsQtd();
  }
});

document.getElementById("alimento-adicionar-btn").addEventListener("click", () => {
  const gramas = Number(campoQtdAlimento.value);
  if (!alimentoSelecionado || !(gramas > 0)) return;
  adicionarItemNaRefeicao({
    nome: alimentoSelecionado.nome,
    marca: alimentoSelecionado.marca,
    gramas,
    kcal100: alimentoSelecionado.kcal100,
    proteina100: alimentoSelecionado.proteina100,
    carbo100: alimentoSelecionado.carbo100,
    gordura100: alimentoSelecionado.gordura100,
  });
});

function adicionarItemNaRefeicao(item) {
  const refeicao = estado.refeicoes.find((m) => m.id === idRefeicaoAtual);
  if (!refeicao) return;
  refeicao.itens.push({ id: uid(), ...item });
  salvarDados(estado);
  modalAlimento.hidden = true;
  atualizarTela();
}

/* entrada manual (quando o alimento não está na TACO) */
botaoManual.addEventListener("click", () => {
  formManual.hidden = !formManual.hidden;
  if (!formManual.hidden) formManual.scrollIntoView({ behavior: "smooth", block: "nearest" });
});

formManual.addEventListener("submit", (e) => {
  e.preventDefault();
  const gramas = Number(document.getElementById("manual-gramas").value);
  if (!(gramas > 0)) return;
  const fator = 100 / gramas; // macros informados são para essa quantidade → converte pra base 100 g
  adicionarItemNaRefeicao({
    nome: document.getElementById("manual-nome").value.trim(),
    marca: "",
    gramas,
    kcal100: (Number(document.getElementById("manual-kcal").value) || 0) * fator,
    proteina100: (Number(document.getElementById("manual-proteina").value) || 0) * fator,
    carbo100: (Number(document.getElementById("manual-carbo").value) || 0) * fator,
    gordura100: (Number(document.getElementById("manual-gordura").value) || 0) * fator,
  });
});

/* ---------- modal: perfil ---------- */

const modalPerfil = document.getElementById("perfil-modal-fundo");
const formPerfil = document.getElementById("perfil-form");

document.getElementById("editar-perfil-btn").addEventListener("click", () => {
  document.getElementById("perfil-nome-campo").value = estado.perfil.nome;
  document.getElementById("perfil-meta-campo").value = estado.perfil.metaKcal;
  document.getElementById("perfil-carbo-campo").value = estado.perfil.metaCarbo;
  document.getElementById("perfil-proteina-campo").value = estado.perfil.metaProteina;
  document.getElementById("perfil-gordura-campo").value = estado.perfil.metaGordura;
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
  mostrarFotoEm(document.getElementById("modal-foto"), estado.perfil);
  document.getElementById("foto-remover-btn").hidden = !estado.perfil.foto;
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
    estado.perfil.foto = dados.foto;
    salvarDados(estado);
    atualizarTela();
    mostrarFotoNoModal();
  } else {
    avisarErroFoto(dados.erro || "Não foi possível enviar a foto. Verifique se o servidor está no ar.");
  }
});

document.getElementById("foto-remover-btn").addEventListener("click", async () => {
  if (!estado.perfil.foto) return;
  elErroFoto.hidden = true;
  const { status, dados } = await enviarApi("api/foto.php", { acao: "remover" }).catch(() => ({
    status: 0,
    dados: {},
  }));
  if (status === 200 && dados.ok) {
    estado.perfil.foto = null;
    salvarDados(estado);
    atualizarTela();
    mostrarFotoNoModal();
  } else {
    avisarErroFoto(dados.erro || "Não foi possível remover a foto.");
  }
});

document.getElementById("perfil-cancelar-btn").addEventListener("click", () => {
  modalPerfil.hidden = true;
});

formPerfil.addEventListener("submit", (e) => {
  e.preventDefault();
  const metaKcal = Number(document.getElementById("perfil-meta-campo").value);
  // Recalcula os macros pelas kcal mantendo a proporção atual (estado.perfil
  // ainda guarda os valores de abertura do modal).
  const m = ajustarMacrosParaKcal(metaKcal, estado.perfil);
  estado.perfil.nome = document.getElementById("perfil-nome-campo").value.trim();
  estado.perfil.metaKcal = metaKcal;
  estado.perfil.metaCarbo = m.metaCarbo;
  estado.perfil.metaProteina = m.metaProteina;
  estado.perfil.metaGordura = m.metaGordura;
  salvarDados(estado);
  modalPerfil.hidden = true;
  atualizarTela();
});

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
  previsao = preverResultado(p);

  CHAVE_STORAGE = `nutribalance_data_${sessao.usuario.id}`;
  estado = carregarDados(perfilDaSessao);
  atualizarTela();

  // Seção de Progresso (histórico de peso/cintura + gráfico). Definida em
  // progresso.js, carregado antes deste arquivo. A sessão já foi validada.
  if (typeof iniciarProgresso === "function") iniciarProgresso(sessao);
}

iniciar();
