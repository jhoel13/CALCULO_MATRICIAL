/*
 * Contenido dinámico: fórmulas con valores sustituidos y desarrollo paso a paso.
 * Todo se genera como HTML con TeX (MathJax) a partir del objeto de resultados R.
 */
(function (root) {
  'use strict';
  const { fmt, fmtg, tex: t, days, esc } = root.F;

  const M = (s) => `<div class="math">\\[${s}\\]</div>`;
  const im = (s) => `\\(${s}\\)`;
  const block = (title, body, tag) =>
    `<section class="block">${tag ? `<p class="step-tag">${tag}</p>` : ''}<h3>${title}</h3>${body}</section>`;
  const callout = (body, cls = '') => `<div class="callout ${cls}">${body}</div>`;
  const table = (head, rows) =>
    `<div class="table-wrap"><table class="data"><thead><tr>${head.map((h) => `<th>${h}</th>`).join('')}</tr></thead><tbody>${rows
      .map((r) => `<tr>${r.map((c) => (typeof c === 'object' && c && c.n !== undefined ? `<td class="n">${c.n}</td>` : `<td>${c}</td>`)).join('')}</tr>`)
      .join('')}</tbody></table></div>`;
  const N = (v) => ({ n: v });

  const SIDE = { west: 'Oeste (x = 0)', east: 'Este (x = L_x)', south: 'Sur / base (y = 0)', north: 'Norte / corona (y = L_y)' };
  const SIDE_TEX = (p) => ({ west: 'x=0', east: `x=${t(p.Lx)}`, south: 'y=0', north: `y=${t(p.Ly)}` });

  function features(p) {
    const line = (p.sources || []).find((s) => s.enabled && s.type === 'line');
    const point = (p.sources || []).find((s) => s.enabled && s.type === 'point');
    const sides = ['west', 'east', 'south', 'north'];
    const rampSide = sides.find((s) => p.bc[s].type === 'ramp');
    return { line, point, rampSide, drain: p.drain && p.drain.enabled, sides };
  }

  function bcTex(p, side) {
    const b = p.bc[side], at = SIDE_TEX(p)[side];
    const n = side === 'west' || side === 'east' ? 'x' : 'y';
    const arg = side === 'west' || side === 'east' ? `(${at.split('=')[1]},y,t)` : `(x,${at.split('=')[1]},t)`;
    if (b.type === 'neumann') return `\\left.\\dfrac{\\partial h}{\\partial ${n}}\\right|_{${at}} = 0`;
    if (b.type === 'dirichlet') return `h${arg} = ${t(b.value)}\\ \\text{m}`;
    const slope = (b.h2 - b.h1) / b.tf;
    return `h${arg} = \\begin{cases} ${t(b.h1)} + \\dfrac{${t(b.h2)}-${t(b.h1)}}{${t(b.tf)}}\\,t = ${t(b.h1)} + ${t(slope, 4)}\\,t, & 0 \\le t \\le ${t(b.tf)}\\ \\text{días} \\\\ ${t(b.h2)}, & t > ${t(b.tf)}\\ \\text{días}\\end{cases}`;
  }
  const bcKind = (b) => (b.type === 'neumann' ? 'Neumann (sin flujo)' : b.type === 'dirichlet' ? 'Dirichlet constante' : 'Dirichlet variable en el tiempo');

  /* ======================= FÓRMULAS ======================= */
  function formulas(R) {
    const { p, m } = R; const sp = R.spectral;
    const fe = features(p);
    const D = m.D;
    const out = [];

    out.push(block('Ley de Darcy y balance de masa',
      `<p>El agua se mueve de carga alta a carga baja. Darcy lo cuantifica con el caudal por unidad de ancho q [m²/día]:</p>
      ${M(`q_x = -T\\,\\frac{\\partial h}{\\partial x},\\qquad q_y = -T\\,\\frac{\\partial h}{\\partial y}`)}
      <p>Balance en un volumen de control ${im('\\Delta x\\times\\Delta y')}: acumulación = entra − sale + fuente interior.</p>
      ${M(`S\\,\\frac{\\partial h}{\\partial t}\\,\\Delta x\\,\\Delta y = \\big[q_x(x)-q_x(x+\\Delta x)\\big]\\Delta y + \\big[q_y(y)-q_y(y+\\Delta y)\\big]\\Delta x + Q_s\\,\\Delta x\\,\\Delta y`)}
      <p>Al dividir entre ${im('\\Delta x\\Delta y')}, tomar el límite y sustituir Darcy con T constante:</p>
      ${M(`\\boxed{\\,S\\,\\frac{\\partial h}{\\partial t} = T\\left(\\frac{\\partial^2 h}{\\partial x^2}+\\frac{\\partial^2 h}{\\partial y^2}\\right) + Q_s(x,y)\\,}`)}`,
      'Sesión 2 · Ecuación general'));

    // Ecuación del escenario
    let src;
    if (fe.line && fe.point) src = `Q_s(x,y)\\ \\text{(canal + pozo)}`;
    else if (fe.line || fe.point) src = 'Q_s(x,y)';
    else src = '0';
    out.push(block('Ecuación del escenario con sus datos',
      `${M(`${t(p.S)}\\,\\frac{\\partial h}{\\partial t} = ${t(p.T)}\\,\\nabla^2 h ${src === '0' ? '' : '+ ' + src}
        \\quad\\Longleftrightarrow\\quad \\frac{\\partial h}{\\partial t} = D\\,\\nabla^2 h ${src === '0' ? '' : '+ \\frac{Q_s}{S}'},\\qquad D=\\frac{T}{S}=\\frac{${t(p.T)}}{${t(p.S)}} = ${t(D)}\\ \\text{m}^2/\\text{día}`)}
      <p>Verificación dimensional: ${im('[\\partial h/\\partial t]=\\text{m/día}')}, ${im('[T\\nabla^2 h] = \\text{m}^2/\\text{día}\\cdot 1/\\text{m} = \\text{m/día}')}, ${im('[Q_s] = \\text{m/día}')} y S adimensional. Ambos lados miden lo mismo.</p>`,
      'Paso 3 · EDP transitoria'));

    // Término fuente
    let srcBody = '';
    if (fe.line) {
      const si = m.sourceInfo.find((s) => s.type === 'line');
      srcBody += `<p><b>Fuente lineal (canal).</b> El dato es un caudal por metro de canal, q<sub>inf</sub>. Se reparte en el ancho de la celda Δx porque el canal ya varía a lo largo de y:</p>
      ${M(`Q_s(x,y) = \\begin{cases}\\dfrac{q_{inf}}{\\Delta x} = \\dfrac{${t(fe.line.q)}}{${t(p.dx)}} = ${t(si.Qs)}\\ \\text{m/día}, & x = ${t(si.x)}\\ \\text{m}\\ (i=${si.i}) \\\\ 0, & \\text{en otro punto}\\end{cases}`)}`;
      if (fe.line.lining && fe.line.lining.enabled)
        srcBody += callout(`<p>Revestimiento activo entre y = ${fmt(fe.line.lining.y1, 0)} y ${fmt(fe.line.lining.y2, 0)} m con eficiencia ${fmt(fe.line.lining.eff, 0)} %: ahí ${im(`Q_s = ${t(si.Qs)}\\,(1-${t(fe.line.lining.eff / 100)}) = ${t(si.Qs * (1 - fe.line.lining.eff / 100))}`)} m/día.</p>`, 'clay');
    }
    if (fe.point) {
      const si = m.sourceInfo.find((s) => s.type === 'point');
      srcBody += `<p><b>Fuente puntual (pozo).</b> Concentrada en un nodo: se divide entre el área completa de la celda. ${fe.point.Q < 0 ? 'Negativa porque sale agua (bombeo).' : 'Positiva porque entra agua.'}</p>
      ${M(`Q_s(x_i,y_j) = \\frac{Q}{\\Delta x\\,\\Delta y} = \\frac{${t(fe.point.Q)}}{${t(p.dx)}\\times ${t(p.dy)}} = ${t(si.Qs)}\\ \\text{m/día}\\quad (i=${si.i},\\ j=${si.j})`)}`;
    }
    if (!fe.line && !fe.point)
      srcBody = `<p>El agua no aparece ni desaparece dentro del dominio: entra y sale sólo por los bordes. Por el balance de masa:</p>${M('Q_s(x,y) = 0 \\quad\\text{en todo el interior}')}
      ${callout('<p>Todo el forzamiento está en las condiciones de frontera. Representar el llenado como un término fuente sería físicamente incorrecto (Error 2 de la Sesión 2).</p>', 'clay')}`;
    if (fe.drain) srcBody += callout(`<p><b>Dren de intercepción</b> en x = ${fmt(m.drain.x, 0)} m (columna i = ${m.drain.i}): se modela como nodos Dirichlet interiores con ${im(`h = ${t(p.drain.h)}`)} m. Cambia a dónde va el agua, no cuánta entra.</p>`);
    out.push(block('Término fuente', srcBody, 'Pasos 1 y 2'));

    // Condiciones de frontera
    const sideT = SIDE_TEX(p);
    out.push(block('Condiciones de frontera',
      table(['Borde', 'Tipo', 'Condición'], fe.sides.map((s) => [esc(p.bc[s].label || SIDE[s]), bcKind(p.bc[s]), `\\(${bcTex(p, s)}\\)`])) +
      `<p>Condición inicial: ${im(`h(x,y,0) = ${t(p.h0)}\\ \\text{m}`)} en todo el dominio (hipótesis declarada, Sesión 3).</p>` +
      `<p>Neumann equivale a borde impermeable porque, por Darcy, ${im('q_n = -T\\,\\partial h/\\partial n = 0')}.</p>`,
      'Paso 4'));

    // Estacionaria
    const fVals = fe.line ? `f = \\frac{Q_s}{T} = \\frac{${t(m.sourceInfo.find((s) => s.type === 'line').Qs)}}{${t(p.T)}} = ${t(m.sourceInfo.find((s) => s.type === 'line').Qs / p.T)}\\ \\text{m}^{-1}` : '';
    out.push(block('Ecuación estacionaria',
      `${M(`\\frac{\\partial h}{\\partial t}=0\\ \\Longrightarrow\\ \\nabla^2 h = -\\frac{Q_s}{T} = -f ${fe.line || fe.point ? '\\quad\\text{(Poisson)}' : '= 0\\quad\\text{(Laplace)}'}`)}
      ${fVals ? M(fVals) : ''}
      <p>${fe.rampSide ? `La frontera variable se reemplaza por su valor final ${im(`h = ${t(p.bc[fe.rampSide].h2)}`)} m: el estacionario supone que el embalse ya dejó de cambiar.` : 'Las condiciones de frontera son las mismas que en el transitorio; sólo desaparece el término de acumulación.'}</p>`,
      'Paso 5'));

    // FTCS
    const rx = R.rx, ry = R.ry;
    out.push(block('Esquema FTCS (transitorio)',
      `<p>Laplaciano con el estencil de cinco puntos (error ${im('O(\\Delta x^2)')}) y derivada temporal hacia adelante:</p>
      ${M(`\\nabla^2 h\\big|_{i,j} \\approx \\frac{h_{i+1,j}-2h_{i,j}+h_{i-1,j}}{\\Delta x^2} + \\frac{h_{i,j+1}-2h_{i,j}+h_{i,j-1}}{\\Delta y^2}`)}
      ${M(`h^{n+1}_{i,j} = h^n_{i,j} + r_x\\big(h^n_{i+1,j}-2h^n_{i,j}+h^n_{i-1,j}\\big) + r_y\\big(h^n_{i,j+1}-2h^n_{i,j}+h^n_{i,j-1}\\big) + \\frac{\\Delta t}{S}Q_{s,i,j}`)}
      ${M(`r_x = \\frac{D\\,\\Delta t}{\\Delta x^2} = \\frac{${t(D)}\\times ${t(R.dt, 5)}}{${t(p.dx)}^2} = ${t(rx, 4)},\\qquad r_y = \\frac{D\\,\\Delta t}{\\Delta y^2} = ${t(ry, 4)}`)}
      ${fe.line ? M(`\\frac{\\Delta t}{S}Q_s = \\frac{${t(R.dt, 5)}}{${t(p.S)}}\\times ${t(lineQs(m))} = ${t(R.dt / p.S * lineQs(m))}\\ \\text{m por paso en la columna del canal}`) : ''}
      <p>Es explícito: cada nodo se actualiza con valores ya conocidos del nivel n. Error de truncamiento ${im('O(\\Delta t)+O(\\Delta x^2+\\Delta y^2)')}.</p>`,
      'Sesión 3'));

    // Estabilidad
    const ok = R.dt <= R.dtmax * (1 + 1e-12);
    out.push(block('Estabilidad de von Neumann',
      `${M(`g = 1 - 4r_x\\sin^2\\frac{\\xi\\Delta x}{2} - 4r_y\\sin^2\\frac{\\eta\\Delta y}{2},\\qquad |g|\\le 1 \\iff r_x + r_y \\le \\tfrac12`)}
      ${M(`\\Delta t_{máx} = \\frac{1}{2D\\left(\\frac{1}{\\Delta x^2}+\\frac{1}{\\Delta y^2}\\right)} = \\frac{1}{2\\times ${t(D)}\\left(\\frac{1}{${t(p.dx)}^2}+\\frac{1}{${t(p.dy)}^2}\\right)} = ${t(R.dtmax, 5)}\\ \\text{días}`)}
      ${M(`\\Delta t = ${t(p.dtFactor)}\\,\\Delta t_{máx} = ${t(R.dt, 5)}\\ \\text{días},\\qquad r_x + r_y = ${t(rx + ry, 4)},\\qquad N_{pasos} = \\frac{${t(p.tEnd)}}{${t(R.dt, 5)}} \\approx ${t(R.nSteps)}`)}
      ${callout(ok ? `<p>r<sub>x</sub> + r<sub>y</sub> = ${fmtg(rx + ry, 4)} ≤ 0,5: el esquema es estable.</p>` : `<p><b>Inestable:</b> r<sub>x</sub> + r<sub>y</sub> = ${fmtg(rx + ry, 4)} &gt; 0,5. Reduzca Δt por debajo de ${fmtg(R.dtmax, 5)} días.</p>`, ok ? 'good' : 'bad')}`,
      'Sesión 3 · Sección 4'));

    // Neumann
    out.push(block('Nodo fantasma en bordes Neumann',
      `${M(`\\left.\\frac{\\partial h}{\\partial x}\\right|_{0,j} \\approx \\frac{h_{1,j}-h_{-1,j}}{2\\Delta x} = 0 \\;\\Longrightarrow\\; h_{-1,j} = h_{1,j}`)}
      ${M(`h^{n+1}_{0,j} = h^n_{0,j} + 2r_x\\big(h^n_{1,j}-h^n_{0,j}\\big) + r_y\\big(h^n_{0,j+1}-2h^n_{0,j}+h^n_{0,j-1}\\big) + \\frac{\\Delta t}{S}Q_{s,0,j}`)}
      <p>En un vértice con dos bordes Neumann se duplican ambos términos. Olvidar el factor 2 hace que el borde deje pasar agua sin ningún aviso (Error 3).</p>`,
      'Sesión 3 · Sección 5'));

    // SOR
    out.push(block('Estado estacionario: Gauss-Seidel y SOR',
      `${M(`h_{i,j} = \\frac{w_x\\,(h_{i+1,j}+h_{i-1,j}) + w_y\\,(h_{i,j+1}+h_{i,j-1}) + f_{i,j}}{2\\,(w_x+w_y)},\\qquad w_x=\\tfrac{1}{\\Delta x^2}=${t(sp.wx)},\\ w_y=\\tfrac{1}{\\Delta y^2}=${t(sp.wy)}`)}
      ${M(`h^{(k+1)}_{i,j} = (1-\\omega)\\,h^{(k)}_{i,j} + \\omega\\,h^{GS}_{i,j},\\qquad 1<\\omega<2`)}
      ${M(`\\theta_x = ${thetaTex(sp.thetaX, m.Nx - 1)},\\quad \\theta_y = ${thetaTex(sp.thetaY, m.Ny - 1)},\\qquad \\rho_J = \\frac{w_x\\cos\\theta_x + w_y\\cos\\theta_y}{w_x+w_y} = ${t(sp.rhoJ, 5)}`)}
      ${M(`\\omega_{opt} = \\frac{2}{1+\\sqrt{1-\\rho_J^2}} = ${t(sp.omegaOpt, 3)},\\qquad \\rho_{GS}=\\rho_J^2 = ${t(sp.rhoGS, 5)},\\qquad \\rho_{SOR}=\\omega_{opt}-1 = ${t(sp.rhoSOR, 4)}`)}
      ${M(`k \\approx \\frac{\\ln(1/\\varepsilon)}{\\ln(1/\\rho)}\\;:\\quad k_{GS}\\approx ${t(Math.log(1 / p.tol) / Math.log(1 / sp.rhoGS), 0)},\\quad k_{SOR}\\approx ${t(Math.log(1 / p.tol) / Math.log(1 / sp.rhoSOR), 0)}\\quad(\\varepsilon = ${t(p.tol)})`)}
      ${callout(`<p>La fórmula de HT6, ${im('\\rho_J=\\tfrac12(\\cos\\tfrac{\\pi}{N_x}+\\cos\\tfrac{\\pi}{N_y})')}, supone Dirichlet en todo el contorno y da ${im(`\\omega = ${t(sp.omegaHT6, 3)}`)}. Converge, pero lejos del óptimo para estas fronteras.</p>`, 'clay')}`,
      'Sesión 3 · Sección 6'));

    // Costo
    const cF = m.N * R.nSteps, cS = m.N * R.steady.iterations;
    out.push(block('Costo comparado',
      table(['Método', 'Conteo', 'Actualizaciones de nodo', 'Qué entrega'], [
        ['FTCS', `${m.N} nodos × ${fmt(R.nSteps, 0)} pasos`, N(fmtg(cF)), 'Trayectoria completa h(x,y,t)'],
        [`SOR (ω = ${fmtg(R.omegaUsed, 3)})`, `${m.N} nodos × ${R.steady.iterations} iteraciones`, N(fmtg(cS)), 'Sólo el estado final'],
        ['Cociente FTCS/SOR', '', N(fmtg(cF / cS, 1)), ''],
      ]),
      'Sesión 3 · Sección 7'));
    return out.join('');
  }

  function lineQs(m) { const s = m.sourceInfo.find((x) => x.type === 'line'); return s ? s.Qs : 0; }

  function thetaTex(th, n) {
    if (th === 0) return '0\\ (\\text{Neumann–Neumann})';
    const k = Math.round(Math.PI / th / n);
    return k === 1 ? `\\pi/${n}\\ (\\text{Dirichlet–Dirichlet})` : `\\pi/${2 * n}\\ (\\text{Dirichlet–Neumann})`;
  }

  /* ======================= DESARROLLO ======================= */
  function development(R) {
    const { p, m } = R; const sp = R.spectral;
    const fe = features(p);
    const out = [];
    const c = m.counts;

    // Paso 1 · Física
    let phys;
    if (fe.rampSide) {
      phys = `<p>El embalse empuja agua a través del cuerpo poroso de la presa, del paramento de aguas arriba al de aguas abajo. No hay entrada ni salida interior: es un <b>forzamiento de frontera</b> que además cambia con el tiempo durante ${fmt(p.bc[fe.rampSide].tf, 0)} días de llenado.</p>
      <p>La carga interior siempre va detrás del embalse: el agua tarda en atravesar el material. El tiempo característico de difusión es ${im(`\\tau = L^2/D = ${t(p.Lx)}^2/${t(m.D)} = ${t(p.Lx * p.Lx / m.D, 3)}`)} días, comparable con el tiempo de llenado, así que el transitorio importa.</p>
      <p>La subpresión en la base (y = 0) es ${im('u = \\gamma_w\\,(h - y) = 9{,}81\\,h')} kPa. Si es excesiva reduce el peso efectivo del suelo y favorece deslizamiento y piping.</p>`;
    } else if (fe.line) {
      phys = `<p>El canal pierde agua de forma continua a lo largo de una <b>línea de recarga</b> (fuente interior positiva). Bajo el canal el nivel freático sube primero y forma el pico del montículo; luego la diferencia de carga empuja el agua lateralmente y el montículo se ensancha hacia el borde este.</p>
      <p>El montículo no crece para siempre: la salida por el borde este (dren natural, nivel fijo) crece con el gradiente hasta igualar la entrada. Allí el sistema llega a su destino final. T decide qué tan lejos llega; S decide qué tan rápido.</p>`;
    } else if (fe.point) {
      phys = `<p>El pozo extrae agua en un punto (fuente interior negativa) y forma un cono de abatimiento que se extiende hasta que los bordes de nivel fijo (ríos) aportan lo que se bombea.</p>`;
    } else phys = '<p>Escenario sin fuente interior: el flujo lo controlan los bordes.</p>';
    out.push(block('Significado físico', phys, 'Paso 1 · Sesión 1'));

    out.push(block('Ecuación, fuente y fronteras',
      `${M(`${t(p.S)}\\,\\frac{\\partial h}{\\partial t} = ${t(p.T)}\\,\\nabla^2 h + Q_s(x,y),\\qquad D = ${t(m.D)}\\ \\text{m}^2/\\text{día}`)}
      ${fe.line ? M(`Q_s = \\frac{${t(fe.line.q)}}{${t(p.dx)}} = ${t(m.sourceInfo.find((s) => s.type === 'line').Qs)}\\ \\text{m/día en } x = ${t(m.sourceInfo.find((s) => s.type === 'line').x)}\\ \\text{m}`) : ''}
      ${fe.point ? M(`Q_s = \\frac{${t(fe.point.Q)}}{${t(p.dx)}\\cdot${t(p.dy)}} = ${t(m.sourceInfo.find((s) => s.type === 'point').Qs)}\\ \\text{m/día}`) : ''}
      ${!fe.line && !fe.point ? M('Q_s = 0') : ''}
      ${fe.sides.map((s) => M(bcTex(p, s))).join('')}
      ${M(`\\text{Estacionaria: }\\ \\nabla^2 h = ${fe.line || fe.point ? '-Q_s/T' : '0'}${fe.rampSide ? `,\\quad h|_{${SIDE_TEX(p)[fe.rampSide]}} = ${t(p.bc[fe.rampSide].h2)}` : ''}`)}`,
      'Pasos 2 a 5 · Sesión 2'));

    out.push(block('Malla y clasificación de nodos',
      `${M(`N_x \\times N_y = \\left(\\frac{${t(p.Lx)}}{${t(p.dx)}}+1\\right)\\times\\left(\\frac{${t(p.Ly)}}{${t(p.dy)}}+1\\right) = ${m.Nx}\\times ${m.Ny} = ${m.N}\\ \\text{nodos}`)}
      ${table(['Tipo de nodo', 'Cantidad', 'Regla'], [
        ['Dirichlet fijo', N(c.dirichlet), 'No se actualiza; conserva su valor'],
        ['Dirichlet variable', N(c.ramp), 'Se reasigna con g(t<sub>n+1</sub>) tras cada paso'],
        ['Dren (Dirichlet interior)', N(c.drain), 'Carga fija del dren'],
        ['Neumann simple', N(c.neumann), 'FTCS con nodo fantasma (factor 2)'],
        ['Neumann en vértice', N(c.vertex), 'Factor 2 en ambas direcciones'],
        ['Interior', N(c.interior), `FTCS completo${c.sourceNodes ? `; ${c.sourceNodes} nodos reciben Q<sub>s</sub>` : ''}`],
        ['<b>Total / actualizados</b>', N(`${c.total} / ${c.updated}`), ''],
      ])}`,
      'Paso 6 · Sesión 3'));

    out.push(block('Paso de tiempo y estabilidad',
      `${M(`\\Delta t_{máx} = ${t(R.dtmax, 5)}\\ \\text{días},\\quad \\Delta t = ${t(p.dtFactor)}\\,\\Delta t_{máx} = ${t(R.dt, 5)},\\quad r_x=${t(R.rx, 4)},\\ r_y = ${t(R.ry, 4)},\\quad N_{pasos} = ${R.nSteps}`)}
      ${R.ftcs.diverged ? callout(`<p><b>La simulación divergió</b> en el paso ${R.ftcs.diverged.step} (t = ${days(R.ftcs.diverged.t)}). Con Δt &gt; Δt<sub>máx</sub> el modo de mayor frecuencia se amplifica en cada paso.</p>`, 'bad') : callout(`<p>${R.nSteps} pasos estables, ${fmtg(R.ftcs.updates)} actualizaciones de nodo, ${fmt(R.ftcs.elapsed, 0)} ms en este navegador.</p>`, 'good')}`,
      'Paso 7 · Sesión 3'));

    out.push(block('Solución estacionaria (SOR)',
      `${table(['Método', 'ω', 'Iteraciones (tol ' + fmtg(p.tol) + ' m)'], [
        ['Gauss-Seidel', N('1'), N(R.gsIter)],
        ['SOR con ω de HT6', N(fmtg(sp.omegaHT6, 3)), N(R.ht6Iter)],
        ['SOR con ω óptimo para estas fronteras', N(fmtg(sp.omegaOpt, 3)), N(R.optIter)],
        [`<b>Usado en el cálculo</b> (${R.omegaMode})`, N(fmtg(R.omegaUsed, 3)), N(R.steady.iterations)],
      ])}
      <p>Residuo máximo final ${im(`|\\nabla^2 h + f|_{máx} = ${t(R.steady.residual)}`)} m⁻¹. ${R.steady.converged ? '' : '<span class="warn">No alcanzó la tolerancia en el máximo de iteraciones.</span>'}</p>`,
      'Paso 8 · Sesión 3'));

    out.push(block('Resultados en los puntos de control',
      table(['Punto', 'x, y [m]', 'h₀', `h(t = ${fmtg(R.ftcs.snapshots[R.ftcs.snapshots.length - 1].t, 1)} d)`, 'h estacionario', 'Cambio final', '% del estacionario', 'Máximo y su tiempo'],
        R.mons.map((mo) => [esc(mo.name), `${fmt(mo.x, 0)}, ${fmt(mo.y, 0)}`, N(fmt(mo.h0, 3)), N(fmt(mo.hEnd, 4)), N(fmt(mo.hSteady, 4)),
          N(fmt(mo.hEnd - mo.h0, 4)), N(mo.pct === null ? '—' : fmt(mo.pct, 1) + ' %'), N(`${fmt(mo.maxH, 4)} @ ${fmtg(mo.tMax, 1)} d`)])),
      'Paso 9 · Transitorio FTCS'));

    // Verificación
    let ver = '';
    if (R.analytic) ver += `<p>Existe solución analítica 1D: <code>${esc(R.analytic.label)}</code>. Error máximo del SOR: <b>${fmtg(R.analyticErr)}</b> m (dominado por la tolerancia, no por la malla).</p>`;
    const b = R.balance;
    ver += table(['Balance de masa estacionario', 'm³/día (por m de espesor ya incluido en T)'], [
      ['Entrada por fuentes interiores', N(fmtg(b.source, 4))],
      ['Entrada por bordes Dirichlet', N(fmtg(b.inflowBoundary, 4))],
      ['Salida por bordes Dirichlet', N(fmtg(b.outflowBoundary, 4))],
      ['Error de cierre', N(fmtg(b.errorPct, 3) + ' %')],
    ]);
    ver += `<p>Un cierre cercano a 0 % confirma que los bordes Neumann no dejan pasar agua y que la fuente tiene las unidades correctas.</p>`;
    out.push(block('Verificación', ver, 'Paso 10 · Sesión 4'));

    out.push(block('Interpretación y respuesta de ingeniería', interpretation(R), 'Paso 11 · Sesión 5'));
    out.push(block('Preguntas para la discusión en clase — respuestas', qa(R), 'Anexos 1, 2 y 3'));
    return out.join('');
  }

  function interpretation(R) {
    const { p, m } = R;
    const fe = features(p);
    const mt = R.metrics;
    let s = '';
    if (fe.rampSide) {
      s += `<p>La subpresión máxima en la base durante los ${fmt(p.tEnd, 0)} días simulados es <b>${fmt(mt.maxBaseH, 3)} m</b> de carga (≈ ${fmt(9.81 * mt.maxBaseH, 1)} kPa) en x = ${fmt(mt.maxBaseX, 0)} m, alcanzada a t = ${fmt(mt.maxBaseT, 1)} días. El estacionario en ese punto vale ${fmt(mt.maxBaseSteady, 3)} m.</p>`;
      s += `<p>Al terminar el llenado (t = ${fmt(p.bc[fe.rampSide].tf, 0)} días) el embalse está en ${fmt(p.bc[fe.rampSide].h2, 1)} m, pero en x = ${fmt(mt.lagX, 0)} m la carga es sólo ${fmt(mt.lagH, 3)} m frente a ${fmt(mt.lagSteady, 3)} m del estacionario: la presa todavía va <b>${fmt(mt.lagSteady - mt.lagH, 3)} m</b> por detrás. ${mt.overshoot ? '<b>Hay sobrepaso</b>: algún punto supera temporalmente su valor estacionario.' : 'No hay sobrepaso: en este caso el momento más cargado coincide con el final, pero sólo el transitorio permite saber cuándo se llega a él.'}</p>`;
      if (R.ftcs.exitSeries) s += `<p>Gradiente de salida en el pie de talud: máximo ${fmt(R.ftcs.exitMax, 3)} (t = ${fmt(R.ftcs.exitTMax, 1)} d). Con i<sub>crit</sub> = ${fmtg(p.iCrit || 1)}, el factor de seguridad frente a piping es <b>FS = ${fmt((p.iCrit || 1) / Math.max(R.ftcs.exitMax, 1e-12), 2)}</b> ${(p.iCrit || 1) / R.ftcs.exitMax >= 3 ? '(≥ 3, aceptable).' : '<span class="warn">(&lt; 3, revisar filtros o drenes).</span>'}</p>`;
      s += callout('<p>Conclusión: la ecuación estacionaria (Laplace) da el destino final, pero la pregunta de seguridad del primer llenado exige la trayectoria. Revise la curva de la base frente al embalse en la pestaña Resultados.</p>');
    } else if (p.limitRise != null) {
      const v = mt.target;
      if (v) {
        const word = fe.point && !fe.line ? 'abatimiento' : 'ascenso';
        s += `<p>En <b>${esc(v.name)}</b> (x = ${fmt(v.x, 0)} m) el ${word} a los ${fmt(p.tEnd, 0)} días es <b>${fmt(Math.abs(v.hEnd - v.h0), 4)} m</b>; el valor final (estacionario) es ${fmt(Math.abs(v.hSteady - v.h0), 4)} m. El límite es ${fmtg(p.limitRise)} m.</p>`;
        s += v.tExceed !== null
          ? callout(`<p><b>Se supera el límite</b> a los ${days(v.tExceed)}. Ese es el plazo real para actuar.</p>`, 'bad')
          : Math.abs(v.hSteady - v.h0) >= p.limitRise
            ? callout(`<p>No se supera dentro del horizonte simulado, <b>pero el estacionario sí lo supera</b>: el problema existe y llegará después de ${days(p.tEnd)}. Amplíe el horizonte para saber cuándo.</p>`, 'clay')
            : callout(`<p><b>No se supera el límite</b>, ni en el horizonte simulado ni en el estado final. ${v.t95 !== null ? `El 95 % del cambio final se alcanza a los ${days(v.t95)}.` : ''}</p>`, 'good');
      }
      if (fe.line) {
        const si = m.sourceInfo.find((s) => s.type === 'line');
        s += `<p>Comprobación con la solución 1D: en estacionario el gradiente al este del canal es ${im(`q_{inf}/T = ${t(fe.line.q)}/${t(p.T)} = ${t(fe.line.q / p.T)}`)}, así que el ascenso en x es ${im(`\\Delta h = \\frac{q_{inf}}{T}(L_x - x)`)}. En x = ${fmt(v ? v.x : 1500, 0)} m: ${im(`${t(fe.line.q / p.T)}\\times ${t(p.Lx - (v ? v.x : 1500))} = ${t(fe.line.q / p.T * (p.Lx - (v ? v.x : 1500)))}`)} m. Para llegar a ${fmtg(p.limitRise)} m haría falta ${im(`q_{inf} \\ge ${t(p.limitRise * p.T / (p.Lx - (v ? v.x : 1500)), 4)}`)} m³/día/m.</p>`;
        s += `<p><b>Medidas:</b> revestir el canal reduce lo que entra (ataca la causa); un dren de intercepción cambia a dónde va el agua (ataca la consecuencia). Compárelas en la pestaña Laboratorio.${si ? '' : ''}</p>`;
      }
    }
    return s || '<p>Ajuste los criterios en el panel para obtener una respuesta de ingeniería.</p>';
  }

  function qa(R) {
    const { p, m } = R;
    const fe = features(p);
    const items = [];
    const Q = (q, a) => items.push(`<details class="qa"><summary>${q}</summary>${a}</details>`);

    Q('¿Qué unidades tienen ∂h/∂t y T∇²h? ¿Coinciden?',
      `<p>${im('\\partial h/\\partial t')} es m/día. ${im('T\\nabla^2 h')}: m²/día × 1/m = m/día. Coinciden, y Q<sub>s</sub> también debe estar en m/día. Es la primera prueba de que la ecuación está bien planteada.</p>`);
    Q('¿Por qué ∂h/∂n = 0 es la traducción de “borde impermeable”?',
      `<p>Por Darcy, ${im('q_n = -T\\,\\partial h/\\partial n')}. Si el gradiente normal es cero, el caudal que cruza el borde es cero. Si no lo fuera, el modelo ganaría o perdería agua por un límite que físicamente no la deja pasar.</p>`);
    Q('Si Δx ≠ Δy, ¿cambia la ecuación diferencial?',
      '<p>No. La EDP es continua; Δx y Δy son decisiones de malla. Aparecen recién en la Sesión 3, en el estencil, en r<sub>x</sub>, r<sub>y</sub> y en la fórmula ponderada de SOR con w<sub>x</sub> = 1/Δx², w<sub>y</sub> = 1/Δy².</p>');
    {
      const r = root.Solver.ftcsNode({ D: 2500, dt: 0.9, dx: 100, dy: 100, S: 0.12, hC: 15, hE: 15.04, hW: 15.02, hN: 15.03, hS: 15.01 });
      Q('Nodo de control (Escenario 1, Δt = 0,9 días): calcule r<sub>x</sub>, r<sub>y</sub> y h<sup>n+1</sup>.',
        `${M(`r_x=r_y=\\frac{2500\\times0{,}9}{100^2}=${t(r.rx)},\\quad h^{n+1} = 15 + 0{,}225(15{,}04-30+15{,}02) + 0{,}225(15{,}03-30+15{,}01) = ${t(r.value, 4)}\\ \\text{m}`)}`);
    }
    if (fe.line || p.id === 'esc1') {
      Q('Si vierte agua sobre arena en un punto fijo, ¿el montículo crece para siempre?',
        `<p>No, si existe una salida. A medida que el montículo crece, crece el gradiente hacia el borde de nivel fijo y con él la salida. Cuando la salida iguala la entrada (${fe.line ? `${fmtg(fe.line.q)} × ${fmt(p.Ly, 0)} = ${fmtg(fe.line.q * p.Ly)} m³/día` : 'la recarga'}), el sistema se estabiliza. El balance de masa estacionario de este cálculo cierra con ${fmtg(R.balance.errorPct, 3)} % de error.</p>`);
      Q('¿Por qué el término fuente del canal se divide entre Δx y no entre ΔxΔy?',
        '<p>El canal es una línea: ya varía a lo largo de y y cada nodo de la columna recibe su aporte. Sólo hay que repartir el caudal por metro en el ancho Δx. El pozo es un punto y se reparte en el área ΔxΔy. Confundirlos es el error de unidades más común.</p>');
      Q('Si se reviste sólo la mitad del canal, ¿llega igual el montículo a las viviendas?',
        '<p>No con la misma intensidad. Bajo el tramo revestido casi no entra agua, y bajo el tramo libre el montículo se reparte también en dirección y hacia la zona revestida, así que llega más diluido. La ubicación importa porque el efecto se difunde desde donde ocurre la fuga. Pruébelo en el panel: active el revestimiento y elija y₁, y₂.</p>');
    }
    if (fe.rampSide || p.id === 'esc2') {
      const b = p.bc[fe.rampSide || 'west'];
      Q('¿Por qué Q<sub>s</sub> = 0 en todo el cuerpo de la presa?',
        '<p>Cada volumen de control interior conserva el agua que le entra por un lado y sale por el otro. El agua sólo entra por el paramento de aguas arriba y sale por el de aguas abajo, así que el forzamiento va en las condiciones de frontera.</p>');
      Q('Escriba h(0,y,t) para un llenado de 150 días desde 5 m hasta 22 m.',
        `${M('h(0,y,t)=\\begin{cases}5+\\dfrac{22-5}{150}\\,t = 5 + 0{,}1133\\,t, & 0\\le t\\le 150\\\\ 22, & t>150\\end{cases}')}<p>Cambian h₁, h₂ y t<sub>f</sub>; la estructura de rampa más meseta se conserva.</p>`);
      Q('Si el embalse se llenara en 900 días en vez de 90, ¿la subpresión máxima se parecería más al estacionario?',
        `<p>Sí. El tiempo de respuesta de la presa es ${im(`\\tau \\sim L^2/D = ${t(p.Lx * p.Lx / m.D, 3)}`)} días. Con 900 días de llenado el interior “alcanza” al embalse en cada instante (llenado cuasi-estacionario) y el retraso es pequeño. Con ${fmt(b.tf || 90, 0)} días el retraso es grande. La herramienta “Velocidad de llenado” del Laboratorio lo cuantifica.</p>`);
      Q('¿Por qué la subpresión no es “el nivel del embalse medido más abajo”?',
        '<p>El agua pierde carga al atravesar los poros. En estacionario la carga cae linealmente de aguas arriba a aguas abajo (Laplace 1D), así que en cualquier punto interior es menor que la del embalse. La diferencia mide la resistencia del material.</p>');
      Q('¿Por qué la fórmula de ω de HT6 no aplica tal cual?',
        `<p>Supone Dirichlet en los cuatro bordes. Aquí arriba y abajo son Neumann (θ<sub>y</sub> = 0) y en x es Dirichlet–Dirichlet (θ<sub>x</sub> = π/${m.Nx - 1}). Con el ω correcto (${fmtg(R.spectral.omegaOpt, 3)}) bastan ${R.optIter} iteraciones frente a ${R.ht6Iter} con el de HT6.</p>`);
    }
    Q('¿Por qué un forzamiento que cambia en el tiempo hace más difícil predecir el momento crítico?',
      '<p>Con forzamiento constante el sistema evoluciona monótonamente hacia un único destino. Con forzamiento variable el interior persigue un objetivo que se mueve; el estado más desfavorable puede ocurrir durante la transición y sólo se ve marchando en el tiempo.</p>');
    return items.join('');
  }

  const api = { formulas, development, features, M, im, block, callout, table };
  root.Content = api;
})(typeof window !== 'undefined' ? window : globalThis);
