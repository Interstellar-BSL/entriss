import { getServerSession } from "next-auth";

import { success, handleApiError } from "@/lib/api/response";
import { authOptions } from "@/lib/auth/auth-options";
import { acceptInviteWithCredentials } from "@/lib/services/invite.service";

export async function POST(
  request: Request,
  routeContext: { params: Promise<{ token: string }> },
) {
  try {
    const session = await getServerSession(authOptions);
    const { token } = await routeContext.params;
    const body = await request.json().catch(() => ({}));

    const result = await acceptInviteWithCredentials({
      token,
      sessionUserId: session?.user?.id,
      sessionEmail: session?.user?.email ?? undefined,
      name: typeof body.name === "string" ? body.name : undefined,
      password: typeof body.password === "string" ? body.password : undefined,
    });

    return success({
      organizationId: result.organizationId,
      organization: result.organization,
      role: result.role,
      memberId: result.memberId,
      roleId: result.roleId,
      organizationStatus: result.organizationStatus,
      message:
        "Invitation accepted. Call session.update() on the client to refresh your session.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
