export default function SoilLabTab() {
  return (
    <section aria-label="Laboratorio de mecánica de suelos" style={{ paddingTop: 28 }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          flexWrap: "wrap",
          gap: 16,
          marginBottom: 18,
          padding: "20px 24px",
          border: "1px solid var(--line)",
          background: "var(--sheet)",
        }}
      >
        <div>
          <span className="eyebrow">GEOLAB · JHOEL TOCAS CERCADO</span>
          <h1 style={{ margin: "6px 0" }}>Mecánica de suelos y cimentaciones</h1>
          <p style={{ margin: 0, color: "var(--muted)" }}>
            12 capítulos · 37 calculadoras · teoría, gráficas y desarrollo paso a paso
          </p>
        </div>
      </div>
      <iframe
        title="GeoLab: calculadoras interactivas de mecánica de suelos"
        src="/geolab/index.html"
        style={{
          display: "block",
          width: "100%",
          height: "calc(100dvh - 205px)",
          minHeight: 690,
          border: "1px solid var(--line)",
          background: "#eaf0f5",
        }}
      />
    </section>
  );
}
