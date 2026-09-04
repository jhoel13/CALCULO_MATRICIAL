"use client";

import {
  AlertTriangle,
  BarChart3,
  CheckCircle2,
  Info,
  Layers3,
  SlidersHorizontal,
  TableProperties,
} from "lucide-react";
import { useMemo, useState } from "react";
import {
  calculateMethodComparison,
  methodTables,
} from "../../../mix-design/method-calculations";
import type {
  FullerCurvePoint,
  MethodComparisonInputs,
  MixProject,
  ProportioningMethodResult,
} from "../../../mix-design/types";
import {
  format,
  Metric,
  NumberInput,
  SectionTitle,
  Segmented,
} from "./section-ui";

type MethodTab = "dosificacion" | "fuller" | "tablas";

const methodColors: Record<ProportioningMethodResult["id"], string> = {
  aci: "#25384d",
  walker: "#58a5c8",
  bolomey: "#e8662d",
};

export default function MethodsSection({
  project,
  setProject,
}: {
  project: MixProject;
  setProject: React.Dispatch<React.SetStateAction<MixProject>>;
}) {
  const [tab, setTab] = useState<MethodTab>("dosificacion");
  const comparison = useMemo(() => calculateMethodComparison(project), [project]);
  const updateMethods = <K extends keyof MethodComparisonInputs>(
    key: K,
    value: MethodComparisonInputs[K],
  ) =>
    setProject((state) => ({
      ...state,
      methods: { ...state.methods, [key]: value },
    }));
  const warnings = comparison.methods.flatMap((method) => method.warnings);

  return (
    <div className="workspace-page methods-page">
      <SectionTitle
        eyebrow="Verificación cruzada"
        title="Comparador de métodos"
        description="Contrasta ACI, Walker y Bolomey con una base común; después optimiza la combinación de agregados con Fuller."
        action={
          <span className="verified-pill">
            <CheckCircle2 size={14} /> Cálculo trazable
          </span>
        }
      />

      <div className="metric-grid four-metrics">
        <Metric
          label="Módulo de finura A.F."
          value={format(comparison.finenessModulus, 2)}
          tone={comparison.finenessComplete ? "blue" : "orange"}
        />
        <Metric
          label="Lectura del M.F."
          value={comparison.finenessClassification}
        />
        <Metric
          label="Arena óptima Fuller"
          value={format(comparison.fuller.optimizedFinePercent, 1)}
          unit="% del agregado"
          tone="green"
        />
        <Metric
          label="Error curva seleccionada"
          value={format(comparison.fuller.selectedRmse, 2)}
          unit="RMSE · puntos %"
          tone={comparison.fuller.selectedRmse <= 5 ? "green" : "orange"}
        />
      </div>

      <Segmented
        value={tab}
        onChange={setTab}
        items={[
          { value: "dosificacion", label: "ACI · Walker · Bolomey" },
          { value: "fuller", label: "Fuller / gráfico" },
          { value: "tablas", label: "Tablas y criterios" },
        ]}
      />

      {tab === "dosificacion" && (
        <div className="module-stack">
          <div className="module-grid methods-config-grid">
            <section className="module-panel">
              <div className="module-heading">
                <span><SlidersHorizontal size={18} /></span>
                <div>
                  <h2>Entradas comunes</h2>
                  <p>Los tres métodos usan el mismo f&apos;cr, materiales, aire y humedades.</p>
                </div>
              </div>
              <div className="input-grid two">
                <label className="field-label">
                  <span>Tamaño máximo nominal</span>
                  <select
                    className="text-input"
                    value={project.methods.nominalMaximumMm}
                    onChange={(event) =>
                      updateMethods("nominalMaximumMm", Number(event.target.value))
                    }
                  >
                    {methodTables.nominalSizes.map((size) => (
                      <option key={size} value={size}>{sizeLabel(size)} · {format(size, size < 10 ? 3 : 2)} mm</option>
                    ))}
                  </select>
                </label>
                <NumberInput
                  label="Arena en Bolomey"
                  value={project.methods.bolomeyFinePercent}
                  unit="% agregado"
                  step={1}
                  onChange={(value) => updateMethods("bolomeyFinePercent", value)}
                />
              </div>
              <dl className="result-ledger columns methods-input-ledger">
                <div><dt>f&apos;cr común</dt><dd>{format(project.mix.fc + project.mix.strengthMargin, 0)} kgf/cm²</dd></div>
                <div><dt>Slump común</dt><dd>{format(project.mix.slump / 2.54, 2)} in</dd></div>
                <div><dt>P.U.C. A.G. común</dt><dd>{format(project.mix.coarseUnitWeight)} kg/m³</dd></div>
                <div><dt>Límite a/c</dt><dd>{format(project.mix.durabilityWcLimit, 3)}</dd></div>
              </dl>
            </section>

            <section className="module-panel methods-reading-card">
              <div className="module-heading">
                <span><Info size={18} /></span>
                <div><h2>Cómo leer la comparación</h2><p>Resultado inicial, no veredicto automático.</p></div>
              </div>
              <ol>
                <li><span>01</span><p><strong>Compare cemento y a/c.</strong> La diferencia nace de la tabla o interpolación de resistencia.</p></li>
                <li><span>02</span><p><strong>Revise la fracción de agregados.</strong> Walker responde al MF y al TMN; Bolomey usa el reparto indicado.</p></li>
                <li><span>03</span><p><strong>Valide en laboratorio.</strong> Trabajabilidad, rendimiento y resistencia deciden el ajuste final.</p></li>
              </ol>
            </section>
          </div>

          {warnings.length > 0 && (
            <div className="warning-banner">
              <AlertTriangle size={19} />
              <span><strong>Interpolación controlada</strong>{Array.from(new Set(warnings)).join(" ")}</span>
            </div>
          )}

          <section className="module-panel">
            <div className="module-heading">
              <span><TableProperties size={18} /></span>
              <div><h2>Dosificación comparada</h2><p>Masas por 1 m³; agua y agregados finales ya están corregidos por humedad.</p></div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table method-comparison-table">
                <thead>
                  <tr>
                    <th>Método</th><th>Agua diseño</th><th>a/c método</th><th>a/c adoptada</th>
                    <th>Cemento</th><th>A.F. seco</th><th>A.G. seco</th><th>Agua a añadir</th><th>Total húmedo</th>
                  </tr>
                </thead>
                <tbody>
                  {comparison.methods.map((method) => (
                    <tr key={method.id}>
                      <th scope="row"><span className="method-dot" style={{ background: methodColors[method.id] }} />{method.shortName}</th>
                      <td>{format(method.water)} kg</td>
                      <td>{format(method.wcMethod, 3)}</td>
                      <td><strong>{format(method.wc, 3)}</strong></td>
                      <td><strong>{format(method.cement)} kg</strong></td>
                      <td>{format(method.fineDry)} kg</td>
                      <td>{format(method.coarseDry)} kg</td>
                      <td>{format(method.waterToAdd)} kg</td>
                      <td>{format(method.totalWet)} kg</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          <div className="method-card-grid">
            {comparison.methods.map((method) => (
              <article className={`method-result-card ${method.id}`} key={method.id}>
                <header><span style={{ background: methodColors[method.id] }} /> <strong>{method.name}</strong><em>{method.warnings.length ? "REVISAR" : "CALCULADO"}</em></header>
                <CompositionBar method={method} />
                <dl>
                  <div><dt>Arena / agregado</dt><dd>{format(method.fineAggregatePercent, 1)}%</dd></div>
                  <div><dt>Grava / agregado</dt><dd>{format(method.coarseAggregatePercent, 1)}%</dd></div>
                  <div><dt>Volumen compactado A.G.</dt><dd>{method.coarseBulkVolume == null ? "No aplica" : format(method.coarseBulkVolume, 3)}</dd></div>
                </dl>
                <p>{method.basis}</p>
                {method.warnings.map((warning) => <small key={warning}><AlertTriangle size={13} /> {warning}</small>)}
              </article>
            ))}
          </div>
        </div>
      )}

      {tab === "fuller" && (
        <div className="module-stack">
          <div className="module-grid fuller-layout">
            <section className="module-panel">
              <div className="module-heading">
                <span><Layers3 size={18} /></span>
                <div><h2>Proporción combinada</h2><p>Optimización numérica de A.F. + A.G. frente a P = 100(d/D)ⁿ.</p></div>
              </div>
              <div className="input-grid two">
                <NumberInput
                  label="Exponente n"
                  value={project.methods.fullerExponent}
                  step={0.05}
                  onChange={(value) => updateMethods("fullerExponent", value)}
                />
                <label className="field-label">
                  <span>Modo de proporción</span>
                  <select
                    className="text-input"
                    value={project.methods.fullerUseOptimized ? "auto" : "manual"}
                    onChange={(event) => updateMethods("fullerUseOptimized", event.target.value === "auto")}
                  >
                    <option value="auto">Óptimo por mínimos cuadrados</option>
                    <option value="manual">Ajuste manual</option>
                  </select>
                </label>
              </div>
              <label className={`fuller-slider ${project.methods.fullerUseOptimized ? "disabled" : ""}`}>
                <span><strong>Agregado fino</strong><em>{format(comparison.fuller.selectedFinePercent, 1)}%</em></span>
                <input
                  type="range"
                  min="0"
                  max="100"
                  step="0.5"
                  disabled={project.methods.fullerUseOptimized}
                  value={project.methods.fullerUseOptimized ? comparison.fuller.optimizedFinePercent : project.methods.fullerFinePercent}
                  onChange={(event) => updateMethods("fullerFinePercent", Number(event.target.value))}
                />
                <span className="slider-scale"><i>0% arena</i><i>100% arena</i></span>
              </label>
              <div className="fuller-answer">
                <span>ÓPTIMO MATEMÁTICO</span>
                <strong>{format(comparison.fuller.optimizedFinePercent, 1)}<small>% A.F.</small></strong>
                <p>{format(100 - comparison.fuller.optimizedFinePercent, 1)}% A.G. · RMSE {format(comparison.fuller.optimizedRmse, 2)}</p>
              </div>
              <p className="module-note">La solución minimiza el error cuadrático de las mallas disponibles. No sustituye bandas granulométricas, forma de partícula, demanda de pasta ni una tanda de prueba.</p>
            </section>

            <section className="module-panel fuller-chart-panel">
              <div className="module-heading">
                <span><BarChart3 size={18} /></span>
                <div><h2>Curva Fuller vs. combinación</h2><p>Eje horizontal logarítmico · porcentaje pasante.</p></div>
              </div>
              <FullerChart points={comparison.fuller.points} />
              <div className="fuller-legend"><span><i className="target" /> Fuller objetivo</span><span><i className="combined" /> Combinación seleccionada</span></div>
              <div className={`criterion-strip ${comparison.fuller.maximumDeviation <= 5 ? "pass" : "review"}`}>
                <span>{comparison.fuller.maximumDeviation <= 5 ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}</span>
                <div><strong>Desviación máxima: {format(comparison.fuller.maximumDeviation, 2)} puntos</strong><small>Umbral visual ±5 puntos tomado del documento académico; no es un criterio universal de aceptación.</small></div>
              </div>
            </section>
          </div>

          {comparison.fuller.warnings.length > 0 && (
            <div className="warning-banner"><AlertTriangle size={19} /><span><strong>Revisión de curva</strong>{comparison.fuller.warnings.join(" ")}</span></div>
          )}

          <section className="module-panel">
            <div className="module-heading">
              <span><TableProperties size={18} /></span>
              <div><h2>Memoria por malla</h2><p>Pasantes interpolados en escala logarítmica cuando una malla no existe en ambas series.</p></div>
            </div>
            <div className="data-table-wrap">
              <table className="data-table fuller-table">
                <thead><tr><th>Malla</th><th>Abertura</th><th>Pasante A.F.</th><th>Pasante A.G.</th><th>Fuller objetivo</th><th>Combinado</th><th>Desviación</th></tr></thead>
                <tbody>{comparison.fuller.points.map((point) => (
                  <tr key={point.openingMm}>
                    <th scope="row">{point.sieve}</th><td>{format(point.openingMm, 3)} mm</td>
                    <td>{format(point.finePassing)}%</td><td>{format(point.coarsePassing)}%</td>
                    <td>{format(point.targetPassing)}%</td><td><strong>{format(point.combinedPassing)}%</strong></td>
                    <td className={Math.abs(point.deviation) <= 5 ? "within" : "outside"}>{point.deviation >= 0 ? "+" : ""}{format(point.deviation)} pp</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>
        </div>
      )}

      {tab === "tablas" && <MethodTables project={project} comparison={comparison} />}
    </div>
  );
}

function CompositionBar({ method }: { method: ProportioningMethodResult }) {
  const values = [method.cement, method.water, method.fineDry, method.coarseDry];
  const total = values.reduce((sum, value) => sum + value, 0);
  const colors = ["#25384d", "#58a5c8", "#d7b680", "#e8662d"];
  return <div className="method-composition" aria-label={`Composición ${method.shortName}`}>{values.map((value, index) => <span key={colors[index]} style={{ width: `${(value / total) * 100}%`, background: colors[index] }} />)}</div>;
}

function FullerChart({ points }: { points: FullerCurvePoint[] }) {
  if (points.length < 2) return null;
  const width = 620;
  const height = 300;
  const left = 48;
  const right = 18;
  const top = 18;
  const bottom = 45;
  const sorted = [...points].sort((a, b) => a.openingMm - b.openingMm);
  const minimum = Math.log(sorted[0].openingMm);
  const maximum = Math.log(sorted.at(-1)!.openingMm);
  const x = (opening: number) => left + ((Math.log(opening) - minimum) / (maximum - minimum)) * (width - left - right);
  const y = (passing: number) => top + ((100 - passing) / 100) * (height - top - bottom);
  const target = sorted.map((point) => `${x(point.openingMm)},${y(point.targetPassing)}`).join(" ");
  const combined = sorted.map((point) => `${x(point.openingMm)},${y(point.combinedPassing)}`).join(" ");

  return (
    <div className="fuller-chart">
      <svg viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Curva granulométrica combinada comparada con Fuller">
        {[0, 20, 40, 60, 80, 100].map((value) => <g key={value}><line x1={left} x2={width - right} y1={y(value)} y2={y(value)} /><text x={left - 9} y={y(value) + 4} textAnchor="end">{value}</text></g>)}
        <polyline className="fuller-target" points={target} />
        <polyline className="fuller-combined" points={combined} />
        {sorted.map((point) => <g key={point.openingMm}><circle className="target-point" cx={x(point.openingMm)} cy={y(point.targetPassing)} r="3" /><circle className="combined-point" cx={x(point.openingMm)} cy={y(point.combinedPassing)} r="3.4" /><text className="axis-label" x={x(point.openingMm)} y={height - 18} textAnchor="middle">{point.sieve.replace("N° ", "#")}</text></g>)}
      </svg>
    </div>
  );
}

function MethodTables({
  project,
  comparison,
}: {
  project: MixProject;
  comparison: ReturnType<typeof calculateMethodComparison>;
}) {
  const walker = comparison.methods.find((method) => method.id === "walker")!;
  const bolomey = comparison.methods.find((method) => method.id === "bolomey")!;
  return (
    <div className="module-stack">
      <div className="module-grid equal">
        <section className="module-panel">
          <div className="module-heading"><span><TableProperties size={18} /></span><div><h2>Relación a/c del documento</h2><p>Interpolación lineal usando f&apos;cr común = {format(project.mix.fc + project.mix.strengthMargin, 0)} kgf/cm².</p></div></div>
          <div className="data-table-wrap"><table className="data-table compact-method-table"><thead><tr><th>Método</th><th>Puntos de tabla</th><th>a/c interpolada</th></tr></thead><tbody>
            <tr><th scope="row">Walker</th><td>200→0,65 · 250→0,58 · 300→0,52 · 350→0,47 · 400→0,42 · 450→0,38</td><td><strong>{format(walker.wcMethod, 3)}</strong></td></tr>
            <tr><th scope="row">Bolomey</th><td>175→0,625 · 210→0,575 · 250→0,525 · 300→0,475 · 350→0,425</td><td><strong>{format(bolomey.wcMethod, 3)}</strong></td></tr>
          </tbody></table></div>
          <p className="module-note">Para Bolomey se usa el punto medio de cada intervalo del PDF. La ecuación impresa en ese documento no es dimensionalmente clara; por eso la app no la presenta como ley calibrada.</p>
        </section>

        <section className="module-panel correction-card">
          <div className="module-heading"><span><AlertTriangle size={18} /></span><div><h2>Corrección al ejemplo Walker</h2><p>Distinción necesaria entre volumen a granel y volumen absoluto.</p></div></div>
          <div className="correction-equation"><span>Correcto</span><code>Peso A.G. = V<sub>compactado</sub> × P.U. seco compactado</code><strong>{format(walker.coarseBulkVolume ?? 0, 3)} × {format(project.mix.coarseUnitWeight)} = {format(walker.coarseDry)} kg/m³</strong></div>
          <p>El PDF multiplica la fracción volumétrica por gravedad específica × 1.000. Eso trata un volumen compactado como absoluto y sobreestima el agregado grueso. JT Diseño de Mezclas usa el peso unitario seco compactado registrado.</p>
        </section>
      </div>

      <section className="module-panel">
        <div className="module-heading"><span><TableProperties size={18} /></span><div><h2>Walker · volumen compactado de A.G.</h2><p>Filas por TMN y columnas por módulo de finura del agregado fino.</p></div></div>
        <div className="data-table-wrap"><table className="data-table walker-matrix"><thead><tr><th>TMN / MF</th>{methodTables.walkerFinenessModuli.map((mf) => <th key={mf}>{format(mf, 1)}</th>)}</tr></thead><tbody>
          {methodTables.nominalSizes.map((size, rowIndex) => <tr key={size}><th scope="row">{sizeLabel(size)} · {format(size, 2)} mm</th>{methodTables.walkerCoarseVolume[rowIndex].map((value, colIndex) => <td className={Math.abs(size - project.methods.nominalMaximumMm) < 0.01 && Math.abs(methodTables.walkerFinenessModuli[colIndex] - comparison.finenessModulus) <= 0.11 ? "current-cell" : ""} key={`${size}-${colIndex}`}>{format(value, 2)}</td>)}</tr>)}
        </tbody></table></div>
        <div className="formula-callout"><span>Interpolación aplicada con MF = {format(comparison.finenessModulus, 2)} y TMN = {format(project.methods.nominalMaximumMm, 2)} mm</span><strong>V A.G. = {format(walker.coarseBulkVolume ?? 0, 3)} m³/m³</strong></div>
      </section>

      <section className="module-panel method-scope-panel">
        <div className="module-heading"><span><Info size={18} /></span><div><h2>Alcance de cada método</h2><p>Qué puede compararse y qué no.</p></div></div>
        <div className="scope-grid">
          <article><span>DOSIFICACIÓN</span><strong>ACI / Walker / Bolomey</strong><p>Proponen agua, a/c, cemento y reparto de agregados para cerrar 1 m³.</p></article>
          <article><span>GRANULOMETRÍA</span><strong>Fuller / método gráfico</strong><p>Evalúan la combinación de tamaños; no determinan por sí solos cemento ni agua.</p></article>
          <article><span>DECISIÓN FINAL</span><strong>Mezcla de prueba</strong><p>Confirma asentamiento, cohesión, aire, rendimiento, densidad y resistencia.</p></article>
        </div>
      </section>
    </div>
  );
}

function sizeLabel(size: number) {
  if (Math.abs(size - 9.525) < 0.01) return '3/8"';
  if (Math.abs(size - 12.7) < 0.01) return '1/2"';
  if (Math.abs(size - 19.05) < 0.01) return '3/4"';
  if (Math.abs(size - 25.4) < 0.01) return '1"';
  return '1 1/2"';
}
