import { success, handleApiError } from "@/lib/api/response";
import { createOrganizationRequest } from "@/lib/services/organization-request.service";
import { createOrganizationRequestSchema } from "@/lib/validations/organization-request";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = createOrganizationRequestSchema.parse(body);
    await createOrganizationRequest(input);
    return success({ success: true });
  } catch (err) {
    return handleApiError(err);
  }
}
