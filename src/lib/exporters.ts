import { fromSI } from "./units";
import type { AnalysisResult, StructuralProject } from "./types";

const procedureChecklist = [
  "Datos de entrada", "Geometría", "Numeración de nodos", "Numeración de elementos", "Coordenadas",
  "Propiedades de materiales", "Longitudes", "Cosenos directores", "Matrices de transformación", "Matrices locales",
  "Matrices globales de cada elemento", "Grados de libertad", "GDL restringidos", "GDL libres", "Vector global de cargas",
  "Matriz global antes de restricciones", "Proceso de ensamblaje", "Matrices particionadas", "Sistema reducido", "Desplazamientos",
  "Reacciones", "Deformaciones", "Esfuerzos", "Fuerzas axiales y de extremo", "Clasificación tracción/compresión",
  "Estructura deformada", "Comprobación del equilibrio",
];

const numeric = (value: number, digits = 7) => Number.isFinite(value) ? Number(value.toPrecision(digits)) : String(value);

function saveBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function safeName(name: string) {
  return name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toLowerCase() || "proyecto";
}

export async function exportExcel(project: StructuralProject, result: AnalysisResult) {
  const { Workbook } = await import("exceljs");
  const workbook = new Workbook();
  workbook.creator = "Laboratorio Matricial UNC - Jhoel Tocas Cercado";
  workbook.created = new Date();
  const addSheet = (name: string, rows: Array<Array<string | number | boolean>>) => {
    const sheet = workbook.addWorksheet(name.slice(0, 31));
    rows.forEach((row) => sheet.addRow(row));
    const header = sheet.getRow(1);
    header.font = { bold: true, color: { argb: "FFFFFFFF" } };
    header.fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF17324D" } };
    header.alignment = { vertical: "middle", horizontal: "center" };
    sheet.views = [{ state: "frozen", ySplit: 1 }];
    sheet.columns.forEach((column, columnIndex) => { column.width = Math.min(34, Math.max(12, ...rows.map((row) => String(row[(column.number ?? columnIndex + 1) - 1] ?? "").length + 2))); });
    return sheet;
  };
  addSheet("Proyecto", [
    ["Campo", "Valor"],
    ["Nombre", project.metadata.name], ["Autor", project.metadata.author], ["Universidad", project.metadata.university],
    ["Escuela", project.metadata.school], ["Tipo", project.kind], ["Fuente", project.metadata.source],
    ["Unidades", `${project.units.force} · ${project.units.length} · ${project.units.stress}`],
    ["Estado", result.ok ? "Análisis válido" : "Bloqueado"], ["Solver", result.solver.method], ["Residuo relativo", result.solver.relativeResidual],
  ]);
  addSheet("Nodos", [["Nodo", "Etiqueta", `x (${project.units.length})`, `y (${project.units.length})`, `Fx (${project.units.force})`, `Fy (${project.units.force})`, `Mz (${project.units.force}·${project.units.length})`, "Ux estado", `Ux valor (${project.units.displacement})`, "Uy estado", `Uy valor (${project.units.displacement})`, "Rz estado", "Rz valor (rad)"], ...project.nodes.map((node) => [node.number, node.label, node.x, node.y, node.loads.fx, node.loads.fy, node.loads.mz, node.constraints.ux.kind, node.constraints.ux.value ?? 0, node.constraints.uy.kind, node.constraints.uy.value ?? 0, node.constraints.rz.kind, node.constraints.rz.value ?? 0])]);
  addSheet("Elementos", [["Elemento", "Etiqueta", "Nodo i", "Nodo j", `A (${project.units.area})`, `E (${project.units.stress})`, `I (${project.units.inertia})`, "Material"], ...project.elements.map((element) => [element.number, element.label, project.nodes.find((node) => node.id === element.nodeI)?.label ?? element.nodeI, project.nodes.find((node) => node.id === element.nodeJ)?.label ?? element.nodeJ, element.A, element.E, element.I, element.material])]);
  addSheet("Cargas barras", [["Elemento", "Tipo", "Inicio o valor", "Fin o posición", "Unidad"], ...project.elements.flatMap((element) => element.loads.map((load) => [element.number, load.kind, load.kind === "distributed-y" ? load.start : load.value, load.kind === "distributed-y" ? load.end : load.position, load.kind === "distributed-y" ? `${project.units.force}/${project.units.length}` : load.kind === "moment" ? `${project.units.force}·${project.units.length}` : project.units.force]))]);
  addSheet("Geometria", [["Elemento", "L (m)", "Ángulo (°)", "cos α", "sin α", "GDL"], ...result.elementCalculations.map((item) => [item.elementNumber, numeric(item.L), numeric(item.theta * 180 / Math.PI), numeric(item.c), numeric(item.s), item.dofs.map((dof) => dof + 1).join(", ")])]);
  addSheet("GDL", [["GDL", "Nodo", "Componente", "Estado", "Valor prescrito SI"], ...result.dofs.map((dof) => [dof.display, dof.nodeLabel, dof.component, dof.constrained ? "Restringido" : "Libre", dof.prescribed])]);
  addSheet("Vector F", [["GDL", "Descripción", "F global SI", "Carga de barra SI"], ...result.dofs.map((dof) => [dof.display, `${dof.nodeLabel}.${dof.component}`, numeric(result.globalF[dof.index]), numeric(result.memberLoadVector[dof.index])])]);
  addSheet("K global", [["i/j", ...result.dofs.map((dof) => dof.display)], ...result.globalK.map((row, index) => [index + 1, ...row.map((value) => numeric(value))])]);
  const partition = addSheet("Particiones", [["Bloque", "Datos"]]);
  const appendMatrix = (label: string, matrix: number[][]) => {
    partition.addRow([]);
    partition.addRow([label]);
    matrix.forEach((row) => partition.addRow(row.map((value) => numeric(value))));
  };
  appendMatrix("KLL", result.partitions.kLL);
  appendMatrix("KLR", result.partitions.kLR);
  appendMatrix("KRL", result.partitions.kRL);
  appendMatrix("KRR", result.partitions.kRR);
  partition.addRow([]); partition.addRow(["FL", ...result.partitions.fL.map((value) => numeric(value))]);
  partition.addRow(["UR", ...result.partitions.uR.map((value) => numeric(value))]);
  partition.addRow(["b = FL - KLR·UR", ...result.partitions.reducedRhs.map((value) => numeric(value))]);
  addSheet("Desplazamientos", [["GDL", "Nodo", "Componente", `U (${project.units.displacement} o rad)`, `Reacción (${project.units.force} o momento)`], ...result.dofs.map((dof) => [dof.display, dof.nodeLabel, dof.component, dof.component === "rz" ? numeric(result.displacements[dof.index]) : numeric(fromSI.displacement(result.displacements[dof.index], project.units)), dof.component === "rz" ? numeric(fromSI.moment(result.reactions[dof.index], project.units)) : numeric(fromSI.force(result.reactions[dof.index], project.units))])]);
  addSheet("Resultados barras", [["Elemento", "Estado", "Elongación (m)", "Deformación", `Esfuerzo (${project.units.stress})`, `Axial (${project.units.force})`, "Fuerzas locales SI"], ...result.elementResults.map((item) => [item.elementNumber, item.state, numeric(item.elongation), numeric(item.strain), numeric(fromSI.stress(item.stress, project.units)), numeric(fromSI.force(item.axialForce, project.units)), item.localEndForces.map((value) => numeric(value)).join(", ")])]);
  const elementMatrices = addSheet("Matrices elementos", [["Matriz", "Datos en unidades SI"]]);
  for (const item of result.elementCalculations) {
    for (const [label, matrix] of [[`E${item.elementNumber} · k' local`, item.local], [`E${item.elementNumber} · lambda`, item.lambda], [`E${item.elementNumber} · T`, item.transformation], [`E${item.elementNumber} · Ke global`, item.global]] as const) {
      elementMatrices.addRow([]);
      elementMatrices.addRow([label]);
      elementMatrices.addRow(["i/j", ...matrix[0].map((_, index) => index + 1)]);
      matrix.forEach((row, index) => elementMatrices.addRow([index + 1, ...row.map((value) => numeric(value))]));
    }
  }
  const traceRows: Array<Array<string | number>> = [["Kij", "Elemento", "Fila local", "Columna local", "Contribución SI"]];
  for (const [cell, contributions] of Object.entries(result.assemblyTrace)) for (const item of contributions) traceRows.push([cell.split(":").map((value) => Number(value) + 1).join(","), item.elementNumber, item.localRow + 1, item.localCol + 1, numeric(item.value)]);
  addSheet("Ensamblaje", traceRows);
  const buffer = await workbook.xlsx.writeBuffer();
  saveBlob(new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" }), `${safeName(project.metadata.name)}-calculo-completo.xlsx`);
}

function drawStructure(doc: import("jspdf").jsPDF, project: StructuralProject, result: AnalysisResult, x: number, y: number, width: number, height: number) {
  const xs = project.nodes.map((node) => node.x);
  const ys = project.nodes.map((node) => node.y);
  const minX = Math.min(...xs); const maxX = Math.max(...xs); const minY = Math.min(...ys); const maxY = Math.max(...ys);
  const spanX = Math.max(maxX - minX, 1); const spanY = Math.max(maxY - minY, 1);
  const scale = Math.min(width / spanX, height / spanY) * 0.86;
  const offsetX = x + (width - spanX * scale) / 2;
  const offsetY = y + (height - spanY * scale) / 2;
  const point = (node: StructuralProject["nodes"][number], dx = 0, dy = 0) => [offsetX + (node.x + dx - minX) * scale, offsetY + (maxY - node.y - dy) * scale] as const;
  doc.setLineWidth(0.65); doc.setDrawColor(23, 50, 77);
  for (const element of project.elements) {
    const ni = project.nodes.find((node) => node.id === element.nodeI)!;
    const nj = project.nodes.find((node) => node.id === element.nodeJ)!;
    const [x1, y1] = point(ni); const [x2, y2] = point(nj);
    doc.line(x1, y1, x2, y2);
  }
  if (result.ok) {
    const translational = result.dofs.filter((dof) => dof.component !== "rz").map((dof) => Math.abs(result.displacements[dof.index]));
    const maxU = Math.max(...translational, 1e-20);
    const unitScale = project.units.length === "m" ? 1 : project.units.length === "cm" ? 100 : 1000;
    const displayFactor = Math.min(spanX, spanY) * 0.12 / (maxU * unitScale);
    doc.setDrawColor(215, 76, 45); doc.setLineWidth(0.45); doc.setLineDashPattern([1.5, 1.5], 0);
    for (const element of project.elements) {
      const ni = project.nodes.find((node) => node.id === element.nodeI)!;
      const nj = project.nodes.find((node) => node.id === element.nodeJ)!;
      const nodeDofsI = result.dofs.filter((dof) => dof.nodeId === ni.id);
      const nodeDofsJ = result.dofs.filter((dof) => dof.nodeId === nj.id);
      const [x1, y1] = point(ni, result.displacements[nodeDofsI[0].index] * unitScale * displayFactor, result.displacements[nodeDofsI[1].index] * unitScale * displayFactor);
      const [x2, y2] = point(nj, result.displacements[nodeDofsJ[0].index] * unitScale * displayFactor, result.displacements[nodeDofsJ[1].index] * unitScale * displayFactor);
      doc.line(x1, y1, x2, y2);
    }
    doc.setLineDashPattern([], 0);
  }
  doc.setFillColor(245, 163, 37); doc.setTextColor(23, 50, 77); doc.setFontSize(7);
  for (const node of project.nodes) {
    const [px, py] = point(node); doc.circle(px, py, 1.25, "FD"); doc.text(node.label, px + 1.8, py - 1.6);
  }
}

export async function exportPdf(project: StructuralProject, result: AnalysisResult, complete = true) {
  const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([import("jspdf"), import("jspdf-autotable")]);
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const title = (text: string, subtitle?: string) => {
    doc.setFillColor(23, 50, 77); doc.rect(0, 0, pageWidth, 24, "F");
    doc.setTextColor(255, 255, 255); doc.setFont("helvetica", "bold"); doc.setFontSize(15); doc.text(text, 14, 11);
    if (subtitle) { doc.setFont("helvetica", "normal"); doc.setFontSize(8); doc.text(subtitle, 14, 18); }
    doc.setTextColor(24, 35, 45);
  };
  const footer = () => {
    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page); doc.setFontSize(7); doc.setTextColor(95, 106, 116);
      doc.text("Laboratorio Matricial UNC · Jhoel Tocas Cercado · Ingeniería Hidráulica", 14, 291);
      doc.text(`${page}/${pages}`, 196, 291, { align: "right" });
    }
  };
  title("MEMORIA DE CÁLCULO MATRICIAL", project.metadata.name);
  doc.setFontSize(24); doc.setFont("helvetica", "bold"); doc.setTextColor(23, 50, 77); doc.text(project.kind === "truss2d" ? "ARMADURA 2D" : "PÓRTICO 2D", 14, 44);
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(60, 68, 75);
  doc.text([`Autor: ${project.metadata.author}`, project.metadata.university, project.metadata.school, `Fuente: ${project.metadata.source}`, `Fecha: ${project.metadata.date}`], 14, 55);
  drawStructure(doc, project, result, 18, 84, 174, 88);
  autoTable(doc, { startY: 182, head: [["Control", "Resultado"]], body: [["Estado", result.ok ? "Válido" : "Bloqueado"], ["Nodos / elementos", `${project.nodes.length} / ${project.elements.length}`], ["GDL libres / restringidos", `${result.free.length} / ${result.restrained.length}`], ["Solver", result.solver.method], ["Residuo relativo", numeric(result.solver.relativeResidual)], ["Equilibrio", result.equilibrium.passed ? "Cumple" : "Revisar"]], theme: "grid", headStyles: { fillColor: [23, 50, 77] } });

  doc.addPage(); title("ÍNDICE DE REVISIÓN · 27 PASOS", "Cada punto se regenera a partir del modelo vigente");
  autoTable(doc, { startY: 31, head: [["Paso", "Contenido", "Trazabilidad"]], body: procedureChecklist.map((item, index) => [index + 1, item, index < 6 ? "Modelo" : index < 19 ? "Formulación" : "Resultados"]), theme: "striped", headStyles: { fillColor: [23, 50, 77] }, styles: { fontSize: 7.2, cellPadding: 1.35 } });

  doc.addPage(); title("01 · MODELO Y CONVENCIONES", "Datos normalizados internamente a N, m y Pa");
  doc.setFontSize(10); doc.text("Ecuación global: K·U = F. Partición: KLL·UL = FL - KLR·UR. Reacciones: R = K·U - F.", 14, 36);
  doc.text("Transformación por elemento: U′ = T·U; Ke = Tᵀ·k′·T. El sistema reducido se resuelve por factorización, sin invertir KLL.", 14, 43);
  autoTable(doc, { startY: 52, head: [["Nodo", `x (${project.units.length})`, `y (${project.units.length})`, `Fx (${project.units.force})`, `Fy (${project.units.force})`, "Apoyos"]], body: project.nodes.map((node) => [node.label, node.x, node.y, node.loads.fx, node.loads.fy, [node.constraints.ux.kind !== "free" ? "Ux" : "", node.constraints.uy.kind !== "free" ? "Uy" : "", project.kind === "frame2d" && node.constraints.rz.kind !== "free" ? "Rz" : ""].filter(Boolean).join(" · ") || "Libre"]), theme: "striped", headStyles: { fillColor: [23, 50, 77] }, styles: { fontSize: 7 } });
  autoTable(doc, { startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8, head: [["E", "i-j", `A (${project.units.area})`, `E (${project.units.stress})`, `I (${project.units.inertia})`, "Material"]], body: project.elements.map((element) => [element.number, `${project.nodes.find((node) => node.id === element.nodeI)?.label}-${project.nodes.find((node) => node.id === element.nodeJ)?.label}`, element.A, element.E, project.kind === "frame2d" ? element.I : "—", element.material]), theme: "grid", headStyles: { fillColor: [215, 76, 45] }, styles: { fontSize: 7 } });

  doc.addPage(); title("02 · GEOMETRÍA, GDL Y CARGAS", "Longitudes, cosenos directores y mapa de localización");
  autoTable(doc, { startY: 32, head: [["E", "L (m)", "α (°)", "cos α", "sin α", "GDL"]], body: result.elementCalculations.map((item) => [item.elementNumber, numeric(item.L), numeric(item.theta * 180 / Math.PI), numeric(item.c), numeric(item.s), item.dofs.map((dof) => dof + 1).join(" · ")]), theme: "grid", headStyles: { fillColor: [23, 50, 77] }, styles: { fontSize: 7 } });
  autoTable(doc, { startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8, head: [["GDL", "Nodo", "Componente", "Estado", "F SI"]], body: result.dofs.map((dof) => [dof.display, dof.nodeLabel, dof.component, dof.constrained ? "Restringido" : "Libre", numeric(result.globalF[dof.index])]), theme: "striped", headStyles: { fillColor: [215, 76, 45] }, styles: { fontSize: 7 } });

  doc.addPage(); title("03 · SOLUCIÓN Y RESULTADOS", "Desplazamientos, reacciones y recuperación por barra");
  autoTable(doc, { startY: 32, head: [["GDL", "Nodo", "Comp.", `U (${project.units.displacement}/rad)`, `R (${project.units.force}/mom.)`]], body: result.dofs.map((dof) => [dof.display, dof.nodeLabel, dof.component, dof.component === "rz" ? numeric(result.displacements[dof.index]) : numeric(fromSI.displacement(result.displacements[dof.index], project.units)), dof.component === "rz" ? numeric(fromSI.moment(result.reactions[dof.index], project.units)) : numeric(fromSI.force(result.reactions[dof.index], project.units))]), theme: "grid", headStyles: { fillColor: [23, 50, 77] }, styles: { fontSize: 7 } });
  autoTable(doc, { startY: (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 8, head: [["E", "ε", `σ (${project.units.stress})`, `N (${project.units.force})`, "Clasificación"]], body: result.elementResults.map((item) => [item.elementNumber, numeric(item.strain), numeric(fromSI.stress(item.stress, project.units)), numeric(fromSI.force(item.axialForce, project.units)), item.state]), theme: "striped", headStyles: { fillColor: [215, 76, 45] }, styles: { fontSize: 7 } });
  doc.setFontSize(9); doc.text(`Equilibrio: ΣFx=${numeric(fromSI.force(result.equilibrium.fx, project.units))} ${project.units.force}; ΣFy=${numeric(fromSI.force(result.equilibrium.fy, project.units))} ${project.units.force}; ΣM=${numeric(fromSI.moment(result.equilibrium.moment, project.units))} ${project.units.force}·${project.units.length}.`, 14, 280);

  if (complete) {
    const matrixPages = (heading: string, matrix: number[][], subtitle: string) => {
      const columnCount = matrix[0]?.length ?? 0;
      if (!matrix.length || !columnCount) {
        doc.addPage(); title(heading, subtitle); doc.setFontSize(10); doc.text("Bloque vacío.", 14, 36); return;
      }
      const rowsPerPage = matrix.length > 20 ? 24 : matrix.length;
      const columnsPerPage = columnCount > 14 ? 14 : columnCount;
      for (let rowStart = 0; rowStart < matrix.length; rowStart += rowsPerPage) {
        for (let columnStart = 0; columnStart < columnCount; columnStart += columnsPerPage) {
          const rowEnd = Math.min(matrix.length, rowStart + rowsPerPage);
          const columnEnd = Math.min(columnCount, columnStart + columnsPerPage);
          doc.addPage();
          title(heading, `${subtitle} · filas ${rowStart + 1}–${rowEnd} · columnas ${columnStart + 1}–${columnEnd}`);
          autoTable(doc, {
            startY: 31,
            head: [["i/j", ...Array.from({ length: columnEnd - columnStart }, (_, index) => columnStart + index + 1)]],
            body: matrix.slice(rowStart, rowEnd).map((row, index) => [rowStart + index + 1, ...row.slice(columnStart, columnEnd).map((value) => numeric(value, 6))]),
            theme: "grid",
            styles: { fontSize: columnsPerPage > 10 ? 5.2 : 6, cellPadding: columnsPerPage > 10 ? 0.55 : 0.8, overflow: "linebreak" },
            headStyles: { fillColor: [23, 50, 77] },
            margin: { left: 7, right: 7 },
          });
        }
      }
    };
    for (const item of result.elementCalculations) {
      matrixPages(`ELEMENTO ${item.elementNumber} · k′ LOCAL`, item.local, `L=${numeric(item.L)} m · c=${numeric(item.c)} · s=${numeric(item.s)}`);
      matrixPages(`ELEMENTO ${item.elementNumber} · λ`, item.lambda, "Matriz de rotación con la forma mostrada en el PDF adjunto");
      matrixPages(`ELEMENTO ${item.elementNumber} · Ke GLOBAL`, item.global, "Ke = Tᵀ·k′·T");
    }
    matrixPages("MATRIZ GLOBAL ANTES DE RESTRICCIONES", result.globalK, `Orden ${result.globalK.length} × ${result.globalK.length}`);
    matrixPages("PARTICIÓN KLL", result.partitions.kLL, "GDL libres contra GDL libres");
    matrixPages("PARTICIÓN KLR", result.partitions.kLR, "GDL libres contra GDL restringidos");
    matrixPages("PARTICIÓN KRL", result.partitions.kRL, "GDL restringidos contra GDL libres");
    matrixPages("PARTICIÓN KRR", result.partitions.kRR, "GDL restringidos contra GDL restringidos");

    doc.addPage(); title("VECTORES PARTICIONADOS Y SISTEMA REDUCIDO", "Valores internos en unidades SI");
    autoTable(doc, { startY: 31, head: [["Vector", "Posición", "Valor"]], body: [["FL", result.partitions.fL], ["FR", result.partitions.fR], ["UR", result.partitions.uR], ["b = FL − KLR·UR", result.partitions.reducedRhs]].flatMap(([label, vector]) => (vector as number[]).map((value, index) => [label as string, index + 1, numeric(value)])), theme: "grid", headStyles: { fillColor: [23, 50, 77] }, styles: { fontSize: 6.5 } });

    doc.addPage(); title("RASTRO DEL ENSAMBLAJE", "Cada término Ke[a,b] acumulado en la celda K[I,J]");
    autoTable(doc, { startY: 31, head: [["K[I,J]", "Elemento", "Ke[a,b]", "Contribución SI"]], body: Object.entries(result.assemblyTrace).flatMap(([cell, contributions]) => contributions.map((item) => [cell.split(":").map((value) => Number(value) + 1).join(","), item.elementNumber, `${item.localRow + 1},${item.localCol + 1}`, numeric(item.value)])), theme: "striped", headStyles: { fillColor: [23, 50, 77] }, styles: { fontSize: 5.8, cellPadding: 0.7 } });
  }
  footer();
  doc.save(`${safeName(project.metadata.name)}-memoria-matricial.pdf`);
}

export function exportJson(project: StructuralProject) {
  saveBlob(new Blob([JSON.stringify(project, null, 2)], { type: "application/json" }), `${safeName(project.metadata.name)}.json`);
}

export function exportCsv(project: StructuralProject, result: AnalysisResult) {
  const rows = [
    ["tipo", "id", "etiqueta", "dato_1", "dato_2", "dato_3", "estado"],
    ...project.nodes.map((node) => ["nodo", node.number, node.label, node.x, node.y, `${node.loads.fx};${node.loads.fy}`, `${node.constraints.ux.kind};${node.constraints.uy.kind}`]),
    ...result.elementResults.map((item) => ["elemento", item.elementNumber, item.label, item.strain, fromSI.stress(item.stress, project.units), fromSI.force(item.axialForce, project.units), item.state]),
  ];
  const csv = rows.map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(",")).join("\n");
  saveBlob(new Blob([csv], { type: "text/csv;charset=utf-8" }), `${safeName(project.metadata.name)}-resultados.csv`);
}
