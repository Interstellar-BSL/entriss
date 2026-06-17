import { InviteAcceptCard } from "@/components/auth/invite-accept-card";
import { AuthPageHeader } from "@/components/auth/auth-shell";

export default async function InvitePage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  return (
    <div className="mx-auto w-full max-w-md">
      <AuthPageHeader
        title="Team invitation"
        subtitle="Review and accept your invite"
      />
      <InviteAcceptCard token={token} />
    </div>
  );
}
