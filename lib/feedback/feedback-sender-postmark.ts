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

export interface SendResult {
  messageId: string;
  errorCode: number;
  message: string;
}

/**
 * Send one feedback email. The sender is the visible recipient (To:) so their
 * copy doubles as a confirmation; the author is Bcc'd (hidden); replies from
 * the author go to the sender via Reply-To.
 *
 * Returns Postmark's response. ErrorCode 0 means accepted; the caller should
 * treat any non-zero code as a failure (the client also throws on API errors).
 */
export async function sendFeedbackEmail(params: SendFeedbackParams): Promise<SendResult> {
  const from = process.env.POSTMARK_FROM;
  if (!from) throw new Error('POSTMARK_FROM is not set');
  const { subject, text, html } = buildFeedbackEmail({
    senderName: params.senderName,
    reviewTitle: params.reviewTitle,
    message: params.message,
  });
  const res = await client().sendEmail({
    From: from,
    To: params.senderEmail,
    Bcc: params.authorEmail,
    ReplyTo: params.senderEmail,
    Subject: subject,
    TextBody: text,
    HtmlBody: html,
    MessageStream: 'outbound',
  });
  return { messageId: res.MessageID, errorCode: res.ErrorCode, message: res.Message };
}

export interface MessageRecord {
  messageId: string;
  found: boolean;
  status?: string;
}

/**
 * Confirm Postmark has a record of an outbound message by its MessageID, using
 * the Messages API. Retries briefly because indexing can lag a fresh send.
 */
export async function verifyMessageRecorded(
  messageId: string,
  attempts = 4,
  delayMs = 2500
): Promise<MessageRecord> {
  for (let i = 0; i < attempts; i++) {
    try {
      const d = await client().getOutboundMessageDetails(messageId);
      const status =
        (d as { Status?: string }).Status ??
        d.MessageEvents?.[d.MessageEvents.length - 1]?.Type ??
        'Received';
      return { messageId, found: true, status };
    } catch {
      if (i < attempts - 1) await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  return { messageId, found: false };
}
