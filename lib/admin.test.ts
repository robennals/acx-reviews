import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isAdminEmail, parseAdminEmails } from './admin';

test('parseAdminEmails handles undefined and empty', () => {
  assert.deepEqual([...parseAdminEmails(undefined)], []);
  assert.deepEqual([...parseAdminEmails('')], []);
});

test('parseAdminEmails splits, lowercases, trims, drops empties', () => {
  const raw = ' Rob@Example.com , scott@x.com,, ,';
  const set = parseAdminEmails(raw);
  assert.deepEqual([...set].sort(), ['rob@example.com', 'scott@x.com']);
});

test('isAdminEmail returns false for missing email', () => {
  assert.equal(isAdminEmail(null, 'a@b.co'), false);
  assert.equal(isAdminEmail(undefined, 'a@b.co'), false);
});

test('isAdminEmail is case- and whitespace-insensitive', () => {
  assert.equal(isAdminEmail(' ROB@example.com ', 'rob@example.com,scott@x.com'), true);
  assert.equal(isAdminEmail('other@example.com', 'rob@example.com,scott@x.com'), false);
});

test('isAdminEmail matches Gmail dot variants on both sides', () => {
  // Admin listed with dots in the env var; user signs in via the no-dot form.
  assert.equal(
    isAdminEmail('robennals@gmail.com', 'rob.ennals@gmail.com,scott@x.com'),
    true
  );
  // Env has no dots; user signs in with dots.
  assert.equal(
    isAdminEmail('rob.ennals@gmail.com', 'robennals@gmail.com'),
    true
  );
  // Non-admin still rejected even with Gmail-ish input.
  assert.equal(
    isAdminEmail('stranger@gmail.com', 'rob.ennals@gmail.com'),
    false
  );
});

test('isAdminEmail treats +tag variants as DIFFERENT identities', () => {
  // If an admin is listed as "rob@gmail.com", then "rob+admin@gmail.com"
  // is NOT them — plus-addressing is intentional and preserved.
  assert.equal(isAdminEmail('rob+marketing@gmail.com', 'rob@gmail.com'), false);
  assert.equal(isAdminEmail('rob@gmail.com', 'rob+admin@gmail.com'), false);
});
