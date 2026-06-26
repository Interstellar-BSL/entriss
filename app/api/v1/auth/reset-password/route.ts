import { getRequestMeta, success, handleApiError } from "@/lib/api/response";
import { resetPasswordWithToken } from "@/lib/services/password-reset.service";
import { resetPasswordSchema } from "@/lib/validations/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = resetPasswordSchema.parse(body);
    const meta = getRequestMeta(request);

    const result = await resetPasswordWithToken({
      token: input.token,
      newPassword: input.newPassword,
      ipAddress: meta.ipAddress,
      userAgent: meta.userAgent,
    });

    return success(result);
  } catch (err) {
    return handleApiError(err);
  }
}
