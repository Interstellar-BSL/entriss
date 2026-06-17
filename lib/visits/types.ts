import type { BadgeTemplateType } from "@prisma/client";
import type {
  VisitApprovalRecord,
  VisitCapturedDocumentRecord,
  VisitCheckInMediaRecord,
  VisitEventRecord,
  VisitWithRelations,
} from "@/lib/services/internal/visit-include";
import type { BadgePrinterLayout } from "@/lib/devices/badge-printer.interface";

export type {
  VisitApprovalRecord,
  VisitCapturedDocumentRecord,
  VisitCheckInMediaRecord,
  VisitEventRecord,
};

export interface VisitDetail extends VisitWithRelations {
  createdAt: string;
  updatedAt: string;
  cancelledAt: string | null;
  cancelReason: string | null;
  approvals: VisitApprovalRecord[];
  events: VisitEventRecord[];
  checkIn?: VisitCheckInMediaRecord;
}

export interface VisitQRResult {
  visitId: string;
  token: string;
  expiresAt: string;
}

export interface ResolvedVisitQrResult {
  visit: VisitWithRelations;
  qr: {
    valid: true;
    expiringSoon: boolean;
    expiresAt: string;
  };
}

export interface ThermalBadgeData {
  mode: "thermal_printer";
  visitId: string;
  organizationId: string;
  badgeNumber: string;
  badgeTemplate: BadgeTemplateType;
  visitor: {
    fullName: string;
    company: string | null;
    photoUrl: string | null;
  };
  host: {
    name: string | null;
    email: string;
  };
  organization: {
    name: string;
    logoUrl: string | null;
  };
  qr: {
    payload: string;
    expiresAt: string | null;
  };
  checkInTime: string | null;
  layout: BadgePrinterLayout;
  printData: {
    visitId: string;
    organizationId: string;
    badgeNumber: string;
    layout: BadgePrinterLayout;
    metadata: {
      printedAt: string;
      printerType?: string;
    };
  };
}

export interface A4BadgeLayout {
  mode: "a4_fallback";
  pageSize: "A4";
  orientation: "portrait";
  visitId: string;
  badgeNumber: string;
  sections: Array<{
    type: "header" | "visitor" | "host" | "qr" | "footer";
    content: Record<string, string | null>;
  }>;
}

import type { VisitState } from "@/lib/server/visits/visit-states";

export type { VisitState } from "@/lib/server/visits/visit-states";
export { normalizeVisitState } from "@/lib/server/visits/visit-states";

export type CheckInWorkflowState = VisitState;

export interface CheckInResult {
  visit: VisitWithRelations;
  badge?: ThermalBadgeData;
  method: string;
  state: VisitState;
  ui?: "kiosk-approval-pending";
}

export interface CheckOutResult {
  visit: VisitWithRelations;
  method: string;
}

export interface BranchOption {
  id: string;
  name: string;
  requiresApproval?: boolean;
}

export interface HostOption {
  id: string;
  name: string;
  email: string;
}

export interface RegisterVisitResponse {
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company: string | null;
  };
  visit: VisitWithRelations;
  visitorCreated: boolean;
}

export interface VisitTimelineEntry {
  id: string;
  label: string;
  timestamp: string | null;
  detail?: string;
  kind: "info" | "success" | "warning" | "muted";
  isOverride?: boolean;
}
