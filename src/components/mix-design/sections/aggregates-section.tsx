"use client";

import { AlertTriangle, BarChart3, CheckCircle2, Droplets, Mountain, Ruler, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateAggregateSummary, classifyFinenessModulus, finesPercent, moisturePercent } from "../../../mix-design/lab-calculations";
import type { AggregateLabData, MixProject } from "../../../mix-design/types";
import { format, Metric, NumberInput, SectionTitle, Segmented } from "./section-ui";

type LabTab = "granulometria" | "humedad" | "propiedades";
type AggregateKind = "fine" | "coarse";

export default function AggregatesSection({
  project,
  setProject,
}: {
  project: MixProject;
  setProject: React.Dispatch<React.SetStateAction<MixProject>>;
}) {
  const [tab, setTab] = useState<LabTab>("granulometria");
  const [kind, setKind] = useState<AggregateKind>("fine");
  const summary = useMemo(() => calculateAggregateSummary(project.aggregateLab), [project.aggregateLab]);
  const current = kind === "fine" ? summary.fineGradation : summary.coarseGradation;

  const updateLab = <K extends keyof AggregateLabData>(key: K, value: AggregateLabData[K]) =>
    setProject((state) => ({ ...state, aggregateLab: { ...state.aggregateLab, [key]: value } }));

  const updateSieve = (index: number, value: number) => {
    const key = kind === "fine" ? "fineSieve" : "coarseSieve";
    const rows = project.aggregateLab[key].map((row, rowIndex) =>
      rowIndex === index ? { ...row, retainedG: value } : row,
    );
    updateLab(key, rows);
  };

  return (
    <div className="workspace-page">
      <SectionTitle
        eyebrow="Caracterización de materiales"
        title="Fichas técnicas de agregados"
        description="Registra tamizado, humedad, finos, pesos unitarios, gravedad específica, absorción y abrasión."
        action={<span className="verified-pill"><CheckCircle2 size={14} /> Datos de ejemplo cargados</span>}
      />

      <div className="metric-grid four-metrics">
        <Metric label="Módulo de finura A.F." value={format(summary.fineGradation.finenessModulus)} tone={summary.fineGradation.finenessComplete ? "blue" : "orange"} />
        <Metric label="Humedad A.F." value={format(summary.fineMoisture.average)} unit="%" />
        <Metric label="Finos por lavado" value={format(summary.fines.average)} unit="%" tone={summary.fines.average <= 5 ? "green" : "orange"} />
        <Metric label="Abrasión L.A." value={format(summary.abrasion)} unit="%" tone={summary.abrasion <= 50 ? "green" : "orange"} />
      </div>

      <Segmented value={tab} onChange={setTab} items={[
        { value: "granulometria", label: "Granulometría" },
        { value: "humedad", label: "Humedad y finos" },
        { value: "propiedades", label: "Propiedades físicas" },
      ]} />

      {tab === "granulometria" && (
        <div className="module-grid split-wide">
          <section className="module-panel">
            <div className="module-heading between"><span><Ruler size={18} /></span><div><h2>Análisis por tamizado</h2><p>El porcentaje pasante se calcula sobre la masa total registrada.</p></div><Segmented value={kind} onChange={setKind} items={[{ value: "fine", label: "A. fino" }, { value: "coarse", label: "A. grueso" }]} /></div>
            <div className="data-table-wrap">
              <table className="data-table sieve-table">
                <thead><tr><th>Malla</th><th>Abertura</th><th>Retenido</th><th>% retenido</th><th>% acum.</th><th>% pasante</th></tr></thead>
                <tbody>
                  {current.analysis.map((row, index) => (
                    <tr key={row.sieve}>
                      <th>{row.sieve}</th>
                      <td>{row.openingMm == null ? "—" : `${format(row.openingMm, 3)} mm`}</td>
                      <td><input aria-label={`Retenido ${row.sieve}`} type="number" step="0.01" value={row.retainedG} onChange={(event) => updateSieve(index, Number(event.target.value))} /></td>
                      <td>{format(row.retainedPercent)}</td>
                      <td>{format(row.cumulativePercent)}</td>
                      <td><strong>{format(row.passingPercent)}</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="table-summary"><span>Masa total <strong>{format(current.total)} g</strong></span>{kind === "fine" && <span>Módulo de finura <strong>{format(current.finenessModulus)}</strong></span>}<span>Cierre <strong>{format(100 - current.errorPercent)}%</strong></span></div>
            {kind === "fine" && (
              <div className="fineness-calculator">
                <div className="fineness-title"><span>MF</span><div><strong>Cálculo auditable</strong><small>Serie N° 4, 8, 16, 30, 50 y 100</small></div><em>{classifyFinenessModulus(current.finenessModulus, current.finenessComplete)}</em></div>
                <div className="fineness-terms">
                  {current.finenessRows.map((row) => <span key={row.sieve}><small>{row.sieve}</small><strong>{format(row.cumulativePercent)}</strong></span>)}
                </div>
                <div className="fineness-equation"><code>MF = Σ % retenido acumulado / 100</code><strong>{format(current.finenessRows.reduce((sum, row) => sum + row.cumulativePercent, 0), 2)} / 100 = {format(current.finenessModulus, 2)}</strong></div>
                {!current.finenessComplete && <p><AlertTriangle size={15} /> La serie está incompleta; el valor parcial no debe usarse en Walker.</p>}
              </div>
            )}
          </section>

          <section className="module-panel gradation-panel">
            <div className="module-heading"><span><BarChart3 size={18} /></span><div><h2>Curva granulométrica</h2><p>Porcentaje pasante por abertura de malla.</p></div></div>
            <GradationChart rows={current.analysis.filter((row) => row.openingMm != null)} />
            <div className="quality-card">
              <span className={current.errorPercent < 0.1 ? "quality-ok" : "quality-review"}>{current.errorPercent < 0.1 ? <CheckCircle2 size={17} /> : <AlertTriangle size={17} />}</span>
              <div><strong>{current.errorPercent < 0.1 ? "Balance de masa completo" : "Revisar balance de masa"}</strong><small>Error de cierre: {format(current.errorPercent, 3)}%</small></div>
            </div>
            <p className="module-note">La evaluación frente a una banda granulométrica depende del tamaño nominal y la especificación del proyecto. ASTM C33/C33M debe consultarse en su edición aplicable.</p>
          </section>
        </div>
      )}

      {tab === "humedad" && (
        <div className="module-stack">
          <section className="module-panel">
            <div className="module-heading"><span><Droplets size={18} /></span><div><h2>Contenido de humedad</h2><p>Método gravimétrico: masa de agua sobre masa seca del agregado.</p></div></div>
            <div className="lab-two-columns">
              <MoistureTable title="Agregado fino" rows={project.aggregateLab.fineMoistureSamples} onChange={(rows) => updateLab("fineMoistureSamples", rows)} />
              <MoistureTable title="Agregado grueso" rows={project.aggregateLab.coarseMoistureSamples} onChange={(rows) => updateLab("coarseMoistureSamples", rows)} />
            </div>
            <div className="formula-callout"><span>Humedad = (masa húmeda − masa seca) / masa seca × 100</span><strong>A.F. {format(summary.fineMoisture.average)}% · A.G. {format(summary.coarseMoisture.average)}%</strong></div>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><Mountain size={18} /></span><div><h2>Material fino por lavado</h2><p>Diferencia de masa seca antes y después del lavado.</p></div></div>
            <div className="data-table-wrap">
              <table className="data-table compact-lab-table">
                <thead><tr><th>Muestra</th><th>Masa inicial seca</th><th>Masa lavada seca</th><th>Material fino</th></tr></thead>
                <tbody>
                  {project.aggregateLab.finesSamples.map((sample, index) => (
                    <tr key={index}>
                      <th>M-{index + 1}</th>
                      <td><input type="number" aria-label={`Masa inicial ${index + 1}`} value={sample.initialDry} onChange={(event) => updateLab("finesSamples", project.aggregateLab.finesSamples.map((item, itemIndex) => itemIndex === index ? { ...item, initialDry: Number(event.target.value) } : item))} /></td>
                      <td><input type="number" aria-label={`Masa lavada ${index + 1}`} value={sample.washedDry} onChange={(event) => updateLab("finesSamples", project.aggregateLab.finesSamples.map((item, itemIndex) => itemIndex === index ? { ...item, washedDry: Number(event.target.value) } : item))} /></td>
                      <td><strong>{format(finesPercent(sample))}%</strong></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className={`criterion-strip ${summary.fines.average <= 5 ? "pass" : "review"}`}><span>{summary.fines.average <= 5 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span><div><strong>Promedio: {format(summary.fines.average)}%</strong><small>Criterio de 5% máx. tomado del formato suministrado; confirme la categoría del agregado y la especificación contractual.</small></div></div>
          </section>
        </div>
      )}

      {tab === "propiedades" && (
        <div className="module-grid equal">
          <section className="module-panel">
            <div className="module-heading"><span><Scale size={18} /></span><div><h2>Agregado fino</h2><p>Datos para el cálculo de volúmenes, correcciones y vacíos.</p></div></div>
            <div className="input-grid two">
              <NumberInput label="Gravedad específica bulk" value={project.aggregateLab.fineSpecificGravity} step={0.01} onChange={(value) => updateLab("fineSpecificGravity", value)} />
              <NumberInput label="Gravedad específica SSD" value={project.aggregateLab.fineBulkSsd} step={0.01} onChange={(value) => updateLab("fineBulkSsd", value)} />
              <NumberInput label="Gravedad específica aparente" value={project.aggregateLab.fineApparent} step={0.01} onChange={(value) => updateLab("fineApparent", value)} />
              <NumberInput label="Absorción" value={project.aggregateLab.fineAbsorption} unit="%" step={0.1} onChange={(value) => updateLab("fineAbsorption", value)} />
              <NumberInput label="P.U. suelto" value={project.aggregateLab.fineUnitWeightLoose} unit="kg/m³" step={0.1} onChange={(value) => updateLab("fineUnitWeightLoose", value)} />
              <NumberInput label="P.U. compactado" value={project.aggregateLab.fineUnitWeightCompacted} unit="kg/m³" step={0.1} onChange={(value) => updateLab("fineUnitWeightCompacted", value)} />
            </div>
            <dl className="result-ledger columns"><div><dt>Vacíos suelto</dt><dd>{format(summary.fineVoidsLoose)}%</dd></div><div><dt>Vacíos compactado</dt><dd>{format(summary.fineVoidsCompacted)}%</dd></div></dl>
          </section>
          <section className="module-panel">
            <div className="module-heading"><span><Mountain size={18} /></span><div><h2>Agregado grueso</h2><p>Propiedades físicas y control de resistencia a la abrasión.</p></div></div>
            <div className="input-grid two">
              <NumberInput label="Gravedad específica bulk" value={project.aggregateLab.coarseSpecificGravity} step={0.01} onChange={(value) => updateLab("coarseSpecificGravity", value)} />
              <NumberInput label="Gravedad específica SSD" value={project.aggregateLab.coarseBulkSsd} step={0.01} onChange={(value) => updateLab("coarseBulkSsd", value)} />
              <NumberInput label="Gravedad específica aparente" value={project.aggregateLab.coarseApparent} step={0.01} onChange={(value) => updateLab("coarseApparent", value)} />
              <NumberInput label="Absorción" value={project.aggregateLab.coarseAbsorption} unit="%" step={0.1} onChange={(value) => updateLab("coarseAbsorption", value)} />
              <NumberInput label="P.U. suelto" value={project.aggregateLab.coarseUnitWeightLoose} unit="kg/m³" step={0.1} onChange={(value) => updateLab("coarseUnitWeightLoose", value)} />
              <NumberInput label="P.U. compactado" value={project.aggregateLab.coarseUnitWeightCompacted} unit="kg/m³" step={0.1} onChange={(value) => updateLab("coarseUnitWeightCompacted", value)} />
              <NumberInput label="Masa inicial abrasión" value={project.aggregateLab.abrasionInitial} unit="g" onChange={(value) => updateLab("abrasionInitial", value)} />
              <NumberInput label="Masa retenida final" value={project.aggregateLab.abrasionRetained} unit="g" onChange={(value) => updateLab("abrasionRetained", value)} />
            </div>
            <dl className="result-ledger columns"><div><dt>Vacíos compactado</dt><dd>{format(summary.coarseVoidsCompacted)}%</dd></div><div><dt>Abrasión Los Ángeles</dt><dd>{format(summary.abrasion)}%</dd></div></dl>
          </section>
        </div>
      )}
    </div>
  );
}

function MoistureTable({
  title,
  rows,
  onChange,
}: {
  title: string;
  rows: AggregateLabData["fineMoistureSamples"];
  onChange: (rows: AggregateLabData["fineMoistureSamples"]) => void;
}) {
  return (
    <div>
      <h3 className="lab-subtitle">{title}</h3>
      <div className="data-table-wrap">
        <table className="data-table compact-lab-table">
          <thead><tr><th>M</th><th>Húm. + rec.</th><th>Seca + rec.</th><th>Rec.</th><th>Humedad</th></tr></thead>
          <tbody>{rows.map((sample, index) => (
            <tr key={index}>
              <th>{index + 1}</th>
              {(["wetWithContainer", "dryWithContainer", "container"] as const).map((key) => (
                <td key={key}><input type="number" step="0.001" aria-label={`${title} ${key} ${index + 1}`} value={sample[key]} onChange={(event) => onChange(rows.map((item, itemIndex) => itemIndex === index ? { ...item, [key]: Number(event.target.value) } : item))} /></td>
              ))}
              <td><strong>{format(moisturePercent(sample))}%</strong></td>
            </tr>
          ))}</tbody>
        </table>
      </div>
    </div>
  );
}

function GradationChart({ rows }: { rows: ReturnType<typeof calculateAggregateSummary>["fineGradation"]["analysis"] }) {
  if (!rows.length) return null;
  const sorted = [...rows].sort((a, b) => (b.openingMm ?? 0) - (a.openingMm ?? 0));
  const width = 540;
  const height = 260;
  const pad = 38;
  const points = sorted.map((row, index) => ({
    x: pad + (index / Math.max(1, sorted.length - 1)) * (width - pad * 2),
    y: pad + ((100 - row.passingPercent) / 100) * (height - pad * 2),
    ...row,
  }));
  const polyline = points.map((point) => `${point.x},${point.y}`).join(" ");

  return (
    <div className="gradation-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Curva granulométrica">
        {[0, 25, 50, 75, 100].map((value) => {
          const y = pad + ((100 - value) / 100) * (height - pad * 2);
          return <g key={value}><line x1={pad} x2={width - pad} y1={y} y2={y} /><text x={pad - 8} y={y + 4} textAnchor="end">{value}</text></g>;
        })}
        <polyline points={polyline} />
        {points.map((point) => <circle key={point.sieve} cx={point.x} cy={point.y} r="4" />)}
        {points.map((point) => <text className="x-label" key={`${point.sieve}-label`} x={point.x} y={height - 10} textAnchor="middle">{point.sieve.replace("N° ", "#")}</text>)}
      </svg>
      <span>% PASANTE</span>
    </div>
  );
}
