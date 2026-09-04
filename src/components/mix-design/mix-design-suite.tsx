"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Beaker,
  BookOpen,
  Calculator,
  Check,
  ChevronDown,
  Download,
  FlaskConical,
  GitCompareArrows,
  LayoutDashboard,
  PackageOpen,
  Plus,
  Save,
  Upload,
} from "lucide-react";
import { calculateMix, quantitiesPerBag } from "../../mix-design/calculations";
import { cloneDefaultProject, normalizeProject } from "../../mix-design/default-project";
import type { MixInputs, MixProject, NavigationSection } from "../../mix-design/types";
import AdjustmentSection from "./sections/adjustment-section";
import AggregatesSection from "./sections/aggregates-section";
import CompressionSection from "./sections/compression-section";
import DosageSection from "./sections/dosage-section";
import MethodsSection from "./sections/methods-section";
import ReportsSection from "./sections/reports-section";
import TheorySection from "./sections/theory-section";

type Props = {
  onUseInMatrix: (fcKgfCm2: number) => void;
};

const materialColors = ["#233348", "#58a5c8", "#d7b680", "#e86d2c"];

const navigation: { section: NavigationSection; label: string; icon: typeof Calculator }[] = [
  { section: "resumen", label: "Resumen", icon: LayoutDashboard },
  { section: "aci", label: "Diseño ACI", icon: Calculator },
  { section: "metodos", label: "Comparar métodos", icon: GitCompareArrows },
  { section: "ajuste", label: "Ajuste de prueba", icon: Beaker },
  { section: "dosificacion", label: "Dosificaciones", icon: PackageOpen },
  { section: "agregados", label: "Agregados", icon: FlaskConical },
  { section: "probetas", label: "Probetas", icon: Activity },
  { section: "informes", label: "Informes y fichas", icon: Download },
  { section: "teoria", label: "Teoría", icon: BookOpen },
];

function format(value: number, digits = 2) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

export default function MixDesignSuite({ onUseInMatrix }: Props) {
  const [project, setProject] = useState<MixProject>(() => cloneDefaultProject());
  const [active, setActive] = useState<NavigationSection>("resumen");
  const [ready, setReady] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");
  const importRef = useRef<HTMLInputElement>(null);
  const results = useMemo(() => calculateMix(project.mix), [project.mix]);
  const perBag = useMemo(
    () => quantitiesPerBag(results, project.mix.bagWeight),
    [results, project.mix.bagWeight],
  );

  useEffect(() => {
    queueMicrotask(() => {
      try {
        const stored = localStorage.getItem("matriz-unc-mix-design");
        if (stored) setProject(normalizeProject(JSON.parse(stored)));
      } catch { /* El proyecto base siempre queda disponible. */ }
      setReady(true);
    });
  }, []);

  useEffect(() => {
    if (!ready) return;
    localStorage.setItem("matriz-unc-mix-design", JSON.stringify(project));
  }, [project, ready]);

  const updateMix = (key: keyof MixInputs, value: number) => {
    setProject((current) => ({
      ...current,
      mix: { ...current.mix, [key]: value },
    }));
  };

  const saveProject = () => {
    localStorage.setItem("matriz-unc-mix-design", JSON.stringify(project));
    setSaveState("saved");
    window.setTimeout(() => setSaveState("idle"), 1400);
  };

  const newProject = () => {
    setProject(cloneDefaultProject());
    setActive("aci");
  };

  const importProject = async (file: File) => {
    try {
      setProject(normalizeProject(JSON.parse(await file.text())));
      setActive("resumen");
    } catch {
      alert("El archivo JSON no corresponde a un diseño de mezclas válido.");
    }
  };

  return (
    <section className="mix-design-suite">
      <header className="mix-suite-toolbar">
        <div>
          <span>DISEÑO DE MEZCLAS COMPLETO</span>
          <input aria-label="Nombre del proyecto de mezcla" value={project.meta.name} onChange={(event) => setProject((current) => ({ ...current, meta: { ...current.meta, name: event.target.value } }))} />
        </div>
        <div className="mix-suite-actions">
          <button onClick={newProject}><Plus size={16} />Nuevo</button>
          <button onClick={() => importRef.current?.click()}><Upload size={16} />Importar JSON</button>
          <button onClick={saveProject}>{saveState === "saved" ? <Check size={16} /> : <Save size={16} />}{saveState === "saved" ? "Guardado local" : "Guardar"}</button>
          <button className="button button-primary" onClick={() => onUseInMatrix(project.mix.fc)}>Usar f′c={format(project.mix.fc, 0)} en matrices<ArrowRight size={16} /></button>
        </div>
      </header>

      <nav className="mix-suite-nav" aria-label="Módulos de diseño de mezclas">
        {navigation.map(({ section, label, icon: Icon }) => <button key={section} className={active === section ? "active" : ""} onClick={() => setActive(section)}><Icon size={17} /><span>{label}</span></button>)}
      </nav>

      <div className="studio-content">
          {active === "resumen" && <Dashboard project={project} results={results} onOpenDesign={() => setActive("aci")} />}
          {active === "aci" && <AciDesigner project={project} results={results} updateMix={updateMix} perBag={perBag} onContinue={() => setActive("dosificacion")} />}
          {active === "metodos" && <MethodsSection project={project} setProject={setProject} />}
          {active === "ajuste" && <AdjustmentSection project={project} setProject={setProject} />}
          {active === "dosificacion" && <DosageSection project={project} setProject={setProject} />}
          {active === "agregados" && <AggregatesSection project={project} setProject={setProject} />}
          {active === "probetas" && <CompressionSection project={project} setProject={setProject} />}
          {active === "informes" && <ReportsSection project={project} setProject={setProject} />}
          {active === "teoria" && <TheorySection />}
      </div>
      <input ref={importRef} hidden type="file" accept=".json,application/json" onChange={(event) => { const file = event.target.files?.[0]; if (file) void importProject(file); event.target.value = ""; }} />
    </section>
  );
}

function Dashboard({ project, results, onOpenDesign }: { project: MixProject; results: ReturnType<typeof calculateMix>; onOpenDesign: () => void }) {
  const materials = [
    { name: "Cemento", value: results.cement, unit: "kg", color: materialColors[0] },
    { name: "Agua a añadir", value: results.waterToAdd, unit: "L", color: materialColors[1] },
    { name: "Agregado fino", value: results.fineWet, unit: "kg", color: materialColors[2] },
    { name: "Agregado grueso", value: results.coarseWet, unit: "kg", color: materialColors[3] },
  ];
  const total = materials.reduce((sum, item) => sum + item.value, 0);

  return (
    <div className="workspace-page">
      <div className="page-title-row">
        <div>
          <p className="eyebrow"><span /> Panel técnico</p>
          <h1>Resumen del diseño</h1>
          <p>{project.meta.element} · {project.meta.location} · {project.meta.date}</p>
        </div>
        <button className="button button-primary" onClick={onOpenDesign}>Editar parámetros <ArrowRight size={17} /></button>
      </div>

      <div className="kpi-grid">
        <article><span>f&apos;cr requerida</span><strong>{format(results.fcr, 0)}</strong><small>kgf/cm²</small><em>f&apos;c + margen</em></article>
        <article><span>Relación a/c</span><strong>{format(results.wc, 3)}</strong><small>adimensional</small><em>control adoptado</em></article>
        <article><span>Cemento</span><strong>{format(results.cement, 1)}</strong><small>kg/m³</small><em>{format(results.bagsPerM3, 2)} bolsas</em></article>
        <article><span>Peso unitario</span><strong>{format(results.unitWeight, 0)}</strong><small>kg/m³</small><em>mezcla húmeda</em></article>
      </div>

      <div className="dashboard-grid">
        <article className="panel composition-panel">
          <div className="panel-heading"><div><span>COMPOSICIÓN</span><h2>Dosificación corregida · 1 m³</h2></div><span className="verified-pill"><Check size={14} /> Calculado</span></div>
          <div className="dashboard-stack">
            {materials.map((material) => <span key={material.name} style={{ width: `${(material.value / total) * 100}%`, background: material.color }} />)}
          </div>
          <div className="dashboard-materials">
            {materials.map((material) => (
              <div key={material.name}><span className="material-swatch" style={{ background: material.color }} /><span><small>{material.name}</small><strong>{format(material.value)} <em>{material.unit}</em></strong></span></div>
            ))}
          </div>
        </article>

        <article className="panel balance-panel">
          <div className="panel-heading"><div><span>CONTROL</span><h2>Balance de agua</h2></div></div>
          <div className="water-gauge">
            <div className="gauge-value"><strong>{format(results.effectiveWater, 1)}</strong><span>kg/m³ efectivos</span></div>
            <svg viewBox="0 0 180 100" role="img" aria-label="Balance de agua">
              <path d="M15 90 A75 75 0 0 1 165 90" pathLength="100" />
              <path className="gauge-progress" d="M15 90 A75 75 0 0 1 165 90" pathLength="100" style={{ strokeDasharray: `${Math.min(100, (results.waterToAdd / results.effectiveWater) * 100)} 100` }} />
            </svg>
          </div>
          <dl className="mini-breakdown"><div><dt>Agua añadida</dt><dd>{format(results.waterToAdd)} kg</dd></div><div><dt>Agua libre agregados</dt><dd>{format(results.freeWater)} kg</dd></div><div><dt>Comprobación a/c</dt><dd>{format(results.effectiveWater / results.cement, 3)}</dd></div></dl>
        </article>

        <article className="panel ratio-panel">
          <div className="panel-heading"><div><span>FORMATO DE CAMPO</span><h2>Proporción en peso</h2></div></div>
          <div className="ratio-display"><span>1</span><i>:</i><span>{format(results.dryRatio[1], 2)}</span><i>:</i><span>{format(results.dryRatio[2], 2)}</span></div>
          <div className="ratio-labels"><span>Cemento</span><span>A. fino</span><span>A. grueso</span></div>
          <p>Proporción seca normalizada respecto al cemento. Para obra, use la dosificación corregida por humedad.</p>
        </article>

        <article className="panel trace-panel">
          <div className="panel-heading"><div><span>TRAZABILIDAD</span><h2>Datos principales</h2></div></div>
          <dl>
            <div><dt>Cemento</dt><dd>{project.meta.cement}</dd></div>
            <div><dt>Agregado fino</dt><dd>{project.meta.fineSource}</dd></div>
            <div><dt>Agregado grueso</dt><dd>{project.meta.coarseSource}</dd></div>
            <div><dt>Slump</dt><dd>{format(project.mix.slump, 1)} cm</dd></div>
          </dl>
        </article>
      </div>

      {results.warnings.length > 0 && <div className="warning-banner"><AlertTriangle size={19} /><span><strong>Revisión técnica</strong>{results.warnings[0]}</span></div>}
    </div>
  );
}

function AciDesigner({ project, results, updateMix, perBag, onContinue }: { project: MixProject; results: ReturnType<typeof calculateMix>; updateMix: (key: keyof MixInputs, value: number) => void; perBag: ReturnType<typeof quantitiesPerBag>; onContinue: () => void }) {
  return (
    <div className="workspace-page design-page">
      <div className="page-title-row">
        <div><p className="eyebrow"><span /> Método de volúmenes absolutos</p><h1>Diseño ACI 211.1</h1><p>Los campos beige son editables; los resultados se actualizan al instante.</p></div>
        <div className="method-badge"><span>BASE</span><strong>ACI 211.1-91</strong><small>Formato académico suministrado</small></div>
      </div>

      <div className="designer-layout">
        <div className="designer-form">
          <FormSection number="01" title="Resistencia y relación agua/cemento" subtitle="Define la resistencia requerida y los puntos de interpolación.">
            <div className="input-grid three">
              <NumberField label="f'c especificada" value={project.mix.fc} unit="kgf/cm²" onChange={(value) => updateMix("fc", value)} />
              <NumberField label="Incremento sin registro" value={project.mix.strengthMargin} unit="kgf/cm²" onChange={(value) => updateMix("strengthMargin", value)} />
              <ResultField label="f'cr requerida" value={results.fcr} unit="kgf/cm²" />
            </div>
            <div className="formula-box"><span>INTERPOLACIÓN</span><code>a/c = {format(project.mix.wcPoint1, 2)} + ({format(results.fcr, 0)} - {format(project.mix.strengthPoint1, 0)}) × ({format(project.mix.wcPoint2, 2)} - {format(project.mix.wcPoint1, 2)}) / ({format(project.mix.strengthPoint2, 0)} - {format(project.mix.strengthPoint1, 0)})</code><strong>= {format(results.wcByStrength, 3)}</strong></div>
            <div className="input-grid four compact-grid">
              <NumberField label="Punto 1 · f'cr" value={project.mix.strengthPoint1} unit="kgf/cm²" onChange={(value) => updateMix("strengthPoint1", value)} />
              <NumberField label="Punto 1 · a/c" value={project.mix.wcPoint1} unit="" step={0.01} onChange={(value) => updateMix("wcPoint1", value)} />
              <NumberField label="Punto 2 · f'cr" value={project.mix.strengthPoint2} unit="kgf/cm²" onChange={(value) => updateMix("strengthPoint2", value)} />
              <NumberField label="Punto 2 · a/c" value={project.mix.wcPoint2} unit="" step={0.01} onChange={(value) => updateMix("wcPoint2", value)} />
            </div>
          </FormSection>

          <FormSection number="02" title="Agua, cemento y agregado grueso" subtitle="Parámetros de tablas y propiedades de los materiales.">
            <div className="input-grid three">
              <NumberField label="Agua de diseño" value={project.mix.water} unit="kg/m³" onChange={(value) => updateMix("water", value)} />
              <NumberField label="Límite a/c por durabilidad" value={project.mix.durabilityWcLimit} unit="" step={0.01} onChange={(value) => updateMix("durabilityWcLimit", value)} />
              <ResultField label="Cemento calculado" value={results.cement} unit="kg/m³" />
              <NumberField label="P.E. cemento" value={project.mix.cementDensity} unit="kg/m³" onChange={(value) => updateMix("cementDensity", value)} />
              <NumberField label="P.U. compactado A.G." value={project.mix.coarseUnitWeight} unit="kg/m³" onChange={(value) => updateMix("coarseUnitWeight", value)} />
              <NumberField label="Volumen compactado A.G." value={project.mix.coarseVolume} unit="m³/m³" step={0.01} onChange={(value) => updateMix("coarseVolume", value)} />
            </div>
          </FormSection>

          <FormSection number="03" title="Volúmenes absolutos" subtitle="El agregado fino se obtiene por diferencia hasta completar 1 m³.">
            <div className="input-grid three">
              <NumberField label="P.E. agregado fino" value={project.mix.fineDensity} unit="kg/m³" onChange={(value) => updateMix("fineDensity", value)} />
              <NumberField label="P.E. agregado grueso" value={project.mix.coarseDensity} unit="kg/m³" onChange={(value) => updateMix("coarseDensity", value)} />
              <NumberField label="Aire atrapado" value={project.mix.airContent} unit="%" step={0.1} onChange={(value) => updateMix("airContent", value)} />
            </div>
            <div className="volume-ledger">
              <div><span>Cemento</span><strong>{format(results.cementVolume, 4)}</strong></div>
              <div><span>Agua</span><strong>{format(results.waterVolume, 4)}</strong></div>
              <div><span>A. grueso</span><strong>{format(results.coarseAbsoluteVolume, 4)}</strong></div>
              <div><span>Aire</span><strong>{format(project.mix.airContent / 100, 4)}</strong></div>
              <div className="ledger-result"><span>A. fino por diferencia</span><strong>{format(results.fineAbsoluteVolume, 4)} m³</strong></div>
            </div>
          </FormSection>

          <FormSection number="04" title="Corrección por humedad" subtitle="Separa el agua de diseño del agua realmente añadida a la mezcladora.">
            <div className="moisture-table">
              <div className="moisture-head"><span>Material</span><span>Peso seco</span><span>Humedad</span><span>Absorción</span><span>Peso húmedo</span><span>Agua libre</span></div>
              <div><strong>Agregado fino</strong><span>{format(results.fineDry)} kg</span><NumberField bare label="Humedad fino" value={project.mix.fineMoisture} unit="%" step={0.1} onChange={(value) => updateMix("fineMoisture", value)} /><NumberField bare label="Absorción fino" value={project.mix.fineAbsorption} unit="%" step={0.1} onChange={(value) => updateMix("fineAbsorption", value)} /><span className="computed-cell">{format(results.fineWet)} kg</span><span className="computed-cell">{format(results.fineFreeWater)} kg</span></div>
              <div><strong>Agregado grueso</strong><span>{format(results.coarseDry)} kg</span><NumberField bare label="Humedad grueso" value={project.mix.coarseMoisture} unit="%" step={0.1} onChange={(value) => updateMix("coarseMoisture", value)} /><NumberField bare label="Absorción grueso" value={project.mix.coarseAbsorption} unit="%" step={0.1} onChange={(value) => updateMix("coarseAbsorption", value)} /><span className="computed-cell">{format(results.coarseWet)} kg</span><span className="computed-cell">{format(results.coarseFreeWater)} kg</span></div>
            </div>
            <div className="water-balance-row"><span>Agua de diseño <strong>{format(project.mix.water)} kg</strong></span><i>−</i><span>Agua libre <strong>{format(results.freeWater)} kg</strong></span><i>=</i><span className="answer">Agua a añadir <strong>{format(results.waterToAdd)} kg</strong></span></div>
          </FormSection>
        </div>

        <aside className="live-result-card">
          <div className="live-card-head"><span>RESULTADO EN VIVO</span><span className="live-dot" /></div>
          <h2>Dosificación final</h2>
          <p>Corregida por humedad · 1 m³</p>
          <div className="live-wc"><span>Relación a/c</span><strong>{format(results.wc, 3)}</strong></div>
          <div className="live-materials">
            <div><span style={{ background: materialColors[0] }} /><label>Cemento<small>seco</small></label><strong>{format(results.cement)}<em>kg</em></strong></div>
            <div><span style={{ background: materialColors[1] }} /><label>Agua<small>a añadir</small></label><strong>{format(results.waterToAdd)}<em>L</em></strong></div>
            <div><span style={{ background: materialColors[2] }} /><label>Agregado fino<small>húmedo</small></label><strong>{format(results.fineWet)}<em>kg</em></strong></div>
            <div><span style={{ background: materialColors[3] }} /><label>Agregado grueso<small>húmedo</small></label><strong>{format(results.coarseWet)}<em>kg</em></strong></div>
          </div>
          <div className="live-total"><span>Peso total húmedo</span><strong>{format(results.totalWet)} kg/m³</strong></div>
          <div className="bag-summary"><span>Por bolsa de {format(project.mix.bagWeight, 1)} kg</span><div><strong>{format(perBag.water)} L</strong> agua · <strong>{format(perBag.fine)} kg</strong> fino · <strong>{format(perBag.coarse)} kg</strong> grueso</div></div>
          <button className="button button-primary full-button" onClick={onContinue}>Continuar a dosificaciones <ArrowRight size={17} /></button>
          <small className="engineering-note">Validar mediante mezcla de prueba antes de uso estructural.</small>
        </aside>
      </div>
    </div>
  );
}

function FormSection({ number, title, subtitle, children }: { number: string; title: string; subtitle: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(true);
  return <section className={`form-section ${open ? "open" : ""}`}><button className="form-section-head" onClick={() => setOpen((value) => !value)}><span>{number}</span><span><strong>{title}</strong><small>{subtitle}</small></span><ChevronDown size={19} /></button>{open && <div className="form-section-body">{children}</div>}</section>;
}

function NumberField({ label, value, unit, onChange, step = 1, bare = false }: { label: string; value: number; unit: string; onChange: (value: number) => void; step?: number; bare?: boolean }) {
  const field = <div className={`number-input ${bare ? "bare" : ""}`}><input aria-label={label} type="number" step={step} value={Number.isFinite(value) ? value : 0} onChange={(event) => onChange(Number(event.target.value))} /><span>{unit}</span></div>;
  return bare ? field : <label className="field-label"><span>{label}</span>{field}</label>;
}

function ResultField({ label, value, unit }: { label: string; value: number; unit: string }) {
  return <label className="field-label result-field"><span>{label}</span><div><strong>{format(value, 2)}</strong><span>{unit}</span></div></label>;
}
