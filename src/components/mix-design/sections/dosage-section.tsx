"use client";

import { Check, Clipboard, FlaskConical, Layers3, PackageOpen, Scale } from "lucide-react";
import { useMemo, useState } from "react";
import { calculateMix, quantitiesForVolume, quantitiesPerBag } from "../../../mix-design/calculations";
import type { MixInputs, MixProject } from "../../../mix-design/types";
import { format, NumberInput, SectionTitle, Segmented } from "./section-ui";

type FormatType = "m3" | "bolsa" | "tanda" | "probetas";

export default function DosageSection({
  project,
  setProject,
}: {
  project: MixProject;
  setProject: React.Dispatch<React.SetStateAction<MixProject>>;
}) {
  const [mode, setMode] = useState<FormatType>("m3");
  const [copied, setCopied] = useState(false);
  const result = useMemo(() => calculateMix(project.mix), [project.mix]);
  const perBag = quantitiesPerBag(result, project.mix.bagWeight);
  const batch = quantitiesForVolume(result, project.mix.batchVolume);
  const specimens = quantitiesForVolume(result, result.specimenVolume);
  const selected = mode === "m3"
    ? { ...quantitiesForVolume(result, 1), label: "1.000 m³", volume: 1 }
    : mode === "bolsa"
      ? { ...perBag, label: `1 bolsa · ${format(project.mix.bagWeight, 1)} kg`, volume: project.mix.bagWeight / result.cement }
      : mode === "tanda"
        ? { ...batch, label: `Tanda · ${format(project.mix.batchVolume, 3)} m³`, volume: project.mix.batchVolume }
        : { ...specimens, label: `${project.mix.specimenCount} probetas + ${format(project.mix.waste, 0)}%`, volume: result.specimenVolume };

  const updateMix = (key: keyof MixInputs, value: number) =>
    setProject((current) => ({ ...current, mix: { ...current.mix, [key]: value } }));

  const copy = async () => {
    const rows = [
      `MEZCLALAB · ${project.meta.name}`,
      `Formato: ${selected.label}`,
      `Cemento: ${format(selected.cement)} kg`,
      `Agua a adicionar: ${format(selected.water)} L`,
      `Agregado fino húmedo: ${format(selected.fine)} kg`,
      `Agregado grueso húmedo: ${format(selected.coarse)} kg`,
      `Total: ${format(selected.total)} kg`,
    ];
    await navigator.clipboard.writeText(rows.join("\n"));
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  };

  const materials = [
    { label: "Cemento", note: "seco", value: selected.cement, unit: "kg", color: "#233348" },
    { label: "Agua", note: "a adicionar", value: selected.water, unit: "L", color: "#58a5c8" },
    { label: "Agregado fino", note: "húmedo", value: selected.fine, unit: "kg", color: "#d7b680" },
    { label: "Agregado grueso", note: "húmedo", value: selected.coarse, unit: "kg", color: "#e86d2c" },
  ];

  return (
    <div className="workspace-page">
      <SectionTitle
        eyebrow="Formatos de producción"
        title="Dosificación para laboratorio y obra"
        description="Escala la mezcla sin perder la corrección por humedad: por m³, bolsa, tanda o volumen de probetas."
        action={<button className="button button-ghost" onClick={copy}>{copied ? <Check size={17} /> : <Clipboard size={17} />}{copied ? "Copiado" : "Copiar dosificación"}</button>}
      />

      <Segmented value={mode} onChange={setMode} items={[
        { value: "m3", label: "Por 1 m³" },
        { value: "bolsa", label: "Por bolsa" },
        { value: "tanda", label: "Por tanda" },
        { value: "probetas", label: "Probetas" },
      ]} />

      <div className="module-grid split-wide dosage-layout">
        <section className="module-panel dosage-ticket">
          <div className="ticket-heading">
            <div><span>DOSIFICACIÓN ACTIVA</span><h2>{selected.label}</h2></div>
            <span><Scale size={18} /> {format(selected.volume, 5)} m³</span>
          </div>
          <div className="dosage-material-list">
            {materials.map((material, index) => (
              <div key={material.label}>
                <span className="dosage-index">0{index + 1}</span>
                <i style={{ background: material.color }} />
                <span><strong>{material.label}</strong><small>{material.note}</small></span>
                <strong>{format(material.value)} <small>{material.unit}</small></strong>
              </div>
            ))}
          </div>
          <div className="dosage-total"><span>Peso total de pesaje</span><strong>{format(selected.total)} kg</strong></div>
          <div className="ratio-footer">
            <span>Proporción seca</span>
            <strong>1 : {format(result.dryRatio[1])} : {format(result.dryRatio[2])}</strong>
            <small>Cemento : fino : grueso</small>
          </div>
        </section>

        <div className="module-stack">
          <section className="module-panel">
            <div className="module-heading"><span><PackageOpen size={18} /></span><div><h2>Configurar formato</h2><p>Los cambios se reflejan en la tarjeta activa y en las exportaciones.</p></div></div>
            <div className="input-grid two">
              <NumberInput label="Peso de bolsa" value={project.mix.bagWeight} unit="kg" step={0.5} onChange={(value) => updateMix("bagWeight", value)} />
              <NumberInput label="Volumen de tanda" value={project.mix.batchVolume} unit="m³" step={0.001} onChange={(value) => updateMix("batchVolume", value)} />
            </div>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><FlaskConical size={18} /></span><div><h2>Moldeo de probetas</h2><p>Volumen cilíndrico total más el porcentaje previsto por pérdidas.</p></div></div>
            <div className="input-grid four">
              <NumberInput label="Diámetro" value={project.mix.specimenDiameter} unit="cm" step={0.1} onChange={(value) => updateMix("specimenDiameter", value)} />
              <NumberInput label="Altura" value={project.mix.specimenHeight} unit="cm" step={0.1} onChange={(value) => updateMix("specimenHeight", value)} />
              <NumberInput label="Cantidad" value={project.mix.specimenCount} unit="und" onChange={(value) => updateMix("specimenCount", Math.max(1, Math.round(value)))} />
              <NumberInput label="Desperdicio" value={project.mix.waste} unit="%" step={1} onChange={(value) => updateMix("waste", value)} />
            </div>
            <div className="formula-callout"><span>V = π · d² / 4 · h · n · (1 + pérdida)</span><strong>{format(result.specimenVolume, 6)} m³</strong></div>
          </section>

          <section className="module-panel compact-comparison">
            <div className="module-heading"><span><Layers3 size={18} /></span><div><h2>Lectura rápida</h2><p>Equivalencias útiles antes de preparar la tanda.</p></div></div>
            <dl className="result-ledger columns">
              <div><dt>Bolsas por m³</dt><dd>{format(result.bagsPerM3, 2)}</dd></div>
              <div><dt>Agua por bolsa</dt><dd>{format(perBag.water)} L</dd></div>
              <div><dt>Fino por bolsa</dt><dd>{format(perBag.fine)} kg</dd></div>
              <div><dt>Grueso por bolsa</dt><dd>{format(perBag.coarse)} kg</dd></div>
            </dl>
          </section>
        </div>
      </div>
    </div>
  );
}
