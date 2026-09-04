"use client";

import { CheckCircle2, Download, FileArchive, FileBarChart2, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateMix } from "../../../mix-design/calculations";
import type { MixProject, ProjectMeta } from "../../../mix-design/types";
import { format, SectionTitle, TextInput } from "./section-ui";

type ExportKey = "report" | "excel" | "json" | "dosificacion" | "agregados" | "probetas" | "metodos";

export default function ReportsSection({
  project,
  setProject,
}: {
  project: MixProject;
  setProject: React.Dispatch<React.SetStateAction<MixProject>>;
}) {
  const [downloading, setDownloading] = useState<ExportKey | null>(null);
  const results = useMemo(() => calculateMix(project.mix), [project.mix]);
  const updateMeta = (key: keyof ProjectMeta, value: string) =>
    setProject((state) => ({ ...state, meta: { ...state.meta, [key]: value } }));
  const run = async (key: ExportKey, action: () => Promise<void> | void) => {
    setDownloading(key);
    try {
      await action();
    } finally {
      window.setTimeout(() => setDownloading(null), 450);
    }
  };

  return (
    <div className="workspace-page">
      <SectionTitle
        eyebrow="Entregables del proyecto"
        title="Informes, fichas y datos"
        description="Completa la carátula una sola vez y genera documentos consistentes con los cálculos visibles."
      />

      <div className="reports-hero">
        <div>
          <span>INFORME TÉCNICO COMPLETO</span>
          <h2>{project.meta.name}</h2>
          <p>Memoria ACI, comparación Walker–Bolomey, módulo de finura, optimización Fuller, dosificaciones, ajuste, agregados, probetas y fuentes.</p>
          <div><span>7 páginas</span><span>4 métodos</span><span>Listo para imprimir</span></div>
        </div>
        <div className="report-preview-page" aria-hidden="true">
          <span>MEZCLALAB</span><i /><strong>INFORME<br />TÉCNICO</strong><small>{project.meta.name}</small>
        </div>
        <button className="button button-primary" disabled={downloading != null} onClick={() => run("report", async () => (await import("../../../mix-design/exporters")).downloadFullReport(project))}>
          {downloading === "report" ? <Loader2 className="spin" size={18} /> : <Download size={18} />} Descargar informe PDF
        </button>
      </div>

      <div className="module-grid split-wide reports-layout">
        <div className="module-stack">
          <section className="module-panel">
            <div className="module-heading"><span><FileText size={18} /></span><div><h2>Datos de carátula</h2><p>Estos campos aparecen en el informe y en las fichas técnicas.</p></div></div>
            <div className="input-grid two meta-form">
              <TextInput label="Nombre del proyecto" value={project.meta.name} onChange={(value) => updateMeta("name", value)} />
              <TextInput label="Cliente / laboratorio" value={project.meta.client} onChange={(value) => updateMeta("client", value)} />
              <TextInput label="Ubicación" value={project.meta.location} onChange={(value) => updateMeta("location", value)} />
              <TextInput label="Elemento estructural" value={project.meta.element} onChange={(value) => updateMeta("element", value)} />
              <TextInput label="Cemento" value={project.meta.cement} onChange={(value) => updateMeta("cement", value)} />
              <TextInput label="Agregado fino / cantera" value={project.meta.fineSource} onChange={(value) => updateMeta("fineSource", value)} />
              <TextInput label="Agregado grueso / cantera" value={project.meta.coarseSource} onChange={(value) => updateMeta("coarseSource", value)} />
              <TextInput label="Responsable técnico" value={project.meta.technician} onChange={(value) => updateMeta("technician", value)} />
              <TextInput label="Fecha" type="date" value={project.meta.date} onChange={(value) => updateMeta("date", value)} />
            </div>
            <label className="field-label notes-field"><span>Observaciones y alcance</span><textarea value={project.notes} onChange={(event) => setProject((state) => ({ ...state, notes: event.target.value }))} /></label>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><FileBarChart2 size={18} /></span><div><h2>Fichas técnicas individuales</h2><p>Una hoja A4 por tema para entregar o archivar por separado.</p></div></div>
            <div className="download-card-grid">
              <DownloadCard title="Dosificación" detail={`${format(results.cement)} kg de cemento por m³`} icon={<FileText size={21} />} busy={downloading === "dosificacion"} onClick={() => run("dosificacion", async () => (await import("../../../mix-design/exporters")).downloadTechnicalSheet(project, "dosificacion"))} />
              <DownloadCard title="Agregados" detail="Caracterización y controles de calidad" icon={<FileBarChart2 size={21} />} busy={downloading === "agregados"} onClick={() => run("agregados", async () => (await import("../../../mix-design/exporters")).downloadTechnicalSheet(project, "agregados"))} />
              <DownloadCard title="Comparación" detail="ACI, Walker, Bolomey y Fuller" icon={<FileBarChart2 size={21} />} busy={downloading === "metodos"} onClick={() => run("metodos", async () => (await import("../../../mix-design/exporters")).downloadTechnicalSheet(project, "metodos"))} />
              <DownloadCard title="Probetas" detail="Cargas, esfuerzos y observaciones" icon={<FileArchive size={21} />} busy={downloading === "probetas"} onClick={() => run("probetas", async () => (await import("../../../mix-design/exporters")).downloadTechnicalSheet(project, "probetas"))} />
            </div>
          </section>
        </div>

        <aside className="module-stack">
          <section className="module-panel export-panel excel-panel">
            <span className="export-icon"><FileSpreadsheet size={24} /></span>
            <div><span>LIBRO DE DATOS</span><h2>Excel · 11 hojas</h2><p>Incluye memoria ACI, comparación de métodos, optimización Fuller, granulometrías, ensayos y fuentes.</p></div>
            <ul><li><CheckCircle2 size={15} /> Valores completos, no solo un resumen</li><li><CheckCircle2 size={15} /> Columnas organizadas por ensayo</li><li><CheckCircle2 size={15} /> Compatible con Excel y LibreOffice</li></ul>
            <button className="button button-primary full-button" disabled={downloading != null} onClick={() => run("excel", async () => (await import("../../../mix-design/exporters")).downloadExcel(project))}>{downloading === "excel" ? <Loader2 className="spin" size={17} /> : <Download size={17} />} Descargar Excel</button>
          </section>

          <section className="module-panel export-panel">
            <span className="export-icon neutral"><FileArchive size={22} /></span>
            <div><span>RESPALDO PORTABLE</span><h2>Archivo de proyecto</h2><p>Exporta todos los datos en JSON para conservar una copia auditable.</p></div>
            <button className="button button-ghost full-button" disabled={downloading != null} onClick={() => run("json", async () => (await import("../../../mix-design/exporters")).downloadProjectJson(project))}>{downloading === "json" ? <Loader2 className="spin" size={17} /> : <Download size={17} />} Descargar datos JSON</button>
          </section>

          <div className="warning-banner report-warning"><FileText size={19} /><span><strong>Alcance profesional</strong>Los documentos son apoyo técnico. Verifique materiales, normativa aplicable y mezclas de prueba antes de especificar o producir.</span></div>
        </aside>
      </div>
    </div>
  );
}

function DownloadCard({
  title,
  detail,
  icon,
  busy,
  onClick,
}: {
  title: string;
  detail: string;
  icon: React.ReactNode;
  busy: boolean;
  onClick: () => void;
}) {
  return (
    <button className="download-card" onClick={onClick}>
      <span>{busy ? <Loader2 className="spin" size={21} /> : icon}</span>
      <span><strong>{title}</strong><small>{detail}</small></span>
      <Download size={17} />
    </button>
  );
}
