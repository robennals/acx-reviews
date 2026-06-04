// Shared sign-in email content, used by every PinSender implementation so
// switching providers never changes what users receive.

export function signInSubject(pin: string): string {
  return `Your ACX Reviews sign-in code: ${pin}`;
}

export function signInText(pin: string): string {
  return `Your sign-in code for ACX Reviews is:\n\n${pin}\n\nThis code expires in 10 minutes. If you didn't request it, you can ignore this email.`;
}

export function signInHtml(pin: string): string {
  return `<!doctype html><html><body style="font-family:system-ui,sans-serif;max-width:480px;margin:0 auto;padding:24px;color:#111">
<h2 style="margin:0 0 16px">Your sign-in code</h2>
<p>Use this code to finish signing in to ACX Reviews:</p>
<p style="font-size:32px;letter-spacing:6px;font-weight:600;background:#f3f4f6;padding:16px;border-radius:8px;text-align:center">${pin}</p>
<p style="color:#6b7280;font-size:14px">This code expires in 10 minutes. If you didn't request it, you can safely ignore this email.</p>
</body></html>`;
}
