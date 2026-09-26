import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePreview } from './parse';
const doc = (body: string) => `<html><head><style>.quote{margin-left:36pt}.caption{text-align:center;font-style:italic}.bold{font-weight:700}</style></head><body><p class="title">Test review</p>${body}</body></html>`;

test('short adjacent quote paragraphs form stanzas, blank lines separate stanzas', async () => {
  const result = await parsePreview(doc('<p class="quote">First line</p><p class="quote">Second line</p><p></p><p class="quote">Another stanza</p>'));
  assert.equal(result.diagnostics.length, 0);
  assert.match(result.html, /First line<br\s*\/?>(?:\s*)Second line/);
  assert.equal((result.html.match(/<blockquote/g) || []).length, 1);
});
test('60 characters allowed; 61 needs explicit breaks only in multi-paragraph quote groups', async () => {
  for (const [length, errors] of [[60, 0], [61, 1]]) {
    const result = await parsePreview(doc(`<p class="quote">${'a'.repeat(length)}</p><p class="quote">Short line</p>`));
    assert.equal(result.diagnostics.filter(d => d.code === 'ambiguous-poetry').length, errors);
  }
  const explicit = await parsePreview(doc(`<p class="quote">${'a'.repeat(100)}<br>Short line</p>`));
  assert.equal(explicit.diagnostics.length, 0);
  const prose = await parsePreview(doc(`<p class="quote">${'a'.repeat(100)}</p><p></p><p class="quote">Second paragraph</p>`));
  assert.equal(prose.diagnostics.length, 0);
});
test('prose adjacency is an error while lists and heading boundaries are not', async () => {
  const result = await parsePreview(doc('<h1>Section</h1><p>First paragraph</p><p>Second paragraph</p><ul><li>One</li><li>Two</li></ul>'));
  assert.deepEqual(result.diagnostics.map(d => d.code), ['paragraph-spacing']);
});
test('validates title and two-level heading hierarchy without guessing font sizes', async () => {
  const result = await parsePreview(doc('<h2>Orphan</h2><h3>Too deep</h3><p class="title">Second title</p>'));
  assert.ok(result.diagnostics.some(d => d.code === 'heading-parent'));
  assert.ok(result.diagnostics.some(d => d.code === 'heading-level'));
  assert.ok(result.diagnostics.some(d => d.code === 'title-count'));
  assert.match(result.html, /Second title/);
});
test('native footnotes use the existing site interactions and retain inline formatting', async () => {
  const result = await parsePreview(doc('<p>Text<sup><a id="ftnt_ref1" href="#ftnt1">[1]</a></sup></p><hr><div><p><a id="ftnt1" href="#ftnt_ref1">[1]</a> A <span class="bold">note</span>.</p></div>'));
  assert.equal(result.footnotes.length, 1);
  assert.match(result.footnotes[0].html, /<strong>note<\/strong>/);
  assert.match(result.html, /data-fn-id="1"/);
  assert.doesNotMatch(result.html, /<hr/);
});
test('preserves simple tables, display and split-run inline LaTeX, and ordinary dollar prices', async () => {
  const result = await parsePreview(doc(String.raw`<p>$$x = \frac{1}{2}$$</p><p></p><p>Costs $20. Inline <span>\(x</span><span>^2\)</span>.</p><table><tr><td>Name</td><td>Value</td></tr><tr><td>A</td><td><b>2</b></td></tr></table>`));
  assert.equal(result.diagnostics.length, 0);
  assert.match(result.html, /katex-display/);
  assert.match(result.html, /Costs \$20/);
  assert.match(result.html, /<th[^>]*>Name/);
  assert.match(result.html, /<strong>2/);
});
test('reports invalid math and escapes untrusted source HTML and link attributes', async () => {
  const result = await parsePreview(doc(String.raw`<p>$$\notacommand{x}$$</p><p></p><p><a href="javascript:alert(1)">click</a><script>alert(1)</script>&lt;img onerror=boom&gt;<span onclick="boom()">safe</span></p>`));
  assert.ok(result.diagnostics.some(d => d.code === 'math'));
  assert.doesNotMatch(result.html, /javascript:|<script|onclick=/);
  assert.match(result.html, /&lt;img onerror=boom&gt;/);
});

test('Google default one-cell spans are not merged tables', async () => {
  const result = await parsePreview(doc('<table><tr><td colspan="1" rowspan="1"><p>Header</p></td></tr><tr><td colspan="1" rowspan="1"><p>Value</p></td></tr></table>'));
  assert.equal(result.diagnostics.length, 0);
});
test('multiple inline formulas in the same text run all survive', async () => {
  const result = await parsePreview(doc(String.raw`<p>Here \(x^2\) and \(y^2\).</p>`));
  assert.equal((result.html.match(/class="katex"/g) || []).length, 2);
  assert.match(result.html, /and/);
});
test('a leading explicit blank line separates prose and a lone dollar delimiter in prose is literal', async () => {
  const result = await parsePreview(doc('<p>Math uses $$ before and after.</p><p><span><br>For example:</span></p>'));
  assert.equal(result.diagnostics.length, 0);
});
test('Google Docs flattened list indentation becomes nested lists', async () => {
  const result = await parsePreview(doc('<ul><li style="margin-left:36pt">First</li></ul><ul><li style="margin-left:72pt">Child</li></ul><ul><li style="margin-left:36pt">Second</li></ul>'));
  assert.match(result.html, /<li>First<ul[^>]*><li>Child<\/li><\/ul><\/li><li>Second/);
});
test('bounds formula count before expanding an attacker-controlled document', async () => {
  await assert.rejects(parsePreview(doc(`<p>${String.raw`\(x\) `.repeat(201)}</p>`)), /too many.*equations/i);
});

test('table markup uses the published renderer’s header and compact cells', async () => {
  const result = await parsePreview(doc('<table><tr><td><p>Name</p></td><td><p>Value</p></td></tr><tr><td><p>A</p></td><td><p><b>2</b></p></td></tr></table>'));
  assert.match(result.html, /<thead><tr><th scope="col">Name<\/th>/);
  assert.match(result.html, /<tbody><tr><td>A<\/td><td><strong>2<\/strong><\/td><\/tr><\/tbody>/);
});

test('captioned images retain the published renderer’s paragraph spacing', async () => {
  const result = await parsePreview(doc('<p><img src="data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a3ioAAAAASUVORK5CYII="></p><p class="caption">A caption</p>'));
  assert.match(result.html, /<figure[^>]*><p>/);
  assert.match(result.html, /<figcaption><p><em>A caption<\/em><\/p><\/figcaption>/);
});

test('Google heading font weights do not add bold on top of the site heading style', async () => {
  const result = await parsePreview(doc('<h1 style="font-weight:700"><span class="bold">Section</span></h1><h2><b><i>Subsection</i></b> <a href="https://example.com">link</a></h2><p><span class="bold">Bold body</span></p>'));
  assert.match(result.html, /<h2[^>]*>Section<\/h2>/);
  assert.match(result.html, /<h3[^>]*><em>Subsection<\/em> <a /);
  assert.match(result.html, /<strong>Bold body<\/strong>/);
});

test('adjacent numbered lists preserve explicit restart numbers', async () => {
  const result = await parsePreview(doc('<ol start="1"><li>First</li></ol><ol start="7"><li>Seven</li></ol>'));
  assert.match(result.html, /<\/ol><ol[^>]* start="7"><li>Seven<\/li>/);
});
