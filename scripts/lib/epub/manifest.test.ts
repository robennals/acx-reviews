import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mergeManifest, type EpubManifestEntry } from './manifest';

const entry = (contestId: string, url = 'u'): EpubManifestEntry => ({
  contestId,
  name: contestId,
  url,
  sizeBytes: 1,
  entryCount: 2,
  wordCount: 3,
  generatedAt: '2026-06-03T00:00:00Z',
});

test('adds a new entry to an empty manifest', () => {
  assert.deepEqual(mergeManifest([], entry('2026-book-reviews')), [entry('2026-book-reviews')]);
});

test('replaces an existing entry for the same contest', () => {
  const merged = mergeManifest([entry('2026-book-reviews', 'old')], entry('2026-book-reviews', 'new'));
  assert.equal(merged.length, 1);
  assert.equal(merged[0].url, 'new');
});

test('sorts newest contest first', () => {
  const merged = mergeManifest([entry('2025-non-book-reviews')], entry('2026-book-reviews'));
  assert.deepEqual(merged.map((e) => e.contestId), ['2026-book-reviews', '2025-non-book-reviews']);
});
