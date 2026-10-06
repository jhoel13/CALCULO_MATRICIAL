/*
 * Motor del simulador interactivo — acuífero libre aproximado como confinado (T = K·b constante).
 *   S ∂h/∂t = T ∇²h + Qs(x,y,t)
 * Elementos: casa, canal, pozo, poza, dren (sólo capta), río (nivel variable), fosa, más lluvia global.
 * Malla cuadrada Δx = Δy. Indexación h[j*Nx + i]. Navegador (window.SimEngine) y Node (module.exports).
 */
(function (root) {
  'use strict';

  const SOILS = {
    grava: { name: 'Grava', K: 300, S: 0.25 },
    arenaGruesa: { name: 'Arena gruesa', K: 40, S: 0.27 },
    arenaFina: { name: 'Arena fina', K: 8, S: 0.22 },
    arenaLimosa: { name: 'Arena limosa', K: 2, S: 0.15 },
    limo: { name: 'Limo', K: 0.3, S: 0.08 },
    arcilla: { name: 'Arcilla', K: 0.01, S: 0.03 },
  };

  const DAY_SEASON = (t) => { const d = ((t % 365) + 365) % 365; return d >= 273 || d < 120; }; // oct–abr (≈ 212 días)
  const SEASON_DAYS = 212;

  /** Nivel de un río en el tiempo: base + hidrograma triangular de crecida. */
  function riverStage(el, h0, t) {
    let h = h0 + (el.dh || 0);
    const f = el.flood;
    if (f && f.on) {
      const t0 = f.tStart, tp = f.tStart + f.rise, te = tp + f.fall;
      if (t > t0 && t <= tp) h += f.peak * (t - t0) / f.rise;
      else if (t > tp && t < te) h += f.peak * (1 - (t - tp) / f.fall);
    }
    return h;
  }
  const active = (el, t) => t >= (el.t1 || 0) && t < (el.t2 == null || el.t2 === '' ? Infinity : el.t2);

  /** Geometría base de la malla. */
  function validate(cfg) {
    if (![cfg.K, cfg.S, cfg.b, cfg.dx, cfg.Lx, cfg.Ly, cfg.tEnd, cfg.depth0].every(Number.isFinite) || !(cfg.K > 0 && cfg.S > 0 && cfg.S <= 1 && cfg.b > 0 && cfg.dx > 0 && cfg.Lx >= 4 * cfg.dx && cfg.Ly >= 4 * cfg.dx && cfg.tEnd > 0 && cfg.depth0 >= 0)) throw new Error('Parámetros inválidos: K, b, Δx y horizonte positivos; 0 < S ≤ 1; mínimo 5 nodos por lado.');
    if ((Math.round(cfg.Lx / cfg.dx) + 1) * (Math.round(cfg.Ly / cfg.dx) + 1) > 40000) throw new Error('Máximo 40 000 nodos. Aumente Δx.');
    if (!cfg.bc || !['west','east','south','north'].every(k => ['fijo','impermeable'].includes(cfg.bc[k]))) throw new Error('Bordes inválidos.');
    if (!Array.isArray(cfg.elements)) throw new Error('Faltan los elementos.');
    for (const el of cfg.elements) {
      if (!['casa','canal','pozo','poza','dren','rio','fosa'].includes(el.type) || typeof el.id !== 'string') throw new Error('Tipo o identificador de elemento inválido.');
      for (const k of ['x','y','x1','y1','x2','y2','Q','q','depth','inf','cim','t1']) if (el[k] !== undefined && !Number.isFinite(el[k])) throw new Error('Propiedad numérica inválida: ' + k);
      const coordinates = ['casa','pozo'].includes(el.type) ? ['x','y'] : ['x1','y1','x2','y2'];
      if (!coordinates.every(k => Number.isFinite(el[k]) && el[k] >= 0 && el[k] <= (k.startsWith('x') ? cfg.Lx : cfg.Ly))) throw new Error('El elemento debe quedar dentro del dominio.');
      for (const k of ['q','depth','inf','cim']) if (el[k] !== undefined && el[k] < 0) throw new Error('Profundidades e infiltración no pueden ser negativas.');
      if (el.type === 'rio' && (!Number.isFinite(el.dh || 0) || cfg.b + (el.dh || 0) < 0)) throw new Error('Nivel del río inválido o bajo la base del acuífero.');
      if (el.flood?.on && !(el.flood.rise > 0 && el.flood.fall > 0 && Number.isFinite(el.flood.peak) && Number.isFinite(el.flood.tStart))) throw new Error('La crecida necesita subida y bajada positivas.');
    }
    if (new Set(cfg.elements.map(e=>e.id)).size !== cfg.elements.length) throw new Error('Los identificadores de elementos deben ser únicos.');
    if (cfg.model !== undefined && !['linear','unconfined'].includes(cfg.model)) throw new Error('Modelo físico inválido.');
    if (cfg.rain && (!(cfg.rain.R >= 0) || !Number.isFinite(cfg.rain.R))) throw new Error('Recarga inválida.');
    return cfg;
  }

  function grid(cfg) {
    validate(cfg);
    const dx = cfg.dx;
    const Nx = Math.round(cfg.Lx / dx) + 1, Ny = Math.round(cfg.Ly / dx) + 1, N = Nx * Ny;
    const hx = cfg.Lx / (Nx - 1), hy = cfg.Ly / (Ny - 1);
    const T = cfg.K * cfg.b, S = cfg.S, D = T / S;
    const h0 = cfg.b, zg = cfg.b + cfg.depth0;
    const dtmax = S / (2 * T * (1 / hx ** 2 + 1 / hy ** 2));
    const iw = new Int32Array(N), ie = new Int32Array(N), js = new Int32Array(N), jn = new Int32Array(N);
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const k = j * Nx + i;
      iw[k] = j * Nx + (i > 0 ? i - 1 : 1); ie[k] = j * Nx + (i < Nx - 1 ? i + 1 : Nx - 2);
      js[k] = (j > 0 ? j - 1 : 1) * Nx + i; jn[k] = (j < Ny - 1 ? j + 1 : Ny - 2) * Nx + i;
    }
    const edge = new Uint8Array(N);
    const side = { west: (i) => i === 0, east: (i) => i === Nx - 1 };
    for (let j = 0; j < Ny; j++) for (let i = 0; i < Nx; i++) {
      const k = j * Nx + i;
      if ((i === 0 && cfg.bc.west === 'fijo') || (i === Nx - 1 && cfg.bc.east === 'fijo') ||
          (j === 0 && cfg.bc.south === 'fijo') || (j === Ny - 1 && cfg.bc.north === 'fijo')) edge[k] = 1;
    }
    void side;
    const x = Float64Array.from({ length: Nx }, (_, i) => i * hx);
    const y = Float64Array.from({ length: Ny }, (_, j) => j * hy);
    return { cfg, dx, hx, hy, Nx, Ny, N, T, S, D, h0, zg, dtmax, dt: 0.9 * dtmax, iw, ie, js, jn, edge, x, y };
  }

  const clampI = (v, n) => Math.max(0, Math.min(n - 1, v));
  const nodeOf = (g, x, y) => clampI(Math.round(y / g.hy), g.Ny) * g.Nx + clampI(Math.round(x / g.hx), g.Nx);

  /** Nodos tocados por un segmento, con la longitud de segmento asignada a cada uno. */
  function segNodes(g, x1, y1, x2, y2) {
    const L = Math.hypot(x2 - x1, y2 - y1);
    const map = new Map();
    if (L < 1e-9) { map.set(nodeOf(g, x1, y1), 0); return { map, L }; }
    const n = Math.max(2, Math.ceil(L / (g.dx / 8)));
    const ds = L / n;
    for (let q = 0; q < n; q++) {
      const f = (q + 0.5) / n;
      const k = nodeOf(g, x1 + f * (x2 - x1), y1 + f * (y2 - y1));
      map.set(k, (map.get(k) || 0) + ds);
    }
    return { map, L };
  }
  function rectNodes(g, x1, y1, x2, y2) {
    const xa = Math.min(x1, x2), xb = Math.max(x1, x2), ya = Math.min(y1, y2), yb = Math.max(y1, y2);
    const out = [];
    for (let j = 0; j < g.Ny; j++) for (let i = 0; i < g.Nx; i++) {
      const X = g.x[i], Y = g.y[j];
      if (X >= xa - 1e-9 && X <= xb + 1e-9 && Y >= ya - 1e-9 && Y <= yb + 1e-9) out.push(j * g.Nx + i);
    }
    if (!out.length) out.push(nodeOf(g, (xa + xb) / 2, (ya + yb) / 2));
    return out;
  }

  /** Precalcula nodos de cada elemento. */
  function layout(g, elements) {
    const L = { canal: [], pozo: [], poza: [], dren: [], rio: [], casa: [], fosa: [] };
    for (const el of elements) {
      if (!L[el.type]) continue;
      if (el.type === 'canal' || el.type === 'dren' || el.type === 'rio') L[el.type].push({ el, ...segNodes(g, el.x1, el.y1, el.x2, el.y2) });
      else if (el.type === 'poza' || el.type === 'fosa') L[el.type].push({ el, nodes: rectNodes(g, el.x1, el.y1, el.x2, el.y2), areas: rectAreas(g, el) });
      else L[el.type].push({ el, k: nodeOf(g, el.x, el.y) });
    }
    // máscara de nodos fijos (bordes + ríos) y de drenes
    const fixed = Uint8Array.from(g.edge);
    const riverOf = new Int32Array(g.N).fill(-1);
    L.rio.forEach((r, idx) => { for (const k of r.map.keys()) { fixed[k] = 1; riverOf[k] = idx; } });
    const drainH = new Float64Array(g.N).fill(NaN);
    for (const d of L.dren) for (const k of d.map.keys()) if (!fixed[k]) drainH[k] = g.zg - d.el.depth;
    const free = [];
    for (let k = 0; k < g.N; k++) if (!fixed[k]) free.push(k);
    const drains = [];
    for (let k = 0; k < g.N; k++) if (!Number.isNaN(drainH[k])) drains.push(k);
    return { L, fixed, riverOf, drainH, free: Int32Array.from(free), drains: Int32Array.from(drains) };
  }

  /** Término fuente Qs [m/día] en el instante t (o promedio de largo plazo si mean = true). */
  /** Área de la celda de control del nodo k (media celda en bordes, cuarto en vértices). */
  function cellArea(g, k) {
    const i = k % g.Nx, j = (k - i) / g.Nx;
    return g.hx * g.hy * (i === 0 || i === g.Nx - 1 ? 0.5 : 1) * (j === 0 || j === g.Ny - 1 ? 0.5 : 1);
  }

  function sources(g, lay, cfg, t, mean) {
    const Qs = new Float64Array(g.N);
    const A = (k) => cellArea(g, k);
    const R = (cfg.rain && cfg.rain.R) ? cfg.rain.R / 1000 / 365 : 0; // m/día promedio anual
    let rain = R;
    if (cfg.rain && cfg.rain.seasonal && !mean) rain = DAY_SEASON(t) ? R * 365 / SEASON_DAYS : 0;
    if (rain) for (let k = 0; k < g.N; k++) Qs[k] += rain;
    const on = (el) => (mean ? active(el, cfg.tEnd) : active(el, t));
    for (const c of lay.L.canal) {
      if (!on(c.el)) continue;
      const q = c.el.q * (c.el.lined ? 1 - c.el.eff / 100 : 1);
      for (const [k, len] of c.map) Qs[k] += q * len / A(k);
    }
    for (const p of lay.L.poza) {
      if (!on(p.el)) continue;
      const r = p.el.inf * (p.el.membrane ? 0.01 : 1);
      for (const [k, area] of p.areas) Qs[k] += r * area / A(k);
    }
    for (const w of lay.L.pozo) if (on(w.el) && w.el.Q) Qs[w.k] -= w.el.Q / A(w.k);
    return Qs;
  }
  function signature(lay, cfg, t) {
    let s = cfg.rain && cfg.rain.seasonal ? (DAY_SEASON(t) ? 'L' : 'S') : '';
    for (const k of ['canal', 'poza', 'pozo']) for (const e of lay.L[k]) s += active(e.el, t) ? '1' : '0';
    return s;
  }

  /** Interpolación bilineal del campo en (x, y). */
  function interp(g, h, x, y) {
    const fx = Math.max(0, Math.min(g.Nx - 1.000001, x / g.hx)), fy = Math.max(0, Math.min(g.Ny - 1.000001, y / g.hy));
    const i = Math.floor(fx), j = Math.floor(fy), a = fx - i, b = fy - j;
    const k = j * g.Nx + i;
    return (1 - a) * (1 - b) * h[k] + a * (1 - b) * h[k + 1] + (1 - a) * b * h[k + g.Nx] + a * b * h[k + g.Nx + 1];
  }

  function rectAreas(g, el) {
    const out = new Map(), xa = Math.max(0, Math.min(el.x1, el.x2)), xb = Math.min(g.cfg.Lx, Math.max(el.x1, el.x2));
    const ya = Math.max(0, Math.min(el.y1, el.y2)), yb = Math.min(g.cfg.Ly, Math.max(el.y1, el.y2));
    for (let j = 0; j < g.Ny; j++) for (let i = 0; i < g.Nx; i++) {
      const wx = Math.max(0, Math.min(xb, g.x[i] + g.hx / 2) - Math.max(xa, g.x[i] - g.hx / 2));
      const wy = Math.max(0, Math.min(yb, g.y[j] + g.hy / 2) - Math.max(ya, g.y[j] - g.hy / 2));
      if (wx * wy > 0) out.set(j * g.Nx + i, wx * wy);
    }
    return out;
  }
  const faceT = (g, a, b) => g.cfg.model === 'unconfined' ? g.cfg.K * (Math.max(0, a) + Math.max(0, b)) / 2 : g.T;
  function diffusion(g, h, k) {
    const v = h[k];
    return (faceT(g, v, h[g.iw[k]]) * (h[g.iw[k]] - v) + faceT(g, v, h[g.ie[k]]) * (h[g.ie[k]] - v)) / g.hx ** 2 +
      (faceT(g, v, h[g.js[k]]) * (h[g.js[k]] - v) + faceT(g, v, h[g.jn[k]]) * (h[g.jn[k]] - v)) / g.hy ** 2;
  }
  function stableDt(g, h) {
    if (g.cfg.model !== 'unconfined') return g.dt;
    let mx = g.zg;
    for (const v of h) mx = Math.max(mx, v);
    for (const el of g.cfg.elements) if (el.type === 'rio') mx = Math.max(mx, g.h0 + (el.dh || 0) + (el.flood?.on ? el.flood.peak : 0));
    return .9 * g.S / (2 * g.cfg.K * Math.max(mx, .001) * (1 / g.hx ** 2 + 1 / g.hy ** 2));
  }
  function nextEvent(cfg, t) {
    let next = Infinity;
    const consider = (v) => { if (Number.isFinite(v) && v > t) next = Math.min(next, v); };
    for (const el of cfg.elements) { consider(el.t1); consider(el.t2); if (el.flood?.on) { const f = el.flood; consider(f.tStart); consider(f.tStart + f.rise); consider(f.tStart + f.rise + f.fall); } }
    if (cfg.rain?.seasonal) { const yr = Math.floor(t / 365); for (let y = yr; y <= yr + 1; y++) { consider(y * 365 + 120); consider(y * 365 + 273); } }
    return next;
  }
  /** Darcy specific discharge in m/day; arrows show direction, not travel time. */
  function flow(g, h, x, y) {
    const xa = Math.max(0, x - g.hx / 2), xb = Math.min(g.cfg.Lx, x + g.hx / 2);
    const ya = Math.max(0, y - g.hy / 2), yb = Math.min(g.cfg.Ly, y + g.hy / 2);
    return { x: -g.cfg.K * (interp(g, h, xb, y) - interp(g, h, xa, y)) / Math.max(1e-12, xb - xa),
      y: -g.cfg.K * (interp(g, h, x, yb) - interp(g, h, x, ya)) / Math.max(1e-12, yb - ya) };
  }

  /* ================================================================== */
  /* Simulación transitoria                                              */
  /* ================================================================== */
  class Sim {
    constructor(cfg) { this.setConfig(cfg, true); }

    setConfig(cfg, hard) {
      const same = this.g && this.g.Nx === Math.round(cfg.Lx / cfg.dx) + 1 && this.g.Ny === Math.round(cfg.Ly / cfg.dx) + 1 && this.g.dx === cfg.dx;
      validate(cfg);
      this.cfg = cfg;
      const keepH = !hard && same && this.h;
      const oldH = keepH ? this.h : null, oldT = keepH ? this.t : 0;
      this.g = grid(cfg);
      this.lay = layout(this.g, cfg.elements);
      if (keepH) { this.h = oldH; this.hn = new Float64Array(this.g.N); this.t = oldT; this.sig = null; this.initMonitors(false); }
      else this.reset();
    }

    reset() {
      const g = this.g;
      this.h = new Float64Array(g.N).fill(g.h0);
      this.hn = new Float64Array(g.N);
      this.h0 = Float64Array.from(this.h);
      this.t = 0; this.n = 0; this.sig = null;
      this.budget = { recharge: 0, pumping: 0, boundary: 0, drain: 0, seep: 0, unmet: 0, storage: 0, residual: 0 };
      this.lastDt = 0; this.drainQ = 0; this.seepQ = 0;
      this.events = [];
      this.series = { t: [] };
      this.nextRec = 0;
      this.initMonitors(true);
      this.applyFixed(0);
      this.h0 = Float64Array.from(this.h);
      this.checkMonitors();
      this.record(true);
    }

    initMonitors(fresh) {
      const g = this.g, L = this.lay.L;
      const prev = (!fresh && this.mon) || { casa: {}, pozo: {}, fosa: {} };
      const nT = fresh ? 0 : this.series.t.length;
      // geometría y umbrales se recalculan siempre; la historia se conserva si el elemento ya existía
      const mk = (store, el, geo, hist) => Object.assign({ el }, prev[store][el.id] ? pick(prev[store][el.id]) : hist, geo);
      const pick = (o) => { const c = Object.assign({}, o); delete c.el; return c; };
      const pad = () => new Array(nT).fill(null);
      this.mon = { casa: {}, pozo: {}, fosa: {} };
      for (const c of L.casa) this.mon.casa[c.el.id] = mk('casa', c.el, { hCrit: g.zg - c.el.cim }, { maxH: -Infinity, tMax: 0, state: 'ok', tAlert: null, tHit: null, tFlood: null, series: pad() });
      for (const w of L.pozo) this.mon.pozo[w.el.id] = mk('pozo', w.el, { k: w.k }, { sMax: 0, tSmax: 0, tLimit: null, tDry: null, series: pad() });
      for (const f of L.fosa) this.mon.fosa[f.el.id] = mk('fosa', f.el, { nodes: f.nodes, target: g.zg - f.el.depth - (f.el.margin ?? 0.5) }, { tDry: null, dryNow: false, series: pad() });
      if (fresh) this.series = { t: [] };
    }

    applyFixed(t) {
      const g = this.g, lay = this.lay, h = this.h;
      for (let k = 0; k < g.N; k++) {
        if (!lay.fixed[k]) continue;
        h[k] = lay.riverOf[k] >= 0 ? riverStage(lay.L.rio[lay.riverOf[k]].el, g.h0, t) : g.h0;
      }
    }

    refreshSources() {
      const s = signature(this.lay, this.cfg, this.t);
      if (s !== this.sig) { this.sig = s; this.Qs = sources(this.g, this.lay, this.cfg, this.t, false); return true; }
      return false;
    }

    /** Explicit conservative fluxes; split steps at source and seasonal events. */
    step(count, until = this.cfg.tEnd) {
      const g = this.g, lay = this.lay, end = Math.min(until, this.cfg.tEnd);
      for (let n = 0; n < count; n++) {
        if (this.t >= end) return this.t < this.cfg.tEnd;
        this.refreshSources();
        const h = this.h, hn = this.hn, old = this.h0;
        let dt = Math.min(stableDt(g, h), end - this.t, nextEvent(this.cfg, this.t) - this.t);
        if (!(dt > 0)) throw new Error('Paso de tiempo inválido.');
        const budget = this.budget;
        let fixedNet = 0, fixedDelta = 0, drains = 0, seep = 0;
        for (let q = 0; q < g.N; q++) {
          const area = cellArea(g, q), src = this.Qs[q];
          if (src >= 0) budget.recharge += src * area * dt;
          else budget.pumping -= src * area * dt;
          const rate = diffusion(g, h, q) + src;
          if (lay.fixed[q]) { fixedNet += rate * area * dt; hn[q] = h[q]; continue; }
          let v = h[q] + dt / g.S * rate;
          // A dry cell cannot supply the requested abstraction. Account for the shortfall.
          if (v < 0) { budget.unmet += -v * g.S * area; v = 0; }
          const hd = Math.max(0, lay.drainH[q]);
          if (!Number.isNaN(hd) && v > hd) { drains += (v - hd) * g.S * area; v = hd; }
          if (this.cfg.seepage !== false && v > g.zg) { seep += (v - g.zg) * g.S * area; v = g.zg; }
          hn[q] = v;
        }
        this.t = Math.min(end, this.t + dt); this.n++; this.lastDt = dt;
        this.h = hn; this.hn = h;
        this.applyFixed(this.t);
        let storage = 0;
        for (let q = 0; q < g.N; q++) {
          const aS = g.S * cellArea(g, q);
          storage += (hn[q] - old[q]) * aS;
          if (lay.fixed[q]) fixedDelta += (hn[q] - h[q]) * aS;
        }
        budget.boundary += fixedDelta - fixedNet;
        budget.drain += drains; budget.seep += seep; budget.storage = storage;
        budget.residual = storage - (budget.recharge - budget.pumping + budget.unmet + budget.boundary - budget.drain - budget.seep);
        this.drainQ = drains / dt; this.seepQ = seep / dt;
        this.checkMonitors();
        if (this.t >= this.nextRec) this.record(false);
      }
      return this.t < this.cfg.tEnd;
    }

    /** Avanza hasta el horizonte sin animación. */
    runToEnd() { while (this.step(500)); this.record(true); return this; }

    checkMonitors() {
      const g = this.g, h = this.h, t = this.t;
      for (const id in this.mon.casa) {
        const m = this.mon.casa[id];
        const v = interp(g, h, m.el.x, m.el.y);
        m.h = v;
        if (v > m.maxH) { m.maxH = v; m.tMax = t; }
        const depth = g.zg - v;
        let st = 'ok';
        if (depth <= 0.01) st = 'inundada'; else if (v >= m.hCrit) st = 'afectada'; else if (v >= m.hCrit - 0.5) st = 'alerta';
        if (st !== 'ok' && m.tAlert === null) { m.tAlert = t; this.log(t, 'alerta', `${m.el.name}: el nivel freático está a menos de 0,5 m de la cimentación.`); }
        if ((st === 'afectada' || st === 'inundada') && m.tHit === null) { m.tHit = t; this.log(t, 'afectada', `${m.el.name}: el agua alcanza la cimentación (${fmt(m.el.cim)} m bajo el terreno).`); }
        if (st === 'inundada' && m.tFlood === null) { m.tFlood = t; this.log(t, 'inundada', `${m.el.name}: el agua aflora en la superficie.`); }
        m.state = st;
      }
      for (const id in this.mon.pozo) {
        const m = this.mon.pozo[id];
        const v = h[m.k];
        const s = g.h0 - v;
        m.h = v; m.s = s;
        if (s > m.sMax) { m.sMax = s; m.tSmax = t; }
        if (m.el.limit && s >= m.el.limit && m.tLimit === null) { m.tLimit = t; this.log(t, 'alerta', `${m.el.name}: el abatimiento supera ${fmt(m.el.limit)} m.`); }
        if (v <= g.zg - m.el.depth + 1 && m.tDry === null) { m.tDry = t; this.log(t, 'afectada', `${m.el.name}: el nivel bajó a menos de 1 m del fondo del pozo (pozo seco).`); }
      }
      for (const id in this.mon.fosa) {
        const m = this.mon.fosa[id];
        let mx = -Infinity;
        for (const k of m.nodes) if (h[k] > mx) mx = h[k];
        m.h = mx;
        const dry = mx <= m.target;
        if (dry && m.tDry === null) { m.tDry = t; this.log(t, 'ok', `${m.el.name}: el nivel freático quedó ${fmt(m.el.margin ?? 0.5)} m bajo el fondo. Se puede excavar.`); }
        m.dryNow = dry;
      }
    }

    log(t, kind, text) { this.events.push({ t, kind, text }); }

    record(force) {
      const g = this.g;
      if (!force && this.t < this.nextRec) return;
      this.nextRec = this.t + this.cfg.tEnd / 600;
      if (this.series.t.length && this.series.t[this.series.t.length - 1] === this.t) return;
      this.series.t.push(this.t);
      for (const id in this.mon.casa) { const m = this.mon.casa[id]; m.series.push(m.h ?? interp(g, this.h, m.el.x, m.el.y)); }
      for (const id in this.mon.pozo) { const m = this.mon.pozo[id]; m.series.push(g.h0 - this.h[m.k]); }
      for (const id in this.mon.fosa) { const m = this.mon.fosa[id]; let mx = -Infinity; for (const k of m.nodes) mx = Math.max(mx, this.h[k]); m.series.push(mx); }
      (this.series.drain = this.series.drain || []).push(this.drainQ || 0);
      (this.series.flood = this.series.flood || []).push(floodArea(this.g, this.h));
      (this.series.seep = this.series.seep || []).push(this.seepQ || 0);
      if (this.lay.L.rio.length) (this.series.river = this.series.river || []).push(riverStage(this.lay.L.rio[0].el, g.h0, this.t));
    }
  }

  /** Caudal que capta el conjunto de drenes [m³/día]. */
  function drainFlux(g, lay, h, Qs) {
    let q = 0;
    for (const k of lay.drains) {
      if (h[k] < lay.drainH[k] - 1e-9) continue;
      const net = (diffusion(g, h, k) + Qs[k]) * cellArea(g, k);
      if (net > 0) q += net;
    }
    return q;
  }
  function floodArea(g, h) { let a = 0; for (let k = 0; k < g.N; k++) if (h[k] >= g.zg - 1e-6) a += cellArea(g, k); return a; }

  /* ================================================================== */
  /* Estado estacionario: SOR proyectado (los drenes sólo captan)        */
  /* ================================================================== */
  function steady(cfg, opts = {}) {
    const g = grid(cfg), lay = layout(g, cfg.elements);
    const Qs = opts.Qs || sources(g, lay, cfg, cfg.tEnd, true);
    const hasOutlet = lay.fixed.some((v) => v) || lay.drains.length > 0;
    if (!hasOutlet) return { exists: false, reason: 'El acuífero no tiene ningún borde de nivel fijo, río ni dren: el agua no tiene por dónde entrar o salir y no existe estado estacionario.' };
    const h = new Float64Array(g.N).fill(g.h0);
    for (let k = 0; k < g.N; k++) if (lay.fixed[k]) h[k] = lay.riverOf[k] >= 0 ? g.h0 + (lay.L.rio[lay.riverOf[k]].el.dh || 0) : g.h0;
    // ω a partir del radio espectral con las fronteras exteriores
    const isF = (s) => cfg.bc[s] === 'fijo' || lay.L.rio.length > 0;
    const th = (a, b, n) => (a && b ? Math.PI / n : a || b ? Math.PI / (2 * n) : 0);
    const tx = th(isF('west'), isF('east'), g.Nx - 1), ty = th(isF('south'), isF('north'), g.Ny - 1);
    const rho = (Math.cos(tx) + Math.cos(ty)) / 2;
    const omega = cfg.model === 'unconfined' ? 1 : opts.omega || Math.min(1.97, 2 / (1 + Math.sqrt(Math.max(1e-6, 1 - rho * rho))));
    const cap = cfg.seepage !== false;
    const tol = opts.tol || 1e-7, maxIter = opts.maxIter || 40000;
    const { iw, ie, js, jn } = g;
    let it = 0, change = Infinity;
    while (it < maxIter) {
      change = 0;
      for (let a = 0; a < lay.free.length; a++) {
        const k = lay.free[a];
        const ww = faceT(g, h[k], h[iw[k]]) / g.hx ** 2, we = faceT(g, h[k], h[ie[k]]) / g.hx ** 2;
        const ws = faceT(g, h[k], h[js[k]]) / g.hy ** 2, wn = faceT(g, h[k], h[jn[k]]) / g.hy ** 2;
        const target = (ww * h[iw[k]] + we * h[ie[k]] + ws * h[js[k]] + wn * h[jn[k]] + Qs[k]) / Math.max(1e-30, ww + we + ws + wn);
        let v = Math.max(0, (1 - omega) * h[k] + omega * target);
        const hd = lay.drainH[k];
        if (v > hd) v = Math.max(0, hd); // proyección: el dren no deja subir el nivel sobre su cota
        if (cap && v > g.zg) v = g.zg; // rezume en la superficie del terreno
        const d = Math.abs(v - h[k]);
        if (d > change) change = d;
        h[k] = v;
      }
      it++;
      if (change <= tol) break;
    }
    let seepQ = 0;
    if (cap) for (const k of lay.free) if (h[k] >= g.zg - 1e-9) { const net = (diffusion(g, h, k) + Qs[k]) * cellArea(g, k); if (net > 0) seepQ += net; }
    return { exists: true, h, g, lay, Qs, iterations: it, converged: change <= tol, omega, drainQ: drainFlux(g, lay, h, Qs), seepQ };
  }

  /* ================================================================== */
  /* Soluciones analíticas para verificar                                */
  /* ================================================================== */
  /** Integral exponencial E1(u) = W(u) de Theis. */
  function E1(u) {
    if (u <= 0) return Infinity;
    if (u <= 1) {
      let s = -0.5772156649 - Math.log(u), term = 1;
      for (let n = 1; n < 40; n++) { term *= -u / n; s -= term / n; }
      return s;
    }
    const a1 = 2.334733, a2 = 0.250621, b1 = 3.330657, b2 = 1.681534;
    return Math.exp(-u) / u * (u * u + a1 * u + a2) / (u * u + b1 * u + b2);
  }
  const theis = (Q, T, S, r, t) => (t <= 0 ? 0 : Q / (4 * Math.PI * T) * E1(r * r * S / (4 * T * t)));
  /** Recarga R [m/día] entre dos ríos a nivel h0 separados L: h = h0 + R x (L − x) / (2T). */
  const rainMound = (R, T, L, x) => R * x * (L - x) / (2 * T);

  function fmt(v, d = 2) { return (Math.round(v * 10 ** d) / 10 ** d).toString().replace('.', ','); }

  const api = { validate, flow, diffusion, stableDt, faceT, cellArea, SOILS, grid, layout, sources, Sim, steady, interp, riverStage, active, drainFlux, floodArea, E1, theis, rainMound, nodeOf };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SimEngine = api;
})(typeof window !== 'undefined' ? window : globalThis);

