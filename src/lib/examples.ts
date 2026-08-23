import type { Constraint, StructuralElement, StructuralNode, StructuralProject, UnitSystem } from "./types";

const free = (): Constraint => ({ kind: "free" });
const fixed = (): Constraint => ({ kind: "fixed" });

function makeNode(
  id: string,
  number: number,
  label: string,
  x: number,
  y: number,
  loads: Partial<StructuralNode["loads"]> = {},
  restraints: Array<"ux" | "uy" | "rz"> = [],
): StructuralNode {
  return {
    id,
    number,
    label,
    x,
    y,
    loads: { fx: loads.fx ?? 0, fy: loads.fy ?? 0, mz: loads.mz ?? 0 },
    constraints: {
      ux: restraints.includes("ux") ? fixed() : free(),
      uy: restraints.includes("uy") ? fixed() : free(),
      rz: restraints.includes("rz") ? fixed() : free(),
    },
  };
}

function makeElement(
  id: string,
  number: number,
  nodeI: string,
  nodeJ: string,
  A: number,
  E: number,
  I = 1,
  material = "Acero",
): StructuralElement {
  return { id, number, label: `E${number}`, nodeI, nodeJ, material, A, E, I, loads: [] };
}

const unitsNotebook1: UnitSystem = {
  length: "cm",
  displacement: "cm",
  area: "cm²",
  inertia: "cm⁴",
  force: "kgf",
  stress: "kgf/cm²",
};

export const notebookExample1: StructuralProject = {
  schemaVersion: 2,
  id: "notebook-1-unc",
  kind: "truss2d",
  metadata: {
    name: "Ejemplo 1 - Armadura de seis nodos",
    description: "Transcripción exacta del primer notebook adjunto: 6 nodos, 9 barras y tres cargas inclinadas.",
    author: "Jhoel Tocas Cercado",
    university: "Universidad Nacional de Cajamarca",
    school: "Ingeniería Hidráulica",
    date: "2026-08-22",
    observations: "A = 25 cm²; E = 2×10⁶ kgf/cm². Apoyo fijo en A y rodillo vertical en C.",
    source: "example_1.ipynb",
  },
  units: unitsNotebook1,
  nodes: [
    makeNode("A", 1, "A", 0, 0, {}, ["ux", "uy"]),
    makeNode("B", 2, "B", 300, 0),
    makeNode("C", 3, "C", 600, 0, {}, ["uy"]),
    makeNode("D", 4, "D", 150, 100, { fx: 2000, fy: -1000 }),
    makeNode("E", 5, "E", 300, 200, { fx: 2000, fy: -1000 }),
    makeNode("F", 6, "F", 450, 100, { fx: 2000, fy: -1000 }),
  ],
  elements: [
    ["A", "B"], ["B", "C"], ["B", "D"], ["B", "F"], ["B", "E"],
    ["A", "D"], ["D", "E"], ["E", "F"], ["F", "C"],
  ].map(([i, j], index) => makeElement(`e${index + 1}`, index + 1, i, j, 25, 2e6)),
  precision: 6,
  tolerance: 1e-11,
};

const notebook2Coordinates: Array<[string, number, number]> = [
  ["A", (4 * 2 + 2) * 100, 0],
  ["B", (7 * 4 + 2 * 3) * 100, 4 * 5 * 100],
  ["C", (4 * 2 + 1.75) * 100, 2.5 * 100],
  ["D", (7 * 4 + 2 * 3) * 100, 3 * 5 * 100],
  ["E", (2.5 + 2 * 4) * 100, 500],
  ["F", (2 * 4 + 1) * 100, 2 * 5 * 100],
  ["G", (7 * 4 + 3) * 100, (3 * 5 + 2.5) * 100],
  ["H", (2 * 4 + 0.5) * 100, 3 * 5 * 100],
  ["I", (3 * 4 - 0.5) * 100, 3 * 5 * 100],
  ["J", 0, 4 * 5 * 100],
  ["K", 4 * 100, 4 * 5 * 100],
  ["L", 4 * 100, (4 * 5 + 2) * 100],
  ["M", 2 * 4 * 100, 4 * 5 * 100],
  ["N", 2 * 4 * 100, (4 * 5 + 4) * 100],
  ["O", 3 * 4 * 100, 4 * 5 * 100],
  ["P", 3 * 4 * 100, (4 * 5 + 4) * 100],
  ["Q", 4 * 4 * 100, 4 * 5 * 100],
  ["R", 4 * 4 * 100, (4 * 5 + 4) * 100],
  ["S", 5 * 4 * 100, 4 * 5 * 100],
  ["T", 5 * 4 * 100, (4 * 5 + 4) * 100],
  ["U", 6 * 4 * 100, 4 * 5 * 100],
  ["V", 6 * 4 * 100, (4 * 5 + 4) * 100],
  ["W", 7 * 4 * 100, 4 * 5 * 100],
  ["X", 7 * 4 * 100, (4 * 5 + 4) * 100],
  ["Y", (7 * 4 + 3) * 100, 4 * 5 * 100],
  ["Z", (7 * 4 + 3) * 100, (4 * 5 + 2) * 100],
  ["1", (2 * 4 + 1.5) * 100, 5 * 100],
  ["2", (3 * 4 - 1) * 100, 5 * 2 * 100],
];

const notebook2Pairs: Array<[string, string]> = [
  ["A", "C"], ["A", "E"], ["C", "E"], ["C", "1"], ["1", "E"], ["1", "F"], ["1", "2"], ["E", "F"], ["E", "2"], ["F", "2"],
  ["F", "H"], ["F", "I"], ["2", "H"], ["2", "I"], ["H", "I"], ["H", "M"], ["H", "O"], ["I", "O"], ["J", "K"], ["K", "M"],
  ["M", "O"], ["O", "Q"], ["Q", "S"], ["S", "U"], ["U", "W"], ["W", "Y"], ["Y", "B"], ["W", "G"], ["G", "B"], ["G", "D"],
  ["D", "B"], ["J", "L"], ["K", "L"], ["L", "N"], ["L", "M"], ["K", "N"], ["M", "N"], ["M", "P"], ["N", "P"], ["O", "P"],
  ["O", "R"], ["Q", "P"], ["Q", "R"], ["P", "R"], ["S", "R"], ["S", "T"], ["T", "R"], ["S", "V"], ["U", "V"], ["T", "V"],
  ["U", "X"], ["W", "V"], ["W", "X"], ["V", "X"], ["W", "Z"], ["X", "Z"], ["Y", "Z"], ["Z", "B"],
];

export const notebookExample2: StructuralProject = {
  schemaVersion: 2,
  id: "notebook-2-unc",
  kind: "truss2d",
  metadata: {
    name: "Ejemplo 2 - Armadura compleja de 58 barras",
    description: "Transcripción exacta del segundo notebook adjunto: 28 nodos y 58 barras.",
    author: "Jhoel Tocas Cercado",
    university: "Universidad Nacional de Cajamarca",
    school: "Ingeniería Hidráulica",
    date: "2026-08-22",
    observations: "A = 625 cm²; E = 21 000 kN/cm²; cargas en J, F y S.",
    source: "example_2.ipynb",
  },
  units: { length: "cm", displacement: "cm", area: "cm²", inertia: "cm⁴", force: "kN", stress: "kN/cm²" },
  nodes: notebook2Coordinates.map(([label, x, y], index) => makeNode(
    label,
    index + 1,
    label,
    x,
    y,
    label === "J" ? { fx: 8, fy: -160 } : label === "F" ? { fx: 22 } : label === "S" ? { fy: -510 } : {},
    label === "A" ? ["ux", "uy"] : label === "D" ? ["uy"] : [],
  )),
  elements: notebook2Pairs.map(([i, j], index) => makeElement(`e${index + 1}`, index + 1, i, j, 625, 21_000)),
  precision: 6,
  tolerance: 1e-11,
};

export const pdfFrameExample: StructuralProject = {
  schemaVersion: 2,
  id: "pdf-frame-36-50",
  kind: "frame2d",
  metadata: {
    name: "PDF - Pórtico triangular de tres barras",
    description: "Ejemplo de las páginas 36 a 50 del PDF adjunto, con matrices locales 6×6 y transformación por cosenos directores.",
    author: "Jhoel Tocas Cercado",
    university: "Universidad Nacional de Cajamarca",
    school: "Ingeniería Hidráulica",
    date: "2026-08-22",
    observations: "Geometría 4 m × 10.928 m; carga de 500 kN a 45°; E = 200 kN/mm².",
    source: "II-1-Metodo-Matricial-de-Regidez(3).pdf, pp. 36-50",
  },
  units: { length: "mm", displacement: "mm", area: "mm²", inertia: "mm⁴", force: "kN", stress: "GPa" },
  nodes: [
    makeNode("n1", 1, "1", 6928.20323, 4000, { fx: 353.5533906, fy: 353.5533906 }),
    makeNode("n2", 2, "2", 0, 0, {}, ["ux", "uy"]),
    makeNode("n3", 3, "3", 10928.20323, 0, {}, ["uy"]),
  ],
  elements: [
    makeElement("e1", 1, "n2", "n1", 15000, 200, 28125000),
    makeElement("e2", 2, "n1", "n3", 20000, 200, 66666666.67),
    makeElement("e3", 3, "n2", "n3", 18000, 200, 48600000),
  ],
  precision: 6,
  tolerance: 1e-11,
};

export const pdfFrameVExample: StructuralProject = {
  schemaVersion: 2,
  id: "pdf-frame-51-62",
  kind: "frame2d",
  metadata: {
    name: "PDF - Pórtico en V con carga horizontal",
    description: "Ejemplo de las páginas 51 a 62: dos barras, apoyos empotrados y carga horizontal de 400 kN.",
    author: "Jhoel Tocas Cercado",
    university: "Universidad Nacional de Cajamarca",
    school: "Ingeniería Hidráulica",
    date: "2026-08-22",
    observations: "EA = 100 000 kN y EI = 10 000 kN·m².",
    source: "II-1-Metodo-Matricial-de-Regidez(3).pdf, pp. 51-62",
  },
  units: { length: "m", displacement: "mm", area: "m²", inertia: "m⁴", force: "kN", stress: "GPa" },
  nodes: [
    makeNode("n1", 1, "1", 3, 3, { fx: 400 }),
    makeNode("n2", 2, "2", 0, 0, {}, ["ux", "uy", "rz"]),
    makeNode("n3", 3, "3", 7, 0, {}, ["ux", "uy", "rz"]),
  ],
  elements: [
    makeElement("e1", 1, "n2", "n1", 0.0005, 200, 0.00005),
    makeElement("e2", 2, "n1", "n3", 0.0005, 200, 0.00005),
  ],
  precision: 6,
  tolerance: 1e-11,
};

export const pdfMemberLoadsExample: StructuralProject = (() => {
  const project = structuredClone(pdfFrameVExample);
  project.id = "pdf-frame-63-69";
  project.metadata.name = "PDF - Pórtico con cargas en barras";
  project.metadata.description = "Ejemplo de las páginas 63 a 69, con carga puntual transversal y carga distribuida uniforme.";
  project.metadata.observations = "Carga puntual local de 500 kN en la barra 1 y q = 50 kN/m en la barra 2, además de 400 kN en el nudo 1.";
  project.metadata.source = "II-1-Metodo-Matricial-de-Regidez(3).pdf, pp. 63-69";
  project.elements[0].loads = [{ id: "p1", kind: "point-y", value: -500, position: 0.5 }];
  project.elements[1].loads = [{ id: "q1", kind: "distributed-y", start: -50, end: -50 }];
  return project;
})();

export const examples = [notebookExample1, notebookExample2, pdfFrameExample, pdfFrameVExample, pdfMemberLoadsExample];

export function cloneProject(project: StructuralProject): StructuralProject {
  const clone = structuredClone(project);
  clone.id = typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;
  return clone;
}

export function blankProject(kind: StructuralProject["kind"]): StructuralProject {
  const base = cloneProject(kind === "truss2d" ? notebookExample1 : pdfFrameVExample);
  base.metadata.name = kind === "truss2d" ? "Nueva armadura 2D" : "Nuevo pórtico 2D";
  base.metadata.description = kind === "truss2d" ? "Plantilla triangular estable y ordenada, lista para editar." : "Plantilla de pórtico estable y ordenada, lista para editar.";
  base.metadata.source = "Modelo creado por el usuario";
  base.metadata.observations = "La numeración sigue el recorrido de izquierda a derecha. Modifique un dato a la vez y conserve apoyos suficientes para evitar mecanismos.";
  base.units = kind === "truss2d"
    ? { length: "m", displacement: "mm", area: "cm²", inertia: "cm⁴", force: "kN", stress: "GPa" }
    : { length: "m", displacement: "mm", area: "m²", inertia: "m⁴", force: "kN", stress: "GPa" };
  if (kind === "truss2d") {
    base.nodes = [
      makeNode("n1", 1, "A", 0, 0, {}, ["ux", "uy"]),
      makeNode("n2", 2, "B", 4, 0, {}, ["uy"]),
      makeNode("n3", 3, "C", 2, 3, { fy: -50 }),
    ];
    base.elements = [
      makeElement("e1", 1, "n1", "n2", 25, 200),
      makeElement("e2", 2, "n1", "n3", 25, 200),
      makeElement("e3", 3, "n3", "n2", 25, 200),
    ];
  } else {
    base.nodes = [
      makeNode("n1", 1, "A", 0, 0, {}, ["ux", "uy", "rz"]),
      makeNode("n2", 2, "B", 0, 3),
      makeNode("n3", 3, "C", 4, 3, { fx: 20, fy: -50 }),
      makeNode("n4", 4, "D", 4, 0, {}, ["ux", "uy", "rz"]),
    ];
    base.elements = [
      makeElement("e1", 1, "n1", "n2", 0.02, 200, 8e-5),
      makeElement("e2", 2, "n2", "n3", 0.02, 200, 8e-5),
      makeElement("e3", 3, "n3", "n4", 0.02, 200, 8e-5),
    ];
  }
  return base;
}
