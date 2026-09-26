/* HidroCalc — memoria de cálculo: PDF (impresión), LaTeX (.tex) y Overleaf */
(function (global) {
  'use strict';
  const HC = global.HC;
  const { esc, richHTML, richTeX, texText, katexStr } = HC;

  function project() {
    try { return JSON.parse(localStorage.getItem('hc:project') || '{}'); } catch (e) { return {}; }
  }
  const cellVal = (c, v) => {
    if (c.type === 'select') { const o = (c.options || []).find((x) => String(typeof x === 'object' ? x.v : x) === String(v)); return o ? (typeof o === 'object' ? o.l : o) : v; }
    return typeof v === 'number' ? HC.fmtPlain(v, 4) : (v ?? '');
  };
  const today = () => new Date().toLocaleDateString('es-PE', { year: 'numeric', month: 'long', day: 'numeric' });

  function theoryHTML(mod) {
    return (mod.theory || []).map((s) => `<h3 class="st-h1">${richHTML(s.title)}</h3>${HC.renderTheoryBody(s.body)}`).join('');
  }
  function theoryTeX(mod) {
    return (mod.theory || []).map((s) => `\\subsection*{${richTeX(s.title)}}\n${s.body.map((b) => {
      if (typeof b === 'string') return richTeX(b) + '\n';
      if (b.eq) return `\\begin{equation*}\n${b.eq}\n\\end{equation*}${b.name ? `\n{\\small ${richTeX(b.name)}}\n` : ''}`;
      if (b.list) return `\\begin{itemize}\n${b.list.map((i) => `\\item ${richTeX(i)}`).join('\n')}\n\\end{itemize}`;
      if (b.table) return `\\begin{center}\\small\\begin{tabular}{${'l'.repeat(b.table.head.length)}}\\toprule\n${b.table.head.map(richTeX).join(' & ')}\\\\\\midrule\n${b.table.rows.map((r) => r.map(richTeX).join(' & ') + '\\\\').join('\n')}\n\\bottomrule\\end{tabular}\\end{center}`;
      return '';
    }).join('\n')}`).join('\n');
  }

  /* ---------------- PDF vía impresión del navegador ---------------- */
  async function toPDF(mod, values, result, opts = {}) {
    const pj = project();
    const { rows, tables } = HC.ui.inputRows(mod, values);
    const root = document.getElementById('print-root');
    const imgs = [];
    for (const c of result.charts || []) {
      if (c.type === 'svg') imgs.push(`<figure class="pr-fig">${c.svg}<figcaption>${esc(c.title)}</figcaption></figure>`);
      else {
        const url = await HC.chart.toImage(c);
        imgs.push(`<figure class="pr-fig"><img src="${url}" alt="${esc(c.title)}"><figcaption>${esc(c.title)}</figcaption></figure>`);
      }
    }
    let lastGroup = '';
    const inRows = rows.map((r) => {
      const g = r.group !== lastGroup ? `<tr class="grp"><td colspan="4">${esc(r.group)}</td></tr>` : '';
      lastGroup = r.group;
      return `${g}<tr><td>${esc(r.label)}</td><td>${r.sym ? katexStr(r.sym, false) : ''}</td><td class="num">${esc(r.value)}</td><td>${r.unit ? katexStr(`\\mathrm{${r.unit}}`, false) : ''}</td></tr>`;
    }).join('');
    const tabHTML = tables.map((t) => `<h4 class="st-h2">${esc(t.f.label)}</h4><table class="st-table"><thead><tr>${t.f.columns.map((c) => `<th>${esc(c.label)}${c.unit ? ` (${esc(c.unit)})` : ''}</th>`).join('')}</tr></thead><tbody>${t.rows.map((r) => `<tr>${t.f.columns.map((c) => `<td>${esc(cellVal(c, r[c.id]))}</td>`).join('')}</tr>`).join('')}</tbody></table>`).join('');
    const resRows = (result.results || []).map((r) => `<tr><td>${esc(r.label)}</td><td>${r.sym ? katexStr(r.sym, false) : ''}</td><td class="num"><strong>${typeof r.value === 'number' ? HC.fmtPlain(r.value, r.d ?? 3) : esc(r.value)}</strong></td><td>${r.unit ? katexStr(`\\mathrm{${r.unit}}`, false) : ''}</td></tr>`).join('');
    const checks = (result.checks || []).map((c) => `<div class="st-check ${c.ok ? 'ok' : 'bad'}"><span class="st-badge">${c.ok ? '✓ CUMPLE' : '✗ NO CUMPLE'}</span><span>${richHTML(c.label)}${c.detail ? ` — ${richHTML(c.detail)}` : ''}</span></div>`).join('');

    root.innerHTML = `
    <article class="report">
      <header class="pr-cover">
        <div class="pr-brand"><span class="logo-drop"></span> HidroCalc · Memoria de cálculo</div>
        <h1>${esc(mod.title)}</h1>
        <p class="pr-sub">${esc(mod.description)}</p>
        <table class="pr-meta">
          <tr><td>Proyecto</td><td>${esc(pj.name || '—')}</td></tr>
          <tr><td>Responsable</td><td>${esc(pj.author || '—')}</td></tr>
          <tr><td>Entidad / curso</td><td>${esc(pj.org || '—')}</td></tr>
          <tr><td>Fecha</td><td>${today()}</td></tr>
        </table>
      </header>
      <section><h2>1. Datos de entrada</h2><table class="st-table pr-in"><thead><tr><th>Parámetro</th><th>Símbolo</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>${inRows}</tbody></table>${tabHTML}</section>
      <section><h2>2. Resultados principales</h2><table class="st-table pr-in"><thead><tr><th>Resultado</th><th>Símbolo</th><th>Valor</th><th>Unidad</th></tr></thead><tbody>${resRows}</tbody></table></section>
      ${checks ? `<section><h2>3. Verificaciones</h2>${checks}</section>` : ''}
      <section class="pr-steps"><h2>4. Desarrollo paso a paso</h2>${result.doc.toHTML()}</section>
      ${imgs.length ? `<section class="pr-figs"><h2>5. Gráficos y esquemas</h2>${imgs.join('')}</section>` : ''}
      ${opts.theory ? `<section class="pr-theory"><h2>Anexo: fundamento teórico</h2>${theoryHTML(mod)}</section>` : ''}
      <footer class="pr-foot">Generado con HidroCalc — ${esc(mod.title)} — ${today()}</footer>
    </article>`;
    document.body.classList.add('printing');
    const done = () => { document.body.classList.remove('printing'); root.innerHTML = ''; global.removeEventListener('afterprint', done); };
    global.addEventListener('afterprint', done);
    const oldTitle = document.title;
    document.title = `Memoria_${mod.id}_${new Date().toISOString().slice(0, 10)}`;
    await new Promise((r) => setTimeout(r, 250));
    global.print();
    document.title = oldTitle;
  }

  /* ---------------- LaTeX ---------------- */
  function buildTeX(mod, values, result, opts = {}) {
    const pj = project();
    const { rows, tables } = HC.ui.inputRows(mod, values);
    const unit = (u) => (u ? `$\\mathrm{${u}}$` : '');
    const sym = (s) => (s ? `$${s}$` : '');
    let lastGroup = '';
    const inRows = rows.map((r) => {
      const g = r.group !== lastGroup ? `\\multicolumn{4}{l}{\\textit{${texText(r.group)}}}\\\\\n` : '';
      lastGroup = r.group;
      return `${g}${texText(r.label)} & ${sym(r.sym)} & ${texText(r.value)} & ${unit(r.unit)}\\\\`;
    }).join('\n');
    const tabTeX = tables.map((t) => `\\subsection*{${texText(t.f.label)}}
\\begin{center}\\small
${t.f.columns.length > 6 ? '\\resizebox{\\linewidth}{!}{%\n' : ''}\\begin{tabular}{${'c'.repeat(t.f.columns.length)}}\\toprule
${t.f.columns.map((c) => `${texText(c.label)}${c.unit ? ` (${unit(c.unit)})` : ''}`).join(' & ')}\\\\\\midrule
${t.rows.map((r) => t.f.columns.map((c) => texText(cellVal(c, r[c.id]))).join(' & ') + '\\\\').join('\n')}
\\bottomrule\\end{tabular}${t.f.columns.length > 6 ? '}' : ''}
\\end{center}`).join('\n');
    const resRows = (result.results || []).map((r) => `${texText(r.label)} & ${sym(r.sym)} & \\textbf{${texText(typeof r.value === 'number' ? HC.fmtPlain(r.value, r.d ?? 3) : r.value)}} & ${unit(r.unit)}\\\\`).join('\n');
    const checks = (result.checks || []).map((c) => `\\item[${c.ok ? '\\textcolor{okgreen}{\\checkmark}' : '\\textcolor{badred}{$\\times$}'}] ${richTeX(c.label)}${c.detail ? ` --- ${richTeX(c.detail)}` : ''}`).join('\n');
    const figs = (result.charts || []).filter((c) => c.type !== 'svg').map(HC.chart.toPgf).join('\n\n');

    return `% ==========================================================
% Memoria de cálculo generada por HidroCalc
% Módulo: ${mod.title}
% Compilar con pdfLaTeX (por ejemplo en Overleaf)
% ==========================================================
\\documentclass[11pt,a4paper]{article}
\\usepackage[utf8]{inputenc}
\\usepackage[T1]{fontenc}
\\usepackage[spanish,es-nodecimaldot,es-noshorthands]{babel}
\\usepackage{lmodern}
\\usepackage[margin=2.2cm]{geometry}
\\usepackage{amsmath,amssymb}
\\usepackage{booktabs,array,float,graphicx}
\\usepackage[table]{xcolor}
\\usepackage{pgfplots}
\\pgfplotsset{compat=1.17}
\\usepackage{caption}
\\usepackage{fancyhdr}
\\usepackage{titlesec}
\\usepackage[most]{tcolorbox}
\\usepackage[colorlinks=true,linkcolor=hcblue,urlcolor=hcblue]{hyperref}
\\definecolor{hcblue}{HTML}{1D4ED8}
\\definecolor{okgreen}{HTML}{15803D}
\\definecolor{badred}{HTML}{B91C1C}
${HC.PGF_COLORS}
\\newtcolorbox{nota}{colback=hcblue!5,colframe=hcblue!60,boxrule=0.5pt,arc=2pt,left=6pt,right=6pt,top=4pt,bottom=4pt}
\\titleformat{\\section}{\\large\\bfseries\\color{hcblue}}{\\thesection.}{0.6em}{}
\\titleformat{\\subsection}{\\normalsize\\bfseries}{\\thesubsection}{0.6em}{}
\\setlength{\\parindent}{0pt}
\\setlength{\\parskip}{4pt}
\\allowdisplaybreaks
\\pagestyle{fancy}
\\fancyhf{}
\\lhead{\\small HidroCalc --- ${texText(mod.title)}}
\\rhead{\\small ${texText(pj.name || 'Memoria de cálculo')}}
\\cfoot{\\small \\thepage}

\\begin{document}
\\begin{titlepage}
\\centering
\\vspace*{2cm}
{\\color{hcblue}\\rule{\\linewidth}{1.2pt}}\\\\[0.6cm]
{\\Large\\scshape Memoria de cálculo}\\\\[0.4cm]
{\\Huge\\bfseries ${texText(mod.title)}}\\\\[0.4cm]
{\\large ${texText(mod.description)}}\\\\[0.4cm]
{\\color{hcblue}\\rule{\\linewidth}{1.2pt}}\\\\[1.5cm]
\\begin{tabular}{>{\\bfseries}r l}
Proyecto: & ${texText(pj.name || '---')}\\\\
Responsable: & ${texText(pj.author || '---')}\\\\
Entidad / curso: & ${texText(pj.org || '---')}\\\\
Fecha: & ${texText(today())}\\\\
\\end{tabular}
\\vfill
{\\small Documento generado automáticamente con \\textbf{HidroCalc}.}
\\end{titlepage}

\\tableofcontents
\\newpage

\\section*{Datos de entrada}
\\addcontentsline{toc}{section}{Datos de entrada}
\\begin{center}\\small
\\begin{tabular}{p{7.2cm}ccc}
\\toprule
\\textbf{Parámetro} & \\textbf{Símbolo} & \\textbf{Valor} & \\textbf{Unidad}\\\\
\\midrule
${inRows}
\\bottomrule
\\end{tabular}
\\end{center}
${tabTeX}

\\section*{Resultados principales}
\\addcontentsline{toc}{section}{Resultados principales}
\\begin{center}\\small
\\begin{tabular}{p{7.2cm}ccc}
\\toprule
\\textbf{Resultado} & \\textbf{Símbolo} & \\textbf{Valor} & \\textbf{Unidad}\\\\
\\midrule
${resRows}
\\bottomrule
\\end{tabular}
\\end{center}
${checks ? `\n\\subsection*{Verificaciones}\n\\begin{itemize}\n${checks}\n\\end{itemize}` : ''}

\\newpage
\\part*{Desarrollo paso a paso}
\\addcontentsline{toc}{part}{Desarrollo paso a paso}
${result.doc.toTeX()}

${figs ? `\\newpage\n\\section*{Gráficos}\n\\addcontentsline{toc}{section}{Gráficos}\n${figs}` : ''}
${opts.theory ? `\\newpage\n\\section*{Anexo: fundamento teórico}\n\\addcontentsline{toc}{section}{Anexo: fundamento teórico}\n${theoryTeX(mod)}` : ''}
\\end{document}
`;
  }

  function download(name, content, type = 'text/plain') {
    const blob = new Blob([content], { type: `${type};charset=utf-8` });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = name;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 500);
  }

  function toTeXFile(mod, values, result, opts) {
    download(`memoria_${mod.id}.tex`, buildTeX(mod, values, result, opts), 'application/x-tex');
  }

  function toOverleaf(mod, values, result, opts) {
    const form = document.createElement('form');
    form.method = 'POST';
    form.action = 'https://www.overleaf.com/docs';
    form.target = '_blank';
    const add = (k, v) => { const i = document.createElement('input'); i.type = 'hidden'; i.name = k; i.value = v; form.appendChild(i); };
    add('encoded_snip', encodeURIComponent(buildTeX(mod, values, result, opts)));
    add('snip_name', `memoria_${mod.id}.tex`);
    add('engine', 'pdflatex');
    document.body.appendChild(form);
    form.submit();
    form.remove();
  }

  Object.assign(HC, { report: { toPDF, toTeXFile, toOverleaf, buildTeX, download, project } });
})(window);
