/* Módulo: Diseño de canales (Manning) — fuentes: CALCULO DE CANALES.xlsx, DISEÑO DE CANALES ABIERTOS.xls */
(function () {
  'use strict';
  const { G, fmt, n, trap, circ, manningQ, bisect, criticalDepth, svg, Doc, deg } = HC;

  /* ---------- funciones hidráulicas compartidas ---------- */
  function geomFn(shape, p) {
    if (shape === 'circ') return (y) => circ(p.D, y);
    const z1 = shape === 'rect' ? 0 : p.z1, z2 = shape === 'rect' ? 0 : p.z2;
    const b = shape === 'tri' ? 0 : p.b;
    return (y) => trap(b, z1, z2, y);
  }
  function sectionSteps(d, shape, p, y) {
    const g = geomFn(shape, p)(y);
    if (shape === 'circ') {
      d.calc({ sym: '\\theta', f: '2\\arccos\\left(1-\\dfrac{2y}{D}\\right)', sub: `2\\arccos\\left(1-\\dfrac{2(${n(y)})}{${n(p.D)}}\\right)`, val: g.theta, unit: 'rad', d: 4 });
      d.calc({ sym: 'A', f: '\\dfrac{D^2}{8}\\left(\\theta-\\sin\\theta\\right)', sub: `\\dfrac{${n(p.D)}^2}{8}\\left(${n(g.theta, 4)}-\\sin ${n(g.theta, 4)}\\right)`, val: g.A, unit: 'm^2', d: 4 });
      d.calc({ sym: 'P', f: '\\dfrac{\\theta\\,D}{2}', sub: `\\dfrac{${n(g.theta, 4)}(${n(p.D)})}{2}`, val: g.P, unit: 'm', d: 4 });
      d.calc({ sym: 'T', f: 'D\\sin\\dfrac{\\theta}{2}', sub: `${n(p.D)}\\sin\\dfrac{${n(g.theta, 4)}}{2}`, val: g.T, unit: 'm', d: 4 });
    } else {
      const b = shape === 'tri' ? 0 : p.b, z1 = shape === 'rect' ? 0 : p.z1, z2 = shape === 'rect' ? 0 : p.z2;
      d.calc({ sym: 'A', f: 'b\\,y+\\tfrac{1}{2}(z_1+z_2)\\,y^2', sub: `${n(b)}(${n(y)})+\\tfrac{1}{2}(${n(z1)}+${n(z2)})(${n(y)})^2`, val: g.A, unit: 'm^2', d: 4 });
      d.calc({ sym: 'P', f: 'b+y\\left(\\sqrt{1+z_1^2}+\\sqrt{1+z_2^2}\\right)', sub: `${n(b)}+${n(y)}\\left(\\sqrt{1+${n(z1)}^2}+\\sqrt{1+${n(z2)}^2}\\right)`, val: g.P, unit: 'm', d: 4 });
      d.calc({ sym: 'T', f: 'b+(z_1+z_2)\\,y', sub: `${n(b)}+(${n(z1)}+${n(z2)})(${n(y)})`, val: g.T, unit: 'm', d: 4 });
    }
    d.calc({ sym: 'R', f: '\\dfrac{A}{P}', sub: `\\dfrac{${n(g.A, 4)}}{${n(g.P, 4)}}`, val: g.R, unit: 'm', d: 4 });
    d.calc({ sym: 'D_h', f: '\\dfrac{A}{T}', sub: `\\dfrac{${n(g.A, 4)}}{${n(g.T, 4)}}`, val: g.D, unit: 'm', d: 4 });
    return g;
  }
  function regime(F) {
    if (Math.abs(F - 1) < 0.02) return 'Crítico';
    return F < 1 ? 'Subcrítico' : 'Supercrítico';
  }

  /** dibujo de sección transversal */
  function drawSection(o) {
    const W = 560, Hh = 300;
    const { shape } = o;
    let body = '';
    if (shape === 'circ') {
      const D = o.D, y = o.y;
      const S = svg.scaler(-D * 0.75, D * 0.75, -0.25 * D, D * 1.2, W, Hh, 36);
      const cx = S.X(0), cy = S.Y(D / 2), r = D / 2 * S.s;
      const th = 2 * Math.acos(1 - 2 * y / D);
      const yw = S.Y(y);
      const half = D / 2 * Math.sin(th / 2) * S.s;
      const large = th > Math.PI ? 1 : 0;
      body += `<circle cx="${cx}" cy="${cy}" r="${r + 9}" class="sv-concrete"/><circle cx="${cx}" cy="${cy}" r="${r}" fill="var(--surface)" class="sv-line"/>`;
      body += `<path class="sv-water" d="M ${cx - half} ${yw} A ${r} ${r} 0 ${large} 0 ${cx + half} ${yw} Z"/>`;
      body += svg.line(cx - half, yw, cx + half, yw, 'sv-wsurf');
      body += svg.dim(cx + r + 16, S.Y(0), cx + r + 16, yw, `y = ${fmt(y)} m`, 22);
      body += svg.dim(cx - r, S.Y(0) + 18, cx + r, S.Y(0) + 18, `D = ${fmt(D)} m`, 10);
      body += svg.dim(cx - half, yw - 8, cx + half, yw - 8, `T = ${fmt(o.T)} m`, -12);
      return svg.frame(W, Hh, body, 'Sección circular');
    }
    const b = shape === 'tri' ? 0 : o.b, z1 = shape === 'rect' ? 0 : o.z1, z2 = shape === 'rect' ? 0 : o.z2;
    const H = o.H, y = o.y, e = Math.max(0.08, 0.1 * H);
    const xl = -z1 * H, xr = b + z2 * H;
    const S = svg.scaler(xl - e - 0.25 * H, xr + e + 0.45 * H, -e - 0.2 * H, H + 0.3 * H, W, Hh, 34);
    const P = (x, yy) => [S.X(x), S.Y(yy)];
    // revestimiento
    body += svg.poly([P(xl - e, H), P(xl, H), P(0, 0), P(b, 0), P(xr, H), P(xr + e, H), P(b + e * 0.6, -e), P(-e * 0.6, -e)], 'sv-concrete');
    body += svg.poly([P(-z1 * y, y), P(0, 0), P(b, 0), P(b + z2 * y, y)], 'sv-water');
    body += svg.line(...P(-z1 * y, y), ...P(b + z2 * y, y), 'sv-wsurf');
    body += `<path d="M ${S.X(b / 2) - 6} ${S.Y(y) - 9} l6 8 l6 -8 z" fill="var(--accent-2)"/>`;
    body += svg.dim(...P(0, 0), ...P(b, 0), `b = ${fmt(b)} m`, 20);
    body += svg.dim(...P(xr + e, 0), ...P(xr + e, y), `y = ${fmt(y)} m`, 24);
    body += svg.dim(...P(xr + e, 0), ...P(xr + e, H), `H = ${fmt(H)} m`, 62);
    body += svg.dim(...P(-z1 * y, y), ...P(b + z2 * y, y), `T = ${fmt(o.T)} m`, -16);
    if (z1 > 0) body += svg.txt(S.X(-z1 * H * 0.55) - 16, S.Y(H * 0.55), `1:${fmt(z1, 2)}`, 'sv-small');
    if (z2 > 0) body += svg.txt(S.X(b + z2 * H * 0.55) + 16, S.Y(H * 0.55), `1:${fmt(z2, 2)}`, 'sv-small');
    body += svg.txt(S.X(b / 2), S.Y(H) - 8, `BL = ${fmt(H - y)} m`, 'sv-small');
    return svg.frame(W, Hh, body, 'Sección del canal');
  }

  function energyCurve(geom, Q, yMax) {
    const pts = [];
    for (let i = 1; i <= 120; i++) {
      const y = yMax * i / 120;
      const g = geom(y);
      pts.push({ x: y + Q * Q / (2 * G * g.A * g.A), y });
    }
    return pts;
  }

  HC.hyd = { geomFn, sectionSteps, regime, drawSection, energyCurve };

  /* ---------- módulo ---------- */
  const SHAPES = [
    { v: 'trap', l: 'Trapezoidal' }, { v: 'rect', l: 'Rectangular' }, { v: 'tri', l: 'Triangular' }, { v: 'circ', l: 'Circular' }
  ];
  const isMode = (m) => (v) => v.modo === m;
  const notCirc = (v) => v.forma !== 'circ';

  HC.register({
    id: 'canales',
    title: 'Diseño de canales (Manning)',
    short: 'Canales · Manning',
    icon: 'canal',
    group: 'conduccion',
    source: 'CALCULO DE CANALES.xlsx · DISEÑO DE CANALES ABIERTOS.xls',
    description: 'Tirante normal y crítico, caudal, sección de máxima eficiencia y diseño por Froude para secciones trapezoidales, rectangulares, triangulares y circulares.',
    tags: ['Manning', 'Froude', 'Energía específica', 'MEH'],
    inputs: [
      {
        title: 'Tipo de cálculo', fields: [
          { id: 'modo', label: 'Cálculo', type: 'select', value: 'tirante', options: [
            { v: 'tirante', l: 'Tirante normal (Q conocido)' },
            { v: 'caudal', l: 'Caudal (y conocido)' },
            { v: 'economico', l: 'Sección de máxima eficiencia (Q)' },
            { v: 'froude', l: 'Diseño por Froude y velocidad' }] },
          { id: 'forma', label: 'Forma de la sección', type: 'select', value: 'trap', options: SHAPES, show: (v) => v.modo !== 'froude' && v.modo !== 'economico' },
          { id: 'formaE', label: 'Sección óptima', type: 'select', value: 'trap', options: SHAPES.slice(0, 3), show: isMode('economico') }
        ]
      },
      {
        title: 'Geometría', fields: [
          { id: 'b', label: 'Ancho de solera', sym: 'b', unit: 'm', value: 0.3, step: 0.05, min: 0, show: (v) => (v.modo === 'tirante' || v.modo === 'caudal') && (v.forma === 'trap' || v.forma === 'rect') },
          { id: 'z1', label: 'Talud izquierdo', sym: 'z_1', unit: 'H:V', value: 1, step: 0.25, min: 0, show: (v) => (v.modo === 'tirante' || v.modo === 'caudal') && (v.forma === 'trap' || v.forma === 'tri'), help: 'Relación horizontal:vertical del talud (0 = vertical).' },
          { id: 'z2', label: 'Talud derecho', sym: 'z_2', unit: 'H:V', value: 1, step: 0.25, min: 0, show: (v) => (v.modo === 'tirante' || v.modo === 'caudal') && (v.forma === 'trap' || v.forma === 'tri') },
          { id: 'D', label: 'Diámetro', sym: 'D', unit: 'm', value: 1.0, step: 0.05, min: 0.05, show: (v) => (v.modo === 'tirante' || v.modo === 'caudal') && v.forma === 'circ' }
        ]
      },
      {
        title: 'Datos hidráulicos', fields: [
          { id: 'Q', label: 'Caudal de diseño', sym: 'Q', unit: 'm^3/s', value: 0.0548, step: 0.01, min: 0, show: (v) => v.modo === 'tirante' || v.modo === 'economico' },
          { id: 'y', label: 'Tirante', sym: 'y', unit: 'm', value: 0.5, step: 0.05, min: 0, show: isMode('caudal') },
          { id: 'V', label: 'Velocidad deseada', sym: 'V', unit: 'm/s', value: 0.5, step: 0.05, show: isMode('froude') },
          { id: 'F', label: 'Número de Froude deseado', sym: 'F', value: 0.3, step: 0.05, show: isMode('froude') },
          { id: 'n', label: 'Rugosidad de Manning', sym: 'n', value: 0.014, step: 0.001, min: 0.005, help: 'Concreto 0.013–0.015, tierra 0.022–0.030, mampostería 0.020.' },
          { id: 'S', label: 'Pendiente longitudinal', sym: 'S', unit: 'm/m', value: 0.005, step: 0.0005, min: 0 }
        ]
      },
      {
        title: 'Borde libre y límites', fields: [
          { id: 'blMode', label: 'Criterio de borde libre', type: 'select', value: 'tercio', options: [{ v: 'tercio', l: 'BL = y/3' }, { v: 'fijo', l: 'BL fijo' }] },
          { id: 'bl', label: 'Borde libre', sym: 'BL', unit: 'm', value: 0.2, step: 0.05, show: (v) => v.blMode === 'fijo' },
          { id: 'vmin', label: 'Velocidad mínima (sedimentación)', sym: 'V_{min}', unit: 'm/s', value: 0.6, step: 0.05 },
          { id: 'vmax', label: 'Velocidad máxima (erosión)', sym: 'V_{max}', unit: 'm/s', value: 3.0, step: 0.1, help: 'Tierra 0.9, mampostería 2.0, concreto 3.0 m/s (hoja «ayuda» del Excel).' }
        ]
      }
    ],
    presets: [
      { name: 'Canal trapezoidal Marcobamba (Q = 54.8 L/s)', values: { modo: 'tirante', forma: 'trap', b: 0.3, z1: 1, z2: 1, Q: 0.0548, n: 0.014, S: 0.005 } },
      { name: 'Canal rectangular b = 6 m, y = 1.5 m (Geometría conocida)', values: { modo: 'caudal', forma: 'rect', b: 6, y: 1.5, n: 0.015, S: 0.0001 } },
      { name: 'Conducto circular D = 10 m, y = 7 m', values: { modo: 'caudal', forma: 'circ', D: 10, y: 7, n: 0.015, S: 0.0005 } },
      { name: 'Sección óptima Q = 10.83 m³/s', values: { modo: 'economico', formaE: 'trap', Q: 10.83, n: 0.012, S: 0.01 } },
      { name: 'Froude y velocidad (V = 1.5 m/s, F = 0.6)', values: { modo: 'froude', V: 1.5, F: 0.6, n: 0.013, S: 0.001 } }
    ],
    compute(v) {
      const d = new Doc();
      const res = [], checks = [], charts = [];
      const { n: nn, S } = v;
      if (!(nn > 0) || !(S > 0)) throw new Error('n y S deben ser mayores que cero.');
      let shape, p, y, Q, geom;

      if (v.modo === 'tirante' || v.modo === 'caudal') {
        shape = v.forma;
        p = { b: v.b, z1: v.z1, z2: v.z2, D: v.D };
        geom = geomFn(shape, p);
        d.h('Datos y ecuación de Manning');
        d.p('El flujo uniforme se describe con la ecuación de Manning (unidades SI):');
        d.eq('Q=\\dfrac{1}{n}\\,A\\,R^{2/3}\\,S^{1/2}', 'Manning');
        if (v.modo === 'tirante') {
          Q = v.Q;
          if (!(Q > 0)) throw new Error('El caudal debe ser mayor que cero.');
          if (shape !== 'circ' && shape !== 'tri' && !(v.b > 0)) throw new Error('El ancho de solera b debe ser mayor que cero.');
          const K = Q * nn / Math.sqrt(S);
          d.p('Se despeja el término geométrico (factor de sección) que debe igualarse:');
          d.calc({ sym: 'A\\,R^{2/3}', f: '\\dfrac{Q\\,n}{\\sqrt{S}}', sub: `\\dfrac{${n(Q, 4)}(${n(nn, 4)})}{\\sqrt{${n(S, 5)}}}`, val: K, d: 5 });
          let yMax = shape === 'circ' ? v.D * 0.938 : 1;
          if (shape === 'circ') {
            const gq = circ(v.D, yMax);
            const Qmax = manningQ(gq.A, gq.R, S, nn);
            if (Q > Qmax) throw new Error(`El conducto no puede transportar Q = ${fmt(Q)} m³/s en lámina libre (Qmáx ≈ ${fmt(Qmax)} m³/s). Aumente D o S.`);
          }
          const fy = (yy) => { const g = geom(yy); return g.A * Math.pow(g.R, 2 / 3) - K; };
          y = shape === 'circ' ? bisect(fy, 1e-6 * v.D, yMax) : bisect(fy, 1e-6, yMax);
          if (!(y > 0)) throw new Error('No se encontró tirante normal con esos datos.');
          // iteraciones Newton para mostrar
          const it = HC.newtonLog(fy, shape === 'circ' ? v.D / 2 : Math.max(y * 1.6, 0.05));
          d.h2('Solución iterativa (Newton–Raphson)');
          d.p('Se resuelve $f(y)=A(y)\\,R(y)^{2/3}-\\dfrac{Qn}{\\sqrt{S}}=0$ con $y_{k+1}=y_k-\\dfrac{f(y_k)}{f\'(y_k)}$:');
          d.table(['Iteración', '$y_k$ (m)', '$f(y_k)$', '$y_{k+1}$ (m)'], it.log.slice(0, 10).map((r) => [String(r.i), fmt(r.x, 5), fmt(r.fx, 6), fmt(r.xn, 5)]));
          d.calc({ sym: 'y_n', val: y, unit: 'm', d: 4, note: 'Tirante normal (convergencia con tolerancia 1e-10).' });
        } else {
          y = v.y;
          if (!(y > 0)) throw new Error('El tirante debe ser mayor que cero.');
          if (shape === 'circ' && y >= v.D) throw new Error('El tirante debe ser menor que el diámetro.');
        }
        d.h('Elementos geométricos de la sección');
        const g = sectionSteps(d, shape, p, y);
        d.h('Caudal, velocidad y energía');
        const Qc = manningQ(g.A, g.R, S, nn);
        if (v.modo === 'caudal') Q = Qc;
        d.calc({ sym: 'Q', f: '\\dfrac{1}{n}A\\,R^{2/3}S^{1/2}', sub: `\\dfrac{1}{${n(nn, 4)}}(${n(g.A, 4)})(${n(g.R, 4)})^{2/3}(${n(S, 5)})^{1/2}`, val: Qc, unit: 'm^3/s', d: 4 });
        const V = Q / g.A;
        d.calc({ sym: 'V', f: '\\dfrac{Q}{A}', sub: `\\dfrac{${n(Q, 4)}}{${n(g.A, 4)}}`, val: V, unit: 'm/s', d: 4 });
        const hv = V * V / (2 * G);
        d.calc({ sym: 'h_v', f: '\\dfrac{V^2}{2g}', sub: `\\dfrac{${n(V, 4)}^2}{2(9.81)}`, val: hv, unit: 'm', d: 4 });
        const E = y + hv;
        d.calc({ sym: 'E', f: 'y+\\dfrac{V^2}{2g}', sub: `${n(y, 4)}+${n(hv, 4)}`, val: E, unit: 'm', d: 4 });
        const F = V / Math.sqrt(G * g.D);
        d.calc({ sym: 'F', f: '\\dfrac{V}{\\sqrt{g\\,D_h}}', sub: `\\dfrac{${n(V, 4)}}{\\sqrt{9.81(${n(g.D, 4)})}}`, val: F, d: 4 });
        const reg = regime(F);
        d.p(`Como $F=${fmt(F, 3)}$ ${F < 1 ? '< 1' : '> 1'}, el flujo es **${reg.toLowerCase()}**.`);

        d.h('Tirante crítico y pendiente crítica');
        d.eq('\\dfrac{Q^2\\,T_c}{g\\,A_c^3}=1', 'Condición crítica');
        const yc = criticalDepth(geom, Q, shape === 'circ' ? v.D * 0.999 : 1);
        const gc = geom(yc);
        const Vc = Q / gc.A;
        const Sc = Math.pow(Vc * nn / Math.pow(gc.R, 2 / 3), 2);
        d.calc({ sym: 'y_c', val: yc, unit: 'm', d: 4, note: 'Resuelto numéricamente (bisección).' });
        d.calc({ sym: 'A_c', val: gc.A, unit: 'm^2', d: 4 });
        d.calc({ sym: 'V_c', f: '\\dfrac{Q}{A_c}', sub: `\\dfrac{${n(Q, 4)}}{${n(gc.A, 4)}}`, val: Vc, unit: 'm/s', d: 4 });
        d.calc({ sym: 'S_c', f: '\\left(\\dfrac{V_c\\,n}{R_c^{2/3}}\\right)^2', sub: `\\left(\\dfrac{${n(Vc, 4)}(${n(nn, 4)})}{${n(gc.R, 4)}^{2/3}}\\right)^2`, val: Sc, unit: 'm/m', d: 5 });
        d.p(S < Sc ? `$S=${fmt(S, 5)}<S_c$: pendiente **suave** (tipo M).` : `$S=${fmt(S, 5)}>S_c$: pendiente **fuerte** (tipo S).`);

        let BL, H;
        if (shape !== 'circ') {
          d.h('Borde libre y altura del canal');
          BL = v.blMode === 'fijo' ? v.bl : y / 3;
          if (v.blMode === 'fijo') d.calc({ sym: 'BL', val: BL, unit: 'm', note: 'Valor adoptado por el proyectista.' });
          else d.calc({ sym: 'BL', f: '\\dfrac{y}{3}', sub: `\\dfrac{${n(y, 4)}}{3}`, val: BL, unit: 'm', d: 3 });
          H = HC.ceilTo(y + BL, 0.05);
          d.calc({ sym: 'H', f: 'y+BL', sub: `${n(y, 4)}+${n(BL, 3)}`, val: y + BL, unit: 'm', d: 3 });
          d.p(`Se adopta constructivamente $H=${fmt(H, 2)}$ m (redondeo a 5 cm).`);
        }

        d.h('Verificaciones');
        const c1 = V >= v.vmin, c2 = V <= v.vmax, c3 = F < 0.8 || F > 1.2;
        d.check(`Velocidad mínima para evitar sedimentación: $V=${fmt(V)}\\geq ${fmt(v.vmin)}$ m/s`, c1);
        d.check(`Velocidad máxima para evitar erosión: $V=${fmt(V)}\\leq ${fmt(v.vmax)}$ m/s`, c2);
        d.check(`Froude fuera de la zona inestable $0.8<F<1.2$: $F=${fmt(F)}$`, c3);
        checks.push({ label: 'Sin sedimentación ($V \\geq V_{min}$)', ok: c1, detail: `V = ${fmt(V)} m/s` });
        checks.push({ label: 'Sin erosión ($V \\leq V_{max}$)', ok: c2, detail: `V = ${fmt(V)} m/s` });
        checks.push({ label: 'Flujo estable ($F$ fuera de 0.8–1.2)', ok: c3, detail: `F = ${fmt(F)}` });

        res.push({ label: v.modo === 'tirante' ? 'Tirante normal' : 'Caudal', sym: v.modo === 'tirante' ? 'y_n' : 'Q', value: v.modo === 'tirante' ? y : Q, unit: v.modo === 'tirante' ? 'm' : 'm^3/s', d: 4, hl: true });
        res.push({ label: 'Velocidad', sym: 'V', value: V, unit: 'm/s', hl: true });
        res.push({ label: 'Froude', sym: 'F', value: F, d: 3 }, { label: 'Régimen', value: reg });
        res.push({ label: 'Área hidráulica', sym: 'A', value: g.A, unit: 'm^2', d: 4 }, { label: 'Perímetro mojado', sym: 'P', value: g.P, unit: 'm', d: 4 });
        res.push({ label: 'Radio hidráulico', sym: 'R', value: g.R, unit: 'm', d: 4 }, { label: 'Espejo de agua', sym: 'T', value: g.T, unit: 'm', d: 3 });
        res.push({ label: 'Energía específica', sym: 'E', value: E, unit: 'm', d: 4 }, { label: 'Tirante crítico', sym: 'y_c', value: yc, unit: 'm', d: 4 });
        res.push({ label: 'Pendiente crítica', sym: 'S_c', value: Sc, unit: 'm/m', d: 5 });
        if (H) res.push({ label: 'Altura total adoptada', sym: 'H', value: H, unit: 'm', d: 2 });

        // gráficos
        charts.push({ id: 'sec', type: 'svg', title: 'Sección transversal', svg: drawSection({ shape, b: v.b, z1: v.z1, z2: v.z2, D: v.D, y, H: H || y * 1.33, T: g.T }) });
        const ymax = shape === 'circ' ? v.D * 0.999 : Math.max(y, yc) * 2.6;
        const ec = energyCurve(geom, Q, ymax);
        const emax = Math.max(E, yc + Vc * Vc / (2 * G)) * 2.2;
        charts.push({
          id: 'E', type: 'xy', title: 'Curva de energía específica', xLabel: 'E (m)', yLabel: 'y (m)', xMin: 0, xMax: emax,
          datasets: [
            { label: 'E = y + Q²/(2gA²)', data: ec.filter((p) => p.x <= emax) },
            { label: 'E = y (45°)', data: [{ x: 0, y: 0 }, { x: emax, y: emax }], dash: true, color: '#475569', width: 1 },
            { label: `y normal = ${fmt(y)} m`, data: [{ x: E, y }], points: true, showLine: false, color: '#16a34a', pointRadius: 6 },
            { label: `y crítico = ${fmt(yc)} m`, data: [{ x: yc + Vc * Vc / (2 * G), y: yc }], points: true, showLine: false, color: '#dc2626', pointRadius: 6 }
          ]
        });
        const rc = [];
        const ytop = shape === 'circ' ? v.D * 0.999 : Math.max(y * 1.8, 0.1);
        for (let i = 1; i <= 80; i++) { const yy = ytop * i / 80; const gg = geom(yy); rc.push({ x: manningQ(gg.A, gg.R, S, nn), y: yy }); }
        charts.push({
          id: 'Qy', type: 'xy', title: 'Curva de descarga Q – y (flujo uniforme)', xLabel: 'Q (m³/s)', yLabel: 'y (m)',
          datasets: [{ label: 'Q(y) Manning', data: rc, color: '#0d9488' }, { label: 'Punto de diseño', data: [{ x: Q, y }], points: true, showLine: false, color: '#dc2626', pointRadius: 6 }]
        });
        const vy = rc.map((p) => ({ x: p.x / geom(p.y).A, y: p.y }));
        charts.push({ id: 'Vy', type: 'xy', title: 'Velocidad media vs tirante', xLabel: 'V (m/s)', yLabel: 'y (m)', datasets: [{ label: 'V(y)', data: vy, color: '#7c3aed' }, { label: `V mín ${fmt(v.vmin)}`, data: [{ x: v.vmin, y: 0 }, { x: v.vmin, y: ytop }], dash: true, color: '#d97706', width: 1 }, { label: `V máx ${fmt(v.vmax)}`, data: [{ x: v.vmax, y: 0 }, { x: v.vmax, y: ytop }], dash: true, color: '#dc2626', width: 1 }] });
      } else if (v.modo === 'economico') {
        Q = v.Q;
        if (!(Q > 0)) throw new Error('El caudal debe ser mayor que cero.');
        const K = Q * nn / Math.sqrt(S);
        d.h('Sección de máxima eficiencia hidráulica (MEH)');
        d.p('Para un área dada, la sección de máxima eficiencia es la de **mínimo perímetro mojado**; en todas ellas el radio hidráulico resulta $R=y/2$ (trapecio y rectángulo).');
        d.calc({ sym: 'K', f: '\\dfrac{Q\\,n}{\\sqrt{S}}', sub: `\\dfrac{${n(Q, 4)}(${n(nn, 4)})}{\\sqrt{${n(S, 5)}}}`, val: K, d: 5 });
        const opts = {
          trap: { name: 'Trapezoidal (medio hexágono)', A: (y) => Math.sqrt(3) * y * y, P: (y) => 2 * Math.sqrt(3) * y, b: (y) => 2 * y / Math.sqrt(3), z: 1 / Math.sqrt(3), cf: Math.pow(Math.pow(2, 2 / 3) / Math.sqrt(3), 3 / 8) },
          rect: { name: 'Rectangular ($b=2y$)', A: (y) => 2 * y * y, P: (y) => 4 * y, b: (y) => 2 * y, z: 0, cf: Math.pow(Math.pow(2, 2 / 3) / 2, 3 / 8) },
          tri: { name: 'Triangular (90°, $z=1$)', A: (y) => y * y, P: (y) => 2 * Math.SQRT2 * y, b: () => 0, z: 1, cf: Math.pow(Math.pow(2 * Math.SQRT2, 2 / 3), 3 / 8) }
        };
        d.h2('Derivación del tirante óptimo');
        d.p('Trapecio óptimo: $z=\\tfrac{1}{\\sqrt3}$ (lados a 60°), $b=\\tfrac{2y}{\\sqrt3}$, $A=\\sqrt3\\,y^2$, $P=2\\sqrt3\\,y$, $R=y/2$. Sustituyendo en Manning:');
        d.eq('y=\\left(\\dfrac{2^{2/3}}{\\sqrt3}\\right)^{3/8}\\left(\\dfrac{Qn}{\\sqrt S}\\right)^{3/8}=0.968\\left(\\dfrac{Qn}{\\sqrt S}\\right)^{3/8}');
        d.p('Rectángulo óptimo: $b=2y$, $A=2y^2$, $R=y/2$ ⇒ $y=0.917\\,(Qn/\\sqrt S)^{3/8}$. Triángulo óptimo (90°): $A=y^2$, $R=y/(2\\sqrt2)$ ⇒ $y=1.297\\,(Qn/\\sqrt S)^{3/8}$.');
        const rows = [];
        let main = null;
        Object.entries(opts).forEach(([k, o]) => {
          const yy = o.cf * Math.pow(K, 3 / 8);
          const A = o.A(yy), P = o.P(yy), bb = o.b(yy), T = bb + 2 * o.z * yy, V = Q / A, F = V / Math.sqrt(G * A / T);
          rows.push([o.name, fmt(yy, 4), fmt(bb, 4), fmt(A, 4), fmt(P, 4), fmt(V, 3), fmt(F, 3)]);
          if (k === v.formaE) main = { k, o, y: yy, A, P, b: bb, T, V, F };
        });
        d.h2(`Cálculo detallado: ${main.o.name}`);
        d.calc({ sym: 'y', f: `${fmt(main.o.cf, 4)}\\,K^{3/8}`, sub: `${fmt(main.o.cf, 4)}(${n(K, 5)})^{3/8}`, val: main.y, unit: 'm', d: 4 });
        d.calc({ sym: 'b', val: main.b, unit: 'm', d: 4 });
        d.calc({ sym: 'A', val: main.A, unit: 'm^2', d: 4 });
        d.calc({ sym: 'P', val: main.P, unit: 'm', d: 4 });
        d.calc({ sym: 'R', f: '\\dfrac{A}{P}', sub: `\\dfrac{${n(main.A, 4)}}{${n(main.P, 4)}}`, val: main.A / main.P, unit: 'm', d: 4 });
        d.calc({ sym: 'V', f: '\\dfrac{Q}{A}', sub: `\\dfrac{${n(Q, 4)}}{${n(main.A, 4)}}`, val: main.V, unit: 'm/s', d: 4 });
        d.calc({ sym: 'T', val: main.T, unit: 'm', d: 4 });
        d.calc({ sym: 'F', f: '\\dfrac{V}{\\sqrt{gA/T}}', sub: `\\dfrac{${n(main.V, 4)}}{\\sqrt{9.81(${n(main.A, 4)})/${n(main.T, 4)}}}`, val: main.F, d: 4 });
        d.h('Comparación de secciones óptimas');
        d.table(['Sección', '$y$ (m)', '$b$ (m)', '$A$ (m²)', '$P$ (m)', '$V$ (m/s)', '$F$'], rows);
        d.note('La sección trapezoidal de medio hexágono requiere el menor perímetro (menor revestimiento) para el mismo caudal.');
        y = main.y;
        res.push({ label: 'Tirante óptimo', sym: 'y', value: main.y, unit: 'm', d: 4, hl: true }, { label: 'Ancho de solera', sym: 'b', value: main.b, unit: 'm', d: 4, hl: true });
        res.push({ label: 'Área', sym: 'A', value: main.A, unit: 'm^2', d: 4 }, { label: 'Perímetro', sym: 'P', value: main.P, unit: 'm', d: 4 }, { label: 'Velocidad', sym: 'V', value: main.V, unit: 'm/s' }, { label: 'Froude', sym: 'F', value: main.F }, { label: 'Régimen', value: regime(main.F) });
        checks.push({ label: 'Sin sedimentación ($V \\geq V_{min}$)', ok: main.V >= v.vmin, detail: `V = ${fmt(main.V)} m/s` });
        checks.push({ label: 'Sin erosión ($V \\leq V_{max}$)', ok: main.V <= v.vmax, detail: `V = ${fmt(main.V)} m/s` });
        const z = main.o.z;
        charts.push({ id: 'sec', type: 'svg', title: `Sección óptima: ${main.o.name.replace(/\$[^$]*\$/g, '').replace(/[()]/g, '').trim()}`, svg: drawSection({ shape: main.k, b: main.b, z1: z, z2: z, y: main.y, H: main.y * 4 / 3, T: main.T }) });
        charts.push({ id: 'cmp', type: 'bar', title: 'Comparación de perímetro y área de las secciones óptimas', labels: ['Trapezoidal', 'Rectangular', 'Triangular'], yLabel: 'm / m²', datasets: [{ label: 'Perímetro P (m)', data: rows.map((r) => parseFloat(r[4])) }, { label: 'Área A (m²)', data: rows.map((r) => parseFloat(r[3])) }] });
      } else {
        // Froude y velocidad, sección rectangular
        const { V, F } = v;
        if (!(V > 0) || !(F > 0)) throw new Error('V y F deben ser mayores que cero.');
        d.h('Diseño de canal rectangular para $F$ y $V$ dados');
        d.p('En un canal rectangular la profundidad hidráulica es $D_h=A/T=y$, por lo que el número de Froude fija el tirante:');
        const yy = V * V / (G * F * F);
        d.calc({ sym: 'y', f: '\\dfrac{V^2}{g\\,F^2}', sub: `\\dfrac{${n(V)}^2}{9.81(${n(F)})^2}`, val: yy, unit: 'm', d: 4 });
        d.p('La ecuación de Manning fija el radio hidráulico necesario:');
        const R = Math.pow(V * nn / Math.sqrt(S), 1.5);
        d.calc({ sym: 'R', f: '\\left(\\dfrac{V\\,n}{\\sqrt S}\\right)^{3/2}', sub: `\\left(\\dfrac{${n(V)}(${n(nn, 4)})}{\\sqrt{${n(S, 5)}}}\\right)^{3/2}`, val: R, unit: 'm', d: 4 });
        d.p('Con $R=\\dfrac{b\\,y}{b+2y}$ se despeja el ancho:');
        if (!(yy > R)) {
          d.note(`No existe solución: se requiere $y>R$ pero $y=${fmt(yy, 4)}$ m $\\leq R=${fmt(R, 4)}$ m. Reduzca la pendiente o aumente $F$, o disminuya $V$/$n$.`, 'warn');
          throw new Error(`Sin solución física: y = ${fmt(yy, 4)} m ≤ R = ${fmt(R, 4)} m. Pruebe con otra pendiente, velocidad o Froude.`);
        }
        const b = 2 * R * yy / (yy - R);
        d.calc({ sym: 'b', f: '\\dfrac{2\\,R\\,y}{y-R}', sub: `\\dfrac{2(${n(R, 4)})(${n(yy, 4)})}{${n(yy, 4)}-${n(R, 4)}}`, val: b, unit: 'm', d: 4 });
        const A = b * yy, P = b + 2 * yy;
        Q = V * A;
        d.calc({ sym: 'A', f: 'b\\,y', sub: `${n(b, 4)}(${n(yy, 4)})`, val: A, unit: 'm^2', d: 4 });
        d.calc({ sym: 'P', f: 'b+2y', sub: `${n(b, 4)}+2(${n(yy, 4)})`, val: P, unit: 'm', d: 4 });
        d.calc({ sym: 'Q', f: 'V\\,A', sub: `${n(V)}(${n(A, 4)})`, val: Q, unit: 'm^3/s', d: 4 });
        d.p(`Comprobación: $F=V/\\sqrt{g y}=${fmt(V / Math.sqrt(G * yy), 4)}$ y $V=\\tfrac1n R^{2/3}S^{1/2}=${fmt(Math.pow(A / P, 2 / 3) * Math.sqrt(S) / nn, 4)}$ m/s.`);
        y = yy;
        res.push({ label: 'Tirante', sym: 'y', value: yy, unit: 'm', d: 4, hl: true }, { label: 'Ancho de solera', sym: 'b', value: b, unit: 'm', d: 4, hl: true }, { label: 'Caudal conducido', sym: 'Q', value: Q, unit: 'm^3/s', d: 4, hl: true }, { label: 'Área', sym: 'A', value: A, unit: 'm^2', d: 4 }, { label: 'Radio hidráulico', sym: 'R', value: R, unit: 'm', d: 4 });
        checks.push({ label: 'Solución física ($y>R$)', ok: true });
        charts.push({ id: 'sec', type: 'svg', title: 'Sección rectangular resultante', svg: drawSection({ shape: 'rect', b, y: yy, H: yy * 4 / 3, T: b }) });
      }
      return { doc: d, results: res, checks, charts };
    },
    theory: [
      {
        title: 'Flujo uniforme y ecuación de Manning', body: [
          'En flujo uniforme el tirante, el área y la velocidad no cambian a lo largo del canal: la pendiente de energía es igual a la pendiente del fondo. La fórmula empírica de Manning relaciona el caudal con la geometría, la rugosidad y la pendiente:',
          { eq: 'Q=\\dfrac{1}{n}\\,A\\,R^{2/3}\\,S^{1/2}', name: 'Ecuación de Manning (SI)' },
          { eq: 'V=\\dfrac{1}{n}\\,R^{2/3}\\,S^{1/2}', name: 'Velocidad media' },
          { eq: 'R=\\dfrac{A}{P}', name: 'Radio hidráulico' },
          'Como $A$ y $R$ dependen del tirante $y$, el cálculo del tirante normal requiere un método iterativo (Newton–Raphson o bisección) sobre la función $f(y)=A R^{2/3}-Qn/\\sqrt{S}$.'
        ]
      },
      {
        title: 'Elementos geométricos', body: [
          'Para la sección trapezoidal general con taludes $z_1$ y $z_2$ (rectangular: $z=0$; triangular: $b=0$):',
          { eq: 'A=b\\,y+\\tfrac12(z_1+z_2)\\,y^2', name: 'Área mojada' },
          { eq: 'P=b+y\\left(\\sqrt{1+z_1^2}+\\sqrt{1+z_2^2}\\right)', name: 'Perímetro mojado' },
          { eq: 'T=b+(z_1+z_2)\\,y', name: 'Espejo de agua' },
          'Para la sección circular de diámetro $D$ con ángulo central $\\theta$:',
          { eq: '\\theta=2\\arccos\\!\\left(1-\\dfrac{2y}{D}\\right),\\quad A=\\dfrac{D^2}{8}(\\theta-\\sin\\theta),\\quad P=\\dfrac{\\theta D}{2}', name: 'Sección circular' }
        ]
      },
      {
        title: 'Energía específica, Froude y régimen', body: [
          { eq: 'E=y+\\dfrac{V^2}{2g}=y+\\dfrac{Q^2}{2gA^2}', name: 'Energía específica' },
          { eq: 'F=\\dfrac{V}{\\sqrt{g\\,A/T}}', name: 'Número de Froude' },
          { eq: '\\dfrac{Q^2\\,T_c}{g\\,A_c^3}=1', name: 'Condición de flujo crítico (energía mínima)' },
          { list: ['$F<1$: flujo subcrítico (lento), controlado aguas abajo.', '$F=1$: flujo crítico, energía específica mínima.', '$F>1$: flujo supercrítico (rápido), controlado aguas arriba.', 'Entre $0.8<F<1.2$ la superficie es inestable: se recomienda evitar ese rango en diseño.'] }
        ]
      },
      {
        title: 'Sección de máxima eficiencia hidráulica', body: [
          'Es la que, para un área dada, tiene el menor perímetro mojado; conduce el máximo caudal y minimiza el revestimiento. En la trapezoidal óptima (medio hexágono) los taludes forman 60° y el radio hidráulico vale la mitad del tirante.',
          { eq: 'R=\\dfrac{y}{2},\\qquad b=2y\\tan\\dfrac{\\theta}{2}', name: 'Condición de máxima eficiencia (trapecio)' },
          { eq: 'y=0.968\\left(\\dfrac{Qn}{\\sqrt S}\\right)^{3/8}', name: 'Tirante óptimo trapezoidal (60°)' },
          { eq: 'y=0.917\\left(\\dfrac{Qn}{\\sqrt S}\\right)^{3/8}', name: 'Tirante óptimo rectangular (b = 2y)' },
          { eq: 'y=1.297\\left(\\dfrac{Qn}{\\sqrt S}\\right)^{3/8}', name: 'Tirante óptimo triangular (90°)' }
        ]
      },
      {
        title: 'Valores recomendados', body: [
          { table: { head: ['Material', '$n$'], rows: [['Cemento pulido', '0.012'], ['Concreto revestido', '0.014'], ['Mampostería de cemento', '0.020'], ['Tierra alineada y uniforme', '0.025'], ['Canales dragados en tierra', '0.0275'], ['Roca con salientes', '0.033–0.040']] } },
          { table: { head: ['Material del talud', 'Talud $z$'], rows: [['Roca', '≈ 0 (casi vertical)'], ['Arcilla dura', '1.0–1.5'], ['Tierra (canales grandes)', '1.0'], ['Tierra (canales pequeños)', '1.5'], ['Tierra arenosa', '2.0'], ['Arena', '3.0']] } },
          { table: { head: ['Revestimiento', 'Velocidad máxima (m/s)'], rows: [['Tierra', '0.9'], ['Mampostería de piedra y concreto', '2.0'], ['Concreto', '3.0']] } },
          'Borde libre usual: $BL=y/3$, o valores mínimos de 0.10 m (canales pequeños) a 0.30 m o más según el caudal.'
        ]
      }
    ],
    fixes: [
      'La hoja «Diseño por Froude y Velocidad» calculaba el tirante resolviendo una ecuación cuadrática incorrecta: con sus datos ($V=0.5$, $F=0.5$) daba $y=1.10$ m, pero entonces $F=V/\\sqrt{gy}=0.15$ y no 0.5. Aquí se usa $y=V^2/(gF^2)$ y $b=2Ry/(y-R)$, y se avisa cuando no hay solución física.',
      'En la hoja «Geometría y Caudal Dado» el tirante se obtenía con unas 3000 filas de tanteos de paso fijo (la precisión dependía del paso). Aquí se resuelve con Newton–Raphson o bisección y se muestra la tabla de iteraciones.',
      'En «DISEÑO DE CANALES ABIERTOS.xls» el tirante era un valor fijo escrito a mano (lo calculaba una macro que ya no existe). Aquí se recalcula siempre.',
      'Se agrega el tirante crítico, la pendiente crítica, la curva de energía específica y la verificación de la zona de Froude inestable.'
    ]
  });
})();
