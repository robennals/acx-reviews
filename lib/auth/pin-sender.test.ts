import { test } from 'node:test';
import assert from 'node:assert/strict';
import { pinSenderFor } from './pin-sender';
import { postmarkPinSender } from './pin-sender-postmark';
import { resendPinSender } from './pin-sender-resend';

test('defaults to postmark when EMAIL_PROVIDER is unset', () => {
  assert.equal(pinSenderFor(undefined), postmarkPinSender);
  assert.equal(pinSenderFor(''), postmarkPinSender);
});

test('selects providers by name, case-insensitively', () => {
  assert.equal(pinSenderFor('postmark'), postmarkPinSender);
  assert.equal(pinSenderFor('resend'), resendPinSender);
  assert.equal(pinSenderFor(' Resend '), resendPinSender);
});

test('throws on an unknown provider instead of silently falling back', () => {
  assert.throws(() => pinSenderFor('sendgrid'), /Unknown EMAIL_PROVIDER/);
});
