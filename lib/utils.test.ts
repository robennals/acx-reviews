import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createExcerpt } from './utils';

test('createExcerpt strips blockquote markers from a leading quote paragraph', () => {
  const content = [
    '> "Democracy is the worst form of Government except for all those other forms that have been tried." - Winston Churchill',
    '> ',
    '> "There exists in such a case a certain institution or law."',
  ].join('\n');

  const excerpt = createExcerpt(content);

  assert.ok(!excerpt.includes('>'), `excerpt should not contain '>' but got: ${excerpt}`);
  assert.ok(
    excerpt.startsWith('"Democracy'),
    `excerpt should start with the quote text but got: ${excerpt}`
  );
});

test('createExcerpt strips blockquote markers when the blockquote is the chosen paragraph', () => {
  const content = [
    '> A blockquote line that on its own is comfortably longer than the fifty character minimum threshold.',
    '> Continued on the next line of the same blockquote.',
  ].join('\n');

  const excerpt = createExcerpt(content);

  assert.ok(!excerpt.includes('>'), `excerpt should not contain '>' but got: ${excerpt}`);
});

test('createExcerpt preserves the blank line that separates an intro paragraph from a following blockquote', () => {
  const content = [
    '_[This is one of the finalists in the 2025 review contest, written by an ACX reader who will remain anonymous until after voting is done.]_',
    '',
    '> "Democracy is the worst form of Government except for all those other forms that have been tried." - Winston Churchill',
    '> ',
    '> "There exists a certain institution or law; let us say, for simplicity, a fence."',
  ].join('\n');

  const excerpt = createExcerpt(content);

  assert.ok(
    !excerpt.includes('finalists'),
    `intro should be skipped, not merged into the excerpt; got: ${excerpt}`
  );
  assert.ok(
    excerpt.startsWith('"Democracy'),
    `excerpt should be the Churchill quote, not the Chesterton one; got: ${excerpt}`
  );
});

test('createExcerpt skips a leading image-only paragraph', () => {
  const content = [
    '![](https://acximages.ennals.org/images/2024-book-reviews/942c2c31112b8103.png)',
    '',
    'A Canticle for Leibowitz is a 1959 post-apocalyptic novel that follows a Catholic monastic order across centuries as they preserve fragments of pre-war scientific knowledge.',
  ].join('\n');

  const excerpt = createExcerpt(content);

  assert.ok(
    !excerpt.includes('!['),
    `excerpt should not contain markdown image syntax but got: ${excerpt}`
  );
  assert.ok(
    !excerpt.includes('http'),
    `excerpt should not contain the image URL but got: ${excerpt}`
  );
  assert.ok(
    excerpt.startsWith('A Canticle'),
    `excerpt should start with the prose paragraph but got: ${excerpt}`
  );
});

test('createExcerpt strips an inline image but keeps the surrounding paragraph text', () => {
  const content = 'Before the deluge, ![cover](https://example.com/cover.png) the monks of the order preserved fragments of pre-war scientific knowledge across the centuries.';

  const excerpt = createExcerpt(content);

  assert.ok(
    !excerpt.includes('!['),
    `excerpt should not contain markdown image syntax but got: ${excerpt}`
  );
  assert.ok(
    !excerpt.includes('example.com'),
    `excerpt should not contain the image URL but got: ${excerpt}`
  );
  assert.ok(
    excerpt.includes('Before the deluge') && excerpt.includes('the monks'),
    `excerpt should preserve text on either side of the image but got: ${excerpt}`
  );
});

test('createExcerpt preserves greater-than characters that appear mid-line', () => {
  const content = 'In math, 5 > 3 is a true statement and this paragraph is plenty long enough to be picked as the excerpt.';

  const excerpt = createExcerpt(content);

  assert.ok(
    excerpt.includes('5 > 3'),
    `mid-line '>' should be preserved but got: ${excerpt}`
  );
});
