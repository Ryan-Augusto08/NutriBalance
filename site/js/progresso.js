/**
 * Progresso — histórico de peso/cintura: registro + gráfico de evolução.
 * O site não usa módulos ES; este arquivo é carregado ANTES de app.js e expõe
 * a global initProgresso(session), chamada no fim de boot() (app.js) com a
 * sessão já validada (não refaz guard()).
 *
 * Dados vêm de api/listar_medicoes.php; o registro vai por api/salvar_medicao.php.
 * O gráfico é SVG desenhado à mão (o projeto não usa biblioteca de gráfico).
 */

(function () {
  let medicoes = []; // [{ data:'YYYY-MM-DD', peso_kg:Number, cintura_cm:Number|null }]
  let sessao = null; // sessão validada (usuário + perfil), para o fallback
  let periodo = "tudo"; // janela do gráfico: '1m' | '3m' | '1a' | 'tudo'

  /* ---------- utilidades ---------- */

  function isoHoje() {
    const d = new Date();
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

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

  // Soma `dias` (pode ser negativo) a uma data ISO e devolve ISO.
  function shiftDias(iso, dias) {
    const d = new Date(iso + "T00:00:00");
    d.setDate(d.getDate() + dias);
    const p = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }

  // Filtra as medições pela janela selecionada (comparação lexical de ISO =
  // cronológica). "tudo" devolve o histórico inteiro (do começo até hoje).
  function filtrarPorPeriodo(lista) {
    if (periodo === "tudo") return lista;
    const dias = periodo === "1m" ? 30 : periodo === "3m" ? 90 : 365;
    const corte = shiftDias(isoHoje(), -dias);
    return lista.filter((m) => m.data >= corte);
  }

  const nf1 = new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
  const fmtKg = (n) => nf1.format(Number(n)) + " kg";
  const fmtCm = (n) => nf1.format(Number(n)) + " cm";

  /* ---------- gráfico SVG de linha ---------- */

  // Constrói um mini-gráfico de linha para uma série de pontos {iso, v}.
  // `classe` é a cor (peso|cintura); `fmt` formata o valor exibido nos rótulos.
  function svgLinha(pontos, classe, fmt) {
    const W = 300;
    const H = 132;
    const padL = 10;
    const padR = 12;
    const padT = 14;
    const padB = 22;

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
      if (t1 === t0) return (padL + (W - padR)) / 2; // ponto único → centro
      const t = new Date(iso + "T00:00:00").getTime();
      return padL + ((t - t0) / (t1 - t0)) * (W - padL - padR);
    };
    const y = (v) => {
      if (vmax === vmin) return (padT + (H - padB)) / 2;
      return padT + (1 - (v - vmin) / (vmax - vmin)) * (H - padT - padB);
    };

    const coords = pontos.map((p) => ({ px: x(p.iso), py: y(p.v), ...p }));

    let linha;
    if (coords.length > 1) {
      // Linha de evolução ligando as medições.
      linha = `<polyline class="chart-line ${classe}" points="${coords.map((c) => `${c.px.toFixed(1)},${c.py.toFixed(1)}`).join(" ")}" />`;
    } else {
      // Uma medição só: linha horizontal tracejada no nível atual (ainda não há
      // evolução para traçar). Já dá a leitura de gráfico, sem inventar tendência.
      const yy = coords[0].py.toFixed(1);
      linha = `<line class="chart-line ${classe} single" x1="${padL}" y1="${yy}" x2="${W - padR}" y2="${yy}" />`;
    }
    const dots = coords
      .map((c) => `<circle class="chart-dot ${classe}" cx="${c.px.toFixed(1)}" cy="${c.py.toFixed(1)}" r="3.5" />`)
      .join("");

    // Rótulos de valor (máx no topo, mín na base) e datas (primeira e última).
    const primeiro = pontos[0];
    const ultimo = pontos[pontos.length - 1];
    const rotulosV = `
      <text class="chart-axis" x="${padL}" y="${padT - 4}">${fmt(vmax)}</text>
      <text class="chart-axis" x="${padL}" y="${H - padB + 12}">${fmt(vmin)}</text>`;
    const rotulosData =
      pontos.length > 1
        ? `<text class="chart-axis chart-axis-end" x="${padL}" y="${H - 5}">${dataCurta(primeiro.iso)}</text>
           <text class="chart-axis chart-axis-end" x="${W - padR}" y="${H - 5}" text-anchor="end">${dataCurta(ultimo.iso)}</text>`
        : `<text class="chart-axis" x="${x(primeiro.iso).toFixed(1)}" y="${H - 5}" text-anchor="middle">${dataCurta(primeiro.iso)}</text>`;

    return `<svg class="chart-svg" viewBox="0 0 ${W} ${H}" role="img" aria-label="Gráfico de evolução">
      ${rotulosV}${rotulosData}${linha}${dots}
    </svg>`;
  }

  // Bloco de um gráfico (título + valor atual + svg). `pontos` já filtrados.
  function blocoGrafico(titulo, pontos, classe, fmt) {
    const atual = pontos.length ? fmt(pontos[pontos.length - 1].v) : "—";
    const dica =
      pontos.length === 1
        ? `<p class="chart-hint">Registre em outro dia para ver a linha de evolução.</p>`
        : "";
    return `
      <div class="chart-card">
        <div class="chart-head">
          <span class="chart-title">${titulo}</span>
          <span class="chart-current">${atual}</span>
        </div>
        ${svgLinha(pontos, classe, fmt)}
        ${dica}
      </div>`;
  }

  /* ---------- resumo textual (neutro) ---------- */

  // Direção neutra de uma variação, dado um limiar de "estável".
  function direcao(delta, limiar) {
    if (Math.abs(delta) < limiar) return "estável";
    return delta < 0 ? "queda" : "alta";
  }

  function linhaResumo(rotulo, pontos, fmt, unidade, limiar) {
    if (pontos.length < 2) return "";
    const ini = pontos[0];
    const fim = pontos[pontos.length - 1];
    const delta = fim.v - ini.v;
    const dir = direcao(delta, limiar);
    const dias = diasEntre(ini.iso, fim.iso);
    const sinal = delta > 0 ? "+" : delta < 0 ? "−" : "";
    const deltaFmt = `${sinal}${nf1.format(Math.abs(delta))} ${unidade}`;
    const periodo = dias > 0 ? ` em ${dias} ${dias === 1 ? "dia" : "dias"}` : "";
    return `<p class="resumo-line"><b>${rotulo}:</b> ${fmt(ini.v)} → ${fmt(fim.v)}
      <span class="resumo-delta">(${deltaFmt}${periodo} · ${dir})</span></p>`;
  }

  function renderResumo(pesos, cinturas) {
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
      const dPeso = pesos[pesos.length - 1].v - pesos[0].v;
      const dCint = cinturas[cinturas.length - 1].v - cinturas[0].v;
      if (Math.abs(dPeso) < 0.5 && dCint <= -0.5) {
        html += `<p class="resumo-nota">Peso estável com cintura em queda — indicativo de mudança de composição corporal.</p>`;
      } else if (dPeso >= 0.5 && dCint <= -0.5) {
        html += `<p class="resumo-nota">Peso em alta com cintura em queda — indicativo de ganho de massa magra.</p>`;
      }
    }

    if (!html) {
      html = `<p class="resumo-line">Uma medição registrada. Registre em outro dia para ver a variação.</p>`;
    }
    el.innerHTML = html;
  }

  /* ---------- render geral ---------- */

  function render() {
    const dados = filtrarPorPeriodo(medicoes);
    const pesos = dados.map((m) => ({ iso: m.data, v: m.peso_kg }));
    const cinturas = dados
      .filter((m) => m.cintura_cm !== null && m.cintura_cm !== undefined)
      .map((m) => ({ iso: m.data, v: m.cintura_cm }));

    renderResumo(pesos, cinturas);

    const charts = document.getElementById("progresso-charts");
    if (!charts) return;
    if (pesos.length === 0) {
      charts.innerHTML = "";
      return;
    }
    let html = blocoGrafico("Peso", pesos, "peso", fmtKg);
    if (cinturas.length > 0) {
      html += blocoGrafico("Cintura", cinturas, "cintura", fmtCm);
    }
    charts.innerHTML = html;
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

  function bindModal() {
    const modal = document.getElementById("medicao-modal-overlay");
    const form = document.getElementById("medicao-form");
    const erro = document.getElementById("medicao-error");
    const btnAbrir = document.getElementById("add-medicao-btn");
    const btnCancelar = document.getElementById("medicao-cancel-btn");
    if (!modal || !form) return;

    btnAbrir.addEventListener("click", () => {
      form.reset();
      document.getElementById("medicao-data").value = isoHoje();
      document.getElementById("medicao-data").max = isoHoje();
      erro.hidden = true;
      modal.hidden = false;
    });
    btnCancelar.addEventListener("click", () => {
      modal.hidden = true;
    });

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      erro.hidden = true;
      const btn = document.getElementById("medicao-submit");
      const cinturaRaw = document.getElementById("medicao-cintura").value;
      const corpo = {
        data: document.getElementById("medicao-data").value,
        peso_kg: Number(document.getElementById("medicao-peso").value),
        cintura_cm: cinturaRaw === "" ? null : Number(cinturaRaw),
      };
      btn.disabled = true;
      btn.textContent = "Salvando…";
      const { status, dados } = await apiPost("api/salvar_medicao.php", corpo).catch(() => ({
        status: 0,
        dados: {},
      }));
      btn.disabled = false;
      btn.textContent = "Salvar medição";

      if (status === 200 && dados.ok) {
        modal.hidden = true;
        await carregar();
        render();
      } else {
        erro.textContent = dados.erro || "Não foi possível salvar. Verifique se o servidor está no ar.";
        erro.hidden = false;
      }
    });
  }

  /* ---------- filtros de período ---------- */

  function bindFiltros() {
    const bar = document.getElementById("progresso-filtros");
    if (!bar) return;
    bar.addEventListener("click", (e) => {
      const btn = e.target.closest(".filtro-btn");
      if (!btn) return;
      periodo = btn.dataset.range;
      bar.querySelectorAll(".filtro-btn").forEach((b) => b.classList.toggle("active", b === btn));
      render();
    });
  }

  /* ---------- ponto de entrada ---------- */

  // Chamada por boot() (app.js) após a sessão validada. Liga o modal e os
  // filtros uma vez, carrega o histórico e desenha. `session` alimenta o
  // fallback do perfil.
  window.initProgresso = async function initProgresso(session) {
    sessao = session || null;
    bindModal();
    bindFiltros();
    await carregar();
    render();
  };
})();
