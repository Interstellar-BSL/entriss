export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const [{ logGraphConfigOnce }, { logSmtpConfigOnce }, { startNotificationEngine }] =
      await Promise.all([
        import("@/lib/integrations/microsoft/graph-config"),
        import("@/lib/notifications/channels/smtp.transport"),
        import("@/lib/notifications/queue/in-memory-notification-queue"),
      ]);
    logGraphConfigOnce();
    logSmtpConfigOnce();
    await startNotificationEngine();
  }
}
