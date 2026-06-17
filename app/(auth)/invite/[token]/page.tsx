import { InviteAcceptCard } from "@/components/auth/invite-accept-card";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] px-4">
      <div className="w-full max-w-md">
        <InviteAcceptCard token={token} />
      </div>
    </div>
  );
}
