"use client";

import {
  ArrowRight,
  BookOpenCheck,
  Boxes,
  Building2,
  Calculator,
  Download,
  ExternalLink,
  FileCode2,
  Search,
} from "lucide-react";
import { useMemo, useState } from "react";
import { concreteFrameProperties } from "../lib/concrete";
import MatrixTable, { formatNumber } from "./matrix-table";

type Track = "Matricial" | "Ambos" | "Concreto";

type Resource = {
  file: string;
  title: string;
  track: Track;
  family: "Vigas" | "Columnas" | "Losas y escaleras" | "Cimentaciones" | "Sistema";
  relation: string;
};

const originalLab = "https://laboratorio-matricial-unc.jtocasc24-1.chatgpt.site/";

const resources: Resource[] = [
  { file: "Diagramas de Vigas (DFC-DMF).mcdx", title: "Diagramas de vigas DFC–DMF", track: "Matricial", family: "Vigas", relation: "Resultados de fuerzas internas obtenidos desde el modelo K·U=F." },
  { file: "Control de Deflexiones por Flexión en Vigas (NTP. E.060).mcdx", title: "Control de deflexiones", track: "Ambos", family: "Vigas", relation: "Conecta Ec e inercia efectiva con la rigidez EI y los desplazamientos." },
  { file: "Control de Fisuración por Flexión en Vigas (NTP. E.060).mcdx", title: "Control de fisuración", track: "Concreto", family: "Vigas", relation: "Verifica el comportamiento en servicio después del análisis estructural." },
  { file: "Diseño de Vigas (ACI 318-19).mcdx", title: "Diseño de vigas", track: "Ambos", family: "Vigas", relation: "Recibe M, V y N del análisis matricial y usa f'c para diseñar." },
  { file: "Diseño de Vigas Peraltadas por Flexión (NTP. E.060).mcdx", title: "Vigas peraltadas por flexión", track: "Concreto", family: "Vigas", relation: "Dimensiona el refuerzo longitudinal con los momentos calculados." },
  { file: "Diseño de Vigas Peraltadas por Corte (NTP. E.060).mcdx", title: "Vigas peraltadas por corte", track: "Concreto", family: "Vigas", relation: "Dimensiona estribos con el cortante recuperado por elemento." },
  { file: "Diseño de Vigas T (NTP. E.060).mcdx", title: "Diseño de vigas T", track: "Concreto", family: "Vigas", relation: "Comprueba flexión considerando ala y alma de la sección." },
  { file: "Diseño de Vigas con Peralte Mayor a 0.90 m (NTP. E.060).mcdx", title: "Vigas de gran peralte", track: "Concreto", family: "Vigas", relation: "Complementa el diseño para elementos con peralte mayor a 0.90 m." },
  { file: "Diseño de Cerco Perimétrico (NTP. E.060).mcdx", title: "Cerco perimétrico", track: "Ambos", family: "Sistema", relation: "Se modela como pórtico: ensamblaje de rigidez, desplazamientos y diseño." },
  { file: "Diseño de Nudos Viga-Columna (ACI 318-19).mcdx", title: "Nudos viga–columna", track: "Ambos", family: "Sistema", relation: "Usa fuerzas de extremo de vigas y columnas recuperadas en cada nudo." },
  { file: "Predimensionamiento de Elementos Estructurales (NTP. E.060).mcdx", title: "Predimensionamiento estructural", track: "Concreto", family: "Sistema", relation: "Define secciones A e I que alimentan las matrices elementales." },
  { file: "Diseño de Columnas Circulares (ACI 318-19).mcdx", title: "Columnas circulares", track: "Ambos", family: "Columnas", relation: "Integra fuerzas axiales y momentos con la resistencia de la sección." },
  { file: "Diseño de Columnas Circulares Biaxial (ACI 318-19).mcdx", title: "Columnas circulares biaxiales", track: "Ambos", family: "Columnas", relation: "Relaciona el vector [P, Mx, My] con la superficie de interacción." },
  { file: "Diseño de Columnas Rectangulares (ACI 318-19).mcdx", title: "Columnas rectangulares", track: "Ambos", family: "Columnas", relation: "Recibe acciones de extremo del pórtico para comprobar la sección." },
  { file: "Diseño de Columnas Rectangulares Biaxial (ACI 318-19).mcdx", title: "Columnas rectangulares biaxiales", track: "Ambos", family: "Columnas", relation: "Organiza P, Mx y My como vector de demanda biaxial." },
  { file: "Diseño de Losas Aligeradas o Nervadas (ACI 318-19).mcdx", title: "Losas aligeradas o nervadas", track: "Ambos", family: "Losas y escaleras", relation: "Vincula rigideces, distribución de cargas y diseño de nervios." },
  { file: "Diseño de Losas Macizas en 01 Dirección (NTP. E.060).mcdx", title: "Losa maciza en una dirección", track: "Concreto", family: "Losas y escaleras", relation: "Diseña la franja resistente con el momento obtenido del análisis." },
  { file: "Diseño de Losas Macizas en 02 Direcciones (NTP. E.060).mcdx", title: "Losa maciza en dos direcciones", track: "Ambos", family: "Losas y escaleras", relation: "Trabaja con la distribución de momentos Mx y My en ambas direcciones." },
  { file: "Diseño de Escaleras - Caso I (NTP. E.060).mcdx", title: "Escaleras · caso I", track: "Concreto", family: "Losas y escaleras", relation: "Diseño de la losa inclinada a partir de las acciones del modelo." },
  { file: "Diseño de Escaleras - Caso II (NTP. E.060).mcdx", title: "Escaleras · caso II", track: "Concreto", family: "Losas y escaleras", relation: "Variante de apoyo y transmisión de cargas para la escalera." },
  { file: "Diseño de Escaleras - Caso III (NTP. E.060).mcdx", title: "Escaleras · caso III", track: "Concreto", family: "Losas y escaleras", relation: "Tercer esquema resistente para contrastar resultados." },
  { file: "Diseño de Zapata Aislada (NTP. E.060).mcdx", title: "Zapata aislada", track: "Ambos", family: "Cimentaciones", relation: "Transfiere el vector de reacciones [P, Mx, My] al suelo." },
  { file: "Diseño de Zapata Aislada Biaxial (NTP. E.060) (1).mcdx", title: "Zapata aislada biaxial", track: "Ambos", family: "Cimentaciones", relation: "Calcula presiones con carga axial y momentos en dos ejes." },
  { file: "Diseño de Zapata Aislada en L (NTP. E.060).mcdx", title: "Zapata aislada en L", track: "Ambos", family: "Cimentaciones", relation: "Emplea centroides, inercias y excentricidades de geometría irregular." },
  { file: "Diseño de Zapata Combinada (NTP. E.060).mcdx", title: "Zapata combinada", track: "Ambos", family: "Cimentaciones", relation: "Distribuye matricialmente las reacciones de dos columnas sobre la base." },
  { file: "Diseño de Zapata Conectada Rectangular-Circular (NTP. E.060).mcdx", title: "Zapata conectada rectangular–circular", track: "Ambos", family: "Cimentaciones", relation: "Integra dos apoyos y una viga de conexión dentro del mismo sistema." },
];

const filters = ["Todos", "Matricial", "Ambos", "Concreto"] as const;

export default function ConcreteMatrixBridge({ onOpenLab, onApplyConcrete }: { onOpenLab: () => void; onApplyConcrete: (ePa: number) => void }) {
  const [fc, setFc] = useState(210);
  const [b, setB] = useState(30);
  const [h, setH] = useState(50);
  const [length, setLength] = useState(4.5);
  const [load, setLoad] = useState(800);
  const [filter, setFilter] = useState<(typeof filters)[number]>("Todos");
  const [query, setQuery] = useState("");

  const calculation = useMemo(() => {
    return concreteFrameProperties({ fcKgfCm2: fc, widthCm: b, depthCm: h, lengthM: length, uniformLoadKgfM: load });
  }, [fc, b, h, length, load]);

  const visible = resources.filter((resource) => {
    const matchesTrack = filter === "Todos" || resource.track === filter;
    const needle = query.trim().toLocaleLowerCase("es");
    return matchesTrack && (!needle || `${resource.title} ${resource.family} ${resource.relation}`.toLocaleLowerCase("es").includes(needle));
  });

  return <section className="concrete-bridge">
    <div className="bridge-hero">
      <div>
        <span className="eyebrow">AMPLIACIÓN · CONCRETO + MATRICES</span>
        <h1>Del diseño del concreto a la matriz de rigidez</h1>
        <p>Transforma la resistencia del concreto en propiedades mecánicas, observa la matriz local 6×6 y continúa el análisis en el laboratorio existente. Las hojas Mathcad quedan organizadas como memoria de comprobación.</p>
        <div className="bridge-actions">
          <button className="primary" onClick={onOpenLab}><Calculator size={16} />Abrir el estudio matricial<ArrowRight size={16} /></button>
          <a href={originalLab} target="_blank" rel="noreferrer"><ExternalLink size={16} />Abrir versión original</a>
        </div>
      </div>
      <div className="bridge-equation" aria-label="Flujo de cálculo">
        <span>MEZCLA</span><strong>f′c</strong><i>→</i><strong>Ec</strong><i>→</i><strong>EI</strong><i>→</i><strong>k′</strong><i>→</i><strong>K</strong>
        <small>propiedad → sección → elemento → estructura</small>
      </div>
    </div>

    <div className="bridge-workbench">
      <article className="bridge-inputs">
        <div className="bridge-title"><span><Calculator size={17} /></span><div><small>PASO 01</small><h2>Propiedades del elemento</h2></div></div>
        <div className="bridge-form">
          <label>Resistencia f′c <span>kgf/cm²</span><input type="number" min="1" step="10" value={fc} onChange={(event) => setFc(Number(event.target.value))} /></label>
          <label>Ancho b <span>cm</span><input type="number" min="1" step="1" value={b} onChange={(event) => setB(Number(event.target.value))} /></label>
          <label>Peralte h <span>cm</span><input type="number" min="1" step="1" value={h} onChange={(event) => setH(Number(event.target.value))} /></label>
          <label>Longitud L <span>m</span><input type="number" min="0.1" step="0.1" value={length} onChange={(event) => setLength(Number(event.target.value))} /></label>
          <label className="wide">Carga uniforme q <span>kgf/m</span><input type="number" step="50" value={load} onChange={(event) => setLoad(Number(event.target.value))} /></label>
        </div>
        <div className="bridge-metrics">
          <div><span>Ec</span><strong>{formatNumber(calculation.ecKgfCm2, 7)}</strong><small>kgf/cm²</small></div>
          <div><span>A</span><strong>{formatNumber(calculation.areaCm2, 7)}</strong><small>cm²</small></div>
          <div><span>I</span><strong>{formatNumber(calculation.inertiaCm4, 7)}</strong><small>cm⁴</small></div>
          <div><span>δ estimada</span><strong>{formatNumber(calculation.simpleBeamDeflectionCm, 6)}</strong><small>cm</small></div>
        </div>
        <button className="primary full" onClick={() => onApplyConcrete(calculation.ePa)}>Usar este Ec en Materiales<ArrowRight size={16} /></button>
        <p className="bridge-note">Relación académica empleada: Ec = 15 000√f′c para concreto de peso normal. Verifica los parámetros definitivos del proyecto con la edición normativa aplicable.</p>
      </article>

      <article className="bridge-matrix">
        <div className="bridge-title"><span><Boxes size={17} /></span><div><small>PASO 02</small><h2>Matriz local del pórtico</h2></div></div>
        <p>Orden de grados de libertad: [uᵢ, vᵢ, θᵢ, uⱼ, vⱼ, θⱼ]. Los términos axiales dependen de EA/L y los de flexión de EI/L³, EI/L² y EI/L.</p>
        <MatrixTable matrix={calculation.localStiffness} />
        <div className="matrix-caption"><code>k′(Ec, A, I, L)</code><span>6 × 6 · valores en sistema kgf–cm</span></div>
      </article>
    </div>

    <div className="resource-heading">
      <div><span className="eyebrow">BIBLIOTECA TÉCNICA INTEGRADA</span><h2>26 hojas Mathcad clasificadas y descargables</h2><p>“Ambos” identifica los documentos que conectan directamente resultados matriciales con verificaciones de concreto armado.</p></div>
      <div className="resource-stats"><span><strong>{resources.filter((item) => item.track === "Matricial").length}</strong>matricial</span><span><strong>{resources.filter((item) => item.track === "Ambos").length}</strong>ambos</span><span><strong>{resources.filter((item) => item.track === "Concreto").length}</strong>concreto</span></div>
    </div>
    <div className="resource-tools">
      <div className="resource-filters">{filters.map((item) => <button key={item} className={filter === item ? "active" : ""} onClick={() => setFilter(item)}>{item}</button>)}</div>
      <label className="resource-search"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar viga, columna, zapata…" /></label>
    </div>
    <div className="resource-grid">
      {visible.map((resource) => <article key={resource.file}>
        <div className="resource-card-top"><span className={`track-badge track-${resource.track.toLowerCase()}`}>{resource.track}</span><small>{resource.family}</small></div>
        <div className="resource-icon">{resource.family === "Cimentaciones" ? <Building2 /> : resource.track === "Concreto" ? <BookOpenCheck /> : <FileCode2 />}</div>
        <h3>{resource.title}</h3>
        <p>{resource.relation}</p>
        <a href={`/recursos/mathcad/${resource.file}`} download><Download size={15} />Descargar hoja .mcdx</a>
      </article>)}
    </div>
    {!visible.length && <div className="resource-empty">No hay archivos que coincidan con la búsqueda.</div>}
    <div className="academic-warning"><BookOpenCheck size={22} /><div><strong>Uso académico y trazable</strong><p>El laboratorio ejecuta el análisis matricial. Las hojas Mathcad complementan el diseño y deben revisarse antes de emplearse en un proyecto real.</p></div></div>
  </section>;
}
