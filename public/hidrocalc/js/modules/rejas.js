/* Módulo: Cámara de rejas de limpieza manual — fuente: DISEÑO DE CAMARAS DE REJAS.xls */
(function () {
  'use strict';
  const { G, fmt, n, Doc, svg, bisect, rad, ceilTo } = HC;
  const BETA = { rect: { l: 'Rectangular de aristas vivas', b: 2.42 }, semi: { l: 'Rectangular con cara semicircular', b: 1.83 }, circ: { l: 'Circular', b: 1.79 }, gota: { l: 'Rectangular redondeada (gota)', b: 1.67 } };

  function drawFront(o) {
    const W = 520, H = 260;
    const S = svg.scaler(-0.15, o.b + 0.15, -0.15, o.Ht + 0.1, W, H, 28);
    let b = svg.poly([[S.X(-0.15), S.Y(o.Ht)], [S.X(0), S.Y(o.Ht)], [S.X(0), S.Y(0)], [S.X(o.b), S.Y(0)], [S.X(o.b), S.Y(o.Ht)], [S.X(o.b + 0.15), S.Y(o.Ht)], [S.X(o.b + 0.15), S.Y(-0.15)], [S.X(-0.15), S.Y(-0.15)]], 'sv-concrete');
    b += `<rect x="${S.X(0)}" y="${S.Y(o.y)}" width="${o.b * S.s}" height="${o.y * S.s}" class="sv-water"/>`;
    const eM = o.e * 0.0254, aM = o.a * 0.0254;
    let x = aM;
    for (let i = 0; i < o.nb && x < o.b; i++) { b += `<rect x="${S.X(x)}" y="${S.Y(o.Ht)}" width="${Math.max(eM * S.s, 1.5)}" height="${o.Ht * S.s}" class="sv-bar"/>`; x += eM + aM; }
    b += svg.line(S.X(0), S.Y(o.y), S.X(o.b), S.Y(o.y), 'sv-wsurf');
    b += svg.dim(S.X(0), S.Y(0), S.X(o.b), S.Y(0), `b = ${fmt(o.b)} m · ${o.nb} barras`, 22);
    b += svg.dim(S.X(o.b + 0.15), S.Y(0), S.X(o.b + 0.15), S.Y(o.y), `y = ${fmt(o.y)} m`, 26);
    return svg.frame(W, H, b, 'Vista frontal de la reja');
  }

  HC.register({
    id: 'rejas',
    title: 'Cámara de rejas',
    short: 'Cámara de rejas',
    icon: 'rejas',
    group: 'captacion',
    source: 'DISEÑO DE CAMARAS DE REJAS.xls',
    description: 'Pretratamiento de aguas residuales con rejas de limpieza manual: eficiencia, número de barras, tirante, pendiente del canal, pérdidas de carga y verificación de velocidades.',
    tags: ['Aguas residuales', 'Pretratamiento', 'Kirschmer'],
    inputs: [
      {
        title: 'Caudales de diseño', fields: [
          { id: 'Qmin', label: 'Caudal mínimo', sym: 'Q_{min}', unit: 'm^3/s', value: 0.05, step: 0.005 },
          { id: 'Qprom', label: 'Caudal promedio', sym: 'Q_{prom}', unit: 'm^3/s', value: 0.1, step: 0.005 },
          { id: 'Qmax', label: 'Caudal máximo', sym: 'Q_{max}', unit: 'm^3/s', value: 0.25, step: 0.005 }
        ]
      },
      {
        title: 'Rejas y canal', fields: [
          { id: 'e', label: 'Espesor de barra', sym: 'e', unit: 'pulg', value: 0.25, step: 0.125 },
          { id: 'a', label: 'Separación entre barras', sym: 'a', unit: 'pulg', value: 1.0, step: 0.125 },
          { id: 'V', label: 'Velocidad en las rejas (0.6–0.75)', sym: 'V', unit: 'm/s', value: 0.7, step: 0.01 },
          { id: 'b', label: 'Ancho del canal (asumido)', sym: 'b', unit: 'm', value: 0.6, step: 0.05 },
          { id: 'nn', label: 'Coeficiente de Manning', sym: 'n', value: 0.013, step: 0.001 },
          { id: 'theta', label: 'Inclinación de las barras', sym: '\\theta', unit: '°', value: 45, step: 5, help: 'Limpieza manual: 30°–60° respecto a la horizontal.' },
          { id: 'forma', label: 'Forma de las barras (Kirschmer)', type: 'select', value: 'rect', options: Object.entries(BETA).map(([k, o]) => ({ v: k, l: `${o.l} (β=${o.b})` })) },
          { id: 'obs', label: 'Obstrucción para la pérdida de carga', unit: '\\%', value: 50, step: 5 },
          { id: 'BL', label: 'Borde libre', sym: 'BL', unit: 'm', value: 0.3, step: 0.05 }
        ]
      }
    ],
    presets: [{ name: 'Ejemplo del Excel (Qmáx = 250 L/s)', values: {} }, { name: 'Pequeña localidad (Qmáx = 40 L/s)', values: { Qmin: 0.01, Qprom: 0.02, Qmax: 0.04, b: 0.3, a: 0.75 } }],
    compute(v) {
      const d = new Doc();
      const checks = [];
      d.h('Eficiencia y número de barras');
      const E = v.a / (v.e + v.a);
      d.calc({ sym: 'E', f: '\\dfrac{a}{e+a}', sub: `\\dfrac{${n(v.a)}}{${n(v.e)}+${n(v.a)}}`, val: E, d: 4 });
      const bIn = v.b / 0.0254;
      const nbc = (bIn - v.a) / (v.e + v.a);
      const nb = Math.floor(nbc + 1e-9);
      d.calc({ sym: 'n', f: '\\dfrac{b-a}{e+a}', sub: `\\dfrac{${n(bIn, 2)}-${n(v.a)}}{${n(v.e)}+${n(v.a)}}`, val: nbc, d: 2, note: `b = ${fmt(v.b)} m = ${fmt(bIn, 2)} pulg ⇒ se colocan ${nb} barras.` });
      const Vo = E * v.V;
      d.calc({ sym: 'V_o', f: 'E\\,V', sub: `${n(E, 4)}(${n(v.V)})`, val: Vo, unit: 'm/s', d: 4, note: 'Velocidad de aproximación en el canal.' });

      d.h('Dimensionamiento para el caudal máximo');
      const Au = v.Qmax / v.V;
      d.calc({ sym: 'A_u', f: 'Q_{max}/V', sub: `${n(v.Qmax)}/${n(v.V)}`, val: Au, unit: 'm^2', d: 4 });
      const At = Au / E;
      d.calc({ sym: 'A_t', f: 'A_u/E', sub: `${n(Au, 4)}/${n(E, 4)}`, val: At, unit: 'm^2', d: 4 });
      const y = At / v.b;
      d.calc({ sym: 'y', f: 'A_t/b', sub: `${n(At, 4)}/${n(v.b)}`, val: y, unit: 'm', d: 4 });
      const R = v.b * y / (v.b + 2 * y);
      d.calc({ sym: 'R', f: '\\dfrac{b\\,y}{b+2y}', sub: `\\dfrac{${n(v.b)}(${n(y, 4)})}{${n(v.b)}+2(${n(y, 4)})}`, val: R, unit: 'm', d: 4 });
      const S = Math.pow(Vo * v.nn / Math.pow(R, 2 / 3), 2);
      d.calc({ sym: 'S', f: '\\left(\\dfrac{V_o\\,n}{R^{2/3}}\\right)^2', sub: `\\left(\\dfrac{${n(Vo, 4)}(${n(v.nn)})}{${n(R, 4)}^{2/3}}\\right)^2`, val: S, unit: 'm/m', d: 6 });
      const okV = v.V >= 0.6 && v.V <= 0.75;
      d.check(`Velocidad entre barras $0.60\\leq V=${fmt(v.V)}\\leq0.75$ m/s`, okV);
      checks.push({ label: 'Velocidad entre barras (0.60–0.75 m/s)', ok: okV, detail: `V = ${fmt(v.V)} m/s` });
      const okVo = Vo >= 0.3 && Vo <= 0.6;
      d.check(`Velocidad de aproximación $0.30\\leq V_o=${fmt(Vo)}\\leq0.60$ m/s`, okVo);
      checks.push({ label: 'Velocidad de aproximación (0.30–0.60 m/s)', ok: okVo, detail: `Vo = ${fmt(Vo)} m/s` });

      d.h('Pérdida de carga');
      const p = v.obs / 100;
      const Vp = v.V / (1 - p);
      d.h2(`Con ${fmt(v.obs)} % de obstrucción (Metcalf & Eddy)`);
      d.calc({ sym: "V'", f: '\\dfrac{V}{1-p}', sub: `\\dfrac{${n(v.V)}}{1-${n(p)}}`, val: Vp, unit: 'm/s', d: 3 });
      const Hf = (1 / 0.7) * (Vp * Vp - Vo * Vo) / (2 * G);
      d.calc({ sym: 'H_f', f: "\\dfrac{1}{0.7}\\,\\dfrac{V'^2-V_o^2}{2g}", sub: `1.43\\,\\dfrac{${n(Vp, 3)}^2-${n(Vo, 4)}^2}{2(9.81)}`, val: Hf, unit: 'm', d: 4 });
      d.h2('Rejas limpias (Kirschmer)');
      const beta = BETA[v.forma].b;
      const hk = beta * Math.pow(v.e / v.a, 4 / 3) * (Vo * Vo / (2 * G)) * Math.sin(rad(v.theta));
      d.calc({ sym: 'h_k', f: '\\beta\\left(\\dfrac{e}{a}\\right)^{4/3}\\dfrac{V_o^2}{2g}\\sin\\theta', sub: `${n(beta)}\\left(\\dfrac{${n(v.e)}}{${n(v.a)}}\\right)^{4/3}\\dfrac{${n(Vo, 4)}^2}{19.62}\\sin ${fmt(v.theta)}^\\circ`, val: hk, unit: 'm', d: 5 });
      const okHf = Hf <= 0.15;
      d.check(`Pérdida con obstrucción $H_f=${fmt(Hf, 3)}\\leq0.15$ m`, okHf);
      checks.push({ label: 'Pérdida de carga con obstrucción ≤ 0.15 m', ok: okHf, detail: `Hf = ${fmt(Hf, 3)} m` });

      d.h('Verificación para los caudales mínimo y promedio');
      d.p('Con la pendiente $S$ calculada, se resuelve el tirante para cada caudal. El Excel usaba el ábaco $AR^{2/3}/b^{8/3}$ vs $y/b$; aquí se resuelve directamente.');
      const solve = (Q) => bisect((yy) => { const A = v.b * yy, Rr = A / (v.b + 2 * yy); return A * Math.pow(Rr, 2 / 3) * Math.sqrt(S) / v.nn - Q; }, 1e-5, 2);
      const rows = [['mín', v.Qmin], ['prom', v.Qprom], ['máx', v.Qmax]].map(([k, Q]) => {
        const yy = solve(Q), V2 = Q / (v.b * yy);
        const kk = Q * v.nn / Math.sqrt(S) / Math.pow(v.b, 8 / 3);
        return { k, Q, y: yy, V: V2, kk };
      });
      rows.forEach((r) => {
        d.h2(`Caudal ${r.k} ($Q=${fmt(r.Q, 3)}$ m³/s)`);
        d.calc({ sym: '\\dfrac{A R^{2/3}}{b^{8/3}}', f: '\\dfrac{Q\\,n}{S^{1/2}\\,b^{8/3}}', sub: `\\dfrac{${n(r.Q)}(${n(v.nn)})}{${n(S, 6)}^{1/2}(${n(v.b)})^{8/3}}`, val: r.kk, d: 4 });
        d.calc({ sym: 'y', val: r.y, unit: 'm', d: 4, note: `y/b = ${fmt(r.y / v.b, 3)}` });
        d.calc({ sym: 'V', f: 'Q/(b\\,y)', sub: `${n(r.Q)}/(${n(v.b)}(${n(r.y, 4)}))`, val: r.V, unit: 'm/s', d: 3 });
      });
      const vmin = rows[0].V;
      const okMin = vmin >= 0.3;
      d.check(`Autolimpieza con caudal mínimo: $V=${fmt(vmin)}\\geq0.30$ m/s`, okMin);
      checks.push({ label: 'Sin sedimentación con Qmín (V ≥ 0.30 m/s)', ok: okMin, detail: `V = ${fmt(vmin)} m/s` });

      d.h('Dimensiones finales');
      const Ht = ceilTo(y + v.BL, 0.05);
      d.calc({ sym: 'H', f: 'y+BL', sub: `${n(y, 4)}+${n(v.BL)}`, val: y + v.BL, unit: 'm', d: 3, note: `Se adopta H = ${fmt(Ht, 2)} m.` });
      const Lr = Ht / Math.sin(rad(v.theta));
      d.calc({ sym: 'L_r', f: '\\dfrac{H}{\\sin\\theta}', sub: `\\dfrac{${n(Ht)}}{\\sin ${fmt(v.theta)}^\\circ}`, val: Lr, unit: 'm', d: 3, note: 'Longitud de las barras.' });

      const results = [
        { label: 'Eficiencia de barra', sym: 'E', value: E, d: 3 },
        { label: 'Número de barras', sym: 'n', value: String(nb), hl: true },
        { label: 'Tirante con Qmáx', sym: 'y', value: y, unit: 'm', d: 3, hl: true },
        { label: 'Pendiente del canal', sym: 'S', value: S, unit: 'm/m', d: 6 },
        { label: 'Pérdida (obstruida)', sym: 'H_f', value: Hf, unit: 'm', d: 3, hl: true },
        { label: 'Pérdida (limpia)', sym: 'h_k', value: hk, unit: 'm', d: 4 },
        { label: 'Velocidad con Qmín', sym: 'V', value: vmin, unit: 'm/s' },
        { label: 'Altura del canal', sym: 'H', value: Ht, unit: 'm', d: 2 },
        { label: 'Longitud de barras', sym: 'L_r', value: Lr, unit: 'm', d: 2 }
      ];
      const obsPts = [];
      for (let i = 0; i <= 70; i += 2) { const Vx = v.V / (1 - i / 100); obsPts.push({ x: i, y: (1 / 0.7) * (Vx * Vx - Vo * Vo) / (2 * G) }); }
      const charts = [
        { id: 'front', type: 'svg', title: 'Vista frontal de la reja (Qmáx)', svg: drawFront({ b: v.b, y, Ht, e: v.e, a: v.a, nb }) },
        { id: 'hf', type: 'xy', title: 'Pérdida de carga vs obstrucción de la reja', xLabel: 'Obstrucción (%)', yLabel: 'Hf (m)', datasets: [{ label: 'Hf (Metcalf & Eddy)', data: obsPts, color: '#dc2626', fill: true }, { label: 'Límite 0.15 m', data: [{ x: 0, y: 0.15 }, { x: 70, y: 0.15 }], dash: true, color: '#475569', width: 1 }] },
        { id: 'qv', type: 'bar', title: 'Tirante y velocidad según el caudal', labels: ['Qmín', 'Qprom', 'Qmáx'], yLabel: 'm · m/s', datasets: [{ label: 'Tirante y (m)', data: rows.map((r) => r.y), color: '#2563eb' }, { label: 'Velocidad V (m/s)', data: rows.map((r) => r.V), color: '#0d9488' }] }
      ];
      return { doc: d, results, checks, charts };
    },
    theory: [
      {
        title: 'Cámara de rejas', body: [
          'Primera unidad del pretratamiento de aguas residuales: retiene los sólidos gruesos que podrían dañar bombas o atascar tuberías. En las rejas de limpieza manual las barras se inclinan de 30° a 60° para facilitar el rastrillado.',
          { eq: 'E=\\dfrac{a}{e+a},\\qquad n=\\dfrac{b-a}{e+a}', name: 'Eficiencia y número de barras' },
          { eq: 'A_u=\\dfrac{Q_{max}}{V},\\qquad A_t=\\dfrac{A_u}{E},\\qquad y=\\dfrac{A_t}{b}', name: 'Áreas y tirante' },
          { eq: 'S=\\left(\\dfrac{V_o\\,n}{R^{2/3}}\\right)^2', name: 'Pendiente del canal (Manning)' }
        ]
      },
      {
        title: 'Pérdidas de carga', body: [
          { eq: 'h_L=\\dfrac{1}{0.7}\\,\\dfrac{V^2-v^2}{2g}', name: 'Metcalf & Eddy (V entre barras, v de aproximación)' },
          { eq: 'h=\\beta\\left(\\dfrac{e}{a}\\right)^{4/3}\\dfrac{v^2}{2g}\\sin\\theta', name: 'Kirschmer (rejas limpias)' },
          { table: { head: ['Forma de la barra', '$\\beta$'], rows: Object.values(BETA).map((o) => [o.l, String(o.b)]) } },
          { list: ['Velocidad entre barras: 0.60–0.75 m/s (hasta 0.9 m/s con Qmáx).', 'Velocidad de aproximación: 0.30–0.60 m/s para evitar sedimentación.', 'Se diseña con 50 % de obstrucción para la pérdida máxima.'] }
        ]
      }
    ],
    fixes: [
      'La hoja mostraba el coeficiente «1.143» en la fórmula de pérdida de carga, pero el resultado (0.12 m) corresponde a $1/0.7=1.43$ (Metcalf & Eddy). Con 1.143 daría 0.096 m. Se usa 1.43.',
      'La verificación con caudal mínimo pedía leer $y/b$ en un ábaco (valor fijo de 0.35). Aquí el tirante se calcula exactamente para Qmín, Qprom y Qmáx.',
      'Se agregan la fórmula de Kirschmer para rejas limpias, la longitud de las barras y las verificaciones de velocidad.'
    ]
  });
})();
