/* HidroCalc — gráficos (Chart.js), dibujos SVG y exportación a pgfplots */
(function (global) {
  'use strict';
  const HC = global.HC;

  const PALETTE = ['#2563eb', '#0d9488', '#d97706', '#dc2626', '#7c3aed', '#475569', '#16a34a', '#db2777'];
  const PGF_COLORS = PALETTE.map((c, i) => `\\definecolor{c${i}}{HTML}{${c.slice(1).toUpperCase()}}`).join('\n');

  const live = new Map(); // canvas -> Chart

  function cssVar(name, fallback) {
    const v = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
    return v || fallback;
  }

  function destroyIn(el) {
    el.querySelectorAll('canvas').forEach((c) => { const ch = live.get(c); if (ch) { ch.destroy(); live.delete(c); } });
  }

  /** dibuja un spec (xy/bar/svg) dentro de un contenedor */
  function render(spec, el, opts = {}) {
    destroyIn(el);
    if (spec.type === 'svg') { el.innerHTML = spec.svg; return null; }
    const canvas = document.createElement('canvas');
    el.innerHTML = '';
    el.appendChild(canvas);
    const text = opts.print ? '#1f2937' : cssVar('--text-2', '#334155');
    const grid = opts.print ? '#e5e7eb' : cssVar('--grid', 'rgba(148,163,184,.25)');
    const ds = spec.datasets.map((d, i) => {
      const color = d.color || PALETTE[i % PALETTE.length];
      return {
        label: d.label,
        data: d.data,
        borderColor: color,
        backgroundColor: d.fill ? color + '33' : (spec.type === 'bar' ? color + 'cc' : color),
        borderWidth: d.width || 2,
        borderDash: d.dash ? [6, 4] : undefined,
        pointRadius: d.points ? (d.pointRadius || 4) : 0,
        pointHoverRadius: 5,
        showLine: d.showLine !== false,
        fill: d.fill ? (d.fill === true ? 'origin' : d.fill) : false,
        tension: d.tension || 0,
        stepped: d.stepped || false,
        order: d.order || 0,
        yAxisID: d.y2 ? 'y2' : 'y'
      };
    });
    const isBar = spec.type === 'bar';
    const scales = {
      x: isBar ? { ticks: { color: text }, grid: { color: grid } } : {
        type: 'linear',
        title: { display: !!spec.xLabel, text: spec.xLabel, color: text },
        ticks: { color: text }, grid: { color: grid },
        reverse: !!spec.xReverse, min: spec.xMin, max: spec.xMax
      },
      y: {
        title: { display: !!spec.yLabel, text: spec.yLabel, color: text },
        ticks: { color: text }, grid: { color: grid },
        reverse: !!spec.yReverse, min: spec.yMin, max: spec.yMax, beginAtZero: !!spec.beginAtZero
      }
    };
    if (spec.datasets.some((d) => d.y2)) {
      scales.y2 = { position: 'right', title: { display: !!spec.y2Label, text: spec.y2Label, color: text }, ticks: { color: text }, grid: { drawOnChartArea: false } };
    }
    const chart = new global.Chart(canvas, {
      type: isBar ? 'bar' : 'scatter',
      data: isBar ? { labels: spec.labels, datasets: ds } : { datasets: ds },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: opts.print ? false : { duration: 350 },
        interaction: { mode: 'nearest', intersect: false },
        plugins: {
          legend: { display: spec.datasets.length > 1 || !!spec.legend, labels: { color: text, boxWidth: 14, usePointStyle: true } },
          tooltip: {
            callbacks: {
              label: (c) => {
                const p = c.raw;
                if (isBar) return `${c.dataset.label}: ${HC.fmtPlain(c.parsed.y, 3)}`;
                return `${c.dataset.label}: (${HC.fmtPlain(p.x, 3)}, ${HC.fmtPlain(p.y, 3)})`;
              }
            }
          }
        },
        scales
      }
    });
    live.set(canvas, chart);
    return chart;
  }

  /** convierte un spec a imagen PNG (para PDF) */
  function toImage(spec, w = 900, h = 420) {
    return new Promise((resolve) => {
      if (spec.type === 'svg') { resolve(null); return; }
      const holder = document.createElement('div');
      holder.style.cssText = `position:fixed;left:-10000px;top:0;width:${w}px;height:${h}px;background:#fff`;
      document.body.appendChild(holder);
      const ch = render(spec, holder, { print: true });
      requestAnimationFrame(() => {
        const url = ch.toBase64Image('image/png', 1);
        ch.destroy();
        holder.remove();
        resolve(url);
      });
    });
  }

  /* ---------- pgfplots ---------- */
  function texLbl(s) { return HC.texText(s || ''); }
  function downsample(arr, max = 160) {
    if (arr.length <= max) return arr;
    const step = arr.length / max;
    const out = [];
    for (let i = 0; i < max; i++) out.push(arr[Math.floor(i * step)]);
    out.push(arr[arr.length - 1]);
    return out;
  }
  function toPgf(spec) {
    if (spec.type === 'svg') return '';
    const num = (v) => (Number.isFinite(v) ? (+v.toPrecision(6)).toString() : 'nan');
    if (spec.type === 'bar') {
      const coords = spec.labels.map((l, i) => `c${i}`);
      const plots = spec.datasets.map((d, i) => `\\addplot[fill=c${i % PALETTE.length}!70, draw=c${i % PALETTE.length}] coordinates {${d.data.map((v, j) => `(${coords[j]},${num(v)})`).join(' ')}};\n\\addlegendentry{${texLbl(d.label)}}`).join('\n');
      return `\\begin{figure}[H]\\centering
\\begin{tikzpicture}
\\begin{axis}[ybar, width=0.95\\linewidth, height=6.5cm, bar width=${spec.datasets.length > 1 ? 6 : 12}pt,
  symbolic x coords={${coords.join(',')}}, xtick=data, xticklabels={${spec.labels.map((l) => `{${texLbl(l)}}`).join(',')}},
  x tick label style={rotate=35, anchor=east, font=\\scriptsize}, ylabel={${texLbl(spec.yLabel)}},
  ymajorgrids, legend style={font=\\scriptsize, at={(0.5,1.03)}, anchor=south, legend columns=-1}]
${plots}
\\end{axis}
\\end{tikzpicture}
\\caption{${texLbl(spec.title)}}
\\end{figure}`;
    }
    const plots = spec.datasets.map((d, i) => {
      const pts = downsample(d.data.filter((p) => Number.isFinite(p.x) && Number.isFinite(p.y)));
      const style = [`color=c${PALETTE.indexOf(d.color) >= 0 ? PALETTE.indexOf(d.color) : i % PALETTE.length}`, d.width > 2 ? 'very thick' : 'thick', d.dash ? 'dashed' : '', d.points ? 'mark=*, mark size=1.6pt' : 'mark=none', d.showLine === false ? 'only marks' : ''].filter(Boolean).join(', ');
      return `\\addplot[${style}] coordinates {${pts.map((p) => `(${num(p.x)},${num(p.y)})`).join(' ')}};\n\\addlegendentry{${texLbl(d.label)}}`;
    }).join('\n');
    return `\\begin{figure}[H]\\centering
\\begin{tikzpicture}
\\begin{axis}[width=0.95\\linewidth, height=7cm, grid=major, grid style={gray!25},
  xlabel={${texLbl(spec.xLabel)}}, ylabel={${texLbl(spec.yLabel)}}${spec.yReverse ? ', y dir=reverse' : ''},
  legend style={font=\\scriptsize, at={(0.5,1.03)}, anchor=south, legend columns=${Math.min(spec.datasets.length, 3)}},
  scaled ticks=false, tick label style={font=\\small, /pgf/number format/fixed}]
${plots}
\\end{axis}
\\end{tikzpicture}
\\caption{${texLbl(spec.title)}}
\\end{figure}`;
  }

  /* ---------- utilidades para dibujos SVG ---------- */
  function scaler(xmin, xmax, ymin, ymax, W, H, pad = 40) {
    const sx = (W - 2 * pad) / Math.max(xmax - xmin, 1e-9);
    const sy = (H - 2 * pad) / Math.max(ymax - ymin, 1e-9);
    const s = Math.min(sx, sy);
    const ox = pad + ((W - 2 * pad) - s * (xmax - xmin)) / 2;
    const oy = pad + ((H - 2 * pad) - s * (ymax - ymin)) / 2;
    return {
      s,
      X: (x) => ox + (x - xmin) * s,
      Y: (y) => H - oy - (y - ymin) * s
    };
  }
  /* escala independiente en x e y (para perfiles longitudinales) */
  function scaler2(xmin, xmax, ymin, ymax, W, H, pad = 44) {
    const sx = (W - 2 * pad) / Math.max(xmax - xmin, 1e-9);
    const sy = (H - 2 * pad) / Math.max(ymax - ymin, 1e-9);
    return { X: (x) => pad + (x - xmin) * sx, Y: (y) => H - pad - (y - ymin) * sy };
  }
  const poly = (pts, cls) => `<polygon class="${cls}" points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`;
  const pline = (pts, cls) => `<polyline class="${cls}" fill="none" points="${pts.map((p) => p.map((v) => v.toFixed(1)).join(',')).join(' ')}"/>`;
  const line = (x1, y1, x2, y2, cls) => `<line class="${cls}" x1="${x1.toFixed(1)}" y1="${y1.toFixed(1)}" x2="${x2.toFixed(1)}" y2="${y2.toFixed(1)}"/>`;
  const txt = (x, y, s, cls = 'sv-text', anchor = 'middle', rot = 0) => `<text class="${cls}" x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${anchor}"${rot ? ` transform="rotate(${rot} ${x.toFixed(1)} ${y.toFixed(1)})"` : ''}>${HC.esc(s)}</text>`;
  /** cota (línea de dimensión) entre dos puntos en pantalla */
  function dim(x1, y1, x2, y2, label, off = 14) {
    const dx = x2 - x1, dy = y2 - y1, L = Math.hypot(dx, dy) || 1;
    const nx = -dy / L * off, ny = dx / L * off;
    const a1 = [x1 + nx, y1 + ny], a2 = [x2 + nx, y2 + ny];
    let mx = (a1[0] + a2[0]) / 2 + nx * 0.55, my = (a1[1] + a2[1]) / 2 + ny * 0.55;
    if (off === 0) { if (Math.abs(dy) > Math.abs(dx)) mx -= 8; else my -= 8; }
    const rot = Math.abs(dy) > Math.abs(dx) ? -90 : 0;
    return `<g class="sv-dimg">${line(x1, y1, a1[0], a1[1], 'sv-ext')}${line(x2, y2, a2[0], a2[1], 'sv-ext')}<line class="sv-dim" x1="${a1[0].toFixed(1)}" y1="${a1[1].toFixed(1)}" x2="${a2[0].toFixed(1)}" y2="${a2[1].toFixed(1)}" marker-start="url(#arr)" marker-end="url(#arr)"/>${txt(mx, my + 4, label, 'sv-dimtext', 'middle', rot)}</g>`;
  }
  function svgFrame(W, H, body, title) {
    return `<svg class="hc-svg" viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${HC.esc(title || 'esquema')}">
<defs>
  <marker id="arr" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,1 L9,5 L0,9 z" class="sv-arrow"/></marker>
  <pattern id="soil" width="10" height="10" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="10" class="sv-hatch"/></pattern>
  <pattern id="conc" width="14" height="14" patternUnits="userSpaceOnUse"><circle cx="3" cy="4" r="1" class="sv-dot"/><circle cx="10" cy="10" r="0.8" class="sv-dot"/><path d="M8 3 l2 1 l-1 2z" class="sv-dot"/></pattern>
  <linearGradient id="wgrad" x1="0" x2="0" y1="0" y2="1"><stop offset="0" class="sv-w1"/><stop offset="1" class="sv-w2"/></linearGradient>
</defs>${body}</svg>`;
  }

  Object.assign(HC, {
    PALETTE, PGF_COLORS,
    chart: { render, toImage, toPgf, destroyIn },
    svg: { scaler, scaler2, poly, pline, line, txt, dim, frame: svgFrame }
  });
})(window);
