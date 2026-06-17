type RequestHeaders =
  | Headers
  | Record<string, string | string[] | undefined>;

function readHeader(
  headers: RequestHeaders | undefined,
  name: string,
): string | undefined {
  if (!headers) {
    return undefined;
  }

  if (typeof Headers !== "undefined" && headers instanceof Headers) {
    return headers.get(name) ?? undefined;
  }

  const record = headers as Record<string, string | string[] | undefined>;
  const value =
    record[name] ?? record[name.toLowerCase()] ?? record[name.toUpperCase()];
  return Array.isArray(value) ? value[0] : value;
}

/**
 * NextAuth passes authorize `request.headers` as a plain object, not a Headers instance.
 */
export function getClientIpFromRequest(
  request: { headers?: RequestHeaders } | undefined,
): string {
  const forwarded = readHeader(request?.headers, "x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() ?? "unknown";
  }

  return readHeader(request?.headers, "x-real-ip") ?? "unknown";
}
