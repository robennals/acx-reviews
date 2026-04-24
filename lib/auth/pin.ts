import { createHash, randomInt, timingSafeEqual } from 'node:crypto';

export const PIN_LENGTH = 6;
export const PIN_EXPIRY_MS = 10 * 60 * 1000; // 10 minutes
export const PIN_MAX_ATTEMPTS = 5;
export const PIN_RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds

export interface EmailPinRecord {
  email: string;
  pinHash: string;
  expiresAt: Date;
  attempts: number;
  lastSentAt: Date;
}

export interface PinStore {
  get(email: string): Promise<EmailPinRecord | null>;
  upsert(record: EmailPinRecord): Promise<void>;
  bumpAttempts(email: string): Promise<number>;
  delete(email: string): Promise<void>;
}

export interface PinSender {
  send(email: string, pin: string): Promise<void>;
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  // Cheap check; real validation happens via the round-trip itself.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

export function generatePin(): string {
  return String(randomInt(0, 10 ** PIN_LENGTH)).padStart(PIN_LENGTH, '0');
}

export function hashPin(pin: string, email: string, secret: string): string {
  // Pepper the PIN with the email and a server secret. PINs are short-lived
  // and rate-limited, so a single SHA-256 round is sufficient here.
  return createHash('sha256').update(`${email}:${pin}:${secret}`).digest('hex');
}

function constantTimeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return timingSafeEqual(ab, bb);
}

export type RequestResult =
  | { ok: true; pin: string }
  | { ok: false; reason: 'invalid_email' | 'cooldown'; retryAfterMs?: number };

export async function requestPin(
  store: PinStore,
  sender: PinSender,
  opts: { email: string; secret: string; now?: Date }
): Promise<RequestResult> {
  const now = opts.now ?? new Date();
  const email = normalizeEmail(opts.email);
  if (!isValidEmail(email)) return { ok: false, reason: 'invalid_email' };

  const existing = await store.get(email);
  if (existing) {
    const sinceLast = now.getTime() - existing.lastSentAt.getTime();
    if (sinceLast < PIN_RESEND_COOLDOWN_MS) {
      return { ok: false, reason: 'cooldown', retryAfterMs: PIN_RESEND_COOLDOWN_MS - sinceLast };
    }
  }

  const pin = generatePin();
  await store.upsert({
    email,
    pinHash: hashPin(pin, email, opts.secret),
    expiresAt: new Date(now.getTime() + PIN_EXPIRY_MS),
    attempts: 0,
    lastSentAt: now,
  });
  await sender.send(email, pin);
  return { ok: true, pin };
}

export type VerifyResult =
  | { ok: true; email: string }
  | {
      ok: false;
      reason: 'no_pin' | 'expired' | 'too_many_attempts' | 'mismatch' | 'invalid_email';
    };

export async function verifyPin(
  store: PinStore,
  opts: { email: string; pin: string; secret: string; now?: Date }
): Promise<VerifyResult> {
  const now = opts.now ?? new Date();
  const email = normalizeEmail(opts.email);
  if (!isValidEmail(email)) return { ok: false, reason: 'invalid_email' };

  const record = await store.get(email);
  if (!record) return { ok: false, reason: 'no_pin' };
  if (record.expiresAt.getTime() < now.getTime()) {
    await store.delete(email);
    return { ok: false, reason: 'expired' };
  }
  if (record.attempts >= PIN_MAX_ATTEMPTS) {
    await store.delete(email);
    return { ok: false, reason: 'too_many_attempts' };
  }

  const candidate = hashPin(opts.pin, email, opts.secret);
  if (!constantTimeEqual(candidate, record.pinHash)) {
    const next = await store.bumpAttempts(email);
    if (next >= PIN_MAX_ATTEMPTS) await store.delete(email);
    return { ok: false, reason: 'mismatch' };
  }

  await store.delete(email);
  return { ok: true, email };
}
