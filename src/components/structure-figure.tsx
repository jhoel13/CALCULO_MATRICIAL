"use client";

import { useId } from "react";
import { fromSI } from "../lib/units";
import type { AnalysisResult, StructuralNode, StructuralProject } from "../lib/types";

export type StructureFigureMode = "supports" | "forces" | "local" | "deformed";

type Props = {
  project: StructuralProject;
  result: AnalysisResult;
  mode: StructureFigureMode;
  deformationScale?: number;
  svgId?: string;
};

type Point = { x: number; y: number };

const width = 880;
const height = 570;
const plot = { left: 78, right: 30, top: 64, bottom: 66 };
const elementPalette = ["#1678b9", "#f47b20", "#289b3d", "#e42225", "#9467bd", "#8c564b", "#e66bc2", "#7f7f7f", "#b9ae00", "#15a8a8"];

const clean = (value: number) => {
  if (Math.abs(value) < 1e-12) return "0";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e5 || magnitude < 1e-3) return value.toExponential(2).replace("e+", "e");
  return Number(value.toPrecision(6)).toString();
};

const niceStep = (span: number, target = 7) => {
  const rough = Math.max(span, Number.EPSILON) / target;
  const exponent = 10 ** Math.floor(Math.log10(rough));
  const fraction = rough / exponent;
  const nice = fraction <= 1 ? 1 : fraction <= 2 ? 2 : fraction <= 5 ? 5 : 10;
  return nice * exponent;
};

const makeTicks = (min: number, max: number) => {
  const step = niceStep(max - min);
  const start = Math.ceil((min - step * 1e-8) / step) * step;
  const values: number[] = [];
  for (let value = start; value <= max + step * 1e-8 && values.length < 20; value += step) values.push(Number(value.toPrecision(12)));
  return values;
};

const supportName = (node: StructuralNode, frame: boolean) => {
  const ux = node.constraints.ux.kind !== "free";
  const uy = node.constraints.uy.kind !== "free";
  const rz = frame && node.constraints.rz.kind !== "free";
  if (ux && uy && rz) return "Empotramiento";
  if (ux && uy) return "Apoyo fijo";
  if (uy) return "Rodillo Y";
  if (ux) return "Rodillo X";
  if (rz) return "Giro restringido";
  return "";
};

export default function StructureFigure({ project, result, mode, deformationScale = 500, svgId }: Props) {
  const markerKey = useId().replaceAll(":", "");
  const markerLoad = `figure-load-${markerKey}`;
  const markerReaction = `figure-reaction-${markerKey}`;
  const markerLocalX = `figure-local-x-${markerKey}`;
  const markerLocalY = `figure-local-y-${markerKey}`;
  const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
  const resultByElement = new Map(result.elementResults.map((item) => [item.elementId, item]));
  const dofMap = new Map<string, Partial<Record<"ux" | "uy" | "rz", number>>>();
  result.dofs.forEach((dof) => dofMap.set(dof.nodeId, { ...dofMap.get(dof.nodeId), [dof.component]: dof.index }));
  const lengthFactor = project.units.length === "m" ? 1 : project.units.length === "cm" ? 100 : 1000;
  const deformedPoint = (node: StructuralNode): Point => {
    const dofs = dofMap.get(node.id);
    if (!result.ok || dofs?.ux === undefined || dofs.uy === undefined) return { x: node.x, y: node.y };
    return {
      x: node.x + result.displacements[dofs.ux] * lengthFactor * deformationScale,
      y: node.y + result.displacements[dofs.uy] * lengthFactor * deformationScale,
    };
  };

  const boundsPoints = project.nodes.flatMap((node) => mode === "deformed" ? [{ x: node.x, y: node.y }, deformedPoint(node)] : [{ x: node.x, y: node.y }]);
  const rawMinX = boundsPoints.length ? Math.min(...boundsPoints.map((point) => point.x)) : 0;
  const rawMaxX = boundsPoints.length ? Math.max(...boundsPoints.map((point) => point.x)) : 10;
  const rawMinY = boundsPoints.length ? Math.min(...boundsPoints.map((point) => point.y)) : 0;
  const rawMaxY = boundsPoints.length ? Math.max(...boundsPoints.map((point) => point.y)) : 10;
  const rawSpanX = Math.max(rawMaxX - rawMinX, 1);
  const rawSpanY = Math.max(rawMaxY - rawMinY, 1);
  const commonPad = Math.max(rawSpanX, rawSpanY) * 0.11;
  let minX = rawMinX - commonPad;
  let maxX = rawMaxX + commonPad;
  let minY = rawMinY - commonPad;
  let maxY = rawMaxY + commonPad;
  const plotWidth = width - plot.left - plot.right;
  const plotHeight = height - plot.top - plot.bottom;
  const uniformScale = Math.min(plotWidth / (maxX - minX), plotHeight / (maxY - minY));
  const targetSpanX = plotWidth / uniformScale;
  const targetSpanY = plotHeight / uniformScale;
  const centerX = (minX + maxX) / 2;
  const centerY = (minY + maxY) / 2;
  minX = centerX - targetSpanX / 2;
  maxX = centerX + targetSpanX / 2;
  minY = centerY - targetSpanY / 2;
  maxY = centerY + targetSpanY / 2;
  const mapX = (x: number) => plot.left + (x - minX) * uniformScale;
  const mapY = (y: number) => height - plot.bottom - (y - minY) * uniformScale;
  const xTicks = makeTicks(minX, maxX);
  const yTicks = makeTicks(minY, maxY);

  const structureName = project.kind === "truss2d" ? "Armadura" : "Pórtico";
  const titles: Record<StructureFigureMode, string> = {
    supports: `${structureName} (Apoyos)`,
    forces: `${structureName} (Fuerzas)`,
    local: `${structureName} (Ejes locales)`,
    deformed: `${structureName} (Deformada · Escala ×${deformationScale})`,
  };
  const title = titles[mode];
  const baseElements = project.elements.map((element, index) => {
    const ni = nodeMap.get(element.nodeI);
    const nj = nodeMap.get(element.nodeJ);
    if (!ni || !nj) return null;
    return <line key={element.id} x1={mapX(ni.x)} y1={mapY(ni.y)} x2={mapX(nj.x)} y2={mapY(nj.y)} stroke={elementPalette[index % elementPalette.length]} strokeWidth="2.5" strokeLinecap="round" />;
  });

  const supportSymbols = project.nodes.map((node) => {
    const ux = node.constraints.ux.kind !== "free";
    const uy = node.constraints.uy.kind !== "free";
    const rz = project.kind === "frame2d" && node.constraints.rz.kind !== "free";
    if (!ux && !uy && !rz) return null;
    const x = mapX(node.x);
    const y = mapY(node.y);
    const name = supportName(node, project.kind === "frame2d");
    if (ux && uy && !rz) return <g key={node.id} aria-label={`${node.label}: ${name}`}><rect x={x - 6} y={y - 6} width="12" height="12" rx="1" fill="#0b35f0" /><text x={x} y={y + 26} textAnchor="middle" className="figure-annotation">{name}</text></g>;
    if (uy && !ux) return <g key={node.id} aria-label={`${node.label}: ${name}`}><path d={`M ${x} ${y - 1} L ${x - 7} ${y + 11} L ${x + 7} ${y + 11} Z`} fill="#0b35f0" /><circle cx={x - 4} cy={y + 15} r="2.2" fill="#0b35f0" /><circle cx={x + 4} cy={y + 15} r="2.2" fill="#0b35f0" /><text x={x} y={y + 31} textAnchor="middle" className="figure-annotation">{name}</text></g>;
    if (ux && !uy) return <g key={node.id} aria-label={`${node.label}: ${name}`}><path d={`M ${x + 1} ${y} L ${x - 11} ${y - 7} L ${x - 11} ${y + 7} Z`} fill="#0b35f0" /><circle cx={x - 15} cy={y - 4} r="2.2" fill="#0b35f0" /><circle cx={x - 15} cy={y + 4} r="2.2" fill="#0b35f0" /><text x={x} y={y + 26} textAnchor="middle" className="figure-annotation">{name}</text></g>;
    return <g key={node.id} aria-label={`${node.label}: ${name}`}><rect x={x - 8} y={y + 3} width="16" height="8" fill="#0b35f0" /><line x1={x - 12} y1={y + 15} x2={x + 12} y2={y + 15} stroke="#0b35f0" strokeWidth="2" /><text x={x} y={y + 30} textAnchor="middle" className="figure-annotation">{name}</text></g>;
  });

  const nodeLabels = project.nodes.map((node) => {
    const point = mode === "deformed" && result.ok ? deformedPoint(node) : node;
    return <g key={node.id}><circle cx={mapX(point.x)} cy={mapY(point.y)} r="3.2" fill="#172033" /><text x={mapX(point.x) + 7} y={mapY(point.y) - 7} className="figure-node-label">{node.label}</text></g>;
  });

  const loadMagnitudes = project.nodes.map((node) => Math.hypot(node.loads.fx, node.loads.fy));
  const reactionValues = project.nodes.flatMap((node) => {
    const dofs = dofMap.get(node.id);
    if (!result.ok || dofs?.ux === undefined || dofs.uy === undefined) return [0];
    return [Math.hypot(fromSI.force(result.reactions[dofs.ux] ?? 0, project.units), fromSI.force(result.reactions[dofs.uy] ?? 0, project.units))];
  });
  const maxVector = Math.max(1, ...loadMagnitudes, ...reactionValues);
  const vectorLength = (magnitude: number) => 28 + 34 * Math.sqrt(Math.min(1, magnitude / maxVector));

  return <svg id={svgId} className="engineering-figure" viewBox={`0 0 ${width} ${height}`} role="img" aria-label={`${title}. Gráfico calculado con el modelo activo.`}>
    <title>{title}</title>
    <desc>Figura vectorial regenerada desde las coordenadas, vínculos, cargas y resultados del proyecto activo.</desc>
    <style>{`
      .figure-title{fill:#111820;font-family:Georgia,'Times New Roman',serif;font-size:24px;font-weight:500}
      .figure-axis-label{fill:#20242b;font-family:Georgia,'Times New Roman',serif;font-size:16px}
      .figure-grid-lines line{stroke:#dfe4e8;stroke-width:1;stroke-dasharray:2 4}
      .figure-ticks line{stroke:#20242b;stroke-width:1.2}
      .figure-ticks text{fill:#252b32;font-family:Georgia,'Times New Roman',serif;font-size:12px}
      .figure-node-label{fill:#121820;font-family:Georgia,'Times New Roman',serif;font-size:15px;font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:4px;stroke-linejoin:round}
      .figure-annotation{fill:#0b35f0;font-family:Arial,sans-serif;font-size:10px;font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:3px}
      .figure-force-label{fill:#b42318;font-family:Arial,sans-serif;font-size:10px;font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}
      .figure-reaction-label{fill:#a65700;font-family:Arial,sans-serif;font-size:10px;font-weight:700;paint-order:stroke;stroke:#fff;stroke-width:3px;stroke-linejoin:round}
      .figure-local-x{fill:#123ee8;font-family:Arial,sans-serif;font-size:11px;font-weight:800;paint-order:stroke;stroke:#fff;stroke-width:3px}
      .figure-local-y{fill:#e31a1c;font-family:Arial,sans-serif;font-size:11px;font-weight:800;paint-order:stroke;stroke:#fff;stroke-width:3px}
      .figure-warning{fill:#b42318;font-family:Arial,sans-serif;font-size:13px;font-weight:700}
      .figure-legend rect{fill:#fff;stroke:#cfd5db;stroke-width:1}
      .figure-legend text{fill:#20242b;font-family:Georgia,'Times New Roman',serif;font-size:12px}
    `}</style>
    <defs>
      <marker id={markerLoad} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#f04438" /></marker>
      <marker id={markerReaction} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="8" markerHeight="8" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#df7a00" /></marker>
      <marker id={markerLocalX} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#123ee8" /></marker>
      <marker id={markerLocalY} viewBox="0 0 10 10" refX="8" refY="5" markerWidth="7" markerHeight="7" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#e31a1c" /></marker>
      <clipPath id={`plot-clip-${markerKey}`}><rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} /></clipPath>
    </defs>
    <rect width={width} height={height} fill="#ffffff" />
    <text x={width / 2} y="31" textAnchor="middle" className="figure-title">{title}</text>
    <rect x={plot.left} y={plot.top} width={plotWidth} height={plotHeight} fill="#fff" stroke="#20242b" strokeWidth="1.4" />
    <g className="figure-grid-lines">
      {xTicks.map((tick) => <line key={`xg-${tick}`} x1={mapX(tick)} y1={plot.top} x2={mapX(tick)} y2={height - plot.bottom} />)}
      {yTicks.map((tick) => <line key={`yg-${tick}`} x1={plot.left} y1={mapY(tick)} x2={width - plot.right} y2={mapY(tick)} />)}
    </g>
    <g className="figure-ticks">
      {xTicks.map((tick) => <g key={`xt-${tick}`}><line x1={mapX(tick)} y1={height - plot.bottom} x2={mapX(tick)} y2={height - plot.bottom + 5} /><text x={mapX(tick)} y={height - plot.bottom + 21} textAnchor="middle">{clean(tick)}</text></g>)}
      {yTicks.map((tick) => <g key={`yt-${tick}`}><line x1={plot.left - 5} y1={mapY(tick)} x2={plot.left} y2={mapY(tick)} /><text x={plot.left - 10} y={mapY(tick) + 4} textAnchor="end">{clean(tick)}</text></g>)}
    </g>
    <text x={plot.left + plotWidth / 2} y={height - 17} textAnchor="middle" className="figure-axis-label">x ({project.units.length})</text>
    <text x="22" y={plot.top + plotHeight / 2} textAnchor="middle" transform={`rotate(-90 22 ${plot.top + plotHeight / 2})`} className="figure-axis-label">y ({project.units.length})</text>

    <g clipPath={`url(#plot-clip-${markerKey})`}>
      {mode !== "deformed" && <g>{baseElements}</g>}

      {mode === "deformed" && <g>
        <g stroke="#b9bec4" strokeWidth="2.4" strokeDasharray="8 6" fill="none">{project.elements.map((element) => { const ni = nodeMap.get(element.nodeI); const nj = nodeMap.get(element.nodeJ); return ni && nj ? <line key={element.id} x1={mapX(ni.x)} y1={mapY(ni.y)} x2={mapX(nj.x)} y2={mapY(nj.y)} /> : null; })}</g>
        {result.ok ? <g>{project.elements.map((element) => {
          const ni = nodeMap.get(element.nodeI); const nj = nodeMap.get(element.nodeJ); if (!ni || !nj) return null;
          const pi = deformedPoint(ni); const pj = deformedPoint(nj); const member = resultByElement.get(element.id);
          const stroke = member?.state === "tracción" ? "#123ee8" : member?.state === "compresión" ? "#e31a1c" : "#25313c";
          const dash = member?.state === "nulo" ? "4 4" : undefined;
          return <line key={element.id} x1={mapX(pi.x)} y1={mapY(pi.y)} x2={mapX(pj.x)} y2={mapY(pj.y)} stroke={stroke} strokeWidth="3" strokeDasharray={dash} strokeLinecap="round" />;
        })}</g> : <text x={plot.left + plotWidth / 2} y={plot.top + 38} textAnchor="middle" className="figure-warning">Corrige el modelo para calcular la deformada.</text>}
      </g>}

      {mode === "supports" && <g>{supportSymbols}</g>}

      {mode === "forces" && <g>
        {project.nodes.map((node) => {
          const magnitude = Math.hypot(node.loads.fx, node.loads.fy); if (magnitude <= project.tolerance) return null;
          const length = vectorLength(magnitude); const x = mapX(node.x); const y = mapY(node.y);
          const dx = node.loads.fx / magnitude * length; const dy = -node.loads.fy / magnitude * length;
          return <g key={`load-${node.id}`}><line x1={x} y1={y} x2={x + dx} y2={y + dy} stroke="#f04438" strokeWidth="4" markerEnd={`url(#${markerLoad})`} /><text x={x + dx + Math.sign(dx || 1) * 7} y={y + dy - 7} textAnchor={dx < 0 ? "end" : "start"} className="figure-force-label">F{node.label}: ({clean(node.loads.fx)}, {clean(node.loads.fy)}) {project.units.force}</text></g>;
        })}
        {result.ok && project.nodes.map((node) => {
          const dofs = dofMap.get(node.id); if (dofs?.ux === undefined || dofs.uy === undefined) return null;
          const rx = fromSI.force(result.reactions[dofs.ux] ?? 0, project.units); const ry = fromSI.force(result.reactions[dofs.uy] ?? 0, project.units);
          const magnitude = Math.hypot(rx, ry); if (magnitude <= Math.max(project.tolerance, maxVector * 1e-9)) return null;
          const length = vectorLength(magnitude); const x = mapX(node.x); const y = mapY(node.y); const dx = rx / magnitude * length; const dy = -ry / magnitude * length;
          return <g key={`reaction-${node.id}`}><line x1={x} y1={y} x2={x + dx} y2={y + dy} stroke="#df7a00" strokeWidth="3" strokeDasharray="6 3" markerEnd={`url(#${markerReaction})`} /><text x={x + dx + Math.sign(dx || 1) * 7} y={y + dy + 15} textAnchor={dx < 0 ? "end" : "start"} className="figure-reaction-label">R{node.label}: ({clean(rx)}, {clean(ry)}) {project.units.force}</text></g>;
        })}
      </g>}

      {mode === "local" && <g>{project.elements.map((element) => {
        const ni = nodeMap.get(element.nodeI); const nj = nodeMap.get(element.nodeJ); if (!ni || !nj) return null;
        const xi = mapX(ni.x); const yi = mapY(ni.y); const xj = mapX(nj.x); const yj = mapY(nj.y);
        const length = Math.hypot(xj - xi, yj - yi); if (!length) return null;
        const ux = (xj - xi) / length; const uy = (yj - yi) / length; const axis = Math.max(24, Math.min(46, length * 0.24)); const mx = (xi + xj) / 2; const my = (yi + yj) / 2;
        const yx = uy; const yy = -ux;
        return <g key={element.id}><line x1={mx} y1={my} x2={mx + ux * axis} y2={my + uy * axis} stroke="#123ee8" strokeWidth="3" markerEnd={`url(#${markerLocalX})`} /><line x1={mx} y1={my} x2={mx + yx * axis * 0.85} y2={my + yy * axis * 0.85} stroke="#e31a1c" strokeWidth="3" markerEnd={`url(#${markerLocalY})`} /><text x={mx + ux * axis + 7} y={my + uy * axis + 4} className="figure-local-x">x′</text><text x={mx + yx * axis * 0.85 + 7} y={my + yy * axis * 0.85 + 4} className="figure-local-y">y′</text></g>;
      })}</g>}

      {mode !== "deformed" && <g>{nodeLabels}</g>}
      {mode === "deformed" && <g>{nodeLabels}</g>}
    </g>

    {mode === "supports" && <g className="figure-legend" transform={`translate(${width - 285} 45)`}><rect x="0" y="0" width="255" height="25" rx="3" /><rect x="10" y="7" width="10" height="10" fill="#0b35f0" /><text x="27" y="16">Fijo</text><path d="M 82 7 L 76 17 L 88 17 Z" fill="#0b35f0" /><text x="95" y="16">Rodillo</text><line x1="159" y1="12" x2="177" y2="12" stroke="#7f7f7f" strokeWidth="3" /><text x="183" y="16">Barras</text></g>}
    {mode === "forces" && <g className="figure-legend" transform={`translate(${width - 337} 45)`}><rect x="0" y="0" width="307" height="25" rx="3" /><line x1="10" y1="12" x2="30" y2="12" stroke="#f04438" strokeWidth="4" /><text x="37" y="16">Cargas aplicadas</text><line x1="157" y1="12" x2="177" y2="12" stroke="#df7a00" strokeWidth="3" strokeDasharray="5 3" /><text x="184" y="16">Reacciones</text></g>}
    {mode === "local" && <g className="figure-legend" transform={`translate(${width - 282} 45)`}><rect x="0" y="0" width="252" height="25" rx="3" /><line x1="10" y1="12" x2="30" y2="12" stroke="#123ee8" strokeWidth="3" /><text x="37" y="16">Eje x′</text><line x1="110" y1="12" x2="130" y2="12" stroke="#e31a1c" strokeWidth="3" /><text x="137" y="16">Eje y′</text></g>}
    {mode === "deformed" && <g className="figure-legend" transform={`translate(${width - 408} 45)`}><rect x="0" y="0" width="378" height="25" rx="3" /><line x1="10" y1="12" x2="30" y2="12" stroke="#123ee8" strokeWidth="3" /><text x="37" y="16">Tracción</text><line x1="112" y1="12" x2="132" y2="12" stroke="#e31a1c" strokeWidth="3" /><text x="139" y="16">Compresión</text><line x1="244" y1="12" x2="264" y2="12" stroke="#b9bec4" strokeWidth="2" strokeDasharray="5 3" /><text x="271" y="16">Original</text></g>}
  </svg>;
}
