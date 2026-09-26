/* Módulo: Acueducto / puente canal — fuente: DISEÑO DE ACUEDUCTO.xlsx */
(function () {
  'use strict';
  const { G, fmt, n, bisect, Doc, svg, rad, ceilTo, bar, asFlexion } = HC;

  const TRANS = { curvado: { l: 'Curvado', ke: 0.10, ks: 0.20 }, cuadrante: { l: 'Cuadrante cilíndrico', ke: 0.15, ks: 0.25 }, simplificado: { l: 'Simplificado en línea recta', ke: 0.20, ks: 0.30 }, recta: { l: 'Línea recta', ke: 0.30, ks: 0.50 }, cuadrados: { l: 'Extremos cuadrados', ke: 0.30, ks: 0.75 } };
  const BAR_OPTS = HC.BARS.map((b) => ({ v: b.id, l: `Ø ${b.id}"` }));

  function drawSection(o) {
    const W = 560, H = 360;
    const tot = o.Hcol + o.hz + o.Hc + o.hv / 100 + 0.3;
    const S = svg.scaler(-o.K / 2 - 0.5, o.K / 2 + 0.5, -o.hz - 0.4, o.Hcol + o.hv / 100 + o.Hc + 0.3, W, H, 26);
    let b = '';
    const tw = 0.15; // espesor de pared de la caja
    // terreno
    b += `<rect x="${S.X(-o.K / 2 - 0.5)}" y="${S.Y(0)}" width="${(o.K + 1) * S.s}" height="${(o.hz + 0.4) * S.s}" class="sv-soil"/>`;
    // zapata
    b += svg.poly([[S.X(-o.K / 2), S.Y(-o.hz)], [S.X(o.K / 2), S.Y(-o.hz)], [S.X(o.K / 2), S.Y(0)], [S.X(-o.K / 2), S.Y(0)]], 'sv-concrete-p');
    // columna
    b += svg.poly([[S.X(-o.a / 2), S.Y(0)], [S.X(o.a / 2), S.Y(0)], [S.X(o.a / 2), S.Y(o.Hcol)], [S.X(-o.a / 2), S.Y(o.Hcol)]], 'sv-concrete-p');
    // viga cabezal
    const yb = o.Hcol, hv = o.hv / 100;
    b += svg.poly([[S.X(-o.b / 2 - tw), S.Y(yb)], [S.X(o.b / 2 + tw), S.Y(yb)], [S.X(o.b / 2 + tw), S.Y(yb + hv)], [S.X(-o.b / 2 - tw), S.Y(yb + hv)]], 'sv-concrete');
    // caja
    const y0 = yb + hv;
    b += svg.poly([[S.X(-o.b / 2 - tw), S.Y(y0)], [S.X(o.b / 2 + tw), S.Y(y0)], [S.X(o.b / 2 + tw), S.Y(y0 + o.Hc)], [S.X(o.b / 2), S.Y(y0 + o.Hc)], [S.X(o.b / 2), S.Y(y0 + tw)], [S.X(-o.b / 2), S.Y(y0 + tw)], [S.X(-o.b / 2), S.Y(y0 + o.Hc)], [S.X(-o.b / 2 - tw), S.Y(y0 + o.Hc)]], 'sv-concrete');
    b += svg.poly([[S.X(-o.b / 2), S.Y(y0 + tw)], [S.X(o.b / 2), S.Y(y0 + tw)], [S.X(o.b / 2), S.Y(y0 + tw + o.y)], [S.X(-o.b / 2), S.Y(y0 + tw + o.y)]], 'sv-water');
    b += svg.line(S.X(-o.b / 2), S.Y(y0 + tw + o.y), S.X(o.b / 2), S.Y(y0 + tw + o.y), 'sv-wsurf');
    b += svg.dim(S.X(-o.b / 2), S.Y(y0 + o.Hc), S.X(o.b / 2), S.Y(y0 + o.Hc), `b = ${fmt(o.b)} m`, -14);
    b += svg.dim(S.X(o.b / 2 + tw), S.Y(y0 + tw), S.X(o.b / 2 + tw), S.Y(y0 + tw + o.y), `y = ${fmt(o.y)}`, 26);
    b += svg.dim(S.X(-o.K / 2), S.Y(-o.hz), S.X(o.K / 2), S.Y(-o.hz), `K = ${fmt(o.K)} m`, 14);
    b += svg.dim(S.X(o.K / 2), S.Y(0), S.X(o.K / 2), S.Y(o.Hcol), `g = ${fmt(o.Hcol)} m`, 22);
    b += svg.txt(S.X(0), S.Y(o.Hcol / 2), 'columna', 'sv-small', 'middle', -90);
    b += svg.txt(S.X(0), S.Y(-o.hz / 2) + 4, 'zapata', 'sv-small');
    return svg.frame(W, H, b, 'Sección transversal del acueducto');
  }
  function drawPlan(o) {
    const W = 640, H = 190;
    const Ltot = o.Le + o.L + o.Ls + 2;
    const S = svg.scaler2(-1, Ltot - 1, -Math.max(o.T1, o.T2) / 2 - 0.6, Math.max(o.T1, o.T2) / 2 + 0.6, W, H, 30);
    let b = '';
    const pts = [[-1, o.T1 / 2], [0, o.T1 / 2], [o.Le, o.b / 2], [o.Le + o.L, o.b / 2], [o.Le + o.L + o.Ls, o.T2 / 2], [Ltot - 1, o.T2 / 2]];
    const top = pts.map(([x, y]) => [S.X(x), S.Y(y)]);
    const bot = pts.slice().reverse().map(([x, y]) => [S.X(x), S.Y(-y)]);
    b += svg.poly(top.concat(bot), 'sv-water');
    b += svg.pline(top, 'sv-line') + svg.pline(bot, 'sv-line');
    b += svg.line(S.X(-1), S.Y(0), S.X(Ltot - 1), S.Y(0), 'sv-axis');
    b += svg.dim(S.X(0), S.Y(-o.T1 / 2 - 0.3), S.X(o.Le), S.Y(-o.T1 / 2 - 0.3), `Le = ${fmt(o.Le, 2)} m`, 0);
    b += svg.dim(S.X(o.Le), S.Y(o.T1 / 2 + 0.3), S.X(o.Le + o.L), S.Y(o.T1 / 2 + 0.3), `Puente L = ${fmt(o.L, 2)} m`, 0);
    b += svg.dim(S.X(o.Le + o.L), S.Y(-o.T2 / 2 - 0.3), S.X(o.Le + o.L + o.Ls), S.Y(-o.T2 / 2 - 0.3), `Ls = ${fmt(o.Ls, 2)} m`, 0);
    b += svg.txt(S.X(-0.5), S.Y(0) - 6, `T1=${fmt(o.T1)}`, 'sv-small');
    b += svg.txt(S.X(Ltot - 1.5), S.Y(0) - 6, `T2=${fmt(o.T2)}`, 'sv-small');
    b += svg.txt(S.X(o.Le + o.L / 2), S.Y(0) - 6, `b = ${fmt(o.b)} m`, 'sv-label');
    return svg.frame(W, H, b, 'Planta del acueducto');
  }

  HC.register({
    id: 'acueducto',
    title: 'Acueducto (puente canal)',
    short: 'Acueducto',
    icon: 'acueducto',
    group: 'obras',
    source: 'DISEÑO DE ACUEDUCTO.xlsx',
    description: 'Diseño hidráulico del conducto elevado y sus transiciones, pérdidas de carga, y diseño estructural de la viga, la columna y la zapata.',
    tags: ['Flujo crítico', 'Transiciones', 'Concreto armado'],
    inputs: [
      {
        title: 'Canal de llegada', fields: [
          { id: 'Y', label: 'Tirante en el canal', sym: 'Y', unit: 'm', value: 1.0, step: 0.05 },
          { id: 'bc', label: 'Ancho de solera del canal', sym: 'b_c', unit: 'm', value: 0.8, step: 0.05 },
          { id: 'Z', label: 'Talud del canal', sym: 'Z', value: 0.5, step: 0.25 },
          { id: 'Vc', label: 'Velocidad en el canal', sym: 'V_c', unit: 'm/s', value: 0.8, step: 0.05 },
          { id: 'T1', label: 'Espejo de agua a la entrada', sym: 'T_1', unit: 'm', value: 1.5, step: 0.05 },
          { id: 'T2', label: 'Espejo de agua a la salida', sym: 'T_2', unit: 'm', value: 1.8, step: 0.05 }
        ]
      },
      {
        title: 'Conducto elevado', fields: [
          { id: 'inc', label: 'Incremento sobre el ancho crítico', unit: '\\%', value: 10, step: 1 },
          { id: 'Lp', label: 'Longitud del puente canal', sym: 'L', unit: 'm', value: 20, step: 1 },
          { id: 'np', label: 'Rugosidad del conducto', sym: 'n', value: 0.014, step: 0.001 },
          { id: 'blc', label: 'Criterio de borde libre', type: 'select', value: 'base', options: [{ v: 'base', l: '20 % del ancho b (Excel)' }, { v: 'tercio', l: 'y/3' }] },
          { id: 'ang', label: 'Ángulo de transición', sym: '\\alpha', unit: '°', value: 22.5, step: 0.5, help: 'El Excel usa 22.5°; la USBR recomienda 12.5° para transiciones rectas.' },
          { id: 'tipo', label: 'Tipo de transición', type: 'select', value: 'recta', options: Object.entries(TRANS).map(([k, t]) => ({ v: k, l: `${t.l} (Ke=${t.ke}, Ks=${t.ks})` })) }
        ]
      },
      {
        title: 'Viga de apoyo', collapsed: true, fields: [
          { id: 'Ru', label: 'Reacción última de cada apoyo', sym: 'R_u', unit: 'kg', value: 12367, step: 100 },
          { id: 'bcaja', label: 'Ancho de la caja', sym: 'b', unit: 'm', value: 1.25, step: 0.05 },
          { id: 'a', label: 'Ancho de la columna', sym: 'a', unit: 'm', value: 0.4, step: 0.05 },
          { id: 'dl', label: 'Espesor de vigas laterales', sym: 'd', unit: 'm', value: 0.25, step: 0.05 },
          { id: 'hv', label: 'Peralte de la viga', sym: 'h', unit: 'cm', value: 50, step: 5 },
          { id: 'rec', label: 'Recubrimiento', sym: 'r', unit: 'cm', value: 4, step: 0.5 },
          { id: 'barL', label: 'Varilla longitudinal', type: 'select', value: '5/8', options: BAR_OPTS },
          { id: 'barE', label: 'Varilla de estribos', type: 'select', value: '1/4', options: BAR_OPTS },
          { id: 'fc', label: 'Resistencia del concreto', sym: "f'_c", unit: 'kg/cm^2', value: 210, step: 10 },
          { id: 'fy', label: 'Fluencia del acero', sym: 'f_y', unit: 'kg/cm^2', value: 4200, step: 100 },
          { id: 'tc', label: 'Esfuerzo cortante admisible', sym: '\\tau_c', unit: 'kg/cm^2', value: 6.16, step: 0.1, help: 'Valor del Excel. Referencia: φ·0.53√f\'c = 6.53 kg/cm² para f\'c = 210.' }
        ]
      },
      {
        title: 'Columna', collapsed: true, fields: [
          { id: 'c', label: 'Espesor de la columna', sym: 'c', unit: 'm', value: 0.4, step: 0.05 },
          { id: 'g', label: 'Altura de la columna', sym: 'g', unit: 'm', value: 3.25, step: 0.25 },
          { id: 'Lvl', label: 'Longitud de viga lateral sobre la columna', sym: 'L_v', unit: 'm', value: 2.14, step: 0.05 },
          { id: 'gc', label: 'Peso específico del concreto', sym: '\\gamma_c', unit: 'kg/m^3', value: 2400, step: 50 },
          { id: 'K', label: 'Factor de longitud efectiva', sym: 'k', value: 2, step: 0.1, help: 'Columna en voladizo (empotrada en la base, libre arriba): k = 2.' }
        ]
      },
      {
        title: 'Zapata', collapsed: true, fields: [
          { id: 'Kz', label: 'Lado de la zapata cuadrada', sym: 'K', unit: 'm', value: 2.8, step: 0.1 },
          { id: 'hz', label: 'Espesor de la zapata', sym: 'h_z', unit: 'm', value: 0.4, step: 0.05 },
          { id: 'R', label: 'Reacción de servicio de viga lateral', sym: 'R', unit: 'kg', value: 7413, step: 100 },
          { id: 'sc', label: 'Capacidad portante del terreno', sym: '\\sigma_c', unit: 'kg/cm^2', value: 1.5, step: 0.1 },
          { id: 'agua', label: 'Condición del dren (caso II)', type: 'select', value: 'bajo', options: [{ v: 'bajo', l: 'Bajo agua (subpresión)' }, { v: 'sin', l: 'Sin agua' }] },
          { id: 'recz', label: 'Recubrimiento de zapata', sym: 'r_z', unit: 'cm', value: 7.5, step: 0.5 },
          { id: 'barZ', label: 'Varilla de la zapata', type: 'select', value: '1/2', options: BAR_OPTS }
        ]
      }
    ],
    presets: [{ name: 'Ejemplo del Excel (Q ≈ 1.04 m³/s)', values: {} }],
    compute(v) {
      const d = new Doc();
      const checks = [];
      const tr = TRANS[v.tipo];

      /* ---------- hidráulica ---------- */
      d.h('Caudal y energía en el canal de llegada');
      const Q = (v.bc + v.Z * v.Y) * v.Y * v.Vc;
      d.calc({ sym: 'Q', f: '(b_c+Z\\,Y)\\,Y\\,V_c', sub: `(${n(v.bc)}+${n(v.Z)}(${n(v.Y)}))(${n(v.Y)})(${n(v.Vc)})`, val: Q, unit: 'm^3/s', d: 4 });
      const Emm = v.Y + v.Vc * v.Vc / (2 * G);
      d.calc({ sym: 'E_{mm}', f: 'Y+\\dfrac{V_c^2}{2g}', sub: `${n(v.Y)}+\\dfrac{${n(v.Vc)}^2}{2(9.81)}`, val: Emm, unit: 'm', d: 4 });

      d.h('Ancho del conducto elevado');
      d.p('Por economía el ancho debe ser mínimo sin cambiar el régimen. En una sección rectangular crítica se cumple $y_c=\\tfrac23E$ y $q^2=g\\,y_c^3$, de donde:');
      d.eq('b_c=\\sqrt{\\dfrac{27\\,Q^2}{8\\,g\\,E_{mm}^3}}');
      const bcrit = Math.sqrt(27 * Q * Q / (8 * G * Emm ** 3));
      d.calc({ sym: 'b_{crit}', f: '\\sqrt{\\dfrac{27\\,Q^2}{8\\,g\\,E_{mm}^3}}', sub: `\\sqrt{\\dfrac{27(${n(Q, 4)})^2}{8(9.81)(${n(Emm, 4)})^3}}`, val: bcrit, unit: 'm', d: 4 });
      const bcal = bcrit * (1 + v.inc / 100);
      d.calc({ sym: 'b', f: `(1+${fmt(v.inc / 100, 2)})\\,b_{crit}`, sub: `${fmt(1 + v.inc / 100, 2)}(${n(bcrit, 4)})`, val: bcal, unit: 'm', d: 4, note: 'Se aumenta el ancho para garantizar flujo subcrítico.' });
      const b = ceilTo(bcal, 0.05);
      d.p(`Se adopta $b=${fmt(b, 2)}$ m (múltiplo de 5 cm).`);

      d.h('Tirante y velocidad en el conducto');
      const yc = Math.cbrt(Q * Q / (G * b * b));
      d.calc({ sym: 'y_c', f: '\\sqrt[3]{\\dfrac{Q^2}{g\\,b^2}}', sub: `\\sqrt[3]{\\dfrac{${n(Q, 4)}^2}{9.81(${n(b)})^2}}`, val: yc, unit: 'm', d: 4 });
      d.p('Despreciando la pérdida en la transición, la energía se conserva y el tirante subcrítico es la raíz mayor de:');
      d.eq('y+\\dfrac{Q^2}{2g\\,b^2\\,y^2}=E_{mm}');
      const fE = (y) => y + Q * Q / (2 * G * b * b * y * y) - Emm;
      const Ecb = 1.5 * yc;
      let y;
      if (Ecb > Emm) {
        d.note('La energía disponible es menor que la mínima del conducto: el flujo se ahoga. Aumente el incremento de ancho.', 'warn');
        y = yc;
      } else y = bisect(fE, yc, Emm + 0.001);
      d.calc({ sym: 'y', val: y, unit: 'm', d: 4, note: 'Resuelto por bisección entre $y_c$ y $E_{mm}$.' });
      const V = Q / (b * y);
      d.calc({ sym: 'V', f: '\\dfrac{Q}{b\\,y}', sub: `\\dfrac{${n(Q, 4)}}{${n(b)}(${n(y, 4)})}`, val: V, unit: 'm/s', d: 4 });
      const F = V / Math.sqrt(G * y);
      d.calc({ sym: 'F', f: '\\dfrac{V}{\\sqrt{g\\,y}}', sub: `\\dfrac{${n(V, 4)}}{\\sqrt{9.81(${n(y, 4)})}}`, val: F, d: 4 });
      const okF = F < 1;
      d.check(`Flujo subcrítico en el conducto: $F=${fmt(F)}<1$`, okF);
      checks.push({ label: 'Flujo subcrítico en el conducto ($F<1$)', ok: okF, detail: `F = ${fmt(F)}` });
      const BL = v.blc === 'base' ? b / 5 : y / 3;
      d.calc({ sym: 'BL', f: v.blc === 'base' ? '0.20\\,b' : 'y/3', sub: v.blc === 'base' ? `0.20(${n(b)})` : `${n(y, 4)}/3`, val: BL, unit: 'm', d: 3 });
      const Hc = ceilTo(y + BL, 0.05);
      d.calc({ sym: 'H', f: 'y+BL', sub: `${n(y, 4)}+${n(BL, 3)}`, val: y + BL, unit: 'm', d: 3, note: `Altura interior adoptada H = ${fmt(Hc, 2)} m.` });

      d.h('Longitud de las transiciones');
      const ta = Math.tan(rad(v.ang));
      const Le = (v.T1 - b) / (2 * ta);
      const Ls = Math.abs(v.T2 - b) / (2 * ta);
      d.calc({ sym: 'L_e', f: '\\dfrac{T_1-b}{2\\tan\\alpha}', sub: `\\dfrac{${n(v.T1)}-${n(b)}}{2\\tan ${fmt(v.ang)}^\\circ}`, val: Le, unit: 'm', d: 3 });
      d.calc({ sym: 'L_s', f: '\\dfrac{|T_2-b|}{2\\tan\\alpha}', sub: `\\dfrac{|${n(v.T2)}-${n(b)}|}{2\\tan ${fmt(v.ang)}^\\circ}`, val: Ls, unit: 'm', d: 3 });

      d.h('Pérdidas de carga');
      d.p(`Transición «${tr.l}»: $K_e=${tr.ke}$, $K_s=${tr.ks}$. Las pérdidas en transiciones se deben al cambio de velocidad:`);
      d.eq('h_{e}=K_e\\left|\\dfrac{V^2}{2g}-\\dfrac{V_c^2}{2g}\\right|,\\qquad h_{s}=K_s\\left|\\dfrac{V^2}{2g}-\\dfrac{V_c^2}{2g}\\right|');
      const dhv = Math.abs(V * V - v.Vc * v.Vc) / (2 * G);
      d.calc({ sym: '\\Delta h_v', f: '\\left|\\dfrac{V^2-V_c^2}{2g}\\right|', sub: `\\left|\\dfrac{${n(V, 4)}^2-${n(v.Vc)}^2}{19.62}\\right|`, val: dhv, unit: 'm', d: 4 });
      const he = tr.ke * dhv, hs = tr.ks * dhv;
      d.calc({ sym: 'h_e', f: 'K_e\\,\\Delta h_v', sub: `${tr.ke}(${n(dhv, 4)})`, val: he, unit: 'm', d: 4 });
      d.calc({ sym: 'h_s', f: 'K_s\\,\\Delta h_v', sub: `${tr.ks}(${n(dhv, 4)})`, val: hs, unit: 'm', d: 4 });
      const R = b * y / (b + 2 * y);
      const Sf = Math.pow(V * v.np / Math.pow(R, 2 / 3), 2);
      d.calc({ sym: 'S_f', f: '\\left(\\dfrac{V\\,n}{R^{2/3}}\\right)^2', sub: `\\left(\\dfrac{${n(V, 4)}(${n(v.np, 4)})}{${n(R, 4)}^{2/3}}\\right)^2`, val: Sf, unit: 'm/m', d: 5 });
      const hf = Sf * v.Lp;
      d.calc({ sym: 'h_f', f: 'S_f\\,L', sub: `${n(Sf, 5)}(${n(v.Lp)})`, val: hf, unit: 'm', d: 4 });
      const ht = he + hf + hs;
      d.calc({ sym: 'h_T', f: 'h_e+h_f+h_s', sub: `${n(he, 4)}+${n(hf, 4)}+${n(hs, 4)}`, val: ht, unit: 'm', d: 4 });
      d.p('El fondo del puente canal debe tener una pendiente mínima igual a $S_f$ y la rasante del canal de salida debe bajar al menos $h_T$ respecto a la de entrada.');

      /* ---------- viga ---------- */
      d.h('Diseño de la viga de apoyo');
      const bL = bar(v.barL), bE = bar(v.barE);
      const Mu = (v.bcaja - v.a + v.dl) * v.Ru;
      d.calc({ sym: 'M_u', f: '2R_u\\cdot\\dfrac{b-a+d}{2}', sub: `2(${n(v.Ru, 0)})\\cdot\\dfrac{${n(v.bcaja)}-${n(v.a)}+${n(v.dl)}}{2}`, val: Mu, unit: 'kg\\cdot m', d: 1 });
      const dv = v.hv - v.rec - bL.d / 2;
      d.calc({ sym: 'd', f: 'h-r-\\dfrac{d_b}{2}', sub: `${n(v.hv)}-${n(v.rec)}-\\dfrac{${n(bL.d)}}{2}`, val: dv, unit: 'cm', d: 3 });
      const bw = v.a * 100;
      const fl = asFlexion(Mu * 100, bw, dv, v.fc, v.fy);
      d.p('Acero por flexión con el método iterativo ($a=A_s f_y/0.85f\'_c b$, $A_s=M_u/\\phi f_y(d-a/2)$, $\\phi=0.9$):');
      d.table(['Iteración', '$a$ (cm)', '$A_s$ (cm²)'], fl.it.slice(0, 6).map((r) => [String(r.i), fmt(r.a, 4), fmt(r.As, 4)]));
      const Asmin = 0.8 * Math.sqrt(v.fc) / v.fy * bw * dv;
      const Asv = Math.max(fl.As, Asmin);
      d.calc({ sym: 'A_{s,min}', f: "\\dfrac{0.8\\sqrt{f'_c}}{f_y}\\,b_w\\,d", sub: `\\dfrac{0.8\\sqrt{${n(v.fc)}}}{${n(v.fy)}}(${n(bw)})(${n(dv)})`, val: Asmin, unit: 'cm^2', d: 3 });
      const nbL = Math.ceil(Asv / bL.A - 1e-9);
      d.calc({ sym: 'A_s', val: Asv, unit: 'cm^2', d: 3, note: `Se colocan ${nbL} varillas de Ø${bL.id}" (${fmt(nbL * bL.A, 2)} cm²).` });
      d.h2('Refuerzo transversal (estribos)');
      const Vu = 2 * v.Ru;
      d.calc({ sym: 'V_u', f: '2R_u', sub: `2(${n(v.Ru, 0)})`, val: Vu, unit: 'kg', d: 0 });
      const tu = Vu / (bw * dv);
      d.calc({ sym: '\\tau_u', f: '\\dfrac{V_u}{a\\,d}', sub: `\\dfrac{${n(Vu, 0)}}{${n(bw)}(${n(dv)})}`, val: tu, unit: 'kg/cm^2', d: 3 });
      const Sd = v.bcaja / 2 + v.dl / 2 - v.a / 2;
      d.calc({ sym: 'S', f: '\\dfrac{b}{2}+\\dfrac{d}{2}-\\dfrac{a}{2}', sub: `\\dfrac{${n(v.bcaja)}}{2}+\\dfrac{${n(v.dl)}}{2}-\\dfrac{${n(v.a)}}{2}`, val: Sd, unit: 'm', d: 3, note: 'Distancia de la reacción a la cara de la columna.' });
      let sE = null;
      if (tu > v.tc) {
        const Av = (tu - v.tc) * bw * Sd * 100 / v.fy;
        d.calc({ sym: 'A_v', f: '\\dfrac{(\\tau_u-\\tau_c)\\,a\\,S}{f_y}', sub: `\\dfrac{(${n(tu)}-${n(v.tc)})(${n(bw)})(${n(Sd * 100)})}{${n(v.fy)}}`, val: Av, unit: 'cm^2', d: 3 });
        const ne = Av / (2 * bE.A);
        d.calc({ sym: 'n_e', f: '\\dfrac{A_v}{2A_b}', sub: `\\dfrac{${n(Av)}}{2(${n(bE.A)})}`, val: ne, unit: 'estribos', d: 2 });
        const e = Sd * 100 / ne;
        sE = Math.max(HC.floorTo(e, 5), 5);
        d.calc({ sym: 's', f: '\\dfrac{S}{n_e}', sub: `\\dfrac{${n(Sd * 100)}}{${n(ne, 2)}}`, val: e, unit: 'cm', d: 2, note: `Estribos Ø${bE.id}" @ ${fmt(sE)} cm en toda la viga.` });
      } else {
        sE = Math.min(HC.floorTo(dv / 2, 5), 30);
        d.p(`$\\tau_u\\leq\\tau_c$: basta el refuerzo mínimo, estribos Ø${bE.id}" @ ${fmt(sE)} cm ($s\\leq d/2$).`);
      }

      /* ---------- columna ---------- */
      d.h('Diseño de la columna');
      const Rtot = 4 * v.Ru;
      d.calc({ sym: 'R_{tot}', f: '4R_u', sub: `4(${n(v.Ru, 0)})`, val: Rtot, unit: 'kg', d: 0 });
      const G3 = v.Lvl * (v.hv / 100) * v.a * v.gc;
      d.calc({ sym: 'G_3', f: 'L_v\\,h\\,a\\,\\gamma_c', sub: `${n(v.Lvl)}(${n(v.hv / 100)})(${n(v.a)})(${n(v.gc, 0)})`, val: G3, unit: 'kg', d: 1, note: 'Peso propio de la viga superior.' });
      const G4 = v.c * v.a * v.g * v.gc;
      d.calc({ sym: 'G_4', f: 'c\\,a\\,g\\,\\gamma_c', sub: `${n(v.c)}(${n(v.a)})(${n(v.g)})(${n(v.gc, 0)})`, val: G4, unit: 'kg', d: 1, note: 'Peso propio de la columna.' });
      const Pu = Rtot + 1.5 * (G3 + G4);
      d.calc({ sym: 'P_u', f: 'R_{tot}+1.5(G_3+G_4)', sub: `${n(Rtot, 0)}+1.5(${n(G3, 1)}+${n(G4, 1)})`, val: Pu, unit: 'kg', d: 1 });
      const ecc = 0.1 * v.a * 100;
      const Muc = Pu * ecc;
      d.calc({ sym: 'M_u', f: 'P_u\\,(0.10\\,a)', sub: `${n(Pu, 1)}(${n(ecc)})`, val: Muc, unit: 'kg\\cdot cm', d: 0, note: 'Excentricidad mínima e = 0.10 a.' });
      const Ic = v.c * 100 * Math.pow(v.a * 100, 3) / 12;
      const Ag = v.a * v.c * 1e4;
      const rg = Math.sqrt(Ic / Ag);
      d.calc({ sym: 'I', f: '\\dfrac{c\\,a^3}{12}', sub: `\\dfrac{${n(v.c * 100)}(${n(v.a * 100)})^3}{12}`, val: Ic, unit: 'cm^4', d: 0 });
      d.calc({ sym: 'r', f: '\\sqrt{I/A_g}', sub: `\\sqrt{${n(Ic, 0)}/${n(Ag, 0)}}`, val: rg, unit: 'cm', d: 3 });
      const kl = v.K * v.g * 100 / rg;
      d.calc({ sym: '\\dfrac{kL}{r}', sub: `\\dfrac{${n(v.K)}(${n(v.g * 100)})}{${n(rg)}}`, val: kl, d: 2 });
      let Mc = Muc, delta = 1, Pcr = NaN;
      if (kl > 22) {
        d.p('Como $kL/r>22$ se consideran los efectos de esbeltez (magnificación de momentos):');
        const Ec = 4270 * Math.pow(v.gc / 1000, 1.5) * Math.sqrt(v.fc);
        d.calc({ sym: 'E_c', f: "4270\\,w^{1.5}\\sqrt{f'_c}", sub: `4270(${n(v.gc / 1000)})^{1.5}\\sqrt{${n(v.fc)}}`, val: Ec, unit: 'kg/cm^2', d: 0 });
        const EI = Ec * Ic / 2.5;
        d.calc({ sym: 'EI', f: '\\dfrac{E_c\\,I}{2.5}', sub: `\\dfrac{${n(Ec, 0)}(${n(Ic, 0)})}{2.5}`, val: EI, unit: 'kg\\cdot cm^2', d: 0 });
        Pcr = Math.PI * Math.PI * EI / Math.pow(v.K * v.g * 100, 2);
        d.calc({ sym: 'P_{cr}', f: '\\dfrac{\\pi^2 EI}{(kL)^2}', sub: `\\dfrac{\\pi^2(${n(EI, 0)})}{(${n(v.K * v.g * 100)})^2}`, val: Pcr, unit: 'kg', d: 0 });
        delta = 1 / (1 - Pu / (0.75 * Pcr));
        if (!(delta > 0)) throw new Error('La columna es inestable (Pu ≥ 0.75 Pcr). Aumente la sección.');
        d.calc({ sym: '\\delta', f: '\\dfrac{C_m}{1-\\dfrac{P_u}{0.75\\,P_{cr}}}', sub: `\\dfrac{1}{1-\\dfrac{${n(Pu, 0)}}{0.75(${n(Pcr, 0)})}}`, val: delta, d: 3 });
        Mc = delta * Muc;
        d.calc({ sym: 'M_c', f: '\\delta\\,M_u', sub: `${n(delta)}(${n(Muc, 0)})`, val: Mc, unit: 'kg\\cdot cm', d: 0 });
      } else d.p('$kL/r\\leq22$: se desprecian los efectos de esbeltez.');
      const Asc = 0.01 * Ag;
      d.calc({ sym: 'A_{s,min}', f: '0.01\\,A_g', sub: `0.01(${n(Ag, 0)})`, val: Asc, unit: 'cm^2', d: 2 });
      const phiPn = 0.8 * 0.7 * (0.85 * v.fc * (Ag - Asc) + v.fy * Asc);
      d.calc({ sym: '\\phi P_{n,max}', f: "0.80\\,\\phi\\left[0.85f'_c(A_g-A_s)+f_yA_s\\right]", sub: `0.80(0.70)\\left[0.85(${n(v.fc)})(${n(Ag - Asc, 0)})+${n(v.fy)}(${n(Asc)})\\right]`, val: phiPn, unit: 'kg', d: 0 });
      const okCol = Pu <= phiPn;
      d.check(`Resistencia axial: $P_u=${fmt(Pu, 0)}\\leq\\phi P_{n,max}=${fmt(phiPn, 0)}$ kg`, okCol);
      checks.push({ label: 'Resistencia axial de la columna', ok: okCol, detail: `Pu/φPn = ${fmt(Pu / phiPn)}` });

      /* ---------- zapata ---------- */
      d.h('Diseño de la zapata');
      const K = v.Kz * 100, hz = v.hz * 100;
      const G5 = v.Kz * v.Kz * v.hz * v.gc;
      const G5w = G5 * (v.gc - 1000) / v.gc;
      d.calc({ sym: 'G_5', f: 'K^2\\,h_z\\,\\gamma_c', sub: `${n(v.Kz)}^2(${n(v.hz)})(${n(v.gc, 0)})`, val: G5, unit: 'kg', d: 1, note: 'Sin agua.' });
      d.calc({ sym: "G_5'", f: 'G_5\\,\\dfrac{\\gamma_c-\\gamma_w}{\\gamma_c}', sub: `${n(G5, 1)}\\dfrac{${n(v.gc, 0)}-1000}{${n(v.gc, 0)}}`, val: G5w, unit: 'kg', d: 1, note: 'Bajo agua (peso sumergido).' });
      d.h2('Caso I: dren con agua, carga simétrica');
      const st = (4 * v.R + G3 + G4 + G5w) / (K * K);
      d.calc({ sym: '\\sigma_t', f: "\\dfrac{4R+G_3+G_4+G_5'}{K^2}", sub: `\\dfrac{4(${n(v.R, 0)})+${n(G3, 1)}+${n(G4, 1)}+${n(G5w, 1)}}{${n(K)}^2}`, val: st, unit: 'kg/cm^2', d: 4 });
      const FS1 = v.sc / st;
      const ok1 = FS1 >= 3;
      d.check(`Factor de seguridad $\\sigma_c/\\sigma_t=${fmt(FS1)}\\geq 3$`, ok1);
      checks.push({ label: 'Presión en el terreno, caso I ($\\sigma_c/\\sigma_t\\geq3$)', ok: ok1, detail: `FS = ${fmt(FS1)}` });
      d.h2('Caso II: carga excéntrica');
      const M = 2 * v.R * 0.25 * v.c * 100;
      const G5c = v.agua === 'bajo' ? G5w : G5;
      const Rv = 2 * v.R + G3 + G4 + G5c;
      d.calc({ sym: 'M', f: '2R\\,(0.25\\,c)', sub: `2(${n(v.R, 0)})(0.25)(${n(v.c * 100)})`, val: M, unit: 'kg\\cdot cm', d: 0 });
      d.calc({ sym: 'R_v', f: '2R+G_3+G_4+G_5', sub: `2(${n(v.R, 0)})+${n(G3, 1)}+${n(G4, 1)}+${n(G5c, 1)}`, val: Rv, unit: 'kg', d: 1 });
      const ez = M / Rv;
      d.calc({ sym: 'e', f: 'M/R_v', sub: `${n(M, 0)}/${n(Rv, 1)}`, val: ez, unit: 'cm', d: 3 });
      const okE = ez <= K / 6;
      d.check(`Resultante en el núcleo central: $e=${fmt(ez)}\\leq K/6=${fmt(K / 6)}$ cm`, okE);
      const Wm = K * K * K / 6;
      const s1 = Rv / (K * K) + M / Wm, s2 = Rv / (K * K) - M / Wm;
      d.calc({ sym: 'W', f: 'K^3/6', sub: `${n(K)}^3/6`, val: Wm, unit: 'cm^3', d: 0 });
      d.calc({ sym: '\\sigma_{1}', f: '\\dfrac{R_v}{K^2}+\\dfrac{M}{W}', sub: `\\dfrac{${n(Rv, 1)}}{${n(K)}^2}+\\dfrac{${n(M, 0)}}{${n(Wm, 0)}}`, val: s1, unit: 'kg/cm^2', d: 4 });
      d.calc({ sym: '\\sigma_{2}', f: '\\dfrac{R_v}{K^2}-\\dfrac{M}{W}', sub: `\\dfrac{${n(Rv, 1)}}{${n(K)}^2}-\\dfrac{${n(M, 0)}}{${n(Wm, 0)}}`, val: s2, unit: 'kg/cm^2', d: 4 });
      const FS2 = v.sc / s1;
      const ok2 = FS2 >= 3 && okE;
      d.check(`Factor de seguridad $\\sigma_c/\\sigma_1=${fmt(FS2)}\\geq3$`, FS2 >= 3);
      checks.push({ label: 'Presión en el terreno, caso II ($\\sigma_c/\\sigma_1\\geq3$, $e\\leq K/6$)', ok: ok2, detail: `FS = ${fmt(FS2)}` });

      d.h2('Esfuerzos últimos');
      const Vuz = 4 * v.Ru + 1.5 * (G3 + G4);
      d.calc({ sym: 'V_u', f: '4R_u+1.5(G_3+G_4)', sub: `4(${n(v.Ru, 0)})+1.5(${n(G3, 1)}+${n(G4, 1)})`, val: Vuz, unit: 'kg', d: 1 });
      const su = Vuz / (K * K);
      d.calc({ sym: '\\sigma_u', f: 'V_u/K^2', sub: `${n(Vuz, 1)}/${n(K)}^2`, val: su, unit: 'kg/cm^2', d: 4 });
      const bZ = bar(v.barZ);
      const dz = hz - v.recz - 1.5 * bZ.d;
      d.calc({ sym: 'd_z', f: 'h_z-r_z-1.5\\,d_b', sub: `${n(hz)}-${n(v.recz)}-1.5(${n(bZ.d)})`, val: dz, unit: 'cm', d: 3 });
      const ac = v.a * 100;
      const vcp = 0.85 * 1.06 * Math.sqrt(v.fc), vcb = 0.85 * 0.53 * Math.sqrt(v.fc);
      d.h2('Punzonamiento (sección crítica a d/2 de la columna)');
      const Ab = Math.pow(ac + dz, 2);
      const Vu1 = su * (K * K - Ab);
      const tu1 = Vu1 / (4 * (ac + dz) * dz);
      d.calc({ sym: 'V_{u1}', f: '\\sigma_u\\left[K^2-(a+d_z)^2\\right]', sub: `${n(su, 4)}\\left[${n(K)}^2-(${n(ac)}+${n(dz)})^2\\right]`, val: Vu1, unit: 'kg', d: 0 });
      d.calc({ sym: '\\tau_{u1}', f: '\\dfrac{V_{u1}}{4(a+d_z)\\,d_z}', sub: `\\dfrac{${n(Vu1, 0)}}{4(${n(ac)}+${n(dz)})(${n(dz)})}`, val: tu1, unit: 'kg/cm^2', d: 3 });
      d.calc({ sym: '\\phi v_c', f: "0.85(1.06)\\sqrt{f'_c}", sub: `0.85(1.06)\\sqrt{${n(v.fc)}}`, val: vcp, unit: 'kg/cm^2', d: 3 });
      const okP = tu1 <= vcp;
      d.check(`Punzonamiento: $\\tau_{u1}=${fmt(tu1)}\\leq${fmt(vcp)}$ kg/cm²`, okP);
      checks.push({ label: 'Punzonamiento en la zapata', ok: okP, detail: `τu = ${fmt(tu1)} kg/cm²` });
      d.h2('Cortante como viga (a d de la cara)');
      const x2 = (K - ac) / 2 - dz;
      const Vu2 = su * K * Math.max(x2, 0);
      const tu2 = Vu2 / (K * dz);
      d.calc({ sym: 'V_{u2}', f: '\\sigma_u\\,K\\left(\\dfrac{K-a}{2}-d_z\\right)', sub: `${n(su, 4)}(${n(K)})\\left(\\dfrac{${n(K)}-${n(ac)}}{2}-${n(dz)}\\right)`, val: Vu2, unit: 'kg', d: 0 });
      d.calc({ sym: '\\tau_{u2}', f: '\\dfrac{V_{u2}}{K\\,d_z}', sub: `\\dfrac{${n(Vu2, 0)}}{${n(K)}(${n(dz)})}`, val: tu2, unit: 'kg/cm^2', d: 3 });
      const okB = tu2 <= vcb;
      d.check(`Cortante por flexión: $\\tau_{u2}=${fmt(tu2)}\\leq\\phi\\,0.53\\sqrt{f'_c}=${fmt(vcb)}$ kg/cm²`, okB);
      checks.push({ label: 'Cortante como viga en la zapata', ok: okB, detail: `τu = ${fmt(tu2)} kg/cm²` });
      d.h2('Acero de refuerzo de la zapata');
      const Muz = su * K * Math.pow((K - ac) / 2, 2) / 2;
      d.calc({ sym: 'M_u', f: '\\dfrac{\\sigma_u\\,K}{2}\\left(\\dfrac{K-a}{2}\\right)^2', sub: `\\dfrac{${n(su, 4)}(${n(K)})}{2}\\left(\\dfrac{${n(K)}-${n(ac)}}{2}\\right)^2`, val: Muz, unit: 'kg\\cdot cm', d: 0 });
      const flz = asFlexion(Muz, K, dz, v.fc, v.fy);
      d.calc({ sym: 'A_s', f: '\\dfrac{M_u}{\\phi f_y(d_z-a/2)}', sub: `\\dfrac{${n(Muz, 0)}}{0.9(${n(v.fy)})(${n(dz)}-${n(flz.a, 3)}/2)}`, val: flz.As, unit: 'cm^2', d: 3 });
      const Aszmin = 0.0018 * K * hz;
      d.calc({ sym: 'A_{s,min}', f: '0.0018\\,K\\,h_z', sub: `0.0018(${n(K)})(${n(hz)})`, val: Aszmin, unit: 'cm^2', d: 3 });
      const Asz = Math.max(flz.As, Aszmin);
      const nbz = Math.ceil(Asz / bZ.A - 1e-9);
      const sz = (K - 2 * v.recz) / (nbz - 1);
      d.calc({ sym: 'n', f: 'A_s/A_b', sub: `${n(Asz)}/${n(bZ.A)}`, val: Asz / bZ.A, d: 2, note: `Se colocan ${nbz} varillas Ø${bZ.id}" en cada dirección, @ ${fmt(HC.floorTo(sz, 2.5), 1)} cm.` });

      const results = [
        { label: 'Caudal', sym: 'Q', value: Q, unit: 'm^3/s', d: 4, hl: true },
        { label: 'Ancho del conducto', sym: 'b', value: b, unit: 'm', d: 2, hl: true },
        { label: 'Tirante en el conducto', sym: 'y', value: y, unit: 'm', d: 3 },
        { label: 'Velocidad en el conducto', sym: 'V', value: V, unit: 'm/s' },
        { label: 'Froude', sym: 'F', value: F },
        { label: 'Altura interior de la caja', sym: 'H', value: Hc, unit: 'm', d: 2 },
        { label: 'Transición de entrada', sym: 'L_e', value: Le, unit: 'm', d: 2 },
        { label: 'Transición de salida', sym: 'L_s', value: Ls, unit: 'm', d: 2 },
        { label: 'Pérdida total', sym: 'h_T', value: ht, unit: 'm', d: 4, hl: true },
        { label: 'Acero de la viga', value: `${nbL} Ø${bL.id}"` },
        { label: 'Estribos', value: `Ø${bE.id}" @ ${fmt(sE)} cm` },
        { label: 'Acero de la zapata', value: `${nbz} Ø${bZ.id}" c/dir.` }
      ];
      // perfil hidráulico
      const Ein = Emm, E1 = Emm - he, E2 = E1 - hf, E3 = E2 - hs;
      const X = [0, 3, 3 + Le, 3 + Le + v.Lp, 3 + Le + v.Lp + Ls, 6 + Le + v.Lp + Ls];
      const zb = [0, 0, 0, -hf, -hf, -hf];
      const ws = [v.Y, v.Y, y, y, v.Y, v.Y].map((yy, i) => zb[i] + yy);
      const charts = [
        { id: 'plan', type: 'svg', title: 'Planta: transiciones y conducto elevado', svg: drawPlan({ T1: v.T1, T2: v.T2, b, Le, Ls, L: v.Lp }), wide: true },
        { id: 'secc', type: 'svg', title: 'Sección transversal (caja, viga, columna y zapata)', svg: drawSection({ b, y, Hc, hv: v.hv, a: v.a, Hcol: v.g, K: v.Kz, hz: v.hz }) },
        { id: 'perf', type: 'xy', title: 'Perfil hidráulico aproximado', xLabel: 'Distancia (m)', yLabel: 'Cota relativa (m)', datasets: [
          { label: 'Línea de energía', data: X.map((x, i) => ({ x, y: [Ein, Ein, E1, E2, E3, E3][i] })), color: '#dc2626', dash: true },
          { label: 'Superficie de agua', data: X.map((x, i) => ({ x, y: ws[i] })), color: '#2563eb' },
          { label: 'Fondo', data: X.map((x, i) => ({ x, y: zb[i] })), color: '#475569' }] },
        { id: 'pz', type: 'bar', title: 'Presiones bajo la zapata (kg/cm²)', labels: ['σt (caso I)', 'σ1 (caso II)', 'σ2 (caso II)', 'σc admisible/3'], yLabel: 'kg/cm²', datasets: [{ label: 'Presión', data: [st, s1, s2, v.sc / 3], color: '#d97706' }] }
      ];
      return { doc: d, results, checks, charts };
    },
    theory: [
      {
        title: 'Puente canal', body: [
          'Estructura que conduce el agua de un canal por encima de una depresión (quebrada, río, camino o dren). Está formada por una transición de entrada, el conducto elevado y una transición de salida. Se diseña para flujo subcrítico cercano al crítico, con el ancho mínimo que mantenga el régimen.',
          { eq: 'E_{mm}=Y+\\dfrac{V_c^2}{2g}', name: 'Energía en el canal de llegada' },
          { eq: 'y_c=\\tfrac{2}{3}E,\\qquad q^2=g\\,y_c^3\\;\\Rightarrow\\; b=\\sqrt{\\dfrac{27\\,Q^2}{8\\,g\\,E_{mm}^3}}', name: 'Ancho para flujo crítico' },
          { eq: 'y+\\dfrac{Q^2}{2g\\,b^2y^2}=E_{mm}', name: 'Tirante subcrítico en el conducto' }
        ]
      },
      {
        title: 'Transiciones y pérdidas', body: [
          { eq: 'L=\\dfrac{T_1-b}{2\\tan\\alpha}', name: 'Longitud de transición recta' },
          { eq: 'h_{1-2}=K\\,\\Delta h_v=K\\left|\\dfrac{V_1^2}{2g}-\\dfrac{V_2^2}{2g}\\right|', name: 'Pérdida en la transición' },
          { table: { head: ['Tipo de transición', '$K_e$', '$K_s$'], rows: [['Curvado', '0.10', '0.20'], ['Cuadrante cilíndrico', '0.15', '0.25'], ['Simplificado en línea recta', '0.20', '0.30'], ['Línea recta', '0.30', '0.50'], ['Extremos cuadrados', '0.30', '0.75']] } },
          { eq: 'h_f=L\\left(\\dfrac{V\\,n}{R^{2/3}}\\right)^2', name: 'Pérdida por fricción en el conducto' }
        ]
      },
      {
        title: 'Diseño estructural', body: [
          'Las cuatro reacciones de las vigas laterales se trasladan a la columna. La columna se verifica a compresión con una excentricidad mínima de $0.10a$ y, si es esbelta, se magnifican los momentos.',
          { eq: 'P_u=4R_u+1.5(G_3+G_4),\\qquad M_u=P_u(0.10a)', name: 'Cargas en la columna' },
          { eq: '\\dfrac{kL}{r}>22\\;\\Rightarrow\\;P_{cr}=\\dfrac{\\pi^2EI}{(kL)^2},\\quad\\delta=\\dfrac{C_m}{1-P_u/0.75P_{cr}}', name: 'Efectos de esbeltez' },
          { eq: '\\sigma_{1,2}=\\dfrac{R_v}{K^2}\\pm\\dfrac{M}{W},\\qquad W=\\dfrac{K^3}{6}', name: 'Presiones bajo la zapata' },
          { eq: "\\tau_{u1}=\\dfrac{V_{u1}}{4(a+d)d}\\leq\\phi\\,1.06\\sqrt{f'_c}", name: 'Punzonamiento' },
          { eq: "A_s=\\dfrac{M_u}{\\phi f_y(d-a/2)},\\qquad a=\\dfrac{A_sf_y}{0.85f'_cb}", name: 'Acero por flexión' }
        ]
      }
    ],
    fixes: [
      'La pérdida en las transiciones $h(e)$, $h(s)$ usaba la celda D101, que no contiene la velocidad del conducto: salían 0.0098 m y 0.016 m. Aquí se usa $\\Delta h_v$ entre el conducto y el canal.',
      'El tirante del conducto se tomaba igual al crítico con el ancho aumentado 10 %, así que la velocidad (2.52 m/s) correspondía a flujo crítico. Aquí se resuelve la ecuación de energía para obtener el tirante subcrítico, que es coherente con ese ancho.',
      'El módulo de elasticidad usaba $4270\\,w\\sqrt{f\'_c}$ en lugar de $4270\\,w^{1.5}\\sqrt{f\'_c}$, lo que subestimaba $E_c$ y $P_{cr}$.',
      'El momento magnificado usaba un factor fijo de 1.2. Aquí se calcula $\\delta=1/(1-P_u/0.75P_{cr})$.',
      'La verificación de punzonamiento comparaba con 6.16 kg/cm², que es el límite de cortante de viga. Aquí se usa $\\phi\\,1.06\\sqrt{f\'_c}$ y se agrega la revisión de cortante como viga.',
      'Algunas unidades estaban mal rotuladas (por ejemplo, $b=0.4$ «cm» cuando eran metros). Aquí todas las unidades son explícitas.',
      'Se agregan la pérdida por fricción en el conducto, el perfil hidráulico y la verificación de la resistencia axial de la columna.'
    ]
  });
})();
