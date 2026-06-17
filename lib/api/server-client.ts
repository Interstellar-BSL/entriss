import { headers } from "next/headers";

import { apiFetch } from "@/lib/api/client";

async function getServerOrigin(): Promise<string> {
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const protocol = headerList.get("x-forwarded-proto") ?? "http";

  if (host) {
    return `${protocol}://${host}`;
  }

  return process.env.NEXTAUTH_URL ?? "http://localhost:3000";
}

export async function serverApiFetch<T>(
  path: string,
  init?: RequestInit & {
    searchParams?: Record<string, string | number | undefined | null> | object;
  },
): Promise<T> {
  const headerList = await headers();
  const cookie = headerList.get("cookie") ?? "";
  const origin = await getServerOrigin();

  return apiFetch<T>(`${origin}${path}`, {
    ...init,
    headers: {
      ...init?.headers,
      cookie,
    },
    cache: "no-store",
  });
}
