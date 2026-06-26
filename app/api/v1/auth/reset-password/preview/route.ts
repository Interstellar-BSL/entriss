import { success, handleApiError } from "@/lib/api/response";
import { previewPasswordResetToken } from "@/lib/services/password-reset.service";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token") ?? "";
    const result = await previewPasswordResetToken(token);
    return success(result);
  } catch (err) {
    return handleApiError(err);
  }
}
