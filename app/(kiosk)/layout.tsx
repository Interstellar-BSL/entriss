import { redirect } from "next/navigation";

import { getSessionUser } from "@/lib/auth/session";

export default async function KioskLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();

  if (!user) {
    redirect("/login?callbackUrl=/kiosk");
  }

  return (
    <div className="fixed inset-0 z-50 flex select-none flex-col overflow-hidden bg-[var(--card)] text-[var(--foreground)]">
      {children}
    </div>
  );
}
