/* Figuras Plotly. Cada constructor devuelve {data, layout} para poder dibujarlas en pantalla o exportarlas a PNG. */
(function (root) {
  'use strict';
  const { fmt, fmtg } = root.F;

  function theme(force) {
    const cs = getComputedStyle(document.documentElement);
    const v = (n) => cs.getPropertyValue(n).trim();
    if (force === 'light') {
      return { ink: '#13242c', muted: '#56686d', line: '#d3dcdc', bg: '#ffffff', accent: '#0e6b87', clay: '#a85f22', good: '#2c7a4b', bad: '#b23a3a' };
    }
    return { ink: v('--ink'), muted: v('--muted'), line: v('--line'), bg: v('--surface'), accent: v('--accent'), clay: v('--clay'), good: v('--good'), bad: v('--bad') };
  }
  // Escala secuencial agua profunda → arena (carga baja → alta)
  const SCALE = [[0, '#0b2f4a'], [0.25, '#14628a'], [0.5, '#3fa3b8'], [0.75, '#a9d6c4'], [1, '#f1dca2']];
  const DIV = [[0, '#14628a'], [0.5, '#f4f4f0'], [1, '#b25e22']];
  const SERIES = ['#0e6b87', '#c0702e', '#5a7d2a', '#7c4f9e', '#b23a3a'];

  function base(th, title, extra = {}) {
    return Object.assign({
      title: { text: title, font: { size: 14, color: th.ink, family: 'Archivo, Arial Narrow, sans-serif' }, x: 0.02, xanchor: 'left' },
      paper_bgcolor: th.bg, plot_bgcolor: th.bg,
      font: { color: th.ink, family: 'Source Sans 3, Segoe UI, sans-serif', size: 12 },
      margin: { l: 60, r: 20, t: 44, b: 48 },
      legend: { orientation: 'h', y: -0.22, font: { size: 11 } },
      separators: ', ',
    }, extra);
  }
  const axis = (th, title, extra = {}) => Object.assign({ title: { text: title }, gridcolor: th.line, zerolinecolor: th.line, linecolor: th.line, tickfont: { color: th.muted } }, extra);

  function to2D(arr, Nx, Ny) {
    const z = [];
    for (let j = 0; j < Ny; j++) z.push(Array.from(arr.subarray(j * Nx, (j + 1) * Nx)));
    return z;
  }

  /** Campo a mostrar según el selector. */
  function field(R, kind, frame) {
    const snap = R.ftcs.snapshots[Math.min(frame, R.ftcs.snapshots.length - 1)];
    const N = R.m.N;
    if (kind === 'steady') return { arr: R.steady.h, label: 'h estacionario [m]', t: null, div: false };
    const out = new Float64Array(N);
    if (kind === 'rise') { for (let k = 0; k < N; k++) out[k] = snap.h[k] - R.ftcs.h0[k]; return { arr: out, label: 'h − h₀ [m]', t: snap.t, div: true }; }
    if (kind === 'diff') { for (let k = 0; k < N; k++) out[k] = snap.h[k] - R.steady.h[k]; return { arr: out, label: 'h(t) − h_est [m]', t: snap.t, div: true }; }
    return { arr: snap.h, label: 'h [m]', t: snap.t, div: false };
  }

  function fig3d(R, kind, frame, zexag, force) {
    const th = theme(force);
    const { m } = R;
    const f = field(R, kind, frame);
    const z = to2D(f.arr, m.Nx, m.Ny);
    let zmin = Infinity, zmax = -Infinity;
    for (const v of f.arr) { if (v < zmin) zmin = v; if (v > zmax) zmax = v; }
    if (f.div) { const a = Math.max(Math.abs(zmin), Math.abs(zmax), 1e-9); zmin = -a; zmax = a; }
    if (zmax - zmin < 1e-9) { zmax += 0.5; zmin -= 0.5; }
    const data = [{
      type: 'surface', x: m.x, y: m.y, z, colorscale: f.div ? DIV : SCALE, cmin: zmin, cmax: zmax,
      colorbar: { title: { text: f.label, side: 'right' }, thickness: 12, len: 0.75, tickfont: { color: th.muted } },
      contours: { z: { show: true, usecolormap: true, highlightcolor: th.ink, project: { z: true } } },
      hovertemplate: 'x=%{x:.1f} m<br>y=%{y:.1f} m<br>' + f.label + '=%{z:.4f}<extra></extra>',
      lighting: { ambient: 0.55, diffuse: 0.8, specular: 0.35, roughness: 0.45, fresnel: 0.15 },
      lightposition: { x: -1200, y: -1800, z: 2500 },
    }];
    // marcadores: canal, pozo, dren
    for (const s of m.sourceInfo) {
      if (s.type === 'line') {
        data.push({ type: 'scatter3d', mode: 'lines', x: m.y.map(() => s.x), y: m.y, z: m.y.map((_, j) => f.arr[j * m.Nx + s.i]),
          line: { color: th.clay, width: 6 }, name: 'Canal', hoverinfo: 'name' });
      } else {
        data.push({ type: 'scatter3d', mode: 'markers', x: [s.x], y: [s.y], z: [f.arr[s.j * m.Nx + s.i]],
          marker: { color: th.clay, size: 6, symbol: 'diamond' }, name: 'Pozo', hoverinfo: 'name' });
      }
    }
    if (m.drain) data.push({ type: 'scatter3d', mode: 'lines', x: m.y.map(() => m.drain.x), y: m.y, z: m.y.map((_, j) => f.arr[j * m.Nx + m.drain.i]),
      line: { color: th.good, width: 6 }, name: 'Dren', hoverinfo: 'name' });
    const ar = { x: 1.15, y: 1.15 * Math.max(0.35, Math.min(1, R.p.Ly / R.p.Lx)), z: 0.7 * zexag };
    const title = `${f.label}${f.t !== null ? ` · t = ${fmt(f.t, 1)} días` : ''}`;
    const layout = base(th, title, {
      margin: { l: 0, r: 0, t: 40, b: 0 },
      scene: {
        aspectmode: 'manual', aspectratio: ar,
        xaxis: axis(th, 'x [m]', { backgroundcolor: th.bg }), yaxis: axis(th, 'y [m]', { backgroundcolor: th.bg }),
        zaxis: axis(th, f.label, { range: [zmin, zmax], backgroundcolor: th.bg }),
        camera: { eye: { x: -1.15, y: -1.45, z: 0.85 } },
      },
      showlegend: data.length > 1, legend: { x: 0.02, y: 0.98, orientation: 'v', bgcolor: 'rgba(0,0,0,0)' },
    });
    return { data, layout };
  }

  function figMap(R, kind, frame, force) {
    const th = theme(force);
    const { m } = R;
    const f = field(R, kind, frame);
    const z = to2D(f.arr, m.Nx, m.Ny);
    let zmin = Infinity, zmax = -Infinity;
    for (const v of f.arr) { if (v < zmin) zmin = v; if (v > zmax) zmax = v; }
    if (f.div) { const a = Math.max(Math.abs(zmin), Math.abs(zmax), 1e-9); zmin = -a; zmax = a; }
    const data = [{
      type: 'contour', x: m.x, y: m.y, z, colorscale: f.div ? DIV : SCALE, zmin, zmax, ncontours: 18,
      contours: { coloring: 'heatmap', showlabels: true, labelfont: { size: 10, color: '#13242c' } },
      line: { width: 0.6, color: 'rgba(19,36,44,0.45)' },
      colorbar: { title: { text: f.label, side: 'right' }, thickness: 12, tickfont: { color: th.muted } },
      hovertemplate: 'x=%{x:.1f} m<br>y=%{y:.1f} m<br>%{z:.4f}<extra></extra>',
    }];
    for (const mo of R.mons) data.push({ type: 'scatter', mode: 'markers+text', x: [mo.x], y: [mo.y], text: [mo.name], textposition: 'top center',
      marker: { color: th.bg, size: 9, line: { color: th.ink, width: 2 } }, textfont: { color: th.ink, size: 11 }, showlegend: false, hoverinfo: 'text' });
    const layout = base(th, `Planta: isolíneas de ${f.label}${f.t !== null ? ` · t = ${fmt(f.t, 1)} d` : ''}`, {
      xaxis: axis(th, 'x [m]', { constrain: 'domain' }),
      yaxis: axis(th, 'y [m]', { scaleanchor: R.p.Ly / R.p.Lx >= 0.15 ? 'x' : undefined }),
    });
    return { data, layout };
  }

  function figSeries(R, force) {
    const th = theme(force);
    const t = R.ftcs.tSeries;
    const data = R.mons.map((mo, i) => ({ type: 'scatter', mode: 'lines', x: t, y: mo.series, name: mo.name, line: { color: SERIES[i % SERIES.length], width: 2 } }));
    R.mons.forEach((mo, i) => data.push({ type: 'scatter', mode: 'lines', x: [t[0], t[t.length - 1]], y: [mo.hSteady, mo.hSteady], name: `${mo.name} (estacionario)`,
      line: { color: SERIES[i % SERIES.length], width: 1, dash: 'dot' }, showlegend: i === 0, legendgroup: 'st', hoverinfo: 'skip' }));
    if (R.ftcs.boundary.length > 1 && R.ftcs.boundary[0].g !== null) {
      data.push({ type: 'scatter', mode: 'lines', x: R.ftcs.boundary.map((b) => b.t), y: R.ftcs.boundary.map((b) => b.g), name: 'Embalse g(t)', line: { color: th.ink, width: 2, dash: 'dash' } });
    }
    const p = R.p;
    if (p.limitRise != null && R.metrics.target) {
      const tg = R.metrics.target, sgn = tg.hSteady >= tg.h0 ? 1 : -1;
      data.push({ type: 'scatter', mode: 'lines', x: [t[0], t[t.length - 1]], y: [tg.h0 + sgn * p.limitRise, tg.h0 + sgn * p.limitRise], name: `Límite (${fmtg(p.limitRise)} m)`, line: { color: th.bad, width: 1.5, dash: 'dashdot' } });
    }
    return { data, layout: base(th, 'Evolución temporal en los puntos de control', { xaxis: axis(th, 't [días]'), yaxis: axis(th, 'h [m]') }) };
  }

  function figProfile(R, force) {
    const th = theme(force);
    const { m } = R;
    const j = Math.round((m.Ny - 1) / 2);
    const row = (arr) => Array.from(arr.subarray(j * m.Nx, (j + 1) * m.Nx));
    const data = [
      { type: 'scatter', mode: 'lines', x: m.x, y: row(R.ftcs.h0), name: 'Inicial', line: { color: th.muted, width: 1, dash: 'dot' } },
      { type: 'scatter', mode: 'lines+markers', x: m.x, y: row(R.ftcs.h), name: `FTCS t = ${fmt(R.ftcs.snapshots[R.ftcs.snapshots.length - 1].t, 0)} d`, line: { color: SERIES[0], width: 2 }, marker: { size: 4 } },
      { type: 'scatter', mode: 'lines', x: m.x, y: row(R.steady.h), name: 'Estacionario (SOR)', line: { color: SERIES[1], width: 2 } },
    ];
    if (R.analytic) {
      const xs = Array.from({ length: 200 }, (_, k) => k / 199 * R.p.Lx);
      data.push({ type: 'scatter', mode: 'lines', x: xs, y: xs.map(R.analytic.fn), name: 'Analítica 1D', line: { color: th.ink, width: 1, dash: 'dash' } });
    }
    return { data, layout: base(th, `Perfil h(x) en y = ${fmt(m.y[j], 0)} m`, { xaxis: axis(th, 'x [m]'), yaxis: axis(th, 'h [m]') }) };
  }

  function figConv(R, force) {
    const th = theme(force);
    const data = [{ type: 'scatter', mode: 'lines', y: R.steady.history, name: `SOR ω = ${fmtg(R.omegaUsed, 3)}`, line: { color: SERIES[0], width: 2 } }];
    if (R.gsHistory) data.push({ type: 'scatter', mode: 'lines', y: R.gsHistory, name: 'Gauss-Seidel', line: { color: SERIES[1], width: 2 } });
    data.push({ type: 'scatter', mode: 'lines', x: [0, Math.max(R.steady.history.length, (R.gsHistory || []).length)], y: [R.p.tol, R.p.tol], name: 'Tolerancia', line: { color: th.bad, dash: 'dot', width: 1 } });
    return { data, layout: base(th, 'Convergencia del estacionario', { xaxis: axis(th, 'Iteración k'), yaxis: axis(th, 'máx |h⁽ᵏ⁺¹⁾ − h⁽ᵏ⁾| [m]', { type: 'log', exponentformat: 'power' }) }) };
  }

  /** Figura extra: gradiente de salida (presa) o crecimiento del montículo (fuente). */
  function figExtra(R, force) {
    const th = theme(force);
    if (R.ftcs.exitSeries && R.features.rampSide) {
      const ic = R.p.iCrit || 1;
      return {
        data: [
          { type: 'scatter', mode: 'lines', x: R.ftcs.tSeries, y: R.ftcs.exitSeries, name: 'Gradiente de salida i', line: { color: SERIES[0], width: 2 } },
          { type: 'scatter', mode: 'lines', x: R.ftcs.tSeries, y: R.ftcs.exitSeries.map((g) => ic / Math.max(g, 1e-9)), name: 'FS = i_crit / i', yaxis: 'y2', line: { color: SERIES[1], width: 2 } },
        ],
        layout: base(th, 'Pie de talud: gradiente de salida y FS frente a piping', {
          xaxis: axis(th, 't [días]'), yaxis: axis(th, 'i [–]'),
          yaxis2: axis(th, 'FS', { overlaying: 'y', side: 'right', type: 'log', showgrid: false }),
        }),
      };
    }
    const { m } = R;
    const j = Math.round((m.Ny - 1) / 2);
    const snaps = R.ftcs.snapshots;
    const pick = [1, 2, 3, 4, 5, 6].map((k) => snaps[Math.min(snaps.length - 1, Math.round(k / 6 * (snaps.length - 1)))]);
    const data = pick.map((s, k) => ({
      type: 'scatter', mode: 'lines', x: m.x, y: m.x.map((_, i) => s.h[j * m.Nx + i] - R.ftcs.h0[j * m.Nx + i]),
      name: `t = ${fmt(s.t, 0)} d`, line: { color: SERIES[0], width: 1 + k * 0.4 }, opacity: 0.35 + k * 0.13,
    }));
    data.push({ type: 'scatter', mode: 'lines', x: m.x, y: m.x.map((_, i) => R.steady.h[j * m.Nx + i] - R.ftcs.h0[j * m.Nx + i]), name: 'Estacionario', line: { color: SERIES[1], width: 2, dash: 'dash' } });
    return { data, layout: base(th, 'Cambio h − h₀ a lo largo de x en distintos tiempos', { xaxis: axis(th, 'x [m]'), yaxis: axis(th, 'h − h₀ [m]') }) };
  }

  const CFG = { responsive: true, displaylogo: false, modeBarButtonsToRemove: ['sendDataToCloud', 'lasso2d', 'select2d'], locale: 'es' };
  function draw(el, fig) { return Plotly.react(el, fig.data, fig.layout, CFG); }
  async function png(fig, w, h) {
    const div = document.createElement('div');
    div.style.cssText = `position:absolute;left:-12000px;top:0;width:${w}px;height:${h}px`;
    document.body.appendChild(div);
    try {
      await Plotly.newPlot(div, fig.data, Object.assign({}, fig.layout, { width: w, height: h }), { staticPlot: true });
      return await Plotly.toImage(div, { format: 'png', width: w, height: h, scale: 2 });
    } finally { Plotly.purge(div); div.remove(); }
  }

  root.Charts = { fig3d, figMap, figSeries, figProfile, figConv, figExtra, draw, png, theme, base, axis, SERIES, CFG };
})(window);
