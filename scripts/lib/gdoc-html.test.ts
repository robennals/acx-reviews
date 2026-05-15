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

test('convertGDocToMarkdown nests sibling lists encoded via lst-kix-N depth suffixes', () => {
  // Real example from Trip Sitting: Google Docs flattens nested lists
  // into sibling <ul>/<ol> elements, encoding the nesting via class
  // suffixes like `lst-kix_X-0` (top), `lst-kix_X-1` (depth 1). The
  // export should produce a properly nested markdown sublist.
  const html = `<html><head><style></style></head><body><ul class="lst-kix_a-0 start"><li>Top item one</li><li>Top item two</li></ul><ol class="lst-kix_a-1 start"><li>Nested one</li><li>Nested two</li></ol><p>Body paragraph below.</p></body></html>`;

  const md = convertGDocToMarkdown(html);

  // Nested items should be indented (turndown emits 4-space indents
  // for nested list items).
  assert.ok(/^\s{2,}1\.\s+Nested one/m.test(md), `nested item 1 should be indented; got: ${md}`);
  assert.ok(/^\s{2,}2\.\s+Nested two/m.test(md), `nested item 2 should be indented; got: ${md}`);
  // Top-level items stay at column 0.
  assert.ok(/^\*\s+Top item one/m.test(md), `top item 1 stays at column 0; got: ${md}`);
});

test('convertGDocToMarkdown does NOT blockquote a top-level bullet list', () => {
  // Real example: Trip Sitting. The gdoc author wrote a top-level
  // `<ul>` after a heading. The `<li>` elements carry Google Docs'
  // standard 36pt bullet-indent margin — that's the visual indent
  // every bulleted list has, not a signal of blockquoting. The
  // exported markdown should be a plain bullet list, not a list
  // prefixed with `>`.
  const html = `<html><head><style>.c0{margin-left:36pt}</style></head><body><h1>The gist!</h1><ul><li class="c0">First bullet item that comfortably exceeds fifty characters of content.</li><li class="c0">Second bullet item also comfortably above the threshold.</li><li class="c0">Third bullet item rounds out the list.</li></ul><p>Body paragraph below the bullet list goes here as normal prose content.</p></body></html>`;

  const md = convertGDocToMarkdown(html);

  // Bullet lines should not be inside a blockquote.
  assert.ok(!/^>\s*\*\s+First bullet/m.test(md), `bullet should NOT have > prefix; got: ${md}`);
  // The original bullets should still appear as markdown bullet list.
  assert.ok(/^[*-]\s+First bullet/m.test(md), `bullet list should be preserved as plain markdown; got: ${md}`);
});

test('convertGDocToMarkdown DOES detect italic + standalone bullet as quote+attribution (no > prefix needed)', () => {
  // Sins of GK pattern: italic quote followed by a single bullet
  // citation. The bullet doesn't need a `> ` prefix anymore (lists
  // are no longer auto-blockquoted) — the markdown-phase detector
  // wraps the italic lines AND the attribution into one blockquote.
  const html = `<html><head><style></style></head><body><p><em>A substantive italic quote paragraph that comfortably exceeds the substantive threshold of fifty characters.</em></p><ul><li><em>The Source Title</em></li></ul><p>Body paragraph below.</p></body></html>`;

  const md = convertGDocToMarkdown(html);

  // Both the italic quote AND the attribution should be in the
  // same blockquote.
  assert.ok(/^> _A substantive italic quote/m.test(md), `italic line should be wrapped in blockquote; got: ${md}`);
  assert.ok(/^>\s*[*-]\s+_The Source Title_/m.test(md), `attribution should also be in blockquote; got: ${md}`);
});

test('convertGDocToMarkdown converts a Google Docs <table> to a GFM markdown table', async () => {
  // Real example pattern from Religion for Atheists: a small 2-column
  // table that turndown would otherwise flatten into eight unrelated
  // paragraphs. We want proper `| header | header |\n| --- | --- |`
  // markdown so it renders as a table on the site.
  const html = `<html><head><style></style></head><body><table>
    <tr><td>Defence mechanism</td><td>Destination</td></tr>
    <tr><td>Denial</td><td>Milton Keynes</td></tr>
    <tr><td>Repression</td><td>Nantes</td></tr>
  </table></body></html>`;

  const md = convertGDocToMarkdown(html);

  assert.ok(/^\|\s*Defence mechanism\s*\|\s*Destination\s*\|$/m.test(md), `header row should be in pipe format; got: ${md}`);
  assert.ok(/^\|\s*---\s*\|\s*---\s*\|$/m.test(md), `separator row should be in pipe format; got: ${md}`);
  assert.ok(/^\|\s*Denial\s*\|\s*Milton Keynes\s*\|$/m.test(md), `body row 1 should be in pipe format; got: ${md}`);
  assert.ok(/^\|\s*Repression\s*\|\s*Nantes\s*\|$/m.test(md), `body row 2 should be in pipe format; got: ${md}`);
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

test('cleanupMarkdown DOES promote a bold heading followed by an italic-quote block then prose', () => {
  // Real example from "The Sins of GK Chesterton": a section heading
  // followed by several lines of italic-quoted poetry, then the
  // substantive prose. We walk past italic-only and blockquote lines
  // when looking for the substantive context.
  const input = [
    'A long substantive paragraph above the heading that comfortably exceeds fifty characters of real prose.',
    '',
    '**Chesterton’s Circle**',
    '',
    '_Before the Roman came to Rye or out to Severn strode,_',
    '',
    '_The rolling English drunkard made the rolling English road._',
    '',
    '> *   _The Rolling English Road_',
    '',
    'Ingrams begins by painting the more familiar picture of GK Chesterton: a jolly, witty buffoon, six foot two and twenty stone.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(/^## Chesterton/m.test(out), `should be promoted past italic quote; got: ${out}`);
});

test('cleanupMarkdown DOES promote a bold heading flanked by prose above and a short quote below', () => {
  // Real example from "War" in Sins of GK Chesterton: substantive prose
  // above, italic quote below. Either side substantive is enough.
  const input = [
    'A long substantive paragraph that wraps up the previous section with plenty of prose content above the next heading.',
    '',
    '**War**',
    '',
    '_Likelier the barricades shall blare_',
    '',
    '_Slaughter below and smoke above,_',
    '',
    'And so the substantive discussion of the war section continues from here with significant prose content.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(/^## War/m.test(out), `should be promoted with prose above + italic below; got: ${out}`);
});

test('cleanupMarkdown DOES promote when the doc has only a title heading at the very top', () => {
  // The doc's title becomes a `##` heading; that shouldn't count as the
  // doc using ATX headings for sections. Promote bolds anyway.
  const input = [
    '## The Document Title At The Very Top',
    '',
    'A substantive prose paragraph below the title that is comfortably above fifty characters of real prose.',
    '',
    '**Section One**',
    '',
    'Another substantive prose paragraph that is also comfortably above fifty characters of real prose content.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(/^## Section One$/m.test(out), `should promote despite title-style heading at top; got: ${out}`);
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

test('cleanupMarkdown dedents indented italic-only lines so they do not render as code blocks', () => {
  // Real example from "The Sins of GK Chesterton": the gdoc author
  // used `&nbsp; &nbsp; &nbsp;` to indent alternating poem lines for
  // visual effect. Those nbsps become real spaces, and any line with
  // 4+ leading spaces renders as an indented CODE BLOCK in CommonMark.
  // Strip the leading whitespace from italic-only lines so the italic
  // styling renders as normal prose.
  const input = [
    'Substantive prose above the quote, easily over fifty characters of real text content.',
    '',
    '_Oh, I knew a Doctor Gluck,_',
    '',
    '     _And his nose it had a hook,_',
    '',
    '_And his attitudes were anything but Aryan;_',
  ].join('\n');

  const out = cleanupMarkdown(input);

  // The 5-space-indented italic line must no longer be at column 4+.
  assert.ok(!/\n {4,}_/.test(out), `indented italic should be dedented; got: ${out}`);
  assert.ok(out.includes('_And his nose it had a hook,_'), `italic content preserved; got: ${out}`);
});

test('cleanupMarkdown wraps multi-line italic poetry without an attribution into a blockquote', () => {
  // Real example from Sins of GK Chesterton: the "We whom great mercy
  // holds in fear" poem at the essay's end. Multiple italic-only short
  // lines, no `> *` attribution after. Still poetry; should be wrapped
  // and compacted to verse rendering.
  const input = [
    'Substantive prose above the poem that easily exceeds fifty characters of normal content.',
    '',
    '_We whom great mercy holds in fear,_',
    '',
    '_Boast not the claim to cry,_',
    '',
    '_Stricken of any mortal wrong,_',
    '',
    '_Lord, let this dead man live!_',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(/^> _We whom great mercy holds in fear,_  $/m.test(out), `line 1 should be in blockquote with trailing 2 spaces; got: ${out}`);
  assert.ok(/^> _Boast not the claim to cry,_  $/m.test(out), `line 2 should be in blockquote; got: ${out}`);
  assert.ok(/^> _Lord, let this dead man live!_$/m.test(out), `last line should be in blockquote (no trailing 2 spaces); got: ${out}`);
});

test('cleanupMarkdown does NOT wrap a single standalone italic paragraph as poetry', () => {
  // One italic line on its own is just an emphasis paragraph, not a
  // poem. Don't wrap.
  const input = 'Body prose above easily exceeding fifty characters of content.\n\n_A single isolated italic emphasis paragraph._\n\nBody prose below also above the threshold easily.';
  const out = cleanupMarkdown(input);
  assert.ok(!/^>/m.test(out), `should not be wrapped in blockquote; got: ${out}`);
});

test('cleanupMarkdown wraps multiple italic-only lines + attribution into a single blockquote', () => {
  // Real example: a quote in poem form (multiple italic lines, each its
  // own paragraph) followed by a blockquote-list-item attribution like
  // `> *   _Source Title_`. The gdoc renders these as one visual quote
  // block; markdown should do the same.
  const input = [
    'Substantive prose above the quote that easily exceeds the fifty-character substantive threshold.',
    '',
    '_Oh, I knew a Doctor Gluck,_',
    '',
    '_And his nose it had a hook,_',
    '',
    '_And his attitudes were anything but Aryan;_',
    '',
    '> *   _The Logical Vegetarian_',
    '',
    'Substantive prose below the quote that also exceeds the substantive threshold for context.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  // Every italic poem line must be inside the blockquote.
  assert.ok(/^> _Oh, I knew a Doctor Gluck,_/m.test(out), `first line should be in blockquote; got: ${out}`);
  assert.ok(/^> _And his nose it had a hook,_/m.test(out), `second line should be in blockquote; got: ${out}`);
  assert.ok(/^> _And his attitudes were/m.test(out), `third line should be in blockquote; got: ${out}`);
  // Attribution remains in the blockquote.
  assert.ok(/^>\s*\*\s+_The Logical Vegetarian_/m.test(out), `attribution stays in blockquote; got: ${out}`);
});

test('cleanupMarkdown formats a poetry quote (short italic lines) with line breaks, not paragraph breaks', () => {
  // Real example from the Doctor Gluck quote: every line is short
  // (under ~80 plain-text chars). Should render as one verse paragraph
  // inside a blockquote with hard line breaks, not as separate
  // paragraphs with visible gaps between them.
  const input = [
    'Substantive prose above the quote that comfortably exceeds the fifty-character substantive threshold.',
    '',
    '_Oh, I knew a Doctor Gluck,_',
    '',
    '_And his nose it had a hook,_',
    '',
    '_And his attitudes were anything but Aryan;_',
    '',
    '_So I gave him all the pork_',
    '',
    '_That I had, upon a fork;_',
    '',
    '_Because I am myself a Vegetarian._',
    '',
    '> *   _The Logical Vegetarian_',
    '',
    'Substantive prose below the quote that also exceeds the substantive threshold easily.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  // Each non-last italic line should end with two trailing spaces (hard
  // line break in markdown).
  assert.ok(/^> _Oh, I knew a Doctor Gluck,_  $/m.test(out), `first verse line should end with two spaces; got: ${out}`);
  assert.ok(/^> _That I had, upon a fork;_  $/m.test(out), `penultimate line should end with two spaces; got: ${out}`);
  // The last italic line should NOT have trailing spaces.
  assert.ok(/^> _Because I am myself a Vegetarian\._$/m.test(out), `last verse line should not have trailing spaces; got: ${out}`);
  // No blank `>` separator lines between verse lines (the slice ends
  // at the last verse line, *before* the blank-`>` separator that
  // precedes the attribution).
  const verseRegion = out.slice(
    out.indexOf('Doctor Gluck'),
    out.indexOf('Because I am myself a Vegetarian._') + 'Because I am myself a Vegetarian._'.length
  );
  assert.ok(!/^>\s*$/m.test(verseRegion), `no blank-> lines should appear between verse lines; got: ${verseRegion}`);
});

test('cleanupMarkdown compacts a multi-paragraph blockquote of short lines (poetry without italic)', () => {
  // Real example pattern: a blockquote of poem/lyric lines (no italic
  // styling required) rendered with paragraph breaks between every
  // line. Should collapse to one verse paragraph with hard line breaks.
  const input = [
    'Body context paragraph that easily exceeds fifty characters of normal prose.',
    '',
    '> Things fall apart; the centre cannot hold;',
    '>',
    '> Mere anarchy is loosed upon the world,',
    '>',
    '> The blood-dimmed tide is loosed, and everywhere',
    '>',
    '> The ceremony of innocence is drowned;',
    '',
    'Another substantive prose paragraph below the quote that exceeds the substantive threshold easily.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(/^> Things fall apart; the centre cannot hold;  $/m.test(out), `verse line 1 should have trailing 2 spaces; got: ${out}`);
  assert.ok(/^> Mere anarchy is loosed upon the world,  $/m.test(out), `verse line 2 should have trailing 2 spaces; got: ${out}`);
  assert.ok(/^> The blood-dimmed tide is loosed, and everywhere  $/m.test(out), `verse line 3 should have trailing 2 spaces; got: ${out}`);
  assert.ok(/^> The ceremony of innocence is drowned;$/m.test(out), `last verse line should NOT have trailing 2 spaces; got: ${out}`);
  // No blank-`>` separator should remain between verse lines.
  const verseRegion = out.slice(out.indexOf('Things fall apart'), out.indexOf('innocence is drowned;') + 25);
  assert.ok(!/^>\s*$/m.test(verseRegion), `no blank-> between verse lines; got: ${verseRegion}`);
});

test('cleanupMarkdown does NOT compact a blockquote with one long paragraph mixed in', () => {
  // If even one paragraph is prose-length, keep paragraph style for
  // the whole blockquote — mixing line-break + paragraph styles inside
  // one blockquote is jarring.
  const input = [
    'Body context paragraph that easily exceeds fifty characters of normal prose.',
    '',
    '> Short line one',
    '>',
    '> A much longer prose paragraph that comfortably exceeds the eighty-character poetry threshold and is clearly explanatory prose, not verse.',
    '>',
    '> Short line three',
    '',
    'Another body paragraph below the blockquote.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(!/^> Short line one  $/m.test(out), `should NOT add trailing-2-space when a long line is present; got: ${out}`);
});

test('cleanupMarkdown preserves a blockquote-list-item attribution alongside compacted verse', () => {
  // The current italic-quote+attribution wrap path emits attribution
  // as a `> *` list item inside the same blockquote. The poetry
  // compaction must NOT touch the list item.
  const input = [
    'Body context paragraph that easily exceeds fifty characters of normal prose.',
    '',
    '_Short verse one_',
    '',
    '_Short verse two_',
    '',
    '_Short verse three_',
    '',
    '> *   _Source Title_',
    '',
    'Body context below the quote that exceeds the substantive threshold easily.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  // Verse lines compacted.
  assert.ok(/^> _Short verse one_  $/m.test(out), `verse 1 compacted; got: ${out}`);
  assert.ok(/^> _Short verse two_  $/m.test(out), `verse 2 compacted; got: ${out}`);
  // Last verse line should NOT have trailing two spaces (it sits
  // before the attribution and a blank-> separates them).
  assert.ok(/^> _Short verse three_$/m.test(out), `last verse keeps no trailing space; got: ${out}`);
  // Attribution list item preserved.
  assert.ok(/^>\s*\*\s+_Source Title_$/m.test(out), `attribution stays as list item; got: ${out}`);
});

test('cleanupMarkdown formats a prose quote (long italic lines) with paragraph breaks', () => {
  // When italic lines are longer (clearly prose, not verse), each
  // should be its own paragraph inside the blockquote so the
  // paragraph structure renders correctly.
  const input = [
    'Substantive prose above the quote that comfortably exceeds the fifty-character substantive threshold.',
    '',
    '_This is a long prose quote that comfortably exceeds the eighty-character poetry threshold and is clearly a paragraph._',
    '',
    '_This is a second long prose paragraph that also exceeds the threshold and should render as its own paragraph in the blockquote._',
    '',
    '> *   _Some Source Title_',
    '',
    'Substantive prose below the quote that also exceeds the substantive threshold easily.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  // Lines should NOT end with two trailing spaces (no hard breaks).
  assert.ok(!/comfortably exceeds the eighty-character poetry threshold and is clearly a paragraph\._  $/m.test(out), `prose line should not have trailing-2-space; got: ${out}`);
  // The lines should still be wrapped with `>`.
  assert.ok(/^> _This is a long prose/m.test(out), `prose line should still be wrapped; got: ${out}`);
});

test('cleanupMarkdown does NOT wrap italic-label followed by a multi-bullet list', () => {
  // Real example from "The Extended Mind": the italic line is a
  // section label and the `> *` block below is a list of example
  // bullets, not a single attribution. Wrapping them as a single quote
  // would be wrong — the bullets are substantive content, not a
  // citation.
  const input = [
    'Substantive prose above the section label that exceeds the substantive threshold easily.',
    '',
    '_From "Thinking with Our Bodies"…_',
    '',
    '> *   In an experiment requiring subjects to flip cards, people’s skin conductance began to spike when they contemplated the bad decks.',
    '> *   Radiologists improved from 85% to 99% diagnostic accuracy when walking on a treadmill.',
    '> *   Doodling improved retention on a boring listening task by 29%.',
    '',
    'Substantive prose below the list that also exceeds the substantive threshold easily.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  // The italic label should NOT have been wrapped in `>`.
  assert.ok(out.includes('_From "Thinking with Our Bodies"…_\n'), `italic label should stay unwrapped; got: ${out}`);
  assert.ok(!/^> _From .Thinking/m.test(out), `italic label should NOT be prefixed with >; got: ${out}`);
});

test('cleanupMarkdown does NOT wrap standalone italic paragraphs without an attribution', () => {
  // An isolated italic paragraph (with no attribution line following)
  // is just an italic-emphasis paragraph. Don't wrap it in a blockquote.
  const input = 'Substantive prose above that comfortably exceeds fifty characters of normal prose.\n\n_An isolated italic sentence._\n\nSubstantive prose below that also exceeds the substantive threshold easily.';
  const out = cleanupMarkdown(input);
  assert.ok(!/^> /m.test(out), `no blockquote should be created; got: ${out}`);
});

test('cleanupMarkdown does NOT promote a bold attribution line immediately following an italic-only quote', () => {
  // Some authors attribute quotes with bold name only (no em-dash).
  // The italic-only line right above is the giveaway that the bold
  // line is an attribution, not a section heading.
  const input = [
    'Substantive prose above the quote that comfortably exceeds the fifty-character substantive threshold.',
    '',
    '_In hell I created, I pray tonight_',
    '',
    '**Lil Ugly Mane**',
    '',
    'Substantive prose below the attribution that also comfortably exceeds the substantive threshold.',
  ].join('\n');

  const out = cleanupMarkdown(input);

  assert.ok(out.includes('**Lil Ugly Mane**'), `attribution should stay bold; got: ${out}`);
  assert.ok(!/^## Lil Ugly Mane/m.test(out), `attribution should NOT be promoted; got: ${out}`);
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

test('cleanupMarkdown does NOT dedent 4-space-indented `#`-prefixed lines (Python code comments)', () => {
  // Real example from "Python Data Science Handbook": the reviewer's
  // gdoc has Python code as a run of `<p>` paragraphs with `&nbsp;`-
  // indented inline-comment lines. After nbsp→space normalization,
  // those comments look like `    # get wins for this series of bets`.
  // If we dedent the leading spaces, the H1 splitter sees `# get wins...`
  // at column 0 and creates a spurious new review with that "title",
  // truncating the parent review's body.
  const input = [
    'for cur_round in range(1, NUM_ROUNDS+1):',
    '',
    '    # get wins for this series of bets',
    '',
    '    wins = (np.random.randint(0, 100, size=NUM_BETS) < WIN_PERCENT).astype(int)',
  ].join('\n');

  const out = cleanupMarkdown(input);

  // The `#` comment must keep its 4-space indent (so the H1 splitter
  // does not see it as a new review boundary).
  assert.ok(out.includes('    # get wins for this series of bets'),
    `indented code-comment with # must stay indented; got: ${out}`);
  assert.ok(!/^# get wins/m.test(out),
    `# comment must NOT be at column 0; got: ${out}`);
});

test('convertGDocToMarkdown DOES blockquote a real quote paragraph that contains a footnote-REFERENCE anchor', async () => {
  // Real example from "The Red and the Black" (2021): the reviewer has
  // a book quote ending with a footnote reference like
  // \`...French people. <a id="ftnt_ref25" href="#ftnt25">[25]</a>\`.
  // The reference-anchor (\`id="ftnt_refN"\`) must NOT trigger the
  // footnote-def skip — that's reserved for the destination anchor
  // (\`id="ftntN"\`).
  const html = `<html><head><style>.c0{margin-left:36pt}</style></head><body>` +
    `<p><span>Body paragraph for context.</span></p>` +
    `<p class="c0"><span>‘The French, Napoleon remarked, ‘are indifferent to liberty.’ </span><a id="ftnt_ref25" href="#ftnt25"><span>[25]</span></a></p>` +
    `</body></html>`;

  const { convertGDocToMarkdown } = await import('./gdoc-html.ts');
  const out = convertGDocToMarkdown(html);

  // The book quote (a body paragraph linking TO a footnote) must be in
  // a blockquote — the ftnt_ref anchor is a reference, not a definition.
  assert.ok(/^> ‘The French/m.test(out),
    `body paragraph with ftnt_ref link must be blockquoted; got: ${out}`);
});

test('convertGDocToMarkdown does NOT blockquote footnote-definition paragraphs even when they have a blockquote-eligible indent class', async () => {
  // Real example from "Win Bigly" (2024): the gdoc author's hand-formatted
  // footnotes at the end of the review use the same text-indent:36pt class
  // (c119) the pipeline treats as a blockquote signal on short paragraphs.
  // Footnotes shouldn't render as blockquotes — they're reviewer commentary,
  // not external quotations. Detect them via the \`<a id="ftntN">\` anchor
  // that gdoc footnote-definition paragraphs always carry.
  const html = `<html><head><style>.c0{text-indent:36pt}</style></head><body>` +
    `<p><span>Body paragraph with substantive content for context.</span></p>` +
    `<p class="c0"><a id="ftnt73">[73]</a><span> A short footnote about French philosophy.</span></p>` +
    `<p class="c0"><a id="ftnt74">[74]</a><span> Another short footnote about Brahmin society.</span></p>` +
    `<p class="c0"><a id="ftnt75">[75]</a><span> Joke; embittered by economics.</span></p>` +
    `</body></html>`;

  const { convertGDocToMarkdown } = await import('./gdoc-html.ts');
  const out = convertGDocToMarkdown(html);

  // None of the footnote-definition paragraphs should be blockquoted.
  assert.ok(!/^> \[\[73\]\]/m.test(out),
    `footnote [73] must NOT be blockquoted; got: ${out}`);
  assert.ok(!/^> \[\[74\]\]/m.test(out),
    `footnote [74] must NOT be blockquoted; got: ${out}`);
});

test('convertGDocToMarkdown blockquotes a text-indent paragraph ONLY when it is also italic', async () => {
  // Empirically across the corpus, every italic+text-indent paragraph is
  // a quote (book excerpts, Latin sentences, novel dialogue, song lyrics,
  // attributions). Reviewer-prose paragraphs that the older heuristic
  // mistakenly wrapped (the-righteous-mind, at-the-existentialist-caf,
  // bronze-age-mindset, win-bigly footnotes, etc.) are NEVER italic.
  //
  // So the per-paragraph rule for text-indent-only is: blockquote iff
  // every substantive span carries an italic class.
  const html = `<html><head><style>.c0{text-indent:36pt}.ci{font-style:italic}</style></head><body>` +
    `<p><span>Body paragraph for context with substantive content.</span></p>` +
    `<p class="c0"><span class="ci">He lacks the self-confidence or the energy for it.</span></p>` +
    `<p class="c0"><span>A reviewer-prose paragraph with text-indent but NOT italic.</span></p>` +
    `</body></html>`;

  const { convertGDocToMarkdown } = await import('./gdoc-html.ts');
  const out = convertGDocToMarkdown(html);

  // Italic + text-indent → blockquote.
  assert.ok(/^> _He lacks the self-confidence/m.test(out),
    `italic + text-indent paragraph must be blockquoted; got: ${out}`);
  // Non-italic + text-indent → NOT blockquote (it's typographic styling).
  assert.ok(!/^> A reviewer-prose/m.test(out),
    `non-italic text-indent paragraph must NOT be blockquoted; got: ${out}`);
});

test('convertGDocToMarkdown wraps a paragraph indented via a SPLIT-class combination (margin-left in one class, margin-right in another)', async () => {
  // Real example from "Disunited Nations" (2021): a quoted block had
  // `<p class="c97 c32 c117">` where c97 carried only `margin-right:33.1pt`
  // and c117 carried only `margin-left:21.3pt`. Neither class alone met
  // the 36pt or "both-sides" threshold, so the old detector marked
  // neither as an indent class and the multi-paragraph book quote got
  // un-quoted. Detector must sum margins across all classes on the element.
  const html = `<html><head><style>.c0{font-weight:400}.c97{margin-right:33.1pt}.c117{margin-left:21.3pt}</style></head><body>` +
    `<p><span class="c0">Body paragraph with plenty of substantive content before the quote starts here.</span></p>` +
    `<p class="c97 c117"><span class="c0">First quoted paragraph with enough content to be unambiguously a real prose quote and not a verse line.</span></p>` +
    `<p class="c97 c117"><span class="c0">Second quoted paragraph also with comfortably substantive prose content stretching well past fifty chars.</span></p>` +
    `<p><span class="c0">Body paragraph after the quote with similarly substantive content for completeness.</span></p>` +
    `</body></html>`;

  const { convertGDocToMarkdown } = await import('./gdoc-html.ts');
  const out = convertGDocToMarkdown(html);

  // Both quoted paragraphs must end up in a blockquote.
  assert.ok(/^> First quoted paragraph/m.test(out),
    `first quoted paragraph must be in a blockquote; got: ${out}`);
  assert.ok(/^> Second quoted paragraph/m.test(out),
    `second quoted paragraph must be in a blockquote; got: ${out}`);
  // Body paragraphs must NOT be quoted.
  assert.ok(!/^> Body paragraph/m.test(out),
    `body paragraphs must not be quoted; got: ${out}`);
});

test('convertGDocToMarkdown wraps a multi-paragraph indented passage in a blockquote even when most paragraphs in the chunk are inside the quote', async () => {
  // Real example from "Scientific Freedom": a single review chunk where ~53%
  // of the <p>s carry the margin-left:36pt class because of a multi-paragraph
  // book quote (Don Braben's Planck Club passage). The old 50% body-default
  // gate stripped c14 from indentClasses for that chunk and the entire quote
  // came out un-quoted.
  const indentedPs = Array.from({ length: 6 }).map(() =>
    `<p class="c0 c14"><span class="c0">This indented quote paragraph contains enough substantive prose to comfortably qualify as part of a real blockquote passage, well past the fifty-character threshold.</span></p>`,
  ).join('');
  const bodyPs = Array.from({ length: 5 }).map(() =>
    `<p class="c0"><span class="c0">This body paragraph also contains substantive prose with plenty of words to clear the substantive-content gate used elsewhere in cleanupMarkdown.</span></p>`,
  ).join('');
  const html = `<html><head><style>.c0{font-weight:400}.c14{margin-left:36pt}</style></head><body>${bodyPs}${indentedPs}</body></html>`;

  const { convertGDocToMarkdown } = await import('./gdoc-html.ts');
  const out = convertGDocToMarkdown(html);

  // Every indented paragraph must end up in a blockquote.
  const indentedCount = (out.match(/^> This indented quote paragraph/gm) || []).length;
  assert.equal(indentedCount, 6, `expected 6 blockquoted lines; got ${indentedCount}: ${out}`);
  // Body paragraphs must NOT be in a blockquote.
  assert.ok(!/^> This body paragraph/m.test(out),
    `body paragraphs must not be quoted; got: ${out}`);
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
