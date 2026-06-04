import { test } from 'node:test';
import assert from 'node:assert';
import { redistributeFootnotes } from './redistribute-footnotes';

// Composite gdoc volumes export ALL native footnotes as a single pooled
// block at the end of the doc. After H1-splitting, the pool lands in the
// last review's section while the inline refs stay scattered across every
// review. These tests cover marrying defs back to the review that
// references them, with per-review renumbering.

function vol(refsA: string, refsB: string, defs: string) {
  return [
    { content: refsA },
    { content: refsB + '\n\n' + defs },
  ];
}

test('moves pooled defs to the reviews that reference them', () => {
  const reviews = vol(
    'Alpha prose[[1]](#ftnt1) and more[[3]](#ftnt3) here.',
    'Beta prose[[2]](#ftnt2) only.',
    [
      '[[1]](#ftnt_ref1) First note.',
      '',
      '[[2]](#ftnt_ref2) Second note.',
      '',
      '[[3]](#ftnt_ref3) Third note.',
    ].join('\n')
  );
  const stats = redistributeFootnotes(reviews);

  // Review A gets defs 1 and 3, renumbered 1 and 2.
  assert.match(reviews[0].content, /prose\[\[1\]\]\(#ftnt1\)/);
  assert.match(reviews[0].content, /more\[\[2\]\]\(#ftnt2\)/);
  assert.match(reviews[0].content, /^\[\[1\]\]\(#ftnt_ref1\) First note\.$/m);
  assert.match(reviews[0].content, /^\[\[2\]\]\(#ftnt_ref2\) Third note\.$/m);

  // Review B gets def 2, renumbered 1; pool removed from its tail.
  assert.match(reviews[1].content, /prose\[\[1\]\]\(#ftnt1\)/);
  assert.match(reviews[1].content, /^\[\[1\]\]\(#ftnt_ref1\) Second note\.$/m);
  assert.doesNotMatch(reviews[1].content, /First note/);
  assert.doesNotMatch(reviews[1].content, /Third note/);

  assert.strictEqual(stats.movedDefs, 3);
  assert.deepStrictEqual(stats.unreferencedDefIds, []);
});

test('multi-line def continuations travel with their def', () => {
  const reviews = vol(
    'Prose[[2]](#ftnt2).',
    'Other prose, no refs.',
    [
      '[[1]](#ftnt_ref1) Unreferenced.',
      '',
      '[[2]](#ftnt_ref2) Start of note.',
      '',
      'Continuation paragraph of note 2.',
    ].join('\n')
  );
  const stats = redistributeFootnotes(reviews);
  assert.match(reviews[0].content, /Start of note\./);
  assert.match(reviews[0].content, /Continuation paragraph of note 2\./);
  // Unreferenced def is dropped from output but reported.
  assert.doesNotMatch(reviews[1].content, /Unreferenced/);
  assert.deepStrictEqual(stats.unreferencedDefIds, ['1']);
});

test('repeat refs to one footnote share a single renumbered id', () => {
  const reviews = vol(
    'First[[7]](#ftnt7) then again[[7]](#ftnt7).',
    'No refs here.',
    '[[7]](#ftnt_ref7) Shared note.'
  );
  redistributeFootnotes(reviews);
  const matches = reviews[0].content.match(/\[\[1\]\]\(#ftnt1\)/g) || [];
  assert.strictEqual(matches.length, 2);
  assert.match(reviews[0].content, /^\[\[1\]\]\(#ftnt_ref1\) Shared note\.$/m);
});

test('refs with no def anywhere are downgraded to plain text', () => {
  const reviews = [{ content: 'Prose[[9]](#ftnt9) dead ref.' }];
  const stats = redistributeFootnotes(reviews);
  assert.strictEqual(reviews[0].content, 'Prose[9] dead ref.');
  assert.strictEqual(stats.deadRefs, 1);
});

test('no-footnote volumes pass through untouched', () => {
  const reviews = [{ content: 'Just prose.' }, { content: 'More prose.' }];
  const stats = redistributeFootnotes(reviews);
  assert.strictEqual(reviews[0].content, 'Just prose.');
  assert.strictEqual(reviews[1].content, 'More prose.');
  assert.strictEqual(stats.movedDefs, 0);
});

test('renumbering follows order of first appearance in the review', () => {
  const reviews = vol(
    'B first[[12]](#ftnt12), then A[[4]](#ftnt4).',
    'no refs',
    [
      '[[4]](#ftnt_ref4) Note A.',
      '',
      '[[12]](#ftnt_ref12) Note B.',
    ].join('\n')
  );
  redistributeFootnotes(reviews);
  assert.match(reviews[0].content, /B first\[\[1\]\]\(#ftnt1\), then A\[\[2\]\]\(#ftnt2\)\./);
  // Defs appended in ref order: Note B (now 1) before Note A (now 2).
  const idxB = reviews[0].content.indexOf('Note B');
  const idxA = reviews[0].content.indexOf('Note A');
  assert.ok(idxB < idxA && idxB > 0);
  assert.match(reviews[0].content, /^\[\[1\]\]\(#ftnt_ref1\) Note B\.$/m);
  assert.match(reviews[0].content, /^\[\[2\]\]\(#ftnt_ref2\) Note A\.$/m);
});

test('separator rule immediately before the def pool is removed', () => {
  const reviews = [
    { content: 'Prose[[1]](#ftnt1).' },
    {
      content:
        'Last review prose.\n\n* * *\n\n[[1]](#ftnt_ref1) The note.',
    },
  ];
  redistributeFootnotes(reviews);
  assert.strictEqual(reviews[1].content, 'Last review prose.');
});
