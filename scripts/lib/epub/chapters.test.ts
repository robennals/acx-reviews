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
