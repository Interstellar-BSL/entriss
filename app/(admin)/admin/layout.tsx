import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/admin-shell";
import { getSessionUser } from "@/lib/auth/session";
import { isPlatformAdmin } from "@/lib/platform/access";
import { getSystemRoleForUser } from "@/lib/tenant/injected-context";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?callbackUrl=/admin/dashboard");
  }

  const systemRole = await getSystemRoleForUser(user.id);
  if (!isPlatformAdmin(systemRole)) {
    redirect("/dashboard");
  }

  return <AdminShell>{children}</AdminShell>;
}
