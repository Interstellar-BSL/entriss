import { error } from "@/lib/api/response";

export async function POST() {
  return error(
    "ORG_SELF_SERVICE_DISABLED",
    "Organizations must be provisioned through a platform-approved request at /request-access",
    403,
  );
}
