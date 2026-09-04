import type { MixProject } from "./types";

export const defaultProject: MixProject = {
  schemaVersion: 1,
  meta: {
    name: "Diseño f'c 175 - UNC",
    client: "Laboratorio de Tecnología de los Materiales",
    location: "Cajamarca, Perú",
    element: "Viga / columna",
    cement: "Cemento GU - bolsa 42.5 kg",
    fineSource: "Don Lucho 1 - El Gavilán",
    coarseSource: "Margarita - Tembladera",
    technician: "",
    date: "2026-06-10",
  },
  mix: {
    fc: 175,
    strengthMargin: 70,
    water: 205,
    strengthPoint1: 210,
    wcPoint1: 0.58,
    strengthPoint2: 280,
    wcPoint2: 0.48,
    durabilityWcLimit: 0.6,
    cementDensity: 2900,
    fineDensity: 2600,
    coarseDensity: 2700,
    coarseUnitWeight: 1600,
    coarseVolume: 0.63,
    airContent: 2,
    fineMoisture: 3,
    fineAbsorption: 1.5,
    coarseMoisture: 2,
    coarseAbsorption: 0.8,
    bagWeight: 42.5,
    batchVolume: 0.02,
    specimenDiameter: 15,
    specimenHeight: 30,
    specimenCount: 2,
    waste: 20,
    slump: 7.5,
    temperature: 23,
  },
  adjustment: {
    cementDry: 282,
    waterDry: 175,
    fineDry: 811,
    coarseDry: 1152,
    fineWetBatch: 17.2,
    coarseWetBatch: 23.5,
    waterAddedBatch: 2.7,
    nominalVolume: 0.02,
    measuredUnitWeight: 2390,
    measuredSlumpIn: 2.5,
    targetSlumpIn: 3,
    waterCorrectionPerInch: 6,
    fineMoisture: 6,
    fineAbsorption: 0.7,
    coarseMoisture: 2,
    coarseAbsorption: 0.5,
  },
  methods: {
    nominalMaximumMm: 19.05,
    bolomeyFinePercent: 40,
    fullerExponent: 0.5,
    fullerFinePercent: 40,
    fullerUseOptimized: true,
  },
  aggregateLab: {
    fineSieve: [
      { sieve: "3/8\"", openingMm: 9.525, retainedG: 0 },
      { sieve: "N° 4", openingMm: 4.76, retainedG: 108.33 },
      { sieve: "N° 8", openingMm: 2.36, retainedG: 123.33 },
      { sieve: "N° 16", openingMm: 1.18, retainedG: 57.23 },
      { sieve: "N° 30", openingMm: 0.6, retainedG: 63.33 },
      { sieve: "N° 50", openingMm: 0.3, retainedG: 57.77 },
      { sieve: "N° 100", openingMm: 0.15, retainedG: 66.1 },
      { sieve: "N° 200", openingMm: 0.075, retainedG: 17.2 },
      { sieve: "Cazoleta", openingMm: null, retainedG: 5.03 },
    ],
    coarseSieve: [
      { sieve: "1 1/2\"", openingMm: 38.1, retainedG: 0 },
      { sieve: "1\"", openingMm: 25.4, retainedG: 0 },
      { sieve: "3/4\"", openingMm: 19.05, retainedG: 0 },
      { sieve: "1/2\"", openingMm: 12.7, retainedG: 671.67 },
      { sieve: "3/8\"", openingMm: 9.525, retainedG: 386.33 },
      { sieve: "N° 4", openingMm: 4.76, retainedG: 433.33 },
      { sieve: "Cazoleta", openingMm: null, retainedG: 8.67 },
    ],
    fineMoistureSamples: [
      { wetWithContainer: 1.547, dryWithContainer: 1.53, container: 0.054 },
      { wetWithContainer: 1.6, dryWithContainer: 1.588, container: 0.056 },
      { wetWithContainer: 1.577, dryWithContainer: 1.564, container: 0.055 },
    ],
    coarseMoistureSamples: [
      { wetWithContainer: 1.668, dryWithContainer: 1.652, container: 0.055 },
      { wetWithContainer: 1.584, dryWithContainer: 1.569, container: 0.055 },
      { wetWithContainer: 1.628, dryWithContainer: 1.611, container: 0.054 },
    ],
    finesSamples: [
      { initialDry: 700, washedDry: 658 },
      { initialDry: 712, washedDry: 669 },
      { initialDry: 695, washedDry: 654 },
    ],
    fineSpecificGravity: 2.64,
    coarseSpecificGravity: 2.68,
    fineUnitWeightLoose: 1356.64,
    fineUnitWeightCompacted: 1433.99,
    coarseUnitWeightLoose: 1474.27,
    coarseUnitWeightCompacted: 1536.41,
    fineBulkSsd: 2.68,
    fineApparent: 2.72,
    coarseBulkSsd: 2.72,
    coarseApparent: 2.76,
    fineAbsorption: 1.5,
    coarseAbsorption: 1.3,
    abrasionInitial: 5000,
    abrasionRetained: 4250,
  },
  compressionTests: [
    {
      id: "P-01",
      age: 7,
      maturityFactor: 0.7,
      loadTf: 39,
      failureType: "Desprendimiento / cizallamiento superior",
      observation: "Ensayo real incorporado",
    },
    {
      id: "P-02",
      age: 14,
      maturityFactor: 0.9,
      loadTf: null,
      failureType: "Pendiente",
      observation: "Registrar al ensayar",
    },
    {
      id: "P-03",
      age: 28,
      maturityFactor: 1,
      loadTf: null,
      failureType: "Pendiente",
      observation: "Registrar al ensayar",
    },
  ],
  notes:
    "Diseño académico basado en los formatos suministrados. Confirmar los parámetros del proyecto y realizar mezclas de prueba antes de uso en obra.",
};

export function cloneDefaultProject(): MixProject {
  return JSON.parse(JSON.stringify(defaultProject)) as MixProject;
}

/**
 * Keeps projects created by older releases usable as new laboratory modules are added.
 * Arrays are intentionally replaced by the stored value while nested objects inherit
 * any fields introduced by the current schema.
 */
export function normalizeProject(value: Partial<MixProject> | null | undefined): MixProject {
  const base = cloneDefaultProject();
  if (!value) return base;

  return {
    ...base,
    ...value,
    schemaVersion: 1,
    meta: { ...base.meta, ...(value.meta ?? {}) },
    mix: { ...base.mix, ...(value.mix ?? {}) },
    adjustment: { ...base.adjustment, ...(value.adjustment ?? {}) },
    methods: { ...base.methods, ...(value.methods ?? {}) },
    aggregateLab: {
      ...base.aggregateLab,
      ...(value.aggregateLab ?? {}),
      fineSieve: value.aggregateLab?.fineSieve ?? base.aggregateLab.fineSieve,
      coarseSieve: value.aggregateLab?.coarseSieve ?? base.aggregateLab.coarseSieve,
      fineMoistureSamples:
        value.aggregateLab?.fineMoistureSamples ?? base.aggregateLab.fineMoistureSamples,
      coarseMoistureSamples:
        value.aggregateLab?.coarseMoistureSamples ?? base.aggregateLab.coarseMoistureSamples,
      finesSamples: value.aggregateLab?.finesSamples ?? base.aggregateLab.finesSamples,
    },
    compressionTests: value.compressionTests ?? base.compressionTests,
    notes: value.notes ?? base.notes,
  };
}
