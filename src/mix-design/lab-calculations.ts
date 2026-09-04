import type {
  AggregateLabData,
  FinesSample,
  MoistureSample,
  SieveReading,
} from "./types";

const divide = (a: number, b: number) => (b === 0 ? 0 : a / b);

export function calculateSieveAnalysis(rows: SieveReading[]) {
  const total = rows.reduce((sum, row) => sum + Math.max(0, row.retainedG), 0);
  let cumulative = 0;
  const analysis = rows.map((row) => {
    const retainedPercent = divide(Math.max(0, row.retainedG) * 100, total);
    cumulative += retainedPercent;
    return {
      ...row,
      retainedPercent,
      cumulativePercent: cumulative,
      passingPercent: Math.max(0, 100 - cumulative),
    };
  });
  // ASTM-style fine-aggregate series. Matching by aperture keeps the calculation
  // valid when a laboratory writes 4.75 mm instead of 4.76 mm or changes the label.
  const finenessOpenings = [4.75, 2.36, 1.18, 0.6, 0.3, 0.15];
  const finenessRows = finenessOpenings
    .map((opening) =>
      analysis.find(
        (row) =>
          row.openingMm != null &&
          Math.abs(row.openingMm - opening) <= Math.max(0.015, opening * 0.015),
      ),
    )
    .filter((row): row is (typeof analysis)[number] => row != null);
  const finenessModulus =
    finenessRows.reduce((sum, row) => sum + row.cumulativePercent, 0) / 100;
  const finenessComplete = finenessRows.length === finenessOpenings.length;
  const errorPercent = total > 0 ? Math.abs(100 - analysis.at(-1)!.cumulativePercent) : 100;
  return {
    total,
    analysis,
    finenessModulus,
    finenessComplete,
    finenessRows,
    errorPercent,
  };
}

export function classifyFinenessModulus(value: number, complete = true) {
  if (!complete) return "Serie incompleta";
  if (value < 2.3) return "Muy fina / revisar";
  if (value < 2.6) return "Fina";
  if (value < 2.9) return "Media";
  if (value <= 3.2) return "Gruesa";
  return "Muy gruesa / revisar";
}

export function moisturePercent(sample: MoistureSample) {
  const water = sample.wetWithContainer - sample.dryWithContainer;
  const drySample = sample.dryWithContainer - sample.container;
  return divide(water * 100, drySample);
}

export function finesPercent(sample: FinesSample) {
  return divide((sample.initialDry - sample.washedDry) * 100, sample.initialDry);
}

export function statistics(values: number[]) {
  const valid = values.filter(Number.isFinite);
  const average = valid.length ? valid.reduce((sum, value) => sum + value, 0) / valid.length : 0;
  const variance =
    valid.length > 1
      ? valid.reduce((sum, value) => sum + (value - average) ** 2, 0) / (valid.length - 1)
      : 0;
  const standardDeviation = Math.sqrt(variance);
  const coefficientVariation = average === 0 ? 0 : (standardDeviation / average) * 100;
  return { average, standardDeviation, coefficientVariation };
}

export function voidsPercent(specificGravity: number, unitWeight: number) {
  return divide((specificGravity * 1000 - unitWeight) * 100, specificGravity * 1000);
}

export function calculateAggregateSummary(data: AggregateLabData) {
  const fineGradation = calculateSieveAnalysis(data.fineSieve);
  const coarseGradation = calculateSieveAnalysis(data.coarseSieve);
  const fineMoisture = statistics(data.fineMoistureSamples.map(moisturePercent));
  const coarseMoisture = statistics(data.coarseMoistureSamples.map(moisturePercent));
  const fines = statistics(data.finesSamples.map(finesPercent));
  const abrasion = divide(
    (data.abrasionInitial - data.abrasionRetained) * 100,
    data.abrasionInitial,
  );
  return {
    fineGradation,
    coarseGradation,
    fineMoisture,
    coarseMoisture,
    fines,
    fineVoidsLoose: voidsPercent(data.fineSpecificGravity, data.fineUnitWeightLoose),
    fineVoidsCompacted: voidsPercent(data.fineSpecificGravity, data.fineUnitWeightCompacted),
    coarseVoidsLoose: voidsPercent(data.coarseSpecificGravity, data.coarseUnitWeightLoose),
    coarseVoidsCompacted: voidsPercent(data.coarseSpecificGravity, data.coarseUnitWeightCompacted),
    abrasion,
  };
}
