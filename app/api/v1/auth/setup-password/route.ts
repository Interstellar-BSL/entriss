import { success, handleApiError } from "@/lib/api/response";
import { setupPasswordWithToken } from "@/lib/services/password-setup.service";
import { setupPasswordSchema } from "@/lib/validations/password-setup";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = setupPasswordSchema.parse(body);
    const result = await setupPasswordWithToken(input);
    return success(result);
  } catch (err) {
    return handleApiError(err);
  }
}
