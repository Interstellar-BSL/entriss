import { success, handleApiError } from "@/lib/api/response";
import { getInviteByToken } from "@/lib/services/invite.service";

export async function GET(
  _request: Request,
  routeContext: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await routeContext.params;
    const invite = await getInviteByToken(token);
    return success({ invite });
  } catch (err) {
    return handleApiError(err);
  }
}
