"use client";

import { jsPDF } from "jspdf";
import { autoTable } from "jspdf-autotable";
import * as XLSX from "xlsx";
import {
  calculateCompressionTests,
  calculateMix,
  calculateTrialAdjustment,
  quantitiesForVolume,
  quantitiesPerBag,
} from "./calculations";
import { calculateAggregateSummary } from "./lab-calculations";
import { calculateMethodComparison } from "./method-calculations";
import type { MixProject } from "./types";

const NAVY: [number, number, number] = [23, 37, 54];
const ORANGE: [number, number, number] = [232, 102, 45];
const LIGHT: [number, number, number] = [244, 241, 235];

function number(value: number, digits = 2) {
  return new Intl.NumberFormat("es-PE", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  }).format(Number.isFinite(value) ? value : 0);
}

function safeFilename(name: string) {
  return (
    name
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9_-]+/g, "-")
      .replace(/^-|-$/g, "")
      .toLowerCase() || "proyecto"
  );
}

function addHeader(doc: jsPDF, label: string, title: string) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, 26, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 26, width, 2.4, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8);
  doc.text("MEZCLALAB  /  INGENIERÍA DE MEZCLAS", 14, 10);
  doc.setFontSize(15);
  doc.text(title, 14, 20);
  doc.setFontSize(7);
  doc.text(label.toUpperCase(), width - 14, 20, { align: "right" });
  doc.setTextColor(...NAVY);
}

function addFooter(doc: jsPDF, page: number) {
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  doc.setDrawColor(205, 208, 205);
  doc.line(14, height - 13, width - 14, height - 13);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7);
  doc.setTextColor(112, 122, 132);
  doc.text("Documento generado por JT Diseño de Mezclas · Validar mediante mezclas de prueba.", 14, height - 8);
  doc.text(`Página ${page}`, width - 14, height - 8, { align: "right" });
}

function table(
  doc: jsPDF,
  startY: number,
  head: string[][],
  body: (string | number)[][],
  options: Record<string, unknown> = {},
) {
  autoTable(doc, {
    startY,
    head,
    body,
    theme: "plain",
    margin: { left: 14, right: 14 },
    styles: {
      font: "helvetica",
      fontSize: 8,
      cellPadding: 3.2,
      textColor: NAVY,
      lineColor: [215, 217, 214],
      lineWidth: 0.15,
    },
    headStyles: {
      fillColor: NAVY,
      textColor: [255, 255, 255],
      fontStyle: "bold",
    },
    alternateRowStyles: { fillColor: [248, 247, 244] },
    ...options,
  });
  return (doc as jsPDF & { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? startY;
}

function sectionTitle(doc: jsPDF, text: string, y: number, subtitle?: string) {
  doc.setFillColor(...ORANGE);
  doc.rect(14, y - 4.5, 3, 7, "F");
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...NAVY);
  doc.text(text, 21, y);
  if (subtitle) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(105, 116, 126);
    doc.text(subtitle, 21, y + 5);
  }
}

export async function downloadFullReport(project: MixProject) {
  const results = calculateMix(project.mix);
  const compression = calculateCompressionTests(
    project.compressionTests,
    project.mix.specimenDiameter,
    project.mix.fc,
    results.fcr,
  );
  const adjustment = calculateTrialAdjustment(project.adjustment);
  const aggregates = calculateAggregateSummary(project.aggregateLab);
  const comparison = calculateMethodComparison(project);
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();

  doc.setFillColor(...NAVY);
  doc.rect(0, 0, width, height, "F");
  doc.setFillColor(...ORANGE);
  doc.rect(0, 0, 8, height, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(10);
  doc.text("MEZCLALAB", 20, 27);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(165, 179, 191);
  doc.text("INGENIERÍA DE MEZCLAS", 20, 33);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(27);
  doc.setTextColor(255, 255, 255);
  doc.text("INFORME TÉCNICO", 20, 89);
  doc.text("DE DISEÑO DE MEZCLA", 20, 101);
  doc.setFillColor(...ORANGE);
  doc.rect(20, 111, 42, 2, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(13);
  doc.text(project.meta.name, 20, 127, { maxWidth: 160 });
  doc.setFontSize(8);
  doc.setTextColor(164, 178, 190);
  doc.text("Métodos: ACI · Walker · Bolomey · Fuller / gráfico", 20, 140);
  doc.text(`Ubicación: ${project.meta.location}`, 20, 148);
  doc.text(`Fecha del proyecto: ${project.meta.date}`, 20, 156);
  doc.setDrawColor(68, 83, 101);
  doc.line(20, 225, width - 20, 225);
  doc.setFontSize(7);
  doc.text(`Responsable: ${project.meta.technician || "No indicado"}`, 20, 236);
  doc.text(`Cliente / laboratorio: ${project.meta.client || "No indicado"}`, 20, 243);
  doc.setTextColor(126, 142, 157);
  doc.text("Documento de apoyo técnico. No reemplaza la validación experimental ni la revisión profesional.", 20, height - 20);

  doc.addPage();
  addHeader(doc, "Memoria de cálculo", project.meta.name);
  sectionTitle(doc, "1. Datos generales", 40);
  let y = table(
    doc,
    45,
    [["Campo", "Dato", "Campo", "Dato"]],
    [
      ["Elemento", project.meta.element, "Cemento", project.meta.cement],
      ["Cantera A.F.", project.meta.fineSource, "Cantera A.G.", project.meta.coarseSource],
      ["f'c especificada", `${number(project.mix.fc, 0)} kgf/cm²`, "f'cr requerida", `${number(results.fcr, 0)} kgf/cm²`],
      ["Slump", `${number(project.mix.slump, 1)} cm`, "Temperatura", `${number(project.mix.temperature, 1)} °C`],
    ],
  );
  sectionTitle(doc, "2. Resultado de diseño", y + 14, "Dosificación corregida por humedad para 1 m³");
  y = table(
    doc,
    y + 20,
    [["Material", "Condición", "Cantidad", "Unidad"]],
    [
      ["Cemento", "Seco", number(results.cement), "kg/m³"],
      ["Agua", "A adicionar", number(results.waterToAdd), "kg/m³"],
      ["Agregado fino", "Húmedo", number(results.fineWet), "kg/m³"],
      ["Agregado grueso", "Húmedo", number(results.coarseWet), "kg/m³"],
      ["TOTAL", "Pesaje húmedo", number(results.totalWet), "kg/m³"],
    ],
    { footStyles: { fillColor: LIGHT } },
  );
  sectionTitle(doc, "3. Indicadores", y + 14);
  table(
    doc,
    y + 20,
    [["Indicador", "Resultado", "Comprobación"]],
    [
      ["Relación a/c adoptada", number(results.wc, 3), `a/c por resistencia: ${number(results.wcByStrength, 3)}`],
      ["Agua efectiva", `${number(results.effectiveWater)} kg/m³`, "Agua añadida + agua libre"],
      ["Cemento", `${number(results.cement)} kg/m³`, `${number(results.bagsPerM3, 2)} bolsas/m³`],
      ["Peso unitario teórico", `${number(results.unitWeight)} kg/m³`, "Suma del pesaje húmedo"],
      ["Proporción seca", `1 : ${number(results.dryRatio[1])} : ${number(results.dryRatio[2])}`, "C : AF : AG"],
    ],
  );
  addFooter(doc, 2);

  doc.addPage();
  addHeader(doc, "Cálculo ACI", project.meta.name);
  sectionTitle(doc, "4. Secuencia de cálculo", 40, "Valores de entrada y resultados intermedios");
  y = table(
    doc,
    46,
    [["Paso", "Expresión / criterio", "Resultado"]],
    [
      ["1", "f'cr = f'c + incremento", `${number(results.fcr)} kgf/cm²`],
      ["2", "Interpolación lineal de a/c", number(results.wcByStrength, 3)],
      ["3", "a/c = menor entre resistencia y durabilidad", number(results.wc, 3)],
      ["4", "Cemento = agua / (a/c)", `${number(results.cement)} kg/m³`],
      ["5", "V cemento = C / peso específico", `${number(results.cementVolume, 4)} m³`],
      ["6", "Peso A.G. = volumen compactado × P.U.C.", `${number(results.coarseDry)} kg/m³`],
      ["7", "V A.G. = peso / densidad", `${number(results.coarseAbsoluteVolume, 4)} m³`],
      ["8", "V A.F. = 1 - volúmenes conocidos", `${number(results.fineAbsoluteVolume, 4)} m³`],
      ["9", "Peso A.F. = volumen × densidad", `${number(results.fineDry)} kg/m³`],
      ["10", "Agua libre = suma de peso seco × (humedad - absorción)", `${number(results.freeWater)} kg/m³`],
      ["11", "Agua a adicionar = agua de diseño - agua libre", `${number(results.waterToAdd)} kg/m³`],
    ],
  );
  sectionTitle(doc, "5. Corrección por humedad", y + 14);
  table(
    doc,
    y + 20,
    [["Material", "Seco kg/m³", "Humedad %", "Absorción %", "Húmedo kg/m³", "Agua libre"]],
    [
      ["Agregado fino", number(results.fineDry), number(project.mix.fineMoisture), number(project.mix.fineAbsorption), number(results.fineWet), number(results.fineFreeWater)],
      ["Agregado grueso", number(results.coarseDry), number(project.mix.coarseMoisture), number(project.mix.coarseAbsorption), number(results.coarseWet), number(results.coarseFreeWater)],
    ],
  );
  addFooter(doc, 3);

  doc.addPage();
  addHeader(doc, "Comparación de métodos", project.meta.name);
  sectionTitle(doc, "6. ACI, Walker y Bolomey", 40, "Misma resistencia, materiales, aire, humedad y límite de durabilidad");
  y = table(
    doc,
    47,
    [["Método", "Agua", "a/c método", "a/c final", "Cemento", "A.F. seco", "A.G. seco", "Total húmedo"]],
    comparison.methods.map((method) => [
      method.shortName,
      number(method.water),
      number(method.wcMethod, 3),
      number(method.wc, 3),
      number(method.cement),
      number(method.fineDry),
      number(method.coarseDry),
      number(method.totalWet),
    ]),
    { styles: { fontSize: 7.2, cellPadding: 2.8 } },
  );
  sectionTitle(doc, "7. Optimización Fuller / método gráfico", y + 14, `P = 100(d/D)^n · D ${number(project.methods.nominalMaximumMm, 2)} mm · n ${number(project.methods.fullerExponent, 2)}`);
  y = table(
    doc,
    y + 21,
    [["Malla", "Abertura mm", "Pasante A.F.", "Pasante A.G.", "Objetivo", "Combinado", "Desviación"]],
    comparison.fuller.points.map((point) => [
      point.sieve,
      number(point.openingMm, 3),
      number(point.finePassing),
      number(point.coarsePassing),
      number(point.targetPassing),
      number(point.combinedPassing),
      `${point.deviation >= 0 ? "+" : ""}${number(point.deviation)} pp`,
    ]),
    { styles: { fontSize: 6.8, cellPadding: 2.15 } },
  );
  doc.setFont("helvetica", "normal");
  doc.setFontSize(7.5);
  doc.setTextColor(78, 90, 101);
  const comparisonNote = `Arena seleccionada: ${number(comparison.fuller.selectedFinePercent, 1)}% · óptimo: ${number(comparison.fuller.optimizedFinePercent, 1)}% · RMSE: ${number(comparison.fuller.selectedRmse, 2)} pp. En Walker, el volumen compactado se multiplica por el peso unitario seco compactado común (${number(project.mix.coarseUnitWeight)} kg/m³), no por la gravedad específica.`;
  doc.text(doc.splitTextToSize(comparisonNote, width - 28), 14, Math.min(y + 11, 273));
  addFooter(doc, 4);

  doc.addPage();
  addHeader(doc, "Dosificaciones", project.meta.name);
  const perBag = quantitiesPerBag(results, project.mix.bagWeight);
  const batch = quantitiesForVolume(results, project.mix.batchVolume);
  const specimens = quantitiesForVolume(results, results.specimenVolume);
  sectionTitle(doc, "8. Formatos de dosificación", 40);
  y = table(
    doc,
    46,
    [["Material", "1 m³", `1 bolsa (${number(project.mix.bagWeight, 1)} kg)`, `Tanda ${number(project.mix.batchVolume, 3)} m³`, `${project.mix.specimenCount} probetas + ${number(project.mix.waste, 0)}%`]],
    [
      ["Cemento", number(results.cement), number(perBag.cement), number(batch.cement), number(specimens.cement)],
      ["Agua a adicionar", number(results.waterToAdd), number(perBag.water), number(batch.water), number(specimens.water)],
      ["Agregado fino húmedo", number(results.fineWet), number(perBag.fine), number(batch.fine), number(specimens.fine)],
      ["Agregado grueso húmedo", number(results.coarseWet), number(perBag.coarse), number(batch.coarse), number(specimens.coarse)],
      ["Total", number(results.totalWet), number(perBag.total), number(batch.total), number(specimens.total)],
    ],
  );
  sectionTitle(doc, "9. Ajuste de mezcla de prueba", y + 14, "Procedimiento académico tipo Rivva López");
  table(
    doc,
    y + 20,
    [["Variable", "Inicial", "Ajustado", "Unidad"]],
    [
      ["Cemento", number(project.adjustment.cementDry), number(adjustment.adjustedCement), "kg/m³"],
      ["Agua efectiva", number(project.adjustment.waterDry), number(adjustment.adjustedWater), "kg/m³"],
      ["Agregado fino", number(project.adjustment.fineDry), number(adjustment.fineDryAdjusted), "kg/m³"],
      ["Agregado grueso", number(project.adjustment.coarseDry), number(adjustment.coarseDryAdjusted), "kg/m³"],
      ["Agua a adicionar en obra", "—", number(adjustment.waterToAddAdjusted), "kg/m³"],
      ["Rendimiento real", number(project.adjustment.nominalVolume, 4), number(adjustment.actualYield, 4), "m³"],
    ],
  );
  addFooter(doc, 5);

  doc.addPage();
  addHeader(doc, "Control de calidad", project.meta.name);
  sectionTitle(doc, "10. Resistencia a compresión", 40);
  y = table(
    doc,
    46,
    [["ID", "Edad", "Ref. kgf/cm²", "Carga real/proy. tf", "Resistencia real/proy.", "MPa", "Estado"]],
    compression.map((test) => [
      test.id,
      `${test.age} d`,
      number(test.referenceStrength),
      test.displayedLoadTf == null ? "Pendiente" : number(test.displayedLoadTf),
      test.displayedStrength == null ? "Pendiente" : number(test.displayedStrength),
      test.strengthMpa == null ? (test.isProjected ? "Proyección" : "—") : number(test.strengthMpa),
      test.status.toUpperCase(),
    ]),
  );
  sectionTitle(doc, "11. Caracterización de agregados", y + 14);
  y = table(
    doc,
    y + 20,
    [["Propiedad", "Agregado fino", "Agregado grueso", "Referencia"]],
    [
      ["Módulo de finura", number(aggregates.fineGradation.finenessModulus), aggregates.coarseGradation.finenessComplete ? number(aggregates.coarseGradation.finenessModulus) : "No aplica", "Granulometría"],
      ["Humedad promedio", `${number(aggregates.fineMoisture.average)} %`, `${number(aggregates.coarseMoisture.average)} %`, "ASTM C566"],
      ["Peso unitario suelto", number(project.aggregateLab.fineUnitWeightLoose), number(project.aggregateLab.coarseUnitWeightLoose), "ASTM C29/C29M"],
      ["Peso unitario compactado", number(project.aggregateLab.fineUnitWeightCompacted), number(project.aggregateLab.coarseUnitWeightCompacted), "ASTM C29/C29M"],
      ["Gravedad específica bulk", number(project.aggregateLab.fineSpecificGravity), number(project.aggregateLab.coarseSpecificGravity), "ASTM C127/C128"],
      ["Absorción", `${number(project.aggregateLab.fineAbsorption)} %`, `${number(project.aggregateLab.coarseAbsorption)} %`, "ASTM C127/C128"],
      ["Material fino por lavado", `${number(aggregates.fines.average)} %`, "—", "ASTM C117"],
      ["Abrasión Los Ángeles", "—", `${number(aggregates.abrasion)} %`, "ASTM C131/C131M"],
    ],
  );
  sectionTitle(doc, "12. Observaciones", y + 14);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(75, 86, 97);
  const notes = doc.splitTextToSize(project.notes || "Sin observaciones registradas.", width - 28);
  doc.text(notes, 14, y + 22);
  addFooter(doc, 6);

  doc.addPage();
  addHeader(doc, "Criterios y fuentes", project.meta.name);
  sectionTitle(doc, "13. Alcance técnico", 40);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(68, 80, 92);
  const scope = [
    "Los cálculos reproducen el flujo académico ACI 211.1-91 contenido en los documentos suministrados. La edición ACI PRC-211.1-22 es la guía vigente y debe consultarse para proyectos actuales.",
    "Los valores de tablas, límites de durabilidad y criterios de aceptación deben confirmarse con las especificaciones del proyecto, la normativa aplicable y los ensayos de materiales.",
    "Walker y Bolomey se reproducen desde las tablas del documento académico suministrado. Fuller se usa para evaluar gradación combinada y no constituye por sí solo una dosificación completa.",
    "Las proyecciones de resistencia a edades posteriores son orientativas; no sustituyen resultados reales de compresión.",
  ];
  let textY = 50;
  for (const paragraph of scope) {
    const lines = doc.splitTextToSize(paragraph, width - 28);
    doc.text(lines, 14, textY);
    textY += lines.length * 5 + 5;
  }
  sectionTitle(doc, "14. Referencias principales", textY + 8);
  table(
    doc,
    textY + 14,
    [["Documento", "Uso en la aplicación", "Enlace oficial"]],
    [
      ["ACI 211.1-91 / ACI PRC-211.1-22", "Selección y ajuste de proporciones", "concrete.org"],
      ["ACI PRC-211.10-24", "Gradación combinada de agregados", "concrete.org"],
      ["Fuller & Thompson (1907)", "Curva de potencia granulométrica", "ascelibrary.org"],
      ["ASTM C33/C33M", "Gradación y calidad de agregados", "store.astm.org"],
      ["ASTM C566", "Humedad evaporable de agregados", "store.astm.org"],
      ["ASTM C117", "Material fino por lavado", "store.astm.org"],
      ["ASTM C29/C29M", "Peso unitario y vacíos", "store.astm.org"],
      ["ASTM C127/C128", "Gravedad específica y absorción", "store.astm.org"],
      ["ASTM C131/C131M", "Abrasión Los Ángeles", "store.astm.org"],
      ["ASTM C39/C39M", "Compresión de probetas cilíndricas", "store.astm.org"],
    ],
  );
  addFooter(doc, 7);

  doc.save(`informe-${safeFilename(project.meta.name)}.pdf`);
}

export async function downloadTechnicalSheet(
  project: MixProject,
  kind: "dosificacion" | "agregados" | "probetas" | "metodos",
) {
  const results = calculateMix(project.mix);
  const aggregates = calculateAggregateSummary(project.aggregateLab);
  const comparison = calculateMethodComparison(project);
  const compression = calculateCompressionTests(
    project.compressionTests,
    project.mix.specimenDiameter,
    project.mix.fc,
    results.fcr,
  );
  const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
  const titles = {
    dosificacion: "Ficha técnica de dosificación",
    agregados: "Ficha técnica de agregados",
    probetas: "Ficha técnica de compresión",
    metodos: "Ficha comparativa de métodos",
  };
  addHeader(doc, "Ficha técnica", titles[kind]);
  doc.setFontSize(8);
  doc.setTextColor(95, 106, 116);
  doc.text(`Proyecto: ${project.meta.name}`, 14, 36);
  doc.text(`Fecha: ${project.meta.date} · Ubicación: ${project.meta.location}`, 14, 41);

  if (kind === "dosificacion") {
    sectionTitle(doc, "Dosificación corregida por humedad", 55, "Cantidades por 1 m³ de concreto");
    let y = table(doc, 62, [["Material", "Condición", "Cantidad", "Unidad"]], [
      ["Cemento", "Seco", number(results.cement), "kg/m³"],
      ["Agua", "A adicionar", number(results.waterToAdd), "L/m³"],
      ["Agregado fino", "Húmedo", number(results.fineWet), "kg/m³"],
      ["Agregado grueso", "Húmedo", number(results.coarseWet), "kg/m³"],
      ["TOTAL", "Pesaje húmedo", number(results.totalWet), "kg/m³"],
    ]);
    sectionTitle(doc, "Parámetros de control", y + 15);
    y = table(doc, y + 21, [["Parámetro", "Valor", "Parámetro", "Valor"]], [
      ["f'c", `${number(project.mix.fc, 0)} kgf/cm²`, "f'cr", `${number(results.fcr, 0)} kgf/cm²`],
      ["Relación a/c", number(results.wc, 3), "Slump", `${number(project.mix.slump, 1)} cm`],
      ["Aire atrapado", `${number(project.mix.airContent, 1)} %`, "Peso unitario", `${number(results.unitWeight)} kg/m³`],
      ["Proporción seca", `1 : ${number(results.dryRatio[1])} : ${number(results.dryRatio[2])}`, "Bolsas/m³", number(results.bagsPerM3, 2)],
    ]);
    sectionTitle(doc, "Corrección de agua", y + 15);
    table(doc, y + 21, [["Concepto", "Cantidad"]], [
      ["Agua de diseño", `${number(project.mix.water)} kg/m³`],
      ["Agua libre de agregados", `${number(results.freeWater)} kg/m³`],
      ["Agua a adicionar", `${number(results.waterToAdd)} kg/m³`],
    ]);
  }

  if (kind === "agregados") {
    sectionTitle(doc, "Resumen comparativo", 55, "Datos y ensayos registrados");
    const y = table(doc, 62, [["Propiedad", "Agregado fino", "Agregado grueso", "Método"]], [
      ["Cantera", project.meta.fineSource, project.meta.coarseSource, "Registro"],
      ["Módulo de finura", number(aggregates.fineGradation.finenessModulus), aggregates.coarseGradation.finenessComplete ? number(aggregates.coarseGradation.finenessModulus) : "No aplica", "Tamizado"],
      ["Humedad promedio", `${number(aggregates.fineMoisture.average)} %`, `${number(aggregates.coarseMoisture.average)} %`, "ASTM C566"],
      ["Peso unitario suelto", number(project.aggregateLab.fineUnitWeightLoose), number(project.aggregateLab.coarseUnitWeightLoose), "ASTM C29"],
      ["Peso unitario compactado", number(project.aggregateLab.fineUnitWeightCompacted), number(project.aggregateLab.coarseUnitWeightCompacted), "ASTM C29"],
      ["Gravedad específica bulk", number(project.aggregateLab.fineSpecificGravity), number(project.aggregateLab.coarseSpecificGravity), "ASTM C127/C128"],
      ["Absorción", `${number(project.aggregateLab.fineAbsorption)} %`, `${number(project.aggregateLab.coarseAbsorption)} %`, "ASTM C127/C128"],
      ["Vacíos compactado", `${number(aggregates.fineVoidsCompacted)} %`, `${number(aggregates.coarseVoidsCompacted)} %`, "Cálculo"],
    ]);
    sectionTitle(doc, "Controles de calidad", y + 15);
    table(doc, y + 21, [["Ensayo", "Resultado", "Criterio de referencia", "Lectura"]], [
      ["Material fino por lavado", `${number(aggregates.fines.average)} %`, "5% máx. (archivo suministrado)", aggregates.fines.average <= 5 ? "CUMPLE" : "REVISAR"],
      ["Abrasión Los Ángeles", `${number(aggregates.abrasion)} %`, "50% máx. (archivo suministrado)", aggregates.abrasion <= 50 ? "CUMPLE" : "REVISAR"],
    ]);
  }

  if (kind === "probetas") {
    sectionTitle(doc, "Control de probetas cilíndricas", 55, `Diámetro ${number(project.mix.specimenDiameter, 1)} cm · Altura ${number(project.mix.specimenHeight, 1)} cm`);
    const y = table(doc, 62, [["ID", "Edad", "Carga tf", "Resistencia kgf/cm²", "MPa", "% f'cr", "Estado"]], compression.map((test) => [
      test.id,
      `${test.age} d`,
      test.displayedLoadTf == null ? "Pendiente" : number(test.displayedLoadTf),
      test.displayedStrength == null ? "Pendiente" : number(test.displayedStrength),
      test.strengthMpa == null ? "—" : number(test.strengthMpa),
      test.percentFcr == null ? "—" : number(test.percentFcr),
      test.status.toUpperCase(),
    ]));
    sectionTitle(doc, "Observaciones de rotura", y + 15);
    table(doc, y + 21, [["ID", "Tipo de rotura", "Observación"]], project.compressionTests.map((test) => [
      test.id,
      test.failureType || "No registrado",
      test.observation || "Sin observación",
    ]));
  }

  if (kind === "metodos") {
    sectionTitle(doc, "Dosificación comparada", 55, "Cantidades por 1 m³ con corrección de humedad");
    let y = table(doc, 62, [["Método", "Agua", "a/c", "Cemento", "A.F. seco", "A.G. seco", "Total húmedo"]], comparison.methods.map((method) => [
      method.shortName,
      number(method.water),
      number(method.wc, 3),
      number(method.cement),
      number(method.fineDry),
      number(method.coarseDry),
      number(method.totalWet),
    ]), { styles: { fontSize: 7.2, cellPadding: 2.8 } });
    sectionTitle(doc, "Fuller / método gráfico", y + 15);
    y = table(doc, y + 21, [["Indicador", "Resultado"]], [
      ["Módulo de finura A.F.", number(comparison.finenessModulus, 2)],
      ["TMN / exponente", `${number(project.methods.nominalMaximumMm, 2)} mm / ${number(project.methods.fullerExponent, 2)}`],
      ["Arena óptima", `${number(comparison.fuller.optimizedFinePercent, 1)} %`],
      ["Arena seleccionada", `${number(comparison.fuller.selectedFinePercent, 1)} %`],
      ["RMSE seleccionado", `${number(comparison.fuller.selectedRmse, 2)} puntos porcentuales`],
      ["Desviación máxima", `${number(comparison.fuller.maximumDeviation, 2)} puntos porcentuales`],
    ]);
    sectionTitle(doc, "Nota de precisión", y + 15);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(75, 86, 97);
    doc.text(doc.splitTextToSize("Walker usa volumen compactado por peso unitario seco compactado. Bolomey usa los puntos medios de los intervalos a/c del documento suministrado. Fuller evalúa gradación; todos los resultados deben validarse con mezcla de prueba.", 180), 14, y + 23);
  }

  addFooter(doc, 1);
  doc.save(`ficha-${kind}-${safeFilename(project.meta.name)}.pdf`);
}

function setWidths(sheet: XLSX.WorkSheet, widths: number[]) {
  sheet["!cols"] = widths.map((wch) => ({ wch }));
}

export async function downloadExcel(project: MixProject) {
  const results = calculateMix(project.mix);
  const adjustment = calculateTrialAdjustment(project.adjustment);
  const aggregates = calculateAggregateSummary(project.aggregateLab);
  const comparison = calculateMethodComparison(project);
  const compression = calculateCompressionTests(
    project.compressionTests,
    project.mix.specimenDiameter,
    project.mix.fc,
    results.fcr,
  );
  const workbook = XLSX.utils.book_new();

  const summary = XLSX.utils.aoa_to_sheet([
    ["MEZCLALAB - RESUMEN DEL PROYECTO"],
    [],
    ["Proyecto", project.meta.name],
    ["Ubicación", project.meta.location],
    ["Elemento", project.meta.element],
    ["Fecha", project.meta.date],
    [],
    ["INDICADOR", "VALOR", "UNIDAD"],
    ["f'c especificada", project.mix.fc, "kgf/cm²"],
    ["f'cr requerida", results.fcr, "kgf/cm²"],
    ["Relación a/c", results.wc, ""],
    ["Cemento", results.cement, "kg/m³"],
    ["Agua a adicionar", results.waterToAdd, "kg/m³"],
    ["Agregado fino húmedo", results.fineWet, "kg/m³"],
    ["Agregado grueso húmedo", results.coarseWet, "kg/m³"],
    ["Peso total húmedo", results.totalWet, "kg/m³"],
    ["Módulo de finura A.F.", comparison.finenessModulus, ""],
    ["Arena óptima Fuller", comparison.fuller.optimizedFinePercent, "% del agregado"],
  ]);
  setWidths(summary, [32, 20, 16]);
  XLSX.utils.book_append_sheet(workbook, summary, "00_Resumen");

  const aci = XLSX.utils.aoa_to_sheet([
    ["DISEÑO ACI 211.1 - MEMORIA DE CÁLCULO"],
    [],
    ["PASO", "PARÁMETRO", "ENTRADA", "UNIDAD", "RESULTADO", "FÓRMULA / CRITERIO"],
    [1, "Resistencia especificada", project.mix.fc, "kgf/cm²", results.fcr, "f'cr = f'c + incremento"],
    [2, "Relación a/c por resistencia", project.mix.wcPoint1, "", results.wcByStrength, "Interpolación lineal"],
    [3, "Relación a/c adoptada", project.mix.durabilityWcLimit, "", results.wc, "Mínimo entre resistencia y durabilidad"],
    [4, "Agua de diseño", project.mix.water, "kg/m³", project.mix.water, "Dato de tabla / criterio"],
    [5, "Cemento", project.mix.cementDensity, "kg/m³", results.cement, "Agua / a/c"],
    [6, "Agregado grueso seco", project.mix.coarseVolume, "m³/m³", results.coarseDry, "Volumen compactado × P.U.C."],
    [7, "Volumen agregado grueso", project.mix.coarseDensity, "kg/m³", results.coarseAbsoluteVolume, "Peso / densidad"],
    [8, "Volumen agregado fino", project.mix.fineDensity, "kg/m³", results.fineAbsoluteVolume, "1 - volúmenes conocidos"],
    [9, "Agregado fino seco", project.mix.fineDensity, "kg/m³", results.fineDry, "Volumen × densidad"],
    [10, "Agua libre", "", "kg/m³", results.freeWater, "Σ Pseco × (humedad - absorción)"],
    [11, "Agua a adicionar", project.mix.water, "kg/m³", results.waterToAdd, "Agua diseño - agua libre"],
  ]);
  setWidths(aci, [8, 30, 16, 14, 18, 42]);
  XLSX.utils.book_append_sheet(workbook, aci, "01_ACI_Calculo");

  const perBag = quantitiesPerBag(results, project.mix.bagWeight);
  const batch = quantitiesForVolume(results, project.mix.batchVolume);
  const specimens = quantitiesForVolume(results, results.specimenVolume);
  const dosage = XLSX.utils.aoa_to_sheet([
    ["DOSIFICACIONES EN DIVERSOS FORMATOS"],
    [],
    ["Material", "1 m³", `Bolsa ${project.mix.bagWeight} kg`, `Tanda ${project.mix.batchVolume} m³`, "Probetas + desperdicio", "Unidad"],
    ["Cemento", results.cement, perBag.cement, batch.cement, specimens.cement, "kg"],
    ["Agua a adicionar", results.waterToAdd, perBag.water, batch.water, specimens.water, "kg/L"],
    ["Agregado fino húmedo", results.fineWet, perBag.fine, batch.fine, specimens.fine, "kg"],
    ["Agregado grueso húmedo", results.coarseWet, perBag.coarse, batch.coarse, specimens.coarse, "kg"],
    ["Total", results.totalWet, perBag.total, batch.total, specimens.total, "kg"],
  ]);
  setWidths(dosage, [27, 16, 18, 18, 22, 12]);
  XLSX.utils.book_append_sheet(workbook, dosage, "02_Dosificaciones");

  const trial = XLSX.utils.aoa_to_sheet([
    ["AJUSTE DE MEZCLA DE PRUEBA"],
    [],
    ["Variable", "Inicial", "Ajustado", "Unidad", "Criterio"],
    ["Cemento", project.adjustment.cementDry, adjustment.adjustedCement, "kg/m³", "Conservar a/c"],
    ["Agua", project.adjustment.waterDry, adjustment.adjustedWater, "kg/m³", "Corrección por slump"],
    ["Agregado fino", project.adjustment.fineDry, adjustment.fineDryAdjusted, "kg/m³", "Diferencia por peso unitario"],
    ["Agregado grueso", project.adjustment.coarseDry, adjustment.coarseDryAdjusted, "kg/m³", "Rendimiento real"],
    ["Rendimiento", project.adjustment.nominalVolume, adjustment.actualYield, "m³", "Peso tanda / P.U."],
    ["Agua a adicionar final", project.adjustment.waterAddedBatch, adjustment.waterToAddAdjusted, "kg/m³", "Agua efectiva - libre"],
  ]);
  setWidths(trial, [28, 16, 16, 14, 32]);
  XLSX.utils.book_append_sheet(workbook, trial, "03_Ajuste_Prueba");

  const fineGrad = XLSX.utils.aoa_to_sheet([
    ["GRANULOMETRÍA - AGREGADO FINO"],
    ["Malla", "Abertura mm", "Retenido g", "% retenido", "% retenido acum.", "% pasante"],
    ...aggregates.fineGradation.analysis.map((row) => [
      row.sieve,
      row.openingMm ?? "",
      row.retainedG,
      row.retainedPercent,
      row.cumulativePercent,
      row.passingPercent,
    ]),
    [],
    ["Módulo de finura", aggregates.fineGradation.finenessModulus],
    ["Serie MF completa", aggregates.fineGradation.finenessComplete ? "Sí" : "No"],
    ["Peso total", aggregates.fineGradation.total, "g"],
  ]);
  setWidths(fineGrad, [14, 15, 15, 16, 20, 15]);
  XLSX.utils.book_append_sheet(workbook, fineGrad, "04_Granulometria_AF");

  const coarseGrad = XLSX.utils.aoa_to_sheet([
    ["GRANULOMETRÍA - AGREGADO GRUESO"],
    ["Malla", "Abertura mm", "Retenido g", "% retenido", "% retenido acum.", "% pasante"],
    ...aggregates.coarseGradation.analysis.map((row) => [
      row.sieve,
      row.openingMm ?? "",
      row.retainedG,
      row.retainedPercent,
      row.cumulativePercent,
      row.passingPercent,
    ]),
    [],
    ["Peso total", aggregates.coarseGradation.total, "g"],
  ]);
  setWidths(coarseGrad, [14, 15, 15, 16, 20, 15]);
  XLSX.utils.book_append_sheet(workbook, coarseGrad, "05_Granulometria_AG");

  const aggregateSheet = XLSX.utils.aoa_to_sheet([
    ["FICHAS TÉCNICAS DE AGREGADOS"],
    [],
    ["Propiedad", "Agregado fino", "Agregado grueso", "Unidad / método"],
    ["Humedad promedio", aggregates.fineMoisture.average, aggregates.coarseMoisture.average, "% · ASTM C566"],
    ["Desviación estándar humedad", aggregates.fineMoisture.standardDeviation, aggregates.coarseMoisture.standardDeviation, "%"],
    ["Material fino por lavado", aggregates.fines.average, "", "% · ASTM C117"],
    ["Peso unitario suelto", project.aggregateLab.fineUnitWeightLoose, project.aggregateLab.coarseUnitWeightLoose, "kg/m³ · ASTM C29"],
    ["Peso unitario compactado", project.aggregateLab.fineUnitWeightCompacted, project.aggregateLab.coarseUnitWeightCompacted, "kg/m³ · ASTM C29"],
    ["Vacíos suelto", aggregates.fineVoidsLoose, aggregates.coarseVoidsLoose, "%"],
    ["Vacíos compactado", aggregates.fineVoidsCompacted, aggregates.coarseVoidsCompacted, "%"],
    ["Gravedad específica bulk", project.aggregateLab.fineSpecificGravity, project.aggregateLab.coarseSpecificGravity, "ASTM C127/C128"],
    ["Gravedad específica SSD", project.aggregateLab.fineBulkSsd, project.aggregateLab.coarseBulkSsd, "ASTM C127/C128"],
    ["Gravedad específica aparente", project.aggregateLab.fineApparent, project.aggregateLab.coarseApparent, "ASTM C127/C128"],
    ["Absorción", project.aggregateLab.fineAbsorption, project.aggregateLab.coarseAbsorption, "%"],
    ["Abrasión Los Ángeles", "", aggregates.abrasion, "% · ASTM C131"],
  ]);
  setWidths(aggregateSheet, [34, 20, 20, 25]);
  XLSX.utils.book_append_sheet(workbook, aggregateSheet, "06_Fichas_Agregados");

  const compressionSheet = XLSX.utils.aoa_to_sheet([
    ["CONTROL DE RESISTENCIA A COMPRESIÓN"],
    [],
    ["ID", "Edad d", "Diámetro cm", "Área cm²", "Factor", "Ref. kgf/cm²", "Carga real tf", "Resistencia real", "MPa", "% f'cr", "% f'c", "Estado", "Tipo de falla", "Observación"],
    ...compression.map((test) => [
      test.id,
      test.age,
      project.mix.specimenDiameter,
      test.areaCm2,
      test.maturityFactor,
      test.referenceStrength,
      test.loadTf ?? "",
      test.strengthKgfCm2 ?? "",
      test.strengthMpa ?? "",
      test.percentFcr ?? "",
      test.percentFc ?? "",
      test.status,
      test.failureType,
      test.observation,
    ]),
  ]);
  setWidths(compressionSheet, [10, 10, 14, 14, 10, 16, 14, 18, 12, 12, 12, 14, 32, 32]);
  XLSX.utils.book_append_sheet(workbook, compressionSheet, "07_Probetas");

  const methodSheet = XLSX.utils.aoa_to_sheet([
    ["COMPARACIÓN DE MÉTODOS DE DOSIFICACIÓN"],
    ["Base común", `f'cr ${results.fcr} kgf/cm² · slump ${project.mix.slump} cm · TMN ${project.methods.nominalMaximumMm} mm · MF ${comparison.finenessModulus}`],
    [],
    ["Método", "Agua diseño kg/m³", "a/c método", "a/c adoptada", "Cemento kg/m³", "A.F. seco kg/m³", "A.G. seco kg/m³", "A.F. húmedo kg/m³", "A.G. húmedo kg/m³", "Agua a añadir kg/m³", "Total húmedo kg/m³", "% A.F.", "% A.G.", "V A.G. compactado", "Base", "Advertencias"],
    ...comparison.methods.map((method) => [
      method.shortName,
      method.water,
      method.wcMethod,
      method.wc,
      method.cement,
      method.fineDry,
      method.coarseDry,
      method.fineWet,
      method.coarseWet,
      method.waterToAdd,
      method.totalWet,
      method.fineAggregatePercent,
      method.coarseAggregatePercent,
      method.coarseBulkVolume ?? "",
      method.basis,
      method.warnings.join(" "),
    ]),
    [],
    ["Corrección Walker", "Peso A.G. = volumen compactado × peso unitario seco compactado; no se usa gravedad específica × 1.000."],
  ]);
  setWidths(methodSheet, [18, 18, 14, 15, 18, 18, 18, 19, 19, 20, 20, 12, 12, 18, 58, 58]);
  XLSX.utils.book_append_sheet(workbook, methodSheet, "08_Comparacion_Metodos");

  const fullerSheet = XLSX.utils.aoa_to_sheet([
    ["OPTIMIZACIÓN FULLER / MÉTODO GRÁFICO"],
    [],
    ["TMN mm", project.methods.nominalMaximumMm],
    ["Exponente n", project.methods.fullerExponent],
    ["Modo", project.methods.fullerUseOptimized ? "Óptimo por mínimos cuadrados" : "Ajuste manual"],
    ["Arena óptima %", comparison.fuller.optimizedFinePercent],
    ["Arena seleccionada %", comparison.fuller.selectedFinePercent],
    ["RMSE óptimo", comparison.fuller.optimizedRmse],
    ["RMSE seleccionado", comparison.fuller.selectedRmse],
    ["Desviación máxima", comparison.fuller.maximumDeviation],
    [],
    ["Malla", "Abertura mm", "Pasante A.F. %", "Pasante A.G. %", "Fuller objetivo %", "Combinado %", "Desviación pp"],
    ...comparison.fuller.points.map((point) => [point.sieve, point.openingMm, point.finePassing, point.coarsePassing, point.targetPassing, point.combinedPassing, point.deviation]),
    [],
    ["Advertencias", comparison.fuller.warnings.join(" ")],
  ]);
  setWidths(fullerSheet, [16, 18, 18, 18, 20, 18, 18]);
  XLSX.utils.book_append_sheet(workbook, fullerSheet, "09_Fuller_Optimizacion");

  const sources = XLSX.utils.aoa_to_sheet([
    ["FUENTES Y NOTAS"],
    [],
    ["Documento", "Aplicación", "Fuente oficial"],
    ["ACI 211.1-91 / ACI PRC-211.1-22", "Proporciones por volúmenes absolutos", "https://www.concrete.org/store/productdetail.aspx?ItemID=211122"],
    ["ACI PRC-211.10-24", "Evaluación de gradaciones combinadas", "https://www.concrete.org/store/productdetail.aspx?ItemID=2111024"],
    ["Fuller & Thompson (1907)", "Curva de potencia para gradación", "https://ascelibrary.org/doi/10.1061/TACEAT.0001979"],
    ["RNE E.060", "Marco peruano de concreto armado", "https://www.gob.pe/institucion/munisantamariadelmar/informes-publicaciones/2619713-e-060-concreto-armado-ds-n-010-2009"],
    ["ASTM C33/C33M-24a", "Calidad y gradación de agregados", "https://store.astm.org/c0033_c0033m-24a.html"],
    ["ASTM C566", "Contenido de humedad", "https://store.astm.org"],
    ["ASTM C117", "Material fino por lavado", "https://store.astm.org"],
    ["ASTM C29/C29M", "Peso unitario y vacíos", "https://store.astm.org"],
    ["ASTM C127/C128", "Gravedad específica y absorción", "https://store.astm.org"],
    ["ASTM C131/C131M", "Abrasión Los Ángeles", "https://store.astm.org"],
    [],
    ["Nota", project.notes],
  ]);
  setWidths(sources, [34, 42, 68]);
  XLSX.utils.book_append_sheet(workbook, sources, "10_Fuentes");

  XLSX.writeFile(workbook, `jt-diseno-mezclas-${safeFilename(project.meta.name)}.xlsx`, {
    compression: true,
  });
}

export function downloadProjectJson(project: MixProject) {
  const blob = new Blob([JSON.stringify(project, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `jt-diseno-mezclas-${safeFilename(project.meta.name)}.json`;
  link.click();
  URL.revokeObjectURL(url);
}
