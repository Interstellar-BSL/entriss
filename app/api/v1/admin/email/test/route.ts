import { withPlatformAdmin } from "@/lib/api/with-platform-admin";
import { success } from "@/lib/api/response";
import { verifyMicrosoftGraphEmail } from "@/lib/notifications/channels/microsoft-graph.email";
import { verifySmtpTransport } from "@/lib/notifications/channels/smtp.transport";

export const GET = withPlatformAdmin(async () => {
  const [graph, smtp] = await Promise.all([
    verifyMicrosoftGraphEmail(),
    verifySmtpTransport(),
  ]);

  const ok = graph.ok || smtp.ok;
  const primary = graph.ok ? "graph" : smtp.ok ? "smtp" : null;

  return success(
    {
      ok,
      primary,
      graph,
      smtp,
    },
    ok ? 200 : 503,
  );
});
