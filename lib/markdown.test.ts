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
