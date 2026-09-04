"use client";

import { Activity, AlertTriangle, CheckCircle2, FlaskConical, Gauge, Plus } from "lucide-react";
import { useMemo } from "react";
import { calculateCompressionTests, calculateMix } from "../../../mix-design/calculations";
import type { CompressionTest, MixInputs, MixProject } from "../../../mix-design/types";
import { format, Metric, NumberInput, SectionTitle } from "./section-ui";

export default function CompressionSection({
  project,
  setProject,
}: {
  project: MixProject;
  setProject: React.Dispatch<React.SetStateAction<MixProject>>;
}) {
  const mix = useMemo(() => calculateMix(project.mix), [project.mix]);
  const tests = useMemo(
    () => calculateCompressionTests(project.compressionTests, project.mix.specimenDiameter, project.mix.fc, mix.fcr),
    [project.compressionTests, project.mix.specimenDiameter, project.mix.fc, mix.fcr],
  );
  const realTests = tests.filter((test) => test.strengthKgfCm2 != null);
  const latestReal = realTests.at(-1);
  const updateMix = (key: keyof MixInputs, value: number) =>
    setProject((state) => ({ ...state, mix: { ...state.mix, [key]: value } }));
  const updateTest = (index: number, patch: Partial<CompressionTest>) =>
    setProject((state) => ({
      ...state,
      compressionTests: state.compressionTests.map((test, rowIndex) =>
        rowIndex === index ? { ...test, ...patch } : test,
      ),
    }));
  const addTest = () =>
    setProject((state) => ({
      ...state,
      compressionTests: [
        ...state.compressionTests,
        {
          id: `P-${String(state.compressionTests.length + 1).padStart(2, "0")}`,
          age: 28,
          maturityFactor: 1,
          loadTf: null,
          failureType: "Pendiente",
          observation: "",
        },
      ],
    }));

  return (
    <div className="workspace-page">
      <SectionTitle
        eyebrow="Control de calidad"
        title="Resistencia de probetas cilíndricas"
        description="Registra cargas reales, calcula esfuerzo y compara cada edad con la resistencia de referencia."
        action={<button className="button button-ghost" onClick={addTest}><Plus size={17} /> Agregar probeta</button>}
      />

      <div className="metric-grid four-metrics">
        <Metric label="Área de ensayo" value={format(tests[0]?.areaCm2 ?? 0)} unit="cm²" tone="blue" />
        <Metric label="f'cr de referencia" value={format(mix.fcr, 0)} unit="kgf/cm²" />
        <Metric label="Último resultado real" value={latestReal?.strengthKgfCm2 == null ? "—" : format(latestReal.strengthKgfCm2)} unit="kgf/cm²" tone={latestReal?.status === "cumple" ? "green" : "orange"} />
        <Metric label="Resultados registrados" value={`${realTests.length} / ${tests.length}`} unit="ensayos" />
      </div>

      <div className="module-grid split-wide compression-layout">
        <div className="module-stack">
          <section className="module-panel">
            <div className="module-heading"><span><FlaskConical size={18} /></span><div><h2>Geometría de la probeta</h2><p>El área transversal se usa para convertir la carga de rotura en esfuerzo.</p></div></div>
            <div className="input-grid three">
              <NumberInput label="Diámetro" value={project.mix.specimenDiameter} unit="cm" step={0.1} onChange={(value) => updateMix("specimenDiameter", value)} />
              <NumberInput label="Altura" value={project.mix.specimenHeight} unit="cm" step={0.1} onChange={(value) => updateMix("specimenHeight", value)} />
              <label className="field-label result-field"><span>Área calculada</span><div><strong>{format(tests[0]?.areaCm2 ?? 0)}</strong><span>cm²</span></div></label>
            </div>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><Gauge size={18} /></span><div><h2>Registro de roturas</h2><p>Deje la carga vacía para mostrar una proyección orientativa basada en el primer ensayo real.</p></div></div>
            <div className="data-table-wrap">
              <table className="data-table compression-table">
                <thead><tr><th>ID</th><th>Edad</th><th>Factor</th><th>Carga</th><th>Resistencia</th><th>MPa</th><th>% f&apos;cr</th><th>Estado</th></tr></thead>
                <tbody>{tests.map((test, index) => (
                  <tr key={`${test.id}-${index}`}>
                    <td><input aria-label={`ID probeta ${index + 1}`} value={test.id} onChange={(event) => updateTest(index, { id: event.target.value })} /></td>
                    <td><input aria-label={`Edad ${test.id}`} type="number" value={test.age} onChange={(event) => updateTest(index, { age: Number(event.target.value) })} /><small>d</small></td>
                    <td><input aria-label={`Factor ${test.id}`} type="number" step="0.01" value={test.maturityFactor} onChange={(event) => updateTest(index, { maturityFactor: Number(event.target.value) })} /></td>
                    <td><input aria-label={`Carga ${test.id}`} type="number" step="0.1" placeholder="—" value={test.loadTf ?? ""} onChange={(event) => updateTest(index, { loadTf: event.target.value === "" ? null : Number(event.target.value) })} /><small>tf</small></td>
                    <td><strong>{test.displayedStrength == null ? "—" : format(test.displayedStrength)}</strong>{test.isProjected && <small>proy.</small>}</td>
                    <td>{test.strengthMpa == null ? "—" : format(test.strengthMpa)}</td>
                    <td>{test.percentFcr == null ? "—" : `${format(test.percentFcr)}%`}</td>
                    <td><span className={`status-pill ${test.status}`}>{test.status}</span></td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><Activity size={18} /></span><div><h2>Observaciones de falla</h2><p>Documente el patrón de rotura y cualquier condición del ensayo.</p></div></div>
            <div className="observation-list">
              {project.compressionTests.map((test, index) => (
                <div key={`${test.id}-observation`}>
                  <strong>{test.id} · {test.age} días</strong>
                  <input aria-label={`Tipo de falla ${test.id}`} value={test.failureType} placeholder="Tipo de falla" onChange={(event) => updateTest(index, { failureType: event.target.value })} />
                  <input aria-label={`Observación ${test.id}`} value={test.observation} placeholder="Observación" onChange={(event) => updateTest(index, { observation: event.target.value })} />
                </div>
              ))}
            </div>
          </section>
        </div>

        <aside className="module-panel strength-chart-panel">
          <div className="module-heading"><span><Activity size={18} /></span><div><h2>Evolución de resistencia</h2><p>Real o proyectada frente a la referencia por edad.</p></div></div>
          <StrengthChart tests={tests} fcr={mix.fcr} />
          <div className="chart-legend"><span><i /> Resultado</span><span className="reference"><i /> Referencia</span></div>
          <div className="test-status-list">
            {tests.map((test) => (
              <div key={`${test.id}-status`}>
                <span className={test.status === "cumple" ? "quality-ok" : test.status === "revisar" ? "quality-review" : "quality-neutral"}>
                  {test.status === "cumple" ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
                </span>
                <span><strong>{test.id} · {test.age} días</strong><small>Referencia {format(test.referenceStrength)} kgf/cm²</small></span>
                <strong>{test.displayedStrength == null ? "Pendiente" : `${format(test.displayedStrength)} kgf/cm²`}</strong>
              </div>
            ))}
          </div>
          <p className="module-note">Las proyecciones son informativas y no sustituyen ensayos reales. La aceptación debe basarse en la especificación del proyecto y los criterios estadísticos aplicables.</p>
        </aside>
      </div>
    </div>
  );
}

function StrengthChart({
  tests,
  fcr,
}: {
  tests: ReturnType<typeof calculateCompressionTests>;
  fcr: number;
}) {
  const max = Math.max(fcr, ...tests.map((test) => test.displayedStrength ?? 0), 1) * 1.1;
  return (
    <div className="strength-bars" aria-label="Gráfico de resistencia por edad">
      {tests.map((test) => (
        <div key={`${test.id}-bar`}>
          <div className="strength-track">
            <span className={`strength-value ${test.isProjected ? "projected" : ""}`} style={{ height: `${((test.displayedStrength ?? 0) / max) * 100}%` }} />
            <i style={{ bottom: `${(test.referenceStrength / max) * 100}%` }} />
          </div>
          <strong>{test.displayedStrength == null ? "—" : format(test.displayedStrength, 0)}</strong>
          <small>{test.age} d</small>
        </div>
      ))}
    </div>
  );
}
