/* Módulo: Canal por tramos — fuentes: 03-DISEÑO CANAL RECTANGULAR.xls, DISEÑO DE CANALES ABIERTOS.xls (hoja Resultados) */
(function () {
  'use strict';
  const { G, fmt, n, trap, manningQ, bisect, criticalDepth, Doc, ceilTo } = HC;

  const prog = (x) => {
    const km = Math.floor(x / 1000 + 1e-9);
    const m = x - km * 1000;
    return `${km}+${m.toFixed(2).padStart(6, '0')}`;
  };

  const RECT = [[0, 67.88, 0.0066], [67.88, 232.13, 0.00101], [232.13, 312.03, 0.0194], [312.03, 350.75, 0.0453], [350.75, 387.24, 0.00908], [387.24, 448.13, 0.0725], [448.13, 486.07, 0.01572], [486.07, 559.84, 0.0075], [559.84, 619.99, 0.0024], [619.99, 700.09, 0.00954], [700.09, 814.92, 0.0097], [814.92, 880.07, 0.02018], [880.07, 1036.12, 0.0484], [1036.12, 1090.48, 0.0063], [1090.48, 1149.77, 0.0235], [1149.77, 1227.32, 0.0108], [1227.32, 1322.16, 0.02183], [1322.16, 1362.29, 0.135], [1362.29, 1378.7, 0.0443], [1378.7, 1457.91, 0.0087], [1457.91, 1680.06, 0.00298], [1680.06, 1860.06, 0.00696], [1860.06, 2084.18, 0.0078], [2084.18, 2162.85, 0.0378], [2162.85, 2237.81, 0.06516], [2237.81, 2311.93, 0.00907], [2311.93, 2353.69, 0.0472], [2353.69, 2400.81, 0.0164]]
    .map(([ini, fin, S]) => ({ ini, fin, Q: 0.02, b: 0.5, z: 0, n: 0.015, S }));
  const MARCO = [[0.0548, 1, 0.002], [0.05, 1, 0.01], [0.05, 1, 0.006], [0.05, 1, 0.009], [0.05, 1, 0.005], [0.06, 1, 0.004], [0.06, 1, 0.009], [0.06, 1, 0.001], [0.06, 1, 0.02], [0.0548, 0, 0.008], [0.0548, 0, 0.01], [0.0548, 1, 0.003], [0.0548, 0, 0.003], [0.0548, 0, 0.005]]
    .map(([Q, z, S], i) => ({ ini: i * 500, fin: (i + 1) * 500, Q, b: 0.3, z, n: 0.014, S }));

  HC.register({
    id: 'tramos',
    title: 'Canal por tramos (perfil longitudinal)',
    short: 'Canal por tramos',
    icon: 'tramos',
    group: 'conduccion',
    source: '03-DISEÑO CANAL RECTANGULAR.xls · DISEÑO DE CANALES ABIERTOS.xls',
    description: 'Características hidráulicas por tramos según progresivas: tirante, velocidad, Froude, energía, borde libre, altura del canal y perfil de la rasante.',
    tags: ['Progresivas', 'Perfil', 'Manning'],
    inputs: [
      {
        title: 'Tramos del canal', fields: [
          {
            id: 'rows', type: 'table', label: 'Tramos (progresivas en m)', addLabel: 'Agregar tramo', value: RECT.slice(0, 12),
            columns: [
              { id: 'ini', label: 'Prog. inicio', unit: 'm' }, { id: 'fin', label: 'Prog. fin', unit: 'm' },
              { id: 'Q', label: 'Q', unit: 'm^3/s' }, { id: 'b', label: 'b', unit: 'm' }, { id: 'z', label: 'z' },
              { id: 'n', label: 'n' }, { id: 'S', label: 'S', unit: 'm/m' }
            ],
            onAdd: (nr, rows) => { const last = rows[rows.length - 1]; if (last) { const L = last.fin - last.ini; nr.ini = last.fin; nr.fin = last.fin + L; } }
          }
        ]
      },
      {
        title: 'Criterios', fields: [
          { id: 'z0', label: 'Cota de fondo al inicio', sym: 'z_0', unit: 'm', value: 100, step: 0.5 },
          { id: 'blMin', label: 'Borde libre mínimo', sym: 'BL_{min}', unit: 'm', value: 0.1, step: 0.05, help: 'Se usa el mayor entre y/3 y este mínimo.' },
          { id: 'vmin', label: 'Velocidad mínima', sym: 'V_{min}', unit: 'm/s', value: 0.6, step: 0.05 },
          { id: 'vmax', label: 'Velocidad máxima', sym: 'V_{max}', unit: 'm/s', value: 3.0, step: 0.1 }
        ]
      }
    ],
    presets: [
      { name: 'Canal rectangular 0+000 – 2+400 (28 tramos)', values: { rows: RECT } },
      { name: 'Canal trapezoidal / rectangular Marcobamba', values: { rows: MARCO } }
    ],
    compute(v) {
      const d = new Doc();
      const rows = v.rows;
      if (!rows.length) throw new Error('Ingrese al menos un tramo.');
      d.h('Método de cálculo');
      d.p('En cada tramo se supone flujo uniforme. El tirante normal se obtiene resolviendo la ecuación de Manning; luego se calculan los elementos geométricos, la energía específica y el número de Froude.');
      d.eq('\\dfrac{Q\\,n}{\\sqrt S}=A\\,R^{2/3},\\qquad A=(b+zy)\\,y,\\qquad P=b+2y\\sqrt{1+z^2}');
      d.eq('F=\\dfrac{V}{\\sqrt{g\\,A/T}},\\qquad E=y+\\dfrac{V^2}{2g},\\qquad BL=\\max\\!\\left(\\dfrac{y}{3},BL_{min}\\right)');

      const out = [];
      let zb = v.z0;
      rows.forEach((r, i) => {
        const L = r.fin - r.ini;
        if (!(r.Q > 0) || !(r.n > 0) || !(r.S > 0) || !(r.b >= 0) || !(r.z >= 0) || (r.b === 0 && r.z === 0)) throw new Error(`Datos inválidos en el tramo ${i + 1}.`);
        if (!(L > 0)) throw new Error(`La progresiva final del tramo ${i + 1} debe ser mayor que la inicial.`);
        const geom = (y) => trap(r.b, r.z, r.z, y);
        const y = bisect((yy) => { const g = geom(yy); return manningQ(g.A, g.R, r.S, r.n) - r.Q; }, 1e-6, 1);
        const g = geom(y);
        const V = r.Q / g.A, F = V / Math.sqrt(G * g.D), E = y + V * V / (2 * G);
        const yc = criticalDepth(geom, r.Q, 1);
        const BL = Math.max(y / 3, v.blMin);
        const H = ceilTo(y + BL, 0.05);
        const reg = HC.hyd.regime(F);
        const obs = V < v.vmin ? 'Probable sedimentación' : (V > v.vmax ? 'Velocidad erosiva' : 'Adecuada');
        const z1 = zb, z2 = zb - r.S * L;
        out.push({ i: i + 1, r, L, y, g, V, F, E, yc, BL, H, reg, obs, z1, z2 });
        zb = z2;

        d.h(`Tramo ${i + 1}: ${prog(r.ini)} – ${prog(r.fin)}`);
        d.p(`$Q=${fmt(r.Q, 4)}$ m³/s, $b=${fmt(r.b)}$ m, $z=${fmt(r.z)}$, $n=${fmt(r.n, 4)}$, $S=${fmt(r.S, 5)}$, $L=${fmt(L, 2)}$ m.`);
        d.calc({ sym: 'A R^{2/3}', f: '\\dfrac{Qn}{\\sqrt S}', sub: `\\dfrac{${n(r.Q, 4)}(${n(r.n, 4)})}{\\sqrt{${n(r.S, 5)}}}`, val: r.Q * r.n / Math.sqrt(r.S), d: 5 });
        d.calc({ sym: 'y_n', val: y, unit: 'm', d: 4, note: 'Tirante normal (iterativo).' });
        d.calc({ sym: 'A', f: '(b+zy)y', sub: `(${n(r.b)}+${n(r.z)}(${n(y, 4)}))(${n(y, 4)})`, val: g.A, unit: 'm^2', d: 4 });
        d.calc({ sym: 'P', f: 'b+2y\\sqrt{1+z^2}', sub: `${n(r.b)}+2(${n(y, 4)})\\sqrt{1+${n(r.z)}^2}`, val: g.P, unit: 'm', d: 4 });
        d.calc({ sym: 'R', f: 'A/P', sub: `${n(g.A, 4)}/${n(g.P, 4)}`, val: g.R, unit: 'm', d: 4 });
        d.calc({ sym: 'T', f: 'b+2zy', sub: `${n(r.b)}+2(${n(r.z)})(${n(y, 4)})`, val: g.T, unit: 'm', d: 4 });
        d.calc({ sym: 'V', f: 'Q/A', sub: `${n(r.Q, 4)}/${n(g.A, 4)}`, val: V, unit: 'm/s', d: 4 });
        d.calc({ sym: 'F', f: '\\dfrac{V}{\\sqrt{gA/T}}', sub: `\\dfrac{${n(V, 4)}}{\\sqrt{9.81(${n(g.A, 4)})/${n(g.T, 4)}}}`, val: F, d: 4 });
        d.calc({ sym: 'E', f: 'y+\\dfrac{V^2}{2g}', sub: `${n(y, 4)}+\\dfrac{${n(V, 4)}^2}{19.62}`, val: E, unit: 'm', d: 4 });
        d.calc({ sym: 'H', f: 'y+BL', sub: `${n(y, 4)}+${n(BL, 3)}`, val: y + BL, unit: 'm', d: 3, note: `Se adopta H = ${fmt(H, 2)} m. Flujo ${reg.toLowerCase()}; velocidad: ${obs.toLowerCase()}.` });
      });

      d.h('Cuadro resumen de elementos hidráulicos');
      d.table(['Tramo', 'Progresivas', '$S$', '$y$ (m)', '$A$ (m²)', '$T$ (m)', '$V$ (m/s)', '$F$', '$E$ (m)', '$H$ (m)', 'Flujo', 'Obs.'],
        out.map((o) => [String(o.i), `${prog(o.r.ini)} – ${prog(o.r.fin)}`, fmt(o.r.S, 5), fmt(o.y, 4), fmt(o.g.A, 4), fmt(o.g.T, 3), fmt(o.V, 3), fmt(o.F, 3), fmt(o.E, 4), fmt(o.H, 2), o.reg, o.obs]));
      d.h('Cotas de fondo (rasante)');
      d.p('La cota de fondo al final de cada tramo es $z_f=z_i-S\\,L$.');
      d.table(['Tramo', '$L$ (m)', '$z_i$ (m)', '$S\\,L$ (m)', '$z_f$ (m)'], out.map((o) => [String(o.i), fmt(o.L, 2), fmt(o.z1, 3), fmt(o.r.S * o.L, 3), fmt(o.z2, 3)]));

      const nSup = out.filter((o) => o.F > 1).length;
      const nBad = out.filter((o) => o.obs !== 'Adecuada').length;
      const nInst = out.filter((o) => o.F > 0.8 && o.F < 1.2).length;
      const Ltot = out.reduce((s, o) => s + o.L, 0);
      const checks = [
        { label: 'Velocidades dentro de límites en todos los tramos', ok: nBad === 0, detail: nBad ? `${nBad} tramo(s) fuera de rango` : 'todos adecuados' },
        { label: 'Sin tramos en zona de Froude inestable (0.8–1.2)', ok: nInst === 0, detail: `${nInst} tramo(s)` }
      ];
      const results = [
        { label: 'Número de tramos', value: String(out.length) }, { label: 'Longitud total', sym: 'L', value: Ltot, unit: 'm', d: 2, hl: true },
        { label: 'Tirante máximo', sym: 'y_{max}', value: Math.max(...out.map((o) => o.y)), unit: 'm', d: 4 },
        { label: 'Tirante mínimo', sym: 'y_{min}', value: Math.min(...out.map((o) => o.y)), unit: 'm', d: 4 },
        { label: 'Velocidad máxima', sym: 'V_{max}', value: Math.max(...out.map((o) => o.V)), unit: 'm/s', hl: true },
        { label: 'Velocidad mínima', sym: 'V_{min}', value: Math.min(...out.map((o) => o.V)), unit: 'm/s' },
        { label: 'Tramos supercríticos', value: `${nSup} de ${out.length}` },
        { label: 'Altura máxima del canal', sym: 'H', value: Math.max(...out.map((o) => o.H)), unit: 'm', d: 2 },
        { label: 'Cota de fondo final', sym: 'z_f', value: zb, unit: 'm', d: 3 }
      ];

      const step = (key) => out.flatMap((o) => [{ x: o.r.ini, y: key(o) }, { x: o.r.fin, y: key(o) }]);
      const charts = [
        { id: 'perfil', type: 'xy', wide: true, title: 'Perfil longitudinal: fondo, lámina de agua y borde del canal', xLabel: 'Progresiva (m)', yLabel: 'Cota (m)', datasets: [
          { label: 'Fondo del canal', data: out.flatMap((o) => [{ x: o.r.ini, y: o.z1 }, { x: o.r.fin, y: o.z2 }]), color: '#475569', width: 2.5 },
          { label: 'Superficie de agua', data: out.flatMap((o) => [{ x: o.r.ini, y: o.z1 + o.y }, { x: o.r.fin, y: o.z2 + o.y }]), color: '#2563eb', fill: '-1' },
          { label: 'Corona del canal (H)', data: out.flatMap((o) => [{ x: o.r.ini, y: o.z1 + o.H }, { x: o.r.fin, y: o.z2 + o.H }]), color: '#d97706', dash: true, width: 1 }] },
        { id: 'yv', type: 'xy', title: 'Tirante y velocidad por progresiva', xLabel: 'Progresiva (m)', yLabel: 'y (m)', y2Label: 'V (m/s)', datasets: [
          { label: 'Tirante y (m)', data: step((o) => o.y), color: '#2563eb' }, { label: 'Velocidad V (m/s)', data: step((o) => o.V), color: '#d97706', y2: true }] },
        { id: 'F', type: 'bar', title: 'Número de Froude por tramo', labels: out.map((o) => `T${o.i}`), yLabel: 'F', datasets: [{ label: 'Froude', data: out.map((o) => o.F), color: '#7c3aed' }] },
        { id: 'V', type: 'bar', title: 'Velocidad por tramo', labels: out.map((o) => `T${o.i}`), yLabel: 'V (m/s)', datasets: [{ label: 'V (m/s)', data: out.map((o) => o.V), color: '#0d9488' }] }
      ];
      return { doc: d, results, checks, charts };
    },
    theory: [
      {
        title: 'Diseño por tramos', body: [
          'Un canal de conducción se divide en tramos de pendiente y sección constantes. En cada tramo se calcula el tirante normal con Manning y se verifica la velocidad, el régimen y el borde libre.',
          { eq: 'y_n:\\; A(y)\\,R(y)^{2/3}=\\dfrac{Q\\,n}{\\sqrt{S}}', name: 'Tirante normal del tramo' },
          { eq: 'z_f=z_i-S\\,L', name: 'Cota de fondo al final del tramo' },
          { eq: 'H=y+BL,\\qquad BL=\\max\\!\\left(\\tfrac{y}{3},\\,BL_{min}\\right)', name: 'Altura del canal' },
          { list: ['Si $V<0.6$ m/s en pendientes pequeñas hay riesgo de sedimentación.', 'Si la velocidad supera la máxima admisible del revestimiento hay riesgo de erosión.', 'Donde cambia el régimen (de supercrítico a subcrítico) se forma un resalto hidráulico: debe preverse una transición o una poza.'] }
        ]
      }
    ],
    fixes: [
      'En la hoja «Diseño» del canal rectangular, las columnas T a AA (segundo bloque de resultados) contenían valores sin sentido (del orden de $10^{-4}$ y el número 7 repetido). Se eliminaron: el cálculo se hace una sola vez y de forma coherente.',
      'En «DISEÑO DE CANALES ABIERTOS.xls» las progresivas de los tramos se repetían o no eran consecutivas («km 20+000 al km 20+100» en 15 filas). Aquí cada tramo se define por su progresiva inicial y final, y se calcula el perfil de la rasante.',
      'Se agrega el borde libre mínimo configurable, la cota de rasante y el perfil longitudinal.'
    ]
  });
})();
