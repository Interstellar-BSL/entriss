/**
 * Device abstraction for badge printers (Zebra, Brother, generic thermal).
 * Implement this interface per printer vendor/SDK — no vendor logic here.
 */

export interface BadgePrinterField {
  key: string;
  label: string;
  value: string;
  fontSize?: "sm" | "md" | "lg";
  bold?: boolean;
}

export interface BadgePrinterLayout {
  widthMm: number;
  heightMm: number;
  dpi: number;
  orientation: "portrait" | "landscape";
  fields: BadgePrinterField[];
  qrPayload?: string;
  logoUrl?: string | null;
}

export interface BadgePrintData {
  visitId: string;
  organizationId: string;
  badgeNumber: string;
  layout: BadgePrinterLayout;
  metadata: {
    printedAt: string;
    printerType?: string;
  };
}

export interface BadgePrintResult {
  success: boolean;
  jobId?: string;
  message?: string;
}

export interface BadgePrinter {
  readonly printerId: string;
  readonly printerType: string;
  printBadge(data: BadgePrintData): Promise<BadgePrintResult>;
}

export interface BadgePrinterDriver {
  supports(printerType: string): boolean;
  createPrinter(config: Record<string, unknown>): BadgePrinter;
}
