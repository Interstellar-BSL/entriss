import { getRequestMeta, success, handleApiError } from "@/lib/api/response";
import { withSession } from "@/lib/api/with-tenant";
import { changeUserPassword } from "@/lib/services/password-change.service";
import { changePasswordSchema } from "@/lib/validations/password";

export const POST = withSession(async (request, user) => {
  try {
    const body = await request.json();
    const input = changePasswordSchema.parse(body);
    const meta = getRequestMeta(request);

    const result = await changeUserPassword({
      userId: user.id,
      currentPassword: input.currentPassword,
      newPassword: input.newPassword,
      organizationId: user.organizationId,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return success(result);
  } catch (err) {
    return handleApiError(err);
  }
});
