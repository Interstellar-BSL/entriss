import { getServerSession } from "next-auth";

import { success, handleApiError } from "@/lib/api/response";
import { authOptions } from "@/lib/auth/auth-options";
import { acceptInviteWithCredentials } from "@/lib/services/invite.service";
import { acceptInviteSchema } from "@/lib/validations/invite";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = acceptInviteSchema.parse(body);
    const session = await getServerSession(authOptions);

    const result = await acceptInviteWithCredentials({
      token: input.token,
      sessionUserId: session?.user?.id,
      sessionEmail: session?.user?.email ?? undefined,
      name: input.name,
      password: input.password,
    });

    return success({
      organizationId: result.organizationId,
      organization: result.organization,
      role: result.role,
      memberId: result.memberId,
      roleId: result.roleId,
      organizationStatus: result.organizationStatus,
      userId: result.userId,
      email: result.email,
      message:
        "Invitation accepted. Sign in to continue if you are not already authenticated.",
    });
  } catch (err) {
    return handleApiError(err);
  }
}
