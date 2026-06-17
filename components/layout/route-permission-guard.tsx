"use client";

import { usePathname, useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { useEffect } from "react";

import { canAccessPath } from "@/lib/rbac/navigation";

export function RoutePermissionGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: session, status } = useSession();

  useEffect(() => {
    if (status !== "authenticated") {
      return;
    }

    const permissions = session?.user?.permissions ?? [];
    if (!canAccessPath(pathname, permissions)) {
      router.replace("/dashboard");
    }
  }, [pathname, permissionsKey(session?.user?.permissions), router, status, session?.user?.permissions]);

  return <>{children}</>;
}

function permissionsKey(permissions: string[] | undefined) {
  return permissions?.join("|") ?? "";
}
