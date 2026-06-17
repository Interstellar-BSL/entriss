function readEnv(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key]?.trim();
    if (value) {
      return value;
    }
  }
  return undefined;
}

function maskSecret(value: string | undefined): string {
  if (!value) {
    return "(not set)";
  }
  if (value.length <= 4) {
    return "****";
  }
  return `${value.slice(0, 2)}****${value.slice(-2)}`;
}

export function getGraphTenantId(): string | undefined {
  return readEnv("AZURE_TENANT_ID", "GRAPH_TENANT_ID");
}

export function getGraphClientId(): string | undefined {
  return readEnv("AZURE_CLIENT_ID", "GRAPH_CLIENT_ID");
}

export function getGraphClientSecret(): string | undefined {
  return readEnv("AZURE_CLIENT_SECRET", "GRAPH_CLIENT_SECRET");
}

export function getGraphSenderEmail(): string | undefined {
  return readEnv("GRAPH_SENDER_EMAIL", "GRAPH_SENDER");
}

export function isGraphConfigured(): boolean {
  return Boolean(
    getGraphTenantId() &&
      getGraphClientId() &&
      getGraphClientSecret() &&
      getGraphSenderEmail(),
  );
}

export function getGraphConfigSummary() {
  const tenantId = getGraphTenantId() ?? "(not set)";
  const clientId = getGraphClientId() ?? "(not set)";
  const senderEmail = getGraphSenderEmail() ?? "(not set)";

  return {
    configured: isGraphConfigured(),
    tenantId,
    clientId,
    senderEmail,
    clientSecret: maskSecret(getGraphClientSecret()),
    scope: "https://graph.microsoft.com/.default",
  };
}

let configLogged = false;

export function logGraphConfigOnce() {
  if (configLogged) {
    return;
  }

  configLogged = true;
  const summary = getGraphConfigSummary();
  console.info("[GRAPH CONFIG]", summary);
}
