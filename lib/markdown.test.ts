// lib/markdown.test.ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markdownToHtml, renderOptionsFromFrontmatter } from './markdown';

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

// Google Docs exports carry first-line indents and wide gaps after list
// numbers; CommonMark would render both as monospace code blocks.
test('indented prose renders as a paragraph, not a code block', async () => {
  const { html } = await markdownToHtml('Intro.\n\n     An indented paragraph.\n');
  assert.doesNotMatch(html, /<pre>|<code>/);
  assert.match(html, /<p>An indented paragraph\.<\/p>/);
});

test('list items with a wide gap after the number stay list text', async () => {
  const { html } = await markdownToHtml('1.      First point.\n\n2.       Second point.\n', {
    disableFootnotes: true, // a bare trailing numbered list reads as plain-format footnotes
  });
  assert.doesNotMatch(html, /<pre>|<code>/);
  assert.match(html, /<li>\s*<p>First point\.<\/p>/);
});

test('fenced code still renders as a code block', async () => {
  const { html } = await markdownToHtml('```\nx = 1\n```\n');
  assert.match(html, /<pre><code>x = 1\n<\/code><\/pre>/);
});

test('renderOptionsFromFrontmatter passes per-review footnote flags on', async () => {
  const md = 'Body.\n\n[1] Not a footnote, just a list.\n';
  const off = await markdownToHtml(md, renderOptionsFromFrontmatter({ disableFootnotes: true }));
  assert.equal(off.footnotes.length, 0);
  assert.deepEqual(renderOptionsFromFrontmatter(undefined), {
    disableFootnotes: false,
    superscriptFootnotes: false,
  });
});
