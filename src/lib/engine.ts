import {
  addVectors,
  matrixNorm,
  multiply,
  multiplyVector,
  selectMatrix,
  selectVector,
  solveLinearSystem,
  subtractVectors,
  symmetryError,
  transpose,
  vectorNorm,
  zeros,
  type Matrix,
} from "./matrix";
import { toSI } from "./units";
import type {
  AnalysisResult,
  Diagnostic,
  DofDescriptor,
  ElementCalculation,
  ElementResult,
  MemberLoad,
  StructuralElement,
  StructuralProject,
} from "./types";

type CanonicalElement = StructuralElement & { A: number; E: number; I: number };

function trussLocal(A: number, E: number, L: number): Matrix {
  const k = (A * E) / L;
  return [
    [k, 0, -k, 0],
    [0, 0, 0, 0],
    [-k, 0, k, 0],
    [0, 0, 0, 0],
  ];
}

function trussTransformation(c: number, s: number): Matrix {
  return [
    [c, s, 0, 0],
    [-s, c, 0, 0],
    [0, 0, c, s],
    [0, 0, -s, c],
  ];
}

function frameLocal(A: number, E: number, I: number, L: number): Matrix {
  const a = (A * E) / L;
  const b = (12 * E * I) / L ** 3;
  const c = (6 * E * I) / L ** 2;
  const d = (4 * E * I) / L;
  const e = (2 * E * I) / L;
  return [
    [a, 0, 0, -a, 0, 0],
    [0, b, c, 0, -b, c],
    [0, c, d, 0, -c, e],
    [-a, 0, 0, a, 0, 0],
    [0, -b, -c, 0, b, -c],
    [0, c, e, 0, -c, d],
  ];
}

function frameTransformation(c: number, s: number): Matrix {
  return [
    [c, s, 0, 0, 0, 0],
    [-s, c, 0, 0, 0, 0],
    [0, 0, 1, 0, 0, 0],
    [0, 0, 0, c, s, 0],
    [0, 0, 0, -s, c, 0],
    [0, 0, 0, 0, 0, 1],
  ];
}

function bendingShape(r: number, L: number) {
  return [
    1 - 3 * r ** 2 + 2 * r ** 3,
    L * (r - 2 * r ** 2 + r ** 3),
    3 * r ** 2 - 2 * r ** 3,
    L * (-(r ** 2) + r ** 3),
  ];
}

function bendingShapeDerivative(r: number, L: number) {
  return [
    (-6 * r + 6 * r ** 2) / L,
    1 - 4 * r + 3 * r ** 2,
    (6 * r - 6 * r ** 2) / L,
    -2 * r + 3 * r ** 2,
  ];
}

function frameEquivalentLocalLoad(loads: MemberLoad[], L: number, project: StructuralProject): number[] {
  const result = Array(6).fill(0);
  for (const load of loads) {
    if (load.kind === "distributed-y") {
      const q0 = toSI.lineLoad(load.start, project.units);
      const q1 = toSI.lineLoad(load.end, project.units);
      const gauss = [
        [-0.8611363115940526, 0.3478548451374538],
        [-0.3399810435848563, 0.6521451548625461],
        [0.3399810435848563, 0.6521451548625461],
        [0.8611363115940526, 0.3478548451374538],
      ];
      for (const [point, weight] of gauss) {
        const r = (point + 1) / 2;
        const q = q0 + (q1 - q0) * r;
        const [n1, n2, n3, n4] = bendingShape(r, L);
        const jacobian = L / 2;
        result[1] += n1 * q * weight * jacobian;
        result[2] += n2 * q * weight * jacobian;
        result[4] += n3 * q * weight * jacobian;
        result[5] += n4 * q * weight * jacobian;
      }
    } else {
      const r = Math.min(1, Math.max(0, load.position));
      if (load.kind === "point-y") {
        const value = toSI.force(load.value, project.units);
        const [n1, n2, n3, n4] = bendingShape(r, L);
        result[1] += value * n1;
        result[2] += value * n2;
        result[4] += value * n3;
        result[5] += value * n4;
      } else if (load.kind === "point-x") {
        const value = toSI.force(load.value, project.units);
        result[0] += value * (1 - r);
        result[3] += value * r;
      } else {
        const value = toSI.moment(load.value, project.units);
        const [n1, n2, n3, n4] = bendingShapeDerivative(r, L);
        result[1] += value * n1;
        result[2] += value * n2;
        result[4] += value * n3;
        result[5] += value * n4;
      }
    }
  }
  return result;
}

function emptyResult(project: StructuralProject, diagnostics: Diagnostic[], dofs: DofDescriptor[]): AnalysisResult {
  const size = dofs.length;
  const restrained = dofs.filter((dof) => dof.constrained).map((dof) => dof.index);
  const free = dofs.filter((dof) => !dof.constrained).map((dof) => dof.index);
  return {
    ok: false,
    diagnostics,
    dofs,
    free,
    restrained,
    permutation: [...free, ...restrained],
    elementCalculations: [],
    globalK: zeros(size, size),
    globalF: Array(size).fill(0),
    memberLoadVector: Array(size).fill(0),
    partitions: { kLL: [], kLR: [], kRL: [], kRR: [], fL: [], fR: [], uR: [], reducedRhs: [] },
    displacements: Array(size).fill(0),
    reactions: Array(size).fill(0),
    elementResults: [],
    assemblyTrace: {},
    solver: { method: "No ejecutado", minPivot: 0, maxPivot: 0, conditionIndicator: Number.POSITIVE_INFINITY, residualNorm: Number.POSITIVE_INFINITY, relativeResidual: Number.POSITIVE_INFINITY },
    equilibrium: { fx: 0, fy: 0, moment: 0, relativeError: Number.POSITIVE_INFINITY, passed: false },
  };
}

function createDofs(project: StructuralProject): DofDescriptor[] {
  const components = project.kind === "truss2d" ? (["ux", "uy"] as const) : (["ux", "uy", "rz"] as const);
  return [...project.nodes]
    .sort((a, b) => a.number - b.number)
    .flatMap((node) => components.map((component) => {
      const constraint = node.constraints[component];
      const prescribed = constraint.kind === "prescribed"
        ? component === "rz" ? constraint.value ?? 0 : toSI.displacement(constraint.value ?? 0, project.units)
        : 0;
      return {
        index: 0,
        display: 0,
        nodeId: node.id,
        nodeNumber: node.number,
        nodeLabel: node.label,
        component,
        constrained: constraint.kind !== "free",
        prescribed,
      };
    }))
    .map((descriptor, index) => ({ ...descriptor, index, display: index + 1 }));
}

function validateProject(project: StructuralProject, dofs: DofDescriptor[]): Diagnostic[] {
  const diagnostics: Diagnostic[] = [];
  if (project.nodes.length < 2) diagnostics.push({ severity: "error", code: "NODES_REQUIRED", message: "Se necesitan al menos dos nodos." });
  if (!project.elements.length) diagnostics.push({ severity: "error", code: "ELEMENTS_REQUIRED", message: "Se necesita al menos un elemento." });
  const nodeIds = new Set<string>();
  const nodeNumbers = new Set<number>();
  for (const node of project.nodes) {
    if (nodeIds.has(node.id)) diagnostics.push({ severity: "error", code: "DUPLICATE_NODE_ID", message: `El nodo ${node.label} tiene un identificador repetido.`, entity: node.id });
    if (nodeNumbers.has(node.number)) diagnostics.push({ severity: "error", code: "DUPLICATE_NODE_NUMBER", message: `La numeración ${node.number} está repetida.`, entity: node.id });
    nodeIds.add(node.id);
    nodeNumbers.add(node.number);
    if (![node.x, node.y, node.loads.fx, node.loads.fy, node.loads.mz].every(Number.isFinite)) diagnostics.push({ severity: "error", code: "INVALID_NODE_VALUE", message: `El nodo ${node.label} contiene un valor no numérico.`, entity: node.id });
  }
  const pairs = new Set<string>();
  const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
  for (const element of project.elements) {
    const nodeI = nodeMap.get(element.nodeI);
    const nodeJ = nodeMap.get(element.nodeJ);
    if (!nodeI || !nodeJ) diagnostics.push({ severity: "error", code: "MISSING_NODE", message: `El elemento ${element.label} referencia un nodo inexistente.`, entity: element.id });
    if (element.nodeI === element.nodeJ) diagnostics.push({ severity: "error", code: "SAME_NODE", message: `El elemento ${element.label} inicia y termina en el mismo nodo.`, entity: element.id });
    const pair = [element.nodeI, element.nodeJ].sort().join(":");
    if (pairs.has(pair)) diagnostics.push({ severity: "error", code: "DUPLICATE_ELEMENT", message: `El elemento ${element.label} duplica una conectividad existente.`, entity: element.id });
    pairs.add(pair);
    if (!(element.A > 0) || !(element.E > 0) || !Number.isFinite(element.A) || !Number.isFinite(element.E)) diagnostics.push({ severity: "error", code: "NONPOSITIVE_PROPERTY", message: `El elemento ${element.label} requiere A y E positivos.`, entity: element.id });
    if (project.kind === "frame2d" && (!(element.I > 0) || !Number.isFinite(element.I))) diagnostics.push({ severity: "error", code: "NONPOSITIVE_INERTIA", message: `El elemento ${element.label} requiere I positivo.`, entity: element.id });
    if (nodeI && nodeJ) {
      const dx = toSI.length(nodeJ.x - nodeI.x, project.units);
      const dy = toSI.length(nodeJ.y - nodeI.y, project.units);
      if (Math.hypot(dx, dy) <= project.tolerance) diagnostics.push({ severity: "error", code: "ZERO_LENGTH", message: `El elemento ${element.label} tiene longitud cero.`, entity: element.id });
    }
  }
  if (!dofs.some((dof) => dof.constrained)) diagnostics.push({ severity: "warning", code: "NO_RESTRAINTS", message: "El modelo no contiene restricciones y probablemente es un mecanismo." });
  if (project.kind === "truss2d" && project.nodes.some((node) => Math.abs(node.loads.mz) > 0)) diagnostics.push({ severity: "warning", code: "TRUSS_MOMENT_IGNORED", message: "Las armaduras no tienen GDL rotacional; los momentos nodales se omiten." });
  return diagnostics;
}

export function analyzeProject(project: StructuralProject): AnalysisResult {
  const dofs = createDofs(project);
  const diagnostics = validateProject(project, dofs);
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) return emptyResult(project, diagnostics, dofs);

  const dofByNode = new Map<string, number[]>();
  for (const descriptor of dofs) {
    const list = dofByNode.get(descriptor.nodeId) ?? [];
    list.push(descriptor.index);
    dofByNode.set(descriptor.nodeId, list);
  }
  const nodeMap = new Map(project.nodes.map((node) => [node.id, node]));
  const size = dofs.length;
  const globalK = zeros(size, size);
  const globalF = Array(size).fill(0);
  const memberLoadVector = Array(size).fill(0);
  const assemblyTrace: AnalysisResult["assemblyTrace"] = {};
  const elementCalculations: ElementCalculation[] = [];

  for (const descriptor of dofs) {
    const node = nodeMap.get(descriptor.nodeId)!;
    globalF[descriptor.index] = descriptor.component === "ux"
      ? toSI.force(node.loads.fx, project.units)
      : descriptor.component === "uy"
        ? toSI.force(node.loads.fy, project.units)
        : toSI.moment(node.loads.mz, project.units);
  }

  for (const element of [...project.elements].sort((a, b) => a.number - b.number)) {
    const nodeI = nodeMap.get(element.nodeI)!;
    const nodeJ = nodeMap.get(element.nodeJ)!;
    const dx = toSI.length(nodeJ.x - nodeI.x, project.units);
    const dy = toSI.length(nodeJ.y - nodeI.y, project.units);
    const L = Math.hypot(dx, dy);
    const c = dx / L;
    const s = dy / L;
    const canonical: CanonicalElement = {
      ...element,
      A: toSI.area(element.A, project.units),
      E: toSI.stress(element.E, project.units),
      I: toSI.inertia(element.I, project.units),
    };
    const dofI = dofByNode.get(element.nodeI)!;
    const dofJ = dofByNode.get(element.nodeJ)!;
    const local = project.kind === "truss2d"
      ? trussLocal(canonical.A, canonical.E, L)
      : frameLocal(canonical.A, canonical.E, canonical.I, L);
    const transformation = project.kind === "truss2d" ? trussTransformation(c, s) : frameTransformation(c, s);
    const lambda = transpose(transformation);
    const global = multiply(transpose(transformation), multiply(local, transformation));
    const dofIndices = [...dofI, ...dofJ];
    const equivalentLocalLoad = project.kind === "frame2d"
      ? frameEquivalentLocalLoad(element.loads, L, project)
      : Array(4).fill(0);
    const equivalentGlobalLoad = multiplyVector(transpose(transformation), equivalentLocalLoad);
    for (let localRow = 0; localRow < dofIndices.length; localRow += 1) {
      const globalRow = dofIndices[localRow];
      memberLoadVector[globalRow] += equivalentGlobalLoad[localRow];
      globalF[globalRow] += equivalentGlobalLoad[localRow];
      for (let localCol = 0; localCol < dofIndices.length; localCol += 1) {
        const globalCol = dofIndices[localCol];
        const value = global[localRow][localCol];
        globalK[globalRow][globalCol] += value;
        const key = `${globalRow}:${globalCol}`;
        (assemblyTrace[key] ??= []).push({ elementId: element.id, elementNumber: element.number, localRow, localCol, value });
      }
    }
    elementCalculations.push({
      elementId: element.id,
      elementNumber: element.number,
      label: element.label,
      nodeI: element.nodeI,
      nodeJ: element.nodeJ,
      L,
      c,
      s,
      theta: Math.atan2(dy, dx),
      dofs: dofIndices,
      local,
      lambda,
      transformation,
      global,
      equivalentLocalLoad,
      equivalentGlobalLoad,
      symmetryError: symmetryError(global),
    });
  }

  const free = dofs.filter((dof) => !dof.constrained).map((dof) => dof.index);
  const restrained = dofs.filter((dof) => dof.constrained).map((dof) => dof.index);
  const uR = restrained.map((index) => dofs[index].prescribed);
  const kLL = selectMatrix(globalK, free, free);
  const kLR = selectMatrix(globalK, free, restrained);
  const kRL = selectMatrix(globalK, restrained, free);
  const kRR = selectMatrix(globalK, restrained, restrained);
  const fL = selectVector(globalF, free);
  const fR = selectVector(globalF, restrained);
  const reducedRhs = subtractVectors(fL, multiplyVector(kLR, uR));
  const base = {
    diagnostics,
    dofs,
    free,
    restrained,
    permutation: [...free, ...restrained],
    elementCalculations,
    globalK,
    globalF,
    memberLoadVector,
    partitions: { kLL, kLR, kRL, kRR, fL, fR, uR, reducedRhs },
    assemblyTrace,
  };

  try {
    const solution = solveLinearSystem(kLL, reducedRhs, project.tolerance);
    const displacements = Array(size).fill(0);
    free.forEach((dof, index) => { displacements[dof] = solution.x[index]; });
    restrained.forEach((dof, index) => { displacements[dof] = uR[index]; });
    const reactions = subtractVectors(multiplyVector(globalK, displacements), globalF);
    const residualVector = subtractVectors(multiplyVector(kLL, solution.x), reducedRhs);
    const residualNorm = vectorNorm(residualVector);
    const relativeResidual = residualNorm / (matrixNorm(kLL) * Math.max(vectorNorm(solution.x), 1e-30) + vectorNorm(reducedRhs) + 1e-30);
    const elementResults: ElementResult[] = elementCalculations.map((calculation) => {
      const uGlobal = calculation.dofs.map((dof) => displacements[dof]);
      const uLocal = multiplyVector(calculation.transformation, uGlobal);
      const element = project.elements.find((item) => item.id === calculation.elementId)!;
      const canonicalE = toSI.stress(element.E, project.units);
      const canonicalA = toSI.area(element.A, project.units);
      const internal = subtractVectors(multiplyVector(calculation.local, uLocal), calculation.equivalentLocalLoad);
      const axialI = uLocal[0];
      const axialJ = project.kind === "truss2d" ? uLocal[2] : uLocal[3];
      const elongation = axialJ - axialI;
      const strain = elongation / calculation.L;
      const stress = canonicalE * strain;
      const axialForce = canonicalA * stress;
      const threshold = Math.max(1e-8, canonicalA * canonicalE * project.tolerance);
      return {
        elementId: calculation.elementId,
        elementNumber: calculation.elementNumber,
        label: calculation.label,
        localDisplacements: uLocal,
        localEndForces: internal,
        elongation,
        strain,
        stress,
        axialForce,
        state: axialForce > threshold ? "tracción" : axialForce < -threshold ? "compresión" : "nulo",
      };
    });

    let sumFx = 0;
    let sumFy = 0;
    let sumMoment = 0;
    let forceScale = 0;
    let momentScale = 0;
    for (const node of project.nodes) {
      const nodeDofs = dofByNode.get(node.id)!;
      const x = toSI.length(node.x, project.units);
      const y = toSI.length(node.y, project.units);
      const fx = globalF[nodeDofs[0]] + reactions[nodeDofs[0]];
      const fy = globalF[nodeDofs[1]] + reactions[nodeDofs[1]];
      const mz = project.kind === "frame2d" ? globalF[nodeDofs[2]] + reactions[nodeDofs[2]] : 0;
      sumFx += fx;
      sumFy += fy;
      sumMoment += mz + x * fy - y * fx;
      forceScale += Math.abs(globalF[nodeDofs[0]]) + Math.abs(globalF[nodeDofs[1]]) + Math.abs(reactions[nodeDofs[0]]) + Math.abs(reactions[nodeDofs[1]]);
      momentScale += Math.abs(mz) + Math.abs(x * fy) + Math.abs(y * fx);
    }
    const relativeError = Math.max(Math.abs(sumFx) / Math.max(forceScale, 1), Math.abs(sumFy) / Math.max(forceScale, 1), Math.abs(sumMoment) / Math.max(momentScale, 1));
    diagnostics.push({ severity: "info", code: "SOLVER", message: `${solution.method}; no se invirtió KLL.` });
    return {
      ok: true,
      ...base,
      displacements,
      reactions,
      elementResults,
      solver: {
        method: solution.method,
        minPivot: solution.minPivot,
        maxPivot: solution.maxPivot,
        conditionIndicator: solution.minPivot > 0 ? solution.maxPivot / solution.minPivot : Number.POSITIVE_INFINITY,
        residualNorm,
        relativeResidual,
      },
      equilibrium: { fx: sumFx, fy: sumFy, moment: sumMoment, relativeError, passed: relativeError < Math.max(1e-8, project.tolerance * 100) },
    };
  } catch (error) {
    diagnostics.push({ severity: "error", code: "SINGULAR_SYSTEM", message: error instanceof Error ? error.message : "No se pudo resolver el sistema reducido." });
    return {
      ...emptyResult(project, diagnostics, dofs),
      ...base,
      ok: false,
    };
  }
}

export function physicalResidual(result: AnalysisResult): number[] {
  return subtractVectors(multiplyVector(result.globalK, result.displacements), addVectors(result.globalF, result.reactions));
}
