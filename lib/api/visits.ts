import type { VisitStatus } from "@prisma/client";
import { apiFetch, type PaginatedResult } from "@/lib/api/client";
import type { VisitWithRelations } from "@/lib/services/internal/visit-include";
import {
  detachVisitDetail,
  detachVisitWithRelations,
  detachVisits,
} from "@/lib/visits/detach";
import type {
  A4BadgeLayout,
  CheckInResult,
  CheckOutResult,
  RegisterVisitResponse,
  ResolvedVisitQrResult,
  ThermalBadgeData,
  VisitDetail,
  VisitQRResult,
} from "@/lib/visits/types";
import type { FindVisitByVisitorDetailsInput } from "@/lib/validations/operations";

export interface ListVisitsParams {
  limit?: number;
  offset?: number;
  status?: VisitStatus;
  branchId?: string;
  visitorId?: string;
  hostMemberId?: string;
  dateFrom?: string;
  dateTo?: string;
}

export async function listVisits(params?: ListVisitsParams) {
  const data = await apiFetch<PaginatedResult<VisitWithRelations>>(
    "/api/v1/visits",
    {
      searchParams: params,
    },
  );

  return {
    ...data,
    items: detachVisits(data.items),
  };
}

export interface CreateVisitResponse {
  visit: VisitWithRelations;
}

export async function createVisit(payload: {
  visitorId: string;
  branchId: string;
  hostMemberId: string;
  purpose?: string;
  scheduledAt?: string;
}) {
  const data = await apiFetch<CreateVisitResponse>("/api/v1/visits", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function registerVisit(payload: {
  visitorId?: string;
  forceCreateVisitor?: boolean;
  visitor?: {
    firstName: string;
    lastName: string;
    email?: string;
    phone?: string;
    company?: string;
    photoUrl?: string;
    notes?: string;
  };
  visit: {
    branchId: string;
    hostMemberId: string;
    purpose?: string;
    scheduledAt?: string;
  };
}) {
  const data = await apiFetch<RegisterVisitResponse>("/api/v1/visits", {
    method: "POST",
    body: JSON.stringify(payload),
  });

  return {
    ...data,
    visitor: { ...data.visitor },
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function searchVisits(criteria: FindVisitByVisitorDetailsInput) {
  const data = await apiFetch<{ visits: VisitWithRelations[] }>(
    "/api/v1/visits/search",
    {
      method: "POST",
      body: JSON.stringify(criteria),
    },
  );

  return {
    visits: detachVisits(data.visits),
  };
}

export async function checkInWithQrToken(qrToken: string) {
  const data = await apiFetch<CheckInResult>("/api/v1/visits/check-in", {
    method: "POST",
    body: JSON.stringify({ qrToken }),
  });

  return {
    ...data,
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function checkOutWithQrToken(qrToken: string) {
  const data = await apiFetch<CheckOutResult>("/api/v1/visits/check-out", {
    method: "POST",
    body: JSON.stringify({ qrToken }),
  });

  return {
    ...data,
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function getVisit(visitId: string): Promise<VisitDetail> {
  const data = await apiFetch<{ visit: VisitDetail }>(
    `/api/v1/visits/${visitId}`,
  );

  if (!data?.visit) {
    throw new Error("Could not load visit details");
  }

  return detachVisitDetail(data.visit);
}

export async function checkInVisit(
  visitId: string,
  capture?: {
    photoUrl?: string | null;
    source?: "kiosk" | "reception" | "api";
    documents?: Array<{
      id: string;
      type?: string;
      imageUrl: string;
      label?: string;
      capturedAt?: string | Date;
    }>;
  },
) {
  const data = await apiFetch<CheckInResult>("/api/v1/visits/check-in", {
    method: "POST",
    body: JSON.stringify({
      visitId,
      ...(capture?.source ? { source: capture.source } : {}),
      ...(capture?.photoUrl ? { photoUrl: capture.photoUrl } : {}),
      ...(capture?.documents?.length ? { documents: capture.documents } : {}),
    }),
  });

  return {
    ...data,
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function checkOutVisit(visitId: string) {
  const data = await apiFetch<CheckOutResult>("/api/v1/visits/check-out", {
    method: "POST",
    body: JSON.stringify({ visitId }),
  });

  return {
    ...data,
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function cancelVisit(
  visitId: string,
  cancelReason = "Cancelled at reception",
) {
  const data = await apiFetch<{ visit: VisitWithRelations }>(
    `/api/v1/visits/${visitId}/cancel`,
    {
      method: "POST",
      body: JSON.stringify({ cancelReason }),
    },
  );

  return {
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function forceCheckInVisit(
  visitId: string,
  payload: { reason: string; note?: string },
) {
  const data = await apiFetch<{ visit: VisitWithRelations }>(
    `/api/v1/visits/${visitId}/force-check-in`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return {
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function forceCheckOutVisit(
  visitId: string,
  payload: { reason: string; note?: string },
) {
  const data = await apiFetch<{ visit: VisitWithRelations }>(
    `/api/v1/visits/${visitId}/force-check-out`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );

  return {
    visit: detachVisitWithRelations(data.visit),
  };
}

export async function resolveVisitFromQr(qrToken: string) {
  const data = await apiFetch<ResolvedVisitQrResult>(
    "/api/v1/visits/qr/resolve",
    {
      method: "POST",
      body: JSON.stringify({ qrToken }),
    },
  );

  return {
    visit: detachVisitWithRelations(data.visit),
    qr: data.qr,
  };
}

export function generateVisitQR(visitId: string) {
  return apiFetch<VisitQRResult>(`/api/v1/visits/${visitId}/qr`, {
    method: "POST",
  });
}

export function getVisitBadge(visitId: string) {
  return apiFetch<ThermalBadgeData>(`/api/v1/visits/${visitId}/badge`);
}

export function getVisitBadgeA4(visitId: string) {
  return apiFetch<A4BadgeLayout>(`/api/v1/visits/${visitId}/badge`, {
    searchParams: { format: "a4" },
  });
}
