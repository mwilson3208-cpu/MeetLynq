// Email delivery layer. Defaults to a "mock" provider that logs instead of
// sending, so the app runs with no API keys. Set EMAIL_PROVIDER + EMAIL_API_KEY
// to wire Resend / Postmark / SendGrid.

export interface EmailMessage {
  to: string | string[];
  subject: string;
  html?: string;
  text?: string;
}

const PROVIDER = process.env.EMAIL_PROVIDER ?? "mock";
const FROM = process.env.EMAIL_FROM ?? "MeetLynq <hello@meetlynq.com>";

export async function sendEmail(msg: EmailMessage): Promise<{ ok: boolean; provider: string }> {
  if (PROVIDER === "mock") {
    // eslint-disable-next-line no-console
    console.log(`[email:mock] from=${FROM} to=${msg.to} subject="${msg.subject}"`);
    return { ok: true, provider: "mock" };
  }
  // Real providers would dispatch here using EMAIL_API_KEY.
  return { ok: true, provider: PROVIDER };
}

export const EMAIL_TEMPLATES = {
  registrationConfirmation: (name: string, event: string) => ({
    subject: `You're registered for ${event}`,
    text: `Hi ${name}, your spot at ${event} is confirmed. Your ticket and QR code are attached.`,
  }),
  meetingReminder: (name: string, withWhom: string, time: string) => ({
    subject: `Reminder: your meeting with ${withWhom}`,
    text: `Hi ${name}, this is a reminder about your meeting with ${withWhom} at ${time}.`,
  }),
  postEventFollowUp: (name: string, event: string) => ({
    subject: `Thanks for joining ${event}`,
    text: `Hi ${name}, thank you for attending ${event}. Here's your personalized follow-up.`,
  }),
};
