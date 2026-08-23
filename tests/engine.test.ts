import { describe, expect, it } from "vitest";
import { analyzeProject, physicalResidual } from "../src/lib/engine";
import {
  blankProject,
  cloneProject,
  notebookExample1,
  notebookExample2,
  pdfFrameExample,
  pdfFrameVExample,
  pdfMemberLoadsExample,
} from "../src/lib/examples";
import { convertProjectUnits } from "../src/lib/units";

const close = (actual: number, expected: number, relative = 1e-6) => {
  const scale = Math.max(1, Math.abs(actual), Math.abs(expected));
  expect(Math.abs(actual - expected)).toBeLessThanOrEqual(relative * scale);
};

describe("motor matricial", () => {
  it("reproduce el Ejemplo 1 adjunto con unidades físicas", () => {
    const result = analyzeProject(notebookExample1);
    expect(result.ok).toBe(true);
    expect(result.globalK).toHaveLength(12);
    expect(result.elementCalculations).toHaveLength(9);
    close(result.displacements[2] / 0.01, 0.0375, 1e-5);
    close(result.displacements[3] / 0.01, -0.0805451, 1e-5);
    close(result.displacements[4] / 0.01, 0.063, 1e-5);
    close(result.reactions[0] / 9.80665, -6000, 1e-5);
    close(result.reactions[1] / 9.80665, 166.6666667, 1e-5);
    close(result.reactions[5] / 9.80665, 2833.3333333, 1e-5);
    close(result.elementResults[0].axialForce / 9.80665, 6250, 1e-5);
    expect(result.equilibrium.passed).toBe(true);
    expect(Math.max(...physicalResidual(result).map(Math.abs))).toBeLessThan(1e-6);
  });

  it("resuelve el Ejemplo 2 de 28 nodos y 58 barras", () => {
    const result = analyzeProject(notebookExample2);
    expect(result.ok).toBe(true);
    expect(result.dofs).toHaveLength(56);
    expect(result.elementCalculations).toHaveLength(58);
    expect(result.free).toHaveLength(53);
    expect(result.equilibrium.passed).toBe(true);
    expect(result.solver.relativeResidual).toBeLessThan(1e-10);
  });

  it("resuelve los tres casos de pórtico tomados del PDF", () => {
    for (const project of [pdfFrameExample, pdfFrameVExample, pdfMemberLoadsExample]) {
      const result = analyzeProject(project);
      expect(result.ok, project.metadata.name).toBe(true);
      expect(result.equilibrium.passed, project.metadata.name).toBe(true);
      expect(result.solver.relativeResidual).toBeLessThan(1e-10);
    }
    const loaded = analyzeProject(pdfMemberLoadsExample);
    expect(Math.max(...loaded.memberLoadVector.map(Math.abs))).toBeGreaterThan(0);
  });

  it("conserva la respuesta al convertir todas las unidades", () => {
    const base = analyzeProject(notebookExample1);
    const convertedProject = convertProjectUnits(notebookExample1, {
      length: "m",
      displacement: "mm",
      area: "m²",
      inertia: "m⁴",
      force: "kN",
      stress: "GPa",
    });
    const converted = analyzeProject(convertedProject);
    expect(converted.ok).toBe(true);
    converted.displacements.forEach((value, index) => close(value, base.displacements[index], 1e-8));
    converted.reactions.forEach((value, index) => close(value, base.reactions[index], 1e-8));
  });

  it("bloquea geometría inválida y detecta mecanismos", () => {
    const invalid = cloneProject(notebookExample1);
    invalid.elements.push({ ...invalid.elements[0], id: "dup", number: 99 });
    expect(analyzeProject(invalid).diagnostics.some((item) => item.code === "DUPLICATE_ELEMENT")).toBe(true);

    const mechanism = blankProject("truss2d");
    mechanism.nodes.forEach((node) => {
      node.constraints.ux = { kind: "free" };
      node.constraints.uy = { kind: "free" };
    });
    const result = analyzeProject(mechanism);
    expect(result.ok).toBe(false);
    expect(result.diagnostics.some((item) => item.code === "SINGULAR_SYSTEM")).toBe(true);
  });

  it("crea plantillas nuevas estables, ordenadas y numeradas", () => {
    const truss = blankProject("truss2d");
    const frame = blankProject("frame2d");
    expect(truss.nodes.map((node) => node.number)).toEqual([1, 2, 3]);
    expect(truss.elements.map((element) => element.number)).toEqual([1, 2, 3]);
    expect(frame.nodes.map((node) => node.number)).toEqual([1, 2, 3, 4]);
    expect(frame.elements.map((element) => element.number)).toEqual([1, 2, 3]);
    for (const project of [truss, frame]) {
      const result = analyzeProject(project);
      expect(result.ok, project.metadata.name).toBe(true);
      expect(result.equilibrium.passed, project.metadata.name).toBe(true);
    }
  });

  it("genera transformaciones ortogonales y matrices simétricas", () => {
    const result = analyzeProject(pdfFrameExample);
    for (const element of result.elementCalculations) {
      close(element.c ** 2 + element.s ** 2, 1, 1e-12);
      expect(element.symmetryError).toBeLessThan(1e-10);
    }
  });
});
