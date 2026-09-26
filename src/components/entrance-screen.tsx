"use client";

import { ArrowRight } from "lucide-react";
import { useState } from "react";

export default function EntranceScreen({ onEnter }: { onEnter: () => void }) {
  const [leaving, setLeaving] = useState(false);

  const enter = () => {
    if (leaving) return;
    setLeaving(true);
    const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    window.setTimeout(onEnter, reducedMotion ? 0 : 580);
  };

  return (
    <section className={`entrance-screen${leaving ? " is-leaving" : ""}`} aria-label="Portada del laboratorio de ingeniería hidráulica">
      <div className="entrance-art">
        <img
          src="/unc-ingenieria-hidraulica.webp"
          alt="Universidad Nacional de Cajamarca, Ingeniería Hidráulica, Jhoel Tocas Cercado: escudo universitario con obras civiles, suelos, puente, agua y fórmulas de ingeniería"
          fetchPriority="high"
        />
      </div>
      <div className="entrance-action">
        <span className="entrance-kicker">UNIVERSIDAD NACIONAL DE CAJAMARCA</span>
        <h1>Laboratorio digital</h1>
        <p>Matrices, concreto, mecánica de suelos y diseño hidráulico en un solo espacio.</p>
        <button type="button" onClick={enter} disabled={leaving}>
          <span>Entrar al laboratorio</span>
          <ArrowRight size={20} aria-hidden="true" />
        </button>
      </div>
    </section>
  );
}
