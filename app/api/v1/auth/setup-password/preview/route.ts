import { success, handleApiError, error } from "@/lib/api/response";
import { previewPasswordSetupToken } from "@/lib/services/password-setup.service";

export async function GET(request: Request) {
  try {
    const token = new URL(request.url).searchParams.get("token");

    if (!token) {
      return error("VALIDATION_ERROR", "Token is required", 400);
    }

    const preview = await previewPasswordSetupToken(token);
    return success(preview);
  } catch (err) {
    return handleApiError(err);
  }
}
