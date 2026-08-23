"use client";

type CellHandler = ((row: number, col: number) => void) | React.Dispatch<React.SetStateAction<[number, number]>>;

type Props = {
  matrix: number[][];
  precision?: number;
  selected?: [number, number];
  onCell?: CellHandler;
  empty?: string;
};

export function formatNumber(value: number, precision = 5) {
  if (!Number.isFinite(value)) return value > 0 ? "∞" : value < 0 ? "−∞" : "—";
  if (Math.abs(value) < 10 ** (-precision) * 0.1) return "0";
  const absolute = Math.abs(value);
  if (absolute >= 1e6 || absolute < 1e-4) return value.toExponential(Math.max(2, precision - 2));
  return Number(value.toPrecision(precision)).toLocaleString("es-PE", { maximumFractionDigits: precision });
}

export default function MatrixTable({ matrix, precision = 5, selected, onCell, empty = "Matriz vacía" }: Props) {
  if (!matrix.length || !matrix[0]?.length) return <div className="matrix-empty">{empty}</div>;
  return <div className="matrix-scroll">
    <table className={`matrix-table ${onCell ? "interactive" : ""}`}>
      <thead><tr><th>i/j</th>{matrix[0].map((_, col) => <th key={col}>{col + 1}</th>)}</tr></thead>
      <tbody>{matrix.map((row, rowIndex) => <tr key={rowIndex}><th>{rowIndex + 1}</th>{row.map((value, colIndex) => <td key={colIndex} className={selected?.[0] === rowIndex && selected?.[1] === colIndex ? "selected" : ""} onClick={() => { if (!onCell) return; if (onCell.length <= 1) (onCell as React.Dispatch<React.SetStateAction<[number, number]>>)([rowIndex, colIndex]); else (onCell as (row: number, col: number) => void)(rowIndex, colIndex); }}><span>{formatNumber(value, precision)}</span></td>)}</tr>)}</tbody>
    </table>
  </div>;
}

export function VectorTable({ values, labels, precision = 6 }: { values: number[]; labels?: string[]; precision?: number }) {
  return <div className="vector-table"><table><thead><tr><th>i</th><th>Descripción</th><th>Valor</th></tr></thead><tbody>{values.map((value, index) => <tr key={index}><td>{index + 1}</td><td>{labels?.[index] ?? `v${index + 1}`}</td><td>{formatNumber(value, precision)}</td></tr>)}</tbody></table></div>;
}
