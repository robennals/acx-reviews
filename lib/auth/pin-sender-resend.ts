import type { PinSender } from './pin';
import { signInHtml, signInSubject, signInText } from './pin-email';

// Resend (https://resend.com) sender. Plain fetch — the API is a single JSON
// POST, so no SDK dependency is needed.

export const resendPinSender: PinSender = {
  async send(email, pin) {
    const token = process.env.RESEND_TOKEN;
    if (!token) throw new Error('RESEND_TOKEN is not set');
    const from = process.env.RESEND_FROM;
    if (!from) throw new Error('RESEND_FROM is not set');

    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from,
        to: [email],
        subject: signInSubject(pin),
        text: signInText(pin),
        html: signInHtml(pin),
      }),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => '');
      throw new Error(`Resend send failed: ${res.status} ${body}`);
    }
  },
};
