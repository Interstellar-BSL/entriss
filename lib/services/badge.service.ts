import { BadgeTemplateType, VisitStatus } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import { resolveBranchConfig } from "@/lib/settings/resolver";
import type { BadgePrinterLayout, BadgePrintData } from "@/lib/devices/badge-printer.interface";
import { PERMISSIONS } from "@/lib/rbac/permissions";
import { requirePermission } from "@/lib/tenant/tenant-context";
import type { TenantContext } from "@/lib/tenant/tenant-context";

import { VisitCheckInError, VisitNotFoundError } from "./errors";
import { visitInclude, type VisitWithRelations } from "./internal/visit-include";
import { ensureVisitQR } from "./qr.service";

const THERMAL_BADGE_WIDTH_MM = 62;
const THERMAL_BADGE_HEIGHT_MM = 100;
const THERMAL_BADGE_DPI = 203;

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
  printData: BadgePrintData;
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

async function loadVisitForBadge(
  ctx: TenantContext,
  visitId: string,
): Promise<VisitWithRelations> {
  const visit = await prisma.visit.findFirst({
    where: {
      id: visitId,
      organizationId: ctx.organizationId,
    },
    include: visitInclude,
  });

  if (!visit) {
    throw new VisitNotFoundError(visitId);
  }

  return visit as VisitWithRelations;
}

async function allocateBadgeNumber(
  ctx: TenantContext,
  visit: VisitWithRelations,
): Promise<string> {
  if (visit.badgeNumber) {
    return visit.badgeNumber;
  }

  const branchCode = visit.branch.code ?? "V";
  const startOfDay = new Date();
  startOfDay.setUTCHours(0, 0, 0, 0);
  const endOfDay = new Date();
  endOfDay.setUTCHours(23, 59, 59, 999);

  const count = await prisma.visit.count({
    where: {
      organizationId: ctx.organizationId,
      branchId: visit.branchId,
      badgeNumber: { not: null },
      checkedInAt: {
        gte: startOfDay,
        lte: endOfDay,
      },
    },
  });

  const badgeNumber = `${branchCode}-${String(count + 1).padStart(3, "0")}`;

  await prisma.visit.update({
    where: {
      id: visit.id,
      organizationId: ctx.organizationId,
    },
    data: { badgeNumber },
  });

  return badgeNumber;
}

function buildThermalLayout(
  visit: VisitWithRelations,
  badgeNumber: string,
  qrPayload: string,
  options: {
    badgeTemplate: BadgeTemplateType;
    logoUrl: string | null;
  },
): BadgePrinterLayout {
  const visitorName = `${visit.visitor.firstName} ${visit.visitor.lastName}`;

  const allFields = [
    {
      key: "organization",
      label: "Organization",
      value: visit.organization.name,
      fontSize: "sm" as const,
    },
    {
      key: "visitor",
      label: "Visitor",
      value: visitorName,
      fontSize: "lg" as const,
      bold: true,
    },
    {
      key: "company",
      label: "Company",
      value: visit.visitor.company ?? "—",
      fontSize: "md" as const,
    },
    {
      key: "host",
      label: "Host",
      value: visit.host.user.name ?? visit.host.user.email,
      fontSize: "md" as const,
    },
    {
      key: "badgeNumber",
      label: "Badge",
      value: badgeNumber,
      fontSize: "md" as const,
      bold: true,
    },
    {
      key: "visitId",
      label: "Visit ID",
      value: visit.id,
      fontSize: "sm" as const,
    },
    {
      key: "checkInTime",
      label: "Checked In",
      value: visit.checkedInAt?.toISOString() ?? "—",
      fontSize: "sm" as const,
    },
  ];

  const fields =
    options.badgeTemplate === BadgeTemplateType.minimal
      ? allFields.filter((field) =>
          ["visitor", "badgeNumber", "host"].includes(field.key),
        )
      : options.badgeTemplate === BadgeTemplateType.photo
        ? allFields
        : allFields.filter((field) => field.key !== "visitId");

  return {
    widthMm: THERMAL_BADGE_WIDTH_MM,
    heightMm: THERMAL_BADGE_HEIGHT_MM,
    dpi: THERMAL_BADGE_DPI,
    orientation: "portrait",
    logoUrl: options.logoUrl,
    qrPayload,
    fields,
  };
}

/**
 * Primary badge output — structured thermal/badge-printer JSON layout.
 */
export async function generateBadgeData(
  ctx: TenantContext,
  visitId: string,
): Promise<ThermalBadgeData> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const visit = await loadVisitForBadge(ctx, visitId);

  if (visit.status !== VisitStatus.CHECKED_IN) {
    throw new VisitCheckInError(
      "Badge can only be generated for checked-in visits",
    );
  }

  const branchConfig = await resolveBranchConfig(ctx, visit.branchId);
  const qr = await ensureVisitQR(ctx, visitId);
  const badgeNumber = await allocateBadgeNumber(ctx, visit);
  const layout = buildThermalLayout(visit, badgeNumber, qr.token, {
    badgeTemplate: branchConfig.badgeTemplate,
    logoUrl: branchConfig.branding.logoUrl,
  });

  const printData: BadgePrintData = {
    visitId: visit.id,
    organizationId: visit.organizationId,
    badgeNumber,
    layout,
    metadata: {
      printedAt: new Date().toISOString(),
    },
  };

  return {
    mode: "thermal_printer",
    visitId: visit.id,
    organizationId: visit.organizationId,
    badgeNumber,
    visitor: {
      fullName: `${visit.visitor.firstName} ${visit.visitor.lastName}`,
      company: visit.visitor.company,
      photoUrl: visit.visitor.photoUrl,
    },
    host: {
      name: visit.host.user.name,
      email: visit.host.user.email,
    },
    organization: {
      name: visit.organization.name,
      logoUrl: branchConfig.branding.logoUrl,
    },
    badgeTemplate: branchConfig.badgeTemplate,
    qr: {
      payload: qr.token,
      expiresAt: qr.expiresAt.toISOString(),
    },
    checkInTime: visit.checkedInAt?.toISOString() ?? null,
    layout,
    printData,
  };
}

/**
 * Optional A4 fallback — only when explicitly requested by caller.
 * Not the default badge output path.
 */
export async function generateA4BadgeLayout(
  ctx: TenantContext,
  visitId: string,
): Promise<A4BadgeLayout> {
  requirePermission(ctx, PERMISSIONS.VISITOR_READ);

  const thermal = await generateBadgeData(ctx, visitId);

  return {
    mode: "a4_fallback",
    pageSize: "A4",
    orientation: "portrait",
    visitId: thermal.visitId,
    badgeNumber: thermal.badgeNumber,
    sections: [
      {
        type: "header",
        content: {
          organization: thermal.organization.name,
          logoUrl: thermal.organization.logoUrl,
        },
      },
      {
        type: "visitor",
        content: {
          name: thermal.visitor.fullName,
          company: thermal.visitor.company,
          photoUrl: thermal.visitor.photoUrl,
        },
      },
      {
        type: "host",
        content: {
          name: thermal.host.name,
          email: thermal.host.email,
        },
      },
      {
        type: "qr",
        content: {
          payload: thermal.qr.payload,
          visitId: thermal.visitId,
        },
      },
      {
        type: "footer",
        content: {
          badgeNumber: thermal.badgeNumber,
          checkInTime: thermal.checkInTime,
        },
      },
    ],
  };
}
