import { calculateMix } from "./calculations";
import {
  calculateAggregateSummary,
  classifyFinenessModulus,
} from "./lab-calculations";
import type {
  FullerCurvePoint,
  FullerResult,
  MethodComparisonResults,
  MixProject,
  ProportioningMethodResult,
} from "./types";

type Point = readonly [number, number];

const WALKER_STRENGTH: Point[] = [
  [200, 0.65],
  [250, 0.58],
  [300, 0.52],
  [350, 0.47],
  [400, 0.42],
  [450, 0.38],
];

const BOLOMEY_STRENGTH: Point[] = [
  [175, 0.625],
  [210, 0.575],
  [250, 0.525],
  [300, 0.475],
  [350, 0.425],
];

const NOMINAL_SIZES = [9.525, 12.7, 19.05, 25.4, 38.1] as const;
const WALKER_WATER = {
  low: [207, 199, 190, 179, 166],
  medium: [228, 216, 205, 193, 181],
  high: [243, 228, 216, 202, 190],
} as const;
const WALKER_FM = [2.4, 2.6, 2.8, 3.0, 3.2] as const;
const WALKER_COARSE_VOLUME = [
  [0.5, 0.48, 0.46, 0.44, 0.42],
  [0.59, 0.57, 0.55, 0.53, 0.51],
  [0.66, 0.64, 0.62, 0.6, 0.58],
  [0.71, 0.69, 0.67, 0.65, 0.63],
  [0.75, 0.73, 0.71, 0.69, 0.67],
] as const;

const clamp = (value: number, minimum: number, maximum: number) =>
  Math.min(maximum, Math.max(minimum, value));

const divide = (numerator: number, denominator: number, fallback = 0) =>
  denominator === 0 || !Number.isFinite(numerator) || !Number.isFinite(denominator)
    ? fallback
    : numerator / denominator;

function interpolate(points: readonly Point[], value: number) {
  if (value <= points[0][0]) return points[0][1];
  if (value >= points.at(-1)![0]) return points.at(-1)![1];
  for (let index = 0; index < points.length - 1; index += 1) {
    const [x1, y1] = points[index];
    const [x2, y2] = points[index + 1];
    if (value >= x1 && value <= x2) {
      return y1 + ((value - x1) * (y2 - y1)) / (x2 - x1);
    }
  }
  return points.at(-1)![1];
}

function interpolateAxis(axis: readonly number[], values: readonly number[], value: number) {
  return interpolate(
    axis.map((item, index) => [item, values[index]] as const),
    value,
  );
}

function walkerWater(slumpIn: number, nominalMaximumMm: number) {
  const series = slumpIn <= 2 ? WALKER_WATER.low : slumpIn <= 4 ? WALKER_WATER.medium : WALKER_WATER.high;
  return interpolateAxis(NOMINAL_SIZES, series, nominalMaximumMm);
}

function walkerCoarseVolume(finenessModulus: number, nominalMaximumMm: number) {
  const valuesAtFm = WALKER_FM.map((_, fmIndex) =>
    interpolateAxis(
      NOMINAL_SIZES,
      WALKER_COARSE_VOLUME.map((row) => row[fmIndex]),
      nominalMaximumMm,
    ),
  );
  return interpolateAxis(WALKER_FM, valuesAtFm, finenessModulus);
}

function moistureCorrection(
  project: MixProject,
  cement: number,
  water: number,
  fineDry: number,
  coarseDry: number,
) {
  const fineWet = fineDry * (1 + project.mix.fineMoisture / 100);
  const coarseWet = coarseDry * (1 + project.mix.coarseMoisture / 100);
  const fineFreeWater =
    (fineDry * (project.mix.fineMoisture - project.mix.fineAbsorption)) / 100;
  const coarseFreeWater =
    (coarseDry * (project.mix.coarseMoisture - project.mix.coarseAbsorption)) / 100;
  const freeWater = fineFreeWater + coarseFreeWater;
  const waterToAdd = water - freeWater;
  return {
    fineWet,
    coarseWet,
    freeWater,
    waterToAdd,
    totalWet: cement + fineWet + coarseWet + waterToAdd,
  };
}

function aggregatePercents(fineDry: number, coarseDry: number) {
  const total = fineDry + coarseDry;
  return {
    fineAggregatePercent: divide(fineDry * 100, total),
    coarseAggregatePercent: divide(coarseDry * 100, total),
  };
}

function aciResult(project: MixProject): ProportioningMethodResult {
  const result = calculateMix(project.mix);
  return {
    id: "aci",
    name: "ACI 211.1 · base del proyecto",
    shortName: "ACI",
    water: project.mix.water,
    wcMethod: result.wcByStrength,
    wc: result.wc,
    cement: result.cement,
    fineDry: result.fineDry,
    coarseDry: result.coarseDry,
    fineWet: result.fineWet,
    coarseWet: result.coarseWet,
    waterToAdd: result.waterToAdd,
    freeWater: result.freeWater,
    totalWet: result.totalWet,
    ...aggregatePercents(result.fineDry, result.coarseDry),
    coarseBulkVolume: project.mix.coarseVolume,
    basis: "Volúmenes absolutos y parámetros editables del diseño ACI.",
    warnings: [...result.warnings],
  };
}

function walkerResult(project: MixProject, finenessModulus: number): ProportioningMethodResult {
  const warnings: string[] = [];
  const fcr = project.mix.fc + project.mix.strengthMargin;
  const slumpIn = project.mix.slump / 2.54;
  const wcMethod = interpolate(WALKER_STRENGTH, fcr);
  const wc = Math.min(wcMethod, project.mix.durabilityWcLimit || wcMethod);
  const water = walkerWater(slumpIn, project.methods.nominalMaximumMm);
  const cement = divide(water, wc);
  const coarseBulkVolume = walkerCoarseVolume(
    finenessModulus,
    project.methods.nominalMaximumMm,
  );
  // The tabulated bulk volume is multiplied by dry-rodded unit weight. It is not
  // an absolute volume and must not be multiplied by particle density.
  const coarseDry =
    coarseBulkVolume * project.mix.coarseUnitWeight;
  const occupied =
    water / 1000 +
    cement / project.mix.cementDensity +
    coarseDry / project.mix.coarseDensity +
    project.mix.airContent / 100;
  const fineDry = Math.max(0, 1 - occupied) * project.mix.fineDensity;
  const corrected = moistureCorrection(project, cement, water, fineDry, coarseDry);

  if (fcr < 200 || fcr > 450) warnings.push("f'cr fuera de la tabla Walker; se usó el extremo disponible.");
  if (finenessModulus < 2.4 || finenessModulus > 3.2) warnings.push("MF fuera de 2,40–3,20; la tabla Walker se limitó al extremo más cercano.");
  if (slumpIn > 4 && slumpIn < 6) warnings.push("La tabla suministrada no contiene 5 in; se usó la fila 6–7 in.");
  if (slumpIn > 7) warnings.push("Slump por encima de la tabla Walker; se usó la fila 6–7 in.");
  if (wc < wcMethod) warnings.push("Controló el límite a/c de durabilidad del proyecto.");
  if (fineDry <= 0) warnings.push("No queda volumen para agregado fino; revise propiedades y entradas.");

  return {
    id: "walker",
    name: "Walker · tablas del documento",
    shortName: "Walker",
    water,
    wcMethod,
    wc,
    cement,
    fineDry,
    coarseDry,
    ...corrected,
    ...aggregatePercents(fineDry, coarseDry),
    coarseBulkVolume,
    basis: "Tablas f'cr–a/c, slump–agua y volumen A.G.–MF–TMN del PDF suministrado.",
    warnings,
  };
}

function bolomeyResult(project: MixProject): ProportioningMethodResult {
  const warnings: string[] = [];
  const fcr = project.mix.fc + project.mix.strengthMargin;
  const wcMethod = interpolate(BOLOMEY_STRENGTH, fcr);
  const wc = Math.min(wcMethod, project.mix.durabilityWcLimit || wcMethod);
  const water = project.mix.water;
  const cement = divide(water, wc);
  const fineFraction = clamp(project.methods.bolomeyFinePercent / 100, 0, 1);
  const remainingVolume =
    1 -
    water / 1000 -
    cement / project.mix.cementDensity -
    project.mix.airContent / 100;
  const aggregateMass = Math.max(
    0,
    divide(
      remainingVolume,
      fineFraction / project.mix.fineDensity +
        (1 - fineFraction) / project.mix.coarseDensity,
    ),
  );
  const fineDry = aggregateMass * fineFraction;
  const coarseDry = aggregateMass * (1 - fineFraction);
  const corrected = moistureCorrection(project, cement, water, fineDry, coarseDry);

  if (fcr < 175 || fcr > 350) warnings.push("f'cr fuera de la tabla Bolomey; se usó el extremo disponible.");
  if (wc < wcMethod) warnings.push("Controló el límite a/c de durabilidad del proyecto.");
  if (project.methods.bolomeyFinePercent < 20 || project.methods.bolomeyFinePercent > 60) {
    warnings.push("Porcentaje de arena poco habitual; confirme con granulometría combinada y tanda de prueba.");
  }

  return {
    id: "bolomey",
    name: "Bolomey · intervalo académico",
    shortName: "Bolomey",
    water,
    wcMethod,
    wc,
    cement,
    fineDry,
    coarseDry,
    ...corrected,
    ...aggregatePercents(fineDry, coarseDry),
    coarseBulkVolume: null,
    basis: "Punto medio e interpolación de los intervalos f'cr–a/c del PDF; reparto A.F./A.G. editable.",
    warnings,
  };
}

function passingAt(
  analysis: ReturnType<typeof calculateAggregateSummary>["fineGradation"]["analysis"],
  openingMm: number,
) {
  const valid = analysis
    .filter((row) => row.openingMm != null && row.openingMm > 0)
    .sort((a, b) => (b.openingMm ?? 0) - (a.openingMm ?? 0));
  if (!valid.length) return 0;
  const exact = valid.find(
    (row) => Math.abs((row.openingMm ?? 0) - openingMm) <= openingMm * 0.001,
  );
  if (exact) return exact.passingPercent;
  if (openingMm > (valid[0].openingMm ?? 0)) return 100;
  if (openingMm < (valid.at(-1)!.openingMm ?? 0)) return valid.at(-1)!.passingPercent;

  for (let index = 0; index < valid.length - 1; index += 1) {
    const upper = valid[index];
    const lower = valid[index + 1];
    const upperOpening = upper.openingMm ?? 0;
    const lowerOpening = lower.openingMm ?? 0;
    if (openingMm <= upperOpening && openingMm >= lowerOpening) {
      const ratio =
        (Math.log(openingMm) - Math.log(lowerOpening)) /
        (Math.log(upperOpening) - Math.log(lowerOpening));
      return lower.passingPercent + ratio * (upper.passingPercent - lower.passingPercent);
    }
  }
  return 0;
}

function sieveLabel(opening: number) {
  const labels: Array<readonly [number, string]> = [
    [38.1, '1 1/2"'],
    [25.4, '1"'],
    [19.05, '3/4"'],
    [12.7, '1/2"'],
    [9.525, '3/8"'],
    [4.76, "N° 4"],
    [2.36, "N° 8"],
    [1.18, "N° 16"],
    [0.6, "N° 30"],
    [0.3, "N° 50"],
    [0.15, "N° 100"],
    [0.075, "N° 200"],
  ];
  return labels.find(([value]) => Math.abs(value - opening) < 0.02)?.[1] ?? `${opening.toFixed(3)} mm`;
}

function fullerResult(project: MixProject): FullerResult {
  const aggregates = calculateAggregateSummary(project.aggregateLab);
  const diameter = Math.max(0.075, project.methods.nominalMaximumMm);
  const exponent = clamp(project.methods.fullerExponent, 0.1, 1);
  const openings = Array.from(
    new Set(
      [
        diameter,
        ...project.aggregateLab.fineSieve.map((row) => row.openingMm),
        ...project.aggregateLab.coarseSieve.map((row) => row.openingMm),
      ]
        .filter((value): value is number => value != null && value > 0 && value <= diameter)
        .map((value) => Number(value.toFixed(4))),
    ),
  ).sort((a, b) => b - a);

  const raw = openings.map((openingMm) => {
    const finePassing = passingAt(aggregates.fineGradation.analysis, openingMm);
    const coarsePassing = passingAt(aggregates.coarseGradation.analysis, openingMm);
    const targetPassing = Math.min(100, 100 * (openingMm / diameter) ** exponent);
    return { openingMm, finePassing, coarsePassing, targetPassing };
  });

  const denominator = raw.reduce(
    (sum, row) => sum + (row.finePassing - row.coarsePassing) ** 2,
    0,
  );
  const numerator = raw.reduce(
    (sum, row) =>
      sum +
      (row.finePassing - row.coarsePassing) *
        (row.targetPassing - row.coarsePassing),
    0,
  );
  const optimizedFraction = clamp(divide(numerator, denominator, 0.4), 0, 1);
  const manualFraction = clamp(project.methods.fullerFinePercent / 100, 0, 1);
  const selectedFraction = project.methods.fullerUseOptimized
    ? optimizedFraction
    : manualFraction;

  const rmseAt = (fraction: number) =>
    Math.sqrt(
      divide(
        raw.reduce((sum, row) => {
          const combined =
            fraction * row.finePassing + (1 - fraction) * row.coarsePassing;
          return sum + (combined - row.targetPassing) ** 2;
        }, 0),
        raw.length,
      ),
    );

  const points: FullerCurvePoint[] = raw.map((row) => {
    const combinedPassing =
      selectedFraction * row.finePassing +
      (1 - selectedFraction) * row.coarsePassing;
    return {
      ...row,
      sieve: sieveLabel(row.openingMm),
      combinedPassing,
      deviation: combinedPassing - row.targetPassing,
    };
  });
  const warnings: string[] = [];
  if (!aggregates.fineGradation.finenessComplete) warnings.push("Falta una o más mallas de la serie del módulo de finura.");
  if (aggregates.fineGradation.errorPercent > 0.5 || aggregates.coarseGradation.errorPercent > 0.5) {
    warnings.push("Revise el cierre de masa antes de optimizar la curva combinada.");
  }
  const maximumDeviation = points.reduce(
    (maximum, row) => Math.max(maximum, Math.abs(row.deviation)),
    0,
  );
  if (maximumDeviation > 5) warnings.push("La curva seleccionada supera ±5 puntos en al menos una malla; requiere revisión experimental.");

  return {
    optimizedFinePercent: optimizedFraction * 100,
    selectedFinePercent: selectedFraction * 100,
    optimizedRmse: rmseAt(optimizedFraction),
    selectedRmse: rmseAt(selectedFraction),
    maximumDeviation,
    points,
    warnings,
  };
}

export function calculateMethodComparison(project: MixProject): MethodComparisonResults {
  const aggregates = calculateAggregateSummary(project.aggregateLab);
  const finenessModulus = aggregates.fineGradation.finenessModulus;
  return {
    finenessModulus,
    finenessComplete: aggregates.fineGradation.finenessComplete,
    finenessClassification: classifyFinenessModulus(
      finenessModulus,
      aggregates.fineGradation.finenessComplete,
    ),
    methods: [
      aciResult(project),
      walkerResult(project, finenessModulus),
      bolomeyResult(project),
    ],
    fuller: fullerResult(project),
  };
}

export const methodTables = {
  walkerStrength: WALKER_STRENGTH,
  bolomeyStrength: BOLOMEY_STRENGTH,
  nominalSizes: NOMINAL_SIZES,
  walkerWater: WALKER_WATER,
  walkerFinenessModuli: WALKER_FM,
  walkerCoarseVolume: WALKER_COARSE_VOLUME,
};
