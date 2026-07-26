/**
 * Progresso — histórico de peso/cintura: registro + gráfico de evolução.
 * O site não usa módulos ES; este arquivo é carregado ANTES de app.js e expõe
 * a global iniciarProgresso(sessao), chamada no fim de iniciar() (app.js) com a
 * sessão já validada (não refaz exigirSessao()).
 *
 * Usa isoHoje() e somarDiasISO() definidas em app.js. Apesar de app.js ser
 * carregado DEPOIS, elas só são chamadas de dentro de iniciarProgresso() — ou
 * seja, quando app.js já foi interpretado e as globais existem.
 *
 * Dados vêm de api/listar_medicoes.php; o registro vai por api/salvar_medicao.php.
 * O gráfico é SVG desenhado à mão (o projeto não usa biblioteca de gráfico).
 */

(function () {
  let medicoes = []; // [{ data:'YYYY-MM-DD', peso_kg:Number, cintura_cm:Number|null }]
  let sessao = null; // sessão validada (usuário + perfil), usada quando não há histórico
  let periodo = "tudo"; // janela do gráfico: '1m' | '3m' | '1a' | 'tudo'

  /* ---------- utilidades ---------- */

  // Data curta pro eixo/resumo: "24/07".
  function dataCurta(iso) {
    const [, m, d] = iso.split("-");
    return `${d}/${m}`;
  }

  function diasEntre(isoA, isoB) {
    const a = new Date(isoA + "T00:00:00");
    const b = new Date(isoB + "T00:00:00");
    return Math.round((b - a) / 86400000);
  }

  // Filtra as medições pela janela selecionada (comparação lexical de ISO =
  // cronológica). "tudo" devolve o histórico inteiro (do começo até hoje).
  function filtrarPorPeriodo(lista) {
    if (periodo === "tudo") return lista;
    const dias = periodo === "1m" ? 30 : periodo === "3m" ? 90 : 365;
    const corte = somarDiasISO(isoHoje(), -dias);
    return lista.filter((m) => m.data >= corte);
  }

  const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtKg = (n) => nf1.format(Number(n)) + " kg";
  const fmtCm = (n) => nf1.format(Number(n)) + " cm";

  /* ---------- gráfico SVG de linha ---------- */

  // Constrói um mini-gráfico de linha para uma série de pontos {iso, v}.
  // `classe` é a cor (peso|cintura); `fmt` formata o valor exibido nos rótulos.
  function svgLinha(pontos, classe, fmt) {
    const LARGURA = 300;
    const ALTURA = 132;
    const margemEsq = 10;
    const margemDir = 12;
    const margemTopo = 14;
    const margemBase = 22;

    const valores = pontos.map((p) => p.v);
    let vmin = Math.min(...valores);
    let vmax = Math.max(...valores);
    // Folga vertical: 15% da amplitude (ou 1 unidade quando todos iguais).
    const folga = vmax - vmin > 0 ? (vmax - vmin) * 0.15 : 1;
    vmin -= folga;
    vmax += folga;

    const t0 = new Date(pontos[0].iso + "T00:00:00").getTime();
    const t1 = new Date(pontos[pontos.length - 1].iso + "T00:00:00").getTime();

    const x = (iso) => {
      if (t1 === t0) return (margemEsq + (LARGURA - margemDir)) / 2; // ponto único → centro
      const t = new Date(iso + "T00:00:00").getTime();
      return margemEsq + ((t - t0) / (t1 - t0)) * (LARGURA - margemEsq - margemDir);
    };
    const y = (v) => {
      if (vmax === vmin) return (margemTopo + (ALTURA - margemBase)) / 2;
      return margemTopo + (1 - (v - vmin) / (vmax - vmin)) * (ALTURA - margemTopo - margemBase);
    };

    const coordenadas = pontos.map((p) => ({ px: x(p.iso), py: y(p.v), ...p }));

    let linha;
    if (coordenadas.length > 1) {
      // Linha de evolução ligando as medições.
      linha = `<polyline class="grafico-linha ${classe}" points="${coordenadas.map((c) => `${c.px.toFixed(1)},${c.py.toFixed(1)}`).join(" ")}" />`;
    } else {
      // Uma medição só: linha horizontal tracejada no nível atual (ainda não há
      // evolução para traçar). Já dá a leitura de gráfico, sem inventar tendência.
      const yy = coordenadas[0].py.toFixed(1);
      linha = `<line class="grafico-linha ${classe} unico" x1="${margemEsq}" y1="${yy}" x2="${LARGURA - margemDir}" y2="${yy}" />`;
    }
    const bolinhas = coordenadas
      .map((c) => `<circle class="grafico-ponto ${classe}" cx="${c.px.toFixed(1)}" cy="${c.py.toFixed(1)}" r="3.5" />`)
      .join("");

    // Rótulos de valor (máx no topo, mín na base) e datas (primeira e última).
    const primeiro = pontos[0];
    const ultimo = pontos[pontos.length - 1];
    const rotulosV = `
      <text class="grafico-eixo" x="${margemEsq}" y="${margemTopo - 4}">${fmt(vmax)}</text>
      <text class="grafico-eixo" x="${margemEsq}" y="${ALTURA - margemBase + 12}">${fmt(vmin)}</text>`;
    const rotulosData =
      pontos.length > 1
        ? `<text class="grafico-eixo grafico-eixo-fim" x="${margemEsq}" y="${ALTURA - 5}">${dataCurta(primeiro.iso)}</text>
           <text class="grafico-eixo grafico-eixo-fim" x="${LARGURA - margemDir}" y="${ALTURA - 5}" text-anchor="end">${dataCurta(ultimo.iso)}</text>`
        : `<text class="grafico-eixo" x="${x(primeiro.iso).toFixed(1)}" y="${ALTURA - 5}" text-anchor="middle">${dataCurta(primeiro.iso)}</text>`;

    return `<svg class="grafico-svg" viewBox="0 0 ${LARGURA} ${ALTURA}" role="img" aria-label="Gráfico de evolução">
      ${rotulosV}${rotulosData}${linha}${bolinhas}
    </svg>`;
  }

  // Bloco de um gráfico (título + valor atual + svg). `pontos` já filtrados.
  function blocoGrafico(titulo, pontos, classe, fmt) {
    const atual = pontos.length ? fmt(pontos[pontos.length - 1].v) : "—";
    const dica =
      pontos.length === 1
        ? `<p class="grafico-dica">Registre em outro dia para ver a linha de evolução.</p>`
        : "";
    return `
      <div class="grafico-card">
        <div class="grafico-topo">
          <span class="grafico-titulo">${titulo}</span>
          <span class="grafico-atual">${atual}</span>
        </div>
        ${svgLinha(pontos, classe, fmt)}
        ${dica}
      </div>`;
  }

  /* ---------- resumo textual (neutro) ---------- */

  // Sentido neutro de uma variação, dado um limiar de "estável".
  function sentidoDaVariacao(variacao, limiar) {
    if (Math.abs(variacao) < limiar) return "estável";
    return variacao < 0 ? "queda" : "alta";
  }

  function linhaResumo(rotulo, pontos, fmt, unidade, limiar) {
    if (pontos.length < 2) return "";
    const ini = pontos[0];
    const fim = pontos[pontos.length - 1];
    const variacao = fim.v - ini.v;
    const sentido = sentidoDaVariacao(variacao, limiar);
    const dias = diasEntre(ini.iso, fim.iso);
    const sinal = variacao > 0 ? "+" : variacao < 0 ? "−" : "";
    const variacaoFmt = `${sinal}${nf1.format(Math.abs(variacao))} ${unidade}`;
    const periodoTexto = dias > 0 ? ` em ${dias} ${dias === 1 ? "dia" : "dias"}` : "";
    return `<p class="resumo-linha"><b>${rotulo}:</b> ${fmt(ini.v)} → ${fmt(fim.v)}
      <span class="resumo-variacao">(${variacaoFmt}${periodoTexto} · ${sentido})</span></p>`;
  }

  function mostrarResumo(pesos, cinturas) {
    const el = document.getElementById("progresso-resumo");
    if (!el) return;

    if (pesos.length === 0) {
      el.innerHTML = `<p class="resumo-vazio">Nenhuma medição ainda. Toque em <b>Registrar medição</b> para começar a acompanhar sua evolução.</p>`;
      return;
    }

    let html = "";
    html += linhaResumo("Peso", pesos, fmtKg, "kg", 0.5);
    html += linhaResumo("Cintura", cinturas, fmtCm, "cm", 0.5);

    // Nota factual de composição corporal (só com histórico suficiente dos dois).
    if (pesos.length >= 2 && cinturas.length >= 2) {
      const varPeso = pesos[pesos.length - 1].v - pesos[0].v;
      const varCintura = cinturas[cinturas.length - 1].v - cinturas[0].v;
      if (Math.abs(varPeso) < 0.5 && varCintura <= -0.5) {
        html += `<p class="resumo-nota">Peso estável com cintura em queda — indicativo de mudança de composição corporal.</p>`;
      } else if (varPeso >= 0.5 && varCintura <= -0.5) {
        html += `<p class="resumo-nota">Peso em alta com cintura em queda — indicativo de ganho de massa magra.</p>`;
      }
    }

    if (!html) {
      html = `<p class="resumo-linha">Uma medição registrada. Registre em outro dia para ver a variação.</p>`;
    }
    el.innerHTML = html;
  }

  /* ---------- desenho geral ---------- */

  function desenharProgresso() {
    const dados = filtrarPorPeriodo(medicoes);
    const pesos = dados.map((m) => ({ iso: m.data, v: m.peso_kg }));
    const cinturas = dados
      .filter((m) => m.cintura_cm !== null && m.cintura_cm !== undefined)
      .map((m) => ({ iso: m.data, v: m.cintura_cm }));

    mostrarResumo(pesos, cinturas);

    const elGraficos = document.getElementById("progresso-graficos");
    if (!elGraficos) return;
    if (pesos.length === 0) {
      elGraficos.innerHTML = "";
      return;
    }
    let html = blocoGrafico("Peso", pesos, "peso", fmtKg);
    if (cinturas.length > 0) {
      html += blocoGrafico("Cintura", cinturas, "cintura", fmtCm);
    }
    elGraficos.innerHTML = html;
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

  /* ---------- filtros de período ---------- */

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

  // Chamada por iniciar() (app.js) após a sessão validada. Liga o modal e os
  // filtros uma vez, carrega o histórico e desenha. `sessaoAtual` alimenta o
  // ponto de reserva vindo do perfil.
  window.iniciarProgresso = async function iniciarProgresso(sessaoAtual) {
    sessao = sessaoAtual || null;
    ligarModal();
    ligarFiltros();
    await carregar();
    desenharProgresso();
  };
})();
