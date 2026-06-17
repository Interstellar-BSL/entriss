import type { OrgStatus } from "@prisma/client";

import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      email: string;
      name?: string | null;
      organizationId: string | null;
      role: string | null;
      organizationStatus: OrgStatus | null;
      /** Loaded from DB on each session read — not stored in JWT. */
      permissions?: string[];
      organizationName?: string | null;
      memberId?: string | null;
    };
  }

  interface User {
    id: string;
    email: string;
    name?: string | null;
    organizationId: string | null;
    role: string | null;
    organizationStatus: OrgStatus | null;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId: string;
    email: string;
    name?: string | null;
    systemRole?: import("@prisma/client").SystemRole | null;
    organizationId: string | null;
    role: string | null;
    organizationStatus: OrgStatus | null;
  }
}
