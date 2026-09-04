"use client";

import { ArrowRight, CheckCircle2, Droplets, Scale, SlidersHorizontal } from "lucide-react";
import { calculateTrialAdjustment } from "../../../mix-design/calculations";
import type { MixProject, TrialAdjustmentInputs } from "../../../mix-design/types";
import { format, Metric, NumberInput, SectionTitle } from "./section-ui";

export default function AdjustmentSection({
  project,
  setProject,
}: {
  project: MixProject;
  setProject: React.Dispatch<React.SetStateAction<MixProject>>;
}) {
  const result = calculateTrialAdjustment(project.adjustment);
  const update = (key: keyof TrialAdjustmentInputs, value: number) =>
    setProject((current) => ({
      ...current,
      adjustment: { ...current.adjustment, [key]: value },
    }));

  const comparisons = [
    ["Cemento", project.adjustment.cementDry, result.adjustedCement],
    ["Agua efectiva", project.adjustment.waterDry, result.adjustedWater],
    ["Agregado fino", project.adjustment.fineDry, result.fineDryAdjusted],
    ["Agregado grueso", project.adjustment.coarseDry, result.coarseDryAdjusted],
  ] as const;
  const chartMax = Math.max(...comparisons.flatMap((item) => [item[1], item[2]]), 1);

  return (
    <div className="workspace-page">
      <SectionTitle
        eyebrow="Mezcla de prueba"
        title="Ajuste por rendimiento y asentamiento"
        description="Convierte los datos reales de la tanda en una dosificación corregida por m³, conservando la relación a/c."
        action={<div className="method-badge"><span>RUTA</span><strong>Rivva López</strong><small>Formato académico suministrado</small></div>}
      />

      <div className="metric-grid four-metrics">
        <Metric label="Rendimiento real" value={format(result.actualYield, 5)} unit="m³" tone="blue" />
        <Metric label="Agua real" value={format(result.waterPerM3)} unit="kg/m³" />
        <Metric label="Corrección slump" value={`+ ${format(result.slumpCorrection)}`} unit="kg/m³" tone="orange" />
        <Metric label="Peso ajustado" value={format(result.totalWetAdjusted)} unit="kg/m³" tone="green" />
      </div>

      <div className="module-grid split-wide">
        <div className="module-stack">
          <section className="module-panel">
            <div className="module-heading"><span><Scale size={18} /></span><div><h2>01 · Diseño seco y tanda medida</h2><p>Ingrese la dosificación original y los pesajes húmedos usados en laboratorio.</p></div></div>
            <div className="input-grid four">
              <NumberInput label="Cemento seco" value={project.adjustment.cementDry} unit="kg/m³" onChange={(value) => update("cementDry", value)} />
              <NumberInput label="Agua de diseño" value={project.adjustment.waterDry} unit="kg/m³" onChange={(value) => update("waterDry", value)} />
              <NumberInput label="Agregado fino seco" value={project.adjustment.fineDry} unit="kg/m³" onChange={(value) => update("fineDry", value)} />
              <NumberInput label="Agregado grueso seco" value={project.adjustment.coarseDry} unit="kg/m³" onChange={(value) => update("coarseDry", value)} />
              <NumberInput label="A. fino húmedo · tanda" value={project.adjustment.fineWetBatch} unit="kg" step={0.1} onChange={(value) => update("fineWetBatch", value)} />
              <NumberInput label="A. grueso húmedo · tanda" value={project.adjustment.coarseWetBatch} unit="kg" step={0.1} onChange={(value) => update("coarseWetBatch", value)} />
              <NumberInput label="Agua añadida · tanda" value={project.adjustment.waterAddedBatch} unit="kg" step={0.1} onChange={(value) => update("waterAddedBatch", value)} />
              <NumberInput label="Volumen nominal" value={project.adjustment.nominalVolume} unit="m³" step={0.001} onChange={(value) => update("nominalVolume", value)} />
            </div>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><SlidersHorizontal size={18} /></span><div><h2>02 · Lecturas de control</h2><p>El rendimiento se obtiene con el peso unitario y la corrección de agua con el cambio de slump.</p></div></div>
            <div className="input-grid four">
              <NumberInput label="Peso unitario medido" value={project.adjustment.measuredUnitWeight} unit="kg/m³" onChange={(value) => update("measuredUnitWeight", value)} />
              <NumberInput label="Slump medido" value={project.adjustment.measuredSlumpIn} unit="in" step={0.25} onChange={(value) => update("measuredSlumpIn", value)} />
              <NumberInput label="Slump objetivo" value={project.adjustment.targetSlumpIn} unit="in" step={0.25} onChange={(value) => update("targetSlumpIn", value)} />
              <NumberInput label="Agua por 1 in" value={project.adjustment.waterCorrectionPerInch} unit="kg/m³" step={0.5} onChange={(value) => update("waterCorrectionPerInch", value)} />
            </div>
            <div className="calculation-ribbon">
              <span>Peso tanda <strong>{format(result.totalBatchWeight)} kg</strong></span><ArrowRight size={16} />
              <span>Rendimiento <strong>{format(result.actualYield, 5)} m³</strong></span><ArrowRight size={16} />
              <span>Agua ajustada <strong>{format(result.adjustedWater)} kg/m³</strong></span>
            </div>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><Droplets size={18} /></span><div><h2>03 · Humedad y absorción</h2><p>La humedad superficial corrige el agua de mezclado y los pesos de agregados.</p></div></div>
            <div className="input-grid four">
              <NumberInput label="Humedad A.F." value={project.adjustment.fineMoisture} unit="%" step={0.1} onChange={(value) => update("fineMoisture", value)} />
              <NumberInput label="Absorción A.F." value={project.adjustment.fineAbsorption} unit="%" step={0.1} onChange={(value) => update("fineAbsorption", value)} />
              <NumberInput label="Humedad A.G." value={project.adjustment.coarseMoisture} unit="%" step={0.1} onChange={(value) => update("coarseMoisture", value)} />
              <NumberInput label="Absorción A.G." value={project.adjustment.coarseAbsorption} unit="%" step={0.1} onChange={(value) => update("coarseAbsorption", value)} />
            </div>
          </section>
        </div>

        <aside className="module-panel comparison-panel">
          <div className="module-heading"><span><CheckCircle2 size={18} /></span><div><h2>Dosificación ajustada</h2><p>Comparación con el diseño inicial, en condición seca.</p></div></div>
          <div className="comparison-chart">
            {comparisons.map(([label, initial, adjusted]) => (
              <div key={label}>
                <div><span>{label}</span><strong>{format(adjusted)} kg/m³</strong></div>
                <div className="bar-row"><i style={{ width: `${(initial / chartMax) * 100}%` }} /><small>{format(initial)}</small></div>
                <div className="bar-row adjusted"><i style={{ width: `${(adjusted / chartMax) * 100}%` }} /><small>{format(adjusted)}</small></div>
              </div>
            ))}
          </div>
          <div className="chart-legend"><span><i /> Inicial</span><span><i /> Ajustado</span></div>
          <dl className="result-ledger">
            <div><dt>Agua libre ajustada</dt><dd>{format(result.freeWaterAdjusted)} kg/m³</dd></div>
            <div><dt>Agua a adicionar</dt><dd>{format(result.waterToAddAdjusted)} kg/m³</dd></div>
            <div><dt>Relación a/c conservada</dt><dd>{format(result.originalWc, 3)}</dd></div>
            <div><dt>A.F. húmedo</dt><dd>{format(result.fineWetAdjusted)} kg/m³</dd></div>
            <div><dt>A.G. húmedo</dt><dd>{format(result.coarseWetAdjusted)} kg/m³</dd></div>
          </dl>
          <p className="module-note">El ajuste es una herramienta de iteración. Repita la tanda hasta obtener trabajabilidad, rendimiento y cohesión aceptables sin alterar arbitrariamente la relación a/c.</p>
        </aside>
      </div>
    </div>
  );
}
