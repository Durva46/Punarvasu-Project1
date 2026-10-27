/**
 * frontend/src/types.ts
 *
 * Frontend TypeScript contracts mirroring backend API models.
 */

export type Role = "admin" | "analyst" | "verifier" | "viewer";

export interface UserProfile {
  id: string;
  fullName: string;
  role: Role;
  active: boolean;
}

export interface MediaPreparationRow {
  id: string;
  mediaId: string;
  date: string;       // DD-MM-YYYY
  isoDate: string;    // YYYY-MM-DD
  mediaName: string;
  isConditional: boolean;
  displayOrder: number;
  openingBalanceGm: number | null;
  quantityUsedGm: number | null;
  balanceGm: number | null;
  tubePlates: number;
  formulaText: string;
  quantityPerTube: number | null;
  unit: string;
  usedIn: string[];
  preparedBy: string | null;
  status: "READY" | "LOW_STOCK" | "REFILL_REQUIRED" | "CALCULATION_BLOCKED" | "COMPLETE";
  flags: {
    lowStock: boolean;
    refillRequired: boolean;
    blocked: boolean;
    overridden: boolean;
  };
}

export interface MediaPreparationHeader {
  date: string | null;
  isoDate: string | null;
  totalSamples: number;
  waterSamples: number;
  nonWaterSamples: number;
  positiveControl: number;
  negativeControl: number;
  lowStockThreshold: number;
  requiresInitialBalance: boolean;
}

export interface MediaRecordsResponse {
  header: MediaPreparationHeader;
  rows: MediaPreparationRow[];
}

export interface MediaInventoryItem {
  mediaId: string;
  mediaName: string;
  displayOrder: number;
  unit: string;
  currentBalanceGm: number | null;
  status: string;
  isLowStock: boolean;
  lastUpdatedDate: string | null;
}

export interface AlertItem {
  id: string;
  reportId: string | null;
  alertType: string;
  severity: "INFO" | "WARNING" | "ERROR";
  message: string;
  relatedTable: string | null;
  relatedId: string | null;
  resolved: boolean;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface MediaMasterItem {
  id: string;
  name: string;
  displayOrder: number;
  quantityPerTube: number | null;
  unit: string;
  formulaKey: string | null;
  isConditional: boolean;
  active: boolean;
}

export interface MediaFormulaItem {
  id: string;
  formulaKey: string;
  label: string;
  expressionText: string;
  variables: string[];
  notes: string | null;
}

// ─────────────────────────────────────────────────────────────────────────────
// AUTOCLAVE TYPES (Phase 5)
// ─────────────────────────────────────────────────────────────────────────────

export interface AutoclaveEntry {
  id: string;
  reportId: string;
  reportingMonth: string;
  logDate: string; // DD-MM-YYYY
  loadTypeId: string;
  loadTypeName: string;
  loadDescription: string;
  autoclaveStartTime: string; // HH:mm
  sterilizationStartTime: string; // HH:mm
  temperatureC: number;
  pressureValue: number;
  pressureUnit: string;
  endTime: string; // HH:mm
  endDateOffset: number;
  endTimeOverridden: boolean;
  actualTemperatureC: number | null;
  actualPressureValue: number | null;
  actualPressureUnit: string | null;
  actualStartTime: string | null;
  actualEndTime: string | null;
  verificationStatus: "PREFILLED" | "PENDING_VERIFICATION" | "VERIFIED";
  isUserEdited: boolean;
  doneBy: string;
  doneById: string;
  verifiedBy: string | null;
  verifiedAt: string | null;
  notes: string | null;
  sourceCount: number;
  limitWarning: boolean;
  cleaning: Array<{ date: string; status: "SCHEDULED" | "COMPLETED" | "OVERDUE" }>;
}

export interface CleaningScheduleRow {
  id: string;
  equipmentId: string;
  reportingMonth: string;
  scheduledDate: string;        // DD-MM-YYYY
  scheduledDateIso: string;     // YYYY-MM-DD
  status: "SCHEDULED" | "COMPLETED";
  statusDisplay: "SCHEDULED" | "COMPLETED" | "OVERDUE";
  actualDate: string | null;    // DD-MM-YYYY
  actualDateIso: string | null; // YYYY-MM-DD
  doneBy: string | null;
  doneById: string | null;
  completedAt: string | null;
}

export interface CleaningScheduleResponse {
  total: number;
  scheduledCount: number;
  completedCount: number;
  overdueCount: number;
  rows: CleaningScheduleRow[];
}

export interface AutoclaveSummary {
  totalEntries: number;
  completedCount: number;
  prefilledCount: number;
  pendingCount: number;
  cleaning: {
    scheduled: number;
    completed: number;
    overdue: number;
  };
  equipment: {
    formatNo: string;
    refSopNo: string;
    equipmentNo: string;
  } | null;
}

export interface LoadTypeItem {
  id: string;
  name: string;
  active: boolean;
  displayOrder: number;
}

export interface StaffItem {
  id: string;
  full_name: string;
  role: Role;
}

export interface AuditHistoryItem {
  id: string;
  action: string;
  field: string | null;
  oldValue: string | null;
  newValue: string | null;
  reason: string | null;
  changedBy: string;
  changedAt: string;
}

export interface FinalReviewChecklistItem {
  id: string;
  category: "excel" | "media" | "autoclave" | "cleaning" | "alerts";
  title: string;
  status: "OK" | "WARNING" | "ERROR";
  description: string;
  linkPath: string;
}

export interface FinalReviewSummary {
  reportingMonth: string;
  reportId: string | null;
  hasData: boolean;
  canDownload: boolean;
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

export interface AutoclaveSettingsResponse {
  settings: {
    autoclave_start_time?: string;
    sterilization_start_time?: string;
    temperature_c?: number;
    pressure_value?: number;
    pressure_unit?: string;
    sterilization_duration_minutes?: number;
    cycle_grouping_mode?: string;
    cleaning_first_day?: number;
    cleaning_second_day?: number;
    cleaning_interval_days?: number;
    allow_select_other_staff?: boolean;
    temperature_min_c?: number | null;
    temperature_max_c?: number | null;
    pressure_min?: number | null;
    pressure_max?: number | null;
  };
  pendingConfirmation: string[];
}
