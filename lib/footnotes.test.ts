import { test } from 'node:test';
import assert from 'node:assert/strict';
import { extractFootnotes } from './footnotes';

test('markdown with no footnotes returns unchanged body and empty list', () => {
  const input = 'Just a plain paragraph.\n\nAnother paragraph.';
  const result = extractFootnotes(input);
  assert.equal(result.body, input);
  assert.deepEqual(result.footnotes, []);
});

test('sdfootnote: single footnote is extracted and replaced', () => {
  const input = [
    'Some body text.[1](#sdfootnote1sym) More text.',
    '',
    '[1](#sdfootnote1anc)https://example.com/source',
    '',
  ].join('\n');

  const result = extractFootnotes(input);

  assert.ok(
    result.body.includes('<sup class="fn-ref" data-fn-id="1" id="fn-ref-1">[1]</sup>'),
    'body should contain the marker'
  );
  assert.ok(
    !result.body.includes('#sdfootnote1sym'),
    'body should no longer contain the original ref link'
  );
  assert.ok(
    !result.body.includes('#sdfootnote1anc'),
    'body should no longer contain the definition line'
  );
  assert.deepEqual(result.footnotes, [
    { id: '1', raw: 'https://example.com/source' },
  ]);
});

test('sdfootnote: multi-line footnote content is captured', () => {
  const input = [
    'Intro.[1](#sdfootnote1sym) More.',
    '',
    '[1](#sdfootnote1anc) Footnote para one.',
    '',
    'Footnote para two still belonging to #1.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 1);
  assert.equal(result.footnotes[0].id, '1');
  assert.ok(result.footnotes[0].raw.includes('Footnote para one.'));
  assert.ok(result.footnotes[0].raw.includes('Footnote para two'));
});

test('sdfootnote: two footnotes are numbered and ordered', () => {
  const input = [
    'A[1](#sdfootnote1sym) and B[2](#sdfootnote2sym).',
    '',
    '[1](#sdfootnote1anc)First note',
    '',
    '[2](#sdfootnote2anc)Second note',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 2);
  assert.deepEqual(result.footnotes.map(f => f.id), ['1', '2']);
  assert.equal(result.footnotes[0].raw, 'First note');
  assert.equal(result.footnotes[1].raw, 'Second note');
});

test('ftnt: single footnote is extracted and replaced', () => {
  const input = [
    'Some body[[1]](#ftnt1) text.',
    '',
    '[[1]](#ftntref1) Footnote content here.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);

  assert.ok(
    result.body.includes('<sup class="fn-ref" data-fn-id="1" id="fn-ref-1">[1]</sup>'),
    'body should contain the marker'
  );
  assert.ok(!result.body.includes('#ftnt1'), 'no original ref link');
  assert.ok(!result.body.includes('#ftntref1'), 'no original def line');
  assert.deepEqual(result.footnotes, [
    { id: '1', raw: 'Footnote content here.' },
  ]);
});

test('ftnt: multiple footnotes ordered by reference position', () => {
  const input = [
    'A[[1]](#ftnt1) then B[[2]](#ftnt2).',
    '',
    '[[1]](#ftntref1) Note one.',
    '',
    '[[2]](#ftntref2) Note two.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.deepEqual(result.footnotes.map(f => f.id), ['1', '2']);
  assert.equal(result.footnotes[0].raw, 'Note one.');
  assert.equal(result.footnotes[1].raw, 'Note two.');
});

test('fn: extracts from ## Footnotes ordered list with fnref back-links', () => {
  const input = [
    'Some text.[1](https://example.com/p/x#fn:alpha) More.[2](https://example.com/p/x#fn:beta) End.',
    '',
    '## Footnotes',
    '',
    '1.  First note. [↩](https://example.com/p/x#fnref:alpha)',
    '',
    '2.  Second note. [↩](https://example.com/p/x#fnref:beta)',
    '',
  ].join('\n');

  const result = extractFootnotes(input);

  assert.ok(
    result.body.includes('<sup class="fn-ref" data-fn-id="1" id="fn-ref-1">[1]</sup>'),
    'body has marker 1'
  );
  assert.ok(
    result.body.includes('<sup class="fn-ref" data-fn-id="2" id="fn-ref-2">[2]</sup>'),
    'body has marker 2'
  );
  assert.ok(!result.body.includes('## Footnotes'), 'Footnotes heading removed');
  assert.ok(!result.body.includes('#fnref:alpha'), 'back-link removed');
  assert.deepEqual(result.footnotes.map(f => f.id), ['1', '2']);
  assert.ok(result.footnotes[0].raw.includes('First note.'));
  assert.ok(!result.footnotes[0].raw.includes('↩'));
  assert.ok(result.footnotes[1].raw.includes('Second note.'));
});

test('plain: trailing [N] content lines are extracted as footnotes', () => {
  const input = [
    'Body text referring to [1] and [2].',
    '',
    'More prose.',
    '',
    '[1] First footnote.',
    '[2] Second footnote.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.ok(
    result.body.includes('<sup class="fn-ref" data-fn-id="1" id="fn-ref-1">[1]</sup>'),
    'marker 1'
  );
  assert.ok(
    result.body.includes('<sup class="fn-ref" data-fn-id="2" id="fn-ref-2">[2]</sup>'),
    'marker 2'
  );
  assert.ok(!result.body.includes('[1] First footnote.'), 'def removed from body');
  assert.deepEqual(result.footnotes, [
    { id: '1', raw: 'First footnote.' },
    { id: '2', raw: 'Second footnote.' },
  ]);
});

test('plain: inline [N] without a matching trailing def is left untouched', () => {
  const input = 'See paragraph [1] of the contract.';
  const result = extractFootnotes(input);
  assert.equal(result.body, input);
  assert.deepEqual(result.footnotes, []);
});

test('plain: detects bracketed defs even when the last def is multi-paragraph (Agatha-style)', () => {
  // Real example: the last footnote in the file is a multi-paragraph
  // def whose final paragraph is an indented blockquote. The walk-back
  // for detectFormat used to look only at the last non-separator line,
  // see the blockquote line `> "..."`, and conclude "no plain
  // footnotes here." Should now correctly classify as plain.
  const input = [
    'Body referring to [1] and [2].',
    '',
    '## Footnotes',
    '',
    '[1] Single-line footnote.',
    '',
    '[2] First paragraph of the multi-paragraph footnote.',
    '',
    '> Indented blockquote line that ends the file.',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 2);
  assert.ok(result.footnotes[1].raw.includes('blockquote line'), `fn 2 should include the blockquote; got: ${result.footnotes[1].raw}`);
});

test('plain: handles "N. content" numbered-list footnote-def lines (Application-for-Release-style)', () => {
  // Footnote defs styled as a markdown ordered list under a Footnotes
  // heading. Body refs are bracketed `[N]`.
  const input = [
    'Body text with a ref[1] and another[2].',
    '',
    '# Footnotes',
    '',
    '1. First footnote content.',
    '2. Second footnote content here.',
    '3. Third footnote, mentioned only here.',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 3,
    `expected 3 footnotes; got ${r.footnotes.length}: ${JSON.stringify(r.footnotes.map(f => f.id))}`);
  assert.deepEqual(r.footnotes.map(f => f.id), ['1', '2', '3']);
  assert.ok(r.body.includes('data-fn-id="1"'), `body should have fn-1 ref; got: ${r.body}`);
  assert.ok(r.body.includes('data-fn-id="2"'), `body should have fn-2 ref; got: ${r.body}`);
});

test('plain: handles "(N) content" parenthesized footnote-def lines (Meeting-Hardly-Meeting-style)', () => {
  // Footnote defs at the bottom are `(N) content` lines; body refs are
  // also `(N)` parenthesized numbers. Rewrite both ends only when the
  // ID has a matching def, so stray parenthesized prose numerals don't
  // trip the detector.
  const input = [
    'Body text with a ref (1) and another (2).',
    '',
    'Another paragraph (3).',
    '',
    '(1) First footnote content.',
    '',
    '(2) Second footnote content here.',
    '',
    '(3) Third footnote content here.',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 3,
    `expected 3 footnotes; got ${r.footnotes.length}: ${JSON.stringify(r.footnotes.map(f => f.id))}`);
  assert.deepEqual(r.footnotes.map(f => f.id), ['1', '2', '3']);
  assert.ok(r.footnotes[0].raw.includes('First footnote content'), `fn1 content; got: ${r.footnotes[0].raw}`);
  assert.ok(r.body.includes('data-fn-id="1"'), `body should have fn-1 ref; got: ${r.body}`);
  assert.ok(r.body.includes('data-fn-id="2"'), `body should have fn-2 ref; got: ${r.body}`);
  assert.ok(r.body.includes('data-fn-id="3"'), `body should have fn-3 ref; got: ${r.body}`);
});

test('plain: handles bare-number + space + content footnote-def lines (Mother-of-Learning-style)', () => {
  // Real example: footnote defs are `N content` on a single line — bare
  // digit, space, then the footnote text. Inline refs in the body are
  // also bare digits adjacent to a sentence-ending character.
  const input = [
    'Body text ending in a citation.1  Continues with more text.2',
    '',
    'Another paragraph with a ref.3',
    '',
    '## Footnotes',
    '',
    '1 First footnote content.',
    '',
    '2 Second footnote content here.',
    '',
    '3 Third footnote content here.',
  ].join('\n');

  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 3,
    `expected 3 footnotes; got ${r.footnotes.length}: ${JSON.stringify(r.footnotes.map(f => f.id))}`);
  assert.deepEqual(r.footnotes.map(f => f.id), ['1', '2', '3']);
  assert.ok(r.footnotes[0].raw.includes('First footnote content'), `fn1 content; got: ${r.footnotes[0].raw}`);
  // Body refs should be rewritten to <sup>.
  assert.ok(r.body.includes('data-fn-id="1"'), `body should have fn-1 ref; got: ${r.body}`);
  assert.ok(r.body.includes('data-fn-id="2"'), `body should have fn-2 ref; got: ${r.body}`);
  assert.ok(r.body.includes('data-fn-id="3"'), `body should have fn-3 ref; got: ${r.body}`);
});

test('plain: handles bare-number footnote-def lines (Nick-Chater-style)', () => {
  // Real example from "The Mind is Flat": the author put each footnote
  // number on its own line, followed by content paragraphs, instead of
  // using the `[N] content` bracketed form.
  const input = [
    'Body referring to[1] something[2].',
    '',
    '## Footnotes',
    '',
    '1',
    '',
    'First content paragraph of footnote one.',
    '',
    'Second content paragraph still in footnote one.',
    '',
    '2',
    '',
    'Content of footnote two.',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 2, `expected 2 footnotes; got ${result.footnotes.length}: ${JSON.stringify(result.footnotes.map(f => f.id))}`);
  assert.deepEqual(result.footnotes.map(f => f.id), ['1', '2']);
  assert.ok(result.footnotes[0].raw.includes('First content paragraph'), `fn1 first para; got: ${result.footnotes[0].raw}`);
  assert.ok(result.footnotes[0].raw.includes('Second content paragraph'), `fn1 second para; got: ${result.footnotes[0].raw}`);
  assert.ok(result.footnotes[1].raw.includes('Content of footnote two'), `fn2; got: ${result.footnotes[1].raw}`);
});

test('plain: collects multi-paragraph footnote definitions', () => {
  // Real example pattern from "A Christmas Carol": one footnote has
  // several paragraphs separated by blank lines. The old walk-back
  // stopped at the first non-def line, so any defs *above* the
  // multi-paragraph one were lost from the footnotes section and
  // their body refs stopped resolving.
  const input = [
    'Body referring to [1], [2], and [3].',
    '',
    '## Footnotes',
    '',
    '[1] First footnote, single line.',
    '',
    '[2] Second footnote, opens with one paragraph.',
    '',
    'Continues with a second paragraph still belonging to footnote 2.',
    '',
    'And a third paragraph also still inside footnote 2.',
    '',
    '[3] Third footnote, back to single line.',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 3, `expected 3 footnotes; got ${result.footnotes.length}: ${JSON.stringify(result.footnotes.map(f => f.id))}`);
  assert.deepEqual(result.footnotes.map(f => f.id), ['1', '2', '3']);
  // The multi-paragraph footnote 2 should include all three paragraphs.
  const fn2 = result.footnotes.find(f => f.id === '2')!;
  assert.ok(fn2.raw.includes('Second footnote'), `fn2 starts with first paragraph; got: ${fn2.raw}`);
  assert.ok(fn2.raw.includes('Continues with a second'), `fn2 includes second paragraph; got: ${fn2.raw}`);
  assert.ok(fn2.raw.includes('And a third paragraph'), `fn2 includes third paragraph; got: ${fn2.raw}`);
  // Body refs [1], [2], [3] should all be rewritten to <sup> markers.
  assert.ok(result.body.includes('data-fn-id="1"'), `body should have ref to 1; got: ${result.body}`);
  assert.ok(result.body.includes('data-fn-id="2"'), `body should have ref to 2; got: ${result.body}`);
  assert.ok(result.body.includes('data-fn-id="3"'), `body should have ref to 3; got: ${result.body}`);
});

test('plain: strips a "Footnotes" heading immediately preceding the def block', () => {
  // The author included their own "Footnotes" subheading. The render layer
  // already adds a <h2>Footnotes</h2>, so leaving the heading in the body
  // produces a duplicate.
  const input = [
    'Body referring to [1].',
    '',
    '### Footnotes',
    '',
    '[1] First footnote.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.ok(!/Footnotes/.test(result.body), `body should not contain the Footnotes heading; got: ${result.body}`);
  assert.equal(result.footnotes.length, 1);
});

test('plain: strips a "## FOOTNOTES" heading (uppercase)', () => {
  // Real example from "The Mind is Flat".
  const input = [
    'Body paragraph mentioning footnote 1.',
    '',
    '## FOOTNOTES',
    '',
    '[1] Footnote one content.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.ok(!/FOOTNOTES/i.test(result.body), `uppercase FOOTNOTES heading should be stripped; got: ${result.body}`);
  assert.equal(result.footnotes.length, 1);
});

test('plain: strips a "## Footnotes:" heading (trailing colon)', () => {
  const input = [
    'Body paragraph mentioning footnote 1.',
    '',
    '## Footnotes:',
    '',
    '[1] Footnote one content.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.ok(!/Footnotes:/i.test(result.body), `Footnotes: heading should be stripped; got: ${result.body}`);
});

test('plain: strips an H2 "Footnotes" heading too', () => {
  const input = [
    'Body referring to [1].',
    '',
    '## Footnotes',
    '',
    '[1] First footnote.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.ok(!/^##\s+Footnotes/m.test(result.body), `body should not contain the H2 Footnotes heading; got: ${result.body}`);
});

test('plain: does NOT strip a "Footnotes" heading that is not immediately before defs', () => {
  // If there's prose between the heading and the defs, leave the heading
  // alone — it's referring to something else.
  const input = [
    '### Footnotes are an interesting feature of academic writing.',
    '',
    'They let an author add commentary without breaking the main argument.',
    '',
    '[1] First footnote.',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  // The original heading should still be there because it's not adjacent
  // to the def block.
  assert.ok(result.body.includes('Footnotes are an interesting feature'), `unrelated heading should be preserved; got: ${result.body}`);
});

test('code blocks containing [1] are not processed', () => {
  const input = [
    'Normal text.[1](#sdfootnote1sym) More.',
    '',
    '```',
    'const x = arr[1]; // looks like a footnote but is not',
    '```',
    '',
    '[1](#sdfootnote1anc)Real footnote',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.ok(result.body.includes('const x = arr[1]'), 'code block untouched');
  assert.ok(
    result.body.includes('<sup class="fn-ref"'),
    'real ref still rewritten'
  );
  assert.equal(result.footnotes.length, 1);
});

test('duplicate sdfootnote refs: only first gets id attribute', () => {
  const input = [
    'First[1](#sdfootnote1sym) and again[1](#sdfootnote1sym).',
    '',
    '[1](#sdfootnote1anc) Note',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  const firstIdx = result.body.indexOf('id="fn-ref-1"');
  const lastIdx = result.body.lastIndexOf('id="fn-ref-1"');
  assert.notEqual(firstIdx, -1, 'has id on first');
  assert.equal(firstIdx, lastIdx, 'only one id attribute');
  const markerCount = (result.body.match(/<sup class="fn-ref"/g) || []).length;
  assert.equal(markerCount, 2);
});

test('sdfootnote ref without matching def is left alone', () => {
  const input = 'Orphan[1](#sdfootnote1sym) ref with no def at end.\n';
  const result = extractFootnotes(input);
  assert.ok(result.body.includes('[1](#sdfootnote1sym)'), 'ref preserved verbatim');
  assert.deepEqual(result.footnotes, []);
});

test('sdfootnote def without matching ref is still listed', () => {
  const input = [
    'Body with no refs.',
    '',
    '[1](#sdfootnote1anc) Orphan footnote content',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 1);
  assert.equal(result.footnotes[0].id, '1');
});

test('plain: skips trailing horizontal rule separators like * * *', () => {
  const input = [
    'Body text referring to [1].',
    '',
    '[1] First footnote.',
    '',
    '* * *',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 1);
  assert.equal(result.footnotes[0].id, '1');
  assert.equal(result.footnotes[0].raw, 'First footnote.');
});

test('plain: multiple defs separated by blank lines are all extracted', () => {
  const input = [
    'Body refers to [1], [2], and [3].',
    '',
    '[1] First footnote.',
    '',
    '[2] Second footnote.',
    '',
    '[3] Third footnote.',
    '',
    '* * *',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 3);
  assert.deepEqual(result.footnotes.map(f => f.id), ['1', '2', '3']);
});

test('fn: works without ## Footnotes heading when trailing list has fnref back-links', () => {
  const input = [
    'Body.[1](https://ex.com/p#fn:a) More.[2](https://ex.com/p#fn:b)',
    '',
    '1.  First note. [↩](https://ex.com/p#fnref:a)',
    '2.  Second note. [↩](https://ex.com/p#fnref:b)',
    '',
  ].join('\n');

  const result = extractFootnotes(input);
  assert.equal(result.footnotes.length, 2);
  assert.deepEqual(result.footnotes.map(f => f.id), ['1', '2']);
  assert.ok(result.footnotes[0].raw.includes('First note'));
});

test('fn: multi-paragraph footnote dedents continuation lines (not a code block)', () => {
  const input = [
    'Body.[2](https://ex.com/p#fn:foo)',
    '',
    '## Footnotes',
    '',
    '2.  First paragraph.',
    '    ',
    '    Second paragraph should not be a code block.  [↩](https://ex.com/p#fnref:foo)',
    '',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 1);
  // Raw must NOT start continuation paragraph with 4 spaces (would be parsed as code).
  assert.ok(
    !/\n {4}/.test(r.footnotes[0].raw),
    'continuation should be dedented, got: ' + JSON.stringify(r.footnotes[0].raw)
  );
  assert.ok(r.footnotes[0].raw.includes('Second paragraph'));
});

test('plain: bare-digit refs after sentence punctuation are rewritten', () => {
  const input = [
    'First sentence.1 Second sentence?2 Third.3',
    '',
    '[1] First note.',
    '[2] Second note.',
    '[3] Third note.',
    '',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 3);
  assert.ok(r.body.includes('<sup class="fn-ref" data-fn-id="1" id="fn-ref-1">[1]</sup>'));
  assert.ok(r.body.includes('<sup class="fn-ref" data-fn-id="2" id="fn-ref-2">[2]</sup>'));
  assert.ok(r.body.includes('<sup class="fn-ref" data-fn-id="3" id="fn-ref-3">[3]</sup>'));
});

test('plain: bare-digit fallback does NOT mangle numeric prose lacking matching def', () => {
  // Body has "in 2002" and "$3 million" etc. File has def [1] but bare "3" should not be touched.
  const input = [
    'Published in 2002, it cost $3 million.1',
    '',
    '[1] Some note.',
    '',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 1);
  // "2002" should NOT be rewritten (no def [2002])
  assert.ok(r.body.includes('2002'));
  // "$3" should NOT be rewritten (no def [3], and preceded by $ not close-punct)
  assert.ok(r.body.includes('$3'));
  // "1" at end should be rewritten
  assert.ok(r.body.includes('data-fn-id="1"'));
});

test('plain: bare-digit fallback catches mid-sentence refs (letter + digit)', () => {
  const input = [
    'Reading Metamorphosis1 was hard. A tragedy3, perhaps.',
    '',
    '[1] First note.',
    '[3] Third note.',
    '',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 2);
  assert.ok(r.body.includes('data-fn-id="1"'));
  assert.ok(r.body.includes('data-fn-id="3"'));
});

test('pandoc: extracts all defs even when an un-indented blockquote sits between them', () => {
  // Real example from "Brook Farm: The Dark Side of Utopia": footnote 6's
  // content includes a quoted blockquote that the author typed at column 0
  // (not indented under the footnote). The extractor must NOT stop scanning
  // for subsequent [^N]: defs just because it sees a column-0 non-def line
  // — that would drop footnotes 7 and 8 entirely.
  const input = [
    'Body text with refs [^1] and [^2] and [^3].',
    '',
    '[^1]: First footnote.',
    '',
    '[^2]: Second footnote, ends with: writes:',
    '',
    '> Quoted continuation typed at column 0 (not indented).',
    '',
    '[^3]: Third footnote that should still be extracted.',
    '',
  ].join('\n');

  const r = extractFootnotes(input);

  assert.equal(r.footnotes.length, 3,
    `expected 3 footnotes; got ${r.footnotes.length}: ${JSON.stringify(r.footnotes.map(f => f.id))}`);
  assert.deepEqual(r.footnotes.map(f => f.id), ['1', '2', '3']);
});

test('plain: bare-digit fallback skips version numbers like 2.0.1', () => {
  // File has def [1] but body contains `version 2.0.1`. The trailing "1" should
  // not be rewritten because it's part of a decimal.
  const input = [
    'Running on version 2.0.1 currently.',
    '',
    '[1] Some note.',
    '',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 1);
  // The "1" in "2.0.1" must remain as plain text.
  assert.ok(r.body.includes('version 2.0.1'));
  // No fn-ref markers should be added.
  assert.ok(!r.body.includes('data-fn-id'));
});

test('superscript: forced format extracts unicode-superscript footnotes', () => {
  // "The Son Also Rises" format: in-text refs are markdown links whose text
  // is a unicode superscript number (`[¹](#id.xxx)`), defs sit after a
  // `_ _ _` rule as `¹ content` lines. Only used when forced via the
  // per-slug exception — never auto-detected.
  const input = [
    'Claim one.[¹](#id.abc123) And claim ten.[¹⁰](#id.def456)',
    '',
    'More body text.',
    '',
    '_ _ _',
    '¹ First note.',
    '',
    'Continuation paragraph of note one.',
    '',
    'https://example.com/img',
    '',
    '¹⁰ Tenth note with a quote:',
    '',
    '> Quoted continuation typed at column 0.',
    '',
  ].join('\n');

  const r = extractFootnotes(input, { forceFormat: 'superscript' });

  assert.deepEqual(r.footnotes.map(f => f.id), ['1', '10']);
  assert.ok(
    r.body.includes('<sup class="fn-ref" data-fn-id="1" id="fn-ref-1">[1]</sup>'),
    'ref ¹ should become a numbered marker'
  );
  assert.ok(
    r.body.includes('<sup class="fn-ref" data-fn-id="10" id="fn-ref-10">[10]</sup>'),
    'ref ¹⁰ should become a two-digit marker'
  );
  assert.ok(!r.body.includes('#id.abc123'), 'gdoc anchor links should be gone');
  assert.ok(!r.body.includes('¹ First note'), 'defs should be removed from body');
  assert.ok(!/_ _ _\s*$/.test(r.body), 'trailing separator rule should be stripped from body');
  assert.ok(r.footnotes[0].raw.includes('First note.'));
  assert.ok(r.footnotes[0].raw.includes('Continuation paragraph'));
  assert.ok(r.footnotes[0].raw.includes('https://example.com/img'));
  assert.ok(r.footnotes[1].raw.includes('Quoted continuation'));
});

test('superscript: orphan refs without defs pass through unchanged', () => {
  const input = [
    'Squared.[²](#id.nodef) Body.',
    '',
    '_ _ _',
    '¹ Only note one exists.',
    '',
  ].join('\n');
  const r = extractFootnotes(input, { forceFormat: 'superscript' });
  assert.deepEqual(r.footnotes.map(f => f.id), ['1']);
  assert.ok(r.body.includes('[²](#id.nodef)'), 'orphan ref should be untouched');
});

test('superscript: format is never auto-detected', () => {
  const input = [
    'Claim.[¹](#id.abc) Text.',
    '',
    '_ _ _',
    '¹ A note.',
    '',
  ].join('\n');
  const r = extractFootnotes(input);
  assert.deepEqual(r.footnotes, []);
});

test('nested: plain-format footnote referencing another footnote gets a marker', () => {
  const input = [
    'Body prose with a ref.[5]',
    '',
    '[5] Of all the sources, this book is the most impressive. For the sake of brevity[6], ideas are presented without elaboration.',
    '',
    '[6] Relatively speaking.',
    '',
  ].join('\n');

  const r = extractFootnotes(input);
  assert.equal(r.footnotes.length, 2);
  const fn5 = r.footnotes.find(f => f.id === '5')!;
  const fn6 = r.footnotes.find(f => f.id === '6')!;
  // Nested ref rewritten; carries the anchor id since [6] appears nowhere in the body.
  assert.ok(
    fn5.raw.includes('<sup class="fn-ref" data-fn-id="6" id="fn-ref-6">[6]</sup>'),
    `fn5 raw should contain nested marker, got: ${fn5.raw}`
  );
  assert.ok(!fn6.raw.includes('fn-ref'), 'fn6 raw itself is unchanged');
  // Nested-only footnote is ordered right after its parent (not dangling at the tail).
  assert.deepEqual(r.footnotes.map(f => f.id), ['5', '6']);
});

test('nested: bracket-colon fractional id ([2.5] inside def [2]) is rewritten', () => {
  const input = [
    'Prose referencing one[1] and two[2] and three[3].',
    '',
    '[1: First note.]',
    '',
    '[2: Second note quoting someone: everyone is trapped within their own imaginations…[2.5] More commentary.]',
    '',
    '[2.5: In the words of DFW, skull-sized kingdoms.]',
    '',
    '[3: Third note.]',
  ].join('\n');

  const r = extractFootnotes(input);
  const fn2 = r.footnotes.find(f => f.id === '2')!;
  assert.ok(
    fn2.raw.includes('<sup class="fn-ref" data-fn-id="2.5" id="fn-ref-2.5">[2.5]</sup>'),
    `fn2 raw should contain nested 2.5 marker, got: ${fn2.raw}`
  );
  // 2.5 slots in directly after its parent.
  assert.deepEqual(r.footnotes.map(f => f.id), ['1', '2', '2.5', '3']);
});

test('nested: id also referenced in body does not duplicate the anchor id', () => {
  const input = [
    'Body refs one[1] and two[2].',
    '',
    '[1] First note, see also[2].',
    '',
    '[2] Second note.',
    '',
  ].join('\n');

  const r = extractFootnotes(input);
  const fn1 = r.footnotes.find(f => f.id === '1')!;
  // Marker present but WITHOUT id= (the body occurrence owns fn-ref-2).
  assert.ok(fn1.raw.includes('<sup class="fn-ref" data-fn-id="2">[2]</sup>'));
  assert.ok(!fn1.raw.includes('id="fn-ref-2"'));
});

test('nested: markdown links and unknown ids inside footnote raws are untouched', () => {
  const input = [
    'Body prose.[1]',
    '',
    '[1] See [3](https://example.com/3) and stray [9] with no def.',
    '',
  ].join('\n');

  const r = extractFootnotes(input);
  const fn1 = r.footnotes.find(f => f.id === '1')!;
  assert.ok(fn1.raw.includes('[3](https://example.com/3)'), 'link untouched');
  assert.ok(fn1.raw.includes('stray [9]'), 'unknown id untouched');
});
