import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  sortEntries,
  collectImageUrls,
  rewriteImageSrcs,
  buildChapterBody,
  chapterFilename,
} from './chapters';

test('sortEntries orders alphabetically by title, case-insensitive', () => {
  const sorted = sortEntries([
    { title: 'zebra' },
    { title: 'Alpha' },
    { title: 'beta' },
  ]);
  assert.deepEqual(sorted.map((e) => e.title), ['Alpha', 'beta', 'zebra']);
});

test('sortEntries does not mutate its input', () => {
  const input = [{ title: 'b' }, { title: 'a' }];
  sortEntries(input);
  assert.equal(input[0].title, 'b');
});

test('collectImageUrls finds http img srcs, deduplicated', () => {
  const html =
    '<p><img src="https://x.org/a.png" alt=""></p><img src="https://x.org/a.png"><img src="https://x.org/b.jpg">';
  assert.deepEqual(collectImageUrls(html), ['https://x.org/a.png', 'https://x.org/b.jpg']);
});

test('rewriteImageSrcs replaces mapped srcs and leaves others alone', () => {
  const map = new Map([['https://x.org/a.png', '../img/abc.jpg']]);
  const html = '<img src="https://x.org/a.png" alt="x"><img src="https://y.org/c.png">';
  const out = rewriteImageSrcs(html, map);
  assert.ok(out.includes('src="../img/abc.jpg"'));
  assert.ok(out.includes('src="https://y.org/c.png"'));
});

test('buildChapterBody renders heading and content without footnotes', () => {
  const body = buildChapterBody({ title: 'My <Review>', html: '<p>text</p>', footnotes: [] });
  assert.ok(body.includes('My &lt;Review&gt;'));
  assert.ok(body.includes('<p>text</p>'));
  assert.ok(!body.includes('epub:type="footnotes"'));
});

test('buildChapterBody converts fn-ref sups to noterefs and appends asides', () => {
  const html =
    '<p>claim<sup class="fn-ref" data-fn-id="1" id="fn-ref-1">[1]</sup> more</p>';
  const body = buildChapterBody({
    title: 'T',
    html,
    footnotes: [{ id: '1', html: '<p>the note</p>' }],
  });
  assert.ok(body.includes('epub:type="noteref"'), body);
  assert.ok(body.includes('href="#fn-1"'));
  assert.ok(!body.includes('<sup class="fn-ref"'), 'original sup should be replaced');
  assert.ok(body.includes('<aside id="fn-1" epub:type="footnote"'));
  assert.ok(body.includes('<p>the note</p>'));
  assert.ok(body.includes('href="#fnref-1"'), 'backlink present');
});

test('buildChapterBody tolerates attribute-order variations in the sup marker', () => {
  const html = '<p>x<sup data-fn-id="2" class="fn-ref" id="fn-ref-2">[2]</sup></p>';
  const body = buildChapterBody({
    title: 'T',
    html,
    footnotes: [{ id: '2', html: '<p>n</p>' }],
  });
  assert.ok(body.includes('href="#fn-2"'), body);
});

test('chapterFilename pads index and uses slug', () => {
  assert.equal(chapterFilename(3, 'my-review'), 'chapters/004-my-review.xhtml');
});

// Issue 1: duplicate fnref ids for repeated footnote references
test('buildChapterBody emits fnref-N id only on first occurrence of each footnote ref', () => {
  const html =
    '<p><sup class="fn-ref" data-fn-id="1">[1]</sup> and again ' +
    '<sup class="fn-ref" data-fn-id="1">[1]</sup></p>';
  const body = buildChapterBody({
    title: 'T',
    html,
    footnotes: [{ id: '1', html: '<p>note</p>' }],
  });
  // Exactly one id="fnref-1"
  const idMatches = [...body.matchAll(/id="fnref-1"/g)];
  assert.equal(idMatches.length, 1, 'id="fnref-1" should appear exactly once');
  // Two href="#fn-1" (one per reference)
  const hrefMatches = [...body.matchAll(/href="#fn-1"/g)];
  assert.equal(hrefMatches.length, 2, 'href="#fn-1" should appear twice (once per ref)');
});

// Issue 2: duplicate aside ids when footnotes array has repeated ids
test('buildChapterBody de-dupes footnote asides with duplicate ids', () => {
  const body = buildChapterBody({
    title: 'T',
    html: '<p>text</p>',
    footnotes: [
      { id: '1', html: '<p>note one</p>' },
      { id: '2', html: '<p>note two</p>' },
      { id: '1', html: '<p>note one dup</p>' },
    ],
  });
  const fn1Matches = [...body.matchAll(/id="fn-1"/g)];
  assert.equal(fn1Matches.length, 1, 'id="fn-1" aside should appear exactly once');
  const fn2Matches = [...body.matchAll(/id="fn-2"/g)];
  assert.equal(fn2Matches.length, 1, 'id="fn-2" aside should appear exactly once');
});

// Issue 3: orphan footnotes (not referenced in body) get no dangling backlink
test('buildChapterBody renders orphan footnote without backlink anchor', () => {
  const body = buildChapterBody({
    title: 'T',
    html: '<p>no footnote refs here</p>',
    footnotes: [{ id: '9', html: '<p>orphan</p>' }],
  });
  // Aside is present
  assert.ok(body.includes('id="fn-9"'), 'aside for orphan footnote should be present');
  // Label text present
  assert.ok(body.includes('[9]'), 'label [9] should be present');
  // No dangling backlink
  assert.ok(!body.includes('href="#fnref-9"'), 'no backlink to nonexistent fnref-9');
});

// Issue 4: rewriteImageSrcs single-pass
test('rewriteImageSrcs single-pass: replaces all mapped srcs in one pass', () => {
  const map = new Map([
    ['https://a.org/1.png', '../img/aaa.jpg'],
    ['https://b.org/2.png', '../img/bbb.jpg'],
  ]);
  const html =
    '<img src="https://a.org/1.png"><img src="https://b.org/2.png"><img src="https://c.org/3.png">';
  const out = rewriteImageSrcs(html, map);
  assert.ok(out.includes('src="../img/aaa.jpg"'));
  assert.ok(out.includes('src="../img/bbb.jpg"'));
  assert.ok(out.includes('src="https://c.org/3.png"'), 'unmapped url unchanged');
});
