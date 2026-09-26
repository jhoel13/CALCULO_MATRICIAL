/* HidroCalc — aplicación: registro de módulos, enrutador y vistas */
(function (global) {
  'use strict';
  const HC = global.HC;
  const { esc, richHTML, katexStr } = HC;

  const modules = [];
  HC.register = (m) => modules.push(m);
  HC.modules = modules;

  const GROUPS = [
    { id: 'conduccion', title: 'Conducción' },
    { id: 'obras', title: 'Obras de arte' },
    { id: 'captacion', title: 'Captación y tratamiento' },
    { id: 'estructural', title: 'Diseño estructural' }
  ];

  const ICONS = {
    canal: '<path d="M3 6l4 12h10l4-12"/><path d="M6.5 12h11" class="wv"/>',
    tramos: '<path d="M3 17l5-5 4 3 9-9"/><circle cx="8" cy="12" r="1.5"/><circle cx="12" cy="15" r="1.5"/>',
    alcantarilla: '<path d="M2 19h20"/><path d="M5 19v-6a7 7 0 0114 0v6"/><circle cx="12" cy="13" r="3"/>',
    acueducto: '<path d="M2 7h20v4H2z"/><path d="M5 11v9M19 11v9M12 11v9"/>',
    sifon: '<path d="M2 6h5l3 11h4l3-11h5"/>',
    bocatoma: '<path d="M2 18c3-2 5-2 8 0s5 2 8 0 3-1 4-1"/><path d="M6 14V6h12v8"/><path d="M10 6v8M14 6v8"/>',
    desarenador: '<path d="M2 8h4l3 3h6l3-3h4"/><path d="M9 11v6h6v-6"/><circle cx="11" cy="15" r=".6"/><circle cx="13" cy="14" r=".6"/>',
    rejas: '<rect x="4" y="4" width="16" height="16" rx="2"/><path d="M8 4v16M12 4v16M16 4v16"/>',
    muro: '<path d="M4 20V6h4v14"/><path d="M8 20h12"/><path d="M8 10l10 10" class="wv"/>',
    home: '<path d="M3 11l9-8 9 8"/><path d="M5 10v10h14V10"/>',
    book: '<path d="M4 4h7a3 3 0 013 3v13a2 2 0 00-2-2H4z"/><path d="M20 4h-6"/><path d="M20 4v14h-6"/>',
    sigma: '<path d="M18 4H6l6 8-6 8h12"/>',
    fix: '<path d="M14 7l3-3 3 3-3 3"/><path d="M17 4v9a4 4 0 01-4 4H4"/>',
    help: '<circle cx="12" cy="12" r="9"/><path d="M9.5 9a2.5 2.5 0 015 0c0 2-2.5 2-2.5 4"/><circle cx="12" cy="17" r=".6"/>'
  };
  const icon = (k, cls = '') => `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${ICONS[k] || ICONS.canal}</svg>`;
  HC.icon = icon;

  /* ---------- teoría ---------- */
  function renderTheoryBody(body) {
    return body.map((b) => {
      if (typeof b === 'string') return `<p>${richHTML(b)}</p>`;
      if (b.eq) return `<div class="th-eq"><div class="formula">${katexStr(b.eq, true)}</div>${b.name ? `<div class="th-eqname">${richHTML(b.name)}</div>` : ''}</div>`;
      if (b.list) return `<ul>${b.list.map((i) => `<li>${richHTML(i)}</li>`).join('')}</ul>`;
      if (b.table) return `<div class="st-table-wrap"><table class="st-table"><thead><tr>${b.table.head.map((h) => `<th>${richHTML(h)}</th>`).join('')}</tr></thead><tbody>${b.table.rows.map((r) => `<tr>${r.map((c) => `<td>${richHTML(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      if (b.note) return `<div class="st-note info">${richHTML(b.note)}</div>`;
      return '';
    }).join('');
  }
  HC.renderTheoryBody = renderTheoryBody;

  /* ---------- estado ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* sin almacenamiento */ } }
  };
  const state = { values: {}, results: {} };

  function valuesFor(mod) {
    if (!state.values[mod.id]) {
      const def = HC.ui.defaults(mod);
      const saved = store.get(`hc:v:${mod.id}`, null);
      state.values[mod.id] = saved ? Object.assign(def, saved) : def;
    }
    return state.values[mod.id];
  }

  /* ---------- layout ---------- */
  const $ = (s, el = document) => el.querySelector(s);
  const main = () => $('#main');

  function buildSidebar() {
    const nav = $('#nav');
    const links = [
      { href: '#/', ic: 'home', t: 'Inicio' },
      { href: '#/teoria', ic: 'book', t: 'Biblioteca de teoría' },
      { href: '#/formulario', ic: 'sigma', t: 'Formulario' }
    ];
    nav.innerHTML = `
      <div class="nav-sec">${links.map((l) => `<a class="nav-link" href="${l.href}">${icon(l.ic)}<span>${l.t}</span></a>`).join('')}</div>
      ${GROUPS.map((g) => {
        const ms = modules.filter((m) => m.group === g.id);
        if (!ms.length) return '';
        return `<div class="nav-sec"><div class="nav-title">${g.title}</div>${ms.map((m) => `<a class="nav-link" href="#/m/${m.id}" data-mod="${m.id}">${icon(m.icon)}<span>${esc(m.short || m.title)}</span></a>`).join('')}</div>`;
      }).join('')}
      <div class="nav-sec">
        <a class="nav-link" href="#/correcciones">${icon('fix')}<span>Correcciones al Excel</span></a>
        <a class="nav-link" href="#/ayuda">${icon('help')}<span>Guía de uso</span></a>
      </div>`;
  }
  function markActive() {
    const h = location.hash || '#/';
    document.querySelectorAll('.nav-link').forEach((a) => {
      const href = a.getAttribute('href');
      a.classList.toggle('active', href === '#/' ? (h === '#/' || h === '') : h.startsWith(href));
    });
  }

  /* ---------- páginas ---------- */
  function pageHome() {
    const cards = GROUPS.map((g) => {
      const ms = modules.filter((m) => m.group === g.id);
      return `<section class="home-group"><h2>${g.title}</h2><div class="card-grid">${ms.map((m) => `
        <a class="mod-card" href="#/m/${m.id}">
          <div class="mc-ico">${icon(m.icon)}</div>
          <div class="mc-body"><h3>${esc(m.title)}</h3><p>${esc(m.description)}</p>
          <div class="mc-tags">${(m.tags || []).map((t) => `<span class="tag">${esc(t)}</span>`).join('')}</div></div>
        </a>`).join('')}</div></section>`;
    }).join('');
    const nEq = modules.reduce((s, m) => s + (m.theory || []).reduce((a, t) => a + t.body.filter((b) => b.eq).length, 0), 0);
    main().innerHTML = `
      <section class="hero">
        <div class="hero-text">
          <span class="eyebrow">Ingeniería hidráulica · Obras de riego y saneamiento</span>
          <h1>Calcula, entiende y documenta tus diseños hidráulicos</h1>
          <p>${modules.length} calculadoras basadas en las hojas de cálculo del curso, con desarrollo paso a paso, gráficos interactivos, teoría con fórmulas y exportación de la memoria de cálculo a PDF y LaTeX.</p>
          <div class="hero-actions"><a class="btn primary" href="#/m/${modules[0].id}">Empezar a calcular</a><a class="btn ghost" href="#/teoria">Ver teoría</a></div>
        </div>
        <div class="hero-art" aria-hidden="true">${heroSVG()}</div>
      </section>
      <section class="stats">
        <div class="stat"><b>${modules.length}</b><span>calculadoras</span></div>
        <div class="stat"><b>${nEq}</b><span>fórmulas documentadas</span></div>
        <div class="stat"><b>${modules.reduce((s, m) => s + (m.fixes || []).length, 0)}</b><span>correcciones al Excel original</span></div>
        <div class="stat"><b>PDF · TeX</b><span>memoria exportable</span></div>
      </section>
      ${cards}`;
  }
  function heroSVG() {
    return `<svg viewBox="0 0 420 260" class="hero-svg">
      <defs><linearGradient id="hg" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#38bdf8" stop-opacity=".9"/><stop offset="1" stop-color="#1d4ed8" stop-opacity=".9"/></linearGradient></defs>
      <path d="M20 60 L110 200 L310 200 L400 60" fill="none" stroke="currentColor" stroke-width="6" stroke-linejoin="round" opacity=".85"/>
      <path d="M58 118 L110 200 L310 200 L362 118 Z" fill="url(#hg)"/>
      <path class="wave" d="M58 118 q25 -8 50 0 t50 0 t50 0 t50 0 t50 0 t50 0 t54 0" fill="none" stroke="#e0f2fe" stroke-width="3"/>
      <g stroke="currentColor" stroke-width="1.5" opacity=".7"><line x1="110" y1="222" x2="310" y2="222"/><line x1="110" y1="216" x2="110" y2="228"/><line x1="310" y1="216" x2="310" y2="228"/></g>
      <text x="210" y="244" text-anchor="middle" fill="currentColor" font-size="16" font-style="italic">b</text>
      <text x="380" y="160" fill="currentColor" font-size="16" font-style="italic">y</text>
      <g stroke="currentColor" stroke-width="1.5" opacity=".7"><line x1="372" y1="118" x2="372" y2="200"/></g>
      <text x="210" y="100" text-anchor="middle" fill="currentColor" font-size="15" opacity=".9">Q = (1/n) A R²ᐟ³ S¹ᐟ²</text>
    </svg>`;
  }

  function pageTheory(id) {
    const cur = modules.find((m) => m.id === id) || modules[0];
    main().innerHTML = `
      <div class="page-head"><h1>Biblioteca de teoría</h1><p>Fundamentos y fórmulas de cada estructura. Usa el buscador para filtrar por tema o fórmula.</p>
      <input class="search" id="th-search" type="search" placeholder="Buscar: Manning, resalto, Froude, subpresión…"></div>
      <div class="theory-layout">
        <aside class="th-index">${modules.map((m) => `<a href="#/teoria/${m.id}" class="${m.id === cur.id ? 'active' : ''}">${icon(m.icon)}${esc(m.short || m.title)}</a>`).join('')}</aside>
        <article class="th-content card" id="th-content">
          <div class="th-head"><h2>${esc(cur.title)}</h2><a class="btn primary sm" href="#/m/${cur.id}">Abrir calculadora →</a></div>
          ${(cur.theory || []).map((s) => `<section class="th-sec"><h3>${richHTML(s.title)}</h3>${renderTheoryBody(s.body)}</section>`).join('')}
        </article>
      </div>`;
    $('#th-search').addEventListener('input', (e) => {
      const q = e.target.value.trim().toLowerCase();
      const box = $('#th-content');
      if (!q) { pageTheory(cur.id); return; }
      const hits = [];
      modules.forEach((m) => (m.theory || []).forEach((s) => {
        const txt = (s.title + ' ' + s.body.map((b) => (typeof b === 'string' ? b : (b.eq || '') + ' ' + (b.name || '') + ' ' + (b.list || []).join(' '))).join(' ')).toLowerCase();
        if (txt.includes(q)) hits.push({ m, s });
      }));
      box.innerHTML = hits.length ? hits.map(({ m, s }) => `<section class="th-sec"><div class="th-from">${esc(m.title)}</div><h3>${richHTML(s.title)}</h3>${renderTheoryBody(s.body)}</section>`).join('') : '<p class="muted">Sin resultados.</p>';
    });
  }

  function pageFormulario() {
    main().innerHTML = `<div class="page-head"><h1>Formulario</h1><p>Resumen de todas las ecuaciones usadas por las calculadoras.</p></div>
      <div class="formulario">${modules.map((m) => {
        const eqs = [];
        (m.theory || []).forEach((s) => s.body.forEach((b) => { if (b.eq) eqs.push({ eq: b.eq, name: b.name || s.title }); }));
        return `<section class="card fm-card"><h2>${icon(m.icon)} ${esc(m.title)}</h2><div class="fm-list">${eqs.map((e) => `<div class="fm-item"><div class="fm-name">${richHTML(e.name)}</div><div class="formula">${katexStr(e.eq, true)}</div></div>`).join('')}</div></section>`;
      }).join('')}</div>`;
  }

  function pageFixes() {
    main().innerHTML = `<div class="page-head"><h1>Correcciones respecto a las hojas Excel</h1>
      <p>Al migrar las planillas se revisó cada fórmula. Estos son los errores detectados en los archivos originales y cómo los resuelve HidroCalc.</p></div>
      ${modules.filter((m) => (m.fixes || []).length).map((m) => `<section class="card fix-card"><h2>${icon(m.icon)} ${esc(m.title)} <small>${esc(m.source || '')}</small></h2><ol>${m.fixes.map((f) => `<li>${richHTML(f)}</li>`).join('')}</ol></section>`).join('')}`;
  }

  function pageHelp() {
    main().innerHTML = `<div class="page-head"><h1>Guía de uso</h1></div>
    <div class="help-grid">
      <section class="card"><h2>1 · Ingresa los datos</h2><p>Cada calculadora tiene sus datos agrupados en paneles plegables. Los resultados se recalculan automáticamente al escribir. Pasa el cursor por el símbolo <b>?</b> para ver ayuda del parámetro. Con <b>Ejemplos</b> puedes cargar los casos de las hojas originales.</p></section>
      <section class="card"><h2>2 · Revisa el paso a paso</h2><p>La pestaña <b>Paso a paso</b> muestra cada fórmula, la sustitución numérica y el resultado, con verificaciones marcadas en verde (cumple) o rojo (no cumple).</p></section>
      <section class="card"><h2>3 · Analiza los gráficos</h2><p>En <b>Gráficos</b> tienes curvas interactivas (pasa el cursor para ver valores) y esquemas a escala de la estructura.</p></section>
      <section class="card"><h2>4 · Exporta la memoria</h2><p><b>PDF</b> abre el diálogo de impresión con una memoria formateada (elige «Guardar como PDF»). <b>LaTeX</b> descarga un archivo .tex completo con portada, índice, ecuaciones y gráficos pgfplots. <b>Overleaf</b> abre ese mismo documento en Overleaf para compilarlo a PDF.</p></section>
      <section class="card"><h2>Datos del proyecto</h2><p>Usa el botón <b>Proyecto</b> de la barra superior para registrar el nombre del proyecto, el responsable y la entidad; aparecen en la portada de la memoria.</p></section>
      <section class="card"><h2>Sin conexión</h2><p>HidroCalc no necesita servidor ni internet: KaTeX y Chart.js están incluidos. Basta con abrir <code>index.html</code> en el navegador. Los datos se guardan en tu navegador.</p></section>
    </div>`;
  }

  /* ---------- vista de módulo ---------- */
  function pageModule(id, tab) {
    const mod = modules.find((m) => m.id === id);
    if (!mod) { pageHome(); return; }
    tab = tab || 'calc';
    const values = valuesFor(mod);
    main().innerHTML = `
      <div class="mod-head">
        <div class="mh-title">
          <div class="mh-ico">${icon(mod.icon)}</div>
          <div><h1>${esc(mod.title)}</h1><p>${esc(mod.description)}</p>${mod.source ? `<span class="chip">Fuente: ${esc(mod.source)}</span>` : ''}</div>
        </div>
        <div class="mh-actions">
          ${mod.presets && mod.presets.length ? `<select id="preset" class="btn ghost" title="Cargar ejemplo"><option value="">Ejemplos…</option>${mod.presets.map((p, i) => `<option value="${i}">${esc(p.name)}</option>`).join('')}</select>` : ''}
          <button class="btn ghost" id="btn-reset" title="Restablecer valores por defecto">Restablecer</button>
          <div class="export">
            <button class="btn primary" id="btn-pdf">⤓ PDF</button>
            <button class="btn ghost" id="btn-tex">LaTeX</button>
            <button class="btn ghost" id="btn-ovl" title="Abrir y compilar en Overleaf">Overleaf</button>
            <label class="chk" title="Agregar la teoría como anexo"><input type="checkbox" id="chk-theory"> + teoría</label>
          </div>
        </div>
      </div>
      <nav class="tabs" role="tablist">
        ${[['calc', 'Calculadora'], ['steps', 'Paso a paso'], ['charts', 'Gráficos'], ['theory', 'Teoría']].map(([k, t]) => `<a role="tab" class="tab${tab === k ? ' active' : ''}" href="#/m/${mod.id}/${k}">${t}</a>`).join('')}
      </nav>
      <div id="tab-body"></div>`;

    const body = $('#tab-body');
    const recompute = () => {
      try {
        state.results[mod.id] = mod.compute(values);
        state.results[mod.id].error = null;
      } catch (err) {
        console.error(err);
        state.results[mod.id] = { error: err.message || String(err), doc: new HC.Doc(), results: [], checks: [], charts: [] };
      }
      store.set(`hc:v:${mod.id}`, values);
      return state.results[mod.id];
    };

    if (tab === 'calc') {
      body.innerHTML = `<div class="calc-layout"><form class="card form-card" id="form" onsubmit="return false"></form><div class="out-col" id="out"></div></div>`;
      const drawOut = () => {
        const r = recompute();
        const out = $('#out');
        if (r.error) { out.innerHTML = `<div class="card err">⚠ ${esc(r.error)}</div>`; return; }
        const main1 = (r.charts || [])[0];
        out.innerHTML = `
          <div class="card"><div class="card-title">Resultados</div><div class="kpis">${r.results.map((k) => `
            <div class="kpi${k.hl ? ' hl' : ''}"><span class="kpi-l">${esc(k.label)}</span><span class="kpi-v">${k.sym ? `${katexStr(k.sym, false)} = ` : ''}<b>${typeof k.value === 'number' ? HC.fmtPlain(k.value, k.d ?? 3) : esc(k.value)}</b> ${k.unit ? katexStr(`\\mathrm{${k.unit}}`, false) : ''}</span></div>`).join('')}</div></div>
          ${r.checks && r.checks.length ? `<div class="card"><div class="card-title">Verificaciones</div>${r.checks.map((c) => `<div class="st-check ${c.ok ? 'ok' : 'bad'}"><span class="st-badge">${c.ok ? '✓' : '✗'}</span><span>${richHTML(c.label)}${c.detail ? `<small> — ${richHTML(c.detail)}</small>` : ''}</span></div>`).join('')}</div>` : ''}
          ${main1 ? `<div class="card"><div class="card-title">${esc(main1.title)}</div><div class="chart-box${main1.type === 'svg' ? ' svg-box' : ''}" id="main-chart"></div><a class="more" href="#/m/${mod.id}/charts">Ver todos los gráficos (${r.charts.length}) →</a></div>` : ''}
          <a class="card link-card" href="#/m/${mod.id}/steps">Ver el desarrollo paso a paso completo →</a>`;
        if (main1) HC.chart.render(main1, $('#main-chart'));
      };
      HC.ui.buildForm($('#form'), mod, values, drawOut);
      drawOut();
    } else if (tab === 'steps') {
      const r = recompute();
      const heads = r.doc.blocks.filter((b) => b.t === 'h' && b.level === 1);
      body.innerHTML = r.error ? `<div class="card err">⚠ ${esc(r.error)}</div>` : `
        <div class="steps-layout">
          <aside class="toc card"><div class="card-title">Contenido</div>${heads.map((h) => `<a href="#st-${h.num}" data-jump="st-${h.num}">${h.num}. ${richHTML(h.text)}</a>`).join('')}</aside>
          <article class="card steps">${r.doc.toHTML()}</article>
        </div>`;
      body.querySelectorAll('[data-jump]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); document.getElementById(a.dataset.jump).scrollIntoView({ behavior: 'smooth', block: 'start' }); }));
    } else if (tab === 'charts') {
      const r = recompute();
      body.innerHTML = `<div class="charts-grid">${(r.charts || []).map((c, i) => `<div class="card chart-card${c.wide ? ' wide' : ''}"><div class="card-title">${esc(c.title)}</div><div class="chart-box${c.type === 'svg' ? ' svg-box' : ''}" id="ch-${i}"></div>${c.caption ? `<p class="caption">${richHTML(c.caption)}</p>` : ''}</div>`).join('')}</div>`;
      (r.charts || []).forEach((c, i) => HC.chart.render(c, $(`#ch-${i}`)));
    } else {
      body.innerHTML = `<article class="card th-content">${(mod.theory || []).map((s) => `<section class="th-sec"><h3>${richHTML(s.title)}</h3>${renderTheoryBody(s.body)}</section>`).join('')}
        ${(mod.fixes || []).length ? `<section class="th-sec"><h3>Correcciones respecto al Excel original</h3><ol>${mod.fixes.map((f) => `<li>${richHTML(f)}</li>`).join('')}</ol></section>` : ''}</article>`;
    }

    // acciones
    const withResult = (fn) => () => {
      const r = state.results[mod.id] || recompute();
      if (r.error) { HC.ui.toast('Corrige los datos antes de exportar', 'bad'); return; }
      fn(mod, values, r, { theory: $('#chk-theory').checked });
    };
    $('#btn-pdf').addEventListener('click', withResult(HC.report.toPDF));
    $('#btn-tex').addEventListener('click', withResult((...a) => { HC.report.toTeXFile(...a); HC.ui.toast('Archivo .tex descargado', 'ok'); }));
    $('#btn-ovl').addEventListener('click', withResult(HC.report.toOverleaf));
    $('#btn-reset').addEventListener('click', () => {
      state.values[mod.id] = HC.ui.defaults(mod);
      store.set(`hc:v:${mod.id}`, state.values[mod.id]);
      pageModule(mod.id, tab);
      HC.ui.toast('Valores restablecidos');
    });
    const ps = $('#preset');
    if (ps) ps.addEventListener('change', () => {
      if (ps.value === '') return;
      const p = mod.presets[+ps.value];
      const nv = Object.assign(HC.ui.defaults(mod), JSON.parse(JSON.stringify(p.values)));
      state.values[mod.id] = nv;
      store.set(`hc:v:${mod.id}`, nv);
      pageModule(mod.id, tab);
      HC.ui.toast(`Ejemplo cargado: ${p.name}`, 'ok');
    });
  }

  /* ---------- router ---------- */
  function route() {
    const h = (location.hash || '#/').slice(1);
    const parts = h.split('/').filter(Boolean);
    document.body.classList.remove('nav-open');
    if (parts[0] === 'm') pageModule(parts[1], parts[2]);
    else if (parts[0] === 'teoria') pageTheory(parts[1]);
    else if (parts[0] === 'formulario') pageFormulario();
    else if (parts[0] === 'correcciones') pageFixes();
    else if (parts[0] === 'ayuda') pageHelp();
    else pageHome();
    markActive();
    main().scrollTop = 0;
    global.scrollTo(0, 0);
  }

  /* ---------- tema y proyecto ---------- */
  function initTheme() {
    const t = store.get('hc:theme', null);
    if (t) document.documentElement.dataset.theme = t;
    $('#btn-theme').addEventListener('click', () => {
      const cur = document.documentElement.dataset.theme || (matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
      const nx = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.dataset.theme = nx;
      store.set('hc:theme', nx);
      route();
    });
  }
  function initProject() {
    const dlg = $('#dlg-project');
    $('#btn-project').addEventListener('click', () => {
      const p = HC.report.project();
      $('#pj-name').value = p.name || '';
      $('#pj-author').value = p.author || '';
      $('#pj-org').value = p.org || '';
      dlg.showModal();
    });
    $('#pj-save').addEventListener('click', () => {
      store.set('hc:project', { name: $('#pj-name').value, author: $('#pj-author').value, org: $('#pj-org').value });
      HC.ui.toast('Datos del proyecto guardados', 'ok');
    });
  }

  function init() {
    buildSidebar();
    initTheme();
    initProject();
    $('#btn-menu').addEventListener('click', () => document.body.classList.toggle('nav-open'));
    $('#scrim').addEventListener('click', () => document.body.classList.remove('nav-open'));
    $('#quick').addEventListener('input', (e) => {
      const q = e.target.value.toLowerCase();
      document.querySelectorAll('#nav .nav-link[data-mod]').forEach((a) => { a.hidden = q && !a.textContent.toLowerCase().includes(q); });
    });
    global.addEventListener('hashchange', route);
    route();
  }
  HC.init = init;
})(window);
