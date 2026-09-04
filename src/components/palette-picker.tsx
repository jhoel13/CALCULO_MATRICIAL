"use client";

import { Check, Palette } from "lucide-react";
import { useEffect, useState, type CSSProperties } from "react";

const palettes = [
  { id: "ocean", label: "Azul técnico", color: "#1d5fbf" },
  { id: "emerald", label: "Verde laboratorio", color: "#14866d" },
  { id: "violet", label: "Violeta analítico", color: "#7257c7" },
  { id: "coral", label: "Coral concreto", color: "#d95532" },
  { id: "amber", label: "Ámbar mineral", color: "#b97808" },
  { id: "graphite", label: "Grafito profesional", color: "#425466" },
] as const;

type PaletteId = (typeof palettes)[number]["id"];

export default function PalettePicker() {
  const [open, setOpen] = useState(false);
  const [palette, setPalette] = useState<PaletteId>("ocean");

  useEffect(() => {
    const stored = localStorage.getItem("matriz-unc-palette") as PaletteId | null;
    if (stored && palettes.some((item) => item.id === stored)) {
      queueMicrotask(() => setPalette(stored));
    }
  }, []);

  useEffect(() => {
    document.documentElement.dataset.palette = palette;
    localStorage.setItem("matriz-unc-palette", palette);
  }, [palette]);

  const select = (id: PaletteId) => {
    setPalette(id);
    setOpen(false);
  };

  return <div className="palette-picker" onKeyDown={(event) => { if (event.key === "Escape") setOpen(false); }}>
    <button className="palette-picker-trigger" title="Cambiar colores" aria-label="Cambiar colores de la aplicación" aria-expanded={open} onClick={() => setOpen((current) => !current)}>
      <Palette size={17} /><span>Colores</span>
    </button>
    {open && <div className="palette-picker-menu" role="group" aria-label="Paletas disponibles">
      <strong>Elige tu estilo</strong>
      <p>La selección se conserva en este dispositivo.</p>
      <div>{palettes.map((item) => <button key={item.id} className={palette === item.id ? "active" : ""} aria-pressed={palette === item.id} onClick={() => select(item.id)} style={{ "--palette-swatch": item.color } as CSSProperties}>
        <i /> <span>{item.label}</span>{palette === item.id && <Check size={15} />}
      </button>)}</div>
    </div>}
  </div>;
}
