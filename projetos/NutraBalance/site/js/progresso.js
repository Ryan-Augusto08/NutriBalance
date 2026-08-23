/**
 * Progresso — histórico de peso/cintura: registro + gráfico de evolução.
 *
 * iniciarProgresso(sessao) é chamada por principal.js no fim do boot, com a
 * sessão já validada (não refaz exigirSessao()).
 *
 * Dados vêm de api/listar_medicoes.php; o registro vai por api/salvar_medicao.php.
 * O gráfico é SVG desenhado à mão (o projeto não usa biblioteca de gráfico).
 */

import { isoHoje, somarDiasISO } from "./utilitarios.js";
import { enviarApi } from "./auth.js";

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

/* ---------- gráfico SVG de linha ---------- */

// Quais datas ganham rótulo no eixo horizontal. A escolha é por POSIÇÃO, não
// por índice: com as medições concentradas numa semana e um vão de meses
// depois, escolher por índice empilharia vários rótulos no mesmo canto.
function indicesComRotulo(coordenadas) {
  const ESPACO = 34; // largura aproximada de "23/08" em 9px, com respiro
  const ultimo = coordenadas.length - 1;
  if (ultimo <= 0) return [0];

  const escolhidos = [0];
  for (let i = 1; i < ultimo; i++) {
    if (coordenadas[i].px - coordenadas[escolhidos[escolhidos.length - 1]].px >= ESPACO) escolhidos.push(i);
  }
  // A última data é obrigatória: descarta as anteriores que fossem encostar nela.
  while (escolhidos.length && coordenadas[ultimo].px - coordenadas[escolhidos[escolhidos.length - 1]].px < ESPACO) {
    escolhidos.pop();
  }
  escolhidos.push(ultimo);
  return escolhidos;
}

// Monta o SVG da série. `pontos` é [{ iso, v }] já filtrado pelo período e
// `metrica` é uma entrada de METRICAS (dá cor, rótulo, unidade e formato).
function svgGrafico(pontos, metrica) {
  const LARGURA = 300;
  const ALTURA = 162;
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

  const t0 = new Date(pontos[0].iso + "T00:00:00").getTime();
  const t1 = new Date(pontos[pontos.length - 1].iso + "T00:00:00").getTime();
  const x = (iso) => {
    if (t1 === t0) return (esquerda + direita) / 2; // data única → centro
    const t = new Date(iso + "T00:00:00").getTime();
    return esquerda + ((t - t0) / (t1 - t0)) * (direita - esquerda);
  };

  const coordenadas = pontos.map((p) => ({ px: x(p.iso), py: y(p.v), ...p }));

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

  const rotulosData = indicesComRotulo(coordenadas)
    .map((i) => {
      const c = coordenadas[i];
      // As pontas ancoram para dentro, senão o texto vaza da área do SVG.
      const ancora =
        coordenadas.length === 1 ? "middle" : i === 0 ? "start" : i === coordenadas.length - 1 ? "end" : "middle";
      return `<text class="grafico-eixo" x="${c.px.toFixed(1)}" y="${base + 14}" text-anchor="${ancora}">${dataCurta(c.iso)}</text>`;
    })
    .join("");

  let linha;
  if (coordenadas.length > 1) {
    // Linha de evolução ligando as medições.
    linha = `<polyline class="grafico-linha ${metrica.classe}" points="${coordenadas.map((c) => `${c.px.toFixed(1)},${c.py.toFixed(1)}`).join(" ")}" />`;
  } else {
    // Uma medição só: linha horizontal tracejada no nível atual (ainda não há
    // evolução para traçar). Já dá a leitura de gráfico, sem inventar tendência.
    const yy = coordenadas[0].py.toFixed(1);
    linha = `<line class="grafico-linha ${metrica.classe} unico" x1="${esquerda}" y1="${yy}" x2="${direita}" y2="${yy}" />`;
  }
  const bolinhas = coordenadas
    .map((c) => `<circle class="grafico-ponto ${metrica.classe}" cx="${c.px.toFixed(1)}" cy="${c.py.toFixed(1)}" r="3.5" />`)
    .join("");

  return `<svg class="grafico-svg" viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-label="Evolução de ${metrica.rotulo.toLowerCase()} em ${metrica.unidade}">
    ${grade}${tituloEixo}${rotulosData}${linha}${bolinhas}
  </svg>`;
}

// Bloco do gráfico: cabeçalho (nome da métrica + valor atual) e o SVG.
function blocoGrafico(pontos, metrica) {
  const dica =
    pontos.length === 1
      ? `<p class="grafico-dica">Registre em outro dia para ver a linha de evolução.</p>`
      : "";
  return `
    <div class="grafico-card">
      <div class="grafico-topo">
        <span class="grafico-titulo">${metrica.rotulo}</span>
        <span class="grafico-atual">${metrica.fmt(pontos[pontos.length - 1].v)}</span>
      </div>
      ${svgGrafico(pontos, metrica)}
      ${dica}
    </div>`;
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
      await carregar();
      desenharProgresso();
    } else {
      erro.textContent = dados.erro || "Não foi possível salvar. Verifique se o servidor está no ar.";
      erro.hidden = false;
    }
  });
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
  await carregar();
  desenharProgresso();
}
