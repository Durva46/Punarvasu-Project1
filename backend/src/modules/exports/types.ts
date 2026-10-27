/**
 * backend/src/modules/exports/types.ts
 *
 * Export data contracts and review checklist types.
 */

export interface FinalReviewChecklistItem {
  id: string;
  category: "excel" | "media" | "autoclave" | "cleaning" | "alerts";
  title: string;
  status: "OK" | "WARNING" | "ERROR";
  description: string;
  details?: Record<string, any>;
  linkPath: string;
}

export interface FinalReviewSummary {
  reportingMonth: string;
  reportId: string | null;
  hasData: boolean;
  canDownload: boolean; // Always true
  hasIncompleteItems: boolean;
  checklist: FinalReviewChecklistItem[];
  counts: {
    samplesTotal: number;
    samplesValid: number;
    samplesInvalid: number;
    mediaDatesTotal: number;
    mediaDatesProcessed: number;
    mediaCalculationBlocked: number;
    autoclaveDatesTotal: number;
    autoclaveEntriesTotal: number;
    autoclavePendingVerification: number;
    autoclaveVerified: number;
    cleaningScheduled: number;
    cleaningCompleted: number;
    cleaningOverdue: number;
    alertsOpen: number;
  };
}

export interface ExportDownloadLogItem {
  id: string;
  exportType: string;
  format: string;
  reportingMonth: string;
  exportedBy: string;
  createdAt: string;
}

export interface MediaExportRow {
  date: string; // DD-MM-YYYY
  mediaName: string;
  openingBalanceGm: number | null;
  quantityUsedGm: number | null;
  balanceGm: number | null;
  tubePlates: number;
  usedIn: string;
  preparedBy: string;
  status: string;
  isBlocked: boolean;
}

export interface AutoclaveExportRow {
  date: string; // DD-MM-YYYY
  cycleLoadName: string;
  autoclaveStartTime: string;
  sterilizationStartTime: string;
  temperatureC: string;
  pressure: string;
  endTime: string;
  actualTemperatureC?: string;
  actualPressure?: string;
  actualStartTime?: string;
  actualEndTime?: string;
  cleaningWeekly: string;
  doneBy: string;
  verificationStatus: "Planned" | "Pending verification" | "Verified";
  isCleaningOnlyRow: boolean;
}

export interface EquipmentExportInfo {
  formatNo: string;
  refSopNo: string;
  equipmentNo: string;
}
