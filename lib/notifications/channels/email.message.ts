export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text?: string;
}

export class EmailDeliveryError extends Error {
  constructor(
    message: string,
    readonly attempts: { graph?: string; smtp?: string },
  ) {
    super(message);
    this.name = "EmailDeliveryError";
  }
}
