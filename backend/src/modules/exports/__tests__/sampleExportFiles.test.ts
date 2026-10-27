import { describe, it, expect } from "vitest";
import { buildCombinedPackageWorkbook, buildMediaSheet, buildAutoclaveSheet } from "../excelBuilder";
import { buildCombinedPackagePdf, buildMediaPdf, buildAutoclavePdf } from "../pdfBuilder";
import fs from "fs";
import path from "path";
import ExcelJS from "exceljs";
import PDFDocument from "pdfkit";

describe("Generate Sample Exports on Disk", () => {
  it("writes September 2026 sample Excel and PDF files to sample_exports_september_2026", async () => {
    const outDir = path.resolve("./sample_exports_september_2026");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

    const meta = {
      reportingMonth: "2026-09",
      generatedBy: "Quality Control Officer",
      generatedAt: "27-10-2026 14:15 PM",
    };

    const equip = {
      formatNo: "QC/M/023/F/01",
      refSopNo: "PM/QC/M/023",
      equipmentNo: "PM/QC/M/01",
    };

    const mediaRows = [
      {
        date: "01-09-2026",
        mediaName: "Soybean Casein Digest Broth",
        openingBalanceGm: 500.0,
        quantityUsedGm: 21.6,
        balanceGm: 478.4,
        tubePlates: 8,
        usedIn: "AR/26/09/001, AR/26/09/002",
        preparedBy: "Dr. Analyst",
        status: "COMPLETE",
        isBlocked: false,
      },
      {
        date: "01-09-2026",
        mediaName: "Mac Conkey's Broth",
        openingBalanceGm: 300.0,
        quantityUsedGm: null,
        balanceGm: null,
        tubePlates: 14,
        usedIn: "AR/26/09/001, AR/26/09/002",
        preparedBy: "Dr. Analyst",
        status: "CALCULATION_BLOCKED",
        isBlocked: true,
      },
      {
        date: "01-09-2026",
        mediaName: "R2A Agar",
        openingBalanceGm: 250.0,
        quantityUsedGm: 5.4,
        balanceGm: 244.6,
        tubePlates: 4,
        usedIn: "AR/26/09/001 (Purified Water)",
        preparedBy: "Dr. Analyst",
        status: "COMPLETE",
        isBlocked: false,
      },
      {
        date: "07-09-2026",
        mediaName: "Peptone Water",
        openingBalanceGm: 400.0,
        quantityUsedGm: 9.0,
        balanceGm: 391.0,
        tubePlates: 9,
        usedIn: "AR/26/09/003, AR/26/09/004",
        preparedBy: "Dr. Analyst",
        status: "COMPLETE",
        isBlocked: false,
      },
    ];

    const autoclaveRows = [
      {
        date: "01-09-2026",
        cycleLoadName: "Media – 01-09-2026 (4 samples)",
        autoclaveStartTime: "11:00 AM",
        sterilizationStartTime: "11:10 AM",
        temperatureC: "121 °C",
        pressure: "15 LBS",
        endTime: "11:25 AM",
        actualTemperatureC: "121.2 °C",
        actualPressure: "15.1 LBS",
        actualStartTime: "11:11 AM",
        actualEndTime: "11:26 AM",
        cleaningWeekly: "Completed 01-09-2026",
        doneBy: "K. Patel (Analyst)",
        verificationStatus: "Verified" as const,
        isCleaningOnlyRow: false,
      },
      {
        date: "07-09-2026",
        cycleLoadName: "Media – 07-09-2026 (7 samples)",
        autoclaveStartTime: "11:00 AM",
        sterilizationStartTime: "11:10 AM",
        temperatureC: "121 °C",
        pressure: "15 LBS",
        endTime: "11:25 AM",
        cleaningWeekly: "Scheduled 07-09-2026",
        doneBy: "K. Patel (Analyst)",
        verificationStatus: "Pending verification" as const,
        isCleaningOnlyRow: false,
      },
      {
        date: "14-09-2026",
        cycleLoadName: "",
        autoclaveStartTime: "",
        sterilizationStartTime: "",
        temperatureC: "",
        pressure: "",
        endTime: "",
        cleaningWeekly: "Scheduled 14-09-2026",
        doneBy: "R. Sharma (Cleaning)",
        verificationStatus: "Planned" as const,
        isCleaningOnlyRow: true,
      },
    ];

    // 1. Excel files
    const wbMedia = new ExcelJS.Workbook();
    const wsM = wbMedia.addWorksheet("Media Preparation Record");
    buildMediaSheet(wsM, mediaRows, meta);
    await wbMedia.xlsx.writeFile(path.join(outDir, "Media_Preparation_Record_2026-09.xlsx"));

    const wbAuto = new ExcelJS.Workbook();
    const wsA = wbAuto.addWorksheet("Autoclave Log Book");
    buildAutoclaveSheet(wsA, autoclaveRows, equip, meta);
    await wbAuto.xlsx.writeFile(path.join(outDir, "Autoclave_Log_Book_2026-09.xlsx"));

    const wbPkg = await buildCombinedPackageWorkbook(mediaRows, autoclaveRows, equip, meta);
    await wbPkg.xlsx.writeFile(path.join(outDir, "Monthly_Package_2026-09.xlsx"));

    // 2. PDF files
    const streamToDisk = (doc: PDFKit.PDFDocument, filePath: string) => {
      return new Promise<void>((resolve, reject) => {
        const stream = fs.createWriteStream(filePath);
        doc.pipe(stream);
        doc.on("end", resolve);
        doc.on("error", reject);
        doc.end();
      });
    };

    const docM = new PDFDocument({ size: "A4", layout: "landscape", autoFirstPage: true });
    buildMediaPdf(docM, mediaRows, meta);
    await streamToDisk(docM, path.join(outDir, "Media_Preparation_Record_2026-09.pdf"));

    const docA = new PDFDocument({ size: "A4", layout: "landscape", autoFirstPage: true });
    buildAutoclavePdf(docA, autoclaveRows, equip, meta);
    await streamToDisk(docA, path.join(outDir, "Autoclave_Log_Book_2026-09.pdf"));

    const docPkg = buildCombinedPackagePdf(mediaRows, autoclaveRows, equip, meta);
    await streamToDisk(docPkg, path.join(outDir, "Monthly_Package_2026-09.pdf"));

    expect(fs.existsSync(path.join(outDir, "Media_Preparation_Record_2026-09.xlsx"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "Autoclave_Log_Book_2026-09.xlsx"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "Monthly_Package_2026-09.xlsx"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "Media_Preparation_Record_2026-09.pdf"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "Autoclave_Log_Book_2026-09.pdf"))).toBe(true);
    expect(fs.existsSync(path.join(outDir, "Monthly_Package_2026-09.pdf"))).toBe(true);
  });
});
