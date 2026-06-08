import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildFeedbackEmail } from './feedback-email';

test('subject mentions the review title', () => {
  const m = buildFeedbackEmail({ senderName: 'Alice', reviewTitle: 'On Liberty', message: 'Loved it' });
  assert.match(m.subject, /On Liberty/);
});

test('text body contains the neutral anonymity header with sender + title', () => {
  const m = buildFeedbackEmail({ senderName: 'Alice', reviewTitle: 'On Liberty', message: 'Great work' });
  assert.match(m.text, /This message from Alice was sent to the author of On Liberty/);
  assert.match(m.text, /hidden to preserve their anonymity/);
  assert.match(m.text, /Great work/);
});

test('html body escapes the message and sender name', () => {
  const m = buildFeedbackEmail({ senderName: 'A <b>', reviewTitle: 'T', message: '1 < 2 & 3 > 0' });
  assert.match(m.html, /A &lt;b&gt;/);
  assert.match(m.html, /1 &lt; 2 &amp; 3 &gt; 0/);
  assert.doesNotMatch(m.html, /1 < 2 & 3 > 0/);
});

test('html preserves message line breaks as <br>', () => {
  const m = buildFeedbackEmail({ senderName: 'A', reviewTitle: 'T', message: 'line one\nline two' });
  assert.match(m.html, /line one<br>line two/);
});
