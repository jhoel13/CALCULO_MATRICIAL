/* HidroCalc — documento de cálculo paso a paso (HTML con KaTeX + exportación LaTeX) */
(function (global) {
  'use strict';
  const HC = global.HC;

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  function katexStr(tex, display) {
    try {
      return global.katex.renderToString(tex, { displayMode: !!display, throwOnError: false, strict: 'ignore', trust: false });
    } catch (e) {
      return `<code>${esc(tex)}</code>`;
    }
  }

  /* texto con $...$ y **negrita** -> HTML */
  function richHTML(text) {
    const parts = String(text).split(/(\$[^$]+\$)/g);
    return parts.map((p) => {
      if (p.startsWith('$') && p.endsWith('$') && p.length > 1) return katexStr(p.slice(1, -1), false);
      return esc(p).replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    }).join('');
  }

  const UNI = { '°': '$^\\circ$', '²': '$^2$', '³': '$^3$', '≤': '$\\leq$', '≥': '$\\geq$', '×': '$\\times$', '→': '$\\rightarrow$', '≈': '$\\approx$', '±': '$\\pm$', 'µ': '$\\mu$', 'Δ': '$\\Delta$', 'π': '$\\pi$', 'γ': '$\\gamma$', 'φ': '$\\phi$', 'σ': '$\\sigma$', 'τ': '$\\tau$', 'α': '$\\alpha$', '–': '--', '—': '---', '“': '``', '”': "''", '✓': '$\\checkmark$', '✗': '$\\times$', '·': '$\\cdot$', '⇒': '$\\Rightarrow$', '−': '$-$', '⁻': '$^{-}$', '⁶': '$^{6}$', '¹': '$^{1}$', '…': '\\ldots{}', '√': '$\\surd$', '₁': '$_1$', '₂': '$_2$', 'ν': '$\\nu$', 'β': '$\\beta$', 'θ': '$\\theta$', 'μ': '$\\mu$', 'ρ': '$\\rho$', '∞': '$\\infty$' };
  function texText(s) {
    return String(s)
      .replace(/\\/g, '\\textbackslash{}')
      .replace(/([{}%&#_])/g, '\\$1')
      .replace(/\^/g, '\\^{}')
      .replace(/~/g, '\\~{}')
      .replace(/[°²³≤≥×→≈±µΔπγφστα–—“”✓✗·⇒−⁻⁶¹…√₁₂νβθμρ∞]/g, (c) => UNI[c] || c)
      .replace(/\*\*([^*]+)\*\*/g, '\\textbf{$1}');
  }
  /* texto con $...$ -> LaTeX (escapa solo lo que está fuera de $) */
  function richTeX(text) {
    return String(text).split(/(\$[^$]+\$)/g).map((p) => (p.startsWith('$') && p.endsWith('$') && p.length > 1) ? p : texText(p)).join('');
  }
  const unitTex = (u) => (u ? `\\;\\mathrm{${u}}` : '');

  class Doc {
    constructor() { this.blocks = []; this.sec = 0; this.sub = 0; this.eqn = 0; }
    h(text) { this.sec++; this.sub = 0; this.blocks.push({ t: 'h', level: 1, num: `${this.sec}`, text }); return this; }
    h2(text) { this.sub++; this.blocks.push({ t: 'h', level: 2, num: `${this.sec}.${this.sub}`, text }); return this; }
    p(text) { this.blocks.push({ t: 'p', text }); return this; }
    eq(tex, label) { this.blocks.push({ t: 'eq', tex, label }); return this; }
    /** sym = f = sub = val unit */
    calc(o) { this.blocks.push(Object.assign({ t: 'calc', d: 3 }, o)); return this; }
    check(text, ok, tex) { this.blocks.push({ t: 'check', text, ok: !!ok, tex }); return this; }
    table(head, rows, caption) { this.blocks.push({ t: 'table', head, rows, caption }); return this; }
    note(text, kind = 'info') { this.blocks.push({ t: 'note', text, kind }); return this; }
    list(items) { this.blocks.push({ t: 'list', items }); return this; }

    static calcTex(b, forHTML) {
      const val = typeof b.val === 'string' ? b.val : HC.fmt(b.val, b.d);
      const parts = [b.sym];
      if (b.f) parts.push(b.f);
      if (b.sub) parts.push(b.sub);
      parts.push(`${val}${unitTex(b.unit)}`);
      const long = parts.join('').length > 110 && parts.length > 2;
      if (!long) return parts.join(' = ');
      if (forHTML) return `\\begin{aligned}${parts[0]} &= ${parts.slice(1).join(' \\\\ &= ')}\\end{aligned}`;
      return `${parts[0]} &= ${parts.slice(1).join(' \\\\\n  &= ')}`;
    }

    toHTML() {
      const out = [];
      for (const b of this.blocks) {
        switch (b.t) {
          case 'h':
            out.push(b.level === 1
              ? `<h3 class="st-h1" id="st-${b.num}"><span class="st-num">${b.num}</span>${richHTML(b.text)}</h3>`
              : `<h4 class="st-h2"><span class="st-num">${b.num}</span>${richHTML(b.text)}</h4>`);
            break;
          case 'p': out.push(`<p class="st-p">${richHTML(b.text)}</p>`); break;
          case 'eq': this.eqn++; out.push(`<div class="st-eq formula">${katexStr(b.tex, true)}${b.label ? `<span class="st-eqlabel">${richHTML(b.label)}</span>` : ''}</div>`); break;
          case 'calc':
            out.push(`<div class="st-calc">${katexStr(Doc.calcTex(b, true), true)}${b.note ? `<div class="st-calc-note">${richHTML(b.note)}</div>` : ''}</div>`);
            break;
          case 'check':
            out.push(`<div class="st-check ${b.ok ? 'ok' : 'bad'}"><span class="st-badge">${b.ok ? '✓ CUMPLE' : '✗ NO CUMPLE'}</span><span>${richHTML(b.text)}</span>${b.tex ? `<span class="st-check-tex">${katexStr(b.tex, false)}</span>` : ''}</div>`);
            break;
          case 'table':
            out.push(`<div class="st-table-wrap"><table class="st-table">${b.caption ? `<caption>${richHTML(b.caption)}</caption>` : ''}<thead><tr>${b.head.map((h) => `<th>${richHTML(h)}</th>`).join('')}</tr></thead><tbody>${b.rows.map((r) => `<tr>${r.map((c) => `<td>${richHTML(c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`);
            break;
          case 'note': out.push(`<div class="st-note ${b.kind}">${richHTML(b.text)}</div>`); break;
          case 'list': out.push(`<ul class="st-list">${b.items.map((i) => `<li>${richHTML(i)}</li>`).join('')}</ul>`); break;
        }
      }
      return out.join('\n');
    }

    toTeX() {
      const out = [];
      for (const b of this.blocks) {
        switch (b.t) {
          case 'h': out.push(b.level === 1 ? `\n\\section{${richTeX(b.text)}}` : `\\subsection{${richTeX(b.text)}}`); break;
          case 'p': out.push(`${richTeX(b.text)}\n`); break;
          case 'eq': out.push(`\\begin{equation*}\n  ${b.tex}${b.label ? `\\tag*{${texText(b.label.replace(/\$/g, ''))}}` : ''}\n\\end{equation*}`); break;
          case 'calc': {
            const t = Doc.calcTex(b, false);
            out.push(t.includes('&=') ? `\\begin{align*}\n  ${t}\n\\end{align*}` : `\\begin{equation*}\n  ${t}\n\\end{equation*}`);
            if (b.note) out.push(`{\\small\\itshape ${richTeX(b.note)}}\n`);
            break;
          }
          case 'check':
            out.push(`\\noindent\\fbox{\\textbf{${b.ok ? '\\textcolor{okgreen}{CUMPLE}' : '\\textcolor{badred}{NO CUMPLE}'}}}\\; ${richTeX(b.text)}${b.tex ? ` \\quad $${b.tex}$` : ''}\\par\\medskip`);
            break;
          case 'table': {
            const cols = 'l'.repeat(1) + 'c'.repeat(Math.max(b.head.length - 1, 0));
            const wide = b.head.length > 6;
            out.push(`\\begin{table}[H]\\centering\\small${b.caption ? `\n\\caption*{${richTeX(b.caption)}}` : ''}\n${wide ? '\\resizebox{\\linewidth}{!}{%\n' : ''}\\begin{tabular}{${cols}}\n\\toprule\n${b.head.map(richTeX).join(' & ')} \\\\\n\\midrule\n${b.rows.map((r) => r.map(richTeX).join(' & ') + ' \\\\').join('\n')}\n\\bottomrule\n\\end{tabular}${wide ? '}' : ''}\n\\end{table}`);
            break;
          }
          case 'note': out.push(`\\begin{nota}${richTeX(b.text)}\\end{nota}`); break;
          case 'list': out.push(`\\begin{itemize}\n${b.items.map((i) => `  \\item ${richTeX(i)}`).join('\n')}\n\\end{itemize}`); break;
        }
      }
      return out.join('\n');
    }
  }

  Object.assign(HC, { Doc, katexStr, richHTML, richTeX, texText, esc });
})(window);
