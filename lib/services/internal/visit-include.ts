import type { VisitCheckInMediaRecord } from "@/lib/visits/check-in-media";

export const visitInclude = {
  visitor: true,
  branch: {
    select: {
      id: true,
      name: true,
      slug: true,
      code: true,
      timezone: true,
      requiresApproval: true,
      autoCheckoutHours: true,
    },
  },
  host: {
    select: {
      id: true,
      userId: true,
      user: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
  },
  organization: {
    select: {
      id: true,
      name: true,
      slug: true,
      logoUrl: true,
      settings: true,
    },
  },
} as const;

export const visitDetailInclude = {
  ...visitInclude,
  approvals: {
    include: {
      approver: {
        select: {
          id: true,
          user: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      },
    },
    orderBy: { createdAt: "desc" as const },
  },
  events: {
    include: {
      actor: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export type VisitApprovalRecord = {
  id: string;
  status: string;
  decision: string | null;
  notes: string | null;
  createdAt: Date;
  decidedAt: Date | null;
  approver: {
    id: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
};

export type VisitEventRecord = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  actor: {
    id: string;
    name: string | null;
    email: string;
  } | null;
};

export type VisitWithRelations = {
  id: string;
  organizationId: string;
  branchId: string;
  visitorId: string;
  hostMemberId: string;
  status: string;
  purpose: string | null;
  scheduledAt: Date | null;
  checkedInAt: Date | null;
  checkedOutAt: Date | null;
  checkedInById: string | null;
  checkedOutById: string | null;
  qrToken: string | null;
  qrExpiresAt: Date | null;
  badgeNumber: string | null;
  visitor: {
    id: string;
    firstName: string;
    lastName: string;
    email: string | null;
    phone: string | null;
    company: string | null;
    photoUrl: string | null;
  };
  branch: {
    id: string;
    name: string;
    slug: string;
    code: string | null;
    timezone: string;
    requiresApproval: boolean;
    autoCheckoutHours: number | null;
  };
  host: {
    id: string;
    userId: string;
    user: {
      id: string;
      name: string | null;
      email: string;
    };
  };
  organization: {
    id: string;
    name: string;
    slug: string;
    logoUrl: string | null;
    settings: unknown;
  };
};

export type {
  VisitCapturedDocumentRecord,
  VisitCheckInMediaRecord,
} from "@/lib/visits/check-in-media";

export type VisitDetailWithRelations = VisitWithRelations & {
  createdAt: Date;
  updatedAt: Date;
  cancelledAt: Date | null;
  cancelReason: string | null;
  approvals: VisitApprovalRecord[];
  events: VisitEventRecord[];
  checkIn?: VisitCheckInMediaRecord;
};
