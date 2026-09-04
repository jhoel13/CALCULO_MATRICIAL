import type {
  CompressionResult,
  MixInputs,
  MixResults,
  TrialAdjustmentInputs,
  TrialAdjustmentResults,
  CompressionTest,
} from "./types";

const safeDivide = (numerator: number, denominator: number, fallback = 0) =>
  Number.isFinite(numerator) && Number.isFinite(denominator) && denominator !== 0
    ? numerator / denominator
    : fallback;

export const round = (value: number, digits = 2) => {
  const factor = 10 ** digits;
  return Math.round((value + Number.EPSILON) * factor) / factor;
};

export function calculateMix(input: MixInputs): MixResults {
  const warnings: string[] = [];
  const fcr = input.fc + input.strengthMargin;
  const wcByStrength =
    input.wcPoint1 +
    safeDivide(
      (fcr - input.strengthPoint1) * (input.wcPoint2 - input.wcPoint1),
      input.strengthPoint2 - input.strengthPoint1,
    );
  const wc = Math.min(wcByStrength, input.durabilityWcLimit || wcByStrength);
  const cement = safeDivide(input.water, wc);
  const bagsPerM3 = safeDivide(cement, input.bagWeight);
  const cementVolume = safeDivide(cement, input.cementDensity);
  const waterVolume = input.water / 1000;
  const coarseDry = input.coarseVolume * input.coarseUnitWeight;
  const coarseAbsoluteVolume = safeDivide(coarseDry, input.coarseDensity);
  const airVolume = input.airContent / 100;
  const knownVolume = cementVolume + waterVolume + coarseAbsoluteVolume + airVolume;
  const fineAbsoluteVolume = Math.max(0, 1 - knownVolume);
  const fineDry = fineAbsoluteVolume * input.fineDensity;
  const coarseWet = coarseDry * (1 + input.coarseMoisture / 100);
  const fineWet = fineDry * (1 + input.fineMoisture / 100);
  const coarseFreeWater =
    (coarseDry * (input.coarseMoisture - input.coarseAbsorption)) / 100;
  const fineFreeWater =
    (fineDry * (input.fineMoisture - input.fineAbsorption)) / 100;
  const freeWater = coarseFreeWater + fineFreeWater;
  const waterToAdd = input.water - freeWater;
  const effectiveWater = waterToAdd + freeWater;
  const totalDry = cement + input.water + coarseDry + fineDry;
  const totalWet = cement + waterToAdd + coarseWet + fineWet;
  const specimenVolume =
    (Math.PI * (input.specimenDiameter / 100) ** 2 * (input.specimenHeight / 100)) /
    4 *
    input.specimenCount *
    (1 + input.waste / 100);
  const dryRatio: [number, number, number] = [
    1,
    safeDivide(fineDry, cement),
    safeDivide(coarseDry, cement),
  ];
  const wetRatio: [number, number, number] = [
    1,
    safeDivide(fineWet, cement),
    safeDivide(coarseWet, cement),
  ];

  if (fineAbsoluteVolume <= 0) {
    warnings.push("Los volúmenes conocidos superan 1 m³; revise densidades, aire y agregado grueso.");
  }
  if (waterToAdd < 0) {
    warnings.push("El agua libre de los agregados supera el agua de diseño.");
  }
  if (wc > 0.65 || wc < 0.3) {
    warnings.push("La relación a/c está fuera del rango habitual de trabajo; verifique el criterio adoptado.");
  }
  if (wcByStrength > input.durabilityWcLimit) {
    warnings.push("Controla el límite de durabilidad, más restrictivo que la relación por resistencia.");
  }

  return {
    fcr,
    wcByStrength,
    wc,
    cement,
    bagsPerM3,
    cementVolume,
    waterVolume,
    coarseDry,
    coarseAbsoluteVolume,
    knownVolume,
    fineAbsoluteVolume,
    fineDry,
    coarseWet,
    fineWet,
    coarseFreeWater,
    fineFreeWater,
    freeWater,
    waterToAdd,
    effectiveWater,
    totalDry,
    totalWet,
    specimenVolume,
    unitWeight: totalWet,
    dryRatio,
    wetRatio,
    warnings,
  };
}

export function calculateCompressionTests(
  tests: CompressionTest[],
  diameterCm: number,
  fc: number,
  fcr: number,
): CompressionResult[] {
  const areaCm2 = (Math.PI * diameterCm ** 2) / 4;
  const firstReal = tests.find((test) => test.loadTf != null && test.loadTf > 0);
  const firstRealStrength = firstReal
    ? safeDivide((firstReal.loadTf ?? 0) * 1000, areaCm2)
    : null;

  return tests.map((test) => {
    const referenceStrength = fcr * test.maturityFactor;
    const referenceLoadTf = (referenceStrength * areaCm2) / 1000;
    const strengthKgfCm2 =
      test.loadTf != null ? safeDivide(test.loadTf * 1000, areaCm2) : null;
    const strengthMpa = strengthKgfCm2 != null ? strengthKgfCm2 * 0.0980665 : null;
    const projectedStrength =
      strengthKgfCm2 == null && firstRealStrength != null && firstReal
        ? firstRealStrength * safeDivide(test.maturityFactor, firstReal.maturityFactor)
        : null;
    const displayedStrength = strengthKgfCm2 ?? projectedStrength;
    const displayedLoadTf =
      test.loadTf ?? (displayedStrength != null ? (displayedStrength * areaCm2) / 1000 : null);
    const percentFcr =
      strengthKgfCm2 != null ? safeDivide(strengthKgfCm2 * 100, fcr) : null;
    const percentFc =
      strengthKgfCm2 != null ? safeDivide(strengthKgfCm2 * 100, fc) : null;
    const isProjected = test.loadTf == null && projectedStrength != null;
    const status: CompressionResult["status"] =
      test.loadTf == null
        ? isProjected
          ? "proyectado"
          : "pendiente"
        : strengthKgfCm2 != null && strengthKgfCm2 >= referenceStrength
          ? "cumple"
          : "revisar";

    return {
      ...test,
      areaCm2,
      referenceStrength,
      referenceLoadTf,
      strengthKgfCm2,
      strengthMpa,
      percentFcr,
      percentFc,
      displayedStrength,
      displayedLoadTf,
      isProjected,
      status,
    };
  });
}

export function calculateTrialAdjustment(
  input: TrialAdjustmentInputs,
): TrialAdjustmentResults {
  const cementBatch = input.cementDry * input.nominalVolume;
  const totalBatchWeight =
    cementBatch + input.waterAddedBatch + input.fineWetBatch + input.coarseWetBatch;
  const actualYield = safeDivide(totalBatchWeight, input.measuredUnitWeight, input.nominalVolume);
  const fineSurfaceMoisture = input.fineMoisture - input.fineAbsorption;
  const coarseSurfaceMoisture = input.coarseMoisture - input.coarseAbsorption;
  const fineWaterBatch = input.fineDry * input.nominalVolume * (fineSurfaceMoisture / 100);
  const coarseWaterBatch =
    input.coarseDry * input.nominalVolume * (coarseSurfaceMoisture / 100);
  const actualWaterBatch = input.waterAddedBatch + fineWaterBatch + coarseWaterBatch;
  const waterPerM3 = safeDivide(actualWaterBatch, actualYield);
  const slumpCorrection =
    Math.max(0, input.targetSlumpIn - input.measuredSlumpIn) * input.waterCorrectionPerInch;
  const adjustedWater = waterPerM3 + slumpCorrection;
  const originalWc = safeDivide(input.waterDry, input.cementDry);
  const adjustedCement = safeDivide(adjustedWater, originalWc);
  const coarseWetPerM3 = safeDivide(input.coarseWetBatch, actualYield);
  const coarseDryAdjusted = safeDivide(coarseWetPerM3, 1 + input.coarseMoisture / 100);
  const coarseSsd = coarseDryAdjusted * (1 + input.coarseAbsorption / 100);
  const fineSsd = input.measuredUnitWeight - adjustedCement - adjustedWater - coarseSsd;
  const fineDryAdjusted = safeDivide(fineSsd, 1 + input.fineAbsorption / 100);
  const fineWetAdjusted = fineDryAdjusted * (1 + input.fineMoisture / 100);
  const coarseWetAdjusted = coarseDryAdjusted * (1 + input.coarseMoisture / 100);
  const freeWaterAdjusted =
    fineDryAdjusted * (fineSurfaceMoisture / 100) +
    coarseDryAdjusted * (coarseSurfaceMoisture / 100);
  const waterToAddAdjusted = adjustedWater - freeWaterAdjusted;
  const totalWetAdjusted =
    adjustedCement + fineWetAdjusted + coarseWetAdjusted + waterToAddAdjusted;

  return {
    cementBatch,
    totalBatchWeight,
    actualYield,
    fineSurfaceMoisture,
    coarseSurfaceMoisture,
    fineWaterBatch,
    coarseWaterBatch,
    actualWaterBatch,
    waterPerM3,
    slumpCorrection,
    adjustedWater,
    originalWc,
    adjustedCement,
    coarseWetPerM3,
    coarseDryAdjusted,
    coarseSsd,
    fineSsd,
    fineDryAdjusted,
    fineWetAdjusted,
    coarseWetAdjusted,
    freeWaterAdjusted,
    waterToAddAdjusted,
    totalWetAdjusted,
  };
}

export function quantitiesForVolume(results: MixResults, volume: number) {
  return {
    cement: results.cement * volume,
    water: results.waterToAdd * volume,
    fine: results.fineWet * volume,
    coarse: results.coarseWet * volume,
    total: results.totalWet * volume,
  };
}

export function quantitiesPerBag(results: MixResults, bagWeight: number) {
  const factor = safeDivide(bagWeight, results.cement);
  return quantitiesForVolume(results, factor);
}
