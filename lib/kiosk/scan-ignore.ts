export type ScanIgnoreReason =
  | "SCAN_IGNORED_PHASE"
  | "SCAN_IGNORED_RESOLVING"
  | "SCAN_IGNORED_DEBOUNCE"
  | "SCAN_IGNORED_CONFIRMED";

export type ScanHintType = "warning" | "info";

export interface ScanHint {
  type: ScanHintType;
  message: string;
}

const IGNORE_MESSAGES: Record<ScanIgnoreReason, string> = {
  SCAN_IGNORED_PHASE: "Scanner not ready",
  SCAN_IGNORED_RESOLVING: "Processing previous scan…",
  SCAN_IGNORED_DEBOUNCE: "QR already processed — hold steady",
  SCAN_IGNORED_CONFIRMED: "QR already processed",
};

export function getScanIgnoreMessage(reason: ScanIgnoreReason): string {
  return IGNORE_MESSAGES[reason];
}

export function scanHintForIgnoreReason(reason: ScanIgnoreReason): ScanHint {
  return {
    type:
      reason === "SCAN_IGNORED_DEBOUNCE" ? "info" : "warning",
    message: getScanIgnoreMessage(reason),
  };
}
