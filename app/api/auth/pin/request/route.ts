import { NextResponse } from 'next/server';
import { dbPinStore } from '@/lib/auth/pin-store-db';
import { postmarkPinSender } from '@/lib/auth/pin-sender-postmark';
import { requestPin } from '@/lib/auth/pin';

export async function POST(req: Request) {
  let body: { email?: string };
  try {
    body = (await req.json()) as { email?: string };
  } catch {
    return NextResponse.json({ error: 'invalid_body' }, { status: 400 });
  }
  const email = body.email;
  if (!email) return NextResponse.json({ error: 'invalid_email' }, { status: 400 });

  const secret = process.env.AUTH_SECRET;
  if (!secret) return NextResponse.json({ error: 'server_misconfig' }, { status: 500 });

  const result = await requestPin(dbPinStore, postmarkPinSender, { email, secret });
  if (!result.ok) {
    if (result.reason === 'cooldown') {
      return NextResponse.json(
        { error: 'cooldown', retryAfterMs: result.retryAfterMs ?? 0 },
        { status: 429 }
      );
    }
    return NextResponse.json({ error: result.reason }, { status: 400 });
  }
  // Never return the PIN itself.
  return NextResponse.json({ ok: true });
}
