"use client";

import { Download, FileImage, Gauge, Images } from "lucide-react";
import { useState } from "react";
import type { AnalysisResult, StructuralProject } from "../lib/types";
import StructureFigure, { type StructureFigureMode } from "./structure-figure";

type Props = { project: StructuralProject; result: AnalysisResult };

const figures: Array<{ mode: StructureFigureMode; title: string; eyebrow: string; description: string }> = [
  { mode: "supports", title: "Apoyos y geometría", eyebrow: "FIGURA 01", description: "Vínculos reales del modelo: fijo, rodillo o empotramiento, con nodos y barras numerados." },
  { mode: "forces", title: "Cargas y reacciones", eyebrow: "FIGURA 02", description: "Vectores aplicados en rojo y reacciones calculadas en naranja, con magnitud y unidades." },
  { mode: "local", title: "Ejes locales por barra", eyebrow: "FIGURA 03", description: "Direcciones x′ e y′ generadas desde los cosenos directores de cada elemento." },
  { mode: "deformed", title: "Deformada y esfuerzo axial", eyebrow: "FIGURA 04", description: "Original discontinua; deformada azul en tracción y roja en compresión." },
];

const safeFileName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9_-]+/g, "-").replace(/^-|-$/g, "").toLowerCase();

const svgMarkup = (svg: SVGSVGElement) => {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", "1760");
  clone.setAttribute("height", "1140");
  return `<?xml version="1.0" encoding="UTF-8"?>\n${new XMLSerializer().serializeToString(clone)}`;
};

const triggerDownload = (url: string, name: string) => {
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = name;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

export default function GraphicsGallery({ project, result }: Props) {
  const [deformationScale, setDeformationScale] = useState(500);
  const prefix = safeFileName(project.metadata.name) || "estructura";
  const idFor = (mode: StructureFigureMode) => `calculated-figure-${mode}`;
  const downloadSvg = (mode: StructureFigureMode) => {
    const svg = document.getElementById(idFor(mode)) as SVGSVGElement | null;
    if (!svg) return;
    const url = URL.createObjectURL(new Blob([svgMarkup(svg)], { type: "image/svg+xml;charset=utf-8" }));
    triggerDownload(url, `${prefix}-${mode}.svg`);
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  const downloadPng = (mode: StructureFigureMode) => {
    const svg = document.getElementById(idFor(mode)) as SVGSVGElement | null;
    if (!svg) return;
    const sourceUrl = URL.createObjectURL(new Blob([svgMarkup(svg)], { type: "image/svg+xml;charset=utf-8" }));
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = 1760;
      canvas.height = 1140;
      const context = canvas.getContext("2d");
      if (!context) { URL.revokeObjectURL(sourceUrl); return; }
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      context.drawImage(image, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => {
        if (blob) { const url = URL.createObjectURL(blob); triggerDownload(url, `${prefix}-${mode}.png`); window.setTimeout(() => URL.revokeObjectURL(url), 1000); }
        URL.revokeObjectURL(sourceUrl);
      }, "image/png");
    };
    image.src = sourceUrl;
  };

  return <div className="graphics-workspace">
    <div className="graphics-summary">
      <div className="graphics-summary-icon"><Images size={28} /></div>
      <div><span className="panel-kicker">GRÁFICOS RECALCULADOS</span><h2>Cuatro figuras, un solo modelo</h2><p>Cada figura se regenera cuando cambias coordenadas, apoyos, cargas, A, E o I. No son imágenes pegadas.</p></div>
      <label className="scale-control"><span><Gauge size={15} />Escala de deformación</span><input aria-label="Escala de las figuras deformadas" type="range" min="1" max="1000" step="1" value={deformationScale} onChange={(event) => setDeformationScale(Number(event.target.value))} /><strong>×{deformationScale}</strong></label>
    </div>

    <div className="graphics-grid">
      {figures.map((figure) => <article key={figure.mode} className="graphic-card" data-figure={figure.mode}>
        <header><div><span>{figure.eyebrow}</span><h2>{figure.title}</h2><p>{figure.description}</p></div><div className="graphic-actions"><button title="Descargar figura en SVG" onClick={() => downloadSvg(figure.mode)}><Download size={15} />SVG</button><button title="Descargar figura en PNG" onClick={() => downloadPng(figure.mode)}><FileImage size={15} />PNG</button></div></header>
        <div className="graphic-frame"><StructureFigure svgId={idFor(figure.mode)} project={project} result={result} mode={figure.mode} deformationScale={deformationScale} /></div>
      </article>)}
    </div>
  </div>;
}
