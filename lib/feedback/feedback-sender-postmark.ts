import { ServerClient } from 'postmark';
import { buildFeedbackEmail } from './feedback-email';

let cached: ServerClient | null = null;
function client(): ServerClient {
  if (cached) return cached;
  const token = process.env.POSTMARK_TOKEN;
  if (!token) throw new Error('POSTMARK_TOKEN is not set');
  cached = new ServerClient(token);
  return cached;
}

export interface SendFeedbackParams {
  senderEmail: string;
  senderName: string;
  authorEmail: string;
  reviewTitle: string;
  message: string;
}

/**
 * Send one feedback email. The sender is the visible recipient (To:) so their
 * copy doubles as a confirmation; the author is Bcc'd (hidden); replies from
 * the author go to the sender via Reply-To.
 */
export async function sendFeedbackEmail(params: SendFeedbackParams): Promise<void> {
  const from = process.env.POSTMARK_FROM;
  if (!from) throw new Error('POSTMARK_FROM is not set');
  const { subject, text, html } = buildFeedbackEmail({
    senderName: params.senderName,
    reviewTitle: params.reviewTitle,
    message: params.message,
  });
  await client().sendEmail({
    From: from,
    To: params.senderEmail,
    Bcc: params.authorEmail,
    ReplyTo: params.senderEmail,
    Subject: subject,
    TextBody: text,
    HtmlBody: html,
    MessageStream: 'outbound',
  });
}
