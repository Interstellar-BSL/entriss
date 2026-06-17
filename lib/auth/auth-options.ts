import type { NextAuthOptions } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { z } from "zod";

import type { OrgStatus, SystemRole } from "@prisma/client";
import { prisma } from "@/lib/db/client";
import {
  isOrganizationApproved,
  loadOrganizationContext,
  resolveUserOrganizationId,
} from "@/lib/tenant/resolve-organization";
import { isPlatformAdmin } from "@/lib/platform/access";
import { verifyPassword } from "./password";
import { getClientIpFromRequest } from "./request-ip";
import {
  checkLoginRateLimit,
  clearLoginRateLimit,
  recordFailedLogin,
} from "./rate-limit";

const credentialsSchema = z.object({
  email: z.email().transform((value) => value.toLowerCase().trim()),
  password: z.string().min(1, "Password is required"),
});

export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string | null;
  systemRole: SystemRole | null;
  organizationId: string | null;
  role: string | null;
  organizationStatus: OrgStatus | null;
}

async function loadAuthenticatedUser(
  userId: string,
): Promise<AuthenticatedUser | null> {
  const user = await prisma.user.findFirst({
    where: {
      id: userId,
      isActive: true,
      deletedAt: null,
    },
    select: {
      id: true,
      email: true,
      name: true,
      systemRole: true,
    },
  });

  if (!user) {
    return null;
  }

  const organizationContext = await loadOrganizationContext(
    user.id,
    user.systemRole,
  );

  return {
    id: user.id,
    email: user.email,
    name: user.name,
    systemRole: user.systemRole,
    organizationId: organizationContext.organizationId,
    role: organizationContext.role,
    organizationStatus: organizationContext.organizationStatus,
  };
}

function applyOrganizationContextToToken(
  token: JWT,
  context: {
    organizationId: string | null;
    role: string | null;
    organizationStatus: OrgStatus | null;
  },
): JWT {
  token.organizationId = context.organizationId;
  token.role = context.role;
  token.organizationStatus = context.organizationStatus;
  return token;
}

async function canUserLogin(userId: string, systemRole: SystemRole | null): Promise<boolean> {
  const organizationId = await resolveUserOrganizationId(userId, systemRole);

  if (!organizationId) {
    return isPlatformAdmin(systemRole);
  }

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: { isActive: true, deletedAt: true, status: true },
  });

  if (!organization) {
    return false;
  }

  return isOrganizationApproved(organization);
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
    maxAge: 60 * 60 * 8,
    updateAge: 60 * 60,
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      id: "credentials",
      name: "Email and Password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials, request) {
        const parsed = credentialsSchema.safeParse(credentials);
        if (!parsed.success) {
          return null;
        }

        const { email, password } = parsed.data;
        const ip = getClientIpFromRequest(request);

        const rateLimit = checkLoginRateLimit(email, ip);
        if (!rateLimit.allowed) {
          throw new Error(
            `Too many login attempts. Try again in ${rateLimit.retryAfterSeconds} seconds.`,
          );
        }

        const user = await prisma.user.findFirst({
          where: {
            email,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            email: true,
            name: true,
            passwordHash: true,
            systemRole: true,
          },
        });

        if (!user?.passwordHash) {
          recordFailedLogin(email, ip);
          return null;
        }

        const passwordValid = await verifyPassword(password, user.passwordHash);
        if (!passwordValid) {
          recordFailedLogin(email, ip);
          return null;
        }

        const loginAllowed = await canUserLogin(user.id, user.systemRole);
        if (!loginAllowed) {
          recordFailedLogin(email, ip);
          throw new Error(
            "Your organization is not approved for access. Contact your platform administrator.",
          );
        }

        clearLoginRateLimit(email, ip);

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });

        const authenticatedUser = await loadAuthenticatedUser(user.id);
        if (!authenticatedUser) {
          return null;
        }

        return {
          id: authenticatedUser.id,
          email: authenticatedUser.email,
          name: authenticatedUser.name,
          systemRole: authenticatedUser.systemRole,
          organizationId: authenticatedUser.organizationId,
          role: authenticatedUser.role,
          organizationStatus: authenticatedUser.organizationStatus,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        const authUser = user as AuthenticatedUser & { id: string };
        token.userId = authUser.id;
        token.email = authUser.email;
        token.name = authUser.name;
        token.systemRole = authUser.systemRole;
        token.organizationId = authUser.organizationId;
        token.role = authUser.role;
        token.organizationStatus = authUser.organizationStatus;
        return token;
      }

      if (trigger === "update" && token.userId) {
        const dbUser = await prisma.user.findFirst({
          where: {
            id: token.userId,
            isActive: true,
            deletedAt: null,
          },
          select: {
            id: true,
            systemRole: true,
          },
        });

        if (!dbUser) {
          return token;
        }

        const organizationContext = await loadOrganizationContext(
          dbUser.id,
          dbUser.systemRole,
        );

        return applyOrganizationContextToToken(token, {
          organizationId: organizationContext.organizationId,
          role: organizationContext.role,
          organizationStatus: organizationContext.organizationStatus,
        });
      }

      return token;
    },
    async session({ session, token }) {
      const user = {
        id: token.userId,
        email: token.email,
        name: token.name ?? null,
        organizationId: token.organizationId ?? null,
        role: token.role ?? null,
        organizationStatus: token.organizationStatus ?? null,
        permissions: [] as string[],
        organizationName: null as string | null,
        memberId: null as string | null,
      };

      if (
        token.userId &&
        token.organizationId &&
        token.organizationStatus === "APPROVED"
      ) {
        const organizationContext = await loadOrganizationContext(
          token.userId,
          token.systemRole ?? null,
        );

        if (organizationContext.organizationId === token.organizationId) {
          user.permissions = organizationContext.permissions;
          user.organizationName = organizationContext.organization?.name ?? null;
          user.memberId = organizationContext.memberId;
        }
      }

      session.user = user;

      return session;
    },
  },
};
