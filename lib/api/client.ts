import type { ApiFailureBody, ApiSuccessBody } from "@/lib/api/response";
import type { PaginatedResult } from "@/lib/api/pagination";
import type { VisitState } from "@/lib/server/visits/visit-states";
import { dedupeInFlightGet } from "@/lib/api/in-flight";
import { toUserFacingErrorMessage } from "@/lib/api/user-facing-errors";

export { type PaginatedResult };

export class ApiError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status: number,
    public readonly details?: unknown,
    public readonly state?: VisitState,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

function buildUrl(
  path: string,
  searchParams?: Record<string, string | number | undefined | null> | object,
): string {
  const url = path.startsWith("http")
    ? new URL(path)
    : new URL(path, typeof window !== "undefined" ? window.location.origin : "http://localhost:3000");

  if (searchParams) {
    for (const [key, value] of Object.entries(
      searchParams as Record<string, string | number | undefined | null>,
    )) {
      if (value !== undefined && value !== null && value !== "") {
        url.searchParams.set(key, String(value));
      }
    }
  }

  return url.toString();
}

export async function apiFetch<T>(
  path: string,
  init?: RequestInit & {
    searchParams?: Record<string, string | number | undefined | null> | object;
  },
): Promise<T> {
  const { searchParams, ...requestInit } = init ?? {};
  const url = buildUrl(path, searchParams);

  const headers = new Headers(requestInit.headers);
  if (requestInit.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  const method = (requestInit.method ?? "GET").toUpperCase();

  const execute = async (): Promise<T> => {
    const response = await fetch(url, {
      ...requestInit,
      credentials: "include",
      headers,
    });

    let body: ApiSuccessBody<T> | ApiFailureBody;

    try {
      body = (await response.json()) as ApiSuccessBody<T> | ApiFailureBody;
    } catch {
      throw new ApiError(
        "INVALID_RESPONSE",
        `Server returned an invalid response (${response.status})`,
        response.status,
      );
    }

    if (!response.ok || !body.success) {
      const failure = body as ApiFailureBody;
      const rawMessage = failure.error?.message ?? `Request failed (${response.status})`;
      console.error("[api-fetch]", {
        path,
        code: failure.error?.code,
        status: response.status,
        message: rawMessage,
      });
      throw new ApiError(
        failure.error?.code ?? "REQUEST_FAILED",
        toUserFacingErrorMessage(
          new ApiError(
            failure.error?.code ?? "REQUEST_FAILED",
            rawMessage,
            response.status,
            failure.error?.details,
            failure.state,
          ),
          rawMessage,
        ),
        response.status,
        failure.error?.details,
        failure.state,
      );
    }

    const successBody = body as ApiSuccessBody<T>;
    if (successBody.state !== undefined) {
      return { ...successBody.data, state: successBody.state } as T;
    }

    return successBody.data;
  };

  if (method === "GET") {
    return dedupeInFlightGet(`GET ${url}`, execute);
  }

  return execute();
}
