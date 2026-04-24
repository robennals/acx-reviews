import { NextResponse } from 'next/server';
import { db } from '@/lib/db/client';
import { makeDbPinStore } from '@/lib/auth/pin-store-db';
import { postmarkPinSender } from '@/lib/auth/pin-sender-postmark';
import { requestPin } from '@/lib/auth/pin';
import { checkRateLimit, getClientIp } from '@/lib/auth/rate-limit';
import { makeDbRateLimitStore } from '@/lib/auth/rate-limit-store-db';

const PIN_REQUESTS_PER_IP_PER_HOUR = 30;
const ONE_HOUR_MS = 60 * 60 * 1000;

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

  // Per-IP rate limit (defense in depth alongside the per-email cooldown
  // enforced inside requestPin).
  const ip = getClientIp(req);
  const rl = await checkRateLimit(makeDbRateLimitStore(db), {
    key: `pin_request:${ip}`,
    max: PIN_REQUESTS_PER_IP_PER_HOUR,
    windowMs: ONE_HOUR_MS,
  });
  if (!rl.allowed) {
    return NextResponse.json(
      { error: 'rate_limited', retryAfterMs: rl.retryAfterMs },
      { status: 429 }
    );
  }

  const result = await requestPin(makeDbPinStore(db), postmarkPinSender, { email, secret });
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
