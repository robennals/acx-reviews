import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  generatePin,
  hashPin,
  isValidEmail,
  normalizeEmail,
  requestPin,
  verifyPin,
  PIN_LENGTH,
  PIN_EXPIRY_MS,
  PIN_MAX_ATTEMPTS,
  PIN_RESEND_COOLDOWN_MS,
  type EmailPinRecord,
  type PinSender,
  type PinStore,
} from './pin';

const SECRET = 'test-secret';

function makeStore(): PinStore & { _records: Map<string, EmailPinRecord> } {
  const records = new Map<string, EmailPinRecord>();
  return {
    _records: records,
    async get(email) {
      return records.get(email) ?? null;
    },
    async upsert(record) {
      records.set(record.email, { ...record });
    },
    async bumpAttempts(email) {
      const r = records.get(email);
      if (!r) return 0;
      r.attempts += 1;
      return r.attempts;
    },
    async delete(email) {
      records.delete(email);
    },
  };
}

function makeSender(): PinSender & { sent: { email: string; pin: string }[] } {
  const sent: { email: string; pin: string }[] = [];
  return {
    sent,
    async send(email, pin) {
      sent.push({ email, pin });
    },
  };
}

test('normalizeEmail lowercases and trims', () => {
  assert.equal(normalizeEmail('  Foo@Bar.com '), 'foo@bar.com');
});

test('normalizeEmail strips Gmail dots from the local part', () => {
  assert.equal(normalizeEmail('rob.ennals@gmail.com'), 'robennals@gmail.com');
  assert.equal(normalizeEmail('r.o.b.e.n.n.a.l.s@gmail.com'), 'robennals@gmail.com');
  assert.equal(normalizeEmail('robennals@gmail.com'), 'robennals@gmail.com');
  // Also covers @googlemail.com (same mail system).
  assert.equal(normalizeEmail('rob.ennals@googlemail.com'), 'robennals@googlemail.com');
});

test('normalizeEmail preserves dots in non-Gmail domains', () => {
  assert.equal(normalizeEmail('rob.ennals@example.com'), 'rob.ennals@example.com');
  assert.equal(normalizeEmail('user.name@fastmail.com'), 'user.name@fastmail.com');
});

test('normalizeEmail strips +tag plus-addressing on any domain', () => {
  assert.equal(normalizeEmail('rob+marketing@gmail.com'), 'rob@gmail.com');
  assert.equal(normalizeEmail('rob.ennals+x@gmail.com'), 'robennals@gmail.com');
  assert.equal(normalizeEmail('user+foo@example.com'), 'user@example.com');
  assert.equal(
    normalizeEmail('Rob.Ennals+Marketing@Gmail.com'),
    'robennals@gmail.com',
    'should chain with case + dots + tag'
  );
});

test('normalizeEmail leaves malformed input alone (for validator to reject)', () => {
  assert.equal(normalizeEmail('not-an-email'), 'not-an-email');
  assert.equal(normalizeEmail('@nowhere.com'), '@nowhere.com');
  assert.equal(normalizeEmail('trailing@'), 'trailing@');
});

test('isValidEmail accepts simple addresses, rejects garbage', () => {
  assert.equal(isValidEmail('a@b.co'), true);
  assert.equal(isValidEmail('not-an-email'), false);
  assert.equal(isValidEmail('a@b'), false);
  assert.equal(isValidEmail(''), false);
});

test('generatePin returns a 6-digit numeric string', () => {
  for (let i = 0; i < 50; i++) {
    const pin = generatePin();
    assert.equal(pin.length, PIN_LENGTH);
    assert.match(pin, /^\d{6}$/);
  }
});

test('hashPin is deterministic and depends on email + secret', () => {
  const h1 = hashPin('123456', 'a@b.co', 'sec');
  const h2 = hashPin('123456', 'a@b.co', 'sec');
  assert.equal(h1, h2);
  assert.notEqual(h1, hashPin('123456', 'a@b.co', 'other-secret'));
  assert.notEqual(h1, hashPin('123456', 'b@b.co', 'sec'));
  assert.notEqual(h1, hashPin('654321', 'a@b.co', 'sec'));
});

test('requestPin rejects invalid email', async () => {
  const store = makeStore();
  const sender = makeSender();
  const r = await requestPin(store, sender, { email: 'nope', secret: SECRET });
  assert.deepEqual(r, { ok: false, reason: 'invalid_email' });
  assert.equal(sender.sent.length, 0);
});

test('requestPin generates, stores hash, and sends pin', async () => {
  const store = makeStore();
  const sender = makeSender();
  const now = new Date('2026-04-01T00:00:00Z');
  const r = await requestPin(store, sender, { email: 'A@B.co', secret: SECRET, now });
  assert.equal(r.ok, true);
  if (!r.ok) throw new Error('unreachable');

  assert.equal(sender.sent.length, 1);
  // Send to the user's typed form (trimmed only), not the canonical form.
  assert.equal(sender.sent[0].email, 'A@B.co');
  assert.equal(sender.sent[0].pin, r.pin);

  // The DB key and hash use the canonical form.
  const stored = await store.get('a@b.co');
  assert.ok(stored);
  assert.equal(stored!.pinHash, hashPin(r.pin, 'a@b.co', SECRET));
  assert.equal(stored!.attempts, 0);
  assert.equal(stored!.lastSentAt.toISOString(), now.toISOString());
  assert.equal(stored!.expiresAt.getTime(), now.getTime() + PIN_EXPIRY_MS);
});

test('requestPin sends PIN to the typed email, not the canonicalized one', async () => {
  const store = makeStore();
  const sender = makeSender();
  // User types a Gmail variant with dots and +tag. We should send to what
  // they typed; they might be watching for that address specifically.
  const typed = 'Rob.Ennals+billing@Gmail.com';
  const r = await requestPin(store, sender, { email: typed, secret: SECRET });
  assert.equal(r.ok, true);
  assert.equal(sender.sent.length, 1);
  assert.equal(sender.sent[0].email, typed, 'send-to must preserve user-typed form');
  // But the DB lookup uses the canonical form so it matches the verify side.
  const stored = await store.get('robennals@gmail.com');
  assert.ok(stored, 'DB row keyed by canonical email');
});

test('requestPin still cools down across typed-email variants that share canonical form', async () => {
  const store = makeStore();
  const sender = makeSender();
  const t0 = new Date('2026-04-01T00:00:00Z');
  await requestPin(store, sender, { email: 'rob.ennals@gmail.com', secret: SECRET, now: t0 });
  const tooSoon = new Date(t0.getTime() + 1_000);
  // A different typed variant should hit the same cooldown (same identity).
  const r = await requestPin(store, sender, {
    email: 'ROBENNALS+x@gmail.com',
    secret: SECRET,
    now: tooSoon,
  });
  assert.equal(r.ok, false);
  assert.equal(sender.sent.length, 1);
});

test('requestPin enforces resend cooldown', async () => {
  const store = makeStore();
  const sender = makeSender();
  const t0 = new Date('2026-04-01T00:00:00Z');
  const ok = await requestPin(store, sender, { email: 'a@b.co', secret: SECRET, now: t0 });
  assert.equal(ok.ok, true);

  const tooSoon = new Date(t0.getTime() + PIN_RESEND_COOLDOWN_MS - 1);
  const r = await requestPin(store, sender, { email: 'a@b.co', secret: SECRET, now: tooSoon });
  assert.equal(r.ok, false);
  if (r.ok) throw new Error('unreachable');
  assert.equal(r.reason, 'cooldown');
  assert.ok((r.retryAfterMs ?? 0) > 0);
  assert.equal(sender.sent.length, 1, 'second email should not have been sent');

  const justAfter = new Date(t0.getTime() + PIN_RESEND_COOLDOWN_MS + 1);
  const ok2 = await requestPin(store, sender, { email: 'a@b.co', secret: SECRET, now: justAfter });
  assert.equal(ok2.ok, true);
  assert.equal(sender.sent.length, 2);
});

test('verifyPin succeeds with the right pin and clears the record', async () => {
  const store = makeStore();
  const sender = makeSender();
  const now = new Date('2026-04-01T00:00:00Z');
  const issued = await requestPin(store, sender, { email: 'a@b.co', secret: SECRET, now });
  if (!issued.ok) throw new Error('setup failed');

  const r = await verifyPin(store, { email: 'A@B.co', pin: issued.pin, secret: SECRET, now });
  assert.deepEqual(r, { ok: true, email: 'a@b.co' });
  assert.equal(await store.get('a@b.co'), null);
});

test('verifyPin returns no_pin when there is no outstanding pin', async () => {
  const r = await verifyPin(makeStore(), { email: 'a@b.co', pin: '000000', secret: SECRET });
  assert.deepEqual(r, { ok: false, reason: 'no_pin' });
});

test('verifyPin rejects expired pins and deletes them', async () => {
  const store = makeStore();
  const sender = makeSender();
  const t0 = new Date('2026-04-01T00:00:00Z');
  const issued = await requestPin(store, sender, { email: 'a@b.co', secret: SECRET, now: t0 });
  if (!issued.ok) throw new Error('setup failed');

  const tooLate = new Date(t0.getTime() + PIN_EXPIRY_MS + 1);
  const r = await verifyPin(store, { email: 'a@b.co', pin: issued.pin, secret: SECRET, now: tooLate });
  assert.deepEqual(r, { ok: false, reason: 'expired' });
  assert.equal(await store.get('a@b.co'), null);
});

test('verifyPin bumps attempts on mismatch and locks out after PIN_MAX_ATTEMPTS', async () => {
  const store = makeStore();
  const sender = makeSender();
  const t0 = new Date('2026-04-01T00:00:00Z');
  const issued = await requestPin(store, sender, { email: 'a@b.co', secret: SECRET, now: t0 });
  if (!issued.ok) throw new Error('setup failed');

  for (let i = 0; i < PIN_MAX_ATTEMPTS - 1; i++) {
    const r = await verifyPin(store, { email: 'a@b.co', pin: '000000', secret: SECRET, now: t0 });
    assert.deepEqual(r, { ok: false, reason: 'mismatch' });
  }
  // The PIN_MAX_ATTEMPTS-th wrong attempt should still report mismatch but
  // wipe the record. The next call sees no_pin.
  const last = await verifyPin(store, { email: 'a@b.co', pin: '000000', secret: SECRET, now: t0 });
  assert.deepEqual(last, { ok: false, reason: 'mismatch' });
  assert.equal(await store.get('a@b.co'), null);

  const after = await verifyPin(store, { email: 'a@b.co', pin: issued.pin, secret: SECRET, now: t0 });
  assert.deepEqual(after, { ok: false, reason: 'no_pin' });
});

test('verifyPin reports too_many_attempts if attempts already maxed (defensive)', async () => {
  const store = makeStore();
  await store.upsert({
    email: 'a@b.co',
    pinHash: hashPin('123456', 'a@b.co', SECRET),
    expiresAt: new Date(Date.now() + 60_000),
    attempts: PIN_MAX_ATTEMPTS,
    lastSentAt: new Date(),
  });
  const r = await verifyPin(store, { email: 'a@b.co', pin: '123456', secret: SECRET });
  assert.deepEqual(r, { ok: false, reason: 'too_many_attempts' });
  assert.equal(await store.get('a@b.co'), null);
});

test('verifyPin rejects invalid email format', async () => {
  const r = await verifyPin(makeStore(), { email: 'nope', pin: '000000', secret: SECRET });
  assert.deepEqual(r, { ok: false, reason: 'invalid_email' });
});
