/*
 * Escenarios predefinidos — datos de los Anexos 1–3 (UNC, Modelamiento Numérico 2026-I).
 * Todas las magnitudes en metros y días.
 */
(function (root) {
  'use strict';

  const PRESETS = {
    esc1: {
      id: 'esc1',
      name: 'Escenario 1 — Filtración desde el canal Cumbemayo',
      team: 'Equipo A',
      kind: 'source',
      description:
        'Canal de riego sin revestir que pierde agua a lo largo de un tramo de 2 km. La recarga forma un ' +
        'montículo en el nivel freático que se extiende lateralmente hacia la zona de viviendas (≈1 500 m).',
      Lx: 2000, Ly: 2000, dx: 100, dy: 100,
      T: 300, S: 0.12, h0: 15,
      bc: {
        west: { type: 'neumann', label: 'Oeste (x = 0): sin flujo' },
        east: { type: 'dirichlet', value: 15, label: 'Este (x = 2 000 m): viviendas con dren natural' },
        south: { type: 'neumann', label: 'Sur (y = 0): sin flujo' },
        north: { type: 'neumann', label: 'Norte (y = 2 000 m): sin flujo' },
      },
      sources: [
        { type: 'line', enabled: true, x: 200, q: 0.018, label: 'Canal (columna i = 2)',
          lining: { enabled: false, y1: 0, y2: 1000, eff: 80 } },
        { type: 'point', enabled: false, x: 1000, y: 1000, Q: -500, label: 'Pozo (opcional)' },
      ],
      drain: { enabled: false, x: 1200, h: 15 },
      tEnd: 1825, dtFactor: 0.9, frames: 60,
      monitors: [
        { name: 'Canal', x: 200, y: 1000 },
        { name: 'Viviendas', x: 1500, y: 1000 },
        { name: 'Punto medio', x: 800, y: 1000 },
      ],
      limitRise: 2.0,
      tol: 1e-4,
    },

    esc2: {
      id: 'esc2',
      name: 'Escenario 2 — Primer llenado de una presa de tierra',
      team: 'Equipo B',
      kind: 'ramp',
      description:
        'Presa homogénea de tierra (100 m × 20 m). El embalse sube linealmente de 2 m a 18 m en 90 días; ' +
        'el agua atraviesa el cuerpo poroso y genera subpresión. Qs = 0: todo el forzamiento está en la frontera.',
      Lx: 100, Ly: 20, dx: 2, dy: 2,
      T: 8, S: 0.08, h0: 2,
      bc: {
        west: { type: 'ramp', h1: 2, h2: 18, tf: 90, label: 'Aguas arriba (x = 0): embalse en llenado' },
        east: { type: 'dirichlet', value: 2, label: 'Aguas abajo (x = 100 m): nivel del río' },
        south: { type: 'neumann', label: 'Cimentación (y = 0): sin flujo' },
        north: { type: 'neumann', label: 'Coronación (y = 20 m): sin flujo' },
      },
      sources: [
        { type: 'line', enabled: false, x: 50, q: 0.01, label: 'Fuente lineal (no aplica)',
          lining: { enabled: false, y1: 0, y2: 10, eff: 80 } },
        { type: 'point', enabled: false, x: 50, y: 10, Q: -1, label: 'Fuente puntual (no aplica)' },
      ],
      drain: { enabled: false, x: 80, h: 2 },
      tEnd: 150, dtFactor: 0.9, frames: 75,
      monitors: [
        { name: 'Base x=20 m', x: 20, y: 0 },
        { name: 'Base x=50 m', x: 50, y: 0 },
        { name: 'Base x=80 m', x: 80, y: 0 },
      ],
      limitRise: null,
      iCrit: 1.0,
      tol: 1e-4,
    },

    esc0: {
      id: 'esc0',
      name: 'Extra — Pozo de bombeo (ejemplo ilustrativo, tipo Escenario 0)',
      team: 'Extra',
      kind: 'well',
      description:
        'Ejemplo adicional con valores ILUSTRATIVOS (no tomados de los anexos): un pozo extrae un caudal ' +
        'constante y forma un cono de abatimiento. Usa malla NO cuadrada (Δx ≠ Δy) para ejercitar la fórmula ponderada.',
      Lx: 3000, Ly: 2000, dx: 100, dy: 50,
      T: 500, S: 0.1, h0: 30,
      bc: {
        west: { type: 'neumann', label: 'Oeste: sin flujo' },
        east: { type: 'neumann', label: 'Este: sin flujo' },
        south: { type: 'dirichlet', value: 30, label: 'Sur: río (nivel fijo)' },
        north: { type: 'dirichlet', value: 30, label: 'Norte: río (nivel fijo)' },
      },
      sources: [
        { type: 'line', enabled: false, x: 500, q: 0.02, label: 'Canal (opcional)',
          lining: { enabled: false, y1: 0, y2: 1000, eff: 80 } },
        { type: 'point', enabled: true, x: 1500, y: 1000, Q: -800, label: 'Pozo' },
      ],
      drain: { enabled: false, x: 2000, h: 30 },
      tEnd: 1095, dtFactor: 0.9, frames: 60,
      monitors: [
        { name: 'Pozo', x: 1500, y: 1000 },
        { name: 'Vecino (500 m)', x: 2000, y: 1000 },
      ],
      limitRise: 5,
      tol: 1e-4,
    },
  };

  function clone(o) { return JSON.parse(JSON.stringify(o)); }

  const api = { PRESETS, getPreset: (id) => clone(PRESETS[id]) };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.Presets = api;
})(typeof window !== 'undefined' ? window : globalThis);
