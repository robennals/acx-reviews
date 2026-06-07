// lib/markdown.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml } from './markdown';

// A known-entry stamping test is added in a later task once the dimensions
// manifest is backfilled. Here we assert the generic guarantee: an image whose
// URL is NOT in the manifest is never stamped.
test('image not in the manifest is left unstamped', async () => {
  const md = '![x](https://example.com/not-in-manifest.png)';
  const { html } = await markdownToHtml(md);
  assert.match(html, /<img[^>]+src="https:\/\/example\.com\/not-in-manifest\.png"/);
  assert.doesNotMatch(html, /<img[^>]+width=/);
});

// A real 2026 entry from data/image-dimensions.json: 1536x1024 natural, where
// the column-width cap binds → 704 wide, height round(704 * 1024/1536) = 469.
test('image in the manifest is stamped with display width/height', async () => {
  const url = 'https://acximages.ennals.org/images/2026-book-reviews/0167faa904b1178f.png';
  const { html } = await markdownToHtml(`![pic](${url})`);
  assert.match(html, /<img[^>]+width="704"/);
  assert.match(html, /<img[^>]+height="469"/);
});
