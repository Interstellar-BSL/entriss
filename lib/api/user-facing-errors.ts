function isApiLikeError(
  error: unknown,
): error is { message: string; status: number; code?: string; details?: unknown } {
  return (
    typeof error === "object" &&
    error !== null &&
    "message" in error &&
    "status" in error &&
    typeof (error as { message: unknown }).message === "string" &&
    typeof (error as { status: unknown }).status === "number"
  );
}

const CROSS_TENANT_PATTERN = /cross-tenant/i;

export function toUserFacingErrorMessage(
  error: unknown,
  fallback = "Something went wrong. Please try again.",
): string {
  if (isApiLikeError(error)) {
    console.error("[api-error]", {
      code: error.code,
      status: error.status,
      message: error.message,
      details: error.details,
    });

    if (CROSS_TENANT_PATTERN.test(error.message)) {
      return error.status === 403
        ? "You do not have permission to access this item."
        : "Unable to load this resource.";
    }

    if (error.status === 403) {
      return "You do not have permission to access this item.";
    }

    if (error.status === 404) {
      return "Unable to load this resource.";
    }

    return error.message;
  }

  if (error instanceof Error) {
    console.error("[error]", error.message, error);
    if (CROSS_TENANT_PATTERN.test(error.message)) {
      return "Unable to load this resource.";
    }
    return error.message;
  }

  console.error("[error]", error);
  return fallback;
}
