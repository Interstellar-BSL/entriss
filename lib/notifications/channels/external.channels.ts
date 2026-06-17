import type {
  INotificationChannel,
  NotificationChannelMessage,
} from "./channel.types";

function createStubChannel(name: string): INotificationChannel {
  return {
    name,
    async deliver(message: NotificationChannelMessage) {
      if (process.env.NODE_ENV !== "production") {
        console.info(`[notifications:${name}:stub]`, message.type, message.recipientId);
      }
    },
  };
}

export const slackChannel = createStubChannel("slack");
export const teamsChannel = createStubChannel("teams");
export const smsChannel = createStubChannel("sms");
export const whatsappChannel = createStubChannel("whatsapp");
