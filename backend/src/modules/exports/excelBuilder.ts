/**
 * backend/src/modules/exports/excelBuilder.ts
 *
 * Generates Excel workbooks using exceljs strictly according to Phase 7 specs:
 * 1. Media Preparation Record
 * 2. Autoclave Log Book (Sterilization)
 * 3. Combined Monthly Package (2 sheets)
 *
 * Formatting:
 * - Proper borders, bold headers matching printed forms
 * - Merged date cells in Media Record
 * - Real numbers (2 decimals for gm) and real dates
 * - Landscape print setup, repeat header rows, freeze panes
 */

import ExcelJS from "exceljs";
import { MediaExportRow, AutoclaveExportRow, EquipmentExportInfo } from "./types";

interface ExportMetadata {
  reportingMonth: string;
  generatedBy: string;
  generatedAt: string;
}

const THIN_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin", color: { argb: "FFCCCCCC" } },
  left: { style: "thin", color: { argb: "FFCCCCCC" } },
  bottom: { style: "thin", color: { argb: "FFCCCCCC" } },
  right: { style: "thin", color: { argb: "FFCCCCCC" } },
};

const HEADER_BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "medium", color: { argb: "FF333333" } },
  left: { style: "thin", color: { argb: "FF999999" } },
  bottom: { style: "medium", color: { argb: "FF333333" } },
  right: { style: "thin", color: { argb: "FF999999" } },
};

/**
 * Builds the Media Preparation Record worksheet.
 */
export function buildMediaSheet(
  ws: ExcelJS.Worksheet,
  rows: MediaExportRow[],
  meta: ExportMetadata
): void {
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.4, right: 0.4, top: 0.5, bottom: 0.5, header: 0.2, footer: 0.2 },
  };

  // Define Columns
  ws.columns = [
    { key: "date", width: 14 },
    { key: "mediaName", width: 34 },
    { key: "openingBalance", width: 18 },
    { key: "quantityUsed", width: 18 },
    { key: "balanceQuantity", width: 18 },
    { key: "tubePlates", width: 12 },
    { key: "usedIn", width: 32 },
    { key: "preparedBy", width: 20 },
    { key: "notes", width: 12 },
  ];

  // Header 3 lines
  ws.mergeCells("A1:I1");
  ws.getCell("A1").value = "PETLAD MAHAL AROGYA MANDAL PHARMACY";
  ws.getCell("A1").font = { name: "Arial", size: 14, bold: true };
  ws.getCell("A1").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A2:I2");
  ws.getCell("A2").value =
    "At & Po. Village- Piplata- 387355, Ta.: Nadiad, Dist.: Kheda (Gujarat)";
  ws.getCell("A2").font = { name: "Arial", size: 10, italic: true };
  ws.getCell("A2").alignment = { horizontal: "center", vertical: "middle" };

  ws.mergeCells("A3:I3");
  ws.getCell("A3").value = `Media Preparation Record — ${meta.reportingMonth}`;
  ws.getCell("A3").font = { name: "Arial", size: 12, bold: true };
  ws.getCell("A3").alignment = { horizontal: "center", vertical: "middle" };

  ws.addRow([]); // empty spacing

  // Table Column Headers (Row 5)
  const headerRow = ws.addRow([
    "Date",
    "Name of Media",
    "Opening balance (gm)",
    "Quantity Used (gm)",
    "Balance Quantity (gm)",
    "Tube/Plates",
    "Used in",
    "Prepared by",
    "Status",
  ]);

  headerRow.height = 24;
  headerRow.eachCell((cell) => {
    cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
    cell.fill = {
      type: "pattern",
      pattern: "solid",
      fgColor: { argb: "FF2563EB" }, // Blue-600
    };
    cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    cell.border = HEADER_BORDER;
  });

  // Freeze panes below row 5
  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 5 }];

  // Populate data rows and merge date cells per date group
  let currentDate = "";
  let groupStartRow = 6;
  let currentRowIdx = 6;

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const isNewDate = r.date !== currentDate;

    if (isNewDate && i > 0) {
      if (currentRowIdx - 1 > groupStartRow) {
        ws.mergeCells(`A${groupStartRow}:A${currentRowIdx - 1}`);
      }
      groupStartRow = currentRowIdx;
    }
    currentDate = r.date;

    const row = ws.addRow([
      r.date,
      r.mediaName,
      r.openingBalanceGm !== null ? Number(r.openingBalanceGm.toFixed(2)) : "—",
      r.quantityUsedGm !== null ? Number(r.quantityUsedGm.toFixed(2)) : "—",
      r.balanceGm !== null ? Number(r.balanceGm.toFixed(2)) : "—",
      r.tubePlates,
      r.usedIn,
      r.preparedBy,
      r.isBlocked ? "Blocked" : "",
    ]);

    row.height = 20;

    // Cell alignments & number formats
    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(5).alignment = { horizontal: "right", vertical: "middle" };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(7).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    row.getCell(8).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };

    if (r.openingBalanceGm !== null) row.getCell(3).numFmt = "#,##0.00";
    if (r.quantityUsedGm !== null) row.getCell(4).numFmt = "#,##0.00";
    if (r.balanceGm !== null) row.getCell(5).numFmt = "#,##0.00";

    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9 };
      cell.border = THIN_BORDER;
    });

    if (r.isBlocked) {
      row.getCell(9).font = { name: "Arial", size: 8, color: { argb: "FFDC2626" }, bold: true };
    }

    currentRowIdx++;
  }

  // Merge last group if needed
  if (rows.length > 0 && currentRowIdx - 1 > groupStartRow) {
    ws.mergeCells(`A${groupStartRow}:A${currentRowIdx - 1}`);
  }

  // Footer spacing
  ws.addRow([]);
  const footRow1 = ws.addRow([
    "Prepared By: ___________________________",
    "",
    "",
    "",
    "Approved By: ___________________________",
  ]);
  footRow1.font = { name: "Arial", size: 9, bold: true };

  const footRow2 = ws.addRow([
    `Reporting Month: ${meta.reportingMonth}  |  Generated by: ${meta.generatedBy} on ${meta.generatedAt}`,
  ]);
  footRow2.font = { name: "Arial", size: 8, italic: true, color: { argb: "FF666666" } };
}

/**
 * Builds the Autoclave Log Book (Sterilization) worksheet.
 */
export function buildAutoclaveSheet(
  ws: ExcelJS.Worksheet,
  rows: AutoclaveExportRow[],
  equip: EquipmentExportInfo,
  meta: ExportMetadata
): void {
  ws.pageSetup = {
    orientation: "landscape",
    paperSize: 9, // A4
    fitToPage: true,
    fitToWidth: 1,
    fitToHeight: 0,
    margins: { left: 0.3, right: 0.3, top: 0.4, bottom: 0.4, header: 0.2, footer: 0.2 },
  };

  // Define columns
  ws.columns = [
    { key: "date", width: 13 },
    { key: "cycleLoad", width: 34 },
    { key: "autoclaveStart", width: 14 },
    { key: "sterStart", width: 14 },
    { key: "temp", width: 14 },
    { key: "pressure", width: 14 },
    { key: "endTime", width: 16 },
    { key: "cleaning", width: 26 },
    { key: "doneBy", width: 18 },
    { key: "verification", width: 16 },
  ];

  // Header rows
  ws.mergeCells("A1:G1");
  ws.getCell("A1").value = "PETLAD MAHAL AROGYA MANDAL PHARMACY, Piplata";
  ws.getCell("A1").font = { name: "Arial", size: 13, bold: true };
  ws.getCell("A1").alignment = { horizontal: "left", vertical: "middle" };

  // Equipment info box (Top right H1:J3)
  ws.mergeCells("H1:J1");
  ws.getCell("H1").value = `Format No.: ${equip.formatNo}`;
  ws.getCell("H1").font = { name: "Arial", size: 8, bold: true };

  ws.mergeCells("H2:J2");
  ws.getCell("H2").value = `Ref. SOP No.: ${equip.refSopNo}`;
  ws.getCell("H2").font = { name: "Arial", size: 8, bold: true };

  ws.mergeCells("H3:J3");
  ws.getCell("H3").value = `Equipment No.: ${equip.equipmentNo}`;
  ws.getCell("H3").font = { name: "Arial", size: 8, bold: true };

  ws.mergeCells("A2:G2");
  ws.getCell("A2").value = "Autoclave Log Book (Sterilization)";
  ws.getCell("A2").font = { name: "Arial", size: 11, bold: true, color: { argb: "FF1E40AF" } };
  ws.getCell("A2").alignment = { horizontal: "left", vertical: "middle" };

  ws.mergeCells("A3:G3");
  ws.getCell("A3").value = `Reporting Month: ${meta.reportingMonth}`;
  ws.getCell("A3").font = { name: "Arial", size: 9, italic: true };

  ws.addRow([]); // empty row 4

  // Two-tiered Header (Row 5 & 6)
  // Row 5
  const h5 = ws.addRow([
    "Date",
    "Name of Cycle Load",
    "Autoclave start time",
    "Sterilization",
    "",
    "",
    "",
    "Cleaning (weekly)",
    "Done by",
    "Verification",
  ]);
  h5.height = 20;

  // Row 6
  const h6 = ws.addRow([
    "",
    "",
    "",
    "Start Time",
    "Temperature",
    "Pressure",
    "End Time",
    "",
    "",
    "",
  ]);
  h6.height = 20;

  // Merges for two-tiered header
  ws.mergeCells("A5:A6");
  ws.mergeCells("B5:B6");
  ws.mergeCells("C5:C6");
  ws.mergeCells("D5:G5"); // Sterilization spans 4 sub-columns
  ws.mergeCells("H5:H6");
  ws.mergeCells("I5:I6");
  ws.mergeCells("J5:J6");

  [h5, h6].forEach((h) => {
    h.eachCell((cell) => {
      cell.font = { name: "Arial", size: 9, bold: true, color: { argb: "FFFFFFFF" } };
      cell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FF1E3A8A" }, // Navy blue
      };
      cell.alignment = { horizontal: "center", vertical: "middle", wrapText: true };
      cell.border = HEADER_BORDER;
    });
  });

  ws.views = [{ state: "frozen", xSplit: 0, ySplit: 6 }];

  // Data rows
  rows.forEach((r) => {
    let sterStartDisplay = r.sterilizationStartTime;
    let tempDisplay = r.temperatureC;
    let pressDisplay = r.pressure;
    let endDisplay = r.endTime;

    if (r.verificationStatus === "Verified" && r.actualStartTime) {
      sterStartDisplay = `${r.sterilizationStartTime}\nActual: ${r.actualStartTime}`;
    }
    if (r.verificationStatus === "Verified" && r.actualTemperatureC) {
      tempDisplay = `${r.temperatureC}\nActual: ${r.actualTemperatureC}`;
    }
    if (r.verificationStatus === "Verified" && r.actualPressure) {
      pressDisplay = `${r.pressure}\nActual: ${r.actualPressure}`;
    }
    if (r.verificationStatus === "Verified" && r.actualEndTime) {
      endDisplay = `${r.endTime}\nActual: ${r.actualEndTime}`;
    }

    const row = ws.addRow([
      r.date,
      r.cycleLoadName,
      r.autoclaveStartTime,
      sterStartDisplay,
      tempDisplay,
      pressDisplay,
      endDisplay,
      r.cleaningWeekly,
      r.doneBy,
      r.verificationStatus,
    ]);

    row.height = r.verificationStatus === "Verified" ? 28 : 20;

    row.getCell(1).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(2).alignment = { horizontal: "left", vertical: "middle" };
    row.getCell(3).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(4).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    row.getCell(5).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    row.getCell(6).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    row.getCell(7).alignment = { horizontal: "center", vertical: "middle", wrapText: true };
    row.getCell(8).alignment = { horizontal: "left", vertical: "middle", wrapText: true };
    row.getCell(9).alignment = { horizontal: "center", vertical: "middle" };
    row.getCell(10).alignment = { horizontal: "center", vertical: "middle" };

    row.eachCell((cell) => {
      cell.font = { name: "Arial", size: 8.5 };
      cell.border = THIN_BORDER;
    });

    // Verification column shading
    const vCell = row.getCell(10);
    if (r.verificationStatus === "Verified") {
      vCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFECFDF5" }, // Light green
      };
      vCell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF065F46" } };
    } else if (r.verificationStatus === "Pending verification") {
      vCell.fill = {
        type: "pattern",
        pattern: "solid",
        fgColor: { argb: "FFEBF8FF" }, // Light blue
      };
      vCell.font = { name: "Arial", size: 8.5, bold: true, color: { argb: "FF1E40AF" } };
    } else {
      vCell.font = { name: "Arial", size: 8.5, color: { argb: "FF4B5563" } };
    }
  });

  // Footnote and Signatures
  ws.addRow([]);
  const noteRow = ws.addRow([
    "Values marked Planned are laboratory defaults entered in advance and are not verified operating records. Only entries marked Verified have verified readings.",
  ]);
  noteRow.font = { name: "Arial", size: 8, italic: true, color: { argb: "FF4B5563" } };
  ws.mergeCells(`A${noteRow.number}:J${noteRow.number}`);

  const signRow = ws.addRow([
    "Done By: ___________________________",
    "",
    "",
    "",
    "",
    "",
    "Checked By: ___________________________",
  ]);
  signRow.font = { name: "Arial", size: 9, bold: true };

  const metaRow = ws.addRow([
    `Reporting Month: ${meta.reportingMonth}  |  Generated by: ${meta.generatedBy} on ${meta.generatedAt}`,
  ]);
  metaRow.font = { name: "Arial", size: 8, italic: true, color: { argb: "FF666666" } };
}

/**
 * Builds the Combined Monthly Package Excel Workbook containing 2 sheets.
 */
export async function buildCombinedPackageWorkbook(
  mediaRows: MediaExportRow[],
  autoclaveRows: AutoclaveExportRow[],
  equip: EquipmentExportInfo,
  meta: ExportMetadata
): Promise<ExcelJS.Workbook> {
  const wb = new ExcelJS.Workbook();
  wb.creator = meta.generatedBy;
  wb.created = new Date();

  const wsMedia = wb.addWorksheet("Media Preparation Record");
  buildMediaSheet(wsMedia, mediaRows, meta);

  const wsAuto = wb.addWorksheet("Autoclave Log Book");
  buildAutoclaveSheet(wsAuto, autoclaveRows, equip, meta);

  return wb;
}
