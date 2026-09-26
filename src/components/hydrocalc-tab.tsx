export default function HydroCalcTab() {
  return (
    <section className="embedded-lab" aria-label="Laboratorio de diseño hidráulico">
      <div className="embedded-lab-heading">
        <div>
          <span className="eyebrow">HIDROCALC · JHOEL TOCAS CERCADO</span>
          <h1>Diseño hidráulico</h1>
          <p>Nueve módulos de cálculo · gráficos · teoría · memorias PDF y LaTeX</p>
        </div>
      </div>
      <iframe
        title="HidroCalc: calculadoras interactivas de diseño hidráulico"
        src="/hidrocalc/index.html"
        className="embedded-lab-frame"
      />
    </section>
  );
}
