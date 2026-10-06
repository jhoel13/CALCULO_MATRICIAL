/* Formato numérico en convención peruana/española: coma decimal, espacio de miles. */
(function (root) {
  'use strict';

  function group(intStr, sep) {
    return intStr.replace(/\B(?=(\d{3})+(?!\d))/g, sep);
  }

  /** Número con d decimales: 2500 → "2 500", 0.12 → "0,12". */
  function fmt(v, d = 3, sep = ' ') {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    if (!isFinite(v)) return v > 0 ? '∞' : '−∞';
    const neg = v < 0;
    let s = Math.abs(v).toFixed(d);
    let [i, f] = s.split('.');
    if (i.length > 4) i = group(i, sep);
    s = f ? `${i},${f}` : i;
    return (neg ? '−' : '') + s;
  }

  /** Recorta ceros sobrantes: fmtg(0.1200, 4) → "0,12". */
  function fmtg(v, d = 4, sep = ' ') {
    if (v === null || v === undefined || Number.isNaN(v)) return '—';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) return sci(v, 3);
    let s = fmt(v, d, sep);
    if (s.includes(',')) s = s.replace(/0+$/, '').replace(/,$/, '');
    return s;
  }

  const SUP = { '-': '⁻', 0: '⁰', 1: '¹', 2: '²', 3: '³', 4: '⁴', 5: '⁵', 6: '⁶', 7: '⁷', 8: '⁸', 9: '⁹' };
  /** Notación científica en texto: 1,8 × 10⁻⁴. */
  function sci(v, d = 2) {
    if (v === 0) return '0';
    const e = Math.floor(Math.log10(Math.abs(v)));
    let mant = v / Math.pow(10, e);
    let s = fmt(mant, d).replace(/,?0+$/, '');
    const es = String(e).split('').map((c) => SUP[c]).join('');
    return e === 0 ? s : `${s} × 10${es}`;
  }

  /** Versión TeX de fmtg: coma como {,} y notación científica con \times 10^{e}. */
  function tex(v, d = 4) {
    if (v === null || v === undefined || Number.isNaN(v)) return '\\text{—}';
    const a = Math.abs(v);
    if (a !== 0 && (a < 1e-3 || a >= 1e6)) {
      const e = Math.floor(Math.log10(a));
      let mant = (v / Math.pow(10, e)).toFixed(3).replace(/\.?0+$/, '').replace('.', '{,}');
      if (mant.startsWith('-')) mant = '-' + mant.slice(1);
      return `${mant}\\times 10^{${e}}`;
    }
    return fmtg(v, d, '~').replace(',', '{,}').replace(/~/g, '\\,').replace('−', '-');
  }

  /** Tiempo legible: días y, si corresponde, años. */
  function days(t) {
    if (t === null || t === undefined) return '—';
    if (t >= 365) return `${fmt(t, 0)} días (${fmt(t / 365, 2)} años)`;
    if (t < 1) return `${fmt(t, 4)} días (${fmt(t * 1440, 1)} min)`;
    return `${fmt(t, 1)} días`;
  }

  /** Escapa texto para HTML. */
  function esc(s) {
    return String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  }

  const api = { fmt, fmtg, sci, tex, days, esc };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.F = api;
})(typeof window !== 'undefined' ? window : globalThis);
