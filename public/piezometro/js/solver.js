/*
 * Núcleo numérico — Modelamiento de flujo subterráneo 2D
 *   S ∂h/∂t = T ∇²h + Qs(x,y)        (parabólica, FTCS)
 *   ∇²h = −Qs/T = −f                 (elíptica, Jacobi / Gauss-Seidel / SOR)
 *
 * Indexación: h[j*Nx + i] ≈ h(x_i, y_j), x_i = i·Δx, y_j = j·Δy.
 * Funciona en el navegador (window.Solver) y en Node (module.exports).
 */
(function (root) {
  'use strict';

  const NODE = { INTERIOR: 0, NEUMANN: 1, VERTEX: 2, DIRICHLET: 3, RAMP: 4, DRAIN: 5 };

  /** Valor de una frontera en el instante t (rampa lineal o constante). */
  function bcValue(bc, t) {
    if (bc.type === 'ramp') {
      if (t <= 0) return bc.h1;
      if (t >= bc.tf) return bc.h2;
      return bc.h1 + (bc.h2 - bc.h1) * t / bc.tf;
    }
    return bc.value;
  }
  function bcFinal(bc) { return bc.type === 'ramp' ? bc.h2 : bc.value; }
  const isDir = (bc) => bc.type === 'dirichlet' || bc.type === 'ramp';

  /** Construye malla, clasificación de nodos y término fuente a partir de los parámetros. */
  function buildModel(p) {
    const Nx = Math.round(p.Lx / p.dx) + 1;
    const Ny = Math.round(p.Ly / p.dy) + 1;
    const N = Nx * Ny;
    const D = p.T / p.S;
    const x = Array.from({ length: Nx }, (_, i) => i * p.dx);
    const y = Array.from({ length: Ny }, (_, j) => j * p.dy);

    // --- Término fuente Qs [m/día] ---
    const Qs = new Float64Array(N);
    const sourceInfo = [];
    for (const s of p.sources || []) {
      if (!s.enabled) continue;
      if (s.type === 'line') {
        // Fuente lineal vertical (canal): Qs = q_inf / Δx en la columna del canal
        const i = clampIdx(Math.round(s.x / p.dx), Nx);
        const base = s.q / p.dx;
        const lin = s.lining || { enabled: false };
        for (let j = 0; j < Ny; j++) {
          let q = base;
          if (lin.enabled && y[j] >= lin.y1 - 1e-9 && y[j] <= lin.y2 + 1e-9) q *= (1 - lin.eff / 100);
          Qs[j * Nx + i] += q;
        }
        sourceInfo.push({ type: 'line', i, Qs: base, x: x[i] });
      } else if (s.type === 'point') {
        // Fuente puntual (pozo): Qs = Q / (Δx Δy) en un único nodo
        const i = clampIdx(Math.round(s.x / p.dx), Nx);
        const j = clampIdx(Math.round(s.y / p.dy), Ny);
        const v = s.Q / (p.dx * p.dy);
        Qs[j * Nx + i] += v;
        sourceInfo.push({ type: 'point', i, j, Qs: v, x: x[i], y: y[j] });
      }
    }

    // --- Clasificación de nodos ---
    const type = new Uint8Array(N);
    const bcRef = new Array(N).fill(null);
    const bc = p.bc;
    for (let j = 0; j < Ny; j++) {
      for (let i = 0; i < Nx; i++) {
        const k = j * Nx + i;
        let ref = null;
        // primero bordes horizontales, luego verticales (prevalecen en los vértices)
        if (j === 0 && isDir(bc.south)) ref = bc.south;
        if (j === Ny - 1 && isDir(bc.north)) ref = bc.north;
        if (i === 0 && isDir(bc.west)) ref = bc.west;
        if (i === Nx - 1 && isDir(bc.east)) ref = bc.east;
        if (ref) {
          type[k] = ref.type === 'ramp' ? NODE.RAMP : NODE.DIRICHLET;
          bcRef[k] = ref;
          continue;
        }
        const onX = i === 0 || i === Nx - 1;
        const onY = j === 0 || j === Ny - 1;
        type[k] = onX && onY ? NODE.VERTEX : (onX || onY ? NODE.NEUMANN : NODE.INTERIOR);
      }
    }
    // Dren de intercepción: columna interior con carga fija
    let drain = null;
    if (p.drain && p.drain.enabled) {
      const i = clampIdx(Math.round(p.drain.x / p.dx), Nx);
      drain = { i, h: p.drain.h, x: x[i] };
      for (let j = 0; j < Ny; j++) {
        const k = j * Nx + i;
        if (type[k] === NODE.DIRICHLET || type[k] === NODE.RAMP) continue;
        type[k] = NODE.DRAIN;
        bcRef[k] = { type: 'dirichlet', value: p.drain.h };
      }
    }

    const counts = { interior: 0, neumann: 0, vertex: 0, dirichlet: 0, ramp: 0, drain: 0, sourceNodes: 0 };
    for (let k = 0; k < N; k++) {
      counts[['interior', 'neumann', 'vertex', 'dirichlet', 'ramp', 'drain'][type[k]]]++;
      if (Qs[k] !== 0 && type[k] <= NODE.VERTEX) counts.sourceNodes++;
    }
    counts.total = N;
    counts.updated = counts.interior + counts.neumann + counts.vertex;

    return { p, Nx, Ny, N, D, x, y, Qs, type, bcRef, counts, sourceInfo, drain };
  }

  function clampIdx(i, n) { return Math.max(0, Math.min(n - 1, i)); }

  /** Paso de tiempo máximo estable: Δt ≤ 1 / (2D (1/Δx² + 1/Δy²)). */
  function dtMax(p) {
    const D = p.T / p.S;
    return 1 / (2 * D * (1 / (p.dx * p.dx) + 1 / (p.dy * p.dy)));
  }

  /** θ del modo más lento según el par de bordes (Dirichlet/Neumann) de una dirección. */
  function thetaFor(a, b, Nint) {
    const da = isDir(a), db = isDir(b);
    if (da && db) return Math.PI / Nint;
    if (da || db) return Math.PI / (2 * Nint);
    return 0;
  }

  /** Radio espectral de Jacobi y ω óptimo de SOR para las condiciones de contorno reales. */
  function spectral(p) {
    const Nx = Math.round(p.Lx / p.dx) + 1, Ny = Math.round(p.Ly / p.dy) + 1;
    const wx = 1 / (p.dx * p.dx), wy = 1 / (p.dy * p.dy);
    const tx = thetaFor(p.bc.west, p.bc.east, Nx - 1);
    const ty = thetaFor(p.bc.south, p.bc.north, Ny - 1);
    const rhoJ = (wx * Math.cos(tx) + wy * Math.cos(ty)) / (wx + wy);
    const omegaOpt = 2 / (1 + Math.sqrt(Math.max(0, 1 - rhoJ * rhoJ)));
    // fórmula de HT6 (Dirichlet en todo el contorno, con N = número de nodos), sólo como referencia
    const rhoHT6 = 0.5 * (Math.cos(Math.PI / Nx) + Math.cos(Math.PI / Ny));
    const omegaHT6 = 2 / (1 + Math.sqrt(1 - rhoHT6 * rhoHT6));
    return {
      thetaX: tx, thetaY: ty, rhoJ, rhoGS: rhoJ * rhoJ, omegaOpt, rhoSOR: omegaOpt - 1,
      rhoHT6, omegaHT6, wx, wy,
    };
  }

  function initialField(m, t0) {
    const h = new Float64Array(m.N).fill(m.p.h0);
    for (let k = 0; k < m.N; k++) if (m.bcRef[k]) h[k] = bcValue(m.bcRef[k], t0);
    return h;
  }

  /**
   * Esquema FTCS explícito con nodo fantasma (reflexión) en los bordes Neumann.
   * opts: { dt, tEnd, frames, monitors:[{name,x,y}], limitRise, maxSeries }
   */
  function runFTCS(m, opts) {
    const { Nx, Ny, N, type, bcRef, Qs } = m;
    const p = m.p;
    const dt = opts.dt;
    const nSteps = Math.max(1, Math.round(opts.tEnd / dt));
    const rx = m.D * dt / (p.dx * p.dx);
    const ry = m.D * dt / (p.dy * p.dy);
    const srcFac = dt / p.S;

    let h = initialField(m, 0);
    let hn = new Float64Array(N);
    // perturbación opcional (emula el error de redondeo) para excitar todos los modos de Fourier
    if (opts.perturb) {
      let seed = 12345;
      const rnd = () => ((seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648) - 0.5;
      for (let k = 0; k < N; k++) if (type[k] <= NODE.VERTEX) h[k] += opts.perturb * rnd();
    }
    const h0 = Float64Array.from(h);

    // nodos actualizables y sus vecinos precomputados (reflexión = nodo fantasma)
    const upd = [];
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const k = j * Nx + i;
      if (type[k] > NODE.VERTEX) continue;
      const iw = i > 0 ? i - 1 : 1, ie = i < Nx - 1 ? i + 1 : Nx - 2;
      const js = j > 0 ? j - 1 : 1, jn = j < Ny - 1 ? j + 1 : Ny - 2;
      upd.push(k, j * Nx + iw, j * Nx + ie, js * Nx + i, jn * Nx + i);
    }
    const updA = Int32Array.from(upd);
    const rampIdx = [];
    for (let k = 0; k < N; k++) if (type[k] === NODE.RAMP) rampIdx.push(k);

    // monitores
    const mons = (opts.monitors || []).map((mo) => {
      const i = clampIdx(Math.round(mo.x / p.dx), Nx), j = clampIdx(Math.round(mo.y / p.dy), Ny);
      const k = j * Nx + i;
      return { ...mo, i, j, k, x: m.x[i], y: m.y[j], h0: h[k], series: [h[k]],
        maxH: h[k], tMax: 0, tExceed: null, t95: null };
    });
    const maxSeries = opts.maxSeries || 1500;
    const recEvery = Math.max(1, Math.floor(nSteps / maxSeries));
    const tSeries = [0];
    const frames = Math.max(2, opts.frames || 40);
    const snapEvery = Math.max(1, Math.floor(nSteps / frames));
    const snapshots = [{ t: 0, h: Float64Array.from(h) }];
    const bnd = [{ t: 0, g: rampIdx.length ? h[rampIdx[0]] : null }];

    // gradiente de salida (pie de talud): borde este si es Dirichlet
    const exitTrack = isDir(p.bc.east);
    const exitSeries = [exitTrack ? exitGradient(m, h) : null];
    let exitMax = exitSeries[0] || 0, exitTMax = 0;

    let diverged = null;
    const t0 = performance.now ? performance.now() : Date.now();
    for (let n = 0; n < nSteps; n++) {
      let big = false;
      for (let a = 0; a < updA.length; a += 5) {
        const k = updA[a], hk = h[k];
        const v = hk + rx * (h[updA[a + 2]] - 2 * hk + h[updA[a + 1]])
                     + ry * (h[updA[a + 4]] - 2 * hk + h[updA[a + 3]]) + srcFac * Qs[k];
        hn[k] = v;
        if (!(v < 1e6 && v > -1e6)) big = true;
      }
      // Dirichlet: fijos se copian; variable se reasigna con g(t_{n+1})
      const tNew = (n + 1) * dt;
      for (let k = 0; k < N; k++) if (type[k] > NODE.VERTEX) hn[k] = h[k];
      for (const k of rampIdx) hn[k] = bcValue(bcRef[k], tNew);
      const tmp = h; h = hn; hn = tmp;

      for (const mo of mons) {
        const v = h[mo.k];
        if (v > mo.maxH) { mo.maxH = v; mo.tMax = tNew; }
        if (opts.limitRise != null && mo.tExceed === null && Math.abs(v - mo.h0) >= opts.limitRise) mo.tExceed = tNew;
      }
      if (exitTrack) {
        const g = exitGradient(m, h);
        if (g > exitMax) { exitMax = g; exitTMax = tNew; }
        if ((n + 1) % recEvery === 0 || n === nSteps - 1) exitSeries.push(g);
      }
      if ((n + 1) % recEvery === 0 || n === nSteps - 1) {
        tSeries.push(tNew);
        for (const mo of mons) mo.series.push(h[mo.k]);
        if (rampIdx.length) bnd.push({ t: tNew, g: h[rampIdx[0]] });
      }
      if ((n + 1) % snapEvery === 0 || n === nSteps - 1) {
        snapshots.push({ t: tNew, h: Float64Array.from(h) });
      }
      // control de divergencia (esquema inestable): |h| > 10^6 m
      if (big) {
        if (snapshots[snapshots.length - 1].t !== tNew) snapshots.push({ t: tNew, h: Float64Array.from(h) });
        diverged = { step: n + 1, t: tNew };
        break;
      }
    }
    const elapsed = (performance.now ? performance.now() : Date.now()) - t0;
    return {
      h, h0, dt, nSteps, rx, ry, snapshots, tSeries, monitors: mons, boundary: bnd,
      exitSeries: exitTrack ? exitSeries : null, exitMax, exitTMax,
      diverged, elapsed, updates: m.N * nSteps,
    };
  }

  /** Gradiente hidráulico medio de salida en el borde este: (h_{Nx-2} − h_{Nx-1}) / Δx promediado en y. */
  function exitGradient(m, h) {
    const { Nx, Ny } = m;
    let s = 0;
    for (let j = 0; j < Ny; j++) s += (h[j * Nx + Nx - 2] - h[j * Nx + Nx - 1]) / m.p.dx;
    return s / Ny;
  }

  /**
   * Estado estacionario ∇²h = −f mediante Jacobi, Gauss-Seidel o SOR (fórmula ponderada).
   * opts: { method, omega, tol, maxIter, guess }
   */
  function solveSteady(m, opts) {
    const { Nx, Ny, N, type, bcRef, Qs } = m;
    const p = m.p;
    const wx = 1 / (p.dx * p.dx), wy = 1 / (p.dy * p.dy), den = 2 * (wx + wy);
    const method = opts.method || 'sor';
    const omega = method === 'sor' ? opts.omega : 1;
    const tol = opts.tol ?? 1e-4;
    const maxIter = opts.maxIter ?? 200000;

    const h = new Float64Array(N).fill(opts.guess ?? p.h0);
    for (let k = 0; k < N; k++) if (bcRef[k]) h[k] = bcFinal(bcRef[k]);
    const f = new Float64Array(N);
    for (let k = 0; k < N; k++) f[k] = Qs[k] / p.T;

    const upd = [];
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const k = j * Nx + i;
      if (type[k] > NODE.VERTEX) continue;
      const iw = i > 0 ? i - 1 : 1, ie = i < Nx - 1 ? i + 1 : Nx - 2;
      const js = j > 0 ? j - 1 : 1, jn = j < Ny - 1 ? j + 1 : Ny - 2;
      upd.push(k, j * Nx + iw, j * Nx + ie, js * Nx + i, jn * Nx + i);
    }
    const U = Int32Array.from(upd);
    const hist = [];
    const old = method === 'jacobi' ? new Float64Array(N) : null;
    let it = 0, change = Infinity;
    const t0 = performance.now ? performance.now() : Date.now();
    while (it < maxIter) {
      change = 0;
      if (old) old.set(h);
      const src = old || h;
      for (let a = 0; a < U.length; a += 5) {
        const k = U[a];
        const hGS = (wx * (src[U[a + 1]] + src[U[a + 2]]) + wy * (src[U[a + 3]] + src[U[a + 4]]) + f[k]) / den;
        const nv = (1 - omega) * src[k] + omega * hGS;
        const d = Math.abs(nv - h[k]);
        if (d > change) change = d;
        h[k] = nv;
      }
      it++;
      hist.push(change);
      if (change <= tol) break;
      if (!isFinite(change)) break;
    }
    const elapsed = (performance.now ? performance.now() : Date.now()) - t0;
    return { h, iterations: it, converged: change <= tol, history: hist, residual: residual(m, h, f), omega, method, elapsed };
  }

  /** Residuo máximo de la ecuación discreta |∇²h + f| en los nodos actualizables. */
  function residual(m, h, f) {
    const { Nx, Ny, type } = m;
    const p = m.p;
    const wx = 1 / (p.dx * p.dx), wy = 1 / (p.dy * p.dy);
    let r = 0;
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const k = j * Nx + i;
      if (type[k] > NODE.VERTEX) continue;
      const iw = i > 0 ? i - 1 : 1, ie = i < Nx - 1 ? i + 1 : Nx - 2;
      const js = j > 0 ? j - 1 : 1, jn = j < Ny - 1 ? j + 1 : Ny - 2;
      const lap = wx * (h[j * Nx + ie] - 2 * h[k] + h[j * Nx + iw]) + wy * (h[jn * Nx + i] - 2 * h[k] + h[js * Nx + i]);
      r = Math.max(r, Math.abs(lap + f[k]));
    }
    return r;
  }

  /**
   * Balance de masa estacionario (por unidad de espesor ya incluida en T):
   * entrada por fuentes y salida/entrada por nodos Dirichlet, con pesos de celda (½ en bordes).
   */
  function massBalance(m, h) {
    const { Nx, Ny, type, Qs } = m;
    const p = m.p;
    const wX = (i) => (i === 0 || i === Nx - 1 ? 0.5 : 1) * p.dx;
    const wY = (j) => (j === 0 || j === Ny - 1 ? 0.5 : 1) * p.dy;
    let source = 0;
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const k = j * Nx + i;
      if (type[k] <= NODE.VERTEX) source += Qs[k] * wX(i) * wY(j);
    }
    // flujo neto hacia los nodos Dirichlet (positivo = sale del dominio por ese nodo)
    let out = 0, inn = 0;
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const k = j * Nx + i;
      if (type[k] <= NODE.VERTEX) continue;
      let q = 0;
      const nb = [[i - 1, j, p.dx, wY(j)], [i + 1, j, p.dx, wY(j)], [i, j - 1, p.dy, wX(i)], [i, j + 1, p.dy, wX(i)]];
      for (const [ii, jj, d, w] of nb) {
        if (ii < 0 || ii >= Nx || jj < 0 || jj >= Ny) continue;
        const kk = jj * Nx + ii;
        if (type[kk] > NODE.VERTEX) continue; // entre dos Dirichlet no se cuenta
        q += p.T * (h[kk] - h[k]) / d * w;
      }
      if (q > 0) out += q; else inn += -q;
    }
    const totalIn = source + inn;
    const err = totalIn > 0 ? Math.abs(totalIn - out) / totalIn * 100 : 0;
    return { source, inflowBoundary: inn, outflowBoundary: out, totalIn, errorPct: err };
  }

  /** Un paso FTCS en un nodo aislado (calculadora "a mano" de la Sesión 3). */
  function ftcsNode(c) {
    const rx = c.D * c.dt / (c.dx * c.dx), ry = c.D * c.dt / (c.dy * c.dy);
    const val = c.hC + rx * (c.hE - 2 * c.hC + c.hW) + ry * (c.hN - 2 * c.hC + c.hS) + c.dt * (c.Qs || 0) / c.S;
    return { rx, ry, value: val };
  }

  /** Solución analítica 1D del estado estacionario cuando existe (verificación). */
  function analyticSteady(m) {
    const p = m.p, bc = p.bc;
    const hasPoint = (p.sources || []).some((s) => s.enabled && s.type === 'point');
    const lineSrc = (p.sources || []).filter((s) => s.enabled && s.type === 'line');
    const yNeumann = !isDir(bc.south) && !isDir(bc.north);
    if (!yNeumann || hasPoint || (p.drain && p.drain.enabled)) return null;
    if (lineSrc.some((s) => s.lining && s.lining.enabled)) return null;
    // Laplace entre dos Dirichlet: lineal
    if (isDir(bc.west) && isDir(bc.east) && lineSrc.length === 0) {
      const a = bcFinal(bc.west), b = bcFinal(bc.east);
      return { label: 'h(x) = h_W + (h_E − h_W)·x/L (Laplace 1D)', fn: (x) => a + (b - a) * x / p.Lx };
    }
    // Fuente lineal con oeste Neumann y este Dirichlet
    if (!isDir(bc.west) && isDir(bc.east) && lineSrc.length === 1) {
      const s = lineSrc[0], hE = bcFinal(bc.east), xc = m.sourceInfo[0].x, q = s.q;
      return {
        label: 'h(x) = h_E + (q_inf/T)(L − max(x, x_c)) (Poisson 1D)',
        fn: (x) => hE + q / p.T * (p.Lx - Math.max(x, xc)),
      };
    }
    return null;
  }

  const api = { NODE, buildModel, dtMax, spectral, runFTCS, solveSteady, residual, massBalance,
    ftcsNode, analyticSteady, bcValue, bcFinal, isDir, thetaFor };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Solver = api;
})(typeof window !== 'undefined' ? window : globalThis);
