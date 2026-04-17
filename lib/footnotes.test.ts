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
