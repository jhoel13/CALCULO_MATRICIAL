"use client";

import { Crosshair, Grid2X2, LocateFixed, Maximize2, MousePointer2, Move, Plus, RotateCcw } from "lucide-react";
import { useId, useMemo, useRef, useState } from "react";
import type { AnalysisResult, StructuralProject } from "../lib/types";

type Props = {
  project: StructuralProject;
  result: AnalysisResult;
  selectedElement: string | null;
  onSelectElement: (id: string) => void;
  onAddNode: (x: number, y: number) => void;
  initialDeformed?: boolean;
};

type ScreenPoint = { x: number; y: number };

const VIEW_WIDTH = 1000;
const VIEW_HEIGHT = 600;
const MEMBER_COLORS = ["#1678b9", "#f47b20", "#289b3d", "#e42225", "#9467bd", "#8c564b", "#e66bc2", "#66727d", "#b9ae00", "#15a8a8"];
const clean = (value: number) => Number(value.toPrecision(7));

export default function StructureCanvas({ project, result, selectedElement, onSelectElement, onAddNode, initialDeformed = false }: Props) {
  const svgRef = useRef<SVGSVGElement>(null);
  const dragRef = useRef<{ clientX: number; clientY: number; panX: number; panY: number } | null>(null);
  const markerKey = useId().replaceAll(":", "");
  const arrowId = `canvas-arrow-${markerKey}`;
  const localXId = `canvas-local-x-${markerKey}`;
  const localYId = `canvas-local-y-${markerKey}`;
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [drawMode, setDrawMode] = useState(false);
  const [snap, setSnap] = useState(true);
  const [showGrid, setShowGrid] = useState(true);
  const [showNodes, setShowNodes] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [showElementLabels, setShowElementLabels] = useState(true);
  const [showDimensions, setShowDimensions] = useState(false);
  const [showLoads, setShowLoads] = useState(true);
  const [showSupports, setShowSupports] = useState(true);
  const [showLocal, setShowLocal] = useState(false);
  const [showDeformed, setShowDeformed] = useState(initialDeformed);
  const [deformationScale, setDeformationScale] = useState(100);

  const geometry = useMemo(() => {
    const xs = project.nodes.map((node) => node.x).filter(Number.isFinite);
    const ys = project.nodes.map((node) => node.y).filter(Number.isFinite);
    const minX = xs.length ? Math.min(...xs) : -1;
    const maxX = xs.length ? Math.max(...xs) : 1;
    const minY = ys.length ? Math.min(...ys) : -1;
    const maxY = ys.length ? Math.max(...ys) : 1;
    const rawSpanX = Math.max(maxX - minX, 1e-6);
    const rawSpanY = Math.max(maxY - minY, 1e-6);
    const referenceSpan = Math.max(rawSpanX, rawSpanY, 1);
    const spanX = Math.max(rawSpanX, referenceSpan * 0.22);
    const spanY = Math.max(rawSpanY, referenceSpan * 0.32);
    const scale = Math.min((VIEW_WIDTH - 170) / spanX, (VIEW_HEIGHT - 180) / spanY);
    const gridRaw = referenceSpan / 8;
    const power = 10 ** Math.floor(Math.log10(gridRaw));
    const ratio = gridRaw / power;
    const grid = (ratio <= 1 ? 1 : ratio <= 2 ? 2 : ratio <= 5 ? 5 : 10) * power;
    return { centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2, scale: Number.isFinite(scale) && scale > 0 ? scale : 60, grid: Number.isFinite(grid) && grid > 0 ? grid : 1 };
  }, [project.nodes]);

  const toScreen = (x: number, y: number): ScreenPoint => ({
    x: VIEW_WIDTH / 2 + (x - geometry.centerX) * geometry.scale * zoom + pan.x,
    y: VIEW_HEIGHT / 2 - (y - geometry.centerY) * geometry.scale * zoom + pan.y,
  });
  const toModelFromScreen = (x: number, y: number) => ({
    x: geometry.centerX + (x - VIEW_WIDTH / 2 - pan.x) / (geometry.scale * zoom),
    y: geometry.centerY - (y - VIEW_HEIGHT / 2 - pan.y) / (geometry.scale * zoom),
  });
  const clientToScreen = (clientX: number, clientY: number) => {
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return { x: 0, y: 0 };
    return { x: (clientX - rect.left) / rect.width * VIEW_WIDTH, y: (clientY - rect.top) / rect.height * VIEW_HEIGHT };
  };

  const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
  const dofMap = new Map<string, Partial<Record<"ux" | "uy" | "rz", number>>>();
  result.dofs.forEach((dof) => dofMap.set(dof.nodeId, { ...dofMap.get(dof.nodeId), [dof.component]: dof.index }));
  const unitScale = project.units.length === "m" ? 1 : project.units.length === "cm" ? 100 : 1000;
  const deformedPoint = (nodeId: string) => {
    const node = nodeMap.get(nodeId);
    const dofs = dofMap.get(nodeId);
    if (!node || !result.ok || dofs?.ux === undefined || dofs.uy === undefined) return node ? { x: node.x, y: node.y } : { x: 0, y: 0 };
    return { x: node.x + result.displacements[dofs.ux] * unitScale * deformationScale, y: node.y + result.displacements[dofs.uy] * unitScale * deformationScale };
  };

  const resetView = () => { setZoom(1); setPan({ x: 0, y: 0 }); };
  const handleBackgroundClick = (event: React.MouseEvent<SVGSVGElement>) => {
    if (!drawMode || (event.target as SVGElement).closest(".interactive-member")) return;
    const screen = clientToScreen(event.clientX, event.clientY);
    const raw = toModelFromScreen(screen.x, screen.y);
    const x = snap ? Math.round(raw.x / geometry.grid) * geometry.grid : raw.x;
    const y = snap ? Math.round(raw.y / geometry.grid) * geometry.grid : raw.y;
    onAddNode(clean(x), clean(y));
  };
  const handlePointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!dragRef.current) return;
    const rect = svgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const dx = (event.clientX - dragRef.current.clientX) / rect.width * VIEW_WIDTH;
    const dy = (event.clientY - dragRef.current.clientY) / rect.height * VIEW_HEIGHT;
    setPan({ x: dragRef.current.panX + dx, y: dragRef.current.panY + dy });
  };

  const visibleTopLeft = toModelFromScreen(0, 0);
  const visibleBottomRight = toModelFromScreen(VIEW_WIDTH, VIEW_HEIGHT);
  const gridLines: React.ReactNode[] = [];
  const minGridX = Math.floor(Math.min(visibleTopLeft.x, visibleBottomRight.x) / geometry.grid) * geometry.grid;
  const maxGridX = Math.max(visibleTopLeft.x, visibleBottomRight.x);
  const minGridY = Math.floor(Math.min(visibleTopLeft.y, visibleBottomRight.y) / geometry.grid) * geometry.grid;
  const maxGridY = Math.max(visibleTopLeft.y, visibleBottomRight.y);
  for (let x = minGridX, count = 0; x <= maxGridX + geometry.grid * 1e-8 && count < 80; x += geometry.grid, count += 1) {
    const screen = toScreen(x, 0);
    gridLines.push(<line key={`gx-${clean(x)}`} x1={screen.x} y1="0" x2={screen.x} y2={VIEW_HEIGHT} />);
  }
  for (let y = minGridY, count = 0; y <= maxGridY + geometry.grid * 1e-8 && count < 80; y += geometry.grid, count += 1) {
    const screen = toScreen(0, y);
    gridLines.push(<line key={`gy-${clean(y)}`} x1="0" y1={screen.y} x2={VIEW_WIDTH} y2={screen.y} />);
  }
  const origin = toScreen(0, 0);

  return <div className="structure-board">
    <div className="board-toolbar">
      <div className="tool-group">
        <button className={drawMode ? "active" : ""} onClick={() => setDrawMode(!drawMode)} title="Crear nodos haciendo clic"><Plus size={15} />Nodo</button>
        <button className={snap ? "active" : ""} onClick={() => setSnap(!snap)} title="Ajustar a cuadrícula"><Crosshair size={15} />SNAP</button>
        <button onClick={resetView} title="Ajustar y centrar la estructura"><Maximize2 size={15} />Centrar</button>
        <button onClick={resetView} title="Restablecer vista"><RotateCcw size={15} /></button>
      </div>
      <div className="tool-group layers">
        <button className={showGrid ? "active" : ""} onClick={() => setShowGrid(!showGrid)}><Grid2X2 size={14} />Malla</button>
        <button className={showNodes ? "active" : ""} onClick={() => setShowNodes(!showNodes)}>Nodos</button>
        <button className={showLabels ? "active" : ""} onClick={() => setShowLabels(!showLabels)}>Nombres</button>
        <button className={showElementLabels ? "active" : ""} onClick={() => setShowElementLabels(!showElementLabels)}>Barras</button>
        <button className={showDimensions ? "active" : ""} onClick={() => setShowDimensions(!showDimensions)}>L / α</button>
        <button className={showLoads ? "active" : ""} onClick={() => setShowLoads(!showLoads)}>Cargas</button>
        <button className={showSupports ? "active" : ""} onClick={() => setShowSupports(!showSupports)}>Apoyos</button>
        <button className={showLocal ? "active" : ""} onClick={() => setShowLocal(!showLocal)}>ejes x′/y′</button>
      </div>
    </div>
    <svg
      ref={svgRef}
      className={`structure-canvas${drawMode ? " draw-mode" : ""}`}
      viewBox={`0 0 ${VIEW_WIDTH} ${VIEW_HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      onClick={handleBackgroundClick}
      onWheel={(event) => { event.preventDefault(); setZoom((current) => Math.min(8, Math.max(0.45, current * (event.deltaY < 0 ? 1.12 : 0.89)))); }}
      onPointerDown={(event) => { if (drawMode || event.button !== 0 || (event.target as SVGElement).closest(".interactive-member")) return; dragRef.current = { clientX: event.clientX, clientY: event.clientY, panX: pan.x, panY: pan.y }; event.currentTarget.setPointerCapture(event.pointerId); }}
      onPointerMove={handlePointerMove}
      onPointerUp={(event) => { dragRef.current = null; if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId); }}
      onPointerCancel={() => { dragRef.current = null; }}
      aria-label="Plano cartesiano interactivo de la estructura"
    >
      <defs>
        <marker id={arrowId} markerUnits="userSpaceOnUse" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="10" markerHeight="10" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#d33322" /></marker>
        <marker id={localXId} markerUnits="userSpaceOnUse" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#1d5fbf" /></marker>
        <marker id={localYId} markerUnits="userSpaceOnUse" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="9" markerHeight="9" orient="auto"><path d="M0 0L10 5L0 10Z" fill="#d33322" /></marker>
      </defs>
      <rect width={VIEW_WIDTH} height={VIEW_HEIGHT} className="canvas-background" />
      {showGrid && <g className="blueprint-grid" strokeWidth="1">{gridLines}</g>}
      <g className="axis-lines" strokeWidth="1.4"><line x1="0" y1={origin.y} x2={VIEW_WIDTH} y2={origin.y} /><line x1={origin.x} y1="0" x2={origin.x} y2={VIEW_HEIGHT} /></g>

      {showDeformed && result.ok && <g className="deformed-elements">
        {project.elements.map((element) => {
          const pointI = deformedPoint(element.nodeI); const pointJ = deformedPoint(element.nodeJ); const i = toScreen(pointI.x, pointI.y); const j = toScreen(pointJ.x, pointJ.y);
          const state = result.elementResults.find((item) => item.elementId === element.id)?.state;
          const color = state === "tracción" ? "#1d5fbf" : state === "compresión" ? "#d33322" : "#65727e";
          return <line key={element.id} x1={i.x} y1={i.y} x2={j.x} y2={j.y} stroke={color} strokeWidth="3" strokeDasharray="8 5" strokeLinecap="round" />;
        })}
      </g>}

      <g className="original-elements">
        {project.elements.map((element, index) => {
          const ni = nodeMap.get(element.nodeI); const nj = nodeMap.get(element.nodeJ); if (!ni || !nj) return null;
          const i = toScreen(ni.x, ni.y); const j = toScreen(nj.x, nj.y); const dx = j.x - i.x; const dy = j.y - i.y; const lengthPx = Math.hypot(dx, dy); if (!lengthPx) return null;
          const ux = dx / lengthPx; const uy = dy / lengthPx; const mx = (i.x + j.x) / 2; const my = (i.y + j.y) / 2; const selected = selectedElement === element.id;
          const modelLength = Math.hypot(nj.x - ni.x, nj.y - ni.y); const angle = Math.atan2(nj.y - ni.y, nj.x - ni.x) * 180 / Math.PI;
          const axisLength = Math.max(28, Math.min(52, lengthPx * 0.24)); const yx = uy; const yy = -ux;
          return <g key={element.id} className="interactive-member" onClick={(event) => { event.stopPropagation(); onSelectElement(element.id); }}>
            {selected && <line className="selected-halo" x1={i.x} y1={i.y} x2={j.x} y2={j.y} />}
            <line x1={i.x} y1={i.y} x2={j.x} y2={j.y} stroke={MEMBER_COLORS[index % MEMBER_COLORS.length]} strokeWidth={selected ? 5 : 4} strokeLinecap="round" />
            <line className="hit-line" x1={i.x} y1={i.y} x2={j.x} y2={j.y} strokeWidth="18" />
            {showElementLabels && <text x={mx - uy * 12} y={my + ux * 12} textAnchor="middle" className="element-label">{element.label}</text>}
            {showDimensions && <text x={mx + uy * 17} y={my - ux * 17} textAnchor="middle" className="dimension-label">L={clean(modelLength)} {project.units.length} · α={clean(angle)}°</text>}
            {showLocal && <g className="local-axis"><line x1={mx} y1={my} x2={mx + ux * axisLength} y2={my + uy * axisLength} stroke="#1d5fbf" markerEnd={`url(#${localXId})`} /><line x1={mx} y1={my} x2={mx + yx * axisLength * 0.8} y2={my + yy * axisLength * 0.8} stroke="#d33322" markerEnd={`url(#${localYId})`} /><text x={mx + ux * axisLength + 7} y={my + uy * axisLength + 4} className="local-x-label">x′</text><text x={mx + yx * axisLength * 0.8 + 7} y={my + yy * axisLength * 0.8 + 4} className="local-y-label">y′</text></g>}
          </g>;
        })}
      </g>

      {showLoads && <g className="loads" strokeWidth="3.2">
        {project.nodes.flatMap((node) => {
          const items: React.ReactNode[] = []; const point = toScreen(node.x, node.y); const magnitude = Math.hypot(node.loads.fx, node.loads.fy);
          if (magnitude) {
            const arrowLength = 54; const dx = node.loads.fx / magnitude * arrowLength; const dy = -node.loads.fy / magnitude * arrowLength;
            items.push(<g key={`force-${node.id}`}><line x1={point.x - dx} y1={point.y - dy} x2={point.x} y2={point.y} markerEnd={`url(#${arrowId})`} /><text x={point.x - dx} y={point.y - dy - 9} textAnchor={dx > 0 ? "end" : "start"} className="load-label">F={clean(magnitude)} {project.units.force}</text></g>);
          }
          if (project.kind === "frame2d" && node.loads.mz) {
            const sweep = node.loads.mz > 0 ? 0 : 1;
            items.push(<g key={`moment-${node.id}`}><path d={`M ${point.x + 24} ${point.y} A 24 24 0 1 ${sweep} ${point.x} ${point.y - 24}`} fill="none" markerEnd={`url(#${arrowId})`} /><text x={point.x + 29} y={point.y - 28} className="load-label">M={clean(node.loads.mz)} {project.units.force}·{project.units.length}</text></g>);
          }
          return items;
        })}
      </g>}

      {showLoads && project.kind === "frame2d" && <g className="loads member-loads" strokeWidth="2.8">
        {project.elements.flatMap((element) => {
          const ni = nodeMap.get(element.nodeI); const nj = nodeMap.get(element.nodeJ); if (!ni || !nj) return [];
          const i = toScreen(ni.x, ni.y); const j = toScreen(nj.x, nj.y); const length = Math.hypot(j.x - i.x, j.y - i.y); if (!length) return [];
          const ux = (j.x - i.x) / length; const uy = (j.y - i.y) / length; const localY = { x: uy, y: -ux };
          return element.loads.flatMap((load) => {
            if (load.kind === "moment") {
              const position = Math.min(1, Math.max(0, load.position)); const px = i.x + (j.x - i.x) * position; const py = i.y + (j.y - i.y) * position; const sweep = load.value >= 0 ? 0 : 1;
              return [<path key={`${load.id}-arc`} fill="none" d={`M ${px + 22} ${py} A 22 22 0 1 ${sweep} ${px} ${py - 22}`} markerEnd={`url(#${arrowId})`} />, <text key={`${load.id}-label`} x={px + 27} y={py - 27} className="load-label">M={clean(load.value)} {project.units.force}·{project.units.length}</text>];
            }
            const positions = load.kind === "distributed-y" ? [0.12, 0.31, 0.5, 0.69, 0.88] : [Math.min(1, Math.max(0, load.position))];
            const representative = load.kind === "distributed-y" ? (load.start + load.end) / 2 : load.value; const direction = load.kind === "point-x" ? { x: ux, y: uy } : localY; const sign = representative >= 0 ? 1 : -1;
            const arrows = positions.map((position, arrowIndex) => { const px = i.x + (j.x - i.x) * position; const py = i.y + (j.y - i.y) * position; const dx = direction.x * sign * 38; const dy = direction.y * sign * 38; return <line key={`${load.id}-${arrowIndex}`} x1={px - dx} y1={py - dy} x2={px} y2={py} markerEnd={`url(#${arrowId})`} />; });
            const px = (i.x + j.x) / 2; const py = (i.y + j.y) / 2; const label = load.kind === "distributed-y" ? `q=${clean(representative)} ${project.units.force}/${project.units.length}` : `P=${clean(load.value)} ${project.units.force}`;
            return [...arrows, <text key={`${load.id}-label`} x={px + localY.x * 42} y={py + localY.y * 42 - 7} textAnchor="middle" className="load-label">{label}</text>];
          });
        })}
      </g>}

      {showSupports && <g className="supports">
        {project.nodes.map((node) => {
          const ux = node.constraints.ux.kind !== "free"; const uy = node.constraints.uy.kind !== "free"; const rz = project.kind === "frame2d" && node.constraints.rz.kind !== "free"; if (!ux && !uy && !rz) return null;
          const point = toScreen(node.x, node.y);
          if (rz) return <g key={node.id}><rect x={point.x - 12} y={point.y + 7} width="24" height="9" rx="1" /><line x1={point.x - 18} y1={point.y + 21} x2={point.x + 18} y2={point.y + 21} /><g className="support-hatch">{[-12, -4, 4, 12].map((offset) => <line key={offset} x1={point.x + offset - 5} y1={point.y + 28} x2={point.x + offset + 2} y2={point.y + 21} />)}</g></g>;
          if (uy && !ux) return <g key={node.id}><path d={`M ${point.x} ${point.y + 3} L ${point.x - 11} ${point.y + 18} L ${point.x + 11} ${point.y + 18} Z`} /><circle cx={point.x - 6} cy={point.y + 23} r="3" /><circle cx={point.x + 6} cy={point.y + 23} r="3" /></g>;
          if (ux && !uy) return <g key={node.id}><path d={`M ${point.x - 3} ${point.y} L ${point.x - 18} ${point.y - 11} L ${point.x - 18} ${point.y + 11} Z`} /><circle cx={point.x - 23} cy={point.y - 6} r="3" /><circle cx={point.x - 23} cy={point.y + 6} r="3" /></g>;
          return <g key={node.id}><path d={`M ${point.x} ${point.y + 3} L ${point.x - 12} ${point.y + 20} L ${point.x + 12} ${point.y + 20} Z`} /><line x1={point.x - 17} y1={point.y + 24} x2={point.x + 17} y2={point.y + 24} /></g>;
        })}
      </g>}

      {showNodes && <g className="nodes">
        {project.nodes.map((node) => { const point = toScreen(node.x, node.y); return <g key={node.id}><circle cx={point.x} cy={point.y} r="5" />{showLabels && <text x={point.x + 10} y={point.y - 11} className="node-label">{node.label}{showDimensions && <tspan x={point.x + 10} dy="14" className="node-coord">({clean(node.x)}, {clean(node.y)})</tspan>}</text>}</g>; })}
      </g>}
      {!project.nodes.length && <g className="canvas-empty"><text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2 - 8} textAnchor="middle">Agrega el primer nodo para comenzar</text><text x={VIEW_WIDTH / 2} y={VIEW_HEIGHT / 2 + 16} textAnchor="middle">Activa “Nodo” y haz clic en el plano.</text></g>}
    </svg>
    <div className="board-status"><span><MousePointer2 size={13} />{drawMode ? "Clic para crear nodo" : "Arrastra para mover"}</span><span><Move size={13} />Zoom {Math.round(zoom * 100)}%</span><span><LocateFixed size={13} />Malla {clean(geometry.grid)} {project.units.length}</span></div>
    <div className="deformation-control"><label><input type="checkbox" checked={showDeformed} onChange={(event) => setShowDeformed(event.target.checked)} />Deformada</label><input aria-label="Escala de deformación" type="range" min="1" max="1000" step="1" value={deformationScale} onChange={(event) => setDeformationScale(Number(event.target.value))} /><strong>×{deformationScale}</strong></div>
  </div>;
}
