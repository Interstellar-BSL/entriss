import { redirect } from "next/navigation";

import { AppShell, PageContainer } from "@/components/layout/app-shell";
import { getSessionUser } from "@/lib/auth/session";
import { userHasTenantMembership } from "@/lib/auth/validate-tenant-session";
import { isPlatformAdmin } from "@/lib/platform/access";
import { getSystemRoleForUser } from "@/lib/tenant/injected-context";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login");
  }

  const systemRole = await getSystemRoleForUser(user.id);

  if (!user.organizationId || user.organizationStatus !== "APPROVED") {
    if (isPlatformAdmin(systemRole)) {
      redirect("/admin/dashboard");
    }
    redirect("/request-access");
  }

  if (isPlatformAdmin(systemRole)) {
    const hasTenant = await userHasTenantMembership(user.id);
    if (!hasTenant) {
      redirect("/admin/dashboard");
    }
  }

  return (
    <AppShell>
      <PageContainer>{children}</PageContainer>
    </AppShell>
  );
}
