import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFootnotes } from './footnotes';

test('markdown with no footnotes returns unchanged body and empty list', () => {
  const input = 'Just a plain paragraph.\n\nAnother paragraph.';
  const result = extractFootnotes(input);
  assert.equal(result.body, input);
  assert.deepEqual(result.footnotes, []);
});
