import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanupMarkdown, convertGDocToMarkdown } from './gdoc-html';

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

test('convertGDocToMarkdown splits a single <p> with <br>+nbsp-run into multiple blockquote paragraphs', async () => {
  // Real example from Imagined Communities: Google Docs emits one <p>
  // for the whole multi-paragraph quote and uses <br>&nbsp;…&nbsp; runs
  // to fake paragraph breaks via first-line indents. We need to render
  // these as proper multi-paragraph blockquotes, not one stuck-together
  // run. Paragraph-shaped content (60+ chars per part) so the
  // "paragraph-shaped" guard doesn't drop the test as a false positive.
  const html = `<html><head><style>.c6{margin-left:36pt;margin-right:36pt}</style></head><body><p class="c6"><span>This first paragraph contains enough substantive prose to clearly be a paragraph and not a verse line, with multiple clauses and a final period.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The second paragraph also contains substantive prose with similar length and structure, again to qualify as a real paragraph.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The third paragraph rounds out the example with the same shape, comfortably above the sixty-character paragraph threshold.</span></p></body></html>`;

  const md = convertGDocToMarkdown(html);

  assert.ok(md.includes('This first paragraph'), `first para present; got: ${md}`);
  assert.ok(md.includes('The second paragraph'), `second para present; got: ${md}`);
  assert.ok(md.includes('The third paragraph'), `third para present; got: ${md}`);
  const paragraphSeparators = (md.match(/^>\s*$/gm) || []).length;
  assert.ok(
    paragraphSeparators >= 2,
    `should have 2+ blockquote paragraph separators; got ${paragraphSeparators}: ${md}`
  );
});

test('convertGDocToMarkdown does NOT split a body paragraph (not blockquoted) with <br>+nbsp runs', async () => {
  // Without an indent class on the paragraph, the fake-paragraph-break
  // pattern is more likely artistic spacing than a multi-paragraph quote.
  const html = `<html><head><style></style></head><body><p><span>This first paragraph contains enough substantive prose to clearly be a paragraph and not a verse line, with multiple clauses and a final period.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;The second paragraph also contains substantive prose with similar length and structure, again to qualify as a real paragraph.</span></p></body></html>`;

  const md = convertGDocToMarkdown(html);

  const sep = (md.match(/^>\s*$/gm) || []).length;
  assert.equal(sep, 0, `body paragraph should NOT be split; got: ${md}`);
});

test('cleanupMarkdown promotes a bold-only short line to a level-2 heading', () => {
  // Real example from Cultural Evolution: the author styled subheadings
  // as bold-and-underlined text instead of using a proper Heading-2
  // style. Turndown drops the visual styling, leaving "**Title**" on a
  // line by itself. Promote those lines to "## Title" so the rendered
  // page shows them at the same prominence as docs that use proper
  // headings.
  const input = [
    'A substantive prose paragraph that comfortably exceeds fifty characters of plain text.',
    '',
    '**Intergenerational Value Change**',
    '',
    'Another substantive prose paragraph below the heading, also comfortably above fifty characters.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(/^## Intergenerational Value Change$/m.test(out), `expected H2; got: ${out}`);
  assert.ok(!out.includes('**Intergenerational'), `bold marker should be removed; got: ${out}`);
});

test('cleanupMarkdown does NOT promote when neighbors are too short', () => {
  // A bold line surrounded by short data values (a tier-list) should
  // stay bold even if neither short value is itself bold-only.
  const input = [
    'Substantive intro paragraph that is comfortably longer than fifty characters of real text content.',
    '',
    '25-30%',
    '',
    '**Silver**',
    '',
    '15-20%',
    '',
    'Substantive outro paragraph that is also comfortably longer than fifty characters of real text.',
  ].join('\n');

  const out = cleanupMarkdown(input);
  assert.ok(!/^## Silver/m.test(out), `Silver should NOT be promoted; got: ${out}`);
});

test('cleanupMarkdown does NOT promote a bold sentence-fragment with terminal punctuation', () => {
  // A bold-wrapped line ending in a period/!/? is almost always a
  // sentence-as-emphasis, not a heading. Leave it bold.
  const input = 'Body above.\n\n**This is a really important point.**\n\nBody below.';
  const out = cleanupMarkdown(input);
  assert.ok(out.includes('**This is a really important point.**'), `bold sentence should be preserved; got: ${out}`);
  assert.ok(!/^##\s/m.test(out), `no heading should be inserted; got: ${out}`);
});

test('cleanupMarkdown does NOT promote a bold span that is not on its own line', () => {
  const input = 'She thought **carefully** about every word before responding to the question.';
  const out = cleanupMarkdown(input);
  assert.equal(out, input);
});

test('cleanupMarkdown does NOT promote a long bold line (>100 chars)', () => {
  const longText = 'This is a very long bold passage that almost certainly is a quoted line of intense emphasis rather than a section title';
  const input = `Body above.\n\n**${longText}**\n\nBody below.`;
  const out = cleanupMarkdown(input);
  assert.ok(out.includes(`**${longText}**`), `long bold should be preserved as emphasis; got: ${out}`);
});

test('cleanupMarkdown does NOT promote bold lines when the doc already uses ATX headings', () => {
  // If the author chose to use proper `##` headings anywhere in the
  // doc, any bold-only line is emphasis, not a missed heading.
  const input = [
    'A substantive prose paragraph that is comfortably above the fifty-character threshold to count as a real paragraph.',
    '',
    '## A Proper Heading',
    '',
    'Another substantive prose paragraph that is comfortably above the fifty-character threshold for context.',
    '',
    '**Bold Section Label**',
    '',
    'A third substantive prose paragraph that is comfortably above the fifty-character threshold of text content.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(out.includes('**Bold Section Label**'), `bold-only line should stay bold; got: ${out}`);
  assert.ok(!/^## Bold Section Label/m.test(out), `bold-only line should NOT be promoted; got: ${out}`);
});

test('cleanupMarkdown does NOT promote a bold quote-attribution line (starts with em-dash)', () => {
  // Real example from Melmoth the Wanderer: italic quote followed by
  // bold attribution. The attribution is bold-only, short, no terminal
  // punctuation — but starts with an en-dash, which signals it's an
  // attribution.
  const input = [
    'A substantive prose paragraph that comfortably exceeds fifty characters of plain text before the quote.',
    '',
    '_What a difference between words without meaning, and meaning without words._',
    '',
    '**– C.R. Maturin, Melmoth the Wanderer**',
    '',
    'Another substantive prose paragraph that comfortably exceeds fifty characters after the attribution.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(out.includes('**– C.R. Maturin'), `attribution should stay bold; got: ${out}`);
  assert.ok(!/^## –/m.test(out), `attribution should NOT be promoted; got: ${out}`);
});

test('cleanupMarkdown does NOT promote a bold line that ends with an em-dash', () => {
  // Real example: a bold sentence fragment trailing off with an em-dash.
  const input = [
    'Substantive prose context paragraph above that is well past fifty characters of normal text.',
    '',
    '**As I think I already pointed out, Nazi Germany started out as –**',
    '',
    'Substantive prose context paragraph below that is also well past fifty characters of normal text.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(out.includes('**As I think I already pointed out'), `trailing em-dash fragment should stay bold; got: ${out}`);
  assert.ok(!/^## As I think/m.test(out), `trailing em-dash fragment should NOT be promoted; got: ${out}`);
});

test('cleanupMarkdown does NOT promote bold labels in a tier-list pattern', () => {
  // Real example from "The Signal and the Noise": the author uses bold
  // labels (Bronze, Silver, Gold) interleaved with short data values.
  // That's a list, not section breaks — leave bold.
  const input = [
    'A substantive paragraph of prose introducing the calibration scoring system that follows below.',
    '',
    '**Calibration:**',
    '',
    '**Bronze**',
    '',
    '25-30%',
    '',
    '7,500/10,000',
    '',
    '**Silver**',
    '',
    '15-20%',
    '',
    '**Gold**',
    '',
    '5%',
    '',
    'A substantive paragraph of prose interpreting what these calibration tiers mean for the analysis.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(!/^## Bronze/m.test(out), `Bronze should NOT be promoted; got: ${out}`);
  assert.ok(!/^## Silver/m.test(out), `Silver should NOT be promoted; got: ${out}`);
  assert.ok(!/^## Gold/m.test(out), `Gold should NOT be promoted; got: ${out}`);
  assert.ok(out.includes('**Bronze**'), `Bronze should remain bold; got: ${out}`);
});

test('convertGDocToMarkdown does NOT split short-line content even if every <br> has an indent', async () => {
  // Verse-style content where every line happens to start with a first-line
  // indent should NOT be split. The 60-char-per-part guard protects.
  const html = `<html><head><style>.c6{margin-left:36pt;margin-right:36pt}</style></head><body><p class="c6"><span>Short verse one.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Short verse two.<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Short verse three.</span></p></body></html>`;

  const md = convertGDocToMarkdown(html);

  const sep = (md.match(/^>\s*$/gm) || []).length;
  assert.equal(sep, 0, `short-line content should NOT be split; got: ${md}`);
});

test('convertGDocToMarkdown does NOT split on a single <br> without an indent', async () => {
  // A normal line break inside a paragraph should stay a line break,
  // not become a paragraph split.
  const html = `<html><head><style>.c6{margin-left:36pt;margin-right:36pt}</style></head><body><p class="c6"><span>First line of the verse.<br>Second line of the verse.</span></p></body></html>`;

  const md = convertGDocToMarkdown(html);

  // Should NOT have a blank blockquote separator line.
  const sep = (md.match(/^>\s*$/gm) || []).length;
  assert.equal(sep, 0, `verse-style line break should NOT become paragraph break; got: ${md}`);
});

test('convertGDocToMarkdown does NOT split a poetry-style paragraph that mixes plain and indented <br>', async () => {
  // Real example from Patrocleia: a stanza with plain verse-line breaks
  // and one stanza-internal indented line. Both are inside one <p>. We
  // should NOT split — the plain <br>s show this is verse formatting, and
  // splitting on the indented one would tear bold spans mid-stanza.
  const html = `<html><head><style>.c6{margin-left:36pt;margin-right:36pt}</style></head><body><p class="c6"><span>Movement in the air. Gulls lift.<br>Sideslip. Land again. No more.<br>Mindless of everything Achilles said<br>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;Patroclus went for Troy.</span></p></body></html>`;

  const md = convertGDocToMarkdown(html);

  // Should NOT introduce a blank blockquote separator anywhere in this
  // paragraph — it's one stanza.
  const sep = (md.match(/^>\s*$/gm) || []).length;
  assert.equal(sep, 0, `mixed-br paragraph should not be split; got: ${md}`);
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
