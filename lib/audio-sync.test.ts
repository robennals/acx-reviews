import { test } from 'node:test';
import assert from 'node:assert/strict';
import { wordIndexAtTime, normalizeForMatch, matchParagraphsToBlocks } from './audio-sync';

const words = [
  { s: 0.5, e: 0.9 },
  { s: 1.0, e: 1.4 },
  { s: 2.0, e: 2.3 },
];

test('wordIndexAtTime returns the last word starting at or before t', () => {
  assert.equal(wordIndexAtTime(words, 1.1), 1);
  assert.equal(wordIndexAtTime(words, 2.0), 2);
  // In the gap between words, the previous word stays current.
  assert.equal(wordIndexAtTime(words, 1.7), 1);
});

test('wordIndexAtTime returns -1 before the first word and last index past the end', () => {
  assert.equal(wordIndexAtTime(words, 0.1), -1);
  assert.equal(wordIndexAtTime(words, 99), 2);
});

test('normalizeForMatch keeps only letters, lowercased', () => {
  // Footnote refs render as bare digits in the DOM; digits must vanish so
  // source text and DOM text normalize identically.
  assert.equal(normalizeForMatch('I was not expecting1 a book'), 'iwasnotexpectingabook');
  assert.equal(normalizeForMatch('I was not expecting a book'), 'iwasnotexpectingabook');
  assert.equal(normalizeForMatch('Moby-Dick; or, The Whale'), 'mobydickorthewhale');
  assert.equal(normalizeForMatch('Café — naïve'), 'cafénaïve');
});

test('matchParagraphsToBlocks pairs paragraphs with DOM blocks in order', () => {
  const paras = ['II. Whaling', 'Whaling is a concept.', 'The reason is whaling.'];
  const blocks = ['II. Whaling', 'Whaling is a concept.', 'The reason is whaling.'];

  assert.deepEqual(matchParagraphsToBlocks(paras, blocks), [0, 1, 2]);
});

test('matchParagraphsToBlocks skips DOM-only blocks and tolerates missing paragraphs', () => {
  // Para 0 (the h1) is absent from the DOM; the DOM has an extra block
  // (e.g. an unmatched fragment) between matched paragraphs.
  const paras = ['The Title', 'First real paragraph.', 'Second paragraph.'];
  const blocks = ['First real paragraph.', 'something unrelated entirely', 'Second paragraph.'];

  assert.deepEqual(matchParagraphsToBlocks(paras, blocks), [null, 0, 2]);
});

test('matchParagraphsToBlocks never matches an empty-normalizing paragraph', () => {
  // "1,500" normalizes to '' and must not glob onto anything.
  const paras = ['1,500', 'Real text.'];
  const blocks = ['Real text.'];

  assert.deepEqual(matchParagraphsToBlocks(paras, blocks), [null, 0]);
});
