"use client";

import { ArrowUpRight, BookOpen, ChevronDown, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { SectionTitle } from "./section-ui";

const topics = [
  {
    id: "fundamentos",
    category: "Fundamentos",
    title: "Qué significa diseñar una mezcla",
    lead: "Diseñar no es escoger una receta fija: es equilibrar resistencia, trabajabilidad, durabilidad, economía y control de producción.",
    body: [
      "El objetivo es asignar cantidades de agua, cemento, agregado fino y agregado grueso que produzcan un volumen unitario de concreto y satisfagan los requisitos del proyecto.",
      "La relación agua/cemento controla fuertemente la porosidad de la pasta endurecida. A igualdad de materiales y condiciones, aumentar el agua respecto del cemento suele reducir la resistencia y la durabilidad; pero quitar agua sin controlar la trabajabilidad puede impedir una compactación adecuada.",
      "Por eso el cálculo inicial siempre debe validarse con mezclas de prueba, medición de asentamiento, peso unitario, contenido de aire y ensayos de resistencia.",
    ],
    formula: "a/c = masa de agua efectiva / masa de material cementante",
  },
  {
    id: "aci",
    category: "Método ACI",
    title: "Secuencia de volúmenes absolutos",
    lead: "La ruta ACI selecciona valores iniciales, calcula volúmenes y completa el metro cúbico con agregado fino.",
    body: [
      "La secuencia académica usada en los archivos suministrados sigue ACI 211.1-91: resistencia promedio requerida, agua de mezclado, relación a/c, contenido de cemento, proporción de agregado grueso, aire, volúmenes absolutos y agregado fino por diferencia.",
      "La versión actual ACI PRC-211.1-22 reorganiza y amplía el procedimiento. En un proyecto real deben emplearse sus criterios y las especificaciones contractuales vigentes, no trasladar automáticamente tablas históricas.",
      "Las densidades deben expresarse de manera coherente. Si se usan kg/m³, el volumen absoluto de cada sólido es masa dividida entre densidad; para el agua se adopta aproximadamente 1,000 kg/m³.",
    ],
    formula: "VAF = 1 − (VC + VA + VAG + Vaire)",
  },
  {
    id: "humedad",
    category: "Agregados",
    title: "Humedad, absorción y agua libre",
    lead: "El agregado que llega a la mezcladora rara vez está en condición seca de laboratorio.",
    body: [
      "La humedad total incluye agua absorbida dentro de los poros permeables y agua superficial. La absorción representa el cambio desde condición seca hasta saturada superficialmente seca (SSD).",
      "Si humedad > absorción, el agregado aporta agua libre y debe reducirse el agua que se añade. Si humedad < absorción, el agregado puede tomar agua de la mezcla y la corrección cambia de signo.",
      "La masa húmeda que se pesa se obtiene multiplicando la masa seca por 1 + humedad/100. El agua efectiva debe seguir siendo la requerida por el diseño.",
    ],
    formula: "Agua libre = Pseco × (H − Abs) / 100",
  },
  {
    id: "walker",
    category: "Método Walker",
    title: "Tablas vinculadas al módulo de finura",
    lead: "Walker conecta resistencia, consistencia, tamaño máximo nominal y módulo de finura para estimar la dosificación inicial.",
    body: [
      "La aplicación interpola la relación a/c en la tabla f'cr–a/c y selecciona el agua a partir del intervalo de slump y el tamaño máximo nominal incluidos en el documento suministrado.",
      "El volumen tabulado de agregado grueso es un volumen a granel seco compactado por unidad de concreto. Su masa se obtiene multiplicándolo por el peso unitario seco compactado, no por la gravedad específica de las partículas.",
      "Cuando el módulo de finura queda fuera de 2,40 a 3,20, JT Diseño de Mezclas limita la interpolación al extremo disponible y emite una advertencia. Extrapolar sin datos experimentales daría una falsa precisión.",
    ],
    formula: "PAG = VAG,compactado × PUAG,seco compactado",
  },
  {
    id: "bolomey",
    category: "Método Bolomey",
    title: "Relación resistencia–agua/cemento",
    lead: "El documento académico entrega intervalos de a/c por nivel de resistencia y un reparto inicial entre arena y grava.",
    body: [
      "Para reproducir esa fuente de forma auditable, la app toma el punto medio de cada intervalo de a/c e interpola linealmente con la resistencia promedio requerida f'cr.",
      "La expresión tipográfica del PDF no define con claridad las constantes ni las unidades necesarias para calibrar una ley de Bolomey. Por rigor, la app no inventa esos parámetros y rotula el resultado como intervalo académico.",
      "El porcentaje de arena es editable. El volumen absoluto restante se reparte por masa usando las densidades de cada agregado y después se corrige por humedad y absorción.",
    ],
    formula: "Vagregados = 1 − (Vcemento + Vagua + Vaire)",
  },
  {
    id: "dosificacion",
    category: "Producción",
    title: "Cómo escalar una dosificación",
    lead: "Una mezcla puede expresarse por metro cúbico, bolsa, tanda, volumen de elemento o grupo de probetas.",
    body: [
      "Para una tanda de volumen conocido, todas las cantidades por m³ se multiplican por el mismo volumen. Para dosificar por bolsa se usa como factor el peso de la bolsa dividido entre el cemento por m³.",
      "Los agregados deben conservar la condición de humedad con la que se calculó el agua a añadir. Cambiar la humedad sin recalcular altera la relación a/c efectiva.",
      "Para probetas cilíndricas se calcula el volumen geométrico y se añade una previsión de pérdidas. Esa previsión debe ser razonable y documentada.",
    ],
    formula: "Cantidad de tanda = cantidad por m³ × volumen de tanda",
  },
  {
    id: "ajuste",
    category: "Laboratorio",
    title: "Ajuste de la mezcla de prueba",
    lead: "La primera dosificación es un punto de partida; el ajuste convierte mediciones reales en una nueva iteración.",
    body: [
      "El rendimiento real se obtiene dividiendo la masa total de la tanda entre el peso unitario medido del concreto fresco. Las cantidades reales por m³ usan ese rendimiento, no el volumen nominal supuesto.",
      "Si el asentamiento es menor que el objetivo, la corrección de agua debe seguir el criterio técnico adoptado. Para conservar a/c, un cambio de agua exige recalcular el cemento.",
      "Después se ajustan los agregados para cerrar el peso unitario y se repite la mezcla. También deben observarse cohesión, exudación, facilidad de acabado y contenido de aire.",
    ],
    formula: "Rendimiento = masa total de tanda / peso unitario medido",
  },
  {
    id: "granulometria",
    category: "Agregados",
    title: "Granulometría y módulo de fineza",
    lead: "La distribución de tamaños afecta demanda de agua, cohesión, vacíos y capacidad de empaque.",
    body: [
      "En el tamizado se calcula el porcentaje retenido respecto de la masa total, su acumulado y el porcentaje pasante. El cierre de masa permite detectar errores de digitación o pérdida de material.",
      "El módulo de finura —también llamado módulo de fineza— del agregado fino es la suma de porcentajes retenidos acumulados en las mallas N° 4, 8, 16, 30, 50 y 100, dividida entre 100. Es un índice, no un tamaño máximo ni una aprobación automática.",
      "La conformidad granulométrica se determina con las bandas y excepciones de la especificación aplicable al tamaño nominal y uso del agregado.",
    ],
    formula: "MF = Σ(% retenido acumulado N° 4…N° 100) / 100",
  },
  {
    id: "fuller",
    category: "Fuller y método gráfico",
    title: "Curva ideal y optimización combinada",
    lead: "Fuller define una curva objetivo; el método gráfico busca una proporción de agregados que se acerque a ella.",
    body: [
      "La ecuación P = 100(d/D)^n entrega el porcentaje pasante objetivo para una abertura d y un tamaño máximo D. El documento usa n = 0,50; la app permite cambiarlo y mantiene el valor visible.",
      "Para dos agregados, cada pasante combinado es p·Paf + (1−p)·Pag, donde p es la fracción másica de agregado fino. JT Diseño de Mezclas obtiene el p que minimiza la raíz del error cuadrático medio y permite compararlo con un ajuste manual.",
      "Fuller y el método gráfico evalúan la granulometría del conjunto. No determinan por sí solos el agua, el cemento, el aire ni la durabilidad; por eso no se presentan como una cuarta dosificación equivalente a ACI, Walker o Bolomey.",
    ],
    formula: "P = 100(d/D)ⁿ ; Pcomb = p·Paf + (1−p)·Pag",
  },
  {
    id: "comparacion-metodos",
    category: "Criterio técnico",
    title: "Qué significa comparar métodos",
    lead: "Una diferencia numérica no demuestra que un método sea universalmente mejor.",
    body: [
      "La comparación mantiene f'cr, materiales, aire, humedades y límite de durabilidad comunes. Así se identifica qué diferencias provienen de cada tabla o regla de proporción.",
      "ACI 211.1-22 considera gradación, trabajabilidad, resistencia y durabilidad mediante volúmenes absolutos. ACI 211.10-24 explica herramientas de granulometría combinada, pero expresamente las trata como herramientas de evaluación y ejemplos, no como recomendaciones únicas.",
      "La selección final requiere tandas de prueba con los materiales reales y ajustes documentados por rendimiento, asentamiento, cohesión, contenido de aire, densidad y resistencia.",
    ],
  },
  {
    id: "ensayos-agregados",
    category: "Normas de ensayo",
    title: "Ensayos habituales de agregados",
    lead: "Cada propiedad de entrada debe tener un método de ensayo, fecha, muestra y condición identificables.",
    body: [
      "ASTM C136/C136M cubre el análisis granulométrico; ASTM C117, material más fino que 75 μm por lavado; ASTM C566, humedad evaporable; ASTM C29/C29M, peso unitario y vacíos.",
      "ASTM C127 y ASTM C128 cubren gravedad específica y absorción de agregado grueso y fino, respectivamente. ASTM C131/C131M se usa para degradación de agregado grueso pequeño por abrasión e impacto.",
      "ASTM C33/C33M establece requisitos para agregados de concreto. Los límites cambian según clasificación, exposición y especificación, por lo que no conviene convertir un valor aislado en una regla universal.",
    ],
  },
  {
    id: "compresion",
    category: "Control de calidad",
    title: "Resistencia a compresión",
    lead: "La resistencia es la carga máxima dividida entre el área transversal corregida según el procedimiento aplicable.",
    body: [
      "Para una probeta cilíndrica, el área nominal es πd²/4. Si la carga se registra en toneladas-fuerza, se multiplica por 1,000 para obtener kgf antes de dividir entre cm².",
      "Los resultados tempranos sirven para seguimiento, pero una proyección a 14 o 28 días no reemplaza el ensayo. Curado, refrentado, velocidad de carga, dimensiones y modo de falla influyen en el resultado.",
      "ASTM C39/C39M describe el ensayo de compresión de especímenes cilíndricos. La aceptación de una obra se evalúa con el conjunto de resultados y las especificaciones, no con una sola probeta aislada.",
    ],
    formula: "f = carga máxima / área transversal",
  },
  {
    id: "unidades",
    category: "Buenas prácticas",
    title: "Unidades y comprobaciones",
    lead: "La mayoría de errores graves de una hoja de cálculo provienen de unidades mezcladas o condiciones de masa distintas.",
    body: [
      "Documente si cada agregado está seco, SSD o húmedo. No compare directamente un peso seco con uno húmedo sin convertirlos.",
      "1 MPa equivale aproximadamente a 10.1972 kgf/cm²; 1 kgf/cm² equivale a 0.0980665 MPa. Una tonelada-fuerza equivale a 1,000 kgf.",
      "Compruebe que los volúmenes absolutos sumen 1 m³, que el agua efectiva cierre, que no haya entradas nulas y que el peso unitario resultante sea físicamente razonable para los materiales usados.",
    ],
    formula: "1 kgf/cm² ≈ 0.0980665 MPa",
  },
  {
    id: "errores",
    category: "Buenas prácticas",
    title: "Errores frecuentes que conviene detectar",
    lead: "Una interfaz rápida no sustituye las comprobaciones de ingeniería.",
    body: [
      "Usar humedad como si fuera absorción; restar agua superficial dos veces; ingresar una gravedad específica adimensional donde se esperaba densidad en kg/m³; o confundir pulgada de slump con centímetros.",
      "Aplicar un límite de tabla sin comprobar tamaño nominal, aire incorporado, exposición o tipo de elemento; proyectar resistencia como si fuera un resultado real; y producir sin una mezcla de prueba representativa.",
      "Mantenga trazabilidad de fuente, fecha, muestra, responsable y versión de norma. Cuando cambie la cantera, el lote de cemento o la humedad, revise el diseño.",
    ],
  },
];

const references = [
  { code: "ACI PRC-211.1-22", title: "Selecting Proportions for Normal-Density and High-Density Concrete", href: "https://www.concrete.org/store/productdetail.aspx?ItemID=211122" },
  { code: "ACI PRC-211.10-24", title: "Assessing Combined Aggregate Gradings", href: "https://www.concrete.org/store/productdetail.aspx?ItemID=2111024" },
  { code: "ASTM C33/C33M-24a", title: "Concrete Aggregates", href: "https://store.astm.org/c0033_c0033m-24a.html" },
  { code: "ASTM C127-25", title: "Relative Density and Absorption of Coarse Aggregate", href: "https://store.astm.org/c0127-25.html" },
  { code: "ASTM C128-25", title: "Relative Density and Absorption of Fine Aggregate", href: "https://store.astm.org/c0128-25.html" },
  { code: "Fuller & Thompson (1907)", title: "The Laws of Proportioning Concrete · registro ASCE", href: "https://ascelibrary.org/doi/10.1061/TACEAT.0001979" },
  { code: "RNE E.060", title: "Concreto Armado · publicación oficial peruana", href: "https://www.gob.pe/institucion/munisantamariadelmar/informes-publicaciones/2619713-e-060-concreto-armado-ds-n-010-2009" },
  { code: "ASTM · Serie C", title: "Índice oficial de normas para cemento y concreto", href: "https://store.astm.org/products-services/standards-and-publications/standards/cement-standards-and-concrete-standards.html" },
];

export default function TheorySection() {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState("aci");
  const filtered = useMemo(() => {
    const needle = query.trim().toLocaleLowerCase("es");
    if (!needle) return topics;
    return topics.filter((topic) => [topic.category, topic.title, topic.lead, ...topic.body].join(" ").toLocaleLowerCase("es").includes(needle));
  }, [query]);

  return (
    <div className="workspace-page theory-page">
      <SectionTitle
        eyebrow="Biblioteca técnica"
        title="Teoría para entender cada cálculo"
        description="Conceptos, fórmulas, normas y errores frecuentes explicados con el mismo vocabulario de la aplicación."
      />

      <div className="theory-search">
        <Search size={19} />
        <input aria-label="Buscar en teoría" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Buscar: humedad, relación a/c, granulometría, compresión…" />
        <span>{filtered.length} temas</span>
      </div>

      <div className="module-grid theory-layout">
        <div className="theory-list">
          {filtered.map((topic, index) => {
            const isOpen = open === topic.id;
            return (
              <article className={`theory-topic ${isOpen ? "open" : ""}`} key={topic.id}>
                <button onClick={() => setOpen(isOpen ? "" : topic.id)}>
                  <span>{String(index + 1).padStart(2, "0")}</span>
                  <span><small>{topic.category}</small><strong>{topic.title}</strong><em>{topic.lead}</em></span>
                  <ChevronDown size={19} />
                </button>
                {isOpen && <div className="theory-body">{topic.body.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}{topic.formula && <div className="theory-formula"><span>FÓRMULA CLAVE</span><code>{topic.formula}</code></div>}</div>}
              </article>
            );
          })}
          {filtered.length === 0 && <div className="empty-theory"><Search size={24} /><strong>No encontramos ese término.</strong><span>Prueba con “agua”, “agregado”, “ACI” o “probetas”.</span></div>}
        </div>

        <aside className="module-stack theory-aside">
          <section className="module-panel current-standard-card">
            <BookOpen size={24} />
            <span>EDICIÓN ACTUAL</span>
            <h2>ACI PRC-211.1-22</h2>
            <p>La aplicación reproduce el flujo académico de los formatos ACI 211.1-91 suministrados. Para trabajos actuales, consulte la guía 2022 y la normativa local aplicable.</p>
            <a href="https://www.concrete.org/store/productdetail.aspx?ItemID=211122" target="_blank" rel="noreferrer">Abrir fuente oficial <ArrowUpRight size={16} /></a>
          </section>

          <section className="module-panel">
            <div className="module-heading"><span><BookOpen size={18} /></span><div><h2>Referencias oficiales</h2><p>Enlaces para verificar el alcance y la edición vigente.</p></div></div>
            <div className="theory-references">
              {references.map((reference) => <a key={reference.code} href={reference.href} target="_blank" rel="noreferrer"><span><strong>{reference.code}</strong><small>{reference.title}</small></span><ArrowUpRight size={15} /></a>)}
            </div>
          </section>

          <section className="module-panel theory-notice">
            <strong>Antes de usar una dosificación</strong>
            <p>Confirme requisitos del proyecto, caracterice materiales representativos, prepare tandas de prueba y documente cualquier ajuste.</p>
          </section>
        </aside>
      </div>
    </div>
  );
}
