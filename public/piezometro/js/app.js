/* Controlador de la interfaz: panel de datos, cálculo, pestañas, laboratorio y exportación. */
(function () {
  'use strict';
  const S = window.Solver, C = window.Charts, X = window.Exporters, Ct = window.Content;
  const { fmt, fmtg, days, esc } = window.F;
  const $ = (id) => document.getElementById(id);

  const state = { p: null, R: null, frame: 0, playing: null, tab: 't3d', exp: null, pdfUrl: null };

  /* ------------------------------------------------------------------ */
  /* Panel de parámetros                                                 */
  /* ------------------------------------------------------------------ */
  const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  function set(o, path, v) {
    const ks = path.split('.'); let a = o;
    for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]];
    a[ks[ks.length - 1]] = v;
  }
  const num = (path, label, opts = {}) =>
    `<label class="pfield${opts.full ? ' full' : ''}"><span>${label}</span><input id="p-${path.replace(/\./g, '-')}" data-path="${path}" type="number" step="any" ${opts.min !== undefined ? `min="${opts.min}"` : ''} value="${get(state.p, path) ?? ''}"></label>`;
  const txt = (path, label) =>
    `<label class="pfield"><span>${label}</span><input id="p-${path.replace(/\./g, '-')}" data-path="${path}" type="text" value="${esc(get(state.p, path))}"></label>`;
  const chk = (path, label) =>
    `<label class="pcheck"><input id="p-${path.replace(/\./g, '-')}" data-path="${path}" type="checkbox" ${get(state.p, path) ? 'checked' : ''}> ${label}</label>`;

  function sideFields(side, title) {
    const b = state.p.bc[side];
    const sel = `<label class="pfield"><span>Tipo</span><select id="p-bc-${side}-type" data-path="bc.${side}.type" data-rebuild="1">
      <option value="neumann"${b.type === 'neumann' ? ' selected' : ''}>Neumann</option>
      <option value="dirichlet"${b.type === 'dirichlet' ? ' selected' : ''}>Dirichlet</option>
      <option value="ramp"${b.type === 'ramp' ? ' selected' : ''}>Rampa g(t)</option></select></label>`;
    let extra = '';
    if (b.type === 'dirichlet') extra = num(`bc.${side}.value`, 'h [m]');
    if (b.type === 'ramp') extra = num(`bc.${side}.h1`, 'h₁ [m]') + num(`bc.${side}.h2`, 'h₂ [m]') + num(`bc.${side}.tf`, 't<sub>f</sub> [d]');
    return `<div class="pside"><span class="pside-title">${title}</span>${sel}${extra}</div>`;
  }

  function ensureDefaults(p) {
    for (const s of ['west', 'east', 'south', 'north']) {
      const b = p.bc[s];
      if (b.value === undefined) b.value = p.h0;
      if (b.h1 === undefined) b.h1 = p.h0;
      if (b.h2 === undefined) b.h2 = p.h0 + 10;
      if (b.tf === undefined) b.tf = 90;
    }
    p.omegaMode = p.omegaMode || 'optimo';
    p.omegaManual = p.omegaManual || 1.8;
    if (p.iCrit === undefined) p.iCrit = 1.0;
    while (p.monitors.length < 3) p.monitors.push({ name: `Punto ${p.monitors.length + 1}`, x: p.Lx / 2, y: p.Ly / 2 });
    return p;
  }

  function renderPanel() {
    const p = state.p;
    const li = p.sources.findIndex((s) => s.type === 'line');
    const pi = p.sources.findIndex((s) => s.type === 'point');
    const L = p.sources[li], P = p.sources[pi];
    let h = '';
    h += `<fieldset class="pgroup"><legend>Dominio y malla</legend><div class="pgrid">
      ${num('Lx', 'L<sub>x</sub> [m]', { min: 0 })}${num('Ly', 'L<sub>y</sub> [m]', { min: 0 })}
      ${num('dx', 'Δx [m]', { min: 0 })}${num('dy', 'Δy [m]', { min: 0 })}
      <div class="derived" id="d-mesh"></div></div></fieldset>`;
    h += `<fieldset class="pgroup"><legend>Medio poroso</legend><div class="pgrid">
      ${num('T', 'T [m²/día]', { min: 0 })}${num('S', 'S [–]', { min: 0 })}
      ${num('h0', 'h inicial h₀ [m]', { full: true })}
      <div class="derived" id="d-mat"></div></div></fieldset>`;
    h += `<fieldset class="pgroup"><legend>Condiciones de frontera</legend><div class="pgrid">
      ${sideFields('west', 'Oeste · x = 0')}${sideFields('east', `Este · x = L<sub>x</sub>`)}
      ${sideFields('south', 'Sur / base · y = 0')}${sideFields('north', 'Norte / corona · y = L<sub>y</sub>')}</div></fieldset>`;
    h += `<fieldset class="pgroup"><legend>Fuentes interiores</legend><div class="pgrid">
      ${chk(`sources.${li}.enabled`, 'Fuente lineal (canal)')}
      ${num(`sources.${li}.x`, 'x del canal [m]')}${num(`sources.${li}.q`, 'q<sub>inf</sub> [m³/día/m]')}
      ${chk(`sources.${li}.lining.enabled`, 'Revestir un tramo')}
      ${num(`sources.${li}.lining.y1`, 'desde y₁ [m]')}${num(`sources.${li}.lining.y2`, 'hasta y₂ [m]')}
      ${num(`sources.${li}.lining.eff`, 'eficiencia [%]', { full: true })}
      ${chk(`sources.${pi}.enabled`, 'Fuente puntual (pozo)')}
      ${num(`sources.${pi}.x`, 'x [m]')}${num(`sources.${pi}.y`, 'y [m]')}
      ${num(`sources.${pi}.Q`, 'Q [m³/día] (− = bombeo)', { full: true })}
      ${chk('drain.enabled', 'Dren de intercepción (h fija)')}
      ${num('drain.x', 'x del dren [m]')}${num('drain.h', 'h del dren [m]')}
      <div class="derived" id="d-src"></div></div></fieldset>`;
    h += `<fieldset class="pgroup"><legend>Transitorio · FTCS</legend><div class="pgrid">
      ${num('tEnd', 'Horizonte [días]', { min: 0 })}${num('dtFactor', 'Δt / Δt<sub>máx</sub>', { min: 0 })}
      ${num('frames', 'Cuadros 3D', { min: 2 })}
      <div class="derived" id="d-time"></div></div></fieldset>`;
    h += `<fieldset class="pgroup"><legend>Estacionario · SOR</legend><div class="pgrid">
      <label class="pfield"><span>Método / ω</span><select id="p-omegaMode" data-path="omegaMode">
        <option value="optimo"${p.omegaMode === 'optimo' ? ' selected' : ''}>SOR ω óptimo</option>
        <option value="HT6"${p.omegaMode === 'HT6' ? ' selected' : ''}>SOR ω de HT6</option>
        <option value="manual"${p.omegaMode === 'manual' ? ' selected' : ''}>SOR ω manual</option>
        <option value="gs"${p.omegaMode === 'gs' ? ' selected' : ''}>Gauss-Seidel (ω = 1)</option>
        <option value="jacobi"${p.omegaMode === 'jacobi' ? ' selected' : ''}>Jacobi</option></select></label>
      ${num('omegaManual', 'ω manual')}${num('tol', 'Tolerancia [m]', { full: true })}
      <div class="derived" id="d-sor"></div></div></fieldset>`;
    h += `<fieldset class="pgroup"><legend>Puntos de control y criterio</legend><div class="pgrid">
      ${p.monitors.map((m, k) => `${txt(`monitors.${k}.name`, `Punto ${k + 1}`)}<div class="pgrid">${num(`monitors.${k}.x`, 'x')}${num(`monitors.${k}.y`, 'y')}</div>`).join('')}
      ${num('limitRise', 'Límite |h − h₀| [m]')}${num('iCrit', 'i<sub>crit</sub> piping')}
      </div></fieldset>`;
    $('params').innerHTML = h;
    updateDerived();
  }

  function updateDerived() {
    const p = state.p;
    const Nx = Math.round(p.Lx / p.dx) + 1, Ny = Math.round(p.Ly / p.dy) + 1;
    const dtm = S.dtMax(p), dt = p.dtFactor * dtm, D = p.T / p.S;
    const rx = D * dt / p.dx ** 2, ry = D * dt / p.dy ** 2;
    const steps = Math.round(p.tEnd / dt);
    $('d-mesh').innerHTML = `N<sub>x</sub>×N<sub>y</sub> = <b>${Nx}×${Ny}</b> = ${Nx * Ny} nodos${p.dx !== p.dy ? ' · malla no cuadrada' : ''}`;
    $('d-mat').innerHTML = `D = T/S = <b>${fmtg(D, 4)}</b> m²/día · τ = L<sub>x</sub>²/D = ${fmtg(p.Lx * p.Lx / D, 4)} d`;
    const L = p.sources.find((s) => s.type === 'line'), P = p.sources.find((s) => s.type === 'point');
    $('d-src').innerHTML = [L && L.enabled ? `Q<sub>s</sub> canal = q/Δx = <b>${fmtg(L.q / p.dx)}</b> m/día` : '', P && P.enabled ? `Q<sub>s</sub> pozo = Q/(ΔxΔy) = <b>${fmtg(P.Q / (p.dx * p.dy))}</b> m/día` : '', !(L && L.enabled) && !(P && P.enabled) ? 'Q<sub>s</sub> = 0 en todo el dominio' : ''].filter(Boolean).join('<br>');
    $('d-time').innerHTML = `Δt<sub>máx</sub> = <b>${fmtg(dtm, 5)}</b> d · Δt = ${fmtg(dt, 5)} d<br>r<sub>x</sub> + r<sub>y</sub> = <b class="${rx + ry > 0.5 + 1e-12 ? 'warn' : ''}">${fmtg(rx + ry, 4)}</b> ${rx + ry > 0.5 + 1e-12 ? '&gt; 0,5 · inestable' : '≤ 0,5'} · ${fmt(steps, 0)} pasos<br>${fmtg(Nx * Ny * steps)} actualizaciones de nodo`;
    try {
      const sp = S.spectral(p);
      $('d-sor').innerHTML = `ρ<sub>J</sub> = ${fmtg(sp.rhoJ, 5)} · ω<sub>opt</sub> = <b>${fmtg(sp.omegaOpt, 4)}</b> · ω<sub>HT6</sub> = ${fmtg(sp.omegaHT6, 4)}`;
    } catch (e) { $('d-sor').textContent = ''; }
  }

  function validate(p) {
    const errs = [];
    if (!(p.Lx > 0 && p.Ly > 0)) errs.push('Las dimensiones deben ser positivas.');
    if (!(p.dx > 0 && p.dy > 0)) errs.push('Δx y Δy deben ser positivos.');
    if (!(p.T > 0 && p.S > 0)) errs.push('T y S deben ser positivos.');
    if (!(p.tEnd > 0)) errs.push('El horizonte debe ser positivo.');
    if (!(p.dtFactor > 0)) errs.push('Δt/Δt_máx debe ser positivo.');
    const Nx = Math.round(p.Lx / p.dx) + 1, Ny = Math.round(p.Ly / p.dy) + 1;
    if (Nx < 3 || Ny < 3) errs.push('La malla necesita al menos 3 nodos en cada dirección.');
    if (Nx * Ny > 250000) errs.push('Malla demasiado grande para el navegador (más de 250 000 nodos).');
    const steps = p.tEnd / (p.dtFactor * S.dtMax(p));
    if (Nx * Ny * steps > 4e8) errs.push(`El transitorio requiere ${fmtg(Nx * Ny * steps)} actualizaciones. Reduzca el horizonte o la malla.`);
    for (const s of ['west', 'east', 'south', 'north']) if (state.p.bc[s].type === 'ramp' && !(state.p.bc[s].tf > 0)) errs.push('t_f de la rampa debe ser positivo.');
    return errs;
  }

  /* ------------------------------------------------------------------ */
  /* Cálculo                                                             */
  /* ------------------------------------------------------------------ */
  function omegaFor(p, sp) {
    if (p.omegaMode === 'HT6') return { method: 'sor', omega: sp.omegaHT6, label: 'HT6' };
    if (p.omegaMode === 'manual') return { method: 'sor', omega: p.omegaManual, label: 'manual' };
    if (p.omegaMode === 'gs') return { method: 'gs', omega: 1, label: 'Gauss-Seidel' };
    if (p.omegaMode === 'jacobi') return { method: 'jacobi', omega: 1, label: 'Jacobi' };
    return { method: 'sor', omega: sp.omegaOpt, label: 'óptimo' };
  }

  function compute(p) {
    const m = S.buildModel(p);
    const dtmax = S.dtMax(p);
    const dt = p.dtFactor * dtmax;
    const sp = S.spectral(p);
    const ftcs = S.runFTCS(m, { dt, tEnd: p.tEnd, frames: p.frames, monitors: p.monitors, limitRise: p.limitRise });
    const om = omegaFor(p, sp);
    const steady = S.solveSteady(m, { method: om.method, omega: om.omega, tol: p.tol, guess: p.h0, maxIter: 200000 });
    const small = m.N <= 30000;
    const gs = small ? S.solveSteady(m, { method: 'gs', tol: p.tol, guess: p.h0, maxIter: 60000 }) : null;
    const ht6 = small ? S.solveSteady(m, { method: 'sor', omega: sp.omegaHT6, tol: p.tol, guess: p.h0 }) : null;
    const opt = om.label === 'óptimo' ? steady : small ? S.solveSteady(m, { method: 'sor', omega: sp.omegaOpt, tol: p.tol, guess: p.h0 }) : null;
    const balance = S.massBalance(m, steady.h);
    const analytic = S.analyticSteady(m);
    let analyticErr = null;
    if (analytic) { analyticErr = 0; for (let j = 0; j < m.Ny; j++) for (let i = 0; i < m.Nx; i++) analyticErr = Math.max(analyticErr, Math.abs(steady.h[j * m.Nx + i] - analytic.fn(m.x[i]))); }

    const mons = ftcs.monitors.map((mo) => {
      const hEnd = mo.series[mo.series.length - 1], hSteady = steady.h[mo.k];
      const dS = hSteady - mo.h0;
      let t95 = null;
      if (Math.abs(dS) > 1e-9) {
        for (let q = 0; q < mo.series.length; q++) if (Math.abs(mo.series[q] - mo.h0) >= 0.95 * Math.abs(dS)) { t95 = ftcs.tSeries[q]; break; }
      }
      return { ...mo, hEnd, hSteady, pct: Math.abs(dS) > 1e-9 ? (hEnd - mo.h0) / dS * 100 : null, t95 };
    });
    const R = { p, m, dtmax, dt, rx: ftcs.rx, ry: ftcs.ry, nSteps: ftcs.nSteps, spectral: sp, ftcs, steady,
      omegaUsed: om.omega, omegaMode: om.label, gsIter: gs ? gs.iterations : '—', gsHistory: gs && gs.history.length < 20000 ? gs.history : null,
      ht6Iter: ht6 ? ht6.iterations : '—', optIter: opt ? opt.iterations : '—', balance, analytic, analyticErr, mons, features: Ct.features(p) };
    R.metrics = metrics(R);
    return R;
  }

  function metrics(R) {
    const { p, mons, ftcs } = R;
    const fe = R.features;
    const mt = {};
    mt.target = mons.find((m) => /vivienda|vecino/i.test(m.name)) || mons[1] || mons[0];
    if (fe.rampSide) {
      const base = mons.filter((m) => m.y <= 1e-9);
      const pool = base.length ? base : mons;
      let best = pool[0];
      for (const m of pool) if (m.maxH > best.maxH) best = m;
      mt.maxBaseH = best.maxH; mt.maxBaseX = best.x; mt.maxBaseT = best.tMax; mt.maxBaseSteady = best.hSteady;
      const tf = p.bc[fe.rampSide].tf;
      let q = ftcs.tSeries.findIndex((t) => t >= tf - 1e-9);
      if (q < 0) q = ftcs.tSeries.length - 1;
      const lm = pool[0];
      mt.lagX = lm.x; mt.lagH = lm.series[q]; mt.lagSteady = lm.hSteady; mt.lagT = ftcs.tSeries[q];
      mt.overshoot = mons.some((m) => m.maxH > m.hSteady + 1e-4 && Math.abs(m.hSteady - m.h0) > 1e-6);
    }
    return mt;
  }

  /* ------------------------------------------------------------------ */
  /* Render                                                              */
  /* ------------------------------------------------------------------ */
  const kpi = (label, value, sub, pill) =>
    `<div class="kpi">${pill ? `<span class="pill ${pill[0]}">${pill[1]}</span>` : ''}<span class="k-label">${label}</span><span class="k-value">${value}</span>${sub ? `<span class="k-sub">${sub}</span>` : ''}</div>`;

  function kpiHTML(R) {
    const { p, mt = R.metrics } = R;
    const fe = R.features;
    const out = [];
    if (R.ftcs.diverged) out.push(kpi('Esquema FTCS', 'Divergió', `en el paso ${R.ftcs.diverged.step} (Δt > Δt<sub>máx</sub>)`, ['bad', 'Inestable']));
    if (fe.rampSide) {
      out.push(kpi('Subpresión máxima en la base', `${fmt(mt.maxBaseH, 3)} m`, `${fmt(9.81 * mt.maxBaseH, 1)} kPa · x = ${fmt(mt.maxBaseX, 0)} m · t = ${fmt(mt.maxBaseT, 1)} d`, ['info', 'Transitorio']));
      out.push(kpi(`Retraso al fin del llenado (x = ${fmt(mt.lagX, 0)} m)`, `${fmt(mt.lagSteady - mt.lagH, 3)} m`, `h = ${fmt(mt.lagH, 3)} m frente a ${fmt(mt.lagSteady, 3)} m estacionario`, ['warn', 'Camino ≠ destino']));
      if (R.ftcs.exitSeries) {
        const fs = (p.iCrit || 1) / Math.max(R.ftcs.exitMax, 1e-12);
        out.push(kpi('FS frente a piping (pie de talud)', fmt(fs, 2), `i<sub>salida, máx</sub> = ${fmt(R.ftcs.exitMax, 3)} · i<sub>crit</sub> = ${fmtg(p.iCrit || 1)}`, fs >= 3 ? ['ok', 'Aceptable'] : ['bad', 'Revisar']));
      }
    } else if (p.limitRise != null && mt.target) {
      const v = mt.target;
      const d = Math.abs(v.hEnd - v.h0), ds = Math.abs(v.hSteady - v.h0);
      const word = fe.point && !fe.line ? 'Abatimiento' : 'Ascenso';
      out.push(kpi(`${word} en ${esc(v.name)} a ${fmtg(p.tEnd, 0)} d`, `${fmt(d, 3)} m`, `${v.pct === null ? '' : fmt(v.pct, 0) + ' % del valor final'}`, d >= p.limitRise ? ['bad', 'Supera límite'] : ['ok', 'Bajo el límite']));
      out.push(kpi(`${word} final (estacionario)`, `${fmt(ds, 3)} m`, `límite ${fmtg(p.limitRise)} m`, ds >= p.limitRise ? ['bad', 'Destino crítico'] : ['ok', 'Destino seguro']));
      out.push(kpi('Tiempo para superar el límite', v.tExceed !== null ? days(v.tExceed) : 'No lo supera', v.tExceed !== null ? 'plazo para actuar' : `en ${days(p.tEnd)}`, v.tExceed !== null ? ['bad', 'Alerta'] : ['ok', 'Sin alerta']));
    }
    out.push(kpi('Paso de tiempo FTCS', `${fmtg(R.dt, 4)} d`, `${fmt(R.nSteps, 0)} pasos · r<sub>x</sub>+r<sub>y</sub> = ${fmtg(R.rx + R.ry, 3)}`, R.rx + R.ry <= 0.5 + 1e-12 ? ['ok', 'Estable'] : ['bad', 'Inestable']));
    out.push(kpi(`Estacionario (${R.omegaMode})`, `${R.steady.iterations} iter.`, `ω = ${fmtg(R.omegaUsed, 3)} · balance ${fmtg(R.balance.errorPct, 2)} %`, R.steady.converged ? ['info', 'Convergió'] : ['bad', 'Sin converger']));
    return out.join('');
  }

  function paramsTable(p) {
    const rows = [['L<sub>x</sub> × L<sub>y</sub>', `${fmtg(p.Lx)} × ${fmtg(p.Ly)} m`], ['Δx × Δy', `${fmtg(p.dx)} × ${fmtg(p.dy)} m`],
      ['T', `${fmtg(p.T)} m²/día`], ['S', fmtg(p.S)], ['h₀', `${fmtg(p.h0)} m`], ['Horizonte', days(p.tEnd)], ['Δt/Δt<sub>máx</sub>', fmtg(p.dtFactor)], ['Tolerancia SOR', `${fmtg(p.tol)} m`]];
    const lab = { neumann: 'Neumann', dirichlet: 'Dirichlet', ramp: 'Rampa' };
    for (const s of ['west', 'east', 'south', 'north']) {
      const b = p.bc[s];
      rows.push([b.label || s, b.type === 'neumann' ? 'Neumann (sin flujo)' : b.type === 'dirichlet' ? `Dirichlet h = ${fmtg(b.value)} m` : `${lab.ramp} ${fmtg(b.h1)} → ${fmtg(b.h2)} m en ${fmtg(b.tf)} d`]);
    }
    for (const s of p.sources) if (s.enabled) rows.push([s.type === 'line' ? 'Canal' : 'Pozo', s.type === 'line' ? `x = ${fmtg(s.x)} m, q<sub>inf</sub> = ${fmtg(s.q)} m³/día/m${s.lining && s.lining.enabled ? `, revestido ${fmtg(s.lining.eff)} % en y ∈ [${fmtg(s.lining.y1)}, ${fmtg(s.lining.y2)}]` : ''}` : `(${fmtg(s.x)}, ${fmtg(s.y)}) m, Q = ${fmtg(s.Q)} m³/día`]);
    if (p.drain && p.drain.enabled) rows.push(['Dren', `x = ${fmtg(p.drain.x)} m, h = ${fmtg(p.drain.h)} m`]);
    return `<table><tbody>${rows.map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody></table>`;
  }

  function typeset(el) {
    if (window.MathJax && MathJax.typesetPromise) {
      MathJax.startup.promise.then(() => { MathJax.typesetClear([el]); return MathJax.typesetPromise([el]); }).catch((e) => console.warn(e));
    }
  }

  function renderAll() {
    const R = state.R;
    $('kpis').innerHTML = kpiHTML(R);
    const slider = $('time-slider');
    slider.max = R.ftcs.snapshots.length - 1;
    state.frame = R.ftcs.snapshots.length - 1;
    slider.value = state.frame;
    render3D();
    state.dirty = { tform: true, tres: true, tdev: true };
    renderTab(state.tab);
    const fe = R.features;
    $('note3d').innerHTML = fe.rampSide
      ? 'En la presa, y es la altura: y = 0 es la cimentación y y = L<sub>y</sub> la coronación. La subpresión en la base es u = γ<sub>w</sub>·h.'
      : 'La superficie es la carga hidráulica h(x, y). Use “Cambio h − h₀” para ver el montículo o el cono con claridad.';
    setupScenarioLab();
    // la vista previa de exportación siempre corresponde al cálculo vigente
    if (state.expKind && state.expKind !== 'pdf') showExport(state.expKind);
    else { state.exp = null; $('code-title').textContent = 'Vista previa'; $('code-preview').hidden = false; $('pdf-frame-wrap').hidden = true; $('code-preview').textContent = 'Elija un formato para ver el archivo generado.'; document.querySelectorAll('.export-btn').forEach((b) => b.classList.remove('active')); }
  }

  function render3D() {
    const R = state.R;
    if (!R) return;
    const kind = $('view-field').value;
    const z = parseFloat($('zexag').value) || 1;
    const snap = R.ftcs.snapshots[state.frame];
    $('time-label').textContent = kind === 'steady' ? '(estacionario)' : `t = ${fmt(snap.t, 1)} d`;
    C.draw($('plot3d'), C.fig3d(R, kind, state.frame, z));
    C.draw($('plotmap'), C.figMap(R, kind, state.frame));
  }

  function renderTab(tab) {
    const R = state.R;
    if (!R || !state.dirty) return;
    if (tab === 'tform' && state.dirty.tform) { $('formulas').innerHTML = Ct.formulas(R); typeset($('formulas')); state.dirty.tform = false; }
    if (tab === 'tdev' && state.dirty.tdev) { $('development').innerHTML = Ct.development(R); typeset($('development')); state.dirty.tdev = false; }
    if (tab === 'tres' && state.dirty.tres) {
      C.draw($('plotseries'), C.figSeries(R));
      C.draw($('plotprofile'), C.figProfile(R));
      C.draw($('plotconv'), C.figConv(R));
      C.draw($('plotextra'), C.figExtra(R));
      $('tables').innerHTML = Ct.block('Puntos de control',
        Ct.table(['Punto', 'x, y [m]', 'h₀', 'h final FTCS', 'h estacionario', 'Cambio', '% del final', '95 % del final a'],
          R.mons.map((mo) => [esc(mo.name), `${fmt(mo.x, 0)}, ${fmt(mo.y, 0)}`, { n: fmt(mo.h0, 3) }, { n: fmt(mo.hEnd, 4) }, { n: fmt(mo.hSteady, 4) }, { n: fmt(mo.hEnd - mo.h0, 4) },
            { n: mo.pct === null ? '—' : fmt(mo.pct, 1) + ' %' }, { n: mo.t95 === null ? '—' : days(mo.t95) }]))) +
        Ct.block('Verificaciones', Ct.table(['Prueba', 'Resultado'], [
          ['Conteo de nodos (total / actualizados)', { n: `${R.m.counts.total} / ${R.m.counts.updated}` }],
          ['Balance de masa estacionario (error de cierre)', { n: fmtg(R.balance.errorPct, 3) + ' %' }],
          ['Residuo máximo |∇²h + f|', { n: fmtg(R.steady.residual) }],
          ['Error frente a solución analítica 1D', { n: R.analyticErr === null ? 'no aplica' : fmtg(R.analyticErr) + ' m' }],
          ['Iteraciones GS / SOR-HT6 / SOR-óptimo', { n: `${R.gsIter} / ${R.ht6Iter} / ${R.optIter}` }],
          ['Tiempo de cálculo FTCS / SOR', { n: `${fmt(R.ftcs.elapsed, 0)} ms / ${fmt(R.steady.elapsed, 0)} ms` }],
        ]));
      state.dirty.tres = false;
    }
  }

  function setStatus(msg, busy) { const s = $('status'); s.textContent = msg; s.classList.toggle('busy', !!busy); }

  function run() {
    const errs = validate(state.p);
    if (errs.length) { setStatus(errs.join(' '), true); return; }
    setStatus('Calculando…', true);
    $('btn-run').disabled = true;
    setTimeout(() => {
      try {
        const t0 = performance.now();
        state.R = compute(state.p);
        renderAll();
        setStatus(`Calculado en ${fmt(performance.now() - t0, 0)} ms · ${state.R.m.Nx}×${state.R.m.Ny} nodos · ${fmt(state.R.nSteps, 0)} pasos`);
      } catch (e) {
        console.error(e);
        setStatus('Error en el cálculo: ' + e.message, true);
      } finally { $('btn-run').disabled = false; }
    }, 20);
  }

  /* ------------------------------------------------------------------ */
  /* Laboratorio                                                         */
  /* ------------------------------------------------------------------ */
  function nodeCalc() {
    const v = (id) => parseFloat($(id).value);
    const p = state.p;
    const c = { D: p.T / p.S, dt: v('n-dt'), dx: p.dx, dy: p.dy, S: p.S, hC: v('n-C'), hE: v('n-E'), hW: v('n-W'), hN: v('n-N'), hS: v('n-S'), Qs: v('n-Qs') };
    if (state.nodeOverride) Object.assign(c, state.nodeOverride);
    const r = S.ftcsNode(c);
    $('n-out').textContent =
      `D = ${fmtg(c.D, 5)} m²/día   Δx = ${fmtg(c.dx)}   Δy = ${fmtg(c.dy)}\n` +
      `rx = D·Δt/Δx² = ${fmtg(r.rx, 5)}   ry = ${fmtg(r.ry, 5)}   rx+ry = ${fmtg(r.rx + r.ry, 4)} ${r.rx + r.ry > 0.5 ? '(INESTABLE)' : '(estable)'}\n` +
      `h(n+1) = ${fmtg(c.hC, 5)} + ${fmtg(r.rx, 4)}·(${fmtg(c.hE, 5)} − 2·${fmtg(c.hC, 5)} + ${fmtg(c.hW, 5)})\n` +
      `        + ${fmtg(r.ry, 4)}·(${fmtg(c.hN, 5)} − 2·${fmtg(c.hC, 5)} + ${fmtg(c.hS, 5)}) + Δt·Qs/S\n` +
      `        = ${fmt(r.value, 6)} m`;
  }

  function sweep() {
    const R = state.R; if (!R) return;
    const om = [], it = [];
    for (let w = 1.0; w <= 1.985; w += 0.01) {
      const r = S.solveSteady(R.m, { method: 'sor', omega: w, tol: R.p.tol, guess: R.p.h0, maxIter: 20000 });
      om.push(+w.toFixed(3)); it.push(r.iterations);
    }
    const th = C.theme();
    let best = 0; for (let k = 1; k < it.length; k++) if (it[k] < it[best]) best = k;
    const ymax = Math.max(...it);
    C.draw($('plotsweep'), { data: [
      { type: 'scatter', mode: 'lines+markers', x: om, y: it, name: 'Iteraciones', line: { color: C.SERIES[0], width: 2 }, marker: { size: 3 } },
      { type: 'scatter', mode: 'lines', x: [R.spectral.omegaOpt, R.spectral.omegaOpt], y: [0, ymax], name: `ω óptimo ${fmtg(R.spectral.omegaOpt, 3)}`, line: { color: th.good, dash: 'dash' } },
      { type: 'scatter', mode: 'lines', x: [R.spectral.omegaHT6, R.spectral.omegaHT6], y: [0, ymax], name: `ω HT6 ${fmtg(R.spectral.omegaHT6, 3)}`, line: { color: th.clay, dash: 'dot' } },
    ], layout: C.base(th, `Mejor ω del barrido: ${fmtg(om[best], 3)} (${it[best]} iteraciones)`, { xaxis: C.axis(th, 'ω'), yaxis: C.axis(th, 'Iteraciones', { type: 'log' }), margin: { l: 56, r: 12, t: 40, b: 90 }, legend: { orientation: 'h', y: -0.42, font: { size: 11 } } }) });
  }

  function stability() {
    const R = state.R; if (!R) return;
    const k = parseFloat($('st-k').value) || 1.1;
    const dt = k * R.dtmax;
    const tEnd = Math.min(R.p.tEnd, 4000 * dt);
    const runs = [[k, 'k = ' + fmtg(k)], [0.9, 'k = 0,9 (referencia)']].map(([kk, name]) => {
      const r = S.runFTCS(R.m, { dt: kk * R.dtmax, tEnd, frames: 200, monitors: [], perturb: 1e-12 });
      return { name, r, t: r.snapshots.map((s) => s.t), a: r.snapshots.map((s) => { let mx = 0; for (const v of s.h) { const av = Math.abs(v); if (!(av < mx)) mx = av; } return Math.max(mx, 1e-3); }) };
    });
    const r0 = runs[0].r;
    const g = 1 - 4 * (r0.rx + r0.ry);
    $('st-out').textContent = `rx + ry = ${fmtg(r0.rx + r0.ry, 4)}   g_mín = 1 − 4(rx+ry) = ${fmtg(g, 4)}   |g_mín| ${Math.abs(g) > 1 ? '> 1 → INESTABLE' : '≤ 1 → estable'}\n` +
      (r0.diverged ? `La solución supera 10⁶ m en el paso ${r0.diverged.step} (t = ${fmtg(r0.diverged.t, 4)} días).` : `No diverge en ${fmt(r0.nSteps, 0)} pasos.`);
    const th = C.theme();
    C.draw($('plotstab'), { data: runs.map((x, i) => ({ type: 'scatter', mode: 'lines', x: x.t, y: x.a, name: x.name, line: { color: i ? th.good : th.bad, width: 2 } })),
      layout: C.base(th, 'máx |h| durante la simulación', { xaxis: C.axis(th, 't [días]'), yaxis: C.axis(th, 'máx |h| [m]', { type: 'log', exponentformat: 'power' }), margin: { l: 56, r: 12, t: 40, b: 90 }, legend: { orientation: 'h', y: -0.42, font: { size: 11 } } }) });
  }

  function methods() {
    const R = state.R; if (!R) return;
    const opts = { tol: R.p.tol, guess: R.p.h0, maxIter: 20000 };
    const runs = [['Jacobi', S.solveSteady(R.m, { ...opts, method: 'jacobi' })], ['Gauss-Seidel', S.solveSteady(R.m, { ...opts, method: 'gs' })],
      [`SOR ω = ${fmtg(R.spectral.omegaOpt, 3)}`, S.solveSteady(R.m, { ...opts, method: 'sor', omega: R.spectral.omegaOpt })]];
    const th = C.theme();
    C.draw($('plotmethods'), { data: runs.map(([n, r], i) => ({ type: 'scatter', mode: 'lines', y: r.history, name: `${n} (${r.iterations}${r.converged ? '' : '+'})`, line: { color: C.SERIES[i], width: 2 } })),
      layout: C.base(th, 'Cambio máximo por iteración', { xaxis: C.axis(th, 'Iteración', { type: 'log' }), yaxis: C.axis(th, 'm', { type: 'log', exponentformat: 'power' }), margin: { l: 56, r: 12, t: 40, b: 90 }, legend: { orientation: 'h', y: -0.42, font: { size: 11 } } }) });
  }

  function setupScenarioLab() {
    const fe = state.R.features;
    if (fe.rampSide) {
      $('lab-sc-title').textContent = 'Velocidad de llenado: camino frente a destino';
      $('lab-sc-hint').textContent = 'Repite el transitorio con distintos tiempos de llenado t_f y compara la carga en el primer punto de control con la del embalse. Responde la pregunta de los 900 días.';
    } else if (fe.line) {
      $('lab-sc-title').textContent = 'Medidas de mitigación: revestir frente a drenar';
      $('lab-sc-hint').textContent = 'Compara el cambio estacionario a lo largo de x sin medidas, con el canal revestido completo o a medias (eficiencia del panel) y con un dren de intercepción.';
    } else {
      $('lab-sc-title').textContent = 'Sensibilidad a la transmisividad';
      $('lab-sc-hint').textContent = 'Resuelve el estacionario con T × 0,5, T y T × 2 y compara el cambio en los puntos de control.';
    }
    $('lab-sc-out').textContent = '';
    Plotly.purge($('plotsclab'));
  }

  function scenarioLab() {
    const R = state.R; if (!R) return;
    const fe = R.features, th = C.theme();
    const clone = () => JSON.parse(JSON.stringify(state.p));
    const steadyOf = (p) => { const m = S.buildModel(p); const sp = S.spectral(p); return { m, h: S.solveSteady(m, { method: 'sor', omega: sp.omegaOpt, tol: 1e-7, guess: p.h0 }).h }; };
    if (fe.rampSide) {
      const b0 = state.p.bc[fe.rampSide];
      const tfs = [b0.tf / 3, b0.tf, b0.tf * 3, b0.tf * 10].map((v) => Math.round(v));
      const mo = state.p.monitors[0];
      const lines = [], data = [];
      tfs.forEach((tf, i) => {
        const p = clone(); p.bc[fe.rampSide].tf = tf; p.tEnd = tf * 1.6;
        const m = S.buildModel(p);
        const r = S.runFTCS(m, { dt: R.dt, tEnd: p.tEnd, frames: 4, monitors: [mo], maxSeries: 600 });
        const M0 = r.monitors[0];
        const gser = r.tSeries.map((t) => S.bcValue(p.bc[fe.rampSide], t));
        // retraso máximo relativo al estacionario cuasi-instantáneo: h_qs(t) = estacionario con g(t)
        // fracción del embalse que llega al punto en estacionario (Laplace lineal): h_qs(t) = h_E + frac·(g(t) − h_E)
        const hE = R.p.bc.east.type === 'dirichlet' ? R.p.bc.east.value : R.p.h0;
        const frac = (R.steady.h[M0.k] - hE) / ((b0.h2 - hE) || 1);
        let lag = 0, tl = 0;
        r.tSeries.forEach((t, q) => { const hq = hE + frac * (gser[q] - hE); const d = hq - M0.series[q]; if (d > lag) { lag = d; tl = t; } });
        lines.push(`t_f = ${String(tf).padStart(5)} d   τ/t_f = ${fmtg(R.p.Lx ** 2 / R.m.D / tf, 3).padEnd(6)}   retraso máx. frente al cuasi-estacionario = ${fmt(lag, 3)} m (t = ${fmt(tl, 1)} d)`);
        data.push({ type: 'scatter', mode: 'lines', x: r.tSeries.map((t) => t / tf), y: M0.series, name: `h en ${mo.name}, t_f = ${tf} d`, line: { color: C.SERIES[i], width: 2 } });
      });
      data.push({ type: 'scatter', mode: 'lines', x: [0, 1, 1.6], y: [R.mons[0].h0, R.mons[0].hSteady, R.mons[0].hSteady], name: 'Estacionario instantáneo', line: { color: th.ink, dash: 'dash', width: 1 } });
      $('lab-sc-out').textContent = lines.join('\n') + `\nCuanto mayor t_f frente a τ = L²/D = ${fmtg(R.p.Lx ** 2 / R.m.D, 3)} d, más se parece el llenado a una sucesión de estados estacionarios.`;
      C.draw($('plotsclab'), { data, layout: C.base(th, 'Carga en el punto de control frente a t/t_f', { xaxis: C.axis(th, 't / t_f'), yaxis: C.axis(th, 'h [m]') }) });
      return;
    }
    const target = R.metrics.target;
    const j = Math.round((R.m.Ny - 1) / 2);
    const cases = [];
    if (fe.line) {
      const li = state.p.sources.findIndex((s) => s.type === 'line');
      const eff = state.p.sources[li].lining.eff || 80;
      const mk = (name, fn) => { const p = clone(); fn(p); p.drain = p.drain || {}; cases.push([name, p]); };
      mk('Sin medidas', (p) => { p.sources[li].lining.enabled = false; p.drain.enabled = false; });
      mk(`Revestido completo (${eff} %)`, (p) => { Object.assign(p.sources[li].lining, { enabled: true, y1: 0, y2: p.Ly }); p.drain.enabled = false; });
      mk(`Revestida la mitad norte (${eff} %)`, (p) => { Object.assign(p.sources[li].lining, { enabled: true, y1: p.Ly / 2, y2: p.Ly }); p.drain.enabled = false; });
      mk(`Dren en x = ${fmtg(state.p.drain.x)} m`, (p) => { p.sources[li].lining.enabled = false; p.drain.enabled = true; });
    } else {
      [0.5, 1, 2].forEach((f) => { const p = clone(); p.T *= f; cases.push([`T × ${fmtg(f)} = ${fmtg(p.T)}`, p]); });
    }
    const lines = [], data = [];
    cases.forEach(([name, p], i) => {
      const r = steadyOf(p);
      const k = target.j * r.m.Nx + target.i;
      lines.push(`${name.padEnd(34)} cambio estacionario en ${target.name}: ${fmt(r.h[k] - p.h0, 4)} m   (sur: ${fmt(r.h[target.i] - p.h0, 4)}, norte: ${fmt(r.h[(r.m.Ny - 1) * r.m.Nx + target.i] - p.h0, 4)})`);
      data.push({ type: 'scatter', mode: 'lines', x: r.m.x, y: r.m.x.map((_, ii) => r.h[j * r.m.Nx + ii] - p.h0), name, line: { color: C.SERIES[i], width: 2 } });
    });
    $('lab-sc-out').textContent = lines.join('\n');
    C.draw($('plotsclab'), { data, layout: C.base(th, `Cambio estacionario h − h₀ a lo largo de x (y = ${fmt(R.m.y[j], 0)} m)`, { xaxis: C.axis(th, 'x [m]'), yaxis: C.axis(th, 'h − h₀ [m]') }) });
  }

  function meshStudy() {
    const R = state.R; if (!R) return;
    const mo = state.p.monitors[0];
    const out = [];
    let prev = null;
    for (const f of [1, 2, 4]) {
      const p = JSON.parse(JSON.stringify(state.p)); p.dx /= f; p.dy /= f;
      const m = S.buildModel(p);
      if (m.N > 60000) { out.push(`Δ/${f}: malla demasiado grande (${m.N} nodos)`); break; }
      const sp = S.spectral(p);
      const r = S.solveSteady(m, { method: 'sor', omega: sp.omegaOpt, tol: 1e-9, guess: p.h0 });
      const i = Math.round(mo.x / p.dx), j = Math.round(mo.y / p.dy);
      const v = r.h[j * m.Nx + i];
      out.push(`Δx = ${fmtg(p.dx).padEnd(6)} ${String(m.Nx + '×' + m.Ny).padEnd(8)} ${String(r.iterations).padStart(5)} iter.  h(${mo.name}) = ${fmt(v, 6)} m${prev === null ? '' : `   cambio = ${fmtg(v - prev, 3)} m`}`);
      prev = v;
    }
    const well = state.p.sources.some((s) => s.enabled && s.type === 'point');
    $('mesh-out').textContent = out.join('\n') + (well ? '\nOjo: en el nodo del pozo la carga depende de la malla (singularidad logarítmica de una fuente puntual); compare puntos alejados del pozo.' : '') + '\nSi el cambio entre mallas es despreciable frente a la precisión que pide la decisión, la malla original es suficiente.';
  }

  /* ------------------------------------------------------------------ */
  /* Exportación                                                         */
  /* ------------------------------------------------------------------ */
  const slug = () => (state.p.id || 'caso');
  function download(name, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }

  function showExport(kind) {
    const R = state.R; if (!R) return;
    document.querySelectorAll('.export-btn').forEach((b) => b.classList.toggle('active', b.dataset.exp === kind));
    $('pdf-frame-wrap').hidden = true;
    $('code-preview').hidden = false;
    state.expKind = kind;
    let name, content, mime = 'text/plain';
    if (kind === 'matlab') { name = `piezometro2d_${slug()}.m`; content = X.matlab(R); }
    if (kind === 'matdata') { name = `datos_${slug()}.m`; content = X.matlabData(R); }
    if (kind === 'python') { name = `piezometro2d_${slug()}.py`; content = X.python(R); }
    if (kind === 'csv') { name = `resultados_${slug()}.csv`; content = X.csv(R); mime = 'text/csv'; }
    if (kind === 'json') { name = `caso_${slug()}.json`; content = X.json(state.p); mime = 'application/json'; }
    state.exp = { name, content, mime };
    $('code-title').textContent = name;
    const lim = 60000;
    $('code-preview').textContent = content.length > lim ? content.slice(0, lim) + `\n… (${fmt(content.length - lim, 0)} caracteres más en el archivo)` : content;
  }

  async function exportPDF() {
    if (!state.R) return;
    selectTab('texp');
    const btns = [$('btn-pdf')].concat(Array.from(document.querySelectorAll('[data-exp="pdf"]')));
    btns.forEach((b) => (b.disabled = true));
    try {
      setStatus('Generando informe PDF…', true);
      const blob = await X.pdf(state.R, { zexag: parseFloat($('zexag').value) || 1, paramsTable: paramsTable(state.p), kpiHTML: `<div class="kpis-rep">${kpiHTMLReport(state.R)}</div>` }, (m) => setStatus(m, true));
      if (state.pdfUrl) URL.revokeObjectURL(state.pdfUrl);
      state.pdfUrl = URL.createObjectURL(blob);
      const name = `informe_${slug()}.pdf`;
      state.exp = { name, content: blob, mime: 'application/pdf' };
      $('code-title').textContent = `${name} · ${fmt(blob.size / 1024, 0)} KB`;
      $('code-preview').hidden = true;
      $('pdf-frame-wrap').hidden = false;
      $('pdf-frame').src = state.pdfUrl;
      document.querySelectorAll('.export-btn').forEach((b) => b.classList.toggle('active', b.dataset.exp === 'pdf'));
      state.expKind = 'pdf';
      download(name, blob);
      setStatus(`Informe PDF listo (${fmt(blob.size / 1024, 0)} KB).`);
    } catch (e) {
      console.error(e); setStatus('No se pudo generar el PDF: ' + e.message, true);
    } finally { btns.forEach((b) => (b.disabled = false)); }
  }

  function kpiHTMLReport(R) {
    const tmp = document.createElement('div');
    tmp.innerHTML = kpiHTML(R);
    return `<table><tbody>${Array.from(tmp.querySelectorAll('.kpi')).map((k) => {
      const q = (s) => (k.querySelector(s) ? k.querySelector(s).innerHTML : '');
      return `<tr><td><b>${q('.k-label')}</b><br><span class="muted">${q('.k-sub')}</span></td><td class="n"><b>${q('.k-value')}</b></td><td>${q('.pill')}</td></tr>`;
    }).join('')}</tbody></table>`;
  }

  /* ------------------------------------------------------------------ */
  /* Eventos                                                             */
  /* ------------------------------------------------------------------ */
  function selectTab(tab) {
    state.tab = tab;
    document.querySelectorAll('.tab').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === tab)));
    document.querySelectorAll('.tabpanel').forEach((s) => (s.hidden = s.id !== tab));
    renderTab(tab);
    if (tab === 't3d' && state.R) { Plotly.Plots.resize($('plot3d')); Plotly.Plots.resize($('plotmap')); }
    if (tab === 'tres' && state.R) ['plotseries', 'plotprofile', 'plotconv', 'plotextra'].forEach((id) => Plotly.Plots.resize($(id)));
    if (tab === 'texp' && state.R && !state.exp) showExport('matlab');
    try { localStorage.setItem('pz2d-tab', tab); } catch (e) { /* sin almacenamiento */ }
  }

  function loadPreset(id) {
    state.p = ensureDefaults(window.Presets.getPreset(id));
    $('sc-team').textContent = state.p.team;
    $('sc-name').textContent = state.p.name;
    $('sc-desc').textContent = state.p.description;
    state.exp = null;
    renderPanel();
    run();
  }

  let autoTimer = null;
  function onParam(e) {
    const el = e.target;
    const path = el.dataset.path;
    if (!path) return;
    let v;
    if (el.type === 'checkbox') v = el.checked;
    else if (el.type === 'number') { v = el.value === '' ? null : parseFloat(el.value); if (v !== null && !isFinite(v)) return; }
    else v = el.value;
    set(state.p, path, v);
    if (el.dataset.rebuild) renderPanel(); else updateDerived();
    // recálculo automático si es barato
    const p = state.p;
    const cost = (Math.round(p.Lx / p.dx) + 1) * (Math.round(p.Ly / p.dy) + 1) * p.tEnd / (p.dtFactor * S.dtMax(p));
    clearTimeout(autoTimer);
    if (cost < 2.5e7 && validate(p).length === 0) autoTimer = setTimeout(run, 450);
    else setStatus('Datos modificados. Pulse Calcular.', true);
  }

  function play() {
    if (state.playing) { clearInterval(state.playing); state.playing = null; $('btn-play').textContent = '▶ Animar'; return; }
    const R = state.R; if (!R) return;
    if ($('view-field').value === 'steady') $('view-field').value = 'ftcs';
    $('btn-play').textContent = '■ Detener';
    if (state.frame >= R.ftcs.snapshots.length - 1) state.frame = 0;
    state.playing = setInterval(() => {
      state.frame++;
      if (state.frame >= state.R.ftcs.snapshots.length) { state.frame = state.R.ftcs.snapshots.length - 1; play(); return; }
      $('time-slider').value = state.frame;
      render3D();
    }, 140);
  }

  function init() {
    $('params').addEventListener('change', onParam);
    $('preset').addEventListener('change', (e) => loadPreset(e.target.value));
    $('btn-run').addEventListener('click', run);
    $('btn-pdf').addEventListener('click', exportPDF);
    $('btn-matlab').addEventListener('click', () => { selectTab('texp'); showExport('matlab'); download(state.exp.name, state.exp.content, state.exp.mime); });
    $('btn-panel').addEventListener('click', () => {
      const c = $('panel').classList.toggle('collapsed');
      $('btn-panel').setAttribute('aria-expanded', String(!c));
    });
    if (window.matchMedia('(max-width: 900px)').matches) $('panel').classList.add('collapsed');
    document.querySelectorAll('.tab').forEach((b) => b.addEventListener('click', () => selectTab(b.dataset.tab)));
    $('view-field').addEventListener('change', render3D);
    $('zexag').addEventListener('change', render3D);
    $('time-slider').addEventListener('input', (e) => { state.frame = +e.target.value; render3D(); });
    $('btn-play').addEventListener('click', play);

    ['n-N', 'n-W', 'n-C', 'n-E', 'n-S', 'n-dt', 'n-Qs'].forEach((id) => $(id).addEventListener('input', nodeCalc));
    $('n-use').addEventListener('click', () => { state.nodeOverride = null; $('n-dt').value = +(state.R ? state.R.dt : 1).toPrecision(6); nodeCalc(); });
    state.nodeOverride = { D: 2500, dx: 100, dy: 100, S: 0.12 };
    $('btn-sweep').addEventListener('click', () => { setStatus('Barrido de ω…', true); setTimeout(() => { sweep(); setStatus('Barrido terminado.'); }, 20); });
    $('btn-stab').addEventListener('click', () => setTimeout(stability, 10));
    $('btn-methods').addEventListener('click', () => { setStatus('Comparando métodos…', true); setTimeout(() => { methods(); setStatus('Comparación terminada.'); }, 20); });
    $('btn-scenario-lab').addEventListener('click', () => { setStatus('Ejecutando análisis…', true); setTimeout(() => { scenarioLab(); setStatus('Análisis terminado.'); }, 20); });
    $('btn-mesh').addEventListener('click', () => { setStatus('Refinando malla…', true); setTimeout(() => { meshStudy(); setStatus('Estudio de malla terminado.'); }, 20); });

    document.querySelectorAll('.export-btn[data-exp]').forEach((b) => b.addEventListener('click', () => (b.dataset.exp === 'pdf' ? exportPDF() : showExport(b.dataset.exp))));
    $('btn-download').addEventListener('click', () => { if (state.exp) download(state.exp.name, state.exp.content, state.exp.mime); });
    $('btn-copy').addEventListener('click', () => {
      if (!state.exp || typeof state.exp.content !== 'string') return;
      navigator.clipboard.writeText(state.exp.content).then(() => setStatus('Copiado al portapapeles.'), () => {
        const r = document.createRange(); r.selectNodeContents($('code-preview'));
        const s = getSelection(); s.removeAllRanges(); s.addRange(r); setStatus('Texto seleccionado: use Ctrl+C.');
      });
    });
    $('json-load').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const p = JSON.parse(rd.result);
          if (!p.bc || !p.sources || !p.Lx) throw new Error('el archivo no contiene un caso válido');
          state.p = ensureDefaults(p);
          $('sc-team').textContent = p.team || 'Caso cargado'; $('sc-name').textContent = p.name || f.name; $('sc-desc').textContent = p.description || '';
          renderPanel(); run();
        } catch (err) { setStatus('No se pudo cargar: ' + err.message, true); }
      };
      rd.readAsText(f);
      e.target.value = '';
    });

    let startTab = 't3d';
    try { startTab = localStorage.getItem('pz2d-tab') || 't3d'; } catch (e) { /* sin almacenamiento */ }
    const hash = (location.hash || '').slice(1);
    if (['esc1', 'esc2', 'esc0'].includes(hash)) $('preset').value = hash;
    else if (['t3d', 'tform', 'tres', 'tdev', 'tlab', 'texp'].includes(hash)) startTab = hash;
    loadPreset($('preset').value);
    nodeCalc();
    window.addEventListener('hashchange', () => {
      const h = location.hash.slice(1);
      if (['esc1', 'esc2', 'esc0'].includes(h) && h !== state.p.id) { $('preset').value = h; loadPreset(h); }
      else if (document.getElementById(h) && h.startsWith('t')) selectTab(h);
    });
    if (document.getElementById(startTab)) selectTab(startTab);
  }

  window.addEventListener('DOMContentLoaded', init);
  window.__pz2d = state;
})();
