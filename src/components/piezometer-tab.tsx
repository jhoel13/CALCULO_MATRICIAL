const simulatorPath = "/piezometro/simulador.html?model=unconfined#p1";

export default function PiezometerTab() {
  return (
    <section className="embedded-lab" aria-label="Laboratorio de piezometría y agua subterránea">
      <div className="embedded-lab-heading">
        <div>
          <span className="eyebrow">PIEZÓMETRO 3D · AGUA SUBTERRÁNEA</span>
          <h1>Simulación del acuífero</h1>
          <p>Ocho casos · vista 3D, mapas y perfiles · comparación de soluciones</p>
        </div>
        <div className="piezometer-actions">
          <a href={simulatorPath} target="_blank" rel="noopener noreferrer">Abrir en ventana completa</a>
          <a href="https://github.com/jhoel13/CALCULO_MATRICIAL/archive/refs/heads/main.zip">Descargar código del proyecto</a>
        </div>
      </div>
      <iframe
        title="Piezómetro 3D: simulación y soluciones de agua subterránea"
        src={simulatorPath}
        className="embedded-lab-frame"
        allowFullScreen
      />
    </section>
  );
}
