/* Simulador interactivo: editor en planta, animación en tiempo real, vista 3D, tablero, problemas y exportación. */
(function () {
  'use strict';
  const E = window.SimEngine, P = window.SimProblems, V3 = window.Sim3D, X = window.Exporters;
  const { fmt, fmtg, esc, days } = window.F;
  const $ = (id) => document.getElementById(id);
  const clone = (o) => JSON.parse(JSON.stringify(o));

  const state = {
    problem: null, cfg: null, sim: null, view3d: null, tool: 'select', sel: null,
    running: false, last: 0, steady: null, steadyStale: true, drag: null, lastUI: 0, lastChart: 0, solved: false, geom: null,
  };

  /* ------------------------------------------------------------------ */
  /* Definición de campos editables                                      */
  /* ------------------------------------------------------------------ */
  const XY2 = [['x1', 'x₁ [m]'], ['y1', 'y₁ [m]'], ['x2', 'x₂ [m]'], ['y2', 'y₂ [m]']];
  const T12 = [['t1', 'Inicia el día'], ['t2', 'Termina el día (vacío = nunca)', 'opt']];
  const FIELDS = {
    casa: [['name', 'Nombre', 'text'], ['x', 'x [m]'], ['y', 'y [m]'], ['cim', 'Cimentación [m bajo el terreno]']],
    canal: [['name', 'Nombre', 'text'], ...XY2, ['q', 'Pérdida q [m³/día por m de canal]'], ['lined', 'Canal revestido', 'chk'], ['eff', 'Eficiencia del revestimiento [%]'], ...T12],
    pozo: [['name', 'Nombre', 'text'], ['x', 'x [m]'], ['y', 'y [m]'], ['Q', 'Bombeo Q [m³/día] (0 = observación)'], ['depth', 'Profundidad del pozo [m]'], ['limit', 'Abatimiento admisible [m]', 'opt'], ...T12],
    poza: [['name', 'Nombre', 'text'], ...XY2, ['inf', 'Infiltración i [m/día]'], ['membrane', 'Con geomembrana (−99 %)', 'chk'], ...T12],
    dren: [['name', 'Nombre', 'text'], ...XY2, ['depth', 'Profundidad del dren [m]']],
    rio: [['name', 'Nombre', 'text'], ...XY2, ['dh', 'Nivel respecto al freático inicial [m]'], ['flood.on', 'Crecida (hidrograma)', 'chk'], ['flood.peak', 'Altura de la crecida [m]'], ['flood.tStart', 'Inicio [día]'], ['flood.rise', 'Subida [días]'], ['flood.fall', 'Bajada [días]']],
    fosa: [['name', 'Nombre', 'text'], ...XY2, ['depth', 'Profundidad de excavación [m]'], ['margin', 'Margen bajo el fondo [m]']],
  };
  const TYPE = { casa: 'Casa', canal: 'Canal', pozo: 'Pozo', poza: 'Poza o laguna', dren: 'Dren', rio: 'Río o quebrada', fosa: 'Fosa de excavación' };
  const HINT = {
    select: 'Clic sobre un elemento para editarlo; arrástrelo para moverlo. Los extremos se mueven por separado. Supr borra.',
    casa: 'Clic en el mapa para colocar una casa.', pozo: 'Clic en el mapa para colocar un pozo.',
    canal: 'Arrastre en el mapa para trazar el canal.', dren: 'Arrastre para trazar el dren.', rio: 'Arrastre para trazar el río o quebrada.',
    poza: 'Arrastre un rectángulo para la poza o laguna.', fosa: 'Arrastre un rectángulo para la fosa.', borrar: 'Clic sobre un elemento para borrarlo.',
  };
  const get = (o, p) => p.split('.').reduce((a, k) => (a == null ? a : a[k]), o);
  const set = (o, p, v) => { const ks = p.split('.'); let a = o; for (let i = 0; i < ks.length - 1; i++) a = a[ks[i]]; a[ks[ks.length - 1]] = v; };
  const elById = (id) => state.cfg.elements.find((e) => e.id === id);

  /* ------------------------------------------------------------------ */
  /* Paneles                                                             */
  /* ------------------------------------------------------------------ */
  function field(path, label, kind, value, prefix) {
    const id = `${prefix}-${path.replace(/\./g, '-')}`;
    if (kind === 'chk') return `<label class="pcheck"><input id="${id}" data-path="${path}" type="checkbox" ${value ? 'checked' : ''}> ${label}</label>`;
    if (kind === 'text') return `<label class="pfield full"><span>${label}</span><input id="${id}" data-path="${path}" type="text" value="${esc(value ?? '')}"></label>`;
    return `<label class="pfield${label.length > 22 ? ' full' : ''}"><span>${label}</span><input id="${id}" data-path="${path}" data-kind="${kind || 'num'}" type="number" step="any" value="${value ?? ''}"></label>`;
  }

  function renderProps() {
    const el = state.sel && elById(state.sel);
    if (!el) { $('props').innerHTML = ''; return; }
    const extra = el.type === 'canal' ? `<div class="derived">Q<sub>s</sub> = q/Δx = ${fmtg(el.q * (el.lined ? 1 - el.eff / 100 : 1) / state.cfg.dx)} m/día · longitud ${fmt(Math.hypot(el.x2 - el.x1, el.y2 - el.y1), 0)} m · pierde ${fmt(el.q * (el.lined ? 1 - el.eff / 100 : 1) * Math.hypot(el.x2 - el.x1, el.y2 - el.y1), 0)} m³/día</div>`
      : el.type === 'pozo' ? `<div class="derived">Q<sub>s</sub> = −Q/Δx² = ${fmtg(-el.Q / state.cfg.dx ** 2)} m/día</div>`
      : el.type === 'poza' ? `<div class="derived">Área ${fmt(Math.abs((el.x2 - el.x1) * (el.y2 - el.y1)), 0)} m² · pierde ${fmt(Math.abs((el.x2 - el.x1) * (el.y2 - el.y1)) * el.inf * (el.membrane ? 0.01 : 1), 1)} m³/día</div>`
      : el.type === 'dren' ? `<div class="derived">Cota del dren: h<sub>d</sub> = z<sub>t</sub> − p = ${fmtg(state.sim.g.zg - el.depth)} m (freático inicial ${fmtg(state.sim.g.h0)} m)</div>`
      : el.type === 'casa' ? `<div class="derived">Se afecta si h ≥ z<sub>t</sub> − d<sub>c</sub> = ${fmtg(state.sim.g.zg - el.cim)} m</div>` : '';
    $('props').innerHTML = `<div class="prop-head"><h3>${TYPE[el.type]}</h3><button class="btn btn-small btn-danger" id="btn-del" type="button">Borrar</button></div>
      <div class="pgrid">${FIELDS[el.type].map(([p, l, k]) => field(p, l, k, get(el, p), 'e')).join('')}${extra}</div>`;
    $('btn-del').onclick = () => removeEl(el.id);
  }

  function renderAquifer() {
    const c = state.cfg, g = state.sim.g;
    // el suelo sólo se muestra como tipo si K y S coinciden con su valor típico
    const match = Object.keys(E.SOILS).find((k) => E.SOILS[k].K === c.K && E.SOILS[k].S === c.S);
    c.soil = match || 'custom';
    const soilOpts = Object.entries(E.SOILS).map(([k, s]) => `<option value="${k}"${c.soil === k ? ' selected' : ''}>${s.name} (K≈${fmtg(s.K)} m/d)</option>`).join('') + `<option value="custom"${!E.SOILS[c.soil] ? ' selected' : ''}>Personalizado</option>`;
    const bc = (s, l) => `<label class="pfield"><span>${l}</span><select data-path="bc.${s}" id="a-bc-${s}"><option value="fijo"${c.bc[s] === 'fijo' ? ' selected' : ''}>Nivel fijo</option><option value="impermeable"${c.bc[s] === 'impermeable' ? ' selected' : ''}>Impermeable</option></select></label>`;
    $('aquifer').innerHTML = `
      <fieldset class="pgroup"><legend>Modelo físico</legend><div class="pgrid"><label class="pfield full"><span>Comportamiento del acuífero</span><select data-path="model" id="a-model"><option value="linear"${c.model !== 'unconfined' ? ' selected' : ''}>Lineal · T constante (ejercicios)</option><option value="unconfined"${c.model === 'unconfined' ? ' selected' : ''}>Libre · T = K·h (espesor variable)</option></select></label><p class="hint">El modo libre ajusta la transmisividad al espesor saturado. Terreno plano, suelo homogéneo y flujo horizontal; río y dren ideales.</p></div></fieldset>
      <fieldset class="pgroup"><legend>Suelo y acuífero</legend><div class="pgrid">
        <label class="pfield full"><span>Tipo de suelo</span><select id="a-soil" data-path="soil">${soilOpts}</select></label>
        ${field('K', 'K [m/día]', 'num', c.K, 'a')}${field('S', 'S<sub>y</sub> [–]', 'num', c.S, 'a')}
        ${field('b', 'Espesor b [m]', 'num', c.b, 'a')}${field('depth0', 'Freático a [m]', 'num', c.depth0, 'a')}
        <div class="derived">T = K·b = <b>${fmtg(g.T)}</b> m²/día · D = T/S = ${fmtg(g.D)} m²/día<br>z<sub>terreno</sub> = ${fmtg(g.zg)} m · h₀ = ${fmtg(g.h0)} m (base = 0)</div>
      </div></fieldset>
      <fieldset class="pgroup"><legend>Dominio y bordes</legend><div class="pgrid">
        ${field('Lx', 'L<sub>x</sub> [m]', 'num', c.Lx, 'a')}${field('Ly', 'L<sub>y</sub> [m]', 'num', c.Ly, 'a')}
        ${field('dx', 'Resolución objetivo [m]', 'num', c.dx, 'a')}${field('tEnd', 'Horizonte [días]', 'num', c.tEnd, 'a')}
        ${bc('west', 'Oeste')}${bc('east', 'Este')}${bc('south', 'Sur')}${bc('north', 'Norte')}
        <div class="derived">${g.Nx}×${g.Ny} = ${g.N} nodos · Δx=${fmtg(g.hx)} m · Δy=${fmtg(g.hy)} m<br>Paso estable inicial ≤ ${fmtg(E.stableDt(g, state.sim.h), 4)} d; se ajusta a los eventos y al horizonte</div>
      </div></fieldset>
      <fieldset class="pgroup"><legend>Lluvia</legend><div class="pgrid">
        ${field('rain.R', 'Recarga neta [mm/año]', 'num', c.rain.R, 'a')}
        ${field('rain.seasonal', 'Sólo de octubre a abril', 'chk', c.rain.seasonal, 'a')}
      </div></fieldset>`;
  }

  /* ------------------------------------------------------------------ */
  /* Carga de problemas                                                  */
  /* ------------------------------------------------------------------ */
  function loadProblem(id) {
    state.advisor?.cancel();
    stop();
    const pb = P.PROBLEMS.find((p) => p.id === id) || P.PROBLEMS[0];
    state.problem = pb;
    state.cfg = pb.cfg();
    if(new URLSearchParams(location.search).get('model') === 'unconfined') state.cfg.model='unconfined';
    state.sel = null;
    state.sim = new E.Sim(state.cfg);
    state.view3d.setGrid(state.sim.g, parseFloat($('exag').value) || 1);
    state.view3d.setElements(state.cfg.elements, null);
    // velocidad: el horizonte completo en unos 15 s
    const target = state.cfg.tEnd / 15;
    const opts = Array.from($('speed').options).map((o) => +o.value);
    $('speed').value = String(opts.reduce((a, b) => (Math.abs(b - target) < Math.abs(a - target) ? b : a)));
    $('pb-tag').textContent = `Problema ${P.PROBLEMS.indexOf(pb) + 1} · ${pb.tag}`;
    $('pb-title').textContent = pb.title;
    $('pb-statement').innerHTML = pb.statement;
    $('pb-questions').innerHTML = pb.questions.map((q, k) => `<li><span>${q}</span><div class="answer" id="ans-${k}" hidden></div></li>`).join('');
    $('solution').hidden = true;
    state.solved = false;
    state.steadyStale = true;
    $('chart-kind').value = chartKinds()[pb.id === 'p7' ? chartKinds().length - 1 : 0];
    afterHardChange();
    state.advisor?.invalidate();
    try { history.replaceState(null, '', '#' + pb.id); } catch (e) { /* sin historial */ }
  }

  function afterHardChange() {
    renderAquifer(); renderProps(); renderFormulation();
    state.view3d.update(state.sim);
    drawPlan(); renderStatus(); renderEvents(); renderChart(true); updateClock();
  }

  /* ------------------------------------------------------------------ */
  /* Cambios de configuración                                            */
  /* ------------------------------------------------------------------ */
  function elementsChanged() {
    state.sim.setConfig(state.cfg, false);
    state.view3d.setElements(state.cfg.elements, state.sel);
    state.view3d.update(state.sim, viewField());
    state.steadyStale = true;
    markUnsolved();
    renderProps(); renderStatus(); renderFormulation(); drawPlan();
  }
  function aquiferChanged() {
    stop();
    state.sim.setConfig(state.cfg, true);
    state.view3d.setGrid(state.sim.g, parseFloat($('exag').value) || 1);
    state.view3d.setElements(state.cfg.elements, state.sel);
    state.steadyStale = true;
    markUnsolved();
    afterHardChange();
  }
  function markUnsolved() {
    state.advisor?.invalidate();
    if (!state.solved) return;
    state.solved = false;
    $('solution').hidden = true;
    document.querySelectorAll('.answer').forEach((a) => { a.hidden = true; });
  }
  function removeEl(id) {
    state.cfg.elements = state.cfg.elements.filter((e) => e.id !== id);
    if (state.sel === id) state.sel = null;
    elementsChanged();
  }

  function onPropInput(e) {
    const t = e.target, path = t.dataset.path;
    if (!path) return;
    const el = elById(state.sel); if (!el) return;
    let v;
    if (t.type === 'checkbox') v = t.checked;
    else if (t.type === 'number') { v = t.value === '' ? (t.dataset.kind === 'opt' ? null : 0) : parseFloat(t.value); if (v !== null && !isFinite(v)) return; }
    else v = t.value;
    const previous=clone(el);
    set(el, path, v);
    if (el.type === 'canal' || el.type === 'poza') { el.eff = Math.max(0, Math.min(100, el.eff ?? 0)); }
    try { E.validate(state.cfg); } catch(err) { for(const k of Object.keys(el))delete el[k];Object.assign(el,previous);$('export-status').textContent=err.message;renderProps();return; }
    const keepFocus = t.id;
    elementsChanged();
    const again = $(keepFocus); if (again && e.type === 'input' && again !== document.activeElement) again.focus();
  }

  function onAquiferInput(e) {
    const t = e.target, path = t.dataset.path; if (!path) return;
    const c = state.cfg, previous = clone(state.cfg);
    if (path === 'soil') {
      c.soil = t.value;
      if (E.SOILS[t.value]) { c.K = E.SOILS[t.value].K; c.S = E.SOILS[t.value].S; }
    } else {
      let v = t.type === 'checkbox' ? t.checked : t.tagName === 'SELECT' ? t.value : parseFloat(t.value);
      if (t.type === 'number' && !isFinite(v)) return;
      set(c, path, v);
      if (path === 'K' || path === 'S') c.soil = 'custom';
    }
    const errs = [];
    if (!(c.K > 0 && c.b > 0 && c.S > 0 && c.S <= 1)) errs.push('K y b positivos; 0 < S ≤ 1.');
    if (!(c.dx > 0 && c.Lx >= 4 * c.dx && c.Ly >= 4 * c.dx)) errs.push('El dominio necesita al menos 5 nodos por lado.');
    if ((Math.round(c.Lx / c.dx) + 1) * (Math.round(c.Ly / c.dx) + 1) > 40000) errs.push('Más de 40 000 nodos: aumente Δx.');
    if (!(c.tEnd > 0)) errs.push('El horizonte debe ser positivo.');
    if (!(c.depth0 >= 0)) errs.push('La profundidad del freático no puede ser negativa.');
    try { E.validate(c); } catch(err) { errs.push(err.message); }
    if (errs.length) { for (const k of Object.keys(c)) delete c[k]; Object.assign(c,previous); $('export-status').textContent = errs.join(' '); renderAquifer(); return; }
    $('export-status').textContent = '';
    if (path.startsWith('rain')) { state.sim.cfg = c; state.sim.sig = null; state.steadyStale = true; markUnsolved(); renderFormulation(); return; }
    if (path === 'tEnd') { state.sim.cfg = c; state.steadyStale = true; markUnsolved(); renderAquifer(); updateClock(); return; }
    aquiferChanged();
  }

  /* ------------------------------------------------------------------ */
  /* Planta                                                              */
  /* ------------------------------------------------------------------ */
  function depthColor(d) { const c = V3.depthRGB(d); return [c[0] * 255, c[1] * 255, c[2] * 255]; }
  function riseColor(v, a) {
    const f = Math.max(-1, Math.min(1, v / a));
    if (f >= 0) return [255, 255 - 170 * f, 255 - 200 * f];
    return [255 + 215 * f, 255 + 120 * f, 255];
  }
  function viewField() {
    const v = $('view').value;
    if (v === 'steady') { ensureSteady(); return state.steady && state.steady.exists ? state.steady.h : null; }
    return null;
  }
  function ensureSteady() {
    if (!state.steadyStale && state.steady) return;
    state.steady = E.steady(state.cfg);
    state.steadyStale = false;
    if (!state.steady.exists) $('export-status').textContent = state.steady.reason;
  }

  function geom() {
    const wrap = $('plan-wrap');
    const W = Math.max(280, wrap.clientWidth);
    const pad = 34, c = state.cfg;
    let sc = (W - pad - 14) / c.Lx;
    const maxH = 470;
    if (c.Ly * sc + pad + 14 > maxH) sc = (maxH - pad - 14) / c.Ly;
    const H = Math.round(c.Ly * sc + pad + 14);
    const ox = pad, oy = 10;
    return { W, H, sc, ox, oy };
  }
  const toPx = (x, y) => [state.geom.ox + x * state.geom.sc, state.geom.oy + (state.cfg.Ly - y) * state.geom.sc];
  const toW = (px, py) => [(px - state.geom.ox) / state.geom.sc, state.cfg.Ly - (py - state.geom.oy) / state.geom.sc];
  const snap = (v) => Math.round(v / (state.cfg.dx / 2)) * (state.cfg.dx / 2);
  const clampX = (v) => Math.max(0, Math.min(state.cfg.Lx, v));
  const clampY = (v) => Math.max(0, Math.min(state.cfg.Ly, v));

  let off = null;
  function drawPlan() {
    const cv = $('plan'), g = state.sim.g, c = state.cfg;
    state.geom = geom();
    const { W, H, sc, ox, oy } = state.geom;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    if (cv.width !== Math.round(W * dpr) || cv.height !== Math.round(H * dpr)) { cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr); cv.style.height = H + 'px'; }
    const ctx = cv.getContext('2d');
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const cs = getComputedStyle(document.documentElement);
    const ink = cs.getPropertyValue('--ink').trim(), muted = cs.getPropertyValue('--muted').trim(), bg = cs.getPropertyValue('--surface').trim();
    ctx.fillStyle = bg; ctx.fillRect(0, 0, W, H);
    // campo
    if (!off || off.width !== g.Nx || off.height !== g.Ny) { off = document.createElement('canvas'); off.width = g.Nx; off.height = g.Ny; }
    const octx = off.getContext('2d');
    const img = octx.createImageData(g.Nx, g.Ny);
    const view = $('view').value;
    const steadyH = view === 'steady' ? viewField() : null;
    const h = steadyH || state.sim.h;
    let amax = 0.25;
    if (view === 'rise') for (let k = 0; k < g.N; k++) amax = Math.max(amax, Math.abs(h[k] - g.h0));
    for (let j = 0; j < g.Ny; j++) for (let i = 0; i < g.Nx; i++) {
      const k = j * g.Nx + i, p = ((g.Ny - 1 - j) * g.Nx + i) * 4;
      const col = view === 'rise' ? riseColor(h[k] - g.h0, amax) : depthColor(g.zg - h[k]);
      img.data[p] = col[0]; img.data[p + 1] = col[1]; img.data[p + 2] = col[2]; img.data[p + 3] = 255;
    }
    octx.putImageData(img, 0, 0);
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(off, ox, oy, c.Lx * sc, c.Ly * sc);
    window.SimVisuals.overlays(ctx,g,h,toPx,{contours:$('show-contours').checked,flow:$('show-flow').checked,profile:+$('profile-y').value});
    window.SimVisuals.profile($('profile'),g,h,+$('profile-y').value);
    $('profile-position').textContent = `y = ${fmt(c.Ly * +$('profile-y').value/100,0)} m`;
    // bordes del dominio: fijo = línea azul gruesa
    const bcLine = (s, x1, y1, x2, y2) => {
      const [a, b] = toPx(x1, y1), [d, e] = toPx(x2, y2);
      ctx.strokeStyle = c.bc[s] === 'fijo' ? '#1f6fb2' : '#6b5a48'; ctx.lineWidth = c.bc[s] === 'fijo' ? 4 : 1.5;
      ctx.setLineDash(c.bc[s] === 'fijo' ? [] : [5, 4]);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(d, e); ctx.stroke(); ctx.setLineDash([]);
    };
    bcLine('west', 0, 0, 0, c.Ly); bcLine('east', c.Lx, 0, c.Lx, c.Ly); bcLine('south', 0, 0, c.Lx, 0); bcLine('north', 0, c.Ly, c.Lx, c.Ly);
    // ejes
    ctx.fillStyle = muted; ctx.font = '11px "JetBrains Mono", monospace'; ctx.textAlign = 'center';
    const step = nice(Math.max(c.Lx, c.Ly) / 6);
    for (let x = 0; x <= c.Lx + 1e-6; x += step) { const [px, py] = toPx(x, 0); ctx.fillText(fmtg(x), px, py + 14); }
    ctx.textAlign = 'right';
    for (let y = 0; y <= c.Ly + 1e-6; y += step) { const [px, py] = toPx(0, y); ctx.fillText(fmtg(y), px - 5, py + 4); }
    // elementos
    state.labelBoxes = [];
    const els = state.cfg.elements.slice().sort((a, b) => order(a.type) - order(b.type));
    for (const el0 of els) {
      const el = state.drag && state.drag.id === el0.id && state.drag.preview ? state.drag.preview : el0;
      drawEl(ctx, el, el.id === state.sel, ink);
    }
    // vista previa al dibujar
    const d = state.drag;
    if (d && (d.mode === 'newseg' || d.mode === 'newrect')) {
      ctx.strokeStyle = ink; ctx.lineWidth = 2; ctx.setLineDash([6, 4]);
      const [a, b] = toPx(d.a[0], d.a[1]), [e, f] = toPx(d.b[0], d.b[1]);
      ctx.beginPath();
      if (d.mode === 'newseg') { ctx.moveTo(a, b); ctx.lineTo(e, f); } else ctx.rect(Math.min(a, e), Math.min(b, f), Math.abs(e - a), Math.abs(f - b));
      ctx.stroke(); ctx.setLineDash([]);
    }
    renderLegend(view, amax);
    renderBudget();
  }
  const order = (t) => ['rio', 'poza', 'fosa', 'canal', 'dren', 'pozo', 'casa'].indexOf(t);
  function nice(v) { const p = 10 ** Math.floor(Math.log10(v)); return [1, 2, 5, 10].map((m) => m * p).find((m) => m >= v) || 10 * p; }

  function drawEl(ctx, el, selected, ink) {
    const st = state.sim.mon;
    ctx.save();
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const label = (txt, x, y) => {
      ctx.font = '600 11px "Source Sans 3", sans-serif'; ctx.textAlign = 'center';
      const w = ctx.measureText(txt).width + 8;
      const r = [x - w / 2, y - 11, w, 14];
      const clash = (state.labelBoxes || []).some((o) => r[0] < o[0] + o[2] && o[0] < r[0] + r[2] && r[1] < o[1] + o[3] && o[1] < r[1] + r[3]);
      if (clash && !selected) return;
      (state.labelBoxes = state.labelBoxes || []).push(r);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x - w / 2, y - 11, w, 14);
      ctx.fillStyle = '#13242c'; ctx.fillText(txt, x, y);
    };
    if (el.type === 'canal' || el.type === 'dren' || el.type === 'rio') {
      const [a, b] = toPx(el.x1, el.y1), [c, d] = toPx(el.x2, el.y2);
      ctx.beginPath(); ctx.moveTo(a, b); ctx.lineTo(c, d);
      if (el.type === 'rio') { ctx.strokeStyle = '#1d5f99'; ctx.lineWidth = 9; ctx.stroke(); ctx.strokeStyle = '#4aa3df'; ctx.lineWidth = 5; ctx.stroke(); }
      else if (el.type === 'canal') { ctx.strokeStyle = el.lined ? '#8a949a' : '#6b4f33'; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = '#3b8fc4'; ctx.lineWidth = 3; ctx.stroke(); }
      else { ctx.strokeStyle = '#2f8a43'; ctx.lineWidth = 4; ctx.setLineDash([7, 5]); ctx.stroke(); ctx.setLineDash([]); }
      if (selected) handles(ctx, [[a, b], [c, d]]);
      label(el.type === 'canal' && el.lined ? `${el.name} (revestido)` : el.name, (a + c) / 2, (b + d) / 2 - 8);
    } else if (el.type === 'poza' || el.type === 'fosa') {
      const [a, b] = toPx(Math.min(el.x1, el.x2), Math.max(el.y1, el.y2)), [c, d] = toPx(Math.max(el.x1, el.x2), Math.min(el.y1, el.y2));
      if (el.type === 'poza') { ctx.fillStyle = el.membrane ? 'rgba(40,40,40,0.75)' : 'rgba(79,143,106,0.85)'; ctx.fillRect(a, b, c - a, d - b); ctx.fillStyle = 'rgba(79,160,120,0.9)'; ctx.fillRect(a + 3, b + 3, c - a - 6, d - b - 6); }
      else {
        const m = st.fosa[el.id];
        ctx.fillStyle = 'rgba(74,59,44,0.55)'; ctx.fillRect(a, b, c - a, d - b);
        ctx.strokeStyle = m && m.dryNow ? '#2c9a5a' : '#ff9f1c'; ctx.lineWidth = 3; ctx.strokeRect(a, b, c - a, d - b);
        ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
        for (let x = a - (d - b); x < c; x += 8) { ctx.beginPath(); ctx.moveTo(Math.max(a, x), b + Math.max(0, a - x)); ctx.lineTo(Math.min(c, x + (d - b)), Math.min(d, b + (c - x))); ctx.stroke(); }
      }
      if (selected) handles(ctx, [[a, b], [c, d], [a, d], [c, b]]);
      label(el.name, (a + c) / 2, b - 4);
    } else if (el.type === 'pozo') {
      const [a, b] = toPx(el.x, el.y);
      ctx.fillStyle = el.Q > 0 ? '#c0392b' : '#ffffff'; ctx.strokeStyle = '#13242c'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(a, b, 7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(a - 10, b); ctx.lineTo(a + 10, b); ctx.moveTo(a, b - 10); ctx.lineTo(a, b + 10); ctx.stroke();
      if (selected) handles(ctx, [[a, b]]);
      label(el.name, a, b - 13);
    } else if (el.type === 'casa') {
      const [a, b] = toPx(el.x, el.y);
      const m = st.casa[el.id];
      const s = m ? m.state : 'ok';
      const fill = s === 'ok' ? '#f1ece2' : s === 'alerta' ? '#f0a540' : s === 'afectada' ? '#d03b3b' : '#8b2fc9';
      ctx.fillStyle = fill; ctx.strokeStyle = '#13242c'; ctx.lineWidth = 1.6;
      ctx.beginPath(); ctx.moveTo(a - 8, b + 7); ctx.lineTo(a - 8, b - 2); ctx.lineTo(a, b - 9); ctx.lineTo(a + 8, b - 2); ctx.lineTo(a + 8, b + 7); ctx.closePath(); ctx.fill(); ctx.stroke();
      if (selected) handles(ctx, [[a, b]]);
      label(el.name, a, b - 13);
    }
    ctx.restore();
  }
  function handles(ctx, pts) {
    ctx.fillStyle = '#ffb000'; ctx.strokeStyle = '#13242c'; ctx.lineWidth = 1.5;
    for (const [x, y] of pts) { ctx.beginPath(); ctx.rect(x - 5, y - 5, 10, 10); ctx.fill(); ctx.stroke(); }
  }

  function renderLegend(view, amax) {
    if (view === 'rise') {
      $('legend').innerHTML = `<span>Δh</span><div style="flex:1 1 160px;min-width:120px"><div class="bar" style="background:linear-gradient(90deg,#2846ff,#fff,#ff5537)"></div><div class="ticks"><span>−${fmtg(amax, 2)} m</span><span>0</span><span>+${fmtg(amax, 2)} m</span></div></div>`;
    } else {
      const stops = [0, 1, 2, 3, 6, 12];
      const grad = stops.map((d, i) => { const c = depthColor(d); return `rgb(${c.map(Math.round).join(',')}) ${(i / (stops.length - 1)) * 100}%`; }).join(',');
      $('legend').innerHTML = `<span>Profundidad del agua</span><div style="flex:1 1 160px;min-width:120px"><div class="bar" style="background:linear-gradient(90deg,${grad})"></div><div class="ticks">${stops.map((d) => `<span>${d} m</span>`).join('')}</div></div>${view === 'steady' ? '<span class="pill info">Destino final</span>' : ''}`;
    }
  }

  /* ------------------------------------------------------------------ */
  /* Interacción en la planta                                            */
  /* ------------------------------------------------------------------ */
  function hit(px, py) {
    const els = state.cfg.elements.slice().sort((a, b) => order(b.type) - order(a.type));
    for (const el of els) {
      if (el.type === 'casa' || el.type === 'pozo') { const [a, b] = toPx(el.x, el.y); if (Math.hypot(px - a, py - b) < 12) return { el, part: 'body' }; }
      else if (el.type === 'canal' || el.type === 'dren' || el.type === 'rio') {
        const [a, b] = toPx(el.x1, el.y1), [c, d] = toPx(el.x2, el.y2);
        if (el.id === state.sel && Math.hypot(px - a, py - b) < 9) return { el, part: 'p1' };
        if (el.id === state.sel && Math.hypot(px - c, py - d) < 9) return { el, part: 'p2' };
        if (distSeg(px, py, a, b, c, d) < 8) return { el, part: 'body' };
      } else {
        const [a, b] = toPx(el.x1, el.y1), [c, d] = toPx(el.x2, el.y2);
        if (el.id === state.sel && Math.hypot(px - a, py - b) < 9) return { el, part: 'p1' };
        if (el.id === state.sel && Math.hypot(px - c, py - d) < 9) return { el, part: 'p2' };
        if (px >= Math.min(a, c) - 4 && px <= Math.max(a, c) + 4 && py >= Math.min(b, d) - 4 && py <= Math.max(b, d) + 4) return { el, part: 'body' };
      }
    }
    return null;
  }
  function distSeg(px, py, a, b, c, d) {
    const vx = c - a, vy = d - b, L = vx * vx + vy * vy;
    const t = L ? Math.max(0, Math.min(1, ((px - a) * vx + (py - b) * vy) / L)) : 0;
    return Math.hypot(px - a - t * vx, py - b - t * vy);
  }
  const evPx = (e) => { const r = $('plan').getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; };

  function newElement(type, w, w2) {
    const n = state.cfg.elements.filter((e) => e.type === type).length + 1;
    const F = P.factories;
    const c = state.cfg;
    if (type === 'casa') return F.casa(`Casa ${n}`, w[0], w[1], 1.5);
    if (type === 'pozo') return F.pozo(`Pozo ${n}`, w[0], w[1], 500, { depth: Math.min(c.b + c.depth0, 30), limit: 2 });
    if (type === 'canal') return F.canal(w[0], w[1], w2[0], w2[1], 0.5, { name: `Canal ${n}` });
    if (type === 'dren') return F.dren(w[0], w[1], w2[0], w2[1], c.depth0, { name: `Dren ${n}` });
    if (type === 'rio') return F.rio(`Río ${n}`, w[0], w[1], w2[0], w2[1]);
    if (type === 'poza') return F.poza(`Poza ${n}`, Math.min(w[0], w2[0]), Math.min(w[1], w2[1]), Math.max(w[0], w2[0]), Math.max(w[1], w2[1]), 0.03);
    if (type === 'fosa') return F.fosa(`Fosa ${n}`, Math.min(w[0], w2[0]), Math.min(w[1], w2[1]), Math.max(w[0], w2[0]), Math.max(w[1], w2[1]), 5);
    return null;
  }

  function onDown(e) {
    const [px, py] = evPx(e);
    const w = toW(px, py).map((v, i) => (i ? clampY(snap(v)) : clampX(snap(v))));
    $('plan').setPointerCapture(e.pointerId);
    const t = state.tool;
    if (t === 'select' || t === 'borrar') {
      const h = hit(px, py);
      if (t === 'borrar') { if (h) removeEl(h.el.id); return; }
      if (!h) { state.sel = null; renderProps(); state.view3d.setElements(state.cfg.elements, null); drawPlan(); renderStatus(); return; }
      if (state.sel !== h.el.id) { state.sel = h.el.id; renderProps(); state.view3d.setElements(state.cfg.elements, state.sel); renderStatus(); }
      state.drag = { mode: 'move', part: h.part, id: h.el.id, start: w, orig: clone(h.el), preview: clone(h.el), moved: false };
      drawPlan();
      return;
    }
    if (t === 'casa' || t === 'pozo') {
      const el = newElement(t, w);
      state.cfg.elements.push(el); state.sel = el.id;
      elementsChanged();
      return;
    }
    if (['canal', 'dren', 'rio'].includes(t)) state.drag = { mode: 'newseg', type: t, a: w, b: w };
    if (['poza', 'fosa'].includes(t)) state.drag = { mode: 'newrect', type: t, a: w, b: w };
  }
  function onMove(e) {
    const [px, py] = evPx(e);
    if (!state.geom) return;
    const wr = toW(px, py);
    $('cursor').textContent = (wr[0] >= 0 && wr[0] <= state.cfg.Lx && wr[1] >= 0 && wr[1] <= state.cfg.Ly)
      ? `x ${fmt(wr[0], 0)} m, y ${fmt(wr[1], 0)} m · agua a ${fmt(state.sim.g.zg - E.interp(state.sim.g, state.sim.h, wr[0], wr[1]), 2)} m` : 'x —, y —';
    const d = state.drag; if (!d) return;
    const w = [clampX(snap(wr[0])), clampY(snap(wr[1]))];
    if (d.mode === 'newseg' || d.mode === 'newrect') { d.b = w; drawPlan(); return; }
    if (d.mode === 'move') {
      const dx = w[0] - d.start[0], dy = w[1] - d.start[1];
      if (dx || dy) d.moved = true;
      const o = d.orig, p = d.preview;
      if ('x' in o) { p.x = clampX(o.x + dx); p.y = clampY(o.y + dy); }
      else if (d.part === 'p1') { p.x1 = clampX(o.x1 + dx); p.y1 = clampY(o.y1 + dy); }
      else if (d.part === 'p2') { p.x2 = clampX(o.x2 + dx); p.y2 = clampY(o.y2 + dy); }
      else {
        const ddx = Math.max(-Math.min(o.x1, o.x2), Math.min(state.cfg.Lx - Math.max(o.x1, o.x2), dx));
        const ddy = Math.max(-Math.min(o.y1, o.y2), Math.min(state.cfg.Ly - Math.max(o.y1, o.y2), dy));
        p.x1 = o.x1 + ddx; p.x2 = o.x2 + ddx; p.y1 = o.y1 + ddy; p.y2 = o.y2 + ddy;
      }
      drawPlan();
    }
  }
  function onUp() {
    const d = state.drag; state.drag = null;
    if (!d) return;
    if (d.mode === 'newseg' || d.mode === 'newrect') {
      const L = d.mode === 'newseg' ? Math.hypot(d.b[0] - d.a[0], d.b[1] - d.a[1]) : Math.min(Math.abs(d.b[0] - d.a[0]), Math.abs(d.b[1] - d.a[1]));
      if (L < state.cfg.dx) { drawPlan(); $('tool-hint').textContent = 'Arrastre un poco más: el elemento debe medir al menos un Δx.'; return; }
      const el = newElement(d.type, d.a, d.b);
      state.cfg.elements.push(el); state.sel = el.id;
      elementsChanged();
      $('tool-hint').textContent = HINT[state.tool];
      return;
    }
    if (d.mode === 'move' && d.moved) {
      const el = elById(d.id);
      Object.assign(el, d.preview);
      elementsChanged();
    } else drawPlan();
  }

  function setTool(t) {
    state.tool = t;
    document.querySelectorAll('.tool').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.tool === t)));
    $('tool-hint').textContent = HINT[t];
    $('plan').classList.toggle('mode-select', t === 'select');
  }

  /* ------------------------------------------------------------------ */
  /* Tablero, eventos y gráfica                                          */
  /* ------------------------------------------------------------------ */
  function renderStatus() {
    const s = state.sim, g = s.g, out = [];
    for (const id in s.mon.casa) {
      const m = s.mon.casa[id];
      const h = m.h ?? E.interp(g, s.h, m.el.x, m.el.y);
      const lab = { ok: 'segura', alerta: 'alerta', afectada: 'agua en cimentación', inundada: 'agua en superficie' }[m.state];
      out.push(`<div class="st-item ${m.state}${state.sel === id ? ' sel' : ''}" data-id="${id}"><b>${esc(m.el.name)} · ${lab}</b><span>agua a ${fmt(g.zg - h, 2)} m · cim. ${fmtg(m.el.cim)} m</span></div>`);
    }
    for (const id in s.mon.pozo) {
      const m = s.mon.pozo[id];
      const sd = g.h0 - s.h[m.k];
      const bad = m.tDry !== null || (m.el.limit && sd >= m.el.limit);
      out.push(`<div class="st-item ${bad ? 'bad' : ''}${state.sel === id ? ' sel' : ''}" data-id="${id}"><b>${esc(m.el.name)}${m.el.Q > 0 && E.active(m.el, s.t) ? ' · bombeando' : ''}</b><span>abatimiento ${fmt(sd, 2)} m${m.el.limit ? ` / adm. ${fmtg(m.el.limit)} m` : ''}</span></div>`);
    }
    for (const id in s.mon.fosa) {
      const m = s.mon.fosa[id];
      const hm = m.h ?? g.h0;
      out.push(`<div class="st-item ${m.dryNow ? '' : 'alerta'}${state.sel === id ? ' sel' : ''}" data-id="${id}"><b>${esc(m.el.name)} · ${m.dryNow ? 'seca' : 'con agua'}</b><span>agua a ${fmt(g.zg - hm, 2)} m · se necesita ${fmtg(m.el.depth + (m.el.margin ?? 0.5))} m</span></div>`);
    }
    if (s.lay.drains.length) out.push(`<div class="st-item"><b>Drenes · caudal captado</b><span>${fmt(E.drainFlux(g, s.lay, s.h, s.Qs || new Float64Array(g.N)), 1)} m³/día</span></div>`);
    const fa = E.floodArea(g, s.h);
    if (fa > 0) out.push(`<div class="st-item inundada"><b>Terreno empantanado</b><span>${fmt(fa / 1e4, 2)} ha · aflora ${fmt(s.seepQ || 0, 0)} m³/día</span></div>`);
    $('status').innerHTML = out.join('') || '<p class="hint">Agregue casas, pozos o fosas para seguir su estado.</p>';
  }
  function renderEvents() {
    const ev = state.sim.events;
    const ol = $('events');
    if (ol.childElementCount === ev.length) return;
    ol.innerHTML = ev.map((e) => `<li class="${e.kind}"><span class="t">día ${fmt(e.t, 1)}</span><span>${esc(e.text)}</span></li>`).join('');
    ol.scrollTop = ol.scrollHeight;
  }

  function renderChart(force) {
    const s = state.sim, g = s.g, kind = $('chart-kind').value;
    const th = chartTheme();
    const t = s.series.t;
    const palette = ['#0e6b87', '#c0702e', '#5a7d2a', '#7c4f9e', '#b23a3a', '#2a9d8f', '#8d6e63', '#3d5a80'];
    const data = [];
    let ytitle = '', yrev = false;
    if (kind === 'casa') {
      ytitle = 'Profundidad del agua [m]'; yrev = true;
      Object.values(s.mon.casa).forEach((m, i) => {
        data.push({ type: 'scatter', mode: 'lines', x: t, y: m.series.map((v) => g.zg - v), name: m.el.name, line: { color: palette[i % 8], width: 2 } });
        data.push({ type: 'scatter', mode: 'lines', x: [0, state.cfg.tEnd], y: [m.el.cim, m.el.cim], name: `${m.el.name}: cimentación`, line: { color: palette[i % 8], width: 1, dash: 'dot' }, showlegend: false, hoverinfo: 'skip' });
      });
    } else if (kind === 'pozo') {
      ytitle = 'Abatimiento s [m]'; yrev = true;
      Object.values(s.mon.pozo).forEach((m, i) => {
        data.push({ type: 'scatter', mode: 'lines', x: t, y: m.series, name: m.el.name, line: { color: palette[i % 8], width: 2 } });
        if (m.el.limit) data.push({ type: 'scatter', mode: 'lines', x: [0, state.cfg.tEnd], y: [m.el.limit, m.el.limit], name: `${m.el.name}: admisible`, line: { color: palette[i % 8], width: 1, dash: 'dot' }, showlegend: false });
      });
    } else if (kind === 'fosa') {
      ytitle = 'Profundidad del agua en la fosa [m]'; yrev = true;
      Object.values(s.mon.fosa).forEach((m, i) => {
        data.push({ type: 'scatter', mode: 'lines', x: t, y: m.series.map((v) => g.zg - v), name: m.el.name, line: { color: palette[i % 8], width: 2 } });
        const need = m.el.depth + (m.el.margin ?? 0.5);
        data.push({ type: 'scatter', mode: 'lines', x: [0, state.cfg.tEnd], y: [need, need], name: 'Profundidad requerida', line: { color: th.bad, width: 1.5, dash: 'dash' } });
      });
    } else if (kind === 'dren') {
      ytitle = 'Caudal [m³/día]';
      data.push({ type: 'scatter', mode: 'lines', x: t, y: s.series.drain || [], name: 'Captado por drenes', line: { color: palette[2], width: 2 } });
      data.push({ type: 'scatter', mode: 'lines', x: t, y: s.series.seep || [], name: 'Aflora en superficie', line: { color: '#8b2fc9', width: 2 } });
    } else if (kind === 'rio') {
      ytitle = 'Nivel [m sobre la base]';
      if (s.series.river) data.push({ type: 'scatter', mode: 'lines', x: t, y: s.series.river, name: 'Río', line: { color: '#1f6fb2', width: 2.5 } });
      Object.values(s.mon.casa).forEach((m, i) => data.push({ type: 'scatter', mode: 'lines', x: t, y: m.series, name: `h en ${m.el.name}`, line: { color: palette[(i + 1) % 8], width: 1.5 } }));
    }
    if (!data.length) data.push({ type: 'scatter', x: [], y: [], name: 'Sin datos para esta gráfica' });
    const layout = {
      paper_bgcolor: th.bg, plot_bgcolor: th.bg, font: { color: th.ink, family: 'Source Sans 3, sans-serif', size: 12 },
      margin: { l: 58, r: 16, t: 10, b: 44 }, separators: ', ', showlegend: true, legend: { orientation: 'h', y: -0.25 },
      xaxis: { title: { text: 't [días]' }, range: [0, state.cfg.tEnd], gridcolor: th.line, zerolinecolor: th.line },
      yaxis: { title: { text: ytitle }, autorange: yrev ? 'reversed' : true, gridcolor: th.line, zerolinecolor: th.line },
      shapes: [{ type: 'line', x0: s.t, x1: s.t, yref: 'paper', y0: 0, y1: 1, line: { color: th.muted, width: 1, dash: 'dot' } }],
    };
    if (!window.Plotly) { window.SimVisuals.timeChart($('chart'),data,layout); return; }
    Plotly.react($('chart'), data, layout, { responsive: true, displaylogo: false, locale: 'es' });
    void force;
  }
  /** Tipos de gráfica con datos para el escenario actual. */
  function chartKinds() {
    const c = state.cfg, has = (t) => c.elements.some((e) => e.type === t);
    const out = [];
    if (has('casa')) out.push('casa');
    if (has('pozo')) out.push('pozo');
    if (has('fosa')) out.push('fosa');
    if (has('dren') || (state.sim.series.seep || []).some((v) => v > 0)) out.push('dren');
    if (has('rio')) out.push('rio');
    return out.length ? out : ['casa'];
  }
  function chartTheme() {
    const cs = getComputedStyle(document.documentElement), v = (n) => cs.getPropertyValue(n).trim();
    return { ink: v('--ink'), muted: v('--muted'), line: v('--line'), bg: v('--surface'), bad: v('--bad') };
  }

  function renderBudget() {
    const b=state.sim.budget;
    const val=v=>new Intl.NumberFormat('es-PE',{maximumFractionDigits:0}).format(v)+' m³';
    $('b-recharge').textContent=val(b.recharge);
    $('b-storage').textContent=val(b.storage);
    $('b-out').textContent=val(b.pumping-b.unmet+b.drain+b.seep);
    $('b-boundary').textContent=val(b.boundary);
    const total=b.recharge+b.pumping+Math.abs(b.boundary)+b.drain+b.seep;
    const error=total>1e-6 ? 100*Math.abs(b.residual)/total : 0;
    $('balance-note').innerHTML=`<strong>Cierre del balance: ${error.toFixed(6)} %</strong> · Residuo ${b.residual.toExponential(2)} m³ · Paso usado ${fmt(state.sim.lastDt,4)} d${b.unmet>1e-6 ? ' · Bombeo no satisfecho por falta de agua: '+val(b.unmet) : ''}`;
    $('model-chip').textContent=state.cfg.model==='unconfined' ? 'ACUÍFERO LIBRE · T VARIABLE' : 'EJERCICIOS · T CONSTANTE';
  }

  function updateClock() {
    const s = state.sim;
    $('clock').textContent = `Día ${fmt(s.t, s.t < 10 ? 2 : 0)}${s.t >= 365 ? ` · ${fmt(s.t / 365, 2)} años` : ''} de ${fmtg(state.cfg.tEnd)}`;
    $('progress-bar').style.width = `${Math.min(100, s.t / state.cfg.tEnd * 100)}%`;
  }

  /* ------------------------------------------------------------------ */
  /* Bucle de simulación                                                 */
  /* ------------------------------------------------------------------ */
  function play() {
    if (state.running) { stop(); return; }
    if (state.sim.t >= state.cfg.tEnd - 1e-9) state.sim.reset();
    if ($('view').value === 'steady') $('view').value = 'depth';
    state.running = true; state.last = performance.now(); state.targetTime = state.sim.t;
    $('btn-play').textContent = '⏸ Pausa';
    requestAnimationFrame(frame);
  }
  function stop() {
    state.running = false;
    $('btn-play').textContent = state.sim && state.sim.t > 0 && state.sim.t < state.cfg.tEnd - 1e-9 ? '▶ Continuar' : '▶ Simular';
  }
  function frame(now) {
    if (!state.running) return;
    const dt = Math.min(0.1, (now - state.last) / 1000);
    state.last = now;
    const s = state.sim, g = s.g;
    const speed = +$('speed').value;
    state.targetTime = Math.min(s.cfg.tEnd, state.targetTime + speed * dt);
    const want = Math.max(0, Math.ceil((state.targetTime - s.t) / E.stableDt(g,s.h)));
    const cap = Math.max(1, Math.floor(4e5 / g.N));
    const more = s.step(Math.min(want, cap), state.targetTime);
    state.view3d.update(s);
    drawPlan(); updateClock();
    if (now - state.lastUI > 200) { renderStatus(); renderEvents(); state.lastUI = now; }
    if (now - state.lastChart > 700) { renderChart(); state.lastChart = now; }
    if (!more) {
      s.record(true);
      stop(); renderStatus(); renderEvents(); renderChart(); updateClock();
      $('export-status').textContent = 'Simulación completa. Pulse “Resolver y ver solución” para las respuestas.';
      return;
    }
    requestAnimationFrame(frame);
  }
  function runToEnd() {
    stop();
    const s = state.sim;
    const t0 = performance.now();
    s.runToEnd();
    state.view3d.update(s, viewField()); drawPlan(); updateClock(); renderStatus(); renderEvents(); renderChart();
    $('export-status').textContent = `Horizonte completo calculado en ${fmt(performance.now() - t0, 0)} ms.`;
  }
  function reset() { stop(); state.sim.reset(); state.view3d.update(state.sim, viewField()); drawPlan(); updateClock(); renderStatus(); renderEvents(); renderChart(); }

  /* ------------------------------------------------------------------ */
  /* Formulación y solución                                              */
  /* ------------------------------------------------------------------ */
  const T = (v, d = 4) => window.F.tex(v, d);
  const MM = (s) => `<div class="math">\\[${s}\\]</div>`;
  function renderFormulation() {
    const c = state.cfg, g = state.sim.g;
    const has = (t) => c.elements.some((e) => e.type === t);
    if(c.model === 'unconfined') {
      $('formulation').innerHTML = `<p class="step-tag">Modelo libre · Dupuit–Boussinesq</p><h3>El espesor saturado modifica el flujo</h3><p>S<sub>y</sub> ∂h/∂t = ∇·(K h ∇h) + R − W, con base horizontal en 0 m y T = K·max(h,0). Flujos conservativos entre nodos; transmisividad media aritmética en cada cara. El paso explícito se limita según la máxima transmisividad y se divide en cada evento.</p><p>El río impone un nivel ideal; el dren sólo extrae; el rezume elimina el agua que supera la cota del terreno. Si una celda se seca, se informa el bombeo que no pudo satisfacerse. No se simula flujo vertical, suelo heterogéneo, transporte de contaminantes ni zona no saturada. No es MODFLOW.</p><p>Referencia: <a href="https://water.usgs.gov/ogw/modflow/MODFLOW-2005-Guide/bcf.htm" target="_blank" rel="noopener">USGS: transmisividad y espesor saturado</a>.</p>`;
      return;
    }
    const parts = [];
    parts.push(`<p class="step-tag">Formulación con los datos actuales</p><h3>Ecuación, fuentes y criterios</h3>`);
    parts.push(MM(`S\\,\\frac{\\partial h}{\\partial t} = T\\,\\nabla^2 h + Q_s(x,y,t),\\qquad T = K\\,b = ${T(c.K)}\\times ${T(c.b)} = ${T(g.T)}\\ \\tfrac{\\text{m}^2}{\\text{día}},\\quad D = \\frac{T}{S} = ${T(g.D)}\\ \\tfrac{\\text{m}^2}{\\text{día}}`));
    parts.push(MM(`\\Delta t_{máx} = \\frac{\\Delta x^2}{4D} = \\frac{${T(c.dx)}^2}{4\\times ${T(g.D)}} = ${T(g.dtmax, 5)}\\ \\text{días},\\quad \\Delta t = 0{,}9\\,\\Delta t_{máx},\\quad r = \\frac{D\\Delta t}{\\Delta x^2} = 0{,}225`));
    parts.push(MM(`h^{n+1}_{i,j} = h^n_{i,j} + r\\,(h^n_{i+1,j}+h^n_{i-1,j}+h^n_{i,j+1}+h^n_{i,j-1}-4h^n_{i,j}) + \\frac{\\Delta t}{S}\\,Q_{s,i,j}`));
    const li = [];
    if (c.rain.R) li.push(`Lluvia: \\(Q_s = R = ${T(c.rain.R)}/1000/365 = ${T(c.rain.R / 365000)}\\) m/día${c.rain.seasonal ? ` (concentrada en 212 días: \\(${T(c.rain.R / 1000 / 212)}\\) m/día de octubre a abril)` : ''}.`);
    if (has('canal')) li.push(`Canal: fuente lineal \\(Q_s = q\\,\\ell/A \\approx q/\\Delta x\\), con \\(q\\,(1-\\eta)\\) si está revestido.`);
    if (has('pozo')) li.push(`Pozo: fuente puntual \\(Q_s = -Q/\\Delta x^2\\) (negativa porque extrae agua).`);
    if (has('poza')) li.push(`Poza: fuente de área \\(Q_s = i\\) en m/día (\\(0{,}01\\,i\\) con geomembrana).`);
    if (has('dren')) li.push(`Dren: condición unilateral \\(h \\le h_d = z_t - p\\); sólo capta agua, nunca la devuelve.`);
    if (has('rio')) li.push(`Río: Dirichlet \\(h = h_r(t)\\), con hidrograma triangular si hay crecida.`);
    if (has('casa')) li.push(`Casa afectada si \\(h \\ge z_t - d_c\\); alerta si el agua está a menos de 0,5 m de la cimentación.`);
    if (has('fosa')) li.push(`Fosa seca si \\(\\max h \\le z_t - p_f - m\\) dentro de la excavación.`);
    li.push(`Bordes: nivel fijo \\(h = h_0\\) o impermeable \\(\\partial h/\\partial n = 0\\) (nodo fantasma).`);
    parts.push(`<ul>${li.map((x) => `<li>${x}</li>`).join('')}</ul>`);
    parts.push(MM(`\\text{Destino final: } \\nabla^2 h = -\\frac{Q_s}{T}\\ \\text{(SOR proyectado para los drenes)}`));
    $('formulation').innerHTML = parts.join('');
    typeset($('formulation'));
  }
  function typeset(el) {
    if (window.MathJax && MathJax.typesetPromise) MathJax.startup.promise.then(() => { MathJax.typesetClear([el]); return MathJax.typesetPromise([el]); }).catch(() => {});
  }

  function solve() {
    if(state.solvePromise)return state.solvePromise;
    stop();$('btn-solve').disabled=true;$('export-status').textContent='Calculando las respuestas numéricas…';
    const cfg=clone(state.cfg),problem=state.problem,source=JSON.stringify(cfg);
    state.solvePromise=(async()=>{
      const t0=performance.now();
      const sim=await window.SimAdvisor.run(cfg);
      const st=cfg.model==='unconfined'?null:E.steady(cfg);
      const answers=cfg.model==='unconfined'?window.SimAdvisorUI.numericalAnswers(sim,cfg,problem):problem.solve({sim,st,cfg});
      if(source!==JSON.stringify(state.cfg)||problem!==state.problem)throw new Error('Los datos cambiaron durante el cálculo. Vuelve a resolver.');
      problem.questions.forEach((q,k)=>{const a=$(`ans-${k}`);a.innerHTML=answers?.[k]||'<p>Revise los criterios numéricos del solucionador para el escenario modificado.</p>';a.hidden=false;});
      state.sim=sim;state.steady=st;state.steadyStale=st===null;
      if($('view').value==='steady')$('view').value='depth';
      state.view3d.update(sim,viewField());drawPlan();updateClock();renderStatus();renderEvents();renderChart();
      const ev=sim.events.length?`<ol class="events">${sim.events.map(e=>`<li class="${e.kind}"><span class="t">día ${fmt(e.t,1)}</span><span>${esc(e.text)}</span></li>`).join('')}</ol>`:'<p>No se alcanzan umbrales críticos durante el horizonte.</p>';
      $('solution').innerHTML=`<p class="step-tag">Solución numérica desde el estado inicial</p><h3>${fmt(cfg.tEnd,0)} días calculados</h3><p>${sim.g.Nx}×${sim.g.Ny} nodos · ${fmt(sim.n,0)} pasos adaptados a eventos · último paso ${fmtg(sim.lastDt,4)} d · ${fmt(performance.now()-t0,0)} ms. ${st?`Estado estacionario: ${st.exists?(st.converged?'convergió':'no convergió')+' en '+st.iterations+' iteraciones':esc(st.reason)}`:'Los resultados corresponden al horizonte transitorio del modelo libre.'}</p><h4>Cronología</h4>${ev}<p>Pulse <b>Solucionar</b> para comparar medidas y aplicar una propuesta reversible.</p>`;
      $('solution').hidden=false;state.solved=true;typeset(document.querySelector('.problem'));
      $('export-status').textContent='Respuestas calculadas. La vista y las series muestran el horizonte completo.';
    })().catch(e=>{$('export-status').textContent='No se pudo resolver: '+e.message;throw e;}).finally(()=>{state.solvePromise=null;$('btn-solve').disabled=false;});
    return state.solvePromise;
  }

  /* ------------------------------------------------------------------ */
  /* Exportación                                                         */
  /* ------------------------------------------------------------------ */
  function download(name, content, mime) {
    const blob = content instanceof Blob ? content : new Blob([content], { type: mime || 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
    $('export-status').textContent = `Archivo generado: ${name}.`;
  }
  const n = (v) => (v === null || v === undefined || !isFinite(v) ? 'NaN' : String(+(+v).toPrecision(9)));
  const ascii = (s) => String(s).replace(/[—–]/g, '-').replace(/'/g, "''");
  const mat = (arr, Nx, Ny, f = (v) => v) => '[\n' + Array.from({ length: Ny }, (_, j) => '  ' + Array.from({ length: Nx }, (_, i) => n(f(arr[j * Nx + i]))).join(' ')).join(';\n') + '\n]';

  function matlabData() {
    const s = state.sim, g = s.g, c = state.cfg;
    ensureSteady();
    const houses = Object.values(s.mon.casa), wells = Object.values(s.mon.pozo);
    return `%% Datos del simulador Piezometro 2D - ${ascii(state.problem.title)}
% Generado el ${new Date().toLocaleString('es-PE')}. Unidades: m y dias. h(j,i) ~ h(x_i, y_j); base del acuifero en z = 0.
param = struct('Lx', ${n(c.Lx)}, 'Ly', ${n(c.Ly)}, 'dx', ${n(c.dx)}, 'K', ${n(c.K)}, 'b', ${n(c.b)}, 'S', ${n(c.S)}, 'T', ${n(g.T)}, ...
  'D', ${n(g.D)}, 'zTerreno', ${n(g.zg)}, 'h0', ${n(g.h0)}, 'dt', ${n(g.dt)}, 't', ${n(s.t)}, 'tEnd', ${n(c.tEnd)});
x = [${Array.from(g.x).map(n).join(' ')}];
y = [${Array.from(g.y).map(n).join(' ')}];
h = ${mat(s.h, g.Nx, g.Ny)};   % nivel freatico en t = ${n(s.t)} dias
profundidad = param.zTerreno - h;
${state.steady && state.steady.exists ? `h_estacionario = ${mat(state.steady.h, g.Nx, g.Ny)};` : '% sin estado estacionario'}
Qs = ${mat(s.Qs || new Float64Array(g.N), g.Nx, g.Ny)};   % termino fuente actual [m/dia]
t = [${s.series.t.map(n).join(' ')}]';
casas = {${houses.map((m) => `'${ascii(m.el.name)}'`).join(', ')}};
casasXY_cim = [${houses.map((m) => `${n(m.el.x)} ${n(m.el.y)} ${n(m.el.cim)}`).join('; ')}];
prof_casas = [${houses.length ? s.series.t.map((_, k) => houses.map((m) => n(g.zg - m.series[k])).join(' ')).join(';\n  ') : ''}];
pozos = {${wells.map((m) => `'${ascii(m.el.name)}'`).join(', ')}};
abatimiento_pozos = [${wells.length ? s.series.t.map((_, k) => wells.map((m) => n(m.series[k])).join(' ')).join(';\n  ') : ''}];

figure; surf(x, y, h); shading interp; colorbar; xlabel('x [m]'); ylabel('y [m]'); zlabel('h [m]'); title('Nivel freatico');
figure; contourf(x, y, profundidad, 20); colorbar; axis equal tight; title('Profundidad del agua [m]');
if ~isempty(prof_casas), figure; plot(t, prof_casas, 'LineWidth', 1.5); set(gca, 'YDir', 'reverse'); grid on; legend(casas); xlabel('t [dias]'); ylabel('profundidad del agua [m]'); end
`;
  }

  function matlabScript() {
    const s = state.sim, g = s.g, c = state.cfg;
    const Qs = E.sources(g, s.lay, c, c.tEnd, true);
    const nz = []; for (let k = 0; k < g.N; k++) if (Qs[k]) nz.push(k);
    const fixedK = [], fixedV = [];
    for (let k = 0; k < g.N; k++) if (s.lay.fixed[k]) { fixedK.push(k); fixedV.push(s.lay.riverOf[k] >= 0 ? g.h0 + (s.lay.L.rio[s.lay.riverOf[k]].el.dh || 0) : g.h0); }
    const dr = Array.from(s.lay.drains);
    const houses = state.cfg.elements.filter((e) => e.type === 'casa');
    const idx1 = (k) => `${Math.floor(k / g.Nx) + 1} ${k % g.Nx + 1}`;
    return `%% Simulador Piezometro 2D - ${ascii(state.problem.title)}
% S dh/dt = T lap(h) + Qs  (FTCS)   |   lap(h) = -Qs/T con drenes h <= hd (SOR proyectado)
% Fuentes promedio de largo plazo (sin horarios ni crecidas). Generado el ${new Date().toLocaleString('es-PE')}.
clear; clc; close all;
Lx = ${n(c.Lx)}; Ly = ${n(c.Ly)}; dx = ${n(c.dx)};
K = ${n(c.K)}; b = ${n(c.b)}; S = ${n(c.S)}; T = K*b; D = T/S;
h0 = b; zt = b + ${n(c.depth0)}; tEnd = ${n(c.tEnd)};
Nx = round(Lx/dx) + 1; Ny = round(Ly/dx) + 1; x = (0:Nx-1)*dx; y = (0:Ny-1)*dx;
% termino fuente [m/dia]: [fila columna valor]
src = [${nz.map((k) => `${idx1(k)} ${n(Qs[k])}`).join('; ')}];
Qs = zeros(Ny, Nx); for q = 1:size(src, 1), Qs(src(q,1), src(q,2)) = src(q,3); end
% nodos de nivel fijo (bordes y rios): [fila columna h]
fx = [${fixedK.map((k, q) => `${idx1(k)} ${n(fixedV[q])}`).join('; ')}];
fijo = false(Ny, Nx); valor = zeros(Ny, Nx);
for q = 1:size(fx, 1), fijo(fx(q,1), fx(q,2)) = true; valor(fx(q,1), fx(q,2)) = fx(q,3); end
% drenes: [fila columna cota]
dd = [${dr.map((k) => `${idx1(k)} ${n(s.lay.drainH[k])}`).join('; ')}];
esDren = false(Ny, Nx); hd = inf(Ny, Nx);
for q = 1:size(dd, 1), esDren(dd(q,1), dd(q,2)) = true; hd(dd(q,1), dd(q,2)) = dd(q,3); end
casas = {${houses.map((e) => `'${ascii(e.name)}'`).join(', ')}};
casasXY = [${houses.map((e) => `${n(e.x)} ${n(e.y)} ${n(e.cim)}`).join('; ')}];
iW = [2, 1:Nx-1]; iE = [2:Nx, Nx-1]; jS = [2, 1:Ny-1]; jN = [2:Ny, Ny-1];

%% Transitorio FTCS
dtmax = dx^2/(4*D); dt = 0.9*dtmax; r = D*dt/dx^2; nPasos = round(tEnd/dt);
fprintf('T = %.4g m2/dia, D = %.4g m2/dia, dt = %.4g dias, %d pasos\\n', T, D, dt, nPasos);
h = h0*ones(Ny, Nx); h(fijo) = valor(fijo);
for n = 1:nPasos
    h = h + r*(h(:, iE) + h(:, iW) + h(jN, :) + h(jS, :) - 4*h) + dt/S*Qs;
    h(fijo) = valor(fijo);
    h(esDren) = min(h(esDren), hd(esDren));
end

%% Estacionario: SOR proyectado
he = h0*ones(Ny, Nx); he(fijo) = valor(fijo); omega = 1.9;
for it = 1:40000
    cambio = 0;
    for j = 1:Ny
        for i = 1:Nx
            if fijo(j, i), continue; end
            v = (1-omega)*he(j,i) + omega*0.25*(he(j,iE(i)) + he(j,iW(i)) + he(jN(j),i) + he(jS(j),i) + dx^2/T*Qs(j,i));
            v = min(v, hd(j, i));
            cambio = max(cambio, abs(v - he(j,i))); he(j,i) = v;
        end
    end
    if cambio < 1e-7, break; end
end
fprintf('SOR: %d iteraciones\\n', it);
for q = 1:numel(casas)
    hc = interp2(x, y, h, casasXY(q,1), casasXY(q,2)); hs = interp2(x, y, he, casasXY(q,1), casasXY(q,2));
    fprintf('%-14s agua a %.2f m (t final) y %.2f m (estacionario); cimentacion %.2f m\\n', casas{q}, zt - hc, zt - hs, casasXY(q,3));
end
figure; surf(x, y, h); shading interp; colorbar; xlabel('x [m]'); ylabel('y [m]'); zlabel('h [m]'); title('Nivel freatico al final');
figure; contourf(x, y, zt - he, 20); colorbar; axis equal tight; title('Profundidad del agua en estacionario [m]');
`;
  }

  async function reportPdf() {
    stop();
    $('btn-pdf').disabled = true;
    try {
      if (!state.solved) await solve();
      $('export-status').textContent = 'Generando informe PDF…';
      const host = $('report-root'); host.innerHTML = '';
      const rep = document.createElement('div'); rep.className = 'rep'; host.appendChild(rep);
      const add = (html) => { const d = document.createElement('div'); d.innerHTML = html; rep.appendChild(d); };
      const planImg = $('plan').toDataURL('image/png');
      const img3d = state.view3d.snapshot();
      const kindNow = $('chart-kind').value, chartImgs = [];
      for (const k of chartKinds()) {
        $('chart-kind').value = k; renderChart(true);
        chartImgs.push(window.Plotly ? await Plotly.toImage($('chart'), { format: 'png', width: 1100, height: 440, scale: 2 }) : $('chart').querySelector('canvas').toDataURL('image/png'));
      }
      $('chart-kind').value = kindNow; renderChart(true);
      const c = state.cfg, g = state.sim.g;
      add(`<h1>Simulador Piezómetro 2D · Informe</h1><p class="muted">Problema ${P.PROBLEMS.indexOf(state.problem) + 1}: ${esc(state.problem.title)} · ${new Date().toLocaleString('es-PE')}</p>${state.problem.statement}`);
      add(`<h2>Datos</h2><table><tbody>
        <tr><td>Dominio</td><td>${fmtg(c.Lx)} × ${fmtg(c.Ly)} m, Δx = ${fmtg(c.dx)} m (${g.Nx}×${g.Ny} nodos)</td></tr>
        <tr><td>Acuífero</td><td>K = ${fmtg(c.K)} m/día, b = ${fmtg(c.b)} m, T = ${fmtg(g.T)} m²/día, S<sub>y</sub> = ${fmtg(c.S)}</td></tr>
        <tr><td>Nivel freático inicial</td><td>${fmtg(c.depth0)} m bajo el terreno</td></tr>
        <tr><td>Bordes</td><td>O: ${c.bc.west}, E: ${c.bc.east}, S: ${c.bc.south}, N: ${c.bc.north}</td></tr>
        <tr><td>Lluvia</td><td>${fmtg(c.rain.R)} mm/año${c.rain.seasonal ? ' (oct–abr)' : ''}</td></tr>
        <tr><td>Elementos</td><td>${c.elements.map((e) => `${TYPE[e.type]}: ${esc(e.name)}`).join('; ')}</td></tr>
        <tr><td>Simulación</td><td>${fmtg(c.tEnd)} días, paso adaptado a eventos, último Δt = ${fmtg(state.sim.lastDt, 4)} días</td></tr></tbody></table>`);
      add(`<h2>Modelo y balance al día ${fmt(state.sim.t,2)}</h2><p>${c.model==='unconfined'?'Acuífero libre, T = K·h':'Modelo lineal, T constante'}. Exageración vertical en 3D: ${$('exag').value}×. Texturas ilustrativas.</p><p>${esc($('balance-note').textContent)}</p><p>Recarga: ${esc($('b-recharge').textContent)}; almacenamiento: ${esc($('b-storage').textContent)}; extracción y descarga: ${esc($('b-out').textContent)}; bordes: ${esc($('b-boundary').textContent)}.</p>`);
      add(`<h2>Corte hidráulico A–A′</h2><img src="${$('profile').toDataURL('image/png')}" alt="Perfil hidráulico">`);
      add(`<h2>Planta</h2><img src="${planImg}" alt="">`);
      add(`<h2>Vista 3D</h2><img src="${img3d}" alt="">`);
      chartImgs.forEach((im, k) => add(`${k ? '' : '<h2>Evolución</h2>'}<img src="${im}" alt="">`));
      const rows = Array.from($('status').querySelectorAll('.st-item')).map((it) => `<tr><td><b>${it.querySelector('b').innerHTML}</b></td><td>${it.querySelector('span').innerHTML}</td></tr>`).join('');
      add(`<h2>Estado al día ${fmt(state.sim.t, 0)}</h2><table><tbody>${rows}</tbody></table>`);
      add(`<h2>Formulación</h2>${$('formulation').innerHTML}`);
      state.problem.questions.forEach((q, k) => add(`<h3>Pregunta ${k + 1}. ${q}</h3>${$(`ans-${k}`).innerHTML}`));
      add($('solution').innerHTML);
      if(state.advisor?.getReport()) add('<h2>Comparación de medidas</h2>'+$('advisor-comparison').innerHTML+$('advisor-choice').innerHTML);
      // html2canvas pintaría también el MathML oculto de accesibilidad
      rep.querySelectorAll('mjx-assistive-mml').forEach((m) => m.remove());
      const blob = await X.blocksToPdf(rep, host, (m) => { $('export-status').textContent = m; }, 'Simulador Piezómetro 2D · Modelamiento Numérico en Ingeniería · UNC');
      download(`simulador_${state.problem.id}.pdf`, blob, 'application/pdf');
    } catch (e) { console.error(e); $('export-status').textContent = 'No se pudo generar el PDF: ' + e.message; }
    finally { $('btn-pdf').disabled = false; }
  }

  /* ------------------------------------------------------------------ */
  /* Inicio                                                              */
  /* ------------------------------------------------------------------ */
  function init() {
    $('problem').innerHTML = P.PROBLEMS.map((p, k) => `<option value="${p.id}">${k + 1}. ${p.title}</option>`).join('');
    state.view3d = V3.create($('three'));
    state.view3d.setBackground(getComputedStyle(document.documentElement).getPropertyValue('--surface-2').trim() || '#f6f8f8');
    document.querySelectorAll('.tool').forEach((b) => b.addEventListener('click', () => setTool(b.dataset.tool)));
    const cv = $('plan');
    cv.addEventListener('pointerdown', onDown);
    cv.addEventListener('pointermove', onMove);
    cv.addEventListener('pointerup', onUp);
    cv.addEventListener('pointercancel', () => { state.drag = null; drawPlan(); });
    cv.addEventListener('keydown', (e) => {
      if ((e.key === 'Delete' || e.key === 'Backspace') && state.sel) { removeEl(state.sel); e.preventDefault(); }
      if (e.key === 'Escape') { setTool('select'); state.drag = null; drawPlan(); }
    });
    $('props').addEventListener('change', onPropInput);
    $('aquifer').addEventListener('change', onAquiferInput);
    $('status').addEventListener('click', (e) => {
      const it = e.target.closest('.st-item'); if (!it || !it.dataset.id) return;
      state.sel = it.dataset.id; setTool('select'); renderProps(); state.view3d.setElements(state.cfg.elements, state.sel); drawPlan(); renderStatus();
    });
    $('problem').addEventListener('change', (e) => loadProblem(e.target.value));
    $('btn-play').addEventListener('click', play);
    $('btn-reset').addEventListener('click', reset);
    $('btn-end').addEventListener('click', runToEnd);
    $('view').addEventListener('change', () => { state.view3d.update(state.sim, viewField()); drawPlan(); });
    $('exag').addEventListener('change', () => { state.view3d.setGrid(state.sim.g, parseFloat($('exag').value) || 1); state.view3d.setElements(state.cfg.elements, state.sel); state.view3d.update(state.sim, viewField()); });
    for(const id of ['show-contours','show-flow','profile-y']) $(id).addEventListener('input',drawPlan);
    const appearance=()=>state.view3d.setAppearance({realistic:$('render-style').value==='realistic',cut:$('show-cut').checked,arrows:$('show-arrows').checked});
    for(const id of ['render-style','show-cut','show-arrows']) $(id).addEventListener('change',appearance);
    $('camera-view').addEventListener('change',()=>state.view3d.setCamera($('camera-view').value));
    $('btn-view3d').addEventListener('click', () => state.view3d.resetView());
    $('chart-kind').addEventListener('change', () => renderChart(true));
    $('btn-solve').addEventListener('click', () => solve().catch(()=>{}));
    $('btn-pdf').addEventListener('click', reportPdf);
    $('btn-mat').addEventListener('click', () => download(`datos_simulador_${state.problem.id}.m`, matlabData()));
    $('btn-matscript').addEventListener('click', () => { if(state.cfg.model==='unconfined') {$('export-status').textContent='El script MATLAB corresponde al modelo lineal. Para el modo libre, exporte los datos calculados con Datos MATLAB.';return;} download(`simulador_${state.problem.id}.m`, matlabScript()); });
    $('btn-preview').addEventListener('click',async()=> {
      stop();$('btn-preview').disabled=true;
      try {
        const cv=await html2canvas(document.querySelector('.views'),{scale:2,backgroundColor:getComputedStyle(document.documentElement).getPropertyValue('--bg').trim(),logging:false});
        const blob=await new Promise(resolve=>cv.toBlob(resolve,'image/png'));
        if(!blob)throw new Error('No se pudo capturar la vista.');
        const preview=$('preview-result');preview.hidden=false;
        preview.innerHTML='<p>Vista generada. <a id="preview-download" download="vista_piezometro_v3.png">Descargar vista PNG</a></p><img alt="Vista previa del mapa y el acuífero 3D" style="display:block;width:100%;border-radius:8px">';
        const data=cv.toDataURL('image/png');preview.querySelector('img').src=data;$('preview-download').href=data;
        download('vista_piezometro_v3.png',blob,'image/png');
      } catch(err){$('export-status').textContent=err.message;}
      finally{$('btn-preview').disabled=false;}
    });
    $('btn-csv').addEventListener('click',()=> {
      const sim=state.sim,g=sim.g,rows=['x_m,y_m,h_m,profundidad_m,qx_Darcy_m_dia,qy_Darcy_m_dia'];
      for(let j=0;j<g.Ny;j++)for(let i=0;i<g.Nx;i++){const k=j*g.Nx+i,v=E.flow(g,sim.h,g.x[i],g.y[j]);rows.push([g.x[i],g.y[j],sim.h[k],g.zg-sim.h[k],v.x,v.y].map(n=>n.toFixed(6)).join(','));}
      download(`campo_${state.problem.id}_dia_${sim.t.toFixed(2)}_${state.cfg.model||'linear'}.csv`,rows.join('\n'),'text/csv;charset=utf-8');
    });
    $('btn-json').addEventListener('click', () => download(`escenario_${state.problem.id}.json`, JSON.stringify(state.cfg, null, 2), 'application/json'));
    $('json-load').addEventListener('change', (e) => {
      const f = e.target.files[0]; if (!f) return;
      const rd = new FileReader();
      rd.onload = () => {
        try {
          const cfg = JSON.parse(rd.result);
          E.validate(cfg);
          loadProblem('p8');
          state.cfg = cfg; state.sel = null;
          aquiferChanged();
          state.view3d.setElements(cfg.elements, null);
          $('pb-title').textContent = `Escenario cargado: ${f.name}`;
        } catch (err) { $('export-status').textContent = 'No se pudo cargar: ' + err.message; }
      };
      rd.readAsText(f); e.target.value = '';
    });
    window.addEventListener('resize', () => drawPlan());
    const h = location.hash.slice(1);
    loadProblem(P.PROBLEMS.some((p) => p.id === h) ? h : 'p1');
    setTool('select');
    state.advisor=window.SimAdvisorUI.create({getState:()=>state,stop,download,applyConfig:(cfg,animate)=>{state.cfg=cfg;state.sel=null;aquiferChanged();if(animate)play();}});
  }
  window.addEventListener('DOMContentLoaded', init);
  window.__sim = state;
})();
