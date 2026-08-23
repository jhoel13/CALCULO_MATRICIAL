import type { StructuralProject, UnitSystem } from "./types";

export const unitFactor = {
  length: { mm: 1e-3, cm: 1e-2, m: 1 },
  area: { "mm²": 1e-6, "cm²": 1e-4, "m²": 1 },
  inertia: { "mm⁴": 1e-12, "cm⁴": 1e-8, "m⁴": 1 },
  force: { N: 1, kN: 1e3, kgf: 9.80665, tf: 9806.65 },
  stress: { Pa: 1, kPa: 1e3, MPa: 1e6, GPa: 1e9, "kgf/cm²": 98066.5, "kN/cm²": 1e7 },
} as const;

export const toSI = {
  length: (value: number, units: UnitSystem) => value * unitFactor.length[units.length],
  displacement: (value: number, units: UnitSystem) => value * unitFactor.length[units.displacement],
  area: (value: number, units: UnitSystem) => value * unitFactor.area[units.area],
  inertia: (value: number, units: UnitSystem) => value * unitFactor.inertia[units.inertia],
  force: (value: number, units: UnitSystem) => value * unitFactor.force[units.force],
  stress: (value: number, units: UnitSystem) => value * unitFactor.stress[units.stress],
  moment: (value: number, units: UnitSystem) => value * unitFactor.force[units.force] * unitFactor.length[units.length],
  lineLoad: (value: number, units: UnitSystem) => value * unitFactor.force[units.force] / unitFactor.length[units.length],
};

export const fromSI = {
  length: (value: number, units: UnitSystem) => value / unitFactor.length[units.length],
  displacement: (value: number, units: UnitSystem) => value / unitFactor.length[units.displacement],
  force: (value: number, units: UnitSystem) => value / unitFactor.force[units.force],
  stress: (value: number, units: UnitSystem) => value / unitFactor.stress[units.stress],
  moment: (value: number, units: UnitSystem) => value / (unitFactor.force[units.force] * unitFactor.length[units.length]),
};

export function convertProjectUnits(project: StructuralProject, requested: Partial<UnitSystem>): StructuralProject {
  const next = structuredClone(project);
  const old = project.units;
  const units = { ...old, ...requested };
  const ratio = {
    length: unitFactor.length[old.length] / unitFactor.length[units.length],
    displacement: unitFactor.length[old.displacement] / unitFactor.length[units.displacement],
    area: unitFactor.area[old.area] / unitFactor.area[units.area],
    inertia: unitFactor.inertia[old.inertia] / unitFactor.inertia[units.inertia],
    force: unitFactor.force[old.force] / unitFactor.force[units.force],
    stress: unitFactor.stress[old.stress] / unitFactor.stress[units.stress],
  };
  for (const node of next.nodes) {
    node.x *= ratio.length;
    node.y *= ratio.length;
    node.loads.fx *= ratio.force;
    node.loads.fy *= ratio.force;
    node.loads.mz *= ratio.force * ratio.length;
    for (const constraint of [node.constraints.ux, node.constraints.uy]) {
      if (constraint.kind === "prescribed") constraint.value = (constraint.value ?? 0) * ratio.displacement;
    }
  }
  for (const element of next.elements) {
    element.A *= ratio.area;
    element.E *= ratio.stress;
    element.I *= ratio.inertia;
    if (element.depth) element.depth *= ratio.length;
    for (const load of element.loads) {
      if (load.kind === "distributed-y") {
        load.start *= ratio.force / ratio.length;
        load.end *= ratio.force / ratio.length;
      } else if (load.kind === "moment") load.value *= ratio.force * ratio.length;
      else load.value *= ratio.force;
    }
  }
  next.units = units;
  return next;
}
