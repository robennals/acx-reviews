export interface FeedbackEmailInput {
  senderName: string;
  reviewTitle: string;
  message: string;
}

export interface FeedbackEmail {
  subject: string;
  text: string;
  html: string;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Build the single shared email body. The same message is delivered to the
 * sender (To:) and the author (Bcc:), so the header is written in the third
 * person and reads correctly to both.
 */
export function buildFeedbackEmail(input: FeedbackEmailInput): FeedbackEmail {
  const { senderName, reviewTitle, message } = input;
  const header =
    `This message from ${senderName} was sent to the author of ${reviewTitle}. ` +
    `The author's email is hidden to preserve their anonymity — they can choose to reply if they wish.`;

  const subject = `Feedback on your review of ${reviewTitle}`;
  const text = `${header}\n\n${message}\n`;
  const html =
    `<p style="color:#666;font-size:14px">${escapeHtml(header)}</p>` +
    `<hr><p>${escapeHtml(message).replace(/\n/g, '<br>')}</p>`;

  return { subject, text, html };
}
