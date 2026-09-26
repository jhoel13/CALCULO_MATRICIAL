/* Módulo: Sifón invertido — fuente: DISEÑO DE SIFONES.xls (11 sifones) */
(function () {
  'use strict';
  const { G, fmt, n, Doc, svg, rad, deg, ceilTo } = HC;

  const SIF = [
    ['1 · Cañada', 4, 1.87, 73.55, 3.55, 19, 12], ['2 · Cañada', 4, 1.87, 72.35, 5.0, 30, 12], ['3 · Arroyo Bacuí', 4, 1.87, 69.35, 8.245, 47, 12],
    ['4 · Paso vehicular', 4, 1.28, 71.67, 1.45, 7, 20], ['5 · Cañada', 4, 1.28, 70.07, 3.065, 18, 12], ['6 · Cañada', 5, 1.5, 71.07, 12.2, 71, 12],
    ['7 · Cañada', 4, 1.28, 69.57, 3.25, 17, 12], ['8 · Río Cenoví', 4, 1.32, 64.85, 6.275, 35, 12], ['9 · Caño', 5, 1.32, 64.05, 2.4, 14, 12],
    ['10 · Arroyo', 4, 1.17, 62.95, 2.7, 13, 12], ['11 · Caño', 4, 1.17, 62.15, 1.7, 10, 12]
  ];

  function drawProfile(o) {
    const W = 680, H = 320;
    const xs = o.st, zmin = Math.min(...o.inv) - 0.8, zmax = o.NA + o.BLt + 0.6;
    const S = svg.scaler2(xs[0] - 1, xs[xs.length - 1] + 1, zmin, zmax, W, H, 46);
    let b = '';
    // terreno
    const ground = [[xs[0] - 1, o.ban], [xs[2], o.ban], [xs[3] + 1, zmin + 0.3 + (o.ban - zmin) * 0.25], [xs[4] - 1, zmin + 0.3 + (o.ban - zmin) * 0.25], [xs[5], o.ban2], [xs[7] + 1, o.ban2]];
    b += svg.poly(ground.map(([x, z]) => [S.X(x), S.Y(z)]).concat([[S.X(xs[7] + 1), S.Y(zmin)], [S.X(xs[0] - 1), S.Y(zmin)]]), 'sv-soil');
    // agua en canales
    b += svg.poly([[S.X(xs[0] - 1), S.Y(o.NA)], [S.X(xs[2]), S.Y(o.NA)], [S.X(xs[2]), S.Y(o.inv[2])], [S.X(xs[1]), S.Y(o.inv[1])], [S.X(xs[0] - 1), S.Y(o.inv[0])]], 'sv-water');
    b += svg.poly([[S.X(xs[5]), S.Y(o.NAH + (o.inv[6] - o.inv[7]))], [S.X(xs[7] + 1), S.Y(o.NAH)], [S.X(xs[7] + 1), S.Y(o.inv[7])], [S.X(xs[6]), S.Y(o.inv[6])], [S.X(xs[5]), S.Y(o.inv[5])]], 'sv-water');
    // tubería
    const pipe = [2, 3, 4, 5].map((i) => [S.X(xs[i]), S.Y(o.inv[i] + o.D / 2)]);
    b += svg.pline(pipe, 'sv-pipe') + svg.pline(pipe, 'sv-pipew');
    // fondo
    b += svg.pline(o.inv.map((z, i) => [S.X(xs[i]), S.Y(z)]), 'sv-line');
    // línea de energía
    b += svg.pline(o.egl.map(([x, z]) => [S.X(x), S.Y(z)]), 'sv-egl');
    'ABCDEFGH'.split('').forEach((L, i) => {
      b += svg.line(S.X(xs[i]), S.Y(o.inv[i]) + 4, S.X(xs[i]), S.Y(zmin) - 2, 'sv-thin');
      b += svg.txt(S.X(xs[i]), S.Y(zmin) + 14, L, 'sv-label');
      b += svg.txt(S.X(xs[i]), S.Y(o.inv[i]) + 16, fmt(o.inv[i], 2), 'sv-small', 'middle');
    });
    b += svg.txt(S.X(xs[0]) + 4, S.Y(o.NA) - 6, `NA ${fmt(o.NA, 2)}`, 'sv-small', 'start');
    b += svg.txt(S.X(xs[7]) - 4, S.Y(o.NAH) - 6, `NA ${fmt(o.NAH, 2)}`, 'sv-small', 'end');
    b += svg.txt(S.X((xs[3] + xs[4]) / 2), S.Y(o.inv[3] + o.D) - 10, `Tubería Ø${o.Dp}" · L = ${fmt(o.Lt, 2)} m`, 'sv-label');
    b += svg.txt(S.X((xs[0] + xs[1]) / 2), S.Y(o.egl[0][1]) - 6, 'línea de energía', 'sv-small');
    return svg.frame(W, H, b, 'Perfil longitudinal del sifón');
  }

  HC.register({
    id: 'sifon',
    title: 'Sifón invertido',
    short: 'Sifón invertido',
    icon: 'sifon',
    group: 'obras',
    source: 'DISEÑO DE SIFONES.xls',
    description: 'Diámetro de la tubería, cotas de las estaciones A–H, sellos hidráulicos, longitudes, pérdidas de carga y comparación con la carga disponible.',
    tags: ['Pérdidas de carga', 'Cotas', 'Transiciones'],
    inputs: [
      {
        title: 'Datos generales', fields: [
          { id: 'elem', label: 'Elemento a cruzar', type: 'text', value: 'Cañada' },
          { id: 'Q', label: 'Caudal', sym: 'Q', unit: 'm^3/s', value: 4, step: 0.1 },
          { id: 'V1', label: 'Velocidad en el canal de entrada', sym: 'V_1', unit: 'm/s', value: 1.87, step: 0.01 },
          { id: 'V2', label: 'Velocidad en el canal de salida', sym: 'V_2', unit: 'm/s', value: 1.87, step: 0.01 },
          { id: 'Vt', label: 'Velocidad de diseño en la tubería', sym: 'V_t', unit: 'm/s', value: 1.87, step: 0.01, help: 'Usual 1.0–3.0 m/s en sifones de concreto.' },
          { id: 'hw', label: 'Tirante en el canal', sym: 'h_w', unit: 'm', value: 1.05, step: 0.05 },
          { id: 'NA', label: 'Nivel de agua en la estación A', sym: 'NA_A', unit: 'm', value: 73.55, step: 0.01 },
          { id: 'Sc', label: 'Pendiente del canal', sym: 'S_c', unit: 'm/m', value: 0.0015, step: 0.0001 }
        ]
      },
      {
        title: 'Geometría del sifón', fields: [
          { id: 'LAB', label: 'Longitud de canal A–B', unit: 'm', value: 15, step: 1 },
          { id: 'ltf', label: 'Factor de longitud de transición', sym: 'L_t/D', value: 4, step: 0.5 },
          { id: 'alfa', label: 'Ángulo de doblado a la entrada', sym: '\\alpha_1', unit: '°', value: 12, step: 1 },
          { id: 'x1', label: 'Proyección horizontal C–D', sym: 'x_1', unit: 'm', value: 3.55, step: 0.05 },
          { id: 'Lh', label: 'Longitud del tramo horizontal D–E', sym: 'L_h', unit: 'm', value: 19, step: 1 },
          { id: 'St', label: 'Pendiente del tramo horizontal', sym: 'S_t', unit: 'm/m', value: 0.007, step: 0.001 },
          { id: 'x2', label: 'Proyección horizontal E–F', sym: 'x_2', unit: 'm', value: 3.55, step: 0.05 },
          { id: 'LGH', label: 'Longitud de canal G–H', unit: 'm', value: 15, step: 1 }
        ]
      },
      {
        title: 'Coeficientes', collapsed: true, fields: [
          { id: 'nt', label: 'Rugosidad del tubo', sym: 'n', value: 0.013, step: 0.001 },
          { id: 'Ke', label: 'Coeficiente de pérdida de entrada', sym: 'K_e', value: 0.4, step: 0.05 },
          { id: 'Ks', label: 'Coeficiente de pérdida de salida', sym: 'K_s', value: 0.65, step: 0.05 },
          { id: 'Cc', label: 'Coeficiente de codo', sym: 'C', value: 0.25, step: 0.05 },
          { id: 'Fb', label: 'Borde libre normal', sym: 'F_b', unit: 'm', value: 0.6, step: 0.05 },
          { id: 'Fba', label: 'Borde libre adicional', sym: 'F_{b,ad}', unit: 'm', value: 0.3, step: 0.05 },
          { id: 'sello', label: 'Sello hidráulico mínimo', unit: 'm', value: 0.076, step: 0.001, help: 'Mínimo de 3" (0.076 m).' }
        ]
      }
    ],
    presets: SIF.map(([nm, Q, V, NA, x1, Lh, a]) => ({ name: `Sifón ${nm} (Q=${Q} m³/s)`, values: { elem: nm.split('· ')[1], Q, V1: V, V2: V, Vt: V, NA, x1, x2: x1, Lh, alfa: a } })),
    compute(v) {
      const d = new Doc();
      const checks = [];
      if (!(v.Q > 0 && v.Vt > 0)) throw new Error('Q y la velocidad deben ser positivos.');
      d.h('Cargas de velocidad en los canales');
      const hv1 = v.V1 * v.V1 / (2 * G), hv2 = v.V2 * v.V2 / (2 * G);
      d.calc({ sym: 'h_{v1}', f: '\\dfrac{V_1^2}{2g}', sub: `\\dfrac{${n(v.V1)}^2}{2(9.81)}`, val: hv1, unit: 'm', d: 4 });
      d.calc({ sym: 'h_{v2}', f: '\\dfrac{V_2^2}{2g}', sub: `\\dfrac{${n(v.V2)}^2}{2(9.81)}`, val: hv2, unit: 'm', d: 4 });

      d.h('Diámetro de la tubería');
      const A0 = v.Q / v.Vt;
      d.calc({ sym: 'A', f: 'Q/V_t', sub: `${n(v.Q)}/${n(v.Vt)}`, val: A0, unit: 'm^2', d: 4 });
      const Di = Math.sqrt(4 * A0 / Math.PI);
      d.calc({ sym: 'D_i', f: '\\sqrt{\\dfrac{4A}{\\pi}}', sub: `\\sqrt{\\dfrac{4(${n(A0, 4)})}{\\pi}}`, val: Di, unit: 'm', d: 4 });
      const Dp = Math.ceil(Di / 0.0254 - 1e-9);
      const D = Dp * 0.0254;
      d.p(`Se adopta el diámetro comercial inmediato superior: **${Dp}"** ($D=${fmt(D, 4)}$ m).`);
      d.h('Propiedades hidráulicas del tubo');
      const At = Math.PI * D * D / 4;
      const Vt = v.Q / At, hvt = Vt * Vt / (2 * G);
      const P = Math.PI * D, R = D / 4;
      d.calc({ sym: 'A_t', f: '\\dfrac{\\pi D^2}{4}', sub: `\\dfrac{\\pi(${n(D, 4)})^2}{4}`, val: At, unit: 'm^2', d: 4 });
      d.calc({ sym: 'V', f: 'Q/A_t', sub: `${n(v.Q)}/${n(At, 4)}`, val: Vt, unit: 'm/s', d: 4 });
      d.calc({ sym: 'h_v', f: '\\dfrac{V^2}{2g}', sub: `\\dfrac{${n(Vt, 4)}^2}{19.62}`, val: hvt, unit: 'm', d: 4 });
      d.calc({ sym: 'P', f: '\\pi D', sub: `\\pi(${n(D, 4)})`, val: P, unit: 'm', d: 4 });
      d.calc({ sym: 'R', f: 'D/4', sub: `${n(D, 4)}/4`, val: R, unit: 'm', d: 4 });
      const Sf = Math.pow(Vt * v.nt / Math.pow(R, 2 / 3), 2);
      d.calc({ sym: 'S_f', f: '\\left(\\dfrac{V\\,n}{R^{2/3}}\\right)^2', sub: `\\left(\\dfrac{${n(Vt, 4)}(${n(v.nt, 4)})}{${n(R, 4)}^{2/3}}\\right)^2`, val: Sf, unit: 'm/m', d: 6 });
      const okV = Vt >= 1 && Vt <= 3.5;
      d.check(`Velocidad en la tubería $1.0\\leq V=${fmt(Vt)}\\leq3.5$ m/s`, okV);
      checks.push({ label: 'Velocidad en la tubería entre 1.0 y 3.5 m/s', ok: okV, detail: `V = ${fmt(Vt)} m/s` });

      d.h('Borde libre y banqueta');
      const BLt = v.Fb + v.Fba;
      d.calc({ sym: 'F_{b,total}', f: 'F_b+F_{b,ad}', sub: `${n(v.Fb)}+${n(v.Fba)}`, val: BLt, unit: 'm', d: 2, note: 'Debe extenderse 15 m aguas arriba del sifón.' });
      const ban = v.NA + BLt;
      d.calc({ sym: 'Cota_{banq,A}', f: 'NA_A+F_{b,total}', sub: `${n(v.NA)}+${n(BLt)}`, val: ban, unit: 'm', d: 3 });

      d.h('Transición de entrada y cotas B, C y D');
      const B = v.NA - v.hw;
      d.calc({ sym: 'Cota_B', f: 'NA_A-h_w', sub: `${n(v.NA)}-${n(v.hw)}`, val: B, unit: 'm', d: 3 });
      const a1 = rad(v.alfa);
      const Ht = D / Math.cos(a1);
      d.calc({ sym: 'H_t', f: '\\dfrac{D}{\\cos\\alpha_1}', sub: `\\dfrac{${n(D, 4)}}{\\cos ${fmt(v.alfa)}^\\circ}`, val: Ht, unit: 'm', d: 4, note: 'Abertura vertical del tubo inclinado.' });
      const dhvE = hvt - hv1;
      const s1 = 1.5 * dhvE;
      d.calc({ sym: 's_e', f: '1.5\\,\\Delta h_v=1.5\\,(h_v-h_{v1})', sub: `1.5(${n(hvt, 4)}-${n(hv1, 4)})`, val: s1, unit: 'm', d: 4 });
      const sello = Math.max(s1, v.sello);
      if (s1 < v.sello) d.p(`Sello insuficiente: se adopta el mínimo $s_e=${fmt(v.sello, 3)}$ m.`);
      const C = v.NA - Ht - sello;
      d.calc({ sym: 'Cota_C', f: 'NA_A-H_t-s_e', sub: `${n(v.NA)}-${n(Ht, 4)}-${n(sello, 3)}`, val: C, unit: 'm', d: 3 });
      const p = B - C;
      d.calc({ sym: 'p', f: 'Cota_B-Cota_C', sub: `${n(B)}-${n(C)}`, val: p, unit: 'm', d: 3 });
      const okp = p <= 0.75 * D;
      d.check(`Desnivel en la transición $p=${fmt(p)}\\leq\\tfrac34D=${fmt(0.75 * D)}$ m`, okp);
      checks.push({ label: 'Desnivel de entrada $p\\leq\\tfrac34 D$', ok: okp, detail: `p = ${fmt(p)} m` });
      const h1 = v.x1 / Math.cos(a1), y1 = v.x1 * Math.tan(a1);
      d.calc({ sym: 'h_1', f: '\\dfrac{x_1}{\\cos\\alpha_1}', sub: `\\dfrac{${n(v.x1)}}{\\cos ${fmt(v.alfa)}^\\circ}`, val: h1, unit: 'm', d: 4 });
      d.calc({ sym: 'y_1', f: 'x_1\\tan\\alpha_1', sub: `${n(v.x1)}\\tan ${fmt(v.alfa)}^\\circ`, val: y1, unit: 'm', d: 4 });
      const Dd = C - y1;
      d.calc({ sym: 'Cota_D', f: 'Cota_C-y_1', sub: `${n(C)}-${n(y1, 4)}`, val: Dd, unit: 'm', d: 3 });
      d.h('Tramo horizontal: cota E');
      const Ee = Dd - v.Lh * v.St;
      d.calc({ sym: 'Cota_E', f: 'Cota_D-L_h\\,S_t', sub: `${n(Dd)}-${n(v.Lh)}(${n(v.St)})`, val: Ee, unit: 'm', d: 3 });

      d.h('Transición de salida y cotas F, G y H');
      const Lt = ceilTo(v.ltf * D, 0.5);
      const LBG = Lt + v.x1 + v.Lh + v.x2 + Lt;
      const Gg = B - v.Sc * LBG;
      d.calc({ sym: 'L_t', f: `${fmt(v.ltf)}\\,D`, sub: `${fmt(v.ltf)}(${n(D, 4)})`, val: v.ltf * D, unit: 'm', d: 3, note: `Se adopta $L_t = ${fmt(Lt, 1)}$ m.` });
      d.calc({ sym: 'Cota_G', f: 'Cota_B-S_c\\,L_{BG}', sub: `${n(B)}-${n(v.Sc, 4)}(${n(LBG, 2)})`, val: Gg, unit: 'm', d: 3 });
      const ps = D / 2;
      const F = Gg - ps;
      d.calc({ sym: 'p_s', f: 'D/2', sub: `${n(D, 4)}/2`, val: ps, unit: 'm', d: 4 });
      d.calc({ sym: 'Cota_F', f: 'Cota_G-p_s', sub: `${n(Gg)}-${n(ps, 4)}`, val: F, unit: 'm', d: 3 });
      const a2 = Math.atan((F - Ee) / v.x2);
      const h2 = v.x2 / Math.cos(a2);
      d.calc({ sym: '\\alpha_2', f: '\\arctan\\dfrac{Cota_F-Cota_E}{x_2}', sub: `\\arctan\\dfrac{${n(F)}-${n(Ee)}}{${n(v.x2)}}`, val: deg(a2), unit: '^\\circ', d: 2 });
      d.calc({ sym: 'h_2', f: '\\dfrac{x_2}{\\cos\\alpha_2}', sub: `\\dfrac{${n(v.x2)}}{\\cos ${fmt(deg(a2), 2)}^\\circ}`, val: h2, unit: 'm', d: 4 });
      const ss = v.hw + ps - Ht;
      d.calc({ sym: 's_s', f: 'h_w+p_s-H_t', sub: `${n(v.hw)}+${n(ps, 4)}-${n(Ht, 4)}`, val: ss, unit: 'm', d: 4 });
      const okss = ss >= Ht / 6;
      d.check(`Sello a la salida $s_s=${fmt(ss)}\\geq H_t/6=${fmt(Ht / 6)}$ m`, okss);
      checks.push({ label: 'Sello hidráulico de salida $\\geq H_t/6$', ok: okss, detail: `s = ${fmt(ss)} m` });
      const Hh = Gg - v.Sc * v.LGH;
      d.calc({ sym: 'Cota_H', f: 'Cota_G-S_c\\,L_{GH}', sub: `${n(Gg)}-${n(v.Sc, 4)}(${n(v.LGH)})`, val: Hh, unit: 'm', d: 3 });
      const NAH = Hh + v.hw;

      d.h('Longitud del sifón y carga disponible');
      const L = h1 + v.Lh + h2;
      d.calc({ sym: 'L', f: 'h_1+L_h+h_2', sub: `${n(h1, 4)}+${n(v.Lh)}+${n(h2, 4)}`, val: L, unit: 'm', d: 3 });
      const disp = v.NA - NAH;
      d.calc({ sym: '\\Delta H_{disp}', f: 'NA_A-NA_H', sub: `${n(v.NA)}-${n(NAH)}`, val: disp, unit: 'm', d: 4 });

      d.h('Pérdidas de carga');
      const hi = v.Ke * Math.abs(hvt - hv1);
      d.calc({ sym: 'h_i', f: 'K_e\\,|h_v-h_{v1}|', sub: `${n(v.Ke)}|${n(hvt, 4)}-${n(hv1, 4)}|`, val: hi, unit: 'm', d: 5 });
      const hf = L * Sf;
      d.calc({ sym: 'h_f', f: 'L\\,S_f', sub: `${n(L)}(${n(Sf, 6)})`, val: hf, unit: 'm', d: 5 });
      const hc = v.Cc * (Math.sqrt(v.alfa / 90) + Math.sqrt(Math.abs(deg(a2)) / 90)) * hvt;
      d.calc({ sym: 'h_c', f: 'C\\left(\\sqrt{\\dfrac{\\alpha_1}{90^\\circ}}+\\sqrt{\\dfrac{\\alpha_2}{90^\\circ}}\\right)h_v', sub: `${n(v.Cc)}\\left(\\sqrt{\\dfrac{${fmt(v.alfa)}}{90}}+\\sqrt{\\dfrac{${fmt(Math.abs(deg(a2)), 2)}}{90}}\\right)(${n(hvt, 4)})`, val: hc, unit: 'm', d: 5 });
      const ho = v.Ks * Math.abs(hvt - hv2);
      d.calc({ sym: 'h_o', f: 'K_s\\,|h_v-h_{v2}|', sub: `${n(v.Ks)}|${n(hvt, 4)}-${n(hv2, 4)}|`, val: ho, unit: 'm', d: 5 });
      const Hl = hi + hf + hc + ho;
      d.calc({ sym: 'H_L', f: 'h_i+h_f+h_c+h_o', sub: `${n(hi, 5)}+${n(hf, 5)}+${n(hc, 5)}+${n(ho, 5)}`, val: Hl, unit: 'm', d: 4 });
      d.calc({ sym: '1.10\\,H_L', sub: `1.10(${n(Hl, 4)})`, val: 1.1 * Hl, unit: 'm', d: 4, note: 'Se agrega 10 % por seguridad.' });
      const okH = 1.1 * Hl <= disp;
      d.check(`Carga disponible suficiente: $1.1\\,H_L=${fmt(1.1 * Hl, 4)}\\leq\\Delta H=${fmt(disp, 4)}$ m`, okH);
      checks.push({ label: 'Carga disponible $\\geq 1.1\\,H_L$', ok: okH, detail: `ΔH = ${fmt(disp, 4)} m, 1.1 HL = ${fmt(1.1 * Hl, 4)} m` });

      d.h('Dimensiones de las transiciones');
      const yT = (v.NA - B) + BLt;
      const aT = (B + yT) - C;
      d.calc({ sym: 'y', f: '(NA_A-Cota_B)+F_{b,total}', sub: `(${n(v.NA)}-${n(B)})+${n(BLt)}`, val: yT, unit: 'm', d: 3 });
      d.calc({ sym: 'a', f: '(Cota_B+y)-Cota_C', sub: `(${n(B)}+${n(yT)})-${n(C)}`, val: aT, unit: 'm', d: 3 });
      d.calc({ sym: 'B', f: '0.303\\,D', sub: `0.303(${n(D, 4)})`, val: 0.303 * D, unit: 'm', d: 3 });
      d.calc({ sym: 'L_{prot}', f: '2.5\\,h_w', sub: `2.5(${n(v.hw)})`, val: 2.5 * v.hw, unit: 'm', d: 2, note: 'Protección contra erosión (enrocado) sólo en la transición de salida.' });

      d.h('Resumen de cotas');
      const st = [0, v.LAB, v.LAB + Lt, v.LAB + Lt + v.x1, v.LAB + Lt + v.x1 + v.Lh, v.LAB + Lt + v.x1 + v.Lh + v.x2, v.LAB + 2 * Lt + v.x1 + v.Lh + v.x2, v.LAB + 2 * Lt + v.x1 + v.Lh + v.x2 + v.LGH];
      const inv = [B + v.Sc * v.LAB * 0, B, C, Dd, Ee, F, Gg, Hh];
      d.table(['Estación', 'Distancia (m)', 'Cota de fondo (m)', 'Descripción'], 'ABCDEFGH'.split('').map((L, i) => [L, fmt(st[i], 2), fmt(inv[i], 3), ['Canal aguas arriba', 'Inicio transición de entrada', 'Entrada al tubo', 'Fin del codo de entrada', 'Inicio del codo de salida', 'Salida del tubo', 'Fin transición de salida', 'Canal aguas abajo'][i]]));

      const E0 = v.NA + hv1;
      const egl = [[st[0], E0], [st[2], E0 - hi], [st[3], E0 - hi - hf * h1 / L - hc / 2], [st[4], E0 - hi - hf * (h1 + v.Lh) / L - hc / 2], [st[5], E0 - hi - hf - hc], [st[6], E0 - Hl], [st[7], E0 - Hl]];
      const results = [
        { label: 'Diámetro adoptado', sym: 'D', value: `${Dp}" (${fmt(D, 3)} m)`, hl: true },
        { label: 'Velocidad en el tubo', sym: 'V', value: Vt, unit: 'm/s' },
        { label: 'Longitud del sifón', sym: 'L', value: L, unit: 'm', d: 2 },
        { label: 'Pérdida total', sym: 'H_L', value: Hl, unit: 'm', d: 4, hl: true },
        { label: 'Carga disponible', sym: '\\Delta H', value: disp, unit: 'm', d: 4, hl: true },
        { label: 'Cota C (entrada)', value: C, unit: 'm', d: 3 },
        { label: 'Cota E', value: Ee, unit: 'm', d: 3 },
        { label: 'Cota F (salida)', value: F, unit: 'm', d: 3 },
        { label: 'Longitud de transición', sym: 'L_t', value: Lt, unit: 'm', d: 1 }
      ];
      const charts = [
        { id: 'perfil', type: 'svg', wide: true, title: `Perfil longitudinal — sifón bajo ${v.elem}`, svg: drawProfile({ st, inv, D, Dp, NA: v.NA, NAH, BLt, ban, ban2: NAH + BLt, egl, Lt: L }) },
        { id: 'perd', type: 'bar', title: 'Distribución de las pérdidas de carga', labels: ['Entrada', 'Fricción', 'Codos', 'Salida', 'Total ×1.1', 'Disponible'], yLabel: 'Pérdida (m)', datasets: [{ label: 'Carga (m)', data: [hi, hf, hc, ho, 1.1 * Hl, disp], color: '#2563eb' }] },
        { id: 'egl', type: 'xy', title: 'Línea de energía y rasante', xLabel: 'Distancia (m)', yLabel: 'Cota (m)', datasets: [
          { label: 'Línea de energía', data: egl.map(([x, y]) => ({ x, y })), color: '#dc2626', dash: true },
          { label: 'Fondo / invert del tubo', data: st.map((x, i) => ({ x, y: inv[i] })), color: '#475569', points: true },
          { label: 'Clave del tubo', data: [2, 3, 4, 5].map((i) => ({ x: st[i], y: inv[i] + Ht })), color: '#0d9488' }] }
      ];
      return { doc: d, results, checks, charts };
    },
    theory: [
      {
        title: 'Sifón invertido', body: [
          'Conducto cerrado que trabaja a presión y permite que un canal cruce por debajo de una depresión, un río, un camino o un dren. Funciona por diferencia de nivel entre la entrada y la salida: la carga disponible debe superar la suma de las pérdidas.',
          { list: ['Transición de entrada con sello hidráulico que impide la entrada de aire.', 'Tubería: codos de entrada y salida, y tramo horizontal con pendiente mínima para el drenaje.', 'Transición de salida y protección contra la erosión.'] },
          { eq: 'A=\\dfrac{Q}{V_t},\\qquad D=\\sqrt{\\dfrac{4A}{\\pi}}', name: 'Diámetro de la tubería' }
        ]
      },
      {
        title: 'Sellos hidráulicos y cotas', body: [
          { eq: 's_e=1.5\\,\\Delta h_v\\;\\geq\\;0.076\\ \\mathrm{m}', name: 'Sello a la entrada' },
          { eq: 'H_t=\\dfrac{D}{\\cos\\alpha},\\qquad Cota_C=NA_A-H_t-s_e', name: 'Cota de entrada del tubo' },
          { eq: 'p\\leq\\tfrac34D\\;(\\text{entrada}),\\qquad p_s\\leq\\tfrac12D\\;(\\text{salida})', name: 'Desniveles máximos en las transiciones' },
          { eq: 's_s=h_w+p_s-H_t\\geq\\dfrac{H_t}{6}', name: 'Sello a la salida' }
        ]
      },
      {
        title: 'Pérdidas de carga', body: [
          { eq: 'h_i=K_e\\,\\Delta h_v,\\quad K_e\\approx0.4', name: 'Pérdida por entrada' },
          { eq: 'h_f=L\\left(\\dfrac{V\\,n}{R^{2/3}}\\right)^2', name: 'Pérdida por fricción (Manning)' },
          { eq: 'h_c=C\\sum\\sqrt{\\dfrac{\\alpha}{90^\\circ}}\\;\\dfrac{V^2}{2g},\\quad C=0.25', name: 'Pérdida por codos' },
          { eq: 'h_o=K_s\\,\\Delta h_v,\\quad K_s\\approx0.65', name: 'Pérdida por salida' },
          { eq: '1.10\\,(h_i+h_f+h_c+h_o)\\leq NA_A-NA_H', name: 'Condición de funcionamiento' }
        ]
      }
    ],
    fixes: [
      'Las pérdidas de entrada y salida y el sello hidráulico daban valores negativos ($h_v-h_{v1}<0$ cuando las velocidades eran iguales) y aun así la hoja mostraba «correcto !!!». Aquí se usa el valor absoluto de $\\Delta h_v$ y el sello mínimo de 3".',
      'La pérdida por codos solo consideraba el ángulo de entrada, contado dos veces. Aquí se suman los dos codos con sus ángulos reales ($\\alpha_1$ y $\\alpha_2$).',
      'El sello de salida se calculaba pero no se comparaba con $H_t/6$. En el sifón 1 no cumple (0.188 < 0.281 m); ahora se indica.',
      'La pendiente de fricción del Excel ($S_f=0.000874$) no corresponde a Manning con $n=0.013$, $V=1.87$ m/s y $R=D/4=0.413$ m, que da $S_f=0.00192$. Con el valor correcto, el sifón 1 tiene una carga disponible (0.083 m) justa frente a $1.1\\,H_L$ (0.091 m): conviene aumentar el diámetro o el desnivel.',
      'Las 11 hojas repetían el mismo cálculo. Aquí es una sola calculadora y cada sifón se carga desde «Ejemplos».'
    ]
  });
})();
