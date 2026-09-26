/* Módulo: Desarenador — fuente: DISEÑO DESARENADOR.xlsx */
(function () {
  'use strict';
  const { fmt, n, Doc, svg, ceilTo, interp, rad } = HC;

  const VS_TAB = [[0.05, 0.178], [0.1, 0.692], [0.15, 1.56], [0.2, 2.16], [0.25, 2.7], [0.3, 3.24], [0.35, 3.78], [0.4, 4.32], [0.45, 4.86], [0.5, 5.4], [0.55, 5.94], [0.6, 6.48], [0.7, 7.32], [0.8, 8.07], [1, 9.44], [2, 15.29], [3, 19.25], [5, 24.9]];
  const K_TAB = [[0.2, 1.25], [0.3, 1.5], [0.5, 2.0]];
  const campA = (dmm) => (dmm < 0.1 ? 51 : dmm <= 1 ? 44 : 36);
  const vsTurb = (dmm, rho, c) => Math.sqrt(4 * 981 * (rho - 1) * (dmm / 10) / (3 * c));
  const vsStokes = (dmm, rho, nu) => 981 * (rho - 1) * Math.pow(dmm / 10, 2) / (18 * nu * 0.01); // ν en cm²/s

  function drawPlan(o) {
    const W = 680, H = 230;
    const Ltot = 3 + o.LT + o.L + o.LT + 3;
    const S = svg.scaler2(0, Ltot, -o.B / 2 - 0.9, o.B / 2 + 0.9, W, H, 30);
    const P = (x, y) => [S.X(x), S.Y(y)];
    const x1 = 3, x2 = x1 + o.LT, x3 = x2 + o.L, x4 = x3 + o.LT;
    const top = [P(0, o.T1 / 2), P(x1, o.T1 / 2), P(x2, o.B / 2), P(x3, o.B / 2), P(x4, o.T1 / 2), P(Ltot, o.T1 / 2)];
    const bot = [P(Ltot, -o.T1 / 2), P(x4, -o.T1 / 2), P(x3, -o.B / 2), P(x2, -o.B / 2), P(x1, -o.T1 / 2), P(0, -o.T1 / 2)];
    let b = svg.poly(top.concat(bot), 'sv-water');
    b += svg.pline(top, 'sv-line') + svg.pline(bot, 'sv-line');
    for (let i = 0; i < 26; i++) { const x = x2 + (o.L * (i + 0.5)) / 26; const y = (Math.sin(i * 7.3) * 0.35) * o.B; b += `<circle cx="${S.X(x)}" cy="${S.Y(y)}" r="${1.4 + (i % 3) * 0.5}" class="sv-dot"/>`; }
    b += svg.line(S.X(0), S.Y(0), S.X(Ltot), S.Y(0), 'sv-axis');
    b += svg.dim(S.X(x2), S.Y(o.B / 2) - 10, S.X(x3), S.Y(o.B / 2) - 10, `L = ${fmt(o.L, 2)} m`, 0);
    b += svg.dim(S.X(x1), S.Y(-o.B / 2) + 20, S.X(x2), S.Y(-o.B / 2) + 20, `LT = ${fmt(o.LT, 2)}`, 0);
    b += svg.dim(S.X(x3), S.Y(-o.B / 2) + 20, S.X(x4), S.Y(-o.B / 2) + 20, `LT = ${fmt(o.LT, 2)}`, 0);
    b += svg.dim(S.X(x3) + 16, S.Y(-o.B / 2), S.X(x3) + 16, S.Y(o.B / 2), `B = ${fmt(o.B, 2)}`, 0);
    b += svg.txt(S.X(1.5), S.Y(o.T1 / 2) - 8, 'Canal de ingreso', 'sv-small');
    b += svg.txt(S.X(Ltot - 1.5), S.Y(o.T1 / 2) - 8, 'Canal de salida', 'sv-small');
    b += svg.txt(S.X((x2 + x3) / 2), S.Y(0) + 4, 'Cámara de sedimentación', 'sv-label');
    b += `<path d="M ${S.X(0.4)} ${S.Y(0)} l18 0 m-6 -5 l6 5 l-6 5" class="sv-line"/>`;
    return svg.frame(W, H, b, 'Planta del desarenador');
  }
  function drawSection(o) {
    const W = 420, H = 260;
    const S = svg.scaler(-o.B / 2 - 0.5, o.B / 2 + 0.5, -0.4, o.Ht + 0.3, W, H, 30);
    let b = svg.poly([[S.X(-o.B / 2 - 0.2), S.Y(o.Ht)], [S.X(-o.B / 2), S.Y(o.Ht)], [S.X(-o.B / 2), S.Y(0)], [S.X(o.B / 2), S.Y(0)], [S.X(o.B / 2), S.Y(o.Ht)], [S.X(o.B / 2 + 0.2), S.Y(o.Ht)], [S.X(o.B / 2 + 0.2), S.Y(-0.2)], [S.X(-o.B / 2 - 0.2), S.Y(-0.2)]], 'sv-concrete');
    b += svg.poly([[S.X(-o.B / 2), S.Y(0)], [S.X(o.B / 2), S.Y(0)], [S.X(o.B / 2), S.Y(o.H)], [S.X(-o.B / 2), S.Y(o.H)]], 'sv-water');
    b += svg.line(S.X(-o.B / 2), S.Y(o.H), S.X(o.B / 2), S.Y(o.H), 'sv-wsurf');
    b += svg.dim(S.X(-o.B / 2), S.Y(0), S.X(o.B / 2), S.Y(0), `B = ${fmt(o.B, 2)} m`, 22);
    b += svg.dim(S.X(o.B / 2 + 0.2), S.Y(0), S.X(o.B / 2 + 0.2), S.Y(o.H), `H = ${fmt(o.H, 2)} m`, 24);
    return svg.frame(W, H, b, 'Sección de la cámara');
  }

  HC.register({
    id: 'desarenador',
    title: 'Desarenador',
    short: 'Desarenador',
    icon: 'desarenador',
    group: 'captacion',
    source: 'DISEÑO DESARENADOR.xlsx',
    description: 'Velocidad de escurrimiento (Camp), dimensiones de la cámara, velocidad de sedimentación (Arkhangelski, Newton y Stokes), tiempo de retención, longitud y transiciones.',
    tags: ['Sedimentación', 'Camp', 'Reynolds'],
    inputs: [
      {
        title: 'Datos de diseño', fields: [
          { id: 'dmm', label: 'Diámetro de la partícula', sym: 'd', unit: 'mm', value: 1.5, step: 0.05, help: 'Centrales hidroeléctricas ≈ 0.25 mm; sistemas de riego hasta 1.5 mm.' },
          { id: 'Q', label: 'Caudal de diseño', sym: 'Q', unit: 'L/s', value: 750, step: 10 },
          { id: 'B', label: 'Ancho de la cámara (asumido)', sym: 'B', unit: 'm', value: 1.5, step: 0.05 },
          { id: 'Hadop', label: 'Altura adoptada (0 = automática)', sym: 'H', unit: 'm', value: 0, step: 0.05 },
          { id: 'T1', label: 'Espejo de agua del canal de ingreso', sym: 'T_1', unit: 'm', value: 1.2, step: 0.05 },
          { id: 'ang', label: 'Ángulo de la transición', sym: '\\theta', unit: '°', value: 12.5, step: 0.5 }
        ]
      },
      {
        title: 'Propiedades del fluido y la partícula', fields: [
          { id: 'rho', label: 'Peso específico de la partícula', sym: '\\rho_s', unit: 'g/cm^3', value: 2.625, step: 0.005, help: 'Prácticamente invariable: 2.60–2.65.' },
          { id: 'c', label: 'Coeficiente de resistencia de los granos', sym: 'c', value: 0.5, step: 0.05, help: '0.5 para granos redondos.' },
          { id: 'nu', label: 'Viscosidad cinemática (×10⁻⁶)', sym: '\\nu', unit: 'm^2/s', value: 1.007, step: 0.001, help: 'Agua a 20 °C: 1.007×10⁻⁶ m²/s.' }
        ]
      },
      {
        title: 'Vertedero de salida', collapsed: true, fields: [
          { id: 'Cw', label: 'Coeficiente del vertedero', sym: 'C', value: 1.84, step: 0.01, help: 'Vertedero de pared delgada sin contracciones (Francis): 1.84.' }
        ]
      }
    ],
    presets: [{ name: 'Ejemplo del Excel (d = 1.5 mm, Q = 750 L/s)', values: {} }, { name: 'Central hidroeléctrica (d = 0.25 mm)', values: { dmm: 0.25, Q: 2000, B: 3.0 } }, { name: 'Partícula fina (d = 0.5 mm, Q = 300 L/s)', values: { dmm: 0.5, Q: 300, B: 1.2, T1: 0.8 } }],
    compute(v) {
      const d = new Doc();
      const checks = [];
      const Q = v.Q / 1000;
      if (!(Q > 0 && v.B > 0 && v.dmm > 0)) throw new Error('Q, B y d deben ser positivos.');

      d.h('Velocidad de escurrimiento (Camp)');
      const a = campA(v.dmm);
      d.table(['Diámetro', '$a$'], [['$d<0.1$ mm', '51'], ['$0.1\\leq d\\leq1$ mm', '44'], ['$d>1$ mm', '36']]);
      const Vd = a * Math.sqrt(v.dmm) / 100;
      d.calc({ sym: 'V_d', f: 'a\\sqrt{d}', sub: `${a}\\sqrt{${n(v.dmm)}}`, val: Vd * 100, unit: 'cm/s', d: 3 });
      d.calc({ sym: 'V_d', val: Vd, unit: 'm/s', d: 4 });
      const okVd = Vd >= 0.1 && Vd <= 0.6;
      d.check(`Velocidad lenta: $0.10\\leq V_d=${fmt(Vd)}\\leq0.60$ m/s`, okVd);
      checks.push({ label: 'Velocidad de escurrimiento lenta (0.10–0.60 m/s)', ok: okVd, detail: `Vd = ${fmt(Vd)} m/s` });

      d.h('Altura de la cámara');
      const Hc = Q / (Vd * v.B);
      d.calc({ sym: 'H', f: '\\dfrac{Q}{V_d\\,B}', sub: `\\dfrac{${n(Q)}}{${n(Vd, 4)}(${n(v.B)})}`, val: Hc, unit: 'm', d: 4 });
      const H = v.Hadop > 0 ? v.Hadop : ceilTo(Hc, 0.1);
      d.p(`Se adopta $H=${fmt(H, 2)}$ m.`);
      const rel = H / v.B;
      d.calc({ sym: 'H/B', sub: `${n(H)}/${n(v.B)}`, val: rel, d: 3 });
      const okHB = rel >= 0.8 - 1e-9 && rel <= 1 + 1e-9;
      d.check(`Relación $0.8\\leq H/B=${fmt(rel)}\\leq1.0$`, okHB);
      checks.push({ label: 'Relación H/B entre 0.8 y 1.0', ok: okHB, detail: `H/B = ${fmt(rel)}` });

      d.h('Tipo de flujo en la cámara');
      const V = Q / (H * v.B);
      d.calc({ sym: 'V', f: '\\dfrac{Q}{B\\,H}', sub: `\\dfrac{${n(Q)}}{${n(v.B)}(${n(H)})}`, val: V, unit: 'm/s', d: 4 });
      const Rh = v.B * H / (2 * H + v.B);
      d.calc({ sym: 'R_h', f: '\\dfrac{B\\,H}{B+2H}', sub: `\\dfrac{${n(v.B)}(${n(H)})}{${n(v.B)}+2(${n(H)})}`, val: Rh, unit: 'm', d: 4 });
      const nu = v.nu * 1e-6;
      const Re = V * Rh / nu;
      d.calc({ sym: 'Re', f: '\\dfrac{V\\,R_h}{\\nu}', sub: `\\dfrac{${n(V, 4)}(${n(Rh, 4)})}{${fmt(v.nu, 3)}\\times10^{-6}}`, val: Re, d: 0 });
      d.p(`Re ${Re < 2000 ? '< 2000: flujo **laminar**' : Re < 4000 ? 'entre 2000 y 4000: flujo **de transición**' : '> 4000: flujo **turbulento**'} en la cámara.`);

      d.h('Velocidad de sedimentación');
      d.h2('Tabla de Arkhangelski (régimen de transición)');
      const [p0, p1] = HC.interpBracket(VS_TAB, v.dmm);
      const VsT = interp(VS_TAB, v.dmm);
      d.calc({ sym: 'V_s', f: 'V_{s0}+\\dfrac{V_{s1}-V_{s0}}{d_1-d_0}(d-d_0)', sub: `${n(p0[1])}+\\dfrac{${n(p1[1])}-${n(p0[1])}}{${n(p1[0])}-${n(p0[0])}}(${n(v.dmm)}-${n(p0[0])})`, val: VsT, unit: 'cm/s', d: 3 });
      d.h2('Fórmula de Newton (régimen turbulento)');
      const VsN = vsTurb(v.dmm, v.rho, v.c);
      d.calc({ sym: 'V_s', f: '\\sqrt{\\dfrac{4}{3}\\,\\dfrac{g\\,(\\rho_s-1)\\,d}{c}}', sub: `\\sqrt{\\dfrac{4}{3}\\,\\dfrac{981(${n(v.rho)}-1)(${n(v.dmm / 10, 4)})}{${n(v.c)}}}`, val: VsN, unit: 'cm/s', d: 3, note: 'Con g = 981 cm/s² y d en cm (unidades consistentes).' });
      d.h2('Ley de Stokes (partículas finas)');
      const VsS = vsStokes(v.dmm, v.rho, v.nu);
      d.calc({ sym: 'V_s', f: '\\dfrac{g\\,(\\rho_s-1)\\,d^2}{18\\,\\nu}', sub: `\\dfrac{981(${n(v.rho)}-1)(${n(v.dmm / 10, 4)})^2}{18(${fmt(v.nu * 0.01, 5)})}`, val: VsS, unit: 'cm/s', d: 3 });
      const Rep = (VsT / 100) * (v.dmm / 1000) / nu;
      d.calc({ sym: 'Re_p', f: '\\dfrac{V_s\\,d}{\\nu}', sub: `\\dfrac{${n(VsT / 100, 4)}(${n(v.dmm / 1000, 5)})}{${fmt(v.nu, 3)}\\times10^{-6}}`, val: Rep, d: 1 });
      d.p(Rep < 1 ? 'Reynolds de partícula < 1: rige Stokes.' : Rep < 1000 ? 'Reynolds de partícula entre 1 y 1000: régimen de transición (tabla de Arkhangelski).' : 'Reynolds de partícula > 1000: régimen turbulento (Newton).');

      d.h('Tiempo de retención y longitud de la cámara');
      d.p('Coeficiente de seguridad $k$ en función de la velocidad de escurrimiento:');
      d.table(['$V_d$ (m/s)', '$k$'], K_TAB.map(([a1, b1]) => [fmt(a1), fmt(b1, 2)]));
      const k = Math.min(Math.max(interp(K_TAB, Vd), 1.0), 2.5);
      d.calc({ sym: 'k', val: k, d: 4, note: 'Interpolación lineal (adimensional).' });
      const cases = [['Arkhangelski', VsT], ['Newton', VsN]];
      if (v.dmm < 0.1) cases.push(['Stokes', VsS]);
      const Ls = cases.map(([name, Vs]) => {
        const ts = H / (Vs / 100);
        const L = k * Vd * ts;
        d.h2(`Con $V_s$ de ${name}`);
        d.calc({ sym: 't_s', f: '\\dfrac{H}{V_s}', sub: `\\dfrac{${n(H)}}{${n(Vs / 100, 5)}}`, val: ts, unit: 's', d: 3 });
        d.calc({ sym: 'L', f: 'k\\,V_d\\,t_s', sub: `${n(k, 4)}(${n(Vd, 4)})(${n(ts, 3)})`, val: L, unit: 'm', d: 3 });
        return { name, Vs, ts, L };
      });
      const Lmax = Math.max(...Ls.map((x) => x.L));
      const L = Math.ceil(Lmax - 1e-9);
      d.p(`Se adopta la longitud mayor, redondeada: $L=${fmt(L)}$ m.`);
      const okLB = L / v.B >= 3;
      d.check(`Relación de esbeltez $L/B=${fmt(L / v.B, 2)}\\geq3$`, okLB);
      checks.push({ label: 'Cámara alargada ($L/B\\geq3$)', ok: okLB, detail: `L/B = ${fmt(L / v.B, 2)}` });

      d.h('Transiciones de entrada y salida');
      const LTc = (v.B - v.T1) / (2 * Math.tan(rad(v.ang)));
      const LT = Math.max(ceilTo(LTc, 0.1), 0);
      d.calc({ sym: 'L_T', f: '\\dfrac{B-T_1}{2\\tan\\theta}', sub: `\\dfrac{${n(v.B)}-${n(v.T1)}}{2\\tan ${fmt(v.ang)}^\\circ}`, val: LTc, unit: 'm', d: 4, note: `Se adopta L_T = ${fmt(LT, 2)} m.` });

      d.h('Vertedero de salida');
      const hw = Math.pow(Q / (v.Cw * v.B), 2 / 3);
      d.calc({ sym: 'h', f: '\\left(\\dfrac{Q}{C\\,B}\\right)^{2/3}', sub: `\\left(\\dfrac{${n(Q)}}{${n(v.Cw)}(${n(v.B)})}\\right)^{2/3}`, val: hw, unit: 'm', d: 4 });
      const Vw = Q / (v.B * hw);
      d.calc({ sym: 'V_w', f: '\\dfrac{Q}{B\\,h}', sub: `\\dfrac{${n(Q)}}{${n(v.B)}(${n(hw, 4)})}`, val: Vw, unit: 'm/s', d: 3 });
      const okVw = Vw <= 1.0;
      d.check(`Velocidad sobre el vertedero $V_w=${fmt(Vw)}\\leq1.0$ m/s`, okVw);
      checks.push({ label: 'Velocidad sobre el vertedero ≤ 1.0 m/s', ok: okVw, detail: `V = ${fmt(Vw)} m/s` });

      const results = [
        { label: 'Velocidad de escurrimiento', sym: 'V_d', value: Vd, unit: 'm/s', d: 4, hl: true },
        { label: 'Altura de la cámara', sym: 'H', value: H, unit: 'm', d: 2, hl: true },
        { label: 'Ancho de la cámara', sym: 'B', value: v.B, unit: 'm', d: 2 },
        { label: 'Longitud de la cámara', sym: 'L', value: L, unit: 'm', d: 1, hl: true },
        { label: 'Vs (Arkhangelski)', sym: 'V_s', value: VsT, unit: 'cm/s' },
        { label: 'Vs (Newton)', sym: 'V_s', value: VsN, unit: 'cm/s' },
        { label: 'Reynolds de la cámara', sym: 'Re', value: Re, d: 0 },
        { label: 'Transición', sym: 'L_T', value: LT, unit: 'm', d: 2 },
        { label: 'Carga en el vertedero', sym: 'h', value: hw, unit: 'm', d: 3 }
      ];
      const ds = [];
      for (let x = 0.05; x <= 5.001; x *= 1.12) ds.push(x);
      const charts = [
        { id: 'plan', type: 'svg', wide: true, title: 'Dimensionamiento final (planta)', svg: drawPlan({ B: v.B, T1: v.T1, L, LT }) },
        { id: 'vs', type: 'xy', title: 'Velocidad de sedimentación según el diámetro', xLabel: 'd (mm)', yLabel: 'Vs (cm/s)', datasets: [
          { label: 'Arkhangelski (tabla)', data: VS_TAB.map(([x, y]) => ({ x, y })), color: '#2563eb', points: true },
          { label: 'Newton (turbulento)', data: ds.map((x) => ({ x, y: vsTurb(x, v.rho, v.c) })), color: '#d97706', dash: true },
          { label: 'Stokes (laminar)', data: ds.filter((x) => vsStokes(x, v.rho, v.nu) < 40).map((x) => ({ x, y: vsStokes(x, v.rho, v.nu) })), color: '#0d9488', dash: true },
          { label: `Partícula de diseño (${fmt(v.dmm)} mm)`, data: [{ x: v.dmm, y: VsT }], points: true, showLine: false, color: '#dc2626', pointRadius: 6 }] },
        { id: 'sec', type: 'svg', title: 'Sección transversal de la cámara', svg: drawSection({ B: v.B, H, Ht: H + 0.3 }) },
        { id: 'L', type: 'bar', title: 'Longitud requerida según el método', labels: Ls.map((x) => x.name), yLabel: 'L (m)', datasets: [{ label: 'L (m)', data: Ls.map((x) => x.L), color: '#7c3aed' }] }
      ];
      return { doc: d, results, checks, charts };
    },
    theory: [
      {
        title: 'Desarenador', body: [
          'Estructura que elimina las partículas en suspensión mayores que un diámetro de diseño, reduciendo la velocidad del agua para que se depositen en la cámara. En riego se acepta hasta 1.5 mm; en centrales hidroeléctricas, alrededor de 0.25 mm.',
          { eq: 'V_d=a\\sqrt{d}\\;\\;(\\mathrm{cm/s},\\ d\\ \\mathrm{en\\ mm})', name: 'Velocidad de escurrimiento (Camp)' },
          { table: { head: ['Diámetro', '$a$'], rows: [['$d<0.1$ mm', '51'], ['$0.1<d<1$ mm', '44'], ['$d>1$ mm', '36']] } },
          { eq: 'H=\\dfrac{Q}{V_d\\,B},\\qquad 0.8\\leq\\dfrac{H}{B}\\leq1.0', name: 'Altura de la cámara' }
        ]
      },
      {
        title: 'Velocidad de sedimentación', body: [
          { eq: 'V_s=\\dfrac{g\\,(\\rho_s-1)\\,d^2}{18\\,\\nu}', name: 'Stokes (Re_p < 1)' },
          { eq: 'V_s=\\sqrt{\\dfrac{4}{3}\\,\\dfrac{g\\,(\\rho_s-1)\\,d}{c}}', name: 'Newton (régimen turbulento)' },
          'Para el régimen de transición se usa la tabla de Arkhangelski ($V_s$ en cm/s según $d$ en mm).',
          { table: { head: ['$d$ (mm)', '$V_s$ (cm/s)'], rows: VS_TAB.map(([a, b]) => [String(a), String(b)]) } }
        ]
      },
      {
        title: 'Longitud y transiciones', body: [
          { eq: 't_s=\\dfrac{H}{V_s},\\qquad L=k\\,V_d\\,t_s=k\\,\\dfrac{H\\,V_d}{V_s}', name: 'Longitud de la cámara' },
          { table: { head: ['$V_d$ (m/s)', '$k$'], rows: K_TAB.map(([a, b]) => [String(a), String(b)]) } },
          { eq: 'L_T=\\dfrac{B-T_1}{2\\tan12.5^\\circ}', name: 'Longitud de la transición' },
          { eq: 'Q=C\\,B\\,h^{3/2}', name: 'Vertedero de salida' }
        ]
      }
    ],
    fixes: [
      'La fórmula de sedimentación turbulenta combinaba $g=9.81$ m/s² con $d$ en centímetros: $V_s$ salía 10 veces menor (2.53 cm/s en vez de 25.3 cm/s) y la longitud «turbulenta» de 39 m quedaba muy sobredimensionada. Aquí se usa $g=981$ cm/s².',
      'Las etiquetas $T_1$ y $T_2$ de la transición estaban intercambiadas (1.5 m es el ancho de la cámara y 1.2 m el espejo del canal).',
      'El coeficiente $k$ se rotulaba en «cm/s», pero es adimensional.',
      'Se agregan la ley de Stokes, el Reynolds de partícula para elegir el régimen, la relación $L/B$ y el vertedero de salida.'
    ]
  });
})();
