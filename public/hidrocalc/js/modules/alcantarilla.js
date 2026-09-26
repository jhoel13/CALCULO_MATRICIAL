/* Módulo: Alcantarilla de tubería — fuente: DISEÑO DE ALCANTARILLA.xlsx */
(function () {
  'use strict';
  const { fmt, n, circ, manningQ, bisect, Doc, svg, rad } = HC;

  /* Tabla de dimensiones (hoja «Dimensiones alcantarillas»). La fila «50"» del Excel se corrige a 60". */
  const DIMS = {
    '24"': { DI: 0.61, DE: 0.77, C: 0.46, H: 1.75, B: 0.88, J: 0.41, E: 0.57, DIY: 0.69, S1: 0.66, S2: 0.73, S3: 0.62, t: 0.4, Hmay: 1.45, Hmen: 0.9, a0: 0.81, b30: 1.12 },
    '30"': { DI: 0.76, DE: 0.94, C: 0.46, H: 1.91, B: 0.96, J: 0.67, E: 0.83, DIY: 0.85, S1: 0.7, S2: 0.8, S3: 0.66, t: 0.4, Hmay: 1.61, Hmen: 0.9, a0: 1.07, b30: 1.42 },
    '36"': { DI: 0.91, DE: 1.11, C: 0.46, H: 2.07, B: 1.04, J: 0.93, E: 1.09, DIY: 1.01, S1: 0.74, S2: 0.87, S3: 0.7, t: 0.4, Hmay: 1.77, Hmen: 0.9, a0: 1.33, b30: 1.72 },
    '42"': { DI: 1.07, DE: 1.29, C: 0.46, H: 2.24, B: 1.12, J: 1.21, E: 1.37, DIY: 1.18, S1: 0.78, S2: 0.94, S3: 0.74, t: 0.4, Hmay: 1.94, Hmen: 1.0, a0: 1.61, b30: 2.04 },
    '48"': { DI: 1.22, DE: 1.48, C: 0.46, H: 2.41, B: 1.21, J: 1.47, E: 1.63, DIY: 1.35, S1: 0.83, S2: 1.02, S3: 0.78, t: 0.4, Hmay: 2.11, Hmen: 1.0, a0: 1.87, b30: 2.34 },
    '54"': { DI: 1.37, DE: 1.65, C: 0.46, H: 2.57, B: 1.29, J: 1.74, E: 1.9, DIY: 1.51, S1: 0.87, S2: 1.09, S3: 0.82, t: 0.4, Hmay: 2.27, Hmen: 1.1, a0: 2.14, b30: 2.66 },
    '60"': { DI: 1.52, DE: 1.82, C: 0.46, H: 2.73, B: 1.37, J: 2.0, E: 2.16, DIY: 1.67, S1: 0.91, S2: 1.17, S3: 0.86, t: 0.4, Hmay: 2.43, Hmen: 1.1, a0: 2.4, b30: 2.96 },
    '72"': { DI: 1.83, DE: 2.19, C: 0.46, H: 3.07, B: 1.54, J: 2.54, E: 2.65, DIY: 2.01, S1: 1.0, S2: 1.33, S3: 0.95, t: 0.4, Hmay: 2.77, Hmen: 1.1, a0: 2.94, b30: 3.52 },
    '80"': { DI: 2.14, DE: 2.56, C: 0.46, H: 3.41, B: 1.71, J: 3.08, E: 3.14, DIY: 2.35, S1: 1.09, S2: 1.49, S3: 1.04, t: 0.4, Hmay: 3.11, Hmen: 1.1, a0: 3.48, b30: 4.08 },
    '85"': { DI: 2.45, DE: 2.93, C: 0.46, H: 3.75, B: 1.88, J: 3.62, E: 3.63, DIY: 2.69, S1: 1.18, S2: 1.65, S3: 1.13, t: 0.4, Hmay: 3.45, Hmen: 1.1, a0: 4.02, b30: 4.64 }
  };
  const ITEMS = [
    ['Limpieza inicial', 'm2'], ['Trazo y nivelación', 'm2'], ['Corte de terreno natural', 'm3'], ['Mejoramiento con material selecto', 'm3'],
    ['Eliminación de material excedente', 'm3'], ['Concreto en cabezales', 'm3'], ['Concreto en aletones', 'm3'], ['Concreto en losa-cortina', 'm3'],
    ['Concreto en diente de cortina', 'm3'], ['Tubería (unidad comercial)', 'und']
  ];

  function drawElevation(o) {
    const W = 600, H = 300;
    const tot = o.Wc + 2 * o.Lal * 0.6;
    const S = svg.scaler(-tot / 2 - 0.3, tot / 2 + 0.3, -o.EL - 0.3, o.Hc + 0.4, W, H, 30);
    let b = '';
    const x0 = -o.Wc / 2, x1 = o.Wc / 2;
    b += `<rect x="${S.X(-tot / 2 - 0.3)}" y="${S.Y(0)}" width="${S.X(tot / 2 + 0.3) - S.X(-tot / 2 - 0.3)}" height="${S.Y(-o.EL - 0.3) - S.Y(0)}" class="sv-soil"/>`;
    b += svg.poly([[S.X(x0 - o.Lal * 0.6), S.Y(o.Hmen)], [S.X(x0), S.Y(o.Hmay)], [S.X(x0), S.Y(0)], [S.X(x0 - o.Lal * 0.6), S.Y(0)]], 'sv-concrete');
    b += svg.poly([[S.X(x1 + o.Lal * 0.6), S.Y(o.Hmen)], [S.X(x1), S.Y(o.Hmay)], [S.X(x1), S.Y(0)], [S.X(x1 + o.Lal * 0.6), S.Y(0)]], 'sv-concrete');
    b += svg.poly([[S.X(x0), S.Y(0)], [S.X(x1), S.Y(0)], [S.X(x1), S.Y(o.Hc)], [S.X(x0), S.Y(o.Hc)]], 'sv-concrete-p');
    let xc = x0 + o.SP + o.DE / 2;
    for (let i = 0; i < o.N; i++) {
      b += `<circle cx="${S.X(xc)}" cy="${S.Y(o.DE / 2)}" r="${o.DE / 2 * S.s}" class="sv-line" fill="var(--surface)"/><circle cx="${S.X(xc)}" cy="${S.Y(o.DE / 2)}" r="${o.DI / 2 * S.s}" class="sv-thin"/>`;
      b += `<path class="sv-water" d="M ${S.X(xc - o.DI / 2 * 0.85)} ${S.Y(o.DE / 2 - o.DI * 0.2)} A ${o.DI / 2 * S.s} ${o.DI / 2 * S.s} 0 0 0 ${S.X(xc + o.DI / 2 * 0.85)} ${S.Y(o.DE / 2 - o.DI * 0.2)} Z"/>`;
      xc += o.DE + o.S;
    }
    b += svg.dim(S.X(x0), S.Y(-o.EL), S.X(x1), S.Y(-o.EL), `Ancho = ${fmt(o.Wc)} m`, 18);
    b += svg.dim(S.X(x1 + o.Lal * 0.6) + 8, S.Y(0), S.X(x1 + o.Lal * 0.6) + 8, S.Y(o.Hc), `H = ${fmt(o.Hc)} m`, 16);
    b += svg.txt(S.X(0), S.Y(o.Hc) - 8, `Cabezal · ${o.N} × Ø${o.D}`, 'sv-label');
    b += svg.txt(S.X(x0 - o.Lal * 0.3), S.Y(o.Hmen) - 8, 'aletón', 'sv-small');
    b += svg.txt(S.X(x1 + o.Lal * 0.3), S.Y(o.Hmen) - 8, 'aletón', 'sv-small');
    return svg.frame(W, H, b, 'Elevación del cabezal');
  }
  function drawTrench(o) {
    const W = 560, H = 300;
    const S = svg.scaler(-o.Wexc / 2 - 0.8, o.Wexc / 2 + 0.8, -0.3, o.Hexc + 0.4, W, H, 30);
    let b = '';
    const xl = -o.Wexc / 2, xr = o.Wexc / 2;
    b += `<rect x="${S.X(-o.Wexc / 2 - 0.8)}" y="${S.Y(o.Hexc)}" width="${S.X(o.Wexc / 2 + 0.8) - S.X(-o.Wexc / 2 - 0.8)}" height="${S.Y(-0.3) - S.Y(o.Hexc)}" class="sv-soil"/>`;
    b += `<rect x="${S.X(xl)}" y="${S.Y(o.Hexc)}" width="${(xr - xl) * S.s}" height="${o.Hexc * S.s}" fill="var(--surface-2)" class="sv-thin"/>`;
    b += `<rect x="${S.X(xl)}" y="${S.Y(o.EL)}" width="${(xr - xl) * S.s}" height="${o.EL * S.s}" fill="var(--sv-soil)" opacity=".9"/>`;
    let xc = xl + o.SP + o.DE / 2;
    for (let i = 0; i < o.N; i++) { b += `<circle cx="${S.X(xc)}" cy="${S.Y(o.EL + o.DE / 2)}" r="${o.DE / 2 * S.s}" class="sv-concrete"/><circle cx="${S.X(xc)}" cy="${S.Y(o.EL + o.DE / 2)}" r="${o.DI / 2 * S.s}" fill="var(--surface)" class="sv-thin"/>`; xc += o.DE + o.S; }
    b += svg.line(S.X(xl - 0.8), S.Y(o.Hexc), S.X(xr + 0.8), S.Y(o.Hexc), 'sv-line');
    b += svg.dim(S.X(xl), S.Y(0), S.X(xr), S.Y(0), `W = ${fmt(o.Wexc)} m`, 16);
    b += svg.dim(S.X(xr), S.Y(0), S.X(xr), S.Y(o.EL), `EL = ${fmt(o.EL)}`, 22);
    b += svg.dim(S.X(xr), S.Y(o.EL + o.DE), S.X(xr), S.Y(o.Hexc), `hs = ${fmt(o.hs)}`, 22);
    b += svg.dim(S.X(xl), S.Y(0), S.X(xl), S.Y(o.Hexc), `Hexc = ${fmt(o.Hexc)} m`, -24);
    b += svg.txt(S.X(0), S.Y(o.Hexc) - 8, 'Relleno con material selecto', 'sv-small');
    return svg.frame(W, H, b, 'Sección de excavación');
  }

  HC.register({
    id: 'alcantarilla',
    title: 'Alcantarilla de tubería',
    short: 'Alcantarilla',
    icon: 'alcantarilla',
    group: 'obras',
    source: 'DISEÑO DE ALCANTARILLA.xlsx',
    description: 'Dimensiones tipo de cabezales y aletones (24" a 85"), metrados de movimiento de tierras y concreto, presupuesto y verificación hidráulica de la tubería.',
    tags: ['Metrados', 'Presupuesto', 'Tubería'],
    inputs: [
      {
        title: 'Tubería', fields: [
          { id: 'D', label: 'Diámetro nominal', type: 'select', value: '36"', options: Object.keys(DIMS) },
          { id: 'N', label: 'Número de alcantarillas', sym: 'N', value: 1, step: 1, min: 1 },
          { id: 'L', label: 'Longitud de alcantarilla', sym: 'L', unit: 'm', value: 6, step: 0.5 },
          { id: 'Lt', label: 'Longitud comercial del tubo', sym: 'L_t', unit: 'm', value: 6, step: 0.5 }
        ]
      },
      {
        title: 'Excavación y relleno', fields: [
          { id: 'cEL', label: 'Coef. de lecho (EL = c·DE)', sym: 'c', value: 0.17, step: 0.01, help: 'Lecho de arena clase B bajo la tubería.' },
          { id: 'hs', label: 'Relleno sobre la tubería', sym: 'h_s', unit: 'm', value: 0.61, step: 0.05 },
          { id: 'S', label: 'Separación entre tubos', sym: 'S', unit: 'm', value: 0.4, step: 0.05 },
          { id: 'SP', label: 'Separación tubo–pared de corte', sym: 'S_P', unit: 'm', value: 0.4, step: 0.05 },
          { id: 'fe', label: 'Factor de esponjamiento', sym: 'f_e', value: 1.3, step: 0.05 },
          { id: 'sob', label: 'Sobreancho de excavación', unit: 'm', value: 0.2, step: 0.05 }
        ]
      },
      {
        title: 'Cabezal, losa y aletones', collapsed: true, fields: [
          { id: 'tl', label: 'Espesor de losa-cortina', sym: 't_c', unit: 'm', value: 0.3, step: 0.05 },
          { id: 'pd', label: 'Profundidad del diente', sym: 'h_d', unit: 'm', value: 1.1, step: 0.05 },
          { id: 'td', label: 'Espesor del diente', sym: 't_d', unit: 'm', value: 0.4, step: 0.05 },
          { id: 'fie', label: 'Ángulo de aletón a la entrada', sym: '\\phi_e', unit: '°', value: 30, step: 5 },
          { id: 'fis', label: 'Ángulo de aletón a la salida', sym: '\\phi_s', unit: '°', value: 45, step: 5 },
          { id: 'L0', label: 'Proyección del aletón', sym: 'L_0', unit: 'm', value: 2.03, step: 0.05, help: 'Longitud del aletón medida perpendicular al cabezal (2.03 m en el Excel).' }
        ]
      },
      {
        title: 'Verificación hidráulica', fields: [
          { id: 'Q', label: 'Caudal de diseño', sym: 'Q', unit: 'm^3/s', value: 1.0, step: 0.1 },
          { id: 'nt', label: 'Rugosidad de la tubería', sym: 'n', value: 0.013, step: 0.001, help: 'Concreto 0.013; metal corrugado 0.024.' },
          { id: 'St', label: 'Pendiente de la tubería', sym: 'S', unit: 'm/m', value: 0.01, step: 0.001 }
        ]
      },
      {
        title: 'Precios unitarios', collapsed: true, fields: [
          { id: 'pu', type: 'table', fixed: true, label: 'Precio unitario por partida (moneda local)', value: ITEMS.map(([it, u]) => ({ item: it, u, mat: 0, mo: 0, tr: 0 })),
            columns: [{ id: 'item', label: 'Partida', readonly: true }, { id: 'u', label: 'Und', readonly: true }, { id: 'mat', label: 'Materiales' }, { id: 'mo', label: 'Mano de obra' }, { id: 'tr', label: 'Transporte' }] }
        ]
      }
    ],
    presets: Object.keys(DIMS).map((k) => ({ name: `Alcantarilla simple Ø${k}`, values: { D: k, N: 1 } })).concat([{ name: 'Batería de 2 tubos Ø48"', values: { D: '48"', N: 2, L: 8, Q: 4 } }]),
    compute(v) {
      const d = new Doc();
      const T = DIMS[v.D];
      if (!T) throw new Error('Diámetro no disponible.');
      const N = Math.max(1, Math.round(v.N));
      const r3 = (x) => Math.ceil(x * 1000 - 1e-9) / 1000;
      const r2 = (x) => Math.ceil(x * 100 - 1e-9) / 100;

      d.h('Dimensiones tipo del tubo, cabezal y aletón');
      d.p(`De la tabla de dimensiones para Ø${v.D}:`);
      d.table(['D.I. (m)', 'D.E. (m)', 'Corona (m)', 'Altura H (m)', 'Base (m)', 'J (m)', 'E (m)', 'Esp. aletón (m)', 'H mayor (m)', 'H menor (m)', 'a 0° (m)', 'b 30° (m)'],
        [[T.DI, T.DE, T.C, T.H, T.B, T.J, T.E, T.t, T.Hmay, T.Hmen, T.a0, T.b30].map((x) => fmt(x, 2))]);

      d.h('Geometría de la excavación');
      const EL = Math.round(v.cEL * T.DE * 100) / 100;
      d.calc({ sym: 'E_L', f: 'c\\,D_E', sub: `${n(v.cEL)}(${n(T.DE)})`, val: EL, unit: 'm', d: 2, note: 'Lecho de arena clase B (redondeado a cm).' });
      const W = N * (T.DE + v.S) - v.S + 2 * v.SP;
      d.calc({ sym: 'W', f: 'N(D_E+S)-S+2S_P', sub: `${N}(${n(T.DE)}+${n(v.S)})-${n(v.S)}+2(${n(v.SP)})`, val: W, unit: 'm', d: 3 });
      const Hexc = EL + T.DE + v.hs;
      d.calc({ sym: 'H_{exc}', f: 'E_L+D_E+h_s', sub: `${n(EL)}+${n(T.DE)}+${n(v.hs)}`, val: Hexc, unit: 'm', d: 3 });

      d.h('Obras preliminares');
      const Alim = r2((W + 2) * (v.L + 4));
      d.calc({ sym: 'A_{limp}', f: '(W+2)(L+4)', sub: `(${n(W)}+2)(${n(v.L)}+4)`, val: Alim, unit: 'm^2', d: 2 });
      d.p('El trazo y nivelación se mide sobre la misma área.');

      d.h('Movimiento de tierras');
      d.h2('Corte para la tubería');
      const Vct = W * Hexc * (v.L + 2);
      d.calc({ sym: 'V_{c,t}', f: 'W\\,H_{exc}\\,(L+2)', sub: `${n(W)}(${n(Hexc)})(${n(v.L)}+2)`, val: Vct, unit: 'm^3', d: 3 });
      d.h2('Corte para aletones (4 aletones)');
      const Vca = (T.t + 2 * v.sob) * T.Hmay * T.b30 * 4;
      d.calc({ sym: 'V_{c,a}', f: '4\\,(t_a+2s)\\,H_{may}\\,b_{30}', sub: `4(${n(T.t)}+2(${n(v.sob)}))(${n(T.Hmay)})(${n(T.b30)})`, val: Vca, unit: 'm^3', d: 3 });
      d.h2('Corte para dientes de cortina (entrada y salida)');
      const ad = T.a0 - T.J + 2 * v.sob;
      const Ld = N * (T.DE + v.S) - v.S + T.b30 * Math.sin(Math.PI / 6) * 2 + 2 * v.sob;
      const Vcd = ad * v.pd * Ld * 2;
      d.calc({ sym: 'a_d', f: 'a_{0}-J+2s', sub: `${n(T.a0)}-${n(T.J)}+2(${n(v.sob)})`, val: ad, unit: 'm', d: 3 });
      d.calc({ sym: 'L_d', f: 'N(D_E+S)-S+2\\,b_{30}\\sin 30^\\circ+2s', sub: `${N}(${n(T.DE)}+${n(v.S)})-${n(v.S)}+2(${n(T.b30)})(0.5)+2(${n(v.sob)})`, val: Ld, unit: 'm', d: 3 });
      d.calc({ sym: 'V_{c,d}', f: '2\\,a_d\\,h_d\\,L_d', sub: `2(${n(ad)})(${n(v.pd)})(${n(Ld)})`, val: Vcd, unit: 'm^3', d: 3 });
      const Vc = r3(Vct + Vca + Vcd);
      d.calc({ sym: 'V_{corte}', f: 'V_{c,t}+V_{c,a}+V_{c,d}', sub: `${n(Vct)}+${n(Vca)}+${n(Vcd)}`, val: Vc, unit: 'm^3', d: 3 });
      d.h2('Relleno con material selecto');
      const Atubos = N * Math.PI * T.DE * T.DE / 4;
      const Vr = r3((W * Hexc - Atubos) * v.L * v.fe);
      d.calc({ sym: 'A_{tubos}', f: 'N\\,\\dfrac{\\pi D_E^2}{4}', sub: `${N}\\dfrac{\\pi(${n(T.DE)})^2}{4}`, val: Atubos, unit: 'm^2', d: 4 });
      d.calc({ sym: 'V_{relleno}', f: '\\left(W\\,H_{exc}-A_{tubos}\\right)L\\,f_e', sub: `(${n(W)}(${n(Hexc)})-${n(Atubos, 4)})(${n(v.L)})(${n(v.fe)})`, val: Vr, unit: 'm^3', d: 3 });
      d.h2('Eliminación de material excedente');
      const Ve = r3(Vc * v.fe);
      d.calc({ sym: 'V_{elim}', f: 'V_{corte}\\,f_e', sub: `${n(Vc)}(${n(v.fe)})`, val: Ve, unit: 'm^3', d: 3 });

      d.h('Concreto');
      d.h2('Cabezales (entrada y salida)');
      const Acab = (T.B + T.C) * T.H / 2;
      d.calc({ sym: 'A_{cab}', f: '\\dfrac{(B+C)\\,H}{2}', sub: `\\dfrac{(${n(T.B)}+${n(T.C)})(${n(T.H)})}{2}`, val: Acab, unit: 'm^2', d: 4 });
      const Vcab1 = Acab * W - Atubos * T.C;
      d.calc({ sym: 'V_{cab,1}', f: 'A_{cab}\\,W-A_{tubos}\\,C', sub: `${n(Acab, 4)}(${n(W)})-${n(Atubos, 4)}(${n(T.C)})`, val: Vcab1, unit: 'm^3', d: 3 });
      const Vcab = r3(2 * Vcab1);
      d.calc({ sym: 'V_{cab}', f: '2\\,V_{cab,1}', sub: `2(${n(Vcab1)})`, val: Vcab, unit: 'm^3', d: 3 });
      d.h2('Losa-cortina');
      const w1e = Math.round((W + 2 * T.E * Math.tan(rad(v.fie))) * 100) / 100;
      const Vle = (W + w1e) / 2 * T.E * v.tl;
      d.calc({ sym: 'B_e', f: 'W+2E\\tan\\phi_e', sub: `${n(W)}+2(${n(T.E)})\\tan ${fmt(v.fie)}^\\circ`, val: w1e, unit: 'm', d: 2 });
      d.calc({ sym: 'V_{l,e}', f: '\\dfrac{W+B_e}{2}\\,E\\,t_c', sub: `\\dfrac{${n(W)}+${n(w1e)}}{2}(${n(T.E)})(${n(v.tl)})`, val: Vle, unit: 'm^3', d: 3 });
      const w1s = Math.round((W + 2 * T.J * Math.tan(rad(v.fis))) * 100) / 100;
      const Vls = (W + w1s) / 2 * T.J * v.tl;
      d.calc({ sym: 'B_s', f: 'W+2J\\tan\\phi_s', sub: `${n(W)}+2(${n(T.J)})\\tan ${fmt(v.fis)}^\\circ`, val: w1s, unit: 'm', d: 2 });
      d.calc({ sym: 'V_{l,s}', f: '\\dfrac{W+B_s}{2}\\,J\\,t_c', sub: `\\dfrac{${n(W)}+${n(w1s)}}{2}(${n(T.J)})(${n(v.tl)})`, val: Vls, unit: 'm^3', d: 3 });
      const Vl = r3(Vle + Vls);
      d.calc({ sym: 'V_{losa}', val: Vl, unit: 'm^3', d: 3 });
      d.h2('Diente de cortina');
      const Lde = Math.round((w1e + 2 * v.td * Math.tan(rad(v.fie))) * 100) / 100;
      const Vde = (w1e + Lde) / 2 * v.td * v.pd;
      d.calc({ sym: 'V_{d,e}', f: '\\dfrac{B_e+(B_e+2t_d\\tan\\phi_e)}{2}\\,t_d\\,h_d', sub: `\\dfrac{${n(w1e)}+${n(Lde)}}{2}(${n(v.td)})(${n(v.pd)})`, val: Vde, unit: 'm^3', d: 3 });
      const Lds = Math.round((w1s + 2 * v.td * Math.tan(rad(v.fis))) * 100) / 100;
      const Vds = (w1s + Lds) / 2 * v.td * v.pd;
      d.calc({ sym: 'V_{d,s}', f: '\\dfrac{B_s+(B_s+2t_d\\tan\\phi_s)}{2}\\,t_d\\,h_d', sub: `\\dfrac{${n(w1s)}+${n(Lds)}}{2}(${n(v.td)})(${n(v.pd)})`, val: Vds, unit: 'm^3', d: 3 });
      const Vd = r3(Vde + Vds);
      d.calc({ sym: 'V_{diente}', val: Vd, unit: 'm^3', d: 3 });
      d.h2('Aletones');
      const Lae = Math.round(v.L0 / Math.cos(rad(v.fie)) * 100) / 100;
      const Las = Math.round(v.L0 / Math.cos(rad(v.fis)) * 100) / 100;
      d.calc({ sym: 'L_{a,e}', f: '\\dfrac{L_0}{\\cos\\phi_e}', sub: `\\dfrac{${n(v.L0)}}{\\cos ${fmt(v.fie)}^\\circ}`, val: Lae, unit: 'm', d: 2 });
      const Vae = 2 * (T.Hmay + T.Hmen) / 2 * Lae * T.t;
      d.calc({ sym: 'V_{a,e}', f: '2\\cdot\\dfrac{H_{may}+H_{men}}{2}\\,L_{a,e}\\,t_a', sub: `2\\cdot\\dfrac{${n(T.Hmay)}+${n(T.Hmen)}}{2}(${n(Lae)})(${n(T.t)})`, val: Vae, unit: 'm^3', d: 3 });
      d.calc({ sym: 'L_{a,s}', f: '\\dfrac{L_0}{\\cos\\phi_s}', sub: `\\dfrac{${n(v.L0)}}{\\cos ${fmt(v.fis)}^\\circ}`, val: Las, unit: 'm', d: 2 });
      const Vas = 2 * (T.Hmay + T.Hmen) / 2 * Las * T.t;
      d.calc({ sym: 'V_{a,s}', f: '2\\cdot\\dfrac{H_{may}+H_{men}}{2}\\,L_{a,s}\\,t_a', sub: `2\\cdot\\dfrac{${n(T.Hmay)}+${n(T.Hmen)}}{2}(${n(Las)})(${n(T.t)})`, val: Vas, unit: 'm^3', d: 3 });
      const Va = r3(Vae + Vas);
      d.calc({ sym: 'V_{aletones}', val: Va, unit: 'm^3', d: 3 });
      const Vconc = Vcab + Va + Vl + Vd;
      d.calc({ sym: 'V_{concreto}', f: 'V_{cab}+V_{aletones}+V_{losa}+V_{diente}', sub: `${n(Vcab)}+${n(Va)}+${n(Vl)}+${n(Vd)}`, val: Vconc, unit: 'm^3', d: 3 });
      d.h2('Tubería');
      const nt = N * Math.ceil(v.L / v.Lt - 1e-9);
      d.calc({ sym: 'n_{tubos}', f: 'N\\left\\lceil \\dfrac{L}{L_t}\\right\\rceil', sub: `${N}\\left\\lceil \\dfrac{${n(v.L)}}{${n(v.Lt)}}\\right\\rceil`, val: nt, unit: 'und', d: 0 });

      // presupuesto
      const qty = [Alim, Alim, Vc, Vr, Ve, Vcab, Va, Vl, Vd, nt];
      d.h('Presupuesto');
      let total = 0;
      const prow = qty.map((q, i) => {
        const p = v.pu[i] || { mat: 0, mo: 0, tr: 0 };
        const pu = (+p.mat || 0) + (+p.mo || 0) + (+p.tr || 0);
        const ct = pu * q;
        total += ct;
        return { name: ITEMS[i][0], u: ITEMS[i][1], q, pu, ct };
      });
      d.table(['Partida', 'Und', 'Metrado', 'P.U.', 'Parcial'], prow.map((r) => [r.name, r.u.replace('2', '²').replace('3', '³'), fmt(r.q, 3), fmt(r.pu, 2), fmt(r.ct, 2)]).concat([['**Costo directo**', '', '', '', `**${fmt(total, 2)}**`]]));
      if (total === 0) d.note('Ingrese los precios unitarios (materiales, mano de obra y transporte) en el panel «Precios unitarios» para obtener el costo directo.', 'warn');

      // hidráulica
      d.h('Verificación hidráulica de la tubería');
      const Di = T.DI, q1 = v.Q / N;
      const Afull = Math.PI * Di * Di / 4;
      const Qll = manningQ(Afull, Di / 4, v.St, v.nt);
      d.calc({ sym: 'Q_{ll}', f: '\\dfrac{1}{n}\\,\\dfrac{\\pi D_I^2}{4}\\left(\\dfrac{D_I}{4}\\right)^{2/3}S^{1/2}', sub: `\\dfrac{1}{${n(v.nt, 4)}}\\dfrac{\\pi(${n(Di)})^2}{4}\\left(\\dfrac{${n(Di)}}{4}\\right)^{2/3}(${n(v.St, 4)})^{1/2}`, val: Qll, unit: 'm^3/s', d: 3 });
      d.calc({ sym: 'Q_1', f: 'Q/N', sub: `${n(v.Q)}/${N}`, val: q1, unit: 'm^3/s', d: 3 });
      const rel = q1 / Qll;
      d.calc({ sym: 'Q_1/Q_{ll}', val: rel, d: 3 });
      let yD = NaN, Vt = NaN;
      const checks = [];
      if (rel <= 1.0) {
        const yy = bisect((y) => { const g = circ(Di, y); return manningQ(g.A, g.R, v.St, v.nt) - q1; }, 1e-6 * Di, 0.938 * Di);
        const g = circ(Di, yy);
        yD = yy / Di; Vt = q1 / g.A;
        d.calc({ sym: 'y', val: yy, unit: 'm', d: 3, note: 'Tirante en la tubería (lámina libre).' });
        d.calc({ sym: 'y/D_I', val: yD, d: 3 });
        d.calc({ sym: 'V', f: 'Q_1/A', sub: `${n(q1)}/${n(g.A, 4)}`, val: Vt, unit: 'm/s', d: 3 });
      } else {
        d.note('El caudal supera la capacidad a tubo lleno: la alcantarilla trabajaría a presión. Aumente el diámetro o el número de tubos.', 'warn');
      }
      const okCap = rel <= 0.8;
      d.check(`Capacidad con lámina libre: $Q_1/Q_{ll}=${fmt(rel)}\\leq 0.80$`, okCap);
      checks.push({ label: 'Capacidad de la tubería ($Q_1 \\leq 0.8\\,Q_{ll}$)', ok: okCap, detail: `Q₁/Qll = ${fmt(rel)}` });
      if (Number.isFinite(Vt)) {
        const okV = Vt >= 0.6 && Vt <= 5;
        d.check(`Velocidad de autolimpieza y no erosión: $0.6\\leq V=${fmt(Vt)}\\leq 5$ m/s`, okV);
        checks.push({ label: 'Velocidad en la tubería entre 0.6 y 5 m/s', ok: okV, detail: `V = ${fmt(Vt)} m/s` });
      }

      const results = [
        { label: 'Ancho de excavación', sym: 'W', value: W, unit: 'm', d: 3 },
        { label: 'Corte total', sym: 'V_{corte}', value: Vc, unit: 'm^3', hl: true },
        { label: 'Relleno selecto', sym: 'V_{rell}', value: Vr, unit: 'm^3' },
        { label: 'Eliminación', sym: 'V_{elim}', value: Ve, unit: 'm^3' },
        { label: 'Concreto total', sym: 'V_{conc}', value: Vconc, unit: 'm^3', hl: true },
        { label: 'Tubos', value: `${nt} und Ø${v.D}` },
        { label: 'Capacidad a tubo lleno (1 tubo)', sym: 'Q_{ll}', value: Qll, unit: 'm^3/s' },
        { label: 'Costo directo', value: total, d: 2, hl: true }
      ];
      const geo = { N, DE: T.DE, DI: T.DI, S: v.S, SP: v.SP, EL, hs: v.hs, Hc: T.H, Hmay: T.Hmay, Hmen: T.Hmen, Lal: Lae, Wc: W, Wexc: W, Hexc, D: v.D };
      const charts = [
        { id: 'elev', type: 'svg', title: 'Elevación del cabezal con aletones', svg: drawElevation(geo) },
        { id: 'zanja', type: 'svg', title: 'Sección de excavación y relleno', svg: drawTrench(geo) },
        { id: 'vol', type: 'bar', title: 'Metrados de movimiento de tierras y concreto', labels: ['Corte', 'Relleno', 'Eliminación', 'Cabezales', 'Aletones', 'Losa', 'Diente'], yLabel: 'Volumen (m³)', datasets: [{ label: 'Volumen (m³)', data: [Vc, Vr, Ve, Vcab, Va, Vl, Vd], color: '#2563eb' }] }
      ];
      if (total > 0) charts.push({ id: 'cost', type: 'bar', title: 'Costo parcial por partida', labels: prow.map((r) => r.name.split(' ').slice(0, 2).join(' ')), yLabel: 'Costo', datasets: [{ label: 'Costo parcial', data: prow.map((r) => r.ct), color: '#0d9488' }] });
      return { doc: d, results, checks, charts };
    },
    theory: [
      {
        title: 'Alcantarillas', body: [
          'Una alcantarilla permite el cruce de un curso de agua (quebrada, dren o canal) bajo un camino o un terraplén. Se compone de la tubería, los cabezales de entrada y salida, los aletones que encauzan el flujo, la losa de fondo (cortina) y un diente que evita la socavación y la tubificación.',
          { list: ['El lecho de arena (clase B) bajo la tubería reparte las cargas: espesor $E_L\\approx0.17\\,D_E$.', 'El relleno mínimo sobre la clave protege el tubo de las cargas de tránsito (≥ 0.60 m).', 'Los aletones de entrada suelen colocarse a 30° y los de salida a 45° para expandir el flujo.'] }
        ]
      },
      {
        title: 'Metrados', body: [
          { eq: 'W=N(D_E+S)-S+2S_P', name: 'Ancho de excavación' },
          { eq: 'V_{corte}=W\\,(E_L+D_E+h_s)(L+2)+V_{aletones}+V_{dientes}', name: 'Volumen de corte' },
          { eq: 'V_{relleno}=\\left[W(E_L+D_E+h_s)-N\\dfrac{\\pi D_E^2}{4}\\right]L\\,f_e', name: 'Relleno con material selecto' },
          { eq: 'V_{cab}=2\\left[\\dfrac{(B+C)H}{2}W-N\\dfrac{\\pi D_E^2}{4}C\\right]', name: 'Concreto en cabezales' },
          { eq: 'V_{aletón}=2\\cdot\\dfrac{H_{may}+H_{men}}{2}\\,\\dfrac{L_0}{\\cos\\phi}\\,t_a', name: 'Concreto de un par de aletones' }
        ]
      },
      {
        title: 'Capacidad hidráulica', body: [
          'Para flujo con lámina libre se verifica que el caudal por tubo no supere el 80 % de la capacidad a tubo lleno:',
          { eq: 'Q_{ll}=\\dfrac{1}{n}\\,\\dfrac{\\pi D^2}{4}\\left(\\dfrac{D}{4}\\right)^{2/3}S^{1/2}', name: 'Caudal a tubo lleno' },
          { eq: '\\dfrac{Q}{N}\\leq 0.8\\,Q_{ll},\\qquad 0.6\\leq V\\leq 5\\ \\mathrm{m/s}', name: 'Criterios de verificación' }
        ]
      }
    ],
    fixes: [
      'En la tabla de dimensiones había un diámetro «50"» entre 54" y 72" con valores de 60" (D.I. = 1.52 m = 60"). Se corrigió a 60".',
      'El volumen de aletones usaba el espesor del diente de cortina (celda K11) en lugar del espesor del aletón de la tabla (columna «Espesor»). Aquí se usa el espesor del aletón.',
      'El corte de los dientes usaba una altura fija de 0.91 m escrita a mano. Aquí se usa la profundidad del diente, que el usuario puede ingresar.',
      'La proyección de 2.03 m del aletón estaba escrita dentro de la fórmula. Ahora es un dato editable ($L_0$).',
      'El presupuesto tenía todos los precios en cero y no calculaba nada. Ahora los precios se ingresan en una tabla y se obtiene el costo directo con su gráfico.',
      'Se agrega la verificación hidráulica (capacidad a tubo lleno, tirante y velocidad), que no existía en el Excel.'
    ]
  });
})();
