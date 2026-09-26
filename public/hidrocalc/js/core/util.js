/* HidroCalc — utilidades numéricas, geometría hidráulica y solvers */
(function (global) {
  'use strict';

  const G = 9.81;

  /* ---------- formato de números ---------- */
  function fmt(x, d = 3) {
    if (x === null || x === undefined || Number.isNaN(x)) return '—';
    if (!Number.isFinite(x)) return x > 0 ? '\\infty' : '-\\infty';
    if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax < 1e-3 || ax >= 1e7) {
      const [m, e] = x.toExponential(Math.max(d - 1, 2)).split('e');
      return `${m}\\times10^{${parseInt(e, 10)}}`;
    }
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }
  /* número para sustituir dentro de una expresión: negativos entre paréntesis */
  function n(x, d = 3) {
    const s = fmt(x, d);
    return (x < 0 || s.includes('\\times')) ? `(${s})` : s;
  }
  /* texto plano (sin LaTeX) */
  function fmtPlain(x, d = 3) {
    if (x === null || x === undefined || Number.isNaN(x)) return '—';
    if (!Number.isFinite(x)) return '∞';
    if (x === 0) return '0';
    const ax = Math.abs(x);
    if (ax < 1e-3 || ax >= 1e7) return x.toExponential(Math.max(d - 1, 2));
    let s = x.toFixed(d);
    if (s.includes('.')) s = s.replace(/0+$/, '').replace(/\.$/, '');
    return s;
  }

  const ceilTo = (x, step) => Math.ceil(x / step - 1e-9) * step;
  const floorTo = (x, step) => Math.floor(x / step + 1e-9) * step;
  const roundTo = (x, step) => Math.round(x / step) * step;
  const deg = (r) => r * 180 / Math.PI;
  const rad = (d) => d * Math.PI / 180;
  const clamp = (x, a, b) => Math.min(Math.max(x, a), b);

  /* ---------- solvers ---------- */
  /** bisección: busca raíz de f en [a,b]; expande b si no hay cambio de signo */
  function bisect(f, a, b, tol = 1e-10, maxIt = 300) {
    let fa = f(a), fb = f(b);
    let guard = 0;
    while (fa * fb > 0 && guard < 60) { b *= 2; fb = f(b); guard++; }
    if (fa * fb > 0) return NaN;
    let m = a;
    for (let i = 0; i < maxIt; i++) {
      m = 0.5 * (a + b);
      const fm = f(m);
      if (Math.abs(fm) < tol || (b - a) / 2 < tol) return m;
      if (fa * fm < 0) { b = m; fb = fm; } else { a = m; fa = fm; }
    }
    return m;
  }
  /** Newton-Raphson con derivada numérica y registro de iteraciones */
  function newtonLog(f, x0, tol = 1e-8, maxIt = 50) {
    const log = [];
    let x = x0;
    for (let i = 0; i < maxIt; i++) {
      const fx = f(x);
      const h = Math.max(1e-7, Math.abs(x) * 1e-6);
      const d = (f(x + h) - f(x - h)) / (2 * h);
      const xn = x - fx / d;
      log.push({ i: i + 1, x, fx, xn });
      if (!Number.isFinite(xn)) break;
      if (Math.abs(xn - x) < tol) { x = xn; break; }
      x = xn > 0 ? xn : x / 2;
    }
    return { x, log };
  }
  /** interpolación lineal en tabla [[x,y],...] (x ascendente), con extrapolación en extremos */
  function interp(table, x) {
    if (x <= table[0][0]) {
      const [a, b] = table;
      return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
    }
    for (let i = 0; i < table.length - 1; i++) {
      const [x0, y0] = table[i], [x1, y1] = table[i + 1];
      if (x >= x0 && x <= x1) return y0 + (y1 - y0) * (x - x0) / (x1 - x0);
    }
    const a = table[table.length - 2], b = table[table.length - 1];
    return a[1] + (b[1] - a[1]) * (x - a[0]) / (b[0] - a[0]);
  }
  function interpBracket(table, x) {
    let i = 0;
    while (i < table.length - 2 && x > table[i + 1][0]) i++;
    return [table[i], table[i + 1]];
  }

  /* ---------- geometría de secciones ---------- */
  /** sección trapezoidal general (rectangular z1=z2=0, triangular b=0) */
  function trap(b, z1, z2, y) {
    const A = b * y + 0.5 * (z1 + z2) * y * y;
    const P = b + y * (Math.sqrt(1 + z1 * z1) + Math.sqrt(1 + z2 * z2));
    const T = b + (z1 + z2) * y;
    return { A, P, T, R: A / P, D: A / T };
  }
  /** sección circular de diámetro Dm con tirante y (y ≤ Dm) */
  function circ(Dm, y) {
    const yy = Math.min(Math.max(y, 1e-9), Dm);
    const theta = 2 * Math.acos(1 - 2 * yy / Dm); // ángulo central (rad)
    const A = (Dm * Dm / 8) * (theta - Math.sin(theta));
    const P = Dm * theta / 2;
    const T = Dm * Math.sin(theta / 2);
    return { A, P, T: Math.max(T, 1e-9), R: A / P, D: A / Math.max(T, 1e-9), theta };
  }
  const manningQ = (A, R, S, nn) => (1 / nn) * A * Math.pow(R, 2 / 3) * Math.sqrt(S);

  /** tirante normal para un geom(y) */
  function normalDepth(geom, Q, S, nn, yMax) {
    const f = (y) => { const g = geom(y); return manningQ(g.A, g.R, S, nn) - Q; };
    return bisect(f, 1e-6, yMax || 1, 1e-10);
  }
  /** tirante crítico: Q² T / (g A³) = 1 */
  function criticalDepth(geom, Q, yMax) {
    const f = (y) => { const g = geom(y); return Q * Q * g.T / (G * g.A ** 3) - 1; };
    return bisect(f, yMax ? yMax * 1e-6 : 1e-6, yMax || 1, 1e-10);
  }

  /* ---------- acero de refuerzo ---------- */
  const BARS = [
    { id: '1/4', d: 0.635, A: 0.32 },
    { id: '3/8', d: 0.952, A: 0.71 },
    { id: '1/2', d: 1.27, A: 1.29 },
    { id: '5/8', d: 1.588, A: 2.00 },
    { id: '3/4', d: 1.905, A: 2.84 },
    { id: '7/8', d: 2.222, A: 3.87 },
    { id: '1', d: 2.54, A: 5.10 }
  ];
  const bar = (id) => BARS.find((b) => b.id === id) || BARS[1];

  /** As por flexión (iterativo a = As fy / (0.85 f'c b)), Mu en kg·cm */
  function asFlexion(Mu_kgcm, b, d, fc, fy, phi = 0.9) {
    const it = [];
    let a = d / 5;
    let As = 0;
    for (let i = 0; i < 12; i++) {
      As = Mu_kgcm / (phi * fy * (d - a / 2));
      const an = As * fy / (0.85 * fc * b);
      it.push({ i: i + 1, a, As });
      if (Math.abs(an - a) < 1e-6) { a = an; break; }
      a = an;
    }
    return { As, a, it };
  }
  /** espaciamiento de varillas para As (cm²/m) */
  function spacing(As, barId, smax = 45) {
    const b = bar(barId);
    const s = b.A * 100 / As;
    return { s, sAdopt: Math.min(floorTo(s, 2.5), smax), bar: b };
  }

  global.HC = global.HC || {};
  Object.assign(global.HC, {
    G, fmt, n, fmtPlain, ceilTo, floorTo, roundTo, deg, rad, clamp,
    bisect, newtonLog, interp, interpBracket,
    trap, circ, manningQ, normalDepth, criticalDepth,
    BARS, bar, asFlexion, spacing
  });
})(window);
