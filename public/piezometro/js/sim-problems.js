/*
 * Biblioteca de problemas del simulador. Cada problema define la configuración inicial, el enunciado,
 * las preguntas y una función solve(ctx) que calcula las respuestas a partir de la simulación.
 * Los datos son ilustrativos y realistas para la sierra de Cajamarca, salvo que se indique otra cosa.
 */
(function (root) {
  'use strict';
  const E = root.SimEngine;

  let uid = 0;
  const id = (p) => `${p}${++uid}`;
  const casa = (name, x, y, cim = 1.5) => ({ type: 'casa', id: id('c'), name, x, y, cim });
  const canal = (x1, y1, x2, y2, q, extra = {}) => ({ type: 'canal', id: id('k'), name: 'Canal', x1, y1, x2, y2, q, lined: false, eff: 80, t1: 0, t2: null, ...extra });
  const pozo = (name, x, y, Q, extra = {}) => ({ type: 'pozo', id: id('w'), name, x, y, Q, depth: 40, limit: null, t1: 0, t2: null, ...extra });
  const poza = (name, x1, y1, x2, y2, inf, extra = {}) => ({ type: 'poza', id: id('p'), name, x1, y1, x2, y2, inf, membrane: false, t1: 0, t2: null, ...extra });
  const dren = (x1, y1, x2, y2, depth, extra = {}) => ({ type: 'dren', id: id('d'), name: 'Dren', x1, y1, x2, y2, depth, ...extra });
  const rio = (name, x1, y1, x2, y2, extra = {}) => ({ type: 'rio', id: id('r'), name, x1, y1, x2, y2, dh: 0, flood: { on: false, peak: 2, tStart: 5, rise: 5, fall: 20 }, ...extra });
  const fosa = (name, x1, y1, x2, y2, depth, extra = {}) => ({ type: 'fosa', id: id('f'), name, x1, y1, x2, y2, depth, margin: 0.5, ...extra });

  const f = (v, d = 2) => (v === null || v === undefined || !isFinite(v) ? '—' : (Math.round(v * 10 ** d) / 10 ** d).toFixed(d).replace('.', ','));
  const dias = (t) => (t === null || t === undefined ? 'no ocurre' : t >= 365 ? `${f(t, 0)} días (${f(t / 365, 1)} años)` : `${f(t, 1)} días`);
  const clone = (o) => JSON.parse(JSON.stringify(o));
  const M = (s) => `<div class="math">\\[${s}\\]</div>`;
  const tx = (v, d = 3) => f(v, d).replace(',', '{,}');

  /** Corre una variante completa (transitorio + estacionario). */
  function runVariant(cfg) {
    const sim = new E.Sim(cfg).runToEnd();
    const st = E.steady(cfg);
    return { sim, st };
  }
  const housesTable = (sim, st) => {
    const g = sim.g;
    const rows = Object.values(sim.mon.casa).map((m) => {
      const hs = st && st.exists ? E.interp(st.g, st.h, m.el.x, m.el.y) : null;
      const label = m.tHit !== null ? `<span class="pill bad">Afectada</span>` : m.tAlert !== null ? `<span class="pill warn">Alerta</span>` : `<span class="pill ok">Segura</span>`;
      return `<tr><td>${m.el.name}</td><td class="n">${f(g.zg - m.maxH)} m</td><td class="n">${f(m.el.cim)} m</td><td class="n">${dias(m.tHit)}</td><td class="n">${hs === null ? '—' : f(g.zg - hs) + ' m'}</td><td>${label}</td></tr>`;
    }).join('');
    return `<div class="table-wrap"><table class="data"><thead><tr><th>Casa</th><th>Prof. mínima del agua</th><th>Cimentación</th><th>Agua llega a la cimentación</th><th>Prof. final (estacionario)</th><th>Estado</th></tr></thead><tbody>${rows}</tbody></table></div>`;
  };
  const countHit = (sim) => Object.values(sim.mon.casa).filter((m) => m.tHit !== null).length;
  const countHitSteady = (sim, st) => Object.values(sim.mon.casa).filter((m) => st.exists && E.interp(st.g, st.h, m.el.x, m.el.y) >= m.hCrit).length;

  const base = (o) => Object.assign({
    Lx: 2000, Ly: 1200, dx: 50, K: 10, b: 15, S: 0.1, depth0: 3, soil: 'arenaFina',
    bc: { west: 'impermeable', east: 'fijo', south: 'impermeable', north: 'impermeable' },
    rain: { R: 0, seasonal: false }, tEnd: 1825, elements: [],
  }, o);

  const PROBLEMS = [
    /* ------------------------------------------------------------ */
    {
      id: 'p1', tag: 'Canal', title: 'Canal sin revestir y urbanización',
      cfg: () => base({
        Lx: 2000, Ly: 1200, dx: 50, K: 10, b: 15, S: 0.1, depth0: 4, tEnd: 3650,
        elements: [canal(300, 0, 300, 1200, 0.35, { name: 'Canal de riego' }),
          casa('Casa 1', 700, 300), casa('Casa 2', 700, 600), casa('Casa 3', 700, 900),
          casa('Casa 4', 1000, 450), casa('Casa 5', 1000, 750), casa('Colegio', 1500, 600, 2.0)],
      }),
      statement: `<p>Un canal de riego de tierra corre de sur a norte en x = 300 m y pierde <b>0,35 m³/día por metro</b> de canal. Al este hay una urbanización. El acuífero es arena fina (K = 10 m/día, espesor saturado 15 m, S<sub>y</sub> = 0,10) y el nivel freático natural está a 4 m de profundidad. El borde este (x = 2 000 m) es una quebrada que mantiene el nivel; los demás bordes no dejan pasar agua. Las cimentaciones están a 1,5 m (el colegio a 2,0 m). Analice los próximos 10 años.</p>`,
      questions: ['¿Qué casas se afectan y cuándo llega el agua a su cimentación?', '¿Cuál es el ascenso final del nivel freático y por qué el montículo deja de crecer?', 'Si se reviste el canal con 80 % de eficiencia, ¿se resuelve el problema?'],
      solve(ctx) {
        const { sim, st, cfg } = ctx;
        const g = sim.g, C = cfg.elements.find((e) => e.type === 'canal'), q = C.q, xc = C.x1;
        const lined = clone(cfg); lined.elements.find((e) => e.type === 'canal').lined = true;
        const v = runVariant(lined);
        const T = g.T, rise = (x) => q / T * (cfg.Lx - Math.max(x, xc));
        return [
          `${housesTable(sim, st)}<p>${countHit(sim)} de ${Object.keys(sim.mon.casa).length} edificaciones tienen el agua en su cimentación dentro de los ${f(cfg.tEnd / 365, 0)} años. Las más cercanas al canal se afectan primero porque el montículo nace bajo el canal y se ensancha hacia el este con el tiempo.</p>`,
          `<p>Al este del canal todo el caudal infiltrado sale hacia la quebrada, así que en estacionario el gradiente es constante:</p>${M(`\\frac{\\partial h}{\\partial x} = -\\frac{q}{T} = -\\frac{${tx(q, 2)}}{${tx(T, 0)}} = ${tx(-q / T, 5)},\\qquad \\Delta h(x) = \\frac{q}{T}(L_x - x)`)}<p>Bajo el canal Δh = ${f(rise(xc))} m (el agua queda a ${f(cfg.depth0 - rise(xc))} m del terreno); en x = 700 m: ${f(rise(700))} m; en x = 1 000 m: ${f(rise(1000))} m; en el colegio (x = 1 500 m): ${f(rise(1500))} m. El montículo deja de crecer cuando la salida por la quebrada iguala la entrada del canal (${f(q * cfg.Ly, 0)} m³/día). El tiempo de respuesta es del orden de ${M(`\\tau \\approx \\frac{S\\,(L_x - x_c)^2}{T} = \\frac{${tx(g.S, 2)}\\times ${tx(cfg.Lx - xc, 0)}^2}{${tx(T, 0)}} \\approx ${tx(g.S * (cfg.Lx - xc) ** 2 / T, 0)}\\ \\text{días}`)}</p>`,
          `<p>Con el canal revestido entra 20 % del agua y el ascenso final se reduce en la misma proporción (${f(0.2 * rise(700))} m en x = 700 m). Edificaciones afectadas: <b>${countHit(v.sim)}</b> en el transitorio y <b>${countHitSteady(v.sim, v.st)}</b> en el estado final. ${countHitSteady(v.sim, v.st) === 0 ? 'El revestimiento resuelve el problema porque ataca la causa.' : 'El revestimiento no basta solo.'}</p>`,
        ];
      },
    },
    /* ------------------------------------------------------------ */
    {
      id: 'p2', tag: 'Pozo', title: 'Pozo municipal y el pozo del vecino',
      cfg: () => base({
        Lx: 4000, Ly: 4000, dx: 50, K: 10, b: 20, S: 0.05, depth0: 8, tEnd: 365,
        bc: { west: 'fijo', east: 'fijo', south: 'fijo', north: 'fijo' },
        elements: [pozo('Pozo municipal', 2000, 2000, 3000, { depth: 25 }), pozo('Pozo del vecino', 2400, 2000, 0, { limit: 2, depth: 14 }),
          casa('Casa del vecino', 2450, 2050, 1.5)],
      }),
      statement: `<p>La municipalidad perfora un pozo que bombeará <b>3 000 m³/día</b>. A 400 m hay un pozo artesanal de 14 m de profundidad que abastece a una familia. Acuífero: K = 10 m/día, b = 20 m (T = 200 m²/día), S = 0,05; nivel freático a 8 m. Los bordes, a 2 km, son de nivel fijo. Se considera dañino un abatimiento mayor de 2 m en el pozo vecino.</p>`,
      questions: ['¿En cuánto tiempo el abatimiento en el pozo del vecino supera 2 m?', 'Compare el resultado numérico con la solución analítica de Theis.', '¿Qué caudal máximo podría bombear la municipalidad sin dañar al vecino en un año?'],
      solve(ctx) {
        const { sim, cfg } = ctx;
        const g = sim.g;
        const P = cfg.elements.find((e) => e.name === 'Pozo municipal');
        const nb = Object.values(sim.mon.pozo).find((m) => m.el.name === 'Pozo del vecino');
        const r = Math.hypot(nb.el.x - P.x, nb.el.y - P.y);
        // Theis: tiempo para s = 2 m
        let tTh = null;
        for (let t = 0.05; t <= cfg.tEnd; t *= 1.01) if (E.theis(P.Q, g.T, g.S, r, t) >= 2) { tTh = t; break; }
        const pts = [1, 7, 30, 90, 365].filter((t) => t <= cfg.tEnd);
        const rows = pts.map((t) => {
          const k = sim.series.t.findIndex((x) => x >= t);
          const sn = k >= 0 ? nb.series[k] : nb.series[nb.series.length - 1];
          return `<tr><td class="n">${t}</td><td class="n">${f(sn, 3)}</td><td class="n">${f(E.theis(P.Q, g.T, g.S, r, t), 3)}</td></tr>`;
        }).join('');
        const sEnd = nb.series[nb.series.length - 1];
        const Qmax = P.Q * 2 / sEnd;
        return [
          `<p>Abatimiento en el pozo del vecino: <b>${dias(nb.tLimit)}</b> hasta superar 2 m. Al cabo de un año llega a ${f(sEnd)} m.</p>`,
          `${M(`s(r,t) = \\frac{Q}{4\\pi T}\\,W(u),\\qquad u = \\frac{r^2 S}{4Tt} = \\frac{${tx(r, 0)}^2\\times ${tx(g.S, 2)}}{4\\times ${tx(g.T, 0)}\\,t}`)}<div class="table-wrap"><table class="data"><thead><tr><th>t [días]</th><th>s numérico [m]</th><th>s Theis [m]</th></tr></thead><tbody>${rows}</tbody></table></div><p>Theis predice ${dias(tTh)} para s = 2 m. Las dos soluciones coinciden mientras el cono no llega a los bordes de nivel fijo; después el modelo numérico se estabiliza porque los bordes aportan agua (Theis supone un acuífero infinito).</p>`,
          `<p>El abatimiento es proporcional al caudal (la ecuación es lineal), así que basta escalar: ${M(`Q_{máx} = Q\\,\\frac{s_{adm}}{s(Q)} = ${tx(P.Q, 0)}\\times\\frac{2}{${tx(sEnd, 3)}} = ${tx(Qmax, 0)}\\ \\text{m}^3/\\text{día}`)}<p>Alternativa: alejar el pozo municipal o bombear en horario alterno.</p>`,
        ];
      },
    },
    /* ------------------------------------------------------------ */
    {
      id: 'p3', tag: 'Poza', title: 'Poza de oxidación junto a un barrio',
      cfg: () => base({
        Lx: 1000, Ly: 1000, dx: 20, K: 5, b: 20, S: 0.15, depth0: 2.5, tEnd: 1095,
        bc: { west: 'fijo', east: 'fijo', south: 'fijo', north: 'fijo' },
        elements: [poza('Poza de oxidación', 300, 420, 420, 500, 0.06),
          casa('Casa A', 470, 460, 1.2), casa('Casa B', 520, 380, 1.2), casa('Casa C', 600, 460, 1.2), casa('Casa D', 700, 520, 1.2), casa('Posta médica', 560, 600, 1.5)],
      }),
      statement: `<p>Una poza de oxidación sin revestir de 120 m × 80 m infiltra <b>0,06 m/día</b> (6 cm diarios). A 50–300 m hay viviendas con cimentación a 1,2 m y una posta médica (1,5 m). Suelo arena limosa a fina, K = 5 m/día, b = 20 m, S<sub>y</sub> = 0,15. Nivel freático a 2,5 m. Bordes lejanos de nivel fijo.</p>`,
      questions: ['¿Qué viviendas tendrán agua en la cimentación y cuándo?', '¿Cuánta agua pierde la poza por día?', '¿Basta colocar una geomembrana (reduce la infiltración 99 %)?'],
      solve(ctx) {
        const { sim, st, cfg } = ctx;
        const P = cfg.elements.find((e) => e.type === 'poza');
        const A = Math.abs((P.x2 - P.x1) * (P.y2 - P.y1));
        const mem = clone(cfg); mem.elements.find((e) => e.type === 'poza').membrane = true;
        const v = runVariant(mem);
        return [
          `${housesTable(sim, st)}`,
          `${M(`Q_{poza} = i\\,A = ${tx(P.inf, 2)}\\times ${tx(A, 0)} = ${tx(P.inf * A, 0)}\\ \\text{m}^3/\\text{día}`)}<p>Bajo la poza se forma un montículo que se extiende en todas direcciones; las casas más cercanas reciben el agua primero.</p>`,
          `<p>Con geomembrana la infiltración baja a ${f(P.inf * A * 0.01, 1)} m³/día. Casas afectadas: <b>${countHit(v.sim)}</b> (antes ${countHit(sim)}). ${countHit(v.sim) === 0 ? 'La geomembrana resuelve el problema.' : 'Aun así hay afectación.'}</p>`,
        ];
      },
    },
    /* ------------------------------------------------------------ */
    {
      id: 'p4', tag: 'Fosa', title: 'Fosa de cimentación con pozos de abatimiento',
      cfg: () => base({
        Lx: 600, Ly: 600, dx: 10, K: 20, b: 20, S: 0.15, depth0: 2, tEnd: 30,
        bc: { west: 'fijo', east: 'fijo', south: 'fijo', north: 'fijo' },
        elements: [fosa('Fosa del edificio', 280, 280, 320, 320, 6),
          pozo('Pozo 1', 270, 270, 800, { depth: 18 }), pozo('Pozo 2', 330, 270, 800, { depth: 18 }),
          pozo('Pozo 3', 270, 330, 800, { depth: 18 }), pozo('Pozo 4', 330, 330, 800, { depth: 18 })],
      }),
      statement: `<p>Para el sótano de un edificio se excavará una fosa de 40 m × 40 m hasta <b>6 m</b> de profundidad. El nivel freático está a 2 m, así que hay que bajarlo 4,5 m (fondo + 0,5 m de margen) con cuatro pozos en las esquinas. Acuífero: arena gruesa a fina, K = 20 m/día, b = 20 m, S<sub>y</sub> = 0,15. Bordes de nivel fijo a 300 m. Cada pozo bombea 800 m³/día.</p>`,
      questions: ['¿En cuántos días queda seca la fosa con 800 m³/día por pozo?', '¿Cuál es el caudal mínimo por pozo para lograrlo en el estado final?', '¿Por qué el abatimiento en el centro es mayor que el de un solo pozo?'],
      solve(ctx) {
        const { sim, st, cfg } = ctx;
        const F = Object.values(sim.mon.fosa)[0];
        const g = sim.g;
        const sNeed = g.h0 - F.target;
        // superposición: abatimiento estacionario en la fosa es lineal en Q
        let sMax = 0;
        if (st.exists) { let mx = -Infinity; for (const k of F.nodes) mx = Math.max(mx, st.h[k]); sMax = g.h0 - mx; }
        const Q = cfg.elements.find((e) => e.type === 'pozo').Q;
        const Qmin = Q * sNeed / Math.max(sMax, 1e-9);
        const r = Math.hypot(30, 30), Rinf = 300;
        const sOne = Q / (2 * Math.PI * g.T) * Math.log(Rinf / r);
        return [
          `<p>${F.tDry !== null ? `La fosa queda seca a los <b>${dias(F.tDry)}</b> de bombeo.` : `Con ${f(Q, 0)} m³/día por pozo la fosa <b>no</b> queda seca en ${f(cfg.tEnd, 0)} días: el punto más alto del agua dentro de la fosa queda en ${f(g.zg - F.h)} m de profundidad y hacen falta ${f(F.el.depth + (F.el.margin ?? 0.5))} m.`}</p>`,
          `<p>En estacionario el abatimiento mínimo dentro de la fosa es ${f(sMax)} m y se necesitan ${f(sNeed)} m. Como la ecuación es lineal, el abatimiento crece en proporción al caudal:</p>${M(`Q_{mín} = Q\\,\\frac{s_{req}}{s(Q)} = ${tx(Q, 0)}\\times\\frac{${tx(sNeed, 2)}}{${tx(sMax, 2)}} = ${tx(Qmin, 0)}\\ \\text{m}^3/\\text{día por pozo}`)}<p>Pruébelo: seleccione cada pozo, cambie Q a ${f(Math.ceil(Qmin / 50) * 50, 0)} y simule.</p>`,
          `<p>Los conos de abatimiento se suman (superposición). Con Thiem, un solo pozo a ${f(r, 0)} m del centro produce ≈ ${f(sOne)} m; cuatro pozos simétricos producen ≈ ${f(4 * sOne)} m.</p>${M(`s \\approx \\sum_{i=1}^{4}\\frac{Q}{2\\pi T}\\ln\\frac{R}{r_i}`)}`,
        ];
      },
    },
    /* ------------------------------------------------------------ */
    {
      id: 'p5', tag: 'Dren', title: 'Dren de intercepción para salvar la urbanización',
      cfg: () => base({
        Lx: 2000, Ly: 1200, dx: 50, K: 10, b: 15, S: 0.1, depth0: 4, tEnd: 3650,
        elements: [canal(300, 0, 300, 1200, 0.35, { name: 'Canal de riego' }), dren(500, 0, 500, 1200, 4.0, { name: 'Dren de intercepción' }),
          casa('Casa 1', 700, 300), casa('Casa 2', 700, 600), casa('Casa 3', 700, 900), casa('Casa 4', 1000, 450), casa('Casa 5', 1000, 750), casa('Colegio', 1500, 600, 2.0)],
      }),
      statement: `<p>Es el mismo canal del Problema 1, pero en lugar de revestirlo se construye un <b>dren de intercepción</b> en x = 500 m, a 4 m de profundidad (la cota del nivel freático natural), entre el canal y las casas. El dren sólo capta agua cuando el nivel freático sube por encima de su cota; no la devuelve.</p>`,
      questions: ['¿Quedan protegidas las casas?', '¿Cuánta agua capta el dren?', '¿En qué se diferencia de revestir el canal?'],
      solve(ctx) {
        const { sim, st, cfg } = ctx;
        const q = cfg.elements.find((e) => e.type === 'canal').q;
        return [
          `${housesTable(sim, st)}<p>Casas afectadas: <b>${countHit(sim)}</b> (sin dren eran varias; compare con el Problema 1).</p>`,
          `<p>Caudal captado por el dren: ${f(sim.series.drain[sim.series.drain.length - 1], 0)} m³/día al final del horizonte y ${st.exists ? f(st.drainQ, 0) : '—'} m³/día en estacionario. El canal aporta ${f(q * cfg.Ly, 0)} m³/día; lo que no capta el dren sigue hacia la quebrada.</p>`,
          `<p>El revestimiento reduce lo que entra (ataca la causa). El dren no cambia lo que entra, sólo cambia a dónde va el agua (ataca la consecuencia) y además genera un caudal que hay que evacuar. Bajo el canal el montículo sigue existiendo.</p>`,
        ];
      },
    },
    /* ------------------------------------------------------------ */
    {
      id: 'p6', tag: 'Lluvia', title: 'Recarga por lluvia entre dos quebradas',
      cfg: () => base({
        Lx: 2000, Ly: 600, dx: 25, K: 10, b: 20, S: 0.1, depth0: 3, tEnd: 1825,
        bc: { west: 'impermeable', east: 'impermeable', south: 'impermeable', north: 'impermeable' },
        rain: { R: 250, seasonal: false },
        elements: [rio('Quebrada oeste', 0, 0, 0, 600), rio('Quebrada este', 2000, 0, 2000, 600),
          casa('Casa 1', 500, 300), casa('Casa 2', 1000, 300), casa('Casa 3', 1500, 300), casa('Casa 4', 200, 300)],
      }),
      statement: `<p>Un terreno de 2 km entre dos quebradas recibe una recarga neta por lluvia de <b>250 mm/año</b>. El nivel freático inicial coincide con el de las quebradas, a 3 m de profundidad. Acuífero K = 10 m/día, b = 20 m (T = 200 m²/día), S<sub>y</sub> = 0,10. Las casas tienen la cimentación a 1,5 m.</p>`,
      questions: ['¿Cuánto sube el nivel freático en el centro y qué casas se afectan?', 'Verifique con la solución analítica.', '¿Qué cambia si la lluvia se concentra entre octubre y abril?'],
      solve(ctx) {
        const { sim, st, cfg } = ctx;
        const g = sim.g, R = cfg.rain.R / 1000 / 365, L = cfg.Lx;
        const hmax = E.rainMound(R, g.T, L, L / 2);
        let num = null;
        if (st.exists) num = E.interp(st.g, st.h, L / 2, cfg.Ly / 2) - g.h0;
        const seas = clone(cfg); seas.rain.seasonal = true;
        const v = runVariant(seas);
        const c2 = Object.values(v.sim.mon.casa).find((m) => m.el.name === 'Casa 2');
        return [
          `${housesTable(sim, st)}`,
          `${M(`h(x) - h_0 = \\frac{R}{2T}\\,x\\,(L-x),\\qquad \\Delta h_{máx} = \\frac{R L^2}{8T} = \\frac{${tx(R, 6)}\\times ${tx(L, 0)}^2}{8\\times ${tx(g.T, 0)}} = ${tx(hmax, 3)}\\ \\text{m}`)}<p>El modelo numérico da ${f(num, 3)} m en el centro (error ${num === null ? '—' : f(Math.abs(num - hmax) * 1000, 1)} mm). El tiempo característico es ${M(`\\tau \\approx \\frac{S L^2}{\\pi^2 T} = ${tx(g.S * L * L / (Math.PI ** 2 * g.T), 0)}\\ \\text{días}`)}</p>`,
          `<p>Con lluvia estacional el promedio anual es el mismo, pero el nivel oscila: sube en temporada de lluvias y baja en estiaje. Casa 2 llega a una profundidad mínima de ${f(g.zg - c2.maxH)} m (con lluvia uniforme: ${f(g.zg - Object.values(sim.mon.casa).find((m) => m.el.name === 'Casa 2').maxH)} m). Casas afectadas con lluvia estacional: <b>${countHit(v.sim)}</b>. El pico importa más que el promedio.</p>`,
        ];
      },
    },
    /* ------------------------------------------------------------ */
    {
      id: 'p7', tag: 'Río', title: 'Crecida del río y viviendas ribereñas',
      cfg: () => base({
        Lx: 1000, Ly: 600, dx: 10, K: 15, b: 10, S: 0.2, depth0: 2.5, tEnd: 90,
        bc: { west: 'impermeable', east: 'fijo', south: 'impermeable', north: 'impermeable' },
        elements: [rio('Río Mashcón', 0, 0, 0, 600, { flood: { on: true, peak: 2.5, tStart: 5, rise: 5, fall: 25 } }),
          casa('Casa a 40 m', 40, 300, 1.2), casa('Casa a 100 m', 100, 300, 1.2), casa('Casa a 200 m', 200, 300, 1.2), casa('Casa a 400 m', 400, 300, 1.2)],
      }),
      statement: `<p>En temporada de lluvias el río sube <b>2,5 m</b> en 5 días (a partir del día 5) y vuelve a su nivel en 25 días. Las viviendas a 40, 100, 200 y 400 m del río tienen cimentación a 1,2 m; el nivel freático normal está a 2,5 m. Acuífero aluvial: K = 15 m/día, b = 10 m, S<sub>y</sub> = 0,20.</p>`,
      questions: ['¿Qué casas reciben agua en la cimentación?', '¿Con cuánto retraso llega el pico a cada casa y cuánto se atenúa?', '¿Por qué una crecida corta afecta menos que una larga del mismo nivel?'],
      solve(ctx) {
        const { sim, cfg } = ctx;
        const g = sim.g;
        const fl = cfg.elements.find((e) => e.type === 'rio').flood;
        const tPeak = fl.tStart + fl.rise;
        const rows = Object.values(sim.mon.casa).map((m) => `<tr><td>${m.el.name}</td><td class="n">${f(m.maxH - g.h0)} m</td><td class="n">${f(100 * (m.maxH - g.h0) / fl.peak, 0)} %</td><td class="n">${f(m.tMax - tPeak, 1)} días</td><td class="n">${dias(m.tHit)}</td></tr>`).join('');
        const D = g.D;
        return [
          `${housesTable(sim, null)}`,
          `<div class="table-wrap"><table class="data"><thead><tr><th>Casa</th><th>Ascenso máximo</th><th>% del pico del río</th><th>Retraso del pico</th><th>Agua en cimentación</th></tr></thead><tbody>${rows}</tbody></table></div><p>La onda se difunde con D = T/S = ${f(D, 0)} m²/día: la distancia de penetración en un tiempo t es del orden de ${M(`x \\sim \\sqrt{4Dt} = \\sqrt{4\\times ${tx(D, 0)}\\times ${tx(fl.rise + fl.fall, 0)}} \\approx ${tx(Math.sqrt(4 * D * (fl.rise + fl.fall)), 0)}\\ \\text{m}`)}</p>`,
          `<p>El acuífero actúa como filtro de paso bajo: una crecida corta no da tiempo a que el agua penetre lejos (almacenamiento en las riberas). Cambie la duración de la crecida en las propiedades del río y vuelva a simular.</p>`,
        ];
      },
    },
    /* ------------------------------------------------------------ */
    {
      id: 'p8', tag: 'Libre', title: 'Laboratorio libre: diseñe su propio escenario',
      cfg: () => base({
        Lx: 1500, Ly: 1000, dx: 25, K: 8, b: 15, S: 0.12, depth0: 3, tEnd: 730,
        bc: { west: 'fijo', east: 'fijo', south: 'impermeable', north: 'impermeable' },
        elements: [canal(200, 0, 600, 1000, 0.5), casa('Casa 1', 900, 500), pozo('Pozo', 1200, 300, 300)],
      }),
      statement: `<p>Use las herramientas de la izquierda para colocar casas, canales, pozos, pozas, drenes, ríos y fosas. Cambie el suelo y los bordes. Puede modificar los elementos mientras la simulación corre: encienda un pozo o revista un canal y vea la respuesta.</p>`,
      questions: ['¿Qué edificaciones se afectan y cuándo?'],
      solve(ctx) { return [housesTable(ctx.sim, ctx.st)]; },
    },
  ];

  root.SimProblems = { PROBLEMS, runVariant, factories: { casa, canal, pozo, poza, dren, rio, fosa }, newId: id };
})(typeof window !== 'undefined' ? window : globalThis);
