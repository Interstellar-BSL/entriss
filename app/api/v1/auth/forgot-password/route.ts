import { success, handleApiError } from "@/lib/api/response";
import { requestPasswordReset } from "@/lib/services/password-reset.service";
import { forgotPasswordSchema } from "@/lib/validations/password";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = forgotPasswordSchema.parse(body);
    const result = await requestPasswordReset(input.email);
    return success(result);
  } catch (err) {
    return handleApiError(err);
  }
}
