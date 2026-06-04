import { ServerClient } from 'postmark';
import type { PinSender } from './pin';
import { signInHtml, signInSubject, signInText } from './pin-email';

let cached: ServerClient | null = null;
function client(): ServerClient {
  if (cached) return cached;
  const token = process.env.POSTMARK_TOKEN;
  if (!token) throw new Error('POSTMARK_TOKEN is not set');
  cached = new ServerClient(token);
  return cached;
}

export const postmarkPinSender: PinSender = {
  async send(email, pin) {
    const from = process.env.POSTMARK_FROM;
    if (!from) throw new Error('POSTMARK_FROM is not set');
    await client().sendEmail({
      From: from,
      To: email,
      Subject: signInSubject(pin),
      TextBody: signInText(pin),
      HtmlBody: signInHtml(pin),
      MessageStream: 'outbound',
    });
  },
};
