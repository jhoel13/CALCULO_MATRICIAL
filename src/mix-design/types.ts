export type NavigationSection =
  | "resumen"
  | "aci"
  | "metodos"
  | "ajuste"
  | "dosificacion"
  | "agregados"
  | "probetas"
  | "informes"
  | "teoria";

export type MixInputs = {
  fc: number;
  strengthMargin: number;
  water: number;
  strengthPoint1: number;
  wcPoint1: number;
  strengthPoint2: number;
  wcPoint2: number;
  durabilityWcLimit: number;
  cementDensity: number;
  fineDensity: number;
  coarseDensity: number;
  coarseUnitWeight: number;
  coarseVolume: number;
  airContent: number;
  fineMoisture: number;
  fineAbsorption: number;
  coarseMoisture: number;
  coarseAbsorption: number;
  bagWeight: number;
  batchVolume: number;
  specimenDiameter: number;
  specimenHeight: number;
  specimenCount: number;
  waste: number;
  slump: number;
  temperature: number;
};

export type TrialAdjustmentInputs = {
  cementDry: number;
  waterDry: number;
  fineDry: number;
  coarseDry: number;
  fineWetBatch: number;
  coarseWetBatch: number;
  waterAddedBatch: number;
  nominalVolume: number;
  measuredUnitWeight: number;
  measuredSlumpIn: number;
  targetSlumpIn: number;
  waterCorrectionPerInch: number;
  fineMoisture: number;
  fineAbsorption: number;
  coarseMoisture: number;
  coarseAbsorption: number;
};

export type CompressionTest = {
  id: string;
  age: number;
  maturityFactor: number;
  loadTf: number | null;
  failureType: string;
  observation: string;
};

export type SieveReading = {
  sieve: string;
  openingMm: number | null;
  retainedG: number;
};

export type MoistureSample = {
  wetWithContainer: number;
  dryWithContainer: number;
  container: number;
};

export type FinesSample = {
  initialDry: number;
  washedDry: number;
};

export type AggregateLabData = {
  fineSieve: SieveReading[];
  coarseSieve: SieveReading[];
  fineMoistureSamples: MoistureSample[];
  coarseMoistureSamples: MoistureSample[];
  finesSamples: FinesSample[];
  fineSpecificGravity: number;
  coarseSpecificGravity: number;
  fineUnitWeightLoose: number;
  fineUnitWeightCompacted: number;
  coarseUnitWeightLoose: number;
  coarseUnitWeightCompacted: number;
  fineBulkSsd: number;
  fineApparent: number;
  coarseBulkSsd: number;
  coarseApparent: number;
  fineAbsorption: number;
  coarseAbsorption: number;
  abrasionInitial: number;
  abrasionRetained: number;
};

export type MethodComparisonInputs = {
  nominalMaximumMm: number;
  bolomeyFinePercent: number;
  fullerExponent: number;
  fullerFinePercent: number;
  fullerUseOptimized: boolean;
};

export type ProjectMeta = {
  name: string;
  client: string;
  location: string;
  element: string;
  cement: string;
  fineSource: string;
  coarseSource: string;
  technician: string;
  date: string;
};

export type MixProject = {
  schemaVersion: 1;
  meta: ProjectMeta;
  mix: MixInputs;
  adjustment: TrialAdjustmentInputs;
  methods: MethodComparisonInputs;
  aggregateLab: AggregateLabData;
  compressionTests: CompressionTest[];
  notes: string;
};

export type ProportioningMethodResult = {
  id: "aci" | "walker" | "bolomey";
  name: string;
  shortName: string;
  water: number;
  wcMethod: number;
  wc: number;
  cement: number;
  fineDry: number;
  coarseDry: number;
  fineWet: number;
  coarseWet: number;
  waterToAdd: number;
  freeWater: number;
  totalWet: number;
  fineAggregatePercent: number;
  coarseAggregatePercent: number;
  coarseBulkVolume: number | null;
  basis: string;
  warnings: string[];
};

export type FullerCurvePoint = {
  openingMm: number;
  sieve: string;
  finePassing: number;
  coarsePassing: number;
  targetPassing: number;
  combinedPassing: number;
  deviation: number;
};

export type FullerResult = {
  optimizedFinePercent: number;
  selectedFinePercent: number;
  optimizedRmse: number;
  selectedRmse: number;
  maximumDeviation: number;
  points: FullerCurvePoint[];
  warnings: string[];
};

export type MethodComparisonResults = {
  finenessModulus: number;
  finenessComplete: boolean;
  finenessClassification: string;
  methods: ProportioningMethodResult[];
  fuller: FullerResult;
};

export type StoredProject = {
  id: string;
  name: string;
  payload: MixProject;
  createdAt: string;
  updatedAt: string;
};

export type MixResults = {
  fcr: number;
  wcByStrength: number;
  wc: number;
  cement: number;
  bagsPerM3: number;
  cementVolume: number;
  waterVolume: number;
  coarseDry: number;
  coarseAbsoluteVolume: number;
  knownVolume: number;
  fineAbsoluteVolume: number;
  fineDry: number;
  coarseWet: number;
  fineWet: number;
  coarseFreeWater: number;
  fineFreeWater: number;
  freeWater: number;
  waterToAdd: number;
  effectiveWater: number;
  totalDry: number;
  totalWet: number;
  specimenVolume: number;
  unitWeight: number;
  dryRatio: [number, number, number];
  wetRatio: [number, number, number];
  warnings: string[];
};

export type CompressionResult = CompressionTest & {
  areaCm2: number;
  referenceStrength: number;
  referenceLoadTf: number;
  strengthKgfCm2: number | null;
  strengthMpa: number | null;
  percentFcr: number | null;
  percentFc: number | null;
  displayedStrength: number | null;
  displayedLoadTf: number | null;
  isProjected: boolean;
  status: "pendiente" | "proyectado" | "cumple" | "revisar";
};

export type TrialAdjustmentResults = {
  cementBatch: number;
  totalBatchWeight: number;
  actualYield: number;
  fineSurfaceMoisture: number;
  coarseSurfaceMoisture: number;
  fineWaterBatch: number;
  coarseWaterBatch: number;
  actualWaterBatch: number;
  waterPerM3: number;
  slumpCorrection: number;
  adjustedWater: number;
  originalWc: number;
  adjustedCement: number;
  coarseWetPerM3: number;
  coarseDryAdjusted: number;
  coarseSsd: number;
  fineSsd: number;
  fineDryAdjusted: number;
  fineWetAdjusted: number;
  coarseWetAdjusted: number;
  freeWaterAdjusted: number;
  waterToAddAdjusted: number;
  totalWetAdjusted: number;
};
