"use client";

import {
  Archive,
  BookOpen,
  Boxes,
  Calculator,
  ChartNoAxesCombined,
  CheckCircle2,
  ChevronDown,
  CircleUserRound,
  Cloud,
  Copy,
  Download,
  FileJson,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  FolderClock,
  Grid3X3,
  History,
  Info,
  Layers3,
  LoaderCircle,
  LogIn,
  Menu,
  Moon,
  Plus,
  RefreshCw,
  Save,
  ShieldCheck,
  Sun,
  Table2,
  Trash2,
  Upload,
  X,
} from "lucide-react";
import katex from "katex";
import { useEffect, useMemo, useRef, useState } from "react";
import { analyzeProject } from "../lib/engine";
import { blankProject, cloneProject, examples, notebookExample1 } from "../lib/examples";
import { convertProjectUnits, fromSI, unitFactor } from "../lib/units";
import type { AnalysisResult, Constraint, MaterialPreset, MemberLoad, StructuralProject, UnitSystem } from "../lib/types";
import MatrixTable, { formatNumber, VectorTable } from "./matrix-table";
import GraphicsGallery from "./graphics-gallery";
import StructureCanvas from "./structure-canvas";

type View = "studio" | "notebook" | "matrices" | "results" | "graphics" | "theory" | "projects";
type EditorTab = "project" | "nodes" | "elements" | "loads" | "materials";
type User = { displayName: string; email: string } | null;
type CloudProject = { id: string; name: string; structureType: string; versionNumber: number; updatedAt: string; model: StructuralProject };
type CloudVersion = { id: number; versionNumber: number; summary: string; createdAt: string; model: StructuralProject };

const nav: Array<{ id: View; label: string; icon: typeof Calculator }> = [
  { id: "studio", label: "Estudio", icon: FlaskConical },
  { id: "notebook", label: "Cuaderno 27 pasos", icon: BookOpen },
  { id: "matrices", label: "Laboratorio K", icon: Grid3X3 },
  { id: "results", label: "Resultados", icon: Calculator },
  { id: "graphics", label: "Gráficos", icon: ChartNoAxesCombined },
  { id: "theory", label: "Teoría", icon: FileText },
  { id: "projects", label: "Proyectos", icon: FolderClock },
];

const procedureTitles = [
  "Datos de entrada", "Geometría", "Numeración de nodos", "Numeración de elementos", "Coordenadas",
  "Propiedades de materiales", "Longitudes", "Cosenos directores", "Matrices de transformación", "Matrices locales",
  "Matrices globales de cada elemento", "Grados de libertad", "GDL restringidos", "GDL libres", "Vector global de cargas",
  "Matriz global antes de restricciones", "Proceso de ensamblaje", "Matrices particionadas", "Sistema reducido", "Desplazamientos",
  "Reacciones", "Deformaciones", "Esfuerzos", "Fuerzas axiales y de extremo", "Tracción / compresión",
  "Estructura deformada", "Comprobación del equilibrio",
];

const defaultMaterials: MaterialPreset[] = [
  { id: "steel", name: "Acero", ePa: 200e9, color: "#1d4ed8" },
  { id: "concrete", name: "Concreto", ePa: 25e9, color: "#64748b" },
  { id: "aluminum", name: "Aluminio", ePa: 69e9, color: "#94a3b8" },
  { id: "wood", name: "Madera", ePa: 11e9, color: "#b45309" },
  { id: "custom", name: "Personalizado", ePa: 1e9, color: "#7c3aed" },
];

const uid = () => typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`;

function Equation({ tex }: { tex: string }) {
  return <div className="equation" dangerouslySetInnerHTML={{ __html: katex.renderToString(tex, { throwOnError: false, displayMode: true }) }} />;
}

function Status({ ok, children }: { ok: boolean; children: React.ReactNode }) {
  return <span className={`status-pill ${ok ? "ok" : "bad"}`}>{ok ? <CheckCircle2 size={13} /> : <Info size={13} />}{children}</span>;
}

function DataTable({ headers, rows, compact = false }: { headers: string[]; rows: Array<Array<React.ReactNode>>; compact?: boolean }) {
  return <div className="data-table-scroll"><table className={`data-table ${compact ? "compact" : ""}`}><thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead><tbody>{rows.map((row, index) => <tr key={index}>{row.map((cell, cellIndex) => <td key={cellIndex}>{cell}</td>)}</tr>)}</tbody></table></div>;
}

function ProjectEditor({ project, update }: { project: StructuralProject; update: (recipe: (draft: StructuralProject) => void) => void }) {
  const metadataFields: Array<[keyof StructuralProject["metadata"], string, boolean]> = [
    ["name", "Nombre del proyecto", false], ["author", "Autor", false], ["date", "Fecha", false], ["university", "Universidad", false],
    ["school", "Carrera", false], ["description", "Descripción", true], ["observations", "Observaciones", true],
  ];
  const unitOptions = {
    length: ["mm", "cm", "m"], displacement: ["mm", "cm", "m"], area: ["mm²", "cm²", "m²"], inertia: ["mm⁴", "cm⁴", "m⁴"],
    force: ["N", "kN", "kgf", "tf"], stress: ["Pa", "kPa", "MPa", "GPa", "kgf/cm²", "kN/cm²"],
  } as const;
  return <div className="project-editor">
    <div className="form-grid metadata-form">{metadataFields.map(([field, label, long]) => <label key={field} className={long ? "wide" : ""}>{label}{long ? <textarea rows={3} value={project.metadata[field]} onChange={(event) => update((draft) => { draft.metadata[field] = event.target.value; })} /> : <input value={project.metadata[field]} onChange={(event) => update((draft) => { draft.metadata[field] = event.target.value; })} />}</label>)}</div>
    <div className="section-divider"><span>Unidades coherentes</span><small>Los valores se convierten; la estructura física no cambia.</small></div>
    <div className="unit-grid">{(Object.keys(unitOptions) as Array<keyof typeof unitOptions>).map((field) => <label key={field}>{field}<select value={project.units[field]} onChange={(event) => update((draft) => { Object.assign(draft, convertProjectUnits(draft, { [field]: event.target.value } as Partial<UnitSystem>)); })}>{unitOptions[field].map((unit) => <option key={unit}>{unit}</option>)}</select></label>)}</div>
  </div>;
}

function NodeEditor({ project, update }: { project: StructuralProject; update: (recipe: (draft: StructuralProject) => void) => void }) {
  const [paste, setPaste] = useState("");
  const [message, setMessage] = useState("");
  const setConstraint = (nodeId: string, component: "ux" | "uy" | "rz", kind: Constraint["kind"]) => update((draft) => {
    draft.nodes.find((node) => node.id === nodeId)!.constraints[component] = kind === "prescribed" ? { kind, value: 0 } : { kind };
  });
  const addNode = () => update((draft) => {
    const number = Math.max(0, ...draft.nodes.map((node) => node.number)) + 1;
    draft.nodes.push({ id: uid(), number, label: `N${number}`, x: (draft.nodes.at(-1)?.x ?? 0) + 1, y: draft.nodes.at(-1)?.y ?? 0, loads: { fx: 0, fy: 0, mz: 0 }, constraints: { ux: { kind: "free" }, uy: { kind: "free" }, rz: { kind: "free" } } });
  });
  const importRows = () => {
    try {
      const rows = paste.trim().split(/\r?\n/).map((line) => line.split(/\t|;|,/).map((value) => value.trim())).filter((row) => row.length >= 3);
      update((draft) => {
        const start = Math.max(0, ...draft.nodes.map((node) => node.number));
        rows.forEach((row, index) => {
          const fixedWord = (value?: string) => /fijo|fixed|1|si|sí/i.test(value ?? "");
          draft.nodes.push({ id: uid(), number: start + index + 1, label: row[0] || `N${start + index + 1}`, x: Number(row[1]), y: Number(row[2]), loads: { fx: Number(row[3] || 0), fy: Number(row[4] || 0), mz: Number(row[5] || 0) }, constraints: { ux: fixedWord(row[6]) ? { kind: "fixed" } : { kind: "free" }, uy: fixedWord(row[7]) ? { kind: "fixed" } : { kind: "free" }, rz: fixedWord(row[8]) ? { kind: "fixed" } : { kind: "free" } } });
        });
      });
      setMessage(`${rows.length} nodo(s) añadidos.`); setPaste("");
    } catch { setMessage("No se pudieron interpretar las filas."); }
  };
  const constraintCell = (nodeId: string, component: "ux" | "uy" | "rz", constraint: Constraint) => <div className="constraint-cell"><select value={constraint.kind} onChange={(event) => setConstraint(nodeId, component, event.target.value as Constraint["kind"])}><option value="free">Libre</option><option value="fixed">Fijo</option><option value="prescribed">Prescrito</option></select>{constraint.kind === "prescribed" && <input aria-label={`Valor ${component}`} type="number" step="any" value={constraint.value ?? 0} onChange={(event) => update((draft) => { draft.nodes.find((node) => node.id === nodeId)!.constraints[component].value = Number(event.target.value); })} />}</div>;
  return <div>
    <div className="editor-actions"><button className="primary" onClick={addNode}><Plus size={15} />Agregar nodo</button><button onClick={() => update((draft) => { draft.nodes.sort((a, b) => a.number - b.number).forEach((node, index) => { node.number = index + 1; }); })}><Table2 size={15} />Ordenar y renumerar</button></div>
    <details className="paste-box"><summary><Upload size={15} />Importar o pegar desde Excel/CSV</summary><p>Columnas: etiqueta, x, y, Fx, Fy, Mz, restricción X, restricción Y, restricción Rz.</p><textarea rows={5} value={paste} onChange={(event) => setPaste(event.target.value)} placeholder={'A\t0\t0\t0\t0\t0\tfijo\tfijo\nB\t3\t0\t10\t0\t0\tlibre\tfijo'} /><button className="primary" disabled={!paste.trim()} onClick={importRows}>Añadir filas</button>{message && <span>{message}</span>}</details>
    <DataTable headers={["N°", "Nodo", `x (${project.units.length})`, `y (${project.units.length})`, `Fx (${project.units.force})`, `Fy (${project.units.force})`, `Mz (${project.units.force}·${project.units.length})`, "Ux", "Uy", ...(project.kind === "frame2d" ? ["Rz"] : []), ""]} rows={project.nodes.map((node) => [
      node.number,
      <input key="label" value={node.label} onChange={(event) => update((draft) => { draft.nodes.find((item) => item.id === node.id)!.label = event.target.value; })} />,
      <input key="x" type="number" step="any" value={node.x} onChange={(event) => update((draft) => { draft.nodes.find((item) => item.id === node.id)!.x = Number(event.target.value); })} />,
      <input key="y" type="number" step="any" value={node.y} onChange={(event) => update((draft) => { draft.nodes.find((item) => item.id === node.id)!.y = Number(event.target.value); })} />,
      <input key="fx" type="number" step="any" value={node.loads.fx} onChange={(event) => update((draft) => { draft.nodes.find((item) => item.id === node.id)!.loads.fx = Number(event.target.value); })} />,
      <input key="fy" type="number" step="any" value={node.loads.fy} onChange={(event) => update((draft) => { draft.nodes.find((item) => item.id === node.id)!.loads.fy = Number(event.target.value); })} />,
      <input key="mz" type="number" step="any" value={node.loads.mz} onChange={(event) => update((draft) => { draft.nodes.find((item) => item.id === node.id)!.loads.mz = Number(event.target.value); })} />,
      constraintCell(node.id, "ux", node.constraints.ux), constraintCell(node.id, "uy", node.constraints.uy), ...(project.kind === "frame2d" ? [constraintCell(node.id, "rz", node.constraints.rz)] : []),
      <div className="row-actions" key="actions"><button title="Duplicar" onClick={() => update((draft) => { const source = draft.nodes.find((item) => item.id === node.id)!; const copy = structuredClone(source); copy.id = uid(); copy.number = Math.max(...draft.nodes.map((item) => item.number)) + 1; copy.label = `${source.label}'`; copy.x += 1; draft.nodes.push(copy); })}><Copy size={14} /></button><button className="danger" title="Eliminar" onClick={() => update((draft) => { draft.nodes = draft.nodes.filter((item) => item.id !== node.id); draft.elements = draft.elements.filter((element) => element.nodeI !== node.id && element.nodeJ !== node.id); })}><Trash2 size={14} /></button></div>,
    ])} />
  </div>;
}

function ElementEditor({ project, update, materials }: { project: StructuralProject; update: (recipe: (draft: StructuralProject) => void) => void; materials: MaterialPreset[] }) {
  const addElement = () => update((draft) => {
    if (draft.nodes.length < 2) return;
    const number = Math.max(0, ...draft.elements.map((element) => element.number)) + 1;
    const source = draft.elements[0];
    draft.elements.push({ id: uid(), number, label: `E${number}`, nodeI: draft.nodes.at(-2)!.id, nodeJ: draft.nodes.at(-1)!.id, material: source?.material ?? "Acero", A: source?.A ?? 1, E: source?.E ?? 200, I: source?.I ?? 1, loads: [] });
  });
  return <div>
    <div className="editor-actions"><button className="primary" onClick={addElement}><Plus size={15} />Agregar elemento</button><span>Cada barra conserva A, E e I independientes.</span></div>
    <DataTable headers={["E", "Etiqueta", "Nodo i", "Nodo j", "Material", `A (${project.units.area})`, `E (${project.units.stress})`, ...(project.kind === "frame2d" ? [`I (${project.units.inertia})`] : []), ""]} rows={project.elements.map((element) => [
      element.number,
      <input key="label" value={element.label} onChange={(event) => update((draft) => { draft.elements.find((item) => item.id === element.id)!.label = event.target.value; })} />,
      <select key="i" value={element.nodeI} onChange={(event) => update((draft) => { draft.elements.find((item) => item.id === element.id)!.nodeI = event.target.value; })}>{project.nodes.map((node) => <option key={node.id} value={node.id}>{node.number} · {node.label}</option>)}</select>,
      <select key="j" value={element.nodeJ} onChange={(event) => update((draft) => { draft.elements.find((item) => item.id === element.id)!.nodeJ = event.target.value; })}>{project.nodes.map((node) => <option key={node.id} value={node.id}>{node.number} · {node.label}</option>)}</select>,
      <select key="mat" value={materials.find((material) => material.name === element.material)?.id ?? "custom"} onChange={(event) => update((draft) => { const target = draft.elements.find((item) => item.id === element.id)!; const material = materials.find((item) => item.id === event.target.value)!; target.material = material.name; target.E = material.ePa / unitFactor.stress[draft.units.stress]; })}>{materials.map((material) => <option key={material.id} value={material.id}>{material.name}</option>)}</select>,
      <input key="a" type="number" min="0" step="any" value={element.A} onChange={(event) => update((draft) => { draft.elements.find((item) => item.id === element.id)!.A = Number(event.target.value); })} />,
      <input key="e" type="number" min="0" step="any" value={element.E} onChange={(event) => update((draft) => { const target = draft.elements.find((item) => item.id === element.id)!; target.E = Number(event.target.value); target.material = "Personalizado"; })} />,
      ...(project.kind === "frame2d" ? [<input key="i2" type="number" min="0" step="any" value={element.I} onChange={(event) => update((draft) => { draft.elements.find((item) => item.id === element.id)!.I = Number(event.target.value); })} />] : []),
      <div className="row-actions" key="actions"><button title="Duplicar" onClick={() => update((draft) => { const copy = structuredClone(draft.elements.find((item) => item.id === element.id)!); copy.id = uid(); copy.number = Math.max(...draft.elements.map((item) => item.number)) + 1; copy.label = `E${copy.number}`; draft.elements.push(copy); })}><Copy size={14} /></button><button className="danger" title="Eliminar" onClick={() => update((draft) => { draft.elements = draft.elements.filter((item) => item.id !== element.id); })}><Trash2 size={14} /></button></div>,
    ])} />
  </div>;
}

function LoadsEditor({ project, update }: { project: StructuralProject; update: (recipe: (draft: StructuralProject) => void) => void }) {
  if (project.kind === "truss2d") return <div className="empty-explanation"><Layers3 size={28} /><h3>Las cargas de la armadura son nodales</h3><p>Edítalas en la tabla de nodos. La formulación axial no admite cargas transversales distribuidas directamente sobre una barra.</p></div>;
  const addLoad = (elementId: string, kind: MemberLoad["kind"]) => update((draft) => {
    const element = draft.elements.find((item) => item.id === elementId)!;
    if (kind === "distributed-y") element.loads.push({ id: uid(), kind, start: 0, end: 0 });
    else element.loads.push({ id: uid(), kind, value: 0, position: 0.5 });
  });
  const rows = project.elements.flatMap((element) => element.loads.map((load) => ({ element, load })));
  return <div>
    <div className="load-buttons">{project.elements.map((element) => <div key={element.id}><strong>{element.label}</strong><button onClick={() => addLoad(element.id, "distributed-y")}>+ q local y</button><button onClick={() => addLoad(element.id, "point-y")}>+ P local y</button><button onClick={() => addLoad(element.id, "point-x")}>+ P local x</button><button onClick={() => addLoad(element.id, "moment")}>+ Momento</button></div>)}</div>
    <DataTable headers={["Elemento", "Tipo", "Inicio / valor", "Fin / posición", ""]} rows={rows.map(({ element, load }) => [element.label, load.kind, <input key="v1" type="number" step="any" value={load.kind === "distributed-y" ? load.start : load.value} onChange={(event) => update((draft) => { const target = draft.elements.find((item) => item.id === element.id)!.loads.find((item) => item.id === load.id)!; if (target.kind === "distributed-y") target.start = Number(event.target.value); else target.value = Number(event.target.value); })} />, <input key="v2" type="number" step="any" value={load.kind === "distributed-y" ? load.end : load.position} onChange={(event) => update((draft) => { const target = draft.elements.find((item) => item.id === element.id)!.loads.find((item) => item.id === load.id)!; if (target.kind === "distributed-y") target.end = Number(event.target.value); else target.position = Number(event.target.value); })} />, <button key="delete" className="danger" onClick={() => update((draft) => { const target = draft.elements.find((item) => item.id === element.id)!; target.loads = target.loads.filter((item) => item.id !== load.id); })}><Trash2 size={14} /></button>])} />
    <p className="editor-note">q se ingresa en {project.units.force}/{project.units.length}; P en {project.units.force}; la posición va de 0 a 1. Signo negativo: dirección −y′.</p>
  </div>;
}

function MaterialsEditor({ project, materials, setMaterials }: { project: StructuralProject; materials: MaterialPreset[]; setMaterials: React.Dispatch<React.SetStateAction<MaterialPreset[]>> }) {
  return <div><DataTable headers={["Color", "Material", `E (${project.units.stress})`, ""]} rows={materials.map((material) => [<span key="color" className="material-dot" style={{ background: material.color }} />, <input key="name" value={material.name} onChange={(event) => setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, name: event.target.value } : item))} />, <input key="e" type="number" min="0" step="any" value={Number((material.ePa / unitFactor.stress[project.units.stress]).toPrecision(8))} onChange={(event) => setMaterials((current) => current.map((item) => item.id === material.id ? { ...item, ePa: Number(event.target.value) * unitFactor.stress[project.units.stress] } : item))} />, <button key="delete" className="danger" disabled={materials.length <= 1} onClick={() => setMaterials((current) => current.filter((item) => item.id !== material.id))}><Trash2 size={14} /></button>])} /><button className="primary add-material" onClick={() => setMaterials((current) => [...current, { id: uid(), name: "Nuevo material", ePa: 1e9, color: "#0f766e" }])}><Plus size={15} />Nuevo material</button></div>;
}

function ProcedureContent({ index, project, result, selectedElement }: { index: number; project: StructuralProject; result: AnalysisResult; selectedElement: string | null }) {
  const element = result.elementCalculations.find((item) => item.elementId === selectedElement) ?? result.elementCalculations[0];
  const labels = result.dofs.map((dof) => `${dof.nodeLabel}.${dof.component}`);
  switch (index) {
    case 0: return <div className="fact-grid"><span><small>Proyecto</small><strong>{project.metadata.name}</strong></span><span><small>Tipo</small><strong>{project.kind === "truss2d" ? "Armadura 2D" : "Pórtico 2D"}</strong></span><span><small>Fuente</small><strong>{project.metadata.source}</strong></span><span><small>Unidades</small><strong>{project.units.force} · {project.units.length} · {project.units.stress}</strong></span></div>;
    case 1: return <StructureCanvas key={`${project.id}-geometry`} project={project} result={result} selectedElement={selectedElement} onSelectElement={() => {}} onAddNode={() => {}} />;
    case 2: return <DataTable compact headers={["N°", "Nodo", "GDL"]} rows={project.nodes.map((node) => [node.number, node.label, result.dofs.filter((dof) => dof.nodeId === node.id).map((dof) => `${dof.display}:${dof.component}`).join(" · ")])} />;
    case 3: return <DataTable compact headers={["E", "Etiqueta", "i", "j"]} rows={project.elements.map((item) => [item.number, item.label, project.nodes.find((node) => node.id === item.nodeI)?.label, project.nodes.find((node) => node.id === item.nodeJ)?.label])} />;
    case 4: return <DataTable compact headers={["Nodo", `x (${project.units.length})`, `y (${project.units.length})`]} rows={project.nodes.map((node) => [node.label, node.x, node.y])} />;
    case 5: return <DataTable compact headers={["E", "Material", `A (${project.units.area})`, `E (${project.units.stress})`, `I (${project.units.inertia})`]} rows={project.elements.map((item) => [item.number, item.material, item.A, item.E, project.kind === "frame2d" ? item.I : "No aplica"])} />;
    case 6: return <DataTable compact headers={["E", "L (m)", "θ (°)"]} rows={result.elementCalculations.map((item) => [item.elementNumber, formatNumber(item.L, 7), formatNumber(item.theta * 180 / Math.PI, 6)])} />;
    case 7: return <DataTable compact headers={["E", "c = Δx/L", "s = Δy/L", "c²+s²"]} rows={result.elementCalculations.map((item) => [item.elementNumber, formatNumber(item.c, 7), formatNumber(item.s, 7), formatNumber(item.c ** 2 + item.s ** 2, 8)])} />;
    case 8: return element ? <div className="two-matrix"><div><h4>λ del PDF</h4><MatrixTable matrix={element.lambda} /></div><div><h4>T: U′ = T·U</h4><MatrixTable matrix={element.transformation} /></div></div> : null;
    case 9: return element ? <><p>Elemento {element.elementNumber}: k′ en ejes locales.</p><MatrixTable matrix={element.local} /></> : null;
    case 10: return element ? <><Equation tex={String.raw`\mathbf K_e=\mathbf T^T\mathbf k'\mathbf T`} /><MatrixTable matrix={element.global} /></> : null;
    case 11: return <DataTable compact headers={["GDL", "Nodo", "Componente", "Estado"]} rows={result.dofs.map((dof) => [dof.display, dof.nodeLabel, dof.component, dof.constrained ? "Restringido" : "Libre"])} />;
    case 12: return <VectorTable values={result.restrained.map((dof) => dof + 1)} labels={result.restrained.map((dof) => labels[dof])} />;
    case 13: return <VectorTable values={result.free.map((dof) => dof + 1)} labels={result.free.map((dof) => labels[dof])} />;
    case 14: return <VectorTable values={result.globalF} labels={labels} />;
    case 15: return <MatrixTable matrix={result.globalK} />;
    case 16: return <div><p>Cada celda Kᵢⱼ recibe las contribuciones Ke[a,b] de todos los elementos cuyo mapa de localización coincide.</p><DataTable compact headers={["Celda global", "Contribuciones"]} rows={Object.entries(result.assemblyTrace).slice(0, 120).map(([cell, items]) => [cell.split(":").map((value) => Number(value) + 1).join(","), items.map((item) => `E${item.elementNumber}[${item.localRow + 1},${item.localCol + 1}]=${formatNumber(item.value, 4)}`).join(" + ")])} /></div>;
    case 17: return <div className="partition-grid"><div><h4>KLL</h4><MatrixTable matrix={result.partitions.kLL} /></div><div><h4>KLR</h4><MatrixTable matrix={result.partitions.kLR} /></div><div><h4>KRL</h4><MatrixTable matrix={result.partitions.kRL} /></div><div><h4>KRR</h4><MatrixTable matrix={result.partitions.kRR} /></div></div>;
    case 18: return <div className="reduced-block"><Equation tex={String.raw`\mathbf K_{LL}\mathbf U_L=\mathbf F_L-\mathbf K_{LR}\mathbf U_R`} /><div><VectorTable values={result.partitions.reducedRhs} labels={result.free.map((dof) => labels[dof])} /></div><p>Solver: {result.solver.method}. No se calcula KLL⁻¹.</p></div>;
    case 19: return <VectorTable values={result.displacements.map((value, index) => result.dofs[index]?.component === "rz" ? value : fromSI.displacement(value, project.units))} labels={labels} />;
    case 20: return <VectorTable values={result.reactions.map((value, index) => result.dofs[index]?.component === "rz" ? fromSI.moment(value, project.units) : fromSI.force(value, project.units))} labels={labels} />;
    case 21: return <DataTable compact headers={["E", "δ (m)", "ε"]} rows={result.elementResults.map((item) => [item.elementNumber, formatNumber(item.elongation, 8), formatNumber(item.strain, 8)])} />;
    case 22: return <DataTable compact headers={["E", `σ (${project.units.stress})`]} rows={result.elementResults.map((item) => [item.elementNumber, formatNumber(fromSI.stress(item.stress, project.units), 7)])} />;
    case 23: return <DataTable compact headers={["E", `N (${project.units.force})`, "Fuerzas locales de extremo (SI)"]} rows={result.elementResults.map((item) => [item.elementNumber, formatNumber(fromSI.force(item.axialForce, project.units), 7), item.localEndForces.map((value) => formatNumber(value, 5)).join(" · ")])} />;
    case 24: return <DataTable compact headers={["E", "Clasificación", "Convención"]} rows={result.elementResults.map((item) => [item.elementNumber, <span key={item.elementId} className={`force-label ${item.state}`}>{item.state}</span>, item.axialForce > 0 ? "N > 0" : item.axialForce < 0 ? "N < 0" : "|N|≈0"])} />;
    case 25: return <StructureCanvas key={`${project.id}-deformed`} project={project} result={result} selectedElement={selectedElement} onSelectElement={() => {}} onAddNode={() => {}} initialDeformed />;
    case 26: return <div><Equation tex={String.raw`\sum F_x=0\qquad \sum F_y=0\qquad \sum M_O=0`} /><div className="fact-grid"><span><small>ΣFx</small><strong>{formatNumber(fromSI.force(result.equilibrium.fx, project.units), 7)} {project.units.force}</strong></span><span><small>ΣFy</small><strong>{formatNumber(fromSI.force(result.equilibrium.fy, project.units), 7)} {project.units.force}</strong></span><span><small>ΣM</small><strong>{formatNumber(fromSI.moment(result.equilibrium.moment, project.units), 7)} {project.units.force}·{project.units.length}</strong></span><span><small>Error relativo</small><strong>{formatNumber(result.equilibrium.relativeError, 5)}</strong></span></div><Status ok={result.equilibrium.passed}>{result.equilibrium.passed ? "Equilibrio aprobado" : "Equilibrio por revisar"}</Status></div>;
    default: return null;
  }
}

const theoryChapters: Array<[string, string, string]> = [
  ["1. Hipótesis", "Pequeños desplazamientos, material elástico lineal y compatibilidad nodal. En armaduras cada barra trabaja axialmente; en pórticos intervienen axial y flexión.", String.raw`\mathbf F=\mathbf K\mathbf U`],
  ["2. Barra axial", "La rigidez elemental nace de N=EAε y ε=δ/L. La relación AE/L controla la respuesta axial.", String.raw`\mathbf k'_a=\frac{EA}{L}\begin{bmatrix}1&-1\\-1&1\end{bmatrix}`],
  ["3. Pórtico plano", "Cada nodo posee ux, uy y θz. La matriz 6×6 combina EA/L, 12EI/L³, 6EI/L², 4EI/L y 2EI/L.", String.raw`\mathbf k'_f=\mathbf k'(EA,EI,L)`],
  ["4. Transformación", "Los cosenos directores relacionan los ejes locales con los globales. La aplicación conserva la forma de λ mostrada en la imagen adjunta y usa T=λᵀ para U′=TU.", String.raw`\mathbf K_e=\mathbf T^T\mathbf k'_e\mathbf T`],
  ["5. Ensamblaje", "El mapa de localización asigna cada término del elemento a los GDL de la estructura. El inspector permite rastrear cada suma de K.", String.raw`K_{IJ}\mathrel{+}=K^e_{ab}`],
  ["6. Restricciones", "Los GDL se separan en libres L y restringidos R. Se admiten desplazamientos prescritos distintos de cero.", String.raw`\begin{Bmatrix}F_L\\F_R\end{Bmatrix}=\begin{bmatrix}K_{LL}&K_{LR}\\K_{RL}&K_{RR}\end{bmatrix}\begin{Bmatrix}U_L\\U_R\end{Bmatrix}`],
  ["7. Solución estable", "El sistema reducido se resuelve por Cholesky cuando es definido positivo y por pivoteo como respaldo. No se usa la inversión explícita del notebook.", String.raw`\mathbf K_{LL}\mathbf U_L=\mathbf F_L-\mathbf K_{LR}\mathbf U_R`],
  ["8. Reacciones", "Una vez reconstruido U, las reacciones se recuperan sobre el sistema completo.", String.raw`\mathbf R=\mathbf K\mathbf U-\mathbf F`],
  ["9. Recuperación", "Los desplazamientos globales de cada barra vuelven al sistema local para calcular deformación, esfuerzo y fuerzas de extremo.", String.raw`\mathbf u'_e=\mathbf T_e\mathbf u_e`],
  ["10. Control", "El residuo del sistema y el equilibrio global separan una solución numérica de una respuesta simplemente dibujada.", String.raw`\eta=\frac{\lVert K_{LL}U_L-b\rVert_2}{\lVert K_{LL}\rVert_F\lVert U_L\rVert_2+\lVert b\rVert_2}`],
];

export default function LabApp({ user, signInPath, signOutPath }: { user: User; signInPath: string; signOutPath: string }) {
  const [project, setProject] = useState<StructuralProject>(() => structuredClone(notebookExample1));
  const [view, setView] = useState<View>("studio");
  const [editorTab, setEditorTab] = useState<EditorTab>("nodes");
  const [selectedElement, setSelectedElement] = useState<string | null>(notebookExample1.elements[0].id);
  const [selectedCell, setSelectedCell] = useState<[number, number]>([0, 0]);
  const [procedureStep, setProcedureStep] = useState(0);
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [newProjectOpen, setNewProjectOpen] = useState(false);
  const [materials, setMaterials] = useState<MaterialPreset[]>(defaultMaterials);
  const [saveState, setSaveState] = useState("Borrador local");
  const [cloudProjects, setCloudProjects] = useState<CloudProject[]>([]);
  const [versions, setVersions] = useState<CloudVersion[]>([]);
  const [busy, setBusy] = useState(false);
  const [reportComplete, setReportComplete] = useState(true);
  const importRef = useRef<HTMLInputElement>(null);
  const changeRef = useRef(0);
  const result = useMemo(() => analyzeProject(project), [project]);
  const selectedCalculation = result.elementCalculations.find((item) => item.elementId === selectedElement) ?? result.elementCalculations[0];
  const cellContributions = result.assemblyTrace[`${selectedCell[0]}:${selectedCell[1]}`] ?? [];

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const savedTheme = localStorage.getItem("matriz-unc-theme"); if (savedTheme === "dark") setTheme("dark");
        const savedMaterials = localStorage.getItem("matriz-unc-materials"); if (savedMaterials) setMaterials(JSON.parse(savedMaterials) as MaterialPreset[]);
        const draft = localStorage.getItem("matriz-unc-draft"); if (draft) { const parsed = JSON.parse(draft) as StructuralProject; if (parsed.schemaVersion === 2) { setProject(parsed); setSelectedElement(parsed.elements[0]?.id ?? null); setSaveState("Borrador recuperado"); } }
      } catch { /* El ejemplo adjunto sigue disponible. */ }
    });
  }, []);
  useEffect(() => { document.documentElement.dataset.theme = theme; localStorage.setItem("matriz-unc-theme", theme); }, [theme]);
  useEffect(() => { localStorage.setItem("matriz-unc-materials", JSON.stringify(materials)); }, [materials]);
  useEffect(() => {
    if (changeRef.current === 0) return;
    localStorage.setItem("matriz-unc-draft", JSON.stringify(project));
    setSaveState("Borrador local guardado");
    if (!user) return;
    const timer = window.setTimeout(async () => {
      try {
        await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", project, versioned: false }) });
        setSaveState("Sincronizado");
      } catch { setSaveState("Pendiente de sincronizar"); }
    }, 2200);
    return () => window.clearTimeout(timer);
  }, [project, user]);

  const update = (recipe: (draft: StructuralProject) => void) => {
    setProject((current) => { const draft = structuredClone(current); recipe(draft); return draft; });
    changeRef.current += 1; setSaveState("Guardando…");
  };
  const loadProject = (source: StructuralProject) => {
    const next = cloneProject(source); setProject(next); setSelectedElement(next.elements[0]?.id ?? null); setSelectedCell([0, 0]); setSaveState("Nuevo borrador"); changeRef.current += 1; setView("studio");
  };
  const addNodeAt = (x: number, y: number) => update((draft) => {
    const number = Math.max(0, ...draft.nodes.map((node) => node.number)) + 1;
    draft.nodes.push({ id: uid(), number, label: `N${number}`, x, y, loads: { fx: 0, fy: 0, mz: 0 }, constraints: { ux: { kind: "free" }, uy: { kind: "free" }, rz: { kind: "free" } } });
  });
  const refreshCloud = async () => {
    if (!user) return;
    setBusy(true);
    try { const response = await fetch("/api/projects"); const payload = await response.json() as { projects?: CloudProject[] }; setCloudProjects(payload.projects ?? []); }
    finally { setBusy(false); }
  };
  const manualSave = async () => {
    if (!user) { location.href = signInPath; return; }
    setBusy(true); setSaveState("Creando versión…");
    try { const response = await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "save", project, versioned: true, summary: "Versión manual desde el cuaderno" }) }); if (!response.ok) throw new Error(((await response.json()) as { error?: string }).error ?? "No se pudo guardar."); setSaveState("Versión guardada"); await refreshCloud(); }
    catch (error) { setSaveState(error instanceof Error ? error.message : "No se pudo guardar"); }
    finally { setBusy(false); }
  };
  const openVersions = async (projectId: string) => { const response = await fetch(`/api/projects?projectId=${encodeURIComponent(projectId)}`); const payload = await response.json() as { versions?: CloudVersion[] }; setVersions(payload.versions ?? []); };
  const deleteCloud = async (projectId: string) => { if (!confirm("¿Eliminar este proyecto y todas sus versiones?")) return; await fetch("/api/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "delete", projectId }) }); await refreshCloud(); };
  const importFile = async (file: File) => {
    try {
      if (file.name.toLowerCase().endsWith(".json")) {
        const imported = JSON.parse(await file.text()) as StructuralProject;
        if (imported.schemaVersion !== 2) throw new Error("El JSON no pertenece a esta versión del laboratorio.");
        setProject(imported); setSelectedElement(imported.elements[0]?.id ?? null); changeRef.current += 1; return;
      }
      const { Workbook } = await import("exceljs");
      const workbook = new Workbook(); await workbook.xlsx.load(await file.arrayBuffer());
      const nodesSheet = workbook.getWorksheet("Nodos"); const elementsSheet = workbook.getWorksheet("Elementos"); const loadsSheet = workbook.getWorksheet("Cargas barras");
      if (!nodesSheet || !elementsSheet) throw new Error("El Excel debe contener las hojas Nodos y Elementos exportadas por la aplicación.");
      const imported = cloneProject(project); imported.id = uid(); imported.nodes = []; imported.elements = [];
      const modernNodeSheet = String(nodesSheet.getRow(1).getCell(9).value ?? "").toLowerCase().includes("valor");
      const readConstraint = (row: import("exceljs").Row, stateColumn: number, valueColumn?: number): Constraint => {
        const rawKind = String(row.getCell(stateColumn).value ?? "free");
        const kind: Constraint["kind"] = rawKind === "fixed" || rawKind === "prescribed" ? rawKind : "free";
        if (kind !== "prescribed") return { kind };
        const value = Number(valueColumn ? row.getCell(valueColumn).value : 0);
        return { kind, value: Number.isFinite(value) ? value : 0 };
      };
      nodesSheet.eachRow((row, rowNumber) => { if (rowNumber === 1) return; const number = Number(row.getCell(1).value); const label = String(row.getCell(2).value ?? `N${number}`); imported.nodes.push({ id: `n-${number}-${uid()}`, number, label, x: Number(row.getCell(3).value), y: Number(row.getCell(4).value), loads: { fx: Number(row.getCell(5).value || 0), fy: Number(row.getCell(6).value || 0), mz: Number(row.getCell(7).value || 0) }, constraints: modernNodeSheet ? { ux: readConstraint(row, 8, 9), uy: readConstraint(row, 10, 11), rz: readConstraint(row, 12, 13) } : { ux: readConstraint(row, 8), uy: readConstraint(row, 9), rz: readConstraint(row, 10) } }); });
      elementsSheet.eachRow((row, rowNumber) => { if (rowNumber === 1) return; const number = Number(row.getCell(1).value); const nodeILabel = String(row.getCell(3).value); const nodeJLabel = String(row.getCell(4).value); imported.elements.push({ id: uid(), number, label: String(row.getCell(2).value ?? `E${number}`), nodeI: imported.nodes.find((node) => node.label === nodeILabel)?.id ?? "", nodeJ: imported.nodes.find((node) => node.label === nodeJLabel)?.id ?? "", A: Number(row.getCell(5).value), E: Number(row.getCell(6).value), I: Number(row.getCell(7).value || 1), material: String(row.getCell(8).value ?? "Personalizado"), loads: [] }); });
      loadsSheet?.eachRow((row, rowNumber) => {
        if (rowNumber === 1) return;
        const element = imported.elements.find((item) => item.number === Number(row.getCell(1).value));
        const kind = String(row.getCell(2).value) as MemberLoad["kind"];
        if (!element || !["distributed-y", "point-y", "point-x", "moment"].includes(kind)) return;
        const first = Number(row.getCell(3).value || 0); const second = Number(row.getCell(4).value || 0);
        element.loads.push(kind === "distributed-y" ? { id: uid(), kind, start: first, end: second } : { id: uid(), kind, value: first, position: second });
      });
      setProject(imported); setSelectedElement(imported.elements[0]?.id ?? null); changeRef.current += 1;
    } catch (error) { alert(error instanceof Error ? error.message : "No se pudo importar el archivo."); }
  };
  const downloadExcel = async () => { setBusy(true); try { const { exportExcel } = await import("../lib/exporters"); await exportExcel(project, result); } finally { setBusy(false); } };
  const downloadPdf = async () => { setBusy(true); try { const { exportPdf } = await import("../lib/exporters"); await exportPdf(project, result, reportComplete); } finally { setBusy(false); } };
  const downloadJson = async () => { const { exportJson } = await import("../lib/exporters"); exportJson(project); };
  const downloadCsv = async () => { const { exportCsv } = await import("../lib/exporters"); exportCsv(project, result); };

  return <div className="lab-app">
    <header className="lab-header">
      <div className="lab-brand"><div className="brand-seal"><span>L</span><span>M</span></div><div><strong>LABORATORIO MATRICIAL</strong><small>Universidad Nacional de Cajamarca · Ingeniería Hidráulica</small></div></div>
      <button className="mobile-menu-button" onClick={() => setMobileMenu(!mobileMenu)}><Menu size={20} /></button>
      <nav className={mobileMenu ? "open" : ""}>{nav.map((item) => { const Icon = item.icon; return <button key={item.id} className={view === item.id ? "active" : ""} onClick={() => { setView(item.id); setMobileMenu(false); if (item.id === "projects" && user) window.setTimeout(() => void refreshCloud(), 0); }}><Icon size={16} />{item.label}</button>; })}</nav>
      <div className="header-actions"><span className="save-indicator"><Cloud size={13} />{saveState}</span><button className="icon-button" title="Cambiar tema" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={17} /> : <Sun size={17} />}</button>{user ? <a className="account-button" href={signOutPath}><CircleUserRound size={16} /><span>{user.displayName.split(" ")[0]}</span></a> : <a className="account-button" href={signInPath}><LogIn size={16} /><span>Ingresar / registrarse</span></a>}</div>
    </header>

    <main>
      {view === "studio" && <>
        <section className="workflow-ruler">{["Proyecto", "Nodos", "Barras", "Vínculos", "Matrices", "Resolver", "Recuperar", "Informe"].map((label, index) => <button key={label} onClick={() => { if (index < 4) { setEditorTab(index === 0 ? "project" : index === 1 ? "nodes" : index === 2 ? "elements" : "loads"); document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" }); } else setView(index === 4 ? "matrices" : index === 5 || index === 6 ? "results" : "notebook"); }}><span>{String(index + 1).padStart(2, "0")}</span><strong>{label}</strong></button>)}</section>
        <section className="project-line"><div><span className="eyebrow">CUADERNO ACTIVO · {project.kind === "truss2d" ? "2 GDL/NODO" : "3 GDL/NODO"}</span><h1>{project.metadata.name}</h1><p>{project.metadata.description}</p></div><div className="project-line-actions"><button onClick={() => setNewProjectOpen(true)}><Plus size={15} />Nueva estructura</button><button onClick={() => importRef.current?.click()}><Upload size={15} />Importar</button><button onClick={() => setView("graphics")}><ChartNoAxesCombined size={15} />Ver 4 gráficos</button><button className="primary" onClick={() => setView(result.ok ? "results" : "studio")}><Calculator size={15} />Calcular</button></div></section>
        <section className="workbench-grid">
          <aside className="example-ledger"><div className="panel-kicker">CASOS ADJUNTOS</div><h2>Modelos de comprobación</h2><p>No son capturas: cada caso vuelve a ensamblarse y resolverse.</p><div className="example-list">{examples.map((example, index) => <button key={example.id} className={project.metadata.source === example.metadata.source ? "active" : ""} onClick={() => loadProject(example)}><span>{index < 2 ? `NOTEBOOK ${index + 1}` : `PDF ${example.metadata.source.match(/pp\. ([\d-]+)/)?.[1] ?? ""}`}</span><strong>{example.metadata.name.replace(/^Ejemplo \d - |^PDF - /, "")}</strong><small>{example.nodes.length} nodos · {example.elements.length} barras</small></button>)}</div></aside>
          <section className="canvas-sheet"><div className="sheet-heading"><div><span>PLANO DE TRABAJO</span><h2>Geometría, apoyos, cargas y deformada</h2></div><Status ok={result.ok}>{result.ok ? "Modelo estable" : "Cálculo bloqueado"}</Status></div><StructureCanvas key={`${project.id}-studio`} project={project} result={result} selectedElement={selectedElement} onSelectElement={setSelectedElement} onAddNode={addNodeAt} /></section>
          <aside className="calculation-slip"><div className="slip-number">{result.ok ? "OK" : result.diagnostics.filter((item) => item.severity === "error").length.toString().padStart(2, "0")}</div><span className="panel-kicker">CONTROL NUMÉRICO</span><h2>{result.ok ? "Sistema resuelto" : "Corregir modelo"}</h2><div className="slip-metrics"><div><span>Orden de K</span><strong>{result.globalK.length} × {result.globalK.length}</strong></div><div><span>Libres / restringidos</span><strong>{result.free.length} / {result.restrained.length}</strong></div><div><span>Residuo η</span><strong>{formatNumber(result.solver.relativeResidual, 4)}</strong></div><div><span>Equilibrio</span><strong>{result.equilibrium.passed ? "APROBADO" : "REVISAR"}</strong></div></div><div className="diagnostic-stack">{result.diagnostics.filter((item) => item.severity !== "info").slice(0, 5).map((item) => <div key={`${item.code}-${item.entity}`} className={item.severity}><Info size={14} /><span><strong>{item.code}</strong>{item.message}</span></div>)}</div><button className="primary full" onClick={() => setView("notebook")}><BookOpen size={15} />Abrir procedimiento completo</button></aside>
        </section>
        {project.metadata.source === "Modelo creado por el usuario" && <section className="new-project-sequence"><div><span className="panel-kicker">PROYECTO NUEVO · ORDEN RECOMENDADO</span><h2>Completa el modelo sin desordenar la estructura</h2><p>La plantilla ya es estable. Cambia un grupo de datos a la vez y calcula al final.</p></div><div className="sequence-actions">{([['project', '01', 'Datos y unidades'], ['nodes', '02', 'Nodos y apoyos'], ['elements', '03', 'Barras y propiedades'], ['loads', '04', 'Cargas']] as Array<[EditorTab, string, string]>).map(([tab, number, label]) => <button key={tab} className={editorTab === tab ? "active" : ""} onClick={() => { setEditorTab(tab); document.getElementById("editor")?.scrollIntoView({ behavior: "smooth" }); }}><span>{number}</span>{label}</button>)}<button className="primary" onClick={() => setView(result.ok ? "results" : "studio")}><span>05</span>Calcular y revisar</button></div></section>}
        <section id="editor" className="editor-notebook"><div className="editor-tabs">{(["project", "nodes", "elements", "loads", "materials"] as EditorTab[]).map((tab) => <button key={tab} className={editorTab === tab ? "active" : ""} onClick={() => setEditorTab(tab)}>{tab === "project" ? "Proyecto y unidades" : tab === "nodes" ? "Nodos y apoyos" : tab === "elements" ? "Barras y secciones" : tab === "loads" ? "Cargas de barras" : "Materiales"}</button>)}</div><div className="editor-page">{editorTab === "project" ? <ProjectEditor project={project} update={update} /> : editorTab === "nodes" ? <NodeEditor project={project} update={update} /> : editorTab === "elements" ? <ElementEditor project={project} update={update} materials={materials} /> : editorTab === "loads" ? <LoadsEditor project={project} update={update} /> : <MaterialsEditor project={project} materials={materials} setMaterials={setMaterials} />}</div></section>
      </>}

      {view === "notebook" && <section className="notebook-view"><div className="page-title"><div><span className="eyebrow">MEMORIA REGENERADA CON EL MODELO ACTUAL</span><h1>Procedimiento completo en 27 pasos</h1><p>Selecciona un capítulo o despliega las hojas. Los valores no están escritos a mano: proceden del análisis vigente.</p></div><Status ok={result.ok}>{result.ok ? "27 pasos calculados" : "Disponible hasta validación"}</Status></div><div className="chapter-strip">{procedureTitles.map((title, index) => <button key={title} className={procedureStep === index ? "active" : ""} onClick={() => { setProcedureStep(index); document.getElementById(`step-${index}`)?.scrollIntoView({ behavior: "smooth", block: "start" }); }}><span>{index + 1}</span>{title}</button>)}</div><div className="calculation-pages">{procedureTitles.map((title, index) => <details id={`step-${index}`} key={title} open={procedureStep === index || index < 2} onToggle={(event) => { if (event.currentTarget.open) setProcedureStep(index); }}><summary><span className="chapter-number">{String(index + 1).padStart(2, "0")}</span><div><strong>{title}</strong><small>{index < 6 ? "Entrada y modelo" : index < 19 ? "Formulación y solución" : "Resultados y control"}</small></div><ChevronDown size={18} /></summary><div className="calculation-page"><ProcedureContent index={index} project={project} result={result} selectedElement={selectedElement} /></div></details>)}</div></section>}

      {view === "matrices" && <section className="matrix-lab"><div className="page-title"><div><span className="eyebrow">RASTREO DE CADA TÉRMINO</span><h1>Laboratorio de matrices</h1><p>Compara k′, λ, T y Ke; después inspecciona cómo cada elemento entra en la matriz global.</p></div><select value={selectedElement ?? ""} onChange={(event) => setSelectedElement(event.target.value)}>{result.elementCalculations.map((item) => <option key={item.elementId} value={item.elementId}>Elemento {item.elementNumber} · {item.label}</option>)}</select></div>{selectedCalculation && <div className="matrix-quartet"><article><h2>k′ local</h2><MatrixTable matrix={selectedCalculation.local} /></article><article><h2>λ del PDF</h2><MatrixTable matrix={selectedCalculation.lambda} /></article><article><h2>T usada</h2><MatrixTable matrix={selectedCalculation.transformation} /></article><article><h2>Ke global</h2><MatrixTable matrix={selectedCalculation.global} /></article></div>}<div className="assembly-lab"><article><div className="sheet-heading"><div><span>MATRIZ MAESTRA</span><h2>K antes de restricciones</h2></div><span>{result.globalK.length} × {result.globalK.length}</span></div><MatrixTable matrix={result.globalK} selected={selectedCell} onCell={setSelectedCell} /></article><aside><span className="panel-kicker">CELDA SELECCIONADA</span><h2>K<sub>{selectedCell[0] + 1},{selectedCell[1] + 1}</sub></h2><div className="cell-value">{formatNumber(result.globalK[selectedCell[0]]?.[selectedCell[1]] ?? 0, 7)}</div><p>{result.dofs[selectedCell[0]]?.nodeLabel}.{result.dofs[selectedCell[0]]?.component} ↔ {result.dofs[selectedCell[1]]?.nodeLabel}.{result.dofs[selectedCell[1]]?.component}</p><div className="contribution-list">{cellContributions.map((item) => <div key={`${item.elementId}-${item.localRow}-${item.localCol}`}><span>E{item.elementNumber} · [{item.localRow + 1},{item.localCol + 1}]</span><strong>{formatNumber(item.value, 6)}</strong></div>)}{!cellContributions.length && <div><span>Sin contribución elemental</span><strong>0</strong></div>}</div></aside></div><div className="partition-grid large"><div><h2>KLL</h2><MatrixTable matrix={result.partitions.kLL} /></div><div><h2>KLR</h2><MatrixTable matrix={result.partitions.kLR} /></div><div><h2>KRL</h2><MatrixTable matrix={result.partitions.kRL} /></div><div><h2>KRR</h2><MatrixTable matrix={result.partitions.kRR} /></div></div></section>}

      {view === "results" && <section className="results-view"><div className="page-title"><div><span className="eyebrow">RESPUESTA ESTRUCTURAL</span><h1>{result.ok ? "Solución obtenida sin invertir K" : "El análisis está bloqueado"}</h1><p>{result.solver.method} · residuo relativo {formatNumber(result.solver.relativeResidual, 5)}</p></div><Status ok={result.ok}>{result.ok ? "Resultado válido" : "Revisar entrada"}</Status></div>{!result.ok && <div className="error-board">{result.diagnostics.map((item) => <div key={`${item.code}-${item.entity}`}><Info /><span><strong>{item.code}</strong>{item.message}</span></div>)}</div>}{result.ok && <><div className="result-metrics"><article><span>Desplazamiento máximo</span><strong>{formatNumber(Math.max(...result.dofs.filter((dof) => dof.component !== "rz").map((dof) => Math.abs(fromSI.displacement(result.displacements[dof.index], project.units)))), 6)}</strong><small>{project.units.displacement}</small></article><article><span>Indicador de condición</span><strong>{formatNumber(result.solver.conditionIndicator, 4)}</strong><small>Relación de pivotes</small></article><article><span>Residuo relativo</span><strong>{formatNumber(result.solver.relativeResidual, 5)}</strong><small>η</small></article><article><span>Equilibrio global</span><strong>{result.equilibrium.passed ? "APROBADO" : "REVISAR"}</strong><small>{formatNumber(result.equilibrium.relativeError, 5)}</small></article></div><div className="results-grid"><article className="result-canvas"><StructureCanvas key={`${project.id}-results`} project={project} result={result} selectedElement={selectedElement} onSelectElement={setSelectedElement} onAddNode={() => {}} initialDeformed /></article><article className="result-table"><h2>Desplazamientos y reacciones</h2><DataTable compact headers={["GDL", "Nodo", "Comp.", `U (${project.units.displacement}/rad)`, `R (${project.units.force}/mom.)`]} rows={result.dofs.map((dof) => [dof.display, dof.nodeLabel, dof.component, dof.component === "rz" ? formatNumber(result.displacements[dof.index], 7) : formatNumber(fromSI.displacement(result.displacements[dof.index], project.units), 7), dof.component === "rz" ? formatNumber(fromSI.moment(result.reactions[dof.index], project.units), 7) : formatNumber(fromSI.force(result.reactions[dof.index], project.units), 7)])} /></article></div><article className="member-results"><div className="sheet-heading"><div><span>RECUPERACIÓN LOCAL</span><h2>Resultados por elemento</h2></div><div className="legend"><span className="tension">Tracción</span><span className="compression">Compresión</span></div></div><DataTable headers={["E", "Nodos", "ε", `σ (${project.units.stress})`, `N (${project.units.force})`, "Estado", ...(project.kind === "frame2d" ? ["[Ni, Vi, Mi, Nj, Vj, Mj] SI"] : [])]} rows={result.elementResults.map((item) => { const source = project.elements.find((element) => element.id === item.elementId)!; return [item.elementNumber, `${project.nodes.find((node) => node.id === source.nodeI)?.label}-${project.nodes.find((node) => node.id === source.nodeJ)?.label}`, formatNumber(item.strain, 8), formatNumber(fromSI.stress(item.stress, project.units), 7), formatNumber(fromSI.force(item.axialForce, project.units), 7), <span key="state" className={`force-label ${item.state}`}>{item.state}</span>, ...(project.kind === "frame2d" ? [item.localEndForces.map((value) => formatNumber(value, 4)).join(" · ")] : [])]; })} /></article></>}</section>}

      {view === "graphics" && <section className="graphics-view"><div className="page-title"><div><span className="eyebrow">FIGURAS DEL NOTEBOOK · REGENERADAS EN SVG</span><h1>Apoyos, fuerzas, ejes locales y deformada</h1><p>Los cuatro gráficos usan el proyecto activo y cambian al instante con tus coordenadas, propiedades, cargas y restricciones.</p></div><Status ok={result.ok}>{result.ok ? "Resultados sincronizados" : "Geometría disponible"}</Status></div><GraphicsGallery project={project} result={result} /></section>}

      {view === "theory" && <section className="theory-view"><div className="page-title"><div><span className="eyebrow">BASADO EN TU PDF DE 69 PÁGINAS</span><h1>Teoría conectada con el cálculo</h1><p>La teoría sigue el orden del material enviado: rigidez, transformación, contragradiente, ensamblaje, partición y recuperación.</p></div></div><div className="source-map"><article><strong>PDF pp. 1–17</strong><span>Hipótesis, sistemas local/global, matriz λ y contragradiente.</span></article><article><strong>PDF pp. 18–35</strong><span>Ensamblaje, rigidez axial, corte, flexión y particiones.</span></article><article><strong>PDF pp. 36–50</strong><span>Pórtico triangular de tres barras y comparación SAP2000.</span></article><article><strong>PDF pp. 51–69</strong><span>Pórtico en V, carga horizontal y cargas aplicadas en barras.</span></article><article><strong>Notebooks 1 y 2</strong><span>Armaduras de 9 y 58 barras, fuerzas axiales y deformadas.</span></article></div><div className="theory-cards">{theoryChapters.map(([title, content, formula]) => <article key={title}><span className="theory-index">{title.split(".")[0]}</span><h2>{title}</h2><p>{content}</p><Equation tex={formula} /></article>)}</div><div className="convention-note"><ShieldCheck size={28} /><div><h2>Convención única y trazable</h2><p>La imagen adjunta muestra λ con bloques [cosα, −sinα; sinα, cosα]. El cuaderno la presenta tal cual y muestra también T=λᵀ, utilizada en U′=TU y Ke=Tᵀk′T. Así se evita mezclar fórmulas que usan sentidos de transformación opuestos.</p></div></div></section>}

      {view === "projects" && <section className="projects-view"><div className="page-title"><div><span className="eyebrow">GUARDADO, HISTORIAL Y RECUPERACIÓN</span><h1>Mis proyectos estructurales</h1><p>{user ? `Cuenta activa: ${user.email}` : "Ingresa con tu correo de ChatGPT para guardar proyectos y versiones de forma permanente."}</p></div><div className="project-line-actions">{user ? <><button onClick={() => void refreshCloud()}><RefreshCw size={15} />Actualizar</button><button className="primary" onClick={() => void manualSave()}><Archive size={15} />Guardar nueva versión</button></> : <a className="primary link-button" href={signInPath}><LogIn size={15} />Ingresar / crear cuenta</a>}</div></div>{user ? <div className="cloud-layout"><div className="cloud-list">{busy && <div className="loading-line"><LoaderCircle className="spin" />Consultando proyectos…</div>}{cloudProjects.map((item) => <article key={item.id}><div className="cloud-type">{item.structureType === "truss2d" ? "ARMADURA" : "PÓRTICO"}</div><div><h2>{item.name}</h2><p>Versión {item.versionNumber} · actualizado {new Date(item.updatedAt).toLocaleString("es-PE")}</p><span>{item.model.nodes.length} nodos · {item.model.elements.length} elementos</span></div><div><button className="primary" onClick={() => { setProject(item.model); setSelectedElement(item.model.elements[0]?.id ?? null); setView("studio"); }}>Abrir</button><button onClick={() => void openVersions(item.id)}><History size={14} />Historial</button><button className="danger" onClick={() => void deleteCloud(item.id)}><Trash2 size={14} /></button></div></article>)}{!cloudProjects.length && !busy && <div className="empty-explanation"><FolderClock size={30} /><h3>Aún no hay proyectos guardados</h3><p>Guarda una versión del modelo actual para comenzar el historial.</p><button className="primary" onClick={() => void manualSave()}><Save size={15} />Guardar proyecto actual</button></div>}</div><aside className="versions-panel"><span className="panel-kicker">HISTORIAL</span><h2>Versiones disponibles</h2>{versions.map((version) => <button key={version.id} onClick={() => { setProject(version.model); setSelectedElement(version.model.elements[0]?.id ?? null); setView("studio"); }}><strong>v{version.versionNumber}</strong><span>{version.summary}</span><small>{new Date(version.createdAt).toLocaleString("es-PE")}</small></button>)}{!versions.length && <p>Selecciona “Historial” en un proyecto.</p>}</aside></div> : <div className="sign-in-sheet"><div className="brand-seal large"><span>L</span><span>M</span></div><h2>Guarda tus ejercicios y recupéralos desde cualquier sesión</h2><p>El ingreso identifica tu correo y separa tus proyectos. El borrador actual también permanece temporalmente en este dispositivo.</p><a href={signInPath}><LogIn size={17} />Ingresar o crear cuenta</a></div>}</section>}
    </main>

    <footer className="export-dock"><div><span>Informe</span><label><input type="checkbox" checked={reportComplete} onChange={(event) => setReportComplete(event.target.checked)} />Matrices completas</label></div><button disabled={!result.ok || busy} onClick={() => void downloadPdf()}><Download size={16} />PDF</button><button disabled={!result.ok || busy} onClick={() => void downloadExcel()}><FileSpreadsheet size={16} />Excel</button><button onClick={() => void downloadCsv()}><Table2 size={16} />CSV</button><button onClick={() => void downloadJson()}><FileJson size={16} />JSON</button><button className="primary" disabled={busy} onClick={() => void manualSave()}>{busy ? <LoaderCircle className="spin" size={16} /> : <Save size={16} />}Guardar</button></footer>
    <input ref={importRef} hidden type="file" accept=".json,.xlsx" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importFile(file); event.target.value = ""; }} />
    {newProjectOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setNewProjectOpen(false); }}><div className="new-project-modal"><button className="modal-close" onClick={() => setNewProjectOpen(false)}><X size={18} /></button><span className="eyebrow">PLANTILLA ESTRUCTURAL ORDENADA</span><h2>¿Qué desea analizar?</h2><p>Cada opción abre una geometría estable, centrada y numerada. Después puede modificar coordenadas, barras, propiedades, apoyos y cargas.</p><div className="structure-choice"><button onClick={() => { const next = blankProject("truss2d"); setProject(next); setSelectedElement(next.elements[0]?.id ?? null); setSelectedCell([0, 0]); setNewProjectOpen(false); setEditorTab("project"); setView("studio"); changeRef.current += 1; }}><Boxes /><strong>Armadura triangular 2D</strong><span>3 nodos · 3 barras · apoyo fijo + rodillo</span></button><button onClick={() => { const next = blankProject("frame2d"); setProject(next); setSelectedElement(next.elements[0]?.id ?? null); setSelectedCell([0, 0]); setNewProjectOpen(false); setEditorTab("project"); setView("studio"); changeRef.current += 1; }}><Layers3 /><strong>Pórtico rectangular 2D</strong><span>4 nodos · 3 barras · dos empotramientos</span></button></div></div></div>}
  </div>;
}
