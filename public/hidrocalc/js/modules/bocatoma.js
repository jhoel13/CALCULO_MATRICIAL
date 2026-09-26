/* Módulo: Bocatoma con barraje mixto — fuente: DISEÑO DE BOCATOMA.xlsx */
(function () {
  'use strict';
  const { G, fmt, n, trap, manningQ, bisect, Doc, svg, ceilTo, rad } = HC;

  const CULT = [
    ['Maíz (actual)', 642, 1.5], ['Algodón (actual)', 804, 1.5], ['Pastos (actual)', 200.4, 0.6], ['Maracuyá (actual)', 44.4, 0.6], ['Limón (actual)', 144, 0.6], ['Mango (actual)', 3.6, 0.6],
    ['Maíz (a incorporar)', 554.4, 1.6], ['Algodón (a incorporar)', 685.2, 1.6], ['Pastos (a incorporar)', 180, 0.7], ['Maracuyá (a incorporar)', 42, 0.7], ['Limón (a incorporar)', 126, 0.7], ['Mango (a incorporar)', 6, 0.7]
  ].map(([c, a, m]) => ({ c, a, m }));
  const LANE = { 'Arena muy fina o limo': 8.5, 'Arena fina': 7.0, 'Arena media': 6.0, 'Arena gruesa': 5.0, 'Grava fina': 4.0, 'Grava media': 3.5, 'Grava gruesa con cantos': 3.0, 'Bolones con cantos y grava': 2.5, 'Arcilla blanda': 3.0, 'Arcilla media': 2.0, 'Arcilla dura': 1.8 };
  const SPTS = [
    { p: '1 Inicio (lecho aguas arriba)', lx: 0, h: 0, z: 'otro' }, { p: '2 Fondo dentellón aguas arriba', lx: 1.8, h: 1.8, z: 'otro' },
    { p: '3 Fin base del dentellón', lx: 2.133, h: 1.8, z: 'otro' }, { p: '4 Fin del tramo inclinado', lx: 3.433, h: 0.674, z: 'barraje' },
    { p: '5 Talón (inicio del colchón)', lx: 4.69, h: 0.674, z: 'colchon' }, { p: '6 Fin del colchón', lx: 9.323, h: 0.674, z: 'colchon' },
    { p: '7 Fondo dentellón aguas abajo', lx: 10.523, h: 1.713, z: 'otro' }, { p: '8 Base del dentellón aguas abajo', lx: 10.69, h: 1.713, z: 'otro' },
    { p: '9 Salida', lx: 12.403, h: 0, z: 'otro' }
  ];

  function drawBarraje(o) {
    const W = 700, H = 300;
    const x0 = -o.Xc - 3, x1 = o.xe + o.R + o.Lp + 3;
    const S = svg.scaler2(x0, x1, -o.hb - 0.6, o.P + o.H + 0.8, W, H, 40);
    let b = '';
    b += `<rect x="${S.X(x0)}" y="${S.Y(0)}" width="${S.X(x1) - S.X(x0)}" height="${S.Y(-o.hb - 0.6) - S.Y(0)}" class="sv-soil"/>`;
    // agua
    const wsUp = o.P + o.H;
    const nap = o.prof.map((p) => [S.X(p.x), S.Y(o.P + p.y + Math.max(o.d1, o.H * (1 - p.x / o.xe) + o.d1 * p.x / o.xe))]);
    const water = [[S.X(x0), S.Y(wsUp)], [S.X(-o.Xc), S.Y(wsUp)], [S.X(0), S.Y(o.P + o.H * 0.85)]].concat(nap).concat([[S.X(o.xe + o.R), S.Y(o.d1)], [S.X(o.xe + o.R + o.Lp * 0.25), S.Y(o.d2)], [S.X(x1), S.Y(o.d2)], [S.X(x1), S.Y(0)], [S.X(x0), S.Y(0)]]);
    b += svg.poly(water, 'sv-water');
    // barraje
    const crest = [[S.X(-o.Xc), S.Y(-o.hb)], [S.X(-o.Xc), S.Y(o.P - o.Yc)], [S.X(0), S.Y(o.P)]].concat(o.prof.map((p) => [S.X(p.x), S.Y(o.P + p.y)])).concat([[S.X(o.xe + o.R), S.Y(0)], [S.X(o.xe + o.R), S.Y(-o.hb)]]);
    b += svg.poly(crest, 'sv-concrete-p');
    // colchón
    b += svg.poly([[S.X(o.xe + o.R), S.Y(0)], [S.X(o.xe + o.R + o.Lp), S.Y(0)], [S.X(o.xe + o.R + o.Lp), S.Y(-o.e)], [S.X(o.xe + o.R), S.Y(-o.e)]], 'sv-concrete');
    // dentellones
    b += svg.poly([[S.X(-o.Xc - 1), S.Y(0)], [S.X(-o.Xc), S.Y(0)], [S.X(-o.Xc), S.Y(-o.hb - 0.4)], [S.X(-o.Xc - 1), S.Y(-o.hb - 0.4)]], 'sv-concrete');
    b += svg.line(S.X(x0), S.Y(wsUp), S.X(-o.Xc), S.Y(wsUp), 'sv-wsurf');
    b += svg.dim(S.X(-o.Xc) - 20, S.Y(0), S.X(-o.Xc) - 20, S.Y(o.P), `P = ${fmt(o.P, 2)}`, 0);
    b += svg.dim(S.X(-o.Xc) - 20, S.Y(o.P), S.X(-o.Xc) - 20, S.Y(wsUp), `H = ${fmt(o.H, 2)}`, 0);
    b += svg.dim(S.X(o.xe + o.R), S.Y(-o.e) + 16, S.X(o.xe + o.R + o.Lp), S.Y(-o.e) + 16, `Lp = ${fmt(o.Lp, 1)} m`, 0);
    b += svg.txt(S.X(o.xe + o.R + o.Lp * 0.7), S.Y(o.d2) - 8, `d2 = ${fmt(o.d2, 2)} m`, 'sv-small');
    b += svg.txt(S.X(o.xe + o.R) + 6, S.Y(o.d1) - 6, `d1 = ${fmt(o.d1, 2)}`, 'sv-small', 'start');
    b += svg.txt(S.X(o.xe / 2), S.Y(o.P) - 16, 'Perfil Creager', 'sv-label');
    return svg.frame(W, H, b, 'Perfil del barraje');
  }

  HC.register({
    id: 'bocatoma',
    title: 'Bocatoma con barraje mixto',
    short: 'Bocatoma',
    icon: 'bocatoma',
    group: 'captacion',
    source: 'DISEÑO DE BOCATOMA.xlsx',
    description: 'Caudal de derivación, curva de aforo del río, canales de captación y conducción, barraje fijo y canal de limpia, resalto, perfil Creager, filtración, subpresión y estabilidad del barraje.',
    tags: ['Barraje', 'Resalto', 'Creager', 'Lane', 'Estabilidad'],
    inputs: [
      {
        title: 'Hidrología', fields: [
          { id: 'Qmax', label: 'Caudal máximo del río', sym: 'Q_{max}', unit: 'm^3/s', value: 253.842, step: 1 },
          { id: 'Qmed', label: 'Caudal medio', sym: 'Q_{med}', unit: 'm^3/s', value: 3, step: 0.5 },
          { id: 'Qmin', label: 'Caudal mínimo', sym: 'Q_{min}', unit: 'm^3/s', value: 1, step: 0.5 },
          { id: 'crit', label: 'Caudal para diseñar el barraje', type: 'select', value: 'qmax', options: [{ v: 'qmax', l: 'Qmáx (como el Excel)' }, { v: 'aven', l: '1.5·Qmáx (avenida con aportes)' }, { v: 'red', l: '0.75·(1.5·Qmáx)' }] }
        ]
      },
      {
        title: 'Demanda de riego', collapsed: true, fields: [
          { id: 'cult', type: 'table', label: 'Cédula de cultivos', value: CULT, addLabel: 'Agregar cultivo', columns: [{ id: 'c', label: 'Cultivo', type: 'text', w: '150px' }, { id: 'a', label: 'Área', unit: 'ha' }, { id: 'm', label: 'Módulo', unit: 'L/s/ha' }] }
        ]
      },
      {
        title: 'Cauce del río', fields: [
          { id: 'Br', label: 'Ancho de plantilla del río', sym: 'B', unit: 'm', value: 70, step: 1 },
          { id: 'Zr', label: 'Talud de las márgenes', sym: 'Z', value: 1, step: 0.25 },
          { id: 'CFR', label: 'Cota de fondo del río', sym: 'CFR', unit: 'm', value: 99.76, step: 0.01 },
          { id: 'dz', label: 'Desnivel en el tramo', sym: '\\Delta z', unit: 'm', value: 0.364, step: 0.01 },
          { id: 'Lr', label: 'Longitud del tramo', sym: 'L', unit: 'm', value: 440, step: 10 },
          { id: 'n0', label: 'n básico (material del cauce)', sym: 'n_0', value: 0.014, step: 0.001 },
          { id: 'n1', label: 'Irregularidad', sym: 'n_1', value: 0.005, step: 0.001 },
          { id: 'n2', label: 'Variación de la sección', sym: 'n_2', value: 0.005, step: 0.001 },
          { id: 'n3', label: 'Obstrucciones', sym: 'n_3', value: 0.01, step: 0.001 },
          { id: 'n4', label: 'Vegetación', sym: 'n_4', value: 0.005, step: 0.001 }
        ]
      },
      {
        title: 'Canales de captación y conducción', collapsed: true, fields: [
          { id: 'bcap', label: 'Ancho del canal de captación', sym: 'b', unit: 'm', value: 2, step: 0.1 },
          { id: 'scap', label: 'Pendiente de los canales', sym: 's', unit: 'm/m', value: 0.001, step: 0.0001 },
          { id: 'ncap', label: 'Rugosidad (concreto)', sym: 'n', value: 0.014, step: 0.001 },
          { id: 'zcon', label: 'Talud del canal de conducción', sym: 'z', value: 0.5, step: 0.25 },
          { id: 'hsed', label: 'Altura de sedimentos', unit: 'm', value: 1.0, step: 0.1 },
          { id: 'perd', label: 'Pérdidas en la toma', unit: 'm', value: 0.2, step: 0.05 }
        ]
      },
      {
        title: 'Barraje y canal de limpia', collapsed: true, fields: [
          { id: 'ep', label: 'Espesor de pilar adoptado', sym: 'e', unit: 'm', value: 0.75, step: 0.05 },
          { id: 'Np', label: 'Número de pilares (contracciones)', sym: 'N', value: 2, step: 1 },
          { id: 'Kp', label: 'Coef. contracción de pilares', sym: 'K_p', value: 0, step: 0.01 },
          { id: 'Ka', label: 'Coef. contracción de estribos', sym: 'K_a', value: 0.2, step: 0.01 },
          { id: 'C0', label: 'Coeficiente de descarga base', sym: 'C_0', value: 3.95, step: 0.05, help: 'De la figura 3 (P/H). La fórmula Q = 0.55·C·L·H^1.5 convierte al sistema métrico.' },
          { id: 'K1', label: 'K1 (carga distinta a la de diseño)', value: 1, step: 0.01 },
          { id: 'K2', label: 'K2 (talud del paramento)', value: 1, step: 0.01 },
          { id: 'K3', label: 'K3 (efecto del lavadero)', value: 1, step: 0.01 },
          { id: 'K4', label: 'K4 (interferencia aguas abajo)', value: 1, step: 0.01 },
          { id: 'Cc', label: 'Coef. de descarga de compuertas', sym: "C'", value: 0.75, step: 0.01 }
        ]
      },
      {
        title: 'Resalto y perfil Creager', collapsed: true, fields: [
          { id: 'LpD2', label: 'Relación Lp/d2 (USBR, fig. 11)', value: 5.85, step: 0.05 },
          { id: 'Kc', label: 'Coeficiente K de Scimemi', sym: 'K', value: 0.515, step: 0.005 },
          { id: 'nc', label: 'Exponente n de Scimemi', sym: 'n', value: 1.86, step: 0.01 },
          { id: 'xcH', label: 'Xc/Ho', value: 0.27, step: 0.01 }, { id: 'ycH', label: 'Yc/Ho', value: 0.115, step: 0.005 },
          { id: 'r1H', label: 'R1/Ho', value: 0.517, step: 0.005 }, { id: 'r2H', label: 'R2/Ho', value: 0.22, step: 0.005 }
        ]
      },
      {
        title: 'Filtración y colchón', collapsed: true, fields: [
          { id: 'suelo', label: 'Suelo de cimentación (Lane)', type: 'select', value: 'Grava media', options: Object.keys(LANE).map((k) => ({ v: k, l: `${k} (C=${LANE[k]})` })) },
          { id: 'Lv', label: 'Recorrido vertical (≥ 45°)', sym: 'L_v', unit: 'm', value: 6.013, step: 0.1 },
          { id: 'Lh', label: 'Recorrido horizontal (< 45°)', sym: 'L_h', unit: 'm', value: 19.169, step: 0.1 },
          { id: 'cp', label: 'Factor de subpresión', sym: "c'", value: 0.5, step: 0.05, help: 'Depende de la porosidad del suelo (0 a 1).' },
          { id: 'sp', type: 'table', label: 'Puntos para la subpresión (Lx = recorrido ponderado, h\' = profundidad)', value: SPTS, columns: [{ id: 'p', label: 'Punto', type: 'text', w: '170px' }, { id: 'lx', label: 'Lx', unit: 'm' }, { id: 'h', label: "h'", unit: 'm' }, { id: 'z', label: 'Zona', type: 'select', options: [{ v: 'colchon', l: 'Colchón' }, { v: 'barraje', l: 'Barraje' }, { v: 'otro', l: 'Otro' }] }] },
          { id: 'gc', label: 'Peso específico del concreto ciclópeo', sym: '\\gamma_c', unit: 'kg/m^3', value: 2300, step: 50 },
          { id: 'emin', label: 'Espesor mínimo del colchón', unit: 'm', value: 0.9, step: 0.05 },
          { id: 'k', label: 'Permeabilidad del suelo', sym: 'k', unit: 'm/d', value: 1.2, step: 0.1 },
          { id: 'CB', label: 'Coeficiente de Bligh (enrocado)', sym: 'C_B', value: 9, step: 0.5, help: 'Arena fina 15, arena gruesa 12, grava y arena 9, bolones y grava 4–6.' },
          { id: 'eEnr', label: 'Espesor mínimo del enrocado', unit: 'm', value: 1.5, step: 0.1 }
        ]
      },
      {
        title: 'Estabilidad del barraje', collapsed: true, fields: [
          { id: 'ga', label: 'Peso específico agua con sedimentos', sym: '\\gamma_a', unit: 't/m^3', value: 1.45, step: 0.05 },
          { id: 'phi', label: 'Ángulo de fricción del suelo', sym: '\\phi', unit: '°', value: 37, step: 1 },
          { id: 'gs', label: 'Peso específico del suelo sumergido', sym: "\\gamma'", unit: 't/m^3', value: 1.0, step: 0.1 },
          { id: 'mu', label: 'Coeficiente de fricción concreto–suelo', sym: '\\mu', value: 0.5, step: 0.05 },
          { id: 'Ddent', label: 'Profundidad del dentellón (empuje pasivo)', unit: 'm', value: 1.8, step: 0.1 },
          { id: 'pas', label: 'Considerar empuje pasivo del dentellón', type: 'select', value: 'si', options: [{ v: 'si', l: 'Sí' }, { v: 'no', l: 'No' }] },
          { id: 'ish', label: 'Coeficiente sísmico horizontal', sym: 'k_h', value: 0.1, step: 0.01 },
          { id: 'isv', label: 'Coeficiente sísmico vertical', sym: 'k_v', value: 0.03, step: 0.01 },
          { id: 'ace', label: 'Aceleración sísmica (Westergaard)', sym: 'i', value: 0.32, step: 0.01 },
          { id: 'qadm', label: 'Esfuerzo admisible del terreno', sym: 'q_{adm}', unit: 'kg/cm^2', value: 1.2, step: 0.1 }
        ]
      },
      {
        title: 'Aliviadero lateral', collapsed: true, fields: [
          { id: 'Cd', label: 'Coef. de descarga de la ventana', sym: 'C_d', value: 0.6, step: 0.05 },
          { id: 'mual', label: 'Coef. del aliviadero', sym: '\\mu', value: 0.5, step: 0.05 },
          { id: 'hal', label: 'Carga sobre el aliviadero', sym: 'h', unit: 'm', value: 0.25, step: 0.05 }
        ]
      }
    ],
    presets: [{ name: 'Bocatoma del Excel (Qmáx = 253.84 m³/s)', values: {} }, { name: 'Diseño con avenida 1.5·Qmáx', values: { crit: 'aven' } }],
    compute(v) {
      const d = new Doc();
      const checks = [];

      /* I. caudales */
      d.h('Caudal de derivación');
      const cult = v.cult.filter((r) => r.a > 0 && r.m > 0);
      const Qd = cult.reduce((s, r) => s + r.a * r.m, 0) / 1000;
      d.table(['Cultivo', 'Área (ha)', 'Módulo (L/s/ha)', '$Q$ (L/s)'], cult.map((r) => [r.c, fmt(r.a, 2), fmt(r.m, 2), fmt(r.a * r.m, 2)]).concat([['**Total**', fmt(cult.reduce((s, r) => s + r.a, 0), 2), '', `**${fmt(Qd * 1000, 2)}**`]]));
      d.calc({ sym: 'Q_{deriv}', f: '\\dfrac{\\sum A_i\\,m_i}{1000}', val: Qd, unit: 'm^3/s', d: 4 });
      d.h('Caudal de diseño del barraje');
      const Qav = 1.5 * v.Qmax;
      d.p('Aportes a la avenida: infiltración 15 %, quebradas 15 %, aguas subterráneas 10 % y precipitación 40 % ⇒ $Q_{av}=1.5\\,Q_{max}$.');
      d.calc({ sym: 'Q_{av}', f: '1.5\\,Q_{max}', sub: `1.5(${n(v.Qmax)})`, val: Qav, unit: 'm^3/s', d: 3 });
      const Qb = v.crit === 'qmax' ? v.Qmax : (v.crit === 'aven' ? Qav : 0.75 * Qav);
      d.calc({ sym: 'Q_{dis}', val: Qb, unit: 'm^3/s', d: 3, note: v.crit === 'qmax' ? 'Se diseña con Qmáx, igual que en el Excel.' : 'Criterio elegido por el usuario.' });

      /* río */
      d.h('Cauce del río: rugosidad, pendiente y tirante');
      const nr = v.n0 + v.n1 + v.n2 + v.n3 + v.n4;
      d.calc({ sym: 'n', f: 'n_0+n_1+n_2+n_3+n_4', sub: `${n(v.n0)}+${n(v.n1)}+${n(v.n2)}+${n(v.n3)}+${n(v.n4)}`, val: nr, d: 3, note: 'Método de Cowan.' });
      const sr = v.dz / v.Lr;
      d.calc({ sym: 's', f: '\\dfrac{\\Delta z}{L}', sub: `\\dfrac{${n(v.dz)}}{${n(v.Lr)}}`, val: sr, unit: 'm/m', d: 6 });
      const geomR = (y) => trap(v.Br, v.Zr, v.Zr, y);
      const yr = bisect((y) => { const g = geomR(y); return manningQ(g.A, g.R, sr, nr) - v.Qmax; }, 1e-4, 2);
      const gr = geomR(yr);
      d.calc({ sym: 'y_n', val: yr, unit: 'm', d: 3, note: 'Tirante del río para Qmáx (Manning, en lugar de leerlo del gráfico).' });
      d.calc({ sym: 'NA_{max}', f: 'CFR+y_n', sub: `${n(v.CFR)}+${n(yr)}`, val: v.CFR + yr, unit: 'm', d: 3 });
      const Tr = gr.T, BLr = yr / 3;
      d.calc({ sym: 'T', f: 'B+2Zy_n', sub: `${n(v.Br)}+2(${n(v.Zr)})(${n(yr)})`, val: Tr, unit: 'm', d: 3 });
      d.calc({ sym: 'BL', f: 'y_n/3', sub: `${n(yr)}/3`, val: BLr, unit: 'm', d: 3 });
      const Ltr = (Tr + 2 * BLr * v.Zr - v.Br) / (2 * Math.tan(rad(12.5)));
      d.calc({ sym: 'L_t', f: '\\dfrac{T-t}{2\\tan12.5^\\circ}', sub: `\\dfrac{${n(Tr + 2 * BLr * v.Zr)}-${n(v.Br)}}{2\\tan12.5^\\circ}`, val: Ltr, unit: 'm', d: 2, note: `Transición de encauzamiento; se adopta ${fmt(ceilTo(Ltr, 1))} m.` });

      /* II. captación */
      d.h('Canal de captación (rectangular)');
      const K1 = Qd * v.ncap / Math.sqrt(v.scap);
      d.calc({ sym: '\\dfrac{Qn}{\\sqrt s}', sub: `\\dfrac{${n(Qd, 4)}(${n(v.ncap)})}{\\sqrt{${n(v.scap)}}}`, val: K1, d: 4 });
      d.eq('\\dfrac{(b\\,y)^{5/3}}{(b+2y)^{2/3}}=\\dfrac{Qn}{\\sqrt s}');
      const ycap = bisect((y) => Math.pow(v.bcap * y, 5 / 3) / Math.pow(v.bcap + 2 * y, 2 / 3) - K1, 1e-4, 5);
      const ycA = ceilTo(ycap, 0.1);
      d.calc({ sym: 'y_n', val: ycap, unit: 'm', d: 4, note: `Se adopta y = ${fmt(ycA, 2)} m.` });
      const Acap = v.bcap * ycA, Vcap = Qd / Acap, hvcap = Vcap * Vcap / (2 * G);
      d.calc({ sym: 'A', f: 'b\\,y', sub: `${n(v.bcap)}(${n(ycA)})`, val: Acap, unit: 'm^2', d: 3 });
      d.calc({ sym: 'V', f: 'Q/A', sub: `${n(Qd, 4)}/${n(Acap)}`, val: Vcap, unit: 'm/s', d: 4 });
      d.calc({ sym: 'h_v', f: 'V^2/2g', sub: `${n(Vcap, 4)}^2/19.62`, val: hvcap, unit: 'm', d: 4 });
      d.calc({ sym: 'BL', f: 'y/3', sub: `${n(ycA)}/3`, val: ycA / 3, unit: 'm', d: 3 });

      d.h('Canal de conducción (trapezoidal)');
      const geomC = (y) => trap(v.bcap, v.zcon, v.zcon, y);
      const ycon = bisect((y) => { const g = geomC(y); return manningQ(g.A, g.R, v.scap, v.ncap) - Qd; }, 1e-4, 5);
      const ycoA = ceilTo(ycon, 0.1);
      const gC = geomC(ycoA);
      d.calc({ sym: 'y_n', val: ycon, unit: 'm', d: 4, note: `Se adopta y = ${fmt(ycoA, 2)} m.` });
      d.calc({ sym: 'A', f: 'by+zy^2', sub: `${n(v.bcap)}(${n(ycoA)})+${n(v.zcon)}(${n(ycoA)})^2`, val: gC.A, unit: 'm^2', d: 3 });
      d.calc({ sym: 'V', f: 'Q/A', sub: `${n(Qd, 4)}/${n(gC.A)}`, val: Qd / gC.A, unit: 'm/s', d: 4 });
      d.calc({ sym: 'T', f: 'b+2zy', sub: `${n(v.bcap)}+2(${n(v.zcon)})(${n(ycoA)})`, val: gC.T, unit: 'm', d: 3 });
      const Tcon = gC.T + 2 * v.zcon * ycoA / 3;
      const Ltc = (Tcon - v.bcap) / (2 * Math.tan(rad(12.5)));
      d.calc({ sym: 'L_t', f: '\\dfrac{T_{BL}-b}{2\\tan12.5^\\circ}', sub: `\\dfrac{${n(Tcon)}-${n(v.bcap)}}{2\\tan12.5^\\circ}`, val: Ltc, unit: 'm', d: 2, note: 'Transición captación–conducción.' });

      /* IV. barraje */
      d.h('Cota de la cresta y altura del barraje');
      const CFC = v.CFR + v.hsed;
      d.calc({ sym: 'CFC', f: 'CFR+h_{sed}', sub: `${n(v.CFR)}+${n(v.hsed)}`, val: CFC, unit: 'm', d: 3 });
      const Ebc = CFC + ycA + hvcap + v.perd;
      d.calc({ sym: 'Elev_B', f: 'CFC+y_n+h_v+0.20', sub: `${n(CFC)}+${n(ycA)}+${n(hvcap, 4)}+${n(v.perd)}`, val: Ebc, unit: 'm', d: 3 });
      const EB = ceilTo(Ebc, 0.05);
      const P = ceilTo(EB - v.CFR, 0.05);
      d.calc({ sym: 'P', f: 'Elev_B-CFR', sub: `${n(EB)}-${n(v.CFR)}`, val: EB - v.CFR, unit: 'm', d: 3, note: `Elevación adoptada ${fmt(EB, 2)} m s. n. m.; P adoptado = ${fmt(P, 2)} m.` });

      d.h('Longitud del barraje fijo y del canal de limpia');
      d.p('El área del canal de limpia es 1/10 del área obstruida por el aliviadero: $P\\,L_d=P\\,(B-L_d)/10$.');
      const Ldc = v.Br / 11;
      const Ld = Math.ceil(Ldc - 1e-9);
      d.calc({ sym: 'L_d', f: 'B/11', sub: `${n(v.Br)}/11`, val: Ldc, unit: 'm', d: 3, note: `Se adopta L_d = ${Ld} m.` });
      const L1 = v.Br - Ld;
      d.calc({ sym: 'L_1', f: 'B-L_d', sub: `${n(v.Br)}-${Ld}`, val: L1, unit: 'm', d: 2 });
      const Lcd = Ld / 2;
      d.calc({ sym: 'L_{cd}', f: 'L_d/2', sub: `${Ld}/2`, val: Lcd, unit: 'm', d: 2, note: 'Ancho de cada compuerta del canal desarenador.' });
      d.calc({ sym: 'e', f: 'L_{cd}/4', sub: `${n(Lcd)}/4`, val: Lcd / 4, unit: 'm', d: 3, note: `Espesor de pilar adoptado: ${fmt(v.ep)} m.` });
      const Lcl = Ld - 2 * v.ep;
      d.calc({ sym: "L''", f: 'L_d-2e', sub: `${Ld}-2(${n(v.ep)})`, val: Lcl, unit: 'm', d: 2, note: 'Ancho neto de las compuertas del canal de limpia.' });

      d.h('Carga hidráulica sobre la cresta');
      const Cq = v.C0 * v.K1 * v.K2 * v.K3 * v.K4;
      d.calc({ sym: 'C', f: 'C_0K_1K_2K_3K_4', sub: `${n(v.C0)}(${n(v.K1)})(${n(v.K2)})(${n(v.K3)})(${n(v.K4)})`, val: Cq, d: 3 });
      d.eq('Q_{al}=0.55\\,C\\,L\\,H^{3/2},\\quad L=L_1-2(NK_p+K_a)H;\\qquad Q_{cl}=C\'\\,L\'\'\\,(P+H)^{3/2}');
      const Qal = (Hh) => 0.55 * Cq * (L1 - 2 * (v.Np * v.Kp + v.Ka) * Hh) * Math.pow(Hh, 1.5);
      const Qcl = (Hh) => v.Cc * Lcl * Math.pow(P + Hh, 1.5);
      const H = bisect((Hh) => Qal(Hh) + Qcl(Hh) - Qb, 1e-4, 3);
      d.p(`Se busca $H$ tal que $Q_{al}+Q_{cl}=Q_{dis}=${fmt(Qb, 3)}$ m³/s:`);
      const Hs = [0.5, 1.0, H * 0.9, H, H * 1.1, 1.5].sort((a, b) => a - b);
      d.table(['$H$ (m)', '$Q_{al}$ (m³/s)', '$Q_{cl}$ (m³/s)', '$Q_t$ (m³/s)'], Hs.map((h) => [fmt(h, 4), fmt(Qal(h), 3), fmt(Qcl(h), 3), fmt(Qal(h) + Qcl(h), 3)]));
      const Lef = L1 - 2 * (v.Np * v.Kp + v.Ka) * H;
      d.calc({ sym: 'H', val: H, unit: 'm', d: 4, hl: true });
      d.calc({ sym: 'L', f: 'L_1-2(NK_p+K_a)H', sub: `${n(L1)}-2(${n(v.Np)}(${n(v.Kp)})+${n(v.Ka)})(${n(H, 4)})`, val: Lef, unit: 'm', d: 3 });
      const qal = Qal(H), qcl = Qcl(H);
      d.calc({ sym: 'Q_{al}', f: '0.55\\,C\\,L\\,H^{3/2}', sub: `0.55(${n(Cq)})(${n(Lef)})(${n(H, 4)})^{3/2}`, val: qal, unit: 'm^3/s', d: 3 });
      d.calc({ sym: 'Q_{cl}', f: "C'\\,L''\\,(P+H)^{3/2}", sub: `${n(v.Cc)}(${n(Lcl)})(${n(P)}+${n(H, 4)})^{3/2}`, val: qcl, unit: 'm^3/s', d: 3 });

      /* resalto */
      d.h('Resalto hidráulico y poza de disipación');
      const q = qal / L1;
      d.calc({ sym: 'q', f: 'Q_{al}/L_1', sub: `${n(qal)}/${n(L1)}`, val: q, unit: 'm^2/s', d: 4 });
      d.p('Bernoulli entre la cresta y el pie del barraje:');
      d.eq('P+H=d_1+\\dfrac{q^2}{2g\\,d_1^2}');
      const ycq = Math.cbrt(q * q / G);
      const d1 = bisect((x) => x + q * q / (2 * G * x * x) - (P + H), 1e-4, ycq);
      d.calc({ sym: 'd_1', val: d1, unit: 'm', d: 4, note: 'Raíz supercrítica (bisección).' });
      const V1 = q / d1;
      d.calc({ sym: 'V_1', f: 'q/d_1', sub: `${n(q, 4)}/${n(d1, 4)}`, val: V1, unit: 'm/s', d: 3 });
      const F1 = V1 / Math.sqrt(G * d1);
      d.calc({ sym: 'F_1', f: '\\dfrac{V_1}{\\sqrt{g\\,d_1}}', sub: `\\dfrac{${n(V1)}}{\\sqrt{9.81(${n(d1, 4)})}}`, val: F1, d: 3 });
      const d2 = d1 / 2 * (Math.sqrt(1 + 8 * F1 * F1) - 1);
      d.calc({ sym: 'd_2', f: '\\dfrac{d_1}{2}\\left(\\sqrt{1+8F_1^2}-1\\right)', sub: `\\dfrac{${n(d1, 4)}}{2}\\left(\\sqrt{1+8(${n(F1)})^2}-1\\right)`, val: d2, unit: 'm', d: 3 });
      const Tp = 1.1 * d2;
      const LpU = v.LpD2 * Tp, LpL = 5 * (d2 - d1), LpS = 6 * d1 * F1;
      d.calc({ sym: 'L_p', f: '\\left(\\tfrac{L}{d_2}\\right)1.1\\,d_2', sub: `${n(v.LpD2)}(1.1)(${n(d2)})`, val: LpU, unit: 'm', d: 2, note: 'USBR (tirante aumentado 10 %).' });
      d.calc({ sym: 'L_p', f: '5(d_2-d_1)', sub: `5(${n(d2)}-${n(d1, 4)})`, val: LpL, unit: 'm', d: 2, note: 'Lindquist.' });
      d.calc({ sym: 'L_p', f: '6\\,d_1F_1', sub: `6(${n(d1, 4)})(${n(F1)})`, val: LpS, unit: 'm', d: 2, note: 'Safranez.' });
      const Lp = ceilTo(Math.max(LpU, LpL, LpS), 1);
      d.p(`Se adopta la mayor: $L_p=${fmt(Lp)}$ m.`);

      /* Creager */
      d.h('Perfil Creager (Scimemi)');
      const Ho = H;
      d.eq(`\\dfrac{y}{H_o}=-K\\left(\\dfrac{x}{H_o}\\right)^n=-${fmt(v.Kc)}\\left(\\dfrac{x}{${fmt(Ho, 3)}}\\right)^{${fmt(v.nc)}}`);
      const xe = Ho * Math.pow(P / (v.Kc * Ho), 1 / v.nc);
      d.calc({ sym: 'x_{fin}', f: 'H_o\\left(\\dfrac{P}{K H_o}\\right)^{1/n}', sub: `${n(Ho, 4)}\\left(\\dfrac{${n(P)}}{${n(v.Kc)}(${n(Ho, 4)})}\\right)^{1/${fmt(v.nc)}}`, val: xe, unit: 'm', d: 3, note: 'Abscisa donde el perfil alcanza el nivel del lecho (y = −P).' });
      const prof = [];
      const np = 12;
      for (let i = 0; i <= np; i++) { const x = xe * i / np; prof.push({ x, y: -v.Kc * Ho * Math.pow(x / Ho, v.nc) }); }
      d.table(['Punto', '$x$ (m)', '$y$ (m)'], prof.map((p, i) => [String(i + 1), fmt(p.x, 3), fmt(p.y, 3)]));
      const Xc = v.xcH * Ho, Yc = v.ycH * Ho, R1 = v.r1H * Ho, R2 = v.r2H * Ho;
      d.calc({ sym: 'X_c', f: '0.27H_o', sub: `${n(v.xcH)}(${n(Ho, 4)})`, val: Xc, unit: 'm', d: 3 });
      d.calc({ sym: 'Y_c', sub: `${n(v.ycH)}(${n(Ho, 4)})`, val: Yc, unit: 'm', d: 3 });
      d.calc({ sym: 'R_1', sub: `${n(v.r1H)}(${n(Ho, 4)})`, val: R1, unit: 'm', d: 3 });
      d.calc({ sym: 'R_2', sub: `${n(v.r2H)}(${n(Ho, 4)})`, val: R2, unit: 'm', d: 3 });
      const Remp = ceilTo(0.5 * (P + Ho), 0.05);
      d.calc({ sym: 'R', f: '0.5(P+H_o)', sub: `0.5(${n(P)}+${n(Ho, 4)})`, val: 0.5 * (P + Ho), unit: 'm', d: 3, note: `Radio de empalme con el colchón; se adopta ${fmt(Remp, 2)} m.` });
      const Lb = Xc + xe + Remp;
      d.calc({ sym: 'L_b', f: 'X_c+x_{fin}+R', sub: `${n(Xc)}+${n(xe)}+${n(Remp)}`, val: Lb, unit: 'm', d: 3, note: 'Longitud horizontal del cuerpo del barraje.' });
      d.calc({ sym: 'H_{muro}', f: '1.25(P+H)', sub: `1.25(${n(P)}+${n(H, 4)})`, val: 1.25 * (P + H), unit: 'm', d: 3, note: 'Altura de los muros de encauzamiento aguas arriba.' });
      d.calc({ sym: 'H_{muro,ab}', f: 'd_2+H', sub: `${n(d2)}+${n(H, 4)}`, val: d2 + H, unit: 'm', d: 3, note: 'Altura de muros en la poza.' });

      /* protecciones */
      d.h('Protecciones: solado delantero y enrocado');
      const Lsol = ceilTo(5 * H, 1);
      d.calc({ sym: 'L_{min}', f: '5H', sub: `5(${n(H, 4)})`, val: 5 * H, unit: 'm', d: 3, note: `Protección delantera de ${fmt(Lsol)} m.` });
      const Hp = P + H;
      const eEc = 0.6 * Math.sqrt(q) * Math.pow(Hp / G, 0.25);
      d.calc({ sym: "e'", f: "0.6\\,q^{1/2}\\left(\\dfrac{H'}{g}\\right)^{1/4}", sub: `0.6(${n(q, 4)})^{1/2}\\left(\\dfrac{${n(Hp, 4)}}{9.81}\\right)^{1/4}`, val: eEc, unit: 'm', d: 3 });
      const eEnr = Math.max(ceilTo(eEc, 0.1), v.eEnr);
      d.p(`Espesor de enrocado adoptado: ${fmt(eEnr, 2)} m.`);
      const Le = 0.642 * v.CB * Math.sqrt(Hp * q) - Lp;
      const LeA = Math.max(ceilTo(Le, 1), 0);
      d.calc({ sym: 'L_e', f: "0.642\\,C_B\\sqrt{H'\\,q}-L_p", sub: `0.642(${n(v.CB)})\\sqrt{${n(Hp, 4)}(${n(q, 4)})}-${n(Lp)}`, val: Le, unit: 'm', d: 2, note: `Longitud de enrocado adoptada: ${fmt(LeA)} m.` });

      /* filtración */
      d.h('Longitud de filtración (Lane)');
      const CL = LANE[v.suelo];
      const Hf = P;
      const Ln = CL * Hf;
      d.calc({ sym: 'L_n', f: 'C_L\\,H', sub: `${n(CL)}(${n(Hf)})`, val: Ln, unit: 'm', d: 3, note: `Suelo: ${v.suelo}. H = P (aguas abajo sin tirante: caso más desfavorable).` });
      const Lw = v.Lv + v.Lh / 3;
      d.calc({ sym: 'L_w', f: 'L_v+\\dfrac{L_h}{3}', sub: `${n(v.Lv)}+\\dfrac{${n(v.Lh)}}{3}`, val: Lw, unit: 'm', d: 3 });
      const okLane = Lw >= Ln;
      d.check(`Recorrido de filtración ponderado $L_w=${fmt(Lw)}\\geq L_n=${fmt(Ln)}$ m`, okLane);
      checks.push({ label: 'Filtración (Lane): $L_w\\geq C_L H$', ok: okLane, detail: `Lw = ${fmt(Lw)} m, Ln = ${fmt(Ln)} m` });

      d.h('Subpresión y espesor del colchón');
      d.eq("S_p=\\gamma_w\\,c'\\left(h+h'-\\dfrac{h}{L}L_x\\right),\\qquad L=L_v+\\dfrac{L_h}{3}");
      const Lsp = Lw;
      const spRows = v.sp.map((r) => {
        const Sp = 1000 * v.cp * (Hf + r.h - Hf * r.lx / Lsp);
        return { r, Sp };
      });
      d.table(['Punto', '$L_x$ (m)', "$h'$ (m)", '$S_p$ (kg/m²)', 'Zona'], spRows.map(({ r, Sp }) => [r.p, fmt(r.lx, 3), fmt(r.h, 3), fmt(Sp, 1), r.z === 'colchon' ? 'Colchón' : r.z === 'barraje' ? 'Barraje' : '—']));
      const spC = spRows.filter((s) => s.r.z === 'colchon');
      const Spo = spC.length ? Math.max(...spC.map((s) => s.Sp)) : Math.max(...spRows.map((s) => s.Sp));
      d.calc({ sym: 'S_{po}', val: Spo, unit: 'kg/m^2', d: 1, note: 'Subpresión máxima bajo el colchón.' });
      const eSp = 4 * Spo / (3 * v.gc);
      d.calc({ sym: 'e', f: '\\dfrac{4\\,S_{po}}{3\\,\\gamma_c}', sub: `\\dfrac{4(${n(Spo, 1)})}{3(${n(v.gc, 0)})}`, val: eSp, unit: 'm', d: 3 });
      const Zt = Math.max(P + H - d2, 0.01);
      const eTar = 0.2 * Math.sqrt(q) * Math.pow(Zt, 0.25);
      d.calc({ sym: 'e_T', f: '0.2\\,q^{1/2}Z^{1/4}', sub: `0.2(${n(q, 4)})^{1/2}(${n(Zt)})^{1/4}`, val: eTar, unit: 'm', d: 3, note: 'Taraimovich, con Z = P + H − d₂ (energía por disipar).' });
      const eCol = ceilTo(Math.max(eSp, eTar, v.emin), 0.05);
      d.p(`Espesor adoptado del colchón: $e=${fmt(eCol, 2)}$ m (mayor entre subpresión, Taraimovich y el mínimo constructivo).`);
      d.h2('Caudal de filtración (Darcy)');
      const km = v.k / 86400;
      const qf = km * Hf * v.Ddent / Lw;
      d.calc({ sym: 'q_f', f: 'k\\,\\dfrac{H}{L_w}\\,D', sub: `${n(km, 6)}\\dfrac{${n(Hf)}}{${n(Lw)}}(${n(v.Ddent)})`, val: qf, unit: 'm^3/s/m', d: 6 });
      d.calc({ sym: 'Q_f', f: 'q_f\\,L_1', sub: `${n(qf, 6)}(${n(L1)})`, val: qf * L1 * 1000, unit: 'L/s', d: 3 });

      /* estabilidad */
      d.h('Estabilidad del barraje (por metro de ancho)');
      const hb = v.sp.length > 4 ? v.sp[4].h : 0.674;
      d.p(`Se analiza el cuerpo del barraje con agua al nivel de la cresta y sismo. La base está a $h_b=${fmt(hb, 3)}$ m bajo el lecho; los momentos se toman respecto al pie aguas abajo (punto O).`);
      // peso por franjas
      const strips = [];
      strips.push({ x0: -Xc, x1: 0, h: P + hb - Yc / 2 });
      for (let i = 0; i < np; i++) { const a = prof[i], bq = prof[i + 1]; strips.push({ x0: a.x, x1: bq.x, h: P + (a.y + bq.y) / 2 + hb }); }
      strips.push({ x0: xe, x1: xe + Remp, h: hb + 0.215 * Remp * 0.5 });
      let Aw = 0, Ax = 0, Ay = 0;
      strips.forEach((s) => { const w = s.x1 - s.x0, A = w * s.h; Aw += A; Ax += A * (s.x0 + s.x1) / 2; Ay += A * s.h / 2; });
      const xbar = Ax / Aw, ybar = Ay / Aw;
      d.table(['Franja', 'Ancho (m)', 'Alto (m)', 'Área (m²)'], strips.map((s, i) => [String(i + 1), fmt(s.x1 - s.x0, 3), fmt(s.h, 3), fmt((s.x1 - s.x0) * s.h, 3)]));
      const Wt = Aw * v.gc / 1000;
      const xW = (xe + Remp) - xbar;
      d.calc({ sym: 'A', f: '\\sum A_i', val: Aw, unit: 'm^2', d: 3 });
      d.calc({ sym: 'W', f: 'A\\,\\gamma_c', sub: `${n(Aw)}(${n(v.gc / 1000)})`, val: Wt, unit: 't/m', d: 3 });
      d.calc({ sym: 'x_W', f: 'L_O-\\bar{x}', sub: `${n(xe + Remp)}-${n(xbar)}`, val: xW, unit: 'm', d: 3, note: 'Brazo del peso respecto a O.' });
      const Fh = 0.5 * v.ga * P * P, yFh = hb + P / 3;
      d.calc({ sym: 'F_h', f: '\\tfrac12\\gamma_a P^2', sub: `\\tfrac12(${n(v.ga)})(${n(P)})^2`, val: Fh, unit: 't/m', d: 3 });
      const Ka = Math.pow(Math.tan(rad(45 - v.phi / 2)), 2);
      d.calc({ sym: 'K_a', f: '\\tan^2\\left(45^\\circ-\\dfrac{\\phi}{2}\\right)', sub: `\\tan^2\\left(45^\\circ-\\dfrac{${fmt(v.phi)}^\\circ}{2}\\right)`, val: Ka, d: 4 });
      const Ea = v.ga * P * Ka * hb + 0.5 * v.gs * Ka * hb * hb + 0.5 * 1.0 * hb * hb;
      const yEa = (v.ga * P * Ka * hb * hb / 2 + (0.5 * v.gs * Ka + 0.5) * hb * hb * hb / 3) / Math.max(Ea, 1e-9);
      d.calc({ sym: 'E_a', f: "\\gamma_aPK_ah_b+\\tfrac12\\gamma'K_ah_b^2+\\tfrac12\\gamma_wh_b^2", sub: `${n(v.ga)}(${n(P)})(${n(Ka, 4)})(${n(hb)})+\\tfrac12(${n(v.gs)})(${n(Ka, 4)})(${n(hb)})^2+\\tfrac12(${n(hb)})^2`, val: Ea, unit: 't/m', d: 3 });
      const Sp = v.cp * 1.0 * (P + hb) * Lb / 2, xSp = 2 * Lb / 3;
      d.calc({ sym: 'S_p', f: "\\dfrac{c'\\,\\gamma_w\\,(P+h_b)\\,L_b}{2}", sub: `\\dfrac{${n(v.cp)}(1.0)(${n(P + hb)})(${n(Lb)})}{2}`, val: Sp, unit: 't/m', d: 3 });
      const Sh = v.ish * Wt, Sv = v.isv * Wt;
      d.calc({ sym: 'S_h', f: 'k_hW', sub: `${n(v.ish)}(${n(Wt)})`, val: Sh, unit: 't/m', d: 3 });
      d.calc({ sym: 'S_v', f: 'k_vW', sub: `${n(v.isv)}(${n(Wt)})`, val: Sv, unit: 't/m', d: 3 });
      const Pe = 0.73 * v.ace * v.ga * P;
      const Ve = 0.726 * Pe * P, Me = 0.29 * Pe * P * P;
      d.calc({ sym: 'P_e', f: 'C\\,i\\,\\gamma_a\\,h', sub: `0.73(${n(v.ace)})(${n(v.ga)})(${n(P)})`, val: Pe, unit: 't/m^2', d: 3, note: 'Westergaard, paramento vertical (C = 0.73).' });
      d.calc({ sym: 'V_e', f: '0.726\\,P_e\\,h', sub: `0.726(${n(Pe)})(${n(P)})`, val: Ve, unit: 't/m', d: 3 });
      d.calc({ sym: 'M_e', f: '0.29\\,P_e\\,h^2', sub: `0.29(${n(Pe)})(${n(P)})^2`, val: Me, unit: 't\\cdot m/m', d: 3 });
      const Mh = Fh * yFh + Ea * yEa + Sh * (ybar) + Ve * (hb + 0.4 * P) + Me * 0;
      const Mm = Mh + Sp * xSp + Sv * xW;
      const Mp = Wt * xW;
      d.table(['Fuerza', 'Valor (t/m)', 'Brazo (m)', 'Momento (t·m/m)'], [
        ['$F_h$ hidrostática', fmt(Fh, 3), fmt(yFh, 3), fmt(-Fh * yFh, 3)],
        ['$E_a$ empuje de suelo', fmt(Ea, 3), fmt(yEa, 3), fmt(-Ea * yEa, 3)],
        ['$S_h$ sismo horizontal', fmt(Sh, 3), fmt(ybar, 3), fmt(-Sh * ybar, 3)],
        ['$V_e$ sismo en el agua', fmt(Ve, 3), fmt(hb + 0.4 * P, 3), fmt(-Ve * (hb + 0.4 * P), 3)],
        ['$S_p$ subpresión', fmt(-Sp, 3), fmt(xSp, 3), fmt(-Sp * xSp, 3)],
        ['$S_v$ sismo vertical', fmt(-Sv, 3), fmt(xW, 3), fmt(-Sv * xW, 3)],
        ['$W$ peso propio', fmt(Wt, 3), fmt(xW, 3), fmt(Mp, 3)]]);
      const Fv = Wt - Sp - Sv, Fhs = Fh + Ea + Sh + Ve;
      d.calc({ sym: '\\sum F_v', f: 'W-S_p-S_v', sub: `${n(Wt)}-${n(Sp)}-${n(Sv)}`, val: Fv, unit: 't/m', d: 3 });
      d.calc({ sym: '\\sum F_h', f: 'F_h+E_a+S_h+V_e', sub: `${n(Fh)}+${n(Ea)}+${n(Sh)}+${n(Ve)}`, val: Fhs, unit: 't/m', d: 3 });
      d.calc({ sym: 'M_{(+)}', val: Mp, unit: 't\\cdot m/m', d: 3 });
      d.calc({ sym: 'M_{(-)}', val: Mm, unit: 't\\cdot m/m', d: 3 });
      d.h2('Ubicación de la resultante');
      const Lo = xe + Remp + Xc;
      const Xr = (Mp - Mm) / Fv;
      d.calc({ sym: 'X_r', f: '\\dfrac{M_{(+)}-M_{(-)}}{\\sum F_v}', sub: `\\dfrac{${n(Mp)}-${n(Mm)}}{${n(Fv)}}`, val: Xr, unit: 'm', d: 3 });
      const ecc = Lo / 2 - Xr;
      d.calc({ sym: 'e', f: '\\dfrac{L_b}{2}-X_r', sub: `\\dfrac{${n(Lo)}}{2}-${n(Xr)}`, val: ecc, unit: 'm', d: 3 });
      const okT = Math.abs(ecc) <= Lo / 6;
      d.check(`Resultante en el tercio central: $|e|=${fmt(Math.abs(ecc))}\\leq L_b/6=${fmt(Lo / 6)}$ m`, okT);
      checks.push({ label: 'Resultante en el tercio central', ok: okT, detail: `e = ${fmt(ecc)} m; Lb/6 = ${fmt(Lo / 6)} m` });
      d.h2('Volteo');
      const FSv = Mp / Mm;
      d.calc({ sym: 'FS_v', f: '\\dfrac{M_{(+)}}{M_{(-)}}', sub: `\\dfrac{${n(Mp)}}{${n(Mm)}}`, val: FSv, d: 3 });
      const okV = FSv >= 1.5;
      d.check(`$FS_v=${fmt(FSv)}\\geq1.5$`, okV);
      checks.push({ label: 'Volteo ($FS\\geq1.5$)', ok: okV, detail: `FS = ${fmt(FSv)}` });
      d.h2('Deslizamiento');
      const Kp = Math.pow(Math.tan(rad(45 + v.phi / 2)), 2);
      const Ep = v.pas === 'si' ? 0.5 * v.gs * Kp * v.Ddent * v.Ddent : 0;
      if (v.pas === 'si') d.calc({ sym: 'E_p', f: "\\tfrac12\\gamma'K_pD^2", sub: `\\tfrac12(${n(v.gs)})(${n(Kp, 3)})(${n(v.Ddent)})^2`, val: Ep, unit: 't/m', d: 3, note: 'Empuje pasivo del dentellón.' });
      const Fr = v.mu * Fv + Ep;
      d.calc({ sym: 'F_r', f: v.pas === 'si' ? '\\mu\\sum F_v+E_p' : '\\mu\\sum F_v', sub: v.pas === 'si' ? `${n(v.mu)}(${n(Fv)})+${n(Ep)}` : `${n(v.mu)}(${n(Fv)})`, val: Fr, unit: 't/m', d: 3 });
      const FSd = Fr / Fhs;
      d.calc({ sym: 'FS_d', f: '\\dfrac{F_r}{\\sum F_h}', sub: `\\dfrac{${n(Fr)}}{${n(Fhs)}}`, val: FSd, d: 3 });
      const okD = FSd >= 1.2;
      d.check(`$FS_d=${fmt(FSd)}\\geq1.2$ (con sismo)`, okD);
      checks.push({ label: 'Deslizamiento ($FS\\geq1.2$ con sismo)', ok: okD, detail: `FS = ${fmt(FSd)}` });
      d.h2('Esfuerzos en el terreno');
      let q1, q2;
      if (okT) { q1 = Fv / Lo * (1 + 6 * Math.abs(ecc) / Lo); q2 = Fv / Lo * (1 - 6 * Math.abs(ecc) / Lo); d.calc({ sym: 'q_{1,2}', f: '\\dfrac{\\sum F_v}{L_b}\\left(1\\pm\\dfrac{6e}{L_b}\\right)', sub: `\\dfrac{${n(Fv)}}{${n(Lo)}}\\left(1\\pm\\dfrac{6(${n(Math.abs(ecc))})}{${n(Lo)}}\\right)`, val: `${fmt(q1, 3)};\\;${fmt(q2, 3)}`, unit: 't/m^2' }); } else { const xr = Math.max(Math.min(Xr, Lo - Xr), 0.01); q1 = 2 * Fv / (3 * xr); q2 = 0; d.calc({ sym: 'q_{max}', f: '\\dfrac{2\\sum F_v}{3\\,x}', sub: `\\dfrac{2(${n(Fv)})}{3(${n(xr)})}`, val: q1, unit: 't/m^2', d: 3, note: 'Resultante fuera del núcleo: distribución triangular parcial.' }); }
      const okQ = q1 / 10 <= v.qadm && q2 >= 0;
      d.check(`$q_{max}=${fmt(q1 / 10, 3)}\\leq q_{adm}=${fmt(v.qadm)}$ kg/cm² sin tracciones`, okQ);
      checks.push({ label: 'Esfuerzo máximo en el terreno $\\leq q_{adm}$', ok: okQ, detail: `qmáx = ${fmt(q1 / 10, 3)} kg/cm²` });
      if (!(okT && okD && okV && okQ)) d.note('Alguna verificación no se cumple: aumente el dentellón, alargue la base del barraje o mejore el terreno de cimentación. El Excel original marcaba «OK» fijo en estas celdas.', 'warn');

      /* captación en avenida */
      d.h('Caudal en el canal de captación durante la avenida');
      const Hw = EB + H - CFC;
      d.calc({ sym: 'H_w', f: 'Elev_B+H-CFC', sub: `${n(EB)}+${n(H, 4)}-${n(CFC)}`, val: Hw, unit: 'm', d: 3, note: 'Carga sobre el fondo de la toma.' });
      const Ao = ycA * v.bcap;
      const fq = (y2) => { const g = trap(v.bcap, 0, 0, y2); return manningQ(g.A, g.R, v.scap, v.ncap) - v.Cd * Ao * Math.sqrt(2 * G * Math.max(Hw - y2, 0)); };
      const y2 = bisect(fq, 1e-4, Hw);
      const Qo = v.Cd * Ao * Math.sqrt(2 * G * (Hw - y2));
      d.eq('C_d\\,A_o\\sqrt{2g\\,(H_w-y_2)}=\\dfrac{1}{n}A_2R_2^{2/3}s^{1/2}');
      d.calc({ sym: 'y_2', val: y2, unit: 'm', d: 3 });
      d.calc({ sym: 'Q_o', f: 'C_dA_o\\sqrt{2g(H_w-y_2)}', sub: `${n(v.Cd)}(${n(Ao)})\\sqrt{19.62(${n(Hw)}-${n(y2)})}`, val: Qo, unit: 'm^3/s', d: 3 });
      const Qex = Qo - Qd;
      d.calc({ sym: 'Q_{exc}', f: 'Q_o-Q_{deriv}', sub: `${n(Qo)}-${n(Qd, 4)}`, val: Qex, unit: 'm^3/s', d: 3 });
      let Lal = 0;
      if (Qex > 0) {
        Lal = Qex / (2 / 3 * v.mual * Math.sqrt(2 * G) * Math.pow(v.hal, 1.5));
        d.calc({ sym: 'L_{al}', f: '\\dfrac{Q_{exc}}{\\tfrac23\\mu\\sqrt{2g}\\,h^{3/2}}', sub: `\\dfrac{${n(Qex)}}{\\tfrac23(${n(v.mual)})\\sqrt{19.62}(${n(v.hal)})^{3/2}}`, val: Lal, unit: 'm', d: 2, note: 'Longitud del aliviadero lateral de demasías (o regular con las compuertas).' });
      } else d.p('No hay excedente: no se requiere aliviadero lateral.');

      const results = [
        { label: 'Caudal de derivación', sym: 'Q_{d}', value: Qd, unit: 'm^3/s', d: 3, hl: true },
        { label: 'Altura del barraje', sym: 'P', value: P, unit: 'm', d: 2, hl: true },
        { label: 'Cota de la cresta', value: EB, unit: 'msnm', d: 2 },
        { label: 'Carga sobre la cresta', sym: 'H', value: H, unit: 'm', d: 4, hl: true },
        { label: 'Barraje fijo / canal de limpia', value: `${fmt(L1)} m / ${fmt(Ld)} m` },
        { label: 'Tirantes conjugados', sym: 'd_1,\\,d_2', value: `${fmt(d1, 3)} / ${fmt(d2, 3)} m` },
        { label: 'Froude al pie', sym: 'F_1', value: F1 },
        { label: 'Longitud de poza', sym: 'L_p', value: Lp, unit: 'm', d: 1 },
        { label: 'Espesor del colchón', sym: 'e', value: eCol, unit: 'm', d: 2 },
        { label: 'FS volteo / deslizamiento', value: `${fmt(FSv, 2)} / ${fmt(FSd, 2)}` },
        { label: 'Aliviadero lateral', sym: 'L_{al}', value: Lal, unit: 'm', d: 2 }
      ];
      // curvas
      const aforo = [];
      for (let i = 1; i <= 50; i++) { const y = yr * 1.6 * i / 50; const g = geomR(y); aforo.push({ x: manningQ(g.A, g.R, sr, nr), y: v.CFR + y }); }
      const hq = [];
      for (let i = 1; i <= 50; i++) { const h = H * 1.8 * i / 50; hq.push({ x: h, y: Qal(h) + Qcl(h) }); }
      const charts = [
        { id: 'barr', type: 'svg', wide: true, title: 'Perfil del barraje, resalto y colchón disipador', svg: drawBarraje({ P, H, Xc, Yc, xe, R: Remp, Lp, d1, d2, e: eCol, hb, prof }) },
        { id: 'aforo', type: 'xy', title: 'Curva de aforo del río', xLabel: 'Q (m³/s)', yLabel: 'Cota (m)', datasets: [{ label: 'Q (Manning)', data: aforo, color: '#0d9488' }, { label: 'Qmáx', data: [{ x: v.Qmax, y: v.CFR + yr }], points: true, showLine: false, color: '#dc2626', pointRadius: 6 }] },
        { id: 'HQ', type: 'xy', title: 'Descarga total del barraje vs carga H', xLabel: 'H (m)', yLabel: 'Q (m³/s)', datasets: [{ label: 'Qal + Qcl', data: hq, color: '#2563eb' }, { label: 'Q diseño', data: [{ x: 0, y: Qb }, { x: H * 1.8, y: Qb }], dash: true, color: '#dc2626', width: 1 }, { label: `H = ${fmt(H, 3)} m`, data: [{ x: H, y: Qb }], points: true, showLine: false, color: '#16a34a', pointRadius: 6 }] },
        { id: 'creager', type: 'xy', title: 'Perfil Creager (Scimemi)', xLabel: 'x (m)', yLabel: 'y (m)', datasets: [{ label: 'y = −K Ho (x/Ho)^n', data: prof, color: '#475569', points: true }] },
        { id: 'sp', type: 'xy', title: 'Diagrama de subpresión', xLabel: 'Recorrido Lx (m)', yLabel: 'Sp (kg/m²)', datasets: [{ label: 'Subpresión', data: spRows.map((s) => ({ x: s.r.lx, y: s.Sp })), color: '#d97706', points: true, fill: true }] },
        { id: 'fz', type: 'bar', title: 'Fuerzas sobre el barraje (t/m)', labels: ['Fh', 'Ea', 'Sh', 'Ve', 'Sp', 'Sv', 'W', 'Fr resistente'], yLabel: 't/m', datasets: [{ label: 'Fuerza', data: [Fh, Ea, Sh, Ve, Sp, Sv, Wt, Fr], color: '#7c3aed' }] }
      ];
      return { doc: d, results, checks, charts };
    },
    theory: [
      {
        title: 'Bocatoma y barraje', body: [
          'La bocatoma capta parte del caudal del río. El barraje eleva el nivel del agua para asegurar la derivación. El barraje mixto combina un tramo fijo (aliviadero con perfil Creager) y un tramo móvil (canal de limpia con compuertas).',
          { eq: 'Elev_B=CFC+y_n+h_v+0.20', name: 'Cota de la cresta del barraje' },
          { eq: 'A_1=\\dfrac{A_2}{10}\\;\\Rightarrow\\;L_d=\\dfrac{B}{11}', name: 'Predimensionamiento del canal de limpia' },
          { eq: 'Q_{al}=0.55\\,C\\,L\\,H^{3/2},\\qquad L=L_1-2(NK_p+K_a)H', name: 'Descarga sobre la cresta' },
          { eq: "Q_{cl}=C'\\,L''\\,(P+H)^{3/2}", name: 'Descarga por el canal de limpia' }
        ]
      },
      {
        title: 'Resalto hidráulico y poza', body: [
          { eq: 'P+H=d_1+\\dfrac{q^2}{2g\\,d_1^2}', name: 'Tirante al pie del barraje' },
          { eq: 'd_2=\\dfrac{d_1}{2}\\left(\\sqrt{1+8F_1^2}-1\\right)', name: 'Tirante conjugado (Bélanger)' },
          { eq: 'L_p=5(d_2-d_1)\\;\\text{(Lindquist)},\\qquad L_p=6\\,d_1F_1\\;\\text{(Safranez)}', name: 'Longitud de la poza' }
        ]
      },
      {
        title: 'Perfil Creager', body: [
          'El perfil de la cresta sigue la cara inferior de la lámina vertiente para evitar presiones negativas.',
          { eq: '\\dfrac{y}{H_o}=-K\\left(\\dfrac{x}{H_o}\\right)^n', name: 'Ecuación de Scimemi' },
          { eq: 'R=0.5\\,(P+H_o)', name: 'Radio de empalme con el colchón' }
        ]
      },
      {
        title: 'Filtración y subpresión', body: [
          { eq: 'L_w=\\sum L_v+\\dfrac{1}{3}\\sum L_h\\geq C_L\\,H', name: 'Criterio de Lane' },
          { table: { head: ['Suelo', '$C_L$'], rows: Object.entries(LANE).map(([k, c]) => [k, String(c)]) } },
          { eq: "S_p=\\gamma_w\\,c'\\left(h+h'-\\dfrac{h}{L}L_x\\right)", name: 'Subpresión en un punto' },
          { eq: 'e=\\dfrac{4}{3}\\,\\dfrac{S_p}{\\gamma_c},\\qquad e=0.2\\,q^{1/2}Z^{1/4}', name: 'Espesor del colchón (subpresión y Taraimovich)' },
          { eq: 'Q=k\\,i\\,A', name: 'Ley de Darcy' }
        ]
      },
      {
        title: 'Estabilidad', body: [
          { eq: 'X_r=\\dfrac{\\sum M_{(+)}-\\sum M_{(-)}}{\\sum F_v},\\qquad |e|\\leq\\dfrac{L}{6}', name: 'Resultante en el tercio central' },
          { eq: 'FS_v=\\dfrac{\\sum M_{(+)}}{\\sum M_{(-)}}\\geq1.5,\\qquad FS_d=\\dfrac{\\mu\\sum F_v+E_p}{\\sum F_h}\\geq1.2', name: 'Volteo y deslizamiento' },
          { eq: 'q=\\dfrac{\\sum F_v}{L}\\left(1\\pm\\dfrac{6e}{L}\\right)\\leq q_{adm}', name: 'Esfuerzos en el terreno' },
          { eq: 'P_e=C\\,i\\,\\gamma_a\\,h,\\quad V_e=0.726\\,P_e\\,h,\\quad M_e=0.29\\,P_e\\,h^2', name: 'Empuje sísmico del agua (Westergaard)' }
        ]
      }
    ],
    fixes: [
      'La ubicación de la resultante $X_r$ estaba escrita a mano (2.10 m). Con las fuerzas del propio Excel da $X_r=(73.44-22.70)/44.27=1.15$ m, fuera del tercio central.',
      'La verificación de deslizamiento mostraba «OK!» fijo aunque $F_r=13.28<F_h=16.45$ t. La de esfuerzos también decía «OK!» con $q_1=1.24>1.20$ kg/cm². Ahora todas las verificaciones se calculan.',
      'El peso del barraje sumaba la ordenada del perfil Creager en vez de restarla (altura $=P+|y|+h_b$), así que el peso quedaba muy sobreestimado. Además, el perfil se extendía hasta $y=-5$ m, más abajo que el lecho. Aquí la altura es $P-|y|+h_b$ y el perfil termina en $y=-P$.',
      'La tabla de subpresiones tenía las referencias desplazadas una fila (cada punto usaba el $h\'$ del punto anterior) y usaba la distancia horizontal en lugar del recorrido ponderado. Aquí cada punto usa su propio $L_x$ y $h\'$.',
      'El coeficiente de filtración se obtenía como $c=L_n/H$ con $L_n=L_c$ (razonamiento circular). Aquí se aplica el criterio de Lane con el coeficiente según el tipo de suelo.',
      'La subpresión de estabilidad usaba $\\gamma=1.45$ (agua con sedimentos). Para el agua filtrada corresponde $\\gamma_w=1.0$.',
      'Se calculaba $Q_d=0.75\\cdot1.5\\,Q_{max}$ pero no se usaba. Ahora el criterio del caudal de diseño es una opción.',
      'Los tirantes $d_1$ del resalto y del canal se obtenían por tanteo. Aquí se resuelven con precisión numérica.'
    ]
  });
})();
