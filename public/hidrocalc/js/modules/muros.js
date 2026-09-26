/* Módulo: Muros de cámaras de captación — fuente: CALCULO ESTRUCTURAL BARRAJE SIN CANAL.xlsx */
(function () {
  'use strict';
  const { fmt, n, Doc, svg, rad, bar, asFlexion, floorTo } = HC;
  const BAR_OPTS = HC.BARS.slice(1).map((b) => ({ v: b.id, l: `Ø ${b.id}"` }));
  const isSuelo = (v) => v.tipo === 'suelo';

  function drawWall(o) {
    const W = 520, H = 320;
    const S = svg.scaler(-o.b - 0.3, o.em + 1.4, -0.4, o.Ht + 0.3, W, H, 28);
    let b = '';
    if (o.tipo === 'suelo') b += `<rect x="${S.X(o.em)}" y="${S.Y(o.Hs)}" width="${1.4 * S.s}" height="${(o.Hs + 0.4) * S.s}" class="sv-soil"/>`;
    else b += `<rect x="${S.X(o.em)}" y="${S.Y(o.Hs)}" width="${1.4 * S.s}" height="${o.Hs * S.s}" class="sv-water"/>`;
    b += `<rect x="${S.X(-o.b - 0.3)}" y="${S.Y(0)}" width="${(o.b + 0.3 + o.em + 1.4) * S.s}" height="${0.4 * S.s}" class="sv-soil" opacity=".35"/>`;
    b += svg.poly([[S.X(-o.b - o.em2), S.Y(0)], [S.X(o.em), S.Y(0)], [S.X(o.em), S.Y(-0.15)], [S.X(-o.b - o.em2), S.Y(-0.15)]], 'sv-concrete');
    b += svg.poly([[S.X(0), S.Y(0)], [S.X(o.em), S.Y(0)], [S.X(o.emTop), S.Y(o.Ht)], [S.X(0), S.Y(o.Ht)]].map((p, i) => (o.tipo === 'agua' && i === 2 ? [S.X(o.emTop), S.Y(o.Ht)] : p)), 'sv-concrete-p');
    b += svg.poly([[S.X(-o.b - o.em2), S.Y(0)], [S.X(-o.b), S.Y(0)], [S.X(-o.b), S.Y(o.Ht)], [S.X(-o.b - o.em2), S.Y(o.Ht)]], 'sv-concrete');
    // diagrama de presión
    const pw = 0.9;
    b += svg.poly([[S.X(o.em + 0.05), S.Y(o.Hs)], [S.X(o.em + 0.05), S.Y(0)], [S.X(o.em + 0.05 + pw), S.Y(0)]], 'sv-egl');
    b += `<path d="M ${S.X(o.em + 0.05 + pw * 0.66)} ${S.Y(o.Hs / 3)} l-${pw * 0.62 * S.s} 0" class="sv-line" marker-end="url(#arr)"/>`;
    b += svg.txt(S.X(o.em + 0.05 + pw * 0.7) + 4, S.Y(o.Hs / 3) - 6, `P = ${fmt(o.P, 1)} kg`, 'sv-small', 'start');
    b += svg.dim(S.X(-o.b), S.Y(o.Ht) - 10, S.X(0), S.Y(o.Ht) - 10, `b = ${fmt(o.b)} m`, 0);
    b += svg.dim(S.X(-o.b - o.em2) - 10, S.Y(0), S.X(-o.b - o.em2) - 10, S.Y(o.Ht), `Ht = ${fmt(o.Ht)} m`, 0);
    b += svg.txt(S.X(o.em / 2), S.Y(0) + 26, 'O', 'sv-label');
    return svg.frame(W, H, b, 'Muro de la cámara');
  }

  HC.register({
    id: 'muros',
    title: 'Muros de cámaras de captación',
    short: 'Muros y acero',
    icon: 'muro',
    group: 'estructural',
    source: 'CALCULO ESTRUCTURAL BARRAJE SIN CANAL.xlsx',
    description: 'Estabilidad al volteo, deslizamiento y presiones de muros de cámara húmeda, cámara seca y barraje; acero horizontal y vertical con sismo, y losa de fondo (también aplicable a tanques Imhoff).',
    tags: ['Rankine', 'Volteo', 'Acero', 'Losa'],
    inputs: [
      {
        title: 'Tipo de muro', fields: [
          { id: 'tipo', label: 'Empuje', type: 'select', value: 'suelo', options: [{ v: 'suelo', l: 'Empuje de suelo (cámara)' }, { v: 'agua', l: 'Empuje de agua (barraje)' }] },
          { id: 'estab', label: 'Verificar estabilidad del muro', type: 'select', value: 'si', options: [{ v: 'si', l: 'Sí' }, { v: 'no', l: 'No (solo acero y losa)' }] }
        ]
      },
      {
        title: 'Geometría y suelo', fields: [
          { id: 'Ht', label: 'Altura del muro', sym: 'H_t', unit: 'm', value: 1.1, step: 0.05 },
          { id: 'Hs', label: 'Altura de suelo o agua', sym: 'H_s', unit: 'm', value: 1.0, step: 0.05 },
          { id: 'b', label: 'Ancho de la pantalla (luz interior)', sym: 'b', unit: 'm', value: 1.45, step: 0.05 },
          { id: 'em', label: 'Espesor del muro', sym: 'e_m', unit: 'm', value: 0.15, step: 0.05, show: isSuelo },
          { id: 'e1', label: 'Espesor arriba', sym: 'e_1', unit: 'm', value: 0.2, step: 0.05, show: (v) => !isSuelo(v) },
          { id: 'e2', label: 'Espesor abajo', sym: 'e_2', unit: 'm', value: 0.7, step: 0.05, show: (v) => !isSuelo(v) },
          { id: 'gs', label: 'Peso específico del suelo', sym: '\\gamma_s', unit: 'kg/m^3', value: 1700, step: 10, show: isSuelo },
          { id: 'phi', label: 'Ángulo de fricción interna', sym: '\\phi', unit: '°', value: 30, step: 1, show: isSuelo },
          { id: 'mu', label: 'Coeficiente de fricción', sym: '\\mu', value: 0.52, step: 0.01 },
          { id: 'gc', label: 'Peso específico del concreto', sym: '\\gamma_c', unit: 'kg/m^3', value: 2400, step: 50 },
          { id: 'st', label: 'Capacidad portante del suelo', sym: '\\sigma_t', unit: 'kg/cm^2', value: 1.0, step: 0.1 },
          { id: 'FSv', label: 'FS mínimo al volteo', value: 1.6, step: 0.1 },
          { id: 'FSd', label: 'FS mínimo al deslizamiento', value: 1.5, step: 0.1 }
        ]
      },
      {
        title: 'Diseño del acero', fields: [
          { id: 'fc', label: 'Resistencia del concreto', sym: "f'_c", unit: 'kg/cm^2', value: 210, step: 10 },
          { id: 'fy', label: 'Fluencia del acero', sym: 'f_y', unit: 'kg/cm^2', value: 4200, step: 100 },
          { id: 'ea', label: 'Espesor del muro para el acero', sym: 'e', unit: 'cm', value: 15, step: 5 },
          { id: 'rec', label: 'Recubrimiento', sym: 'r', unit: 'cm', value: 5, step: 0.5 },
          { id: 'LL', label: 'Luz libre horizontal', sym: 'L_L', unit: 'm', value: 1.45, step: 0.05 },
          { id: 'frac', label: 'Presión evaluada a', type: 'select', value: '0.875', options: [{ v: '0.875', l: '7/8 H (Excel captación)' }, { v: '0.625', l: '5/8 H (Excel Imhoff)' }, { v: '1', l: 'H (base)' }] },
          { id: 'sis', label: 'Carga sísmica (% del empuje)', unit: '\\%', value: 75, step: 5 },
          { id: 'Cm', label: 'Coeficiente de momento vertical', sym: 'C_m', value: 0.03, step: 0.005, help: 'Coeficiente PCA para muros de tanques empotrados en la base.' },
          { id: 'barH', label: 'Varilla horizontal', type: 'select', value: '3/8', options: BAR_OPTS },
          { id: 'barV', label: 'Varilla vertical', type: 'select', value: '3/8', options: BAR_OPTS }
        ]
      },
      {
        title: 'Losa de fondo', collapsed: true, fields: [
          { id: 'hl', label: 'Espesor de la losa', sym: 'h', unit: 'm', value: 0.2, step: 0.05 },
          { id: 'Al', label: 'Ancho exterior', sym: 'A', unit: 'm', value: 1.9, step: 0.05 },
          { id: 'Ll', label: 'Largo exterior', sym: 'L', unit: 'm', value: 3.25, step: 0.05 },
          { id: 'Ha', label: 'Altura de agua', sym: 'H_a', unit: 'm', value: 1.2, step: 0.05 },
          { id: 'barL', label: 'Varilla de la losa', type: 'select', value: '3/8', options: BAR_OPTS }
        ]
      }
    ],
    presets: [
      { name: 'Cámara húmeda', values: { tipo: 'suelo', Ht: 1.1, Hs: 1.0, b: 1.45, em: 0.15, gs: 1700, ea: 15, LL: 1.45 } },
      { name: 'Cámara seca', values: { tipo: 'suelo', Ht: 1.76, Hs: 1.56, b: 1.2, em: 0.2, gs: 1710, ea: 20, LL: 1.2 } },
      { name: 'Muro del barraje (agua)', values: { tipo: 'agua', Ht: 1.0, Hs: 1.0, b: 1.3, e1: 0.2, e2: 0.7, ea: 35, LL: 1.3, fc: 280 } },
      { name: 'Tanque Imhoff (H = 9.5 m)', values: { tipo: 'suelo', Ht: 9.5, Hs: 9.5, b: 6.5, em: 0.5, gs: 1720, phi: 32, st: 4.26, ea: 50, LL: 6.5, frac: '0.625', sis: 0, fc: 280, barH: '5/8', barV: '5/8', estab: 'no', hl: 0.3, Al: 7.5, Ll: 7.5, Ha: 9.0 } }
    ],
    compute(v) {
      const d = new Doc();
      const checks = [];
      const suelo = isSuelo(v);
      const em = suelo ? v.em : v.e2;
      d.h(suelo ? 'Empuje del suelo (Rankine)' : 'Empuje del agua');
      let Ka = 1, gam = 1000;
      if (suelo) {
        Ka = (1 - Math.sin(rad(v.phi))) / (1 + Math.sin(rad(v.phi)));
        gam = v.gs;
        d.calc({ sym: 'K_a', f: '\\dfrac{1-\\sin\\phi}{1+\\sin\\phi}', sub: `\\dfrac{1-\\sin ${fmt(v.phi)}^\\circ}{1+\\sin ${fmt(v.phi)}^\\circ}`, val: Ka, d: 4 });
      }
      const P = 0.5 * Ka * gam * v.Hs * v.Hs;
      d.calc({ sym: 'P', f: suelo ? '\\tfrac12K_a\\gamma_sH_s^2' : '\\tfrac12\\gamma_wH_s^2', sub: suelo ? `\\tfrac12(${n(Ka, 4)})(${n(gam, 0)})(${n(v.Hs)})^2` : `\\tfrac12(1000)(${n(v.Hs)})^2`, val: P, unit: 'kg/m', d: 2 });
      let Cdv = NaN, Cdd = NaN, pmax = NaN;
      if (v.estab !== 'no') {
      d.h('Momento de vuelco');
      const Y = v.Hs / 3, Mo = P * Y;
      d.calc({ sym: 'Y', f: 'H_s/3', sub: `${n(v.Hs)}/3`, val: Y, unit: 'm', d: 4 });
      d.calc({ sym: 'M_o', f: 'P\\,Y', sub: `${n(P, 2)}(${n(Y, 4)})`, val: Mo, unit: 'kg\\cdot m', d: 2 });
      d.h('Momento estabilizante');
      let W1, X1;
      if (suelo) {
        W1 = v.em * v.Ht * v.gc;
        d.calc({ sym: 'W_1', f: 'e_m\\,H_t\\,\\gamma_c', sub: `${n(v.em)}(${n(v.Ht)})(${n(v.gc, 0)})`, val: W1, unit: 'kg/m', d: 2 });
        X1 = v.b / 2 + v.em / 2;
        d.calc({ sym: 'X_1', f: '\\dfrac{b}{2}+\\dfrac{e_m}{2}', sub: `\\dfrac{${n(v.b)}}{2}+\\dfrac{${n(v.em)}}{2}`, val: X1, unit: 'm', d: 4 });
      } else {
        W1 = (v.e1 + v.e2) / 2 * v.Ht * v.gc;
        d.calc({ sym: 'W_1', f: '\\dfrac{e_1+e_2}{2}\\,H_t\\,\\gamma_c', sub: `\\dfrac{${n(v.e1)}+${n(v.e2)}}{2}(${n(v.Ht)})(${n(v.gc, 0)})`, val: W1, unit: 'kg/m', d: 2 });
        X1 = v.b / 2 + v.e1 / 2;
        d.calc({ sym: 'X_1', f: '\\dfrac{b}{2}+\\dfrac{e_1}{2}', sub: `\\dfrac{${n(v.b)}}{2}+\\dfrac{${n(v.e1)}}{2}`, val: X1, unit: 'm', d: 4 });
      }
      d.p('El muro forma parte de una caja: el brazo se mide desde el eje de la caja, como en la hoja original.');
      const Mr = W1 * X1;
      d.calc({ sym: 'M_r', f: 'W_1\\,X_1', sub: `${n(W1, 2)}(${n(X1, 4)})`, val: Mr, unit: 'kg\\cdot m', d: 2 });
      d.h('Ubicación de la resultante');
      const a = (Mr - Mo) / W1;
      d.calc({ sym: 'a', f: '\\dfrac{M_r-M_o}{W}', sub: `\\dfrac{${n(Mr, 2)}-${n(Mo, 2)}}{${n(W1, 2)}}`, val: a, unit: 'm', d: 4 });
      d.h('Chequeo por volteo');
      Cdv = Mr / Mo;
      d.calc({ sym: 'C_{dv}', f: '\\dfrac{M_r}{M_o}', sub: `\\dfrac{${n(Mr, 2)}}{${n(Mo, 2)}}`, val: Cdv, d: 3 });
      const okV = Cdv >= v.FSv;
      d.check(`$C_{dv}=${fmt(Cdv)}\\geq${fmt(v.FSv)}$`, okV);
      checks.push({ label: `Volteo ($C_{dv}\\geq${fmt(v.FSv)}$)`, ok: okV, detail: `Cdv = ${fmt(Cdv)}` });
      d.h('Chequeo por deslizamiento');
      const F = v.mu * W1;
      d.calc({ sym: 'F', f: '\\mu\\,W', sub: `${n(v.mu)}(${n(W1, 2)})`, val: F, unit: 'kg/m', d: 2 });
      Cdd = F / P;
      d.calc({ sym: 'C_{dd}', f: '\\dfrac{F}{P}', sub: `\\dfrac{${n(F, 2)}}{${n(P, 2)}}`, val: Cdd, d: 3 });
      const okD = Cdd >= v.FSd;
      d.check(`$C_{dd}=${fmt(Cdd)}\\geq${fmt(v.FSd)}$`, okD);
      checks.push({ label: `Deslizamiento ($C_{dd}\\geq${fmt(v.FSd)}$)`, ok: okD, detail: `Cdd = ${fmt(Cdd)}` });
      if (!okD) d.note('El muro aislado no resiste el deslizamiento por fricción. En una caja cerrada la losa de fondo y el muro opuesto lo arriostran; si el muro es independiente, agregue un diente o aumente el peso.', 'warn');
      d.h('Carga unitaria máxima en el terreno');
      const L = v.b / 2 + em;
      d.calc({ sym: 'L', f: '\\dfrac{b}{2}+e_m', sub: `\\dfrac{${n(v.b)}}{2}+${n(em)}`, val: L, unit: 'm', d: 3 });
      const P1 = (4 * L - 6 * a) * W1 / (L * L) / 1e4;
      const P2 = (6 * a - 2 * L) * W1 / (L * L) / 1e4;
      d.calc({ sym: 'P_1', f: '\\dfrac{(4L-6a)\\,W}{L^2}', sub: `\\dfrac{(4(${n(L)})-6(${n(a, 4)}))(${n(W1, 2)})}{${n(L)}^2}`, val: P1, unit: 'kg/cm^2', d: 4 });
      d.calc({ sym: 'P_2', f: '\\dfrac{(6a-2L)\\,W}{L^2}', sub: `\\dfrac{(6(${n(a, 4)})-2(${n(L)}))(${n(W1, 2)})}{${n(L)}^2}`, val: P2, unit: 'kg/cm^2', d: 4 });
      pmax = Math.max(P1, P2);
      const okP = pmax <= v.st && Math.min(P1, P2) >= 0;
      d.check(`$P_{max}=${fmt(pmax, 4)}\\leq\\sigma_t=${fmt(v.st)}$ kg/cm² y sin tracciones`, okP);
      checks.push({ label: 'Presión en el terreno ≤ σt, sin tracciones', ok: okP, detail: `Pmáx = ${fmt(pmax, 4)} kg/cm²` });

      }

      /* acero horizontal */
      d.h('Acero horizontal en el muro');
      const frac = parseFloat(v.frac);
      const KaR = suelo ? Math.pow(Math.tan(rad(45 - v.phi / 2)), 2) : 1;
      const wt = gam / 1000;
      if (suelo) d.calc({ sym: 'K_a', f: '\\tan^2\\left(45^\\circ-\\dfrac{\\phi}{2}\\right)', sub: `\\tan^2\\left(45^\\circ-\\dfrac{${fmt(v.phi)}^\\circ}{2}\\right)`, val: KaR, d: 4 });
      const Pt = frac * v.Hs * KaR * wt;
      d.calc({ sym: 'P_t', f: `${fmt(frac, 3)}\\,H\\,K_a\\,\\gamma`, sub: `${fmt(frac, 3)}(${n(v.Hs)})(${n(KaR, 4)})(${n(wt, 3)})`, val: Pt, unit: 't/m^2', d: 4 });
      const Es = Pt * v.sis / 100;
      d.calc({ sym: 'E', f: `${fmt(v.sis / 100, 2)}\\,P_t`, sub: `${fmt(v.sis / 100, 2)}(${n(Pt, 4)})`, val: Es, unit: 't/m^2', d: 4, note: 'Carga de sismo.' });
      const Pu = 1.0 * Es + 1.6 * Pt;
      d.calc({ sym: 'P_u', f: '1.0E+1.6P_t', sub: `${n(Es, 4)}+1.6(${n(Pt, 4)})`, val: Pu, unit: 't/m^2', d: 4 });
      const Mpos = Pu * v.LL * v.LL / 16, Mneg = Pu * v.LL * v.LL / 12;
      d.calc({ sym: 'M^{+}', f: '\\dfrac{P_u L_L^2}{16}', sub: `\\dfrac{${n(Pu, 4)}(${n(v.LL)})^2}{16}`, val: Mpos, unit: 't\\cdot m', d: 4 });
      d.calc({ sym: 'M^{-}', f: '\\dfrac{P_u L_L^2}{12}', sub: `\\dfrac{${n(Pu, 4)}(${n(v.LL)})^2}{12}`, val: Mneg, unit: 't\\cdot m', d: 4 });
      const dd = v.ea - v.rec - 1.27 / 2;
      d.calc({ sym: 'd', f: 'e-r-\\dfrac{1.27}{2}', sub: `${n(v.ea)}-${n(v.rec)}-0.635`, val: dd, unit: 'cm', d: 3 });
      const flH = asFlexion(Mneg * 1e5, 100, dd, v.fc, v.fy);
      d.table(['Iteración', '$a$ (cm)', '$A_s$ (cm²)'], flH.it.slice(0, 6).map((r) => [String(r.i), fmt(r.a, 4), fmt(r.As, 4)]));
      const AsminH = 0.0018 * 100 * dd;
      d.calc({ sym: 'A_{s,min}', f: '0.0018\\,b\\,d', sub: `0.0018(100)(${n(dd)})`, val: AsminH, unit: 'cm^2/m', d: 3 });
      const AsH = Math.max(flH.As, AsminH);
      const bH = bar(v.barH);
      const smaxH = Math.min(3 * v.ea, 45);
      const sH = Math.min(floorTo(bH.A * 100 / AsH, 2.5), smaxH);
      d.calc({ sym: 's', f: '\\dfrac{A_b\\cdot100}{A_s}', sub: `\\dfrac{${n(bH.A)}(100)}{${n(AsH)}}`, val: bH.A * 100 / AsH, unit: 'cm', d: 2, note: `Usar Ø${bH.id}" @ ${fmt(sH, 1)} cm en ambas caras (s ≤ ${fmt(smaxH)} cm).` });
      d.table(['Varilla', 'Ø3/8"', 'Ø1/2"', 'Ø5/8"', 'Ø3/4"', 'Ø1"'], [['N.º de varillas por metro', ...['3/8', '1/2', '5/8', '3/4', '1'].map((id) => String(Math.ceil(AsH / bar(id).A - 1e-9)))]]);

      /* acero vertical */
      d.h('Acero vertical en el muro');
      const Mv = 1.7 * v.Cm * KaR * wt * v.Hs * v.Hs * v.LL;
      d.calc({ sym: 'M^{-}', f: '1.7\\,C_m\\,K_a\\,\\gamma\\,H^2\\,L_L', sub: `1.7(${n(v.Cm)})(${n(KaR, 4)})(${n(wt, 3)})(${n(v.Hs)})^2(${n(v.LL)})`, val: Mv, unit: 't\\cdot m', d: 4 });
      const fs = 1 + v.sis / 100;
      const Mvu = Mv * fs;
      d.calc({ sym: 'M_u', f: `${fmt(fs, 2)}\\,M^{-}`, sub: `${fmt(fs, 2)}(${n(Mv, 4)})`, val: Mvu, unit: 't\\cdot m', d: 4, note: 'Incluye el sismo como porcentaje del empuje.' });
      const flV = asFlexion(Mvu * 1e5, 100, dd, v.fc, v.fy);
      d.calc({ sym: 'A_s', val: flV.As, unit: 'cm^2/m', d: 4 });
      const AsV = Math.max(flV.As, AsminH);
      const bV = bar(v.barV);
      const sV = Math.min(floorTo(bV.A * 100 / AsV, 2.5), smaxH);
      d.calc({ sym: 'A_{s,dis}', f: '\\max(A_s,A_{s,min})', val: AsV, unit: 'cm^2/m', d: 3, note: `Usar Ø${bV.id}" @ ${fmt(sV, 1)} cm en ambas caras.` });

      /* losa */
      d.h('Losa de fondo');
      const Wl = v.Al * v.Ll * v.hl * v.gc / 1000;
      d.calc({ sym: 'W_{losa}', f: 'A\\,L\\,h\\,\\gamma_c', sub: `${n(v.Al)}(${n(v.Ll)})(${n(v.hl)})(${n(v.gc / 1000)})`, val: Wl, unit: 't', d: 3 });
      const Wm = 2 * (v.Al + v.Ll - 2 * em) * em * v.Ht * v.gc / 1000;
      d.calc({ sym: 'W_{muros}', f: '2(A+L-2e_m)\\,e_m\\,H_t\\,\\gamma_c', sub: `2(${n(v.Al)}+${n(v.Ll)}-2(${n(em)}))(${n(em)})(${n(v.Ht)})(${n(v.gc / 1000)})`, val: Wm, unit: 't', d: 3 });
      const Ww = Math.max(v.Al - 2 * em, 0) * Math.max(v.Ll - 2 * em, 0) * v.Ha;
      d.calc({ sym: 'W_{agua}', f: '(A-2e_m)(L-2e_m)\\,H_a\\,\\gamma_w', sub: `(${n(v.Al)}-2(${n(em)}))(${n(v.Ll)}-2(${n(em)}))(${n(v.Ha)})(1.0)`, val: Ww, unit: 't', d: 3 });
      const Ptot = Wl + Wm + Ww;
      d.calc({ sym: 'P_T', f: 'W_{losa}+W_{muros}+W_{agua}', sub: `${n(Wl)}+${n(Wm)}+${n(Ww)}`, val: Ptot, unit: 't', d: 3 });
      const qn = 1.2 * Ptot / (v.Al * v.Ll) / 10;
      d.calc({ sym: 'q_n', f: '\\dfrac{1.2\\,P_T}{A\\,L}', sub: `\\dfrac{1.2(${n(Ptot)})}{${n(v.Al)}(${n(v.Ll)})}`, val: qn, unit: 'kg/cm^2', d: 4 });
      const okQ = qn <= v.st;
      d.check(`$q_n=${fmt(qn, 4)}\\leq\\sigma_t=${fmt(v.st)}$ kg/cm²`, okQ);
      checks.push({ label: 'Reacción neta bajo la losa ≤ σt', ok: okQ, detail: `qn = ${fmt(qn, 4)} kg/cm²` });
      const AsL = 0.0018 * 100 * v.hl * 100;
      const bL = bar(v.barL);
      const sL = Math.min(floorTo(bL.A * 100 / AsL, 2.5), 45);
      d.calc({ sym: 'A_{s,min}', f: '0.0018\\,b\\,h', sub: `0.0018(100)(${n(v.hl * 100)})`, val: AsL, unit: 'cm^2/m', d: 3, note: `Usar Ø${bL.id}" @ ${fmt(sL, 1)} cm en ambos sentidos.` });

      const results = [
        { label: 'Empuje', sym: 'P', value: P, unit: 'kg/m', d: 1 }].concat(v.estab === 'no' ? [] : [
        { label: 'Factor de volteo', sym: 'C_{dv}', value: Cdv, hl: true },
        { label: 'Factor de deslizamiento', sym: 'C_{dd}', value: Cdd, hl: true },
        { label: 'Presión máxima', sym: 'P_{max}', value: pmax, unit: 'kg/cm^2', d: 4 }]).concat([
        { label: 'Acero horizontal', value: `Ø${bH.id}" @ ${fmt(sH, 1)} cm`, hl: true },
        { label: 'Acero vertical', value: `Ø${bV.id}" @ ${fmt(sV, 1)} cm`, hl: true },
        { label: 'Acero de la losa', value: `Ø${bL.id}" @ ${fmt(sL, 1)} cm` },
        { label: 'Reacción bajo la losa', sym: 'q_n', value: qn, unit: 'kg/cm^2', d: 4 }
      ]);
      const charts = [
        { id: 'muro', type: 'svg', title: 'Esquema del muro y diagrama de empuje', svg: drawWall({ tipo: v.tipo, Ht: v.Ht, Hs: v.Hs, b: v.b, em, emTop: suelo ? v.em : v.e1, em2: em, P }) },
        v.estab === 'no' ? null : { id: 'fs', type: 'bar', title: 'Factores de seguridad vs mínimos exigidos', labels: ['Volteo', 'Deslizamiento'], yLabel: 'FS', datasets: [{ label: 'Calculado', data: [Cdv, Cdd], color: '#2563eb' }, { label: 'Mínimo', data: [v.FSv, v.FSd], color: '#dc2626' }] },
        { id: 'as', type: 'bar', title: 'Acero requerido vs mínimo (cm²/m)', labels: ['Horizontal', 'Vertical', 'Losa'], yLabel: 'cm²/m', datasets: [{ label: 'Por cálculo', data: [flH.As, flV.As, 0], color: '#0d9488' }, { label: 'Mínimo', data: [AsminH, AsminH, AsL], color: '#d97706' }] },
        { id: 'pr', type: 'xy', title: 'Diagrama de presiones horizontales (t/m²)', xLabel: 'Presión (t/m²)', yLabel: 'Altura desde la base (m)', datasets: [{ label: 'Empuje de servicio', data: [{ x: 0, y: v.Hs }, { x: KaR * wt * v.Hs, y: 0 }], color: '#2563eb', fill: true }, { label: 'Empuje último (1.6H + E)', data: [{ x: 0, y: v.Hs }, { x: KaR * wt * v.Hs * (1.6 + v.sis / 100), y: 0 }], color: '#dc2626', dash: true }] }
      ];
      return { doc: d, results, checks, charts: charts.filter(Boolean) };
    },
    theory: [
      {
        title: 'Empuje y estabilidad', body: [
          { eq: 'K_a=\\dfrac{1-\\sin\\phi}{1+\\sin\\phi}=\\tan^2\\!\\left(45^\\circ-\\dfrac{\\phi}{2}\\right)', name: 'Coeficiente de empuje activo (Rankine)' },
          { eq: 'P=\\tfrac12K_a\\,\\gamma_s\\,H^2,\\qquad M_o=P\\,\\dfrac{H}{3}', name: 'Empuje y momento de vuelco' },
          { eq: 'a=\\dfrac{M_r-M_o}{W},\\qquad C_{dv}=\\dfrac{M_r}{M_o}\\geq1.6,\\qquad C_{dd}=\\dfrac{\\mu W}{P}\\geq1.5', name: 'Resultante, volteo y deslizamiento' },
          { eq: 'P_{1}=\\dfrac{(4L-6a)W}{L^2},\\qquad P_2=\\dfrac{(6a-2L)W}{L^2}', name: 'Presiones en el terreno' }
        ]
      },
      {
        title: 'Acero de refuerzo', body: [
          'Los muros de las cámaras se diseñan como losas apoyadas en sus bordes. El acero horizontal toma la flexión entre muros transversales (coeficientes 1/12 y 1/16); el vertical toma la flexión en voladizo desde la base (coeficiente PCA $C_m$).',
          { eq: 'P_u=1.0\\,E+1.6\\,H,\\qquad M^{-}=\\dfrac{P_uL^2}{12},\\quad M^{+}=\\dfrac{P_uL^2}{16}', name: 'Momentos horizontales' },
          { eq: "A_s=\\dfrac{M_u}{\\phi f_y\\,(d-a/2)},\\qquad a=\\dfrac{A_sf_y}{0.85\\,f'_c\\,b}", name: 'Acero por flexión (iterativo)' },
          { eq: 'A_{s,min}=0.0018\\,b\\,d,\\qquad s=\\dfrac{A_b}{A_s}\\,100\\leq3e\\leq45\\ \\mathrm{cm}', name: 'Acero mínimo y espaciamiento' },
          { table: { head: ['Varilla', 'Diámetro (cm)', 'Área (cm²)'], rows: HC.BARS.map((b) => [`${b.id}"`, String(b.d), String(b.A)]) } }
        ]
      }
    ],
    fixes: [
      'En «MURO BARRAJE» el peso propio usaba el peso específico del agua (1000 kg/m³) en lugar del concreto: $W=585$ kg en vez de 1404 kg. Corregido.',
      'El chequeo por deslizamiento comparaba $C_{dd}$ con $\\mu W/1000$ en lugar de con 1.5, y por eso marcaba «Cumple» con $C_{dd}=0.63$ y 0.73. Ahora se compara con el factor mínimo.',
      '$K_a$ se calculaba con $\\pi\\approx3.14$ (0.3329 en vez de 0.3333). Aquí se usa el valor exacto.',
      'El acero horizontal iteraba con $f\'_c=280$ aunque los datos decían 210. Ahora se usa un único $f\'_c$.',
      'En la losa de fondo el peso de los muros ($0.57\\times1.1$) y el área de la losa ($3\\times2.1$) estaban escritos a mano. El acero mínimo usaba $(h-0.007)$. Aquí se calculan a partir de la geometría.',
      'La hoja «immhoff» (otro proyecto) se cubre con el ejemplo «Tanque Imhoff» (presión a 5/8 H, sin sismo).'
    ]
  });
})();
