import { apiFetch } from "@/lib/api/client";
import type {
  AbandonedRegistrationStage,
  KioskRecoveryStep,
  ReceptionAbandonedRegistration,
  ReceptionApprovalKind,
  ReceptionCheckedInRow,
  ReceptionDashboard,
  ReceptionDashboardMetrics,
  ReceptionDashboardVisitRow,
  ReceptionFailedKioskSession,
  ReceptionOverdueRow,
  ReceptionPendingApprovalRow,
} from "@/lib/services/reception-dashboard.service";

export type {
  AbandonedRegistrationStage,
  KioskRecoveryStep,
  ReceptionAbandonedRegistration,
  ReceptionApprovalKind,
  ReceptionCheckedInRow,
  ReceptionDashboard,
  ReceptionDashboardMetrics,
  ReceptionDashboardVisitRow,
  ReceptionFailedKioskSession,
  ReceptionOverdueRow,
  ReceptionPendingApprovalRow,
};

export async function getReceptionDashboard() {
  return apiFetch<ReceptionDashboard>("/api/v1/reception/dashboard");
}
