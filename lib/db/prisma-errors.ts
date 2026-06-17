export function isPrismaKnownRequestError(
  error: unknown,
): error is PrismaKnownRequestError {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "PrismaClientKnownRequestError" &&
    typeof (error as { code?: unknown }).code === "string"
  );
}

export interface PrismaKnownRequestError {
  code: string;
  message: string;
  meta?: Record<string, unknown>;
  stack?: string;
}

export function prismaErrorDetails(error: PrismaKnownRequestError) {
  const meta = error.meta ?? {};
  const driverCause =
    typeof meta.driverAdapterError === "object" &&
    meta.driverAdapterError !== null &&
    "cause" in meta.driverAdapterError
      ? (meta.driverAdapterError as { cause?: Record<string, unknown> }).cause
      : undefined;

  return {
    code: error.code,
    message: error.message,
    modelName: meta.modelName ?? null,
    table:
      (typeof meta.table === "string" ? meta.table : null) ??
      (typeof driverCause?.table === "string" ? driverCause.table : null),
    column:
      (typeof meta.column === "string" ? meta.column : null) ??
      (typeof driverCause?.column === "string" ? driverCause.column : null),
    originalMessage:
      typeof driverCause?.originalMessage === "string"
        ? driverCause.originalMessage
        : null,
  };
}

export function isPrismaValidationError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    (error as { name?: string }).name === "PrismaClientValidationError"
  );
}

export function isPrismaClientError(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false;
  }

  const name = (error as { name?: string }).name ?? "";
  return name.startsWith("PrismaClient");
}
