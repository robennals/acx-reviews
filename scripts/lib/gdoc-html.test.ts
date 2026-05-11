import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupMarkdown } from './gdoc-html';

test('cleanupMarkdown rewrites a URL-embedded link so only the link text is clickable', async () => {
  // Real example from House of Leaves: gdoc author styled "house" as a
  // hyperlink, and the doc's hyperlink style includes font-weight:700, so
  // turndown emits "**[house](url)**". We need the rendered HTML to show
  // www.random + clickable "house" + .com — neither the `**` leaking nor
  // GFM autolinking the whole `www.random...com` span.
  const input = 'on the back!). The www.random**[house](https://en.wikipedia.org/wiki/House_of_Leaves)**.com address.';

  const out = cleanupMarkdown(input);

  // Markdown source: no bold wrapper, link preserved.
  assert.ok(!out.includes('**['), `leading bold marker should be gone; got: ${out}`);
  assert.ok(!out.includes(')**'), `trailing bold marker should be gone; got: ${out}`);
  assert.ok(out.includes('[house](https://en.wikipedia.org/wiki/House_of_Leaves)'), `link should be preserved; got: ${out}`);

  // Rendered HTML via the same pipeline the site uses: only "house" is a
  // link; "www.random" and ".com" are plain text (NOT GFM-autolinked).
  const { remark } = await import('remark');
  const html = (await import('remark-html')).default;
  const gfm = (await import('remark-gfm')).default;
  const rendered = (await remark().use(gfm).use(html, { sanitize: false }).process(out)).toString();

  assert.ok(
    rendered.includes('<a href="https://en.wikipedia.org/wiki/House_of_Leaves">house</a>'),
    `house should render as a link to Wikipedia; got: ${rendered}`
  );
  assert.ok(
    !rendered.includes('http://www.random'),
    `www.random should NOT be GFM-autolinked; got: ${rendered}`
  );
});

test('cleanupMarkdown preserves a legitimate link adjacent to a sentence-ending period', () => {
  // "If there's a third guy, it's Lacan.[Scott](https://...) tells us..."
  // The link is at the start of a new sentence; only a period separates
  // it from the previous word. Do NOT unwrap — there is no TLD-shaped
  // suffix after the link.
  const input = "it's Lacan.[Scott](https://www.astralcodexten.com/p/book-review-a-clinical-introduction) tells us that";

  const out = cleanupMarkdown(input);

  assert.ok(out.includes('[Scott]'), `legitimate link should be preserved; got: ${out}`);
});

test('cleanupMarkdown preserves a standalone link surrounded by whitespace', () => {
  const input = 'See [the docs](https://example.com/docs) for more.';
  const out = cleanupMarkdown(input);
  assert.equal(out, input);
});

test('cleanupMarkdown rewrites tail-of-doc bare-number footnote defs to bracketed form', () => {
  // Gdoc author hand-formatted footnotes as superscripted numbers in body
  // and "N   content" lines at the end of the doc. Turndown drops the
  // superscript styling, leaving bare digits glued to surrounding text.
  // The defs need to be in bracketed form so the render-time footnote
  // extractor (extractPlain) picks them up and rewires the body refs.
  const input = [
    'The first body paragraph references footnote one.1',
    '',
    'A second paragraph references footnote two.2',
    '',
    '1   First footnote body text goes here.',
    '',
    '2   Second footnote body text continues.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(/^\[1\] First footnote/m.test(out), `def 1 should be bracketed; got: ${out}`);
  assert.ok(/^\[2\] Second footnote/m.test(out), `def 2 should be bracketed; got: ${out}`);
});

test('cleanupMarkdown does not rewrite lone "N text" lines that look like footnote defs but appear mid-document', () => {
  // A single isolated "N   text" line mid-document is more likely to be
  // numbered content than a footnote def. Only the trailing run is
  // converted, and only when there are 2+ such lines.
  const input = [
    '1   This looks like a def but is in the body.',
    '',
    'Some other content follows.',
    '',
    'Conclusion paragraph at the end of the document.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(!out.includes('[1]'), `mid-doc N-text line should NOT be rewritten; got: ${out}`);
});

test('cleanupMarkdown does not rewrite a single trailing "N text" line', () => {
  // A single line could easily be a coincidence rather than a real footnote
  // def. Require 2+ to trigger the rewrite.
  const input = 'Some body content.\n\n1   A trailing single line that might or might not be a footnote.';
  const out = cleanupMarkdown(input);
  assert.ok(!out.includes('[1]'), `single trailing line should NOT be rewritten; got: ${out}`);
});

test('cleanupMarkdown normalizes thematic-break paragraphs that turndown escaped', () => {
  // When the gdoc author types "***" as a paragraph (instead of using a
  // proper horizontal rule), turndown emits a half-escaped "*\*\*" that
  // doesn't render as anything. Normalize to "* * *" (a valid CommonMark
  // thematic break).
  const input = [
    'First section.',
    '',
    '*\\*\\*',
    '',
    'Second section.',
    '',
    '\\*\\*\\*',
    '',
    'Third section.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(!/\\\*/.test(out), `escaped asterisks should be normalized away; got: ${out}`);
  // Two thematic breaks should remain.
  const breaks = (out.match(/^\* \* \*$/gm) || []).length;
  assert.equal(breaks, 2, `expected two thematic-break lines; got ${breaks}: ${out}`);
});
