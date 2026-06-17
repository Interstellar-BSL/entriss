import type { CreateVisitorFormValues } from "@/components/visitors/schemas";
import {
  createVisitor,
  resolveVisitorIdentity,
  type CreateVisitorInput,
  type VisitorRecord,
  type VisitorVisitStats,
} from "@/lib/api/visitors";
import {
  checkInVisit as apiCheckInVisit,
  checkOutVisit as apiCheckOutVisit,
  createVisit as apiCreateVisit,
  getVisit as apiGetVisit,
  registerVisit as apiRegisterVisit,
} from "@/lib/api/visits";
import type { CheckInResult } from "@/lib/visits/types";
import { detachVisitorRecord } from "@/lib/visits/detach";
import type { RegisterVisitResponse } from "@/lib/visits/types";

export interface PendingVisitorIdentityResolution {
  input: CreateVisitorFormValues;
  existingVisitor: VisitorRecord;
  visitStats: VisitorVisitStats | null;
}

export type VisitorIdentityDecision =
  | { type: "use-existing"; visitorId: string }
  | { type: "create-separate" }
  | { type: "no-conflict" };

export interface WalkInVisitorInput {
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  company?: string;
  photoUrl?: string;
  notes?: string;
}

export interface WalkInVisitInput {
  branchId: string;
  hostMemberId: string;
  purpose?: string;
  scheduledAt?: string;
}

export function toCreateVisitorInput(
  values: CreateVisitorFormValues,
): CreateVisitorInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    company: values.company,
  };
}

export function toWalkInVisitorInput(
  values: CreateVisitorFormValues,
): WalkInVisitorInput {
  return {
    firstName: values.firstName,
    lastName: values.lastName,
    email: values.email,
    phone: values.phone,
    company: values.company,
  };
}

/** Phase 1 — resolve identity before any visitor mutation. */
export async function resolveVisitor(input: {
  email?: string;
  phone?: string;
}) {
  return resolveVisitorIdentity(input);
}

export async function checkVisitorIdentityConflict(
  values: CreateVisitorFormValues,
): Promise<PendingVisitorIdentityResolution | null> {
  const resolution = await resolveVisitorIdentity({
    email: values.email,
    phone: values.phone,
  });

  if (!resolution.visitor) {
    return null;
  }

  return {
    input: values,
    existingVisitor: detachVisitorRecord(resolution.visitor),
    visitStats: resolution.visitSummary,
  };
}

export async function createVisitorWithDecision(
  values: CreateVisitorFormValues,
  decision: VisitorIdentityDecision,
) {
  if (decision.type === "use-existing") {
    return {
      visitor: { id: decision.visitorId } as VisitorRecord,
      created: false as const,
    };
  }

  return createVisitor({
    ...toCreateVisitorInput(values),
    ...(decision.type === "create-separate"
      ? { forceCreateVisitor: true }
      : {}),
  });
}

export async function createSeparateVisitor(values: CreateVisitorFormValues) {
  return createVisitorWithDecision(values, { type: "create-separate" });
}

export async function registerWalkInVisit(params: {
  visitor: WalkInVisitorInput;
  visit: WalkInVisitInput;
  decision: VisitorIdentityDecision;
}): Promise<RegisterVisitResponse> {
  const { visitor, visit, decision } = params;

  if (decision.type === "use-existing") {
    return apiRegisterVisit({
      visitorId: decision.visitorId,
      visit,
    });
  }

  return apiRegisterVisit({
    visitor,
    visit,
    ...(decision.type === "create-separate"
      ? { forceCreateVisitor: true }
      : {}),
  });
}

export async function scheduleVisit(params: {
  visitorId: string;
  branchId: string;
  hostMemberId: string;
  purpose: string;
  scheduledAt: string;
}) {
  return apiCreateVisit(params);
}

export async function scheduleVisitWithNewVisitor(params: {
  visitor: CreateVisitorFormValues;
  visit: {
    branchId: string;
    hostMemberId: string;
    purpose: string;
    scheduledAt: string;
  };
  decision: VisitorIdentityDecision;
}) {
  let visitorId: string;
  let visitorCreated: boolean;

  if (params.decision.type === "use-existing") {
    visitorId = params.decision.visitorId;
    visitorCreated = false;
  } else {
    const created = await createVisitorWithDecision(
      params.visitor,
      params.decision,
    );
    visitorId = created.visitor.id;
    visitorCreated = created.created;
  }

  const visitResult = await apiCreateVisit({
    visitorId,
    ...params.visit,
  });

  return {
    visit: visitResult.visit,
    visitorCreated,
  };
}

export async function checkInVisit(
  params:
    | string
    | {
        visitId: string;
        visitorId?: string;
        photo?: string | null;
        documents?: unknown[];
        source?: "kiosk" | "reception" | "api";
      },
): Promise<CheckInResult> {
  if (typeof params === "string") {
    return apiCheckInVisit(params);
  }

  return apiCheckInVisit(params.visitId, {
    photoUrl: params.photo ?? undefined,
    documents: params.documents as
      | Array<{
          id: string;
          type?: string;
          imageUrl: string;
          label?: string;
          capturedAt?: string | Date;
        }>
      | undefined,
    source: params.source,
  });
}

/** Background status poll for kiosk approval completion. */
export async function pollVisitStatus(visitId: string) {
  return apiGetVisit(visitId);
}

export async function checkOutVisit(visitId: string) {
  return apiCheckOutVisit(visitId);
}
