export type StructureKind = "truss2d" | "frame2d";

export type LengthUnit = "mm" | "cm" | "m";
export type AreaUnit = "mm²" | "cm²" | "m²";
export type InertiaUnit = "mm⁴" | "cm⁴" | "m⁴";
export type ForceUnit = "N" | "kN" | "kgf" | "tf";
export type StressUnit = "Pa" | "kPa" | "MPa" | "GPa" | "kgf/cm²" | "kN/cm²";

export type UnitSystem = {
  length: LengthUnit;
  displacement: LengthUnit;
  area: AreaUnit;
  inertia: InertiaUnit;
  force: ForceUnit;
  stress: StressUnit;
};

export type Constraint = {
  kind: "free" | "fixed" | "prescribed";
  value?: number;
};

export type StructuralNode = {
  id: string;
  number: number;
  label: string;
  x: number;
  y: number;
  loads: { fx: number; fy: number; mz: number };
  constraints: { ux: Constraint; uy: Constraint; rz: Constraint };
};

export type MemberLoad =
  | { id: string; kind: "distributed-y"; start: number; end: number }
  | { id: string; kind: "point-y"; value: number; position: number }
  | { id: string; kind: "point-x"; value: number; position: number }
  | { id: string; kind: "moment"; value: number; position: number };

export type StructuralElement = {
  id: string;
  number: number;
  label: string;
  nodeI: string;
  nodeJ: string;
  material: string;
  A: number;
  E: number;
  I: number;
  depth?: number;
  loads: MemberLoad[];
};

export type ProjectMetadata = {
  name: string;
  description: string;
  author: string;
  university: string;
  school: string;
  date: string;
  observations: string;
  source: string;
};

export type StructuralProject = {
  schemaVersion: 2;
  id: string;
  kind: StructureKind;
  metadata: ProjectMetadata;
  units: UnitSystem;
  nodes: StructuralNode[];
  elements: StructuralElement[];
  precision: number;
  tolerance: number;
};

export type Diagnostic = {
  severity: "error" | "warning" | "info";
  code: string;
  message: string;
  entity?: string;
};

export type DofDescriptor = {
  index: number;
  display: number;
  nodeId: string;
  nodeNumber: number;
  nodeLabel: string;
  component: "ux" | "uy" | "rz";
  constrained: boolean;
  prescribed: number;
};

export type ElementCalculation = {
  elementId: string;
  elementNumber: number;
  label: string;
  nodeI: string;
  nodeJ: string;
  L: number;
  c: number;
  s: number;
  theta: number;
  dofs: number[];
  local: number[][];
  lambda: number[][];
  transformation: number[][];
  global: number[][];
  equivalentLocalLoad: number[];
  equivalentGlobalLoad: number[];
  symmetryError: number;
};

export type AssemblyContribution = {
  elementId: string;
  elementNumber: number;
  localRow: number;
  localCol: number;
  value: number;
};

export type ElementResult = {
  elementId: string;
  elementNumber: number;
  label: string;
  localDisplacements: number[];
  localEndForces: number[];
  elongation: number;
  strain: number;
  stress: number;
  axialForce: number;
  state: "tracción" | "compresión" | "nulo";
};

export type AnalysisResult = {
  ok: boolean;
  diagnostics: Diagnostic[];
  dofs: DofDescriptor[];
  free: number[];
  restrained: number[];
  permutation: number[];
  elementCalculations: ElementCalculation[];
  globalK: number[][];
  globalF: number[];
  memberLoadVector: number[];
  partitions: {
    kLL: number[][];
    kLR: number[][];
    kRL: number[][];
    kRR: number[][];
    fL: number[];
    fR: number[];
    uR: number[];
    reducedRhs: number[];
  };
  displacements: number[];
  reactions: number[];
  elementResults: ElementResult[];
  assemblyTrace: Record<string, AssemblyContribution[]>;
  solver: {
    method: string;
    minPivot: number;
    maxPivot: number;
    conditionIndicator: number;
    residualNorm: number;
    relativeResidual: number;
  };
  equilibrium: {
    fx: number;
    fy: number;
    moment: number;
    relativeError: number;
    passed: boolean;
  };
};

export type MaterialPreset = { id: string; name: string; ePa: number; color: string };
