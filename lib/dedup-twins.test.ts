import { test } from 'node:test';
import assert from 'node:assert/strict';
import { findTwins, isTwin, normalizeBody, type ReviewRecord } from './dedup-twins';

const lorem = (seed: string, n: number) => {
  // Deterministic-ish filler keyed by seed so different inputs differ.
  let s = '';
  for (let i = 0; i < n; i++) s += seed[i % seed.length];
  return s;
};

test('isTwin: identical bodies match', () => {
  const body = 'A'.repeat(500);
  const r = isTwin(normalizeBody(body), normalizeBody(body));
  assert.equal(r.twin, true);
  assert.equal(r.fwd, 1);
  assert.equal(r.rev, 1);
  assert.equal(r.lenRatio, 1);
});

test('isTwin: shared body with different intro/outro is a twin', () => {
  const shared = 'The Roman Empire fell in 476 AD. '.repeat(40);
  const acx = `[Editor's intro by Scott. ${'X'.repeat(50)}]\n\n${shared}`;
  const gdoc = `(review by Anonymous)\n\n${shared}\n\nAuthor bio: ${'Y'.repeat(50)}`;
  const r = isTwin(normalizeBody(acx), normalizeBody(gdoc));
  assert.equal(r.twin, true);
  assert.ok(r.fwd >= 0.5, `fwd=${r.fwd}`);
  assert.ok(r.rev >= 0.5, `rev=${r.rev}`);
});

test('isTwin: unrelated content is not a twin', () => {
  const a = lorem('abcdefghij', 1000);
  const b = lorem('zyxwvutsrq', 1000);
  const r = isTwin(normalizeBody(a), normalizeBody(b));
  assert.equal(r.twin, false);
});

test('isTwin: same book by different reviewers is not a twin', () => {
  // Two reviews discussing the same book with overlapping vocabulary
  // but no substantial verbatim shared passages.
  const a = ('Where Is My Flying Car is one of those rare books that ' +
    'genuinely changes how you think about progress and stagnation. ').repeat(30);
  const b = ('Storrs Hall builds the case for what he calls the great stagnation ' +
    'and the disappearance of nuclear power as the central failure. ').repeat(30);
  const r = isTwin(normalizeBody(a), normalizeBody(b));
  assert.equal(r.twin, false, `unexpectedly matched: fwd=${r.fwd} rev=${r.rev}`);
});

test('isTwin: short bodies (under detection min) never match', () => {
  const a = 'Short body here.';
  const b = 'Short body here.';
  const r = isTwin(normalizeBody(a), normalizeBody(b));
  assert.equal(r.twin, false);
});

test('isTwin: large length disparity defeats match even if contained', () => {
  // gdoc is 10x the acx, so length ratio fails even though acx is fully inside gdoc.
  const acx = 'X'.repeat(500);
  const gdoc = acx + 'Y'.repeat(5000);
  const r = isTwin(normalizeBody(acx), normalizeBody(gdoc));
  assert.equal(r.twin, false);
  assert.ok(r.lenRatio < 0.5, `lenRatio=${r.lenRatio}`);
});

test('findTwins: pairs reviews within the same contest only', () => {
  const shared = 'shared body content '.repeat(50);
  const reviews: ReviewRecord[] = [
    { slug: 'a-acx', contestId: '2025', source: 'acx', title: 'A', body: shared },
    { slug: 'a-gdoc', contestId: '2025', source: 'gdoc', title: 'A by Author', body: shared },
    // Identical body in a different contest — must not match.
    { slug: 'a-gdoc-other-year', contestId: '2024', source: 'gdoc', title: 'A by Author', body: shared },
  ];
  const r = findTwins(reviews);
  assert.equal(r.matches.length, 1);
  assert.equal(r.matches[0].acx.slug, 'a-acx');
  assert.equal(r.matches[0].gdoc.slug, 'a-gdoc');
});

test('findTwins: ACX with multiple gdoc candidates goes to multiMatchedAcx', () => {
  const shared = 'identical body text '.repeat(50);
  const reviews: ReviewRecord[] = [
    { slug: 'x', contestId: 'c', source: 'acx', title: 'X', body: shared },
    { slug: 'x-g1', contestId: 'c', source: 'gdoc', title: 'X g1', body: shared },
    { slug: 'x-g2', contestId: 'c', source: 'gdoc', title: 'X g2', body: shared },
  ];
  const r = findTwins(reviews);
  assert.equal(r.matches.length, 0);
  assert.equal(r.multiMatchedAcx.length, 1);
  assert.equal(r.multiMatchedAcx[0].candidates.length, 2);
});

test('findTwins: gdoc claimed by multiple ACX goes to multiMatchedGdoc', () => {
  const shared = 'identical body text '.repeat(50);
  const reviews: ReviewRecord[] = [
    { slug: 'a1', contestId: 'c', source: 'acx', title: 'A1', body: shared },
    { slug: 'a2', contestId: 'c', source: 'acx', title: 'A2', body: shared },
    { slug: 'g', contestId: 'c', source: 'gdoc', title: 'G', body: shared },
  ];
  const r = findTwins(reviews);
  assert.equal(r.multiMatchedGdoc.length, 1);
  assert.equal(r.multiMatchedGdoc[0].claimants.length, 2);
});

test('findTwins: ACX with no candidates appears in unmatchedAcx', () => {
  const reviews: ReviewRecord[] = [
    { slug: 'lonely', contestId: 'c', source: 'acx', title: 'L', body: lorem('uniqueprose ', 1000) },
    { slug: 'unrelated', contestId: 'c', source: 'gdoc', title: 'U', body: lorem('totallydifferent ', 1000) },
  ];
  const r = findTwins(reviews);
  assert.equal(r.matches.length, 0);
  assert.equal(r.unmatchedAcx.length, 1);
  assert.equal(r.unmatchedAcx[0].slug, 'lonely');
});
