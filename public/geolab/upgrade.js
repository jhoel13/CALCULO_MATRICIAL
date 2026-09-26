(() => {
  const $ = selector => document.querySelector(selector);
  const numeral = ['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
  const palettes = [
    ['ocean','Océano','Turquesa y azul profundo',['#0d2031','#088f95','#e6a34d','#eaf0f5']],
    ['cobalt','Cobalto','Azul técnico y celeste',['#183a73','#306fd0','#21a9b1','#e8f0ff']],
    ['copper','Cobre','Tierra cálida y pizarra',['#58392f','#bc6e37','#298f92','#fbefe7']],
    ['forest','Bosque','Verde mineral y arena',['#1c493d','#27825c','#d7a947','#e6f5ec']],
    ['violet','Violeta','Morado, coral y grafito',['#3c315e','#7955b3','#de8b68','#f1eafa']]
  ];
  const safe = value => String(value).replace(/[&<>"']/g, character => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
  const math = tex => window.katex ? window.katex.renderToString(tex,{throwOnError:false,output:'html'}) : safe(tex);
  let mode = 'light', accent = 'ocean', currentChapter = 0;
  try {
    const savedMode = localStorage.getItem('geolab-mode');
    const savedAccent = localStorage.getItem('geolab-accent');
    if (['light','dark'].includes(savedMode)) mode = savedMode;
    if (palettes.some(item => item[0] === savedAccent)) accent = savedAccent;
  } catch (_) {}
  function updateActive() {
    document.documentElement.dataset.mode = mode;
    document.documentElement.dataset.accent = accent;
    $('#quick-mode').textContent = mode === 'light' ? '☾' : '☀';
    $('#quick-mode').title = mode === 'light' ? 'Activar modo oscuro' : 'Activar modo claro';
    document.querySelector('meta[name="theme-color"]').content = mode === 'light' ? '#eaf0f5' : '#0c1724';
    document.querySelectorAll('[data-set-mode]').forEach(button => {
      const active = button.dataset.setMode === mode;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
    });
    document.querySelectorAll('[data-set-accent]').forEach(button => {
      const active = button.dataset.setAccent === accent;
      button.classList.toggle('active',active);
      button.setAttribute('aria-pressed',String(active));
      button.querySelector('.palette-check').textContent = active ? '✓' : '';
    });
  }
  function setMode(value) {
    if (!['light','dark'].includes(value)) return;
    mode = value;
    try { localStorage.setItem('geolab-mode',value); } catch (_) {}
    updateActive();
  }
  function setAccent(value) {
    if (!palettes.some(item => item[0] === value)) return;
    accent = value;
    try { localStorage.setItem('geolab-accent',value); } catch (_) {}
    updateActive();
  }
  function el(tag,className,text) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  }
  function appearanceIntro(overline,title,description) {
    const box = el('div','appearance-intro');
    box.append(el('span','section-overline',overline),el('h2','',title),el('p','',description));
    return box;
  }
  function renderAppearance() {
    const modePanel = $('#panel-mode');
    modePanel.append(appearanceIntro('APARIENCIA','Modo de lectura','Elige la luminosidad que te resulte más cómoda. La selección se guarda en este navegador.'));
    const modeGrid = el('div','appearance-grid');
    [['light','Claro','Fondos suaves y contraste alto para trabajo diurno.'],['dark','Oscuro','Superficies oscuras para sesiones con poca luz.']].forEach(item => {
      const button = el('button','appearance-option');
      button.type = 'button';
      button.dataset.setMode = item[0];
      button.setAttribute('aria-pressed','false');
      const preview = el('div','appearance-preview preview-'+item[0]);
      preview.setAttribute('aria-hidden','true');
      const sidebar = el('span','mock-sidebar');
      const content = el('span','mock-content');
      content.append(el('span','mock-line'),el('span','mock-line short'),el('span','mock-line'));
      preview.append(sidebar,content);
      button.append(preview,el('strong','',item[1]),el('small','',item[2]));
      modeGrid.append(button);
    });
    modePanel.append(modeGrid);
    const colorPanel = $('#panel-colors');
    colorPanel.append(appearanceIntro('PERSONALIZACIÓN','Paletas de color','Cambia los acentos, botones, gráficos y encabezados sin alterar los datos del cálculo.'));
    const colorGrid = el('div','appearance-grid');
    palettes.forEach(item => {
      const button = el('button','appearance-option');
      button.type = 'button';
      button.dataset.setAccent = item[0];
      button.setAttribute('aria-pressed','false');
      const swatches = el('div','palette-swatches');
      swatches.setAttribute('aria-hidden','true');
      item[3].forEach(color => {const swatch = el('span');swatch.style.background = color;swatches.append(swatch);});
      const name = el('div','palette-name');
      name.append(el('strong','',item[1]),el('span','palette-check'));
      button.append(swatches,name,el('small','',item[2]));
      colorGrid.append(button);
    });
    colorPanel.append(colorGrid);
    updateActive();
  }
  function guideCard(title,textOrItems,formula) {
    const card = el('article','guide-card');
    card.append(el('h3','',title));
    if (Array.isArray(textOrItems)) {
      const list = el('ul');
      textOrItems.forEach(item => list.append(el('li','',item)));
      card.append(list);
    } else if (textOrItems) card.append(el('p','',textOrItems));
    if (formula) {
      const formulaBox = el('div','theory-formula');
      formulaBox.innerHTML = math(formula);
      card.append(formulaBox);
    }
    return card;
  }
  function renderGuide(chapter) {
    const guide = window.GEOLAB_GUIDES[chapter];
    const panel = $('#panel-guide');
    panel.replaceChildren();
    const hero = el('div','guide-hero');
    hero.append(el('span','section-overline','GUÍA DEL CAPÍTULO '+numeral[chapter-1]),el('h2','','Del dato al criterio de ingeniería'),el('p','',guide.intro));
    panel.append(hero);
    const grid = el('div','guide-grid');
    grid.append(
      guideCard('Antes de calcular',guide.before),
      guideCard('Fórmula central','Revisa la convención de signos y las unidades de cada método antes de comparar resultados.',guide.formula),
      guideCard('Cómo interpretar',guide.interpret),
      guideCard('Control de coherencia',guide.check)
    );
    panel.append(grid);
    const unitHero = el('div','guide-hero guide-units');
    unitHero.append(el('span','section-overline','REFERENCIA TRANSVERSAL'),el('h2','','Unidades que debes mantener consistentes'));
    const table = el('table','unit-table');
    const head = el('thead');
    const headRow = el('tr');
    ['Magnitud','Unidad frecuente','Equivalencia o criterio'].forEach(value => headRow.append(el('th','',value)));
    head.append(headRow);
    const body = el('tbody');
    window.GEOLAB_UNIT_ROWS.forEach(row => {
      const tr = el('tr');
      row.forEach(value => tr.append(el('td','',value)));
      body.append(tr);
    });
    table.append(head,body);
    const scroll = el('div','unit-table-wrap');
    scroll.append(table);
    unitHero.append(scroll);
    panel.append(unitHero);
  }
  function updateChapter() {
    const active = document.querySelector('.chapter-btn.active');
    if (!active) return;
    const chapter = Number(active.dataset.chapter);
    if (chapter === currentChapter) return;
    currentChapter = chapter;
    $('#chapter-method-count').textContent = window.GEOLAB_CALCS.filter(item => item.chapter === chapter).length+' métodos';
    $('#chapter-theory-count').textContent = window.GEOLAB_CHAPTERS[chapter-1].topics.length+' conceptos';
    renderGuide(chapter);
  }
  function updateChartNote() {
    const calc = window.GEOLAB_CALCS.find(item => item.id === $('#calc-select').value);
    if (calc) $('#chart-explanation').textContent = window.GEOLAB_CHART_NOTES[calc.id] || 'Gráfico de los valores ingresados.';
  }
  function updateCredits() {
    const sources = $('#panel-sources');
    const credit = el('div','guide-hero');
    credit.append(el('span','section-overline','CRÉDITOS'),el('h2','','Desarrollado por JHOEL TOCAS CERCADO'),el('p','','Aplicación interactiva de estudio basada en la bibliografía facilitada. Los autores de los libros conservan la autoría de sus obras.'));
    sources.prepend(credit);
  }
  $('#panel-mode').addEventListener('click',event => {
    const button = event.target.closest('[data-set-mode]');
    if (button) setMode(button.dataset.setMode);
  });
  $('#panel-colors').addEventListener('click',event => {
    const button = event.target.closest('[data-set-accent]');
    if (button) setAccent(button.dataset.setAccent);
  });
  $('#quick-mode').addEventListener('click',() => setMode(mode === 'light' ? 'dark' : 'light'));
  document.querySelectorAll('.tab').forEach(button => button.addEventListener('click',() => {
    if (button.dataset.tab === 'guide') updateChapter();
  }));
  renderAppearance();
  updateCredits();
  updateChapter();
  updateChartNote();
  new MutationObserver(updateChapter).observe($('#chapter-nav'),{childList:true});
  new MutationObserver(updateChartNote).observe($('#chart'),{childList:true});
})();
