/* HidroCalc — constructor de formularios a partir del esquema de cada módulo */
(function (global) {
  'use strict';
  const HC = global.HC;
  const { esc, katexStr } = HC;

  const unitHTML = (u) => (u ? `<span class="unit">${katexStr(`\\mathrm{${u}}`, false)}</span>` : '');
  const symHTML = (s) => (s ? `<span class="sym">${katexStr(s, false)}</span>` : '');

  function optList(options) {
    return (options || []).map((o) => (typeof o === 'object' ? o : { v: o, l: String(o) }));
  }

  function defaults(mod) {
    const v = {};
    mod.inputs.forEach((g) => g.fields.forEach((f) => {
      v[f.id] = f.type === 'table' ? JSON.parse(JSON.stringify(f.value)) : f.value;
    }));
    return v;
  }

  function fieldHTML(f, val) {
    const help = f.help ? `<span class="help" tabindex="0" data-tip="${esc(f.help)}">?</span>` : '';
    const lab = `<label for="in-${f.id}"><span class="lab-text">${esc(f.label)}</span>${symHTML(f.sym)}${help}</label>`;
    if (f.type === 'select') {
      return `<div class="field" data-field="${f.id}">${lab}<div class="ctrl"><select id="in-${f.id}" data-id="${f.id}">${optList(f.options).map((o) => `<option value="${esc(o.v)}"${String(o.v) === String(val) ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select>${unitHTML(f.unit)}</div></div>`;
    }
    if (f.type === 'text') {
      return `<div class="field" data-field="${f.id}">${lab}<div class="ctrl"><input id="in-${f.id}" data-id="${f.id}" type="text" value="${esc(val)}"></div></div>`;
    }
    if (f.type === 'table') return tableHTML(f, val);
    return `<div class="field" data-field="${f.id}">${lab}<div class="ctrl"><input id="in-${f.id}" data-id="${f.id}" type="number" inputmode="decimal" step="${f.step || 'any'}"${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''} value="${esc(val)}">${unitHTML(f.unit)}</div></div>`;
  }

  function tableHTML(f, rows) {
    const head = f.columns.map((c) => `<th>${esc(c.label)}${c.unit ? `<small>${katexStr(`\\mathrm{${c.unit}}`, false)}</small>` : ''}</th>`).join('');
    const body = rows.map((r, i) => `<tr data-row="${i}">${f.columns.map((c) => {
      const val = r[c.id] ?? '';
      if (c.readonly) return `<td class="ro">${esc(val)}</td>`;
      if (c.type === 'select') return `<td><select data-tab="${f.id}" data-row="${i}" data-col="${c.id}">${optList(c.options).map((o) => `<option value="${esc(o.v)}"${String(o.v) === String(val) ? ' selected' : ''}>${esc(o.l)}</option>`).join('')}</select></td>`;
      return `<td><input data-tab="${f.id}" data-row="${i}" data-col="${c.id}" type="${c.type === 'text' ? 'text' : 'number'}" step="any" value="${esc(val)}" style="${c.w ? `width:${c.w}` : ''}"></td>`;
    }).join('')}${f.fixed ? '' : `<td class="rowdel"><button type="button" class="icon-btn sm" data-del="${f.id}" data-row="${i}" title="Eliminar fila">×</button></td>`}</tr>`).join('');
    return `<div class="field field-table" data-field="${f.id}"><div class="lab-text tbl-title">${esc(f.label)}${f.help ? `<span class="help" tabindex="0" data-tip="${esc(f.help)}">?</span>` : ''}</div>
      <div class="tbl-scroll"><table class="in-table"><thead><tr>${head}${f.fixed ? '' : '<th></th>'}</tr></thead><tbody>${body}</tbody></table></div>
      ${f.fixed ? '' : `<button type="button" class="btn ghost sm" data-add="${f.id}">＋ ${esc(f.addLabel || 'Agregar fila')}</button>`}</div>`;
  }

  /** construye el formulario y conecta eventos; onChange(values) */
  function buildForm(container, mod, values, onChange) {
    const render = () => {
      container.innerHTML = mod.inputs.map((g, gi) => `
        <fieldset class="fgroup${g.collapsed ? ' collapsed' : ''}" data-g="${gi}">
          <legend><button type="button" class="fg-toggle" aria-expanded="${!g.collapsed}">${esc(g.title)}<span class="chev">▾</span></button></legend>
          <div class="fg-body">${g.fields.map((f) => fieldHTML(f, values[f.id])).join('')}</div>
        </fieldset>`).join('');
      applyVisibility();
    };
    const applyVisibility = () => {
      mod.inputs.forEach((g) => g.fields.forEach((f) => {
        if (!f.show) return;
        const el = container.querySelector(`[data-field="${f.id}"]`);
        if (el) el.hidden = !f.show(values);
      }));
    };
    let timer = null;
    const fire = () => { clearTimeout(timer); timer = setTimeout(() => onChange(values), 180); };

    container.addEventListener('input', (e) => {
      const t = e.target;
      if (t.dataset.id) {
        const f = findField(mod, t.dataset.id);
        values[t.dataset.id] = (f.type === 'select' || f.type === 'text') ? t.value : (t.value === '' ? NaN : parseFloat(t.value));
        applyVisibility();
        fire();
      } else if (t.dataset.tab) {
        const f = findField(mod, t.dataset.tab);
        const col = f.columns.find((c) => c.id === t.dataset.col);
        values[t.dataset.tab][+t.dataset.row][t.dataset.col] = (col.type === 'text' || col.type === 'select') ? t.value : parseFloat(t.value);
        fire();
      }
    });
    container.addEventListener('change', (e) => {
      if (e.target.tagName === 'SELECT') container.dispatchEvent(new Event('input', { bubbles: true }));
    });
    container.addEventListener('click', (e) => {
      const t = e.target.closest('button');
      if (!t) return;
      if (t.classList.contains('fg-toggle')) {
        const fs = t.closest('fieldset');
        fs.classList.toggle('collapsed');
        t.setAttribute('aria-expanded', !fs.classList.contains('collapsed'));
      } else if (t.dataset.add) {
        const f = findField(mod, t.dataset.add);
        const rows = values[t.dataset.add];
        const last = rows[rows.length - 1];
        const nr = last ? JSON.parse(JSON.stringify(last)) : Object.fromEntries(f.columns.map((c) => [c.id, c.type === 'text' ? '' : 0]));
        if (f.onAdd) f.onAdd(nr, rows);
        rows.push(nr);
        render(); onChange(values);
      } else if (t.dataset.del) {
        const rows = values[t.dataset.del];
        if (rows.length > 1) { rows.splice(+t.dataset.row, 1); render(); onChange(values); }
      }
    });
    render();
    return { render };
  }

  function findField(mod, id) {
    for (const g of mod.inputs) for (const f of g.fields) if (f.id === id) return f;
    return null;
  }

  /** tabla de datos de entrada (para reporte) */
  function inputRows(mod, values) {
    const rows = [];
    const tables = [];
    mod.inputs.forEach((g) => g.fields.forEach((f) => {
      if (f.show && !f.show(values)) return;
      const v = values[f.id];
      if (f.type === 'table') { tables.push({ f, rows: v }); return; }
      let shown = v;
      if (f.type === 'select') { const o = optList(f.options).find((o) => String(o.v) === String(v)); shown = o ? o.l : v; } else if (typeof v === 'number') shown = HC.fmtPlain(v, 4);
      rows.push({ group: g.title, label: f.label, sym: f.sym || '', value: String(shown), unit: f.unit || '' });
    }));
    return { rows, tables };
  }

  function toast(msg, kind = 'info') {
    let host = document.getElementById('toasts');
    const el = document.createElement('div');
    el.className = `toast ${kind}`;
    el.textContent = msg;
    host.appendChild(el);
    setTimeout(() => el.classList.add('show'), 10);
    setTimeout(() => { el.classList.remove('show'); setTimeout(() => el.remove(), 300); }, 3200);
  }

  Object.assign(HC, { ui: { buildForm, defaults, inputRows, findField, toast, unitHTML, symHTML } });
})(window);
