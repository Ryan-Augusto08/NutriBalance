/**
 * Progresso — histórico de peso/cintura: registro + gráfico de evolução.
 *
 * iniciarProgresso(sessao) é chamada por principal.js no fim do boot, com a
 * sessão já validada (não refaz exigirSessao()).
 *
 * Dados vêm de api/listar_medicoes.php; o registro vai por api/salvar_medicao.php.
 * O gráfico é SVG desenhado à mão (o projeto não usa biblioteca de gráfico).
 */

import { formatarDataBR, isoHoje, somarDiasISO } from "./utilitarios.js";
import { enviarApi } from "./auth.js";
import { estado } from "./estado.js";
import { salvarDados } from "./dados.js";
import { atualizarTela } from "./tela.js";
import { preverResultado } from "./calculo.js";

let medicoes = []; // [{ data:'YYYY-MM-DD', peso_kg:Number, cintura_cm:Number|null }]
let sessao = null; // sessão validada (usuário + perfil), usada quando não há histórico
let periodo = "tudo"; // janela do gráfico: '7d' | '1m' | '3m' | '1a' | 'tudo'
let metricaAtual = "peso"; // série no gráfico, escolhida no select: 'peso' | 'cintura'

/* ---------- utilidades ---------- */

// Data curta pro eixo horizontal: "24/07".
function dataCurta(iso) {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

// Filtra as medições pela janela selecionada (comparação lexical de ISO =
// cronológica). "tudo" devolve o histórico inteiro (do começo até hoje).
function filtrarPorPeriodo(lista) {
  if (periodo === "tudo") return lista;
  const dias = periodo === "7d" ? 7 : periodo === "1m" ? 30 : periodo === "3m" ? 90 : 365;
  const corte = somarDiasISO(isoHoje(), -dias);
  return lista.filter((m) => m.data >= corte);
}

const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const fmtKg = (n) => nf1.format(Number(n)) + " kg";
const fmtCm = (n) => nf1.format(Number(n)) + " cm";

/* ---------- métricas ---------- */

// As duas séries que o select oferece. `classe` casa com as regras de cor do
// progresso.css (.grafico-linha.peso / .grafico-linha.cintura).
const METRICAS = {
  peso: { rotulo: "Peso", unidade: "kg", classe: "peso", fmt: fmtKg },
  cintura: { rotulo: "Cintura", unidade: "cm", classe: "cintura", fmt: fmtCm },
};

/* ---------- escala vertical ---------- */

// Passo "redondo" para as marcas do eixo: 1, 2, 2,5, 5 ou 10 vezes uma potência
// de 10. Sem arredondar, o limite do eixo sai quebrado (78,6 kg) e o usuário lê
// como se fosse uma medição de verdade.
function passoAgradavel(amplitude, divisoes) {
  const bruto = amplitude / divisoes;
  const potencia = Math.pow(10, Math.floor(Math.log10(bruto)));
  const normalizado = bruto / potencia;
  const escolhido =
    normalizado <= 1 ? 1 : normalizado <= 2 ? 2 : normalizado <= 2.5 ? 2.5 : normalizado <= 5 ? 5 : 10;
  return escolhido * potencia;
}

// Limites arredondados do eixo vertical e as marcas que viram linha de grade.
function escalaVertical(valores) {
  let min = Math.min(...valores);
  let max = Math.max(...valores);

  // Janela mínima de 2 unidades. Cobre a série de valor único e também a
  // variação de poucos décimos, que geraria marcas repetidas na tela: o rótulo
  // mostra 1 casa decimal, então passo menor que 0,5 sairia como
  // "79,5 / 79,5 / 79,6".
  const MINIMA = 2;
  if (max - min < MINIMA) {
    const centro = (min + max) / 2;
    min = centro - MINIMA / 2;
    max = centro + MINIMA / 2;
  }

  const passo = passoAgradavel(max - min, 4);
  min = Math.floor(min / passo) * passo;
  max = Math.ceil(max / passo) * passo;

  // Contar as marcas em vez de ir somando o passo: somar acumula erro de ponto
  // flutuante e faria aparecer 96,00000000001 no rótulo.
  const total = Math.round((max - min) / passo);
  const marcas = [];
  for (let i = 0; i <= total; i++) marcas.push(min + i * passo);
  return { min, max, marcas };
}

/* ---------- datas do gráfico ---------- */

const DIA_MS = 24 * 60 * 60 * 1000;
const MESES_CURTOS = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];
const MESES_LONGOS = [
  "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

// Data ISO -> milissegundos à meia-noite local (a mesma base do eixo X).
const tempoDe = (iso) => new Date(iso + "T00:00:00").getTime();

// Milissegundos -> data ISO, no fuso local.
function isoDe(tempo) {
  const d = new Date(tempo);
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
}

// Segunda-feira da semana de uma data ISO. getDay() conta domingo como 0.
function segundaDaSemana(iso) {
  const diaDaSemana = new Date(iso + "T00:00:00").getDay();
  return somarDiasISO(iso, -((diaDaSemana + 6) % 7));
}

/* ---------- agrupamento dos pontos ---------- */

// Quanto agrupar, pela extensão REAL dos dados e não pelo botão de período:
// quem tem três semanas de histórico vê cada medição mesmo no filtro "Tudo".
function tipoDeGrupo(pontos) {
  const dias = (tempoDe(pontos[pontos.length - 1].iso) - tempoDe(pontos[0].iso)) / DIA_MS;
  if (dias <= 45) return "dia";
  if (dias <= 180) return "semana";
  return "mes";
}

/**
 * Junta as medições em médias semanais ou mensais quando o período é longo.
 * Sem isso, um ano de pesagens vira dezenas de bolinhas encavaladas, e os
 * trechos em que o usuário se pesou todo dia parecem mais "cheios" que os
 * outros. Cada grupo fica na data média das suas medições, para a posição no
 * eixo continuar fiel ao tempo.
 * @returns {{iso:string, v:number, qtd:number, grupo:string, chave:string}[]}
 */
function agruparPontos(pontos) {
  const grupo = tipoDeGrupo(pontos);
  if (grupo === "dia") return pontos.map((p) => ({ ...p, qtd: 1, grupo, chave: p.iso }));

  const grupos = new Map(); // chave -> medições; o Map mantém a ordem de inserção
  for (const p of pontos) {
    const chave = grupo === "semana" ? segundaDaSemana(p.iso) : p.iso.slice(0, 7);
    if (!grupos.has(chave)) grupos.set(chave, []);
    grupos.get(chave).push(p);
  }

  return [...grupos].map(([chave, lista]) => {
    const media = (campo) => lista.reduce((soma, p) => soma + campo(p), 0) / lista.length;
    return {
      chave,
      grupo,
      qtd: lista.length,
      iso: isoDe(media((p) => tempoDe(p.iso))),
      v: Math.round(media((p) => p.v) * 10) / 10,
    };
  });
}

/* ---------- eixo de datas ---------- */

/**
 * Marcas do eixo horizontal em datas redondas do calendário — cada dia, cada
 * segunda-feira ou o dia 1 do mês —, independentes das datas das medições.
 * Rótulo de mês leva o ano na primeira marca e em cada janeiro ("dez", "jan/26").
 * @returns {{t:number, texto:string}[]}
 */
function marcasDeData(t0, t1) {
  const dias = (t1 - t0) / DIA_MS;
  const marcas = [];

  if (dias <= 10) {
    // Poucos dias: um rótulo por dia (dia sim, dia não acima de 5 dias, senão
    // não cabem). Conta para trás a partir da última data, que é hoje.
    const passo = dias <= 5 ? 1 : 2;
    for (let iso = isoDe(t1); tempoDe(iso) >= t0; iso = somarDiasISO(iso, -passo)) {
      marcas.unshift({ t: tempoDe(iso), texto: dataCurta(iso) });
    }
    return marcas;
  }

  if (dias <= 45) {
    // Até 45 dias: um rótulo por semana, sempre na segunda-feira.
    let iso = segundaDaSemana(isoDe(t0));
    if (tempoDe(iso) < t0) iso = somarDiasISO(iso, 7);
    for (; tempoDe(iso) <= t1; iso = somarDiasISO(iso, 7)) {
      marcas.push({ t: tempoDe(iso), texto: dataCurta(iso) });
    }
    return marcas;
  }

  // Meses: o menor passo (1, 2, 3, 6 ou 12) que deixa no máximo 6 rótulos,
  // alinhado ao calendário (passo 3 cai em jan, abr, jul e out).
  const meses = dias / 30.4;
  const passoMeses = [1, 2, 3, 6, 12].find((p) => meses / p <= 6) ?? 12;
  const inicio = new Date(t0);
  let ano = inicio.getFullYear();
  let mes = inicio.getMonth() + (inicio.getDate() === 1 ? 0 : 1); // primeiro dia 1 dentro do período
  while (mes % passoMeses) mes++;
  for (;;) {
    const d = new Date(ano, mes, 1); // mês acima de 11 vira o ano seguinte sozinho
    if (d.getTime() > t1) break;
    const comAno = marcas.length === 0 || d.getMonth() === 0;
    marcas.push({
      t: d.getTime(),
      texto: MESES_CURTOS[d.getMonth()] + (comAno ? "/" + String(d.getFullYear()).slice(2) : ""),
    });
    mes += passoMeses;
  }
  return marcas;
}

/* ---------- gráfico SVG de linha ---------- */

// Tamanho do desenho em unidades do viewBox. O SVG escala para a largura do
// cartão; o detalhe ao tocar converte a posição do dedo de volta para essa base.
const LARGURA = 300;
const ALTURA = 162;

// Pontos do gráfico que está na tela, já em coordenadas do SVG. Guardado para
// o detalhe ao tocar/passar o mouse achar o ponto mais próximo.
let coordenadasAtuais = [];

// Monta o SVG da série. `pontos` é [{ iso, v, ... }] já agrupado e `metrica` é
// uma entrada de METRICAS (dá cor, rótulo, unidade e formato).
function svgGrafico(pontos, metrica, descricao) {
  const margemEsq = 46; // título do eixo (deitado) + rótulos de valor
  const margemDir = 10;
  const margemTopo = 10;
  const margemBase = 32; // rótulos de data

  const esquerda = margemEsq;
  const direita = LARGURA - margemDir;
  const topo = margemTopo;
  const base = ALTURA - margemBase;

  const escala = escalaVertical(pontos.map((p) => p.v));
  const y = (v) => base - ((v - escala.min) / (escala.max - escala.min)) * (base - topo);

  const t0 = tempoDe(pontos[0].iso);
  const t1 = tempoDe(pontos[pontos.length - 1].iso);
  const x = (t) => {
    if (t1 === t0) return (esquerda + direita) / 2; // data única → centro
    return esquerda + ((t - t0) / (t1 - t0)) * (direita - esquerda);
  };

  const coordenadas = pontos.map((p) => ({ px: x(tempoDe(p.iso)), py: y(p.v), ...p }));
  coordenadasAtuais = coordenadas;

  // Grade horizontal com o valor de cada marca à esquerda.
  const grade = escala.marcas
    .map((v) => {
      const py = y(v).toFixed(1);
      return `<line class="grafico-grade" x1="${esquerda}" y1="${py}" x2="${direita}" y2="${py}" />
        <text class="grafico-eixo" x="${esquerda - 6}" y="${py}" text-anchor="end" dominant-baseline="middle">${nf1.format(v)}</text>`;
    })
    .join("");

  // Nome da métrica deitado na lateral. É ele que carrega a unidade, para as
  // marcas da grade ficarem só com o número.
  const tituloEixo = `<text class="grafico-eixo-titulo" transform="translate(11 ${((topo + base) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle">${metrica.rotulo} (${metrica.unidade})</text>`;

  // Marcas de data com linha vertical clara. A largura do rótulo é estimada
  // pelo número de caracteres (cerca de 5,5 unidades cada, na fonte de 9px).
  // Marca na ponta do gráfico ancora o texto para dentro; as demais ficam
  // centralizadas e só entram se couberem sem encostar na anterior.
  // A marca da ponta direita (hoje) tem prioridade: se encostar na anterior,
  // sai a anterior.
  const marcasVisiveis = [];
  for (const m of t1 === t0 ? [{ t: t0, texto: dataCurta(pontos[0].iso) }] : marcasDeData(t0, t1)) {
    const px = x(m.t);
    const largura = m.texto.length * 5.5;
    let ancora = "middle";
    let inicio = px - largura / 2;
    const naPontaDireita = t1 !== t0 && direita - px < 1;
    if (t1 !== t0 && px - esquerda < 1) {
      ancora = "start";
      inicio = px;
    } else if (naPontaDireita) {
      ancora = "end";
      inicio = px - largura;
    }
    if (inicio < esquerda - 4 || inicio + largura > direita + 8) continue;
    const encosta = () => marcasVisiveis.length && inicio < marcasVisiveis[marcasVisiveis.length - 1].fim + 4;
    if (naPontaDireita) while (encosta()) marcasVisiveis.pop();
    if (encosta()) continue;
    marcasVisiveis.push({ px, ancora, texto: m.texto, fim: inicio + largura });
  }
  const rotulosData = marcasVisiveis
    .map(
      (m) => `<line class="grafico-grade-vertical" x1="${m.px.toFixed(1)}" y1="${topo}" x2="${m.px.toFixed(1)}" y2="${base}" />
        <text class="grafico-eixo" x="${m.px.toFixed(1)}" y="${base + 14}" text-anchor="${m.ancora}">${m.texto}</text>`
    )
    .join("");

  let linha;
  if (coordenadas.length > 1) {
    // Linha de evolução ligando os pontos.
    linha = `<polyline class="grafico-linha ${metrica.classe}" points="${coordenadas.map((c) => `${c.px.toFixed(1)},${c.py.toFixed(1)}`).join(" ")}" />`;
  } else {
    // Uma medição só: linha horizontal tracejada no nível atual (ainda não há
    // evolução para traçar). Já dá a leitura de gráfico, sem inventar tendência.
    const yy = coordenadas[0].py.toFixed(1);
    linha = `<line class="grafico-linha ${metrica.classe} unico" x1="${esquerda}" y1="${yy}" x2="${direita}" y2="${yy}" />`;
  }

  // O último ponto é o "onde estou hoje": um pouco maior e com borda.
  const ultimo = coordenadas.length - 1;
  const bolinhas = coordenadas
    .map(
      (c, i) =>
        `<circle class="grafico-ponto ${metrica.classe} ${i === ultimo ? "atual" : ""}" cx="${c.px.toFixed(1)}" cy="${c.py.toFixed(1)}" r="${i === ultimo ? 4 : 3}" />`
    )
    .join("");

  // Realce do detalhe ao tocar: começa escondido e é movido por mostrarDetalhe().
  const realce = `<g class="grafico-realce ${metrica.classe}" style="display:none">
      <line x1="0" y1="${topo}" x2="0" y2="${base}" />
      <circle cx="0" cy="0" r="5" />
    </g>`;

  return `<svg class="grafico-svg" viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-label="${descricao}">
    ${grade}${rotulosData}${tituloEixo}${linha}${bolinhas}${realce}
  </svg>`;
}

// Bloco do gráfico: cabeçalho (nome da métrica + valor atual) e o SVG.
// `pontos` chega cru (uma entrada por medição): o valor do topo é a última
// medição real, e só o desenho usa as médias.
function blocoGrafico(pontos, metrica) {
  const primeiro = pontos[0];
  const ultimo = pontos[pontos.length - 1];
  const descricao =
    `Evolução de ${metrica.rotulo.toLowerCase()}: de ${metrica.fmt(primeiro.v)} em ${formatarDataBR(primeiro.iso)} ` +
    `a ${metrica.fmt(ultimo.v)} em ${formatarDataBR(ultimo.iso)}`;
  const dica =
    pontos.length === 1
      ? `<p class="grafico-dica">Registre em outro dia para ver a linha de evolução.</p>`
      : "";
  return `
    <div class="grafico-card">
      <div class="grafico-topo">
        <span class="grafico-titulo">${metrica.rotulo}</span>
        <span class="grafico-atual">${metrica.fmt(ultimo.v)}</span>
      </div>
      ${svgGrafico(agruparPontos(pontos), metrica, descricao)}
      <div class="grafico-dica-ponto" hidden></div>
      ${dica}
    </div>`;
}

/* ---------- detalhe ao tocar / passar o mouse ---------- */

// Texto da caixinha conforme o ponto seja uma medição, uma semana ou um mês.
function textoDoDetalhe(c, metrica) {
  const valor = metrica.fmt(c.v);
  if (c.qtd === 1) return `${formatarDataBR(c.iso)} · ${valor}`;
  const media = `média ${valor} (${c.qtd} medições)`;
  if (c.grupo === "semana") return `Semana de ${dataCurta(c.chave)} · ${media}`;
  const [ano, mes] = c.chave.split("-").map(Number);
  return `${MESES_LONGOS[mes - 1]} de ${ano} · ${media}`;
}

function esconderDetalhe() {
  const el = document.getElementById("progresso-graficos");
  el.querySelector(".grafico-realce")?.style.setProperty("display", "none");
  const caixa = el.querySelector(".grafico-dica-ponto");
  if (caixa) caixa.hidden = true;
}

// Acha o ponto mais próximo do cursor/dedo (só pela horizontal, que é o que o
// olho segue num gráfico de tempo), realça e mostra a caixinha acima dele.
function mostrarDetalhe(e) {
  const el = document.getElementById("progresso-graficos");
  const svg = el.querySelector(".grafico-svg");
  const card = el.querySelector(".grafico-card");
  const caixa = el.querySelector(".grafico-dica-ponto");
  if (!svg || !caixa || coordenadasAtuais.length === 0) return;

  const area = svg.getBoundingClientRect();
  if (e.clientY < area.top || e.clientY > area.bottom) return esconderDetalhe();
  const fator = area.width / LARGURA; // unidades do viewBox -> pixels da tela
  const vx = (e.clientX - area.left) / fator;
  const c = coordenadasAtuais.reduce((maisPerto, p) =>
    Math.abs(p.px - vx) < Math.abs(maisPerto.px - vx) ? p : maisPerto
  );

  const realce = svg.querySelector(".grafico-realce");
  realce.querySelector("line").setAttribute("x1", c.px);
  realce.querySelector("line").setAttribute("x2", c.px);
  realce.querySelector("circle").setAttribute("cx", c.px);
  realce.querySelector("circle").setAttribute("cy", c.py);
  realce.style.display = "";

  caixa.textContent = textoDoDetalhe(c, METRICAS[metricaAtual]);
  caixa.hidden = false;
  // Posição relativa ao cartão, presa às bordas para não vazar no celular.
  const cartao = card.getBoundingClientRect();
  const centro = area.left - cartao.left + c.px * fator;
  const metade = caixa.offsetWidth / 2;
  const esquerda = Math.min(Math.max(centro - metade, 4), cartao.width - caixa.offsetWidth - 4);
  caixa.style.left = `${esquerda}px`;
  caixa.style.top = `${area.top - cartao.top + c.py * fator - caixa.offsetHeight - 10}px`;
}

// Um ouvinte só no container (delegação): o gráfico é redesenhado a cada troca
// de período, mas o container continua o mesmo. No mouse, a caixinha some ao
// sair; no toque, fica até o próximo toque ou a próxima troca de gráfico.
function ligarDetalhe() {
  const el = document.getElementById("progresso-graficos");
  if (!el) return;
  el.addEventListener("pointermove", mostrarDetalhe);
  el.addEventListener("pointerdown", mostrarDetalhe);
  el.addEventListener("pointerleave", (e) => {
    if (e.pointerType === "mouse") esconderDetalhe();
  });
}

/* ---------- desenho geral ---------- */

function desenharProgresso() {
  const dados = filtrarPorPeriodo(medicoes);
  const pesos = dados.map((m) => ({ iso: m.data, v: Number(m.peso_kg) }));
  const cinturas = dados
    .filter((m) => m.cintura_cm !== null && m.cintura_cm !== undefined)
    .map((m) => ({ iso: m.data, v: Number(m.cintura_cm) }));

  const elGraficos = document.getElementById("progresso-graficos");
  if (!elGraficos) return;

  // Um gráfico por vez: quem decide a série é o select.
  const metrica = METRICAS[metricaAtual];
  const pontos = metricaAtual === "cintura" ? cinturas : pesos;
  coordenadasAtuais = [];
  elGraficos.innerHTML = pontos.length
    ? blocoGrafico(pontos, metrica)
    : `<p class="grafico-vazio">Nenhuma medição de ${metrica.rotulo.toLowerCase()} nesse período.</p>`;
}

/* ---------- dados ---------- */

async function carregar() {
  try {
    const res = await fetch("api/listar_medicoes.php", { headers: { Accept: "application/json" } });
    const dados = await res.json().catch(() => null);
    medicoes = dados && dados.ok && Array.isArray(dados.medicoes) ? dados.medicoes : [];
  } catch {
    medicoes = [];
  }

  // Garante um ponto de HOJE com o peso/cintura do perfil (a "meta", definida
  // na personalização), a menos que já exista uma medição registrada hoje.
  // Assim o gráfico sempre reflete os dados atuais do perfil — mesmo sem
  // nenhum registro manual, e sem sumir ao registrar uma data passada.
  if (sessao && sessao.perfil && sessao.perfil.peso_kg) {
    const hoje = isoHoje();
    if (!medicoes.some((m) => m.data === hoje)) {
      medicoes = medicoes.concat([
        {
          data: hoje,
          peso_kg: Number(sessao.perfil.peso_kg),
          cintura_cm: sessao.perfil.cintura_cm != null ? Number(sessao.perfil.cintura_cm) : null,
        },
      ]);
    }
  }
}

/* ---------- modal: registrar medição ---------- */

function ligarModal() {
  const modal = document.getElementById("medicao-modal-fundo");
  const formulario = document.getElementById("medicao-form");
  const erro = document.getElementById("medicao-erro");
  const btnAbrir = document.getElementById("nova-medicao-btn");
  const btnCancelar = document.getElementById("medicao-cancelar-btn");
  if (!modal || !formulario) return;

  btnAbrir.addEventListener("click", () => {
    formulario.reset();
    document.getElementById("medicao-data").value = isoHoje();
    document.getElementById("medicao-data").max = isoHoje();
    erro.hidden = true;
    modal.hidden = false;
  });
  btnCancelar.addEventListener("click", () => {
    modal.hidden = true;
  });

  formulario.addEventListener("submit", async (e) => {
    e.preventDefault();
    erro.hidden = true;
    const btn = document.getElementById("medicao-enviar");
    const cinturaBruta = document.getElementById("medicao-cintura").value;
    const corpo = {
      data: document.getElementById("medicao-data").value,
      peso_kg: Number(document.getElementById("medicao-peso").value),
      cintura_cm: cinturaBruta === "" ? null : Number(cinturaBruta),
    };
    btn.disabled = true;
    btn.textContent = "Salvando…";
    const { status, dados } = await enviarApi("api/salvar_medicao.php", corpo).catch(() => ({
      status: 0,
      dados: {},
    }));
    btn.disabled = false;
    btn.textContent = "Salvar medição";

    if (status === 200 && dados.ok) {
      modal.hidden = true;
      aplicarMetasNovas(dados.pesoAtual, dados.metas);
      await carregar();
      desenharProgresso();
    } else {
      erro.textContent = dados.erro || "Não foi possível salvar. Verifique se o servidor está no ar.";
      erro.hidden = false;
    }
  });
}

/* ---------- metas recalculadas pelo servidor ---------- */

// O servidor recalcula a meta de kcal e os macros a partir do peso mais recente
// (salvar_medicao.php) e devolve o resultado. Aplicar aqui é o que faz o card
// de perfil, o Resumo do Dia e a previsão mudarem na hora, sem recarregar.
// `metas` vem null quando o perfil ainda está incompleto.
function aplicarMetasNovas(pesoAtual, metas) {
  if (sessao && sessao.perfil) sessao.perfil.peso_kg = pesoAtual;
  if (metas) {
    Object.assign(estado.dados.perfil, metas);
    // Mesmo snapshot que sincronizarComSessao() (dados.js) guarda: no próximo
    // carregamento, as metas do banco já batem com as do navegador.
    estado.dados.ultimasMetasSessao = { ...metas };
    salvarDados();
    if (sessao && sessao.perfil) Object.assign(sessao.perfil, metas);
  }
  if (sessao && sessao.perfil) estado.previsao = preverResultado(sessao.perfil);
  atualizarTela();
}

/* ---------- controles: métrica e período ---------- */

function ligarSeletorMetrica() {
  const select = document.getElementById("progresso-metrica");
  if (!select) return;
  select.value = metricaAtual;
  select.addEventListener("change", () => {
    metricaAtual = select.value;
    desenharProgresso();
  });
}

function ligarFiltros() {
  const barra = document.getElementById("progresso-filtros");
  if (!barra) return;
  barra.addEventListener("click", (e) => {
    const btn = e.target.closest(".filtro-btn");
    if (!btn) return;
    periodo = btn.dataset.periodo;
    barra.querySelectorAll(".filtro-btn").forEach((b) => b.classList.toggle("ativo", b === btn));
    desenharProgresso();
  });
}

/* ---------- ponto de entrada ---------- */

// Chamada por iniciar() (principal.js) após a sessão validada. Liga o modal e os
// controles uma vez, carrega o histórico e desenha. `sessaoAtual` alimenta o
// ponto de reserva vindo do perfil.
export async function iniciarProgresso(sessaoAtual) {
  sessao = sessaoAtual || null;
  ligarModal();
  ligarSeletorMetrica();
  ligarFiltros();
  ligarDetalhe();
  await carregar();
  desenharProgresso();
}
