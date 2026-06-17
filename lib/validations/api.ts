import { VisitStatus } from "@/app/generated/prisma/enums";
import { z } from "zod";

import { paginationQuerySchema } from "@/lib/api/pagination";
import {
  createVisitorRequestSchema as staffCreateVisitorRequestSchema,
  resolveVisitorIdentitySchema,
} from "./visitor";
import { createVisitSchema, registerVisitorVisitSchema } from "./visit";

export const listVisitorsQuerySchema = paginationQuerySchema.extend({
  search: z.string().trim().min(1).max(200).optional(),
});

export const listVisitsQuerySchema = paginationQuerySchema.extend({
  status: z.enum(VisitStatus).optional(),
  branchId: z.string().min(1).optional(),
  visitorId: z.string().min(1).optional(),
  hostMemberId: z.string().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export const createVisitorRequestSchema = staffCreateVisitorRequestSchema;

export const resolveVisitorIdentityQuerySchema = resolveVisitorIdentitySchema;

export const createVisitRequestSchema = createVisitSchema;

export const registerVisitRequestSchema = registerVisitorVisitSchema;

const checkInCaptureDocumentSchema = z.object({
  id: z.string().min(1),
  type: z.string().optional(),
  imageUrl: z.string().min(1),
  label: z.string().optional(),
  capturedAt: z.union([z.string(), z.date()]).optional(),
});

export const checkInRequestSchema = z
  .object({
    qrToken: z.string().trim().min(10).optional(),
    visitId: z.string().min(1).optional(),
    photoUrl: z.string().min(1).optional(),
    documents: z.array(checkInCaptureDocumentSchema).optional(),
    source: z.enum(["kiosk", "reception", "api"]).optional(),
  })
  .refine((value) => Boolean(value.qrToken || value.visitId), {
    message: "Either qrToken or visitId is required",
  });

export const checkOutRequestSchema = z
  .object({
    qrToken: z.string().trim().min(10).optional(),
    visitId: z.string().min(1).optional(),
  })
  .refine((value) => Boolean(value.qrToken || value.visitId), {
    message: "Either qrToken or visitId is required",
  });

export const resolveVisitQrRequestSchema = z.object({
  qrToken: z.string().trim().min(10),
});

export function parseListVisitorsQuery(url: URL) {
  return listVisitorsQuerySchema.parse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    search: url.searchParams.get("search") ?? undefined,
  });
}

export function parseResolveVisitorIdentityQuery(url: URL) {
  return resolveVisitorIdentityQuerySchema.parse({
    email: url.searchParams.get("email") ?? undefined,
    phone: url.searchParams.get("phone") ?? undefined,
  });
}

export function parseListVisitsQuery(url: URL) {
  return listVisitsQuerySchema.parse({
    limit: url.searchParams.get("limit") ?? undefined,
    offset: url.searchParams.get("offset") ?? undefined,
    status: url.searchParams.get("status") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    visitorId: url.searchParams.get("visitorId") ?? undefined,
    hostMemberId: url.searchParams.get("hostMemberId") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
  });
}

const activityCategorySchema = z.enum([
  "visit",
  "approval",
  "identity",
  "settings",
  "security",
  "system",
]);

export const listActivityQuerySchema = z.object({
  visitorId: z.string().min(1).optional(),
  visitId: z.string().min(1).optional(),
  actorId: z.string().min(1).optional(),
  category: activityCategorySchema.optional(),
  branchId: z.string().min(1).optional(),
  from: z.coerce.date().optional(),
  to: z.coerce.date().optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function parseListActivityQuery(url: URL) {
  return listActivityQuerySchema.parse({
    visitorId: url.searchParams.get("visitorId") ?? undefined,
    visitId: url.searchParams.get("visitId") ?? undefined,
    actorId: url.searchParams.get("actorId") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    from: url.searchParams.get("from") ?? undefined,
    to: url.searchParams.get("to") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
}

export const visitorNoteBodySchema = z.object({
  note: z.string().trim().min(1).max(5000),
});

export const visitorTagsBodySchema = z.object({
  tags: z
    .array(
      z.enum([
        "VIP",
        "WATCHLIST",
        "REQUIRES_ESCORT",
        "CONTRACTOR",
        "FREQUENT_VISITOR",
      ]),
    )
    .max(5),
});

export const unifiedSearchQuerySchema = z.object({
  q: z.string().trim().max(200).optional(),
});

export function parseUnifiedSearchQuery(url: URL) {
  return unifiedSearchQuerySchema.parse({
    q: url.searchParams.get("q") ?? undefined,
  });
}

export const duplicateVisitorsQuerySchema = z.object({
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export function parseDuplicateVisitorsQuery(url: URL) {
  return duplicateVisitorsQuerySchema.parse({
    confidence: url.searchParams.get("confidence") ?? undefined,
    limit: url.searchParams.get("limit") ?? undefined,
  });
}

export const markDuplicateReviewedSchema = z.object({
  visitorIds: z.array(z.string().min(1)).min(2),
  confidence: z.enum(["HIGH", "MEDIUM", "LOW"]),
});

export const analyticsQuerySchema = z.object({
  period: z.enum(["daily", "weekly", "monthly", "custom"]).optional(),
  dateFrom: z.string().optional(),
  dateTo: z.string().optional(),
  branchId: z.string().optional(),
  hostId: z.string().optional(),
  category: z.string().optional(),
});

export function parseAnalyticsQuery(url: URL) {
  return analyticsQuerySchema.parse({
    period: url.searchParams.get("period") ?? undefined,
    dateFrom: url.searchParams.get("dateFrom") ?? undefined,
    dateTo: url.searchParams.get("dateTo") ?? undefined,
    branchId: url.searchParams.get("branchId") ?? undefined,
    hostId: url.searchParams.get("hostId") ?? undefined,
    category: url.searchParams.get("category") ?? undefined,
  });
}
