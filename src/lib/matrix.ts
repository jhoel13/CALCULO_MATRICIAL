export type Matrix = number[][];

export const zeros = (rows: number, cols: number): Matrix =>
  Array.from({ length: rows }, () => Array(cols).fill(0));

export const identity = (size: number): Matrix => {
  const result = zeros(size, size);
  for (let i = 0; i < size; i += 1) result[i][i] = 1;
  return result;
};

export const transpose = (matrix: Matrix): Matrix =>
  matrix.length ? matrix[0].map((_, col) => matrix.map((row) => row[col])) : [];

export function multiply(a: Matrix, b: Matrix): Matrix {
  if (!a.length || !b.length || a[0].length !== b.length) throw new Error("Dimensiones matriciales incompatibles.");
  const result = zeros(a.length, b[0].length);
  for (let i = 0; i < a.length; i += 1) {
    for (let k = 0; k < b.length; k += 1) {
      const aik = a[i][k];
      if (aik === 0) continue;
      for (let j = 0; j < b[0].length; j += 1) result[i][j] += aik * b[k][j];
    }
  }
  return result;
}

export const multiplyVector = (matrix: Matrix, vector: number[]): number[] =>
  matrix.map((row) => row.reduce((sum, value, index) => sum + value * vector[index], 0));

export const addVectors = (a: number[], b: number[]) => a.map((value, index) => value + b[index]);
export const subtractVectors = (a: number[], b: number[]) => a.map((value, index) => value - b[index]);

export const vectorNorm = (vector: number[]) => Math.hypot(...vector);
export const matrixNorm = (matrix: Matrix) => Math.sqrt(matrix.reduce((sum, row) => sum + row.reduce((inner, value) => inner + value * value, 0), 0));

export function symmetryError(matrix: Matrix): number {
  let sum = 0;
  for (let i = 0; i < matrix.length; i += 1) {
    for (let j = i + 1; j < matrix.length; j += 1) sum += (matrix[i][j] - matrix[j][i]) ** 2;
  }
  return Math.sqrt(2 * sum);
}

export const selectMatrix = (matrix: Matrix, rows: number[], cols: number[]): Matrix =>
  rows.map((row) => cols.map((col) => matrix[row]?.[col] ?? 0));

export const selectVector = (vector: number[], indices: number[]) => indices.map((index) => vector[index] ?? 0);

export type SolveResult = {
  x: number[];
  method: string;
  minPivot: number;
  maxPivot: number;
};

function solveCholesky(matrix: Matrix, rhs: number[], tolerance: number): SolveResult | null {
  const n = matrix.length;
  const l = zeros(n, n);
  let minPivot = Number.POSITIVE_INFINITY;
  let maxPivot = 0;
  for (let i = 0; i < n; i += 1) {
    for (let j = 0; j <= i; j += 1) {
      let value = matrix[i][j];
      for (let k = 0; k < j; k += 1) value -= l[i][k] * l[j][k];
      if (i === j) {
        if (!(value > tolerance)) return null;
        l[i][j] = Math.sqrt(value);
        minPivot = Math.min(minPivot, value);
        maxPivot = Math.max(maxPivot, value);
      } else l[i][j] = value / l[j][j];
    }
  }
  const y = Array(n).fill(0);
  for (let i = 0; i < n; i += 1) {
    let value = rhs[i];
    for (let j = 0; j < i; j += 1) value -= l[i][j] * y[j];
    y[i] = value / l[i][i];
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i -= 1) {
    let value = y[i];
    for (let j = i + 1; j < n; j += 1) value -= l[j][i] * x[j];
    x[i] = value / l[i][i];
  }
  return { x, method: "Factorización de Cholesky LLᵀ", minPivot, maxPivot };
}

function solvePivotedGaussian(matrix: Matrix, rhs: number[], tolerance: number): SolveResult {
  const n = matrix.length;
  const a = matrix.map((row, index) => [...row, rhs[index]]);
  let minPivot = Number.POSITIVE_INFINITY;
  let maxPivot = 0;
  for (let col = 0; col < n; col += 1) {
    let pivotRow = col;
    for (let row = col + 1; row < n; row += 1) if (Math.abs(a[row][col]) > Math.abs(a[pivotRow][col])) pivotRow = row;
    const pivot = Math.abs(a[pivotRow][col]);
    if (!Number.isFinite(pivot) || pivot <= tolerance) throw new Error(`Matriz singular o mecanismo detectado en el pivote ${col + 1}.`);
    [a[col], a[pivotRow]] = [a[pivotRow], a[col]];
    minPivot = Math.min(minPivot, pivot);
    maxPivot = Math.max(maxPivot, pivot);
    for (let row = col + 1; row < n; row += 1) {
      const factor = a[row][col] / a[col][col];
      a[row][col] = 0;
      for (let j = col + 1; j <= n; j += 1) a[row][j] -= factor * a[col][j];
    }
  }
  const x = Array(n).fill(0);
  for (let row = n - 1; row >= 0; row -= 1) {
    let value = a[row][n];
    for (let col = row + 1; col < n; col += 1) value -= a[row][col] * x[col];
    x[row] = value / a[row][row];
  }
  return { x, method: "Eliminación Gaussiana con pivoteo", minPivot, maxPivot };
}

export function solveLinearSystem(matrix: Matrix, rhs: number[], relativeTolerance = 1e-11): SolveResult {
  if (!matrix.length) return { x: [], method: "Sin GDL libres", minPivot: 0, maxPivot: 0 };
  const scale = Math.max(1, ...matrix.flat().map(Math.abs));
  const tolerance = scale * relativeTolerance;
  return solveCholesky(matrix, rhs, tolerance) ?? solvePivotedGaussian(matrix, rhs, tolerance);
}
