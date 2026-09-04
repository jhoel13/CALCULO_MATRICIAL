import { describe, expect, it } from "vitest";
import { calculateCompressionTests, calculateMix, calculateTrialAdjustment } from "../src/mix-design/calculations";
import { defaultProject } from "../src/mix-design/default-project";
import { calculateAggregateSummary } from "../src/mix-design/lab-calculations";
import { calculateMethodComparison } from "../src/mix-design/method-calculations";

describe("diseño de mezclas integrado", () => {
  it("reproduce la hoja ACI de referencia y cierra el balance", () => {
    const result = calculateMix(defaultProject.mix);
    expect(result.fcr).toBeCloseTo(245, 3);
    expect(result.wc).toBeCloseTo(0.53, 4);
    expect(result.cement).toBeCloseTo(386.792, 2);
    expect(result.waterToAdd).toBeCloseTo(182.44, 1);
    expect(result.totalWet).toBeCloseTo(2315.9, 1);
    expect(result.effectiveWater / result.cement).toBeCloseTo(0.53, 4);
  });

  it("calcula probetas y ajuste de mezcla de prueba", () => {
    const mix = calculateMix(defaultProject.mix);
    const [sevenDay] = calculateCompressionTests(defaultProject.compressionTests, defaultProject.mix.specimenDiameter, defaultProject.mix.fc, mix.fcr);
    expect(sevenDay.strengthKgfCm2).toBeCloseTo(220.69, 1);
    expect(sevenDay.status).toBe("cumple");

    const adjustment = calculateTrialAdjustment(defaultProject.adjustment);
    expect(adjustment.actualYield).toBeGreaterThan(0.02);
    expect(adjustment.adjustedCement * adjustment.originalWc).toBeCloseTo(adjustment.adjustedWater, 3);
  });

  it("resume ensayos de agregados", () => {
    const result = calculateAggregateSummary(defaultProject.aggregateLab);
    expect(result.fineGradation.finenessModulus).toBeCloseTo(3.75, 2);
    expect(result.fineMoisture.average).toBeCloseTo(0.93, 1);
    expect(result.fines.average).toBeCloseTo(5.98, 1);
    expect(result.abrasion).toBeCloseTo(15, 2);
  });

  it("compara ACI, Walker y Bolomey y optimiza Fuller", () => {
    const result = calculateMethodComparison(defaultProject);
    const walker = result.methods.find((method) => method.id === "walker");
    const bolomey = result.methods.find((method) => method.id === "bolomey");
    expect(walker?.coarseBulkVolume).toBeCloseTo(0.58, 4);
    expect(bolomey?.fineAggregatePercent).toBeCloseTo(40, 2);
    expect(result.fuller.selectedRmse).toBeCloseTo(result.fuller.optimizedRmse, 6);
    expect(result.fuller.points.every((point) => Number.isFinite(point.combinedPassing))).toBe(true);
  });
});
