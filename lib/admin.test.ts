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
