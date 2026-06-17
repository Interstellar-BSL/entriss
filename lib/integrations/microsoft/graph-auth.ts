import {
  getGraphClientId,
  getGraphClientSecret,
  getGraphTenantId,
  isGraphConfigured,
  logGraphConfigOnce,
} from "./graph-config";

const GRAPH_SCOPE = "https://graph.microsoft.com/.default";
const TOKEN_REFRESH_BUFFER_MS = 60_000;

interface TokenCache {
  accessToken: string;
  expiresAt: number;
}

let cachedToken: TokenCache | null = null;
let inflightTokenRequest: Promise<string> | null = null;

export class GraphAuthError extends Error {
  readonly status?: number;
  readonly body?: string;

  constructor(message: string, status?: number, body?: string) {
    super(message);
    this.name = "GraphAuthError";
    this.status = status;
    this.body = body;
  }
}

async function fetchGraphToken(): Promise<string> {
  logGraphConfigOnce();

  const tenantId = getGraphTenantId();
  const clientId = getGraphClientId();
  const clientSecret = getGraphClientSecret();

  if (!tenantId || !clientId || !clientSecret) {
    throw new GraphAuthError(
      "Microsoft Graph is not configured. Set AZURE_TENANT_ID, AZURE_CLIENT_ID, AZURE_CLIENT_SECRET, and GRAPH_SENDER_EMAIL.",
    );
  }

  const tokenUrl = `https://login.microsoftonline.com/${tenantId}/oauth2/v2.0/token`;
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    scope: GRAPH_SCOPE,
    grant_type: "client_credentials",
  });

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  const responseText = await response.text();

  if (!response.ok) {
    console.error("[EMAIL:ERROR] Graph token request failed", {
      status: response.status,
      body: responseText,
    });
    throw new GraphAuthError(
      `Graph token request failed (${response.status})`,
      response.status,
      responseText,
    );
  }

  let parsed: { access_token?: string; expires_in?: number };
  try {
    parsed = JSON.parse(responseText) as {
      access_token?: string;
      expires_in?: number;
    };
  } catch {
    throw new GraphAuthError("Graph token response was not valid JSON", response.status, responseText);
  }

  if (!parsed.access_token) {
    throw new GraphAuthError("Graph token response missing access_token", response.status, responseText);
  }

  const expiresInMs = (parsed.expires_in ?? 3600) * 1000;
  cachedToken = {
    accessToken: parsed.access_token,
    expiresAt: Date.now() + expiresInMs,
  };

  return parsed.access_token;
}

export async function getGraphToken(): Promise<string> {
  if (!isGraphConfigured()) {
    throw new GraphAuthError("Microsoft Graph is not configured");
  }

  if (cachedToken && cachedToken.expiresAt - TOKEN_REFRESH_BUFFER_MS > Date.now()) {
    return cachedToken.accessToken;
  }

  if (!inflightTokenRequest) {
    inflightTokenRequest = fetchGraphToken().finally(() => {
      inflightTokenRequest = null;
    });
  }

  return inflightTokenRequest;
}

export function clearGraphTokenCache() {
  cachedToken = null;
}
